# ILi MVP - Contexte Projet

Application de création et lecture de stories interactives multi-sensorielles (audio, haptique, visuel).

## 1. Stack Technique

| Couche | Technologie | Version/Détails |
|--------|-------------|-----------------|
| **Frontend** | React | 19.2.6 |
| **Bundler** | Vite | 8.0.12 |
| **Routing** | React Router DOM | 7.15.0 |
| **Backend** | Node.js (Vercel Serverless Functions) | API routes dans `/api` |
| **Base de données** | Supabase (PostgreSQL + Storage) | SDK JS 2.106.1 |
| **Audio** | Howler.js | 2.2.4 |
| **Hébergement** | Vercel | CI/CD auto via GitHub |

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless Vercel
│   ├── upload-audio.js        # Upload audio stories (auth par mot de passe)
│   ├── upload-sound.js        # Upload sons bibliothèque
│   ├── delete.js              # Suppression fichiers
│   └── publish.js             # Publication story
├── public/                     # Assets statiques (servis par Vercel CDN)
│   ├── sounds/                # Sons UI locaux (whoosh, clics, effets)
│   │   └── sounds-index.json  # Index des sons locaux
│   └── stories/               # Stories JSON (dev/test uniquement)
│       └── index.json         # Index des stories
├── scripts/                    # Scripts utilitaires
│   ├── audio-dictionary.js    # Dictionnaire audio
│   ├── generateSoundsIndex.js # Génération index sons
│   └── migrate-sounds-to-supabase.js
├── src/
│   ├── components/
│   │   ├── admin/             # Interface création stories
│   │   │   ├── AudioTimeline.jsx       # Timeline 6 colonnes
│   │   │   ├── SoundBlock.jsx          # Bloc son interactif
│   │   │   ├── SoundBlockPanel.jsx     # Édition propriétés son
│   │   │   ├── SoundLibraryPicker.jsx  # Sélecteur bibliothèque
│   │   │   ├── VfxBlock.jsx            # Bloc effets visuels
│   │   │   ├── VfxBlockPanel.jsx       # Édition VFX
│   │   │   ├── UnifiedSegmentsTimeline.jsx
│   │   │   ├── SoundImporter.jsx       # Import audio depuis mobile
│   │   │   ├── DraftManager.jsx        # Gestion brouillons
│   │   │   ├── PublishPanel.jsx        # Publication
│   │   │   ├── StoryLoader.jsx
│   │   │   ├── StoryPreviewModal.jsx
│   │   │   ├── FormatToolbar.jsx
│   │   │   ├── PublishAnimation.jsx
│   │   │   └── constants.js            # Constantes timeline
│   │   ├── StoryReader.jsx            # Lecteur stories
│   │   ├── ReaderSettings.jsx         # Paramètres lecture
│   │   ├── StartScreen.jsx            # Écran démarrage
│   │   ├── EndScreen.jsx              # Écran fin
│   │   └── StoryMenu.jsx              # Menu sélection story
│   ├── engine/                # Moteurs métier
│   │   ├── AudioEngine.js     # Gestion audio (play, fade, loop, volume)
│   │   └── HapticEngine.js    # Retours haptiques
│   ├── pages/                 # Routes principales
│   │   ├── HomePage.jsx       # Accueil / sélection stories
│   │   ├── StoryPage.jsx      # Lecture story (/lire/:storyId)
│   │   └── AdminPage.jsx      # Éditeur (/admin)
│   ├── utils/
│   │   ├── renderMarkdown.jsx # Rendu markdown
│   │   └── segmentAlgorithm.js # Découpage texte en segments
│   ├── styles/
│   │   ├── global.css
│   │   └── vfx.css            # Effets visuels
│   ├── assets/                # Images statiques
│   ├── App.jsx                # Routes (React Router)
│   └── main.jsx               # Point d'entrée
├── .env                        # Variables d'environnement
├── vite.config.js             # Config Vite
├── vercel.json                # Config Vercel (rewrites SPA)
├── package.json
└── eslint.config.js
```

## 3. Flux de Données Principal

### Routes
```
/ → HomePage (sélection story)
/lire/:storyId → StoryPage (lecture)
/admin → AdminPage (création/édition)
```

### Lecture d'une story
1. `StoryPage` charge le JSON story (depuis Supabase ou `public/stories/`)
2. `StoryReader` affiche le contenu segmenté avec synchronisation audio
3. `AudioEngine` (Howler.js) gère play/stop/fade/loop/volume
4. `HapticEngine` fournit les retours haptiques synchronisés

### Création d'une story (Admin)
1. `AdminPage` → éditeur avec découpage texte en segments
2. `AudioTimeline` → timeline 6 colonnes pour placer les sons
3. `SoundLibraryPicker` → sélection des sons dans la bibliothèque
4. `SoundBlock` → manipulation (drag, resize, fade handles)
5. Upload audio via `api/upload-audio.js` → Supabase Storage (auth par `ADMIN_PASSWORD`)
6. Upload sons via `api/upload-sound.js` → Supabase Storage
7. Publication via `api/publish.js`

### Authentification
- **Non implémentée** (Supabase Auth prévu)
- Protection admin : mot de passe via `ADMIN_PASSWORD` pour les uploads API

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Build frontend, plugin React |
| `vercel.json` | Rewrites SPA (`/(.*)` → `/index.html`) |
| `.env` | URLs Supabase, clés API, mot de passe admin |
| `package.json` | Scripts, dépendances |

### Différences Local vs Production
| Aspect | Local | Production |
|--------|-------|------------|
| **API** | Fonctions dans `/api/` (simulées par Vercel CLI ou Vite proxy) | Vercel Serverless Functions |
| **Stories** | `public/stories/*.json` | Supabase Storage |
| **Sons UI** | `public/sounds/` | Vercel CDN (`public/sounds/`) |
| **Sons stories** | Supabase Storage | Supabase Storage |

### Assets Statiques
- **Servis depuis** : `public/` → Vercel CDN
- **Sons UI** : `public/sounds/` (whoosh, clics, effets interface)
- **Images** : `src/assets/` (bundled par Vite)
- **Stories dev** : `public/stories/*.json` (tests uniquement)

### Gestion des Fichiers Médias
| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio stories** | Upload → Supabase Storage | MP3, WAV | Supabase |
| **Sons bibliothèque** | Upload → Supabase Storage | MP3 | Supabase |
| **Effets UI** | Commit dans `public/sounds/` | MP3 | Vercel CDN |
| **Images** | Import dans `src/assets/` | PNG, SVG | Bundled (Vite) |

**Pas de CDN externe** (tout via Vercel + Supabase).

### Modèle de Données soundTracks (Timeline)
```javascript
{
  id: string,              // Unique ID
  soundId: string,         // Référence bibliothèque
  startSegmentId: string,  // Segment de début
  endSegmentId: string,    // Segment de fin
  column: number,          // 0 à 5 (6 colonnes max)
  volume: number,          // 0 à 1
  fadeIn: number,          // ms
  fadeOut: number,         // ms
  delay: number,           // ms
  loop: boolean,
  muted: boolean
}
```

## 5. Commandes Clés

```bash
# Développement local
npm run dev

# Build production
npm run build

# Preview build local
npm run preview

# Lint
npm run lint

# Scripts utilitaires
npm run add-sound              # Ajout son bibliothèque
npm run checkpoint             #Checkpoint + dev server
npm run publish                # Publication (publish.sh)
```

**Déploiement** : Push sur `main` → Vercel auto-deploy

## 6. Variables d'Environnement

```
# Supabase
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL                  # Server-side
SUPABASE_SERVICE_ROLE_KEY     # Server-side (admin)

# Admin
ADMIN_PASSWORD                # Protection uploads API
```

---

**Public cible** : Enfants/apprenants en lecture  
**Statut MVP** : Fonctionnel, auth utilisateur à venir
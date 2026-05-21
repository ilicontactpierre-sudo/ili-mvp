# ILi MVP - Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version/Détails |
|--------|-------------|-----------------|
| **Frontend** | React + Vite | v18+, Vite 5.x |
| **Backend** | Node.js (Serverless) | Vercel Functions |
| **Base de données** | Supabase | PostgreSQL + Storage |
| **Hébergement** | Vercel | CI/CD via GitHub |
| **Bundler** | Vite | Configuration dans `vite.config.js` |

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                    # Fonctions serverless Vercel
│   ├── upload-audio.js    # Upload audio stories
│   ├── upload-sound.js    # Upload sons bibliothèque
│   ├── delete.js          # Suppression
│   └── publish.js         # Publication
├── public/                # Assets statiques
│   ├── sounds/            # Sons locaux (whoosh, clics, etc.)
│   └── stories/           # Stories JSON (dev/test)
├── scripts/               # Scripts utilitaires
│   ├── audio-dictionary.js
│   ├── generateSoundsIndex.js
│   └── migrate-sounds-to-supabase.js
├── src/
│   ├── components/
│   │   ├── admin/         # Interface administration
│   │   │   ├── SoundBlock.jsx
│   │   │   ├── VfxBlock.jsx
│   │   │   ├── UnifiedSegmentsTimeline.jsx
│   │   │   ├── SoundImporter.jsx
│   │   │   └── PublishPanel.jsx
│   │   ├── StoryReader.jsx    # Lecteur stories
│   │   ├── ReaderSettings.jsx # Paramètres lecture
│   │   └── StartScreen.jsx
│   ├── engine/            # Moteurs métier
│   │   ├── AudioEngine.js     # Gestion audio
│   │   └── HapticEngine.js    # Retours haptiques
│   ├── pages/             # Routes principales
│   │   ├── HomePage.jsx
│   │   ├── StoryPage.jsx
│   │   └── AdminPage.jsx
│   ├── utils/
│   │   ├── renderMarkdown.jsx
│   │   └── segmentAlgorithm.js
│   ├── styles/
│   │   ├── global.css
│   │   └── vfx.css
│   ├── App.jsx
│   └── main.jsx
├── .env                   # Variables d'environnement
├── vite.config.js         # Config Vite
├── vercel.json            # Config Vercel
└── package.json
```

## 3. Flux de Données Principal

### Navigation
```
HomePage → StoryPage (lecture) ou AdminPage (création)
```

### Lecture d'une story
1. `StoryPage` charge le JSON depuis `public/stories/` ou Supabase
2. `StoryReader` affiche le contenu segmenté
3. `AudioEngine` gère la lecture audio synchronisée
4. `HapticEngine` fournit les retours haptiques

### Création d'une story (Admin)
1. `AdminPage` → éditeur avec `SoundBlock`, `VfxBlock`
2. Upload audio via `api/upload-audio.js` → Supabase Storage
3. Upload sons via `api/upload-sound.js` → Supabase Storage
4. Publication via `api/publish.js`

### Authentification
- **Non implémentée** dans le MVP actuel
- Prévu : Supabase Auth

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Build frontend, proxy API en dev |
| `vercel.json` | Rewrites API → functions serverless |
| `.env` | URLs Supabase, clés API |

### Différences Local vs Production
| Aspect | Local | Production |
|--------|-------|------------|
| **API** | Proxy Vite (`/api` → `localhost:3000/api`) | Vercel Functions |
| **Stories** | `public/stories/*.json` | Supabase Storage |
| **Sons** | `public/sounds/` + Supabase | Supabase Storage uniquement |

### Assets Statiques
- **Servis depuis** : `public/` (Vercel CDN)
- **Sons locaux** : `public/sounds/` (clics, whoosh, effets UI)
- **Stories dev** : `public/stories/*.json` (tests uniquement)

### Gestion des Fichiers Médias
| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio stories** | Upload → Supabase Storage | MP3, WAV | Supabase |
| **Sons bibliothèque** | Upload → Supabase Storage | MP3 | Supabase |
| **Effets UI** | Commit dans `public/sounds/` | MP3 | Vercel CDN |
| **Images** | Assets dans `src/assets/` | PNG, SVG | Vercel CDN |

**Pas de CDN externe** (tout via Vercel + Supabase).

## 5. Commandes Clés

```bash
# Développement
npm run dev

# Build production
npm run build

# Preview build local
npm run preview

# Lint
npm run lint
```

**Déploiement** : Push sur `main` → Vercel auto-deploy

## 6. Variables d'Environnement

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
```

---

**Objectif** : Application de création et lecture de stories interactives multi-sensorielles (audio, haptique, visuel).
**Public** : Enfants/apprenants en lecture.
**MVP** : Fonctionnel, auth et features avancées à venir.
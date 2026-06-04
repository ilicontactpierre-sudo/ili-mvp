# ILi MVP — Contexte Projet

Application de lecture interactive d'histoires avec dimension sonore immersive.

---

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | HMR, build optimisé |
| **Backend (dev)** | Express | 5.2.1 | Serveur API local port 3001 |
| **Backend (prod)** | Vercel Serverless | — | Fonctions dans `/api` |
| **Base de données** | Supabase | — | PostgreSQL + Storage (sons) |
| **Audio** | Howler.js | 2.2.4 | Gestion multi-sources, fade, loop |
| **Encodage** | FFmpeg.wasm | 0.12.15 | Compression audio côté client |
| **Déploiement** | Vercel | — | SPA + API routes |
| **CI/CD** | GitHub Actions | — | Via `publish.sh` + API GitHub |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # API routes (Vercel + dev Express)
│   ├── delete-sound.js         # Supprime son (Supabase + DB)
│   ├── delete.js               # Supprime histoire (GitHub)
│   ├── get-upload-url.js       # Génère URL upload Supabase
│   ├── preview-sound.js        # Stream audio local
│   ├── publish.js              # Publie histoire sur GitHub
│   ├── toggle-visibility.js    # Masque/affiche histoire
│   ├── upload-audio.js         # Upload fichier audio → Supabase
│   └── upload-sound.js         # Enregistre métadonnées son → Supabase
│
├── public/                     # Assets statiques (servis tels quels)
│   ├── sounds/                 # Fichiers audio locaux + index JSON
│   │   ├── sounds-index.json   # Catalogue complet des sons (métadonnées)
│   │   └── *.mp3               # Fichiers audio (whoosh, clic, etc.)
│   ├── stories/                # Histoires publiées (JSON)
│   │   ├── index.json          # Liste des histoires disponibles
│   │   └── *.json              # Fichiers d'histoires individuelles
│   ├── textures/               # Images (papier, etc.)
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── components/
│   │   ├── admin/              # Interface d'édition d'histoires
│   │   │   ├── DraftManager.jsx    # Sauvegarde brouillons (localStorage)
│   │   │   ├── SoundBlockPanel.jsx # Édition blocs sonores
│   │   │   ├── SoundLibraryPicker.jsx # Sélecteur de sons
│   │   │   ├── OrchestrationPanel.jsx # Timeline audio
│   │   │   ├── GameModePanel.jsx     # Configuration gamification
│   │   │   ├── PublishPanel.jsx      # Publication GitHub
│   │   │   ├── WaveformTrimmer.jsx   # Découpe audio visuelle
│   │   │   └── VfxBlock.jsx          # Effets visuels
│   │   ├── StoryReader.jsx       # Lecteur principal (texte + audio)
│   │   ├── StoryMenu.jsx         # Menu de sélection d'histoires
│   │   ├── StartScreen.jsx       # Écran de démarrage
│   │   ├── EndScreen.jsx         # Écran de fin
│   │   ├── GameOverlay.jsx       # Overlay gamification
│   │   └── ReaderSettings.jsx    # Réglages lecteur (progression)
│   │
│   ├── engine/
│   │   ├── AudioEngine.js        # Moteur audio (Howler.js wrapper)
│   │   └── HapticEngine.js       # Retours haptiques (vibration)
│   │
│   ├── pages/
│   │   ├── HomePage.jsx          # Accueil + menu histoires
│   │   ├── StoryPage.jsx         # Lecteur d'histoire
│   │   └── AdminPage.jsx         # Éditeur complet
│   │
│   ├── utils/
│   │   ├── segmentAlgorithm.js   # Découpage texte en segments
│   │   ├── bionicReading.jsx     # Mode lecture bionique
│   │   ├── emojiDict.jsx         # Dictionnaire emoji
│   │   └── renderMarkdown.jsx    # Rendu markdown
│   │
│   ├── styles/
│   │   ├── global.css
│   │   └── vfx.css
│   │
│   ├── App.jsx                   # Routing principal
│   └── main.jsx                  # Point d'entrée
│
├── scripts/
│   ├── dev-api-server.js         # Serveur Express dev (port 3001)
│   ├── addSound.js               # CLI ajout son bibliothèque
│   ├── checkpoint.js             # Sauvegarde état courant
│   ├── convert-stories.js        # Migration format histoires
│   ├── index-boom-library.js     # Indexation BOOM Library
│   └── migrate-sounds-to-supabase.js # Migration sons → Supabase
│
├── index.html                    # HTML d'entrée (Vite)
├── package.json                  # Dépendances + scripts
├── vite.config.js                # Config Vite (proxy API, COOP/COEP)
├── vercel.json                   # Rewrites SPA
└── publish.sh                    # Script publication shell
```

---

## 3. Flux de Données Principal

### Lecture d'une histoire (utilisateur)

```
1. HomePage → sélection histoire
2. StoryPage charge `/stories/{storyId}.json` (fichier statique)
3. StartScreen précharge les sons (Howler.js instances)
4. StoryReader affiche segment par segment
5. AudioEngine exécute événements audio au changement de segment:
   - Système legacy: audioEvents[] par segment
   - Système moderne: soundTracks[] (blocs temporels)
6. Progression sauvegardée dans localStorage
```

### Création d'une histoire (admin)

```
1. AdminPage (auth par mot de passe VITE_ADMIN_PASSWORD)
2. Saisie texte → découpage automatique (segmentAlgorithm.js)
3. OrchestrationPanel: ajout sons, réglage volumes/fades
4. DraftManager: sauvegarde brouillon (localStorage)
5. PublishPanel: envoie à /api/publish.js
6. API publie JSON sur GitHub (via GitHub API)
7. Mise à jour de public/stories/index.json
```

### Gestion des sons

```
Développement:
  - Sons locaux dans public/sounds/
  - Preview via /api/preview-sound → serveur Express local
  - Upload via /api/upload-audio → compression FFmpeg.wasm → Supabase Storage

Production:
  - Sons hébergés sur Supabase Storage (bucket 'sounds')
  - Métadonnées dans table 'sounds' Supabase
  - URLs publiques via Supabase CDN
```

### Authentification

- **Admin**: mot de passe unique (`VITE_ADMIN_PASSWORD`)
  - Frontend: vérification côté client (sessionStorage)
  - Backend: vérification `ADMIN_PASSWORD` sur chaque appel API
- **Lecteur**: pas d'authentification, accès libre aux histoires publiées

---

## 4. Points Sensibles

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API vers localhost:3001, headers COOP/COEP pour SharedArrayBuffer (FFmpeg.wasm) |
| `vercel.json` | Rewrite toutes les routes vers index.html (SPA) |
| `scripts/dev-api-server.js` | Serveur Express dev: preview audio, upload Supabase |

### Différences Local vs Production

| Aspect | Développement | Production |
|--------|---------------|------------|
| API | Express localhost:3001 | Vercel Serverless Functions |
| Sons | Fichiers locaux `public/sounds/` | Supabase Storage + CDN |
| Histoires | Fichiers JSON locaux | GitHub repository (publié via API) |
| Auth | Password simple | Même mécanisme |

### Assets Statiques

- **Servis depuis**: `public/` (Vite les copie dans `dist/` au build)
- **Chemins**: `/sounds/`, `/stories/`, `/textures/`
- **Cache**: géré par Vercel CDN en production

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | CDN |
|------|----------|---------|-----|
| **Audio** | Upload → FFmpeg.wasm compression → Supabase Storage | MP3, WAV, AIFF, FLAC | Supabase CDN |
| **Images** | Upload direct | PNG, SVG | Vercel CDN |
| **Textures** | Statiques dans `public/textures/` | PNG | Vercel CDN |

---

## 5. Commandes Clés

```bash
# Développement (lance Vite + Express API)
npm run dev

# Build de production
npm run build

# Preview build local
npm run preview

# Lint
npm run lint

# Publication (via script shell)
npm run publish

# Utilitaires
npm run add-sound        # Ajouter un son à la bibliothèque
npm run checkpoint       # Sauvegarder état + redémarrer dev server
```

---

## 6. Variables d'Environnement

### Frontend (`.env` ou `.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (lecteur) |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (édition) |

### Backend (`.env` local ou Vercel Environment Variables)

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Mot de passe pour authentifier les appels API |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (écriture) |
| `GITHUB_TOKEN` | Token GitHub pour publication |
| `GITHUB_OWNER` | Propriétaire du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) |

---

## 7. Architecture Audio (Détails)

### SoundTracks (nouveau modèle)

Structure d'un bloc sonore dans la timeline:
```js
{
  id: "track_unique_id",
  soundId: "ref_son",
  startSegmentId: "seg_1",    // Segment de début
  endSegmentId: "seg_5",      // Segment de fin
  volume: 0.5,                // 0-1
  fadeIn: 0,                  // ms
  fadeOut: 0,                 // ms
  delay: 0,                   // ms
  loop: false,
  loopCrossfade: "medium",    // none/medium/long
  trimStart: 0,               // ms
  trimEnd: null,              // ms
  muted: false,
  broken: false
}
```

### AudioEvents (ancien modèle — compatibilité)

Événements par segment (legacy):
```js
{
  action: "play" | "stop" | "fadeIn" | "fadeOut" | "volume",
  soundId: "ref_son",
  volume: 0.5,
  duration: 400,  // ms (pour fade)
  delay: 0,       // ms
  loop: false
}
# ILi MVP — Contexte du Projet

Application de lecture immersive d'histoires avec orchestration audio et effets visuels.

---

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI principale, composants |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA (`/`, `/lire/:storyId`, `/admin`) |
| **Bundler** | Vite | 8.0.12 | Build + dev server avec HMR |
| **Backend Dev** | Express | 5.2.1 | Serveur API local (port 3001) pour upload/preview |
| **Backend Prod** | Vercel Serverless | — | Fonctions API déployées (`/api/*`) |
| **Base de données** | Supabase | 2.106.1 | Storage audio + métadonnées sons |
| **Audio** | Howler.js | 2.2.4 | Moteur de lecture audio (sprites, loops, crossfade) |
| **Audio FFmpeg** | @ffmpeg/ffmpeg | 0.12.15 | Conversion audio côté client (WASM) |
| **Déploiement** | Vercel | — | Hosting statique + serverless functions |
| **Linting** | ESLint | 10.3.0 | Validation code |

### Librairies Métier Clés

| Librairie | Usage |
|-----------|-------|
| `fuse.js` (7.3.0) | Recherche floue dans la bibliothèque sonore |
| `lamejs` (1.2.1) | Encodage MP3 côté client |
| `@supabase/supabase-js` | Client Supabase (storage + DB) |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── index.html                    # Point d'entrée HTML (SPA)
├── package.json                  # Déps + scripts npm
├── package-lock.json             # Lock file npm
├── vite.config.js                # Config Vite (proxy API, COOP/COEP)
├── vercel.json                   # Rewrites SPA pour Vercel
├── eslint.config.js              # Config ESLint
├── .gitignore                    # Fichiers ignorés (.env, node_modules, dist)
├── publish.sh                    # Script de publication shell
│
├── api/                          # Fonctions serverless Vercel
│   ├── publish.js                # Publication histoire → GitHub API
│   ├── upload-audio.js           # Upload audio → Supabase storage
│   ├── upload-sound.js           # Upload métadonnées son → Supabase DB
│   ├── get-upload-url.js         # URL signée upload Supabase
│   ├── preview-sound.js          # Preview son (dev local)
│   ├── delete.js                 # Suppression histoire
│   ├── delete-sound.js           # Suppression son
│   ├── toggle-visibility.js      # Toggle visibilité histoire
│   └── send-newsletter.js        # Envoi newsletter
│
├── public/                       # Assets statiques servis tels quels
│   ├── manifest.json             # PWA manifest
│   ├── favicon.svg               # Favicon
│   ├── icons.svg                 # Sprite icônes SVG
│   │
│   ├── sounds/                   # Sons UI + bibliothèque locale
│   │   ├── sounds-index.json     # Index métadonnées bibliothèque BOOM
│   │   ├── soundSearchWorker.js  # Web Worker recherche floue
│   │   ├── Clic ILi.mp3          # Son clic interface
│   │   ├── Clic-Settings.mp3     # Son clic settings
│   │   └── whoosh-*.mp3          # Sons transition (6 variantes)
│   │
│   ├── stories/                  # Fichiers JSON des histoires publiées
│   │   ├── index.json            # Liste des histoires (id, title, author)
│   │   └── *.json                # Données histoires individuelles
│   │
│   ├── fonts/                    # Polices custom
│   │   ├── NamoraDayanaDemo-0vqZd.ttf
│   │   └── Oanteh-rvDvA.otf
│   │
│   └── textures/
│       └── paper.png             # Texture papier pour VFX
│
├── scripts/                      # Scripts utilitaires
│   ├── dev-api-server.js         # Serveur Express dev (port 3001)
│   ├── addSound.js               # CLI ajout son bibliothèque
│   ├── checkpoint.js             # Script checkpoint
│   ├── convert-stories.js        # Conversion format histoires
│   ├── generateSoundsIndex.js    # Génération index sons
│   ├── index-boom-library.js     # Indexation bibliothèque BOOM
│   ├── migrate-sounds-to-supabase.js  # Migration sons → Supabase
│   ├── update-story-urls.js      # Mise à jour URLs histoires
│   ├── audio-dictionary.js       # Dictionnaire audio
│   └── README.md                 # Docs scripts
│
├── src/
│   ├── main.jsx                  # Point d'entrée React (render App)
│   ├── App.jsx                   # Routing + sons UI globaux
│   ├── index.css                 # Styles globaux (variables CSS)
│   │
│   ├── pages/                    # Pages principales
│   │   ├── HomePage.jsx          # Accueil (liste histoires)
│   │   ├── StoryPage.jsx         # Lecteur histoire (logique principale)
│   │   ├── AdminPage.jsx         # Interface admin complète
│   │   ├── NewsletterPage.jsx    # Gestion newsletter
│   │   └── AnalyticsDashboard.jsx # Stats de lecture
│   │
│   ├── components/               # Composants UI
│   │   ├── StoryReader.jsx       # Moteur de rendu texte + VFX
│   │   ├── StoryReader.css       # Styles lecteur
│   │   ├── StartScreen.jsx       # Écran démarrage histoire
│   │   ├── EndScreen.jsx         # Écran fin histoire
│   │   ├── StoryMenu.jsx         # Menu navigation histoire
│   │   ├── ReaderSettings.jsx    # Paramètres lecture (DYS, progression)
│   │   ├── VfxOverlay.jsx        # Overlay effets visuels (fog, fire)
│   │   ├── GameOverlay.jsx       # Overlay modes jeu
│   │   │
│   │   └── admin/                # Composants interface admin
│   │       ├── OrchestrationPanel.jsx   # Timeline audio/VFX
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline segments unifiée
│   │       ├── PublishPanel.jsx         # Panel publication
│   │       ├── PublishAnimation.jsx     # Animation publication
│   │       ├── DraftManager.jsx         # Gestion brouillons (localStorage)
│   │       ├── StoryLoader.jsx          # Chargement histoire existante
│   │       ├── StoryPreviewModal.jsx    # Aperçu histoire
│   │       ├── SoundBlockPanel.jsx      # Édition bloc son
│   │       ├── SoundBlock.jsx           # Représentation bloc son
│   │       ├── VfxBlockPanel.jsx        # Édition bloc VFX
│   │       ├── VfxBlock.jsx             # Représentation bloc VFX
│   │       ├── WaveformTrimmer.jsx      # Découpe waveform
│   │       ├── SoundLibraryPicker.jsx   # Sélecteur bibliothèque
│   │       ├── SoundImporter.jsx        # Import sons
│   │       ├── FormatToolbar.jsx        # Toolbar formatage
│   │       ├── GameModePanel.jsx        # Configuration game mode
│   │       ├── AudioTimeline.jsx        # Timeline audio (ancien)
│   │       ├── AnalyticsDashboard.jsx   # Dashboard analytics
│   │       ├── constants.js             # Constantes VFX (getVfxClass)
│   │       └── README.md                # Docs composants admin
│   │
│   ├── engine/                   # Moteurs temps réel
│   │   ├── AudioEngine.js        # Gestion playback, fade, pan, loop
│   │   └── HapticEngine.js       # Vibrations haptiques (mobile)
│   │
│   ├── utils/                    # Fonctions utilitaires
│   │   ├── segmentAlgorithm.js   # Algo découpage texte automatique
│   │   ├── renderMarkdown.jsx    # Rendu markdown → JSX
│   │   ├── bionicReading.jsx     # Application Bionic Reading
│   │   ├── emojiDict.jsx         # Remplacement texte → emojis
│   │   ├── soundSearch.js        # Recherche dans bibliothèque
│   │   └── analytics.js          # Tracking événements (start, progress, finish)
│   │
│   ├── assets/                   # Assets importés dans le bundle
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   │
│   └── styles/                   # Feuilles de style
│       ├── global.css            # Variables CSS, reset, thèmes
│       └── vfx.css               # Styles effets visuels (typewriter, static, etc.)
│
└── .env                          # Variables d'environnement (non versionné)
```

---

## 3. Flux de Données Principaux

### 3.1 Lecture d'une histoire

```
Utilisateur → HomePage → clique histoire → StoryPage
    ↓
StoryPage charge `/stories/{storyId}.json` (fichier statique)
    ↓
StartScreen affiche métadonnées + précharge sons (Howl)
    ↓
Utilisateur clique "Commencer" → AudioEngine instancié
    ↓
StoryReader affiche segment courant
    ↓
À chaque changement segment :
  - AudioEngine exécute audioEvents du segment
  - VfxOverlay applique effets (typewriter, static, erased, flash, fog)
  - HapticEngine déclenche vibrations si pattern défini
    ↓
Fin histoire → EndScreen (liens livre, formulaire, partie suivante)
```

### 3.2 Upload d'un son (Admin)

```
Admin → sélectionne son dans bibliothèque
    ↓
SoundImporter encode audio (FFmpeg WASM → MP3)
    ↓
POST /api/get-upload-url → serveur dev/prod → URL signée Supabase
    ↓
Upload direct navigateur → Supabase Storage (`sounds` bucket)
    ↓
POST /api/upload-sound → métadonnées son → Supabase DB (table `sounds`)
    ↓
Son disponible dans bibliothèque (fusion local + Supabase)
```

### 3.3 Publication d'une histoire (Admin)

```
Admin → remplit métadonnées + segments + orchestration
    ↓
Clique "Publier" → PublishPanel
    ↓
POST /api/publish { password, slug, storyData }
    ↓
Serveur authentifie (ADMIN_PASSWORD)
    ↓
GitHub API : push `public/stories/{slug}.json` + mise à jour `index.json`
    ↓
Histoire disponible immédiatement (fichier statique)
```

### 3.4 Gestion de l'authentification

| Élément | Mécanisme | Stockage |
|---------|-----------|----------|
| **Admin (dev)** | Mot de passe saisi dans formulaire | `sessionStorage.ili_admin_password` |
| **Admin (prod)** | Mot de passe envoyé dans body POST | Comparaison avec `process.env.ADMIN_PASSWORD` |
| **Supabase** | Clé service (admin) côté serveur | `process.env.SUPABASE_SERVICE_KEY` |
| **Supabase** | Clé anon côté client (lecture seule) | `import.meta.env.VITE_SUPABASE_ANON_KEY` |
| **GitHub** | Token personnel (publication) | `process.env.GITHUB_TOKEN` |

⚠️ **Pas d'authentification utilisateur final** — l'app est publique en lecture.

---

## 4. Points Sensibles

### 4.1 Fichiers de Configuration Critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev, headers COOP/COEP (requis pour FFmpeg WASM) | Audio/FFmpeg cassé si COOP/COEP retiré |
| `vercel.json` | Rewrite SPA (`/(.*)` → `/index.html`) | Routing cassé en prod si retiré |
| `scripts/dev-api-server.js` | Routes API locales (upload, preview, publish) | Upload sons cassé en dev si modifié |
| `public/stories/index.json` | Liste officielle des histoires publiées | Accueil vide si corrompu |
| `.env` | Secrets (Supabase, GitHub, admin password) | Fuites si versionné / accès public |

### 4.2 Différences Local vs Production

| Aspect | Développement | Production |
|--------|---------------|------------|
| **Serveur API** | Express local port 3001 (`scripts/dev-api-server.js`) | Fonctions serverless Vercel (`/api/*`) |
| **Proxy** | Vite proxy `/api/*` → `localhost:3001` | Appels directs `/api/*` → Vercel |
| **Stories** | Fichiers JSON dans `public/stories/` (git) | Idem, servis par CDN Vercel |
| **Sons** | Fichiers locaux + Supabase storage | Supabase storage + CDN Cloudinary |
| **Auth admin** | `VITE_ADMIN_PASSWORD` (env local) | `ADMIN_PASSWORD` (env Vercel) |
| **FFmpeg** | WASM avec SharedArrayBuffer (COOP/COEP) | Idem (requis en prod aussi) |

### 4.3 Assets Statiques

| Type | Chemin | Comment servis |
|------|--------|----------------|
| **HTML/CSS/JS** | Bundle Vite (`dist/`) | CDN Vercel (cache long) |
| **Polices** | `public/fonts/` | Servies avec le bundle |
| **Sons UI** | `public/sounds/` | Chargés en `<Audio>` natif ou Howl |
| **Stories JSON** | `public/stories/` | Fetch HTTP direct (pas de CDN purge) |
| **Textures** | `public/textures/` | Importées dans CSS/JS |
| **Sons bibliothèque** | Supabase Storage | URLs signées ou publiques (Cloudinary CDN) |

### 4.4 Gestion des Fichiers Médias

#### Audio (sons d'ambiance, effets)

| Étape | Détail |
|-------|--------|
| **Formats supportés** | MP3, WAV, AIFF, FLAC (entrée) → MP3 (sortie) |
| **Encodage** | FFmpeg WASM côté client (`@ffmpeg/ffmpeg`) |
| **Stockage** | Supabase Storage (`sounds` bucket) |
| **CDN** | Cloudinary (via Supabase transformations) |
| **Métadonnées** | Table Supabase `sounds` (id, label, url, tags, categories, duration, loop, mood, etc.) |
| **Bibliothèque locale** | `public/sounds/sounds-index.json` (bibliothèque BOOM Library indexée) |
| **Recherche** | Web Worker (`public/soundSearchWorker.js`) + Fuse.js (floue) |

#### Images / Textures

| Type | Usage |
|------|-------|
| `paper.png` | Texture de fond pour effet papier |
| `hero.png` | Image hero (accueil) |

#### Pas de vidéo

L'app ne gère pas de vidéos, uniquement audio + texte.

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────────────────
npm run dev              # Git pull + lance API dev (3001) + Vite (5173)
npm run dev:clean        # Tue les process existants + redémarre proprement

# ── Build ──────────────────────────────────────────────────────────────────
npm run build            # Build Vite → dist/ (prod)
npm run preview          # Prévisualisation build locale

# ── Qualité ────────────────────────────────────────────────────────────────
npm run lint             # ESLint sur tout le projet

# ── Utilitaires ────────────────────────────────────────────────────────────
npm run add-sound        # CLI: ajoute un son à la bibliothèque
npm run checkpoint       # Script checkpoint (développement)
npm run publish          # bash publish.sh (publication manuelle)

# ── Scripts directs ────────────────────────────────────────────────────────
node scripts/generateSoundsIndex.js    # Régénère l'index des sons
node scripts/convert-stories.js        # Convertit format histoires
node scripts/migrate-sounds-to-supabase.js  # Migration sons → Supabase
```

---

## 6. Variables d'Environnement

| Variable | Usage | Requis |
|----------|-------|--------|
| `VITE_SUPABASE_URL` | URL projet Supabase (client) | Oui (bibliothèque sons) |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (lecture) | Oui (bibliothèque sons) |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (dev) | Oui (interface admin) |
| `SUPABASE_URL` | URL projet Supabase (serveur) | Oui (upload audio) |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (admin) | Oui (upload audio) |
| `ADMIN_PASSWORD` | Mot de passe admin (prod) | Oui (API upload/publish) |
| `GITHUB_TOKEN` | Token GitHub (publication) | Oui (API publish) |
| `GITHUB_OWNER` | Propriétaire repo GitHub | Oui (API publish) |
| `GITHUB_REPO` | Nom repo GitHub | Oui (API publish) |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Non |

---

## 7. Architecture Résumé

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                  │
├─────────────────────────────────────────────────────────────────┤
│  HomePage → StoryPage → StoryReader + AudioEngine + VfxOverlay  │
│  AdminPage → OrchestrationPanel + DraftManager + PublishPanel   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (dev vs prod)                       │
├─────────────────────────────────────────────────────────────────┤
│  DEV:  Express local:3001 (dev-api-server.js)                   │
│  PROD: Vercel Serverless Functions (/api/*)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                              │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Storage  ← Audio files (MP3)                          │
│  Supabase DB       ← Métadonnées sons (table `sounds`)          │
│  GitHub API        ← Push stories JSON (publication)            │
└─────────────────────────────────────────────────────────────────┘
```

### Formats de Données

**Story JSON** (`public/stories/{id}.json`) :
```json
{
  "id": "story-id",
  "title": "Titre",
  "author": "Auteur",
  "segments": [
    { "id": 1, "text": "Texte du segment", "audioEvents": [] }
  ],
  "sounds": [{ "id": "sound_id", "url": "https://...", "loop": true }],
  "soundTracks": [{ "id": "track_1", "soundId": "sound_id", "startSegmentId": 1, "endSegmentId": 5, "volume": 0.5, "fadeIn": 0, "fadeOut": 0 }],
  "vfxTracks": [{ "type": "typewriter", "startSegmentId": 1, "endSegmentId": 3, "mode": "normal" }]
}
```

**Sound metadata** (table Supabase `sounds`) :
```json
{
  "id": "unique_sound_id",
  "label": "Nom affiché",
  "url": "https://supabase.../sound.mp3",
  "filename": "original.mp3",
  "duration": 45.2,
  "loop": false,
  "tags": ["ambiance", "nuit"],
  "categories": ["Ambiance"],
  "mood": ["Mélancolie"],
  "intensity": "Douce"
}
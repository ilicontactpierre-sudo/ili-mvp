# ILi MVP — Contexte du Projet

> **Lecture immersive** — Application web de lecture d'histoires enrichies avec sons, effets visuels et gamification.

---

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI component-based avec hooks |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA (/lire/:storyId, /admin) |
| **Bundler** | Vite | 8.0.12 | Build rapide, HMR, dev server |
| **Backend dev** | Express | 5.2.1 | Serveur API local (localhost:3001) |
| **Backend prod** | Vercel Serverless | — | Fonctions dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | PostgreSQL + Storage (sons, analytics, newsletter) |
| **Audio** | Howler.js | 2.2.4 | Moteur audio avec instances multiples |
| **Audio avancé** | lamejs + @ffmpeg/ffmpeg | 1.2.1 + 0.12.15 | Compression/conversion audio côté client |
| **Recherche** | Fuse.js | 7.3.0 | Recherche fuzzy dans la bibliothèque sonore |
| **Déploiement** | Vercel + GitHub | — | CI/CD via push sur `main` |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── package.json                    # Dépendances, scripts npm
├── vite.config.js                  # Config Vite + proxy API vers localhost:3001
├── vercel.json                     # Rewrites SPA pour React Router
├── eslint.config.js                # Configuration ESLint
├── index.html                      # Point d'entrée HTML
├── .gitignore                      # Fichiers ignorés par git
├── publish.sh                      # Script de publication manuelle
│
├── api/                            # Fonctions serverless Vercel (prod)
│   ├── publish.js                  # Publie une histoire via GitHub API
│   ├── delete.js                   # Supprime une histoire via GitHub API
│   ├── toggle-visibility.js        # Change la visibilité d'une histoire
│   ├── upload-sound.js             # Enregistre un son dans Supabase
│   ├── upload-audio.js             # Upload fichier audio compressé
│   ├── get-upload-url.js           # Génère URL signée Supabase
│   ├── delete-sound.js             # Supprime un son de Supabase
│   ├── send-newsletter.js          # Envoie newsletter via Resend API
│   ├── subscribe.js                # Gère inscriptions newsletter
│   ├── preview-sound.js            # (non utilisé, doublon)
│
├── scripts/                        # Scripts utilitaires
│   ├── dev-api-server.js           # Serveur Express local (localhost:3001)
│   ├── addSound.js                 # Ajoute un son à la bibliothèque locale
│   ├── checkpoint.js               # Crée un snapshot de l'état courant
│   ├── convert-stories.js          # Convertit anciens formats JSON
│   ├── generateSoundsIndex.js      # Génère sounds-index.json
│   ├── index-boom-library.js       # Indexe la bibliothèque BOOM
│   ├── migrate-sounds-to-supabase.js # Migration sons vers Supabase
│   ├── update-story-urls.js        # Met à jour URLs dans les stories
│   ├── audio-dictionary.js         # Dictionnaire audio (mapping sons)
│   ├── stats-sounds.cjs            # Stats sur les sons utilisés
│   └── README.md                   # Documentation des scripts
│
├── public/                         # Assets statiques servis tels quels
│   ├── manifest.json               # PWA manifest
│   ├── favicon.svg                 # Favicon
│   ├── icons.svg                   # Sprite SVG icônes
│   ├── soundSearchWorker.js        # Web Worker recherche sons
│   │
│   ├── fonts/                      # Polices custom
│   │   ├── NamoraDayanaDemo-0vqZd.ttf   # Police display
│   │   └── Oanteh-rvDvA.otf             # Police logo
│   │
│   ├── sounds/                     # Sons UI et bibliothèque locale
│   │   ├── sounds-index.json       # Index de tous les sons disponibles
│   │   ├── .gitkeep                # Garde le dossier versionné
│   │   ├── Clic ILi.mp3            # Son clic interface
│   │   ├── Clic-Settings.mp3       # Son settings
│   │   ├── whoosh-*.mp3            # Sons whoosh (6 variantes)
│   │   └── *.mp3                   # Autres sons (Tic-Tac, Sweep, etc.)
│   │
│   └── stories/                    # Histoires au format JSON
│       ├── index.json              # Liste de toutes les histoires publiées
│       ├── .gitkeep                # Garde le dossier versionné
│       └── *.json                  # Fichiers d'histoires individuelles
│
├── src/
│   ├── main.jsx                    # Point d'entrée React + render
│   ├── App.jsx                     # Routes + sons globaux (clic, settings)
│   ├── index.css                   # Styles globaux + variables CSS
│   │
│   ├── pages/                      # Pages principales (routes)
│   │   ├── HomePage.jsx            # Accueil avec logo animé + menu histoires
│   │   ├── StoryPage.jsx           # Lecteur d'histoire (core experience)
│   │   ├── AdminPage.jsx           # Éditeur d'histoires complet
│   │   ├── NewsletterPage.jsx      # Page inscription newsletter
│   │   └── AnalyticsDashboard.jsx  # Dashboard analytics (admin)
│   │
│   ├── components/                 # Composants réutilisables
│   │   ├── StoryReader.jsx         # Affichage texte + effets VFX
│   │   ├── StoryReader.css         # Styles du lecteur
│   │   ├── StartScreen.jsx         # Écran de démarrage d'une histoire
│   │   ├── EndScreen.jsx           # Écran de fin avec liens
│   │   ├── StoryMenu.jsx           # Menu déroulant des histoires
│   │   ├── ReaderSettings.jsx      # Paramètres de lecture (DYS, thème)
│   │   ├── GameOverlay.jsx         # Overlay pour modes jeu (quiz, choix)
│   │   ├── VfxOverlay.jsx          # Overlay effets visuels (fog, rain, etc.)
│   │   │
│   │   └── admin/                  # Composants éditeur
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline segments + sons
│   │       ├── SoundBlock.jsx              # Bloc sonore dans timeline
│   │       ├── SoundBlockPanel.jsx         # Panneau propriétés son
│   │       ├── SoundLibraryPicker.jsx      # Sélecteur de sons
│   │       ├── WaveformTrimmer.jsx         # Édition waveform
│   │       ├── AudioTimeline.jsx           # Timeline audio (ancien)
│   │       ├── DraftManager.jsx            # Gestion brouillons
│   │       ├── StoryLoader.jsx             # Chargement histoire existante
│   │       ├── StoryPreviewModal.jsx       # Aperçu avant publication
│   │       ├── PublishPanel.jsx            # Panneau de publication
│   │       ├── PublishAnimation.jsx        # Animation publication
│   │       ├── OrchestrationPanel.jsx      # Orchestration audio avancée
│   │       ├── GameModePanel.jsx           # Configuration gamification
│   │       ├── VfxBlock.jsx                # Bloc effets visuels
│   │       ├── VfxBlockPanel.jsx           # Panneau propriétés VFX
│   │       ├── FormatToolbar.jsx           # Barre d'outils formatage
│   │       ├── SoundImporter.jsx           # Import sons externes
│   │       ├── AnalyticsDashboard.jsx      # Dashboard analytics
│   │       ├── constants.js                # Constantes partagées (couleurs, dims)
│   │       └── README.md                   # Documentation interface audio
│   │
│   ├── engine/                     # Moteurs temps réel
│   │   ├── AudioEngine.js          # Gestion audio (play, fade, loop, pan)
│   │   └── HapticEngine.js         # Vibrations haptiques (mobile)
│   │
│   ├── utils/                      # Fonctions utilitaires
│   │   ├── analytics.js            # Tracking événements lecture vers Supabase
│   │   ├── segmentAlgorithm.js     # Algorithme de découpe texte
│   │   ├── soundSearch.js          # Recherche dans bibliothèque sonore
│   │   ├── renderMarkdown.jsx      # Rendu Markdown → React
│   │   ├── bionicReading.jsx       # Application Bionic Reading
│   │   └── emojiDict.jsx           # Conversion texte → emojis
│   │
│   ├── styles/                     # Feuilles de style
│   │   ├── global.css              # Styles globaux + CSS variables
│   │   └── vfx.css                 # Styles effets visuels
│   │
│   └── assets/                     # Assets importés
│       ├── hero.png                # Image héro
│       ├── react.svg               # Logo React
│       └── vite.svg                # Logo Vite
│
└── .github/                        # (si existe) Workflows CI/CD
```

---

## 3. Flux de Données Principal

### 3.1 Lecture d'une histoire

```
1. HomePage charge /stories/index.json → liste des histoires
2. Utilisateur clique sur une histoire → navigation vers /lire/:storyId
3. StoryPage fetch /stories/{storyId}.json → données complètes
4. StartScreen affiche métadonnées + bouton démarrer
5. Au démarrage :
   - Préchargement des sons (Howl instances)
   - Création AudioEngine
   - Tracking analytics (event: start)
6. Lecture segment par segment :
   - StoryReader affiche le texte du segment courant
   - AudioEngine exécute audioEvents ou soundTracks
   - VfxOverlay applique effets visuels (fog, flash, etc.)
   - HapticEngine vibre si pattern défini
7. Navigation :
   - Clic droit/écran → segment suivant
   - Clic gauche/écran → segment précédent
   - Flèches clavier → navigation
   - Swipe mobile → navigation
8. Fin d'histoire :
   - EndScreen avec liens (livre, formulaire)
   - Tracking analytics (event: finish)
   - Proposition partie suivante (mode série)
```

### 3.2 Upload d'un son (admin)

```
1. AdminPage → SoundImporter ou SoundLibraryPicker
2. Sélection fichier audio → compression via lamejs ou ffmpeg.wasm
3. Envoi base64 à /api/upload-audio (dev: localhost:3001, prod: Vercel)
4. Serveur upload vers Supabase Storage (bucket: sounds)
5. Récupération URL publique
6. Enregistrement métadonnées dans Supabase (table: sounds)
7. Mise à jour sounds-index.json (local ou via GitHub API)
```

### 3.3 Publication d'une histoire

```
1. AdminPage → PublishPanel → bouton "Publier"
2. Envoi storyData + slug + password à /api/publish
3. Serveur authentifie avec ADMIN_PASSWORD
4. Écriture public/stories/{slug}.json via GitHub API
5. Mise à jour public/stories/index.json via GitHub API
6. Commit automatique sur la branche configurée (main)
7. Vercel redéploie automatiquement
8. Animation de confirmation dans l'admin
```

### 3.4 Gestion de l'authentification

| Élément | Mécanisme | Stockage |
|---------|-----------|----------|
| **Admin (édition)** | Mot de passe saisi dans AdminPage | `sessionStorage.ili_admin_password` |
| **API (dev)** | Vérification `ADMIN_PASSWORD` dans `.env` | Variable d'environnement |
| **API (prod)** | Vérification `ADMIN_PASSWORD` dans Vercel env vars | Vercel Environment Variables |
| **Supabase (anon)** | Clé anon pour lectures publiques | `VITE_SUPABASE_ANON_KEY` |
| **Supabase (service)** | Clé service pour écritures admin | `SUPABASE_SERVICE_KEY` (.env) |
| **GitHub** | Token personnel pour commits | `GITHUB_TOKEN` (.env) |

---

## 4. Points Sensibles Connus

### 4.1 Fichiers de configuration critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev → localhost:3001, headers COOP/COEP pour SharedArrayBuffer | Rupture API locale, problèmes audio FFmpeg |
| `vercel.json` | Rewrite SPA vers index.html | 404 sur les routes client (/lire/*, /admin) |
| `package.json` | Scripts, dépendances, version | Build cassé, modules manquants |
| `.env` (local) | Variables sensibles (Supabase, GitHub, admin) | API inopérantes en dev |
| Vercel Env Vars (prod) | Variables sensibles production | API inopérantes en prod |

### 4.2 Différences environnement local vs production

| Aspect | Local (dev) | Production (Vercel) |
|--------|-------------|---------------------|
| **Frontend** | Vite dev server (localhost:5173) | Build statique + CDN Vercel |
| **Backend API** | Express sur localhost:3001 | Fonctions serverless Vercel (/api/*) |
| **Stories** | Fichiers JSON dans `public/stories/` | Même structure, servie par CDN |
| **Sons** | Fichiers locaux + Supabase Storage | Supabase Storage uniquement |
| **Auth** | Password via sessionStorage | Même mécanisme |
| **Proxy** | Vite proxy vers localhost:3001 | Appels directs à /api/* (serverless) |
| **Env vars** | Fichier `.env` local | Vercel Environment Variables |

### 4.3 Assets statiques

| Type | Chemin | Servis depuis |
|------|--------|---------------|
| **HTML/CSS/JS** | `dist/` (build) | CDN Vercel |
| **Polices** | `public/fonts/` | CDN Vercel (fichiers statiques) |
| **Images** | `public/` et `src/assets/` | CDN Vercel |
| **Sons UI** | `public/sounds/` | CDN Vercel |
| **Sons histoires** | Supabase Storage | CDN Supabase |
| **Stories JSON** | `public/stories/` | CDN Vercel |

### 4.4 Gestion des fichiers médias

| Aspect | Détails |
|--------|---------|
| **Formats audio supportés** | MP3, WAV, AIFF, FLAC, OGG |
| **Compression** | lamejs (MP3) ou ffmpeg.wasm (multi-format) côté client |
| **Stockage** | Supabase Storage (bucket: `sounds`) |
| **CDN** | CDN Supabase intégré |
| **Métadonnées** | Table Supabase `sounds` : id, label, url, tags, categories, mood, duration, loop, etc. |
| **Index local** | `public/sounds/sounds-index.json` — synchronisé avec Supabase |
| **Prévisualisation** | Extrait 3 secondes via Howler.js |
| **Upload** | Via /api/upload-audio (dev) ou upload direct signé (prod) |

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────
npm run dev              # Lance Vite + serveur API local (concurrently)
npm run dev:clean        # Tue les process existants + relance proprement

# ── Build ──────────────────────────────────────────────────────
npm run build            # Build de production (Vite)
npm run preview          # Prévisualisation build local

# ── Qualité ────────────────────────────────────────────────────
npm run lint             # ESLint sur tout le projet

# ── Utilitaires ────────────────────────────────────────────────
npm run add-sound        # Ajoute un son à la bibliothèque locale
node scripts/checkpoint.js  # Crée un snapshot de l'état courant
node scripts/generateSoundsIndex.js  # Régénère l'index des sons
node scripts/convert-stories.js  # Convertit anciens formats JSON
node scripts/update-story-urls.js  # Met à jour URLs dans les stories

# ── Publication ────────────────────────────────────────────────
npm run publish          # Lance publish.sh (publication manuelle)
bash publish.sh          # Script de publication directe
```

---

## 6. Variables d'Environnement

| Nom | Usage | Requis |
|-----|-------|--------|
| `VITE_SUPABASE_URL` | URL du projet Supabase (frontend) | Oui (lecture seule) |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (frontend) | Oui (lecture seule) |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (frontend) | Oui (édition) |
| `ADMIN_PASSWORD` | Mot de passe admin (backend) | Oui (API protégées) |
| `SUPABASE_URL` | URL Supabase (backend) | Oui (backend) |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (backend) | Oui (écritures admin) |
| `GITHUB_TOKEN` | Token GitHub pour commits | Oui (publication) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui (publication) |
| `GITHUB_REPO` | Nom du repo GitHub | Oui (publication) |
| `GITHUB_BRANCH` | Branche cible (défaut: main) | Non |
| `RESEND_API_KEY` | Clé API Resend (newsletter) | Optionnel |

---

## 7. Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  HomePage  →  StoryPage  →  StoryReader  +  AudioEngine        │
│     ↑              ↑                                               │
│     └─────── AdminPage (éditeur complet) ────────┘               │
│                     ↓                                               │
│              API Calls (/api/*)                                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ↓                           ↓
┌──────────────────┐        ┌──────────────────┐
│  DEV: Express    │        │  PROD: Vercel    │
│  localhost:3001  │        │  Serverless      │
└────────┬─────────┘        └────────┬─────────┘
         │                           │
         └─────────────┬─────────────┘
                       ↓
              ┌────────────────┐
              │    Supabase    │
              │  (PostgreSQL   │
              │  + Storage)    │
              └────────────────┘
```

---

## 8. Formats de Données

### Story JSON (simplifié)

```json
{
  "id": "la-reine-margot",
  "title": "LA REINE MARGOT",
  "author": "Alexandre Dumas",
  "mood": "Dramatique",
  "genre": "Roman historique",
  "description": "...",
  "type": "simple",
  "segments": [
    { "id": "seg_1", "text": "Il était une fois...", "audioEvents": [] },
    { "id": "seg_2", "text": "Dans un royaume lointain...", "audioEvents": [] }
  ],
  "sounds": [
    { "id": "sound_1", "label": "Ambiance château", "url": "https://..." }
  ],
  "soundTracks": [
    {
      "id": "track_1",
      "soundId": "sound_1",
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_2",
      "volume": 0.5,
      "fadeIn": 1000,
      "fadeOut": 2000,
      "delay": 0,
      "loop": true,
      "column": 0
    }
  ],
  "vfxTracks": [
    {
      "type": "fog",
      "mode": "dense",
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_2"
    }
  ]
}
```

### Mode Série (serial)

```json
{
  "type": "serial",
  "parts": [
    {
      "id": "part_1",
      "title": "Partie 1",
      "published": true,
      "visibility": "published",
      "segments": [...],
      "soundTracks": [...],
      "vfxTracks": [...]
    }
  ]
}
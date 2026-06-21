# ILi MVP — Contexte Projet

Application web de lecture immersive d'histoires sonores interactives.

---

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI composants fonctionnels + hooks |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA (/lire/:storyId, /admin) |
| **Bundler** | Vite | 8.0.12 | Dev server + build avec HMR |
| **Backend dev** | Express | 5.2.1 | Serveur API local (port 3001) |
| **Backend prod** | Vercel Serverless | — | Fonctions dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | PostgreSQL + Storage (sons, analytics, newsletter) |
| **Audio** | Howler.js | 2.2.4 | Moteur audio (play, fade, loop, spatialisation) |
| **Audio enc** | lamejs | 1.2.1 | Encodage MP3 côté client |
| **Audio ffmpeg** | @ffmpeg/ffmpeg | 0.12.15 | Traitement audio avancé (WASM) |
| **Recherche** | Fuse.js | 7.3.0 | Recherche floue bibliothèque sonore |
| **Déploiement** | Vercel | — | Hosting statique + serverless functions |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── package.json                    # Config projet + scripts npm
├── package-lock.json               # Lock des dépendances
├── vite.config.js                  # Config Vite (proxy API, COOP/COEP headers)
├── vercel.json                     # Rewrites SPA pour Vercel
├── eslint.config.js                # Config ESLint
├── index.html                      # Point d'entrée HTML (root div)
│
├── .gitignore                      # Exclusions Git (node_modules, .env, etc.)
├── git-sync.sh                     # Script sync Git multi-branches
├── publish.sh                      # Script de publication
│
├── api/                            # Serverless functions (Vercel + dev local)
│   ├── publish.js                  # POST /api/publish → commit story sur GitHub
│   ├── upload-audio.js             # POST /api/upload-audio → upload fichier audio Supabase
│   ├── upload-sound.js             # POST /api/upload-sound → upsert metadata son dans Supabase
│   ├── get-upload-url.js           # POST /api/get-upload-url → URL signée upload direct
│   ├── delete-sound.js             # DELETE /api/delete-sound → supprime son (storage + DB)
│   ├── delete.js                   # DELETE /api/delete → supprime story GitHub
│   ├── toggle-visibility.js        # POST /api/toggle-visibility → publie/cache story GitHub
│   ├── manage-menu.js              # POST /api/manage-menu → gère menu principal GitHub
│   ├── preview-sound.js            # GET /api/preview-sound → stream fichier local (dev only)
│   ├── subscribe.js                # POST /api/subscribe → ajoute email newsletter Supabase
│   ├── send-newsletter.js          # POST /api/send-newsletter → envoie newsletter via Resend
│   └── analytics.js                # (via utils) → tracking événements lecture
│
├── scripts/                        # Scripts utilitaires CLI
│   ├── dev-api-server.js           # Serveur Express dev (port 3001) — proxy vers Supabase/GitHub
│   ├── addSound.js                 # Script ajout son CLI
│   ├── checkpoint.js               # Script sauvegarde/restauration checkpoint
│   ├── convert-stories.js          # Conversion format stories
│   ├── generateSoundsIndex.js      # Génération index JSON bibliothèque
│   ├── index-boom-library.js       # Indexation BOOM Library dans Supabase
│   ├── migrate-sounds-to-supabase.js # Migration sons locaux → Supabase Storage
│   ├── update-story-urls.js        # Mise à jour URLs dans les stories
│   ├── audio-dictionary.js         # Dictionnaire audio (mapping sons)
│   ├── stats-sounds.cjs            # Stats bibliothèque sonore
│   └── README.md                   # Documentation scripts
│
├── public/                         # Assets statiques (servis à la racine)
│   ├── favicon.svg                 # Favicon
│   ├── manifest.json               # PWA manifest
│   ├── icons.svg                   # Sprite SVG icons
│   ├── soundSearchWorker.js        # Web Worker recherche sons (Fuse.js)
│   │
│   ├── fonts/                      # Polices custom
│   │   ├── Benedict Regular.otf    # Police principale
│   │   └── Oanteh.ttf              # Police secondaire
│   │
│   ├── sounds/                     # Sons locaux (dev + sons UI)
│   │   ├── sounds-index.json       # Index metadata bibliothèque locale
│   │   ├── .gitkeep                # Garde le dossier versionné vide
│   │   ├── Clic ILi.mp3            # Son clic principal
│   │   ├── Clic ILi simple.mp3     # Son clic simple
│   │   ├── Clic-Settings.mp3       # Son settings
│   │   ├── whoosh-*.mp3            # Sons whoosh (6 variantes)
│   │   └── [autres sons UI]        # Sons d'interface
│   │
│   ├── stories/                    # Fichiers JSON des histoires
│   │   ├── index.json              # Liste des stories (id, title, author)
│   │   ├── .gitkeep                # Garde le dossier versionné vide
│   │   └── [story-slug].json       # Données story (segments, sons, vfx, metadata)
│   │
│   └── textures/                   # Textures graphiques
│       └── paper.png               # Texture papier (VFX overlay)
│
├── src/                            # Code source React
│   ├── main.jsx                    # Point d'entrée React (BrowserRouter + root)
│   ├── App.jsx                     # Routing + sons UI globaux (clic, settings)
│   ├── index.css                   # Styles de base (reset)
│   │
│   ├── pages/                      # Pages principales (routes)
│   │   ├── HomePage.jsx            # Page d'accueil (liste stories)
│   │   ├── StoryPage.jsx           # Page de lecture (moteur principal)
│   │   ├── AdminPage.jsx           # Page admin (création/édition stories)
│   │   ├── NewsletterPage.jsx      # Page newsletter (abonnement + gestion)
│   │   └── AnalyticsDashboard.jsx  # Dashboard analytics (lectures)
│   │
│   ├── components/                 # Composants réutilisables
│   │   ├── StoryReader.jsx         # Lecteur texte + segments (cœur lecture)
│   │   ├── StoryReader.css         # Styles lecteur
│   │   ├── StartScreen.jsx         # Écran démarrage (preload audio + résumé)
│   │   ├── EndScreen.jsx           # Écran fin (feedback + partie suivante)
│   │   ├── SeuilScreen.jsx         # Écran questions "seuil" (avant lecture)
│   │   ├── ReaderSettings.jsx      # Paramètres lecture (vitesse, sauts, progression)
│   │   ├── GameOverlay.jsx         # Overlay modes jeu (choice_branch, etc.)
│   │   ├── VfxOverlay.jsx          # Overlay effets visuels (particles, etc.)
│   │   ├── StoryMenu.jsx           # Menu sélection histoire
│   │   │
│   │   ├── admin/                  # Composants interface admin
│   │   │   ├── UnifiedSegmentsTimeline.jsx # Timeline segments + tracks audio/vfx
│   │   │   ├── AudioTimeline.jsx           # Timeline audio (legacy)
│   │   │   ├── SoundBlock.jsx              # Bloc son individuel
│   │   │   ├── SoundBlockPanel.jsx         # Panneau édition bloc son
│   │   │   ├── VfxBlock.jsx                # Bloc effet visuel
│   │   │   ├── VfxBlockPanel.jsx           # Panneau édition VFX
│   │   │   ├── WaveformTrimmer.jsx         # Éditeur waveform + trim
│   │   │   ├── SoundImporter.jsx           # Import fichier audio
│   │   │   ├── SoundLibraryPicker.jsx      # Sélecteur bibliothèque
│   │   │   ├── FormatToolbar.jsx           # Toolbar formatage texte
│   │   │   ├── DraftManager.jsx            # Gestion brouillons
│   │   │   ├── StoryLoader.jsx             # Chargement story existante
│   │   │   ├── StoryPreviewModal.jsx       # Modal aperçu
│   │   │   ├── PublishPanel.jsx            # Panneau publication
│   │   │   ├── PublishAnimation.jsx        # Animation publication
│   │   │   ├── OrchestrationPanel.jsx      # Panneau orchestration audio
│   │   │   ├── GameModePanel.jsx           # Panneau modes jeu
│   │   │   ├── InlineFunctionMenu.jsx      # Menu fonctions inline
│   │   │   ├── TagsInput.jsx               # Input tags (autocomplete)
│   │   │   ├── MenuManagerPage.jsx         # Gestion menu principal
│   │   │   ├── AnalyticsDashboard.jsx      # Dashboard analytics
│   │   │   ├── constants.js                # Constantes admin (couleurs, etc.)
│   │   │   └── README.md                   # Documentation admin
│   │   │
│   │   └── .gitkeep                        # Garde le dossier versionné vide
│   │
│   ├── engine/                     # Moteurs métier
│   │   ├── AudioEngine.js          # Moteur audio (Howler.js wrapper — play, fade, loop, pan, automation)
│   │   ├── HapticEngine.js         # Moteur haptique (vibrations)
│   │   └── .gitkeep                # Garde le dossier versionné vide
│   │
│   ├── utils/                      # Fonctions utilitaires
│   │   ├── segmentAlgorithm.js     # Algo découpe texte en segments
│   │   ├── renderMarkdown.jsx      # Rendu Markdown → JSX
│   │   ├── bionicReading.jsx       # Mode lecture bionique
│   │   ├── emojiDict.jsx           # Mapping emojis
│   │   ├── inlineFunctions.jsx     # Fonctions inline ({{journal:cle}}, </lire:cle/>)
│   │   ├── soundSearch.js          # Recherche sons (Fuse.js)
│   │   └── analytics.js            # Envoi événements lecture Supabase
│   │
│   ├── styles/                     # Styles globaux
│   │   ├── global.css              # CSS global (variables, reset, typo)
│   │   ├── vfx.css                 # Styles effets visuels
│   │   └── .gitkeep                # Garde le dossier versionné vide
│   │
│   └── assets/                     # Assets importés dans le bundle
│       ├── hero.png                # Image hero
│       ├── react.svg               # Logo React
│       └── vite.svg                # Logo Vite
│
├── .env                            # Variables locales (non versionné)
├── .env.example                    # Template variables (à créer)
└── PROJECT_CONTEXT.md              # Ce fichier
```

---

## 3. Flux de Données Principal

### 3.1 Lecture d'une histoire

```
Utilisateur → HomePage → clique story → /lire/:storyId (StoryPage)
    ↓
StoryPage charge `/stories/${storyId}.json` (GET statique)
    ↓
Affiche StartScreen → preload sons (Howler.js) → option "seuil" (questions)
    ↓
Lecture active : StoryReader affiche segment courant
    ↓
Navigation (clic/touch/clavier) → segment suivant/précédent
    ↓
AudioEngine exécute audioEvents du segment OU gère soundTracks (blocs audio)
    ↓
Progression sauvegardée (localStorage) → écran fin → feedback
```

**Format JSON story :**
```json
{
  "id": "slug",
  "title": "Titre",
  "author": "Auteur",
  "segments": [{ "id": "seg_1", "text": "Il était une fois...", "audioEvents": [] }],
  "sounds": [{ "id": "son_1", "url": "https://...", "label": "Ambiance forêt" }],
  "soundTracks": [{ "id": "track_1", "soundId": "son_1", "startSegmentId": "seg_1", "endSegmentId": "seg_5", "volume": 0.5 }],
  "vfxTracks": [],
  "type": "simple" | "serial",
  "parts": [] // si type=serial
}
```

### 3.2 Upload son (admin)

```
AdminPage → SoundImporter / SoundLibraryPicker
    ↓
Sélection fichier audio → compression lamejs (MP3 128kbps)
    ↓
POST /api/get-upload-url (password + filename) → URL signée Supabase
    ↓
Upload direct navigateur → Supabase Storage (bucket `sounds`)
    ↓
POST /api/upload-sound (password + soundEntry metadata) → upsert table `sounds`
    ↓
Optionnel : POST /api/publish → commit sounds-index.json sur GitHub
```

### 3.3 Publication story (admin)

```
AdminPage → PublishPanel → clique "Publier"
    ↓
Saisie mot de passe → vérification VITE_ADMIN_PASSWORD
    ↓
POST /api/publish (password + slug + storyData JSON)
    ↓
API lit story existante sur GitHub (GET /repos/.../contents/)
    ↓
API écrit story JSON + met à jour index.json (PUT /repos/.../contents/)
    ↓
Commit sur branche configurée (GITHUB_BRANCH, défaut: main)
```

### 3.4 Authentification

| Contexte | Mécanisme | Stockage |
|----------|-----------|----------|
| **Admin (frontend)** | Mot de passe saisi → comparaison avec `VITE_ADMIN_PASSWORD` | `sessionStorage.ili_admin_password` |
| **API (dev local)** | Vérification `ADMIN_PASSWORD` dans `.env` | Variable d'environnement |
| **API (prod Vercel)** | Vérification `ADMIN_PASSWORD` dans env Vercel | Variable d'environnement serverless |

**Pas d'authentification utilisateur lecteur** — les stories sont publiques.

---

## 4. Points Sensibles

### 4.1 Fichiers de configuration critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev (/api/* → localhost:3001), headers COOP/COEP (requis pour ffmpeg.wasm) | Casser proxy dev ou traitement audio |
| `vercel.json` | Rewrites SPA (toutes routes → index.html) | Casser routing React en prod |
| `package.json` | Scripts npm, dépendances | Casser build/dev si modifié incorrectement |
| `.env` (local) | Variables locales (SUPABASE_*, GITHUB_*, ADMIN_PASSWORD) | Casser API si incorrectes |

### 4.2 Différences local vs production

| Aspect | Développement (local) | Production (Vercel) |
|--------|----------------------|---------------------|
| **Frontend** | Vite dev server (port 5173) | Build statique optimisé |
| **Backend API** | Express sur port 3001 (`scripts/dev-api-server.js`) | Serverless functions dans `/api/*.js` |
| **Proxy API** | Vite proxy `/api/*` → `localhost:3001` | Appels directs aux fonctions serverless |
| **Stories** | Fichiers JSON dans `public/stories/` | Même structure, servie par CDN Vercel |
| **Sons** | `public/sounds/` (locaux) + Supabase Storage | Supabase Storage uniquement (CDN) |
| **Variables** | `.env` local (VITE_* + serveur) | Env Vercel (mêmes noms) |

### 4.3 Assets statiques

- **Servis depuis** : dossier `public/` (Vite copie tel quel en build)
- **Accès** : URLs à la racine (`/sounds/whoosh-1.mp3`, `/stories/index.json`)
- **Sons UI** : `public/sounds/` (Clic ILi, whoosh, etc.) — chargés en dur dans `App.jsx`
- **Polices** : `public/fonts/` — chargées via `@font-face` dans `global.css`
- **Textures** : `public/textures/paper.png` — utilisée par VfxOverlay

### 4.4 Gestion des fichiers médias

| Type | Pipeline | Formats | Stockage | CDN | Métadonnées |
|------|----------|---------|----------|-----|-------------|
| **Audio (sons bibliothèque)** | Upload admin → compression lamejs (MP3 128) → Supabase Storage | MP3, WAV, AIFF, FLAC (preview) | Bucket `sounds` Supabase | CDN Supabase (URL publique) | Table `sounds` (id, label, url, tags, categories, duration, loop, mood, etc.) |
| **Audio (UI)** | Fichiers statiques dans `public/sounds/` | MP3 | Git + Vercel CDN | Vercel CDN | Hardcodés dans `App.jsx` |
| **Stories** | Édition admin → publication → commit GitHub | JSON | Repo GitHub (`public/stories/`) | Vercel CDN (via repo) | `index.json` (liste) + metadata inline |
| **Images/Textures** | Statiques dans `public/` | PNG, SVG | Git + Vercel CDN | Vercel CDN | Aucune (usage direct) |

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────────────────
npm run dev              # Lance Vite + serveur API Express (concurrently)
npm run dev:clean        # Tue les process existants + relance propre

# ── Build ──────────────────────────────────────────────────────────────────
npm run build            # Build Vite production (output: dist/)
npm run preview          # Prévisualise build local (port 4173)

# ── Lint ───────────────────────────────────────────────────────────────────
npm run lint             # ESLint avec config projet

# ── Utilitaires ────────────────────────────────────────────────────────────
npm run add-sound        # Script CLI ajout son à la bibliothèque
npm run checkpoint       # Sauvegarde checkpoint + lance dev server
npm run publish          # Script bash publication (git + Vercel deploy)
npm run sync             # Script bash git-sync.sh (sync multi-branches)
```

---

## 6. Variables d'Environnement

### Frontend (exposées via `VITE_*`)

| Nom | Usage | Requis |
|-----|-------|--------|
| `VITE_SUPABASE_URL` | URL projet Supabase (lecture seule) | Oui |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (lecture seule) | Oui |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (frontend) | Oui |

### Backend (server-only, jamais exposées)

| Nom | Usage | Requis |
|-----|-------|--------|
| `ADMIN_PASSWORD` | Protection routes API (/api/*) | Oui |
| `SUPABASE_URL` | URL Supabase (backend) | Oui |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (écritures admin) | Oui |
| `GITHUB_TOKEN` | Token GitHub pour commits (publication) | Oui (publication) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui (publication) |
| `GITHUB_REPO` | Nom du repo GitHub | Oui (publication) |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Non |
| `RESEND_API_KEY` | Clé API Resend (newsletter) | Optionnel |

---

## 7. Architecture Résumé

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  HomePage   │  │  StoryPage  │  │  AdminPage  │  │ Newsletter  │ │
│  │  (liste)    │  │  (lecture)  │  │  (édition)  │  │  (abonnement)│ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                              │                                        │
│                    ┌─────────▼─────────┐                             │
│                    │    AudioEngine    │ ← Howler.js (sons, fade,   │
│                    │    (src/engine/)  │    loop, pan, automation)   │
│                    └───────────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ API calls (/api/*)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Serverless / Express dev)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  publish.js │  │ upload-*.js │  │  delete.js  │  │ subscribe   │ │
│  │  (GitHub)   │  │  (Supabase) │  │  (GitHub)   │  │  (Supabase) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
        ┌──────────┐   ┌──────────────┐   ┌──────────┐
        │  GitHub  │   │   Supabase   │   │  Resend  │
        │  (stories│   │  (Storage    │   │(newsletter│
        │   JSON)  │   │  sounds + DB)│   │  emails) │
        └──────────┘   └──────────────┘   └──────────┘
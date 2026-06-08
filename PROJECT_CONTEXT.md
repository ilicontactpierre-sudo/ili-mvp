# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | + React Router DOM 7.15.0 |
| **Bundler** | Vite | 8.0.12 | Plugin React (Oxc) |
| **Backend (dev)** | Express | 5.2.1 | Serveur API local sur `:3001` |
| **Backend (prod)** | Vercel Serverless Functions | — | Routes `/api/*` |
| **Base de données** | Supabase (PostgreSQL) | — | Client `@supabase/supabase-js` 2.106.1 |
| **Storage audio** | Supabase Storage (bucket `sounds`) | — | Fichiers MP3/WAV |
| **Audio frontend** | Howler.js | 2.2.4 | Gestion playback, sprites, fade |
| **Hébergement** | Vercel | — | SPA + rewrites vers `index.html` |
| **CI/CD** | GitHub → Vercel (auto-deploy) | — | Push sur `main` déclenche le build |

---

## 2. Structure des fichiers

```
ili-mvp/
├── index.html                 # Entry point HTML (Vite)
├── package.json               # Dépendances & scripts
├── vite.config.js             # Config Vite (proxy API, COOP/COEP)
├── vercel.json                # Rewrites SPA pour Vercel
├── publish.sh                 # Script de déploiement (git + push)
│
├── api/                       # Serverless Functions (Vercel)
│   ├── preview-sound.js       # Streaming audio local (dev only)
│   ├── upload-audio.js        # Upload fichier → Supabase Storage
│   ├── upload-sound.js        # Upsert métadonnées son → Supabase DB
│   ├── get-upload-url.js      # URL signée Supabase
│   ├── publish.js             # Publie story via GitHub API
│   ├── delete.js              # Supprime story via GitHub API
│   ├── delete-sound.js        # Supprime son de Supabase
│   ├── toggle-visibility.js   # Toggle visibilité story (GitHub)
│   ├── subscribe.js           # Newsletter (Supabase + Resend)
│   └── send-newsletter.js     # Envoi newsletter (Resend API)
│
├── scripts/
│   ├── dev-api-server.js      # Serveur Express dev (proxy vers Supabase/GitHub)
│   ├── addSound.js            # CLI ajout son
│   ├── checkpoint.js          # Git commit + relance Vite
│   ├── migrate-sounds-to-supabase.js  # Migration sons vers Supabase
│   ├── index-boom-library.js  # Indexation BOOM Library
│   ├── generateSoundsIndex.js # Génère sounds-index.json
│   └── convert-stories.js     # Conversion format stories
│
├── public/
│   ├── sounds/                # Sons locaux (dev) + index JSON
│   │   ├── sounds-index.json  # Index recherche (Fuse.js)
│   │   └── *.mp3              # Fichiers audio
│   ├── stories/               # Stories JSON (statiques en prod)
│   │   ├── index.json         # Liste des stories (titre, auteur, slug)
│   │   └── *.json             # Données story (segments, sons, vfx)
│   ├── fonts/                 # Polices custom (.ttf, .otf)
│   ├── textures/              # Images (paper.png pour vfx)
│   ├── favicon.svg
│   └── icons.svg              # Sprite SVG
│
├── src/
│   ├── main.jsx               # Entry point React (ReactDOM.createRoot)
│   ├── App.jsx                # Routes (React Router)
│   ├── index.css              # Styles globaux
│   │
│   ├── pages/
│   │   ├── HomePage.jsx       # Liste des stories
│   │   ├── StoryPage.jsx      # Lecteur story (charge StoryReader)
│   │   ├── AdminPage.jsx      # Interface admin (création/édition)
│   │   └── NewsletterPage.jsx # Page newsletter
│   │
│   ├── components/
│   │   ├── StoryReader.jsx    # Cœur du lecteur (texte + audio + vfx)
│   │   ├── StoryReader.css    # Styles lecteur
│   │   ├── StartScreen.jsx    # Écran titre story
│   │   ├── EndScreen.jsx      # Écran fin story
│   │   ├── StoryMenu.jsx      # Menu navigation stories
│   │   ├── ReaderSettings.jsx # Réglages (vitesse, vfx, etc.)
│   │   ├── GameOverlay.jsx    # Overlay mode jeu
│   │   └── admin/             # Composants admin
│   │       ├── PublishPanel.jsx       # Publier story
│   │       ├── SoundBlockPanel.jsx    # Éditer bloc son
│   │       ├── VfxBlockPanel.jsx      # Éditer effet visuel
│   │       ├── UnifiedSegmentsTimeline.jsx  # Timeline segments
│   │       ├── WaveformTrimmer.jsx    # Découpe audio
│   │       ├── SoundLibraryPicker.jsx # Sélecteur sons
│   │       ├── SoundImporter.jsx      # Import son externe
│   │       ├── DraftManager.jsx       # Brouillons
│   │       ├── FormatToolbar.jsx      # Toolbar édition
│   │       ├── GameModePanel.jsx      # Configuration mode jeu
│   │       ├── OrchestrationPanel.jsx # Orchestration events
│   │       ├── StoryLoader.jsx        # Chargement story
│   │       ├── StoryPreviewModal.jsx  # Preview
│   │       ├── AudioTimeline.jsx      # Timeline audio
│   │       ├── SoundBlock.jsx         # Rendu bloc son
│   │       ├── VfxBlock.jsx           # Rendu effet visuel
│   │       ├── PublishAnimation.jsx   # Animation publication
│   │       ├── constants.js           # Constantes UI
│   │       └── README.md              # Doc admin
│   │
│   ├── engine/
│   │   ├── AudioEngine.js     # Moteur audio (Howler.js wrapper)
│   │   └── HapticEngine.js    # Moteur haptique (vibration)
│   │
│   ├── utils/
│   │   ├── renderMarkdown.jsx # Rendu Markdown → HTML + vfx
│   │   ├── segmentAlgorithm.js # Algo découpe segments
│   │   ├── bionicReading.jsx  # Mode lecture bionique
│   │   ├── emojiDict.jsx      # Remplacement texte → emojis
│   │   └── soundSearch.js     # Recherche sons (Fuse.js)
│   │
│   └── styles/
│       ├── global.css         # Variables & reset
│       └── vfx.css            # Effets visuels (typewriter, static, etc.)
│
├── .gitignore
├── eslint.config.js
└── PROJECT_CONTEXT.md         # Ce fichier
```

---

## 3. Flux de données principal

### Lecture d'une story (utilisateur)

```
1. HomePage.jsx
   └─ Fetch GET /stories/index.json (fichier statique public/)
   └─ Affiche la liste des stories

2. Utilisateur clique sur une story
   └─ Navigation → /lire/:storyId

3. StoryPage.jsx
   └─ Fetch GET /stories/{storyId}.json (fichier statique public/)
   └─ Rend StoryReader.jsx avec les données

4. StoryReader.jsx
   ├─ Parse les segments (texte + métadonnées audio/vfx)
   ├─ Précharge les sons via Howler.js (depuis public/sounds/ ou Supabase)
   ├─ Affiche le texte segment par segment (défilement auto ou manuel)
   ├─ Déclenche AudioEngine selon le segment courant
   └─ Applique les VFX (typewriter, static, erased, flash, etc.)

5. AudioEngine.js
   ├─ Gère le playback (play, stop, fade, loop, crossfade)
   ├─ Gère la spatialisation (pan, sweep, oscillation)
   └─ Synchronise avec les segments via onSegmentChange()
```

### Publication d'une story (admin)

```
1. AdminPage.jsx → PublishPanel.jsx
   ├─ L'admin édite une story (texte, segments, sons, vfx)
   └─ Clique sur "Publier"

2. PublishPanel.jsx
   └─ POST /api/publish { password, slug, storyData }

3. /api/publish (Vercel Function ou dev-api-server.js)
   ├─ Vérifie ADMIN_PASSWORD
   ├─ Lit le fichier existant via GitHub API
   ├─ Écrit la story → `public/stories/{slug}.json` (commit GitHub)
   ├─ Met à jour `public/stories/index.json` (commit GitHub)
   └─ Retourne succès

4. Vercel détecte le push GitHub
   └─ Red dé dé dé déploie automatiquement (build Vite → CDN)
```

### Upload d'un son (admin)

```
1. SoundImporter.jsx ou SoundBlockPanel.jsx
   └─ POST /api/upload-audio { password, filename, fileBase64 }

2. /api/upload-audio
   ├─ Vérifie ADMIN_PASSWORD
   ├─ Decode base64 → Buffer
   ├─ Upload vers Supabase Storage (bucket `sounds`)
   └─ Retourne publicUrl

3. SoundBlockPanel.jsx
   └─ POST /api/upload-sound { password, soundEntry }
   └─ Upsert métadonnées dans Supabase DB (table `sounds`)
```

### Authentification

- **Pas de système d'auth utilisateur** — l'app est publique.
- **Admin** : protection par `ADMIN_PASSWORD` (mot de passe unique envoyé dans le body des requêtes API).
- **Supabase** : utilisation de `SUPABASE_SERVICE_KEY` (clé admin, pas RLS) pour les opérations backend.

---

## 4. Points sensibles

### Fichiers de configuration critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API dev (`/api/*` → `localhost:3001`), headers COOP/COEP (requis pour ffmpeg.wasm) |
| `vercel.json` | Rewrites SPA : toutes les routes → `index.html` (React Router gère le routing client) |
| `scripts/dev-api-server.js` | Serveur Express dev : proxy vers Supabase + GitHub API (remplace les Vercel Functions en local) |
| `publish.sh` | Script de déploiement : git add/commit/push → déclenche Vercel |

### Différences local vs production

| Aspect | Local (dev) | Production (Vercel) |
|--------|-------------|---------------------|
| **API** | Express sur `:3001` (scripts/dev-api-server.js) | Vercel Serverless Functions (`/api/*`) |
| **Sons** | Fichiers locaux (`public/sounds/`) + preview via `/api/preview-sound` | URL publiques Supabase Storage |
| **Stories** | Fichiers JSON locaux (`public/stories/`) | Même structure, servie par CDN Vercel |
| **Publication** | Écrit directement dans les fichiers locaux + commit GitHub | Uniquement via commit GitHub (pas d'écriture directe) |
| **CORS** | Géré par le proxy Vite | Géré par Vercel (same-origin) |

### Assets statiques

- **Servis depuis** : `public/` → racine du site (Vite build → `dist/`)
- **CDN** : Vercel Edge Network (automatique)
- **Cache** : par défaut, Vercel cache les assets statiques avec hash dans l'URL

### Gestion des fichiers médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio** | Upload admin → Supabase Storage → URL publique → Howler.js | MP3, WAV, AIFF, FLAC | Supabase Storage (bucket `sounds`) |
| **Images** | Static (`public/`) ou inline dans les stories JSON | PNG, SVG | Vercel CDN |
| **Polices** | Google Fonts (CDN externe) + locales (`public/fonts/`) | TTF, OTF | Vercel CDN |
| **Vidéo** | Non supporté | — | — |

- **Pas de CDN dédié** pour l'audio (Supabase Storage fait office de CDN).
- **ffmpeg.wasm** utilisé en frontend pour la compression audio avant upload (nécessite COOP/COEP headers).

---

## 5. Commandes clés

```bash
# Développement
npm run dev          # Lance Vite + serveur API Express (concurrently)
npm run dev:clean    # Tue les process existants + relance

# Build & preview
npm run build        # Build Vite → dist/
npm run preview      # Preview du build en local

# Linting
npm run lint         # ESLint

# Utilitaires
npm run add-sound    # CLI : ajoute un son à la bibliothèque
npm run checkpoint   # Git commit + relance Vite (workflow checkpoint)

# Déploiement
./publish.sh                    # Git add/commit/push → Vercel auto-deploy
./publish.sh "feat: mon message" # Avec message personnalisé
```

---

## 6. Variables d'environnement

### Fichier `.env` (à la racine, non commité)

| Variable | Description | Requis |
|----------|-------------|--------|
| `SUPABASE_URL` | URL du projet Supabase | Oui (API + DB) |
| `SUPABASE_SERVICE_KEY` | Clé de service Supabase (admin) | Oui (API + DB) |
| `ADMIN_PASSWORD` | Mot de passe pour les routes admin | Oui (toutes les API admin) |
| `GITHUB_TOKEN` | Token GitHub (scope `repo`) | Oui (publication stories) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui (publication stories) |
| `GITHUB_REPO` | Nom du repo GitHub | Oui (publication stories) |
| `GITHUB_BRANCH` | Branche cible (défaut : `main`) | Non |
| `RESEND_API_KEY` | Clé API Resend (envoi emails) | Oui (newsletter) |
| `NODE_ENV` | `development` ou `production` | Auto (Vercel) |

### Variables frontend (injectées par Vite)

- Aucune variable d'environnement `VITE_*` n'est actuellement utilisée.
- Les URLs API sont relatives (`/api/*`) → gérées par le proxy Vite (dev) ou Vercel (prod).

---

## 7. Architecture globale (schéma)

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐             │
│  │  HomePage   │  │  StoryReader │  │  AdminPage  │             │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘             │
│         │                 │                  │                   │
│         ▼                 ▼                  ▼                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐             │
│  │ AudioEngine │  │ HapticEngine │  │ VFX System  │             │
│  │ (Howler.js) │  │ (Vibration)  │  │ (CSS+JS)    │             │
│  └─────────────┘  └──────────────┘  └─────────────┘             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   API Routes    │ │  Static Assets  │ │  External APIs  │
│  (/api/*)       │ │  (public/*)     │ │                 │
│                 │ │                 │ │ ┌─────────────┐ │
│ ┌─────────────┐ │ │ ┌─────────────┐ │ │ │   GitHub    │ │
│ │  Vercel     │ │ │ │  Vercel CDN │ │ │ │    API      │ │
│ │  Functions  │ │ │ │  (Edge Net) │ │ │ └─────────────┘ │
│ │  (prod)     │ │ │ └─────────────┘ │ │ ┌─────────────┐ │
│ └─────────────┘ │ │                 │ │ │  Supabase   │ │
│                 │ │ ┌─────────────┐ │ │ │  (DB+Store) │ │
│ ┌─────────────┐ │ │ │  /stories/  │ │ │ └─────────────┘ │
│ │  Express    │ │ │ │  /sounds/   │ │ │ ┌─────────────┐ │
│ │  (:3001)    │ │ │ │  /fonts/    │ │ │ │   Resend    │ │
│ │  (dev)      │ │ │ └─────────────┘ │ │ │  (emails)   │ │
│ └─────────────┘ │ └─────────────────┘ │ └─────────────┘ │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

*Document généré le 2026-06-08 — Version MVP*
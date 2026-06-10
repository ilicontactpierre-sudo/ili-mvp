# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Plugin React officiel |
| **Backend (dev)** | Node.js + Express | 5.2.1 | Serveur API local port 3001 |
| **Backend (prod)** | Vercel Serverless Functions | — | Fonctions dans `/api` |
| **Base de données** | Supabase | v2 | PostgreSQL + Storage (sons) |
| **Déploiement** | Vercel | — | CI/CD auto via Git push |
| **Audio** | Howler.js | 2.2.4 | Moteur de lecture audio |
| **FFmpeg** | @ffmpeg/ffmpeg | 0.12.15 | Compression audio côté client |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                          # Fonctions serverless Vercel (prod)
│   ├── delete-sound.js
│   ├── delete.js
│   ├── get-upload-url.js
│   ├── preview-sound.js
│   ├── publish.js
│   ├── send-newsletter.js
│   ├── subscribe.js
│   ├── toggle-visibility.js
│   ├── upload-audio.js
│   └── upload-sound.js
├── public/                       # Assets statiques (servis tels quels)
│   ├── favicon.svg
│   ├── icons.svg
│   ├── sounds/                   # Sons locaux (dev) + index JSON
│   │   ├── sounds-index.json     # Métadonnées sons (ID, tags, URLs)
│   │   └── *.mp3                 # Fichiers audio individuels
│   ├── stories/                  # Histoires JSON (contenu éditorial)
│   │   ├── index.json            # Liste des histoires (id, title, author)
│   │   └── *.json                # Fichiers d'histoires individuelles
│   ├── fonts/                    # Polices custom (.ttf, .otf)
│   └── textures/                 # Images (ex: paper.png)
├── scripts/                      # Scripts utilitaires
│   ├── dev-api-server.js         # Serveur Express dev (port 3001)
│   ├── addSound.js
│   ├── checkpoint.js
│   ├── convert-stories.js
│   ├── generateSoundsIndex.js
│   ├── index-boom-library.js
│   └── migrate-sounds-to-supabase.js
├── src/
│   ├── components/               # Composants React
│   │   ├── admin/                # Interface d'administration
│   │   │   ├── AnalyticsDashboard.jsx
│   │   │   ├── AudioTimeline.jsx
│   │   │   ├── DraftManager.jsx
│   │   │   ├── FormatToolbar.jsx
│   │   │   ├── GameModePanel.jsx
│   │   │   ├── OrchestrationPanel.jsx
│   │   │   ├── PublishPanel.jsx
│   │   │   ├── SoundBlockPanel.jsx
│   │   │   ├── SoundImporter.jsx
│   │   │   ├── SoundLibraryPicker.jsx
│   │   │   ├── StoryLoader.jsx
│   │   │   ├── StoryPreviewModal.jsx
│   │   │   ├── VfxBlockPanel.jsx
│   │   │   └── WaveformTrimmer.jsx
│   │   ├── EndScreen.jsx
│   │   ├── GameOverlay.jsx
│   │   ├── ReaderSettings.jsx
│   │   ├── StartScreen.jsx
│   │   ├── StoryMenu.jsx
│   │   ├── StoryReader.jsx
│   │   └── VfxOverlay.jsx
│   ├── engine/                   # Moteurs métier
│   │   ├── AudioEngine.js        # Gestion playback, fade, pan, loop
│   │   └── HapticEngine.js       # Vibrations (mobile)
│   ├── pages/                    # Pages routées
│   │   ├── AdminPage.jsx         # Interface admin complète
│   │   ├── AnalyticsDashboard.jsx
│   │   ├── HomePage.jsx          # Liste des histoires
│   │   ├── NewsletterPage.jsx
│   │   └── StoryPage.jsx         # Lecteur d'histoire
│   ├── styles/
│   │   ├── global.css            # Variables CSS, reset, typographie
│   │   └── vfx.css               # Effets visuels (VFX)
│   ├── utils/
│   │   ├── analytics.js          # Tracking événements
│   │   ├── bionicReading.jsx     # Transformation texte bionic
│   │   ├── emojiDict.jsx         # Dictionnaire emoji
│   │   ├── renderMarkdown.jsx    # Rendu Markdown → JSX
│   │   ├── segmentAlgorithm.js   # Découpage texte en segments
│   │   └── soundSearch.js        # Recherche fuzzy (Fuse.js)
│   ├── App.jsx                   # Routes principales
│   ├── main.jsx                  # Point d'entrée React
│   └── index.css                 # Styles de base
├── .gitignore
├── index.html                    # HTML d'entrée (Vite)
├── package.json                  # Dépendances + scripts
├── publish.sh                    # Script de déploiement Git → Vercel
├── vercel.json                   # Config Vercel (rewrites SPA)
└── vite.config.js               # Config Vite (proxy API dev)
```

---

## 3. Flux de données principal

### Lecture d'une histoire
```
1. Homepage (/) → fetch `/stories/index.json` → liste des histoires
2. Clic sur histoire → Route `/lire/:storyId`
3. StoryPage charge `/stories/{storyId}.json` (fichier statique)
4. StoryReader affiche le texte segment par segment
5. AudioEngine gère les sons synchronisés (soundTracks ou audioEvents legacy)
6. Progression sauvegardée dans localStorage
```

### Administration (upload son / publication)
```
1. AdminPage (/admin) → interface complète
2. Upload son → POST /api/upload-audio (dev: localhost:3001, prod: Vercel fn)
   - Auth par ADMIN_PASSWORD
   - Compression via @ffmpeg/ffmpeg (côté client)
   - Upload vers Supabase Storage (bucket: `sounds`)
3. Publication histoire → POST /api/publish
   - Écrit dans GitHub (API) → `public/stories/{slug}.json`
   - Met à jour `public/stories/index.json`
   - Déclenche déploiement Vercel auto
```

### Authentification
- **Pas de système d'auth utilisateur** (pas de login/mot de passe lecteur)
- **Auth admin** : par mot de passe unique (`ADMIN_PASSWORD` dans env)
- **Supabase** : utilisé en service key (admin) côté serveur uniquement

---

## 4. Points sensibles

### Fichiers de configuration critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API dev vers localhost:3001, headers COOP/COEP pour SharedArrayBuffer (FFmpeg) |
| `vercel.json` | Rewrite SPA : toutes les routes → `index.html` |
| `scripts/dev-api-server.js` | Serveur Express dev : preview sons locaux, upload Supabase, publish GitHub |
| `package.json` | Scripts npm, dépendances |

### Différences local vs production

| Aspect | Local (dev) | Production (Vercel) |
|--------|-------------|---------------------|
| **API** | Express port 3001 (`scripts/dev-api-server.js`) | Vercel Serverless Functions (`/api/*.js`) |
| **Sons** | Fichiers locaux + Supabase | Supabase Storage uniquement |
| **Stories** | Fichiers `public/stories/*.json` locaux | Fichiers pushés sur GitHub → Vercel |
| **Proxy** | Vite proxy `/api/*` → `localhost:3001` | Appels directs aux fonctions serverless |

### Assets statiques

- **Servis depuis** : dossier `public/` (Vite copy → `dist/` au build)
- **URLs** : racine du domaine (`/sounds/`, `/stories/`, `/fonts/`, etc.)
- **Cache** : géré par Vercel CDN (cache automatique)

### Gestion des fichiers médias (audio)

| Aspect | Détails |
|--------|---------|
| **Formats supportés** | MP3 (principal), WAV, AIFF, FLAC (lecture) |
| **Compression** | @ffmpeg/ffmpeg côté client → MP3 avant upload |
| **Stockage** | Supabase Storage (bucket `sounds`) |
| **CDN** | URLs publiques Supabase (CDN intégré) |
| **Métadonnées** | `sounds-index.json` : id, label, tags, categories, duration, url |
| **Recherche** | Fuse.js (fuzzy search) côté client |
| **Lecture** | Howler.js avec support trim, loop crossfade, pan/stereo, fade in/out |

---

## 5. Commandes clés

```bash
# Développement
npm run dev              # Vite + Express API (concurrently)
npm run dev:clean        # Kill les process existants + redémarre

# Build & preview
npm run build            # Build Vite → dist/
npm run preview          # Preview build local

# Qualité
npm run lint             # ESLint

# Utilitaires
npm run add-sound        # Script d'ajout de son
npm run checkpoint       # Mode checkpoint (vite --host)
npm run publish          # ./publish.sh (git push → Vercel)
```

---

## 6. Variables d'environnement

### Requises (fichier `.env` local ou Vercel)

| Variable | Usage |
|----------|-------|
| `ADMIN_PASSWORD` | Authentification endpoints admin |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (admin) |
| `GITHUB_TOKEN` | Token API GitHub (publish) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) |

### Optionnelles

| Variable | Usage |
|----------|-------|
| `.env.local` | Override local (non commité) |
| `.env.*.local` | Override par environnement |
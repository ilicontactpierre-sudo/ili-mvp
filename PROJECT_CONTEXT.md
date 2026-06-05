# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | Vite 8.0.12 comme bundler |
| **Routing** | React Router DOM | 7.15.0 | — |
| **Audio** | Howler.js | 2.2.4 | + FFmpeg.wasm 0.12.15 pour traitement client |
| **Backend (dev)** | Express | 5.2.1 | Serveur local sur `:3001` |
| **Backend (prod)** | Vercel Serverless Functions | — | API routes dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | Storage (sons) + PostgreSQL (métadonnées) |
| **Déploiement** | Vercel | — | SPA + serverless functions |
| **CI/CD** | GitHub Actions (via Vercel) | — | Déploiement auto sur push main |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                          # Serverless functions (Vercel + dev)
│   ├── delete-sound.js           # Supprime son (storage + DB)
│   ├── delete.js                 # Supprime story (GitHub)
│   ├── get-upload-url.js         # URL signée Supabase
│   ├── preview-sound.js          # Stream fichier local
│   ├── publish.js                # Push story sur GitHub
│   ├── toggle-visibility.js      # Masque/affiche story
│   ├── upload-audio.js           # Upload vers Supabase storage
│   └── upload-sound.js           # Upsert métadonnées son dans Supabase
│
├── public/                       # Assets statiques (servis par Vercel/Vite)
│   ├── sounds/                   # Sons locaux (dev) + index JSON
│   │   ├── sounds-index.json
│   │   └── *.mp3
│   ├── stories/                  # Stories JSON (publiées via GitHub)
│   │   ├── index.json            # Liste des stories dispo
│   │   └── *.json                # Fichiers story individuels
│   └── textures/                 # Images (papier, etc.)
│
├── scripts/                      # Outils CLI
│   ├── dev-api-server.js         # Serveur Express dev (localhost:3001)
│   ├── addSound.js               # Ajout son CLI
│   ├── checkpoint.js             # Save state
│   ├── convert-stories.js        # Migration format
│   ├── generateSoundsIndex.js    # Index sons auto
│   ├── index-boom-library.js     # Indexation BOOM Library
│   ├── migrate-sounds-to-supabase.js  # Migration sons → Supabase
│   └── update-story-urls.js      # Update URLs dans stories
│
├── src/
│   ├── components/
│   │   ├── admin/                # Interface d'administration
│   │   │   ├── DraftManager.jsx       # Brouillons
│   │   │   ├── FormatToolbar.jsx      # Édition texte
│   │   │   ├── GameModePanel.jsx      # Configuration jeu
│   │   │   ├── OrchestrationPanel.jsx # Orchestration audio/VFX
│   │   │   ├── PublishPanel.jsx       # Publication
│   │   │   ├── SoundBlockPanel.jsx    # Édition blocs son
│   │   │   ├── SoundImporter.jsx      # Import sons
│   │   │   ├── SoundLibraryPicker.jsx # Sélecteur bibliothèque
│   │   │   ├── UnifiedSegmentsTimeline.jsx  # Timeline
│   │   │   ├── VfxBlockPanel.jsx      # Édition VFX
│   │   │   └── WaveformTrimmer.jsx    # Découpe waveform
│   │   ├── EndScreen.jsx
│   │   ├── GameOverlay.jsx
│   │   ├── ReaderSettings.jsx
│   │   ├── StartScreen.jsx
│   │   ├── StoryMenu.jsx
│   │   └── StoryReader.jsx
│   │
│   ├── engine/
│   │   ├── AudioEngine.js        # Moteur audio (Howler.js wrapper)
│   │   └── HapticEngine.js       # Vibrations haptiques
│   │
│   ├── pages/
│   │   ├── AdminPage.jsx         # Interface admin complète
│   │   ├── HomePage.jsx          # Liste des stories
│   │   └── StoryPage.jsx         # Lecteur de story
│   │
│   ├── utils/
│   │   ├── bionicReading.jsx     # Affichage bionic reading
│   │   ├── emojiDict.jsx         # Mapping emoji
│   │   ├── renderMarkdown.jsx    # Rendu markdown
│   │   └── segmentAlgorithm.js   # Découpe texte en segments
│   │
│   ├── styles/
│   │   ├── global.css
│   │   └── vfx.css
│   │
│   ├── App.jsx                   # Routes + sons globaux
│   ├── main.jsx                  # Point d'entrée
│   └── index.css
│
├── index.html                    # HTML d'entrée (Vite)
├── package.json                  # Dépendances + scripts
├── vite.config.js               # Config Vite (proxy API, COOP/COEP)
├── vercel.json                  # Rewrites SPA
└── .gitignore
```

---

## 3. Flux de données principal

### Requête frontend → backend

```
[Frontend React]
       │
       ├── Dev :  /api/* → proxy Vite → http://localhost:3001 (Express)
       │
       └── Prod : /api/* → Vercel Serverless Function (/api/*.js)
                     │
                     ├── Supabase (storage + DB)
                     ├── GitHub API (publication stories)
                     └── Système de fichiers local (dev uniquement)
```

### Authentification

- **Pas d'authentification utilisateur** — l'app est publique
- **Auth admin** : mot de passe via `ADMIN_PASSWORD` (env) sur toutes les routes `/api/*` admin
- Validation : `password === process.env.ADMIN_PASSWORD` dans le body de la requête

### Lecture d'une story

1. `GET /stories/index.json` → liste des stories disponibles
2. `GET /stories/{storyId}.json` → chargement données story (segments, sons, VFX)
3. `AudioEngine` précharge les sons via Howler.js
4. Navigation segment par segment avec événements audio/haptiques synchronisés

---

## 4. Points sensibles

### Fichiers de config critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API vers `:3001`, headers COOP/COEP pour SharedArrayBuffer (FFmpeg.wasm) |
| `vercel.json` | Rewrite SPA : toutes routes → `index.html` |
| `scripts/dev-api-server.js` | Serveur Express dev avec routes API, gestion Supabase + GitHub |

### Différences local vs production

| Aspect | Dev | Prod |
|--------|-----|------|
| API | Express sur `:3001` | Vercel Serverless Functions |
| Sons | Fichiers locaux + Supabase | Supabase uniquement |
| Stories | Fichiers JSON locaux (`public/stories/`) | GitHub (push via API) + CDN Vercel |
| Upload | Direct vers Supabase ou local | Supabase storage uniquement |

### Assets statiques

- **Servis depuis** : `public/` → racine du site
- **Stories** : `public/stories/*.json` (localement) ou GitHub (prod)
- **Sons** : `public/sounds/*.mp3` (localement) ou Supabase Storage (prod)
- **CDN** : Vercel CDN pour tous les assets statiques en prod

### Gestion des fichiers médias (audio)

| Aspect | Détails |
|--------|---------|
| **Formats supportés** | MP3, WAV, AIFF, FLAC (lecture) ; MP3 (upload) |
| **Pipeline upload** | Client → Base64 → API → Supabase Storage (`sounds` bucket) |
| **Compression** | FFmpeg.wasm côté client (optionnel) |
| **Streaming** | Range requests supportés (preview locale) |
| **CDN** | Supabase CDN pour les sons en prod |
| **Trim** | Découpe via sprites Howler.js (trimStart/trimEnd en ms) |

---

## 5. Commandes clés

```bash
# Développement
npm run dev           # Vite + Express API server (concurrently)
npm run dev:clean     # Tue les process existants + redémarre

# Build
npm run build         # Build Vite → dist/
npm run preview       # Preview build de prod

# Linting
npm run lint          # ESLint

# Utilitaires
npm run add-sound     # CLI ajout son
npm run checkpoint    # Save state + démarre serveur
```

---

## 6. Variables d'environnement

```
# Supabase
SUPABASE_URL
SUPABASE_SERVICE_KEY

# Admin
ADMIN_PASSWORD

# GitHub (publication stories)
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
```

---

## 7. Architecture résumé

```
┌─────────────────────────────────────────────────────────────┐
│                        ILi MVP                               │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + Vite 8)                               │
│  ├── Lecteur stories interactives                           │
│  ├── Orchestration audio/VFX temps réel                     │
│  └── Admin panel (création/édition stories)                 │
├─────────────────────────────────────────────────────────────┤
│  Backend                                                    │
│  ├── Dev : Express (:3001)                                  │
│  └── Prod : Vercel Serverless Functions                     │
├─────────────────────────────────────────────────────────────┤
│  Storage                                                    │
│  ├── Stories : GitHub (source) → Vercel CDN                 │
│  ├── Sons : Supabase Storage                                │
│  └── Métadonnées sons : Supabase PostgreSQL                 │
└─────────────────────────────────────────────────────────────┘
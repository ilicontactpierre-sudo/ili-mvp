# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Outil |
|---|---|---|---|
| **Frontend** | React | 19.2.6 | Vite 8.0.12 |
| **Routing** | React Router | 7.15.0 | — |
| **Audio** | Howler.js | 2.2.4 | — |
| **Backend (local)** | Express | 5.2.1 | Node.js |
| **Backend (prod)** | Vercel Serverless Functions | — | — |
| **Base de données** | Supabase (PostgreSQL) | 2.106.1 (SDK) | Storage + DB |
| **Hébergement** | Vercel | — | Git push → deploy auto |
| **CI/CD** | Vercel (GitHub) | — | Déploiement automatique sur push |

---

## 2. Structure des fichiers

```
ili-mvp/
├── index.html                 # Point d'entrée HTML (SPA)
├── package.json               # Dépendances & scripts
├── vite.config.js             # Config Vite (proxy API, COOP/COEP)
├── vercel.json                # Rewrites SPA pour Vercel
├── .env / .env.local          # Variables d'environnement
│
├── api/                       # Fonctions serverless Vercel
│   ├── get-upload-url.js      # URL signée Supabase Storage
│   ├── publish.js             # Publication histoire → GitHub
│   ├── upload-audio.js        # (Obsolète) Upload audio
│   ├── upload-sound.js        # (Obsolète) Upload métadonnées son
│   ├── preview-sound.js       # Prévisualisation son
│   ├── delete.js              # Suppression
│   └── toggle-visibility.js   # Visibilité
│
├── scripts/                   # Scripts utilitaires
│   ├── dev-api-server.js      # Serveur Express local (port 3001)
│   ├── addSound.js            # Ajout son CLI
│   ├── checkpoint.js          # Sauvegarde état
│   ├── convert-stories.js     # Conversion format histoires
│   ├── generateSoundsIndex.js # Index bibliothèque sons
│   ├── migrate-sounds-to-supabase.js
│   └── ...
│
├── public/                    # Assets statiques (servis à la racine)
│   ├── sounds/                # Fichiers audio locaux + sons UI
│   │   ├── sounds-index.json  # Index bibliothèque
│   │   └── .gitkeep
│   ├── stories/               # Fichiers JSON des histoires
│   │   ├── index.json         # Liste des histoires publiées
│   │   ├── *.json             # Histoires individuelles
│   │   └── .gitkeep
│   ├── textures/              # Images (papier, etc.)
│   │   └── paper.png
│   ├── icons.svg              # Sprite SVG icônes
│   └── favicon.svg
│
└── src/
    ├── main.jsx               # Entry point React + BrowserRouter
    ├── App.jsx                # Routes + sons UI globaux
    ├── index.css              # Styles globaux
    │
    ├── pages/
    │   ├── HomePage.jsx       # Liste des histoires
    │   ├── StoryPage.jsx      # Lecteur d'histoire
    │   └── AdminPage.jsx      # Interface d'édition
    │
    ├── components/
    │   ├── StoryReader.jsx    # Moteur de lecture (texte + audio)
    │   ├── StoryMenu.jsx      # Menu de sélection
    │   ├── StartScreen.jsx    # Écran de démarrage
    │   ├── EndScreen.jsx      # Écran de fin
    │   ├── GameOverlay.jsx    # Overlay mode jeu
    │   ├── ReaderSettings.jsx # Paramètres de lecture
    │   │
    │   └── admin/             # Interface d'édition
    │       ├── DraftManager.jsx       # Gestion brouillons
    │       ├── AudioTimeline.jsx      # Timeline audio (6 colonnes)
    │       ├── SoundBlockPanel.jsx    # Édition propriétés son
    │       ├── SoundLibraryPicker.jsx # Sélecteur bibliothèque
    │       ├── SoundImporter.jsx      # Import sons externes
    │       ├── WaveformTrimmer.jsx    # Découpe audio
    │       ├── PublishPanel.jsx       # Publication
    │       ├── GameModePanel.jsx      # Configuration mode jeu
    │       ├── OrchestrationPanel.jsx # Orchestration événements
    │       ├── VfxBlock.jsx           # Effets visuels
    │       ├── FormatToolbar.jsx      # Formatage texte
    │       ├── constants.js           # Couleurs, dimensions, utils
    │       └── README.md              # Documentation détaillée
    │
    ├── engine/
    │   ├── AudioEngine.js     # Moteur audio (Howler.js)
    │   │                      # Gère play/stop/fade/loop/trim
    │   └── HapticEngine.js    # Retour haptique (vibration)
    │
    ├── utils/
    │   ├── segmentAlgorithm.js # Découpage texte en segments
    │   ├── renderMarkdown.jsx  # Rendu markdown → HTML
    │   ├── bionicReading.jsx   # Mode lecture bionique
    │   └── emojiDict.jsx       # Dictionnaire emoji
    │
    ├── styles/
    │   ├── global.css         # Styles globaux
    │   └── vfx.css            # Effets visuels (animations)
    │
    └── assets/
        ├── hero.png
        ├── react.svg
        └── vite.svg
```

---

## 3. Flux de données principal

### Requête frontend → backend

```
┌─────────────┐    ┌──────────────────┐    ┌───────────────────────┐
│  Frontend   │    │  Vite (dev)      │    │  Backend              │
│  (React)    │───▶│  Proxy /api/*    │───▶│                       │
│             │    │  → localhost:3001│    │  Local: Express:3001  │
└─────────────┘    └──────────────────┘    │  Prod:  Vercel Functions│
                                           └───────────────────────┘
```

**Développement :**
- `npm run dev` lance Vite (5173) + Express (3001) en parallèle
- Vite proxy `/api/*` → `localhost:3001`
- Express gère : preview-sound, upload-audio, upload-sound

**Production (Vercel) :**
- Les fichiers `api/*.js` deviennent des serverless functions
- Appelées via `/api/*`
- Supabase Storage pour les uploads audio (URL signée)
- GitHub API pour la publication des histoires

### Authentification

- **Admin** : mot de passe simple (`ADMIN_PASSWORD` / `VITE_ADMIN_PASSWORD`)
- Pas de système d'utilisateurs multiples
- Vérification côté serveur sur chaque requête protégée

---

## 4. Points sensibles

### Fichiers de configuration critiques

| Fichier | Rôle |
|---|---|
| `vite.config.js` | Proxy API, headers COOP/COEP (requis pour SharedArrayBuffer/FFmpeg) |
| `vercel.json` | Rewrite SPA (`/(.*)` → `/index.html`) |
| `scripts/dev-api-server.js` | Serveur API local, gestion uploads Supabase |
| `.env` | Variables critiques (Supabase, GitHub, admin) |

### Différences local vs production

| Aspect | Local | Production |
|---|---|---|
| **API** | Express sur port 3001 | Vercel Serverless Functions |
| **Upload audio** | Express → Supabase Storage | Client → URL signée → Supabase Storage |
| **Stories** | Fichiers `public/stories/*.json` | GitHub (publié via `api/publish.js`) |
| **Sons** | `public/sounds/` + bibliothèque locale | Supabase Storage + bibliothèque locale montée via `vite.config.js` |

### Assets statiques

- **Dossier** : `public/` → servi à la racine `/`
- **Sons UI** : `public/sounds/` (clic, whoosh, etc.)
- **Histoires** : `public/stories/` (fichiers JSON)
- **Textures** : `public/textures/` (papier, etc.)
- **Icônes** : `public/icons.svg` (sprite SVG)

### Gestion des fichiers médias

| Type | Pipeline | Formats | Stockage |
|---|---|---|---|
| **Audio (sons bibliothèque)** | Import local → compression MP3 (lamejs) → upload Supabase | MP3, WAV, AIFF, FLAC → MP3 | Supabase Storage (`sounds` bucket) |
| **Audio (UI)** | Fichiers statiques dans `public/sounds/` | MP3 | GitHub + Vercel CDN |
| **Histoires** | Édition admin → publication → GitHub | JSON | GitHub (`public/stories/`) |
| **Images/Textures** | Statiques dans `public/` | PNG, SVG | GitHub + Vercel CDN |

**Pas de CDN dédié** — Vercel sert les assets statiques depuis son edge network.

---

## 5. Commandes clés

```bash
# Développement
npm run dev          # Vite (5173) + Express API (3001)

# Build
npm run build        # Build Vite → dist/
npm run preview      # Prévisualisation build local

# Qualité
npm run lint         # ESLint

# Utilitaires
npm run add-sound    # Ajout son via CLI
npm run checkpoint   # Sauvegarde état + démarrage
npm run publish      # Publication (bash publish.sh)
```

---

## 6. Variables d'environnement

### Client (préfixe `VITE_` — exposées au frontend)
- `VITE_ADMIN_PASSWORD`
- `VITE_GEMINI_API_KEY`

### Serveur (NON exposées)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `ADMIN_PASSWORD`

> **À configurer dans** : Vercel Dashboard → Settings → Environment Variables
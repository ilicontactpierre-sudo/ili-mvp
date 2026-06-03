# PROJECT_CONTEXT — ILi MVP

Application de lecture interactive de textes littéraires avec synchronisation audio.

---

## 1. Stack technique

| Couche | Technologie | Version / Détail |
|--------|-------------|------------------|
| **Frontend** | React | 19.2.6 |
| | Vite | 8.0.12 (bundler) |
| | React Router | 7.15.0 (routing) |
| **Backend (dev local)** | Express | 5.2.1 — serveur API local sur `localhost:3001` |
| **Backend (prod)** | Vercel Serverless Functions | Node.js — endpoints dans `/api/*.js` |
| **Base de données / Storage** | Supabase | Storage bucket `sounds` + table `sounds` |
| **Audio** | Howler.js | 2.2.4 (lecture), lamejs (encodage MP3), @ffmpeg/ffmpeg (traitement) |
| **Déploiement** | Vercel | SPA + serverless functions |
| **CI/CD** | GitHub → Vercel (auto-deploy on push) |

---

## 2. Structure des fichiers

```
ili-mvp/
├── index.html              # Point d'entrée HTML (SPA)
├── package.json            # Dépendances & scripts
├── vite.config.js          # Config Vite (proxy API, COOP/COEP)
├── vercel.json             # Rewrites SPA → index.html
├── .gitignore              # Exclut .env, node_modules, dist
│
├── src/
│   ├── main.jsx            # Entry point React
│   ├── App.jsx             # Routes : /, /lire/:storyId, /admin
│   ├── index.css           # Styles globaux
│   │
│   ├── pages/
│   │   ├── HomePage.jsx    # Liste des histoires
│   │   ├── StoryPage.jsx   # Lecteur interactif
│   │   └── AdminPage.jsx   # Interface d'administration
│   │
│   ├── components/
│   │   ├── StoryReader.jsx # Cœur du lecteur (texte + audio + events)
│   │   ├── GameOverlay.jsx # Overlay mode jeu
│   │   ├── StartScreen.jsx # Écran de départ
│   │   ├── EndScreen.jsx   # Écran de fin
│   │   ├── StoryMenu.jsx   # Menu de navigation
│   │   ├── ReaderSettings.jsx # Paramètres de lecture
│   │   │
│   │   └── admin/          # Outils d'édition
│   │       ├── SoundBlockPanel.jsx
│   │       ├── VfxBlockPanel.jsx
│   │       ├── PublishPanel.jsx
│   │       ├── SoundImporter.jsx
│   │       ├── SoundLibraryPicker.jsx
│   │       ├── WaveformTrimmer.jsx
│   │       ├── UnifiedSegmentsTimeline.jsx
│   │       └── ...
│   │
│   ├── engine/
│   │   ├── AudioEngine.js  # Gestion audio centralisée (Howler)
│   │   └── HapticEngine.js # Retours haptiques
│   │
│   ├── utils/
│   │   ├── segmentAlgorithm.js  # Découpe automatique du texte
│   │   ├── renderMarkdown.jsx   # Rendu markdown inline
│   │   ├── bionicReading.jsx    # Mode lecture bionique
│   │   └── emojiDict.jsx        # Mapping emojis
│   │
│   └── styles/
│       ├── global.css
│       └── vfx.css
│
├── api/                    # Serverless functions (Vercel)
│   ├── upload-audio.js     # Upload audio → Supabase Storage
│   ├── upload-sound.js     # Enregistrement métadonnées son → Supabase DB
│   ├── preview-sound.js    # Streaming audio local (dev)
│   ├── publish.js          # Publication histoire
│   ├── delete.js           # Suppression
│   └── toggle-visibility.js # Visibilité publique/privée
│
├── public/
│   ├── sounds/             # Sons UI (clics, whoosh) + sons embarqués
│   │   ├── sounds-index.json
│   │   └── *.mp3
│   │
│   └── stories/            # Fichiers histoires (JSON)
│       ├── index.json      # Catalogue des histoires
│       └── *.json          # Données par histoire
│
└── scripts/
    ├── dev-api-server.js   # Serveur Express dev (localhost:3001)
    ├── addSound.js         # CLI ajout son
    ├── checkpoint.js       # Script de recovery
    └── ...
```

---

## 3. Flux de données principal

### Requête frontend → backend

**En développement :**
```
Frontend (Vite :5173)
  → proxy vite.config.js (/api/* → localhost:3001)
    → Serveur Express (scripts/dev-api-server.js)
      → Supabase (storage + DB)
```

**En production :**
```
Frontend (Vercel CDN)
  → Serverless Function (/api/*.js sur Vercel)
    → Supabase (storage + DB)
```

### Format d'une histoire

Fichier JSON dans `public/stories/{id}.json` :
- `id`, `title`, `author`, `published`
- `sounds[]` : sons utilisés (id, url, loop)
- `segments[]` : segments de texte avec `audioEvents` (fadeIn, fadeOut, play, stop)

### Authentification

- **Admin** : mot de passe via `ADMIN_PASSWORD` (variable d'environnement)
- Pas d'authentification utilisateur pour la lecture (contenu public)

---

## 4. Points sensibles connus

### Fichiers de configuration critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API vers localhost:3001, headers COOP/COEP (requis pour SharedArrayBuffer/FFmpeg WASM) |
| `vercel.json` | Rewrite toutes les routes vers index.html (SPA) |
| `scripts/dev-api-server.js` | Serveur API dev avec gestion range requests pour streaming audio |

### Différences local vs production

| Aspect | Local | Production |
|--------|-------|------------|
| API | Express sur localhost:3001 | Vercel Serverless Functions |
| Stories | Fichiers JSON dans `public/stories/` | Idem (servis par CDN Vercel) |
| Sons | `public/sounds/` + chemins locaux via preview-sound | URLs Cloudinary ou Supabase Storage |
| Upload | POST → Express → Supabase | POST → Vercel Function → Supabase |

### Assets statiques

- **Servis depuis** : `public/` → racine du site
- **Sons UI** : `public/sounds/` (clics, whoosh) — chargés en dur dans App.jsx
- **Stories** : `public/stories/` — chargés via fetch HTTP
- **Textures** : `public/textures/` (paper.png pour effets visuels)

### Gestion des fichiers médias (audio)

| Étape | Détail |
|-------|--------|
| **Formats supportés** | MP3, WAV, AIFF, FLAC (lecture) ; MP3 (upload) |
| **Upload** | Base64 → Express/Vercel → Supabase Storage bucket `sounds` |
| **Encodage** | lamejs pour conversion MP3 côté client (si besoin) |
| **Streaming** | Range requests (Accept-Ranges: bytes) pour lecture progressive |
| **CDN** | Cloudinary (URLs dans les stories) + Supabase Storage CDN |
| **FFmpeg** | @ffmpeg/ffmpeg disponible côté client (WASM) pour traitement avancé |

---

## 5. Commandes clés

```bash
npm run dev        # Lance Vite + serveur API Express (concurrently)
npm run build      # Build de production (Vite)
npm run preview    # Prévisualisation build local
npm run lint       # ESLint
npm run add-sound  # CLI ajout d'un son
npm run checkpoint # Script de recovery
npm run publish    # Déploiement (bash publish.sh)
```

---

## 6. Variables d'environnement

| Variable | Usage |
|----------|-------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé de service (admin) Supabase |
| `SUPABASE_ANON_KEY` | Clé anon (côté client si besoin) |
| `ADMIN_PASSWORD` | Mot de passe pour les endpoints admin |

> **Fichiers .env** : `.env`, `.env.local`, `.env.*.local` sont ignorés par git.
# PROJECT_CONTEXT — ILi MVP

Application web de lecture immersive d'histoires avec dimensionnement audio, effets visuels et haptiques.

---

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Build + dev server |
| **Backend (dev)** | Node.js + Express | 5.2.1 | Serveur API local (port 3001) |
| **Backend (prod)** | Vercel Serverless Functions | — | Fonctions dans `api/` |
| **Base de données** | Supabase | JS SDK v2.106.1 | Storage (sons) + PostgreSQL |
| **Audio** | Howler.js | 2.2.4 | Moteur audio principal |
| **Encodage** | FFmpeg.wasm | 0.12.15 | Compression audio côté client |
| **Déploiement** | Vercel | — | SPA + rewrites vers index.html |
| **CI/CD** | GitHub Actions | — | Via `publish.sh` (push Git) |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless Vercel (prod)
│   ├── delete-sound.js
│   ├── delete.js
│   ├── get-upload-url.js
│   ├── preview-sound.js
│   ├── publish.js
│   ├── toggle-visibility.js
│   ├── upload-audio.js
│   └── upload-sound.js
├── public/                     # Assets statiques (servis tels quels)
│   ├── favicon.svg
│   ├── icons.svg
│   ├── fonts/                  # Polices custom
│   │   ├── NamoraDayanaDemo-0vqZd.ttf
│   │   └── Oanteh-rvDvA.otf
│   ├── sounds/                 # Sons UI (clic, whoosh)
│   │   ├── sounds-index.json
│   │   └── *.mp3
│   └── stories/                # Fichiers JSON des histoires
│       ├── index.json          # Catalogue (id, title, author)
│       └── *.json              # Données complètes des histoires
├── scripts/                    # Scripts utilitaires
│   ├── dev-api-server.js       # Serveur Express dev (port 3001)
│   ├── addSound.js
│   ├── checkpoint.js
│   ├── convert-stories.js
│   ├── generateSoundsIndex.js
│   ├── index-boom-library.js
│   ├── migrate-sounds-to-supabase.js
│   └── update-story-urls.js
├── src/
│   ├── components/
│   │   ├── admin/              # Interface d'édition
│   │   │   ├── AudioTimeline.jsx
│   │   │   ├── DraftManager.jsx
│   │   │   ├── FormatToolbar.jsx
│   │   │   ├── GameModePanel.jsx
│   │   │   ├── OrchestrationPanel.jsx
│   │   │   ├── PublishPanel.jsx
│   │   │   ├── SoundBlock.jsx
│   │   │   ├── SoundImporter.jsx
│   │   │   ├── SoundLibraryPicker.jsx
│   │   │   ├── UnifiedSegmentsTimeline.jsx
│   │   │   ├── VfxBlock.jsx
│   │   │   └── WaveformTrimmer.jsx
│   │   ├── EndScreen.jsx
│   │   ├── GameOverlay.jsx
│   │   ├── ReaderSettings.jsx  # Options DYS, emoji, thème
│   │   ├── StartScreen.jsx
│   │   ├── StoryMenu.jsx
│   │   └── StoryReader.jsx     # Composant de lecture principal
│   ├── engine/
│   │   ├── AudioEngine.js      # Moteur audio (Howler wrapper)
│   │   └── HapticEngine.js     # Vibrations haptiques
│   ├── pages/
│   │   ├── AdminPage.jsx       # Éditeur d'histoires
│   │   ├── HomePage.jsx        # Liste des histoires
│   │   └── StoryPage.jsx       # Page de lecture
│   ├── styles/
│   │   ├── global.css
│   │   └── vfx.css             # Effets visuels (typewriter, flash, etc.)
│   ├── utils/
│   │   ├── bionicReading.jsx
│   │   ├── emojiDict.jsx
│   │   ├── renderMarkdown.jsx
│   │   └── segmentAlgorithm.js # Algo de découpe des segments
│   ├── App.jsx                 # Routing (React Router)
│   ├── main.jsx               # Point d'entrée
│   └── index.css
├── index.html                  # HTML d'entrée (SPA)
├── package.json
├── vite.config.js             # Config Vite (proxy API → :3001)
├── vercel.json                # Rewrites SPA
└── publish.sh                 # Script de publication
```

---

## 3. Flux de données principal

### Lecture d'une histoire
```
1. HomePage → liste depuis /stories/index.json
2. Utilisateur clique → navigation vers /lire/:storyId
3. StoryPage charge /stories/:storyId.json
4. StoryReader affiche les segments un par un
5. AudioEngine joue les sons synchronisés (Howler.js)
6. HapticEngine active les vibrations (si supporté)
```

### Édition & Publication
```
1. AdminPage → éditeur complet (texte, audio, VFX)
2. Sauvegarde locale → brouillon dans localStorage
3. Publication → POST /api/publish
   - Dev : Express local (:3001) → écrit sur GitHub API
   - Prod : Vercel function api/publish.js → GitHub API
4. Le fichier story JSON est pushé sur le repo GitHub
5. Vercel redéploie automatiquement
```

### Authentification
- **Pas de système d'auth utilisateur** — l'app est publique
- **Auth admin** : mot de passe via `ADMIN_PASSWORD` (variable d'environnement)
  - Requis pour toutes les routes `/api/*` d'écriture
  - Vérifié côté serveur (Express ou Vercel function)

---

## 4. Points sensibles

### Fichiers de configuration critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy `/api/*` → `localhost:3001` en dev. Headers COOP/COEP pour SharedArrayBuffer (FFmpeg.wasm) |
| `vercel.json` | Rewrite `/(.*)` → `/index.html` (SPA routing) |
| `package.json` | Scripts `dev` (lance Vite + Express concurrently) |

### Différences local vs production

| Aspect | Local | Production |
|--------|-------|------------|
| API | Express sur port 3001 | Vercel Serverless Functions (`api/`) |
| Stories | Fichiers `public/stories/*.json` | Idem (servis par Vercel CDN) |
| Sons | `public/sounds/` + Supabase | Supabase storage (CDN) |
| Upload | Direct vers Supabase via serveur local | Direct vers Supabase (signed URLs) |

### Assets statiques

- **Servis depuis** : `public/` (Vite copy) + `public/sounds/`, `public/stories/`
- **Stories** : JSON statiques chargés en `fetch()` direct
- **Sons UI** : `Audio` HTML5 natif pour les clics (`/sounds/Clic ILi.mp3`)
- **Polices** : dans `public/fonts/`, chargées via `@font-face`

### Gestion des fichiers médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio (histoires)** | Upload → Supabase storage → URL publique | MP3, WAV, AAC, FLAC | Supabase CDN |
| **Audio (UI)** | Fichiers statiques dans `public/sounds/` | MP3 | Git + Vercel CDN |
| **Images/Textures** | Statiques dans `public/textures/` | PNG | Git + Vercel CDN |
| **Compression** | FFmpeg.wasm côté client avant upload | → MP3 128kbps | — |

---

## 5. Commandes clés

```bash
# Développement (Vite + API Express)
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview

# Lint
npm run lint

# Publication (push Git + déclenche Vercel)
npm run publish   # ou bash publish.sh
```

---

## 6. Variables d'environnement

```
# Supabase
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_ANON_KEY

# Admin
ADMIN_PASSWORD

# GitHub (publication)
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
```

---

## 7. Architecture audio (détails)

### AudioEngine (`src/engine/AudioEngine.js`)
- Wrapper autour de **Howler.js**
- Gère : play, stop, fadeIn, fadeOut, volume, loop avec crossfade
- **Trim** : découpe audio via sprites Howler
- **Pan/spatialisation** : modes static, sweep-lr, sweep-rl, oscillate, converge, diverge
- **Loop crossfade** : chevauchement de 2 instances pour transitions fluides

### Format des histoires (JSON)
```json
{
  "id": "story-slug",
  "title": "Titre",
  "author": "Auteur",
  "published": true,
  "segments": [
    {
      "id": "seg_1",
      "text": "Texte du segment",
      "breakAt": 100,        // position de césure optionnelle
      "isLeader": false,     // début de chapitre
      "isChapter": false,    // est un titre de chapitre
      "audioEvents": []      // événements audio temps-réel
    }
  ],
  "soundTracks": [           // pistes audio continues
    {
      "id": "track_1",
      "soundId": "son-unique-id",
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_5",
      "volume": 0.5,
      "loop": true,
      "fadeIn": 1000,        // ms
      "fadeOut": 2000,       // ms
      "delay": 0,            // ms
      "trimStart": 0,        // ms
      "trimEnd": null,       // ms
      "pan": 0,              // -1 à +1
      "panMode": "static"    // static, sweep-lr, oscillate...
    }
  ],
  "vfxTracks": [            // effets visuels
    {
      "type": "typewriter",  // typewriter, static, erased, flash
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_3",
      "mode": "normal"       // mode spécifique au type
    }
  ]
}
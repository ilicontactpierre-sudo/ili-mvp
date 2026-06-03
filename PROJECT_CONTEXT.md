# PROJECT_CONTEXT — ILi MVP

Application web de lecture immersive d'histoires avec accompagnement sonore et effets visuels.

---

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Plugin React (Oxc) |
| **Backend (dev)** | Express | 5.2.1 | Serveur API local (port 3001) |
| **Backend (prod)** | Vercel Serverless | — | Fonctions dans `/api/*.js` |
| **Base de données** | Supabase | v2 | Storage (sons) + auth optionnelle |
| **Audio** | Howler.js | 2.2.4 | Playback + sprites (trim) |
| **Routing** | React Router | 7.15.0 | Client-side routing |
| **Déploiement** | Vercel | — | CI/CD automatique sur push Git |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                          # Fonctions serverless Vercel
│   ├── publish.js               # Publication stories (→ GitHub API)
│   ├── upload-audio.js          # Upload audio vers Supabase
│   ├── upload-sound.js          # Mise à jour sounds-index (GitHub)
│   ├── preview-sound.js         # Streaming audio local
│   ├── toggle-visibility.js     # Visibilité stories
│   └── delete.js                # Suppression stories
├── public/
│   ├── sounds/                  # Assets audio (MP3)
│   │   ├── sounds-index.json    # Index bibliothèque sonore
│   │   └── *.mp3                # Fichiers audio
│   ├── stories/                 # Fichiers JSON des histoires
│   │   ├── index.json           # Liste des histoires publiées
│   │   └── *.json               # Données histoires (segments + audio)
│   ├── textures/                # Textures (paper.png)
│   ├── favicon.svg
│   └── icons.svg
├── scripts/
│   ├── dev-api-server.js        # Serveur Express dev (port 3001)
│   ├── checkpoint.js            # Script de checkpoint
│   ├── convert-stories.js       # Conversion format stories
│   ├── generateSoundsIndex.js   # Génération index sons
│   └── migrate-sounds-to-supabase.js
├── src/
│   ├── components/
│   │   ├── admin/               # Interface d'édition
│   │   │   ├── PublishPanel.jsx     # Publication
│   │   │   ├── UnifiedSegmentsTimeline.jsx  # Timeline audio
│   │   │   ├── SoundBlockPanel.jsx    # Édition sons
│   │   │   ├── VfxBlockPanel.jsx      # Effets visuels
│   │   │   ├── GameModePanel.jsx      # Gamification
│   │   │   ├── DraftManager.jsx       # Brouillons (localStorage)
│   │   │   └── StoryLoader.jsx        # Chargement histoires
│   │   ├── StoryReader.jsx        # Composant de lecture
│   │   ├── ReaderSettings.jsx     # Paramètres (thème, police, DYS)
│   │   ├── GameOverlay.jsx        # Overlay gamification
│   │   ├── StartScreen.jsx        # Écran de démarrage
│   │   └── EndScreen.jsx          # Écran de fin
│   ├── engine/
│   │   └── AudioEngine.js         # Moteur audio (play/fade/stop)
│   ├── pages/
│   │   ├── HomePage.jsx           # Accueil (liste stories)
│   │   ├── StoryPage.jsx          # Lecteur d'histoire
│   │   └── AdminPage.jsx          # Éditeur (auth par mot de passe)
│   ├── utils/
│   │   ├── segmentAlgorithm.js    # Découpage texte en segments
│   │   ├── renderMarkdown.jsx     # Rendu markdown
│   │   ├── bionicReading.jsx      # Mode lecture bionique
│   │   └── emojiDict.jsx          # Mapping emojis
│   ├── styles/
│   │   ├── global.css             # Variables CSS + thèmes
│   │   └── vfx.css                # Effets visuels
│   ├── App.jsx                    # Routes + sons UI
│   └── main.jsx                   # Point d'entrée
├── .env                           # Variables d'environnement
├── index.html                     # HTML d'entrée Vite
├── package.json                   # Dépendances + scripts
├── vite.config.js                 # Config Vite (proxy API)
├── vercel.json                    # Rewrites SPA
└── publish.sh                     # Script de déploiement
```

---

## 3. Flux de données principal

### Lecture d'une histoire
```
1. HomePage → fetch(`/stories/index.json`) → liste stories
2. Utilisateur clique → navigation vers `/lire/:storyId`
3. StoryPage → fetch(`/stories/${storyId}.json`) → données histoire
4. StoryReader affiche segment courant
5. AudioEngine exécute audioEvents du segment (play/fadeIn/fadeOut/stop)
6. Progression sauvegardée dans localStorage
```

### Création & Publication (Admin)
```
1. AdminPage (auth par mot de passe VITE_ADMIN_PASSWORD)
2. Édition segments + soundTracks (timeline) + vfxTracks
3. PublishPanel convertit soundTracks → audioEvents
4. Publication via POST `/api/publish` (Vercel) ou manuel
5. API publish.js → GitHub API → commit `public/stories/{slug}.json` + `index.json`
6. Vercel redéploie automatiquement
```

### Gestion audio
- **Dev** : `dev-api-server.js` (port 3001) sert les fichiers locaux + proxy Vite `/api/preview-sound`
- **Prod** : Sons hébergés sur Supabase Storage ou URLs directes (Cloudinary)
- **Howler.js** gère le playback avec sprites pour le trim (trimStart/trimEnd)

---

## 4. Points sensibles

### Fichiers de configuration critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy `/api/preview-sound` → `localhost:3001`, FS allow paths |
| `vercel.json` | Rewrite SPA : `/(.*)` → `/index.html` |
| `scripts/dev-api-server.js` | Serveur Express dev : preview audio, upload Supabase, update GitHub |

### Différences local vs production

| Aspect | Local | Production |
|--------|-------|------------|
| API | Express port 3001 | Vercel Serverless (`/api/*.js`) |
| Sons | Fichiers locaux (`/sounds/`) | Supabase Storage / CDN |
| Publication | Export JSON manuel | API `/api/publish` → GitHub |
| Proxy | Vite proxy vers 3001 | N/A |

### Assets statiques
- **Sons** : `/public/sounds/` (dev) → Supabase Storage (prod)
- **Histoires** : `/public/stories/*.json` (fichiers statiques)
- **Textures** : `/public/textures/paper.png`
- **Icônes** : `/public/icons.svg` (sprite SVG inline)

### Gestion des fichiers médias
- **Formats audio supportés** : MP3, WAV, AIFF, FLAC
- **Pipeline** : Upload → Supabase Storage → URL publique
- **CDN** : Supabase CDN ou Cloudinary (selon config)
- **Compression** : lamejs disponible pour conversion MP3
- **Streaming** : Range requests supportés (HTTP 206)

---

## 5. Commandes clés

```bash
# Développement (lance Vite + serveur API Express)
npm run dev

# Build de production
npm run build

# Preview build local
npm run preview

# Lint
npm run lint

# Utilitaires
npm run add-sound          # Ajouter un son à la bibliothèque
npm run checkpoint         # Mode checkpoint (dev spécifique)
npm run publish            # Script publish.sh (git + push → Vercel)
```

---

## 6. Variables d'environnement

### Client (préfixe `VITE_` — exposées au frontend)
- `VITE_ADMIN_PASSWORD` — Mot de passe admin
- `VITE_SUPABASE_URL` — URL Supabase
- `VITE_SUPABASE_ANON_KEY` — Clé anon Supabase
- `VITE_GEMINI_API_KEY` — Clé API Gemini (IA)

### Serveur (non exposées)
- `ADMIN_PASSWORD` — Mot de passe admin (côté serveur)
- `SUPABASE_URL` — URL Supabase
- `SUPABASE_SERVICE_KEY` — Clé de service Supabase
- `GITHUB_TOKEN` — Personal Access Token GitHub
- `GITHUB_OWNER` — Propriétaire du repo GitHub
- `GITHUB_REPO` — Nom du repo GitHub
- `GITHUB_BRANCH` — Branche de déploiement (défaut : `main`)

---

## 7. Architecture données

### Format d'une histoire (JSON)
```json
{
  "id": "slug-histoire",
  "title": "Titre",
  "author": "Auteur",
  "published": true,
  "bookUrl": "https://...",
  "formUrl": "https://...",
  "sounds": [
    { "id": "son_1", "url": "https://...", "loop": true }
  ],
  "segments": [
    {
      "id": "seg_1",
      "text": "Texte du segment",
      "isChapter": false,
      "isLeader": false,
      "gameMode": null,
      "audioEvents": [
        { "action": "fadeIn", "soundId": "son_1", "volume": 0.5, "duration": 2000, "delay": 0 }
      ]
    }
  ],
  "soundTracks": [],
  "vfxTracks": []
}
```

### AudioEvents (exécutés par AudioEngine)
| Action | Description |
|--------|-------------|
| `play` | Joue le son (volume, loop, trimStart, trimEnd) |
| `stop` | Arrête le son |
| `fadeIn` | Joue + fade de 0 à volume sur duration (ms) |
| `fadeOut` | Fade de volume à 0 sur duration, puis stop |
| `volume` | Change le volume (avec fade optionnel) |
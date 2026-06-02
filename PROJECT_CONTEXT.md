# ILi MVP — Contexte du Projet

Application web de lecture interactive d'histoires avec orchestration audio et effets.

---

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | Avec React Router DOM 7.x |
| **Bundler** | Vite | 8.0.12 | Plugin @vitejs/plugin-react |
| **Backend (dev)** | Express | 5.2.1 | Serveur API local (port 3001) |
| **Backend (prod)** | Vercel Serverless | — | Fonctions dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | Storage pour fichiers audio |
| **Dépôt** | GitHub | — | API utilisée pour publier stories/sons |
| **Déploiement** | Vercel | — | CI/CD automatique au push |
| **Audio** | Howler.js | 2.2.4 | Lecture et gestion des sons |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless Vercel
│   ├── publish.js              # Publie une histoire sur GitHub
│   ├── upload-audio.js         # Upload audio vers Supabase
│   ├── upload-sound.js         # Met à jour sounds-index.json
│   ├── delete.js               # Supprime une histoire
│   ├── toggle-visibility.js    # Change visibilité d'une histoire
│   └── preview-sound.js        # Streaming audio local
├── public/
│   ├── sounds/
│   │   ├── sounds-index.json   # Index de la bibliothèque sonore
│   │   └── *.mp3               # Sons embarqués (whoosh, clic, etc.)
│   ├── stories/
│   │   ├── index.json          # Liste des histoires publiées
│   │   └── *.json              # Fichiers d'histoires
│   ├── textures/               # Assets (papier, etc.)
│   ├── favicon.svg
│   └── icons.svg
├── scripts/
│   ├── dev-api-server.js       # Serveur Express dev (port 3001)
│   ├── addSound.js             # CLI ajout son
│   ├── checkpoint.js           # Sauvegarde état
│   ├── generateSoundsIndex.js  # Génère sounds-index.json
│   └── migrate-sounds-to-supabase.js
├── src/
│   ├── components/
│   │   ├── admin/              # Interface d'édition
│   │   │   ├── SoundLibraryPicker.jsx
│   │   │   ├── SoundBlockPanel.jsx
│   │   │   ├── OrchestrationPanel.jsx
│   │   │   ├── PublishPanel.jsx
│   │   │   └── ...
│   │   ├── StoryReader.jsx     # Lecteur d'histoires
│   │   ├── GameOverlay.jsx     # Overlay jeu
│   │   └── EndScreen.jsx
│   ├── engine/
│   │   ├── AudioEngine.js      # Moteur audio (Howler)
│   │   └── HapticEngine.js     # Vibrations
│   ├── pages/
│   │   ├── HomePage.jsx        # Liste des histoires
│   │   ├── StoryPage.jsx       # Lecteur
│   │   └── AdminPage.jsx       # Éditeur
│   ├── utils/
│   │   ├── segmentAlgorithm.js # Découpage texte
│   │   ├── bionicReading.jsx
│   │   └── renderMarkdown.jsx
│   ├── App.jsx                 # Routes
│   ├── main.jsx               # Point d'entrée
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── .env                        # Variables d'environnement (non commité)
```

---

## 3. Flux de Données Principal

### Lecture d'une histoire
```
HomePage → StoryPage → StoryReader
    ↓
Charge /stories/index.json    → Liste des histoires
Charge /stories/{id}.json     → Contenu + segments + audioEvents
    ↓
AudioEngine exécute les audioEvents (play/fadeIn/fadeOut/stop)
Howler.js lit les sons depuis Supabase ou /sounds/
```

### Publication (Admin → Production)
```
AdminPage → PublishPanel
    ↓
POST /api/publish (Vercel function)
    ↓
Valide ADMIN_PASSWORD
    ↓
GitHub API → Écrit public/stories/{slug}.json
GitHub API → Met à jour public/stories/index.json
    ↓
Vercel redéploie automatiquement
```

### Upload d'un son (Admin → Supabase)
```
SoundLibraryPicker → Upload button
    ↓
POST /api/upload-audio (multipart) → Supabase Storage bucket "sounds"
    ↓
POST /api/upload-sound (JSON) → Met à jour sounds-index.json via GitHub API
```

### Auth
- **Pas de système d'authentification utilisateur.**
- **Admin** : mot de passe unique (`ADMIN_PASSWORD`) stocké dans `.env` et `sessionStorage`.
- Les fonctions API vérifient le mot de passe avant toute écriture.

---

## 4. Points Sensibles

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy `/api/preview-sound` → `localhost:3001` en dev |
| `vercel.json` | Rewrite toutes les routes vers `/index.html` (SPA) |
| `scripts/dev-api-server.js` | Serveur Express dev avec routes audio/upload |

### Différences Local vs Production

| Aspect | Local (dev) | Production (Vercel) |
|--------|-------------|---------------------|
| API | Express sur port 3001 | Vercel serverless functions |
| Preview audio | Fichiers locaux via `/api/preview-sound` | URLs Supabase directes |
| Publication | Export JSON manuel | Publication automatique via GitHub API |
| Sons | `localPath` + preview server | URLs Supabase (`sound.url`) |

### Assets Statiques
- **Servis depuis** : `/public/` → racine du site
- **Sons embarqués** : `/public/sounds/` (clic, whoosh, etc.)
- **Textures** : `/public/textures/` (papier)
- **Histoires** : `/public/stories/*.json` (fichiers statiques)

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio (sons)** | Upload manuel → Supabase Storage | MP3, WAV, AIFF, FLAC | Bucket `sounds` sur Supabase |
| **Audio (embarqué)** | Commit dans `/public/sounds/` | MP3 | GitHub → Vercel |
| **Images/Textures** | Commit dans `/public/textures/` | PNG, SVG | GitHub → Vercel |
| **Stories** | Publication via API → GitHub | JSON | GitHub → Vercel |

- **Pas de CDN dédié** : Vercel sert les assets via son edge network.
- **Supabase** : utilisé comme CDN pour les fichiers audio uploadés (bucket public).

---

## 5. Commandes Clés

```bash
npm run dev        # Vite + serveur API Express (concurrently)
npm run build      # Build de production
npm run preview    # Prévisualisation build
npm run lint       # ESLint
npm run add-sound  # CLI ajout d'un son
npm run checkpoint # Sauvegarde + redémarre dev server
npm run publish    # Script bash publish.sh
```

---

## 6. Variables d'Environnement

| Variable | Usage | Requis |
|----------|-------|--------|
| `ADMIN_PASSWORD` | Authentification admin | Oui |
| `SUPABASE_URL` | URL du projet Supabase | Oui (upload audio) |
| `SUPABASE_SERVICE_KEY` | Clé de service Supabase | Oui (upload audio) |
| `GITHUB_TOKEN` | Token API GitHub | Oui (publication) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui |
| `GITHUB_REPO` | Nom du repo GitHub | Oui |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Non |
| `VITE_ADMIN_PASSWORD` | Fallback mot de passe (frontend) | Non |

---

## 7. Architecture Audio

```
AudioEngine (src/engine/AudioEngine.js)
    ↓
Map<soundId, Howl> (howlMap)
    ↓
executeEvent({ action, soundId, volume, delay, loop, trimStart, trimEnd })
    ├── play      → howl.play(sprite)
    ├── stop      → howl.stop()
    ├── fadeIn    → howl.fade(0, volume, duration)
    ├── fadeOut   → howl.fade(volume, 0, duration) → stop
    └── volume    → howl.volume() ou howl.fade()
```

- **Trim** : implémenté via sprites Howler (`trimStart`, `trimEnd` en ms)
- **Delay** : géré par `await this.wait(ms)` avant exécution
- **Loop** : `howl.loop(boolean)`

---

## 8. Format des Données

### Story JSON (`/public/stories/{id}.json`)
```json
{
  "id": "slug",
  "title": "Titre",
  "author": "Auteur",
  "published": true,
  "sounds": [{ "id": "sound_id", "url": "https://...", "loop": false }],
  "segments": [
    { "id": "seg_0", "text": "Il était une fois...", "audioEvents": [
      { "action": "fadeIn", "soundId": "sound_id", "volume": 0.5, "duration": 400 }
    ]}
  ],
  "soundTracks": [],
  "vfxTracks": []
}
```

### Sounds Index (`/public/sounds/sounds-index.json`)
```json
{
  "id": "unique_id",
  "label": "Nom affiché",
  "filename": "file.mp3",
  "url": "https://supabase.co/...",
  "duration": 3.5,
  "loop": false,
  "tags": ["nature", "water"],
  "boomCategory": "WATER",
  "categories": ["Nature", "Water"]
}
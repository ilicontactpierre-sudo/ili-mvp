# ILi MVP — Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | HMR, build optimisé |
| **Backend (dev)** | Express | 5.2.1 | Serveur API local port 3001 |
| **Backend (prod)** | Vercel Serverless | — | Fonctions dans `/api` |
| **Base de données** | Supabase | JS SDK v2 | Storage + PostgreSQL |
| **Audio** | Howler.js | 2.2.4 | Playback, sprites, fade |
| **Encodage** | FFmpeg.wasm | 0.12.15 | Compression audio côté client |
| **Déploiement** | Vercel | — | SPA + serverless functions |
| **CI/CD** | GitHub → Vercel | — | Auto-deploy on push |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless Vercel
│   ├── upload-audio.js         # Upload audio → Supabase Storage
│   ├── upload-sound.js         # Métadonnées son → Supabase DB
│   ├── preview-sound.js        # Streaming audio local (dev)
│   ├── publish.js              # Publication histoire
│   ├── toggle-visibility.js    # Basculer visibilité
│   └── delete.js               # Suppression
├── public/
│   ├── sounds/                 # Sons UI (clic, whoosh)
│   │   ├── sounds-index.json   # Index des sons disponibles
│   │   └── *.mp3
│   └── stories/                # Fichiers histoires JSON
│       ├── index.json          # Liste des histoires
│       └── *.json              # Contenu des histoires
├── scripts/
│   ├── dev-api-server.js       # Serveur Express dev (port 3001)
│   ├── addSound.js             # CLI ajout son
│   ├── generateSoundsIndex.js  # Génération index sons
│   └── migrate-sounds-to-supabase.js
├── src/
│   ├── components/
│   │   ├── admin/              # Interface d'administration
│   │   │   ├── SoundBlockPanel.jsx
│   │   │   ├── VfxBlockPanel.jsx
│   │   │   ├── PublishPanel.jsx
│   │   │   └── ...
│   │   ├── StoryReader.jsx     # Lecteur d'histoires
│   │   ├── GameOverlay.jsx     # Overlay gamification
│   │   └── ...
│   ├── engine/
│   │   ├── AudioEngine.js      # Moteur audio (Howler.js)
│   │   └── HapticEngine.js     # Retour haptique
│   ├── pages/
│   │   ├── HomePage.jsx        # Liste des histoires
│   │   ├── StoryPage.jsx       # Lecteur
│   │   └── AdminPage.jsx       # Admin
│   ├── utils/
│   │   ├── segmentAlgorithm.js # Découpage texte
│   │   ├── renderMarkdown.jsx  # Rendu markdown
│   │   └── bionicReading.jsx   # Mode lecture bionique
│   ├── App.jsx                 # Routes
│   ├── main.jsx                # Entry point
│   └── index.css               # Styles globaux
├── vite.config.js              # Config Vite + proxy API
├── vercel.json                 # Rewrites SPA
└── package.json
```

---

## 3. Flux de Données Principal

### Requête Frontend → Backend

```
┌─────────────┐    dev (localhost)    ┌──────────────────┐
│   Frontend  │ ───────────────────▶  │  Express :3001   │
│   (Vite     │                       │  (scripts/dev-   │
│   :5173)    │                       │   api-server.js) │
└─────────────┘                       └──────────────────┘
        │                                       │
        │ proxy via vite.config.js              │
        ▼                                       ▼
┌─────────────┐    prod (Vercel)      ┌──────────────────┐
│   Frontend  │ ───────────────────▶  │  Serverless      │
│   (Vercel)  │                       │  Functions /api  │
└─────────────┘                       └──────────────────┘
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │    Supabase      │
                                      │  (DB + Storage)  │
                                      └──────────────────┘
```

### Routes API

| Endpoint | Methode | Dev | Prod | Description |
|----------|---------|-----|------|-------------|
| `/api/preview-sound` | GET | Express (fichier local) | Vercel | Streaming audio avec range requests |
| `/api/upload-audio` | POST | Express → Supabase Storage | Serverless → Supabase | Upload fichier audio (base64) |
| `/api/upload-sound` | POST | Express → Supabase DB | Serverless → Supabase | Métadonnées son (upsert) |
| `/api/publish` | POST | — | Serverless | Publier une histoire |
| `/api/toggle-visibility` | POST | — | Serverless | Basculer published/unpublished |
| `/api/delete` | POST | — | Serverless | Supprimer une histoire |

### Authentification

- **Admin** : Mot de passe via `ADMIN_PASSWORD` (env)
- Pas de système d'utilisateurs multiples
- Page `/admin` protégée par mot de passe côté client + vérification serveur sur chaque requête API

---

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API vers localhost:3001 en dev, headers COOP/COEP pour SharedArrayBuffer (FFmpeg.wasm) |
| `vercel.json` | Rewrite toutes les routes vers index.html (SPA) |
| `scripts/dev-api-server.js` | Serveur Express dev avec routes API + Supabase |

### Différences Local vs Production

| Aspect | Local | Production |
|--------|-------|------------|
| **Frontend** | Vite dev server :5173 | Vercel CDN |
| **API** | Express :3001 | Vercel Serverless Functions |
| **Preview audio** | Fichiers locaux via Express | URLs publiques Supabase |
| **Stories** | `public/stories/*.json` | Idem (servis par Vercel) |
| **Sons UI** | `public/sounds/*.mp3` | Idem |

### Assets Statiques

- **Servis depuis** : `public/` → racine du site
- **Stories** : JSON statiques dans `public/stories/`
- **Sons UI** : MP3 dans `public/sounds/`
- **Pas de CDN dédié** : Vercel fait office de CDN

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio (upload)** | FFmpeg.wasm (client) → compression → base64 → API → Supabase Storage | MP3, WAV, AIFF, FLAC | Supabase Storage bucket `sounds` |
| **Audio (lecture)** | Howler.js avec sprites pour trim | MP3 principalement | URLs publiques Supabase |
| **Images** | Texture papier (`public/textures/paper.png`) | PNG | Static |
| **Icônes** | SVG sprite (`public/icons.svg`) | SVG | Static |

---

## 5. Commandes Clés

```bash
# Développement (lance Vite + Express API en parallèle)
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview

# Lint
npm run lint

# Publier (via script bash)
npm run publish

# CLI utilitaires
npm run add-sound    # Ajouter un son à la bibliothèque
npm run checkpoint   # Mode checkpoint (port 5173 ouvert)
```

---

## 6. Variables d'Environnement

| Variable | Usage | Requis |
|----------|-------|--------|
| `SUPABASE_URL` | URL du projet Supabase | Oui |
| `SUPABASE_SERVICE_KEY` | Clé de service (admin) pour uploads | Oui |
| `SUPABASE_ANON_KEY` | Clé anon (si utilisée côté client) | Non |
| `ADMIN_PASSWORD` | Mot de passe protection admin | Oui |

**Fichiers env** : `.env` à la racine (ignoré par `.gitignore`)
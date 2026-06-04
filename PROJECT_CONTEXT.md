# ILi MVP — Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | HMR, build optimisé |
| **Backend** | Node.js + Express | Express 5.2.1 | Serveur API local (dev) |
| **Serverless** | Vercel Functions | — | API en production (`/api/*.js`) |
| **Base de données** | Supabase | JS SDK v2 | PostgreSQL + Storage (sons) |
| **Audio** | Howler.js | 2.2.4 | Moteur de lecture audio |
| **Hébergement** | Vercel | — | SPA + Serverless Functions |
| **CI/CD** | GitHub → Vercel | — | Déploiement auto sur push |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Vercel Serverless Functions (production)
│   ├── upload-sound.js         # Upsert métadonnées son dans Supabase
│   ├── upload-audio.js         # Upload fichier audio → Supabase Storage
│   ├── preview-sound.js        # Streaming audio fichiers locaux (dev only)
│   ├── publish.js              # Publication → commit GitHub
│   ├── delete.js               # Suppression story
│   └── toggle-visibility.js    # Masquer/afficher story
├── public/
│   ├── sounds/                 # Fichiers audio locaux (dev)
│   │   ├── sounds-index.json   # Index bibliothèque (gros fichier)
│   │   └── *.mp3               # Sons (whoosh, clic, etc.)
│   ├── stories/                # JSON des histoires
│   │   ├── index.json          # Liste des histoires
│   │   └── *.json              # Données story (segments, sounds, etc.)
│   ├── textures/               # Assets (paper.png)
│   └── icons.svg, favicon.svg
├── scripts/
│   ├── dev-api-server.js       # Serveur Express local (port 3001)
│   ├── checkpoint.js           # Git checkpoint + dev
│   ├── addSound.js             # CLI ajout son
│   ├── generateSoundsIndex.js  # Génération index sons
│   ├── migrate-sounds-to-supabase.js
│   └── convert-stories.js
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx        # Liste des histoires
│   │   ├── StoryPage.jsx       # Lecteur (routing, audio, navigation)
│   │   └── AdminPage.jsx       # Interface création/édition
│   ├── components/
│   │   ├── StoryReader.jsx     # Affichage texte + navigation
│   │   ├── AudioTimeline.jsx   # Timeline audio (admin)
│   │   ├── SoundLibraryPicker.jsx  # Sélecteur de sons
│   │   ├── SoundBlockPanel.jsx # Édition propriétés son
│   │   ├── PublishPanel.jsx    # Publication
│   │   ├── DraftManager.jsx    # Brouillons locaux
│   │   ├── GameModePanel.jsx   # Gamification
│   │   └── ...
│   ├── engine/
│   │   ├── AudioEngine.js      # Moteur audio (play, fade, loop, trim)
│   │   └── HapticEngine.js     # Retours haptiques
│   ├── utils/
│   │   ├── segmentAlgorithm.js # Découpage texte
│   │   ├── bionicReading.jsx
│   │   └── renderMarkdown.jsx
│   └── styles/
│       ├── global.css
│       └── vfx.css
├── vite.config.js              # Config Vite + proxy API
├── vercel.json                 # Rewrites SPA
├── package.json
└── publish.sh                  # Script publication manuelle
```

---

## 3. Flux de Données Principal

### Requête Frontend → Backend

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │    │  Dev: proxy │    │ Production: │
│  (React)    │───▶│  Vite →     │───▶│ Vercel      │
│             │    │  Express:3001│    │ Serverless  │
└─────────────┘    └─────────────┘    └─────────────┘
                          │                    │
                          ▼                    ▼
                   ┌─────────────┐    ┌─────────────┐
                   │  Supabase   │    │  Supabase   │
                   │  (DB+Store) │    │  (DB+Store) │
                   └─────────────┘    └─────────────┘
```

**Endpoints API :**
- `POST /api/upload-audio` — Upload fichier audio (base64) → Supabase Storage
- `POST /api/upload-sound` — Upsert métadonnées son → table `sounds` Supabase
- `POST /api/publish` — Commit story JSON sur GitHub
- `POST /api/delete` — Supprime story de GitHub
- `POST /api/toggle-visibility` — Masque/affiche story sur GitHub
- `GET /api/preview-sound` — Streaming audio local (dev uniquement, disabled en prod)

### Authentification

- **Admin** : mot de passe simple (`VITE_ADMIN_PASSWORD` en frontend, `ADMIN_PASSWORD` en backend)
- Stocké en `sessionStorage` pour les requêtes API
- Pas de JWT/session serveur — sécurité par mot de passe partagé

---

## 4. Points Sensibles

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy `/api/*` → `localhost:3001`, headers COOP/COEP pour FFmpeg |
| `vercel.json` | Rewrite toutes routes → `index.html` (SPA) |
| `package.json` | Scripts dev/build, dépendances |

### Différences Local vs Production

| Aspect | Local | Production |
|--------|-------|------------|
| **API** | Express sur port 3001 | Vercel Serverless Functions |
| **Audio** | Fichiers locaux (`public/sounds/`) | URLs Supabase Storage |
| **Preview audio** | `/api/preview-sound` actif | Disabled (403) |
| **Stories** | JSON statiques dans `public/stories/` | Même système (pas de DB) |
| **Publication** | Commit GitHub via API | Commit GitHub via API |

### Assets Statiques

- **Servis depuis** : `public/` → racine du site
- **Stories** : `public/stories/*.json` chargés en fetch direct
- **Sons** :
  - Dev : `public/sounds/*.mp3` + bibliothèque BOOM locale
  - Prod : Supabase Storage (`https://[project].supabase.co/storage/v1/object/sounds/`)

### Gestion des Fichiers Médias (Audio)

| Étape | Détails |
|-------|---------|
| **Formats supportés** | MP3, WAV, AIFF, FLAC (preview-sound) |
| **Upload** | Base64 via API → Supabase Storage |
| **Compression** | FFmpeg.wasm côté client (optionnel, dans SoundImporter) |
| **CDN** | Supabase CDN intégré (pas de CDN externe) |
| **Bibliothèque** | Index JSON (`sounds-index.json`) + métadonnées dans Supabase (`sounds` table) |
| **Pipeline** | Fichier local → compression (option) → upload Supabase → URL publique → référence dans story JSON |

---

## 5. Commandes Clés

```bash
npm run dev        # Vite + Express API server (concurrently)
npm run build      # Build Vite pour production
npm run preview    # Preview build local
npm run lint       # ESLint
npm run checkpoint # Git checkpoint + lance dev server
npm run publish    # bash publish.sh (publication manuelle)
npm run add-sound  # CLI ajout son à la bibliothèque
```

---

## 6. Variables d'Environnement

### Frontend (`.env` ou `.env.local`, préfixe `VITE_`)

| Variable | Rôle |
|----------|------|
| `VITE_SUPABASE_URL` | URL projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (frontend) |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (frontend) |

### Backend (`.env` pour dev, Vercel Env Vars pour prod)

| Variable | Rôle |
|----------|------|
| `SUPABASE_URL` | URL projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (admin) |
| `ADMIN_PASSWORD` | Mot de passe admin (vérification API) |
| `GITHUB_TOKEN` | Token GitHub (publication stories) |
| `GITHUB_OWNER` | Owner du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) |
| `NODE_ENV` | `development` ou `production` |
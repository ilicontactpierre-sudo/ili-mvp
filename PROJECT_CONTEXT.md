# ILi MVP — Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | Vite 8.0 comme bundler |
| **Routing** | React Router | 7.15.0 | SPA avec routes `/`, `/lire/:storyId`, `/admin` |
| **Audio** | Howler.js | 2.2.4 | Moteur audio personnalisé (`AudioEngine.js`) |
| **Backend (local)** | Express | 5.2.1 | Serveur API local sur port 3001 |
| **Backend (prod)** | Vercel Serverless | — | Fonctions dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | Storage pour sons, pas d'ORM |
| **Déploiement** | Vercel | — | CI/CD via push Git |

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless (Vercel + local)
│   ├── get-upload-url.js       # URL signée Supabase
│   ├── upload-audio.js         # Upload audio vers Supabase
│   ├── upload-sound.js         # Métadonnées son vers Supabase
│   ├── publish.js              # Publication histoire → GitHub
│   ├── delete.js               # Suppression
│   ├── delete-sound.js         # Suppression son
│   └── toggle-visibility.js    # Visibilité histoire
├── public/
│   ├── stories/                # Histoires JSON (publiées via GitHub)
│   │   ├── index.json          # Index des histoires
│   │   └── *.json              # Fichiers d'histoires
│   ├── sounds/                 # Sons locaux (dev uniquement)
│   │   └── sounds-index.json   # Index local
│   ├── fonts/                  # Polices custom (.otf, .ttf)
│   └── textures/               # Assets visuels (paper.png)
├── scripts/
│   ├── dev-api-server.js       # Serveur Express local (port 3001)
│   ├── addSound.js             # CLI ajout son
│   ├── checkpoint.js           # CLI checkpoint
│   └── migrate-sounds-to-supabase.js  # Migration
├── src/
│   ├── components/
│   │   ├── admin/              # Interface d'édition
│   │   │   ├── AudioTimeline.jsx       # Timeline 6 colonnes
│   │   │   ├── SoundBlock.jsx          # Bloc sonore draggable
│   │   │   ├── SoundLibraryPicker.jsx  # Sélecteur bibliothèque
│   │   │   ├── PublishPanel.jsx        # Publication
│   │   │   └── constants.js            # Config partagée
│   │   ├── StoryReader.jsx     # Lecteur principal
│   │   ├── GameOverlay.jsx     # Overlay gamification
│   │   └── ReaderSettings.jsx  # Paramètres lecture
│   ├── engine/
│   │   ├── AudioEngine.js      # Moteur audio (play, fade, loop, pan)
│   │   └── HapticEngine.js     # Retour haptique
│   ├── pages/
│   │   ├── HomePage.jsx        # Sélection histoires
│   │   ├── StoryPage.jsx       # Lecteur
│   │   └── AdminPage.jsx       # Éditeur
│   ├── utils/
│   │   ├── bionicReading.jsx   # Mode bionic
│   │   ├── renderMarkdown.jsx  # Rendu markdown
│   │   └── segmentAlgorithm.js # Découpage texte
│   ├── styles/
│   │   ├── global.css          # Styles globaux
│   │   └── vfx.css             # Effets visuels
│   ├── App.jsx                 # Routes
│   └── main.jsx                # Point d'entrée
├── index.html                  # HTML d'entrée
├── vite.config.js              # Config Vite + proxy API
├── vercel.json                 # Rewrites SPA
├── package.json                # Dépendances & scripts
└── .env                        # Variables (non commité)
```

## 3. Flux de Données Principal

### Requête Frontend → Backend

**En local (dev) :**
```
Frontend (Vite :5173)
    ↓ proxy (vite.config.js)
Serveur Express (localhost:3001)
    ↓
Supabase API / GitHub API / Système de fichiers local
```

**En production (Vercel) :**
```
Frontend (Vercel CDN)
    ↓
Fonctions Serverless (/api/*.js)
    ↓
Supabase API / GitHub API
```

### Authentification
- **Admin** : mot de passe simple (`ADMIN_PASSWORD`) vérifié côté serveur
- Pas de système d'utilisateurs, pas de sessions
- Protection par variable d'environnement uniquement

### Publication d'une histoire
1. Édition dans `/admin` → données en mémoire
2. Bouton "Publier" → POST `/api/publish` avec `password` + `storyData`
3. L'API écrit `public/stories/{slug}.json` et met à jour `public/stories/index.json` sur GitHub
4. L'histoire est immédiatement disponible en production

## 4. Points Sensibles

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API vers localhost:3001, headers COOP/COEP pour SharedArrayBuffer (FFmpeg) |
| `vercel.json` | Rewrite SPA (toutes routes → index.html) |
| `scripts/dev-api-server.js` | Duplique les fonctions `/api/*.js` en serveur Express local |

### Différences Local vs Production

| Aspect | Local | Production |
|--------|-------|------------|
| API | Express sur port 3001 | Vercel Serverless |
| Sons | Système de fichiers local (`/api/preview-sound`) | Supabase Storage |
| Publication | Écrit dans le repo Git local | Écrit via GitHub API |
| CORS | Géré par Vite proxy | Géré par Vercel |

### Assets Statiques

- **Servis depuis** : `public/` → racine du site
- **Histoires** : `public/stories/*.json` (chargés dynamiquement)
- **Sons locaux** : `public/sounds/` (dev uniquement, non commités)
- **Polices** : `public/fonts/` + Google Fonts (VT323, Playfair Display, Lexend)

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio** | Upload → Supabase Storage | MP3, WAV, AIFF, FLAC | Supabase CDN |
| **Images** | Assets statiques | PNG, SVG | Vercel CDN |
| **Vidéo** | Non supporté | — | — |

**Audio spécifique :**
- Upload via `/api/upload-audio` (base64) ou `/api/get-upload-url` (signed URL)
- Compression optionnelle avec FFmpeg (`@ffmpeg/ffmpeg`)
- Prévisualisation locale via `/api/preview-sound` (streaming avec range requests)
- Métadonnées sons stockées dans Supabase (table `sounds`)

## 5. Commandes Clés

```bash
npm run dev          # Vite + Express API (concurrently)
npm run dev:clean    # Tue les process zombies puis dev
npm run build        # Build Vite → dist/
npm run preview      # Preview build en local
npm run lint         # ESLint
npm run add-sound    # CLI: ajouter un son à la bibliothèque
npm run checkpoint   # CLI: checkpoint + démarrage serveur
npm run publish      # bash publish.sh (déploiement)
```

## 6. Variables d'Environnement

```
# Supabase
SUPABASE_URL
SUPABASE_SERVICE_KEY

# GitHub (publication)
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH

# Admin
ADMIN_PASSWORD

# Divers
DATABASE_URL
```

---

**Objectif** : Application de lecture interactive d'histoires avec synchronisation audio précise, édition WYSIWYG, et publication via GitHub.
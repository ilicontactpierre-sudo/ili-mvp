# ILi MVP — Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Plugin React officiel |
| **Backend** | Node.js (Vercel Serverless) | — | API Routes dans `/api` |
| **Base de données** | Supabase | SDK v2.106.1 | PostgreSQL + Storage |
| **Déploiement** | Vercel | — | CI/CD auto via push Git |

## 2. Structure des Fichiers

```
ili-mvp/
├── src/                        # Code frontend React
│   ├── pages/                  # Routes principales
│   │   ├── HomePage.jsx        # Liste des histoires
│   │   ├── StoryPage.jsx       # Lecteur d'histoire
│   │   └── AdminPage.jsx       # Interface admin (création/édition)
│   ├── components/
│   │   ├── admin/              # Outils d'édition (timeline, sons, vfx)
│   │   ├── StoryReader.jsx     # Moteur de lecture
│   │   └── ReaderSettings.jsx  # Paramètres de lecture
│   ├── engine/                 # Moteurs audio/haptique
│   │   ├── AudioEngine.js      # Gestion Howler.js
│   │   └── HapticEngine.js     # Vibrations (mobile)
│   └── utils/                  # Algorithmes (segmentation, markdown)
├── api/                        # Vercel Serverless Functions
│   ├── publish.js              # Publication histoire → GitHub
│   ├── delete.js               # Suppression histoire
│   ├── toggle-visibility.js    # Masquer/afficher dans le player
│   └── upload-audio.js         # Upload fichier audio → Supabase Storage
├── public/                     # Assets statiques (servis tels quels)
│   ├── stories/                # Fichiers JSON des histoires
│   │   ├── index.json          # Index de toutes les histoires
│   │   └── *.json              # Données d'histoire individuelle
│   └── sounds/                 # Sons locaux (whoosh, clic, etc.)
│       └── sounds-index.json   # Catalogue BOOM Library (généré)
├── scripts/                    # Scripts Node utilitaires
│   ├── addSound.js             # Ajout son à la librairie
│   ├── generateSoundsIndex.js  # Génération sounds-index.json
│   └── migrate-sounds-to-supabase.js
├── vite.config.js              # Config Vite (FS allow pour BOOM Library)
├── vercel.json                 # Rewrites SPA
└── publish.sh                  # Script de déploiement manuel
```

## 3. Flux de Données Principal

### Requête Frontend → Backend

```
Utilisateur (AdminPage)
    ↓
    POST /api/publish (storyData + password)
    ↓
    Vercel Serverless (api/publish.js)
    ├── Vérifie ADMIN_PASSWORD
    ├── Écrit public/stories/{slug}.json → GitHub API
    ├── Met à jour public/stories/index.json → GitHub API
    └── Réponse JSON
    ↓
    Frontend reçoit succès/erreur
```

### Authentification Admin

| Couche | Mécanisme | Variable |
|--------|-----------|----------|
| **Client** | Mot de passe saisi → stocké en `sessionStorage` | `VITE_ADMIN_PASSWORD` |
| **Serveur** | Validation de chaque appel API | `ADMIN_PASSWORD` (Vercel env) |

### Chargement d'une histoire (lecture)

```
StoryPage (/lire/:storyId)
    ↓
    GET /stories/{storyId}.json (fichier statique)
    ↓
    StoryReader parse segments + soundTracks + vfxTracks
    ↓
    AudioEngine joue les sons au fil du défilement
```

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Bundler + `fs.allow` pour accès BOOM Library locale |
| `vercel.json` | Rewrite SPA (`/(.*)` → `/index.html`) |
| `.env` | Variables locales (dev uniquement) |
| `Vercel Dashboard` | Variables de prod (ADMIN_PASSWORD, GITHUB_*, SUPABASE_*) |

### Différences Local vs Production

| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| **Stories** | Fichiers statiques `/public/stories/` | GitHub API (via `/api/publish`) |
| **Suppression** | Non disponible | `/api/delete` → GitHub API |
| **Toggle visibilité** | Non disponible | `/api/toggle-visibility` → GitHub API |
| **Upload audio** | — | `/api/upload-audio` → Supabase Storage |

### Assets Statiques

- **Servis depuis** : `/public/` (Vite copy → `dist/` au build)
- **URLs** : `/stories/*.json`, `/sounds/*.mp3`, `/sounds/sounds-index.json`
- **Cache** : Géré par Vercel CDN (pas de config spéciale)

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Sons UI** (clic, whoosh) | Commit dans `/public/sounds/` | MP3 | GitHub → Vercel CDN |
| **Sons histoires** | Upload via `/api/upload-audio` | MP3 | Supabase Storage (bucket `sounds`) |
| **BOOM Library** | Script `generateSoundsIndex.js` → `sounds-index.json` | Référence locale + MP3 remote | Local dev → Supabase prod |

## 5. Commandes Clés

```bash
npm run dev        # Démarre Vite dev server (localhost:5173)
npm run build      # Build de production → /dist
npm run preview    # Prévisualise le build en local
npm run lint       # ESLint
./publish.sh       # Commit + push → déclenche Vercel deploy
npm run add-sound  # Script d'ajout de son à la librairie
```

## 6. Variables d'Environnement

### Côté Client (`.env` → `import.meta.env.VITE_*`)

| Nom | Rôle |
|-----|------|
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (frontend) |
| `VITE_GEMINI_API_KEY` | Clé API Google Gemini (IA) |
| `VITE_SUPABASE_URL` | URL Supabase (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (frontend) |

### Côté Serveur (Vercel Dashboard uniquement)

| Nom | Rôle |
|-----|------|
| `ADMIN_PASSWORD` | Validation appels API |
| `SUPABASE_URL` | URL Supabase (server) |
| `SUPABASE_SERVICE_KEY` | Clé service/admin Supabase |
| `GITHUB_TOKEN` | Personal Access Token GitHub |
| `GITHUB_OWNER` | Propriétaire du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche de déploiement (défaut: `main`) |
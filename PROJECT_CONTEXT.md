# ILi MVP — Contexte Projet

Application web de lecture interactive d'histoires avec accompagnement audio.

---

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router DOM 7.15.0 |
| **Bundler** | Vite | 8.0.12 | HMR + build optimisé |
| **Backend** | Node.js + Express | 5.2.1 | Serveur dev local uniquement (port 3001) |
| **Serverless** | Vercel Functions | — | API en production (`/api/*.js`) |
| **Base de données** | Supabase | 2.106.1 | Storage pour fichiers audio |
| **Audio** | Howler.js | 2.2.4 | Moteur de playback audio |
| **Hébergement** | Vercel | — | Déploiement auto depuis GitHub |
| **CI/CD** | GitHub Actions (Vercel) | — | Push → build → deploy auto |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx          # Liste des histoires
│   │   ├── StoryPage.jsx         # Lecteur d'histoire
│   │   └── AdminPage.jsx         # Interface d'administration
│   ├── components/
│   │   ├── StoryReader.jsx       # Composant de lecture principal
│   │   ├── AudioTimeline.jsx     # Timeline audio
│   │   ├── ReaderSettings.jsx    # Paramètres + progression
│   │   ├── admin/                # Composants admin (orchestration, publish, etc.)
│   │   └── ...
│   ├── engine/
│   │   ├── AudioEngine.js        # Moteur audio (play, fade, stop)
│   │   └── HapticEngine.js       # Retours haptiques
│   ├── utils/
│   │   ├── bionicReading.jsx
│   │   ├── renderMarkdown.jsx
│   │   └── segmentAlgorithm.js
│   ├── App.jsx                   # Routing
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Styles globaux
├── public/
│   ├── stories/
│   │   ├── index.json            # Index des histoires
│   │   └── *.json                # Fichiers d'histoires
│   └── sounds/
│       ├── sounds-index.json     # Index des sons locaux
│       └── *.mp3                 # Sons embarqués
├── api/                          # Vercel serverless functions
│   ├── publish.js                # Publier une histoire (→ GitHub API)
│   ├── delete.js                 # Supprimer une histoire
│   ├── toggle-visibility.js      # Masquer/afficher une histoire
│   ├── upload-audio.js           # Upload audio → Supabase
│   ├── upload-sound.js
│   └── preview-sound.js
├── scripts/
│   ├── dev-api-server.js         # Serveur Express dev (port 3001)
│   ├── addSound.js               # CLI ajout de sons
│   ├── checkpoint.js
│   └── ...
├── vite.config.js                # Config Vite + proxy API
├── vercel.json                   # Rewrites SPA
├── package.json                  # Scripts + dépendances
└── publish.sh                    # Script de publication Git
```

---

## 3. Flux de Données Principal

### Lecture d'une histoire
```
1. GET /stories/{storyId}.json  →  StoryPage charge le JSON
2. StartScreen précharge les sons (Howler.js) via URLs (Cloudinary ou Supabase)
3. AudioEngine exécute les audioEvents à chaque segment
4. Navigation : clic/touch/swipe → segment suivant/précédent
5. Progression sauvegardée en localStorage
```

### Publication (Admin → Production)
```
1. Admin remplit le formulaire → POST /api/publish
2. Vérification ADMIN_PASSWORD
3. Écriture via GitHub API dans public/stories/{slug}.json
4. Mise à jour de public/stories/index.json
5. Push GitHub → Vercel rebuild → deploy auto
```

### Upload audio (Admin)
```
1. Admin upload → POST /api/upload-audio (multipart)
2. Vérification ADMIN_PASSWORD
3. Upload vers Supabase Storage (bucket: `sounds`)
4. Retourne l'URL publique Cloudinary/Supabase
```

### Auth
- **Pas d'authentification utilisateur** — l'app est publique
- **Admin uniquement** : mot de passe via `ADMIN_PASSWORD` (env var) pour les endpoints `/api/*`

---

## 4. Points Sensibles

### Fichiers de configuration critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy `/api/preview-sound` → localhost:3001 en dev |
| `vercel.json` | Rewrite SPA (`/(.*)` → `/index.html`) |
| `scripts/dev-api-server.js` | Sert les fichiers audio locaux avec range requests |

### Différences Local vs Production
| Aspect | Local | Production |
|--------|-------|------------|
| API preview audio | Express port 3001 (fichiers locaux) | N/A (pas de preview locale) |
| Stories | Fichiers JSON dans `public/stories/` | GitHub API → fichiers commités |
| Audio | URLs Cloudinary/Supabase | URLs Cloudinary/Supabase |
| Déploiement | `npm run dev` | Push Git → Vercel auto-deploy |

### Assets statiques
- **Servis depuis** : `public/` (Vite les copie à la racine)
- **Stories** : `public/stories/*.json` — chargés en fetch relatif (`/stories/{id}.json`)
- **Sons embarqués** : `public/sounds/*.mp3` — pour UI clicks (clic ILi, whoosh, etc.)
- **Sons d'histoires** : URLs externes (Cloudinary ou Supabase Storage)

### Gestion des fichiers médias
| Type | Pipeline | Formats | CDN |
|------|----------|---------|-----|
| Audio histoires | Upload admin → Supabase Storage | MP3, WAV, AIFF, FLAC | Supabase CDN |
| Audio UI | Fichiers locaux dans `public/sounds/` | MP3 | Vercel static |
| Images | Asset dans `src/assets/` | PNG, SVG | Vercel static |

---

## 5. Commandes Clés

```bash
# Développement
npm run dev          # Vite + Express API server (concurrently)

# Build
npm run build        # Build Vite production
npm run preview      # Preview build local

# Linting
npm run lint         # ESLint

# Administration
npm run add-sound    # CLI: ajouter un son à la bibliothèque
npm run checkpoint   # Mode checkpoint (vite --host 0.0.0.0)

# Déploiement
./publish.sh         # Commit + push → Vercel auto-deploy
npm run publish      # Alias vers publish.sh
```

---

## 6. Variables d'Environnement

### Requises (Vercel / production)
- `ADMIN_PASSWORD` — Mot de passe pour les endpoints admin
- `SUPABASE_URL` — URL du projet Supabase
- `SUPABASE_SERVICE_KEY` — Clé de service Supabase (pour upload storage)
- `GITHUB_TOKEN` — Token GitHub API (pour publish/delete/toggle)
- `GITHUB_OWNER` — Propriétaire du repo GitHub
- `GITHUB_REPO` — Nom du repo GitHub
- `GITHUB_BRANCH` — Branche cible (défaut: `main`)

### Optionnelles
- `VITE_*` — Variables exposées au frontend (préfixe `VITE_`)

---

## 7. Architecture Résumé

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  React 19 + Vite + React Router                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  HomePage   │  │  StoryPage   │  │     AdminPage       │ │
│  │  (liste)    │  │  (lecteur)   │  │  (orchestration)    │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│         │                │                     │              │
│         │          AudioEngine          API endpoints        │
│         │          (Howler.js)         (/api/*.js)           │
└─────────┼────────────────┼─────────────────────┼─────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────┐ ┌───────────────┐ ┌──────────────────────┐
│  public/stories │ │  Audio URLs   │ │  Vercel Serverless   │
│  (*.json)       │ │  (Supabase/   │ │  + GitHub API        │
│                 │ │   Cloudinary) │ │                      │
└─────────────────┘ └───────────────┘ └──────────────────────┘
# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Build optimisé, HMR en dev |
| **Audio** | Howler.js | 2.2.4 | Moteur audio pour les histoires |
| **Backend** | Vercel Serverless Functions | Node.js | API routes dans `/api` |
| **Stockage** | GitHub API | — | Fichiers JSON stockés sur le repo GitHub |
| **Déploiement** | Vercel | — | CI/CD automatique via Git push |
| **Routing** | React Router DOM | 7.15.0 | Client-side routing |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                          # Vercel Serverless Functions
│   ├── publish.js               # Publication d'histoires (POST)
│   └── delete.js                # Suppression d'histoires (DELETE)
├── public/                       # Assets statiques servis par Vercel
│   ├── favicon.svg
│   ├── icons.svg
│   └── stories/                 # Histoires JSON
│       ├── index.json           # Index de toutes les histoires
│       └── *.json               # Fichiers d'histoires individuelles
│   └── sounds/                  # Bibliothèque audio
│       └── sounds-index.json    # Index des sons
├── scripts/                      # Scripts utilitaires
│   ├── addSound.js
│   ├── checkpoint.js
│   └── convert-stories.js
├── src/
│   ├── components/
│   │   ├── admin/               # Interface d'administration
│   │   │   ├── PublishPanel.jsx
│   │   │   ├── DraftManager.jsx
│   │   │   ├── SoundBlockPanel.jsx
│   │   │   ├── VfxBlockPanel.jsx
│   │   │   └── ...
│   │   ├── StoryReader.jsx      # Lecteur d'histoires
│   │   ├── StoryMenu.jsx
│   │   └── ...
│   ├── engine/
│   │   └── AudioEngine.js       # Moteur audio principal
│   ├── pages/
│   │   ├── HomePage.jsx         # Liste des histoires
│   │   ├── StoryPage.jsx        # Page de lecture
│   │   └── AdminPage.jsx        # Interface admin
│   ├── utils/
│   │   ├── segmentAlgorithm.js  # Algorithme de segmentation
│   │   └── renderMarkdown.jsx   # Rendu markdown
│   ├── styles/
│   │   ├── global.css
│   │   └── vfx.css
│   ├── assets/
│   ├── App.jsx                  # Routing principal
│   └── main.jsx                 # Point d'entrée
├── .gitignore
├── index.html                   # HTML d'entrée
├── package.json
├── vite.config.js               # Config Vite
├── vercel.json                  # Config Vercel (rewrites SPA)
└── publish.sh                   # Script de publication
```

---

## 3. Flux de données principal

### Navigation & Routes
```
/ → HomePage (liste des histoires)
/lire/:storyId → StoryPage (lecteur avec AudioEngine)
/admin → AdminPage (création/édition/suppression)
```

### Publication d'une histoire
1. Admin remplit le formulaire dans `PublishPanel.jsx`
2. POST `/api/publish` avec `{ password, slug, storyData }`
3. Vérification `ADMIN_PASSWORD` côté serveur
4. Écriture des fichiers JSON sur GitHub via API
5. Mise à jour de `public/stories/index.json`
6. Réponse succès/erreur

### Lecture d'une histoire
1. Navigation vers `/lire/:storyId`
2. Chargement du JSON depuis `public/stories/{storyId}.json`
3. `AudioEngine.js` gère la lecture audio synchronisée
4. Segments affichés via `segmentAlgorithm.js`

### Authentification
- **Admin uniquement** : mot de passe via `ADMIN_PASSWORD` (env variable)
- Pas d'auth utilisateur pour la lecture (publique)
- Validation côté serveur dans les API routes

---

## 4. Points sensibles connus

### Fichiers de configuration critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Build Vite + plugin React |
| `vercel.json` | Rewrites SPA → index.html pour React Router |
| `package.json` | Scripts, dépendances, version |

### Différences local vs production
| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| **Server** | Vite dev server (HMR) | Vercel static + serverless |
| **API** | Non disponible localement | Vercel Functions |
| **Stories** | Fichiers dans `public/stories/` | GitHub API (push via /api/publish) |
| **Build** | Aucun (dev) | `vite build` → `dist/` |

### Assets statiques
- **Servis depuis** : `public/` → racine du site
- **Stories** : JSON dans `public/stories/` (localement) ou GitHub (prod)
- **Sons** : MP3 dans `public/sounds/` + index JSON
- **Favicon & icons** : SVG dans `public/`

### Gestion des médias
| Type | Format | Pipeline | Stockage |
|------|--------|----------|----------|
| **Audio** | MP3 | Upload manuel dans `public/sounds/` | GitHub (via publish API) |
| **Images** | SVG, PNG | Assets dans `src/assets/` ou `public/` | Bundle Vite ou static |
| **CDN** | — | Aucun CDN configuré | Assets servis par Vercel |

---

## 5. Commandes clés

```bash
npm run dev          # Démarrer Vite dev server (localhost:5173)
npm run build        # Build de production → dist/
npm run preview      # Preview du build en local
npm run lint         # ESLint
npm run add-sound    # Script pour ajouter un son à la bibliothèque
npm run checkpoint   # Script spécial (checkpoint + dev server)
npm run publish      # bash publish.sh (publication manuelle)
```

---

## 6. Variables d'environnement

### Requises pour la publication (Vercel)
- `ADMIN_PASSWORD` — Mot de passe admin pour publier/supprimer
- `GITHUB_TOKEN` — Token GitHub avec accès au repo
- `GITHUB_OWNER` — Propriétaire du repo GitHub
- `GITHUB_REPO` — Nom du repo GitHub
- `GITHUB_BRANCH` — Branche cible (défaut: `main`)

### Optionnelles
- `.env.local` — Variables locales (non versionnées)

---

## 7. Architecture technique résumée

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Vercel         │    │   GitHub        │
│   React + Vite  │◄──►│   Serverless     │◄──►│   API           │
│                 │    │   Functions      │    │   (stockage)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
       │                        │                       │
       │                        │                       │
       ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AudioEngine   │    │   /api/publish   │    │   public/       │
│   Howler.js     │    │   /api/delete    │    │   stories/      │
└─────────────────┘    └──────────────────┘    │   sounds/       │
                                               └─────────────────┘
```

**Flux typique** :
1. Utilisateur lit une histoire → chargement JSON depuis `public/stories/`
2. Admin publie → API écrit sur GitHub → Vercel redéploie → nouveau JSON disponible
3. Audio joué via Howler.js avec synchronisation des segments

---

*Document généré pour compréhension rapide du projet — MAJ : 2026-05-19*
# ILi MVP - Contexte du Projet

Application de lecture immersive d'histoires avec bande-son interactive.

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router DOM 7.15.0 |
| **Bundler** | Vite | 8.0.12 | Plugin React (@vitejs/plugin-react 6.0.1) |
| **Audio** | Howler.js | 2.2.4 | Bibliothèque audio pour le web |
| **Backend** | Vercel Serverless Functions | - | API routes dans `/api` |
| **Base de données** | GitHub API (fichiers JSON) | - | Stockage des stories et index |
| **Hébergement** | Vercel | - | Déploiement automatique via Git |
| **CI/CD** | GitHub + Vercel | - | Push sur `main` → déploiement auto |

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless Vercel
│   ├── delete.js              # Supprime une story (via GitHub API)
│   └── publish.js             # Publie/mise à jour une story
├── public/                     # Assets statiques servis par Vite/Vercel
│   ├── sounds/                # Fichiers audio locaux
│   │   └── sounds-index.json  # Index des sons disponibles
│   └── stories/               # Fichiers JSON des histoires
│       └── index.json         # Index des stories publiées
├── src/
│   ├── components/            # Composants React
│   │   └── admin/             # Interface d'édition/publishing
│   ├── engine/                # Moteur audio (AudioEngine.js)
│   ├── pages/                 # Pages de l'application
│   │   ├── HomePage.jsx       # Liste des stories
│   │   ├── StoryPage.jsx      # Lecteur d'histoire
│   │   └── AdminPage.jsx      # Éditeur
│   └── utils/                 # Utilitaires
├── scripts/                    # Scripts Node.js utilitaires
├── index.html                 # Point d'entrée HTML
├── package.json               # Dépendances et scripts
├── vite.config.js             # Config Vite
├── vercel.json                # Config Vercel (rewrites SPA)
└── publish.sh                 # Script de déploiement Git
```

## 3. Flux de Données Principal

### Navigation
- **Routing** : React Router DOM (`/`, `/lire/:storyId`, `/admin`)
- **vercel.json** : Rewrite `/(.*)` → `/index.html` pour le routing client-side

### Chargement d'une histoire
1. `HomePage.jsx` fetch `/stories/index.json` → liste des stories
2. `StoryPage.jsx` fetch `/stories/{storyId}.json` → données complètes
3. `AudioEngine.js` initialise les sons via Howler.js
4. Lecture segment par segment avec événements audio synchronisés

### Publishing (création/modification)
1. `AdminPage.jsx` → `PublishPanel.jsx` envoie les données
2. `POST /api/publish` avec mot de passe
3. Fonction serverless écrit sur GitHub via API (`public/stories/{slug}.json` + `index.json`)
4. Vercel redéploie automatiquement

### Suppression
1. `HomePage.jsx` → `StoryMenu` → action supprimer
2. `DELETE /api/delete` avec mot de passe
3. Fonction serverless supprime le fichier story et met à jour l'index sur GitHub

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Build Vite, plugins React |
| `vercel.json` | Rewrites SPA pour React Router |
| `package.json` | Scripts, dépendances |

### Différences Local vs Production
| Aspect | Local | Production |
|--------|-------|------------|
| **Stories** | Fichiers statiques dans `public/stories/` | Gérées via GitHub API |
| **Suppression** | Désactivée (erreur levée) | Fonctionne via `/api/delete` |
| **Sons** | Locaux (`/sounds/`) ou Cloudinary | Cloudinary ou locaux |
| **Build** | `vite build` → `dist/` | Vercel build automatique |

### Assets Statiques
- **Servis depuis** : `public/` → racine du site
- **Favicon** : `/favicon.svg`
- **Police** : Google Fonts (Roboto)
- **Icônes** : `public/icons.svg` (sprite SVG inline)

### Gestion des Fichiers Médias
| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio** | Upload manuel dans `public/sounds/` ou URLs Cloudinary | MP3 | Local + Cloudinary |
| **Images** | Asset dans `src/assets/` ou URLs externes | SVG, PNG | Bundle Vite ou CDN externe |

- **Pas de CDN dédié** pour les assets locaux (servis par Vercel)
- **Cloudinary** utilisé pour certains sons (URLs dans les stories)
- **AudioEngine** gère : play, stop, fadeIn, fadeOut, volume, loop, delay

## 5. Commandes Clés

```bash
# Développement
npm run dev              # Lance Vite dev server (localhost:5173)

# Build
npm run build            # Build de production dans dist/
npm run preview          # Prévisualisation du build

# Qualité
npm run lint             # ESLint

# Publishing
npm run publish          # Exécute publish.sh (commit + push + déploiement Vercel)
npm run add-sound        # Script pour ajouter un son à la bibliothèque
npm run checkpoint       # Sauvegarde un checkpoint + relance le dev server
```

## 6. Variables d'Environnement

### Requises pour le publishing (Vercel)
- `ADMIN_PASSWORD` - Mot de passe pour les opérations admin
- `GITHUB_TOKEN` - Token GitHub avec accès au repo
- `GITHUB_OWNER` - Propriétaire du repo GitHub
- `GITHUB_REPO` - Nom du repo GitHub
- `GITHUB_BRANCH` - Branche cible (défaut: `main`)

### Optionnelles
- `VITE_*` - Variables préfixées pour exposition côté client (aucune utilisée actuellement)
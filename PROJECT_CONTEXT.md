# ILi — Projet de Lecture Immersive

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router DOM 7.15.0 |
| **Bundler** | Vite | 8.0.12 | HMR, build optimisé |
| **Backend** | Node.js (Serverless) | — | Vercel Functions |
| **Audio** | Howler.js | 2.2.4 | Gestion sons, fade in/out |
| **Hébergement** | Vercel | — | Déploiement auto depuis GitHub |
| **CI/CD** | Vercel + GitHub | — | Push → build → deploy auto |
| **Base de données** | Fichiers JSON | — | Pas de BDD, stockage Git-based |

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                          # Serverless Functions (Vercel)
│   ├── publish.js                # Publication stories → GitHub
│   └── delete.js                 # Suppression stories → GitHub
├── public/                       # Assets statiques (servis tels quels)
│   ├── sounds/                   # Bibliothèque sonore (MP3)
│   │   ├── sounds-index.json     # Index des sons disponibles
│   │   └── *.mp3                 # Fichiers audio
│   └── stories/                  # Histoires publiées
│       ├── index.json            # Catalogue (id, title, author)
│       └── {slug}.json           # Fichiers stories
├── src/
│   ├── components/
│   │   ├── admin/                # Interface création stories
│   │   │   ├── PublishPanel.jsx  # Publication (appel API)
│   │   │   ├── SoundBlockPanel.jsx
│   │   │   ├── VfxBlockPanel.jsx
│   │   │   └── UnifiedSegmentsTimeline.jsx
│   │   ├── StoryReader.jsx       # Moteur de lecture
│   │   ├── StoryMenu.jsx         # Menu sélection stories
│   │   └── ReaderSettings.jsx    # Réglages (vitesse, etc.)
│   ├── engine/
│   │   ├── AudioEngine.js        # Gestion audio (Howler)
│   │   └── HapticEngine.js       # Vibrations (mobile)
│   ├── pages/
│   │   ├── HomePage.jsx          # Accueil + logo interactif
│   │   ├── StoryPage.jsx         # Page de lecture
│   │   └── AdminPage.jsx         # Interface admin
│   ├── utils/
│   │   ├── renderMarkdown.jsx    # Rendu texte enrichi
│   │   └── segmentAlgorithm.js   # Découpage segments
│   ├── styles/
│   │   ├── global.css
│   │   └── vfx.css               # Effets visuels
│   ├── App.jsx                   # Routage
│   ├── main.jsx                  # Point d'entrée
│   └── index.css
├── scripts/                      # Outils CLI
│   ├── addSound.js               # Ajout son à la bibliothèque
│   ├── generateSoundsIndex.js    # Génération index sons
│   └── convert-stories.js        # Conversion format
├── vite.config.js                # Config Vite (minimale)
├── vercel.json                   # Rewrites SPA
├── package.json                  # Dépendances + scripts
└── publish.sh                    # Script publication locale
```

## 3. Flux de Données Principal

### Lecture d'une histoire
```
1. HomePage.jsx → fetch('/stories/index.json') → liste stories
2. Utilisateur clique sur une story → navigation vers /lire/:storyId
3. StoryPage.jsx → fetch(`/stories/${storyId}.json`) → données story
4. StoryReader.jsx → rend segments + déclenche audioEvents via AudioEngine
5. AudioEngine (Howler) → joue/fade sons selon événements
```

### Publication d'une histoire (admin)
```
1. AdminPage.jsx → création story (titre, slug, segments, sons)
2. PublishPanel.jsx → POST /api/publish avec { password, slug, storyData }
3. api/publish.js (Vercel Function) :
   - Vérifie ADMIN_PASSWORD
   - Écrit public/stories/{slug}.json sur GitHub (API)
   - Met à jour public/stories/index.json sur GitHub
   - Déclenche redeploy Vercel
4. Vercel rebuild → nouveaux fichiers JSON disponibles
```

### Authentification
- **Admin** : mot de passe simple (`ADMIN_PASSWORD`) vérifié côté serveur
- **Lecture** : publique, pas d'auth requise
- Pas de session, pas de JWT

## 4. Points Sensibles Connus

### Fichiers de configuration critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Build frontend, plugin React |
| `vercel.json` | Rewrites SPA (`/(.*)` → `/index.html`) |
| `package.json` | Scripts, dépendances |

### Différences local vs production
| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| API `/api/*` | Non disponible | Serverless Functions |
| Publication | Export manuel JSON | Publication auto via GitHub API |
| Suppression | Non disponible | Via `/api/delete` |
| URL | `localhost:5173` | `ili-mvp.vercel.app` |

### Assets statiques
- **Servis depuis** : dossier `public/` (Vite copy → `dist/` au build)
- **Stories** : `public/stories/*.json` → chargées en fetch relatif
- **Sons** : `public/sounds/*.mp3` → URLs dans les stories (peuvent être CDN externe, ex: Cloudinary)

### Gestion des fichiers médias
| Type | Pipeline | Formats | CDN |
|------|----------|---------|-----|
| **Audio (bibliothèque)** | `public/sounds/` + `sounds-index.json` | MP3 | Non (sauf si URLs externes dans stories) |
| **Audio (stories)** | URLs dans `segments[].audioEvents` | MP3 (via Howler) | Possible (Cloudinary observé) |
| **Images** | `src/assets/` ou `public/` | SVG, PNG | Non |
| **Vidéo** | Non supporté | — | — |

## 5. Commandes Clés

```bash
npm run dev        # Dev server (Vite, port 5173)
npm run build      # Build production → dist/
npm run preview    # Preview build local
npm run lint       # ESLint
npm run add-sound  # Ajout son à la bibliothèque
npm run publish    # Script auto commit + push + deploy
```

## 6. Variables d'Environnement

### Côté serveur (Vercel Environment Variables)
| Nom | Rôle |
|-----|------|
| `ADMIN_PASSWORD` | Mot de passe admin pour publish/delete |
| `GITHUB_TOKEN` | Personal Access Token GitHub (repo access) |
| `GITHUB_OWNER` | Owner du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) |

### Côté client (`.env` local, prefix `VITE_`)
| Nom | Rôle |
|-----|------|
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (local) |

---

**Dernière mise à jour** : 20/05/2026
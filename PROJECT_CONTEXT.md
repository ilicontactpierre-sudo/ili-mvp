# ILi MVP - Contexte du Projet

Application web de lecture interactive d'histoires avec synchronisation audio.

---

## 1. Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Frontend** | React + Vite | React 19.2.6, Vite 8.0.12 |
| **Routing** | React Router DOM | 7.15.0 |
| **Audio** | Howler.js | 2.2.4 |
| **Backend** | Vercel Serverless Functions | Node.js |
| **Base de données** | Fichiers JSON (GitHub comme CMS) | - |
| **Hébergement** | Vercel | CI/CD automatique via Git |
| **Repo** | GitHub | `ilicontactpierre-sudo/ili-mvp` |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Vercel Serverless Functions
│   ├── publish.js              # Publication d'histoires via GitHub API
│   └── delete.js               # Suppression d'histoires
├── public/                     # Assets statiques (servis par Vercel)
│   ├── stories/                # Histoires JSON
│   │   ├── index.json          # Liste des histoires
│   │   └── *.json              # Fichiers d'histoires individuelles
│   └── sounds/                 # Fichiers audio MP3
│       ├── sounds-index.json   # Index de la bibliothèque sonore
│       └── *.mp3               # Fichiers audio
├── src/
│   ├── components/
│   │   ├── admin/              # Interface d'administration
│   │   │   ├── UnifiedSegmentsTimeline.jsx
│   │   │   ├── PublishPanel.jsx
│   │   │   ├── DraftManager.jsx
│   │   │   ├── StoryLoader.jsx
│   │   │   └── ...
│   │   ├── StoryReader.jsx     # Lecteur d'histoires
│   │   ├── StartScreen.jsx
│   │   └── EndScreen.jsx
│   ├── engine/
│   │   └── AudioEngine.js      # Moteur audio (play, fade, stop)
│   ├── pages/
│   │   ├── HomePage.jsx        # Liste des histoires
│   │   ├── StoryPage.jsx       # Lecteur (route: /lire/:storyId)
│   │   └── AdminPage.jsx       # Admin (route: /admin)
│   ├── utils/
│   │   ├── segmentAlgorithm.js # Algorithme de découpage de texte
│   │   └── renderMarkdown.jsx
│   ├── App.jsx                 # Routes principales
│   ├── main.jsx                # Point d'entrée
│   └── index.css               # Styles globaux
├── scripts/                    # Scripts utilitaires
│   ├── addSound.js             # Ajouter un son à la bibliothèque
│   ├── generateSoundsIndex.js  # Générer sounds-index.json
│   └── checkpoint.js           # Sauvegarde locale
├── vite.config.js              # Config Vite
├── vercel.json                 # Config Vercel (rewrites SPA)
├── package.json
└── publish.sh                  # Script de déploiement Git
```

---

## 3. Flux de Données Principal

### Lecture d'histoire (utilisateur)
```
1. GET /lire/:storyId → StoryPage.jsx
2. Fetch `/stories/${storyId}.json` (fichier statique)
3. AudioEngine charge les sons depuis `/sounds/*.mp3`
4. Navigation segment par segment → déclenche audioEvents
```

### Création/Publication (admin)
```
1. POST /admin → Auth par VITE_ADMIN_PASSWORD (client-side)
2. Édition : texte → découpage (segmentAlgorithm.js) → ajout sons
3. Publication : POST /api/publish
   → Vérifie ADMIN_PASSWORD (server-side)
   → Écrit `public/stories/${slug}.json` via GitHub API
   → Met à jour `public/stories/index.json`
4. Push Git → Vercel red dé déploye
```

### Authentification
- **Admin** : mot de passe simple (client + server-side)
- **Session** : sessionStorage (`ili_admin_password`)
- Pas d'auth utilisateur pour la lecture

---

## 4. Points Sensibles

### Fichiers de Configuration Critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Build React, aucun alias/path personnalisé |
| `vercel.json` | Rewrite SPA (`/(.*)` → `/index.html`) |
| `api/publish.js` | Publication via GitHub API, validation password |

### Environnement : Local vs Production
| Aspect | Local | Production |
|--------|-------|------------|
| Serveur | `vite` (HMR, port 5173) | Vercel (statique + serverless) |
| Stories | `public/stories/*.json` (locaux) | GitHub → Vercel CDN |
| Sons | `public/sounds/*.mp3` (locaux) | GitHub → Vercel CDN |
| API | `api/*.js` via `vercel dev` | Vercel Functions |

### Assets Statiques
- **Servis depuis** : `public/` → racine du site
- **Stories** : `GET /stories/{id}.json`
- **Sons** : `GET /sounds/{filename}.mp3`
- **Pas de CDN externe** : tout sur Vercel

### Gestion des Médias
| Type | Format | Pipeline |
|------|--------|----------|
| Audio | MP3 | Upload manuel dans `public/sounds/` + `sounds-index.json` |
| Images | PNG/SVG | `src/assets/` (bundled) ou `public/` (statique) |
| Vidéo | Non supporté | - |

---

## 5. Commandes Clés

```bash
npm run dev        # Dév local (Vite, port 5173)
npm run build      # Build production (output: dist/)
npm run preview    # Preview build local
npm run lint       # ESLint
./publish.sh       # Commit + push → déploiement Vercel auto
```

---

## 6. Variables d'Environnement

### Client (`.env` → `import.meta.env`)
- `VITE_ADMIN_PASSWORD` — Mot de passe admin (client-side check)

### Serveur (Vercel Environment Variables)
- `ADMIN_PASSWORD` — Validation server-side publication
- `GITHUB_TOKEN` — Token GitHub API (write access)
- `GITHUB_OWNER` — Propriétaire du repo GitHub
- `GITHUB_REPO` — Nom du repo GitHub
- `GITHUB_BRANCH` — Branche cible (défaut: `main`)
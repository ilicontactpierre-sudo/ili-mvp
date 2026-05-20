# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | HMR, build optimisé |
| **Backend** | Vercel Serverless Functions | Node.js | Fonctions dans `api/` |
| **Base de données** | GitHub API (fichiers JSON) | — | Stockage des stories via Git |
| **Déploiement** | Vercel | — | CI/CD auto au push sur `main` |
| **Audio** | Howler.js | 2.2.4 | Moteur audio pour stories |
| **Haptique** | Vibration API | — | Support mobile natif |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                      # Fonctions serverless Vercel
│   ├── delete.js             # DELETE /api/delete — supprime une story
│   └── publish.js            # POST /api/publish — publie une story
├── public/                   # Assets statiques (servis à la racine)
│   ├── sounds/               # Bibliothèque sonore locale
│   │   └── sounds-index.json # Index des sons disponibles
│   └── stories/              # Fichiers JSON des histoires
│       └── index.json        # Index des stories publiées
├── src/
│   ├── components/
│   │   ├── admin/            # Interface d'édition (StoryBuilder)
│   │   ├── StoryReader.jsx   # Lecteur de stories
│   │   ├── StoryMenu.jsx     # Menu de sélection
│   │   └── ...
│   ├── engine/
│   │   ├── AudioEngine.js    # Gestion audio (Howler)
│   │   └── HapticEngine.js   # Gestion haptique
│   ├── pages/
│   │   ├── HomePage.jsx      # Accueil / sélection stories
│   │   ├── StoryPage.jsx     # Lecteur (/lire/:storyId)
│   │   └── AdminPage.jsx     # Éditeur (/admin)
│   ├── utils/
│   │   ├── renderMarkdown.jsx
│   │   └── segmentAlgorithm.js
│   ├── styles/
│   │   ├── global.css
│   │   └── vfx.css
│   ├── assets/               # Images, icônes
│   ├── App.jsx               # Routes
│   └── main.jsx              # Point d'entrée
├── scripts/                  # Scripts utilitaires
│   ├── addSound.js           # Ajoute un son à la bibliothèque
│   ├── checkpoint.js         # Sauvegarde l'état courant
│   └── generateSoundsIndex.js
├── index.html
├── package.json
├── vite.config.js
├── vercel.json               # Rewrites SPA
└── publish.sh                # Script de déploiement
```

---

## 3. Flux de données principal

### Navigation
```
Routes (React Router) :
  /           → HomePage      → fetch(/public/stories/index.json)
  /lire/:id   → StoryPage     → fetch(/public/stories/{id}.json)
  /admin      → AdminPage     → édition + preview
```

### Publication d'une story (flux complet)
```
1. AdminPage (StoryBuilder) → crée/modifie storyData
2. PublishPanel → POST /api/publish { password, slug, storyData }
3. api/publish.js :
   - Vérifie ADMIN_PASSWORD
   - Écrit public/stories/{slug}.json via GitHub API
   - Met à jour public/stories/index.json via GitHub API
4. Push Git → Vercel red dé déploye automatiquement
5. La story est accessible sur /lire/{slug}
```

### Suppression d'une story
```
1. AdminPage → DELETE /api/delete { password, slug }
2. api/delete.js :
   - Vérifie ADMIN_PASSWORD
   - Supprime public/stories/{slug}.json via GitHub API
   - Met à jour public/stories/index.json
```

### Authentification
- **Pas de système d'auth utilisateur** — l'app est publique en lecture
- **Auth admin** : mot de passe simple (`ADMIN_PASSWORD`) vérifié côté serveur dans les API `/api/publish` et `/api/delete`
- **Stockage** : GitHub Content API avec `GITHUB_TOKEN` (write access au repo)

---

## 4. Points sensibles connus

### Fichiers de config critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Config Vite (React plugin uniquement, très minimal) |
| `vercel.json` | Rewrite SPA : toutes les routes → `index.html` |
| `package.json` | Scripts, dépendances, version |

### Différences local vs production
| Aspect | Local (`npm run dev`) | Production (Vercel) |
|--------|----------------------|---------------------|
| Stories | Fichiers statiques dans `public/stories/` | Mêmes fichiers, mis à jour via API + Git |
| API | Non disponibles (Vercel CLI requis) | Serverless functions actives |
| Sons | Fichiers locaux dans `public/sounds/` | Certains sons utilisent Cloudinary (CDN) |

### Assets statiques
- **Servis depuis** : `public/` → racine du site
- **Stories** : `public/stories/*.json` — chargés en `fetch()` côté client
- **Sons locaux** : `public/sounds/*.mp3` — chargés par Howler.js
- **Sons distants** : URLs Cloudinary dans les données de story

### Gestion des médias
| Type | Pipeline | Formats | CDN |
|------|----------|---------|-----|
| **Audio** | Upload manuel dans `public/sounds/` + script `generateSoundsIndex.js` | MP3 | Non (local) ou Cloudinary |
| **Images** | Dans `src/assets/` ou URLs externes | PNG, SVG | Non |
| **Icônes** | `public/icons.svg` (sprite SVG) | SVG | Non |

---

## 5. Commandes clés

```bash
npm run dev        # Démarre Vite dev server (localhost:5173)
npm run build      # Build de production → dist/
npm run preview    # Prévisualise le build en local
npm run lint       # ESLint
npm run add-sound  # Ajoute un son à la bibliothèque
./publish.sh       # Commit + push → déclenche déploiement Vercel
```

---

## 6. Variables d'environnement

### Côté serveur (Vercel Environment Variables)
| Variable | Rôle |
|----------|------|
| `ADMIN_PASSWORD` | Mot de passe pour publier/supprimer des stories |
| `GITHUB_TOKEN` | Token GitHub avec accès write au repo |
| `GITHUB_OWNER` | Propriétaire du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche cible (défaut : `main`) |

### Côté client
- Aucune variable d'environnement client n'est utilisée

---

*Généré le 20/05/2026 — Pour toute question, voir `README.md` ou `IMPLEMENTATION_SUMMARY.md`*
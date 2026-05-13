# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Plugin React (Oxc) |
| **Audio** | Howler.js | 2.2.4 | Moteur audio personnalisé (`AudioEngine`) |
| **Backend** | Vercel Serverless Functions | — | Node.js, 2 endpoints (`/api/publish`, `/api/delete`) |
| **Base de données** | GitHub (fichiers JSON) | — | Pas de BDD traditionnelle, stockage via Git |
| **Hébergement** | Vercel | — | Déploiement auto sur push vers `main` |
| **CI/CD** | Vercel (natif) | — | `publish.sh` pour commit + push |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                        # Vercel Serverless Functions
│   ├── publish.js              # Publication d'histoires (→ GitHub API)
│   └── delete.js               # Suppression d'histoires
├── public/                     # Assets statiques servis tels quels
│   ├── sounds/                 # Fichiers MP3 + index JSON
│   └── stories/                # Histoires JSON + index
├── scripts/                    # Utilitaires CLI
│   ├── addSound.js             # Ajoute un son à la bibliothèque
│   ├── checkpoint.js           # Système de sauvegarde locale
│   └── convert-stories.js      # Migration de format
├── src/
│   ├── components/
│   │   ├── admin/              # Interface d'édition (blocs son, timeline)
│   │   ├── StoryReader.jsx     # Affichage segment par segment
│   │   ├── StoryMenu.jsx       # Menu de sélection des histoires
│   │   └── …
│   ├── engine/
│   │   └── AudioEngine.js      # Moteur audio (play, fade, stop)
│   ├── pages/
│   │   ├── HomePage.jsx        # Accueil + liste histoires
│   │   ├── StoryPage.jsx       # Lecteur d'histoire (`/lire/:storyId`)
│   │   └── AdminPage.jsx       # Interface admin (`/admin`)
│   ├── utils/
│   │   └── segmentAlgorithm.js # Algo de découpage segments
│   ├── App.jsx                 # Routes
│   ├── main.jsx                # Point d'entrée
│   └── index.css               # Styles globaux
├── index.html                  # HTML d'entrée (SPA)
├── package.json                # Dépendances + scripts
├── vite.config.js              # Config Vite (minimale)
├── vercel.json                 # Rewrites SPA → index.html
└── publish.sh                  # Script de déploiement
```

---

## 3. Flux de données principal

### Lecture d'une histoire
1. **Homepage** (`/`) → fetch `/stories/index.json` → liste les histoires
2. **StoryPage** (`/lire/:storyId`) → fetch `/stories/{storyId}.json`
3. **AudioEngine** précharge les sons (`story.sounds[]`) via Howler.js
4. Navigation segment par segment → déclenche `audioEvents` (play/fade/stop)

### Publication (admin → production)
1. **AdminPage** → édite segments + blocs son → `PublishPanel`
2. `POST /api/publish` (mot de passe + storyData)
3. **Vercel Function** valide → pousse JSON vers GitHub (`public/stories/`)
4. Vercel redéploie auto → nouveaux JSON disponibles (~30s)

### Authentification
- **Pas de système d'auth complet** — mot de passe admin unique (`ADMIN_PASSWORD`)
- Stocké dans `sessionStorage` côté client, vérifié côté serveur (`/api/publish`, `/api/delete`)
- Fonctionne uniquement en production (désactivé en local)

---

## 4. Points sensibles connus

### Fichiers de config critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Config Vite (plugin React uniquement, pas d'options custom) |
| `vercel.json` | Rewrite toutes les routes vers `index.html` (SPA) |
| `package.json` | Scripts `dev`, `build`, `publish` |

### Différences local vs production
| Aspect | Local | Production |
|--------|-------|------------|
| Publication | Export JSON manuel uniquement | Auto via GitHub API |
| Suppression | Désactivée | Via `/api/delete` |
| Histoires | Fichiers statiques dans `public/stories/` | Servies par Vercel CDN |

### Assets statiques
- **Servis depuis** : `public/` → racine du site
- **Sounds** : `/sounds/{filename}.mp3` (fichiers bruts, pas de CDN dédié)
- **Stories** : `/stories/{slug}.json` (JSON brut)
- **Index** : `/stories/index.json` (liste de toutes les histoires)

### Gestion des médias (audio)
- **Format** : MP3 uniquement
- **Pipeline** : Upload manuel dans `public/sounds/` → `npm run add-sound` pour générer `sounds-index.json`
- **CDN** : Non — servis directement par Vercel (statique)
- **Préchargement** : Au démarrage de l'histoire, tous les sons sont préchargés via Howler.js

---

## 5. Commandes clés

```bash
npm run dev          # Démarre Vite dev server (localhost:5173)
npm run build        # Build de production (→ dist/)
npm run preview      # Prévisualise le build en local
npm run lint         # ESLint
npm run add-sound    # Ajoute un son à la bibliothèque
npm run checkpoint   # Sauvegarde locale (brouillons)
./publish.sh         # Commit + push vers GitHub → déploiement Vercel auto
```

---

## 6. Variables d'environnement

### Côté serveur (Vercel Functions)
- `ADMIN_PASSWORD` — Mot de passe pour publier/supprimer
- `GITHUB_TOKEN` — Token GitHub API (write access)
- `GITHUB_OWNER` — Propriétaire du repo GitHub
- `GITHUB_REPO` — Nom du repo GitHub
- `GITHUB_BRANCH` — Branche cible (défaut: `main`)

### Côté client (optionnel)
- `VITE_ADMIN_PASSWORD` — Fallback moins sécurisé (déconseillé)
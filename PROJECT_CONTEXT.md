# ILi MVP — Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router DOM 7.15.0 |
| **Bundler** | Vite | 8.0.12 | Plugin React (Oxc) |
| **Audio** | Howler.js | 2.2.4 | Moteur audio pour sons/fade |
| **Backend** | Vercel Serverless | Node.js | Fonctions dans `/api/*.js` |
| **Base de données** | GitHub API | — | Stockage JSON via Git (pas de DB traditionnelle) |
| **Hébergement** | Vercel | — | Déploiement automatique au push |
| **CI/CD** | Vercel Git | — | Build & deploy auto sur push main |

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                          # Fonctions serverless Vercel
│   ├── publish.js               # POST → publie histoire via GitHub API
│   └── delete.js                # DELETE → supprime histoire via GitHub API
├── public/                       # Assets statiques (servis par Vercel)
│   ├── sounds/                  # Fichiers audio MP3
│   │   └── sounds-index.json    # Index bibliothèque sonore
│   └── stories/                 # Fichiers JSON des histoires
│       └── index.json           # Index des histoires publiées
├── src/
│   ├── components/
│   │   ├── admin/               # Interface d'édition (timeline, publish, etc.)
│   │   ├── StoryReader.jsx      # Lecteur de segments avec effets
│   │   ├── StartScreen.jsx      # Écran de démarrage
│   │   ├── EndScreen.jsx        # Écran de fin
│   │   └── ReaderSettings.jsx   # Paramètres + progression
│   ├── engine/
│   │   ├── AudioEngine.js       # Moteur audio (play, fade, events)
│   │   └── HapticEngine.js      # Vibrations haptiques
│   ├── pages/
│   │   ├── HomePage.jsx         # Liste des histoires
│   │   ├── StoryPage.jsx        # Lecteur d'histoire
│   │   └── AdminPage.jsx        # Éditeur (auth + création)
│   ├── styles/
│   │   ├── global.css           # Variables CSS + reset
│   │   └── vfx.css              # Effets visuels (VFX tracks)
│   ├── utils/
│   │   ├── segmentAlgorithm.js  # Découpage texte local
│   │   └── renderMarkdown.jsx   # Rendu markdown inline
│   ├── App.jsx                  # Routes (React Router)
│   └── main.jsx                 # Point d'entrée
├── scripts/                      # Scripts utilitaires (addSound, convert, etc.)
├── vite.config.js               # Config Vite (basique)
├── vercel.json                  # Rewrites SPA → index.html
└── package.json                 # Dépendances + scripts
```

## 3. Flux de Données Principal

### Lecture d'une histoire
```
StoryPage → fetch(/stories/{id}.json) → AudioEngine précharge sons
→ StartScreen → utilisateur clique "Commencer"
→ StoryReader affiche segments un par un
→ À chaque segment : AudioEngine.executeEvents(audioEvents)
→ Navigation : clic/touch/keyboard → segment suivant/précédent
→ Progression sauvegardée dans localStorage
```

### Publication (Admin)
```
AdminPage (auth par mot de passe)
→ Édition : texte → segmentAlgorithm → segments
→ Timeline audio : soundTracks → convertis en audioEvents
→ PublishPanel → POST /api/publish
→ api/publish.js vérifie ADMIN_PASSWORD
→ Écrit {slug}.json + met à jour index.json via GitHub API
→ Vercel redéploie → histoire visible sur HomePage
```

### Authentification
- **Admin** : mot de passe côté client (`VITE_ADMIN_PASSWORD`) + vérification serveur (`ADMIN_PASSWORD`)
- **Session** : password stocké en `sessionStorage` pour publication auto
- **Lecteur** : pas d'auth, toutes les histoires publiées sont accessibles

## 4. Points Sensibles Connus

### Fichiers de config critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Config Vite basique (React plugin uniquement) |
| `vercel.json` | Rewrite toutes les routes vers `/index.html` (SPA) |
| `package.json` | Scripts dev/build + dépendances |

### Différences local vs production
| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| Serveur | `vite` (port 5173) | CDN Vercel + serverless |
| API publish | Non disponible (message d'avertissement) | Fonctions `/api/publish` et `/api/delete` actives |
| Stories | Fichiers dans `public/stories/` | Idem, mais versionnés sur GitHub |
| Sons | Fichiers locaux `/sounds/` | Idem, ou URLs Cloudinary dans JSON publié |

### Assets statiques
- **Servis depuis** : `public/` → racine du site
- **Stories** : `public/stories/{id}.json` (chargées en fetch côté client)
- **Sons** : `public/sounds/{filename}` ou URLs externes (Cloudinary) dans JSON publié
- **Icônes** : `public/icons.svg` (sprite SVG inline)

### Gestion des fichiers médias
| Type | Pipeline | Formats | CDN |
|------|----------|---------|-----|
| **Audio** | Upload dans `public/sounds/` + génération `sounds-index.json` via script | MP3 | Non (sauf URLs Cloudinary dans JSON publié) |
| **Images** | Pas de gestion dédiée (quelques assets dans `src/assets/`) | PNG, SVG | Non |
| **Vidéo** | Non supporté | — | — |

## 5. Commandes Clés

```bash
npm run dev        # Démarre Vite dev server (localhost:5173)
npm run build      # Build de production → dist/
npm run preview    # Prévisualise le build en local
npm run lint       # ESLint
npm run add-sound  # Script pour ajouter un son à la bibliothèque
npm run checkpoint # Restore un checkpoint + démarre dev server
npm run publish    # Lance publish.sh (déploiement manuel)
```

## 6. Variables d'Environnement

### Côté client (`.env` → `import.meta.env`)
- `VITE_ADMIN_PASSWORD` — Mot de passe admin (vérification côté client)

### Côté serveur (Vercel Environment Variables)
- `ADMIN_PASSWORD` — Mot de passe admin (vérification serverless)
- `GITHUB_TOKEN` — Token GitHub API (lecture/écriture fichiers)
- `GITHUB_OWNER` — Propriétaire du repo GitHub
- `GITHUB_REPO` — Nom du repo GitHub
- `GITHUB_BRANCH` — Branche cible (défaut : `main`)
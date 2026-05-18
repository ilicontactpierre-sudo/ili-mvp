# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router DOM 7.15.0 |
| **Bundler** | Vite | 8.0.12 | Plugin @vitejs/plugin-react 6.0.1 |
| **Audio** | Howler.js | 2.2.4 | Moteur audio pour lectures interactives |
| **Backend** | Vercel Serverless Functions | Node.js | 2 endpoints (`/api/publish`, `/api/delete`) |
| **Stockage** | GitHub API | — | Les histoires et index sont stockés sur GitHub (fichiers JSON) |
| **Déploiement** | Vercel | — | SPA + Serverless Functions |
| **CI/CD** | GitHub → Vercel | — | Déploiement automatique au push sur `main` |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                        # Vercel Serverless Functions
│   ├── publish.js              # POST — Publie une histoire (écrit sur GitHub)
│   └── delete.js               # DELETE — Supprime une histoire
├── public/                     # Assets statiques servis par Vite/Vercel
│   ├── sounds/                 # Fichiers audio (.mp3)
│   │   └── sounds-index.json   # Index des sons disponibles
│   └── stories/                # Fichiers JSON des histoires
│       └── index.json          # Index des histoires publiées
├── scripts/                    # Scripts utilitaires (CLI)
│   ├── addSound.js             # Ajoute un son à la bibliothèque
│   ├── checkpoint.js           # Script de checkpoint
│   └── convert-stories.js      # Conversion de format
├── src/
│   ├── engine/
│   │   └── AudioEngine.js      # Moteur audio (Howler.js wrapper)
│   ├── components/
│   │   ├── admin/              # Interface d'administration/édition
│   │   │   ├── UnifiedSegmentsTimeline.jsx
│   │   │   ├── FormatToolbar.jsx
│   │   │   ├── PublishPanel.jsx
│   │   │   ├── SoundBlockPanel.jsx
│   │   │   ├── SoundLibraryPicker.jsx
│   │   │   └── ...
│   │   ├── StoryReader.jsx     # Lecteur d'histoire principal
│   │   ├── StoryMenu.jsx       # Menu de sélection
│   │   ├── StartScreen.jsx
│   │   └── EndScreen.jsx
│   ├── pages/
│   │   ├── HomePage.jsx        # Route /
│   │   ├── StoryPage.jsx       # Route /lire/:storyId
│   │   └── AdminPage.jsx       # Route /admin
│   ├── utils/
│   │   ├── renderMarkdown.jsx  # Rendu markdown
│   │   └── segmentAlgorithm.js # Algo de segmentation
│   ├── styles/
│   │   └── global.css
│   ├── assets/                 # Images statiques
│   ├── App.jsx                 # Routing
│   └── main.jsx                # Point d'entrée
├── .gitignore
├── eslint.config.js
├── index.html                  # HTML d'entrée (SPA)
├── package.json
├── vercel.json                 # Rewrites SPA → index.html
└── vite.config.js
```

---

## 3. Flux de données principal

### Navigation (SPA)
```
Browser → index.html → main.jsx → App.jsx (React Router)
  → HomePage (/)
  → StoryPage (/lire/:storyId) — charge public/stories/{id}.json
  → AdminPage (/admin)
```

### Publication d'une histoire
```
AdminPage → PublishPanel → POST /api/publish
  → Vérification ADMIN_PASSWORD (env)
  → Écrit {slug}.json dans public/stories/ via GitHub API
  → Met à jour public/stories/index.json via GitHub API
  → Vercel redéploie → nouveaux fichiers disponibles
```

### Suppression d'une histoire
```
AdminPage → POST /api/delete
  → Vérification ADMIN_PASSWORD (env)
  → Supprime {slug}.json via GitHub API
  → Met à jour index.json via GitHub API
```

### Authentification
- **Pas de système d'auth utilisateur** — l'application est publique en lecture.
- **Admin** : protection par mot de passe simple (`ADMIN_PASSWORD`) envoyé dans le body des requêtes API.
- **Pas de session/token** — le mot de passe est vérifié à chaque requête API admin.

---

## 4. Points sensibles connus

### Fichiers de configuration critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Config Vite — minimaliste, plugin React uniquement |
| `vercel.json` | Rewrites toutes les routes vers `/index.html` (SPA) |
| `eslint.config.js` | Linting |
| `package.json` | Scripts, dépendances |

### Différences local / production

| Aspect | Local | Production |
|--------|-------|------------|
| **Server** | Vite dev server (HMR) | Vercel (statique + serverless) |
| **Stories** | Fichiers JSON dans `public/stories/` | Idem, mais versionnés sur GitHub et déployés via Vercel |
| **API** | Vercel CLI ou pas d'API | Vercel Serverless Functions |
| **Env vars** | `.env.local` | Variables d'environnement Vercel |

### Assets statiques

| Type | Emplacement | Service |
|------|-------------|---------|
| HTML/CSS/JS | `dist/` (build Vite) | Vercel CDN |
| Images | `src/assets/` | Bundled par Vite |
| Sons | `public/sounds/` | Vercel CDN (fichiers .mp3) |
| Histoires | `public/stories/` | Vercel CDN (fichiers .json) |

### Gestion des fichiers médias (audio)

- **Format** : MP3 uniquement
- **Stockage** : `public/sounds/` — servis directement par Vercel CDN
- **Pas de CDN externe** — tout passe par Vercel
- **Bibliothèque de sons** : indexée dans `public/sounds/sounds-index.json` (métadonnées : tags, mood, intensity, tempo)
- **Moteur audio** : `AudioEngine.js` utilise Howler.js pour play/stop/fadeIn/fadeOut/volume
- **Pas de transcodage** — les sons sont uploadés tels quels

---

## 5. Commandes clés

```bash
npm run dev        # Démarre Vite dev server (port 5173)
npm run build      # Build de production → dist/
npm run preview    # Prévisualise le build en local
npm run lint       # ESLint
npm run add-sound  # Script : ajoute un son à la bibliothèque
npm run publish    # bash publish.sh (déploiement)
```

---

## 6. Variables d'environnement

### Côté serveur (Vercel Serverless Functions)

| Variable | Rôle |
|----------|------|
| `ADMIN_PASSWORD` | Mot de passe pour les opérations admin (publish/delete) |
| `GITHUB_TOKEN` | Token GitHub API (écriture dans le repo) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche cible (défaut : `main`) |

### Côté client

| Variable | Rôle |
|----------|------|
| _Aucune variable d'environnement client n'est utilisée_ |

---

*Document généré pour compréhension rapide du projet — dernière mise à jour : 18/05/2026*
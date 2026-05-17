# PROJECT_CONTEXT — ili-mvp

Application web de lectures interactives sonorisées.

---

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router DOM 7.15.0 |
| **Bundler** | Vite | 8.0.12 | Plugin React officiel |
| **Audio** | Howler.js | 2.2.4 | Gestion playback/fade/loop |
| **Backend** | Vercel Serverless Functions | — | Node.js runtime |
| **Stockage** | GitHub API | — | Stories & index stockés sur le repo |
| **Déploiement** | Vercel | — | CI/CD auto via push Git |
| **Assets audio** | Cloudinary | — | CDN pour les sons |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                        # Vercel serverless functions
│   ├── publish.js              # POST — publie une story via GitHub API
│   └── delete.js               # DELETE — supprime une story via GitHub API
├── public/
│   ├── sounds/                 # Sons locaux (backup/library)
│   │   └── sounds-index.json   # Index des sons disponibles
│   └── stories/                # Stories JSON (locales + GitHub sync)
│       └── index.json          # Liste de toutes les stories
├── scripts/                    # Scripts utilitaires CLI
│   ├── addSound.js             # Ajoute un son à la library
│   ├── generateSoundsIndex.js  # Génère sounds-index.json
│   └── convert-stories.js      # Conversion de format
├── src/
│   ├── components/
│   │   ├── admin/              # Interface d'administration
│   │   │   ├── PublishPanel.jsx    # Formulaire de publication
│   │   │   ├── SoundBlockPanel.jsx # Édition blocs sonores
│   │   │   ├── UnifiedSegmentsTimeline.jsx
│   │   │   └── DraftManager.jsx    # Brouillons locaux
│   │   ├── StoryReader.jsx     # Affichage texte + navigation
│   │   ├── StartScreen.jsx     # Écran titre + préchargement sons
│   │   └── EndScreen.jsx       # Écran de fin
│   ├── engine/
│   │   └── AudioEngine.js      # Moteur audio (play/stop/fade/volume)
│   ├── pages/
│   │   ├── HomePage.jsx        # Liste des stories
│   │   ├── StoryPage.jsx       # Lecteur de story
│   │   └── AdminPage.jsx       # Dashboard admin
│   ├── utils/
│   │   └── segmentAlgorithm.js # Algo de segmentation texte
│   ├── styles/
│   │   └── global.css          # Variables CSS + reset
│   ├── App.jsx                 # Routing
│   └── main.jsx                # Entry point
├── index.html                  # HTML entry (Vite)
├── vite.config.js              # Config Vite
├── vercel.json                 # Rewrites SPA
└── package.json                # Dependencies + scripts
```

---

## 3. Flux de données principal

### Lecture d'une histoire
```
1. StoryPage.jsx → fetch(/stories/{storyId}.json)
2. JSON chargé → préchargement des sons (Howler) via StartScreen
3. Utilisateur clique "Commencer" → AudioEngine instancié
4. Navigation segment par segment (clic/flèches/swipe)
5. À chaque segment → AudioEngine.executeEvents(audioEvents)
   - play / stop / fadeIn / fadeOut / volume
6. Fin → EndScreen avec lien feedback
```

### Publication d'une histoire (admin)
```
1. AdminPage → PublishPanel → formula + mot de passe
2. POST /api/publish { password, slug, storyData }
3. Vercel function vérifie ADMIN_PASSWORD
4. Écrit public/stories/{slug}.json via GitHub API
5. Met à jour public/stories/index.json via GitHub API
6. Déploiement Vercel auto → nouveau contenu en ligne
```

### Authentification
- **Pas de système d'auth utilisateur** — l'app est publique
- **Admin** : mot de passe simple (`ADMIN_PASSWORD` env var) vérifié côté serveur dans les API functions
- **GitHub** : token (`GITHUB_TOKEN`) pour écrire dans le repo

---

## 4. Points sensibles connus

### Fichiers de config critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Build SPA React, aucun alias ni config spéciale |
| `vercel.json` | Rewrite toutes les routes vers `/index.html` (SPA routing) |
| `.gitignore` | Exclut `.env`, `node_modules`, `dist` |

### Différences local vs production
| Aspect | Local | Production |
|--------|-------|------------|
| Serveur | Vite dev server (port 5173) | Vercel CDN + serverless |
| Stories | Fichiers `public/stories/*.json` locaux | GitHub API → fichiers commités → Vercel deploy |
| API | Non disponible localement (Vercel functions) | Vercel serverless endpoints |
| Sons | `public/sounds/` locaux ou URLs Cloudinary | Cloudinary CDN |

### Assets statiques
- **Servis depuis** : `public/` → racine du site
- **Vite** : copie `public/` dans `dist/` au build
- **Vercel** : sert `public/` comme static assets
- **Sons** : URLs Cloudinary dans les stories (CDN) + fichiers locaux dans `public/sounds/` en backup

### Gestion des fichiers médias
| Type | Pipeline | Formats | CDN |
|------|----------|---------|-----|
| Audio | Upload Cloudinary → URL dans story JSON | MP3 | Oui (Cloudinary) |
| Images | Asset dans `src/assets/` ou `public/` | SVG, PNG | Non (Vercel static) |
| Stories | JSON édité dans l'admin → push GitHub | JSON | Non (Vercel static) |

---

## 5. Commandes clés

```bash
npm run dev        # Démarre Vite dev server (localhost:5173)
npm run build      # Build de production → dist/
npm run preview    # Prévisualise le build en local
npm run lint       # ESLint
npm run add-sound  # Ajoute un son à la library (scripts/addSound.js)
npm run publish    # Lance publish.sh (déploiement)
```

---

## 6. Variables d'environnement

| Nom | Usage | Requis |
|-----|-------|--------|
| `ADMIN_PASSWORD` | Mot de passe pour publier/supprimer des stories | Oui (prod) |
| `GITHUB_TOKEN` | Token GitHub API pour écrire les fichiers | Oui (prod) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui (prod) |
| `GITHUB_REPO` | Nom du repo GitHub | Oui (prod) |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Non |

---

*Document généré pour onboarding développeur — dernière mise à jour: 2026-05-17*
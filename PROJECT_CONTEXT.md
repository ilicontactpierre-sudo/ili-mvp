# ILi MVP — Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Plugin React (@vitejs/plugin-react) |
| **Audio** | Howler.js | 2.2.4 | Moteur de lecture audio |
| **Backend** | Vercel Serverless Functions | Node.js | API routes dans `/api` |
| **Base de données** | Supabase | JS SDK v2 | Storage pour sons + PostgreSQL |
| **Déploiement** | Vercel | — | CI/CD automatique via `git push` |

## 2. Structure des Fichiers

```
ili-mvp/
├── src/
│   ├── App.jsx                 # Routing principal
│   ├── main.jsx                # Point d'entrée
│   ├── index.css               # Styles globaux
│   ├── pages/
│   │   ├── HomePage.jsx        # Accueil + sélection d'histoire
│   │   ├── StoryPage.jsx       # Lecteur immersif
│   │   └── AdminPage.jsx       # Interface de création (protégée par mot de passe)
│   ├── components/
│   │   ├── StoryReader.jsx     # Affichage des segments
│   │   ├── StoryMenu.jsx       # Liste des histoires
│   │   ├── StartScreen.jsx     # Écran de démarrage d'une histoire
│   │   ├── EndScreen.jsx       # Écran de fin
│   │   ├── ReaderSettings.jsx  # Réglages (police, contraste)
│   │   └── admin/              # Outils de création
│   │       ├── AudioTimeline.jsx       # Timeline audio à 6 colonnes
│   │       ├── SoundBlock.jsx          # Bloc sonore dans la timeline
│   │       ├── SoundLibraryPicker.jsx  # Sélecteur de sons
│   │       ├── PublishPanel.jsx        # Export/publication
│   │       ├── DraftManager.jsx        # Sauvegarde locale (localStorage)
│   │       ├── StoryLoader.jsx         # Chargement d'histoires existantes
│   │       └── UnifiedSegmentsTimeline.jsx  # Éditeur segments + timeline
│   ├── engine/
│   │   └── AudioEngine.js      # Moteur audio (play, fade, loop, etc.)
│   └── utils/
│       └── segmentAlgorithm.js # Découpage automatique du texte
├── api/                        # Vercel Serverless Functions
│   ├── publish.js              # Publie une histoire via GitHub API
│   ├── upload-audio.js         # Upload de sons vers Supabase Storage
│   ├── upload-sound.js         # Upload alternatif
│   └── delete.js               # Suppression d'histoire
├── public/
│   ├── stories/
│   │   ├── index.json          # Index des histoires publiées
│   │   └── *.json              # Fichiers d'histoires individuelles
│   └── sounds/
│       ├── sounds-index.json   # Index de la bibliothèque sonore
│       └── *.mp3               # Fichiers audio locaux
├── scripts/
│   ├── addSound.js             # Ajout de sons en CLI
│   ├── generateSoundsIndex.js  # Génération de l'index audio
│   ├── migrate-sounds-to-supabase.js  # Migration vers Supabase
│   └── index-boom-library.js   # Indexation BOOM Library
├── vite.config.js              # Config Vite (avec fs.allow pour BOOM Library)
├── vercel.json                 # Rewrites SPA
├── package.json                # Dépendances + scripts
└── index.html                  # HTML d'entrée
```

## 3. Flux de Données Principal

### Navigation
```
HomePage → StoryPage (lire/:storyId) → EndScreen
```

### Chargement d'une histoire
1. `StoryPage` fetch `/stories/{storyId}.json` (fichier statique)
2. Parsing des segments + sons associés
3. Préchargement des sons via Howler.js
4. Affichage segment par segment avec événements audio synchronisés

### Publication (Admin → Production)
1. Admin remplit titre, auteur, slug, texte → découpage automatique en segments
2. Assignation des sons via timeline audio (soundTracks[])
3. **Publication automatique** : `POST /api/publish` → écrit les fichiers JSON sur GitHub via API
4. Vercel redéploie automatiquement (~30s)

### Auth Admin
- Mot de passe côté client (`import.meta.env.VITE_ADMIN_PASSWORD`) pour afficher l'interface
- Mot de passe côté serveur (`process.env.ADMIN_PASSWORD`) pour valider les appels API
- Stocké en `sessionStorage` pendant la session

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Bundler + `fs.allow` pour accès à BOOM Library externe |
| `vercel.json` | Rewrite SPA (`/(.*)` → `/index.html`) |
| `.env` (non commité) | Variables sensibles (Supabase, GitHub, Admin) |

### Différences Local vs Production
| Aspect | Local | Production |
|--------|-------|------------|
| **Histoires** | Fichiers JSON dans `public/stories/` | GitHub (publié via API) + Vercel sert depuis le repo |
| **Sons** | Fichiers MP3 locaux dans `public/sounds/` | Supabase Storage (URLs publiques) |
| **Publication** | Export JSON manuel | API `/api/publish` → commit GitHub automatique |
| **Suppression** | Non disponible | API `/api/delete` → commit GitHub |

### Assets Statiques
- **Servis depuis** : `/public/` → racine du site
- **Stories** : `public/stories/*.json` + `public/stories/index.json`
- **Sons locaux** : `public/sounds/*.mp3` + `public/sounds/sounds-index.json`
- **Icônes** : `public/icons.svg` (sprite SVG inline)
- **Favicon** : `public/favicon.svg`

### Gestion des Fichiers Médias
| Type | Pipeline | Formats | CDN |
|------|----------|---------|-----|
| **Audio (sons)** | Upload via admin → Supabase Storage OU fichiers locaux dans `public/sounds/` | MP3 principalement | Supabase CDN intégré |
| **Images** | Asset statique dans `src/assets/` ou `public/` | PNG, SVG | Vercel (via repo) |
| **Index audio** | Script `generateSoundsIndex.js` ou `index-boom-library.js` | JSON | — |

**Bibliothèque sonore** :
- Sons locaux : référencés par `filename` dans `sounds-index.json`
- Sons Supabase : URL directe dans le champ `url` du JSON
- Métadonnées : `id`, `label`, `categories`, `tags`, `mood`, `intensity`, `loop`, `duration`

## 5. Commandes Clés

```bash
# Développement
npm run dev          # Vite dev server (localhost:5173)

# Build
npm run build        # Build de production dans /dist

# Linting
npm run lint         # ESLint

# Prévisualisation build
npm run preview      # Sert le build en local

# Utilitaires
npm run add-sound    # Ajoute un son via CLI (scripts/addSound.js)
npm run publish      # Script bash : git add/commit/push → déclenche Vercel
npm run checkpoint   # Mode spécial : checkpoint + dev server sur 0.0.0.0:5173
```

## 6. Variables d'Environnement

### Côté Client (`.env` → `import.meta.env.VITE_*`)
- `VITE_ADMIN_PASSWORD` — Mot de passe admin (côté client)

### Côté Serveur (Vercel Environment Variables)
- `ADMIN_PASSWORD` — Validation des appels API
- `SUPABASE_URL` — URL du projet Supabase
- `SUPABASE_SERVICE_KEY` — Clé de service (admin) Supabase
- `GITHUB_TOKEN` — Token GitHub pour publication automatique
- `GITHUB_OWNER` — Propriétaire du repo GitHub
- `GITHUB_REPO` — Nom du repo GitHub
- `GITHUB_BRANCH` — Branche cible (défaut : `main`)

### Scripts (`.env` local)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GITHUB_TOKEN`

---

*Document généré pour compréhension rapide du projet. Dernière mise à jour : 2026-05-27*
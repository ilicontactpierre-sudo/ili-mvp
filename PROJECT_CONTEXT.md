# ILi MVP — Contexte Projet

Application web de lecture immersive interactive avec sons, effets visuels et gamification.

---

## 1. Stack Technique

| Couche | Technologie | Version | Rôle/Détails |
|--------|-------------|---------|--------------|
| **Frontend** | React | 19.2.6 | UI component-based avec hooks |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA (/, /lire/:id, /admin, /tutoriel) |
| **Bundler** | Vite | 8.0.12 | Build rapide + HMR |
| **Backend dev** | Express | 5.2.1 | Serveur API local (port 3001) pour upload audio, preview, publish |
| **Backend prod** | Vercel Serverless | — | Rewrites vers index.html (SPA), API via fonctions serverless |
| **Base de données** | Supabase | 2.106.1 | Storage (bucket `sounds`) + table `sounds` pour métadonnées |
| **Audio** | Howler.js | 2.2.4 | Moteur de lecture audio avec sprites, loops, spatialisation |
| **Audio enc** | @ffmpeg/ffmpeg | 0.12.15 | Encodage/compression audio côté client |
| **Recherche** | Fuse.js | 7.3.0 | Recherche fuzzy dans la bibliothèque sonore |
| **Déploiement** | Vercel | — | Hosting statique + serverless |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── package.json                    # Dépendances, scripts npm (dev, build, lint)
├── vite.config.js                  # Config Vite : proxy API, headers COOP/COEP
├── vercel.json                     # Rewrites SPA vers index.html
├── index.html                      # Point d'entrée HTML (root React)
├── .gitignore                      # Exclut .env, node_modules, dist
│
├── api/                            # Fonctions serverless Vercel (production)
│   ├── upload-audio.js             # Upload audio vers Supabase Storage
│   ├── upload-sound.js             # Upsert métadonnées son dans table sounds
│   ├── get-upload-url.js           # Génère URL signée Supabase
│   ├── preview-sound.js            # Stream audio local (dev)
│   ├── publish.js                  # Publie histoire via GitHub API
│   ├── delete-sound.js             # Supprime son (storage + DB)
│   ├── delete.js                   # Supprime ressource générique
│   ├── manage-menu.js              # Gestion menus navigation
│   ├── send-newsletter.js          # Envoi newsletter
│   └── subscribe.js                # Inscription newsletter
│
├── public/                         # Assets statiques servis par Vercel
│   ├── sounds/                     # Fichiers audio locaux + index JSON
│   │   ├── sounds-index.json       # Index complet bibliothèque sonore (id, url, tags, categories)
│   │   ├── soundq-keywords.json    # Mots-clés pour recherche
│   │   └── *.mp3                   # Sons UI (clic, whoosh, tutoriel)
│   ├── stories/                    # Histoires publiées (JSON)
│   │   ├── index.json              # Liste des histoires (id, titre, auteur, hidden)
│   │   └── *.json                  # Données d'histoire (segments, soundTracks, vfxTracks)
│   ├── fonts/                      # Polices custom (Benedict, Oanteh)
│   ├── textures/                   # Images (paper.png pour effets)
│   ├── manifest.json               # PWA manifest
│   ├── soundSearchWorker.js        # Web Worker recherche fuzzy
│   └── icons.svg                   # Sprite SVG icônes
│
├── scripts/                        # Scripts utilitaires Node.js
│   ├── dev-api-server.js           # Serveur Express dev (port 3001) — routes API locales
│   ├── addSound.js                 # CLI ajout son à la bibliothèque
│   ├── convert-stories.js          # Conversion format histoires
│   ├── generateSoundsIndex.js      # Génère sounds-index.json depuis bibliothèque
│   ├── import-soundq-keywords.cjs  # Import mots-clés SoundQ
│   ├── debug-key-mismatch.cjs      # Debug mismatch clés
│   ├── debug-soundq-row.cjs        # Debug ligne SoundQ
│   ├── check-soundq-coverage.cjs   # Vérifie couverture SoundQ
│   ├── stats-sounds.cjs            # Stats bibliothèque
│   ├── migrate-sounds-to-supabase.js # Migration vers Supabase
│   └── git-sync.sh                 # Sync Git multi-remotes
│
├── src/
│   ├── main.jsx                    # Point d'entrée React (rendu dans #root)
│   ├── App.jsx                     # Routes + sons UI globaux (clic, settings)
│   ├── index.css                   # Styles globaux (CSS variables, reset)
│   │
│   ├── pages/                      # Pages principales
│   │   ├── HomePage.jsx            # Accueil — liste des histoires
│   │   ├── StoryPage.jsx           # Lecteur d'histoire (charge StoryReader)
│   │   ├── AdminPage.jsx           # Éditeur complet (segments, sons, VFX, publish)
│   │   ├── TutorialPage.jsx        # Page tutoriel
│   │   ├── NewsletterPage.jsx      # Page newsletter
│   │   └── AnalyticsDashboard.jsx  # Dashboard analytics
│   │
│   ├── components/                 # Composants UI
│   │   ├── StoryReader.jsx         # Lecteur cœur — rendu segments, effets texte, navigation
│   │   ├── StoryReader.css         # Styles du lecteur (blur, focus, transitions)
│   │   ├── StartScreen.jsx         # Écran démarrage histoire
│   │   ├── EndScreen.jsx           # Écran fin histoire
│   │   ├── SeuilScreen.jsx         # Écran questions avant lecture (seuil)
│   │   ├── GameOverlay.jsx         # Overlay modes jeu (énigmes, timer)
│   │   ├── VfxOverlay.jsx          # Overlay effets ambiance (brouillard, pluie, feu)
│   │   ├── ReaderSettings.jsx      # Paramètres lecture (DYS, thème, emojis)
│   │   ├── StoryMenu.jsx           # Menu sélection histoire
│   │   │
│   │   └── admin/                  # Composants éditeur
│   │       ├── UnifiedSegmentsTimeline.jsx  # Timeline segments + sons + VFX
│   │       ├── SoundBlock.jsx               # Bloc son individuel
│   │       ├── SoundBlockPanel.jsx          # Panneau édition son
│   │       ├── VfxBlock.jsx                 # Bloc effet visuel
│   │       ├── VfxBlockPanel.jsx            # Panneau édition VFX
│   │       ├── AudioTimeline.jsx            # Timeline audio legacy
│   │       ├── FormatToolbar.jsx            # Toolbar formatage texte
│   │       ├── InlineFunctionMenu.jsx       # Menu fonctions inline (</pulse/>, etc.)
│   │       ├── TagsInput.jsx                # Input tags avec autocomplete
│   │       ├── SoundLibraryPicker.jsx       # Sélecteur bibliothèque sonore
│   │       ├── SoundImporter.jsx            # Import sons depuis fichier
│   │       ├── WaveformTrimmer.jsx          # Édition trim start/end
│   │       ├── PublishPanel.jsx             # Panneau publication
│   │       ├── PublishAnimation.jsx         # Animation publication
│   │       ├── OrchestrationPanel.jsx       # Panneau orchestration audio
│   │       ├── GameModePanel.jsx            # Panneau modes jeu
│   │       ├── DraftManager.jsx             # Gestion brouillons
│   │       ├── StoryLoader.jsx              # Chargement histoire existante
│   │       ├── StoryPreviewModal.jsx        # Modal aperçu
│   │       ├── AnalyticsDashboard.jsx       # Dashboard stats
│   │       ├── MenuManagerPage.jsx          # Gestion menus
│   │       ├── constants.js                 # Couleurs, configs VFX/GAME, defaults
│   │       └── README.md                    # Doc composants admin
│   │
│   ├── engine/                     # Moteurs temps réel
│   │   ├── AudioEngine.js          # Moteur audio — play/stop/fade/loop/pan/automation
│   │   └── HapticEngine.js         # Moteur haptique (vibrations)
│   │
│   ├── utils/                      # Fonctions utilitaires
│   │   ├── renderMarkdown.jsx      # Rendu Markdown → HTML avec inline functions
│   │   ├── inlineFunctions.jsx     # Parser + rendu tags </nom:args|contenu/>
│   │   ├── emojiDict.jsx           # Conversion texte → emojis
│   │   ├── bionicReading.jsx       # Mise en gras bionic reading
│   │   ├── segmentAlgorithm.js     # Découpage texte en segments
│   │   ├── soundSearch.js          # Recherche fuzzy bibliothèque
│   │   └── analytics.js            # Tracking analytics
│   │
│   └── styles/                     # Styles globaux
│       ├── global.css              # Variables CSS, reset, thèmes
│       └── vfx.css                 # Animations effets visuels (shake, glitch, etc.)
│
└── scripts/
    ├── git-sync.sh                 # Script sync Git
    └── publish.sh                  # Script publication
```

---

## 3. Flux de Données Principal

### Scénario : Lecture d'une histoire
```
1. HomePage → clic sur histoire → StoryPage
2. StoryPage charge public/stories/{storyId}.json
3. StoryReader rendu :
   - Segments textuels avec effets (</pulse/>, </glitch/>, etc.)
   - AudioEngine gère soundTracks (play/fade/stop par segment)
   - VfxOverlay gère ambiance (brouillard, pluie, feu)
   - Navigation : scroll/clic → segment suivant
4. Mémoire narrative : sessionStorage (`ili_mem_{storyId}_{key}`)
   - Permet </lire:cle|defaut/> et {{journal:cle}}
```

### Scénario : Upload son (Admin)
```
1. AdminPage → SoundImporter ou SoundLibraryPicker
2. POST /api/upload-audio (dev: localhost:3001, prod: Vercel fn)
   - Auth : password dans body
   - Compression via @ffmpeg/ffmpeg (WASM)
   - Upload vers Supabase Storage bucket `sounds`
3. POST /api/upload-sound
   - Upsert métadonnées dans table `sounds` (id, url, tags, categories)
4. Mise à jour sounds-index.json via GitHub API
```

### Scénario : Publication histoire
```
1. AdminPage → PublishPanel → POST /api/publish
2. Écrit public/stories/{slug}.json via GitHub API
3. Met à jour public/stories/index.json
4. Histoire disponible sur HomePage
```

### Authentification
- **Admin** : password simple (`ADMIN_PASSWORD` env var)
- **Lecteur** : pas d'auth, données en sessionStorage
- **Stockage credentials** : localStorage pour thème/préférences, sessionStorage pour mémoire narrative

---

## 4. Points Sensibles

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API vers localhost:3001, headers COOP/COEP pour SharedArrayBuffer (FFmpeg WASM) |
| `vercel.json` | Rewrite SPA : toutes routes → index.html |
| `package.json` | Scripts dev (`concurrently` pour lancer Vite + Express) |
| `.env` (non commité) | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` |

### Différences Local vs Production

| Aspect | Local | Production |
|--------|-------|------------|
| **Serveur API** | Express sur port 3001 | Fonctions serverless Vercel (`/api/*`) |
| **Preview audio** | Fichiers locaux via Express | URLs Supabase Storage publiques |
| **Upload audio** | Express → Supabase | Vercel fn → Supabase |
| **Stories** | Fichiers `public/stories/*.json` locaux | Même chemin, servis par Vercel CDN |
| **Build** | `vite` (dev server) | `vite build` → `dist/` → Vercel |

### Assets Statiques
- **Servis depuis** : `public/` → Vercel CDN
- **Chemins** : `/sounds/*.mp3`, `/stories/*.json`, `/fonts/*.ttf`, `/textures/*.png`
- **Cache** : géré par Vercel (CDN automatique)

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage | Métadonnées |
|------|----------|---------|----------|-------------|
| **Audio** | Upload → FFmpeg WASM (compression) → Supabase Storage | MP3, WAV, AIFF, FLAC | Bucket `sounds` (Supabase) | Table `sounds` : id, url, tags, categories, duration, loop, etc. |
| **Images** | Upload direct | PNG, JPG, SVG | Supabase Storage ou GitHub (stories) | Inline dans JSON histoires |
| **Histoires** | Édition → Publish → GitHub API | JSON | GitHub repo (`public/stories/`) | index.json : id, title, author, hidden, mood, genre |

---

## 5. Commandes Clés

```bash
# ── Développement ──
npm run dev              # Lance Vite + Express API server (concurrently)
npm run dev:clean        # Tue les processus existants et relance

# ── Build ──
npm run build            # Build Vite → dist/
npm run preview          # Preview build en local

# ── Lint ──
npm run lint             # ESLint avec règles React

# ── Utilitaires ──
npm run add-sound        # CLI : node scripts/addSound.js — ajoute un son
npm run checkpoint       # Lance un checkpoint (vite --host 0.0.0.0)
npm run publish          # bash publish.sh — publie sur Vercel
npm run sync             # bash git-sync.sh — sync multi-remotes
```

---

## 6. Variables d'Environnement

| Variable | Usage |
|----------|-------|
| `SUPABASE_URL` | URL du projet Supabase (ex: `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (admin, pour uploads) |
| `ADMIN_PASSWORD` | Mot de passe pour routes API admin (/api/upload-*, /api/publish) |
| `GITHUB_TOKEN` | Token GitHub pour publication histoires (write repo content) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) |
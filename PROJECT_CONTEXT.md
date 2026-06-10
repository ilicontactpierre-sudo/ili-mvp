# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Plugin React officiel |
| **Backend (dev)** | Node.js + Express | 5.2.1 | Serveur API local port 3001 |
| **Backend (prod)** | Vercel Serverless Functions | — | Fonctions dans `/api` |
| **Base de données** | Supabase | v2 | PostgreSQL + Storage (sons) |
| **Déploiement** | Vercel | — | CI/CD auto via Git push |
| **Audio** | Howler.js | 2.2.4 | Moteur de lecture audio |
| **FFmpeg** | @ffmpeg/ffmpeg | 0.12.15 | Compression audio côté client |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                          # Fonctions serverless Vercel (prod)
│   ├── delete-sound.js           # Supprime un son de Supabase Storage
│   ├── delete.js                 # Supprime une histoire (GitHub + Supabase)
│   ├── get-upload-url.js         # Génère une URL signée pour upload direct
│   ├── preview-sound.js          # Stream un fichier audio local (dev)
│   ├── publish.js                # Publie une histoire via GitHub API
│   ├── send-newsletter.js        # Envoie une newsletter aux abonnés
│   ├── subscribe.js              # Inscrit un email à la newsletter
│   ├── toggle-visibility.js      # Bascule la visibilité d'une histoire
│   ├── upload-audio.js           # Upload audio compressé vers Supabase
│   └── upload-sound.js           # Enregistre métadonnées son dans Supabase
│
├── public/                       # Assets statiques (servis tels quels)
│   ├── favicon.svg               # Icône de l'onglet navigateur
│   ├── icons.svg                 # Sprite SVG des icônes UI
│   ├── soundSearchWorker.js      # Web Worker pour recherche sons (non bloquant)
│   ├── sounds/                   # Bibliothèque audio
│   │   ├── sounds-index.json     # Index complet des sons (métadonnées, tags, URLs)
│   │   └── *.mp3                 # Fichiers audio individuels (extraits, whoosh, clics UI)
│   ├── stories/                  # Contenu éditorial des histoires
│   │   ├── index.json            # Liste de toutes les histoires (id, title, author)
│   │   └── *.json                # Données d'une histoire : segments, soundTracks, vfxTracks
│   ├── fonts/                    # Polices propriétaires embarquées
│   │   ├── NamoraDayanaDemo-0vqZd.ttf
│   │   └── Oanteh-rvDvA.otf
│   ├── textures/                 # Images de fond / UI
│   │   └── paper.png             # Texture papier pour effet visuel
│   └── .gitkeep                  # Garde les dossiers vides dans Git
│
├── scripts/                      # Scripts utilitaires CLI
│   ├── dev-api-server.js         # Serveur Express dev (port 3001) : preview sons, upload, publish
│   ├── addSound.js               # Ajoute un son à la bibliothèque locale
│   ├── checkpoint.js             # Mode checkpoint : sauvegarde l'état courant
│   ├── convert-stories.js        # Convertit des formats de stories (migration)
│   ├── generateSoundsIndex.js    # Génère sounds-index.json depuis un dossier
│   ├── index-boom-library.js     # Indexe la BOOM Library locale
│   ├── migrate-sounds-to-supabase.js  # Migration sons locaux → Supabase
│   ├── stats-sounds.cjs          # Stats sur la bibliothèque audio
│   ├── update-story-urls.js      # Met à jour les URLs dans les stories
│   ├── audio-dictionary.js       # Dictionnaire de termes audio
│   └── README.md                 # Documentation des scripts
│
├── src/
│   ├── components/               # Composants React réutilisables
│   │   ├── admin/                # Interface d'administration
│   │   │   ├── AnalyticsDashboard.jsx   # Stats de lecture (vues, progression, abandons)
│   │   │   ├── AudioTimeline.jsx        # Timeline visuelle des pistes audio
│   │   │   ├── constants.js             # Constantes UI admin (couleurs, labels)
│   │   │   ├── DraftManager.jsx         # Gestion des brouillons d'histoires
│   │   │   ├── FormatToolbar.jsx        # Barre d'outils formatage texte (gras, italic...)
│   │   │   ├── GameModePanel.jsx        # Configuration des game modes par segment
│   │   │   ├── OrchestrationPanel.jsx   # Orchestration audio/VFX (timeline, triggers)
│   │   │   ├── PublishAnimation.jsx     # Animation de publication (succès)
│   │   │   ├── PublishPanel.jsx         # Bouton et options de publication
│   │   │   ├── SoundBlock.jsx           # Représentation UI d'un bloc son
│   │   │   ├── SoundBlockPanel.jsx      # Éditeur de propriétés d'un bloc son
│   │   │   ├── SoundImporter.jsx        # Import de sons depuis la bibliothèque
│   │   │   ├── SoundLibraryPicker.jsx   # Sélecteur de sons avec recherche fuzzy
│   │   │   ├── StoryLoader.jsx          # Chargement d'une histoire existante
│   │   │   ├── StoryPreviewModal.jsx    # Aperçu modal d'une histoire avant publication
│   │   │   ├── UnifiedSegmentsTimeline.jsx  # Timeline unifiée segments + pistes
│   │   │   ├── VfxBlock.jsx             # Représentation UI d'un bloc VFX
│   │   │   ├── VfxBlockPanel.jsx        # Éditeur de propriétés VFX
│   │   │   └── WaveformTrimmer.jsx      # Widget de trim audio avec waveform
│   │   ├── EndScreen.jsx         # Écran de fin d'histoire (liens, feedback)
│   │   ├── GameOverlay.jsx       # Overlay interactif pour game modes (quiz, choix...)
│   │   ├── ReaderSettings.jsx    # Paramètres de lecture (vitesse, police, progression)
│   │   ├── StartScreen.jsx       # Écran de démarrage (titre, résumé, bouton start)
│   │   ├── StoryMenu.jsx         # Menu latéral de navigation entre segments
│   │   ├── StoryReader.jsx       # Composant principal d'affichage du texte segmenté
│   │   ├── StoryReader.css       # Styles spécifiques au lecteur de texte
│   │   └── VfxOverlay.jsx        # Overlay d'effets visuels (particles, transitions)
│   │   └── .gitkeep              # Garde le dossier dans Git
│   │
│   ├── engine/                   # Moteurs métier (logique indépendante de React)
│   │   ├── AudioEngine.js        # Playback audio : play, stop, fade, loop, pan, trim
│   │   ├── HapticEngine.js       # Vibrations haptiques (mobile, Web Vibration API)
│   │   └── .gitkeep              # Garde le dossier dans Git
│   │
│   ├── pages/                    # Pages routées (une par route)
│   │   ├── AdminPage.jsx         # Page admin complète (éditeur + outils)
│   │   ├── AnalyticsDashboard.jsx # Page dédiée aux statistiques
│   │   ├── HomePage.jsx          # Accueil : liste des histoires disponibles
│   │   ├── NewsletterPage.jsx    # Page d'inscription à la newsletter
│   │   └── StoryPage.jsx         # Lecteur d'histoire : navigation, audio, VFX
│   │
│   ├── styles/                   # Feuilles de style globales
│   │   ├── global.css            # Variables CSS, reset, typographie, couleurs
│   │   └── vfx.css               # Animations et effets visuels (keyframes, transitions)
│   │   └── .gitkeep              # Garde le dossier dans Git
│   │
│   ├── utils/                    # Fonctions utilitaires pures
│   │   ├── analytics.js          # Tracking événements (start, progress, finish, abandon)
│   │   ├── bionicReading.jsx     # Transformation texte en lecture bionique
│   │   ├── emojiDict.jsx         # Mapping emojis → significations
│   │   ├── renderMarkdown.jsx    # Rendu Markdown → JSX (texte enrichi)
│   │   ├── segmentAlgorithm.js   # Algorithme de découpage texte en segments
│   │   └── soundSearch.js        # Recherche fuzzy dans la bibliothèque (Fuse.js)
│   │
│   ├── assets/                   # Assets importés dans le bundle JS
│   │   ├── hero.png              # Image héro de la homepage
│   │   ├── react.svg             # Logo React (exemple Vite)
│   │   └── vite.svg              # Logo Vite (exemple)
│   │
│   ├── App.jsx                   # Configuration des routes (React Router)
│   ├── main.jsx                  # Point d'entrée React (render root)
│   └── index.css                 # Styles de base importés par main.jsx
│
├── .gitignore                    # Fichiers ignorés par Git (.env, node_modules, dist)
├── index.html                    # HTML d'entrée Vite (charge main.jsx)
├── package.json                  # Dépendances, scripts npm, métadonnées projet
├── package-lock.json             # Versions figées des dépendances
├── eslint.config.js              # Configuration ESLint (linting JS/JSX)
├── vite.config.js               # Configuration Vite (proxy API, headers COOP/COEP)
├── vercel.json                   # Configuration Vercel (rewrites SPA)
├── publish.sh                    # Script de déploiement : git push → Vercel
├── README.md                     # Documentation générale du projet
├── CHECKPOINTS.md                # Liste des checkpoints / jalons de développement
├── BUGFIX_ECRAN_NOIR.md          # Documentation d'un bugfix spécifique
├── HOMEPAGE_IMPROVEMENTS.md      # Notes d'amélioration de la homepage
├── IMPLEMENTATION_SUMMARY.md     # Résumé des implémentations
├── ORCHESTRATION_PROMPT.md       # Prompt / spec pour l'orchestration audio
├── PUBLISH_SETUP.md              # Guide de configuration du déploiement
├── REFACTORING_SUMMARY.md        # Résumé des refactorings effectués
├── boom_listing.txt              # Listing de la BOOM Library
└── keywords-export.txt           # Export des mots-clés / tags
```

---

## 3. Flux de données principal

### Lecture d'une histoire
```
1. Homepage (/) → fetch `/stories/index.json` → liste des histoires
2. Clic sur histoire → Route `/lire/:storyId`
3. StoryPage charge `/stories/{storyId}.json` (fichier statique)
4. StoryReader affiche le texte segment par segment
5. AudioEngine gère les sons synchronisés (soundTracks ou audioEvents legacy)
6. Progression sauvegardée dans localStorage
```

### Administration (upload son / publication)
```
1. AdminPage (/admin) → interface complète
2. Upload son → POST /api/upload-audio (dev: localhost:3001, prod: Vercel fn)
   - Auth par ADMIN_PASSWORD
   - Compression via @ffmpeg/ffmpeg (côté client)
   - Upload vers Supabase Storage (bucket: `sounds`)
3. Publication histoire → POST /api/publish
   - Écrit dans GitHub (API) → `public/stories/{slug}.json`
   - Met à jour `public/stories/index.json`
   - Déclenche déploiement Vercel auto
```

### Authentification
- **Pas de système d'auth utilisateur** (pas de login/mot de passe lecteur)
- **Auth admin** : par mot de passe unique (`ADMIN_PASSWORD` dans env)
- **Supabase** : utilisé en service key (admin) côté serveur uniquement

---

## 4. Points sensibles

### Fichiers de configuration critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API dev vers localhost:3001, headers COOP/COEP pour SharedArrayBuffer (FFmpeg) |
| `vercel.json` | Rewrite SPA : toutes les routes → `index.html` |
| `scripts/dev-api-server.js` | Serveur Express dev : preview sons locaux, upload Supabase, publish GitHub |
| `package.json` | Scripts npm, dépendances |

### Différences local vs production

| Aspect | Local (dev) | Production (Vercel) |
|--------|-------------|---------------------|
| **API** | Express port 3001 (`scripts/dev-api-server.js`) | Vercel Serverless Functions (`/api/*.js`) |
| **Sons** | Fichiers locaux + Supabase | Supabase Storage uniquement |
| **Stories** | Fichiers `public/stories/*.json` locaux | Fichiers pushés sur GitHub → Vercel |
| **Proxy** | Vite proxy `/api/*` → `localhost:3001` | Appels directs aux fonctions serverless |

### Assets statiques

- **Servis depuis** : dossier `public/` (Vite copy → `dist/` au build)
- **URLs** : racine du domaine (`/sounds/`, `/stories/`, `/fonts/`, etc.)
- **Cache** : géré par Vercel CDN (cache automatique)

### Gestion des fichiers médias (audio)

| Aspect | Détails |
|--------|---------|
| **Formats supportés** | MP3 (principal), WAV, AIFF, FLAC (lecture) |
| **Compression** | @ffmpeg/ffmpeg côté client → MP3 avant upload |
| **Stockage** | Supabase Storage (bucket `sounds`) |
| **CDN** | URLs publiques Supabase (CDN intégré) |
| **Métadonnées** | `sounds-index.json` : id, label, tags, categories, duration, url |
| **Recherche** | Fuse.js (fuzzy search) côté client |
| **Lecture** | Howler.js avec support trim, loop crossfade, pan/stereo, fade in/out |

---

## 5. Commandes clés

```bash
# Développement
npm run dev              # Vite + Express API (concurrently)
npm run dev:clean        # Kill les process existants + redémarre

# Build & preview
npm run build            # Build Vite → dist/
npm run preview          # Preview build local

# Qualité
npm run lint             # ESLint

# Utilitaires
npm run add-sound        # Script d'ajout de son
npm run checkpoint       # Mode checkpoint (vite --host)
npm run publish          # ./publish.sh (git push → Vercel)
```

---

## 6. Variables d'environnement

### Requises (fichier `.env` local ou Vercel)

| Variable | Usage |
|----------|-------|
| `ADMIN_PASSWORD` | Authentification endpoints admin |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (admin) |
| `GITHUB_TOKEN` | Token API GitHub (publish) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) |

### Optionnelles

| Variable | Usage |
|----------|-------|
| `.env.local` | Override local (non commité) |
| `.env.*.local` | Override par environnement |
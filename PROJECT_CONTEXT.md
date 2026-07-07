# ILi — Projet de Lecture Immersive

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI component-based avec hooks |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA (HomePage, StoryPage, AdminPage, TutorialPage) |
| **Bundler** | Vite | 8.0.12 | Build rapide avec HMR, config dans `vite.config.js` |
| **Backend dev** | Express | 5.2.1 | Serveur API local sur port 3001 (`scripts/dev-api-server.js`) |
| **Backend prod** | Vercel Serverless Functions | — | Fonctions dans `/api/*.js` déployées sur Vercel |
| **Base de données** | Supabase | 2.106.1 | Storage (bucket `sounds`) + table `sounds` pour métadonnées |
| **Audio** | Howler.js | 2.2.4 | Moteur de lecture audio avec gestion des instances, fade, loop |
| **Audio avancé** | @ffmpeg/ffmpeg | 0.12.15 | Compression audio côté client avant upload |
| **Recherche** | Fuse.js | 7.3.0 | Recherche fuzzy dans la bibliothèque de sons |
| **Déploiement** | Vercel | — | Hosting frontend + serverless functions |
| **Linting** | ESLint | 10.3.0 | Vérification code avec plugins react-hooks et react-refresh |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── index.html                    # Point d'entrée HTML (mount React)
├── package.json                  # Dépendances, scripts npm
├── vite.config.js               # Config Vite : proxy API, headers COOP/COEP
├── vercel.json                  # Rewrites SPA vers index.html
├── eslint.config.js             # Config ESLint
│
├── api/                         # Fonctions serverless Vercel (backend prod)
│   ├── delete-sound.js          # Supprime son (storage + DB Supabase)
│   ├── delete.js                # Supprime une histoire (GitHub API)
│   ├── get-upload-url.js        # Génère URL signée Supabase pour upload
│   ├── manage-menu.js           # Gestion du menu (CRUD histoires)
│   ├── preview-sound.js         # Stream audio avec range requests
│   ├── publish.js               # Publie histoire sur GitHub
│   ├── send-newsletter.js       # Envoi newsletter (intégration à venir)
│   ├── subscribe.js             # Inscription newsletter
│   ├── toggle-visibility.js     # Change visibilité histoire
│   ├── upload-audio.js          # Upload fichier audio vers Supabase
│   └── upload-sound.js          # Upsert métadonnées son dans Supabase
│
├── public/                      # Assets statiques servis par Vercel/Vite
│   ├── favicon.svg              # Favicon
│   ├── icons.svg                # Sprite SVG pour icônes UI
│   ├── manifest.json            # PWA manifest
│   ├── soundSearchWorker.js     # Web Worker pour recherche fuzzy
│   ├── tutoriel-icon.png        # Icône page tutoriel
│   │
│   ├── fonts/                   # Polices personnalisées
│   │   ├── Benedict Regular.otf # Police serif pour titres
│   │   └── Oanteh.ttf           # Police display pour logo
│   │
│   ├── sounds/                  # Sons UI et bibliothèque locale
│   │   ├── sounds-index.json    # Index des sons (ID, URL, tags, catégories)
│   │   ├── Clic ILi.mp3         # Son clic navigation
│   │   ├── Clic-Settings.mp3    # Son clic paramètres
│   │   ├── Clic_soundcheck.mp3  # Son test audio
│   │   ├── whoosh-*.mp3         # Transitions (6 variantes)
│   │   └── tutoriel-casque.mp3  # Son tutoriel
│   │
│   └── stories/                 # Histoires publiées (JSON)
│       ├── index.json           # Liste des histoires (id, title, author, hidden)
│       └── *.json               # Fichiers d'histoires individuelles
│
├── scripts/                     # Scripts utilitaires
│   ├── dev-api-server.js        # Serveur Express dev (proxy vers Supabase)
│   ├── addSound.js              # CLI ajout son à la bibliothèque
│   ├── audio-dictionary.js      # Dictionnaire mapping sons
│   ├── checkpoint.js            # Script de checkpoint git
│   ├── convert-stories.js       # Conversion format histoires
│   ├── generateSoundsIndex.js   # Génère sounds-index.json
│   ├── index-boom-library.js    # Indexe bibliothèque BOOM
│   ├── migrate-sounds-to-supabase.js  # Migration sons vers Supabase
│   ├── stats-sounds.cjs         # Stats bibliothèque sons
│   ├── update-story-urls.js     # Met à jour URLs dans histoires
│   └── git-sync.sh              # Script sync git
│
├── src/                         # Code source React
│   ├── main.jsx                 # Point d'entrée React (BrowserRouter)
│   ├── App.jsx                  # Routes + sons globaux (clic ILi)
│   ├── index.css                # Styles globaux (CSS variables)
│   │
│   ├── pages/                   # Pages principales
│   │   ├── HomePage.jsx         # Accueil avec logo animé + liste histoires
│   │   ├── StoryPage.jsx        # Lecteur d'histoire (segments + audio)
│   │   ├── AdminPage.jsx        # Interface création/édition histoires
│   │   ├── TutorialPage.jsx     # Page tutoriel
│   │   ├── NewsletterPage.jsx   # Page newsletter
│   │   └── AnalyticsDashboard.jsx # Dashboard analytics
│   │
│   ├── components/              # Composants réutilisables
│   │   ├── StoryMenu.jsx        # Menu déroulant des histoires
│   │   ├── StoryReader.jsx      # Affichage texte segmenté
│   │   ├── StoryReader.css      # Styles du lecteur
│   │   ├── StartScreen.jsx      # Écran démarrage (preload audio)
│   │   ├── EndScreen.jsx        # Écran fin d'histoire
│   │   ├── SeuilScreen.jsx      # Questions avant lecture (seuil)
│   │   ├── GameOverlay.jsx      # Overlay gamification (sound_check, etc.)
│   │   ├── VfxOverlay.jsx       # Overlay effets visuels
│   │   ├── ReaderSettings.jsx   # Paramètres lecteur (volume, progression)
│   │   │
│   │   └── admin/               # Composants interface admin
│   │       ├── AudioTimeline.jsx         # Timeline audio avec segments
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline unifiée (audio + VFX)
│   │       ├── SoundBlock.jsx            # Bloc sonore dans timeline
│   │       ├── SoundBlockPanel.jsx       # Panneau édition bloc sonore
│   │       ├── SoundLibraryPicker.jsx    # Sélecteur de sons (recherche/filtres)
│   │       ├── SoundImporter.jsx         # Import sons depuis bibliothèque
│   │       ├── WaveformTrimmer.jsx       # Édition trim (début/fin)
│   │       ├── OrchestrationPanel.jsx    # Orchestration audio (tracks)
│   │       ├── GameModePanel.jsx         # Édition gamification segments
│   │       ├── VfxBlock.jsx              # Bloc effets visuels
│   │       ├── VfxBlockPanel.jsx         # Panneau édition VFX
│   │       ├── FormatToolbar.jsx         # Toolbar formatage texte
│   │       ├── InlineFunctionMenu.jsx    # Menu fonctions inline
│   │       ├── TagsInput.jsx             # Input tags avec autocomplete
│   │       ├── DraftManager.jsx          # Gestion brouillons (localStorage)
│   │       ├── StoryLoader.jsx           # Chargement histoires existantes
│   │       ├── StoryPreviewModal.jsx     # Modal aperçu avant publication
│   │       ├── PublishPanel.jsx          # Panneau publication
│   │       ├── PublishAnimation.jsx      # Animation publication
│   │       ├── MenuManagerPage.jsx       # Gestion menu histoires
│   │       ├── AnalyticsDashboard.jsx    # Dashboard analytics
│   │       ├── constants.js              # Constantes (couleurs, dimensions)
│   │       └── README.md                 # Documentation interface audio
│   │
│   ├── engine/                  # Moteurs audio/haptique
│   │   ├── AudioEngine.js       # Moteur audio (play, fade, loop, pan, automation)
│   │   └── HapticEngine.js      # Moteur haptique (vibrations)
│   │
│   ├── styles/                  # Styles globaux
│   │   ├── global.css           # Variables CSS, reset, typography
│   │   └── vfx.css              # Styles effets visuels
│   │
│   ├── utils/                   # Utilitaires
│   │   ├── segmentAlgorithm.js  # Algorithme découpage texte en segments
│   │   ├── renderMarkdown.jsx   # Rendu markdown avec syntaxe ILi
│   │   ├── inlineFunctions.jsx  # Fonctions inline (variables, journal)
│   │   ├── bionicReading.jsx    # Mode lecture bionique
│   │   ├── emojiDict.jsx        # Dictionnaire emoji
│   │   ├── soundSearch.js       # Recherche dans bibliothèque sons
│   │   └── analytics.js         # Tracking analytics
│   │
│   └── assets/                  # Assets importés
│       ├── hero.png             # Image héro
│       ├── react.svg            # Logo React
│       └── vite.svg             # Logo Vite
│
└── .gitignore                   # Fichiers ignorés par git
```

---

## 3. Flux de Données Principal

### 3.1 Lecture d'une histoire

```
1. HomePage → clic sur histoire → navigate('/lire/:storyId')
2. StoryPage charge `/stories/${storyId}.json`
3. StartScreen précharge les sons (Howl instances)
4. AudioEngine exécute audioEvents/onSegmentChange à chaque segment
5. StoryReader affiche le texte segmenté
6. Navigation : swipe/clic gauche-droite ou flèches clavier
7. Fin → EndScreen avec options (feedback, partie suivante)
```

### 3.2 Upload d'un son (Admin)

```
1. Admin → SoundLibraryPicker → sélection son
2. Compression via @ffmpeg/ffmpeg (si nécessaire)
3. POST /api/get-upload-url → URL signée Supabase
4. PUT vers URL signée → fichier dans bucket `sounds`
5. POST /api/upload-sound → métadonnées dans table `sounds`
6. Mise à jour sounds-index.json (côté client)
```

### 3.3 Publication d'une histoire

```
1. Admin → PublishPanel → clic "Publier"
2. POST /api/publish avec storyData + slug + password
3. Serveur lit fichier existant via GitHub API
4. Écrit nouveau JSON dans `public/stories/${slug}.json`
5. Met à jour `public/stories/index.json`
6. Commit automatique sur branche main
```

### 3.4 Gestion de l'auth

| Élément | Mécanisme | Stockage |
|---------|-----------|----------|
| **Admin** | Mot de passe simple (`ADMIN_PASSWORD`) | Variable d'environnement |
| **Lecteur** | Pas d'auth requise | — |
| **Progression** | localStorage (`ili_progress_${storyId}`) | Client-side |
| **Newsletter** | Email + token (à implémenter) | Supabase DB |

---

## 4. Points Sensibles

### 4.1 Fichiers de configuration critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev, headers COOP/COEP (FFmpeg) | Audio FFmpeg cassé sans headers |
| `vercel.json` | Rewrite SPA vers index.html | Routing cassé en prod |
| `package.json` | Scripts, dépendances | Build/dev cassé |
| `.env` (local) | Variables Supabase, GitHub, Admin | Backend dev inaccessible |
| `public/stories/index.json` | Liste histoires visibles | Histoires masquées/ajoutées |
| `public/sounds/sounds-index.json` | Bibliothèque sons (recherche) | Recherche sons cassée |

### 4.2 Différences local vs production

| Aspect | Local (dev) | Production (Vercel) |
|--------|-------------|---------------------|
| **Backend API** | Express port 3001 (`scripts/dev-api-server.js`) | Vercel Serverless Functions (`/api/*.js`) |
| **Audio preview** | Fichiers locaux via `/api/preview-sound` | URLs Supabase publiques |
| **Upload audio** | Compression locale + upload Supabase | Compression locale + upload Supabase |
| **Stories** | Fichiers `public/stories/*.json` locaux | Fichiers sur GitHub (via API) |
| **Proxy** | Vite proxy vers localhost:3001 | Pas de proxy, appels directs |
| **COOP/COEP** | Headers dans vite.config.js | Headers Vercel (à configurer) |

### 4.3 Assets statiques

| Type | Chemin | Servi depuis |
|------|--------|--------------|
| **HTML/CSS/JS** | `dist/` (build) | Vercel CDN |
| **Polices** | `public/fonts/` | Vercel CDN |
| **Sons UI** | `public/sounds/` | Vercel CDN |
| **Histoires** | `public/stories/` | Vercel CDN |
| **Images** | `public/` | Vercel CDN |
| **Sons bibliothèque** | Bucket Supabase `sounds` | Supabase CDN |

### 4.4 Gestion des fichiers médias

| Aspect | Détails |
|--------|---------|
| **Formats audio supportés** | MP3, WAV, AIFF, FLAC (upload) ; MP3 (lecture optimale) |
| **Pipeline upload** | Sélection → Compression FFmpeg → Signed URL Supabase → Upload → Métadonnées DB |
| **Stockage** | Bucket Supabase `sounds` (public) |
| **Métadonnées** | Table Supabase `sounds` : id, filename, url, tags, categories, duration, loop, mood, etc. |
| **Index local** | `public/sounds/sounds-index.json` — généré par `scripts/generateSoundsIndex.js` |
| **CDN** | Supabase CDN pour les fichiers audio |
| **Trim/édition** | Côté client via WaveformTrimmer (définit trimStart/trimEnd en ms) |

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────────────────────
npm run dev           # Lance Vite + serveur API Express (concurrently)
npm run dev:clean     # Tue les process existants puis lance dev

# ── Build ──────────────────────────────────────────────────────────────────────
npm run build         # Build Vite → dossier dist/
npm run preview       # Prévisualise le build en local

# ── Linting ────────────────────────────────────────────────────────────────────
npm run lint          # Vérifie avec ESLint

# ── Utilitaires ────────────────────────────────────────────────────────────────
npm run add-sound     # CLI : ajoute un son à la bibliothèque
npm run sync          # Lance git-sync.sh (sync branches)
npm run publish       # Lance publish.sh (déploiement)
npm run checkpoint    # Crée un checkpoint git + lance dev server

# ── Scripts manuels ────────────────────────────────────────────────────────────
node scripts/generateSoundsIndex.js    # Régénère sounds-index.json
node scripts/index-boom-library.js     # Indexe bibliothèque BOOM externe
node scripts/migrate-sounds-to-supabase.js  # Migration sons vers Supabase
node scripts/update-story-urls.js      # Met à jour URLs dans histoires
```

---

## 6. Variables d'Environnement

| Variable | Usage | Requis |
|----------|-------|--------|
| `ADMIN_PASSWORD` | Authentification routes API admin (upload, publish, delete) | Oui (dev + prod) |
| `SUPABASE_URL` | URL du projet Supabase | Oui (dev + prod) |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (admin) pour uploads | Oui (dev + prod) |
| `GITHUB_TOKEN` | Token GitHub API pour publication histoires | Oui (publish) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui (publish) |
| `GITHUB_REPO` | Nom du repo GitHub | Oui (publish) |
| `GITHUB_BRANCH` | Branche cible (défaut : `main`) | Non |
| `NODE_ENV` | Mode (development/production) — utilisé dans preview-sound.js | Non |

---

## 7. Architecture Audio (AudioEngine)

L'`AudioEngine` (`src/engine/AudioEngine.js`) est le cœur du système audio :

### Capacités
- **Lecture** : play, stop, pause
- **Volume** : linéaire et perceptuel (courbe quadratique)
- **Fade** : fade in/out avec courbes personnalisables (natural, linear, ease-out, sigmoid, etc.)
- **Loop** : avec crossfade configurable (none, medium, long)
- **Pan/Stereo** : statique ou animé (sweep, oscillate, converge, diverge)
- **Trim** : sprite dynamique (trimStart/trimEnd)
- **Automation** : points d'automation de volume par segment

### Modèle d'événements
```javascript
// Format audioEvents (ancien, par segment)
{ action: 'play' | 'stop' | 'fadeIn' | 'fadeOut' | 'volume', ...params }

// Format soundTracks (nouveau, par track)
{ id, soundId, startSegmentId, endSegmentId, volume, fadeIn, fadeOut, delay, loop, pan, ... }
```

### Méthode principale
```javascript
audioEngine.onSegmentChange(currentIndex, soundTracks, segments)
// Synchronise automatiquement l'état audio avec le segment courant
# ILi — Contexte du Projet

Application de lecture immersive interactive avec orchestration sonore.

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI components, gestion état |
| **Routing** | React Router | 7.15.0 | Navigation SPA (`/`, `/lire/:storyId`, `/admin`, `/tutoriel`) |
| **Bundler** | Vite | 8.0.12 | Build + dev server avec HMR |
| **Backend dev** | Express | 5.2.1 | Serveur API local (`scripts/dev-api-server.js`, port 3001) |
| **Backend prod** | Vercel Serverless | — | Fonctions dans `api/*.js` déployées sur Vercel |
| **Base de données** | Supabase | 2.106.1 | PostgreSQL + Storage (sons, métadonnées) |
| **Audio** | Howler.js | 2.2.4 | Moteur de lecture audio (Web Audio API) |
| **Encodage** | FFmpeg.wasm | 0.12.15 | Compression audio côté client |
| **Recherche** | Fuse.js | 7.3.0 | Recherche floue dans bibliothèque sonore |
| **Déploiement** | Vercel | — | Hosting frontend + serverless functions |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── package.json                    # Déps, scripts (dev, build, publish)
├── vite.config.js                  # Config Vite + proxy API vers localhost:3001
├── vercel.json                     # Rewrites SPA (toutes routes → index.html)
├── index.html                      # Point d'entrée HTML
├── eslint.config.js                # Config linting
│
├── src/
│   ├── main.jsx                    # Bootstrap React + ReactDOM
│   ├── App.jsx                     # Routes + sons globaux (clics UI)
│   ├── index.css                   # Styles globaux + variables CSS
│   │
│   ├── pages/
│   │   ├── HomePage.jsx            # Accueil : liste des histoires (depuis index.json)
│   │   ├── StoryPage.jsx           # Lecteur immersif (cœur de l'expérience)
│   │   ├── AdminPage.jsx           # Interface admin complète (édition stories)
│   │   ├── TutorialPage.jsx        # Page tutoriel
│   │   ├── NewsletterPage.jsx      # Page newsletter
│   │   └── AnalyticsDashboard.jsx  # Dashboard analytics (admin)
│   │
│   ├── components/
│   │   ├── StoryReader.jsx         # Affichage segments texte + VFX
│   │   ├── StoryReader.css         # Styles du lecteur
│   │   ├── StartScreen.jsx         # Écran départ (preload audio + progress)
│   │   ├── EndScreen.jsx           # Écran fin (liens livre/formulaire)
│   │   ├── SeuilScreen.jsx         # Écran questions "seuil" (avant lecture)
│   │   ├── GameOverlay.jsx         # Overlay modes jeu (quiz, choix)
│   │   ├── VfxOverlay.jsx          # Overlay effets visuels
│   │   ├── ReaderSettings.jsx      # Sidebar settings (volume, navigation, progress)
│   │   ├── StoryMenu.jsx           # Menu sélection histoire
│   │   │
│   │   └── admin/                  # Composants panel admin
│   │       ├── OrchestrationPanel.jsx   # Export prompt Claude + import JSON orchestration
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline segments + tracks audio
│   │       ├── SoundBlockPanel.jsx      # Édition bloc son (volume, fade, pan, automation)
│   │       ├── VfxBlockPanel.jsx        # Édition bloc VFX
│   │       ├── SoundLibraryPicker.jsx   # Sélecteur de sons (recherche enrichie)
│   │       ├── SoundImporter.jsx        # Upload sons vers Supabase
│   │       ├── PublishPanel.jsx         # Publication stories vers GitHub
│   │       ├── DraftManager.jsx         # Gestion brouillons
│   │       ├── FormatToolbar.jsx        # Toolbar formatage texte
│   │       ├── InlineFunctionMenu.jsx   # Menu inline (actions rapides)
│   │       ├── TagsInput.jsx            # Input tags
│   │       ├── WaveformTrimmer.jsx      # Trim audio waveform
│   │       ├── AudioTimeline.jsx        # Timeline audio
│   │       ├── GameModePanel.jsx        # Panel modes jeu
│   │       ├── StoryLoader.jsx          # Chargement story dans admin
│   │       ├── StoryPreviewModal.jsx    # Modal preview
│   │       ├── PublishAnimation.jsx     # Animation publication
│   │       ├── AnalyticsDashboard.jsx   # Dashboard (duplicated?)
│   │       ├── MenuManagerPage.jsx      # Gestion menus
│   │       ├── constants.js             # Constantes UI admin
│   │       └── README.md                # Doc composants admin
│   │
│   ├── engine/
│   │   └── AudioEngine.js          # Moteur audio : play/stop/fade/loop/pan/automation
│   │
│   ├── utils/
│   │   ├── soundSearch.js          # Moteur recherche enrichi (synonymes FR↔EN + scoring)
│   │   ├── segmentAlgorithm.js     # Algo découpage texte en segments
│   │   ├── analytics.js            # Tracking événements (start, progress, finish, abandon)
│   │   ├── bionicReading.jsx       # Mode lecture bionique
│   │   ├── emojiDict.jsx           # Dictionnaire emoji
│   │   ├── inlineFunctions.jsx     # Fonctions inline (shortcodes)
│   │   └── renderMarkdown.jsx      # Rendu markdown → JSX
│   │
│   └── assets/
│       ├── hero.png                # Image hero
│       ├── react.svg               # Logo React
│       └── vite.svg                # Logo Vite
│
├── public/
│   ├── sounds/                     # Sons UI locaux (clics, whoosh)
│   │   ├── Clic ILi.mp3            # Son clic principal
│   │   ├── Clic-Settings.mp3       # Son clic settings
│   │   └── whoosh-*.mp3            # Sons transitions
│   ├── stories/
│   │   ├── index.json              # Index public des histoires (id, title, author)
│   │   ├── ili-tutoriel.json       # Story tutoriel
│   │   └── *.json                  # Autres stories (format JSON structuré)
│   ├── fonts/
│   │   ├── Benedict Regular.otf    # Police principale
│   │   └── Oanteh.ttf              # Police secondaire
│   ├── textures/
│   │   └── paper.png               # Texture papier (VFX)
│   ├── icons.svg                   # Sprite icônes SVG
│   ├── favicon.svg                 # Favicon
│   ├── manifest.json               # PWA manifest
│   └── soundSearchWorker.js        # Web Worker recherche (optionnel)
│
├── api/                            # Fonctions serverless Vercel (backend prod)
│   ├── upload-sound.js             # Upsert métadonnées son dans Supabase
│   ├── upload-audio.js             # Upload fichier audio vers Supabase Storage
│   ├── get-upload-url.js           # Génère URL signée upload
│   ├── preview-sound.js            # Stream fichier local (dev uniquement)
│   ├── delete-sound.js             # Supprime son (Storage + DB)
│   ├── publish.js                  # Publie story vers GitHub (commit API)
│   ├── delete.js                   # Supprime/masque story sur GitHub
│   ├── toggle-visibility.js        # Toggle visibilité story
│   ├── manage-menu.js              # Gestion menus (GitHub API)
│   ├── subscribe.js                # Inscription newsletter
│   └── send-newsletter.js          # Envoi newsletter (Resend API)
│
├── scripts/
│   ├── dev-api-server.js           # Serveur Express local (réplique des API Vercel)
│   ├── addSound.js                 # CLI ajout son bibliothèque
│   ├── checkpoint.js               # Script checkpoint (merge + dev)
│   ├── convert-stories.js          # Conversion format stories
│   ├── generateSoundsIndex.js      # Génération index sons
│   ├── index-boom-library.js       # Indexation BOOM Library → Supabase
│   ├── migrate-sounds-to-supabase.js # Migration sons locaux → Supabase
│   ├── update-story-urls.js        # Update URLs stories après upload
│   ├── stats-sounds.cjs            # Stats bibliothèque
│   ├── git-sync.sh                 # Sync Git (pull + push)
│   └── README.md                   # Doc scripts
│
├── .gitignore                      # Ignore .env, node_modules, builds
├── publish.sh                      # Script déploiement (build + Vercel)
├── git-sync.sh                     # Script sync Git
└── eslint.config.js                # Config ESLint
```

---

## 3. Flux de Données Principal

### 3.1 Lecture d'une histoire

```
1. Utilisateur clique sur une histoire dans HomePage
   ↓
2. Navigation → /lire/:storyId
   ↓
3. StoryPage charge `/public/stories/${storyId}.json` (fetch HTTP)
   ↓
4. Si mode "serial" → affiche CoverPage (liste des parties)
   Sinon → affiche StartScreen
   ↓
5. StartScreen preload les sons (Howler instances) + affiche progression sauvegardée
   ↓
6. Utilisateur clique "Commencer" → AudioEngine créé + lecture démarre
   ↓
7. StoryReader affiche segment courant + AudioEngine exécute audioEvents
   ↓
8. Utilisateur clique/drag → goToNext() ou goToPrevious()
   ↓
9. Progression sauvegardée dans localStorage (ReaderSettings.saveProgress)
   ↓
10. Fin → EndScreen (avec liens livre/formulaire + partie suivante si serial)
```

### 3.2 Upload d'un son (admin)

```
1. Admin → SoundImporter ou SoundLibraryPicker
   ↓
2. Sélection fichier audio → FFmpeg.wasm compresse (si besoin) → base64
   ↓
3. POST /api/upload-audio { password, filename, fileBase64 }
   ↓
4. Serveur (dev: Express / prod: Vercel) → upload vers Supabase Storage
   ↓
5. Retour : publicUrl du fichier
   ↓
6. POST /api/upload-sound { password, soundEntry } avec métadonnées
   ↓
7. Serveur → upsert dans table Supabase `sounds`
```

### 3.3 Publication d'une story

```
1. Admin → PublishPanel → clique "Publier"
   ↓
2. POST /api/publish { password, slug, storyData }
   ↓
3. Serveur lit le fichier existant via GitHub API (pour avoir le sha)
   ↓
4. Écrit `public/stories/${slug}.json` via GitHub API (commit)
   ↓
5. Met à jour `public/stories/index.json` (ajout/maj entrée)
   ↓
6. Retour : succès + message
```

### 3.4 Gestion de l'authentification

| Élément | Mécanisme | Stockage |
|---------|-----------|----------|
| **Admin** | Mot de passe unique (`ADMIN_PASSWORD`) | Envoyé dans chaque requête POST body |
| **Lecteur** | Pas d'auth requise | — |
| **Progression** | localStorage (clé = storyId ou partId) | `{ segmentIndex, finished, timestamp }` |

⚠️ **Sécurité** : Le mot de passe admin circule en clair dans le body des requêtes. En production, les API Vercel devraient vérifier via JWT ou session.

---

## 4. Points Sensibles

### 4.1 Fichiers de Configuration Critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API (`/api/*` → `localhost:3001`), headers COOP/COEP pour SharedArrayBuffer | Casser le dev local ou FFmpeg.wasm |
| `vercel.json` | Rewrite SPA (`/(.*)` → `/index.html`) | Casser le routing client-side en prod |
| `package.json` | Scripts, dépendances, version Node | Casser build/dev si modif incorrecte |
| `.env` (local) | Variables Supabase, GitHub, admin password | Nécessaire pour dev + prod local |

### 4.2 Différences Local vs Production

| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| **Backend API** | Express sur port 3001 (`scripts/dev-api-server.js`) | Fonctions serverless dans `api/*.js` |
| **Preview audio** | `/api/preview-sound` stream fichiers locaux | Désactivé (`NODE_ENV === 'production'`) |
| **Stories** | Fichiers JSON dans `public/stories/` (modifiés manuellement ou via scripts) | Commitées via GitHub API (`/api/publish`) |
| **Sons** | Supabase Storage (même bucket) | Supabase Storage (même bucket) |
| **Proxy** | Vite proxy `/api/*` → `localhost:3001` | Appels directs aux fonctions Vercel `/api/*` |

### 4.3 Assets Statiques

| Type | Chemin | Comment servis |
|------|--------|----------------|
| **Sons UI** | `public/sounds/*.mp3` | Servis statiquement par Vite (dev) / Vercel CDN (prod) |
| **Stories JSON** | `public/stories/*.json` | Fetch HTTP direct (`/stories/${id}.json`) |
| **Fonts** | `public/fonts/*.otf/.ttf` | Chargés via CSS (`@font-face`) |
| **Textures** | `public/textures/paper.png` | Utilisés par VfxOverlay |
| **Icons** | `public/icons.svg` | Sprite SVG inline |

### 4.4 Gestion des Fichiers Médias

#### Audio (sons d'ambiance, effets, musique)

| Étape | Détail |
|-------|--------|
| **Formats supportés** | MP3 (principal), WAV, FLAC, AIFF (upload) → convertis en MP3 par FFmpeg.wasm |
| **Pipeline upload** | Sélection → Compression FFmpeg (si > seuil) → base64 → POST `/api/upload-audio` → Supabase Storage (`sounds` bucket) → POST `/api/upload-sound` → table `sounds` Supabase |
| **Stockage** | Supabase Storage bucket `sounds` (fichiers) + table `sounds` (métadonnées : id, label, url, tags, categories, duration, loop, etc.) |
| **CDN** | URLs publiques Supabase (`https://*.supabase.co/storage/v1/object/public/sounds/${filename}`) — CDN intégré Supabase |
| **Métadonnées** | Table `sounds` : id, filename, label, url, tags[], categories[], boom_category, boom_subcategory, cat_id, library, mood[], loop, duration, intensity, tempo, search_string |
| **Recherche** | Moteur enrichi (`src/utils/soundSearch.js`) : synonymes FR↔EN, scoring multi-champs, bonus durée ambiance |

#### Images / VFX

| Type | Usage |
|------|-------|
| `paper.png` | Texture de fond pour effet papier (StoryReader) |
| `hero.png` | Image d'accueil |

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────────────────────
npm run dev              # Lance Vite + serveur API local (concurrently)
npm run dev:clean        # Tue les process existants + relance proprement

# ── Build ──────────────────────────────────────────────────────────────────────
npm run build            # Build Vite → dist/ (optimisé prod)
npm run preview          # Prévisualise le build en local

# ── Linting ────────────────────────────────────────────────────────────────────
npm run lint             # ESLint avec config projet

# ── Utilitaires ────────────────────────────────────────────────────────────────
npm run add-sound        # CLI : node scripts/addSound.js (ajout son bibliothèque)
npm run checkpoint       # Merge + dev (script personnalisé)
npm run publish          # bash publish.sh (déploiement Vercel)
npm run sync             # bash git-sync.sh (pull + push)

# ── Scripts one-shot ───────────────────────────────────────────────────────────
node scripts/index-boom-library.js              # Indexe BOOM Library → Supabase
node scripts/migrate-sounds-to-supabase.js      # Migration sons locaux → Supabase
node scripts/generateSoundsIndex.js             # Génère index sons
node scripts/convert-stories.js                 # Convertit format stories
node scripts/update-story-urls.js               # Update URLs après upload
node scripts/stats-sounds.cjs                   # Stats bibliothèque
```

---

## 6. Variables d'Environnement

| Variable | Usage | Requis |
|----------|-------|--------|
| `ADMIN_PASSWORD` | Authentification toutes les API admin (upload, publish, delete, etc.) | ✅ Oui |
| `SUPABASE_URL` | URL du projet Supabase (ex: `https://xxx.supabase.co`) | ✅ Oui |
| `SUPABASE_SERVICE_KEY` | Clé de service Supabase (admin, pour upsert/delete) | ✅ Oui |
| `GITHUB_TOKEN` | Token GitHub (scope `repo`) pour publier stories via API | ✅ Pour publish |
| `GITHUB_OWNER` | Propriétaire du repo GitHub (ex: `ilicontactpierre-sudo`) | ✅ Pour publish |
| `GITHUB_REPO` | Nom du repo GitHub (ex: `ili-mvp`) | ✅ Pour publish |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Optionnel |
| `RESEND_API_KEY` | Clé API Resend pour envoi newsletter | Optionnel |
| `NODE_ENV` | `development` ou `production` (auto-défini) | Auto |

---

## 7. Architecture Sonore (AudioEngine)

L'**AudioEngine** (`src/engine/AudioEngine.js`) est le cœur du moteur audio. Il gère :

- **Lecture** : `playSound()` avec Howler.js
- **Arrêt** : `stopSound()`, `stopAll(duration)` avec fade-out optionnel
- **Fades** : `fadeInSound()`, `fadeOutSound()` avec courbes personnalisées (sigmoid, cubic, log, ease-out)
- **Volume** : `setSoundVolume()` avec transition
- **Loop avec crossfade** : `loopCrossfade: "medium" | "long" | "none"` pour éviter les clics
- **Pan/stéréo** : `pan` (-1 à +1) + `panMode` (static, sweep-lr, sweep-rl, oscillate-slow/fast, converge/diverge)
- **Trim** : `trimStart`, `trimEnd` (en ms) via sprites Howler
- **Automation** : `automationPoints` — changements de volume programmés par segment avec fadeMs
- **Tracks multi-segments** : `onSegmentChange()` gère l'activation/désactivation des sons selon le segment courant

### Format d'une story JSON

```json
{
  "id": "story-id",
  "title": "Titre",
  "author": "Auteur",
  "segments": [
    { "id": "seg_1", "text": "Texte du segment 1", "audioEvents": [] },
    { "id": "seg_2", "text": "Texte du segment 2", "audioEvents": [] }
  ],
  "sounds": [
    { "id": "sound_1", "url": "https://...", "label": "Label" }
  ],
  "soundTracks": [
    {
      "id": "track_1",
      "soundId": "sound_1",
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_5",
      "volume": 0.3,
      "loop": true,
      "loopCrossfade": "medium",
      "fadeIn": 3000,
      "fadeOut": 4000,
      "delay": 0,
      "pan": 0,
      "panMode": "static",
      "automationPoints": [
        { "segmentId": "seg_3", "volume": 0.15, "fadeMs": 2500 }
      ],
      "color": "#7EC8C8",
      "muted": false,
      "broken": false
    }
  ],
  "vfxTracks": [],
  "type": "simple" | "serial",
  "parts": [ ... ]  // Seulement si type === "serial"
}
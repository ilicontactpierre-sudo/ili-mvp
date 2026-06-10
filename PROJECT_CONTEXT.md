# PROJECT_CONTEXT.md — ILi (Lecture Immersive)

**Dernière mise à jour :** 10/06/2026  
**Objectif :** Permettre à un développeur externe de comprendre l'application en 5 minutes

---

## 1. STACK TECHNIQUE

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI component-based avec hooks |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA (//, /lire/:id, /admin) |
| **Bundler** | Vite | 8.0.12 | Build tool + dev server HMR |
| **Backend dev** | Express.js | 5.2.1 | Serveur API local (port 3001) |
| **Backend prod** | Vercel Serverless | — | Fonctions dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | Stockage sons (Storage) + métadonnées (PostgreSQL) |
| **Déploiement** | Vercel + GitHub | — | Push automatique via API GitHub |
| **Audio** | Howler.js | 2.2.4 | Moteur audio Web Audio API |
| **Audio avancé** | @ffmpeg/ffmpeg | 0.12.15 | Compression audio côté client |
| **Recherche** | Fuse.js | 7.3.0 | Recherche floue bibliothèque sonore |
| **Encodage** | lamejs | 1.2.1 | Encodage MP3 |

---

## 2. STRUCTURE COMPLÈTE DES FICHIERS

```
ili-mvp/
├── index.html                        # Point d'entrée HTML (Vite)
├── package.json                      # Dépendances + scripts npm
├── package-lock.json                 # Lock des dépendances
├── vite.config.js                    # Config Vite (proxy API, COOP/COEP)
├── vercel.json                       # Rewrites SPA pour Vercel
├── eslint.config.js                  # Config linting
│
├── .env                              # Variables d'environnement (local)
├── .gitignore                        # Fichiers ignorés par git
│
├── public/                           # Assets statiques servis tels quels
│   ├── favicon.svg                   # Favicon SVG
│   ├── manifest.json                 # PWA manifest
│   ├── icons.svg                     # Sprite SVG pour icônes
│   │
│   ├── fonts/                        # Polices custom
│   │   ├── NamoraDayanaDemo-0vqZd.ttf   # Police décorative
│   │   └── Oanteh-rvDvA.otf             # Police logo
│   │
│   ├── sounds/                       # Bibliothèque sonore locale
│   │   ├── sounds-index.json         # Index métadonnées sons (ID, tags, duration…)
│   │   ├── *.mp3                     # Fichiers audio locaux
│   │   └── .gitkeep                  # Garde le dossier versionné
│   │
│   ├── textures/                     # Textures VFX
│   │   └── paper.png                 # Texture papier pour effets
│   │
│   ├── stories/                      # Histoires publiées (JSON)
│   │   ├── index.json                # Index de toutes les histoires
│   │   ├── *.json                    # Fichiers d'histoires individuelles
│   │   └── .gitkeep                  # Garde le dossier versionné
│   │
│   └── soundSearchWorker.js          # Web Worker recherche sons (Fuse.js)
│
├── api/                              # Fonctions serverless Vercel
│   ├── publish.js                    # Publication histoire → GitHub
│   ├── delete.js                     # Suppression histoire
│   ├── toggle-visibility.js          # Masquer/afficher histoire
│   ├── upload-audio.js               # Upload fichier audio → Supabase
│   ├── upload-sound.js               # Enregistrement métadonnées son → Supabase
│   ├── get-upload-url.js             # URL signée upload Supabase
│   ├── preview-sound.js              # Preview son (dev local proxy)
│   ├── subscribe.js                  # Inscription newsletter
│   └── send-newsletter.js            # Envoi newsletter
│
├── scripts/                          # Scripts utilitaires
│   ├── dev-api-server.js             # Serveur Express dev (proxy API)
│   ├── segmentAlgorithm.js           # Algo découpage texte → segments
│   ├── addSound.js                   # CLI ajout son bibliothèque
│   ├── audio-dictionary.js           # Dictionnaire audio (mapping sons)
│   ├── checkpoint.js                 # Script checkpoint/sauvegarde
│   ├── convert-stories.js            # Conversion format stories
│   ├── generateSoundsIndex.js        # Génération index sons
│   ├── index-boom-library.js         # Indexation BOOM Library
│   ├── migrate-sounds-to-supabase.js # Migration sons → Supabase
│   ├── stats-sounds.cjs              # Stats bibliothèque
│   ├── update-story-urls.js          # Mise à jour URLs stories
│   └── README.md                     # Documentation scripts
│
├── src/
│   ├── main.jsx                      # Point d'entrée React (ReactDOM.createRoot)
│   ├── App.jsx                       # Routes + sons globaux (clic ILi)
│   ├── index.css                     # Styles globaux (variables CSS)
│   │
│   ├── pages/                        # Pages principales
│   │   ├── HomePage.jsx              # Accueil avec logo animé + menu stories
│   │   ├── StoryPage.jsx             # Lecteur d'histoire (core experience)
│   │   ├── AdminPage.jsx             # Éditeur complet (segments, sons, VFX)
│   │   ├── NewsletterPage.jsx        # Page inscription newsletter
│   │   └── AnalyticsDashboard.jsx    # Dashboard analytics (importé dans Admin)
│   │
│   ├── components/                   # Composants réutilisables
│   │   ├── StartScreen.jsx           # Écran de démarrage d'une histoire
│   │   ├── EndScreen.jsx             # Écran de fin + liens livre/formulaire
│   │   ├── StoryReader.jsx           # Affichage texte segmenté + VFX
│   │   ├── StoryMenu.jsx             # Menu déroulant liste histoires
│   │   ├── ReaderSettings.jsx        # Paramètres lecture (progression, sauts)
│   │   ├── GameOverlay.jsx           # Overlay modes de jeu (gamification)
│   │   ├── VfxOverlay.jsx            # Overlay effets visuels
│   │   │
│   │   └── admin/                    # Composants éditeur
│   │       ├── DraftManager.jsx      # Gestion brouillons (sauvegarde/restauration)
│   │       ├── StoryLoader.jsx       # Chargement histoires existantes
│   │       ├── PublishPanel.jsx      # Panneau publication (JSON + auto-publish)
│   │       ├── OrchestrationPanel.jsx # Timeline audio/vidéo (soundTracks)
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline unifiée segments
│   │       ├── SoundBlockPanel.jsx   # Édition bloc son individuel
│   │       ├── VfxBlockPanel.jsx     # Édition bloc VFX
│   │       ├── SoundLibraryPicker.jsx # Sélecteur sons avec filtres
│   │       ├── SoundImporter.jsx     # Import sons depuis bibliothèque
│   │       ├── WaveformTrimmer.jsx   # Trim audio waveform
│   │       ├── FormatToolbar.jsx     # Toolbar formatage texte
│   │       ├── GameModePanel.jsx     # Configuration gamification
│   │       ├── StoryPreviewModal.jsx # Aperçu avant publication
│   │       ├── PublishAnimation.jsx  # Animation publication
│   │       ├── AudioTimeline.jsx     # Timeline audio (ancien format)
│   │       ├── SoundBlock.jsx        # Représentation bloc son
│   │       ├── VfxBlock.jsx          # Représentation bloc VFX
│   │       ├── AnalyticsDashboard.jsx # Dashboard analytics
│   │       ├── constants.js          # Constantes éditeur (couleurs, etc.)
│   │       └── README.md             # Documentation composants admin
│   │
│   ├── engine/                       # Moteurs core
│   │   ├── AudioEngine.js            # Moteur audio (Howler.js wrapper)
│   │   └── HapticEngine.js           # Moteur vibrations haptiques
│   │
│   ├── utils/                        # Utilitaires
│   │   ├── segmentAlgorithm.js       # Algo découpage narratif heuristique
│   │   ├── soundSearch.js            # Recherche/filtres bibliothèque sons
│   │   ├── analytics.js              # Tracking événements (start, progress, finish)
│   │   ├── bionicReading.jsx         # Mode lecture bionique
│   │   ├── emojiDict.jsx             # Dictionnaire émojis → texte
│   │   └── renderMarkdown.jsx        # Rendu markdown dans les segments
│   │
│   ├── assets/                       # Assets importés dans le bundle
│   │   ├── hero.png                  # Image hero
│   │   ├── react.svg                 # Logo React
│   │   └── vite.svg                  # Logo Vite
│   │
│   └── styles/                       # Styles globaux
│       ├── global.css                # Variables CSS, reset, typo
│       └── vfx.css                   # Styles effets visuels
│
├── .git/                             # Repository git
├── README.md                         # README principal
├── CHECKPOINTS.md                    # Documentation checkpoints
├── BUGFIX_ECRAN_NOIR.md              # Documentation bugfix
├── HOMEPAGE_IMPROVEMENTS.md          # Notes améliorements homepage
├── IMPLEMENTATION_SUMMARY.md         # Résumé implémentation
├── ORCHESTRATION_PROMPT.md           # Prompt orchestration
├── PUBLISH_SETUP.md                  # Setup publication
├── REFACTORING_SUMMARY.md            # Résumé refactoring
├── publish.sh                        # Script bash publication
├── boom_listing.txt                  # Listing BOOM Library
└── keywords-export.txt               # Export mots-clés
```

---

## 3. FLUX DE DONNÉES PRINCIPAL

### 3.1. Lecture d'une histoire

```
1. HomePage (accueil)
   └─> fetch('/stories/index.json') → liste histoires
   └─> Utilisateur clique sur une histoire
   └─> Navigation → /lire/:storyId

2. StoryPage (lecteur)
   └─> fetch(`/stories/${storyId}.json`) → données histoire complètes
   └─> Affiche StartScreen (titre, auteur, nb segments)
   └─> Utilisateur clique "Commencer"
   └─> Préchargement sons (Howl instances) → AudioEngine
   └─> Affiche StoryReader (segments texte)
   └─> Navigation segments (clic gauche/droite, swipe, flèches)
   └─> À chaque changement de segment :
       └─> AudioEngine.executeEvents() ou onSegmentChange()
       └─> Déclenchement sons/VFX associés
   └─> Fin → EndScreen (liens livre, formulaire, partie suivante)
```

### 3.2. Upload d'un son (Admin)

```
1. AdminPage → SoundLibraryPicker / SoundImporter
2. Sélection fichier audio local
3. Compression via @ffmpeg/ffmpeg (optionnel)
4. POST /api/get-upload-url → URL signée Supabase
5. Upload direct → Supabase Storage (depuis navigateur)
6. POST /api/upload-sound → Enregistrement métadonnées dans Supabase (table `sounds`)
7. Mise à jour locale sounds-index.json (optionnel)
```

### 3.3. Publication d'une histoire

```
1. AdminPage → PublishPanel
2. Génération JSON (segments + soundTracks convertis en audioEvents)
3. Auto-publish (si connecté) :
   └─> POST /api/publish (local) ou Vercel function (prod)
   └─> Validation mot de passe (ADMIN_PASSWORD)
   └─> Écriture `public/stories/${slug}.json` → GitHub (via API)
   └─> Mise à jour `public/stories/index.json` → GitHub
   └─> Déclenchement rebuild Vercel (webhook automatique)
4. Publication manuelle : copie JSON → commit manuel
```

### 3.4. Gestion de l'authentification

| Aspect | Mécanisme | Stockage |
|--------|-----------|----------|
| **Admin (éditeur)** | Mot de passe simple | `sessionStorage.ili_admin_password` (frontend) + `ADMIN_PASSWORD` (env) |
| **Validation** | Côté serveur (API) | Comparaison avec `process.env.ADMIN_PASSWORD` |
| **Frontend** | Vérification locale rapide | `import.meta.env.VITE_ADMIN_PASSWORD` |
| **Persistance** | Session navigateur | Perdue à la fermeture de l'onglet |

**Sécurité :** Le mot de passe est validé côté serveur dans toutes les API sensibles (`/api/publish`, `/api/upload-audio`, etc.). Une validation frontend existe pour UX mais n'est pas fiable.

---

## 4. POINTS SENSIBLES CONNUS

### 4.1. Fichiers de configuration critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev, headers COOP/COEP (SharedArrayBuffer) | Casserait FFmpeg.wasm et le proxy API local |
| `vercel.json` | Rewrite SPA (toutes routes → index.html) | Casserait le routing React en prod |
| `.env` | Variables locales (Supabase, GitHub, admin) | Casserait API et uploads en local |
| `package.json` | Scripts, dépendances | `npm run dev` lance 2 serveurs (Vite + Express) |
| `scripts/dev-api-server.js` | API locale (upload, publish, preview) | Équivalent local des fonctions Vercel |

### 4.2. Différences environnement local vs production

| Aspect | Local (dev) | Production (Vercel) |
|--------|-------------|---------------------|
| **Frontend** | Vite dev server (port 5173) | Build statique CDN |
| **Backend API** | Express port 3001 (`scripts/dev-api-server.js`) | Vercel Serverless Functions (`/api/*.js`) |
| **Proxy** | Vite proxy `/api/*` → `localhost:3001` | Vercel routing automatique `/api/*` |
| **Stories** | Fichiers `public/stories/*.json` locaux | Pushés sur GitHub → déployés par Vercel |
| **Sons** | Fichiers locaux + Supabase Storage | Uniquement Supabase Storage (CDN) |
| **Auth** | `VITE_ADMIN_PASSWORD` depuis `.env` | Variable d'environnement Vercel |

### 4.3. Assets statiques

| Type | Chemin | Comment servis |
|------|--------|----------------|
| **HTML/CSS/JS** | Bundle Vite | CDN Vercel (après build) |
| **Polices** | `public/fonts/` + Google Fonts | Servis localement + CDN Google |
| **Sons locaux** | `public/sounds/` | Servis tels quels (dev uniquement) |
| **Sons Supabase** | Storage bucket `sounds` | URL publique Supabase CDN |
| **Images/Textures** | `public/textures/`, `src/assets/` | Bundle Vite ou servis tels quels |
| **Favicon/Manifest** | `public/favicon.svg`, `public/manifest.json` | Servis tels quels |

### 4.4. Gestion des fichiers médias (audio)

| Aspect | Détails |
|--------|---------|
| **Formats supportés** | MP3 (principal), WAV, AIFF, FLAC (preview) |
| **Pipeline upload** | Fichier local → Compression FFmpeg (optionnel) → Supabase Storage → URL publique |
| **Stockage** | Supabase Storage bucket `sounds` (public) |
| **Métadonnées** | Table PostgreSQL `sounds` (id, label, tags, categories, duration, loop, mood, etc.) |
| **CDN** | Supabase fournit un CDN automatique pour le bucket `sounds` |
| **Bibliothèque locale** | `public/sounds/sounds-index.json` — index des sons BOOM Library (chemins locaux) |
| **Prévisualisation dev** | `/api/preview-sound` — stream fichier local avec range requests |
| **Encodage** | lamejs pour MP3 côté client, @ffmpeg/ffmpeg pour compression |

---

## 5. COMMANDES CLÉS

```bash
# ── Développement ──────────────────────────────────────────────────────────────
npm run dev              # Lance Vite (5173) + Express API (3001) en parallèle
npm run dev:clean        # Tue les processus existants avant de relancer

# ── Build & Preview ────────────────────────────────────────────────────────────
npm run build            # Build de production (output: dist/)
npm run preview          # Preview du build en local

# ── Qualité ────────────────────────────────────────────────────────────────────
npm run lint             # ESLint sur tout le projet

# ── Utilitaires ────────────────────────────────────────────────────────────────
npm run add-sound        # CLI ajout d'un son à la bibliothèque
node scripts/checkpoint.js  # Crée un checkpoint/sauvegarde
bash publish.sh          # Script de publication manuelle

# ── Scripts internes ───────────────────────────────────────────────────────────
node scripts/generateSoundsIndex.js   # Régénère sounds-index.json
node scripts/migrate-sounds-to-supabase.js  # Migration sons → Supabase
node scripts/index-boom-library.js    # Indexe BOOM Library locale
```

---

## 6. VARIABLES D'ENVIRONNEMENT

| Variable | Usage | Exposée (VITE\_) |
|----------|-------|------------------|
| `VITE_ADMIN_PASSWORD` | Mot de passe éditeur (frontend + backend) | ✅ |
| `VITE_SUPABASE_URL` | URL Supabase (frontend) | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (frontend) | ✅ |
| `VITE_GEMINI_API_KEY` | Clé API Gemini (fonctionnalités IA) | ✅ |
| `SUPABASE_URL` | URL Supabase (backend) | ❌ |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (backend, admin) | ❌ |
| `ADMIN_PASSWORD` | Mot de passe admin (backend) | ❌ |
| `GITHUB_TOKEN` | Personal Access Token GitHub (publication) | ❌ |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | ❌ |
| `GITHUB_REPO` | Nom du repo GitHub | ❌ |
| `GITHUB_BRANCH` | Branche de déploiement (défaut: main) | ❌ |

---

## 7. ARCHITECTURE DES DONNÉES

### 7.1. Format d'une histoire (JSON publié)

```json
{
  "id": "la-reine-margot",
  "title": "LA REINE MARGOT",
  "author": "Alexandre Dumas",
  "mood": "Mélancolique",
  "genre": "Thriller",
  "description": "...",
  "type": "simple",
  "segments": [
    {
      "id": "seg_0",
      "text": "Premier segment...",
      "audioEvents": [
        { "soundId": "airblow_...", "action": "fadeIn", "volume": 0.5, "duration": 400 }
      ]
    }
  ],
  "sounds": [
    { "id": "airblow_...", "url": "https://...supabase.../..." }
  ],
  "soundTracks": [],
  "vfxTracks": []
}
```

### 7.2. Format série (multi-parties)

```json
{
  "id": "guillaume-musso-le-crime-du-paradis",
  "title": "Le Crime du paradis",
  "type": "serial",
  "parts": [
    {
      "id": "part_1",
      "title": "Partie 1",
      "published": true,
      "segments": [...],
      "soundTracks": [...],
      "vfxTracks": [...]
    }
  ]
}
```

### 7.3. Format soundTrack (éditeur)

```json
{
  "id": "track_xxx",
  "soundId": "airblow_...",
  "startSegmentId": "seg_0",
  "endSegmentId": "seg_5",
  "volume": 0.5,
  "fadeIn": 400,
  "fadeOut": 800,
  "delay": 0,
  "loop": false,
  "loopCrossfade": "medium",
  "trimStart": 0,
  "trimEnd": 55400,
  "pan": 0,
  "panMode": "static",
  "muted": false,
  "broken": false,
  "column": 0
}
```

---

## 8. COMPOSANTS CORE

| Composant | Rôle | Fichier |
|-----------|------|---------|
| **AudioEngine** | Gère tous les sons (play, stop, fade, loop, pan) | `src/engine/AudioEngine.js` |
| **segmentAlgorithm** | Découpe texte en segments narratifs | `src/utils/segmentAlgorithm.js` |
| **StoryReader** | Affiche le texte segmenté + VFX | `src/components/StoryReader.jsx` |
| **UnifiedSegmentsTimeline** | Timeline éditeur (segments + sons + VFX) | `src/components/admin/UnifiedSegmentsTimeline.jsx` |
| **SoundLibraryPicker** | Sélecteur sons avec filtres + search | `src/components/admin/SoundLibraryPicker.jsx` |
| **PublishPanel** | Génération JSON + auto-publish | `src/components/admin/PublishPanel.jsx` |

---

## 9. NOTES IMPORTANTES

1. **COOP/COEP headers** : Requis pour `SharedArrayBuffer` (FFmpeg.wasm). Configurés dans `vite.config.js`.
2. **Double serveur dev** : Vite (5173) + Express (3001). Le proxy Vite redirige `/api/*` vers Express.
3. **Publication GitHub** : Les histoires sont stockées dans le repo GitHub, pas dans Supabase. Vercel rebuild automatiquement.
4. **Sons Supabase** : Le bucket `sounds` est public. Les URLs sont permanentes.
5. **Progression** : Sauvegardée en `localStorage` (clé: `ili_progress_${storyId}`).
6. **Mode série** : Supporte les histoires en plusieurs parties avec page de garde.
7. **Gamification** : Modes de jeu par segment (quiz, choix, etc.) via `gameMode` dans les segments.
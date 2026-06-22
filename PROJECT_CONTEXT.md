# ILi MVP — Contexte Projet

Application web de lecture immersive d'histoires sonores interactives.

---

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI composants fonctionnels + hooks |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA (`/`, `/lire/:storyId`, `/admin`) |
| **Bundler** | Vite | 8.0.12 | Dev server + build avec HMR |
| **Backend dev** | Express | 5.2.1 | Serveur API local (port 3001) |
| **Backend prod** | Vercel Serverless | — | Fonctions dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | PostgreSQL + Storage (sons, analytics, newsletter) |
| **Audio** | Howler.js | 2.2.4 | Moteur audio (play, fade, loop, spatialisation) |
| **Audio enc** | lamejs | 1.2.1 | Encodage MP3 côté client |
| **Audio ffmpeg** | @ffmpeg/ffmpeg | 0.12.15 | Traitement audio avancé (WASM) |
| **Recherche** | Fuse.js | 7.3.0 | Recherche floue bibliothèque sonore |
| **Déploiement** | Vercel | — | Hosting statique + serverless functions |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── package.json                    # Config projet + scripts npm (dev, build, lint, publish)
├── package-lock.json               # Lock des dépendances exactes
├── vite.config.js                  # Config Vite : proxy API vers localhost:3001, headers COOP/COEP
├── vercel.json                     # Rewrites SPA : toutes routes → index.html
├── eslint.config.js                # Config ESLint (rules React)
├── index.html                      # Point d'entrée HTML avec root div
│
├── .gitignore                      # Exclusions : node_modules, .env, dist/
├── git-sync.sh                     # Script sync Git multi-branches
├── publish.sh                      # Script de publication (git add/commit/push)
├── PROJECT_CONTEXT.md              # Ce fichier — documentation technique
├── PUBLISH_SETUP.md                # Guide configuration publication automatique
├── README.md                       # README par défaut Vite (peu utilisé)
│
├── api/                            # Serverless functions (Vercel + dev local via proxy)
│   ├── publish.js                  # POST /api/publish → écrit story JSON sur GitHub + maj index
│   ├── upload-audio.js             # POST /api/upload-audio → upload fichier audio vers Supabase Storage
│   ├── upload-sound.js             # POST /api/upload-sound → upsert metadata son dans table Supabase `sounds`
│   ├── get-upload-url.js           # POST /api/get-upload-url → génère URL signée pour upload direct Supabase
│   ├── delete-sound.js             # DELETE /api/delete-sound → supprime son (storage + DB Supabase)
│   ├── delete.js                   # DELETE /api/delete → supprime story JSON sur GitHub
│   ├── toggle-visibility.js        # POST /api/toggle-visibility → publie/cache story sur GitHub
│   ├── manage-menu.js              # POST /api/manage-menu → gère menu principal via GitHub
│   ├── preview-sound.js            # GET /api/preview-sound → stream fichier audio local (dev only)
│   ├── subscribe.js                # POST /api/subscribe → ajoute email dans table Supabase `subscribers`
│   └── send-newsletter.js          # POST /api/send-newsletter → envoie newsletter via API Resend
│
├── scripts/                        # Scripts utilitaires CLI (Node.js)
│   ├── dev-api-server.js           # Serveur Express dev (port 3001) — réplique locale des /api/*
│   ├── addSound.js                 # CLI ajout son à la bibliothèque (métadonnées + fichier)
│   ├── checkpoint.js               # Sauvegarde/restauration checkpoint de développement
│   ├── convert-stories.js          # Conversion format stories (ancien → nouveau format)
│   ├── generateSoundsIndex.js      # Génère sounds-index.json depuis les fichiers locaux
│   ├── index-boom-library.js       # Indexe BOOM Library dans Supabase (bulk import)
│   ├── migrate-sounds-to-supabase.js # Migration sons locaux → Supabase Storage
│   ├── update-story-urls.js        # Met à jour URLs dans les stories (batch)
│   ├── audio-dictionary.js         # Dictionnaire audio (mapping sons → métadonnées)
│   ├── stats-sounds.cjs            # Stats bibliothèque sonore (comptages, durée)
│   └── README.md                   # Documentation des scripts
│
├── public/                         # Assets statiques (copiés tels quels en build)
│   ├── favicon.svg                 # Favicon SVG
│   ├── manifest.json               # PWA manifest (nom, icônes, theme)
│   ├── icons.svg                   # Sprite SVG pour icônes UI
│   ├── soundSearchWorker.js        # Web Worker : recherche sons (Fuse.js en fond)
│   │
│   ├── fonts/                      # Polices custom chargées via @font-face
│   │   ├── Benedict Regular.otf    # Police principale (titres, UI)
│   │   └── Oanteh.ttf              # Police secondaire (corps de texte)
│   │
│   ├── sounds/                     # Sons UI et bibliothèque locale (dev)
│   │   ├── sounds-index.json       # Index metadata bibliothèque locale (id, label, url, tags)
│   │   ├── .gitkeep                # Dossier versionné mais vide par défaut
│   │   ├── Clic ILi.mp3            # Son clic principal (volume 0.6)
│   │   ├── Clic ILi simple.mp3     # Son clic simple
│   │   ├── Clic-Settings.mp3       # Son settings (volume 0.1)
│   │   ├── whoosh-1.mp3 à whoosh-6.mp3  # 6 variantes whoosh (transitions)
│   │   └── [autres sons UI]        # Sons d'interface (ex: sons BOOM Library)
│   │
│   ├── stories/                    # Fichiers JSON des histoires (publiées)
│   │   ├── index.json              # Catalogue : [{ id, title, author, mood?, genre?, description? }]
│   │   ├── .gitkeep                # Dossier versionné mais vide par défaut
│   │   ├── ili-tutoriel.json       # Histoire tutoriel (exemple)
│   │   └── [story-slug].json       # Données story complète (segments, sounds, soundTracks, vfxTracks)
│   │
│   └── textures/                   # Textures graphiques pour VFX
│       └── paper.png               # Texture papier (overlay VfxOverlay)
│
├── src/                            # Code source React (compilé par Vite)
│   ├── main.jsx                    # Point d'entrée : render(<App />, root) + BrowserRouter
│   ├── App.jsx                     # Routing (Routes) + sons UI globaux (playClicILi, playClicSettings)
│   ├── index.css                   # Styles de base (reset, variables CSS)
│   │
│   ├── pages/                      # Composants de page (un par route)
│   │   ├── HomePage.jsx            # Liste des histoires (depuis index.json) + recherche
│   │   ├── StoryPage.jsx           # Moteur de lecture : chargement story, navigation, audio, progression
│   │   ├── AdminPage.jsx           # Interface admin : création/édition stories + bibliothèque sons
│   │   ├── NewsletterPage.jsx      # Page abonnement newsletter + gestion
│   │   └── AnalyticsDashboard.jsx  # Dashboard analytics (lectures, progression, abandons)
│   │
│   ├── components/                 # Composants réutilisables
│   │   ├── StoryReader.jsx         # Cœur lecteur : affichage segments, navigation, VFX texte
│   │   ├── StoryReader.css         # Styles du lecteur (segments, transitions, VFX)
│   │   ├── StartScreen.jsx         # Écran démarrage : titre, résumé, preload audio, reprise progression
│   │   ├── EndScreen.jsx           # Écran fin : félicitations, liens, partie suivante (mode série)
│   │   ├── SeuilScreen.jsx         # Écran questions "seuil" (avant lecture, personnalisation)
│   │   ├── ReaderSettings.jsx      # Paramètres lecture : thème, vitesse, sauts, progression
│   │   ├── GameOverlay.jsx         # Overlay modes jeu : choice_branch, quiz, interactions
│   │   ├── VfxOverlay.jsx          # Overlay effets visuels : fog, rain, snow, fire, particles
│   │   ├── StoryMenu.jsx           # Menu latéral sélection histoire
│   │   │
│   │   ├── admin/                  # Composants interface admin (édition stories)
│   │   │   ├── UnifiedSegmentsTimeline.jsx # Timeline unifiée : segments + tracks audio + tracks VFX
│   │   │   ├── AudioTimeline.jsx           # Timeline audio (legacy, remplacé par Unified)
│   │   │   ├── SoundBlock.jsx              # Représentation visuelle d'un bloc son dans la timeline
│   │   │   ├── SoundBlockPanel.jsx         # Panneau édition bloc son (volume, fade, loop, pan, trim)
│   │   │   ├── VfxBlock.jsx                # Représentation visuelle d'un bloc VFX dans la timeline
│   │   │   ├── VfxBlockPanel.jsx           # Panneau édition VFX (type, mode, couleur, durée)
│   │   │   ├── WaveformTrimmer.jsx         # Éditeur waveform audio + points trim (début/fin)
│   │   │   ├── SoundImporter.jsx           # Import fichier audio (drag & drop, compression MP3)
│   │   │   ├── SoundLibraryPicker.jsx      # Sélecteur sons depuis bibliothèque (recherche Fuse.js)
│   │   │   ├── FormatToolbar.jsx           # Toolbar formatage texte (gras, italique, etc.)
│   │   │   ├── DraftManager.jsx            # Gestion brouillons (sauvegarde locale)
│   │   │   ├── StoryLoader.jsx             # Chargement story existante pour édition
│   │   │   ├── StoryPreviewModal.jsx       # Modal aperçu story (rendu temps réel)
│   │   │   ├── PublishPanel.jsx            # Panneau publication : export JSON + publish auto GitHub
│   │   │   ├── PublishAnimation.jsx        # Animation publication (3 étapes : écriture, index, deploy)
│   │   │   ├── OrchestrationPanel.jsx      # Panneau orchestration audio (mixage, automation)
│   │   │   ├── GameModePanel.jsx           # Panneau modes jeu (choice_branch, quiz, seuil)
│   │   │   ├── InlineFunctionMenu.jsx      # Menu fonctions inline ({{journal:cle}}, </lire:cle/>)
│   │   │   ├── TagsInput.jsx               # Input tags avec autocomplete (tags existants)
│   │   │   ├── MenuManagerPage.jsx         # Gestion menu principal (ordre, visibilité stories)
│   │   │   ├── AnalyticsDashboard.jsx      # Dashboard analytics (stats lectures)
│   │   │   ├── constants.js                # Constantes admin (couleurs VFX, modes audio, etc.)
│   │   │   └── README.md                   # Documentation interface admin
│   │   │
│   │   └── .gitkeep                        # Dossier versionné mais vide
│   │
│   ├── engine/                     # Moteurs métier (logique core)
│   │   ├── AudioEngine.js          # Moteur audio : wrapper Howler.js (play, fade, loop, pan, automation, trim)
│   │   ├── HapticEngine.js         # Moteur haptique : vibrations (Web Vibration API)
│   │   └── .gitkeep                # Dossier versionné mais vide
│   │
│   ├── utils/                      # Fonctions utilitaires pures
│   │   ├── segmentAlgorithm.js     # Algo découpe texte en segments (ponctuation, longueur)
│   │   ├── renderMarkdown.jsx      # Rendu Markdown → JSX (titres, gras, italique, listes)
│   │   ├── bionicReading.jsx       # Mode lecture bionique (gras premières lettres)
│   │   ├── emojiDict.jsx           # Mapping mots → emojis (mode accessibilité)
│   │   ├── inlineFunctions.jsx     # Interprète fonctions inline ({{journal:cle}}, </lire:cle/>)
│   │   ├── soundSearch.js          # Recherche sons (Fuse.js + Web Worker)
│   │   └── analytics.js            # Envoi événements lecture Supabase (start, progress, finish, abandon)
│   │
│   ├── styles/                     # Styles globaux (CSS pur)
│   │   ├── global.css              # CSS global : variables, reset, typo, couleurs, responsive
│   │   ├── vfx.css                 # Styles effets visuels : particles, fog, rain, snow, flash
│   │   └── .gitkeep                # Dossier versionné mais vide
│   │
│   └── assets/                     # Assets importés dans le bundle JS
│       ├── hero.png                # Image hero (accueil)
│       ├── react.svg               # Logo React (template Vite)
│       └── vite.svg                # Logo Vite (template Vite)
│
├── .env                            # Variables locales (non versionné — contient secrets)
├── .env.example                    # Template variables (à créer — pas de secrets)
└── PROJECT_CONTEXT.md              # Ce fichier
```

---

## 3. Flux de Données Principal

### 3.1 Lecture d'une histoire (scénario nominal)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. UTILISATEUR arrive sur HomePage                                  │
│    → GET /stories/index.json (statique, CDN Vercel)                │
│    → Affiche liste histoires (titre, auteur, mood, genre)          │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. CLIC sur une histoire → navigation /lire/:storyId               │
│    → StoryPage se mount                                             │
│    → GET /stories/${storyId}.json (statique, CDN Vercel)           │
│    → Parse JSON → storyRaw (données brutes)                        │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. STARTSCREEN : preload audio + options                           │
│    → Liste sons à précharger (story.sounds)                        │
│    → Howler.js charge chaque son (Howl instances)                  │
│    → Option "reprendre" : loadProgress(partId) depuis localStorage │
│    → Option "seuil" : questions personnalisation (SeuilScreen)     │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. LECTURE ACTIVE : StoryReader + AudioEngine                      │
│    → currentIndex = 0 (premier segment)                            │
│    → StoryReader affiche texte segment courant                     │
│    → AudioEngine.executeEvents(segment.audioEvents) OU            │
│      AudioEngine.onSegmentChange(currentIndex, soundTracks)        │
│    → Navigation : clic droit → suivant, clic gauche → précédent   │
│    → Segments "pause" : auto-avance après durée (ms)              │
│    → Progression sauvegardée : saveProgress(partId, index)        │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. FIN : EndScreen                                                 │
│    → trackFinish(storyId, segmentCount) → Supabase Analytics      │
│    → Affiche liens (livre, formulaire, partie suivante si série)  │
│    → AudioEngine.stopAll(3000) → fade out 3s                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Format JSON story (simplifié) :**
```json
{
  "id": "pierre-delaup-brooklyn",
  "title": "Brooklyn",
  "author": "Pierre Delaup",
  "mood": "mélancolique",
  "genre": "récit",
  "segments": [
    { "id": "seg_0", "text": "Il était une fois...", "audioEvents": [] },
    { "id": "seg_1", "text": "Dans une ville lointaine", "audioEvents": [
      { "action": "play", "soundId": "ambiance_forest", "volume": 0.5 }
    ]}
  ],
  "sounds": [
    { "id": "ambiance_forest", "url": "https://supabase.co/.../forest.mp3", "loop": true }
  ],
  "soundTracks": [
    { "id": "track_1", "soundId": "ambiance_forest", "startSegmentId": "seg_1", "endSegmentId": "seg_5", "volume": 0.5, "fadeIn": 2000, "fadeOut": 3000, "loop": true }
  ],
  "vfxTracks": [
    { "id": "vfx_1", "type": "fog", "startSegmentId": "seg_0", "endSegmentId": "seg_10", "mode": "dense" }
  ],
  "type": "simple"
}
```

### 3.2 Upload son (admin)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ADMIN : SoundImporter ou SoundLibraryPicker                     │
│    → Sélection fichier audio (WAV, MP3, AIFF, FLAC)               │
│    → Compression lamejs → MP3 128kbps (si nécessaire)             │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. GET URL SIGNÉE : POST /api/get-upload-url                       │
│    Body : { password, filename }                                   │
│    → Vérification ADMIN_PASSWORD                                   │
│    → Supabase : remove(filename) si existe                         │
│    → Supabase : createSignedUploadUrl(filename)                   │
│    → Retour : { signedUrl, token, publicUrl }                     │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. UPLOAD DIRECT : PUT signedUrl (navigateur → Supabase Storage)   │
│    → Upload fichier audio vers bucket `sounds`                    │
│    → Pas de transit serveur (économise bande passante)            │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. METADATA : POST /api/upload-sound                               │
│    Body : { password, soundEntry }                                 │
│    → soundEntry = { id, filename, label, url, tags, categories,   │
│                     boom_category, duration, loop, mood, ... }    │
│    → Supabase : upsert into `sounds` (onConflict: 'id')          │
│    → Retour : { success: true, action: 'upserted' }               │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Publication story (admin)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ADMIN : PublishPanel → clique "🚀 Publier mon histoire"         │
│    → Récupère adminPassword depuis sessionStorage                  │
│    → Vérifie VITE_ADMIN_PASSWORD (frontend)                       │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. BUILD : construction storyData JSON                             │
│    → Convertit soundTracks → audioEvents (par segment)            │
│    → Filtre sons utilisés → { id, url, loop }                     │
│    → Ajoute metadata : id, title, author, mood, genre, published  │
│    → Mode série : construit parties (parts) individuellement      │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. PUBLISH : POST /api/publish                                     │
│    Body : { password, slug, storyData }                            │
│    → Vérification ADMIN_PASSWORD (côté serveur)                   │
│    → GitHub API : read public/stories/${slug}.json (si existe)    │
│    → GitHub API : write public/stories/${slug}.json (PUT)         │
│    → GitHub API : read public/stories/index.json                  │
│    → GitHub API : update index.json (add/update entry)            │
│    → Commit automatique sur GITHUB_BRANCH (défaut: main)          │
│    → Retour : { success: true, isUpdate: bool, message }          │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. DEPLOY : Vercel détecte commit → build + deploy auto           │
│    → ~30 secondes                                                   │
│    → Story visible sur HomePage + /lire/:storyId                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Authentification

| Contexte | Mécanisme | Stockage |
|----------|-----------|----------|
| **Admin (frontend)** | Saisie mot de passe → comparaison avec `VITE_ADMIN_PASSWORD` | `sessionStorage.ili_admin_password` |
| **API (dev local)** | Vérification `ADMIN_PASSWORD` dans `.env` | Variable d'environnement |
| **API (prod Vercel)** | Vérification `ADMIN_PASSWORD` dans env Vercel | Variable d'environnement serverless |

**Pas d'authentification utilisateur lecteur** — les stories sont publiques.

---

## 4. Points Sensibles

### 4.1 Fichiers de configuration critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev (`/api/*` → `localhost:3001`), headers COOP/COEP (requis pour ffmpeg.wasm) | Casser proxy dev ou traitement audio WASM |
| `vercel.json` | Rewrites SPA (toutes routes → `index.html`) | Casser routing React en prod (404 sur rafraîchissement) |
| `package.json` | Scripts npm, dépendances, version | Casser build/dev si scripts ou deps modifiés incorrectement |
| `.env` (local) | Variables locales (`SUPABASE_*`, `GITHUB_*`, `ADMIN_PASSWORD`) | Casser API si URLs/clés incorrectes |
| `scripts/dev-api-server.js` | Serveur Express local (port 3001) — réplique des API Vercel | Casser dev API si routes ou logique modifiées |

### 4.2 Différences local vs production

| Aspect | Développement (local) | Production (Vercel) |
|--------|----------------------|---------------------|
| **Frontend** | Vite dev server (port 5173, HMR) | Build statique optimisé (CDN Vercel) |
| **Backend API** | Express sur port 3001 (`scripts/dev-api-server.js`) | Serverless functions dans `/api/*.js` |
| **Proxy API** | Vite proxy `/api/*` → `localhost:3001` | Appels directs aux fonctions serverless |
| **Stories** | Fichiers JSON dans `public/stories/` (local) | Même structure, servie par CDN Vercel |
| **Sons** | `public/sounds/` (locaux) + Supabase Storage | Supabase Storage uniquement (CDN Supabase) |
| **Variables** | `.env` local (`VITE_*` + serveur) | Env Vercel (mêmes noms, mêmes valeurs) |
| **Publication** | Export JSON manuel uniquement | Publication auto via GitHub API |

### 4.3 Assets statiques

- **Servis depuis** : dossier `public/` (Vite copie tel quel en build dans `dist/`)
- **Accès** : URLs à la racine (`/sounds/whoosh-1.mp3`, `/stories/index.json`, `/fonts/Benedict Regular.otf`)
- **Sons UI** : `public/sounds/` (Clic ILi, whoosh, etc.) — chargés en dur dans `App.jsx` via `new Audio()`
- **Polices** : `public/fonts/` — chargées via `@font-face` dans `global.css`
- **Textures** : `public/textures/paper.png` — utilisée par `VfxOverlay` pour effet papier
- **Workers** : `public/soundSearchWorker.js` — Web Worker pour recherche sons (ne bloque pas UI)

### 4.4 Gestion des fichiers médias

| Type | Pipeline | Formats supportés | Stockage | CDN | Métadonnées |
|------|----------|-------------------|----------|-----|-------------|
| **Audio (bibliothèque)** | Upload admin → compression lamejs (MP3 128) → Supabase Storage | MP3, WAV, AIFF, FLAC (preview dev) | Bucket `sounds` Supabase | CDN Supabase (URL publique) | Table `sounds` (id, label, url, tags, categories, duration, loop, mood, tempo, intensity, boom_category, library) |
| **Audio (UI)** | Fichiers statiques dans `public/sounds/` | MP3 | Git + Vercel CDN | Vercel CDN | Hardcodés dans `App.jsx` (clic, settings) |
| **Stories** | Édition admin → publication → commit GitHub | JSON | Repo GitHub (`public/stories/`) | Vercel CDN (via repo) | `index.json` (liste) + metadata inline dans chaque story |
| **Images/Textures** | Statiques dans `public/` | PNG, SVG | Git + Vercel CDN | Vercel CDN | Aucune (usage direct dans composants) |

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────────────────
npm run dev              # Lance Vite (5173) + serveur API Express (3001) en parallèle
npm run dev:clean        # Tue les process existants + relance propre (utile si plantage)

# ── Build ──────────────────────────────────────────────────────────────────
npm run build            # Build Vite production (output: dist/)
npm run preview          # Prévisualise build local (port 4173)

# ── Lint ───────────────────────────────────────────────────────────────────
npm run lint             # ESLint avec config projet (rules React)

# ── Utilitaires ────────────────────────────────────────────────────────────
npm run add-sound        # Script CLI ajout son à la bibliothèque (métadonnées + fichier)
npm run checkpoint       # Sauvegarde checkpoint + lance dev server
npm run publish          # Script bash publication (git add/commit/push → Vercel deploy)
npm run sync             # Script bash git-sync.sh (sync multi-branches)
```

---

## 6. Variables d'Environnement

### Frontend (exposées via `VITE_*`)

| Nom | Usage | Requis |
|-----|-------|--------|
| `VITE_SUPABASE_URL` | URL projet Supabase (lecture seule — stockage sons, analytics) | Oui |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (lecture seule) | Oui |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (frontend — comparaison côté client) | Oui |

### Backend (server-only, jamais exposées)

| Nom | Usage | Requis |
|-----|-------|--------|
| `ADMIN_PASSWORD` | Protection routes API (`/api/*`) — vérification côté serveur | Oui |
| `SUPABASE_URL` | URL Supabase (backend — mêmes valeurs que VITE_SUPABASE_URL) | Oui |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (écritures admin : upsert sounds, analytics) | Oui |
| `GITHUB_TOKEN` | Token GitHub pour commits (publication stories) | Oui (publication) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub (ex: `ilicontactpierre-sudo`) | Oui (publication) |
| `GITHUB_REPO` | Nom du repo GitHub (ex: `ili-mvp`) | Oui (publication) |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Non |
| `RESEND_API_KEY` | Clé API Resend (envoi newsletter) | Optionnel |

---

## 7. Architecture Résumé

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  HomePage   │  │  StoryPage  │  │  AdminPage  │  │ Newsletter  │ │
│  │  (liste)    │  │  (lecture)  │  │  (édition)  │  │  (abonnement)│ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                              │                                        │
│                    ┌─────────▼─────────┐                             │
│                    │    AudioEngine    │ ← Howler.js (sons, fade,   │
│                    │    (src/engine/)  │    loop, pan, automation)   │
│                    └───────────────────┘                             │
│                              │                                        │
│                    ┌─────────▼─────────┐                             │
│                    │   HapticEngine    │ ← Web Vibration API        │
│                    │    (src/engine/)  │    (vibrations segments)    │
│                    └───────────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ API calls (/api/*)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Serverless / Express dev)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  publish.js │  │ upload-*.js │  │  delete.js  │  │ subscribe   │ │
│  │  (GitHub)   │  │  (Supabase) │  │  (GitHub)   │  │  (Supabase) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
        ┌──────────┐   ┌──────────────┐   ┌──────────┐
        │  GitHub  │   │   Supabase   │   │  Resend  │
        │  (stories│   │  (Storage    │   │(newsletter│
        │   JSON)  │   │  sounds + DB)│   │  emails) │
        └──────────┘   └──────────────┘   └──────────┘
```

---

*Dernière mise à jour : 22/06/2026*
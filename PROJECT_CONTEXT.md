# ILi MVP — Contexte du Projet

Application de lecture immersive où les histoires sont découpées en segments courts, enrichies d'orchestrations sonores, d'effets visuels (VFX) et de retours haptiques.

---

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI principale, composants |
| **Routing** | React Router DOM | 7.15.0 | Navigation entre pages |
| **Bundler** | Vite | 8.0.12 | Build & dev server |
| **Audio** | Howler.js | 2.2.4 | Moteur audio (playback, sprites, spatialisation) |
| **Audio (encodage)** | lamejs | 1.2.1 | Conversion audio (MP3) |
| **Audio (FFmpeg)** | @ffmpeg/ffmpeg | 0.12.15 | Traitement audio côté client |
| **Backend (dev)** | Express | 5.2.1 | Serveur API local (`localhost:3001`) |
| **Backend (prod)** | Vercel Serverless | — | Fonctions dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | Stockage sons (table `sounds`) + storage |
| **Recherche** | Fuse.js | 7.3.0 | Recherche textuelle dans bibliothèque sonore |
| **Haptique** | Navigator.vibrate API | — | Retours vibratoires sur mobile |
| **Déploiement** | Vercel | — | Hosting frontend + serverless functions |
| **Linting** | ESLint | 10.3.0 | Qualité du code |

---

## 2. Structure des Fichiers

```
racine/
├── package.json                    # Dépendances, scripts npm
├── vite.config.js                  # Config Vite : proxy API, headers COOP/COEP
├── vercel.json                     # Rewrites SPA (toutes routes → index.html)
├── .gitignore                      # Exclusions Git (.env, node_modules, dist)
├── index.html                      # Point d'entrée HTML
├── eslint.config.js                # Config ESLint
│
├── public/                         # Assets statiques servis à la racine
│   ├── favicon.svg                 # Favicon
│   ├── manifest.json               # PWA manifest
│   ├── icons.svg                   # Sprite d'icônes SVG
│   ├── soundSearchWorker.js        # Web Worker pour recherche sons
│   ├── fonts/                      # Polices custom (NamoraDayana, Oanteh)
│   ├── sounds/                     # Sons locaux (préviews, SFX UI)
│   │   ├── sounds-index.json       # Index de la bibliothèque sonore locale
│   │   └── *.mp3                   # Fichiers audio individuels
│   ├── stories/                    # Histoires publiées (JSON)
│   │   ├── index.json              # Liste de toutes les histoires
│   │   └── *.json                  # Fichiers d'histoires individuelles
│   └── textures/                   # Textures pour VFX (paper.png)
│
├── api/                            # Fonctions serverless Vercel (prod)
│   ├── upload-sound.js             # Upsert son dans Supabase (auth par password)
│   ├── upload-audio.js             # Upload fichier audio vers Supabase storage
│   ├── get-upload-url.js           # Génère URL signée Supabase + supprime ancien fichier
│   ├── publish.js                  # Publie histoire sur GitHub (story + index)
│   ├── preview-sound.js            # Stream audio local (dev only, proxy)
│   ├── delete-sound.js             # Supprime son de Supabase
│   ├── delete.js                   # Supprime histoire de GitHub
│   ├── toggle-visibility.js        # Active/désactive visibilité histoire
│   └── send-newsletter.js          # Envoi newsletter (subscription)
│
├── scripts/                        # Utilitaires CLI
│   ├── dev-api-server.js           # Serveur Express local (réplique des API Vercel)
│   ├── addSound.js                 # Ajoute un son à la bibliothèque locale
│   ├── checkpoint.js               # Crée un point de restauration (git + build)
│   ├── convert-stories.js          # Convertit anciens formats d'histoires
│   ├── generateSoundsIndex.js      # Régénère sounds-index.json depuis un dossier
│   ├── index-boom-library.js       # Indexe une bibliothèque BOOM externe
│   ├── migrate-sounds-to-supabase.js # Migration sons locaux → Supabase
│   ├── audio-dictionary.js         # Génère dictionnaire audio (utilitaire)
│   ├── stats-sounds.cjs            # Stats sur les sons (CommonJS)
│   └── update-story-urls.js        # Met à jour les URLs dans les stories
│
├── src/
│   ├── main.jsx                    # Point d'entrée React + render
│   ├── App.jsx                     # Routes + sons UI globaux (clic, settings)
│   ├── index.css                   # Styles globaux de base
│   │
│   ├── pages/                      # Pages principales (routes)
│   │   ├── HomePage.jsx            # Liste des histoires disponibles
│   │   ├── StoryPage.jsx           # Lecteur immersif (StoryReader + contrôles)
│   │   ├── AdminPage.jsx           # Interface complète de création/édition
│   │   ├── NewsletterPage.jsx      # Page d'abonnement newsletter
│   │   └── AnalyticsDashboard.jsx  # Dashboard analytics (wrapper)
│   │
│   ├── components/                 # Composants UI
│   │   ├── StoryReader.jsx         # Cœur du lecteur : rendu segments, VFX texte
│   │   ├── StoryMenu.jsx           # Menu de sélection d'histoire
│   │   ├── StartScreen.jsx         # Écran de démarrage (avant lecture)
│   │   ├── EndScreen.jsx           # Écran de fin (après lecture)
│   │   ├── GameOverlay.jsx         # Overlay pour modes de jeu (quiz, etc.)
│   │   ├── ReaderSettings.jsx      # Paramètres de lecture (DYS, emoji, thème)
│   │   ├── VfxOverlay.jsx          # Overlay pour VFX d'ambiance (fog, rain, etc.)
│   │   │
│   │   └── admin/                  # Composants d'édition (interface admin)
│   │       ├── UnifiedSegmentsTimeline.jsx  # Timeline unifiée segments + sons + VFX
│   │       ├── AudioTimeline.jsx            # Grille timeline audio (6 colonnes)
│   │       ├── SoundBlock.jsx               # Bloc sonore interactif (drag, resize, fade)
│   │       ├── SoundBlockPanel.jsx          # Panneau d'édition d'un bloc son
│   │       ├── SoundLibraryPicker.jsx       # Modal de sélection de son
│   │       ├── SoundImporter.jsx            # Import de sons depuis fichier
│   │       ├── VfxBlock.jsx                 # Bloc VFX dans la timeline
│   │       ├── VfxBlockPanel.jsx            # Panneau d'édition VFX
│   │       ├── WaveformTrimmer.jsx          # Édition waveform (trim start/end)
│   │       ├── FormatToolbar.jsx            # Toolbar de formatage texte
│   │       ├── OrchestrationPanel.jsx       # Orchestration sonore assistée par IA
│   │       ├── GameModePanel.jsx            # Configuration des modes de jeu
│   │       ├── PublishPanel.jsx             # Interface de publication (GitHub)
│   │       ├── PublishAnimation.jsx         # Animation de publication
│   │       ├── StoryLoader.jsx              # Chargement d'une histoire existante
│   │       ├── StoryPreviewModal.jsx        # Aperçu avant publication
│   │       ├── DraftManager.jsx             # Gestion des brouillons locaux
│   │       ├── AnalyticsDashboard.jsx       # Stats de lecture
│   │       ├── constants.js                 # Constantes (couleurs, dimensions)
│   │       └── README.md                    # Documentation des composants admin
│   │
│   ├── engine/                     # Moteurs temps réel
│   │   ├── AudioEngine.js          # Gestion playback, fade, pan, loop crossfade
│   │   └── HapticEngine.js         # Gestion vibrations (mobile)
│   │
│   ├── utils/                      # Fonctions utilitaires
│   │   ├── segmentAlgorithm.js     # Découpage texte en segments
│   │   ├── renderMarkdown.jsx      # Rendu Markdown → JSX
│   │   ├── bionicReading.jsx       # Application Bionic Reading
│   │   ├── emojiDict.jsx           # Remplacement mots → emojis
│   │   ├── soundSearch.js          # Recherche dans bibliothèque (Fuse.js)
│   │   └── analytics.js            # Tracking événements (Supabase)
│   │
│   ├── assets/                     # Assets importés (images, SVG)
│   │   └── hero.png
│   │
│   └── styles/                     # Feuilles de style globales
│       ├── global.css              # Styles globaux, variables CSS
│       └── vfx.css                 # Styles pour effets visuels
```

---

## 3. Flux de Données Principal

### 3.1 Lecture d'une histoire

```
1. Utilisateur clique sur une histoire dans HomePage
   → Route `/lire/:storyId`

2. StoryPage charge le JSON : GET `/stories/{storyId}.json`
   → Fichier statique depuis `public/stories/`

3. StoryReader.jsx rend les segments un par un
   → AudioEngine charge les sons référencés via Howler.js
   → Les sons sont streamés depuis Supabase storage (URLs publiques)

4. Navigation segment par segment (scroll/swipe)
   → AudioEngine.executeEvents() déclenche les audioEvents du segment
   → HapticEngine vibre selon vfxTracks
   → VfxOverlay affiche effets d'ambiance (fog, rain, etc.)
```

### 3.2 Création/Publication d'une histoire (Admin)

```
1. Admin s'authentifie avec VITE_ADMIN_PASSWORD
   → Password stocké en sessionStorage

2. Colle un texte → segmentAlgorithm.js le découpe

3. Ajoute des sons via SoundLibraryPicker
   → Les sons sont cherchés dans :
      a) `public/sounds/sounds-index.json` (local)
      b) Supabase table `sounds` (uploadés)

4. Configure l'orchestration sur UnifiedSegmentsTimeline
   → soundTracks[] stockés dans l'état React
   → Conversion en audioEvents[] à l'export

5. Publie via PublishPanel
   → POST /api/publish avec password + storyData
   → Écrit `public/stories/{slug}.json` sur GitHub
   → Met à jour `public/stories/index.json` sur GitHub
```

### 3.3 Upload d'un son (Admin)

```
1. Admin importe un fichier audio dans SoundImporter
   → Compression via lamejs (MP3) ou @ffmpeg/ffmpeg

2. POST /api/get-upload-url
   → Retourne signedUrl Supabase + publicUrl
   → Supprime l'ancien fichier si conflit

3. PUT vers signedUrl (upload direct vers Supabase storage)

4. POST /api/upload-sound
   → Upsert dans table Supabase `sounds`
   → Métadonnées : id, label, url, tags, categories, etc.
```

### 3.4 Authentification

| Contexte | Mécanisme | Stockage |
|----------|-----------|----------|
| **Admin (dev/prod)** | Password unique comparé à `VITE_ADMIN_PASSWORD` | sessionStorage (`ili_admin_password`) |
| **API serverless** | Password envoyé dans le body, comparé à `ADMIN_PASSWORD` (env var serveur) | — |
| **Supabase (lecture)** | Clé anon `VITE_SUPABASE_ANON_KEY` dans les headers | — |
| **Supabase (écriture)** | Service role key `SUPABASE_SERVICE_KEY` (côté serveur uniquement) | — |

---

## 4. Points Sensibles Connus

### 4.1 Fichiers de Configuration Critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API vers localhost:3001, headers COOP/COEP (requis pour SharedArrayBuffer/FFmpeg) | Casserait le dev local et le traitement audio |
| `vercel.json` | Rewrite SPA (`/(.*)` → `/index.html`) | Casserait le routing React en prod |
| `package.json` | Scripts, dépendances | `npm run dev` lance 2 processus : API + Vite |
| `.gitignore` | Exclut `.env*`, `dist`, `node_modules` | Risque de commit de secrets si modifié |

### 4.2 Différences Local vs Production

| Aspect | Développement | Production |
|--------|---------------|------------|
| **API** | Express sur `localhost:3001` (scripts/dev-api-server.js) | Vercel Serverless Functions (`/api/*.js`) |
| **Assets** | servis par Vite dev server | servis par Vercel CDN |
| **Stories** | fichiers statiques dans `public/stories/` | mêmes fichiers, mais déployés via GitHub API |
| **Sons** | Supabase storage (URLs publiques) | identique |
| **Variables env** | `.env` local (VITE_*) | Variables d'environnement Vercel |
| **CORS** | géré par le proxy Vite | géré par Vercel (same-origin) |

### 4.3 Assets Statiques

| Type | Chemin | Comment servis |
|------|--------|----------------|
| **HTML/CSS/JS** | `dist/` (build) | Vercel CDN |
| **Polices** | `public/fonts/*.ttf/*.otf` | URL directe (`/fonts/...`) |
| **Sons UI** | `public/sounds/*.mp3` | URL directe (`/sounds/...`) |
| **Histoires** | `public/stories/*.json` | URL directe (`/stories/...`) |
| **Bibliothèque sons** | `public/sounds/sounds-index.json` | Fetch au chargement de l'admin |
| **Textures VFX** | `public/textures/paper.png` | Import CSS/JS |

### 4.4 Gestion des Fichiers Médias

#### Audio

| Aspect | Détails |
|--------|---------|
| **Formats supportés** | MP3, WAV, AIFF, FLAC (lecture) ; MP3 (upload via lamejs) |
| **Pipeline d'upload** | Fichier → lamejs/FFmpeg (compression) → Supabase storage → metadata dans table `sounds` |
| **Stockage** | Supabase Storage bucket `sounds` (public) |
| **CDN** | Supabase CDN (sous-jacent) |
| **Prévisualisation** | Howler.js avec extrait de 3s (admin) |
| **Métadonnées** | Table Supabase `sounds` : id, label, url, filename, tags[], categories[], boom_category, duration, loop, mood[], intensity, tempo, search_string |

#### Images/Textures

| Aspect | Détails |
|--------|---------|
| **Usage** | Textures pour VFX (ex: paper.png pour effet vieux papier) |
| **Stockage** | `public/textures/` (statique) |
| **Format** | PNG |

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────────────────────
npm run dev           # Lance API locale (3001) + Vite (5173) en parallèle
npm run dev:clean     # Tue les processus existants avant de lancer dev

# ── Build & Preview ────────────────────────────────────────────────────────────
npm run build         # Build Vite → dist/
npm run preview       # Preview du build en local

# ── Qualité ─────────────────────────────────────────────────────────────────────
npm run lint          # ESLint sur tout le projet

# ── Utilitaires ─────────────────────────────────────────────────────────────────
npm run add-sound     # Ajoute un son à la bibliothèque locale (scripts/addSound.js)
npm run checkpoint    # Crée un point de restauration (git stash + build)
npm run publish       # Déploie sur Vercel (bash publish.sh)

# ── Scripts manuels ─────────────────────────────────────────────────────────────
node scripts/generateSoundsIndex.js    # Régénère sounds-index.json
node scripts/convert-stories.js         # Convertit anciens formats d'histoires
node scripts/migrate-sounds-to-supabase.js  # Migration sons locaux → Supabase
node scripts/index-boom-library.js      # Indexe bibliothèque BOOM externe
```

---

## 6. Variables d'Environnement

| Nom | Contexte | Usage |
|-----|----------|-------|
| `VITE_SUPABASE_URL` | Frontend | URL de base Supabase (ex: `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Clé anon pour lectures publiques (R LS respectées) |
| `VITE_ADMIN_PASSWORD` | Frontend | Mot de passe pour accéder à l'admin |
| `SUPABASE_URL` | Backend (serverless) | Identique à VITE_SUPABASE_URL |
| `SUPABASE_SERVICE_KEY` | Backend (serverless) | Clé service role (écriture totale, contournement R LS) |
| `ADMIN_PASSWORD` | Backend (serverless) | Identique à VITE_ADMIN_PASSWORD (vérification API) |
| `GITHUB_TOKEN` | Backend (serverless) | Token GitHub pour publier stories via API |
| `GITHUB_OWNER` | Backend (serverless) | Propriétaire du repo GitHub (ex: `ilicontactpierre-sudo`) |
| `GITHUB_REPO` | Backend (serverless) | Nom du repo GitHub (ex: `ili-mvp`) |
| `GITHUB_BRANCH` | Backend (serverless) | Branche cible (défaut: `main`) |

---

## 7. Architecture des Données

### Structure d'une histoire (JSON)

```javascript
{
  id: "slug-de-l-histoire",
  title: "Titre",
  author: "Auteur",
  mood: "ambiance",
  genre: "genre",
  description: "description",
  type: "simple" | "serial",          // simple = 1 partie, serial = plusieurs parties
  
  // Mode simple
  segments: [
    { id: "seg_1", text: "Texte du segment", audioEvents: [] },
    // ...
  ],
  soundTracks: [                       // Nouveau format (timeline)
    {
      id: "track_xxx",
      soundId: "rain_01",
      startSegmentId: "seg_1",
      endSegmentId: "seg_5",
      column: 0,
      volume: 0.3,
      fadeIn: 2000,                    // ms
      fadeOut: 3000,                   // ms
      delay: 0,                        // ms
      loop: true,
      muted: false,
      loopCrossfade: "medium",         // none | medium | long
      trimStart: 0,                    // ms
      trimEnd: null,                   // ms
      pan: 0,                          // -1 à 1
      panMode: "static"                // static | sweep-lr | sweep-rl | oscillate-*
    },
    // ...
  ],
  vfxTracks: [                         // Effets visuels/haptiques
    {
      id: "vfx_xxx",
      type: "flash" | "fog" | "rain" | "snow" | "static" | "typewriter" | "erased" | "haptic",
      startSegmentId: "seg_1",
      endSegmentId: "seg_3",
      mode: "rapide" | "lent" | "moyen" | "intense" | ...,
      color: "rgba(255,255,255,0.3)",  // pour flash
      hapticPattern: [100, 50, 100]     // pour haptic
    },
    // ...
  ],
  
  // Mode serial (type: "serial")
  parts: [
    {
      id: "part_1",
      title: "Partie 1",
      segments: [...],
      soundTracks: [...],
      vfxTracks: [...]
    },
    // ...
  ]
}
```

### Index des histoires (`public/stories/index.json`)

```javascript
[
  {
    id: "slug",
    title: "Titre",
    author: "Auteur",
    mood: "ambiance",      // optionnel
    genre: "genre",        // optionnel
    description: "...",    // optionnel
    type: "simple"         // optionnel
  },
  // ...
]
```

---

## 8. Notes Techniques Importantes

### 8.1 Headers COOP/COEP

`vite.config.js` définit :
```javascript
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}
```
→ Requis pour `SharedArrayBuffer` utilisé by @ffmpeg/ffmpeg. Sans ces headers, le traitement audio FFmpeg ne fonctionne pas.

### 8.2 Proxy API en Dev

Le dev server Vite proxy les routes `/api/*` vers `localhost:3001` où tourne `scripts/dev-api-server.js`. En production, ces mêmes routes sont servies par les fonctions serverless Vercel dans `/api/*.js`.

### 8.3 AudioEngine — Loop Crossfade

Pour éviter les "clics" lors du loop, l'AudioEngine implémente un crossfade : une nouvelle instance du son démarre en fade-in pendant que l'ancienne fait un fade-out, avec un chevauchement de 600ms (medium) ou 1800ms (long).

### 8.4 StoryReader — VFX Texte

Plusieurs effets de texte sont implémentés :
- **Typewriter** : lettres apparaissant une par une
- **Static** : lettres perturbées aléatoirement (glitch + flicker)
- **Erased** : lettres aléatoirement masquées
- **Bionic Reading** : premières lettres de chaque mot en gras
- **Emoji Mode** : remplacement de mots par des emojis

### 8.5 Chapitre Flottant

Le StoryReader gère un système de chapitres avec 3 modes :
- **focused** : le chapitre est centré, tout le reste masqué
- **sticky** : le chapitre est fixé en haut, le texte défile en dessous
- **gone** : le chapitre a disparu

La transition entre ces modes est animée avec un spacer CSS pour éviter les sauts.
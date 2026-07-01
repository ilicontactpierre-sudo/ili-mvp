# ILi MVP — Contexte Projet

Application de lecture immersive interactive avec orchestration audio et effets visuels.

---

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI principale |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA |
| **Bundler** | Vite | 8.0.12 | Build + dev server |
| **Backend dev** | Express | 5.2.1 | API locale (port 3001) |
| **Backend prod** | Vercel Serverless | — | Fonctions API déployées |
| **Base de données** | Supabase | 2.106.1 | Storage (sons) + PostgreSQL |
| **Audio** | Howler.js | 2.2.4 | Moteur de lecture audio |
| **Audio enc** | @ffmpeg/ffmpeg | 0.12.15 | Encodage audio côté client |
| **Recherche** | Fuse.js | 7.3.0 | Recherche floue bibliothèque sonore |
| **Déploiement** | Vercel | — | Hosting + CDN |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless (Vercel + dev local)
│   ├── delete-sound.js         # Supprime un son de Supabase (storage + DB)
│   ├── delete.js               # Supprime une histoire via GitHub API
│   ├── get-upload-url.js       # Génère une URL signée Supabase pour upload
│   ├── manage-menu.js          # Gère la visibilité des histoires (GitHub)
│   ├── preview-sound.js        # Stream audio local (dev uniquement)
│   ├── publish.js              # Publie une histoire via GitHub API
│   ├── send-newsletter.js      # Envoie newsletter via Resend API
│   ├── subscribe.js            # Inscrit à la newsletter (Supabase)
│   ├── toggle-visibility.js    # Bascule visibilité histoire (GitHub)
│   └── upload-audio.js         # Upload fichier audio vers Supabase
│   └── upload-sound.js         # Enregistre métadonnées son dans Supabase
│
├── public/                     # Assets statiques (servis par Vercel/Vite)
│   ├── favicon.svg             # Icône PWA
│   ├── icons.svg               # Sprite SVG pour icônes UI
│   ├── manifest.json           # Manifest PWA (standalone, portrait)
│   ├── soundSearchWorker.js    # Web Worker pour recherche sons
│   ├── fonts/                  # Polices custom (Benedict, Oanteh)
│   ├── sounds/                 # Sons locaux (dev) + index JSON
│   │   ├── sounds-index.json   # Index complet de la bibliothèque (IDs, URLs, métadonnées)
│   │   └── *.mp3               # Fichiers audio individuels
│   ├── stories/                # Histoires publiées (JSON)
│   │   ├── index.json          # Liste des histoires (id, titre, auteur, hidden)
│   │   └── *.json              # Données d'histoire (segments, soundTracks, vfxTracks)
│   └── textures/               # Textures VFX (paper.png pour effet bruit)
│
├── scripts/                    # Scripts utilitaires
│   ├── dev-api-server.js       # Serveur Express local (proxy API + Supabase)
│   ├── addSound.js             # CLI d'ajout de son à la bibliothèque
│   ├── checkpoint.js           # Crée un point de restauration Git
│   ├── convert-stories.js      # Convertit des histoires d'un format à un autre
│   ├── generateSoundsIndex.js  # Génère sounds-index.json depuis un dossier
│   ├── index-boom-library.js   # Indexe une bibliothèque BOOM externe
│   └── migrate-sounds-to-supabase.js  # Migration sons locaux → Supabase
│
├── src/
│   ├── main.jsx                # Point d'entrée React (BrowserRouter + root)
│   ├── App.jsx                 # Routes principales + sons UI globaux (clic)
│   ├── index.css               # Styles globaux + variables CSS
│   │
│   ├── pages/                  # Pages routées
│   │   ├── HomePage.jsx        # Liste des histoires disponibles
│   │   ├── StoryPage.jsx       # Lecteur d'histoire (segments + audio)
│   │   ├── AdminPage.jsx       # Éditeur complet (segments, sons, VFX, publication)
│   │   ├── TutorialPage.jsx    # Page tutoriel
│   │   ├── NewsletterPage.jsx  # Page inscription newsletter
│   │   └── AnalyticsDashboard.jsx  # Dashboard analytics (via composant admin)
│   │
│   ├── components/             # Composants UI
│   │   ├── StoryReader.jsx     # Lecteur principal (segments, VFX texte, haptique)
│   │   ├── StoryReader.css     # Styles du lecteur
│   │   ├── StartScreen.jsx     # Écran de démarrage d'histoire
│   │   ├── EndScreen.jsx       # Écran de fin d'histoire
│   │   ├── SeuilScreen.jsx     # Écran questions avant lecture (seuil)
│   │   ├── GameOverlay.jsx     # Overlay pour modes jeu
│   │   ├── VfxOverlay.jsx      # Overlay effets d'ambiance (fog, rain, snow, fire, sun, underwater)
│   │   ├── ReaderSettings.jsx  # Paramètres de lecture (DYS, thème, emoji)
│   │   ├── StoryMenu.jsx       # Menu de sélection d'histoires
│   │   │
│   │   └── admin/              # Composants éditeur
│   │       ├── UnifiedSegmentsTimeline.jsx  # Timeline segments + sons + VFX
│   │       ├── SoundBlock.jsx               # Bloc son dans la timeline
│   │       ├── SoundBlockPanel.jsx          # Panneau édition propriétés son
│   │       ├── WaveformTrimmer.jsx          # Waveform + trim start/end
│   │       ├── SoundLibraryPicker.jsx       # Modal recherche/selection sons
│   │       ├── SoundImporter.jsx            # Import sons depuis fichier
│   │       ├── VfxBlock.jsx                 # Bloc VFX dans la timeline
│   │       ├── VfxBlockPanel.jsx            # Panneau édition propriétés VFX
│   │       ├── OrchestrationPanel.jsx       # Orchestration audio (événements par segment)
│   │       ├── FormatToolbar.jsx            # Toolbar formatage texte (gras, italic, etc.)
│   │       ├── InlineFunctionMenu.jsx       # Menu fonctions inline ({{journal:}} etc.)
│   │       ├── PublishPanel.jsx             # Panneau publication (slug, métadonnées)
│   │       ├── PublishAnimation.jsx         # Animation de publication
│   │       ├── DraftManager.jsx             # Gestion brouillons (localStorage)
│   │       ├── StoryLoader.jsx              # Chargement histoire existante
│   │       ├── StoryPreviewModal.jsx        # Modal aperçu avant publication
│   │       ├── AudioTimeline.jsx            # Timeline audio (ancienne version)
│   │       ├── GameModePanel.jsx            # Édition modes jeu par segment
│   │       ├── TagsInput.jsx                # Input tags avec autocomplete
│   │       ├── MenuManagerPage.jsx          # Gestion menu (ordre, visibilité)
│   │       ├── AnalyticsDashboard.jsx       # Dashboard analytics
│   │       ├── constants.js                 # Constantes VFX, mapping types → classes CSS
│   │       └── README.md                    # Documentation composants admin
│   │
│   ├── engine/                 # Moteurs temps réel
│   │   ├── AudioEngine.js      # Moteur audio (play, stop, fade, loop crossfade, pan, automation volume)
│   │   └── HapticEngine.js     # Moteur haptique (vibrations)
│   │
│   ├── utils/                  # Utilitaires
│   │   ├── renderMarkdown.jsx  # Rend Markdown avec support inline functions
│   │   ├── segmentAlgorithm.js # Algorithme de découpe texte en segments
│   │   ├── bionicReading.jsx   # Applique le Bionic Reading (gras partiel)
│   │   ├── emojiDict.jsx       # Remplace texte par emojis
│   │   ├── inlineFunctions.jsx # Fonctions inline ({{journal:}}, </lire:>, etc.)
│   │   ├── soundSearch.js      # Recherche dans la bibliothèque (Fuse.js)
│   │   └── analytics.js        # Tracking analytics
│   │
│   ├── assets/                 # Images statiques
│   │   └── hero.png
│   │
│   └── styles/
│       ├── global.css          # Variables CSS, reset, styles de base
│       └── vfx.css             # Styles effets visuels (VFX tracks)
│
├── .gitignore                  # Exclut node_modules, .env, dist, etc.
├── index.html                  # HTML d'entrée (root div)
├── package.json                # Dépendances + scripts
├── package-lock.json           # Lock dependencies
├── vite.config.js              # Config Vite (proxy API, COOP/COEP headers)
├── vercel.json                 # Rewrites SPA (toutes routes → index.html)
├── eslint.config.js            # Config ESLint
├── publish.sh                  # Script de publication shell
├── git-sync.sh                 # Script de sync Git
└── README.md                   # Documentation de base
```

---

## 3. Flux de Données Principal

### 3.1. Lecture d'une histoire

```
1. HomePage → StoryPage (route: /lire/:storyId)
2. StoryPage charge public/stories/{storyId}.json
3. StoryReader affiche les segments un par un
4. À chaque changement de segment :
   - AudioEngine.onSegmentChange() active/désactive les sons du soundTrack
   - VfxOverlay active les effets d'ambiance (fog, rain, etc.)
   - HapticEngine joue les patterns de vibration
   - StoryReader applique les VFX texte (typewriter, static, erased)
5. Navigation : clic/touch → segment suivant ; scroll → navigation automatique
```

### 3.2. Upload d'un son (Admin)

```
1. AdminPage → SoundImporter ou SoundLibraryPicker
2. Sélection fichier audio → compression via @ffmpeg/ffmpeg (client-side)
3. POST /api/get-upload-url → serveur retourne URL signée Supabase
4. PUT vers URL signée → fichier uploadé dans bucket 'sounds'
5. POST /api/upload-sound → métadonnées enregistrées dans table 'sounds' (Supabase)
6. Bibliothèque mise à jour en temps réel dans l'admin
```

### 3.3. Publication d'une histoire

```
1. AdminPage → PublishPanel → saisie slug + métadonnées
2. POST /api/publish avec storyData complète
3. Serveur lit/écrit via GitHub API :
   - public/stories/{slug}.json (données histoire)
   - public/stories/index.json (liste mise à jour)
4. Histoire disponible sur le site après commit GitHub → déploiement Vercel
```

### 3.4. Authentification

- **Pas de système d'auth utilisateur** — l'app est publique
- **Protection admin** : mot de passe via `ADMIN_PASSWORD` (env) pour toutes les routes `/api/*` sensibles
- **Mémoire narrative** : `sessionStorage` avec namespace `ili_mem_{storyId}_{clé}` — réinitialisé à chaque nouvelle lecture

---

## 4. Points Sensibles Connus

### 4.1. Fichiers de Configuration Critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev, headers COOP/COEP (requis pour ffmpeg.wasm) | Casserait le dev server ou l'encodage audio |
| `vercel.json` | Rewrite SPA (toutes routes → index.html) | Casserait le routing React en prod |
| `package.json` | Scripts, dépendances, version | Build cassé si dépendances modifiées |
| `public/manifest.json` | PWA (standalone, portrait) | Expérience PWA dégradée |

### 4.2. Différences Local vs Production

| Aspect | Local | Production |
|--------|-------|------------|
| **API** | Express sur port 3001 (`scripts/dev-api-server.js`) | Fonctions serverless Vercel (`api/*.js`) |
| **Sons** | Fichiers locaux dans `public/sounds/` + preview via `/api/preview-sound` | URLs publiques Supabase Storage |
| **Stories** | Fichiers JSON locaux dans `public/stories/` | Fichiers JSON sur GitHub → déployés par Vercel |
| **Upload audio** | Compression locale + upload Supabase | Même flux (Supabase) |
| **Proxy** | Vite proxy `/api/*` → `localhost:3001` | Vercel rewrite `/api/*` → fonctions serverless |

### 4.3. Assets Statiques

- **Servis depuis** : `public/` (Vite dev) ou CDN Vercel (prod)
- **Sons locaux** : `public/sounds/` — uniquement en dev (preview via serveur Express)
- **Stories** : `public/stories/*.json` — chargées en tant que JSON statique
- **Polices** : `public/fonts/` — chargées via `@font-face` dans `global.css`
- **Textures VFX** : `public/textures/paper.png` — utilisée pour effet bruit dans `vfx.css`

### 4.4. Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage | Métadonnées |
|------|----------|---------|----------|-------------|
| **Audio** | Upload → compression FFmpeg (client) → Supabase Storage | MP3, WAV, AIFF, FLAC | Bucket `sounds` (Supabase) | Table `sounds` (id, url, tags, categories, duration, loop, etc.) |
| **Images** | Pas de traitement | SVG, PNG | `public/` (statique) | Aucune |
| **Textures VFX** | Statiques | PNG | `public/textures/` | Aucune |

- **CDN** : Vercel CDN pour tous les assets statiques
- **Supabase Storage** : URLs publiques (`{SUPABASE_URL}/storage/v1/object/public/sounds/{filename}`)
- **Indexation** : `sounds-index.json` (local) ou table Supabase `sounds` (prod) pour la recherche

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────
npm run dev              # Lance Vite + serveur API Express (concurrently)
npm run dev:clean        # Tue les process existants + relance proprement

# ── Build ──────────────────────────────────────────────────────
npm run build            # Build Vite (output: dist/)
npm run preview          # Preview build en local

# ── Linting ────────────────────────────────────────────────────
npm run lint             # ESLint avec config projet

# ── Utilitaires ────────────────────────────────────────────────
npm run add-sound        # CLI : ajoute un son à la bibliothèque
npm run checkpoint       # Crée un checkpoint Git + relance dev server
npm run publish          # bash publish.sh (publie sur Vercel)
npm run sync             # bash git-sync.sh (sync avec remote)
```

---

## 6. Variables d'Environnement

| Variable | Usage | Requis |
|----------|-------|--------|
| `ADMIN_PASSWORD` | Mot de passe pour toutes les routes API admin | Oui (prod) |
| `SUPABASE_URL` | URL du projet Supabase | Oui |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (admin) pour storage + DB | Oui |
| `GITHUB_TOKEN` | Token GitHub API pour publication stories | Oui (publication) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui (publication) |
| `GITHUB_REPO` | Nom du repo GitHub | Oui (publication) |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Non |
| `RESEND_API_KEY` | Clé API Resend pour envoi newsletters | Non (newsletter uniquement) |
| `NODE_ENV` | Mode (development/production) — positionné automatiquement | Non |

---

## 7. Architecture Audio (Détails)

### AudioEngine (`src/engine/AudioEngine.js`)

- **Gestion des instances** : Map `playingSounds` par trackId ou soundId
- **Volume perceptuel** : courbe quadratique pour correspondance subjective
- **Loop avec crossfade** : fade out/in entre instances pour transition fluide
- **Trim** : sprites Howler (`trim_{id}_{start}_{end}`) pour jouer une portion
- **Pan** : modes static, sweep-lr, sweep-rl, oscillate-slow/fast, converge, diverge
- **Automation volume** : points d'automation par segment avec fade configurables
- **Événements** : `play`, `stop`, `fadeIn`, `fadeOut`, `volume`, avec délais

### Intégration StoryReader

```js
// À chaque changement de segment :
audioEngine.onSegmentChange(currentIndex, soundTracks, segments)
// → Active les sons dont le segment est dans [startSegmentId, endSegmentId]
// → Applique automation volume, fade, delay, loop, pan
```

---

## 8. Structure d'une Histoire (JSON)

```json
{
  "id": "story-slug",
  "title": "Titre",
  "author": "Auteur",
  "segments": [
    {
      "id": "seg_1",
      "text": "Texte du segment",
      "isChapter": false,
      "isLeader": false,
      "pause": false,
      "fontFamily": "inherit",
      "breakAt": null,
      "gameMode": null
    }
  ],
  "soundTracks": [
    {
      "id": "track_1",
      "soundId": "son-id",
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_5",
      "volume": 0.5,
      "gainDb": 0,
      "fadeIn": 0,
      "fadeOut": 0,
      "delay": 0,
      "loop": false,
      "loopCrossfade": "none",
      "trimStart": 0,
      "trimEnd": null,
      "pan": 0,
      "panMode": "static",
      "muted": false,
      "automationPoints": []
    }
  ],
  "vfxTracks": [
    {
      "type": "typewriter",
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_3",
      "mode": "normal"
    },
    {
      "type": "fog",
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_10",
      "mode": "dense"
    },
    {
      "type": "flash",
      "startSegmentId": "seg_5",
      "endSegmentId": "seg_5",
      "color": "rgba(255,0,0,0.3)",
      "mode": "rapide"
    }
  ],
  "masterVolume": 1.0
}
```

---

*Document généré pour onboarding développeur — dernière mise à jour : 2026-07-01*
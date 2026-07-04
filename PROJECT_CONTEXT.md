# ILi MVP — Contexte du Projet

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI principale, composants |
| **Routing** | React Router DOM | 7.15.0 | Navigation entre pages |
| **Bundler** | Vite | 8.0.12 | Build et dev server |
| **Backend Dev** | Express | 5.2.1 | Serveur API local (port 3001) |
| **Backend Prod** | Vercel Serverless | — | Fonctions API dans `/api` |
| **Base de données** | Supabase | 2.106.1 | Storage audio + tables sounds/reading_events/subscribers |
| **Audio** | Howler.js | 2.2.4 | Lecture et gestion des sons |
| **Audio avancé** | @ffmpeg/ffmpeg | 0.12.15 | Compression audio côté client |
| **Recherche** | Fuse.js | 7.3.0 | Recherche fuzzy dans bibliothèque sonore |
| **Déploiement** | Vercel | — | Hosting + serverless functions |
| **Linting** | ESLint | 10.3.0 | Qualité du code |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── index.html                          # Point d'entrée HTML unique (SPA)
├── package.json                        # Dépendances et scripts npm
├── vite.config.js                      # Config Vite : proxy API, COOP/COEP headers
├── vercel.json                         # Rewrites pour SPA (tout → index.html)
├── eslint.config.js                    # Config ESLint
│
├── api/                                # Fonctions serverless Vercel (backend prod)
│   ├── publish.js                      # Publie une histoire via GitHub API
│   ├── upload-sound.js                 # Upload métadonnées son vers Supabase
│   ├── upload-audio.js                 # Upload fichier audio vers Supabase Storage
│   ├── get-upload-url.js               # Génère URL signée pour upload direct
│   ├── delete-sound.js                 # Supprime son (storage + DB)
│   ├── delete.js                       # Supprime histoire via GitHub API
│   ├── toggle-visibility.js            # Change visibilité histoire (published/draft)
│   ├── subscribe.js                    # Ajout email à liste newsletter (Supabase)
│   ├── send-newsletter.js              # Envoi newsletter aux subscribers
│   ├── manage-menu.js                  # Gestion menu navigation via GitHub
│   └── preview-sound.js                # (dev only) Stream fichiers audio locaux
│
├── scripts/                            # Scripts utilitaires
│   ├── dev-api-server.js               # Serveur Express pour dev local (port 3001)
│   ├── addSound.js                     # CLI : ajoute un son à la bibliothèque
│   ├── checkpoint.js                   # CLI : crée un checkpoint de sauvegarde
│   ├── convert-stories.js              # Conversion format histoires
│   ├── generateSoundsIndex.js          # Génère index JSON des sons
│   ├── index-boom-library.js           # Indexe la BOOM Library
│   ├── migrate-sounds-to-supabase.js   # Migration sons locaux → Supabase
│   ├── stats-sounds.cjs                # Stats sur les fichiers audio
│   ├── update-story-urls.js            # Met à jour URLs dans les stories
│   ├── audio-dictionary.js             # Dictionnaire de référence audio
│   ├── git-sync.sh                     # Script sync Git
│   └── README.md                       # Documentation des scripts
│
├── public/                             # Assets statiques servis tels quels
│   ├── sounds/                         # Fichiers audio locaux
│   │   ├── sounds-index.json           # Index métadonnées des sons
│   │   └── .mp3                        # Fichiers audio individuels
│   ├── stories/                        # Fichiers JSON des histoires
│   │   ├── index.json                  # Liste des histoires disponibles
│   │   └── *.json                      # Données complètes de chaque histoire
│   ├── fonts/                          # Polices custom (Benedict, Oanteh)
│   ├── textures/                       # Textures pour effets visuels
│   ├── favicon.svg                     # Favicon
│   ├── manifest.json                   # PWA manifest
│   ├── icons.svg                       # Sprite SVG pour icônes
│   └── soundSearchWorker.js            # Web Worker pour recherche sonore
│
├── src/
│   ├── main.jsx                        # Point d'entrée React + BrowserRouter
│   ├── App.jsx                         # Routes + sons globaux (clic UI)
│   ├── index.css                       # Styles globaux + variables CSS
│   │
│   ├── pages/                          # Pages principales (routing)
│   │   ├── HomePage.jsx                # Accueil : liste des histoires
│   │   ├── StoryPage.jsx               # Lecture d'une histoire (logique principale)
│   │   ├── AdminPage.jsx               # Interface admin complète (3100+ lignes)
│   │   ├── TutorialPage.jsx            # Page tutoriel
│   │   ├── NewsletterPage.jsx          # Page newsletter
│   │   └── AnalyticsDashboard.jsx      # Dashboard analytics (lectures)
│   │
│   ├── components/                     # Composants UI réutilisables
│   │   ├── StoryReader.jsx             # Moteur de rendu des segments (816 lignes)
│   │   ├── StoryReader.css             # Styles du lecteur
│   │   ├── StartScreen.jsx             # Écran de démarrage avant lecture
│   │   ├── EndScreen.jsx               # Écran de fin après lecture
│   │   ├── SeuilScreen.jsx             # Écran questions "seuil" avant lecture
│   │   ├── StoryMenu.jsx               # Menu de sélection d'histoire
│   │   ├── ReaderSettings.jsx          # Panneau réglages (DYS, thème, progression)
│   │   ├── GameOverlay.jsx             # Overlay pour game modes interactifs
│   │   ├── VfxOverlay.jsx              # Overlay effets visuels (fog, rain, etc.)
│   │   │
│   │   └── admin/                      # Composants interface admin
│   │       ├── UnifiedSegmentsTimeline.jsx  # Timeline unifiée segments + sons + vfx
│   │       ├── OrchestrationPanel.jsx       # Panneau orchestration audio/vfx
│   │       ├── SoundBlockPanel.jsx          # Édition blocs sonores
│   │       ├── SoundBlock.jsx               # Composant bloc son individuel
│   │       ├── WaveformTrimmer.jsx          # Édition trim (début/fin) waveform
│   │       ├── SoundLibraryPicker.jsx       # Sélecteur bibliothèque sonore
│   │       ├── SoundImporter.jsx            # Import nouveaux sons
│   │       ├── VfxBlock.jsx                 # Bloc effets visuels
│   │       ├── VfxBlockPanel.jsx            # Édition effets visuels
│   │       ├── GameModePanel.jsx            # Configuration game modes
│   │       ├── FormatToolbar.jsx            # Toolbar formatage texte
│   │       ├── InlineFunctionMenu.jsx       # Menu fonctions inline
│   │       ├── TagsInput.jsx                # Input tags avec autocomplete
│   │       ├── DraftManager.jsx             # Gestion brouillons (localStorage)
│   │       ├── StoryLoader.jsx              # Chargement histoires existantes
│   │       ├── StoryPreviewModal.jsx        # Modal aperçu histoire
│   │       ├── PublishPanel.jsx             # Panneau publication
│   │       ├── PublishAnimation.jsx         # Animation post-publication
│   │       ├── AudioTimeline.jsx            # Timeline audio (ancien)
│   │       ├── AnalyticsDashboard.jsx       # Dashboard analytics
│   │       ├── MenuManagerPage.jsx          # Gestion menu navigation
│   │       ├── constants.js                 # Constantes (couleurs VFX, etc.)
│   │       └── README.md                    # Documentation admin
│   │
│   ├── engine/                         # Moteurs bas niveau
│   │   ├── AudioEngine.js              # Moteur audio complet (589 lignes)
│   │   │                               # Gestion : play, fade, loop crossfade, pan, automation
│   │   └── HapticEngine.js             # Moteur vibrations haptiques
│   │
│   ├── utils/                          # Utilitaires
│   │   ├── segmentAlgorithm.js         # Algorithme découpage texte en segments
│   │   ├── renderMarkdown.jsx           # Rendu markdown personnalisé
│   │   ├── bionicReading.jsx           # Application Bionic Reading
│   │   ├── emojiDict.jsx               # Remplacement mots → emojis
│   │   ├── inlineFunctions.jsx         # Fonctions inline (variables, journal)
│   │   ├── analytics.js                # Tracking événements lecture (Supabase)
│   │   └── soundSearch.js              # Logique recherche bibliothèque
│   │
│   ├── styles/                         # Styles globaux
│   │   ├── global.css                  # Variables CSS, reset, thèmes
│   │   └── vfx.css                     # Styles effets visuels (fog, rain, etc.)
│   │
│   └── assets/                         # Assets importés dans le bundle
│       ├── hero.png                    # Image hero
│       └── vite.svg                    # Logo Vite
│
├── .gitignore                          # Fichiers ignorés par Git
├── package-lock.json                   # Lock des dépendances
├── publish.sh                          # Script déploiement
├── git-sync.sh                         # Script synchronisation Git
├── boom_listing.txt                    # Listing BOOM Library
├── keywords-export.txt                 # Export mots-clés
│
└── DOCUMENTATION/                      # Docs diverses
    ├── PROJECT_CONTEXT.md              # Ce fichier
    ├── README.md                       # README principal
    ├── IMPLEMENTATION_SUMMARY.md       # Résumé implémentation
    ├── REFACTORING_SUMMARY.md          # Résumé refactoring
    ├── CHECKPOINTS.md                  # Checkpoints de sauvegarde
    ├── BUGFIX_ECRAN_NOIR.md            # Fix bug écran noir
    ├── HOMEPAGE_IMPROVEMENTS.md        # Améliorations homepage
    ├── ORCHESTRATION_PROMPT.md         # Prompt orchestration
    ├── PUBLISH_SETUP.md                # Setup publication
    └── PROMPT_Avant DÉCOUPAGE AUTO     # Prompt découpage
```

---

## 3. Flux de Données Principal

### 3.1 Lecture d'une histoire

```
1. Utilisateur clique sur une histoire dans HomePage
   ↓
2. StoryPage.jsx charge `/stories/{storyId}.json` (fichier statique ou GitHub)
   ↓
3. Préchargement des sons (Howl instances) via StartScreen
   ↓
4. Démarrage lecture → StoryReader.jsx affiche les segments un par un
   ↓
5. À chaque changement de segment :
   - AudioEngine.onSegmentChange() déclenche les sons du segment
   - VfxOverlay active les effets visuels (fog, rain, etc.)
   - HapticEngine joue les patterns haptiques
   ↓
6. Navigation : swipe/click/clavier → currentIndex++ ou --
   ↓
7. Fin de lecture → EndScreen avec analytics trackFinish()
```

**Données d'une histoire (JSON) :**
```json
{
  "id": "slug-histoire",
  "title": "Titre",
  "author": "Auteur",
  "segments": [
    {
      "id": "seg_1",
      "text": "Texte du segment",
      "audioEvents": [],        // Ancien format : événements audio inline
      "isChapter": false,       // Segment = titre de chapitre
      "isLeader": false,        // Premier segment d'une séquence
      "pause": 0,               // Durée pause auto (ms)
      "gameMode": null,         // Type de game mode si présent
      "fontFamily": null,       // Police custom
      "breakAt": null           // Position saut de ligne forcé
    }
  ],
  "sounds": [                  // Sons à précharger
    { "id": "son_1", "url": "https://...", "loop": false }
  ],
  "soundTracks": [             // Nouveau format : pistes audio séparées
    {
      "id": "track_1",
      "soundId": "son_1",
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_10",
      "volume": 0.5,
      "fadeIn": 1000,
      "fadeOut": 2000,
      "delay": 0,
      "loop": true,
      "loopCrossfade": "medium",
      "trimStart": 0,
      "trimEnd": null,
      "pan": 0,
      "panMode": "static",
      "gainDb": 0,
      "automationPoints": []
    }
  ],
  "vfxTracks": [               // Pistes effets visuels
    {
      "type": "flash|fog|rain|snow|static|typewriter|erased",
      "startSegmentId": "seg_1",
      "endSegmentId": "seg_5",
      "mode": "lent|normal|rapide",
      "color": "rgba(...)",
      "hapticPattern": [100, 50, 100]
    }
  ],
  "masterVolume": 1.0,
  "seuil": [                   # Questions avant lecture
    { "cle": "prenom", "texte": "Dis-moi ton prénom", "type": "texte" }
  ]
}
```

### 3.2 Upload d'un son (Admin)

```
1. Admin importe un fichier audio → SoundImporter.jsx
   ↓
2. Compression via @ffmpeg/ffmpeg (client-side)
   ↓
3. Envoi vers /api/upload-audio (dev: localhost:3001, prod: Vercel)
   ↓
4. Backend upload vers Supabase Storage (bucket: 'sounds')
   ↓
5. Retour URL publique → mise à jour sounds-index.json
   ↓
6. Métadonnées envoyées vers /api/upload-sound → table 'sounds' Supabase
```

### 3.3 Publication d'une histoire

```
1. Admin clique "Publier" → PublishPanel.jsx
   ↓
2. Envoi storyData + slug vers /api/publish
   ↓
3. Backend lit/écrit via GitHub API :
   - public/stories/{slug}.json (contenu histoire)
   - public/stories/index.json (liste des histoires)
   ↓
4. Commit automatique sur la branche configurée (main)
   ↓
5. Vercel déploie automatiquement les nouveaux fichiers JSON
```

### 3.4 Gestion de l'authentification

**Mécanisme :** Password simple via `ADMIN_PASSWORD` (variable d'environnement).

**Où sont stockées les credentials :**
- **Dev local** : fichier `.env` à la racine (non commité)
- **Prod Vercel** : Variables d'environnement dans le dashboard Vercel
- **Client** : Jamais exposé — toutes les routes admin vérifient le password côté serveur

**Flux :**
```
1. AdminPage.jsx affiche formulaire login
2. Password envoyé dans le body de chaque requête API
3. Backend compare avec process.env.ADMIN_PASSWORD
4. Si match → action autorisée, sinon 401
```

---

## 4. Points Sensibles Connus

### 4.1 Fichiers de configuration critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev, headers COOP/COEP (requis pour ffmpeg.wasm) | Casserait le dev local et ffmpeg |
| `vercel.json` | Rewrite SPA (tout → index.html) | Casserait le routing React en prod |
| `scripts/dev-api-server.js` | Serveur API local, routes /api/* | Casserait upload/preview sons en dev |
| `package.json` | Scripts, dépendances, version Node | Peut casser build/deps si modifié |
| `.gitignore` | Exclut .env, node_modules, etc. | Risque de commit secrets si modifié |

### 4.2 Différences environnement local vs production

| Aspect | Local (dev) | Production (Vercel) |
|--------|-------------|---------------------|
| **Serveur API** | Express sur port 3001 (`scripts/dev-api-server.js`) | Vercel Serverless Functions (`/api/*.js`) |
| **Fichiers stories** | `public/stories/*.json` locaux | GitHub repo (publiés via API) |
| **Fichiers sons** | `public/sounds/*.mp3` locaux + Supabase | Supabase Storage uniquement |
| **Proxy API** | Vite proxy → localhost:3001 | Direct vers /api/* (same-origin) |
| **Audio preview** | Stream fichiers locaux via Express | URLs publiques Supabase |
| **Build** | `vite` (dev server) | `vite build` → output dans `dist/` |

### 4.3 Assets statiques

**Comment ils sont servis :**
- **Développement** : Vite dev server sert `public/` tel quel
- **Production** : Vercel sert `public/` depuis le CDN edge

**Depuis où :**
- `/stories/*.json` → chargés via `fetch('/stories/{id}.json')`
- `/sounds/*.mp3` → chargés via Howler.js (dev) ou URLs Supabase (prod)
- `/fonts/*` → chargés via `@font-face` dans `global.css`
- `/textures/*` → chargés dans VfxOverlay.jsx

### 4.4 Gestion des fichiers médias

| Type | Pipeline | Formats supportés | Stockage | CDN | Métadonnées |
|------|----------|-------------------|----------|-----|-------------|
| **Audio** | Upload → compression ffmpeg → Supabase Storage | MP3, WAV, AIFF, FLAC | Bucket `sounds` Supabase | Supabase CDN | Table `sounds` (id, url, tags, categories, duration, etc.) |
| **Images** | Upload direct ou inline dans JSON | PNG, JPG, SVG | GitHub repo ou Supabase | Vercel CDN ou Supabase | Dans le JSON de l'histoire |
| **Polices** | Fichiers statiques dans `public/fonts/` | OTF, TTF | GitHub repo | Vercel CDN | Déclarées dans `global.css` |
| **Textures** | Fichiers statiques dans `public/textures/` | PNG | GitHub repo | Vercel CDN | Référencées dans VfxOverlay.jsx |

**Pipeline audio détaillé :**
1. Upload fichier brut (WAV, AIFF, etc.)
2. Compression MP3 via `@ffmpeg/ffmpeg` (client-side, bitrate ~128kbps)
3. Upload vers Supabase Storage (`sounds` bucket)
4. Génération URL publique
5. Indexation métadonnées dans table `sounds` Supabase
6. Mise à jour `public/sounds/sounds-index.json`

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────────────────────
npm run dev              # Lance Vite + serveur API local (port 3001)
npm run dev:clean        # Tue les process existants et redémarre proprement

# ── Build ──────────────────────────────────────────────────────────────────────
npm run build            # Build de production (Vite) → output dans dist/
npm run preview          # Prévisualise le build en local

# ── Linting ────────────────────────────────────────────────────────────────────
npm run lint             # Vérifie le code avec ESLint

# ── Utilitaires ────────────────────────────────────────────────────────────────
npm run add-sound        # CLI : ajoute un son à la bibliothèque interactive
npm run checkpoint       # Crée un checkpoint de sauvegarde + redémarre le dev
npm run sync             # Exécute git-sync.sh (pull/push branches)

# ── Déploiement ───────────────────────────────────────────────────────────────
npm run publish          # Exécute publish.sh (push vers Vercel)
```

---

## 6. Variables d'Environnement

| Nom | Usage | Requis pour |
|-----|-------|-------------|
| `ADMIN_PASSWORD` | Authentification routes admin | Toutes les routes `/api/*` protégées |
| `SUPABASE_URL` | URL du projet Supabase | Upload audio, storage, analytics, newsletter |
| `SUPABASE_SERVICE_KEY` | Clé service (admin) Supabase | Upload audio, suppression, newsletter (côté serveur) |
| `SUPABASE_ANON_KEY` | Clé anonyme Supabase | Analytics, lecture publique (côté client) |
| `VITE_SUPABASE_URL` | URL Supabase (exposée au client) | Analytics côté client |
| `VITE_SUPABASE_ANON_KEY` | Clé anon (exposée au client) | Analytics côté client |
| `GITHUB_TOKEN` | Token personnel GitHub | Publication histoires via GitHub API |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Publication histoires |
| `GITHUB_REPO` | Nom du repo GitHub | Publication histoires |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Publication histoires |
| `RESEND_API_KEY` | Clé API Resend | Envoi newsletters |

**Note :** Les variables préfixées par `VITE_` sont exposées au client (injectées par Vite). Les autres ne sont accessibles que côté serveur.
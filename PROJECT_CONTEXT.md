# ILi MVP — Contexte Technique du Projet

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI framework |
| **Bundler** | Vite | 8.0.12 | Build tool + dev server |
| **Routing** | React Router | 7.15.0 | Navigation SPA |
| **Backend dev** | Express | 5.2.1 | Serveur API local (port 3001) |
| **Backend prod** | Vercel Serverless | — | Fonctions `/api/*` déployées sur Vercel |
| **Base de données** | Supabase | 2.106.1 | PostgreSQL + Storage (sons, métadonnées) |
| **Audio** | Howler.js | 2.2.4 | Moteur audio principal |
| **Audio (encodage)** | lamejs | 1.2.1 | Compression MP3 |
| **Audio (FFmpeg)** | @ffmpeg/ffmpeg | 0.12.15 | Traitement audio avancé |
| **Recherche** | Fuse.js | 7.3.0 | Recherche fuzzy dans bibliothèque sonore |
| **Déploiement** | Vercel | — | Hosting + CI/CD automatique |
| **Publication** | GitHub API | — | Commits automatiques des histoires |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                              # Fonctions serverless Vercel (identiques en dev via Express)
│   ├── delete-sound.js              # Supprime un son (storage + DB)
│   ├── delete.js                    # Supprime une histoire
│   ├── get-upload-url.js            # Génère URL signée Supabase pour upload
│   ├── preview-sound.js             # Sert les fichiers audio (dev)
│   ├── publish.js                   # Publie une histoire via GitHub API
│   ├── send-newsletter.js           # Envoie newsletter (Resend API)
│   ├── subscribe.js                 # Gère abonnements newsletter
│   ├── toggle-visibility.js         # Change visibilité d'une histoire
│   ├── upload-audio.js              # Upload + compression MP3 vers Supabase
│   └── upload-sound.js              # Upsert métadonnées son dans Supabase
│
├── public/                          # Assets statiques servis par Vercel/Vite
│   ├── favicon.svg                  # Favicon du site
│   ├── icons.svg                    # Sprite SVG des icônes UI
│   ├── manifest.json                # PWA manifest
│   ├── soundSearchWorker.js         # Web Worker pour recherche sonore
│   ├── fonts/                       # Polices personnalisées
│   │   ├── NamoraDayanaDemo-0vqZd.ttf   # Police décorative
│   │   └── Oanteh-rvDvA.otf             # Police logo
│   ├── sounds/                      # Bibliothèque sonore locale
│   │   ├── sounds-index.json        # Index complet de la bibliothèque (IDs, tags, catégories)
│   │   ├── *.mp3                    # Fichiers audio locaux (effets, ambiances)
│   │   └── .gitkeep                 # Garde le dossier versionné
│   ├── stories/                     # Histoires publiées (JSON)
│   │   ├── index.json               # Catalogue des histoires (titre, auteur, slug)
│   │   ├── *.json                   # Fichiers d'histoires individuelles
│   │   └── .gitkeep                 # Garde le dossier versionné
│   └── textures/                    # Textures pour effets visuels
│       └── paper.png                # Texture papier pour overlay
│
├── scripts/                         # Scripts utilitaires
│   ├── addSound.js                  # CLI pour ajouter un son à la bibliothèque
│   ├── audio-dictionary.js          # Dictionnaire de termes audio
│   ├── checkpoint.js                # Crée un point de sauvegarde Git
│   ├── convert-stories.js           # Convertit anciens formats d'histoires
│   ├── dev-api-server.js            # Serveur Express pour développement local
│   ├── generateSoundsIndex.js       # Génère sounds-index.json depuis un dossier
│   ├── index-boom-library.js        # Indexe la BOOM Library externe
│   ├── migrate-sounds-to-supabase.js # Migration sons locaux → Supabase
│   ├── stats-sounds.cjs             # Stats sur la bibliothèque
│   ├── update-story-urls.js         # Met à jour URLs dans les histoires
│   └── README.md                    # Documentation des scripts
│
├── src/
│   ├── App.jsx                      # Routes principales + sons globaux (clics UI)
│   ├── main.jsx                     # Point d'entrée React
│   ├── index.css                    # Styles globaux (variables CSS)
│   │
│   ├── assets/                      # Images et assets importés
│   │   ├── hero.png                 # Image héro
│   │   ├── react.svg                # Logo React
│   │   └── vite.svg                 # Logo Vite
│   │
│   ├── components/                  # Composants React
│   │   ├── EndScreen.jsx            # Écran de fin de lecture (feedback, liens)
│   │   ├── GameOverlay.jsx          # Overlay pour modes de jeu interactifs
│   │   ├── ReaderSettings.jsx       # Paramètres de lecture (vitesse, police) + progression
│   │   ├── SeuilScreen.jsx          # Écran de questions avant lecture (seuil)
│   │   ├── StartScreen.jsx          # Écran de démarrage (titre, préchargement audio)
│   │   ├── StoryMenu.jsx            # Menu de sélection d'histoire
│   │   ├── StoryReader.css          # Styles spécifiques au lecteur
│   │   ├── StoryReader.jsx          # Lecteur principal (segments, texte, inline functions)
│   │   ├── VfxOverlay.jsx           # Overlay effets visuels (particles, textures)
│   │   │
│   │   └── admin/                   # Interface d'administration
│   │       ├── AnalyticsDashboard.jsx   # Stats de lecture (démarrages, progressions, abandons)
│   │       ├── AudioTimeline.jsx        # Timeline audio (soundTracks)
│   │       ├── constants.js             # Constantes UI admin
│   │       ├── DraftManager.jsx         # Gestion des brouillons (localStorage)
│   │       ├── FormatToolbar.jsx        # Barre d'outils formatage texte
│   │       ├── GameModePanel.jsx        # Éditeur de modes de jeu par segment
│   │       ├── InlineFunctionMenu.jsx   # Menu pour fonctions inline ({{...}})
│   │       ├── OrchestrationPanel.jsx   # Éditeur avancé événements audio
│   │       ├── PublishAnimation.jsx     # Animation de publication (3 étapes)
│   │       ├── PublishPanel.jsx         # Bouton publier + export JSON
│   │       ├── SoundBlock.jsx           # Bloc son dans l'éditeur
│   │       ├── SoundBlockPanel.jsx      # Éditeur propriétés bloc son
│   │       ├── SoundImporter.jsx        # Import de sons depuis fichiers
│   │       ├── SoundLibraryPicker.jsx   # Sélecteur dans la bibliothèque
│   │       ├── StoryLoader.jsx          # Chargeur d'histoires existantes
│   │       ├── StoryPreviewModal.jsx    # Aperçu avant publication
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline unifiée segments/sons/vfx
│   │       ├── VfxBlock.jsx             # Bloc effets visuels
│   │       ├── VfxBlockPanel.jsx        # Éditeur propriétés VFX
│   │       ├── WaveformTrimmer.jsx      # Éditeur de trim audio avec waveform
│   │       └── README.md                # Documentation de l'admin
│   │
│   ├── engine/                        # Moteurs métier
│   │   ├── AudioEngine.js             # Moteur audio (play, fade, loop, pan, trim)
│   │   └── HapticEngine.js            # Moteur de retours haptiques (vibrations)
│   │
│   ├── pages/                         # Pages de l'application
│   │   ├── AdminPage.jsx              # Interface complète d'édition d'histoires
│   │   ├── AnalyticsDashboard.jsx     # Page de statistiques
│   │   ├── HomePage.jsx               # Page d'accueil (catalogue d'histoires)
│   │   ├── NewsletterPage.jsx         # Page d'abonnement newsletter
│   │   └── StoryPage.jsx              # Page de lecture d'une histoire
│   │
│   ├── styles/                        # Feuilles de style globales
│   │   ├── global.css                 # Styles globaux + variables CSS
│   │   └── vfx.css                    # Styles des effets visuels
│   │
│   └── utils/                         # Fonctions utilitaires
│       ├── analytics.js               # Tracking événements (start, progress, finish, abandon)
│       ├── bionicReading.jsx          # Fonction de lecture bionique
│       ├── emojiDict.jsx              # Dictionnaire d'emojis
│       ├── inlineFunctions.jsx        # Interpréteur de fonctions inline ({{...}})
│       ├── renderMarkdown.jsx         # Rendu Markdown avec extensions custom
│       ├── segmentAlgorithm.js        # Algorithme de découpe de texte en segments
│       └── soundSearch.js             # Logique de recherche dans la bibliothèque
│
├── .gitignore                        # Fichiers ignorés par Git
├── eslint.config.js                  # Configuration ESLint
├── index.html                        # Point d'entrée HTML
├── package.json                      # Dépendances et scripts
├── package-lock.json                 # Lock file npm
├── publish.sh                        # Script de publication Git
├── vercel.json                       # Configuration Vercel (rewrites SPA)
└── vite.config.js                    # Configuration Vite (proxy API, COOP/COEP)
```

---

## 3. Flux de Données Principal

### Lecture d'une histoire

```
1. Navigation → /lire/:storyId
2. StoryPage.jsx charge /stories/{storyId}.json
3. Si mode série (type="serial") → affiche CoverPage avec liste des parties
4. Sinon → charge directement les segments
5. StartScreen précharge les sons (Howl instances)
6. AudioEngine exécute événements audio au fil des segments
7. StoryReader affiche le texte segment par segment
8. Progression sauvegardée dans localStorage
9. Analytics envoyés (start, progress, finish, abandon)
```

### Publication d'une histoire (Admin → Prod)

```
1. Admin crée/édite une histoire (segments, soundTracks, vfxTracks)
2. Clique sur "Publier" → mot de passe requis (VITE_ADMIN_PASSWORD)
3. PublishPanel envoie POST /api/publish avec:
   - slug, storyData (segments, soundTracks, vfxTracks, etc.)
4. API vérifie ADMIN_PASSWORD
5. API commit sur GitHub:
   - public/stories/{slug}.json (l'histoire)
   - public/stories/index.json (catalogue mis à jour)
6. Vercel détecte le commit → redéploie automatiquement
7. L'histoire est en ligne (~30-60s)
```

### Upload d'un son (Admin → Supabase)

```
1. Admin importe un fichier audio via SoundImporter
2. Compression MP3 via lamejs (si nécessaire)
3. POST /api/get-upload-url → URL signée Supabase
4. Upload direct vers Supabase Storage (bucket "sounds")
5. POST /api/upload-sound → métadonnées dans table "sounds"
6. Bibliothèque mise à jour en temps réel
```

### Gestion de l'authentification

| Contexte | Mécanisme | Stockage |
|----------|-----------|----------|
| **Admin (frontend)** | Mot de passe saisi → comparaison avec `VITE_ADMIN_PASSWORD` | `sessionStorage.ili_admin_password` |
| **API (dev)** | Vérification `ADMIN_PASSWORD` dans `.env` | Variable d'environnement |
| **API (prod)** | Vérification `ADMIN_PASSWORD` dans Vercel env vars | Vercel Environment Variables |

---

## 4. Points Sensibles Connus

### Fichiers de configuration critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API locale, headers COOP/COEP pour SharedArrayBuffer | Audio FFmpeg cassé si COOP/COEP retiré |
| `vercel.json` | Rewrite SPA (toutes routes → index.html) | Routing cassé si retiré |
| `scripts/dev-api-server.js` | Routes API en local (identiques aux serverless) | Développement impossible si cassé |
| `package.json` | Scripts, dépendances, version | Build/dev cassés si modifié incorrectement |

### Différences environnement local vs production

| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| **API** | Express sur port 3001 | Serverless Functions `/api/*` |
| **Assets statiques** | Vite dev server | Vercel CDN |
| **Stories** | Fichiers JSON dans `public/stories/` | Idem, mais versionnés sur GitHub |
| **Sons** | Supabase Storage + fichiers locaux | Supabase Storage uniquement |
| **Variables env** | `.env` local | Vercel Environment Variables |
| **Publication** | Export JSON manuel | Commit automatique via GitHub API |

### Assets statiques

- **Servis depuis** : `public/` → racine du site
- **Stories** : `/stories/{slug}.json` (chargées en dynamique)
- **Sons locaux** : `/sounds/{filename}` (préchargés ou streamés)
- **Police** : `/fonts/{fontfile}` (chargées via CSS)
- **CDN** : Vercel Edge Network en prod, Vite dev server en local

### Gestion des fichiers médias (audio)

| Aspect | Détails |
|--------|---------|
| **Formats supportés** | MP3, WAV, AIFF, FLAC (lecture) ; MP3 (upload) |
| **Pipeline upload** | Fichier → lamejs (compression) → Supabase Storage → métadonnées dans table `sounds` |
| **Stockage** | Supabase Storage (bucket `sounds`) + index dans `sounds-index.json` |
| **CDN** | URLs publiques Supabase (`{supabase-url}/storage/v1/object/public/sounds/{filename}`) |
| **Métadonnées** | Table Supabase `sounds` : id, label, url, tags, categories, duration, loop, mood, etc. |
| **Préchargement** | Howl instances créées au démarrage de la lecture |
| **Streaming** | Range requests supportés ( Accept-Ranges: bytes ) |

---

## 5. Commandes Clés

```bash
# Développement
npm run dev                    # Lance Vite + serveur API local (port 3001)
npm run dev:clean             # Tue les process existants avant de démarrer

# Build & qualité
npm run build                 # Build de production (Vite)
npm run lint                  # Vérification ESLint
npm run preview               # Prévisualisation du build en local

# Utilitaires
npm run add-sound             # CLI pour ajouter un son à la bibliothèque
npm run checkpoint            # Crée un point de sauvegarde Git + lance le dev server
npm run publish               # Publie les changements (commit + push + deploy Vercel)
```

---

## 6. Variables d'Environnement

### Frontend (exposées via `VITE_*`)

| Variable | Usage | Exposée |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | URL projet Supabase (lecture seule) | Oui |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (lecture seule) | Oui |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (frontend) | Oui |

### Backend (non exposées)

| Variable | Usage | Requis |
|----------|-------|--------|
| `ADMIN_PASSWORD` | Protection routes API (/api/*) | Oui |
| `SUPABASE_URL` | URL Supabase (backend) | Oui |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (écritures admin) | Oui |
| `GITHUB_TOKEN` | Token GitHub pour commits (publication) | Oui (publication) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui (publication) |
| `GITHUB_REPO` | Nom du repo GitHub | Oui (publication) |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Non |
| `RESEND_API_KEY` | Clé API Resend (newsletter) | Optionnel |

---

## 7. Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (React + Vite)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   HomePage  │  │  StoryPage  │  │     AdminPage       │  │
│  │  (catalogue)│  │  (lecture)  │  │  (édition + publish)│  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         │                ▼                     ▼             │
│         │         ┌──────────────┐    ┌──────────────┐      │
│         │         │ AudioEngine  │    │ PublishPanel │      │
│         │         │ (Howler.js)  │    │  (export)    │      │
│         │         └──────────────┘    └──────┬───────┘      │
│         │                                     │              │
└─────────┼─────────────────────────────────────┼──────────────┘
          │                                     │
          ▼                                     ▼
┌─────────────────────┐              ┌─────────────────────┐
│   VERCEL (PROD)     │              │   EXPRESS (DEV)     │
│                     │              │   (port 3001)       │
│  /api/publish ──────┼──GitHub API──┤                     │
│  /api/upload-* ─────┼──Supabase────┤  /api/publish       │
│  /api/delete-* ─────┼──Supabase────┤  /api/upload-*      │
│                     │              │  /api/delete-*      │
└─────────────────────┘              └─────────────────────┘
          │                                     │
          ▼                                     ▼
┌─────────────────────┐              ┌─────────────────────┐
│     SUPABASE        │              │      GITHUB         │
│                     │              │                     │
│  - Storage: sons    │              │  - public/stories/  │
│  - DB: sounds table │              │    {slug}.json      │
│                     │              │  - index.json       │
└─────────────────────┘              └─────────────────────┘
```

---

**Dernière mise à jour** : 17/06/2026  
**Version** : 0.0.0 (MVP)
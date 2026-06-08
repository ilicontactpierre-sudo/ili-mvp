# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | — |
| | Vite | 8.0.12 | Bundler + dev server |
| | React Router | 7.15.0 | Routing client-side |
| **Backend** | Node.js + Express | 5.2.1 | Serveur API local (dev uniquement) |
| | Vercel Serverless Functions | — | API en production (`/api/*`) |
| **Base de données** | Supabase (PostgreSQL) | 2.106.1 (SDK) | Stockage sons + abonnés newsletter |
| **Stockage fichiers** | Supabase Storage | — | Bucket `sounds` pour les assets audio |
| **Hébergement** | Vercel | — | Frontend + serverless functions |
| **CI/CD** | GitHub + Vercel auto-deploy | — | Push sur `main` → déploiement auto |
| **Audio** | Howler.js | 2.2.4 | Moteur audio principal |
| **Encodage** | FFmpeg.wasm | 0.12.15 | Compression audio côté client |

---

## 2. Structure des fichiers

```
ili-mvp/
├── index.html                 # Point d'entrée HTML
├── package.json               # Dépendances + scripts
├── vite.config.js             # Config Vite (proxy API, COOP/COEP)
├── vercel.json                # Rewrites SPA pour Vercel
├── .env                        # Variables d'env (locales)
├── eslint.config.js           # Linting
├── publish.sh                 # Script de publication
│
├── api/                       # Serverless Functions Vercel (et répliquées localement)
│   ├── publish.js             # Publie une histoire sur GitHub
│   ├── subscribe.js           # Inscription newsletter → Supabase
│   ├── send-newsletter.js     # Envoi newsletter via Resend
│   ├── upload-audio.js        # Upload audio vers Supabase Storage
│   ├── upload-sound.js        # Enregistre métadonnées son dans Supabase
│   ├── get-upload-url.js      # Génère URL signée upload Supabase
│   ├── preview-sound.js       # Stream audio local (dev)
│   ├── delete.js              # Supprime une histoire
│   ├── delete-sound.js        # Supprime un son
│   └── toggle-visibility.js   # Bascule visibilité histoire
│
├── scripts/
│   ├── dev-api-server.js      # Serveur Express local (réplique des /api)
│   ├── addSound.js            # CLI ajout son bibliothèque
│   ├── checkpoint.js          # Sauvegarde état courant
│   ├── convert-stories.js     # Conversion format histoires
│   ├── generateSoundsIndex.js # Génère index JSON des sons
│   ├── migrate-sounds-to-supabase.js  # Migration sons vers Supabase
│   └── index-boom-library.js  # Indexation BOOM Library
│
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── fonts/                 # Polices custom (.ttf, .otf)
│   ├── sounds/                # Sons UI (clic, whoosh) + .gitkeep
│   │   └── sounds-index.json  # Index local des sons
│   ├── stories/               # Histoires au format JSON
│   │   ├── index.json         # Liste de toutes les histoires
│   │   └── *.json             # Fichiers histoires individuels
│   └── textures/              # Assets graphiques (papier, etc.)
│
└── src/
    ├── main.jsx               # Point d'entrée React
    ├── App.jsx                # Routes + audio globale
    ├── index.css              # Styles de base
    │
    ├── pages/
    │   ├── HomePage.jsx       # Liste des histoires
    │   ├── StoryPage.jsx      # Lecteur d'histoire
    │   ├── AdminPage.jsx      # Interface d'édition
    │   └── NewsletterPage.jsx # Page newsletter
    │
    ├── components/
    │   ├── StoryReader.jsx    # Cœur du lecteur (segments, VFX, audio)
    │   ├── StoryReader.css    # Styles du lecteur
    │   ├── StartScreen.jsx    # Écran de démarrage d'une histoire
    │   ├── EndScreen.jsx      # Écran de fin
    │   ├── StoryMenu.jsx      # Menu de sélection
    │   ├── GameOverlay.jsx    # Overlay mode jeu
    │   ├── ReaderSettings.jsx # Réglages (DYS, emoji, thème)
    │   └── admin/             # Composants panneau admin
    │       ├── PublishPanel.jsx       # Publier histoire
    │       ├── DraftManager.jsx       # Brouillons
    │       ├── SoundBlockPanel.jsx    # Édition blocs son
    │       ├── VfxBlockPanel.jsx      # Édition effets VFX
    │       ├── AudioTimeline.jsx      # Timeline audio unifiée
    │       ├── UnifiedSegmentsTimeline.jsx  # Timeline segments
    │       ├── WaveformTrimmer.jsx    # Découpe audio waveform
    │       ├── SoundLibraryPicker.jsx # Sélecteur bibliothèque
    │       ├── SoundImporter.jsx      # Import sons locaux
    │       ├── FormatToolbar.jsx      # Outils formatage texte
    │       ├── GameModePanel.jsx      # Configuration mode jeu
    │       ├── OrchestrationPanel.jsx # Orchestration événements
    │       ├── StoryPreviewModal.jsx  # Prévisualisation
    │       ├── StoryLoader.jsx        # Chargement histoire
    │       ├── PublishAnimation.jsx   # Animation publication
    │       ├── constants.js           # Constantes admin
    │       └── README.md              # Doc panneau admin
    │
    ├── engine/
    │   ├── AudioEngine.js     # Moteur audio (Howler.js wrapper)
    │   └── HapticEngine.js    # Moteur haptique (vibrations)
    │
    ├── utils/
    │   ├── renderMarkdown.jsx # Rendu Markdown → HTML
    │   ├── bionicReading.jsx  # Algorithme Bionic Reading
    │   ├── emojiDict.jsx      # Remplacement texte → emojis
    │   └── segmentAlgorithm.js # Algo de découpe segments
    │
    ├── styles/
    │   ├── global.css         # Styles globaux
    │   └── vfx.css            # Styles effets visuels
    │
    └── assets/
        ├── hero.png
        ├── react.svg
        └── vite.svg
```

---

## 3. Flux de données principal

### Lecture d'une histoire
```
1. HomePage → liste depuis /stories/index.json (fichier statique)
2. Utilisateur clique sur une histoire → navigation vers /lire/:storyId
3. StoryPage charge /stories/{storyId}.json (fichier statique)
4. StoryReader affiche les segments un par un
5. À chaque segment :
   - AudioEngine exécute les audioEvents du segment
   - HapticEngine déclenche les vibrations (vfxTracks)
   - VFX CSS appliquent effets visuels (typewriter, static, erased, flash)
```

### Publication d'une histoire (Admin)
```
1. AdminPage (panneau Publish) → collecte storyData + slug
2. POST /api/publish (local: localhost:3001, prod: Vercel function)
3. La fonction :
   a. Vérifie ADMIN_PASSWORD
   b. Écrit public/stories/{slug}.json sur GitHub (API REST)
   c. Met à jour public/stories/index.json sur GitHub
4. Vercel redéploie automatiquement → nouveau contenu en ligne
```

### Upload d'un son (Admin)
```
1. AdminPage → SoundImporter ou SoundLibraryPicker
2. POST /api/get-upload-url → URL signée Supabase Storage
3. Upload direct du fichier vers Supabase Storage (signed URL)
4. POST /api/upload-sound → enregistre métadonnées dans table `sounds` Supabase
```

### Authentification
- **Pas de système d'auth utilisateur.**
- **Admin** : mot de passe simple (`VITE_ADMIN_PASSWORD` côté client, `ADMIN_PASSWORD` côté serveur) vérifié à chaque requête API admin.
- **Lecteur** : accès libre à toutes les histoires publiées.

---

## 4. Points sensibles connus

### Fichiers de configuration critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy `/api/*` → `localhost:3001` (dev), headers COOP/COEP pour SharedArrayBuffer (FFmpeg.wasm) |
| `vercel.json` | Rewrite SPA : toutes les routes → `index.html` |
| `.env` | Variables locales (client + serveur). **Attention : contient des secrets en clair !** |
| `scripts/dev-api-server.js` | Réplique locale des serverless functions Vercel (Express sur port 3001) |

### Différences local vs production

| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| API | Express sur `localhost:3001` | Vercel Serverless Functions |
| Stories | Fichiers JSON dans `public/stories/` | Idem, servis par Vercel CDN |
| Sons | Fichiers locaux + Supabase Storage | Supabase Storage uniquement |
| Preview audio | Stream depuis disque local (`/api/preview-sound`) | Stream depuis Supabase Storage |
| Upload | Direct vers Supabase via serveur local | Direct vers Supabase via signed URL |

### Assets statiques

- **Servis depuis** : dossier `public/` → racine du site
- **Stories** : `public/stories/*.json` (fichiers JSON statiques)
- **Sons UI** : `public/sounds/*.mp3` (clic, whoosh)
- **Polices** : `public/fonts/` (locales) + Google Fonts (VT323, Playfair Display, Lexend)
- **Textures** : `public/textures/` (papier, etc.)

### Gestion des fichiers médias (audio)

| Type | Pipeline | Formats supportés | Stockage |
|------|----------|-------------------|----------|
| **Sons UI** (clic, whoosh) | Commités dans `public/sounds/` | MP3 | Git + Vercel CDN |
| **Sons histoires** | Upload via admin → Supabase Storage | MP3, WAV, AIFF, FLAC (preview local) | Supabase Storage (bucket `sounds`) |
| **Compression** | FFmpeg.wasm côté client avant upload | → MP3 128kbps | — |
| **Streaming** | Range requests (partial content) | — | Supabase CDN public |
| **Métadonnées** | Table `sounds` Supabase (id, url, tags, categories, etc.) | — | Supabase PostgreSQL |

---

## 5. Commandes clés

```bash
# Développement (lance Vite + serveur API local)
npm run dev

# Développement (nettoie les processus avant de lancer)
npm run dev:clean

# Build de production
npm run build

# Prévisualisation build local
npm run preview

# Linting
npm run lint

# CLI : ajouter un son à la bibliothèque
npm run add-sound

# Sauvegarde + lancement checkpoint
npm run checkpoint

# Publication (déploiement manuel)
npm run publish
```

---

## 6. Variables d'environnement

### Client (préfixe `VITE_`, exposées dans le code frontend)
- `VITE_ADMIN_PASSWORD`
- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Serveur (uniquement côté API, NON exposées)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_PASSWORD`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `RESEND_API_KEY`

> ⚠️ **Sécurité** : Le fichier `.env` actuel contient des secrets en clair. En production, ces variables doivent être configurées dans Vercel Dashboard (Settings → Environment Variables).
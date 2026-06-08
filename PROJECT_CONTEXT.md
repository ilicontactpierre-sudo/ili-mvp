# ILi MVP — Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Plugin React (@vitejs/plugin-react) |
| **Backend (dev)** | Express | 5.2.1 | Serveur API local sur port 3001 |
| **Backend (prod)** | Vercel | — | Fonctions serverless (dossier `/api`) |
| **Base de données** | Supabase | — | PostgreSQL + Storage (bucket `sounds`) |
| **ORM/Client** | Supabase JS | 2.106.1 | Accès direct depuis frontend et API |
| **Audio** | Howler.js | 2.2.4 | Lecture audio + FFmpeg.wasm pour traitement |
| **Email** | Resend | — | Envoi de newsletters via API |
| **Hébergement** | Vercel | — | Déploiement automatique depuis GitHub |
| **CI/CD** | GitHub + Vercel | — | Push sur `main` → déploiement auto |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless Vercel
│   ├── delete.js              # Supprime une histoire
│   ├── delete-sound.js        # Supprime un son de Supabase
│   ├── get-upload-url.js      # Génère URL signée upload
│   ├── preview-sound.js       # Stream audio (dev only)
│   ├── publish.js             # Publie sur GitHub
│   ├── send-newsletter.js     # Envoie newsletter via Resend
│   ├── subscribe.js           # Inscription newsletter
│   ├── toggle-visibility.js   # Bascule visibilité histoire
│   ├── upload-audio.js        # Upload fichier audio → Supabase
│   └── upload-sound.js        # Enregistre métadonnées son
├── public/
│   ├── fonts/                 # Polices custom (NamoraDayana, Oanteh)
│   ├── sounds/                # Sons UI (clic, whoosh)
│   │   └── sounds-index.json  # Index des sons UI
│   ├── stories/               # Histoires JSON (statique + publié)
│   │   ├── index.json         # Liste des histoires
│   │   └── *.json             # Fichiers d'histoires individuelles
│   └── textures/              # Assets graphiques (paper.png)
├── scripts/
│   ├── addSound.js            # CLI ajout son bibliothèque
│   ├── audio-dictionary.js    # Dictionnaire audio
│   ├── checkpoint.js          # Sauvegarde état
│   ├── convert-stories.js     # Conversion format histoires
│   ├── dev-api-server.js      # Serveur Express dev (port 3001)
│   ├── generateSoundsIndex.js # Génère index sons
│   ├── index-boom-library.js  # Indexe BOOM Library
│   └── migrate-sounds-to-supabase.js
├── src/
│   ├── components/
│   │   ├── admin/             # Interface d'édition
│   │   │   ├── AudioTimeline.jsx      # Timeline 6 colonnes
│   │   │   ├── DraftManager.jsx       # Gestion brouillons
│   │   │   ├── FormatToolbar.jsx      # Outils formatage
│   │   │   ├── GameModePanel.jsx      # Mode jeu
│   │   │   ├── OrchestrationPanel.jsx # Orchestration sons
│   │   │   ├── PublishPanel.jsx       # Publication
│   │   │   ├── SoundBlock.jsx         # Bloc sonore timeline
│   │   │   ├── SoundBlockPanel.jsx    # Édition propriétés son
│   │   │   ├── SoundImporter.jsx      # Import sons
│   │   │   ├── SoundLibraryPicker.jsx # Sélecteur bibliothèque
│   │   │   ├── StoryLoader.jsx        # Chargement histoire
│   │   │   ├── StoryPreviewModal.jsx  # Prévisualisation
│   │   │   ├── UnifiedSegmentsTimeline.jsx
│   │   │   ├── VfxBlock.jsx           # Effets visuels
│   │   │   ├── VfxBlockPanel.jsx      # Édition VFX
│   │   │   ├── WaveformTrimmer.jsx    # Découpe audio
│   │   │   └── constants.js           # Config partagée
│   │   ├── EndScreen.jsx      # Écran de fin
│   │   ├── GameOverlay.jsx    # Overlay mode jeu
│   │   ├── ReaderSettings.jsx # Paramètres lecture
│   │   ├── StartScreen.jsx    # Écran d'accueil
│   │   ├── StoryMenu.jsx      # Menu sélection histoire
│   │   ├── StoryReader.jsx    # Lecteur principal
│   │   └── StoryReader.css
│   ├── engine/
│   │   ├── AudioEngine.js     # Moteur audio (Howler)
│   │   └── HapticEngine.js    # Retours haptiques
│   ├── pages/
│   │   ├── AdminPage.jsx      # Interface admin/édition
│   │   ├── HomePage.jsx       # Liste des histoires
│   │   ├── NewsletterPage.jsx # Gestion newsletter
│   │   └── StoryPage.jsx      # Page de lecture
│   ├── styles/
│   │   ├── global.css         # Styles globaux
│   │   └── vfx.css            # Effets visuels
│   ├── utils/
│   │   ├── bionicReading.jsx  # Mode lecture bionique
│   │   ├── emojiDict.jsx      # Dictionnaire emoji
│   │   ├── renderMarkdown.jsx # Rendu markdown
│   │   ├── segmentAlgorithm.js # Algo découpe texte
│   │   └── soundSearch.js     # Recherche sons (Fuse.js)
│   ├── App.jsx                # Routing principal
│   ├── main.jsx               # Point d'entrée
│   └── index.css
├── .gitignore
├── eslint.config.js
├── index.html                 # HTML d'entrée (SPA)
├── package.json
├── vercel.json                # Config Vercel (rewrites SPA)
└── vite.config.js             # Config Vite + proxy API
```

---

## 3. Flux de Données Principal

### Navigation & Routing
```
Utilisateur → HomePage (/) → StoryPage (/lire/:storyId) → AdminPage (/admin)
```

### Lecture d'une histoire
```
1. StoryPage charge l'histoire depuis /stories/{id}.json
2. StoryReader.jsx parse le contenu (segments, sons, VFX)
3. AudioEngine.js gère la lecture synchronisée (Howler.js)
4. HapticEngine.js ajoute les retours haptiques
```

### Publication (Admin → Production)
```
1. AdminPage → PublishPanel → POST /api/publish
2. Serveur authentifie (ADMIN_PASSWORD)
3. Écrit l'histoire dans GitHub (public/stories/{slug}.json)
4. Met à jour public/stories/index.json
5. Vercel déploie automatiquement
```

### Upload Audio
```
1. AdminPage → SoundImporter → POST /api/upload-audio
2. Serveur compresse (si besoin) et upload vers Supabase Storage
3. Retourne URL publique du fichier
4. Métadonnées enregistrées via POST /api/upload-sound
```

### Authentification
- **Pas de système d'auth utilisateur** — l'app est publique
- **Auth admin** : mot de passe unique (`ADMIN_PASSWORD`) pour toutes les opérations sensibles
- Vérification côté serveur (API Express ou Vercel functions)

---

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API vers localhost:3001, headers COOP/COEP pour FFmpeg.wasm |
| `vercel.json` | Rewrite toutes les routes vers index.html (SPA) |
| `scripts/dev-api-server.js` | Serveur Express dev — gère uploads, publications, previews |

### Différences Local vs Production

| Aspect | Développement | Production |
|--------|---------------|------------|
| **API** | Express sur port 3001 | Vercel serverless functions |
| **Stories** | Fichiers locaux `/public/stories/` | GitHub → déployés par Vercel |
| **Audio** | Stream depuis disque local | Supabase Storage (CDN) |
| **Upload** | Direct vers Supabase via serveur local | Supabase via signed URLs |

### Assets Statiques
- **Servis depuis** : `/public/` → racine du site
- **Stories** : `/public/stories/` — chargées en JSON par le frontend
- **Sons UI** : `/public/sounds/` — sons courts (clic, whoosh)
- **Textures** : `/public/textures/` — assets graphiques

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio (sons)** | Upload → Compression (si besoin) → Supabase Storage | MP3, WAV, FLAC, AIFF | Supabase bucket `sounds` |
| **Audio (UI)** | Fichiers statiques | MP3 | `/public/sounds/` |
| **Images** | — | — | — (non utilisé actuellement) |
| **Histoires** | Édition → Publication GitHub → Déploiement Vercel | JSON | GitHub + Vercel CDN |

- **Pas de CDN dédié** — Supabase Storage sert de CDN pour l'audio
- **FFmpeg.wasm** disponible pour traitement audio côté client (compression, conversion)

---

## 5. Commandes Clés

```bash
# Développement (lance Vite + serveur API Express)
npm run dev

# Build de production
npm run build

# Prévisualisation build
npm run preview

# Lint
npm run lint

# Ajouter un son à la bibliothèque
npm run add-sound

# Publier (déploie sur Vercel)
npm run publish
```

---

## 6. Variables d'Environnement

### Requis (.env)

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Mot de passe pour opérations admin |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé de service Supabase (privée) |
| `GITHUB_TOKEN` | Token GitHub pour publication |
| `GITHUB_OWNER` | Propriétaire du repo GitHub |
| `GITHUB_REPO` | Nom du repo GitHub |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) |
| `RESEND_API_KEY` | Clé API Resend pour newsletters |

---

## 7. Architecture Résumé

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  HomePage   │  │ StoryPage   │  │  AdminPage  │         │
│  │  (liste)    │  │ (lecture)   │  │ (édition)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                 │
│         ▼                ▼                ▼                 │
│  ┌─────────────────────────────────────────────────┐       │
│  │            AudioEngine + HapticEngine           │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   API (dev)     │ │  API (prod)     │ │   Supabase      │
│ Express:3001    │ │ Vercel Functions│ │ Storage + DB    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   GitHub Repo   │
                    │ (stories + index)│
                    └─────────────────┘
# ILi — Lecture Immersive · Contexte Projet

Application web de lecture immersive d'histoires avec design sonore, effets visuels et gamification.

---

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI component-based |
| **Bundler** | Vite | 8.0.12 | Build + dev server avec HMR |
| **Routing** | React Router | 7.15.0 | Navigation SPA (/lire/:storyId, /admin) |
| **Audio** | Howler.js | 2.2.4 | Moteur audio (play, fade, loop, pan) |
| **Audio (FFmpeg)** | @ffmpeg/ffmpeg | 0.12.15 | Compression audio côté client |
| **Backend (dev)** | Express | 5.2.1 | Serveur API local (port 3001) |
| **Backend (prod)** | Vercel Serverless | — | Fonctions dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | Storage sons + tables analytics/newsletter |
| **Déploiement** | Vercel | — | SPA + serverless functions |
| **Librairies métier** | fuse.js | 7.3.0 | Recherche floue bibliothèque sonore |
| | lamejs | 1.2.1 | Encodage MP3 |

---

## 2. Structure des Fichiers

```
/
├── index.html                    # Point d'entrée HTML (SPA)
├── package.json                  # Dépendances + scripts npm
├── package-lock.json             # Lock des dépendances
├── vite.config.js                # Config Vite (proxy API, headers COOP/COEP)
├── vercel.json                   # Rewrites SPA pour React Router
├── .gitignore                    # Fichiers exclus (node_modules, .env, dist)
├── eslint.config.js              # Config linting
│
├── /api/                         # Serverless functions (Vercel + dev Express)
│   ├── publish.js                # POST → publie histoire via GitHub API
│   ├── upload-audio.js           # POST → upload fichier audio vers Supabase
│   ├── upload-sound.js           # POST → enregistre métadonnées son dans Supabase
│   ├── get-upload-url.js         # POST → génère URL signée Supabase
│   ├── preview-sound.js          # GET → stream fichier audio local (dev)
│   ├── delete.js                 # DELETE → supprime histoire via GitHub
│   ├── toggle-visibility.js      # POST → masque/affiche histoire dans index
│   ├── delete-sound.js           # DELETE → supprime son de Supabase
│   ├── subscribe.js              # POST → ajoute email newsletter Supabase
│   └── send-newsletter.js        # POST → envoie newsletter via Resend API
│
├── /public/                      # Assets statiques (servis tels quels)
│   ├── manifest.json             # PWA manifest
│   ├── favicon.svg               # Icône navigateur
│   ├── icons.svg                 # Sprite SVG pour icônes UI
│   ├── /fonts/                   # Polices custom (.ttf, .otf)
│   ├── /sounds/                  # Fichiers audio UI + bibliothèque
│   │   ├── sounds-index.json     # Index métadonnées bibliothèque sonore
│   │   └── *.mp3                 # Fichiers sons (UI + histoires)
│   ├── /stories/                 # Fichiers JSON des histoires
│   │   ├── index.json            # Liste des histoires publiées
│   │   └── *.json                # Données d'une histoire (segments, sons, vfx)
│   ├── /textures/                # Images pour effets visuels
│   │   └── paper.png             # Texture papier pour VFX
│   └── soundSearchWorker.js      # Web Worker pour recherche sons
│
├── /scripts/                     # Scripts utilitaires (CLI)
│   ├── dev-api-server.js         # Serveur Express local (proxy API)
│   ├── addSound.js               # Script d'ajout de son en CLI
│   ├── checkpoint.js             # Script de sauvegarde/restauration
│   ├── convert-stories.js        # Conversion format histoires
│   ├── generateSoundsIndex.js    # Génère sounds-index.json
│   ├── index-boom-library.js     # Indexe bibliothèque BOOM
│   ├── migrate-sounds-to-supabase.js # Migration sons → Supabase
│   ├── update-story-urls.js      # Met à jour URLs dans histoires
│   ├── audio-dictionary.js       # Dictionnaire audio
│   └── stats-sounds.cjs          # Stats bibliothèque
│
├── /src/
│   ├── main.jsx                  # Point d'entrée React (mount #root)
│   ├── App.jsx                   # Routes + sons UI globaux (clic, settings)
│   ├── index.css                 # Styles globaux + variables CSS
│   │
│   ├── /pages/                   # Pages routées
│   │   ├── HomePage.jsx          # Accueil avec liste histoires + logo animé
│   │   ├── StoryPage.jsx         # Lecteur d'histoire (segments, audio, vfx)
│   │   ├── AdminPage.jsx         # Éditeur complet (segments, sons, vfx, gamification)
│   │   ├── NewsletterPage.jsx    # Gestion newsletter + abonnés
│   │   └── AnalyticsDashboard.jsx # Dashboard analytics (lecture)
│   │
│   ├── /components/              # Composants UI réutilisables
│   │   ├── StoryReader.jsx       # Affichage segment courant + texte
│   │   ├── StoryMenu.jsx         # Liste déroulante des histoires
│   │   ├── StartScreen.jsx       # Écran de démarrage avant lecture
│   │   ├── EndScreen.jsx         # Écran de fin après lecture
│   │   ├── ReaderSettings.jsx    # Paramètres (police, taille, progression)
│   │   ├── GameOverlay.jsx       # Overlay pour modes de jeu (gamification)
│   │   ├── VfxOverlay.jsx        # Overlay pour effets visuels (particules, etc.)
│   │   └── /admin/               # Composants panneau admin
│   │       ├── PublishPanel.jsx      # Publication (auto + export JSON)
│   │       ├── OrchestrationPanel.jsx # Timeline audio + vfx
│   │       ├── SoundBlockPanel.jsx   # Édition propriétés d'un bloc son
│   │       ├── SoundLibraryPicker.jsx # Sélecteur de sons (recherche + filtres)
│   │       ├── DraftManager.jsx      # Brouillons (sauvegarde/restauration)
│   │       ├── StoryLoader.jsx       # Chargement histoire existante
│   │       ├── StoryPreviewModal.jsx # Aperçu avant publication
│   │       ├── GameModePanel.jsx     # Configuration gamification
│   │       ├── VfxBlock.jsx          # Bloc effet visuel
│   │       ├── VfxBlockPanel.jsx     # Édition propriétés VFX
│   │       ├── WaveformTrimmer.jsx   # Trim audio (waveform)
│   │       ├── SoundImporter.jsx     # Import sons depuis bibliothèque BOOM
│   │       ├── AudioTimeline.jsx     # Timeline audio (ancien)
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline unifiée (segments + sons + vfx)
│   │       ├── FormatToolbar.jsx     # Barre d'outils formatage texte
│   │       ├── PublishAnimation.jsx  # Animation de publication
│   │       ├── AnalyticsDashboard.jsx # Dashboard analytics
│   │       └── constants.js          # Constantes UI admin
│   │
│   ├── /engine/                  # Moteurs (logique métier)
│   │   ├── AudioEngine.js        # Gestion lecture audio (Howler.js) : play, fade, loop, pan, trim
│   │   └── HapticEngine.js       # Vibrations haptiques (mobile)
│   │
│   ├── /utils/                   # Fonctions utilitaires
│   │   ├── segmentAlgorithm.js   # Algorithme de découpe automatique du texte
│   │   ├── renderMarkdown.jsx    # Rendu Markdown → HTML
│   │   ├── bionicReading.jsx     # Mode lecture bionique
│   │   ├── emojiDict.jsx         # Dictionnaire emoji
│   │   ├── soundSearch.js        # Recherche/filtres bibliothèque sonore
│   │   └── analytics.js          # Envoi événements lecture → Supabase
│   │
│   ├── /styles/                  # Feuilles de style
│   │   ├── global.css            # Styles globaux + variables CSS (couleurs, polices)
│   │   └── vfx.css               # Styles pour effets visuels
│   │
│   └── /assets/                  # Assets importés dans le bundle
│       ├── hero.png              # Image héro
│       ├── vite.svg              # Logo Vite
│       └── react.svg             # Logo React
```

---

## 3. Flux de Données Principal

### 3.1 Lecture d'une histoire

```
Utilisateur → HomePage (clic sur histoire)
  → Navigation vers /lire/:storyId
  → StoryPage charge /stories/{storyId}.json (fetch HTTP)
  → StoryPage affiche StartScreen
  → Utilisateur clique "Commencer"
  → AudioEngine précharge les sons (Howl instances)
  → StoryReader affiche segment courant
  → AudioEngine exécute audioEvents ou soundTracks du segment
  → Utilisateur clique/swap → segment suivant
  → AudioEngine met à jour sons actifs (onSegmentChange)
  → Fin de l'histoire → EndScreen + analytics
```

### 3.2 Publication d'une histoire (admin)

```
Admin → /admin (authentification par mot de passe)
  → Crée/modifie histoire (segments, sons, vfx, gamification)
  → PublishPanel.buildStoryData() convertit soundTracks → audioEvents
  → POST /api/publish { password, slug, storyData }
  → Serveur vérifie ADMIN_PASSWORD
  → Serveur écrit public/stories/{slug}.json via GitHub API
  → Serveur met à jour public/stories/index.json via GitHub API
  → Vercel redéploie automatiquement (~30s)
```

### 3.3 Upload d'un son

```
Admin → SoundLibraryPicker → sélectionne fichier audio
  → Compression via @ffmpeg/ffmpeg (côté client)
  → POST /api/get-upload-url → URL signée Supabase
  → Upload direct vers Supabase Storage (bucket: sounds)
  → POST /api/upload-sound → métadonnées dans table sounds (Supabase)
  → Bibliothèque mise à jour (sounds-index.json + Supabase)
```

### 3.4 Gestion de l'authentification

| Type | Mécanisme | Stockage |
|------|-----------|----------|
| **Admin** | Mot de passe unique (`ADMIN_PASSWORD`) | `sessionStorage` (`ili_admin_password`) + fallback `.env` |
| **Lecteur** | Aucun (pas de login) | — |

---

## 4. Points Sensibles

### 4.1 Fichiers de Configuration Critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev, headers COOP/COEP (requis pour SharedArrayBuffer/FFmpeg) | FFmpeg ne fonctionne pas sans COOP/COEP |
| `vercel.json` | Rewrite toutes les routes vers index.html (SPA) | React Router cassé sans ce rewrite |
| `.gitignore` | Exclut `.env`, `node_modules`, `dist` | Fuites de secrets si mal configuré |
| `package.json` | Scripts, dépendances, version | Build/dev cassés si scripts modifiés |

### 4.2 Différences Local vs Production

| Aspect | Développement (local) | Production (Vercel) |
|--------|----------------------|---------------------|
| **API** | Express sur port 3001 (`scripts/dev-api-server.js`) | Serverless functions (`/api/*.js`) |
| **Proxy** | Vite proxy vers localhost:3001 | Pas de proxy, appels directs |
| **Stories** | Fichiers JSON dans `public/stories/` | Idem, mais versionnés sur GitHub |
| **Sons** | Fichiers locaux + Supabase | Supabase Storage uniquement |
| **Audio preview** | Stream depuis disque local | Stream depuis Supabase CDN |
| **Variables env** | `.env` local | Variables Vercel |

### 4.3 Assets Statiques

| Type | Chemin | Comment servis |
|------|--------|----------------|
| **HTML/CSS/JS** | Bundle Vite (`dist/`) | CDN Vercel (edge) |
| **Polices** | `/public/fonts/` | Servies par Vercel (cache long) |
| **Sons UI** | `/public/sounds/` | Servis par Vercel (streaming HTTP) |
| **Textures** | `/public/textures/` | Servies par Vercel (images) |
| **Stories** | `/public/stories/*.json` | Servies par Vercel (JSON statique) |
| **Sons bibliothèque** | Supabase Storage | CDN Supabase (signed URLs) |

### 4.4 Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage | CDN | Métadonnées |
|------|----------|---------|----------|-----|-------------|
| **Audio (sons)** | Upload → Compression FFmpeg → Supabase Storage | MP3, WAV, AIFF, FLAC | Bucket `sounds` Supabase | CDN Supabase | Table `sounds` (id, label, url, tags, categories, duration, loop, mood, etc.) |
| **Audio (UI)** | Fichiers statiques | MP3 | `/public/sounds/` | Vercel | — |
| **Images (VFX)** | Fichiers statiques | PNG | `/public/textures/` | Vercel | — |
| **Stories** | Édition admin → GitHub API | JSON | Repo GitHub | Vercel | `index.json` + métadonnées inline |

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────────────────
npm run dev              # Git pull + Vite + Express API (port 3001)
npm run dev:clean        # Tue les process existants + redémarre proprement

# ── Build ──────────────────────────────────────────────────────────────────
npm run build            # Build Vite → dist/
npm run preview          # Prévisualisation build en local

# ── Qualité ────────────────────────────────────────────────────────────────
npm run lint             # ESLint sur tout le projet

# ── Utilitaires ────────────────────────────────────────────────────────────
npm run add-sound        # Ajoute un son via CLI (scripts/addSound.js)
npm run checkpoint       # Sauvegarde + redémarre serveur dev
npm run publish          # Lance publish.sh (déploiement)
```

---

## 6. Variables d'Environnement

### Côté Serveur (`.env` / Vercel)

| Variable | Usage | Requis |
|----------|-------|--------|
| `ADMIN_PASSWORD` | Authentification endpoints admin | Oui |
| `SUPABASE_URL` | URL du projet Supabase | Oui |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (admin) | Oui |
| `GITHUB_TOKEN` | Token API GitHub (publication) | Oui (pour publish) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui (pour publish) |
| `GITHUB_REPO` | Nom du repo GitHub | Oui (pour publish) |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Non |
| `RESEND_API_KEY` | Clé API Resend (envoi newsletter) | Oui (pour newsletter) |

### Côté Client (`.env` / Vercel → `import.meta.env`)

| Variable | Usage | Requis |
|----------|-------|--------|
| `VITE_SUPABASE_URL` | URL Supabase (client) | Oui |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (client) | Oui |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (fallback) | Non |
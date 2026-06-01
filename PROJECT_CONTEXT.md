# ILi MVP — Contexte Projet

Application web de création et lecture d'histoires interactives avec bande sonore orchestrée.

---

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | Vite 8.0 (bundler + dev server) |
| **Routing** | React Router | 7.15.0 | SPA — `/`, `/lire/:storyId`, `/admin` |
| **Audio** | Howler.js | 2.2.4 | Play, fade, loop, trim, sprites |
| **Recherche** | Fuse.js | 7.3.0 | Recherche floue dans la bibliothèque sonore |
| **Encodage** | lamejs | 1.2.1 | Encodage MP3 côté client |
| **Backend local** | Express | 5.2.1 | Serveur dev port 3001 (`scripts/dev-api-server.js`) |
| **Backend prod** | Vercel Functions | — | Serverless dans `api/` |
| **Base de données** | Supabase | 2.106.1 | Storage bucket `sounds` + DB éventuelle |
| **Hébergement** | Vercel | — | Déploiement auto depuis GitHub |
| **CI/CD** | Git + Vercel | — | Push → déploiement automatique |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                              # Vercel serverless functions (prod)
│   ├── delete.js                     # DELETE — supprime une histoire (GitHub API)
│   ├── preview-sound.js              # GET — stream audio local (dev uniquement)
│   ├── publish.js                    # POST — publie/update une histoire sur GitHub
│   ├── toggle-visibility.js          # PATCH — rend une histoire publique/privée
│   ├── upload-audio.js               # POST — upload audio vers Supabase
│   └── upload-sound.js               # POST — upload son vers bibliothèque
│
├── public/                           # Assets statiques (servis tels quels)
│   ├── favicon.svg
│   ├── icons.svg
│   ├── textures/
│   │   └── paper.png                 # Texture fond papier
│   ├── sounds/                       # Sons UI + bibliothèque locale
│   │   ├── sounds-index.json         # Index de la bibliothèque sonore
│   │   └── *.mp3                     # Clics, whooshs, ambiances
│   └── stories/                      # Histoires publiées
│       ├── index.json                # Catalogue des histoires disponibles
│       └── *.json                    # Fichiers d'histoires individuelles
│
├── scripts/
│   ├── dev-api-server.js             # Serveur Express local (port 3001)
│   ├── generateSoundsIndex.js        # Génère `sounds-index.json`
│   ├── index-boom-library.js         # Indexe une bibliothèque BOOM externe
│   ├── addSound.js                   # CLI — ajout d'un son à la bibliothèque
│   ├── checkpoint.js                 # Restore + lance le dev server
│   ├── convert-stories.js            # Conversion de formats d'histoires
│   ├── migrate-sounds-to-supabase.js # Migration sons vers Supabase
│   ├── update-story-urls.js          # Mise à jour des URLs dans les histoires
│   └── audio-dictionary.js           # Dictionnaire de métadonnées audio
│
├── src/
│   ├── main.jsx                      # Point d'entrée React
│   ├── App.jsx                        # Routes + sons UI globaux (clics)
│   ├── index.css                      # Styles racine
│   │
│   ├── pages/
│   │   ├── HomePage.jsx              # Catalogue des histoires
│   │   ├── StoryPage.jsx             # Lecteur d'histoire
│   │   └── AdminPage.jsx             # Interface d'édition (auth password)
│   │
│   ├── components/
│   │   ├── StartScreen.jsx           # Écran d'accueil avant lecture
│   │   ├── EndScreen.jsx             # Écran de fin après lecture
│   │   ├── StoryReader.jsx           # Lecteur principal (segments + audio)
│   │   ├── StoryReader.css           # Styles du lecteur
│   │   ├── StoryMenu.jsx             # Menu latéral en lecture
│   │   ├── ReaderSettings.jsx        # Réglages (bionic, police, etc.)
│   │   └── admin/                    # Interface d'administration
│   │       ├── DraftManager.jsx           # Brouillons (localStorage)
│   │       ├── StoryLoader.jsx            # Chargement histoires existantes
│   │       ├── FormatToolbar.jsx          # Barre d'outils markdown
│   │       ├── OrchestrationPanel.jsx     # Orchestration audio avancée
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline segments + events
│   │       ├── SoundBlockPanel.jsx        # Édition des blocs son
│   │       ├── SoundBlock.jsx             # Composant bloc son unitaire
│   │       ├── SoundLibraryPicker.jsx     # Sélecteur bibliothèque sonore
│   │       ├── SoundImporter.jsx          # Import sons externes
│   │       ├── WaveformTrimmer.jsx        # Édition trim audio
│   │       ├── AudioTimeline.jsx          # Timeline audio alternative
│   │       ├── VfxBlock.jsx               # Bloc d'effets visuels
│   │       ├── VfxBlockPanel.jsx          # Édition des VFX
│   │       ├── PublishPanel.jsx           # Interface de publication
│   │       ├── PublishAnimation.jsx       # Animation de publication
│   │       ├── StoryPreviewModal.jsx      # Aperçu avant publication
│   │       └── constants.js               # Constantes partagées admin
│   │
│   ├── engine/
│   │   ├── AudioEngine.js            # Moteur audio (play, fade, loop, trim)
│   │   └── HapticEngine.js           # Moteur de vibrations haptiques
│   │
│   ├── utils/
│   │   ├── segmentAlgorithm.js       # Découpage du texte en segments
│   │   ├── renderMarkdown.jsx        # Rendu markdown → JSX
│   │   ├── bionicReading.jsx         # Algorithme de lecture bionique
│   │   └── emojiDict.jsx             # Dictionnaire emoji → texte
│   │
│   ├── styles/
│   │   ├── global.css                # Styles globaux
│   │   └── vfx.css                   # Styles des effets visuels
│   │
│   └── assets/
│       ├── hero.png
│       ├── react.svg
│       └── vite.svg
│
├── index.html                        # Entry HTML
├── vite.config.js                    # Config Vite (proxy + fs allow)
├── vercel.json                       # Rewrites SPA pour Vercel
├── package.json
├── eslint.config.js
├── publish.sh                        # Script publication Git → Vercel
├── .gitignore
└── README.md
```

---

## 3. Flux de Données Principal

### Création / Édition (Admin)

```
AdminPage (mot de passe sessionStorage)
  → Chargement histoire existante (StoryLoader → fetch /stories/{slug}.json)
     ou nouvelle histoire
  → Édition texte + métadonnées + FormatToolbar
  → segmentAlgorithm.js découpe le texte en segments
  → UnifiedSegmentsTimeline : édition segments + audioEvents
  → SoundLibraryPicker / SoundImporter : attribution de sons par segment
  → WaveformTrimmer : trim audio par bloc
  → Brouillon sauvegardé dans localStorage (DraftManager)
  → PublishPanel → POST api/publish.js
     → Écriture sur GitHub : story JSON + mise à jour index.json
     → Vercel redéploie → histoire disponible sur HomePage
```

### Lecture

```
HomePage → fetch /stories/index.json → affiche le catalogue
  → Clic sur une histoire → navigation /lire/:storyId
  → StoryPage → fetch /stories/{slug}.json
  → AudioEngine instancie les Howl pour chaque son référencé
  → StoryReader : défilement segment par segment
     → Déclenchement audioEvents synchronisés (play, stop, fadeIn, fadeOut, volume)
  → EndScreen : écran de fin avec option rejouer
```

### Authentification

- **Admin** : mot de passe saisi dans une modale, vérifié contre `import.meta.env.VITE_ADMIN_PASSWORD` (client) + `process.env.ADMIN_PASSWORD` (serveur)
- **Session** : `sessionStorage` conserve le mot de passe pour la session
- Pas de multi-utilisateurs — usage mono-admin

---

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy `/api/preview-sound` → `localhost:3001` ; accès FS étendu pour BOOM library externe |
| `vercel.json` | Rewrite toutes les routes vers `index.html` (SPA) |
| `scripts/dev-api-server.js` | Serveur Express local — stream audio avec range requests (port 3001) |
| `public/sounds/sounds-index.json` | Index bibliothèque sonore (id, label, tags, categories, mood, intensity, filename, url, loop) |

### Différences Local vs Production

| Aspect | Local (`npm run dev`) | Production (Vercel) |
|--------|----------------------|---------------------|
| API backend | Express port 3001 | Vercel Functions (`api/*.js`) |
| Preview audio | Stream fichier local via Express | URL Supabase ou `/sounds/` public |
| Stories | Fichiers JSON dans `public/stories/` | Commités sur GitHub via API |
| Upload audio | — | Supabase storage bucket `sounds` |
| Variables env | `.env` / `.env.local` | Vercel dashboard |

### Assets Statiques

- **`public/`** : servi directement par Vite (dev) et Vercel (prod)
- **Sons UI** (clics, whooshs) : `public/sounds/*.mp3` — chargés via `new Audio()` dans `App.jsx`
- **Sons d'histoires** : hébergés sur Supabase storage, référencés par URL dans les fichiers d'histoire
- **Histoires** : `public/stories/*.json` — commités sur GitHub, servis statiquement
- **Icônes** : `public/icons.svg` (sprite SVG)

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio stories** | Upload → Supabase storage → URL publique | MP3, WAV, AIFF, FLAC | Supabase bucket `sounds` |
| **Sons UI** | Fichiers dans `public/sounds/` | MP3 | Repo Git |
| **Sons bibliothèque** | Indexés dans `sounds-index.json` | MP3 | Supabase ou local |
| **Preview audio (dev)** | Stream HTTP range requests via Express | WAV, MP3, AIFF, FLAC | Chemin absolu machine |
| **CDN** | Aucun — Vercel Edge Network pour le frontend statique | — | — |

---

## 5. Commandes Clés

```bash
# Développement (Vite + API Express locale)
npm run dev

# Build production
npm run build

# Preview du build local
npm run preview

# Linting
npm run lint

# Publication (commit + push → Vercel)
npm run publish

# Ajouter un son à la bibliothèque
npm run add-sound

# Checkpoint (restore + dev server)
npm run checkpoint
```

---

## 6. Variables d'Environnement

### Client (`.env` / `.env.local`)

| Variable | Usage |
|----------|-------|
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (vérification côté client) |
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase |

### Serveur (Vercel Environment Variables)

| Variable | Usage |
|----------|-------|
| `ADMIN_PASSWORD` | Validation serveur admin |
| `SUPABASE_URL` | URL Supabase |
| `SUPABASE_SERVICE_KEY` | Clé de service Supabase (upload) |
| `GITHUB_TOKEN` | Token API GitHub (lecture/écriture repo) |
| `GITHUB_OWNER` | Propriétaire du repo |
| `GITHUB_REPO` | Nom du repo |
| `GITHUB_BRANCH` | Branche cible (défaut `main`) |
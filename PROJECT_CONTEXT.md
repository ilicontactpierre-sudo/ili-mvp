# ILi MVP — Contexte Projet

Application web de création et lecture d'histoires interactives audio.

---

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | Vite 8.0 comme bundler/dev server |
| **Routing** | React Router | 7.15.0 | SPA avec routes `/`, `/lire/:storyId`, `/admin` |
| **Audio** | Howler.js | 2.2.4 | Gestion des sons, sprites, fade in/out |
| **Backend** | Node.js + Express | 5.2.1 | Server local dev (`scripts/dev-api-server.js`) |
| **Serverless** | Vercel Functions | — | API routes dans `api/` (déploiement prod) |
| **Base de données** | Supabase | 2.106.1 | Storage pour fichiers audio (`sounds` bucket) |
| **Hébergement** | Vercel | — | Déploiement auto depuis GitHub (branche main) |
| **CI/CD** | Git + Vercel | — | Push GitHub → déploiement auto Vercel |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                          # Vercel serverless functions (prod)
│   ├── delete.js                 # Supprime une histoire (GitHub API)
│   ├── preview-sound.js          # Stream audio local (dev only)
│   ├── publish.js                # Publie histoire sur GitHub
│   ├── toggle-visibility.js      # Rend histoire publique/privée
│   ├── upload-audio.js           # Upload audio vers Supabase
│   └── upload-sound.js           # Upload son bibliothèque
├── public/                       # Assets statiques (servis tel quel)
│   ├── sounds/                   # Fichiers audio locaux
│   │   ├── sounds-index.json     # Index bibliothèque sonore (métadonnées)
│   │   └── *.mp3                 # Sons (whoosh, clic, ambiances)
│   └── stories/                  # Histoires publiées (JSON)
│       ├── index.json            # Liste des histoires disponibles
│       └── *.json                # Fichiers d'histoires individuelles
├── scripts/
│   ├── dev-api-server.js         # Serveur Express local (port 3001)
│   ├── generateSoundsIndex.js    # Génère sounds-index.json
│   ├── index-boom-library.js     # Indexe bibliothèque BOOM externe
│   └── addSound.js               # CLI ajout son bibliothèque
├── src/
│   ├── components/
│   │   └── admin/                # Interface d'édition
│   │       ├── DraftManager.jsx       # Sauvegarde brouillons (localStorage)
│   │       ├── OrchestrationPanel.jsx # Orchestration audio avancée
│   │       ├── PublishPanel.jsx       # Publication
│   │       ├── SoundBlockPanel.jsx    # Édition blocs son
│   │       ├── SoundImporter.jsx      # Import sons externes
│   │       ├── SoundLibraryPicker.jsx # Sélecteur bibliothèque
│   │       ├── StoryLoader.jsx        # Charge histoires existantes
│   │       ├── StoryPreviewModal.jsx  # Aperçu avant publication
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline audio unifiée
│   │       └── WaveformTrimmer.jsx    # Édition trim audio
│   ├── engine/
│   │   ├── AudioEngine.js        # Moteur audio (play, fade, loop, trim)
│   │   └── HapticEngine.js       # Vibrations haptiques
│   ├── pages/
│   │   ├── AdminPage.jsx         # Page d'administration (auth par mot de passe)
│   │   ├── HomePage.jsx          # Liste des histoires
│   │   └── StoryPage.jsx         # Lecteur d'histoire
│   ├── utils/
│   │   ├── bionicReading.jsx     # Rendu bionic reading
│   │   ├── renderMarkdown.jsx    # Rendu markdown
│   │   └── segmentAlgorithm.js   # Découpage texte en segments
│   ├── App.jsx                   # Routes + sons UI globaux (clics)
│   ├── main.jsx                  # Point d'entrée
│   └── index.css                 # Styles globaux
├── vite.config.js                # Config Vite (proxy vers localhost:3001)
├── vercel.json                   # Rewrites SPA pour Vercel
├── package.json                  # Dépendances + scripts
├── publish.sh                    # Script de publication Git → Vercel
└── .gitignore                    # Exclut .env, node_modules, etc.
```

---

## 3. Flux de Données Principal

### Création d'une histoire (Admin)
```
AdminPage (auth password) 
  → Saisie texte + métadonnées 
  → segmentAlgorithm.js découpe en segments 
  → UnifiedSegmentsTimeline édite segments + audioEvents 
  → Brouillon sauvegardé dans localStorage (DraftManager) 
  → PublishPanel déclenche api/publish.js 
  → Écriture sur GitHub (story JSON + index.json) 
  → Vercel redéploie → histoire disponible sur HomePage
```

### Lecture d'une histoire
```
HomePage fetch /stories/index.json 
  → Utilisateur clique sur une histoire 
  → StoryPage fetch /stories/{slug}.json 
  → AudioEngine charge les Howl instances 
  → Lecture segment par segment avec audioEvents synchronisés
```

### Authentification
- **Admin** : Mot de passe côté client (`import.meta.env.VITE_ADMIN_PASSWORD`) + validation serveur (`process.env.ADMIN_PASSWORD`)
- **Session** : `sessionStorage` pour le mot de passe (réutilisé pour publication auto)
- Pas de système d'utilisateurs — une seule personne admin

---

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy `/api/preview-sound` → `localhost:3001` (dev uniquement) |
| `vercel.json` | Rewrite toutes les routes vers `index.html` (SPA) |
| `scripts/dev-api-server.js` | Serveur Express local pour streaming audio (port 3001) |
| `public/sounds/sounds-index.json` | Index de la bibliothèque sonore (ID, label, tags, categories, mood, intensity, filename, url, loop) |

### Différences Local vs Production

| Aspect | Local (dev) | Production (Vercel) |
|--------|-------------|---------------------|
| API | Express sur port 3001 (`dev-api-server.js`) | Vercel serverless functions (`api/*.js`) |
| Audio preview | Fichiers locaux streamés depuis machine dev | URLs Supabase ou `/sounds/` public |
| Stories | Fichiers JSON dans `public/stories/` | Commités sur GitHub via API |
| Upload audio | — | Supabase storage bucket `sounds` |

### Assets Statiques
- **`public/`** : Servi tel quel par Vite (dev) et Vercel (prod)
- **Sons** : `public/sounds/*.mp3` pour sons UI (clics, whoosh)
- **Histoires** : `public/stories/*.json` en local ; en prod, générés par `api/publish.js` via GitHub

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio stories** | Upload → Supabase storage → URL publique | MP3, WAV, AIFF, FLAC | Supabase bucket `sounds` |
| **Sons bibliothèque** | Indexés via `sounds-index.json` (généré par script) | MP3 principalement | Local (`public/sounds/`) ou BOOM library externe |
| **Audio preview (dev)** | Stream HTTP range requests via Express | WAV, MP3, AIFF, FLAC | Chemin absolu machine dev |
| **CDN** | Aucun — Vercel Edge Network pour le frontend | — | — |

---

## 5. Commandes Clés

```bash
# Développement (lance Vite + serveur API local)
npm run dev

# Build de production
npm run build

# Preview build local
npm run preview

# Linting
npm run lint

# Publication (commit + push → déclenche Vercel)
npm run publish
# ou directement :
./publish.sh "message de commit optionnel"

# Ajout d'un son à la bibliothèque
npm run add-sound

# Checkpoint (restore + lance dev server)
npm run checkpoint
```

---

## 6. Variables d'Environnement

### Côté Client (`.env` ou `.env.local`)
- `VITE_ADMIN_PASSWORD` — Mot de passe admin (client-side check)
- `VITE_SUPABASE_URL` — URL Supabase
- `VITE_SUPABASE_ANON_KEY` — Clé publique Supabase

### Côté Serveur (Vercel Environment Variables)
- `ADMIN_PASSWORD` — Validation serveur des requêtes admin
- `SUPABASE_URL` — URL Supabase
- `SUPABASE_SERVICE_KEY` — Clé de service Supabase (upload storage)
- `GITHUB_TOKEN` — Token GitHub API (publication histoires)
- `GITHUB_OWNER` — Propriétaire du repo GitHub
- `GITHUB_REPO` — Nom du repo GitHub
- `GITHUB_BRANCH` — Branche cible (défaut: `main`)
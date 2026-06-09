# PROJECT_CONTEXT — ILi MVP

## 1. Stack technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | avec React Router DOM 7.x |
| **Bundler** | Vite | 8.0.12 | @vitejs/plugin-react 6.x |
| **Backend (local)** | Node.js + Express | 5.2.1 | port 3001, dev uniquement |
| **Backend (prod)** | Vercel Serverless | — | fonctions dans `/api` |
| **Base de données** | Supabase | 2.x | PostgreSQL + Storage (bucket `sounds`) |
| **Audio** | Howler.js | 2.2.4 | + @ffmpeg/ffmpeg 0.12.x pour encodage |
| **Déploiement** | Vercel | — | CI/CD automatique via `git push` |

---

## 2. Structure des fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless Vercel (prod)
│   ├── get-upload-url.js       # URL signée Supabase Storage
│   ├── upload-audio.js         # Obsolète (redirige vers get-upload-url)
│   ├── upload-sound.js         # Métadonnées son → Supabase DB
│   ├── publish.js              # Publication story → GitHub
│   ├── preview-sound.js        # Streaming audio local (dev)
│   ├── delete-sound.js         # Suppression son
│   ├── toggle-visibility.js    # Visibilité story
│   ├── send-newsletter.js      # Envoi newsletter
│   └── subscribe.js            # Inscription newsletter
│
├── public/                     # Assets statiques (servis tels quels)
│   ├── sounds/                 # Sons UI + bibliothèque BOOM
│   │   ├── sounds-index.json   # Index métadonnées sons
│   │   └── *.mp3               # Fichiers audio
│   ├── stories/                # Histoires publiées
│   │   ├── index.json          # Liste des histoires
│   │   └── *.json              # Données stories (titre, segments, sons, VFX)
│   ├── textures/               # paper.png (effet visuel)
│   ├── fonts/                  # Polices custom
│   ├── favicon.svg
│   └── soundSearchWorker.js    # Web Worker recherche sons
│
├── scripts/                    # Scripts utilitaires
│   ├── dev-api-server.js       # Serveur Express local (port 3001)
│   ├── addSound.js             # CLI ajout son
│   ├── checkpoint.js           # Sauvegarde état
│   ├── generateSoundsIndex.js  # Génère sounds-index.json
│   └── migrate-sounds-to-supabase.js
│
├── src/
│   ├── main.jsx                # Point d'entrée
│   ├── App.jsx                 # Routes : /, /lire/:storyId, /admin
│   ├── components/
│   │   ├── StoryReader.jsx     # Lecteur principal (texte + audio + VFX)
│   │   ├── StoryMenu.jsx       # Menu sélection histoire
│   │   ├── StartScreen.jsx     # Écran démarrage
│   │   ├── EndScreen.jsx       # Écran fin
│   │   ├── GameOverlay.jsx     # Overlay mode jeu
│   │   ├── VfxOverlay.jsx      # Overlay effets visuels (fog, fire)
│   │   ├── ReaderSettings.jsx  # Réglages lecture
│   │   └── admin/              # Interface d'édition
│   │       ├── OrchestrationPanel.jsx  # Timeline sons + VFX
│   │       ├── SoundBlockPanel.jsx     # Édition bloc son
│   │       ├── VfxBlockPanel.jsx       # Édition effet visuel
│   │       ├── SoundLibraryPicker.jsx  # Sélecteur bibliothèque
│   │       ├── PublishPanel.jsx        # Publication
│   │       └── constants.js            # Config couleurs, VFX, game modes
│   │
│   ├── pages/
│   │   ├── HomePage.jsx        # Liste histoires
│   │   ├── StoryPage.jsx       # Page lecture
│   │   ├── AdminPage.jsx       # Interface admin complète
│   │   ├── NewsletterPage.jsx  # Page newsletter
│   │   └── AnalyticsDashboard.jsx
│   │
│   ├── engine/
│   │   ├── AudioEngine.js      # Moteur audio (Howler.js wrapper)
│   │   └── HapticEngine.js     # Vibrations (mobile)
│   │
│   ├── utils/
│   │   ├── segmentAlgorithm.js # Découpe automatique texte en segments
│   │   ├── soundSearch.js      # Recherche fuzzy (Fuse.js)
│   │   ├── bionicReading.jsx   # Mode lecture bionique
│   │   ├── renderMarkdown.jsx  # Rendu markdown
│   │   └── analytics.js        # Tracking
│   │
│   └── styles/
│       ├── global.css          # Styles de base
│       └── vfx.css             # Classes effets visuels (shake, glitch, etc.)
│
├── index.html                  # HTML d'entrée (SPA)
├── vite.config.js              # Config Vite + proxy API dev
├── vercel.json                 # Rewrites SPA pour React Router
├── package.json                # Dépendances + scripts
├── publish.sh                  # Script déploiement (git push → Vercel)
└── .env                        # Variables d'environnement (non commité)
```

---

## 3. Flux de données principal

### Navigation
```
Utilisateur → HomePage (/) → StoryPage (/lire/:storyId)
                         ↘ AdminPage (/admin)
```

### Lecture d'une histoire
1. `StoryPage` charge `public/stories/{storyId}.json`
2. `StoryReader` découpe le texte en segments (via `segmentAlgorithm.js`)
3. À chaque changement de segment, `AudioEngine.onSegmentChange()` active/désactive les sons configurés
4. Les VFX sont appliqués via classes CSS (`vfx.css`) + `VfxOverlay` (canvas)

### Publication (admin → prod)
1. Admin édite une story dans `OrchestrationPanel`
2. Bouton "Publier" → `POST /api/publish` avec `storyData`
3. **En local** : `dev-api-server.js` pousse le JSON sur GitHub (via API GitHub)
4. **En prod** : `api/publish.js` (Vercel) fait la même chose
5. Le fichier `public/stories/{slug}.json` est mis à jour sur GitHub → Vercel redéploie

### Upload audio
1. Admin upload un fichier audio → encodage MP3 via `@ffmpeg/ffmpeg` (côté client)
2. `POST /api/get-upload-url` → retourne URL signée Supabase
3. Upload direct du client vers Supabase Storage (bucket `sounds`)
4. `POST /api/upload-sound` → enregistre métadonnées dans table `sounds` Supabase

### Auth
- **Pas de système d'authentification utilisateur.**
- Protection admin par mot de passe unique (`ADMIN_PASSWORD`) envoyé dans le body des requêtes API.
- Stocké dans `.env` côté serveur, vérifié à chaque appel API sensible.

---

## 4. Points sensibles

### Fichiers de configuration critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API dev (`/api/*` → `localhost:3001`), headers COOP/COEP pour SharedArrayBuffer (FFmpeg) |
| `vercel.json` | Rewrite SPA : toutes les routes → `index.html` (React Router gère) |
| `.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` |

### Différences local vs production

| Aspect | Local | Production |
|--------|-------|------------|
| API | Express sur port 3001 (`scripts/dev-api-server.js`) | Vercel Serverless (`/api/*.js`) |
| Audio preview | Fichiers locaux streamés par Express | URL publiques Supabase Storage |
| Stories | Fichiers `public/stories/*.json` locaux | Pushés sur GitHub → déployés par Vercel |
| Upload | Direct vers Supabase (déjà en prod) | Identique |

### Assets statiques
- **Servis depuis `/public`** par Vite (dev) et Vercel (prod)
- **Sons UI** : `public/sounds/*.mp3` (clic, whoosh) — chargés en dur dans `App.jsx`
- **Stories** : `public/stories/*.json` — chargés dynamiquement par `StoryPage`
- **Pas de CDN** pour les assets statiques (sauf Google Fonts)

### Gestion des fichiers médias (audio)

| Étape | Détail |
|-------|--------|
| **Formats supportés** | MP3, WAV, AIFF, FLAC (lecture) ; MP3 (upload via FFmpeg) |
| **Encodage** | `@ffmpeg/ffmpeg` côté client → MP3 128kbps |
| **Stockage** | Supabase Storage (bucket `sounds`) |
| **Distribution** | URL publiques Supabase (pas de CDN dédié) |
| **Streaming** | Range requests supportés (lecture progressive) |
| **Métadonnées** | Table `sounds` Supabase : id, label, categories, tags, duration, etc. |

---

## 5. Commandes clés

```bash
# Développement (lance Vite + API locale)
npm run dev

# Build de production
npm run build

# Aperçu build local
npm run preview

# Lint
npm run lint

# Déploiement (commit + push → Vercel auto-deploy)
npm run publish
# ou : ./publish.sh "message de commit"
```

---

## 6. Variables d'environnement

```
SUPABASE_URL           # URL projet Supabase
SUPABASE_SERVICE_KEY   # Clé de service Supabase (admin)
SUPABASE_ANON_KEY      # Clé anon Supabase (si utilisée côté client)
ADMIN_PASSWORD         # Mot de passe protection endpoints admin
GITHUB_TOKEN           # Token GitHub API (publication stories)
GITHUB_OWNER           # Propriétaire du repo GitHub
GITHUB_REPO            # Nom du repo GitHub
GITHUB_BRANCH          # Branche cible (défaut : main)
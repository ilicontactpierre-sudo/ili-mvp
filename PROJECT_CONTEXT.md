# ILi — Lecture Immersive — Contexte Projet

_Dernière mise à jour : 15/10/2026, après le chantier « ILi sans bug avec un réseau faible » (chargement des sons par `SoundLoader`, cache audio, démarrage tardif des sons en retard) — voir sections 3.1, 4.4 et 7._

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI component-based |
| | React Router DOM | 7.15.0 | Navigation SPA (routes : `/`, `/lire/:storyId`, `/admin`, `/tutoriel`) |
| **Bundler** | Vite | 8.0.12 | Build + dev server avec HMR |
| **Backend dev** | Express | 5.2.1 | Serveur API local (port 3001) pour uploads et previews |
| **Backend prod** | Vercel Serverless Functions | — | API routes dans `/api/*.js` déployées sur Vercel |
| **Base de données** | Supabase | 2.106.1 | Storage (bucket `sounds`) + table `sounds` pour métadonnées audio |
| **Déploiement** | Vercel | — | SPA statique + serverless functions |
| **Audio** | Howler.js | 2.2.4 | Moteur audio (play, fade, loop, spatialisation stéréo). **Mode `html5` interdit** (le pan stéréo ne marche plus) ; les fichiers sont téléchargés par `SoundLoader`, pas par Howler |
| | @ffmpeg/ffmpeg | 0.12.15 | Compression audio côté client (upload) |
| **Recherche** | Fuse.js | 7.3.0 | Recherche floue dans la bibliothèque de sons |
| **UI** | CSS natif | — | Variables CSS, Flexbox/Grid, animations custom |
| **Tests** | Vitest | 5.0.0 | 163 tests (`npx vitest run`) : segmentAlgorithm, AudioEngine, chargement des sons |

---

## 2. Structure des Fichiers

```
/
├── package.json                    # Dépendances, scripts (dev, build, test, lint, publish)
├── vite.config.js                  # Config Vite : proxy API → localhost:3001, headers COOP/COEP
├── vercel.json                     # Rewrites SPA : toutes routes → index.html
├── index.html                      # Point d'entrée HTML (root div + scripts)
├── eslint.config.js                # Config ESLint (React hooks, refresh)
│
├── public/                         # Assets statiques servis tels quels
│   ├── stories/
│   │   ├── index.json              # Catalogue des histoires (id, title, author, mood, genre, hidden)
│   │   └── *.json                  # Fichiers stories individuels (segments, sounds, soundTracks, vfxTracks)
│   ├── sounds/
│   │   ├── sounds-index.json       # Index des sons (id, url, label, tags, categories)
│   │   ├── soundq-keywords.json    # Mapping mots-clés → IDs de sons
│   │   └── *.mp3                   # Fichiers audio (UI, tutoriel, whooshes)
│   ├── fonts/
│   │   ├── Benedict Regular.otf    # Police logo ILi
│   │   └── Oanteh.ttf              # Police secondaire
│   ├── textures/
│   │   └── paper.png               # Texture de fond
│   ├── icons.svg                   # Sprite SVG icônes UI
│   ├── manifest.json               # PWA manifest
│   ├── favicon.svg                 # Favicon
│   ├── tutoriel-icon.png           # Icône page tutoriel
│   └── soundSearchWorker.js        # Web Worker recherche de sons (Fuse.js)
│
├── src/
│   ├── main.jsx                    # Point d'entrée React (rendu dans #root)
│   ├── App.jsx                     # Routes + sons UI globaux (clic, settings)
│   ├── index.css                   # Styles de base + variables CSS
│   │
│   ├── pages/
│   │   ├── HomePage.jsx            # Accueil : logo animé, liste histoires, onboarding
│   │   ├── StoryPage.jsx           # Lecteur : chargement story, navigation segments, audio, game modes ; garde le SoundLoader (soundLoaderRef) et le libère à la sortie
│   │   ├── AdminPage.jsx           # Éditeur complet : segmentation, timeline audio, vfx, publication
│   │   ├── TutorialPage.jsx        # Page tutoriel interactive
│   │   ├── NewsletterPage.jsx      # Page inscription newsletter
│   │   └── AnalyticsDashboard.jsx  # Dashboard analytics (vues, progression, abandons)
│   │
│   ├── components/
│   │   ├── StoryReader.jsx         # Cœur lecteur : rendu segments, effets typographiques, transitions
│   │   ├── StoryReader.css         # Styles lecteur (animations, transitions, effets)
│   │   ├── StoryMenu.jsx           # Liste déroulante des histoires (accueil)
│   │   ├── ReaderSettings.jsx      # Paramètres lecture (taille police, interligne, thème, progression)
│   │   ├── StartScreen.jsx         # Écran démarrage (titre, chargement des sons du début via SoundLoader, écran « connexion lente » à 15 s)
│   │   ├── EndScreen.jsx           # Écran fin (liens livre/form, partie suivante)
│   │   ├── SeuilScreen.jsx         # Questions avant lecture (seuil)
│   │   ├── GameOverlay.jsx         # Overlay modes de jeu (sound_check, choix, journal)
│   │   ├── VfxOverlay.jsx          # Overlay effets visuels (particles, glitches, etc.)
│   │   └── admin/
│   │       ├── UnifiedSegmentsTimeline.jsx  # Timeline unifiée segments + sons + vfx
│   │       ├── OrchestrationPanel.jsx       # Panneau orchestration audio (soundTracks)
│   │       ├── SoundBlockPanel.jsx          # Édition bloc son (volume, fade, pan, trim)
│   │       ├── SoundBlock.jsx               # Représentation visuelle bloc son
│   │       ├── VfxBlock.jsx                 # Représentation visuelle bloc VFX
│   │       ├── VfxBlockPanel.jsx            # Édition bloc VFX
│   │       ├── FormattingPanel.jsx          # Formatage texte (gras, italic, couleur, police)
│   │       ├── FormatToolbar.jsx            # Toolbar formatage inline
│   │       ├── GameModePanel.jsx            # Configuration modes de jeu par segment
│   │       ├── AudioTimeline.jsx            # Timeline audio legacy (remplacée par UnifiedSegmentsTimeline)
│   │       ├── WaveformTrimmer.jsx          # Widget trim audio (début/fin)
│   │       ├── SoundLibraryPicker.jsx       # Sélecteur sons depuis bibliothèque
│   │       ├── SoundImporter.jsx            # Import sons locaux → Supabase
│   │       ├── TagsInput.jsx                # Input tags avec autocomplete
│   │       ├── DraftManager.jsx             # Gestion brouillons (sauvegarde locale)
│   │       ├── StoryLoader.jsx              # Chargement histoire existante
│   │       ├── StoryPreviewModal.jsx        # Modal aperçu avant publication
│   │       ├── PublishPanel.jsx             # Publication (slug, métadonnées)
│   │       ├── PublishAnimation.jsx         # Animation publication
│   │       ├── MenuManagerPage.jsx          # Gestion menu histoires (ordre, hidden)
│   │       ├── AnalyticsDashboard.jsx       # Stats lectures
│   │       ├── InlineFunctionMenu.jsx       # Menu contextuel fonctions inline
│   │       └── constants.js                 # Constantes UI admin
│   │
│   ├── engine/
│   │   ├── AudioEngine.js          # Moteur audio : play, fade, loop crossfade, pan, automation volume, démarrage tardif d'un son (onSoundReady)
│   │   ├── SoundLoader.js          # Chargeur de sons : téléchargement (délai d'inactivité, 3 essais), cache téléphone, Howl via blob: (stéréo garantie)
│   │   ├── audioCache.js           # Cache audio : version (AUDIO_CACHE_VERSION), nettoyage des anciennes versions, éviction si plein
│   │   ├── HapticEngine.js         # Moteur haptique (vibrations sur segments)
│   │   └── *.test.js               # Tests : AudioEngine (31), AudioEngine.lateJoin (13), lateSound.integration (8), SoundLoader (27), SoundLoader.cache (8), audioCache (18)
│   │
│   ├── utils/
│   │   ├── segmentAlgorithm.js     # Algo découpage narratif heuristique (8 phases)
│   │   ├── renderMarkdown.jsx      # Rendu Markdown enrichi (couleurs, polices, inline functions)
│   │   ├── inlineFunctions.jsx     # Fonctions inline (`</couleur:|/>`, `{{journal:}}`, etc.)
│   │   ├── bionicReading.jsx       # Mode lecture bionique (gras sur premières lettres)
│   │   ├── emojiDict.jsx           # Mapping émojis → unicode
│   │   ├── soundSearch.js          # Recherche sons (Fuse.js + Web Worker)
│   │   ├── soundOrder.js           # Ordre de téléchargement des sons (par besoin) + sons à attendre au départ
│   │   ├── soundsToPreload.js      # Sons utiles d'une histoire (exclut les blocs muets ou cassés)
│   │   ├── startGate.js            # Attente des sons du début + alerte « connexion lente » (15 s)
│   │   ├── startLateSound.js       # Colle chargeur → moteur (son arrivé en retard)
│   │   ├── analytics.js            # Tracking événements (start, progress, finish, abandon)
│   │   └── *.test.js               # Tests : segmentAlgorithm (30), soundOrder (9), soundsToPreload (6), startGate (13)
│   │
│   ├── assets/
│   │   ├── hero.png                # Image hero
│   │   ├── react.svg               # Logo React
│   │   └── vite.svg                # Logo Vite
│   │
│   └── styles/
│       ├── global.css              # Variables CSS (couleurs, polices, spacing) + reset
│       └── vfx.css                 # Styles effets visuels (particles, glitches, etc.)
│
├── api/                            # Serverless Functions Vercel (backend prod)
│   ├── upload-audio.js             # POST : compression + upload fichier audio → Supabase Storage
│   ├── upload-sound.js             # POST : upsert métadonnées son → table Supabase `sounds`
│   ├── get-upload-url.js           # POST : génération URL signée upload (Supabase)
│   ├── preview-sound.js            # GET : streaming fichier audio local (dev uniquement)
│   ├── publish.js                  # POST : publication histoire → commit GitHub (stories/*.json + index.json)
│   ├── delete-sound.js             # DELETE : suppression son (Storage + DB)
│   ├── delete.js                   # DELETE : suppression histoire (GitHub)
│   ├── toggle-visibility.js        # POST : bascule visibilité histoire (published/draft/hidden)
│   ├── manage-menu.js              # POST : réordonnancement menu histoires
│   └── send-newsletter.js          # POST : envoi newsletter (intégration externe)
│
├── scripts/                        # Scripts utilitaires (dev uniquement)
│   ├── dev-api-server.js           # Serveur Express local (port 3001) — routes API pour dev
│   ├── addSound.js                 # CLI : ajout son à la bibliothèque
│   ├── audio-dictionary.js         # Génération dictionnaire audio
│   ├── convert-stories.js          # Conversion format stories
│   ├── generateSoundsIndex.js      # Génération index sons (sounds-index.json)
│   ├── index-boom-library.js       # Indexation bibliothèque BOOM Library
│   ├── migrate-sounds-to-supabase.js  # Migration sons locaux → Supabase
│   ├── import-soundq-keywords.js   # Import mots-clés SoundQ
│   ├── import-soundq-keywords.cjs  # Version CommonJS
│   ├── check-soundq-coverage.cjs   # Vérification couverture SoundQ
│   ├── build-curated-vocabulary-draft.cjs  # Génération vocabulaire curaté
│   ├── stats-sounds.cjs            # Stats bibliothèque sons
│   ├── debug-key-mismatch.cjs      # Debug mismatch clés
│   ├── debug-soundq-row.cjs        # Debug ligne SoundQ
│   ├── checkpoint.js               # Snapshot projet
│   ├── update-story-urls.js        # Mise à jour URLs stories
│   ├── git-sync.sh                 # Sync Git multi-branches
│   ├── validate-story.mjs          # Validateur de schéma des stories JSON (--check-urls : vérifie aussi les URLs Supabase)
│   └── README.md                   # Documentation scripts
│
├── .gitignore                      # Fichiers ignorés (.env, node_modules, dist, etc.)
├── CLAUDE.md                       # Instructions de travail pour l'agent IA (commandes, structure, zones sensibles)
├── PROJECT_CONTEXT.md              # Ce fichier
├── PUBLISH_SETUP.md                # Guide configuration publication (Vercel + GitHub)
├── BUGFIX_ECRAN_NOIR.md            # Notes debug écran noir
├── CHECKPOINTS.md                  # Liste checkpoints projet
├── HOMEPAGE_IMPROVEMENTS.md        # Idées améliorations homepage
├── IMPLEMENTATION_SUMMARY.md       # Résumé implémentations
├── ORCHESTRATION_PROMPT.md         # Guide orchestration audio
├── PROMPT_Avant DÉCOUPAGE AUTO     # Prompt découpage auto
├── REFACTORING_SUMMARY.md          # Résumé refactorings
├── publish.sh                      # Script publication CLI
└── git-sync.sh                     # Script sync Git
```

---

## 3. Flux de Données Principal

### 3.1. Lecture d'une histoire

```
1. Homepage charge `/stories/index.json` → liste histoires
2. Utilisateur clique sur une histoire → navigation `/lire/:storyId`
3. StoryPage fetch `/stories/${storyId}.json` → données story complètes
4. StartScreen télécharge les sons du DÉBUT via SoundLoader (cache téléphone, nouvelles tentatives) ;
   après 15 s sans eux : écran « connexion lente » → AudioEngine créé avec `loader.howlMap`
   (uniquement des sons chargés) ; le reste des sons continue de se télécharger pendant la lecture
5. Lecture segment par segment :
   - StoryReader affiche le texte du segment courant
   - AudioEngine exécute les audioEvents du segment (play, fade, stop)
   - Un son qui arrive en retard est démarré par AudioEngine.onSoundReady (voir section 7)
   - Navigation : swipe/click gauche → précédent, droite → suivant
6. Fin de l'histoire → EndScreen (liens livre/form, partie suivante)
```

### 3.2. Upload d'un son (Admin)

```
1. Admin importe fichier audio local
2. FFmpeg compresse le fichier (côté client)
3. Envoi POST `/api/get-upload-url` → URL signée Supabase
4. Upload direct du fichier compressé → Supabase Storage (bucket `sounds`)
5. Envoi POST `/api/upload-sound` avec métadonnées → table `sounds` (upsert)
6. Mise à jour de la bibliothèque locale (soundLibrary state)
```

### 3.3. Publication d'une histoire

```
1. Admin clique "Publier" dans PublishPanel
2. Envoi POST `/api/publish` avec slug + storyData + password
3. Serverless Function :
   - Authentifie via ADMIN_PASSWORD
   - Lit le fichier existant sur GitHub (stories/${slug}.json)
   - Écrit le nouveau contenu (commit)
   - Met à jour public/stories/index.json (ajout ou update entrée)
4. L'histoire est immédiatement disponible sur le site
```

### 3.4. Gestion de l'authentification

| Contexte | Mécanisme | Stockage |
|----------|-----------|----------|
| **Admin** | Password simple envoyé dans le body des requêtes API | Variable d'environnement `ADMIN_PASSWORD` |
| **Lecteur** | Pas d'authentification | Progression stockée en `localStorage` (clé : `ili_progress_${storyId}`) |
| **Onboarding** | Flag `ili_onboarding_done` en `localStorage` | — |

---

## 4. Points Sensibles

### 4.1. Fichiers de Configuration Critiques

| Fichier | Rôle | Impact si mal configuré |
|---------|------|------------------------|
| `vite.config.js` | Proxy API vers localhost:3001, headers COOP/COEP (requis pour SharedArrayBuffer/FFmpeg) | Audio/FFmpeg cassé en dev |
| `vercel.json` | Rewrites SPA (toutes routes → index.html) | Routes React 404 en prod |
| `package.json` | Scripts, dépendances, type: module | Build échoue, imports cassés |
| `.env` (non commité) | Variables serveur (Supabase, GitHub, admin) | API non fonctionnelles |

### 4.2. Différences Local vs Production

| Aspect | Développement | Production |
|--------|---------------|------------|
| **Serveur API** | Express local (port 3001) via `scripts/dev-api-server.js` | Vercel Serverless Functions (`/api/*.js`) |
| **Preview audio** | Fichiers locaux streamés via `/api/preview-sound` | URLs Supabase directes |
| **Upload audio** | Compression FFmpeg → upload Supabase via serveur local | Même flux, via serverless |
| **Publication** | Commit GitHub via API (même mécanisme) | Identique |
| **Stories** | Fichiers JSON dans `public/stories/` (servis statiquement) | Même structure, fichiers sur Vercel CDN |
| **CORS** | Headers COOP/COEP dans vite.config.js | `vercel.json` ne définit aucun en-tête (seulement des rewrites SPA) |

### 4.3. Assets Statiques

| Type | Chemin | Servis depuis |
|------|--------|---------------|
| Stories (JSON) | `/stories/*.json` | `public/stories/` → CDN Vercel |
| Sons UI | `/sounds/*.mp3` | `public/sounds/` → CDN Vercel |
| Index sons | `/sounds/sounds-index.json` | `public/sounds/` → CDN Vercel |
| Fonts | `/fonts/*.otf`, `/fonts/*.ttf` | `public/fonts/` → CDN Vercel |
| Textures | `/textures/*.png` | `public/textures/` → CDN Vercel |
| Icônes | `/icons.svg` | `public/icons.svg` → CDN Vercel |

### 4.4. Gestion des Fichiers Médias

#### Audio
- **Formats supportés** : MP3 (principal), WAV, FLAC, AIFF (pour preview dev)
- **Pipeline upload** :
  1. Sélection fichier local
  2. Compression FFmpeg (côté client, via `@ffmpeg/ffmpeg`)
  3. Upload vers Supabase Storage (bucket `sounds`)
  4. Métadonnées enregistrées dans table `sounds` (id, url, label, tags, categories, duration, etc.)
- **Stockage** : Supabase Storage (bucket public `sounds`)
- **CDN** : URLs Supabase directes (ex: `https://xxx.supabase.co/storage/v1/object/public/sounds/filename.mp3`)
- **Métadonnées** : Table Supabase `sounds` avec champs : id, filename, label, url, local_path, description, tags, categories, boom_category, boom_subcategory, cat_id, library, mood, loop, duration, intensity, tempo, search_string
- **Lecture (côté lecteur)** : les MP3 sont téléchargés par `SoundLoader` (`fetch`), gardés sur le téléphone dans la Cache API (cache `ili-audio-v1`), puis donnés à Howler sous forme d'URL `blob:` (`html5:false` : stéréo et pan garantis). Détails : section 7.
- **Remplacer un fichier audio** : `api/get-upload-url.js` supprime l'ancien fichier puis recrée le nouveau **à la même adresse publique** ; un téléphone qui a gardé l'ancien l'entendrait encore. Il faut alors augmenter `AUDIO_CACHE_VERSION` dans `src/engine/audioCache.js` et publier. Changer le volume, le pan, les fades, le trim ou la boucle d'un bloc n'a **pas** besoin de cela (réglages dans le JSON de l'histoire).

#### Images / Vidéos
- **Non utilisés** dans le lecteur (texte uniquement)
- **Assets UI** : PNG, SVG, OTF, TTF dans `public/`

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────────────────────
npm run dev              # Lance Vite + Express API server (concurrently)
npm run dev:clean        # Tue les process existants + redémarre proprement

# ── Build ──────────────────────────────────────────────────────────────────────
npm run build            # Build Vite → dossier dist/
npm run preview          # Preview build local

# ── Lint ───────────────────────────────────────────────────────────────────────
npm run lint             # ESLint (345 problèmes préexistants connus ; à lancer AVANT build : dist/ fausse le compte)

# ── Tests ──────────────────────────────────────────────────────────────────────
npx vitest run           # Tests (163), exécution unique — PAS `npm test` (mode surveillance qui reste ouvert)
node scripts/validate-story.mjs public/stories/   # Valide le schéma des stories (--check-urls : vérifie aussi les URLs)

# ── Utilitaires ────────────────────────────────────────────────────────────────
npm run add-sound        # CLI : ajout son à la bibliothèque (scripts/addSound.js)
npm run checkpoint       # Snapshot projet + redémarre Vite
npm run publish          # Publication via publish.sh (build + deploy Vercel)
npm run sync             # Sync Git multi-branches (git-sync.sh)
```

---

## 6. Variables d'Environnement

| Variable | Usage | Requis pour |
|----------|-------|-------------|
| `SUPABASE_URL` | URL du projet Supabase (ex: `https://xxx.supabase.co`) | Uploads audio, stockage sons |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (admin, pour uploads) | Uploads audio (côté serveur) |
| `ADMIN_PASSWORD` | Mot de passe pour routes API admin (`/api/upload-*`, `/api/publish`, `/api/delete*`) | Authentification admin |
| `GITHUB_TOKEN` | Token GitHub (scope: `repo` pour write content) | Publication histoires via API GitHub |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Publication histoires |
| `GITHUB_REPO` | Nom du repo GitHub | Publication histoires |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Publication histoires |
| ~~`VITE_ADMIN_PASSWORD`~~ | Supprimée (faille de sécurité corrigée le 26/08/2026) — l'auth admin passe désormais uniquement par `/api/login`, qui vérifie `ADMIN_PASSWORD` côté serveur | Interface admin |

---

## 7. Architecture Audio (AudioEngine)

L'`AudioEngine` (`src/engine/AudioEngine.js`) est le cœur du système audio :

- **HowlMap** : Map<soundId, Howl instance> — uniquement les sons **déjà chargés** (fournie par `SoundLoader.howlMap`, remplie au fil des téléchargements) ; un son absent est simplement ignoré
- **Actions** : `play`, `stop`, `fadeIn`, `fadeOut`, `volume`
- **Fonctionnalités avancées** :
  - **Loop crossfade** : transition fluide entre instances pour éviter les clicks
  - **Automation volume** : points d'automation par segment (`automationPoints`)
  - **Spatialisation pan** : modes `static`, `sweep-lr`, `sweep-rl`, `oscillate-slow`, `oscillate-fast`, `converge`, `diverge`
  - **Trim** : découpage début/fin de son (`trimStart`, `trimEnd` en ms)
  - **Courbes de fade** : `natural` (linéaire en dB), `equal-power` (crossfade loop), `ease-out`, `sigmoid`, `cubic`, `log`
  - **Master volume** : contrôle global avec courbe perceptuelle quadratique
  - **Démarrage tardif** (`onSoundReady`) : démarre un son arrivé en retard, avec son fadeIn d'origine, au volume voulu au segment courant. Règle : bloc de plusieurs segments (boucle ou non) → démarre tant que le lecteur est dans le bloc ; un seul segment sans boucle → annulé ; bloc déjà dépassé → pas joué

### SoundTracks vs AudioEvents

Deux modèles coexistent :

1. **AudioEvents** (legacy) : liste d'événements par segment (`segment.audioEvents[]`)
   - Actions : play, stop, fadeIn, fadeOut, volume
   - Exécutés au changement de segment

2. **SoundTracks** (nouveau) : tracks continus sur plusieurs segments
   - Chaque track a : `id`, `soundId`, `startSegmentId`, `endSegmentId`, `volume`, `fadeIn`, `fadeOut`, `delay`, `loop`, `loopCrossfade`, `trimStart`, `trimEnd`, `pan`, `panMode`, `panSpeedMs`, `automationPoints[]`
   - Géré par `AudioEngine.onSegmentChange()` qui calcule l'état actif à chaque segment

### Chargement des sons et réseau faible (depuis le 15/10/2026)

- **Flux** : `StartScreen` (reçoit la prop `story`) → `SoundLoader` → `loader.howlMap` → `AudioEngine`. La page garde le chargeur (`soundLoaderRef`) et le libère par `dispose()` à la sortie de l'histoire et au changement de partie.
- **Stéréo garantie** : Howler ne télécharge plus rien lui-même (sur une coupure réseau, il basculait en silence en mode HTML5, où le pan stéréo ne marche plus). `html5:false` est écrit en dur dans `SoundLoader`, avec un garde-fou qui refuse un Howl en HTML5. **Ne jamais passer en mono ni en mode `html5`.**
- **Démarrage** : on n'attend que les sons du début (actifs à la position de départ ou de reprise + les 3 segments suivants). Après 15 s sans eux : écran « connexion lente » (« Commencer maintenant » / « Attendre encore »). Les autres sons se téléchargent pendant la lecture, dans l'ordre du besoin (`soundOrder.js`).
- **Réseau** : délai d'inactivité de 30 s, 3 essais (pauses 1 s puis 3 s), 3 téléchargements en parallèle, pas de réessai sur un 404 ; les sons en échec sont relancés quand le réseau revient (événement `online`).
- **Cache** : Cache API `ili-audio-v1` (version dans `audioCache.js`) ; anciennes versions supprimées ; si le téléphone est plein, les plus anciens fichiers sont supprimés, jamais ceux de l'histoire en cours.
- **Déblocage audio mobile** : un Howl factice est créé pendant le tap de démarrage (Howler enregistre le déblocage à la création du premier Howl, alors que le chargeur crée les siens plus tard).
- **Mémoire** : tous les sons restent décodés en mémoire (la « fenêtre glissante » a été mise de côté ; mesures dans le fichier maître du projet, Annexe A).
- **Paramètres** : `DEFAULT_OPTIONS` dans `SoundLoader.js` ; seuils d'alerte `SLOW_MS` / `SLOW_AGAIN_MS` dans `startGate.js` ; version du cache `AUDIO_CACHE_VERSION` dans `audioCache.js`.

---

## 8. Algorithme de Segmentation

`src/utils/segmentAlgorithm.js` — découpage narratif heuristique en 8 phases :

1. **normalizeText** : normalisation unicode (`...`→`…`, espaces, etc.)
2. **splitIntoSentences** : découpe phrases atomiques
3. **parseIntoUnits** : unités typées (dialogue, narration, chapitre, etc.)
4. **mergeFragments** : fusion des fragments non conclusifs
5. **scoreUnits** : scores narratifs (isolation, tension, continuité)
6. **detectBeats** : détection beats (révélation, punchline, respiration, accélération)
7. **composeSegments** : assemblage déterministe basé sur scores et beats
8. **serializeSegments** : conversion en segments enrichis

**Paramètres ajustables** (dans `CONFIG`) :
- `COMMA_CUT_BASE_PROB` : probabilité coupe sur virgule (défaut: 0.30)
- `SEMICOLON_CUT_PROB` : probabilité coupe sur point-virgule (défaut: 0.32)
- `COLON_CUT_PROB` : probabilité coupe sur deux-points (défaut: 0.42)
- `MAX_CHARS` : limite absolue par segment (254)
- `granularity` : 1-10, contrôle la finesse du découpage

---

## 9. Modes de Jeu (Game Modes)

Les segments peuvent avoir un `gameMode` qui bloque la navigation jusqu'à résolution :

| Type | Description | Exemple |
|------|-------------|---------|
| `sound_check` | Vérification volume écouteurs | "Un instant. Ajuste le volume de tes écouteurs." |
| `choice` | Choix multiple avec branches | Choix de direction narrative |
| `journal` | Saisie texte libre | "Écris ce que tu ressens" |
| `threshold` | Questions avant lecture (seuil) | Questions sur les intentions du lecteur |

---

## 10. Fonctions Inline (Rendu Texte Enrichi)

Le moteur de rendu (`src/utils/renderMarkdown.jsx` + `src/utils/inlineFunctions.jsx`) supporte :

| Syntaxe | Effet |
|---------|-------|
| `</couleur:#fff0c7|texte/>` | Texte coloré |
| `</police:Arial|texte/>` | Police custom |
| `{{journal:cle}}` | Insertion valeur journal (réponse utilisateur) |
| `</lire:cle|défaut/>` | Insertion réponse seuil (avec fallback) |
| `</gras:texte/>` | Texte en gras |
| `</italic:texte/>` | Texte en italique |
| `</chiffres_up:start;end/>` | Animation chiffres qui montent |
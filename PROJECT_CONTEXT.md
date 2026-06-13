# ILi MVP — Contexte du Projet

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI component-based avec hooks |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA (/lire/:storyId, /admin) |
| **Bundler** | Vite | 8.0.12 | Build ultra-rapide avec HMR |
| **Backend dev** | Express | 5.2.1 | Serveur API local (port 3001) pour upload/prévisualisation |
| **Backend prod** | Vercel Serverless | — | Fonctions serverless dans `/api/*.js` |
| **Base de données** | Supabase | 2.106.1 | PostgreSQL + Storage (sons, analytics, subscribers) |
| **Audio** | Howler.js | 2.2.4 | Moteur audio avec support sprites/instances multiples |
| **Audio avancé** | @ffmpeg/ffmpeg | 0.12.15 | Compression audio côté client (upload) |
| **Déploiement** | Vercel | — | Hosting statique + serverless functions |
| **Contrôle version** | GitHub | — | Repo: `ilicontactpierre-sudo/ili-mvp` |

### Librairies métier clés

| Librairie | Usage |
|-----------|-------|
| `lamejs` | Encodage MP3 côté client |
| `fuse.js` | Recherche floue dans la bibliothèque sonore |
| `@supabase/supabase-js` | Client Supabase (frontend + backend) |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Fonctions serverless Vercel (backend prod)
│   ├── delete-sound.js         # Supprime un son (Storage + DB Supabase)
│   ├── delete.js               # Supprime une histoire (GitHub API)
│   ├── get-upload-url.js       # Génère URL signée upload Supabase
│   ├── preview-sound.js        # Streaming audio fichiers locaux (dev)
│   ├── publish.js              # Publie histoire sur GitHub
│   ├── send-newsletter.js      # Envoie newsletter via Resend API
│   ├── subscribe.js            # Ajout subscriber newsletter Supabase
│   ├── toggle-visibility.js    # Change visibilité partie (GitHub API)
│   ├── upload-audio.js         # Upload fichier audio vers Supabase Storage
│   └── upload-sound.js         # Upsert métadonnées son dans Supabase DB
│
├── public/                     # Assets statiques servis par Vercel/Vite
│   ├── favicon.svg             # Favicon du site
│   ├── icons.svg               # Sprite SVG pour icônes UI
│   ├── manifest.json           # PWA manifest
│   ├── soundSearchWorker.js    # Web Worker pour recherche sons (fuse.js)
│   ├── fonts/                  # Polices custom (NamoraDayana, Oanteh)
│   ├── sounds/                 # Sons UI + bibliothèque locale
│   │   ├── sounds-index.json   # Index métadonnées bibliothèque sonore
│   │   └── *.mp3               # Fichiers audio (clics, whoosh, etc.)
│   ├── stories/                # Histoires publiées (JSON)
│   │   ├── index.json          # Liste des histoires disponibles
│   │   └── *.json              # Contenu des histoires (segments, sons, vfx)
│   └── textures/               # Textures pour effets visuels
│       └── paper.png           # Texture papier pour overlay
│
├── scripts/                    # Scripts utilitaires (dev/migration)
│   ├── addSound.js             # CLI: ajoute un son à la bibliothèque
│   ├── audio-dictionary.js     # Dictionnaire audio (mapping sons)
│   ├── checkpoint.js           # Script de checkpoint/snapshot
│   ├── convert-stories.js      # Conversion format histoires
│   ├── dev-api-server.js       # Serveur Express dev (port 3001)
│   ├── generateSoundsIndex.js  # Génère sounds-index.json depuis dossier
│   ├── index-boom-library.js   # Indexe BOOM Library dans Supabase
│   ├── migrate-sounds-to-supabase.js  # Migration sons locaux → Supabase
│   ├── stats-sounds.cjs        # Stats bibliothèque sonore
│   └── update-story-urls.js    # Met à jour URLs dans histoires
│
├── src/
│   ├── App.jsx                 # Routes principales + sons globaux (clics)
│   ├── main.jsx                # Point d'entrée React + CSS global
│   ├── index.css               # Styles de base (variables CSS)
│   │
│   ├── components/             # Composants UI réutilisables
│   │   ├── EndScreen.jsx       # Écran de fin d'histoire (liens, partie suivante)
│   │   ├── GameOverlay.jsx     # Overlay pour modes de jeu (choice, quiz...)
│   │   ├── ReaderSettings.jsx  # Settings lecteur (sauvegarde progression)
│   │   ├── StartScreen.jsx     # Écran de démarrage (titre, préchargement)
│   │   ├── StoryMenu.jsx       # Menu de sélection d'histoires
│   │   ├── StoryReader.jsx     # Composant principal de lecture (segments)
│   │   ├── StoryReader.css     # Styles spécifiques StoryReader
│   │   ├── VfxOverlay.jsx      # Overlay effets visuels (particules, etc.)
│   │   │
│   │   └── admin/              # Composants interface d'administration
│   │       ├── AnalyticsDashboard.jsx  # Dashboard analytics (lecture)
│   │       ├── AudioTimeline.jsx       # Timeline audio (ancien modèle)
│   │       ├── constants.js            # Constantes admin (couleurs, etc.)
│   │       ├── DraftManager.jsx        # Gestion brouillons (localStorage)
│   │       ├── FormatToolbar.jsx       # Toolbar formatage texte
│   │       ├── GameModePanel.jsx       # Éditeur modes de jeu
│   │       ├── InlineFunctionMenu.jsx  # Menu fonctions inline (VFX, audio)
│   │       ├── OrchestrationPanel.jsx  # Orchestration audio avancée
│   │       ├── PublishPanel.jsx        # Interface de publication
│   │       ├── PublishAnimation.jsx    # Animation publication
│   │       ├── SoundBlock.jsx          # Bloc son dans timeline
│   │       ├── SoundBlockPanel.jsx     # Éditeur propriétés bloc son
│   │       ├── SoundImporter.jsx       # Import sons depuis bibliothèque
│   │       ├── SoundLibraryPicker.jsx  # Sélecteur bibliothèque sonore
│   │       ├── StoryLoader.jsx         # Chargeur d'histoires existantes
│   │       ├── StoryPreviewModal.jsx   # Modal aperçu histoire
│   │       ├── UnifiedSegmentsTimeline.jsx  # Timeline unifiée segments+sons
│   │       ├── VfxBlock.jsx            # Bloc effets visuels
│   │       ├── VfxBlockPanel.jsx       # Éditeur propriétés VFX
│   │       └── WaveformTrimmer.jsx     # Éditeur waveform (trim audio)
│   │
│   ├── engine/                 # Moteurs métier
│   │   ├── AudioEngine.js      # Moteur audio (play, fade, loop, pan)
│   │   └── HapticEngine.js     # Moteur haptique (vibrations mobile)
│   │
│   ├── pages/                  # Pages principales (routes)
│   │   ├── AdminPage.jsx       # Interface admin (création/édition)
│   │   ├── AnalyticsDashboard.jsx  # Page analytics (stats lecture)
│   │   ├── HomePage.jsx        # Page d'accueil (liste histoires)
│   │   ├── NewsletterPage.jsx  # Page newsletter (abonnement)
│   │   └── StoryPage.jsx       # Page de lecture d'histoire
│   │
│   ├── styles/                 # Styles globaux
│   │   ├── global.css          # CSS global (variables, resets)
│   │   └── vfx.css             # Styles effets visuels
│   │
│   └── utils/                  # Utilitaires
│       ├── analytics.js        # Tracking événements lecture (Supabase)
│       ├── bionicReading.jsx   # Algorithme lecture bionique
│       ├── emojiDict.jsx       # Dictionnaire emoji → texte
│       ├── inlineFunctions.jsx # Fonctions inline (VFX, audio events)
│       ├── renderMarkdown.jsx  # Rendu markdown avec support inline
│       ├── segmentAlgorithm.js # Algo découpage texte en segments
│       └── soundSearch.js      # Recherche sons (fuse.js + worker)
│
├── .gitignore                  # Fichiers ignorés (node_modules, .env, etc.)
├── eslint.config.js            # Configuration ESLint
├── index.html                  # HTML d'entrée (Vite)
├── package.json                # Dépendances + scripts npm
├── package-lock.json           # Lock file npm
├── publish.sh                  # Script de déploiement Vercel
├── vercel.json                 # Config Vercel (rewrites SPA)
└── vite.config.js              # Config Vite (proxy API, headers COOP/COEP)
```

---

## 3. Flux de Données Principaux

### 3.1 Lecture d'une histoire

```
1. Utilisateur clique sur une histoire dans HomePage
   → Navigation vers /lire/:storyId

2. StoryPage charge le JSON: GET /stories/{storyId}.json
   → Fichier statique depuis public/stories/

3. StoryReader affiche les segments un par un
   → Navigation: flèches, swipe, ou clic gauche/droite

4. À chaque changement de segment:
   → AudioEngine exécute les audioEvents du segment
   → VfxOverlay applique les effets visuels

5. Progression sauvegardée dans localStorage
   → Reprise possible à la sortie

6. Analytics envoyés à Supabase (reading_events table)
   → start, progress, finish, abandon
```

### 3.2 Upload d'un son (admin)

```
1. Admin sélectionne un son depuis SoundLibraryPicker
   → Son prévisualisé via /api/preview-sound (dev) ou URL Supabase (prod)

2. Admin ajoute le son à un segment
   → Création d'un audioEvent dans le segment

3. À la publication:
   → POST /api/publish envoie l'histoire complète sur GitHub
   → Le JSON est commité sur la branche main
```

### 3.3 Publication d'une histoire

```
1. Admin remplit les métadonnées + segments dans AdminPage
2. Clique sur "Publier" → mot de passe requis (VITE_ADMIN_PASSWORD)
3. PublishPanel envoie POST /api/publish avec:
   - slug de l'histoire
   - storyData complète (JSON)
4. La fonction serverless:
   - Lit le fichier existant sur GitHub (pour avoir le sha)
   - Écrit le nouveau JSON sur public/stories/{slug}.json
   - Met à jour public/stories/index.json
5. Vercel redéploie automatiquement → l'histoire est disponible
```

### 3.4 Gestion de l'authentification

| Contexte | Mécanisme | Stockage |
|----------|-----------|----------|
| **Admin (frontend)** | Mot de passe saisi → comparaison avec `VITE_ADMIN_PASSWORD` | `sessionStorage.ili_admin_password` |
| **API (dev)** | Vérification `ADMIN_PASSWORD` dans `.env` | Variable d'environnement |
| **API (prod)** | Vérification `ADMIN_PASSWORD` dans Vercel env vars | Vercel Environment Variables |

---

## 4. Points Sensibles

### 4.1 Fichiers de configuration critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev, headers COOP/COEP (requis pour FFmpeg) | Casserait le dev server ou FFmpeg |
| `vercel.json` | Rewrites SPA (toutes routes → index.html) | Casserait le routing React en prod |
| `package.json` | Scripts, dépendances, version Node | Casserait build/dev si incohérent |
| `scripts/dev-api-server.js` | Backend dev (upload, preview, publish local) | Casserait les uploads en dev |

### 4.2 Différences local vs production

| Aspect | Développement | Production |
|--------|---------------|------------|
| **Serveur API** | Express local (port 3001) | Vercel Serverless Functions |
| **Stories** | Fichiers JSON dans `public/stories/` | Commités sur GitHub, servis par Vercel |
| **Sons** | Fichiers locaux + Supabase Storage | Supabase Storage uniquement |
| **Upload audio** | Via `dev-api-server.js` → Supabase | Via `/api/upload-audio` serverless → Supabase |
| **Publish** | Commit local + push GitHub | Commit direct sur GitHub via API |
| **Env vars** | `.env` local | Vercel Environment Variables |

### 4.3 Assets statiques

| Type | Chemin | Comment servis |
|------|--------|----------------|
| **HTML/CSS/JS** | `dist/` (après build) | Vercel CDN |
| **Fonts** | `public/fonts/` | Vite dev server / Vercel CDN |
| **Sons UI** | `public/sounds/*.mp3` | Vite dev server / Vercel CDN |
| **Stories** | `public/stories/*.json` | Vite dev server / Vercel CDN |
| **Textures** | `public/textures/` | Vite dev server / Vercel CDN |
| **Icons** | `public/icons.svg` | Inline dans HTML ou fetch |

### 4.4 Gestion des fichiers médias

#### Audio

| Aspect | Détails |
|--------|---------|
| **Formats supportés** | MP3, WAV, AIFF, FLAC (lecture); MP3 (upload via lamejs) |
| **Stockage dev** | Fichiers locaux (`public/sounds/`) + chemin absolu via `vite.config.js` |
| **Stockage prod** | Supabase Storage bucket `sounds` (public) |
| **Métadonnées** | Table Supabase `sounds` (id, label, url, tags, categories, duration, etc.) |
| **Bibliothèque** | `public/sounds/sounds-index.json` (local) fusionné avec données Supabase |
| **Recherche** | Web Worker (`soundSearchWorker.js`) avec fuse.js pour recherche floue |
| **Compression** | @ffmpeg/ffmpeg côté client avant upload (optionnel) |
| **CDN** | Supabase CDN pour les fichiers Storage |

#### Images / Textures

| Aspect | Détails |
|--------|---------|
| **Textures VFX** | `public/textures/paper.png` pour effets de superposition |
| **Favicon/Icons** | `public/favicon.svg`, `public/icons.svg` (sprite) |
| **Assets React** | `src/assets/` (hero.png, vite.svg) — inclus dans le bundle |

### 4.5 Pipeline audio complet

```
1. Import son dans AdminPage
   → SoundLibraryPicker affiche bibliothèque (local JSON + Supabase)
   → Prévisualisation via /api/preview-sound (dev) ou URL Supabase (prod)

2. Ajout à un segment
   → Création audioEvent { soundId, action, volume, delay, ... }

3. Upload fichier audio (si nouveau son)
   → Option A: Upload direct via /api/upload-audio (base64 → Supabase)
   → Option B: Upload signé via /api/get-upload-url (multipart → Supabase)

4. Enregistrement métadonnées
   → POST /api/upload-sound upsert dans table Supabase `sounds`

5. Publication histoire
   → POST /api/publish commit JSON sur GitHub
   → Le JSON contient les soundId + audioEvents (pas les fichiers)

6. Lecture
   → AudioEngine récupère URL depuis howlMap (préchargé au démarrage)
   → Howler.js gère la lecture avec sprites, instances, fades
```

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────
npm run dev           # Lance Vite + serveur API local (concurrently)
npm run dev:clean     # Tue les process existants puis lance dev

# ── Build ──────────────────────────────────────────────────────
npm run build         # Build de production (Vite)
npm run preview       # Prévisualise le build en local

# ── Linting ────────────────────────────────────────────────────
npm run lint          # ESLint avec règles React

# ── Utilitaires ────────────────────────────────────────────────
npm run add-sound     # CLI: ajoute un son à la bibliothèque
npm run checkpoint    # Crée un checkpoint + lance le dev server
npm run publish       # Dé dé dé déploye sur Vercel (publish.sh)
```

---

## 6. Variables d'Environnement

### Frontend (préfixe `VITE_` — exposées au navigateur)

| Variable | Usage | Requis |
|----------|-------|--------|
| `VITE_SUPABASE_URL` | URL du projet Supabase | Oui (lecture seule) |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase | Oui (lecture seule) |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (frontend) | Oui (édition) |

### Backend (non-exposées — serveur uniquement)

| Variable | Usage | Requis |
|----------|-------|--------|
| `ADMIN_PASSWORD` | Mot de passe admin (API protégées) | Oui |
| `SUPABASE_URL` | URL Supabase (backend) | Oui |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (écritures admin) | Oui |
| `GITHUB_TOKEN` | Token GitHub pour commits | Oui (publication) |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | Oui (publication) |
| `GITHUB_REPO` | Nom du repo GitHub | Oui (publication) |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Non |
| `RESEND_API_KEY` | Clé API Resend (newsletter) | Optionnel |

---

## 7. Architecture Résumé

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────────┐                   ┌───────────────────┐
│   LECTEUR (SPA)   │                   │   ADMIN (SPA)     │
│   /lire/:storyId  │                   │   /admin          │
│                   │                   │                   │
│ • StoryPage       │                   │ • AdminPage       │
│ • StoryReader     │                   │ • Timeline        │
│ • AudioEngine     │                   │ • SoundLibrary    │
│ • VfxOverlay      │                   │ • PublishPanel    │
└─────────┬─────────┘                   └─────────┬─────────┘
          │                                       │
          │  GET /stories/*.json                  │  POST /api/*
          │  GET /sounds/*                        │  (auth: ADMIN_PASSWORD)
          ▼                                       ▼
┌───────────────────────────────────────────────────────────────┐
│                    VERCEL (Production)                         │
│                                                               │
│  • Hosting statique: dist/, public/                           │
│  • Serverless Functions: api/*.js                             │
│  • Environment Variables: Vercel Dashboard                     │
└─────────┬───────────────────────────────────────┬─────────────┘
          │                                       │
          ▼                                       ▼
┌─────────────────────┐                 ┌─────────────────────┐
│     SUPABASE        │                 │      GITHUB         │
│                     │                 │                     │
│ • PostgreSQL        │                 │ • Stories JSON      │
│   - sounds          │                 │ • sounds-index.json │
│   - subscribers     │                 │                     │
│   - reading_events  │                 │ • Deployment hook   │
│ • Storage: sounds/  │                 │   → Vercel rebuild  │
└─────────────────────┘                 └─────────────────────┘
```

---

*Document généré le 13/06/2026 — À maintenir à jour lors des changements d'architecture.*
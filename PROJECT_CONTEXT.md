# ILi MVP — Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version | Rôle / Détails |
|--------|-------------|---------|----------------|
| **Frontend** | React | 19.2.6 | UI component-based avec hooks |
| **Routing** | React Router DOM | 7.15.0 | Navigation SPA (/lire/:storyId, /admin) |
| **Bundler** | Vite | 8.0.12 | Build rapide, HMR, proxy API en dev |
| **Backend dev** | Express | 5.2.1 | Serveur API local (localhost:3001) |
| **Backend prod** | Vercel Serverless | — | Fonctions serverless (/api/*) |
| **Base de données** | Supabase | 2.106.1 | Storage (sons) + PostgreSQL (métadonnées) |
| **Audio** | Howler.js | 2.2.4 | Moteur audio (lecture, fade, loop, pan) |
| **Audio encoding** | lamejs | 1.2.1 | Encodage MP3 côté client |
| **Video/Audio processing** | FFmpeg.wasm | 0.12.15 | Traitement média dans le navigateur |
| **Recherche** | Fuse.js | 7.3.0 | Recherche fuzzy dans la bibliothèque sonore |
| **Déploiement** | Vercel | — | Hosting + serverless functions |

---

## 2. Structure des Fichiers

```
/
├── package.json                    # Config projet, scripts, dépendances
├── vite.config.js                  # Config Vite + proxy API dev
├── vercel.json                     # Rewrites SPA pour Vercel
├── index.html                      # Point d'entrée HTML
├── .gitignore                      # Fichiers exclus du versioning
├── publish.sh                      # Script de publication shell
├── eslint.config.js                # Config ESLint
│
├── api/                            # Fonctions serverless Vercel (prod)
│   ├── delete-sound.js             # Supprime son (Supabase storage + DB)
│   ├── delete.js                   # Supprime histoire (GitHub)
│   ├── get-upload-url.js           # Génère URL signée Supabase
│   ├── preview-sound.js            # Stream audio fichiers locaux
│   ├── publish.js                  # Publie histoire (commit GitHub)
│   ├── send-newsletter.js          # Envoie newsletter (Resend API)
│   ├── subscribe.js                # Gestion abonnements newsletter
│   ├── toggle-visibility.js        # Bascule visibilité histoire
│   ├── upload-audio.js             # Upload fichier audio vers Supabase
│   └── upload-sound.js             # Enregistre métadonnées son dans Supabase
│
├── scripts/                        # Scripts utilitaires Node.js
│   ├── dev-api-server.js           # Serveur Express dev (localhost:3001)
│   ├── addSound.js                 # Ajoute un son via CLI
│   ├── audio-dictionary.js         # Dictionnaire audio (mapping sons)
│   ├── checkpoint.js               # Crée un checkpoint de développement
│   ├── convert-stories.js          # Convertit format histoires
│   ├── generateSoundsIndex.js      # Génère index JSON des sons
│   ├── index-boom-library.js       # Indexe la BOOM Library
│   ├── migrate-sounds-to-supabase.js # Migration sons vers Supabase
│   ├── stats-sounds.cjs            # Stats bibliothèque sonore
│   ├── update-story-urls.js        # Met à jour URLs des histoires
│   └── README.md                   # Documentation scripts
│
├── public/                         # Assets statiques (servis tels quels)
│   ├── favicon.svg                 # Icône navigateur
│   ├── icons.svg                   # Sprite SVG icônes UI
│   ├── manifest.json               # PWA manifest
│   ├── soundSearchWorker.js        # Web Worker recherche sons
│   │
│   ├── fonts/                      # Polices personnalisées
│   │   ├── NamoraDayanaDemo-0vqZd.ttf
│   │   └── Oanteh-rvDvA.otf
│   │
│   ├── sounds/                     # Sons UI (clic, whoosh, settings)
│   │   ├── sounds-index.json       # Index métadonnées sons
│   │   ├── Clic ILi simple.mp3     # Son clic simple
│   │   ├── Clic ILi.mp3            # Son clic principal
│   │   ├── Clic-Settings.mp3       # Son clic settings
│   │   └── whoosh-*.mp3            # Sons whoosh (6 variantes)
│   │
│   ├── stories/                    # Histoires publiées (JSON)
│   │   ├── index.json              # Liste métadonnées histoires
│   │   ├── ili-tutoriel.json       # Histoire tutoriel
│   │   └── *.json                  # Autres histoires
│   │
│   └── textures/                   # Textures VFX
│       └── paper.png               # Texture papier pour effets
│
├── src/
│   ├── main.jsx                    # Point d'entrée React + BrowserRouter
│   ├── App.jsx                     # Routes + sons globaux (clic)
│   ├── index.css                   # Styles de base
│   │
│   ├── pages/                      # Pages principales
│   │   ├── HomePage.jsx            # Accueil + liste histoires
│   │   ├── StoryPage.jsx           # Lecteur d'histoire
│   │   ├── AdminPage.jsx           # Éditeur d'histoires
│   │   ├── AnalyticsDashboard.jsx  # Dashboard analytics
│   │   └── NewsletterPage.jsx      # Page abonnement newsletter
│   │
│   ├── components/                 # Composants réutilisables
│   │   ├── StartScreen.jsx         # Écran de démarrage
│   │   ├── StoryReader.jsx         # Lecteur texte + navigation
│   │   ├── StoryMenu.jsx           # Menu sélection histoires
│   │   ├── GameOverlay.jsx         # Overlay modes interactifs
│   │   ├── EndScreen.jsx           # Écran de fin d'histoire
│   │   ├── ReaderSettings.jsx      # Paramètres lecture (police, etc.)
│   │   ├── VfxOverlay.jsx          # Overlay effets visuels
│   │   │
│   │   └── admin/                  # Composants édition
│   │       ├── AudioTimeline.jsx   # Timeline audio 6 colonnes
│   │       ├── SoundBlock.jsx      # Bloc son dans timeline
│   │       ├── SoundBlockPanel.jsx # Panneau propriétés son
│   │       ├── SoundLibraryPicker.jsx # Sélecteur bibliothèque sons
│   │       ├── SoundImporter.jsx   # Import sons externes
│   │       ├── WaveformTrimmer.jsx # Éditeur trim audio
│   │       ├── UnifiedSegmentsTimeline.jsx # Timeline segments unifiée
│   │       ├── FormatToolbar.jsx   # Toolbar formatage texte
│   │       ├── GameModePanel.jsx   # Édition modes interactifs
│   │       ├── VfxBlock.jsx        # Bloc effet visuel
│   │       ├── VfxBlockPanel.jsx   # Panneau propriétés VFX
│   │       ├── InlineFunctionMenu.jsx # Menu fonctions inline
│   │       ├── PublishPanel.jsx    # Panneau publication
│   │       ├── PublishAnimation.jsx # Animation publication
│   │       ├── OrchestrationPanel.jsx # Panneau orchestration
│   │       ├── DraftManager.jsx    # Gestion brouillons
│   │       ├── StoryLoader.jsx     # Chargement histoires
│   │       ├── StoryPreviewModal.jsx # Prévisualisation
│   │       ├── AnalyticsDashboard.jsx # Dashboard analytics
│   │       ├── constants.js        # Constantes admin (couleurs, dims)
│   │       └── README.md           # Doc interface audio
│   │
│   ├── engine/                     # Moteurs temps réel
│   │   ├── AudioEngine.js          # Moteur audio (Howler wrapper)
│   │   └── HapticEngine.js         # Moteur haptique (vibrations)
│   │
│   ├── utils/                      # Fonctions utilitaires
│   │   ├── segmentAlgorithm.js     # Algo découpe texte en segments
│   │   ├── renderMarkdown.jsx      # Rendu markdown → JSX
│   │   ├── bionicReading.jsx       # Mode lecture bionique
│   │   ├── emojiDict.jsx           # Dictionnaire emojis
│   │   ├── inlineFunctions.jsx     # Fonctions inline (choix, etc.)
│   │   ├── soundSearch.js          # Recherche/filtre sons
│   │   └── analytics.js            # Tracking analytics
│   │
│   ├── assets/                     # Assets importés dans le bundle
│   │   ├── hero.png                # Image héro
│   │   ├── react.svg               # Logo React
│   │   └── vite.svg                # Logo Vite
│   │
│   └── styles/                     # Feuilles de style globales
│       ├── global.css              # Styles globaux + CSS variables
│       └── vfx.css                 # Styles effets visuels
```

---

## 3. Flux de Données Principal

### 3.1 Lecture d'une histoire

```
1. HomePage charge /stories/index.json → liste histoires
2. Utilisateur clique sur une histoire → navigation vers /lire/:storyId
3. StoryPage charge /stories/{storyId}.json
4. StoryReader affiche segments + gère navigation
5. AudioEngine joue sons synchronisés selon segment courant
6. VfxOverlay affiche effets visuels associés
```

### 3.2 Publication d'une histoire (Admin)

```
1. Admin remplit métadonnées + segments dans AdminPage
2. Assigne sons via AudioTimeline (soundTracks[])
3. Clique sur "Publier" → mot de passe requis (VITE_ADMIN_PASSWORD)
4. PublishPanel envoie POST /api/publish avec:
   - slug, storyData (segments, soundTracks, vfxTracks, etc.)
5. API vérifie ADMIN_PASSWORD
6. API commit sur GitHub:
   - public/stories/{slug}.json (histoire complète)
   - public/stories/index.json (métadonnées + liste)
7. Histoire disponible sur /lire/{slug}
```

### 3.3 Upload d'un son (Admin)

```
1. Admin sélectionne son dans SoundLibraryPicker
2. Ou importe via SoundImporter (fichier local)
3. Pour fichier local:
   a. Compression MP3 via lamejs (côté client)
   b. POST /api/upload-audio (base64) ou get-upload-url (signed URL)
   c. Upload vers Supabase Storage (bucket: sounds)
   d. POST /api/upload-sound → métadonnées dans Supabase DB
4. Son référencé dans sounds-index.json (Supabase ou local)
```

### 3.4 Gestion de l'authentification

| Contexte | Mécanisme | Stockage |
|----------|-----------|----------|
| **Admin (frontend)** | Mot de passe saisi → comparaison avec `VITE_ADMIN_PASSWORD` | `sessionStorage.ili_admin_password` |
| **API (dev)** | Vérification `ADMIN_PASSWORD` dans `.env` | Variable d'environnement |
| **API (prod)** | Vérification `ADMIN_PASSWORD` dans Vercel env vars | Vercel Environment Variables |

> **Pas d'authentification utilisateur** — l'app est publique en lecture, protégée en écriture par mot de passe admin.

---

## 4. Points Sensibles Connus

### 4.1 Fichiers de configuration critiques

| Fichier | Rôle | Impact si modifié |
|---------|------|-------------------|
| `vite.config.js` | Proxy API dev, headers COOP/COEP (FFmpeg.wasm) | Cassse dev server ou FFmpeg |
| `vercel.json` | Rewrite SPA vers index.html | Cassse routing en prod |
| `package.json` | Scripts, dépendances, version | Impact build/dev |
| `scripts/dev-api-server.js` | Routes API locales, auth Supabase | Cassse upload/preview sons |
| `src/App.jsx` | Routes React, sons globaux | Cassse navigation |

### 4.2 Différences Local vs Production

| Aspect | Développement | Production |
|--------|---------------|------------|
| **Serveur API** | Express localhost:3001 | Vercel Serverless Functions |
| **Stories** | Fichiers JSON dans `public/stories/` | Commitées sur GitHub via API |
| **Sons** | Fichiers locaux + Supabase | Supabase Storage uniquement |
| **Preview audio** | `/api/preview-sound` → fichiers locaux | Non utilisé (sons sur Supabase) |
| **Upload** | POST → dev-api-server.js | POST → Vercel /api/* |
| **COOP/COEP** | Headers dans vite.config.js | Headers Vercel (à configurer) |

### 4.3 Assets statiques

| Type | Chemin | Comment servis |
|------|--------|----------------|
| **HTML/CSS/JS** | Bundle Vite | `dist/` après build |
| **Fonts** | `public/fonts/` | Copiés tels quels par Vite |
| **Sons UI** | `public/sounds/` | Copiés tels quels par Vite |
| **Stories** | `public/stories/` | JSON statiques (dev) ou GitHub (prod) |
| **Textures VFX** | `public/textures/` | Copiées telles quelles par Vite |
| **Icons** | `public/icons.svg` | Sprite SVG inline ou fetch |

### 4.4 Gestion des fichiers médias

| Type | Pipeline | Formats supportés | Stockage | Métadonnées |
|------|----------|-------------------|----------|-------------|
| **Audio (sons)** | Import → compression MP3 (lamejs) → upload Supabase | MP3, WAV, AIFF, FLAC (preview) | Supabase Storage (`sounds/`) | Supabase DB (table `sounds`) + `sounds-index.json` |
| **Audio (UI)** | Fichiers statiques dans `public/sounds/` | MP3 | Bundle Vite | Hardcodé dans composants |
| **Images/Textures** | Statiques dans `public/textures/` | PNG | Bundle Vite | Hardcodé dans VfxOverlay |
| **Vidéo** | Non supporté nativement | — | — | — |

**Pipeline audio complet:**
1. Admin importe fichier local (WAV, AIFF, FLAC, MP3)
2. Client-side: conversion MP3 via `lamejs`
3. Upload vers Supabase Storage (bucket: `sounds`)
4. Métadonnées enregistrées dans table `sounds` (Supabase DB)
5. Son référencé dans `sounds-index.json` (pour recherche)
6. Lecture via Howler.js avec URL publique Supabase

---

## 5. Commandes Clés

```bash
# ── Développement ──────────────────────────────────────────────
npm run dev           # Lance Vite + serveur API local (concurrently)
npm run dev:clean     # Tue les process existants puis lance dev

# ── Build & Preview ────────────────────────────────────────────
npm run build         # Build de production (Vite)
npm run preview       # Preview du build en local

# ── Linting ────────────────────────────────────────────────────
npm run lint          # ESLint avec config projet

# ── Utilitaires ────────────────────────────────────────────────
npm run add-sound     # Ajoute un son via CLI (scripts/addSound.js)
npm run checkpoint    # Crée un checkpoint + lance serveur avec hot-reload
npm run publish       # Publie sur Vercel (bash publish.sh)

# ── Scripts manuels ────────────────────────────────────────────
node scripts/generateSoundsIndex.js   # Régénère sounds-index.json
node scripts/index-boom-library.js    # Indexe BOOM Library locale
node scripts/migrate-sounds-to-supabase.js  # Migration sons → Supabase
node scripts/update-story-urls.js     # Met à jour URLs dans stories
```

---

## 6. Variables d'Environnement

### Frontend (exposées via `VITE_*`)

| Variable | Usage | Requis |
|----------|-------|--------|
| `VITE_SUPABASE_URL` | URL projet Supabase (lecture seule) | Oui |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase (lecture seule) | Oui |
| `VITE_ADMIN_PASSWORD` | Mot de passe admin (frontend) | Oui |

### Backend (server-side uniquement)

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
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  HomePage   │  │  StoryPage  │  │  AdminPage  │             │
│  │  (liste     │  │  (lecteur   │  │  (éditeur   │             │
│  │  histoires) │  │  segments)  │  │  timeline)  │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────────────────────────────────────────┐           │
│  │              AudioEngine (Howler)               │           │
│  │  - Lecture sons synchronisés                    │           │
│  │  - Fade in/out, loop crossfade, pan spatial    │           │
│  └─────────────────────────────────────────────────┘           │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────┐           │
│  │              VfxOverlay                         │           │
│  │  - Effets visuels synchronisés                  │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
         │
         │ GET /stories/*.json          POST /api/*
         │ GET /sounds/*                (auth: ADMIN_PASSWORD)
         ▼                              ▼
┌─────────────────────┐     ┌─────────────────────┐
│     SUPABASE        │     │      GITHUB         │
│                     │     │                     │
│  - Storage: sons    │     │  - Commit stories   │
│  - DB: métadonnées  │     │  - Push index.json  │
└─────────────────────┘     └─────────────────────┘
```

---

*Document généré pour onboarding développeur — dernière mise à jour: 2025*
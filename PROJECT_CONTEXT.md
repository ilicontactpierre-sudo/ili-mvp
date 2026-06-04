# ILi MVP - Contexte Projet

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | Build optimisé, HMR en dev |
| **Backend** | Node.js + Express | Express 5.2.1 | API locale pour dev, Vercel Serverless en prod |
| **Base de données** | Supabase | JS SDK 2.106.1 | PostgreSQL hébergé, stockage audio |
| **Déploiement** | Vercel | - | Serverless functions dans `/api` |
| **Audio** | Howler.js + FFmpeg.wasm | Howler 2.2.4 | Playback + traitement audio côté client |

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                        # Vercel Serverless Functions
│   ├── upload-sound.js         # Upsert metadata son dans Supabase
│   ├── upload-audio.js         # Upload fichier audio vers Supabase Storage
│   ├── preview-sound.js        # Streaming audio (dev local)
│   ├── publish.js              # Publication histoire
│   ├── delete.js               # Suppression
│   └── toggle-visibility.js    # Gestion visibilité
├── public/
│   ├── sounds/                 # Sons UI (clic, whoosh) + index JSON
│   ├── stories/                # Histoires JSON (prod)
│   └── textures/               # Assets graphiques
├── scripts/
│   ├── dev-api-server.js       # Serveur Express local (port 3001)
│   ├── checkpoint.js           # Sauvegarde état
│   ├── migrate-sounds-to-supabase.js
│   └── index-boom-library.js
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx        # Liste histoires
│   │   ├── StoryPage.jsx       # Lecteur histoire
│   │   └── AdminPage.jsx       # Interface création/édition
│   ├── components/
│   │   ├── StoryReader.jsx     # Moteur de lecture
│   │   ├── admin/              # Outils édition (timeline, sons, VFX)
│   │   └── ...
│   ├── engine/
│   │   ├── AudioEngine.js      # Gestion playback audio (Howler)
│   │   └── HapticEngine.js     # Retours haptiques
│   └── utils/
│       └── segmentAlgorithm.js # Découpe texte en segments
├── vite.config.js              # Config Vite + proxy API
├── vercel.json                 # Rewrites SPA
└── package.json
```

## 3. Flux de Données Principal

### Requête Frontend → Backend

**Développement local :**
```
Frontend (Vite :5173) 
  → Proxy Vite (`/api/*`) 
  → Express local (:3001) 
  → Supabase API
```

**Production (Vercel) :**
```
Frontend (CDN Vercel) 
  → Vercel Serverless (`/api/*`) 
  → Supabase API
```

### Authentification
- **Admin** : Mot de passe simple (`VITE_ADMIN_PASSWORD`) stocké dans `.env`
- Pas de système d'utilisateurs multiples
- Vérification côté API via `process.env.ADMIN_PASSWORD`

### Cycle de vie d'une histoire
1. Création dans `AdminPage` → édition segments + sons + VFX
2. Sauvegarde → fichier JSON dans `public/stories/` (dev) ou Supabase (prod)
3. Publication → déploiement Vercel via `publish.sh`
4. Lecture → `StoryPage` charge le JSON + joue segments synchronisés

## 4. Points Sensibles Connus

### Fichiers de Configuration Critiques

| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Proxy API vers localhost:3001, headers COOP/COEP pour SharedArrayBuffer (FFmpeg.wasm) |
| `vercel.json` | Rewrite toutes les routes vers `index.html` (SPA) |
| `.env` | Variables sensibles (Supabase, admin, GitHub) |
| `scripts/dev-api-server.js` | Serveur API local avec streaming audio + upload |

### Différences Local vs Production

| Aspect | Développement | Production |
|--------|---------------|------------|
| API | Express local (:3001) | Vercel Serverless Functions |
| Histoires | Fichiers JSON dans `public/stories/` | Supabase (via API) |
| Sons | Fichiers locaux + Supabase Storage | Supabase Storage uniquement |
| Preview audio | Streaming depuis disque local (`/api/preview-sound`) | URLs publiques Supabase |

### Assets Statiques

- **Sons UI** : `/public/sounds/` (clic, whoosh) → servis par Vite/Vercel CDN
- **Histoires** : `/public/stories/` → JSON statiques en dev, Supabase en prod
- **Textures** : `/public/textures/` → images pour VFX

### Gestion des Fichiers Médias

| Type | Pipeline | Formats | Stockage |
|------|----------|---------|----------|
| **Audio** | Upload → compression (si besoin) → Supabase Storage | MP3, WAV, AIFF, FLAC | Bucket `sounds` Supabase |
| **Images** | Assets statiques dans `public/` | PNG, SVG | CDN Vercel |
| **Vidéo** | Non supporté nativement | - | - |

**Pas de CDN dédié** — Supabase Storage sert les fichiers audio, Vercel CDN pour le reste.

## 5. Commandes Clés

```bash
npm run dev        # Vite + Express API local (concurrently)
npm run build      # Build Vite pour production
npm run preview    # Preview build local
npm run lint       # ESLint
npm run add-sound  # Script ajout son
npm run checkpoint # Sauvegarde état + redémarre dev server
npm run publish    # Déploiement Vercel via publish.sh
```

## 6. Variables d'Environnement

### Frontend (préfixe `VITE_`)
- `VITE_SUPABASE_URL` — URL projet Supabase
- `VITE_SUPABASE_ANON_KEY` — Clé anon Supabase
- `VITE_ADMIN_PASSWORD` — Mot de passe admin
- `VITE_GEMINI_API_KEY` — Clé API Gemini (IA)

### Backend / Scripts
- `SUPABASE_URL` — URL projet Supabase
- `SUPABASE_SERVICE_KEY` — Clé service (admin) Supabase
- `ADMIN_PASSWORD` — Mot de passe admin (côté serveur)
- `GITHUB_TOKEN` — Token GitHub (pour publication/migration)

---

*Document généré pour compréhension rapide du projet. Dernière mise à jour : 04/06/2026*
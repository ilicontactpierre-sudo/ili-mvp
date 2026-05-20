# PROJECT_CONTEXT — ILi MVP

## 1. Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Frontend** | React | 19.2.6 |
| **Bundler** | Vite | 8.0.12 |
| **Routing** | React Router DOM | 7.15.0 |
| **Audio** | Howler.js | 2.2.4 |
| **Hébergement** | Vercel (SPA rewrite) | — |
| **CI/CD** | Git → Vercel (auto-deploy) | — |

**Pas de backend** — application 100% frontend, données statiques (fichiers JSON dans `/public`).

---

## 2. Structure des Fichiers

```
ili-mvp/
├── public/
│   ├── stories/           # Fichiers JSON des histoires
│   │   ├── index.json     # Catalogue des histoires
│   │   └── *.json         # Données de chaque histoire
│   ├── sounds/            # Sons locaux
│   │   ├── sounds-index.json  # Index des sons
│   │   └── *.mp3
│   └── icons.svg
├── src/
│   ├── pages/             # Routes principales
│   │   ├── HomePage.jsx   # /
│   │   ├── StoryPage.jsx  # /lire/:storyId
│   │   └── AdminPage.jsx  # /admin
│   ├── components/
│   │   ├── admin/         # Éditeur d'histoires
│   │   ├── StoryReader.jsx # Lecteur d'histoires
│   │   └── ...
│   ├── engine/            # Moteurs métier
│   │   ├── AudioEngine.js # Gestion audio (Howler)
│   │   └── HapticEngine.js # Vibrations
│   └── utils/             # Helpers
├── api/                   # Serverless functions (Vercel)
│   ├── delete.js
│   └── publish.js
├── vite.config.js
├── vercel.json            # SPA rewrite
└── package.json
```

---

## 3. Flux de Données

### Lecture d'une histoire
```
User → HomePage (liste depuis /stories/index.json)
     → StoryPage (/lire/:id)
        → Fetch /stories/:id.json
        → StoryReader affiche segments
        → AudioEngine exécute audioEvents (fadeIn, play, fadeOut)
```

### Création (Admin)
```
AdminPage → DraftManager (brouillons localStorage)
          → UnifiedSegmentsTimeline (édition segments)
          → PublishPanel → publish.sh → commit Git → Vercel deploy
```

### Auth
**Aucune authentification** — l'admin est accessible publiquement (à sécuriser).

---

## 4. Points Sensibles

### Fichiers de config critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Build SPA React |
| `vercel.json` | Rewrite URL → index.html (SPA routing) |
| `package.json` | Scripts + dépendances |

### Local vs Production
| Aspect | Local | Production |
|--------|-------|------------|
| Serveur | Vite dev server (:5173) | Vercel CDN |
| Stories | `/public/stories/*.json` | Idem (servi par Vercel) |
| Sons | Locaux (`/sounds/`) ou Cloudinary | Cloudinary (URLs externes) |

### Assets statiques
- **Servis depuis** : `/public/` → racine du site
- **Stories** : JSON statiques, pas de base de données
- **Sons** : mix local (`/sounds/`) + Cloudinary (CDN)

### Médias
| Type | Pipeline | Formats | CDN |
|------|----------|---------|-----|
| Audio | Upload manuel → `/public/sounds/` ou Cloudinary | MP3 | Cloudinary oui |
| Images | Asset dans `/src/assets/` ou URLs externes | PNG, SVG | Non |
| Vidéo | Non supporté | — | — |

---

## 5. Commandes Clés

```bash
npm run dev        # Dev server (Vite :5173)
npm run build      # Build production → /dist
npm run preview    # Preview build local
npm run lint       # ESLint
npm run add-sound  # Génère sounds-index.json
npm run publish    # bash publish.sh (commit + push)
```

---

## 6. Variables d'Environnement

**Aucune variable requise** pour le fonctionnement de base.

Variables optionnelles (si `.env` présent) :
- `VITE_*` — variables exposées au frontend (préfixe obligatoire Vite)

---

## 7. Architecture Résumé

```
┌─────────────────────────────────────────────────────┐
│                    ILi MVP                          │
│  Application de lecture d'histoires interactives    │
│  avec synchronisation audio/haptique                │
├─────────────────────────────────────────────────────┤
│  Frontend : React 19 + Vite 8                       │
│  Données  : JSON statiques (/public/stories/)       │
│  Audio    : Howler.js + AudioEngine personnalisé    │
│  Déploiement : Vercel (push Git = deploy auto)      │
│  Pas de backend, pas de BDD, pas d'auth             │
└─────────────────────────────────────────────────────┘
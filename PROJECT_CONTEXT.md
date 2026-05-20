# ILi MVP — Contexte Projet

Application web de lecture immersive d'histoires avec accompagnement sonore.

---

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router v7 |
| **Bundler** | Vite | 8.0.12 | HMR + build optimisé |
| **Audio** | Howler.js | 2.2.4 | Moteur audio (play, fade, loop) |
| **Hébergement** | Vercel | — | Déploiement auto depuis GitHub |
| **Backend** | Vercel Serverless Functions | — | API `/api/publish.js` (Node.js) |
| **Base de données** | Fichiers JSON statiques | — | Pas de BDD, données dans `public/stories/` |
| **CI/CD** | GitHub → Vercel | — | Push sur `main` déclenche le déploiement |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/
│   ├── publish.js          # API de publication (GitHub API)
│   └── delete.js           # API de suppression
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── sounds/
│   │   ├── sounds-index.json   # Index des sons disponibles
│   │   └── *.mp3               # Fichiers audio
│   └── stories/
│       ├── index.json          # Liste des histoires publiées
│       └── *.json              # Fichiers d'histoires (segments + audio)
├── scripts/
│   ├── addSound.js         # Ajoute un son à la bibliothèque
│   ├── generateSoundsIndex.js
│   └── convert-stories.js
├── src/
│   ├── components/
│   │   ├── admin/          # Interface d'édition (timeline, publish, etc.)
│   │   ├── StoryReader.jsx # Lecteur de segments
│   │   ├── StoryMenu.jsx   # Menu de sélection
│   │   ├── ReaderSettings.jsx
│   │   └── ...
│   ├── engine/
│   │   ├── AudioEngine.js  # Moteur audio (Howler.js wrapper)
│   │   └── HapticEngine.js # Vibrations (mobile)
│   ├── pages/
│   │   ├── HomePage.jsx    # Liste des histoires
│   │   ├── StoryPage.jsx   # Lecteur (route `/lire/:storyId`)
│   │   └── AdminPage.jsx   # Éditeur (route `/admin`, protégé par mot de passe)
│   ├── utils/
│   │   ├── segmentAlgorithm.js  # Découpage automatique du texte
│   │   └── renderMarkdown.jsx
│   ├── styles/
│   │   ├── global.css
│   │   └── vfx.css
│   ├── App.jsx             # Routes
│   ├── main.jsx            # Point d'entrée
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── vercel.json             # Rewrites SPA
└── publish.sh              # Script de publication manuelle
```

---

## 3. Flux de Données Principal

### Lecture d'une histoire
1. **Homepage** (`/`) → fetch `/stories/index.json` → liste les histoires
2. **StoryPage** (`/lire/:storyId`) → fetch `/stories/{storyId}.json`
3. **StoryReader** affiche les segments un par un
4. **AudioEngine** déclenche les sons selon les `audioEvents` de chaque segment
5. Progression sauvegardée dans `localStorage` via `ReaderSettings`

### Création / Publication
1. **AdminPage** (`/admin`) → authentification par mot de passe (`VITE_ADMIN_PASSWORD`)
2. Édition : découpage auto du texte, ajout de sons via timeline
3. **PublishPanel** → appel POST `/api/publish` (ou export JSON manuel)
4. **API `/api/publish.js`** :
   - Vérifie `ADMIN_PASSWORD` (côté serveur)
   - Écrit `public/stories/{slug}.json` via GitHub API
   - Met à jour `public/stories/index.json`
   - Commit & push automatique sur GitHub
5. **Vercel** red dé dé déploie automatiquement (~30s)

### Authentification
- **Admin uniquement** : mot de passe stocké dans `sessionStorage` + variable env
- Pas d'auth utilisateur pour la lecture (ouverte à tous)

---

## 4. Points Sensibles

### Fichiers de Configuration Critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Config Vite (plugin React uniquement, config minimale) |
| `vercel.json` | Rewrites SPA : toutes les routes → `index.html` |
| `package.json` | Scripts, dépendances, version |

### Environnement Local vs Production
| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| Serveur | `vite` (dev server port 5173) | CDN statique + serverless functions |
| API publish | Non disponible (message d'avertissement) | Fonctionne via GitHub API |
| Assets | Servis depuis `public/` en local | CDN Vercel |
| HTTPS | Non (localhost) | Oui (Vercel) |

### Assets Statiques
- **Servis depuis** : dossier `public/` à la racine
- **Stories** : `public/stories/*.json` (fichiers statiques)
- **Sons** : `public/sounds/*.mp3` + index JSON
- **Images** : `src/assets/` (importés via Vite) + `public/favicon.svg`

### Gestion des Fichiers Médias
| Type | Pipeline | Formats | CDN |
|------|----------|---------|-----|
| **Audio** | Fichiers MP3 dans `public/sounds/` + index JSON généré par script | MP3 | Non (Vercel CDN) |
| **Images** | Assets dans `src/assets/` ou SVG dans `public/` | SVG, PNG | Non (Vercel CDN) |
| **Histoires** | JSON manuel ou export depuis l'admin | JSON structuré | Non (Vercel CDN) |

**Format JSON d'une histoire** :
```json
{
  "id": "slug",
  "title": "Titre",
  "author": "Auteur",
  "published": true,
  "formUrl": "https://...",
  "sounds": [{ "id": "sound_1", "url": "/sounds/file.mp3", "loop": true }],
  "segments": [
    { "id": 1, "text": "Texte du segment", "audioEvents": [{ "action": "fadeIn", "soundId": "sound_1", "volume": 0.5, "duration": 2000 }] }
  ],
  "soundTracks": [],
  "vfxTracks": []
}
```

---

## 5. Commandes Clés

```bash
# Développement
npm run dev          # Vite dev server (localhost:5173)

# Build
npm run build        # Build de production dans dist/
npm run preview      # Prévisualisation du build

# Linting
npm run lint         # ESLint

# Utilitaires
npm run add-sound    # Ajoute un MP3 à la bibliothèque
npm run checkpoint   # Sauvegarde + relance le dev server

# Publication
npm run publish      # Lance publish.sh (git add/commit/push → Vercel)
./publish.sh         # Script bash de publication
```

---

## 6. Variables d'Environnement

### Côté Client (`.env`)
- `VITE_ADMIN_PASSWORD` — Mot de passe pour accéder à `/admin`

### Côté Serveur (Vercel Environment Variables)
- `ADMIN_PASSWORD` — Validation des requêtes POST `/api/publish`
- `GITHUB_TOKEN` — Token GitHub pour écrire via l'API
- `GITHUB_OWNER` — Propriétaire du repo GitHub
- `GITHUB_REPO` — Nom du repo GitHub
- `GITHUB_BRANCH` — Branche cible (défaut: `main`)

---

## 7. URLs de Référence

- **Production** : `https://ili-mvp.vercel.app`
- **Repo GitHub** : `https://github.com/ilicontactpierre-sudo/ili-mvp`
- **Dashboard Vercel** : `https://vercel.com/dashboard`
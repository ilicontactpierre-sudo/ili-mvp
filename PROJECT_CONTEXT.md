# PROJECT CONTEXT — ILi MVP

## 1. Stack Technique

| Couche | Technologie | Version | Détails |
|--------|-------------|---------|---------|
| **Frontend** | React | 19.2.6 | SPA avec React Router DOM 7.15.0 |
| **Bundler** | Vite | 8.0.12 | Plugin React officiel |
| **Audio** | Howler.js | 2.2.4 | Moteur audio pour narration immersive |
| **Backend** | Vercel Serverless Functions | — | Node.js (API routes dans `/api`) |
| **Base de données** | GitHub API (fichiers JSON) | — | Pas de BDD traditionnelle |
| **Hébergement** | Vercel | — | Déploiement auto sur `git push` |
| **CI/CD** | Vercel Git Integration | — | Build & deploy automatiques |

---

## 2. Structure des Fichiers

```
ili-mvp/
├── api/                          # Serverless functions (Vercel)
│   ├── publish.js               # POST → publie histoire sur GitHub
│   └── delete.js                # DELETE → supprime histoire de GitHub
├── public/                       # Assets statiques ( servis à la racine )
│   ├── favicon.svg
│   ├── icons.svg
│   ├── sounds/                  # Fichiers audio locaux
│   │   └── *.mp3
│   └── stories/                 # Histoires publiées (JSON)
│       ├── index.json           # Catalogue des histoires
│       └── *.json               # Fichiers d'histoires individuelles
├── src/
│   ├── components/
│   │   ├── admin/               # Interface d'édition/publishing
│   │   │   ├── PublishPanel.jsx # Panneau de publication
│   │   │   ├── SoundBlockPanel.jsx
│   │   │   ├── UnifiedSegmentsTimeline.jsx
│   │   │   └── ...
│   │   ├── EndScreen.jsx
│   │   ├── StartScreen.jsx
│   │   ├── StoryMenu.jsx
│   │   └── StoryReader.jsx      # Lecteur d'histoires
│   ├── engine/
│   │   └── AudioEngine.js       # Moteur audio (Howler.js wrapper)
│   ├── pages/
│   │   ├── HomePage.jsx         # Liste des histoires
│   │   ├── StoryPage.jsx        # Lecteur (/lire/:storyId)
│   │   └── AdminPage.jsx        # Éditeur (/admin)
│   ├── styles/
│   │   └── global.css
│   ├── utils/
│   │   └── segmentAlgorithm.js
│   ├── App.jsx                  # Routes
│   ├── main.jsx                 # Point d'entrée
│   └── index.css
├── scripts/                      # Scripts utilitaires
│   ├── addSound.js              # Ajoute un son à la bibliothèque
│   ├── checkpoint.js            # Sauvegarde locale
│   └── generateSoundsIndex.js   # Génère index des sons
├── .gitignore
├── index.html                   # HTML d'entrée (Vite)
├── package.json
├── vite.config.js
└── vercel.json                  # Rewrites SPA
```

---

## 3. Flux de Données Principal

### Navigation
```
/ → HomePage → charge /stories/index.json → affiche la liste
/lire/:storyId → StoryPage → charge /stories/{id}.json → StoryReader + AudioEngine
/admin → AdminPage → interface complète d'édition/publishing
```

### Publication d'une histoire
```
AdminPage (PublishPanel)
  → POST /api/publish { password, slug, storyData }
    → Vérifie ADMIN_PASSWORD
    → Écrit public/stories/{slug}.json via GitHub API
    → Met à jour public/stories/index.json via GitHub API
    → Vercel redéploie → fichiers disponibles ~30s
```

### Suppression d'une histoire
```
HomePage (StoryMenu)
  → DELETE /api/delete { password, slug }
    → Vérifie ADMIN_PASSWORD
    → Supprime public/stories/{slug}.json via GitHub API
    → Met à jour public/stories/index.json via GitHub API
```

### Authentification
- **Pas de système d'auth utilisateur** — l'app est publique en lecture
- **Admin** : mot de passe unique (`ADMIN_PASSWORD`) validé côté serveur dans les API routes
- Le mot de passe est stocké en `sessionStorage` côté client après saisie

---

## 4. Points Sensibles Connus

### Fichiers de configuration critiques
| Fichier | Rôle |
|---------|------|
| `vite.config.js` | Config Vite (React plugin, pas de config spéciale) |
| `vercel.json` | Rewrite toutes les routes vers `/index.html` (SPA) |
| `package.json` | Scripts, dépendances, version |

### Différences local vs production
| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| API publish/delete | ❌ Désactivées | ✅ Actives |
| Stories | Fichiers statiques dans `public/stories/` | GitHub API écrit les fichiers |
| Sons | Fichiers locaux `/sounds/*.mp3` | Cloudinary (URLs externes) ou locaux |
| Build | `vite preview` | Build Vercel automatique |

### Assets statiques
- **Servis depuis** : dossier `public/` à la racine
- **Comment** : Vite copie `public/` dans `dist/` au build, Vercel sert depuis la racine
- **Cache** : géré par Vercel CDN automatiquement

### Gestion des fichiers médias (audio)
| Type | Source | Formats | CDN |
|------|--------|---------|-----|
| Sons bibliothèque | `public/sounds/*.mp3` | MP3 | Non (fichiers statiques) |
| Sons histoires publiées | Cloudinary (URLs dans le JSON) | MP3 | ✅ Oui |
| Upload utilisateur | ❌ Pas d'upload — ajout manuel via `npm run add-sound` | MP3 | Non |

**Pipeline audio** :
1. Ajout manuel d'un MP3 dans `public/sounds/`
2. Exécution de `npm run generate-sounds-index` pour indexer
3. Sélection dans l'éditeur via `SoundLibraryPicker`
4. À la publication, les sons utilisés sont référencés par URL dans le JSON de l'histoire

---

## 5. Commandes Clés

```bash
npm run dev          # Démarre Vite dev server (localhost:5173)
npm run build        # Build de production (output: dist/)
npm run preview      # Prévisualise le build en local
npm run lint         # ESLint
npm run add-sound    # Ajoute un son à la bibliothèque (script interactif)
npm run checkpoint   # Sauvegarde locale d'une histoire en cours
npm run publish      # Lance publish.sh (déploiement manuel)
```

---

## 6. Variables d'Environnement

### Côté serveur (Vercel Environment Variables)
| Nom | Rôle | Requis |
|-----|------|--------|
| `ADMIN_PASSWORD` | Mot de passe pour publier/supprimer | ✅ |
| `GITHUB_TOKEN` | Token GitHub API (write access) | ✅ |
| `GITHUB_OWNER` | Propriétaire du repo GitHub | ✅ |
| `GITHUB_REPO` | Nom du repo GitHub | ✅ |
| `GITHUB_BRANCH` | Branche cible (défaut: `main`) | Optionnel |

### Côté client (`.env` à la racine)
| Nom | Rôle |
|-----|------|
| `VITE_ADMIN_PASSWORD` | Fallback mot de passe (moins sécurisé, dév uniquement) |

---

## 7. Format des Données

### `public/stories/index.json` — Catalogue
```json
[
  { "id": "slug-unique", "title": "Titre", "author": "Auteur" }
]
```

### `public/stories/{slug}.json` — Histoire complète
```json
{
  "id": "slug-unique",
  "title": "Titre",
  "author": "Auteur",
  "published": true,
  "sounds": [
    { "id": "sound_id", "url": "https://...", "loop": true }
  ],
  "segments": [
    {
      "id": 1,
      "text": "Paragraphe de texte...",
      "audioEvents": [
        { "action": "fadeIn", "soundId": "sound_id", "volume": 0.5, "duration": 2000 },
        { "action": "play", "soundId": "sound_id", "volume": 0.7, "delay": 500 },
        { "action": "stop", "soundId": "sound_id" },
        { "action": "fadeOut", "soundId": "sound_id", "duration": 1500 }
      ]
    }
  ]
}
```

---

**Dernière mise à jour** : 2026-05-13
# ILi — Lecture Immersive

Ce fichier donne le contexte nécessaire pour travailler sur ce repo. Lis-le avant toute modification.

## Stack

- React 19.2.6, React Router 7.15, Vite 8.0.12
- Express (serveur API local, dev uniquement) + Vercel Serverless Functions (prod)
- Supabase (base de données + stockage fichiers)
- Howler.js (audio), Fuse.js (recherche), ffmpeg côté client

## Commandes

- `npm run dev` — lance le serveur API local (Express, port 3001) + Vite (port 5173) en parallèle
- `npm run build` — build de production
- `npm run lint` — ESLint
- `npm run preview` — prévisualise le build de production
- `npm run sync` — synchronisation Git manuelle (`git-sync.sh`) — **ne tourne plus automatiquement**, à lancer volontairement uniquement
- `npm run publish` — publication manuelle via `publish.sh` (commit + push) — **ne jamais lancer sans confirmation explicite de l'utilisateur**
- `npm run checkpoint` — snapshot + relance Vite en écoute réseau (0.0.0.0)
- `npm run add-sound` — script d'ajout de son à la bibliothèque

## Structure du repo

```
src/
├── main.jsx / App.jsx / index.css       # Point d'entrée, routes, styles globaux
├── pages/
│   ├── HomePage.jsx                     # Accueil
│   ├── StoryPage.jsx                    # Lecteur d'histoire
│   ├── AdminPage.jsx                    # Éditeur complet (segmentation, timeline, publication)
│   ├── TutorialPage.jsx
│   ├── NewsletterPage.jsx
│   └── AnalyticsDashboard.jsx
├── components/
│   ├── StoryReader.jsx                  # Cœur du rendu de lecture
│   ├── StoryMenu.jsx / StartScreen.jsx / EndScreen.jsx / SeuilScreen.jsx
│   ├── GameOverlay.jsx / VfxOverlay.jsx
│   └── admin/                           # ~20 composants de l'éditeur admin
│       (timeline unifiée, orchestration audio, blocs son/vfx, formatage,
│        game modes, gestion brouillons, publication, menu, analytics...)
├── engine/
│   ├── AudioEngine.js                   # ⚠️ ZONE SENSIBLE — voir ci-dessous
│   └── HapticEngine.js                  # Vibrations sur segments
├── utils/
│   ├── segmentAlgorithm.js              # ⚠️ ZONE SENSIBLE — voir ci-dessous
│   ├── renderMarkdown.jsx / inlineFunctions.jsx / bionicReading.jsx
│   ├── emojiDict.jsx / soundSearch.js (Web Worker) / analytics.js
├── assets/ et styles/

api/                                     # Endpoints Vercel Serverless (prod)
scripts/dev-api-server.js                # Serveur Express (dev local) — voir ⚠️ ci-dessous
public/stories/*.json                    # ⚠️ ZONE SENSIBLE — format story, voir ci-dessous
public/sounds/
```

## ⚠️ Deux environnements API à ne jamais confondre

- **Production (Vercel)** : chaque fichier dans `api/*.js` est découvert et servi automatiquement par Vercel. Format : `export default async function handler(req, res) {...}`.
- **Développement local (Express)** : `scripts/dev-api-server.js` sert les routes, mais **chaque route doit y être déclarée manuellement**, en plus d'exister dans `api/*.js`. Format : `app.post('/api/nom-route', express.json(), async (req, res) => {...})`.

**Piège déjà rencontré** : créer un nouvel endpoint dans `api/*.js` sans l'ajouter aussi à `dev-api-server.js` produit une erreur 404 silencieuse en local, alors que la prod fonctionnerait normalement. Toujours déclarer un nouvel endpoint aux deux endroits, et tester dans les deux environnements avant de considérer une modification API terminée.

## Zones sensibles — prudence maximale, jamais de modification sans plan détaillé validé au préalable

1. **`src/engine/AudioEngine.js`** — coexistence de deux systèmes : ancien système `AudioEvents` (actions `play`/`stop`/`fadeIn`/`fadeOut`/`volume` déclenchées par segment) et nouveau système `SoundTracks` (blocs continus multi-segments : fade, crossfade de loop, panoramique animé, automation de volume point par point). `onSegmentChange()` gère les deux en même temps, avec une logique fine pour démarrer un son "à froid" en milieu de bloc au volume exact attendu (sans fondu parasite). Risque : régression silencieuse, aucun test/lint ne l'attrape à ce jour.

2. **`src/utils/segmentAlgorithm.js`** — pipeline heuristique en plusieurs phases dépendantes les unes des autres : normalisation → découpe en phrases → parsing en unités typées → fusion des fragments → scoring narratif (isolation/tension/continuité) → détection de "beats" dramatiques → composition des segments → coupe sur ponctuation faible → lissage anti-monotonie → sérialisation → anti-blocs longs consécutifs → limite d'affichage. Modifier une phase a des effets en cascade sur les suivantes.

3. **Format JSON des stories (`public/stories/*.json`)** — contrat implicite entre l'éditeur admin et le lecteur. Aucun schéma formel n'existe à ce jour. Un JSON syntaxiquement valide mais sémantiquement incompatible casse le lecteur sans erreur de build.

4. **Authentification admin et endpoints `/api/*`** — l'authentification passe désormais par `/api/login`, qui vérifie le mot de passe côté serveur uniquement contre `process.env.ADMIN_PASSWORD`. **Ne jamais réintroduire de comparaison de mot de passe côté client**, et ne jamais exposer `ADMIN_PASSWORD` via une variable `VITE_*` (tout ce qui est préfixé `VITE_` finit dans le bundle JS public). Chaque endpoint protégé vérifie le mot de passe reçu contre `ADMIN_PASSWORD` — c'est le pattern à respecter pour tout nouvel endpoint.

5. **`git-sync.sh`** — ne tourne plus automatiquement (retiré du script `npm run dev`). Disponible uniquement via `npm run sync`, à la demande. En cas de conflit, il s'arrête et prévient plutôt que de résoudre automatiquement en faveur du local.

6. **`scripts/checkpoint.js`** (via `npm run checkpoint`) — le script npm ne contient plus de chemin en dur ; fonctionne quel que soit l'emplacement du repo.

## Règles de travail

- Toujours proposer un plan avant d'éditer du code — ne jamais éditer directement sans validation préalable, surtout sur les zones sensibles ci-dessus.
- Branche dédiée dès qu'une tâche touche plus d'1-2 fichiers ou une zone sensible.
- Après implémentation : `npm run lint` + `npm run build` (+ tests quand ils existent) avant de considérer une tâche terminée.
- Ne jamais exécuter sans confirmation explicite : `git push --force`, rebase, réécriture d'historique, toute commande touchant `.env`/secrets/clés, suppression de fichiers dans `public/stories/` ou `public/sounds/`, modification des credentials admin ou du script de publication, installation de package non demandée.
- `npm run publish` (déploiement) : jamais automatisé sans confirmation explicite de l'utilisateur.

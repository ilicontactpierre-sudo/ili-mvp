# ILi — Lecture Immersive

Ce fichier donne le contexte nécessaire pour travailler sur ce repo. Lis-le avant toute modification. Pour savoir où regarder selon la demande (et économiser des tokens), lis d'abord la section 0 de `PROJECT_CONTEXT.md`.

## Stack

- React 19.2.6, React Router 7.15, Vite 8.0.12
- Express (serveur API local, dev uniquement) + Vercel Serverless Functions (prod)
- Supabase (base de données + stockage fichiers)
- Howler.js (audio), Fuse.js (recherche), ffmpeg côté client

## Commandes

- `npm run dev` — lance le serveur API local (Express, port 3001) + Vite (port 5173) en parallèle
- `npm run build` — build de production
- `npm run lint` — ESLint (345 problèmes préexistants : ne pas chercher à les « corriger » ; le lancer AVANT `npm run build`, car le dossier `dist/` fausse le compte)
- `npm run preview` — prévisualise le build de production
- `npm run sync` — synchronisation Git manuelle (`git-sync.sh`) — **ne tourne plus automatiquement**, à lancer volontairement uniquement
- `npm run publish` — publication sûre (`scripts/publish.js`) : rapport des fichiers, tests, build, puis un mot à taper (« main » sur `main`, « o » sur une autre branche). Options : `--dry-run` (simulation), `--skip-checks` ; message de commit : `npm run publish -- "message"`. **Un agent IA ne le lance jamais : c'est Pierre qui le tape.** `publish.sh` est l'ancien script, plus branché.
- `npm run checkpoint` — snapshot (même rapport et même confirmation que `publish`) + étiquette + relance Vite en écoute réseau (0.0.0.0) ; sur une branche de travail seulement. Simulation : `node scripts/checkpoint.js --dry-run` (et non `npm run checkpoint -- --dry-run`)
- `npm run add-sound` — script d'ajout de son à la bibliothèque
- `npx vitest run` — lance les tests une seule fois (183 tests). Ne pas utiliser `npm test` : il lance Vitest en mode surveillance et reste ouvert
- `node scripts/validate-story.mjs public/stories/` — valide le format de toutes les stories JSON (références cassées, champs manquants...) ; ajouter `--check-urls` pour vérifier aussi que les URLs de sons Supabase répondent (plus lent, nécessite une connexion réseau) ; peut aussi cibler un seul fichier (`node scripts/validate-story.mjs public/stories/nom-de-la-story.json`)

## Structure du repo

```
src/
├── main.jsx / App.jsx / index.css       # Point d'entrée, routes, styles globaux
├── pages/
│   ├── HomePage.jsx                     # Accueil
│   ├── StoryPage.jsx                    # Lecteur d'histoire
│   ├── AdminPage.jsx                    # Éditeur complet (segmentation, timeline, publication)
│   ├── TutorialPage.jsx
│   └── NewsletterPage.jsx               # Affichée dans l'admin (l'analytics est dans components/admin/)
├── components/
│   ├── StoryReader.jsx                  # Cœur du rendu de lecture
│   ├── StoryMenu.jsx / StartScreen.jsx / EndScreen.jsx / SeuilScreen.jsx
│   ├── GameOverlay.jsx / VfxOverlay.jsx
│   └── admin/                           # ~20 composants de l'éditeur admin
│       (timeline unifiée, orchestration audio, blocs son/vfx, formatage,
│        game modes, gestion brouillons, publication, menu, analytics...)
├── engine/
│   ├── AudioEngine.js                   # ⚠️ ZONE SENSIBLE — voir ci-dessous
│   ├── HapticEngine.js                  # Vibrations sur segments
│   └── SoundLoader.js / audioCache.js   # Chargement des sons (téléchargement, cache téléphone) — voir PROJECT_CONTEXT.md §7
├── utils/
│   ├── segmentAlgorithm.js              # ⚠️ ZONE SENSIBLE — voir ci-dessous
│   ├── segmentAlgorithm.test.js         # Tests de non-régression (30 tests) — npm test
│   ├── renderMarkdown.jsx / inlineFunctions.jsx / bionicReading.jsx
│   ├── emojiDict.jsx / soundSearch.js (Web Worker) / analytics.js
├── assets/ et styles/
api/                                     # Endpoints Vercel Serverless (prod)
scripts/dev-api-server.js                # Serveur Express (dev local) — voir ⚠️ ci-dessous
scripts/validate-story.mjs               # Validateur de schéma pour public/stories/*.json — voir ⚠️ ci-dessous
public/stories/*.json                    # ⚠️ ZONE SENSIBLE — format story, voir ci-dessous
public/sounds/
```

## ⚠️ Deux environnements API à ne jamais confondre

- **Production (Vercel)** : chaque fichier dans `api/*.js` est découvert et servi automatiquement par Vercel. Format : `export default async function handler(req, res) {...}`.
- **Développement local (Express)** : `scripts/dev-api-server.js` sert les routes, mais **chaque route doit y être déclarée manuellement**, en plus d'exister dans `api/*.js`. Format : `app.post('/api/nom-route', express.json(), async (req, res) => {...})`.

**Piège déjà rencontré** : créer un nouvel endpoint dans `api/*.js` sans l'ajouter aussi à `dev-api-server.js` produit une erreur 404 silencieuse en local, alors que la prod fonctionnerait normalement. Toujours déclarer un nouvel endpoint aux deux endroits, et tester dans les deux environnements avant de considérer une modification API terminée.

## Zones sensibles — prudence maximale, jamais de modification sans plan détaillé validé au préalable

1. **`src/engine/AudioEngine.js`** — coexistence de deux systèmes : ancien système `AudioEvents` (actions `play`/`stop`/`fadeIn`/`fadeOut`/`volume` déclenchées par segment) et nouveau système `SoundTracks` (blocs continus multi-segments : fade, crossfade de loop, panoramique animé, automation de volume point par point). `onSegmentChange()` gère les deux en même temps, avec une logique fine pour démarrer un son "à froid" en milieu de bloc au volume exact attendu (sans fondu parasite). Risque : régression silencieuse, aucun test/lint ne l'attrape à ce jour.

2. **`src/utils/segmentAlgorithm.js`** — pipeline heuristique en plusieurs phases dépendantes les unes des autres : normalisation → découpe en phrases → parsing en unités typées → fusion des fragments → scoring narratif (isolation/tension/continuité) → détection de "beats" dramatiques → composition des segments → coupe sur ponctuation faible → lissage anti-monotonie → sérialisation → anti-blocs longs consécutifs → limite d'affichage. Modifier une phase a des effets en cascade sur les suivantes. **30 tests de non-régression existent** (`src/utils/segmentAlgorithm.test.js`, lancer `npm test`) — toute modification de ce fichier doit les faire passer avant merge, et une modification de comportement volontaire doit s'accompagner d'une mise à jour des tests concernés, jamais l'inverse.

3. **Format JSON des stories (`public/stories/*.json`)** — contrat implicite entre l'éditeur admin et le lecteur. **Un validateur existe** (`node scripts/validate-story.mjs public/stories/`) qui détecte les références cassées (`soundId`/`startSegmentId`/`endSegmentId`), IDs dupliqués et champs mal typés — mais il ne bloque rien automatiquement (pas de build/CI branché dessus à ce jour) : à lancer manuellement après toute modification du format ou avant une publication importante.

4. **Authentification admin et endpoints `/api/*`** — l'authentification passe désormais par `/api/login`, qui vérifie le mot de passe côté serveur uniquement contre `process.env.ADMIN_PASSWORD`. **Ne jamais réintroduire de comparaison de mot de passe côté client**, et ne jamais exposer `ADMIN_PASSWORD` via une variable `VITE_*` (tout ce qui est préfixé `VITE_` finit dans le bundle JS public). Chaque endpoint protégé vérifie le mot de passe reçu contre `ADMIN_PASSWORD` — c'est le pattern à respecter pour tout nouvel endpoint.

5. **`git-sync.sh`** — ne tourne plus automatiquement (retiré du script `npm run dev`). Disponible uniquement via `npm run sync`, à la demande. En cas de conflit, il s'arrête et prévient plutôt que de résoudre automatiquement en faveur du local.

6. **`scripts/checkpoint.js`** (via `npm run checkpoint`) — le script npm ne contient plus de chemin en dur ; fonctionne quel que soit l'emplacement du repo. Depuis le 23/10/2026, il affiche un rapport et demande une confirmation avant d'écrire, et ne fusionne plus automatiquement. À lancer sur une branche de travail seulement.

## Règles de travail

- Toujours proposer un plan avant d'éditer du code — ne jamais éditer directement sans validation préalable, surtout sur les zones sensibles ci-dessus.
- Branche dédiée dès qu'une tâche touche plus d'1-2 fichiers ou une zone sensible.
- Après implémentation : `npx eslint .` (doit rester à 345), puis `npm run build`, et `npx vitest run` (183 tests) avant de considérer une tâche terminée.
- Ne jamais exécuter sans confirmation explicite : `git push --force`, rebase, réécriture d'historique, toute commande touchant `.env`/secrets/clés, suppression de fichiers dans `public/stories/` ou `public/sounds/`, modification des credentials admin ou du script de publication, installation de package non demandée.
- Un agent IA ne lance jamais `npm run publish`, `npm run checkpoint` ni `git push` : il donne la commande, Pierre la tape (règles complètes : section 0 de `PROJECT_CONTEXT.md`).

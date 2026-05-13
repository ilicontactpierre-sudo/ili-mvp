# Scripts ILi MVP

Ce dossier contient des scripts utilitaires pour le projet ILi MVP.

## 📜 Liste des Scripts

### `npm run dev`
Démarre le serveur de développement Vite en local.
```bash
npm run dev
```

### `npm run build`
Compile le projet pour la production.
```bash
npm run build
```

### `npm run lint`
Exécute le linter ESLint pour vérifier la qualité du code.
```bash
npm run lint
```

### `npm run preview`
Aperçu du build de production en local.
```bash
npm run preview
```

### `npm run publish` 🚀
**Publie les changements sur Vercel** (équivalent à `git add . && git commit && git push`)
```bash
npm run publish
```
Ou avec un message personnalisé :
```bash
./publish.sh "feat: mon super changement"
```

### `npm run add-sound`
Ajoute un fichier son à la bibliothèque et génère automatiquement les métadonnées.
```bash
npm run add-sound
```

### `npm run checkpoint`
Crée un point de contrôle (checkpoint) du projet.
```bash
npm run checkpoint
```

## 🛠️ Scripts Directs (sans npm)

### `./publish.sh`
Exécute directement le script de publication shell.
```bash
./publish.sh
```

---

**Note :** Pour plus de détails sur la configuration de la publication automatique, consulte `PUBLISH_SETUP.md` à la racine du projet.
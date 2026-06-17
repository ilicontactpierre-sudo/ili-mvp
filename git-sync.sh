#!/bin/bash

echo "🔄 Synchronisation Git..."

# 1. Stash les changements locaux
git stash

# 2. Si un merge est en cours, le finaliser
if [ -f .git/MERGE_HEAD ]; then
  echo "⚠️  Merge en cours détecté — finalisation..."
  git commit --no-edit
fi

# 3. Pull sans rebase
git pull --no-rebase

# 4. Résoudre automatiquement les conflits en faveur du local
git checkout --ours -- . 2>/dev/null

# 5. Finaliser si conflit
if [ -f .git/MERGE_HEAD ]; then
  git add .
  git commit --no-edit
fi

# 6. Récupérer les changements stashés
git stash pop 2>/dev/null

echo "✅ Synchronisation terminée."

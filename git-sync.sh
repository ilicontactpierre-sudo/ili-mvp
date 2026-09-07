#!/bin/bash
set -e
echo "🔄 Synchronisation Git..."

# 1. Mettre de côté les modifications locales, seulement s'il y en a
STASHED=false
if [ -n "$(git status --porcelain)" ]; then
  echo "📦 Mise de côté des modifications locales non commitées..."
  git stash
  STASHED=true
fi

# 2. Pull sans rebase
echo "⬇️  Récupération des changements distants..."
if ! git pull --no-rebase; then
  echo "❌ Le pull a échoué (probablement un conflit)."
  echo "   Résous-le manuellement : git status, puis git add . && git commit"
  if [ "$STASHED" = true ]; then
    echo "⚠️  Tes modifications locales sont en sécurité dans le stash (git stash list)."
    echo "   Récupère-les avec 'git stash pop' une fois le conflit résolu."
  fi
  exit 1
fi

# 3. Réappliquer les modifications mises de côté, si besoin
if [ "$STASHED" = true ]; then
  echo "📤 Réapplication de tes modifications locales..."
  if ! git stash pop; then
    echo ""
    echo "⚠️  CONFLIT lors de la réapplication de tes modifications locales."
    echo "   Rien n'a été résolu automatiquement — tes modifications sont toujours en sécurité dans le stash."
    echo "   Pour résoudre :"
    echo "     git status              # voir les fichiers en conflit"
    echo "     (édite les fichiers, cherche <<<<<<< / ======= / >>>>>>>)"
    echo "     git add ."
    echo "     git stash drop          # une fois résolu, pour nettoyer le stash"
    exit 1
  fi
fi

echo "✅ Synchronisation terminée."
#!/bin/bash
# Script pour publier les changements sur Vercel
# Utilisation : ./publish.sh [message de commit optionnel]

echo "🚀 Publication des changements..."

# Vérifier si git est installé
if ! command -v git &> /dev/null; then
    echo "❌ Git n'est pas installé. Installe-le d'abord."
    exit 1
fi

# Vérifier si on est dans un repo git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Ce dossier n'est pas un repository Git."
    exit 1
fi

# Récupérer le message de commit (paramètre optionnel) - dès le début
COMMIT_MSG=$1
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="feat: publish changes $(date +'%Y-%m-%d %H:%M')"
fi

# Vérifier s'il y a des changements à commiter
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Ajout des fichiers modifiés..."
    git add .

    echo "💾 Création du commit..."
    git commit -m "$COMMIT_MSG"

    if [ $? -ne 0 ]; then
        echo "❌ Échec du commit. Vérifie tes fichiers."
        exit 1
    fi
fi

# Maintenant synchroniser avec le remote
echo "🔄 Synchronisation avec GitHub..."
git fetch origin
if [ $? -ne 0 ]; then
    echo "❌ Échec de la récupération du remote. Vérifie ta connexion réseau."
    exit 1
fi

read remote_ahead local_ahead < <(git rev-list --left-right --count origin/main...HEAD 2>/dev/null || echo "0 0")

if [ "$remote_ahead" -gt 0 ] && [ "$local_ahead" -eq 0 ]; then
    echo "🔄 Ta branche locale est en retard de $remote_ahead commit(s). Pull en cours..."
    git pull --ff-only origin main
    if [ $? -ne 0 ]; then
        echo "❌ Échec du pull. Intègre les changements distants manuellement."
        exit 1
    fi
elif [ "$remote_ahead" -gt 0 ] && [ "$local_ahead" -gt 0 ]; then
    echo "⚡ La branche locale et distante ont divergé. Rebase en cours..."
    git pull --rebase origin main
    if [ $? -ne 0 ]; then
        echo "❌ Le rebase a échoué (il y a probablement des conflits)."
        echo "   Résous les conflits manuellement :"
        echo "     git status          (pour voir les fichiers en conflit)"
        echo "     # ... répare les conflits ..."
        echo "     git add .           (ajoute les fichiers résolus)"
        echo "     git rebase --continue"
        exit 1
    fi
fi

# Pousser vers GitHub
echo "📤 Envoi vers GitHub..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Échec du push. Vérifie ta connexion et tes permissions."
    exit 1
fi

echo ""
echo "✅ Changements publiés avec succès !"
echo "🌐 Vercel va automatiquement redéployer."
echo "⏱️ Attends 1-2 minutes, puis rafraîchis ta page (Ctrl+Shift+R)"
echo ""
echo "🔍 Tu peux suivre le déploiement ici :"
echo "   https://vercel.com/dashboard"
echo ""
echo "🌍 URL de ton application :"
echo "   https://ili-mvp.vercel.app"

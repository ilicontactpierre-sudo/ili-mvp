# ILi Checkpoints / Backups

Ce fichier liste les points de sauvegarde (tags Git) pour pouvoir revenir facilement a un etat stable.

## Commandes utiles

```bash
# Voir tous les checkpoints (tags)
git tag --list

# Revenir temporairement a un checkpoint
git checkout <checkpoint-tag>

# Repartir depuis un checkpoint sur une nouvelle branche (recommande)
git checkout -b reprise-<date> <checkpoint-tag>
```

## Regle de nommage recommandee

`ili-checkpoint-YYYY-MM-DD-<short-label>`

Exemple: `ili-checkpoint-2026-05-11-reader-baseline`

## Historique des checkpoints

| Date | Tag | Description | Commande de checkout |
|---|---|---|---|
| _a remplir_ | _a remplir_ | _a remplir_ | `git checkout <tag>` |

## Ajout d'un nouveau checkpoint
Place toi ici :

cd "/Users/Twolow/Library/CloudStorage/GoogleDrive-ili.contact.pierre@gmail.com/Mon Drive/ILi Cursor/ili-mvp/ili-mvp"

1. Creer un commit:

```bash
git add .
git commit -m "checkpoint: <description>"
```

2. Creer le tag:

```bash
git tag -a ili-checkpoint-2026-05-11-Avant-étape-14 -m "ILi checkpoint: Avant étape 14"
```

3. Pousser commit + tag:

```bash
git push origin main
git push origin ili-checkpoint-YYYY-MM-DD-<short-label>
```

4. Ajouter une ligne dans le tableau ci-dessus.


Relance Vite : 

cd "/Users/Twolow/Library/CloudStorage/GoogleDrive-ili.contact.pierre@gmail.com/Mon Drive/ILi Cursor/ili-mvp/ili-mvp"
npx vite --host 0.0.0.0 --port 5173
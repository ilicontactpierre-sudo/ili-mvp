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
| 2026-05-13 | `ili-checkpoint-2026-05-13-etape-19-publi-export` | Étape 19 : Section Publication/Export améliorée (DraftManager, StoryLoader, StoryPreviewModal, PublishPanel) | `git checkout ili-checkpoint-2026-05-13-etape-19-publi-export` |
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
git tag -a ili-checkpoint-2026-05-13-Avant-étape-19-segmentdébut/finOK -m "ILi checkpoint: jusqu'à bloc son segment début/fin OK"
```

3. Pousser commit + tag:

```bash
git push origin main
git push origin ili-checkpoint-2026-05-13-<Avant-étape-19-segmentdébut/finOK>
```

4. Ajouter une ligne dans le tableau ci-dessus.


Relance Vite : 

cd "/Users/Twolow/Library/CloudStorage/GoogleDrive-ili.contact.pierre@gmail.com/Mon Drive/ILi Cursor/ili-mvp/ili-mvp"
npx vite --host 0.0.0.0 --port 5173


Ce que tu peux faire maintenant
Lance à nouveau le script :
npm run checkpoint
Si le push échoue encore, teste manuellement :
git push origin main

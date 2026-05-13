# Configuration de la Publication Automatique ILi

Ce guide explique comment configurer la publication automatique des histoires ILi via l'API GitHub.

## 📋 Prérequis

1. **Compte GitHub** avec accès en écriture au repository `ili-mvp`
2. **Déploiement Vercel** configuré pour le projet
3. **Node.js** installé localement pour générer le Personal Access Token

## 🚀 Étape 1 : Créer un Personal Access Token GitHub

1. Va sur GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Clique sur **Generate new token (classic)**
3. Donne-lui un nom : `ili-mvp-publish`
4. Coche les permissions suivantes :
   - ✅ `repo` (Full control of private repositories)
5. Clique sur **Generate token** en bas de page
6. **Copie le token** (il commence par `ghp_...`) — tu n'y auras plus accès après !

## 🎯 Étape 2 : Configurer les Variables d'Environnement Vercel

1. Va sur le **Vercel Dashboard** → ton projet `ili-mvp`
2. Clique sur **Settings** → **Environment Variables**
3. Ajoute les variables suivantes (une par une) :

### Variables à ajouter :

| Nom | Valeur | Environnements |
|-----|--------|----------------|
| `ADMIN_PASSWORD` | `ILI2025` (ou ton mot de passe admin) | Production, Preview, Development |
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxx` (ton token GitHub) | Production, Preview, Development |
| `GITHUB_OWNER` | `ilicontactpierre-sudo` (ton username GitHub) | Production, Preview, Development |
| `GITHUB_REPO` | `ili-mvp` | Production, Preview, Development |
| `GITHUB_BRANCH` | `main` | Production, Preview, Development |

4. Pour chaque variable, coche **Production**, **Preview**, et **Development**
5. Clique sur **Save** après chaque ajout

## 🔄 Étape 3 : Redéploie Manuellement

Après avoir ajouté les variables d'environnement, tu dois redéployer manuellement :

1. Va sur **Deployments** dans le Dashboard Vercel
2. Clique sur les **⋯** à côté du dernier déploiement
3. Sélectionne **Redeploy**
4. Confirme le redéploiement

## ✅ Étape 4 : Tester la Publication

1. Ouvre l'admin : `https://ili-mvp.vercel.app/admin`
2. Connecte-toi avec ton mot de passe
3. Crée une histoire de test (titre, slug, texte, segments)
4. Dans la section **Publication / Export**, clique sur **🚀 Publier mon histoire**
5. Observe l'animation des 3 étapes :
   - ○ Écriture de l'histoire...
   - ○ Mise à jour du catalogue...
   - ○ Déclenchement du déploiement...
6. Après le checkmark vert, l'histoire sera en ligne dans ~30 secondes

## 🛠️ Dépannage

### Le bouton "Publier" affiche un message d'erreur en local
C'est normal ! La publication automatique ne fonctionne qu'en production (sur Vercel). En local, utilise le bouton **📋 Générer le JSON (export manuel)**.

### Erreur "Non autorisé"
Vérifie que `ADMIN_PASSWORD` dans Vercel correspond à `VITE_ADMIN_PASSWORD` dans ton `.env`.

### Erreur "Variables GitHub manquantes"
Une ou plusieurs variables GitHub ne sont pas configurées dans Vercel. Retourne à l'étape 2.

### Erreur GitHub API 401/403
Ton `GITHUB_TOKEN` est invalide ou n'a pas les bonnes permissions. Retourne à l'étape 1.

### L'histoire n'apparaît pas après publication
1. Vérifie que les fichiers ont bien été créés sur GitHub (va voir dans ton repo)
2. Vérifie que Vercel a redéployé (Dashboard → Deployments)
3. Attends 30-60 secondes après la fin du déploiement

## 📝 Notes Importantes

- **Sécurité** : Les variables serveur (`ADMIN_PASSWORD`, `GITHUB_TOKEN`, etc.) ne sont JAMAIS exposées au frontend. Elles sont uniquement utilisées par la Serverless Function `/api/publish`.
- **Rate Limiting** : GitHub limite à 5000 requêtes/heure pour les tokens classiques. Tu es large avec la publication d'histoires !
- **Mises à jour** : Si tu publies une histoire avec un slug existant, elle sera mise à jour (pas de doublon dans `index.json`).
- **Fichiers créés** :
  - `public/stories/{slug}.json` — le fichier de l'histoire
  - `public/stories/index.json` — le catalogue des histoires

## 🔧 Structure des Fichiers

```
ili-mvp/
├── api/
│   └── publish.js              ← Serverless Function (côté serveur)
├── src/
│   └── components/
│       └── admin/
│           ├── PublishPanel.jsx    ← Bouton "Publier mon histoire"
│           └── PublishAnimation.jsx ← Animations d'état
├── public/
│   └── stories/
│       ├── index.json          ← Catalogue (mis à jour automatiquement)
│       └── {slug}.json         ← Histoires publiées
└── .env                        ← Variables locales (non commitées)
```

## 📞 Besoin d'aide ?

Si tu rencontres des problèmes, vérifie :
1. Les logs Vercel : Dashboard → Deployments → clique sur le déploiement → **View Logs**
2. La Console du navigateur (F12) pour les erreurs frontend
3. Les fichiers sur GitHub pour confirmer qu'ils ont été créés

---

**Dernière mise à jour** : 13/05/2026
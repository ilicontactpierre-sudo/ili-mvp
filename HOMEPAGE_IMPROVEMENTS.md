# Améliorations de la page d'accueil ILi

## Résumé des modifications

### 1. Ajout de la police Roboto (Google Fonts)
- **Fichier**: `index.html`
- Ajout des liens Google Fonts pour Roboto (weights: 300, 400, 700) dans le `<head>`

### 2. Mise à jour des variables CSS
- **Fichier**: `src/styles/global.css`
- Ajout de la variable `--font-logo: 'Roboto', sans-serif;`

### 3. Création du composant StoryMenu
- **Fichier**: `src/components/StoryMenu.jsx` (nouveau fichier)
- Composant réutilisable pour afficher la liste des histoires
- Props: `isOpen`, `stories`, `isLoading`, `onClose`
- Gestion des états: chargement (skeleton), vide, et liste des histoires
- Animations en cascade pour l'apparition des cartes
- Navigation vers `/lire/[story.id]` au clic
- Fermeture au clic en dehors

### 4. Refonte complète de HomePage
- **Fichier**: `src/pages/HomePage.jsx`
- État initial: logo "ILi" centré avec tagline "lecture immersive"
- État ouvert: logo déplacé en haut + liste des histoires
- Chargement automatique des histoires au montage via `/stories/index.json`
- Bascule entre les états au clic sur le logo

### 5. Styles CSS complets
- **Fichier**: `src/styles/global.css`
- Layout responsive (mobile-first)
- Animations fluides (transitions CSS, keyframes)
- Logo responsive: `clamp(72px, 15vw, 120px)` → `clamp(40px, 8vw, 64px)`
- Cartes d'histoires avec effets de survol
- Skeleton loading avec animation de pulsation
- Scrollbar masquée sur mobile

## Comportement de l'application

### État initial (logo seul)
- Logo "ILi" centré verticalement et horizontalement
- Police Roboto light (300), très grande taille
- Tagline "lecture immersive" discrète en dessous
- Effet de survol: opacité réduite à 0.7

### État ouvert (liste des histoires)
- Clic sur le logo → transition fluide de 400ms
- Logo se déplace vers le haut (15% de l'écran)
- Logo réduit en taille
- Tagline disparaît progressivement
- Liste des histoires apparaît en cascade (délai de 60ms entre chaque carte)
- Chaque carte: titre (Lora serif) + auteur (Roboto)
- Clic sur une histoire → navigation vers la page de lecture
- Clic sur le logo ou en dehors → retour à l'état initial

## Format des données

Le fichier `/public/stories/index.json` doit contenir un tableau d'objets:
```json
[
  {
    "id": "nom-du-fichier-sans-extension",
    "title": "Titre de l'histoire",
    "author": "Nom de l'auteur"
  }
]
```

## Technologies utilisées

- **React** avec hooks (useState, useEffect)
- **React Router DOM** pour la navigation
- **CSS pur** (aucune librairie d'animation externe)
- **Vite** pour le build

## Tests

L'application est testée et fonctionne correctement:
- Serveur de développement lancé sur `http://localhost:5173/`
- Chargement des histoires depuis `/stories/index.json`
- Animations fluides et responsive
- Navigation fonctionnelle vers les pages de lecture
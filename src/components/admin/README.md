# Interface d'Assignation Audio ILi

## Vue d'ensemble

Cette interface permet d'assigner des sons à des segments de texte dans une timeline audio, avec possibilité de chevauchement sur plusieurs segments et colonnes.

## Architecture

### Composants

1. **AudioTimeline.jsx** - Conteneur principal avec layout en 2 colonnes
   - Colonne gauche (~45%) : Liste des segments de texte
   - Colonne droite (~55%) : Timeline audio avec 6 colonnes

2. **SoundBlock.jsx** - Bloc sonore dans la timeline
   - Interactions : clic (sélection), drag (déplacement vertical), resize (étirement haut/bas), double-clic (panneau propriétés)
   - Couleur dynamique basée sur les catégories du son

3. **SoundBlockPanel.jsx** - Panneau flottant d'édition des propriétés
   - Modification : segments de début/fin, colonne, volume, fade in/out, delay, loop, muted
   - Suppression du son

4. **SoundLibraryPicker.jsx** - Sélecteur de sons
   - Recherche textuelle (label, tags, mood, id)
   - Filtres : catégories, ambiance (mood), intensité
   - Prévisualisation audio (extrait de 3 secondes)

5. **constants.js** - Configurations partagées
   - Couleurs par catégorie
   - Dimensions (SEGMENT_HEIGHT, COLUMN_WIDTH, etc.)
   - Fonctions utilitaires

### Modèle de données

**soundTracks[]** - Nouveau modèle au niveau de l'histoire :
```javascript
{
  id: string,              // Identifiant unique
  soundId: string,         // Référence au son dans la bibliothèque
  startSegmentId: string,  // Segment de début
  endSegmentId: string,    // Segment de fin (peut être identique à startSegmentId)
  column: number,          // Colonne (0 à 5)
  volume: number,          // Volume (0 à 1)
  fadeIn: number,          // Fondu d'entrée en secondes
  fadeOut: number,         // Fondu de sortie en secondes
  delay: number,           // Délai avant lecture en secondes
  loop: boolean,           // Lecture en boucle
  muted: boolean           // Son muet
}
```

**Couleurs par catégorie :**
- Ambiance : #7EC8C8 (turquoise)
- Musique : #B59FD8 (violet)
- SFX : #F0A87E (orange)
- Dialogue : #A8D4A8 (vert)
- Autre : #C8C8A8 (beige)

## Utilisation

### 1. Découper un texte
- Dans l'admin, coller un texte
- Ajuster la granularité (1-10)
- Cliquer sur "Découper le texte"

### 2. Ajouter des sons
- Une fois les segments créés, l'AudioTimeline apparaît
- Cliquer sur "+ Ajouter un son"
- Rechercher/filtrer dans la bibliothèque
- Cliquer sur "+ Ajouter" pour un son

### 3. Manipuler les blocs sonores
- **Sélectionner** : Clic gauche sur un bloc
- **Déplacer verticalement** (changer de colonne) : Clic + glisser vers le haut/bas
- **Étirer** (modifier durée) : Glisser les poignées haut/bas du bloc
- **Éditer les propriétés** : Double-clic sur un bloc
- **Supprimer** : Dans le panneau d'édition, bouton "Supprimer"

### 4. Ajuster les propriétés
Au double-clic, un panneau permet de modifier :
- Segments de début et de fin (sliders)
- Colonne (0-5)
- Volume (0-100%)
- Fade In (0-5s)
- Fade Out (0-5s)
- Délai (0-5s)
- Loop (booléen)
- Muted (booléen)

## Intégration avec AdminPage

L'AudioTimeline est intégrée dans AdminPage.jsx :
- State `soundTracks[]` géré au niveau de l'admin
- Synchronisation avec le système d'historique (undo/redo)
- Compatible avec l'ancien système `audioEvents[]` (affichage maintenu dans les SegmentCard)

## Conversion pour l'export

Pour exporter l'histoire avec les sons, utiliser la fonction `convertSoundTracksToAudioEvents()` depuis `constants.js` :

```javascript
import { convertSoundTracksToAudioEvents } from './components/admin/constants'

const audioEvents = convertSoundTracksToAudioEvents(soundTracks, segments)
```

Cette fonction convertit le nouveau format `soundTracks[]` en `audioEvents[]` pour compatibilité avec le lecteur existant.

## Notes techniques

- **Scroll synchronisé** : Les deux colonnes (segments et timeline) défilent ensemble
- **Hauteur des segments** : 40px par segment dans la timeline
- **6 colonnes** : Permettent le chevauchement de jusqu'à 6 sons simultanés
- **IDs uniques** : Générés avec timestamp + random string
- **Persistance** : Les soundTracks sont sauvegardés dans l'historique avec les segments

## Améliorations futures possibles

- [ ] Glisser-déposer depuis la bibliothèque vers la timeline
- [ ] Visualisation des formes d'onde
- [ ] Lecture en temps réel avec synchronisation
- [ ] Copier-coller de blocs sonores
- [ ] Raccourcis clavier pour les actions courantes
- [ ] Annulation spécifique aux soundTracks (indépendante des segments)
# Correction de l'écran noir lors du chargement d'une histoire publiée

## Problème

Quand un utilisateur publiait une histoire puis essayait de la recharger via "Charger une histoire existante", l'application affichait un écran noir.

## Cause racine

Le bug venait de la façon dont les segments étaient sérialisés lors de la publication :

1. **Format initial** : Quand on crée une histoire, l'algorithme `segmentText()` retourne des segments sous forme de **chaînes de caractères** (ex: `"La froideur de Mr. Edgar..."`)

2. **Publication buguée** : Dans `PublishPanel.jsx`, la fonction `convertSoundTracksToAudioEvents()` faisait :
   ```javascript
   const segmentsWithAudio = segments.map(seg => ({
     ...seg,  // ← Spread d'une string !
     audioEvents: []
   }))
   ```
   
   Quand on spread une string en JavaScript, on obtient un objet avec les indices des caractères :
   ```javascript
   {0: 'L', 1: 'a', 2: ' ', 3: 'f', ...}  // Pas de champ 'text' ni 'id' !
   ```

3. **Chargement qui plante** : Quand `StoryLoader` rechargeait cette histoire, les segments étaient des objets bizarres sans champ `text`. Dans `UnifiedSegmentsTimeline`, le code faisait :
   ```javascript
   const text = segment.text || segment  // text = l'objet entier
   const explicitLines = text.split('\n').length  // ← CRASH !
   ```
   
   Un objet n'a pas de méthode `.split()`, donc ça plantait avec une erreur JavaScript, causant l'écran noir.

## Solution

### 1. Correction de `PublishPanel.jsx` (prévention)

La fonction `convertSoundTracksToAudioEvents()` gère maintenant correctement les segments strings :

```javascript
const segmentsWithAudio = segments.map((seg, index) => {
  if (typeof seg === 'string') {
    return {
      id: `seg_${index}`,
      text: seg,
      audioEvents: []
    }
  }
  return {
    ...seg,
    audioEvents: seg.audioEvents || []
  }
})
```

### 2. Correction de `StoryLoader.jsx` (résilience)

Ajout d'une normalisation des segments pour gérer les anciens formats bugués :

```javascript
const normalizedSegments = (data.segments || []).map((seg, index) => {
  // Si le segment a déjà un champ text, on le garde
  if (seg && typeof seg.text === 'string') {
    return { id: seg.id || `seg_${index}`, text: seg.text, audioEvents: seg.audioEvents || [] }
  }
  
  // Si le segment est un objet avec des clés numériques (ancien format bugué)
  if (seg && typeof seg === 'object') {
    const numericKeys = Object.keys(seg).filter(key => String(Number(key)) === key)
    if (numericKeys.length > 0) {
      // Reconstruire le texte à partir des clés numériques
      const text = numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map(key => seg[key])
        .join('')
      return { id: seg.id || `seg_${index}`, text: text, audioEvents: seg.audioEvents || [] }
    }
  }
  
  return typeof seg === 'string' 
    ? { id: `seg_${index}`, text: seg, audioEvents: [] }
    : { id: `seg_${index}`, text: '', audioEvents: [] }
})
```

Cette normalisation est appliquée dans :
- `handleEdit()` - quand on clique sur "Modifier"
- `handlePreview()` - quand on clique sur "Aperçu"

## Fichiers modifiés

1. `src/components/admin/PublishPanel.jsx` - Ligne ~62
2. `src/components/admin/StoryLoader.jsx` - Lignes ~46-85 et ~119-140

## Testing

Pour tester la correction :
1. Créer une nouvelle histoire dans l'admin
2. La publier avec le bouton "Publier mon histoire"
3. Attendre la confirmation de publication
4. Cliquer sur "Charger une histoire existante"
5. Sélectionner l'histoire qu'on vient de publier
6. Cliquer sur "Modifier"

→ L'histoire devrait se charger correctement sans écran noir.

## Note sur le script de conversion

Le fichier `scripts/convert-stories.js` existait déjà pour convertir les anciens fichiers au format moderne. Notre correction dans `StoryLoader` utilise une logique similaire pour reconstruire le texte à partir des clés numériques, assurant la compatibilité avec les histoires publiées avant cette correction.
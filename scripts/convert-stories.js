/**
 * Script pour convertir les fichiers d'histoires du format ancien (clés numériques)
 * vers le format moderne (champ "text" explicite)
 * 
 * Utilisation: node scripts/convert-stories.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storiesDir = path.join(__dirname, '..', 'public', 'stories');

function convertSegment(segment) {
  // Si le segment a déjà un champ text, on le garde tel quel
  if (segment && typeof segment.text === 'string') {
    return segment;
  }
  
  // Si le segment a des clés numériques, on les convertit en texte
  if (segment && typeof segment === 'object') {
    const numericKeys = Object.keys(segment).filter(key => String(Number(key)) === key);
    if (numericKeys.length > 0) {
      // Trie les clés numériques et concatène les valeurs
      const text = numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map(key => segment[key])
        .join('');
      
      // Crée un nouveau segment avec le texte et préserve les autres propriétés
      const { audioEvents, id, ...rest } = segment;
      return {
        id: id ?? numericKeys[0],
        text,
        audioEvents: audioEvents || [],
        ...rest
      };
    }
  }
  
  // Retourne le segment tel quel s'il n'a pas de clés numériques
  return segment;
}

function convertStoryFile(filePath) {
  console.log(`Traitement de: ${path.basename(filePath)}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const story = JSON.parse(content);
    
    if (!story.segments || !Array.isArray(story.segments)) {
      console.log(`  ⚠️ Pas de segments trouvés, fichier ignoré`);
      return false;
    }
    
    const originalSegments = story.segments.length;
    let convertedCount = 0;
    
    // Convertit chaque segment
    story.segments = story.segments.map(segment => {
      const hasNumericKeys = segment && typeof segment === 'object' && 
        Object.keys(segment).some(key => String(Number(key)) === key) &&
        !segment.text;
      
      const converted = convertSegment(segment);
      if (hasNumericKeys && converted.text) {
        convertedCount++;
      }
      return converted;
    });
    
    if (convertedCount === 0) {
      console.log(`  ✓ Déjà au format moderne (${originalSegments} segments)`);
      return false;
    }
    
    // Écrit le fichier converti
    const newContent = JSON.stringify(story, null, 2);
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log(`  ✓ Converti avec succès: ${convertedCount}/${originalSegments} segments convertis`);
    return true;
  } catch (error) {
    console.error(`  ✗ Erreur lors du traitement: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🔄 Conversion des histoires vers le format moderne...\n');
  
  // Liste tous les fichiers JSON dans le dossier stories
  const files = fs.readdirSync(storiesDir)
    .filter(file => file.endsWith('.json') && file !== 'index.json')
    .map(file => path.join(storiesDir, file));
  
  if (files.length === 0) {
    console.log('Aucun fichier d\'histoire trouvé.');
    return;
  }
  
  let totalConverted = 0;
  let totalFiles = files.length;
  
  for (const file of files) {
    if (convertStoryFile(file)) {
      totalConverted++;
    }
  }
  
  console.log(`\n📊 Résumé:`);
  console.log(`  ${totalFiles} fichiers traités`);
  console.log(`  ${totalConverted} fichiers convertis`);
  console.log(`  ${totalFiles - totalConverted} fichiers déjà au format moderne`);
}

main();
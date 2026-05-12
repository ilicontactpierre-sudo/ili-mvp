#!/usr/bin/env node

/**
 * Script pour générer/mettre à jour l'index des fichiers sonores
 * 
 * Utilisation : node scripts/generateSoundsIndex.js
 * 
 * Comportement :
 * - Parcourt récursivement /public/sounds/
 * - Conserve les métadonnées existantes
 * - Ajoute les nouveaux sons avec valeurs par défaut
 * - Trie par catégories puis label
 * - Écrit dans /public/sounds/sounds-index.json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Pour __dirname en ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// === CONFIGURATION ===
const SOUNDS_DIR = path.join(__dirname, '..', 'public', 'sounds')
const INDEX_FILE = path.join(SOUNDS_DIR, 'sounds-index.json')

// === VALEURS PAR DÉFAUT POUR NOUVEAUX SONS ===
const DEFAULT_SOUND = {
  filename: '',
  label: '',
  categories: [],
  tags: [],
  mood: [],
  loop: false,
  duration: 0,
  intensity: 'moyenne',
  tempo: 'moyen'
}

/**
 * Génère un ID propre depuis un nom de fichier
 * Ex: "pluie_legere.mp3" → "pluie_legere"
 */
function generateId(filename) {
  return path.basename(filename, path.extname(filename))
}

/**
 * Génère un label lisible depuis un nom de fichier
 * Ex: "pluie_legere.mp3" → "Pluie legere"
 */
function generateLabel(filename) {
  const id = generateId(filename)
  return id
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Génère le chemin relatif depuis le dossier sounds
 * Ex: "ambiances/pluie_legere.mp3"
 */
function getRelativePath(filePath) {
  return path.relative(SOUNDS_DIR, filePath)
}

/**
 * Parcourt récursivement le dossier sounds et retourne les fichiers audio
 */
function findAudioFiles(dir, baseDir = dir) {
  const audioExtensions = ['.mp3', '.wav']
  const results = []

  if (!fs.existsSync(dir)) {
    console.log(`⚠️  Dossier "${dir}" non trouvé.`)
    return results
  }

  const items = fs.readdirSync(dir)

  for (const item of items) {
    // Ignorer le fichier d'index lui-même
    if (item === 'sounds-index.json') continue
    
    // Ignorer les fichiers .gitkeep
    if (item === '.gitkeep') continue
    
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // Récursivité pour les sous-dossiers
      results.push(...findAudioFiles(fullPath, baseDir))
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase()
      if (audioExtensions.includes(ext)) {
        results.push({
          fullPath,
          relativePath: getRelativePath(fullPath),
          id: generateId(item),
          label: generateLabel(item),
          filename: item
        })
      }
    }
  }

  return results
}

/**
 * Charge l'index existant ou retourne un tableau vide
 */
function loadExistingIndex() {
  if (!fs.existsSync(INDEX_FILE)) {
    return []
  }

  try {
    const content = fs.readFileSync(INDEX_FILE, 'utf8')
    return JSON.parse(content)
  } catch (err) {
    console.warn(`⚠️  Erreur lors de la lecture de l'index existant: ${err.message}`)
    return []
  }
}

/**
 * Sauvegarde l'index dans le fichier JSON
 */
function saveIndex(index) {
  const json = JSON.stringify(index, null, 2)
  fs.writeFileSync(INDEX_FILE, json, 'utf8')
}

/**
 * Trie les entrées par catégories puis par label
 */
function sortEntries(entries) {
  return entries.sort((a, b) => {
    // D'abord par première catégorie
    const catA = (a.categories && a.categories.length > 0) ? a.categories[0] : ''
    const catB = (b.categories && b.categories.length > 0) ? b.categories[0] : ''
    
    if (catA !== catB) {
      return catA.localeCompare(catB)
    }
    
    // Puis par label
    return (a.label || '').localeCompare(b.label || '')
  })
}

/**
 * Fonction principale
 */
function main() {
  console.log('🔍 Recherche des fichiers audio dans', SOUNDS_DIR)

  // 1. Trouver tous les fichiers audio
  const audioFiles = findAudioFiles(SOUNDS_DIR)
  const totalFound = audioFiles.length

  if (totalFound === 0) {
    console.log('📭 Aucun fichier audio trouvé.')
    // On sauvegarde quand même un index vide
    saveIndex([])
    return
  }

  // 2. Charger l'index existant
  const existingIndex = loadExistingIndex()
  console.log(`📚 Index existant: ${existingIndex.length} entrées`)

  // 3. Construire le nouvel index
  const newIndex = []
  let newCount = 0
  let existingCount = 0

  for (const file of audioFiles) {
    // Chercher si ce son existe déjà dans l'index (par ID)
    const existingEntry = existingIndex.find(entry => entry.id === file.id)

    if (existingEntry) {
      // CONSERVER les métadonnées existantes, mettre à jour seulement le filename
      const updatedEntry = {
        ...existingEntry,
        filename: file.filename,
        // S'assurer que le chemin relatif est à jour
        relativePath: file.relativePath
      }
      newIndex.push(updatedEntry)
      existingCount++
    } else {
      // NOUVEAU SON - créer une entrée avec valeurs par défaut
      const newEntry = {
        id: file.id,
        filename: file.filename,
        relativePath: file.relativePath,
        label: file.label,
        categories: DEFAULT_SOUND.categories,
        tags: DEFAULT_SOUND.tags,
        mood: DEFAULT_SOUND.mood,
        loop: DEFAULT_SOUND.loop,
        duration: DEFAULT_SOUND.duration,
        intensity: DEFAULT_SOUND.intensity,
        tempo: DEFAULT_SOUND.tempo
      }
      newIndex.push(newEntry)
      newCount++
    }
  }

  // 4. Trier les entrées
  const sortedIndex = sortEntries(newIndex)

  // 5. Sauvegarder
  saveIndex(sortedIndex)

  // 6. Afficher le résumé
  console.log('')
  console.log('✅ Index généré avec succès !')
  console.log(`📊 ${totalFound} sons trouvés — ${newCount} nouveaux ajoutés — ${existingCount} existants conservés`)
  console.log(`📁 Fichier sauvegardé: ${INDEX_FILE}`)
}

// === EXÉCUTION ===
main()
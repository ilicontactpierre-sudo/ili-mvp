#!/usr/bin/env node

/**
 * Script interactif pour ajouter de nouveaux sons à la bibliothèque ILi
 * 
 * Utilisation : npm run add-sound
 * 
 * Dépendances : readline, child_process, path, fs (modules natifs uniquement)
 */

import readline from 'readline'
import { exec, execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

// Pour __dirname en ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// === CONFIGURATION ===
const SOUNDS_DIR = path.join(__dirname, '..', 'public', 'sounds')
const INDEX_FILE = path.join(SOUNDS_DIR, 'sounds-index.json')

// === UTILITAIRES ===

/**
 * Ouvre un dossier dans l'explorateur de fichiers selon l'OS
 */
function openFolder(folderPath) {
  const platform = process.platform
  let command

  switch (platform) {
    case 'darwin': // macOS
      command = `open "${folderPath}"`
      break
    case 'win32': // Windows
      command = `explorer "${folderPath}"`
      break
    case 'linux': // Linux
      command = `xdg-open "${folderPath}"`
      break
    default:
      console.log(`⚠️  OS non supporté (${platform}). Ouvre manuellement le dossier : ${folderPath}`)
      return
  }

  exec(command, (err) => {
    if (err) {
      console.log(`⚠️  Erreur ouverture dossier: ${err.message}`)
    }
  })
}

/**
 * Ouvre un fichier dans VSCode
 */
function openInVSCode(filePath) {
  const command = `code "${filePath}"`
  exec(command, (err) => {
    if (err) {
      console.log(`⚠️  Erreur ouverture VSCode: ${err.message}`)
      console.log(`   Ouvre manuellement : ${filePath}`)
    }
  })
}

/**
 * Normalise une réponse y/n
 * Retourne true si la réponse est y, Y, yes, YES, etc.
 */
function isYes(answer) {
  const normalized = (answer || '').trim().toLowerCase()
  return ['y', 'yes', 'oui', 'o'].includes(normalized)
}

/**
 * Exécute une commande avec affichage en temps réel
 */
function runCommand(command, errorMessage) {
  try {
    execSync(command, { stdio: 'inherit' })
    return true
  } catch (err) {
    console.error(`❌ Erreur: ${errorMessage || err.message}`)
    return false
  }
}

// === CRÉATION DE L'INTERFACE READLINE ===
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
 * Pose une question et retourne une Promise avec la réponse
 */
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer)
    })
  })
}

// === FONCTION PRINCIPALE ===
async function main() {
  console.log('\n🎵 ILi — Ajout de sons\n')

  // 1. Ouvrir le dossier sons
  console.log('📁 Ouverture du dossier sons...')
  openFolder(SOUNDS_DIR)
  console.log('   Glisse tes nouveaux fichiers dans le bon sous-dossier.')
  console.log('   (ambiances / musiques / sfx / ...)\n')

  // Attendre un peu que le dossier s'ouvre
  await new Promise(resolve => setTimeout(resolve, 1000))

  // 2. Mettre à jour l'index
  const updateIndex = await question('📋 Mettre à jour l\'index des sons ? (y/n) : ')
  if (isYes(updateIndex)) {
    console.log('')
    const indexScript = path.join(__dirname, 'generateSoundsIndex.js')
    const success = runCommand(
      `node "${indexScript}"`,
      'Erreur lors de la génération de l\'index'
    )
    if (!success) {
      console.log('   Vérifie que le script generateSoundsIndex.js existe.')
    }
  } else {
    console.log('   Index non modifié.')
  }

  console.log('')

  // 3. Ouvrir l'index pour édition
  const openIndex = await question('📝 Ouvrir sounds-index.json pour compléter les tags ? (y/n) : ')
  if (isYes(openIndex)) {
    console.log('')
    openInVSCode(INDEX_FILE)
    console.log('   Complète les champs vides des nouvelles entrées.')
    console.log('   (tags, mood, loop, intensity, tempo)\n')
  } else {
    console.log('')
  }

  // 4. Déployer sur Vercel (seulement si un dépôt distant est configuré)
  let hasRemote = false
  try {
    execSync('git remote -v', { stdio: 'ignore' })
    hasRemote = true
  } catch {
    console.log('⚠️  Aucun dépôt Git distant configuré.')
    console.log('   Pour déployer sur Vercel, configure d\'abord un remote (GitHub/GitLab).')
    console.log('   Exemple : git remote add origin https://github.com/ton-user/ton-repo.git\n')
  }

  const deploy = hasRemote ? await question('🚀 Déployer sur Vercel maintenant ? (y/n) : ') : null
  if (isYes(deploy)) {
    console.log('')
    
    // git add
    const addOk = runCommand('git add .', 'Erreur lors du git add')
    
    if (addOk) {
      // git commit
      const commitOk = runCommand(
        'git commit -m "add: nouveaux sons bibliothèque"',
        'Erreur lors du git commit'
      )
      
      if (commitOk) {
        // git push
        const pushOk = runCommand('git push', 'Erreur lors du git push')
        
        if (pushOk) {
          console.log('✅ Sons déployés — Vercel redéploie automatiquement !\n')
        } else {
          console.log('   Le push a échoué. Vérifie ta connexion ou tes permissions.')
        }
      } else {
        console.log('   Le commit a échoué. Tu peux réessayer manuellement.')
      }
    } else {
      console.log('   Le add a échoué. Tu peux réessayer manuellement.')
    }
    
    // Si une étape a échoué, afficher une aide
    console.log('   Lance manuellement : git add . && git commit -m \'add: sons\' && git push\n')
  } else {
    console.log('⏸  Pense à git push quand tu seras prêt.\n')
  }

  // 5. Fermeture propre
  rl.close()
  process.exit(0)
}

// === EXÉCUTION ===
main()
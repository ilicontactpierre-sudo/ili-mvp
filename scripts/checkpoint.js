#!/usr/bin/env node

import { execSync } from 'node:child_process'
import readline from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sanitizeLabel(label) {
  return label
    .trim()
    .replace(/[<>:"\\/\|\?\*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_.]/g, '-')
    .replace(/\-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .toLowerCase()
}

function run(command) {
  return execSync(command, { stdio: 'inherit' })
}

function runOutput(command) {
  return execSync(command, { encoding: 'utf8' }).trim()
}

function isWorkingTreeClean() {
  return runOutput('git status --porcelain') === ''
}

function getBranchSyncStatus(branch) {
  const remoteRef = `origin/${branch}`
  const remoteExists = runOutput(`git ls-remote --heads origin ${branch}`) !== ''
  if (!remoteExists) {
    return { ahead: 0, behind: 0, remoteExists: false }
  }

  const result = runOutput(`git rev-list --left-right --count ${remoteRef}...${branch}`)
  const [behind, ahead] = result.split(/\s+/).map(Number)
  return { ahead, behind, remoteExists: true }
}

const rl = readline.createInterface({ input, output })

const currentBranch = runOutput('git branch --show-current')
if (!currentBranch) {
  console.error('Impossible de détecter la branche courante. Assurez-vous d’être sur une branche locale.')
  process.exit(1)
}

const today = formatDate(new Date())
const prefix = `ili-checkpoint-${today}`

rl.question(`Nom du checkpoint (sans le préfixe '${prefix}-') : `, (answer) => {
  rl.close()

  const label = sanitizeLabel(answer)
  if (!label) {
    console.error('Nom invalide. Le checkpoint doit contenir du texte après le préfixe.')
    process.exit(1)
  }

  const tagName = `${prefix}-${label}`
  const commitMessage = `checkpoint: ${label}`
  const tagMessage = `ILi checkpoint: ${tagName}`

  try {
    console.log('\nÉtape 0/5 : synchronisation avec origin')
    if (!isWorkingTreeClean()) {
      console.error('Le répertoire de travail n\'est pas propre. Merci de committer ou stash vos changements avant de créer un checkpoint.')
      process.exit(1)
    }

    run('git fetch origin')
    const status = getBranchSyncStatus(currentBranch)

    if (status.remoteExists && status.behind > 0) {
      if (status.ahead > 0) {
        console.error('La branche locale a divergé de origin/' + currentBranch + '. Résous d\'abord le conflit puis relance checkpoint.')
        process.exit(1)
      }
      console.log(`La branche locale est en retard de ${status.behind} commit(s). Fast-forward depuis origin/${currentBranch}...`)
      run(`git merge --ff-only origin/${currentBranch}`)
    }

    console.log('\nÉtape 1/5 : ajout des changements')
    run('git add .')

    console.log('\nÉtape 2/5 : création du commit')
    try {
      run(`git commit -m "${commitMessage}"`)
    } catch (error) {
      console.log('Aucun changement à valider ou commit déjà existant. Poursuite...')
    }

    console.log(`\nÉtape 3/5 : création du tag ${tagName}`)
    run(`git tag -a ${tagName} -m "${tagMessage}"`)

    console.log('\nÉtape 4/5 : push de la branche vers origin')
    run(`git push origin ${currentBranch}`)

    console.log('\nÉtape 5/5 : push du tag vers origin')
    run(`git push origin ${tagName}`)

    console.log(`\nCheckpoint créé avec succès : ${tagName}`)
  } catch (err) {
    console.error('\nErreur lors de la création du checkpoint :')
    if (err.message) {
      console.error(err.message)
    }
    process.exit(1)
  }
})

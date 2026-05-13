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

const rl = readline.createInterface({ input, output })

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
    console.log('\nÉtape 1/4 : ajout des changements')
    run('git add .')

    console.log('\nÉtape 2/4 : création du commit')
    try {
      run(`git commit -m "${commitMessage}"`)
    } catch (error) {
      console.log('Aucun changement à valider ou commit déjà existant. Poursuite...')
    }

    console.log(`\nÉtape 3/4 : création du tag ${tagName}`)
    run(`git tag -a ${tagName} -m "${tagMessage}"`)

    console.log('\nÉtape 4/4 : push vers origin')
    run('git push origin HEAD')
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

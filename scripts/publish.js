#!/usr/bin/env node
// Publication sûre (remplace `bash publish.sh`).
//
// Usage :
//   npm run publish                              publie (rapport, tests, build, confirmation)
//   npm run publish -- "message de commit"       avec un message de commit
//   npm run publish -- --dry-run                 montre tout, n'envoie rien
//   npm run publish -- --skip-checks             saute tests et build (choix volontaire)
//
// Voir scripts/lib/safePublish.js pour les règles de sécurité.
import { prepare, commitAndPush, defaultCommitMessage } from './lib/safePublish.js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipChecks = args.includes('--skip-checks')
const message = args.find((a) => !a.startsWith('--')) || defaultCommitMessage()

const gate = await prepare({ title: 'Publication', dryRun, skipChecks })

if (gate.status === 'confirmed') {
  try {
    commitAndPush({ message, report: gate.report })
    console.log('')
    console.log(`✅ Branche « ${gate.report.branch} » envoyée sur GitHub.`)
    console.log('⏱️  Vercel redéploie en 1 à 2 minutes : https://vercel.com/dashboard')
    console.log('🌍 https://ili-mvp.vercel.app')
  } catch (e) {
    console.error('')
    console.error(`❌ ${e.message}`)
    process.exitCode = 1
  }
} else {
  process.exitCode = gate.status === 'nothing' || gate.status === 'dry-run' ? 0 : 1
}

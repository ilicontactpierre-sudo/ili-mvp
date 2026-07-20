#!/usr/bin/env node
// ═════════════════════════════════════════════════════════════════════════
// scripts/check-soundq-coverage.cjs
//
// Croise public/sounds/soundq-keywords.json (généré par import-soundq-keywords)
// avec public/sounds/sounds-index.json (ta bibliothèque RÉELLEMENT utilisée
// dans l'app) pour savoir combien de tes sons ont vraiment une correspondance.
//
// USAGE :
//   node scripts/check-soundq-coverage.cjs
// ═════════════════════════════════════════════════════════════════════════

const fs = require('fs')
const path = require('path')

const SOUNDS_INDEX_PATH = path.join(__dirname, '..', 'public', 'sounds', 'sounds-index.json')
const SOUNDQ_PATH = path.join(__dirname, '..', 'public', 'sounds', 'soundq-keywords.json')

function normalizeFilename(name) {
  if (!name) return ''
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const soundsIndex = JSON.parse(fs.readFileSync(SOUNDS_INDEX_PATH, 'utf8'))
const soundq = JSON.parse(fs.readFileSync(SOUNDQ_PATH, 'utf8'))

let matched = 0
let unmatched = 0
const unmatchedSamples = []

soundsIndex.forEach(sound => {
  // On tente plusieurs candidats : filename, id, label — selon ce qui est
  // renseigné dans ton sounds-index.json actuel.
  const candidates = [sound.filename, sound.id, sound.label]
    .filter(Boolean)
    .map(normalizeFilename)

  const hit = candidates.some(c => soundq[c])
  if (hit) {
    matched++
  } else {
    unmatched++
    if (unmatchedSamples.length < 15) {
      unmatchedSamples.push(sound.filename || sound.id || sound.label)
    }
  }
})

console.log('═══════════════════════════════════════════')
console.log(`Sons dans sounds-index.json  : ${soundsIndex.length}`)
console.log(`→ avec correspondance SoundQ : ${matched} (${((matched / soundsIndex.length) * 100).toFixed(1)}%)`)
console.log(`→ SANS correspondance        : ${unmatched} (${((unmatched / soundsIndex.length) * 100).toFixed(1)}%)`)
console.log('═══════════════════════════════════════════')
if (unmatchedSamples.length > 0) {
  console.log('')
  console.log('Exemples de sons NON matchés (pour comprendre pourquoi) :')
  unmatchedSamples.forEach(s => console.log(`  - ${s}`))
}

#!/usr/bin/env node
// ═════════════════════════════════════════════════════════════════════════
// scripts/debug-key-mismatch.cjs
//
// Pour un fichier donné, affiche CÔTE À CÔTE :
//  - ses valeurs brutes filename/id/label dans sounds-index.json
//  - la clé normalisée qu'on en déduit
//  - si cette clé existe dans soundq-keywords.json
//  - les clés les PLUS PROCHES dans soundq-keywords.json (par sous-chaîne)
// Sert à comprendre pourquoi un fichier reste "non matché" alors que ses
// mots-clés SoundQ semblent pourtant exister.
//
// USAGE :
//   node scripts/debug-key-mismatch.cjs "coyote howl bark"
// ═════════════════════════════════════════════════════════════════════════

const fs = require('fs')
const path = require('path')

const SOUNDS_INDEX_PATH = path.join(__dirname, '..', 'public', 'sounds', 'sounds-index.json')
const SOUNDQ_PATH = path.join(__dirname, '..', 'public', 'sounds', 'soundq-keywords.json')

const searchTerm = (process.argv[2] || '').toLowerCase()
if (!searchTerm) {
  console.error('Usage: node debug-key-mismatch.cjs "texte à chercher"')
  process.exit(1)
}

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
const soundqKeys = Object.keys(soundq)

const matches = soundsIndex.filter(s =>
  (s.filename || '').toLowerCase().includes(searchTerm) ||
  (s.id || '').toLowerCase().includes(searchTerm) ||
  (s.label || '').toLowerCase().includes(searchTerm)
)

if (matches.length === 0) {
  console.log(`Aucune entrée dans sounds-index.json ne contient "${searchTerm}".`)
  process.exit(0)
}

matches.slice(0, 5).forEach(sound => {
  console.log('───────────────────────────────────────────')
  console.log('filename (brut) :', JSON.stringify(sound.filename ?? null))
  console.log('id (brut)       :', JSON.stringify(sound.id ?? null))
  console.log('label (brut)    :', JSON.stringify(sound.label ?? null))

  const candidates = [sound.filename, sound.id, sound.label].filter(Boolean)
  candidates.forEach(c => {
    const key = normalizeFilename(c)
    const exists = !!soundq[key]
    console.log(`  → clé depuis "${c}" : "${key}"  ${exists ? '✓ TROUVÉE dans soundq-keywords.json' : '✗ absente'}`)
  })

  const roughKey = normalizeFilename(sound.filename || sound.id || sound.label || '')
  const keyWords = roughKey.split(' ').filter(w => w.length > 3)
  const nearMatches = soundqKeys
    .filter(k => keyWords.some(w => k.includes(w)))
    .slice(0, 5)
  if (nearMatches.length > 0) {
    console.log('  Clés proches trouvées dans soundq-keywords.json :')
    nearMatches.forEach(k => console.log(`    - "${k}"`))
  } else {
    console.log('  Aucune clé proche trouvée du tout dans soundq-keywords.json (fichier probablement absent du CSV).')
  }
})
console.log('───────────────────────────────────────────')

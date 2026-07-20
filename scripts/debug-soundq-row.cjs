#!/usr/bin/env node
// ═════════════════════════════════════════════════════════════════════════
// scripts/debug-soundq-row.cjs
//
// Cherche dans le CSV brut SoundQ une ou plusieurs lignes dont le "File Name"
// contient un texte donné, et affiche leurs champs utiles (Description,
// Category, Subcategory, Keywords, Library) SANS le bruit iXML/bwav.
// Sert à comprendre pourquoi un fichier précis n'a pas été repris dans
// soundq-keywords.json : donnée absente, ou format de Description différent
// de celui de BOOM Library ?
//
// USAGE :
//   node scripts/debug-soundq-row.cjs /chemin/vers/SoundQLocalExport.csv "P-51 Mustang"
// ═════════════════════════════════════════════════════════════════════════

const fs = require('fs')
const { parse } = require('csv-parse')

const csvPath = process.argv[2]
const searchTerm = (process.argv[3] || '').toLowerCase()

if (!csvPath || !searchTerm) {
  console.error('Usage: node debug-soundq-row.cjs /chemin/vers/export.csv "texte à chercher dans File Name"')
  process.exit(1)
}

let found = 0
const MAX_RESULTS = 8

const parser = fs
  .createReadStream(csvPath)
  .pipe(parse({ columns: true, relax_column_count: true, skip_empty_lines: true, bom: true }))

parser.on('data', (row) => {
  if (found >= MAX_RESULTS) return
  const fileName = row['File Name'] || ''
  if (!fileName.toLowerCase().includes(searchTerm)) return

  found++
  console.log('───────────────────────────────────────────')
  console.log('File Name    :', fileName)
  console.log('Description  :', JSON.stringify(row['Description'] || '(vide)'))
  console.log('Category     :', row['Category'] || '(vide)')
  console.log('Subcategory  :', row['Subcategory'] || '(vide)')
  console.log('Keywords     :', row['Keywords'] || '(vide)')
  console.log('Library      :', row['Library'] || '(vide)')
})

parser.on('end', () => {
  if (found === 0) {
    console.log(`Aucune ligne trouvée contenant "${searchTerm}" dans File Name.`)
    console.log('→ Ce fichier n\'était probablement pas dans cet export CSV du tout.')
  } else {
    console.log('───────────────────────────────────────────')
    console.log(`${found} résultat(s) affiché(s) (max ${MAX_RESULTS}).`)
  }
})

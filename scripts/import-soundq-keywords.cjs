#!/usr/bin/env node
// ═════════════════════════════════════════════════════════════════════════
// scripts/import-soundq-keywords.js
//
// Lit l'export CSV "All Columns" de SoundQ (potentiellement énorme, ex: 319Mo)
// EN FLUX (jamais chargé entièrement en mémoire) et produit un fichier
// compact `public/sounds/soundq-keywords.json` qui associe chaque son de
// ta bibliothèque à ses mots-clés SoundQ, en jetant tout le bruit (iXML,
// BWF, etc.) qui fait la taille du CSV d'origine.
//
// USAGE :
//   npm install csv-parse --save-dev   (une seule fois)
//   node scripts/import-soundq-keywords.js /chemin/vers/SoundQLocalExport.csv
//
// SORTIE :
//   public/sounds/soundq-keywords.json
//   { "<filename normalisé>": { keywords: [...], category, subcategory, library } }
// ═════════════════════════════════════════════════════════════════════════

const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse')

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node import-soundq-keywords.js /chemin/vers/SoundQLocalExport.csv')
  process.exit(1)
}
if (!fs.existsSync(csvPath)) {
  console.error(`Fichier introuvable : ${csvPath}`)
  process.exit(1)
}

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'sounds', 'soundq-keywords.json')

// ── Normalisation du nom de fichier — DOIT rester cohérente avec la façon
// dont sounds-index.json identifie déjà tes sons (filename sans extension,
// minuscule, séparateurs uniformisés).
function normalizeFilename(name) {
  if (!name) return ''
  return name
    .replace(/\.[^.]+$/, '')          // retire l'extension
    .replace(/[_\-]+/g, ' ')          // uniformise séparateurs
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// ── Extraction des mots-clés depuis le champ Description.
// Format observé chez BOOM Library : "Phrase descriptive. Mot, Mot, Mot, Mot."
// → on garde le DERNIER segment (après le dernier point), s'il contient
// des virgules — c'est la liste de mots-clés, pas une phrase.
function extractKeywordsFromDescription(desc) {
  if (!desc) return []
  // Découpe en "phrases" — un point ne marque une fin de phrase que s'il est
  // suivi d'un espace ou de la fin du texte, pour ne jamais couper un nombre
  // décimal du type "27.0L" en "27" + "0L".
  const sentences = desc.split(/\.(?=\s|$)/).map(s => s.trim()).filter(Boolean)
  const keywords = new Set()
  for (const sentence of sentences) {
    // BOOM met tous ses mots-clés dans la DERNIÈRE phrase ; PSE/SoundQ les
    // étale sur PLUSIEURS phrases courtes. On traite donc chaque phrase,
    // et chaque phrase peut elle-même contenir plusieurs mots-clés
    // séparés par des virgules.
    const fragments = sentence.split(',').map(f => f.trim()).filter(Boolean)
    for (const frag of fragments) {
      const clean = frag.toLowerCase()
      if (clean.length < 2) continue
      // Ignore les fragments purement numériques/techniques (années,
      // cotes type "27.0l", numéros de prise "01") — pas des mots-clés
      // de recherche utiles.
      if (/^\d+(\.\d+)?[a-z]?$/.test(clean)) continue
      // Au-delà de ~5 mots, c'est une phrase descriptive, pas un mot-clé
      // exploitable pour un matching de recherche.
      if (clean.split(/\s+/).length > 5) continue
      // Ignore les specs techniques de fichier audio ("16bit 44100khz",
      // "24bit 96000hz"...) — pas des mots-clés de contenu sonore.
      if (/\d+\s*bit\b|\d+\s*k?hz\b/i.test(clean)) continue
      keywords.add(clean)
    }
  }
  return [...keywords]
}

// ── Traitement du flux ──────────────────────────────────────────────────
const result = {}
let rowCount = 0
let matchedCount = 0
let emptyCount = 0
// Compteur global de fréquence — utile plus tard pour générer
// automatiquement un vocabulaire curé à partir des mots-clés réellement
// présents dans ta bibliothèque (voir étape suivante).
const keywordFrequency = {}

const parser = fs
  .createReadStream(csvPath)
  .pipe(parse({
    columns: true,       // utilise la 1ère ligne comme noms de colonnes
    relax_column_count: true,  // tolère les colonnes en trop (trailing tabs vus dans ton export)
    skip_empty_lines: true,
    bom: true,
  }))

parser.on('data', (row) => {
  rowCount++
  if (rowCount % 50000 === 0) {
    console.log(`… ${rowCount.toLocaleString()} lignes traitées, ${matchedCount.toLocaleString()} avec mots-clés`)
  }

  const fileName = row['File Name'] || row['Original Filename'] || ''
  if (!fileName) return

  const keywordsFromDesc = extractKeywordsFromDescription(row['Description'])
  const category = (row['Category'] || '').trim()
  const subcategory = (row['Subcategory'] || '').trim()

  // Ajoute Category/Subcategory comme mots-clés supplémentaires (en minuscule,
  // en mots simples) si présents — ils viennent souvent enrichir la Description.
  const extra = []
  if (category) extra.push(category.toLowerCase())
  if (subcategory) extra.push(subcategory.toLowerCase())

  const allKeywords = [...new Set([...keywordsFromDesc, ...extra])].filter(Boolean)

  if (allKeywords.length === 0) {
    emptyCount++
    return // rien d'utile pour ce fichier — on ne pollue pas le JSON
  }

  const key = normalizeFilename(fileName)
  if (!key) return

  allKeywords.forEach(k => {
    keywordFrequency[k] = (keywordFrequency[k] || 0) + 1
  })

  result[key] = {
    keywords: allKeywords,
    category: category || null,
    subcategory: subcategory || null,
    library: (row['Library'] || '').trim() || null,
  }
  matchedCount++
})

parser.on('error', (err) => {
  console.error('Erreur de parsing CSV :', err.message)
  process.exit(1)
})

parser.on('end', () => {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 0))

  // Top mots-clés — pour t'aider à juger de la richesse réelle du corpus
  const topKeywords = Object.entries(keywordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)

  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log(`Lignes CSV traitées      : ${rowCount.toLocaleString()}`)
  console.log(`Fichiers avec mots-clés  : ${matchedCount.toLocaleString()}`)
  console.log(`Fichiers sans métadonnée : ${emptyCount.toLocaleString()}`)
  console.log(`Mots-clés uniques        : ${Object.keys(keywordFrequency).length}`)
  console.log(`Écrit dans               : ${OUTPUT_PATH}`)
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('Top 40 mots-clés les plus fréquents (pour vérifier la qualité) :')
  topKeywords.forEach(([k, count]) => console.log(`  ${count.toString().padStart(6)}  ${k}`))
})
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
const SOUNDS_INDEX_PATH = path.join(__dirname, '..', 'public', 'sounds', 'sounds-index.json')

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
// Mots vides à ignorer dans le filet de sécurité "sac de mots" — grammaire
// anglaise de base + quelques mots de remplissage récurrents dans les
// descriptions SoundQ (consignes techniques, pas du contenu sonore).
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'from', 'with', 'for', 'to', 'and', 'or',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'this', 'that',
  'these', 'those', 'as', 'by', 'into', 'onto', 'than', 'then', 'there', 'here',
  'use', 'used', 'using', 'applied', 'nr', 'db', 'level', 'levels', 'recorded',
  'recording', 'take', 'very', 'quite', 'slightly', 'moderately', 'ends', 'derivative',
])

// Filet de sécurité : quand aucune structure exploitable (tirets, virgules)
// n'a été trouvée dans la description, on extrait quand même les mots
// individuels significatifs plutôt que de perdre le fichier entièrement.
// Moins précis qu'une vraie liste de tags, mais bien mieux que rien.
function extractLooseKeywords(text) {
  const words = text
    .toLowerCase()
    .replace(/[.,;:()'"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const kept = []
  const seen = new Set()
  for (const w of words) {
    if (w.length < 3) continue
    if (STOPWORDS.has(w)) continue
    if (/^\d+$/.test(w)) continue
    if (/^\d+bit$|^\d+k?hz$/.test(w)) continue
    if (seen.has(w)) continue
    seen.add(w)
    kept.push(w)
    if (kept.length >= 12) break
  }
  return kept
}

function extractKeywordsFromDescription(desc) {
  if (!desc) return []
  const trimmed = desc.trim()

  // FORMAT "tags à tirets" — souvent en MAJUSCULES : "BLEAT - RATTLE - LARGE - LONG - SOFT - MID"
  // Le tiret est entouré d'espaces des deux côtés, ce qui le distingue sans
  // ambiguïté d'un tiret de mot composé comme "Rolls-Royce" (jamais espacé).
  const dashParts = trimmed.split(/\s+-\s+/).map(p => p.trim()).filter(Boolean)
  if (dashParts.length >= 3 && dashParts.every(p => p.split(/\s+/).length <= 3)) {
    return [...new Set(
      dashParts
        .map(p => p.toLowerCase())
        .filter(k => k.length > 1 && !/^\d+$/.test(k))
    )]
  }

  // FORMAT "phrases + virgules" (BOOM, PSE/SoundQ) — un point ne marque une
  // fin de phrase que s'il est suivi d'un espace ou de la fin du texte, pour
  // ne jamais couper un nombre décimal du type "27.0L" en "27" + "0L".
  const sentences = trimmed.split(/\.(?=\s|$)/).map(s => s.trim()).filter(Boolean)
  const keywords = new Set()
  for (const sentence of sentences) {
    const fragments = sentence.split(',').map(f => f.trim()).filter(Boolean)
    for (const frag of fragments) {
      const clean = frag.toLowerCase()
      if (clean.length < 2) continue
      if (/^\d+(\.\d+)?[a-z]?$/.test(clean)) continue
      // Specs techniques de fichier audio ("16bit 44100khz"...) — pas des
      // mots-clés de contenu sonore.
      if (/\d+\s*bit\b|\d+\s*k?hz\b/i.test(clean)) continue
      if (clean.split(/\s+/).length > 5) continue
      keywords.add(clean)
    }
  }
  if (keywords.size > 0) return [...keywords]
  // Rien d'exploitable en structuré (prose libre, sans virgules ni tirets,
  // phrases trop longues) — filet de sécurité en sac de mots plutôt que de
  // perdre le fichier entièrement.
  return extractLooseKeywords(trimmed)
}

// ── Bibliothèque réelle de l'app — sert de filtre : inutile d'écrire des
// mots-clés pour des fichiers qui ne sont même pas dans sounds-index.json,
// ça alourdirait le fichier de sortie pour rien.
function normalizeFilenameForFilter(name) {
  if (!name) return ''
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}
const soundsIndex = JSON.parse(fs.readFileSync(SOUNDS_INDEX_PATH, 'utf8'))
const validKeys = new Set()
soundsIndex.forEach(s => {
  ;[s.filename, s.id, s.label].filter(Boolean).forEach(v => {
    validKeys.add(normalizeFilenameForFilter(v))
  })
})
console.log(`${validKeys.size} clés valides chargées depuis sounds-index.json (filtre de sortie).`)

// ── Traitement du flux ──────────────────────────────────────────────────
const result = {}
let rowCount = 0
let matchedCount = 0
let emptyCount = 0
let filteredOutCount = 0
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

  // Ne pas écrire un fichier qui n'existe pas dans la bibliothèque actuelle
  // de l'app — évite de gonfler le JSON de sortie avec des entrées mortes.
  if (!validKeys.has(key)) {
    filteredOutCount++
    return
  }

  allKeywords.forEach(k => {
    keywordFrequency[k] = (keywordFrequency[k] || 0) + 1
  })

  // Format plat : juste le tableau de mots-clés, sans enveloppe — category/
  // subcategory/library ne sont utilisés nulle part dans l'app actuellement.
  result[key] = allKeywords
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
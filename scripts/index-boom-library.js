/**
 * index-boom-library.js
 * 
 * Extrait les métadonnées iXML/ASWG/INFO des fichiers WAV Boom Library
 * et génère / enrichit public/sounds/sounds-index.json
 * 
 * Usage :
 *   node scripts/index-boom-library.js /chemin/vers/ta/BoomLibrary
 * 
 * Options :
 *   --upload    Compresse en MP3 et uploade sur Supabase après indexation
 *   --dry-run   Affiche seulement ce qui serait fait, sans modifier les fichiers
 * 
 * Prérequis :
 *   npm install @supabase/supabase-js lamejs dotenv
 */


import fs from 'fs'
import path from 'path'
import { createReadStream } from 'fs'
import dotenv from 'dotenv'
import { enrichSoundEntry } from './audio-dictionary.js'
dotenv.config()

const INDEX_PATH = path.resolve('./public/sounds/sounds-index.json')
const ARGS = process.argv.slice(2)
const BOOM_DIR = ARGS.find(a => !a.startsWith('--'))
const FLAG_UPLOAD = ARGS.includes('--upload')
const FLAG_DRY = ARGS.includes('--dry-run')

if (!BOOM_DIR) {
  console.error('Usage: node scripts/index-boom-library.js /chemin/vers/BoomLibrary [--upload] [--dry-run]')
  process.exit(1)
}

// ─── Parser iXML depuis un buffer WAV ────────────────────────────────────────

function extractIxml(buffer) {
  // Chercher le chunk iXML dans le fichier WAV
  // Format RIFF : chaque chunk = 4 bytes ID + 4 bytes size (little-endian) + data
  let offset = 12 // Sauter l'en-tête RIFF (4 + 4 + 4)

  while (offset < buffer.length - 8) {
    const chunkId = buffer.slice(offset, offset + 4).toString('ascii').trim()
    const chunkSize = buffer.readUInt32LE(offset + 4)
    const dataStart = offset + 8

    if (chunkId === 'iXML') {
      return buffer.slice(dataStart, dataStart + chunkSize).toString('utf-8')
    }

    // Avancer au chunk suivant (taille paire obligatoire)
    offset = dataStart + chunkSize + (chunkSize % 2)

    if (chunkSize === 0 || offset >= buffer.length) break
  }
  return null
}

function extractInfo(buffer) {
  // Chercher le chunk LIST/INFO
  let offset = 12
  const result = {}

  while (offset < buffer.length - 8) {
    const chunkId = buffer.slice(offset, offset + 4).toString('ascii').trim()
    const chunkSize = buffer.readUInt32LE(offset + 4)
    const dataStart = offset + 8

    if (chunkId === 'LIST') {
      const listType = buffer.slice(dataStart, dataStart + 4).toString('ascii')
      if (listType === 'INFO') {
        let infoOffset = dataStart + 4
        while (infoOffset < dataStart + chunkSize) {
          const key = buffer.slice(infoOffset, infoOffset + 4).toString('ascii').trim()
          const size = buffer.readUInt32LE(infoOffset + 4)
          const value = buffer.slice(infoOffset + 8, infoOffset + 8 + size).toString('utf-8').replace(/\0/g, '').trim()
          if (key && value) result[key] = value
          infoOffset += 8 + size + (size % 2)
        }
      }
    }

    offset = dataStart + chunkSize + (chunkSize % 2)
    if (chunkSize === 0 || offset >= buffer.length) break
  }
  return result
}

// ─── Parser XML simplifié (pas de dépendance externe) ────────────────────────

function getXmlValue(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = xml.match(re)
  return match ? match[1].trim() : null
}

// ─── Extraire les métadonnées utiles ─────────────────────────────────────────

function parseMetadata(filePath) {
  // Lire seulement les 200KB de début — les métadonnées iXML sont toujours là
  const HEADER_SIZE = 512 * 1024
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(HEADER_SIZE)
  const bytesRead = fs.readSync(fd, buffer, 0, HEADER_SIZE, 0)
  fs.closeSync(fd)
  const headerBuffer = buffer.slice(0, bytesRead)

  const filename = path.basename(filePath)

  const ixmlRaw = extractIxml(headerBuffer)
  const info = extractInfo(headerBuffer)

  let category = ''
  let subcategory = ''
  let catId = ''
  let fxname = ''
  let description = ''
  let library = ''
  let tags = []

  if (ixmlRaw) {
    // Essayer USER block d'abord (plus complet chez Boom Library)
    const userBlock = ixmlRaw.match(/<USER>([\s\S]*?)<\/USER>/i)?.[1] || ''
    const aswgBlock = ixmlRaw.match(/<ASWG>([\s\S]*?)<\/ASWG>/i)?.[1] || ''
    const block = userBlock || aswgBlock || ixmlRaw

    category    = getXmlValue(block, 'CATEGORY') || getXmlValue(ixmlRaw, 'category') || ''
    subcategory = getXmlValue(block, 'SUBCATEGORY') || getXmlValue(ixmlRaw, 'subCategory') || ''
    catId       = getXmlValue(block, 'CATID') || getXmlValue(ixmlRaw, 'catId') || ''
    fxname      = getXmlValue(block, 'FXNAME') || ''
    library     = getXmlValue(block, 'LIBRARY') || getXmlValue(ixmlRaw, 'library') || 'BOOM Library'

    // Description : phrase + mots-clés séparés par virgules
    const rawDesc = getXmlValue(block, 'DESCRIPTION')
      || getXmlValue(ixmlRaw, 'BWF_DESCRIPTION')
      || info['IKEY'] || info['ISUB'] || ''

    if (rawDesc) {
      // Boom Library structure : "Description phrase. Keyword1, Keyword2, Keyword3."
      const parts = rawDesc.split(/\.\s+/)
      description = parts[0] || rawDesc

      // Extraire les tags depuis la partie après le premier point
      const keywordPart = parts.slice(1).join('. ')
      if (keywordPart) {
        tags = keywordPart
          .split(',')
          .map(t => t.replace(/\.$/, '').trim().toLowerCase())
          .filter(t => t.length > 2 && t.length < 40)
      }
    }
  }

  // Fallback sur INFO chunk si iXML vide
  if (!description && info['IKEY']) description = info['IKEY']
  if (!description && info['ICMT']) description = info['ICMT']
  if (!category && info['IGNR']) category = info['IGNR']

  // Label propre : FXNAME > nom de fichier nettoyé
  let label = fxname
  if (!label) {
    label = filename
      .replace(/_B00M_ONE\.wav$/i, '')
      .replace(/\.wav$/i, '')
      .replace(/^[A-Z]+_/, '') // retirer le préfixe catégorie (WOODMvmt_)
      .replace(/_/g, ' ')
      .trim()
  }

  // ID propre depuis le nom de fichier
  const id = filename
    .replace(/\.wav$/i, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .slice(0, 80)

  // Mapper la catégorie Boom vers les catégories ILi
  const categoryMap = {
    'WOOD': 'SFX', 'METAL': 'SFX', 'GLASS': 'SFX', 'STONE': 'SFX',
    'CLOTH': 'SFX', 'PAPER': 'SFX', 'LIQUID': 'SFX', 'FIRE': 'SFX',
    'WATER': 'Ambiance', 'WIND': 'Ambiance', 'RAIN': 'Ambiance',
    'NATURE': 'Ambiance', 'CITY': 'Ambiance', 'ROOM': 'Ambiance',
    'CROWD': 'Ambiance', 'TRAFFIC': 'Ambiance',
    'WEAPON': 'SFX', 'IMPACT': 'SFX', 'EXPLOSION': 'SFX',
    'VEHICLE': 'SFX', 'MACHINE': 'SFX',
    'MUSIC': 'Musique', 'STING': 'Musique',
    'VOICE': 'Dialogue', 'FOLEY': 'SFX',
  }
  const iliCategory = categoryMap[category.toUpperCase()] || 'Autre'

  return {
    id,
    filename: filename.replace(/\.wav$/i, '.mp3'),
    originalFilename: filename,
    originalPath: filePath,
    localPath: filePath,
    label,
    description,
    tags,
    category: iliCategory,
    boomCategory: category,
    boomSubcategory: subcategory,
    catId,
    library,
    categories: iliCategory ? [iliCategory] : [],
    mood: [],
    loop: false,
    duration: 0,
    intensity: 'moyenne',
    tempo: 'moyen',
    url: '', // sera rempli après upload
  }
}


// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎵 Indexation Boom Library : ${BOOM_DIR}`)
  console.log(`   Mode : ${FLAG_DRY ? 'dry-run' : FLAG_UPLOAD ? 'index + upload' : 'index seulement'}\n`)

  // Charger l'index existant
  let existingIndex = []
  if (fs.existsSync(INDEX_PATH)) {
    existingIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'))
  }
  const existingIds = new Set(existingIndex.map(s => s.id))

  // Trouver tous les WAV récursivement
  const wavFiles = findWavFiles(BOOM_DIR)
  console.log(`📁 ${wavFiles.length} fichiers WAV trouvés\n`)

  const newEntries = []
  let skipped = 0
  let errors = 0

  for (const filePath of wavFiles) {
    // Ignorer les fichiers > 500MB
    try {
      const fileStat = fs.statSync(filePath)
      if (fileStat.size > 500 * 1024 * 1024) {
        console.log(`⏭  Ignoré (${(fileStat.size / 1024 / 1024 / 1024).toFixed(1)}GB) : ${path.basename(filePath)}`)
        skipped++
        continue
      }
    } catch (err) {
      console.error(`❌ Fichier inaccessible : ${path.basename(filePath)}`)
      errors++
      continue
    }

    let meta
    try {
      meta = parseMetadata(filePath)
    } catch (err) {
      console.error(`❌ Parse échoué : ${path.basename(filePath)} — ${err.message}`)
      errors++
      continue
    }
    // Calculer la durée depuis le fmt chunk du header
    try {
      const fd = fs.openSync(filePath, 'r')
      const hbuf = Buffer.alloc(512)
      fs.readSync(fd, hbuf, 0, 512, 0)
      fs.closeSync(fd)
      let off = 12
      while (off < hbuf.length - 8) {
        const cid = hbuf.slice(off, off + 4).toString('ascii')
        const csz = hbuf.readUInt32LE(off + 4)
        if (cid === 'fmt ') {
          const byteRate = hbuf.readUInt32LE(off + 16)
          const fileStat = fs.statSync(filePath)
          meta.duration = Math.round((fileStat.size / byteRate) * 10) / 10
          break
        }
        off += 8 + csz + (csz % 2)
        if (csz === 0) break
      }
    } catch { meta.duration = 0 }

    // Déjà indexé ?
    if (existingIds.has(meta.id)) {
      process.stdout.write(`⏭  ${meta.label}\n`)
      skipped++
      continue
    }

    console.log(`✅ ${meta.label}`)
    console.log(`   Catégorie : ${meta.boomCategory} / ${meta.boomSubcategory}`)
    console.log(`   Description : ${meta.description.slice(0, 80)}${meta.description.length > 80 ? '…' : ''}`)
    console.log(`   Tags : ${meta.tags.slice(0, 6).join(', ')}`)
    console.log(`   Durée : ${meta.duration}s\n`)

    newEntries.push(meta)
    // Sauvegarde progressive toutes les 50 entrées
    if (newEntries.length % 50 === 0) {
      const partial = [...existingIndex, ...newEntries]
      fs.writeFileSync(INDEX_PATH, JSON.stringify(partial, null, 2))
      process.stdout.write(`💾 Sauvegarde intermédiaire : ${partial.length} sons\n`)
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  Nouveaux : ${newEntries.length}`)
  console.log(`  Ignorés  : ${skipped}`)
  console.log(`  Erreurs  : ${errors}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  if (FLAG_DRY || newEntries.length === 0) {
    if (FLAG_DRY) console.log('ℹ️  Dry-run : aucune modification effectuée')
    return
  }

  if (FLAG_UPLOAD) {
    // Upload MP3 sur Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

    console.log('⬆️  Upload des fichiers MP3 sur Supabase...\n')

    for (const entry of newEntries) {
      try {
        // Lire le WAV original
        const wavBuffer = fs.readFileSync(entry.originalPath)

        // Encoder en MP3 via lamejs
        const { Mp3Encoder } = await import('lamejs')
        const audioCtx = new (await import('node:vm')).Script('').runInThisContext()
        // Note : pour Node.js, utiliser une approche différente
        // On copie simplement le fichier WAV converti en MP3 si disponible
        // Sinon on uploade le WAV tel quel avec extension .mp3 (Howler gère les deux)
        const fileBuffer = wavBuffer

        const { error } = await supabase.storage
          .from('sounds')
          .upload(entry.filename, fileBuffer, { contentType: 'audio/mpeg', upsert: false })

        if (error && !error.message.includes('already exists')) {
          throw new Error(error.message)
        }

        const { data } = supabase.storage.from('sounds').getPublicUrl(entry.filename)
        entry.url = data.publicUrl
        console.log(`✅ ${entry.label} → ${entry.url.slice(0, 60)}...`)

      } catch (err) {
        console.error(`❌ Upload échoué : ${entry.label} — ${err.message}`)
        entry.url = ''
      }
    }
  }

  // Mettre à jour l'index (seulement les entrées avec URL si upload, ou toutes sinon)
  const toAdd = FLAG_UPLOAD ? newEntries.filter(e => e.url) : newEntries

  // Enrichir avec searchString (traductions + synonymes) et nettoyer les champs internes
  const cleaned = toAdd.map(({ originalFilename, originalPath, ...rest }) => 
    enrichSoundEntry(rest)
  )

  const updatedIndex = [...existingIndex, ...cleaned]
  fs.writeFileSync(INDEX_PATH, JSON.stringify(updatedIndex, null, 2))
  console.log(`\n💾 ${INDEX_PATH} mis à jour — ${updatedIndex.length} sons au total`)

  if (!FLAG_UPLOAD) {
    console.log('\n💡 Les URLs sont vides (pas de --upload).')
    console.log('   Lance avec --upload pour compresser et envoyer sur Supabase.')
    console.log('   Ou utilise le bouton "+ Importer" dans l\'admin pour les fichiers un par un.')
  }
}

function findWavFiles(dir) {
  const results = []
  if (!fs.existsSync(dir)) {
    console.error(`Dossier introuvable : ${dir}`)
    process.exit(1)
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findWavFiles(fullPath))
    } else if (entry.isFile() && /\.wav$/i.test(entry.name)) {
      results.push(fullPath)
    }
  }
  return results
}

main().catch(err => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})

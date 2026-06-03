import express from 'express'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const app = express()

// ── Middleware JSON en premier ───────────────────────────────────────────────
// IMPORTANT : doit être déclaré AVANT les routes qui en ont besoin
app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('application/json')) {
    express.json()(req, res, next)
  } else {
    next()
  }
})

// ── /api/preview-sound ───────────────────────────────────────────────────────
app.get('/api/preview-sound', (req, res) => {
  const filePath = req.query.path
  if (!filePath) return res.status(400).end('path manquant')

  const ext = path.extname(filePath).toLowerCase()
  if (!['.wav', '.mp3', '.aif', '.aiff', '.flac'].includes(ext)) {
    return res.status(400).end('Type non autorisé')
  }
  if (!fs.existsSync(filePath)) {
    console.error('Fichier introuvable :', filePath)
    return res.status(404).end('Fichier introuvable')
  }

  const stat = fs.statSync(filePath)
  const mimeTypes = {
    '.wav':  'audio/wav',
    '.mp3':  'audio/mpeg',
    '.aif':  'audio/aiff',
    '.aiff': 'audio/aiff',
    '.flac': 'audio/flac',
  }
  const contentType = mimeTypes[ext] || 'audio/octet-stream'
  const range = req.headers.range

  // Toujours autoriser le range pour le streaming audio
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Accept-Ranges', 'bytes')

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1
    const chunkSize = end - start + 1
    res.writeHead(206, {
      'Content-Range':  `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges':  'bytes',
      'Content-Length': chunkSize,
      'Content-Type':   contentType,
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type':   contentType,
      'Accept-Ranges':  'bytes',
    })
    fs.createReadStream(filePath).pipe(res)
  }
})

// ── /api/upload-audio ────────────────────────────────────────────────────────
app.post('/api/upload-audio', async (req, res) => {
  // Lire le body brut (multipart)
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks)

  const contentType = req.headers['content-type'] || ''
  const boundaryMatch = contentType.match(/boundary=(.+)$/)
  if (!boundaryMatch) return res.status(400).json({ error: 'No boundary' })
  const boundary = boundaryMatch[1].trim()

  const parts = parseMultipart(body, boundary)
  const { password, filename, file: fileBuffer } = parts

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  if (!filename || !fileBuffer) {
    return res.status(400).json({ error: 'Fichier ou nom manquant' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { error } = await supabase.storage
    .from('sounds')
    .upload(filename, fileBuffer, { contentType: 'audio/mpeg', upsert: true })

  if (error) {
    console.error('Supabase upload error:', error)
    return res.status(500).json({ error: error.message })
  }

  const { data } = supabase.storage.from('sounds').getPublicUrl(filename)
  return res.status(200).json({ publicUrl: data.publicUrl })
})

// ── /api/upload-sound ────────────────────────────────────────────────────────
app.post('/api/upload-sound', express.json(), async (req, res) => {
  const { password, soundEntry } = req.body ?? {}
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  if (!soundEntry?.id || !soundEntry?.url) {
    return res.status(400).json({ error: 'soundEntry invalide — id et url requis' })
  }
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  const row = {
    id:               soundEntry.id,
    filename:         soundEntry.filename        || null,
    label:            soundEntry.label           || soundEntry.id,
    url:              soundEntry.url,
    local_path:       soundEntry.localPath       || null,
    description:      soundEntry.description     || null,
    tags:             soundEntry.tags            ?? [],
    categories:       soundEntry.categories      ?? [],
    boom_category:    soundEntry.boomCategory    || null,
    boom_subcategory: soundEntry.boomSubcategory || null,
    cat_id:           soundEntry.catId           || null,
    library:          soundEntry.library         || null,
    mood:             soundEntry.mood            ?? [],
    loop:             soundEntry.loop            ?? false,
    duration:         soundEntry.duration        ?? 0,
    intensity:        soundEntry.intensity       || null,
    tempo:            soundEntry.tempo           || null,
    search_string:    soundEntry.searchString    || null,
  }
  try {
    const { error } = await supabase
      .from('sounds')
      .upsert(row, { onConflict: 'id' })
    if (error) throw new Error(error.message)
    return res.status(200).json({ success: true, action: 'upserted' })
  } catch (err) {
    console.error('upload-sound error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ── Démarrage ────────────────────────────────────────────────────────────────
app.listen(3001, () => {
  console.log('\n🔧 Serveur API local prêt sur http://localhost:3001')
  console.log('   GET  /api/preview-sound  → lecture fichiers locaux')
  console.log('   POST /api/upload-audio   → compression + upload Supabase')
  console.log('   POST /api/upload-sound   → mise à jour index GitHub\n')
})

// Maintenir le process actif
process.stdin.resume()

// ── Helpers multipart ────────────────────────────────────────────────────────
function parseMultipart(buffer, boundary) {
  const result = {}
  const sep = Buffer.from('--' + boundary)
  const parts = splitBuffer(buffer, sep)

  for (const part of parts) {
    if (!part.length) continue
    const headerEnd = indexOfBuffer(part, Buffer.from('\r\n\r\n'))
    if (headerEnd === -1) continue
    const header  = part.slice(0, headerEnd).toString()
    const content = part.slice(headerEnd + 4)
    const data    = content.slice(0, content.length - 2) // retirer \r\n final

    const nameMatch = header.match(/name="([^"]+)"/)
    if (!nameMatch) continue
    const name = nameMatch[1]
    const isFile = header.match(/filename="([^"]+)"/)
    result[name] = isFile ? data : data.toString()
  }
  return result
}

function splitBuffer(buffer, separator) {
  const parts = []
  let start = 0
  let pos   = indexOfBuffer(buffer, separator, start)

  while (pos !== -1) {
    parts.push(buffer.slice(start, pos))
    start = pos + separator.length
    // Sauter le \r\n après le séparateur
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2
    pos = indexOfBuffer(buffer, separator, start)
  }
  return parts
}

function indexOfBuffer(buffer, search, offset = 0) {
  outer: for (let i = offset; i <= buffer.length - search.length; i++) {
    for (let j = 0; j < search.length; j++) {
      if (buffer[i + j] !== search[j]) continue outer
    }
    return i
  }
  return -1
}
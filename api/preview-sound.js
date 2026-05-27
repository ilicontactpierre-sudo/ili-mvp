import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Non disponible en production' })
  }

  const filePath = req.query.path
  if (!filePath) {
    return res.status(400).json({ error: 'Paramètre path manquant' })
  }

  const ext = path.extname(filePath).toLowerCase()
  if (!['.wav', '.mp3', '.aif', '.aiff', '.flac'].includes(ext)) {
    return res.status(400).json({ error: 'Type de fichier non autorisé' })
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier introuvable' })
  }

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const range = req.headers.range

  const mimeTypes = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.aif': 'audio/aiff',
    '.aiff': 'audio/aiff',
    '.flac': 'audio/flac',
  }
  const contentType = mimeTypes[ext] || 'audio/octet-stream'

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    })
    fs.createReadStream(filePath).pipe(res)
  }
}
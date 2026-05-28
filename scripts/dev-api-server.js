import express from 'express'
import fs from 'fs'
import path from 'path'

const app = express()

// preview-sound — sert les fichiers audio locaux
app.get('/api/preview-sound', (req, res) => {
  const filePath = req.query.path
  if (!filePath) return res.status(400).end('path manquant')

  const ext = path.extname(filePath).toLowerCase()
  if (!['.wav', '.mp3', '.aif', '.aiff', '.flac'].includes(ext)) {
    return res.status(400).end('Type non autorisé')
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).end('Fichier introuvable')
  }

  const stat = fs.statSync(filePath)
  const mimeTypes = {
    '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
    '.aif': 'audio/aiff', '.aiff': 'audio/aiff', '.flac': 'audio/flac',
  }
  const contentType = mimeTypes[ext] || 'audio/octet-stream'
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType,
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    })
    fs.createReadStream(filePath).pipe(res)
  }
})

app.listen(3001, () => {
  console.log('🔧 API locale : http://localhost:3001')
})
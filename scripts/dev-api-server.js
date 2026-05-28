import express from 'express'
import { createServer } from 'http'

const app = express()

// Importer et monter les handlers API
const { default: previewSound } = await import('../api/preview-sound.js')
const { default: uploadAudio } = await import('../api/upload-audio.js')
const { default: uploadSound } = await import('../api/upload-sound.js')

function vercelAdapter(handler) {
  return (req, res) => handler(req, res)
}

app.use('/api/preview-sound', vercelAdapter(previewSound))
app.use('/api/upload-audio', vercelAdapter(uploadAudio))
app.use('/api/upload-sound', vercelAdapter(uploadSound))

app.listen(3001, () => {
  console.log('🔧 API server running on http://localhost:3001')
})
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Lire le multipart manuellement
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks)

  // Parser le boundary
  const contentType = req.headers['content-type'] || ''
  const boundary = contentType.split('boundary=')[1]
  if (!boundary) return res.status(400).json({ error: 'No boundary' })

  const parts = parseMultipart(body, boundary)
  const password = parts.password
  const filename = parts.filename
  const fileBuffer = parts.file

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  if (!filename || !fileBuffer) {
    return res.status(400).json({ error: 'Fichier manquant' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { error } = await supabase.storage
    .from('sounds')
    .upload(filename, fileBuffer, { contentType: 'audio/mpeg', upsert: true })

  if (error) return res.status(500).json({ error: error.message })

  const { data } = supabase.storage.from('sounds').getPublicUrl(filename)
  return res.status(200).json({ publicUrl: data.publicUrl })
}

function parseMultipart(buffer, boundary) {
  const result = {}
  const sep = Buffer.from('--' + boundary)
  const parts = splitBuffer(buffer, sep)

  for (const part of parts) {
    if (!part.length) continue
    const headerEnd = indexOfBuffer(part, Buffer.from('\r\n\r\n'))
    if (headerEnd === -1) continue
    const header = part.slice(0, headerEnd).toString()
    const content = part.slice(headerEnd + 4)
    // Retirer le \r\n final
    const data = content.slice(0, content.length - 2)

    const nameMatch = header.match(/name="([^"]+)"/)
    if (!nameMatch) continue
    const name = nameMatch[1]

    const filenameMatch = header.match(/filename="([^"]+)"/)
    if (filenameMatch) {
      result[name] = data
    } else {
      result[name] = data.toString()
    }
  }
  return result
}

function splitBuffer(buffer, separator) {
  const parts = []
  let start = 0
  let pos = indexOfBuffer(buffer, separator, start)
  while (pos !== -1) {
    parts.push(buffer.slice(start, pos))
    start = pos + separator.length
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2
    pos = indexOfBuffer(buffer, separator, start)
  }
  return parts
}

function indexOfBuffer(buffer, search, offset = 0) {
  for (let i = offset; i <= buffer.length - search.length; i++) {
    let found = true
    for (let j = 0; j < search.length; j++) {
      if (buffer[i + j] !== search[j]) { found = false; break }
    }
    if (found) return i
  }
  return -1
}
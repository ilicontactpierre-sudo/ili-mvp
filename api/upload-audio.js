import { createClient } from '@supabase/supabase-js'
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  let body
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    body = JSON.parse(Buffer.concat(chunks).toString())
  } catch {
    return res.status(400).json({ error: 'Body JSON invalide' })
  }
  const { password, filename, fileBase64 } = body
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  if (!filename || !fileBase64) {
    return res.status(400).json({ error: 'filename et fileBase64 requis' })
  }
  const fileBuffer = Buffer.from(fileBase64, 'base64')
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
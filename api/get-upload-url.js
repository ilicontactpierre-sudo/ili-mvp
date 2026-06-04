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

  const { password, filename } = body
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  if (!filename) {
    return res.status(400).json({ error: 'filename requis' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  // Supprimer le fichier s'il existe déjà — Supabase refuse createSignedUploadUrl sur un fichier existant
  await supabase.storage.from('sounds').remove([filename])

  const { data, error } = await supabase.storage
    .from('sounds')
    .createSignedUploadUrl(filename)

  if (error) return res.status(500).json({ error: error.message })

  const { data: urlData } = supabase.storage
    .from('sounds')
    .getPublicUrl(filename)

  return res.status(200).json({
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: urlData.publicUrl,
  })
}
export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { password, soundId, filename } = req.body
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  if (!soundId) {
    return res.status(400).json({ error: 'soundId requis' })
  }
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Variables Supabase manquantes' })
  }
  try {
    // 1. Supprimer le fichier du bucket Storage
    const storageFilename = filename || `${soundId}.mp3`
    const storageRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sounds/${storageFilename}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }
    )
    // On ne bloque pas si le fichier n'existe pas dans le bucket (déjà supprimé)

    // 2. Supprimer la ligne dans la table sounds
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sounds?id=eq.${encodeURIComponent(soundId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
      }
    )
    if (!dbRes.ok) {
      const err = await dbRes.text()
      throw new Error(`Suppression table échouée : ${err}`)
    }
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Erreur delete-sound:', error)
    return res.status(500).json({ error: error.message })
  }
}
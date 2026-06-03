/**
 * api/upload-sound.js
 * Vercel Serverless Function
 *
 * Reçoit : { soundEntry } — objet complet à ajouter dans la table Supabase `sounds`
 * Vérifie le mot de passe admin
 * Upsert dans Supabase (insert ou update si l'id existe déjà)
 */
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password, soundEntry } = req.body ?? {}

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  if (!soundEntry || !soundEntry.id || !soundEntry.url) {
    return res.status(400).json({ error: 'soundEntry invalide — id et url requis' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const row = {
    id:              soundEntry.id,
    filename:        soundEntry.filename        || null,
    label:           soundEntry.label           || soundEntry.id,
    url:             soundEntry.url,
    local_path:      soundEntry.localPath       || null,
    description:     soundEntry.description     || null,
    tags:            soundEntry.tags            ?? [],
    categories:      soundEntry.categories      ?? [],
    boom_category:   soundEntry.boomCategory    || null,
    boom_subcategory:soundEntry.boomSubcategory || null,
    cat_id:          soundEntry.catId           || null,
    library:         soundEntry.library         || null,
    mood:            soundEntry.mood            ?? [],
    loop:            soundEntry.loop            ?? false,
    duration:        soundEntry.duration        ?? 0,
    intensity:       soundEntry.intensity       || null,
    tempo:           soundEntry.tempo           || null,
    search_string:   soundEntry.searchString    || null,
  }

  const { error } = await supabase
    .from('sounds')
    .upsert(row, { onConflict: 'id' })

  if (error) {
    console.error('upload-sound error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true, action: 'upserted' })
}
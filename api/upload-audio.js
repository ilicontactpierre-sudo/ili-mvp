import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Cet endpoint est conservé pour compatibilité mais ne traite plus de fichiers.
  // L'upload se fait désormais directement depuis le client via URL signée (get-upload-url.js).
  return res.status(410).json({ error: 'Endpoint obsolète. Utiliser /api/get-upload-url.' })
}
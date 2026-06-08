export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email invalide' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Configuration Supabase manquante' })
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ email })
  })

  if (response.status === 409) {
    // Email déjà inscrit — on considère ça comme un succès silencieux
    return res.status(200).json({ success: true, already: true })
  }

  if (!response.ok) {
    const err = await response.text()
    console.error('Supabase error:', err)
    return res.status(500).json({ error: 'Erreur lors de l\'inscription' })
  }

  return res.status(200).json({ success: true })
}
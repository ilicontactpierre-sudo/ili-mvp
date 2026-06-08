export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password, subject, body } = req.body

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  if (!subject || !body) {
    return res.status(400).json({ error: 'Sujet et contenu requis' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
  const RESEND_API_KEY = process.env.RESEND_API_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: 'Configuration serveur incomplète' })
  }

  // 1. Récupérer tous les abonnés actifs
  const subResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?active=eq.true&select=email`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  )

  if (!subResponse.ok) {
    return res.status(500).json({ error: 'Impossible de récupérer les abonnés' })
  }

  const subscribers = await subResponse.json()

  if (subscribers.length === 0) {
    return res.status(200).json({ success: true, sent: 0, message: 'Aucun abonné actif.' })
  }

  const emails = subscribers.map(s => s.email)

  // 2. Envoyer via Resend (BCC pour protéger les adresses)
  const htmlBody = body
    .split('\n')
    .map(line => line.trim() === '' ? '<br/>' : `<p style="margin:0 0 1em 0;line-height:1.6">${line}</p>`)
    .join('')

  const emailHtml = `
    <div style="max-width:600px;margin:0 auto;font-family:Georgia,serif;color:#1a1a1a;padding:2rem 1rem">
      <p style="font-size:1.4rem;font-weight:bold;letter-spacing:0.04em;margin-bottom:2rem">ILi</p>
      ${htmlBody}
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:2rem 0"/>
      <p style="font-size:0.8rem;color:#999;line-height:1.5">
        Vous recevez cet email car vous avez lu une histoire ILi.<br/>
        Pour vous désinscrire, répondez à cet email avec le mot "désinscription".
      </p>
    </div>
  `

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'ILi <newsletter@ton-domaine.com>',
      to: ['newsletter@ton-domaine.com'],
      bcc: emails,
      subject,
      html: emailHtml
    })
  })

  if (!resendResponse.ok) {
    const err = await resendResponse.json()
    console.error('Resend error:', err)
    return res.status(500).json({ error: 'Erreur lors de l\'envoi' })
  }

  return res.status(200).json({
    success: true,
    sent: emails.length,
    message: `Newsletter envoyée à ${emails.length} abonné(s).`
  })
}
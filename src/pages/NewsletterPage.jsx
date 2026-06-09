import { useState, useEffect } from 'react'

function NewsletterPage({ password }) {
  const [subscribers, setSubscribers] = useState([])
  const [loadingSubscribers, setLoadingSubscribers] = useState(true)

  const [theme, setTheme] = useState('dark')
  const [label, setLabel] = useState('Nouvelle histoire disponible')
  const [storyPart, setStoryPart] = useState('')
  const [storyTitle, setStoryTitle] = useState('')
  const [storyAuthor, setStoryAuthor] = useState('')
  const [storyDesc, setStoryDesc] = useState('')
  const [readTime, setReadTime] = useState('')
  const [storyUrl, setStoryUrl] = useState('https://ili-mvp.vercel.app/lire/')
  const [footerMsg, setFooterMsg] = useState('Merci de faire partie de l\u2019exp\u00e9rience ILi.')
  const [signature, setSignature] = useState('\u00c0 bient\u00f4t,\nL\u2019\u00e9quipe ILi')

  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const bg = theme === 'dark' ? '#080809' : '#f5f4f0'
  const fg = theme === 'dark' ? '#ffffff' : '#0a0a0a'
  const fgMid = theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'
  const fgLow = theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.32)'
  const borderColor = theme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'
  const ruleColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  useEffect(() => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

    fetch(`${SUPABASE_URL}/rest/v1/subscribers?select=email,created_at,active&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
      .then(r => r.json())
      .then(data => {
        setSubscribers(Array.isArray(data) ? data : [])
        setLoadingSubscribers(false)
      })
      .catch(() => setLoadingSubscribers(false))
  }, [])

  const buildHtml = () => {
    const signatureHtml = signature.split('\n').join('<br/>')
    const titleDisplay = storyTitle || 'TITRE DE L&#39;HISTOIRE'
    const authorDisplay = storyAuthor || 'Auteur'
    const descDisplay = storyDesc || 'Description courte de l&#39;histoire.'
    const urlDisplay = storyUrl || '#'
    const timeDisplay = readTime || '? min'
    const partDisplay = storyPart ? `Partie ${storyPart}` : ''

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${label}</title>
</head>
<body style="margin:0;padding:0;background:${bg};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};min-height:100vh;">
<tr><td align="center" style="padding:32px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:56px 48px 48px;font-family:'Roboto',Helvetica,Arial,sans-serif;color:${fg};">

  <!-- LOGO -->
  <p style="text-align:center;font-size:42px;font-weight:300;letter-spacing:0.22em;color:${fg};margin:0 0 10px;line-height:1;">ILi</p>
  <p style="text-align:center;font-size:11px;font-weight:500;letter-spacing:0.5em;text-transform:uppercase;color:${fgLow};margin:0 0 44px;">Lecture immersive</p>

  <!-- SEPARATEUR HAUT -->
  <div style="width:100%;height:1px;background:${borderColor};margin:0 0 44px;"></div>

  <!-- LABEL EDITORIAL -->
  <p style="text-align:center;font-size:10px;font-weight:400;letter-spacing:0.45em;text-transform:uppercase;color:${fgMid};margin:0 0 36px;">${label}</p>

  <!-- CARTE HISTOIRE -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${borderColor};margin-bottom:44px;">
  <tr><td style="padding:40px 40px 36px;">

    <!-- TEMPS DE LECTURE -->
    <p style="font-size:10px;font-weight:500;letter-spacing:0.38em;text-transform:uppercase;color:${fgLow};margin:0 0 24px;">${timeDisplay} de lecture</p>

    <!-- TITRE -->
    <p style="font-size:36px;font-weight:300;letter-spacing:0.06em;text-transform:uppercase;color:${fg};margin:0 0 10px;line-height:1.1;">${titleDisplay}</p>

    <!-- AUTEUR -->
    <p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;font-style:italic;color:${fgLow};margin:0 0 24px;letter-spacing:0.04em;">${authorDisplay}</p>

    <!-- SEPARATEUR -->
    <div style="width:32px;height:1px;background:${fgMid};margin:0 0 28px;"></div>

    <!-- DESCRIPTION -->
    <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:${fgMid};margin:0 0 36px;">${descDisplay}</p>

    <!-- FOOTER CARTE -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:10px;font-weight:300;letter-spacing:0.32em;text-transform:uppercase;color:${fgLow};">${partDisplay}</td>
      <td align="right"><a href="${urlDisplay}" style="font-size:10px;font-weight:500;letter-spacing:0.28em;text-transform:uppercase;color:${fg};text-decoration:none;border-bottom:1px solid ${fgMid};padding-bottom:3px;">Lire avec ILi &rarr;</a></td>
    </tr></table>

  </td></tr>
  </table>

  <!-- SEPARATEUR BAS -->
  <div style="width:100%;height:1px;background:${ruleColor};margin:0 0 36px;"></div>

  <!-- MESSAGE FOOTER -->
  <p style="font-size:10px;font-weight:300;letter-spacing:0.32em;text-transform:uppercase;color:${fgLow};text-align:center;line-height:2.2;margin:0 0 28px;">${footerMsg}</p>

  <!-- MINI REGLE -->
  <div style="width:28px;height:1px;background:${borderColor};margin:0 auto 28px;"></div>

  <!-- SIGNATURE -->
  <p style="font-size:10px;font-weight:300;letter-spacing:0.35em;text-transform:uppercase;color:${fgLow};text-align:center;line-height:2.2;margin:0 0 44px;">${signatureHtml}</p>

  <!-- DESINSCRIPTION -->
  <p style="font-size:10px;font-weight:300;letter-spacing:0.1em;color:${fgLow};text-align:center;margin:0;">
    Pour vous d&eacute;sinscrire, <a href="mailto:ili.contact.pierre@gmail.com?subject=D%C3%A9sinscription&body=Je%20souhaite%20me%20d%C3%A9sinscrire%20de%20la%20newsletter%20ILi." style="color:${fgLow};text-decoration:underline;">cliquez ici</a>.
  </p>

</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  }

  const activeCount = subscribers.filter(s => s.active).length

  const handleSend = async () => {
    if (!storyTitle.trim()) {
      setResult({ error: 'Le titre de l\'histoire est requis.' })
      return
    }
    if (!window.confirm(`Envoyer cette newsletter a ${activeCount} abonne(s) ?`)) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          subject: `ILi — ${storyTitle}`,
          body: buildHtml(),
          isHtml: true
        })
      })
      const data = await res.json()
      if (data.success) {
        setResult({ success: data.message })
        setStoryTitle('')
        setStoryAuthor('')
        setStoryDesc('')
        setReadTime('')
        setStoryPart('')
        setStoryUrl('https://ili-mvp.vercel.app/lire/')
      } else {
        setResult({ error: data.error || 'Erreur inconnue' })
      }
    } catch {
      setResult({ error: 'Erreur reseau' })
    } finally {
      setSending(false)
    }
  }

  const inputStyle = {
    padding: '0.7rem 0.9rem',
    fontSize: '0.9rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    color: '#1a1a1a'
  }

  const labelStyle = {
    fontSize: '0.72rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#999',
    marginBottom: '6px',
    display: 'block'
  }

  const sectionStyle = {
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '1.5rem',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  }

  return (
    <div style={{ display: 'flex', gap: '2rem', maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* COLONNE GAUCHE : formulaire */}
      <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Abonnes */}
        <div style={sectionStyle}>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#333', fontWeight: 600 }}>Abonnes</h2>
          {loadingSubscribers ? (
            <p style={{ color: '#bbb', fontSize: '0.85rem' }}>Chargement…</p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
                <strong>{activeCount}</strong> actif(s) sur {subscribers.length}
              </p>
              {subscribers.length > 0 && (
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '6px' }}>
                  {subscribers.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.75rem',
                      borderBottom: i < subscribers.length - 1 ? '1px solid #f5f5f5' : 'none'
                    }}>
                      <span style={{ fontSize: '0.82rem', color: s.active ? '#333' : '#ccc' }}>{s.email}</span>
                      <span style={{ fontSize: '0.75rem', color: '#ccc' }}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Contenu */}
        <div style={sectionStyle}>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#333', fontWeight: 600 }}>Contenu</h2>

          {/* Theme */}
          <div>
            <span style={labelStyle}>Theme</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['dark', 'light'].map(t => (
                <button key={t} onClick={() => setTheme(t)} style={{
                  flex: 1,
                  padding: '0.6rem',
                  fontSize: '0.82rem',
                  border: '1px solid ' + (theme === t ? '#1a1a1a' : '#ddd'),
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: theme === t ? '#1a1a1a' : '#fff',
                  color: theme === t ? '#fff' : '#555',
                  fontWeight: theme === t ? 600 : 400
                }}>
                  {t === 'dark' ? '◼ Sombre' : '◻ Clair'}
                </button>
              ))}
            </div>
          </div>

          {/* Label editorial */}
          <div>
            <span style={labelStyle}>Label editorial</span>
            <input
              style={inputStyle}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Nouvelle histoire disponible"
            />
          </div>

          {/* Duree + Partie */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>Temps de lecture</span>
              <input
                style={inputStyle}
                value={readTime}
                onChange={e => setReadTime(e.target.value)}
                placeholder="4 min"
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>Partie (optionnel)</span>
              <input
                style={inputStyle}
                value={storyPart}
                onChange={e => setStoryPart(e.target.value)}
                placeholder="1, 2, 3…"
              />
            </div>
          </div>

          {/* Titre */}
          <div>
            <span style={labelStyle}>Titre de l'histoire</span>
            <input
              style={inputStyle}
              value={storyTitle}
              onChange={e => setStoryTitle(e.target.value)}
              placeholder="Le Dernier Voyage"
            />
          </div>

          {/* Auteur */}
          <div>
            <span style={labelStyle}>Auteur</span>
            <input
              style={inputStyle}
              value={storyAuthor}
              onChange={e => setStoryAuthor(e.target.value)}
              placeholder="Guy de Maupassant"
            />
          </div>

          {/* Description */}
          <div>
            <span style={labelStyle}>Description courte</span>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '90px', lineHeight: '1.6' }}
              value={storyDesc}
              onChange={e => setStoryDesc(e.target.value)}
              placeholder="Un homme retrouve une lettre qu'il aurait prefere oublier…"
            />
          </div>

          {/* URL */}
          <div>
            <span style={labelStyle}>URL de l'histoire</span>
            <input
              style={inputStyle}
              value={storyUrl}
              onChange={e => setStoryUrl(e.target.value)}
              placeholder="https://ili-mvp.vercel.app/lire/le-dernier-voyage"
            />
          </div>
        </div>

        {/* Fin d'email */}
        <div style={sectionStyle}>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#333', fontWeight: 600 }}>Fin d'email</h2>

          <div>
            <span style={labelStyle}>Message de cloture</span>
            <input
              style={inputStyle}
              value={footerMsg}
              onChange={e => setFooterMsg(e.target.value)}
            />
          </div>

          <div>
            <span style={labelStyle}>Signature</span>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '64px', lineHeight: '1.6' }}
              value={signature}
              onChange={e => setSignature(e.target.value)}
            />
          </div>
        </div>

        {/* Bouton envoi */}
        <button
          onClick={handleSend}
          disabled={sending || activeCount === 0}
          style={{
            padding: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            backgroundColor: sending || activeCount === 0 ? '#ccc' : '#1a1a1a',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: sending || activeCount === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {sending ? 'Envoi…' : `Envoyer a ${activeCount} abonne(s)`}
        </button>

        {result?.success && (
          <p style={{ color: '#28a745', fontSize: '0.85rem', margin: 0 }}>✓ {result.success}</p>
        )}
        {result?.error && (
          <p style={{ color: '#dc3545', fontSize: '0.85rem', margin: 0 }}>✗ {result.error}</p>
        )}
      </div>

      {/* COLONNE DROITE : apercu live */}
      <div style={{ flex: '1 1 460px', position: 'sticky', top: '80px' }}>
        <span style={{ ...labelStyle, marginBottom: '12px', display: 'block' }}>Apercu live</span>
        <div
          style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' }}
          dangerouslySetInnerHTML={{ __html: buildHtml() }}
        />
      </div>

    </div>
  )
}

export default NewsletterPage

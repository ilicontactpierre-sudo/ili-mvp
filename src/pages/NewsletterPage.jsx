import { useState, useEffect } from 'react'

function NewsletterPage({ password }) {
  const [subscribers, setSubscribers] = useState([])
  const [loadingSubscribers, setLoadingSubscribers] = useState(true)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

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

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setResult({ error: 'Le sujet et le contenu sont requis.' })
      return
    }
    if (!window.confirm(`Envoyer cette newsletter à ${subscribers.filter(s => s.active).length} abonné(s) ?`)) return

    setSending(true)
    setResult(null)

    try {
      const res = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, subject, body })
      })
      const data = await res.json()
      if (data.success) {
        setResult({ success: data.message })
        setSubject('')
        setBody('')
      } else {
        setResult({ error: data.error || 'Erreur inconnue' })
      }
    } catch {
      setResult({ error: 'Erreur réseau' })
    } finally {
      setSending(false)
    }
  }

  const activeCount = subscribers.filter(s => s.active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Abonnés */}
      <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem', backgroundColor: '#fff' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#333' }}>Abonnés</h2>
        {loadingSubscribers ? (
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Chargement…</p>
        ) : (
          <>
            <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#555' }}>
              <strong>{activeCount}</strong> abonné(s) actif(s) sur {subscribers.length} inscrits
            </p>
            {subscribers.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '6px' }}>
                {subscribers.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    borderBottom: i < subscribers.length - 1 ? '1px solid #f5f5f5' : 'none',
                    backgroundColor: s.active ? '#fff' : '#fafafa'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: s.active ? '#333' : '#bbb' }}>{s.email}</span>
                    <span style={{ fontSize: '0.75rem', color: '#bbb' }}>
                      {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Rédiger */}
      <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem', backgroundColor: '#fff' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#333' }}>Rédiger une newsletter</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Sujet de l'email"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <textarea
            placeholder={"Bonjour,\n\nNouvelle histoire disponible sur ILi…\n\nÀ bientôt,\nL'équipe ILi"}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={12}
            style={{ padding: '0.75rem', fontSize: '0.95rem', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical', lineHeight: '1.6', fontFamily: 'inherit' }}
          />
          <div style={{ fontSize: '0.78rem', color: '#aaa' }}>
            Chaque saut de ligne deviendra un paragraphe dans l'email.
          </div>
          <button
            onClick={handleSend}
            disabled={sending || activeCount === 0}
            style={{
              padding: '0.85rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: sending || activeCount === 0 ? '#ccc' : '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: sending || activeCount === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              letterSpacing: '0.02em'
            }}
          >
            {sending ? 'Envoi en cours…' : `Envoyer à ${activeCount} abonné(s)`}
          </button>
          {result?.success && (
            <p style={{ color: '#28a745', fontSize: '0.9rem', margin: 0 }}>✓ {result.success}</p>
          )}
          {result?.error && (
            <p style={{ color: '#dc3545', fontSize: '0.9rem', margin: 0 }}>✗ {result.error}</p>
          )}
        </div>
      </div>

    </div>
  )
}

export default NewsletterPage
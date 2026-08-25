import { useState } from 'react'
function PublishHistoryPanel({ slug, disabled, onPreviewVersion, onRestoreVersion }) {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busySha, setBusySha] = useState(null)

  const fetchHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const adminPassword = sessionStorage.getItem('ili_admin_password')
      if (!adminPassword) throw new Error("Session expirée — reconnecte-toi à l'admin.")
        const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, slug, action: 'history' })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur inconnue')
      setHistory(data.history || [])
    } catch (err) {
      setError(err.message || "Erreur de chargement de l'historique")
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    if (disabled) return
    const next = !isOpen
    setIsOpen(next)
    if (next) fetchHistory()
  }

  const fetchVersion = async (sha) => {
    const adminPassword = sessionStorage.getItem('ili_admin_password')
    if (!adminPassword) throw new Error("Session expirée — reconnecte-toi à l'admin.")
    const response = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, slug, sha, action: 'version' })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Erreur inconnue')
    return data.storyData
  }

  const handlePreview = async (sha) => {
    setBusySha(sha)
    try {
      const storyData = await fetchVersion(sha)
      onPreviewVersion?.(storyData)
    } catch (err) {
      alert("Erreur lors du chargement de l'aperçu : " + err.message)
    } finally {
      setBusySha(null)
    }
  }

  const handleRestore = async (sha, dateLabel) => {
    if (!window.confirm(
      `Republier la version du ${dateLabel} par-dessus la version actuellement en ligne ?\n\n` +
      `La version actuelle restera disponible dans cet historique — tu pourras y revenir à tout moment.`
    )) return
    setBusySha(sha)
    try {
      const storyData = await fetchVersion(sha)
      await onRestoreVersion?.(storyData)
      setIsOpen(false)
    } catch (err) {
      alert('Erreur lors de la restauration : ' + err.message)
    } finally {
      setBusySha(null)
    }
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
  const cleanMessage = (msg) => (msg || '').split('\n')[0].replace(/^story:\s*/, '')

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        disabled={disabled}
        title={disabled ? 'Renseigne le slug pour voir l\'historique' : 'Voir les versions publiées précédemment'}
        style={{
          padding: '0.625rem 1rem',
          fontSize: '0.8125rem',
          backgroundColor: 'rgba(255,255,255,0.06)',
          color: disabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        🕓 Historique des publications {isOpen ? '▲' : '▾'}
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '0.375rem',
          backgroundColor: '#1a1a1e', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          minWidth: '340px', maxHeight: '380px', overflow: 'auto', zIndex: 1000,
        }}>
          <div style={{
            padding: '0.625rem 0.875rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)',
          }}>
            Versions publiées
          </div>
          {loading && (
            <div style={{ padding: '1rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
              Chargement…
            </div>
          )}
          {error && (
            <div style={{ padding: '0.875rem', fontSize: '0.8125rem', color: '#ff8a8a' }}>
              {error}
            </div>
          )}
          {!loading && !error && history.length === 0 && (
            <div style={{ padding: '1rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
              Aucune publication pour l'instant.
            </div>
          )}
          {!loading && !error && history.map((entry, i) => (
            <div
              key={entry.sha}
              style={{
                padding: '0.625rem 0.875rem',
                borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                display: 'flex', flexDirection: 'column', gap: '0.4rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
                  {formatDate(entry.date)}
                  {i === 0 && (
                    <span style={{
                      marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: 700,
                      color: '#28a745', border: '1px solid rgba(40,167,69,0.4)',
                      borderRadius: '4px', padding: '1px 6px',
                    }}>ACTUELLE</span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                  {cleanMessage(entry.message)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handlePreview(entry.sha)}
                  disabled={busySha === entry.sha}
                  style={{
                    flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.72rem',
                    backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px',
                    cursor: busySha === entry.sha ? 'wait' : 'pointer',
                  }}
                >👁 Aperçu</button>
                {i !== 0 && (
                  <button
                    onClick={() => handleRestore(entry.sha, formatDate(entry.date))}
                    disabled={busySha === entry.sha}
                    style={{
                      flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.72rem',
                      backgroundColor: 'rgba(255,193,7,0.15)', color: 'rgba(255,193,7,0.9)',
                      border: '1px solid rgba(255,193,7,0.3)', borderRadius: '4px',
                      cursor: busySha === entry.sha ? 'wait' : 'pointer',
                    }}
                  >{busySha === entry.sha ? '…' : '↺ Restaurer'}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export default PublishHistoryPanel
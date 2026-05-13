import { useState, useEffect, useCallback, useRef } from 'react'

function DraftManager({
  title,
  author,
  slug,
  segments,
  soundTracks,
  onRestore,
  onOpenPreview
}) {
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [saveLabel, setSaveLabel] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [draftInfo, setDraftInfo] = useState(null)
  const [saveFeedback, setSaveFeedback] = useState('')
  const autoSaveTimerRef = useRef(null)
  const historyRef = useRef(null)

  // Clés localStorage
  const draftKey = slug ? `ili_draft_${slug}` : 'ili_draft_unsaved'
  const historyKey = slug ? `ili_history_${slug}` : 'ili_history_unsaved'

  // Charger l'historique et vérifier les brouillons au montage
  useEffect(() => {
    try {
      // Charger l'historique
      const savedHistory = localStorage.getItem(historyKey)
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory))
      }

      // Vérifier s'il existe un brouillon
      const savedDraft = localStorage.getItem(draftKey)
      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        setDraftInfo(draft)
        setShowDraftBanner(true)
      }
    } catch (err) {
      console.error('Erreur chargement brouillon:', err)
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [draftKey, historyKey])

  // Fermer le dropdown histoire quand on clic en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (historyRef.current && !historyRef.current.contains(event.target)) {
        setShowHistory(false)
      }
    }

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showHistory])

  // Créer un snapshot des données courantes
  const createSnapshot = useCallback((label) => {
    const now = new Date()
    return {
      savedAt: now.toISOString(),
      label: label || `Auto-save ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      title: title || 'Sans titre',
      author: author || '',
      slug: slug || '',
      segments: segments || [],
      soundTracks: soundTracks || []
    }
  }, [title, author, slug, segments, soundTracks])

  // Sauvegarder dans localStorage
  const saveDraft = useCallback((label) => {
    const snapshot = createSnapshot(label)

    try {
      // Sauvegarder le brouillon courant
      localStorage.setItem(draftKey, JSON.stringify(snapshot))

      // Mettre à jour l'historique (FIFO, max 5 versions)
      const newHistory = [snapshot]
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')
      
      // Ne pas ajouter de doublon si même label et même contenu
      const isDuplicate = existingHistory.length > 0 && 
        existingHistory[0].label === snapshot.label &&
        JSON.stringify(existingHistory[0].segments) === JSON.stringify(snapshot.segments)
      
      if (!isDuplicate) {
        newHistory.push(...existingHistory)
      }
      
      // Garder seulement les 5 dernières versions
      if (newHistory.length > 5) {
        newHistory.splice(5)
      }
      
      localStorage.setItem(historyKey, JSON.stringify(newHistory))
      setHistory(newHistory)

      // Mettre à jour l'état
      setLastSavedAt(new Date())
      setSaveLabel(snapshot.label)

      return true
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
      return false
    }
  }, [createSnapshot, draftKey, historyKey])

  // Auto-save 30 secondes après la dernière modification
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft()
    }, 30000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [segments, soundTracks, title, author, slug, saveDraft])

  // Sauvegarde avant fermeture de la page
  useEffect(() => {
    function handleBeforeUnload(event) {
      const now = new Date()
      const label = `Auto-save ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      saveDraft(label)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveDraft])

  // Formater le temps écoulé depuis la dernière sauvegarde
  const formatTimeAgo = (date) => {
    if (!date) return ''
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    
    if (diff < 60) return `il y a ${diff}s`
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
    return `il y a ${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`
  }

  // Gestionnaire de sauvegarde manuelle
  const handleManualSave = () => {
    const success = saveDraft('Manuel')
    if (success) {
      setSaveFeedback('✓ Sauvegardé')
      setTimeout(() => setSaveFeedback(''), 2000)
    }
  }

  // Restaurer une version de l'historique
  const handleRestore = (snapshot) => {
    if (!window.confirm(`Restaurer cette version ?\n"${snapshot.label}"\n\nLes modifications non sauvegardées seront perdues.`)) {
      return
    }

    if (onRestore) {
      onRestore(snapshot)
    }
    setShowHistory(false)
  }

  // Restaurer le brouillon existant
  const handleRestoreDraft = () => {
    if (!draftInfo) return
    
    if (!window.confirm(`Restaurer le brouillon existant ?\n"${draftInfo.label}"\n\nLes modifications non sauvegardées seront perdues.`)) {
      return
    }

    if (onRestore) {
      onRestore(draftInfo)
    }
    setShowDraftBanner(false)
    setDraftInfo(null)
  }

  // Ignorer le brouillon existant
  const handleIgnoreDraft = () => {
    setShowDraftBanner(false)
    setDraftInfo(null)
  }

  // Calculer le nombre de segments pour l'affichage
  const getSegmentCount = (snapshot) => {
    return snapshot.segments ? snapshot.segments.length : 0
  }

  return (
    <>
      {/* Bannière de brouillon existant */}
      {showDraftBanner && draftInfo && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-bg-accent)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.875rem'
        }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Un brouillon existe ({draftInfo.label})
          </span>
          <button
            onClick={handleRestoreDraft}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Restaurer
          </button>
          <button
            onClick={handleIgnoreDraft}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Ignorer
          </button>
        </div>
      )}

      {/* Barre de statut DraftManager */}
      <div style={{
        position: 'sticky',
        top: showDraftBanner ? 52 : 0,
        zIndex: 99,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
        fontSize: '0.875rem'
      }}>
        {/* Logo + Titre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-text-focus)' }}>
            ⬡ ILi Admin
          </span>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {title || 'Sans titre'}
          </span>
        </div>

        {/* Statut + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Statut de sauvegarde */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
            <span style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              backgroundColor: lastSavedAt ? '#28a745' : '#dc3545' 
            }} />
            {saveFeedback || (lastSavedAt ? `Sauvegardé ${formatTimeAgo(lastSavedAt)}` : 'Non sauvegardé')}
          </div>

          {/* Bouton Aperçu */}
          {onOpenPreview && (
            <button
              onClick={onOpenPreview}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: 'var(--color-bg-accent)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              👁 Aperçu
            </button>
          )}

          {/* Bouton Sauvegarder */}
          <button
            onClick={handleManualSave}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: saveFeedback ? '#28a745' : 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {saveFeedback || 'Sauvegarder'}
          </button>

          {/* Dropdown Historique */}
          <div style={{ position: 'relative' }} ref={historyRef}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Historique {showHistory ? '▲' : '▾'}
            </button>

            {showHistory && history.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.25rem',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '280px',
                maxHeight: '400px',
                overflow: 'auto',
                zIndex: 1000
              }}>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid var(--color-border)',
                  fontWeight: 'bold',
                  fontSize: '0.875rem'
                }}>
                  Historique ({history.length} version{history.length > 1 ? 's' : ''})
                </div>
                {history.map((snapshot, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderBottom: index < history.length - 1 ? '1px solid var(--color-border)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{snapshot.label}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                        {new Date(snapshot.savedAt).toLocaleString('fr-FR')} — {getSegmentCount(snapshot)} segments
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(snapshot)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      Restaurer
                    </button>
                  </div>
                ))}
                {history.length === 0 && (
                  <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.875rem'
                  }}>
                    Aucun historique disponible
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default DraftManager
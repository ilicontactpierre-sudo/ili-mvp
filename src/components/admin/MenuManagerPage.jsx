import { useState, useEffect, useRef, useCallback } from 'react'
import TagsInput from './TagsInput'

// ── Déduit la liste de tous les tags connus depuis les histoires existantes ──
function extractKnownTags(stories) {
  const set = new Set()
  stories.forEach(s => {
    ;(s.tags || []).forEach(t => set.add(t))
    // Rétro-compat : on suggère aussi les anciens mood/genre texte libre, séparés par virgule
    ;[s.mood, s.genre].forEach(field => {
      if (!field) return
      field.split(/[,;·]/).map(f => f.trim()).filter(Boolean).forEach(f => set.add(f))
    })
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'fr'))
}

function MenuManagerPage({ password }) {
  const [stories, setStories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | success | error
  const [saveError, setSaveError] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  // ── Drag & drop réordonnancement ──
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  useEffect(() => {
    fetch('/stories/index.json')
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : [])
        // Normaliser : ordre initial = position dans le tableau
        const normalized = arr.map((s, i) => ({
          ...s,
          tags: s.tags || [],
          order: s.order ?? i,
          hidden: s.hidden ?? false,
        })).sort((a, b) => a.order - b.order)
        setStories(normalized)
      })
      .catch(() => setStories([]))
      .finally(() => setIsLoading(false))
  }, [])

  const knownTags = extractKnownTags(stories)

  const updateStory = useCallback((id, patch) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    setHasChanges(true)
  }, [])

  const handleDragStart = (index) => setDraggedIndex(index)
  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (index !== dragOverIndex) setDragOverIndex(index)
  }
  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    setStories(prev => {
      const next = [...prev]
      const [moved] = next.splice(draggedIndex, 1)
      next.splice(index, 0, moved)
      return next.map((s, i) => ({ ...s, order: i }))
    })
    setDraggedIndex(null)
    setDragOverIndex(null)
    setHasChanges(true)
  }
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const toSave = stories.map((s, i) => ({ ...s, order: i }))
      const res = await fetch('/api/manage-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, stories: toSave }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveStatus('success')
        setHasChanges(false)
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveError(data.error || 'Erreur inconnue')
        setSaveStatus('error')
      }
    } catch (err) {
      setSaveError(err.message || 'Erreur de connexion')
      setSaveStatus('error')
    }
  }

  if (isLoading) {
    return <div style={{ padding: '2rem', color: '#999' }}>Chargement…</div>
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#222' }}>Gestion du menu</h2>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#888' }}>
            Glisse les lignes pour réordonner. Les tags servent à filtrer et regrouper les histoires dans le Player.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saveStatus === 'saving'}
          style={{
            padding: '0.65rem 1.4rem',
            fontSize: '0.88rem',
            fontWeight: 600,
            backgroundColor: hasChanges ? '#28a745' : '#e0e0e0',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
          }}
        >
          {saveStatus === 'saving' ? 'Enregistrement…' : hasChanges ? 'Enregistrer les changements' : 'Aucun changement'}
        </button>
      </div>

      {saveStatus === 'success' && (
        <div style={{ padding: '0.6rem 1rem', marginBottom: '1rem', backgroundColor: 'rgba(40,167,69,0.1)', border: '1px solid rgba(40,167,69,0.25)', borderRadius: '6px', fontSize: '0.82rem', color: '#1f7a36' }}>
          ✓ Menu mis à jour avec succès.
        </div>
      )}
      {saveStatus === 'error' && (
        <div style={{ padding: '0.6rem 1rem', marginBottom: '1rem', backgroundColor: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.25)', borderRadius: '6px', fontSize: '0.82rem', color: '#b02a37' }}>
          ✗ {saveError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {stories.map((story, index) => (
          <div
            key={story.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              backgroundColor: dragOverIndex === index ? 'rgba(99,102,241,0.06)' : story.hidden ? '#fafafa' : '#fff',
              border: `1px solid ${dragOverIndex === index ? 'rgba(99,102,241,0.35)' : '#e5e7eb'}`,
              borderRadius: '8px',
              opacity: draggedIndex === index ? 0.4 : 1,
              transition: 'background-color 0.12s ease, opacity 0.12s ease',
            }}
          >
            {/* Handle drag */}
            <div
              style={{
                cursor: 'grab',
                color: '#bbb',
                fontSize: '0.95rem',
                padding: '0.3rem 0.2rem',
                lineHeight: 1,
                userSelect: 'none',
                flexShrink: 0,
              }}
              title="Glisser pour réordonner"
            >⠿</div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: story.hidden ? '#aaa' : '#222' }}>
                  {story.title}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#999' }}>{story.author}</span>
                <span style={{ fontSize: '0.7rem', color: '#ccc', fontFamily: 'monospace' }}>{story.id}</span>
              </div>

              <TagsInput
                value={story.tags}
                suggestions={knownTags}
                placeholder="Ajouter des tags (genre, humeur, collection…)"
                onChange={(newTags) => updateStory(story.id, { tags: newTags })}
              />
            </div>

            {/* Toggle visible/caché */}
            <button
              onClick={() => updateStory(story.id, { hidden: !story.hidden })}
              title={story.hidden ? 'Histoire cachée — cliquer pour afficher' : 'Histoire visible — cliquer pour cacher'}
              style={{
                flexShrink: 0,
                width: '40px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                background: story.hidden ? '#e0e0e0' : '#28a745',
                cursor: 'pointer',
                position: 'relative',
                marginTop: '0.3rem',
                transition: 'background-color 0.2s ease',
              }}
            >
              <span style={{
                position: 'absolute',
                top: '3px',
                left: story.hidden ? '3px' : '19px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              }} />
            </button>
          </div>
        ))}

        {stories.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
            Aucune histoire trouvée.
          </p>
        )}
      </div>
    </div>
  )
}

export default MenuManagerPage

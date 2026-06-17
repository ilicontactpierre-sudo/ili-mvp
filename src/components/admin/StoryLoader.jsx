import { useState, useEffect } from 'react'

function StoryLoader({ onLoadStory, onPreviewStory }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [stories, setStories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingStoryId, setDeletingStoryId] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [isLocalDev, setIsLocalDev] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [sortOrder, setSortOrder] = useState('chronological') // 'chronological' | 'alphabetical'

  const sortedStories = [...stories].sort((a, b) => {
    if (sortOrder === 'alphabetical') {
      return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' })
    }
    return 0 // chronological = ordre du tableau d'origine
  })

  useEffect(() => {
    const hostname = window.location.hostname
    setIsLocalDev(hostname === 'localhost' || hostname === '127.0.0.1')
  }, [])

  const loadStoriesIndex = async () => {
    if (isExpanded) {
      setIsExpanded(false)
      return
    }
    setIsExpanded(true)
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/stories/index.json?t=' + Date.now())
      if (!response.ok) throw new Error('Impossible de charger l\'index des histoires')
      const data = await response.json()
      const storiesArray = Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : [])
      setStories(storiesArray)
    } catch (err) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle visibilité dans le Player
  const handleToggleVisibility = async (story) => {
    if (isLocalDev) {
      alert('La modification de visibilité fonctionne uniquement en production (Vercel).')
      return
    }
    const adminPassword = sessionStorage.getItem('ili_admin_password')
    if (!adminPassword) {
      alert('Session expirée. Reconnecte-toi.')
      return
    }

    setTogglingId(story.id)
    const newHidden = !story.hidden

    try {
      const response = await fetch('/api/toggle-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          slug: story.id,
          hidden: newHidden
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur inconnue')

      // Mettre à jour l'état local sans recharger
      setStories(prev =>
        prev.map(s =>
          s.id === story.id
            ? { ...s, hidden: newHidden }
            : s
        )
      )
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  // Convertir audioEvents → soundTracks (algorithme de référence)
  const convertAudioEventsToTracks = (normalizedSegments, soundLibrary) => {
    const tracks = []
    let trackIdCounter = 0
    normalizedSegments.forEach(segment => {
      if (!segment.audioEvents || segment.audioEvents.length === 0) return
      segment.audioEvents.forEach(event => {
        if (event.action === 'stop' || event.action === 'fadeOut') return
        const segIdx = normalizedSegments.findIndex(s => String(s.id) === String(segment.id))
        const prevSegId = segIdx > 0 ? normalizedSegments[segIdx - 1].id : null
        const existingTrack = tracks.find(t =>
          t.soundId === event.soundId &&
          prevSegId != null &&
          String(t.endSegmentId) === String(prevSegId)
        )
        if (existingTrack) {
          existingTrack.endSegmentId = segment.id
        } else {
          const soundInfo = soundLibrary ? soundLibrary.find(s => s.id === event.soundId) : null
          const activeTracksOnSegment = tracks.filter(t => {
            const startIdx = normalizedSegments.findIndex(s => String(s.id) === String(t.startSegmentId))
            const endIdx = normalizedSegments.findIndex(s => String(s.id) === String(t.endSegmentId))
            const curIdx = normalizedSegments.findIndex(s => String(s.id) === String(segment.id))
            return startIdx <= curIdx && curIdx <= endIdx
          })
          tracks.push({
            id: `track_${trackIdCounter++}`,
            soundId: event.soundId,
            startSegmentId: segment.id,
            endSegmentId: segment.id,
            column: activeTracksOnSegment.length % 6,
            volume: event.volume ?? 0.5,
            fadeIn: event.action === 'fadeIn' ? (event.duration || 0) : 0,
            fadeOut: 0,
            loop: event.loop || false,
            muted: false,
            delay: event.delay || 0
          })
        }
      })
      segment.audioEvents.forEach(event => {
        if (event.action === 'fadeOut' || event.action === 'stop') {
          const track = tracks.find(t =>
            t.soundId === event.soundId &&
            (() => {
              const endIdx = normalizedSegments.findIndex(s => String(s.id) === String(t.endSegmentId))
              const curIdx = normalizedSegments.findIndex(s => String(s.id) === String(segment.id))
              return curIdx >= endIdx - 1
            })()
          )
          if (track) {
            track.endSegmentId = segment.id
            if (event.action === 'fadeOut') track.fadeOut = event.duration || 0
          }
        }
      })
    })
    return tracks
  }

  const handleEdit = async (storyId) => {
    try {
      const response = await fetch(`/stories/${storyId}.json?t=${Date.now()}`)
      if (!response.ok) throw new Error(`Impossible de charger l'histoire "${storyId}"`)
      const data = await response.json()
      const normalizedSegments = (data.segments || []).map((seg, index) => {
        if (seg && typeof seg.text === 'string') {
          return { ...seg, id: seg.id ?? `seg_${index}` }
        }
        if (seg && typeof seg === 'object') {
          const numericKeys = Object.keys(seg).filter(key => String(Number(key)) === key)
          if (numericKeys.length > 0) {
            const text = numericKeys.sort((a, b) => Number(a) - Number(b)).map(key => seg[key]).join('')
            return { ...seg, id: seg.id ?? `seg_${index}`, text }
          }
        }
        return typeof seg === 'string'
          ? { id: `seg_${index}`, text: seg, audioEvents: [] }
          : { ...seg, id: seg.id ?? `seg_${index}`, text: seg?.text || '', audioEvents: seg?.audioEvents || [] }
      })
      const soundLibrary = data.sounds || []
      let soundTracks = []
      if (data.soundTracks && data.soundTracks.length > 0) {
        soundTracks = data.soundTracks
      } else {
        const hasAudioEvents = normalizedSegments.some(s => s.audioEvents && s.audioEvents.length > 0)
        if (hasAudioEvents) soundTracks = convertAudioEventsToTracks(normalizedSegments, soundLibrary)
      }
      if (onLoadStory) {
        onLoadStory({
          title:       data.title       || '',
          author:      data.author      || '',
          slug:        data.id          || storyId,
          bookUrl:     data.bookUrl     || '',
          mood:        data.mood        || '',
          genre:       data.genre       || '',
          description: data.description || '',
          seuil:       data.seuil       || [],
          // Mode série
          type:        data.type        || 'simple',
          parts:       data.parts       || [],
          // Mode simple
          segments:    normalizedSegments,
          soundTracks,
          vfxTracks:   data.vfxTracks   || [],
          sounds:      soundLibrary
        })
      }
      setIsExpanded(false)
    } catch (err) {
      setError(err.message || 'Erreur de chargement')
    }
  }

  const handlePreview = async (storyId) => {
    try {
      const response = await fetch(`/stories/${storyId}.json`)
      if (!response.ok) throw new Error(`Impossible de charger l'histoire "${storyId}"`)
      const data = await response.json()
      const normalizedSegments = (data.segments || []).map((seg, index) => {
        if (seg && typeof seg.text === 'string') {
          return { id: seg.id || `seg_${index}`, text: seg.text, audioEvents: seg.audioEvents || [] }
        }
        if (seg && typeof seg === 'object') {
          const numericKeys = Object.keys(seg).filter(key => String(Number(key)) === key)
          if (numericKeys.length > 0) {
            const text = numericKeys.sort((a, b) => Number(a) - Number(b)).map(key => seg[key]).join('')
            return { id: seg.id || `seg_${index}`, text, audioEvents: seg.audioEvents || [] }
          }
        }
        return typeof seg === 'string'
          ? { id: `seg_${index}`, text: seg, audioEvents: [] }
          : { id: `seg_${index}`, text: '', audioEvents: [] }
      })
      if (onPreviewStory) {
        onPreviewStory({
          title: data.title || '',
          author: data.author || '',
          segments: normalizedSegments,
          soundTracks: data.soundTracks || [],
          sounds: data.sounds || []
        })
      }
    } catch (err) {
      setError(err.message || 'Erreur de chargement')
    }
  }

  const handleDeleteClick = (storyId) => {
    setDeletingStoryId(storyId)
    setDeletePassword('')
  }

  const handleDeleteConfirm = async () => {
    if (!deletePassword.trim()) return
    if (isLocalDev) {
      alert('Suppression non disponible en local. Cette fonctionnalité fonctionne uniquement en production.')
      return
    }
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: deletingStoryId, password: deletePassword })
      })
      if (!response.ok) {
        const text = await response.text()
        let message = 'Erreur lors de la suppression'
        try { message = JSON.parse(text).error || text } catch { message = text }
        throw new Error(message)
      }
      const indexResponse = await fetch('/stories/index.json')
      if (indexResponse.ok) {
        const data = await indexResponse.json()
        setStories(Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : []))
      }
      setDeletingStoryId(null)
      setDeletePassword('')
      alert('Histoire supprimée avec succès')
    } catch (error) {
      alert('Erreur lors de la suppression: ' + error.message)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingStoryId(null)
    setDeletePassword('')
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      marginBottom: '2rem',
      overflow: 'hidden'
    }}>
      {/* En-tête collapsible */}
      <button
        onClick={loadStoriesIndex}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          backgroundColor: 'var(--color-bg-accent)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 500,
          color: 'var(--color-text)',
          textAlign: 'left'
        }}
      >
        <span>↓ Charger une histoire existante</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          {isExpanded ? '▲' : '▾'}
        </span>
      </button>

      {/* Contenu déployable */}
      {isExpanded && (
        <div style={{ padding: '1.5rem' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
              Chargement des histoires...
            </div>
          )}
          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(220,53,69,0.08)',
              border: '1px solid rgba(220,53,69,0.2)',
              borderRadius: '4px',
              color: '#dc3545',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}
          {!isLoading && !error && stories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
              Aucune histoire trouvée dans /public/stories/index.json
            </div>
          )}
          {!isLoading && !error && stories.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Barre de tri + compteur */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {stories.length} histoire{stories.length > 1 ? 's' : ''}
                </span>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  {[
                    { value: 'chronological', label: '🕐 Récent' },
                    { value: 'alphabetical',  label: 'A→Z' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSortOrder(value)}
                      style={{
                        padding: '0.25rem 0.625rem',
                        fontSize: '0.75rem',
                        backgroundColor: sortOrder === value ? 'var(--color-primary)' : 'transparent',
                        color: sortOrder === value ? 'white' : 'var(--color-text-secondary)',
                        border: `1px solid ${sortOrder === value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Liste défilante */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '420px',
                overflowY: 'auto',
                paddingRight: '0.25rem',
              }}>
              {sortedStories.map((story, index) => {
                const isVisible = !story.hidden
                const isToggling = togglingId === story.id

                return (
                  <div
                    key={story.id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
                  >
                    {/* Indicateur de visibilité */}
                    <button
                      onClick={() => handleToggleVisibility(story)}
                      disabled={isToggling}
                      title={isVisible ? 'Visible dans le Player — cliquer pour masquer' : 'Masqué du Player — cliquer pour publier'}
                      style={{
                        flexShrink: 0,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: isVisible
                          ? '1.5px solid rgba(74, 222, 128, 0.4)'
                          : '1.5px solid rgba(255,255,255,0.15)',
                        backgroundColor: isVisible
                          ? 'rgba(74, 222, 128, 0.08)'
                          : 'transparent',
                        cursor: isToggling ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        padding: 0,
                        outline: 'none'
                      }}
                    >
                      {isToggling ? (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          border: '1.5px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'rgba(255,255,255,0.7)',
                          display: 'inline-block',
                          animation: 'spin 0.7s linear infinite'
                        }} />
                      ) : (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isVisible
                            ? 'rgb(74, 222, 128)'
                            : 'rgba(255,255,255,0.2)',
                          boxShadow: isVisible
                            ? '0 0 6px rgba(74, 222, 128, 0.6)'
                            : 'none',
                          transition: 'all 0.2s ease',
                          display: 'block'
                        }} />
                      )}
                    </button>

                    {/* Titre + auteur */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        color: story.hidden ? 'var(--color-text-secondary)' : 'var(--color-text)'
                      }}>
                        {story.title || 'Sans titre'}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        {story.author || 'Auteur inconnu'} — ID: {story.id}
                        {story.hidden && (
                          <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.25)',
                            fontStyle: 'italic'
                          }}>
                            masquée
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      flexShrink: 0,
                    }}>
                      <button
                        onClick={() => handleEdit(story.id)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ✏️ Modifier
                      </button>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => handlePreview(story.id)}
                          style={{
                            flex: 1,
                            padding: '0.35rem 0.5rem',
                            backgroundColor: 'var(--color-bg-accent)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          👁
                        </button>
                        <button
                          onClick={() => handleDeleteClick(story.id)}
                          style={{
                            flex: 1,
                            padding: '0.35rem 0.5rem',
                            backgroundColor: 'rgba(220,53,69,0.15)',
                            color: '#dc3545',
                            border: '1px solid rgba(220,53,69,0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>{/* fin liste défilante */}
            </div>
          )}
          {/* Légende */}
          {!isLoading && stories.length > 0 && (
            <div style={{
              marginTop: '1rem',
              paddingTop: '0.875rem',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: 'rgb(74, 222, 128)',
                  boxShadow: '0 0 5px rgba(74,222,128,0.5)',
                  display: 'inline-block'
                }} />
                visible dans le Player
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'inline-block'
                }} />
                masquée du Player
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spinner keyframe injecté */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Dialogue de confirmation de suppression */}
      {deletingStoryId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Confirmer la suppression
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--color-text-secondary)', lineHeight: 1.5, fontSize: '0.875rem' }}>
              Cette action est <strong style={{ color: 'var(--color-text)' }}>irréversible</strong>. Le fichier histoire sera supprimé de GitHub.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                Mot de passe admin
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDeleteConfirm()}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleDeleteCancel}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8125rem'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!deletePassword.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: deletePassword.trim() ? 'rgba(220,53,69,0.85)' : 'rgba(255,255,255,0.08)',
                  color: deletePassword.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: deletePassword.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.8125rem',
                  fontWeight: 500
                }}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StoryLoader
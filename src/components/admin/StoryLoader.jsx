import { useState, useEffect } from 'react'

function StoryLoader({ onLoadStory, onPreviewStory }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [stories, setStories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedStory, setSelectedStory] = useState(null)
  const [deletingStoryId, setDeletingStoryId] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [isLocalDev, setIsLocalDev] = useState(false)

  // Charger l'index des histoires quand on déplie la section
  const loadStoriesIndex = async () => {
    if (!isExpanded) {
      setIsExpanded(true)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/stories/index.json')
      if (!response.ok) {
        throw new Error('Impossible de charger l\'index des histoires')
      }
      const data = await response.json()
      console.log('Données brutes de index.json:', data)
      // Gérer à la fois le format { stories: [...] } et le format tableau direct [...]
      const storiesArray = Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : [])
      console.log('Histoires extraites:', storiesArray)
      setStories(storiesArray)
    } catch (err) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }

  // Convertir audioEvents → soundTracks (algorithme de référence)
  const convertAudioEventsToTracks = (normalizedSegments, soundLibrary) => {
    const tracks = []
    let trackIdCounter = 0

    normalizedSegments.forEach(segment => {
      if (!segment.audioEvents || segment.audioEvents.length === 0) return

      // Passe 1 : traiter les events play/fadeIn pour créer ou étendre les tracks
      segment.audioEvents.forEach(event => {
        if (event.action === 'stop' || event.action === 'fadeOut') return

        // Cherche un track existant pour ce son dont l'endSegmentId est le segment précédent
        const segIdx = normalizedSegments.findIndex(s => String(s.id) === String(segment.id))
        const prevSegId = segIdx > 0 ? normalizedSegments[segIdx - 1].id : null

        const existingTrack = tracks.find(t =>
          t.soundId === event.soundId &&
          prevSegId != null &&
          String(t.endSegmentId) === String(prevSegId)
        )

        if (existingTrack) {
          // Étend le track existant à ce segment
          existingTrack.endSegmentId = segment.id
        } else {
          // Crée un nouveau track
          const soundInfo = soundLibrary ? soundLibrary.find(s => s.id === event.soundId) : null
          const category = soundInfo?.categories?.[0] || 'autre'

          // Calculer la colonne : première colonne libre parmi les tracks actifs sur ce segment
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

      // Passe 2 : appliquer les fadeOut/stop pour fermer les tracks
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
            if (event.action === 'fadeOut') {
              track.fadeOut = event.duration || 0
            }
          }
        }
      })
    })

    return tracks
  }

  // Charger une histoire dans l'éditeur
  const handleEdit = async (storyId) => {
    try {
      const response = await fetch(`/stories/${storyId}.json`)
      if (!response.ok) {
        throw new Error(`Impossible de charger l'histoire "${storyId}"`)
      }
      const data = await response.json()

      // Normaliser les segments : s'assurer qu'ils ont tous un champ text et id
      const normalizedSegments = (data.segments || []).map((seg, index) => {
        // Si le segment a déjà un champ text, on le garde
        if (seg && typeof seg.text === 'string') {
          return {
            id: seg.id ?? `seg_${index}`,
            text: seg.text,
            audioEvents: seg.audioEvents || []
          }
        }
        
        // Si le segment est un objet avec des clés numériques (ancien format bugué)
        if (seg && typeof seg === 'object') {
          const numericKeys = Object.keys(seg).filter(key => String(Number(key)) === key)
          if (numericKeys.length > 0) {
            const text = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map(key => seg[key])
              .join('')
            return {
              id: seg.id ?? `seg_${index}`,
              text: text,
              audioEvents: seg.audioEvents || []
            }
          }
        }
        
        return typeof seg === 'string'
          ? { id: `seg_${index}`, text: seg, audioEvents: [] }
          : { id: `seg_${index}`, text: '', audioEvents: [] }
      })

      // Construire la soundLibrary depuis data.sounds pour la conversion
      const soundLibrary = data.sounds || []

      // Déterminer les soundTracks :
      // - Si le JSON a déjà des soundTracks (format éditeur), les utiliser
      // - Sinon, convertir depuis audioEvents (format player)
      let soundTracks = []
      if (data.soundTracks && data.soundTracks.length > 0) {
        soundTracks = data.soundTracks
      } else {
        const hasAudioEvents = normalizedSegments.some(s => s.audioEvents && s.audioEvents.length > 0)
        if (hasAudioEvents) {
          soundTracks = convertAudioEventsToTracks(normalizedSegments, soundLibrary)
        }
      }

      // Appeler le callback avec les données converties
      if (onLoadStory) {
        onLoadStory({
          title: data.title || '',
          author: data.author || '',
          slug: data.id || storyId,
          segments: normalizedSegments,
          soundTracks: soundTracks,
          sounds: soundLibrary
        })
      }

      // Fermer la section après chargement
      setIsExpanded(false)
    } catch (err) {
      setError(err.message || 'Erreur de chargement')
    }
  }

  useEffect(() => {
    const hostname = window.location.hostname
    setIsLocalDev(hostname === 'localhost' || hostname === '127.0.0.1')
  }, [])

  // Ouvrir l'aperçu d'une histoire
  const handlePreview = async (storyId) => {
    try {
      const response = await fetch(`/stories/${storyId}.json`)
      if (!response.ok) {
        throw new Error(`Impossible de charger l'histoire "${storyId}"`)
      }
      const data = await response.json()

      // Normaliser les segments pour l'aperçu aussi
      const normalizedSegments = (data.segments || []).map((seg, index) => {
        if (seg && typeof seg.text === 'string') {
          return { id: seg.id || `seg_${index}`, text: seg.text, audioEvents: seg.audioEvents || [] }
        }
        if (seg && typeof seg === 'object') {
          const numericKeys = Object.keys(seg).filter(key => String(Number(key)) === key)
          if (numericKeys.length > 0) {
            const text = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map(key => seg[key])
              .join('')
            return { id: seg.id || `seg_${index}`, text: text, audioEvents: seg.audioEvents || [] }
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

  // Gestion de la suppression
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: deletingStoryId,
          password: deletePassword,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        let message = 'Erreur lors de la suppression'
        if (text) {
          try {
            const json = JSON.parse(text)
            message = json.error || json.message || text
          } catch {
            message = text
          }
        }
        throw new Error(message)
      }

      // Recharger la liste des histoires
      const indexResponse = await fetch('/stories/index.json')
      if (indexResponse.ok) {
        const data = await indexResponse.json()
        const storiesArray = Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : [])
        setStories(storiesArray)
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
              backgroundColor: '#fff3f3',
              border: '1px solid #ffcccc',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stories.map((story, index) => (
                <div
                  key={story.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                      {story.title || 'Sans titre'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {story.author || 'Auteur inconnu'} — ID: {story.id}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handlePreview(story.id)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        backgroundColor: 'var(--color-bg-accent)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      👁 Aperçu
                    </button>
                    <button
                      onClick={() => handleEdit(story.id)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteClick(story.id)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogue de confirmation de suppression */}
      {deletingStoryId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-text)'
            }}>
              Confirmer la suppression
            </h3>
            <p style={{
              margin: '0 0 1rem 0',
              color: 'var(--color-text)',
              lineHeight: 1.5
            }}>
              Êtes-vous sûr de vouloir supprimer cette histoire ?<br />
              <strong>Cette action est irréversible.</strong>
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                color: 'var(--color-text)',
                fontWeight: 500
              }}>
                Mot de passe admin:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Entrez le mot de passe"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleDeleteCancel}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--color-bg-accent)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!deletePassword.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: deletePassword.trim() ? '#dc3545' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: deletePassword.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem'
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StoryLoader
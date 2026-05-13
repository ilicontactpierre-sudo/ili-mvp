import { useState } from 'react'

function StoryLoader({ onLoadStory, onPreviewStory }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [stories, setStories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedStory, setSelectedStory] = useState(null)

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

  // Charger une histoire dans l'éditeur
  const handleEdit = async (storyId) => {
    try {
      const response = await fetch(`/stories/${storyId}.json`)
      if (!response.ok) {
        throw new Error(`Impossible de charger l'histoire "${storyId}"`)
      }
      const data = await response.json()

      // Conversion audioEvents -> soundTracks si nécessaire (ancien format)
      let soundTracks = data.soundTracks || []
      
      // Normaliser les segments : s'assurer qu'ils ont tous un champ text et id
      const normalizedSegments = (data.segments || []).map((seg, index) => {
        // Si le segment a déjà un champ text, on le garde
        if (seg && typeof seg.text === 'string') {
          return {
            id: seg.id || `segment_${index}`,
            text: seg.text,
            audioEvents: seg.audioEvents || [],
            ...seg
          }
        }
        
        // Si le segment est un objet avec des clés numériques (ancien format bugué)
        if (seg && typeof seg === 'object') {
          const numericKeys = Object.keys(seg).filter(key => String(Number(key)) === key)
          if (numericKeys.length > 0) {
            // Reconstruire le texte à partir des clés numériques
            const text = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map(key => seg[key])
              .join('')
            return {
              id: seg.id || `segment_${index}`,
              text: text,
              audioEvents: seg.audioEvents || []
            }
          }
        }
        
        // Segment déjà au bon format ou string
        return typeof seg === 'string' 
          ? { id: `segment_${index}`, text: seg, audioEvents: [] }
          : { id: `segment_${index}`, text: '', audioEvents: [] }
      })
      
      if (normalizedSegments.length > 0) {
        // Vérifier si les segments ont des audioEvents (ancien format)
        const hasAudioEvents = normalizedSegments.some(s => s.audioEvents && s.audioEvents.length > 0)
        
        if (hasAudioEvents && soundTracks.length === 0) {
          // Convertir audioEvents en soundTracks
          soundTracks = []
          normalizedSegments.forEach((segment, segIndex) => {
            if (segment.audioEvents) {
              segment.audioEvents.forEach((ae, aeIndex) => {
                soundTracks.push({
                  id: `st_${segIndex}_${aeIndex}`,
                  soundId: ae.soundId,
                  startSegmentId: segment.id,
                  endSegmentId: segment.id,
                  startOffset: ae.delay || 0,
                  volume: ae.volume || 0.5,
                  loop: ae.loop || false,
                  muted: ae.muted || false
                })
              })
            }
          })
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
          sounds: data.sounds || []
        })
      }

      // Fermer la section après chargement
      setIsExpanded(false)
    } catch (err) {
      setError(err.message || 'Erreur de chargement')
    }
  }

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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StoryLoader
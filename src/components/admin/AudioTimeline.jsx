import { useState, useRef, useCallback } from 'react'
import SoundBlock from './SoundBlock'
import SoundBlockPanel from './SoundBlockPanel'
import SoundLibraryPicker from './SoundLibraryPicker'
import { SEGMENT_HEIGHT, COLUMN_COUNT, COLUMN_WIDTH } from './constants'

function AudioTimeline({ 
  segments, 
  soundTracks, 
  soundLibrary,
  onSoundTracksChange,
  onSaveToHistory
}) {
  const [selectedSoundId, setSelectedSoundId] = useState(null)
  const [editingSoundTrack, setEditingSoundTrack] = useState(null)
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  const [pickerTargetPosition, setPickerTargetPosition] = useState({ segmentIndex: 0, column: 0 })
  
  const segmentsRef = useRef(null)
  const scrollContainerRef = useRef(null)

  // Synchroniser le scroll entre les segments et la timeline
  const handleSegmentScroll = useCallback((e) => {
    if (scrollContainerRef.current && scrollContainerRef.current !== e.target) {
      scrollContainerRef.current.scrollTop = e.target.scrollTop
    }
  }, [])

  const handleTimelineScroll = useCallback((e) => {
    if (segmentsRef.current && segmentsRef.current !== e.target) {
      segmentsRef.current.scrollTop = e.target.scrollTop
    }
  }, [])

  // Gérer le double-clic sur une cellule vide de la timeline
  const handleTimelineDoubleClick = useCallback((e) => {
    // Ne pas traiter si on a cliqué sur un SoundBlock
    if (e.target.closest('[data-sound-block]')) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft
    const y = e.clientY - rect.top + e.currentTarget.scrollTop
    
    // Calculer la colonne cliquée
    const column = Math.floor(x / COLUMN_WIDTH)
    if (column < 0 || column >= COLUMN_COUNT) return
    
    // Calculer le segment cliqué
    const segmentIndex = Math.floor(y / SEGMENT_HEIGHT)
    if (segmentIndex < 0 || segmentIndex >= segments.length) return
    
    // Ouvrir le sélecteur de sons avec la position cible
    setPickerTargetPosition({ segmentIndex, column })
    setShowSoundPicker(true)
  }, [segments.length, segments])

  // Sélectionner un son
  const handleSelectSound = (soundId) => {
    setSelectedSoundId(soundId)
  }

  // Double-clic pour éditer
  const handleDoubleClickSound = (soundTrack) => {
    setEditingSoundTrack(soundTrack)
  }

  // Changer la colonne d'un son
  const handleColumnChange = useCallback((soundId, newColumn) => {
    const updatedTracks = soundTracks.map(track => 
      track.id === soundId ? { ...track, column: newColumn } : track
    )
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

  // Redimensionner un son (changer startSegmentId ou endSegmentId)
  const handleResizeSound = useCallback((soundId, newStartSegmentId, newEndSegmentId) => {
    const updatedTracks = soundTracks.map(track => {
      if (track.id !== soundId) return track
      return {
        ...track,
        ...(newStartSegmentId && { startSegmentId: newStartSegmentId }),
        ...(newEndSegmentId && { endSegmentId: newEndSegmentId })
      }
    })
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

  // Sauvegarder les modifications d'un son
  const handleSaveSoundTrack = useCallback((updatedTrack) => {
    const updatedTracks = soundTracks.map(track =>
      track.id === updatedTrack.id ? updatedTrack : track
    )
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

  // Mettre à jour partiellement un son (pour les fades, volume, etc.)
  const handleUpdateSoundTrack = useCallback((soundId, updates) => {
    const updatedTracks = soundTracks.map(track =>
      track.id === soundId ? { ...track, ...updates } : track
    )
    onSoundTracksChange(updatedTracks)
  }, [soundTracks, onSoundTracksChange])

  // Supprimer un son
  const handleDeleteSoundTrack = useCallback((soundId) => {
    const updatedTracks = soundTracks.filter(track => track.id !== soundId)
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

  // Trouver la première colonne libre pour un segment donné
  const findFirstFreeColumn = useCallback((segmentIndex) => {
    for (let col = 0; col < 6; col++) {
      const hasConflict = soundTracks.some(track => {
        const startIdx = segments.findIndex(s => s.id === track.startSegmentId || s._id === track.startSegmentId)
        const endIdx = segments.findIndex(s => s.id === track.endSegmentId || s._id === track.endSegmentId)
        const trackEnd = endIdx !== -1 ? endIdx : startIdx
        
        // Vérifier si le track chevauche le segment donné dans cette colonne
        return track.column === col && startIdx <= segmentIndex && trackEnd >= segmentIndex
      })
      if (!hasConflict) return col
    }
    return -1 // Toutes les colonnes sont occupées
  }, [soundTracks, segments])

  // Ajouter un nouveau son
  const handleAddSound = useCallback((soundData) => {
    // Déduire l'index du segment à partir du startSegmentId
    let targetSegmentIndex = 0
    if (soundData.startSegmentId) {
      const idx = segments.findIndex(s => s.id === soundData.startSegmentId || s._id === soundData.startSegmentId)
      if (idx !== -1) targetSegmentIndex = idx
    }
    
    // Trouver la première colonne libre
    const freeColumn = findFirstFreeColumn(targetSegmentIndex)
    
    if (freeColumn === -1) {
      alert('Timeline saturée sur ce segment ! Toutes les 6 colonnes sont occupées.')
      return
    }

    const newTrack = {
      id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      column: freeColumn,
      ...soundData
    }
    const updatedTracks = [...soundTracks, newTrack]
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
    setShowSoundPicker(false)
  }, [soundTracks, onSoundTracksChange, onSaveToHistory, findFirstFreeColumn])

  // Calculer la hauteur totale de la timeline
  const totalHeight = segments.length * SEGMENT_HEIGHT

  // Trouver le son sélectionné pour le panel
  const selectedSoundTrack = editingSoundTrack || 
    (selectedSoundId ? soundTracks.find(t => t.id === selectedSoundId) : null)
  const selectedSound = selectedSoundTrack ? 
    soundLibrary.find(s => s.id === selectedSoundTrack.soundId) : null

  // Fermer le panel
  const closePanel = () => {
    setEditingSoundTrack(null)
    setSelectedSoundId(null)
  }

  return (
    <div style={{ 
      display: 'flex', 
      gap: '1rem', 
      height: '100%',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Colonne de gauche - Liste des segments */}
      <div 
        ref={segmentsRef}
        onScroll={handleSegmentScroll}
        style={{
          flex: '0 0 45%',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#fff',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #ddd',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          color: '#333',
          position: 'sticky',
          top: 0,
          zIndex: 5
        }}>
          Segments ({segments.length})
        </div>

        {/* Liste des segments */}
        {segments.map((segment, index) => (
          <div
            key={segment.id || segment._id || index}
            style={{
              padding: '0.6rem 1rem',
              borderBottom: '1px solid #f0f0f0',
              fontSize: '0.85rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              minHeight: `${SEGMENT_HEIGHT}px`,
              boxSizing: 'border-box'
            }}
          >
            <span style={{
              color: '#999',
              fontSize: '0.75rem',
              minWidth: '24px',
              textAlign: 'center',
              paddingTop: '2px'
            }}>
              {index + 1}
            </span>
            <span style={{ 
              flex: 1, 
              lineHeight: '1.4',
              color: '#333',
              wordBreak: 'break-word'
            }}>
              {typeof segment === 'string' ? segment : (segment.text || segment.content || segment._text || '')}
            </span>
          </div>
        ))}

        {segments.length === 0 && (
          <div style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#999',
            fontSize: '0.9rem'
          }}>
            Aucun segment. Découpez un texte pour commencer.
          </div>
        )}
      </div>

      {/* Colonne de droite - Timeline audio */}
      <div style={{
        flex: '0 0 calc(55% - 1rem)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#fff',
        overflow: 'hidden'
      }}>
        {/* Header de la timeline */}
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>
            Timeline Audio
          </div>
          <button
            onClick={() => {
              setPickerTargetPosition({ segmentIndex: 0, column: 0 })
              setShowSoundPicker(true)
            }}
            disabled={segments.length === 0}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              backgroundColor: segments.length === 0 ? '#ccc' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: segments.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <span>+</span>
            <span>Ajouter un son</span>
          </button>
        </div>

        {/* En-têtes de colonnes */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e9ecef',
          backgroundColor: '#fafafa',
          flexShrink: 0
        }}>
          {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
            <div
              key={i}
              style={{
                width: `${COLUMN_WIDTH}px`,
                flexShrink: 0,
                padding: '0.4rem 0.5rem',
                fontSize: '0.7rem',
                color: '#666',
                textAlign: 'center',
                fontWeight: 'bold',
                borderRight: i < COLUMN_COUNT - 1 ? '1px solid #e9ecef' : 'none',
                backgroundColor: i % 2 === 0 ? '#f8f9fa' : '#fff'
              }}
            >
              Col {i}
            </div>
          ))}
        </div>

        {/* Contenu de la timeline */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleTimelineScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            position: 'relative'
          }}
        >
          <div 
            onDoubleClick={handleTimelineDoubleClick}
            style={{
              position: 'relative',
              height: `${totalHeight}px`,
              minWidth: `${COLUMN_COUNT * COLUMN_WIDTH}px`
            }}
          >
            {/* Lignes de fond (une par segment) */}
            {segments.map((_, index) => (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  top: `${index * SEGMENT_HEIGHT}px`,
                  left: 0,
                  right: 0,
                  height: `${SEGMENT_HEIGHT}px`,
                  backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                  boxSizing: 'border-box'
                }}
              />
            ))}

            {/* Grille des colonnes */}
            {Array.from({ length: COLUMN_COUNT }).map((_, colIndex) => (
              <div
                key={`col-${colIndex}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${colIndex * COLUMN_WIDTH}px`,
                  width: `${COLUMN_WIDTH}px`,
                  height: '100%',
                  borderRight: colIndex < COLUMN_COUNT - 1 ? '1px solid #f0f0f0' : 'none',
                  boxSizing: 'border-box'
                }}
              />
            ))}

            {/* Blocs sonores */}
            {soundTracks.map(track => (
              <SoundBlock
                key={track.id}
                soundTrack={track}
                segments={segments}
                soundLibrary={soundLibrary}
                isSelected={track.id === selectedSoundId || track.id === editingSoundTrack?.id}
                onSelect={handleSelectSound}
                onDoubleClick={handleDoubleClickSound}
                onColumnChange={handleColumnChange}
                onResize={handleResizeSound}
                onUpdate={handleUpdateSoundTrack}
              />
            ))}

            {soundTracks.length === 0 && segments.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#999',
                fontSize: '0.85rem',
                pointerEvents: 'none'
              }}>
                <p style={{ marginBottom: '0.5rem' }}>Aucun son dans la timeline</p>
                <p>Cliquez sur "Ajouter un son" pour commencer</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel d'édition au double-clic */}
      {(editingSoundTrack || selectedSoundTrack) && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 1000
            }}
            onClick={closePanel}
          />
          <SoundBlockPanel
            soundTrack={selectedSoundTrack}
            sound={selectedSound}
            segments={segments}
            onSave={handleSaveSoundTrack}
            onClose={closePanel}
            onDelete={handleDeleteSoundTrack}
          />
        </>
      )}

      {/* Sélecteur de sons */}
      {showSoundPicker && (
        <SoundLibraryPicker
          soundLibrary={soundLibrary}
          segments={segments}
          segmentIndex={pickerTargetPosition.segmentIndex}
          column={pickerTargetPosition.column}
          onAddSound={handleAddSound}
          onClose={() => setShowSoundPicker(false)}
        />
      )}
    </div>
  )
}

export default AudioTimeline
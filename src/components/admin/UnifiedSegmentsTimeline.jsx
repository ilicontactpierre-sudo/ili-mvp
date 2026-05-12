import { useState, useRef, useCallback, useEffect } from 'react'
import SoundBlock from './SoundBlock'
import SoundBlockPanel from './SoundBlockPanel'
import SoundLibraryPicker from './SoundLibraryPicker'
import { SEGMENT_HEIGHT, COLUMN_COUNT, COLUMN_WIDTH } from './constants'

// Composant pour une ligne unifiée Segment + Timeline
function SegmentTimelineRow({ 
  segment, 
  index, 
  isSelected, 
  onSelect, 
  onEdit, 
  onSplitAtPosition,
  onAdd, 
  onDelete,
  isCmdPressed,
  isEditing,
  editText,
  onEditChange,
  onEditBlur,
  onEditKeyDown,
  hovered,
  onHover,
  soundTracks,
  segments,
  soundLibrary,
  selectedSoundId,
  editingSoundTrack,
  onSoundSelect,
  onSoundDoubleClick,
  onSoundColumnChange,
  onSoundResize,
  onSoundUpdate,
  onAddSoundToCell,
  rowHeight,
  dividerPosition,
  isDraggingDivider,
  onDividerMouseDown
}) {
  const containerRef = useRef(null)
  const textareaRef = useRef(null)

  const text = segment.text || segment
  
  // État pour la position de découpe potentielle (mode Cmd)
  const [splitPreviewPosition, setSplitPreviewPosition] = useState(null)

  // Gérer le survol pour afficher la position de découpe
  const handleSplitPreviewMouseMove = useCallback((e) => {
    if (!isCmdPressed || isEditing) {
      setSplitPreviewPosition(null)
      return
    }
    
    // Utiliser caretRangeFromPoint pour une précision parfaite
    const range = document.caretRangeFromPoint(e.clientX, e.clientY)
    if (!range) {
      setSplitPreviewPosition(null)
      return
    }
    
    const textNode = range.startContainer
    // Vérifier que le curseur est bien sur un noeud texte dans notre élément
    if (textNode.nodeType !== Node.TEXT_NODE) {
      setSplitPreviewPosition(null)
      return
    }
    
    const textContent = textNode.textContent
    const offset = range.startOffset
    
    // Trouver la position dans le texte complet du segment
    // Le texte affiché peut être différent si on est dans un span imbriqué
    const textElement = textNode.parentElement?.closest('[data-text-content]')
    if (!textElement) {
      setSplitPreviewPosition(null)
      return
    }
    
    // Calculer l'offset global dans le texte du segment
    let globalOffset = 0
    let found = false
    
    const walker = document.createTreeWalker(
      textElement,
      NodeFilter.SHOW_TEXT,
      null
    )
    
    let node
    while (node = walker.nextNode()) {
      if (node === textNode) {
        globalOffset += offset
        found = true
        break
      }
      globalOffset += node.textContent.length
    }
    
    if (found) {
      setSplitPreviewPosition(globalOffset)
    } else {
      setSplitPreviewPosition(null)
    }
  }, [isCmdPressed, isEditing, text])

  const handleSplitPreviewMouseLeave = useCallback(() => {
    setSplitPreviewPosition(null)
  }, [])

  // Ajuster la hauteur du textarea automatiquement
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isEditing, editText])

  const handleClick = (e) => {
    // Mode coupe : couper exactement à la position du clic
    if (isCmdPressed && !isEditing) {
      e.stopPropagation()
      
      // Utiliser caretRangeFromPoint pour une précision parfaite
      const range = document.caretRangeFromPoint(e.clientX, e.clientY)
      if (!range) {
        return
      }
      
      const textNode = range.startContainer
      // Vérifier que le curseur est bien sur un noeud texte
      if (textNode.nodeType !== Node.TEXT_NODE) {
        return
      }
      
      const offset = range.startOffset
      
      // Trouver la position dans le texte complet du segment
      const textElement = textNode.parentElement?.closest('[data-text-content]')
      if (!textElement) {
        return
      }
      
      // Calculer l'offset global dans le texte du segment
      let globalOffset = 0
      let found = false
      
      const walker = document.createTreeWalker(
        textElement,
        NodeFilter.SHOW_TEXT,
        null
      )
      
      let node
      while (node = walker.nextNode()) {
        if (node === textNode) {
          globalOffset += offset
          found = true
          break
        }
        globalOffset += node.textContent.length
      }
      
      if (found) {
        onSplitAtPosition(index, globalOffset)
      }
      return
    }
    
    onSelect(index)
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    onEdit(index)
  }

  // Trouver les sons qui commencent à ce segment
  const rowSoundTracks = soundTracks.filter(track => {
    const startIdx = segments.findIndex(s => s.id === track.startSegmentId || s._id === track.startSegmentId)
    return startIdx === index
  })

  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid #f0f0f0',
        minHeight: rowHeight ? `${rowHeight}px` : `${SEGMENT_HEIGHT}px`,
        height: rowHeight ? `${rowHeight}px` : 'auto',
        backgroundColor: isSelected ? '#f0f7ff' : (index % 2 === 0 ? '#fff' : '#fafafa'),
        transition: 'background-color 0.15s ease',
        position: 'relative'
      }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Partie Segment (gauche) */}
      <div
        ref={containerRef}
        style={{
          flex: '0 0 auto',
          width: `${dividerPosition}%`,
          padding: '0.5rem 0.75rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start',
          boxSizing: 'border-box',
          cursor: isCmdPressed && !isEditing ? 'crosshair' : 'default',
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Numéro du segment */}
        <span style={{
          color: '#999',
          fontSize: '0.7rem',
          minWidth: '20px',
          textAlign: 'center',
          paddingTop: '3px',
          fontWeight: 'bold'
        }}>
          {index + 1}
        </span>

        {/* Texte éditable */}
        <div 
          data-text-content="true"
          style={{ 
            flex: 1, 
            lineHeight: '1.4',
            color: '#333',
            wordBreak: 'break-word',
            position: 'relative',
            cursor: isCmdPressed && !isEditing ? 'crosshair' : 'text',
            overflow: 'hidden',
            display: 'block'
          }}
          onMouseMove={handleSplitPreviewMouseMove}
          onMouseLeave={handleSplitPreviewMouseLeave}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => onEditChange(index, e.target.value)}
              onBlur={() => onEditBlur(index)}
              onKeyDown={(e) => onEditKeyDown(index, e)}
              autoFocus
              style={{
                width: '100%',
                minHeight: '20px',
                padding: '0',
                margin: '0',
                fontSize: '0.85rem',
                border: 'none',
                borderRadius: '0',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.4',
                outline: 'none',
                boxSizing: 'border-box',
                background: 'transparent',
                color: 'inherit',
                overflow: 'hidden',
                display: 'block'
              }}
            />
          ) : (
            <span style={{ display: 'block', minHeight: '20px' }}>
              {/* Affichage du texte avec indicateur de découpe */}
              {splitPreviewPosition !== null && isCmdPressed ? (
                <>
                  {text.substring(0, splitPreviewPosition)}
                  <span style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '1.2em',
                    backgroundColor: '#ef4444',
                    verticalAlign: 'text-bottom',
                    margin: '0 1px',
                    animation: 'blink 0.8s ease-in-out infinite'
                  }} />
                  {text.substring(splitPreviewPosition)}
                </>
              ) : (
                text
              )}
            </span>
          )}
        </div>

        {/* Boutons d'action (visibles au survol) */}
        {(hovered || isSelected) && (
          <div style={{
            display: 'flex',
            gap: '2px',
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(index); }}
              style={{
                background: '#4CAF50',
                border: 'none',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'transform 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
              title="Ajouter un segment après"
            >
              +
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(index); }}
              style={{
                background: '#f44336',
                border: 'none',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                fontSize: '12px',
                transition: 'transform 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
              title="Supprimer le segment"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Séparateur redimensionnable */}
      <div
        style={{
          width: '6px',
          flexShrink: 0,
          cursor: 'col-resize',
          backgroundColor: isDraggingDivider ? '#2196F3' : 'transparent',
          transition: 'background-color 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          onDividerMouseDown(e)
        }}
      >
        {/* Ligne verticale visible */}
        <div style={{
          width: '2px',
          height: '80%',
          backgroundColor: '#e0e0e0',
          borderRadius: '1px',
          transition: 'background-color 0.15s ease',
        }} />
      </div>

      {/* Partie Timeline (droite) */}
      <div
        style={{
          flex: '0 0 auto',
          width: `${100 - dividerPosition}%`,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Grille de la timeline */}
        {Array.from({ length: COLUMN_COUNT }).map((_, colIndex) => {
          // Vérifier s'il y a un son qui commence dans cette case
          const soundInCell = rowSoundTracks.find(track => track.column === colIndex)
          const hasSound = !!soundInCell
          
          return (
            <div
              key={colIndex}
              style={{
                width: `${COLUMN_WIDTH}px`,
                flexShrink: 0,
                height: '100%',
                borderRight: colIndex < COLUMN_COUNT - 1 ? '1px solid #f0f0f0' : 'none',
                backgroundColor: hasSound ? 'transparent' : 'rgba(76, 175, 80, 0.03)',
                cursor: hasSound ? 'default' : 'pointer',
                position: 'relative'
              }}
              onDoubleClick={() => !hasSound && onAddSoundToCell(index, colIndex)}
              title={!hasSound ? 'Double-cliquez pour ajouter un son' : ''}
            />
          )
        })}

        {/* Blocs sonores pour cette ligne */}
        {rowSoundTracks.map(track => (
          <SoundBlock
            key={track.id}
            soundTrack={track}
            segments={segments}
            soundLibrary={soundLibrary}
            isSelected={track.id === selectedSoundId || track.id === editingSoundTrack?.id}
            onSelect={onSoundSelect}
            onDoubleClick={onSoundDoubleClick}
            onColumnChange={onSoundColumnChange}
            onResize={onSoundResize}
            onUpdate={onSoundUpdate}
          />
        ))}
      </div>
    </div>
  )
}

// Composant pour le séparateur entre segments (double-clic pour fusionner)
function SegmentSeparator({ index, onMerge, isHovered, onHover }) {
  return (
    <div
      style={{
        height: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #f0f0f0'
      }}
      onDoubleClick={() => onMerge(index)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      title="Double-cliquez pour fusionner les segments"
    >
      {/* Ligne séparatrice */}
      <div style={{
        flex: 1,
        height: '1px',
        backgroundColor: isHovered === index ? '#2196F3' : '#e0e0e0',
        transition: 'background-color 0.15s ease'
      }} />
      
      {/* Icône de fusion (visible au survol) */}
      {isHovered === index && (
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#2196F3',
          color: 'white',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          ⊕
        </div>
      )}
      
      <div style={{
        flex: 1,
        height: '1px',
        backgroundColor: isHovered === index ? '#2196F3' : '#e0e0e0',
        transition: 'background-color 0.15s ease'
      }} />
    </div>
  )
}

// Composant principal unifié
function UnifiedSegmentsTimeline({ 
  segments, 
  soundTracks, 
  soundLibrary,
  onSegmentsChange,
  onSoundTracksChange,
  onSaveToHistory
}) {
  const [selectedSoundId, setSelectedSoundId] = useState(null)
  const [editingSoundTrack, setEditingSoundTrack] = useState(null)
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [hoveredSeparator, setHoveredSeparator] = useState(null)
  const [isCmdPressed, setIsCmdPressed] = useState(false)
  const [dividerPosition, setDividerPosition] = useState(45) // Pourcentage de la largeur pour la partie Segment
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)
  const [editingSegmentIndex, setEditingSegmentIndex] = useState(null)
  const [editTexts, setEditTexts] = useState({})
  
  const containerRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const dividerRef = useRef(null)

  // Gérer le drag du séparateur
  useEffect(() => {
    if (!isDraggingDivider) return

    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newPosition = ((e.clientX - rect.left) / rect.width) * 100
        setDividerPosition(Math.max(30, Math.min(70, newPosition))) // Limites 30%-70%
      }
    }

    const handleMouseUp = () => {
      setIsDraggingDivider(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingDivider])

  // Gérer la touche Command
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setIsCmdPressed(true)
      }
    }
    const handleKeyUp = (e) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setIsCmdPressed(false)
      }
    }
    const handleBlur = () => {
      // Réinitialiser si la fenêtre perd le focus
      setIsCmdPressed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Drag du séparateur
  useEffect(() => {
    if (!isDraggingDivider) return

    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newPosition = ((e.clientX - rect.left) / rect.width) * 100
        setDividerPosition(Math.max(20, Math.min(80, newPosition)))
      }
    }

    const handleMouseUp = () => {
      setIsDraggingDivider(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingDivider])

  // Actions sur les segments
  const handleStartEdit = useCallback((index) => {
    setEditingSegmentIndex(index)
    const segment = segments[index]
    setEditTexts(prev => ({
      ...prev,
      [index]: segment.text || segment
    }))
  }, [segments])

  const handleEditChange = useCallback((index, newText) => {
    setEditTexts(prev => ({
      ...prev,
      [index]: newText
    }))
  }, [])

  const handleEditBlur = useCallback((index) => {
    const newText = editTexts[index]
    if (newText !== undefined && newText !== (segments[index].text || segments[index])) {
      const updatedSegments = [...segments]
      updatedSegments[index] = typeof segments[index] === 'string' 
        ? newText 
        : { ...segments[index], text: newText }
      onSegmentsChange(updatedSegments)
      if (onSaveToHistory) onSaveToHistory()
    }
    setEditingSegmentIndex(null)
  }, [editTexts, segments, onSegmentsChange, onSaveToHistory])

  const handleEditKeyDown = useCallback((index, e) => {
    if (e.key === 'Escape') {
      setEditingSegmentIndex(null)
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditBlur(index)
    }
  }, [handleEditBlur])

  const handleMergeSegments = useCallback((index) => {
    if (index >= segments.length - 1) return
    
    const updatedSegments = [...segments]
    const seg1 = typeof segments[index] === 'string' ? segments[index] : segments[index].text
    const seg2 = typeof segments[index + 1] === 'string' ? segments[index + 1] : segments[index + 1].text
    
    const wordCount = seg1.split(' ').length
    const delay = Math.round(wordCount * 200)
    
    const mergedText = seg1 + ' ' + seg2
    const mergedSegment = typeof segments[index] === 'string' ? mergedText : { ...segments[index], text: mergedText, delay }
    
    updatedSegments.splice(index, 2, mergedSegment)
    
    const seg1Id = segments[index].id || segments[index]._id
    const seg2Id = segments[index + 1].id || segments[index + 1]._id
    
    const updatedTracks = soundTracks.map(track => {
      if (track.startSegmentId === seg2Id) {
        return { ...track, startSegmentId: seg1Id }
      }
      if (track.endSegmentId === seg2Id) {
        return { ...track, endSegmentId: seg1Id }
      }
      return track
    })
    
    onSegmentsChange(updatedSegments)
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, soundTracks, onSegmentsChange, onSoundTracksChange, onSaveToHistory])

  const handleSplitSegment = useCallback((index, splitPosition) => {
    const segment = segments[index]
    const text = typeof segment === 'string' ? segment : segment.text
    
    if (splitPosition <= 0 || splitPosition >= text.length) return
    
    const part1 = text.substring(0, splitPosition).trim()
    const part2 = text.substring(splitPosition).trim()
    
    if (!part1 || !part2) return
    
    const updatedSegments = [...segments]
    const newSeg1 = typeof segment === 'string' ? part1 : { ...segment, text: part1 }
    const newSeg2 = typeof segment === 'string' ? part2 : { ...segment, text: part2 }
    
    updatedSegments.splice(index, 1, newSeg1, newSeg2)
    onSegmentsChange(updatedSegments)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, onSegmentsChange, onSaveToHistory])

  const handleAddSegment = useCallback((index) => {
    const updatedSegments = [...segments]
    const newSegment = typeof segments[0] === 'string' ? '' : { text: '', id: `seg_${Date.now()}` }
    updatedSegments.splice(index + 1, 0, newSegment)
    onSegmentsChange(updatedSegments)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, onSegmentsChange, onSaveToHistory])

  const handleDeleteSegment = useCallback((index) => {
    const segmentToDelete = segments[index]
    const segId = segmentToDelete.id || segmentToDelete._id
    
    const updatedTracks = soundTracks.filter(track => track.startSegmentId !== segId)
    const updatedSegments = [...segments]
    updatedSegments.splice(index, 1)
    
    onSegmentsChange(updatedSegments)
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, soundTracks, onSegmentsChange, onSoundTracksChange, onSaveToHistory])

  const handleSelectSegment = useCallback((index) => {
    setSelectedSegmentIndex(index)
  }, [])

  // Actions sur les sons
  const handleSelectSound = (soundId) => {
    setSelectedSoundId(soundId)
  }

  const handleDoubleClickSound = (soundTrack) => {
    setEditingSoundTrack(soundTrack)
  }

  const handleColumnChange = useCallback((soundId, newColumn) => {
    const updatedTracks = soundTracks.map(track => 
      track.id === soundId ? { ...track, column: newColumn } : track
    )
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

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

  const handleSaveSoundTrack = useCallback((updatedTrack) => {
    const updatedTracks = soundTracks.map(track =>
      track.id === updatedTrack.id ? updatedTrack : track
    )
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
    setEditingSoundTrack(null)
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

  const handleUpdateSoundTrack = useCallback((soundId, updates) => {
    const updatedTracks = soundTracks.map(track =>
      track.id === soundId ? { ...track, ...updates } : track
    )
    onSoundTracksChange(updatedTracks)
  }, [soundTracks, onSoundTracksChange])

  const handleDeleteSoundTrack = useCallback((soundId) => {
    const updatedTracks = soundTracks.filter(track => track.id !== soundId)
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

  const handleDoubleClickEmptyCell = useCallback((segmentIndex, column) => {
    if (segmentIndex >= segments.length) return
    
    console.log('handleDoubleClickEmptyCell called with:', { segmentIndex, column, segmentsLength: segments.length })
    
    let freeColumn = column
    
    const hasConflict = soundTracks.some(track => {
      const startIdx = segments.findIndex(s => s.id === track.startSegmentId || s._id === track.startSegmentId)
      const endIdx = segments.findIndex(s => s.id === track.endSegmentId || s._id === track.endSegmentId)
      const trackEnd = endIdx !== -1 ? endIdx : startIdx
      return track.column === column && startIdx <= segmentIndex && trackEnd >= segmentIndex
    })
    
    if (hasConflict) {
      for (let col = 0; col < COLUMN_COUNT; col++) {
        const noConflict = !soundTracks.some(track => {
          const startIdx = segments.findIndex(s => s.id === track.startSegmentId || s._id === track.startSegmentId)
          const endIdx = segments.findIndex(s => s.id === track.endSegmentId || s._id === track.endSegmentId)
          const trackEnd = endIdx !== -1 ? endIdx : startIdx
          return track.column === col && startIdx <= segmentIndex && trackEnd >= segmentIndex
        })
        if (noConflict) {
          freeColumn = col
          break
        }
      }
    }
    
    const segmentId = segments[segmentIndex]?.id || segments[segmentIndex]?._id
    console.log('Setting showSoundPicker to:', { segmentIndex, column: freeColumn, segmentId })
    setShowSoundPicker({ segmentIndex, segmentId, column: freeColumn })
  }, [segments, soundTracks])

  const selectedSoundTrack = editingSoundTrack || 
    (selectedSoundId ? soundTracks.find(t => t.id === selectedSoundId) : null)
  const selectedSound = selectedSoundTrack ? 
    soundLibrary.find(s => s.id === selectedSoundTrack.soundId) : null

  const closePanel = () => {
    setEditingSoundTrack(null)
    setSelectedSoundId(null)
  }

  // Calculer la hauteur totale basée sur le contenu des segments
  const totalHeight = segments.reduce((sum, segment, index) => {
    const text = segment.text || segment || ''
    const lines = Math.ceil(text.length / 60) // Approx 60 chars per line
    const rowHeight = Math.max(SEGMENT_HEIGHT, lines * 20)
    return sum + rowHeight + 8 // +8 for separator
  }, 0)

  return (
    <div 
      ref={containerRef}
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#fff'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        padding: '0.75rem 0',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #ddd',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        color: '#333',
        flexShrink: 0
      }}>
        {/* Partie Segments du header */}
        <div style={{
          flex: `0 0 ${dividerPosition}%`,
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>
          <span>Segments ({segments.length})</span>
        </div>

        {/* Séparateur du header */}
        <div style={{
          width: '6px',
          flexShrink: 0,
          backgroundColor: isDraggingDivider ? '#2196F3' : 'transparent',
          transition: 'background-color 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '2px',
            height: '80%',
            backgroundColor: '#e0e0e0',
            borderRadius: '1px'
          }} />
        </div>

        {/* Partie Timeline du header */}
        <div style={{
          flex: `0 0 calc(${100 - dividerPosition}% - 6px)`,
          padding: '0 0 0 1rem',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <span>Timeline Audio</span>
        </div>
      </div>

      {/* En-têtes de colonnes Timeline */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e9ecef',
        backgroundColor: '#fafafa',
        flexShrink: 0
      }}>
        {/* Espace vide aligné avec la partie Segment */}
        <div style={{
          flex: `0 0 ${dividerPosition}%`,
          borderRight: '1px solid #e9ecef'
        }} />

        {/* Séparateur */}
        <div style={{
          width: '6px',
          flexShrink: 0,
          backgroundColor: 'transparent'
        }} />

        {/* Colonnes de la timeline */}
        <div style={{
          flex: `0 0 calc(${100 - dividerPosition}% - 6px)`,
          display: 'flex',
          overflowX: 'auto',
          paddingLeft: '1rem',
          boxSizing: 'border-box'
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
                backgroundColor: i % 2 === 0 ? '#fafafa' : '#fff'
              }}
            >
              Col {i}
            </div>
          ))}
        </div>
      </div>

      {/* Contenu scrollable unifié */}
      <div 
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {segments.map((segment, index) => (
          <div key={segment.id || segment._id || index}>
            <SegmentTimelineRow
              segment={segment}
              index={index}
              isSelected={selectedSegmentIndex === index}
              onSelect={handleSelectSegment}
              onEdit={handleStartEdit}
              onEditChange={handleEditChange}
              onEditBlur={handleEditBlur}
              onEditKeyDown={handleEditKeyDown}
              isEditing={editingSegmentIndex === index}
              editText={editTexts[index] || ''}
              onSplitAtPosition={handleSplitSegment}
              onAdd={handleAddSegment}
              onDelete={handleDeleteSegment}
              isCmdPressed={isCmdPressed}
              hovered={hoveredRow === index}
              onHover={(idx) => setHoveredRow(idx)}
              soundTracks={soundTracks}
              segments={segments}
              soundLibrary={soundLibrary}
              selectedSoundId={selectedSoundId}
              editingSoundTrack={editingSoundTrack}
              onSoundSelect={handleSelectSound}
              onSoundDoubleClick={handleDoubleClickSound}
              onSoundColumnChange={handleColumnChange}
              onSoundResize={handleResizeSound}
              onSoundUpdate={handleUpdateSoundTrack}
              onAddSoundToCell={handleDoubleClickEmptyCell}
              dividerPosition={dividerPosition}
              isDraggingDivider={isDraggingDivider}
              onDividerMouseDown={() => setIsDraggingDivider(true)}
            />
            
            {index < segments.length - 1 && (
              <SegmentSeparator
                index={index}
                onMerge={handleMergeSegments}
                isHovered={hoveredSeparator}
                onHover={setHoveredSeparator}
              />
            )}
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
          segmentIndex={showSoundPicker.segmentIndex}
          segmentId={showSoundPicker.segmentId}
          column={showSoundPicker.column}
          onAddSound={(soundData) => {
            console.log('onAddSound called with soundData:', soundData)
            console.log('showSoundPicker was:', showSoundPicker)
            const freeColumn = showSoundPicker.column !== undefined ? showSoundPicker.column : 0
            const newTrack = {
              id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              column: freeColumn,
              ...soundData
            }
            const updatedTracks = [...soundTracks, newTrack]
            onSoundTracksChange(updatedTracks)
            if (onSaveToHistory) onSaveToHistory()
            setShowSoundPicker(false)
          }}
          onClose={() => setShowSoundPicker(false)}
        />
      )}
    </div>
  )
}

export default UnifiedSegmentsTimeline
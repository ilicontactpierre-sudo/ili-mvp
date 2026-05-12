import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORY_COLORS, SEGMENT_HEIGHT, COLUMN_WIDTH } from './constants'

// Fonction pour obtenir une variante plus foncée d'une couleur
function getDarkerColor(color) {
  // Convertir hex en RGB
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  // Assombrir de 20%
  const factor = 0.8
  const dr = Math.round(r * factor)
  const dg = Math.round(g * factor)
  const db = Math.round(b * factor)
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

function SoundBlock({ 
  soundTrack, 
  segments, 
  soundLibrary,
  isSelected, 
  onSelect, 
  onDoubleClick,
  onMove, 
  onResize,
  onColumnChange,
  onUpdate
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(null) // 'top' or 'bottom'
  const [isAdjustingFade, setIsAdjustingFade] = useState(null) // 'fadeIn' or 'fadeOut'
  const [fadeHandlePos, setFadeHandlePos] = useState({ fadeIn: 0, fadeOut: 0 })
  const [dragStart, setDragStart] = useState({ y: 0, column: 0 })
  const [resizeStart, setResizeStart] = useState({ y: 0, startSegment: null, endSegment: null })
  const [isHovered, setIsHovered] = useState(false)
  const blockRef = useRef(null)
  const fadeStartRef = useRef(null)

  // Trouver le son dans la bibliothèque
  const sound = soundLibrary.find(s => s.id === soundTrack.soundId)
  
  // Déterminer la couleur basée sur les catégories
  const getColor = useCallback(() => {
    if (!sound) return '#ccc'
    const categories = sound.categories || []
    for (const cat of categories) {
      if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat]
    }
    return CATEGORY_COLORS['Autre']
  }, [sound])

  const baseColor = getColor()
  const darkerColor = getDarkerColor(baseColor)
  const bgColor = soundTrack.muted ? '#888' : (isSelected ? baseColor : `${baseColor}99`)
  const borderColor = isSelected ? '#333' : baseColor

  // Calculer la position verticale (en fonction des segments)
  const getSegmentIndex = useCallback((segmentId) => {
    return segments.findIndex(s => s.id === segmentId || s._id === segmentId)
  }, [segments])

  const startSegmentIndex = getSegmentIndex(soundTrack.startSegmentId)
  const endSegmentIndex = getSegmentIndex(soundTrack.endSegmentId)
  
  if (startSegmentIndex === -1) return null

  // Position et dimensions
  const top = startSegmentIndex * SEGMENT_HEIGHT
  const blockHeight = ((endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex) - startSegmentIndex + 1) * SEGMENT_HEIGHT
  const left = soundTrack.column * COLUMN_WIDTH
  const width = COLUMN_WIDTH - 5

  // Calculer les positions de fade en pixels (basé sur la hauteur du bloc)
  const maxFadeHeight = blockHeight * 0.8
  const fadeInHeight = Math.min((soundTrack.fadeIn || 0) / (segments.length * 5000) * blockHeight, maxFadeHeight)
  const fadeOutHeight = Math.min((soundTrack.fadeOut || 0) / (segments.length * 5000) * blockHeight, maxFadeHeight)

  // Motif rayé pour loop
  const loopPattern = soundTrack.loop ? `repeating-linear-gradient(
    45deg,
    ${baseColor},
    ${baseColor} 6px,
    ${darkerColor} 6px,
    ${darkerColor} 12px
  )` : 'none'

  // Gestion du drag (déplacement pour changer de colonne ET de ligne)
  // Le drag ne se déclenche qu'après un petit délai pour ne pas interférer avec le clic
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.dataset.fadeHandle) return
    if (e.target.dataset.resizeHandle) return
    e.stopPropagation()
    
    // Sélectionner le bloc (pour le drag, pas pour éditer)
    onSelect(soundTrack.id)
    
    // Démarrer le drag après un court délai pour différencier clic et drag
    const startX = e.clientX
    const startY = e.clientY
    let hasMoved = false
    
    const onMouseMove = (moveEvent) => {
      const dx = Math.abs(moveEvent.clientX - startX)
      const dy = Math.abs(moveEvent.clientY - startY)
      if (dx > 3 || dy > 3) {
        hasMoved = true
        setIsDragging(true)
        setDragStart({
          y: moveEvent.clientY,
          column: soundTrack.column,
          startSegmentIndex: startSegmentIndex
        })
      }
    }
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (!hasMoved) {
        setIsDragging(false)
      }
    }
    
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [onSelect, soundTrack.id, soundTrack.column, startSegmentIndex])

  // Gestion du resize (étirement haut/bas)
  const handleResizeMouseDown = useCallback((e, direction) => {
    if (e.button !== 0) return
    e.stopPropagation()
    
    setIsResizing(direction)
    setResizeStart({
      y: e.clientY,
      startSegment: startSegmentIndex,
      endSegment: endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex
    })
  }, [startSegmentIndex, endSegmentIndex])

  // Gestion des poignées de fade
  const handleFadeMouseDown = useCallback((e, type) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    
    setIsAdjustingFade(type)
    fadeStartRef.current = {
      y: e.clientY,
      fadeIn: soundTrack.fadeIn || 0,
      fadeOut: soundTrack.fadeOut || 0,
      blockHeight
    }
  }, [soundTrack.fadeIn, soundTrack.fadeOut, blockHeight])

  // Effets de mouvement global
  useEffect(() => {
    if (!isDragging && !isResizing && !isAdjustingFade) return

    const handleMouseMove = (e) => {
      // Drag pour changer de colonne ET de ligne
      if (isDragging) {
        const deltaY = e.clientY - dragStart.y
        const segmentDelta = Math.round(deltaY / SEGMENT_HEIGHT)
        const columnDelta = Math.round(deltaY / SEGMENT_HEIGHT)
        
        // Calculer la nouvelle position de ligne (début du son)
        const newStartIndex = Math.max(0, Math.min(segments.length - 1, dragStart.startSegmentIndex + segmentDelta))
        
        // Calculer la nouvelle colonne
        // On utilise le mouvement horizontal pour la colonne, ou le vertical si petit déplacement
        const newColumn = Math.max(0, Math.min(5, dragStart.column + columnDelta))
        
        // Mettre à jour la colonne si changement
        if (newColumn !== dragStart.column) {
          onColumnChange(soundTrack.id, newColumn)
          setDragStart(prev => ({
            ...prev,
            y: e.clientY,
            column: newColumn
          }))
        }
        
        // Mettre à jour la position verticale (ligne) si changement
        if (newStartIndex !== dragStart.startSegmentIndex) {
          const newStartSegmentId = segments[newStartIndex]?.id || segments[newStartIndex]?._id
          const currentEndIndex = endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex
          const newEndIndex = Math.min(segments.length - 1, newStartIndex + (currentEndIndex - dragStart.startSegmentIndex))
          const newEndSegmentId = segments[newEndIndex]?.id || segments[newEndIndex]?._id
          
          onResize(soundTrack.id, newStartSegmentId, newEndSegmentId)
          setDragStart(prev => ({
            ...prev,
            y: e.clientY,
            startSegmentIndex: newStartIndex
          }))
        }
      }
      
      // Resize pour changer la durée
      if (isResizing) {
        const deltaY = e.clientY - resizeStart.y
        const segmentDelta = Math.round(deltaY / SEGMENT_HEIGHT)
        
        if (isResizing === 'bottom') {
          const newEndIndex = Math.max(
            resizeStart.startSegment + 1, // Au moins 1 segment
            Math.min(segments.length - 1, resizeStart.endSegment + segmentDelta)
          )
          const newEndSegmentId = segments[newEndIndex]?.id || segments[newEndIndex]?._id
          onResize(soundTrack.id, null, newEndSegmentId)
        } else if (isResizing === 'top') {
          const newStartIndex = Math.max(
            0,
            Math.min(resizeStart.endSegment - 1, resizeStart.startSegment + segmentDelta)
          )
          const newStartSegmentId = segments[newStartIndex]?.id || segments[newStartIndex]?._id
          onResize(soundTrack.id, newStartSegmentId, null)
        }
      }

      // Ajustement des fades
      if (isAdjustingFade && fadeStartRef.current) {
        const deltaY = e.clientY - fadeStartRef.current.y
        const blockH = fadeStartRef.current.blockHeight
        const msPerSegment = 5000 // estimation
        const msPerPixel = (segments.length * msPerSegment) / (segments.length * SEGMENT_HEIGHT)
        
        if (isAdjustingFade === 'fadeIn') {
          // Tirer vers le bas augmente fadeIn
          const fadeDelta = Math.max(0, deltaY * msPerPixel)
          const newFadeIn = Math.min(fadeDelta, blockH * 0.8 * msPerPixel)
          onUpdate(soundTrack.id, { fadeIn: Math.round(newFadeIn) })
        } else if (isAdjustingFade === 'fadeOut') {
          // Tirer vers le haut augmente fadeOut
          const fadeDelta = Math.max(0, -deltaY * msPerPixel)
          const newFadeOut = Math.min(fadeDelta, blockH * 0.8 * msPerPixel)
          onUpdate(soundTrack.id, { fadeOut: Math.round(newFadeOut) })
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(null)
      setIsAdjustingFade(null)
      fadeStartRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, isAdjustingFade, dragStart, resizeStart, soundTrack.id, segments, startSegmentIndex, endSegmentIndex, onColumnChange, onResize, onUpdate])

  // Motif de fond pour loop
  const backgroundStyle = soundTrack.loop ? { background: loopPattern } : {}
  
  // Ligne barrée pour muted
  const mutedOverlay = soundTrack.muted ? (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '10%',
      right: '10%',
      height: '2px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      transform: 'rotate(-15deg)'
    }} />
  ) : null

  return (
    <div
      ref={blockRef}
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${blockHeight}px`,
        backgroundColor: bgColor,
        ...backgroundStyle,
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4px',
        overflow: 'hidden',
        userSelect: 'none',
        transition: isDragging || isResizing || isAdjustingFade ? 'none' : 'all 0.15s ease',
        boxShadow: isSelected ? '0 0 0 2px #333, 0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: isSelected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => onDoubleClick && onDoubleClick(soundTrack)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Poignée de resize en haut */}
      <div
        data-resize-handle="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          cursor: 'ns-resize',
          backgroundColor: isResizing === 'top' || (isHovered && blockHeight > SEGMENT_HEIGHT) ? 'rgba(0,0,0,0.15)' : 'transparent',
          transition: 'background-color 0.15s ease'
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
      />
      
      {/* Zone de fade in (dégradé triangulaire) */}
      {fadeInHeight > 2 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${fadeInHeight}px`,
          background: `linear-gradient(to bottom, 
            ${soundTrack.muted ? '#aaa' : baseColor}00 0%, 
            ${bgColor} 100%)`,
          pointerEvents: 'none'
        }} />
      )}

      {/* Poignée de fade in */}
      <div
        data-fade-handle="true"
        style={{
          position: 'absolute',
          top: `${fadeInHeight}px`,
          left: '50%',
          transform: `translateX(-50%) scale(${(isAdjustingFade === 'fadeIn' || (isHovered && fadeInHeight > 0)) ? '1.5' : '1'})`,
          width: (isAdjustingFade === 'fadeIn' || (isHovered && fadeInHeight > 0)) ? '12px' : '8px',
          height: (isAdjustingFade === 'fadeIn' || (isHovered && fadeInHeight > 0)) ? '12px' : '8px',
          borderRadius: '50%',
          backgroundColor: baseColor,
          opacity: 0.9,
          cursor: 'ew-resize',
          zIndex: 5,
          border: `1px solid ${darkerColor}`,
          transition: 'transform 0.15s ease'
        }}
        onMouseDown={(e) => handleFadeMouseDown(e, 'fadeIn')}
      />
      
      {/* Contenu du bloc */}
      <div style={{ 
        fontSize: '10px', 
        textAlign: 'center', 
        fontWeight: 'bold',
        color: '#333',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}>
        {sound ? sound.label.substring(0, 15) : soundTrack.soundId}
      </div>
      
      {blockHeight > 30 && (
        <div style={{ fontSize: '9px', color: '#666', marginTop: '2px', position: 'relative', zIndex: 1 }}>
          Col {soundTrack.column}
        </div>
      )}

      {/* Poignée de fade out */}
      <div
        data-fade-handle="true"
        style={{
          position: 'absolute',
          bottom: `${fadeOutHeight}px`,
          left: '50%',
          transform: `translateX(-50%) scale(${(isAdjustingFade === 'fadeOut' || (isHovered && fadeOutHeight > 0)) ? '1.5' : '1'})`,
          width: (isAdjustingFade === 'fadeOut' || (isHovered && fadeOutHeight > 0)) ? '12px' : '8px',
          height: (isAdjustingFade === 'fadeOut' || (isHovered && fadeOutHeight > 0)) ? '12px' : '8px',
          borderRadius: '50%',
          backgroundColor: baseColor,
          opacity: 0.9,
          cursor: 'ew-resize',
          zIndex: 5,
          border: `1px solid ${darkerColor}`,
          transition: 'transform 0.15s ease'
        }}
        onMouseDown={(e) => handleFadeMouseDown(e, 'fadeOut')}
      />

      {/* Zone de fade out (dégradé triangulaire) */}
      {fadeOutHeight > 2 && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${fadeOutHeight}px`,
          background: `linear-gradient(to top, 
            ${soundTrack.muted ? '#aaa' : baseColor}00 0%, 
            ${bgColor} 100%)`,
          pointerEvents: 'none'
        }} />
      )}
      
      {/* Handle de resize en bas */}
      <div
        data-resize-handle="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '8px',
          cursor: 'ns-resize',
          backgroundColor: isResizing === 'bottom' || (isHovered && blockHeight > SEGMENT_HEIGHT) ? 'rgba(0,0,0,0.15)' : 'transparent',
          transition: 'background-color 0.15s ease'
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
      />
      
      {/* Indicateur de sélection */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          right: '-2px',
          bottom: '-2px',
          border: '2px solid #333',
          borderRadius: '8px',
          pointerEvents: 'none'
        }} />
      )}

      {/* Overlay pour muted */}
      {mutedOverlay}
    </div>
  )
}

export default SoundBlock
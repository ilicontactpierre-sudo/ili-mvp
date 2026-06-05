import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORY_COLORS, SEGMENT_HEIGHT, COLUMN_WIDTH, COLUMN_COUNT } from './constants'

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
  rowHeights,
  isSelected, 
  onSelect, 
  onDoubleClick,
  onMove, 
  onResize,
  onColumnChange,
  onUpdate,
  onDragStart,
  onDragEnd,
  onDragTargetChange,
  currentSegmentIndex
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(null) // 'top' or 'bottom'
  const [isAdjustingFade, setIsAdjustingFade] = useState(null) // 'fadeIn' or 'fadeOut'
  const [fadeHandlePos, setFadeHandlePos] = useState({ fadeIn: 0, fadeOut: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, column: 0, startSegmentIndex: 0, startBlockTop: 0, startBlockLeft: 0, timelineTop: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [snapOffset, setSnapOffset] = useState({ x: 0, y: 0 })
  const [targetCell, setTargetCell] = useState({ segmentIndex: -1, column: -1 })
  const [resizeStart, setResizeStart] = useState({ y: 0, startSegment: null, endSegment: null })
  const [isHovered, setIsHovered] = useState(false)
  const blockRef = useRef(null)
  const segmentsRef = useRef(segments)
  useEffect(() => { segmentsRef.current = segments }, [segments])
  const fadeStartRef = useRef(null)
  const targetCellRef = useRef({ segmentIndex: -1, column: -1 })
  
  // Garder targetCellRef à jour
  useEffect(() => {
    targetCellRef.current = targetCell
  }, [targetCell])

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
    // D'abord, chercher par id ou _id
    const idx = segments.findIndex(s => s.id === segmentId || s._id === segmentId)
    if (idx !== -1) return idx
    
    // Fallback: si segmentId est au format "segment_N", utiliser N comme index
    const match = segmentId?.match(/^segment_(\d+)$/)
    if (match) {
      const index = parseInt(match[1], 10)
      if (index >= 0 && index < segments.length) return index
    }
    
    return -1
  }, [segments])

  const startSegmentIndex = getSegmentIndex(soundTrack.startSegmentId)
  const endSegmentIndex = getSegmentIndex(soundTrack.endSegmentId)
  
  if (startSegmentIndex === -1) return null

  const actualEndIndex = endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex
  const segmentRange = rowHeights ? rowHeights.slice(startSegmentIndex, actualEndIndex + 1) : []
  const rowHeightSum = segmentRange.length > 0 ? segmentRange.reduce((sum, h) => sum + h, 0) : ((actualEndIndex - startSegmentIndex + 1) * SEGMENT_HEIGHT)
  const separatorHeight = segmentRange.length > 1 ? (segmentRange.length - 1) * 8 : 0

  // Position et dimensions
  const top = 0
  const blockHeight = rowHeightSum + separatorHeight
  const left = soundTrack.column * COLUMN_WIDTH
  const width = COLUMN_WIDTH - 5

  // Calculer les positions de fade en pixels (basé sur la hauteur du bloc)
  const maxFadeHeight = blockHeight * 0.4
  const fadeInHeight = (soundTrack.fadeIn || 0) / 4000 * maxFadeHeight
  const fadeOutHeight = (soundTrack.fadeOut || 0) / 4000 * maxFadeHeight

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
    console.log('MOUSEDOWN target:', e.target.dataset, e.target.tagName)
    if (e.button !== 0) return
    if (e.target.dataset.fadeHandle) return
    if (e.target.dataset.resizeHandle) return
    e.stopPropagation()
    
    onSelect(soundTrack.id, e.shiftKey)
    
    const startX = e.clientX
    const startY = e.clientY
    const blockRect = blockRef.current?.getBoundingClientRect()
    const timelineRoot = blockRef.current?.closest('[data-timeline-root]')
    const timelineRect = timelineRoot ? timelineRoot.getBoundingClientRect() : null
    const timelineTop = timelineRect ? timelineRect.top : 0
    const timelineScrollTop = timelineRoot ? timelineRoot.scrollTop : 0
    const startBlockTop = blockRect ? blockRect.top : 0
    const startBlockLeft = blockRect ? blockRect.left : 0
    let hasMoved = false
    
    setDragStart({
      x: startX,
      y: startY,
      column: soundTrack.column,
      startSegmentIndex,
      startBlockTop,
      startBlockLeft,
      timelineTop,
      timelineScrollTop
    })

    dragStartRef.current = {
      x: startX,
      y: startY,
      column: soundTrack.column,
      startSegmentIndex,
      timelineScrollTop: timelineScrollTop || 0
    }

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx > 3 || absDy > 3) {
        hasMoved = true
        setIsDragging(true)
        setDragOffset({ x: dx, y: dy })
        if (onDragStart) onDragStart()
      }
    }
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      // Ne pas gérer le drop ici — c'est le useEffect qui s'en charge
      // On gère uniquement le cas où le bloc n'a pas bougé
      if (!hasMoved) {
        setIsDragging(false)
      }
      // Si hasMoved, le useEffect handleMouseUp prend le relais
    }
    
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [onSelect, soundTrack.id, soundTrack.column, startSegmentIndex])

  // Gestion du resize (étirement haut/bas)
  const handleResizeMouseDown = useCallback((e, direction) => {
    if (e.button !== 0) return
    e.stopPropagation()
    
    // Obtenir la position absolue du bloc par rapport à la timeline
    const blockRect = blockRef.current?.getBoundingClientRect()
    const timelineRoot = blockRef.current?.closest('[data-timeline-root]')
    const timelineRect = timelineRoot ? timelineRoot.getBoundingClientRect() : null
    const timelineScrollTop = timelineRoot ? timelineRoot.scrollTop : 0
    
    // Position absolue du haut du bloc dans le contenu scrollable
    const absoluteBlockTop = blockRect && timelineRect 
      ? blockRect.top - timelineRect.top + timelineScrollTop 
      : 0
    
    // Position absolue du bas du bloc
    const absoluteBlockBottom = absoluteBlockTop + blockHeight
    
    setIsResizing(direction)
    setResizeStart({
      y: e.clientY,
      startSegment: startSegmentIndex,
      endSegment: endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex,
      rowHeights: rowHeights || [],
      absoluteBlockTop,
      absoluteBlockBottom,
      timelineScrollTop: timelineScrollTop || 0
    })
  }, [startSegmentIndex, endSegmentIndex, rowHeights, blockHeight])

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
const dragStartRef = useRef(null)
  // Ref pour rowHeights — toujours à jour dans les closures des event listeners
  const rowHeightsRef = useRef(rowHeights)
  useEffect(() => { rowHeightsRef.current = rowHeights }, [rowHeights])

  useEffect(() => {
    if (!isDragging && !isResizing && !isAdjustingFade) return
    const handleMouseMove = (e) => {
      // Drag pour changer de colonne ET de ligne
      if (isDragging) {
        const ds = dragStartRef.current
        if (!ds) return
        const deltaX = e.clientX - ds.x
        const deltaY = e.clientY - ds.y
        setDragOffset({ x: deltaX, y: deltaY })
        const timelineRoot = blockRef.current?.closest('[data-timeline-root]')
        const timelineRect = timelineRoot?.getBoundingClientRect()
        const currentScrollTop = timelineRoot ? timelineRoot.scrollTop : 0
        const currentRowHeights = rowHeightsRef.current
        if (timelineRect && currentRowHeights) {
          // Position du CURSEUR dans le contenu scrollable — recalculée à chaque move
          const cursorY = e.clientY - timelineRect.top + currentScrollTop
          const newColumn = Math.max(0, Math.min(COLUMN_COUNT - 1,
            Math.round(ds.column + deltaX / COLUMN_WIDTH)))
          // Trouver la ligne dont le centre est le plus proche du curseur
          let accumulated = 0
          let newStartIndex = 0
          let minDistance = Infinity
          for (let i = 0; i < currentRowHeights.length; i++) {
            const rowHeight = currentRowHeights[i]
            const rowCenter = accumulated + rowHeight / 2
            const distance = Math.abs(cursorY - rowCenter)
            if (distance < minDistance) {
              minDistance = distance
              newStartIndex = i
            }
            accumulated += rowHeight + 8
          }
          setTargetCell({ segmentIndex: newStartIndex, column: newColumn })
          if (onDragTargetChange) {
            onDragTargetChange(newStartIndex, newColumn)
          }
        }
      }
      
      // Resize pour changer la durée
      if (isResizing) {
        const rs = resizeStartRef.current
        if (!rs) return
        const currentRowHeights = rowHeightsRef.current || []
        const startIdx = rs.startSegment
        const endIdx = rs.endSegment
        
        // Recalculer la position absolue du bloc en temps réel depuis le DOM
        const timelineRoot = blockRef.current?.closest('[data-timeline-root]')
        const timelineRect = timelineRoot?.getBoundingClientRect()
        const currentScrollTop = timelineRoot ? timelineRoot.scrollTop : 0
        
        // Position du curseur dans le contenu scrollable
        const cursorAbsoluteY = e.clientY - (timelineRect?.top ?? 0) + currentScrollTop
        
        if (isResizing === 'bottom') {
          // On cherche le segment dont le bas est le plus proche du curseur
          const absoluteBottom = cursorAbsoluteY
          
          // Trouver le segment qui correspond à cette position
          let accumulated = 0
          let newEndIndex = startIdx
          
          for (let i = 0; i < currentRowHeights.length; i++) {
            const rowHeight = currentRowHeights[i] || SEGMENT_HEIGHT
            const rowTotal = rowHeight + 8 // chaque ligne a un séparateur de 8px en bas
            
            // Vérifier si la position du curseur est dans ce segment
            if (absoluteBottom <= accumulated + rowHeight) {
              // Le curseur est dans ce segment — on prend ce segment si curseur > mi-hauteur
              const midPoint = accumulated + rowHeight / 2
              newEndIndex = absoluteBottom >= midPoint ? i : Math.max(startIdx, i - 1)
              break
            }
            
            accumulated += rowTotal
            newEndIndex = i
          }
          
          // S'assurer qu'on a au moins 1 segment et qu'on ne dépasse pas les limites
          newEndIndex = Math.max(startIdx, Math.min(currentRowHeights.length - 1, newEndIndex))
          
          const newEndSegmentId = segmentsRef.current[newEndIndex]?.id || segmentsRef.current[newEndIndex]?._id
          onResize(soundTrack.id, null, newEndSegmentId)
          
        } else if (isResizing === 'top') {
          // Position absolue actuelle du haut du bloc (qui bouge quand on tire)
          const absoluteTop = resizeStart.absoluteBlockTop + deltaY
          
          // Trouver le segment qui correspond à cette position
          let accumulated = 0
          let newStartIndex = startIdx
          
          for (let i = 0; i < currentRowHeights.length; i++) {
            const rowHeight = currentRowHeights[i] || SEGMENT_HEIGHT
            const rowTotal = rowHeight + 8
            
            // Vérifier si la position du curseur est dans ce segment
            if (absoluteTop <= accumulated + rowHeight) {
              // Le curseur est dans ce segment
              const midPoint = accumulated + rowHeight / 2
              if (absoluteTop <= midPoint) {
                newStartIndex = i
              } else if (i < endIdx) {
                newStartIndex = i + 1
              } else {
                newStartIndex = endIdx
              }
              break
            }
            
            accumulated += rowTotal
          }
          
          // S'assurer qu'on ne dépasse pas le segment de fin et qu'on reste >= 0
          newStartIndex = Math.max(0, Math.min(endIdx, newStartIndex))
          
          const newStartSegmentId = segmentsRef.current[newStartIndex]?.id || segmentsRef.current[newStartIndex]?._id
          onResize(soundTrack.id, newStartSegmentId, null)
        }
      }

      // Ajustement des fades
      if (isAdjustingFade && fadeStartRef.current) {
        const deltaY = e.clientY - fadeStartRef.current.y
        // px → ms : on se base sur la hauteur réelle du bloc
        const blockH = fadeStartRef.current.blockHeight
        const maxFadeHeight = blockH * 0.4
        const msPerPixel = 4000 / (maxFadeHeight > 0 ? maxFadeHeight : 1)
        const maxFadeMs = 4000

        const MAX_FADE_MS = 4000
        if (isAdjustingFade === 'fadeIn') {
          const newFadeIn = Math.max(0, Math.min(
            fadeStartRef.current.fadeIn + deltaY * msPerPixel,
            Math.min(maxFadeMs, MAX_FADE_MS)
          ))
          onUpdate(soundTrack.id, { fadeIn: Math.round(newFadeIn) })
        } else if (isAdjustingFade === 'fadeOut') {
          const newFadeOut = Math.max(0, Math.min(
            fadeStartRef.current.fadeOut + (-deltaY) * msPerPixel,
            Math.min(maxFadeMs, MAX_FADE_MS)
          ))
          onUpdate(soundTrack.id, { fadeOut: Math.round(newFadeOut) })
        }
        }
      }

      const handleMouseUp = () => {
      // Utiliser targetCellRef.current pour avoir la valeur la plus récente
      const currentTargetCell = targetCellRef.current
      if (isDragging) {
        // Lire les valeurs depuis la ref — jamais périmées contrairement au state
        const ds = dragStartRef.current || dragStart
        // Appliquer les changements de colonne au moment du relâchement
        if (currentTargetCell.column !== ds.column && currentTargetCell.column >= 0) {
          onColumnChange(soundTrack.id, currentTargetCell.column)
        }
        // Appliquer les changements de ligne (segment) au moment du relâchement
       console.log('MOUSEUP DEBUG:', {
          targetCell: currentTargetCell,
          ds_startSegmentIndex: ds.startSegmentIndex,
          ds_column: ds.column,
          segmentsRefLength: segmentsRef.current.length,
          targetSegmentIndex: currentTargetCell.segmentIndex >= 0 ? currentTargetCell.segmentIndex : ds.startSegmentIndex,
          segAtTarget: segmentsRef.current[currentTargetCell.segmentIndex],
        })
        const targetSegmentIndex = currentTargetCell.segmentIndex >= 0 ? currentTargetCell.segmentIndex : ds.startSegmentIndex
        if (targetSegmentIndex !== ds.startSegmentIndex) {
          const segs = segmentsRef.current
          const currentStartIdx = segs.findIndex(s => s.id === soundTrack.startSegmentId || s._id === soundTrack.startSegmentId)
          const currentEndIdx = segs.findIndex(s => s.id === soundTrack.endSegmentId || s._id === soundTrack.endSegmentId)
          const currentEndIndex = currentEndIdx !== -1 ? currentEndIdx : currentStartIdx
          const getSegId = (seg, idx) => seg?.id || seg?._id || `seg_${idx}`
          const newStartSegmentId = getSegId(segs[targetSegmentIndex], targetSegmentIndex)
          const offset = currentEndIndex - ds.startSegmentIndex
          const newEndIndex = Math.min(segs.length - 1, Math.max(0, targetSegmentIndex + offset))
          const newEndSegmentId = getSegId(segs[newEndIndex], newEndIndex)
          onResize(soundTrack.id, newStartSegmentId, newEndSegmentId)
        
        }
        if (onDragEnd) onDragEnd()
      }
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
      setSnapOffset({ x: 0, y: 0 })
      setTargetCell({ segmentIndex: -1, column: -1 })
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
      data-sound-block="true"
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
        zIndex: isDragging ? 1000 : (isSelected ? 10 : 1),
        transform: isDragging ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : 'none',
        opacity: isDragging ? 0.85 : 1,
        pointerEvents: 'auto'
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
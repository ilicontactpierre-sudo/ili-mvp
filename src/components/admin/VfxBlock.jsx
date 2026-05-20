import { useState, useRef, useCallback } from 'react'
import { VFX_TYPES, VFX_COLORS, SEGMENT_HEIGHT, VFX_COLUMN_WIDTH, VFX_COLUMN_COUNT } from './constants'

function VfxBlock({
  vfxTrack,
  segments,
  rowHeights,
  isSelected,
  onSelect,
  onDoubleClick,
  onUpdate,
  onResize,
  onDragStart,
  onDragEnd,
  onDragTargetChange,
}) {
  const [isDragging, setIsDragging]   = useState(false)
  const [isResizing, setIsResizing]   = useState(null)
  const [dragOffset, setDragOffset]   = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered]     = useState(false)

  const blockRef      = useRef(null)
  // Toutes les valeurs de drag/resize dans des refs — jamais dans le state
  const dragRef       = useRef(null)
  const resizeRef     = useRef(null)
  const targetCellRef = useRef({ segmentIndex: -1, column: -1 })

  // ── Résolution des indices ─────────────────────────────────
  const getSegmentIndex = useCallback((segmentId) => {
    const idx = segments.findIndex(s => s.id === segmentId || s._id === segmentId)
    if (idx !== -1) return idx
    const match = segmentId?.match(/^segment_(\d+)$/)
    if (match) {
      const i = parseInt(match[1], 10)
      if (i >= 0 && i < segments.length) return i
    }
    return -1
  }, [segments])

  const startSegmentIndex = getSegmentIndex(vfxTrack.startSegmentId)
  const endSegmentIndex   = getSegmentIndex(vfxTrack.endSegmentId)
  if (startSegmentIndex === -1) return null

  const actualEndIndex  = endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex
  const segmentRange    = rowHeights ? rowHeights.slice(startSegmentIndex, actualEndIndex + 1) : []
  const rowHeightSum    = segmentRange.length > 0
    ? segmentRange.reduce((sum, h) => sum + h, 0)
    : (actualEndIndex - startSegmentIndex + 1) * SEGMENT_HEIGHT
  const separatorHeight = segmentRange.length > 1 ? (segmentRange.length - 1) * 8 : 0
  const blockHeight     = rowHeightSum + separatorHeight
  const left            = vfxTrack.column * VFX_COLUMN_WIDTH
  const width           = VFX_COLUMN_WIDTH - 4

  const baseColor   = VFX_COLORS[vfxTrack.type] || '#B0B0B0'
  const bgColor     = isSelected ? baseColor : `${baseColor}99`
  const borderColor = isSelected ? '#333' : baseColor
  const typeDef     = VFX_TYPES[vfxTrack.type] || {}
  const label       = typeDef.label || vfxTrack.type
  const loopStr     = vfxTrack.loop ? ' ↺' : ''

  // ── DRAG ──────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.dataset.resizeHandle) return
    e.stopPropagation()
    onSelect(vfxTrack.id, e.shiftKey)

    // Stocker TOUT dans la ref — pas dans le state
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      column: vfxTrack.column,
      startSegmentIndex,   // valeur correcte capturée maintenant
      actualEndIndex,
      hasMoved: false,
      rowHeights: rowHeights || [],
    }
    targetCellRef.current = { segmentIndex: -1, column: -1 }

    const onMouseMove = (ev) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = ev.clientX - drag.startX
      const dy = ev.clientY - drag.startY

      if (!drag.hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        drag.hasMoved = true
        setIsDragging(true)
        if (onDragStart) onDragStart()
      }
      if (!drag.hasMoved) return

      setDragOffset({ x: dx, y: dy })

      // Calculer la cellule cible depuis la position du bloc dans la timeline
      const timelineRoot = blockRef.current?.closest('[data-timeline-root]')
      const blockRect    = blockRef.current?.getBoundingClientRect()
      const timelineRect = timelineRoot?.getBoundingClientRect()
      const scrollTop    = timelineRoot ? timelineRoot.scrollTop : 0

      if (blockRect && timelineRect) {
        // Centre Y du bloc dans le scroll container
        const relY = blockRect.top - timelineRect.top + scrollTop + blockRect.height / 2

        // Colonne cible basée sur le delta X depuis le début
        const newColumn = Math.max(0, Math.min(VFX_COLUMN_COUNT - 1,
          Math.round(drag.column + dx / VFX_COLUMN_WIDTH)))

        // Ligne cible : chercher le segment dont le centre est le plus proche
        let accumulated = 0, newStartIndex = 0, minDist = Infinity
        const rh = drag.rowHeights
        for (let i = 0; i < rh.length; i++) {
          const center   = accumulated + rh[i] / 2
          const distance = Math.abs(relY - center)
          if (distance < minDist) { minDist = distance; newStartIndex = i }
          accumulated += rh[i] + 8
        }

        targetCellRef.current = { segmentIndex: newStartIndex, column: newColumn }
        if (onDragTargetChange) onDragTargetChange(newStartIndex, newColumn)
      }
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)

      const drag    = dragRef.current
      const current = targetCellRef.current
      if (drag && drag.hasMoved) {
        const updates = {}
        const newCol    = current.column >= 0 ? current.column : drag.column
        const targetIdx = current.segmentIndex >= 0 ? current.segmentIndex : drag.startSegmentIndex

        if (newCol !== drag.column) {
          updates.column = newCol
        }
        if (targetIdx !== drag.startSegmentIndex) {
          const newStartId = segments[targetIdx]?.id || segments[targetIdx]?._id
          const offset     = drag.actualEndIndex - drag.startSegmentIndex
          const newEndIdx  = Math.min(segments.length - 1, targetIdx + offset)
          const newEndId   = segments[newEndIdx]?.id || segments[newEndIdx]?._id
          updates.startSegmentId = newStartId
          updates.endSegmentId   = newEndId
        }
        if (Object.keys(updates).length > 0) {
          onUpdate(vfxTrack.id, updates)
        }
        if (onDragEnd) onDragEnd()
      }

      dragRef.current = null
      targetCellRef.current = { segmentIndex: -1, column: -1 }
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [vfxTrack.id, vfxTrack.column, startSegmentIndex, actualEndIndex, segments, rowHeights,
      onSelect, onDragStart, onDragEnd, onDragTargetChange, onUpdate])

  // ── RESIZE ────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e, direction) => {
    if (e.button !== 0) return
    e.stopPropagation()

    const blockRect    = blockRef.current?.getBoundingClientRect()
    const timelineRoot = blockRef.current?.closest('[data-timeline-root]')
    const timelineRect = timelineRoot?.getBoundingClientRect()
    const scrollTop    = timelineRoot ? timelineRoot.scrollTop : 0
    const absTop       = blockRect && timelineRect ? blockRect.top - timelineRect.top + scrollTop : 0

    resizeRef.current = {
      direction,
      startY: e.clientY,
      startSegment: startSegmentIndex,
      endSegment: actualEndIndex,
      rowHeights: rowHeights || [],
      absoluteBlockTop: absTop,
      absoluteBlockBottom: absTop + blockHeight,
    }
    setIsResizing(direction)

    const onMouseMove = (ev) => {
      const r = resizeRef.current
      if (!r) return
      const deltaY = ev.clientY - r.startY
      const rh     = r.rowHeights

      if (r.direction === 'bottom') {
        const absBottom = r.absoluteBlockBottom + deltaY
        let accumulated = 0, newEndIndex = r.startSegment
        for (let i = 0; i < rh.length; i++) {
          const h = rh[i] || SEGMENT_HEIGHT
          if (absBottom <= accumulated + h) {
            newEndIndex = absBottom >= accumulated + h / 2 ? i : Math.max(r.startSegment, i - 1)
            break
          }
          accumulated += h + 8
          newEndIndex = i
        }
        newEndIndex = Math.max(r.startSegment, Math.min(rh.length - 1, newEndIndex))
        onResize(vfxTrack.id, null, segments[newEndIndex]?.id || segments[newEndIndex]?._id)

      } else if (r.direction === 'top') {
        const absTop = r.absoluteBlockTop + deltaY
        let accumulated = 0, newStartIndex = r.startSegment
        for (let i = 0; i < rh.length; i++) {
          const h = rh[i] || SEGMENT_HEIGHT
          if (absTop <= accumulated + h) {
            newStartIndex = absTop <= accumulated + h / 2 ? i : Math.min(r.endSegment, i + 1)
            break
          }
          accumulated += h + 8
        }
        newStartIndex = Math.max(0, Math.min(r.endSegment, newStartIndex))
        onResize(vfxTrack.id, segments[newStartIndex]?.id || segments[newStartIndex]?._id, null)
      }
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      resizeRef.current = null
      setIsResizing(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [startSegmentIndex, actualEndIndex, rowHeights, blockHeight, vfxTrack.id, segments, onResize])

  // ── RENDU ─────────────────────────────────────────────────
  return (
    <div
      ref={blockRef}
      data-vfx-block="true"
      style={{
        position: 'absolute',
        top: 0,
        left: `${left}px`,
        width: `${width}px`,
        height: `${blockHeight}px`,
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '5px',
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2px',
        overflow: 'hidden',
        userSelect: 'none',
        transition: isDragging || isResizing ? 'none' : 'all 0.15s ease',
        boxShadow: isSelected
          ? '0 0 0 2px #333, 0 4px 8px rgba(0,0,0,0.2)'
          : '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: isDragging ? 1000 : (isSelected ? 10 : 1),
        transform: isDragging ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : 'none',
        opacity: isDragging ? 0.85 : 1,
        pointerEvents: 'auto',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick && onDoubleClick(vfxTrack) }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Handle resize haut */}
      <div
        data-resize-handle="true"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '8px',
          cursor: 'ns-resize',
          backgroundColor: isResizing === 'top' || (isHovered && blockHeight > SEGMENT_HEIGHT)
            ? 'rgba(0,0,0,0.15)' : 'transparent',
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
      />

      {/* Contenu */}
      <div style={{
        fontSize: '9px', fontWeight: 'bold', color: '#333',
        textAlign: 'center', lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        width: '100%', padding: '0 2px', boxSizing: 'border-box',
        pointerEvents: 'none',
      }}>
        {label}
      </div>
      {blockHeight > 32 && vfxTrack.mode && (
        <div style={{
          fontSize: '8px', color: '#555', marginTop: '1px', pointerEvents: 'none'
        }}>
          {vfxTrack.mode}{loopStr}
        </div>
      )}

      {/* Handle resize bas */}
      <div
        data-resize-handle="true"
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px',
          cursor: 'ns-resize',
          backgroundColor: isResizing === 'bottom' || (isHovered && blockHeight > SEGMENT_HEIGHT)
            ? 'rgba(0,0,0,0.15)' : 'transparent',
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
      />

      {/* Indicateur sélection */}
      {isSelected && (
        <div style={{
          position: 'absolute', inset: '-2px',
          border: '2px solid #333', borderRadius: '7px', pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}

export default VfxBlock

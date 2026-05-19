import { useState, useRef, useEffect, useCallback } from 'react'
import { VFX_TYPES, VFX_COLORS, SEGMENT_HEIGHT, VFX_COLUMN_WIDTH, VFX_COLUMN_COUNT } from './constants'

function VfxBlock({
  vfxTrack,
  segments,
  rowHeights,
  isSelected,
  onSelect,
  onDoubleClick,
  onColumnChange,
  onResize,
  onDragStart,
  onDragEnd,
  onDragTargetChange,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, column: 0, startSegmentIndex: 0 })
  const [targetCell, setTargetCell] = useState({ segmentIndex: -1, column: -1 })
  const [resizeStart, setResizeStart] = useState({ y: 0, startSegment: 0, endSegment: 0, absoluteBlockTop: 0, absoluteBlockBottom: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const blockRef = useRef(null)
  const targetCellRef = useRef({ segmentIndex: -1, column: -1 })


  // Résolution des indices de segment
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

  const actualEndIndex = endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex
  const segmentRange   = rowHeights ? rowHeights.slice(startSegmentIndex, actualEndIndex + 1) : []
  const rowHeightSum   = segmentRange.length > 0
    ? segmentRange.reduce((sum, h) => sum + h, 0)
    : (actualEndIndex - startSegmentIndex + 1) * SEGMENT_HEIGHT
  const separatorHeight = segmentRange.length > 1 ? (segmentRange.length - 1) * 8 : 0

  const blockHeight = rowHeightSum + separatorHeight
  const left        = vfxTrack.column * VFX_COLUMN_WIDTH
  const width       = VFX_COLUMN_WIDTH - 4

  const baseColor  = VFX_COLORS[vfxTrack.type] || '#B0B0B0'
  const bgColor    = isSelected ? baseColor : `${baseColor}99`
  const borderColor = isSelected ? '#333' : baseColor

  const typeDef = VFX_TYPES[vfxTrack.type] || {}
  const label   = typeDef.label || vfxTrack.type
  const modeStr = vfxTrack.mode ? ` · ${vfxTrack.mode}` : ''
  const loopStr = vfxTrack.loop ? ' ↺' : ''

  // Drag
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.dataset.resizeHandle) return
    e.stopPropagation()
    onSelect(vfxTrack.id, e.shiftKey)

    const startX = e.clientX
    const startY = e.clientY
    let hasMoved = false

    setDragStart({ x: startX, y: startY, column: vfxTrack.column, startSegmentIndex })

    const onMouseMove = (ev) => {
      const dx = Math.abs(ev.clientX - startX)
      const dy = Math.abs(ev.clientY - startY)
      if (dx > 3 || dy > 3) {
        hasMoved = true
        setIsDragging(true)
        setDragOffset({ x: ev.clientX - startX, y: ev.clientY - startY })
        if (onDragStart) onDragStart()
      }
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (!hasMoved) setIsDragging(false)
      else if (onDragEnd) onDragEnd()
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [vfxTrack.id, vfxTrack.column, startSegmentIndex, onSelect, onDragStart, onDragEnd])

  // Resize
  const handleResizeMouseDown = useCallback((e, direction) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const blockRect    = blockRef.current?.getBoundingClientRect()
    const timelineRoot = blockRef.current?.closest('[data-timeline-root]')
    const timelineRect = timelineRoot?.getBoundingClientRect()
    const scrollTop    = timelineRoot ? timelineRoot.scrollTop : 0
    const absTop       = blockRect && timelineRect ? blockRect.top - timelineRect.top + scrollTop : 0
    setIsResizing(direction)
    setResizeStart({
      y: e.clientY,
      startSegment: startSegmentIndex,
      endSegment: actualEndIndex,
      rowHeights: rowHeights || [],
      absoluteBlockTop: absTop,
      absoluteBlockBottom: absTop + blockHeight,
    })
  }, [startSegmentIndex, actualEndIndex, rowHeights, blockHeight])

  // Mouse events
  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handleMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x
        const deltaY = e.clientY - dragStart.y
        setDragOffset({ x: deltaX, y: deltaY })

        const timelineRoot = blockRef.current?.closest('[data-timeline-root]')
        const blockRect    = blockRef.current?.getBoundingClientRect()
        const timelineRect = timelineRoot?.getBoundingClientRect()
        const scrollTop    = timelineRoot ? timelineRoot.scrollTop : 0

        if (blockRect && timelineRect && rowHeights) {
          const relY      = blockRect.top - timelineRect.top + scrollTop + blockRect.height / 2
          const newColumn = Math.max(0, Math.min(VFX_COLUMN_COUNT - 1,
            Math.round(dragStart.column + deltaX / VFX_COLUMN_WIDTH)))

          let accumulated = 0, newStartIndex = 0, minDist = Infinity
          for (let i = 0; i < rowHeights.length; i++) {
            const center   = accumulated + rowHeights[i] / 2
            const distance = Math.abs(relY - center)
            if (distance < minDist) { minDist = distance; newStartIndex = i }
            accumulated += rowHeights[i] + 8
          }

          // Mise à jour directe et synchrone — évite le décalage du useEffect
          targetCellRef.current = { segmentIndex: newStartIndex, column: newColumn }
          setTargetCell({ segmentIndex: newStartIndex, column: newColumn })
          if (onDragTargetChange) onDragTargetChange(newStartIndex, newColumn)
        }
      }

      if (isResizing) {
        const deltaY       = e.clientY - resizeStart.y
        const currentHeights = resizeStart.rowHeights
        const startIdx     = resizeStart.startSegment
        const endIdx       = resizeStart.endSegment

        if (isResizing === 'bottom') {
          const absBottom = resizeStart.absoluteBlockBottom + deltaY
          let accumulated = 0, newEndIndex = startIdx
          for (let i = 0; i < currentHeights.length; i++) {
            const h = currentHeights[i] || SEGMENT_HEIGHT
            if (absBottom <= accumulated + h) {
              newEndIndex = absBottom >= accumulated + h / 2 ? i : Math.max(startIdx, i - 1)
              break
            }
            accumulated += h + 8
            newEndIndex = i
          }
          newEndIndex = Math.max(startIdx, Math.min(currentHeights.length - 1, newEndIndex))
          onResize(vfxTrack.id, null, segments[newEndIndex]?.id || segments[newEndIndex]?._id)

        } else if (isResizing === 'top') {
          const absTop = resizeStart.absoluteBlockTop + deltaY
          let accumulated = 0, newStartIndex = startIdx
          for (let i = 0; i < currentHeights.length; i++) {
            const h = currentHeights[i] || SEGMENT_HEIGHT
            if (absTop <= accumulated + h) {
              newStartIndex = absTop <= accumulated + h / 2 ? i : Math.min(endIdx, i + 1)
              break
            }
            accumulated += h + 8
          }
          newStartIndex = Math.max(0, Math.min(endIdx, newStartIndex))
          onResize(vfxTrack.id, segments[newStartIndex]?.id || segments[newStartIndex]?._id, null)
        }
      }
    }

    const handleMouseUp = () => {
      const current = targetCellRef.current
      if (isDragging) {
        const newCol    = current.column >= 0 ? current.column : dragStart.column
        const targetIdx = current.segmentIndex >= 0 ? current.segmentIndex : dragStart.startSegmentIndex

        const updates = {}
        if (newCol !== dragStart.column) {
          updates.column = newCol
        }
        if (targetIdx !== dragStart.startSegmentIndex) {
          const newStartId = segments[targetIdx]?.id || segments[targetIdx]?._id
          const offset     = actualEndIndex - dragStart.startSegmentIndex
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
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
      setTargetCell({ segmentIndex: -1, column: -1 })
      setIsResizing(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragStart, resizeStart, vfxTrack.id, segments, actualEndIndex, onUpdate, onResize, onDragEnd])


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
        boxShadow: isSelected ? '0 0 0 2px #333, 0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: isDragging ? 1000 : (isSelected ? 10 : 1),
        transform: isDragging ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : 'none',
        opacity: isDragging ? 0.85 : 1,
        pointerEvents: 'auto',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => onDoubleClick && onDoubleClick(vfxTrack)}
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
          transition: 'background-color 0.15s ease',
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
      />

      {/* Contenu */}
      <div style={{
        fontSize: '9px', fontWeight: 'bold', color: '#333',
        textAlign: 'center', lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        width: '100%', padding: '0 2px', boxSizing: 'border-box',
      }}>
        {label}
      </div>
      {blockHeight > 32 && modeStr && (
        <div style={{ fontSize: '8px', color: '#555', marginTop: '1px' }}>
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
          transition: 'background-color 0.15s ease',
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

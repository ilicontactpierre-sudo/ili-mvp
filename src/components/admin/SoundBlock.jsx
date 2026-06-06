import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORY_COLORS, SEGMENT_HEIGHT, COLUMN_WIDTH, COLUMN_COUNT } from './constants'

function getDarkerColor(color) {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
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
  // ── States visuels uniquement ────────────────────────────
  const [isDragging, setIsDragging]       = useState(false)
  const [isResizing, setIsResizing]       = useState(null)
  const [isAdjustingFade, setIsAdjustingFade] = useState(null)
  const [dragOffset, setDragOffset]       = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered]         = useState(false)

  // ── Refs — jamais de closure périmée ────────────────────
  const blockRef      = useRef(null)
  const segmentsRef   = useRef(segments)
  const rowHeightsRef = useRef(rowHeights)
  const propsRef      = useRef({})   // snapshot des props callbacks à jour

  useEffect(() => { segmentsRef.current   = segments   }, [segments])
  useEffect(() => { rowHeightsRef.current = rowHeights }, [rowHeights])
  useEffect(() => {
    propsRef.current = { onSelect, onDoubleClick, onResize, onColumnChange, onUpdate, onDragStart, onDragEnd, onDragTargetChange, soundTrack, onMove }
  })

  // ── Couleurs ─────────────────────────────────────────────
  const sound = soundLibrary.find(s => s.id === soundTrack.soundId)
  const getColor = useCallback(() => {
    if (!sound) return '#ccc'
    const categories = sound.categories || []
    for (const cat of categories) {
      if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat]
    }
    return CATEGORY_COLORS['Autre']
  }, [sound])

  const baseColor   = getColor()
  const darkerColor = getDarkerColor(baseColor)
  const bgColor     = soundTrack.muted ? '#888' : (isSelected ? baseColor : `${baseColor}99`)
  const borderColor = isSelected ? '#333' : baseColor

  // ── Indices et dimensions ────────────────────────────────
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

  const startSegmentIndex = getSegmentIndex(soundTrack.startSegmentId)
  const endSegmentIndex   = getSegmentIndex(soundTrack.endSegmentId)
  if (startSegmentIndex === -1) return null

  const actualEndIndex  = endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex
  const segmentRange    = rowHeights ? rowHeights.slice(startSegmentIndex, actualEndIndex + 1) : []
  const rowHeightSum    = segmentRange.length > 0
    ? segmentRange.reduce((sum, h) => sum + h, 0)
    : (actualEndIndex - startSegmentIndex + 1) * SEGMENT_HEIGHT
  const separatorHeight = segmentRange.length > 1 ? (segmentRange.length - 1) * 8 : 0
  const blockHeight     = rowHeightSum + separatorHeight
  const left            = soundTrack.column * COLUMN_WIDTH
  const width           = COLUMN_WIDTH - 5
  const maxFadeHeight   = blockHeight * 0.4
  const fadeInHeight    = (soundTrack.fadeIn  || 0) / 4000 * maxFadeHeight
  const fadeOutHeight   = (soundTrack.fadeOut || 0) / 4000 * maxFadeHeight

  const loopPattern = soundTrack.loop ? `repeating-linear-gradient(
    45deg, ${baseColor}, ${baseColor} 6px, ${darkerColor} 6px, ${darkerColor} 12px
  )` : 'none'

  // ── Helpers partagés ─────────────────────────────────────
  const getTimelineInfo = () => {
    const timelineRoot = blockRef.current?.closest('[data-timeline-root]')
    const timelineRect = timelineRoot?.getBoundingClientRect()
    const scrollTop    = timelineRoot ? timelineRoot.scrollTop : 0
    return { timelineRoot, timelineRect, scrollTop }
  }

  const findSegmentAtY = (cursorAbsoluteY, rh) => {
    let accumulated = 0
    for (let i = 0; i < rh.length; i++) {
      const h = rh[i] || SEGMENT_HEIGHT
      if (cursorAbsoluteY <= accumulated + h) {
        return i
      }
      accumulated += h + 8
    }
    return rh.length - 1
  }

  const findNearestSegment = (cursorAbsoluteY, rh) => {
    let accumulated = 0
    let best = 0
    let minDist = Infinity
    for (let i = 0; i < rh.length; i++) {
      const h      = rh[i] || SEGMENT_HEIGHT
      const center = accumulated + h / 2
      const dist   = Math.abs(cursorAbsoluteY - center)
      if (dist < minDist) { minDist = dist; best = i }
      accumulated += h + 8
    }
    return best
  }

  // ── DRAG principal ───────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.dataset.fadeHandle)   return
    if (e.target.dataset.resizeHandle) return
    e.stopPropagation()

    const p = propsRef.current
    p.onSelect(p.soundTrack.id, e.shiftKey)

    const startX   = e.clientX
    const startY   = e.clientY
    const startCol = p.soundTrack.column

    // Capturer tout au mousedown
    const { timelineRect, scrollTop: scrollTopAtStart } = getTimelineInfo()
    const timelineRectTop = timelineRect?.top ?? 0

    // Index de départ depuis les refs (jamais périmées)
    const segs        = segmentsRef.current
    const startSegIdx = segs.findIndex(s =>
      s.id === p.soundTrack.startSegmentId || s._id === p.soundTrack.startSegmentId)
    const endSegIdx   = segs.findIndex(s =>
      s.id === p.soundTrack.endSegmentId   || s._id === p.soundTrack.endSegmentId)
    const endSegIdxSafe = endSegIdx !== -1 ? endSegIdx : startSegIdx

    let hasMoved = false
    let lastTargetCol = startCol
    let lastTargetSegIdx = startSegIdx

    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY

      if (!hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        hasMoved = true
        setIsDragging(true)
        if (p.onDragStart) p.onDragStart()
      }
      if (!hasMoved) return

      // Mise à jour visuelle — un seul setState, pas de cascade
      setDragOffset({ x: dx, y: dy })

      // Calcul de la cible — tout depuis les refs
      const rh = rowHeightsRef.current
      if (!rh) return

      const { timelineRoot } = getTimelineInfo()
      const currentScrollTop = timelineRoot ? timelineRoot.scrollTop : 0
      const cursorY = ev.clientY - timelineRectTop + currentScrollTop

      const newCol     = Math.max(0, Math.min(COLUMN_COUNT - 1, Math.round(startCol + dx / COLUMN_WIDTH)))
      const newSegIdx  = findNearestSegment(cursorY, rh)

      lastTargetCol    = newCol
      lastTargetSegIdx = newSegIdx

      if (p.onDragTargetChange) p.onDragTargetChange(newSegIdx, newCol)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      if (!hasMoved) {
        setIsDragging(false)
        return
      }

      // Appliquer les changements — tout depuis les refs/closures
      const segsNow = segmentsRef.current
      const getSegId = (seg, idx) => seg?.id || seg?._id || `seg_${idx}`

      if (lastTargetCol !== startCol) {
        p.onColumnChange(p.soundTrack.id, lastTargetCol)
      }
      if (lastTargetSegIdx !== startSegIdx) {
        const newStartId  = getSegId(segsNow[lastTargetSegIdx], lastTargetSegIdx)
        const offset      = endSegIdxSafe - startSegIdx
        const newEndIdx   = Math.min(segsNow.length - 1, Math.max(0, lastTargetSegIdx + offset))
        const newEndId    = getSegId(segsNow[newEndIdx], newEndIdx)
        p.onResize(p.soundTrack.id, newStartId, newEndId)
      }

      if (p.onDragEnd) p.onDragEnd()

      // Reset visuel APRÈS callbacks
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
  }, []) // ← pas de dépendances : tout vient des refs

  // ── RESIZE ───────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e, direction) => {
    if (e.button !== 0) return
    e.stopPropagation()

    const p = propsRef.current

    // Tout capturer au mousedown
    const { timelineRect, scrollTop } = getTimelineInfo()
    const timelineRectTop = timelineRect?.top ?? 0

    const segs       = segmentsRef.current
    const rh         = rowHeightsRef.current || []
    const startIdx   = segs.findIndex(s => s.id === p.soundTrack.startSegmentId || s._id === p.soundTrack.startSegmentId)
    const endIdx     = segs.findIndex(s => s.id === p.soundTrack.endSegmentId   || s._id === p.soundTrack.endSegmentId)
    const endIdxSafe = endIdx !== -1 ? endIdx : startIdx

    let pendingIndex = direction === 'top' ? startIdx : endIdxSafe

    setIsResizing(direction)

    const onMove = (ev) => {
      const { timelineRoot } = getTimelineInfo()
      const currentScrollTop = timelineRoot ? timelineRoot.scrollTop : 0
      const cursorY = ev.clientY - timelineRectTop + currentScrollTop
      const rh = rowHeightsRef.current || []

      if (direction === 'bottom') {
        let accumulated = 0
        let newEnd = startIdx
        for (let i = 0; i < rh.length; i++) {
          const h = rh[i] || SEGMENT_HEIGHT
          if (cursorY <= accumulated + h) {
            newEnd = cursorY >= accumulated + h / 2 ? i : Math.max(startIdx, i - 1)
            break
          }
          accumulated += h + 8
          newEnd = i
        }
        pendingIndex = Math.max(startIdx, Math.min(rh.length - 1, newEnd))
      } else {
        let accumulated = 0
        let newStart = startIdx
        for (let i = 0; i < rh.length; i++) {
          const h = rh[i] || SEGMENT_HEIGHT
          if (cursorY <= accumulated + h) {
            newStart = cursorY <= accumulated + h / 2 ? i : Math.min(endIdxSafe, i + 1)
            break
          }
          accumulated += h + 8
        }
        pendingIndex = Math.max(0, Math.min(endIdxSafe, newStart))
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',  onUp)

      const segsNow = segmentsRef.current
      const seg     = segsNow[pendingIndex]
      const segId   = seg?.id || seg?._id

      if (direction === 'bottom') {
        p.onResize(p.soundTrack.id, null, segId)
      } else {
        p.onResize(p.soundTrack.id, segId, null)
      }

      setIsResizing(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
  }, []) // ← pas de dépendances

  // ── FADE ─────────────────────────────────────────────────
  const handleFadeMouseDown = useCallback((e, type) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    const p         = propsRef.current
    const startY    = e.clientY
    const initFadeIn  = p.soundTrack.fadeIn  || 0
    const initFadeOut = p.soundTrack.fadeOut || 0
    const bh        = blockHeight

    setIsAdjustingFade(type)

    const onMove = (ev) => {
      const deltaY       = ev.clientY - startY
      const maxFH        = bh * 0.4
      const msPerPixel   = 4000 / (maxFH > 0 ? maxFH : 1)
      if (type === 'fadeIn') {
        const newFadeIn = Math.max(0, Math.min(initFadeIn + deltaY * msPerPixel, 4000))
        p.onUpdate(p.soundTrack.id, { fadeIn: Math.round(newFadeIn) })
      } else {
        const newFadeOut = Math.max(0, Math.min(initFadeOut + (-deltaY) * msPerPixel, 4000))
        p.onUpdate(p.soundTrack.id, { fadeOut: Math.round(newFadeOut) })
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',  onUp)
      setIsAdjustingFade(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
  }, [blockHeight])

  // ── Rendu ────────────────────────────────────────────────
  const backgroundStyle = soundTrack.loop ? { background: loopPattern } : {}
  const mutedOverlay = soundTrack.muted ? (
    <div style={{
      position: 'absolute', top: '50%', left: '10%', right: '10%',
      height: '2px', backgroundColor: 'rgba(0,0,0,0.5)', transform: 'rotate(-15deg)'
    }} />
  ) : null

  return (
    <div
      ref={blockRef}
      data-sound-block="true"
      style={{
        position: 'absolute',
        top: 0,
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
      {/* Poignée resize haut */}
      <div
        data-resize-handle="true"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '8px',
          cursor: 'ns-resize',
          backgroundColor: isResizing === 'top' || (isHovered && blockHeight > SEGMENT_HEIGHT)
            ? 'rgba(0,0,0,0.15)' : 'transparent',
          transition: 'background-color 0.15s ease'
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
      />

      {/* Fade in */}
      {fadeInHeight > 2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: `${fadeInHeight}px`,
          background: `linear-gradient(to bottom, ${soundTrack.muted ? '#aaa' : baseColor}00 0%, ${bgColor} 100%)`,
          pointerEvents: 'none'
        }} />
      )}
      <div
        data-fade-handle="true"
        style={{
          position: 'absolute',
          top: `${fadeInHeight}px`,
          left: '50%',
          transform: `translateX(-50%) scale(${(isAdjustingFade === 'fadeIn' || (isHovered && fadeInHeight > 0)) ? '1.5' : '1'})`,
          width:  (isAdjustingFade === 'fadeIn' || (isHovered && fadeInHeight > 0)) ? '12px' : '8px',
          height: (isAdjustingFade === 'fadeIn' || (isHovered && fadeInHeight > 0)) ? '12px' : '8px',
          borderRadius: '50%', backgroundColor: baseColor, opacity: 0.9,
          cursor: 'ew-resize', zIndex: 5, border: `1px solid ${darkerColor}`,
          transition: 'transform 0.15s ease'
        }}
        onMouseDown={(e) => handleFadeMouseDown(e, 'fadeIn')}
      />

      {/* Label */}
      <div style={{
        fontSize: '10px', textAlign: 'center', fontWeight: 'bold', color: '#333',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        width: '100%', position: 'relative', zIndex: 1
      }}>
        {sound ? sound.label.substring(0, 15) : soundTrack.soundId}
      </div>
      {blockHeight > 30 && (
        <div style={{ fontSize: '9px', color: '#666', marginTop: '2px', position: 'relative', zIndex: 1 }}>
          Col {soundTrack.column}
        </div>
      )}

      {/* Fade out */}
      <div
        data-fade-handle="true"
        style={{
          position: 'absolute',
          bottom: `${fadeOutHeight}px`,
          left: '50%',
          transform: `translateX(-50%) scale(${(isAdjustingFade === 'fadeOut' || (isHovered && fadeOutHeight > 0)) ? '1.5' : '1'})`,
          width:  (isAdjustingFade === 'fadeOut' || (isHovered && fadeOutHeight > 0)) ? '12px' : '8px',
          height: (isAdjustingFade === 'fadeOut' || (isHovered && fadeOutHeight > 0)) ? '12px' : '8px',
          borderRadius: '50%', backgroundColor: baseColor, opacity: 0.9,
          cursor: 'ew-resize', zIndex: 5, border: `1px solid ${darkerColor}`,
          transition: 'transform 0.15s ease'
        }}
        onMouseDown={(e) => handleFadeMouseDown(e, 'fadeOut')}
      />
      {fadeOutHeight > 2 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: `${fadeOutHeight}px`,
          background: `linear-gradient(to top, ${soundTrack.muted ? '#aaa' : baseColor}00 0%, ${bgColor} 100%)`,
          pointerEvents: 'none'
        }} />
      )}

      {/* Poignée resize bas */}
      <div
        data-resize-handle="true"
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px',
          cursor: 'ns-resize',
          backgroundColor: isResizing === 'bottom' || (isHovered && blockHeight > SEGMENT_HEIGHT)
            ? 'rgba(0,0,0,0.15)' : 'transparent',
          transition: 'background-color 0.15s ease'
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
      />

      {/* Indicateur sélection */}
      {isSelected && (
        <div style={{
          position: 'absolute', top: '-2px', left: '-2px', right: '-2px', bottom: '-2px',
          border: '2px solid #333', borderRadius: '8px', pointerEvents: 'none'
        }} />
      )}
      {mutedOverlay}
    </div>
  )
}

export default SoundBlock

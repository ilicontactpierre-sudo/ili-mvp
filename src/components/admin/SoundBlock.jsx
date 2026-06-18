import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORY_COLORS, SEGMENT_HEIGHT, COLUMN_WIDTH, COLUMN_COUNT, AUTOMATION_FADE_STEPS } from './constants'

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
  currentSegmentIndex,
  isCmdPressed,
}) {
  // ── States visuels uniquement ────────────────────────────
  const [isDragging, setIsDragging]               = useState(false)
  const [isResizing, setIsResizing]               = useState(null)
  const [isAdjustingFade, setIsAdjustingFade]     = useState(null)
  const [dragOffset, setDragOffset]               = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered]                 = useState(false)
  const [automationTooltip, setAutomationTooltip] = useState(null) // { pointIndex, volume }

  // ── Refs — jamais de closure périmée ────────────────────
  const blockRef      = useRef(null)
  const segmentsRef   = useRef(segments)
  const rowHeightsRef = useRef(rowHeights)
  const propsRef      = useRef({})   // snapshot des props callbacks à jour

  useEffect(() => { segmentsRef.current   = segments   }, [segments])
  useEffect(() => { rowHeightsRef.current = rowHeights }, [rowHeights])
  const soundTrackRef = useRef(soundTrack)
  useEffect(() => { soundTrackRef.current = soundTrack }, [soundTrack])
  useEffect(() => {
    propsRef.current = { onSelect, onDoubleClick, onResize, onColumnChange, onUpdate, onDragStart, onDragEnd, onDragTargetChange, soundTrack, onMove, isCmdPressed }
  })

  // ── Couleurs ─────────────────────────────────────────────
  const sound = soundLibrary.find(s => s.id === soundTrack.soundId)
  const getColor = useCallback(() => {
    if (soundTrack.color) return soundTrack.color
    if (!sound) return '#ccc'
    const categories = sound.categories || []
    for (const cat of categories) {
      if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat]
    }
    return CATEGORY_COLORS['Autre']
  }, [sound, soundTrack.color])
  const baseColor   = getColor()
  const darkerColor = getDarkerColor(baseColor)
  const bgColor     = soundTrack.muted ? '#888' : `${baseColor}99`
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
    // Cmd+clic : créer un point d'automation sur le segment sous le curseur
    if (e.metaKey || e.ctrlKey) {
      e.stopPropagation()
      const rh = rowHeightsRef.current || []
      const blockEl = blockRef.current
      if (!blockEl) return
      const blockRect = blockEl.getBoundingClientRect()
      const cursorYInBlock = e.clientY - blockRect.top
      let accumulated = 0
      let targetSegIdx = startSegmentIndex
      for (let i = startSegmentIndex; i <= actualEndIndex; i++) {
        const h = (rh[i] || SEGMENT_HEIGHT) + 8 // +8 pour le séparateur, comme dans le calcul de blockHeight
        if (cursorYInBlock <= accumulated + h) {
          targetSegIdx = i
          break
        }
        accumulated += h
        targetSegIdx = i
      }
      handleAutomationCreate(e, targetSegIdx)
      return
    }
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

      const colChanged = lastTargetCol !== startCol
      const segChanged = lastTargetSegIdx !== startSegIdx

      if (!colChanged && !segChanged) {
        // Rien à faire
      } else if (colChanged && !segChanged) {
        // Seulement colonne
        p.onColumnChange(p.soundTrack.id, lastTargetCol)
      } else if (!colChanged && segChanged) {
        // Seulement segment
        const newStartId = getSegId(segsNow[lastTargetSegIdx], lastTargetSegIdx)
        const offset     = endSegIdxSafe - startSegIdx
        const newEndIdx  = Math.min(segsNow.length - 1, Math.max(0, lastTargetSegIdx + offset))
        const newEndId   = getSegId(segsNow[newEndIdx], newEndIdx)
        p.onResize(p.soundTrack.id, newStartId, newEndId)
      } else {
        // Diagonal : colonne + segment en un seul appel
        const newStartId = getSegId(segsNow[lastTargetSegIdx], lastTargetSegIdx)
        const offset     = endSegIdxSafe - startSegIdx
        const newEndIdx  = Math.min(segsNow.length - 1, Math.max(0, lastTargetSegIdx + offset))
        const newEndId   = getSegId(segsNow[newEndIdx], newEndIdx)
        p.onMove(p.soundTrack.id, newStartId, newEndId, lastTargetCol)
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

  // ── Helpers automation ───────────────────────────────────

  // Retourne le volume effectif à un segment donné (en tenant compte des points d'automation)
  const getEffectiveVolume = useCallback((segIdx) => {
    const points = soundTrack.automationPoints
    if (!points || points.length === 0) return soundTrack.volume ?? 0.5
    const segs = segmentsRef.current
    let last = soundTrack.volume ?? 0.5
    for (const pt of points) {
      const ptIdx = segs.findIndex(s => s.id === pt.segmentId || s._id === pt.segmentId)
      if (ptIdx !== -1 && ptIdx <= segIdx) last = pt.volume
    }
    return last
  }, [soundTrack])

  // Dessine la forme SVG d'un point selon l'index du fade (0→cercle, 1→triangle, 2→losange, 3→pentagone, 4→hexagone)
  const renderAutomationShape = (fadeStepIndex, x, y, size, color, isSelected) => {
    const stroke = isSelected ? '#fff' : color
    const fill = color
    const sw = isSelected ? 2 : 1.5
    if (fadeStepIndex === 0) {
      // Cercle plein — instantané
      return <circle cx={x} cy={y} r={size / 2} fill={fill} stroke={stroke} strokeWidth={sw} />
    }
    const sides = fadeStepIndex === 1 ? 3 : fadeStepIndex === 2 ? 4 : fadeStepIndex === 3 ? 5 : 6
    const rotation = fadeStepIndex === 2 ? 45 : -90 // losange à 45°, autres pointent vers le haut
    const points = Array.from({ length: sides }).map((_, i) => {
      const angle = ((i * 360) / sides + rotation) * (Math.PI / 180)
      return `${x + (size / 2) * Math.cos(angle)},${y + (size / 2) * Math.sin(angle)}`
    }).join(' ')
    return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={sw} />
  }

  // ── Automation : Cmd+clic pour créer un point ────────────
  const handleAutomationCreate = useCallback((segIdx) => {
    const track = soundTrackRef.current
    const segs = segmentsRef.current
    const seg = segs[segIdx]
    if (!seg) return
    const segId = seg.id || seg._id || `seg_${segIdx}`
    const existing = (track.automationPoints || []).find(pt => pt.segmentId === segId)
    if (existing) return
    // Volume effectif à ce segment
    const sortedPoints = [...(track.automationPoints || [])]
      .map(pt => ({ pt, idx: segs.findIndex(s => s.id === pt.segmentId || s._id === pt.segmentId) }))
      .filter(({ idx }) => idx !== -1)
      .sort((a, b) => a.idx - b.idx)
    let effectiveVol = track.volume ?? 0.5
    for (const { pt, idx } of sortedPoints) {
      if (idx <= segIdx) effectiveVol = pt.volume
      else break
    }
    const newPoints = [
      ...(track.automationPoints || []),
      { segmentId: segId, volume: effectiveVol, fadeMs: 300 }
    ]
    propsRef.current.onUpdate(track.id, { automationPoints: newPoints })
  }, [])

  // ── Automation : drag gauche/droite pour changer le volume ──
  const handleAutomationDrag = useCallback((e, ptIndex) => {
    if (e.shiftKey) return // Maj+clic géré séparément
    e.stopPropagation()
    e.preventDefault()
    const p = propsRef.current
    const startX = e.clientX
    const initVolume = (soundTrackRef.current.automationPoints || [])[ptIndex]?.volume ?? 0.5
    let lastVolume = initVolume
    const onMove = (ev) => {
      const dx = ev.clientX - startX
      // 100px = 100% volume
      const newVol = Math.max(0, Math.min(1, initVolume + dx / 100))
      lastVolume = Math.round(newVol * 100) / 100
      setAutomationTooltip({ pointIndex: ptIndex, volume: Math.round(lastVolume * 100) })
      const newPoints = (p.soundTrack.automationPoints || []).map((pt, i) =>
        i === ptIndex ? { ...pt, volume: lastVolume } : pt
      )
      p.onUpdate(p.soundTrack.id, { automationPoints: newPoints })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setAutomationTooltip(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // ── Automation : Maj+clic pour cycler le fade ────────────
  const handleAutomationShiftClick = useCallback((e, ptIndex) => {
    if (!e.shiftKey) return
    e.stopPropagation()
    e.preventDefault()
    const track = soundTrackRef.current
    const points = track.automationPoints || []
    const pt = points[ptIndex]
    if (!pt) return
    const currentStepIdx = AUTOMATION_FADE_STEPS.findIndex(s => s.ms === pt.fadeMs)
    const nextStepIdx = (currentStepIdx + 1) % AUTOMATION_FADE_STEPS.length
    const newPoints = points.map((p, i) =>
      i === ptIndex ? { ...p, fadeMs: AUTOMATION_FADE_STEPS[nextStepIdx].ms } : p
    )
    propsRef.current.onUpdate(track.id, { automationPoints: newPoints })
  }, [])

  // ── Automation : double-clic pour supprimer ──────────────
  const handleAutomationDelete = useCallback((e, ptIndex) => {
    e.stopPropagation()
    e.preventDefault()
    const track = soundTrackRef.current
    const newPoints = (track.automationPoints || []).filter((_, i) => i !== ptIndex)
    propsRef.current.onUpdate(track.id, { automationPoints: newPoints })
  }, [])

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
        cursor: isDragging ? 'grabbing' : isCmdPressed ? 'crosshair' : 'grab',
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
        width: '100%', position: 'relative', zIndex: 1,
        pointerEvents: 'none',
      }}>
        {sound ? sound.label.substring(0, 15) : soundTrack.soundId}
      </div>
      

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

      {/* ── Ligne d'automation + points ── */}
      {(() => {
        const points = soundTrack.automationPoints
        if (!points || points.length === 0) {
          // Pas de points : juste la ligne centrale fine
          return (
            <div style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: `${baseColor}40`,
              pointerEvents: 'none',
              transform: 'translateX(-50%)',
            }} />
          )
        }
        // Avec points : SVG qui couvre tout le bloc
        const segs = segmentsRef.current
        const rh = rowHeightsRef.current || []
        const svgW = width
        const svgH = blockHeight
        const centerX = svgW / 2
        // Calculer la position Y du centre de chaque segment couvert
        const segCenterYs = {}
        let accumulated = 0
        for (let i = startSegmentIndex; i <= actualEndIndex; i++) {
          const h = rh[i] || SEGMENT_HEIGHT
          segCenterYs[i] = accumulated + h / 2
          accumulated += h + 8
        }
        return (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              overflow: 'visible',
              zIndex: 4,
            }}
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
          >
            {/* Ligne centrale */}
            <line
              x1={centerX} y1={0}
              x2={centerX} y2={svgH}
              stroke={`${baseColor}50`}
              strokeWidth={1}
            />
            {/* Points d'automation */}
            {points.map((pt, ptIdx) => {
              const ptSegIdx = segs.findIndex(s => s.id === pt.segmentId || s._id === pt.segmentId)
              if (ptSegIdx < startSegmentIndex || ptSegIdx > actualEndIndex) return null
              const centerY = segCenterYs[ptSegIdx] ?? 0
              // Position X selon le volume : 0% = leftEdge+4, 100% = rightEdge-4
              const margin = 4
              const x = margin + (pt.volume) * (svgW - margin * 2)
              const fadeStepIdx = AUTOMATION_FADE_STEPS.findIndex(s => s.ms === pt.fadeMs)
              const stepIdx = fadeStepIdx === -1 ? 2 : fadeStepIdx
              const isTooltipVisible = automationTooltip?.pointIndex === ptIdx
              const SHAPE_SIZE = 10
              return (
                <g
                  key={ptIdx}
                  style={{ pointerEvents: 'all', cursor: 'ew-resize' }}
                  onMouseDown={(e) => {
                    if (e.shiftKey) handleAutomationShiftClick(e, ptIdx)
                    else handleAutomationDrag(e, ptIdx)
                  }}
                  onDoubleClick={(e) => handleAutomationDelete(e, ptIdx)}
                >
                  {/* Zone de clic plus large */}
                  <rect
                    x={x - 10} y={centerY - 10}
                    width={20} height={20}
                    fill="transparent"
                  />
                  {/* Trait horizontal du point jusqu'à la ligne centrale */}
                  <line
                    x1={x} y1={centerY}
                    x2={centerX} y2={centerY}
                    stroke={`${baseColor}60`}
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                  {/* Forme selon fade */}
                  {renderAutomationShape(stepIdx, x, centerY, SHAPE_SIZE, baseColor, isTooltipVisible)}
                  {/* Tooltip volume */}
                  {isTooltipVisible && (
                    <g>
                      <rect
                        x={x - 14} y={centerY - 22}
                        width={28} height={14}
                        rx={3} fill="rgba(0,0,0,0.75)"
                      />
                      <text
                        x={x} y={centerY - 12}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={9}
                        fontFamily="system-ui"
                      >
                        {Math.round(pt.volume * 100)}%
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        )
      })()}
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

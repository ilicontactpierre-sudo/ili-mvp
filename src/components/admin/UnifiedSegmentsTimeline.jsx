import { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect, memo } from 'react'
import SoundBlock from './SoundBlock'
import SoundBlockPanel from './SoundBlockPanel'
import SoundLibraryPicker from './SoundLibraryPicker'
import { SEGMENT_HEIGHT, COLUMN_COUNT, COLUMN_WIDTH, VFX_COLUMN_COUNT, VFX_COLUMN_WIDTH, VFX_TYPES, VFX_COLORS, createVfxTrack } from './constants'
import VfxBlock from './VfxBlock'
import VfxBlockPanel from './VfxBlockPanel'
import FormatToolbar from './FormatToolbar'
import GameModePanel from './GameModePanel'
import { renderMarkdown } from '../../utils/renderMarkdown'
import InlineFunctionMenu from './InlineFunctionMenu'
import { INLINE_FUNCTIONS, getCaretCoordinates } from '../../utils/inlineFunctions'

const getSegmentText = (segment) => {
  if (typeof segment === 'string') {
    return segment
  }

  if (segment && typeof segment === 'object') {
    if (typeof segment.text === 'string') {
      return segment.text
    }

    const numericKeys = Object.keys(segment).filter(key => String(Number(key)) === key)
    if (numericKeys.length > 0) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map(key => segment[key])
        .join('')
    }
  }

  return ''
}
// ── Panneau de configuration de transition visuelle ───────────────────────────
const EASING_OPTIONS = [
  { value: 'ease-in-out', label: 'Symétrique',  hint: 'doux des deux côtés' },
  { value: 's-curve',     label: 'S-curve',      hint: 'filmique, pro' },
  { value: 'ease-in',     label: 'Entrée lente', hint: 'tension → relâchement' },
  { value: 'ease-out',    label: 'Sortie lente', hint: 'apparition soudaine' },
]
const TRANSITION_TYPES = [
  { value: 'fade', label: 'Fondu', hint: 'couleur plein écran' },
  { value: 'veil', label: 'Voile', hint: 'semi-transparent (55%)' },
  { value: 'blur', label: 'Flou',  hint: 'blur du texte seul' },
]
function TransitionConfigPanel({ transition, onChange, onClose }) {
  const tr = transition ?? {
    type: 'fade',
    color: '#000000',
    easing: 'ease-in-out',
    fadeInDuration: 400,
    holdDuration: 0,
    fadeOutDuration: 400,
  }
  const update = (patch) => onChange({ ...tr, ...patch })
  const label = { fontSize: '0.62rem', color: '#6b7280', marginBottom: '2px', display: 'block' }
  const input = {
    fontSize: '0.72rem',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '2px 5px',
    outline: 'none',
    fontFamily: 'system-ui, sans-serif',
    background: '#fff',
    color: '#374151',
  }
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 50,
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minWidth: '320px',
        maxWidth: '420px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', letterSpacing: '0.04em' }}>
          ✦ TRANSITION VISUELLE
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {transition && (
            <button
              onClick={() => { onChange(null); onClose() }}
              style={{ ...input, color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer', padding: '2px 7px' }}
            >
              Supprimer
            </button>
          )}
          <button onClick={onClose} style={{ ...input, cursor: 'pointer', padding: '2px 7px' }}>
            Fermer
          </button>
        </div>
      </div>

      {/* Type */}
      <div>
        <span style={label}>Type</span>
        <div style={{ display: 'flex', gap: '5px' }}>
          {TRANSITION_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => update({ type: t.value })}
              title={t.hint}
              style={{
                ...input,
                cursor: 'pointer',
                padding: '3px 8px',
                backgroundColor: tr.type === t.value ? '#ede9fe' : '#f9fafb',
                borderColor: tr.type === t.value ? '#a78bfa' : '#e5e7eb',
                color: tr.type === t.value ? '#7c3aed' : '#6b7280',
                fontWeight: tr.type === t.value ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Couleur (seulement pour fade et veil) */}
      {(tr.type === 'fade' || tr.type === 'veil') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ ...label, margin: 0 }}>Couleur</span>
          <input
            type="color"
            value={tr.color ?? '#000000'}
            onChange={e => update({ color: e.target.value })}
            style={{ width: '32px', height: '22px', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', padding: '1px' }}
          />
          <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{tr.color ?? '#000000'}</span>
          {/* Présets */}
          {['#000000', '#ffffff', '#1a0a2e', '#0a1628'].map(c => (
            <div
              key={c}
              onClick={() => update({ color: c })}
              title={c}
              style={{
                width: '16px', height: '16px',
                backgroundColor: c,
                borderRadius: '3px',
                border: tr.color === c ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Durées */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {[
          { key: 'fadeInDuration',  label: 'Fondu entrant' },
          { key: 'holdDuration',    label: 'Tenue' },
          { key: 'fadeOutDuration', label: 'Fondu sortant' },
        ].map(({ key, label: l }) => (
          <div key={key}>
            <span style={label}>{l}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <input
                type="number"
                min="0"
                max="5000"
                step="50"
                value={tr[key] ?? 400}
                onChange={e => update({ [key]: Number(e.target.value) })}
                style={{ ...input, width: '56px' }}
              />
              <span style={{ fontSize: '0.6rem', color: '#9ca3af' }}>ms</span>
            </div>
          </div>
        ))}
      </div>

      {/* Courbe */}
      <div>
        <span style={label}>Courbe</span>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {EASING_OPTIONS.map(e => (
            <button
              key={e.value}
              onClick={() => update({ easing: e.value })}
              title={e.hint}
              style={{
                ...input,
                cursor: 'pointer',
                padding: '3px 7px',
                backgroundColor: tr.easing === e.value ? '#ede9fe' : '#f9fafb',
                borderColor: tr.easing === e.value ? '#a78bfa' : '#e5e7eb',
                color: tr.easing === e.value ? '#7c3aed' : '#6b7280',
                fontWeight: tr.easing === e.value ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Résumé visuel */}
      <div style={{
        fontSize: '0.62rem',
        color: '#9ca3af',
        padding: '6px 8px',
        backgroundColor: '#f9fafb',
        borderRadius: '5px',
        fontFamily: 'monospace',
      }}>
        {tr.type} · {tr.fadeInDuration ?? 400}ms in · {tr.holdDuration ?? 0}ms hold · {tr.fadeOutDuration ?? 400}ms out · {tr.easing ?? 'ease-in-out'}
      </div>
    </div>
  )
}
// Composant pour une ligne unifiée Segment + Timeline
const SegmentTimelineRow = memo(function SegmentTimelineRow({ 
  segment, 
  index, 
  isSelected,
  onSelect, 
  onEdit, 
  onSplitAtPosition,
  onAdd, 
  onDelete,
  onTextSelection,
  isCmdPressed,
  isEditing,
  editText,
  onEditChange,
  onEditBlur,
  onEditKeyDown,
  hovered,
  onHover,
  isChapter,
  isCollapsed,
  onToggleChapter,
  onToggleIsChapter,
  isLeader,
  isFinisher,
  onToggleIsLeader,
  soundTracks,
  segments,
  soundLibrary,
  selectedSoundIds,
  editingSoundTrack,
  onSoundSelect,
  onSoundDoubleClick,
  onSoundColumnChange,
  onSoundResize,
  onSoundMove,
  onSoundUpdate,
  onShowSoundTooltip,
  onHideSoundTooltip,
  onAddSoundToCell,
  rowHeight,
  rowHeights,
  dividerPosition,
  isDraggingDivider,
  onDividerMouseDown,
  rowRef,
  isAnyBlockDragging,
  dragTargetCell,
  onDragStart,
  onDragEnd,
  onDragTargetChange,
  vfxTracks,
  selectedVfxIds,
  editingVfxTrack,
  onVfxSelect,
  onVfxDoubleClick,
  onVfxColumnChange,
  onVfxResize,
  onAddVfxToCell,
  isAnyVfxDragging,
  vfxDragTarget,
  onVfxDragStart,
  onVfxDragEnd,
  onVfxUpdate,
  onVfxDragTargetChange,
  onDragHandleMouseDown,
  isDragging,
  onGameMode,
  onPreviewFromSegment,
  seuilKeys = [],
  isPause = false,
  pauseDuration = null,
  onPauseDurationChange,
}) {
  const containerRef = useRef(null)
  const textareaRef = useRef(null)
  const text = getSegmentText(segment)

  // ── Config transition (état local, segment pause uniquement) ──────────────
  const [showTransitionConfig, setShowTransitionConfig] = useState(false)

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
  // ── Menu autocomplete des fonctions inline (</...) ──────────────────────
  const [fnMenu, setFnMenu] = useState(null)
  const pendingSelectionRef = useRef(null)
  useEffect(() => {
    if (pendingSelectionRef.current && textareaRef.current) {
      const { start, end } = pendingSelectionRef.current
      textareaRef.current.setSelectionRange(start, end)
      textareaRef.current.focus()
      pendingSelectionRef.current = null
    }
  }, [editText])
  const closeFnMenu = useCallback(() => setFnMenu(null), [])
  const checkFnTrigger = useCallback((textarea) => {
    if (textarea.selectionStart !== textarea.selectionEnd) { closeFnMenu(); return }
    const cursor = textarea.selectionStart
    const before = textarea.value.slice(0, cursor)
    const match = before.match(/<\/([a-z_]*)$/)
    if (!match) { closeFnMenu(); return }
    const query = match[1]
    const matches = Object.entries(INLINE_FUNCTIONS).filter(([key]) => key.includes(query))
    const coords = getCaretCoordinates(textarea, cursor)
    setFnMenu({ query, matches, selectedIndex: 0, position: coords, cursor })
  }, [closeFnMenu])
  const insertInlineFunction = useCallback((fnKey, ...args) => {
    if (!fnMenu || !textareaRef.current) return
    const def = INLINE_FUNCTIONS[fnKey]
    const textarea = textareaRef.current
    const cursor = fnMenu.cursor
    const matchStart = cursor - 2 - fnMenu.query.length // position du "</"
    // Construire le template :
    // - args fournis par le sous-menu → on les injecte directement dans le tag
    // - sinon → template par défaut de la définition
    let template
    if (args.length > 0) {
      const argsStr = args.join(';')
      if (def.wrap) {
        template = `</${fnKey}:${argsStr}|/>`
      } else {
        template = `</${fnKey}:${argsStr}/>`
      }
    } else {
      template = def.template()
    }
    const currentText = textarea.value
    const newText = currentText.slice(0, matchStart) + template + currentText.slice(cursor)
    // Positionner le curseur :
    // - Fonction wrap (cursorAfterPipe) → entre | et />
    // - Fonction autonome avec params   → sur le 1er param (sélectionné)
    // - Fonction autonome sans params   → après le tag
    let selStart, selEnd
    const insertBase = matchStart
    if (def.cursorAfterPipe) {
      // Trouver la position du | dans le template
      const pipePos = template.indexOf('|')
      selStart = insertBase + pipePos + 1
      selEnd   = selStart
    } else if (def.params.length > 0) {
      // Sélectionner le 1er param (après ":/fnKey:")
      const colonPos = template.indexOf(':')
      const semicolonPos = template.indexOf(';')
      const endPos = semicolonPos !== -1 ? semicolonPos : template.indexOf('/')
      selStart = insertBase + colonPos + 1
      selEnd   = insertBase + (endPos !== -1 ? endPos : template.length)
    } else {
      selStart = insertBase + template.length
      selEnd   = selStart
    }
    pendingSelectionRef.current = { start: selStart, end: selEnd }
    setFnMenu(null)
    onEditChange(index, newText)
  }, [fnMenu, index, onEditChange])
  const handleTextareaChange = useCallback((e) => {
    onEditChange(index, e.target.value)
    checkFnTrigger(e.target)
  }, [index, onEditChange, checkFnTrigger])
  const handleTextareaKeyDown = useCallback((e) => {
    if (fnMenu) {
      const count = Math.max(fnMenu.matches.length, 1)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFnMenu(prev => prev && ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % count }))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFnMenu(prev => prev && ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + count) % count }))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (fnMenu.matches.length > 0) {
          e.preventDefault()
          insertInlineFunction(fnMenu.matches[fnMenu.selectedIndex][0])
          return
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeFnMenu()
        return
      }
    }
    onEditKeyDown(index, e)
  }, [fnMenu, index, onEditKeyDown, insertInlineFunction, closeFnMenu])
  const handleTextareaKeyUp = useCallback((e) => {
    if (fnMenu && !['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      checkFnTrigger(e.target)
    }
  }, [fnMenu, checkFnTrigger])
  const handleTextareaBlur = useCallback(() => {
    closeFnMenu()
    onEditBlur(index)
  }, [closeFnMenu, onEditBlur, index])

  // État pour suivre la hauteur du contenu texte en mode normal
  const [normalModeHeight, setNormalModeHeight] = useState(null)
  const textContentRef = useRef(null)

  // Ajuster la hauteur du textarea automatiquement en mode édition
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isEditing, editText])

  // Mesurer la hauteur du texte en mode normal
  useEffect(() => {
    if (!isEditing && textContentRef.current) {
      const height = textContentRef.current.scrollHeight
      if (height !== normalModeHeight) {
        setNormalModeHeight(height)
      }
    }
  }, [isEditing, text, dividerPosition])

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
    
    onSelect(index, e)
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    onEdit(index)
  }

  // Trouver les sons qui commencent à ce segment
  const getSegmentIndexFromId = useCallback((segmentId) => {
    // D'abord, chercher par id ou _id
    const idx = segments.findIndex(s => s.id === segmentId || s._id === segmentId)
    if (idx !== -1) return idx
    
    // Fallback: si segmentId est au format "segment_N", utiliser N comme index
    const match = segmentId?.match(/^seg(?:ment)?_(\d+)$/)
    if (match) {
      const index = parseInt(match[1], 10)
      if (index >= 0 && index < segments.length) return index
    }
    
    return -1
  }, [segments])

  const rowSoundTracks = soundTracks.filter(track => {
    const startIdx = getSegmentIndexFromId(track.startSegmentId)
    return startIdx === index
  })

  // ── Rendu compact pause : partie texte remplacée, timeline intacte ────────
  if (isPause) {
    return (
      <div
        ref={rowRef}
        style={{
          display: 'flex',
          borderBottom: '1px solid #e8e8e8',
          minHeight: '36px',
          backgroundColor: isSelected ? '#f0f0f3' : '#f7f7f9',
          borderLeft: '3px solid #c4b5fd',
          position: 'relative',
          transition: 'background-color 0.15s ease',
        }}
        onClick={(e) => onSelect(index, e)}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Partie gauche compacte (pause config) */}
        <div style={{
          flex: `0 0 ${dividerPosition}%`,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '0 8px',
          boxSizing: 'border-box',
          minWidth: 0,
        }}>
          {/* Numéro */}
          <span style={{ fontSize: '0.62rem', color: '#a78bfa', fontWeight: 700, flexShrink: 0, minWidth: '18px', textAlign: 'center' }}>
            {index + 1}
          </span>

          {/* Icône */}
          <span style={{ fontSize: '0.7rem', flexShrink: 0 }}>⏱</span>

          {/* Durée */}
          <input
            type="number"
            min="100"
            max="30000"
            step="100"
            value={pauseDuration ?? 1500}
            onClick={e => e.stopPropagation()}
            onChange={e => onPauseDurationChange(index, Number(e.target.value))}
            style={{
              width: '54px',
              fontSize: '0.7rem',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '1px 4px',
              background: 'transparent',
              outline: 'none',
              fontFamily: 'system-ui, sans-serif',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '0.62rem', color: '#9ca3af', flexShrink: 0 }}>ms</span>

          {/* Bouton transition */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowTransitionConfig(v => !v) }}
            title="Configurer la transition visuelle"
            style={{
              background: segment?.transition ? 'rgba(167,139,250,0.15)' : 'none',
              border: segment?.transition ? '1px solid rgba(167,139,250,0.4)' : '1px solid #e5e7eb',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.6rem',
              color: segment?.transition ? '#7c3aed' : '#9ca3af',
              padding: '1px 5px',
              lineHeight: '16px',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {segment?.transition ? '✦ fondu' : '+ fondu'}
          </button>

          {/* Supprimer */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(index) }}
            title="Supprimer la pause"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.6rem',
              color: '#d1d5db',
              padding: '0 2px',
              flexShrink: 0,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#f44336'}
            onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
          >
            ✕
          </button>
        </div>

        {/* Séparateur */}
        <div style={{ width: '6px', flexShrink: 0, backgroundColor: 'transparent' }} />

        {/* Zone timeline audio — identique aux segments normaux */}
        <div
          data-timeline-container="true"
          style={{
            flex: '1 1 auto',
            display: 'flex',
            position: 'relative',
            overflow: 'visible',
            minWidth: `${COLUMN_COUNT * COLUMN_WIDTH}px`,
          }}
        >
          {Array.from({ length: COLUMN_COUNT }).map((_, colIndex) => {
            const hasSound = soundTracks.some(track => {
              const startIdx = getSegmentIndexFromId(track.startSegmentId)
              const endIdx = getSegmentIndexFromId(track.endSegmentId)
              const trackEnd = endIdx !== -1 ? endIdx : startIdx
              return track.column === colIndex && startIdx <= index && trackEnd >= index
            })
            const isDragTarget = isAnyBlockDragging &&
              dragTargetCell.segmentIndex === index &&
              dragTargetCell.column === colIndex
            return (
              <div
                key={colIndex}
                style={{
                  width: `${COLUMN_WIDTH}px`,
                  flexShrink: 0,
                  height: '100%',
                  minHeight: '36px',
                  borderRight: colIndex < COLUMN_COUNT - 1 ? '1px solid #f0f0f0' : 'none',
                  backgroundColor: isDragTarget
                    ? 'rgba(33, 150, 243, 0.2)'
                    : hasSound ? 'transparent' : 'rgba(167,139,250,0.04)',
                  cursor: hasSound ? 'default' : 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.1s ease',
                }}
                onDoubleClick={() => !hasSound && onAddSoundToCell(index, colIndex)}
                title={!hasSound ? 'Double-cliquez pour ajouter un son' : ''}
              >
                {isDragTarget && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    border: '2px dashed #2196F3',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                  }} />
                )}
              </div>
            )
          })}
          {rowSoundTracks.map(track => (
            <SoundBlock
              key={track.id}
              soundTrack={track}
              segments={segments}
              soundLibrary={soundLibrary}
              rowHeights={rowHeights}
              isSelected={selectedSoundIds.has(track.id) || track.id === editingSoundTrack?.id}
              onSelect={onSoundSelect}
              onDoubleClick={onSoundDoubleClick}
              onColumnChange={onSoundColumnChange}
              onResize={onSoundResize}
              onMove={onSoundMove}
              onUpdate={onSoundUpdate}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragTargetChange={onDragTargetChange}
              currentSegmentIndex={index}
              isCmdPressed={isCmdPressed}
              onShowTooltip={onShowSoundTooltip}
              onHideTooltip={onHideSoundTooltip}
            />
          ))}
        </div>
        {/* Zone VFX */}
        <div style={{
          flex: '0 0 auto',
          width: `${VFX_COLUMN_COUNT * VFX_COLUMN_WIDTH}px`,
          display: 'flex',
          position: 'relative',
          overflow: 'visible',
          borderLeft: '2px solid #e0e0e0',
          alignSelf: 'stretch',
        }}>
          {Array.from({ length: VFX_COLUMN_COUNT }).map((_, colIndex) => (
            <div
              key={colIndex}
              style={{
                width: `${VFX_COLUMN_WIDTH}px`,
                flexShrink: 0,
                height: '100%',
                minHeight: '36px',
                borderRight: colIndex < VFX_COLUMN_COUNT - 1 ? '1px solid #f0f0f0' : 'none',
                backgroundColor: 'rgba(120,80,220,0.03)',
              }}
            />
          ))}
        </div>
        {/* Panneau config transition (inline, sous la ligne) */}
        {showTransitionConfig && (
          <TransitionConfigPanel
            transition={segment?.transition ?? null}
            onChange={(tr) => onPauseDurationChange(index, pauseDuration, tr)}
            onClose={() => setShowTransitionConfig(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div
      ref={rowRef}
      style={{
        display: 'flex',
        borderBottom: isFinisher ? '2px solid rgba(249, 115, 22, 0.45)' : '1px solid #f0f0f0',
        height: 'auto',
        minHeight: `${SEGMENT_HEIGHT}px`,
        backgroundColor: isChapter
          ? (isSelected ? '#ede9fe' : '#f5f3ff')
          : isLeader
            ? (isSelected ? '#ffedd5' : '#fff7ed')
            : (isSelected ? '#f0f7ff' : (index % 2 === 0 ? '#fff' : '#fafafa')),
        borderLeft: isChapter
          ? '3px solid #8B5CF6'
          : isLeader
            ? '3px solid #F97316'
            : '3px solid transparent',
        transition: 'background-color 0.15s ease, border-left-color 0.2s ease',
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
          padding: '0.4rem 0.4rem 0.4rem 0.5rem',
          display: 'flex',
          gap: '3px',
          alignItems: 'flex-start',
          boxSizing: 'border-box',
          cursor: isCmdPressed && !isEditing ? 'crosshair' : 'default',
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Handle drag ⠿ */}
        <div
          onMouseDown={onDragHandleMouseDown}
          title="Déplacer ce segment"
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            padding: '0 1px',
            fontSize: '0.7rem',
            color: 'rgba(0,0,0,0.2)',
            flexShrink: 0,
            alignSelf: 'flex-start',
            marginTop: '3px',
            lineHeight: 1,
            userSelect: 'none',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.2)'}
        >
          ⠿
        </div>
      {/* Étoile + Losange : empilés verticalement pour gagner de la largeur */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        flexShrink: 0,
        alignSelf: 'flex-start',
        marginTop: '3px',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleIsChapter(index) }}
          title={isChapter ? 'Retirer le statut chapitre' : 'Marquer comme chapitre'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, fontSize: '0.6rem', lineHeight: 1,
            color: isChapter ? '#8B5CF6' : 'rgba(0,0,0,0.18)',
            width: '12px', height: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.2s ease',
          }}
        >
          {isChapter ? '★' : '☆'}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleIsLeader(index) }}
          title={isLeader ? 'Retirer le statut leader' : 'Marquer comme leader (nouvelle séquence)'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, fontSize: '0.55rem', lineHeight: 1,
            color: isLeader ? '#F97316' : 'rgba(0,0,0,0.18)',
            width: '12px', height: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.2s ease',
          }}
        >
          {isLeader ? '◆' : '◇'}
        </button>
      </div>
      {/* Boutons d'action — grid 2×3 compact */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '13px 13px',
        gridTemplateRows: 'repeat(3, 13px)',
        gap: '1px',
        flexShrink: 0,
        alignSelf: 'flex-start',
        marginTop: '2px',
      }}>
        {/* Ligne 1 : Aperçu | Ajouter */}
        <button
          onClick={(e) => { e.stopPropagation(); onPreviewFromSegment?.(index); }}
          title="Aperçu depuis ce segment"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '0.58rem', lineHeight: 1,
            color: (hovered || isSelected) ? '#6366f1' : 'rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '14px', height: '14px',
            opacity: (hovered || isSelected) ? 1 : 0.6,
            transition: 'color 0.2s ease, opacity 0.2s ease',
          }}
        >▶</button>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(index); }}
          title="Ajouter un segment après"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '0.65rem', lineHeight: 1,
            color: (hovered || isSelected) ? '#4CAF50' : 'rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '14px', height: '14px',
            transition: 'color 0.2s ease',
          }}
        >＋</button>
        {/* Ligne 2 : Supprimer | Gamification */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          title="Supprimer le segment"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '0.58rem', lineHeight: 1,
            color: (hovered || isSelected) ? '#f44336' : 'rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '14px', height: '14px',
            transition: 'color 0.2s ease',
          }}
        >✕</button>
        <button
          onClick={(e) => { e.stopPropagation(); onGameMode(index); }}
          title={segment?.gameMode ? 'Modifier la gamification' : 'Ajouter une gamification'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '0.58rem', lineHeight: 1,
            color: segment?.gameMode ? '#a78bfa' : (hovered || isSelected) ? 'rgba(167,139,250,0.5)' : 'rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '14px', height: '14px',
            transition: 'color 0.2s ease',
          }}
        >🎮</button>
        {/* Ligne 3 : badge gameMode type (occupe les 2 colonnes si présent) */}
        {segment?.gameMode?.type ? (() => {
          const GAME_LABELS = {
            image: '🖼', filmstrip: '🎞', document: '📄', message: '💬',
            code: '🔢', riddle: '🧩', timer: '⏱', sequence: '🔀',
            journal: '✍️', crypte: '🔐', choice_quiz: '🎯', choice_branch: '🌿',
          }
          return (
            <span
              onClick={(e) => { e.stopPropagation(); onGameMode(index); }}
              title={`Gamification : ${segment.gameMode.type}`}
              style={{
                gridColumn: '1 / -1',
                fontSize: '0.55rem',
                color: '#a78bfa',
                backgroundColor: 'rgba(167,139,250,0.1)',
                border: '1px solid rgba(167,139,250,0.25)',
                borderRadius: '3px',
                padding: '0 2px',
                lineHeight: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                textAlign: 'center',
                overflow: 'hidden',
              }}
            >
              {GAME_LABELS[segment.gameMode.type] || '🎮'}
            </span>
          )
        })() : <span style={{ gridColumn: '1 / -1' }} />}
      </div>
          
        {/* Numéro du segment — cliquable si chapitre pour collapse/expand */}
        <span
          onClick={isChapter ? (e) => { e.stopPropagation(); e.preventDefault(); onToggleChapter(index, e.shiftKey) } : undefined}
          title={isChapter ? (isCollapsed ? 'Déplier les segments' : 'Replier les segments') : ''}
          style={{
            color: isChapter ? '#8B5CF6' : '#999',
            fontSize: '0.7rem',
            minWidth: '24px',
            textAlign: 'center',
            paddingTop: '3px',
            fontWeight: 'bold',
            cursor: isChapter ? 'pointer' : 'default',
            userSelect: 'none',
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '1px',
            flexShrink: 0,
          }}
        >
          {isChapter && (
            <span style={{
              fontSize: '0.55rem',
              display: 'inline-block',
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease',
              marginRight: '1px',
            }}>▼</span>
          )}
          {index + 1}
        </span>

        {/* Indicateur Finisher (auto-calculé, lecture seule) */}
        {isFinisher && (
          <span
            title="Finisher (auto) — le segment suivant est un Leader"
            style={{
              fontSize: '0.5rem',
              color: '#F97316',
              opacity: 0.7,
              flexShrink: 0,
              alignSelf: 'flex-start',
              marginTop: '4px',
              lineHeight: 1,
              cursor: 'default',
            }}
          >
            ⏹
          </span>
        )}

        {/* Texte éditable */}
        <div 
          data-text-content="true"
          style={{ 
            flex: 1, 
            lineHeight: '1.4',
            color: '#333',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            position: 'relative',
            cursor: isCmdPressed && !isEditing ? 'crosshair' : 'text',
            overflow: 'visible',
            display: 'block'
          }}
          onMouseMove={handleSplitPreviewMouseMove}
          onMouseLeave={handleSplitPreviewMouseLeave}
        >
          {isEditing ? (
            <>
            <textarea
                ref={textareaRef}
                value={editText}
                onChange={handleTextareaChange}
                onBlur={handleTextareaBlur}
                onKeyDown={handleTextareaKeyDown}
                onKeyUp={handleTextareaKeyUp}
                onClick={(e) => { if (fnMenu) checkFnTrigger(e.target) }}
                onMouseUp={onTextSelection}
                autoFocus
                style={{
                  width: '100%',
                  minHeight: '100%',
                  padding: '0',
                  margin: '0',
                  fontSize: '0.85rem',
                  border: 'none',
                  borderRadius: '0',
                  resize: 'none',
                  fontFamily: segment.fontFamily || 'inherit',
                  lineHeight: '1.4',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'transparent',
                  color: 'inherit',
                  overflow: 'hidden',
                  display: 'block'
                }}
              />
            {fnMenu && (
              <InlineFunctionMenu
                query={fnMenu.query}
                matches={fnMenu.matches}
                selectedIndex={fnMenu.selectedIndex}
                position={fnMenu.position}
                onSelect={insertInlineFunction}
                onHover={(i) => setFnMenu(prev => prev && ({ ...prev, selectedIndex: i }))}
                seuilKeys={seuilKeys}
              />
            )}
            </>
          ) : (
                <span ref={textContentRef} style={{ display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', lineHeight: '1.4', fontSize: '0.85rem', height: 'auto', fontFamily: segment?.fontFamily || 'inherit' }}>
                {!text && segment?.gameMode?.type && (() => {
                  const GAME_LABELS = {
                    image: '🖼  Image / Cinématique',
                    filmstrip: '🎞  Pellicule',
                    document: '📄  Document / Artefact',
                    message: '💬  Message animé',
                    code: '🔢  Digicode',
                    riddle: '🧩  Énigme texte libre',
                    timer: '⏱  Minuteur',
                    sequence: '🔀  Séquence à reconstituer',
                    journal: '✍️  Journal / Écriture libre',
                    crypte: '🔐  Crypte / Déchiffrement',
                    choice_quiz: '🎯  QCM',
                    choice_branch: '🌿  Choix narratif',
                  }
                  return (
                    <span style={{
                      color: 'rgba(167,139,250,0.7)',
                      fontStyle: 'italic',
                      fontSize: '0.8rem',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}>
                      {GAME_LABELS[segment.gameMode.type] || '🎮 Gamification'}
                    </span>
                  )
                })()}
                {splitPreviewPosition !== null && isCmdPressed ? (
                <>
                  {text.substring(0, splitPreviewPosition)}
                  <span style={{
                    position: 'relative',
                    display: 'inline',
                    width: 0,
                    overflow: 'visible',
                    pointerEvents: 'none',
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: '-1px',
                      top: '0.05em',
                      width: '2px',
                      height: '1.1em',
                      backgroundColor: '#ef4444',
                      animation: 'blink 0.8s ease-in-out infinite',
                      pointerEvents: 'none',
                    }} />
                  </span>
                  {text.substring(splitPreviewPosition)}
                </>
              ) : segment && typeof segment === 'object' && segment.breakAt !== null && segment.breakAt > 0 && segment.breakAt < segment.text?.length ? (
                <>
                  {renderMarkdown(segment.text.slice(0, segment.breakAt).trim(), segment)}
                  {'\n\n'}
                  {renderMarkdown(segment.text.slice(segment.breakAt).trim(), segment)}
                </>
              ) : (
                renderMarkdown(text, segment)
              )}
              {(() => {
                if (!text) return null
                // Détecter toutes les fonctions inline </xxx:...
                const fnMatches = [...text.matchAll(/<\/([a-z_]+):[^>]*>/g)]
                if (!fnMatches.length) return null
                // Dédoublonner par nom de fonction
                const seen = new Set()
                const badges = []
                for (const m of fnMatches) {
                  const fnName = m[1]
                  if (seen.has(fnName)) continue
                  seen.add(fnName)
                  // Couleur par type de fonction
                  const FN_COLORS = {
                    couleur:      { bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.5)',  text: '#b45309' },
                    apparition:   { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.4)',  text: '#4338ca' },
                    lire:         { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.4)',  text: '#065f46' },
                    chiffres_up:  { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.35)',  text: '#991b1b' },
                    chiffres_down:{ bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.35)',  text: '#991b1b' },
                    journal:      { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.4)',  text: '#5b21b6' },
                  }
                  const style = FN_COLORS[fnName] ?? { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.3)', text: '#374151' }
                  badges.push(
                    <span
                      key={fnName}
                      title={`Fonction inline : </${fnName}:…>`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '0.58rem',
                        fontFamily: 'monospace',
                        backgroundColor: style.bg,
                        border: `1px solid ${style.border}`,
                        color: style.text,
                        borderRadius: '3px',
                        padding: '0px 4px',
                        lineHeight: '14px',
                        userSelect: 'none',
                        pointerEvents: 'none',
                        fontStyle: 'normal',
                        letterSpacing: '0.01em',
                        flexShrink: 0,
                      }}
                    >
                      {'</'}{ fnName }
                    </span>
                  )
                }
                return (
                  <span style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '3px',
                    marginTop: '3px',
                  }}>
                    {badges}
                  </span>
                )
              })()}
            </span>
          )}
          
        </div>

  
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
        data-timeline-container="true"
        style={{
          flex: '1 1 auto',
          display: 'flex',
          position: 'relative',
          overflow: 'visible',
          minWidth: `${COLUMN_COUNT * COLUMN_WIDTH}px`
        }}
      >
        {/* Grille de la timeline audio */}
        {Array.from({ length: COLUMN_COUNT }).map((_, colIndex) => {
          const hasSound = soundTracks.some(track => {
            const startIdx = getSegmentIndexFromId(track.startSegmentId)
            const endIdx = getSegmentIndexFromId(track.endSegmentId)
            const trackEnd = endIdx !== -1 ? endIdx : startIdx
            return track.column === colIndex && startIdx <= index && trackEnd >= index
          })
          const isDragTarget = isAnyBlockDragging &&
            dragTargetCell.segmentIndex === index &&
            dragTargetCell.column === colIndex
          return (
            <div
              key={colIndex}
              style={{
                width: `${COLUMN_WIDTH}px`,
                flexShrink: 0,
                height: '100%',
                borderRight: colIndex < COLUMN_COUNT - 1 ? '1px solid #f0f0f0' : 'none',
                backgroundColor: isDragTarget
                  ? 'rgba(33, 150, 243, 0.2)'
                  : hasSound ? 'transparent' : 'rgba(76, 175, 80, 0.03)',
                cursor: hasSound ? 'default' : 'pointer',
                position: 'relative',
                transition: 'background-color 0.1s ease'
              }}
              onDoubleClick={() => !hasSound && onAddSoundToCell(index, colIndex)}
              title={!hasSound ? 'Double-cliquez pour ajouter un son' : ''}
            >
              {isDragTarget && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  border: '2px dashed #2196F3',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  boxSizing: 'border-box'
                }} />
              )}
            </div>
          )
        })}

        {/* Blocs sonores pour cette ligne */}
        {rowSoundTracks.map(track => (
          <SoundBlock
              key={track.id}
              soundTrack={track}
              segments={segments}
              soundLibrary={soundLibrary}
              rowHeights={rowHeights}
              isSelected={selectedSoundIds.has(track.id) || track.id === editingSoundTrack?.id}
              onSelect={onSoundSelect}
              onDoubleClick={onSoundDoubleClick}
              onColumnChange={onSoundColumnChange}
              onResize={onSoundResize}
              onMove={onSoundMove}
              onUpdate={onSoundUpdate}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragTargetChange={onDragTargetChange}
              currentSegmentIndex={index}
              isCmdPressed={isCmdPressed}
              onShowTooltip={onShowSoundTooltip}
              onHideTooltip={onHideSoundTooltip}
            />
        ))}
      </div>
      {/* Zone VFX (2 colonnes, à droite de la timeline audio) */}
      <div
        style={{
          flex: '0 0 auto',
          width: `${VFX_COLUMN_COUNT * VFX_COLUMN_WIDTH}px`,
          display: 'flex',
          position: 'relative',
          overflow: 'visible',
          borderLeft: '2px solid #e0e0e0',
          alignSelf: 'stretch',   // ← nouveau
        }}
      >
        {/* Grille VFX */}
        {Array.from({ length: VFX_COLUMN_COUNT }).map((_, colIndex) => {
          const hasVfx = (vfxTracks || []).some(track => {
            const si = getSegmentIndexFromId(track.startSegmentId)
            const ei = getSegmentIndexFromId(track.endSegmentId)
            const te = ei !== -1 ? ei : si
            return track.column === colIndex && si <= index && te >= index
          })
          const isVfxDragTarget = isAnyVfxDragging &&
            vfxDragTarget.segmentIndex === index &&
            vfxDragTarget.column === colIndex
          return (
            <div
              key={colIndex}
              style={{
                width: `${VFX_COLUMN_WIDTH}px`,
                flexShrink: 0,
                height: '100%',
                minHeight: `${SEGMENT_HEIGHT}px`,   // ← nouveau
                borderRight: colIndex < VFX_COLUMN_COUNT - 1 ? '1px solid #f0f0f0' : 'none',
                backgroundColor: isVfxDragTarget
                  ? 'rgba(120, 80, 220, 0.2)'
                  : hasVfx ? 'transparent' : 'rgba(120, 80, 220, 0.03)',
                cursor: hasVfx ? 'default' : 'pointer',
                position: 'relative',
                transition: 'background-color 0.1s ease',
              }}
              onDoubleClick={() => !hasVfx && onAddVfxToCell(index, colIndex)}
              title={!hasVfx ? 'Double-cliquez pour ajouter un effet' : ''}
            >
              {isVfxDragTarget && (
                <div style={{
                  position: 'absolute', inset: 0,
                  border: '2px dashed #7C50DC',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  boxSizing: 'border-box',
                }} />
              )}
            </div>
          )
        })}

        {/* Blocs VFX pour cette ligne */}
        {(vfxTracks || [])
          .filter(track => {
            const si = getSegmentIndexFromId(track.startSegmentId)
            return si === index
          })
          .map(track => (
            <VfxBlock
              key={track.id}
              vfxTrack={track}
              segments={segments}
              rowHeights={rowHeights}
              isSelected={selectedVfxIds.has(track.id) || track.id === editingVfxTrack?.id}
              onSelect={onVfxSelect}
              onDoubleClick={onVfxDoubleClick}
              onColumnChange={onVfxColumnChange}
              onResize={onVfxResize}
              onUpdate={onVfxUpdate}
              onDragStart={onVfxDragStart}
              onDragEnd={onVfxDragEnd}
              onDragTargetChange={onVfxDragTargetChange}
            />
          ))
        }
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Ne re-rendre que si ces props changent vraiment
  return (
    prevProps.segment === nextProps.segment &&
    prevProps.index === nextProps.index &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.editText === nextProps.editText &&
    prevProps.hovered === nextProps.hovered &&
    prevProps.isCmdPressed === nextProps.isCmdPressed &&
    prevProps.isChapter === nextProps.isChapter &&
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.isLeader === nextProps.isLeader &&
    prevProps.isFinisher === nextProps.isFinisher &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.rowHeight === nextProps.rowHeight &&
    prevProps.rowHeights === nextProps.rowHeights &&
    prevProps.dividerPosition === nextProps.dividerPosition &&
    prevProps.isDraggingDivider === nextProps.isDraggingDivider &&
    prevProps.isAnyBlockDragging === nextProps.isAnyBlockDragging &&
    prevProps.isAnyVfxDragging === nextProps.isAnyVfxDragging &&
    prevProps.dragTargetCell === nextProps.dragTargetCell &&
    prevProps.vfxDragTarget === nextProps.vfxDragTarget &&
    prevProps.selectedSoundIds === nextProps.selectedSoundIds &&
    prevProps.selectedVfxIds === nextProps.selectedVfxIds &&
    prevProps.editingSoundTrack === nextProps.editingSoundTrack &&
    prevProps.editingVfxTrack === nextProps.editingVfxTrack &&
    prevProps.soundTracks === nextProps.soundTracks &&
    prevProps.vfxTracks === nextProps.vfxTracks &&
    prevProps.segments === nextProps.segments &&
    prevProps.seuilKeys === nextProps.seuilKeys &&
    prevProps.isPause === nextProps.isPause &&
    prevProps.pauseDuration === nextProps.pauseDuration
  )
})

// Composant pour le séparateur entre segments (double-clic pour fusionner, clic ⏱ pour pause)
const SegmentSeparator = memo(function SegmentSeparator({ index, onMerge, onInsertPause, isHovered, onHover }) {
  const hovered = isHovered === index
  const [showPauseHint, setShowPauseHint] = useState(false)

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
        borderBottom: '1px solid #f0f0f0',
      }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => { onHover(null); setShowPauseHint(false) }}
    >
      {/* Ligne gauche */}
      <div style={{
        flex: 1,
        height: '1px',
        backgroundColor: hovered ? '#2196F3' : '#e0e0e0',
        transition: 'background-color 0.15s ease',
      }} />

      {/* Boutons (visibles au survol) */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 10,
        }}>
          {/* Fusion */}
          <div
            onDoubleClick={(e) => { e.stopPropagation(); onMerge(index) }}
            title="Double-cliquez pour fusionner"
            style={{
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
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ⊕
          </div>

          {/* Pause */}
          <div
            onClick={(e) => { e.stopPropagation(); onInsertPause(index) }}
            onMouseEnter={() => setShowPauseHint(true)}
            onMouseLeave={() => setShowPauseHint(false)}
            title="Insérer une pause"
            style={{
              backgroundColor: '#a78bfa',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 0.15s ease',
            }}
          >
            ⏱
          </div>

          {/* Tooltip */}
          {showPauseHint && (
            <div style={{
              position: 'absolute',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#1a1a2e',
              color: '#fff',
              fontSize: '0.65rem',
              padding: '3px 7px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 20,
            }}>
              Insérer une pause
            </div>
          )}
        </div>
      )}

      {/* Ligne droite */}
      <div style={{
        flex: 1,
        height: '1px',
        backgroundColor: hovered ? '#2196F3' : '#e0e0e0',
        transition: 'background-color 0.15s ease',
      }} />
    </div>
  )
})
// Composant principal unifié
function UnifiedSegmentsTimeline({
  segments,
  soundTracks,
  parts,
  soundLibrary,
  vfxTracks = [],
  onSegmentsChange,
  onSoundTracksChange,
  onVfxTracksChange,
  onSaveToHistory,
  adminPassword,
  onSoundsImported,
  onPreviewFromSegment,
  seuilKeys = [],
  masterVolume = 1.0,
  onMasterVolumeChange,
  splitViewOffset = 0,
  timelineLeft = null,
}) {
  const [selectedSoundIds, setSelectedSoundIds] = useState(new Set())
  const [editingSoundTrack, setEditingSoundTrack] = useState(null)
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  // Sélection multiple de segments
  const [selectedSegmentIndices, setSelectedSegmentIndices] = useState(new Set())
  const selectionAnchorRef = useRef(null) // dernière ancre pour Shift+clic
  const selectedSegmentIndicesRef = useRef(new Set())
  // Synchroniser la ref avec le state à chaque render
  selectedSegmentIndicesRef.current = selectedSegmentIndices

  const [hoveredRow, setHoveredRow] = useState(null)
  const [hoveredSeparator, setHoveredSeparator] = useState(null)
  const [isCmdPressed, setIsCmdPressed] = useState(false)
  const [dividerPosition, setDividerPosition] = useState(45)
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)
  const [editingSegmentIndex, setEditingSegmentIndex] = useState(null)
  const [editTexts, setEditTexts] = useState({})
  const [measuredRowHeights, setMeasuredRowHeights] = useState([])
  const [isAnyBlockDragging, setIsAnyBlockDragging] = useState(false)
  const [dragTargetCell, setDragTargetCell] = useState({ segmentIndex: -1, column: -1 })
  // ── États VFX ──────────────────────────────────────────────
  const [soundTooltip, setSoundTooltip] = useState(null) // { label, x, y }
  const [selectedVfxIds, setSelectedVfxIds]     = useState(new Set())
  const [editingVfxTrack, setEditingVfxTrack]   = useState(null)
  const [isAnyVfxDragging, setIsAnyVfxDragging] = useState(false)
  const [vfxDragTarget, setVfxDragTarget] = useState({ segmentIndex: -1, column: -1 })

  // ── Chapitres ──────────────────────────────────────────────
  const [collapsedChapters, setCollapsedChapters] = useState(new Set())
  const [gameModePanel, setGameModePanel] = useState(null) // index du segment ou null
  const clipboardRef = useRef(null)
  const [clipboardSize, setClipboardSize] = useState(0)
  const [pasteIndicator, setPasteIndicator] = useState(null)
  const scrollToSegmentRef = useRef(null)

  const [gotoInput, setGotoInput] = useState('')
  const [minimapHovered, setMinimapHovered] = useState(null)

  // ── Drag & drop segments ────────────────────────────────────
  const [isDraggingSegment, setIsDraggingSegment] = useState(false)
  const [dragPlaceholderIndex, setDragPlaceholderIndex] = useState(-1)
  const dragStateRef = useRef({
    active: false,
    fromIndex: -1,
    blockSize: 1,
    startY: 0,
    currentY: 0,
    offsetY: 0,       // décalage curseur / coin supérieur du segment
    ghostText: '',
    ghostHeight: 0,
  })
  const ghostRef = useRef(null)
  const autoScrollRef = useRef(null)

  const handleSelectVfx = useCallback((id, isShift) => {
      setSelectedVfxIds(prev => {
        const next = isShift ? new Set(prev) : new Set()
        if (isShift && prev.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      if (!isShift) setSelectedSoundIds(new Set())
    }, [])  
  const handleDoubleClickVfx  = useCallback((track) => setEditingVfxTrack(track), [])
  const handleVfxDragStart    = useCallback(() => setIsAnyVfxDragging(true), [])
  const handleVfxDragEnd      = useCallback(() => { setIsAnyVfxDragging(false); setVfxDragTarget({ segmentIndex: -1, column: -1 }) }, [])
  const handleVfxDragTargetChange = useCallback((si, col) => setVfxDragTarget({ segmentIndex: si, column: col }), [])

  const handleVfxColumnChange = useCallback((vfxId, newCol) => {
    if (!onVfxTracksChange) return
    onVfxTracksChange(vfxTracks.map(t => t.id === vfxId ? { ...t, column: newCol } : t))
    if (onSaveToHistory) onSaveToHistory()
  }, [vfxTracks, onVfxTracksChange, onSaveToHistory])

  const handleVfxUpdate = useCallback((vfxId, updates) => {
    if (!onVfxTracksChange) return
    onVfxTracksChange(vfxTracks.map(t => t.id === vfxId ? { ...t, ...updates } : t))
    if (onSaveToHistory) onSaveToHistory()
  }, [vfxTracks, onVfxTracksChange, onSaveToHistory])

  const handleVfxResize = useCallback((vfxId, newStart, newEnd) => {
    if (!onVfxTracksChange) return
    onVfxTracksChange(vfxTracks.map(t => {
      if (t.id !== vfxId) return t
      return { ...t, ...(newStart && { startSegmentId: newStart }), ...(newEnd && { endSegmentId: newEnd }) }
    }))
    if (onSaveToHistory) onSaveToHistory()
  }, [vfxTracks, onVfxTracksChange, onSaveToHistory])

  const handleSaveVfxTrack = useCallback((updated) => {
    if (!onVfxTracksChange) return
    onVfxTracksChange(vfxTracks.map(t => t.id === updated.id ? updated : t))
    if (onSaveToHistory) onSaveToHistory()
    setEditingVfxTrack(null)
  }, [vfxTracks, onVfxTracksChange, onSaveToHistory])

  const handleDeleteVfxTrack = useCallback((vfxId) => {
    if (!onVfxTracksChange) return
    onVfxTracksChange(vfxTracks.filter(t => t.id !== vfxId))
    if (onSaveToHistory) onSaveToHistory()
    setEditingVfxTrack(null)
  }, [vfxTracks, onVfxTracksChange, onSaveToHistory])

    // Bascule le statut "chapitre" d'un segment
  const handleToggleIsChapter = useCallback((index) => {
    const segment = segments[index]
    if (!segment) return
    const wasChapter = segment?.isChapter === true
    const updatedSegments = [...segments]

    if (!wasChapter) {
      // Activation chapitre : isChapter + isLeader sur le segment courant
      updatedSegments[index] = typeof segment === 'string'
        ? { text: segment, isChapter: true, isLeader: true }
        : { ...segment, isChapter: true, isLeader: true }
      // isLeader sur le segment suivant → rend le courant Finisher automatiquement
      if (index + 1 < segments.length) {
        const next = segments[index + 1]
        updatedSegments[index + 1] = typeof next === 'string'
          ? { text: next, isLeader: true }
          : { ...next, isLeader: true }
      }
    } else {
      // Désactivation chapitre : retire seulement isChapter
      // Les leaders restent (suppression manuelle possible)
      updatedSegments[index] = typeof segment === 'string'
        ? { text: segment, isChapter: false }
        : { ...segment, isChapter: false }
      setCollapsedChapters(prev => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }

    onSegmentsChange(updatedSegments)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, onSegmentsChange, onSaveToHistory])

  // Collapse/expand un chapitre au clic sur son numéro
  const handleToggleChapter = useCallback((index, shiftKey = false) => {
  setCollapsedChapters(prev => {
    const willCollapse = !prev.has(index) // ce que l'action locale ferait

    if (!shiftKey) {
      // Comportement normal : toggle uniquement ce chapitre
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    }

    // Shift+clic : appliquer l'action locale à TOUS les chapitres
    const allChapterIndices = segments.reduce((acc, seg, i) => {
      if (seg?.isChapter === true) acc.push(i)
      return acc
    }, [])

    if (willCollapse) {
      // Fermer tous les chapitres
      return new Set(allChapterIndices)
    } else {
      // Ouvrir tous les chapitres
      return new Set()
    }
  })
}, [segments])
  
// Bascule le statut "leader" d'un segment
  const handleToggleIsLeader = useCallback((index) => {
    const segment = segments[index]
    if (!segment) return
    const updatedSegments = [...segments]
    updatedSegments[index] = typeof segment === 'string'
      ? { text: segment, isLeader: true }
      : { ...segment, isLeader: !segment.isLeader }
    onSegmentsChange(updatedSegments)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, onSegmentsChange, onSaveToHistory])

  const handleAddVfxToCell = useCallback((segmentIndex, column) => {
    if (!onVfxTracksChange) return
    const seg = segments[segmentIndex]
    const segId = seg?.id || seg?._id || `seg_${segmentIndex}`
    const track  = createVfxTrack('shake', segId, column)
    onVfxTracksChange([...vfxTracks, track])
    if (onSaveToHistory) onSaveToHistory()
    setEditingVfxTrack(track)
  }, [segments, vfxTracks, onVfxTracksChange, onSaveToHistory])
  const [formatToolbar, setFormatToolbar] = useState(null)
// { mode: 'selection'|'segment', position: {top, left}, segmentIndex, range }
  
  // Calcule quels segments sont cachés (sous un chapitre collapsé)
  const hiddenSegments = useMemo(() => {
    const hidden = new Set()
    let currentChapterCollapsed = false
    for (let i = 0; i < segments.length; i++) {
      const isChap = segments[i]?.isChapter === true
      if (isChap) {
        currentChapterCollapsed = collapsedChapters.has(i)
      } else if (currentChapterCollapsed) {
        hidden.add(i)
      }
    }
    return hidden
  }, [segments, collapsedChapters])

  // Calcule les segments Finisher (segment juste avant un Leader)
  const finisherSegments = useMemo(() => {
    const finishers = new Set()
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i + 1]?.isLeader === true) finishers.add(i)
    }
    return finishers
  }, [segments])

  const containerRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const [scrollRatio, setScrollRatio] = useState(0)
  const dividerRef = useRef(null)
  const rowRefs = useRef([])

// Gérer le drag du séparateur — un seul useEffect
  const handleDividerMouseDown = useCallback(() => setIsDraggingDivider(true), [])
  useEffect(() => {
    if (!isDraggingDivider) return
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newPosition = ((e.clientX - rect.left) / rect.width) * 100
        setDividerPosition(Math.max(20, Math.min(80, newPosition)))
      }
    }
    const handleMouseUp = () => setIsDraggingDivider(false)
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
    // Ne ré-initialiser le texte que si on n'a pas déjà une valeur en cours d'édition
    // pour ce segment (évite d'écraser le texte tapé avant un double-clic)
    setEditTexts(prev => {
      if (prev[index] !== undefined) return prev // déjà en édition : conserver
      const segment = segments[index]
      let editValue = getSegmentText(segment)
      if (segment && typeof segment === 'object' && segment.breakAt != null) {
        const before = editValue.slice(0, segment.breakAt).trimEnd()
        const after = editValue.slice(segment.breakAt).trimStart()
        editValue = before + '\n\n' + after
      }
      return { ...prev, [index]: editValue }
    })
  }, [segments])

  const handleEditChange = useCallback((index, newText) => {
    setEditTexts(prev => ({
      ...prev,
      [index]: newText
    }))
  }, [])

  const handleEditBlur = useCallback((index) => {
    const newText = editTexts[index]
    if (newText !== undefined) {
      // Détecter si l'utilisateur a conservé ou inséré un double saut de ligne
      // et le convertir en breakAt pour l'affichage
      // Normaliser : \r\n → \n, puis traiter \n\n et \n simples
      const normalized = newText.replace(/\r\n/g, '\n')
      const doubleBreakMatch = normalized.match(/^([\s\S]*?)\n\n([\s\S]*)$/)
      let cleanText, breakAt
      if (doubleBreakMatch) {
        cleanText = doubleBreakMatch[1].trimEnd() + ' ' + doubleBreakMatch[2].trimStart()
        breakAt = doubleBreakMatch[1].trimEnd().length + 1 // +1 pour l'espace
      } else {
        // Conserver les sauts de ligne simples tels quels dans le texte
        cleanText = normalized
        breakAt = null
      }
      const updatedSegments = [...segments]
      updatedSegments[index] = typeof segments[index] === 'string'
        ? cleanText
        : { ...segments[index], text: cleanText, breakAt }
      onSegmentsChange(updatedSegments)
      if (onSaveToHistory) onSaveToHistory()
    }
    setEditTexts(prev => {
      const next = { ...prev }
      delete next[index]
      return next
    })
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
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      // 1. Sauvegarder le texte du segment courant immédiatement
      const newText = editTexts[index]
      let updatedSegments = [...segments]
      if (newText !== undefined) {
        const normalized = newText.replace(/\r\n/g, '\n')
        const doubleBreakMatch = normalized.match(/^([\s\S]*?)\n\n([\s\S]*)$/)
        let cleanText, breakAt
        if (doubleBreakMatch) {
          cleanText = doubleBreakMatch[1].trimEnd() + ' ' + doubleBreakMatch[2].trimStart()
          breakAt = doubleBreakMatch[1].trimEnd().length + 1
        } else {
          cleanText = normalized
          breakAt = null
        }
        updatedSegments[index] = typeof segments[index] === 'string'
          ? cleanText
          : { ...segments[index], text: cleanText, breakAt }
      }
      // 2. Créer un nouveau segment juste après
      const nextIndex = index + 1
      const existingNext = updatedSegments[nextIndex]
      if (!existingNext) {
        // Seulement créer si le segment suivant n'existe pas
        const newSegment = typeof segments[0] === 'string'
          ? ''
          : { text: '', id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }
        updatedSegments.splice(nextIndex, 0, newSegment)
      }
      // 3. Nettoyer l'état d'édition du segment courant
      setEditTexts(prev => {
        const next = { ...prev }
        delete next[index]
        return next
      })
      setEditingSegmentIndex(null)
      // 4. Appliquer les changements
      onSegmentsChange(updatedSegments)
      if (onSaveToHistory) onSaveToHistory()
      // 5. Ouvrir le segment suivant en édition après le re-render
      setTimeout(() => {
        handleStartEdit(nextIndex)
        scrollToSegmentRef.current?.(nextIndex)
      }, 30)
    }
  }, [handleEditBlur, segments, onSegmentsChange, onSaveToHistory, handleStartEdit])

  const handleMergeSegments = useCallback((index) => {
    if (index >= segments.length - 1) return
    
    const updatedSegments = [...segments]
    const seg1 = getSegmentText(segments[index])
    const seg2 = getSegmentText(segments[index + 1])
    
    const wordCount = seg1.split(' ').length
    const delay = Math.round(wordCount * 200)
    
    const mergedText = seg1 + ' ' + seg2
    const mergedSegment = typeof segments[index] === 'string' ? mergedText : { ...segments[index], text: mergedText, delay }
    
    updatedSegments.splice(index, 2, mergedSegment)
    
    const seg1Id = (typeof segments[index] === 'object' && segments[index] !== null)
      ? (segments[index].id || segments[index]._id)
      : null
    const seg2Id = (typeof segments[index + 1] === 'object' && segments[index + 1] !== null)
      ? (segments[index + 1].id || segments[index + 1]._id)
      : null
    
    const updatedTracks = seg1Id && seg2Id
      ? soundTracks.map(track => {
          if (track.startSegmentId === seg2Id) return { ...track, startSegmentId: seg1Id }
          if (track.endSegmentId === seg2Id) return { ...track, endSegmentId: seg1Id }
          return track
        })
      : soundTracks
    
    onSegmentsChange(updatedSegments)
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, soundTracks, onSegmentsChange, onSoundTracksChange, onSaveToHistory])

  // ── Insérer un segment pause entre deux segments ───────────────────────────
  const handleInsertPause = useCallback((afterIndex) => {
    const newPause = {
      id: `seg_pause_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: '',
      pause: 1500, // durée par défaut en ms, éditable dans la cellule
    }
    const updated = [...segments]
    updated.splice(afterIndex + 1, 0, newPause)
    onSegmentsChange(updated)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, onSegmentsChange, onSaveToHistory])

  const handleSplitSegment = useCallback((index, splitPosition) => {
    const segment = segments[index]
    const text = getSegmentText(segment)
    
    if (splitPosition <= 0 || splitPosition >= text.length) return
    
    const part1 = text.substring(0, splitPosition).trim()
    const part2 = text.substring(splitPosition).trim()
    
    if (!part1 || !part2) return
    
    const updatedSegments = [...segments]
    const newId1 = `seg_${Date.now()}_a_${Math.random().toString(36).slice(2, 7)}`
    const newId2 = `seg_${Date.now()}_b_${Math.random().toString(36).slice(2, 7)}`
    const newSeg1 = typeof segment === 'string'
      ? { text: part1, id: newId1, breakAt: null }
      : { ...segment, text: part1, id: newId1, breakAt: null }
    const newSeg2 = typeof segment === 'string'
      ? { text: part2, id: newId2, breakAt: null }
      : { ...segment, text: part2, id: newId2, breakAt: null, audioEvents: [], isLeader: false }
    
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
    // Si plusieurs segments sont sélectionnés ET que le segment cliqué est dans la sélection,
    // supprimer tous les segments sélectionnés d'un coup
    const indicesToDelete = (selectedSegmentIndices.size > 1 && selectedSegmentIndices.has(index))
      ? [...selectedSegmentIndices].sort((a, b) => b - a) // tri décroissant pour splice
      : [index]

    let updatedSegments = [...segments]
    let updatedTracks = [...soundTracks]
    let updatedVfxTracks = [...(vfxTracks || [])]

    // Supprimer dans l'ordre décroissant pour que les indices restent valides
    for (const idx of indicesToDelete) {
      const segmentToDelete = updatedSegments[idx]
      if (!segmentToDelete) continue
      const segId = segmentToDelete.id || segmentToDelete._id

      // Segment suivant qui récupérera les références orphelines
      const nextSeg = updatedSegments[idx + 1]
      const nextSegId = nextSeg ? (nextSeg.id || nextSeg._id) : null

      updatedSegments.splice(idx, 1)

      updatedTracks = updatedTracks
        .filter(track => track.startSegmentId !== segId)
        .map(track => ({
          ...track,
          endSegmentId: track.endSegmentId === segId
            ? (nextSegId || track.startSegmentId)
            : track.endSegmentId
        }))

      updatedVfxTracks = updatedVfxTracks
        .filter(track => track.startSegmentId !== segId)
        .map(track => ({
          ...track,
          endSegmentId: track.endSegmentId === segId
            ? (nextSegId || track.startSegmentId)
            : track.endSegmentId
        }))
    }

    setSelectedSegmentIndices(new Set())
    onSegmentsChange(updatedSegments)
    onSoundTracksChange(updatedTracks)
    if (onVfxTracksChange) onVfxTracksChange(updatedVfxTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, soundTracks, vfxTracks, selectedSegmentIndices, onSegmentsChange, onSoundTracksChange, onVfxTracksChange, onSaveToHistory])

  // Sélection avec support Cmd+clic (discontinu) et Shift+clic (plage)
  const handleSelectSegment = useCallback((index, e) => {
    const isCmd  = e?.metaKey || e?.ctrlKey
    const isShift = e?.shiftKey

    if (isCmd && !isShift) {
      // Cmd+clic : toggle individuel
      setSelectedSegmentIndices(prev => {
        const next = new Set(prev)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        return next
      })
      selectionAnchorRef.current = index
    } else if (isShift && selectionAnchorRef.current !== null) {
      // Shift+clic : plage depuis l'ancre
      const anchor = selectionAnchorRef.current
      const from = Math.min(anchor, index)
      const to   = Math.max(anchor, index)
      // Étendre la plage pour inclure les enfants de tout chapitre présent dedans
      let rangeTo = to
      for (let i = from; i <= rangeTo; i++) {
        if (segments[i]?.isChapter === true) {
          for (let j = i + 1; j < segments.length; j++) {
            if (segments[j]?.isChapter === true) break
            if (j > rangeTo) rangeTo = j
          }
        }
      }
      setSelectedSegmentIndices(prev => {
        const next = new Set(prev)
        for (let i = from; i <= rangeTo; i++) next.add(i)
        return next
      })
      // ancre inchangée
    } else {
      // Clic simple : sélection exclusive
      setSelectedSegmentIndices(new Set([index]))
      selectionAnchorRef.current = index
    }

    // FormatToolbar sur le segment cliqué
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) return
    const row = rowRefs.current[index]
    if (!row) return
    const rect = row.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    setFormatToolbar({
      mode: 'segment',
      position: { top: rect.top, left: timelineLeft ?? containerRect?.left ?? rect.left },
      segmentIndex: index,
      selectedText: null,
    })
  }, [segments])

// Apparition du toolbar à la sélection de texte (span normal ET textarea en édition)
const handleTextSelection = useCallback(() => {
  const selection = window.getSelection()
  const selectedText = selection?.toString().trim()

  // Cas 1 : sélection native (span en mode lecture)
  if (selection && !selection.isCollapsed && selectedText) {
    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    const segmentDiv = (container.nodeType === 1 ? container : container.parentElement)
      ?.closest('[data-segment-index]')
    if (segmentDiv) {
      const segmentIndex = parseInt(segmentDiv.dataset.segmentIndex, 10)
      const row = rowRefs.current[segmentIndex]
      if (row) {
        const rect = row.getBoundingClientRect()
        const containerRect = containerRef.current?.getBoundingClientRect()
        setFormatToolbar({
          mode: 'selection',
          position: { top: rect.top, left: timelineLeft ?? containerRect?.left ?? rect.left },
          segmentIndex,
          selectedText,
        })
        return
      }
    }
  }

  // Cas 2 : sélection dans un textarea (mode édition)
  const activeEl = document.activeElement
  if (
    activeEl &&
    activeEl.tagName === 'TEXTAREA' &&
    activeEl.selectionStart !== activeEl.selectionEnd
  ) {
    const selected = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd).trim()
    if (!selected) return
    // Retrouver le segment parent via data-segment-index
    const segmentDiv = activeEl.closest('[data-segment-index]')
    if (!segmentDiv) return
    const segmentIndex = parseInt(segmentDiv.dataset.segmentIndex, 10)
    const row = rowRefs.current[segmentIndex]
    if (!row) return
    const rect = row.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    setFormatToolbar({
      mode: 'selection',
      position: { top: rect.top, left: timelineLeft ?? containerRect?.left ?? rect.left },
      segmentIndex,
      selectedText: selected,
    })
  }
}, [])

// Appliquer gras/italique/souligné/barré sur la sélection ou le segment entier
  // Avec toggle : si le marqueur est déjà présent, il est retiré
  const handleFormat = useCallback((type) => {
    if (!formatToolbar || formatToolbar.segmentIndex === null || formatToolbar.segmentIndex === undefined) return
    const { segmentIndex } = formatToolbar
    const segment = segments[segmentIndex]
    if (!segment) return

    const key = { bold: 'bold', italic: 'italic', underline: 'underline', strikethrough: 'strikethrough' }[type]
    if (!key) return

    const updatedSegments = [...segments]
    updatedSegments[segmentIndex] = typeof segment === 'string'
      ? { text: segment, [key]: true }
      : { ...segment, [key]: !segment[key] }

    onSegmentsChange(updatedSegments)
    if (onSaveToHistory) onSaveToHistory()
    setFormatToolbar(null)
  }, [formatToolbar, segments, onSegmentsChange, onSaveToHistory])

  // Changer la police d'un segment
  const handleFontChange = useCallback((fontValue) => {
    if (!formatToolbar || formatToolbar.segmentIndex === null || formatToolbar.segmentIndex === undefined) return
    const idx = formatToolbar.segmentIndex
    const segment = segments[idx]
    if (!segment) return
    const updatedSegments = [...segments]
    updatedSegments[idx] = typeof segment === 'string'
      ? { text: segment, fontFamily: fontValue }
      : { ...segment, fontFamily: fontValue }
    onSegmentsChange(updatedSegments)
    if (onSaveToHistory) onSaveToHistory()
    setFormatToolbar(null)
  }, [formatToolbar, segments, onSegmentsChange, onSaveToHistory])

  // Actions sur les sons
  const handleShowSoundTooltip = useCallback((label, x, y) => {
    setSoundTooltip({ label, x, y })
  }, [])
  const handleHideSoundTooltip = useCallback(() => {
    setSoundTooltip(null)
  }, [])
  const handleSelectSound = useCallback((id, isShift) => {
    setSelectedSoundIds(prev => {
      const next = isShift ? new Set(prev) : new Set()
      if (isShift && prev.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (!isShift) setSelectedVfxIds(new Set())
  }, [])

  const handleSoundDragStart = useCallback(() => {
    setIsAnyBlockDragging(true)
  }, [])
  const handleSoundDragEnd = useCallback(() => {
    setIsAnyBlockDragging(false)
    setDragTargetCell({ segmentIndex: -1, column: -1 })
  }, [])

  const handleDragTargetChange = useCallback((segmentIndex, column) => {
    setDragTargetCell({ segmentIndex, column })
  }, [])

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

  // Handler unifié pour déplacement diagonal (colonne + segment en même temps)
  const handleMoveSound = useCallback((soundId, newStartSegmentId, newEndSegmentId, newColumn) => {
    const updatedTracks = soundTracks.map(track => {
      if (track.id !== soundId) return track
      return {
        ...track,
        ...(newStartSegmentId && { startSegmentId: newStartSegmentId }),
        ...(newEndSegmentId   && { endSegmentId:   newEndSegmentId   }),
        column: newColumn,
      }
    })
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
    // Synchroniser le PA ancre avec le volume final du panel
    let finalTrack = updatedTrack
    if (updatedTrack.automationPoints?.length > 0) {
      const anchorIdx = updatedTrack.automationPoints.findIndex(
        pt => pt.segmentId === updatedTrack.startSegmentId && pt._isAnchor
      )
      if (anchorIdx !== -1) {
        const newPoints = [...updatedTrack.automationPoints]
        newPoints[anchorIdx] = { ...newPoints[anchorIdx], volume: updatedTrack.volume ?? 0.5 }
        finalTrack = { ...updatedTrack, automationPoints: newPoints }
      }
    }
    const updatedTracks = soundTracks.map(track =>
      track.id === finalTrack.id ? finalTrack : track
    )
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
    setEditingSoundTrack(null)
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

  const handleUpdateSoundTrack = useCallback((soundId, updates) => {
    const updatedTracks = soundTracks.map(track => {
      if (track.id !== soundId) return track
      const merged = { ...track, ...updates }

      // ── Synchroniser le PA ancre si le volume du bloc change ──────────
      // Le PA _isAnchor au segment de départ reflète toujours le volume du panel.
      if ('volume' in updates && merged.automationPoints?.length > 0) {
        const anchorIdx = merged.automationPoints.findIndex(
          pt => pt.segmentId === merged.startSegmentId && pt._isAnchor
        )
        if (anchorIdx !== -1) {
          const newPoints = [...merged.automationPoints]
          newPoints[anchorIdx] = { ...newPoints[anchorIdx], volume: updates.volume }
          merged.automationPoints = newPoints
        }
      }

      return merged
    })
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

  const handleRealTimeUpdate = useCallback((updatedTrack) => {
    const updatedTracks = soundTracks.map(track =>
      track.id === updatedTrack.id ? updatedTrack : track
    )
    onSoundTracksChange(updatedTracks)
  }, [soundTracks, onSoundTracksChange])

  const handleDeleteSoundTrack = useCallback((soundId) => {
    const updatedTracks = soundTracks.filter(track => track.id !== soundId)
    onSoundTracksChange(updatedTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [soundTracks, onSoundTracksChange, onSaveToHistory])

  // Gérer la touche Command + Backspace pour supprimer un bloc son sélectionné
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setIsCmdPressed(true)
      }

      // ── Cmd+C : Copier les segments sélectionnés ──────────────────────────
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const active = document.activeElement
        const isTyping = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')
        if (!isTyping && selectedSegmentIndicesRef.current.size > 0) {
          e.preventDefault()

          // Copier exactement ce qui est sélectionné, sans expansion automatique
          const sortedIndices = [...selectedSegmentIndicesRef.current].sort((a, b) => a - b)
          const copiedSegments = sortedIndices.map(i => segments[i])
          const copiedIds = new Set(copiedSegments.map(s => s.id || s._id).filter(Boolean))

          // Copier les soundTracks dont le startSegmentId est dans les segments copiés
          const copiedSoundTracks = soundTracks.filter(t => copiedIds.has(t.startSegmentId))

          // Copier les vfxTracks dont le startSegmentId est dans les segments copiés
          const copiedVfxTracks = (vfxTracks || []).filter(t => copiedIds.has(t.startSegmentId))

          clipboardRef.current = {
            segments: copiedSegments,
            soundTracks: copiedSoundTracks,
            vfxTracks: copiedVfxTracks,
          }
          setClipboardSize(copiedSegments.length)
        }
      }

      // ── Cmd+V : Coller après le segment actif (dernier cliqué) ───────────
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        const active = document.activeElement
        const isTyping = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')
        if (!isTyping && clipboardRef.current) {
          e.preventDefault()

          const clipboard = clipboardRef.current
          const targetIndex = selectionAnchorRef.current ?? segments.length - 1
          const insertAfter = targetIndex // on colle APRÈS ce segment

          // Générer de nouveaux IDs pour tous les segments collés
          const idMap = {} // ancienId → nouvelId
          const now = Date.now()
          const newSegments = clipboard.segments.map((seg, i) => {
            const oldId = seg.id || seg._id || `seg_clipboard_${i}`
            const newId = `seg_${now}_paste_${i}_${Math.random().toString(36).slice(2, 7)}`
            idMap[oldId] = newId
            return {
              ...seg,
              id: newId,
              _id: undefined,
            }
          })

          // Relier les soundTracks aux nouveaux IDs de segments
          const newSoundTracks = clipboard.soundTracks.map(t => ({
            ...t,
            id: `st_${now}_paste_${Math.random().toString(36).slice(2, 9)}`,
            startSegmentId: idMap[t.startSegmentId] ?? t.startSegmentId,
            endSegmentId: idMap[t.endSegmentId] ?? t.endSegmentId,
          }))

          // Relier les vfxTracks aux nouveaux IDs de segments
          const newVfxTracks = clipboard.vfxTracks.map(t => ({
            ...t,
            id: `vfx_${now}_paste_${Math.random().toString(36).slice(2, 9)}`,
            startSegmentId: idMap[t.startSegmentId] ?? t.startSegmentId,
            endSegmentId: idMap[t.endSegmentId] ?? t.endSegmentId,
          }))

          // Insérer dans la liste de segments
          const updatedSegments = [
            ...segments.slice(0, insertAfter + 1),
            ...newSegments,
            ...segments.slice(insertAfter + 1),
          ]

          // Sélectionner les segments nouvellement collés
          const pastedIndices = new Set(
            newSegments.map((_, i) => insertAfter + 1 + i)
          )

          onSegmentsChange(updatedSegments)
          onSoundTracksChange([...soundTracks, ...newSoundTracks])
          if (onVfxTracksChange) onVfxTracksChange([...(vfxTracks || []), ...newVfxTracks])
          if (onSaveToHistory) onSaveToHistory()

          setSelectedSegmentIndices(pastedIndices)
          selectionAnchorRef.current = insertAfter + 1

          // Indicateur visuel bref
          setPasteIndicator(insertAfter + 1)
          setTimeout(() => setPasteIndicator(null), 1200)

          // Scroller vers les segments collés
          setTimeout(() => scrollToSegmentRef.current?.(insertAfter + 1), 50)
        }
      }

      // Escape : annuler le drag segment en cours
      if (e.key === 'Escape' && dragStateRef.current.active) {
        dragStateRef.current.active = false
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        setIsDraggingSegment(false)
        setDragPlaceholderIndex(-1)
        if (autoScrollRef.current) { clearInterval(autoScrollRef.current); autoScrollRef.current = null }
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const active = document.activeElement
        const isTyping = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')
        if (!isTyping) {
          if (selectedSoundIds.size > 0) {
            e.preventDefault()
            selectedSoundIds.forEach(id => handleDeleteSoundTrack(id))
            setSelectedSoundIds(new Set())
          }
          if (selectedVfxIds.size > 0) {
            e.preventDefault()
            selectedVfxIds.forEach(id => handleDeleteVfxTrack(id))
            setSelectedVfxIds(new Set())
          }
        }
      }
    }
    const handleKeyUp = (e) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setIsCmdPressed(false)
      }
    }
    const handleBlur = () => {
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
}, [selectedSoundIds, selectedVfxIds, handleDeleteSoundTrack, handleDeleteVfxTrack, segments, soundTracks, vfxTracks, onSegmentsChange, onSoundTracksChange, onVfxTracksChange, onSaveToHistory])
  const handleDoubleClickEmptyCell = useCallback((segmentIndex, column) => {
    if (segmentIndex >= segments.length) return
    
    
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
    setShowSoundPicker({ segmentIndex, segmentId, column: freeColumn })
  }, [segments, soundTracks])

  const selectedSoundTrack = editingSoundTrack
  const selectedSound = selectedSoundTrack ? (
  soundLibrary.find(s => s.id === selectedSoundTrack.soundId) ||
  soundLibrary.find(s => 
    s.filename?.replace(/\.mp3$/i, '') === selectedSoundTrack.soundId ||
    s.originalFilename?.replace(/\.wav$/i, '') === selectedSoundTrack.soundId ||
    s.id === selectedSoundTrack.soundId?.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')
  )
) : null

  const closePanel = () => {
    setEditingSoundTrack(null)
    setSelectedSoundIds(new Set())
  }

  // Calculer une estimation initiale rapide de la hauteur des lignes
  // En tenant compte de la largeur de la colonne de texte pour un calcul plus précis
  const estimatedRowHeights = useMemo(() => {
    // Estimer le nombre de caractères par ligne en fonction de la largeur de la colonne
    // La largeur de la colonne segment est dividerPosition% du conteneur
    // Avec une police system-ui à 0.85rem, on estime ~50-60 chars pour 45% de largeur
    const charsPerLine = Math.max(30, Math.round((dividerPosition / 45) * 55))
    const lineHeight = 20 // pixels
    
    return segments.map(segment => {
      const text = getSegmentText(segment)
      // Compter les lignes naturelles (sauts de ligne explicites)
      const explicitLines = text.split('\n').length
      // Compter les lignes dues au wrapping
      const wrappedLines = Math.ceil(text.length / charsPerLine)
      // Prendre le maximum des deux
      const lines = Math.max(explicitLines, wrappedLines)
      // Hauteur minimale = SEGMENT_HEIGHT, hauteur calculée = padding + lignes * lineHeight
      const calculatedHeight = 16 + lines * lineHeight // 16px pour le padding (0.5rem top + 0.5rem bottom)
      return Math.max(SEGMENT_HEIGHT, calculatedHeight)
    })
  }, [segments, dividerPosition])

  const rowHeights = measuredRowHeights.length === segments.length ? measuredRowHeights : estimatedRowHeights

  const scrollToSegment = useCallback((index) => {
    const scrollEl = scrollContainerRef.current
    if (!scrollEl) return
    let cumY = 0
    for (let i = 0; i < index; i++) {
      cumY += (rowHeights[i] || SEGMENT_HEIGHT) + 8
    }
    scrollEl.scrollTo({ top: cumY, behavior: 'smooth' })
  }, [rowHeights])
  scrollToSegmentRef.current = scrollToSegment

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight
      setScrollRatio(max > 0 ? el.scrollTop / max : 0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    // Pendant le drag : ne pas mesurer, mais mémoriser qu'une mesure est nécessaire
    if (isAnyBlockDragging || isAnyVfxDragging || isDraggingSegment) return
    const heights = segments.map((_, index) => {
      if (hiddenSegments.has(index)) {
        return measuredRowHeights[index] || estimatedRowHeights[index] || SEGMENT_HEIGHT
      }
      const row = rowRefs.current[index]
      return row ? Math.max(SEGMENT_HEIGHT, Math.ceil(row.getBoundingClientRect().height)) : SEGMENT_HEIGHT
    })
    const rowsChanged = heights.length !== measuredRowHeights.length || heights.some((height, idx) => height !== measuredRowHeights[idx])
    if (rowsChanged) {
      setMeasuredRowHeights(heights)
    }
  // isAnyBlockDragging/isAnyVfxDragging/isDraggingSegment dans les deps :
  // quand ils passent de true à false (fin de drag), le effect se re-déclenche
  // et mesure les hauteurs une seule fois proprement
  }, [segments, editTexts, dividerPosition, editingSegmentIndex, selectedSegmentIndices, soundTracks.length, hiddenSegments, isAnyBlockDragging, isAnyVfxDragging, isDraggingSegment])
  const totalHeight = rowHeights.reduce((sum, rowHeight) => sum + rowHeight + 8, 0)

  // ── Handlers drag & drop segments ──────────────────────────
  const handleSegmentDragStart = useCallback((e, index) => {
    e.stopPropagation()
    if (editingSegmentIndex !== null || isAnyBlockDragging || isAnyVfxDragging) return
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

    // Si le segment dragué n'est pas dans la sélection → drag solo, reset sélection
    let dragIndices // Set<number> des indices à déplacer
    if (selectedSegmentIndices.has(index)) {
      dragIndices = new Set(selectedSegmentIndices)
    } else {
      dragIndices = new Set([index])
      setSelectedSegmentIndices(new Set([index]))
      selectionAnchorRef.current = index
    }

    // Compléter automatiquement les chapitres : si un chapitre est sélectionné,
    // inclure tous ses enfants même s'ils ne sont pas explicitement sélectionnés
    const completed = new Set(dragIndices)
    for (const idx of dragIndices) {
      if (segments[idx]?.isChapter === true) {
        for (let i = idx + 1; i < segments.length; i++) {
          if (segments[i]?.isChapter === true) break
          completed.add(i)
        }
      }
    }

    // Trier les indices dans l'ordre de la liste
    const sortedIndices = [...completed].sort((a, b) => a - b)

    const firstText = getSegmentText(segments[sortedIndices[0]])
    const count = sortedIndices.length
    const hasChapter = sortedIndices.some(i => segments[i]?.isChapter === true)
    const ghostText = count === 1
      ? firstText.slice(0, 60) + (firstText.length > 60 ? '…' : '')
      : `${hasChapter ? '📖 ' : ''}${firstText.slice(0, 40)}… (+${count - 1} segment${count > 2 ? 's' : ''})`

    const rowEl = rowRefs.current[index]
    const rowRect = rowEl ? rowEl.getBoundingClientRect() : { top: e.clientY, height: 40 }

    dragStateRef.current = {
      active: true,
      fromIndex: index,           // index de référence pour le placeholder
      sortedIndices,              // indices triés à déplacer
      blockSize: sortedIndices.length,
      startY: e.clientY,
      currentY: e.clientY,
      offsetY: e.clientY - rowRect.top,
      ghostText,
      ghostHeight: rowRect.height,
    }

    setIsDraggingSegment(true)
    setDragPlaceholderIndex(sortedIndices[0])
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }, [segments, selectedSegmentIndices, editingSegmentIndex, isAnyBlockDragging, isAnyVfxDragging])

  const handleSegmentDragMove = useCallback((e) => {
    const ds = dragStateRef.current
    if (!ds.active) return

    ds.currentY = e.clientY

    // Positionner le fantôme
    if (ghostRef.current) {
      ghostRef.current.style.top = `${e.clientY - ds.offsetY}px`
    }

    // Calculer le placeholder index en fonction de la position du curseur
    const scrollEl = scrollContainerRef.current
    if (!scrollEl) return

    // Auto-scroll si le fantôme approche des bords
    const scrollRect = scrollEl.getBoundingClientRect()
    const edgeSize = 80
    if (autoScrollRef.current) clearInterval(autoScrollRef.current)
    if (e.clientY < scrollRect.top + edgeSize) {
      autoScrollRef.current = setInterval(() => {
        scrollEl.scrollTop -= 8
      }, 16)
    } else if (e.clientY > scrollRect.bottom - edgeSize) {
      autoScrollRef.current = setInterval(() => {
        scrollEl.scrollTop += 8
      }, 16)
    }

    // Trouver la ligne sous le curseur pour calculer le placeholder
    let newPlaceholder = ds.fromIndex
    let cumulY = scrollEl.getBoundingClientRect().top - scrollEl.scrollTop

    const dragginDown = dragStateRef.current.currentY >= dragStateRef.current.startY
    for (let i = 0; i < segments.length; i++) {
      if (hiddenSegments.has(i)) continue
      const h = (rowHeights[i] || SEGMENT_HEIGHT) + 8
      // Seuil : milieu de la ligne, mais décalé vers le bas quand on drague vers le bas
      // pour éviter le "drop une ligne trop bas"
      const threshold = dragginDown ? cumulY + h * 0.65 : cumulY + h * 0.35
      if (e.clientY < threshold) {
        newPlaceholder = i
        break
      }
      cumulY += h
      newPlaceholder = i + 1
    }

    // Si c'est un drag de chapitre (Option A) : on ne peut déposer qu'entre chapitres
    if (segments[ds.fromIndex]?.isChapter === true) {
      // Trouver l'index chapitre le plus proche
      const chapterIndices = segments.reduce((acc, s, i) => {
        if (s?.isChapter === true) acc.push(i)
        return acc
      }, [])
      // Positions valides : avant chaque chapitre (sauf soi-même) + à la fin
      const validDrops = chapterIndices.filter(ci => ci !== ds.fromIndex)
      validDrops.push(segments.length) // fin de liste

      // Trouver le drop valide le plus proche
      let closest = validDrops[0] ?? ds.fromIndex
      let minDist = Infinity
      for (const ci of validDrops) {
        const dist = Math.abs(ci - newPlaceholder)
        if (dist < minDist) { minDist = dist; closest = ci }
      }
      newPlaceholder = closest
    }

    if (newPlaceholder !== dragPlaceholderIndex) {
      setDragPlaceholderIndex(newPlaceholder)
    }
  }, [segments, hiddenSegments, rowHeights, dragPlaceholderIndex])

  const handleSegmentDragEnd = useCallback(() => {
    const ds = dragStateRef.current
    if (!ds.active) return

    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current)
      autoScrollRef.current = null
    }

    const { sortedIndices } = ds
    const toIndex = dragPlaceholderIndex

    dragStateRef.current = { ...dragStateRef.current, active: false }
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    setIsDraggingSegment(false)
    setDragPlaceholderIndex(-1)

    // Drop dans sa propre zone → annuler
    const indicesSet = new Set(sortedIndices)
    const noMove = indicesSet.has(toIndex) || indicesSet.has(toIndex - 1)
    if (noMove) return

    const { newSegments, newSoundTracks } = reorderMultiple(sortedIndices, toIndex, segments, soundTracks)
    onSegmentsChange(newSegments)
    onSoundTracksChange(newSoundTracks)
    // Mettre à jour la sélection pour pointer vers les nouveaux indices
    const insertAt = toIndex > Math.max(...sortedIndices)
      ? toIndex - sortedIndices.length
      : toIndex
    const newSelected = new Set(
      sortedIndices.map((_, i) => insertAt + i)
    )
    setSelectedSegmentIndices(newSelected)
    if (onSaveToHistory) onSaveToHistory()
  }, [dragPlaceholderIndex, segments, soundTracks, onSegmentsChange, onSoundTracksChange, onSaveToHistory])
  // Callbacks stables par index pour ne pas invalider le memo des lignes
  const dragHandleMouseDownHandlers = useMemo(() =>
    segments.map((_, i) => (e) => handleSegmentDragStart(e, i)),
    [segments, handleSegmentDragStart]
  )

  // Attacher les listeners globaux pour le drag segment
  useEffect(() => {
    if (!isDraggingSegment) return
    const onMove = (e) => handleSegmentDragMove(e)
    const onUp   = ()  => handleSegmentDragEnd()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDraggingSegment, handleSegmentDragMove, handleSegmentDragEnd])

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
      {/* Barre de navigation "Aller à" */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        backgroundColor: '#f0f4ff',
        borderBottom: '1px solid #ddd',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {/* Indicateur presse-papiers */}
        {clipboardSize > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            backgroundColor: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            fontSize: '0.7rem',
            color: '#6366f1',
            fontWeight: 600,
            flexShrink: 0,
          }}>
            <span>📋</span>
            <span>{clipboardSize} segment{clipboardSize > 1 ? 's' : ''} copié{clipboardSize > 1 ? 's' : ''}</span>
            <button
              onClick={() => { clipboardRef.current = null; setClipboardSize(0) }}
              title="Vider le presse-papiers"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.65rem', color: '#6366f1', padding: '0 0 0 2px',
                lineHeight: 1,
              }}
            >✕</button>
          </div>
        )}
        {/* Input numéro de segment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number"
            min="1"
            max={segments.length}
            placeholder="--"
            value={gotoInput}
            onChange={e => setGotoInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const n = parseInt(gotoInput)
                if (n >= 1 && n <= segments.length) {
                  scrollToSegment(n - 1)
                  setGotoInput('')
                }
              }
            }}
            style={{
              width: '48px',
              padding: '3px 6px',
              fontSize: '0.8rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '0.78rem', color: '#888' }}>
            / {segments.length}
          </span>
          <button
            onClick={() => {
              const n = parseInt(gotoInput)
              if (n >= 1 && n <= segments.length) {
                scrollToSegment(n - 1)
                setGotoInput('')
              }
            }}
            style={{
              padding: '3px 8px',
              fontSize: '0.75rem',
              backgroundColor: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >↵</button>
        </div>

        {/* Séparateur */}
        <div style={{ width: '1px', height: '20px', backgroundColor: '#ddd', flexShrink: 0 }} />

        {/* Liste des chapitres cliquables */}
        <div style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
          flex: 1,
          alignItems: 'center',
        }}>
          {segments.reduce((acc, seg, i) => {
            if (seg?.isChapter) {
              const chapterText = getSegmentText(seg)
              const label = chapterText.length > 22
                ? chapterText.slice(0, 22) + '…'
                : chapterText || `Ch. ${i + 1}`
              acc.push(
                <button
                  key={i}
                  onClick={() => scrollToSegment(i)}
                  title={chapterText}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    backgroundColor: 'rgba(139,92,246,0.1)',
                    color: '#7C3AED',
                    border: '1px solid rgba(139,92,246,0.25)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                >
                  ★ {label}
                </button>
              )
            }
            return acc
          }, [])}
          {segments.filter(s => s?.isChapter).length === 0 && (
            <span style={{ fontSize: '0.72rem', color: '#bbb', fontStyle: 'italic' }}>
              Aucun chapitre défini
            </span>
          )}
        </div>
        {/* ── Master Volume ── */}
        {onMasterVolumeChange && (
          <>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#ddd', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.7rem', color: '#888', whiteSpace: 'nowrap' }}>🔊</span>
              <input
                type="range" min="0.3" max="1.5" step="0.05"
                value={masterVolume}
                onChange={e => onMasterVolumeChange(parseFloat(e.target.value))}
                style={{ width: '80px', accentColor: masterVolume < 0.95 ? '#f59e0b' : masterVolume > 1.05 ? '#ef4444' : '#17a2b8' }}
              />
              <span style={{
                fontSize: '0.72rem', fontWeight: 600, minWidth: '32px',
                color: masterVolume < 0.95 ? '#f59e0b' : masterVolume > 1.05 ? '#ef4444' : '#17a2b8',
              }}>
                {Math.round(masterVolume * 100)}%
              </span>
              {masterVolume !== 1.0 && (
                <button
                  onClick={() => onMasterVolumeChange(1.0)}
                  title="Réinitialiser à 100%"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: '#aaa', padding: '0' }}
                >↺</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Header colonnes */}
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

        {/* Partie Timeline du header — Audio + VFX côte à côte */}
        <div style={{
          flex: `0 0 calc(${100 - dividerPosition}% - 6px)`,
          padding: '0 0 0 1rem',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          overflow: 'hidden',
          gap: '0',
        }}>
          <span style={{ flex: 1 }}>Timeline Audio</span>
          <span style={{
            width: `${VFX_COLUMN_COUNT * VFX_COLUMN_WIDTH}px`,
            flexShrink: 0,
            fontSize: '0.8rem',
            color: '#888',
            borderLeft: '2px solid #e0e0e0',
            paddingLeft: '8px',
            textAlign: 'center',
          }}>VFX</span>
        </div>
      </div>

      {/* Zone scrollable + minimap */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

      {/* Contenu scrollable unifié */}
      <div 
        ref={scrollContainerRef}
        data-timeline-root="true"
        onMouseUp={handleTextSelection}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {segments.map((segment, index) => {
          const isChapter = segment?.isChapter === true
          const isHidden = hiddenSegments.has(index)
          const isCollapsed = collapsedChapters.has(index)

          // Placeholder avant ce segment
          const showPlaceholderBefore = isDraggingSegment && dragPlaceholderIndex === index
          const isBeingDragged = isDraggingSegment
            && dragStateRef.current.sortedIndices?.includes(index)
          const isSelected = selectedSegmentIndices.has(index)

          return (
            <div
              key={segment.id || segment._id || index}
              data-segment-index={index}
            >
              {/* Placeholder de drop AVANT ce segment */}
              {showPlaceholderBefore && (
                <div style={{
                  height: '3px',
                  margin: '2px 0',
                  backgroundColor: '#6366f1',
                  borderRadius: '2px',
                  boxShadow: '0 0 8px rgba(99,102,241,0.6)',
                  transition: 'opacity 0.1s ease',
                  animation: 'ili-placeholder-pulse 1s ease-in-out infinite',
                }} />
              )}
              {/* Indicateur de colle (Cmd+V) */}
              {pasteIndicator === index && (
                <div style={{
                  height: '3px',
                  margin: '2px 0',
                  backgroundColor: '#10b981',
                  borderRadius: '2px',
                  boxShadow: '0 0 8px rgba(16,185,129,0.7)',
                  animation: 'ili-placeholder-pulse 0.6s ease-in-out',
                }} />
              )}
             <div style={{
                maxHeight: isHidden ? '0px' : '2000px',
                opacity: isHidden ? 0 : isBeingDragged ? 0.35 : 1,
                overflow: 'visible',                 transition: isHidden
                  ? 'max-height 0.38s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
                  : 'opacity 0.15s ease',
                pointerEvents: isHidden ? 'none' : 'auto',
                transform: isBeingDragged ? 'scale(0.995)' : 'none',
              }}>
                <SegmentTimelineRow
                  {...{
                    segment, index,
                    rowRef: (el) => { rowRefs.current[index] = el },
                    rowHeight: rowHeights[index],
                    rowHeights,
                    isSelected,
                    onSelect: handleSelectSegment,
                    onEdit: handleStartEdit,
                    onEditChange: handleEditChange,
                    onEditBlur: handleEditBlur,
                    onEditKeyDown: handleEditKeyDown,
                    isPause: segment?.pause != null,
                    pauseDuration: segment?.pause ?? null,
                    onPauseDurationChange: (idx, ms, transition) => {
                      const updated = [...segments]
                      const seg = { ...updated[idx], pause: ms }
                      if (transition === null) {
                        delete seg.transition
                      } else if (transition !== undefined) {
                        seg.transition = transition
                      }
                      updated[idx] = seg
                      onSegmentsChange(updated)
                      if (onSaveToHistory) onSaveToHistory()
                    },
                    isEditing: editingSegmentIndex === index,
                    editText: editTexts[index] || '',
                    onSplitAtPosition: handleSplitSegment,
                    onAdd: handleAddSegment,
                    onDelete: handleDeleteSegment,
                    isCmdPressed,
                    hovered: hoveredRow === index,
                    onHover: setHoveredRow,
                    soundTracks,
                    segments,
                    soundLibrary,
                    selectedSoundIds,
                    editingSoundTrack,
                    onSoundSelect: handleSelectSound,
                    onSoundDoubleClick: handleDoubleClickSound,
                    onSoundColumnChange: handleColumnChange,
                    onSoundResize: handleResizeSound,
                    onSoundMove: handleMoveSound,
                    onSoundUpdate: handleUpdateSoundTrack,
                    onShowSoundTooltip: handleShowSoundTooltip,
                    onHideSoundTooltip: handleHideSoundTooltip,
                    onAddSoundToCell: handleDoubleClickEmptyCell,
                    dividerPosition,
                    isDraggingDivider,
                    onDividerMouseDown: handleDividerMouseDown,                    isAnyBlockDragging,
                    dragTargetCell,
                    onDragStart: handleSoundDragStart,
                    onDragEnd: handleSoundDragEnd,
                    onDragTargetChange: handleDragTargetChange,
                    onTextSelection: handleTextSelection,
                    vfxTracks,
                    selectedVfxIds,
                    editingVfxTrack,
                    onVfxSelect: handleSelectVfx,
                    onVfxDoubleClick: handleDoubleClickVfx,
                    onVfxColumnChange: handleVfxColumnChange,
                    onVfxResize: handleVfxResize,
                    onAddVfxToCell: handleAddVfxToCell,
                    isAnyVfxDragging,
                    vfxDragTarget,
                    onVfxDragStart: handleVfxDragStart,
                    onVfxDragEnd: handleVfxDragEnd,
                    onVfxDragTargetChange: handleVfxDragTargetChange,
                    isChapter: segment?.isChapter === true,
                    isCollapsed: collapsedChapters.has(index),
                    onToggleChapter: handleToggleChapter,
                    onToggleIsChapter: handleToggleIsChapter,
                    isLeader: segment?.isLeader === true,
                    isFinisher: finisherSegments.has(index),
                    onToggleIsLeader: handleToggleIsLeader,
                    onVfxUpdate: handleVfxUpdate,
                    // Handle drag
                    onDragHandleMouseDown: dragHandleMouseDownHandlers[index],
                    isDragging: isBeingDragged,
                    onGameMode: (idx) => setGameModePanel(idx),
                    onPreviewFromSegment,
                    seuilKeys,
                  }}
                />
                {index < segments.length - 1 && (
                  <SegmentSeparator
                    index={index}
                    onMerge={handleMergeSegments}
                    onInsertPause={handleInsertPause}
                    isHovered={hoveredSeparator}
                    onHover={setHoveredSeparator}
                  />
                )}
              </div>
            </div>
          )
        })}

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
        {/* Placeholder en fin de liste */}
        {isDraggingSegment && dragPlaceholderIndex >= segments.length && (
          <div style={{
            height: '3px',
            margin: '2px 8px',
            backgroundColor: '#6366f1',
            borderRadius: '2px',
            boxShadow: '0 0 8px rgba(99,102,241,0.6)',
          }} />
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
            onClick={(e) => {
              // Ne pas fermer si le picker de son est ouvert (il gère son propre overlay)
              if (e.target.closest('[data-sound-picker]')) return
              closePanel()
            }}
          />
          <SoundBlockPanel
            soundTrack={selectedSoundTrack}
            sound={selectedSound}
            segments={segments}
            soundLibrary={soundLibrary}
            adminPassword={adminPassword}
            onSave={handleSaveSoundTrack}
            onRealTimeUpdate={handleRealTimeUpdate}
            onClose={closePanel}
            onDelete={handleDeleteSoundTrack}
            onSoundsImported={onSoundsImported}
            onSoundReplace={(updatedTrack) => {
              handleSaveSoundTrack(updatedTrack)
              setEditingSoundTrack(updatedTrack)
            }}
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
          adminPassword={adminPassword}
          onSoundsImported={(newSounds) => {
            if (!newSounds?.length) return
            const urlMap = {}
            const deletedIds = new Set()
            newSounds.forEach(s => {
              if (s.id && s.url) urlMap[s.id] = s.url
              if (s.id && s.url === null) deletedIds.add(s.id)
            })
            // Si c'est une suppression, on notifie le parent et on arrête — pas de création de track
            if (deletedIds.size > 0) {
              if (onSoundsImported) onSoundsImported(newSounds)
              return
            }
            // 1. Mettre à jour la soundLibrary côté AdminPage
            if (onSoundsImported) onSoundsImported(newSounds)
            // 2. Patch des tracks cassés (URL retrouvée) + attacher le PREMIER son
            //    importé au segment/colonne ciblé par le picker (création d'un nouveau bloc)
            const { segmentIndex, column } = showSoundPicker || {}
            const seg = segmentIndex !== undefined ? segments[segmentIndex] : null
            const segId = seg?.id || seg?._id || (segmentIndex !== undefined ? `seg_${segmentIndex}` : null)
            const firstImported = newSounds[0]
            onSoundTracksChange(prev => {
              const patched = prev.map(track => {
                if (!urlMap[track.soundId]) return track
                const { broken, ...rest } = track
                return { ...rest, muted: false }
              })
              if (segId && firstImported) {
                const alreadyExists = patched.some(
                  t => t.soundId === firstImported.id && t.startSegmentId === segId && !t.broken
                )
                if (!alreadyExists) {
                  patched.push({
                    id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    soundId: firstImported.id,
                    startSegmentId: segId,
                    endSegmentId: segId,
                    column: column ?? 0,
                    volume: 0.5,
                    fadeIn: 0,
                    fadeOut: 0,
                    delay: 0,
                    loop: firstImported.loop || false,
                    muted: false,
                  })
                }
              }
              return patched
            })
            if (onSaveToHistory) onSaveToHistory()
            setShowSoundPicker(false)
          }}
          onAddSound={(soundData) => {
            // Si un track grisé (broken) avec ce soundId existe déjà sur ce segment,
            // on le dé-grise plutôt que d'en créer un doublon
            const existingBrokenIdx = soundTracks.findIndex(
              t => t.soundId === soundData.soundId &&
                   t.broken === true &&
                   t.startSegmentId === soundData.startSegmentId
            )
            let updatedTracks
            if (existingBrokenIdx !== -1) {
              updatedTracks = soundTracks.map((t, i) => {
                if (i !== existingBrokenIdx) return t
                const { broken, ...rest } = t
                return { ...rest, muted: false, column: soundData.column ?? t.column }
              })
            } else {
              const newTrack = {
                id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...soundData
              }
              updatedTracks = [...soundTracks, newTrack]
            }
            onSoundTracksChange(updatedTracks)
            if (onSaveToHistory) onSaveToHistory()
            setShowSoundPicker(false)
          }}
          onClose={() => setShowSoundPicker(false)}
        />
      )}
      {/* Panel VFX */}
      {editingVfxTrack && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1000 }}
            onClick={() => setEditingVfxTrack(null)}
          />
          <VfxBlockPanel
            vfxTrack={editingVfxTrack}
            segments={segments}
            onSave={handleSaveVfxTrack}
            onClose={() => setEditingVfxTrack(null)}
            onDelete={handleDeleteVfxTrack}
            onRealTimeUpdate={(updated) => {
              if (onVfxTracksChange) onVfxTracksChange(vfxTracks.map(t => t.id === updated.id ? updated : t))
            }}
          />
        </>
      )}
      {/* Toolbar de formatage flottant */}
      {formatToolbar && (
        <FormatToolbar
          position={{
            ...formatToolbar.position,
            left: Math.min(formatToolbar.position.left, window.innerWidth - splitViewOffset - 80),
          }}
          onFormat={handleFormat}
          onFontChange={handleFontChange}
          currentFont={
            formatToolbar.segmentIndex !== null
              ? segments[formatToolbar.segmentIndex]?.fontFamily || ''
              : ''
          }
          currentSegment={
            formatToolbar.segmentIndex !== null
              ? segments[formatToolbar.segmentIndex]
              : null
          }
          onClose={() => setFormatToolbar(null)}
        />
      )}
      {/* ── Fantôme de drag segment ── */}
      {isDraggingSegment && (
        <div
          ref={ghostRef}
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            top: 0, // sera mis à jour par handleSegmentDragMove via ref
            zIndex: 9999,
            pointerEvents: 'none',
            minWidth: '320px',
            maxWidth: '600px',
            backgroundColor: '#fff',
            border: '2px solid #6366f1',
            borderRadius: '10px',
            boxShadow: '0 16px 48px rgba(99,102,241,0.25), 0 4px 12px rgba(0,0,0,0.12)',
            padding: '0.6rem 1rem',
            fontSize: '0.85rem',
            color: '#333',
            lineHeight: '1.4',
            opacity: 0.96,
            backdropFilter: 'blur(4px)',
            transition: 'box-shadow 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>
            {segments[dragStateRef.current.fromIndex]?.isChapter ? '📖' : '⠿'}
          </span>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {dragStateRef.current.ghostText}
          </span>
        </div>
      )}
      <style>{`
          @keyframes ili-placeholder-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>{/* fin scroll */}

      {/* ── Minimap ── */}
      {(() => {
        // Construire la liste des points d'intérêt (chapitres + leaders)
        const total = segments.length
        if (total === 0) return null

        const points = segments.reduce((acc, seg, i) => {
          if (seg?.isChapter || seg?.isLeader) {
            acc.push({
              index: i,
              isChapter: seg.isChapter === true,
              isLeader: seg.isLeader === true && seg.isChapter !== true,
              label: getSegmentText(seg).slice(0, 18) || `Seg. ${i + 1}`,
            })
          }
          return acc
        }, [])

        const MINIMAP_H = 'calc(100% - 0px)'
        const DOT_H = 6

        return (
          <div
            style={{
              width: '28px',
              flexShrink: 0,
              position: 'relative',
              backgroundColor: '#f8f9fa',
              borderLeft: '1px solid #e8e8e8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              userSelect: 'none',
            }}
            onMouseLeave={() => setMinimapHovered(null)}
          >
            {/* Curseur de position actuelle */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#6366f1',
                top: `calc(${scrollRatio * 100}% - 1px)`,
                transition: 'top 0.1s ease',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />

            {/* Points d'intérêt */}
            {points.map(pt => {
              const topPct = (pt.index / Math.max(total - 1, 1)) * 100
              const isHov = minimapHovered === pt.index
              return (
                <div
                  key={pt.index}
                  onClick={() => scrollToSegment(pt.index)}
                  onMouseEnter={() => setMinimapHovered(pt.index)}
                  style={{
                    position: 'absolute',
                    top: `calc(${topPct}% - ${DOT_H / 2}px)`,
                    left: '4px',
                    right: '4px',
                    height: `${DOT_H}px`,
                    backgroundColor: pt.isChapter ? '#8B5CF6' : '#F97316',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease, opacity 0.1s ease',
                    transform: isHov ? 'scaleX(1.15)' : 'scaleX(1)',
                    opacity: isHov ? 1 : 0.65,
                    zIndex: 1,
                  }}
                />
              )
            })}

            {/* Tooltip au survol */}
            {minimapHovered !== null && (() => {
              const pt = points.find(p => p.index === minimapHovered)
              if (!pt) return null
              const topPct = (pt.index / Math.max(total - 1, 1)) * 100
              return (
                <div
                  style={{
                    position: 'absolute',
                    right: '32px',
                    top: `calc(${topPct}% - 12px)`,
                    backgroundColor: '#1a1a2e',
                    color: '#fff',
                    fontSize: '0.68rem',
                    padding: '3px 7px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 10,
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span style={{ color: pt.isChapter ? '#c4b5fd' : '#fdba74' }}>
                    {pt.isChapter ? '★' : '◆'}
                  </span>
                  {' '}{pt.index + 1}. {pt.label}
                </div>
              )
            })()}
          </div>
        )
      })()}

      { /* fin zone scrollable + minimap */}

      {gameModePanel !== null && (
        <GameModePanel
          segment={segments[gameModePanel]}
          segmentIndex={gameModePanel}
          parts={parts || []}
          onSave={(idx, gameMode) => {
            const updated = [...segments]
            updated[idx] = { ...updated[idx], gameMode }
            onSegmentsChange(updated)
            if (onSaveToHistory) onSaveToHistory()
          }}
          onDelete={(idx) => {
            const updated = [...segments]
            const { gameMode, ...rest } = updated[idx]
            updated[idx] = rest
            onSegmentsChange(updated)
            if (onSaveToHistory) onSaveToHistory()
          }}
          onClose={() => setGameModePanel(null)}
        />
      )}
    </div>
  )
}

// ─── Réorganisation des segments avec gestion des soundTracks ───────────────
function reorderSegments(fromIndex, toIndex, segments, soundTracks) {
  if (fromIndex === toIndex) return { newSegments: segments, newSoundTracks: soundTracks }

  // 1. Identifier le bloc à déplacer
  // Si le segment source est un chapitre, on prend tout son contenu jusqu'au prochain chapitre
  const isChapterDrag = segments[fromIndex]?.isChapter === true
  let blockEnd = fromIndex
  if (isChapterDrag) {
    for (let i = fromIndex + 1; i < segments.length; i++) {
      if (segments[i]?.isChapter === true) break
      blockEnd = i
    }
  }
  const blockSize = blockEnd - fromIndex + 1
  const block = segments.slice(fromIndex, fromIndex + blockSize)
  const movedIds = new Set(block.map(s => s.id || s._id).filter(Boolean))

  // 2. Construire newSegments
  const withoutBlock = [
    ...segments.slice(0, fromIndex),
    ...segments.slice(fromIndex + blockSize)
  ]
  // toIndex est un index d'insertion sur la liste originale (0 = avant le segment 0,
  // N = après le segment N-1). On le convertit en index d'insertion sur withoutBlock.
  // Si on drag vers le bas, les éléments du bloc ont disparu avant toIndex → décaler.
  const insertAt = toIndex > fromIndex
    ? toIndex - blockSize   // les blockSize éléments supprimés étaient avant toIndex
    : toIndex               // drag vers le haut : pas de décalage
  const clampedInsert = Math.max(0, Math.min(insertAt, withoutBlock.length))
  const newSegments = [
    ...withoutBlock.slice(0, clampedInsert),
    ...block,
    ...withoutBlock.slice(clampedInsert)
  ]

  // 3. Recalculer les soundTracks
  // Helper : index d'un segmentId dans une liste de segments
  const idxIn = (list, id) => list.findIndex(s => (s.id || s._id) === id)

  const newSoundTracks = []
  const toClone = [] // tracks à cloner (start=end=movedId) pour le cas scission

  for (const track of soundTracks) {
    const { startSegmentId, endSegmentId } = track
    const oldStart = idxIn(segments, startSegmentId)
    const oldEnd   = idxIn(segments, endSegmentId)

    // Nombre de segments déplacés appartenant à ce track
    const movedInTrack = block.filter(s => {
      const sid = s.id || s._id
      return sid && oldStart !== -1 && oldEnd !== -1
        && idxIn(segments, sid) >= oldStart
        && idxIn(segments, sid) <= oldEnd
    })

    const trackTouchesBlock = movedInTrack.length > 0
    const trackIsOnlyBlock  = movedInTrack.length === (oldEnd - oldStart + 1)
      && movedIds.has(startSegmentId) && movedIds.has(endSegmentId)

    if (!trackTouchesBlock) {
      // Cas 3 : aucun rapport → inchangé
      newSoundTracks.push(track)
      continue
    }

    if (trackIsOnlyBlock) {
      // Cas 1 : track entièrement sur le bloc déplacé → suit automatiquement
      newSoundTracks.push(track)
      continue
    }

    // Cas 2 : track étalée qui contenait une partie du bloc → on garde la track originale
    // (ses ids start/end pointent toujours sur les bons segments, le bloc n'est plus entre eux)
    newSoundTracks.push(track)

    // + on clone une track pour chaque segment déplacé qui était dans le span
    for (const seg of movedInTrack) {
      const sid = seg.id || seg._id
      if (!sid) continue
      toClone.push({
        ...track,
        id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startSegmentId: sid,
        endSegmentId: sid,
      })
    }
  }

  // Ajouter les clones
  newSoundTracks.push(...toClone)

  // Cas 4 : le segment atterrit entre deux segments d'une même track → gratuit,
  // les SoundBlocks se basent sur les indices dans newSegments, inclusion automatique.

  return { newSegments, newSoundTracks }
}

// ─── Réorganisation multi-sélection avec gestion des soundTracks ─────────────
function reorderMultiple(sortedIndices, toIndex, segments, soundTracks) {
  const indicesSet = new Set(sortedIndices)
  const block = sortedIndices.map(i => segments[i])
  const movedIds = new Set(block.map(s => s.id || s._id).filter(Boolean))

  // Liste sans les segments déplacés
  const withoutBlock = segments.filter((_, i) => !indicesSet.has(i))

  // Calculer l'index d'insertion dans withoutBlock
  // toIndex est exprimé sur la liste originale
  // On compte combien d'indices sélectionnés sont AVANT toIndex
  const countBefore = sortedIndices.filter(i => i < toIndex).length
  const insertAt = Math.max(0, Math.min(toIndex - countBefore, withoutBlock.length))

  const newSegments = [
    ...withoutBlock.slice(0, insertAt),
    ...block,
    ...withoutBlock.slice(insertAt),
  ]

  // Recalculer les soundTracks
  const idxIn = (list, id) => list.findIndex(s => (s.id || s._id) === id)

  const newSoundTracks = []
  const toClone = []

  for (const track of soundTracks) {
    const { startSegmentId, endSegmentId } = track
    const oldStart = idxIn(segments, startSegmentId)
    const oldEnd   = idxIn(segments, endSegmentId)
    if (oldStart === -1 || oldEnd === -1) { newSoundTracks.push(track); continue }

    const movedInTrack = block.filter(s => {
      const sid = s.id || s._id
      if (!sid) return false
      const si = idxIn(segments, sid)
      return si >= oldStart && si <= oldEnd
    })

    const trackTouchesBlock  = movedInTrack.length > 0
    const trackIsOnlyBlock   = movedIds.has(startSegmentId) && movedIds.has(endSegmentId)
      && movedInTrack.length === (oldEnd - oldStart + 1)

    if (!trackTouchesBlock || trackIsOnlyBlock) {
      newSoundTracks.push(track)
      continue
    }

    // Track partielle : garder l'original + cloner pour chaque segment déplacé
    newSoundTracks.push(track)
    for (const seg of movedInTrack) {
      const sid = seg.id || seg._id
      if (!sid) continue
      toClone.push({
        ...track,
        id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startSegmentId: sid,
        endSegmentId: sid,
      })
    }
  }

  newSoundTracks.push(...toClone)
  return { newSegments, newSoundTracks }
}

export default UnifiedSegmentsTimeline
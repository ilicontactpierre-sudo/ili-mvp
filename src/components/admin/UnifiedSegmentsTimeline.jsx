import { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react'
import SoundBlock from './SoundBlock'
import SoundBlockPanel from './SoundBlockPanel'
import SoundLibraryPicker from './SoundLibraryPicker'
import { SEGMENT_HEIGHT, COLUMN_COUNT, COLUMN_WIDTH, VFX_COLUMN_COUNT, VFX_COLUMN_WIDTH, VFX_TYPES, VFX_COLORS, createVfxTrack } from './constants'
import VfxBlock from './VfxBlock'
import VfxBlockPanel from './VfxBlockPanel'
import FormatToolbar from './FormatToolbar'
import GameModePanel from './GameModePanel'
import { renderMarkdown } from '../../utils/renderMarkdown'

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
  onSoundUpdate,
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
}) {
  console.log('segment', index, segment)
  const containerRef = useRef(null)
  const textareaRef = useRef(null)

  const text = getSegmentText(segment)
  
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
        {/* Handle drag ⠿ */}
        <div
          onMouseDown={onDragHandleMouseDown}
          title="Déplacer ce segment"
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            padding: '0 2px',
            fontSize: '0.75rem',
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
      {/* Étoile : bascule le statut chapitre */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleIsChapter(index) }}
          title={isChapter ? 'Retirer le statut chapitre' : 'Marquer comme chapitre'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 1px',
            fontSize: '0.65rem',
            lineHeight: 1,
            color: isChapter ? '#8B5CF6' : 'rgba(0,0,0,0.18)',
            flexShrink: 0,
            transition: 'color 0.2s ease',
            alignSelf: 'flex-start',
            marginTop: '3px',
          }}

        >
          {isChapter ? '★' : '☆'}
        </button>

        {/* Losange : bascule le statut leader */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleIsLeader(index) }}
          title={isLeader ? 'Retirer le statut leader' : 'Marquer comme leader (nouvelle séquence)'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 1px',
            fontSize: '0.6rem',
            lineHeight: 1,
            color: isLeader ? '#F97316' : 'rgba(0,0,0,0.18)',
            flexShrink: 0,
            transition: 'color 0.2s ease',
            alignSelf: 'flex-start',
            marginTop: '3px',
          }}

        >
          {isLeader ? '◆' : '◇'}
        </button>

      {/* Boutons d'action — sous l'étoile et le losange */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        flexShrink: 0,
        alignItems: 'center',
        marginTop: '2px',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(index); }}
          title="Ajouter un segment après"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 1px',
            fontSize: '0.65rem',
            lineHeight: 1,
            color: (hovered || isSelected) ? '#4CAF50' : 'rgba(0,0,0,0.12)',
            flexShrink: 0,
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
          }}
        >
          ＋
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          title="Supprimer le segment"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 1px',
            fontSize: '0.6rem',
            lineHeight: 1,
            color: (hovered || isSelected) ? '#f44336' : 'rgba(0,0,0,0.12)',
            flexShrink: 0,
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
          }}
        >
          ✕
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onGameMode(index); }}
          title={segment?.gameMode ? 'Modifier la gamification' : 'Ajouter une gamification'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 1px',
            fontSize: '0.6rem',
            lineHeight: 1,
            color: segment?.gameMode
              ? '#a78bfa'
              : (hovered || isSelected) ? 'rgba(167,139,250,0.5)' : 'rgba(0,0,0,0.12)',
            flexShrink: 0,
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
          }}
        >
          🎮
        </button>
      </div>
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 1px',
            fontSize: '0.65rem',
            lineHeight: 1,
            color: (hovered || isSelected) ? '#4CAF50' : 'rgba(0,0,0,0.12)',
            flexShrink: 0,
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
          }}
        >
          ＋
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          title="Supprimer le segment"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 1px',
            fontSize: '0.6rem',
            lineHeight: 1,
            color: (hovered || isSelected) ? '#f44336' : 'rgba(0,0,0,0.12)',
            flexShrink: 0,
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
          }}
        >
          ✕
        </button>
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
            <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => onEditChange(index, e.target.value)}
                onBlur={() => onEditBlur(index)}
                onKeyDown={(e) => onEditKeyDown(index, e)}
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
          ) : (
            <span ref={textContentRef} style={{ display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', lineHeight: '1.4', fontSize: '0.85rem', height: 'auto' }}>
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
            isSelected={selectedSoundIds.has(track.id) || track.id === editingSoundTrack?.id}            onSelect={onSoundSelect}
            onDoubleClick={onSoundDoubleClick}
            onColumnChange={onSoundColumnChange}
            onResize={onSoundResize}
            onUpdate={onSoundUpdate}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragTargetChange={onDragTargetChange}
            currentSegmentIndex={index}
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
  vfxTracks = [],
  onSegmentsChange,
  onSoundTracksChange,
  onVfxTracksChange,
  onSaveToHistory,
  adminPassword,        
  onSoundsImported
}) {
  const [selectedSoundIds, setSelectedSoundIds] = useState(new Set())
  const [editingSoundTrack, setEditingSoundTrack] = useState(null)
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  // Sélection multiple de segments
  const [selectedSegmentIndices, setSelectedSegmentIndices] = useState(new Set())
  const selectionAnchorRef = useRef(null) // dernière ancre pour Shift+clic
  const [hoveredRow, setHoveredRow] = useState(null)
  const [hoveredSeparator, setHoveredSeparator] = useState(null)
  const [isCmdPressed, setIsCmdPressed] = useState(false)
  const [dividerPosition, setDividerPosition] = useState(52)
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)
  const [editingSegmentIndex, setEditingSegmentIndex] = useState(null)
  const [editTexts, setEditTexts] = useState({})
  const [measuredRowHeights, setMeasuredRowHeights] = useState([])
  const [isAnyBlockDragging, setIsAnyBlockDragging] = useState(false)
  const [dragTargetCell, setDragTargetCell] = useState({ segmentIndex: -1, column: -1 })
  // ── États VFX ──────────────────────────────────────────────
  const [selectedVfxIds, setSelectedVfxIds]     = useState(new Set())
  const [editingVfxTrack, setEditingVfxTrack]   = useState(null)
  const [isAnyVfxDragging, setIsAnyVfxDragging] = useState(false)
  const [vfxDragTarget, setVfxDragTarget] = useState({ segmentIndex: -1, column: -1 })

  // ── Chapitres ──────────────────────────────────────────────
  const [collapsedChapters, setCollapsedChapters] = useState(new Set())

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
  const dividerRef = useRef(null)
  const rowRefs = useRef([])

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
    // Si le segment a un breakAt, on l'injecte comme vrai saut de ligne
    // pour que l'utilisateur puisse le voir et le modifier
    let editValue = getSegmentText(segment)
    if (segment && typeof segment === 'object' && segment.breakAt != null) {
      const before = editValue.slice(0, segment.breakAt).trimEnd()
      const after = editValue.slice(segment.breakAt).trimStart()
      editValue = before + '\n\n' + after
    }
    setEditTexts(prev => ({
      ...prev,
      [index]: editValue
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
    if (newText !== undefined) {
      // Détecter si l'utilisateur a conservé ou inséré un double saut de ligne
      // et le convertir en breakAt pour l'affichage
      const doubleBreakMatch = newText.match(/^([\s\S]*?)\n\n([\s\S]*)$/)
      let cleanText, breakAt
      if (doubleBreakMatch) {
        cleanText = doubleBreakMatch[1].trimEnd() + ' ' + doubleBreakMatch[2].trimStart()
        breakAt = doubleBreakMatch[1].trimEnd().length + 1 // +1 pour l'espace
      } else {
        cleanText = newText
        breakAt = null
      }
      const updatedSegments = [...segments]
      updatedSegments[index] = typeof segments[index] === 'string'
        ? cleanText
        : { ...segments[index], text: cleanText, breakAt }
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
    const segmentToDelete = segments[index]
    const segId = segmentToDelete.id || segmentToDelete._id
    
    const updatedSegments = [...segments]
    updatedSegments.splice(index, 1)

    // Nettoyer les soundTracks qui référencent ce segment
    const updatedTracks = soundTracks
      .filter(track => track.startSegmentId !== segId)
      .map(track => ({
        ...track,
        endSegmentId: track.endSegmentId === segId
          ? (updatedSegments[index] ? (updatedSegments[index].id || updatedSegments[index]._id) : track.startSegmentId)
          : track.endSegmentId
      }))

    // Nettoyer les vfxTracks qui référencent ce segment
    const updatedVfxTracks = (vfxTracks || [])
      .filter(track => track.startSegmentId !== segId)
      .map(track => ({
        ...track,
        endSegmentId: track.endSegmentId === segId
          ? (updatedSegments[index] ? (updatedSegments[index].id || updatedSegments[index]._id) : track.startSegmentId)
          : track.endSegmentId
      }))

    onSegmentsChange(updatedSegments)
    onSoundTracksChange(updatedTracks)
    if (onVfxTracksChange) onVfxTracksChange(updatedVfxTracks)
    if (onSaveToHistory) onSaveToHistory()
  }, [segments, soundTracks, onSegmentsChange, onSoundTracksChange, onSaveToHistory])

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
      // Si la cible est un chapitre, étendre jusqu'à son dernier enfant
      let rangeTo = to
      if (segments[to]?.isChapter === true) {
        for (let i = to + 1; i < segments.length; i++) {
          if (segments[i]?.isChapter === true) break
          rangeTo = i
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
    setFormatToolbar({
      mode: 'segment',
      position: { top: rect.top, left: rect.left + rect.width / 2 },
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
        setFormatToolbar({
          mode: 'selection',
          position: { top: rect.top, left: rect.left + rect.width / 2 },
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
    setFormatToolbar({
      mode: 'selection',
      position: { top: rect.top, left: rect.left + rect.width / 2 },
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

  const handleResizeSound = useCallback((soundId, newStartSegmentId, newEndSegmentId) => {
    console.log('handleResizeSound called:', { soundId, newStartSegmentId, newEndSegmentId })
    const updatedTracks = soundTracks.map(track => {
      if (track.id !== soundId) return track
      return {
        ...track,
        ...(newStartSegmentId && { startSegmentId: newStartSegmentId }),
        ...(newEndSegmentId && { endSegmentId: newEndSegmentId })
      }
    })
    console.log('Updated tracks:', updatedTracks)
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
  }, [selectedSoundIds, selectedVfxIds, handleDeleteSoundTrack, handleDeleteVfxTrack])

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

  useLayoutEffect(() => {
    const heights = segments.map((_, index) => {
      if (hiddenSegments.has(index)) {
        // Segment caché : conserver la hauteur précédente ou estimer
        return measuredRowHeights[index] || estimatedRowHeights[index] || SEGMENT_HEIGHT
      }
      const row = rowRefs.current[index]
      return row ? Math.max(SEGMENT_HEIGHT, Math.ceil(row.getBoundingClientRect().height)) : SEGMENT_HEIGHT
    })
    const rowsChanged = heights.length !== measuredRowHeights.length || heights.some((height, idx) => height !== measuredRowHeights[idx])
    if (rowsChanged) {
      setMeasuredRowHeights(heights)
    }
  }, [segments, editTexts, dividerPosition, editingSegmentIndex, selectedSegmentIndices, soundTracks.length, hiddenSegments])
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
                    isEditing: editingSegmentIndex === index,
                    editText: editTexts[index] || '',
                    onSplitAtPosition: handleSplitSegment,
                    onAdd: handleAddSegment,
                    onDelete: handleDeleteSegment,
                    isCmdPressed,
                    hovered: hoveredRow === index,
                    onHover: (idx) => setHoveredRow(idx),
                    soundTracks,
                    segments,
                    soundLibrary,
                    selectedSoundIds,
                    editingSoundTrack,
                    onSoundSelect: handleSelectSound,
                    onSoundDoubleClick: handleDoubleClickSound,
                    onSoundColumnChange: handleColumnChange,
                    onSoundResize: handleResizeSound,
                    onSoundUpdate: handleUpdateSoundTrack,
                    onAddSoundToCell: handleDoubleClickEmptyCell,
                    dividerPosition,
                    isDraggingDivider,
                    onDividerMouseDown: () => setIsDraggingDivider(true),
                    isAnyBlockDragging,
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
                    onDragHandleMouseDown: (e) => handleSegmentDragStart(e, index),
                    isDragging: isBeingDragged,
                  }}
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
            onSoundReplace={(updatedTrack) => {
              handleSaveSoundTrack(updatedTrack)
              // Mettre à jour editingSoundTrack pour que le panel reflète le nouveau son
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
            if (onSoundsImported) onSoundsImported(newSounds)
          }}
          onAddSound={(soundData) => {
            console.log('onAddSound called with soundData:', soundData)
            console.log('showSoundPicker was:', showSoundPicker)
            const newTrack = {
              id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
          position={formatToolbar.position}
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
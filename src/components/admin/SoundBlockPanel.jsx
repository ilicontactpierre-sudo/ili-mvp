import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CATEGORY_COLORS } from './constants'
import WaveformTrimmer from './WaveformTrimmer'
import SoundLibraryPicker from './SoundLibraryPicker'

// Fonction pour obtenir une couleur de son
function getSoundColor(sound) {
  if (!sound) return '#ccc'
  const categories = sound.categories || []
  for (const cat of categories) {
    if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat]
  }
  return CATEGORY_COLORS['Autre']
}

function SoundBlockPanel({ 
  soundTrack, 
  sound, 
  segments,
  soundLibrary,
  adminPassword,
  onSave, 
  onRealTimeUpdate,
  onClose,
  onDelete,
  onSoundReplace,
  onSoundsImported,
}) {
  const [editedTrack, setEditedTrack] = useState({ ...soundTrack })
  const [showDelayInput, setShowDelayInput] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showTrimmer, setShowTrimmer] = useState(false)
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  const [pickerInitialSearch, setPickerInitialSearch] = useState('')
  // Texte brut des champs segment début/fin — découplé du calcul d'index,
  // pour ne jamais écraser ce que l'utilisateur est en train de taper.
  const [startSegText, setStartSegText] = useState('')
  const [endSegText, setEndSegText] = useState('')
  const panelRef = useRef(null)
  const animationRef = useRef(null)
  const color = getSoundColor(sound)

  useEffect(() => {
    setEditedTrack({ ...soundTrack })
    setShowDeleteConfirm(false)
    setShowDelayInput(false)
    // Resynchroniser le texte affiché des champs segment début/fin
    const findIdx = (id) => {
      if (!id) return -1
      const idx = segments.findIndex(s => s.id === id || s._id === id)
      if (idx !== -1) return idx
      const match = id?.match(/^seg(?:ment)?_(\d+)$/)
      if (match) {
        const i = parseInt(match[1], 10)
        if (i >= 0 && i < segments.length) return i
      }
      return -1
    }
    const sIdx = findIdx(soundTrack.startSegmentId)
    const eIdx = findIdx(soundTrack.endSegmentId)
    setStartSegText(sIdx >= 0 ? String(sIdx + 1) : '')
    setEndSegText(eIdx >= 0 ? String(eIdx + 1) : (sIdx >= 0 ? String(sIdx + 1) : ''))
  }, [soundTrack, segments])

  // Animation de rotation pour loop
  useEffect(() => {
    if (editedTrack.loop) {
      setIsAnimating(true)
    } else {
      setIsAnimating(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [editedTrack.loop])

  // Fermer si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSoundPicker) return
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, showSoundPicker])

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showSoundPicker) {
          setShowSoundPicker(false)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showSoundPicker])

  const handleChange = useCallback((field, value) => {
    setEditedTrack(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const handleClose = useCallback(() => {
    // Sauvegarde finale si nécessaire
    if (onSave) {
      onSave(editedTrack)
    }
    onClose()
  }, [editedTrack, onSave, onClose])

  const handleDelete = useCallback(() => {
    if (showDeleteConfirm) {
      onDelete(soundTrack.id)
      onClose()
    } else {
      setShowDeleteConfirm(true)
    }
  }, [showDeleteConfirm, onDelete, soundTrack.id, onClose])

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false)
  }, [])

  // Trouver les indexes des segments
  const getSegmentIndex = useCallback((segmentId) => {
    if (!segmentId) return -1
    const idx = segments.findIndex(s => s.id === segmentId || s._id === segmentId)
    if (idx !== -1) return idx
    
    // Fallback: si segmentId est au format "segment_N" ou "seg_N", utiliser N comme index
    const match = segmentId?.match(/^seg(?:ment)?_(\d+)$/)
    if (match) {
      const index = parseInt(match[1], 10)
      if (index >= 0 && index < segments.length) return index
    }
    
    return -1
  }, [segments])

  const startSegmentIndex = getSegmentIndex(editedTrack.startSegmentId)
  const endSegmentIndex = getSegmentIndex(editedTrack.endSegmentId)

  // (supprimé — volume maintenant horizontal)

  return (
    <div 
      ref={panelRef}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(20,20,20,0.97)',
        borderRadius: '12px',
        padding: '1.5rem',
        minWidth: '280px',
        maxWidth: '340px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: `1px solid ${color}40`,
        zIndex: 1001,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#fff'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: `1px solid ${color}30`
      }}>
        <h3
          onClick={() => { setPickerInitialSearch(''); setShowSoundPicker(true) }}
              title="Cliquer pour changer le son"
          style={{
            margin: 0,
            fontSize: '1rem',
            color: color,
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'underline dotted',
            textUnderlineOffset: '3px',
          }}
        >
          {sound ? sound.label.substring(0, 30) : soundTrack.soundId}
          <span style={{ fontSize: '0.7rem', marginLeft: '0.4rem', opacity: 0.6 }}>✎</span>
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: '#666',
            padding: '0.25rem',
            lineHeight: 1,
            transition: 'color 0.15s'
          }}
          onMouseEnter={(e) => e.target.style.color = '#fff'}
          onMouseLeave={(e) => e.target.style.color = '#666'}
        >
          ✕
        </button>
      </div>

      {/* Info du son */}
      {sound && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '0.5rem 0.75rem', 
          backgroundColor: 'rgba(255,255,255,0.05)', 
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#aaa'
        }}>
          <div style={{ marginBottom: '0.25rem' }}>
            {sound.categories?.length > 0 && (
              <span style={{ color }}>{sound.categories.join(', ')}</span>
            )}
            {sound.duration > 0 ? ` • ${sound.duration}s` : ' • Durée inconnue'}
            {sound.loop && ' • 🔁'}
          </div>
          {sound.tags?.length > 0 && (
            <div style={{ color: '#888' }}>{sound.tags.slice(0, 5).join(', ')}</div>
          )}
        </div>
      )}
      {/* Note d'orchestration Claude */}
      {soundTrack._orchestrationNote && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'rgba(79,70,229,0.08)',
          border: '1px solid rgba(79,70,229,0.2)',
          borderRadius: '6px',
          fontSize: '0.73rem',
          color: 'rgba(200,200,255,0.75)',
          lineHeight: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
        }}>
          <div style={{ opacity: 0.55, fontSize: '0.65rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Note Claude
          </div>
          <div style={{ fontStyle: 'italic' }}>
            {soundTrack._orchestrationNote}
          </div>
          {soundTrack._orchestrationKeyword && (
            <button
              onClick={() => {
                setPickerInitialSearch(soundTrack._orchestrationKeyword || '')
                setShowSoundPicker(true)
              }}
              title="Rechercher avec ce keyword"
              style={{
                alignSelf: 'flex-start',
                marginTop: '0.1rem',
                padding: '0.2rem 0.55rem',
                fontSize: '0.68rem',
                background: 'rgba(79,70,229,0.2)',
                border: '1px solid rgba(79,70,229,0.35)',
                borderRadius: '4px',
                color: 'rgba(180,180,255,0.9)',
                cursor: 'pointer',
              }}
            >
              🔍 Chercher «&nbsp;{soundTrack._orchestrationKeyword}&nbsp;»
            </button>
          )}
        </div>
      )}

      {/* Contrôles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* VOLUME - Fader horizontal */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#888' }}>Volume</label>
            <span style={{ fontSize: '0.75rem', color: color }}>
              {Math.round((editedTrack.volume || 0) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={editedTrack.volume || 0.5}
            onChange={(e) => handleChange('volume', parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: color }}
          />
        </div>

        {/* Boutons Loop / Mute / Delay */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0.5rem 0' }}>
          
          {/* LOOP */}
          <button
            onClick={() => {
              const newLoop = !editedTrack.loop
              handleChange('loop', newLoop)
              // Activer crossfade par défaut si on passe en loop
              if (newLoop && editedTrack.loopCrossfade == null) {
                handleChange('loopCrossfade', 'medium')
              }
            }}
            style={{
              background: 'none',
              border: `1px solid ${color}${isAnimating ? '80' : '40'}`,
              borderRadius: '8px',
              padding: '0.5rem',
              cursor: 'pointer',
              opacity: editedTrack.loop ? 1 : 0.4,
              color: color,
              transition: 'all 0.2s',
              animation: isAnimating ? 'spin 3s linear infinite' : 'none'
            }}
            title="Loop"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>

          {/* MUTE */}
          <button
            onClick={() => handleChange('muted', !editedTrack.muted)}
            style={{
              background: 'none',
              border: `1px solid ${color}${editedTrack.muted ? '80' : '40'}`,
              borderRadius: '8px',
              padding: '0.5rem',
              cursor: 'pointer',
              opacity: editedTrack.muted ? 1 : 0.4,
              color: color,
              transition: 'all 0.2s'
            }}
            title={editedTrack.muted ? 'Unmute' : 'Mute'}
          >
            {editedTrack.muted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          {/* DELAY */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDelayInput(!showDelayInput)}
              style={{
                background: 'none',
                border: `1px solid ${color}40`,
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                opacity: editedTrack.delay > 0 ? 1 : 0.4,
                color: color,
                transition: 'all 0.2s'
              }}
              title="Delay"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            
            {showDelayInput && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '0.5rem',
                backgroundColor: 'rgba(30,30,30,0.98)',
                border: `1px solid ${color}`,
                borderRadius: '6px',
                padding: '0.5rem',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="100"
                  value={editedTrack.delay || 0}
                  onChange={(e) => handleChange('delay', parseInt(e.target.value) || 0)}
                  style={{
                    width: '70px',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: `1px solid ${color}60`,
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    textAlign: 'center'
                  }}
                  autoFocus
                />
                <span style={{ fontSize: '0.7rem', color: '#888' }}>ms</span>
              </div>
            )}
          </div>
        </div>

        {/* CROSSFADE LOOP — visible seulement si loop actif */}
        {editedTrack.loop && (
          <div>
            <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.4rem' }}>
              Crossfade loop
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { value: 'none',   label: 'Aucun',  ms: 0 },
                { value: 'medium', label: 'Fondu',  ms: 600 },
                { value: 'long',   label: 'Long',   ms: 1800 },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleChange('loopCrossfade', opt.value)}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: `1px solid ${(editedTrack.loopCrossfade ?? 'medium') === opt.value ? color : '#333'}`,
                    background: (editedTrack.loopCrossfade ?? 'medium') === opt.value ? `${color}22` : 'transparent',
                    color: (editedTrack.loopCrossfade ?? 'medium') === opt.value ? color : '#666',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SPATIALISATION ───────────────────────────────────────── */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.6rem' }}>
            Spatialisation
          </label>

          {/* Scène stéréo interactive */}
          {(() => {
            const panValue = editedTrack.pan ?? 0
            const isPanStatic = (editedTrack.panMode ?? 'static') === 'static'
            // Position du point : 0% = gauche, 50% = centre, 100% = droite
            const dotPercent = ((panValue + 1) / 2) * 100

            return (
              <div style={{ marginBottom: '0.6rem' }}>
                {/* Barre stéréo — cliquable et draggable */}
                <div
                  style={{
                    position: 'relative',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${color}30`,
                    cursor: isPanStatic ? 'ew-resize' : 'default',
                    userSelect: 'none',
                    overflow: 'visible',
                  }}
                  onMouseDown={isPanStatic ? (e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const onMove = (ev) => {
                      const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
                      const newPan = parseFloat((x * 2 - 1).toFixed(2))
                      handleChange('pan', newPan)
                    }
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove)
                      window.removeEventListener('mouseup', onUp)
                    }
                    onMove(e)
                    window.addEventListener('mousemove', onMove)
                    window.addEventListener('mouseup', onUp)
                  } : undefined}
                >
                  {/* Label L / R */}
                  <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: '#555', fontWeight: 700, letterSpacing: '0.05em' }}>L</span>
                  <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: '#555', fontWeight: 700, letterSpacing: '0.05em' }}>R</span>

                  {/* Ligne centrale */}
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '20%',
                    width: '1px',
                    height: '60%',
                    background: `${color}25`,
                    transform: 'translateX(-50%)',
                  }} />

                  {/* Point de position — visible seulement en mode static */}
                  {isPanStatic && (
                    <div style={{
                      position: 'absolute',
                      left: `${dotPercent}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 8px ${color}80`,
                      transition: 'left 0.05s',
                      pointerEvents: 'none',
                    }} />
                  )}

                  {/* Indicateur de preset animé (icône flèche) */}
                  {!isPanStatic && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      color: color,
                      opacity: 0.8,
                      letterSpacing: '0.04em',
                    }}>
                      {editedTrack.panMode === 'sweep-lr'       && '← · · ·→'}
                      {editedTrack.panMode === 'sweep-rl'       && '←· · · →'}
                      {editedTrack.panMode === 'oscillate-slow' && '↔  lent'}
                      {editedTrack.panMode === 'oscillate-fast' && '↔ rapide'}
                      {editedTrack.panMode === 'converge'       && '→ · | · ←'}
                      {editedTrack.panMode === 'diverge'        && '← · | · →'}
                    </div>
                  )}
                </div>

                {/* Valeur pan en mode static */}
                {isPanStatic && (
                  <div style={{ textAlign: 'center', marginTop: '0.25rem', fontSize: '0.68rem', color: panValue === 0 ? '#555' : color }}>
                    {panValue === 0 ? 'Centre' : panValue > 0 ? `+${panValue.toFixed(2)} Droite` : `${panValue.toFixed(2)} Gauche`}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Sélecteur de mode */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {[
              { value: 'static',          label: '⦿ Fixe' },
              { value: 'sweep-lr',        label: 'G→D' },
              { value: 'sweep-rl',        label: 'D→G' },
              { value: 'oscillate-slow',  label: '↔ Lent' },
              { value: 'oscillate-fast',  label: '↔ Vite' },
              { value: 'converge',        label: '⇒|⇐' },
              { value: 'diverge',         label: '⇐|⇒' },
            ].map(opt => {
              const isActive = (editedTrack.panMode ?? 'static') === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleChange('panMode', opt.value)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    borderRadius: '5px',
                    border: `1px solid ${isActive ? color : '#333'}`,
                    background: isActive ? `${color}22` : 'transparent',
                    color: isActive ? color : '#555',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    letterSpacing: '0.02em',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
        {/* ─────────────────────────────────────────────────────────── */}

        {/* Segments début et fin sur la même ligne */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Segment de début */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#888' }}>Segment début</label>
            </div>
            <input
              type="number"
              min="1"
              max={segments.length}
              value={startSegText}
              onChange={(e) => {
                const value = e.target.value
                setStartSegText(value) // toujours refléter ce qui est tapé, même invalide/partiel
                if (value === '') return
                const numValue = parseInt(value)
                if (!isNaN(numValue) && numValue >= 1 && numValue <= segments.length) {
                  const newIndex = numValue - 1
                  const currentEndIndex = endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex
                  if (newIndex >= currentEndIndex) {
                    const newEndIndex = Math.min(newIndex + 1, segments.length - 1)
                    handleChange('endSegmentId', segments[newEndIndex].id ?? `seg_${newEndIndex}`)
                    setEndSegText(String(newEndIndex + 1))
                  }
                  handleChange('startSegmentId', segments[newIndex].id ?? `seg_${newIndex}`)
                }
              }}
              onBlur={() => {
                // Si la saisie en cours était invalide/incomplète, on revient à la vraie valeur
                setStartSegText(startSegmentIndex >= 0 ? String(startSegmentIndex + 1) : '')
              }}
              style={{ 
                width: '100%', 
                padding: '0.25rem 0.5rem', 
                fontSize: '0.85rem',
                border: `1px solid ${color}60`,
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                textAlign: 'center'
              }}
            />
          </div>

          {/* Segment de fin */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#888' }}>Segment fin</label>
            </div>
            <input
              type="number"
              min="1"
              max={segments.length}
              value={endSegmentIndex >= 0 ? endSegmentIndex + 1 : (startSegmentIndex >= 0 ? startSegmentIndex + 1 : '')}
              onChange={(e) => {
                const value = e.target.value
                if (value === '') return // Laisser vide pendant l'édition
                const numValue = parseInt(value)
                if (!isNaN(numValue) && numValue >= 1 && numValue <= segments.length) {
                  const newIndex = numValue - 1
                  // La fin doit être >= au début
                  if (newIndex >= startSegmentIndex) {
                    // Utiliser l'ID réel du segment
                    handleChange('endSegmentId', segments[newIndex].id ?? `seg_${newIndex}`)
                  } else {
                    // Si on met une fin avant le début, on ajuste le début aussi
                    handleChange('endSegmentId', segments[newIndex].id ?? `seg_${newIndex}`)
                    handleChange('startSegmentId', segments[newIndex].id ?? `seg_${newIndex}`)
                  }
                }
              }}
              style={{ 
                width: '100%', 
                padding: '0.25rem 0.5rem', 
                fontSize: '0.85rem',
                border: `1px solid ${color}60`,
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                textAlign: 'center'
              }}
            />
          </div>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.25rem' }}>
          Le son sera actif sur les segments {startSegmentIndex >= 0 ? startSegmentIndex + 1 : '-'} à {endSegmentIndex >= 0 ? endSegmentIndex + 1 : (startSegmentIndex >= 0 ? startSegmentIndex + 1 : '-')}
        </div>

        {/* Colonne */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Colonne</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                onClick={() => handleChange('column', i)}
                title={`Colonne ${i}`}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '5px',
                  border: `2px solid ${color}`,
                  backgroundColor: editedTrack.column === i ? color : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, transform 0.1s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { if (editedTrack.column !== i) e.currentTarget.style.backgroundColor = `${color}40` }}
                onMouseLeave={e => { if (editedTrack.column !== i) e.currentTarget.style.backgroundColor = 'transparent' }}
              />
            ))}
          </div>
        </div>

          {/* Trim */}
                  {sound && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#888' }}>Points de trim</label>
                        {(editedTrack.trimStart > 0 || (editedTrack.trimEnd && editedTrack.trimEnd < sound.duration * 1000)) && (
                          <span style={{ fontSize: '0.7rem', color: color }}>
                            {((editedTrack.trimStart || 0) / 1000).toFixed(2)}s → {((editedTrack.trimEnd || sound.duration * 1000) / 1000).toFixed(2)}s
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowTrimmer(true)}
                        style={{
                          width: '100%',
                          padding: '0.45rem',
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid ${color}40`,
                          borderRadius: '7px',
                          color: '#ccc',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        }}
                      >
                        <span>〰</span>
                        <span>{(editedTrack.trimStart > 0 || editedTrack.trimEnd) ? 'Modifier le trim' : 'Définir les points d\'entrée / sortie'}</span>
                      </button>
                    </div>
                  )}
        {/* Fade In */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#888' }}>Fade In</label>
            <span style={{ fontSize: '0.75rem', color: color }}>{editedTrack.fadeIn || 0}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="4000"
            step="100"
            value={editedTrack.fadeIn || 0}
            onChange={(e) => handleChange('fadeIn', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: color }}
          />
        </div>

        {/* Fade Out */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#888' }}>Fade Out</label>
            <span style={{ fontSize: '0.75rem', color: color }}>{editedTrack.fadeOut || 0}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="4000"
            step="100"
            value={editedTrack.fadeOut || 0}
            onChange={(e) => handleChange('fadeOut', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: color }}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginTop: '1.25rem',
        paddingTop: '0.75rem',
        borderTop: `1px solid ${color}30`
      }}>
        {showDeleteConfirm ? (
          <>
            <button
              onClick={handleDelete}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold'
              }}
            >
              Oui, supprimer
            </button>
            <button
              onClick={handleCancelDelete}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: `1px solid ${color}60`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Non
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: `1px solid ${color}60`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '500'
              }}
            >
              Fermer
            </button>
            <button
              onClick={handleDelete}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'transparent',
                color: '#dc3545',
                border: `1px solid #dc354560`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#dc354520'
                e.target.style.borderColor = '#dc3545'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
                e.target.style.borderColor = '#dc354560'
              }}
            >
              🗑
            </button>
          </>
        )}
      </div>
      {/* WaveformTrimmer */}
            {showTrimmer && sound && (
              <WaveformTrimmer
                sound={sound}
                initialStart={editedTrack.trimStart || 0}
                initialEnd={editedTrack.trimEnd || sound.duration * 1000}
                onConfirm={({ trimStart, trimEnd }) => {
                  handleChange('trimStart', trimStart)
                  handleChange('trimEnd', trimEnd)
                  setShowTrimmer(false)
                }}
                onClose={() => setShowTrimmer(false)}
              />
            )}
      {/* Animation CSS pour loop */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Picker de remplacement de son — rendu via portail hors du panel */}
      {showSoundPicker && soundLibrary && createPortal(
        <SoundLibraryPicker
          soundLibrary={soundLibrary}
          segments={segments}
          segmentIndex={segments.findIndex(s => s.id === editedTrack.startSegmentId || s._id === editedTrack.startSegmentId)}
          segmentId={editedTrack.startSegmentId}
          column={editedTrack.column}
          adminPassword={adminPassword}
          initialSearch={pickerInitialSearch || (sound ? sound.label : '')}          onAddSound={(soundData) => {
            const updated = { ...editedTrack, soundId: soundData.soundId }
            setEditedTrack(updated)
            if (onRealTimeUpdate) onRealTimeUpdate(updated)
            if (onSoundReplace) onSoundReplace(updated)
            setShowSoundPicker(false)
          }}
          onSoundsImported={(updatedSounds) => {
            if (!updatedSounds?.length) return
            // Remonter vers AdminPage pour mettre à jour soundLibrary
            if (onSoundsImported) onSoundsImported(updatedSounds)
            const s = updatedSounds[0]
            if (s.id === editedTrack.soundId && s.url) {
              const updated = { ...editedTrack, muted: false, broken: undefined }
              delete updated.broken
              setEditedTrack(updated)
              if (onRealTimeUpdate) onRealTimeUpdate(updated)
              if (onSoundReplace) onSoundReplace(updated)
            }
          }}
          onClose={() => setShowSoundPicker(false)}
        />,
        document.body
      )}
    </div>
  )
}
export default SoundBlockPanel
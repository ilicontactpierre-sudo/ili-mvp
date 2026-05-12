import { useState, useEffect, useRef, useCallback } from 'react'
import { CATEGORY_COLORS } from './constants'

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
  onSave, 
  onRealTimeUpdate,
  onClose,
  onDelete
}) {
  const [editedTrack, setEditedTrack] = useState({ ...soundTrack })
  const [showDelayInput, setShowDelayInput] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const panelRef = useRef(null)
  const animationRef = useRef(null)

  const color = getSoundColor(sound)

  useEffect(() => {
    setEditedTrack({ ...soundTrack })
    setShowDeleteConfirm(false)
    setShowDelayInput(false)
  }, [soundTrack])

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
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleChange = useCallback((field, value) => {
    setEditedTrack(prev => {
      const updated = {
        ...prev,
        [field]: value
      }
      // Sauvegarde en temps réel
      if (onRealTimeUpdate) {
        onRealTimeUpdate(updated)
      }
      return updated
    })
  }, [onRealTimeUpdate])

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
    return segments.findIndex(s => s.id === segmentId || s._id === segmentId)
  }, [segments])

  const startSegmentIndex = getSegmentIndex(soundTrack.startSegmentId)
  const endSegmentIndex = getSegmentIndex(soundTrack.endSegmentId)

  // Style du fader vertical
  const verticalSliderStyle = {
    writingMode: 'vertical-lr',
    direction: 'ltr',
    WebkitAppearance: 'slider-vertical',
    appearance: 'slider-vertical',
    height: '120px',
    width: '30px',
    accentColor: color
  }

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
        <h3 style={{ margin: 0, fontSize: '1rem', color: color, fontWeight: '600' }}>
          {sound ? sound.label.substring(0, 30) : soundTrack.soundId}
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

      {/* Contrôles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* VOLUME - Fader vertical */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#888', writingMode: 'horizontal-tb' }}>Vol.</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={editedTrack.volume || 0.5}
            onChange={(e) => handleChange('volume', parseFloat(e.target.value))}
            style={verticalSliderStyle}
          />
          <span style={{ fontSize: '0.8rem', color: color, minWidth: '40px' }}>
            {Math.round((editedTrack.volume || 0) * 100)}%
          </span>
        </div>

        {/* Boutons Loop / Mute / Delay */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0.5rem 0' }}>
          
          {/* LOOP */}
          <button
            onClick={() => handleChange('loop', !editedTrack.loop)}
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

        {/* Segments début et fin sur la même ligne */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Segment de début */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#888' }}>N° début</label>
            </div>
            <input
              type="number"
              min="1"
              max={segments.length}
              value={startSegmentIndex >= 0 ? startSegmentIndex + 1 : ''}
              onChange={(e) => {
                const value = e.target.value
                if (value === '') return // Laisser vide pendant l'édition
                const numValue = parseInt(value)
                if (!isNaN(numValue) && numValue >= 1 && numValue <= segments.length) {
                  const newIndex = numValue - 1
                  const currentEndIndex = endSegmentIndex !== -1 ? endSegmentIndex : startSegmentIndex
                  if (newIndex < currentEndIndex) {
                    handleChange('startSegmentId', segments[newIndex]?.id || segments[newIndex]?._id)
                  } else {
                    handleChange('startSegmentId', segments[newIndex]?.id || segments[newIndex]?._id)
                    if (newIndex >= currentEndIndex) {
                      const newEndIndex = Math.min(newIndex + 1, segments.length - 1)
                      handleChange('endSegmentId', segments[newEndIndex]?.id || segments[newEndIndex]?._id)
                    }
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

          {/* Segment de fin */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#888' }}>N° fin</label>
            </div>
            <input
              type="number"
              min="2"
              max={segments.length}
              value={endSegmentIndex >= 0 ? endSegmentIndex + 1 : (startSegmentIndex >= 0 ? startSegmentIndex + 1 : '')}
              onChange={(e) => {
                const value = e.target.value
                if (value === '') return // Laisser vide pendant l'édition
                const numValue = parseInt(value)
                if (!isNaN(numValue) && numValue >= 2 && numValue <= segments.length) {
                  const newIndex = numValue - 1
                  if (newIndex > startSegmentIndex) {
                    handleChange('endSegmentId', segments[newIndex]?.id || segments[newIndex]?._id)
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
          N° fin doit être supérieur à N° début ({startSegmentIndex >= 0 ? startSegmentIndex + 1 : '-'})
        </div>

        {/* Colonne */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#888' }}>Colonne</label>
            <span style={{ fontSize: '0.75rem', color: color }}>{editedTrack.column}</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            value={editedTrack.column}
            onChange={(e) => handleChange('column', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: color }}
          />
        </div>

        {/* Fade In */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#888' }}>Fade In</label>
            <span style={{ fontSize: '0.75rem', color: color }}>{editedTrack.fadeIn || 0}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="5000"
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
            max="5000"
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

      {/* Animation CSS pour loop */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default SoundBlockPanel

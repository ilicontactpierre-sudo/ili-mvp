import { useState } from 'react'
import { VFX_TYPES, VFX_COLORS } from './constants'
import hapticEngine, { HAPTIC_PATTERNS } from '../../engine/HapticEngine'

const PRESET_FLASH_COLORS = [
  { label: 'Rouge',  value: 'rgba(200, 0, 0, 0.12)' },
  { label: 'Bleu',   value: 'rgba(0, 80, 200, 0.12)' },
  { label: 'Vert',   value: 'rgba(0, 160, 60, 0.10)' },
  { label: 'Blanc',  value: 'rgba(255, 255, 255, 0.18)' },
  { label: 'Orange', value: 'rgba(220, 120, 0, 0.12)' },
  { label: 'Violet', value: 'rgba(120, 0, 200, 0.12)' },
]
const PRESET_VIGNETTE_COLORS = [
  { label: 'Noir',   value: 'rgba(0, 0, 0, 0.7)' },
  { label: 'Blanc',  value: 'rgba(255, 255, 255, 0.7)' },
  { label: 'Rouge',  value: 'rgba(120, 0, 0, 0.6)' },
  { label: 'Bleu',   value: 'rgba(0, 0, 80, 0.6)' },
  { label: 'Violet', value: 'rgba(60, 0, 120, 0.6)' },
]

function VfxBlockPanel({ vfxTrack, segments, onSave, onClose, onDelete, onRealTimeUpdate }) {
  const [local, setLocal] = useState({ ...vfxTrack })
  // true = affiche le sous-panneau de sélection haptique
  const [showHaptic, setShowHaptic] = useState(false)

  const typeDef  = VFX_TYPES[local.type] || {}
  const baseColor = VFX_COLORS[local.type] || '#B0B0B0'

  const update = (patch) => {
    const next = { ...local, ...patch }
    setLocal(next)
    if (onRealTimeUpdate) onRealTimeUpdate(next)
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const panelStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '340px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    zIndex: 1100,
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  const headerStyle = {
    padding: '1rem 1.25rem 0.75rem',
    borderBottom: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: `linear-gradient(135deg, ${baseColor}22, transparent)`,
  }

  const labelStyle = {
    fontSize: '12px',
    fontWeight: '600',
    color: '#555',
    marginBottom: '6px',
    display: 'block',
  }

  const selectStyle = {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: '#fafafa',
    cursor: 'pointer',
  }

  const btnStyle = (primary) => ({
    flex: 1,
    padding: '8px 0',
    border: primary ? 'none' : '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: primary ? '600' : '400',
    backgroundColor: primary ? '#333' : '#fff',
    color: primary ? '#fff' : '#333',
    cursor: 'pointer',
  })

  // ── Rendu du sous-panneau haptique ────────────────────────────────────────

  const renderHapticPanel = () => {
    const isSupported = hapticEngine.isSupported
    const selected    = local.hapticPattern || null

    return (
      <div style={{
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>

        {/* Avertissement si non supporté */}
        {!isSupported && (
          <div style={{
            fontSize: '11px',
            color: '#888',
            backgroundColor: '#fff3cd',
            borderRadius: '6px',
            padding: '6px 10px',
            lineHeight: '1.4',
          }}>
            ⚠️ Vibrations non disponibles sur cet appareil ou navigateur (iOS non supporté).
            Le pattern sera sauvegardé mais inactif.
          </div>
        )}

        {/* Grille des patterns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
        }}>
          {Object.entries(HAPTIC_PATTERNS).map(([key, pattern]) => {
            const isActive = selected === key
            return (
              <button
                key={key}
                title={pattern.description}
                onClick={() => {
                  // Sélectionne ou désélectionne
                  const next = isActive ? null : key
                  update({ hapticPattern: next })
                  // Prévisualisation tactile immédiate (Android uniquement)
                  if (next && hapticEngine.isSupported) {
                    hapticEngine.preview(next)
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  border: isActive ? `2px solid ${baseColor}` : '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: isActive ? `${baseColor}22` : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{pattern.icon}</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? '#222' : '#666',
                  textAlign: 'center',
                  lineHeight: '1.2',
                }}>
                  {pattern.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Bouton "Aucune vibration" — toujours visible */}
        <button
          onClick={() => update({ hapticPattern: null })}
          style={{
            padding: '6px 12px',
            border: !selected ? `2px solid ${baseColor}` : '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: !selected ? `${baseColor}22` : '#fff',
            fontSize: '12px',
            fontWeight: !selected ? '700' : '400',
            color: !selected ? '#222' : '#888',
            cursor: 'pointer',
            transition: 'all 0.12s ease',
          }}
        >
          Aucune vibration
        </button>

        {/* Description du pattern sélectionné */}
        {selected && HAPTIC_PATTERNS[selected] && (
          <div style={{
            fontSize: '11px',
            color: '#666',
            fontStyle: 'italic',
          }}>
            {HAPTIC_PATTERNS[selected].description}
          </div>
        )}
      </div>
    )
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div style={panelStyle}>

      {/* Header */}
      <div style={headerStyle}>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          backgroundColor: baseColor, flexShrink: 0,
        }} />
        <span style={{ fontWeight: '700', fontSize: '15px', color: '#222' }}>
          Effet visuel
        </span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: '18px', cursor: 'pointer', color: '#999', lineHeight: 1,
          }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Type */}
        <div>
          <label style={labelStyle}>Type d'effet</label>
          <select
            style={selectStyle}
            value={local.type || ''}
            onChange={(e) => {
              const t   = e.target.value
              const def = VFX_TYPES[t] || {}
              update({ type: t || null, mode: def.modes?.[0] || '', loop: false })
            }}
          >
            <option value="">— Aucun effet —</option>
            {Object.entries(VFX_TYPES).map(([key, def]) => (
              <option key={key} value={key}>{def.label}</option>
            ))}
          </select>
        </div>

        {/* Mode */}
        {typeDef.modes && typeDef.modes.length > 0 && (
          <div>
            <label style={labelStyle}>Intensité / Vitesse</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {typeDef.modes.map((m) => (
                <button
                  key={m}
                  onClick={() => update({ mode: m })}
                  style={{
                    padding: '5px 12px',
                    border: local.mode === m ? `2px solid ${baseColor}` : '1px solid #ddd',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: local.mode === m ? '700' : '400',
                    backgroundColor: local.mode === m ? `${baseColor}22` : '#fafafa',
                    color: local.mode === m ? '#222' : '#555',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loop */}
        {typeDef.hasLoop && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="vfx-loop"
              checked={!!local.loop}
              onChange={(e) => update({ loop: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="vfx-loop" style={{ fontSize: '13px', color: '#333', cursor: 'pointer' }}>
              Loop — répéter en boucle
            </label>
          </div>
        )}

        {/* Couleur (flash) */}
        {typeDef.hasColor && (
          <div>
            <label style={labelStyle}>Couleur du flash</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PRESET_FLASH_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => update({ color: c.value })}
                  title={c.label}
                  style={{
                    width: '28px', height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c.value.replace('0.12', '0.6').replace('0.10', '0.5').replace('0.18', '0.6'),
                    border: local.color === c.value ? '3px solid #333' : '2px solid #ccc',
                    cursor: 'pointer',
                    transition: 'border 0.12s ease',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Section Haptique ───────────────────────────────────────────── */}
        <div>
          {/* Bouton toggle */}
          <button
            onClick={() => setShowHaptic(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '7px 10px',
              border: local.hapticPattern ? `1.5px solid ${baseColor}` : '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: local.hapticPattern ? `${baseColor}18` : '#fafafa',
              cursor: 'pointer',
              fontSize: '13px',
              color: local.hapticPattern ? '#222' : '#666',
              fontWeight: local.hapticPattern ? '600' : '400',
              textAlign: 'left',
              transition: 'all 0.12s ease',
            }}
          >
            <span style={{ fontSize: '16px' }}>
              {local.hapticPattern
                ? HAPTIC_PATTERNS[local.hapticPattern]?.icon || '📳'
                : '📳'}
            </span>
            <span>
              {local.hapticPattern
                ? `Vibration : ${HAPTIC_PATTERNS[local.hapticPattern]?.label}`
                : 'Ajouter une vibration'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#999' }}>
              {showHaptic ? '▲' : '▼'}
            </span>
          </button>

          {/* Sous-panneau déployable */}
          {showHaptic && (
            <div style={{ marginTop: '8px' }}>
              {renderHapticPanel()}
            </div>
          )}
        </div>

        {/* Portée */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '12px',
          color: '#666',
        }}>
          <strong style={{ color: '#333' }}>Portée :</strong>{' '}
          {(() => {
            const getIdx = (id) => segments.findIndex(s => s.id === id || s._id === id)
            const si = getIdx(local.startSegmentId)
            const ei = getIdx(local.endSegmentId)
            const start = si !== -1 ? si + 1 : '?'
            const end   = ei !== -1 ? ei + 1 : start
            return start === end
              ? `Segment ${start}`
              : `Segments ${start} → ${end}`
          })()}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1.25rem 1rem',
        borderTop: '1px solid #eee',
        display: 'flex',
        gap: '8px',
      }}>
        <button
          onClick={() => onDelete && onDelete(local.id)}
          style={{
            padding: '8px 12px',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: '#fff',
            color: '#dc2626',
            cursor: 'pointer',
          }}
        >🗑</button>
        <button style={btnStyle(false)} onClick={onClose}>Annuler</button>
        <button style={btnStyle(true)} onClick={() => { onSave(local); onClose() }}>Enregistrer</button>
      </div>
    </div>
  )
}

export default VfxBlockPanel

import { useState } from 'react'
// ── Palette couleurs narratives ──────────────────────────────────────────────
const NARRATIVE_COLORS = [
  { name: 'Sang',    hex: '#c0392b' },
  { name: 'Braise',  hex: '#e67e22' },
  { name: 'Or',      hex: '#f1c40f' },
  { name: 'Citron',  hex: '#d4e157' },
  { name: 'Forêt',   hex: '#27ae60' },
  { name: 'Jade',    hex: '#1abc9c' },
  { name: 'Ciel',    hex: '#3498db' },
  { name: 'Nuit',    hex: '#2c3e50' },
  { name: 'Lilas',   hex: '#9b59b6' },
  { name: 'Rose',    hex: '#e91e63' },
  { name: 'Craie',   hex: '#ecf0f1' },
  { name: 'Sable',   hex: '#d4a96a' },
  { name: 'Brume',   hex: '#95a5a6' },
  { name: 'Encre',   hex: '#1a1a2e' },
  { name: 'Ivoire',  hex: '#fffff0' },
  { name: 'Carmin',  hex: '#8b0000' },
]

function InlineFunctionMenu({ query, matches, selectedIndex, position, onSelect, onHover, seuilKeys = [] }) {
  const [customHex, setCustomHex] = useState('')
  const left = Math.min(position.left, window.innerWidth - 320)
  const top  = Math.min(position.top + 4, window.innerHeight - 400)

  // Détecte si un seul match est actif et s'il a un sous-menu spécial
  const activeMatch = matches[selectedIndex] ?? matches[0]
  const activeFnKey = activeMatch?.[0]

  const hasColorPanel = activeFnKey === 'couleur'
  const hasLirePanel  = activeFnKey === 'lire' && seuilKeys.length > 0

  return (
    <div
      style={{
        position: 'fixed',
        top, left,
        zIndex: 3000,
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        minWidth: '240px',
        maxWidth: '300px',
        maxHeight: '420px',
        overflowY: 'auto',
        fontSize: '0.78rem',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '6px 10px', fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        position: 'sticky', top: 0, background: '#1a1a2e', zIndex: 1,
      }}>
        Fonctions{query ? ` · "${query}"` : ''}
      </div>

      {/* Liste de fonctions */}
      {matches.length === 0 ? (
        <div style={{ padding: '10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
          Aucune fonction correspondante
        </div>
      ) : (
        matches.map(([key, def], i) => (
          <div
            key={key}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(key)}
            onMouseEnter={() => onHover(i)}
            style={{
              padding: '8px 10px',
              cursor: 'pointer',
              backgroundColor: i === selectedIndex ? 'rgba(99,102,241,0.25)' : 'transparent',
              borderLeft: i === selectedIndex ? '2px solid #6366f1' : '2px solid transparent',
              transition: 'background-color 0.1s ease',
            }}
          >
            <div style={{ color: '#fff', fontWeight: 600 }}>{def.label}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: '2px' }}>
              {def.description}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', marginTop: '2px', fontFamily: 'monospace' }}>
              {`</${key}:${def.params.map(p => p.default).join(';') || ''}${def.wrap ? '|' : ''}/>`}
            </div>
          </div>
        ))
      )}

      {/* ── Sous-panneau palette couleur ── */}
      {hasColorPanel && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 10px',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Palette narrative
          </div>
          {/* Grille 4×4 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {NARRATIVE_COLORS.map(({ name, hex }) => (
              <button
                key={hex}
                title={`${name} ${hex}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  // Insérer </couleur:#hex|/> directement
                  onSelect('couleur', hex)
                }}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  backgroundColor: hex,
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.12)'
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${hex}66`
                  e.currentTarget.style.zIndex = '2'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.zIndex = '1'
                }}
              >
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  fontSize: '0.45rem', color: parseInt(hex.slice(1), 16) > 0x888888 ? '#000' : '#fff',
                  opacity: 0, transition: 'opacity 0.1s',
                  paddingBottom: '1px', lineHeight: 1,
                  pointerEvents: 'none',
                }}
                  className="color-label"
                >
                  {name}
                </span>
              </button>
            ))}
          </div>
          {/* Champ hex personnalisé */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '3px', flexShrink: 0,
              backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
            }} />
            <input
              type="text"
              placeholder="#hex…"
              value={customHex}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => setCustomHex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(customHex)) {
                  onSelect('couleur', customHex)
                }
                e.stopPropagation() // ne pas propager vers le menu principal
              }}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px',
                color: '#fff', fontSize: '0.7rem', padding: '3px 6px', outline: 'none',
                fontFamily: 'monospace',
              }}
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (/^#[0-9a-fA-F]{6}$/.test(customHex)) onSelect('couleur', customHex)
              }}
              style={{
                padding: '3px 7px', fontSize: '0.65rem',
                backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customHex) ? '#6366f1' : 'rgba(255,255,255,0.1)',
                color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer',
              }}
            >↵</button>
          </div>
        </div>
      )}

      {/* ── Sous-panneau clés lire ── */}
      {hasLirePanel && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 10px',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Clés disponibles (Seuil)
          </div>
          {seuilKeys.map((cle) => (
            <div
              key={cle}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect('lire', cle)}
              style={{
                padding: '5px 8px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.72rem',
                color: '#a5b4fc',
                backgroundColor: 'rgba(99,102,241,0.08)',
                marginBottom: '3px',
                border: '1px solid rgba(99,102,241,0.2)',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.08)'}
            >
              {`</lire:${cle}|défaut/>`}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '4px 10px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky', bottom: 0, background: '#1a1a2e',
      }}>
        ↑↓ naviguer · ↵ insérer · Esc fermer
      </div>
    </div>
  )
}
export default InlineFunctionMenu
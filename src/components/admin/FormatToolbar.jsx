import { useEffect, useRef } from 'react'

const FONTS = [
  { label: 'Lora',      css: "'Lora', serif" },
  { label: 'Garamond',  css: "'EB Garamond', serif" },
  { label: 'Roboto',    css: "'Roboto', sans-serif" },
  { label: 'Writer',    css: "'Courier Prime', monospace" },
  { label: 'Script',    css: "'Meie Script', cursive" },
]

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400' +
  '&family=EB+Garamond:ital,wght@0,400;0,700;1,400' +
  '&family=Roboto:ital,wght@0,400;0,700;1,400' +
  '&family=Courier+Prime:ital,wght@0,400;0,700;1,400' +
  '&family=Meie+Script&display=swap'

// Vérifie si un texte est entouré d'un marqueur donné (sans confondre * et **)
function isActive(text, marker) {
  if (!text) return false
  const t = text.trim()
  if (marker === '*') {
    // Italique : commence par * mais PAS ** 
    return /^\*[^*]/.test(t) && /[^*]\*$/.test(t)
  }
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escaped}.+${escaped}$`, 's')
  return regex.test(t)
}

export default function FormatToolbar({ mode, position, onFormat, onFontChange, currentFont, currentText, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!document.getElementById('ili-format-fonts')) {
      const link = document.createElement('link')
      link.id = 'ili-format-fonts'
      link.rel = 'stylesheet'
      link.href = GOOGLE_FONTS_URL
      document.head.appendChild(link)
    }
  }, [])

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  if (!position) return null

  const top = Math.max(8, position.top - 50)

  const boldActive    = isActive(currentText, '**')
  const italicActive  = isActive(currentText, '*')
  const underActive   = isActive(currentText, '__')
  const strikeActive  = isActive(currentText, '~~')

  const activeStyle  = { background: 'rgba(255,255,255,0.90)', color: '#1a1a1a' }
  const defaultStyle = { background: 'transparent', color: 'white' }

  return (
    <>
      <style>{`
        @keyframes iliToolbarIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .ili-fmt-btn {
          background: transparent;
          border: none;
          border-radius: 5px;
          color: white;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 13px;
          font-weight: bold;
          line-height: 1;
          min-width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .ili-fmt-btn:hover { background: rgba(255,255,255,0.18) !important; color: white !important; }
        .ili-fmt-btn.active { background: rgba(255,255,255,0.90) !important; color: #1a1a1a !important; }
      `}</style>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top,
          left: position.left,
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '5px 8px',
          backgroundColor: '#1a1a1a',
          borderRadius: '10px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
          zIndex: 9999,
          animation: 'iliToolbarIn 0.15s ease',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {/* ── Formatage ── */}
        <button
          className={`ili-fmt-btn${boldActive ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onFormat('bold') }}
          title="Gras"
        >
          <strong style={{ fontFamily: 'Georgia, serif', fontSize: 14 }}>B</strong>
        </button>
        <button
          className={`ili-fmt-btn${italicActive ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onFormat('italic') }}
          title="Italique"
        >
          <em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14 }}>I</em>
        </button>
        <button
          className={`ili-fmt-btn${underActive ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onFormat('underline') }}
          title="Souligné"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <button
          className={`ili-fmt-btn${strikeActive ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onFormat('strikethrough') }}
          title="Barré"
        >
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </button>

        {/* ── Séparateur ── */}
        <div style={{ width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 4px', flexShrink: 0 }} />

        {/* ── Polices ── */}
        {FONTS.map(font => (
          <button
            key={font.css}
            className={`ili-fmt-btn${currentFont === font.css ? ' active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); onFontChange(font.css) }}
            title={font.label}
            style={{ fontFamily: font.css, fontSize: 12, padding: '4px 9px', minWidth: 'auto' }}
          >
            {font.label}
          </button>
        ))}
      </div>
    </>
  )
}
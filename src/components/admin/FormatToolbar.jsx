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

export default function FormatToolbar({ mode, position, onFormat, onFontChange, currentFont, onClose }) {
  const ref = useRef(null)

  // Charger les Google Fonts une seule fois
  useEffect(() => {
    if (!document.getElementById('ili-format-fonts')) {
      const link = document.createElement('link')
      link.id = 'ili-format-fonts'
      link.rel = 'stylesheet'
      link.href = GOOGLE_FONTS_URL
      document.head.appendChild(link)
    }
  }, [])

  // Fermer si clic en dehors
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  if (!position) return null

  const top = Math.max(8, position.top - 50)

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
          transition: background 0.12s ease;
        }
        .ili-fmt-btn:hover { background: rgba(255,255,255,0.18) !important; }
        .ili-fmt-btn.active { background: rgba(255,255,255,0.22); }
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
        <button className="ili-fmt-btn" onMouseDown={(e) => { e.preventDefault(); onFormat('bold') }} title="Gras">
          <strong style={{ fontFamily: 'Georgia, serif', fontSize: 14 }}>B</strong>
        </button>
        <button className="ili-fmt-btn" onMouseDown={(e) => { e.preventDefault(); onFormat('italic') }} title="Italique">
          <em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14 }}>I</em>
        </button>
        <button className="ili-fmt-btn" onMouseDown={(e) => { e.preventDefault(); onFormat('underline') }} title="Souligné">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <button className="ili-fmt-btn" onMouseDown={(e) => { e.preventDefault(); onFormat('strikethrough') }} title="Barré">
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
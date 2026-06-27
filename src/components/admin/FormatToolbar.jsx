import { useEffect, useRef } from 'react'

const FONTS = [
  { label: 'Lora',      css: "'Lora', serif" },
  { label: 'Oanteh',    css: "'Oanteh', serif" },
  { label: 'Benedict',    css: "'Benedict, regular" },
  { label: 'Terminal',  css: "'VT323', monospace" },
  { label: 'Script',    css: "'Meie Script', cursive" },
]
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400' +
  '&family=Meie+Script&display=swap'

export default function FormatToolbar({ position, onFormat, onFontChange, currentFont, currentSegment, onClose }) {
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
  const top = Math.max(8, Math.min(position.top, window.innerHeight - 280))
  const boldActive   = !!currentSegment?.bold
  const italicActive = !!currentSegment?.italic
  const underActive  = !!currentSegment?.underline
  const strikeActive = !!currentSegment?.strikethrough

  return (
    <>
      <style>{`
        @keyframes iliToolbarIn {
          from { opacity: 0; transform: translateX(-100%) translateX(-8px); }
          to   { opacity: 1; transform: translateX(-100%) translateX(0); }
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
        .ili-fmt-btn:hover { background: rgba(255,255,255,0.18) !important; }
        .ili-fmt-btn.active { background: rgba(255,255,255,0.90) !important; color: #1a1a1a !important; }
      `}</style>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top,
          left: position.left != null ? `${Math.max(4, position.left - 56)}px` : '4px',
          transform: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          padding: '6px 5px',
          backgroundColor: '#1a1a1a',
          borderRadius: '10px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
          zIndex: 9999,
          animation: 'none',
          userSelect: 'none',
        }}
      >
        <button className={`ili-fmt-btn${boldActive ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onFormat('bold') }} title="Gras">
          <strong style={{ fontFamily: 'Georgia, serif', fontSize: 14 }}>B</strong>
        </button>
        <button className={`ili-fmt-btn${italicActive ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onFormat('italic') }} title="Italique">
          <em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14 }}>I</em>
        </button>
        <button className={`ili-fmt-btn${underActive ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onFormat('underline') }} title="Souligné">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <button className={`ili-fmt-btn${strikeActive ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onFormat('strikethrough') }} title="Barré">
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </button>

        <div style={{ width: 18, height: 1, backgroundColor: 'rgba(255,255,255,0.2)', margin: '4px 0', flexShrink: 0 }} />

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
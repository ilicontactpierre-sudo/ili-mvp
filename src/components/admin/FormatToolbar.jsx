import { useEffect, useRef } from 'react'

const FONTS = [
  { label: 'Sans', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', value: '"Courier New", Courier, monospace' },
]

export default function FormatToolbar({ mode, position, onFormat, onFontChange, currentFont, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  if (!position) return null

  const toolbarStyle = {
    position: 'fixed',
    top: position.top,
    left: position.left,
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 6px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    zIndex: 9999,
    animation: 'fadeInUp 0.12s ease',
    userSelect: 'none',
  }

  const btn = (active) => ({
    background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    padding: '4px 7px',
    fontSize: '13px',
    fontWeight: 'bold',
    lineHeight: 1,
    transition: 'background 0.1s ease',
  })

  const divider = (
    <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />
  )

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div ref={ref} style={toolbarStyle}>
        {mode === 'selection' && (
          <>
            <button style={btn(false)} onMouseDown={(e) => { e.preventDefault(); onFormat('bold') }} title="Gras">
              <strong>B</strong>
            </button>
            <button style={btn(false)} onMouseDown={(e) => { e.preventDefault(); onFormat('italic') }} title="Italique">
              <em>I</em>
            </button>
            <button style={btn(false)} onMouseDown={(e) => { e.preventDefault(); onFormat('underline') }} title="Souligné">
              <u>U</u>
            </button>
            {divider}
          </>
        )}
        {FONTS.map(font => (
          <button
            key={font.value}
            style={{
              ...btn(currentFont === font.value),
              fontFamily: font.value,
              fontSize: '12px',
              padding: '4px 8px',
            }}
            onMouseDown={(e) => { e.preventDefault(); onFontChange(font.value) }}
            title={font.label}
          >
            {font.label}
          </button>
        ))}
      </div>
    </>
  )
}
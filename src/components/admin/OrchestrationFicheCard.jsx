import { useState, useEffect } from 'react'
import { hasOrchestrationFiche, computeFichePlacement, webSearchUrl } from '../../utils/ficheCard'

const MUTED = '#9a9a9f'
const FONT = 'system-ui, -apple-system, sans-serif'

const labelStyle = { fontSize: '0.68rem', color: MUTED, letterSpacing: '0.04em', margin: '0.85rem 0 0.25rem' }
const buttonStyle = {
  background: 'transparent',
  border: '1px solid #4a4a50',
  color: '#ececec',
  borderRadius: '6px',
  padding: '0.35rem 0.6rem',
  fontSize: '0.75rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  fontFamily: FONT,
}

function Icon({ d }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const ICON_SEARCH = 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3'
const ICON_LINK = 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'
const ICON_COPY = 'M9 9h10v10H9zM5 15V5h10'

function OrchestrationFicheCard({ track, anchorRef, onSearchLibrary }) {
  const [placement, setPlacement] = useState(null)
  const [selected, setSelected] = useState(0)
  const [openRow, setOpenRow] = useState(null)
  const [copied, setCopied] = useState(false)
  const [overlayOpen, setOverlayOpen] = useState(false)

  useEffect(() => {
    const update = () => {
      const el = anchorRef && anchorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPlacement(computeFichePlacement({
        panelLeft: rect.left,
        panelTop: rect.top,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }))
    }
    update()
    window.addEventListener('resize', update)
    const observer = typeof ResizeObserver !== 'undefined' && anchorRef && anchorRef.current ? new ResizeObserver(update) : null
    if (observer) observer.observe(anchorRef.current)
    return () => {
      window.removeEventListener('resize', update)
      if (observer) observer.disconnect()
    }
  }, [anchorRef])

  if (!hasOrchestrationFiche(track)) return null

  const brief = typeof track._orchestrationBrief === 'string' ? track._orchestrationBrief.trim() : ''
  const queries = Array.isArray(track._orchestrationSearch)
    ? track._orchestrationSearch.filter((q) => typeof q === 'string' && q.trim() !== '').map((q) => q.trim())
    : []
  const alt = typeof track._orchestrationAlt === 'string' ? track._orchestrationAlt.trim() : ''
  const reprise = typeof track._orchestrationReprise === 'string' ? track._orchestrationReprise.trim() : ''
  const query = queries[Math.min(selected, Math.max(queries.length - 1, 0))] || ''
  const isGhost = track.broken === true

  const copyQuery = () => {
    if (!query) return
    try {
      navigator.clipboard.writeText(query).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }, () => {})
    } catch {
      // presse-papiers indisponible : rien à faire
    }
  }

  const rows = [
    alt ? { key: 'alt', title: 'Alternative', text: alt } : null,
    reprise ? { key: 'reprise', title: 'Reprise', text: reprise } : null,
  ].filter(Boolean)

  const body = (
    <>
      <span
        style={{
          display: 'inline-block',
          background: isGhost ? '#3a2e12' : '#26243a',
          color: isGhost ? '#f0c060' : '#b6b0f7',
          borderRadius: '6px',
          padding: '0.1rem 0.5rem',
          fontSize: '0.75rem',
        }}
      >
        {isGhost ? 'Son à trouver' : 'Fiche de Claude'}
      </span>

      {brief && (
        <>
          <div style={labelStyle}>À entendre</div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>{brief}</div>
        </>
      )}

      {queries.length > 0 && (
        <>
          <div style={labelStyle}>À chercher</div>
          {queries.map((q, i) => (
            <button
              key={`${i}-${q}`}
              type="button"
              title={q}
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
              style={{
                width: '100%',
                textAlign: 'left',
                margin: '0 0 0.35rem',
                padding: '0.4rem 0.6rem',
                border: `1px solid ${i === selected ? '#7c6cf0' : '#4a4a50'}`,
                background: i === selected ? '#2d2a52' : 'transparent',
                color: '#ececec',
                borderRadius: '6px',
                fontSize: '0.75rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                overflowWrap: 'anywhere',
                lineHeight: 1.35,
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              {q}
            </button>
          ))}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => onSearchLibrary && onSearchLibrary(query)}
              style={{ ...buttonStyle, flex: 1, justifyContent: 'center', background: '#4f46e5', borderColor: '#4f46e5', color: '#fff' }}
            >
              <Icon d={ICON_SEARCH} /> Ma bibliothèque
            </button>
            <button
              type="button"
              onClick={() => window.open(webSearchUrl(query), '_blank', 'noopener,noreferrer')}
              style={buttonStyle}
            >
              <Icon d={ICON_LINK} /> YouTube
            </button>
            <button type="button" onClick={copyQuery} aria-label="Copier la requête" style={buttonStyle}>
              {copied ? 'Copié' : <Icon d={ICON_COPY} />}
            </button>
          </div>
        </>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: '0.7rem' }}>
          {rows.map((row) => (
            <div key={row.key} style={{ borderTop: '1px solid #38383a' }}>
              <button
                type="button"
                aria-expanded={openRow === row.key}
                onClick={() => setOpenRow(openRow === row.key ? null : row.key)}
                style={{ ...buttonStyle, width: '100%', justifyContent: 'space-between', border: 'none', borderRadius: 0, padding: '0.55rem 0', color: '#ececec' }}
              >
                <span>{row.title}</span>
                <span aria-hidden="true">{openRow === row.key ? '−' : '+'}</span>
              </button>
              {openRow === row.key && (
                <div style={{ fontSize: '0.78rem', color: '#c9c9ce', paddingBottom: '0.55rem', lineHeight: 1.5 }}>{row.text}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )

  const cardStyle = {
    backgroundColor: 'rgba(20,20,20,0.97)',
    borderRadius: '12px',
    padding: '1rem',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    color: '#fff',
    fontFamily: FONT,
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'thin',
    zIndex: 1001,
  }

  if (placement && placement.mode === 'overlay') {
    return (
      <>
        <button
          type="button"
          data-fiche-card
          onClick={() => setOverlayOpen((o) => !o)}
          style={{ ...buttonStyle, position: 'fixed', top: '12px', left: '12px', zIndex: 1002, background: 'rgba(20,20,20,0.97)' }}
        >
          Fiche de Claude {overlayOpen ? '−' : '+'}
        </button>
        {overlayOpen && (
          <div data-fiche-card style={{ ...cardStyle, position: 'fixed', top: '52px', left: '12px', width: `${placement.width}px`, maxHeight: '80vh', zIndex: 1002 }}>
            {body}
          </div>
        )}
      </>
    )
  }

  return (
    <div
      data-fiche-card
      style={{
        ...cardStyle,
        position: 'fixed',
        top: placement ? `${placement.top}px` : '0px',
        right: placement ? `${placement.right}px` : undefined,
        width: placement ? `${placement.width}px` : '300px',
        maxHeight: placement ? `${placement.maxHeight}px` : '92vh',
        visibility: placement ? 'visible' : 'hidden',
      }}
    >
      {body}
    </div>
  )
}

export default OrchestrationFicheCard

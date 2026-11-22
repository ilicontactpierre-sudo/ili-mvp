
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function EndScreen({ title, author, formUrl, bookUrl, nextPart = null, onNextPart = null }) {
  const navigate  = useNavigate()
  const [leaving, setLeaving]                 = useState(false)
  const [part1Visible, setPart1Visible]       = useState(false)
  const [part2Visible, setPart2Visible]       = useState(false)
  const [email, setEmail]                     = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState(null)
  const signatureRef = useRef(null)

  useEffect(() => {
    const t1 = setTimeout(() => setPart1Visible(true), 160)
    const t2 = setTimeout(() => setPart2Visible(true), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleSubscribe = async () => {
    if (!email.includes('@')) return
    setSubscribeStatus('loading')
    try {
      const res  = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setSubscribeStatus(data.success ? 'success' : 'error')
    } catch {
      setSubscribeStatus('error')
    }
  }

  // Retour à l'accueil : tout s'efface sauf le « ILi » du bas de page, qui part ensuite
  // prendre la place du logo de l'accueil (l'accueil fait le vol, voir HomePage).
  const handleReturnHome = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(() => {
      const el = signatureRef.current
      let logoFrom = null
      try {
        if (el) {
          const r = el.getBoundingClientRect()
          logoFrom = {
            x: r.left, y: r.top, w: r.width, h: r.height,
            fontSize: parseFloat(getComputedStyle(el).fontSize) || 13,
          }
        }
      } catch { logoFrom = null }
      navigate('/', { state: { fromEnd: true, logoFrom } })
    }, 650)
  }

  const mix = (pct) => `color-mix(in srgb, var(--color-text-focus) ${pct}%, transparent)`
  const dimColor     = mix(55)
  const subtleColor  = mix(65)
  const lineColor    = mix(11)
  const borderSoft   = mix(13)
  const borderHover  = mix(30)
  const surfaceHover = mix(5)
  const ctaBg        = mix(96)
  const ctaBgHover   = mix(100)
  const ctaText      = 'var(--color-bg)'
  const EASE         = 'cubic-bezier(0.16, 1, 0.3, 1)'
  const SOFT         = 'cubic-bezier(0.22, 1, 0.36, 1)'
  // Partie 2 : chaque élément arrive l'un après l'autre, du flou au net
  const part2Anim = (delayMs) => (part2Visible ? `es-in 1400ms ${SOFT} ${delayMs}ms forwards` : 'none')

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        textAlign: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text-focus)',
        fontFamily: 'var(--font-primary)',
        padding: '0 1.5rem',
      }}
    >
      <style>{`
        @keyframes es-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes es-in {
          from { opacity: 0; transform: translateY(10px); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        @keyframes es-line-grow {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
        .es-input { transition: border-color 200ms ease; }
        .es-input::placeholder { color: ${dimColor}; }
        .es-input:focus { border-color: ${borderHover} !important; outline: none; }
        .es-ghost-btn { transition: color 250ms ease, border-color 250ms ease, background 250ms ease; }
        .es-ghost-btn:hover {
          color: var(--color-text-focus) !important;
          border-color: ${borderHover} !important;
          background: ${surfaceHover} !important;
        }
        .es-cta-btn { transition: background 300ms ${EASE}, transform 160ms ease; }
        .es-cta-btn:hover  { background: ${ctaBgHover} !important; }
        .es-cta-btn:active { transform: scale(0.97) !important; }
        .es-link-btn { transition: color 300ms ${EASE}, border-color 300ms ${EASE}; }
        .es-link-btn:hover {
          color: var(--color-text-focus) !important;
          border-bottom-color: ${borderHover} !important;
        }
      `}</style>

      {/* ── PARTIE 1 : identité émotionnelle ─────────────────────────────────
          paddingTop: 28vh fixe — ne bougera jamais quand la partie 2 arrive.
          Tout le contenu de cette zone est staggeré individuellement.
      ──────────────────────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%',
        maxWidth: '26rem',
        paddingTop: '28vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: leaving ? 0 : 1,
        transition: `opacity 600ms ${SOFT}`,
      }}>

        <h1 className="es-in-anim" style={{
          margin: 0,
          fontWeight: 600,
          fontSize: 'clamp(1.7rem, 6vw, 2.2rem)',
          lineHeight: 1.18,
          letterSpacing: '-0.01em',
          opacity: 0,
          animation: part1Visible ? `es-in 1400ms ${SOFT} 40ms forwards` : 'none',
        }}>
          {title}
        </h1>

        <p className="es-in-anim" style={{
          margin: '0.65rem 0 0',
          fontFamily: 'var(--font-logo)',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: subtleColor,
          opacity: 0,
          animation: part1Visible ? `es-in 1400ms ${SOFT} 490ms forwards` : 'none',
        }}>
          {author}
        </p>

        {nextPart && onNextPart && (
          <button
            type="button"
            onClick={onNextPart}
            className="es-cta-btn es-in-anim"
            style={{
              marginTop: '2.6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.55rem',
              width: '100%',
              padding: '1.05rem 1.5rem',
              borderRadius: '999px',
              background: ctaBg,
              color: ctaText,
              border: 'none',
              fontFamily: 'var(--font-primary)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              opacity: 0,
              animation: part1Visible ? `es-in 1400ms ${SOFT} 840ms forwards` : 'none',
            }}
          >
            <span>{nextPart.title}</span>
            <span style={{ opacity: 0.48, fontSize: '0.82em' }}>→</span>
          </button>
        )}
      </div>

      {/* ── PARTIE 2 : soutien ───────────────────────────────────────────────
          Apparaît 2.6s après. marginTop fixe — la partie 1 ne bouge pas.
          Transition opacity + translateY sur le conteneur entier.
      ──────────────────────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%',
        maxWidth: '26rem',
        marginTop: '5vh',
        paddingBottom: '4rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: leaving ? 0 : 1,
        transition: `opacity 600ms ${SOFT}`,
        pointerEvents: part2Visible && !leaving ? 'auto' : 'none',
      }}>

        <div className="es-in-anim" style={{ width: '100%', opacity: 0, animation: part2Anim(0) }}>
          {/* Newsletter */}
          {subscribeStatus === 'success' ? (
            <p style={{ fontSize: '0.85rem', color: subtleColor, letterSpacing: '0.02em', marginBottom: '1.2rem' }}>
              À bientôt dans ta boîte mail.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', marginBottom: '1.2rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: subtleColor, letterSpacing: '0.01em' }}>
                Être prévenu de la prochaine histoire
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  className="es-input"
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
                  style={{
                    flex: 1,
                    padding: '0.78rem 1.1rem',
                    borderRadius: '999px',
                    border: '1px solid ' + borderSoft,
                    background: 'transparent',
                    color: 'var(--color-text-focus)',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-primary)',
                  }}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={subscribeStatus === 'loading'}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: 'none',
                    background: ctaBg,
                    color: ctaText,
                    fontSize: '1rem',
                    cursor: subscribeStatus === 'loading' ? 'wait' : 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 250ms ease, transform 150ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = ctaBgHover}
                  onMouseLeave={e => e.currentTarget.style.background = ctaBg}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {subscribeStatus === 'loading' ? '…' : '✔'}
                </button>
              </div>
              {subscribeStatus === 'error' && (
                <p style={{ margin: 0, fontSize: '0.75rem', color: subtleColor }}>
                  Une erreur est survenue, réessaie.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions secondaires */}
        <div className="es-in-anim" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap', justifyContent: 'center', opacity: 0, animation: part2Anim(250) }}>
          <a href="https://ko-fi.com/iliapp" target="_blank" rel="noreferrer"
            className="es-ghost-btn" style={ghostBtnStyle(borderSoft, subtleColor)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
            Soutenir
          </a>
          {formUrl && (
            <a href={formUrl} target="_blank" rel="noreferrer"
              className="es-ghost-btn" style={ghostBtnStyle(borderSoft, subtleColor)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>
                <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/>
              </svg>
              Avis
            </a>
          )}
          {bookUrl && (
            <a href={bookUrl} target="_blank" rel="noreferrer"
              className="es-ghost-btn" style={ghostBtnStyle(borderSoft, subtleColor)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              Le livre
            </a>
          )}
        </div>

        {/* Retour accueil */}
        <button
          type="button"
          onClick={handleReturnHome}
          className="es-link-btn es-in-anim"
          style={{
            marginTop: '2.8rem',
            opacity: 0,
            animation: part2Anim(500),
            border: 'none',
            borderBottom: `1px solid ${lineColor}`,
            borderRadius: 0,
            background: 'transparent',
            color: dimColor,
            fontFamily: 'var(--font-logo)',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            padding: '0.5rem 0',
            cursor: 'pointer',
          }}
        >
          Choisir une autre histoire
        </button>

      </div>

      {/* Signature : en bas de page. Au retour à l'accueil, elle devient le logo de l'accueil. */}
      <div
        className="es-in-anim"
        style={{
          marginTop: 'auto',
          paddingTop: '2.2rem',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
          opacity: 0,
          animation: part2Anim(750),
        }}
      >
        <span
          ref={signatureRef}
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-logo)',
            fontWeight: 300,
            fontSize: '13px',
            lineHeight: 1,
            letterSpacing: '0.32em',
            color: dimColor,
          }}
        >
          ILi
        </span>
      </div>
    </main>
  )
}

function ghostBtnStyle(borderSoft, subtleColor) {
  return {
    display: 'flex', alignItems: 'center', gap: '0.45rem',
    padding: '0.6rem 1.05rem', borderRadius: '999px',
    border: '1px solid ' + borderSoft, background: 'transparent',
    color: subtleColor, textDecoration: 'none',
    fontSize: '0.83rem', fontFamily: 'var(--font-primary)',
    letterSpacing: '0.01em',
  }
}

export default EndScreen
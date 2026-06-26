import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function EndScreen({ title, author, formUrl, bookUrl, nextPart = null, onNextPart = null }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // Le bloc "soutenir" n'apparaît qu'après un délai — laisser l'émotion respirer
  const [supportVisible, setSupportVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState(null) // null | 'loading' | 'success' | 'error'

  const handleSubscribe = async () => {
    if (!email.includes('@')) return
    setSubscribeStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      setSubscribeStatus(data.success ? 'success' : 'error')
    } catch {
      setSubscribeStatus('error')
    }
  }

  useEffect(() => {
    // Apparition principale après un court silence — l'histoire vient de finir
    const t1 = setTimeout(() => setVisible(true), 180)
    // Bloc soutien : apparaît 2.8s après, une fois que l'émotion a eu le temps d'exister
    const t2 = setTimeout(() => setSupportVisible(true), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleReturnHome = () => {
    setLeaving(true)
    setTimeout(() => navigate('/'), 900)
  }

  const mix = (pct) => `color-mix(in srgb, var(--color-text-focus) ${pct}%, transparent)`

  const lineColor   = mix(12)
  const subtleColor = mix(45)
  const dimColor    = mix(28)
  const borderSoft  = mix(12)
  const borderHover = mix(30)
  const surfaceHover = mix(5)
  const ctaBg       = mix(96)
  const ctaBgHover  = mix(100)
  const ctaText     = 'var(--color-bg)'

  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text-focus)',
        fontFamily: 'var(--font-primary)',
        padding: '3rem 1.5rem',
        opacity: leaving ? 0 : visible ? 1 : 0,
        transform: leaving
          ? 'translateY(-12px)'
          : visible
            ? 'translateY(0)'
            : 'translateY(16px)',
        transition: leaving
          ? `opacity 900ms ${EASE}, transform 900ms ${EASE}`
          : `opacity 1100ms ${EASE}, transform 1100ms ${EASE}`,
      }}
    >
      <style>{`
        @keyframes es-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes es-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .es-stagger {
          opacity: 0;
          animation: es-rise 800ms ${EASE} forwards;
        }
        .es-support-block {
          opacity: 0;
          animation: es-fade 900ms ${EASE} forwards;
        }
        .es-input::placeholder { color: ${dimColor}; }
        .es-input:focus { border-color: ${borderHover} !important; outline: none; }
        .es-ghost-btn:hover {
          color: var(--color-text-focus) !important;
          border-color: ${borderHover} !important;
          background: ${surfaceHover} !important;
        }
        .es-cta-btn {
          transition: background 300ms ${EASE}, transform 150ms ease, opacity 300ms ease;
        }
        .es-cta-btn:hover { background: ${ctaBgHover} !important; }
        .es-cta-btn:active { transform: scale(0.97) !important; }
        .es-link-btn:hover {
          color: var(--color-text-focus) !important;
          border-bottom-color: ${borderHover} !important;
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '26rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* ── Acte 1 : identité émotionnelle ── */}
        {/* "Fin de l'histoire" — discret, comme un générique */}
        <div
          className="es-stagger"
          style={{ animationDelay: '80ms' }}
        >
          <span style={{
            fontFamily: 'var(--font-logo)',
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: dimColor,
          }}>
            Fin de l'histoire
          </span>
        </div>

        {/* Trait de séparation */}
        <div
          className="es-stagger"
          style={{
            animationDelay: '160ms',
            width: '1.8rem',
            height: '1px',
            background: lineColor,
            margin: '1.2rem 0',
          }}
        />

        {/* Titre — le moment de gloire du texte */}
        <h1
          className="es-stagger"
          style={{
            animationDelay: '240ms',
            margin: 0,
            fontFamily: 'var(--font-primary)',
            fontWeight: 600,
            fontSize: 'clamp(1.5rem, 5.5vw, 2rem)',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>

        {/* Auteur */}
        <p
          className="es-stagger"
          style={{
            animationDelay: '320ms',
            margin: '0.6rem 0 0',
            fontFamily: 'var(--font-logo)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: subtleColor,
          }}
        >
          {author}
        </p>

        {/* ── Acte 2 : continuer l'aventure (si partie suivante) ── */}
        {nextPart && onNextPart && (
          <button
            type="button"
            onClick={onNextPart}
            className="es-cta-btn es-stagger"
            style={{
              animationDelay: '440ms',
              marginTop: '2.8rem',
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
            }}
          >
            <span>{nextPart.title}</span>
            <span style={{ opacity: 0.5, fontSize: '0.82em' }}>→</span>
          </button>
        )}

        {/* ── Acte 3 : soutien — retardé pour laisser l'émotion respirer ── */}
        {supportVisible && (
          <div
            className="es-support-block"
            style={{
              marginTop: nextPart ? '2.8rem' : '3.2rem',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0',
            }}
          >
            {/* Séparateur discret */}
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.6rem',
            }}>
              <div style={{ flex: 1, height: '1px', background: lineColor }} />
              <span style={{
                fontFamily: 'var(--font-logo)',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: dimColor,
                whiteSpace: 'nowrap',
              }}>
                Soutenir ILi
              </span>
              <div style={{ flex: 1, height: '1px', background: lineColor }} />
            </div>

            {/* Newsletter */}
            {subscribeStatus === 'success' ? (
              <p style={{
                fontSize: '0.85rem',
                color: subtleColor,
                letterSpacing: '0.02em',
                marginBottom: '1rem',
              }}>
                À bientôt dans votre boîte mail.
              </p>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                width: '100%',
                marginBottom: '1rem',
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: subtleColor,
                  letterSpacing: '0.02em',
                }}>
                  Être prévenu de la prochaine histoire
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    className="es-input"
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
                    style={{
                      flex: 1,
                      padding: '0.72rem 1rem',
                      borderRadius: '999px',
                      border: '1px solid ' + borderSoft,
                      background: 'transparent',
                      color: 'var(--color-text-focus)',
                      fontSize: '0.88rem',
                      fontFamily: 'var(--font-primary)',
                      transition: 'border-color 200ms ease',
                    }}
                  />
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribeStatus === 'loading'}
                    style={{
                      padding: '0.72rem 1.1rem',
                      borderRadius: '999px',
                      border: 'none',
                      background: ctaBg,
                      color: ctaText,
                      fontSize: '0.88rem',
                      fontFamily: 'var(--font-primary)',
                      fontWeight: 600,
                      cursor: subscribeStatus === 'loading' ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: `background 250ms ease`,
                    }}
                  >
                    {subscribeStatus === 'loading' ? '…' : '✔'}
                  </button>
                </div>
                {subscribeStatus === 'error' && (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: subtleColor }}>
                    Une erreur est survenue, réessayez.
                  </p>
                )}
              </div>
            )}

            {/* Actions secondaires */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.5rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              <a
                href="https://ko-fi.com/iliapp"
                target="_blank"
                rel="noreferrer"
                className="es-ghost-btn"
                style={ghostBtnStyle(borderSoft, subtleColor)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                  <line x1="6" y1="1" x2="6" y2="4"/>
                  <line x1="10" y1="1" x2="10" y2="4"/>
                  <line x1="14" y1="1" x2="14" y2="4"/>
                </svg>
                Soutenir
              </a>

              {formUrl && (
                <a
                  href={formUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="es-ghost-btn"
                  style={ghostBtnStyle(borderSoft, subtleColor)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>
                    <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/>
                  </svg>
                  Avis
                </a>
              )}

              {bookUrl && (
                <a
                  href={bookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="es-ghost-btn"
                  style={ghostBtnStyle(borderSoft, subtleColor)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  Le livre
                </a>
              )}
            </div>

          </div>
        )}

        {/* ── Retour accueil ── */}
        <button
          type="button"
          onClick={handleReturnHome}
          className="es-link-btn es-stagger"
          style={{
            animationDelay: '520ms',
            marginTop: '2.8rem',
            border: 'none',
            borderBottom: `1px solid ${lineColor}`,
            borderRadius: 0,
            background: 'transparent',
            color: dimColor,
            fontFamily: 'var(--font-logo)',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '0.5rem 0',
            cursor: 'pointer',
            transition: `color 300ms ${EASE}, border-color 300ms ${EASE}`,
          }}
        >
          Choisir une autre histoire
        </button>

      </div>

      {/* Signature ILi */}
      <div
        className="es-stagger"
        style={{
          animationDelay: '600ms',
          marginTop: '3rem',
          fontFamily: 'var(--font-logo)',
          fontWeight: 300,
          fontSize: '13px',
          letterSpacing: '0.32em',
          color: dimColor,
        }}
      >
        ILi
      </div>
    </main>
  )
}

function ghostBtnStyle(borderSoft, subtleColor) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.58rem 1rem',
    borderRadius: '999px',
    border: '1px solid ' + borderSoft,
    background: 'transparent',
    color: subtleColor,
    textDecoration: 'none',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-primary)',
    letterSpacing: '0.01em',
    transition: 'color 250ms ease, border-color 250ms ease, background 250ms ease',
  }
}

export default EndScreen

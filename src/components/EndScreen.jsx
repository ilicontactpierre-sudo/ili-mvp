import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function EndScreen({ title, author, formUrl, bookUrl, nextPart = null, onNextPart = null }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
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
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  const handleReturnHome = () => {
    setLeaving(true)
    setTimeout(() => navigate('/'), 1400)
  }

  // ── Tokens d'opacité, dérivés de --color-text-focus (s'adapte aux 4 thèmes) ──
  const mix = (pct) => `color-mix(in srgb, var(--color-text-focus) ${pct}%, transparent)`
  const lineColor      = mix(14)
  const labelColor     = mix(40)
  const bodyColor      = mix(72)
  const subtleColor    = mix(50)
  const dimColor       = mix(30)
  const borderSoft      = mix(14)
  const borderHover     = mix(32)
  const surfaceHover    = mix(5)
  const ctaBg           = mix(96)        // quasi blanc/quasi noir selon thème
  const ctaBgHover      = mix(100)
  const ctaText         = 'var(--color-bg)'

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
          ? 'translateY(-18px)'
          : visible
            ? 'translateY(0)'
            : 'translateY(14px)',
        transition: leaving
          ? `opacity 1400ms ${EASE}, transform 1400ms ${EASE}`
          : `opacity 1000ms ${EASE}, transform 1000ms ${EASE}`,
      }}
    >
      <style>{`
        @keyframes es-rise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .es-stagger {
          opacity: 0;
          animation: es-rise 700ms ${EASE} forwards;
        }
        .es-input::placeholder { color: ${dimColor}; }
        .es-input:focus { border-color: ${borderHover} !important; }
        .es-ghost-btn:hover {
          color: var(--color-text-focus) !important;
          border-color: ${borderHover} !important;
          background: ${surfaceHover} !important;
        }
        .es-cta-btn:hover { background: ${ctaBgHover} !important; }
        .es-link-btn:hover {
          color: var(--color-text-focus) !important;
          border-bottom-color: ${borderHover} !important;
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '26rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* ── Identité : signature ILi + générique de fin ── */}
        <div
          className="es-stagger"
          style={{ animationDelay: '60ms', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <span style={{
            fontFamily: 'var(--font-logo)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: dimColor,
          }}>
            Fin de l'histoire
          </span>

          <div style={{ width: '2.25rem', height: '1px', background: lineColor, margin: '1.1rem 0' }} />

          <h1 style={{
            margin: 0,
            fontFamily: 'var(--font-primary)',
            fontWeight: 600,
            fontSize: 'clamp(1.4rem, 5vw, 1.85rem)',
            lineHeight: 1.25,
            color: 'var(--color-text-focus)',
          }}>
            {title}
          </h1>
          <p style={{
            margin: '0.55rem 0 0',
            fontFamily: 'var(--font-logo)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: subtleColor,
          }}>
            {author}
          </p>
        </div>

        {/* ── Zone 1 : continuer l'aventure (CTA dominant) ── */}
        {nextPart && onNextPart && (
          <button
            type="button"
            onClick={onNextPart}
            className="es-cta-btn es-stagger"
            style={{
              animationDelay: '180ms',
              marginTop: '2.6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              width: '100%',
              padding: '1.05rem 1.5rem',
              borderRadius: '999px',
              background: ctaBg,
              color: ctaText,
              border: 'none',
              fontFamily: 'var(--font-primary)',
              fontSize: '1.02rem',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              transition: 'background 300ms ease, transform 150ms ease',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>{nextPart.title}</span>
            <span style={{ opacity: 0.55, fontSize: '0.85em' }}>→</span>
          </button>
        )}

        {/* ── Séparateur de section ── */}
        <div
          className="es-stagger"
          style={{
            animationDelay: '260ms',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            margin: nextPart ? '2.4rem 0 0' : '2.8rem 0 0',
          }}
        >
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

        {/* ── Zone 2 : newsletter + soutien ── */}
        <div
          className="es-stagger"
          style={{
            animationDelay: '340ms',
            marginTop: '1.6rem',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem',
          }}
        >
          {subscribeStatus === 'success' ? (
            <p style={{ fontSize: '0.88rem', color: subtleColor, letterSpacing: '0.02em' }}>
              ✓ À bientôt dans votre boîte mail.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: labelColor, letterSpacing: '0.02em' }}>
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
                    padding: '0.75rem 1.05rem',
                    borderRadius: '999px',
                    border: '1px solid ' + borderSoft,
                    background: 'transparent',
                    color: 'var(--color-text-focus)',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-primary)',
                    outline: 'none',
                    transition: 'border-color 200ms ease',
                  }}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={subscribeStatus === 'loading'}
                  style={{
                    padding: '0.75rem 1.15rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: ctaBg,
                    color: ctaText,
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-primary)',
                    fontWeight: 600,
                    cursor: subscribeStatus === 'loading' ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {subscribeStatus === 'loading' ? '…' : '✔'}
                </button>
              </div>
              {subscribeStatus === 'error' && (
                <p style={{ margin: 0, fontSize: '0.78rem', color: subtleColor }}>
                  Une erreur est survenue, réessayez.
                </p>
              )}
            </div>
          )}

          {/* Actions secondaires : pillules discrètes côte à côte */}
          <div style={{ display: 'flex', gap: '0.55rem', marginTop: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="https://ko-fi.com/iliapp"
              target="_blank"
              rel="noreferrer"
              className="es-ghost-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.62rem 1.05rem',
                borderRadius: '999px',
                border: '1px solid ' + borderSoft,
                background: 'transparent',
                color: subtleColor,
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-primary)',
                letterSpacing: '0.01em',
                transition: 'color 250ms ease, border-color 250ms ease, background 250ms ease',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.62rem 1.05rem',
                  borderRadius: '999px',
                  border: '1px solid ' + borderSoft,
                  background: 'transparent',
                  color: subtleColor,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-primary)',
                  letterSpacing: '0.01em',
                  transition: 'color 250ms ease, border-color 250ms ease, background 250ms ease',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.62rem 1.05rem',
                  borderRadius: '999px',
                  border: '1px solid ' + borderSoft,
                  background: 'transparent',
                  color: subtleColor,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-primary)',
                  letterSpacing: '0.01em',
                  transition: 'color 250ms ease, border-color 250ms ease, background 250ms ease',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                Le livre
              </a>
            )}
          </div>
        </div>

        {/* ── Retour à l'accueil ── */}
        <button
          type="button"
          onClick={handleReturnHome}
          className="es-link-btn es-stagger"
          style={{
            animationDelay: '420ms',
            marginTop: '2.4rem',
            border: 'none',
            borderBottom: '1px solid ' + borderSoft,
            borderRadius: 0,
            background: 'transparent',
            color: labelColor,
            fontFamily: 'var(--font-logo)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '0.5rem 0',
            cursor: 'pointer',
            transition: 'color 300ms ease, border-color 300ms ease',
          }}
        >
          Choisir une autre histoire
        </button>
      </div>

      <div
        className="es-stagger"
        style={{
          animationDelay: '500ms',
          marginTop: '3.5rem',
          fontFamily: 'var(--font-logo)',
          fontWeight: 300,
          fontSize: '13px',
          letterSpacing: '0.3em',
          color: dimColor,
        }}
      >
        ILi
      </div>
    </main>
  )
}

export default EndScreen

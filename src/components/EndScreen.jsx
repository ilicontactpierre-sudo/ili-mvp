import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function EndScreen({ title, author, formUrl, bookUrl }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const handleReturnHome = () => {
    setLeaving(true)
    setTimeout(() => navigate('/'), 1400)
  }

  const lineColor = 'color-mix(in srgb, var(--color-text-focus) 16%, transparent)'
  const btnColor = 'color-mix(in srgb, var(--color-text-focus) 55%, transparent)'
  const btnBorder = 'color-mix(in srgb, var(--color-text-focus) 20%, transparent)'
  const btnHoverColor = 'var(--color-text-focus)'
  const btnHoverBorder = 'color-mix(in srgb, var(--color-text-focus) 45%, transparent)'

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateRows: '1fr auto 1fr',
        alignItems: 'center',
        textAlign: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text-focus)',
        fontFamily: 'var(--font-primary)',
        padding: '2rem 1.5rem',
        opacity: leaving ? 0 : visible ? 1 : 0,
        transform: leaving
          ? 'translateY(-18px)'
          : visible
            ? 'translateY(0)'
            : 'translateY(14px)',
        transition: leaving
          ? 'opacity 1400ms cubic-bezier(0.87, 0, 0.13, 1), transform 1400ms cubic-bezier(0.87, 0, 0.13, 1)'
          : 'opacity 1000ms cubic-bezier(0.16, 1, 0.3, 1), transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div />

      <section style={{ width: '100%', maxWidth: '38rem', margin: '0 auto' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '11rem',
            height: '1px',
            margin: '0 auto 1.4rem',
            background: lineColor,
          }}
        />

        <p style={{ opacity: 0.65, fontSize: '0.95rem', letterSpacing: '0.02em' }}>
          {title} — {author}
        </p>

        {formUrl && (
          
            href={formUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: '2.2rem',
              display: 'inline-block',
              padding: '0.85rem 1.35rem',
              borderRadius: '999px',
              background: 'var(--color-text-focus)',
              color: 'var(--color-bg)',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 600,
            }}
            Partager mon avis
          </a>
        )}

        {bookUrl && (
          
            href={bookUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: formUrl ? '1rem' : '2.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              marginInline: 'auto',
              width: 'fit-content',
              padding: '0.75rem 1.35rem',
              borderRadius: '999px',
              border: '1px solid ' + btnBorder,
              background: 'transparent',
              color: btnColor,
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-primary)',
              letterSpacing: '0.03em',
              transition: 'color 400ms ease, border-color 400ms ease, background 400ms ease',
            }}
            onMouseEnter={function(e) {
              e.currentTarget.style.color = btnHoverColor
              e.currentTarget.style.borderColor = btnHoverBorder
              e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text-focus) 6%, transparent)'
            }}
            onMouseLeave={function(e) {
              e.currentTarget.style.color = btnColor
              e.currentTarget.style.borderColor = btnBorder
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Trouver le livre en librairie
          </a>
        )}

        <button
          type="button"
          onClick={handleReturnHome}
          style={{
            marginTop: (formUrl || bookUrl) ? '1.5rem' : '2.5rem',
            display: 'block',
            marginInline: 'auto',
            border: 'none',
            borderBottom: '1px solid ' + btnBorder,
            borderRadius: 0,
            background: 'transparent',
            color: btnColor,
            fontFamily: 'var(--font-primary)',
            fontSize: '1rem',
            letterSpacing: '0.04em',
            padding: '0.6rem 0',
            cursor: 'pointer',
            transition: 'color 400ms ease, border-color 400ms ease',
          }}
          onMouseEnter={function(e) {
            e.currentTarget.style.color = btnHoverColor
            e.currentTarget.style.borderBottomColor = btnHoverBorder
          }}
          onMouseLeave={function(e) {
            e.currentTarget.style.color = btnColor
            e.currentTarget.style.borderBottomColor = btnBorder
          }}
        >
          Choisir une autre histoire
        </button>
      </section>

      <div style={{
        alignSelf: 'end',
        opacity: 0.3,
        fontSize: '0.95rem',
        letterSpacing: '0.06em',
      }}>
        ILi
      </div>
    </main>
  )
}

export default EndScreen
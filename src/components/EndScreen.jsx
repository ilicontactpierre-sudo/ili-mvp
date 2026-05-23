import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function EndScreen({ title, author, formUrl }) {
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
            background: 'color-mix(in srgb, var(--color-text-focus) 16%, transparent)',
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
          >
            Partager mon avis
          </a>
        )}

        <button
          type="button"
          onClick={handleReturnHome}
          style={{
            marginTop: formUrl ? '1.5rem' : '2.5rem',
            display: 'block',
            marginInline: 'auto',
            border: 'none',
            borderBottom: '1px solid color-mix(in srgb, var(--color-text-focus) 20%, transparent)',
            borderRadius: 0,
            background: 'transparent',
            color: 'color-mix(in srgb, var(--color-text-focus) 55%, transparent)',
            fontFamily: 'var(--font-primary)',
            fontSize: '1rem',
            letterSpacing: '0.04em',
            padding: '0.6rem 0',
            cursor: 'pointer',
            transition: 'color 400ms ease, border-color 400ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--color-text-focus)'
            e.currentTarget.style.borderBottomColor = 'color-mix(in srgb, var(--color-text-focus) 45%, transparent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'color-mix(in srgb, var(--color-text-focus) 55%, transparent)'
            e.currentTarget.style.borderBottomColor = 'color-mix(in srgb, var(--color-text-focus) 20%, transparent)'
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
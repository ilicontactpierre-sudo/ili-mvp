function EndScreen({ title, author, formUrl, onRestart }) {
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
            background: 'rgba(255, 255, 255, 0.16)',
          }}
        />
        <p style={{ opacity: 0.65, fontSize: '0.95rem', letterSpacing: '0.02em' }}>
          {title} - {author}
        </p>
        <p style={{ marginTop: '1.5rem', fontSize: 'clamp(1.35rem, 5.2vw, 2rem)', lineHeight: 1.45 }}>
          Merci d'avoir vécu cette expérience.
        </p>

        <a
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

        <button
          type="button"
          onClick={onRestart}
          style={{
            marginTop: '1rem',
            display: 'block',
            marginInline: 'auto',
            border: 'none',
            background: 'transparent',
            color: 'rgba(255, 255, 255, 0.72)',
            fontFamily: 'var(--font-primary)',
            fontSize: '1rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '0.18rem',
          }}
        >
          Recommencer
        </button>
      </section>

      <div style={{ alignSelf: 'end', opacity: 0.55, fontSize: '0.95rem', letterSpacing: '0.06em' }}>
        ILi
      </div>
    </main>
  )
}

export default EndScreen

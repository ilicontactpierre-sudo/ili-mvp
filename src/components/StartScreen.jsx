import { useState } from 'react'
import { Howl } from 'howler'

function StartScreen({ title, author, soundsToPreload = [], savedProgress, onStart }) {
  const [phase, setPhase] = useState('idle')

  async function handleStart(resume) {
    if (phase !== 'idle') return
    setPhase('loading')

    const howlMap = new Map()

    if (soundsToPreload.length) {
      const preloadTasks = soundsToPreload.map((sound) => {
        return new Promise((resolve) => {
          const howl = new Howl({
            src: [sound.url],
            preload: true,
            loop: Boolean(sound.loop),
          })
          let isSettled = false
          const settle = () => {
            if (isSettled) return
            isSettled = true
            window.clearTimeout(fallbackTimer)
            resolve()
          }
          const fallbackTimer = window.setTimeout(settle, 8000)
          howlMap.set(sound.id, howl)
          howl.once('load', settle)
          howl.once('loaderror', settle)
          howl.load()
        })
      })
      await Promise.all(preloadTasks)
    }

    setPhase('exiting')
    window.setTimeout(() => onStart(howlMap, resume), 520)
  }

  const hasProgress = savedProgress && savedProgress.segmentIndex > 0

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text-focus)',
        fontFamily: 'var(--font-primary)',
        padding: '2rem 1.5rem',
        opacity: phase === 'exiting' ? 0 : 1,
        transform: phase === 'exiting' ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'opacity 520ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 520ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      <section style={{ display: 'grid', gap: '1.1rem', width: '100%', maxWidth: '40rem' }}>
        <h1 style={{ fontSize: 'clamp(2.4rem, 9vw, 4rem)', fontWeight: 600, lineHeight: 1.2 }}>
          {title}
        </h1>
        <p style={{ opacity: 0.82, fontSize: 'clamp(1.1rem, 4.6vw, 1.55rem)' }}>{author}</p>

        {phase === 'loading' || phase === 'exiting' ? (
          <p style={{ marginTop: '3.1rem', opacity: 0.92, fontSize: 'clamp(1.2rem, 5vw, 1.7rem)' }}>
            Chargement de l'expérience sonore...
          </p>
        ) : hasProgress ? (
          <div style={{ marginTop: '3.1rem', display: 'grid', gap: '1rem' }}>
            <p style={{ opacity: 0.5, fontSize: 'clamp(0.8rem, 3vw, 1rem)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-logo)' }}>
              Tu as déjà commencé cette histoire
            </p>
            <button
              onPointerUp={(e) => { e.stopPropagation(); handleStart(true) }}
              style={btnStyle(true)}
            >
              Reprendre
            </button>
            <button
              onPointerUp={(e) => { e.stopPropagation(); handleStart(false) }}
              style={btnStyle(false)}
            >
              Recommencer depuis le début
            </button>
          </div>
        ) : (
          <p
            onPointerUp={(e) => { e.stopPropagation(); handleStart(false) }}
            style={{ marginTop: '3.1rem', opacity: 0.92, fontSize: 'clamp(1.2rem, 5vw, 1.7rem)', cursor: 'pointer' }}
          >
            Lire avec ILi
          </p>
        )}
      </section>
    </main>
  )
}

function btnStyle(primary) {
  return {
    background: primary ? 'rgba(255,255,255,0.1)' : 'transparent',
    border: primary ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    color: primary ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)',
    fontFamily: 'var(--font-primary)',
    fontSize: 'clamp(1rem, 4vw, 1.35rem)',
    padding: '0.9rem 1.5rem',
    cursor: 'pointer',
    transition: 'all 200ms ease',
    WebkitTapHighlightColor: 'transparent',
  }
}

export default StartScreen
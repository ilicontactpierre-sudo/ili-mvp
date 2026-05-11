import { useState } from 'react'
import { Howl } from 'howler'

function StartScreen({ title, author, soundsToPreload = [], onStart }) {
  const [phase, setPhase] = useState('idle')

  async function handleStart(event) {
    if (phase !== 'idle') {
      return
    }

    event.stopPropagation()
    setPhase('loading')

    if (!soundsToPreload.length) {
      setPhase('exiting')
      window.setTimeout(() => onStart(new Map()), 520)
      return
    }

    const howlMap = new Map()

    const preloadTasks = soundsToPreload.map((sound) => {
      return new Promise((resolve) => {
        const howl = new Howl({
          src: [sound.url],
          preload: true,
          loop: Boolean(sound.loop),
        })

        let isSettled = false
        const settle = () => {
          if (isSettled) {
            return
          }
          isSettled = true
          window.clearTimeout(fallbackTimer)
          resolve()
        }

        const fallbackTimer = window.setTimeout(() => {
          settle()
        }, 8000)

        howlMap.set(sound.id, howl)
        howl.once('load', settle)
        howl.once('loaderror', settle)
        howl.load()
      })
    })

    await Promise.all(preloadTasks)
    setPhase('exiting')
    window.setTimeout(() => onStart(howlMap), 520)
  }

  return (
    <main
      onPointerUp={handleStart}
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
        transition:
          'opacity 520ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 520ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      <section style={{ display: 'grid', gap: '1.1rem', width: '100%', maxWidth: '40rem' }}>
        <h1 style={{ fontSize: 'clamp(2.4rem, 9vw, 4rem)', fontWeight: 600, lineHeight: 1.2 }}>
          {title}
        </h1>
        <p style={{ opacity: 0.82, fontSize: 'clamp(1.1rem, 4.6vw, 1.55rem)' }}>{author}</p>
        <p style={{ marginTop: '3.1rem', opacity: 0.92, fontSize: 'clamp(1.2rem, 5vw, 1.7rem)' }}>
          {phase === 'loading' || phase === 'exiting'
            ? "Chargement de l'experience sonore..."
            : 'Lire avec ILi'}
        </p>
      </section>
    </main>
  )
}

export default StartScreen

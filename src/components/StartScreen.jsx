import { useState } from 'react'
import { Howl } from 'howler'

function StartScreen({ title, author, segmentCount = 0, segments = [], soundsToPreload = [], savedProgress, onStart }) {
  const [phase, setPhase] = useState('idle')
  const minutes = Math.ceil(segmentCount * 3 / 60)
  const durationLabel = segmentCount === 0
    ? null
    : minutes < 1
      ? '< 1 MIN DE LECTURE'
      : `~ ${minutes} MIN DE LECTURE`
  const minutesRead = hasProgress && segmentCount > 0
    ? Math.ceil(savedProgress.segmentIndex * 3 / 60)
    : null
  const dontLabel = minutesRead !== null
    ? minutesRead < 1
      ? 'DONT < 1 MIN DÉJÀ LUES'
      : `DONT ~ ${minutesRead} MIN DÉJÀ LUES`
    : null
  const hasProgress = savedProgress && savedProgress.segmentIndex > 0
  const lastSegmentText = hasProgress && segments.length > 0
    ? (() => {
        const seg = segments[savedProgress.segmentIndex]
        const text = seg?.text ?? ''
        return text.length > 80 ? text.slice(0, 80).trimEnd() + '…' : text
      })()
    : null
  const prevSegmentText = hasProgress && segments.length > 0 && savedProgress.segmentIndex > 1
    ? (() => {
        const seg = segments[savedProgress.segmentIndex - 1]
        const text = seg?.text ?? ''
        return text.length > 60 ? text.slice(0, 60).trimEnd() + '…' : text
      })()
    : null

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

  const styleTag = (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  )

  return (
    <main
      onPointerUp={!hasProgress && phase === 'idle' ? (e) => { e.stopPropagation(); handleStart(false) } : undefined}
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
        transition: phase === 'exiting'
          ? 'opacity 520ms cubic-bezier(0.4, 0, 1, 1), transform 520ms cubic-bezier(0.4, 0, 1, 1)'
          : 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
        animation: 'fadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
        cursor: !hasProgress && phase === 'idle' ? 'pointer' : 'default',
      }}
    >
      {styleTag}
      <section style={{ display: 'grid', gap: '1.1rem', width: '100%', maxWidth: '40rem' }}>
        <h1 style={{ fontSize: 'clamp(2.4rem, 9vw, 4rem)', fontWeight: 600, lineHeight: 1.2 }}>
          {title}
        </h1>
        <p style={{ opacity: 0.82, fontSize: 'clamp(1.1rem, 4.6vw, 1.55rem)' }}>{author}</p>
        {durationLabel && (
          <p style={{
            opacity: 0.28,
            fontSize: 'clamp(0.6rem, 2.2vw, 0.72rem)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-logo)',
            marginTop: '-0.3rem',
          }}>
            {durationLabel}
          </p>
        )}
        {dontLabel && (
          <p style={{
            opacity: 0.18,
            fontSize: 'clamp(0.55rem, 2vw, 0.66rem)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-logo)',
            marginTop: '-0.5rem',
          }}>
            {dontLabel}
          </p>
        )}
        {/* Bloc à hauteur fixe pour éviter le saut au chargement */}
        <div style={{ marginTop: '4rem', minHeight: '12rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {phase === 'loading' || phase === 'exiting' ? (
            <p style={{
              opacity: 0.28,
              fontSize: 'clamp(0.65rem, 2.5vw, 0.78rem)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-logo)',
            }}>
              Chargement...
            </p>
          ) : hasProgress ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.1rem',
              animation: 'fadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
              width: '100%',
            }}>
              {progressPercent !== null && (
                <p style={{
                  opacity: 0.28,
                  fontSize: 'clamp(0.6rem, 2.2vw, 0.72rem)',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-logo)',
                  marginBottom: '1.6rem',
                }}>
                  {progressPercent}% LU
                </p>
              )}
              {prevSegmentText && (
                <p style={{
                  opacity: 0.2,
                  fontSize: 'clamp(0.8rem, 2.8vw, 0.92rem)',
                  fontFamily: 'var(--font-primary)',
                  lineHeight: 1.5,
                  marginBottom: '0.6rem',
                  maxWidth: '28rem',
                  textAlign: 'center',
                }}>
                  {prevSegmentText}
                </p>
              )}
              {lastSegmentText && (
                <p style={{
                  opacity: 0.38,
                  fontSize: 'clamp(0.85rem, 3vw, 1rem)',
                  fontStyle: 'italic',
                  fontFamily: 'var(--font-primary)',
                  lineHeight: 1.55,
                  marginBottom: '2rem',
                  maxWidth: '28rem',
                  textAlign: 'center',
                }}>
                  «&nbsp;{lastSegmentText}&nbsp;»
                </p>
              )}
              <button
                onPointerUp={(e) => { e.stopPropagation(); handleStart(true) }}
                style={btnStyle(true)}
              >
                Continuer
              </button>
              <div style={{ height: '1.6rem' }} />
              <button
                onPointerUp={(e) => { e.stopPropagation(); handleStart(false) }}
                style={btnStyle(false)}
              >
                Recommencer
              </button>
            </div>
          ) : null}
        </div>

      </section>
    </main>
  )
}

function btnStyle(primary) {
  return {
    background: 'transparent',
    border: 'none',
    borderBottom: primary
      ? '1px solid color-mix(in srgb, var(--color-text-focus) 35%, transparent)'
      : '1px solid color-mix(in srgb, var(--color-text-focus) 10%, transparent)',
    borderRadius: 0,
    color: primary
      ? 'color-mix(in srgb, var(--color-text-focus) 90%, transparent)'
      : 'color-mix(in srgb, var(--color-text-focus) 30%, transparent)',
    fontFamily: 'var(--font-primary)',
    fontSize: 'clamp(1rem, 3.8vw, 1.25rem)',
    fontWeight: primary ? 400 : 300,
    letterSpacing: '0.04em',
    padding: '0.75rem 0',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    transition: 'color 300ms ease, border-color 300ms ease',
  }
}

export default StartScreen
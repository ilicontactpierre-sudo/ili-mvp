import { useState, useEffect, useRef } from 'react'

// ─── Sons digicode (Web Audio API) ───────────────────────────────────────────
function useKeySound() {
  const ctxRef = useRef(null)

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return ctxRef.current
  }

  const playTock = () => {
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(820, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06)
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.09)
    } catch {}
  }

  const playSuccess = () => {
    try {
      const ctx = getCtx()
      const freqs = [660, 880, 1100]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
        gain.gain.setValueAtTime(0.13, ctx.currentTime + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.18)
        osc.start(ctx.currentTime + i * 0.1)
        osc.stop(ctx.currentTime + i * 0.1 + 0.2)
      })
    } catch {}
  }

  const playError = () => {
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.22)
      gain.gain.setValueAtTime(0.14, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.26)
    } catch {}
  }

  const playDelete = () => {
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.07)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
    } catch {}
  }

  return { playTock, playSuccess, playError, playDelete }
}

// ─── Distance de Levenshtein (réponse "presque juste") ────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    }
  }
  return dp[m][n]
}

// ─── Courbes d'animation premium ─────────────────────────────────────────────
const EASE = {
  out:    'cubic-bezier(0.16, 1, 0.3, 1)',       // spring out
  inOut:  'cubic-bezier(0.76, 0, 0.24, 1)',       // S-curve
  in:     'cubic-bezier(0.55, 0, 1, 0.45)',       // ease in sharp
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',    // léger overshoot
}

// ─── Hook : monte → visible → descend ────────────────────────────────────────
function useReveal(delay = 0) {
  const [phase, setPhase] = useState('hidden') // hidden → entering → visible → leaving
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('entering'), delay)
    const t2 = setTimeout(() => setPhase('visible'), delay + 20)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [delay])
  return phase
}

// ─── Overlay principal ────────────────────────────────────────────────────────
function GameOverlay({ gameMode, onResolved }) {
  const [leaving, setLeaving] = useState(false)
  const [visible, setVisible] = useState(false)

  // ── Mémoire : clé unique par gameMode ──
  const memoryKey = `ili_game_${JSON.stringify({ t: gameMode?.type, a: gameMode?.answer ?? gameMode?.seconds ?? gameMode?.imageUrl ?? '' })}`
  const alreadySolved = (() => {
    try { return sessionStorage.getItem(memoryKey) === '1' } catch { return false }
  })()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  const handleResolved = () => {
    try { sessionStorage.setItem(memoryKey, '1') } catch {}
    setLeaving(true)
    setVisible(false)
    setTimeout(onResolved, 680)
  }

  const type = gameMode?.type

  // ── Mode "déjà vu" ──
  const [forceReplay, setForceReplay] = useState(false)

  if (alreadySolved && !forceReplay) {
    return (
      <>
        <style>{GLOBAL_KEYFRAMES}</style>
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg, #f5f0e8)',
          opacity: visible && !leaving ? 1 : 0,
          transform: leaving ? 'scale(1.015)' : visible ? 'scale(1)' : 'scale(0.985)',
          transition: `opacity 640ms ${EASE.inOut}, transform 640ms ${EASE.inOut}`,
          padding: '2rem',
          boxSizing: 'border-box',
        }}>
          <AnimatedWrapper style={{ gap: '1.4rem' }}>
            <p style={{
              fontSize: '0.78rem',
              color: 'var(--color-text-focus, #222)',
              opacity: 0.4,
              textAlign: 'center',
              letterSpacing: '0.08em',
              fontStyle: 'italic',
              margin: 0,
            }}>
              {gameMode?.alreadySolvedMessage || 'vous connaissez déjà la réponse'}
            </p>
            <ContinueBtn onClick={handleResolved} label="continuer" delay={200} />
            <button
              onClick={() => setForceReplay(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.68rem',
                color: 'var(--color-text-focus, #222)',
                opacity: 0.25,
                letterSpacing: '0.08em',
                fontStyle: 'italic',
                fontFamily: 'var(--font-primary, Georgia, serif)',
                padding: '0.25rem',
                marginTop: '-0.5rem',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.55'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.25'}
            >
              rejouer
            </button>
          </AnimatedWrapper>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{GLOBAL_KEYFRAMES}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg, #f5f0e8)',
          opacity: visible && !leaving ? 1 : 0,
          transform: leaving
            ? 'scale(1.015)'
            : visible ? 'scale(1)' : 'scale(0.985)',
          transition: `opacity 640ms ${EASE.inOut}, transform 640ms ${EASE.inOut}`,
          padding: '2rem',
          boxSizing: 'border-box',
          willChange: 'opacity, transform',
        }}
      >
        {type === 'image'     && <GameImage     data={gameMode} onResolved={handleResolved} />}
        {type === 'filmstrip' && <GameFilmstrip data={gameMode} onResolved={handleResolved} />}
        {type === 'document'  && <GameDocument  data={gameMode} onResolved={handleResolved} />}
        {type === 'message' && <GameMessage data={gameMode} onResolved={handleResolved} />}
        {type === 'code'    && <GameCode    data={gameMode} onResolved={handleResolved} />}
        {type === 'riddle'  && <GameRiddle  data={gameMode} onResolved={handleResolved} />}
        {type === 'timer'    && <GameTimer    data={gameMode} onResolved={handleResolved} />}
        {type === 'sequence' && <GameSequence data={gameMode} onResolved={handleResolved} />}
        {type === 'journal'  && <GameJournal  data={gameMode} onResolved={handleResolved} />}
        {type === 'echo'     && <GameEcho     data={gameMode} onResolved={handleResolved} />}
        {type === 'crypte'   && <GameCrypte   data={gameMode} onResolved={handleResolved} />}
      </div>
    </>
  )
}

// ─── Keyframes globaux ────────────────────────────────────────────────────────
const GLOBAL_KEYFRAMES = `
  @keyframes game-shards {
    0%   { clip-path: polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%); opacity: 0; }
    15%  { clip-path: polygon(30% 0%, 70% 0%, 85% 100%, 15% 100%); opacity: 0.6; }
    35%  { clip-path: polygon(10% 0%, 90% 0%, 100% 80%, 0% 80%);   opacity: 0.8; }
    55%  { clip-path: polygon(5% 10%, 95% 5%, 98% 95%, 2% 90%);    opacity: 0.9; }
    75%  { clip-path: polygon(2% 2%, 98% 0%, 100% 98%, 0% 100%);   opacity: 0.95; }
    100% { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); opacity: 1; }
  }
  @keyframes game-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes game-shake {
    0%   { transform: translateX(0); }
    15%  { transform: translateX(-10px); }
    30%  { transform: translateX(9px); }
    45%  { transform: translateX(-6px); }
    60%  { transform: translateX(5px); }
    75%  { transform: translateX(-3px); }
    100% { transform: translateX(0); }
  }
  @keyframes game-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes game-success-pop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.06); }
    70%  { transform: scale(0.97); }
    100% { transform: scale(1); }
  }
`

// ─── Wrapper animé commun ─────────────────────────────────────────────────────
function AnimatedWrapper({ children, style = {} }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      width: '100%',
      maxWidth: '480px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem',
      fontFamily: 'var(--font-primary, Georgia, serif)',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity 700ms ${EASE.out}, transform 700ms ${EASE.out}`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Bouton continuer ─────────────────────────────────────────────────────────
function ContinueBtn({ onClick, label = 'continuer', delay = 0 }) {
  const [ready, setReady] = useState(false)
  const [hovered, setHovered] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none',
        border: '1px solid var(--color-text-focus, #222)',
        color: 'var(--color-text-focus, #222)',
        fontFamily: 'var(--font-primary, Georgia, serif)',
        fontSize: '0.82rem',
        letterSpacing: '0.1em',
        padding: '0.65rem 2.2rem',
        borderRadius: '2px',
        cursor: 'pointer',
        opacity: ready ? (hovered ? 1 : 0.55) : 0,
        transform: ready ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 500ms ${EASE.out}, transform 500ms ${EASE.out}`,
      }}
    >
      {label}
    </button>
  )
}

// ─── Hint animé ──────────────────────────────────────────────────────────────
function Hint({ children, delay = 400 }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <p style={{
      fontSize: '0.72rem',
      color: 'var(--color-text-focus, #222)',
      opacity: show ? 0.35 : 0,
      textAlign: 'center',
      letterSpacing: '0.06em',
      margin: 0,
      transform: show ? 'translateY(0)' : 'translateY(8px)',
      transition: `opacity 600ms ${EASE.inOut}, transform 600ms ${EASE.inOut}`,
    }}>
      {children}
    </p>
  )
}

// ─── Animations d'apparition image ───────────────────────────────────────────
function useImageAnimation(animation, imgLoaded) {
  const canvasRef = useRef(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!imgLoaded || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = canvas.dataset.src

    img.onload = () => {
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight

      if (animation === 'pixels') {
        // Pixels aléatoires
        ctx.drawImage(img, 0, 0)
        const total = canvas.width * canvas.height
        const batchSize = Math.ceil(total / 60)
        const indices = Array.from({ length: total }, (_, i) => i)
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]]
        }
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const scratch = ctx.createImageData(canvas.width, canvas.height)
        let step = 0
        const tick = () => {
          const start = step * batchSize
          const end = Math.min(start + batchSize, total)
          for (let k = start; k < end; k++) {
            const px = indices[k] * 4
            scratch.data[px]   = imageData.data[px]
            scratch.data[px+1] = imageData.data[px+1]
            scratch.data[px+2] = imageData.data[px+2]
            scratch.data[px+3] = imageData.data[px+3]
          }
          ctx.putImageData(scratch, 0, 0)
          step++
          if (step * batchSize < total) requestAnimationFrame(tick)
          else setDone(true)
        }
        requestAnimationFrame(tick)

      } else if (animation === 'scan') {
        // Scan vertical
        ctx.drawImage(img, 0, 0)
        const lineData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        let y = 0
        const step = Math.ceil(canvas.height / 80)
        const tick = () => {
          ctx.putImageData(lineData, 0, 0, 0, 0, canvas.width, y)
          y += step
          if (y < canvas.height) requestAnimationFrame(tick)
          else { ctx.putImageData(lineData, 0, 0); setDone(true) }
        }
        requestAnimationFrame(tick)

      } else {
        // fade / develop / shards / fog → CSS uniquement
        ctx.drawImage(img, 0, 0)
        setDone(true)
      }
    }
  }, [imgLoaded, animation])

  return { canvasRef, done }
}

function GameImage({ data, onResolved }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [cssVisible, setCssVisible] = useState(false)
  const animation = data.animation || 'fade'
  const useCanvas = animation === 'pixels' || animation === 'scan'
  const { canvasRef, done } = useImageAnimation(useCanvas ? animation : null, imgLoaded)

  useEffect(() => {
    if (!imgLoaded) return
    if (!useCanvas) setTimeout(() => setCssVisible(true), 60)
  }, [imgLoaded, useCanvas])

  // Styles CSS selon animation
  const getImgStyle = () => {
    const base = { width: '100%', height: 'auto', display: 'block' }
    if (animation === 'develop') return {
      ...base,
      filter: cssVisible ? 'saturate(1) brightness(1)' : 'saturate(0) brightness(2)',
      transition: `filter 1800ms ${EASE.inOut}`,
    }
    if (animation === 'fog') return {
      ...base,
      opacity: cssVisible ? 1 : 0,
      filter: cssVisible ? 'blur(0px)' : 'blur(18px)',
      transition: `opacity 1400ms ${EASE.inOut}, filter 1600ms ${EASE.inOut}`,
    }
    if (animation === 'shards') return {
      ...base,
      animation: cssVisible ? `game-shards 900ms ${EASE.spring} forwards` : 'none',
      opacity: cssVisible ? undefined : 0,
    }
    // fade par défaut
    return {
      ...base,
      opacity: cssVisible ? 1 : 0,
      transition: `opacity 900ms ${EASE.inOut}`,
    }
  }

  const isVisible = useCanvas ? done : cssVisible

  return (
    <AnimatedWrapper style={{ gap: '1.8rem' }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        borderRadius: '3px', overflow: 'hidden',
        boxShadow: '0 12px 60px rgba(0,0,0,0.14)',
      }}>
        {/* Image cachée pour déclencher onLoad */}
        <img
          src={data.imageUrl} alt=""
          onLoad={() => setImgLoaded(true)}
          style={{ display: 'none' }}
        />
        {useCanvas ? (
          <canvas
            ref={canvasRef}
            data-src={data.imageUrl}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        ) : (
          <img
            src={data.imageUrl}
            alt={data.caption || ''}
            style={getImgStyle()}
          />
        )}
      </div>
      {data.caption && (
        <p style={{
          fontSize: 'clamp(0.82rem, 1.8vw, 0.95rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center', lineHeight: 1.65,
          opacity: isVisible ? 0.6 : 0, fontStyle: 'italic', margin: 0,
          transition: `opacity 700ms ${EASE.inOut} 400ms`,
        }}>
          {data.caption}
        </p>
      )}
      <div style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 600ms ${EASE.out} 500ms, transform 600ms ${EASE.out} 500ms`,
      }}>
        <ContinueBtn onClick={onResolved} delay={600} />
      </div>
    </AnimatedWrapper>
  )
}

// ─── Type : Pellicule ─────────────────────────────────────────────────────────
function GameFilmstrip({ data, onResolved }) {
  const images = (data.images || []).filter(Boolean)
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const duration = data.interval || 2500
  const timerRef = useRef(null)

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  useEffect(() => {
    clearTimers()
    // Fade in
    timerRef.current = setTimeout(() => {
      setVisible(true)
      // Après la durée d'affichage → fade out puis image suivante
      timerRef.current = setTimeout(() => {
        setVisible(false)
        timerRef.current = setTimeout(() => {
          if (current < images.length - 1) {
            setCurrent(c => c + 1)
          } else {
            setAllDone(true)
          }
        }, 900) // durée du fade out avant de changer
      }, duration)
    }, 300)
    return clearTimers
  }, [current])

  const opacity = visible ? 1 : 0
  const brightness = visible ? 1 : 0.85

  return (
    <div style={{
      width: '100%', maxWidth: '480px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: '1.8rem',
      fontFamily: 'var(--font-primary, Georgia, serif)',
    }}>
      <div style={{
        width: '100%', position: 'relative',
        borderRadius: '2px', overflow: 'hidden',
        boxShadow: '0 16px 64px rgba(0,0,0,0.3)',
        backgroundColor: '#000',
        minHeight: '200px',
      }}>
        {images[current] && (
          <img
            key={current}
            src={images[current]}
            alt=""
            style={{
              width: '100%', height: 'auto', display: 'block',
              opacity,
              filter: `brightness(${brightness}) sepia(0.15)`,
              transition: `opacity 800ms ${EASE.inOut}, filter 1200ms ${EASE.inOut}`,
            }}
          />
        )}
        {/* Compteur */}
        <div style={{
          position: 'absolute', bottom: '0.75rem', right: '0.75rem',
          fontSize: '0.65rem', letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace',
        }}>
          {current + 1} / {images.length}
        </div>
      </div>

      {/* Points de progression */}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {images.map((_, i) => (
          <div key={i} style={{
            width: i === current ? '1.4rem' : '0.35rem',
            height: '0.35rem',
            borderRadius: '999px',
            backgroundColor: 'var(--color-text-focus, #222)',
            opacity: i <= current ? 0.7 : 0.2,
            transition: `all 500ms ${EASE.inOut}`,
          }} />
        ))}
      </div>

      {allDone && <ContinueBtn onClick={onResolved} delay={200} />}
    </div>
  )
}

// ─── Type : Minuteur ─────────────────────────────────────────────────────────
function GameTimer({ data, onResolved }) {
  const total = data.seconds || 30
  const timerStyle = data.timerStyle || 'arc'
  const resetOnTap = data.resetOnTap || false

  const [remaining, setRemaining] = useState(total)
  const [expired, setExpired] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [resetFlash, setResetFlash] = useState(false)

  // Compte à rebours
  useEffect(() => {
    if (expired) return
    if (remaining <= 0) {
      setExpired(true)
      setTimeout(onResolved, 1400)
      return
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, expired])

  // Respiration sous 10s
  useEffect(() => {
    if (remaining >= 10 || expired) { setPulse(false); return }
    const interval = setInterval(() => setPulse(p => !p), 600 + remaining * 30)
    return () => clearInterval(interval)
  }, [remaining, expired])

  // Reset au tap
  const handleTap = () => {
    if (!resetOnTap || expired) return
    setRemaining(total)
    setResetFlash(true)
    setTimeout(() => setResetFlash(false), 400)
  }

  const pct = remaining / total
  const color = pct > 0.5
    ? 'var(--color-text-focus, #222)'
    : pct > 0.25 ? '#d4820a' : '#c0392b'

  return (
    <AnimatedWrapper
      style={{ gap: '1.6rem', cursor: resetOnTap && !expired ? 'pointer' : 'default' }}
      onClick={handleTap}
    >
      {data.prompt && (
        <p style={{
          fontSize: 'clamp(0.88rem, 2vw, 1rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center', lineHeight: 1.6,
          opacity: 0.75, margin: 0,
        }}>
          {data.prompt}
        </p>
      )}

      {/* Flash reset */}
      {resetFlash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          backgroundColor: 'var(--color-text-focus, #222)',
          opacity: 0.06, pointerEvents: 'none',
          animation: `game-fade-up 400ms ${EASE.out}`,
        }} />
      )}

      {/* Arc SVG */}
      {timerStyle === 'arc' && (
        <div style={{
          position: 'relative', width: '126px', height: '126px',
          opacity: pulse ? 0.88 : 1,
          transition: `opacity ${600 + remaining * 30}ms ${EASE.inOut}`,
        }}>
          <svg width="126" height="126" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="63" cy="63" r="52" fill="none"
              stroke="var(--color-text-focus, #222)" strokeWidth="1" opacity="0.1" />
            <circle cx="63" cy="63" r="52" fill="none"
              stroke={color} strokeWidth="1.5"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - pct)}
              strokeLinecap="round"
              style={{ transition: `stroke-dashoffset 0.95s ${EASE.inOut}, stroke 0.8s ${EASE.inOut}` }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-primary, Georgia, serif)',
            fontSize: remaining < 10 ? '2.6rem' : '2.1rem',
            color, letterSpacing: '-0.02em',
            transition: `color 0.8s ${EASE.inOut}, font-size 300ms ${EASE.spring}`,
          }}>
            {expired ? '—' : remaining}
          </div>
        </div>
      )}

      {/* Barre de progression */}
      {timerStyle === 'bar' && (
        <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            width: '100%', height: '2px',
            backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '999px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct * 100}%`,
              backgroundColor: color,
              borderRadius: '999px',
              transition: `width 0.95s ${EASE.inOut}, background-color 0.8s ${EASE.inOut}`,
              opacity: pulse ? 0.7 : 1,
            }} />
          </div>
          <div style={{
            textAlign: 'center',
            fontFamily: 'var(--font-primary, Georgia, serif)',
            fontSize: '1.6rem', color, letterSpacing: '-0.02em',
            transition: `color 0.8s ${EASE.inOut}`,
          }}>
            {expired ? '—' : remaining}
          </div>
        </div>
      )}

      {/* Rétro */}
      {timerStyle === 'retro' && (
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 'clamp(3rem, 10vw, 5rem)',
          color, letterSpacing: '0.1em',
          opacity: pulse ? 0.7 : 1,
          transition: `opacity ${600 + remaining * 30}ms ${EASE.inOut}, color 0.8s ${EASE.inOut}`,
          textShadow: `0 0 20px ${color}44`,
        }}>
          {expired ? '--' : String(Math.floor(remaining / 60)).padStart(2,'0') + ':' + String(remaining % 60).padStart(2,'0')}
        </div>
      )}

      {/* Invisible */}
      {timerStyle === 'hidden' && !expired && (
        <div style={{ height: '60px' }} />
      )}

      {/* Message expiration */}
      <p style={{
        fontSize: 'clamp(0.82rem, 1.8vw, 0.92rem)',
        color: 'var(--color-text-focus, #222)',
        textAlign: 'center', lineHeight: 1.6,
        opacity: expired ? 0.55 : 0, fontStyle: 'italic', margin: 0,
        transform: expired ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 700ms ${EASE.out}, transform 700ms ${EASE.out}`,
      }}>
        {data.expireMessage || 'Le temps est écoulé.'}
      </p>

      {/* Hint reset */}
      {resetOnTap && !expired && (
        <Hint delay={800}>— toucher pour recommencer —</Hint>
      )}
      {!resetOnTap && !expired && data.hint && <Hint delay={600}>{data.hint}</Hint>}
    </AnimatedWrapper>
  )
}

// ─── Type : Crypte ───────────────────────────────────────────────────────────
function GameCrypte({ data, onResolved }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const { playSuccess, playError } = useKeySound()

  // Apparition du texte chiffré lettre par lettre
  const encoded = data.encoded || ''
  const [displayedEncoded, setDisplayedEncoded] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    if (!encoded) return
    const interval = setInterval(() => {
      if (indexRef.current >= encoded.length) {
        clearInterval(interval)
        setRevealed(true)
        return
      }
      setDisplayedEncoded(encoded.slice(0, indexRef.current + 1))
      indexRef.current += 1
    }, 55)
    return () => clearInterval(interval)
  }, [encoded])

  const validate = () => {
    const correct = String(data.answer || '').trim().toLowerCase()
    const attempt = input.trim().toLowerCase()
    if (attempt === correct) {
      playSuccess()
      setSuccess(true)
      setTimeout(onResolved, 900)
    } else {
      playError()
      setError(data.errorMessage || 'Ce n\'est pas le bon déchiffrement.')
      setTimeout(() => setError(''), 2500)
    }
  }

  const cipherLabel = {
    caesar:  `César +${data.shift || 3}`,
    mirror:  'Miroir (A↔Z)',
    reverse: 'Texte inversé',
  }[data.cipher] || ''

  return (
    <AnimatedWrapper>
      {data.prompt && (
        <p style={{
          fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center', lineHeight: 1.6,
          opacity: 0.7, margin: 0, fontStyle: 'italic',
        }}>
          {data.prompt}
        </p>
      )}

      {/* Texte chiffré */}
      <div style={{
        width: '100%', maxWidth: '420px',
        padding: '1.4rem 1.6rem',
        border: '1px solid var(--color-text-focus, #222)',
        borderRadius: '2px',
        boxSizing: 'border-box',
        position: 'relative',
      }}>
        {/* Label chiffrement */}
        <div style={{
          position: 'absolute', top: '-0.6em', left: '1.2rem',
          backgroundColor: 'var(--color-bg, #f5f0e8)',
          padding: '0 0.4rem',
          fontSize: '0.6rem', letterSpacing: '0.14em',
          opacity: 0.4, textTransform: 'uppercase',
          fontFamily: 'monospace',
        }}>
          {cipherLabel}
        </div>
        <p style={{
          margin: 0,
          fontFamily: 'monospace',
          fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
          letterSpacing: '0.18em',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center',
          lineHeight: 1.6,
          wordBreak: 'break-all',
        }}>
          {displayedEncoded}
          {!revealed && (
            <span style={{
              display: 'inline-block',
              width: '1.5px', height: '1em',
              backgroundColor: 'var(--color-text-focus, #222)',
              marginLeft: '2px',
              verticalAlign: 'text-bottom',
              animation: 'game-blink 0.65s step-end infinite',
            }} />
          )}
        </p>
      </div>

      {/* Champ de réponse */}
      {revealed && (
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') validate() }}
          autoFocus
          disabled={success}
          placeholder="votre déchiffrement…"
          style={{
            width: '100%', maxWidth: '320px',
            padding: '0.8rem 1rem',
            border: `1px solid ${success ? 'rgba(39,174,96,0.7)' : error ? 'rgba(192,57,43,0.6)' : 'var(--color-text-focus, #222)'}`,
            borderRadius: '2px',
            background: success ? 'rgba(39,174,96,0.04)' : 'none',
            fontFamily: 'var(--font-primary, Georgia, serif)',
            fontSize: '1rem',
            color: 'var(--color-text-focus, #222)',
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
            transition: `border-color 350ms ${EASE.inOut}, background-color 350ms ${EASE.inOut}`,
          }}
        />
      )}

      {data.hint && !error && !success && revealed && (
        <Hint>{data.hint}</Hint>
      )}

      <p style={{
        fontSize: '0.78rem', color: '#c0392b',
        opacity: error ? 0.85 : 0,
        textAlign: 'center', minHeight: '1em',
        fontStyle: 'italic', margin: 0,
        transition: `opacity 250ms ${EASE.out}`,
      }}>
        {error}
      </p>

      {revealed && !success && (
        <ContinueBtn onClick={validate} label="déchiffrer" delay={200} />
      )}
    </AnimatedWrapper>
  )
}

// ─── Type : Écho ─────────────────────────────────────────────────────────────
function GameEcho({ data, onResolved }) {
  const phrase = data.phrase || ''
  const [input, setInput] = useState('')
  const [success, setSuccess] = useState(false)
  const [errorAt, setErrorAt] = useState(null)
  const { playTock, playSuccess, playError } = useKeySound()

  // Comparaison en temps réel caractère par caractère
  const progress = (() => {
    let i = 0
    while (i < input.length && i < phrase.length && input[i] === phrase[i]) i++
    return i
  })()

  const isError = input.length > 0 && input[progress] !== undefined && input[progress] !== phrase[progress]

  const handleChange = (e) => {
    const val = e.target.value
    // Bloquer si le caractère tapé est faux
    if (val.length > input.length) {
      const newChar = val[val.length - 1]
      const expected = phrase[val.length - 1]
      if (newChar !== expected) {
        playError()
        setErrorAt(val.length - 1)
        setTimeout(() => setErrorAt(null), 400)
        return // bloquer la saisie incorrecte
      }
      playTock()
    }
    setInput(val)
    setErrorAt(null)

    if (val === phrase) {
      playSuccess()
      setSuccess(true)
      setTimeout(onResolved, 1100)
    }
  }

  // Pourcentage de progression
  const pct = phrase.length > 0 ? progress / phrase.length : 0

  return (
    <AnimatedWrapper>
      {data.prompt && (
        <p style={{
          fontSize: '0.78rem',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center', lineHeight: 1.6,
          opacity: 0.5, margin: 0,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {data.prompt}
        </p>
      )}

      {/* Phrase à recopier — les caractères déjà tapés s'estompent */}
      <div style={{
        width: '100%', maxWidth: '420px',
        fontFamily: 'var(--font-primary, Georgia, serif)',
        fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
        lineHeight: 1.8, textAlign: 'center',
        letterSpacing: '0.01em',
        userSelect: 'none',
      }}>
        {phrase.split('').map((char, i) => {
          const done = i < progress
          const current = i === progress
          const isErr = errorAt === i
          return (
            <span key={i} style={{
              color: isErr
                ? '#c0392b'
                : done
                  ? 'var(--color-text-focus, #222)'
                  : 'var(--color-text-focus, #222)',
              opacity: isErr ? 1 : done ? 0.25 : current ? 1 : 0.55,
              borderBottom: current && !success ? '1px solid var(--color-text-focus, #222)' : 'none',
              transition: `opacity 150ms ease`,
              animation: isErr ? `game-shake 0.3s ${EASE.inOut}` : 'none',
            }}>
              {char}
            </span>
          )
        })}
      </div>

      {/* Barre de progression fine */}
      <div style={{
        width: '100%', maxWidth: '420px',
        height: '1px',
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: '999px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct * 100}%`,
          backgroundColor: success ? 'rgba(39,174,96,0.6)' : 'var(--color-text-focus, #222)',
          opacity: 0.4,
          borderRadius: '999px',
          transition: `width 150ms ${EASE.out}, background-color 500ms ${EASE.inOut}`,
        }} />
      </div>

      {/* Champ de saisie invisible — juste pour capturer le clavier */}
      <input
        autoFocus
        value={input}
        onChange={handleChange}
        disabled={success}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: success ? 'none' : 'auto',
          width: '1px', height: '1px',
          top: 0, left: 0,
        }}
      />

      {/* Tap pour focus sur mobile */}
      {!success && (
        <Hint delay={600}>— touchez l'écran pour commencer à écrire —</Hint>
      )}

      {success && (
        <p style={{
          fontSize: '0.88rem',
          color: 'var(--color-text-focus, #222)',
          opacity: 0.6, fontStyle: 'italic',
          margin: 0, textAlign: 'center',
        }}>
          {data.successMessage || 'Vous vous en souviendrez.'}
        </p>
      )}
    </AnimatedWrapper>
  )
}

// ─── Type : Journal ───────────────────────────────────────────────────────────
function GameJournal({ data, onResolved }) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const minLength = 3

  const handleContinue = () => {
    if (text.trim().length < minLength) return
    // Stocker en sessionStorage avec la clé définie par l'auteur
    if (data.memoryKey) {
      try {
        sessionStorage.setItem(`ili_journal_${data.memoryKey}`, text.trim())
      } catch {}
    }
    setSaved(true)
    setTimeout(onResolved, 900)
  }

  return (
    <AnimatedWrapper>
      {data.prompt && (
        <p style={{
          fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center', lineHeight: 1.7,
          opacity: 0.9, margin: 0,
          fontStyle: 'italic',
        }}>
          {data.prompt}
        </p>
      )}

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={saved}
          placeholder={data.placeholder || 'Écrivez ici…'}
          rows={5}
          style={{
            width: '100%',
            padding: '1.1rem 1.2rem',
            border: `1px solid ${saved ? 'rgba(39,174,96,0.5)' : 'var(--color-text-focus, #222)'}`,
            borderRadius: '2px',
            background: saved ? 'rgba(39,174,96,0.03)' : 'none',
            fontFamily: 'var(--font-primary, Georgia, serif)',
            fontSize: '1rem',
            color: 'var(--color-text-focus, #222)',
            lineHeight: 1.75,
            outline: 'none',
            resize: 'none',
            boxSizing: 'border-box',
            transition: `border-color 400ms ${EASE.inOut}, background-color 400ms ${EASE.inOut}`,
          }}
        />
        {/* Compteur de caractères discret */}
        <div style={{
          position: 'absolute', bottom: '0.5rem', right: '0.75rem',
          fontSize: '0.65rem', opacity: text.length > 0 ? 0.3 : 0,
          color: 'var(--color-text-focus, #222)',
          transition: 'opacity 300ms ease',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}>
          {text.length}
        </div>
      </div>

      {!saved && (
        <ContinueBtn
          onClick={handleContinue}
          label={data.continueLabel || 'je me souviendrai de ça'}
          delay={400}
        />
      )}

      {text.trim().length > 0 && text.trim().length < minLength && !saved && (
        <Hint>continuez…</Hint>
      )}
    </AnimatedWrapper>
  )
}

// ─── Type : Séquence ─────────────────────────────────────────────────────────
function GameSequence({ data, onResolved }) {
  const correct = data.items || []
  const { playTock, playSuccess, playError } = useKeySound()

  // Mélanger au montage
  const [items, setItems] = useState(() => {
    const shuffled = [...correct]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    // Si identique à la solution après mélange, déplacer le premier
    if (shuffled.join() === correct.join() && shuffled.length > 1) {
      const tmp = shuffled[0]
      shuffled[0] = shuffled[1]
      shuffled[1] = tmp
    }
    return shuffled
  })

  const [success, setSuccess] = useState(false)
  const [errorIdx, setErrorIdx] = useState(null)

  const isCorrect = items.join('|||') === correct.join('|||')

  const move = (i, dir) => {
    if (success) return
    const next = [...items]
    const target = i + dir
    if (target < 0 || target >= next.length) return
    playTock();
    [next[i], next[target]] = [next[target], next[i]]
    setItems(next)
    setErrorIdx(null)
  }

  const validate = () => {
    if (isCorrect) {
      playSuccess()
      setSuccess(true)
      setTimeout(onResolved, 1000)
    } else {
      playError()
      // Trouver le premier élément mal placé
      const first = items.findIndex((item, i) => item !== correct[i])
      setErrorIdx(first)
      setTimeout(() => setErrorIdx(null), 800)
    }
  }

  return (
    <AnimatedWrapper>
      {data.prompt && (
        <p style={{
          fontSize: 'clamp(0.88rem, 2vw, 1rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center', lineHeight: 1.6,
          opacity: 0.8, margin: 0,
        }}>
          {data.prompt}
        </p>
      )}

      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, i) => {
          const isWrong = errorIdx === i
          const isGood  = success && item === correct[i]
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.7rem 0.9rem',
                border: `1px solid ${isWrong ? 'rgba(192,57,43,0.6)' : isGood ? 'rgba(39,174,96,0.5)' : 'var(--color-text-focus, #222)'}`,
                borderRadius: '2px',
                backgroundColor: isWrong
                  ? 'rgba(192,57,43,0.04)'
                  : isGood ? 'rgba(39,174,96,0.04)' : 'transparent',
                animation: isWrong ? `game-shake 0.4s ${EASE.inOut}` : 'none',
                transition: `border-color 300ms ${EASE.inOut}, background-color 300ms ${EASE.inOut}`,
              }}
            >
              {/* Numéro */}
              <span style={{
                fontSize: '0.65rem', color: 'var(--color-text-focus, #222)',
                opacity: 0.3, minWidth: '1rem', textAlign: 'center',
                fontFamily: 'monospace',
              }}>
                {i + 1}
              </span>

              {/* Texte */}
              <span style={{
                flex: 1,
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                color: 'var(--color-text-focus, #222)',
                fontFamily: 'var(--font-primary, Georgia, serif)',
                lineHeight: 1.4,
              }}>
                {item}
              </span>

              {/* Boutons ↑↓ */}
              {!success && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    style={{
                      background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer',
                      fontSize: '0.7rem', color: 'var(--color-text-focus, #222)',
                      opacity: i === 0 ? 0.15 : 0.5, padding: '1px 4px',
                      transition: 'opacity 0.15s ease',
                      lineHeight: 1,
                    }}
                    onMouseEnter={e => { if (i > 0) e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={e => { if (i > 0) e.currentTarget.style.opacity = '0.5' }}
                  >▲</button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    style={{
                      background: 'none', border: 'none', cursor: i === items.length - 1 ? 'default' : 'pointer',
                      fontSize: '0.7rem', color: 'var(--color-text-focus, #222)',
                      opacity: i === items.length - 1 ? 0.15 : 0.5, padding: '1px 4px',
                      transition: 'opacity 0.15s ease',
                      lineHeight: 1,
                    }}
                    onMouseEnter={e => { if (i < items.length - 1) e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={e => { if (i < items.length - 1) e.currentTarget.style.opacity = '0.5' }}
                  >▼</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!success && <ContinueBtn onClick={validate} label="valider" delay={300} />}

      {success && (
        <p style={{
          fontSize: '0.88rem', color: 'var(--color-text-focus, #222)',
          opacity: 0.6, fontStyle: 'italic', margin: 0, textAlign: 'center',
        }}>
          {data.successMessage || 'Exact.'}
        </p>
      )}
    </AnimatedWrapper>
  )
}

// ─── Type : Message animé ─────────────────────────────────────────────────────
function GameMessage({ data, onResolved }) {
  const text = data.text || ''
  const iface = data.interface || 'sms'
  const speed = data.speed || 'normal'
  const delay = speed === 'lent' ? 80 : speed === 'rapide' ? 18 : 38
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!text) { setDone(true); return }
    const interval = setInterval(() => {
      if (indexRef.current >= text.length) {
        clearInterval(interval)
        setDone(true)
        return
      }
      setDisplayed(text.slice(0, indexRef.current + 1))
      indexRef.current += 1
    }, delay)
    return () => clearInterval(interval)
  }, [text, delay])

  const wrapperStyle = (() => {
    if (iface === 'sms') return {
      width: '100%', maxWidth: '340px',
      backgroundColor: 'rgba(0,0,0,0.06)',
      borderRadius: '18px',
      padding: '1rem 1.2rem',
      fontFamily: 'var(--font-primary, Georgia, serif)',
      fontSize: 'clamp(0.92rem, 2.2vw, 1.05rem)',
      lineHeight: 1.65,
      color: 'var(--color-text-focus, #222)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      position: 'relative',
    }
    if (iface === 'email') return {
      width: '100%', maxWidth: '420px',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: '4px',
      padding: '1.4rem 1.6rem',
      fontFamily: 'monospace',
      fontSize: 'clamp(0.82rem, 1.9vw, 0.95rem)',
      lineHeight: 1.7,
      color: 'var(--color-text-focus, #222)',
      backgroundColor: 'rgba(255,255,255,0.4)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    }
    if (iface === 'terminal') return {
      width: '100%', maxWidth: '420px',
      backgroundColor: '#0d1117',
      borderRadius: '6px',
      padding: '1.2rem 1.4rem',
      fontFamily: "'Courier New', monospace",
      fontSize: 'clamp(0.82rem, 1.9vw, 0.92rem)',
      lineHeight: 1.7,
      color: '#39ff14',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    }
    // aucune interface
    return {
      width: '100%', maxWidth: '420px',
      fontFamily: 'var(--font-primary, Georgia, serif)',
      fontSize: 'clamp(0.92rem, 2.2vw, 1.05rem)',
      lineHeight: 1.7,
      color: 'var(--color-text-focus, #222)',
      textAlign: 'center',
    }
  })()

  const cursor = !done ? (
    <span style={{
      display: 'inline-block',
      width: iface === 'terminal' ? '0.55em' : '1.5px',
      height: iface === 'terminal' ? '1em' : '1em',
      backgroundColor: iface === 'terminal' ? '#39ff14' : 'var(--color-text-focus, #222)',
      marginLeft: '2px',
      verticalAlign: 'text-bottom',
      animation: 'game-blink 0.65s step-end infinite',
    }} />
  ) : null

  return (
    <AnimatedWrapper style={{ gap: '2rem' }}>
      {iface === 'sms' && (
        <div style={{ fontSize: '0.68rem', opacity: 0.35, letterSpacing: '0.08em', alignSelf: 'flex-start', marginLeft: '0.5rem' }}>
          Message reçu
        </div>
      )}
      {iface === 'email' && (
        <div style={{ width: '100%', maxWidth: '420px', fontSize: '0.68rem', opacity: 0.35, letterSpacing: '0.06em', fontFamily: 'monospace' }}>
          De : inconnu · À : vous
        </div>
      )}
      {iface === 'terminal' && (
        <div style={{ width: '100%', maxWidth: '420px', fontSize: '0.68rem', opacity: 0.45, letterSpacing: '0.08em', fontFamily: 'monospace', color: '#39ff14' }}>
          $ incoming_message
        </div>
      )}
      <div style={wrapperStyle}>
        {displayed}{cursor}
      </div>
      {done && <ContinueBtn onClick={onResolved} delay={400} />}
    </AnimatedWrapper>
  )
}

// ─── Type : Document / Artefact ───────────────────────────────────────────────
function GameDocument({ data, onResolved }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  const style = data.style || 'letter'

  const stampEl = data.stamp ? (
    <div style={{
      position: 'absolute',
      top: '1.8rem', right: '1.4rem',
      border: '2px solid rgba(180,30,30,0.55)',
      color: 'rgba(180,30,30,0.55)',
      padding: '0.2rem 0.5rem',
      fontSize: '0.65rem',
      fontFamily: 'monospace',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      transform: 'rotate(12deg)',
      transformOrigin: 'center',
      borderRadius: '2px',
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {data.stamp}
    </div>
  ) : null

  const containerBase = {
    width: '100%', maxWidth: '420px',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0) rotate(0deg)' : 'translateY(16px) rotate(0.5deg)',
    transition: `opacity 700ms ${EASE.inOut}, transform 700ms ${EASE.out}`,
    position: 'relative',
  }

  let docEl = null

  if (style === 'letter') {
    docEl = (
      <div style={{
        ...containerBase,
        backgroundColor: '#faf6ef',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '2px',
        padding: '2rem 2.2rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        fontFamily: 'Georgia, serif',
        color: '#2a2118',
        lineHeight: 1.75,
      }}>
        {stampEl}
        {data.title && <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, marginBottom: '1.2rem' }}>{data.title}</div>}
        {data.date && <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '1rem', fontStyle: 'italic' }}>{data.date}</div>}
        {data.to && <div style={{ fontSize: '0.82rem', marginBottom: '1.2rem' }}>À {data.to},</div>}
        <p style={{ margin: '0 0 1.2rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', whiteSpace: 'pre-wrap' }}>{data.body}</p>
        {data.from && <div style={{ fontSize: '0.82rem', opacity: 0.6, fontStyle: 'italic' }}>{data.from}</div>}
      </div>
    )
  } else if (style === 'telegram') {
    docEl = (
      <div style={{
        ...containerBase,
        backgroundColor: '#f0e8d0',
        border: '2px solid #8a7a5a',
        borderRadius: '2px',
        padding: '1.6rem 2rem',
        boxShadow: '0 6px 32px rgba(0,0,0,0.15)',
        fontFamily: "'Courier New', monospace",
        color: '#2a2118',
        lineHeight: 1.65,
      }}>
        {stampEl}
        <div style={{ fontSize: '0.62rem', letterSpacing: '0.18em', opacity: 0.45, marginBottom: '1rem', textTransform: 'uppercase' }}>TÉLÉGRAMME</div>
        {data.date && <div style={{ fontSize: '0.72rem', opacity: 0.45, marginBottom: '0.8rem' }}>{data.date}</div>}
        {data.title && <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '1rem', textTransform: 'uppercase' }}>{data.title}</div>}
        <p style={{ margin: '0 0 1rem', fontSize: 'clamp(0.82rem, 1.9vw, 0.92rem)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'pre-wrap' }}>{data.body}</p>
        {data.from && <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '0.8rem' }}>— {data.from}</div>}
      </div>
    )
  } else if (style === 'note') {
    docEl = (
      <div style={{
        ...containerBase,
        backgroundColor: '#fefce8',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '2px 2px 2px 2px',
        padding: '1.6rem 1.8rem',
        boxShadow: '2px 3px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
        fontFamily: 'Georgia, serif',
        color: '#2a2118',
        lineHeight: 1.8,
        transform: visible ? 'rotate(-0.8deg)' : 'rotate(-0.8deg) translateY(16px)',
      }}>
        {stampEl}
        {data.title && <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.5, marginBottom: '0.8rem', fontStyle: 'italic' }}>{data.title}</div>}
        <p style={{ margin: '0 0 1rem', fontSize: 'clamp(0.88rem, 2.1vw, 1rem)', whiteSpace: 'pre-wrap' }}>{data.body}</p>
        {data.from && <div style={{ fontSize: '0.8rem', opacity: 0.5, textAlign: 'right', fontStyle: 'italic' }}>— {data.from}</div>}
      </div>
    )
  } else if (style === 'newspaper') {
    docEl = (
      <div style={{
        ...containerBase,
        backgroundColor: '#f5f0e0',
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: '2px',
        padding: '1.6rem 2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        fontFamily: 'Georgia, serif',
        color: '#1a1008',
      }}>
        {stampEl}
        {data.date && <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', opacity: 0.4, borderBottom: '1px solid rgba(0,0,0,0.15)', paddingBottom: '0.5rem', marginBottom: '0.8rem', textTransform: 'uppercase' }}>{data.date}</div>}
        {data.title && <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.8rem', borderBottom: '2px solid rgba(0,0,0,0.2)', paddingBottom: '0.6rem' }}>{data.title}</div>}
        <p style={{ margin: 0, fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)', lineHeight: 1.7, textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{data.body}</p>
      </div>
    )
  } else {
    // card / badge
    docEl = (
      <div style={{
        ...containerBase,
        backgroundColor: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        padding: '1.6rem 2rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        color: '#fff',
        fontFamily: 'monospace',
      }}>
        {stampEl}
        {data.title && <div style={{ fontSize: '0.65rem', letterSpacing: '0.18em', opacity: 0.5, marginBottom: '0.8rem', textTransform: 'uppercase' }}>{data.title}</div>}
        {data.from && <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', fontWeight: 700, marginBottom: '0.4rem' }}>{data.from}</div>}
        {data.to && <div style={{ fontSize: '0.72rem', opacity: 0.5, marginBottom: '1rem' }}>{data.to}</div>}
        <p style={{ margin: 0, fontSize: 'clamp(0.8rem, 1.8vw, 0.88rem)', opacity: 0.75, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data.body}</p>
        {data.date && <div style={{ fontSize: '0.65rem', opacity: 0.35, marginTop: '1rem', letterSpacing: '0.08em' }}>{data.date}</div>}
      </div>
    )
  }

  return (
    <AnimatedWrapper style={{ gap: '2rem' }}>
      {docEl}
      {visible && <ContinueBtn onClick={onResolved} delay={600} />}
    </AnimatedWrapper>
  )
}

// ─── Type : Code / Digicode ───────────────────────────────────────────────────
function GameCode({ data, onResolved }) {
  const correctAnswer = String(data.answer || '')
  const isNumeric = /^\d+$/.test(correctAnswer)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [success, setSuccess] = useState(false)
  const { playTock, playSuccess, playError, playDelete } = useKeySound()

  const validate = (val) => {
    const attempt = String(val || input)
    if (attempt === correctAnswer) {
      playSuccess()
      setSuccess(true)
      setTimeout(onResolved, 900)
    } else {
      playError()
      setError(true)
      setTimeout(() => { setError(false); setInput('') }, 700)
    }
  }

  const handleKey = (digit) => {
    if (success || error) return
    playTock()
    const next = input + digit
    setInput(next)
    if (next.length === correctAnswer.length) {
      setTimeout(() => validate(next), 80)
    }
  }

  const handleDelete = () => {
    if (success) return
    playDelete()
    setInput(i => i.slice(0, -1))
    setError(false)
  }

  // Clavier texte (non numérique)
  const handleTextChange = (e) => {
    if (success) return
    setInput(e.target.value)
    setError(false)
  }

  const handleTextSubmit = () => validate(input)

  const dotColor = success ? 'rgba(39,174,96,0.9)' : error ? 'rgba(192,57,43,0.9)' : 'var(--color-text-focus, #222)'

  return (
    <AnimatedWrapper style={{ gap: '1.8rem' }}>
      {data.prompt && (
        <p style={{
          fontSize: 'clamp(0.88rem, 2vw, 1rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center', lineHeight: 1.6,
          opacity: 0.75, margin: 0,
        }}>
          {data.prompt}
        </p>
      )}

      {/* Afficheur */}
      <div style={{
        display: 'flex', gap: '0.7rem', alignItems: 'center', justifyContent: 'center',
        animation: error ? `game-shake 0.4s ${EASE.inOut}` : 'none',
      }}>
        {isNumeric ? (
          Array.from({ length: correctAnswer.length }).map((_, i) => (
            <div key={i} style={{
              width: '0.65rem', height: '0.65rem',
              borderRadius: '50%',
              backgroundColor: i < input.length ? dotColor : 'transparent',
              border: `1.5px solid ${i < input.length ? dotColor : 'rgba(0,0,0,0.2)'}`,
              transition: `background-color 150ms ease, border-color 150ms ease`,
              transform: success && i < input.length ? 'scale(1.15)' : 'scale(1)',
            }} />
          ))
        ) : (
          <div style={{
            fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
            fontFamily: 'monospace',
            letterSpacing: '0.25em',
            color: dotColor,
            minWidth: '6rem',
            textAlign: 'center',
            borderBottom: `1px solid ${dotColor}`,
            paddingBottom: '0.25rem',
            transition: 'color 200ms ease',
          }}>
            {input || '\u00a0'}
          </div>
        )}
      </div>

      {data.hint && !success && (
        <Hint delay={1200}>{data.hint}</Hint>
      )}

      {/* Clavier numérique */}
      {isNumeric && !success && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.6rem', width: '100%', maxWidth: '260px',
        }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <button
              key={i}
              onClick={() => k === '⌫' ? handleDelete() : k ? handleKey(k) : null}
              disabled={!k}
              style={{
                padding: '1rem 0',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: '4px',
                backgroundColor: k === '⌫' ? 'rgba(0,0,0,0.04)' : !k ? 'transparent' : 'rgba(0,0,0,0.02)',
                color: 'var(--color-text-focus, #222)',
                fontFamily: 'var(--font-primary, Georgia, serif)',
                fontSize: k === '⌫' ? '1rem' : '1.2rem',
                cursor: k ? 'pointer' : 'default',
                borderColor: !k ? 'transparent' : undefined,
                opacity: !k ? 0 : 1,
                transition: 'background-color 100ms ease',
              }}
              onMouseEnter={e => { if (k) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.07)' }}
              onMouseLeave={e => { if (k) e.currentTarget.style.backgroundColor = k === '⌫' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)' }}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Champ texte (non numérique) */}
      {!isNumeric && !success && (
        <>
          <input
            autoFocus
            type="text"
            value={input}
            onChange={handleTextChange}
            onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit() }}
            placeholder={data.placeholder || 'votre réponse…'}
            style={{
              width: '100%', maxWidth: '300px',
              padding: '0.8rem 1rem',
              border: `1px solid ${error ? 'rgba(192,57,43,0.6)' : 'var(--color-text-focus, #222)'}`,
              borderRadius: '2px',
              background: 'none',
              fontFamily: 'var(--font-primary, Georgia, serif)',
              fontSize: '1rem',
              color: 'var(--color-text-focus, #222)',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
              transition: `border-color 300ms ${EASE.inOut}`,
            }}
          />
          <ContinueBtn onClick={handleTextSubmit} label="valider" delay={300} />
        </>
      )}

      {data.errorMessage && error && (
        <p style={{ fontSize: '0.78rem', color: '#c0392b', opacity: 0.85, textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
          {data.errorMessage}
        </p>
      )}
    </AnimatedWrapper>
  )
}

// ─── Type : Énigme texte libre ────────────────────────────────────────────────
function GameRiddle({ data, onResolved }) {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('idle') // idle | error | close | success
  const [feedback, setFeedback] = useState('')
  const { playSuccess, playError } = useKeySound()

  const validate = () => {
    const raw = input.trim()
    const attempt = data.caseSensitive ? raw : raw.toLowerCase()
    const answers = String(data.answer || '').split('|').map(a => data.caseSensitive ? a.trim() : a.trim().toLowerCase())

    if (answers.some(a => a === attempt)) {
      playSuccess()
      setStatus('success')
      setTimeout(onResolved, 1000)
      return
    }

    // Faux indices (decoys)
    if (Array.isArray(data.decoys)) {
      const decoy = data.decoys.find(d => (data.caseSensitive ? d.key : d.key?.toLowerCase()) === attempt)
      if (decoy) {
        setFeedback(decoy.message || data.errorMessage || 'Ce n\'est pas ça…')
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
        return
      }
    }

    // Réponse proche (Levenshtein ≤ 2)
    const isClose = answers.some(a => levenshtein(attempt, a) <= 2)
    if (isClose) {
      playError()
      setFeedback(data.closeMessage || 'Presque…')
      setStatus('close')
      setTimeout(() => setStatus('idle'), 2500)
      return
    }

    playError()
    setFeedback(data.errorMessage || 'Ce n\'est pas ça…')
    setStatus('error')
    setTimeout(() => setStatus('idle'), 2500)
  }

  const borderColor = status === 'success'
    ? 'rgba(39,174,96,0.7)'
    : status === 'error' ? 'rgba(192,57,43,0.6)'
    : status === 'close' ? 'rgba(212,130,10,0.6)'
    : 'var(--color-text-focus, #222)'

  return (
    <AnimatedWrapper style={{ gap: '1.8rem' }}>
      {data.question && (
        <p style={{
          fontSize: 'clamp(0.95rem, 2.3vw, 1.1rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center', lineHeight: 1.7,
          opacity: 0.85, margin: 0,
          fontStyle: 'italic',
        }}>
          {data.question}
        </p>
      )}

      <input
        autoFocus
        type="text"
        value={input}
        onChange={e => { setInput(e.target.value); setStatus('idle'); setFeedback('') }}
        onKeyDown={e => { if (e.key === 'Enter') validate() }}
        disabled={status === 'success'}
        placeholder={data.placeholder || 'votre réponse…'}
        style={{
          width: '100%', maxWidth: '320px',
          padding: '0.8rem 1rem',
          border: `1px solid ${borderColor}`,
          borderRadius: '2px',
          background: status === 'success' ? 'rgba(39,174,96,0.04)' : 'none',
          fontFamily: 'var(--font-primary, Georgia, serif)',
          fontSize: '1rem',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center',
          outline: 'none',
          boxSizing: 'border-box',
          animation: status === 'error' ? `game-shake 0.4s ${EASE.inOut}` : 'none',
          transition: `border-color 300ms ${EASE.inOut}, background-color 300ms ${EASE.inOut}`,
        }}
      />

      {data.hint && status === 'idle' && <Hint delay={800}>{data.hint}</Hint>}

      {feedback && status !== 'idle' && (
        <p style={{
          fontSize: '0.82rem',
          color: status === 'close' ? '#d4820a' : '#c0392b',
          opacity: 0.85, textAlign: 'center',
          margin: 0, fontStyle: 'italic',
          transition: `opacity 250ms ${EASE.out}`,
        }}>
          {feedback}
        </p>
      )}

      {status !== 'success' && (
        <ContinueBtn onClick={validate} label="valider" delay={300} />
      )}

      {status === 'success' && data.successMessage && (
        <p style={{
          fontSize: '0.88rem', color: 'var(--color-text-focus, #222)',
          opacity: 0.6, fontStyle: 'italic', margin: 0, textAlign: 'center',
        }}>
          {data.successMessage}
        </p>
      )}
    </AnimatedWrapper>
  )
}

export default GameOverlay

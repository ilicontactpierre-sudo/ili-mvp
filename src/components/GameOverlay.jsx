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
  if (alreadySolved) {
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
      </div>
    </>
  )
}

// ─── Keyframes globaux ────────────────────────────────────────────────────────
const GLOBAL_KEYFRAMES = `
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
      opacity: cssVisible ? 1 : 0,
      clipPath: cssVisible ? 'polygon(0 0,100% 0,100% 100%,0 100%)' : 'polygon(50% 50%,50% 50%,50% 50%,50% 50%)',
      transition: `opacity 400ms ${EASE.out}, clip-path 900ms ${EASE.spring}`,
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
  const [phase, setPhase] = useState('dark') // dark → reveal → hold → dark
  const [allDone, setAllDone] = useState(false)
  const interval = data.interval || 2500

  useEffect(() => {
    // dark → reveal
    const t1 = setTimeout(() => setPhase('reveal'), 300)
    return () => clearTimeout(t1)
  }, [current])

  useEffect(() => {
    if (phase !== 'reveal') return
    // reveal → hold → dark → next
    const t1 = setTimeout(() => setPhase('hold'), 800)
    const t2 = setTimeout(() => setPhase('dark'), interval)
    const t3 = setTimeout(() => {
      if (current < images.length - 1) {
        setCurrent(c => c + 1)
        setPhase('dark')
      } else {
        setAllDone(true)
      }
    }, interval + 400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [phase, current, images.length, interval])

  const opacity = phase === 'dark' ? 0 : 1
  const brightness = phase === 'hold' ? 1 : 0.85

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

export default GameOverlay

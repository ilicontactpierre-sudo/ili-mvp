import { useState, useEffect, useRef } from 'react'

// ── Lecture des préférences sons feedback ─────────────────────────────────────
function loadFeedbackSoundPrefs() {
  try {
    const raw = localStorage.getItem('ili_game_sounds')
    return raw ? JSON.parse(raw) : { success: false, error: false }
  } catch { return { success: false, error: false } }
}

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
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(820, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06)
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.09)
    } catch {}
  }
  const playSuccess = () => {
    if (!loadFeedbackSoundPrefs().success) return
    try {
      const ctx = getCtx()
      const freqs = [660, 880, 1100]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
        gain.gain.setValueAtTime(0.13, ctx.currentTime + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.18)
        osc.start(ctx.currentTime + i * 0.1); osc.stop(ctx.currentTime + i * 0.1 + 0.2)
      })
    } catch {}
  }
  const playError = () => {
    if (!loadFeedbackSoundPrefs().error) return
    try {
      const ctx = getCtx()
      const freqs = [220, 233]
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        gain.gain.setValueAtTime(0.07, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.45)
      })
    } catch {}
  }
  const playDelete = () => {
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.07)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1)
    } catch {}
  }
  const playDing = () => {
    try {
      const ctx = getCtx()
      const freqs = [740, 1108.73]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09)
        gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.09)
        gain.gain.linearRampToValueAtTime(0.11, ctx.currentTime + i * 0.09 + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.5)
        osc.start(ctx.currentTime + i * 0.09); osc.stop(ctx.currentTime + i * 0.09 + 0.52)
      })
    } catch {}
  }
  return { playTock, playSuccess, playError, playDelete, playDing }
}

// ─── Distance de Levenshtein ──────────────────────────────────────────────────
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

// ─── Courbes d'animation ──────────────────────────────────────────────────────
const EASE = {
  out:    'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut:  'cubic-bezier(0.76, 0, 0.24, 1)',
  in:     'cubic-bezier(0.55, 0, 1, 0.45)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
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
  @keyframes game-code-bloom {
    0%   { transform: scale(0.3); opacity: 0; }
    25%  { opacity: 0.22; }
    100% { transform: scale(3.2); opacity: 0; }
  }
  @keyframes game-code-exit {
    0%   { opacity: 1;  transform: translateY(0px); }
    100% { opacity: 0;  transform: translateY(-32px); }
  }
  @keyframes game-code-dot-confirm {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.45); }
    60%  { transform: scale(0.92); }
    80%  { transform: scale(1.12); }
    100% { transform: scale(1); }
  }
  @keyframes game-typing-dot {
    0%, 50%, 100% { transform: translateY(0px) scale(1);   opacity: 0.32; }
    25%           { transform: translateY(-6px) scale(1.1); opacity: 1; }
  }
`

// ─── Flèches navigation ───────────────────────────────────────────────────────
function BackArrow({ onBack }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onBack() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed', top: '1.5rem', left: '1.5rem', zIndex: 9999,
        background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem',
        opacity: hovered ? 0.7 : 0.3, transition: 'opacity 300ms ease', lineHeight: 1,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-focus, #222)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )
}

// ─── Wrapper animé commun ─────────────────────────────────────────────────────
function AnimatedWrapper({ children, style = {}, onClick }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])
  return (
    <div
      onClick={onClick}
      style={{
        width: '100%', maxWidth: '480px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem',
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
        background: 'none', border: '1px solid var(--color-text-focus, #222)',
        color: 'var(--color-text-focus, #222)', fontFamily: 'var(--font-primary, Georgia, serif)',
        fontSize: '0.82rem', letterSpacing: '0.1em', padding: '0.65rem 2.2rem',
        borderRadius: '2px', cursor: 'pointer',
        opacity: ready ? (hovered ? 1 : 0.55) : 0,
        transform: ready ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 500ms ${EASE.out}, transform 500ms ${EASE.out}`,
      }}
    >
      {label}
    </button>
  )
}

// ─── Hint animé ───────────────────────────────────────────────────────────────
function Hint({ children, delay = 400 }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <p style={{
      fontSize: '0.72rem', color: 'var(--color-text-focus, #222)',
      opacity: show ? 0.35 : 0, textAlign: 'center', letterSpacing: '0.06em', margin: 0,
      transform: show ? 'translateY(0)' : 'translateY(8px)',
      transition: `opacity 600ms ${EASE.inOut}, transform 600ms ${EASE.inOut}`,
    }}>
      {children}
    </p>
  )
}

// ─── Détection vidéo ──────────────────────────────────────────────────────────
function isVideoUrl(url) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url || '')
}
// ─── Type : Vidéo (rendu dans GameImage quand l'URL est une vidéo) ────────────
function GameVideo({ data, onResolved, tappable }) {
  const videoRef = useRef(null)
  const [visible, setCssVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const isLoop = !!data.videoLoop
  const isMuted = data.videoMuted !== false

  useEffect(() => {
    const t = setTimeout(() => setCssVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  // Fin naturelle de la vidéo → avance (sauf si boucle)
  const handleEnded = () => {
    if (isLoop) return // géré par l'attribut loop, ne devrait pas se déclencher
    triggerLeave()
  }

  const triggerLeave = () => {
    if (leaving) return
    setLeaving(true)
    // Fondu de sortie puis résolution
    setTimeout(() => onResolved(), 500)
  }

  // Tap en mode boucle → fondu + avance
  const handleTap = (e) => {
    if (!tappable || !isLoop) return
    e.stopPropagation()
    triggerLeave()
  }

  return (
    <div
      onClick={handleTap}
      style={{
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.2rem',
        cursor: isLoop && tappable ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: '100%',
        borderRadius: '3px',
        overflow: 'hidden',
        boxShadow: '0 12px 60px rgba(0,0,0,0.22)',
        opacity: visible && !leaving ? 1 : 0,
        transition: leaving
          ? 'opacity 480ms cubic-bezier(0.76, 0, 0.24, 1)'
          : 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <video
          ref={videoRef}
          src={data.imageUrl}
          autoPlay
          playsInline
          muted={isMuted}
          loop={isLoop}
          onEnded={handleEnded}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
      {data.caption && (
        <p style={{
          fontSize: 'clamp(0.82rem, 1.8vw, 0.95rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center',
          lineHeight: 1.65,
          opacity: visible && !leaving ? 0.6 : 0,
          fontStyle: 'italic',
          margin: 0,
          transition: `opacity 700ms cubic-bezier(0.76, 0, 0.24, 1) 400ms`,
        }}>
          {data.caption}
        </p>
      )}
      {isLoop && tappable && (
        <p style={{
          fontSize: '0.68rem',
          color: 'var(--color-text-focus, #222)',
          opacity: 0.28,
          letterSpacing: '0.08em',
          margin: 0,
          fontStyle: 'italic',
          transition: 'opacity 400ms ease',
        }}>
          toucher pour continuer
        </p>
      )}
    </div>
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
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      if (animation === 'pixels') {
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
        ctx.drawImage(img, 0, 0)
        setDone(true)
      }
    }
  }, [imgLoaded, animation])
  return { canvasRef, done }
}

// ─── Type : Image ─────────────────────────────────────────────────────────────
function GameImage({ data, onResolved, tappable }) {
  // Déléguer à GameVideo si l'URL est une vidéo
  if (isVideoUrl(data.imageUrl)) {
    return <GameVideo data={data} onResolved={onResolved} tappable={tappable} />
  }
  const [imgLoaded, setImgLoaded] = useState(false)
  const [cssVisible, setCssVisible] = useState(false)
  const [imgError, setImgError] = useState(false)
  const animation = data.animation || 'fade'
  const useCanvas = animation === 'pixels' || animation === 'scan'
  const { canvasRef, done } = useImageAnimation(useCanvas ? animation : null, imgLoaded)
  useEffect(() => {
    if (!imgLoaded) return
    if (!useCanvas) setTimeout(() => setCssVisible(true), 60)
    const fallback = setTimeout(() => setCssVisible(true), 3000)
    return () => clearTimeout(fallback)
  }, [imgLoaded, useCanvas])
  const getImgStyle = () => {
    const base = { width: '100%', height: 'auto', display: 'block' }
    if (animation === 'develop') return {
      ...base,
      filter: cssVisible ? 'saturate(1) brightness(1) contrast(1)' : 'saturate(0) brightness(2.2) contrast(0.7)',
      transition: `filter 4200ms cubic-bezier(0.37, 0, 0.63, 1)`,
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
    return { ...base, opacity: cssVisible ? 1 : 0, transition: `opacity 900ms ${EASE.inOut}` }
  }
  const isVisible = useCanvas ? done : cssVisible
  if (imgError || !data.imageUrl) {
    return (
      <AnimatedWrapper style={{ gap: '1.8rem' }}>
        <p style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '0.85rem', textAlign: 'center' }}>
          Image non disponible
        </p>
      </AnimatedWrapper>
    )
  }
  return (
    <AnimatedWrapper style={{ gap: '1.8rem' }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        borderRadius: '3px', overflow: 'hidden',
        boxShadow: '0 12px 60px rgba(0,0,0,0.14)',
      }}>
        <img src={data.imageUrl} alt="" onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} style={{ display: 'none' }} />
        {useCanvas ? (
          <canvas ref={canvasRef} data-src={data.imageUrl} style={{ width: '100%', height: 'auto', display: 'block' }} />
        ) : (
          <img src={data.imageUrl} alt={data.caption || ''} style={getImgStyle()} />
        )}
      </div>
      {data.caption && (
        <p style={{
          fontSize: 'clamp(0.82rem, 1.8vw, 0.95rem)', color: 'var(--color-text-focus, #222)',
          textAlign: 'center', lineHeight: 1.65,
          opacity: isVisible ? 0.6 : 0, fontStyle: 'italic', margin: 0,
          transition: `opacity 700ms ${EASE.inOut} 400ms`,
        }}>
          {data.caption}
        </p>
      )}
    </AnimatedWrapper>
  )
}

// ─── Type : Pellicule ─────────────────────────────────────────────────────────
function GameFilmstrip({ data, onResolved }) {
  const images = (data.images || []).filter(Boolean)
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(false)
  const duration = data.interval || 2500
  const timerRef = useRef(null)
  const clearTimers = () => { if (timerRef.current) clearTimeout(timerRef.current) }
  useEffect(() => {
    clearTimers()
    timerRef.current = setTimeout(() => {
      setVisible(true)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        timerRef.current = setTimeout(() => {
          if (current < images.length - 1) { setCurrent(c => c + 1) }
          else { setTimeout(onResolved, 600) }
        }, 900)
      }, duration)
    }, 300)
    return clearTimers
  }, [current])
  return (
    <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.8rem', fontFamily: 'var(--font-primary, Georgia, serif)' }}>
      <div style={{ width: '100%', position: 'relative', borderRadius: '2px', overflow: 'hidden', boxShadow: '0 16px 64px rgba(0,0,0,0.3)', backgroundColor: '#000', minHeight: '200px' }}>
        {images[current] && (
          <img key={current} src={images[current]} alt="" style={{
            width: '100%', height: 'auto', display: 'block',
            opacity: visible ? 1 : 0,
            filter: `brightness(${visible ? 1 : 0.85}) sepia(0.15)`,
            transition: `opacity 800ms ${EASE.inOut}, filter 1200ms ${EASE.inOut}`,
          }} />
        )}
        {data.showCounter !== false && (
          <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
            {current + 1} / {images.length}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {images.map((_, i) => (
          <div key={i} style={{
            width: i === current ? '1.4rem' : '0.35rem', height: '0.35rem', borderRadius: '999px',
            backgroundColor: 'var(--color-text-focus, #222)', opacity: i <= current ? 0.7 : 0.2,
            transition: `all 500ms ${EASE.inOut}`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Type : Minuteur ──────────────────────────────────────────────────────────
function GameTimer({ data, onResolved }) {
  const total = data.seconds || 30
  const timerStyle = data.timerStyle || 'arc'
  const resetOnTap = data.resetOnTap === true
  const [remaining, setRemaining] = useState(total)
  const [expired, setExpired] = useState(false)
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    if (expired) return
    if (remaining <= 0) { setExpired(true); setTimeout(onResolved, 1400); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, expired])
  useEffect(() => {
    if (remaining >= 10 || expired) { setPulse(false); return }
    const interval = setInterval(() => setPulse(p => !p), 600 + remaining * 30)
    return () => clearInterval(interval)
  }, [remaining, expired])
  const handleTap = (e) => {
    if (!resetOnTap || expired) return
    e.stopPropagation()
    setRemaining(total)
  }
  const pct = remaining / total
  const color = pct > 0.5 ? 'var(--color-text-focus, #222)' : pct > 0.25 ? '#d4820a' : '#c0392b'
  return (
    <>
      {resetOnTap && !expired && (
        <div onClick={handleTap} style={{ position: 'fixed', inset: 0, zIndex: 0, cursor: 'pointer' }} />
      )}
      <AnimatedWrapper style={{ gap: '1.6rem', cursor: resetOnTap && !expired ? 'pointer' : 'default' }}>
        {data.prompt && (
          <p style={{ fontSize: 'clamp(0.88rem, 2vw, 1rem)', color: 'var(--color-text-focus, #222)', textAlign: 'center', lineHeight: 1.6, opacity: 0.75, margin: 0 }}>
            {data.prompt}
          </p>
        )}
        {timerStyle === 'arc' && (
          <div style={{ position: 'relative', width: '126px', height: '126px', opacity: pulse ? 0.88 : 1, transition: `opacity ${600 + remaining * 30}ms ${EASE.inOut}` }}>
            <svg width="126" height="126" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="63" cy="63" r="52" fill="none" stroke="var(--color-text-focus, #222)" strokeWidth="1" opacity="0.1" />
              <circle cx="63" cy="63" r="52" fill="none" stroke={color} strokeWidth="1.5"
                strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - pct)} strokeLinecap="round"
                style={{ transition: `stroke-dashoffset 0.95s ${EASE.inOut}, stroke 0.8s ${EASE.inOut}` }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-primary, Georgia, serif)', fontSize: remaining < 10 ? '2.6rem' : '2.1rem', color, letterSpacing: '-0.02em', transition: `color 0.8s ${EASE.inOut}, font-size 300ms ${EASE.spring}` }}>
              {expired ? '—' : remaining}
            </div>
          </div>
        )}
        {timerStyle === 'bar' && (
          <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ width: '100%', height: '2px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: color, borderRadius: '999px', transition: `width 0.95s ${EASE.inOut}, background-color 0.8s ${EASE.inOut}`, opacity: pulse ? 0.7 : 1 }} />
            </div>
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-primary, Georgia, serif)', fontSize: '1.6rem', color, letterSpacing: '-0.02em', transition: `color 0.8s ${EASE.inOut}` }}>
              {expired ? '—' : remaining}
            </div>
          </div>
        )}
        {timerStyle === 'retro' && (
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 'clamp(3rem, 10vw, 5rem)', color, letterSpacing: '0.1em', opacity: pulse ? 0.7 : 1, transition: `opacity ${600 + remaining * 30}ms ${EASE.inOut}, color 0.8s ${EASE.inOut}`, textShadow: `0 0 20px ${color}44` }}>
            {expired ? '--' : String(Math.floor(remaining / 60)).padStart(2,'0') + ':' + String(remaining % 60).padStart(2,'0')}
          </div>
        )}
        {timerStyle === 'hidden' && !expired && <div style={{ height: '60px' }} />}
        <p style={{ fontSize: 'clamp(0.82rem, 1.8vw, 0.92rem)', color: 'var(--color-text-focus, #222)', textAlign: 'center', lineHeight: 1.6, opacity: expired ? 0.55 : 0, fontStyle: 'italic', margin: 0, transform: expired ? 'translateY(0)' : 'translateY(8px)', transition: `opacity 700ms ${EASE.out}, transform 700ms ${EASE.out}` }}>
          {data.expireMessage || 'Le temps est écoulé.'}
        </p>
        {resetOnTap && !expired && <Hint delay={800}></Hint>}
        {!resetOnTap && !expired && data.hint && <Hint delay={600}>{data.hint}</Hint>}
      </AnimatedWrapper>
    </>
  )
}

// ─── Type : Message animé ─────────────────────────────────────────────────────
function GameMessage({ data, onResolved, tappable }) {
  const text = data.text || ''
  const iface = data.interface || 'sms'
  const speed = data.speed || 'normal'
  const delay = speed === 'lent' ? 80 : speed === 'rapide' ? 18 : 38
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)
  const intervalRef = useRef(null)
  useEffect(() => {
    if (!text) { setDone(true); return }
    intervalRef.current = setInterval(() => {
      if (indexRef.current >= text.length) { clearInterval(intervalRef.current); setDone(true); return }
      setDisplayed(text.slice(0, indexRef.current + 1))
      indexRef.current += 1
    }, delay)
    return () => clearInterval(intervalRef.current)
  }, [text, delay])
  // Exposé pour que GameOverlay puisse déclencher le tap
  GameMessage._handleTap = () => {
    if (!tappable) return
    if (!done) {
      clearInterval(intervalRef.current)
      setDisplayed(text)
      indexRef.current = text.length
      setDone(true)
    } else {
      onResolved()
    }
  }
  const wrapperStyle = (() => {
    if (iface === 'sms') return { width: '100%', maxWidth: '340px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '18px', padding: '1rem 1.2rem', fontFamily: 'var(--font-primary, Georgia, serif)', fontSize: 'clamp(0.92rem, 2.2vw, 1.05rem)', lineHeight: 1.65, color: 'var(--color-text-focus, #222)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', position: 'relative' }
    if (iface === 'email') return { width: '100%', maxWidth: '420px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', padding: '1.4rem 1.6rem', fontFamily: 'monospace', fontSize: 'clamp(0.82rem, 1.9vw, 0.95rem)', lineHeight: 1.7, color: 'var(--color-text-focus, #222)', backgroundColor: 'rgba(255,255,255,0.4)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }
    if (iface === 'terminal') return { width: '100%', maxWidth: '420px', backgroundColor: '#0d1117', borderRadius: '6px', padding: '1.2rem 1.4rem', fontFamily: "'Courier New', monospace", fontSize: 'clamp(0.82rem, 1.9vw, 0.92rem)', lineHeight: 1.7, color: '#39ff14', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }
    return { width: '100%', maxWidth: '420px', fontFamily: 'var(--font-primary, Georgia, serif)', fontSize: 'clamp(0.92rem, 2.2vw, 1.05rem)', lineHeight: 1.7, color: 'var(--color-text-focus, #222)', textAlign: 'center' }
  })()
  const cursor = !done ? (
    <span style={{ display: 'inline-block', width: iface === 'terminal' ? '0.55em' : '1.5px', height: '1em', backgroundColor: iface === 'terminal' ? '#39ff14' : 'var(--color-text-focus, #222)', marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'game-blink 0.65s step-end infinite' }} />
  ) : null
  return (
    <AnimatedWrapper style={{ gap: '2rem' }}>
      {iface === 'sms' && !data.hideHeader && (
        <div style={{ fontSize: '0.68rem', opacity: 0.35, letterSpacing: '0.08em', alignSelf: 'flex-start', marginLeft: '0.5rem' }}>
          {data.headerLabel || 'Message reçu'}
        </div>
      )}
      {iface === 'email' && !data.hideHeader && (
        <div style={{ width: '100%', maxWidth: '420px', fontSize: '0.68rem', opacity: 0.35, letterSpacing: '0.06em', fontFamily: 'monospace' }}>
          {data.headerLabel || 'De : inconnu · À : vous'}
        </div>
      )}
      {iface === 'terminal' && !data.hideHeader && (
        <div style={{ width: '100%', maxWidth: '420px', fontSize: '0.68rem', opacity: 0.45, letterSpacing: '0.08em', fontFamily: 'monospace', color: '#39ff14' }}>
          {data.headerLabel || '$ incoming_message'}
        </div>
      )}
      <div style={wrapperStyle}>
        {displayed}{cursor}
      </div>
    </AnimatedWrapper>
  )
}
// ─── Type : Message intelligent (notification + fil de discussion) ───────────
function GameMessageSmart({ data, onResolved, onNavigateToPart, onReady }) {
  const sender    = (data.sender || '').trim() || 'Inconnu'
  const avatar    = (data.avatarEmoji || '').trim() || '💬'
  const text      = data.text || ''
  const withReply = !!data.withReply
  const choices   = (Array.isArray(data.choices) ? data.choices : []).filter(c => c?.text?.trim())
  const { playDing } = useKeySound()
  const dingPlayedRef = useRef(false)
  const timersRef     = useRef([])

  const [senderVisible, setSenderVisible] = useState(false)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const [typingVisible, setTypingVisible] = useState(false)
  const [textVisible,   setTextVisible]   = useState(false)
  const [chipsVisible,  setChipsVisible]  = useState(false)
  const [selectedIdx,   setSelectedIdx]   = useState(null)
  const [sentVisible,   setSentVisible]   = useState(false)

  // Courbes Apple-style
  const SPRING_POP  = 'cubic-bezier(0.34, 1.56, 0.64, 1)' // overshoot léger — apparitions
  const SPRING_SOFT = 'cubic-bezier(0.22, 1, 0.36, 1)'    // doux, long — expansion bulle
  const EASE_OUT    = 'cubic-bezier(0.16, 1, 0.3, 1)'      // fondu sortie

  useEffect(() => {
    if (data.notificationSound !== false && !dingPlayedRef.current) {
      dingPlayedRef.current = true
      playDing()
    }
    const after = (fn, ms) => { timersRef.current.push(setTimeout(fn, ms)) }
    // Séquence :
    //  80ms  → nom expéditeur glisse
    // 280ms  → bulle apparaît (petite) + points
    // 1600ms → points disparaissent
    // 1720ms → texte révélé (bulle s'étire)
    // 2400ms → prêt + chips si besoin
    after(() => setSenderVisible(true), 80)
    after(() => { setBubbleVisible(true); setTypingVisible(true) }, 280)
    after(() => setTypingVisible(false), 1580)
    after(() => setTextVisible(true), 1700)
    after(() => {
      onReady?.()
      if (withReply && choices.length > 0) setChipsVisible(true)
    }, 2400)
    return () => timersRef.current.forEach(clearTimeout)
  }, [])

  const handleChoice = (idx) => {
    if (selectedIdx !== null) return
    setSelectedIdx(idx)
    setChipsVisible(false)
    timersRef.current.push(setTimeout(() => setSentVisible(true), 60))
    timersRef.current.push(setTimeout(() => {
      const targetId = choices[idx]?.targetPartId
      if (targetId && onNavigateToPart) onNavigateToPart(targetId)
      else onResolved()
    }, 680))
  }

  return (
    <div style={{
      width: '100%', maxWidth: '380px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', gap: '0.45rem',
      fontFamily: 'var(--font-primary, Georgia, serif)',
      // Remonter au-dessus du centre géométrique
      marginBottom: '20vh',
    }}>

      {/* ── Expéditeur ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        paddingLeft: '0.3rem',
        opacity: senderVisible ? 0.42 : 0,
        transform: senderVisible ? 'translateY(0)' : 'translateY(7px)',
        transition: `opacity 550ms ${EASE_OUT}, transform 550ms ${EASE_OUT}`,
        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
        color: 'var(--color-text-focus, #222)',
      }}>
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{avatar}</span>
        <span>{sender}</span>
      </div>

      {/* ── Bulle principale ── */}
      <div style={{
        maxWidth: '88%',
        padding: '0.78rem 1.05rem',
        borderRadius: '20px',
        borderBottomLeftRadius: '5px',
        backgroundColor: 'color-mix(in srgb, var(--color-text-focus, #222) 8%, transparent)',
        // Apparition : scale depuis coin haut-gauche avec spring
        opacity: bubbleVisible ? 1 : 0,
        transform: bubbleVisible
          ? 'scale(1) translateY(0)'
          : 'scale(0.42) translateY(6px)',
        transformOrigin: 'top left',
        transition: [
          `opacity  420ms ${EASE_OUT}`,
          `transform 620ms ${SPRING_POP}`,
        ].join(', '),
      }}>

        {/* Points "en train d'écrire" — grid collapse/expand pour taille réelle */}
        <div style={{
          display: 'grid',
          gridTemplateRows: typingVisible ? '1fr' : '0fr',
          transition: `grid-template-rows 380ms ${SPRING_SOFT}`,
          overflow: 'hidden',
        }}>
          <div style={{ overflow: 'hidden', minHeight: 0 }}>
            <div style={{
              display: 'flex', gap: '5px', alignItems: 'center',
              paddingBottom: '1px',
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  backgroundColor: 'var(--color-text-focus, #222)',
                  display: 'block',
                  animation: typingVisible
                    ? `game-typing-dot 1.2s ${i * 0.2}s infinite ease-in-out`
                    : 'none',
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Texte — grid expand avec courbe douce (bulle s'étire naturellement) */}
        <div style={{
          display: 'grid',
          gridTemplateRows: textVisible ? '1fr' : '0fr',
          transition: `grid-template-rows 580ms ${SPRING_SOFT}`,
          overflow: 'hidden',
        }}>
          <div style={{ overflow: 'hidden', minHeight: 0 }}>
            <span style={{
              display: 'block',
              fontSize: 'clamp(0.92rem, 2.2vw, 1.02rem)', lineHeight: 1.65,
              color: 'var(--color-text-focus, #222)',
              // Légère entrée en opacité décalée après l'expansion
              opacity: textVisible ? 1 : 0,
              transition: `opacity 380ms ${EASE_OUT} 180ms`,
            }}>{text}</span>
          </div>
        </div>
      </div>

      {/* ── Réponse envoyée ── */}
      {sentVisible && selectedIdx !== null && (
        <div style={{
          alignSelf: 'flex-end', maxWidth: '86%',
          padding: '0.82rem 1.1rem', borderRadius: '20px',
          borderBottomRightRadius: '5px',
          backgroundColor: 'var(--color-text-focus, #222)',
          color: 'var(--color-bg, #fff)',
          fontSize: 'clamp(0.92rem, 2.2vw, 1.02rem)', lineHeight: 1.6,
          opacity: 0, transform: 'scale(0.5) translateY(4px)',
          transformOrigin: 'bottom right',
          animation: `none`,
          // On force une animation inline via style
          animationName: 'game-success-pop',
          animationDuration: '520ms',
          animationTimingFunction: SPRING_POP,
          animationFillMode: 'forwards',
        }}>
          {choices[selectedIdx]?.text}
        </div>
      )}

      {/* ── Chips de réponse ── */}
      {withReply && chipsVisible && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.45rem',
          justifyContent: 'flex-end', width: '100%',
          marginTop: '0.55rem',
        }}>
          {choices.map((choice, i) => (
            <button
              key={choice.id || i}
              onClick={(e) => { e.stopPropagation(); handleChoice(i) }}
              style={{
                padding: '0.52rem 1.05rem', borderRadius: '999px', cursor: 'pointer',
                border: '1.5px solid color-mix(in srgb, var(--color-text-focus, #222) 24%, transparent)',
                backgroundColor: 'transparent', color: 'var(--color-text-focus, #222)',
                fontSize: '0.85rem', fontFamily: 'var(--font-primary, Georgia, serif)',
                opacity: 0, transform: 'translateY(14px) scale(0.9)',
                animation: `game-fade-up 500ms ${SPRING_POP} ${80 + i * 110}ms forwards`,
                transition: 'background-color 180ms ease, color 180ms ease, border-color 180ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--color-text-focus, #222)'
                e.currentTarget.style.color = 'var(--color-bg, #fff)'
                e.currentTarget.style.borderColor = 'var(--color-text-focus, #222)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-focus, #222)'
                e.currentTarget.style.borderColor = ''
              }}
            >{choice.text}</button>
          ))}
        </div>
      )}
    </div>
  )
}
// ─── Type : Document / Artefact ───────────────────────────────────────────────// ─── Type : Document / Artefact ───────────────────────────────────────────────
function GameDocument({ data, tappable }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 200); return () => clearTimeout(t) }, [])
  const style = data.style || 'letter'
  const stampEl = data.stamp ? (
    <div style={{ position: 'absolute', top: '1.8rem', right: '1.4rem', border: '2px solid rgba(180,30,30,0.55)', color: 'rgba(180,30,30,0.55)', padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', transform: 'rotate(12deg)', transformOrigin: 'center', borderRadius: '2px', pointerEvents: 'none', userSelect: 'none' }}>
      {data.stamp}
    </div>
  ) : null
  const containerBase = { width: '100%', maxWidth: '420px', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) rotate(0deg)' : 'translateY(16px) rotate(0.5deg)', transition: `opacity 700ms ${EASE.inOut}, transform 700ms ${EASE.out}`, position: 'relative' }
  let docEl = null
  if (style === 'letter') {
    docEl = <div style={{ ...containerBase, backgroundColor: '#faf6ef', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '2px', padding: '2rem 2.2rem', boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)', fontFamily: 'Georgia, serif', color: '#2a2118', lineHeight: 1.75 }}>
      {stampEl}
      {data.title && <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, marginBottom: '1.2rem' }}>{data.title}</div>}
      {data.date && <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '1rem', fontStyle: 'italic' }}>{data.date}</div>}
      {data.to && <div style={{ fontSize: '0.82rem', marginBottom: '1.2rem' }}>À {data.to},</div>}
      <p style={{ margin: '0 0 1.2rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', whiteSpace: 'pre-wrap' }}>{data.body}</p>
      {data.from && <div style={{ fontSize: '0.82rem', opacity: 0.6, fontStyle: 'italic' }}>{data.from}</div>}
    </div>
  } else if (style === 'telegram') {
    docEl = <div style={{ ...containerBase, backgroundColor: '#f0e8d0', border: '2px solid #8a7a5a', borderRadius: '2px', padding: '1.6rem 2rem', boxShadow: '0 6px 32px rgba(0,0,0,0.15)', fontFamily: "'Courier New', monospace", color: '#2a2118', lineHeight: 1.65 }}>
      {stampEl}
      <div style={{ fontSize: '0.62rem', letterSpacing: '0.18em', opacity: 0.45, marginBottom: '1rem', textTransform: 'uppercase' }}>TÉLÉGRAMME</div>
      {data.date && <div style={{ fontSize: '0.72rem', opacity: 0.45, marginBottom: '0.8rem' }}>{data.date}</div>}
      {data.title && <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '1rem', textTransform: 'uppercase' }}>{data.title}</div>}
      <p style={{ margin: '0 0 1rem', fontSize: 'clamp(0.82rem, 1.9vw, 0.92rem)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'pre-wrap' }}>{data.body}</p>
      {data.from && <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '0.8rem' }}>— {data.from}</div>}
    </div>
  } else if (style === 'note') {
    docEl = <div style={{ ...containerBase, backgroundColor: '#fefce8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '2px', padding: '1.6rem 1.8rem', boxShadow: '2px 3px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)', fontFamily: 'Georgia, serif', color: '#2a2118', lineHeight: 1.8, transform: visible ? 'rotate(-0.8deg)' : 'rotate(-0.8deg) translateY(16px)' }}>
      {stampEl}
      {data.title && <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.5, marginBottom: '0.8rem', fontStyle: 'italic' }}>{data.title}</div>}
      <p style={{ margin: '0 0 1rem', fontSize: 'clamp(0.88rem, 2.1vw, 1rem)', whiteSpace: 'pre-wrap' }}>{data.body}</p>
      {data.from && <div style={{ fontSize: '0.8rem', opacity: 0.5, textAlign: 'right', fontStyle: 'italic' }}>— {data.from}</div>}
    </div>
  } else if (style === 'newspaper') {
    docEl = <div style={{ ...containerBase, backgroundColor: '#f5f0e0', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', padding: '1.6rem 2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontFamily: 'Georgia, serif', color: '#1a1008' }}>
      {stampEl}
      {data.date && <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', opacity: 0.4, borderBottom: '1px solid rgba(0,0,0,0.15)', paddingBottom: '0.5rem', marginBottom: '0.8rem', textTransform: 'uppercase' }}>{data.date}</div>}
      {data.title && <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.8rem', borderBottom: '2px solid rgba(0,0,0,0.2)', paddingBottom: '0.6rem' }}>{data.title}</div>}
      <p style={{ margin: 0, fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)', lineHeight: 1.7, textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{data.body}</p>
    </div>
  } else {
    docEl = <div style={{ ...containerBase, backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '1.6rem 2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', color: '#fff', fontFamily: 'monospace' }}>
      {stampEl}
      {data.title && <div style={{ fontSize: '0.65rem', letterSpacing: '0.18em', opacity: 0.5, marginBottom: '0.8rem', textTransform: 'uppercase' }}>{data.title}</div>}
      {data.from && <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', fontWeight: 700, marginBottom: '0.4rem' }}>{data.from}</div>}
      {data.to && <div style={{ fontSize: '0.72rem', opacity: 0.5, marginBottom: '1rem' }}>{data.to}</div>}
      <p style={{ margin: 0, fontSize: 'clamp(0.8rem, 1.8vw, 0.88rem)', opacity: 0.75, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data.body}</p>
      {data.date && <div style={{ fontSize: '0.65rem', opacity: 0.35, marginTop: '1rem', letterSpacing: '0.08em' }}>{data.date}</div>}
    </div>
  }
  return (
    <AnimatedWrapper style={{ gap: '2rem' }}>
      {docEl}
    </AnimatedWrapper>
  )
}

// ─── Type : Code / Digicode ───────────────────────────────────────────────────
function GameCode({ data, onResolved }) {
  const correctAnswer = String(data.answer || '')
  const isNumeric = /^\d+$/.test(correctAnswer)
  const [input, setInput] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(false)
  const { playTock, playSuccess, playError, playDelete } = useKeySound()
  const validate = (val) => {
    const attempt = String(val || input)
    if (attempt === correctAnswer) { playSuccess(); setSuccess(true); setTimeout(onResolved, 900) }
    else { playError(); setError(true); setTimeout(() => { setError(false); setInput('') }, 700) }
  }
  const handleKey = (digit) => {
    if (success || error) return
    playTock()
    const next = input + digit
    setInput(next)
    if (next.length === correctAnswer.length) setTimeout(() => validate(next), 80)
  }
  const handleDelete = () => { if (success) return; playDelete(); setInput(i => i.slice(0, -1)); setError(false) }
  const handleTextChange = (e) => { if (success) return; setInput(e.target.value); setError(false) }
  const handleTextSubmit = () => validate(input)
  const dotColor = success ? 'rgba(39,174,96,0.9)' : error ? 'rgba(192,57,43,0.9)' : 'var(--color-text-focus, #222)'
  return (
    <AnimatedWrapper style={{ gap: '1.8rem' }}>
      {data.prompt && <p style={{ fontSize: 'clamp(0.88rem, 2vw, 1rem)', color: 'var(--color-text-focus, #222)', textAlign: 'center', lineHeight: 1.6, opacity: 0.75, margin: 0 }}>{data.prompt}</p>}
      <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', justifyContent: 'center', animation: error ? `game-shake 0.4s ${EASE.inOut}` : 'none' }}>
        {isNumeric ? (
          Array.from({ length: correctAnswer.length }).map((_, i) => (
            <div key={i} style={{ width: '0.65rem', height: '0.65rem', borderRadius: '50%', backgroundColor: i < input.length ? dotColor : 'transparent', border: `1.5px solid ${i < input.length ? dotColor : 'rgba(0,0,0,0.2)'}`, transition: `background-color 150ms ease, border-color 150ms ease`, transform: success && i < input.length ? 'scale(1.15)' : 'scale(1)' }} />
          ))
        ) : (
          <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontFamily: 'monospace', letterSpacing: '0.25em', color: dotColor, minWidth: '6rem', textAlign: 'center', borderBottom: `1px solid ${dotColor}`, paddingBottom: '0.25rem', transition: 'color 200ms ease' }}>
            {input || '\u00a0'}
          </div>
        )}
      </div>
      {data.hint && !success && <Hint delay={1200}>{data.hint}</Hint>}
      {isNumeric && !success && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', width: '100%', maxWidth: '260px' }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <button key={i} onClick={() => k === '⌫' ? handleDelete() : k ? handleKey(k) : null} disabled={!k}
              style={{ padding: '1rem 0', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', backgroundColor: k === '⌫' ? 'rgba(0,0,0,0.04)' : !k ? 'transparent' : 'rgba(0,0,0,0.02)', color: 'var(--color-text-focus, #222)', fontFamily: 'var(--font-primary, Georgia, serif)', fontSize: k === '⌫' ? '1rem' : '1.2rem', cursor: k ? 'pointer' : 'default', borderColor: !k ? 'transparent' : undefined, opacity: !k ? 0 : 1, transition: 'background-color 100ms ease' }}
              onMouseEnter={e => { if (k) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.07)' }}
              onMouseLeave={e => { if (k) e.currentTarget.style.backgroundColor = k === '⌫' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)' }}
            >{k}</button>
          ))}
        </div>
      )}
      {!isNumeric && !success && (
        <>
          <input autoFocus type="text" value={input} onChange={handleTextChange} onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit() }}
            style={{ width: '100%', maxWidth: '300px', padding: '0.8rem 1rem', border: `1px solid ${error ? 'rgba(192,57,43,0.6)' : 'var(--color-text-focus, #222)'}`, borderRadius: '2px', background: 'none', fontFamily: 'var(--font-primary, Georgia, serif)', fontSize: '1rem', color: 'var(--color-text-focus, #222)', textAlign: 'center', outline: 'none', boxSizing: 'border-box', transition: `border-color 300ms ${EASE.inOut}` }} />
          <ContinueBtn onClick={handleTextSubmit} label="valider" delay={300} />
        </>
      )}
      {data.errorMessage && error && <p style={{ fontSize: '0.78rem', color: '#c0392b', opacity: 0.85, textAlign: 'center', margin: 0, fontStyle: 'italic' }}>{data.errorMessage}</p>}
    </AnimatedWrapper>
  )
}

// ─── Type : Énigme texte libre ────────────────────────────────────────────────
function GameRiddle({ data, onResolved }) {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('idle')
  const [feedback, setFeedback] = useState('')
  const { playSuccess, playError } = useKeySound()
  const validate = () => {
    const raw = input.trim()
    const attempt = data.caseSensitive ? raw : raw.toLowerCase()
    const answers = String(data.answer || '').split('|').map(a => data.caseSensitive ? a.trim() : a.trim().toLowerCase())
    if (answers.some(a => a === attempt)) { playSuccess(); setStatus('success'); setTimeout(onResolved, 1000); return }
    if (Array.isArray(data.decoys)) {
      const decoy = data.decoys.find(d => (data.caseSensitive ? d.key : d.key?.toLowerCase()) === attempt)
      if (decoy) { setFeedback(decoy.message || data.errorMessage || 'Ce n\'est pas ça…'); setStatus('error'); setTimeout(() => setStatus('idle'), 3000); return }
    }
    const isClose = answers.some(a => levenshtein(attempt, a) <= 2)
    if (isClose) { playError(); setFeedback(data.closeMessage || 'Presque…'); setStatus('close'); setTimeout(() => setStatus('idle'), 2500); return }
    playError(); setFeedback(data.errorMessage || 'Ce n\'est pas ça…'); setStatus('error'); setTimeout(() => setStatus('idle'), 2500)
  }
  const borderColor = status === 'success' ? 'rgba(39,174,96,0.7)' : status === 'error' ? 'rgba(192,57,43,0.6)' : status === 'close' ? 'rgba(212,130,10,0.6)' : 'var(--color-text-focus, #222)'
  return (
    <AnimatedWrapper style={{ gap: '1.8rem' }}>
      {data.question && <p style={{ fontSize: 'clamp(0.95rem, 2.3vw, 1.1rem)', color: 'var(--color-text-focus, #222)', textAlign: 'center', lineHeight: 1.7, opacity: 0.85, margin: 0, fontStyle: 'italic' }}>{data.question}</p>}
      <input autoFocus type="text" value={input} onChange={e => { setInput(e.target.value); setStatus('idle'); setFeedback('') }} onKeyDown={e => { if (e.key === 'Enter') validate() }} disabled={status === 'success'} placeholder={data.placeholder || 'votre réponse…'}
        style={{ width: '100%', maxWidth: '320px', padding: '0.8rem 1rem', border: `1px solid ${borderColor}`, borderRadius: '2px', background: status === 'success' ? 'rgba(39,174,96,0.04)' : 'none', fontFamily: 'var(--font-primary, Georgia, serif)', fontSize: '1rem', color: 'var(--color-text-focus, #222)', textAlign: 'center', outline: 'none', boxSizing: 'border-box', animation: status === 'error' ? `game-shake 0.4s ${EASE.inOut}` : 'none', transition: `border-color 300ms ${EASE.inOut}, background-color 300ms ${EASE.inOut}` }} />
      {data.hint && status === 'idle' && <Hint delay={800}>{data.hint}</Hint>}
      {feedback && status !== 'idle' && <p style={{ fontSize: '0.82rem', color: status === 'close' ? '#d4820a' : '#c0392b', opacity: 0.85, textAlign: 'center', margin: 0, fontStyle: 'italic', transition: `opacity 250ms ${EASE.out}` }}>{feedback}</p>}
      {status !== 'success' && <ContinueBtn onClick={validate} label="valider" delay={300} />}
      {status === 'success' && data.successMessage && <p style={{ fontSize: '0.88rem', color: 'var(--color-text-focus, #222)', opacity: 0.6, fontStyle: 'italic', margin: 0, textAlign: 'center' }}>{data.successMessage}</p>}
    </AnimatedWrapper>
  )
}

// ─── Type : Crypte ────────────────────────────────────────────────────────────
function GameCrypte({ data, onResolved }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const { playSuccess, playError } = useKeySound()
  const encoded = data.encoded || ''
  const [displayedEncoded, setDisplayedEncoded] = useState('')
  const indexRef = useRef(0)
  useEffect(() => {
    if (!encoded) return
    const interval = setInterval(() => {
      if (indexRef.current >= encoded.length) { clearInterval(interval); setRevealed(true); return }
      setDisplayedEncoded(encoded.slice(0, indexRef.current + 1))
      indexRef.current += 1
    }, 55)
    return () => clearInterval(interval)
  }, [encoded])
  const validate = () => {
    const correct = String(data.answer || '').trim().toLowerCase()
    const attempt = input.trim().toLowerCase()
    if (attempt === correct) { playSuccess(); setSuccess(true); setTimeout(onResolved, 900) }
    else { playError(); setError(data.errorMessage || 'Ce n\'est pas le bon déchiffrement.'); setTimeout(() => setError(''), 2500) }
  }
  return (
    <AnimatedWrapper>
      {data.prompt && <p style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', color: 'var(--color-text-focus, #222)', textAlign: 'center', lineHeight: 1.6, opacity: 0.7, margin: 0, fontStyle: 'italic' }}>{data.prompt}</p>}
      <div style={{ width: '100%', maxWidth: '420px', padding: '1.4rem 1.6rem', border: '1px solid var(--color-text-focus, #222)', borderRadius: '2px', boxSizing: 'border-box', position: 'relative' }}>
        <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', letterSpacing: '0.18em', color: 'var(--color-text-focus, #222)', textAlign: 'center', lineHeight: 1.6, wordBreak: 'break-all' }}>
          {displayedEncoded}
          {!revealed && <span style={{ display: 'inline-block', width: '1.5px', height: '1em', backgroundColor: 'var(--color-text-focus, #222)', marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'game-blink 0.65s step-end infinite' }} />}
        </p>
      </div>
      {revealed && (
        <input type="text" value={input} onChange={e => { setInput(e.target.value); setError('') }} onKeyDown={e => { if (e.key === 'Enter') validate() }} autoFocus disabled={success}
          style={{ width: '100%', maxWidth: '320px', padding: '0.8rem 1rem', border: `1px solid ${success ? 'rgba(39,174,96,0.7)' : error ? 'rgba(192,57,43,0.6)' : 'var(--color-text-focus, #222)'}`, borderRadius: '2px', background: success ? 'rgba(39,174,96,0.04)' : 'none', fontFamily: 'var(--font-primary, Georgia, serif)', fontSize: '1rem', color: 'var(--color-text-focus, #222)', textAlign: 'center', outline: 'none', boxSizing: 'border-box', transition: `border-color 350ms ${EASE.inOut}, background-color 350ms ${EASE.inOut}` }} />
      )}
      {data.hint && !error && !success && revealed && <Hint>{data.hint}</Hint>}
      <p style={{ fontSize: '0.78rem', color: '#c0392b', opacity: error ? 0.85 : 0, textAlign: 'center', minHeight: '1em', fontStyle: 'italic', margin: 0, transition: `opacity 250ms ${EASE.out}` }}>{error}</p>
      {revealed && !success && <ContinueBtn onClick={validate} label="déchiffrer" delay={200} />}
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
    if (data.memoryKey) { try { sessionStorage.setItem(`ili_journal_${data.memoryKey}`, text) } catch {} }
    setSaved(true); setTimeout(onResolved, 900)
  }
  return (
    <AnimatedWrapper>
      {data.prompt && <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', color: 'var(--color-text-focus, #222)', textAlign: 'center', lineHeight: 1.7, opacity: 0.9, margin: 0, fontStyle: 'italic' }}>{data.prompt}</p>}
      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        <textarea autoFocus value={text} onChange={e => setText(e.target.value)} disabled={saved} placeholder={data.placeholder || ''} rows={5}
          style={{ width: '100%', padding: '1.1rem 1.2rem', border: `1px solid ${saved ? 'rgba(39,174,96,0.5)' : 'var(--color-text-focus, #222)'}`, borderRadius: '2px', background: saved ? 'rgba(39,174,96,0.03)' : 'none', fontFamily: 'var(--font-primary, Georgia, serif)', fontSize: '1rem', color: 'var(--color-text-focus, #222)', lineHeight: 1.75, outline: 'none', resize: 'none', boxSizing: 'border-box', transition: `border-color 400ms ${EASE.inOut}, background-color 400ms ${EASE.inOut}` }} />
        <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.75rem', fontSize: '0.65rem', opacity: text.length > 0 ? 0.3 : 0, color: 'var(--color-text-focus, #222)', transition: 'opacity 300ms ease', fontFamily: 'monospace', pointerEvents: 'none' }}>{text.length}</div>
      </div>
      {!saved && <ContinueBtn onClick={handleContinue} label={data.continueLabel || 'je me souviendrai de ça'} delay={400} />}
      {text.trim().length > 0 && text.trim().length < minLength && !saved && <Hint>continuez…</Hint>}
    </AnimatedWrapper>
  )
}

// ─── Type : Séquence ──────────────────────────────────────────────────────────
function GameSequence({ data, onResolved }) {
  const correct = data.items || []
  const { playSuccess, playError } = useKeySound()
  const [items, setItems] = useState(() => {
    const shuffled = [...correct]
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]] }
    if (shuffled.join() === correct.join() && shuffled.length > 1) { const tmp = shuffled[0]; shuffled[0] = shuffled[1]; shuffled[1] = tmp }
    return shuffled
  })
  const [success, setSuccess] = useState(false)
  const [errorIdx, setErrorIdx] = useState(null)
  const isCorrect = items.join('|||') === correct.join('|||')
  const move = (i, dir) => {
    if (success) return
    const next = [...items]; const target = i + dir
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target], next[i]]; setItems(next); setErrorIdx(null)
  }
  const validate = () => {
    if (isCorrect) { playSuccess(); setSuccess(true); setTimeout(onResolved, 1000) }
    else { playError(); setErrorIdx('all'); setTimeout(() => setErrorIdx(null), 800) }
  }
  return (
    <AnimatedWrapper>
      {data.prompt && <p style={{ fontSize: 'clamp(0.88rem, 2vw, 1rem)', color: 'var(--color-text-focus, #222)', textAlign: 'center', lineHeight: 1.6, opacity: 0.8, margin: 0 }}>{data.prompt}</p>}
      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, i) => {
          const isWrong = errorIdx === 'all'; const isGood = success && item === correct[i]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 0.9rem', border: `1px solid ${isWrong ? 'rgba(192,57,43,0.6)' : isGood ? 'rgba(39,174,96,0.5)' : 'var(--color-text-focus, #222)'}`, borderRadius: '2px', backgroundColor: isWrong ? 'rgba(192,57,43,0.04)' : isGood ? 'rgba(39,174,96,0.04)' : 'transparent', animation: isWrong ? `game-shake 0.4s ${EASE.inOut}` : 'none', transition: `border-color 300ms ${EASE.inOut}, background-color 300ms ${EASE.inOut}` }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-focus, #222)', opacity: 0.3, minWidth: '1rem', textAlign: 'center', fontFamily: 'monospace' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', color: 'var(--color-text-focus, #222)', fontFamily: 'var(--font-primary, Georgia, serif)', lineHeight: 1.4 }}>{item}</span>
              {!success && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', fontSize: '0.7rem', color: 'var(--color-text-focus, #222)', opacity: i === 0 ? 0.15 : 0.5, padding: '1px 4px', lineHeight: 1 }} onMouseEnter={e => { if (i > 0) e.currentTarget.style.opacity = '1' }} onMouseLeave={e => { if (i > 0) e.currentTarget.style.opacity = '0.5' }}>▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={{ background: 'none', border: 'none', cursor: i === items.length - 1 ? 'default' : 'pointer', fontSize: '0.7rem', color: 'var(--color-text-focus, #222)', opacity: i === items.length - 1 ? 0.15 : 0.5, padding: '1px 4px', lineHeight: 1 }} onMouseEnter={e => { if (i < items.length - 1) e.currentTarget.style.opacity = '1' }} onMouseLeave={e => { if (i < items.length - 1) e.currentTarget.style.opacity = '0.5' }}>▼</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!success && <ContinueBtn onClick={validate} label="valider" delay={300} />}
      {success && <p style={{ fontSize: '0.88rem', color: 'var(--color-text-focus, #222)', opacity: 0.6, fontStyle: 'italic', margin: 0, textAlign: 'center' }}>{data.successMessage || 'Exact.'}</p>}
    </AnimatedWrapper>
  )
}

// ─── Palette teintes ──────────────────────────────────────────────────────────
const TINT_MAP = {
  auto:     { bg: null, text: null },
  noir:     { bg: '#080809', text: 'rgba(255,255,255,0.75)' },
  ardoise:  { bg: '#0d0d12', text: 'rgba(255,255,255,0.72)' },
  encre:    { bg: '#080c10', text: 'rgba(200,220,255,0.75)' },
  charbon:  { bg: '#0f0f0f', text: 'rgba(255,255,255,0.70)' },
  violet:   { bg: '#0c0a14', text: 'rgba(200,190,255,0.78)' },
  teal:     { bg: '#080e0d', text: 'rgba(160,230,210,0.75)' },
  bordeaux: { bg: '#0e0808', text: 'rgba(255,200,200,0.75)' },
  brume:    { bg: '#0a0a0c', text: 'rgba(220,220,255,0.72)' },
  ambre:    { bg: '#0e0b06', text: 'rgba(255,220,150,0.75)' },
  foret:    { bg: '#080d09', text: 'rgba(170,230,180,0.72)' },
  cobalt:   { bg: '#070a10', text: 'rgba(160,200,255,0.75)' },
  cendre:   { bg: '#0c0c0b', text: 'rgba(220,215,205,0.72)' },
}
const EASE_S = 'cubic-bezier(0.76, 0, 0.24, 1)'

// ─── Type : Choix ─────────────────────────────────────────────────────────────
function GameChoice({ data, onResolved, onNavigateToPart }) {
  const isQuiz      = data.type === 'choice_quiz'
  const layout      = data?.layout || { axis: 'H', linesH: 1, linesV: 0, proportions: [1,1], tint: 'noir', style: 'flat' }
  const layoutStyle = layout.style || 'flat'
  const tintKey     = layout.tint || 'noir'
  const tint        = TINT_MAP[tintKey] || TINT_MAP.noir
  const choices     = Array.isArray(data?.choices) ? data.choices : []
  const [linesVisible, setLinesVisible]   = useState(false)
  const [promptVisible, setPromptVisible] = useState(false)
  const [choicesPhase, setChoicesPhase]   = useState([])
  const [selectedIdx, setSelectedIdx]     = useState(null)
  const [shakeIdx, setShakeIdx]           = useState(null)
  const [errorMsg, setErrorMsg]           = useState('')
  useEffect(() => {
    setChoicesPhase(choices.map(() => 'hidden'))
    const t0 = setTimeout(() => setPromptVisible(true), 120)
    const t1 = setTimeout(() => setLinesVisible(true), 480)
    const timers = [t0, t1, ...choices.map((_, i) =>
      setTimeout(() => setChoicesPhase(prev => { const next = [...prev]; next[i] = 'visible'; return next }), 820 + i * 110)
    )]
    return () => timers.forEach(clearTimeout)
  }, [])
  const axis   = layout.axis  || 'H'
  const linesH = axis === 'V' ? 0 : (layout.linesH || 0)
  const linesV = axis === 'H' ? 0 : (layout.linesV || 0)
  const zonesH = linesH + 1; const zonesV = linesV + 1
  const totalZones = axis === 'X' ? zonesH * zonesV : (axis === 'H' ? zonesH : zonesV)
  const raw = layout.proportions && layout.proportions.length === totalZones ? layout.proportions : Array(totalZones).fill(1)
  const sumH = raw.reduce((a, b) => a + b, 0) || 1
  const frH = axis !== 'V' ? (axis === 'X' ? Array(zonesH).fill(0).map((_, i) => { const rowVals = Array(zonesV).fill(0).map((_, j) => raw[i * zonesV + j] || 1); return rowVals.reduce((a,b) => a+b, 0) + 'fr' }).join(' ') : raw.map(v => v + 'fr').join(' ')) : '1fr'
  const frV = axis !== 'H' ? (axis === 'X' ? Array(zonesV).fill(0).map((_, j) => { const colVals = Array(zonesH).fill(0).map((_, i) => raw[i * zonesV + j] || 1); return colVals.reduce((a,b) => a+b, 0) + 'fr' }).join(' ') : raw.map(v => v + 'fr').join(' ')) : '1fr'
  const MARGIN = 7; const svgLines = []
  if (linesH > 0) { let accH = 0; for (let i = 0; i < linesH; i++) { const w = axis === 'X' ? Array(zonesV).fill(0).reduce((acc, _, j) => acc + (raw[i * zonesV + j] || 1), 0) : raw[i] || 1; accH += w; svgLines.push({ type: 'H', pct: accH / sumH }) } }
  if (linesV > 0) { let accV = 0; const sumV = raw.reduce((a, b) => a + b, 0) || 1; for (let i = 0; i < linesV; i++) { const w = axis === 'X' ? Array(zonesH).fill(0).reduce((acc, _, ri) => acc + (raw[ri * zonesV + i] || 1), 0) : raw[i] || 1; accV += w; svgLines.push({ type: 'V', pct: accV / sumV }) } }
  const handleChoiceClick = (idx) => {
    if (selectedIdx !== null) return
    const choice = choices[idx]; setSelectedIdx(idx)
    setTimeout(() => {
      if (isQuiz) {
        if (choice.correct) { setTimeout(onResolved, 280) }
        else { setShakeIdx(idx); setErrorMsg(data.errorMessage || 'Ce n\'est pas le bon chemin.'); setTimeout(() => { setShakeIdx(null); setSelectedIdx(null); setErrorMsg('') }, 700) }
      } else {
        const targetId = choice.targetPartId
        setTimeout(() => { if (targetId && onNavigateToPart) { onNavigateToPart(targetId) } else { onResolved() } }, 180)
      }
    }, 20)
  }
  const safeTotalZones = Number.isFinite(totalZones) && totalZones > 0 ? totalZones : choices.length || 1
  const zoneList = Array(safeTotalZones).fill(null).map((_, i) => choices[i] || null)
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--color-bg, #0a0a0a)', color: 'var(--color-text-focus, rgba(255,255,255,0.75))', fontFamily: 'var(--font-primary, Georgia, serif)', overflow: 'hidden' }}>
      {data.prompt && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.8rem 2rem 1rem', opacity: promptVisible ? 1 : 0, transform: promptVisible ? 'translateY(0)' : 'translateY(-10px)', transition: `opacity 700ms ${EASE_S}, transform 700ms ${EASE_S}`, pointerEvents: 'none' }}>
          <p style={{ margin: 0, fontSize: 'clamp(0.78rem, 2vw, 0.92rem)', letterSpacing: '0.06em', opacity: 0.55, textAlign: 'center', fontStyle: 'italic', color: 'var(--color-text-focus, rgba(255,255,255,0.6))', maxWidth: '32rem' }}>{data.prompt}</p>
        </div>
      )}
      {layoutStyle === 'flat' && svgLines.map((line, li) => {
        const isH = line.type === 'H'
        return <div key={li} style={{ position: 'absolute', pointerEvents: 'none', zIndex: 5, backgroundColor: 'rgba(255,255,255,0.22)', ...(isH ? { left: `${MARGIN}%`, right: `${MARGIN}%`, height: '1px', top: `calc(${line.pct * 100}% - 0.5px)`, transformOrigin: 'center center', transform: linesVisible ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 900ms ${EASE_S} ${li * 80}ms` } : { top: `${MARGIN}%`, bottom: `${MARGIN}%`, width: '1px', left: `calc(${line.pct * 100}% - 0.5px)`, transformOrigin: 'center center', transform: linesVisible ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 900ms ${EASE_S} ${li * 80}ms` }) }} />
      })}
      {layoutStyle === 'flat' ? (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateRows: frH, gridTemplateColumns: frV, zIndex: 6 }}>
          {zoneList.map((choice, zi) => {
            const isSelected = selectedIdx === zi; const isShaking = shakeIdx === zi
            const phase = choicesPhase[zi] || 'hidden'; const isEmpty = !choice || !choice.text
            const zoneTint = TINT_MAP[choice?.tint] || tint
            return (
              <div key={zi} onClick={() => choice && !isEmpty ? handleChoiceClick(zi) : undefined} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', cursor: choice && !isEmpty ? 'pointer' : 'default', filter: isSelected ? 'invert(0.12) brightness(1.4)' : isShaking ? 'brightness(0.85) saturate(1.4)' : 'none', backgroundColor: isShaking ? 'rgba(192,57,43,0.08)' : 'transparent', animation: isShaking ? `game-shake 0.4s ${EASE_S}` : 'none', transition: `filter 180ms ease, background-color 180ms ease`, userSelect: 'none' }}>
                {choice && <span style={{ fontSize: 'clamp(0.88rem, 2.5vw, 1.1rem)', letterSpacing: '0.04em', lineHeight: 1.5, textAlign: 'center', color: zoneTint.text || tint.text, opacity: phase === 'visible' ? 1 : 0, transform: phase === 'visible' ? 'translateY(0)' : 'translateY(12px)', transition: `opacity 600ms ${EASE_S}, transform 600ms ${EASE_S}`, maxWidth: '22rem', display: 'block' }}>{choice.text}</span>}
              </div>
            )
          })}
        </div>
      ) : layoutStyle === 'bubble' ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 6 }}>
          {(() => {
            const n = zoneList.length
            const PLAYER_BUBBLE_VARIANTS = { 2:[[[28,50],[72,50]],[[25,35],[75,65]],[[50,28],[50,72]],[[30,50],[68,52]]], 3:[[[50,26],[25,65],[75,65]],[[25,36],[75,36],[50,72]],[[20,54],[50,26],[80,54]],[[22,50],[50,50],[78,50]]], 4:[[[28,32],[72,32],[28,68],[72,68]],[[50,20],[80,50],[50,80],[20,50]],[[25,28],[65,28],[25,60],[25,84]],[[50,22],[22,62],[50,72],[78,62]]], 5:[[[25,28],[75,28],[50,50],[25,72],[75,72]],[[50,18],[18,50],[50,50],[82,50],[50,82]],[[50,16],[83,38],[72,76],[28,76],[17,38]],[[30,28],[70,28],[18,65],[50,72],[82,65]]], 6:[[[50,12],[82,30],[82,65],[50,82],[18,65],[18,30]],[[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],[[50,16],[28,40],[72,40],[18,68],[50,72],[82,68]],[[50,50],[50,18],[77,34],[77,66],[50,82],[23,66]]] }
            const variantSet = PLAYER_BUBBLE_VARIANTS[Math.min(n, 6)] || PLAYER_BUBBLE_VARIANTS[2]
            const positions = (variantSet[layout.bubbleVariant ?? 0] || variantSet[0])
            const BASE = n <= 2 ? 150 : n <= 3 ? 130 : n <= 4 ? 115 : n <= 5 ? 105 : 92
            const BUBBLE_ACCENTS = { noir:'rgba(255,255,255,0.9)', ardoise:'rgba(176,184,208,0.9)', encre:'rgba(122,176,240,0.95)', charbon:'rgba(220,220,220,0.85)', violet:'rgba(196,176,255,0.95)', teal:'rgba(96,232,200,0.95)', bordeaux:'rgba(240,128,128,0.95)', brume:'rgba(184,184,240,0.9)', ambre:'rgba(248,200,96,0.95)', foret:'rgba(112,232,144,0.95)', cobalt:'rgba(128,184,255,0.95)', cendre:'rgba(208,204,192,0.85)', auto:'rgba(255,255,255,0.9)' }
            const textLengths = zoneList.map(c => (c?.text || '').length)
            const rawSizes = textLengths.map(len => BASE + Math.min(Math.floor(len / 5) * 8, 40))
            const maxSz = Math.max(...rawSizes)
            const finalSizes = layout.equalSizes ? rawSizes.map(() => maxSz) : rawSizes
            return zoneList.map((choice, zi) => {
              const isSelected = selectedIdx === zi; const isShaking = shakeIdx === zi
              const phase = choicesPhase[zi] || 'hidden'; const isEmpty = !choice || !choice.text
              const pos = positions[zi] || [50, 50]; const BUBBLE_SIZE = finalSizes[zi] || BASE
              const bubbleTintKey = (choice?.tint && choice.tint !== 'auto') ? choice.tint : (tintKey || 'noir')
              const accentColor = BUBBLE_ACCENTS[bubbleTintKey] || 'rgba(255,255,255,0.9)'
              return (
                <div key={zi} onClick={() => choice && !isEmpty ? handleChoiceClick(zi) : undefined} style={{ position: 'absolute', left: `calc(${pos[0]}% - ${BUBBLE_SIZE / 2}px)`, top: `calc(${pos[1]}% - ${BUBBLE_SIZE / 2}px)`, width: `${BUBBLE_SIZE}px`, height: `${BUBBLE_SIZE}px`, borderRadius: '50%', backgroundColor: isShaking ? 'rgba(192,57,43,0.15)' : 'transparent', border: isSelected ? `3px solid rgba(255,255,255,0.85)` : isShaking ? `3px solid rgba(192,57,43,0.8)` : `2.5px solid ${accentColor}`, boxShadow: isSelected ? `0 0 32px ${accentColor.replace(/[\d.]+\)$/, '0.6)')}, 0 0 10px ${accentColor.replace(/[\d.]+\)$/, '0.35)')}` : `0 0 18px ${accentColor.replace(/[\d.]+\)$/, '0.3)')}`, cursor: choice && !isEmpty ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', boxSizing: 'border-box', animation: isShaking ? `game-shake 0.4s ${EASE_S}` : 'none', opacity: phase === 'visible' ? 1 : 0, transform: phase === 'visible' ? 'scale(1)' : 'scale(0.65)', transition: `opacity 650ms ${EASE_S}, transform 650ms ${EASE_S}, box-shadow 200ms ease, border-color 200ms ease`, userSelect: 'none' }}>
                  <span style={{ fontSize: BUBBLE_SIZE > 130 ? 'clamp(0.88rem, 2.2vw, 1rem)' : 'clamp(0.78rem, 2vw, 0.92rem)', letterSpacing: '0.03em', lineHeight: 1.4, textAlign: 'center', color: 'var(--color-text-focus, rgba(255,255,255,0.9))' }}>{choice?.text || ''}</span>
                </div>
              )
            })
          })()}
        </div>
      ) : (
        <>
          {(() => {
            const cardVariantIdx = layout.bubbleVariant ?? 0
            const PLAYER_CARD_LAYOUTS = ['centered', 'spaced', 'solo', 'cascade']
            const cardLayout = PLAYER_CARD_LAYOUTS[cardVariantIdx % PLAYER_CARD_LAYOUTS.length] || 'centered'
            const CARD_ACCENT_MAP = { noir:'rgba(255,255,255,0.55)', ardoise:'rgba(176,184,208,0.85)', encre:'rgba(122,176,240,0.9)', charbon:'rgba(220,220,220,0.65)', violet:'rgba(196,176,255,0.95)', teal:'rgba(96,232,200,0.95)', bordeaux:'rgba(240,128,128,0.95)', brume:'rgba(184,184,240,0.9)', ambre:'rgba(248,200,96,0.95)', foret:'rgba(112,232,144,0.95)', cobalt:'rgba(128,184,255,0.95)', cendre:'rgba(208,204,192,0.8)', auto:'rgba(255,255,255,0.55)' }
            return (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: cardLayout === 'spaced' ? 'space-evenly' : 'center', gap: cardLayout === 'spaced' ? '0' : '0.6rem', padding: '2.5rem 1.6rem', zIndex: 6 }}>
                {zoneList.map((choice, zi) => {
                  const isSelected = selectedIdx === zi; const isShaking = shakeIdx === zi
                  const phase = choicesPhase[zi] || 'hidden'; const isEmpty = !choice || !choice.text
                  const label = String.fromCharCode(65 + zi)
                  const cardTintKey = (choice?.tint && choice.tint !== 'auto') ? choice.tint : (tintKey || 'noir')
                  const cardAccent = CARD_ACCENT_MAP[cardTintKey] || 'rgba(255,255,255,0.55)'
                  const isSolo = cardLayout === 'solo' && zi === 0
                  const cascadeShift = cardLayout === 'cascade' ? `${zi * 6}px` : '0'
                  return (
                    <div key={zi} onClick={() => choice && !isEmpty ? handleChoiceClick(zi) : undefined} style={{ width: '100%', maxWidth: isSolo ? '28rem' : '26rem', padding: isSolo ? '1.2rem 1.4rem' : '0.95rem 1.1rem', borderRadius: isSolo ? '14px' : '10px', backgroundColor: isShaking ? 'rgba(192,57,43,0.12)' : isSolo ? 'rgba(255,255,255,0.05)' : 'transparent', border: isSelected ? `1px solid rgba(255,255,255,0.4)` : isShaking ? `1px solid rgba(192,57,43,0.5)` : `1px solid ${cardAccent.replace(/[\d.]+\)$/, '0.18)')}`, boxShadow: isSelected ? `0 0 20px ${cardAccent.replace(/[\d.]+\)$/, '0.3)')}` : isSolo ? `0 0 18px ${cardAccent.replace(/[\d.]+\)$/, '0.2)')}` : 'none', cursor: choice && !isEmpty ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: isSolo ? '1rem' : '0.85rem', animation: isShaking ? `game-shake 0.4s ${EASE_S}` : 'none', opacity: phase === 'visible' ? 1 : 0, transform: phase === 'visible' ? `translateX(${cascadeShift})` : 'translateX(-18px)', transition: `opacity 600ms ${EASE_S}, transform 600ms ${EASE_S}, box-shadow 180ms ease`, userSelect: 'none', boxSizing: 'border-box' }}>
                      <div style={{ width: isSolo ? '34px' : '28px', height: isSolo ? '34px' : '28px', borderRadius: isSolo ? '8px' : '6px', border: `1px solid ${cardAccent.replace(/[\d.]+\)$/, '0.3)')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: isSolo ? `0 0 8px ${cardAccent.replace(/[\d.]+\)$/, '0.2)')}` : 'none' }}>
                        <span style={{ fontSize: isSolo ? '0.85rem' : '0.72rem', fontWeight: 600, color: cardAccent, letterSpacing: '0.04em', fontFamily: 'system-ui, sans-serif' }}>{label}</span>
                      </div>
                      <span style={{ fontSize: isSolo ? 'clamp(1rem, 2.5vw, 1.15rem)' : 'clamp(0.88rem, 2.2vw, 1rem)', letterSpacing: '0.02em', lineHeight: 1.5, color: 'rgba(255,255,255,0.88)', fontStyle: 'italic', flex: 1 }}>{choice?.text || ''}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </>
      )}
      {errorMsg && (
        <div style={{ position: 'absolute', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,140,140,0.9)', fontStyle: 'italic', letterSpacing: '0.04em', opacity: errorMsg ? 1 : 0, transition: `opacity 200ms ease` }}>{errorMsg}</p>
        </div>
      )}
    </div>
  )
}

// ─── Overlay principal ────────────────────────────────────────────────────────
function GameOverlay({ gameMode, onResolved, onBack, segmentIndex, onNavigateToPart }) {
  const [leaving, setLeaving] = useState(false)
  const [visible, setVisible] = useState(false)
  const [tappable, setTappable] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 40)
    const t2 = setTimeout(() => setTappable(true), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  const handleResolved = () => {
    setLeaving(true); setVisible(false)
    setTimeout(onResolved, 680)
  }

  const type = gameMode?.type
  const isTapType = type === 'image' || type === 'document'
  // Pour GameMessage : gestion du double-tap (skip animation puis résolution)
  const messageTapStateRef = useRef({ done: false })
  const [messageDone, setMessageDone] = useState(false)
  // Pour GameMessageSmart : tap n'importe où une fois le message affiché
  const [smartReady, setSmartReady] = useState(false)
  const handleOverlayTap = () => {
    if (!tappable) return
    if (isTapType) { handleResolved(); return }
    if (type === 'message') {
      if (!messageDone) {
        // Signal à GameMessage de compléter le texte
        setMessageDone(true)
      } else {
        handleResolved()
      }
    }
    if (type === 'message_smart') {
      if (smartReady && !gameMode?.withReply) handleResolved()
    }
  }

return (
    <>
      <style>{GLOBAL_KEYFRAMES}</style>
      <div
        onClick={handleOverlayTap}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'var(--color-bg, #f5f0e8)',
          opacity: visible && !leaving ? 1 : 0,
          transform: leaving ? 'scale(1.015)' : visible ? 'scale(1)' : 'scale(0.985)',
          transition: `opacity 640ms ${EASE.inOut}, transform 640ms ${EASE.inOut}`,
          padding: '2rem', boxSizing: 'border-box', willChange: 'opacity, transform',
          cursor: (isTapType || type === 'message' || (type === 'message_smart' && !gameMode?.withReply)) ? 'default' : 'auto',
        }}
      >
        {onBack && <BackArrow onBack={onBack} />}
        {type === 'image'     && <GameImage     data={gameMode} onResolved={handleResolved} tappable={tappable} />}
        {type === 'filmstrip' && <GameFilmstrip data={gameMode} onResolved={handleResolved} />}
        {type === 'document'  && <GameDocument  data={gameMode} tappable={tappable} />}
        {type === 'message'   && <GameMessage   data={gameMode} onResolved={handleResolved} tappable={tappable} skipAnimation={messageDone} onAnimationDone={() => setMessageDone(true)} />}
        {type === 'message_smart' && <GameMessageSmart data={gameMode} onResolved={handleResolved} onNavigateToPart={onNavigateToPart} onReady={() => setSmartReady(true)} />}
        {type === 'code'      && <GameCode      data={gameMode} onResolved={handleResolved} />}
        {type === 'riddle'    && <GameRiddle    data={gameMode} onResolved={handleResolved} />}
        {type === 'timer'     && <GameTimer     data={gameMode} onResolved={handleResolved} />}
        {type === 'sequence'  && <GameSequence  data={gameMode} onResolved={handleResolved} />}
        {type === 'journal'   && <GameJournal   data={gameMode} onResolved={handleResolved} />}
        {type === 'crypte'    && <GameCrypte    data={gameMode} onResolved={handleResolved} />}
        {(type === 'choice_quiz' || type === 'choice_branch') && (
          <GameChoice data={gameMode} onResolved={handleResolved} onNavigateToPart={onNavigateToPart} />
        )}
      </div>
    </>
  )
}

export default GameOverlay
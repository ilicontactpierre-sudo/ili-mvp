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

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  const handleResolved = () => {
    setLeaving(true)
    setVisible(false)
    setTimeout(onResolved, 680)
  }

  const type = gameMode?.type

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
        {type === 'image'    && <GameImage    data={gameMode} onResolved={handleResolved} />}
        {type === 'document' && <GameDocument data={gameMode} onResolved={handleResolved} />} 
        {type === 'message' && <GameMessage data={gameMode} onResolved={handleResolved} />}
        {type === 'code'    && <GameCode    data={gameMode} onResolved={handleResolved} />}
        {type === 'riddle'  && <GameRiddle  data={gameMode} onResolved={handleResolved} />}
        {type === 'timer'   && <GameTimer   data={gameMode} onResolved={handleResolved} />}
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

// ─── Type : Image ─────────────────────────────────────────────────────────────
function GameImage({ data, onResolved }) {
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <AnimatedWrapper style={{ gap: '1.8rem' }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '3px',
        overflow: 'hidden',
        boxShadow: '0 12px 60px rgba(0,0,0,0.14)',
        opacity: imgLoaded ? 1 : 0,
        transform: imgLoaded ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(12px)',
        transition: `opacity 800ms ${EASE.out}, transform 900ms ${EASE.out}`,
      }}>
        <img
          src={data.imageUrl}
          alt={data.caption || ''}
          onLoad={() => setImgLoaded(true)}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
      {data.caption && (
        <p style={{
          fontSize: 'clamp(0.82rem, 1.8vw, 0.95rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center',
          lineHeight: 1.65,
          opacity: imgLoaded ? 0.6 : 0,
          fontStyle: 'italic',
          margin: 0,
          transition: `opacity 700ms ${EASE.inOut} 300ms`,
        }}>
          {data.caption}
        </p>
      )}
      <div style={{
        opacity: imgLoaded ? 1 : 0,
        transform: imgLoaded ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 600ms ${EASE.out} 500ms, transform 600ms ${EASE.out} 500ms`,
      }}>
        <ContinueBtn onClick={onResolved} delay={600} />
      </div>
    </AnimatedWrapper>
  )
}

// ─── Type : Message animé lettre par lettre ───────────────────────────────────
function GameMessage({ data, onResolved }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)
  const text = data.text || ''
  const speed = data.speed === 'rapide' ? 22 : data.speed === 'lent' ? 75 : 40

  useEffect(() => {
    if (!text) { setDone(true); return }
    const interval = setInterval(() => {
      if (indexRef.current >= text.length) { clearInterval(interval); setDone(true); return }
      setDisplayed(text.slice(0, indexRef.current + 1))
      indexRef.current += 1
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  const handleClick = () => {
    if (!done) {
      indexRef.current = text.length
      setDisplayed(text)
      setDone(true)
    } else {
      onResolved()
    }
  }

  return (
    <AnimatedWrapper style={{ cursor: 'pointer' }} onClick={handleClick}>
      <div
        onClick={handleClick}
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem 2.2rem',
          border: '1px solid var(--color-text-focus, #222)',
          borderRadius: '2px',
          boxSizing: 'border-box',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {data.interface && (
          <div style={{
            position: 'absolute',
            top: '-0.6em',
            left: '1.5rem',
            backgroundColor: 'var(--color-bg, #f5f0e8)',
            padding: '0 0.5rem',
            fontSize: '0.62rem',
            letterSpacing: '0.14em',
            opacity: 0.45,
            textTransform: 'uppercase',
            fontFamily: 'var(--font-primary, Georgia, serif)',
          }}>
            {data.interface}
          </div>
        )}
        <p style={{
          margin: 0,
          fontSize: data.interface === 'terminal' ? '0.85rem' : '1rem',
          fontFamily: data.interface === 'terminal' ? "'Courier New', monospace" : 'var(--font-primary, Georgia, serif)',
          lineHeight: 1.75,
          color: 'var(--color-text-focus, #222)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: '1.75em',
        }}>
          {displayed}
          {!done && (
            <span style={{
              display: 'inline-block',
              width: '1.5px',
              height: '1em',
              backgroundColor: 'var(--color-text-focus, #222)',
              marginLeft: '2px',
              verticalAlign: 'text-bottom',
              animation: 'game-blink 0.65s step-end infinite',
            }} />
          )}
        </p>
      </div>
      <Hint delay={done ? 0 : text.length * speed + 200}>
        {done ? '— appuyer pour continuer —' : '— appuyer pour accélérer —'}
      </Hint>
    </AnimatedWrapper>
  )
}

// ─── Type : Code / Digicode ───────────────────────────────────────────────────
function GameCode({ data, onResolved }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)
  const { playTock, playSuccess, playError, playDelete } = useKeySound()
  const maxLength = String(data.answer || '').length || 6
  const isNumeric = /^\d+$/.test(String(data.answer || ''))

  const handleKey = (char) => {
    if (input.length >= maxLength) return
    playTock()
    const next = input + char
    setInput(next)
    setError('')
    if (next.length === maxLength) validate(next)
  }

  const handleDelete = () => {
    playDelete()
    setInput(prev => prev.slice(0, -1))
    setError('')
  }

  const validate = (value) => {
    const correct = String(data.answer || '').trim()
    const cs = data.caseSensitive !== false
    if ((cs ? value : value.toLowerCase()) === (cs ? correct : correct.toLowerCase())) {
      playSuccess()
      setSuccess(true)
      setTimeout(onResolved, 900)
    } else {
      playError()
      setShake(true)
      setError(data.errorMessage || 'Code incorrect')
      setTimeout(() => { setShake(false); setInput('') }, 700)
    }
  }

  const digits = isNumeric ? ['1','2','3','4','5','6','7','8','9','*','0','#'] : null

  return (
    <AnimatedWrapper>
      {data.prompt && (
        <p style={{
          fontSize: 'clamp(0.88rem, 2vw, 1rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center',
          lineHeight: 1.6,
          opacity: 0.8,
          margin: 0,
        }}>
          {data.prompt}
        </p>
      )}

      {/* Cases du code */}
      <div style={{
        display: 'flex',
        gap: '0.55rem',
        animation: shake ? `game-shake 0.55s ${EASE.inOut}` : 'none',
      }}>
        {Array.from({ length: maxLength }).map((_, i) => {
          const filled = i < input.length
          const isActive = i === input.length
          return (
            <div key={i} style={{
              width: '2.8rem',
              height: '3.4rem',
              border: `1px solid`,
              borderColor: success
                ? 'rgba(39,174,96,0.7)'
                : error
                  ? 'rgba(192,57,43,0.6)'
                  : filled || isActive
                    ? 'var(--color-text-focus, #222)'
                    : 'rgba(0,0,0,0.2)',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontFamily: 'var(--font-primary, Georgia, serif)',
              color: 'var(--color-text-focus, #222)',
              backgroundColor: success
                ? 'rgba(39,174,96,0.05)'
                : filled ? 'rgba(0,0,0,0.02)' : 'transparent',
              transition: `all 220ms ${EASE.out}`,
              animation: success && filled ? `game-success-pop 500ms ${EASE.spring} ${i * 60}ms both` : 'none',
            }}>
              {input[i] ? (isNumeric ? input[i] : '•') : ''}
            </div>
          )
        })}
      </div>

      {/* Clavier numérique */}
      {digits && !success && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          width: '100%',
          maxWidth: '210px',
        }}>
          {digits.map((d, i) => (
            <KeypadBtn
              key={d}
              label={d === '#' ? '⌫' : d === '*' ? '✕' : d}
              onClick={() => {
                if (d === '#') handleDelete()
                else if (d === '*') setInput('')
                else handleKey(d)
              }}
              delay={i * 18}
              small={d === '#' || d === '*'}
            />
          ))}
        </div>
      )}

      {/* Champ texte alphanumérique */}
      {!digits && !success && (
        <input
          type="text"
          value={input}
          onChange={e => { const v = e.target.value.slice(0, maxLength); setInput(v); setError(''); if (v.length === maxLength) validate(v) }}
          onKeyDown={e => { if (e.key === 'Enter') validate(input) }}
          autoFocus
          placeholder={data.placeholder || ''}
          style={{
            width: '100%',
            maxWidth: '280px',
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
      )}

      {data.hint && !error && !success && <Hint>{data.hint}</Hint>}

      <p style={{
        fontSize: '0.78rem',
        color: '#c0392b',
        opacity: error ? 0.85 : 0,
        textAlign: 'center',
        minHeight: '1em',
        fontStyle: 'italic',
        margin: 0,
        transition: `opacity 250ms ${EASE.out}`,
      }}>
        {error}
      </p>
    </AnimatedWrapper>
  )
}

// ─── Touche de clavier ────────────────────────────────────────────────────────
function KeypadBtn({ label, onClick, delay = 0, small = false }) {
  const [ready, setReady] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [hovered, setHovered] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), delay + 80); return () => clearTimeout(t) }, [delay])

  return (
    <button
      onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 150); onClick() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '0.95rem',
        border: '1px solid var(--color-text-focus, #222)',
        borderRadius: '2px',
        background: pressed
          ? 'rgba(0,0,0,0.08)'
          : hovered ? 'rgba(0,0,0,0.03)' : 'none',
        fontFamily: 'var(--font-primary, Georgia, serif)',
        fontSize: small ? '0.7rem' : '1.1rem',
        color: 'var(--color-text-focus, #222)',
        cursor: 'pointer',
        opacity: ready ? (hovered ? 0.9 : 0.65) : 0,
        transform: ready
          ? pressed ? 'scale(0.93)' : 'translateY(0)'
          : 'translateY(8px)',
        transition: `opacity 350ms ${EASE.out}, transform ${pressed ? '80ms' : `350ms ${EASE.out}`}, background-color 150ms ease`,
        willChange: 'transform',
      }}
    >
      {label}
    </button>
  )
}

// ─── Type : Énigme / Réponse libre ───────────────────────────────────────────
function GameRiddle({ data, onResolved }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState('wrong') // 'wrong' | 'close' | 'decoy'
  const [success, setSuccess] = useState(false)
  const { playTock, playSuccess, playError } = useKeySound()

  const validate = () => {
    const raw = String(data.answer || '').trim()
    const cs = data.caseSensitive === true
    const attempt = cs ? input.trim() : input.trim().toLowerCase()
    const accepted = (cs ? raw : raw.toLowerCase()).split('|').map(s => s.trim())

    // ── Succès ──
    if (accepted.includes(attempt)) {
      playSuccess()
      setSuccess(true)
      setTimeout(onResolved, 900)
      return
    }

    // ── Faux indice (decoy) — message personnalisé par l'auteur ──
    const decoys = data.decoys || []
    const matchedDecoy = decoys.find(d => {
      const dKey = cs ? d.key : d.key.toLowerCase()
      return dKey === attempt
    })
    if (matchedDecoy) {
      playError()
      setErrorType('decoy')
      setError(matchedDecoy.message)
      setTimeout(() => setError(''), 3500)
      return
    }

    // ── Réponse presque juste (Levenshtein ≤ 2) ──
    const isClose = accepted.some(a => levenshtein(attempt, a) <= 2 && attempt.length > 2)
    if (isClose) {
      playError()
      setErrorType('close')
      setError(data.closeMessage || 'Presque…')
      setTimeout(() => setError(''), 3000)
      return
    }

    // ── Mauvaise réponse standard ──
    playError()
    setErrorType('wrong')
    setError(data.errorMessage || 'Ce n\'est pas ça…')
    setTimeout(() => setError(''), 2500)
  }

  const errorColor = errorType === 'close'
    ? '#d4820a'
    : errorType === 'decoy'
      ? '#7b5ea7'
      : '#c0392b'

  return (
    <AnimatedWrapper>
      {data.question && (
        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.18rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center',
          lineHeight: 1.65,
          opacity: 0.92,
          margin: 0,
        }}>
          {data.question}
        </p>
      )}

      <input
        type="text"
        value={input}
        onChange={e => { setInput(e.target.value); setError('') }}
        onKeyDown={e => { if (e.key === 'Enter') validate() }}
        autoFocus
        disabled={success}
        placeholder={data.placeholder || 'votre réponse…'}
        style={{
          width: '100%',
          maxWidth: '320px',
          padding: '0.8rem 1rem',
          border: `1px solid ${
            success ? 'rgba(39,174,96,0.7)'
            : error ? errorColor
            : 'var(--color-text-focus, #222)'
          }`,
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

      {data.hint && !error && !success && <Hint>{data.hint}</Hint>}

      <p style={{
        fontSize: '0.78rem',
        color: errorColor,
        opacity: error ? 0.9 : 0,
        textAlign: 'center',
        minHeight: '1em',
        fontStyle: errorType === 'close' || errorType === 'decoy' ? 'normal' : 'italic',
        fontWeight: errorType === 'decoy' ? 500 : 400,
        margin: '-0.5rem 0 0',
        letterSpacing: errorType === 'close' ? '0.06em' : 'normal',
        transition: `opacity 250ms ${EASE.out}, color 300ms ${EASE.inOut}`,
      }}>
        {error}
      </p>

      {!success && <ContinueBtn onClick={validate} label="valider" delay={300} />}
    </AnimatedWrapper>
  )
}


// ─── Type : Minuteur ─────────────────────────────────────────────────────────
function GameTimer({ data, onResolved }) {
  const total = data.seconds || 30
  const [remaining, setRemaining] = useState(total)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (remaining <= 0) {
      setExpired(true)
      setTimeout(onResolved, 1400)
      return
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const pct = remaining / total
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - pct)
  const color = pct > 0.5
    ? 'var(--color-text-focus, #222)'
    : pct > 0.25 ? '#d4820a' : '#c0392b'

  return (
    <AnimatedWrapper style={{ gap: '1.6rem' }}>
      {data.prompt && (
        <p style={{
          fontSize: 'clamp(0.88rem, 2vw, 1rem)',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center',
          lineHeight: 1.6,
          opacity: 0.75,
          margin: 0,
        }}>
          {data.prompt}
        </p>
      )}

      <div style={{ position: 'relative', width: '126px', height: '126px' }}>
        <svg width="126" height="126" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="63" cy="63" r={radius}
            fill="none" stroke="var(--color-text-focus, #222)"
            strokeWidth="1" opacity="0.1" />
          <circle cx="63" cy="63" r={radius}
            fill="none" stroke={color}
            strokeWidth="1.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: `stroke-dashoffset 0.95s ${EASE.inOut}, stroke 0.8s ${EASE.inOut}` }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-primary, Georgia, serif)',
          fontSize: remaining < 10 ? '2.6rem' : '2.1rem',
          color,
          letterSpacing: '-0.02em',
          transition: `color 0.8s ${EASE.inOut}, font-size 300ms ${EASE.spring}`,
        }}>
          {expired ? '—' : remaining}
        </div>
      </div>

      <p style={{
        fontSize: 'clamp(0.82rem, 1.8vw, 0.92rem)',
        color: 'var(--color-text-focus, #222)',
        textAlign: 'center',
        lineHeight: 1.6,
        opacity: expired ? 0.55 : 0,
        fontStyle: 'italic',
        margin: 0,
        transform: expired ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 700ms ${EASE.out}, transform 700ms ${EASE.out}`,
      }}>
        {data.expireMessage || 'Le temps est écoulé.'}
      </p>

      {!expired && data.hint && <Hint delay={600}>{data.hint}</Hint>}
    </AnimatedWrapper>
  )
}

export default GameOverlay

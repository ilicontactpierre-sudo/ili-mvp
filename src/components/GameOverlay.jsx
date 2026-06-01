import { useState, useEffect, useRef } from 'react'

// ─── Overlay principal ────────────────────────────────────────────────────────
function GameOverlay({ gameMode, onResolved }) {
  const [visible, setVisible] = useState(false)

  // Entrée douce
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const handleResolved = () => {
    setVisible(false)
    setTimeout(onResolved, 420)
  }

  const type = gameMode?.type

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg, #f5f0e8)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        padding: '2rem',
        boxSizing: 'border-box',
      }}
    >
      {type === 'image'   && <GameImage   data={gameMode} onResolved={handleResolved} />}
      {type === 'message' && <GameMessage data={gameMode} onResolved={handleResolved} />}
      {type === 'code'    && <GameCode    data={gameMode} onResolved={handleResolved} />}
      {type === 'riddle'  && <GameRiddle  data={gameMode} onResolved={handleResolved} />}
      {type === 'timer'   && <GameTimer   data={gameMode} onResolved={handleResolved} />}
    </div>
  )
}

// ─── Styles communs ───────────────────────────────────────────────────────────
const sharedStyles = {
  wrapper: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    fontFamily: 'var(--font-primary, Georgia, serif)',
  },
  caption: {
    fontSize: 'clamp(0.85rem, 2vw, 1rem)',
    color: 'var(--color-text-focus, #222)',
    textAlign: 'center',
    lineHeight: 1.6,
    opacity: 0.75,
    fontStyle: 'italic',
  },
  continueBtn: {
    background: 'none',
    border: '1px solid var(--color-text-focus, #222)',
    color: 'var(--color-text-focus, #222)',
    fontFamily: 'var(--font-primary, Georgia, serif)',
    fontSize: '0.85rem',
    letterSpacing: '0.08em',
    padding: '0.6rem 1.8rem',
    borderRadius: '2px',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
  },
  hint: {
    fontSize: '0.75rem',
    color: 'var(--color-text-focus, #222)',
    opacity: 0.4,
    textAlign: 'center',
    letterSpacing: '0.05em',
  },
  errorMsg: {
    fontSize: '0.8rem',
    color: '#c0392b',
    opacity: 0.85,
    textAlign: 'center',
    minHeight: '1.2em',
    fontStyle: 'italic',
  },
}

// ─── Type : Image ─────────────────────────────────────────────────────────────
function GameImage({ data, onResolved }) {
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <div style={{ ...sharedStyles.wrapper, gap: '1.5rem' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          opacity: imgLoaded ? 1 : 0,
          transition: 'opacity 600ms ease',
        }}
      >
        <img
          src={data.imageUrl}
          alt={data.caption || ''}
          onLoad={() => setImgLoaded(true)}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
      </div>
      {data.caption && (
        <p style={sharedStyles.caption}>{data.caption}</p>
      )}
      <button
        style={sharedStyles.continueBtn}
        onClick={onResolved}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
      >
        continuer
      </button>
    </div>
  )
}

// ─── Type : Message animé lettre par lettre ───────────────────────────────────
function GameMessage({ data, onResolved }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)
  const text = data.text || ''
  const speed = data.speed === 'rapide' ? 25 : data.speed === 'lent' ? 80 : 45

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
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  // Clic pendant l'animation → afficher tout d'un coup
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
    <div
      style={{ ...sharedStyles.wrapper, cursor: 'pointer' }}
      onClick={handleClick}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem',
          border: '1px solid var(--color-text-focus, #222)',
          borderRadius: '2px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Label interface selon le style */}
        {data.interface && (
          <div
            style={{
              position: 'absolute',
              top: '-0.6em',
              left: '1.5rem',
              backgroundColor: 'var(--color-bg, #f5f0e8)',
              padding: '0 0.4rem',
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              opacity: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {data.interface}
          </div>
        )}
        <p
          style={{
            margin: 0,
            fontSize: data.interface === 'terminal' ? '0.85rem' : '1rem',
            fontFamily: data.interface === 'terminal'
              ? "'Courier New', monospace"
              : 'var(--font-primary, Georgia, serif)',
            lineHeight: 1.7,
            color: 'var(--color-text-focus, #222)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {displayed}
          {!done && (
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '1em',
                backgroundColor: 'var(--color-text-focus, #222)',
                marginLeft: '2px',
                verticalAlign: 'text-bottom',
                animation: 'game-blink 0.7s step-end infinite',
              }}
            />
          )}
        </p>
      </div>
      <p style={sharedStyles.hint}>
        {done ? '— appuyer pour continuer —' : '— appuyer pour accélérer —'}
      </p>
      <style>{`
        @keyframes game-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Type : Code / Digicode ───────────────────────────────────────────────────
function GameCode({ data, onResolved }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)
  const maxLength = String(data.answer || '').length || 6
  const isNumeric = /^\d+$/.test(String(data.answer || ''))

  const handleKey = (char) => {
    if (input.length >= maxLength) return
    const next = input + char
    setInput(next)
    setError('')
    if (next.length === maxLength) {
      validate(next)
    }
  }

  const handleDelete = () => {
    setInput(prev => prev.slice(0, -1))
    setError('')
  }

  const validate = (value) => {
    const correct = String(data.answer || '').trim()
    const caseSensitive = data.caseSensitive !== false
    const attempt = caseSensitive ? value : value.toLowerCase()
    const target  = caseSensitive ? correct : correct.toLowerCase()
    if (attempt === target) {
      setSuccess(true)
      setTimeout(onResolved, 800)
    } else {
      setShake(true)
      setError(data.errorMessage || 'Code incorrect')
      setTimeout(() => { setShake(false); setInput('') }, 600)
    }
  }

  const digits = isNumeric
    ? ['1','2','3','4','5','6','7','8','9','*','0','#']
    : null

  return (
    <div style={sharedStyles.wrapper}>
      {data.prompt && (
        <p style={{ ...sharedStyles.caption, fontStyle: 'normal', opacity: 0.85 }}>
          {data.prompt}
        </p>
      )}

      {/* Affichage du code saisi */}
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          animation: shake ? 'game-shake 0.4s ease' : 'none',
        }}
      >
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '2.6rem',
              height: '3.2rem',
              border: `1px solid ${success ? '#27ae60' : error ? '#c0392b' : 'var(--color-text-focus, #222)'}`,
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontFamily: 'var(--font-primary, Georgia, serif)',
              color: 'var(--color-text-focus, #222)',
              transition: 'border-color 0.2s ease',
              backgroundColor: success ? 'rgba(39,174,96,0.06)' : 'transparent',
            }}
          >
            {input[i] ? (isNumeric ? input[i] : '•') : ''}
          </div>
        ))}
      </div>

      {/* Clavier numérique (si code numérique) */}
      {digits && !success && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.6rem',
            width: '100%',
            maxWidth: '220px',
          }}
        >
          {digits.map((d) => (
            <button
              key={d}
              onClick={() => {
                if (d === '#') handleDelete()
                else if (d === '*') setInput('')
                else handleKey(d)
              }}
              style={{
                padding: '0.9rem',
                border: '1px solid var(--color-text-focus, #222)',
                borderRadius: '2px',
                background: 'none',
                fontFamily: 'var(--font-primary, Georgia, serif)',
                fontSize: d === '#' || d === '*' ? '0.75rem' : '1.1rem',
                color: 'var(--color-text-focus, #222)',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'opacity 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {d === '#' ? '⌫' : d === '*' ? '✕' : d}
            </button>
          ))}
        </div>
      )}

      {/* Champ texte (si code alphanumérique) */}
      {!digits && !success && (
        <input
          type="text"
          value={input}
          onChange={e => {
            const val = e.target.value.slice(0, maxLength)
            setInput(val)
            setError('')
            if (val.length === maxLength) validate(val)
          }}
          onKeyDown={e => { if (e.key === 'Enter') validate(input) }}
          autoFocus
          placeholder={data.placeholder || ''}
          style={{
            width: '100%',
            maxWidth: '280px',
            padding: '0.75rem 1rem',
            border: `1px solid ${error ? '#c0392b' : 'var(--color-text-focus, #222)'}`,
            borderRadius: '2px',
            background: 'none',
            fontFamily: 'var(--font-primary, Georgia, serif)',
            fontSize: '1rem',
            color: 'var(--color-text-focus, #222)',
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease',
          }}
        />
      )}

      {data.hint && !error && !success && (
        <p style={sharedStyles.hint}>{data.hint}</p>
      )}
      <p style={sharedStyles.errorMsg}>{error}</p>

      <style>{`
        @keyframes game-shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}

// ─── Type : Énigme / Réponse libre ───────────────────────────────────────────
function GameRiddle({ data, onResolved }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validate = () => {
    const correct = String(data.answer || '').trim()
    const caseSensitive = data.caseSensitive === true
    const attempt = caseSensitive ? input.trim() : input.trim().toLowerCase()
    const target  = caseSensitive ? correct : correct.toLowerCase()

    // Support de réponses multiples séparées par "|"
    const accepted = target.split('|').map(s => s.trim())

    if (accepted.includes(attempt)) {
      setSuccess(true)
      setTimeout(onResolved, 800)
    } else {
      setError(data.errorMessage || 'Ce n\'est pas ça…')
      setTimeout(() => setError(''), 2500)
    }
  }

  return (
    <div style={sharedStyles.wrapper}>
      {data.question && (
        <p
          style={{
            ...sharedStyles.caption,
            fontStyle: 'normal',
            opacity: 1,
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          }}
        >
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
          padding: '0.75rem 1rem',
          border: `1px solid ${success ? '#27ae60' : error ? '#c0392b' : 'var(--color-text-focus, #222)'}`,
          borderRadius: '2px',
          background: 'none',
          fontFamily: 'var(--font-primary, Georgia, serif)',
          fontSize: '1rem',
          color: 'var(--color-text-focus, #222)',
          textAlign: 'center',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s ease',
        }}
      />

      {data.hint && !error && !success && (
        <p style={sharedStyles.hint}>{data.hint}</p>
      )}
      <p style={sharedStyles.errorMsg}>{error}</p>

      {!success && (
        <button
          style={sharedStyles.continueBtn}
          onClick={validate}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
        >
          valider
        </button>
      )}
    </div>
  )
}

// ─── Type : Minuteur ─────────────────────────────────────────────────────────
function GameTimer({ data, onResolved }) {
  const total   = data.seconds || 30
  const [remaining, setRemaining] = useState(total)
  const [expired, setExpired]     = useState(false)

  useEffect(() => {
    if (remaining <= 0) {
      setExpired(true)
      setTimeout(onResolved, 1200)
      return
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const pct = remaining / total
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - pct)

  const color = pct > 0.5 ? 'var(--color-text-focus, #222)'
    : pct > 0.25 ? '#e67e22'
    : '#c0392b'

  return (
    <div style={{ ...sharedStyles.wrapper, gap: '1.5rem' }}>
      {data.prompt && (
        <p style={{ ...sharedStyles.caption, fontStyle: 'normal', opacity: 0.85 }}>
          {data.prompt}
        </p>
      )}

      <div style={{ position: 'relative', width: '130px', height: '130px' }}>
        <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
          {/* Fond */}
          <circle
            cx="65" cy="65" r={radius}
            fill="none"
            stroke="var(--color-text-focus, #222)"
            strokeWidth="1"
            opacity="0.12"
          />
          {/* Arc animé */}
          <circle
            cx="65" cy="65" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-primary, Georgia, serif)',
            fontSize: remaining < 10 ? '2.4rem' : '2rem',
            color,
            transition: 'color 0.5s ease, font-size 0.2s ease',
          }}
        >
          {expired ? '—' : remaining}
        </div>
      </div>

      {expired ? (
        <p style={{ ...sharedStyles.caption, opacity: 0.6 }}>
          {data.expireMessage || 'Le temps est écoulé.'}
        </p>
      ) : (
        data.hint && <p style={sharedStyles.hint}>{data.hint}</p>
      )}
    </div>
  )
}

export default GameOverlay

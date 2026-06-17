import { useState, useEffect, useRef } from 'react'

/**
 * SeuilScreen — collecte des infos lecteur avant la lecture
 * S'affiche après le tap de démarrage, pendant que l'audio se précharge en fond.
 *
 * questions: [{ cle, texte, type: 'texte'|'choix', placeholder?, options? }]
 * onComplete(answers) : { cle → valeur } stockées dans sessionStorage
 */
function SeuilScreen({ questions = [], onComplete, storyTitle }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const inputRef = useRef(null)

  const current = questions[step]
  const isLast  = step === questions.length - 1
  const isTexte = current?.type !== 'choix'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  // Focus auto sur le champ texte à chaque étape
  useEffect(() => {
    if (isTexte && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350)
    }
    setValue('')
  }, [step])

  const advance = (val) => {
    const trimmed = typeof val === 'string' ? val.trim() : val
    const newAnswers = { ...answers, [current.cle]: trimmed || current.placeholder || '' }
    setAnswers(newAnswers)

    if (isLast) {
      // Stocker dans sessionStorage puis terminer
      Object.entries(newAnswers).forEach(([cle, valeur]) => {
        try { sessionStorage.setItem(`ili_journal_${cle}`, valeur) } catch {}
      })
      setLeaving(true)
      setTimeout(() => onComplete(newAnswers), 500)
    } else {
      setStep(s => s + 1)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isTexte) {
      e.preventDefault()
      advance(value)
    }
  }

  if (!current) return null

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--color-bg)',
      color: 'var(--color-text-focus)',
      fontFamily: 'var(--font-primary)',
      padding: '2rem 1.5rem',
      opacity: visible && !leaving ? 1 : 0,
      transform: visible && !leaving ? 'translateY(0)' : leaving ? 'translateY(-10px)' : 'translateY(14px)',
      transition: leaving
        ? 'opacity 480ms cubic-bezier(0.4, 0, 1, 1), transform 480ms cubic-bezier(0.4, 0, 1, 1)'
        : 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <style>{`
        @keyframes seuil-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .seuil-option {
          background: none;
          border: 1px solid color-mix(in srgb, var(--color-text-focus) 18%, transparent);
          color: var(--color-text-focus);
          font-family: var(--font-primary);
          font-size: clamp(0.95rem, 3vw, 1.1rem);
          padding: 0.85rem 1.8rem;
          border-radius: 2px;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: border-color 200ms ease, opacity 200ms ease;
          opacity: 0.7;
          width: 100%;
          max-width: 22rem;
          text-align: center;
        }
        .seuil-option:hover {
          border-color: color-mix(in srgb, var(--color-text-focus) 55%, transparent);
          opacity: 1;
        }
        .seuil-input {
          background: none;
          border: none;
          border-bottom: 1px solid color-mix(in srgb, var(--color-text-focus) 25%, transparent);
          color: var(--color-text-focus);
          font-family: var(--font-primary);
          font-size: clamp(1.1rem, 3.5vw, 1.4rem);
          padding: 0.5rem 0;
          text-align: center;
          outline: none;
          width: 100%;
          max-width: 22rem;
          transition: border-color 250ms ease;
          letter-spacing: 0.02em;
        }
        .seuil-input:focus {
          border-color: color-mix(in srgb, var(--color-text-focus) 65%, transparent);
        }
        .seuil-input::placeholder {
          opacity: 0.25;
        }
        .seuil-continue {
          background: none;
          border: none;
          border-bottom: 1px solid color-mix(in srgb, var(--color-text-focus) 20%, transparent);
          color: var(--color-text-focus);
          font-family: var(--font-primary);
          font-size: clamp(0.82rem, 2.5vw, 0.95rem);
          padding: 0.5rem 0;
          cursor: pointer;
          opacity: 0.45;
          letter-spacing: 0.06em;
          transition: opacity 200ms ease;
        }
        .seuil-continue:hover { opacity: 0.85; }
      `}</style>

      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2.5rem',
        width: '100%',
        maxWidth: '30rem',
        animation: 'seuil-fade-up 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>

        {/* Indicateur de progression (si plusieurs questions) */}
        {questions.length > 1 && (
          <div style={{
            display: 'flex',
            gap: '0.4rem',
            opacity: 0.3,
          }}>
            {questions.map((_, i) => (
              <div key={i} style={{
                width: i === step ? '1.2rem' : '0.3rem',
                height: '0.3rem',
                borderRadius: '999px',
                backgroundColor: 'var(--color-text-focus)',
                opacity: i <= step ? 1 : 0.35,
                transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            ))}
          </div>
        )}

        {/* Question */}
        <p style={{
          fontSize: 'clamp(1rem, 3.5vw, 1.25rem)',
          fontStyle: 'italic',
          lineHeight: 1.6,
          textAlign: 'center',
          opacity: 0.82,
          margin: 0,
          letterSpacing: '0.01em',
        }}>
          {current.texte}
        </p>

        {/* Input ou choix */}
        {isTexte ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.8rem',
            width: '100%',
          }}>
            <input
              ref={inputRef}
              type="text"
              className="seuil-input"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={current.placeholder || '…'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="seuil-continue"
                onClick={() => advance(value)}
                style={{ opacity: value.trim() ? 0.75 : 0.35 }}
              >
                {isLast ? 'commencer' : 'continuer →'}
              </button>
              {/* Passer sans répondre */}
              {!value.trim() && (
                <button
                  onClick={() => advance('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    opacity: 0.22,
                    color: 'var(--color-text-focus)',
                    fontFamily: 'var(--font-primary)',
                    letterSpacing: '0.08em',
                    padding: '0.25rem',
                    transition: 'opacity 200ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.22'}
                >
                  passer
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.65rem',
            width: '100%',
          }}>
            {(current.options || []).map((opt, i) => (
              <button
                key={i}
                className="seuil-option"
                onClick={() => advance(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

      </section>
    </main>
  )
}

export default SeuilScreen
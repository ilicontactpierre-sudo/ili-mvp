import { useState, useEffect } from 'react'

function PublishAnimation({ status, errorMessage, isUpdate, onReset }) {

  // États pour l'animation des étapes
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])

  // Réinitialiser les états quand le status change
  useEffect(() => {
    if (status === 'publishing') {
      setActiveStep(0)
      setCompletedSteps([])
    }
  }, [status])

  // Animation des étapes pendant la publication
  useEffect(() => {
    if (status !== 'publishing') return

    // Étape 1 : immédiate
    setActiveStep(0)

    // Étape 2 : après 1200ms
    const timer2 = setTimeout(() => {
      setActiveStep(1)
    }, 1200)

    // Étape 3 : après 2400ms
    const timer3 = setTimeout(() => {
      setActiveStep(2)
    }, 2400)

    return () => {
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [status])

  // Quand on passe en succès, marquer toutes les étapes comme complétées
  useEffect(() => {
    if (status === 'success') {
      setCompletedSteps([0, 1, 2])
      setActiveStep(3)

      // Appeler onReset après 4 secondes
      const timer = setTimeout(() => {
        onReset()
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [status, onReset])

  // État 'idle' — ne rien rendre
  if (status === 'idle' || !status) {
    return null
  }

  // État 'publishing'
  if (status === 'publishing') {
    const steps = [
      'Écriture de l\'histoire...',
      'Mise à jour du catalogue...',
      'Déclenchement du déploiement...'
    ]

    return (
      <div style={styles.publishingContainer}>
        <div style={styles.stepsWrapper}>
          {steps.map((label, index) => {
            const isActive = index === activeStep
            const isCompleted = completedSteps.includes(index)
            const isPending = index > activeStep

            return (
              <div
                key={index}
                style={{
                  ...styles.step,
                  opacity: isPending ? 0.3 : 1
                }}
              >
                <span style={styles.stepIndicator}>
                  {isCompleted ? (
                    <span style={styles.checkmark}>✓</span>
                  ) : isActive ? (
                    <span style={styles.pulsingDot} />
                  ) : (
                    <span style={styles.emptyDot} />
                  )}
                </span>
                <span style={styles.stepLabel}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // État 'success'
  if (status === 'success') {
    return (
      <div style={styles.successContainer}>
        <div style={styles.successIconWrapper}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            style={styles.successSvg}
          >
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="var(--accent-color, #7EC8A0)"
              strokeWidth="1.5"
              style={styles.successCircle}
            />
            <path
              d="M14 24 L20 30 L34 16"
              fill="none"
              stroke="var(--accent-color, #7EC8A0)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={styles.successCheck}
            />
          </svg>
        </div>
        <div style={styles.successText}>
          <div style={styles.successTitle}>Histoire publiée</div>
          <div style={styles.successSubtitle}>
            Visible sur le site dans ~30 secondes
          </div>
        </div>
      </div>
    )
  }

  // État 'error'
  if (status === 'error') {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIconWrapper}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
          >
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="#C87E7E"
              strokeWidth="1.5"
            />
            <line
              x1="16"
              y1="16"
              x2="32"
              y2="32"
              stroke="#C87E7E"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="32"
              y1="16"
              x2="16"
              y2="32"
              stroke="#C87E7E"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div style={styles.errorText}>{errorMessage || 'Une erreur est survenue'}</div>
        <button onClick={onReset} style={styles.retryButton}>
          Réessayer
        </button>
      </div>
    )
  }

  return null
}

// Styles
const styles = {
  publishingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 0',
    gap: '12px',
    fontFamily: 'var(--font-logo, Roboto, sans-serif)',
    fontSize: '13px',
    fontWeight: 300,
    letterSpacing: '0.05em',
    color: 'rgba(255,255,255,0.7)'
  },

  stepsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'opacity 0.3s ease'
  },

  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px'
  },

  emptyDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)'
  },

  pulsingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-color, #7EC8A0)',
    animation: 'pulse 1s ease-in-out infinite'
  },

  checkmark: {
    color: 'var(--accent-color, #7EC8A0)',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'opacity 0.3s ease'
  },

  stepLabel: {
    fontSize: '13px',
    fontWeight: 300
  },

  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    gap: '16px',
    animation: 'fadeIn 0.3s ease'
  },

  successIconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  successSvg: {
    overflow: 'visible'
  },

  successCircle: {
    strokeDasharray: '150',
    strokeDashoffset: '150',
    animation: 'drawCircle 0.4s ease forwards'
  },

  successCheck: {
    strokeDasharray: '50',
    strokeDashoffset: '50',
    animation: 'drawCheck 0.3s ease 0.35s forwards',
    opacity: 0
  },

  successText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    animation: 'fadeInText 0.3s ease 0.5s forwards',
    opacity: 0
  },

  successTitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 300
  },

  successSubtitle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '4px'
  },

  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    gap: '16px'
  },

  errorIconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  errorText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    maxWidth: '280px',
    lineHeight: '1.5'
  },

  retryButton: {
    padding: '8px 20px',
    fontSize: '13px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s'
  }
}

// Ajouter les keyframes dynamiquement
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }

  @keyframes drawCircle {
    to { stroke-dashoffset: 0; }
  }

  @keyframes drawCheck {
    to { stroke-dashoffset: 0; opacity: 1; }
  }

  @keyframes fadeInText {
    to { opacity: 1; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`
document.head.appendChild(styleSheet)

export default PublishAnimation
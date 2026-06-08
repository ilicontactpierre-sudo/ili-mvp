import { useEffect, useRef, useState } from 'react'

const FOG_OPACITY = { léger: 0.30, dense: 0.55, épais: 0.75 }
const FADE_IN  = 3000
const FADE_OUT = 4000

function getIsDark() {
  try {
    return JSON.parse(localStorage.getItem('ili_theme') || '{}').isDark !== false
  } catch { return true }
}

function VfxOverlay({ activeType, activeMode }) {
  const overlayRef = useRef(null)
  const [isDark, setIsDark] = useState(getIsDark)

  useEffect(() => {
    const interval = setInterval(() => setIsDark(getIsDark()), 300)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return

    const shouldShow = activeType === 'fog'

    if (shouldShow) {
      const targetOpacity = FOG_OPACITY[activeMode] ?? FOG_OPACITY['léger']
      el.style.display = 'block'
      void el.offsetHeight
      el.style.transition = `opacity ${FADE_IN}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = String(targetOpacity)
    } else {
      el.style.transition = `opacity ${FADE_OUT}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = '0'
      const timer = setTimeout(() => {
        if (el.style.opacity === '0') el.style.display = 'none'
      }, FADE_OUT + 100)
      return () => clearTimeout(timer)
    }
  }, [activeType, activeMode])

  // Couleur selon thème — blanc en dark, gris-brun très doux en clair
  const fogColor = isDark
    ? 'rgba(255,255,255,ALPHA)'
    : 'rgba(40,35,30,ALPHA)'

  const c = (alpha) => fogColor.replace('ALPHA', String(alpha))

  const fogContent = (
    <div style={{
      position: 'absolute',
      inset: '-30%',        // déborde largement → plus aucun bord visible
      width: '160%',
      height: '160%',
      pointerEvents: 'none',
    }}>
      <svg
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 600 1100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Flous plus grands = bords complètement invisibles */}
          <filter id="fb-a" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="55" />
          </filter>
          <filter id="fb-b" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="70" />
          </filter>
          <filter id="fb-c" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="48" />
          </filter>
          <filter id="fb-d" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="62" />
          </filter>
          <filter id="fb-e" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="42" />
          </filter>
        </defs>

        {/* 5 nappes indépendantes, décalages temporels variés */}
        <ellipse cx="300" cy="980" rx="440" ry="260"
          fill={c(0.62)} filter="url(#fb-a)"
          style={{ animation: 'fog-a 16s ease-in-out infinite alternate' }}
        />
        <ellipse cx="80"  cy="550" rx="340" ry="200"
          fill={c(0.48)} filter="url(#fb-b)"
          style={{ animation: 'fog-b 21s ease-in-out infinite alternate' }}
        />
        <ellipse cx="420" cy="420" rx="300" ry="180"
          fill={c(0.40)} filter="url(#fb-c)"
          style={{ animation: 'fog-c 13s ease-in-out infinite alternate' }}
        />
        <ellipse cx="500" cy="680" rx="280" ry="190"
          fill={c(0.42)} filter="url(#fb-d)"
          style={{ animation: 'fog-d 18s ease-in-out infinite alternate' }}
        />
        <ellipse cx="200" cy="120" rx="360" ry="210"
          fill={c(0.35)} filter="url(#fb-e)"
          style={{ animation: 'fog-e 24s ease-in-out infinite alternate' }}
        />

        <style>{`
          @keyframes fog-a {
            0%   { transform: translate(-50px,   0px) scale(1);    }
            30%  { transform: translate( 30px,  -70px) scale(1.07); }
            70%  { transform: translate(-20px,  -40px) scale(0.96); }
            100% { transform: translate( 60px, -110px) scale(1.11); }
          }
          @keyframes fog-b {
            0%   { transform: translate(  0px,  30px) scale(1);    }
            25%  { transform: translate( 70px,  -50px) scale(1.09); }
            60%  { transform: translate( 40px,   20px) scale(1.03); }
            100% { transform: translate(-60px,  -80px) scale(0.94); }
          }
          @keyframes fog-c {
            0%   { transform: translate( 40px, -30px) scale(1.05); }
            40%  { transform: translate(-50px,  60px) scale(0.95); }
            70%  { transform: translate( 20px,  40px) scale(1.08); }
            100% { transform: translate(-70px, -50px) scale(1.01); }
          }
          @keyframes fog-d {
            0%   { transform: translate(-30px,  40px) scale(1);    }
            35%  { transform: translate( 50px, -60px) scale(1.06); }
            75%  { transform: translate(-40px, -25px) scale(0.97); }
            100% { transform: translate( 20px,  70px) scale(1.1);  }
          }
          @keyframes fog-e {
            0%   { transform: translate( 30px,  50px) scale(1.04); }
            20%  { transform: translate(-40px,  90px) scale(1.01); }
            65%  { transform: translate( 60px,  70px) scale(1.07); }
            100% { transform: translate(-30px, 120px) scale(0.96); }
          }
        `}</style>
      </svg>
    </div>
  )

  return (
    <div
      ref={overlayRef}
      style={{
        display: 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        pointerEvents: 'none',
        opacity: 0,
        overflow: 'hidden',
      }}
    >
      {fogContent}
    </div>
  )
}

export default VfxOverlay

// ── Opacités cibles par mode ──
const FOG_OPACITY = { léger: 0.28, dense: 0.52, épais: 0.72 }

// ── Durées de transition (ms) ──
const FADE_IN  = 3500
const FADE_OUT = 4500

// ── Détection mode clair ──
function getIsDark() {
  try {
    return JSON.parse(localStorage.getItem('ili_theme') || '{}').isDark !== false
  } catch { return true }
}

function VfxOverlay({ activeType, activeMode }) {
  const overlayRef = useRef(null)
  const [isDark, setIsDark] = useState(getIsDark)

  // Écouter les changements de thème
  useEffect(() => {
    const interval = setInterval(() => {
      setIsDark(getIsDark())
    }, 300)
    return () => clearInterval(interval)
  }, [])

  // ── Montage / démontage de l'effet ──
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return

    if (activeType === 'fog' && isDark) {
      const targetOpacity = FOG_OPACITY[activeMode] ?? FOG_OPACITY['léger']
      el.style.display = 'block'
      void el.offsetHeight
      el.style.transition = `opacity ${FADE_IN}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = String(targetOpacity)
    } else {
      el.style.transition = `opacity ${FADE_OUT}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = '0'
      const timer = setTimeout(() => {
        if (el.style.opacity === '0') el.style.display = 'none'
      }, FADE_OUT + 100)
      return () => clearTimeout(timer)
    }
  }, [activeType, activeMode, isDark])

  const fogContent = (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 400 800"
    >
      <defs>
        <filter id="fog-blur-a"><feGaussianBlur stdDeviation="45" /></filter>
        <filter id="fog-blur-b"><feGaussianBlur stdDeviation="60" /></filter>
        <filter id="fog-blur-c"><feGaussianBlur stdDeviation="35" /></filter>
        <filter id="fog-blur-d"><feGaussianBlur stdDeviation="55" /></filter>
        <filter id="fog-blur-e"><feGaussianBlur stdDeviation="40" /></filter>
      </defs>

      {/* Nappe basse — sort du bas */}
      <ellipse cx="200" cy="860" rx="380" ry="220"
        fill="rgba(255,255,255,0.6)"
        filter="url(#fog-blur-a)"
        style={{ animation: 'fog-a 22s ease-in-out infinite alternate' }}
      />
      {/* Nappe centre-gauche — traverse le milieu */}
      <ellipse cx="60" cy="420" rx="300" ry="170"
        fill="rgba(255,255,255,0.45)"
        filter="url(#fog-blur-b)"
        style={{ animation: 'fog-b 17s ease-in-out infinite alternate' }}
      />
      {/* Nappe centre — passe sur le texte */}
      <ellipse cx="240" cy="360" rx="260" ry="150"
        fill="rgba(255,255,255,0.35)"
        filter="url(#fog-blur-c)"
        style={{ animation: 'fog-c 25s ease-in-out infinite alternate' }}
      />
      {/* Nappe centre-droite */}
      <ellipse cx="370" cy="500" rx="240" ry="160"
        fill="rgba(255,255,255,0.38)"
        filter="url(#fog-blur-d)"
        style={{ animation: 'fog-d 19s ease-in-out infinite alternate' }}
      />
      {/* Nappe haute — descend depuis le haut */}
      <ellipse cx="160" cy="-60" rx="300" ry="180"
        fill="rgba(255,255,255,0.3)"
        filter="url(#fog-blur-e)"
        style={{ animation: 'fog-e 28s ease-in-out infinite alternate' }}
      />

      <style>{`
        @keyframes fog-a {
          0%   { transform: translate(-40px,  0px)  scale(1);    }
          33%  { transform: translate( 20px, -60px) scale(1.06); }
          66%  { transform: translate(-10px, -30px) scale(0.97); }
          100% { transform: translate( 50px, -90px) scale(1.1);  }
        }
        @keyframes fog-b {
          0%   { transform: translate(  0px,  20px) scale(1);    }
          40%  { transform: translate( 60px, -40px) scale(1.08); }
          70%  { transform: translate( 30px,  10px) scale(1.03); }
          100% { transform: translate(-50px, -70px) scale(0.95); }
        }
        @keyframes fog-c {
          0%   { transform: translate( 30px, -20px) scale(1.04); }
          35%  { transform: translate(-40px,  50px) scale(0.96); }
          65%  { transform: translate( 10px,  30px) scale(1.07); }
          100% { transform: translate(-60px, -40px) scale(1);    }
        }
        @keyframes fog-d {
          0%   { transform: translate(-20px,  30px) scale(1);    }
          45%  { transform: translate( 40px, -50px) scale(1.05); }
          80%  { transform: translate(-30px, -20px) scale(0.98); }
          100% { transform: translate( 10px,  60px) scale(1.09); }
        }
        @keyframes fog-e {
          0%   { transform: translate( 20px,  40px) scale(1.03); }
          30%  { transform: translate(-30px,  80px) scale(1);    }
          70%  { transform: translate( 50px,  60px) scale(1.06); }
          100% { transform: translate(-20px, 110px) scale(0.97); }
        }
      `}</style>
    </svg>
  )

  return (
    <div
      ref={overlayRef}
      style={{
        display: 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        pointerEvents: 'none',
        opacity: 0,
        overflow: 'hidden',
      }}
    >
      {fogContent}
    </div>
  )
}

export default VfxOverlay
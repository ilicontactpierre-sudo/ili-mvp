import { useEffect, useRef } from 'react'

// ── Opacités cibles par mode ──
const FOG_OPACITY = { léger: 0.18, dense: 0.38, épais: 0.58 }

// ── Durées de transition (ms) ──
const FADE_IN  = 1200
const FADE_OUT = 1800

function VfxOverlay({ activeType, activeMode, isDark = true }) {
  const overlayRef = useRef(null)

  // ── Montage / démontage de l'effet ──
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return

    if (activeType === 'fog') {
      const targetOpacity = FOG_OPACITY[activeMode] ?? FOG_OPACITY['léger']
      el.style.display = 'block'
      // Forcer un reflow pour que la transition fonctionne depuis opacity:0
      void el.offsetHeight
      el.style.transition = `opacity ${FADE_IN}ms cubic-bezier(0.4, 0, 0.2, 1)`
      el.style.opacity = String(targetOpacity)
    } else {
      // Fade out
      el.style.transition = `opacity ${FADE_OUT}ms cubic-bezier(0.4, 0, 0.2, 1)`
      el.style.opacity = '0'
      const timer = setTimeout(() => {
        if (el.style.opacity === '0') el.style.display = 'none'
      }, FADE_OUT + 100)
      return () => clearTimeout(timer)
    }
  }, [activeType, activeMode])

  // ── Contenu SVG du brouillard ──
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
        <filter id="fog-blur">
          <feGaussianBlur stdDeviation="28" />
        </filter>
      </defs>

      {/* Couche basse — lente */}
      <ellipse
        cx="200" cy="820" rx="340" ry="180"
        fill={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(80,80,80,0.45)'}
        filter="url(#fog-blur)"
        style={{ animation: 'fog-drift-a 18s ease-in-out infinite alternate' }}
      />
      {/* Couche milieu — légèrement plus rapide */}
      <ellipse
        cx="80" cy="500" rx="260" ry="140"
        fill={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(80,80,80,0.3)'}
        filter="url(#fog-blur)"
        style={{ animation: 'fog-drift-b 13s ease-in-out infinite alternate' }}
      />
      {/* Couche haute — la plus légère */}
      <ellipse
        cx="320" cy="200" rx="220" ry="110"
        fill={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(80,80,80,0.22)'}
        filter="url(#fog-blur)"
        style={{ animation: 'fog-drift-c 20s ease-in-out infinite alternate' }}
      />

      <style>{`
        @keyframes fog-drift-a {
          from { transform: translate(-30px, 0px) scale(1);   }
          to   { transform: translate( 30px, -40px) scale(1.08); }
        }
        @keyframes fog-drift-b {
          from { transform: translate( 20px, 0px) scale(1);   }
          to   { transform: translate(-40px, 30px) scale(1.12); }
        }
        @keyframes fog-drift-c {
          from { transform: translate(-15px, 0px) scale(1);   }
          to   { transform: translate( 25px, -20px) scale(0.94); }
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
        zIndex: 50,
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
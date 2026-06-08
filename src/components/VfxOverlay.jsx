import { useEffect, useRef, useState } from 'react'

const FOG_OPACITY  = { léger: 0.18, dense: 0.50, épais: 0.75 }
const FIRE_OPACITY = { bougie: 1, brasier: 1, inferno: 1 }
const FADE_IN  = 6000
const FADE_OUT = 7000
const FIRE_FADE_IN  = 2500
const FIRE_FADE_OUT = 3500

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

  const fireOverlayRef = useRef(null)

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    if (activeType === 'fog') {
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

  useEffect(() => {
    const el = fireOverlayRef.current
    if (!el) return
    if (activeType === 'fire') {
      el.style.display = 'block'
      void el.offsetHeight
      el.style.transition = `opacity ${FIRE_FADE_IN}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = '1'
    } else {
      el.style.transition = `opacity ${FIRE_FADE_OUT}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = '0'
      const timer = setTimeout(() => {
        if (el.style.opacity === '0') el.style.display = 'none'
      }, FIRE_FADE_OUT + 100)
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
      inset: 0,
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
          style={{ animation: 'fog-a 14s ease-in-out infinite alternate' }}
        />
        <ellipse cx="80"  cy="550" rx="340" ry="200"
          fill={c(0.48)} filter="url(#fb-b)"
          style={{ animation: 'fog-b 18s ease-in-out infinite alternate' }}
        />
        <ellipse cx="420" cy="420" rx="300" ry="180"
          fill={c(0.40)} filter="url(#fb-c)"
          style={{ animation: 'fog-c 11s ease-in-out infinite alternate' }}
        />
        <ellipse cx="500" cy="680" rx="280" ry="190"
          fill={c(0.42)} filter="url(#fb-d)"
          style={{ animation: 'fog-d 16s ease-in-out infinite alternate' }}
        />
        <ellipse cx="200" cy="120" rx="360" ry="210"
          fill={c(0.35)} filter="url(#fb-e)"
          style={{ animation: 'fog-e 22s ease-in-out infinite alternate' }}
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
          fog-a { animation-duration: 7s; }
          fog-b { animation-duration: 9s; }
          fog-c { animation-duration: 6s; }
          fog-d { animation-duration: 8s; }
          fog-e { animation-duration: 11s; }
        `}</style>
      </svg>
    </div>
  )

 // ── Contenu feu ──
  const mode = activeMode || 'bougie'
  const fireAnimName = `vfx-fire-glow-${mode}`
  const fireDuration = mode === 'bougie' ? '4s' : mode === 'brasier' ? '2.5s' : '1.4s'

  const fireContent = (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: '120%',
        height: '65%',
        background: isDark
          ? 'radial-gradient(ellipse at 50% 100%, rgba(200,100,10,0.22) 0%, rgba(180,80,0,0.10) 45%, transparent 75%)'
          : 'radial-gradient(ellipse at 50% 100%, rgba(180,80,0,0.15) 0%, rgba(160,60,0,0.07) 45%, transparent 75%)',
        animation: `${fireAnimName} ${fireDuration} ease-in-out infinite`,
      }} />
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '5%',
        width: '90%',
        height: '70%',
        background: isDark
          ? 'radial-gradient(ellipse at 50% 60%, rgba(220,140,20,0.10) 0%, transparent 65%)'
          : 'radial-gradient(ellipse at 50% 60%, rgba(180,100,0,0.07) 0%, transparent 65%)',
        animation: `${fireAnimName} ${fireDuration} ease-in-out infinite`,
        animationDelay: '0.7s',
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '40%',
        background: isDark
          ? 'linear-gradient(to bottom, rgba(10,4,0,0.35) 0%, transparent 100%)'
          : 'linear-gradient(to bottom, rgba(30,15,0,0.15) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  )

  return (
    <>
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
      <div
        ref={fireOverlayRef}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 9400,
          pointerEvents: 'none',
          opacity: 0,
          overflow: 'hidden',
        }}
      >
        {fireContent}
      </div>
    </>
  )
}

export default VfxOverlay
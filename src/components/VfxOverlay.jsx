import { useEffect, useRef, useState } from 'react'

const FOG_OPACITY  = { léger: 0.18, dense: 0.55, épais: 0.75 }
const FADE_IN      = 6000
const FADE_OUT     = 7000
const FIRE_FADE_IN  = 2500
const FIRE_FADE_OUT = 3500

function getIsDark() {
  try {
    return JSON.parse(localStorage.getItem('ili_theme') || '{}').isDark !== false
  } catch { return true }
}

function VfxOverlay({ activeType, activeMode }) {
  const fogRef  = useRef(null)
  const fireRef = useRef(null)
  const [isDark, setIsDark] = useState(getIsDark)

  useEffect(() => {
    const interval = setInterval(() => setIsDark(getIsDark()), 300)
    return () => clearInterval(interval)
  }, [])

  // ── Fog ──
  useEffect(() => {
    const el = fogRef.current
    if (!el) return
    if (activeType === 'fog') {
      const target = FOG_OPACITY[activeMode] ?? FOG_OPACITY['léger']
      el.style.display = 'block'
      void el.offsetHeight
      el.style.transition = `opacity ${FADE_IN}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = String(target)
    } else {
      el.style.transition = `opacity ${FADE_OUT}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = '0'
      const t = setTimeout(() => { if (el.style.opacity === '0') el.style.display = 'none' }, FADE_OUT + 100)
      return () => clearTimeout(t)
    }
  }, [activeType, activeMode])

  // ── Fire ──
  useEffect(() => {
    const el = fireRef.current
    if (!el) return
    if (activeType === 'fire') {
      el.style.display = 'block'
      void el.offsetHeight
      el.style.transition = `opacity ${FIRE_FADE_IN}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = '1'
    } else {
      el.style.transition = `opacity ${FIRE_FADE_OUT}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = '0'
      const t = setTimeout(() => { if (el.style.opacity === '0') el.style.display = 'none' }, FIRE_FADE_OUT + 100)
      return () => clearTimeout(t)
    }
  }, [activeType, activeMode])

  const fw = isDark ? '255,255,255' : '40,35,30'
  const fc = (a) => `rgba(${fw},${a})`

  // ── Couleurs feu selon thème ──
  const ff = (rgb, a) => `rgba(${rgb},${a})`
  const fa  = isDark ? '210,100,5'  : '160,70,0'
  const fb2 = isDark ? '230,140,10' : '180,100,0'
  const fc2 = isDark ? '255,80,0'   : '200,40,0'
  const mode = activeMode || 'bougie'

  // Intensités des nappes selon mode
  const baseIntensity = mode === 'bougie' ? 0.55 : mode === 'brasier' ? 0.80 : 1.0
  const topIntensity  = mode === 'brasier' ? 0.45 : mode === 'inferno' ? 0.75 : 0

  return (
    <>
      {/* ══ BROUILLARD ══ */}
      <div ref={fogRef} style={{
        display: 'none', position: 'fixed', inset: 0,
        zIndex: 9500, pointerEvents: 'none', opacity: 0, overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 600 1100"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <filter id="fb-a" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="55"/></filter>
              <filter id="fb-b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
              <filter id="fb-c" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="48"/></filter>
              <filter id="fb-d" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="62"/></filter>
              <filter id="fb-e" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="42"/></filter>
            </defs>
            <ellipse cx="300" cy="980" rx="440" ry="260" fill={fc(0.62)} filter="url(#fb-a)" style={{ animation: 'fog-a 14s ease-in-out infinite alternate' }}/>
            <ellipse cx="80"  cy="550" rx="340" ry="200" fill={fc(0.48)} filter="url(#fb-b)" style={{ animation: 'fog-b 18s ease-in-out infinite alternate' }}/>
            <ellipse cx="420" cy="420" rx="300" ry="180" fill={fc(0.40)} filter="url(#fb-c)" style={{ animation: 'fog-c 11s ease-in-out infinite alternate' }}/>
            <ellipse cx="500" cy="680" rx="280" ry="190" fill={fc(0.42)} filter="url(#fb-d)" style={{ animation: 'fog-d 16s ease-in-out infinite alternate' }}/>
            <ellipse cx="200" cy="120" rx="360" ry="210" fill={fc(0.35)} filter="url(#fb-e)" style={{ animation: 'fog-e 22s ease-in-out infinite alternate' }}/>
            <style>{`
              @keyframes fog-a {
                0%   { transform: translate(-50px,0px) scale(1); }
                30%  { transform: translate(30px,-70px) scale(1.07); }
                70%  { transform: translate(-20px,-40px) scale(0.96); }
                100% { transform: translate(60px,-110px) scale(1.11); }
              }
              @keyframes fog-b {
                0%   { transform: translate(0px,30px) scale(1); }
                25%  { transform: translate(70px,-50px) scale(1.09); }
                60%  { transform: translate(40px,20px) scale(1.03); }
                100% { transform: translate(-60px,-80px) scale(0.94); }
              }
              @keyframes fog-c {
                0%   { transform: translate(40px,-30px) scale(1.05); }
                40%  { transform: translate(-50px,60px) scale(0.95); }
                70%  { transform: translate(20px,40px) scale(1.08); }
                100% { transform: translate(-70px,-50px) scale(1.01); }
              }
              @keyframes fog-d {
                0%   { transform: translate(-30px,40px) scale(1); }
                35%  { transform: translate(50px,-60px) scale(1.06); }
                75%  { transform: translate(-40px,-25px) scale(0.97); }
                100% { transform: translate(20px,70px) scale(1.1); }
              }
              @keyframes fog-e {
                0%   { transform: translate(30px,50px) scale(1.04); }
                20%  { transform: translate(-40px,90px) scale(1.01); }
                65%  { transform: translate(60px,70px) scale(1.07); }
                100% { transform: translate(-30px,120px) scale(0.96); }
              }
            `}</style>
          </svg>
        </div>
      </div>

      {/* ══ FEU ══ */}
      <div ref={fireRef} style={{
        display: 'none', position: 'fixed', inset: 0,
        zIndex: 9400, pointerEvents: 'none', opacity: 0, overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 600 1100"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              {/* Flous feu — plus petits que brouillard pour garder de l'énergie */}
              <filter id="ff-a" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>
              <filter id="ff-b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="50"/></filter>
              <filter id="ff-c" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
              <filter id="ff-d" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="44"/></filter>
              <filter id="ff-e" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="32"/></filter>
              <filter id="ff-f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="55"/></filter>
            </defs>

            {/* ── Nappes BAS (toujours présentes) ── */}

            <ellipse cx="300" cy="1180" rx="420" ry="280"
              fill={ff(fa, baseIntensity * 0.90)}
              filter="url(#ff-b)"
              style={{ animation: `fire-base-a ${mode === 'bougie' ? '5.3s' : mode === 'brasier' ? '3.1s' : '1.9s'} ease-in-out infinite alternate` }}
            />
            <ellipse cx="80" cy="1050" rx="280" ry="200"
              fill={ff(fa, baseIntensity * 0.70)}
              filter="url(#ff-a)"
              style={{ animation: `fire-base-b ${mode === 'bougie' ? '4.7s' : mode === 'brasier' ? '2.8s' : '1.6s'} ease-in-out infinite alternate` }}
            />
            <ellipse cx="520" cy="1080" rx="260" ry="190"
              fill={ff(fb2, baseIntensity * 0.65)}
              filter="url(#ff-a)"
              style={{ animation: `fire-base-c ${mode === 'bougie' ? '6.1s' : mode === 'brasier' ? '3.6s' : '2.2s'} ease-in-out infinite alternate` }}
            />
            <ellipse cx="300" cy="820" rx="200" ry="160"
              fill={ff(fb2, baseIntensity * 0.40)}
              filter="url(#ff-c)"
              style={{ animation: `fire-ember-a ${mode === 'bougie' ? '3.8s' : mode === 'brasier' ? '2.2s' : '1.3s'} ease-in-out infinite alternate` }}
            />
            <ellipse cx="460" cy="700" rx="160" ry="120"
              fill={ff(fc2, baseIntensity * 0.28)}
              filter="url(#ff-e)"
              style={{ animation: `fire-ember-b ${mode === 'bougie' ? '4.4s' : mode === 'brasier' ? '2.6s' : '1.5s'} ease-in-out infinite alternate` }}
            />
            <ellipse cx="140" cy="650" rx="150" ry="110"
              fill={ff(fa, baseIntensity * 0.25)}
              filter="url(#ff-e)"
              style={{ animation: `fire-ember-c ${mode === 'bougie' ? '5.8s' : mode === 'brasier' ? '3.4s' : '2.0s'} ease-in-out infinite alternate` }}
            />

            {/* ── Nappes HAUT (brasier + inferno seulement) ── */}
            {topIntensity > 0 && (<>
              {/* Langue principale haut */}
              <ellipse cx="300" cy="-80" rx="380" ry="240"
                fill={ff(fc2.split('').join(''), topIntensity * 0.85)}
                filter="url(#ff-b)"
                style={{ animation: `fire-top-a ${mode === 'inferno' ? '2.1s' : '3.5s'} ease-in-out infinite alternate` }}
              />
              {/* Langue gauche haut */}
              <ellipse cx="100" cy="-40" rx="240" ry="160"
                fill={ff(fa.split('').join(''), topIntensity * 0.65)}
                filter="url(#ff-a)"
                style={{ animation: `fire-top-b ${mode === 'inferno' ? '1.7s' : '2.9s'} ease-in-out infinite alternate` }}
              />
              {/* Langue droite haut */}
              <ellipse cx="500" cy="-60" rx="220" ry="150"
                fill={ff(fb2.split('').join(''), topIntensity * 0.60)}
                filter="url(#ff-d)"
                style={{ animation: `fire-top-c ${mode === 'inferno' ? '2.5s' : '4.1s'} ease-in-out infinite alternate` }}
              />
              {/* Résidu haut centre — descend légèrement */}
              <ellipse cx="260" cy="180" rx="180" ry="130"
                fill={ff(fc2.split('').join(''), topIntensity * 0.38)}
                filter="url(#ff-c)"
                style={{ animation: `fire-top-d ${mode === 'inferno' ? '1.4s' : '2.3s'} ease-in-out infinite alternate` }}
              />
            </>)}

            {/* Vignette noire haut — dramatise toujours */}
            <defs>
              <radialGradient id="vign-top" cx="50%" cy="0%" r="70%">
                <stop offset="0%" stopColor={isDark ? 'rgba(5,2,0,0.65)' : 'rgba(15,5,0,0.25)'} />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="600" height="400" fill="url(#vign-top)" />

            <style>{`
              /* ── Base bas ── */
              @keyframes fire-base-a {
                0%   { transform: translate(-30px, 0px)   scale(1)    opacity(0.88); }
                15%  { transform: translate( 15px,-45px)  scale(1.08) opacity(0.72); }
                33%  { transform: translate(-20px,-30px)  scale(0.94) opacity(0.95); }
                50%  { transform: translate( 40px,-60px)  scale(1.12) opacity(0.68); }
                67%  { transform: translate(-10px,-20px)  scale(1.05) opacity(0.90); }
                82%  { transform: translate( 25px,-50px)  scale(0.97) opacity(0.75); }
                100% { transform: translate(-40px,-80px)  scale(1.10) opacity(0.85); }
              }
              @keyframes fire-base-b {
                0%   { transform: translate(  0px,  0px)  scale(1)    opacity(0.82); }
                20%  { transform: translate( 50px,-35px)  scale(1.10) opacity(0.60); }
                45%  { transform: translate(-30px,-55px)  scale(0.92) opacity(0.90); }
                65%  { transform: translate( 20px,-25px)  scale(1.06) opacity(0.65); }
                100% { transform: translate(-50px,-70px)  scale(1.08) opacity(0.88); }
              }
              @keyframes fire-base-c {
                0%   { transform: translate( 20px,  0px)  scale(1.02) opacity(0.78); }
                25%  { transform: translate(-40px,-40px)  scale(0.95) opacity(0.92); }
                55%  { transform: translate( 30px,-60px)  scale(1.09) opacity(0.62); }
                75%  { transform: translate(-15px,-30px)  scale(1.04) opacity(0.85); }
                100% { transform: translate( 45px,-75px)  scale(0.96) opacity(0.70); }
              }
              /* ── Résidus / braises montantes ── */
              @keyframes fire-ember-a {
                0%   { transform: translate(  0px,   0px) scale(1)    opacity(0.65); }
                18%  { transform: translate( 35px, -80px) scale(1.15) opacity(0.35); }
                40%  { transform: translate(-25px,-120px) scale(0.88) opacity(0.70); }
                60%  { transform: translate( 45px, -90px) scale(1.10) opacity(0.28); }
                80%  { transform: translate(-10px,-150px) scale(1.05) opacity(0.55); }
                100% { transform: translate( 20px,-180px) scale(0.92) opacity(0.20); }
              }
              @keyframes fire-ember-b {
                0%   { transform: translate(  0px,   0px) scale(1)    opacity(0.55); }
                22%  { transform: translate(-30px, -70px) scale(1.12) opacity(0.28); }
                48%  { transform: translate( 40px,-110px) scale(0.90) opacity(0.62); }
                70%  { transform: translate(-20px, -80px) scale(1.08) opacity(0.22); }
                100% { transform: translate( 10px,-160px) scale(0.95) opacity(0.45); }
              }
              @keyframes fire-ember-c {
                0%   { transform: translate(  0px,   0px) scale(1.05) opacity(0.50); }
                30%  { transform: translate( 25px, -90px) scale(0.92) opacity(0.30); }
                55%  { transform: translate(-35px,-130px) scale(1.10) opacity(0.58); }
                78%  { transform: translate( 15px,-100px) scale(0.96) opacity(0.18); }
                100% { transform: translate(-20px,-170px) scale(1.04) opacity(0.42); }
              }
              /* ── Nappes haut ── */
              @keyframes fire-top-a {
                0%   { transform: translate(-25px,  0px) scale(1)    opacity(0.85); }
                20%  { transform: translate( 40px, 60px) scale(1.12) opacity(0.55); }
                42%  { transform: translate(-15px, 35px) scale(0.93) opacity(0.90); }
                63%  { transform: translate( 30px, 70px) scale(1.08) opacity(0.48); }
                82%  { transform: translate(-35px, 45px) scale(1.05) opacity(0.78); }
                100% { transform: translate( 20px, 80px) scale(0.96) opacity(0.62); }
              }
              @keyframes fire-top-b {
                0%   { transform: translate( 10px,  0px) scale(1.04) opacity(0.78); }
                28%  { transform: translate(-45px, 50px) scale(0.94) opacity(0.45); }
                52%  { transform: translate( 25px, 75px) scale(1.10) opacity(0.82); }
                74%  { transform: translate(-20px, 40px) scale(0.98) opacity(0.38); }
                100% { transform: translate( 35px, 85px) scale(1.06) opacity(0.70); }
              }
              @keyframes fire-top-c {
                0%   { transform: translate(-15px,  0px) scale(1)    opacity(0.72); }
                32%  { transform: translate( 35px, 55px) scale(1.09) opacity(0.40); }
                58%  { transform: translate(-30px, 80px) scale(0.92) opacity(0.80); }
                80%  { transform: translate( 20px, 45px) scale(1.05) opacity(0.35); }
                100% { transform: translate(-40px, 90px) scale(0.97) opacity(0.65); }
              }
              @keyframes fire-top-d {
                0%   { transform: translate(  0px,  0px) scale(1)    opacity(0.50); }
                35%  { transform: translate( 30px, 90px) scale(1.14) opacity(0.22); }
                65%  { transform: translate(-20px, 60px) scale(0.90) opacity(0.55); }
                100% { transform: translate( 15px,110px) scale(1.08) opacity(0.18); }
              }
            `}</style>
          </svg>
        </div>
      </div>
    </>
  )
}

export default VfxOverlay
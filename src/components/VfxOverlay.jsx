import { useEffect, useRef, useState } from 'react'

const FOG_OPACITY  = { léger: 0.18, dense: 0.55, épais: 0.75 }
const FADE_IN      = 6000
const FADE_OUT     = 7000
const FIRE_FADE_IN  = 2500
const FIRE_FADE_OUT = 3500
const RAIN_FADE_IN  = 3000
const RAIN_FADE_OUT = 4000
const SNOW_FADE_IN  = 7000
const SNOW_FADE_OUT = 9000
const UW_FADE_IN    = 5000
const UW_FADE_OUT   = 6000
const SUN_FADE_IN   = 14000
const SUN_FADE_OUT  = 10000

function getIsDark() {
  try {
    return JSON.parse(localStorage.getItem('ili_theme') || '{}').isDark !== false
  } catch { return true }
}

// ── LCG déterministe pour seed par index ──
function lcg(seed) {
  let s = seed
  return () => {
    s = Math.imul(1664525, s) + 1013904223 | 0
    return (s >>> 0) / 0xffffffff
  }
}

function VfxOverlay({ activeType, activeMode }) {
  const fogRef       = useRef(null)
  const fireRef      = useRef(null)
  const rainRef      = useRef(null)
  const snowRef      = useRef(null)
  const uwRef        = useRef(null)
  const sunRef       = useRef(null)
  const rainCanvasRef = useRef(null)
  const snowCanvasRef = useRef(null)
  const rainRafRef    = useRef(null)
  const snowRafRef    = useRef(null)
  const sunRafRef     = useRef(null)
  const [isDark, setIsDark] = useState(getIsDark)

  useEffect(() => {
    const interval = setInterval(() => setIsDark(getIsDark()), 300)
    return () => clearInterval(interval)
  }, [])

  // ══════════════════════════════════════════
  // ── FOG ──
  // ══════════════════════════════════════════
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

  // ══════════════════════════════════════════
  // ── FIRE ──
  // ══════════════════════════════════════════
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

  // ══════════════════════════════════════════
  // ── RAIN — Canvas 2D ──
  // ══════════════════════════════════════════
  useEffect(() => {
    const wrapper = rainRef.current
    const canvas  = rainCanvasRef.current
    if (!wrapper || !canvas) return

    if (activeType !== 'rain') {
      wrapper.style.transition = `opacity ${RAIN_FADE_OUT}ms cubic-bezier(0.37, 0, 0.63, 1)`
      wrapper.style.opacity = '0'
      const t = setTimeout(() => {
        if (wrapper.style.opacity === '0') {
          wrapper.style.display = 'none'
          if (rainRafRef.current) { cancelAnimationFrame(rainRafRef.current); rainRafRef.current = null }
        }
      }, RAIN_FADE_OUT + 100)
      return () => clearTimeout(t)
    }

    wrapper.style.display = 'block'
    void wrapper.offsetHeight
    wrapper.style.transition = `opacity ${RAIN_FADE_IN}ms cubic-bezier(0.37, 0, 0.63, 1)`
    wrapper.style.opacity = '1'

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    // Paramètres selon mode
    const cfg = {
      bruine:  { count: 280, lenMin: 8,   lenMax: 18,  speedMin: 5,   speedMax: 11,  angleRad: 0.06, widthMin: 0.4, widthMax: 0.8, opMin: 0.13, opMax: 0.28 },
      averse:  { count: 360, lenMin: 14,  lenMax: 30,  speedMin: 11,  speedMax: 20,  angleRad: 0.18, widthMin: 0.5, widthMax: 1.0, opMin: 0.13, opMax: 0.28 },
      tempête: { count: 500, lenMin: 22,  lenMax: 55,  speedMin: 22,  speedMax: 40,  angleRad: 0.45, widthMin: 0.6, widthMax: 1.3, opMin: 0.13, opMax: 0.28 },
    }[activeMode] ?? { count: 320, lenMin: 10, lenMax: 22, speedMin: 8, speedMax: 16, angleRad: 0.18, widthMin: 0.5, widthMax: 1.0, opMin: 0.13, opMax: 0.26 }

    const sinAngle = Math.sin(cfg.angleRad)
    const cosAngle = Math.cos(cfg.angleRad)

    // ── Spawn distribué sur toute la diagonale d'entrée ──
    // Pour couvrir TOUT l'écran même en biais, on initialise les gouttes
    // sur une zone étendue qui englobe la diagonale de défilement complète.
    // La zone de spawn horizontal est [-overflow … W + overflow] où overflow
    // compense exactement la dérive horizontale max pendant la traversée verticale.
    const maxDrift = (H / cosAngle) * sinAngle  // dérive X max pendant traversée
    const overflow = Math.ceil(Math.abs(maxDrift) + cfg.lenMax + 10)

    const drops = Array.from({ length: cfg.count }, (_, i) => {
      const r = lcg(i * 7919 + 1)
      // Distribution uniforme sur toute la zone élargie
      const spawnX = -overflow + r() * (W + overflow * 2)
      return {
        x:     spawnX,
        y:     r() * H,            // position initiale répartie sur toute la hauteur
        len:   cfg.lenMin + r() * (cfg.lenMax   - cfg.lenMin),
        speed: cfg.speedMin + r() * (cfg.speedMax - cfg.speedMin),
        op:    cfg.opMin + r() * (cfg.opMax - cfg.opMin),
        w:     cfg.widthMin + r() * (cfg.widthMax - cfg.widthMin),
        phase: r() * Math.PI * 2,
        phaseSpeed: 0.003 + r() * 0.009,
      }
    })

    let t = 0
    const tick = () => {
      ctx.clearRect(0, 0, W, H)
      t++
      for (const d of drops) {
        d.x += d.speed * sinAngle
        d.y += d.speed * cosAngle
        // Recycle : dès que la goutte sort par le bas ou trop loin à droite,
        // elle réapparaît en haut dans la zone élargie
        if (d.y > H + d.len) {
          d.y = -d.len - Math.random() * 60
          d.x = -overflow + Math.random() * (W + overflow * 2)
        } else if (d.x > W + overflow) {
          d.x = -overflow
          d.y = Math.random() * H
        } else if (d.x < -overflow - 20) {
          d.x = W + overflow
          d.y = Math.random() * H
        }
        const opFactor = 0.75 + 0.25 * Math.sin(t * d.phaseSpeed + d.phase)
        ctx.save()
        ctx.globalAlpha = d.op * opFactor
        ctx.strokeStyle = isDark ? 'rgba(220,230,255,1)' : 'rgba(80,100,140,1)'
        ctx.lineWidth = d.w
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x + d.len * sinAngle, d.y + d.len * cosAngle)
        ctx.stroke()
        ctx.restore()
      }
      rainRafRef.current = requestAnimationFrame(tick)
    }
    rainRafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rainRafRef.current) { cancelAnimationFrame(rainRafRef.current); rainRafRef.current = null }
      ctx.clearRect(0, 0, W, H)
    }
  }, [activeType, activeMode, isDark])

  // ══════════════════════════════════════════
  // ── SNOW — Canvas 2D ──
  // ══════════════════════════════════════════
  useEffect(() => {
    const wrapper = snowRef.current
    const canvas  = snowCanvasRef.current
    if (!wrapper || !canvas) return

    if (activeType !== 'snow') {
      wrapper.style.transition = `opacity ${SNOW_FADE_OUT}ms cubic-bezier(0.37, 0, 0.63, 1)`
      wrapper.style.opacity = '0'
      const t = setTimeout(() => {
        if (wrapper.style.opacity === '0') {
          wrapper.style.display = 'none'
          if (snowRafRef.current) { cancelAnimationFrame(snowRafRef.current); snowRafRef.current = null }
        }
      }, SNOW_FADE_OUT + 100)
      return () => clearTimeout(t)
    }

    wrapper.style.display = 'block'
    void wrapper.offsetHeight
    wrapper.style.transition = `opacity ${SNOW_FADE_IN}ms cubic-bezier(0.37, 0, 0.63, 1)`
    wrapper.style.opacity = '1'

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    const cfg = {
      légère:  { count: 90,  radMin: 0.8, radMax: 2.2, speedMin: 0.4, speedMax: 1.1, driftAmp: 22, driftFreq: 0.0008, opMin: 0.10, opMax: 0.28 },
      normale: { count: 180, radMin: 1.0, radMax: 3.0, speedMin: 0.6, speedMax: 1.8, driftAmp: 35, driftFreq: 0.0012, opMin: 0.12, opMax: 0.32 },
      blizzard:{ count: 340, radMin: 0.8, radMax: 3.5, speedMin: 1.2, speedMax: 3.5, driftAmp: 70, driftFreq: 0.0022, opMin: 0.14, opMax: 0.38 },
    }[activeMode] ?? { count: 140, radMin: 1.0, radMax: 2.8, speedMin: 0.5, speedMax: 1.5, driftAmp: 30, driftFreq: 0.001, opMin: 0.12, opMax: 0.30 }

    const flakes = Array.from({ length: cfg.count }, (_, i) => {
      const r = lcg(i * 6271 + 42)
      // ── Offset temporel initial : chaque flocon démarre à un moment
      // différent de sa trajectoire, éliminant toute synchro visible ──
      // On simule un temps de départ fictif entre 0 et 8000 "ticks"
      // pour que l'animation soit déjà en phase chaotique dès le 1er frame.
      const tOffset = Math.floor(r() * 8000)
      return {
        x:          r() * W,
        y:          r() * H,
        rad:        cfg.radMin + r() * (cfg.radMax - cfg.radMin),
        speed:      cfg.speedMin + r() * (cfg.speedMax - cfg.speedMin),
        op:         cfg.opMin + r() * (cfg.opMax - cfg.opMin),
        driftPhase: r() * Math.PI * 2,
        driftFreq:  cfg.driftFreq * (0.6 + r() * 0.8),
        driftAmp:   cfg.driftAmp  * (0.4 + r() * 1.2),
        opPhase:    r() * Math.PI * 2,
        opFreq:     0.0005 + r() * 0.0015,
        tOffset,
      }
    })
    let t = 0
    const tick = () => {
      ctx.clearRect(0, 0, W, H)
      t++
      for (const f of flakes) {
        const tEff = t + f.tOffset  // temps effectif individuel
        f.y += f.speed
        // Oscillation sinusoïdale horizontale — chaque flocon utilise son tEff
        f.x += Math.sin(tEff * f.driftFreq * 1000 + f.driftPhase) * 0.4
        if (activeMode === 'blizzard') f.x += 0.6
        if (f.y > H + f.rad * 2) {
          f.y = -f.rad * 2 - Math.random() * 80
          f.x = Math.random() * W
        }
        if (f.x > W + 40) f.x = -40
        if (f.x < -40)    f.x = W + 40
        // Opacité pulsée — utilise aussi tEff pour éviter les vagues synchronisées
        const opFactor = 0.80 + 0.20 * Math.sin(tEff * f.opFreq * 1000 + f.opPhase)
        ctx.save()
        ctx.globalAlpha = f.op * opFactor
        ctx.fillStyle = isDark ? 'rgba(235,242,255,1)' : 'rgba(100,120,160,1)'
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.rad, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      snowRafRef.current = requestAnimationFrame(tick)
    }
    snowRafRef.current = requestAnimationFrame(tick)

    return () => {
      if (snowRafRef.current) { cancelAnimationFrame(snowRafRef.current); snowRafRef.current = null }
      ctx.clearRect(0, 0, W, H)
    }
  }, [activeType, activeMode, isDark])

  // ══════════════════════════════════════════
  // ── UNDERWATER — feTurbulence + caustiques ──
  // ══════════════════════════════════════════
  const uwRafRef = useRef(null)
  useEffect(() => {
    const el = uwRef.current
    if (!el) return
    if (activeType !== 'underwater') {
      el.style.transition = `opacity ${UW_FADE_OUT}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = '0'
      const t = setTimeout(() => {
        if (el.style.opacity === '0') {
          el.style.display = 'none'
          if (uwRafRef.current) { cancelAnimationFrame(uwRafRef.current); uwRafRef.current = null }
        }
      }, UW_FADE_OUT + 100)
      return () => clearTimeout(t)
    }
    el.style.display = 'block'
    void el.offsetHeight
    el.style.transition = `opacity ${UW_FADE_IN}ms cubic-bezier(0.37, 0, 0.63, 1)`
    el.style.opacity = '1'

    // ── Animation feTurbulence : ondulation réaliste du texte ──
    const turbEl = el.querySelector('#uw-turbulence')
    if (!turbEl) return
    let uwTime = 0
    const animateTurb = () => {
      uwTime += 0.007
      const bfx = 0.013 + Math.sin(uwTime * 0.7)  * 0.003
      const bfy = 0.035 + Math.cos(uwTime * 0.5)  * 0.006
      turbEl.setAttribute('baseFrequency', `${bfx.toFixed(5)} ${bfy.toFixed(5)}`)
      uwRafRef.current = requestAnimationFrame(animateTurb)
    }
    uwRafRef.current = requestAnimationFrame(animateTurb)
    return () => {
      if (uwRafRef.current) { cancelAnimationFrame(uwRafRef.current); uwRafRef.current = null }
    }
  }, [activeType, activeMode])

  // ══════════════════════════════════════════
  // ── SUN — RAF radiance premium ──
  // ══════════════════════════════════════════
  useEffect(() => {
    const el = sunRef.current
    if (!el) return
    if (activeType !== 'sun') {
      el.style.transition = `opacity ${SUN_FADE_OUT}ms cubic-bezier(0.37, 0, 0.63, 1)`
      el.style.opacity = '0'
      const t = setTimeout(() => {
        if (el.style.opacity === '0') {
          el.style.display = 'none'
          if (sunRafRef.current) { cancelAnimationFrame(sunRafRef.current); sunRafRef.current = null }
        }
      }, SUN_FADE_OUT + 100)
      return () => clearTimeout(t)
    }
    el.style.display = 'block'
    void el.offsetHeight
    el.style.transition = `opacity ${SUN_FADE_IN}ms cubic-bezier(0.37, 0, 0.63, 1)`
    el.style.opacity = '1'

    const diskEl   = el.querySelector('#sun-disk')
    const corona1  = el.querySelector('#sun-corona1')
    const corona2  = el.querySelector('#sun-corona2')
    const corona3  = el.querySelector('#sun-corona3')
    const corona4  = el.querySelector('#sun-corona4')
    const glowEl   = el.querySelector('#sun-glow')
    const rayEls   = el.querySelectorAll('.sun-ray')
    if (!diskEl) return

    // ── Config par mode ──
    // xCenter : position horizontale dominante [0..1]
    // yBase   : hauteur de base (0=haut, 1=bas)
    // arcH    : amplitude verticale de l'arc
    // cycleDur: durée d'un aller-retour complet (ms)
    // palette : [diskRGB, coronaRGB] selon température
    const modeCfg = {
      aube: {
        xCenter: 0.14, yBase: 0.72, arcH: 0.12,
        cycleDur: 160000,
        diskRGB:   [255, 175, 80],   // orangé chaud
        coronaRGB: [255, 140, 40],
        diskAlpha: 0.95,
        diskRadius: 32,
      },
      zénith: {
        xCenter: 0.50, yBase: 0.18, arcH: 0.10,
        cycleDur: 200000,
        diskRGB:   [255, 248, 200],  // blanc-jaune
        coronaRGB: [255, 230, 140],
        diskAlpha: 0.98,
        diskRadius: 28,
      },
      crépuscule: {
        xCenter: 0.86, yBase: 0.68, arcH: 0.10,
        cycleDur: 160000,
        diskRGB:   [255, 110, 50],   // rouge-orangé
        coronaRGB: [255, 80, 20],
        diskAlpha: 0.95,
        diskRadius: 36,
      },
    }[activeMode] ?? {
      xCenter: 0.50, yBase: 0.30, arcH: 0.15,
      cycleDur: 180000,
      diskRGB: [255, 220, 120], coronaRGB: [255, 200, 80],
      diskAlpha: 0.95, diskRadius: 30,
    }

    let startTs = null
    const tick = (ts) => {
      if (!startTs) startTs = ts
      const elapsed = ts - startTs

      const W = window.innerWidth
      const H = window.innerHeight

      // Oscillation douce autour de xCenter
      const halfCycle = modeCfg.cycleDur / 2
      const phase  = (elapsed % modeCfg.cycleDur) / halfCycle
      const rawT   = phase <= 1 ? phase : 2 - phase
      const eased  = rawT < 0.5
        ? 2 * rawT * rawT
        : 1 - Math.pow(-2 * rawT + 2, 2) / 2
      // Dérive horizontale légère autour du centre du mode (±8% de l'écran)
      const xRatio = modeCfg.xCenter + (eased - 0.5) * 0.16
      // Arc vertical doux autour de yBase
      const yRatio = modeCfg.yBase - Math.sin(eased * Math.PI) * modeCfg.arcH

      const x = W * xRatio
      const y = H * yRatio

      const [dr, dg, db] = modeCfg.diskRGB
      const [cr, cg, cb] = modeCfg.coronaRGB
      const baseR = modeCfg.diskRadius

      // Pulsation douce du disque
      const pulse = 1 + 0.018 * Math.sin(ts * 0.00055)
      const R = baseR * pulse

      // ── Disque central ──
      diskEl.setAttribute('cx', x); diskEl.setAttribute('cy', y)
      diskEl.setAttribute('r', R)
      diskEl.setAttribute('fill', `rgba(${dr},${dg},${db},${modeCfg.diskAlpha})`)

      // ── Corona 1 — halo immédiat, flou fort ──
      const r1 = R + 22 + 6 * Math.sin(ts * 0.00038)
      corona1.setAttribute('cx', x); corona1.setAttribute('cy', y)
      corona1.setAttribute('r', r1)
      corona1.setAttribute('fill', `rgba(${cr},${cg},${cb},0.22)`)

      // ── Corona 2 — anneau diffus ──
      const r2 = R + 55 + 10 * Math.sin(ts * 0.00027 + 1.1)
      corona2.setAttribute('cx', x); corona2.setAttribute('cy', y)
      corona2.setAttribute('r', r2)
      corona2.setAttribute('fill', `rgba(${cr},${cg},${cb},0.10)`)

      // ── Corona 3 — grande auréole ──
      const r3 = R + 110 + 18 * Math.sin(ts * 0.00019 + 2.3)
      corona3.setAttribute('cx', x); corona3.setAttribute('cy', y)
      corona3.setAttribute('r', r3)
      corona3.setAttribute('fill', `rgba(${cr},${cg},${cb},0.055)`)

      // ── Corona 4 — diffusion atmosphérique extrême ──
      const r4 = R + 200 + 28 * Math.sin(ts * 0.00013 + 0.7)
      corona4.setAttribute('cx', x); corona4.setAttribute('cy', y)
      corona4.setAttribute('r', r4)
      corona4.setAttribute('fill', `rgba(${cr},${cg},${cb},0.022)`)

      // ── Glow au sol (halo bas allongé, uniquement proche horizon) ──
      const horizonFactor = Math.max(0, yRatio - 0.35) / 0.65
      glowEl.setAttribute('cx', x)
      glowEl.setAttribute('cy', String(y + R * 0.6))
      glowEl.setAttribute('rx', String((R + 80) * (1 + horizonFactor * 1.2)))
      glowEl.setAttribute('ry', String((R + 18) * (0.5 + horizonFactor * 0.6)))
      glowEl.setAttribute('fill', `rgba(${cr},${cg},${cb},${(0.08 + horizonFactor * 0.10).toFixed(3)})`)

      // ── Rayons — fins, longs, pulsés individuellement ──
      rayEls.forEach((ray, i) => {
        const angle   = (i / rayEls.length) * Math.PI * 2 + ts * 0.000028
        const rayLen  = R * 0.55 + R * 0.45 * Math.sin(ts * (0.00028 + i * 0.000031) + i * 1.23)
        const gap     = R + 3
        ray.setAttribute('x1', String(x + Math.cos(angle) * gap))
        ray.setAttribute('y1', String(y + Math.sin(angle) * gap))
        ray.setAttribute('x2', String(x + Math.cos(angle) * (gap + rayLen)))
        ray.setAttribute('y2', String(y + Math.sin(angle) * (gap + rayLen)))
        const rayAlpha = (0.18 + 0.10 * Math.sin(ts * 0.00041 + i * 0.9)).toFixed(3)
        ray.setAttribute('stroke', `rgba(${dr},${dg},${db},${rayAlpha})`)
        ray.setAttribute('stroke-width', String(0.8 + 0.5 * Math.sin(ts * 0.00033 + i)))
      })

      sunRafRef.current = requestAnimationFrame(tick)
    }
    sunRafRef.current = requestAnimationFrame(tick)
    return () => {
      if (sunRafRef.current) { cancelAnimationFrame(sunRafRef.current); sunRafRef.current = null }
    }
  }, [activeType, activeMode, isDark])

  // ══════════════════════════════════════════
  // ── Couleurs feu (inchangées) ──
  // ══════════════════════════════════════════
  const fw  = isDark ? '255,255,255' : '40,35,30'
  const fc  = (a) => `rgba(${fw},${a})`
  const ff  = (rgb, a) => `rgba(${rgb},${a})`
  const fa  = isDark ? '210,100,5'  : '160,70,0'
  const fb2 = isDark ? '230,140,10' : '180,100,0'
  const fc2 = isDark ? '255,80,0'   : '200,40,0'
  const mode = activeMode || 'bougie'
  const baseIntensity = mode === 'bougie' ? 0.32 : mode === 'brasier' ? 0.80 : 1.0
  const topIntensity  = mode === 'brasier' ? 0.45 : mode === 'inferno' ? 0.75 : 0

  // ── Paramètres sous-marin ──
  const uwCfg = {
    surface: {
      filterStr: isDark
        ? 'hue-rotate(160deg) saturate(1.4) brightness(0.88) sepia(0.18)'
        : 'hue-rotate(155deg) saturate(1.6) brightness(0.92) sepia(0.12)',
      overlayOp: 0.04, causticOp: 0.13,
      causticColor: isDark ? '80,180,200' : '40,140,180',
      dispScale: 12,
    },
    profond: {
      filterStr: isDark
        ? 'hue-rotate(185deg) saturate(1.8) brightness(0.72) sepia(0.35)'
        : 'hue-rotate(180deg) saturate(2.0) brightness(0.78) sepia(0.28)',
      overlayOp: 0.10, causticColor: isDark ? '50,140,170' : '20,100,150', causticOp: 0.22,
      dispScale: 18,
    },
    abyssal: {
      filterStr: isDark
        ? 'hue-rotate(210deg) saturate(2.2) brightness(0.48) sepia(0.60)'
        : 'hue-rotate(205deg) saturate(2.4) brightness(0.55) sepia(0.55)',
      overlayOp: 0.20, causticColor: isDark ? '20,80,120' : '10,50,90', causticOp: 0.10,
      dispScale: 26,
    },
  }[activeMode] ?? {
    filterStr: 'hue-rotate(160deg) saturate(1.4) brightness(0.88)',
    overlayOp: 0.06, causticColor: '60,160,190', causticOp: 0.14,
    dispScale: 14,
  }

  return (
    <>
      {/* ══════════════════════════════════════
          BROUILLARD
      ══════════════════════════════════════ */}
      <div ref={fogRef} style={{
        display: 'none', position: 'fixed', inset: 0,
        zIndex: 9500, pointerEvents: 'none', opacity: 0, overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1100" preserveAspectRatio="xMidYMid slice">
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
              @keyframes fog-a { 0%{transform:translate(-50px,0px) scale(1)} 30%{transform:translate(30px,-70px) scale(1.07)} 70%{transform:translate(-20px,-40px) scale(0.96)} 100%{transform:translate(60px,-110px) scale(1.11)} }
              @keyframes fog-b { 0%{transform:translate(0px,30px) scale(1)} 25%{transform:translate(70px,-50px) scale(1.09)} 60%{transform:translate(40px,20px) scale(1.03)} 100%{transform:translate(-60px,-80px) scale(0.94)} }
              @keyframes fog-c { 0%{transform:translate(40px,-30px) scale(1.05)} 40%{transform:translate(-50px,60px) scale(0.95)} 70%{transform:translate(20px,40px) scale(1.08)} 100%{transform:translate(-70px,-50px) scale(1.01)} }
              @keyframes fog-d { 0%{transform:translate(-30px,40px) scale(1)} 35%{transform:translate(50px,-60px) scale(1.06)} 75%{transform:translate(-40px,-25px) scale(0.97)} 100%{transform:translate(20px,70px) scale(1.1)} }
              @keyframes fog-e { 0%{transform:translate(30px,50px) scale(1.04)} 20%{transform:translate(-40px,90px) scale(1.01)} 65%{transform:translate(60px,70px) scale(1.07)} 100%{transform:translate(-30px,120px) scale(0.96)} }
            `}</style>
          </svg>
        </div>
      </div>

      {/* ══════════════════════════════════════
          FEU
      ══════════════════════════════════════ */}
      <div ref={fireRef} style={{
        display: 'none', position: 'fixed', inset: 0,
        zIndex: 9400, pointerEvents: 'none', opacity: 0, overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1100" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="ff-a" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>
              <filter id="ff-b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="50"/></filter>
              <filter id="ff-c" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
              <filter id="ff-d" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="44"/></filter>
              <filter id="ff-e" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="32"/></filter>
            </defs>
            <ellipse cx="300" cy="1180" rx="420" ry="280" fill={ff(fa, baseIntensity*0.90)} filter="url(#ff-b)" style={{animation:`fire-base-a ${mode==='bougie'?'7.7s':mode==='brasier'?'4.3s':'2.5s'} ease-in-out infinite`,animationDelay:'0s'}}/>
            <ellipse cx="80"  cy="1050" rx="280" ry="200" fill={ff(fa, baseIntensity*0.70)} filter="url(#ff-a)" style={{animation:`fire-base-b ${mode==='bougie'?'9.3s':mode==='brasier'?'5.1s':'3.1s'} ease-in-out infinite`,animationDelay:'-2.4s'}}/>
            <ellipse cx="520" cy="1080" rx="260" ry="190" fill={ff(fb2,baseIntensity*0.65)} filter="url(#ff-a)" style={{animation:`fire-base-c ${mode==='bougie'?'11.1s':mode==='brasier'?'6.3s':'3.8s'} ease-in-out infinite`,animationDelay:'-5.1s'}}/>
            <ellipse cx="300" cy="820"  rx="200" ry="160" fill={ff(fb2,baseIntensity*0.40)} filter="url(#ff-c)" style={{animation:`fire-ember-a ${mode==='bougie'?'6.2s':mode==='brasier'?'3.5s':'2.1s'} ease-in-out infinite`,animationDelay:'-1.8s'}}/>
            <ellipse cx="460" cy="700"  rx="160" ry="120" fill={ff(fc2,baseIntensity*0.28)} filter="url(#ff-e)" style={{animation:`fire-ember-b ${mode==='bougie'?'8.4s':mode==='brasier'?'4.8s':'2.9s'} ease-in-out infinite`,animationDelay:'-3.7s'}}/>
            <ellipse cx="140" cy="650"  rx="150" ry="110" fill={ff(fa, baseIntensity*0.25)} filter="url(#ff-e)" style={{animation:`fire-ember-c ${mode==='bougie'?'10.6s':mode==='brasier'?'5.9s':'3.6s'} ease-in-out infinite`,animationDelay:'-6.3s'}}/>
            <ellipse cx="300" cy="-80"  rx="380" ry="240" fill={ff(fc2,0.85)} filter="url(#ff-b)"
              style={{animation:`fire-top-a ${mode==='inferno'?'2.1s':'3.5s'} ease-in-out infinite alternate`,transition:'opacity 2800ms cubic-bezier(0.37,0,0.63,1)'}}
              ref={el => { if (el) el.style.opacity = String(topIntensity * 0.82) }}/>
            <ellipse cx="100" cy="-40"  rx="240" ry="160" fill={ff(fa, 0.65)} filter="url(#ff-a)"
              style={{animation:`fire-top-b ${mode==='inferno'?'1.7s':'2.9s'} ease-in-out infinite alternate`,transition:'opacity 2800ms cubic-bezier(0.37,0,0.63,1)'}}
              ref={el => { if (el) el.style.opacity = String(topIntensity * 0.65) }}/>
            <ellipse cx="500" cy="-60"  rx="220" ry="150" fill={ff(fb2,0.60)} filter="url(#ff-d)"
              style={{animation:`fire-top-c ${mode==='inferno'?'2.5s':'4.1s'} ease-in-out infinite alternate`,transition:'opacity 2800ms cubic-bezier(0.37,0,0.63,1)'}}
              ref={el => { if (el) el.style.opacity = String(topIntensity * 0.60) }}/>
            <ellipse cx="260" cy="180"  rx="180" ry="130" fill={ff(fc2,0.38)} filter="url(#ff-c)"
              style={{animation:`fire-top-d ${mode==='inferno'?'1.4s':'2.3s'} ease-in-out infinite alternate`,transition:'opacity 2800ms cubic-bezier(0.37,0,0.63,1)'}}
              ref={el => { if (el) el.style.opacity = String(topIntensity * 0.38) }}/>
            <defs>
              <radialGradient id="vign-top" cx="50%" cy="0%" r="70%">
                <stop offset="0%" stopColor={isDark?'rgba(5,2,0,0.55)':'rgba(15,5,0,0.20)'}/>
                <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="600" height="500" fill="url(#vign-top)"/>
            <style>{`
              @keyframes fire-base-a{0%{transform:translate(-30px,0px) scale(1);opacity:.85}8%{transform:translate(5px,-20px) scale(1.03);opacity:.60}19%{transform:translate(-15px,-45px) scale(.96);opacity:.92}31%{transform:translate(35px,-30px) scale(1.09);opacity:.50}44%{transform:translate(-25px,-60px) scale(1.14);opacity:.88}53%{transform:translate(10px,-40px) scale(.98);opacity:.55}68%{transform:translate(-40px,-70px) scale(1.06);opacity:.95}79%{transform:translate(20px,-50px) scale(.93);opacity:.45}88%{transform:translate(-10px,-35px) scale(1.11);opacity:.80}100%{transform:translate(-30px,-80px) scale(1.04);opacity:.70}}
              @keyframes fire-base-b{0%{transform:translate(0px,0px) scale(1);opacity:.78}11%{transform:translate(45px,-25px) scale(1.07);opacity:.45}24%{transform:translate(-20px,-50px) scale(.93);opacity:.88}37%{transform:translate(30px,-35px) scale(1.11);opacity:.38}51%{transform:translate(-35px,-65px) scale(.97);opacity:.92}63%{transform:translate(15px,-45px) scale(1.05);opacity:.52}74%{transform:translate(-50px,-55px) scale(1.13);opacity:.82}86%{transform:translate(25px,-30px) scale(.95);opacity:.42}100%{transform:translate(-40px,-75px) scale(1.08);opacity:.75}}
              @keyframes fire-base-c{0%{transform:translate(20px,0px) scale(1.02);opacity:.72}13%{transform:translate(-30px,-35px) scale(.94);opacity:.90}27%{transform:translate(40px,-55px) scale(1.10);opacity:.48}42%{transform:translate(-10px,-40px) scale(1.15);opacity:.85}56%{transform:translate(25px,-65px) scale(.96);opacity:.40}69%{transform:translate(-40px,-45px) scale(1.07);opacity:.88}81%{transform:translate(15px,-30px) scale(.92);opacity:.55}93%{transform:translate(-20px,-70px) scale(1.12);opacity:.78}100%{transform:translate(45px,-60px) scale(1.01);opacity:.62}}
              @keyframes fire-ember-a{0%{transform:translate(0px,0px) scale(1);opacity:.58}12%{transform:translate(28px,-55px) scale(1.10);opacity:.22}26%{transform:translate(-18px,-95px) scale(.90);opacity:.62}39%{transform:translate(42px,-115px) scale(1.14);opacity:.15}54%{transform:translate(-30px,-140px) scale(.95);opacity:.55}67%{transform:translate(15px,-105px) scale(1.08);opacity:.10}80%{transform:translate(-22px,-160px) scale(1.02);opacity:.45}100%{transform:translate(10px,-185px) scale(.88);opacity:.08}}
              @keyframes fire-ember-b{0%{transform:translate(0px,0px) scale(1);opacity:.50}15%{transform:translate(-25px,-60px) scale(1.08);opacity:.18}30%{transform:translate(38px,-95px) scale(.92);opacity:.55}46%{transform:translate(-15px,-125px) scale(1.12);opacity:.12}60%{transform:translate(30px,-105px) scale(.97);opacity:.48}75%{transform:translate(-40px,-145px) scale(1.05);opacity:.08}88%{transform:translate(12px,-165px) scale(.93);opacity:.38}100%{transform:translate(-20px,-170px) scale(1.10);opacity:.05}}
              @keyframes fire-ember-c{0%{transform:translate(0px,0px) scale(1.05);opacity:.45}17%{transform:translate(22px,-75px) scale(.91);opacity:.25}33%{transform:translate(-32px,-115px) scale(1.09);opacity:.52}50%{transform:translate(18px,-135px) scale(.94);opacity:.10}64%{transform:translate(-28px,-110px) scale(1.13);opacity:.48}78%{transform:translate(35px,-155px) scale(.98);opacity:.08}90%{transform:translate(-12px,-145px) scale(1.06);opacity:.35}100%{transform:translate(8px,-175px) scale(.90);opacity:.05}}
              @keyframes fire-top-a{0%{transform:translate(-25px,0px) scale(1);opacity:.82}20%{transform:translate(40px,60px) scale(1.12);opacity:.45}42%{transform:translate(-15px,35px) scale(.93);opacity:.88}63%{transform:translate(30px,70px) scale(1.08);opacity:.38}82%{transform:translate(-35px,45px) scale(1.05);opacity:.75}100%{transform:translate(20px,80px) scale(.96);opacity:.55}}
              @keyframes fire-top-b{0%{transform:translate(10px,0px) scale(1.04);opacity:.75}28%{transform:translate(-45px,50px) scale(.94);opacity:.35}52%{transform:translate(25px,75px) scale(1.10);opacity:.80}74%{transform:translate(-20px,40px) scale(.98);opacity:.28}100%{transform:translate(35px,85px) scale(1.06);opacity:.65}}
              @keyframes fire-top-c{0%{transform:translate(-15px,0px) scale(1);opacity:.68}32%{transform:translate(35px,55px) scale(1.09);opacity:.32}58%{transform:translate(-30px,80px) scale(.92);opacity:.78}80%{transform:translate(20px,45px) scale(1.05);opacity:.25}100%{transform:translate(-40px,90px) scale(.97);opacity:.60}}
              @keyframes fire-top-d{0%{transform:translate(0px,0px) scale(1);opacity:.48}35%{transform:translate(30px,90px) scale(1.14);opacity:.15}65%{transform:translate(-20px,60px) scale(.90);opacity:.52}100%{transform:translate(15px,110px) scale(1.08);opacity:.12}}
            `}</style>
          </svg>
        </div>
      </div>

      {/* ══════════════════════════════════════
          PLUIE — Canvas 2D
      ══════════════════════════════════════ */}
      <div ref={rainRef} style={{
        display: 'none', position: 'fixed', inset: 0,
        zIndex: 9300, pointerEvents: 'none', opacity: 0,
      }}>
        <canvas ref={rainCanvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* ══════════════════════════════════════
          NEIGE — Canvas 2D
      ══════════════════════════════════════ */}
      <div ref={snowRef} style={{
        display: 'none', position: 'fixed', inset: 0,
        zIndex: 9200, pointerEvents: 'none', opacity: 0,
      }}>
        <canvas ref={snowCanvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* ══════════════════════════════════════
          SOUS-MARIN — feTurbulence + caustiques
      ══════════════════════════════════════ */}
      <div ref={uwRef} style={{
        display: 'none', position: 'fixed', inset: 0,
        zIndex: 9100, pointerEvents: 'none', opacity: 0, overflow: 'hidden',
      }}>
        {/* ── Calque 0 : filtre SVG feTurbulence appliqué sur le contenu ──
            Le filtre est déclaré ici (hors viewport, sans dimensions) puis
            référencé via backdropFilter ne fonctionnant pas pour SVG inline ;
            on l'applique en CSS filter sur un div transparent superposé. */}
        <svg
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="uw-water-filter" x="-20%" y="-20%" width="140%" height="140%"
              colorInterpolationFilters="sRGB">
              <feTurbulence
                id="uw-turbulence"
                type="fractalNoise"
                baseFrequency="0.013 0.035"
                numOctaves="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={uwCfg.dispScale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* Calque 1 : ondulation du contenu via filter CSS url() */}
        <div style={{
          position: 'absolute', inset: 0,
          filter: 'url(#uw-water-filter)',
          backdropFilter: uwCfg.filterStr,
          WebkitBackdropFilter: uwCfg.filterStr,
        }}/>

        {/* Calque 2 : voile coloré teinté */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: isDark
            ? `rgba(0,30,60,${uwCfg.overlayOp})`
            : `rgba(0,50,90,${uwCfg.overlayOp})`,
        }}/>

        {/* Calque 3 : caustiques SVG */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1100" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="uw-blur-a" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18"/></filter>
              <filter id="uw-blur-b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="10"/></filter>
              <filter id="uw-blur-c" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="25"/></filter>
            </defs>
            <polygon points="120,80 180,60 210,110 155,135 95,115"
              fill={`rgba(${uwCfg.causticColor},${uwCfg.causticOp})`} filter="url(#uw-blur-b)"
              style={{animation:'uw-caus-a 7.3s ease-in-out infinite alternate'}}/>
            <polygon points="340,150 410,120 445,185 395,215 320,190"
              fill={`rgba(${uwCfg.causticColor},${uwCfg.causticOp * 0.8})`} filter="url(#uw-blur-b)"
              style={{animation:'uw-caus-b 9.7s ease-in-out infinite alternate'}}/>
            <polygon points="50,300 110,275 135,335 80,360 30,330"
              fill={`rgba(${uwCfg.causticColor},${uwCfg.causticOp * 0.7})`} filter="url(#uw-blur-a)"
              style={{animation:'uw-caus-c 11.1s ease-in-out infinite alternate'}}/>
            <polygon points="480,220 540,195 565,265 510,285 455,250"
              fill={`rgba(${uwCfg.causticColor},${uwCfg.causticOp * 0.9})`} filter="url(#uw-blur-b)"
              style={{animation:'uw-caus-d 8.4s ease-in-out infinite alternate'}}/>
            <polygon points="200,400 260,370 295,440 240,470 185,435"
              fill={`rgba(${uwCfg.causticColor},${uwCfg.causticOp * 0.6})`} filter="url(#uw-blur-a)"
              style={{animation:'uw-caus-e 13.6s ease-in-out infinite alternate'}}/>
            <polygon points="420,500 470,475 500,545 445,560 400,520"
              fill={`rgba(${uwCfg.causticColor},${uwCfg.causticOp * 0.75})`} filter="url(#uw-blur-b)"
              style={{animation:'uw-caus-f 6.8s ease-in-out infinite alternate'}}/>
            <ellipse cx="180" cy="200" rx="140" ry="55"
              fill={`rgba(${uwCfg.causticColor},${(uwCfg.causticOp * 0.35).toFixed(3)})`} filter="url(#uw-blur-c)"
              style={{animation:'uw-wave-a 15.2s ease-in-out infinite alternate'}}/>
            <ellipse cx="420" cy="380" rx="160" ry="50"
              fill={`rgba(${uwCfg.causticColor},${(uwCfg.causticOp * 0.30).toFixed(3)})`} filter="url(#uw-blur-c)"
              style={{animation:'uw-wave-b 18.8s ease-in-out infinite alternate'}}/>
            <ellipse cx="290" cy="620" rx="180" ry="60"
              fill={`rgba(${uwCfg.causticColor},${(uwCfg.causticOp * 0.25).toFixed(3)})`} filter="url(#uw-blur-c)"
              style={{animation:'uw-wave-c 12.4s ease-in-out infinite alternate'}}/>
            <style>{`
              @keyframes uw-caus-a{0%{transform:translate(0,0) scale(1) rotate(0deg);opacity:.9}30%{transform:translate(18px,12px) scale(1.08) rotate(3deg);opacity:.6}65%{transform:translate(-8px,22px) scale(.94) rotate(-2deg);opacity:1}100%{transform:translate(25px,-8px) scale(1.12) rotate(5deg);opacity:.7}}
              @keyframes uw-caus-b{0%{transform:translate(0,0) scale(1) rotate(0deg);opacity:.7}22%{transform:translate(-20px,15px) scale(1.06) rotate(-4deg);opacity:1}58%{transform:translate(12px,28px) scale(.96) rotate(2deg);opacity:.5}100%{transform:translate(-15px,-18px) scale(1.10) rotate(-6deg);opacity:.85}}
              @keyframes uw-caus-c{0%{transform:translate(0,0) scale(1);opacity:.8}40%{transform:translate(22px,-10px) scale(1.12);opacity:.45}70%{transform:translate(-14px,18px) scale(.91);opacity:.9}100%{transform:translate(30px,8px) scale(1.08);opacity:.55}}
              @keyframes uw-caus-d{0%{transform:translate(0,0) scale(1) rotate(0deg);opacity:.85}28%{transform:translate(-16px,20px) scale(1.09) rotate(4deg);opacity:.50}62%{transform:translate(24px,-12px) scale(.93) rotate(-3deg);opacity:.92}100%{transform:translate(-22px,14px) scale(1.14) rotate(6deg);opacity:.65}}
              @keyframes uw-caus-e{0%{transform:translate(0,0) scale(1);opacity:.65}35%{transform:translate(15px,25px) scale(1.07);opacity:.90}68%{transform:translate(-18px,10px) scale(.95);opacity:.40}100%{transform:translate(20px,-15px) scale(1.11);opacity:.80}}
              @keyframes uw-caus-f{0%{transform:translate(0,0) scale(1) rotate(0deg);opacity:.75}20%{transform:translate(-24px,-8px) scale(1.10) rotate(-5deg);opacity:.40}55%{transform:translate(16px,22px) scale(.92) rotate(3deg);opacity:.88}100%{transform:translate(-10px,-20px) scale(1.06) rotate(-2deg);opacity:.60}}
              @keyframes uw-wave-a{0%{transform:translate(0,0) scaleX(1) scaleY(1);opacity:.7}33%{transform:translate(30px,-15px) scaleX(1.15) scaleY(.88);opacity:.35}66%{transform:translate(-20px,25px) scaleX(.90) scaleY(1.12);opacity:.65}100%{transform:translate(40px,10px) scaleX(1.20) scaleY(.82);opacity:.45}}
              @keyframes uw-wave-b{0%{transform:translate(0,0) scaleX(1) scaleY(1);opacity:.6}28%{transform:translate(-35px,20px) scaleX(.85) scaleY(1.18);opacity:.80}60%{transform:translate(25px,-18px) scaleX(1.22) scaleY(.80);opacity:.30}100%{transform:translate(-15px,30px) scaleX(.92) scaleY(1.14);opacity:.70}}
              @keyframes uw-wave-c{0%{transform:translate(0,0) scaleX(1) scaleY(1);opacity:.55}42%{transform:translate(28px,18px) scaleX(1.18) scaleY(.85);opacity:.80}78%{transform:translate(-22px,-12px) scaleX(.88) scaleY(1.16);opacity:.35}100%{transform:translate(35px,-20px) scaleX(1.12) scaleY(.90);opacity:.65}}
            `}</style>
          </svg>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SOLEIL — SVG + RAF premium
      ══════════════════════════════════════ */}
      <div ref={sunRef} style={{
        display: 'none', position: 'fixed', inset: 0,
        zIndex: 9000, pointerEvents: 'none', opacity: 0, overflow: 'hidden',
      }}>
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Filtres flou en cascade — du plus intense au plus léger */}
            <filter id="sun-blur-corona1" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="14"/>
            </filter>
            <filter id="sun-blur-corona2" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="28"/>
            </filter>
            <filter id="sun-blur-corona3" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="52"/>
            </filter>
            <filter id="sun-blur-corona4" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="90"/>
            </filter>
            <filter id="sun-blur-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="40"/>
            </filter>
            <filter id="sun-blur-disk" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5"/>
            </filter>
          </defs>

          {/* Diffusion atmosphérique extrême — couche la plus externe */}
          <circle id="sun-corona4" cx="0" cy="0" r="230" fill="rgba(255,200,80,0.02)" filter="url(#sun-blur-corona4)"/>
          {/* Grande auréole */}
          <circle id="sun-corona3" cx="0" cy="0" r="140" fill="rgba(255,200,80,0.05)" filter="url(#sun-blur-corona3)"/>
          {/* Anneau diffus */}
          <circle id="sun-corona2" cx="0" cy="0" r="85"  fill="rgba(255,200,80,0.10)" filter="url(#sun-blur-corona2)"/>
          {/* Halo immédiat */}
          <circle id="sun-corona1" cx="0" cy="0" r="52"  fill="rgba(255,200,80,0.22)" filter="url(#sun-blur-corona1)"/>
          {/* Glow horizontal bas (horizon) */}
          <ellipse id="sun-glow" cx="0" cy="0" rx="110" ry="30" fill="rgba(255,160,40,0.08)" filter="url(#sun-blur-glow)"/>
          {/* Rayons — 12 lignes fines */}
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} className="sun-ray" x1="0" y1="0" x2="0" y2="0"
              strokeLinecap="round" stroke="rgba(255,220,120,0.15)" strokeWidth="1"/>
          ))}
          {/* Disque central — légèrement flou pour éviter le bord dur */}
          <circle id="sun-disk" cx="0" cy="0" r="30" fill="rgba(255,240,180,0.95)" filter="url(#sun-blur-disk)"/>
        </svg>
      </div>
    </>
  )
}

export default VfxOverlay
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  MOINS_EFFETS_KEY, MOINS_EFFETS_CLASS,
  loadMoinsEffets, saveMoinsEffets, applyMoinsEffets, isMoinsEffets,
} from './moinsEffets.js'

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8')

function fauxRoot() {
  const set = new Set()
  return { classList: {
    toggle: (c, on) => { if (on) set.add(c); else set.delete(c) },
    contains: (c) => set.has(c),
  }, set }
}

describe('Moins d’effets : mémoire et classe', () => {
  let store
  beforeEach(() => {
    store = {}
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v) },
    }
  })
  afterEach(() => { delete globalThis.localStorage })

  it('éteint par défaut (rien d’enregistré)', () => {
    expect(loadMoinsEffets()).toBe(false)
  })

  it('se souvient du choix du lecteur', () => {
    saveMoinsEffets(true)
    expect(store[MOINS_EFFETS_KEY]).toBe('true')
    expect(loadMoinsEffets()).toBe(true)
    saveMoinsEffets(false)
    expect(loadMoinsEffets()).toBe(false)
  })

  it('stockage indisponible : éteint, sans planter', () => {
    globalThis.localStorage = { getItem: () => { throw new Error('bloqué') }, setItem: () => { throw new Error('bloqué') } }
    expect(loadMoinsEffets()).toBe(false)
    expect(() => saveMoinsEffets(true)).not.toThrow()
  })

  it('pose et retire la classe sur <html>', () => {
    const root = fauxRoot()
    applyMoinsEffets(true, root)
    expect(root.set.has(MOINS_EFFETS_CLASS)).toBe(true)
    expect(isMoinsEffets(root)).toBe(true)
    applyMoinsEffets(false, root)
    expect(root.set.has(MOINS_EFFETS_CLASS)).toBe(false)
    expect(isMoinsEffets(root)).toBe(false)
  })

  it('le nom de la classe est celui des styles', () => {
    expect(MOINS_EFFETS_CLASS).toBe('ili-moins-effets')
  })
})

describe('Moins d’effets : ce que retirent les styles (vfx.css)', () => {
  const css = lire('../styles/vfx.css')
  const bloc = css.slice(css.indexOf("« MOINS D'EFFETS »"))
  const regle = (sel) => {
    const i = bloc.indexOf(sel)
    return i === -1 ? '' : bloc.slice(i, bloc.indexOf('}', i) + 1)
  }

  it('secousses, tremblements, scintillement, parasites et fonctions agitées : animation retirée', () => {
    for (const cls of ['vfx-shake-normal', 'vfx-shake-normal-loop', 'vfx-shake-intense', 'vfx-shake-intense-loop',
      'vfx-tremble-slow', 'vfx-tremble-medium', 'vfx-tremble-fast', 'vfx-flicker', 'vfx-static', 'ili-fx-agite']) {
      expect(bloc).toContain(`html.ili-moins-effets .${cls},`.replace(/,$/, '') )
    }
    expect(regle('html.ili-moins-effets .ili-fx-agite')).toContain('animation: none !important;')
  })

  it('chaque classe de secousse existe vraiment dans vfx.css (pas de faute de nom)', () => {
    const avant = css.slice(0, css.indexOf("« MOINS D'EFFETS »"))
    for (const cls of ['vfx-shake-normal', 'vfx-shake-normal-loop', 'vfx-shake-intense', 'vfx-shake-intense-loop',
      'vfx-tremble-slow', 'vfx-tremble-medium', 'vfx-tremble-fast', 'vfx-flicker', 'vfx-static',
      'vfx-glitch-weak', 'vfx-glitch-normal', 'vfx-glitch-intense', 'vfx-flash-overlay']) {
      expect(avant).toMatch(new RegExp(`\\.${cls}[\\s{,:]`))
    }
  })

  it('glitch : les doubles colorés disparaissent', () => {
    const r = regle('html.ili-moins-effets .vfx-glitch-intense::after')
    expect(r).toContain('animation: none !important;')
    expect(r).toContain('content: none !important;')
    for (const n of ['weak', 'normal', 'intense']) {
      expect(bloc).toContain(`html.ili-moins-effets .vfx-glitch-${n}::before`)
      expect(bloc).toContain(`html.ili-moins-effets .vfx-glitch-${n}::after`)
    }
  })

  it('flash plein écran : retiré', () => {
    const r = regle('html.ili-moins-effets .vfx-flash-overlay')
    expect(r).toContain('display: none !important;')
  })

  it('ambiances : atténuées, pas retirées ni figées', () => {
    const r = regle('html.ili-moins-effets .vfx-ambiance > *')
    expect(r).toContain('opacity: 0.35;')
    expect(r).not.toContain('animation')
    expect(r).not.toContain('display')
  })

  it('les apparitions du texte ne sont jamais touchées', () => {
    for (const garde of ['typewriter', 'tw-', 'erased', 'rupture', 'fondu', 'apparition', 'story-reader']) {
      expect(bloc).not.toContain(garde)
    }
  })
})

describe('Moins d’effets : branchements', () => {
  it('les 6 couches d’ambiance portent la classe vfx-ambiance', () => {
    const src = lire('../components/VfxOverlay.jsx')
    for (const r of ['fogRef', 'fireRef', 'rainRef', 'snowRef', 'uwRef', 'sunRef']) {
      expect(src).toContain(`<div ref={${r}} className="vfx-ambiance" style={{`)
    }
    expect(src.split('className="vfx-ambiance"').length - 1).toBe(6)
  })

  it('pulsation, tremblement et glitch du texte sont marqués « agités », pas les autres', () => {
    const src = lire('./inlineFunctions.jsx')
    const corps = (nom) => src.slice(src.indexOf(`function ${nom}(`), src.indexOf('\nfunction ', src.indexOf(`function ${nom}(`) + 1))
    for (const nom of ['PulseSpan', 'TrembleSpan', 'GlitchSpan']) {
      expect(corps(nom)).toContain('className="ili-fx-agite"')
    }
    expect(src.split('className="ili-fx-agite"').length - 1).toBe(3)
  })

  it('les parasites (JS) s’arrêtent quand « Moins d’effets » est allumé', () => {
    const src = lire('../components/StoryReader.jsx')
    expect(src).toContain("import { isMoinsEffets } from '../utils/moinsEffets.js'")
    expect(src).toContain("staticIntervalRef.current = setInterval(() => {\n      if (isMoinsEffets()) return")
  })

  it('les réglages : interrupteur, mémoire, et classe retirée en quittant', () => {
    const src = lire('../components/ReaderSettings.jsx')
    expect(src).toContain('const [moinsEffets, setMoinsEffets] = useState(loadMoinsEffets)')
    expect(src).toContain('    applyMoinsEffets(moinsEffets)\n    saveMoinsEffets(moinsEffets)\n    return () => applyMoinsEffets(false)\n  }, [moinsEffets])')
    // son « active / désactive » à la place du clic (accord de Pierre, 22/11/2026)
    expect(src).toContain('onClick={() => { playToggle(!moinsEffets); setMoinsEffets(v => !v) }}')
    expect(src).toContain('aria-checked={moinsEffets}')
    // juste sous la rangée DYS, dans la section police (place prévue par le futur menu)
    const dys = src.indexOf('className="rs-dys-row"')
    const interrupteur = src.indexOf('Moins d’effets\n')
    const progression = src.indexOf('{/* Barre de progression */}')
    expect(dys).toBeGreaterThan(-1)
    expect(interrupteur).toBeGreaterThan(dys)
    expect(interrupteur).toBeLessThan(progression)
  })

  it('le réglage du téléphone n’est pas suivi (décision de Pierre)', () => {
    expect(lire('./moinsEffets.js')).not.toMatch(/matchMedia\(|prefers-reduced-motion:/)
    expect(lire('../components/ReaderSettings.jsx')).not.toContain('prefers-reduced-motion')
  })
})

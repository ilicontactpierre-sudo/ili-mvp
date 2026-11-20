// Tutoriel, écran « réglages » (étape 3 du chantier menu, 20/11/2026, maquette v4 validée).
// La page ne se rend pas hors navigateur : ces tests lisent le code source ; les touchers
// se testent sur le Pixel.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('./TutorialPage.jsx', import.meta.url), 'utf8')
const menu = readFileSync(new URL('../components/ReaderSettings.jsx', import.meta.url), 'utf8')
const ecran = src.slice(src.indexOf('const SETTINGS_STEPS = ['), src.indexOf('// ÉCRAN 4'))

describe('tutoriel, écran réglages', () => {
  it('un élément par étape, dans l’ordre du menu, avec les phrases de Pierre', () => {
    const cles = [...ecran.matchAll(/\{ key: '(\w+)',\s+text: /g)].map(m => m[1])
    expect(cles).toEqual(['theme', 'taille', 'polices', 'doux', 'prog', 'plein', 'aller'])
    for (const morceau of [
      'Pour ton confort,\\ntu peux utiliser deux modes\\u00a0:\\nsombre ou clair.',
      'Ici, tu peux changer\\nla taille des lettres.',
      'pour les personnes dys.\\nMais pas que\\u00a0!',
      'Trop secoué\\u00a0?\\nAvec ce mode,\\ntu calmes les effets.',
      'Le plein écran,\\ntout simplement.',
      'Si tu as envie de relire un passage,\\nva au chapitre de ton choix.',
    ]) expect(ecran, morceau).toContain(morceau)
  })

  it('chaque élément présenté a son repère dans le menu', () => {
    const cles = [...ecran.matchAll(/\{ key: '(\w+)',\s+text: /g)].map(m => m[1])
    for (const c of cles) expect(menu).toContain(`        ${c}: `)
  })

  it('toucher l’élément l’essaie ; ailleurs : suivant ; zone de gauche du lecteur : précédent', () => {
    expect(src).toContain("import { isBackTap } from '../utils/tapZone.js'")
    expect(ecran).toContain("if (e.target.closest('.rs-menu')) return")
    expect(ecran).toContain('go(isBackTap(e.clientX, window.innerWidth) ? -1 : 1)')
    expect(ecran).toContain('e.stopPropagation()')
  })

  it('avant le premier élément : écran précédent ; après le dernier : écran suivant', () => {
    expect(ecran).toContain('if (next < 0) { onPrev?.(); return }')
    expect(ecran).toContain('if (next >= steps.length) { onNext?.(); return }')
    expect(src).toContain("{screen === 'settings'   && <ScreenSettings onPrev={goPrev} onNext={goNextFromSettings} />}")
  })

  it('le voile couvre aussi le reste du menu, avec un vrai trou sur l’élément', () => {
    expect(ecran).toContain('zIndex: 8000,')
    expect(ecran).toContain("clipPath: `path(evenodd, 'M0,0 H${w} V${h} H0 Z${hole}')`,")
    expect(menu).toContain('z-index: 7999;') // menu sous le voile
  })

  it('pas de plein écran sur iPhone : même règle que le menu', () => {
    expect(ecran).toContain("!/iPad|iPhone|iPod/.test(navigator.userAgent) && document.fullscreenEnabled")
    expect(menu).toContain('const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)')
    expect(menu).toContain('{!isIOSDevice && document.fullscreenEnabled && (')
  })

  it('Immersion s’ouvre pour la barre et le plein écran ; Aller à s’essaie sur de faux chapitres', () => {
    expect(ecran).toContain("const defaultFold = (key) => (key === 'prog' || key === 'plein' ? 'immersion' : null)")
    expect(ecran).toContain('tutorialFold={fold}')
    expect(ecran).toContain('demoChapters={DEMO_CHAPTERS}')
  })

  it('effets sur le texte seulement quand ils parlent de lui', () => {
    expect(ecran).toContain("fontSize: key === 'taille' ? 'calc(var(--font-size-focus) * 0.72)'")
    expect(ecran).toContain("fontFamily: key === 'polices' && reading.dys2 ? \"'Lexend', sans-serif\"")
    expect(ecran).toContain("{key === 'polices' ? policesLine(line, reading) : line}")
    // mêmes fonctions et même ordre que le texte des histoires (renderMarkdown)
    expect(ecran).toContain('  if (r.emoji) return applyEmojiMode(line)\n  if (r.dys1) return applyBionicReading(line)')
    // le tremblement est coupé par « Moins d’effets » (classe de vfx.css)
    expect(ecran).toContain("className={key === 'doux' ? 'ili-fx-agite' : undefined}")
    expect(ecran).toContain("{key === 'prog' && reading.showProgress && (")
  })
})

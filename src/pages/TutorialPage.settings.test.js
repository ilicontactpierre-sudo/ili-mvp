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
    // la taille choisie reste pour toutes les explications (demande de Pierre, 21/11/2026)
    expect(ecran).toContain("    fontSize: 'calc(var(--font-size-focus) * 0.72)',\n")
    expect(ecran).not.toContain("key === 'taille' ?")
    expect(ecran).toContain("fontFamily: key === 'polices' && reading.dys2 ? \"'Lexend', sans-serif\"")
    expect(ecran).toContain("{key === 'polices' ? policesLine(line, reading) : line}")
    // mêmes fonctions et même ordre que le texte des histoires (renderMarkdown)
    expect(ecran).toContain('  if (r.emoji) return applyEmojiMode(line)\n  if (r.dys1) return applyBionicReading(line)')
    // le tremblement est coupé par « Moins d’effets » (classe de vfx.css)
    expect(ecran).toContain("className={key === 'doux' ? 'ili-fx-agite' : undefined}")
    expect(ecran).toContain("{key === 'prog' && reading.showProgress && <ProgressDemo />}")
  })
})

// Étape 4 (21/11/2026) : écran « progression » retiré, flash B, sortie de l'écran « écoute »
describe('tutoriel, finitions', () => {
  it('l’écran « progression » est retiré ; sa barre pas à pas sert aux réglages', () => {
    expect(src).toContain("const SCREENS = ['navigation', 'headphones', 'settings', 'outro']")
    expect(src).toContain('const MIN_DELAY = { navigation: 0, headphones: 4500, settings: 99999, outro: 1800 }')
    expect(src).not.toContain('ScreenProgress')
    expect(src).not.toContain("'progress'")
    const demo = src.slice(src.indexOf('function ProgressDemo'), src.indexOf('// ÉCRAN 5'))
    for (const pas of ['{ val: 20,  delay: 300  }', '{ val: 45,  delay: 900  }', '{ val: 65,  delay: 1600 }', '{ val: 82,  delay: 2400 }']) expect(demo).toContain(pas)
    expect(demo).toContain('transition: `height 700ms ${EASE.inOut}`,')
    expect(demo.split('zIndex: 8001,').length - 1).toBe(2) // barre et flèche au-dessus du voile
    expect(src).not.toContain('tut-barre') // plus de barre en boucle
  })

  it('écran navigation : flash B (voile léger de la couleur du texte), visible dans les deux thèmes', () => {
    const ecran1 = src.slice(src.indexOf('function ScreenNavigation'), src.indexOf('// ÉCRAN 2'))
    expect(ecran1.split("'color-mix(in srgb, var(--color-text-focus) 13%, transparent)'").length - 1).toBe(2)
    expect(ecran1).not.toContain('20,20,22')
    expect(ecran1).not.toContain("'#fff'")
  })

  it('écran « écoute » : le fondu finit avant le changement d’écran, puis un whoosh enchaîne', () => {
    const casque = src.slice(src.indexOf('function ScreenHeadphones'), src.indexOf('// ÉCRAN 3'))
    expect(casque).toContain('const duration = 900')
    const sortie = src.slice(src.indexOf("if (screen === 'headphones' && headphonesFadeRef.current)"), src.indexOf('} else {', src.indexOf("if (screen === 'headphones' && headphonesFadeRef.current)")))
    expect(sortie).toContain('setTimeout(() => WHOOSH.play(), 600)')
    expect(sortie).toContain('}, 1000)')
    expect(src).toContain("const WHOOSH = createUiSound('/sounds/Whoosh-3.mp3', 0.15)")
    expect(src).toContain('useEffect(() => { WHOOSH.prepare() }, [])')
  })
})

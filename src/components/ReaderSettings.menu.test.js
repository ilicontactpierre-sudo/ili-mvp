// Menu des réglages réorganisé (étape 1, 20/11/2026, maquette validée par Pierre) :
// tests « gardes » qui lisent le code source. Les clics se testent sur le Pixel.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('./ReaderSettings.jsx', import.meta.url), 'utf8')
const menu = src.slice(src.indexOf('{/* ── Menu ── */}'))

describe('menu des réglages : ordre et noms des blocs', () => {
  it('Affichage, Taille, Polices adaptées, Moins d’effets, Immersion, Aller à, Quitter', () => {
    const reperes = [
      '<span className="rs-label">Affichage</span>',
      '<span className="rs-label">Taille</span>',
      '<span className="rs-sublabel">Polices adaptées</span>',
      '                Moins d’effets\n',
      '<span>Immersion</span>',
      '<span className="rs-switch-label">Barre de progression</span>',
      '<span className="rs-switch-label">Plein écran</span>',
      '<span>Aller à</span>',
      "<span>Quitter l'histoire</span>",
    ]
    let avant = -1
    for (const r of reperes) {
      const i = menu.indexOf(r)
      expect(i, r).toBeGreaterThan(avant)
      expect(menu.indexOf(r, i + 1), `${r} en double`).toBe(-1)
      avant = i
    }
  })

  it('les anciens noms ont disparu', () => {
    expect(menu).not.toContain('<span className="rs-label">Thème</span>')
    expect(menu).not.toContain('<span className="rs-label">Police</span>')
    expect(menu).not.toContain('<span>Navigation</span>')
    expect(menu).not.toContain('IconList')
  })

  it('chaque bouton de police garde son action', () => {
    const bloc = (texte) => menu.slice(menu.lastIndexOf('<button', menu.indexOf(texte)), menu.indexOf(texte))
    expect(bloc('                DYS 1\n')).toContain('onClick={() => { playClicSettings(); setDys1(v => !v) }}')
    expect(bloc('                DYS 2\n')).toContain('onClick={() => { playClicSettings(); setDys2(v => !v) }}')
    expect(bloc('<IconSmiley />')).toContain('onClick={() => { playClicSettings(); setEmojiMode(v => !v) }}')
    expect(bloc('                −\n')).toContain('onClick={() => setFontSizeIndex(i => Math.max(0, i - 1))}')
    expect(bloc('                +\n')).toContain('onClick={() => setFontSizeIndex(i => Math.min(FONT_SIZES.length - 1, i + 1))}')
  })

  it('le bouton emoji est le visage dessiné, nommé pour les lecteurs d’écran', () => {
    expect(menu).not.toContain('😊')
    expect(menu).toContain('aria-label="Mode emoji"')
    expect(menu).toContain('<IconSmiley />')
    expect(menu).toContain('onClick={() => { playClicSettings(); setEmojiMode(v => !v) }}')
  })

  it('les trois interrupteurs passent par la même pièce, avec leur action d’avant', () => {
    expect(src).toContain("import ReaderSwitch from './ReaderSwitch.jsx'")
    expect(menu.split('<ReaderSwitch').length - 1).toBe(3)
    expect(menu).not.toContain("width: '36px'")
    expect(menu).toContain('aria-checked={moinsEffets}')
    expect(menu).toContain('aria-checked={showProgress}')
    expect(menu).toContain('aria-checked={isFullscreen}')
    expect(menu).toContain('onClick={() => { playClicSettings(); setShowProgress(v => !v) }}')
    expect(menu).toContain('onClick={() => { playClicSettings(); toggleFullscreen() }}')
    expect(menu).toContain('{!isIOSDevice && document.fullscreenEnabled && (')
  })

  it('les deux thèmes cachés restent (2e toucher sur la lune ou le soleil)', () => {
    expect(menu).toContain('// 2e clic lune → mode 80')
    expect(menu).toContain('setIsSynthwave(true); setIsToutdoux(false); setIsDark(true)')
    expect(menu).toContain('// 2e clic soleil → mode Miyazaki')
    expect(menu).toContain('setIsToutdoux(true); setIsSynthwave(false); setIsDark(false)')
  })

  it('le tutoriel retrouve ses blocs : un repère par élément, mesuré et envoyé', () => {
    const noms = { theme: 'themeSectionRef', taille: 'tailleSectionRef', polices: 'policesSectionRef', doux: 'douxSectionRef', prog: 'progressSectionRef', plein: 'fullscreenSectionRef', aller: 'allerSectionRef' }
    for (const [cle, r] of Object.entries(noms)) {
      expect(menu.split(`ref={${r}}`).length - 1, r).toBe(1)
      expect(src).toContain(`${cle}: ${r}.current?.getBoundingClientRect() ?? null,`)
    }
    expect(src).not.toContain('fontSectionRef')
  })

  it('Aller à : dans une histoire avec chapitres, ou dans le tutoriel (faux chapitres) ; Quitter : dans une histoire', () => {
    expect(menu).toContain('{((storyId && navItems.length > 0) || demoChapters) && (')
    expect(menu).toContain('onClick={() => (demoChapters ? playWhoosh() : handleJump(item.index))}')
    expect(menu).toContain('{storyId && (\n            <div className="rs-section">\n              <button className="rs-quit-btn" onClick={handleQuit}>')
  })
})

// Étape 2 (20/11/2026) : dépliants Immersion et Aller à
describe('menu des réglages : dépliants', () => {
  it('un seul dépliant ouvert à la fois, par une seule mémoire', () => {
    expect(src).toContain('const [openFold, setOpenFold] = useState(null)')
    expect(src).toContain("const showChapters = currentFold === 'aller'")
    expect(src).toContain("const showImmersion = currentFold === 'immersion'")
    expect(src).toContain('else setOpenFold(f => (f === name ? null : name))')
    expect(menu).toContain("onClick={() => toggleFold('immersion')}")
    expect(menu).toContain("onClick={() => toggleFold('aller')}")
    expect(src).not.toContain('setShowChapters')
  })

  it('tous les dépliants refermés à l’ouverture et à la fermeture du menu, et après un saut', () => {
    expect(src.split('setOpenFold(null)').length - 1).toBe(4)
    const engrenage = src.slice(src.indexOf('ref={gearRef}'), src.indexOf('<IconGear />'))
    expect(engrenage.split('setOpenFold(null)').length - 1).toBe(2)
    const saut = src.slice(src.indexOf('const handleJump'), src.indexOf('const handleQuit'))
    expect(saut).toContain('setOpenFold(null)')
    const dehors = src.slice(src.indexOf('// ── Fermer si clic en dehors'), src.indexOf('// ── Navigation chapitres'))
    expect(dehors).toContain('setOpenFold(null)')
  })

  it('Immersion : en-tête qui déplie Barre de progression et Plein écran', () => {
    const debut = menu.indexOf("onClick={() => toggleFold('immersion')}")
    const fin = menu.indexOf("{/* Aller à (chapitres)")
    const bloc = menu.slice(debut, fin)
    expect(bloc).toContain('aria-expanded={showImmersion}')
    expect(bloc).toContain("{showImmersion ? '▲' : '▼'}")
    expect(bloc.indexOf('{showImmersion && (')).toBeLessThan(bloc.indexOf('ref={progressSectionRef}'))
    expect(bloc.indexOf('{showImmersion && (')).toBeLessThan(bloc.indexOf('ref={fullscreenSectionRef}'))
  })

  it('tutoriel : c’est lui qui ouvre les dépliants, et les blocs sont remesurés après l’animation', () => {
    expect(src).toContain('const currentFold = forceOpen ? tutorialFold : openFold')
    expect(src).toContain('if (forceOpen) onTutorialFold?.(name)')
    expect(menu).toContain('<div className="rs-fold">')
    expect(src).toContain('const apresDepliant = setTimeout(measure, 300)')
    expect(src).toContain('  }, [forceOpen, onSectionRects, isOpen, currentFold])')
  })

  it('le menu ne dépasse jamais du bas de l’écran : il défile', () => {
    const bloc = src.slice(src.indexOf('.rs-menu {'), src.indexOf('.rs-section {'))
    expect(bloc).toContain("max-height: calc(100dvh - ${safeInset('top', '58px')} - ${safeInset('bottom', '12px')});")
    expect(bloc).toContain('overflow-y: auto;')
    expect(bloc).not.toContain('overflow: hidden;')
  })
})

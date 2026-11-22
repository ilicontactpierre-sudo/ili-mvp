// Sons de l'interface (22/11/2026, demande de Pierre) : clic sur chaque bouton du menu et
// chaque action du tutoriel ; sons « active / désactive » pour les boutons à deux états.
// Tests « gardes » (lecture du code) : l'écoute se fait sur le Pixel.
import { describe, it, expect } from 'vitest'
import { readFileSync, statSync } from 'node:fs'

const lire = (c) => readFileSync(new URL(c, import.meta.url), 'utf8')
const menu = lire('./ReaderSettings.jsx')
const tuto = lire('../pages/TutorialPage.jsx')

describe('sons active / désactive', () => {
  it('les fichiers de Pierre sont là (8 416 octets chacun)', () => {
    for (const f of ['Active.mp3', 'Desactive.mp3']) {
      expect(statSync(new URL(`../../public/sounds/${f}`, import.meta.url)).size).toBe(8416)
    }
  })
  it('par Howler, aux volumes qui sonnent comme le clic', () => {
    expect(menu).toContain("const SON_ACTIVE = createUiSound('/sounds/Active.mp3', 0.15)")
    expect(menu).toContain("const SON_DESACTIVE = createUiSound('/sounds/Desactive.mp3', 0.09)")
    expect(menu).toContain('  (on ? SON_ACTIVE : SON_DESACTIVE).play()')
    expect(menu).toContain('useEffect(() => { SON_ACTIVE.prepare(); SON_DESACTIVE.prepare() }, [])')
    expect(menu).not.toContain('new Audio(')
  })
  it('chaque bouton à deux états joue le son de son état d’arrivée', () => {
    for (const [etat, action] of [
      ['dys1', 'setDys1(v => !v)'], ['dys2', 'setDys2(v => !v)'], ['emojiMode', 'setEmojiMode(v => !v)'],
      ['moinsEffets', 'setMoinsEffets(v => !v)'], ['showProgress', 'setShowProgress(v => !v)'], ['isFullscreen', 'toggleFullscreen()'],
    ]) expect(menu, etat).toContain(`onClick={() => { playToggle(!${etat}); ${action} }}`)
    // plus de clic sur ces boutons (un seul son par toucher)
    expect(menu).not.toMatch(/playClicSettings\(\); (setDys1|setDys2|setEmojiMode|setMoinsEffets|setShowProgress|toggleFullscreen)/)
  })
})

describe('clic sur les autres boutons du menu', () => {
  it('lune, soleil, − et +, en-têtes Immersion et Aller à', () => {
    expect(menu).toContain("                onClick={() => {\n                  playClicSettings()\n                  if (isSynthwave) {")
    expect(menu).toContain("                onClick={() => {\n                  playClicSettings()\n                  if (isToutdoux) {")
    expect(menu).toContain('onClick={() => { playClicSettings(); setFontSizeIndex(i => Math.max(0, i - 1)) }}')
    expect(menu).toContain('onClick={() => { playClicSettings(); setFontSizeIndex(i => Math.min(FONT_SIZES.length - 1, i + 1)) }}')
    expect(menu).toContain('  const toggleFold = (name) => {\n    playClicSettings()\n')
  })
})

describe('clic sur chaque action du tutoriel, une seule fois', () => {
  const corps = (debut, fin) => tuto.slice(tuto.indexOf(debut), tuto.indexOf(fin, tuto.indexOf(debut)))
  it('écran navigation, bouton Réécouter, croix', () => {
    expect(tuto).toContain("import { playClicSettings } from '../App.jsx'")
    expect(corps('  const handleTap = (side) => {', 'setFlashSide(side)')).toContain('playClicSettings()')
    expect(corps('  const replay = (e) => {', 'audio.volume = 0.85')).toContain('playClicSettings()')
    expect(tuto).toContain("const handleExit = () => { playClicSettings(); navigate('/') }")
  })
  it('passages d’écran : après le contrôle, jamais pour un toucher ignoré', () => {
    expect(tuto).toContain('    if (!canAdvance || transitioning) return\n    playClicSettings()\n')
    expect(tuto).toContain('    if (screenIndex === 0) return // première page : on ignore\n    playClicSettings()\n')
    expect(corps('const goNextFromSettings', 'setTransitioning(true)')).toContain('    if (transitioning) return\n    playClicSettings()\n')
  })
  it('écran réglages : clic à chaque élément ; la sortie d’écran a le sien (pas de double clic)', () => {
    expect(tuto).toContain("    if (next >= steps.length) { onNext?.(); return }\n    playClicSettings() // les sorties d'écran ont leur clic dans la page\n    setStepIndex(next)")
    expect(tuto).toContain('    if (next < 0) { onPrev?.(); return }\n')
  })
})

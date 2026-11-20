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
      '<span className="rs-label">Immersion</span>',
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

  it('le tutoriel retrouve ses blocs (repères branchés)', () => {
    for (const r of ['themeSectionRef', 'fontSectionRef', 'progressSectionRef', 'fullscreenSectionRef']) {
      expect(menu).toContain(`ref={${r}}`)
    }
  })

  it('Aller à et Quitter restent réservés à une histoire', () => {
    expect(menu).toContain('{storyId && navItems.length > 0 && (')
    expect(menu).toContain('{storyId && (\n            <div className="rs-section">\n              <button className="rs-quit-btn" onClick={handleQuit}>')
  })
})

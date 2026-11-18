import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { safeInset } from './safeArea.js'

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8')

describe('safeInset', () => {
  it('ajoute la marge du téléphone au décalage voulu (0 sans encoche)', () => {
    expect(safeInset('top', '8px')).toBe('calc(8px + env(safe-area-inset-top, 0px))')
    expect(safeInset('right', '12px')).toBe('calc(12px + env(safe-area-inset-right, 0px))')
    expect(safeInset('bottom', '2rem')).toBe('calc(2rem + env(safe-area-inset-bottom, 0px))')
    expect(safeInset('left', '1.5rem')).toBe('calc(1.5rem + env(safe-area-inset-left, 0px))')
  })

  it('refuse un côté inconnu (une faute de frappe donnerait une marge muette)', () => {
    expect(() => safeInset('haut', '8px')).toThrow()
    expect(() => safeInset('Top', '8px')).toThrow()
  })
})

describe('éléments collés au haut de l’écran : marge de sécurité branchée', () => {
  it('réglages : engrenage et menu, mêmes décalages qu’avant', () => {
    const src = lire('../components/ReaderSettings.jsx')
    expect(src).toContain("import { safeInset } from '../utils/safeArea.js'")
    const gear = src.slice(src.indexOf('.rs-gear-btn {'), src.indexOf('.rs-gear-btn {') + 160)
    expect(gear).toContain("top: ${safeInset('top', '8px')};")
    expect(gear).toContain("right: ${safeInset('right', '8px')};")
    const menu = src.slice(src.indexOf('.rs-menu {'), src.indexOf('.rs-menu {') + 160)
    expect(menu).toContain("top: ${safeInset('top', '58px')};")
    expect(menu).toContain("right: ${safeInset('right', '12px')};")
  })

  it('accueil : icône du tutoriel', () => {
    const src = lire('../components/StoryMenu.jsx')
    expect(src).toContain("top: safeInset('top', '4px'),\n          left: safeInset('left', '4px'),")
  })

  it('tutoriel : croix « Quitter » et points de progression', () => {
    const src = lire('../pages/TutorialPage.jsx')
    const croix = src.slice(src.indexOf('aria-label="Quitter le tutoriel"'), src.indexOf('aria-label="Quitter le tutoriel"') + 200)
    expect(croix).toContain("top: safeInset('top', '1.5rem'),")
    expect(croix).toContain("left: safeInset('left', '1.5rem'),")
    expect(src).toContain("top: safeInset('top', '1.8rem'),")
  })

  it('modes de jeu : croix', () => {
    const src = lire('../components/GameOverlay.jsx')
    expect(src).toContain("position: 'fixed', top: safeInset('top', '1.5rem'), left: safeInset('left', '1.5rem'), zIndex: 9999,")
  })

  it('aucun de ces éléments n’a gardé un décalage en dur', () => {
    expect(lire('../components/ReaderSettings.jsx')).not.toMatch(/position: fixed;\s*top: \d+px;/)
    expect(lire('../components/StoryMenu.jsx')).not.toContain("top: '4px',")
    expect(lire('../pages/TutorialPage.jsx')).not.toMatch(/top: '1\.[58]rem'/)
    expect(lire('../components/GameOverlay.jsx')).not.toContain("top: '1.5rem', left: '1.5rem'")
  })
})

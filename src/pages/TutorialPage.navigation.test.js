// Gardes de l'écran 1 du tutoriel (navigation). La page ne se rend pas hors navigateur
// (sons créés au chargement de App.jsx) : ces tests lisent le code source.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('./TutorialPage.jsx', import.meta.url), 'utf8')
const ecran1 = src.slice(src.indexOf('function ScreenNavigation'), src.indexOf('// ÉCRAN 2'))

describe('tutoriel, écran navigation', () => {
  it('prend la largeur de la zone « retour » du lecteur (tapZone.js)', () => {
    expect(src).toContain("import { BACK_ZONE_RATIO } from '../utils/tapZone.js'")
    expect(ecran1).toContain('flex: `0 0 ${BACK_ZONE_RATIO * 100}%`,')
  })

  it('place les deux traits verticaux à la frontière des zones', () => {
    expect(ecran1.split('left: `${BACK_ZONE_RATIO * 100}%`,').length - 1).toBe(2)
    expect(ecran1).not.toContain("left: '50%'")
  })

  it('montre des flèches, plus les mots anglais', () => {
    expect(ecran1).toContain('<NavArrow direction="left" />')
    expect(ecran1).toContain('<NavArrow direction="right" />')
    expect(ecran1).not.toMatch(/>\s*(Previous|Next)\s*</)
  })

  it('donne un nom à chaque zone pour les lecteurs d’écran', () => {
    expect(ecran1).toContain('aria-label="Précédent"')
    expect(ecran1).toContain('aria-label="Suivant"')
  })

  it('la flèche gauche pointe à gauche, la droite à droite', () => {
    const fleche = src.slice(src.indexOf('function NavArrow'), src.indexOf('function ScreenNavigation'))
    expect(fleche).toContain("direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'")
    expect(fleche).toContain('stroke="currentColor"')
  })
})

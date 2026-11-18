import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { BACK_ZONE_RATIO, isBackTap } from './tapZone.js'

describe('zone « retour » du lecteur', () => {
  it('fait 25 % de la largeur', () => {
    expect(BACK_ZONE_RATIO).toBe(0.25)
  })

  it('revient en arrière tout à gauche et juste avant 25 %', () => {
    expect(isBackTap(0, 400)).toBe(true)
    expect(isBackTap(99, 400)).toBe(true)
    expect(isBackTap(99.9, 400)).toBe(true)
  })

  it('avance pile à 25 % et au-delà', () => {
    expect(isBackTap(100, 400)).toBe(false)
    expect(isBackTap(101, 400)).toBe(false)
  })

  it("avance dans l'ancienne zone (25 à 40 %)", () => {
    expect(isBackTap(120, 400)).toBe(false)
    expect(isBackTap(159, 400)).toBe(false)
  })

  it('avance à droite', () => {
    expect(isBackTap(300, 400)).toBe(false)
    expect(isBackTap(400, 400)).toBe(false)
  })

  it('ne revient jamais en arrière si la largeur est inconnue', () => {
    expect(isBackTap(0, 0)).toBe(false)
    expect(isBackTap(10, undefined)).toBe(false)
  })

  it('StoryPage passe par isBackTap (plus de seuil écrit en dur)', () => {
    const src = readFileSync(new URL('../pages/StoryPage.jsx', import.meta.url), 'utf8')
    expect(src).toContain("import { isBackTap } from '../utils/tapZone.js'")
    expect(src).toContain('if (isBackTap(event.clientX, window.innerWidth)) { goToPrevious(); return }')
    expect(src).not.toMatch(/x \/ width < 0\.\d+/)
  })
})

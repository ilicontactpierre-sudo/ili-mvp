import { describe, it, expect } from 'vitest'
import { hasOrchestrationFiche, computeFichePlacement, webSearchUrl, FICHE_WIDTH } from './ficheCard.js'

describe('hasOrchestrationFiche', () => {
  it('vrai dès qu\'un des quatre champs est renseigné', () => {
    expect(hasOrchestrationFiche({ _orchestrationBrief: 'Pluie fine' })).toBe(true)
    expect(hasOrchestrationFiche({ _orchestrationSearch: ['rain'] })).toBe(true)
    expect(hasOrchestrationFiche({ _orchestrationAlt: 'Autre' })).toBe(true)
    expect(hasOrchestrationFiche({ _orchestrationReprise: 'Retour au lieu A' })).toBe(true)
  })
  it('faux pour un ancien bloc, des champs vides ou un bloc absent', () => {
    expect(hasOrchestrationFiche({ _orchestrationNote: 'note seule', _orchestrationKeyword: 'rain' })).toBe(false)
    expect(hasOrchestrationFiche({ _orchestrationBrief: '  ', _orchestrationSearch: [], _orchestrationAlt: null })).toBe(false)
    expect(hasOrchestrationFiche({ _orchestrationSearch: ['', '  '] })).toBe(false)
    expect(hasOrchestrationFiche(null)).toBe(false)
    expect(hasOrchestrationFiche(undefined)).toBe(false)
  })
})

describe('computeFichePlacement', () => {
  it('écran large : la carte se place à gauche du panneau, largeur 300', () => {
    const p = computeFichePlacement({ panelLeft: 570, panelTop: 192, viewportWidth: 1480, viewportHeight: 1000 })
    expect(p).toEqual({ mode: 'side', width: FICHE_WIDTH, right: 1480 - 570 + 12, top: 192, maxHeight: 1000 - 192 - 12 })
  })
  it('le haut de la carte suit le haut du panneau, sans jamais sortir de l\'écran', () => {
    expect(computeFichePlacement({ panelLeft: 570, panelTop: 4, viewportWidth: 1480, viewportHeight: 700 }).top).toBe(12)
    const low = computeFichePlacement({ panelLeft: 570, panelTop: 600, viewportWidth: 1480, viewportHeight: 700 })
    expect(low.top + low.maxHeight).toBeLessThanOrEqual(700 - 12)
    expect(low.maxHeight).toBeGreaterThanOrEqual(200)
  })
  it('écran très bas : la carte reste entièrement visible (jamais au-dessus du bord haut)', () => {
    const p = computeFichePlacement({ panelLeft: 570, panelTop: 40, viewportWidth: 1480, viewportHeight: 150 })
    expect(p.top).toBe(12)
    expect(p.maxHeight).toBeGreaterThan(0)
  })
  it('place juste suffisante : la carte se rétrécit au lieu de déborder', () => {
    const p = computeFichePlacement({ panelLeft: 300, panelTop: 100, viewportWidth: 940, viewportHeight: 800 })
    expect(p.mode).toBe('side')
    expect(p.width).toBe(300 - 12 - 12)
  })
  it('écran étroit : surimpression sur demande, jamais hors de l\'écran', () => {
    const p = computeFichePlacement({ panelLeft: 180, panelTop: 100, viewportWidth: 700, viewportHeight: 800 })
    expect(p.mode).toBe('overlay')
    expect(p.width).toBeLessThanOrEqual(700 - 24)
    expect(computeFichePlacement({ panelLeft: 20, panelTop: 100, viewportWidth: 360, viewportHeight: 800 }).width).toBeGreaterThanOrEqual(220)
  })
  it('valeurs invalides : surimpression (ou valeurs de repli), sans erreur', () => {
    expect(computeFichePlacement({ panelLeft: NaN, viewportWidth: 1000 }).mode).toBe('overlay')
    expect(computeFichePlacement({ panelLeft: undefined, viewportWidth: 1000 }).mode).toBe('overlay')
    const p = computeFichePlacement({ panelLeft: 570, viewportWidth: 1480 })
    expect(p.mode).toBe('side')
    expect(p.top).toBe(12)
    expect(p.maxHeight).toBeGreaterThanOrEqual(200)
  })
})

describe('webSearchUrl', () => {
  it('encode la requête et retire les espaces autour', () => {
    expect(webSearchUrl('  rain on tin roof & thunder ')).toBe('https://www.youtube.com/results?search_query=rain%20on%20tin%20roof%20%26%20thunder')
  })
  it('requête vide ou absente : pas d\'erreur', () => {
    expect(webSearchUrl('')).toBe('https://www.youtube.com/results?search_query=')
    expect(webSearchUrl(undefined)).toBe('https://www.youtube.com/results?search_query=')
  })
})

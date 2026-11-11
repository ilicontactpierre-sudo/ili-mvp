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
    const p = computeFichePlacement({ panelLeft: 570, viewportWidth: 1480 })
    expect(p).toEqual({ mode: 'side', width: FICHE_WIDTH, right: 1480 - 570 + 12 })
  })
  it('place juste suffisante : la carte se rétrécit au lieu de déborder', () => {
    const p = computeFichePlacement({ panelLeft: 300, viewportWidth: 940 })
    expect(p.mode).toBe('side')
    expect(p.width).toBe(300 - 12 - 12)
  })
  it('écran étroit : surimpression sur demande, jamais hors de l\'écran', () => {
    const p = computeFichePlacement({ panelLeft: 180, viewportWidth: 700 })
    expect(p.mode).toBe('overlay')
    expect(p.width).toBeLessThanOrEqual(700 - 24)
    expect(computeFichePlacement({ panelLeft: 20, viewportWidth: 360 }).width).toBeGreaterThanOrEqual(220)
  })
  it('valeurs invalides : surimpression, sans erreur', () => {
    expect(computeFichePlacement({ panelLeft: NaN, viewportWidth: 1000 }).mode).toBe('overlay')
    expect(computeFichePlacement({ panelLeft: undefined, viewportWidth: 1000 }).mode).toBe('overlay')
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

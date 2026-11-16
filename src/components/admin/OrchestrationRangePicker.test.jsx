// Rendu du sélecteur de tranche (sans clic : pas de jsdom). Le placement et les clics se valident
// visuellement dans l'admin.
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import OrchestrationRangePicker from './OrchestrationRangePicker.jsx'

const segments = Array.from({ length: 200 }, (_, i) => {
  if (i + 1 === 104) return { id: 's104', text: 'chapitre', isChapter: true }
  if (i + 1 === 97) return { id: 's97', text: '', pause: 2500 }
  return { id: `s${i + 1}`, text: `phrase ${i + 1}` }
})
const soundTracks = [
  { id: 't1', soundId: 'a', startSegmentId: 's1', endSegmentId: 's58', volume: 0.18, loop: true, _orchestrationKeyword: 'harbor', _orchestrationLayer: 'bed' },
  { id: 't2', soundId: 'b', startSegmentId: 's60', endSegmentId: 's120', _orchestrationKeyword: 'rain' },
  { id: 't3', soundId: 'manual', startSegmentId: 's150', endSegmentId: 's150' },
]
const soundLibrary = [{ id: 'manual', label: 'Cloches lointaines' }]
const render = (mode, range = { from: 51, to: 100 }) => renderToString(createElement(OrchestrationRangePicker, {
  segments, soundTracks, soundLibrary, mode, range, onModeChange: () => {}, onRangeChange: () => {},
}))
const count = (html, s) => html.split(s).length - 1

describe('OrchestrationRangePicker', () => {
  it('« Tout le texte » : seulement l’interrupteur, rien de calculé ni affiché', () => {
    const html = render('all')
    expect(html).toContain('Tout le texte')
    expect(html).toContain('Une tranche')
    expect(html).toMatch(/aria-pressed="true"[^>]*>Tout le texte/)
    expect(html).not.toContain('data-seg=')
    expect(html).not.toContain('du segment')
  })
  it('« Une tranche » : champs, barre d’un bouton par segment, légende', () => {
    const html = render('range')
    expect(html).toMatch(/aria-pressed="true"[^>]*>Une tranche/)
    expect(html).toContain('du segment')
    expect(html).toContain('value="51"')
    expect(html).toContain('value="100"')
    expect(html).toContain('(<!-- -->50<!-- --> segments)')
    expect(count(html, 'data-seg=')).toBe(200)
    expect(html).toContain('contexte (lecture seule)')
  })
  it('résumé : actifs à l’entrée, qui continuent après, déjà utilisés (nom du son pour un bloc à la main)', () => {
    const html = render('range')
    expect(html).toContain('Sons actifs à l&#x27;entrée (segment <!-- -->51<!-- -->)')
    expect(html).toMatch(/harbor<\/code> · <!-- -->bed, 1→58, vol\. 0\.18, en boucle/)
    expect(html).toMatch(/rain<\/code> · <!-- -->60→120/)
    expect(html).toContain('harbor · rain · Cloches lointaines')
  })
  it('avertit quand la tranche contient déjà des blocs', () => {
    expect(render('range')).toContain('1<!-- --> bloc(s) existent déjà dans cette tranche')
    expect(render('range', { from: 160, to: 199 })).not.toContain('existent déjà dans cette tranche')
  })
  it('fin conseillée quand un chapitre commence tout près', () => {
    expect(render('range')).toContain('Finir au segment <!-- -->103<!-- --> : un chapitre commence au <!-- -->104')
    expect(render('range', { from: 1, to: 50 })).not.toContain('Finir au segment')
  })
  it('« Précédente » désactivée au début, « Suivante » à la fin', () => {
    expect(render('range', { from: 1, to: 50 })).toMatch(/disabled=""[^>]*>◀ Précédente/)
    expect(render('range', { from: 151, to: 200 })).toMatch(/disabled=""[^>]*>Suivante ▶/)
  })
})

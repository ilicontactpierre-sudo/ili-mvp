import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import OrchestrationFicheCard from './OrchestrationFicheCard.jsx'

const base = {
  _orchestrationBrief: 'Room tone d\'une vieille chambre de campagne, ni voix ni musique.',
  _orchestrationSearch: ['old farmhouse bedroom room tone quiet', 'empty old room tone', 'room tone'],
  _orchestrationAlt: 'Pièce vide plus froide, réverbération marquée.',
  _orchestrationReprise: 'Retour du room tone de l\'ouverture.',
}
const render = (track) => renderToString(createElement(OrchestrationFicheCard, { track, anchorRef: { current: null }, onSearchLibrary: () => {} }))

describe('OrchestrationFicheCard', () => {
  it('affiche ce qu\'il faut entendre, les trois requêtes et les trois actions', () => {
    const html = render({ ...base, broken: true })
    expect(html).toContain('À entendre')
    expect(html).toContain('Room tone d&#x27;une vieille chambre de campagne')
    expect(html).toContain('À chercher')
    for (const q of base._orchestrationSearch) expect(html).toContain(q)
    expect(html).toContain('Ma bibliothèque')
    expect(html).toContain('YouTube')
    expect(html).toContain('aria-label="Copier la requête"')
    expect(html).toContain('data-fiche-card')
  })
  it('bloc grisé : « Son à trouver » ; bloc avec son : « Fiche de Claude »', () => {
    expect(render({ ...base, broken: true })).toContain('Son à trouver')
    expect(render({ ...base, broken: true })).not.toContain('Fiche de Claude')
    expect(render({ ...base })).toContain('Fiche de Claude')
    expect(render({ ...base })).not.toContain('Son à trouver')
  })
  it('alternative et reprise sont des lignes repliées (titre visible, texte caché)', () => {
    const html = render(base)
    expect(html).toContain('Alternative')
    expect(html).toContain('Reprise')
    expect(html).not.toContain('Pièce vide plus froide')
    expect(html).not.toContain('Retour du room tone')
  })
  it('sans alternative ni reprise : aucune ligne repliée', () => {
    const html = render({ _orchestrationBrief: 'Pas sur gravier', _orchestrationSearch: ['a', 'b', 'c'] })
    expect(html).not.toContain('Alternative')
    expect(html).not.toContain('Reprise')
  })
  it('ancien bloc sans fiche : la carte n\'existe pas', () => {
    expect(render({ _orchestrationNote: 'note seule', _orchestrationKeyword: 'rain' })).toBe('')
    expect(render({})).toBe('')
  })
  it('la carte reste invisible tant que sa position n\'est pas calculée (pas de flash au mauvais endroit)', () => {
    expect(render(base)).toContain('visibility:hidden')
  })
})

describe('branchement des boutons de la carte (gardes)', () => {
  const card = fs.readFileSync('src/components/admin/OrchestrationFicheCard.jsx', 'utf8')
  it('« Ma bibliothèque » lance la recherche avec la requête choisie', () => {
    expect(card).toContain('onSearchLibrary && onSearchLibrary(query)')
  })
  it('« YouTube » ouvre un nouvel onglet sécurisé avec la requête choisie', () => {
    expect(card).toContain("window.open(webSearchUrl(query), '_blank', 'noopener,noreferrer')")
  })
  it('le bouton de copie utilise la requête choisie', () => {
    expect(card).toContain('navigator.clipboard.writeText(query)')
  })
})

describe('branchement dans le panneau du bloc (gardes)', () => {
  const panel = fs.readFileSync('src/components/admin/SoundBlockPanel.jsx', 'utf8')
  it('un clic dans la carte ne ferme pas le panneau', () => {
    expect(panel).toContain("e.target.closest('[data-fiche-card]')")
  })
  it('la carte est rendue à côté du panneau, avec la recherche en bibliothèque branchée', () => {
    expect(panel).toContain('hasOrchestrationFiche(editedTrack) && createPortal(')
    expect(panel).toContain('<OrchestrationFicheCard')
    expect(panel).toContain('anchorRef={panelRef}')
    expect(panel).toContain('setPickerInitialSearch(query); setShowSoundPicker(true)')
  })
  it('la carte vient avant le sélecteur de sons et ne modifie pas la carte « Note Claude » existante', () => {
    expect(panel.indexOf('<OrchestrationFicheCard')).toBeLessThan(panel.indexOf('<SoundLibraryPicker'))
    expect(panel).toContain('Note Claude')
    expect(panel).toContain('_orchestrationKeyword')
  })
  it('la Description de l\'œuvre n\'est plus transmise à l\'IA', () => {
    const admin = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8')
    expect(admin).toContain('workInfo={{ genre: storyGenre, mood: storyMood }}')
    expect(admin).not.toMatch(/workInfo=\{\{[^}]*description/)
  })
})

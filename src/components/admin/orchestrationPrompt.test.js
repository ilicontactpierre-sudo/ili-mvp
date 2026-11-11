import { describe, it, expect } from 'vitest'
import { buildExportPrompt } from './OrchestrationPanel.jsx'

const segments = [{ text: 'Elle poussa la porte du café.' }, { text: 'Dehors, la pluie redoublait.' }]

describe('prompt d\'orchestration — fiche de l\'œuvre', () => {
  it('sans informations, le bloc « Fiche de l\'œuvre » n\'apparaît pas', () => {
    expect(buildExportPrompt(segments, [])).not.toContain('Fiche de l\'œuvre')
    expect(buildExportPrompt(segments, [], {})).not.toContain('Fiche de l\'œuvre')
    expect(buildExportPrompt(segments, [], { genre: '  ', mood: '', description: null })).not.toContain('Fiche de l\'œuvre')
  })
  it('avec informations : elles sont transmises, déclarées SECONDAIRES, et le ton de la scène prime', () => {
    const p = buildExportPrompt(segments, [], { genre: 'Roman', mood: 'Tension', description: 'Une nuit\n à Paris' })
    expect(p).toContain('Fiche de l\'œuvre')
    expect(p).toContain('Forme : Roman · Humeur dominante : Tension · Description : Une nuit à Paris')
    expect(p).toContain('SECONDAIRE')
    expect(p).toContain('le ton de chaque scène prime')
  })
  it('une humeur en liste est aussi acceptée', () => {
    expect(buildExportPrompt(segments, [], { mood: ['Mélancolie', 'Mystère'] })).toContain('Humeur dominante : Mélancolie, Mystère')
  })
  it('la fiche de l\'œuvre vient avant le texte à orchestrer', () => {
    const p = buildExportPrompt(segments, [], { genre: 'Roman' })
    expect(p.indexOf('Fiche de l\'œuvre')).toBeGreaterThan(-1)
    expect(p.indexOf('Fiche de l\'œuvre')).toBeLessThan(p.indexOf('Elle poussa la porte du café.'))
  })
})

describe('prompt d\'orchestration — fiche de recherche et variété', () => {
  const p = buildExportPrompt(segments, [], {})
  it('demande brief, search (3 requêtes en anglais) et alt facultatif', () => {
    expect(p).toContain('## Fiche de recherche')
    expect(p).toContain('`brief`')
    expect(p).toContain('3 requêtes en anglais')
    expect(p).toContain('`alt` (facultatif)')
    expect(p).toContain('`brief` et `search` obligatoires pour tout son hors musique')
  })
  it('ne demande PAS « ce qu\'il faut éviter » (retiré à ta demande)', () => {
    expect(p).not.toMatch(/\bavoid\b|à éviter/i)
  })
  it('interdit la redite par habitude mais permet la reprise justifiée', () => {
    expect(p).toContain('## Variété et reprises')
    expect(p).toContain('anti-immersive')
    expect(p).toContain('`reprise`')
  })
  it('le leitmotiv est déclaré rare et jamais obligatoire', () => {
    expect(p).toContain('Un leitmotiv est rare')
    expect(p).toContain('jamais pour remplir')
  })
  it('l\'exemple JSON contient brief et search', () => {
    expect(p).toContain('"brief"')
    expect(p).toContain('"search"')
  })
  it('l\'ordre des sections est conservé : variété avant densité, fiche de recherche avant le format JSON', () => {
    expect(p.indexOf('## Variété et reprises')).toBeLessThan(p.indexOf('Densité et mixage'))
    expect(p.indexOf('## Fiche de recherche')).toBeLessThan(p.indexOf('## Format JSON de sortie'))
  })
})

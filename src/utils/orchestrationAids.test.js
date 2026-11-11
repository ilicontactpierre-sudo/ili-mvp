import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { ORCHESTRATION_AID_KEYS, stripOrchestrationAids, readOrchestrationAids } from './orchestrationAids.js'

describe('stripOrchestrationAids', () => {
  const track = {
    id: 't1',
    soundId: 'rain',
    _orchestrationNote: 'note artistique',
    _orchestrationKeyword: 'rain',
    _orchestrationBrief: 'Pluie sur toit de tôle',
    _orchestrationSearch: ['rain tin roof'],
    _orchestrationAlt: 'Pluie fine sur feuillage',
    _orchestrationReprise: 'Retour au lieu A',
  }
  it('retire les quatre fiches et garde tout le reste', () => {
    const [out] = stripOrchestrationAids([track])
    for (const key of ORCHESTRATION_AID_KEYS) expect(out, key).not.toHaveProperty(key)
    expect(out).toEqual({ id: 't1', soundId: 'rain', _orchestrationNote: 'note artistique', _orchestrationKeyword: 'rain' })
  })
  it('ne modifie pas la liste d\'origine (le brouillon garde ses fiches)', () => {
    stripOrchestrationAids([track])
    expect(track._orchestrationBrief).toBe('Pluie sur toit de tôle')
    expect(track._orchestrationSearch).toEqual(['rain tin roof'])
  })
  it('supporte les entrées vides ou inattendues', () => {
    expect(stripOrchestrationAids(undefined)).toEqual([])
    expect(stripOrchestrationAids(null)).toEqual([])
    expect(stripOrchestrationAids([])).toEqual([])
    expect(stripOrchestrationAids([null, 'x'])).toEqual([null, 'x'])
  })
})

describe('readOrchestrationAids', () => {
  it('lit les quatre champs', () => {
    expect(readOrchestrationAids({ brief: ' Pas sur gravier ', search: ['a', ' b ', ''], alt: 'Autre', reprise: 'Retour au lieu A' })).toEqual({
      _orchestrationBrief: 'Pas sur gravier',
      _orchestrationSearch: ['a', 'b'],
      _orchestrationAlt: 'Autre',
      _orchestrationReprise: 'Retour au lieu A',
    })
  })
  it('accepte une requête unique en texte et limite à 5 requêtes', () => {
    expect(readOrchestrationAids({ search: 'rain' })._orchestrationSearch).toEqual(['rain'])
    expect(readOrchestrationAids({ search: ['1', '2', '3', '4', '5', '6', '7'] })._orchestrationSearch).toHaveLength(5)
  })
  it('donne null pour les champs absents, vides ou de mauvais type (ne bloque jamais)', () => {
    const empty = { _orchestrationBrief: null, _orchestrationSearch: null, _orchestrationAlt: null, _orchestrationReprise: null }
    expect(readOrchestrationAids({})).toEqual(empty)
    expect(readOrchestrationAids(undefined)).toEqual(empty)
    expect(readOrchestrationAids({ brief: 42, search: 7, alt: '  ', reprise: [] })).toEqual(empty)
  })
})

// Gardes de branchement : ces fichiers sont des composants React, difficiles à tester directement.
// Ces vérifications repèrent un retrait accidentel des appels (publication sans nettoyage, fiche de l'œuvre non transmise).
describe('branchement (gardes)', () => {
  const publish = fs.readFileSync('src/components/admin/PublishPanel.jsx', 'utf8')
  it('la publication nettoie les fiches dans les deux modes (simple et série)', () => {
    expect(publish).toContain('soundTracks: stripOrchestrationAids(soundTracks),')
    expect(publish).toContain('soundTracks: stripOrchestrationAids(part.soundTracks || []),')
    expect(publish).not.toMatch(/soundTracks:\s*soundTracks,/)
    expect(publish).not.toMatch(/soundTracks:\s*part\.soundTracks \|\| \[\],/)
  })
  it('la fiche de l\'œuvre est transmise de l\'admin jusqu\'au prompt', () => {
    expect(fs.readFileSync('src/pages/AdminPage.jsx', 'utf8')).toContain('workInfo={{ genre: storyGenre, mood: storyMood }}')
    expect(fs.readFileSync('src/components/admin/OrchestrationPanel.jsx', 'utf8')).toContain('buildExportPrompt(segments, soundLibrary, workInfo)')
  })
  it('l\'application range les fiches dans le bloc créé', () => {
    expect(fs.readFileSync('src/components/admin/OrchestrationPanel.jsx', 'utf8')).toContain('...readOrchestrationAids(block),')
  })
})

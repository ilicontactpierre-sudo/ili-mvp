// Pauses proposées par Claude : « ✦ Appliquer » doit vraiment les insérer, et les sons
// doivent tomber sur les segments que Claude a numérotés.
//
// Défaut corrigé le 16/11/2026 : AdminPage ne passait pas `onSegmentsChange` au panneau.
// Les pauses étaient donc ignorées, mais les sons étaient quand même décalés d'un segment
// par pause proposée avant eux (un son prévu sur 30→32 tombait sur 31→33).
//
// Pas de jsdom ici (on ne peut pas cliquer) : le test appelle directement la fonction
// « Appliquer » du panneau. Pour cela, `useState` et `useCallback` sont remplacés par de
// fausses versions. C'est volontairement strict : si l'ordre des `useState` ou des
// `useCallback` du panneau change, ce test échoue et doit être ajusté (pas supprimé).
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'

let pendingStates = []
let callbacks = []
vi.mock('react', async (importOriginal) => {
  const React = await importOriginal()
  return {
    ...React,
    useState: (init) => [pendingStates.length ? pendingStates.shift() : init, () => {}],
    useCallback: (fn) => { callbacks.push(fn); return fn },
  }
})
const { default: OrchestrationPanel } = await import('./OrchestrationPanel.jsx')

const sound = { id: 'snd_rain', label: 'Pluie', url: 'https://example.test/pluie.mp3' }
const makeSegments = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, text: `phrase ${i + 1}` }))

// Appelle « Appliquer » avec un diagnostic déjà prêt, comme après « 🔍 Analyser ».
function apply({ segments, blocks, pauses }) {
  const diagnosis = {
    found: blocks.map((block) => ({ block, sound, keyword: block.keyword, type: block.type })),
    missing: [],
    pauses,
    invalidPauses: [],
  }
  // Ordre des useState du panneau : exportText, importJson, showImport, diagnosis, applyStatus, copyStatus, importError, analyzing
  pendingStates = ['', '', false, diagnosis, 'idle', 'idle', '', false]
  callbacks = []
  let newSegments = null
  let newTracks = null
  OrchestrationPanel({
    segments,
    soundLibrary: [sound],
    soundTracks: [],
    onSoundTracksChange: (t) => { newTracks = t },
    onSegmentsChange: (s) => { newSegments = s },
    workInfo: {},
  })
  // Ordre des useCallback : handleExport, handleDiagnose, handleAnalyzeClick, handleApply
  callbacks[3]()
  return { newSegments, newTracks }
}
const textOf = (segs, id) => segs.find((s) => s.id === id)?.text

describe('Appliquer : pauses proposées par Claude', () => {
  it('AdminPage branche onSegmentsChange sur le panneau d’orchestration', () => {
    const src = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8')
    const start = src.indexOf('<OrchestrationPanel')
    expect(start).toBeGreaterThan(-1)
    const tag = src.slice(start, src.indexOf('/>', start))
    expect(tag).toMatch(/onSegmentsChange=\{setActiveSegments\}/)
  })

  it('insère la pause au bon endroit, avec la durée, l’intention et la note de Claude', () => {
    const { newSegments } = apply({
      segments: makeSegments(40),
      blocks: [],
      pauses: [{ afterSegment: 24, durationMs: 2000, intention: 'suspense', note: 'laisser retomber' }],
    })
    expect(newSegments).toHaveLength(41)
    expect(newSegments[23].text).toBe('phrase 24')
    expect(newSegments[24]).toMatchObject({ text: '', pause: 2000, _orchestrationPauseIntention: 'suspense', _orchestrationPauseNote: 'laisser retomber' })
    expect(newSegments[24].id).toMatch(/^seg_pause_/)
    expect(newSegments[25].text).toBe('phrase 25')
  })

  it('les sons restent sur les segments numérotés par Claude, avant comme après la pause', () => {
    const { newSegments, newTracks } = apply({
      segments: makeSegments(40),
      blocks: [
        { keyword: 'rain', type: 'atmosphere', startSegment: 10, endSegment: 12, volume: 0.2 },
        { keyword: 'rain', type: 'atmosphere', startSegment: 30, endSegment: 32, volume: 0.2 },
        { keyword: 'rain', type: 'atmosphere', startSegment: 20, endSegment: 30, volume: 0.2 },
      ],
      pauses: [{ afterSegment: 24, durationMs: 2000 }],
    })
    const spans = newTracks.map((t) => [textOf(newSegments, t.startSegmentId), textOf(newSegments, t.endSegmentId)])
    expect(spans).toEqual([
      ['phrase 10', 'phrase 12'],
      ['phrase 30', 'phrase 32'],
      ['phrase 20', 'phrase 30'], // un bloc qui enjambe la pause la garde à l’intérieur
    ])
  })

  it('blocs collés à la pause : le segment juste avant et juste après restent les bons', () => {
    const { newSegments, newTracks } = apply({
      segments: makeSegments(40),
      blocks: [
        { keyword: 'rain', type: 'atmosphere', startSegment: 24, endSegment: 24, volume: 0.2 },
        { keyword: 'rain', type: 'atmosphere', startSegment: 25, endSegment: 25, volume: 0.2 },
        { keyword: 'rain', type: 'atmosphere', startSegment: 24, endSegment: 25, volume: 0.2 },
      ],
      pauses: [{ afterSegment: 24, durationMs: 2000 }],
    })
    const spans = newTracks.map((t) => [textOf(newSegments, t.startSegmentId), textOf(newSegments, t.endSegmentId)])
    expect(spans).toEqual([
      ['phrase 24', 'phrase 24'],
      ['phrase 25', 'phrase 25'],
      ['phrase 24', 'phrase 25'],
    ])
  })

  it('plusieurs pauses, dans le désordre : chacune au bon endroit, sons justes', () => {
    const { newSegments, newTracks } = apply({
      segments: makeSegments(40),
      blocks: [{ keyword: 'rain', type: 'atmosphere', startSegment: 36, endSegment: 38, volume: 0.2 }],
      pauses: [{ afterSegment: 30, durationMs: 1000 }, { afterSegment: 5, durationMs: 3000 }, { afterSegment: 40, durationMs: 500 }],
    })
    expect(newSegments).toHaveLength(43)
    const pauseAfter = newSegments.map((s, i) => (s.pause ? [newSegments[i - 1].text, s.pause] : null)).filter(Boolean)
    expect(pauseAfter).toEqual([['phrase 5', 3000], ['phrase 30', 1000], ['phrase 40', 500]])
    expect(textOf(newSegments, newTracks[0].startSegmentId)).toBe('phrase 36')
    expect(textOf(newSegments, newTracks[0].endSegmentId)).toBe('phrase 38')
  })

  it('les segments d’origine ne sont pas modifiés (nouvelle liste)', () => {
    const segments = makeSegments(10)
    const copy = JSON.parse(JSON.stringify(segments))
    const { newSegments } = apply({ segments, blocks: [], pauses: [{ afterSegment: 3, durationMs: 1500 }] })
    expect(newSegments).not.toBe(segments)
    expect(segments).toEqual(copy)
  })
})

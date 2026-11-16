// Tranche d'orchestration (Statut 24, étape 2) : prompt d'une tranche, analyse (hors tranche,
// texte changé), « Appliquer » et tranche suivante.
//
// Comme OrchestrationPanel.pauses.test.jsx : pas de jsdom, on appelle directement les fonctions
// du panneau en remplaçant useState / useCallback. Volontairement strict : si l'ordre des
// useState ou des useCallback change, ce test échoue et doit être ajusté (pas supprimé).
import { describe, it, expect, vi, beforeAll } from 'vitest'
import fs from 'node:fs'

let pending = []
let captured = {}
let callbacks = []
let stateIndex = 0
vi.mock('react', async (importOriginal) => {
  const React = await importOriginal()
  return {
    ...React,
    useState: (init) => {
      const i = stateIndex++
      const v = pending.length ? pending.shift() : init
      return [v, (x) => { captured[i] = x }]
    },
    useCallback: (fn) => { callbacks.push(fn); return fn },
  }
})
const { default: OrchestrationPanel, buildExportPrompt } = await import('./OrchestrationPanel.jsx')
const { rangeFingerprint } = await import('../../utils/orchestrationRange.js')

beforeAll(() => {
  vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.resolve() } })
})

// Ordre des useState : exportText, importJson, showImport, diagnosis, applyStatus, copyStatus,
// importError, analyzing, rangeMode, rangeSel, generatedRange, nextAfterApply
const S = { exportText: 0, importJson: 1, diagnosis: 3, applyStatus: 4, importError: 6, rangeMode: 8, rangeSel: 9, generatedRange: 10, nextAfterApply: 11 }
// Ordre des useCallback : handleExport, handleDiagnose, handleAnalyzeClick, handleApply
const CB = { export: 0, diagnose: 1, apply: 3 }

const sound = { id: 'snd_rain', label: 'Pluie', url: 'https://example.test/pluie.mp3' }
const makeSegments = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, text: `phrase ${i + 1}` }))

function mount(states, props = {}) {
  const full = ['', '', false, null, 'idle', 'idle', '', false, 'all', null, null, null]
  Object.entries(states).forEach(([k, v]) => {
    if (!(k in S)) throw new Error(`état inconnu : ${k}`)
    full[S[k]] = v
  })
  pending = full
  captured = {}
  callbacks = []
  stateIndex = 0
  const calls = { tracks: null, segments: null }
  OrchestrationPanel({
    segments: makeSegments(200),
    soundLibrary: [sound],
    soundLibraryReady: true,
    soundTracks: [],
    onSoundTracksChange: (t) => { calls.tracks = t },
    onSegmentsChange: (s) => { calls.segments = s },
    workInfo: {},
    ...props,
  })
  return calls
}

describe('prompt d’une tranche', () => {
  const segments = makeSegments(200).map((s, i) => (i + 1 === 104 ? { ...s, isChapter: true } : i + 1 === 97 ? { id: 'p97', text: '', pause: 2500 } : s))
  const tracks = [
    { id: 't1', soundId: 'snd_rain', startSegmentId: 's1', endSegmentId: 's58', volume: 0.18, loop: true, _orchestrationKeyword: 'harbor', _orchestrationLayer: 'bed' },
    { id: 't2', soundId: 'snd_rain', startSegmentId: 's22', endSegmentId: 's22', _orchestrationKeyword: 'door creak' },
  ]
  const full = buildExportPrompt(segments, [sound], {})
  const part = buildExportPrompt(segments, [sound], {}, { from: 51, to: 100, soundTracks: tracks })

  it('tout ce qui précède le texte est identique au prompt complet', () => {
    const cut = full.indexOf('## Texte à orchestrer')
    expect(cut).toBeGreaterThan(1000)
    expect(part.slice(0, cut)).toBe(full.slice(0, cut))
    expect(part.slice(cut)).toMatch(/^## Tranche à orchestrer : segments 51 à 100 \(l'histoire en compte 200\)/)
  })
  it('la fin du prompt (consigne de réponse) est inchangée', () => {
    const tail = full.slice(full.lastIndexOf('\n---\n'))
    expect(part.endsWith(tail)).toBe(true)
  })
  it('numérotation d’origine, 5 segments de contexte de chaque côté, rien d’autre', () => {
    const numbered = [...part.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]))
    expect(numbered[0]).toBe(46)
    expect(numbered[numbered.length - 1]).toBe(105)
    expect(numbered).toHaveLength(60)
    expect(part).toContain('[46] (contexte) phrase 46')
    expect(part).toContain('[50] (contexte) phrase 50')
    expect(part).toContain('[51] phrase 51')
    expect(part).toContain('[100] phrase 100')
    expect(part).toContain('[101] (contexte) phrase 101')
    expect(part).toContain('[104] (contexte) (chapitre) phrase 104')
    expect(part).not.toContain('[45]')
    expect(part).not.toContain('[106]')
  })
  it('une pause existante dans la tranche garde la même ligne que dans le prompt complet', () => {
    const line = '[97] ⏸ PAUSE existante — 2500ms — un blocson peut y être placé ou prolongé'
    expect(full).toContain(line)
    expect(part).toContain(line)
  })
  it('les lignes de la tranche sont exactement celles du prompt complet', () => {
    const lines = (txt) => txt.split('\n').filter((l) => /^\[(5[1-9]|[6-9]\d|100)\]/.test(l))
    expect(lines(part)).toEqual(lines(full))
    expect(lines(part)).toHaveLength(50)
  })
  it('sons déjà en place : actifs à l’entrée, déjà utilisés', () => {
    expect(part).toContain('- bed « harbor » — 1→58, volume 0.18, en boucle')
    expect(part).toContain('Déjà posés après la fin de la tranche : aucun')
    expect(part).toContain('harbor (1→58) · door creak (22)')
    expect(part).toContain('UNIQUEMENT entre les segments 51 et 100')
  })
})

describe('générer : la tranche est retenue pour l’analyse', () => {
  it('mode tranche : retient from/to et l’empreinte', () => {
    mount({ rangeMode: 'range', rangeSel: { from: 51, to: 100 } })
    callbacks[CB.export]()
    expect(captured[S.exportText]).toContain('## Tranche à orchestrer : segments 51 à 100')
    expect(captured[S.generatedRange]).toMatchObject({ from: 51, to: 100 })
    expect(captured[S.generatedRange].fingerprint.upTo).toBe(105)
  })
  it('mode tout le texte : rien n’est retenu, prompt complet', () => {
    mount({ rangeMode: 'all', rangeSel: { from: 51, to: 100 } })
    callbacks[CB.export]()
    expect(captured[S.exportText]).toContain('## Texte à orchestrer (200 segments)')
    expect(captured[S.generatedRange]).toBeNull()
  })
  it('tranche par défaut : 1 → 50', () => {
    mount({ rangeMode: 'range' })
    callbacks[CB.export]()
    expect(captured[S.generatedRange]).toMatchObject({ from: 1, to: 50 })
  })
})

describe('analyser : ce qui sort de la tranche', () => {
  const json = (pauses, sounds) => `### PAUSES\n${JSON.stringify(pauses)}\n### SONS\n${JSON.stringify(sounds)}`
  const range = { from: 51, to: 100, fingerprint: rangeFingerprint(makeSegments(200), { from: 51, to: 100 }) }
  const sounds = [
    { soundId: 'snd_rain', startSegment: 51, endSegment: 60 },
    { soundId: 'snd_rain', startSegment: 47, endSegment: 52, note: 'déborde avant' },
    { soundId: 'snd_rain', startSegment: 99, endSegment: 103 },
    { soundId: 'snd_rain', startSegment: 100 },
  ]
  const pauses = [{ afterSegment: 70, durationMs: 1500 }, { afterSegment: 103, durationMs: 1500 }, { afterSegment: 50, durationMs: 900 }]

  it('les blocs hors tranche sont mis à part, les autres analysés comme avant', () => {
    mount({ importJson: json(pauses, sounds), generatedRange: range })
    callbacks[CB.diagnose]()
    const d = captured[S.diagnosis]
    expect(d.found.map((f) => [f.block.startSegment, f.block.endSegment])).toEqual([[51, 60], [100, undefined]])
    expect(d.outOfRange.map((o) => o.block.startSegment)).toEqual([47, 99])
    expect(d.range).toBe(range)
  })
  it('les pauses hors tranche sont ignorées avec la raison', () => {
    mount({ importJson: json(pauses, sounds), generatedRange: range })
    callbacks[CB.diagnose]()
    const d = captured[S.diagnosis]
    expect(d.pauses.map((p) => p.afterSegment)).toEqual([70])
    expect(d.invalidPauses.map((p) => p.reason)).toEqual([
      'après segment 103 : hors de la tranche 51→100',
      'après segment 50 : hors de la tranche 51→100',
    ])
  })
  it('sans tranche (prompt complet) : rien n’est filtré, comme avant', () => {
    mount({ importJson: json(pauses, sounds), generatedRange: null })
    callbacks[CB.diagnose]()
    const d = captured[S.diagnosis]
    expect(d.found).toHaveLength(4)
    expect(d.outOfRange).toEqual([])
    expect(d.pauses).toHaveLength(3)
    expect(d.range).toBeNull()
  })
})

describe('appliquer une tranche', () => {
  const range = { from: 51, to: 100, fingerprint: rangeFingerprint(makeSegments(200), { from: 51, to: 100 }) }
  const diagnosis = (pauses = []) => ({
    found: [{ block: { keyword: 'rain', type: 'atmosphere', startSegment: 60, endSegment: 62 }, sound }],
    missing: [], pauses, invalidPauses: [], outOfRange: [], range,
  })

  it('texte inchangé : applique, et propose la tranche suivante', () => {
    const calls = mount({ diagnosis: diagnosis() })
    callbacks[CB.apply]()
    expect(calls.tracks).toHaveLength(1)
    expect(captured[S.applyStatus]).toBe('success')
    expect(captured[S.nextAfterApply]).toEqual({ from: 101, to: 150 })
  })
  it('2 pauses insérées dans la tranche : la suivante est décalée de 2', () => {
    const calls = mount({ diagnosis: diagnosis([{ afterSegment: 70, durationMs: 1500 }, { afterSegment: 80, durationMs: 1500 }]) })
    callbacks[CB.apply]()
    expect(calls.segments).toHaveLength(202)
    expect(captured[S.nextAfterApply]).toEqual({ from: 103, to: 152 })
    expect(calls.segments[102].text).toBe('phrase 101')
  })
  it('texte changé depuis le prompt : rien n’est appliqué', () => {
    const changed = makeSegments(200)
    changed.splice(20, 0, { id: 'p', text: '', pause: 1500 })
    const calls = mount({ diagnosis: diagnosis() }, { segments: changed })
    callbacks[CB.apply]()
    expect(calls.tracks).toBeNull()
    expect(calls.segments).toBeNull()
    expect(captured[S.applyStatus]).toBeUndefined()
  })
  it('prompt complet : pas de tranche suivante proposée', () => {
    mount({ diagnosis: { ...diagnosis(), range: null } })
    callbacks[CB.apply]()
    expect(captured[S.applyStatus]).toBe('success')
    expect(captured[S.nextAfterApply]).toBeNull()
  })
})

describe('branchements (gardes)', () => {
  const src = fs.readFileSync('src/components/admin/OrchestrationPanel.jsx', 'utf8')
  it('le sélecteur est dans l’étape 1, avant le bouton « Générer & copier le prompt »', () => {
    const picker = src.indexOf('<OrchestrationRangePicker')
    expect(picker).toBeGreaterThan(src.indexOf('<strong style={s.labelStrong}>Étape 1</strong>'))
    expect(picker).toBeLessThan(src.indexOf('onClick={handleExport}'))
  })
  it('« Appliquer » est désactivé quand le texte a changé', () => {
    expect(src).toMatch(/onClick=\{handleApply\}\s*disabled=\{diagnosisStale\}/)
  })
  it('le bouton « tranche suivante » est branché', () => {
    expect(src).toMatch(/hasNextRange && \(\s*<button onClick=\{handlePrepareNext\}/)
  })
})

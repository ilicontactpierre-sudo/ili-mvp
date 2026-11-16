import { describe, it, expect } from 'vitest'
import {
  clampRange, defaultRange, contextBounds, nextRange, prevRange, trackSpans, coverageCounts,
  suggestEnd, soundLabelsFor, rangeSummary, rangeFingerprint, fingerprintChanged,
  blockInRange, pauseInRange, rangeAfterApply,
} from './orchestrationRange.js'

const segs = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, text: `phrase ${i + 1}` }))
const track = (id, s, e, extra = {}) => ({ id, soundId: `snd_${id}`, startSegmentId: `s${s}`, endSegmentId: `s${e}`, ...extra })

describe('bornes de tranche', () => {
  it('clampRange garde 1 ≤ from ≤ to ≤ total et corrige les valeurs absurdes', () => {
    expect(clampRange(51, 100, 200)).toEqual({ from: 51, to: 100 })
    expect(clampRange(0, 500, 200)).toEqual({ from: 1, to: 200 })
    expect(clampRange(80, 20, 200)).toEqual({ from: 80, to: 80 })
    expect(clampRange('12', '30.4', 200)).toEqual({ from: 12, to: 30 })
    expect(clampRange('abc', '', 200)).toEqual({ from: 1, to: 1 })
  })
  it('défaut : 1 → 50, ou toute l’histoire si elle est plus courte', () => {
    expect(defaultRange(200)).toEqual({ from: 1, to: 50 })
    expect(defaultRange(30)).toEqual({ from: 1, to: 30 })
  })
  it('contexte : 5 de chaque côté, coupé aux bords de l’histoire', () => {
    expect(contextBounds({ from: 51, to: 100 }, 200)).toEqual({ ctxFrom: 46, ctxTo: 105 })
    expect(contextBounds({ from: 1, to: 50 }, 200)).toEqual({ ctxFrom: 1, ctxTo: 55 })
    expect(contextBounds({ from: 3, to: 198 }, 200)).toEqual({ ctxFrom: 1, ctxTo: 200 })
  })
  it('tranche suivante / précédente : même largeur, sans dépasser', () => {
    expect(nextRange({ from: 51, to: 100 }, 200)).toEqual({ from: 101, to: 150 })
    expect(nextRange({ from: 151, to: 200 }, 200)).toEqual({ from: 151, to: 200 })
    expect(nextRange({ from: 121, to: 170 }, 200)).toEqual({ from: 171, to: 200 })
    expect(prevRange({ from: 51, to: 100 }, 200)).toEqual({ from: 1, to: 50 })
    expect(prevRange({ from: 21, to: 70 }, 200)).toEqual({ from: 1, to: 20 })
    expect(prevRange({ from: 1, to: 50 }, 200)).toEqual({ from: 1, to: 50 })
  })
})

describe('position des blocs et couverture', () => {
  it('trackSpans numérote à partir de 1, ignore un début introuvable, fin introuvable = début', () => {
    const spans = trackSpans(segs(10), [track('a', 2, 4), track('b', 7, 99), { id: 'c', startSegmentId: 'nope', endSegmentId: 's3' }])
    expect(spans.map((s) => [s.track.id, s.start, s.end])).toEqual([['a', 2, 4], ['b', 7, 7]])
  })
  it('trackSpans résout les segments sans id comme « Appliquer » (seg_<index>)', () => {
    const list = ['texte brut', { text: 'sans id' }, { id: 'x', text: 'avec id' }]
    const spans = trackSpans(list, [{ startSegmentId: 'seg_0', endSegmentId: 'seg_1' }, { startSegmentId: 'x', endSegmentId: 'x' }])
    expect(spans.map((s) => [s.start, s.end])).toEqual([[1, 2], [3, 3]])
  })
  it('coverageCounts compte les blocs actifs par segment', () => {
    const spans = trackSpans(segs(8), [track('a', 1, 3), track('b', 3, 5), track('c', 8, 8)])
    expect(coverageCounts(spans, 8)).toEqual([1, 1, 2, 1, 1, 0, 0, 1])
  })
})

describe('fin conseillée', () => {
  const withChapter = (n, at) => segs(n).map((s, i) => (i + 1 === at ? { ...s, isChapter: true } : s))
  it('propose de finir juste avant un chapitre proche', () => {
    expect(suggestEnd(withChapter(200, 104), { from: 51, to: 100 })).toEqual({ to: 103, chapterAt: 104 })
    expect(suggestEnd(withChapter(200, 95), { from: 51, to: 100 })).toEqual({ to: 94, chapterAt: 95 })
  })
  it('rien si le chapitre est loin, déjà au bon endroit, ou rendrait la tranche trop courte', () => {
    expect(suggestEnd(withChapter(200, 120), { from: 51, to: 100 })).toBeNull()
    expect(suggestEnd(withChapter(200, 101), { from: 51, to: 100 })).toBeNull()
    expect(suggestEnd(withChapter(200, 55), { from: 51, to: 60 })).toBeNull()
  })
  it('le chapitre le plus proche gagne', () => {
    const list = segs(200).map((s, i) => ([93, 104].includes(i + 1) ? { ...s, isChapter: true } : s))
    expect(suggestEnd(list, { from: 51, to: 100 })).toEqual({ to: 103, chapterAt: 104 })
  })
})

describe('résumé des sons pour une tranche', () => {
  const list = segs(200)
  const tracks = [
    track('harbor', 1, 58, { _orchestrationKeyword: 'harbor', _orchestrationLayer: 'bed', volume: 0.18, loop: true }),
    track('door1', 22, 22, { _orchestrationKeyword: 'door creak' }),
    track('door2', 35, 35, { _orchestrationKeyword: 'door creak' }),
    track('wind', 48, 70, { _orchestrationKeyword: 'wind' }),
    track('edge', 51, 100, { _orchestrationKeyword: 'pile aux bornes' }), // commence au 1er segment, finit au dernier
    track('inside', 60, 120, { _orchestrationKeyword: 'rain' }),
    track('manual', 140, 150), // bloc posé à la main : pas de mot-clé
  ]
  const labels = soundLabelsFor(tracks, [{ id: 'snd_manual', label: 'Cloches lointaines' }, { id: 'snd_other', label: 'x' }])
  const sum = rangeSummary(trackSpans(list, tracks), { from: 51, to: 100 }, labels)
  it('entrée : commencés avant la tranche et encore actifs à son début', () => {
    expect(sum.entry.map((b) => [b.label, b.span])).toEqual([['harbor', '1→58'], ['wind', '48→70']])
  })
  it('sortie : commencés dans la tranche et qui continuent après', () => {
    expect(sum.exit.map((b) => b.label)).toEqual(['rain'])
    expect(sum.after.map((b) => b.label)).toEqual(['rain', 'Cloches lointaines'])
  })
  it('dedans : commencent dans la tranche', () => {
    expect(sum.inside.map((b) => [b.label, b.span])).toEqual([['pile aux bornes', '51→100'], ['rain', '60→120']])
  })
  it('déjà utilisés : regroupés par nom, un bloc à la main prend le nom du son', () => {
    expect(sum.used).toEqual([
      { label: 'harbor', places: ['1→58'] },
      { label: 'door creak', places: ['22', '35'] },
      { label: 'wind', places: ['48→70'] },
      { label: 'pile aux bornes', places: ['51→100'] },
      { label: 'rain', places: ['60→120'] },
      { label: 'Cloches lointaines', places: ['140→150'] },
    ])
  })
  it('soundLabelsFor ne cherche que les sons sans mot-clé', () => {
    expect([...labels.entries()]).toEqual([['snd_manual', 'Cloches lointaines']])
  })
})

describe('le texte a-t-il changé depuis le prompt ?', () => {
  const range = { from: 51, to: 100 }
  it('identique : non', () => {
    const list = segs(200)
    expect(fingerprintChanged(rangeFingerprint(list, range), segs(200))).toBe(false)
  })
  it('pause insérée avant ou dans la tranche (ou dans le contexte) : oui', () => {
    const fp = rangeFingerprint(segs(200), range)
    for (const at of [10, 60, 103]) {
      const list = segs(200)
      list.splice(at, 0, { id: 'p', text: '', pause: 1500 })
      expect(fingerprintChanged(fp, list)).toBe(true)
    }
  })
  it('ajout après la tranche et son contexte : non (les numéros ne bougent pas)', () => {
    const fp = rangeFingerprint(segs(200), range)
    const list = segs(200)
    list.splice(150, 0, { id: 'p', text: '', pause: 1500 })
    expect(fingerprintChanged(fp, list)).toBe(false)
  })
  it('segment supprimé, ou histoire raccourcie : oui', () => {
    const fp = rangeFingerprint(segs(200), range)
    const list = segs(200)
    list.splice(20, 1)
    expect(fingerprintChanged(fp, list)).toBe(true)
    expect(fingerprintChanged(fp, segs(90))).toBe(true)
  })
  it('segments sans id : un ajout décale aussi l’empreinte', () => {
    const list = Array.from({ length: 120 }, (_, i) => `texte ${i + 1}`)
    const fp = rangeFingerprint(list, range)
    const moved = list.slice()
    moved.splice(5, 0, 'nouveau')
    expect(fingerprintChanged(fp, moved)).toBe(true)
  })
  it('pas d’empreinte (prompt « tout le texte ») : jamais d’alerte', () => {
    expect(fingerprintChanged(null, segs(3))).toBe(false)
  })
})

describe('dans la tranche ?', () => {
  const range = { from: 51, to: 100 }
  it('blocs', () => {
    expect(blockInRange({ startSegment: 51, endSegment: 100 }, range)).toBe(true)
    expect(blockInRange({ startSegment: 60 }, range)).toBe(true)
    expect(blockInRange({ startSegment: 50, endSegment: 60 }, range)).toBe(false)
    expect(blockInRange({ startSegment: 98, endSegment: 101 }, range)).toBe(false)
    expect(blockInRange({ startSegment: 70, endSegment: 60 }, range)).toBe(false)
    expect(blockInRange({ startSegment: 'x' }, range)).toBe(false)
  })
  it('pauses (« après le segment n »)', () => {
    expect(pauseInRange(51, range)).toBe(true)
    expect(pauseInRange(100, range)).toBe(true)
    expect(pauseInRange(50, range)).toBe(false)
    expect(pauseInRange(101, range)).toBe(false)
  })
})

describe('tranche suivante après « Appliquer »', () => {
  it('sans pause : juste après', () => {
    expect(rangeAfterApply({ from: 51, to: 100 }, 0, 200)).toEqual({ from: 101, to: 150 })
  })
  it('avec 2 pauses insérées dans la tranche : décalée de 2, même largeur', () => {
    expect(rangeAfterApply({ from: 51, to: 100 }, 2, 202)).toEqual({ from: 103, to: 152 })
  })
  it('fin de l’histoire atteinte : la tranche reste en place', () => {
    expect(rangeAfterApply({ from: 151, to: 200 }, 1, 201)).toEqual({ from: 151, to: 201 })
  })
})

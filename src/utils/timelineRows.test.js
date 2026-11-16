// Fluidité de la timeline (16/11/2026) : les calculs faits une seule fois doivent donner
// exactement ce que chaque ligne calculait elle-même avant (l'« ancien calcul » est recopié ici).
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { buildSegmentIndex, rowIndexOf, buildSoundLookup, buildRowLayout, selectionMask, sameItems } from './timelineRows'

// ── Ancien calcul, recopié de UnifiedSegmentsTimeline.jsx (version du 16/11/2026, avant correction) ──
function oldIndexOf(segments, segmentId) {
  const idx = segments.findIndex(s => s.id === segmentId || s._id === segmentId)
  if (idx !== -1) return idx
  const match = segmentId?.match(/^seg(?:ment)?_(\d+)$/)
  if (match) {
    const index = parseInt(match[1], 10)
    if (index >= 0 && index < segments.length) return index
  }
  return -1
}
function oldRow(tracks, segments, index, columnCount) {
  const starting = tracks.filter(t => oldIndexOf(segments, t.startSegmentId) === index)
  let occupancy = ''
  for (let colIndex = 0; colIndex < columnCount; colIndex++) {
    const has = tracks.some(track => {
      const startIdx = oldIndexOf(segments, track.startSegmentId)
      const endIdx = oldIndexOf(segments, track.endSegmentId)
      const trackEnd = endIdx !== -1 ? endIdx : startIdx
      return track.column === colIndex && startIdx <= index && trackEnd >= index
    })
    occupancy += has ? '1' : '0'
  }
  return { starting, occupancy }
}
function expectSameAsOld(tracks, segments, columnCount) {
  const rows = buildRowLayout(tracks, segments, buildSegmentIndex(segments), columnCount)
  expect(rows.length).toBe(segments.length)
  segments.forEach((_, i) => {
    const old = oldRow(tracks, segments, i, columnCount)
    expect(rows[i].tracks).toEqual(old.starting)
    rows[i].tracks.forEach((t, k) => expect(t).toBe(old.starting[k])) // mêmes objets, même ordre
    expect(rows[i].occupancy).toBe(old.occupancy)
  })
}

const seg = (id, extra = {}) => ({ id, text: id, ...extra })

describe('position des segments', () => {
  it('donne le même résultat que findIndex + repli seg_N, y compris les cas tordus', () => {
    const segments = [seg('a'), { _id: 'b', text: 'b' }, seg('c', { _id: 'a' }), seg('a'), { id: 'seg_9', text: '' }, seg('d', { _id: 'x' })]
    const index = buildSegmentIndex(segments)
    for (const id of ['a', 'b', 'c', 'd', 'x', 'seg_9', 'seg_2', 'segment_3', 'seg_99', 'seg_-1', 'zzz', undefined, null, '']) {
      expect(rowIndexOf(index, segments, id)).toBe(oldIndexOf(segments, id))
    }
  })
  it('liste vide', () => {
    expect(rowIndexOf(buildSegmentIndex([]), [], 'seg_0')).toBe(-1)
    expect(buildRowLayout([{ startSegmentId: 'a', endSegmentId: 'a', column: 0 }], [], new Map(), 7)).toEqual([])
  })
})

describe('blocs par ligne et colonnes occupées', () => {
  const segments = Array.from({ length: 12 }, (_, i) => (i === 5 ? seg(`p${i}`, { text: '', pause: 1200 }) : seg(`s${i}`)))
  it('cas pile aux bornes : premier segment, dernier segment, collé à une pause, sur la pause', () => {
    const tracks = [
      { id: 'debut', startSegmentId: 's0', endSegmentId: 's0', column: 0 },
      { id: 'fin', startSegmentId: 's11', endSegmentId: 's11', column: 6 },
      { id: 'tout', startSegmentId: 's0', endSegmentId: 's11', column: 3 },
      { id: 'avantPause', startSegmentId: 's2', endSegmentId: 's4', column: 1 },
      { id: 'surPause', startSegmentId: 'p5', endSegmentId: 'p5', column: 1 },
      { id: 'apresPause', startSegmentId: 's6', endSegmentId: 's8', column: 1 },
      { id: 'traversePause', startSegmentId: 's4', endSegmentId: 's6', column: 2 },
    ]
    expectSameAsOld(tracks, segments, 7)
    const rows = buildRowLayout(tracks, segments, buildSegmentIndex(segments), 7)
    expect(rows[0].occupancy).toBe('1001000')
    expect(rows[11].occupancy).toBe('0001001')
    expect(rows[4].occupancy).toBe('0111000')
    expect(rows[5].occupancy).toBe('0111000')
    expect(rows[6].occupancy).toBe('0111000')
    expect(rows[9].occupancy).toBe('0001000')
    expect(rows[0].tracks.map(t => t.id)).toEqual(['debut', 'tout'])
    expect(rows[11].tracks.map(t => t.id)).toEqual(['fin'])
  })
  it('identifiants introuvables, fin avant début, colonnes invalides, repli seg_N', () => {
    const tracks = [
      { id: 'sansDebut', startSegmentId: 'inconnu', endSegmentId: 's3', column: 0 },
      { id: 'sansFin', startSegmentId: 's7', endSegmentId: 'inconnu', column: 1 },
      { id: 'rien', startSegmentId: 'inconnu', endSegmentId: 'inconnu', column: 2 },
      { id: 'aLEnvers', startSegmentId: 's8', endSegmentId: 's6', column: 2 },
      { id: 'colTexte', startSegmentId: 's1', endSegmentId: 's2', column: '3' },
      { id: 'colTropGrande', startSegmentId: 's1', endSegmentId: 's2', column: 7 },
      { id: 'colNegative', startSegmentId: 's1', endSegmentId: 's2', column: -1 },
      { id: 'colDecimale', startSegmentId: 's1', endSegmentId: 's2', column: 4.5 },
      { id: 'sansColonne', startSegmentId: 's1', endSegmentId: 's2' },
      { id: 'repli', startSegmentId: 'seg_10', endSegmentId: 'segment_11', column: 5 },
      { id: 'repliHors', startSegmentId: 'seg_40', endSegmentId: 'seg_41', column: 6 },
    ]
    expectSameAsOld(tracks, segments, 7)
  })
  it('segments sans identifiant (champ _id absent) : même résultat qu’avant', () => {
    const segs = [{ text: 'a' }, seg('b'), { _id: 'c', text: 'c' }]
    const tracks = [{ id: 't1', startSegmentId: undefined, endSegmentId: 'c', column: 0 }, { id: 't2', startSegmentId: 'b', endSegmentId: undefined, column: 1 }]
    expectSameAsOld(tracks, segs, 7)
  })
  it('sur toutes les histoires du dépôt (sons : 7 colonnes, effets : 2)', () => {
    const dir = path.resolve('public/stories')
    let lignes = 0
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json') || f === 'index.json') continue
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      for (const p of (Array.isArray(s.parts) ? s.parts : [s])) {
        expectSameAsOld(p.soundTracks || [], p.segments || [], 7)
        expectSameAsOld(p.vfxTracks || [], p.segments || [], 2)
        lignes += (p.segments || []).length
      }
    }
    expect(lignes).toBeGreaterThan(500)
  })
  it('une ligne sans bloc reçoit toujours la même liste vide', () => {
    const rows = buildRowLayout([], segments, buildSegmentIndex(segments), 7)
    expect(rows[0].tracks).toBe(rows[3].tracks)
    expect(rows[0].tracks).toEqual([])
  })
})

describe('sélection, table des sons, comparaison de listes', () => {
  it('sélection : sélectionné OU ouvert, comme avant', () => {
    const tracks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, {}]
    expect(selectionMask(tracks, new Set(['b']), null)).toBe('0101') // le bloc sans id : voir ci-dessous
    expect(selectionMask(tracks, new Set(), { id: 'c' })).toBe('0010')
    expect(selectionMask(tracks, new Set(['a']), { id: 'a' })).toBe('1000')
    // Ancienne règle : un bloc sans id est « ouvert » quand aucun bloc n'est ouvert (undefined === undefined)
    for (const editing of [null, { id: 'c' }]) {
      const old = tracks.map(t => (new Set(['b']).has(t.id) || t.id === editing?.id) ? '1' : '0').join('')
      expect(selectionMask(tracks, new Set(['b']), editing)).toBe(old)
    }
    expect(selectionMask([], new Set(['a']), { id: 'a' })).toBe('')
  })
  it('table des sons : même résultat que find (le premier gagne), bibliothèque absente', () => {
    const lib = [{ id: 'x', n: 1 }, { id: 'y', n: 2 }, { id: 'x', n: 3 }]
    const lookup = buildSoundLookup(lib)
    for (const id of ['x', 'y', 'z', undefined]) expect(lookup.get(id)).toBe(lib.find(s => s.id === id))
    expect(buildSoundLookup(undefined).size).toBe(0)
  })
  it('sameItems : mêmes objets dans le même ordre', () => {
    const a = { id: 1 }, b = { id: 2 }
    expect(sameItems([a, b], [a, b])).toBe(true)
    expect(sameItems([a, b], [b, a])).toBe(false)
    expect(sameItems([a], [a, b])).toBe(false)
    expect(sameItems([a], [{ id: 1 }])).toBe(false)
    expect(sameItems([], [])).toBe(true)
    expect(sameItems(null, [])).toBe(false)
  })
})

describe('branchements dans la timeline (test « garde »)', () => {
  const src = fs.readFileSync(path.resolve('src/components/admin/UnifiedSegmentsTimeline.jsx'), 'utf8')
  const names = src.match(/const ROW_HANDLER_NAMES = \[([^\]]*)\]/)[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean)
  const handlersBlock = src.slice(src.indexOf('  const rowHandlers = {'), src.indexOf('  }', src.indexOf('  const rowHandlers = {')))
  const rowProps = src.slice(src.indexOf('<SegmentTimelineRow\n'), src.indexOf('/>', src.indexOf('<SegmentTimelineRow\n')))
  it('chaque fonction de ligne passe par une fonction stable, et une seule fois', () => {
    const keys = [...handlersBlock.matchAll(/^\s{4}(\w+): \w+,$/gm)].map(m => m[1])
    expect(keys.length).toBeGreaterThan(30)
    expect([...keys].sort()).toEqual([...names].sort())
    expect(rowProps).toMatch(/\.\.\.stableRowHandlers,/)
    // Aucune de ces fonctions n'est repassée directement (elle remplacerait la version stable)
    for (const n of names) expect(rowProps).not.toMatch(new RegExp(`\\b${n}:`))
  })
  it('la ligne ne reçoit plus les listes complètes de blocs ni la sélection globale', () => {
    for (const p of ['soundTracks,', 'vfxTracks,', 'selectedSoundIds,', 'editingSoundTrack,', 'dragTargetCell,', 'vfxDragTarget,']) {
      expect(rowProps).not.toContain(`\n                    ${p}`)
    }
    for (const p of ['rowSoundTracks:', 'soundOccupancy:', 'soundSelection:', 'soundDragColumn:', 'rowVfxTracks:', 'vfxOccupancy:', 'vfxSelection:', 'vfxDragColumn:', 'soundLookup,']) {
      expect(rowProps).toContain(p)
    }
  })
})

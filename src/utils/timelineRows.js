// Fluidité de la timeline de l'admin (16/11/2026).
// Calculs faits UNE fois pour toute la timeline, au lieu d'être refaits par chaque ligne
// (avant : chaque ligne relisait tous les blocs, et pour chacun cherchait sa place parmi
// tous les segments — environ 8 s figées pour ouvrir un bloc dans une histoire de 300 segments).
// Chaque fonction donne exactement le même résultat que l'ancien calcul (voir les tests).

// Position de chaque segment. Même résultat que
// segments.findIndex(s => s.id === id || s._id === id) : le premier segment qui correspond gagne.
export function buildSegmentIndex(segments) {
  const map = new Map()
  segments.forEach((s, i) => {
    if (!map.has(s.id)) map.set(s.id, i)
    if (!map.has(s._id)) map.set(s._id, i)
  })
  return map
}

// Même résultat que getSegmentIndexFromId d'une ligne de la timeline (y compris le repli
// « seg_N » / « segment_N » pour un identifiant inconnu).
export function rowIndexOf(segmentIndex, segments, segmentId) {
  const idx = segmentIndex.get(segmentId)
  if (idx !== undefined) return idx
  const match = segmentId?.match(/^seg(?:ment)?_(\d+)$/)
  if (match) {
    const index = parseInt(match[1], 10)
    if (index >= 0 && index < segments.length) return index
  }
  return -1
}

// Table des sons de la bibliothèque. Même résultat que soundLibrary.find(s => s.id === id).
export function buildSoundLookup(soundLibrary) {
  const map = new Map()
  ;(soundLibrary || []).forEach((s) => {
    if (!map.has(s.id)) map.set(s.id, s)
  })
  return map
}

const NO_TRACKS = Object.freeze([])

// Pour chaque ligne : les blocs qui y commencent (dans l'ordre de la liste), et l'occupation
// des colonnes sous forme de texte ('0' libre, '1' occupée), par exemple '0100000'.
// Même règle qu'avant : une colonne est occupée si un bloc de cette colonne va de son début
// à sa fin (ou son début seul si la fin est introuvable) en passant par la ligne.
export function buildRowLayout(tracks, segments, segmentIndex, columnCount) {
  const n = segments.length
  const starts = new Array(n)
  const occ = Array.from({ length: n }, () => new Uint8Array(columnCount))
  for (const track of tracks || []) {
    const startIdx = rowIndexOf(segmentIndex, segments, track.startSegmentId)
    const endIdx = rowIndexOf(segmentIndex, segments, track.endSegmentId)
    if (startIdx >= 0 && startIdx < n) (starts[startIdx] || (starts[startIdx] = [])).push(track)
    const col = track.column
    if (!(typeof col === 'number' && Number.isInteger(col) && col >= 0 && col < columnCount)) continue
    const trackEnd = endIdx !== -1 ? endIdx : startIdx
    const lo = Math.max(0, startIdx)
    const hi = Math.min(n - 1, trackEnd)
    for (let i = lo; i <= hi; i++) occ[i][col] = 1
  }
  const rows = new Array(n)
  for (let i = 0; i < n; i++) rows[i] = { tracks: starts[i] || NO_TRACKS, occupancy: occ[i].join('') }
  return rows
}

// Deux listes de blocs identiques (mêmes blocs, même ordre) : la ligne n'a pas besoin d'être redessinée.
export function sameItems(a, b) {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// '1' pour chaque bloc de la ligne qui est sélectionné ou ouvert, sinon '0' (texte : comparable simplement).
export function selectionMask(rowTracks, selectedIds, editingTrack) {
  let mask = ''
  for (const t of rowTracks) mask += (selectedIds.has(t.id) || t.id === editingTrack?.id) ? '1' : '0'
  return mask
}

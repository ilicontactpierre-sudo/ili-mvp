// Ordre de téléchargement des sons : d'abord ceux dont on a besoin MAINTENANT, puis ceux qui
// arrivent, et en dernier ceux déjà passés (utiles seulement si le lecteur revient en arrière).
// Ne retient que les sons référencés par un bloc JOUABLE (comme getSoundsToPreload).
// Sans soundTracks (anciennes histoires), l'ordre d'origine est conservé.

function segmentIndexer(segments) {
  const m = new Map()
  segments.forEach((s, i) => {
    if (s?.id != null && !m.has(s.id)) m.set(s.id, i)
    if (s?._id != null && !m.has(s._id)) m.set(s._id, i)
  })
  return (id) => (m.has(id) ? m.get(id) : -1)
}

function playableRanges(story) {
  const idx = segmentIndexer(story?.segments ?? [])
  const out = []
  for (const t of story?.soundTracks ?? []) {
    if (t.muted || t.broken) continue
    const s = idx(t.startSegmentId)
    if (s === -1) continue
    const e = idx(t.endSegmentId)
    out.push({ soundId: t.soundId, s, e: e !== -1 ? e : s })
  }
  return out
}

// Rang du besoin d'un bloc vu depuis la position `start` : 0 = actif maintenant, 1 = à venir,
// 2 = déjà passé. `key` départage à l'intérieur d'un rang (plus petit = plus urgent).
function need(range, start) {
  if (range.s <= start && range.e >= start) return { rank: 0, key: range.s }
  if (range.s > start) return { rank: 1, key: range.s }
  return { rank: 2, key: start - range.e }
}

export function orderSoundsByNeed(story, startIndex = 0) {
  const sounds = story?.sounds ?? []
  if ((story?.soundTracks ?? []).length === 0) return sounds
  const best = new Map()
  for (const r of playableRanges(story)) {
    const n = need(r, startIndex)
    const cur = best.get(r.soundId)
    if (!cur || n.rank < cur.rank || (n.rank === cur.rank && n.key < cur.key)) best.set(r.soundId, n)
  }
  return sounds
    .filter((s) => best.has(s.id))
    .map((s, i) => ({ s, i, n: best.get(s.id) }))
    .sort((a, b) => a.n.rank - b.n.rank || a.n.key - b.n.key || a.i - b.i)
    .map((x) => x.s)
}

// Identifiants des sons nécessaires pour DÉMARRER à `startIndex` : ceux des blocs actifs
// maintenant et ceux qui commencent dans les `lookahead` segments suivants.
export function getStartSoundIds(story, startIndex = 0, lookahead = 3) {
  if ((story?.soundTracks ?? []).length === 0) return (story?.sounds ?? []).map((s) => s.id)
  const ids = new Set()
  for (const r of playableRanges(story)) {
    const active = r.s <= startIndex && r.e >= startIndex
    const soon = r.s > startIndex && r.s <= startIndex + lookahead
    if (active || soon) ids.add(r.soundId)
  }
  return [...ids]
}

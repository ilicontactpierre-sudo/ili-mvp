// Tranche d'orchestration : n'envoyer à Claude qu'une partie de l'histoire (ex. segments 51 à 100),
// avec la numérotation de l'histoire entière, quelques segments de contexte de chaque côté,
// et un résumé des sons déjà posés.
//
// Fonctions pures (aucun état, aucun React) : utilisées par OrchestrationPanel (prompt, analyse)
// et OrchestrationRangePicker (barre, résumé). Les numéros de segment sont comptés à partir de 1,
// comme dans le prompt ; les index de tableau à partir de 0.

export const DEFAULT_RANGE_SIZE = 50
export const CONTEXT_SIZE = 5

const toInt = (v) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : null
}

// Bornes valides : 1 ≤ from ≤ to ≤ total.
export function clampRange(from, to, total) {
  if (!total || total < 1) return { from: 1, to: 1 }
  let f = toInt(from) ?? 1
  let t = toInt(to) ?? f
  f = Math.min(Math.max(f, 1), total)
  t = Math.min(Math.max(t, 1), total)
  if (t < f) t = f
  return { from: f, to: t }
}

export function defaultRange(total) {
  return clampRange(1, DEFAULT_RANGE_SIZE, total)
}

export function contextBounds({ from, to }, total, size = CONTEXT_SIZE) {
  return { ctxFrom: Math.max(1, from - size), ctxTo: Math.min(total, to + size) }
}

// Même largeur, juste après / juste avant.
export function nextRange({ from, to }, total) {
  const width = to - from + 1
  if (to >= total) return { from, to }
  return clampRange(to + 1, to + width, total)
}
export function prevRange({ from, to }, total) {
  const width = to - from + 1
  if (from <= 1) return { from, to }
  return clampRange(Math.max(1, from - width), from - 1, total)
}

// Identifiant d'un segment, comme « Appliquer » le résout (seg.id, sinon seg_<index>).
const segId = (seg, idx) => (seg && typeof seg === 'object' && seg.id) || `seg_${idx}`

// Position (1, 2, …) de chaque bloc son. Un bloc dont le début est introuvable est ignoré ;
// une fin introuvable vaut le début (comme le lecteur).
export function trackSpans(segments, soundTracks) {
  const index = new Map()
  ;(segments || []).forEach((seg, i) => {
    const id = segId(seg, i)
    if (!index.has(id)) index.set(id, i)
  })
  const spans = []
  for (const track of soundTracks || []) {
    const s = index.get(track.startSegmentId)
    if (s === undefined) continue
    const e0 = index.get(track.endSegmentId)
    const e = e0 === undefined || e0 < s ? s : e0
    spans.push({ track, start: s + 1, end: e + 1 })
  }
  return spans
}

// Nombre de blocs actifs sur chaque segment (tableau de longueur total, index 0 = segment 1).
// Un seul passage : coût proportionnel au nombre de segments + nombre de blocs.
export function coverageCounts(spans, total) {
  const diff = new Array(total + 1).fill(0)
  for (const { start, end } of spans) {
    if (start > total) continue
    diff[start - 1] += 1
    diff[Math.min(end, total)] -= 1
  }
  const counts = new Array(total)
  let run = 0
  for (let i = 0; i < total; i++) { run += diff[i]; counts[i] = run }
  return counts
}

// Fin conseillée : si un chapitre commence à 10 segments ou moins de la fin choisie,
// proposer de finir juste avant lui (tranche d'au moins 10 segments). Le plus proche gagne.
export function suggestEnd(segments, { from, to }, maxDistance = 10) {
  let best = null
  ;(segments || []).forEach((seg, i) => {
    if (!(seg && typeof seg === 'object' && seg.isChapter === true)) return
    const end = i // numéro du segment juste avant le chapitre (i + 1 - 1)
    if (end === to || end < from + 9) return
    const dist = Math.abs(end - to)
    if (dist > maxDistance) return
    if (!best || dist < best.dist) best = { to: end, chapterAt: i + 1, dist }
  })
  return best ? { to: best.to, chapterAt: best.chapterAt } : null
}

// Nom court d'un bloc : mot-clé de Claude, sinon nom du son, sinon son identifiant.
export function trackLabel(track, labelsById) {
  return track._orchestrationKeyword || labelsById?.get(track.soundId) || String(track.soundId || '?')
}

// Noms des sons utilisés par les blocs : un seul passage sur la bibliothèque,
// limité aux sons qui n'ont pas de mot-clé de Claude.
export function soundLabelsFor(soundTracks, soundLibrary) {
  const wanted = new Set()
  for (const t of soundTracks || []) if (!t._orchestrationKeyword && t.soundId) wanted.add(t.soundId)
  const labels = new Map()
  if (wanted.size === 0) return labels
  for (const s of soundLibrary || []) {
    if (wanted.has(s.id)) {
      labels.set(s.id, s.label || s.id)
      if (labels.size === wanted.size) break
    }
  }
  return labels
}

const spanText = ({ start, end }) => (start === end ? String(start) : `${start}→${end}`)

// Ce que Claude doit savoir des sons déjà posés, par rapport à la tranche.
//  entry  : actifs au premier segment de la tranche, commencés avant elle
//  exit   : posés avant ou dans la tranche et qui continuent après sa fin (hors « entry »)
//  after  : tous ceux qui touchent l'après-tranche (commencent ≤ fin et finissent après, ou commencent après)
//  inside : commencent dans la tranche
//  used   : tous les sons de l'histoire, regroupés par nom, avec leurs positions
export function rangeSummary(spans, { from, to }, labelsById) {
  const item = (sp) => ({
    label: trackLabel(sp.track, labelsById),
    layer: sp.track._orchestrationLayer || '',
    span: spanText(sp),
    start: sp.start,
    end: sp.end,
    volume: sp.track.volume,
    loop: !!sp.track.loop,
    muted: !!sp.track.muted,
  })
  const sorted = spans.slice().sort((a, b) => a.start - b.start || a.end - b.end)
  const entry = sorted.filter((sp) => sp.start < from && sp.end >= from).map(item)
  const exit = sorted.filter((sp) => sp.start >= from && sp.start <= to && sp.end > to).map(item)
  const after = sorted.filter((sp) => sp.end > to).map(item)
  const inside = sorted.filter((sp) => sp.start >= from && sp.start <= to).map(item)
  const usedMap = new Map()
  for (const sp of sorted) {
    const label = trackLabel(sp.track, labelsById)
    if (!usedMap.has(label)) usedMap.set(label, [])
    usedMap.get(label).push(spanText(sp))
  }
  const used = [...usedMap.entries()].map(([label, places]) => ({ label, places }))
  return { entry, exit, after, inside, used }
}

// Empreinte des segments 1 → jusqu'à la fin du contexte après la tranche, prise au moment
// de générer le prompt. Si elle change (segment ajouté, supprimé, pause insérée avant ou dans
// la tranche), les numéros donnés par Claude ne tombent plus sur les bons segments.
// Un ajout APRÈS la tranche et son contexte ne change rien aux numéros : pas d'alerte.
const segKey = (seg, idx) => {
  if (seg && typeof seg === 'object') return seg.id || `seg_${idx}:${seg.pause != null ? 'p' + seg.pause : seg.text || ''}`
  return `txt:${String(seg ?? '')}`
}
export function rangeFingerprint(segments, range) {
  const total = (segments || []).length
  const { ctxTo } = contextBounds(range, total)
  const keys = []
  for (let i = 0; i < ctxTo; i++) keys.push(segKey(segments[i], i))
  return { upTo: ctxTo, keys }
}
export function fingerprintChanged(fingerprint, segments) {
  if (!fingerprint) return false
  if ((segments || []).length < fingerprint.upTo) return true
  for (let i = 0; i < fingerprint.upTo; i++) {
    if (segKey(segments[i], i) !== fingerprint.keys[i]) return true
  }
  return false
}

// Un bloc proposé par Claude est-il entièrement dans la tranche ?
export function blockInRange(block, { from, to }) {
  const s = Number(block?.startSegment)
  const e = block?.endSegment == null ? s : Number(block.endSegment)
  return Number.isInteger(s) && Number.isInteger(e) && s >= from && e <= to && s <= e
}
// Une pause « après le segment n » est dans la tranche si n est dans la tranche.
export function pauseInRange(afterSegment, { from, to }) {
  return Number.isInteger(afterSegment) && afterSegment >= from && afterSegment <= to
}

// ── Fin du prompt pour une tranche ─────────────────────────────────────────
// Remplace, dans buildExportPrompt, la partie « ## Texte à orchestrer » quand une tranche est choisie.
// Les lignes de texte gardent exactement le format du prompt complet (même numéro, même « (chapitre) »).
const segText = (seg) => {
  if (typeof seg === 'string') return seg
  if (seg && typeof seg.text === 'string') return seg.text
  return ''
}
const describeBlock = (b) => {
  const parts = [b.span]
  if (typeof b.volume === 'number') parts.push(`volume ${Math.round(b.volume * 100) / 100}`)
  if (b.loop) parts.push('en boucle')
  if (b.muted) parts.push('coupé')
  return `${b.layer ? b.layer + ' ' : ''}« ${b.label} » — ${parts.join(', ')}`
}
export function rangePromptLines(segments, range, soundTracks, soundLibrary) {
  const total = (segments || []).length
  const { from, to } = clampRange(range.from, range.to, total)
  const { ctxFrom, ctxTo } = contextBounds({ from, to }, total)
  const spans = trackSpans(segments, soundTracks)
  const sum = rangeSummary(spans, { from, to }, soundLabelsFor(soundTracks, soundLibrary))
  const list = (items) => items.map((b) => `${b.label} (${b.span})`).join(', ')
  const L = []
  L.push(`## Tranche à orchestrer : segments ${from} à ${to} (l'histoire en compte ${total})`)
  L.push('')
  L.push('Ce prompt ne couvre qu\'une partie de l\'histoire. Les numéros sont ceux de l\'histoire entière : garde-les tels quels.')
  L.push(`Place tes sons et tes pauses UNIQUEMENT entre les segments ${from} et ${to} : \`startSegment\`, \`endSegment\` et \`afterSegment\` compris dans cette plage. Tout ce qui en sort sera ignoré.`)
  L.push('Les segments marqués « (contexte) » servent seulement à comprendre l\'enchaînement avec ce qui précède et ce qui suit : n\'y place rien.')
  L.push('')
  L.push('## Sons déjà en place')
  L.push('')
  L.push('Actifs au début de la tranche (ils continuent : ne les recrée pas ; si l\'un doit durer après sa fin, crée un bloc qui prend le relais et dis-le dans `note`) :')
  if (sum.entry.length) sum.entry.forEach((b) => L.push(`- ${describeBlock(b)}`))
  else L.push('- aucun')
  L.push(`Déjà posés après la fin de la tranche : ${sum.after.length ? list(sum.after) : 'aucun'}`)
  if (sum.inside.length) L.push(`Déjà posés DANS la tranche (ne les duplique pas) : ${list(sum.inside)}`)
  L.push('Sons déjà utilisés dans l\'histoire (évite de les répéter ; une reprise se justifie dans `reprise`) :')
  L.push(sum.used.length ? sum.used.map((u) => `${u.label} (${u.places.join(', ')})`).join(' · ') : 'aucun')
  L.push('')
  L.push('---')
  L.push(`## Texte à orchestrer (segments ${from} à ${to}, avec ${from - ctxFrom} + ${ctxTo - to} segments de contexte)`)
  L.push('')
  for (let i = ctxFrom - 1; i < ctxTo; i++) {
    const seg = segments[i]
    const ctx = i + 1 < from || i + 1 > to
    const tag = ctx ? ' (contexte)' : ''
    const isChapter = seg && typeof seg === 'object' && seg.isChapter === true
    const pauseMs = seg && typeof seg === 'object' && seg.pause != null ? seg.pause : null
    if (pauseMs != null) {
      L.push(ctx
        ? `[${i + 1}]${tag} ⏸ PAUSE existante — ${pauseMs}ms`
        : `[${i + 1}] ⏸ PAUSE existante — ${pauseMs}ms — un blocson peut y être placé ou prolongé`)
      continue
    }
    const text = segText(seg).trim()
    if (text) L.push(`[${i + 1}]${tag}${isChapter ? ' (chapitre)' : ''} ${text}`)
  }
  return L
}

// Tranche suivante après « Appliquer » : les pauses insérées dans la tranche ont décalé
// d'autant tout ce qui suit.
export function rangeAfterApply(range, insertedPauses, newTotal) {
  const width = range.to - range.from + 1
  const shiftedTo = range.to + (insertedPauses || 0)
  if (shiftedTo >= newTotal) return clampRange(range.from, shiftedTo, newTotal)
  return clampRange(shiftedTo + 1, shiftedTo + width, newTotal)
}

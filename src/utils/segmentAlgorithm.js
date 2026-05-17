// ══════════════════════════════════════════════════════════════════════════════
// segmentAlgorithm.js — Moteur de découpage narratif heuristique
// Version 2.1 — Sans IA, sans random pur, sans magic numbers arbitraires
// ══════════════════════════════════════════════════════════════════════════════
//
// PIPELINE :
//   0. normalizeText       → normalisation unicode (...→…, tirets, etc.)
//   1. parseIntoUnits      → unités atomiques typées depuis le texte brut
//                            RÈGLE : une ligne native = une unité (jamais coupée
//                            en milieu de ligne sauf si > MAX_CHARS)
//   2. scoreUnits          → score narratif par unité (isolation, tension, continuité)
//   3. detectBeats         → détection des beats dramatiques (révélation, punchline…)
//   4. composeSegments     → assemblage déterministe basé sur les scores et beats
//   5. enforceRhythmCadence→ anti-monotonie, équilibrage du rythme global
//   6. serializeSegments   → conversion finale en tableau de strings
//
// ══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Limite absolue de caractères par segment (espaces compris)
  MAX_CHARS: 254,

  // Seuil pour qu'une unité soit "courte" (isolation potentielle)
  SHORT_UNIT_THRESHOLD: 60,

  // Seuil pour qu'une unité soit "très courte" (beat fort)
  VERY_SHORT_UNIT_THRESHOLD: 45,

  // Seuil pour qu'une unité soit "longue"
  LONG_UNIT_THRESHOLD: 100,

  // Nombre de segments longs consécutifs avant respiration forcée
  CONSECUTIVE_LONG_BEFORE_BREATH: 3,

  // Score d'isolation au-dessus duquel une unité est isolée (granularité ≤ 7)
  ISOLATION_THRESHOLD: 0.62,

  // Nombre max d'unités d'accélération par segment
  MAX_ACCELERATION_UNITS: 2,

  // Mots déclencheurs de tension (lexique heuristique)
  TENSION_WORDS: [
    'sait', 'impossible', 'peur', 'serre', 'fige', 'jamais', 'perdu',
    'alerte', 'danger', 'dernière', 'dernier', 'fin', 'mort', 'seul',
    'seule', 'silence', 'immobile', 'figée', 'figé', 'tremble', 'tremblement',
    'bruit', 'cri', 'crie', 'hurle', 'fuit', 'fuir', 'trop tard',
  ],

  // Conjonctions indiquant une continuité avec l'unité précédente
  CONTINUITY_CONJUNCTIONS: [
    'et ', 'mais ', 'car ', 'donc ', 'or ', 'ni ', 'quand ',
    'lorsque ', 'comme ', 'alors ', 'pourtant ', 'cependant ', 'ainsi ',
  ],

  // Verbes d'action courte isolables
  ACTION_VERBS: [
    'éclate', 'se lève', 'se lance', 'se fige', 'sourit', 'pleure',
    'rit', 'tombe', 'crie', 'hurle', 'court', 'fuit', 'disparaît',
    'arrive', 'entre', 'sort', 'part', 'revient', 'ouvre', 'ferme',
  ],

  // Nombre max d'unités par segment selon la granularité (1→10)
  maxUnitsForGranularity(g) {
    return Math.min(10, Math.floor(1 + (g - 1) * 0.78))
  },
}


// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

const UNIT_TYPE = {
  CHAPTER_HEADER: 'chapter_header',  // "Chapitre X" ou "CHAPITRE X"
  DIALOGUE_LINE:  'dialogue_line',   // commence par - ou —
  DIALOGUE_QUOTE: 'dialogue_quote',  // contient « »
  ENUMERATION:    'enumeration',     // liste avec ≥ 3 virgules ou puces •
  SCENE_END:      'scene_end',       // dernière unité avant PARAGRAPH_BREAK
  SHORT_BEAT:     'short_beat',      // < VERY_SHORT_UNIT_THRESHOLD, action simple
  NARRATIVE:      'narrative',       // narration standard
}

const BEAT_TYPE = {
  REVELATION:   'revelation',   // info qui change tout — toujours seule
  PUNCHLINE:    'punchline',    // chute courte après montée — toujours seule
  BREATH:       'breath',       // respiration après densité — toujours seule
  ACCELERATION: 'acceleration', // séquence rapide — groupes de 1-2 unités
  SCENE_CLOSE:  'scene_close',  // fermeture de scène — toujours seule
}

const PARAGRAPH_MARKER = '---PARAGRAPH_BREAK---'


// ══════════════════════════════════════════════════════════════════════════════
// PHASE 0 — NORMALISATION DU TEXTE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Normalise le texte brut avant tout parsing.
 *
 * Règles :
 *   - "..." (3 points ASCII) → "…" (ellipse Unicode, insécable)
 *   - ".." (2 points)        → "…" (faute de frappe fréquente)
 *   - Espaces multiples      → espace simple
 *   - Trim de chaque ligne   (sans supprimer les sauts de ligne natifs)
 */
function normalizeText(text) {
  return text
    // Trois points ASCII → ellipse unicode (AVANT toute autre règle)
    .replace(/\.{3,}/g, '…')
    // Deux points ASCII consécutifs → ellipse
    .replace(/\.{2}/g, '…')
    // Espaces multiples sur une même ligne → espace simple
    .replace(/[ \t]{2,}/g, ' ')
    // Trim de chaque ligne sans supprimer les sauts de ligne
    .split('\n')
    .map(line => line.trim())
    .join('\n')
}


// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — PARSING : découpe en unités atomiques typées
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Découpe le texte normalisé en unités atomiques.
 *
 * PRINCIPE FONDAMENTAL :
 *   Une ligne native du texte = une unité atomique.
 *   On ne découpe JAMAIS à l'intérieur d'une ligne sauf si elle dépasse
 *   MAX_CHARS, auquel cas on coupe au dernier point de ponctuation valide
 *   avant la limite — jamais en milieu de phrase.
 *
 *   Cela garantit :
 *   - le respect des sauts de ligne natifs (dialogues, poésie, listes)
 *   - l'absence de coupure en pleine phrase
 *   - la préservation des ellipses (normalisées en …)
 */
function parseIntoUnits(text) {
  const rawUnits = []

  // Paragraphes séparés par une ou plusieurs lignes vides
  const paragraphs = text.split(/\n\s*\n/)

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue

    const lines = paragraph.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Ligne dans la limite → unité unique (cas normal)
      const isDialogueLine = /^[-—]/.test(trimmed)

// Les lignes de dialogue ne sont JAMAIS coupées (sauf si > MAX_CHARS, auquel
// cas splitLongLine coupe au dernier point valide = "le plus tardivement possible")
      if (trimmed.length <= CONFIG.MAX_CHARS || isDialogueLine) {
        rawUnits.push(trimmed)
        continue
      }

      const chunks = splitLongLine(trimmed)
      for (const chunk of chunks) {
        if (chunk.trim()) rawUnits.push(chunk.trim())
      }
    }

    rawUnits.push(PARAGRAPH_MARKER)
  }

  // Retirer les marqueurs de paragraphe en fin de tableau
  while (
    rawUnits.length > 0 &&
    rawUnits[rawUnits.length - 1] === PARAGRAPH_MARKER
  ) {
    rawUnits.pop()
  }

  // Typer chaque unité
  const typedUnits = []
  for (let i = 0; i < rawUnits.length; i++) {
    const raw = rawUnits[i]
    if (raw === PARAGRAPH_MARKER) continue

    const isLastBeforeParagraphBreak =
      rawUnits[i + 1] === PARAGRAPH_MARKER || i === rawUnits.length - 1

    typedUnits.push({
      text: raw,
      type: classifyUnit(raw, isLastBeforeParagraphBreak),
      isLastBeforeParagraphBreak,
      scores: null,
    })
  }

  return mergeFragments(typedUnits)
}

/**
 * Fusionne les unités-fragments avec l'unité suivante.
 * Un fragment = unité ne se terminant pas par une ponctuation de fin de phrase.
 * Itère jusqu'à ce qu'il n'y ait plus de fragments internes.
 *
 * Règles :
 *  - Ne fusionne JAMAIS à travers une frontière de paragraphe
 *  - Ne fusionne JAMAIS un en-tête de chapitre
 *  - Fusionne tant que des fragments existent (chaînes de fragments gérées)
 */
function mergeFragments(typedUnits) {
  const isSentenceEnd = (text) =>
    /[.!?…;:»'")\]]$/.test(text.trim())

  let units = typedUnits
  let changed = true

  while (changed) {
    changed = false
    const result = []
    let i = 0

    while (i < units.length) {
      const unit = units[i]

      const isFragment =
        !isSentenceEnd(unit.text) &&
        !unit.isLastBeforeParagraphBreak &&
        unit.type !== UNIT_TYPE.CHAPTER_HEADER

      if (isFragment && i + 1 < units.length) {
        const next = units[i + 1]
        const mergedText = unit.text + ' ' + next.text

        result.push({
          text: mergedText,
          type: classifyUnit(mergedText, next.isLastBeforeParagraphBreak),
          isLastBeforeParagraphBreak: next.isLastBeforeParagraphBreak,
          scores: null,
        })

        i += 2
        changed = true
      } else {
        result.push(unit)
        i++
      }
    }

    units = result
  }

  return units
}
/**
 * Coupe une ligne trop longue (> MAX_CHARS) au dernier point de ponctuation
 * valide avant la limite. Ne coupe jamais en milieu de mot.
 *
 * Ponctuation de coupure valide : . ! ? ; suivi d'un espace ou fin de chaîne.
 * Les ellipses (…) ne sont PAS des points de coupure — elles font partie
 * du flux de la phrase.
 */
function splitLongLine(line) {
  const chunks = []
  let remaining = line

  while (remaining.length > CONFIG.MAX_CHARS) {
    let bestCut = -1

    // Chercher le dernier point de coupure valide avant MAX_CHARS
    for (let i = CONFIG.MAX_CHARS - 1; i >= 1; i--) {
      const char = remaining[i]
      const next = remaining[i + 1]

      // Ponctuation forte (hors ellipse) suivie d'espace ou fin → coupure valide
      if (
        '.!?;'.includes(char) &&
        remaining[i - 1] !== '.' &&
        remaining[i - 1] !== '…' &&   // ne pas couper juste après une ellipse
        (next === ' ' || next === undefined)
      ) {
        bestCut = i + 1
        break
      }
    }

    if (bestCut <= 0) {
      // Aucun point de coupure valide → coupure au dernier espace (dernier recours)
      let spacePos = -1
      for (let i = CONFIG.MAX_CHARS - 1; i >= 0; i--) {
        if (remaining[i] === ' ') {
          spacePos = i
          break
        }
      }
      bestCut = spacePos > 0 ? spacePos : CONFIG.MAX_CHARS
    }

    chunks.push(remaining.substring(0, bestCut).trim())
    remaining = remaining.substring(bestCut).trim()
  }

  if (remaining) chunks.push(remaining)
  return chunks
}

/**
 * Classe une unité textuelle selon son type narratif.
 */
function classifyUnit(text, isLastBeforeParagraphBreak) {
  const t = text.trim()

  // En-tête de chapitre
  if (/^(chapitre|CHAPITRE)\b/i.test(t)) {
    return UNIT_TYPE.CHAPTER_HEADER
  }

  // Réplique de dialogue : commence par - ou — (tiret de dialogue français)
  if (/^[-—]/.test(t)) {
    return UNIT_TYPE.DIALOGUE_LINE
  }

  // Dialogue entre guillemets « »
  if (t.includes('«') && t.includes('»')) {
    return UNIT_TYPE.DIALOGUE_QUOTE
  }

  // Énumération : ≥ 3 virgules ou puce •
  const commaCount = (t.match(/,/g) || []).length
  if (commaCount >= 3 || t.includes('•')) {
    return UNIT_TYPE.ENUMERATION
  }

  // Fin de scène (dernière unité avant saut de paragraphe)
  if (isLastBeforeParagraphBreak) {
    return UNIT_TYPE.SCENE_END
  }

  // Beat court : très court + ponctuation conclusive
  if (t.length < CONFIG.VERY_SHORT_UNIT_THRESHOLD && /[.!?…]$/.test(t)) {
    return UNIT_TYPE.SHORT_BEAT
  }

  return UNIT_TYPE.NARRATIVE
}


// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — SCORING : score narratif par unité
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule les 3 scores narratifs de chaque unité.
 *
 * isolationScore  : [0..1] — l'unité doit-elle être seule dans un segment ?
 * tensionScore    : [0..1] — l'unité porte-t-elle une charge dramatique forte ?
 * continuityScore : [0..1] — l'unité doit-elle rester groupée avec la suivante ?
 */
function scoreUnit(unit, index, allUnits) {
  const t = unit.text.trim()
  const tLower = t.toLowerCase()
  const prev = allUnits[index - 1] || null
  const next = allUnits[index + 1] || null

  // ── ISOLATION ──────────────────────────────────────────────────────────────
  let isolation = 0

  // Phrase courte conclusive
  if (t.length < CONFIG.SHORT_UNIT_THRESHOLD && /[.!?…]$/.test(t)) {
    isolation += 0.35
  }

  // Verbe d'action simple (frappe dramatique)
  if (CONFIG.ACTION_VERBS.some(v => tLower.includes(v))) {
    isolation += 0.30
  }

  // Ponctuation émotionnelle forte
  if (/[!?…]$/.test(t)) isolation += 0.15

  // Révélation : contenu court après deux-points
  if (/:\s/.test(t) && t.length < 90) isolation += 0.20

  // Dialogue
  if (unit.type === UNIT_TYPE.DIALOGUE_LINE) isolation += 0.25
  if (unit.type === UNIT_TYPE.DIALOGUE_QUOTE) isolation += 0.15

  // Fin de scène
  if (unit.type === UNIT_TYPE.SCENE_END) isolation += 0.50

  // En-tête de chapitre : isolation totale
  if (unit.type === UNIT_TYPE.CHAPTER_HEADER) isolation = 1.0

  // Très court après très long : pic de tension visuel
  if (
    prev &&
    prev.text.length > CONFIG.LONG_UNIT_THRESHOLD &&
    t.length < CONFIG.VERY_SHORT_UNIT_THRESHOLD
  ) {
    isolation += 0.30
  }

  // ── TENSION ────────────────────────────────────────────────────────────────
  let tension = 0

  const tensionMatches = CONFIG.TENSION_WORDS.filter(w => tLower.includes(w))
  tension += Math.min(tensionMatches.length * 0.18, 0.54)

  // Phrase courte après longue = pic de tension
  if (
    prev &&
    prev.text.length > CONFIG.LONG_UNIT_THRESHOLD &&
    t.length < CONFIG.SHORT_UNIT_THRESHOLD
  ) {
    tension += 0.28
  }

  // Ponctuation forte = charge émotionnelle
  if (/[!?…]$/.test(t)) tension += 0.15

  // ── CONTINUITÉ ─────────────────────────────────────────────────────────────
  let continuity = 0

  // Se termine par virgule ou deux-points → appartient à la suite
  if (/[,:]$/.test(t)) continuity += 0.55

  // Commence par une conjonction
  if (CONFIG.CONTINUITY_CONJUNCTIONS.some(c => tLower.startsWith(c))) {
    continuity += 0.45
  }

  // Fait partie d'une énumération
  if (unit.type === UNIT_TYPE.ENUMERATION) continuity += 0.35

  // Longueur similaire à la précédente → rythme de lecture régulier
  if (prev && Math.abs(prev.text.length - t.length) < 25) {
    continuity += 0.18
  }

  // Un dialogue ne continue pas vers de la narration
  if (
    unit.type === UNIT_TYPE.DIALOGUE_LINE &&
    next &&
    next.type === UNIT_TYPE.NARRATIVE
  ) {
    continuity = Math.max(0, continuity - 0.40)
  }

  return {
    isolation:  Math.min(isolation, 1),
    tension:    Math.min(tension, 1),
    continuity: Math.min(continuity, 1),
  }
}

/**
 * Applique scoreUnit sur toutes les unités et retourne le tableau enrichi.
 */
function scoreUnits(typedUnits) {
  return typedUnits.map((unit, i, arr) => ({
    ...unit,
    scores: scoreUnit(unit, i, arr),
  }))
}


// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — BEATS : détection des moments narratifs clés
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Retourne une Map<index, BEAT_TYPE> indiquant le beat de chaque unité concernée.
 */
function detectBeats(scoredUnits) {
  const beats = new Map()

  for (let i = 0; i < scoredUnits.length; i++) {
    const u = scoredUnits[i]
    const prev = scoredUnits[i - 1] || null
    const next = scoredUnits[i + 1] || null

    // ── FIN DE SCÈNE — priorité absolue
    if (u.type === UNIT_TYPE.SCENE_END) {
      beats.set(i, BEAT_TYPE.SCENE_CLOSE)
      continue
    }

    // ── EN-TÊTE DE CHAPITRE
    if (u.type === UNIT_TYPE.CHAPTER_HEADER) {
      beats.set(i, BEAT_TYPE.REVELATION)
      continue
    }

    // ── RÉVÉLATION : isolation élevée + après longue unité
    if (
      u.scores.isolation > 0.70 &&
      prev &&
      prev.text.length > CONFIG.LONG_UNIT_THRESHOLD
    ) {
      beats.set(i, BEAT_TYPE.REVELATION)
      continue
    }

    // ── PUNCHLINE : très court + tension + SHORT_BEAT
    if (
      u.type === UNIT_TYPE.SHORT_BEAT &&
      u.scores.tension > 0.35 &&
      u.text.length < CONFIG.VERY_SHORT_UNIT_THRESHOLD
    ) {
      beats.set(i, BEAT_TYPE.PUNCHLINE)
      continue
    }

    // ── RESPIRATION : après N unités longues consécutives, unité courte
    if (i >= CONFIG.CONSECUTIVE_LONG_BEFORE_BREATH) {
      const precedingUnits = scoredUnits.slice(
        i - CONFIG.CONSECUTIVE_LONG_BEFORE_BREATH,
        i
      )
      const allLong = precedingUnits.every(
        pu => pu.text.length > CONFIG.LONG_UNIT_THRESHOLD
      )
      if (allLong && u.text.length < CONFIG.SHORT_UNIT_THRESHOLD) {
        beats.set(i, BEAT_TYPE.BREATH)
        continue
      }
    }

    // ── ACCÉLÉRATION : énumérations ou courts consécutifs
    if (
      u.type === UNIT_TYPE.ENUMERATION ||
      (u.text.length < CONFIG.SHORT_UNIT_THRESHOLD &&
        next &&
        next.text.length < CONFIG.SHORT_UNIT_THRESHOLD)
    ) {
      beats.set(i, BEAT_TYPE.ACCELERATION)
    }
  }

  return beats
}


// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — COMPOSITION : assemblage déterministe des segments
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Compose les segments finaux à partir des unités scorées et des beats.
 * Retourne un tableau de tableaux d'unités : Array<Array<ScoredUnit>>
 *
 * Règles de priorité (dans l'ordre) :
 *   1. REVELATION / PUNCHLINE / SCENE_CLOSE → toujours seuls
 *   2. BREATH → toujours seul
 *   3. DIALOGUE_LINE → toujours seul (jamais fusionné avec une autre réplique
 *      ou de la narration). Si > MAX_CHARS : déjà coupé en phase parsing.
 *   4. isolation > seuil (granularité ≤ 7) → seul
 *   5. ACCELERATION → groupes de 1-2 unités (sans dialogue)
 *   6. NARRATIVE → regroupement jusqu'à maxUnitsPerSegment
 */
function composeSegments(scoredUnits, beats, granularity) {
  const segments = []
  const maxUnits = CONFIG.maxUnitsForGranularity(granularity)
  let i = 0

  while (i < scoredUnits.length) {
    // Ajouter EN TÊTE du while de la règle 6, avant tous les "if ... break" :

// ── SÉCURITÉ FRAGMENT ──────────────────────────────────────────────────
// Si le dernier élément du groupe est un fragment (pas de ponctuation de fin),
// on force la fusion — les conditions normales de break ne s'appliquent pas.
const lastInGroup = group.length > 0 ? group[group.length - 1] : null
const prevIsFragment =
  lastInGroup !== null &&
  !/[.!?…;:»'")\]]$/.test(lastInGroup.text.trim())

if (prevIsFragment) {
  const totalCharsF = group.reduce((sum, gu) => sum + gu.text.length + 1, 0)
  if (totalCharsF + current.text.length <= CONFIG.MAX_CHARS) {
    group.push(current)
    i++
    continue  // ne pas évaluer les breaks normaux
  }
  // Si vraiment trop long, on accepte la coupure (cas extrême)
}
// ── FIN SÉCURITÉ FRAGMENT ──────────────────────────────────────────────
    const u = scoredUnits[i]
    const beat = beats.get(i)

    // ── RÈGLE 1 : beats forts → toujours seuls ─────────────────────────────
    if (
      beat === BEAT_TYPE.REVELATION ||
      beat === BEAT_TYPE.PUNCHLINE ||
      beat === BEAT_TYPE.SCENE_CLOSE
    ) {
      segments.push([u])
      i++
      continue
    }

    // ── RÈGLE 2 : respiration → seule ──────────────────────────────────────
    if (beat === BEAT_TYPE.BREATH) {
      segments.push([u])
      i++
      continue
    }

    // ── RÈGLE 3 : dialogue → toujours seul ─────────────────────────────────
    // Une réplique de dialogue ne se fusionne jamais avec quoi que ce soit.
    // Si elle dépasse MAX_CHARS, elle a déjà été découpée en parsing.
    if (u.type === UNIT_TYPE.DIALOGUE_LINE) {
      segments.push([u])
      i++
      continue
    }

    // ── RÈGLE 4 : isolation élevée (granularité ≤ 7) → seul ───────────────
    if (u.scores.isolation >= CONFIG.ISOLATION_THRESHOLD && granularity <= 7) {
      segments.push([u])
      i++
      continue
    }

    // ── RÈGLE 5 : accélération → groupes courts (sans dialogue) ───────────
    if (beat === BEAT_TYPE.ACCELERATION) {
      const accelGroup = []

      while (
        i < scoredUnits.length &&
        beats.get(i) === BEAT_TYPE.ACCELERATION &&
        accelGroup.length < Math.min(CONFIG.MAX_ACCELERATION_UNITS, maxUnits)
      ) {
        const cur = scoredUnits[i]
        if (cur.type === UNIT_TYPE.DIALOGUE_LINE) break

        const totalChars = accelGroup.reduce(
          (sum, au) => sum + au.text.length + 1,
          0
        )
        if (totalChars + cur.text.length > CONFIG.MAX_CHARS) break

        accelGroup.push(cur)
        i++
      }

      if (accelGroup.length === 0) {
        segments.push([u])
        i++
      } else {
        segments.push(accelGroup)
      }
      continue
    }

    // ── RÈGLE 6 : narration standard → regroupement jusqu'à maxUnits ───────
    const group = []

    while (i < scoredUnits.length && group.length < maxUnits) {
      const current = scoredUnits[i]
      const currentBeat = beats.get(i)

      // Stop si beat fort
      if (
        currentBeat === BEAT_TYPE.REVELATION ||
        currentBeat === BEAT_TYPE.PUNCHLINE ||
        currentBeat === BEAT_TYPE.SCENE_CLOSE ||
        currentBeat === BEAT_TYPE.BREATH
      ) {
        break
      }

      // Stop si dialogue
      if (current.type === UNIT_TYPE.DIALOGUE_LINE) break

      // Stop si isolation élevée sur une unité autre que la première
      if (
        group.length > 0 &&
        current.scores.isolation >= CONFIG.ISOLATION_THRESHOLD &&
        granularity <= 7
      ) {
        break
      }

      // Stop si continuité faible entre deux unités consécutives
      if (group.length > 0) {
        const prevUnit = group[group.length - 1]
        if (
          prevUnit.scores.continuity < 0.20 &&
          current.scores.continuity < 0.20
        ) {
          break
        }
      }

      // Stop si MAX_CHARS dépassé
      const totalChars = group.reduce(
        (sum, gu) => sum + gu.text.length + 1,
        0
      )
      if (totalChars + current.text.length > CONFIG.MAX_CHARS) break

      group.push(current)
      i++
    }

    if (group.length === 0) {
      // Sécurité : ne jamais bloquer
      segments.push([u])
      i++
    } else {
      segments.push(group)
    }
  }

  return segments
}


// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — CADENCE : anti-monotonie et équilibrage global
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie le rythme global et insère des respirations si nécessaire.
 *
 * Règle : après N segments longs consécutifs, si le segment suivant est
 * lui-même long ET divisible (≥ 2 unités sans beat fort ni dialogue),
 * on le sépare pour créer une respiration naturelle.
 */
function enforceRhythmCadence(segments) {
  const result = []
  let consecutiveLong = 0

  for (let i = 0; i < segments.length; i++) {
    const group = segments[i]
    const totalChars = group.reduce((sum, u) => sum + u.text.length, 0)
    const isLong = totalChars > CONFIG.LONG_UNIT_THRESHOLD

    if (isLong) {
      consecutiveLong++
    } else {
      consecutiveLong = 0
    }

    result.push(group)

    // Après N longs consécutifs, sépare le segment suivant s'il est divisible
    if (
      consecutiveLong >= CONFIG.CONSECUTIVE_LONG_BEFORE_BREATH &&
      i + 1 < segments.length
    ) {
      const nextGroup = segments[i + 1]

      if (nextGroup.length >= 2) {
        const hasProtectedUnit = nextGroup.some(
          u =>
            u.type === UNIT_TYPE.SCENE_END ||
            u.type === UNIT_TYPE.CHAPTER_HEADER ||
            u.type === UNIT_TYPE.DIALOGUE_LINE
        )

        if (!hasProtectedUnit) {
          result.push([nextGroup[0]])
          if (nextGroup.length > 1) {
            result.push(nextGroup.slice(1))
          }
          i++
          consecutiveLong = 0
        }
      }
    }
  }

  return result
}


// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — SÉRIALISATION : conversion en tableau de strings
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convertit chaque groupe d'unités en string final.
 * Les unités d'un même groupe sont jointes par un espace.
 * Filtre les segments vides ou réduits à de la ponctuation seule.
 */
function serializeSegments(composedSegments) {
  return composedSegments
    .map(group => group.map(u => u.text).join(' ').trim())
    .filter(s => s.length > 0 && /[a-zA-ZÀ-ÿ\u0100-\u024F]/.test(s))
}


// ══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE — export public
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Découpe un texte narratif en segments rythmés pour lecture immersive.
 *
 * @param {string} text        — Texte brut à découper
 * @param {number} granularity — Slider de 1 (très court) à 10 (très long)
 * @returns {string[]}         — Tableau de segments prêts à l'affichage
 */
export function segmentText(text, granularity = 5) {
  if (!text || !text.trim()) return []

  // Clamp la granularité entre 1 et 10
  const g = Math.max(1, Math.min(10, Math.round(granularity)))

  // Phase 0 : normalisation unicode et typographique
  const normalized = normalizeText(text)

  // Phase 1 : parsing typé (une ligne native = une unité)
  const typedUnits = parseIntoUnits(normalized)
  if (typedUnits.length === 0) return []

  // Phase 2 : scoring narratif
  const scoredUnits = scoreUnits(typedUnits)

  // Phase 3 : détection des beats dramatiques
  const beats = detectBeats(scoredUnits)

  // Phase 4 : composition déterministe des segments
  const rawSegments = composeSegments(scoredUnits, beats, g)

  // Phase 5 : anti-monotonie et cadence globale
  const balancedSegments = enforceRhythmCadence(rawSegments)

  // Phase 6 : sérialisation finale
  return serializeSegments(balancedSegments)
}

export default segmentText
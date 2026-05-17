// ══════════════════════════════════════════════════════════════════════════════
// segmentAlgorithm.js — Moteur de découpage narratif heuristique
// Version 2.0 — Sans IA, sans random pur, sans magic numbers arbitraires
// ══════════════════════════════════════════════════════════════════════════════
//
// PIPELINE :
//   1. parseIntoUnits      → unités atomiques typées depuis le texte brut
//   2. scoreUnits          → score narratif par unité (isolation, tension, continuité)
//   3. detectBeats         → détection des beats dramatiques (révélation, punchline…)
//   4. composeSegments     → assemblage déterministe basé sur les scores et beats
//   5. enforceRhythmCadence→ anti-monotonie, équilibrage du rythme global
//   6. serializeSegments   → conversion finale en tableau de strings
//
// ══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// CONFIG — toutes les constantes en un seul endroit, aucun magic number ailleurs
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

  // Nombre max de répliques de dialogue par segment
  MAX_DIALOGUE_LINES_PER_SEGMENT: 2,

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
  // Calculé par : floor(1 + (g-1) * 0.78), plafonné à 10
  maxUnitsForGranularity(g) {
    return Math.min(10, Math.floor(1 + (g - 1) * 0.78))
  },
}


// ══════════════════════════════════════════════════════════════════════════════
// TYPES — constantes de typage des unités et des beats
// ══════════════════════════════════════════════════════════════════════════════

const UNIT_TYPE = {
  CHAPTER_HEADER:  'chapter_header',   // "Chapitre X" ou "CHAPITRE X"
  DIALOGUE_LINE:   'dialogue_line',    // commence par - ou —
  DIALOGUE_QUOTE:  'dialogue_quote',   // contient « »
  ENUMERATION:     'enumeration',      // liste avec ≥ 3 virgules ou puces
  SCENE_END:       'scene_end',        // dernière unité avant PARAGRAPH_BREAK
  SHORT_BEAT:      'short_beat',       // < VERY_SHORT_UNIT_THRESHOLD, action simple
  NARRATIVE:       'narrative',        // narration standard
}

const BEAT_TYPE = {
  REVELATION:   'revelation',    // info qui change tout — toujours seule
  PUNCHLINE:    'punchline',     // chute courte après montée — toujours seule
  BREATH:       'breath',        // respiration après densité — toujours seule
  ACCELERATION: 'acceleration',  // séquence rapide — groupes de 1-2 unités
  SCENE_CLOSE:  'scene_close',   // fermeture de scène — toujours seule
}

const PARAGRAPH_MARKER = '---PARAGRAPH_BREAK---'


// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — PARSING : découpe en unités atomiques typées
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Découpe le texte brut en unités atomiques (phrases) avec leurs métadonnées.
 * Retourne un tableau d'objets { text, type, isLastBeforeParagraphBreak }.
 */
function parseIntoUnits(text) {
  const rawUnits = []

  // Paragraphes séparés par une ou plusieurs lignes vides
  const paragraphs = text.split(/\n\s*\n/)

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue

    const lines = paragraph.split('\n')

    for (const line of lines) {
      if (!line.trim()) continue

      const phrases = splitIntoPhrases(line.trim())
      for (const phrase of phrases) {
        if (phrase.trim()) {
          rawUnits.push(phrase.trim())
        }
      }
    }

    rawUnits.push(PARAGRAPH_MARKER)
  }

  // Retirer le dernier marqueur de paragraphe
  if (rawUnits.length > 0 && rawUnits[rawUnits.length - 1] === PARAGRAPH_MARKER) {
    rawUnits.pop()
  }

  // Typer chaque unité en connaissant son contexte (suivante = marqueur ?)
  const typedUnits = []
  for (let i = 0; i < rawUnits.length; i++) {
    const raw = rawUnits[i]

    if (raw === PARAGRAPH_MARKER) continue // on ne garde pas les marqueurs

    const isLastBeforeParagraphBreak =
      rawUnits[i + 1] === PARAGRAPH_MARKER || i === rawUnits.length - 1

    typedUnits.push({
      text: raw,
      type: classifyUnit(raw, isLastBeforeParagraphBreak),
      isLastBeforeParagraphBreak,
      scores: null, // rempli en phase 2
    })
  }

  return typedUnits
}

/**
 * Découpe une ligne en phrases atomiques en respectant les guillemets « ».
 * Points de coupure : . ! ? … ; : (sauf à l'intérieur de « »)
 */
function splitIntoPhrases(line) {
  const phrases = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (char === '«') {
      inQuotes = true
      current += char
      i++
      continue
    }

    if (char === '»') {
      inQuotes = false
      current += char
      i++
      continue
    }

    if (inQuotes) {
      current += char
      i++
      continue
    }

    if ('.!?…;:'.includes(char)) {
      current += char
      const trimmed = current.trim()
      if (trimmed) phrases.push(trimmed)
      current = ''
      i++
      // Sauter les espaces après la ponctuation
      while (i < line.length && line[i] === ' ') i++
      continue
    }

    current += char
    i++
  }

  if (current.trim()) phrases.push(current.trim())

  return phrases
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

  // Réplique de dialogue (tiret ou em-dash en début)
  if (/^[-—]/.test(t)) {
    return UNIT_TYPE.DIALOGUE_LINE
  }

  // Dialogue entre guillemets
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

  // Coup court isolable : très court + ponctuation forte
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
  const prev = allUnits[index - 1] || null
  const next = allUnits[index + 1] || null

  // ── ISOLATION ──────────────────────────────────────────────────────────────
  let isolation = 0

  // Phrase courte conclusive
  if (t.length < CONFIG.SHORT_UNIT_THRESHOLD && /[.!?…]$/.test(t)) {
    isolation += 0.35
  }

  // Verbe d'action simple (frappe dramatique)
  if (CONFIG.ACTION_VERBS.some(v => t.toLowerCase().includes(v))) {
    isolation += 0.30
  }

  // Ponctuation émotionnelle forte
  if (/[!?…]$/.test(t)) isolation += 0.15

  // Révélation : contenu court après deux-points ou tiret
  if (/[:—]\s/.test(t) && t.length < 90) isolation += 0.20

  // Dialogue
  if (unit.type === UNIT_TYPE.DIALOGUE_LINE) isolation += 0.30
  if (unit.type === UNIT_TYPE.DIALOGUE_QUOTE) isolation += 0.15

  // Fin de scène (fermeture de paragraphe)
  if (unit.type === UNIT_TYPE.SCENE_END) isolation += 0.50

  // En-tête de chapitre : isolation totale
  if (unit.type === UNIT_TYPE.CHAPTER_HEADER) isolation = 1.0

  // Très court après très long : pic de tension visuel
  if (prev && prev.text.length > CONFIG.LONG_UNIT_THRESHOLD &&
      t.length < CONFIG.VERY_SHORT_UNIT_THRESHOLD) {
    isolation += 0.30
  }

  // ── TENSION ────────────────────────────────────────────────────────────────
  let tension = 0

  const tLower = t.toLowerCase()
  const tensionMatches = CONFIG.TENSION_WORDS.filter(w => tLower.includes(w))
  tension += Math.min(tensionMatches.length * 0.18, 0.54)

  // Phrase courte après longue = pic de tension
  if (prev && prev.text.length > CONFIG.LONG_UNIT_THRESHOLD &&
      t.length < CONFIG.SHORT_UNIT_THRESHOLD) {
    tension += 0.28
  }

  // Ponctuation forte = charge émotionnelle
  if (/[!?…]$/.test(t)) tension += 0.15

  // ── CONTINUITÉ ─────────────────────────────────────────────────────────────
  let continuity = 0

  // Se termine par virgule ou deux-points → appartient à la suite
  if (/[,:]$/.test(t)) continuity += 0.55

  // Commence par une conjonction de coordination ou subordination
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
  if (unit.type === UNIT_TYPE.DIALOGUE_LINE && next &&
      next.type === UNIT_TYPE.NARRATIVE) {
    continuity = Math.max(0, continuity - 0.40)
  }

  return {
    isolation: Math.min(isolation, 1),
    tension:   Math.min(tension, 1),
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
 * Une unité sans beat n'est pas dans la Map.
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

    // ── EN-TÊTE DE CHAPITRE — isolé systématiquement
    if (u.type === UNIT_TYPE.CHAPTER_HEADER) {
      beats.set(i, BEAT_TYPE.REVELATION)
      continue
    }

    // ── RÉVÉLATION : isolation élevée + après une longue unité
    if (
      u.scores.isolation > 0.70 &&
      prev && prev.text.length > CONFIG.LONG_UNIT_THRESHOLD
    ) {
      beats.set(i, BEAT_TYPE.REVELATION)
      continue
    }

    // ── PUNCHLINE : très court + tension + type SHORT_BEAT
    if (
      u.type === UNIT_TYPE.SHORT_BEAT &&
      u.scores.tension > 0.35 &&
      u.text.length < CONFIG.VERY_SHORT_UNIT_THRESHOLD
    ) {
      beats.set(i, BEAT_TYPE.PUNCHLINE)
      continue
    }

    // ── RESPIRATION : après N segments longs consécutifs, unité courte
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

    // ── ACCÉLÉRATION : séquences d'énumérations ou de courts consécutifs
    if (
      u.type === UNIT_TYPE.ENUMERATION ||
      (u.text.length < CONFIG.SHORT_UNIT_THRESHOLD &&
        next && next.text.length < CONFIG.SHORT_UNIT_THRESHOLD)
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
 *   1. REVELATION / PUNCHLINE / SCENE_CLOSE / CHAPTER_HEADER → toujours seuls
 *   2. BREATH → toujours seul
 *   3. DIALOGUE_LINE → regroupe les répliques consécutives (max 2)
 *   4. isolation > seuil (et granularité ≤ 7) → seul
 *   5. ACCELERATION → groupes de 1-2 unités
 *   6. NARRATIVE → regroupement jusqu'à maxUnitsPerSegment
 */
function composeSegments(scoredUnits, beats, granularity) {
  const segments = []
  const maxUnits = CONFIG.maxUnitsForGranularity(granularity)
  let i = 0

  while (i < scoredUnits.length) {
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

    // ── RÈGLE 3 : dialogues → regroupe les répliques consécutives (max 2) ──
    if (u.type === UNIT_TYPE.DIALOGUE_LINE) {
      const dialogueGroup = []

      while (
        i < scoredUnits.length &&
        scoredUnits[i].type === UNIT_TYPE.DIALOGUE_LINE &&
        dialogueGroup.length < CONFIG.MAX_DIALOGUE_LINES_PER_SEGMENT
      ) {
        // Ne pas inclure une unité qui a un beat fort
        const currentBeat = beats.get(i)
        if (
          dialogueGroup.length > 0 &&
          (currentBeat === BEAT_TYPE.REVELATION ||
            currentBeat === BEAT_TYPE.PUNCHLINE ||
            currentBeat === BEAT_TYPE.SCENE_CLOSE)
        ) {
          break
        }

        // Vérifier MAX_CHARS
        const totalChars = dialogueGroup.reduce(
          (sum, du) => sum + du.text.length + 1,
          0
        )
        if (totalChars + scoredUnits[i].text.length > CONFIG.MAX_CHARS) break

        dialogueGroup.push(scoredUnits[i])
        i++
      }

      segments.push(dialogueGroup)
      continue
    }

    // ── RÈGLE 4 : isolation élevée (granularité ≤ 7) → seul ───────────────
    if (u.scores.isolation >= CONFIG.ISOLATION_THRESHOLD && granularity <= 7) {
      segments.push([u])
      i++
      continue
    }

    // ── RÈGLE 5 : accélération → groupes courts ────────────────────────────
    if (beat === BEAT_TYPE.ACCELERATION) {
      const accelGroup = []

      while (
        i < scoredUnits.length &&
        beats.get(i) === BEAT_TYPE.ACCELERATION &&
        accelGroup.length < Math.min(CONFIG.MAX_ACCELERATION_UNITS, maxUnits)
      ) {
        const totalChars = accelGroup.reduce(
          (sum, au) => sum + au.text.length + 1,
          0
        )
        if (totalChars + scoredUnits[i].text.length > CONFIG.MAX_CHARS) break

        accelGroup.push(scoredUnits[i])
        i++
      }

      if (accelGroup.length === 0) {
        // Sécurité : ne jamais bloquer
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

      // Stop si on passe à un dialogue (rupture de type)
      if (group.length > 0 && current.type === UNIT_TYPE.DIALOGUE_LINE) {
        break
      }

      // Stop si isolation élevée (sauf en granularité > 7)
      if (
        group.length > 0 &&
        current.scores.isolation >= CONFIG.ISOLATION_THRESHOLD &&
        granularity <= 7
      ) {
        break
      }

      // Stop si continuité faible entre deux unités consécutives
      if (group.length > 0) {
        const prev = group[group.length - 1]
        if (
          prev.scores.continuity < 0.20 &&
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
      // Sécurité : ne jamais bloquer sur un cycle sans avancement
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
 * Ne modifie jamais les segments beats forts (REVELATION, PUNCHLINE, SCENE_CLOSE).
 *
 * Règle : après N segments longs consécutifs, si le segment suivant est
 * lui-même long ET divisible (≥ 2 unités), on le sépare pour créer
 * une respiration naturelle.
 */
function enforceRhythmCadence(segments) {
  const result = []
  let consecutiveLong = 0

  for (let i = 0; i < segments.length; i++) {
    const group = segments[i]
    const totalChars = group.reduce((sum, u) => sum + u.text.length, 0)
    const isLong = totalChars > CONFIG.LONG_UNIT_THRESHOLD
    const isShort = totalChars < CONFIG.SHORT_UNIT_THRESHOLD

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

      // Ne pas toucher aux groupes d'une seule unité ou aux beats forts
      if (nextGroup.length >= 2) {
        // Vérifier qu'aucune unité du nextGroup n'est un beat fort
        const hasStrongBeat = nextGroup.some(u =>
          u.type === UNIT_TYPE.SCENE_END ||
          u.type === UNIT_TYPE.CHAPTER_HEADER
        )

        if (!hasStrongBeat) {
          // Sépare en deux : [première unité] + [reste]
          result.push([nextGroup[0]])
          if (nextGroup.length > 1) {
            result.push(nextGroup.slice(1))
          }
          i++ // Sauter le segment qu'on vient de splitter
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
 * Filtre les segments vides.
 */
function serializeSegments(composedSegments) {
  return composedSegments
    .map(group => group.map(u => u.text).join(' ').trim())
    .filter(s => s.length > 0)
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

  // Phase 1 : parsing typé
  const typedUnits = parseIntoUnits(text)
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

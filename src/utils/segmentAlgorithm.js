// ══════════════════════════════════════════════════════════════════════════════
// segmentAlgorithm.js — Moteur de découpage narratif heuristique
// Version 3.0 — Sans IA, sans random pur, sans magic numbers arbitraires
// ══════════════════════════════════════════════════════════════════════════════
//
// PIPELINE :
//   0. normalizeText        → normalisation unicode (...→…, tirets, etc.)
//   1. splitIntoSentences   → découpe phrases atomiques dans un paragraphe fluide
//   2. parseIntoUnits       → unités atomiques typées depuis le texte brut
//                             RÈGLE : une phrase = une unité (jamais coupée
//                             en milieu sauf si > MAX_CHARS)
//   3. mergeFragments       → fusionne les fragments non conclusifs
//   4. scoreUnits           → score narratif par unité (isolation, tension, continuité)
//   5. detectBeats          → détection des beats dramatiques (révélation, punchline…)
//   6. composeSegments      → assemblage déterministe basé sur les scores et beats
//   7. enforceRhythmCadence → anti-monotonie, équilibrage du rythme global
//   8. serializeSegments    → conversion finale en tableau de segments enrichis
//
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════
const CONFIG = {
  // Limite absolue de caractères par segment (espaces compris) — découpage algo
  MAX_CHARS: 254,
  // Limite absolue de caractères affichables par segment (taille M)
  MAX_DISPLAY_CHARS: 400,
  // Seuil pour qu'une unité soit "courte" (isolation potentielle)
  SHORT_UNIT_THRESHOLD: 75,
  // Seuil pour qu'une unité soit "très courte" (beat fort)
  VERY_SHORT_UNIT_THRESHOLD: 42,
  // Seuil pour qu'une unité soit "longue"
  LONG_UNIT_THRESHOLD: 100,
  // Nombre de segments longs consécutifs avant respiration forcée
  CONSECUTIVE_LONG_BEFORE_BREATH: 2,
  // Score d'isolation au-dessus duquel une unité est isolée (granularité ≤ 7)
  ISOLATION_THRESHOLD: 0.68,
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
  // Probabilité de coupe sur virgule selon le contexte [0..1]
  COMMA_CUT_BASE_PROB: 0.30,
  // Probabilité de coupe sur point-virgule [0..1]
  SEMICOLON_CUT_PROB: 0.32,
  // Probabilité de coupe sur deux-points [0..1]
  COLON_CUT_PROB: 0.42,
  // Longueur minimale de chaque côté d'une coupe sur ponctuation faible
  MIN_PART_LENGTH_FOR_WEAK_CUT: 28,
  // Seuil au-dessus duquel un segment est considéré "grand"
  LARGE_SEGMENT_THRESHOLD: 350,
  // Nombre max d'unités par segment selon la granularité (1→10)
  maxUnitsForGranularity(g) {
    return Math.min(8, Math.floor(1 + (g - 1) * 0.60))
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════
const UNIT_TYPE = {
  CHAPTER_HEADER: 'chapter_header',  // "Chapitre X" ou "CHAPITRE X"
  DIALOGUE_LINE:  'dialogue_line',   // commence par - ou —
  DIALOGUE_QUOTE: 'dialogue_quote',  // contient « »
  QUOTED_BLOCK:   'quoted_block',    // entre guillemets droits "…"
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
const FAKE_PARAGRAPH_MARKER = '---FAKE_PARAGRAPH_BREAK---'

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 0 — NORMALISATION DU TEXTE
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Normalise le texte brut avant tout parsing.
 *
 * Règles :
 *   - "..." (3 points ASCII) → "…" (ellipse Unicode)
 *   - ".." (2 points)        → "…" (faute de frappe fréquente)
 *   - Espaces multiples      → espace simple
 *   - Trim de chaque ligne   (sans supprimer les sauts de ligne natifs)
 */
function normalizeText(text) {
  return text
    .replace(/\.{3,}/g, '…')
    .replace(/\.{2}/g, '…')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
}

// ══════════════════════════════════════════════════════════════════════════════
// EXCEPTIONS — Points ne terminant PAS une phrase
// ══════════════════════════════════════════════════════════════════════════════

// Titres de civilité et abréviations courantes (toujours suivis d'un point)
const ABBREV_EXCEPTIONS = new Set([
  'm', 'mme', 'mlle', 'dr', 'me', 'pr', 'prof',
  'cf', 'p', 'vol', 'chap', 'art', 'etc', 'c.-à-d', 'ibid', 'op',
])

/**
 * Retourne true si le point à la position `dotPos` dans `text`
 * ne termine PAS une phrase (abréviation, sigle, nombre, URL).
 */
function isNonSentenceDot(text, dotPos) {
  const before = text.substring(0, dotPos)
  const after  = text.substring(dotPos + 1)

  // 1. Nombre décimal : chiffre.chiffre  → "3.14", "19.99"
  if (/\d$/.test(before) && /^\d/.test(after)) return true

  // 2. URL / adresse IP : mot.mot sans espace après  → "mon.site.com", "192.168.1.1"
  if (/\S$/.test(before) && /^\S/.test(after)) return true

  // 3. Sigle avec points : lettre majuscule isolée  → "S.N.C.F.", "U.S.A."
  if (/\b[A-Z]$/.test(before) && /^[A-Z]\./.test(after)) return true
  // Dernière lettre d'un sigle déjà en cours → "S.N.C.F" suivi de "."
  if (/(?:\b[A-Z]\.)+[A-Z]$/.test(before)) return true

  // 4. Abréviation courante / titre de civilité
  //    Récupère le dernier mot avant le point (sans ponctuation)
  const wordMatch = before.match(/\b([a-zA-ZÀ-ÿ.-]+)$/)
  if (wordMatch) {
    const word = wordMatch[1].toLowerCase().replace(/\.$/, '')
    if (ABBREV_EXCEPTIONS.has(word)) return true
  }

  return false
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — DÉCOUPE EN PHRASES ATOMIQUES
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Découpe un texte fluide en phrases atomiques.
 *
 * Coupure après : . ! ? » suivi d'un espace + lettre majuscule ou début de citation.
 * Ne coupe PAS :
 *   - les blocs entièrement entre guillemets droits "…" ou « … »
 *   - les citations ouvertes non fermées (guillemets impairs)
 *   - les dialogues (commençant par - ou —)
 */
function splitIntoSentences(text) {
  const t = text.trim()

  // Dialogue → jamais découpé ici
  if (/^[-—]/.test(t)) return [t]

  // Bloc entièrement entre guillemets droits → unité atomique
  if (/^"[^"]*"$/.test(t)) return [t]

  // Bloc entièrement entre guillemets français → unité atomique
  if (/^«[^»]*»$/.test(t)) return [t]

  // Citation ouverte non fermée (nombre de " impair) → ne pas découper
  const doubleQuoteCount = (t.match(/"/g) || []).length
  if (doubleQuoteCount % 2 !== 0) return [t]

  // Découpe au niveau des frontières de phrases
  // Lookahead : majuscule, guillemet ouvrant, tiret de dialogue
  // On découpe manuellement pour pouvoir filtrer les faux positifs (abréviations, etc.)
  const rawParts = []
  let lastCut = 0
  const sentenceEndRe = /[.!?»]\s+(?=[A-ZÀ-Ÿ«"—\-])/g
  let m
  while ((m = sentenceEndRe.exec(t)) !== null) {
    const dotPos = m.index
    // Ignorer si c'est un point non-conclusif
    if (t[dotPos] === '.' && isNonSentenceDot(t, dotPos)) continue
    rawParts.push(t.substring(lastCut, dotPos + 1).trim())
    lastCut = m.index + m[0].length
  }
  rawParts.push(t.substring(lastCut).trim())
  const parts = rawParts.filter(Boolean)
  const result = []
  for (const part of parts) {
    if (part.trim()) result.push(part.trim())
  }

  return result.length > 0 ? result : [t]
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — PARSING : découpe en unités atomiques typées
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Découpe le texte normalisé en unités atomiques typées.
 *
 * PRINCIPE :
 *   Chaque paragraphe est d'abord découpé en lignes natives.
 *   Chaque ligne est ensuite découpée en phrases atomiques via splitIntoSentences.
 *   Les dialogues (- / —) et les blocs entre guillemets ne sont jamais découpés.
 *   Les lignes > MAX_CHARS sont coupées au dernier point de ponctuation valide.
 */
function parseIntoUnits(text) {
  const rawUnits = []
  const paragraphs = text.split(/\n\s*\n/)

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue
    const lines = paragraph.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const isDialogueLine = /^[-—]/.test(trimmed)
      // Ligne de puce → unité atomique non fusionnable
      // On lui force isLastBeforeParagraphBreak pour bloquer mergeFragments
      const isBulletLine = /^[•\-\*]/.test(trimmed)
      if (isBulletLine) {
        rawUnits.push(trimmed)
        rawUnits.push(FAKE_PARAGRAPH_MARKER)
        continue
      }

      // Dialogue → jamais découpé en phrases
      if (isDialogueLine) {
        rawUnits.push(trimmed)
        continue
      }

      // Bloc entre guillemets droits → unité atomique (pas de découpe phrase)
      if (/^"[^"]*"/.test(trimmed)) {
        if (trimmed.length <= CONFIG.MAX_CHARS) {
          rawUnits.push(trimmed)
        } else {
          const chunks = splitLongLine(trimmed)
          for (const chunk of chunks) {
            if (chunk.trim()) rawUnits.push(chunk.trim())
          }
        }
        continue
      }

      // Ligne suffisamment longue → tenter la découpe en phrases
      if (trimmed.length > CONFIG.SHORT_UNIT_THRESHOLD) {
        const sentences = splitIntoSentences(trimmed)
        if (sentences.length > 1) {
          for (const s of sentences) {
            if (!s.trim()) continue
            if (s.length <= CONFIG.MAX_CHARS) {
              rawUnits.push(s.trim())
            } else {
              const chunks = splitLongLine(s.trim())
              for (const chunk of chunks) {
                if (chunk.trim()) rawUnits.push(chunk.trim())
              }
            }
          }
          continue
        }
      }

      // Cas normal : ligne dans la limite
      if (trimmed.length <= CONFIG.MAX_CHARS) {
        rawUnits.push(trimmed)
        continue
      }

      // Ligne > MAX_CHARS sans découpe phrase possible
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
    (rawUnits[rawUnits.length - 1] === PARAGRAPH_MARKER ||
     rawUnits[rawUnits.length - 1] === FAKE_PARAGRAPH_MARKER)
  ) {
    rawUnits.pop()
  }

  // Typer chaque unité
  const typedUnits = []
  let nextIsFirstOfParagraph = false
  for (let i = 0; i < rawUnits.length; i++) {
    const raw = rawUnits[i]
    if (raw === PARAGRAPH_MARKER) {
      nextIsFirstOfParagraph = true
      continue
    }
    if (raw === FAKE_PARAGRAPH_MARKER) {
      // Marqueur fictif : bloque la fusion mais ne déclenche pas isLeader
      nextIsFirstOfParagraph = false
      continue
    }
    const isLastBeforeParagraphBreak =
      rawUnits[i + 1] === PARAGRAPH_MARKER ||
      rawUnits[i + 1] === FAKE_PARAGRAPH_MARKER ||
      i === rawUnits.length - 1
    const isFirstOfParagraph = nextIsFirstOfParagraph
    nextIsFirstOfParagraph = false
    typedUnits.push({
      text: raw,
      type: classifyUnit(raw, isLastBeforeParagraphBreak),
      isLastBeforeParagraphBreak,
      isFirstOfParagraph,
      scores: null,
    })
  }

  return mergeFragments(typedUnits)
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — FUSION DES FRAGMENTS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Fusionne les unités-fragments avec l'unité suivante.
 * Un fragment = unité ne se terminant pas par une ponctuation de fin de phrase.
 * Itère jusqu'à ce qu'il n'y ait plus de fragments internes.
 *
 * Règles :
 *  - Ne fusionne JAMAIS à travers une frontière de paragraphe
 *  - Ne fusionne JAMAIS un en-tête de chapitre
 *  - Ne fusionne PAS si le résultat est long ET que next est une fin de scène
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

        // Garde-fou : ne pas fusionner si le résultat est long ET que
        // next est une phrase-choc de fin de scène
        const wouldBeTooLong =
          next.isLastBeforeParagraphBreak && mergedText.length > 120

        if (wouldBeTooLong) {
          result.push(unit)
          i++
        } else {
          result.push({
            text: mergedText,
            type: classifyUnit(mergedText, next.isLastBeforeParagraphBreak),
            isLastBeforeParagraphBreak: next.isLastBeforeParagraphBreak,
            isFirstOfParagraph: unit.isFirstOfParagraph,
            scores: null,
          })
          i += 2
          changed = true
        }
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
 */
function splitLongLine(line) {
  const chunks = []
  let remaining = line

  while (remaining.length > CONFIG.MAX_CHARS) {
    let bestCut = -1

    for (let i = CONFIG.MAX_CHARS - 1; i >= 1; i--) {
      const char = remaining[i]
      const next = remaining[i + 1]
      if (
        '.!?;'.includes(char) &&
        remaining[i - 1] !== '.' &&
        remaining[i - 1] !== '…' &&
        (next === ' ' || next === undefined)
      ) {
        bestCut = i + 1
        break
      }
    }

    if (bestCut <= 0) {
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

  if (/^(chapitre|CHAPITRE)\b/i.test(t)) {
    return UNIT_TYPE.CHAPTER_HEADER
  }

  if (/^[-—]/.test(t)) {
    return UNIT_TYPE.DIALOGUE_LINE
  }

  // Bloc entre guillemets droits complet
  if (/^"[^"]*"$/.test(t)) {
    return UNIT_TYPE.QUOTED_BLOCK
  }

  // Dialogue entre guillemets français
  if (t.includes('«') && t.includes('»')) {
    return UNIT_TYPE.DIALOGUE_QUOTE
  }

  const commaCount = (t.match(/,/g) || []).length
  if (commaCount >= 3 || t.includes('•')) {
    return UNIT_TYPE.ENUMERATION
  }

  if (isLastBeforeParagraphBreak) {
    return UNIT_TYPE.SCENE_END
  }

  if (t.length < CONFIG.VERY_SHORT_UNIT_THRESHOLD && /[.!?…]$/.test(t)) {
    return UNIT_TYPE.SHORT_BEAT
  }

  return UNIT_TYPE.NARRATIVE
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — SCORING : score narratif par unité
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
    isolation += 0.25
  }

  // Phrase très courte à sujet unique (même sans tension lexicale)
  // Ex : "Rob éclate de rire." "Jim se lance."
  const wordCount = t.split(/\s+/).length
  if (
    t.length < 55 &&
    wordCount <= 8 &&
    /[.!?…]$/.test(t) &&
    !/[,:]$/.test(t)
  ) {
    isolation += 0.20
  }

  // Phrase après ligne de dialogue → rupture de registre
  if (prev && prev.type === UNIT_TYPE.DIALOGUE_LINE && t.length < 80) {
    isolation += 0.12
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

  // Bloc cité (guillemets droits) — traité comme dialogue, légèrement moins isolé
  if (unit.type === UNIT_TYPE.QUOTED_BLOCK) isolation += 0.10

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

  // Changement de sujet grammatical (POV shift)
  if (prev && prev.text.length > 30) {
    const prevSubject = prev.text.trim().split(/\s+/)[0].toLowerCase()
    const currSubject = t.split(/\s+/)[0].toLowerCase()
    const pronouns = ['il', 'elle', 'ils', 'elles', 'rob', 'rim', 'jim', 'alex']
    if (
      pronouns.includes(prevSubject) &&
      pronouns.includes(currSubject) &&
      prevSubject !== currSubject
    ) {
      isolation += 0.22
    }
  }

  // ── TENSION ────────────────────────────────────────────────────────────────
  let tension = 0
  const tensionMatches = CONFIG.TENSION_WORDS.filter(w => tLower.includes(w))
  tension += Math.min(tensionMatches.length * 0.18, 0.54)

  if (
    prev &&
    prev.text.length > CONFIG.LONG_UNIT_THRESHOLD &&
    t.length < CONFIG.SHORT_UNIT_THRESHOLD
  ) {
    tension += 0.28
  }

  if (/[!?…]$/.test(t)) tension += 0.15

  // ── CONTINUITÉ ─────────────────────────────────────────────────────────────
  let continuity = 0

  if (/[,:]$/.test(t)) continuity += 0.55

  if (CONFIG.CONTINUITY_CONJUNCTIONS.some(c => tLower.startsWith(c))) {
    continuity += 0.45
  }

  if (unit.type === UNIT_TYPE.ENUMERATION) continuity += 0.35

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
// PHASE 5 — BEATS : détection des moments narratifs clés
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

    // ── PUNCHLINE : très court + tension explicite
    if (
      u.type === UNIT_TYPE.SHORT_BEAT &&
      u.scores.tension > 0.35 &&
      u.text.length < CONFIG.VERY_SHORT_UNIT_THRESHOLD
    ) {
      beats.set(i, BEAT_TYPE.PUNCHLINE)
      continue
    }

    // ── PUNCHLINE : court + conclusif (même sans tension lexicale)
    // Capture "Rob éclate de rire." "Jim se lance." etc.
    if (
      u.text.length < CONFIG.SHORT_UNIT_THRESHOLD &&
      /[.!?…]$/.test(u.text.trim()) &&
      u.scores.isolation > 0.50
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
// PHASE 6 — COMPOSITION : assemblage déterministe des segments
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Compose les segments finaux à partir des unités scorées et des beats.
 * Retourne un tableau de tableaux d'unités : Array<Array<ScoredUnit>>
 *
 * Règles de priorité (dans l'ordre) :
 *   1. REVELATION / PUNCHLINE / SCENE_CLOSE → toujours seuls
 *   2. BREATH → toujours seul
 *   3. DIALOGUE_LINE → seul, SAUF si suivi d'un action-tag court
 *   4. isolation > seuil (granularité ≤ 7) → seul
 *   5. ACCELERATION → groupes de 1-2 unités (sans dialogue)
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

    // ── RÈGLE 3 : dialogue → seul, SAUF si suivi d'un action-tag court ─────
    if (u.type === UNIT_TYPE.DIALOGUE_LINE) {
      const next = scoredUnits[i + 1] || null
      const isActionTag =
        next !== null &&
        next.type !== UNIT_TYPE.DIALOGUE_LINE &&
        next.type !== UNIT_TYPE.CHAPTER_HEADER &&
        next.text.length < 60 &&
        u.text.length + next.text.length < CONFIG.MAX_CHARS

      if (isActionTag) {
        segments.push([u, next])
        i += 2
      } else {
        segments.push([u])
        i++
      }
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

      // ── SÉCURITÉ FRAGMENT ────────────────────────────────────────────────
      // Si la dernière unité du groupe est un fragment (pas de ponctuation de fin),
      // on force la fusion avant d'évaluer les breaks normaux.
      const lastInGroup = group.length > 0 ? group[group.length - 1] : null
      const prevIsFragment =
        lastInGroup !== null &&
        !/[.!?…;:»'")\]]$/.test(lastInGroup.text.trim())

      if (prevIsFragment) {
        const totalCharsF = group.reduce(
          (sum, gu) => sum + gu.text.length + 1,
          0
        )
        if (totalCharsF + current.text.length <= CONFIG.MAX_CHARS) {
          group.push(current)
          i++
          continue
        }
      }
      // ── FIN SÉCURITÉ FRAGMENT ────────────────────────────────────────────

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

      // Stop si choc court autonome
      if (
        group.length > 0 &&
        current.text.length < CONFIG.SHORT_UNIT_THRESHOLD &&
        /[.!?…]$/.test(current.text.trim()) &&
        current.scores.continuity < 0.35 &&
        current.scores.isolation > 0.45
      ) {
        break
      }

      // Stop si continuité faible entre deux unités consécutives
      if (group.length > 0) {
        const prevUnit = group[group.length - 1]
        if (
          prevUnit.scores.continuity < 0.30 &&
          current.scores.continuity < 0.30
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
      segments.push([u])
      i++
    } else {
      segments.push(group)
    }
  }

  return segments
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6b — COUPE INTRA-UNITÉ sur ponctuation faible (, ; :)
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Tente de subdiviser certains segments en coupant sur , ; :
 * selon des probabilités contextuelles et un pseudo-aléatoire déterministe.
 *
 * Règles :
 *  - Inactif si granularité >= 8
 *  - Jamais deux coupes consécutives sur la même unité
 *  - Chaque morceau doit faire >= MIN_PART_LENGTH_FOR_WEAK_CUT chars
 *  - La coupe sur , exige un contexte dramatique (tension ou action)
 *  - Les segments déjà isolés (1 unité courte) ne sont pas redécoupés
 */
function splitOnWeakPunctuation(composedSegments, scoredUnits, granularity) {
  if (granularity >= 8) return composedSegments

  // Pseudo-random déterministe basé sur le contenu
  const pseudoRandom = (seed) => ((seed * 2654435761) >>> 0) / 4294967296

  const result = []

  for (let segIdx = 0; segIdx < composedSegments.length; segIdx++) {
    const group = composedSegments[segIdx]

    // Ne pas re-découper un segment déjà court (1 unité, < 60 chars)
    if (group.length === 1 && group[0].text.length < 60) {
      result.push(group)
      continue
    }

    // Travailler sur le texte fusionné du segment
    const fullText = group.map(u => u.text).join(' ')

    // Trouver tous les candidats de coupe (, ; :) dans le texte fusionné
    // On cherche dans l'ordre du texte, on ne coupe qu'une seule fois par segment
    // (la coupe la plus "méritante")
    const candidates = []

    let pos = 0
    for (const unit of group) {
      const t = unit.text
      for (let i = 0; i < t.length; i++) {
        const char = t[i]
        const globalPos = pos + i

        if (char === ':') {
          const before = fullText.substring(0, globalPos).trim()
          const after  = fullText.substring(globalPos + 1).trim()
          if (
            before.length >= CONFIG.MIN_PART_LENGTH_FOR_WEAK_CUT &&
            after.length  >= CONFIG.MIN_PART_LENGTH_FOR_WEAK_CUT
          ) {
            // Score : élevé si ce qui suit est court (révélation)
            const revealBonus = after.length < 60 ? 0.25 : 0
            const seed = segIdx * 1000 + globalPos
            const prob = Math.min(0.95, CONFIG.COLON_CUT_PROB + revealBonus)
            candidates.push({ pos: globalPos, char, prob, seed, before, after })
          }
        }

        if (char === ';') {
          const before = fullText.substring(0, globalPos).trim()
          const after  = fullText.substring(globalPos + 1).trim()
          if (
            before.length >= CONFIG.MIN_PART_LENGTH_FOR_WEAK_CUT &&
            after.length  >= CONFIG.MIN_PART_LENGTH_FOR_WEAK_CUT
          ) {
            const seed = segIdx * 1000 + globalPos + 100000
            candidates.push({ pos: globalPos, char, prob: CONFIG.SEMICOLON_CUT_PROB, seed, before, after })
          }
        }

        if (char === ',') {
          const before = fullText.substring(0, globalPos).trim()
          const after  = fullText.substring(globalPos + 1).trim()
          if (
            before.length >= CONFIG.MIN_PART_LENGTH_FOR_WEAK_CUT * 1.5 && // seuil plus haut pour virgule
            after.length  >= CONFIG.MIN_PART_LENGTH_FOR_WEAK_CUT
          ) {
            // La virgule n'est éligible que si le contexte est dramatique
            const unitScore = unit.scores
            const hasTension  = unitScore && unitScore.tension > 0.25
            const hasAction    = CONFIG.ACTION_VERBS.some(v => t.toLowerCase().includes(v))
            const hasTensWord  = CONFIG.TENSION_WORDS.some(w => t.toLowerCase().includes(w))
            const contextScore = (hasTension ? 0.12 : 0) + (hasAction ? 0.08 : 0) + (hasTensWord ? 0.06 : 0)
            const prob = CONFIG.COMMA_CUT_BASE_PROB + contextScore
            const seed = segIdx * 1000 + globalPos + 200000
            candidates.push({ pos: globalPos, char, prob, seed, before, after })
          }
        }
      }
      pos += unit.text.length + 1 // +1 pour l'espace de fusion
    }

    if (candidates.length === 0) {
      result.push(group)
      continue
    }

    // Choisir le candidat le plus méritant qui passe le tirage
    // Priorité : ':' > ';' > ',' — parmi ceux qui passent leur probabilité
    const priority = { ':': 3, ';': 2, ',': 1 }
    const eligible = candidates
      .filter(c => pseudoRandom(c.seed) < c.prob)
      .sort((a, b) => priority[b.char] - priority[a.char])

    if (eligible.length === 0) {
      result.push(group)
      continue
    }

    // Prendre le premier éligible (le plus prioritaire)
    const cut = eligible[0]

    // Construire deux pseudo-unités textuelles
    // On conserve la ponctuation de coupe à la fin du premier morceau
    const textA = fullText.substring(0, cut.pos + 1).trim() // inclut , ; :
    const textB = fullText.substring(cut.pos + 1).trim()

    if (!textA || !textB) {
      result.push(group)
      continue
    }

    // Créer deux groupes synthétiques (une unité chacun)
    // On réutilise les scores de la première unité du groupe d'origine
    const baseUnit = group[0]
    const unitA = { ...baseUnit, text: textA }
    const unitB = { ...baseUnit, text: textB, isFirstOfParagraph: false }

    result.push([unitA])
    result.push([unitB])
  }

  return result
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — CADENCE : anti-monotonie et équilibrage global
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Vérifie le rythme global et lisse les séquences monotones.
 *
 * Classifie chaque segment en short / medium / long.
 * Après 2+ longs consécutifs : 80% de chance de séparer le suivant.
 * Après 3+ courts consécutifs : 75% de chance de fusionner avec le précédent.
 * Le pseudo-random est déterministe (basé sur l'index) : même texte = même résultat.
 */
function enforceRhythmCadence(segments) {
  const result = []
  let consecutiveLong = 0
  let consecutiveShort = 0

  const sizeOf = (group) => {
    const chars = group.reduce((s, u) => s + u.text.length, 0)
    if (chars < 60)  return 'short'
    if (chars < 140) return 'medium'
    return 'long'
  }

  // Déterministe, reproductible, non-uniforme
  const pseudoRandom = (seed) => ((seed * 2654435761) >>> 0) / 4294967296

  for (let i = 0; i < segments.length; i++) {
    const group = segments[i]
    const size = sizeOf(group)

    if (size === 'long') {
      consecutiveLong++
      consecutiveShort = 0
    } else if (size === 'short') {
      consecutiveShort++
      consecutiveLong = 0
    } else {
      consecutiveLong = 0
      consecutiveShort = 0
    }

    result.push(group)

    // ── CASSE LES LONGS CONSÉCUTIFS ─────────────────────────────────────────
    if (
      consecutiveLong >= CONFIG.CONSECUTIVE_LONG_BEFORE_BREATH &&
      i + 1 < segments.length
    ) {
      const nextGroup = segments[i + 1]
      const nextSize = sizeOf(nextGroup)
      // Prob de NE PAS couper : 20% après 2 longs, 5% après 3+
      const threshold = consecutiveLong >= 3 ? 0.05 : 0.20
      const roll = pseudoRandom(i)

      if (nextSize === 'long' && nextGroup.length >= 2 && roll > threshold) {
        const hasProtected = nextGroup.some(
          u =>
            u.type === UNIT_TYPE.SCENE_END ||
            u.type === UNIT_TYPE.CHAPTER_HEADER ||
            u.type === UNIT_TYPE.DIALOGUE_LINE
        )
        if (!hasProtected) {
          result.push([nextGroup[0]])
          if (nextGroup.length > 1) result.push(nextGroup.slice(1))
          i++
          consecutiveLong = 0
          consecutiveShort = 0
          continue
        }
      }
    }

    // ── CASSE LES COURTS CONSÉCUTIFS ────────────────────────────────────────
    if (consecutiveShort >= 3 && i + 1 < segments.length) {
      const nextGroup = segments[i + 1]
      const nextSize = sizeOf(nextGroup)
      const roll = pseudoRandom(i + 1000)

      if (nextSize === 'short' && roll > 0.25) {
        const lastResult = result[result.length - 1]
        const hasProtected = [...lastResult, ...nextGroup].some(
          u =>
            u.type === UNIT_TYPE.SCENE_END ||
            u.type === UNIT_TYPE.CHAPTER_HEADER
        )
        const totalChars = [...lastResult, ...nextGroup].reduce(
          (s, u) => s + u.text.length + 1,
          0
        )
        if (!hasProtected && totalChars <= CONFIG.MAX_CHARS) {
          result[result.length - 1] = [...lastResult, ...nextGroup]
          i++
          consecutiveShort = 0
          continue
        }
      }
    }
  }

  return result
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 8 — SÉRIALISATION : conversion en tableau de segments enrichis
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Convertit chaque groupe d'unités en objet Segment.
 *
 * Retourne Array<{ lines: string[], text: string, breakAt: number|null }>
 *   lines   : les lignes du segment (1 à N)
 *   text    : les lignes jointes par espace (commodité pour l'affichage simple)
 *   breakAt : index (0-based) après lequel insérer un saut visuel, ou null
 *
 * Détection du saut intra-segment :
 *   - une unité se termine par ":" avant une autre → breakAt
 *   - une unité se termine par "…" avant une unité très courte (< 40 car) → breakAt
 */
function serializeSegments(composedSegments) {
  const pseudoRandom = (seed) => ((seed * 2654435761) >>> 0) / 4294967296
  return composedSegments
    .map((group, segIndex) => {
      const lines = group.map(u => u.text)
      const text = lines.join(' ').trim()
      if (!text || !/[a-zA-ZÀ-ÿ\u0100-\u024F]/.test(text)) return null
      // Marquer comme Leader si n'importe quelle unité du groupe ouvre un nouveau paragraphe
      const isLeader = segIndex > 0 && group.some(u => u.isFirstOfParagraph === true)

      let breakAt = null

      // Chercher un point de coupure directement dans la string text
      // Seulement si le segment est assez long
      if (text.length >= 80) {
        const prob =
          text.length >= 220 ? 0.60 :
          text.length >= 160 ? 0.40 :
          text.length >= 120 ? 0.30 :
          0.20
        const roll = pseudoRandom(segIndex * 31 + text.length)
        if (roll < prob) {
          // Chercher une ponctuation forte (.  !  ?  …) entre 40% et 70% du texte
          // pour éviter les coupures trop proches du début ou de la fin
          const start = Math.floor(text.length * 0.25)
          const end   = Math.floor(text.length * 0.80)

          for (let i = start; i < end; i++) {
            const char = text[i]
            const next = text[i + 1]
            if (
              '.!?…»'.includes(char) &&
              (next === ' ' || next === undefined)
            ) {
              // breakAt = index du caractère dans text (inclusif)
              breakAt = i + 1
              break
            }
          }
        }
      }
if (breakAt !== null) {
  console.log('BREAK AT', segIndex, breakAt, text.length, text.substring(0, 40))
}
      return { 
        id: `seg_${Date.now()}_${segIndex}_${Math.random().toString(36).slice(2, 7)}`,
        lines, 
        text, 
        breakAt, 
        isLeader: isLeader || false
      }
    })
    .filter(Boolean)
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7b — ANTI-BLOCS : évite deux segments larges consécutifs
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Quand deux segments consécutifs dépassent tous les deux LARGE_SEGMENT_THRESHOLD,
 * tente de couper le second au premier point de ponctuation fort disponible
 * entre 40% et 75% de sa longueur.
 * Si aucun point de coupe n'est trouvé, insère un split au dernier espace
 * avant 60% du texte.
 */
function breakConsecutiveLargeSegments(serializedSegments) {
  const T = CONFIG.LARGE_SEGMENT_THRESHOLD
  const result = []

  for (let i = 0; i < serializedSegments.length; i++) {
    const seg = serializedSegments[i]
    const prev = result[result.length - 1]

    const isLarge = seg.text.length > T
    const prevIsLarge = prev && prev.text.length > T

    if (!isLarge || !prevIsLarge) {
      result.push(seg)
      continue
    }

    // Chercher un point de coupe dans [40%..75%] du texte
    const text = seg.text
    const start = Math.floor(text.length * 0.40)
    const end   = Math.floor(text.length * 0.75)

    let cutPos = -1
    for (let j = start; j < end; j++) {
      const char = text[j]
      const next = text[j + 1]
      if ('.!?…'.includes(char) && (next === ' ' || next === undefined)) {
        cutPos = j + 1
        break
      }
    }

    // Fallback : ponctuation faible
    if (cutPos === -1) {
      for (let j = start; j < end; j++) {
        const char = text[j]
        const next = text[j + 1]
        if (';:,'.includes(char) && (next === ' ' || next === undefined)) {
          cutPos = j + 1
          break
        }
      }
    }

    // Fallback ultime : dernier espace avant 60%
    if (cutPos === -1) {
      const hardLimit = Math.floor(text.length * 0.60)
      for (let j = hardLimit; j >= start; j--) {
        if (text[j] === ' ') { cutPos = j; break }
      }
    }

    if (cutPos <= 0) {
      // Aucune coupe trouvée, on garde tel quel
      result.push(seg)
      continue
    }

    const textA = text.substring(0, cutPos).trim()
    const textB = text.substring(cutPos).trim()

    if (!textA || !textB) {
      result.push(seg)
      continue
    }

    result.push({
      ...seg,
      text: textA,
      lines: [textA],
      breakAt: null,
    })
    result.push({
      ...seg,
      id: `${seg.id}_split`,
      text: textB,
      lines: [textB],
      breakAt: null,
      isLeader: false,
    })
  }

  return result
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 8b — GARDE-FOU AFFICHAGE : coupe les segments > MAX_DISPLAY_CHARS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Subdivise les segments dont le texte dépasse MAX_DISPLAY_CHARS.
 * Coupe au dernier point de ponctuation fort avant la limite,
 * ou à défaut au dernier espace.
 * Préserve toutes les métadonnées (id unique, isLeader, breakAt, etc.)
 */
function enforceDisplayLimit(serializedSegments) {
  const result = []

  for (const seg of serializedSegments) {
    if (seg.text.length <= CONFIG.MAX_DISPLAY_CHARS) {
      result.push(seg)
      continue
    }

    // Découper récursivement jusqu'à ce que tous les morceaux soient dans la limite
    let remaining = seg.text
    let isFirst = true

    while (remaining.length > CONFIG.MAX_DISPLAY_CHARS) {
      const slice = remaining.substring(0, CONFIG.MAX_DISPLAY_CHARS)

      // Chercher le dernier point de ponctuation fort dans la slice
      let cutPos = -1
      for (let i = slice.length - 1; i >= Math.floor(slice.length * 0.5); i--) {
        if ('.!?…;:,'.includes(slice[i]) && slice[i + 1] === ' ') {
          cutPos = i + 1
          break
        }
      }

      // Fallback : dernier espace
      if (cutPos <= 0) {
        for (let i = slice.length - 1; i >= 0; i--) {
          if (slice[i] === ' ') {
            cutPos = i
            break
          }
        }
      }

      // Fallback ultime : couper brutalement à la limite
      if (cutPos <= 0) cutPos = CONFIG.MAX_DISPLAY_CHARS

      const partText = remaining.substring(0, cutPos).trim()
      remaining = remaining.substring(cutPos).trim()

      if (!partText) continue

      result.push({
        ...seg,
        id: isFirst
          ? seg.id
          : `${seg.id}_overflow_${result.length}`,
        text: partText,
        lines: [partText],
        breakAt: null,
        isLeader: isFirst ? seg.isLeader : false,
      })

      isFirst = false
    }

    // Dernier morceau
    if (remaining) {
      result.push({
        ...seg,
        id: `${seg.id}_overflow_${result.length}`,
        text: remaining,
        lines: [remaining],
        breakAt: null,
        isLeader: false,
      })
    }
  }

  return result
}

// ══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE — export public
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Découpe un texte narratif en segments rythmés pour lecture immersive.
 *
 * @param {string} text        — Texte brut à découper
 * @param {number} granularity — Slider de 1 (très court) à 10 (très long)
 * @returns {Array<{lines: string[], text: string, breakAt: number|null}>}
 */
export function segmentText(text, granularity = 5) {
  if (!text || !text.trim()) return []

  const g = Math.max(1, Math.min(10, Math.round(granularity)))

  const normalized   = normalizeText(text)
  const typedUnits   = parseIntoUnits(normalized)
  if (typedUnits.length === 0) return []

  const scoredUnits  = scoreUnits(typedUnits)
  const beats        = detectBeats(scoredUnits)
  const rawSegments  = composeSegments(scoredUnits, beats, g)
  const withWeakCuts = splitOnWeakPunctuation(rawSegments, scoredUnits, g)
  const balanced     = enforceRhythmCadence(withWeakCuts)
  const serialized   = serializeSegments(balanced)
  const noLargeBlocs = breakConsecutiveLargeSegments(serialized)
  return enforceDisplayLimit(noLargeBlocs)
}

export default segmentText
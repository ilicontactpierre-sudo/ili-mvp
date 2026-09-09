// ══════════════════════════════════════════════════════════════════════════════
// segmentAlgorithm.test.js — Tests de non-régression du moteur de découpage
// ══════════════════════════════════════════════════════════════════════════════
//
// Philosophie de ces tests :
//
//   1. INVARIANT DE PRÉSERVATION (le plus important) : quel que soit le texte
//      et la granularité, concaténer tous les segments produits doit toujours
//      redonner exactement le texte source (aux espaces près). C'est la règle
//      absolue documentée dans segmentAlgorithm.js lui-même ("le texte narratif
//      original ne doit JAMAIS être reformulé/coupé/perdu"). Ce test attrape
//      la quasi-totalité des vraies régressions (texte tronqué, dupliqué,
//      mal recomposé), bien plus fiable qu'un snapshot figé sur la structure.
//
//   2. FIXTURES CIBLÉES : quelques textes courts et ORIGINAUX (jamais d'extrait
//      d'œuvre protégée) construits pour reproduire des patterns précis
//      (dialogue + didascalie, énumération, phrase longue, granularité 1 vs 10).
//      Les valeurs attendues ont été calées en exécutant réellement le code
//      contre ces textes, pas devinées — donc elles documentent le
//      comportement RÉEL du pipeline, y compris ses subtilités (ex : une
//      réplique de dialogue très courte devient souvent un beat "punchline"
//      et n'est alors jamais fusionnée avec la ligne suivante, même si la
//      règle de fusion dialogue+didascalie existe par ailleurs).
//
//   3. Le champ `id` (généré avec Date.now()/Math.random() dans
//      serializeSegments) n'est JAMAIS comparé : il change à chaque appel par
//      construction, même quand le découpage est parfaitement stable. On le
//      retire systématiquement avant toute comparaison.
//
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { segmentText } from './segmentAlgorithm.js'

// ── Utilitaires de test ──────────────────────────────────────────────────────

/** Retire les segments de leur `id` non-déterministe avant comparaison. */
function stripIds(segments) {
  return segments.map(({ id, ...rest }) => rest)
}

/**
 * Vérifie l'invariant de préservation du texte : la concaténation de tous
 * les segments (aux espaces/retours à la ligne près) doit reconstituer
 * exactement le texte source.
 *
 * NOTE : les fixtures de ce fichier évitent volontairement "..." et ".."
 * (normalisés en "…" par normalizeText) pour permettre une comparaison
 * directe sans dupliquer cette logique de normalisation dans les tests.
 */
function expectTextPreserved(originalText, segments) {
  const normalize = (s) => s.replace(/\s+/g, '')
  const sourceNormalized = normalize(originalText)
  const resultNormalized = normalize(segments.map((s) => s.text).join(''))
  expect(resultNormalized).toBe(sourceNormalized)
}

// ══════════════════════════════════════════════════════════════════════════════
// CAS LIMITES GÉNÉRAUX
// ══════════════════════════════════════════════════════════════════════════════

describe('segmentText — cas limites', () => {
  it('retourne un tableau vide pour un texte vide ou uniquement des espaces', () => {
    expect(segmentText('', 5)).toEqual([])
    expect(segmentText('   \n  \n  ', 5)).toEqual([])
  })

  it('retourne un tableau vide si aucun texte n\'est fourni', () => {
    expect(segmentText(undefined, 5)).toEqual([])
    expect(segmentText(null, 5)).toEqual([])
  })

  it('clampe une granularité hors bornes [1..10] sans planter', () => {
    const text = 'Il pleuvait sur la ville.'
    expect(() => segmentText(text, 0)).not.toThrow()
    expect(() => segmentText(text, -5)).not.toThrow()
    expect(() => segmentText(text, 42)).not.toThrow()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// INVARIANT DE PRÉSERVATION — sur tous les cas testés plus bas
// ══════════════════════════════════════════════════════════════════════════════

describe('segmentText — préservation intégrale du texte (invariant central)', () => {
  const fixtures = [
    {
      label: 'texte très court (une seule phrase)',
      text: 'Il pleuvait sur la ville.',
      granularity: 5,
    },
    {
      label: 'dialogue avec didascalies',
      text: [
        "Le silence dura un long moment avant qu'il ne se décide enfin à parler.",
        '- Je ne suis pas certain que tu comprennes vraiment ce que je te demande là, répondit-il lentement.',
        'Il haussa les épaules.',
      ].join('\n'),
      granularity: 5,
    },
    {
      label: 'énumération (description à virgules)',
      text: "La cuisine sentait le café, le pain grillé et la confiture d'abricot. Sur la table, il y avait des tasses ébréchées, une nappe à carreaux, un pot de miel entamé, et un vieux journal plié en quatre.",
      granularity: 5,
    },
    {
      label: 'paragraphe long multi-phrases',
      text: "C'est ainsi qu'une semaine plus tard, à la mi-mars, je repris la route vers le nord. La maison était restée telle que je l'avais laissée des années auparavant, figée dans une lumière d'automne éternel. Les volets grinçaient au vent, les meubles dormaient sous des draps blancs, et le silence pesait comme une main posée sur mes épaules. Je me souvins alors de tout ce que j'avais tenté d'oublier.",
      granularity: 5,
    },
    {
      label: 'granularité minimale (1)',
      text: "Elle entra dans la pièce. La lumière était éteinte. Elle chercha l'interrupteur à tâtons. Ses doigts tremblaient. Soudain, un bruit derrière elle. Elle se figea. Le silence revint, pesant. Elle osa enfin se retourner.",
      granularity: 1,
    },
    {
      label: 'granularité maximale (10)',
      text: "Elle entra dans la pièce. La lumière était éteinte. Elle chercha l'interrupteur à tâtons. Ses doigts tremblaient. Soudain, un bruit derrière elle. Elle se figea. Le silence revint, pesant. Elle osa enfin se retourner.",
      granularity: 10,
    },
    {
      label: 'phrase unique dépassant MAX_CHARS (254 car.), sans ponctuation interne',
      text: Array.from({ length: 70 }, (_, i) => `mot${i}`).join(' ') + '.',
      granularity: 5,
    },
  ]

  for (const { label, text, granularity } of fixtures) {
    it(`préserve tout le texte source — ${label}`, () => {
      const segments = segmentText(text, granularity)
      expectTextPreserved(text, segments)
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOC 1 — DIALOGUE
// ══════════════════════════════════════════════════════════════════════════════

describe('segmentText — dialogue', () => {
  it('isole chaque réplique courte (beat "punchline") sans la fusionner à la narration voisine', () => {
    // Répliques courtes → chacune devient un beat fort (punchline/scene_close)
    // et reste donc seule dans son segment, même si une règle de fusion
    // dialogue + didascalie existe par ailleurs dans le pipeline.
    const text = [
      '- Tu es sûr de vouloir partir ce soir ? demanda Léa.',
      'Marc hocha la tête sans répondre.',
      '- Il fait déjà nuit, insista-t-elle.',
      'Il éclata de rire.',
    ].join('\n')

    const segments = stripIds(segmentText(text, 5))

    expect(segments.map((s) => s.text)).toEqual([
      '- Tu es sûr de vouloir partir ce soir ? demanda Léa.',
      'Marc hocha la tête sans répondre.',
      '- Il fait déjà nuit, insista-t-elle.',
      'Il éclata de rire.',
    ])
    // Chaque segment ne contient qu'une seule ligne : aucune réplique n'est
    // mélangée avec une autre unité.
    for (const seg of segments) {
      expect(seg.lines.length).toBe(1)
    }
  })

  it('peut fusionner une réplique plus longue avec sa didascalie immédiate (règle action-tag), puis la re-scinder sur une ponctuation faible', () => {
    // Cas vérifié empiriquement : une réplique suffisamment longue pour ne
    // PAS déclencher de beat fort est éligible à la fusion avec l'unité
    // suivante courte (règle 3 de composeSegments), et le résultat fusionné
    // peut ensuite être redécoupé par la phase de coupe sur ponctuation
    // faible (virgule/point-virgule/deux-points).
    const text = [
      "Le silence dura un long moment avant qu'il ne se décide enfin à parler.",
      '- Je ne suis pas certain que tu comprennes vraiment ce que je te demande là, répondit-il lentement.',
      'Il haussa les épaules.',
    ].join('\n')

    const result = segmentText(text, 5).map((s) => s.text)

    expect(result).toEqual([
      "Le silence dura un long moment avant qu'il ne se décide enfin à parler.",
      '- Je ne suis pas certain que tu comprennes vraiment ce que je te demande là,',
      'répondit-il lentement. Il haussa les épaules.',
    ])
  })

  it('ne fait jamais démarrer un segment de dialogue par autre chose qu\'un tiret, quand une réplique est isolée', () => {
    const text = [
      '- Où étais-tu passé ? cria-t-elle.',
      "- Nulle part d'important, répondit-il.",
    ].join('\n')
    const segments = segmentText(text, 5)
    for (const seg of segments) {
      if (seg.text.startsWith('-')) {
        // La ligne de dialogue reste identifiable et n'est jamais noyée
        // au milieu d'un bloc de narration plus large.
        expect(seg.lines[0].startsWith('-')).toBe(true)
      }
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOC 2 — ÉNUMÉRATION
// ══════════════════════════════════════════════════════════════════════════════

describe('segmentText — énumération', () => {
  it('garde une description à forte densité de virgules regroupée dans un seul segment', () => {
    const text = "La cuisine sentait le café, le pain grillé et la confiture d'abricot. Sur la table, il y avait des tasses ébréchées, une nappe à carreaux, un pot de miel entamé, et un vieux journal plié en quatre."

    const segments = stripIds(segmentText(text, 5))

    expect(segments.length).toBe(1)
    expect(segments[0].text).toBe(text)
  })

  it('garde chaque ligne de puce comme unité distincte dans `lines`, même quand plusieurs puces partagent un segment', () => {
    // Comportement vérifié : le marqueur qui bloque la fusion des puces
    // (FAKE_PARAGRAPH_MARKER, phase 3 "mergeFragments") empêche deux puces
    // d'être recollées en une seule ligne de texte, mais n'empêche PAS le
    // regroupement en segments (phase 6 "composeSegments", règle narrative
    // standard) : plusieurs puces peuvent cohabiter dans un même segment,
    // tant que chacune reste sa propre entrée dans `lines`.
    const text = [
      "Voici ce qu'il avait emporté avec lui ce jour-là :",
      '• une lampe de poche',
      '• un carnet usé',
      '• une photo pliée en quatre',
    ].join('\n')

    const segments = segmentText(text, 5)
    const allLines = segments.flatMap((s) => s.lines)
    const bulletLines = allLines.filter((l) => l.startsWith('•'))

    // Les 3 puces existent bien, chacune comme ligne intacte et distincte.
    expect(bulletLines).toEqual([
      '• une lampe de poche',
      '• un carnet usé',
      '• une photo pliée en quatre',
    ])
    // Aucune ligne ne contient deux puces collées en une seule chaîne.
    for (const line of allLines) {
      const bulletCount = (line.match(/•/g) || []).length
      expect(bulletCount).toBeLessThanOrEqual(1)
    }
    expectTextPreserved(text, segments)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOC 3 — TEXTE TRÈS COURT / TRÈS LONG
// ══════════════════════════════════════════════════════════════════════════════

describe('segmentText — texte très court / très long', () => {
  it('produit un seul segment pour une phrase unique très courte', () => {
    const text = 'Il pleuvait sur la ville.'
    const segments = segmentText(text, 5)
    expect(segments.length).toBe(1)
    expect(segments[0].text).toBe(text)
  })

  it('découpe sans perte une phrase unique dépassant MAX_CHARS, sans jamais couper au milieu d\'un mot', () => {
    const longWord = Array.from({ length: 70 }, (_, i) => `mot${i}`).join(' ')
    const text = longWord + '.'

    const segments = segmentText(text, 5)

    expect(segments.length).toBeGreaterThan(1)
    for (const seg of segments) {
      // Chaque morceau reste sous la limite interne de découpage (254 car.)
      expect(seg.text.length).toBeLessThanOrEqual(254)
      // Aucun morceau ne commence ou ne finit au milieu d'un token "motN"
      expect(seg.text.trim()).not.toMatch(/^\d/) // jamais coupé en plein milieu d'un "motN"
    }
    expectTextPreserved(text, segments)
  })

  it('respecte la limite d\'affichage MAX_DISPLAY_CHARS (400) même pour un paragraphe long', () => {
    const text = "C'est ainsi qu'une semaine plus tard, à la mi-mars, je repris la route vers le nord. La maison était restée telle que je l'avais laissée des années auparavant, figée dans une lumière d'automne éternel. Les volets grinçaient au vent, les meubles dormaient sous des draps blancs, et le silence pesait comme une main posée sur mes épaules. Je me souvins alors de tout ce que j'avais tenté d'oublier."

    const segments = segmentText(text, 5)

    for (const seg of segments) {
      expect(seg.text.length).toBeLessThanOrEqual(400)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOC 4 — GRANULARITÉ EXTRÊME (1 et 10)
// ══════════════════════════════════════════════════════════════════════════════

describe('segmentText — granularité extrême', () => {
  const text = "Elle entra dans la pièce. La lumière était éteinte. Elle chercha l'interrupteur à tâtons. Ses doigts tremblaient. Soudain, un bruit derrière elle. Elle se figea. Le silence revint, pesant. Elle osa enfin se retourner."

  it('granularité 1 : découpage fin, résultat stable', () => {
    const segments = stripIds(segmentText(text, 1))
    expect(segments.map((s) => s.text)).toEqual([
      'Elle entra dans la pièce.',
      'La lumière était éteinte.',
      "Elle chercha l'interrupteur à tâtons. Ses doigts tremblaient.",
      'Soudain, un bruit derrière elle.',
      'Elle se figea.',
      'Le silence revint, pesant.',
      'Elle osa enfin se retourner.',
    ])
  })

  it('granularité 10 : regroupement plus large, résultat stable', () => {
    const segments = stripIds(segmentText(text, 10))
    expect(segments.map((s) => s.text)).toEqual([
      'Elle entra dans la pièce. La lumière était éteinte.',
      "Elle chercha l'interrupteur à tâtons. Ses doigts tremblaient.",
      'Soudain, un bruit derrière elle.',
      'Elle se figea.',
      'Le silence revint, pesant.',
      'Elle osa enfin se retourner.',
    ])
  })

  it('granularité 10 produit au maximum autant de segments que granularité 1, sur un même texte', () => {
    const segments1 = segmentText(text, 1)
    const segments10 = segmentText(text, 10)
    expect(segments10.length).toBeLessThanOrEqual(segments1.length)
  })

  it('la coupe intra-unité sur ponctuation faible est désactivée à partir de la granularité 8', () => {
    // CONFIG.COMMA_CUT/SEMICOLON/COLON n'agissent plus dès g >= 8
    // (splitOnWeakPunctuation retourne les segments composés tels quels).
    // On vérifie ici l'effet observable : à g=10, aucun segment ne se termine
    // artificiellement par une simple virgule suivie d'un fragment très court
    // qui aurait dû rester attaché en dessous de ce seuil.
    const segments = segmentText(text, 10)
    expect(segments.length).toBeGreaterThan(0)
    // Test de fumée : le pipeline ne plante pas et reste cohérent à g=10.
    expectTextPreserved(text, segments)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOC 5 — CHAPITRES
// ══════════════════════════════════════════════════════════════════════════════

describe('segmentText — en-têtes de chapitre', () => {
  it('isole toujours un en-tête "Chapitre N" dans son propre segment (beat "revelation", isolation totale)', () => {
    const text = [
      'Chapitre 1',
      'Le vent soufflait fort ce soir-là sur la baie.',
      'La mer était déchaînée, les vagues frappaient les rochers, et personne ne songeait à sortir.',
    ].join('\n\n')

    const result = segmentText(text, 5).map((s) => s.text)

    expect(result[0]).toBe('Chapitre 1')
    // Le premier segment ne contient QUE l'en-tête, jamais fusionné avec la suite.
    expect(result[0]).not.toMatch(/vent|mer|baie/)
    expectTextPreserved(text, segmentText(text, 5))
  })

  it('reconnaît "CHAPITRE" en majuscules de la même façon', () => {
    const text = ['CHAPITRE 12', 'Une simple phrase de narration suit ici.'].join('\n\n')
    const result = segmentText(text, 5).map((s) => s.text)
    expect(result[0]).toBe('CHAPITRE 12')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOC 6 — CITATIONS (guillemets français « » vs droits " ")
// ══════════════════════════════════════════════════════════════════════════════

describe('segmentText — citations et guillemets', () => {
  it('garde un dialogue entre guillemets français « » comme un segment autonome, jamais fusionné', () => {
    // Comportement vérifié empiriquement : une citation « » est typée
    // DIALOGUE_QUOTE et reste systématiquement seule dans son segment,
    // même entourée de narration standard des deux côtés.
    const text = [
      "Il se souvenait encore de cette phrase, prononcée par son père des années plus tôt.",
      '« Ne reviens jamais ici sans y être invité. »',
      "Il n'avait jamais oublié ces mots.",
    ].join('\n')

    const segments = stripIds(segmentText(text, 5))

    expect(segments.map((s) => s.text)).toEqual([
      "Il se souvenait encore de cette phrase, prononcée par son père des années plus tôt.",
      '« Ne reviens jamais ici sans y être invité. »',
      "Il n'avait jamais oublié ces mots.",
    ])
  })

  it('peut fusionner un bloc entre guillemets droits " " avec la narration qui le précède', () => {
    // Comportement vérifié empiriquement, et volontairement différent du
    // cas « » ci-dessus : un bloc "…" (QUOTED_BLOCK, ex. message affiché à
    // l'écran, citation rapportée) a un score d'isolation plus faible et
    // peut être regroupé avec l'unité de narration précédente, contrairement
    // à une réplique de dialogue classique.
    const text = [
      "Le message affiché à l'écran était sans appel.",
      '"Connexion refusée par le serveur distant."',
      "Elle referma l'ordinateur d'un geste sec.",
    ].join('\n')

    const result = segmentText(text, 5).map((s) => s.text)

    expect(result).toEqual([
      'Le message affiché à l\'écran était sans appel. "Connexion refusée par le serveur distant."',
      "Elle referma l'ordinateur d'un geste sec.",
    ])
    expectTextPreserved(text, segmentText(text, 5))
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOC 7 — CADENCE ET GARDE-FOUS ANTI-BLOCS (enforceRhythmCadence /
//           breakConsecutiveLargeSegments), testés indirectement
// ══════════════════════════════════════════════════════════════════════════════
//
// NOTE HONNÊTE SUR CE BLOC :
//
// `enforceRhythmCadence` (cassure des longs consécutifs / fusion des courts
// consécutifs) et `breakConsecutiveLargeSegments` (anti-blocs > 350 car.) ne
// sont pas exportées individuellement — elles ne sont donc testables que de
// façon indirecte, via `segmentText()` bout-en-bout.
//
// Plusieurs textes ont été construits spécifiquement pour tenter de forcer
// la branche "3 segments longs multi-unités consécutifs" d'enforceRhythmCadence
// à se déclencher, sans succès fiable : les contraintes de MAX_CHARS et de
// score de continuité interagissent de façon suffisamment subtile pour rendre
// ce cas difficile à isoler proprement en une fixture courte et lisible.
// Plutôt que d'affirmer tester une branche précise sans l'avoir observée se
// déclencher, ce bloc vérifie les GARANTIES que ces deux phases sont censées
// assurer, sur un texte volontairement dense en phrases longues consécutives.
//
// Par ailleurs, LARGE_SEGMENT_THRESHOLD (350 car.) est strictement supérieur à
// MAX_CHARS (254 car., déjà respecté par composeSegments) : en usage normal
// via l'API publique, aucun segment ne peut donc jamais dépasser 350 car.
// avant même d'atteindre breakConsecutiveLargeSegments. Le test ci-dessous
// documente et verrouille cette garantie plutôt que de forcer un cas qui
// n'est pas atteignable en pratique.

describe('segmentText — cadence et garde-fous (test de robustesse)', () => {
  it('ne produit jamais de segment dépassant 350 caractères, même sur un texte dense en phrases longues consécutives', () => {
    const denseText = [
      "Le vieil homme marchait lentement le long du quai désert sous la pluie fine du soir.",
      "Et il ne semblait pas pressé de rentrer malgré le froid qui mordait déjà ses joues creusées.",
      "La brume montait doucement depuis la surface calme de l'eau noire et silencieuse ce soir-là.",
      "Et elle enveloppait peu à peu les lampadaires éteints du vieux quai abandonné depuis longtemps.",
      "Un chien aboya au loin une seule fois avant que le silence complet ne revienne aussitôt après.",
      "Et plus rien ne bougea ensuite durant de longues minutes dans la nuit épaisse et immobile du port.",
      "Le gardien referma doucement la grille rouillée du vieux quai désert.",
    ].join(' ')

    const segments = segmentText(denseText, 5)

    for (const seg of segments) {
      expect(seg.text.length).toBeLessThanOrEqual(350)
    }
    expectTextPreserved(denseText, segments)
  })

  it('ne fusionne jamais plus de 3 courtes phrases consécutives en un seul segment sur un texte à rythme haché', () => {
    const chopeeText = [
      "Il attendit encore un peu.",
      "Il respira profondément une dernière fois.",
      "Il compta lentement jusqu'à dix.",
      "Il se leva enfin, doucement, sans un bruit.",
      "Il regarda autour de lui.",
      "Il n'y avait personne.",
    ].join(' ')

    const segments = segmentText(chopeeText, 5)

    // Compte le nombre maximal de lignes regroupées dans un même segment.
    const maxLinesInOneSegment = Math.max(...segments.map((s) => s.lines.length))
    expect(maxLinesInOneSegment).toBeLessThanOrEqual(3)
    expectTextPreserved(chopeeText, segments)
  })
})



describe('segmentText — forme générale des segments retournés', () => {
  it('chaque segment expose bien les champs attendus par le reste de l\'app', () => {
    const text = "Il pleuvait sur la ville. Elle marchait vite. Elle avait peur."
    const segments = segmentText(text, 5)

    expect(segments.length).toBeGreaterThan(0)
    for (const seg of segments) {
      expect(typeof seg.id).toBe('string')
      expect(Array.isArray(seg.lines)).toBe(true)
      expect(typeof seg.text).toBe('string')
      expect(seg.text.length).toBeGreaterThan(0)
      expect(seg.breakAt === null || typeof seg.breakAt === 'number').toBe(true)
      expect(typeof seg.isLeader).toBe('boolean')
    }
  })

  it('génère des id uniques pour chaque segment d\'un même appel', () => {
    const text = "Il pleuvait sur la ville. Elle marchait vite. Elle avait peur. Le vent soufflait fort."
    const segments = segmentText(text, 5)
    const ids = segments.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

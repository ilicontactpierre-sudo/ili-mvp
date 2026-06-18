import { useState, useCallback } from 'react'
import { filterAndScoreSounds } from '../../utils/soundSearch'

// ─────────────────────────────────────────────────────────────────────────────
// VOCABULAIRE CURÉ — groupé par intention narrative
// ~300 mots soigneusement sélectionnés depuis les catégories BOOM réelles
// Claude doit choisir EXCLUSIVEMENT dans cette liste
// ─────────────────────────────────────────────────────────────────────────────
const CURATED_VOCABULARY = {
  'Ambiances naturelles': [
    'forest', 'rain', 'wind', 'storm', 'thunder', 'ocean', 'waves', 'river',
    'birds', 'birdsong', 'crickets', 'insects', 'leaves', 'fire', 'snow',
    'rural', 'nature', 'dawn', 'night', 'morning', 'jungle', 'cave',
    'waterfall', 'lake', 'beach', 'seaside', 'wind chime',
    'drizzle', 'blizzard', 'fog', 'frost', 'mud', 'grass', 'swamp',
    'desert', 'mountain', 'field', 'coast',
  ],
  'Ambiances urbaines': [
    'city', 'traffic', 'street', 'crowd', 'urban', 'market', 'restaurant',
    'cafe', 'office', 'airport', 'subway', 'train', 'harbor', 'construction',
    'church', 'indoor', 'outdoor', 'room', 'corridor', 'bar',
    'port', 'docks', 'station', 'hospital', 'school', 'library',
    'hotel', 'prison', 'courtyard', 'basement', 'attic',
  ],
  'Ambiances historiques & lieux dramatiques': [
    'tavern', 'castle', 'dungeon', 'crypt', 'cathedral', 'monastery',
    'battlefield', 'trench', 'ruins', 'forge', 'stable', 'village',
    'cemetery', 'chapel', 'tower', 'cellar',
  ],
  'Atmosphères & tensions': [
    'dark', 'tension', 'horror', 'eerie', 'mystery', 'drone', 'ambient',
    'atmosphere', 'background', 'calm', 'peaceful', 'ominous', 'spooky',
    'dramatic', 'epic', 'cinematic', 'suspense', 'lonely', 'strange',
    'melancholic', 'haunting', 'oppressive', 'anxious', 'sacred',
    'ethereal', 'nostalgic', 'threatening', 'desolate',
  ],
  'Corps & états intérieurs': [
    'heartbeat', 'breath', 'pulse', 'breathing', 'gasp', 'sob',
    'tinnitus', 'dizzy', 'nausea', 'trembling', 'pain',
  ],
  'Guerre & violence': [
    'explosion', 'gunshot', 'artillery', 'bomb', 'fire', 'battle',
    'march', 'soldiers', 'siren', 'alarm', 'impact', 'shockwave',
    'rumble', 'distant', 'war',
  ],
  'Musique & instruments': [
    'piano', 'violin', 'guitar', 'accordion', 'trumpet', 'cello', 'drums',
    'orchestra', 'choir', 'flute', 'saxophone', 'bass', 'concerto', 'jazz',
    'tuba', 'harp', 'organ', 'carillon', 'bells', 'melody',
    'lullaby', 'requiem', 'waltz', 'march', 'folk', 'blues',
    'strings', 'brass', 'percussion', 'classical',
  ],
  'Sons diégétiques — lieux & mobilité': [
    'door', 'footstep', 'walk', 'car', 'airplane', 'boat', 'horse', 'stairs',
    'elevator', 'window', 'lock', 'key', 'gate', 'bridge',
    'motorcycle', 'bicycle', 'ship', 'wagon', 'running',
  ],
  'Sons diégétiques — actions humaines': [
    'knock', 'slam', 'click', 'writing', 'typing', 'phone', 'clock', 'alarm',
    'laugh', 'cry', 'scream', 'whisper', 'breath', 'cough', 'heartbeat',
    'applause', 'crowd', 'voice', 'speech',
    'drink', 'eat', 'pour', 'chew', 'swallow',
    'fight', 'punch', 'fall', 'drag', 'snore', 'prayer',
  ],
  'Sons diégétiques — objets & matières': [
    'glass', 'crash', 'gun', 'sword', 'hit', 'break',
    'paper', 'metal', 'wood', 'splash', 'drop', 'rattle', 'creak', 'scratch',
    'chain', 'rope', 'fire', 'candle', 'match', 'bell',
    'bottle', 'knife', 'hammer', 'saw', 'clock', 'typewriter',
  ],
  'Transitions & effets': [
    'whoosh', 'sweep', 'transition', 'riser', 'stinger', 'shockwave',
    'snap', 'ping', 'beep', 'notification', 'surprising',
    'boom', 'swoosh', 'sting', 'hit', 'drop',
  ],
  'Science-fiction & fantastique': [
    'spaceship', 'scifi', 'laser', 'alien', 'magic', 'spell', 'portal',
    'robot', 'electric', 'energy', 'futuristic', 'space', 'glitch',
    'teleport', 'force', 'shield', 'scanner', 'computer',
  ],
  'Animaux': [
    'dog', 'cat', 'horse', 'bird', 'wolf', 'crow', 'owl', 'rat',
    'insects', 'fly', 'frog', 'whale', 'lion', 'animal',
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR DE PROMPT COMPLET
// Le prompt est intégré à l'export — plus de fichier .md séparé
// ─────────────────────────────────────────────────────────────────────────────
function buildExportPrompt(segments, soundLibrary) {
  const getSegmentText = (seg) => {
    if (typeof seg === 'string') return seg
    if (seg && typeof seg.text === 'string') return seg.text
    return ''
  }
  const uploadedSounds = soundLibrary.filter(s => s.url && s.url.startsWith('http'))
  const lines = []

  lines.push('# ORCHESTRATION SONORE ILi — Instructions pour Claude')
  lines.push('')
  lines.push('Tu es un sound designer expert travaillant sur ILi, une application de lecture immersive.')
  lines.push('Le texte est découpé en segments courts lus séquentiellement, comme des plans au cinéma.')
  lines.push('Tu dois proposer une orchestration sonore précise, immersive et narrative.')
  lines.push('')
  lines.push('**Tu ne produis QUE du JSON brut. Aucun texte, aucun markdown, aucun commentaire.**')
  lines.push('')

  lines.push('## Format de sortie')
  lines.push('')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push('    "keyword": "rain",')
  lines.push('    "soundId": null,')
  lines.push('    "startSegment": 1,')
  lines.push('    "endSegment": 8,')
  lines.push('    "volume": 0.3,')
  lines.push('    "loop": true,')
  lines.push('    "fadeIn": 3,')
  lines.push('    "fadeOut": 4,')
  lines.push('    "delay": 0,')
  lines.push('    "delayTarget": null,')
  lines.push('    "pan": 0,')
  lines.push('    "panMode": "static",')
  lines.push('    "volumeEnvelope": "flat",')
  lines.push('    "type": "ambiance",')
  lines.push('    "note": "..."')
  lines.push('  }')
  lines.push(']')
  lines.push('```')
  lines.push('')

  lines.push('## Champs détaillés')
  lines.push('')
  lines.push('### type — VALEURS EXACTES')
  lines.push('- `"ambiance"` : son de lieu (forêt, pluie, ville...) → loop long, volume bas')
  lines.push('- `"atmosphere"` : tension émotionnelle sans lieu précis → loop, volume très bas')
  lines.push('- `"diegetique"` : son ancré dans l\'action narrée (porte, coup de feu...) → 1 segment, pas de loop')
  lines.push('- `"musique"` : musique instrumentale → volume moyen')
  lines.push('- `"transition"` : changement de scène ou temporalité → 1 segment, ponctuel')
  lines.push('')
  lines.push('### pan — Spatialisation stéréo')
  lines.push('Valeur entre -1.0 (gauche) et 1.0 (droite). 0 = centre.')
  lines.push('**Règle stricte** : utilise pan ≠ 0 UNIQUEMENT pour les sons diégétiques avec une position spatiale explicite dans le texte.')
  lines.push('Les ambiances, atmosphères et musiques restent TOUJOURS à pan: 0.')
  lines.push('Exemples corrects : voix entendue à gauche → -0.6, bruit de rue à droite → 0.5')
  lines.push('')
  lines.push('### panMode — Mouvement stéréo dynamique')
  lines.push('UNIQUEMENT pour les sons diégétiques avec un mouvement physique explicite dans le texte.')
  lines.push('Valeurs disponibles :')
  lines.push('- `"static"` : position fixe (défaut, utiliser dans tous les autres cas)')
  lines.push('- `"sweep-lr"` : balayage gauche → droite (voiture qui passe, avion...)')
  lines.push('- `"sweep-rl"` : balayage droite → gauche')
  lines.push('- `"oscillate-slow"` : oscillation lente (son qui tourne autour)')
  lines.push('- `"oscillate-fast"` : oscillation rapide')
  lines.push('Si tu utilises panMode ≠ "static", justifie-le dans la note.')
  lines.push('')
  lines.push('### delayTarget — Synchronisation sur un mot')
  lines.push('Quand un son diégétique doit apparaître sur un mot précis du segment (pas au début), indique ce mot.')
  lines.push('Exemple : segment "Il tourna la poignée et la porte claqua." → delayTarget: "claqua"')
  lines.push('Le système calculera automatiquement le délai en ms (vitesse de lecture estimée : 200 mots/minute).')
  lines.push('Si le son commence au début du segment, laisse delayTarget: null et delay: 0.')
  lines.push('**Ne pas utiliser delayTarget et delay simultanément.** L\'un ou l\'autre.')
  lines.push('')
  lines.push('### volumeEnvelope — Courbe de volume')
  lines.push('Pour les sons qui couvrent plusieurs segments, tu peux décrire une évolution de volume :')
  lines.push('- `"flat"` : volume constant (défaut)')
  lines.push('- `"crescendo"` : monte progressivement de 30% du volume cible jusqu\'à 100%')
  lines.push('- `"decrescendo"` : descend progressivement de 100% à 30%')
  lines.push('- `"swell"` : monte puis redescend (pic au milieu de la plage)')
  lines.push('Utilise ces courbes avec parcimonie — seulement quand l\'émotion narrative le justifie.')
  lines.push('')

  lines.push('## Règles critiques')
  lines.push('')
  lines.push('### Règle 1 — fadeOut')
  lines.push('Le fadeOut se déclenche AU DÉBUT du segment endSegment. Le son disparaît PENDANT la lecture de ce segment.')
  lines.push('')
  lines.push('### Règle 2 — Densité')
  lines.push('Maximum 3 sons simultanés stables. Les pics à 4 sont acceptables aux transitions.')
  lines.push('')
  lines.push('### Règle 3 — Respiration')
  lines.push('Laisse 1 à 2 segments sans son entre deux séquences distinctes. Le silence est dramatique.')
  lines.push('')
  lines.push('### Règle 4 — Sons diégétiques')
  lines.push('Un son diégétique = 1 seul segment, loop: false, fadeIn: 0, fadeOut: 0, volume 0.6–0.8.')
  lines.push('')
  lines.push('### Règle 5 — Loop obligatoire')
  lines.push('Tout son qui couvre plusieurs segments → loop: true + fadeOut > 0.')
  lines.push('')
  lines.push('### Règle 6 — Contraste')
  lines.push('Après une zone dense, prévois une zone épurée.')
  lines.push('')
  lines.push('### Règle 7 — Pan et panMode')
  lines.push('Pan ≠ 0 et panMode ≠ "static" sont RÉSERVÉS aux sons diégétiques avec position ou mouvement explicite.')
  lines.push('Maximum 20% des blocs diégétiques peuvent avoir un pan ou panMode non-standard.')
  lines.push('Ne jamais mettre pan ≠ 0 sur une ambiance ou une musique.')
  lines.push('')
  lines.push('### Règle 8 — volumeEnvelope')
  lines.push('Maximum 2 blocs avec volumeEnvelope ≠ "flat" par orchestration. Réserve-les aux moments clés.')
  lines.push('')

  if (uploadedSounds.length > 0) {
    lines.push('## Sons déjà uploadés — UTILISE-LES EN PRIORITÉ')
    lines.push('')
    lines.push('Pour ces sons, utilise "soundId" avec leur ID exact (et mets "keyword": null).')
    lines.push('')
    uploadedSounds.forEach(s => {
      const tags = (s.tags || []).slice(0, 5).join(', ')
      const dur = s.duration ? `${Math.round(s.duration)}s` : '?'
      const loop = s.loop ? ' · loop' : ''
      lines.push(`- **${s.id}** | "${s.label}" | ${dur}${loop}`)
      if (tags) lines.push(`  tags: ${tags}`)
    })
    lines.push('')
  }

  lines.push('## Vocabulaire disponible — Keywords autorisés')
  lines.push('')
  lines.push('**RÈGLE ABSOLUE : chaque keyword doit être un mot de cette liste.**')
  lines.push('')
  Object.entries(CURATED_VOCABULARY).forEach(([group, words]) => {
    lines.push(`**${group}** :`)
    lines.push(words.join(', '))
    lines.push('')
  })

  lines.push('## Volumes de référence')
  lines.push('')
  lines.push('- Ambiance géographique (loop) : 0.15–0.35')
  lines.push('- Atmosphere émotionnelle (loop) : 0.12–0.3')
  lines.push('- Son diégétique (ponctuel) : 0.55–0.8')
  lines.push('- Musique : 0.25–0.5')
  lines.push('- Transition : 0.45–0.7')
  lines.push('')

  lines.push('---')
  lines.push(`## Texte à orchestrer (${segments.length} segments)`)
  lines.push('')
  segments.forEach((seg, i) => {
    const text = getSegmentText(seg).trim()
    if (text) lines.push(`[${i + 1}] ${text}`)
  })
  lines.push('')
  lines.push('---')
  lines.push('**Produis maintenant le JSON. Rien d\'autre.**')

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// RECHERCHE AMÉLIORÉE pour le diagnostic import
// Utilise filterAndScoreSounds au lieu du simple .includes()
// ─────────────────────────────────────────────────────────────────────────────
function findSoundsByKeyword(keyword, soundLibrary) {
  if (!keyword) return []
  // Utilise le moteur enrichi (synonymes FR↔EN, virtual field, etc.)
  const results = filterAndScoreSounds(soundLibrary, keyword, [], false)
  return results.slice(0, 20) // limiter pour les perfs
}

function findSoundById(soundId, soundLibrary) {
  if (!soundId) return null
  return soundLibrary.find(s => s.id === soundId) || null
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function OrchestrationPanel({
  segments,
  soundLibrary,
  soundTracks,
  onSoundTracksChange,
  onSaveToHistory,
}) {
  const [exportText, setExportText] = useState('')
  const [importJson, setImportJson] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [diagnosis, setDiagnosis] = useState(null)
  const [applyStatus, setApplyStatus] = useState('idle')
  const [copyStatus, setCopyStatus] = useState('idle')
  const [importError, setImportError] = useState('')

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!segments || segments.length === 0) {
      alert('Aucun segment à exporter.')
      return
    }

    const text = buildExportPrompt(segments, soundLibrary)
    setExportText(text)

    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    }).catch(() => {
      const el = document.createElement('textarea')
      el.value = text
      el.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    })
  }, [segments, soundLibrary])

  // ── Diagnostic ───────────────────────────────────────────────────────────
  const handleDiagnose = useCallback(() => {
    setImportError('')
    setDiagnosis(null)
    setApplyStatus('idle')

    if (!importJson.trim()) {
      setImportError('Colle le JSON de Claude ici.')
      return
    }

    let parsed
    try {
      const clean = importJson
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      parsed = JSON.parse(clean)
    } catch (e) {
      setImportError(`JSON invalide : ${e.message}`)
      return
    }

    if (!Array.isArray(parsed)) {
      setImportError('Le JSON doit être un tableau [ ... ]')
      return
    }

    const found = []
    const missing = []

    parsed.forEach((block, idx) => {
      // Cas 1 : soundId fourni → cherche directement par ID
      if (block.soundId) {
        const sound = findSoundById(block.soundId, soundLibrary)
        if (!sound) {
          missing.push({
            index: idx,
            keyword: block.soundId,
            reason: `Son introuvable avec l'ID "${block.soundId}"`,
            type: block.type,
            block,
          })
          return
        }
        const hasUrl = !!(sound.url && sound.url.startsWith('http'))
        if (hasUrl) {
          found.push({ index: idx, keyword: block.soundId, sound, block, type: block.type, matchedById: true })
        } else {
          missing.push({
            index: idx,
            keyword: block.soundId,
            reason: `Son trouvé mais non uploadé sur Supabase`,
            candidates: [sound.label],
            ghostSound: sound,
            type: block.type,
            block,
          })
        }
        return
      }

      // Cas 2 : keyword → recherche enrichie
      if (!block.keyword) {
        missing.push({ index: idx, keyword: '(manquant)', reason: 'Pas de champ keyword ni soundId', type: block.type, block })
        return
      }

      const matches = findSoundsByKeyword(block.keyword, soundLibrary)
      const uploaded = matches.filter(s => s.url && s.url.startsWith('http'))

      if (matches.length === 0) {
        missing.push({
          index: idx,
          keyword: block.keyword,
          reason: 'Aucun son trouvé pour ce keyword (même avec synonymes)',
          type: block.type,
          block,
        })
      } else if (uploaded.length === 0) {
        missing.push({
          index: idx,
          keyword: block.keyword,
          reason: `${matches.length} son(s) trouvé(s) mais aucun uploadé sur Supabase`,
          candidates: matches.slice(0, 3).map(s => s.label),
          type: block.type,
          ghostSound: pickRandom(matches),
          block,
        })
      } else {
        found.push({
          index: idx,
          keyword: block.keyword,
          sound: pickRandom(uploaded),
          block,
          type: block.type,
        })
      }
    })

    setDiagnosis({ found, missing, parsed })
  }, [importJson, soundLibrary])

  // ── Application ───────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (!diagnosis) return

    // Couleurs par type — basées sur CATEGORY_COLORS existants
    const TYPE_COLORS = {
      ambiance:    '#7EC8C8',
      atmosphere:  '#C8C8A8',
      diegetique:  '#F0A87E',
      musique:     '#B59FD8',
      transition:  '#A8D4A8',
    }

    const newTracks = []

    const resolveSegmentId = (segNum) => {
      const idx = segNum - 1
      if (idx < 0 || idx >= segments.length) return null
      const seg = segments[idx]
      return { id: seg?.id || `seg_${idx}`, idx }
    }

    const findFreeColumn = (startIdx, endIdx) => {
      for (let c = 0; c < 6; c++) {
        const conflict = [...soundTracks, ...newTracks].some(track => {
          const ts = segments.findIndex(s => (s.id || `seg_${segments.indexOf(s)}`) === track.startSegmentId)
          const te = segments.findIndex(s => (s.id || `seg_${segments.indexOf(s)}`) === track.endSegmentId)
          const teR = te !== -1 ? te : ts
          return track.column === c && ts <= endIdx && teR >= startIdx
        })
        if (!conflict) return c
      }
      return 0
    }

    // Calcule le délai en ms à partir d'un mot cible dans le texte du segment
    const computeDelayFromTarget = (block, segmentText) => {
      if (!block.delayTarget || !segmentText) return Math.round((block.delay ?? 0) * 1000)
      const words = segmentText.trim().split(/\s+/)
      const target = block.delayTarget.toLowerCase()
      const targetIdx = words.findIndex(w => w.toLowerCase().includes(target))
      if (targetIdx === -1) return Math.round((block.delay ?? 0) * 1000)
      // 200 mots/min = 300ms/mot
      return Math.round(targetIdx * 300)
    }

    // Convertit une volumeEnvelope en automationPoints
    const buildAutomationPoints = (block, startSeg, endSeg) => {
      const envelope = block.volumeEnvelope || 'flat'
      if (envelope === 'flat') return []
      const vol = block.volume ?? 0.5
      const segs = segments

      const makePoint = (segIdx, volume) => {
        const seg = segs[segIdx]
        if (!seg) return null
        return {
          segmentId: seg.id || seg._id || `seg_${segIdx}`,
          volume: Math.round(volume * 100) / 100,
          fadeMs: 800,
        }
      }

      const startIdx = startSeg.idx
      const endIdx = endSeg.idx
      const midIdx = Math.round((startIdx + endIdx) / 2)

      if (envelope === 'crescendo') {
        return [
          makePoint(startIdx, vol * 0.3),
          makePoint(endIdx, vol),
        ].filter(Boolean)
      }
      if (envelope === 'decrescendo') {
        return [
          makePoint(startIdx, vol),
          makePoint(endIdx, vol * 0.3),
        ].filter(Boolean)
      }
      if (envelope === 'swell') {
        return [
          makePoint(startIdx, vol * 0.3),
          makePoint(midIdx, vol),
          makePoint(endIdx, vol * 0.3),
        ].filter(Boolean)
      }
      return []
    }

    const buildTrack = (sound, block, muted = false, broken = false) => {
      const start = resolveSegmentId(block.startSegment)
      const end = resolveSegmentId(block.endSegment)
      if (!start || !end) return null

      const col = findFreeColumn(start.idx, end.idx)
      const segmentText = (() => {
        const seg = segments[start.idx]
        if (!seg) return ''
        return typeof seg === 'string' ? seg : (seg.text || '')
      })()

      const delayMs = computeDelayFromTarget(block, segmentText)
      const automationPoints = buildAutomationPoints(block, start, end)
      const color = TYPE_COLORS[block.type] || TYPE_COLORS.ambiance

      // Pan : uniquement pour les sons diégétiques
      const isDiegetique = block.type === 'diegetique'
      const pan = isDiegetique ? (block.pan ?? 0) : 0
      const panMode = isDiegetique ? (block.panMode ?? 'static') : 'static'

      return {
        id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${newTracks.length}`,
        soundId: sound.id,
        startSegmentId: start.id,
        endSegmentId: end.id,
        column: col,
        volume: block.volume ?? 0.5,
        loop: block.loop ?? false,
        fadeIn: Math.round((block.fadeIn ?? 0) * 1000),
        fadeOut: Math.round((block.fadeOut ?? 0) * 1000),
        delay: delayMs,
        pan,
        panMode,
        muted,
        broken: broken || undefined,
        color,
        automationPoints: automationPoints.length > 0 ? automationPoints : undefined,
        _orchestrationNote: block.note || '',
        _orchestrationKeyword: block.soundId || block.keyword || '',
      }
    }

    diagnosis.found.forEach(({ block, sound }) => {
      const track = buildTrack(sound, block, false, false)
      if (track) newTracks.push(track)
    })
    diagnosis.missing.forEach(({ block, ghostSound }) => {
      if (!block || !ghostSound) return
      const track = buildTrack(ghostSound, block, true, true)
      if (track) newTracks.push(track)
    })

    if (newTracks.length === 0) { setApplyStatus('error'); return }

    onSoundTracksChange([...soundTracks, ...newTracks])
    if (onSaveToHistory) onSaveToHistory()
    setApplyStatus('success')
  }, [diagnosis, segments, soundTracks, onSoundTracksChange, onSaveToHistory])

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setImportJson('')
    setDiagnosis(null)
    setApplyStatus('idle')
    setImportError('')
    setShowImport(false)
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    container: { marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)' },
    title: { fontSize: '1.125rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '1.25rem' },
    box: {
      padding: '1.25rem',
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '8px',
      marginBottom: '1rem',
    },
    label: { fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.875rem' },
    labelStrong: { color: 'rgba(255,255,255,0.75)' },
    row: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' },
    btn: (variant = 'secondary') => ({
      padding: '0.625rem 1.25rem',
      fontSize: '0.875rem',
      borderRadius: '7px',
      border: variant === 'primary' ? 'none' : '1px solid rgba(255,255,255,0.12)',
      backgroundColor: variant === 'primary' ? '#4f46e5' : variant === 'success' ? 'rgba(40,167,69,0.2)' : variant === 'danger' ? 'rgba(220,53,69,0.15)' : 'rgba(255,255,255,0.06)',
      color: variant === 'primary' ? 'white' : variant === 'success' ? 'rgba(74,222,128,0.9)' : variant === 'danger' ? '#dc3545' : 'rgba(255,255,255,0.75)',
      cursor: 'pointer',
      fontWeight: variant === 'primary' ? 500 : 400,
      transition: 'all 0.15s ease',
      display: 'flex', alignItems: 'center', gap: '0.4rem',
    }),
    textarea: {
      width: '100%', minHeight: '180px', padding: '0.875rem',
      fontSize: '0.8125rem', fontFamily: 'monospace',
      backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '7px', color: 'rgba(255,255,255,0.85)', resize: 'vertical',
      lineHeight: '1.5', boxSizing: 'border-box',
    },
    diagBox: (type) => ({
      padding: '1rem', borderRadius: '7px', marginTop: '0.75rem',
      backgroundColor: type === 'ok' ? 'rgba(40,167,69,0.06)' : type === 'warn' ? 'rgba(255,193,7,0.06)' : 'rgba(220,53,69,0.06)',
      border: `1px solid ${type === 'ok' ? 'rgba(40,167,69,0.2)' : type === 'warn' ? 'rgba(255,193,7,0.2)' : 'rgba(220,53,69,0.2)'}`,
    }),
    diagTitle: (type) => ({
      fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem',
      color: type === 'ok' ? 'rgba(74,222,128,0.9)' : type === 'warn' ? 'rgba(255,193,7,0.9)' : 'rgba(220,53,69,0.9)',
    }),
    diagItem: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '0.25rem' },
    error: {
      fontSize: '0.8125rem', color: 'rgba(220,53,69,0.9)', marginTop: '0.5rem',
      padding: '0.5rem 0.75rem', backgroundColor: 'rgba(220,53,69,0.06)',
      borderRadius: '5px', border: '1px solid rgba(220,53,69,0.15)',
    },
    stat: {
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem',
      backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem', marginBottom: '0.5rem',
    },
  }

  const canExport = segments && segments.length > 0
  const uploadedCount = soundLibrary.filter(s => s.url && s.url.startsWith('http')).length

  return (
    <div style={s.container}>
      <div style={s.title}>🎼 Orchestration automatique (Claude)</div>

      {/* ── Stats bibliothèque ── */}
      <div style={{ marginBottom: '1rem' }}>
        <span style={s.stat}>📚 {soundLibrary.length} sons</span>
        <span style={s.stat}>☁️ {uploadedCount} uploadés</span>
        <span style={s.stat}>📝 {segments?.length || 0} segments</span>
      </div>

      {/* ── Étape 1 : Export ── */}
      <div style={s.box}>
        <div style={s.label}>
          <strong style={s.labelStrong}>Étape 1</strong> — Exporte le prompt complet et colle-le directement dans une nouvelle conversation Claude.
          Le prompt contient déjà toutes les instructions + le vocabulaire + le texte.
        </div>
        <div style={s.row}>
          <button
            onClick={handleExport}
            disabled={!canExport}
            style={{ ...s.btn('primary'), opacity: canExport ? 1 : 0.4, cursor: canExport ? 'pointer' : 'not-allowed' }}
          >
            {copyStatus === 'copied' ? '✓ Copié dans le presse-papier !' : '↗ Générer & copier le prompt'}
          </button>
          {exportText && (
            <button onClick={() => setExportText('')} style={s.btn()}>Masquer</button>
          )}
        </div>

        {exportText && (
          <>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.4rem' }}>
              {exportText.length.toLocaleString()} caractères · colle tout ça dans Claude
            </div>
            <textarea value={exportText} readOnly style={{ ...s.textarea, minHeight: '120px' }} />
          </>
        )}
      </div>

      {/* ── Étape 2 : Import ── */}
      <div style={s.box}>
        <div style={s.label}>
          <strong style={s.labelStrong}>Étape 2</strong> — Colle ici le JSON retourné par Claude, vérifie le diagnostic, puis applique.
        </div>

        {!showImport && applyStatus === 'idle' && (
          <button onClick={() => setShowImport(true)} style={s.btn()}>
            ↙ Coller le JSON de Claude
          </button>
        )}

        {(showImport || importJson) && applyStatus !== 'success' && (
          <>
            <textarea
              value={importJson}
              onChange={e => {
                setImportJson(e.target.value)
                setDiagnosis(null)
                setImportError('')
                setApplyStatus('idle')
              }}
              placeholder='Colle ici le JSON retourné par Claude [ { "keyword": "rain", ... }, ... ]'
              style={{ ...s.textarea, marginBottom: '0.75rem' }}
            />
            {importError && <div style={s.error}>{importError}</div>}
            <div style={s.row}>
              <button
                onClick={handleDiagnose}
                disabled={!importJson.trim()}
                style={{ ...s.btn('primary'), opacity: importJson.trim() ? 1 : 0.4, cursor: importJson.trim() ? 'pointer' : 'not-allowed' }}
              >
                🔍 Analyser
              </button>
              <button onClick={handleReset} style={s.btn()}>Annuler</button>
            </div>
          </>
        )}

        {/* ── Diagnostic ── */}
        {diagnosis && applyStatus !== 'success' && (
          <div style={{ marginTop: '0.75rem' }}>

            {/* Sons trouvés */}
            {diagnosis.found.length > 0 && (
              <div style={s.diagBox('ok')}>
                <div style={s.diagTitle('ok')}>✓ {diagnosis.found.length} bloc(s) prêts</div>
                {diagnosis.found.map((item, i) => (
                  <div key={i} style={s.diagItem}>
                    <strong style={{ color: 'rgba(255,255,255,0.75)' }}>
                      [{item.block.startSegment}→{item.block.endSegment}]
                    </strong>{' '}
                    {item.matchedById
                      ? <span style={{ fontSize: '0.68rem', color: 'rgba(74,222,128,0.7)' }}>id direct</span>
                      : <code style={{ fontSize: '0.7rem', opacity: 0.8 }}>{item.keyword}</code>
                    }
                    {' → '}
                    <span style={{ fontStyle: 'italic' }}>{item.sound.label}</span>
                    {item.block.note && <span style={{ opacity: 0.5 }}> — {item.block.note}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Sons manquants */}
            {diagnosis.missing.length > 0 && (
              <div style={{ ...s.diagBox('warn'), marginTop: '0.5rem' }}>
                <div style={s.diagTitle('warn')}>⚠ {diagnosis.missing.length} bloc(s) avec problème</div>
                {diagnosis.missing.map((item, i) => (
                  <div key={i} style={{ ...s.diagItem, marginBottom: '0.5rem' }}>
                    <strong style={{ color: 'rgba(255,255,255,0.7)' }}>
                      keyword : <code style={{ fontSize: '0.7rem' }}>{item.keyword}</code>
                    </strong>
                    <br />
                    <span style={{ opacity: 0.7 }}>{item.reason}</span>
                    {item.candidates?.length > 0 && (
                      <>
                        <br />
                        <span style={{ opacity: 0.6 }}>Sons à uploader : {item.candidates.join(', ')}</span>
                      </>
                    )}
                    {item.ghostSound && (
                      <>
                        <br />
                        <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>→ Bloc grisé créé avec : {item.ghostSound.label}</span>
                      </>
                    )}
                  </div>
                ))}
                {diagnosis.missing.some(m => m.candidates) && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,193,7,0.7)', fontStyle: 'italic' }}>
                    → Uploade ces sons via le sélecteur, puis relance l'analyse.
                  </div>
                )}
              </div>
            )}

            {/* Bouton appliquer */}
            {(diagnosis.found.length > 0 || diagnosis.missing.some(m => m.ghostSound)) && (
              <div style={{ ...s.row, marginTop: '1rem' }}>
                <button onClick={handleApply} style={s.btn('success')}>
                  ✦ Appliquer{diagnosis.found.length > 0 ? ` ${diagnosis.found.length} bloc(s)` : ''}
                  {diagnosis.missing.some(m => m.ghostSound) ? ` + ${diagnosis.missing.filter(m => m.ghostSound).length} grisé(s)` : ''} sur la timeline
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Succès ── */}
        {applyStatus === 'success' && (
          <div style={{ ...s.diagBox('ok'), marginTop: '0.75rem' }}>
            <div style={s.diagTitle('ok')}>✓ Orchestration appliquée</div>
            <div style={s.diagItem}>
              {diagnosis.found.length} bloc(s) ajouté(s). Tu peux modifier chaque bloc manuellement.
            </div>
            <button onClick={handleReset} style={{ ...s.btn(), marginTop: '0.75rem' }}>
              Nouvelle orchestration
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrchestrationPanel
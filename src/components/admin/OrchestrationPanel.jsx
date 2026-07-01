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

  // ── SECTION 1 — Identité et mission ──────────────────────────────────────
  lines.push('# ORCHESTRATION SONORE ILi — Instructions pour Claude')
  lines.push('')
  lines.push('Tu es une équipe de trois experts travaillant ensemble sur ILi, une application de lecture immersive :')
  lines.push('- Un **sound designer** : il pense en ambiances, textures sonores, effets ancrés dans les lieux et les corps')
  lines.push('- Un **compositeur** : il entend les leitmotivs, les thèmes, les motifs récurrents qui portent les personnages')
  lines.push('- Un **monteur son** : il contrôle le rythme, la densité, la respiration, et décide des silences')
  lines.push('')
  lines.push('Ton objectif : produire une orchestration de niveau cinématographique professionnel.')
  lines.push('Pas une liste de sons mécaniquement placés — une partition vivante qui épouse chaque inflexion narrative.')
  lines.push('')
  lines.push('Le texte est découpé en segments numérotés lus séquentiellement, comme des plans au cinéma.')
  lines.push('Chaque segment est une unité de temps. Chaque son est une décision dramatique.')
  lines.push('')

  // ── SECTION 2 — Passe 1 obligatoire : le script dramaturgique ────────────
  lines.push('## PASSE 1 OBLIGATOIRE — Le script dramaturgique')
  lines.push('')
  lines.push('Avant de produire le JSON, tu dois écrire un bloc `<script>` visible dans ta réponse.')
  lines.push('Ce script est ta "partition" — tu t\'y tiens pour générer le JSON qui suit.')
  lines.push('')
  lines.push('Le bloc `<script>` contient exactement ces 5 rubriques :')
  lines.push('')
  lines.push('**1. Découpage en scènes**')
  lines.push('Pour chaque scène : numéro de scène | segments couverts (ex: seg 1→18) | titre de scène | émotion dominante')
  lines.push('')
  lines.push('**2. Palette sonore globale**')
  lines.push('4 à 6 mots qui définissent l\'univers sonore de CETTE histoire spécifique.')
  lines.push('Exemple : "maritime / mélancolie / rivalité / Méditerranée / ambition"')
  lines.push('Ces mots guident toutes tes décisions sonores.')
  lines.push('')
  lines.push('**3. Personnages et leitmotivs proposés**')
  lines.push('Pour chaque personnage ou concept narratif récurrent, propose un leitmotiv sonore avec :')
  lines.push('- Nom du leitmotiv (ex: "thème de Rim", "motif du danger")')
  lines.push('- Type de son suggéré (instrument, texture, ambiance)')
  lines.push('- Intention dramatique (ce qu\'il exprime, comment il évolue)')
  lines.push('- Mention explicite : "à rechercher dans votre bibliothèque" si aucun son exact disponible')
  lines.push('')
  lines.push('**4. Plan des couches par scène**')
  lines.push('Pour chaque scène : quelles couches sont actives (bed / atmosphere / music / diegetic) et avec quelle densité (légère / moyenne / dense)')
  lines.push('')
  lines.push('**5. Beats clés**')
  lines.push('Liste des moments dramatiquement importants avec leur numéro de segment et leur traitement sonore prévu.')
  lines.push('Types de beats : silence, impact, swell, rupture, citation leitmotiv, transition.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 3 — Architecture en 4 couches ────────────────────────────────
  lines.push('## Architecture en 4 couches')
  lines.push('')
  lines.push('Tout son appartient à exactement une couche. Le champ `layer` le précise.')
  lines.push('')
  lines.push('### Couche "bed" — Ambiance géographique de fond')
  lines.push('- Toujours présente quand on est dans un lieu défini')
  lines.push('- Volume très bas : 0.12–0.28')
  lines.push('- `loop: true`, `loopCrossfade: "medium"` systématique')
  lines.push('- fadeIn long (3–8 secondes), fadeOut long')
  lines.push('- Ne varie presque pas en volume — c\'est le sol sur lequel tout repose')
  lines.push('- Maximum 1 bed actif à la fois (sauf transition entre deux lieux)')
  lines.push('- `automationPoints` rares, uniquement si changement de lieu progressif')
  lines.push('')
  lines.push('### Couche "atmosphere" — Tension émotionnelle sans lieu')
  lines.push('- Drones, textures, bourdons, pulsations, nappes')
  lines.push('- Volume très bas : 0.10–0.22')
  lines.push('- `loop: true`, `loopCrossfade: "medium"`')
  lines.push('- S\'intensifie avec la tension narrative → `automationPoints` fréquents')
  lines.push('- Peut coexister avec le bed')
  lines.push('- fadeIn moyen (2–5s), fadeOut variable selon rupture narrative')
  lines.push('')
  lines.push('### Couche "music" — Thèmes, leitmotivs, musique d\'accompagnement')
  lines.push('- Volume moyen : 0.20–0.45')
  lines.push('- Doit respirer : ne pas couvrir tout le texte en continu')
  lines.push('- `automationPoints` quasi-systématiques : elle s\'efface pendant les dialogues, remonte pendant les descriptions')
  lines.push('- `leitmotiv` obligatoire si lié à un personnage ou concept récurrent')
  lines.push('- Intensités : "premier plan" (0.35–0.45), "second plan" (0.15–0.25), "citation" (1 segment, ponctuel)')
  lines.push('- `loop: true` ou `false` selon durée et intention')
  lines.push('')
  lines.push('### Couche "diegetic" — Sons de l\'action narrée')
  lines.push('- 1 segment exact, `loop: false`, fadeIn: 0, fadeOut: 0')
  lines.push('- Volume élevé : 0.55–0.82')
  lines.push('- `delayTarget` pour synchroniser sur un mot précis du segment')
  lines.push('- `pan` autorisé si position spatiale explicite dans le texte')
  lines.push('- `panMode` autorisé si mouvement physique explicite (voiture qui passe → "sweep-lr")')
  lines.push('- Jamais d\'`automationPoints` sur cette couche')
  lines.push('')
  lines.push('### Couche "transition" — Rupture narrative')
  lines.push('- 1 segment, ponctuel, volume 0.45–0.70')
  lines.push('- Marque un changement de scène, de temporalité, ou une rupture narrative forte')
  lines.push('- Pas de loop, fadeIn/fadeOut selon intention spécifique')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 4 — automationPoints ─────────────────────────────────────────
  lines.push('## automationPoints — Règles d\'or')
  lines.push('')
  lines.push('Les `automationPoints` sont l\'outil le plus puissant du moteur.')
  lines.push('Une orchestration experte les utilise systématiquement sur tous les blocs multi-segments importants.')
  lines.push('')
  lines.push('**Format dans le JSON de sortie :**')
  lines.push('```json')
  lines.push('"automationPoints": [')
  lines.push('  { "segment": 12, "volume": 0.08, "fadeMs": 2500 },')
  lines.push('  { "segment": 18, "volume": 0.22, "fadeMs": 1500 },')
  lines.push('  { "segment": 25, "volume": 0.05, "fadeMs": 3000 }')
  lines.push(']')
  lines.push('```')
  lines.push('où `segment` est le numéro absolu du segment (même repère que `startSegment` / `endSegment`).')
  lines.push('')
  lines.push('**`fadeMs` recommandés par intention :**')
  lines.push('- Instantané : 0')
  lines.push('- Imperceptible : 300')
  lines.push('- Court : 600')
  lines.push('- Naturel : 1500')
  lines.push('- Long : 2500')
  lines.push('- Scénique : 5000')
  lines.push('- Cinématique : 10000')
  lines.push('')
  lines.push('**Règles d\'application :**')
  lines.push('- Toute musique qui couvre un dialogue doit descendre pendant le dialogue et remonter après')
  lines.push('- Toute atmosphère qui s\'intensifie progressivement doit avoir des points intermédiaires, pas seulement début/fin')
  lines.push('- Un bed qui traverse un pic émotionnel fort baisse légèrement pendant la tension')
  lines.push('- Les points doivent être narrativement motivés, jamais arbitraires')
  lines.push('- Minimum 2 points sur tout bloc qui dure plus de 8 segments')
  lines.push('- Ne jamais mettre d\'automationPoints sur les sons diégétiques')
  lines.push('- `automationPoints: []` si pas de points (ne jamais omettre le champ)')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 5 — loopCrossfade, pan, panMode ───────────────────────────────
  lines.push('## loopCrossfade, pan et panMode')
  lines.push('')
  lines.push('### loopCrossfade')
  lines.push('- `"medium"` : défaut sur TOUT bloc `loop: true` sans exception')
  lines.push('- `"long"` : ambiances très lentes, nappes texturales, drones profonds')
  lines.push('- `"none"` : sons rythmiques, percussions, boucles qui doivent boucler sec')
  lines.push('- Sur tout bloc `loop: false` → `loopCrossfade: "none"` obligatoire')
  lines.push('')
  lines.push('### pan')
  lines.push('- Valeur entre -1.0 (gauche) et 1.0 (droite), 0 = centre')
  lines.push('- Réservé exclusivement à la couche "diegetic" avec position spatiale explicite dans le texte')
  lines.push('- Jamais sur bed, atmosphere, music')
  lines.push('- Maximum 20% des sons diégétiques')
  lines.push('')
  lines.push('### panMode')
  lines.push('- `"static"` : défaut absolu pour tous les sons')
  lines.push('- `"sweep-lr"` / `"sweep-rl"` : mouvement physique explicite (voiture qui passe, avion, pas qui s\'éloignent)')
  lines.push('- `"oscillate-slow"` / `"oscillate-fast"` : son qui tourne, hésite, cherche')
  lines.push('- `"converge"` / `"diverge"` : mouvement centripète ou centrifuge')
  lines.push('- Justification obligatoire dans le champ `note` si panMode ≠ "static"')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 6 — Leitmotivs ────────────────────────────────────────────────
  lines.push('## Leitmotivs')
  lines.push('')
  lines.push('Un leitmotiv est un son ou une texture associée à un personnage, un lieu récurrent, ou un concept narratif')
  lines.push('(danger, amour, trahison, espoir). Il revient à chaque apparition de l\'élément, transformé mais reconnaissable.')
  lines.push('')
  lines.push('**Règles :**')
  lines.push('- Toute musique ou atmosphère liée à un personnage ou concept récurrent → champ `leitmotiv` obligatoire')
  lines.push('- Nom précis et cohérent dans toute l\'orchestration (ex: "thème de Rim", "motif du danger")')
  lines.push('- Si la bibliothèque ne contient pas le son idéal, utilise le keyword le plus proche')
  lines.push('  ET signale dans `note` : "Idéalement : [description du son parfait] — à rechercher dans votre bibliothèque"')
  lines.push('- Traitements possibles (à préciser dans `note`) :')
  lines.push('  - "citation" : 1 segment, au premier plan (volume haut)')
  lines.push('  - "contrepoint" : en dessous de la voix, volume bas')
  lines.push('  - "écho" : après la scène principale')
  lines.push('  - "transformation" : même leitmotiv mais mode sombre ou altéré')
  lines.push('- `leitmotiv: null` si pas de leitmotiv (ne jamais omettre le champ)')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 7 — Sons uploadés + vocabulaire ───────────────────────────────
  if (uploadedSounds.length > 0) {
    lines.push('## Sons déjà uploadés — UTILISE-LES EN PRIORITÉ ABSOLUE')
    lines.push('')
    lines.push('Pour ces sons, utilise le champ `"soundId"` avec leur ID exact (et mets `"keyword": null`).')
    lines.push('Ces sons sont déjà dans la bibliothèque et ont été sélectionnés pour cette histoire.')
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
  lines.push('**RÈGLE ABSOLUE : chaque `keyword` doit être un mot de cette liste exactement.**')
  lines.push('Si aucun keyword ne correspond au son idéal, utilise le plus proche et signale-le dans `note`.')
  lines.push('')
  Object.entries(CURATED_VOCABULARY).forEach(([group, words]) => {
    lines.push(`**${group}** :`)
    lines.push(words.join(', '))
    lines.push('')
  })

  // ── SECTION 8 — Format JSON strict ───────────────────────────────────────
  lines.push('---')
  lines.push('')
  lines.push('## Format JSON de sortie — Strict')
  lines.push('')
  lines.push('**Structure de chaque bloc :**')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push('    "keyword": "rain",')
  lines.push('    "soundId": null,')
  lines.push('    "startSegment": 1,')
  lines.push('    "endSegment": 8,')
  lines.push('    "volume": 0.22,')
  lines.push('    "loop": true,')
  lines.push('    "loopCrossfade": "medium",')
  lines.push('    "fadeIn": 4,')
  lines.push('    "fadeOut": 5,')
  lines.push('    "delay": 0,')
  lines.push('    "delayTarget": null,')
  lines.push('    "pan": 0,')
  lines.push('    "panMode": "static",')
  lines.push('    "automationPoints": [')
  lines.push('      { "segment": 3, "volume": 0.18, "fadeMs": 2500 },')
  lines.push('      { "segment": 6, "volume": 0.28, "fadeMs": 1500 }')
  lines.push('    ],')
  lines.push('    "layer": "bed",')
  lines.push('    "leitmotiv": null,')
  lines.push('    "type": "ambiance",')
  lines.push('    "note": "Pluie de fond posant le lieu. Descend seg 3 (dialogue), remonte seg 6 (approche de la révélation)."')
  lines.push('  },')
  lines.push('  {')
  lines.push('    "keyword": "piano",')
  lines.push('    "soundId": null,')
  lines.push('    "startSegment": 5,')
  lines.push('    "endSegment": 20,')
  lines.push('    "volume": 0.32,')
  lines.push('    "loop": true,')
  lines.push('    "loopCrossfade": "long",')
  lines.push('    "fadeIn": 6,')
  lines.push('    "fadeOut": 8,')
  lines.push('    "delay": 0,')
  lines.push('    "delayTarget": null,')
  lines.push('    "pan": 0,')
  lines.push('    "panMode": "static",')
  lines.push('    "automationPoints": [')
  lines.push('      { "segment": 7, "volume": 0.10, "fadeMs": 2500 },')
  lines.push('      { "segment": 12, "volume": 0.30, "fadeMs": 5000 },')
  lines.push('      { "segment": 17, "volume": 0.08, "fadeMs": 1500 }')
  lines.push('    ],')
  lines.push('    "layer": "music",')
  lines.push('    "leitmotiv": "thème d\'Elsa",')
  lines.push('    "type": "musique",')
  lines.push('    "note": "Thème principal d\'Elsa. Second plan dialogues, premier plan descriptions intérieures. Idéalement : piano solo mélancolique, notes espacées — à rechercher dans votre bibliothèque."')
  lines.push('  },')
  lines.push('  {')
  lines.push('    "keyword": "door",')
  lines.push('    "soundId": null,')
  lines.push('    "startSegment": 9,')
  lines.push('    "endSegment": 9,')
  lines.push('    "volume": 0.72,')
  lines.push('    "loop": false,')
  lines.push('    "loopCrossfade": "none",')
  lines.push('    "fadeIn": 0,')
  lines.push('    "fadeOut": 0,')
  lines.push('    "delay": 0,')
  lines.push('    "delayTarget": "claqua",')
  lines.push('    "pan": 0.4,')
  lines.push('    "panMode": "static",')
  lines.push('    "automationPoints": [],')
  lines.push('    "layer": "diegetic",')
  lines.push('    "leitmotiv": null,')
  lines.push('    "type": "diegetique",')
  lines.push('    "note": "Porte claquée à droite (Elsa sort). Pan justifié : sortie explicitement à droite dans le texte."')
  lines.push('  }')
  lines.push(']')
  lines.push('```')
  lines.push('')
  lines.push('**Règles de production impératives :**')
  lines.push('- La réponse commence par le bloc `<script>` (passe 1 obligatoire)')
  lines.push('- Puis le JSON brut sans aucun texte autour, sans balises markdown')
  lines.push('- `loopCrossfade: "none"` sur TOUS les blocs `loop: false`')
  lines.push('- `loopCrossfade: "medium"` sur TOUS les blocs `loop: true` sauf indication contraire')
  lines.push('- `automationPoints: []` si pas de points — ne jamais omettre le champ')
  lines.push('- `leitmotiv: null` si pas de leitmotiv — ne jamais omettre le champ')
  lines.push('- Densité max : 3 sons stables simultanés (pics à 4 acceptables aux transitions)')
  lines.push('- Respiration obligatoire : 1–2 segments sans aucun son entre deux scènes distinctes')
  lines.push('- Le silence est une décision artistique aussi forte qu\'un son')
  lines.push('- Ne jamais mettre `pan ≠ 0` ou `panMode ≠ "static"` sur bed, atmosphere, music')
  lines.push('- Volumes de référence : bed 0.12–0.28 | atmosphere 0.10–0.22 | music 0.20–0.45 | diegetic 0.55–0.82 | transition 0.45–0.70')
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
  lines.push('Commence par le bloc `<script>`, puis produis le JSON. Rien d\'autre.')
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

    // Convertit les automationPoints Claude (segment absolu) ou une volumeEnvelope en automationPoints AudioEngine
    const buildAutomationPoints = (block, startSeg) => {
      // Priorité 1 : points bruts fournis par Claude (nouveau format)
      if (block.automationPoints && block.automationPoints.length > 0) {
        return block.automationPoints.map(pt => {
          const segOffset = pt.segment - block.startSegment
          const segIdx = startSeg.idx + segOffset
          const seg = segments[segIdx]
          if (!seg) return null
          return {
            segmentId: seg.id || seg._id || `seg_${segIdx}`,
            volume: Math.round(pt.volume * 100) / 100,
            fadeMs: pt.fadeMs ?? 800,
          }
        }).filter(Boolean)
      }
      // Fallback rétrocompat : volumeEnvelope (ancien format, inchangé)
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
      const endSeg = resolveSegmentId(block.endSegment)
      const endIdx = endSeg ? endSeg.idx : startIdx
      const midIdx = Math.round((startIdx + endIdx) / 2)
      if (envelope === 'crescendo') {
        return [makePoint(startIdx, vol * 0.3), makePoint(endIdx, vol)].filter(Boolean)
      }
      if (envelope === 'decrescendo') {
        return [makePoint(startIdx, vol), makePoint(endIdx, vol * 0.3)].filter(Boolean)
      }
      if (envelope === 'swell') {
        return [makePoint(startIdx, vol * 0.3), makePoint(midIdx, vol), makePoint(endIdx, vol * 0.3)].filter(Boolean)
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
      const automationPoints = buildAutomationPoints(block, start)
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
        loopCrossfade: block.loop
          ? (block.loopCrossfade ?? 'medium')
          : undefined,
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
        _orchestrationLayer: block.layer || block.type || '',
        _orchestrationLeitmotiv: block.leitmotiv || '',
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
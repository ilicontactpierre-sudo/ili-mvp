/**
 * soundSearch.js
 * Moteur de recherche enrichi pour la bibliothèque sonore ILi
 *
 * Améliorations par rapport à l'original :
 * 1. Expansion de requête FR↔EN via dictionnaire de synonymes
 * 2. Extraction intelligente des codes BOOM (catId, boomSubcategory, label)
 * 3. Normalisation morphologique légère (pluriels, accents)
 * 4. Scoring revu : synonymes pondérés différemment des correspondances directes
 * 5. Bonus durée ambiance étendu à plus de termes FR
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. DICTIONNAIRE DE SYNONYMES FR ↔ EN
//    Clé = terme FR ou EN → tableau de termes équivalents à injecter dans la recherche
//    Calibré sur les catégories BOOM Library présentes dans ta bibliothèque
// ─────────────────────────────────────────────────────────────────────────────
const SYNONYMS = {
  // ── Lieux / ambiances naturelles ─────────────────────────────────────────
  'forêt':      ['forest', 'woods', 'wood', 'sylve', 'trees', 'foret'],
  'foret':      ['forest', 'woods', 'wood', 'trees'],
  'bois':       ['wood', 'forest', 'trees', 'woodland'],
  'jungle':     ['jungle', 'tropical', 'rainforest'],
  'désert':     ['desert', 'arid', 'dune', 'sand'],
  'desert':     ['désert', 'arid', 'dune', 'sand'],
  'montagne':   ['mountain', 'peak', 'alpine', 'highland'],
  'campagne':   ['rural', 'countryside', 'field', 'farmland'],
  'rural':      ['campagne', 'countryside', 'field', 'farm'],
  'prairie':    ['grassland', 'meadow', 'field', 'grass'],
  'herbe':      ['grass', 'meadow', 'grassland', 'field'],
  'grotte':     ['cave', 'cavern', 'underground', 'spelunking'],
  'caverne':    ['cave', 'cavern', 'underground'],
  'cave':       ['grotte', 'caverne', 'underground'],
  'plage':      ['beach', 'seaside', 'shore', 'sand', 'coastal'],
  'beach':      ['plage', 'seaside', 'shore', 'coastal'],
  'mer':        ['sea', 'ocean', 'waves', 'water', 'coastal', 'seaside'],
  'océan':      ['ocean', 'sea', 'waves', 'water'],
  'ocean':      ['océan', 'sea', 'waves', 'water'],
  'vagues':     ['waves', 'surf', 'sea', 'ocean'],
  'waves':      ['vagues', 'surf', 'sea'],
  'rivière':    ['river', 'stream', 'creek', 'water', 'flow'],
  'river':      ['rivière', 'stream', 'creek', 'water'],
  'ruisseau':   ['stream', 'creek', 'brook', 'river', 'water'],
  'stream':     ['ruisseau', 'creek', 'river', 'water'],
  'lac':        ['lake', 'pond', 'water', 'lakeside'],
  'lake':       ['lac', 'pond', 'lakeside'],
  'pluie':      ['rain', 'rainfall', 'drizzle', 'downpour', 'precipitation'],
  'rain':       ['pluie', 'rainfall', 'drizzle', 'precipitation'],
  'orage':      ['storm', 'thunder', 'lightning', 'thunderstorm'],
  'storm':      ['orage', 'thunder', 'tempête'],
  'tonnerre':   ['thunder', 'storm', 'thunderstorm', 'lightning'],
  'thunder':    ['tonnerre', 'storm', 'orage'],
  'vent':       ['wind', 'breeze', 'gust', 'blow', 'gale'],
  'wind':       ['vent', 'brise', 'souffle', 'rafale'],
  'tempête':    ['storm', 'gale', 'hurricane', 'wind', 'squall'],
  'neige':      ['snow', 'blizzard', 'winter', 'ice', 'frozen'],
  'snow':       ['neige', 'blizzard', 'winter', 'ice'],
  'feu':        ['fire', 'flame', 'blaze', 'burning', 'campfire'],
  'fire':       ['feu', 'flamme', 'braise', 'burning'],
  'flamme':     ['flame', 'fire', 'blaze'],

  // ── Lieux urbains / intérieurs ────────────────────────────────────────────
  'ville':      ['city', 'urban', 'town', 'metropolis', 'street'],
  'city':       ['ville', 'urbain', 'urban', 'town'],
  'urban':      ['ville', 'city', 'urbain', 'street'],
  'rue':        ['street', 'road', 'avenue', 'urban', 'city'],
  'street':     ['rue', 'avenue', 'road', 'urban'],
  'trafic':     ['traffic', 'cars', 'vehicles', 'road', 'urban'],
  'traffic':    ['trafic', 'cars', 'voitures', 'urban'],
  'voiture':    ['car', 'vehicle', 'automobile', 'traffic'],
  'voitures':   ['cars', 'vehicles', 'traffic', 'automobile'],
  'car':        ['voiture', 'automobile', 'vehicle'],
  'cars':       ['voitures', 'automobiles', 'vehicles', 'traffic'],
  'train':      ['train', 'railway', 'rail', 'locomotive'],
  'métro':      ['subway', 'metro', 'underground', 'tube'],
  'subway':     ['métro', 'metro', 'underground'],
  'avion':      ['aircraft', 'airplane', 'plane', 'jet', 'aviation'],
  'airplane':   ['avion', 'aircraft', 'plane', 'jet'],
  'aircraft':   ['avion', 'airplane', 'plane'],
  'bateau':     ['boat', 'ship', 'vessel', 'nautical', 'harbor'],
  'boat':       ['bateau', 'navire', 'ship', 'vessel'],
  'navire':     ['ship', 'boat', 'vessel', 'cargo'],
  'port':       ['harbor', 'port', 'dock', 'nautical'],
  'harbor':     ['port', 'dock', 'nautical', 'boat'],
  'aéroport':   ['airport', 'terminal', 'aviation', 'plane'],
  'airport':    ['aéroport', 'terminal', 'aviation'],
  'intérieur':  ['interior', 'indoor', 'inside', 'room', 'indoor'],
  'interior':   ['intérieur', 'indoor', 'room', 'inside'],
  'indoor':     ['intérieur', 'interior', 'inside', 'room'],
  'extérieur':  ['exterior', 'outdoor', 'outside', 'open air'],
  'outdoor':    ['extérieur', 'exterior', 'outside'],
  'bureau':     ['office', 'workplace', 'desk', 'work'],
  'office':     ['bureau', 'workplace', 'desk'],
  'église':     ['church', 'cathedral', 'religious', 'monastery'],
  'church':     ['église', 'cathedral', 'religious', 'monastery'],
  'marché':     ['market', 'bazaar', 'bazar', 'crowd', 'shop'],
  'market':     ['marché', 'bazaar', 'crowd', 'shop'],
  'restaurant': ['restaurant', 'diner', 'café', 'brasserie', 'bar', 'food'],
  'café':       ['cafe', 'coffee', 'restaurant', 'bar'],
  'hôpital':    ['hospital', 'medical', 'clinic'],
  'école':      ['school', 'classroom', 'children'],
  'usine':      ['factory', 'industrial', 'machine', 'plant'],
  'factory':    ['usine', 'industrial', 'machine'],
  'chantier':   ['construction', 'building', 'site', 'work'],
  'construction': ['chantier', 'building', 'site', 'drill', 'jackhammer'],

  // ── Animaux ───────────────────────────────────────────────────────────────
  'oiseaux':    ['birds', 'birdsong', 'bird', 'chirp', 'tweet', 'sing'],
  'oiseau':     ['bird', 'birds', 'birdsong', 'chirp', 'tweet'],
  'birds':      ['oiseaux', 'birdsong', 'chirp', 'tweet', 'sing'],
  'bird':       ['oiseau', 'oiseaux', 'birdsong', 'chirp'],
  'chien':      ['dog', 'bark', 'growl', 'howl', 'canine'],
  'dog':        ['chien', 'bark', 'growl', 'canine'],
  'chat':       ['cat', 'meow', 'purr', 'feline'],
  'cat':        ['chat', 'meow', 'purr', 'feline'],
  'cheval':     ['horse', 'gallop', 'neigh', 'hooves'],
  'horse':      ['cheval', 'gallop', 'neigh', 'hooves'],
  'loup':       ['wolf', 'howl', 'wild', 'predator'],
  'wolf':       ['loup', 'howl', 'wild'],
  'insectes':   ['insects', 'cricket', 'cicada', 'bug', 'fly'],
  'insecte':    ['insect', 'cricket', 'cicada', 'bug'],
  'cricket':    ['grillon', 'insecte', 'chirp', 'stridulate'],
  'grillon':    ['cricket', 'insect', 'chirp'],
  'cigale':     ['cicada', 'cricket', 'insect', 'summer'],
  'grenouille': ['frog', 'toad', 'pond', 'croak', 'amphibian'],
  'frog':       ['grenouille', 'toad', 'croak'],
  'corbeau':    ['crow', 'raven', 'bird', 'caw'],
  'crow':       ['corbeau', 'raven', 'bird'],
  'pigeon':     ['pigeon', 'dove', 'bird', 'coo'],

  // ── Humains / foule ───────────────────────────────────────────────────────
  'foule':      ['crowd', 'people', 'mass', 'gathering', 'chatter'],
  'crowd':      ['foule', 'people', 'gathering', 'chatter'],
  'personnes':  ['people', 'persons', 'humans', 'voices'],
  'people':     ['personnes', 'foule', 'crowd', 'voices'],
  'voix':       ['voice', 'voices', 'speech', 'talking', 'conversation'],
  'voice':      ['voix', 'speech', 'talking'],
  'parole':     ['speech', 'talking', 'voice', 'conversation'],
  'conversation': ['talking', 'voices', 'speech', 'chat'],
  'enfants':    ['children', 'kids', 'child', 'playground'],
  'enfant':     ['child', 'children', 'kid'],
  'children':   ['enfants', 'kids', 'child', 'playground'],
  'kids':       ['enfants', 'children', 'child'],
  'pas':        ['footstep', 'footsteps', 'walk', 'step', 'walking', 'running'],
  'footstep':   ['pas', 'step', 'walk', 'walking'],
  'footsteps':  ['pas', 'steps', 'walk', 'walking', 'running'],
  'marcher':    ['walk', 'footstep', 'step', 'movement'],
  'walk':       ['marcher', 'pas', 'footstep', 'step'],
  'courir':     ['run', 'running', 'sprint', 'dash'],
  'run':        ['courir', 'sprint', 'running'],
  'respiration': ['breathing', 'breath', 'inhale', 'exhale'],
  'breathing':  ['respiration', 'breath', 'inhale'],
  'rire':       ['laugh', 'laughter', 'chuckle', 'giggle'],
  'laugh':      ['rire', 'laughter', 'chuckle'],
  'cri':        ['scream', 'shout', 'yell', 'cry'],
  'scream':     ['cri', 'shout', 'yell', 'cry'],

  // ── Objets / matières ─────────────────────────────────────────────────────
  'porte':      ['door', 'gate', 'entrance', 'creak', 'slam'],
  'door':       ['porte', 'gate', 'creak', 'slam', 'knock'],
  'verre':      ['glass', 'crystal', 'break', 'shatter', 'clink'],
  'glass':      ['verre', 'crystal', 'break', 'shatter'],
  'métal':      ['metal', 'steel', 'iron', 'clang', 'metallic'],
  'metal':      ['métal', 'steel', 'iron', 'clang'],
  'bois':       ['wood', 'wooden', 'timber', 'creak', 'crack'],
  'wood':       ['bois', 'wooden', 'timber'],
  'papier':     ['paper', 'page', 'rustle', 'crinkle'],
  'paper':      ['papier', 'page', 'rustle'],
  'tissu':      ['cloth', 'fabric', 'textile', 'rustle', 'swoosh'],
  'cloth':      ['tissu', 'fabric', 'textile'],
  'clé':        ['key', 'lock', 'unlock', 'jingle'],
  'key':        ['clé', 'lock', 'unlock'],
  'téléphone':  ['phone', 'telephone', 'ring', 'call', 'mobile'],
  'phone':      ['téléphone', 'mobile', 'ring', 'call'],
  'horloge':    ['clock', 'watch', 'tick', 'tock', 'timer'],
  'clock':      ['horloge', 'montre', 'tick', 'tock'],
  'explosion':  ['explosion', 'blast', 'boom', 'bang', 'impact'],
  'coup':       ['hit', 'strike', 'impact', 'knock', 'bang'],
  'impact':     ['hit', 'strike', 'blow', 'collision', 'thud'],
  'hit':        ['coup', 'impact', 'strike', 'smash'],

  // ── Actions / qualificatifs ───────────────────────────────────────────────
  'ambiance':   ['ambience', 'ambiance', 'atmosphere', 'ambient', 'background', 'atmo'],
  'ambience':   ['ambiance', 'atmosphere', 'ambient', 'background', 'atmo', 'fond'],
  'ambient':    ['ambiance', 'ambience', 'atmosphere', 'background'],
  'atmosphere': ['ambiance', 'ambience', 'ambient', 'background', 'atmo'],
  'fond':       ['background', 'ambience', 'ambient', 'atmosphere'],
  'background': ['fond', 'ambience', 'ambient', 'atmosphere'],
  'calme':      ['calm', 'quiet', 'peaceful', 'serene', 'gentle'],
  'calm':       ['calme', 'quiet', 'peaceful', 'serene'],
  'tranquille': ['quiet', 'calm', 'peaceful', 'serene', 'still'],
  'silencieux': ['silent', 'quiet', 'still', 'hushed'],
  'fort':       ['loud', 'strong', 'powerful', 'intense'],
  'loud':       ['fort', 'strong', 'powerful', 'intense'],
  'doux':       ['soft', 'gentle', 'light', 'subtle'],
  'soft':       ['doux', 'gentle', 'light', 'subtle'],
  'sombre':     ['dark', 'ominous', 'eerie', 'mysterious', 'gloomy'],
  'dark':       ['sombre', 'ominous', 'eerie', 'mysterious'],
  'effrayant':  ['scary', 'horror', 'eerie', 'spooky', 'frightening', 'creepy'],
  'horror':     ['horreur', 'scary', 'eerie', 'spooky', 'creepy'],
  'eerie':      ['effrayant', 'spooky', 'scary', 'mysterious', 'strange'],
  'spooky':     ['effrayant', 'eerie', 'scary', 'ghost', 'horror'],
  'mystérieux': ['mysterious', 'eerie', 'strange', 'odd'],
  'mysterious': ['mystérieux', 'eerie', 'strange'],
  'inquiétant': ['eerie', 'ominous', 'unsettling', 'disturbing'],
  'matin':      ['morning', 'dawn', 'early', 'sunrise'],
  'morning':    ['matin', 'dawn', 'early', 'sunrise'],
  'soir':       ['evening', 'dusk', 'night', 'sunset'],
  'evening':    ['soir', 'dusk', 'night'],
  'nuit':       ['night', 'nocturnal', 'dark', 'midnight'],
  'night':      ['nuit', 'nocturnal', 'dark', 'midnight'],
  'loin':       ['distant', 'far', 'background', 'remote'],
  'distant':    ['loin', 'far', 'away', 'background'],
  'proche':     ['close', 'near', 'nearby', 'intimate'],
  'close':      ['proche', 'near', 'nearby'],
  'lourd':      ['heavy', 'deep', 'low', 'ponderous'],
  'heavy':      ['lourd', 'deep', 'powerful', 'dense'],

  // ── Genres / effets sonores ───────────────────────────────────────────────
  'science-fiction': ['scifi', 'sci fi', 'futuristic', 'space', 'alien', 'spaceship'],
  'science fiction': ['scifi', 'sci fi', 'futuristic', 'space'],
  'scifi':      ['science fiction', 'sci fi', 'futuristic', 'space', 'alien'],
  'espace':     ['space', 'cosmos', 'galaxy', 'star', 'spaceship'],
  'space':      ['espace', 'cosmos', 'galaxy', 'spaceship'],
  'magie':      ['magic', 'spell', 'fantasy', 'mystical', 'enchanted'],
  'magic':      ['magie', 'spell', 'fantasy', 'mystical'],
  'médiéval':   ['medieval', 'fantasy', 'sword', 'castle', 'knight'],
  'medieval':   ['médiéval', 'fantasy', 'sword', 'castle'],
  'cartoon':    ['cartoon', 'comic', 'funny', 'silly', 'bounce'],
  'musique':    ['music', 'musical', 'instrument', 'melody', 'tune'],
  'music':      ['musique', 'musical', 'instrument', 'melody'],
  'arme':       ['weapon', 'gun', 'sword', 'blade', 'shoot'],
  'weapon':     ['arme', 'gun', 'sword', 'shoot'],
  'pistolet':   ['gun', 'pistol', 'shoot', 'weapon', 'gunshot'],
  'gun':        ['pistolet', 'arme', 'shoot', 'weapon'],
  'épée':       ['sword', 'blade', 'slash', 'medieval', 'weapon'],
  'sword':      ['épée', 'blade', 'slash', 'medieval'],
  'bouclier':   ['shield', 'block', 'armor', 'metal'],

  // ── Codes BOOM catId → termes naturels ────────────────────────────────────
  // (permet de retrouver un son même si l'utilisateur ne connaît pas les codes)
  'ambforst':   ['forêt', 'forest', 'bois', 'woods'],
  'ambrurl':    ['rural', 'campagne', 'countryside', 'farm'],
  'ambsea':     ['mer', 'sea', 'plage', 'beach', 'côte', 'seaside'],
  'amburbn':    ['ville', 'urban', 'city', 'rue', 'street'],
  'ambtraf':    ['trafic', 'traffic', 'voitures', 'cars'],
  'ambrest':    ['restaurant', 'bar', 'café', 'food'],
  'ambpark':    ['parc', 'park', 'garden', 'outdoor'],
  'ambpubl':    ['public', 'crowd', 'place', 'airport', 'station'],
  'ambnaut':    ['bateau', 'boat', 'ship', 'nautical', 'port'],
  'ambroom':    ['room', 'indoor', 'intérieur', 'interior'],
  'ambundr':    ['underground', 'cave', 'grotte', 'souterrain'],
  'ambcnst':    ['chantier', 'construction', 'industrial'],
  'ambdsrt':    ['désert', 'desert', 'arid'],
  'ambdsgn':    ['design', 'scifi', 'space', 'alien'],
  'ambgras':    ['prairie', 'grassland', 'meadow', 'field'],
  'amblake':    ['lac', 'lake', 'water', 'lakeside'],
  'ambmrkt':    ['marché', 'market', 'crowd'],
  'ambrlgn':    ['église', 'church', 'religious', 'monastery'],
  'ambsubn':    ['suburban', 'banlieue', 'village'],
  'ambtown':    ['ville', 'town', 'urban', 'city'],
  'ambfarm':    ['ferme', 'farm', 'rural', 'animaux'],
  'ambind':     ['usine', 'industrial', 'factory', 'machine'],
  'ambsprt':    ['sport', 'race', 'outdoor', 'competition'],
  'ambmisc':    ['misc', 'divers', 'various'],
}

// Termes déclencheurs d'ambiance (sons longs)
const AMBIENCE_TRIGGERS = new Set([
  'ambiance', 'ambience', 'ambient', 'atmosphere', 'atmosphère',
  'fond', 'background', 'bruit de fond', 'room', 'room tone',
  'atmo', 'drone', 'loop', 'boucle'
])

// ─────────────────────────────────────────────────────────────────────────────
// 2. NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise un terme : minuscules, suppression accents, trim
 * "Forêt" → "foret", "Île" → "ile"
 */
function normalize(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les diacritiques
    .trim()
}

/**
 * Normalise sans supprimer les accents (pour matcher les searchStrings qui gardent les accents)
 */
function normalizeSoft(str) {
  if (!str) return ''
  return str.toLowerCase().trim()
}

/**
 * Tronque la fin d'un mot pour gérer les pluriels simples
 * "oiseaux" → cherche aussi "oiseau"
 * "forêts"  → cherche aussi "forêt"
 */
function stemFR(term) {
  const stems = [term]
  if (term.endsWith('eaux')) stems.push(term.slice(0, -4) + 'eau')
  if (term.endsWith('aux')) stems.push(term.slice(0, -3) + 'al')
  if (term.endsWith('s') && term.length > 4) stems.push(term.slice(0, -1))
  if (term.endsWith('es') && term.length > 4) stems.push(term.slice(0, -2))
  if (term.endsWith('er') && term.length > 4) stems.push(term.slice(0, -2))
  return [...new Set(stems)]
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXPANSION DE REQUÊTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pour un terme donné, retourne lui-même + ses synonymes + ses stems
 * { direct: [...], expanded: [...] }
 * Les termes "direct" ont un poids fort, les "expanded" un poids plus faible
 */
function expandTerm(rawTerm) {
  const norm = normalize(rawTerm)
  const soft = normalizeSoft(rawTerm)

  const direct = new Set([norm, soft, rawTerm.toLowerCase()])

  // Stems FR (pluriels)
  stemFR(norm).forEach(s => direct.add(s))
  stemFR(soft).forEach(s => direct.add(s))

  // Synonymes
  const expanded = new Set()
  const synonymKey = SYNONYMS[norm] || SYNONYMS[soft]
  if (synonymKey) {
    synonymKey.forEach(syn => {
      expanded.add(normalize(syn))
      expanded.add(normalizeSoft(syn))
    })
  }

  // Chercher aussi les synonymes des stems
  stemFR(norm).forEach(stem => {
    const stemSyns = SYNONYMS[stem]
    if (stemSyns) stemSyns.forEach(syn => expanded.add(normalize(syn)))
  })

  return {
    direct: [...direct].filter(Boolean),
    expanded: [...expanded].filter(Boolean),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXTRACTION INTELLIGENTE DES DONNÉES BOOM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nettoie le champ boomCategory qui contient parfois du XML parasite
 * "AMBIENCE-SEASIDE</CATEGORYFULL>\n    <DESCRIPTION>..." → "AMBIENCE SEASIDE"
 */
function cleanBoomField(str) {
  if (!str) return ''
  // Couper au premier '<' (balise XML parasite)
  const clean = str.split('<')[0].trim()
  // Remplacer tirets et underscores par des espaces
  return clean.replace(/[-_&;]/g, ' ').toLowerCase()
}

/**
 * Construit un champ de recherche virtuel pour les sons sans searchString
 * en exploitant label, catId, boomCategory, boomSubcategory, filename
 */
function buildVirtualSearchField(sound) {
  const parts = []

  // Label nettoyé (enlève les codes techniques comme "01", "b00m", "one", "_")
  const labelClean = (sound.label || '')
    .replace(/\b(b00m|boom|one|two|three|mods|_|01|02|03|04|05|06|07|08|09)\b/gi, ' ')
    .replace(/[_\-]/g, ' ')
    .toLowerCase()
  parts.push(labelClean)

  // catId → chercher ses synonymes
  const catIdNorm = normalize(sound.catId || '')
  if (catIdNorm && SYNONYMS[catIdNorm]) {
    parts.push(SYNONYMS[catIdNorm].join(' '))
  }

  // boomCategory nettoyé
  parts.push(cleanBoomField(sound.boomCategory))

  // boomSubcategory nettoyé
  parts.push(cleanBoomField(sound.boomSubcategory))

  // filename (sans extension, nettoyé)
  if (sound.filename) {
    const fn = sound.filename
      .replace(/\.[^.]+$/, '')
      .replace(/[_\-]/g, ' ')
      .replace(/\b(b00m|boom|one|two|mods|wav|mp3|01|02|03|04|05|06)\b/gi, ' ')
      .toLowerCase()
    parts.push(fn)
  }

  return parts.join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MOTEUR DE SCORING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score un son par rapport à un ensemble de termes (directs + expanded)
 * Retourne un score numérique (0 = non pertinent)
 */
function scoreSound(sound, termSets, isAmbienceSearch) {
  // Construire les champs de recherche du son
  const label        = normalizeSoft(sound.label || '')
  const labelNorm    = normalize(sound.label || '')
  const labelWords   = labelNorm.split(/[\s_\-]+/).filter(Boolean)
  const tags         = (sound.tags || []).map(t => normalizeSoft(t))
  const tagsNorm     = (sound.tags || []).map(t => normalize(t))
  const searchStr    = normalizeSoft(sound.searchString || '')
  const searchStrN   = normalize(sound.searchString || '')
  const description  = normalizeSoft(sound.description || '')
  const boomCat      = cleanBoomField(sound.boomCategory)
  const boomSub      = cleanBoomField(sound.boomSubcategory)
  const catId        = normalize(sound.catId || '')
  const virtual      = buildVirtualSearchField(sound)

  let score = 0
  let termsCovered = 0

  for (const { direct, expanded } of termSets) {
    let termScore = 0

    // ── Correspondances DIRECTES (poids fort) ────────────────────────────
    for (const term of direct) {
      if (!term) continue

      // Tags — champ le plus fiable (weight ×8 exact, ×6 partiel)
      if (tagsNorm.some(tag => tag === term))       termScore += 8
      else if (tags.some(tag => tag === term))      termScore += 7
      else if (tagsNorm.some(tag => tag.includes(term))) termScore += 6
      else if (tags.some(tag => tag.includes(term))) termScore += 5

      // Label — mot exact (×5), partiel (×4)
      if (labelWords.some(w => w === term))         termScore += 5
      else if (labelNorm.includes(term))            termScore += 4
      else if (label.includes(term))                termScore += 3

      // SearchString — synonymes riches (×3)
      if (searchStrN.includes(term))                termScore += 3
      else if (searchStr.includes(term))            termScore += 2

      // Description (×2)
      if (description.includes(term))               termScore += 2

      // BoomCategory/Subcategory (×2)
      if (boomCat.includes(term) || boomSub.includes(term)) termScore += 2

      // CatId exact (×3)
      if (catId === term || catId.includes(term))   termScore += 3

      // Champ virtuel (pour sons sans searchString) (×2)
      if (virtual.includes(term))                   termScore += 2
    }

    // ── Correspondances EXPANDÉES / synonymes (poids réduit : ×0.5) ──────
    if (termScore === 0) {
      for (const term of expanded) {
        if (!term) continue

        if (tagsNorm.some(tag => tag === term))     termScore += 4
        else if (tagsNorm.some(tag => tag.includes(term))) termScore += 3

        if (labelWords.some(w => w === term))       termScore += 3
        else if (labelNorm.includes(term))          termScore += 2

        if (searchStrN.includes(term))              termScore += 2
        else if (searchStr.includes(term))          termScore += 1

        if (boomCat.includes(term) || boomSub.includes(term)) termScore += 2
        if (virtual.includes(term))                 termScore += 1
      }
      // On marque que c'est une correspondance par synonyme (facteur de confiance réduit)
      if (termScore > 0) termScore = Math.round(termScore * 0.55)
    }

    if (termScore > 0) {
      score += termScore
      termsCovered++
    }
  }

  if (score === 0) return 0

  // ── Multiplicateur de couverture ─────────────────────────────────────────
  // Récompense les sons qui matchent TOUS les termes de la requête
  const coverageRatio = termSets.length > 0 ? termsCovered / termSets.length : 0
  score *= (0.35 + coverageRatio * 0.65)

  // ── Bonus durée si recherche "ambiance" ──────────────────────────────────
  if (isAmbienceSearch) {
    const dur = sound.duration || 0
    if (dur > 120)     score += 12
    else if (dur > 60) score += 8
    else if (dur > 30) score += 5
    else if (dur > 10) score += 2
    else if (dur > 5)  score += 0
    else               score -= 4
  }

  return score
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FONCTION PRINCIPALE — remplace filteredSounds dans SoundLibraryPicker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtre et trie une liste de sons selon une requête textuelle.
 *
 * @param {Array}   sounds        - Liste complète des sons (familySounds)
 * @param {string}  searchQuery   - Texte saisi par l'utilisateur
 * @param {Array}   activeTags    - Tags actifs (filtres niveau 2)
 * @param {boolean} onlyUploaded  - Filtre "sons uploadés uniquement"
 * @returns {Array} Sons filtrés et triés par pertinence
 */
export function filterAndScoreSounds(sounds, searchQuery, activeTags = [], onlyUploaded = false) {
  let results = sounds

  // ── Filtre "uploadés uniquement" ─────────────────────────────────────────
  if (onlyUploaded) {
    results = results.filter(sound => !!sound.url)
  }

  // ── Filtre tags actifs ────────────────────────────────────────────────────
  if (activeTags.length > 0) {
    results = results.filter(sound =>
      activeTags.every(tag => (sound.tags || []).includes(tag))
    )
  }

  // ── Recherche textuelle ───────────────────────────────────────────────────
  if (!searchQuery.trim()) return results

  // Découper la requête (virgules, espaces, tirets)
  const rawTerms = searchQuery.trim().split(/[\s,;]+/).filter(t => t.length > 1)
  if (rawTerms.length === 0) return results

  // Détecter si c'est une recherche d'ambiance
  const queryNorm = normalize(searchQuery)
  const isAmbienceSearch = rawTerms.some(t =>
    AMBIENCE_TRIGGERS.has(normalize(t)) || AMBIENCE_TRIGGERS.has(normalizeSoft(t))
  )

  // Expansion de chaque terme
  const termSets = rawTerms.map(expandTerm)

  // Scorer tous les sons
  const scored = results.map(sound => ({
    sound,
    score: scoreSound(sound, termSets, isAmbienceSearch),
  }))

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ sound }) => sound)
}

/**
 * Utilitaire : retourne les synonymes FR d'un terme anglais
 * (peut être utile pour debug ou affichage)
 */
export function getSynonyms(term) {
  const norm = normalize(term)
  return SYNONYMS[norm] || SYNONYMS[normalizeSoft(term)] || []
}
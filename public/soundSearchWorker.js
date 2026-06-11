// public/soundSearchWorker.js
// Web Worker — calcul de recherche hors thread principal

// Copie allégée des fonctions de soundSearch.js (sans imports ES modules)

const SYNONYMS = {
  'forêt':['forest','woods','wood','sylve','trees','foret'],'foret':['forest','woods','wood','trees'],'bois':['wood','forest','trees','woodland'],'jungle':['jungle','tropical','rainforest'],'désert':['desert','arid','dune','sand'],'desert':['désert','arid','dune','sand'],'montagne':['mountain','peak','alpine','highland'],'campagne':['rural','countryside','field','farmland'],'rural':['campagne','countryside','field','farm'],'prairie':['grassland','meadow','field','grass'],'herbe':['grass','meadow','grassland','field'],'grotte':['cave','cavern','underground','spelunking'],'caverne':['cave','cavern','underground'],'cave':['grotte','caverne','underground'],'plage':['beach','seaside','shore','sand','coastal'],'beach':['plage','seaside','shore','coastal'],'mer':['sea','ocean','waves','water','coastal','seaside'],'océan':['ocean','sea','waves','water'],'ocean':['océan','sea','waves','water'],'vagues':['waves','surf','sea','ocean'],'waves':['vagues','surf','sea'],'rivière':['river','stream','creek','water','flow'],'river':['rivière','stream','creek','water'],'ruisseau':['stream','creek','brook','river','water'],'stream':['ruisseau','creek','river','water'],'lac':['lake','pond','water','lakeside'],'lake':['lac','pond','lakeside'],'pluie':['rain','rainfall','drizzle','downpour','precipitation'],'rain':['pluie','rainfall','drizzle','precipitation'],'orage':['storm','thunder','lightning','thunderstorm'],'storm':['orage','thunder','tempête'],'tonnerre':['thunder','storm','thunderstorm','lightning'],'thunder':['tonnerre','storm','orage'],'vent':['wind','breeze','gust','blow','gale'],'wind':['vent','brise','souffle','rafale'],'tempête':['storm','gale','hurricane','wind','squall'],'neige':['snow','blizzard','winter','ice','frozen'],'snow':['neige','blizzard','winter','ice'],'feu':['fire','flame','blaze','burning','campfire'],'fire':['feu','flamme','braise','burning'],'flamme':['flame','fire','blaze'],'ville':['city','urban','town','metropolis','street'],'city':['ville','urbain','urban','town'],'urban':['ville','city','urbain','street'],'rue':['street','road','avenue','urban','city'],'street':['rue','avenue','road','urban'],'trafic':['traffic','cars','vehicles','road','urban'],'traffic':['trafic','cars','voitures','urban'],'voiture':['car','vehicle','automobile','traffic'],'voitures':['cars','vehicles','traffic','automobile'],'car':['voiture','automobile','vehicle'],'cars':['voitures','automobiles','vehicles','traffic'],'train':['train','railway','rail','locomotive'],'métro':['subway','metro','underground','tube'],'subway':['métro','metro','underground'],'avion':['aircraft','airplane','plane','jet','aviation'],'airplane':['avion','aircraft','plane','jet'],'aircraft':['avion','airplane','plane'],'bateau':['boat','ship','vessel','nautical','harbor'],'boat':['bateau','navire','ship','vessel'],'navire':['ship','boat','vessel','cargo'],'port':['harbor','port','dock','nautical'],'harbor':['port','dock','nautical','boat'],'aéroport':['airport','terminal','aviation','plane'],'airport':['aéroport','terminal','aviation'],'intérieur':['interior','indoor','inside','room'],'interior':['intérieur','indoor','room','inside'],'indoor':['intérieur','interior','inside','room'],'extérieur':['exterior','outdoor','outside','open air'],'outdoor':['extérieur','exterior','outside'],'bureau':['office','workplace','desk','work'],'office':['bureau','workplace','desk'],'église':['church','cathedral','religious','monastery'],'church':['église','cathedral','religious','monastery'],'marché':['market','bazaar','bazar','crowd','shop'],'market':['marché','bazaar','crowd','shop'],'restaurant':['restaurant','diner','café','brasserie','bar','food'],'café':['cafe','coffee','restaurant','bar'],'hôpital':['hospital','medical','clinic'],'école':['school','classroom','children'],'usine':['factory','industrial','machine','plant'],'factory':['usine','industrial','machine'],'chantier':['construction','building','site','work'],'construction':['chantier','building','site','drill','jackhammer'],'oiseaux':['birds','birdsong','bird','chirp','tweet','sing'],'oiseau':['bird','birds','birdsong','chirp','tweet'],'birds':['oiseaux','birdsong','chirp','tweet','sing'],'bird':['oiseau','oiseaux','birdsong','chirp'],'chien':['dog','bark','growl','howl','canine'],'dog':['chien','bark','growl','canine'],'chat':['cat','meow','purr','feline'],'cat':['chat','meow','purr','feline'],'cheval':['horse','gallop','neigh','hooves'],'horse':['cheval','gallop','neigh','hooves'],'loup':['wolf','howl','wild','predator'],'wolf':['loup','howl','wild'],'insectes':['insects','cricket','cicada','bug','fly'],'insecte':['insect','cricket','cicada','bug'],'cricket':['grillon','insecte','chirp','stridulate'],'grillon':['cricket','insect','chirp'],'cigale':['cicada','cricket','insect','summer'],'grenouille':['frog','toad','pond','croak','amphibian'],'frog':['grenouille','toad','croak'],'corbeau':['crow','raven','bird','caw'],'crow':['corbeau','raven','bird'],'pigeon':['pigeon','dove','bird','coo'],'foule':['crowd','people','mass','gathering','chatter'],'crowd':['foule','people','gathering','chatter'],'personnes':['people','persons','humans','voices'],'people':['personnes','foule','crowd','voices'],'voix':['voice','voices','speech','talking','conversation'],'voice':['voix','speech','talking'],'parole':['speech','talking','voice','conversation'],'conversation':['talking','voices','speech','chat'],'enfants':['children','kids','child','playground'],'enfant':['child','children','kid'],'children':['enfants','kids','child','playground'],'kids':['enfants','children','child'],'pas':['footstep','footsteps','walk','step','walking','running'],'footstep':['pas','step','walk','walking'],'footsteps':['pas','steps','walk','walking','running'],'marcher':['walk','footstep','step','movement'],'walk':['marcher','pas','footstep','step'],'courir':['run','running','sprint','dash'],'run':['courir','sprint','running'],'respiration':['breathing','breath','inhale','exhale'],'breathing':['respiration','breath','inhale'],'rire':['laugh','laughter','chuckle','giggle'],'laugh':['rire','laughter','chuckle'],'cri':['scream','shout','yell','cry'],'scream':['cri','shout','yell','cry'],'porte':['door','gate','entrance','creak','slam'],'door':['porte','gate','creak','slam','knock'],'verre':['glass','crystal','break','shatter','clink'],'glass':['verre','crystal','break','shatter'],'métal':['metal','steel','iron','clang','metallic'],'metal':['métal','steel','iron','clang'],'wood':['bois','wooden','timber'],'papier':['paper','page','rustle','crinkle'],'paper':['papier','page','rustle'],'tissu':['cloth','fabric','textile','rustle','swoosh'],'cloth':['tissu','fabric','textile'],'clé':['key','lock','unlock','jingle'],'key':['clé','lock','unlock'],'téléphone':['phone','telephone','ring','call','mobile'],'phone':['téléphone','mobile','ring','call'],'horloge':['clock','watch','tick','tock','timer'],'clock':['horloge','montre','tick','tock'],'explosion':['explosion','blast','boom','bang','impact'],'coup':['hit','strike','impact','knock','bang'],'impact':['hit','strike','blow','collision','thud'],'hit':['coup','impact','strike','smash'],'ambiance':['ambience','ambiance','atmosphere','ambient','background','atmo'],'ambience':['ambiance','atmosphere','ambient','background','atmo','fond'],'ambient':['ambiance','ambience','atmosphere','background'],'atmosphere':['ambiance','ambience','ambient','background','atmo'],'fond':['background','ambience','ambient','atmosphere'],'background':['fond','ambience','ambient','atmosphere'],'calme':['calm','quiet','peaceful','serene','gentle'],'calm':['calme','quiet','peaceful','serene'],'tranquille':['quiet','calm','peaceful','serene','still'],'silencieux':['silent','quiet','still','hushed'],'fort':['loud','strong','powerful','intense'],'loud':['fort','strong','powerful','intense'],'doux':['soft','gentle','light','subtle'],'soft':['doux','gentle','light','subtle'],'sombre':['dark','ominous','eerie','mysterious','gloomy'],'dark':['sombre','ominous','eerie','mysterious'],'effrayant':['scary','horror','eerie','spooky','frightening','creepy'],'horror':['horreur','scary','eerie','spooky','creepy'],'eerie':['effrayant','spooky','scary','mysterious','strange'],'spooky':['effrayant','eerie','scary','ghost','horror'],'mystérieux':['mysterious','eerie','strange','odd'],'mysterious':['mystérieux','eerie','strange'],'inquiétant':['eerie','ominous','unsettling','disturbing'],'matin':['morning','dawn','early','sunrise'],'morning':['matin','dawn','early','sunrise'],'soir':['evening','dusk','night','sunset'],'evening':['soir','dusk','night'],'nuit':['night','nocturnal','dark','midnight'],'night':['nuit','nocturnal','dark','midnight'],'loin':['distant','far','background','remote'],'distant':['loin','far','away','background'],'proche':['close','near','nearby','intimate'],'close':['proche','near','nearby'],'lourd':['heavy','deep','low','ponderous'],'heavy':['lourd','deep','powerful','dense'],'science-fiction':['scifi','sci fi','futuristic','space','alien','spaceship'],'science fiction':['scifi','sci fi','futuristic','space'],'scifi':['science fiction','sci fi','futuristic','space','alien'],'espace':['space','cosmos','galaxy','star','spaceship'],'space':['espace','cosmos','galaxy','spaceship'],'magie':['magic','spell','fantasy','mystical','enchanted'],'magic':['magie','spell','fantasy','mystical'],'médiéval':['medieval','fantasy','sword','castle','knight'],'medieval':['médiéval','fantasy','sword','castle'],'cartoon':['cartoon','comic','funny','silly','bounce'],'musique':['music','musical','instrument','melody','tune'],'music':['musique','musical','instrument','melody'],'arme':['weapon','gun','sword','blade','shoot'],'weapon':['arme','gun','sword','shoot'],'pistolet':['gun','pistol','shoot','weapon','gunshot'],'gun':['pistolet','arme','shoot','weapon'],'épée':['sword','blade','slash','medieval','weapon'],'sword':['épée','blade','slash','medieval'],'ambforst':['forêt','forest','bois','woods'],'ambrurl':['rural','campagne','countryside','farm'],'ambsea':['mer','sea','plage','beach','côte','seaside'],'amburbn':['ville','urban','city','rue','street'],'ambtraf':['trafic','traffic','voitures','cars'],'ambrest':['restaurant','bar','café','food'],'ambpark':['parc','park','garden','outdoor'],'ambpubl':['public','crowd','place','airport','station'],'ambnaut':['bateau','boat','ship','nautical','port'],'ambroom':['room','indoor','intérieur','interior'],'ambundr':['underground','cave','grotte','souterrain'],'ambcnst':['chantier','construction','industrial'],'ambdsrt':['désert','desert','arid'],'ambdsgn':['design','scifi','space','alien'],'ambgras':['prairie','grassland','meadow','field'],'amblake':['lac','lake','water','lakeside'],'ambmrkt':['marché','market','crowd'],'ambrlgn':['église','church','religious','monastery'],'ambsubn':['suburban','banlieue','village'],'ambtown':['ville','town','urban','city'],'ambfarm':['ferme','farm','rural','animaux'],'ambind':['usine','industrial','factory','machine'],'ambsprt':['sport','race','outdoor','competition'],'ambmisc':['misc','divers','various'],
}

const AMBIENCE_TRIGGERS = new Set(['ambiance','ambience','ambient','atmosphere','atmosphère','fond','background','bruit de fond','room','room tone','atmo','drone','loop','boucle'])

function normalize(str) {
  if (!str) return ''
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}
function normalizeSoft(str) {
  if (!str) return ''
  return str.toLowerCase().trim()
}
function stemFR(term) {
  const stems = [term]
  if (term.endsWith('eaux')) stems.push(term.slice(0,-4)+'eau')
  if (term.endsWith('aux')) stems.push(term.slice(0,-3)+'al')
  if (term.endsWith('s') && term.length > 4) stems.push(term.slice(0,-1))
  if (term.endsWith('es') && term.length > 4) stems.push(term.slice(0,-2))
  if (term.endsWith('er') && term.length > 4) stems.push(term.slice(0,-2))
  return [...new Set(stems)]
}
function expandTerm(rawTerm) {
  const norm = normalize(rawTerm)
  const soft = normalizeSoft(rawTerm)
  const direct = new Set([norm, soft, rawTerm.toLowerCase()])
  stemFR(norm).forEach(s => direct.add(s))
  stemFR(soft).forEach(s => direct.add(s))
  const expanded = new Set()
  const synonymKey = SYNONYMS[norm] || SYNONYMS[soft]
  if (synonymKey) synonymKey.forEach(syn => { expanded.add(normalize(syn)); expanded.add(normalizeSoft(syn)) })
  stemFR(norm).forEach(stem => { const s = SYNONYMS[stem]; if (s) s.forEach(syn => expanded.add(normalize(syn))) })
  return { direct: [...direct].filter(Boolean), expanded: [...expanded].filter(Boolean) }
}
function cleanBoomField(str) {
  if (!str) return ''
  return str.split('<')[0].trim().replace(/[-_&;]/g, ' ').toLowerCase()
}
function buildVirtualSearchField(sound) {
  const parts = []
  const labelClean = (sound.label || '').replace(/\b(b00m|boom|one|two|three|mods|_|01|02|03|04|05|06|07|08|09)\b/gi,' ').replace(/[_\-]/g,' ').toLowerCase()
  parts.push(labelClean)
  const catIdNorm = normalize(sound.catId || '')
  if (catIdNorm && SYNONYMS[catIdNorm]) parts.push(SYNONYMS[catIdNorm].join(' '))
  parts.push(cleanBoomField(sound.boomCategory))
  parts.push(cleanBoomField(sound.boomSubcategory))
  if (sound.filename) {
    const fn = sound.filename.replace(/\.[^.]+$/,'').replace(/[_\-]/g,' ').replace(/\b(b00m|boom|one|two|mods|wav|mp3|01|02|03|04|05|06)\b/gi,' ').toLowerCase()
    parts.push(fn)
  }
  return parts.join(' ')
}
function scoreSound(sound, termSets, isAmbienceSearch) {
  // Utiliser le cache pré-calculé si disponible (évite de tout recalculer à chaque frappe)
  const c = sound._cache || {}
  const label        = c.label        ?? normalizeSoft(sound.label || '')
  const labelNorm    = c.labelNorm    ?? normalize(sound.label || '')
  const labelWords   = c.labelWords   ?? labelNorm.split(/[\s_\-]+/).filter(Boolean)
  const tags         = c.tags         ?? (sound.tags || []).map(t => normalizeSoft(t))
  const tagsNorm     = c.tagsNorm     ?? (sound.tags || []).map(t => normalize(t))
  const searchStr    = c.searchStr    ?? normalizeSoft(sound.searchString || '')
  const searchStrN   = c.searchStrN   ?? normalize(sound.searchString || '')
  const description  = c.description  ?? normalizeSoft(sound.description || '')
  const boomCat      = c.boomCat      ?? cleanBoomField(sound.boomCategory)
  const boomSub      = c.boomSub      ?? cleanBoomField(sound.boomSubcategory)
  const catId        = c.catId        ?? normalize(sound.catId || '')
  const virtual      = c.virtual      ?? buildVirtualSearchField(sound)
  let score = 0
  let termsCovered = 0
  for (const { direct, expanded } of termSets) {
    let termScore = 0
    for (const term of direct) {
      if (!term) continue
      if (tagsNorm.some(tag => tag === term)) termScore += 8
      else if (tags.some(tag => tag === term)) termScore += 7
      else if (tagsNorm.some(tag => tag.includes(term))) termScore += 6
      else if (tags.some(tag => tag.includes(term))) termScore += 5
      if (labelWords.some(w => w === term)) termScore += 5
      else if (labelNorm.includes(term)) termScore += 4
      else if (label.includes(term)) termScore += 3
      if (searchStrN.includes(term)) termScore += 3
      else if (searchStr.includes(term)) termScore += 2
      if (description.includes(term)) termScore += 2
      if (boomCat.includes(term) || boomSub.includes(term)) termScore += 2
      if (catId === term || catId.includes(term)) termScore += 3
      if (virtual.includes(term)) termScore += 2
    }
    if (termScore === 0) {
      for (const term of expanded) {
        if (!term) continue
        if (tagsNorm.some(tag => tag === term)) termScore += 4
        else if (tagsNorm.some(tag => tag.includes(term))) termScore += 3
        if (labelWords.some(w => w === term)) termScore += 3
        else if (labelNorm.includes(term)) termScore += 2
        if (searchStrN.includes(term)) termScore += 2
        else if (searchStr.includes(term)) termScore += 1
        if (boomCat.includes(term) || boomSub.includes(term)) termScore += 2
        if (virtual.includes(term)) termScore += 1
      }
      if (termScore > 0) termScore = Math.round(termScore * 0.55)
    }
    if (termScore > 0) { score += termScore; termsCovered++ }
  }
  if (score === 0) return 0
  const coverageRatio = termSets.length > 0 ? termsCovered / termSets.length : 0
  score *= (0.35 + coverageRatio * 0.65)
  if (isAmbienceSearch) {
    const dur = sound.duration || 0
    if (dur > 120) score += 12
    else if (dur > 60) score += 8
    else if (dur > 30) score += 5
    else if (dur > 10) score += 2
    else score -= 4
  }
  return score
}

// ── Écoute des messages du thread principal ───────────────────────────────
self.onmessage = function(e) {
  const { sounds, searchQuery, activeTags, onlyUploaded, requestId } = e.data

  let results = sounds

  if (onlyUploaded) results = results.filter(s => !!s.url)
  if (activeTags && activeTags.length > 0) {
    results = results.filter(s => activeTags.every(tag => (s.tags || []).includes(tag)))
  }

  if (!searchQuery || !searchQuery.trim()) {
    self.postMessage({ results, requestId })
    return
  }

  const rawTerms = searchQuery.trim().split(/[\s,;]+/).filter(t => t.length > 1)
  if (rawTerms.length === 0) {
    self.postMessage({ results, requestId })
    return
  }

  const isAmbienceSearch = rawTerms.some(t => AMBIENCE_TRIGGERS.has(normalize(t)) || AMBIENCE_TRIGGERS.has(normalizeSoft(t)))
  const termSets = rawTerms.map(expandTerm)

  const scored = results.map(sound => ({ sound, score: scoreSound(sound, termSets, isAmbienceSearch) }))

  const filtered = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ sound }) => sound)

  self.postMessage({ results: filtered, requestId })
}
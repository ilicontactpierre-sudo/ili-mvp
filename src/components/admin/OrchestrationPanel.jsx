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
  const lines = []

  // ── SECTION 1 — Identité et mission ──────────────────────────────────────
  lines.push('# ORCHESTRATION SONORE ILi — Instructions pour Claude')
  lines.push('')
  lines.push('Tu es une équipe de trois experts travaillant ensemble sur ILi, une application de lecture immersive :')
  lines.push('- Un **sound designer** : il pense en ambiances, textures sonores, effets ancrés dans les lieux et les corps. Il travaille comme un sound designer de fiction sonore/audio-drama de 2026 : maîtrise des techniques de rétention d\'attention, du rythme, de la surprise contrôlée — jamais du cliché.')
  lines.push('- Un **compositeur** : son travail ne se limite pas aux leitmotivs. Il raconte l\'histoire autrement, par la musique — il sait quand et où poser des notes pour sublimer une émotion, insuffler une idée que le texte ne dit pas explicitement, créer un contraste ou un contrepoint avec ce qui est narré, appuyer un sentiment, ou simplement donner du rythme à la lecture. Les leitmotivs de personnages sont un outil parmi d\'autres dans sa palette, pas sa seule mission. Quand une musique originale se justifie, il sait aussi l\'exprimer comme un vrai artiste le ferait dans un brief à un musicien — pas une commande générique.')
  lines.push('- Un **monteur son** : il contrôle le rythme, la densité, la respiration, et décide des silences. Il a aussi la responsabilité de la structure de lecture elle-même : il peut proposer d\'insérer des points de pause quand le sound design l\'exige vraiment (voir Section 11).')
  lines.push('')
  lines.push('Ton objectif : produire une orchestration de niveau cinématographique professionnel.')
  lines.push('Pas une liste de sons mécaniquement placés — une partition vivante qui épouse chaque inflexion narrative, avec de la variation, du rythme, et une vraie intention artistique derrière chaque choix.')
  lines.push('')
  lines.push('Le texte est découpé en segments numérotés lus séquentiellement, comme des plans au cinéma. Certains segments portent des marqueurs structurels (chapitre, pause) qui te sont signalés directement dans le texte à orchestrer — utilise-les, ils sont une ressource, pas juste une information.')
  lines.push('')

  // ── SECTION 2 — Passe 1 obligatoire ──────────────────────────────────────
  lines.push('## PASSE 1 OBLIGATOIRE — Le script dramaturgique')
  lines.push('')
  lines.push('Avant de produire le JSON, tu dois écrire un bloc `<script>` visible dans ta réponse.')
  lines.push('Ce script est ta "partition" — tu t\'y tiens pour générer le JSON qui suit.')
  lines.push('')
  lines.push('Le bloc `<script>` contient exactement ces 7 rubriques :')
  lines.push('')
  lines.push('**1. Découpage en scènes**')
  lines.push('Pour chaque scène : numéro de scène | segments couverts (ex: seg 1→18) | titre de scène | émotion(s) dominante(s).')
  lines.push('Une scène peut porter plusieurs moods si le ton varie en son sein — précise alors les paliers internes (ex: "seg 14-16 : tension → seg 17-19 : bascule ironique → seg 20+ : retour au drame"). Ne force jamais une seule étiquette si le texte contient une nuance réelle.')
  lines.push('')
  lines.push('**2. Palette sonore globale**')
  lines.push('4 à 6 mots qui définissent l\'univers sonore de CETTE histoire à son ouverture. Exemple : "maritime / mélancolie / rivalité / Méditerranée / ambition". Ces mots sont un point de départ qui guide la cohérence de tes choix — pas une cage.')
  lines.push('Cette palette peut évoluer en cours d\'histoire, et c\'est souhaitable si le récit change de territoire émotionnel ou géographique (un voyage, un basculement de ton, une trahison qui change tout). Si c\'est le cas, note explicitement à partir de quelle scène la palette évolue et vers quoi. Ne force jamais un mot de la palette initiale sur une scène qui le dément clairement : la fidélité à l\'histoire prime toujours sur la fidélité à la palette.')
  lines.push('')
  lines.push('**3. Musique du récit — leitmotivs et musique à l\'image**')
  lines.push('La musique de cette histoire n\'est pas obligatoirement rattachée à un personnage ou un lieu récurrent. Deux approches coexistent, à utiliser selon ce que la scène demande :')
  lines.push('- **Leitmotiv** : un thème associé à un personnage ou concept narratif qui revient, transformé mais reconnaissable, à chaque apparition de l\'élément.')
  lines.push('- **Musique à l\'image** : une musique pensée pour une scène ou un passage précis, sans vocation à revenir — elle habille ce moment particulier pour ce qu\'il raconte émotionnellement.')
  lines.push('Ne cherche pas à attacher artificiellement un leitmotiv à tout ce qui pourrait s\'y prêter. Si un passage appelle une musique sans que cela serve un personnage ou un concept récurrent, propose une musique à l\'image plutôt que de forcer un leitmotiv.')
  lines.push('Pour chaque proposition : nom (uniquement pour un leitmotiv), type de son/instrumentation suggérée, intention dramatique précise, mention "à rechercher dans votre bibliothèque" si aucun son exact disponible dans le vocabulaire curé.')
  lines.push('')
  lines.push('**4. Plan des couches par scène**')
  lines.push('Pour chaque scène : quelles couches sont actives (bed / atmosphere / music / diegetic / transition) et leur densité relative (légère / moyenne / dense). La densité n\'est pas limitée par un plafond numérique — c\'est un choix rythmique : dense aux climax, nu ailleurs (voir Section 7).')
  lines.push('')
  lines.push('**5. Beats clés**')
  lines.push('Liste des moments dramatiquement importants avec leur numéro de segment et leur traitement sonore prévu. Types de beats : silence, impact, swell, rupture, citation leitmotiv, transition, hook.')
  lines.push('Pour un beat "silence", précise systématiquement trois choses : ce qui disparaît, ce qui le remplace pendant la durée du silence (le silence n\'est presque jamais un vrai néant — voir Section 8), et comment on rebascule (fondu ou coupure nette).')
  lines.push('')
  lines.push('**6. Transitions prévues**')
  lines.push('Liste des ruptures de scène, de lieu, de personnage ou de temporalité, avec la technique choisie pour chacune (voir Section 9). Vérifie que tu n\'utilises pas la même technique deux fois de suite sans raison — la variation est la règle, jamais l\'automatisme.')
  lines.push('')
  lines.push('**7. Auto-critique**')
  lines.push('Avant de produire le JSON, relis ton propre plan et réponds honnêtement à trois questions :')
  lines.push('- Ai-je utilisé la même émotion dominante sur plus de 2-3 scènes consécutives sans justification narrative ?')
  lines.push('- Ai-je un réflexe (stinger d\'horreur, whoosh systématique, crescendo prévisible) que j\'ai utilisé sans vraiment y penser ?')
  lines.push('- Ai-je assez de moments diégétiques, de hooks d\'attention, et de vraie variation de densité — ou ai-je été trop sage ?')
  lines.push('Si une réponse te gêne, corrige ton plan avant de continuer.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 3 — Architecture en couches ──────────────────────────────────
  lines.push('## Architecture en couches')
  lines.push('')
  lines.push('Tout son appartient à exactement une couche. Le champ `layer` le précise.')
  lines.push('')
  lines.push('### Couche "bed" — Ambiance géographique de fond')
  lines.push('- Toujours présente quand on est dans un lieu défini. Volume très bas : 0.12–0.28.')
  lines.push('- `loop: true`, `loopCrossfade: "medium"` systématique. FadeIn/fadeOut longs (3–8s).')
  lines.push('- Maximum 1 bed actif à la fois (sauf transition entre deux lieux).')
  lines.push('')
  lines.push('### Couche "atmosphere" — Tension émotionnelle sans lieu')
  lines.push('- Drones, textures, bourdons, pulsations, nappes. Volume très bas : 0.10–0.22.')
  lines.push('- `loop: true`, `loopCrossfade: "medium"`. S\'intensifie avec la tension → `automationPoints` fréquents.')
  lines.push('- Peut coexister avec le bed.')
  lines.push('')
  lines.push('### Couche "music" — Thèmes, leitmotivs, musique à l\'image')
  lines.push('- Volume moyen : 0.20–0.45. Doit respirer : ne pas couvrir tout le texte en continu.')
  lines.push('- `automationPoints` quasi-systématiques : elle s\'efface pendant les dialogues, remonte pendant les descriptions.')
  lines.push('- `leitmotiv` obligatoire si lié à un personnage ou concept récurrent, sinon `null` (musique à l\'image).')
  lines.push('- Champ `sunoPrompt` optionnel — voir Section 10.')
  lines.push('- **La musique se mérite, elle n\'est pas un défaut.** Avant de créer un bloc music, demande-toi si le sound design seul (bed + atmosphere + diegetic) ne suffit pas déjà à porter la scène. Une majorité de segments sans musique active est saine, même dans une scène chargée en émotion — beaucoup de tension ou de mélancolie se joue très bien sans note de musique du tout. Vise une couverture musicale nettement inférieure à la moitié du texte, sauf histoire qui appelle vraiment une trame continue.')
  lines.push('')
  lines.push('### Couche "diegetic" — Sons de l\'action narrée (deux modes, champ `diegeticMode`)')
  lines.push('- **"ponctuel"** : 1 segment exact, `loop: false`, fadeIn: 0, fadeOut: 0. Volume élevé : 0.55–0.82. `delayTarget` pour synchroniser sur un mot précis. `pan` autorisé si position spatiale explicite dans le texte.')
  lines.push('- **"sequence"** : plusieurs segments, suit une action continue décrite dans le texte (une marche, un geste qui dure, une respiration qui s\'installe). Volume moyen : 0.35–0.55. FadeIn/fadeOut courts autorisés. Utilise-la activement — ne réduis pas le diégétique aux seuls impacts ponctuels, c\'est elle qui donne la sensation de corps et de présence continue.')
  lines.push('- Vise une présence diégétique régulière (au moins un événement, ponctuel ou en séquence, toutes les 8-12 segments quand l\'action le permet). Un texte sans diégétique pendant une longue plage est probablement un manque, pas un choix.')
  lines.push('- Ne laisse pas le mode "sequence" dominer systématiquement : un texte riche en action concrète mérite aussi des impacts ponctuels nets et brefs (un objet posé, une porte, un coup, un choc) — pas seulement des présences continues en fond.')
  lines.push('- Jamais d\'`automationPoints` sur cette couche.')
  lines.push('')
  lines.push('### Couche "transition" — Rupture narrative')
  lines.push('- 1 segment, ponctuel, volume 0.45–0.70. Voir la boîte à outils de techniques en Section 9 — ne pas se limiter au whoosh/riser.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 4 — automationPoints ─────────────────────────────────────────
  lines.push('## automationPoints — Règles d\'or')
  lines.push('')
  lines.push('```json')
  lines.push('"automationPoints": [')
  lines.push('  { "segment": 12, "volume": 0.08, "fadeMs": 2500 },')
  lines.push('  { "segment": 18, "volume": 0.22, "fadeMs": 1500 }')
  lines.push(']')
  lines.push('```')
  lines.push('`fadeMs` recommandés : instantané 0, imperceptible 300, court 600, naturel 1500, long 2500, scénique 5000, cinématique 10000.')
  lines.push('')
  lines.push('Règles : toute musique qui couvre un dialogue descend pendant le dialogue et remonte après. Toute atmosphère qui s\'intensifie progressivement a des points intermédiaires. Minimum 2 points sur tout bloc de plus de 8 segments. Jamais d\'automationPoints sur les diégétiques. `automationPoints: []` si aucun point — ne jamais omettre le champ.')
  lines.push('Ne crée jamais deux blocs du même `keyword` sur des segments contigus pour simuler une variation de volume dans le temps — un seul bloc avec des `automationPoints` suffit toujours pour ça.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 5 — loopCrossfade, pan, panMode ──────────────────────────────
  lines.push('## loopCrossfade, pan et panMode')
  lines.push('')
  lines.push('- `loopCrossfade` : "medium" par défaut sur tout `loop: true`, "long" pour nappes très lentes, "none" pour rythmique/percussif ou tout `loop: false`.')
  lines.push('- `pan` : réservé à la couche diegetic avec position spatiale explicite. Jamais sur bed/atmosphere/music. Maximum 20% des sons diégétiques.')
  lines.push('- `panMode` : "static" par défaut absolu. Les modes animés (sweep, oscillate, converge, diverge) restent des outils ponctuels et justifiés — jamais un réflexe systématique. Justification obligatoire dans `note` si `panMode ≠ "static"`.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 6 — Leitmotivs ────────────────────────────────────────────────
  lines.push('## Leitmotivs')
  lines.push('')
  lines.push('Un leitmotiv est un son ou une texture associée à un personnage, un lieu récurrent, ou un concept narratif. Il revient à chaque apparition de l\'élément, transformé mais reconnaissable.')
  lines.push('Nom précis et cohérent dans toute l\'orchestration. Traitements possibles à préciser dans `note` : "citation", "contrepoint", "écho", "transformation". `leitmotiv: null` si aucun (y compris pour une musique à l\'image) — ne jamais omettre le champ.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 6bis — Écriture des notes ────────────────────────────────────
  lines.push('## Écriture des notes — langage concret, jamais poétique')
  lines.push('')
  lines.push('Le champ `note` de chaque bloc son suit toujours ce gabarit en 3 temps, dans cet ordre :')
  lines.push('1. **Matière du son** : texture, registre (grave / médium / aigu), dynamique (attaque douce ou franche, continu ou ponctuel, rythmique ou non, avec ou sans mélodie).')
  lines.push('2. **Fonction dans le mix** : quel plan perceptuel (premier plan / intermédiaire / arrière-plan — voir section suivante), avec quoi il coexiste.')
  lines.push('3. **Intention** : une phrase simple qui dit pourquoi ce choix sert cette scène précise, sans reformuler le texte littéraire.')
  lines.push('')
  lines.push('**Interdit** : toute tournure poétique ou métaphorique ("un vent essoufflé", "une texture de pressentiment", "l\'âme du navire"). Écris comme un ingénieur du son qui décrit un fichier à un collègue, pas comme un romancier. Si tu ne peux pas transformer ta note en une recherche concrète dans une bibliothèque de sons, reformule-la.')
  lines.push('')
  lines.push('Exemple correct : "Drone grave continu, sans attaque ni pulsation rythmique, texture granuleuse, pas un synthé propre. Plan intermédiaire, sous le bed portuaire. Traduit un malaise diffus dont la cause n\'est pas encore nommée."')
  lines.push('Exemple incorrect, à ne jamais produire : "Texture de pressentiment qui monte avec la lenteur suspecte du navire."')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 7 — Densité et mixage par plans ──────────────────────────────
  lines.push('## Densité et mixage par plans')
  lines.push('')
  lines.push('Il n\'y a pas de limite fixe au nombre de sons simultanés. La densité est un outil de rythme narratif — pas une contrainte technique.')
  lines.push('')
  lines.push('Pense chaque empilement de sons en plans perceptuels :')
  lines.push('- **Premier plan** : ce que l\'oreille suit consciemment (un diégétique en séquence, une citation de leitmotiv, une musique qui monte)')
  lines.push('- **Plan intermédiaire** : ce qui colore sans capter l\'attention (une atmosphère qui s\'intensifie, une musique en second plan)')
  lines.push('- **Arrière-plan** : le sol constant (le bed)')
  lines.push('')
  lines.push('Un empilement fonctionne quand chaque son occupe un plan et un registre de fréquence différents — pas quand on entasse plusieurs sons au même plan.')
  lines.push('Garde une vraie variation de densité dans le temps : scènes touffues (climax) et scènes très nues (silence, intimité) — l\'alternance elle-même rend l\'écoute captivante. Respiration obligatoire : 1–2 segments sans aucun son entre deux scènes distinctes, sauf raison narrative de les enchaîner sans coupure.')
  lines.push('')
  lines.push('**Champ `plan` obligatoire sur chaque bloc son** : "premier" (l\'oreille le suit consciemment), "intermediaire" (colore sans capter l\'attention), ou "arriere" (le sol constant). Deux sons au même plan et au même registre de fréquence risquent de se marcher dessus — vérifie-le avant de les superposer.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 6ter — Unités de temps ───────────────────────────────────────
  lines.push('## Unités de temps — ne jamais confondre')
  lines.push('')
  lines.push('- `fadeIn` et `fadeOut` (au niveau du bloc son) sont exprimés en SECONDES. Exemple : `"fadeIn": 0.5` = un fondu d\'une demi-seconde. Une valeur à 2-3 chiffres pour ces deux champs est presque toujours une erreur.')
  lines.push('- `fadeMs` (dans les `automationPoints` uniquement) est exprimé en MILLISECONDES. Exemple : `"fadeMs": 500` = une demi-seconde.')
  lines.push('- Ne confonds jamais les deux unités.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 8 — Silence, hooks, rétention d'attention ────────────────────
  lines.push('## Silence, hooks et rétention d\'attention')
  lines.push('')
  lines.push('Boîte à outils du monteur son 2026 — un répertoire de techniques parmi lesquelles choisir selon la scène, jamais une checklist à cocher systématiquement.')
  lines.push('')
  lines.push('**Silence actif** : baisser soudainement une ambiance et la remplacer par un design sonore ponctuel et minimal pendant la durée d\'une phrase importante, puis rebasculer.')
  lines.push('**Rétention par manque** : suspendre un son attendu par le lecteur pour créer une tension d\'anticipation.')
  lines.push('**Accroche d\'ouverture** : un micro-événement sonore dans les 1-2 premiers segments d\'une scène ou d\'un chapitre, avant que le texte n\'installe le décor.')
  lines.push('**Asymétrie de densité** : alterner franchement scènes touffues et scènes nues plutôt que maintenir une densité moyenne constante.')
  lines.push('**Interdits explicites, sauf justification narrative forte** : stingers d\'horreur génériques, whoosh systématique sur toute transition, crescendo prévisible sur toute montée de tension.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 9 — Transitions ───────────────────────────────────────────────
  lines.push('## Transitions — boîte à outils de techniques variées')
  lines.push('')
  lines.push('Pour chaque rupture, choisis une technique et varie-la d\'un point de transition à l\'autre :')
  lines.push('- **Crossfade tonal** : le bed/atmosphere sortant s\'éteint pendant que l\'entrant monte, sans son dédié.')
  lines.push('- **Coupure sèche** : silence net, sans fondu — pour un choc ou une bascule brutale.')
  lines.push('- **Pont par leitmotiv** : un fragment du thème d\'un personnage traverse la coupure.')
  lines.push('- **Pré-lap diégétique** : un son propre à la scène suivante commence légèrement avant que le texte n\'y arrive.')
  lines.push('- **Riser / whoosh / stinger** : toujours disponible, mais à utiliser avec parcimonie — jamais le choix par défaut.')
  lines.push('')
  lines.push('Une transition peut aussi faire durer un suspense, installer une ironie, ou marquer une respiration réflexive — pas seulement un changement de décor.')
  lines.push('"Avec parcimonie" ne veut pas dire "jamais" : si aucune de tes transitions ne mérite un vrai bloc `layer: "transition"` sur toute l\'histoire, c\'est suspect — vérifie qu\'il n\'y a vraiment aucune rupture assez forte pour ça avant de t\'en passer entièrement.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 10 — Prompt Suno ──────────────────────────────────────────────
  lines.push('## Prompt Suno pour les musiques originales')
  lines.push('')
  lines.push('Sur tout bloc `layer: "music"` où une musique composée sur mesure servirait mieux la scène qu\'un son de bibliothèque, ajoute un champ optionnel `sunoPrompt` : une chaîne prête à copier-coller dans Suno. Ajoute aussi un champ `sunoMode` : `"theme"` ou `"texture"` (voir ci-dessous) — il détermine comment le prompt doit être écrit.')
  lines.push('')
  lines.push('**Attention à un biais connu de Suno** : même quand on lui demande une simple ambiance, Suno a tendance à produire quelque chose de mélodique et de "chantonnable", parce qu\'il est majoritairement entraîné sur des morceaux avec un thème identifiable. Si tu veux une vraie texture (un tapis émotionnel, une matière sonore, un score hybride musique/sound-design comme certains films contemporains le font — l\'orchestre traité comme matière plutôt que comme mélodie), il faut le contrer explicitement dans le prompt, pas juste demander "ambiance".')
  lines.push('')
  lines.push('**Mode `"theme"`** — un motif mélodique identifiable, destiné à être reconnu et à revenir (leitmotiv) ou à porter une scène précise avec une vraie ligne mélodique (musique à l\'image marquante) :')
  lines.push('- Structure en 5-8 descripteurs : genre/sous-genre d\'abord, puis instrument(s) principal(aux), mood, tempo (BPM), référence d\'époque/production.')
  lines.push('- Précis comme un vrai brief d\'artiste : pas "piano triste" mais "piano solo mélancolique, notes espacées, léger bruit de mécanique, enregistrement intime".')
  lines.push('')
  lines.push('**Mode `"texture"`** — une ambiance, un contraste, un contrepoint qui ne doit surtout pas se remarquer comme "une musique" : pas de mélodie qui se retient, pas d\'instrument soliste qui prend le lead. Ajoute systématiquement :')
  lines.push('- Des tags négatifs explicites : "no melody, no lead instrument, no hook, non-melodic, textural only".')
  lines.push('- Des tags positifs orientés matière : "drone-based, granular texture, processed strings, sustained clusters, sound-design hybrid score, evolving texture rather than theme".')
  lines.push('- Si l\'effet recherché mélange musique et SFX (comme un score de film qui traite bruitage et orchestre comme une seule matière), dis-le explicitement : "blended with sound-design elements, textural bed rather than a song".')
  lines.push('')
  lines.push('Longueur cible dans les deux modes : 150-300 caractères. Exclusions artistiques uniquement si elles découlent d\'une vraie intention pour CETTE œuvre — jamais par défaut. Le champ `note` du bloc explique toujours l\'intention dramatique, séparément du prompt Suno lui-même.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 11 — Pauses ───────────────────────────────────────────────────
  lines.push('## Pauses — proposer de nouveaux points de rupture')
  lines.push('')
  lines.push('Au-delà des pauses déjà existantes dans le texte (signalées ci-dessous), tu peux proposer l\'insertion de NOUVELLES pauses, uniquement quand ton sound design l\'exige vraiment — jamais pour une raison purement narrative ou visuelle, qui reste la décision de l\'auteur.')
  lines.push('')
  lines.push('Utilise cette possibilité pour : ajouter du rythme et de la respiration, ménager un suspense, appuyer une bascule d\'humour ou d\'ironie, ouvrir un temps de réflexion après une phrase forte.')
  lines.push('')
  lines.push('Tu contrôles uniquement la durée (`durationMs`). La transition visuelle reste à la discrétion de l\'auteur — n\'en propose pas. En revanche, tout son que tu places sur cette pause doit systématiquement avoir un fadeIn et un fadeOut, jamais une coupure sèche — une pause n\'est pas nécessairement un silence, un son peut continuer ou se transformer pendant qu\'elle a lieu.')
  lines.push('')
  lines.push('Précise toujours l\'intention (`intention`) : rythme / suspense / humour / réflexion / bascule de mood / autre. Sois sélectif : chaque pause proposée doit être un vrai geste artistique, pas un tic.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── SECTION 12 — Sons uploadés + vocabulaire ─────────────────────────────
  lines.push('## Vocabulaire disponible — Keywords autorisés')
  lines.push('')
  lines.push('**RÈGLE ABSOLUE : chaque `keyword` doit être un mot de cette liste exactement. N\'utilise jamais le champ `soundId`.**')
  lines.push('Tu n\'as aucune information sur les sons déjà présents dans la bibliothèque de l\'auteur — n\'en suppose jamais l\'existence, même si un nom te semble plausible. Décris toujours ton intention via `keyword` + `note` ; c\'est à l\'auteur de retrouver ou choisir le fichier exact ensuite.')
  lines.push('Si aucun keyword ne correspond parfaitement au son idéal, utilise le plus proche et précise ce que tu voulais vraiment dans `note`.')
  lines.push('')
  Object.entries(CURATED_VOCABULARY).forEach(([group, words]) => {
    lines.push(`**${group}** :`)
    lines.push(words.join(', '))
    lines.push('')
  })

  // ── SECTION 13 — Format JSON de sortie ───────────────────────────────────
  lines.push('---')
  lines.push('')
  lines.push('## Format JSON de sortie — Strict')
  lines.push('')
  lines.push('La réponse contient, dans l\'ordre : le bloc `<script>`, PUIS la ligne `### PAUSES` suivie de son tableau JSON (TOUJOURS présent, `[]` si aucune proposition), PUIS la ligne `### SONS` suivie de son tableau JSON. Ces deux marqueurs texte permettent de vérifier immédiatement que rien n\'a été oublié.')
  lines.push('')
  lines.push('**### PAUSES**')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push('    "afterSegment": 24,')
  lines.push('    "durationMs": 1200,')
  lines.push('    "intention": "suspense",')
  lines.push('    "note": "Silence avant la révélation — laisse le lecteur suspendu une seconde."')
  lines.push('  }')
  lines.push(']')
  lines.push('```')
  lines.push('')
  lines.push('**### SONS**')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push('    "keyword": "footstep",')
  lines.push('    "startSegment": 5,')
  lines.push('    "endSegment": 11,')
  lines.push('    "volume": 0.42,')
  lines.push('    "loop": true,')
  lines.push('    "loopCrossfade": "medium",')
  lines.push('    "fadeIn": 1,')
  lines.push('    "fadeOut": 1,')
  lines.push('    "delay": 0,')
  lines.push('    "delayTarget": null,')
  lines.push('    "pan": 0,')
  lines.push('    "panMode": "static",')
  lines.push('    "automationPoints": [],')
  lines.push('    "layer": "diegetic",')
  lines.push('    "diegeticMode": "sequence",')
  lines.push('    "leitmotiv": null,')
  lines.push('    "type": "diegetique",')
  lines.push('    "plan": "premier",')
  lines.push('    "note": "Pas granuleux et régulier, sans percussion identifiable. Plan premier — accompagne la marche au premier plan sonore. Ancre le personnage dans l\'espace physique."')
  lines.push('  },')
  lines.push('  {')
  lines.push('    "keyword": "piano",')
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
  lines.push('      { "segment": 7, "volume": 0.10, "fadeMs": 2500 }')
  lines.push('    ],')
  lines.push('    "layer": "music",')
  lines.push('    "leitmotiv": "thème d\'Elsa",')
  lines.push('    "type": "musique",')
  lines.push('    "plan": "intermediaire",')
  lines.push('    "sunoPrompt": "melancholic solo piano, sparse notes, intimate close-mic recording, soft room tone, minor key, slow tempo 60bpm, cinematic, no percussion",')
  lines.push('    "note": "Piano solo, notes espacées, sans pédale de sustain longue. Plan intermédiaire, sous les dialogues, remonte en plan premier sur les descriptions intérieures. Porte l\'émotion d\'Elsa sans dépendre de sa présence physique dans la scène."')
  lines.push('  }')
  lines.push(']')
  lines.push('```')
  lines.push('')
  lines.push('**Règles de production impératives :**')
  lines.push('- Ordre toujours : `<script>`, JSON pauses, JSON sons — sans texte ni balises markdown autour des blocs JSON')
  lines.push('- `loopCrossfade: "none"` sur tous les `loop: false` ; `"medium"` par défaut sur tous les `loop: true`')
  lines.push('- `automationPoints: []` et `leitmotiv: null` si absents — ne jamais omettre ces champs')
  lines.push('- `diegeticMode` obligatoire sur toute couche `"diegetic"` ("ponctuel" ou "sequence")')
  lines.push('- `plan` obligatoire sur chaque bloc son ("premier" | "intermediaire" | "arriere")')
  lines.push('- `sunoPrompt` uniquement sur les blocs `"music"`, et seulement quand une composition sur mesure sert mieux la scène — jamais systématique')
  lines.push('- Le silence est une décision artistique aussi forte qu\'un son')
  lines.push('- Volumes de référence : bed 0.12–0.28 | atmosphere 0.10–0.22 | music 0.20–0.45 | diegetic ponctuel 0.55–0.82 | diegetic séquence 0.35–0.55 | transition 0.45–0.70')
  lines.push('')
  lines.push('---')
  lines.push(`## Texte à orchestrer (${segments.length} segments)`)
  lines.push('')
  segments.forEach((seg, i) => {
    const isChapter = seg && typeof seg === 'object' && seg.isChapter === true
    const pauseMs = seg && typeof seg === 'object' && seg.pause != null ? seg.pause : null
    if (pauseMs != null) {
      lines.push(`[${i + 1}] ⏸ PAUSE existante — ${pauseMs}ms — un blocson peut y être placé ou prolongé`)
      return
    }
    const text = getSegmentText(seg).trim()
    if (text) lines.push(`[${i + 1}]${isChapter ? ' (chapitre)' : ''} ${text}`)
  })
  lines.push('')
  lines.push('---')
  lines.push('Commence par le bloc `<script>`, puis `### PAUSES` avec son tableau JSON (même vide), puis `### SONS` avec son tableau JSON. Rien d\'autre.')
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

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION DES BLOCS JSON — le nouveau format retourne 2 tableaux
// (pauses proposées, puis sons). On les extrait par comptage de crochets,
// en ignorant tout le texte autour (bloc <script>, prose, balises ```json).
// ─────────────────────────────────────────────────────────────────────────────
function extractJsonBlocks(rawText) {
  let cleaned = rawText.replace(/<script>[\s\S]*?<\/script>/gi, '')
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '')
  const arrays = []
  let i = 0
  while (i < cleaned.length) {
    if (cleaned[i] === '[') {
      let depth = 0
      let start = i
      let closed = false
      for (let j = i; j < cleaned.length; j++) {
        if (cleaned[j] === '[') depth++
        if (cleaned[j] === ']') depth--
        if (depth === 0) {
          const candidate = cleaned.slice(start, j + 1)
          try {
            arrays.push(JSON.parse(candidate))
          } catch (e) {
            // pas un JSON valide à cette position, on ignore
          }
          i = j + 1
          closed = true
          break
        }
      }
      if (!closed) break // crochets non équilibrés jusqu'à la fin, on arrête
    } else {
      i++
    }
  }
  return arrays
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
  soundLibraryReady = true,
  soundTracks,
  onSoundTracksChange,
  onSegmentsChange,
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
    // Garde-fou : si la bibliothèque sonore n'a pas fini de charger (fetch
    // Supabase encore en cours), tous les sons paraîtraient "manquants" à
    // tort — mieux vaut bloquer l'analyse que produire des blocs grisés
    // par erreur.
    if (!soundLibraryReady) {
      setImportError('La bibliothèque sonore est encore en cours de chargement — patiente quelques secondes puis relance l\'analyse.')
      return
    }
    if (!importJson.trim()) {
      setImportError('Colle le JSON de Claude ici.')
      return
    }
    const arrays = extractJsonBlocks(importJson)
    let pausesRaw = []
    let soundsRaw = []
    if (arrays.length >= 2) {
      pausesRaw = arrays[0]
      soundsRaw = arrays[1]
    } else if (arrays.length === 1) {
      // Rétrocompatibilité : ancien format, un seul tableau (sons uniquement)
      soundsRaw = arrays[0]
    } else {
      setImportError('Aucun tableau JSON valide trouvé dans le texte collé.')
      return
    }
    if (!Array.isArray(pausesRaw) || !Array.isArray(soundsRaw)) {
      setImportError('Le format JSON est invalide (pauses et sons doivent être des tableaux).')
      return
    }
    // ── Validation des pauses proposées ──────────────────────────────────
    const validPauses = []
    const invalidPauses = []
    pausesRaw.forEach((p, idx) => {
      const afterSegment = Number(p.afterSegment)
      const durationMs = Number(p.durationMs)
      const inRange = Number.isInteger(afterSegment) && afterSegment >= 1 && afterSegment <= segments.length
      const validDuration = Number.isFinite(durationMs) && durationMs > 0
      if (inRange && validDuration) {
        validPauses.push({
          afterSegment,
          durationMs,
          intention: p.intention || '',
          note: p.note || '',
        })
      } else {
        invalidPauses.push({ index: idx, reason: !inRange ? 'afterSegment hors limites' : 'durationMs invalide', raw: p })
      }
    })
    // ── Diagnostic des sons (logique inchangée) ──────────────────────────
    const found = []
    const missing = []
    soundsRaw.forEach((block, idx) => {
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
    setDiagnosis({ found, missing, pauses: validPauses, invalidPauses, parsed: soundsRaw })
  }, [importJson, soundLibrary, segments, soundLibraryReady])

  // ── Application ───────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (!diagnosis) return

    // ── 1. Insérer les pauses proposées AVANT toute résolution de son ──────
    // On construit une nouvelle liste de segments en insérant les pauses,
    // des numéros les plus grands vers les plus petits (comme handleDeleteSegment
    // le fait déjà pour les suppressions), afin que les positions déjà traitées
    // ne soient jamais invalidées par une insertion suivante.
    const pausesToInsert = (diagnosis.pauses || []).slice().sort((a, b) => b.afterSegment - a.afterSegment)
    let workingSegments = segments
    if (pausesToInsert.length > 0 && onSegmentsChange) {
      workingSegments = [...segments]
      pausesToInsert.forEach((p, i) => {
        const pauseSeg = {
          id: `seg_pause_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
          text: '',
          pause: p.durationMs,
          _orchestrationPauseIntention: p.intention || '',
          _orchestrationPauseNote: p.note || '',
        }
        workingSegments.splice(p.afterSegment, 0, pauseSeg)
      })
      onSegmentsChange(workingSegments)
    }

    // Fonction de remappage : convertit un numéro de segment "d'origine"
    // (tel que Claude l'a vu, avant insertion des pauses) vers sa nouvelle
    // position réelle dans workingSegments.
    const remap = (originalNum) => {
      if (pausesToInsert.length === 0) return originalNum
      const shift = pausesToInsert.filter(p => p.afterSegment < originalNum).length
      return originalNum + shift
    }

    // ── 2. Construire les soundTracks à partir des sons diagnostiqués ──────
    const newTracks = []
    const resolveSegmentId = (segNum) => {
      const idx = segNum - 1
      if (idx < 0 || idx >= workingSegments.length) return null
      const seg = workingSegments[idx]
      return { id: seg?.id || `seg_${idx}`, idx }
    }
    const findFreeColumn = (startIdx, endIdx) => {
      for (let c = 0; c < 6; c++) {
        const conflict = [...soundTracks, ...newTracks].some(track => {
          const ts = workingSegments.findIndex(s => (s.id || `seg_${workingSegments.indexOf(s)}`) === track.startSegmentId)
          const te = workingSegments.findIndex(s => (s.id || `seg_${workingSegments.indexOf(s)}`) === track.endSegmentId)
          const teR = te !== -1 ? te : ts
          return track.column === c && ts <= endIdx && teR >= startIdx
        })
        if (!conflict) return c
      }
      return 0
    }
    const computeDelayFromTarget = (block, segmentText) => {
      if (!block.delayTarget || !segmentText) return Math.round((block.delay ?? 0) * 1000)
      const words = segmentText.trim().split(/\s+/)
      const target = block.delayTarget.toLowerCase()
      const targetIdx = words.findIndex(w => w.toLowerCase().includes(target))
      if (targetIdx === -1) return Math.round((block.delay ?? 0) * 1000)
      return Math.round(targetIdx * 300)
    }
    const buildAutomationPoints = (block, startSeg) => {
      if (block.automationPoints && block.automationPoints.length > 0) {
        return block.automationPoints.map(pt => {
          const remappedPtSeg = remap(pt.segment)
          const segOffset = remappedPtSeg - remap(block.startSegment)
          const segIdx = startSeg.idx + segOffset
          const seg = workingSegments[segIdx]
          if (!seg) return null
          return {
            segmentId: seg.id || seg._id || `seg_${segIdx}`,
            volume: Math.round(pt.volume * 100) / 100,
            fadeMs: pt.fadeMs ?? 800,
          }
        }).filter(Boolean)
      }
      const envelope = block.volumeEnvelope || 'flat'
      if (envelope === 'flat') return []
      const vol = block.volume ?? 0.5
      const makePoint = (segIdx, volume) => {
        const seg = workingSegments[segIdx]
        if (!seg) return null
        return {
          segmentId: seg.id || seg._id || `seg_${segIdx}`,
          volume: Math.round(volume * 100) / 100,
          fadeMs: 800,
        }
      }
      const startIdx = startSeg.idx
      const endSeg = resolveSegmentId(remap(block.endSegment))
      const endIdx = endSeg ? endSeg.idx : startIdx
      const midIdx = Math.round((startIdx + endIdx) / 2)
      if (envelope === 'crescendo') return [makePoint(startIdx, vol * 0.3), makePoint(endIdx, vol)].filter(Boolean)
      if (envelope === 'decrescendo') return [makePoint(startIdx, vol), makePoint(endIdx, vol * 0.3)].filter(Boolean)
      if (envelope === 'swell') return [makePoint(startIdx, vol * 0.3), makePoint(midIdx, vol), makePoint(endIdx, vol * 0.3)].filter(Boolean)
      return []
    }
    const buildTrack = (sound, block, muted = false, broken = false) => {
      const start = resolveSegmentId(remap(block.startSegment))
      const end = resolveSegmentId(remap(block.endSegment))
      if (!start || !end) return null
      const col = findFreeColumn(start.idx, end.idx)
      const segmentText = (() => {
        const seg = workingSegments[start.idx]
        if (!seg) return ''
        return typeof seg === 'string' ? seg : (seg.text || '')
      })()
      const delayMs = computeDelayFromTarget(block, segmentText)
      const automationPoints = buildAutomationPoints(block, start)
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
        loopCrossfade: block.loop ? (block.loopCrossfade ?? 'medium') : undefined,
        fadeIn: Math.round((block.fadeIn ?? 0) * 1000),
        fadeOut: Math.round((block.fadeOut ?? 0) * 1000),
        delay: delayMs,
        pan,
        panMode,
        muted,
        broken: broken || undefined,
        automationPoints: automationPoints.length > 0 ? automationPoints : undefined,
        _orchestrationNote: block.note || '',
        _orchestrationKeyword: block.soundId || block.keyword || '',
        _orchestrationLayer: block.layer || block.type || '',
        _orchestrationLeitmotiv: block.leitmotiv || '',
        _orchestrationDiegeticMode: block.diegeticMode || null,
        _orchestrationSunoPrompt: block.sunoPrompt || null,
        _orchestrationPlan: block.plan || null,
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
    if (newTracks.length === 0 && pausesToInsert.length === 0) { setApplyStatus('error'); return }
    onSoundTracksChange([...soundTracks, ...newTracks])
    if (onSaveToHistory) onSaveToHistory()
    setApplyStatus('success')
  }, [diagnosis, segments, soundTracks, onSoundTracksChange, onSegmentsChange, onSaveToHistory])

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
        {!soundLibraryReady && (
          <span style={{ ...s.stat, color: 'rgba(255,193,7,0.85)', borderColor: 'rgba(255,193,7,0.3)' }}>
            ⏳ bibliothèque en cours de chargement…
          </span>
        )}
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
                disabled={!importJson.trim() || !soundLibraryReady}
                style={{ ...s.btn('primary'), opacity: (importJson.trim() && soundLibraryReady) ? 1 : 0.4, cursor: (importJson.trim() && soundLibraryReady) ? 'pointer' : 'not-allowed' }}
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
            {/* Pauses proposées */}
            {diagnosis.pauses && diagnosis.pauses.length > 0 && (
              <div style={s.diagBox('ok')}>
                <div style={s.diagTitle('ok')}>⏱ {diagnosis.pauses.length} pause(s) proposée(s)</div>
                {diagnosis.pauses.map((p, i) => (
                  <div key={i} style={s.diagItem}>
                    <strong style={{ color: 'rgba(255,255,255,0.75)' }}>
                      après segment {p.afterSegment}
                    </strong>{' '}
                    · {p.durationMs}ms · <em>{p.intention || 'sans intention précisée'}</em>
                    {p.note && <span style={{ opacity: 0.5 }}> — {p.note}</span>}
                  </div>
                ))}
              </div>
            )}
            {diagnosis.invalidPauses && diagnosis.invalidPauses.length > 0 && (
              <div style={{ ...s.diagBox('warn'), marginTop: '0.5rem' }}>
                <div style={s.diagTitle('warn')}>⚠ {diagnosis.invalidPauses.length} pause(s) ignorée(s)</div>
                {diagnosis.invalidPauses.map((p, i) => (
                  <div key={i} style={s.diagItem}>{p.reason}</div>
                ))}
              </div>
            )}
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
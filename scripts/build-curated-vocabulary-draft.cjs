#!/usr/bin/env node
// ═════════════════════════════════════════════════════════════════════════
// scripts/build-curated-vocabulary-draft.cjs
//
// Prépare la mise à jour de CURATED_VOCABULARY (OrchestrationPanel.jsx) à
// partir des mots-clés SoundQ réellement présents dans la bibliothèque.
//
// Répartit chaque mot-clé fréquent en 3 tas :
//   1. déjà présent dans CURATED_VOCABULARY actuel → ignoré (rien à faire)
//   2. exclu d'office (liste STOPLIST éditable ci-dessous)          → ignoré
//   3. "à trier" → écrit dans un CSV pour relecture manuelle rapide
//
// USAGE :
//   node scripts/build-curated-vocabulary-draft.cjs
//
// SORTIE :
//   scripts/vocabulary-review.csv  (à ouvrir dans Numbers/Excel)
// ═════════════════════════════════════════════════════════════════════════

const fs = require('fs')
const path = require('path')

const SOUNDQ_PATH = path.join(__dirname, '..', 'public', 'sounds', 'soundq-keywords.json')
const OUTPUT_CSV = path.join(__dirname, 'vocabulary-review.csv')

// ── Plafond : on ne considère QUE les N mots les plus fréquents ─────────
// Un simple seuil de fréquence ne garantit rien sur la taille finale du
// tas à trier (la longue traîne peut être énorme). Un plafond fixe, lui,
// contrôle directement combien de mots tu auras à trier manuellement.
const TOP_N = 500

// ── Vocabulaire actuel (copié depuis OrchestrationPanel.jsx) ────────────
// Sert à savoir ce qui est DÉJÀ couvert, pour ne pas te refaire trier ce
// que tu as déjà choisi. Garde ceci synchronisé avec le fichier source si
// tu modifies l'un ou l'autre entre-temps.
const CURATED_VOCABULARY = {
  'Ambiances naturelles': ['forest','rain','wind','storm','thunder','ocean','waves','river','birds','birdsong','crickets','insects','leaves','fire','snow','rural','nature','dawn','night','morning','jungle','cave','waterfall','lake','beach','seaside','wind chime','drizzle','blizzard','fog','frost','mud','grass','swamp','desert','mountain','field','coast'],
  'Ambiances urbaines': ['city','traffic','street','crowd','urban','market','restaurant','cafe','office','airport','subway','train','harbor','construction','church','indoor','outdoor','room','corridor','bar','port','docks','station','hospital','school','library','hotel','prison','courtyard','basement','attic'],
  'Ambiances historiques & lieux dramatiques': ['tavern','castle','dungeon','crypt','cathedral','monastery','battlefield','trench','ruins','forge','stable','village','cemetery','chapel','tower','cellar'],
  'Atmosphères & tensions': ['dark','tension','horror','eerie','mystery','drone','ambient','atmosphere','background','calm','peaceful','ominous','spooky','dramatic','epic','cinematic','suspense','lonely','strange','melancholic','haunting','oppressive','anxious','sacred','ethereal','nostalgic','threatening','desolate'],
  'Corps & états intérieurs': ['heartbeat','breath','pulse','breathing','gasp','sob','tinnitus','dizzy','nausea','trembling','pain'],
  'Guerre & violence': ['explosion','gunshot','artillery','bomb','fire','battle','march','soldiers','siren','alarm','impact','shockwave','rumble','distant','war'],
  'Musique & instruments': ['piano','violin','guitar','accordion','trumpet','cello','drums','orchestra','choir','flute','saxophone','bass','concerto','jazz','tuba','harp','organ','carillon','bells','melody','lullaby','requiem','waltz','march','folk','blues','strings','brass','percussion','classical'],
  'Sons diégétiques — lieux & mobilité': ['door','footstep','walk','car','airplane','boat','horse','stairs','elevator','window','lock','key','gate','bridge','motorcycle','bicycle','ship','wagon','running'],
  'Sons diégétiques — actions humaines': ['knock','slam','click','writing','typing','phone','clock','alarm','laugh','cry','scream','whisper','breath','cough','heartbeat','applause','crowd','voice','speech','drink','eat','pour','chew','swallow','fight','punch','fall','drag','snore','prayer'],
  'Sons diégétiques — objets & matières': ['glass','crash','gun','sword','hit','break','paper','metal','wood','splash','drop','rattle','creak','scratch','chain','rope','fire','candle','match','bell','bottle','knife','hammer','saw','clock','typewriter'],
  'Transitions & effets': ['whoosh','sweep','transition','riser','stinger','shockwave','snap','ping','beep','notification','surprising','boom','swoosh','sting','hit','drop'],
  'Science-fiction & fantastique': ['spaceship','scifi','laser','alien','magic','spell','portal','robot','electric','energy','futuristic','space','glitch','teleport','force','shield','scanner','computer'],
  'Animaux': ['dog','cat','horse','bird','wolf','crow','owl','rat','insects','fly','frog','whale','lion','animal'],
}

// ── Mots exclus d'office ─────────────────────────────────────────────────
// Attributs de sound design (UCS) sans valeur de VOCABULAIRE NARRATIF —
// utiles pour affiner une recherche ponctuelle, mais inutiles (voire
// trompeurs) dans un prompt qui doit guider des choix de scène.
// ÉDITABLE : ajoute/retire des mots ici si tu changes d'avis.
const STOPLIST = new Set([
  'short','long','soft','hard','fast','slow','medium','low','high','close','distant',
  'old','new','small','large','single','multiple','various','misc','designed','foley',
  'loop','object','objects','mechanism','movement','interface','user interface',
  'communications','human','creature','creatures','machine','machines','mechanical',
  'plastic','wood','vehicles','vehicle','musical','click','hit','impact','rattle',
  // NB : certains de ces mots (impact, click, hit...) sont peut-être trop bons pour
  // être exclus — je les ai mis ici par prudence car déjà représentés autrement
  // dans CURATED_VOCABULARY (transitions & effets). Vérifie et retire-les d'ici
  // si tu veux qu'ils remontent dans le tas "à trier".
])

// ── Normalisation pour la comparaison ────────────────────────────────────
function norm(w) {
  return w.trim().toLowerCase()
}

const knownWords = new Set()
Object.values(CURATED_VOCABULARY).forEach(list => {
  list.forEach(w => knownWords.add(norm(w)))
})

// ── Recalcul de la fréquence depuis soundq-keywords.json ────────────────
console.log('Lecture de soundq-keywords.json…')
const soundq = JSON.parse(fs.readFileSync(SOUNDQ_PATH, 'utf8'))
const frequency = {}
Object.values(soundq).forEach(keywords => {
  ;(keywords || []).forEach(k => {
    const n = norm(k)
    if (!n) return
    frequency[n] = (frequency[n] || 0) + 1
  })
})

// ── Répartition en 3 tas ──────────────────────────────────────────────────
// On ne regarde QUE les TOP_N mots les plus fréquents de toute la
// bibliothèque — le reste (la longue traîne, souvent très spécifique ou
// rare) est délibérément laissé de côté, il ne mérite pas une place dans
// un vocabulaire curé compact.
const topWords = Object.entries(frequency)
  .sort((a, b) => b[1] - a[1])
  .slice(0, TOP_N)

let alreadyKnown = 0
let excluded = 0
const toReview = []

topWords.forEach(([word, count]) => {
  if (knownWords.has(word)) { alreadyKnown++; return }
  if (STOPLIST.has(word)) { excluded++; return }
  // Ignore les mots à plus de 3 termes (probablement un résidu de phrase
  // mal découpée, pas un vrai mot-clé de vocabulaire)
  if (word.split(/\s+/).length > 3) return
  toReview.push({ word, count })
})

toReview.sort((a, b) => b.count - a.count)

// ── Écriture du CSV ────────────────────────────────────────────────────────
const lines = ['mot,frequence,categorie_suggestion (à remplir)']
toReview.forEach(({ word, count }) => {
  lines.push(`"${word}",${count},`)
})
fs.writeFileSync(OUTPUT_CSV, lines.join('\n'))

console.log('')
console.log('═══════════════════════════════════════════')
console.log(`Mots-clés uniques (fréq. ≥ ${MIN_FREQUENCY})  : ${Object.values(frequency).filter(c => c >= MIN_FREQUENCY).length}`)
console.log(`Déjà dans CURATED_VOCABULARY   : ${alreadyKnown}`)
console.log(`Exclus (liste STOPLIST)        : ${excluded}`)
console.log(`À trier manuellement           : ${toReview.length}`)
console.log(`Écrit dans : ${OUTPUT_CSV}`)
console.log('═══════════════════════════════════════════')

// Configuration des couleurs par catégorie
export const CATEGORY_COLORS = {
  'Ambiance': '#7EC8C8',
  'Musique': '#B59FD8',
  'SFX': '#F0A87E',
  'Dialogue': '#A8D4A8',
  'Autre': '#C8C8A8'
}

export const SOUND_BLOCK_COLORS = [
  '#D4A8A8', // rouge poudré
  '#D4BBA8', // saumon
  '#D4D0A8', // jaune ivoire
  '#B8D4A8', // vert tendre
  '#A8D4C8', // menthe glacée
  '#A8BDD4', // bleu ciel
  '#B8A8D4', // lavande
  '#D4A8C8', // rose poudré
]

// Options de filtres
export const FILTER_CATEGORIES = ['Ambiance', 'Musique', 'SFX', 'Dialogue', 'Autre']
export const FILTER_MOOD = ['Calme', 'Tension', 'Mélancolie', 'Joie', 'Mystère', 'Action']
export const FILTER_INTENSITY = ['Douce', 'Moyenne', 'Forte']

// Dimensions de la timeline
export const SEGMENT_HEIGHT = 40
export const COLUMN_COUNT = 6
export const COLUMN_WIDTH = 42
export const VFX_COLUMN_COUNT = 2
export const VFX_COLUMN_WIDTH = 48

// Structure par défaut d'un soundTrack
// Points d'automation de volume
export const AUTOMATION_FADE_STEPS = [
  { ms: 0,    label: 'Instantané',      curve: 'cut'       },
  { ms: 300,   label: 'Imperceptible',   curve: 'linear'    },
  { ms: 600,  label: 'Court',           curve: 'ease-out'  },
  { ms: 1500,  label: 'Naturel',         curve: 'sigmoid'   },
  { ms: 2500, label: 'Long',            curve: 'sigmoid'   },
  { ms: 5000, label: 'Scénique',        curve: 'cubic'     },
  { ms: 10000, label: 'Cinématique',     curve: 'log'       },
]

export const DEFAULT_SOUNDTRACK = {
  id: '',
  soundId: '',
  startSegmentId: '',
  endSegmentId: '',
  column: 0,
  volume: 0.5,
  fadeIn: 0,
  fadeOut: 0,
  delay: 0,
  loop: false,
  muted: false,
  pan: 0,
  panMode: 'static',
}

// Fonction utilitaire pour obtenir la couleur d'un son
export function getSoundColor(sound, soundLibrary) {
  if (!sound) return CATEGORY_COLORS['Autre']
  const categories = sound.categories || []
  for (const cat of categories) {
    if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat]
  }
  return CATEGORY_COLORS['Autre']
}

// Fonction pour générer un ID unique
export function generateSoundTrackId() {
  return `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Fonction pour convertir soundTracks en audioEvents (pour compatibilité ascendante)
export function convertSoundTracksToAudioEvents(soundTracks, segments) {
  const audioEvents = []
  
  soundTracks.forEach(track => {
    const startIdx = segments.findIndex(s => s.id === track.startSegmentId || s._id === track.startSegmentId)
    
    if (startIdx !== -1) {
      audioEvents.push({
        segmentIndex: startIdx,
        soundId: track.soundId,
        action: 'play',
        volume: track.volume || 0.5,
        loop: track.loop || false,
        delay: track.delay || 0,
        fadeIn: track.fadeIn || 0,
        fadeOut: track.fadeOut || 0,
        muted: track.muted || false,
        // Informations additionnelles pour la timeline
        column: track.column,
        startSegmentId: track.startSegmentId,
        endSegmentId: track.endSegmentId
      })
    }
  })
  
  // Trier par segment puis par colonne
  audioEvents.sort((a, b) => {
    if (a.segmentIndex !== b.segmentIndex) {
      return a.segmentIndex - b.segmentIndex
    }
    return (a.column || 0) - (b.column || 0)
  })
  
  return audioEvents
}

// Fonction pour créer un nouveau soundTrack
export function createSoundTrack(soundId, startSegmentId, endSegmentId, column = 0, overrides = {}) {
  return {
    ...DEFAULT_SOUNDTRACK,
    id: generateSoundTrackId(),
    soundId,
    startSegmentId,
    endSegmentId: endSegmentId || startSegmentId,
    column,
    ...overrides
  }
}

// ============================================================
// GAME MODE — Gamification
// ============================================================
export const GAME_TYPES = {
  image:   { label: '🖼  Image / Cinématique',  hasAnswer: false },
  message: { label: '💬  Message animé',         hasAnswer: false },
  code:    { label: '🔢  Code / Digicode',        hasAnswer: true  },
  riddle:  { label: '🧩  Énigme texte libre',     hasAnswer: true  },
  timer:   { label: '⏱  Minuteur',               hasAnswer: false },
}

// ============================================================
// VFX — Effets visuels
// ============================================================

export const VFX_TYPES = {
  shake:      { label: 'Tremblement',         modes: ['normal', 'intense'],            hasLoop: true,  hasColor: false, category: 'texte' },
  tremble:    { label: 'Tremblement continu', modes: ['lent', 'moyen', 'rapide'],      hasLoop: false, hasColor: false, category: 'texte' },
  typewriter: { label: 'Typewriter',          modes: ['lent', 'normal', 'rapide'],     hasLoop: false, hasColor: false, category: 'texte' },
  erased:     { label: 'Lettres effacées',    modes: ['faible', 'normal', 'intense'],  hasLoop: false, hasColor: false, category: 'texte' },
  glitch:     { label: 'Glitch',              modes: ['faible', 'normal', 'intense'],  hasLoop: false, hasColor: false, category: 'texte' },
  flicker:    { label: 'Flicker',             modes: [],                               hasLoop: false, hasColor: false, category: 'texte' },
  flash:      { label: 'Flash',               modes: ['lent', 'moyen', 'rapide'],      hasLoop: false, hasColor: true,  category: 'texte' },
  static:     { label: 'Parasites',           modes: ['léger', 'normal', 'intense'],   hasLoop: false, hasColor: false, category: 'texte' },
  // ── Effets d'ambiance (overlay plein écran) ──
  fog:        { label: 'Brouillard',          modes: ['léger', 'dense', 'épais'],         hasLoop: false, hasColor: false, category: 'ambiance' },
  fire:       { label: 'Feu / Flammes',       modes: ['bougie', 'brasier', 'inferno'],    hasLoop: false, hasColor: false, category: 'ambiance' },
  rain:       { label: 'Pluie',               modes: ['bruine', 'averse', 'tempête'],     hasLoop: false, hasColor: false, category: 'ambiance' },
  snow:       { label: 'Neige',               modes: ['légère', 'normale', 'blizzard'],   hasLoop: false, hasColor: false, category: 'ambiance' },
  underwater: { label: 'Sous-marin',          modes: ['surface', 'profond', 'abyssal'],   hasLoop: false, hasColor: false, category: 'ambiance' },
  sun:        { label: 'Soleil',              modes: ['aube', 'zénith', 'crépuscule'],    hasLoop: false, hasColor: false, category: 'ambiance' },
}

export const VFX_COLORS = {
  shake:      '#E8A87C',
  tremble:    '#E8A87C',
  typewriter: '#7CB9E8',
  erased:     '#B0B0B0',
  glitch:     '#C87CE8',
  flicker:    '#E8D87C',
  flash:      '#E87C7C',
  static:     '#A0A0A0',
  // ── Ambiance ──
  fog:        '#C8D8E8',
  fire:       '#E87C7C',
  rain:       '#7CA8C8',
  snow:       '#C8E0F0',
  underwater: '#5090B0',
  sun:        '#F0D080',
}

// Nombre de colonnes VFX (max 2 effets simultanés)
export const VFX_COLUMN_COUNT = 2
export const VFX_COLUMN_WIDTH = 48

export const DEFAULT_VFX_TRACK = {
  id: '',
  type: 'shake',
  mode: 'normal',
  loop: false,
  color: 'rgba(200, 0, 0, 0.12)',
  column: 0,
  startSegmentId: '',
  endSegmentId: '',
}

export function generateVfxTrackId() {
  return `vfx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createVfxTrack(type, startSegmentId, column = 0, overrides = {}) {
  const def = VFX_TYPES[type] || VFX_TYPES.shake
  return {
    ...DEFAULT_VFX_TRACK,
    id: generateVfxTrackId(),
    type,
    mode: def.modes[0] || '',
    startSegmentId,
    endSegmentId: startSegmentId,
    column,
    ...overrides,
  }
}

// Retourne la classe CSS à appliquer dans StoryReader
export function getVfxClass(track) {
  if (!track) return ''
  const { type, mode, loop } = track
  switch (type) {
    case 'shake':
      return loop
        ? `vfx-shake-${mode}-loop`
        : `vfx-shake-${mode}`
    case 'tremble': {
      const m = { lent: 'slow', moyen: 'medium', rapide: 'fast' }
      return `vfx-tremble-${m[mode] || 'medium'}`
    }
    case 'typewriter': return `vfx-typewriter-${mode}`
    case 'erased':     return `vfx-erased-${mode}`
    case 'glitch':     return `vfx-glitch-${mode}`
    
    case 'flicker':   return 'vfx-flicker'
    case 'flash': {
      const m = { lent: 'slow', moyen: 'medium', rapide: 'fast' }
      return `vfx-flash-${m[mode] || 'medium'}`
    }
  
    case 'static':    return '' // effet géré entièrement par JS, pas de classe CSS
    case 'fog':        return '' // effet géré par VfxOverlay, pas de classe CSS
    case 'fire':       return '' // effet géré par VfxOverlay, pas de classe CSS
    case 'rain':       return '' // effet géré par VfxOverlay, pas de classe CSS
    case 'snow':       return '' // effet géré par VfxOverlay, pas de classe CSS
    case 'underwater': return '' // effet géré par VfxOverlay, pas de classe CSS
    case 'sun':        return '' // effet géré par VfxOverlay, pas de classe CSS'' // effet géré par VfxOverlay, pas de classe CSS
    default:          return ''
  }
}

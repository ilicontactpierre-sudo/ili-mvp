// Configuration des couleurs par catégorie
export const CATEGORY_COLORS = {
  'Ambiance': '#7EC8C8',
  'Musique': '#B59FD8',
  'SFX': '#F0A87E',
  'Dialogue': '#A8D4A8',
  'Autre': '#C8C8A8'
}

// Options de filtres
export const FILTER_CATEGORIES = ['Ambiance', 'Musique', 'SFX', 'Dialogue', 'Autre']
export const FILTER_MOOD = ['Calme', 'Tension', 'Mélancolie', 'Joie', 'Mystère', 'Action']
export const FILTER_INTENSITY = ['Douce', 'Moyenne', 'Forte']

// Dimensions de la timeline
export const SEGMENT_HEIGHT = 40
export const COLUMN_COUNT = 6
export const COLUMN_WIDTH = 42 // Environ 2 fois plus serré (était 80)

// Structure par défaut d'un soundTrack
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
  shake:    { label: 'Tremblement',      modes: ['normal', 'intense'],       hasLoop: true,  hasColor: false },
  tremble:  { label: 'Tremblement continu', modes: ['lent', 'moyen', 'rapide'], hasLoop: false, hasColor: false },
  typewriter:{ label: 'Typewriter',      modes: ['lent', 'normal', 'rapide'], hasLoop: false, hasColor: false },
  erased:   { label: 'Lettres effacées', modes: ['faible', 'normal', 'intense'], hasLoop: false, hasColor: false },
  glitch:   { label: 'Glitch',           modes: ['faible', 'normal', 'intense'], hasLoop: false, hasColor: false },
  ink:      { label: 'Apparition encre', modes: ['lent', 'moyen', 'rapide'],  hasLoop: false, hasColor: false },
  flicker:  { label: 'Flicker',          modes: [],                           hasLoop: false, hasColor: false },
  flash:    { label: 'Flash',            modes: ['lent', 'moyen', 'rapide'],  hasLoop: false, hasColor: true  },
  vignette: { label: 'Vignette',         modes: [],                           hasLoop: false, hasColor: false },
  scanlines:{ label: 'Scanlines',        modes: ['lent', 'normal', 'rapide'], hasLoop: false, hasColor: false },
  static:   { label: 'Parasites',        modes: [],                           hasLoop: false, hasColor: false },
}

export const VFX_COLORS = {
  shake:     '#E8A87C',
  tremble:   '#E8A87C',
  typewriter:'#7CB9E8',
  erased:    '#B0B0B0',
  glitch:    '#C87CE8',
  ink:       '#7CE8C8',
  flicker:   '#E8D87C',
  flash:     '#E87C7C',
  vignette:  '#7C7C7C',
  scanlines: '#7C9CE8',
  static:    '#A0A0A0',
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
    case 'ink': {
      const m = { lent: 'slow', moyen: 'medium', rapide: 'fast' }
      return `vfx-ink-${m[mode] || 'medium'}`
    }
    case 'flicker':   return 'vfx-flicker'
    case 'flash': {
      const m = { lent: 'slow', moyen: 'medium', rapide: 'fast' }
      return `vfx-flash-${m[mode] || 'medium'}`
    }
    case 'vignette':  return 'vfx-vignette'
    case 'scanlines': {
      const m = { lent: 'slow', normal: 'normal', rapide: 'fast' }
      return `vfx-scanlines-${m[mode] || 'normal'}`
    }
    case 'static':    return 'vfx-static'
    default:          return ''
  }
}

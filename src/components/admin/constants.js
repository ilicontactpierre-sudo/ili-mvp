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
  muted: false
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
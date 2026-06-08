// src/utils/analytics.js

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Génère ou récupère un identifiant anonyme persistant par lecteur
function getReaderId() {
  try {
    let id = localStorage.getItem('ili_reader_id')
    if (!id) {
      id = 'anon_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem('ili_reader_id', id)
    }
    return id
  } catch {
    return 'anon_unknown'
  }
}

async function sendEvent(storyId, event, segmentIndex = null, totalSegments = null) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/reading_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        story_id: storyId,
        reader_id: getReaderId(),
        event,
        segment_index: segmentIndex,
        total_segments: totalSegments,
      }),
    })
  } catch {
    // On ne bloque jamais la lecture si l'analytics plante
  }
}

export function trackStart(storyId, totalSegments) {
  return sendEvent(storyId, 'start', 0, totalSegments)
}

export function trackProgress(storyId, segmentIndex, totalSegments) {
  // On n'envoie un event que tous les 25% pour ne pas surcharger
  const pct = segmentIndex / totalSegments
  const milestones = [0.25, 0.50, 0.75]
  const hit = milestones.find(m => {
    const mIndex = Math.floor(m * totalSegments)
    return segmentIndex === mIndex
  })
  if (!hit) return
  return sendEvent(storyId, `progress_${Math.round(hit * 100)}`, segmentIndex, totalSegments)
}

export function trackFinish(storyId, totalSegments) {
  return sendEvent(storyId, 'finish', totalSegments, totalSegments)
}

export function trackAbandon(storyId, segmentIndex, totalSegments) {
  if (segmentIndex === 0) return // pas compté si jamais avancé
  return sendEvent(storyId, 'abandon', segmentIndex, totalSegments)
}
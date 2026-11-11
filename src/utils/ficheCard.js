// Aide de la carte « Fiche de Claude », affichée à côté du panneau d'un bloc son.
export const FICHE_WIDTH = 300
const GAP = 12
const MARGIN = 12
const MIN_SIDE_WIDTH = 240

const hasText = (v) => typeof v === 'string' && v.trim() !== ''

export function hasOrchestrationFiche(track) {
  if (!track) return false
  const hasQueries = Array.isArray(track._orchestrationSearch) && track._orchestrationSearch.some(hasText)
  return hasText(track._orchestrationBrief) || hasQueries || hasText(track._orchestrationAlt) || hasText(track._orchestrationReprise)
}

// À gauche du panneau si la place suffit ; sinon la carte s'ouvre en surimpression, sur demande.
export function computeFichePlacement({ panelLeft, viewportWidth }) {
  const available = panelLeft - GAP - MARGIN
  if (!(available >= MIN_SIDE_WIDTH)) {
    return { mode: 'overlay', width: Math.max(220, Math.min(FICHE_WIDTH + 20, viewportWidth - 2 * MARGIN)) }
  }
  return { mode: 'side', width: Math.min(FICHE_WIDTH, available), right: viewportWidth - panelLeft + GAP }
}

export function webSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(String(query || '').trim())}`
}

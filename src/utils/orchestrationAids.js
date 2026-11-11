// Fiches d'aide à la recherche de sons (brief, requêtes, alternative, reprise).
// Elles servent à l'auteur dans l'admin ; elles ne sont PAS publiées :
// elles alourdiraient le fichier téléchargé par chaque lecteur.
export const ORCHESTRATION_AID_KEYS = [
  '_orchestrationBrief',
  '_orchestrationSearch',
  '_orchestrationAlt',
  '_orchestrationReprise',
]

// Renvoie de nouveaux blocs, sans les fiches d'aide. Ne modifie pas la liste d'origine.
export function stripOrchestrationAids(tracks) {
  if (!Array.isArray(tracks)) return []
  return tracks.map((track) => {
    if (!track || typeof track !== 'object') return track
    const copy = { ...track }
    ORCHESTRATION_AID_KEYS.forEach((key) => {
      delete copy[key]
    })
    return copy
  })
}

// Lit les champs d'aide dans un bloc proposé par l'IA (format souple, jamais bloquant).
export function readOrchestrationAids(block) {
  const text = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)
  let search = null
  if (Array.isArray(block?.search)) {
    const list = block.search.filter((s) => typeof s === 'string' && s.trim() !== '').map((s) => s.trim()).slice(0, 5)
    search = list.length > 0 ? list : null
  } else if (typeof block?.search === 'string' && block.search.trim() !== '') {
    search = [block.search.trim()]
  }
  return {
    _orchestrationBrief: text(block?.brief),
    _orchestrationSearch: search,
    _orchestrationAlt: text(block?.alt),
    _orchestrationReprise: text(block?.reprise),
  }
}

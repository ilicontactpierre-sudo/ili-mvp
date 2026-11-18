// « Moins d'effets » : réglage du lecteur (lot « invisible », étape 4, décision de Pierre du 18/11/2026).
//
// Pour un lecteur sensible ou fatigué. Seulement cet interrupteur d'ILi : le réglage
// « Réduire les animations » du téléphone n'est PAS suivi (des gens l'activent pour d'autres
// raisons et doivent pouvoir vivre ILi pleinement).
//
// Quand il est allumé, une classe sur <html> suffit (styles/vfx.css) :
//   - secousses et clignotements retirés : secousse, tremblement, glitch, scintillement,
//     flash plein écran, parasites ; fonctions du texte pulsation, tremblement, glitch ;
//   - ambiances (brouillard, feu, pluie, neige, sous l'eau, soleil) atténuées, pas figées ;
//   - inchangés : apparitions du texte, mise en forme, défilement des segments.
export const MOINS_EFFETS_KEY = 'ili_moins_effets'
export const MOINS_EFFETS_CLASS = 'ili-moins-effets'

export function loadMoinsEffets() {
  try { return localStorage.getItem(MOINS_EFFETS_KEY) === 'true' } catch { return false }
}

export function saveMoinsEffets(on) {
  try { localStorage.setItem(MOINS_EFFETS_KEY, String(!!on)) } catch { /* stockage indisponible */ }
}

export function applyMoinsEffets(on, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return
  root.classList.toggle(MOINS_EFFETS_CLASS, !!on)
}

export function isMoinsEffets(root = typeof document !== 'undefined' ? document.documentElement : null) {
  return !!root && root.classList.contains(MOINS_EFFETS_CLASS)
}

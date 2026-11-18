// Clavier sur l'écran titre (lot « invisible », étape 2).
//
// Les boutons réagissent au doigt levé (onPointerUp). Au clavier (Entrée, Espace) ou avec un
// lecteur d'écran, le navigateur envoie un « click » dont `detail` vaut 0 : c'est le seul
// click qu'on écoute, pour ne jamais lancer deux fois l'action après un toucher ou un clic
// de souris (detail ≥ 1, déjà traité par onPointerUp).
export function keyboardClick(action) {
  return (event) => {
    if (event.detail !== 0) return
    event.stopPropagation()
    action()
  }
}

const INTERACTIVE = 'a, button, input, textarea, select, summary, [role="button"], [contenteditable="true"]'

// Entrée ou Espace sur l'écran titre « Touche pour commencer » (aucun bouton à viser).
// Ignore les touches répétées, les raccourcis (Cmd, Ctrl, Alt) et les touches tapées
// dans un élément qui a déjà son propre comportement (bouton, lien, champ).
export function isStartKey(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return false
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return false
  const target = event.target
  if (target && typeof target.closest === 'function' && target.closest(INTERACTIVE)) return false
  return true
}

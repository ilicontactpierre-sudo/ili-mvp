// Marges de sécurité (encoche de l'iPhone, barre d'état, caméra des Android en plein écran).
// La page passe sous la barre d'état (viewport-fit=cover, black-translucent dans index.html) :
// un élément collé au bord doit ajouter la marge que le téléphone donne pour ce côté.
// Sans encoche (ordinateur, Android dans Chrome), env(...) vaut 0 : position inchangée.
const SIDES = ['top', 'right', 'bottom', 'left']

export function safeInset(side, base) {
  if (!SIDES.includes(side)) throw new Error(`safeInset : côté inconnu « ${side} »`)
  return `calc(${base} + env(safe-area-inset-${side}, 0px))`
}

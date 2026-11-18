// Zone de l'écran du lecteur qui ramène au segment précédent.
// Un toucher (ou un clic) à moins de 25 % de la largeur, côté gauche, revient en arrière ;
// partout ailleurs, il fait avancer. (40 % jusqu'au 18/11/2026 : décision de Pierre.)
export const BACK_ZONE_RATIO = 0.25

export function isBackTap(x, width) {
  return x / width < BACK_ZONE_RATIO
}

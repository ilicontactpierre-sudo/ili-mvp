// Sons d'interface (clic du logo, clic des réglages, whooshes) par Howler.
//
// POURQUOI : `new Audio()` ignore le volume réglé en code sur iPhone (toujours au maximum :
// le clic des réglages y était ~10 fois trop fort). Howler, en Web Audio, respecte le volume
// partout. Jamais `html5: true` (mode qui perd la stéréo et retombe sur le même défaut).
//
// Chaque son est créé seulement au premier besoin (prepare ou play) : rien n'est téléchargé
// avant, et le module se charge sans navigateur (tests). Une erreur ne casse jamais l'interface.
import { Howl } from 'howler'

export function createUiSound(src, volume, makeHowl = (options) => new Howl(options)) {
  let howl = null
  const get = () => {
    if (!howl) howl = makeHowl({ src: [src], volume, preload: true, html5: false })
    return howl
  }
  return {
    // Télécharge le son à l'avance (sans le jouer)
    prepare() {
      try { get() } catch { /* son indisponible : on continue sans */ }
    },
    // Rejoue depuis le début (comme `currentTime = 0` puis `play()` avant)
    play() {
      try {
        const h = get()
        h.stop()
        h.play()
      } catch { /* son indisponible : on continue sans */ }
    },
  }
}

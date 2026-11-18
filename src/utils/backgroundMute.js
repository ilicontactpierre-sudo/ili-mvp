// Son coupé quand l'app passe en arrière-plan (lot « invisible », étape 6).
//
// Quand la page est cachée (écran d'accueil du téléphone, écran verrouillé, autre onglet),
// on coupe TOUT le son d'un coup, et on le remet au retour. Les sons continuent en silence :
// l'histoire reste synchronisée (fondus, boucles, automations), rien n'est mis en pause.
//
// Howler.mute agit sur le volume principal (Web Audio) : il couvre aussi les sons qui
// démarrent pendant la coupure (boucle relancée, son arrivé en retard). AudioEngine.js
// n'est pas touché.
import { Howler } from 'howler'

export function watchBackgroundMute({ doc = document, howler = Howler } = {}) {
  let muted = false
  const apply = () => {
    const hidden = !!doc.hidden
    if (hidden === muted) return
    muted = hidden
    howler.mute(hidden)
  }
  apply()
  doc.addEventListener('visibilitychange', apply)
  return () => {
    doc.removeEventListener('visibilitychange', apply)
    if (muted) howler.mute(false)
    muted = false
  }
}

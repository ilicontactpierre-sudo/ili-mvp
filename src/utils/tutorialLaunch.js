// Entrée animée dans le tutoriel (maquette v2 validée par Pierre le 21/11/2026) :
// réglages de temps (ms) et whoosh, partagés par TutorialLaunch et HomePage.
import { createUiSound } from './uiSounds.js'

// Même whoosh que la sortie de l'écran « écoute » du tutoriel (Howler, volume des whooshes du menu)
export const LAUNCH_WHOOSH = createUiSound('/sounds/Whoosh-3.mp3', 0.15)

// Le cadre occupe 48,5 % de la boîte de l'icône : 208 px de boîte = cadre de ~100 px au centre
export const LAUNCH_TARGET_BOX = 208

// accueil : l'icône glisse au centre ; liste : elle s'envole en courbe (deux courbes différentes)
export const LAUNCH_TIMING = {
  accueil: {
    move: 1100, moveDelay: 150,
    easeX: 'cubic-bezier(0.83, 0, 0.17, 1)', easeY: 'cubic-bezier(0.83, 0, 0.17, 1)',
    snake: 420, word: 1150, bar: 1100, whoosh: 380, end: 1750,
  },
  liste: {
    move: 1000, moveDelay: 120,
    easeX: 'cubic-bezier(0.3, 0, 0.12, 1)', easeY: 'cubic-bezier(0.7, 0, 0.3, 1)',
    snake: 820, word: 1500, bar: 1450, whoosh: 120, end: 2100,
  },
}

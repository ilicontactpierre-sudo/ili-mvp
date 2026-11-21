// Entrée animée dans le tutoriel (étape 5, 21/11/2026, maquette v2 validée par Pierre).
// Rendu serveur + gardes qui lisent le code : les mouvements se jugent sur le Pixel.
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import TutorialIcon from './TutorialIcon.jsx'
import TutorialLaunch from './TutorialLaunch.jsx'
import { LAUNCH_TIMING, LAUNCH_TARGET_BOX } from '../utils/tutorialLaunch.js'

const lire = (c) => readFileSync(new URL(c, import.meta.url), 'utf8')
const home = lire('../pages/HomePage.jsx')
const liste = lire('./StoryMenu.jsx')
const tuto = lire('../pages/TutorialPage.jsx')
const lanceur = lire('./TutorialLaunch.jsx')

describe('icône du tutoriel en dessin vectoriel', () => {
  const html = renderToString(<TutorialIcon />)
  it('cadre en deux moitiés (ouvertures en haut et en bas), mot, trait, couleur du thème', () => {
    expect(html.split('pathLength="100"').length - 1).toBe(2)
    expect(html).toContain('d="M635 237.5 H374.5')   // part de l'ouverture du haut
    expect(html).toContain('H380"')                   // finit à l'ouverture du bas
    expect(html).toContain('d="M412 744.5 H671.5')
    expect(html).toContain('>TUTORIEL</text>')
    expect(html).toContain('stroke="currentColor"')
    expect(html).toContain('aria-hidden="true"')
  })
  it('remplace l’image partout (accueil et liste)', () => {
    for (const src of [home, liste]) {
      expect(src).not.toContain('tutoriel-icon.png')
      expect(src).toContain('<TutorialIcon />')
      expect(src).not.toContain('useIsLightTheme')
    }
    expect(home).toContain("color: 'var(--color-text-focus)',")
    expect(liste).toContain("color: 'var(--color-text-focus)',")
  })
})

describe('envol de l’icône', () => {
  it('temps de la maquette v2 (accueil / liste)', () => {
    expect(LAUNCH_TIMING.accueil).toMatchObject({ move: 1100, moveDelay: 150, snake: 420, word: 1150, bar: 1100, whoosh: 380, end: 1750 })
    expect(LAUNCH_TIMING.liste).toMatchObject({ move: 1000, moveDelay: 120, snake: 820, word: 1500, bar: 1450, whoosh: 120, end: 2100 })
    expect(LAUNCH_TIMING.liste.easeX).not.toBe(LAUNCH_TIMING.liste.easeY) // envol en courbe
    expect(LAUNCH_TARGET_BOX).toBe(208)
  })
  it('serpent des deux côtés, mot qui s’évapore, trait qui se replie', () => {
    expect(lanceur).toContain('.tl-go .ti-trace-a { stroke-dashoffset: -100; }')
    expect(lanceur).toContain('.tl-go .ti-trace-b { stroke-dashoffset: 100; }')
    expect(lanceur).toContain('stroke-dashoffset 1100ms cubic-bezier(0.65, 0, 0.35, 1) ${ms(T.snake)}')
    expect(lanceur).toContain('.tl-go .ti-mot { opacity: 0; letter-spacing: 40px;')
    expect(lanceur).toContain('.tl-go .ti-barre { transform: scaleX(0);')
  })
  it('départ peint avant de bouger ; whoosh et fin aux temps prévus ; ne repart pas si la page se redessine', () => {
    globalThis.window ??= { innerWidth: 390, innerHeight: 844 } // rendu serveur : taille d'écran simulée
    const html = renderToString(<TutorialLaunch from={{ left: 10, top: 10, width: 40, height: 40, opacity: 0.65 }} variant="liste" />)
    expect(html).toContain('class="tl-launch"')
    expect(html).not.toContain('class="tl-launch tl-go"')
    expect(lanceur).toContain('const tWhoosh = setTimeout(() => LAUNCH_WHOOSH.play(), T.whoosh)')
    expect(lanceur).toContain('const tEnd = setTimeout(() => doneRef.current?.(), T.end)')
    expect(lanceur).toContain('  }, [T])')
  })
})

describe('accueil et liste branchés', () => {
  it('le toucher lance l’envol ; à la fin, tutoriel avec arrivée', () => {
    expect(home).toContain("startLaunch('accueil', e.currentTarget)")
    expect(home).toContain("onTutorial={(target) => startLaunch('liste', target)}")
    expect(liste).toContain('if (onTutorial) onTutorial(e.currentTarget)')
    expect(home).toContain("navigate('/tutoriel', { state: { fromIcon: true } })")
    expect(home).toContain("if (!r.width) { navigate('/tutoriel'); return }")
    expect(home).toContain('{launch && <TutorialLaunch from={launch.from} variant={launch.variant} onDone={handleLaunchDone} />}')
    expect(home).toContain('useEffect(() => { LAUNCH_WHOOSH.prepare() }, [])')
  })
  it('le reste de l’écran s’efface en fondu flou, la liste rangée par rangée', () => {
    expect(home).toContain("${launch ? ` hp-launch hp-launch--${launch.variant}` : ''}")
    expect(home).toContain('.hp-launch .logo-container > .hp-tuto { opacity: 0 !important; transition: none !important; }')
    expect(home).toContain('animation: hp-sortie-carte 650ms cubic-bezier(0.65, 0, 0.35, 1) calc(100ms + var(--delay, 0ms)) both !important;')
    expect(home).toContain('.hp-launch .sm-tuto-btn { opacity: 0 !important;')
  })
})

describe('arrivée dans le tutoriel', () => {
  it('seulement par l’icône, une seule fois, sur le premier écran', () => {
    expect(tuto).toContain('const [arrivee, setArrivee] = useState(() => Boolean(location.state?.fromIcon))')
    expect(tuto).toContain("className={arrivee && screenIndex === 0 ? 'tut-arrivee' : undefined}")
    expect(tuto).toContain('        setTransitioning(false)\n        setArrivee(false)\n')
  })
  it('les traits poussent, le reste monte, sans écraser les opacités de l’écran', () => {
    expect(tuto).toContain('@keyframes tut-a-trait { from { transform: translateX(-50%) scaleY(0); } }')
    expect(tuto).toContain('@keyframes tut-a-monte { from { opacity: 0; transform: translateY(14px); } }')
    for (const c of ['tut-a-trait-haut', 'tut-a-trait-bas', 'tut-a-points', 'tut-a-consigne', 'tut-a-fleche-g', 'tut-a-fleche-d', 'tut-a-croix']) {
      expect(tuto.split(`className="${c}"`).length - 1, c).toBe(1)
      expect(tuto, c).toContain(`.tut-arrivee .${c} {`)
    }
  })
})

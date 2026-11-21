// Entrée dans le tutoriel (maquette v2 validée par Pierre le 21/11/2026).
// Au toucher de l'icône : elle s'enfonce, glisse au centre en grandissant (depuis la liste :
// en courbe, l'horizontale et la verticale n'ont pas la même courbe de Bézier), son contour
// s'efface en serpent, le mot s'évapore, le trait se replie ; puis onDone (navigation).
// Le reste de l'écran s'efface de son côté (classe hp-launch posée par HomePage).
// Un voile transparent bloque les touchers pendant l'animation.
import { useEffect, useRef, useState } from 'react'
import TutorialIcon from './TutorialIcon.jsx'
import { LAUNCH_WHOOSH, LAUNCH_TIMING, LAUNCH_TARGET_BOX } from '../utils/tutorialLaunch.js'

export default function TutorialLaunch({ from, variant = 'accueil', onDone }) {
  const T = LAUNCH_TIMING[variant] ?? LAUNCH_TIMING.accueil
  const [go, setGo] = useState(false)
  // onDone lu au dernier moment : l'animation ne repart pas si la page se redessine
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone })

  useEffect(() => {
    let raf2 = 0
    // deux images : la position de départ est peinte avant de lancer les transitions
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setGo(true)) })
    const tWhoosh = setTimeout(() => LAUNCH_WHOOSH.play(), T.whoosh)
    const tEnd = setTimeout(() => doneRef.current?.(), T.end)
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); clearTimeout(tWhoosh); clearTimeout(tEnd) }
  }, [T])

  const size = from.width
  const cx = from.left + from.width / 2
  const cy = from.top + from.height / 2
  const dx = window.innerWidth / 2 - cx
  const dy = window.innerHeight / 2 - cy
  const scale = LAUNCH_TARGET_BOX / size
  const ms = (d) => `${d}ms`

  return (
    <div
      aria-hidden="true"
      className={`tl-launch${go ? ' tl-go' : ''}`}
      style={{ position: 'fixed', inset: 0, zIndex: 10050 }}
    >
      <style>{`
        @keyframes tl-presse { 0% { transform: scale(1); } 35% { transform: scale(0.93); } 100% { transform: scale(1); } }
        .tl-launch .ti-trace { stroke-dasharray: 100 100; stroke-dashoffset: 0; }
        .tl-go .ti-trace { transition: stroke-dashoffset 1100ms cubic-bezier(0.65, 0, 0.35, 1) ${ms(T.snake)}; }
        .tl-go .ti-trace-a { stroke-dashoffset: -100; }
        .tl-go .ti-trace-b { stroke-dashoffset: 100; }
        .tl-launch .ti-mot { opacity: 1; letter-spacing: 15px; }
        .tl-go .ti-mot { opacity: 0; letter-spacing: 40px; transition: opacity 600ms cubic-bezier(0.65, 0, 0.35, 1) ${ms(T.word)}, letter-spacing 900ms cubic-bezier(0.16, 1, 0.3, 1) ${ms(T.word)}; }
        .tl-launch .ti-barre { transform: scaleX(1); transform-origin: 515.5px 580px; }
        .tl-go .ti-barre { transform: scaleX(0); transition: transform 600ms cubic-bezier(0.65, 0, 0.35, 1) ${ms(T.bar)}; }
        .tl-go .tl-presse { animation: tl-presse 300ms cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
      <div style={{
        position: 'fixed',
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        color: 'var(--color-text-focus)',
        opacity: go ? 0.95 : from.opacity,
        transition: `opacity 500ms ease ${ms(T.moveDelay)}`,
      }}>
        <div style={{ width: '100%', height: '100%', transform: go ? `translateX(${dx}px)` : 'none', transition: `transform ${ms(T.move)} ${T.easeX} ${ms(T.moveDelay)}` }}>
          <div style={{ width: '100%', height: '100%', transform: go ? `translateY(${dy}px)` : 'none', transition: `transform ${ms(T.move)} ${T.easeY} ${ms(T.moveDelay)}` }}>
            <div style={{ width: '100%', height: '100%', transform: go ? `scale(${scale})` : 'none', transition: `transform ${ms(T.move)} cubic-bezier(0.83, 0, 0.17, 1) ${ms(T.moveDelay)}` }}>
              <div className="tl-presse" style={{ width: '100%', height: '100%' }}>
                <TutorialIcon />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

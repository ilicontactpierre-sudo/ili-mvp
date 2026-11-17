// Écran titre d'une histoire : aperçu de reprise sans balises, et histoire terminée.
// Rendu serveur (renderToString) : les effets ne tournent pas, aucun son n'est chargé.
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import StartScreen from './StartScreen.jsx'

const segments = [
  { id: 'a', text: 'Début de l’histoire.' },
  { id: 'b', text: '</couleur:#fff0c7|Il est l’heure de partir./>' },
  { id: 'c', text: '</chiffres_up:0;78/>€. Les deux regardent la note.' },
  { id: 'd', text: '</apparition:5300;normal|À suivre…/>' },
]

const render = (savedProgress) => renderToString(
  <StartScreen
    title="Titre test"
    author="Auteur test"
    segmentCount={segments.length}
    segments={segments}
    savedProgress={savedProgress}
    onStart={() => {}}
  />
)

describe('StartScreen — reprise', () => {
  it('aperçu sans aucune balise de texte enrichi', () => {
    const html = render({ segmentIndex: 2, finished: false })
    expect(html).toContain('78€. Les deux regardent la note.')
    expect(html).toContain('Il est l’heure de partir.')
    expect(html).not.toContain('chiffres_up')
    expect(html).not.toContain('couleur:')
    expect(html).not.toMatch(/&lt;\//)
  })

  it('histoire en cours : Continuer et Recommencer', () => {
    const html = render({ segmentIndex: 2, finished: false })
    expect(html).toContain('Continuer')
    expect(html).toContain('Recommencer')
    expect(html).not.toContain('Relire depuis le début')
    expect(html).toContain('Tu as déjà lu')
  })

  it('ancienne sauvegarde sans le champ « finished » : traitée comme en cours', () => {
    const html = render({ segmentIndex: 2 })
    expect(html).toContain('Continuer')
    expect(html).not.toContain('Relire depuis le début')
  })
})

describe('StartScreen — histoire terminée', () => {
  it('propose de relire, pas de continuer vers la dernière ligne', () => {
    const html = render({ segmentIndex: 3, finished: true })
    expect(html).toContain('Relire depuis le début')
    expect(html).toContain('Lu jusqu’au bout ✓')
    expect(html).not.toContain('Continuer')
    expect(html).not.toContain('Recommencer')
    expect(html).not.toContain('Tu as déjà lu')
  })

  it('aucun aperçu de texte (ni la dernière ligne, ni la balise)', () => {
    const html = render({ segmentIndex: 3, finished: true })
    expect(html).not.toContain('À suivre')
    expect(html).not.toContain('apparition')
    expect(html).not.toContain('Les deux regardent')
  })
})

describe('StartScreen — première lecture', () => {
  it('pas de bouton de reprise', () => {
    const html = render(null)
    expect(html).not.toContain('Continuer')
    expect(html).not.toContain('Relire depuis le début')
  })
})

describe('Garde : menu des chapitres sans balises', () => {
  it('ReaderSettings affiche le texte nettoyé', () => {
    const src = readFileSync(new URL('./ReaderSettings.jsx', import.meta.url), 'utf8')
    expect(src).toContain("truncatePlain(item.text ?? '', 60)")
    expect(src).not.toContain('item.text?.slice(0, 60)')
  })
})

describe('StartScreen — indice si le lecteur ne fait rien', () => {
  it('histoire jamais lue : trait prêt sous le titre, mot présent mais encore invisible', () => {
    const html = render(null)
    expect(html).toContain('Touche pour commencer')
    expect(html).toMatch(/<span aria-hidden="true" class="ss-hint-line"><\/span>/)
    expect(html).not.toMatch(/class="[^"]*ss-hint-line--on/)
    expect(html).not.toMatch(/class="ss-hint-blur"/)
    // le mot n'apparaît qu'à la fin de la séquence
    expect(html).toMatch(/opacity:0[^"]*"[^>]*>Touche pour commencer/)
  })

  it('histoire en cours ou terminée : pas d\'indice', () => {
    for (const saved of [{ segmentIndex: 2 }, { segmentIndex: 3, finished: true }]) {
      const html = render(saved)
      expect(html).not.toContain('Touche pour commencer')
      expect(html).not.toMatch(/class="[^"]*ss-hint-line/)
    }
  })

  it('démarrage automatique : pas d\'indice', () => {
    const html = renderToString(
      <StartScreen title="T" author="A" segmentCount={1} segments={segments} savedProgress={null} onStart={() => {}} autoStart />
    )
    expect(html).not.toContain('Touche pour commencer')
  })
})

describe('Garde : blanc cassé du thème sombre', () => {
  it('global.css et ReaderSettings utilisent #f0ede8 pour le texte du thème sombre', () => {
    const css = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8')
    expect(css).toContain('--color-text-focus: #f0ede8;')
    const rs = readFileSync(new URL('./ReaderSettings.jsx', import.meta.url), 'utf8')
    expect(rs).toContain("root.style.setProperty('--color-bg', '#080809')\n      root.style.setProperty('--color-text-focus', '#f0ede8')")
  })
})

describe('Garde : rythme de l\'indice de l\'écran titre', () => {
  it('trait (0,8 s) → flou (4,7 s) → mot (8,1 s), comme l\'accueil', () => {
    const src = readFileSync(new URL('./StartScreen.jsx', import.meta.url), 'utf8')
    expect(src).toContain('setHintStage(s => Math.max(s, 1)), 800)')
    expect(src).toContain('setHintStage(s => Math.max(s, 2)), 4700)')
    expect(src).toContain('setHintStage(3), 8100)')
  })
})

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

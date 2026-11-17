// Écran de fin (rendu serveur : les effets et les animations ne tournent pas).
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { MemoryRouter } from 'react-router-dom'
import EndScreen from './EndScreen.jsx'

const render = (props = {}) => renderToString(
  <MemoryRouter><EndScreen title="Titre test" author="Auteur test" {...props} /></MemoryRouter>
)

describe('EndScreen — contenu', () => {
  it('plus de « Fin de l\'histoire » ni de séparateur « Soutenir ILi »', () => {
    const html = render()
    expect(html).not.toContain('Fin de l')
    expect(html).not.toContain('Soutenir ILi')
  })

  it('garde le titre, l\'auteur, « Soutenir », le retour et la signature', () => {
    const html = render()
    expect(html).toContain('Titre test')
    expect(html).toContain('Auteur test')
    expect(html).toContain('Soutenir')
    expect(html).toContain('Choisir une autre histoire')
    expect(html).toMatch(/>ILi<\/span><\/div><\/main>/)
  })

  it('tutoiement', () => {
    const html = render()
    expect(html).toContain('ton@email.com')
    expect(html).not.toMatch(/votre|vous/i)
  })

  it('partie suivante d\'une série : bouton présent', () => {
    const html = render({ nextPart: { title: 'Partie 2' }, onNextPart: () => {} })
    expect(html).toContain('Partie 2')
  })
})

describe('EndScreen — gardes (animations et retour)', () => {
  const src = readFileSync(new URL('./EndScreen.jsx', import.meta.url), 'utf8')

  it('chaque élément arrive l\'un après l\'autre, du flou au net', () => {
    expect(src).toContain('filter: blur(6px)')
    expect(src).toContain('animation: part2Anim(0)')
    expect(src).toContain('animation: part2Anim(250)')
    expect(src).toContain('animation: part2Anim(500)')
    expect(src).toContain('animation: part2Anim(750)')
  })

  it('« ILi » en bas de page, mesuré pour le vol vers l\'accueil', () => {
    expect(src).toContain("marginTop: 'auto'")
    expect(src).toContain('ref={signatureRef}')
    expect(src).toContain("navigate('/', { state: { fromEnd: true, logoFrom } })")
  })

  it('au départ, le reste s\'efface mais pas « ILi »', () => {
    expect(src.match(/opacity: leaving \? 0 : 1,/g)?.length).toBe(2)
  })
})

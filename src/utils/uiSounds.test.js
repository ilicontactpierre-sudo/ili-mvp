import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createUiSound } from './uiSounds.js'

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8')

function fausseFabrique() {
  const crees = []
  const make = vi.fn((options) => {
    const h = { options, appels: [], stop: vi.fn(() => h.appels.push('stop')), play: vi.fn(() => h.appels.push('play')) }
    crees.push(h)
    return h
  })
  return { make, crees }
}

describe('createUiSound', () => {
  it('ne télécharge rien avant le premier besoin', () => {
    const { make } = fausseFabrique()
    createUiSound('/sounds/x.mp3', 0.3, make)
    expect(make).not.toHaveBeenCalled()
  })

  it('crée le son une seule fois, en Web Audio (jamais html5), au bon volume', () => {
    const { make, crees } = fausseFabrique()
    const s = createUiSound('/sounds/Clic-Settings.mp3', 0.1, make)
    s.prepare(); s.prepare(); s.play(); s.play()
    expect(make).toHaveBeenCalledTimes(1)
    expect(crees[0].options).toEqual({ src: ['/sounds/Clic-Settings.mp3'], volume: 0.1, preload: true, html5: false })
  })

  it('rejoue depuis le début : stop puis play, à chaque fois', () => {
    const { make, crees } = fausseFabrique()
    const s = createUiSound('/sounds/x.mp3', 0.6, make)
    s.play(); s.play()
    expect(crees[0].appels).toEqual(['stop', 'play', 'stop', 'play'])
  })

  it('prepare ne joue rien', () => {
    const { make, crees } = fausseFabrique()
    createUiSound('/sounds/x.mp3', 0.6, make).prepare()
    expect(crees[0].appels).toEqual([])
  })

  it('une erreur de son ne casse jamais l’interface', () => {
    const casse = createUiSound('/sounds/x.mp3', 0.6, () => { throw new Error('pas de son') })
    expect(() => casse.prepare()).not.toThrow()
    expect(() => casse.play()).not.toThrow()
    const h = { stop: () => {}, play: () => { throw new Error('bloqué') } }
    expect(() => createUiSound('/sounds/x.mp3', 0.6, () => h).play()).not.toThrow()
  })
})

describe('sons d’interface : branchements', () => {
  it('App.jsx : les deux clics passent par Howler, mêmes fichiers et mêmes volumes', () => {
    const src = lire('../App.jsx')
    expect(src).not.toContain('new Audio(')
    expect(src).toContain("const clicILi = createUiSound('/sounds/Clic ILi.mp3', 0.6)")
    expect(src).toContain("const clicSettings = createUiSound('/sounds/Clic-Settings.mp3', 0.1)")
    expect(src).toContain('export function playClicILi() {\n  clicILi.play()\n}')
    expect(src).toContain('export function playClicSettings() {\n  clicSettings.play()\n}')
    expect(src).toContain('    clicILi.prepare()\n    clicSettings.prepare()\n  }, [])')
  })

  it('réglages : les 6 whooshes passent par Howler, au même volume, préparés à l’ouverture du menu', () => {
    const src = lire('../components/ReaderSettings.jsx')
    expect(src).not.toContain('new Audio(')
    expect(src).toContain('const WHOOSHES = [1, 2, 3, 4, 5, 6].map(n => createUiSound(`/sounds/Whoosh-${n}.mp3`, 0.15))')
    expect(src).toContain('    WHOOSHES[next].play()')
    expect(src).toContain('    if (isOpen) WHOOSHES.forEach(w => w.prepare())\n  }, [isOpen])')
    // le tirage au sort sans répétition est gardé tel quel
    expect(src).toContain('const WHOOSH_COUNT = 6')
    expect(src).toContain('while (next === lastWhooshRef.current)')
  })

  it('les fichiers de sons existent', () => {
    for (const f of ['Clic ILi.mp3', 'Clic-Settings.mp3', 'Whoosh-1.mp3', 'Whoosh-6.mp3']) {
      expect(() => readFileSync(new URL(`../../public/sounds/${f}`, import.meta.url))).not.toThrow()
    }
  })

  it('le son du tutoriel reste tel quel (décision du 18/11/2026)', () => {
    expect(lire('../pages/TutorialPage.jsx')).toContain("const audio = new Audio('/sounds/tutoriel-casque.mp3')")
  })
})

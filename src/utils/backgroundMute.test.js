import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { watchBackgroundMute } from './backgroundMute.js'

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8')

function fauxDoc(hidden = false) {
  const ecoutes = new Set()
  return {
    hidden,
    addEventListener: (type, f) => { if (type === 'visibilitychange') ecoutes.add(f) },
    removeEventListener: (type, f) => { if (type === 'visibilitychange') ecoutes.delete(f) },
    changer(h) { this.hidden = h; ecoutes.forEach(f => f()) },
    ecoutes,
  }
}

describe('son coupé en arrière-plan', () => {
  it('page visible au départ : ne touche à rien', () => {
    const doc = fauxDoc(false), howler = { mute: vi.fn() }
    watchBackgroundMute({ doc, howler })
    expect(howler.mute).not.toHaveBeenCalled()
  })

  it('coupe en partant, remet au retour', () => {
    const doc = fauxDoc(false), howler = { mute: vi.fn() }
    watchBackgroundMute({ doc, howler })
    doc.changer(true)
    expect(howler.mute).toHaveBeenLastCalledWith(true)
    doc.changer(false)
    expect(howler.mute).toHaveBeenLastCalledWith(false)
    expect(howler.mute).toHaveBeenCalledTimes(2)
  })

  it('plusieurs aller-retours de suite', () => {
    const doc = fauxDoc(false), howler = { mute: vi.fn() }
    watchBackgroundMute({ doc, howler })
    for (let i = 0; i < 3; i++) { doc.changer(true); doc.changer(false) }
    expect(howler.mute.mock.calls.map(c => c[0])).toEqual([true, false, true, false, true, false])
  })

  it('un même état annoncé deux fois ne fait rien de plus', () => {
    const doc = fauxDoc(false), howler = { mute: vi.fn() }
    watchBackgroundMute({ doc, howler })
    doc.changer(true); doc.changer(true)
    doc.changer(false); doc.changer(false)
    expect(howler.mute).toHaveBeenCalledTimes(2)
  })

  it('page déjà cachée à l’ouverture (onglet en arrière-plan) : coupe tout de suite', () => {
    const doc = fauxDoc(true), howler = { mute: vi.fn() }
    watchBackgroundMute({ doc, howler })
    expect(howler.mute).toHaveBeenCalledWith(true)
  })

  it('quitter l’histoire pendant la coupure remet le son (l’accueil n’est jamais muet)', () => {
    const doc = fauxDoc(false), howler = { mute: vi.fn() }
    const arreter = watchBackgroundMute({ doc, howler })
    doc.changer(true)
    arreter()
    expect(howler.mute).toHaveBeenLastCalledWith(false)
    expect(doc.ecoutes.size).toBe(0)
    doc.changer(false); doc.changer(true)
    expect(howler.mute).toHaveBeenCalledTimes(2)
  })

  it('quitter l’histoire sans coupure ne touche à rien', () => {
    const doc = fauxDoc(false), howler = { mute: vi.fn() }
    watchBackgroundMute({ doc, howler })()
    expect(howler.mute).not.toHaveBeenCalled()
  })

  it('StoryPage branche la surveillance et la retire en quittant', () => {
    const src = lire('../pages/StoryPage.jsx')
    expect(src).toContain("import { watchBackgroundMute } from '../utils/backgroundMute.js'")
    expect(src).toContain('  useEffect(() => watchBackgroundMute(), [])')
  })

  it('passe par Howler.mute (volume principal), jamais par une pause ni par AudioEngine', () => {
    const src = lire('./backgroundMute.js')
    expect(src).toContain("import { Howler } from 'howler'")
    expect(src).toContain('howler.mute(hidden)')
    expect(src).not.toMatch(/\.pause\(|suspend\(/)
    expect(src).not.toMatch(/import .*AudioEngine/)
  })
})

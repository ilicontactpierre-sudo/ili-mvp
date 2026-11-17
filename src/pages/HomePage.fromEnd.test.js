// Accueil : arrivée depuis l'écran de fin (gardes : lecture du code source).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('./HomePage.jsx', import.meta.url), 'utf8')

describe('HomePage — arrivée depuis l\'écran de fin', () => {
  it('s\'ouvre directement sur la liste', () => {
    expect(src).toContain("useState(() => (location.state?.fromEnd ? 'open' : 'idle'))")
  })
  it('le logo part de la place du « ILi » de l\'écran de fin (FLIP)', () => {
    expect(src).toContain('const [logoFrom] = useState(() => location.state?.logoFrom ?? null)')
    expect(src).toContain('el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`')
    expect(src).toContain('ref={logoRef}')
  })
  it('la liste attend la fin du vol', () => {
    expect(src).toContain('.home-page--from-end .story-menu-container { animation-delay: 1000ms; }')
    expect(src).toContain("fromEnd ? ' home-page--from-end' : ''")
  })
  it('un rechargement ne rejoue pas le vol, et le logo est remis en place si on quitte', () => {
    expect(src).toContain("window.history.replaceState({ ...window.history.state, usr: null }, '')")
    expect(src).toContain('return () => { cancelAnimationFrame(raf); clearTimeout(done); reset() }')
  })
})

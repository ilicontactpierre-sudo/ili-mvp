import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { keyboardClick, isStartKey } from './keyboard.js'

function clickEvent(detail) {
  return { detail, stopPropagation: vi.fn() }
}

describe('keyboardClick : seulement le clavier et les lecteurs d’écran', () => {
  it('lance l’action pour un click clavier (detail 0) et arrête sa remontée', () => {
    const action = vi.fn()
    const e = clickEvent(0)
    keyboardClick(action)(e)
    expect(action).toHaveBeenCalledTimes(1)
    expect(e.stopPropagation).toHaveBeenCalledTimes(1)
  })

  it('ignore le click qui suit un toucher ou un clic de souris (déjà traité au doigt levé)', () => {
    for (const detail of [1, 2, 3]) {
      const action = vi.fn()
      const e = clickEvent(detail)
      keyboardClick(action)(e)
      expect(action).not.toHaveBeenCalled()
      expect(e.stopPropagation).not.toHaveBeenCalled()
    }
  })
})

function key(k, extra = {}) {
  return { key: k, repeat: false, ctrlKey: false, metaKey: false, altKey: false, target: null, ...extra }
}
const bouton = { closest: (sel) => (sel.includes('button') ? {} : null) }
const texte = { closest: () => null }

describe('isStartKey : Entrée ou Espace sur l’écran titre', () => {
  it('accepte Entrée et Espace', () => {
    expect(isStartKey(key('Enter'))).toBe(true)
    expect(isStartKey(key(' '))).toBe(true)
    expect(isStartKey(key('Enter', { target: texte }))).toBe(true)
  })

  it('refuse les autres touches (dont les flèches, qui servent à la lecture)', () => {
    for (const k of ['a', 'Escape', 'Tab', 'ArrowRight', 'ArrowLeft', 'Spacebar', 'enter']) {
      expect(isStartKey(key(k))).toBe(false)
    }
  })

  it('refuse une touche maintenue enfoncée', () => {
    expect(isStartKey(key('Enter', { repeat: true }))).toBe(false)
  })

  it('refuse les raccourcis', () => {
    expect(isStartKey(key('Enter', { metaKey: true }))).toBe(false)
    expect(isStartKey(key('Enter', { ctrlKey: true }))).toBe(false)
    expect(isStartKey(key(' ', { altKey: true }))).toBe(false)
  })

  it('laisse un bouton, un lien ou un champ faire son propre travail', () => {
    expect(isStartKey(key('Enter', { target: bouton }))).toBe(false)
    expect(isStartKey(key(' ', { target: bouton }))).toBe(false)
  })
})

describe('StartScreen : branchements du clavier', () => {
  const src = readFileSync(new URL('../components/StartScreen.jsx', import.meta.url), 'utf8')

  it('chaque bouton garde son doigt levé ET reçoit le même geste au clavier', () => {
    const paires = [
      ['gateRef.current?.continueNow() }}', 'onClick={keyboardClick(() => gateRef.current?.continueNow())}'],
      ['gateRef.current?.waitMore(); setIsSlow(false) }}', 'onClick={keyboardClick(() => { gateRef.current?.waitMore(); setIsSlow(false) })}'],
      ['handleStart(true) }}', 'onClick={keyboardClick(() => handleStart(true))}'],
    ]
    for (const [doigt, clavier] of paires) {
      const i = src.indexOf(doigt)
      expect(i).toBeGreaterThan(-1)
      expect(src.slice(i, i + 200)).toContain(clavier)
    }
    // « Relire depuis le début » et « Recommencer »
    const recommencer = src.split('onPointerUp={(e) => { e.stopPropagation(); handleStart(false) }}')
    expect(recommencer.length - 1).toBe(2)
    for (const suite of recommencer.slice(1)) {
      expect(suite.trimStart().startsWith('onClick={keyboardClick(() => handleStart(false))}')).toBe(true)
    }
    expect(src.split('onClick={keyboardClick(').length - 1).toBe(5)
  })

  it('Entrée ou Espace lance l’histoire seulement sur l’écran « Touche pour commencer »', () => {
    const i = src.indexOf('function onKey(event)')
    expect(i).toBeGreaterThan(-1)
    const bloc = src.slice(src.lastIndexOf('useEffect(', i), i + 400)
    expect(bloc).toContain('if (!showStartHint) return')
    expect(bloc).toContain('if (!isStartKey(event)) return')
    expect(bloc).toContain('handleStart(false)')
    expect(bloc).toContain("window.removeEventListener('keydown', onKey)")
  })
})

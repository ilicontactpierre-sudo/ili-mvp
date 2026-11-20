// Interrupteur unique des réglages de lecture (étape 1 du menu réorganisé, 20/11/2026).
// Rendu serveur (renderToString) : les clics ne sont pas simulés ici, Pierre les teste sur le Pixel.
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import ReaderSwitch from './ReaderSwitch.jsx'

const rendu = (props) => renderToString(<ReaderSwitch onClick={() => {}} aria-label="Essai" {...props} />)

describe('ReaderSwitch', () => {
  it('est un interrupteur pour les lecteurs d’écran, avec son nom et son état', () => {
    const allume = rendu({ isDark: true, 'aria-checked': true })
    expect(allume).toContain('role="switch"')
    expect(allume).toContain('aria-checked="true"')
    expect(allume).toContain('aria-label="Essai"')
    expect(allume).toContain('type="button"')
    expect(rendu({ isDark: true, 'aria-checked': false })).toContain('aria-checked="false"')
  })

  it('thème sombre : mêmes couleurs qu’avant la refonte', () => {
    const allume = rendu({ isDark: true, 'aria-checked': true })
    expect(allume).toContain('background:rgba(255,255,255,0.55)')
    expect(allume).toContain('left:18px')
    expect(allume).toContain('background:#fff')
    const eteint = rendu({ isDark: true, 'aria-checked': false })
    expect(eteint).toContain('background:rgba(255,255,255,0.12)')
    expect(eteint).toContain('left:2px')
  })

  it('thème clair : mêmes couleurs qu’avant la refonte', () => {
    const allume = rendu({ isDark: false, 'aria-checked': true })
    expect(allume).toContain('background:rgba(26,26,24,0.45)')
    expect(allume).toContain('left:18px')
    expect(allume).toContain('background:#1a1a18')
    const eteint = rendu({ isDark: false, 'aria-checked': false })
    expect(eteint).toContain('background:rgba(26,26,24,0.12)')
    expect(eteint).toContain('left:2px')
  })

  it('n’est allumé que pour un vrai « true »', () => {
    expect(rendu({ isDark: false, 'aria-checked': 'true' })).toContain('left:2px')
    expect(rendu({ isDark: false })).toContain('left:2px')
  })
})

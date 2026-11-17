// Accueil : indice si le lecteur ne fait rien.
// Tests « gardes » (lecture du code source) : la page ne se rend pas hors navigateur
// (sons créés au chargement de App.jsx). Le ressenti se valide à l'écran.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('./HomePage.jsx', import.meta.url), 'utf8')

describe('HomePage — indice (garde)', () => {
  it('séquence trait (0,8 s) → flou (4,7 s) → mot (8,1 s)', () => {
    expect(src).toContain('setHintStage(s => Math.max(s, 1)), 800)')
    expect(src).toContain('setHintStage(s => Math.max(s, 2)), 4700)')
    expect(src).toContain('setHintStage(3), 8100)')
  })

  it('à chaque visite (plus seulement la première) et seulement à l\'état idle', () => {
    expect(src).toContain("{phase === 'idle' && (\n            <p style={{")
    expect(src).not.toContain("{showOnboarding && phase === 'idle' && (")
    expect(src).toContain("if (phase !== 'idle') return")
  })

  it('texte du mot et ancienne invitation retirée', () => {
    expect(src).toContain('Touche pour entrer')
    expect(src).not.toContain('Appuie pour commencer\n')
  })

  it('le flou ne s\'applique qu\'à l\'étape 2, le trait dès l\'étape 1', () => {
    expect(src).toContain("phase === 'idle' && hintStage === 2 ? ' hp-hint-blur' : ''")
    expect(src).toContain("hintStage >= 1 ? ' hp-hint-line--on' : ''")
  })

  it('revenir à l\'accueil relance la séquence depuis le début', () => {
    expect(src).toContain("const handleClose = () => { setHintStage(0); setPhase('idle'); };")
  })
})

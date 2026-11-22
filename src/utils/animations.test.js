// Une seule règle pour les animations (décision de Pierre, 18 puis 22/11/2026) :
// seul « Moins d'effets » d'ILi compte ; le réglage « Réduire les animations » du
// téléphone n'est suivi nulle part. Test « garde » : il lit tout le code de src/.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const racine = new URL('..', import.meta.url).pathname
function fichiers(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) return fichiers(chemin)
    return /\.(jsx?|css)$/.test(nom) && !/\.test\.jsx?$/.test(nom) ? [chemin] : []
  })
}

describe('animations : une seule règle', () => {
  it('aucun fichier ne suit « Réduire les animations » du téléphone', () => {
    const liste = fichiers(racine)
    expect(liste.length).toBeGreaterThan(50)
    const fautifs = liste.filter((f) => /prefers-reduced-motion/.test(readFileSync(f, 'utf8')))
    expect(fautifs).toEqual([])
  })
  it('le « ILi » de l’écran de fin vole toujours vers l’accueil', () => {
    const fin = readFileSync(join(racine, 'components/EndScreen.jsx'), 'utf8')
    expect(fin).toContain('        if (el) {\n          const r = el.getBoundingClientRect()')
  })
})

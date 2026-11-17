// Icône de l'application et langue de la page.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const pub = (f) => new URL(`../../public/${f}`, import.meta.url)
const pngSize = (f) => {
  const b = readFileSync(pub(f))
  expect(b.subarray(1, 4).toString('latin1')).toBe('PNG')
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

describe('Icônes', () => {
  it('PNG aux bonnes tailles', () => {
    expect(pngSize('apple-touch-icon.png')).toEqual([180, 180])
    expect(pngSize('icon-192.png')).toEqual([192, 192])
    expect(pngSize('icon-512.png')).toEqual([512, 512])
  })

  it('le manifeste ne déclare que des PNG existants, en « any » et « maskable »', () => {
    const m = JSON.parse(readFileSync(pub('manifest.json'), 'utf8'))
    expect(m.icons.length).toBe(4)
    for (const i of m.icons) {
      expect(i.type).toBe('image/png')
      expect(() => readFileSync(pub(i.src.replace(/^\//, '')))).not.toThrow()
    }
    expect(m.icons.filter(i => i.purpose === 'maskable').length).toBe(2)
    expect(m.icons.some(i => i.src.endsWith('.svg'))).toBe(false)
  })

  it('index.html : français, icône iPhone et icône d\'onglet ILi', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
    expect(html).toContain('<html lang="fr">')
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />')
    expect(html).toContain('href="/ili-icon.svg"')
    expect(() => readFileSync(pub('ili-icon.svg'))).not.toThrow()
  })
})

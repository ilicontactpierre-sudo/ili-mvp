// « Analyser » plus rapide (17/11/2026) : la recherche par index doit donner EXACTEMENT les mêmes
// sons, dans le même ordre, que la recherche d'origine (filterAndScoreSounds).
// Sur la bibliothèque complète (109 507 sons, 175 requêtes), vérifié par Claude hors de la suite
// (trop long ici) ; la suite vérifie un échantillon et les cas tordus.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { filterAndScoreSounds, buildSearchIndex, getSearchIndex, filterAndScoreIndexed } from './soundSearch'

const norm = (s) => s ? s.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() : ''
function sampleLibrary(step) {
  const local = JSON.parse(fs.readFileSync(path.resolve('public/sounds/sounds-index.json'), 'utf8'))
  const soundQ = JSON.parse(fs.readFileSync(path.resolve('public/sounds/soundq-keywords.json'), 'utf8'))
  return local.filter((_, i) => i % step === 0).map(s => {
    const e = [s.filename, s.id, s.label].filter(Boolean).map(norm).map(c => soundQ[c]).find(Boolean)
    return e ? { ...s, soundQKeywords: e } : s
  })
}
function storyKeywords() {
  const q = new Set()
  const dir = path.resolve('public/stories')
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json') || f === 'index.json') continue
    const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    for (const p of (Array.isArray(s.parts) ? s.parts : [s])) for (const t of p.soundTracks || []) if (t._orchestrationKeyword) q.add(t._orchestrationKeyword)
  }
  return [...q]
}
const same = (a, b) => a.length === b.length && a.every((s, i) => s === b[i])
const EXTRA = ['pluie', 'porte qui grince', 'vent forêt', 'cafés', 'Mer, vagues', 'ambiance ville nuit', 'pas sur gravier', 'cœur', 'l’orage', 'ÉGLISE cloches',
  'feu;crépitement', 'zzqqxx', 'room tone', 'a', '', '   ', 'x-y', 'a\u0000b', 'door\u0001creak']

describe('recherche par index = recherche d’origine', () => {
  const lib = sampleLibrary(25)
  const queries = [...storyKeywords().slice(0, 40), ...EXTRA]
  it('échantillon de la vraie bibliothèque, mots-clés des histoires et requêtes en français', () => {
    expect(lib.length).toBeGreaterThan(4000)
    const index = buildSearchIndex(lib)
    let nonEmpty = 0
    for (const q of queries) {
      const expected = filterAndScoreSounds(lib, q, [], false)
      expect(same(filterAndScoreIndexed(index, q), expected), q).toBe(true)
      if (expected.length > 0 && expected.length < lib.length) nonEmpty++
    }
    expect(nonEmpty).toBeGreaterThan(30) // les requêtes trouvent vraiment des sons
  })
  it('petits paquets : un mot pile au début ou à la fin d’un son, d’un paquet, ou à cheval sur deux sons', () => {
    const crafted = [
      { id: 'a', label: 'porte', tags: ['bois'] },
      { id: 'b', label: 'grince', tags: [] },
      { id: 'c', label: 'xyz', searchString: 'rain heavy' },
      { id: 'd', label: 'heavy', tags: ['rain'] },
      { id: 'e', label: '', tags: [], description: 'porte grince' },
      { id: 'f', label: 'Pluie forte', duration: 200 },
      { id: 'g', label: 'pluie', duration: 3 },
      { id: 'h', label: 'Cœur battant', boomCategory: 'HUMAN-HEART' },
    ]
    const libs = [crafted, [...crafted, ...lib.slice(0, 300)]]
    for (const l of libs) {
      for (const size of [1, 2, 3, 7, 97, 2048]) {
        const index = buildSearchIndex(l, size)
        // « tegr » n'existe qu'à cheval entre « porte » et « grince » (deux champs ou deux sons) : rien ne doit le trouver
        for (const q of ['porte', 'grince', 'tegr', 'rain', 'heavy', 'pluie ambiance', 'coeur', 'heart', 'bois porte', ...EXTRA]) {
          expect(same(filterAndScoreIndexed(index, q), filterAndScoreSounds(l, q, [], false)), `${q} / paquets de ${size}`).toBe(true)
        }
      }
    }
    expect(filterAndScoreIndexed(buildSearchIndex(crafted, 1), 'tegr')).toEqual([])
  })
  it('bibliothèque vide', () => {
    expect(filterAndScoreIndexed(buildSearchIndex([]), 'rain')).toEqual([])
    expect(filterAndScoreIndexed(buildSearchIndex([]), '')).toEqual([])
  })
  it('un index par liste de sons', () => {
    const a = lib.slice(0, 10), b = lib.slice(0, 10)
    expect(getSearchIndex(a)).toBe(getSearchIndex(a))
    expect(getSearchIndex(a)).not.toBe(getSearchIndex(b))
    expect(getSearchIndex(a).sounds).toBe(a)
  })
})

describe('branchement dans « Analyser » (test « garde »)', () => {
  const src = fs.readFileSync(path.resolve('src/components/admin/OrchestrationPanel.jsx'), 'utf8')
  it('la recherche d’un mot-clé passe par l’index, avec une mémoire par analyse', () => {
    expect(src).toMatch(/filterAndScoreIndexed\(getSearchIndex\(soundLibrary\), keyword\)/)
    expect(src).toMatch(/results\.slice\(0, 20\)/)
    expect(src).toContain('if (memo && memo.has(keyword)) return memo.get(keyword)')
    expect(src).toContain('if (memo) memo.set(keyword, top)')
    expect(src).toMatch(/const keywordMemo = new Map\(\)\n\s+soundsRaw\.forEach/)
    expect(src).toMatch(/findSoundsByKeyword\(block\.keyword, soundLibrary, keywordMemo\)/)
  })
})

// Fluidité de Cmd+Z (17/11/2026) : appliquer l'historique en gardant les objets inchangés.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { reuseUnchanged } from './historyReuse'

const copy = (x) => JSON.parse(JSON.stringify(x))
const segs = [{ id: 's1', text: 'a' }, { id: 's2', text: 'b' }, { id: 's3', text: 'c' }]

describe('reuseUnchanged', () => {
  it('rien n’a changé : renvoie la liste affichée elle-même', () => {
    expect(reuseUnchanged(copy(segs), segs)).toBe(segs)
    expect(reuseUnchanged([], [])).toEqual([])
  })
  it('un élément changé : seul lui vient de l’historique, les autres restent les objets affichés', () => {
    const hist = copy(segs); hist[1].text = 'B'
    const out = reuseUnchanged(hist, segs)
    expect(out).not.toBe(segs)
    expect(out[0]).toBe(segs[0]); expect(out[2]).toBe(segs[2])
    expect(out[1]).toBe(hist[1])
    expect(out).toEqual(hist)
  })
  it('éléments ajoutés, retirés, déplacés : le contenu est toujours celui de l’historique', () => {
    const cases = [
      [segs[0], segs[2]].map(copy),                       // un retiré
      [...segs, { id: 's4', text: 'd' }].map(copy),        // un ajouté
      [segs[2], segs[0], segs[1]].map(copy),               // réordonnés
      [{ id: 's1', text: 'a', extra: true }, ...segs.slice(1)].map(copy), // champ ajouté
      [{ id: 's1' }, ...segs.slice(1)].map(copy),          // champ retiré
    ]
    for (const hist of cases) {
      const out = reuseUnchanged(hist, segs)
      expect(out).toEqual(hist)
      expect(out).not.toBe(segs)
      out.forEach((x, i) => { if (JSON.stringify(x) === JSON.stringify(hist[i])) expect([hist[i], ...segs]).toContain(x) })
    }
    const reordered = reuseUnchanged([segs[2], segs[0], segs[1]].map(copy), segs)
    expect(reordered[0]).toBe(segs[2]); expect(reordered[1]).toBe(segs[0])
  })
  it('identifiants absents, en double, _id, éléments simples', () => {
    const noId = [{ text: 'x' }, { text: 'y' }]
    expect(reuseUnchanged(copy(noId), noId)).toBe(noId)
    const swapped = reuseUnchanged([{ text: 'y' }, { text: 'x' }], noId)
    expect(swapped).toEqual([{ text: 'y' }, { text: 'x' }])
    const dup = [{ id: 'd', v: 1 }, { id: 'd', v: 1 }]
    const out = reuseUnchanged(copy(dup), dup)
    expect(out).toEqual(dup)
    expect(out[0]).not.toBe(out[1]) // jamais deux fois le même objet
    const underscore = [{ _id: 'u1', t: 1 }, { _id: 'u2', t: 2 }]
    expect(reuseUnchanged(copy(underscore), underscore)).toBe(underscore)
    const swappedU = reuseUnchanged([underscore[1], underscore[0]].map(copy), underscore)
    expect(swappedU[0]).toBe(underscore[1]); expect(swappedU[1]).toBe(underscore[0])
    const plain = ['a', 'b']
    expect(reuseUnchanged(['a', 'b'], plain)).toBe(plain)
    expect(reuseUnchanged(['a', 'c'], plain)).toEqual(['a', 'c'])
    expect(reuseUnchanged([null, { id: 1 }], [null, { id: 1 }])).toEqual([null, { id: 1 }])
  })
  it('entrées inattendues : renvoie l’historique tel quel', () => {
    expect(reuseUnchanged(undefined, segs)).toBe(undefined)
    const hist = copy(segs)
    expect(reuseUnchanged(hist, undefined)).toBe(hist)
  })
  it('sur toutes les histoires du dépôt : une copie de l’histoire redonne exactement les mêmes objets', () => {
    const dir = path.resolve('public/stories')
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json') || f === 'index.json') continue
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      for (const p of (Array.isArray(s.parts) ? s.parts : [s])) {
        for (const key of ['segments', 'soundTracks', 'vfxTracks']) {
          const list = p[key] || []
          expect(reuseUnchanged(copy(list), list)).toBe(list)
          if (list.length > 1) {
            const hist = copy(list); hist[Math.floor(list.length / 2)].__modifie = 1
            const out = reuseUnchanged(hist, list)
            expect(out).toEqual(hist)
            expect(out.filter((x, i) => x === list[i]).length).toBe(list.length - 1)
          }
        }
      }
    }
  })
})

describe('branchements (tests « garde »)', () => {
  const admin = fs.readFileSync(path.resolve('src/pages/AdminPage.jsx'), 'utf8')
  const timeline = fs.readFileSync(path.resolve('src/components/admin/UnifiedSegmentsTimeline.jsx'), 'utf8')
  it('Cmd+Z / Cmd+Maj+Z appliquent l’historique en gardant l’inchangé', () => {
    for (const k of ['segments', 'soundTracks', 'vfxTracks']) {
      const cap = k[0].toUpperCase() + k.slice(1)
      expect(admin).toContain(`reuseUnchanged(snapshot.${k}, active${cap})`)
    }
    expect(admin.match(/if \(!applyHistorySnapshot\(snapshot\)\) skipNextHistorySnapshotRef\.current = false/g)).toHaveLength(2)
  })
  it('Cmd+Z juste après une modification (avant la capture à 300 ms) : capture d’abord, puis annule', () => {
    expect(admin).toMatch(/const handleUndo = \(\) => \{\n\s+if \(isAheadOfHistory\(\)\) captureNow\(\)\n\s+if \(historyIndexRef\.current <= 0\) return/)
    expect(admin).toMatch(/const handleRedo = \(\) => \{\n(\s+\/\/.*\n)?\s+if \(isAheadOfHistory\(\)\) return/)
    for (const k of ['segments', 'soundTracks', 'vfxTracks']) {
      const cap = k[0].toUpperCase() + k.slice(1)
      expect(admin).toContain(`reuseUnchanged(saved.${k}, active${cap}) !== active${cap}`)
    }
  })
  it('Cmd : seule la ligne survolée le reçoit ; le Cmd+clic lit aussi la touche', () => {
    expect(timeline).toContain('isCmdPressed: isCmdPressed && hoveredRow === index,')
    expect(timeline).toContain('if ((isCmdPressed || e.metaKey || e.ctrlKey) && !isEditing) {')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { SoundLoader } from './SoundLoader.js'

class FakeHowl {
  constructor(opts) {
    this.opts = opts; this._html5 = false; this._st = 'loading'; this.h = {}
    queueMicrotask(() => { this._st = 'loaded'; if (this.h.load) this.h.load() })
  }
  once(e, f) { this.h[e] = f }
  state() { return this._st }
  unload() {}
}
const quotaError = () => Object.assign(new Error('quota'), { name: 'QuotaExceededError' })

// Faux stockage de caches : plusieurs caches nommés, chacun avec une limite d'espace.
function fakeStorage({ names = [], limit = Infinity, entries = {} } = {}) {
  const caches = new Map(names.map((n) => [n, new Map()]))
  const log = { opened: [], deleted: [], evicted: [], keysCalls: 0 }
  const makeCache = (store) => ({
    match: async (u) => (store.has(u) ? new Response(new Uint8Array(store.get(u))) : undefined),
    put: async (u, res) => {
      const n = (await res.arrayBuffer()).byteLength
      const used = [...store.entries()].filter(([k]) => k !== u).reduce((a, [, v]) => a + v, 0)
      if (used + n > limit) throw quotaError()
      store.set(u, n)
    },
    keys: async () => [...store.keys()].map((url) => ({ url })),
    delete: async (req) => { const u = req.url ?? req; log.evicted.push(u); return store.delete(u) },
  })
  return {
    caches, log,
    keys: async () => { log.keysCalls++; return [...caches.keys()] },
    delete: async (n) => { log.deleted.push(n); return caches.delete(n) },
    open: async (n) => {
      log.opened.push(n)
      if (!caches.has(n)) caches.set(n, new Map(Object.entries(entries)))
      return makeCache(caches.get(n))
    },
  }
}

const fetchOk = (n = 100) => async () => new Response(new Uint8Array(n), { status: 200, headers: { 'content-length': String(n) } })
function makeLoader(storage, opts = {}) {
  return new SoundLoader({
    createHowl: (o) => new FakeHowl(o), fetchImpl: opts.fetchImpl ?? fetchOk(), cacheStorage: storage,
    createObjectURL: () => 'blob:x', revokeObjectURL: () => {}, ...opts.options,
  })
}
const snd = (id) => ({ id, url: `https://x.test/${id}.mp3` })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

let storage
beforeEach(() => { storage = fakeStorage() })

describe('SoundLoader : version du cache', () => {
  it('par défaut, utilise le cache « ili-audio-v1 »', async () => {
    const l = makeLoader(storage)
    l.start([snd('a')]); await l.whenSettled(['a'])
    expect(storage.log.opened).toContain('ili-audio-v1')
  })

  it('au premier start, supprime les anciens caches audio mais jamais les autres', async () => {
    storage = fakeStorage({ names: ['ili-audio-v0', 'ili-audio-v1', 'workbox-x', 'autre'] })
    const l = makeLoader(storage)
    l.start([snd('a')]); await l.whenSettled(['a']); await wait(5)
    expect(storage.log.deleted).toEqual(['ili-audio-v0'])
  })

  it('avec un autre numéro de version, l\'ancien cache est supprimé et le nouveau est utilisé', async () => {
    storage = fakeStorage({ names: ['ili-audio-v1'] })
    const l = makeLoader(storage, { options: { cacheName: 'ili-audio-v2' } })
    l.start([snd('a')]); await l.whenSettled(['a']); await wait(5)
    expect(storage.log.deleted).toEqual(['ili-audio-v1'])
    expect(storage.log.opened).toContain('ili-audio-v2')
    expect(storage.log.opened).not.toContain('ili-audio-v1')
  })

  it('ne nettoie qu\'une seule fois par chargeur, même avec plusieurs start()', async () => {
    const l = makeLoader(storage)
    l.start([snd('a')]); l.start([snd('b')]); l.start([snd('c')])
    await l.whenSettled(['a', 'b', 'c']); await wait(5)
    expect(storage.log.keysCalls).toBe(1)
  })

  it('sans Cache API (cacheStorage null), tout fonctionne et rien n\'est nettoyé', async () => {
    const l = makeLoader(null)
    l.start([snd('a')]); await l.whenSettled(['a'])
    expect(l.status('a')).toBe('loaded')
  })
})

describe('SoundLoader : plus de place sur le téléphone', () => {
  it('supprime les plus anciens fichiers du cache, puis garde le nouveau', async () => {
    storage = fakeStorage({ limit: 250, entries: { 'https://old.test/1.mp3': 100, 'https://old.test/2.mp3': 100 } })
    const l = makeLoader(storage)
    l.start([snd('a')]); await l.whenSettled(['a'])
    expect(l.status('a')).toBe('loaded')
    expect(storage.log.evicted).toEqual(['https://old.test/1.mp3'])
    expect([...storage.caches.get('ili-audio-v1').keys()]).toEqual(['https://old.test/2.mp3', 'https://x.test/a.mp3'])
  })

  it('n\'efface jamais un son de l\'histoire en cours déjà gardé, même s\'il est le plus ancien', async () => {
    storage = fakeStorage({ limit: 250, entries: { 'https://x.test/b.mp3': 100, 'https://old.test/1.mp3': 100 } })
    const l = makeLoader(storage)
    l.start([snd('a'), snd('b')]); await l.whenSettled(['a', 'b'])
    expect(storage.log.evicted).toEqual(['https://old.test/1.mp3'])
    expect(storage.caches.get('ili-audio-v1').has('https://x.test/b.mp3')).toBe(true)
  })

  it('si rien ne peut être supprimé, le son est joué quand même (simplement pas gardé)', async () => {
    storage = fakeStorage({ limit: 50 })
    const l = makeLoader(storage)
    l.start([snd('a')]); await l.whenSettled(['a'])
    expect(l.status('a')).toBe('loaded')
    expect(l.howlMap.get('a').opts.html5).toBe(false)
  })
})

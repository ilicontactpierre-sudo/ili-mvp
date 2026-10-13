import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SoundLoader, formatFromUrl } from './SoundLoader.js'

// ───────── faux Howl ─────────
class FakeHowl {
  static instances = []
  static behavior = 'ok' // 'ok' | 'error' | 'html5' | 'never' | 'cacheHitFail'
  constructor(opts) {
    this.opts = opts
    this._html5 = FakeHowl.behavior === 'html5'
    this._state = 'loading'
    this.handlers = {}
    this.unloaded = false
    FakeHowl.instances.push(this)
    const b = typeof FakeHowl.behavior === 'function' ? FakeHowl.behavior(this) : FakeHowl.behavior
    if (b === 'never') return
    queueMicrotask(() => {
      if (this.unloaded) return
      if (b === 'error') this.emit('loaderror', 1, 'Decoding audio data failed')
      else { this._state = 'loaded'; this.emit('load') }
    })
  }
  once(ev, fn) { this.handlers[ev] = fn }
  emit(ev, ...a) { const f = this.handlers[ev]; if (f) f(...a) }
  state() { return this._state }
  unload() { this.unloaded = true; this._state = 'unloaded' }
}

// ───────── faux réseau ─────────
const bytesOf = (n, v = 7) => new Uint8Array(n).fill(v)
const okResponse = (n = 100) =>
  new Response(bytesOf(n), { status: 200, headers: { 'content-length': String(n) } })

function stallResponse(signal) {
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(bytesOf(10))
      signal.addEventListener('abort', () => c.error(new DOMException('aborted', 'AbortError')))
    },
  })
  return new Response(stream, { status: 200 })
}

// plan : liste de comportements, un par appel de fetch ; le dernier est répété.
function makeFetch(plan) {
  const calls = []
  let inFlight = 0
  let maxInFlight = 0
  const fn = async (url, { signal }) => {
    calls.push(url)
    const step = plan[Math.min(calls.length - 1, plan.length - 1)]
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    try {
      await Promise.resolve()
      if (step === 'neterr') throw new TypeError('Failed to fetch')
      if (step === 'stall') return stallResponse(signal)
      if (step === 'slow') { await new Promise((r) => setTimeout(r, 5)); return okResponse() }
      if (step === '206body') return new Response(bytesOf(100), { status: 206, headers: { 'content-length': '100' } })
      if (typeof step === 'number') return new Response(null, { status: step })
      if (step === 'truncated') return new Response(bytesOf(50), { status: 200, headers: { 'content-length': '100' } })
      return okResponse()
    } finally { inFlight-- }
  }
  fn.calls = calls
  Object.defineProperty(fn, 'maxInFlight', { get: () => maxInFlight })
  return fn
}

// ───────── faux cache du téléphone ─────────
function fakeCaches({ failPut = false } = {}) {
  const store = new Map()
  const calls = { put: 0, delete: 0 }
  return {
    store, calls,
    open: async () => ({
      match: async (u) => (store.has(u) ? new Response(store.get(u)) : undefined),
      put: async (u, res) => { calls.put++; if (failPut) throw new Error('QuotaExceededError'); store.set(u, new Uint8Array(await res.arrayBuffer())) },
      delete: async (u) => { calls.delete++; return store.delete(u) },
    }),
  }
}

function make({ plan = ['ok'], caches = fakeCaches(), ...opts } = {}) {
  const fetchImpl = makeFetch(plan)
  const revoked = []
  const loader = new SoundLoader({
    createHowl: (o) => new FakeHowl(o),
    fetchImpl,
    cacheStorage: caches,
    createObjectURL: () => `blob:fake/${Math.random()}`,
    revokeObjectURL: (u) => revoked.push(u),
    retryDelaysMs: [10, 20],
    ...opts,
  })
  return { loader, fetchImpl, caches, revoked }
}
const snd = (id, extra = {}) => ({ id, url: `https://x.test/${id}.mp3`, ...extra })

beforeEach(() => { FakeHowl.instances = []; FakeHowl.behavior = 'ok' })
afterEach(() => { vi.useRealTimers() })

describe('formatFromUrl', () => {
  it('lit l\'extension, ignore ?query, et retombe sur mp3', () => {
    expect(formatFromUrl('https://x.test/a.MP3?t=1')).toBe('mp3')
    expect(formatFromUrl('/sounds/b%20c.wav')).toBe('wav')
    expect(formatFromUrl('https://x.test/sans-extension')).toBe('mp3')
    expect(formatFromUrl('https://x.test/a.xyz')).toBe('mp3')
  })
})

describe('chargement nominal', () => {
  it('télécharge, crée le Howl depuis une URL blob (stéréo : html5 false) et le range dans howlMap', async () => {
    const { loader, revoked } = make()
    loader.start([snd('a', { loop: true })])
    await loader.whenSettled(['a'])
    expect(loader.status('a')).toBe('loaded')
    expect(loader.howlMap.get('a')).toBeInstanceOf(FakeHowl)
    const o = FakeHowl.instances[0].opts
    expect(o.src[0]).toMatch(/^blob:/)
    expect(o.format).toEqual(['mp3'])
    expect(o.html5).toBe(false)
    expect(o.loop).toBe(true)
    expect(revoked).toHaveLength(1) // l'URL blob est libérée après décodage
  })

  it('howlMap ne contient un son qu\'une fois chargé (un son pas prêt est absent donc ignoré par AudioEngine)', async () => {
    const { loader } = make()
    loader.start([snd('a')])
    expect(loader.howlMap.has('a')).toBe(false)
    await loader.whenSettled(['a'])
    expect(loader.howlMap.has('a')).toBe(true)
  })

  it('n\'utilise JAMAIS html5:true, quelles que soient les options du son', async () => {
    const { loader } = make()
    loader.start([snd('a', { html5: true, loop: false })])
    await loader.whenSettled(['a'])
    expect(FakeHowl.instances.every((h) => h.opts.html5 === false)).toBe(true)
  })

  it('refuse et décharge un Howl qui serait malgré tout en mode HTML5', async () => {
    FakeHowl.behavior = 'html5'
    const { loader } = make()
    loader.start([snd('a')])
    await loader.whenSettled(['a'])
    expect(loader.status('a')).toBe('failed')
    expect(loader.howlMap.has('a')).toBe(false)
    expect(FakeHowl.instances[0].unloaded).toBe(true)
  })

  it('un échec de décodage marque le son en échec, sans retélécharger', async () => {
    FakeHowl.behavior = 'error'
    const { loader, fetchImpl } = make()
    loader.start([snd('a')])
    await loader.whenSettled(['a'])
    expect(loader.status('a')).toBe('failed')
    expect(loader.errorOf('a')).toMatch(/décodage/)
    expect(fetchImpl.calls).toHaveLength(1)
  })
})

describe('cache du téléphone', () => {
  it('premier chargement : réseau puis écriture en cache ; second : aucune requête réseau', async () => {
    const caches = fakeCaches()
    const a = make({ caches })
    a.loader.start([snd('a')])
    await a.loader.whenSettled(['a'])
    expect(a.fetchImpl.calls).toHaveLength(1)
    expect(caches.calls.put).toBe(1)

    const b = make({ caches })
    b.loader.start([snd('a')])
    await b.loader.whenSettled(['a'])
    expect(b.fetchImpl.calls).toHaveLength(0)
    expect(b.loader.status('a')).toBe('loaded')
  })

  it('un fichier abîmé en cache est supprimé puis retéléchargé une fois', async () => {
    const caches = fakeCaches()
    caches.store.set('https://x.test/a.mp3', bytesOf(5, 1))
    FakeHowl.behavior = (h) => (h.opts.src && FakeHowl.instances.length === 1 ? 'error' : 'ok')
    const { loader, fetchImpl } = make({ caches })
    loader.start([snd('a')])
    await loader.whenSettled(['a'])
    expect(caches.calls.delete).toBe(1)
    expect(fetchImpl.calls).toHaveLength(1)
    expect(loader.status('a')).toBe('loaded')
  })

  it('fonctionne si le cache est plein ou indisponible', async () => {
    const full = make({ caches: fakeCaches({ failPut: true }) })
    full.loader.start([snd('a')])
    await full.loader.whenSettled(['a'])
    expect(full.loader.status('a')).toBe('loaded')

    const none = make({ caches: null })
    none.loader.start([snd('a')])
    await none.loader.whenSettled(['a'])
    expect(none.loader.status('a')).toBe('loaded')
  })

  it('ne met jamais en cache un fichier incomplet', async () => {
    const caches = fakeCaches()
    const { loader } = make({ caches, plan: ['truncated'], attempts: 1 })
    loader.start([snd('a')])
    await loader.whenSettled(['a'])
    expect(loader.status('a')).toBe('failed')
    expect(caches.calls.put).toBe(0)
  })
})

describe('réseau faible : nouvelles tentatives', () => {
  it('réessaie après une coupure réseau et finit par réussir', async () => {
    vi.useFakeTimers()
    const { loader, fetchImpl } = make({ plan: ['neterr', 'neterr', 'ok'] })
    loader.start([snd('a')])
    const p = loader.whenSettled(['a'])
    await vi.advanceTimersByTimeAsync(100)
    await p
    expect(fetchImpl.calls).toHaveLength(3)
    expect(loader.status('a')).toBe('loaded')
  })

  it('abandonne après 3 essais', async () => {
    vi.useFakeTimers()
    const { loader, fetchImpl } = make({ plan: ['neterr'] })
    loader.start([snd('a')])
    const p = loader.whenSettled(['a'])
    await vi.advanceTimersByTimeAsync(200)
    await p
    expect(fetchImpl.calls).toHaveLength(3)
    expect(loader.status('a')).toBe('failed')
  })

  it('réessaie sur une erreur serveur 500', async () => {
    vi.useFakeTimers()
    const { loader, fetchImpl } = make({ plan: [500, 'ok'] })
    loader.start([snd('a')])
    const p = loader.whenSettled(['a'])
    await vi.advanceTimersByTimeAsync(100)
    await p
    expect(fetchImpl.calls).toHaveLength(2)
    expect(loader.status('a')).toBe('loaded')
  })

  it('ne réessaie pas sur un 404 (fichier absent)', async () => {
    const { loader, fetchImpl } = make({ plan: [404] })
    loader.start([snd('a')])
    await loader.whenSettled(['a'])
    expect(fetchImpl.calls).toHaveLength(1)
    expect(loader.status('a')).toBe('failed')
    expect(loader.errorOf('a')).toMatch(/404/)
  })

  it('refuse une réponse partielle 206, même avec un contenu, sans réessayer', async () => {
    const { loader, fetchImpl } = make({ plan: ['206body', 'ok'] })
    loader.start([snd('a')])
    await loader.whenSettled(['a'])
    expect(loader.status('a')).toBe('failed')
    expect(loader.errorOf('a')).toMatch(/206/)
    expect(fetchImpl.calls).toHaveLength(1)
  })

  it('réessaie un fichier tronqué (taille reçue différente de Content-Length)', async () => {
    vi.useFakeTimers()
    const { loader, fetchImpl } = make({ plan: ['truncated', 'ok'] })
    loader.start([snd('a')])
    const p = loader.whenSettled(['a'])
    await vi.advanceTimersByTimeAsync(100)
    await p
    expect(fetchImpl.calls).toHaveLength(2)
    expect(loader.status('a')).toBe('loaded')
  })

  it('abandonne un essai quand plus aucun octet n\'arrive pendant stallMs, puis réessaie', async () => {
    vi.useFakeTimers()
    const { loader, fetchImpl } = make({ plan: ['stall', 'ok'], stallMs: 1000 })
    loader.start([snd('a')])
    const p = loader.whenSettled(['a'])
    await vi.advanceTimersByTimeAsync(3000)
    await p
    expect(fetchImpl.calls).toHaveLength(2)
    expect(loader.status('a')).toBe('loaded')
  })
})

describe('file d\'attente', () => {
  it('ne dépasse jamais `concurrency` téléchargements en parallèle', async () => {
    const { loader, fetchImpl } = make({ plan: ['slow'], concurrency: 2 })
    const ids = ['a', 'b', 'c', 'd', 'e']
    loader.start(ids.map((i) => snd(i)))
    await loader.whenSettled(ids)
    expect(fetchImpl.maxInFlight).toBe(2)
    expect(loader.stats().loaded).toBe(5)
  })

  it('télécharge dans l\'ordre donné, et prioritize() fait passer des sons devant', async () => {
    const { loader, fetchImpl } = make({ plan: ['slow'], concurrency: 1 })
    loader.start(['a', 'b', 'c', 'd'].map((i) => snd(i)))
    loader.prioritize(['d', 'c'])
    await loader.whenSettled(['a', 'b', 'c', 'd'])
    expect(fetchImpl.calls.map((u) => u.split('/').pop())).toEqual(['a.mp3', 'd.mp3', 'c.mp3', 'b.mp3'])
  })

  it('ignore les sons déjà connus lors d\'un second start()', async () => {
    const { loader, fetchImpl } = make()
    loader.start([snd('a')])
    loader.start([snd('a'), snd('b')])
    await loader.whenSettled(['a', 'b'])
    expect(fetchImpl.calls).toHaveLength(2)
  })

  it('whenSettled attend les sons demandés (chargés OU en échec) et pas les autres', async () => {
    const { loader } = make({ plan: ['ok', 404] })
    loader.start([snd('a'), snd('b')])
    await loader.whenSettled(['a', 'b'])
    expect(loader.status('a')).toBe('loaded')
    expect(loader.status('b')).toBe('failed')
    await expect(loader.whenSettled(['inconnu'])).resolves.toBeUndefined()
  })

  it('retryFailed() remet les sons en échec en file', async () => {
    const { loader, fetchImpl } = make({ plan: [404, 'ok'] })
    loader.start([snd('a')])
    await loader.whenSettled(['a'])
    expect(loader.status('a')).toBe('failed')
    loader.retryFailed()
    await loader.whenSettled(['a'])
    expect(fetchImpl.calls).toHaveLength(2)
    expect(loader.status('a')).toBe('loaded')
  })

  it('émet des événements loaded/failed et compte les octets reçus', async () => {
    const { loader } = make({ plan: ['ok', 404] })
    const ev = []
    loader.on((e) => ev.push(`${e.type}:${e.id}`))
    loader.start([snd('a'), snd('b')])
    await loader.whenSettled(['a', 'b'])
    expect(ev.sort()).toEqual(['failed:b', 'loaded:a'])
    expect(loader.stats().bytes).toBe(100)
  })
})

describe('dispose', () => {
  it('décharge tous les Howl, vide howlMap et libère les attentes', async () => {
    const { loader } = make()
    loader.start([snd('a'), snd('b')])
    await loader.whenSettled(['a', 'b'])
    const howls = [...loader.howlMap.values()]
    loader.dispose()
    expect(howls.every((h) => h.unloaded)).toBe(true)
    expect(loader.howlMap.size).toBe(0)
  })

  it('annule les téléchargements en cours et ne crée plus aucun Howl ensuite', async () => {
    const { loader } = make({ plan: ['stall'], stallMs: 100000 })
    loader.start([snd('a')])
    const p = loader.whenSettled(['a'])
    await new Promise((r) => setTimeout(r, 10))
    loader.dispose()
    await p
    await new Promise((r) => setTimeout(r, 10))
    expect(FakeHowl.instances).toHaveLength(0)
    expect(loader.howlMap.size).toBe(0)
  })

  it('un Howl décodé après dispose est déchargé et non rangé', async () => {
    FakeHowl.behavior = 'never'
    const { loader } = make()
    loader.start([snd('a')])
    await new Promise((r) => setTimeout(r, 10))
    loader.dispose()
    FakeHowl.instances[0]._state = 'loaded'
    FakeHowl.instances[0].emit('load')
    await new Promise((r) => setTimeout(r, 10))
    expect(loader.howlMap.size).toBe(0)
    expect(FakeHowl.instances[0].unloaded).toBe(true)
  })

  it('start() après dispose ne fait rien', () => {
    const { loader, fetchImpl } = make()
    loader.dispose()
    loader.start([snd('a')])
    expect(fetchImpl.calls).toHaveLength(0)
  })
})

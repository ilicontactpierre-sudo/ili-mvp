import { describe, it, expect } from 'vitest'
import {
  AUDIO_CACHE_NAME, AUDIO_CACHE_PREFIX, AUDIO_CACHE_VERSION,
  cleanOldAudioCaches, isQuotaError, putWithEviction,
} from './audioCache.js'

const quotaError = () => Object.assign(new Error('quota'), { name: 'QuotaExceededError' })

// Faux stockage de caches
function fakeStorage(names, { failKeys = false, failDelete = [] } = {}) {
  const existing = new Set(names)
  const deleted = []
  return {
    deleted,
    keys: async () => { if (failKeys) throw new Error('boom'); return [...existing] },
    delete: async (n) => { if (failDelete.includes(n)) throw new Error('boom'); deleted.push(n); return existing.delete(n) },
  }
}

// Faux cache avec limite d'espace : put lève QuotaExceededError si ça ne tient pas.
function fakeCache(limit, entries = {}, { putError = null } = {}) {
  const store = new Map(Object.entries(entries)) // ordre d'insertion = du plus ancien au plus récent
  const log = { put: 0, deleted: [] }
  const size = () => [...store.values()].reduce((a, b) => a + b, 0)
  return {
    store, log,
    keys: async () => [...store.keys()].map((url) => ({ url })),
    delete: async (req) => { const u = req.url ?? req; log.deleted.push(u); return store.delete(u) },
    put: async (u, res) => {
      log.put++
      if (putError) throw putError
      const n = (await res.arrayBuffer()).byteLength
      const other = store.has(u) ? store.get(u) : 0
      if (size() - other + n > limit) throw quotaError()
      store.set(u, n)
    },
  }
}
const resp = (n) => () => new Response(new Uint8Array(n))

describe('nom du cache', () => {
  it('est construit à partir du préfixe et de la version', () => {
    expect(AUDIO_CACHE_NAME).toBe(`${AUDIO_CACHE_PREFIX}v${AUDIO_CACHE_VERSION}`)
    expect(AUDIO_CACHE_NAME).toBe('ili-audio-v1')
  })
})

describe('cleanOldAudioCaches', () => {
  it('supprime les caches audio d\'une autre version et garde la version courante', async () => {
    const s = fakeStorage(['ili-audio-v1', 'ili-audio-v2', 'ili-audio-v3'])
    const r = await cleanOldAudioCaches(s, 'ili-audio-v3')
    expect(r.sort()).toEqual(['ili-audio-v1', 'ili-audio-v2'])
    expect(s.deleted).not.toContain('ili-audio-v3')
  })

  it('ne touche JAMAIS un cache dont le nom n\'a pas le préfixe', async () => {
    const s = fakeStorage(['workbox-precache', 'autre-app', 'ili-image-v1', 'ili-audio-v0', 'xili-audio-v1'])
    await cleanOldAudioCaches(s, 'ili-audio-v1')
    expect(s.deleted).toEqual(['ili-audio-v0'])
  })

  it('ne supprime rien s\'il n\'y a que la version courante', async () => {
    const s = fakeStorage(['ili-audio-v1'])
    expect(await cleanOldAudioCaches(s, 'ili-audio-v1')).toEqual([])
    expect(s.deleted).toEqual([])
  })

  it('utilise par défaut le nom de cache courant', async () => {
    const s = fakeStorage(['ili-audio-v0', AUDIO_CACHE_NAME])
    await cleanOldAudioCaches(s)
    expect(s.deleted).toEqual(['ili-audio-v0'])
  })

  it('ne lève jamais d\'erreur : Cache API absente, keys en erreur, ou une suppression en erreur', async () => {
    await expect(cleanOldAudioCaches(null)).resolves.toEqual([])
    await expect(cleanOldAudioCaches({})).resolves.toEqual([])
    await expect(cleanOldAudioCaches(fakeStorage(['a'], { failKeys: true }))).resolves.toEqual([])
    const s = fakeStorage(['ili-audio-v0', 'ili-audio-v9'], { failDelete: ['ili-audio-v0'] })
    await expect(cleanOldAudioCaches(s, 'ili-audio-v1')).resolves.toEqual(['ili-audio-v9'])
  })
})

describe('isQuotaError', () => {
  it('reconnaît les variantes des navigateurs', () => {
    expect(isQuotaError({ name: 'QuotaExceededError' })).toBe(true)
    expect(isQuotaError({ code: 22 })).toBe(true)
    expect(isQuotaError({ code: 1014 })).toBe(true)
    expect(isQuotaError(new Error('NS_ERROR_FILE_NO_DEVICE_SPACE'))).toBe(true)
    expect(isQuotaError(new Error('Quota exceeded'))).toBe(true)
    expect(isQuotaError(new Error('disk full'))).toBe(true)
  })
  it('ne prend pas une autre erreur pour un manque de place', () => {
    expect(isQuotaError(new TypeError('Failed to fetch'))).toBe(false)
    expect(isQuotaError(null)).toBe(false)
    expect(isQuotaError(undefined)).toBe(false)
  })
})

describe('putWithEviction', () => {
  it('écrit directement s\'il y a de la place, sans rien supprimer', async () => {
    const c = fakeCache(1000, { 'https://x/old.mp3': 100 })
    expect(await putWithEviction(c, 'https://x/new.mp3', resp(200))).toEqual({ ok: true, evicted: 0 })
    expect(c.log.deleted).toEqual([])
  })

  it('manque de place : supprime les plus anciens, un par un, et seulement le nécessaire', async () => {
    const c = fakeCache(300, { 'https://x/a.mp3': 100, 'https://x/b.mp3': 100, 'https://x/c.mp3': 100 })
    const r = await putWithEviction(c, 'https://x/new.mp3', resp(150))
    expect(r).toEqual({ ok: true, evicted: 2 })
    expect(c.log.deleted).toEqual(['https://x/a.mp3', 'https://x/b.mp3']) // du plus ancien au plus récent
    expect(c.store.has('https://x/c.mp3')).toBe(true)
    expect(c.store.has('https://x/new.mp3')).toBe(true)
  })

  it('n\'efface JAMAIS les sons protégés (histoire en cours), même les plus anciens', async () => {
    const c = fakeCache(300, { 'https://x/a.mp3': 100, 'https://x/b.mp3': 100, 'https://x/c.mp3': 100 })
    const r = await putWithEviction(c, 'https://x/new.mp3', resp(150), ['https://x/a.mp3'])
    expect(r.ok).toBe(true)
    expect(c.store.has('https://x/a.mp3')).toBe(true)
    expect(c.log.deleted).toEqual(['https://x/b.mp3', 'https://x/c.mp3'])
  })

  it('reconnaît un son protégé donné en adresse relative', async () => {
    const c = fakeCache(250, { 'http://localhost/sounds/a.mp3': 100, 'http://localhost/sounds/b.mp3': 100 })
    const r = await putWithEviction(c, 'http://localhost/sounds/new.mp3', resp(100), ['/sounds/a.mp3'])
    expect(r.ok).toBe(true)
    expect(c.store.has('http://localhost/sounds/a.mp3')).toBe(true)
    expect(c.log.deleted).toEqual(['http://localhost/sounds/b.mp3'])
  })

  it('abandonne sans erreur quand tout ce qui reste est protégé', async () => {
    const c = fakeCache(150, { 'https://x/a.mp3': 100 })
    const r = await putWithEviction(c, 'https://x/new.mp3', resp(100), ['https://x/a.mp3'])
    expect(r).toEqual({ ok: false, evicted: 0 })
    expect(c.store.has('https://x/a.mp3')).toBe(true)
  })

  it('abandonne quand même après avoir tout supprimé si le fichier ne tient pas du tout', async () => {
    const c = fakeCache(100, { 'https://x/a.mp3': 50, 'https://x/b.mp3': 50 })
    const r = await putWithEviction(c, 'https://x/huge.mp3', resp(500))
    expect(r.ok).toBe(false)
    expect(r.evicted).toBe(2)
  })

  it('une erreur qui n\'est pas un manque de place : abandon, rien n\'est supprimé', async () => {
    const c = fakeCache(1000, { 'https://x/a.mp3': 100 }, { putError: new TypeError('cache désactivé') })
    expect(await putWithEviction(c, 'https://x/new.mp3', resp(10))).toEqual({ ok: false, evicted: 0 })
    expect(c.log.deleted).toEqual([])
  })

  it('crée une nouvelle réponse à chaque tentative (le corps d\'une réponse ne se relit pas)', async () => {
    const c = fakeCache(300, { 'https://x/a.mp3': 150, 'https://x/b.mp3': 100 })
    let made = 0
    const r = await putWithEviction(c, 'https://x/new.mp3', () => { made++; return new Response(new Uint8Array(200)) })
    expect(r.ok).toBe(true)
    expect(made).toBeGreaterThan(1)
  })

  it('ne lève pas d\'erreur si cache.keys() est indisponible', async () => {
    const c = fakeCache(10, {}); c.keys = async () => { throw new Error('boom') }
    await expect(putWithEviction(c, 'https://x/n.mp3', resp(100))).resolves.toEqual({ ok: false, evicted: 0 })
  })

  it('un son déjà présent sous la même adresse est remplacé, pas supprimé par l\'éviction', async () => {
    const c = fakeCache(250, { 'https://x/a.mp3': 100, 'https://x/self.mp3': 100 })
    const r = await putWithEviction(c, 'https://x/self.mp3', resp(150))
    expect(r.ok).toBe(true)
    expect(c.log.deleted).not.toContain('https://x/self.mp3')
  })
})

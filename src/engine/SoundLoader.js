// Chargeur de sons d'ILi.
//
// POURQUOI : quand Howler télécharge lui-même un MP3 et que le réseau coupe, il bascule en
// silence en mode HTML5, où le panoramique stéréo ne fonctionne plus (vérifié dans son code).
// Ici, c'est NOUS qui téléchargeons le fichier (délai d'inactivité, nouvelles tentatives, cache
// du téléphone), puis on donne à Howler le fichier déjà en mémoire (URL blob:). Howler n'a plus
// aucun réseau à gérer : plus de bascule HTML5, la stéréo est garantie.
//
// `howlMap` ne contient QUE les sons chargés et décodés. AudioEngine ignore déjà un son absent
// de la Map : un son pas prêt est donc sauté au lieu d'être joué en retard.
//
// Ce module n'importe pas Howler : `createHowl` est fourni par l'appelant (facilite les tests).

export const DEFAULT_OPTIONS = {
  cacheName: 'ili-audio-v1',
  stallMs: 30000,            // abandon d'un essai si AUCUN octet n'arrive pendant ce délai
  attempts: 3,               // nombre d'essais de téléchargement par son
  retryDelaysMs: [1000, 3000],
  concurrency: 3,            // téléchargements en parallèle
  decodeMs: 60000,           // délai maximum de décodage par Howler
}

const FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm', 'flac']
const MIME = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', webm: 'audio/webm', flac: 'audio/flac' }

export function formatFromUrl(url) {
  const path = String(url ?? '').split(/[?#]/)[0]
  const m = /\.([a-z0-9]+)$/i.exec(path)
  const ext = m ? m[1].toLowerCase() : ''
  return FORMATS.includes(ext) ? ext : 'mp3'
}

function makeError(message, retryable) {
  const e = new Error(message)
  e.retryable = retryable
  return e
}
function abortError() {
  const e = new Error('annulé')
  e.name = 'AbortError'
  e.retryable = false
  return e
}
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const t = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve() }, ms)
    const onAbort = () => { clearTimeout(t); reject(abortError()) }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
function concat(parts, total) {
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

// Télécharge un fichier en entier. Abandonne si plus aucun octet n'arrive pendant `stallMs`
// (et non après un délai total : sur un réseau lent, un gros fichier doit pouvoir finir).
async function downloadBytes(url, { fetchImpl, stallMs, signal, onBytes }) {
  const ctrl = new AbortController()
  const onParentAbort = () => ctrl.abort()
  if (signal) {
    if (signal.aborted) throw abortError()
    signal.addEventListener('abort', onParentAbort, { once: true })
  }
  let timer = null
  let stalled = false
  const arm = () => {
    clearTimeout(timer)
    timer = setTimeout(() => { stalled = true; ctrl.abort() }, stallMs)
  }
  try {
    arm()
    const res = await fetchImpl(url, { signal: ctrl.signal })
    if (res.status !== 200) {
      // 206 (partiel) refusé : on veut le fichier complet.
      const retryable = res.status >= 500 || res.status === 408 || res.status === 429
      throw makeError(`HTTP ${res.status}`, retryable)
    }
    const encoded = res.headers.get('content-encoding')
    const expected = encoded ? null : Number(res.headers.get('content-length')) || null
    let bytes
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader()
      const parts = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        parts.push(value)
        received += value.length
        arm()
        if (onBytes) onBytes(value.length)
      }
      bytes = concat(parts, received)
    } else {
      bytes = new Uint8Array(await res.arrayBuffer())
      if (onBytes) onBytes(bytes.length)
    }
    if (bytes.length === 0) throw makeError('fichier vide', true)
    if (expected !== null && bytes.length !== expected) {
      throw makeError(`fichier incomplet (${bytes.length}/${expected} octets)`, true)
    }
    return bytes
  } catch (e) {
    if (signal?.aborted) throw abortError()
    if (stalled) throw makeError(`aucune donnée reçue pendant ${stallMs} ms`, true)
    if (e.retryable === undefined) e.retryable = true // erreur réseau (fetch a échoué)
    throw e
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onParentAbort)
  }
}

export class SoundLoader {
  constructor({ createHowl, fetchImpl, cacheStorage, createObjectURL, revokeObjectURL, ...options } = {}) {
    if (typeof createHowl !== 'function') throw new Error('SoundLoader : createHowl est obligatoire')
    this._createHowl = createHowl
    this._fetch = fetchImpl ?? ((...a) => globalThis.fetch(...a))
    this._caches = cacheStorage === undefined ? (globalThis.caches ?? null) : cacheStorage
    this._createObjectURL = createObjectURL ?? ((b) => URL.createObjectURL(b))
    this._revokeObjectURL = revokeObjectURL ?? ((u) => URL.revokeObjectURL(u))
    this._opt = { ...DEFAULT_OPTIONS, ...options }

    this.howlMap = new Map()      // id -> Howl (uniquement les sons chargés)
    this._status = new Map()      // id -> 'pending' | 'active' | 'loaded' | 'failed'
    this._sounds = new Map()      // id -> { id, url, loop }
    this._errors = new Map()      // id -> message (sons en échec)
    this._pending = []
    this._active = 0
    this._bytes = 0
    this._listeners = new Set()
    this._waiters = []
    this._abort = new AbortController()
    this._disposed = false
  }

  // Ajoute des sons à la file, dans l'ordre donné. Les sons déjà connus sont ignorés.
  start(sounds) {
    if (this._disposed) return
    for (const s of sounds) {
      if (!s || this._status.has(s.id)) continue
      this._sounds.set(s.id, s)
      this._status.set(s.id, 'pending')
      this._pending.push(s.id)
    }
    this._pump()
  }

  // Passe ces sons (encore en attente) en tête de file, dans l'ordre donné.
  prioritize(ids) {
    const wanted = ids.filter((id) => this._pending.includes(id))
    this._pending = [...wanted, ...this._pending.filter((id) => !wanted.includes(id))]
  }

  // Remet en file les sons en échec (ex. : le réseau est revenu).
  retryFailed() {
    if (this._disposed) return
    for (const [id, st] of this._status) {
      if (st === 'failed') {
        this._status.set(id, 'pending')
        this._errors.delete(id)
        this._pending.push(id)
      }
    }
    this._pump()
  }

  // Résolu quand tous ces sons sont chargés OU définitivement en échec (jamais rejeté).
  whenSettled(ids) {
    return new Promise((resolve) => {
      this._waiters.push({ ids, resolve })
      this._checkWaiters()
    })
  }

  on(fn) {
    this._listeners.add(fn)
    return () => this._listeners.delete(fn)
  }

  stats() {
    const c = { pending: 0, active: 0, loaded: 0, failed: 0 }
    for (const st of this._status.values()) c[st]++
    return { total: this._status.size, ...c, bytes: this._bytes }
  }

  status(id) { return this._status.get(id) ?? null }
  errorOf(id) { return this._errors.get(id) ?? null }

  // Libère tout : annule les téléchargements, décharge les sons (mémoire décodée).
  dispose() {
    if (this._disposed) return
    this._disposed = true
    this._abort.abort()
    for (const howl of this.howlMap.values()) {
      try { howl.unload() } catch { /* rien */ }
    }
    this.howlMap.clear()
    this._pending = []
    this._listeners.clear()
    this._checkWaiters(true)
  }

  // ───────── interne ─────────
  _emit(event) {
    for (const fn of [...this._listeners]) {
      try { fn(event) } catch { /* un écouteur fautif ne doit pas bloquer le chargeur */ }
    }
  }

  _checkWaiters(force = false) {
    this._waiters = this._waiters.filter((w) => {
      const done = force || w.ids.every((id) => {
        const st = this._status.get(id)
        return st === undefined || st === 'loaded' || st === 'failed'
      })
      if (done) w.resolve()
      return !done
    })
  }

  _pump() {
    while (!this._disposed && this._active < this._opt.concurrency && this._pending.length > 0) {
      const id = this._pending.shift()
      this._active++
      this._status.set(id, 'active')
      this._run(id).finally(() => {
        this._active--
        this._pump()
        this._checkWaiters()
      })
    }
  }

  async _run(id) {
    const sound = this._sounds.get(id)
    try {
      const howl = await this._loadOne(sound)
      if (this._disposed) { if (howl) { try { howl.unload() } catch { /* rien */ } } return }
      this.howlMap.set(id, howl)
      this._status.set(id, 'loaded')
      this._emit({ type: 'loaded', id })
    } catch (e) {
      if (this._disposed) return
      this._status.set(id, 'failed')
      this._errors.set(id, e.message)
      this._emit({ type: 'failed', id, error: e.message })
    }
  }

  async _loadOne(sound) {
    // 1) Octets : cache du téléphone d'abord, sinon réseau.
    let bytes = await this._readCache(sound.url)
    const fromCache = bytes !== null
    if (bytes === null) bytes = await this._download(sound)
    // 2) Décodage par Howler. Si le fichier venait du cache et ne se décode pas, il est
    //    peut-être abîmé : on le supprime du cache et on retélécharge une fois.
    try {
      return await this._decode(sound, bytes)
    } catch (e) {
      if (!fromCache || this._disposed) throw e
      await this._deleteCache(sound.url)
      bytes = await this._download(sound)
      return await this._decode(sound, bytes)
    }
  }

  async _download(sound) {
    const { attempts, retryDelaysMs, stallMs } = this._opt
    let lastError = null
    for (let i = 0; i < attempts; i++) {
      try {
        const bytes = await downloadBytes(sound.url, {
          fetchImpl: this._fetch,
          stallMs,
          signal: this._abort.signal,
          onBytes: (n) => { this._bytes += n },
        })
        await this._writeCache(sound.url, bytes)
        return bytes
      } catch (e) {
        lastError = e
        if (!e.retryable || i === attempts - 1) break
        await wait(retryDelaysMs[Math.min(i, retryDelaysMs.length - 1)] ?? 1000, this._abort.signal)
      }
    }
    throw lastError ?? makeError('téléchargement impossible', false)
  }

  async _decode(sound, bytes) {
    const format = formatFromUrl(sound.url)
    const objectUrl = this._createObjectURL(new Blob([bytes], { type: MIME[format] }))
    let timer = null
    try {
      const howl = await new Promise((resolve, reject) => {
        // html5:false est écrit en dur : jamais de mode HTML5 (stéréo obligatoire).
        const h = this._createHowl({
          src: [objectUrl],
          format: [format],
          html5: false,
          preload: true,
          loop: Boolean(sound.loop),
        })
        let finished = false
        const ok = () => { if (!finished) { finished = true; resolve(h) } }
        const ko = (_id, err) => {
          if (finished) return
          finished = true
          try { h.unload() } catch { /* rien */ }
          reject(makeError(`décodage impossible : ${err ?? 'erreur inconnue'}`, false))
        }
        h.once('load', ok)
        h.once('loaderror', ko)
        if (h.state() === 'loaded') ok()
        timer = setTimeout(() => ko(null, `délai de ${this._opt.decodeMs} ms dépassé`), this._opt.decodeMs)
      })
      // Garde-fou : si malgré tout Howler est en mode HTML5, ce son serait sans stéréo.
      if (howl._html5 === true) {
        try { howl.unload() } catch { /* rien */ }
        throw makeError('son en mode HTML5 refusé (stéréo impossible)', false)
      }
      return howl
    } finally {
      clearTimeout(timer)
      this._revokeObjectURL(objectUrl)
    }
  }

  async _openCache() {
    if (!this._caches) return null
    try { return await this._caches.open(this._opt.cacheName) } catch { return null }
  }
  async _readCache(url) {
    try {
      const cache = await this._openCache()
      const res = cache ? await cache.match(url) : null
      if (!res) return null
      const buf = new Uint8Array(await res.arrayBuffer())
      return buf.length > 0 ? buf : null
    } catch { return null }
  }
  async _writeCache(url, bytes) {
    try {
      const cache = await this._openCache()
      if (cache) await cache.put(url, new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } }))
    } catch { /* espace insuffisant ou cache indisponible : on continue sans cache */ }
  }
  async _deleteCache(url) {
    try {
      const cache = await this._openCache()
      if (cache) await cache.delete(url)
    } catch { /* rien */ }
  }
}

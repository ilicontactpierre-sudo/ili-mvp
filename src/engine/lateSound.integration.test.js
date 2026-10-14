// Ce fichier plante en environnement Node "pur" car AudioEngine.wait() utilise
// window.setTimeout. On fournit un window minimal plutôt que de dépendre de jsdom
// (pas de nouvelle dépendance à installer, pas d'impact sur les autres tests).
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis
}

import { describe, it, expect } from 'vitest'
import AudioEngine from './AudioEngine.js'
import { SoundLoader } from './SoundLoader.js'
import { startLateSound } from '../utils/startLateSound.js'

// ── Mock de Howl ────────────────────────────────────────────────────────────
// Reproduit le sous-ensemble de l'API réelle de Howler.js utilisé par AudioEngine :
// play, stop, volume(v?, id?), loop(l?, id?), fade, stereo, on/off/once, state, playing, duration.
// C'est une reconstruction fidèle à la documentation, PAS la vraie librairie —
// à confirmer par un test manuel réel (écoute) avant de merger, comme prévu
// dans les règles permanentes pour cette zone sensible.
class MockHowl {
  constructor({ duration = 5, startDelayMs = 0 } = {}) {
    this._duration = duration
    this._startDelayMs = startDelayMs // permet de simuler un son qui ne joue pas encore au moment du fadeOut
    this._nextId = 1
    this._playingIds = new Set()
    this._volumes = new Map()
    this._loops = new Map()
    this._stereoVal = 0
    this._globalVolume = 1
    this._globalLoop = false
    this._listeners = new Map()
    this._state = 'loaded'
    this.calls = []
  }
  state() { return this._state }
  duration() { return this._duration }
  play(sprite) {
    const id = this._nextId++
    this._volumes.set(id, this._globalVolume)
    this._loops.set(id, this._globalLoop)
    this.calls.push({ fn: 'play', args: [sprite], id })
    setTimeout(() => {
      this._playingIds.add(id)
      this._emit('play', id)
    }, this._startDelayMs)
    return id
  }
  playing(id) { return this._playingIds.has(id) }
  stop(id) {
    this.calls.push({ fn: 'stop', args: [id] })
    if (id != null) this._playingIds.delete(id)
    else this._playingIds.clear()
  }
  volume(v, id) {
    if (v === undefined) {
      if (id != null) return this._volumes.has(id) ? this._volumes.get(id) : this._globalVolume
      return this._globalVolume
    }
    this.calls.push({ fn: 'volume', args: [v, id] })
    if (id != null) this._volumes.set(id, v)
    else this._globalVolume = v
    return this
  }
  loop(l, id) {
    if (l === undefined) return id != null ? this._loops.get(id) : this._globalLoop
    if (id != null) this._loops.set(id, l)
    else this._globalLoop = l
    return this
  }
  fade(from, to, duration, id) {
    this.calls.push({ fn: 'fade', args: [from, to, duration, id] })
    this.volume(from, id)
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(1, elapsed / duration)
      this.volume(from + (to - from) * t, id)
      if (t >= 1) this._emit('fade', id)
      else setTimeout(tick, 16)
    }
    setTimeout(tick, 16)
  }
  stereo(pan) {
    if (pan === undefined) return this._stereoVal
    this.calls.push({ fn: 'stereo', args: [pan] })
    this._stereoVal = pan
    return this
  }
  on(event, cb) {
    if (!this._listeners.has(event)) this._listeners.set(event, [])
    this._listeners.get(event).push(cb)
    return this
  }
  off(event) {
    if (!event) { this._listeners.clear(); return this }
    this._listeners.delete(event)
    return this
  }
  once(event, cb, id) {
    if (!this._listeners.has(event)) this._listeners.set(event, [])
    const wrapper = (firedId) => {
      if (id != null && firedId !== id) return
      const arr = this._listeners.get(event) || []
      this._listeners.set(event, arr.filter((f) => f !== wrapper))
      cb(firedId)
    }
    this._listeners.get(event).push(wrapper)
    return this
  }
  _emit(event, id) {
    const arr = (this._listeners.get(event) || []).slice()
    arr.forEach((cb) => cb(id))
  }
}


// Howl de test utilisable par le chargeur ET par le moteur
class LoadableHowl extends MockHowl {
  constructor(opts) {
    super()
    this.opts = opts
    this._html5 = false
    this._st = 'loading'
    this.h = {}
    this.unloaded = false
    queueMicrotask(() => { this._st = 'loaded'; if (this.h.load) this.h.load() })
  }
  once(e, f) { this.h[e] = f }
  state() { return this._st }
  unload() { this.unloaded = true }
}

const segs = Array.from({ length: 10 }, (_, i) => ({ id: `seg${i}` }))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const plays = (howl) => howl.calls.filter((c) => c.fn === 'play').length

// Faux réseau : chaque fichier attend qu'on le « libère » (simule l'arrivée tardive).
function setup() {
  const gates = {}
  const fetchImpl = (url) => new Promise((resolve) => {
    gates[url.split('/').pop().replace('.mp3', '')] = () =>
      resolve(new Response(new Uint8Array(50), { status: 200, headers: { 'content-length': '50' } }))
  })
  const loader = new SoundLoader({
    createHowl: (o) => new LoadableHowl(o), fetchImpl, cacheStorage: null,
    createObjectURL: () => 'blob:x', revokeObjectURL: () => {},
  })
  const sounds = ['amb', 'bed', 'hit'].map((id) => ({ id, url: `https://x.test/${id}.mp3` }))
  const tracks = [
    { id: 'tAmb', soundId: 'amb', startSegmentId: 'seg1', endSegmentId: 'seg3', loop: true, fadeIn: 40, volume: 0.8 },
    { id: 'tBed', soundId: 'bed', startSegmentId: 'seg1', endSegmentId: 'seg3', loop: false, volume: 0.5 },
    { id: 'tHit', soundId: 'hit', startSegmentId: 'seg2', endSegmentId: 'seg2', loop: false, volume: 1 },
  ]
  loader.start(sounds)
  const engine = new AudioEngine(loader.howlMap)
  let sync = null
  loader.on((e) => { if (e.type === 'loaded') startLateSound(engine, sync, e.id) })
  const goTo = async (i) => {
    engine.onSegmentChange(i, tracks, segs)
    sync = { index: i, soundTracks: tracks, segments: segs }
    await wait(5) // laisse passer le minuteur de démarrage normal du moteur (son absent : rien ne joue)
  }
  const release = async (id) => { gates[id](); await wait(20) }
  return { loader, engine, goTo, release }
}

describe('chargeur + moteur : un son qui arrive en retard', () => {
  it('une boucle qui arrive pendant son bloc démarre en retard, avec son fadeIn, et reste en stéréo Web Audio', async () => {
    const { loader, engine, goTo, release } = setup()
    await wait(5)
    await goTo(1)                                   // rien n'est chargé : silence, pas d'erreur
    expect(engine.playingSounds.size).toBe(0)
    await release('amb')
    expect(engine.playingSounds.has('tAmb')).toBe(true)
    const howl = loader.howlMap.get('amb')
    expect(howl.opts.html5).toBe(false)
    const id = engine.playingSounds.get('tAmb').instanceId
    await wait(150)
    expect(howl.volume(undefined, id)).toBeCloseTo(0.64, 2) // fadeIn terminé au volume voulu
  })

  it('un bloc non-boucle de plusieurs segments démarre aussi en retard, tant que le lecteur est dans le bloc', async () => {
    const { engine, goTo, release } = setup()
    await wait(5)
    await goTo(1)
    await goTo(2)
    await release('bed')
    expect(engine.playingSounds.has('tBed')).toBe(true)
  })

  it('un effet d\'un seul segment qui arrive en retard n\'est jamais joué, même si le lecteur est encore sur son segment', async () => {
    const { loader, engine, goTo, release } = setup()
    await wait(5)
    await goTo(1)
    await goTo(2)
    await release('hit')
    expect(engine.playingSounds.has('tHit')).toBe(false)
    expect(plays(loader.howlMap.get('hit'))).toBe(0)
  })

  it('un son qui arrive après la fin de son bloc n\'est pas joué', async () => {
    const { loader, engine, goTo, release } = setup()
    await wait(5)
    await goTo(1); await goTo(2); await goTo(3); await goTo(4)
    await release('amb')
    expect(engine.playingSounds.has('tAmb')).toBe(false)
    expect(plays(loader.howlMap.get('amb'))).toBe(0)
  })

  it('tant que le moteur n\'est pas démarré (sync absent), un son qui arrive ne déclenche rien', async () => {
    const { engine, release } = setup()
    await wait(5)
    await release('amb')
    expect(engine.playingSounds.size).toBe(0)
  })

  it('après le démarrage tardif, le passage au segment suivant ne relance pas le son', async () => {
    const { loader, goTo, release } = setup()
    await wait(5)
    await goTo(1)
    await release('amb')
    await goTo(2)
    expect(plays(loader.howlMap.get('amb'))).toBe(1)
  })
})

describe('startLateSound', () => {
  it('ne fait rien sans moteur ou sans état', () => {
    expect(() => startLateSound(null, { index: 0 }, 'a')).not.toThrow()
    expect(() => startLateSound({ onSoundReady() { throw new Error('ne doit pas être appelé') } }, null, 'a')).not.toThrow()
  })
  it('passe les arguments au moteur dans le bon ordre', () => {
    const calls = []
    startLateSound({ onSoundReady: (...a) => calls.push(a) }, { index: 4, soundTracks: ['T'], segments: ['S'] }, 'snd')
    expect(calls).toEqual([['snd', 4, ['T'], ['S']]])
  })
})

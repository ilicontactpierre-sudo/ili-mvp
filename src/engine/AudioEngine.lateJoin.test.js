// Ce fichier plante en environnement Node "pur" car AudioEngine.wait() utilise
// window.setTimeout. On fournit un window minimal plutôt que de dépendre de jsdom
// (pas de nouvelle dépendance à installer, pas d'impact sur les autres tests).
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis
}

import { describe, it, expect } from 'vitest'
import AudioEngine from './AudioEngine.js'

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


const segs = Array.from({ length: 10 }, (_, i) => ({ id: `seg${i}` }))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const plays = (howl) => howl.calls.filter((c) => c.fn === 'play').length

function setup(trackProps = {}, { sound = 'amb' } = {}) {
  const howl = new MockHowl()
  const engine = new AudioEngine(new Map([[sound, howl]]))
  const track = {
    id: 'tA', soundId: sound, startSegmentId: 'seg1', endSegmentId: 'seg3',
    volume: 0.8, loop: false, ...trackProps,
  }
  return { howl, engine, track }
}

describe('onSoundReady — son arrivé en retard', () => {
  it('bloc de plusieurs segments : démarre en retard avec son fadeIn d\'origine, jusqu\'au volume voulu', async () => {
    const { howl, engine, track } = setup({ fadeIn: 60 })
    engine.onSoundReady('amb', 2, [track], segs)
    expect(engine.playingSounds.has('tA')).toBe(true)
    expect(plays(howl)).toBe(1)
    const id = engine.playingSounds.get('tA').instanceId
    expect(howl.calls.some((c) => c.fn === 'volume' && c.args[0] === 0 && c.args[1] === id)).toBe(true) // part de 0
    await wait(200)
    expect(howl.volume(undefined, id)).toBeCloseTo(0.64, 2) // 0.8 -> courbe perceptuelle 0.64
  })

  it('sans fadeIn : démarre tout de suite au volume voulu à CE segment (automation comprise)', () => {
    const { howl, engine, track } = setup({
      volume: 0.8,
      automationPoints: [{ segmentId: 'seg2', volume: 0.3 }, { segmentId: 'seg3', volume: 0.6 }],
    })
    engine.onSoundReady('amb', 2, [track], segs)
    const id = engine.playingSounds.get('tA').instanceId
    expect(howl.volume(undefined, id)).toBeCloseTo(0.09, 3) // 0.3 -> 0.09
  })

  it('bloc non-boucle de plusieurs segments : peut démarrer en retard', () => {
    const { engine, track } = setup({ loop: false })
    engine.onSoundReady('amb', 3, [track], segs) // dernier segment du bloc
    expect(engine.playingSounds.has('tA')).toBe(true)
  })

  it('boucle de plusieurs segments : démarre en retard', () => {
    const { engine, track } = setup({ loop: true, fadeIn: 50 })
    engine.onSoundReady('amb', 1, [track], segs)
    expect(engine.playingSounds.get('tA').loop).toBe(true)
  })

  it('si le lecteur a dépassé la fin du bloc : ne démarre pas', () => {
    const { howl, engine, track } = setup()
    engine.onSoundReady('amb', 4, [track], segs)
    expect(engine.playingSounds.has('tA')).toBe(false)
    expect(plays(howl)).toBe(0)
  })

  it('si le lecteur n\'est pas encore arrivé au bloc : ne démarre pas', () => {
    const { howl, engine, track } = setup()
    engine.onSoundReady('amb', 0, [track], segs)
    expect(plays(howl)).toBe(0)
  })

  it('effet ponctuel (un seul segment, sans boucle) : annulé, même si le lecteur est sur ce segment', () => {
    const a = setup({ startSegmentId: 'seg2', endSegmentId: 'seg2', loop: false })
    a.engine.onSoundReady('amb', 2, [a.track], segs)
    expect(plays(a.howl)).toBe(0)
    const b = setup({ startSegmentId: 'seg2', endSegmentId: undefined, loop: false })
    b.engine.onSoundReady('amb', 2, [b.track], segs)
    expect(plays(b.howl)).toBe(0)
  })

  it('boucle sur un seul segment : démarre', () => {
    const { engine, track } = setup({ startSegmentId: 'seg2', endSegmentId: 'seg2', loop: true })
    engine.onSoundReady('amb', 2, [track], segs)
    expect(engine.playingSounds.has('tA')).toBe(true)
  })

  it('ne démarre pas deux fois un bloc déjà en cours, ni après un onSegmentChange', () => {
    const { howl, engine, track } = setup()
    engine.onSoundReady('amb', 2, [track], segs)
    engine.onSoundReady('amb', 2, [track], segs)
    engine.onSegmentChange(3, [track], segs)
    expect(plays(howl)).toBe(1)
  })

  it('avec un fadeIn aussi : un second appel ne relance ni ne refait glisser le volume du bloc en cours', () => {
    const { howl, engine, track } = setup({ fadeIn: 60 })
    engine.onSoundReady('amb', 2, [track], segs)
    engine.onSoundReady('amb', 2, [track], segs)
    expect(plays(howl)).toBe(1)
    expect(howl.calls.some((c) => c.fn === 'fade')).toBe(false)
  })

  it('ignore les blocs muets ou cassés et les blocs d\'un autre son', () => {
    const { howl, engine, track } = setup()
    const autre = { ...track, id: 'tB', soundId: 'autre' }
    engine.onSoundReady('amb', 2, [{ ...track, muted: true }, { ...track, id: 'tC', broken: true }, autre], segs)
    expect(plays(howl)).toBe(0)
  })

  it('ne fait rien (sans erreur) si le son n\'est pas dans la Map ou si le segment de départ est introuvable', () => {
    const { engine, track } = setup()
    expect(() => engine.onSoundReady('inconnu', 2, [{ ...track, soundId: 'inconnu' }], segs)).not.toThrow()
    expect(() => engine.onSoundReady('amb', 2, [{ ...track, startSegmentId: 'nope' }], segs)).not.toThrow()
    expect(engine.playingSounds.size).toBe(0)
  })

  it('conserve la stéréo : le panoramique du bloc est appliqué au démarrage tardif', () => {
    const { howl, engine, track } = setup({ pan: -1, panMode: 'static' })
    engine.onSoundReady('amb', 2, [track], segs)
    expect(howl.calls.some((c) => c.fn === 'stereo' && c.args[0] === -1)).toBe(true)
  })
})

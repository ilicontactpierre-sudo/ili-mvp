// Ce fichier plante en environnement Node "pur" car AudioEngine.wait() utilise
// window.setTimeout. On fournit un window minimal plutôt que de dépendre de jsdom
// (pas de nouvelle dépendance à installer, pas d'impact sur les autres tests).
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis
}

import { describe, it, expect, beforeEach } from 'vitest'
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

function makeSegments(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `seg${i}` }))
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ═════════════════════════════════════════════════════════════════════════
// A. Volume perceptuel — la formule au cœur de tout le reste
// ═════════════════════════════════════════════════════════════════════════
describe('_toPerceptualVolume', () => {
  let engine
  beforeEach(() => { engine = new AudioEngine(new Map()) })

  it('applique la courbe quadratique (0.5 linéaire -> 0.25 perceptuel) sans gain ni master modifiés', () => {
    expect(engine._toPerceptualVolume(0.5, 0)).toBeCloseTo(0.25, 5)
  })

  it('applique le gainDb avant la courbe (-10dB ~ x0.316 en linéaire, donc ~0.1 au carré)', () => {
    expect(engine._toPerceptualVolume(1, -10)).toBeCloseTo(0.1, 2)
  })

  it('reste toujours dans [0,1] même si gainDb est élevé (le clamp final protège Howler)', () => {
    const v = engine._toPerceptualVolume(1, 10) // dbToLinear(10)~3.16, au carré ~10 sans clamp
    expect(v).toBeLessThanOrEqual(1)
    expect(v).toBe(1)
  })

  it('le masterVolume multiplie avant la mise au carré, pas après', () => {
    engine.masterVolume = 0.5
    expect(engine._toPerceptualVolume(0.5, 0)).toBeCloseTo(0.0625, 5) // (0.5*0.5)^2
  })
})

// ═════════════════════════════════════════════════════════════════════════
// B. playSound / stopSound — comportements de base
// ═════════════════════════════════════════════════════════════════════════
describe('playSound / stopSound', () => {
  it('démarre un son et applique le volume perceptuel correct sur l\'instance', () => {
    const howl = new MockHowl()
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', volume: 0.5, gainDb: 0 })
    const state = engine.playingSounds.get('t1')
    expect(state).toBeDefined()
    expect(howl.volume(undefined, state.instanceId)).toBeCloseTo(0.25, 5)
  })

  it('un second playSound sur la même clé pendant que ça joue est un no-op silencieux', () => {
    const howl = new MockHowl()
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', volume: 0.5 })
    const firstInstance = engine.playingSounds.get('t1').instanceId
    engine.playSound({ trackId: 't1', soundId: 's1', volume: 0.9 })
    expect(engine.playingSounds.get('t1').instanceId).toBe(firstInstance)
    expect(howl.calls.filter((c) => c.fn === 'play')).toHaveLength(1)
  })

  it('stopSound arrête l\'instance en cours et nettoie le state', () => {
    const howl = new MockHowl()
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1' })
    const instanceId = engine.playingSounds.get('t1').instanceId
    engine.stopSound('s1', 't1')
    expect(engine.playingSounds.has('t1')).toBe(false)
    expect(howl.calls.some((c) => c.fn === 'stop' && c.args[0] === instanceId)).toBe(true)
  })

  it('stopSound sans state connu retombe sur un stop() global via le howlMap', () => {
    const howl = new MockHowl()
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.stopSound('s1') // rien ne joue selon playingSounds
    expect(howl.calls.some((c) => c.fn === 'stop' && c.args[0] === undefined)).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// C. fadeInSound / fadeOutSound
// ═════════════════════════════════════════════════════════════════════════
describe('fadeInSound', () => {
  it('démarre à volume 0 puis ramène au volume cible seulement après l\'event "play"', async () => {
    const howl = new MockHowl({ startDelayMs: 20 })
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.fadeInSound({ trackId: 't1', soundId: 's1', volume: 1, duration: 100 })
    const instanceId = engine.playingSounds.get('t1').instanceId
    expect(howl.volume(undefined, instanceId)).toBe(0) // immédiat, avant même le "play"
    await wait(200)
    expect(howl.volume(undefined, instanceId)).toBeCloseTo(1, 3)
  })

  it('si le son joue déjà, fade vers le nouveau volume via howl.fade (pas un redémarrage)', () => {
    const howl = new MockHowl()
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', volume: 0.2 })
    engine.fadeInSound({ trackId: 't1', soundId: 's1', volume: 0.8, duration: 300 })
    expect(howl.calls.filter((c) => c.fn === 'play')).toHaveLength(1) // pas de 2e play()
    expect(howl.calls.some((c) => c.fn === 'fade')).toBe(true)
  })
})

describe('fadeOutSound', () => {
  it('si le son joue déjà, fade puis stoppe après duration+32ms', async () => {
    const howl = new MockHowl({ startDelayMs: 0 })
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', volume: 1 })
    const instanceId = engine.playingSounds.get('t1').instanceId
    await wait(5) // laisser l'event 'play' se déclencher, playing() doit devenir true
    engine.fadeOutSound({ trackId: 't1', soundId: 's1', duration: 50 })
    expect(howl.calls.some((c) => c.fn === 'stop')).toBe(false) // pas encore stoppé
    await wait(120)
    expect(howl.calls.some((c) => c.fn === 'stop')).toBe(true)
    expect(howl.volume(undefined, instanceId)).toBe(0)
  })

  it('si le son n\'a pas encore démarré, attend l\'event "play" avant de lancer le fade', async () => {
    const howl = new MockHowl({ startDelayMs: 60 })
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', volume: 1 })
    engine.fadeOutSound({ trackId: 't1', soundId: 's1', duration: 50 })
    expect(howl.calls.some((c) => c.fn === 'fade' || c.fn === 'stop')).toBe(false)
    await wait(200)
    expect(howl.calls.some((c) => c.fn === 'stop')).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// D. Crossfade de loop
// ═════════════════════════════════════════════════════════════════════════
describe('crossfade de loop', () => {
  it('si le bloc est plus court que le crossfade choisi, aucun crossfade n\'est programmé (loop natif)', () => {
    const howl = new MockHowl({ duration: 0.3 }) // 300ms < 600ms (medium)
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', loop: true, loopCrossfade: 'medium' })
    const state = engine.playingSounds.get('t1')
    expect(state._loopTimeout).toBeUndefined()
    expect(howl.loop(undefined, state.instanceId)).toBe(true)
  })

  it('un crossfade complet change bien d\'instance en cours de route', async () => {
    const howl = new MockHowl({ duration: 0.15 }) // trimEnd donnera 250ms de bloc utile
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', loop: true, loopCrossfade: 'medium', trimEnd: 700 })
    const firstInstance = engine.playingSounds.get('t1').instanceId
    await wait(150) // crossfade programmé à 700-600=100ms
    expect(engine.playingSounds.get('t1').instanceId).not.toBe(firstInstance)
  })

  it('stopSound annule le crossfade programmé (pas de nouvelle instance après coup)', async () => {
    const howl = new MockHowl({ duration: 0.15 })
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', loop: true, loopCrossfade: 'medium', trimEnd: 700 })
    engine.stopSound('s1', 't1')
    const playCountAfterStop = howl.calls.filter((c) => c.fn === 'play').length
    await wait(150)
    expect(howl.calls.filter((c) => c.fn === 'play').length).toBe(playCountAfterStop)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// E. onSegmentChange — le cœur du sujet (AudioEvents + SoundTracks)
// ═════════════════════════════════════════════════════════════════════════
describe('onSegmentChange — démarrage à froid en milieu de bloc', () => {
  it('applique le volume automatisé exact en un seul coup, sans aucun fade parasite', () => {
    const segments = makeSegments(6)
    const howl = new MockHowl({ duration: 20 })
    const engine = new AudioEngine(new Map([['ambiance', howl]]))
    const track = {
      id: 'trackA', soundId: 'ambiance', volume: 0.5,
      startSegmentId: 'seg0', endSegmentId: 'seg5', loop: true, loopCrossfade: 'none',
      automationPoints: [
        { segmentId: 'seg1', volume: 0.8 },
        { segmentId: 'seg3', volume: 0.2, fadeMs: 500 },
      ],
    }
    engine.onSegmentChange(4, [track], segments) // on saute directement au segment 4
    const state = engine.playingSounds.get('trackA')
    expect(state.volume).toBe(0.2) // dernier point <= index 4
    expect(howl.calls.filter((c) => c.fn === 'volume')).toHaveLength(1) // un seul set, pas de rampe
    expect(howl.calls.some((c) => c.fn === 'fade')).toBe(false)
    expect(howl.volume(undefined, state.instanceId)).toBeCloseTo(engine._toPerceptualVolume(0.2, 0), 5)
  })

  it('ignore complètement le fadeIn/delay configuré sur le track lors d\'un démarrage à froid', () => {
    const segments = makeSegments(4)
    const howl = new MockHowl({ duration: 10 })
    const engine = new AudioEngine(new Map([['amb', howl]]))
    const track = {
      id: 'trackB', soundId: 'amb', volume: 0.5,
      startSegmentId: 'seg0', endSegmentId: 'seg3',
      fadeIn: 2000, delay: 5000,
    }
    engine.onSegmentChange(2, [track], segments)
    // Si delay/fadeIn étaient respectés, rien ne serait joué avant plusieurs secondes.
    expect(engine.playingSounds.has('trackB')).toBe(true)
    expect(howl.calls.some((c) => c.fn === 'play')).toBe(true)
  })

  it('ne réapplique pas de fade au prochain onSegmentChange si rien n\'a changé (idempotent)', () => {
    const segments = makeSegments(6)
    const howl = new MockHowl({ duration: 20 })
    const engine = new AudioEngine(new Map([['ambiance', howl]]))
    const track = {
      id: 'trackA', soundId: 'ambiance', volume: 0.5,
      startSegmentId: 'seg0', endSegmentId: 'seg5',
      automationPoints: [{ segmentId: 'seg3', volume: 0.2 }],
    }
    engine.onSegmentChange(4, [track], segments)
    const callsBefore = howl.calls.length
    engine.onSegmentChange(4, [track], segments)
    expect(howl.calls.length).toBe(callsBefore)
  })
})

describe('onSegmentChange — démarrage normal et automation en cours de lecture', () => {
  it('démarre au premier segment en respectant fadeIn/delay (pas un cold start)', async () => {
    const segments = makeSegments(3)
    const howl = new MockHowl({ duration: 10, startDelayMs: 0 })
    const engine = new AudioEngine(new Map([['amb', howl]]))
    const track = { id: 'trackC', soundId: 'amb', volume: 1, startSegmentId: 'seg0', endSegmentId: 'seg2', fadeIn: 30 }
    engine.onSegmentChange(0, [track], segments)
    expect(engine.playingSounds.has('trackC')).toBe(false) // encore dans le setTimeout(delay=0) + fadeIn async
    await wait(60)
    expect(engine.playingSounds.has('trackC')).toBe(true)
  })

  it('une automation avec fadeMs=0 applique le volume immédiatement (curve "cut", pas de rampe)', async () => {
    const segments = makeSegments(3)
    const howl = new MockHowl({ duration: 10 })
    const engine = new AudioEngine(new Map([['amb', howl]]))
    const track = {
      id: 'trackD', soundId: 'amb', volume: 0.5, startSegmentId: 'seg0', endSegmentId: 'seg2',
      automationPoints: [{ segmentId: 'seg1', volume: 0.9 }], // pas de fadeMs -> 0 -> 'cut'
    }
    engine.onSegmentChange(0, [track], segments)
    // Découverte importante : même avec delay=0, le démarrage "normal" (pas le cold start)
    // passe par un setTimeout, donc il n'est PAS encore dans playingSounds au retour synchrone
    // de onSegmentChange — il faut laisser passer un tick avant de continuer.
    await wait(5)
    const instanceId = engine.playingSounds.get('trackD').instanceId
    howl.calls = []
    engine.onSegmentChange(1, [track], segments)
    expect(howl.calls.filter((c) => c.fn === 'volume')).toHaveLength(1) // set direct, pas de setInterval
    expect(howl.volume(undefined, instanceId)).toBeCloseTo(engine._toPerceptualVolume(0.9, 0), 5)
  })

  it('une automation avec fadeMs>0 fait une transition progressive (plusieurs volume() successifs)', async () => {
    const segments = makeSegments(3)
    const howl = new MockHowl({ duration: 10 })
    const engine = new AudioEngine(new Map([['amb', howl]]))
    const track = {
      id: 'trackE', soundId: 'amb', volume: 0.5, startSegmentId: 'seg0', endSegmentId: 'seg2',
      automationPoints: [{ segmentId: 'seg1', volume: 0.9, fadeMs: 160 }],
    }
    engine.onSegmentChange(0, [track], segments)
    await wait(5) // laisser le démarrage "normal" (setTimeout) s'exécuter avant d'enchaîner
    howl.calls = []
    engine.onSegmentChange(1, [track], segments)
    await wait(200)
    const volumeCalls = howl.calls.filter((c) => c.fn === 'volume')
    expect(volumeCalls.length).toBeGreaterThan(2) // rampe, pas un set unique
  })
})

describe('onSegmentChange — sortie de bloc (3 branches)', () => {
  it('avec fadeOut configuré, déclenche un vrai fondu au lieu d\'un stop sec', async () => {
    const segments = makeSegments(3)
    const howl = new MockHowl({ duration: 10 })
    const engine = new AudioEngine(new Map([['amb', howl]]))
    const track = { id: 'trackF', soundId: 'amb', volume: 1, startSegmentId: 'seg0', endSegmentId: 'seg0', fadeOut: 50 }
    engine.onSegmentChange(0, [track], segments)
    await wait(5)
    engine.onSegmentChange(1, [track], segments) // on sort du bloc
    expect(howl.calls.some((c) => c.fn === 'stop')).toBe(false) // pas encore, le fade vient de démarrer
    await wait(120)
    expect(howl.calls.some((c) => c.fn === 'stop')).toBe(true)
  })

  it('une boucle sans fadeOut est stoppée immédiatement (sinon elle jouerait à l\'infini)', async () => {
    const segments = makeSegments(3)
    const howl = new MockHowl({ duration: 10 })
    const engine = new AudioEngine(new Map([['amb', howl]]))
    const track = { id: 'trackG', soundId: 'amb', volume: 1, startSegmentId: 'seg0', endSegmentId: 'seg0', loop: true }
    engine.onSegmentChange(0, [track], segments)
    await wait(5) // laisser le démarrage (setTimeout) s'exécuter avant de sortir du bloc
    engine.onSegmentChange(1, [track], segments)
    expect(engine.playingSounds.has('trackG')).toBe(false)
    expect(howl.calls.some((c) => c.fn === 'stop')).toBe(true)
  })

  it('un one-shot sans fadeOut est laissé finir naturellement (retiré du suivi, pas stoppé de force)', async () => {
    const segments = makeSegments(3)
    const howl = new MockHowl({ duration: 10 })
    const engine = new AudioEngine(new Map([['amb', howl]]))
    const track = { id: 'trackH', soundId: 'amb', volume: 1, startSegmentId: 'seg0', endSegmentId: 'seg0' }
    engine.onSegmentChange(0, [track], segments)
    await wait(5) // s'assurer que le son est bien démarré avant de sortir du bloc
    engine.onSegmentChange(1, [track], segments)
    expect(engine.playingSounds.has('trackH')).toBe(false) // retiré du suivi
    expect(howl.calls.some((c) => c.fn === 'stop')).toBe(false) // mais pas stoppé de force
  })
})

// ═════════════════════════════════════════════════════════════════════════
// F. setMasterVolume / stopAll
// ═════════════════════════════════════════════════════════════════════════
describe('setMasterVolume', () => {
  it('met à jour immédiatement le volume de tous les sons en cours', () => {
    const howl = new MockHowl()
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', volume: 0.5 })
    engine.setMasterVolume(0.5)
    const instanceId = engine.playingSounds.get('t1').instanceId
    expect(howl.volume(undefined, instanceId)).toBeCloseTo(0.0625, 5) // (0.5*0.5)^2
  })

  it('clampe le master volume entre 0 et 2', () => {
    const engine = new AudioEngine(new Map())
    engine.setMasterVolume(5)
    expect(engine.masterVolume).toBe(2)
    engine.setMasterVolume(-1)
    expect(engine.masterVolume).toBe(0)
  })
})

describe('stopAll', () => {
  it('sans durée, stoppe tous les sons immédiatement', () => {
    const howl1 = new MockHowl()
    const howl2 = new MockHowl()
    const engine = new AudioEngine(new Map([['s1', howl1], ['s2', howl2]]))
    engine.playSound({ trackId: 't1', soundId: 's1' })
    engine.playSound({ trackId: 't2', soundId: 's2' })
    engine.stopAll()
    expect(engine.playingSounds.size).toBe(0)
    expect(howl1.calls.some((c) => c.fn === 'stop')).toBe(true)
    expect(howl2.calls.some((c) => c.fn === 'stop')).toBe(true)
  })

  it('avec une durée, fade puis stoppe via l\'event "fade"', async () => {
    const howl = new MockHowl()
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', volume: 1 })
    engine.stopAll(60)
    expect(howl.calls.some((c) => c.fn === 'stop')).toBe(false)
    await wait(120)
    expect(howl.calls.some((c) => c.fn === 'stop')).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// G. Pan
// ═════════════════════════════════════════════════════════════════════════
describe('spatialisation (pan)', () => {
  it('en mode static, applique stereo() une seule fois (pas d\'animation)', () => {
    const howl = new MockHowl()
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', pan: 0.4, panMode: 'static' })
    expect(howl.calls.filter((c) => c.fn === 'stereo')).toHaveLength(1)
    expect(howl.stereo()).toBe(0.4)
  })

  it('sweep-lr démarre à -1 et s\'arrête automatiquement une fois la durée écoulée', async () => {
    const howl = new MockHowl({ duration: 0.2 }) // 200ms
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', panMode: 'sweep-lr' })
    await wait(30)
    const firstStereo = howl.calls.filter((c) => c.fn === 'stereo')[0].args[0]
    expect(firstStereo).toBe(-1)
    await wait(250)
    const callsAfterEnd = howl.calls.filter((c) => c.fn === 'stereo').length
    await wait(50)
    // plus aucun nouvel appel stereo() une fois la trajectoire terminée
    expect(howl.calls.filter((c) => c.fn === 'stereo').length).toBe(callsAfterEnd)
  })

  it('oscillate-fast ne s\'arrête jamais seul (continue au-delà de la durée du son)', async () => {
    const howl = new MockHowl({ duration: 0.05 }) // 50ms, très court
    const engine = new AudioEngine(new Map([['s1', howl]]))
    engine.playSound({ trackId: 't1', soundId: 's1', panMode: 'oscillate-fast' })
    await wait(30)
    const callsAt30 = howl.calls.filter((c) => c.fn === 'stereo').length
    await wait(60) // bien après la "durée" de 50ms
    const callsAt90 = howl.calls.filter((c) => c.fn === 'stereo').length
    expect(callsAt90).toBeGreaterThan(callsAt30) // toujours actif
  })
})

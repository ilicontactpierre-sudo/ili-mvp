class AudioEngine {
  constructor(howlMap) {
    this.howlMap = howlMap
    this.playingSounds = new Map()
    // Stocke le token du fade actif par soundId
    this._fadeTokens = new Map()
  }

  async executeEvents(audioEvents = []) {
    for (const event of audioEvents) {
      const delay = Number(event?.delay) || 0
      if (delay > 0) {
        await this.wait(delay)
      }
      this.executeEvent(event)
    }
  }

  executeEvent(event) {
    if (!event || !event.action) return

    if (event.action === 'play')     return this.playSound(event)
    if (event.action === 'stop')     return this.stopSound(event.soundId)
    if (event.action === 'fadeIn')   return this.fadeInSound(event)
    if (event.action === 'fadeOut')  return this.fadeOutSound(event)
    if (event.action === 'volume')   return this.setSoundVolume(event)
  }

  playSound({ soundId, volume = 1, loop }) {
    if (!soundId || this.playingSounds.has(soundId)) return

    const howl = this.howlMap.get(soundId)
    if (!howl) return

    howl.loop(Boolean(loop))
    howl.volume(volume)
    howl.play()
    this.playingSounds.set(soundId, { howl, volume })
  }

  stopSound(soundId) {
    // Annule tout fade en cours sur ce son
    this._fadeTokens.delete(soundId)

    const soundState = this.playingSounds.get(soundId)
    if (soundState) {
      soundState.howl.stop()
      this.playingSounds.delete(soundId)
      return
    }

    const howl = this.howlMap.get(soundId)
    if (howl) howl.stop()
  }

  fadeInSound({ soundId, volume = 1, duration = 400, loop }) {
    if (!soundId) return

    const howl = this.howlMap.get(soundId)
    if (!howl) return

    // Nouveau token : annule le fade-out précédent s'il y en avait un
    const token = Symbol()
    this._fadeTokens.set(soundId, token)

    if (this.playingSounds.has(soundId)) {
      // Son déjà en cours (ex: fade-out interrompu) → on repart de son volume actuel
      const currentVolume = howl.volume()
      howl.fade(currentVolume, volume, duration)
    } else {
      howl.loop(Boolean(loop))
      howl.volume(0)
      howl.play()
      howl.fade(0, volume, duration)
    }

    this.playingSounds.set(soundId, { howl, volume })
    // Pas de callback stop ici : le fade-in ne stoppe jamais le son
  }

  fadeOutSound({ soundId, duration = 400 }) {
    if (!soundId) return

    const soundState = this.playingSounds.get(soundId)
    const howl = soundState?.howl ?? this.howlMap.get(soundId)
    if (!howl) return

    // Token unique pour ce fade-out
    const token = Symbol()
    this._fadeTokens.set(soundId, token)

    const fromVolume = howl.volume()

    howl.once('fade', () => {
      // On ne stoppe que si c'est encore CE fade qui est actif
      if (this._fadeTokens.get(soundId) === token) {
        howl.stop()
        this.playingSounds.delete(soundId)
        this._fadeTokens.delete(soundId)
      }
    })

    howl.fade(fromVolume, 0, duration)
    // On garde le son dans playingSounds pendant le fade pour permettre
    // un fade-in qui l'interrompt proprement
  }

  setSoundVolume({ soundId, volume = 1, duration }) {
    if (!soundId || !this.playingSounds.has(soundId)) return

    const soundState = this.playingSounds.get(soundId)
    const currentVolume = soundState.howl.volume()

    if (duration && duration > 0) {
      soundState.howl.fade(currentVolume, volume, duration)
    } else {
      soundState.howl.volume(volume)
    }

    this.playingSounds.set(soundId, { howl: soundState.howl, volume })
  }

  stopAll(duration = 0) {
    // Annule tous les tokens : plus aucun callback ne stoppera un son
    this._fadeTokens.clear()

    this.playingSounds.forEach(({ howl }) => {
      if (duration > 0) {
        const fromVolume = howl.volume()
        howl.once('fade', () => howl.stop())
        howl.fade(fromVolume, 0, duration)
      } else {
        howl.stop()
      }
    })

    this.playingSounds.clear()
  }

  wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
  }
}

export default AudioEngine
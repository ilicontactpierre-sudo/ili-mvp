class AudioEngine {
  constructor(howlMap) {
    this.howlMap = howlMap
    this.playingSounds = new Map()
    this._fadeTokens = new Map()
  }

  async executeEvents(audioEvents = []) {
    for (const event of audioEvents) {
      const delay = Number(event?.delay) || 0
      if (delay > 0) await this.wait(delay)
      this.executeEvent(event)
    }
  }

  executeEvent(event) {
    if (!event || !event.action) return
    if (event.action === 'play')    return this.playSound(event)
    if (event.action === 'stop')    return this.stopSound(event.soundId)
    if (event.action === 'fadeIn')  return this.fadeInSound(event)
    if (event.action === 'fadeOut') return this.fadeOutSound(event)
    if (event.action === 'volume')  return this.setSoundVolume(event)
  }

  // Annule tout fade Howler en cours sur ce son en "gelant" le volume actuel.
  // Howler remplace l'interpolation active dès qu'on appelle fade() à nouveau.
  _cancelActiveFade(howl) {
    const current = howl.volume()
    howl.fade(current, current, 1)
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
    this._fadeTokens.delete(soundId)
    const soundState = this.playingSounds.get(soundId)
    if (soundState) {
      this._cancelActiveFade(soundState.howl)
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

    // Nouveau token → invalide tout callback fadeOut en attente
    const token = Symbol()
    this._fadeTokens.set(soundId, token)

    if (this.playingSounds.has(soundId)) {
      // Son déjà actif (ex: fadeOut interrompu)
      // On gèle le fade en cours PUIS on repart vers le volume cible
      this._cancelActiveFade(howl)
      const current = howl.volume()
      howl.fade(current, volume, duration)
    } else {
      howl.loop(Boolean(loop))
      howl.volume(0)
      howl.play()
      howl.fade(0, volume, duration)
    }

    this.playingSounds.set(soundId, { howl, volume })
    // Pas de callback stop : un fadeIn ne stoppe jamais le son
  }

  fadeOutSound({ soundId, duration = 400 }) {
    if (!soundId) return
    const soundState = this.playingSounds.get(soundId)
    const howl = soundState?.howl ?? this.howlMap.get(soundId)
    if (!howl) return

    // Gèle le fade en cours (ex: fadeIn interrompu) avant de repartir vers 0
    this._cancelActiveFade(howl)

    const token = Symbol()
    this._fadeTokens.set(soundId, token)

    const fromVolume = howl.volume()

    howl.once('fade', () => {
      // N'agit que si c'est encore CE fadeOut qui est actif
      if (this._fadeTokens.get(soundId) === token) {
        howl.stop()
        this.playingSounds.delete(soundId)
        this._fadeTokens.delete(soundId)
      }
    })

    howl.fade(fromVolume, 0, duration)
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
    this._fadeTokens.clear()
    this.playingSounds.forEach(({ howl }) => {
      this._cancelActiveFade(howl)
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
class AudioEngine {
  constructor(howlMap) {
    this.howlMap = howlMap
    this.playingSounds = new Map()
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
    if (!event || !event.action) {
      return
    }

    if (event.action === 'play') {
      this.playSound(event)
      return
    }

    if (event.action === 'stop') {
      this.stopSound(event.soundId)
      return
    }

    if (event.action === 'fadeIn') {
      this.fadeInSound(event)
      return
    }

    if (event.action === 'fadeOut') {
      this.fadeOutSound(event)
      return
    }

    if (event.action === 'volume') {
      this.setSoundVolume(event)
    }
  }

  playSound({ soundId, volume = 1, loop }) {
    if (!soundId || this.playingSounds.has(soundId)) {
      return
    }

    const howl = this.howlMap.get(soundId)

    if (!howl) {
      return
    }

    howl.loop(Boolean(loop))
    howl.volume(volume)
    howl.play()
    this.playingSounds.set(soundId, { howl, volume })
  }

  stopSound(soundId) {
    const soundState = this.playingSounds.get(soundId)

    if (soundState) {
      soundState.howl.stop()
      this.playingSounds.delete(soundId)
      return
    }

    const howl = this.howlMap.get(soundId)
    if (howl) {
      howl.stop()
    }
  }

  fadeInSound({ soundId, volume = 1, duration = 400, loop }) {
    if (!soundId) {
      return
    }

    const howl = this.howlMap.get(soundId)

    if (!howl) {
      return
    }

    if (this.playingSounds.has(soundId)) {
      const currentVolume = howl.volume()
      howl.fade(currentVolume, volume, duration)
      this.playingSounds.set(soundId, { howl, volume })
      return
    }

    howl.loop(Boolean(loop))
    howl.volume(0)
    howl.play()
    howl.fade(0, volume, duration)
    this.playingSounds.set(soundId, { howl, volume })
  }

  fadeOutSound({ soundId, duration = 400 }) {
    if (!soundId) {
      return
    }

    const soundState = this.playingSounds.get(soundId)
    const howl = soundState?.howl ?? this.howlMap.get(soundId)

    if (!howl) {
      return
    }

    const fromVolume = howl.volume()
    howl.once('fade', () => {
      howl.stop()
      this.playingSounds.delete(soundId)
    })
    howl.fade(fromVolume, 0, duration)
  }

  setSoundVolume({ soundId, volume = 1, duration }) {
    if (!soundId || !this.playingSounds.has(soundId)) {
      return
    }

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
    this.playingSounds.forEach(({ howl }) => {
      if (duration > 0) {
        const fromVolume = howl.volume()
        howl.once('fade', () => {
          howl.stop()
        })
        howl.fade(fromVolume, 0, duration)
        return
      }

      howl.stop()
    })
    this.playingSounds.clear()
  }

  wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms)
    })
  }
}

export default AudioEngine

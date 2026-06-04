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

  playSound({ trackId, soundId, volume = 1, loop, trimStart, trimEnd }) {
    if (!soundId) return
    const key = trackId || soundId
    if (this.playingSounds.has(key)) return
    const howl = this.howlMap.get(soundId)
    if (!howl) return
    howl.loop(Boolean(loop))
    howl.volume(volume)
    const spriteName = this._applyTrimSprite(howl, soundId, trimStart, trimEnd)
    spriteName ? howl.play(spriteName) : howl.play()
    this.playingSounds.set(key, { howl, soundId, volume })
  }

  stopSound(soundId, trackId) {
    const key = trackId || soundId
    this._fadeTokens.delete(key)
    const soundState = this.playingSounds.get(key)
    if (soundState) {
      soundState.howl.off('fade')
      soundState.howl.stop()
      this.playingSounds.delete(key)
      return
    }
    const howl = this.howlMap.get(soundId)
    if (howl) howl.stop()
  }

  fadeInSound({ soundId, volume = 1, duration = 400, loop, trimStart, trimEnd }) {
    if (!soundId) return
    const howl = this.howlMap.get(soundId)
    if (!howl) return
    const token = Symbol()
    this._fadeTokens.set(soundId, token)
    howl.off('fade')
    // Appliquer le sprite de trim si défini
    const spriteName = this._applyTrimSprite(howl, soundId, trimStart, trimEnd)
    if (this.playingSounds.has(soundId)) {
      const current = howl.volume()
      howl.fade(current, volume, duration)
    } else {
      howl.loop(Boolean(loop))
      howl.volume(0)
      const playId = spriteName ? howl.play(spriteName) : howl.play()
      howl.fade(0, volume, duration)
    }
    this.playingSounds.set(soundId, { howl, volume })
  }

  fadeOutSound({ soundId, duration = 400 }) {
    if (!soundId) return
    const soundState = this.playingSounds.get(soundId)
    const howl = soundState?.howl ?? this.howlMap.get(soundId)
    if (!howl) return

    const token = Symbol()
    this._fadeTokens.set(soundId, token)

    // Retire tous les listeners fade existants AVANT d'en poser un nouveau
    // Cela évite que le listener capte un fade parasite (ex: annulation)
    howl.off('fade')

    const fromVolume = howl.volume()

    howl.once('fade', () => {
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
      howl.off('fade')
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
  _applyTrimSprite(howl, soundId, trimStart, trimEnd) {
      if (trimStart == null && trimEnd == null) return null
      const start = trimStart || 0
      // trimEnd en ms — si absent, on laisse jouer jusqu'à la fin
      if (trimEnd == null) return null
      const duration = trimEnd - start
      if (duration <= 0) return null
      const spriteName = `trim_${soundId}`
      howl._sprite = howl._sprite || {}
      howl._sprite[spriteName] = [start, duration]
      return spriteName
    }
  onSegmentChange(currentIndex, soundTracks = [], segments = []) {
    const getIndex = (segmentId) =>
      segments.findIndex(s => s.id === segmentId || s._id === segmentId)

    // Sons qui doivent être actifs à ce segment
    const activeTracks = soundTracks.filter(track => {
      if (track.muted || track.broken) return false
      const startIdx = getIndex(track.startSegmentId)
      const endIdx = getIndex(track.endSegmentId)
      const end = endIdx !== -1 ? endIdx : startIdx
      return startIdx !== -1 && currentIndex >= startIdx && currentIndex <= end
    })

    const activeIds = new Set(activeTracks.map(t => t.soundId))

    // Arrêter les sons qui ne doivent plus jouer
    this.playingSounds.forEach((_, soundId) => {
      if (!activeIds.has(soundId)) {
        this.fadeOutSound({ soundId, duration: 800 })
      }
    })

    // Démarrer ou mettre à jour les sons actifs
    activeTracks.forEach(track => {
      const startIdx = getIndex(track.startSegmentId)
      const endIdx = getIndex(track.endSegmentId)
      const end = endIdx !== -1 ? endIdx : startIdx
      const isFirstSegment = currentIndex === startIdx
      const isLastSegment = currentIndex === end
      const fadeInMs = (track.fadeIn || 0) * 1000
      const fadeOutMs = (track.fadeOut || 0) * 1000
      const delayMs = (track.delay || 0) * 1000

      if (!this.playingSounds.has(track.soundId)) {
        // Son pas encore en train de jouer → démarrer
        if (isFirstSegment) {
          if (fadeInMs > 0) {
            setTimeout(() => {
              this.fadeInSound({
                soundId: track.soundId,
                volume: track.volume ?? 0.5,
                duration: fadeInMs,
                loop: track.loop ?? false,
              })
            }, delayMs)
          } else {
            setTimeout(() => {
              this.playSound({
                soundId: track.soundId,
                volume: track.volume ?? 0.5,
                loop: track.loop ?? false,
              })
            }, delayMs)
          }
        } else {
          // On arrive en milieu de bloc (ex: démarrage depuis un segment non-zéro)
          this.playSound({
            soundId: track.soundId,
            volume: track.volume ?? 0.5,
            loop: track.loop ?? false,
          })
        }
      }

      // Déclencher le fadeOut sur le dernier segment du bloc
      if (isLastSegment && fadeOutMs > 0 && this.playingSounds.has(track.soundId)) {
        this.fadeOutSound({ soundId: track.soundId, duration: fadeOutMs })
      }
    })
  }

  wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
  }
}

export default AudioEngine
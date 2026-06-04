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

  fadeInSound({ trackId, soundId, volume = 1, duration = 400, loop, trimStart, trimEnd }) {
    if (!soundId) return
    const key = trackId || soundId
    const howl = this.howlMap.get(soundId)
    if (!howl) return
    const token = Symbol()
    this._fadeTokens.set(key, token)
    howl.off('fade')
    const spriteName = this._applyTrimSprite(howl, soundId, trimStart, trimEnd)
    if (this.playingSounds.has(key)) {
      const current = howl.volume()
      howl.fade(current, volume, duration)
    } else {
      howl.loop(Boolean(loop))
      howl.volume(0)
      const playId = spriteName ? howl.play(spriteName) : howl.play()
      howl.fade(0, volume, duration)
    }
    this.playingSounds.set(key, { howl, soundId, volume })
  }

  fadeOutSound({ trackId, soundId, duration = 400 }) {
    if (!soundId) return
    const key = trackId || soundId
    const soundState = this.playingSounds.get(key)
    const howl = soundState?.howl ?? this.howlMap.get(soundId)
    if (!howl) return
    const token = Symbol()
    this._fadeTokens.set(key, token)
    howl.off('fade')
    const fromVolume = howl.volume()
    howl.once('fade', () => {
      if (this._fadeTokens.get(key) === token) {
        howl.stop()
        this.playingSounds.delete(key)
        this._fadeTokens.delete(key)
      }
    })
    howl.fade(fromVolume, 0, duration)
  }

  setSoundVolume({ trackId, soundId, volume = 1, duration }) {
    const key = trackId || soundId
    if (!soundId || !this.playingSounds.has(key)) return
    const soundState = this.playingSounds.get(key)
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

    const activeKeys = new Set(activeTracks.map(t => t.id || t.soundId))
    // Arrêter les sons qui ne doivent plus jouer
    this.playingSounds.forEach((state, key) => {
      if (!activeKeys.has(key)) {
        this.fadeOutSound({ trackId: key, soundId: state.soundId, duration: 800 })
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
                trackId: track.id,
                soundId: track.soundId,
                volume: track.volume ?? 0.5,
                duration: fadeInMs,
                loop: track.loop ?? false,
              })
            }, delayMs)
          } else {
            setTimeout(() => {
              this.playSound({
                trackId: track.id,
                soundId: track.soundId,
                volume: track.volume ?? 0.5,
                loop: track.loop ?? false,
              })
            }, delayMs)
          }
        } else {
          // On arrive en milieu de bloc (ex: démarrage depuis un segment non-zéro)
          this.playSound({
            trackId: track.id,
            soundId: track.soundId,
            volume: track.volume ?? 0.5,
            loop: track.loop ?? false,
          })
        }
      }
      // Déclencher le fadeOut sur le dernier segment du bloc
      const trackKey = track.id || track.soundId
      if (isLastSegment && fadeOutMs > 0 && this.playingSounds.has(trackKey)) {
        this.fadeOutSound({ trackId: track.id, soundId: track.soundId, duration: fadeOutMs })
      }
    })
  }

  wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
  }
}

export default AudioEngine
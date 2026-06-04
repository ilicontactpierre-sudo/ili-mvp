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

  playSound({ trackId, soundId, volume = 1, loop, loopCrossfade, trimStart, trimEnd }) {
    if (!soundId) return
    const key = trackId || soundId
    if (this.playingSounds.has(key)) return
    const howl = this.howlMap.get(soundId)
    if (!howl) return
    const crossfadeMs = this._crossfadeMs(loop, loopCrossfade)
    if (loop && crossfadeMs > 0) {
      // Loop manuelle avec crossfade
      const instanceId = this._playInstance(howl, soundId, trimStart, trimEnd)
      howl.loop(false, instanceId)
      howl.volume(volume, instanceId)
      this.playingSounds.set(key, { howl, soundId, volume, instanceId, loop, loopCrossfade, trimStart, trimEnd })
      this._scheduleLoopCrossfade(key, howl, soundId, volume, crossfadeMs, trimStart, trimEnd, loopCrossfade)
    } else {
      const instanceId = this._playInstance(howl, soundId, trimStart, trimEnd)
      howl.loop(Boolean(loop), instanceId)
      howl.volume(volume, instanceId)
      this.playingSounds.set(key, { howl, soundId, volume, instanceId, loop, loopCrossfade, trimStart, trimEnd })
    }
  }

  stopSound(soundId, trackId) {
    const key = trackId || soundId
    this._fadeTokens.delete(key)
    const soundState = this.playingSounds.get(key)
    if (soundState) {
      if (soundState._loopTimeout) clearTimeout(soundState._loopTimeout)
      soundState.howl.off('fade', soundState.instanceId)
      soundState.instanceId != null
        ? soundState.howl.stop(soundState.instanceId)
        : soundState.howl.stop()
      this.playingSounds.delete(key)
      return
    }
    const howl = this.howlMap.get(soundId)
    if (howl) howl.stop()
  }

  fadeInSound({ trackId, soundId, volume = 1, duration = 400, loop, loopCrossfade, trimStart, trimEnd }) {
    if (!soundId) return
    const key = trackId || soundId
    const howl = this.howlMap.get(soundId)
    if (!howl) return
    const token = Symbol()
    this._fadeTokens.set(key, token)
    const crossfadeMs = this._crossfadeMs(loop, loopCrossfade)
    if (this.playingSounds.has(key)) {
      const state = this.playingSounds.get(key)
      const current = howl.volume(undefined, state.instanceId)
      howl.fade(current, volume, duration, state.instanceId)
      this.playingSounds.set(key, { ...state, volume })
    } else {
      const instanceId = this._playInstance(howl, soundId, trimStart, trimEnd)
      howl.loop(false, instanceId)
      howl.volume(0, instanceId)
      howl.fade(0, volume, duration, instanceId)
      this.playingSounds.set(key, { howl, soundId, volume, instanceId, loop, loopCrossfade, trimStart, trimEnd })
      if (loop && crossfadeMs > 0) {
        this._scheduleLoopCrossfade(key, howl, soundId, volume, crossfadeMs, trimStart, trimEnd, loopCrossfade)
      } else if (loop) {
        howl.loop(true, instanceId)
      }
    }
  }

  fadeOutSound({ trackId, soundId, duration = 400 }) {
    if (!soundId) return
    const key = trackId || soundId
    const soundState = this.playingSounds.get(key)
    const howl = soundState?.howl ?? this.howlMap.get(soundId)
    if (!howl) return
    const instanceId = soundState?.instanceId
    const token = Symbol()
    this._fadeTokens.set(key, token)
    const fromVolume = instanceId != null
      ? howl.volume(undefined, instanceId)
      : howl.volume()
    howl.once('fade', () => {
      if (this._fadeTokens.get(key) === token) {
        instanceId != null ? howl.stop(instanceId) : howl.stop()
        this.playingSounds.delete(key)
        this._fadeTokens.delete(key)
      }
    }, instanceId)
    instanceId != null
      ? howl.fade(fromVolume, 0, duration, instanceId)
      : howl.fade(fromVolume, 0, duration)
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
    this.playingSounds.forEach(({ howl, instanceId, _loopTimeout }) => {
      if (_loopTimeout) clearTimeout(_loopTimeout)
      if (duration > 0) {
        const fromVolume = instanceId != null
          ? howl.volume(undefined, instanceId)
          : howl.volume()
        howl.once('fade', () => {
          instanceId != null ? howl.stop(instanceId) : howl.stop()
        }, instanceId)
        instanceId != null
          ? howl.fade(fromVolume, 0, duration, instanceId)
          : howl.fade(fromVolume, 0, duration)
      } else {
        instanceId != null ? howl.stop(instanceId) : howl.stop()
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
  _playInstance(howl, soundId, trimStart, trimEnd) {
    const spriteName = this._applyTrimSprite(howl, soundId, trimStart, trimEnd)
    return spriteName ? howl.play(spriteName) : howl.play()
  }

  _crossfadeMs(loop, loopCrossfade) {
    if (!loop) return 0
    if (loopCrossfade === 'none') return 0
    if (loopCrossfade === 'long') return 1800
    return 600 // 'medium' ou défaut
  }

  _scheduleLoopCrossfade(key, howl, soundId, volume, crossfadeMs, trimStart, trimEnd, loopCrossfade) {
    // Calcule la durée de lecture (en tenant compte du trim)
    const durationMs = trimEnd != null
      ? (trimEnd - (trimStart || 0))
      : ((howl.duration() || 0) * 1000 - (trimStart || 0))

    if (durationMs <= crossfadeMs) {
      // Son trop court pour le crossfade choisi → loop native sans fondu
      const state = this.playingSounds.get(key)
      if (state) howl.loop(true, state.instanceId)
      return
    }

    // Programmer le crossfade avant la fin
    const timeout = setTimeout(() => {
      const state = this.playingSounds.get(key)
      if (!state) return // son arrêté entretemps

      // Fade out sur l'instance en cours
      howl.fade(volume, 0, crossfadeMs, state.instanceId)

      // Lancer la nouvelle instance immédiatement avec fade in
      const newInstanceId = this._playInstance(howl, soundId, trimStart, trimEnd)
      howl.loop(false, newInstanceId)
      howl.volume(0, newInstanceId)
      howl.fade(0, volume, crossfadeMs, newInstanceId)

      // Mettre à jour l'état avec la nouvelle instance
      this.playingSounds.set(key, { ...state, instanceId: newInstanceId })

      // Arrêter l'ancienne instance après le crossfade
      const oldInstanceId = state.instanceId
      setTimeout(() => {
        howl.stop(oldInstanceId)
      }, crossfadeMs)

      // Replanifier pour le prochain cycle
      this._scheduleLoopCrossfade(key, howl, soundId, volume, crossfadeMs, trimStart, trimEnd, loopCrossfade)

    }, durationMs - crossfadeMs)

    // Stocker le timeout pour pouvoir l'annuler si stopSound est appelé
    const state = this.playingSounds.get(key)
    if (state) {
      if (state._loopTimeout) clearTimeout(state._loopTimeout)
      this.playingSounds.set(key, { ...state, _loopTimeout: timeout })
    }
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

      if (!this.playingSounds.has(track.id || track.soundId)) {
        // Son pas encore en train de jouer → démarrer
        console.log('[onSegmentChange] track:', { id: track.id, loop: track.loop, loopCrossfade: track.loopCrossfade, trimStart: track.trimStart, trimEnd: track.trimEnd })
        if (isFirstSegment) {
          if (fadeInMs > 0) {
            setTimeout(() => {
              this.fadeInSound({
                trackId: track.id,
                soundId: track.soundId,
                volume: track.volume ?? 0.5,
                duration: fadeInMs,
                loop: track.loop ?? false,
                loopCrossfade: track.loopCrossfade,
                trimStart: track.trimStart,
                trimEnd: track.trimEnd,
              })
            }, delayMs)
          } else {
            setTimeout(() => {
              this.playSound({
                trackId: track.id,
                soundId: track.soundId,
                volume: track.volume ?? 0.5,
                loop: track.loop ?? false,
                loopCrossfade: track.loopCrossfade,
                trimStart: track.trimStart,
                trimEnd: track.trimEnd,
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
            loopCrossfade: track.loopCrossfade,
            trimStart: track.trimStart,
            trimEnd: track.trimEnd,
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
class AudioEngine {
  constructor(howlMap) {
    this.howlMap = howlMap
    this.playingSounds = new Map()
    this._fadeTokens = new Map()
    this._panAnimations = new Map() // intervalId par key pour les modes animés
  }
  // Convertit un volume linéaire (0-1) en volume perçu (courbe quadratique)
    // 0.5 linéaire → 0.25 réel → perçu comme "moitié moins fort" à l'oreille
    _toPerceptualVolume(v) {
      return Math.max(0, Math.min(1, v * v))
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

  playSound({ trackId, soundId, volume = 1, loop, loopCrossfade, trimStart, trimEnd, pan = 0, panMode = 'static' }) {
    if (!soundId) return
    const key = trackId || soundId
    if (this.playingSounds.has(key)) return
    const howl = this.howlMap.get(soundId)
    if (!howl) return
    const crossfadeMs = this._crossfadeMs(loop, loopCrossfade)
    if (loop && crossfadeMs > 0) {
      const instanceId = this._playInstance(howl, soundId, trimStart, trimEnd, key)
      howl.loop(false, instanceId)
      howl.volume(this._toPerceptualVolume(volume), instanceId)
      this.playingSounds.set(key, { howl, soundId, volume, instanceId, loop, loopCrossfade, trimStart, trimEnd, pan, panMode })
      this._scheduleLoopCrossfade(key, howl, soundId, volume, crossfadeMs, trimStart, trimEnd, loopCrossfade)
    } else {
      const instanceId = this._playInstance(howl, soundId, trimStart, trimEnd, key)
      howl.loop(Boolean(loop), instanceId)
      howl.volume(this._toPerceptualVolume(volume), instanceId)
      this.playingSounds.set(key, { howl, soundId, volume, instanceId, loop, loopCrossfade, trimStart, trimEnd, pan, panMode })
    }
    this._applyPan(key, pan, panMode, howl)
  }

  stopSound(soundId, trackId) {
    const key = trackId || soundId
    this._fadeTokens.delete(key)
    this._stopPanAnimation(key)
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

  fadeInSound({ trackId, soundId, volume = 1, duration = 400, loop, loopCrossfade, trimStart, trimEnd, pan = 0, panMode = 'static' }) {
    if (!soundId) return
    const key = trackId || soundId
    const howl = this.howlMap.get(soundId)
    if (!howl) return
    const token = Symbol()
    this._fadeTokens.set(key, token)
    const crossfadeMs = this._crossfadeMs(loop, loopCrossfade)
    if (this.playingSounds.has(key)) {
      // Son déjà en cours : fade vers le nouveau volume
      const state = this.playingSounds.get(key)
      const current = howl.volume(undefined, state.instanceId)
      howl.fade(current, volume, duration, state.instanceId)
      this.playingSounds.set(key, { ...state, volume })
    } else {
      const instanceId = this._playInstance(howl, soundId, trimStart, trimEnd, key)
      // Mettre à 0 immédiatement (avant que le son démarre)
      howl.volume(0, instanceId)
      howl.loop(false, instanceId)
      this.playingSounds.set(key, { howl, soundId, volume, instanceId, loop, loopCrossfade, trimStart, trimEnd, pan, panMode })
      console.log('🎚 fadeIn lancé', { key, instanceId, duration, volume })
      // Howler émet 'play' globalement — on filtre manuellement par instanceId
      const onPlay = (firedId) => {
        if (firedId !== instanceId) return
        howl.off('play', onPlay)
        console.log('🎚 play event reçu', { key, instanceId, soundStillActive: this.playingSounds.has(key) })
        if (!this.playingSounds.has(key)) return
        if (duration > 0) {
          howl.fade(0, this._toPerceptualVolume(volume), duration, instanceId)
        } else {
          howl.volume(this._toPerceptualVolume(volume), instanceId)
        }
        if (loop && crossfadeMs > 0) {
          this._scheduleLoopCrossfade(key, howl, soundId, volume, crossfadeMs, trimStart, trimEnd, loopCrossfade)
        } else if (loop) {
          howl.loop(true, instanceId)
        }
        this._applyPan(key, pan, panMode, howl)
      }
      howl.on('play', onPlay)
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
    this._stopPanAnimation(key)
    this.playingSounds.delete(key)

    const doFade = () => {
      if (this._fadeTokens.get(key) !== token) return
      const fromVolume = instanceId != null
        ? howl.volume(undefined, instanceId)
        : howl.volume()
      if (duration <= 0 || fromVolume === 0) {
        instanceId != null ? howl.stop(instanceId) : howl.stop()
        this._fadeTokens.delete(key)
        return
      }
      howl.once('fade', () => {
        if (this._fadeTokens.get(key) === token) {
          instanceId != null ? howl.stop(instanceId) : howl.stop()
          this._fadeTokens.delete(key)
        }
      }, instanceId)
      instanceId != null
        ? howl.fade(fromVolume, 0, duration, instanceId)
        : howl.fade(fromVolume, 0, duration)
    }

    // Si le son est en état 'loading' ou en attente de play, attendre qu'il démarre
    const state = howl.state()
    if (state === 'loaded' && instanceId != null) {
      const playing = howl.playing(instanceId)
      if (!playing) {
        // Pas encore en lecture — attendre le play ou stopper directement
        howl.once('play', doFade, instanceId)
        return
      }
    }
    doFade()
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
    this._panAnimations.forEach((_, key) => this._stopPanAnimation(key))
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
  _applyTrimSprite(howl, soundId, trimStart, trimEnd, trackId) {
    const start = trimStart || 0
    const hasStart = start > 0
    const totalDurationMs = (howl.duration() || 0) * 1000
    const end = (trimEnd != null && trimEnd > start) ? trimEnd : totalDurationMs
    if (!hasStart && trimEnd == null) return null
    const duration = end - start
    if (duration <= 0) return null
    // Utiliser trackId pour éviter les collisions entre blocs du même son
    const spriteName = `trim_${trackId || soundId}_${start}_${end}`
    howl._sprite = howl._sprite || {}
    howl._sprite[spriteName] = [start, duration]
    return spriteName
  }
  _playInstance(howl, soundId, trimStart, trimEnd, trackId) {
    const spriteName = this._applyTrimSprite(howl, soundId, trimStart, trimEnd, trackId)
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
      const newInstanceId = this._playInstance(howl, soundId, trimStart, trimEnd, key)
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
        // Retrouver le track via la key (qui est le trackId ou le soundId)
        const track = soundTracks.find(t => t.id === key || t.soundId === key)
        // fadeOut déjà en ms dans le JSON
        const fadeOutMs = track?.fadeOut ?? 0
        if (fadeOutMs > 0) {
          this.fadeOutSound({ trackId: key, soundId: state.soundId, duration: fadeOutMs })
        } else {
          // fadeOut = 0 → laisser le son finir naturellement, juste retirer de playingSounds
          // pour ne pas bloquer un éventuel redémarrage, mais ne pas stopper le howl
          this.playingSounds.delete(key)
        }
      }
    })

    // Démarrer ou mettre à jour les sons actifs
    activeTracks.forEach(track => {
      const startIdx = getIndex(track.startSegmentId)
      const endIdx = getIndex(track.endSegmentId)
      const end = endIdx !== -1 ? endIdx : startIdx
      const isFirstSegment = currentIndex === startIdx
      const isLastSegment = currentIndex === end
      // fadeIn/fadeOut/delay sont stockés en ms dans le JSON (pas en secondes)
      const fadeInMs = track.fadeIn || 0
      const delayMs = track.delay || 0

      if (!this.playingSounds.has(track.id || track.soundId)) {
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
                loopCrossfade: track.loopCrossfade,
                trimStart: track.trimStart,
                trimEnd: track.trimEnd,
                pan: track.pan ?? 0,
                panMode: track.panMode ?? 'static',
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
                pan: track.pan ?? 0,
                panMode: track.panMode ?? 'static',
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
            pan: track.pan ?? 0,
            panMode: track.panMode ?? 'static',
          })
        }
      }
      // (fadeOut géré à la sortie du bloc, pas sur isLastSegment)
    })
  }

  // ── Spatialisation pan ──────────────────────────────────────────────
  _applyPan(key, pan = 0, panMode = 'static', howl) {
    // Nettoyer toute animation existante sur cette key
    this._stopPanAnimation(key)

    if (panMode === 'static') {
      // Pan fixe : appliquer une seule fois
      try { howl.stereo(pan) } catch (_) {}
      return
    }

    // Durée totale du son en ms (pour le sweep)
    const durationMs = (howl.duration() || 4) * 1000

    // Résolution de mise à jour : 60 fps
    const tickMs = 16
    let elapsed = 0

    const getPanValue = (t) => {
      // t = temps écoulé en ms
      switch (panMode) {
        case 'sweep-lr':
          // -1 → +1 linéaire sur la durée totale
          return Math.max(-1, Math.min(1, -1 + 2 * (t / durationMs)))
        case 'sweep-rl':
          // +1 → -1
          return Math.max(-1, Math.min(1, 1 - 2 * (t / durationMs)))
        case 'oscillate-slow':
          // Période 6s
          return Math.sin((t / 6000) * 2 * Math.PI)
        case 'oscillate-fast':
          // Période 1.5s
          return Math.sin((t / 1500) * 2 * Math.PI)
        case 'converge':
          // Deux extrêmes → centre : |cos| décroissant
          return Math.cos(Math.PI * (t / durationMs)) * (1 - t / durationMs)
        case 'diverge':
          // Centre → extrêmes : signe alterné, amplitude croissante
          return Math.sin((t / durationMs) * Math.PI) * (t / durationMs > 0.5 ? 1 : -1) * (t / durationMs)
        default:
          return 0
      }
    }

    const intervalId = setInterval(() => {
      const state = this.playingSounds.get(key)
      if (!state) {
        this._stopPanAnimation(key)
        return
      }
      const panValue = getPanValue(elapsed)
      try { state.howl.stereo(panValue) } catch (_) {}
      elapsed += tickMs

      // Pour les sweeps, on boucle sur durationMs puis on s'arrête
      if ((panMode === 'sweep-lr' || panMode === 'sweep-rl') && elapsed >= durationMs) {
        this._stopPanAnimation(key)
      }
    }, tickMs)

    this._panAnimations.set(key, intervalId)
  }

  _stopPanAnimation(key) {
    const id = this._panAnimations.get(key)
    if (id != null) {
      clearInterval(id)
      this._panAnimations.delete(key)
    }
  }
  // ───────────────────────────────────────────────────────────────────

  wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
  }
}

export default AudioEngine
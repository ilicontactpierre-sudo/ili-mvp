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
      // Howler émet 'play' globalement — on filtre manuellement par instanceId
      const onPlay = (firedId) => {
        if (firedId !== instanceId) return
        howl.off('play', onPlay)
        if (!this.playingSounds.has(key)) return
        if (duration > 0) {
          this._animatedFade(howl, instanceId, 0, this._toPerceptualVolume(volume), duration, 'sigmoid')
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
      // Choisir la courbe selon la durée
      const OUT_CURVES = [
        { ms: 80,   curve: 'linear'   },
        { ms: 300,  curve: 'ease-out' },
        { ms: 800,  curve: 'sigmoid'  },
        { ms: 2000, curve: 'sigmoid'  },
        { ms: 4000, curve: 'cubic'    },
        { ms: 8000, curve: 'log'      },
      ]
      const outStep = OUT_CURVES.reduce((best, s) =>
        Math.abs(s.ms - duration) < Math.abs(best.ms - duration) ? s : best
      , OUT_CURVES[0])
      const capturedToken = token
      const capturedKey = key
      // _animatedFade ne déclenche pas d'event 'fade' — on arrête le son à la fin via setTimeout
      this._animatedFade(
        instanceId != null ? howl : howl,
        instanceId,
        fromVolume, 0, duration,
        outStep.curve
      )
      setTimeout(() => {
        if (this._fadeTokens.get(capturedKey) === capturedToken) {
          instanceId != null ? howl.stop(instanceId) : howl.stop()
          this._fadeTokens.delete(capturedKey)
        }
      }, duration + 32) // +32ms pour laisser le dernier tick se terminer
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
      soundState.howl.fade(currentVolume, this._toPerceptualVolume(volume), duration)
    } else {
      soundState.howl.volume(this._toPerceptualVolume(volume))
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
        // Howler n'accepte pas instanceId sur .once() — on capture la variable
        const capturedInstanceId = instanceId
        const capturedHowl = howl
        howl.once('fade', () => {
          capturedInstanceId != null
            ? capturedHowl.stop(capturedInstanceId)
            : capturedHowl.stop()
        })
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

      // ── Lire le volume EFFECTIF courant (post-automation) ──────────────
      // On ne réutilise pas la closure `volume` (valeur initiale) mais le
      // volume perceptuel réel de l'instance en cours, pour que le loop
      // reparte exactement au niveau atteint par les PA.
      const currentPerceptualVol = howl.volume(undefined, state.instanceId) ?? this._toPerceptualVolume(state.volume ?? volume)
      const currentLinearVol = state.volume ?? volume // version linéaire stockée dans le state

      // Fade out sur l'instance en cours
      this._animatedFade(howl, state.instanceId, currentPerceptualVol, 0, crossfadeMs, 'sigmoid')

      // Lancer la nouvelle instance immédiatement avec fade in depuis 0
      const newInstanceId = this._playInstance(howl, soundId, trimStart, trimEnd, key)
      howl.loop(false, newInstanceId)
      howl.volume(0, newInstanceId)
      this._animatedFade(howl, newInstanceId, 0, currentPerceptualVol, crossfadeMs, 'sigmoid')

      // Mettre à jour l'état avec la nouvelle instance — volume linéaire inchangé
      this.playingSounds.set(key, { ...state, instanceId: newInstanceId })

      // Arrêter l'ancienne instance après le crossfade
      const oldInstanceId = state.instanceId
      setTimeout(() => {
        howl.stop(oldInstanceId)
      }, crossfadeMs)

      // Replanifier pour le prochain cycle — on passe currentLinearVol
      // pour que la prochaine itération parte du bon niveau si aucun PA ne change
      this._scheduleLoopCrossfade(key, howl, soundId, currentLinearVol, crossfadeMs, trimStart, trimEnd, loopCrossfade)
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
          // fadeOut = 0 → arrêt immédiat propre
          this.stopSound(state.soundId, key)
        }
      }
    })

    // Démarrer ou mettre à jour les sons actifs
    for (const track of activeTracks) {
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

      // ── Automation de volume ──────────────────────────────
      // Si le track a des automationPoints, calculer le volume cible
      // au segment courant et l'appliquer avec le fade du point concerné
      if (track.automationPoints && track.automationPoints.length > 0) {
        const key = track.id || track.soundId
        if (this.playingSounds.has(key)) {
          // Trouver le dernier point d'automation dont le segment est ≤ currentIndex
          // Trier les points par index de segment pour garantir l'ordre
          const sortedPoints = [...track.automationPoints]
            .map(pt => ({ pt, idx: getIndex(pt.segmentId) }))
            .filter(({ idx }) => idx !== -1)
            .sort((a, b) => a.idx - b.idx)

          let targetVolume = track.volume ?? 0.5
          let fadeMs = 0
          for (const { pt, idx } of sortedPoints) {
            if (idx <= currentIndex) {
              targetVolume = pt.volume
              fadeMs = idx === currentIndex ? (pt.fadeMs ?? 0) : 0
            } else {
              break // les points suivants sont après currentIndex, inutile de continuer
            }
          }

          const state = this.playingSounds.get(key)
          if (!state) continue
          const currentVol = state.howl.volume(undefined, state.instanceId) ?? targetVolume
          const targetPerceptual = this._toPerceptualVolume(targetVolume)
          if (Math.abs(currentVol - targetPerceptual) > 0.01) {
            // Trouver la courbe associée à ce fadeMs
            const AUTOMATION_FADE_STEPS = [
              { ms: 0,    curve: 'cut'      },
              { ms: 300,   curve: 'linear'   },
              { ms: 600,  curve: 'ease-out' },
              { ms: 1500,  curve: 'sigmoid'  },
              { ms: 2500, curve: 'sigmoid'  },
              { ms: 5000, curve: 'cubic'    },
              { ms: 10000, curve: 'log'      },
            ]
            const step = AUTOMATION_FADE_STEPS.find(s => s.ms === fadeMs)
            const curve = step?.curve ?? 'sigmoid'
            this._animatedFade(state.howl, state.instanceId, currentVol, targetPerceptual, fadeMs, curve)
            this.playingSounds.set(key, { ...state, volume: targetVolume })
          }
        }
      }
    }
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

  // ── Fade avec courbe personnalisée ─────────────────────────────────────────
  // curve : 'cut' | 'linear' | 'ease-out' | 'sigmoid' | 'cubic' | 'log'
  _animatedFade(howl, instanceId, fromVol, toVol, durationMs, curve = 'sigmoid') {
    if (durationMs <= 0 || curve === 'cut') {
      instanceId != null
        ? howl.volume(toVol, instanceId)
        : howl.volume(toVol)
      return
    }
    // Pour les durées très courtes, le linéaire natif de Howler suffit
    if (curve === 'linear' || durationMs <= 80) {
      instanceId != null
        ? howl.fade(fromVol, toVol, durationMs, instanceId)
        : howl.fade(fromVol, toVol, durationMs)
      return
    }
    // Courbes custom : animation manuelle à 60fps
    const TICK = 16 // ms
    const steps = Math.ceil(durationMs / TICK)
    let step = 0
    // Fonctions d'easing — t ∈ [0, 1] → valeur ∈ [0, 1]
    const easings = {
      'ease-out': (t) => 1 - Math.pow(1 - t, 3),
      'sigmoid':  (t) => 1 / (1 + Math.exp(-12 * (t - 0.5))),
      'cubic':    (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      'log':      (t) => Math.log(1 + t * (Math.E - 1)),
    }
    // Normaliser sigmoid et log pour qu'ils partent de 0 et arrivent à 1
    const rawEasing = easings[curve] ?? easings['sigmoid']
    const v0 = rawEasing(0)
    const v1 = rawEasing(1)
    const easing = (t) => (rawEasing(t) - v0) / (v1 - v0)
    const intervalId = setInterval(() => {
      step++
      const t = Math.min(1, step / steps)
      const vol = fromVol + (toVol - fromVol) * easing(t)
      try {
        instanceId != null
          ? howl.volume(vol, instanceId)
          : howl.volume(vol)
      } catch (_) {}
      if (t >= 1) clearInterval(intervalId)
    }, TICK)
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
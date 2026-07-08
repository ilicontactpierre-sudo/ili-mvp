// Convertit un gain exprimé en dB vers un multiplicateur linéaire.
// 0 dB → 1.0 (neutre) | -10 dB → ~0.316 | +10 dB → ~3.162
function dbToLinear(db) {
  if (!db) return 1
  return Math.pow(10, db / 20)
}
// Convertit un gain linéaire (0-1, ce que Howler attend) vers un niveau en dB.
// Plancher à -60dB pour éviter -Infinity au silence total — en dessous, le
// son est de toute façon perçu comme inaudible.
const FADE_MIN_DB = -60
function linearToDb(v) {
  const g = Math.max(0, Math.min(1, v))
  if (g <= 0) return FADE_MIN_DB
  return Math.max(FADE_MIN_DB, 20 * Math.log10(g))
}
class AudioEngine {
  constructor(howlMap) {
    this.howlMap = howlMap
    this.playingSounds = new Map()
    this._fadeTokens = new Map()
    this._panAnimations = new Map() // intervalId par key pour les modes animés
    this.masterVolume = 1.0
  }
  // Applique le gain (dB), puis le master volume, puis la courbe quadratique perceptuelle
  // gainDb s'applique en premier (c'est un gain "matériel" sur le son lui-même),
  // masterVolume s'applique ensuite linéairement AVANT la courbe pour préserver la dynamique
  _toPerceptualVolume(v, gainDb = 0) {
    const scaled = v * dbToLinear(gainDb) * this.masterVolume
    return Math.max(0, Math.min(1, scaled * scaled))
  }
  // Setter du master volume — met à jour tous les sons en cours immédiatement
  setMasterVolume(master) {
    this.masterVolume = Math.max(0, Math.min(2, master ?? 1.0))
    this.playingSounds.forEach((state, key) => {
      const targetPerceptual = this._toPerceptualVolume(state.volume ?? 0.5, state.gainDb ?? 0)
      try {
        state.instanceId != null
          ? state.howl.volume(targetPerceptual, state.instanceId)
          : state.howl.volume(targetPerceptual)
      } catch (_) {}
    })
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

  playSound({ trackId, soundId, volume = 1, gainDb = 0, loop, loopCrossfade, trimStart, trimEnd, pan = 0, panMode = 'static', panSpeedMs }) {
    if (!soundId) return
    const key = trackId || soundId
    if (this.playingSounds.has(key)) return
    const howl = this.howlMap.get(soundId)
    if (!howl) return
    const crossfadeMs = this._crossfadeMs(loop, loopCrossfade)
    if (loop && crossfadeMs > 0) {
      const instanceId = this._playInstance(howl, soundId, trimStart, trimEnd, key)
      howl.loop(false, instanceId)
      howl.volume(this._toPerceptualVolume(volume, gainDb), instanceId)
      this.playingSounds.set(key, { howl, soundId, volume, gainDb, instanceId, loop, loopCrossfade, trimStart, trimEnd, pan, panMode })
      this._scheduleLoopCrossfade(key, howl, soundId, volume, crossfadeMs, trimStart, trimEnd, loopCrossfade, gainDb)
    } else {
      const instanceId = this._playInstance(howl, soundId, trimStart, trimEnd, key)
      howl.loop(Boolean(loop), instanceId)
      howl.volume(this._toPerceptualVolume(volume, gainDb), instanceId)
      this.playingSounds.set(key, { howl, soundId, volume, gainDb, instanceId, loop, loopCrossfade, trimStart, trimEnd, pan, panMode })
    }
    this._applyPan(key, pan, panMode, howl, trimStart, trimEnd, panSpeedMs)
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

  fadeInSound({ trackId, soundId, volume = 1, gainDb = 0, duration = 400, loop, loopCrossfade, trimStart, trimEnd, pan = 0, panMode = 'static', panSpeedMs }) {
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
      howl.fade(current, this._toPerceptualVolume(volume, gainDb), duration, state.instanceId)
      this.playingSounds.set(key, { ...state, volume, gainDb })
    } else {
      const instanceId = this._playInstance(howl, soundId, trimStart, trimEnd, key)
      // Mettre à 0 immédiatement (avant que le son démarre)
      howl.volume(0, instanceId)
      howl.loop(false, instanceId)
      this.playingSounds.set(key, { howl, soundId, volume, gainDb, instanceId, loop, loopCrossfade, trimStart, trimEnd, pan, panMode })
      // Howler émet 'play' globalement — on filtre manuellement par instanceId
      const onPlay = (firedId) => {
        if (firedId !== instanceId) return
        howl.off('play', onPlay)
        if (!this.playingSounds.has(key)) return
        if (duration > 0) {
          this._animatedFade(howl, instanceId, 0, this._toPerceptualVolume(volume, gainDb), duration, 'natural')
        } else {
          howl.volume(this._toPerceptualVolume(volume, gainDb), instanceId)
        }
        if (loop && crossfadeMs > 0) {
          this._scheduleLoopCrossfade(key, howl, soundId, volume, crossfadeMs, trimStart, trimEnd, loopCrossfade, gainDb)
        } else if (loop) {
          howl.loop(true, instanceId)
        }
        this._applyPan(key, pan, panMode, howl, trimStart, trimEnd, panSpeedMs)
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
      const capturedToken = token
      const capturedKey = key
      // 'natural' = linéaire en dB, sonne comme un fondu à vitesse constante
      // pour l'oreille quelle que soit la durée. En dessous de 80ms,
      // _animatedFade bascule automatiquement sur le fade natif Howler.
      // _animatedFade ne déclenche pas d'event 'fade' — on arrête le son à la fin via setTimeout
      this._animatedFade(howl, instanceId, fromVolume, 0, duration, 'natural')
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

  setSoundVolume({ trackId, soundId, volume = 1, gainDb, duration }) {
    const key = trackId || soundId
    if (!soundId || !this.playingSounds.has(key)) return
    const soundState = this.playingSounds.get(key)
    const effectiveGainDb = gainDb ?? soundState.gainDb ?? 0
    const currentVolume = soundState.howl.volume()
    if (duration && duration > 0) {
      soundState.howl.fade(currentVolume, this._toPerceptualVolume(volume, effectiveGainDb), duration)
    } else {
      soundState.howl.volume(this._toPerceptualVolume(volume, effectiveGainDb))
    }
    this.playingSounds.set(key, { ...soundState, volume, gainDb: effectiveGainDb })
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

  _scheduleLoopCrossfade(key, howl, soundId, volume, crossfadeMs, trimStart, trimEnd, loopCrossfade, gainDb = 0) {
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
      const effectiveGainDb = state.gainDb ?? gainDb
      const currentPerceptualVol = howl.volume(undefined, state.instanceId) ?? this._toPerceptualVolume(state.volume ?? volume, effectiveGainDb)
      const currentLinearVol = state.volume ?? volume // version linéaire stockée dans le state
      // Fade out sur l'instance en cours — equal-power pour préserver
      // l'énergie totale perçue pendant le recouvrement des deux instances
      this._animatedFade(howl, state.instanceId, currentPerceptualVol, 0, crossfadeMs, 'equal-power-out')
      // Lancer la nouvelle instance immédiatement avec fade in depuis 0
      const newInstanceId = this._playInstance(howl, soundId, trimStart, trimEnd, key)
      howl.loop(false, newInstanceId)
      howl.volume(0, newInstanceId)
      this._animatedFade(howl, newInstanceId, 0, currentPerceptualVol, crossfadeMs, 'equal-power-in')
      // Mettre à jour l'état avec la nouvelle instance — volume linéaire inchangé
      this.playingSounds.set(key, { ...state, instanceId: newInstanceId })
      // Arrêter l'ancienne instance après le crossfade
      const oldInstanceId = state.instanceId
      setTimeout(() => {
        howl.stop(oldInstanceId)
      }, crossfadeMs)
      // Replanifier pour le prochain cycle — on passe currentLinearVol
      // pour que la prochaine itération parte du bon niveau si aucun PA ne change
      this._scheduleLoopCrossfade(key, howl, soundId, currentLinearVol, crossfadeMs, trimStart, trimEnd, loopCrossfade, effectiveGainDb)
    }, durationMs - crossfadeMs)
    // Stocker le timeout pour pouvoir l'annuler si stopSound est appelé
    const state = this.playingSounds.get(key)
    if (state) {
      if (state._loopTimeout) clearTimeout(state._loopTimeout)
      this.playingSounds.set(key, { ...state, _loopTimeout: timeout })
    }
  }

  // Calcule le volume "théorique" d'un track à un index donné, en tenant
  // compte de ses automationPoints — sans jamais renvoyer de fadeMs. Sert à
  // démarrer un son EXACTEMENT au bon niveau quand on le lance à froid en
  // plein milieu de son bloc (ex: aperçu qui saute directement à un segment
  // avancé) : dans ce cas il ne doit jamais y avoir de fondu, seulement la
  // valeur qu'aurait atteinte le son s'il avait joué depuis le début normalement.
  _getAutomatedVolumeAtIndex(track, targetIndex, getIndex) {
    let targetVolume = track.volume ?? 0.5
    if (!track.automationPoints || track.automationPoints.length === 0) return targetVolume
    const sortedPoints = [...track.automationPoints]
      .map(pt => ({ pt, idx: getIndex(pt.segmentId) }))
      .filter(({ idx }) => idx !== -1)
      .sort((a, b) => a.idx - b.idx)
    for (const { pt, idx } of sortedPoints) {
      if (idx <= targetIndex) targetVolume = pt.volume
      else break
    }
    return targetVolume
  }
  onSegmentChange(currentIndex, soundTracks = [], segments = []) {
    const getIndex = (segmentId) =>
      segments.findIndex(s => s.id === segmentId || s._id === segmentId)
    // Segments dont le son vient d'être démarré À FROID dans cet appel
    // (démarrage en milieu de bloc). Ces clés doivent ignorer toute logique
    // de fade d'automation ensuite dans cette même exécution : le volume
    // correct a déjà été appliqué dès le playSound initial.
    const coldStartedKeys = new Set()
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
        const track = soundTracks.find(t => t.id === key || t.soundId === key)
        const fadeOutMs = track?.fadeOut ?? 0
        const isLoop = track?.loop ?? state.loop ?? false

        if (fadeOutMs > 0) {
          // Fade out explicite
          this.fadeOutSound({ trackId: key, soundId: state.soundId, duration: fadeOutMs })
        } else if (isLoop) {
          // Loop sans fadeOut → arrêt immédiat (sinon il joue à l'infini)
          this.stopSound(state.soundId, key)
        } else {
          // One-shot sans fadeOut → laisser le son finir naturellement.
          this._fadeTokens.delete(key)
          this._stopPanAnimation(key)
          if (state._loopTimeout) clearTimeout(state._loopTimeout)
          this.playingSounds.delete(key)
          // Quand le son finit naturellement, nettoyer l'instance
          state.howl.once('end', () => {
            if (state.instanceId != null) {
              try { state.howl.stop(state.instanceId) } catch (_) {}
            }
          }, state.instanceId)
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
                gainDb: track.gainDb ?? 0,
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
                gainDb: track.gainDb ?? 0,
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
          // On arrive en milieu de bloc (ex: démarrage depuis un segment non-zéro,
          // aperçu qui saute directement à ce segment). On calcule le volume
          // EXACT qu'aurait atteint le son à ce point de sa progression normale
          // (en tenant compte des automationPoints déjà "passés") et on
          // l'applique dès le premier instant — jamais de fadeIn ici, jamais
          // le volume de base du bloc : l'auditeur doit entendre le son
          // directement dans l'état où il serait s'il avait joué depuis le début.
          const startVolume = this._getAutomatedVolumeAtIndex(track, currentIndex, getIndex)
          this.playSound({
            trackId: track.id,
            soundId: track.soundId,
            volume: startVolume,
            gainDb: track.gainDb ?? 0,
            loop: track.loop ?? false,
            loopCrossfade: track.loopCrossfade,
            trimStart: track.trimStart,
            trimEnd: track.trimEnd,
            pan: track.pan ?? 0,
            panMode: track.panMode ?? 'static',
          })
          coldStartedKeys.add(track.id || track.soundId)
        }
      }
      // (fadeOut géré à la sortie du bloc, pas sur isLastSegment)

      // ── Automation de volume ──────────────────────────────
      // Si le track a des automationPoints, calculer le volume cible
      // au segment courant et l'appliquer avec le fade du point concerné
      if (track.automationPoints && track.automationPoints.length > 0) {
        const key = track.id || track.soundId
        // Ce son vient d'être démarré à froid juste au-dessus, avec déjà le
        // bon volume automatisé appliqué directement — on ne retouche rien
        // ici pour éviter un fade parasite superposé au démarrage.
        if (coldStartedKeys.has(key)) continue
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
          const targetPerceptual = this._toPerceptualVolume(targetVolume, state.gainDb ?? track.gainDb ?? 0)
          if (Math.abs(currentVol - targetPerceptual) > 0.01) {
            // Trouver la courbe associée à ce fadeMs
            // 'natural' (linéaire en dB) pour toute transition entre deux
            // points d'automation — c'est la seule courbe neutre et fluide
            // à l'oreille, quelle que soit la durée choisie (fadeMs).
            const curve = fadeMs === 0 ? 'cut' : 'natural'
            this._animatedFade(state.howl, state.instanceId, currentVol, targetPerceptual, fadeMs, curve)
            this.playingSounds.set(key, { ...state, volume: targetVolume })
          }
        }
      }
    }
  }

  // ── Spatialisation pan ──────────────────────────────────────────────
  // trimStart/trimEnd : bornes de la portion réellement jouée (ms). Toute
  // trajectoire de pan (sweep, converge, diverge) doit se dérouler sur la
  // durée de CETTE portion, jamais sur la durée totale du fichier brut —
  // sinon l'effet reste bien plus lent (ou incomplet) que ce qui est audible.
  // panSpeedMs : période en ms pour les modes oscillate (remplace le défaut
  // 6000/1500 si l'utilisateur a réglé une vitesse personnalisée).
  _applyPan(key, pan = 0, panMode = 'static', howl, trimStart, trimEnd, panSpeedMs) {
    // Nettoyer toute animation existante sur cette key
    this._stopPanAnimation(key)
    if (panMode === 'static') {
      // Pan fixe : appliquer une seule fois
      try { howl.stereo(pan) } catch (_) {}
      return
    }
    // Durée EFFECTIVE (portion trimée) du son en ms — pas la durée du fichier brut
    const start = trimStart || 0
    const fullMs = (howl.duration() || 4) * 1000
    const end = (trimEnd != null && trimEnd > start) ? trimEnd : fullMs
    const durationMs = Math.max(1, end - start)
    // Résolution de mise à jour : 60 fps
    const tickMs = 16
    let elapsed = 0
    const oscillatePeriod = panSpeedMs > 0
      ? panSpeedMs
      : (panMode === 'oscillate-fast' ? 1500 : 6000)
    const getPanValue = (t) => {
      // t = temps écoulé en ms
      switch (panMode) {
        case 'sweep-lr':
          // -1 → +1 linéaire sur la durée effective (trimée)
          return Math.max(-1, Math.min(1, -1 + 2 * (t / durationMs)))
        case 'sweep-rl':
          // +1 → -1
          return Math.max(-1, Math.min(1, 1 - 2 * (t / durationMs)))
        case 'oscillate-slow':
        case 'oscillate-fast':
          // Période réglable via panSpeedMs (défauts : 6s lent / 1.5s vite)
          return Math.sin((t / oscillatePeriod) * 2 * Math.PI)
        case 'converge':
          // Deux extrêmes → centre : |cos| décroissant, sur la durée effective
          return Math.cos(Math.PI * (t / durationMs)) * (1 - t / durationMs)
        case 'diverge':
          // Centre → extrêmes : signe alterné, amplitude croissante, sur la durée effective
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
      // Pour les sweeps/converge/diverge (bornés à la portion trimée), on s'arrête à la fin
      if (panMode !== 'oscillate-slow' && panMode !== 'oscillate-fast' && elapsed >= durationMs) {
        this._stopPanAnimation(key)
      }
    }, tickMs)
    this._panAnimations.set(key, intervalId)
  }

  // ── Fade avec courbe personnalisée ─────────────────────────────────────────
  // curve :
  //  - 'cut'            : instantané
  //  - 'linear'         : fondu linéaire natif Howler (uniquement pour les
  //                        durées très courtes, où la différence est inaudible)
  //  - 'natural'         : DÉFAUT — interpolation linéaire en dB. C'est la
  //                        seule courbe qui sonne comme un changement de
  //                        volume à vitesse constante pour l'oreille humaine
  //                        (perception logarithmique). À utiliser pour tout
  //                        fondu "neutre" : fade in/out d'un bloc, transition
  //                        entre deux points d'automation.
  //  - 'equal-power-out' / 'equal-power-in' : PAIRE dédiée au crossfade de
  //                        loop. Utilise cos/sin pour que la somme d'énergie
  //                        des deux instances reste constante pendant le
  //                        recouvrement (évite le creux de volume perçu au
  //                        milieu d'un crossfade classique).
  //  - 'ease-out' / 'sigmoid' / 'cubic' / 'log' : courbes artistiques,
  //                        conservées pour un usage ponctuel si besoin.
  _animatedFade(howl, instanceId, fromVol, toVol, durationMs, curve = 'natural') {
    if (durationMs <= 0 || curve === 'cut') {
      instanceId != null
        ? howl.volume(toVol, instanceId)
        : howl.volume(toVol)
      return
    }
    // Pour les durées très courtes, la différence avec 'natural' est inaudible
    if (curve === 'linear' || durationMs <= 80) {
      instanceId != null
        ? howl.fade(fromVol, toVol, durationMs, instanceId)
        : howl.fade(fromVol, toVol, durationMs)
      return
    }
    const TICK = 16 // ms
    const steps = Math.ceil(durationMs / TICK)
    let step = 0
    // ── Courbe par défaut : linéaire en dB ──────────────────────────────
    if (curve === 'natural') {
      const fromDb = linearToDb(fromVol)
      const toDb = linearToDb(toVol)
      const intervalId = setInterval(() => {
        step++
        const t = Math.min(1, step / steps)
        const vol = t >= 1 ? toVol : dbToLinear(fromDb + (toDb - fromDb) * t)
        try {
          instanceId != null ? howl.volume(vol, instanceId) : howl.volume(vol)
        } catch (_) {}
        if (t >= 1) clearInterval(intervalId)
      }, TICK)
      return
    }
    // ── Equal-power : réservée au crossfade de loop (voir _scheduleLoopCrossfade) ──
    if (curve === 'equal-power-out' || curve === 'equal-power-in') {
      const peak = curve === 'equal-power-out' ? fromVol : toVol
      const intervalId = setInterval(() => {
        step++
        const t = Math.min(1, step / steps)
        const angle = t * (Math.PI / 2)
        const vol = curve === 'equal-power-out' ? peak * Math.cos(angle) : peak * Math.sin(angle)
        try {
          instanceId != null ? howl.volume(vol, instanceId) : howl.volume(vol)
        } catch (_) {}
        if (t >= 1) clearInterval(intervalId)
      }, TICK)
      return
    }
    // ── Courbes artistiques historiques (usage ponctuel) ────────────────
    const easings = {
      'ease-out': (t) => 1 - Math.pow(1 - t, 3),
      'sigmoid':  (t) => 1 / (1 + Math.exp(-12 * (t - 0.5))),
      'cubic':    (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      'log':      (t) => Math.log(1 + t * (Math.E - 1)),
    }
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
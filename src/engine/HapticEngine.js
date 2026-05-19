/**
 * HapticEngine — ILi MVP
 * Gère les patterns de vibration liés aux blocs VFX.
 *
 * Limitations connues et gérées :
 * - iOS/Safari : aucun support → fallback silencieux automatique
 * - Arrière-plan : le navigateur coupe les vibrations → géré proprement
 * - Intensité : non contrôlable depuis le web → on joue sur le rythme
 * - Synchronisation audio : précision ~20-80ms (acceptable pour usage narratif)
 */

// ─── Catalogue des patterns ──────────────────────────────────────────────────
// Format : tableau [vibre_ms, pause_ms, vibre_ms, pause_ms, ...]
// Ces tableaux sont rejoués en boucle par play().

export const HAPTIC_PATTERNS = {
  heartbeat: {
    label: 'Heartbeat',
    icon: '🫀',
    description: 'Double pulsation cardiaque',
    // Deux battements rapprochés, longue pause
    sequence: [60, 80, 100, 700],
  },
  pulse: {
    label: 'Pulsation',
    icon: '〇',
    description: 'Pulsation lente et régulière',
    sequence: [150, 600],
  },
  slow: {
    label: 'Lent',
    icon: '～',
    description: 'Vibration longue et espacée',
    sequence: [400, 800],
  },
  fast: {
    label: 'Rapide',
    icon: '≋',
    description: 'Impulsions rapides répétées',
    sequence: [80, 60],
  },
  morse: {
    label: 'Morse SOS',
    icon: '✦',
    description: '···−−−··· (SOS en morse)',
    // S = 3 courts, O = 3 longs, S = 3 courts
    sequence: [80, 80, 80, 80, 80, 80, 200, 80, 200, 80, 200, 80, 80, 80, 80, 80, 80, 600],
  },
  ring: {
    label: 'Sonnerie',
    icon: '☎',
    description: 'Pattern de sonnerie téléphone',
    sequence: [300, 150, 300, 900],
  },
  glitch: {
    label: 'Glitch',
    icon: '⚡',
    description: 'Impulsions erratiques',
    sequence: [40, 30, 120, 20, 60, 80, 200, 40, 80, 150],
  },
  tension: {
    label: 'Tension',
    icon: '▲',
    description: 'Montée progressive (simulée par accélération)',
    sequence: [60, 200, 80, 160, 100, 120, 120, 100, 140, 80],
  },
  impact: {
    label: 'Impact',
    icon: '●',
    description: 'Choc unique fort répété',
    sequence: [250, 1200],
  },
}

// ─── HapticEngine ─────────────────────────────────────────────────────────────

class HapticEngine {
  constructor() {
    // Détection unique au démarrage
    this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator

    // Préférence utilisateur (opt-in)
    this._enabled = this._loadPreference()

    // État interne
    this._loopTimer = null
    this._currentPattern = null
    this._isPlaying = false

    // Gestion de la visibilité de l'onglet (le navigateur coupe les vibrations
    // quand l'onglet passe en arrière-plan — on arrête proprement côté JS aussi)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this._stopInternal()
      })
    }
  }

  // ── Préférence utilisateur ──────────────────────────────────────────────────

  get enabled() {
    return this._enabled
  }

  set enabled(value) {
    this._enabled = Boolean(value)
    this._savePreference(this._enabled)
    if (!this._enabled) this.stop()
  }

  _loadPreference() {
    try {
      return localStorage.getItem('ili_haptic_enabled') === 'true'
    } catch {
      return false // désactivé par défaut
    }
  }

  _savePreference(value) {
    try {
      localStorage.setItem('ili_haptic_enabled', value ? 'true' : 'false')
    } catch {
      // Silencieux si localStorage non disponible
    }
  }

  // ── API publique ────────────────────────────────────────────────────────────

  /**
   * Démarre un pattern en boucle.
   * @param {string} patternName — clé dans HAPTIC_PATTERNS
   */
  play(patternName) {
    if (!this.isSupported || !this._enabled) return
    if (!patternName || !HAPTIC_PATTERNS[patternName]) return

    const pattern = HAPTIC_PATTERNS[patternName]

    // Évite de relancer le même pattern déjà en cours
    if (this._isPlaying && this._currentPattern === patternName) return

    this._stopInternal()
    this._currentPattern = patternName
    this._isPlaying = true
    this._loopPattern(pattern.sequence)
  }

  /**
   * Arrête toute vibration immédiatement.
   */
  stop() {
    this._stopInternal()
  }

  /**
   * Teste un pattern une seule fois (pour la prévisualisation dans le panel admin).
   * @param {string} patternName
   */
  preview(patternName) {
    if (!this.isSupported) return
    const pattern = HAPTIC_PATTERNS[patternName]
    if (!pattern) return
    // Joue le pattern une fois sans boucle
    navigator.vibrate(pattern.sequence)
  }

  // ── Logique interne ─────────────────────────────────────────────────────────

  /**
   * Calcule la durée totale d'un cycle de pattern.
   */
  _cycleDuration(sequence) {
    return sequence.reduce((sum, ms) => sum + ms, 0)
  }

  /**
   * Lance la boucle du pattern via setInterval.
   * On attend la fin d'un cycle complet avant de relancer.
   */
  _loopPattern(sequence) {
    const duration = this._cycleDuration(sequence)

    // Lancement immédiat
    navigator.vibrate(sequence)

    // Puis boucle à chaque fin de cycle
    this._loopTimer = setInterval(() => {
      if (!this._isPlaying) {
        clearInterval(this._loopTimer)
        return
      }
      navigator.vibrate(sequence)
    }, duration)
  }

  _stopInternal() {
    if (this._loopTimer) {
      clearInterval(this._loopTimer)
      this._loopTimer = null
    }
    this._isPlaying = false
    this._currentPattern = null

    // Annule toute vibration en cours côté navigateur
    if (this.isSupported) {
      try { navigator.vibrate(0) } catch { /* silencieux */ }
    }
  }
}

// Singleton — une seule instance partagée dans toute l'app
const hapticEngine = new HapticEngine()
export default hapticEngine

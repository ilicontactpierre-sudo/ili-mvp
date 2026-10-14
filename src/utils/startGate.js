// Attente des sons du DÉBUT d'une histoire, avec l'écran « connexion lente ».
//
// On n'attend que les sons nécessaires pour démarrer ; les autres continuent de se télécharger
// pendant la lecture. Si l'attente dépasse `slowMs`, `onSlow` est appelé : l'écran propose alors
// de commencer sans tout le son (continueNow) ou d'attendre encore (waitMore, nouvelle alerte
// après `slowAgainMs`). Le chargement n'est jamais interrompu par cette alerte : si les sons
// arrivent pendant qu'elle est affichée, l'attente se termine toute seule.
//
// IMPORTANT : appeler loader.start(...) AVANT waitForSounds (un son inconnu du chargeur est
// considéré comme réglé).

export const SLOW_MS = 15000
export const SLOW_AGAIN_MS = 30000

export function waitForSounds(loader, ids, options = {}) {
  const {
    slowMs = SLOW_MS,
    slowAgainMs = SLOW_AGAIN_MS,
    onProgress,
    onSlow,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
  } = options
  const wanted = [...new Set(ids)]
  let finished = false
  let timer = null
  let off = () => {}
  let resolveDone
  const done = new Promise((resolve) => { resolveDone = resolve })

  const settledCount = () =>
    wanted.filter((id) => {
      const st = loader.status(id)
      return st === null || st === 'loaded' || st === 'failed'
    }).length

  const finish = (reason) => {
    if (finished) return
    finished = true
    clearTimer(timer)
    off()
    resolveDone(reason)
  }
  const check = () => {
    if (finished) return
    const n = settledCount()
    if (onProgress) onProgress(n, wanted.length)
    if (n === wanted.length) finish('ready')
  }
  const armSlow = (ms) => {
    clearTimer(timer)
    timer = setTimer(() => { if (!finished && onSlow) onSlow() }, ms)
  }

  off = loader.on(check)
  armSlow(slowMs)
  check()

  return {
    done, // résolu avec 'ready' | 'continued' | 'cancelled'
    continueNow: () => finish('continued'),
    waitMore: () => { if (!finished) armSlow(slowAgainMs) },
    cancel: () => finish('cancelled'),
  }
}

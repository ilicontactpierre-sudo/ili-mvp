// Cache audio d'ILi (Cache API du navigateur) : version, nettoyage et éviction.
//
// VERSION : pour forcer tous les téléphones à retélécharger les sons (par exemple si un fichier
// audio a été REMPLACÉ sur Supabase sous le même nom), augmentez AUDIO_CACHE_VERSION et publiez.
// Les caches des anciennes versions sont supprimés au premier chargement (cleanOldAudioCaches).
// Un changement de volume, de pan, de fade, de trim ou de boucle n'a PAS besoin de cela : ces
// réglages sont dans le JSON de l'histoire, pas dans le fichier audio.

export const AUDIO_CACHE_PREFIX = 'ili-audio-'
export const AUDIO_CACHE_VERSION = 1
export const AUDIO_CACHE_NAME = `${AUDIO_CACHE_PREFIX}v${AUDIO_CACHE_VERSION}`

// Supprime les caches audio d'ILi d'une AUTRE version. Ne touche jamais un cache dont le nom ne
// commence pas par le préfixe. Ne lève jamais d'erreur. Renvoie les noms supprimés.
export async function cleanOldAudioCaches(cacheStorage, currentName = AUDIO_CACHE_NAME, prefix = AUDIO_CACHE_PREFIX) {
  const deleted = []
  try {
    const names = await cacheStorage.keys()
    for (const name of names) {
      if (!name.startsWith(prefix) || name === currentName) continue
      try {
        if (await cacheStorage.delete(name)) deleted.push(name)
      } catch { /* on continue avec les suivants */ }
    }
  } catch { /* Cache API absente ou en erreur : rien à nettoyer */ }
  return deleted
}

// Reconnaît une erreur « plus de place » (les navigateurs ne la nomment pas tous pareil).
export function isQuotaError(e) {
  if (!e) return false
  if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) return true
  return /quota|no.?space|device.?space|storage.*full|disk.*full/i.test(`${e.name ?? ''} ${e.message ?? ''}`)
}

function absolute(url) {
  try { return new URL(url, globalThis.location?.href ?? 'http://localhost/').href } catch { return String(url) }
}

// Écrit une réponse dans le cache. S'il n'y a plus de place, supprime les fichiers les plus
// anciennement ENREGISTRÉS, un par un et seulement le nécessaire, en épargnant `protectedUrls`
// (les sons de l'histoire en cours). Toute autre erreur : abandon, sans rien supprimer.
// `makeResponse` est appelé à chaque tentative (un corps de réponse ne se relit pas).
export async function putWithEviction(cache, url, makeResponse, protectedUrls = []) {
  try {
    await cache.put(url, makeResponse())
    return { ok: true, evicted: 0 }
  } catch (e) {
    if (!isQuotaError(e)) return { ok: false, evicted: 0 }
  }
  let keys
  try { keys = await cache.keys() } catch { return { ok: false, evicted: 0 } }
  const keep = new Set([...protectedUrls, url].map(absolute))
  let evicted = 0
  for (const req of keys) {
    const u = absolute(req.url ?? req)
    if (keep.has(u)) continue
    try { await cache.delete(req) } catch { continue }
    evicted++
    try {
      await cache.put(url, makeResponse())
      return { ok: true, evicted }
    } catch (e) {
      if (!isQuotaError(e)) return { ok: false, evicted }
    }
  }
  return { ok: false, evicted }
}

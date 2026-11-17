// Fluidité de Cmd+Z (17/11/2026).
// L'historique garde des COPIES de l'histoire. Appliquer une copie telle quelle remplaçait chaque
// segment, bloc et effet par un objet neuf : la timeline croyait que tout avait changé et
// redessinait tout (~0,7 s avec 300 segments). Ici, on garde l'objet affiché quand il est
// identique à celui de l'historique : seuls les éléments vraiment modifiés sont redessinés.

const keyOf = (item, i) => {
  const k = item && typeof item === 'object' ? (item.id ?? item._id) : undefined
  return k === undefined || k === null ? `#index:${i}` : `id:${String(k)}`
}

// Même contenu (au sens du JSON, comme les copies de l'historique).
const sameContent = (a, b, cache) => {
  if (a === b) return true
  let sa = cache.get(a)
  if (sa === undefined) { sa = JSON.stringify(a); cache.set(a, sa) }
  return sa === JSON.stringify(b)
}

// Renvoie la liste `next` (venue de l'historique) en réutilisant les objets de `current`
// (affichés) qui ont le même identifiant et le même contenu. Si rien ne change, renvoie
// `current` lui-même. Le contenu renvoyé est toujours celui de `next`.
export function reuseUnchanged(next, current) {
  if (!Array.isArray(next) || !Array.isArray(current)) return next
  const byKey = new Map()
  current.forEach((item, i) => {
    const k = keyOf(item, i)
    if (!byKey.has(k)) byKey.set(k, item)
  })
  const used = new Set()
  const cache = new Map()
  let identical = next.length === current.length
  const out = next.map((item, i) => {
    const cur = byKey.get(keyOf(item, i))
    const isObject = typeof cur === 'object' && cur !== null
    if (cur !== undefined && cur === item && !isObject) {
      if (cur !== current[i]) identical = false
      return cur
    }
    if (isObject && !used.has(cur) && sameContent(cur, item, cache)) {
      used.add(cur)
      if (cur !== current[i]) identical = false
      return cur
    }
    identical = false
    return item
  })
  return identical ? current : out
}

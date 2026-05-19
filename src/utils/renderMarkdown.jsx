/**
 * renderMarkdown(text)
 * Parse un Markdown léger et retourne du JSX.
 * Supporte : **gras**, *italique*, __souligné__, ~~barré~~
 * Gère les imbrications : ~~__**texte**__~~ etc.
 */
export function renderMarkdown(text) {
  if (!text) return null
  const result = parseInline(text)
  return result.length > 0 ? result : text
}

function parseInline(text, key = 0) {
  if (!text) return []

  // Ordre important : ** avant * pour éviter la confusion
  const tokens = [
    { marker: '~~', tag: 's' },
    { marker: '__', tag: 'u' },
    { marker: '**', tag: 'strong' },
    { marker: '*',  tag: 'em' },
  ]

  for (const { marker, tag } of tokens) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Pour *, on évite de matcher ** (donc on vérifie que c'est pas précédé/suivi d'un autre *)
    let regex
    if (marker === '*') {
      regex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/s
    } else {
      regex = new RegExp(`${escaped}(.+?)${escaped}`, 's')
    }

    const match = text.match(regex)
    if (!match) continue

    const before = text.slice(0, match.index)
    const inner  = match[1]
    const after  = text.slice(match.index + match[0].length)

    const parts = []
    if (before) parts.push(...parseInline(before, key + 1))

    const Tag = tag
    parts.push(
      <Tag key={`${key}-${match.index}`}>
        {parseInline(inner, key + 100 + match.index)}
      </Tag>
    )

    if (after) parts.push(...parseInline(after, key + 200 + match.index))
    return parts
  }

  // Aucun marqueur trouvé : texte brut
  return [text]
}
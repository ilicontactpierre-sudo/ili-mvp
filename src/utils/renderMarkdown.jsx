/**
 * renderMarkdown(text)
 * Parse un Markdown léger et retourne du JSX.
 * Supporte : **gras**, *italique*, __souligné__
 * Ordre de parsing : souligné → gras → italique
 */
export function renderMarkdown(text) {
  if (!text) return null

  // Découpe le texte en tokens via regex combinée
  // Ordre important : __ avant ** avant *
  const parts = []
  const regex = /(__(.+?)__)|(\*\*(.+?)\*\*)|(\*(.+?)\*)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Texte brut avant le match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[1]) {
      // __souligné__
      parts.push(<u key={match.index}>{match[2]}</u>)
    } else if (match[3]) {
      // **gras**
      parts.push(<strong key={match.index}>{match[4]}</strong>)
    } else if (match[5]) {
      // *italique*
      parts.push(<em key={match.index}>{match[6]}</em>)
    }

    lastIndex = regex.lastIndex
  }

  // Texte restant après le dernier match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}
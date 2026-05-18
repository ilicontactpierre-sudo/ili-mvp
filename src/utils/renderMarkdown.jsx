/**
 * renderMarkdown(text)
 * Parse un Markdown léger et retourne du JSX.
 * Supporte : **gras**, *italique*, __souligné__, ~~barré~~
 */
export function renderMarkdown(text) {
  if (!text) return null

  const parts = []
  // Ordre : ~~barré~~ → __souligné__ → **gras** → *italique*
  const regex = /(~~(.+?)~~)|(__(.+?)__)|(\*\*(.+?)\*\*)|(\*(.+?)\*)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[1]) {
      // ~~barré~~
      parts.push(<s key={match.index}>{match[2]}</s>)
    } else if (match[3]) {
      // __souligné__
      parts.push(<u key={match.index}>{match[4]}</u>)
    } else if (match[5]) {
      // **gras**
      parts.push(<strong key={match.index}>{match[6]}</strong>)
    } else if (match[7]) {
      // *italique*
      parts.push(<em key={match.index}>{match[8]}</em>)
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}
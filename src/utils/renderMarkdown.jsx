/**
 * renderMarkdown(text, segment)
 * Applique le formatage depuis les propriétés du segment (bold, italic, underline, strikethrough)
 * Plus de marqueurs dans le texte — le texte est toujours du texte brut.
 */
export function renderMarkdown(text, segment) {
  if (!text) return null

  let content = text

  if (segment?.strikethrough) content = <s>{content}</s>
  if (segment?.underline)     content = <u>{content}</u>
  if (segment?.italic)        content = <em>{content}</em>
  if (segment?.bold)          content = <strong>{content}</strong>

  return content
}
import { applyBionicReading } from './bionicReading'

/**
 * renderMarkdown(text, segment, isDysMode)
 * Applique le formatage depuis les propriétés du segment.
 * Si isDysMode est actif, applique aussi le Bionic Reading.
 */
export function renderMarkdown(text, segment, isDysMode = false) {
  if (!text) return null

  let content = isDysMode ? applyBionicReading(text) : text

  if (segment?.strikethrough) content = <s>{content}</s>
  if (segment?.underline)     content = <u>{content}</u>
  if (segment?.italic)        content = <em>{content}</em>
  if (segment?.bold)          content = <strong>{content}</strong>

  return content
}
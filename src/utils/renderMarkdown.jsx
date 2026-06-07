import { applyBionicReading } from './bionicReading.jsx'

/**
 * renderMarkdown(text, segment, isDysMode)
 * Applique le formatage depuis les propriétés du segment.
 * Si isDysMode est actif, applique aussi le Bionic Reading.
 */
export function renderMarkdown(text, segment, isDysMode = false) {
  if (!text) return null

  // ── Substitution des tags {{journal:clé}} ──
  const resolvedText = text.replace(/\{\{journal:([^}]+)\}\}/g, (_, key) => {
    try {
      const val = sessionStorage.getItem(`ili_journal_${key.trim()}`)
      return val ? `"${val}"` : '…'
    } catch {
      return '…'
    }
  })

  let content = isDysMode ? applyBionicReading(resolvedText) : resolvedText
  if (segment?.strikethrough) content = <s>{content}</s>
  if (segment?.underline)     content = <u>{content}</u>
  if (segment?.italic)        content = <em>{content}</em>
  if (segment?.bold)          content = <strong>{content}</strong>
  if (segment?.fontFamily) content = <span style={{ fontFamily: segment.fontFamily }}>{content}</span>
  return content
}
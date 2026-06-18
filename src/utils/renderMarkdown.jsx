import { applyBionicReading } from './bionicReading.jsx'
import { renderTextWithInlineFunctions } from './inlineFunctions.jsx'
/**
 * renderMarkdown(text, segment, isDysMode, options)
 * Applique le formatage depuis les propriétés du segment.
 * Si isDysMode est actif, applique aussi le Bionic Reading.
 * options.isFocused : si true, les fonctions inline (ex: </chiffres_up:0;10/>)
 * jouent leur animation. Sinon elles affichent leur valeur finale statique.
 * options.keyPrefix : préfixe des clés React (utile en cas de double appel
 * pour un même segment, ex: rendu avec breakAt).
 */
export function renderMarkdown(text, segment, isDysMode = false, options = {}) {
  if (!text) return null
  const { isFocused = false, keyPrefix = '', emojiMode = false } = options
  // ── Substitution des tags {{journal:clé}} ──
  const resolvedText = text.replace(/\{\{journal:([^}]+)\}\}/g, (_, key) => {
    try {
      const val = sessionStorage.getItem(`ili_journal_${key.trim()}`)
      return val ? `"${val.replace(/\n/g, ' / ')}"` : '…'
    } catch {
      return '…'
    }
  })
  const fallbackRenderer = (chunk) => isDysMode ? applyBionicReading(chunk) : chunk
  let content = renderTextWithInlineFunctions(resolvedText, fallbackRenderer, { isFocused, keyPrefix })
  if (segment?.strikethrough) content = <s>{content}</s>
  if (segment?.underline)     content = <u>{content}</u>
  if (segment?.italic)        content = <em>{content}</em>
  if (segment?.bold)          content = <strong>{content}</strong>
  if (segment?.fontFamily) content = <span style={{ fontFamily: segment.fontFamily }}>{content}</span>
  return content
}
import { applyBionicReading } from './bionicReading.jsx'
import { applyEmojiMode } from './emojiDict.jsx'
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
    // Convertit les \n internes d'un morceau de texte brut (jamais à l'intérieur
  // d'un tag, puisque ce renderer n'est appelé que sur du texte déjà isolé
  // par le parseur de fonctions inline) en vrais retours à la ligne visuels.
  let fbCounter = 0
  const fallbackRenderer = (chunk) => {
    const transform = (s) => {
      if (emojiMode) return applyEmojiMode(s)
      if (isDysMode) return applyBionicReading(s)
      return s
    }
    if (!chunk.includes('\n')) return transform(chunk)
    const parts = chunk.split('\n')
    return parts.map((part, i) => (
      <span key={`${keyPrefix}fb${fbCounter++}`}>
        {transform(part)}
        {i < parts.length - 1 && <br />}
      </span>
    ))
  }
  let content = renderTextWithInlineFunctions(resolvedText, fallbackRenderer, { isFocused, keyPrefix })
  if (segment?.strikethrough) content = <s>{content}</s>
  if (segment?.underline)     content = <u>{content}</u>
  if (segment?.italic)        content = <em>{content}</em>
  if (segment?.bold)          content = <strong>{content}</strong>
  if (segment?.fontFamily) content = <span style={{ fontFamily: segment.fontFamily }}>{content}</span>
  return content
}
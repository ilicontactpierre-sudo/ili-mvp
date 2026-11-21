// Mode emoji : les mots collés à une apostrophe courbe (’) sont reconnus (21/11/2026).
// Preuve faite sur les 872 segments des histoires du dépôt : rien perdu, rien retiré,
// seulement 52 emojis de plus (île, argent, eau…), tous après une apostrophe.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { applyEmojiMode } from './emojiDict.jsx'

const html = (t) => renderToStaticMarkup(<p>{applyEmojiMode(t)}</p>)

describe('applyEmojiMode et les apostrophes', () => {
  it('apostrophe courbe : le mot qui suit est reconnu', () => {
    expect(html('d’écrire')).toContain('✍️')
    expect(html('l’histoire sombre')).toContain('🌑')
    expect(html('‘écrire')).toContain('✍️')
    expect(html('d‘écrire')).toContain('✍️')
  })

  it('apostrophe droite : comme avant', () => {
    expect(html("d'écrire")).toContain('✍️')
  })

  it('le texte reste entier : l’apostrophe est gardée, le mot remplacé garde son titre', () => {
    const h = html('d’écrire')
    expect(h.startsWith('<p>d’<span title="écrire"')).toBe(true)
    expect(html('aujourd’hui')).toBe('<p>aujourd’hui</p>')
  })
})

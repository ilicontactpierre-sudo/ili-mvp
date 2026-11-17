// Texte lisible d'un segment, sans les balises de texte enrichi.
//
// Le lecteur affiche les segments avec renderMarkdown, qui interprète les balises
// (</couleur:#fff|texte/>, </apparition:5300;normal|À suivre…/>, </chiffres_up:0;78/>…).
// Ailleurs (aperçu de reprise, menu des chapitres…), on n'a besoin que du texte :
// cette fonction le donne, tel que le lecteur le voit une fois l'effet terminé.
import { parseInlineSegments } from './inlineFunctions.jsx'

// Nombre final d'un compteur, au même format que le lecteur (formatNumber).
function finalNumber(fromRaw, toRaw) {
  const decimals = (s) => {
    const str = String(s ?? '')
    const i = str.indexOf('.')
    return i === -1 ? 0 : str.length - i - 1
  }
  const value = parseFloat(toRaw)
  if (Number.isNaN(value)) return ''
  const d = Math.max(decimals(fromRaw), decimals(toRaw))
  return d > 0 ? value.toFixed(d) : Math.round(value).toLocaleString('fr-FR')
}

const COUNTER_DEFAULTS = { chiffres_up: ['0', '100'], chiffres_down: ['100', '0'] }

export function toPlainText(text) {
  if (typeof text !== 'string' || text === '') return ''
  // {{journal:clé}} dépend de la lecture en cours : on ne le devine pas.
  const withoutJournal = text.replace(/\{\{journal:[^}]+\}\}/g, '…')
  const parts = parseInlineSegments(withoutJournal).map((seg) => {
    if (seg.type === 'text') return seg.value
    if (seg.name === 'chiffres_up' || seg.name === 'chiffres_down') {
      const [defFrom, defTo] = COUNTER_DEFAULTS[seg.name]
      const from = seg.args[0] === undefined || seg.args[0] === '' ? defFrom : seg.args[0]
      const to = seg.args[1] === undefined || seg.args[1] === '' ? defTo : seg.args[1]
      return finalNumber(from, to)
    }
    // Un texte censuré ne doit pas être révélé dans un aperçu.
    if (seg.name === 'censure') return '…'
    // Valeur mémorisée pendant la lecture : on montre le texte par défaut s'il existe.
    if (seg.name === 'lire') return seg.content || '…'
    // Toutes les autres fonctions « enveloppent » un texte : on garde ce texte.
    return seg.content ?? ''
  })
  return parts.join('').replace(/\s+/g, ' ').trim()
}

// Coupe un texte lisible à `max` caractères, avec « … » si besoin.
export function truncatePlain(text, max, { fromEnd = false } = {}) {
  const plain = toPlainText(text)
  if (plain.length <= max) return plain
  return fromEnd
    ? '… ' + plain.slice(-max).trimStart()
    : plain.slice(0, max).trimEnd() + '…'
}

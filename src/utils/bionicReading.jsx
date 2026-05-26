/**
 * bionicReading(text)
 * Transforme un texte brut en tableau React de spans avec <strong> sur les premières lettres.
 * Non-destructif : le texte original reste intact dans les données.
 */

function getBoldLength(wordLength) {
  if (wordLength <= 3)  return 1
  if (wordLength <= 6)  return 2
  if (wordLength <= 9)  return 3
  return Math.round(wordLength * 0.45)
}

export function applyBionicReading(text) {
  if (!text) return null

  // Découpe en tokens : mots et non-mots (espaces, ponctuation, sauts de ligne)
  const tokens = text.split(/(\s+|[^\w\u00C0-\u024F]+)/u)

  return tokens.map((token, i) => {
    // Token vide
    if (!token) return null

    // Non-mot (espace, ponctuation, saut de ligne) → rendu brut
    if (/^(\s+|[^\w\u00C0-\u024F]+)$/u.test(token)) {
      return token
    }

    // Mot → appliquer la fixation
    const boldLen = getBoldLength(token.length)
    const boldPart  = token.slice(0, boldLen)
    const normalPart = token.slice(boldLen)

    return (
      <span key={i}>
        <strong style={{ fontWeight: 700 }}>{boldPart}</strong>
        {normalPart}
      </span>
    )
  })
}
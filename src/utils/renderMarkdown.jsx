/**
 * renderMarkdown(text)
 * Supporte : **gras**, *italique*, __souligné__, ~~barré~~
 * Gère les imbrications.
 */
export function renderMarkdown(text) {
  if (!text) return null
  return parseInline(text)
}

function parseInline(text) {
  if (!text) return null

  const tokens = [
    { marker: '~~', tag: 's'      },
    { marker: '__', tag: 'u'      },
    { marker: '**', tag: 'strong' },
    { marker: '*',  tag: 'em'     },
  ]

  for (const { marker, tag } of tokens) {
    let startIdx = -1
    let endIdx   = -1

    if (marker === '*') {
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '*' && text[i - 1] !== '*' && text[i + 1] !== '*') {
          if (startIdx === -1) {
            startIdx = i
          } else {
            endIdx = i
            break
          }
        }
      }
    } else {
      startIdx = text.indexOf(marker)
      if (startIdx !== -1) {
        endIdx = text.indexOf(marker, startIdx + marker.length)
      }
    }

    if (startIdx === -1 || endIdx === -1) continue

    const before = text.slice(0, startIdx)
    const inner  = text.slice(startIdx + marker.length, endIdx)
    const after  = text.slice(endIdx + marker.length)

    const Tag = tag

    return (
      <>
        {before || null}
        <Tag>{parseInline(inner)}</Tag>
        {after ? parseInline(after) : null}
      </>
    )
  }

  return text
}
import { useEffect, useRef, useState } from 'react'

// ── Easing "courbe en S" (easeInOutQuint — accélération/décélération plus douces) ──
function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
}

const COUNTER_DURATION = 1400 // ms

// ── Registre des fonctions inline disponibles ──────────────────────────────
// Pour ajouter une nouvelle fonction plus tard :
// 1. ajouter une entrée ici (params + valeurs par défaut)
// 2. ajouter un "case" dans renderInlineFunction() ci-dessous
export const INLINE_FUNCTIONS = {
  chiffres_up: {
    label: '🔢 Chiffres ↑',
    description: 'Compteur animé qui défile de x à y (courbe en S)',
    params: [
      { name: 'x', label: 'Départ',  default: '0' },
      { name: 'y', label: 'Arrivée', default: '100' },
    ],
  },
  chiffres_down: {
    label: '🔢 Chiffres ↓',
    description: 'Compteur animé qui défile de x à y en décroissant',
    params: [
      { name: 'x', label: 'Départ',  default: '100' },
      { name: 'y', label: 'Arrivée', default: '0' },
    ],
  },
}

// ── Helpers nombres ──────────────────────────────────────────────────────────
function countDecimals(str) {
  const idx = String(str).indexOf('.')
  return idx === -1 ? 0 : String(str).length - idx - 1
}
function formatNumber(value, decimals) {
  return decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString('fr-FR')
}
// Réserve la largeur finale du nombre pour éviter que le texte autour
// ne bouge pendant l'animation (ex: passage de "9" à "10")
function counterStyle(finalStr) {
  return {
    display: 'inline-block',
    minWidth: `${finalStr.length}ch`,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  }
}

// ── Composant compteur animé ────────────────────────────────────────────────
function AnimatedCounter({ from, to, decimals, finalStr }) {
  const [value, setValue] = useState(from)
  const rafRef = useRef(null)
  useEffect(() => {
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / COUNTER_DURATION)
      const eased = easeInOutQuint(t)
      setValue(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [from, to])
  return (
    <span style={counterStyle(finalStr)}>
      {formatNumber(value, decimals)}
    </span>
  )
}

// ── Parsing : découpe un texte en segments texte / fonction ────────────────
// Syntaxe : </nom_fonction:arg1;arg2/>  — les arguments sont optionnels
const FN_REGEX = /<\/([a-z_]+)(?::([^/]*))?\/>/g

export function parseInlineSegments(text) {
  if (!text) return [{ type: 'text', value: '' }]
  const segments = []
  let lastIndex = 0
  let match
  FN_REGEX.lastIndex = 0
  while ((match = FN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    const argsRaw = match[2] || ''
    segments.push({
      type: 'fn',
      name: match[1],
      args: argsRaw.length > 0 ? argsRaw.split(';').map(a => a.trim()) : [],
      raw: match[0],
    })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

// ── Résout les arguments en appliquant les valeurs par défaut ───────────────
function resolveArgs(name, args) {
  const def = INLINE_FUNCTIONS[name]
  if (!def) return []
  return def.params.map((p, i) => (args[i] === undefined || args[i] === '') ? p.default : args[i])
}

// ── Rendu d'un tag fonction ──────────────────────────────────────────────────
// isFocused = true  → animation jouée (segment actif dans le player)
// isFocused = false → valeur finale affichée statiquement (segments inactifs, admin...)
export function renderInlineFunction(seg, baseKey, isFocused) {
  const def = INLINE_FUNCTIONS[seg.name]
  if (!def) {
    return <span key={baseKey} style={{ opacity: 0.4 }}>{seg.raw}</span>
  }
  switch (seg.name) {
    case 'chiffres_up':
    case 'chiffres_down': {
      const [xRaw, yRaw] = resolveArgs(seg.name, seg.args)
      const x = parseFloat(xRaw)
      const y = parseFloat(yRaw)
      const decimals = Math.max(countDecimals(xRaw), countDecimals(yRaw))
      if (!isFocused) {
        return <span key={baseKey} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(y, decimals)}</span>
      }
      // La clé change quand isFocused devient true → remount → animation rejouée
      return <AnimatedCounter key={`${baseKey}_active`} from={x} to={y} decimals={decimals} />
    }
    default:
      return <span key={baseKey} style={{ opacity: 0.4 }}>{seg.raw}</span>
  }
}

// ── Wrapper générique ────────────────────────────────────────────────────────
// fallbackRenderer(textChunk) = ce qui était fait sur le texte avant (markdown, bionic...)
export function renderTextWithInlineFunctions(text, fallbackRenderer, options = {}) {
  const { isFocused = false, keyPrefix = '' } = options
  const segments = parseInlineSegments(text)
  // Cas courant (aucun tag) : comportement strictement identique à avant
  if (segments.length === 1 && segments[0].type === 'text') {
    return fallbackRenderer(text)
  }
  return segments.map((seg, i) => {
    if (seg.type === 'fn') {
      return renderInlineFunction(seg, `${keyPrefix}fn${i}`, isFocused)
    }
    return <span key={`${keyPrefix}txt${i}`}>{fallbackRenderer(seg.value)}</span>
  })
}
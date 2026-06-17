import { useEffect, useRef, useState, createContext, useContext } from 'react'

// ── Easing ───────────────────────────────────────────────────────────────────
function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
}

const COUNTER_DURATION = 1400

// ── Helpers intensité / vitesse ──────────────────────────────────────────────
const INTENSITY_MAP = { faible: 0.3, moyen: 1, fort: 2.5 }
const SPEED_MAP     = { lent: 3000, normal: 1500, rapide: 600 }
function resolveIntensity(v) { return INTENSITY_MAP[v] ?? parseFloat(v) ?? 1 }
function resolveSpeed(v)     { return SPEED_MAP[v]     ?? parseInt(v)   ?? 1500 }

// ── Contexte mémoire narrative ────────────────────────────────────────────────
export const NarrativeMemoryContext = createContext(null)
export function useNarrativeMemory() {
  const ctx = useContext(NarrativeMemoryContext)
  if (!ctx) return {
    read:  (key, def) => { try { return sessionStorage.getItem(`ili_mem_${key}`) ?? def } catch { return def } },
    write: (key, val) => { try { sessionStorage.setItem(`ili_mem_${key}`, val) } catch {} },
  }
  return ctx
}

// ── Registre ──────────────────────────────────────────────────────────────────
// wrap: true  → syntaxe </nom:args|contenu/>  (le | est requis)
// wrap: false → syntaxe </nom:args/>           (autonome)
export const INLINE_FUNCTIONS = {
  // ── Wrap ──
  censure: {
    label: '█ Censure',
    description: 'Masque le texte avec des barres noires',
    wrap: true,
    params: [],
    template: () => `</censure|/>`,
    cursorAfterPipe: true,
  },
  pulse: {
    label: '💓 Pulsation',
    description: 'Le texte bat comme un cœur',
    wrap: true,
    params: [
      { name: 'intensité', default: 'moyen', hint: 'faible · moyen · fort' },
      { name: 'vitesse',   default: 'normal', hint: 'lent · normal · rapide' },
    ],
    template: () => `</pulse:moyen;normal|/>`,
    cursorAfterPipe: true,
  },
  tremble: {
    label: '〰️ Tremblement',
    description: 'Le texte tremble',
    wrap: true,
    params: [
      { name: 'intensité', default: 'moyen', hint: 'faible · moyen · fort' },
    ],
    template: () => `</tremble:moyen|/>`,
    cursorAfterPipe: true,
  },
  glitch: {
    label: '📺 Glitch',
    description: 'Le texte glitch puis se stabilise',
    wrap: true,
    params: [
      { name: 'intensité', default: 'moyen', hint: 'faible · moyen · fort' },
      { name: 'mode',      default: 'once',  hint: 'once · loop' },
    ],
    template: () => `</glitch:moyen;once|/>`,
    cursorAfterPipe: true,
  },
  rupture: {
    label: '~~Rupture~~',
    description: 'Le texte se barre de gauche à droite',
    wrap: true,
    params: [
      { name: 'délai', default: '500', hint: 'ms avant apparition du barré' },
    ],
    template: () => `</rupture:500|/>`,
    cursorAfterPipe: true,
  },
  couleur: {
    label: '🎨 Couleur',
    description: 'Colorise le texte',
    wrap: true,
    params: [
      { name: 'hex', default: '#f59e0b', hint: 'ex: #ff6b35' },
    ],
    template: () => `</couleur:#f59e0b|/>`,
    cursorAfterPipe: true,
  },
  taille: {
    label: '🔠 Taille',
    description: 'Change la taille du texte',
    wrap: true,
    params: [
      { name: 'ratio', default: '1.3', hint: '0.5 = petit · 2.0 = grand' },
    ],
    template: () => `</taille:1.3|/>`,
    cursorAfterPipe: true,
  },
  fondu_mot: {
    label: '🌫️ Fondu des mots',
    description: 'Les mots apparaissent un par un en fondu',
    wrap: true,
    params: [
      { name: 'durée', default: '1200', hint: 'durée totale en ms' },
    ],
    template: () => `</fondu_mot:1200|/>`,
    cursorAfterPipe: true,
  },
  lire: {
    label: '📖 Rappeler',
    description: 'Insère une valeur mémorisée, ou le texte après | par défaut',
    wrap: true,
    params: [
      { name: 'clé', default: 'prenom', hint: 'clé mémorisée avec </ecrire/>' },
    ],
    template: () => `</lire:prenom|/>`,
    cursorAfterPipe: true,
  },
  // ── Autonomes ──
  chiffres_up: {
    label: '🔢 Compteur ↑',
    description: 'Compteur animé croissant',
    wrap: false,
    params: [
      { name: 'de',  default: '0' },
      { name: 'à',   default: '100' },
    ],
    template: () => `</chiffres_up:0;100/>`,
    cursorAfterPipe: false,
  },
  chiffres_down: {
    label: '🔢 Compteur ↓',
    description: 'Compteur animé décroissant',
    wrap: false,
    params: [
      { name: 'de',  default: '100' },
      { name: 'à',   default: '0' },
    ],
    template: () => `</chiffres_down:100;0/>`,
    cursorAfterPipe: false,
  },
  obscurcir: {
    label: '🌑 Obscurcissement',
    description: "L'écran noircit puis revient",
    wrap: false,
    params: [
      { name: 'durée', default: '1500', hint: 'ms' },
    ],
    template: () => `</obscurcir:1500/>`,
    cursorAfterPipe: false,
  },
  // ecrire supprimé — la mémorisation se fait via GameMode "journal"
  // ou via le Seuil du StartScreen. Cf. {{journal:clé}} et </lire:clé/>
}

// ── Parser ────────────────────────────────────────────────────────────────────
// Syntaxe unifiée :
//   Wrap      : </nom:arg1;arg2|contenu/>
//   Autonome  : </nom:arg1;arg2/>
// Le | est le séparateur args / contenu pour les fonctions wrap.
// Un tag sans | est toujours autonome.
const FN_REGEX = /<\/([a-zA-ZÀ-ÿ_]+)(?::([^|/>]*))?(?:\|([^>]*?))?\/>/g

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
    const argsRaw   = match[2] || ''
    const content   = match[3] // undefined si pas de |, '' si | sans contenu
    const isWrap    = content !== undefined
    segments.push({
      type:    'fn',
      name:    match[1],
      args:    argsRaw.length > 0 ? argsRaw.split(';').map(a => a.trim()) : [],
      content: isWrap ? content : null,
      raw:     match[0],
    })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

function resolveArgs(name, args) {
  const def = INLINE_FUNCTIONS[name]
  if (!def) return []
  return def.params.map((p, i) =>
    (args[i] === undefined || args[i] === '') ? p.default : args[i]
  )
}

// ── Helpers nombres ───────────────────────────────────────────────────────────
function countDecimals(str) {
  const idx = String(str).indexOf('.')
  return idx === -1 ? 0 : String(str).length - idx - 1
}
function formatNumber(value, decimals) {
  return decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString('fr-FR')
}
function counterStyle(finalStr) {
  return {
    display: 'inline-block',
    minWidth: `${finalStr.length}ch`,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  }
}

// ── Composants ────────────────────────────────────────────────────────────────

function AnimatedCounter({ from, to, decimals, finalStr }) {
  const [value, setValue] = useState(from)
  const rafRef = useRef(null)
  useEffect(() => {
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / COUNTER_DURATION)
      setValue(from + (to - from) * easeInOutQuint(t))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [from, to])
  return <span style={counterStyle(finalStr)}>{formatNumber(value, decimals)}</span>
}

function PulseSpan({ children, intensité, vitesse }) {
  const amp   = resolveIntensity(intensité)
  const speed = resolveSpeed(vitesse)
  const id    = useRef(`pulse_${Math.random().toString(36).slice(2, 8)}`)
  const scale = 1 + amp * 0.08
  return (
    <>
      <style>{`
        @keyframes ${id.current} {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(${scale.toFixed(3)}); }
        }
      `}</style>
      <span style={{ display: 'inline-block', animation: `${id.current} ${speed}ms ease-in-out infinite` }}>
        {children}
      </span>
    </>
  )
}

function TrembleSpan({ children, intensité }) {
  const amp = resolveIntensity(intensité)
  const id  = useRef(`tremble_${Math.random().toString(36).slice(2, 8)}`)
  const px  = Math.max(1, Math.round(amp * 1.5))
  const dur = Math.round(120 + amp * 20)
  return (
    <>
      <style>{`
        @keyframes ${id.current} {
          0%,100% { transform: translate(0,0); }
          20%     { transform: translate(-${px}px,${px}px); }
          40%     { transform: translate(${px}px,-${px}px); }
          60%     { transform: translate(-${px}px,0); }
          80%     { transform: translate(${px}px,${px}px); }
        }
      `}</style>
      <span style={{ display: 'inline-block', animation: `${id.current} ${dur}ms linear infinite` }}>
        {children}
      </span>
    </>
  )
}

function GlitchSpan({ children, intensité, isFocused }) {
  const amp = resolveIntensity(intensité)
  const dur = Math.round(800 + amp * 400)
  const id  = useRef(`glitch_${Math.random().toString(36).slice(2, 8)}`)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!isFocused) { setDone(false); return }
    const t = setTimeout(() => setDone(true), dur)
    return () => clearTimeout(t)
  }, [isFocused, dur])
  if (!isFocused || done) return <span>{children}</span>
  const px = Math.round(amp * 3)
  return (
    <>
      <style>{`
        @keyframes ${id.current} {
          0%   { clip-path:inset(0 0 100% 0); transform:translate(0); }
          15%  { clip-path:inset(10% 0 60% 0); transform:translate(-${px}px,1px); }
          30%  { clip-path:inset(40% 0 20% 0); transform:translate(${px}px,-1px); }
          50%  { clip-path:inset(70% 0 5% 0);  transform:translate(-${px}px,0); }
          65%  { clip-path:inset(20% 0 50% 0); transform:translate(${px}px,1px); }
          80%  { clip-path:inset(0 0 0 0);     transform:translate(-1px,0); }
          100% { clip-path:inset(0 0 0 0);     transform:translate(0); }
        }
      `}</style>
      <span style={{ display: 'inline-block', animation: `${id.current} ${dur}ms steps(1) forwards` }}>
        {children}
      </span>
    </>
  )
}

function RuptureSpan({ children, délai, isFocused }) {
  const [shown, setShown] = useState(false)
  const delay = parseInt(délai) || 500
  useEffect(() => {
    if (!isFocused) { setShown(false); return }
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [isFocused, delay])
  return (
    <>
      <style>{`
        @keyframes ili-strikethrough {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
      <span style={{ display: 'inline-block', position: 'relative' }}>
        {children}
        {shown && (
          <span style={{
            position: 'absolute',
            left: 0, right: 0, top: '50%',
            height: '1.5px',
            backgroundColor: 'currentColor',
            transformOrigin: 'left center',
            animation: 'ili-strikethrough 350ms cubic-bezier(0.4,0,0.2,1) forwards',
          }} />
        )}
      </span>
    </>
  )
}

function FonduMotSpan({ text, duree, isFocused }) {
  const words  = text.split(/(\s+)/)
  const total  = words.filter(w => w.trim()).length
  const perWord = Math.max(80, parseInt(duree) / Math.max(total, 1))
  let wordIdx  = 0
  return (
    <>
      {isFocused && (
        <style>{`
          @keyframes ili-fondu-in {
            from { opacity:0; transform:translateY(4px); }
            to   { opacity:1; transform:translateY(0); }
          }
        `}</style>
      )}
      {words.map((w, i) => {
        if (!w.trim()) return <span key={i}>{w}</span>
        const delay = isFocused ? wordIdx++ * perWord : 0
        return (
          <span key={i} style={{
            display: 'inline-block',
            opacity: isFocused ? 0 : 1,
            animation: isFocused ? `ili-fondu-in 400ms ease forwards ${delay}ms` : 'none',
          }}>
            {w}
          </span>
        )
      })}
    </>
  )
}

function ObscurirOverlay({ duree, isFocused }) {
  const [phase, setPhase] = useState('idle')
  const dur = parseInt(duree) || 1500
  useEffect(() => {
    if (!isFocused) { setPhase('idle'); return }
    setPhase('in')
    const t1 = setTimeout(() => setPhase('out'), dur * 0.5)
    const t2 = setTimeout(() => setPhase('idle'), dur)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isFocused, dur])
  if (phase === 'idle') return null
  return (
    <span aria-hidden="true" style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#000',
      zIndex: 8000,
      pointerEvents: 'none',
      opacity: phase === 'in' ? 1 : 0,
      transition: phase === 'in'
        ? `opacity ${Math.round(dur * 0.45)}ms ease-in`
        : `opacity ${Math.round(dur * 0.45)}ms ease-out`,
    }} />
  )
}

function CensureSpan({ children }) {
  const text = typeof children === 'string' ? children : ''
  return (
    <span style={{
      display: 'inline-block',
      backgroundColor: 'var(--color-text-focus, currentColor)',
      color: 'transparent',
      borderRadius: '2px',
      userSelect: 'none',
      minWidth: `${Math.max(text.length, 4) * 0.58}em`,
      verticalAlign: 'middle',
      lineHeight: 1.15,
    }}>
      {text || '████'}
    </span>
  )
}

function EcrireEffect({ cle, valeur }) {
  const mem = useNarrativeMemory()
  useEffect(() => { if (cle) mem.write(cle, valeur) }, [cle, valeur])
  return null
}

function LireSpan({ cle, defaut }) {
  const mem = useNarrativeMemory()
  // Lire d'abord dans ili_journal_ (GameMode journal, seuil),
  // puis dans ili_mem_ (mémoire narrative), puis le défaut
  const val = (() => {
    try {
      const journal = sessionStorage.getItem(`ili_journal_${cle}`)
      if (journal !== null) return journal
    } catch {}
    return mem.read(cle, defaut)
  })()
  return <span>{val}</span>
}

// ── Rendu d'un segment fonction ───────────────────────────────────────────────
export function renderInlineFunction(seg, baseKey, isFocused, fallbackRenderer) {
  const def = INLINE_FUNCTIONS[seg.name]

  // Fonction inconnue → afficher le tag brut en grisé
  if (!def) {
    return (
      <span key={baseKey} style={{ opacity: 0.35, fontFamily: 'monospace', fontSize: '0.75em' }}>
        {seg.raw}
      </span>
    )
  }

  // Contenu enveloppé (fonctions wrap)
  const inner = seg.content !== null
    ? (fallbackRenderer ? fallbackRenderer(seg.content) : seg.content)
    : null

  switch (seg.name) {

    // ── Compteurs (autonomes) ──
    case 'chiffres_up':
    case 'chiffres_down': {
      const [xRaw, yRaw] = resolveArgs(seg.name, seg.args)
      const x = parseFloat(xRaw), y = parseFloat(yRaw)
      const decimals = Math.max(countDecimals(xRaw), countDecimals(yRaw))
      const finalStr = formatNumber(y, decimals)
      if (!isFocused) return <span key={baseKey} style={counterStyle(finalStr)}>{finalStr}</span>
      return <AnimatedCounter key={`${baseKey}_on`} from={x} to={y} decimals={decimals} finalStr={finalStr} />
    }

    // ── Wrap : effets sur le contenu ──
    case 'pulse': {
      const [intensité, vitesse] = resolveArgs('pulse', seg.args)
      if (!isFocused) return <span key={baseKey}>{inner}</span>
      return <PulseSpan key={baseKey} intensité={intensité} vitesse={vitesse}>{inner}</PulseSpan>
    }
    case 'tremble': {
      const [intensité] = resolveArgs('tremble', seg.args)
      if (!isFocused) return <span key={baseKey}>{inner}</span>
      return <TrembleSpan key={baseKey} intensité={intensité}>{inner}</TrembleSpan>
    }
    case 'glitch': {
      const [intensité] = resolveArgs('glitch', seg.args)
      return <GlitchSpan key={`${baseKey}_on`} intensité={intensité} isFocused={isFocused}>{inner}</GlitchSpan>
    }
    case 'rupture': {
      const [délai] = resolveArgs('rupture', seg.args)
      return <RuptureSpan key={`${baseKey}_on`} délai={délai} isFocused={isFocused}>{inner}</RuptureSpan>
    }
    case 'couleur': {
      const [hex] = resolveArgs('couleur', seg.args)
      return <span key={baseKey} style={{ color: hex }}>{inner}</span>
    }
    case 'taille': {
      const [ratio] = resolveArgs('taille', seg.args)
      return <span key={baseKey} style={{ fontSize: `${parseFloat(ratio)}em`, lineHeight: 1.2 }}>{inner}</span>
    }
    case 'fondu_mot': {
      const [duree] = resolveArgs('fondu_mot', seg.args)
      return (
        <FonduMotSpan
          key={`${baseKey}_on`}
          text={seg.content || ''}
          duree={duree}
          isFocused={isFocused}
        />
      )
    }
    case 'censure': {
      return <CensureSpan key={baseKey}>{seg.content || ''}</CensureSpan>
    }

    // ── Autonomes ──
    case 'obscurcir': {
      const [duree] = resolveArgs('obscurcir', seg.args)
      return <ObscurirOverlay key={`${baseKey}_on`} duree={duree} isFocused={isFocused} />
    }
    // case 'ecrire' supprimé
    case 'lire': {
      const [cle] = resolveArgs('lire', seg.args)
      // Le contenu après | est le texte par défaut
      const defaut = seg.content ?? 'ami'
      return <LireSpan key={baseKey} cle={cle} defaut={defaut} />
    }

    default:
      return <span key={baseKey} style={{ opacity: 0.4 }}>{seg.raw}</span>
  }
}

// ── Wrapper principal ─────────────────────────────────────────────────────────
export function renderTextWithInlineFunctions(text, fallbackRenderer, options = {}) {
  const { isFocused = false, keyPrefix = '' } = options
  const segments = parseInlineSegments(text)

  // Cas courant : aucun tag → comportement identique à avant
  if (segments.length === 1 && segments[0].type === 'text') {
    return fallbackRenderer(text)
  }

  return segments.map((seg, i) => {
    if (seg.type === 'text') {
      return <span key={`${keyPrefix}txt${i}`}>{fallbackRenderer(seg.value)}</span>
    }
    return renderInlineFunction(seg, `${keyPrefix}fn${i}`, isFocused, fallbackRenderer)
  })
}

// ── Calcule la position écran du curseur dans un textarea ─────────────────────
const MIRROR_PROPERTIES = [
  'boxSizing','width','height','overflowX','overflowY',
  'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderStyle',
  'paddingTop','paddingRight','paddingBottom','paddingLeft',
  'fontStyle','fontVariant','fontWeight','fontSize','fontFamily',
  'lineHeight','textAlign','textIndent','letterSpacing','wordSpacing','tabSize',
]
export function getCaretCoordinates(textarea, position) {
  const div = document.createElement('div')
  const style = getComputedStyle(textarea)
  div.style.position    = 'absolute'
  div.style.visibility  = 'hidden'
  div.style.whiteSpace  = 'pre-wrap'
  div.style.wordWrap    = 'break-word'
  div.style.top = '0'
  div.style.left = '0'
  MIRROR_PROPERTIES.forEach(prop => { div.style[prop] = style[prop] })
  document.body.appendChild(div)
  div.textContent = textarea.value.substring(0, position)
  const span = document.createElement('span')
  span.textContent = textarea.value.substring(position) || '.'
  div.appendChild(span)
  const rect       = textarea.getBoundingClientRect()
  const top        = span.offsetTop  + parseInt(style.borderTopWidth,  10) - textarea.scrollTop
  const left       = span.offsetLeft + parseInt(style.borderLeftWidth, 10) - textarea.scrollLeft
  const lineHeight = parseInt(style.lineHeight, 10) || 20
  document.body.removeChild(div)
  return { top: rect.top + top + lineHeight, left: rect.left + left }
}
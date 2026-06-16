import { useEffect, useRef, useState, createContext, useContext } from 'react'

// ── Easing ───────────────────────────────────────────────────────────────────
function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
}

// ── Constantes durées ────────────────────────────────────────────────────────
const COUNTER_DURATION = 1400

// ── Helpers intensité / vitesse ──────────────────────────────────────────────
const INTENSITY_MAP = { faible: 0.3, moyen: 1, fort: 2.5 }
const SPEED_MAP     = { lent: 3000, normal: 1500, rapide: 600 }
function resolveIntensity(v) { return INTENSITY_MAP[v] ?? parseFloat(v) ?? 1 }
function resolveSpeed(v)     { return SPEED_MAP[v]     ?? parseInt(v)   ?? 1500 }

// ── Contexte mémoire narrative ────────────────────────────────────────────────
// Permet à </écrire/> et </lire/> de partager un état sessionStorage
// sans prop-drilling. Le Provider est posé dans StoryPage/StoryReader.
export const NarrativeMemoryContext = createContext(null)

export function useNarrativeMemory() {
  const ctx = useContext(NarrativeMemoryContext)
  if (!ctx) return {
    read:  (key, def) => { try { return sessionStorage.getItem(`ili_mem_${key}`) ?? def } catch { return def } },
    write: (key, val) => { try { sessionStorage.setItem(`ili_mem_${key}`, val) } catch {} },
  }
  return ctx
}

// ── Registre des fonctions inline ────────────────────────────────────────────
export const INLINE_FUNCTIONS = {
  chiffres_up: {
    label: '🔢 Compteur ↑',
    description: 'Compteur animé croissant (courbe en S)',
    params: [
      { name: 'de',  label: 'Départ',  default: '0' },
      { name: 'à',   label: 'Arrivée', default: '100' },
    ],
  },
  chiffres_down: {
    label: '🔢 Compteur ↓',
    description: 'Compteur animé décroissant',
    params: [
      { name: 'de',  label: 'Départ',  default: '100' },
      { name: 'à',   label: 'Arrivée', default: '0' },
    ],
  },
  pulse: {
    label: '💓 Pulsation',
    description: 'Mot qui bat comme un cœur',
    params: [
      { name: 'intensité', label: 'Intensité', default: 'moyen', hint: 'faible · moyen · fort' },
      { name: 'vitesse',   label: 'Vitesse',   default: 'normal', hint: 'lent · normal · rapide' },
    ],
  },
  tremble: {
    label: '〰️ Tremblement',
    description: 'Mot qui tremble',
    params: [
      { name: 'intensité', label: 'Intensité', default: 'moyen', hint: 'faible · moyen · fort' },
    ],
  },
  fondu_mot: {
    label: '🌫️ Fondu des mots',
    description: 'Les mots apparaissent un par un en fondu',
    params: [
      { name: 'durée', label: 'Durée totale (ms)', default: '1200' },
    ],
  },
  couleur: {
    label: '🎨 Couleur',
    description: 'Colorise un mot ou groupe de mots',
    params: [
      { name: 'hex', label: 'Couleur hex', default: '#f59e0b', hint: 'ex: #ff6b35' },
    ],
  },
  taille: {
    label: '🔠 Taille',
    description: 'Change la taille du texte',
    params: [
      { name: 'ratio', label: 'Ratio', default: '1.3', hint: '0.5 = petit · 2.0 = grand' },
    ],
  },
  glitch: {
    label: '📺 Glitch',
    description: 'Mot qui glitch puis se stabilise',
    params: [
      { name: 'intensité', label: 'Intensité', default: 'moyen', hint: 'faible · moyen · fort' },
    ],
  },
  obscurcir: {
    label: '🌑 Obscurcissement',
    description: "L'écran noircit progressivement puis revient",
    params: [
      { name: 'durée', label: 'Durée (ms)', default: '1500' },
    ],
  },
  censure: {
    label: '█ Censure',
    description: 'Remplace le texte par des barres noires',
    params: [],
  },
  rupture: {
    label: '~~Rupture~~',
    description: 'Le texte se barre progressivement de gauche à droite',
    params: [
      { name: 'délai', label: 'Délai avant (ms)', default: '500' },
    ],
  },
  ecrire: {
    label: '💾 Mémoriser',
    description: "Mémorise une valeur silencieusement pour cette lecture",
    params: [
      { name: 'clé',    label: 'Clé',    default: 'prenom' },
      { name: 'valeur', label: 'Valeur', default: 'lecteur' },
    ],
  },
  lire: {
    label: '📖 Rappeler',
    description: "Insère une valeur mémorisée, ou le texte par défaut",
    params: [
      { name: 'clé',     label: 'Clé',      default: 'prenom' },
      { name: 'défaut',  label: 'Par défaut', default: 'ami' },
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
function counterStyle(finalStr) {
  return {
    display: 'inline-block',
    minWidth: `${finalStr.length}ch`,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  }
}

// ── Composants animés ────────────────────────────────────────────────────────

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
  const id    = useRef(`pulse_${Math.random().toString(36).slice(2)}`)
  const scale = 1 + amp * 0.08
  return (
    <>
      <style>{`
        @keyframes ${id.current} {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(${scale}); }
        }
      `}</style>
      <span style={{
        display: 'inline-block',
        animation: `${id.current} ${speed}ms ease-in-out infinite`,
      }}>
        {children}
      </span>
    </>
  )
}

function TrembleSpan({ children, intensité }) {
  const amp = resolveIntensity(intensité)
  const id  = useRef(`tremble_${Math.random().toString(36).slice(2)}`)
  const px  = Math.round(amp * 1.5)
  return (
    <>
      <style>{`
        @keyframes ${id.current} {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          20%     { transform: translate(-${px}px,${px}px) rotate(-0.3deg); }
          40%     { transform: translate(${px}px,-${px}px) rotate(0.3deg); }
          60%     { transform: translate(-${px}px,0) rotate(0.1deg); }
          80%     { transform: translate(${px}px,${px}px) rotate(-0.1deg); }
        }
      `}</style>
      <span style={{
        display: 'inline-block',
        animation: `${id.current} ${120 + Math.round(amp * 20)}ms linear infinite`,
      }}>
        {children}
      </span>
    </>
  )
}

function FonduMotSpan({ text, duree, isFocused }) {
  const words = text.split(/(\s+)/)
  const total = words.filter(w => w.trim()).length
  const perWord = Math.max(80, parseInt(duree) / Math.max(total, 1))
  let wordIdx = 0
  return (
    <>
      {words.map((w, i) => {
        if (!w.trim()) return <span key={i}>{w}</span>
        const delay = isFocused ? wordIdx++ * perWord : 0
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: isFocused ? 0 : 1,
              animation: isFocused
                ? `ili-fondu-in 400ms ease forwards ${delay}ms`
                : 'none',
            }}
          >
            {w}
          </span>
        )
      })}
      {isFocused && (
        <style>{`
          @keyframes ili-fondu-in {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}
    </>
  )
}

function GlitchSpan({ children, intensité, isFocused }) {
  const amp     = resolveIntensity(intensité)
  const dur     = Math.round(800 + amp * 400)
  const id      = useRef(`glitch_${Math.random().toString(36).slice(2)}`)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!isFocused) { setDone(false); return }
    const timer = setTimeout(() => setDone(true), dur)
    return () => clearTimeout(timer)
  }, [isFocused, dur])
  if (!isFocused || done) return <span>{children}</span>
  const px = Math.round(amp * 3)
  return (
    <>
      <style>{`
        @keyframes ${id.current} {
          0%   { clip-path: inset(0 0 100% 0); transform: translate(0); opacity: 1; }
          10%  { clip-path: inset(10% 0 60% 0); transform: translate(-${px}px, 1px); opacity: 0.9; }
          20%  { clip-path: inset(40% 0 20% 0); transform: translate(${px}px, -1px); opacity: 0.8; }
          30%  { clip-path: inset(70% 0 5% 0);  transform: translate(-${px}px, 0); opacity: 0.9; }
          40%  { clip-path: inset(20% 0 50% 0); transform: translate(${px}px, 1px); opacity: 1; }
          50%  { clip-path: inset(0 0 80% 0);   transform: translate(0, -1px); opacity: 0.85; }
          60%  { clip-path: inset(5% 0 30% 0);  transform: translate(${Math.round(px/2)}px, 0); opacity: 0.95; }
          70%  { clip-path: inset(60% 0 10% 0); transform: translate(0, 1px); opacity: 1; }
          85%  { clip-path: inset(0 0 0 0);     transform: translate(-1px, 0); opacity: 0.9; }
          100% { clip-path: inset(0 0 0 0);     transform: translate(0); opacity: 1; }
        }
      `}</style>
      <span style={{
        display: 'inline-block',
        animation: `${id.current} ${dur}ms steps(1) forwards`,
      }}>
        {children}
      </span>
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
    <span
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        zIndex: 8000,
        pointerEvents: 'none',
        opacity: phase === 'in' ? 1 : 0,
        transition: phase === 'in'
          ? `opacity ${dur * 0.45}ms ease-in`
          : `opacity ${dur * 0.45}ms ease-out`,
      }}
    />
  )
}

function CensureSpan({ children }) {
  const text = typeof children === 'string' ? children : ''
  const len  = Math.max(text.length, 4)
  return (
    <span style={{
      display: 'inline-block',
      backgroundColor: 'currentColor',
      color: 'transparent',
      borderRadius: '2px',
      userSelect: 'none',
      minWidth: `${len * 0.6}em`,
      verticalAlign: 'middle',
      lineHeight: 1.1,
    }}>
      {text || '████'}
    </span>
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
          from { transform: scaleX(0); transform-origin: left center; }
          to   { transform: scaleX(1); transform-origin: left center; }
        }
      `}</style>
      <span style={{ display: 'inline-block', position: 'relative' }}>
        {children}
        {shown && (
          <span style={{
            position: 'absolute',
            left: 0, right: 0,
            top: '50%',
            height: '1.5px',
            backgroundColor: 'currentColor',
            animation: 'ili-strikethrough 350ms cubic-bezier(0.4,0,0.2,1) forwards',
          }} />
        )}
      </span>
    </>
  )
}

function EcrireEffect({ cle, valeur }) {
  const mem = useNarrativeMemory()
  useEffect(() => {
    if (cle) mem.write(cle, valeur)
  }, [cle, valeur])
  return null // invisible
}

function LireSpan({ cle, defaut }) {
  const mem = useNarrativeMemory()
  const val = mem.read(cle, defaut)
  return <span>{val}</span>
}

// ── Parsing ───────────────────────────────────────────────────────────────────
const FN_REGEX = /<\/([a-zÀ-ÿ_]+)(?::([^/]*))?\/>/g

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
  if (lastIndex < text.length) segments.push({ type: 'text', value: text.slice(lastIndex) })
  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

function resolveArgs(name, args) {
  const def = INLINE_FUNCTIONS[name]
  if (!def) return []
  return def.params.map((p, i) => (args[i] === undefined || args[i] === '') ? p.default : args[i])
}

// ── Rendu d'un tag fonction ───────────────────────────────────────────────────
export function renderInlineFunction(seg, baseKey, isFocused, fallbackRenderer) {
  const def = INLINE_FUNCTIONS[seg.name]
  if (!def) {
    return <span key={baseKey} style={{ opacity: 0.4, fontFamily: 'monospace', fontSize: '0.8em' }}>{seg.raw}</span>
  }

  // Le "contenu textuel" entre les balises = ce que la fonction "entoure"
  // Pour les fonctions sans texte enfant, on utilise le premier arg comme label
  // (ex: </censure/> → affiche "████", </couleur:#f00/>mot → colorie "mot")
  // NOTE : dans notre syntaxe, le texte enveloppé n'existe pas — les args SONT
  // les paramètres. Pour pulse/tremble/etc. qui s'appliquent à un mot,
  // l'usage est : mot</pulse:fort/>  → pas encore supporté (Phase 3 future).
  // Ici on rend l'effet "autonome" : le composant s'affiche inline.

  switch (seg.name) {
    // ── Compteurs ──
    case 'chiffres_up':
    case 'chiffres_down': {
      const [xRaw, yRaw] = resolveArgs(seg.name, seg.args)
      const x = parseFloat(xRaw), y = parseFloat(yRaw)
      const decimals = Math.max(countDecimals(xRaw), countDecimals(yRaw))
      const finalStr = formatNumber(y, decimals)
      if (!isFocused) return <span key={baseKey} style={counterStyle(finalStr)}>{finalStr}</span>
      return <AnimatedCounter key={`${baseKey}_active`} from={x} to={y} decimals={decimals} finalStr={finalStr} />
    }
    // ── Effets sur du texte "libre" autour du tag ──
    // Pour pulse/tremble/glitch/rupture/censure/couleur/taille/fondu_mot :
    // le tag s'applique au texte qui le PRÉCÈDE dans le même segment.
    // renderTextWithInlineFunctions gère ça via le mode "wrap" ci-dessous.
    // Ici on retourne null car le wrapping est géré dans le wrapper.
    case 'pulse':
    case 'tremble':
    case 'glitch':
    case 'rupture':
    case 'couleur':
    case 'taille':
    case 'fondu_mot':
    case 'censure':
      // géré par le wrapper "wrap-back" — ne devrait pas arriver ici seul
      return <span key={baseKey} style={{ opacity: 0.3, fontSize: '0.7em' }}>{seg.raw}</span>

    // ── Obscurcir : overlay plein écran déclenché au focus ──
    case 'obscurcir': {
      const [duree] = resolveArgs('obscurcir', seg.args)
      return <ObscurirOverlay key={`${baseKey}_active`} duree={duree} isFocused={isFocused} />
    }
    // ── Mémoire ──
    case 'ecrire': {
      const [cle, valeur] = resolveArgs('ecrire', seg.args)
      return <EcrireEffect key={baseKey} cle={cle} valeur={valeur} />
    }
    case 'lire': {
      const [cle, defaut] = resolveArgs('lire', seg.args)
      return <LireSpan key={baseKey} cle={cle} defaut={defaut} />
    }
    default:
      return <span key={baseKey} style={{ opacity: 0.4 }}>{seg.raw}</span>
  }
}

// ── Wrapper générique ─────────────────────────────────────────────────────────
// Gère deux modes :
// 1. Tags "autonomes" (obscurcir, compteurs, lire, ecrire) → rendus directement
// 2. Tags "wrap-back" (pulse, tremble, couleur, taille, glitch, rupture, censure,
//    fondu_mot) → s'appliquent au chunk de texte qui PRÉCÈDE le tag
export function renderTextWithInlineFunctions(text, fallbackRenderer, options = {}) {
  const { isFocused = false, keyPrefix = '' } = options

  const WRAP_BACK_FNS = new Set([
    'pulse', 'tremble', 'glitch', 'rupture',
    'couleur', 'taille', 'fondu_mot', 'censure',
  ])

  const segments = parseInlineSegments(text)

  // Cas courant (aucun tag) : comportement strictement identique à avant
  if (segments.length === 1 && segments[0].type === 'text') {
    return fallbackRenderer(text)
  }

  const result = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.type === 'text') {
      result.push(<span key={`${keyPrefix}txt${i}`}>{fallbackRenderer(seg.value)}</span>)
      continue
    }
    // Tag fonction
    if (WRAP_BACK_FNS.has(seg.name)) {
      // Retirer le dernier chunk texte pour l'envelopper avec l'effet
      const prev = result[result.length - 1]
      const prevText = prev?.props?.children
      const textToWrap = typeof prevText === 'string' ? prevText
        : (prev?.props?.children?.props?.children ?? '')
      if (result.length > 0) result.pop()
      result.push(wrapWithEffect(seg, textToWrap, `${keyPrefix}wrap${i}`, isFocused, fallbackRenderer))
    } else {
      result.push(renderInlineFunction(seg, `${keyPrefix}fn${i}`, isFocused, fallbackRenderer))
    }
  }
  return result
}

// ── Applique un effet "wrap-back" sur un chunk de texte ──────────────────────
function wrapWithEffect(seg, text, key, isFocused, fallbackRenderer) {
  const rendered = fallbackRenderer(text)
  switch (seg.name) {
    case 'pulse': {
      const [intensité, vitesse] = resolveArgs('pulse', seg.args)
      if (!isFocused) return <span key={key}>{rendered}</span>
      return <PulseSpan key={key} intensité={intensité} vitesse={vitesse}>{rendered}</PulseSpan>
    }
    case 'tremble': {
      const [intensité] = resolveArgs('tremble', seg.args)
      if (!isFocused) return <span key={key}>{rendered}</span>
      return <TrembleSpan key={key} intensité={intensité}>{rendered}</TrembleSpan>
    }
    case 'glitch': {
      const [intensité] = resolveArgs('glitch', seg.args)
      return <GlitchSpan key={`${key}_active`} intensité={intensité} isFocused={isFocused}>{rendered}</GlitchSpan>
    }
    case 'rupture': {
      const [délai] = resolveArgs('rupture', seg.args)
      return <RuptureSpan key={key} délai={délai} isFocused={isFocused}>{rendered}</RuptureSpan>
    }
    case 'couleur': {
      const [hex] = resolveArgs('couleur', seg.args)
      return <span key={key} style={{ color: hex }}>{rendered}</span>
    }
    case 'taille': {
      const [ratio] = resolveArgs('taille', seg.args)
      return <span key={key} style={{ fontSize: `${parseFloat(ratio)}em`, lineHeight: 1.2 }}>{rendered}</span>
    }
    case 'fondu_mot': {
      const [duree] = resolveArgs('fondu_mot', seg.args)
      return <FonduMotSpan key={`${key}_active`} text={text} duree={duree} isFocused={isFocused} />
    }
    case 'censure': {
      return <CensureSpan key={key}>{text}</CensureSpan>
    }
    default:
      return <span key={key}>{rendered}</span>
  }
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
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  div.style.top = '0'
  div.style.left = '0'
  MIRROR_PROPERTIES.forEach(prop => { div.style[prop] = style[prop] })
  document.body.appendChild(div)
  div.textContent = textarea.value.substring(0, position)
  const span = document.createElement('span')
  span.textContent = textarea.value.substring(position) || '.'
  div.appendChild(span)
  const rect = textarea.getBoundingClientRect()
  const top  = span.offsetTop  + parseInt(style.borderTopWidth,  10) - textarea.scrollTop
  const left = span.offsetLeft + parseInt(style.borderLeftWidth, 10) - textarea.scrollLeft
  const lineHeight = parseInt(style.lineHeight, 10) || 20
  document.body.removeChild(div)
  return { top: rect.top + top + lineHeight, left: rect.left + left }
}
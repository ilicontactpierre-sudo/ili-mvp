import { useState, useEffect, useRef } from 'react'

// ── Palette couleurs narratives ──────────────────────────────────────────────
// Chaque couleur a une variante sombre (lisible sur fond noir) et claire (lisible sur fond blanc)
// L'éditeur admin est toujours sombre → on affiche dark dans la palette
// La valeur insérée dans le tag est dark (la plus lisible en lecture immersive, mode sombre par défaut)
const NARRATIVE_COLORS = [
  { name: 'Braise',    dark: '#ff8c69', light: '#c0392b' },
  { name: 'Abricot',   dark: '#ffb347', light: '#e67e22' },
  { name: 'Or',        dark: '#ffe066', light: '#b8860b' },
  { name: 'Citron',    dark: '#e8f5a3', light: '#7a8c00' },
  { name: 'Menthe',    dark: '#a8f0c6', light: '#1a7a4a' },
  { name: 'Jade',      dark: '#7fffd4', light: '#007a5e' },
  { name: 'Ciel',      dark: '#87ceeb', light: '#1565c0' },
  { name: 'Lavande',   dark: '#c9b8f5', light: '#4a2ab8' },
  { name: 'Lilas',     dark: '#ddb6f2', light: '#7b1fa2' },
  { name: 'Rose',      dark: '#ffb6c1', light: '#ad1457' },
  { name: 'Pêche',     dark: '#ffd5b8', light: '#bf4f00' },
  { name: 'Craie',     dark: '#f5f0e8', light: '#5a5248' },
  { name: 'Brume',     dark: '#c8d8e8', light: '#37474f' },
  { name: 'Sable',     dark: '#e8d5a8', light: '#7a5c1e' },
  { name: 'Nacre',     dark: '#e8e8f5', light: '#3a3a6a' },
  { name: 'Corail',    dark: '#ff9a8b', light: '#b5270f' },
]

// ── Définition des sous-menus par fonction ───────────────────────────────────
// Chaque entrée produit un tableau d'options { label, hint, args[] }
// args[] correspond aux valeurs positionnelles passées à onSelect(fnKey, ...args)
function buildSubOptions(fnKey, seuilKeys) {
  switch (fnKey) {
    case 'pulse': {
      const intensites = [
        { k: 'faible', emoji: '·',  hint: 'à peine perceptible' },
        { k: 'moyen',  emoji: '💓', hint: 'frémissement visible' },
        { k: 'fort',   emoji: '❤️', hint: 'battement prononcé' },
      ]
      const vitesses = [
        { k: 'lent',   hint: 'lent' },
        { k: 'normal', hint: 'normal' },
        { k: 'rapide', hint: 'rapide' },
      ]
      return intensites.flatMap(i =>
        vitesses.map(v => ({
          label: `${i.emoji} ${i.k} · ${v.k}`,
          hint:  `${i.hint}, rythme ${v.hint}`,
          args:  [i.k, v.k],
        }))
      )
    }
    case 'tremble':
      return [
        { label: '〰️ faible',  hint: 'à peine perceptible', args: ['faible'] },
        { label: '〰️ moyen',   hint: 'tremblement visible',  args: ['moyen']  },
        { label: '〰️ fort',    hint: 'secousse intense',     args: ['fort']   },
      ]
    case 'glitch': {
      const intensites = [
        { k: 'faible', hint: 'léger' },
        { k: 'moyen',  hint: 'visible' },
        { k: 'fort',   hint: 'intense' },
      ]
      const modes = [
        { k: 'loop', hint: 'en boucle' },
        { k: 'once', hint: 'une seule fois' },
      ]
      return intensites.flatMap(i =>
        modes.map(m => ({
          label: `📺 ${i.k} · ${m.k}`,
          hint:  `${i.hint}, ${m.hint}`,
          args:  [i.k, m.k],
        }))
      )
    }
    case 'rupture':
      return [
        { label: '~~lent~~',   hint: 'barre qui glisse lentement', args: ['500', 'lent']   },
        { label: '~~normal~~', hint: 'vitesse standard',            args: ['500', 'normal'] },
        { label: '~~rapide~~', hint: 'coup de sabre',               args: ['500', 'rapide'] },
      ]
    case 'fondu_mot':
      return [
        { label: '🌫️ lent',   hint: 'apparition languide',  args: ['1200', 'lent']   },
        { label: '🌫️ normal', hint: 'rythme équilibré',     args: ['1200', 'normal'] },
        { label: '🌫️ rapide', hint: 'flash instantané',     args: ['800',  'rapide'] },
      ]
    case 'lire':
      return seuilKeys.map(k => ({
        label: k,
        hint:  `</lire:${k}|défaut/>`,
        args:  [k],
      }))
    case 'couleur':
      // Géré à part via la palette — pas d'options textuelles
      return null
    default:
      return null
  }
}

// ── Fonctions qui déclenchent l'étape 2 ─────────────────────────────────────
function needsSubMenu(fnKey, seuilKeys) {
  if (fnKey === 'couleur') return true
  const opts = buildSubOptions(fnKey, seuilKeys)
  return opts !== null && opts.length > 0
}

function InlineFunctionMenu({ query, matches, selectedIndex, position, onSelect, onHover, seuilKeys = [] }) {
  const [customHex, setCustomHex] = useState('')
  // ── État étape 2 ──────────────────────────────────────────────────────────
  // step: 'list' = liste principale | 'sub' = sous-menu | 'color' = palette
  const [step, setStep]         = useState('list')
  const [subFnKey, setSubFnKey] = useState(null)   // clé de la fn active
  const [subOptions, setSubOptions] = useState([]) // options calculées
  const [subIndex, setSubIndex] = useState(0)      // index navigué
  const subListRef = useRef(null)
  const left = Math.min(position.left, window.innerWidth - 320)
  const top  = Math.min(position.top + 4, window.innerHeight - 480)

  // ── Reset étape 2 si la liste principale change ───────────────────────────
  useEffect(() => {
    setStep('list')
    setSubFnKey(null)
    setSubIndex(0)
  }, [query, matches.length])

  // ── Scroll automatique dans le sous-menu ──────────────────────────────────
  useEffect(() => {
    if (step !== 'sub' || !subListRef.current) return
    const el = subListRef.current.children[subIndex]
    el?.scrollIntoView({ block: 'nearest' })
  }, [subIndex, step])

  // ── Entrée dans l'étape 2 ─────────────────────────────────────────────────
  function openSub(fnKey) {
    if (fnKey === 'couleur') {
      setStep('color')
      setSubFnKey('couleur')
      return
    }
    const opts = buildSubOptions(fnKey, seuilKeys)
    if (!opts || opts.length === 0) {
      // Pas de sous-menu → insérer directement
      onSelect(fnKey)
      return
    }
    setSubFnKey(fnKey)
    setSubOptions(opts)
    setSubIndex(0)
    setStep('sub')
  }

  // ── Navigation clavier exposée via data-attribute ─────────────────────────
  // UnifiedSegmentsTimeline appelle onSelect / les flèches via handleTextareaKeyDown.
  // On expose une ref de handler que le parent peut appeler — mais en réalité,
  // handleTextareaKeyDown appelle directement setFnMenu({…selectedIndex…}).
  // Pour intercepter avant ça, on publie les handlers via un effet sur window
  // en capturant l'event en phase capture, uniquement quand step !== 'list'.
  useEffect(() => {
    if (step === 'list') return  // la navigation étape 1 reste dans UnifiedSegmentsTimeline

    const handler = (e) => {
      if (step === 'color') {
        // Seul Esc est utile ici (les clics gèrent le reste)
        if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation()
          setStep('list')
        }
        return
      }
      // step === 'sub'
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation()
        setSubIndex(i => (i + 1) % subOptions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation()
        setSubIndex(i => (i - 1 + subOptions.length) % subOptions.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault(); e.stopPropagation()
        const opt = subOptions[subIndex]
        if (opt) onSelect(subFnKey, ...opt.args)
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation()
        setStep('list')
      }
    }
    // Capture phase pour court-circuiter le handler de UnifiedSegmentsTimeline
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [step, subOptions, subIndex, subFnKey, onSelect])

  return (
    <div
      style={{
        position: 'fixed',
        top, left,
        zIndex: 3000,
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        minWidth: '240px',
        maxWidth: '300px',
        maxHeight: '420px',
        overflowY: 'auto',
        fontSize: '0.78rem',
      }}
    >
      {/* ── Header adaptatif selon l'étape ── */}
      <div style={{
        padding: '6px 10px', fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        position: 'sticky', top: 0, background: '#1a1a2e', zIndex: 1,
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        {step !== 'list' && (
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => setStep('list')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem',
              padding: '0 4px 0 0', lineHeight: 1,
              transition: 'color 0.1s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
            title="Retour à la liste (Esc)"
          >←</button>
        )}
        <span>
          {step === 'list'
            ? `Fonctions${query ? ` · "${query}"` : ''}`
            : step === 'color'
              ? '🎨 Palette narrative'
              : `${subFnKey ? (matches.find(([k]) => k === subFnKey)?.[1]?.label ?? subFnKey) : ''} — variantes`
          }
        </span>
      </div>

      {/* ── Étape 1 : liste des fonctions ── */}
      {step === 'list' && (
        matches.length === 0 ? (
          <div style={{ padding: '10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
            Aucune fonction correspondante
          </div>
        ) : (
          matches.map(([key, def], i) => {
            const hasSub = needsSubMenu(key, seuilKeys)
            const isActive = i === selectedIndex
            return (
              <div
                key={key}
                onMouseDown={e => e.preventDefault()}
                onClick={() => hasSub ? openSub(key) : onSelect(key)}
                onMouseEnter={() => onHover(i)}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'rgba(99,102,241,0.25)' : 'transparent',
                  borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
                  transition: 'background-color 0.1s ease',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{def.label}</span>
                  {hasSub && (
                    <span style={{
                      fontSize: '0.62rem', color: '#6366f1', opacity: 0.8,
                      background: 'rgba(99,102,241,0.12)',
                      padding: '1px 5px', borderRadius: '3px',
                    }}>↵ variantes</span>
                  )}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                  {def.description}
                </div>
                {!hasSub && (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.67rem', fontFamily: 'monospace' }}>
                    {`</${key}:${def.params.map(p => p.default).join(';') || ''}${def.wrap ? '|' : ''}/>`}
                  </div>
                )}
              </div>
            )
          })
        )
      )}

      {/* ── Étape 2a : sous-menu texte (variations nommées) ── */}
      {step === 'sub' && (
        <div ref={subListRef} style={{ overflowY: 'auto', maxHeight: '320px' }}>
          {subOptions.map((opt, i) => {
            const isActive = i === subIndex
            return (
              <div
                key={i}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onSelect(subFnKey, ...opt.args)}
                onMouseEnter={() => setSubIndex(i)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'rgba(99,102,241,0.25)' : 'transparent',
                  borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
                  transition: 'background-color 0.1s ease',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}
              >
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.8rem' }}>
                  {opt.label}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>
                  {opt.hint}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Étape 2b : palette couleur ── */}
      {step === 'color' && (
        <div style={{ padding: '8px 10px' }}>
          {/* Grille 4×4 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {NARRATIVE_COLORS.map(({ name, hex }) => (
              <button
                key={hex}
                title={`${name}  ${hex}`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onSelect('couleur', hex)}
                style={{
                  width: '100%', aspectRatio: '1',
                  backgroundColor: hex,
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '4px', cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.12s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.14)'
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${hex}88`
                  e.currentTarget.style.zIndex = '2'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.zIndex = '1'
                }}
              >
                {/* Nom en tooltip natif via title — clean, pas besoin d'overlay */}
              </button>
            ))}
          </div>
          {/* Champ hex personnalisé */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '3px', flexShrink: 0,
              backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
            }} />
            <input
              type="text"
              placeholder="#hex…"
              value={customHex}
              onMouseDown={e => e.stopPropagation()}
              onChange={e => setCustomHex(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(customHex)) {
                  onSelect('couleur', customHex)
                }
                if (e.key === 'Escape') setStep('list')
                e.stopPropagation()
              }}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px',
                color: '#fff', fontSize: '0.7rem', padding: '3px 6px', outline: 'none',
                fontFamily: 'monospace',
              }}
            />
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                if (/^#[0-9a-fA-F]{6}$/.test(customHex)) onSelect('couleur', customHex)
              }}
              style={{
                padding: '3px 7px', fontSize: '0.65rem',
                backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customHex) ? '#6366f1' : 'rgba(255,255,255,0.1)',
                color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer',
              }}
            >↵</button>
          </div>
        </div>
      )}

      {/* ── Footer adaptatif ── */}
      <div style={{
        padding: '4px 10px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky', bottom: 0, background: '#1a1a2e',
      }}>
        {step === 'list'
          ? '↑↓ naviguer · ↵ choisir · Esc fermer'
          : step === 'color'
            ? 'cliquer pour choisir · Esc retour'
            : '↑↓ naviguer · ↵ insérer · Esc retour'
        }
      </div>
    </div>
  )
}
export default InlineFunctionMenu
// Sélecteur de tranche du panneau d'orchestration (Statut 24, étape 2).
// « Tout le texte » = comportement d'avant, prompt identique. « Une tranche » = segments from → to,
// numérotation de l'histoire entière, 5 segments de contexte de chaque côté.
//
// Fluidité : rien n'est calculé en mode « Tout le texte ». En mode tranche, la barre et le résumé
// sont calculés en un passage (segments + blocs) et gardés en mémoire (useMemo) ; la barre est
// un composant mémoïsé avec un seul gestionnaire de clic.
import { memo, useMemo, useState } from 'react'
import {
  trackSpans, coverageCounts, rangeSummary, soundLabelsFor, suggestEnd, contextBounds,
  clampRange, nextRange, prevRange, rangePromptLines,
} from '../../utils/orchestrationRange'

const C = {
  text: 'rgba(255,255,255,0.6)',
  dim: 'rgba(255,255,255,0.4)',
  strong: 'rgba(255,255,255,0.75)',
  border: 'rgba(255,255,255,0.12)',
}

const cellColor = (count, isPause) => {
  if (isPause) return 'rgba(251,191,36,0.6)'
  if (count === 0) return 'rgba(255,255,255,0.07)'
  if (count === 1) return 'rgba(129,140,248,0.4)'
  if (count === 2) return 'rgba(129,140,248,0.6)'
  return 'rgba(129,140,248,0.85)'
}

const RangeBar = memo(function RangeBar({ counts, chapters, pauses, from, to, ctxFrom, ctxTo, onPick }) {
  const total = counts.length
  const handleClick = (e) => {
    const n = Number(e.target?.dataset?.seg)
    if (n) onPick(n)
  }
  const cells = []
  const bands = []
  for (let i = 0; i < total; i++) {
    const n = i + 1
    const inRange = n >= from && n <= to
    const inCtx = !inRange && n >= ctxFrom && n <= ctxTo
    cells.push(
      <button
        key={n}
        type="button"
        tabIndex={-1}
        data-seg={n}
        title={`Segment ${n}${chapters[i] ? ' (chapitre)' : ''}${pauses[i] ? ' (pause)' : ''} — ${counts[i]} son(s)`}
        aria-label={`Commencer la tranche au segment ${n}`}
        style={{
          flex: '1 1 0', minWidth: 0, padding: 0, margin: 0, border: 'none', cursor: 'pointer',
          background: cellColor(counts[i], pauses[i]),
          borderTop: chapters[i] ? '3px solid #f5f5f5' : 'none',
          opacity: inRange ? 1 : 0.55,
        }}
      />
    )
    bands.push(
      <div key={n} style={{ flex: '1 1 0', minWidth: 0, background: inRange ? '#6366f1' : inCtx ? 'rgba(99,102,241,0.3)' : 'transparent' }} />
    )
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '0.68rem', color: C.dim, marginBottom: '0.25rem' }}>
        <span>1</span><span>clic sur la barre = début de la tranche</span><span>{total}</span>
      </div>
      <div onClick={handleClick} style={{ display: 'flex', gap: total > 250 ? 0 : '1px', height: '30px', alignItems: 'stretch' }}>{cells}</div>
      <div style={{ display: 'flex', gap: total > 250 ? 0 : '1px', height: '6px', marginTop: '3px' }}>{bands}</div>
    </div>
  )
})

const legendItem = (swatch, label) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
    <span style={{ display: 'inline-block', ...swatch }} />{label}
  </span>
)

const describe = (b) => `${b.layer ? b.layer + ', ' : ''}${b.span}${typeof b.volume === 'number' ? ', vol. ' + Math.round(b.volume * 100) / 100 : ''}${b.loop ? ', en boucle' : ''}`

function RangeDetails({ segments, soundTracks, soundLibrary, range, onRangeChange }) {
  const total = segments.length
  const { from, to } = range
  const { ctxFrom, ctxTo } = contextBounds(range, total)
  const [showPreview, setShowPreview] = useState(false)

  const spans = useMemo(() => trackSpans(segments, soundTracks), [segments, soundTracks])
  const counts = useMemo(() => coverageCounts(spans, total), [spans, total])
  const chapters = useMemo(() => segments.map((s) => !!(s && typeof s === 'object' && s.isChapter === true)), [segments])
  const pauses = useMemo(() => segments.map((s) => !!(s && typeof s === 'object' && s.pause != null)), [segments])
  const labels = useMemo(() => soundLabelsFor(soundTracks, soundLibrary), [soundTracks, soundLibrary])
  const summary = useMemo(() => rangeSummary(spans, { from, to }, labels), [spans, from, to, labels])
  const suggestion = useMemo(() => suggestEnd(segments, { from, to }), [segments, from, to])
  const preview = useMemo(
    () => (showPreview ? rangePromptLines(segments, { from, to }, soundTracks, soundLibrary).join('\n') : ''),
    [showPreview, segments, from, to, soundTracks, soundLibrary]
  )

  const width = to - from + 1
  const set = (f, t) => onRangeChange(clampRange(f, t, total))
  const pick = useMemo(() => (n) => onRangeChange(clampRange(n, n + width - 1, total)), [onRangeChange, width, total])

  // Champs : saisis librement, appliqués en quittant le champ ou avec Entrée.
  const commitFrom = (v) => {
    const f = clampRange(v, v, total).from
    set(f, f > to ? f + width - 1 : to)
  }
  const commitTo = (v) => {
    const t = clampRange(v, v, total).to
    set(t < from ? t - width + 1 : from, t)
  }
  const onKey = (commit) => (e) => { if (e.key === 'Enter') commit(e.currentTarget.value) }

  const navBtn = (enabled) => ({
    padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', border: `1px solid ${C.border}`,
    background: 'rgba(255,255,255,0.05)', color: enabled ? C.strong : 'rgba(255,255,255,0.3)',
    cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
  })
  const input = {
    width: '72px', padding: '0.45rem 0.5rem', fontSize: '0.875rem', fontFamily: 'monospace',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '6px', color: 'rgba(255,255,255,0.9)',
  }
  const card = { padding: '0.75rem 0.875rem', borderRadius: '7px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
  const cardTitle = { fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }
  const line = { fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }
  const none = <div style={{ ...line, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>aucun</div>
  const entry = summary.entry
  const exit = summary.exit

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.8125rem', color: C.text }}>
        <button type="button" onClick={() => from > 1 && onRangeChange(prevRange(range, total))} disabled={from <= 1} style={navBtn(from > 1)}>◀ Précédente</button>
        <label htmlFor="ili-tranche-from">du segment</label>
        <input
          id="ili-tranche-from" key={`f${from}`} type="number" min={1} max={total} defaultValue={from} style={input}
          onBlur={(e) => commitFrom(e.currentTarget.value)} onKeyDown={onKey(commitFrom)}
        />
        <label htmlFor="ili-tranche-to">au segment</label>
        <input
          id="ili-tranche-to" key={`t${to}`} type="number" min={1} max={total} defaultValue={to} style={input}
          onBlur={(e) => commitTo(e.currentTarget.value)} onKeyDown={onKey(commitTo)}
        />
        <span style={{ color: C.dim }}>({width} segments)</span>
        <button type="button" onClick={() => to < total && onRangeChange(nextRange(range, total))} disabled={to >= total} style={navBtn(to < total)}>Suivante ▶</button>
      </div>

      {suggestion && (
        <div style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => set(from, suggestion.to)}
            style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontFamily: 'inherit', borderRadius: '6px', border: '1px dashed rgba(165,180,252,0.5)', background: 'rgba(79,70,229,0.08)', color: '#c7d2fe', cursor: 'pointer' }}
          >
            ↳ Finir au segment {suggestion.to} : un chapitre commence au {suggestion.chapterAt}
          </button>
        </div>
      )}

      <RangeBar counts={counts} chapters={chapters} pauses={pauses} from={from} to={to} ctxFrom={ctxFrom} ctxTo={ctxTo} onPick={pick} />
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
        {legendItem({ width: 10, height: 10, background: 'rgba(129,140,248,0.75)' }, 'déjà des sons')}
        {legendItem({ width: 10, height: 10, background: 'rgba(255,255,255,0.07)' }, 'sans son')}
        {legendItem({ width: 10, height: 10, background: 'rgba(251,191,36,0.6)' }, 'pause')}
        {legendItem({ width: 10, height: 10, borderTop: '3px solid #f5f5f5', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)' }, 'début de chapitre')}
        {legendItem({ width: 14, height: 5, background: '#6366f1' }, 'tranche')}
        {legendItem({ width: 14, height: 5, background: 'rgba(99,102,241,0.3)' }, 'contexte (lecture seule)')}
      </div>

      <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        <div style={card}>
          <div style={cardTitle}>Sons actifs à l'entrée (segment {from})</div>
          {entry.length ? entry.map((b, i) => (
            <div key={i} style={line}><code style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)' }}>{b.label}</code> · {describe(b)}</div>
          )) : none}
        </div>
        <div style={card}>
          <div style={cardTitle}>Sons qui continuent après {to}</div>
          {exit.length ? exit.map((b, i) => (
            <div key={i} style={line}><code style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)' }}>{b.label}</code> · {describe(b)}</div>
          )) : none}
        </div>
      </div>
      <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
        Déjà utilisés dans l'histoire ({summary.used.length} sons, transmis à Claude) :{' '}
        {summary.used.length ? summary.used.map((u) => u.label).join(' · ') : 'aucun'}
      </div>

      {summary.inside.length > 0 && (
        <div style={{ padding: '0.6rem 0.875rem', borderRadius: '7px', marginTop: '0.75rem', backgroundColor: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.2)', fontSize: '0.75rem', color: 'rgba(255,193,7,0.9)' }}>
          ⚠ {summary.inside.length} bloc(s) existent déjà dans cette tranche. Les nouveaux s'ajouteront à côté : rien n'est remplacé ni supprimé.
        </div>
      )}

      <div style={{ marginTop: '0.875rem' }}>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontFamily: 'inherit', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)', cursor: 'pointer' }}
        >
          {showPreview ? '▾ Masquer ce qui change dans le prompt' : '▸ Voir ce qui change dans le prompt'}
        </button>
        {showPreview && (
          <>
            <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: C.dim }}>
              Le début du prompt (rôle, règles, vocabulaire, format JSON) ne change pas. Seule la fin est remplacée par ceci :
            </div>
            <pre style={{ margin: '0.4rem 0 0', maxHeight: '360px', overflow: 'auto', whiteSpace: 'pre-wrap', padding: '0.875rem', fontSize: '0.72rem', fontFamily: 'monospace', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: 'rgba(255,255,255,0.8)' }}>
              {preview}
            </pre>
          </>
        )}
      </div>
    </div>
  )
}

function OrchestrationRangePicker({ segments, soundTracks, soundLibrary, mode, onModeChange, range, onRangeChange }) {
  const isRange = mode === 'range'
  const seg = (on) => ({
    padding: '0.45rem 0.9rem', fontSize: '0.8125rem', fontFamily: 'inherit', border: 'none', cursor: 'pointer',
    background: on ? 'rgba(79,70,229,0.85)' : 'rgba(255,255,255,0.04)', color: on ? '#fff' : 'rgba(255,255,255,0.65)',
  })
  return (
    <div
      id="ili-orchestration-tranche"
      data-orchestration-range
      style={{ marginBottom: '1rem', padding: '0.875rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', scrollMarginTop: '80px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: isRange ? '0.875rem' : 0 }}>
        <span style={{ fontSize: '0.8125rem', color: C.strong }}>Texte envoyé à Claude :</span>
        <div role="group" aria-label="Portée du prompt" style={{ display: 'inline-flex', border: `1px solid ${C.border}`, borderRadius: '7px', overflow: 'hidden' }}>
          <button type="button" aria-pressed={!isRange} onClick={() => onModeChange('all')} style={seg(!isRange)}>Tout le texte</button>
          <button type="button" aria-pressed={isRange} onClick={() => onModeChange('range')} style={seg(isRange)}>Une tranche</button>
        </div>
      </div>
      {isRange && (
        <RangeDetails segments={segments || []} soundTracks={soundTracks || []} soundLibrary={soundLibrary || []} range={range} onRangeChange={onRangeChange} />
      )}
    </div>
  )
}

export default OrchestrationRangePicker

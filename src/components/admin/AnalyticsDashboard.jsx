import { useState, useEffect, useMemo, useRef } from 'react'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
// order=created_at.desc — important : on veut les événements les plus RÉCENTS
// en priorité. Avec .asc, une fois plus de 5000 événements au total, les plus
// récents seraient tronqués par le limit, cassant silencieusement tout filtre
// par période (7j/30j) une fois ce seuil dépassé.
async function fetchEvents() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reading_events?select=*&order=created_at.desc&limit=5000`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
  if (!res.ok) throw new Error('Erreur chargement analytics')
  return res.json()
}
function computeStats(events) {
  const byStory = {}
  events.forEach(e => {
    if (!byStory[e.story_id]) byStory[e.story_id] = []
    byStory[e.story_id].push(e)
  })
  return Object.entries(byStory).map(([storyId, evts]) => {
    const starts = evts.filter(e => e.event === 'start')
    const uniqueReaders = new Set(starts.map(e => e.reader_id)).size
    const finishers = new Set(evts.filter(e => e.event === 'finish').map(e => e.reader_id)).size
    const completionRate = uniqueReaders > 0 ? Math.round((finishers / uniqueReaders) * 100) : 0
    const milestone = (pct) => new Set(evts.filter(e => e.event === `progress_${pct}`).map(e => e.reader_id)).size
    const m25 = milestone(25)
    const m50 = milestone(50)
    const m75 = milestone(75)
    const abandons = evts.filter(e => e.event === 'abandon')
    const totalSegments = starts[0]?.total_segments ?? 0
    const avgAbandonPct = abandons.length > 0 && totalSegments > 0
      ? Math.round((abandons.reduce((acc, e) => acc + (e.segment_index ?? 0), 0) / abandons.length / totalSegments) * 100)
      : null
    const readerStarts = {}
    starts.forEach(e => { readerStarts[e.reader_id] = (readerStarts[e.reader_id] || 0) + 1 })
    const returners = Object.values(readerStarts).filter(n => n > 1).length
    const lastEvent = [...evts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    const lastSeen = lastEvent
      ? new Date(lastEvent.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '—'
    return { storyId, uniqueReaders, finishers, completionRate, m25, m50, m75, avgAbandonPct, returners, totalSegments, lastSeen }
  }).sort((a, b) => b.uniqueReaders - a.uniqueReaders)
}
// ── Export CSV ─────────────────────────────────────────────────────────────
function toCSV(rows, columns) {
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = columns.map(c => escape(c.label)).join(',')
  const lines = rows.map(r => columns.map(c => escape(r[c.key])).join(','))
  return [header, ...lines].join('\n')
}
function downloadCSV(filename, csvString) {
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
// ── Barre de funnel ───────────────────────────────────────────────────────────
function FunnelRow({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 40px', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
      <span style={{ fontSize: '0.72rem', color: '#888', textAlign: 'right' }}>{label}</span>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '99px',
          background: color, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
          boxShadow: `0 0 8px ${color}55`,
        }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#ccc' }}>{value}</span>
    </div>
  )
}
// ── Arc SVG de complétion ─────────────────────────────────────────────────────
function CompletionArc({ pct }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const color = pct >= 70 ? '#4ade80' : pct >= 40 ? '#fbbf24' : '#f87171'
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" transform="rotate(-90 34 34)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.82rem', fontWeight: 800, color,
      }}>{pct}%</div>
    </div>
  )
}
// ── Sélecteur de période ──────────────────────────────────────────────────────
function RangeSelector({ rangeDays, onChange }) {
  const options = [
    { value: 7, label: '7 jours' },
    { value: 30, label: '30 jours' },
    { value: 90, label: '90 jours' },
    { value: null, label: 'Tout' },
  ]
  return (
    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '3px' }}>
      {options.map(o => (
        <button
          key={o.label}
          onClick={() => onChange(o.value)}
          style={{
            padding: '5px 12px', fontSize: '0.75rem', fontWeight: 600,
            background: rangeDays === o.value ? 'rgba(96,165,250,0.18)' : 'transparent',
            color: rangeDays === o.value ? '#93c5fd' : 'rgba(255,255,255,0.55)',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >{o.label}</button>
      ))}
    </div>
  )
}
// ── Menu de filtre multi-histoires ────────────────────────────────────────────
function FilterDropdown({ allStoryIds, selectedIds, onToggle, onSelectAll, onSelectNone }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  const filtered = allStoryIds.filter(id => id.toLowerCase().includes(search.toLowerCase()))
  const activeCount = selectedIds.size === 0 ? allStoryIds.length : selectedIds.size
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          padding: '8px 16px', fontSize: '0.78rem', fontWeight: 600,
          background: selectedIds.size > 0 ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.08)',
          color: selectedIds.size > 0 ? '#93c5fd' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${selectedIds.size > 0 ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '8px', cursor: 'pointer',
        }}
      >
        🔍 Filtrer ({activeCount}/{allStoryIds.length}) {isOpen ? '▲' : '▾'}
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '6px',
          background: '#18181b', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          minWidth: '280px', maxHeight: '360px', display: 'flex', flexDirection: 'column',
          zIndex: 1000,
        }}>
          <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              type="text"
              placeholder="Rechercher une histoire…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', fontSize: '0.8rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', color: '#eee', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button onClick={onSelectAll} style={{ flex: 1, padding: '4px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer' }}>Tout afficher</button>
              <button onClick={onSelectNone} style={{ flex: 1, padding: '4px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer' }}>Tout masquer</button>
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: '6px' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>Aucun résultat</div>
            )}
            {filtered.map(id => {
              const checked = selectedIds.size === 0 || selectedIds.has(id)
              return (
                <label key={id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px', fontSize: '0.8rem', color: '#ddd',
                  cursor: 'pointer', borderRadius: '5px',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <input type="checkbox" checked={checked} onChange={() => onToggle(id)} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
// ── Carte histoire ────────────────────────────────────────────────────────────
function StoryCard({ stat, index, onReset, isResetting }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '10px',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '16px 20px', cursor: 'pointer',
        }}
      >
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)',
          minWidth: '18px', fontVariantNumeric: 'tabular-nums',
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <CompletionArc pct={stat.completionRate} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: '0.95rem', color: '#f0f0f0', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {stat.storyId}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
            Dernière lecture (période) : {stat.lastSeen}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {[
            { v: stat.uniqueReaders, label: 'lecteurs', color: '#a5b4fc' },
            { v: stat.finishers,     label: 'fins',     color: '#4ade80' },
            { v: stat.returners,     label: 'retours',  color: '#fb923c' },
          ].map(({ v, label, color }) => (
            <div key={label} style={{ textAlign: 'center', minWidth: '40px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </div>
        <span style={{
          fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.25s ease', flexShrink: 0, marginLeft: '4px',
        }}>▼</span>
      </div>
      {open && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '20px',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <p style={{
            fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)',
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px',
          }}>
            Entonnoir de lecture
          </p>
          <FunnelRow label="Ont démarré"  value={stat.uniqueReaders} max={stat.uniqueReaders} color="#94a3b8" />
          <FunnelRow label="25% atteints" value={stat.m25}           max={stat.uniqueReaders} color="#60a5fa" />
          <FunnelRow label="50% atteints" value={stat.m50}           max={stat.uniqueReaders} color="#fbbf24" />
          <FunnelRow label="75% atteints" value={stat.m75}           max={stat.uniqueReaders} color="#fb923c" />
          <FunnelRow label="Ont terminé"  value={stat.finishers}     max={stat.uniqueReaders} color="#4ade80" />
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            {stat.avgAbandonPct !== null && (
              <div style={{
                flex: 1, minWidth: '180px', padding: '12px 14px',
                background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)',
                borderRadius: '10px', fontSize: '0.78rem', color: '#fdba74',
              }}>
                📍 Abandon moyen à <strong>{stat.avgAbandonPct}%</strong> de l'histoire
                {stat.totalSegments > 0 && (
                  <span style={{ color: 'rgba(253,186,116,0.6)', fontSize: '0.7rem' }}>
                    {' '}· seg. ~{Math.round(stat.avgAbandonPct / 100 * stat.totalSegments)}/{stat.totalSegments}
                  </span>
                )}
              </div>
            )}
            {stat.returners > 0 && (
              <div style={{
                flex: 1, minWidth: '180px', padding: '12px 14px',
                background: 'rgba(165,180,252,0.08)', border: '1px solid rgba(165,180,252,0.2)',
                borderRadius: '10px', fontSize: '0.78rem', color: '#c7d2fe',
              }}>
                🔁 <strong>{stat.returners}</strong> lecteur{stat.returners > 1 ? 's' : ''} revenu{stat.returners > 1 ? 's' : ''} relire
              </div>
            )}
          </div>
          <div style={{
            marginTop: '18px', paddingTop: '14px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); onReset(stat.storyId) }}
              disabled={isResetting}
              title="Supprime définitivement les données de lecture de cette histoire (l'histoire elle-même n'est pas touchée)"
              style={{
                padding: '6px 12px', fontSize: '0.72rem',
                background: 'rgba(220,53,69,0.1)', color: '#f87171',
                border: '1px solid rgba(220,53,69,0.25)', borderRadius: '6px',
                cursor: isResetting ? 'wait' : 'pointer',
              }}
            >
              {isResetting ? '…' : '🗑 Réinitialiser les stats de cette histoire'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
// ── Dashboard ─────────────────────────────────────────────────────────────────
function AnalyticsDashboard() {
  const [rawEvents, setRawEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [resettingId, setResettingId] = useState(null)
  const [rangeDays, setRangeDays] = useState(null) // null = "Tout"
  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const events = await fetchEvents()
      setRawEvents(events)
      setLastRefresh(new Date().toLocaleTimeString('fr-FR'))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])
  // Événements bornés à la période sélectionnée — tout le reste (stats,
  // export brut) découle de cet ensemble filtré.
  const rangeFilteredEvents = useMemo(() => {
    if (!rangeDays) return rawEvents
    const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000
    return rawEvents.filter(e => new Date(e.created_at).getTime() >= cutoff)
  }, [rawEvents, rangeDays])
  const stats = useMemo(() => computeStats(rangeFilteredEvents), [rangeFilteredEvents])
  const allStoryIds = useMemo(() => stats.map(s => s.storyId), [stats])
  const visibleStats = useMemo(() => {
    if (selectedIds.size === 0) return stats
    return stats.filter(s => selectedIds.has(s.storyId))
  }, [stats, selectedIds])
  const visibleIdSet = useMemo(() => new Set(visibleStats.map(s => s.storyId)), [visibleStats])
  const visibleRawEvents = useMemo(
    () => rangeFilteredEvents.filter(e => visibleIdSet.has(e.story_id)),
    [rangeFilteredEvents, visibleIdSet]
  )
  const toggleStoryFilter = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.size === 0) {
        allStoryIds.forEach(sid => { if (sid !== id) next.add(sid) })
        return next
      }
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === allStoryIds.length) return new Set()
      return next
    })
  }
  const handleReset = async (storyId) => {
    const typed = window.prompt(
      `⚠️ Cette action supprime DÉFINITIVEMENT les statistiques de lecture de "${storyId}" (l'histoire elle-même n'est pas touchée).\n\n` +
      `Pense à exporter le CSV avant si tu veux garder une trace.\n\n` +
      `Pour confirmer, tape exactement l'identifiant de l'histoire :\n${storyId}`
    )
    if (typed !== storyId) {
      if (typed !== null) alert("L'identifiant tapé ne correspond pas — rien n'a été supprimé.")
      return
    }
    const adminPassword = sessionStorage.getItem('ili_admin_password')
    if (!adminPassword) { alert("Session expirée — reconnecte-toi à l'admin."); return }
    setResettingId(storyId)
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, action: 'reset-analytics', storyId })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur inconnue')
      alert(`Statistiques de "${storyId}" réinitialisées.`)
      await load()
    } catch (err) {
      alert('Erreur lors de la réinitialisation : ' + err.message)
    } finally {
      setResettingId(null)
    }
  }
  const handleDownloadSummary = () => {
    if (visibleStats.length === 0) { alert('Aucune donnée à exporter.'); return }
    const columns = [
      { key: 'storyId', label: 'Histoire' },
      { key: 'uniqueReaders', label: 'Lecteurs uniques' },
      { key: 'finishers', label: 'Ont terminé' },
      { key: 'completionRate', label: 'Taux de complétion (%)' },
      { key: 'm25', label: '25% atteints' },
      { key: 'm50', label: '50% atteints' },
      { key: 'm75', label: '75% atteints' },
      { key: 'avgAbandonPct', label: 'Abandon moyen (%)' },
      { key: 'returners', label: 'Lecteurs revenus' },
      { key: 'totalSegments', label: 'Nombre de segments' },
      { key: 'lastSeen', label: 'Dernière lecture (période)' },
    ]
    const suffix = rangeDays ? `-${rangeDays}j` : '-tout'
    downloadCSV(`ili-analytics-resume${suffix}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(visibleStats, columns))
  }
  const handleDownloadRaw = () => {
    if (visibleRawEvents.length === 0) { alert('Aucun événement à exporter.'); return }
    const keySet = new Set()
    visibleRawEvents.forEach(e => Object.keys(e).forEach(k => keySet.add(k)))
    const columns = Array.from(keySet).map(k => ({ key: k, label: k }))
    const suffix = rangeDays ? `-${rangeDays}j` : '-tout'
    downloadCSV(`ili-analytics-evenements-bruts${suffix}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(visibleRawEvents, columns))
  }
  const totalReaders = visibleStats.reduce((s, r) => s + r.uniqueReaders, 0)
  const totalFinishers = visibleStats.reduce((s, r) => s + r.finishers, 0)
  const avgCompletion = visibleStats.length > 0
    ? Math.round(visibleStats.reduce((s, r) => s + r.completionRate, 0) / visibleStats.length)
    : 0
  const totalReturners = visibleStats.reduce((s, r) => s + r.returners, 0)
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e0e0e',
      padding: '32px 24px 64px',
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{
              margin: 0, fontSize: '1.5rem', fontWeight: 800,
              color: '#f0f0f0', letterSpacing: '-0.03em',
            }}>
              Lecteurs
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>
              {lastRefresh ? `Actualisé à ${lastRefresh}` : 'Chargement…'}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: '8px 16px', fontSize: '0.78rem', fontWeight: 600,
              background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
              color: loading ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? '…' : '↻ Actualiser'}
          </button>
        </div>
        {/* ── Barre d'outils : période + filtre + export ── */}
        {!loading && rawEvents.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
            <RangeSelector rangeDays={rangeDays} onChange={setRangeDays} />
            <FilterDropdown
              allStoryIds={allStoryIds}
              selectedIds={selectedIds}
              onToggle={toggleStoryFilter}
              onSelectAll={() => setSelectedIds(new Set())}
              onSelectNone={() => setSelectedIds(new Set(['__none__']))}
            />
            <button onClick={handleDownloadSummary} style={{
              padding: '8px 16px', fontSize: '0.78rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer',
            }}>📥 Résumé (CSV)</button>
            <button onClick={handleDownloadRaw} style={{
              padding: '8px 16px', fontSize: '0.78rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer',
            }}>📥 Événements bruts (CSV)</button>
          </div>
        )}
        {!loading && visibleStats.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px',
            marginBottom: '28px',
          }}>
            {[
              { label: 'Lecteurs uniques',   value: totalReaders,    color: '#a5b4fc' },
              { label: 'Histoires terminées', value: totalFinishers,  color: '#4ade80' },
              { label: 'Retours',             value: totalReturners,  color: '#fb923c' },
              { label: 'Complétion moy.',     value: `${avgCompletion}%`,
                color: avgCompletion >= 70 ? '#4ade80' : avgCompletion >= 40 ? '#fbbf24' : '#f87171' },
            ].map(m => (
              <div key={m.label} style={{
                padding: '16px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, color: m.color, lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {m.value}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && (
          <div style={{
            padding: '14px 16px', background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: '10px', color: '#fca5a5', fontSize: '0.82rem',
          }}>
            Erreur : {error}
          </div>
        )}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
            Chargement des données…
          </div>
        )}
        {!loading && !error && rawEvents.length === 0 && (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '14px',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
              Aucune donnée pour l'instant.<br />
              Partage ton app à des lecteurs pour voir apparaître les stats ici.
            </p>
          </div>
        )}
        {!loading && !error && rawEvents.length > 0 && visibleStats.length === 0 && (
          <div style={{
            padding: '40px 24px', textAlign: 'center',
            border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '14px',
            color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem',
          }}>
            Aucune donnée pour cette combinaison période / filtre.
          </div>
        )}
        {!loading && visibleStats.length > 0 && (
          <>
            <p style={{
              fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              margin: '0 0 12px',
            }}>
              {visibleStats.length} histoire{visibleStats.length > 1 ? 's' : ''} · cliquer pour le détail
            </p>
            {visibleStats.map((stat, i) => (
              <StoryCard
                key={stat.storyId}
                stat={stat}
                index={i}
                onReset={handleReset}
                isResetting={resettingId === stat.storyId}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
export default AnalyticsDashboard

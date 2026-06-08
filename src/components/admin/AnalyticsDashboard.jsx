import { useState, useEffect } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function fetchEvents() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reading_events?select=*&order=created_at.asc&limit=5000`,
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

// ── Carte histoire ────────────────────────────────────────────────────────────
function StoryCard({ stat, index }) {
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
      {/* ── Header ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '16px 20px', cursor: 'pointer',
        }}
      >
        {/* Numéro */}
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
            Dernière lecture : {stat.lastSeen}
          </div>
        </div>

        {/* Pills métriques */}
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

      {/* ── Détail ── */}
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
        </div>
      )}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function AnalyticsDashboard() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const events = await fetchEvents()
      setStats(computeStats(events))
      setLastRefresh(new Date().toLocaleTimeString('fr-FR'))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalReaders = stats.reduce((s, r) => s + r.uniqueReaders, 0)
  const totalFinishers = stats.reduce((s, r) => s + r.finishers, 0)
  const avgCompletion = stats.length > 0
    ? Math.round(stats.reduce((s, r) => s + r.completionRate, 0) / stats.length)
    : 0
  const totalReturners = stats.reduce((s, r) => s + r.returners, 0)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e0e0e',
      padding: '32px 24px 64px',
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
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

        {/* ── Métriques globales ── */}
        {!loading && stats.length > 0 && (
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

        {/* ── États ── */}
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

        {!loading && !error && stats.length === 0 && (
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

        {/* ── Cartes ── */}
        {!loading && stats.length > 0 && (
          <>
            <p style={{
              fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              margin: '0 0 12px',
            }}>
              {stats.length} histoire{stats.length > 1 ? 's' : ''} · cliquer pour le détail
            </p>
            {stats.map((stat, i) => (
              <StoryCard key={stat.storyId} stat={stat} index={i} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default AnalyticsDashboard

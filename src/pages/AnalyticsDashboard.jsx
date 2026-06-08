import { useState, useEffect } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Requête Supabase ──────────────────────────────────────────────────────────
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

// ── Calculs ───────────────────────────────────────────────────────────────────
function computeStats(events) {
  // Regrouper par histoire
  const byStory = {}
  events.forEach(e => {
    if (!byStory[e.story_id]) byStory[e.story_id] = []
    byStory[e.story_id].push(e)
  })

  return Object.entries(byStory).map(([storyId, evts]) => {
    // Sessions = readers uniques qui ont fait un 'start'
    const starts = evts.filter(e => e.event === 'start')
    const uniqueReaders = new Set(starts.map(e => e.reader_id)).size

    // Taux de complétion
    const finishers = new Set(
      evts.filter(e => e.event === 'finish').map(e => e.reader_id)
    ).size
    const completionRate = uniqueReaders > 0
      ? Math.round((finishers / uniqueReaders) * 100)
      : 0

    // Milestones : combien de readers ont atteint 25/50/75%
    const milestone = (pct) =>
      new Set(
        evts.filter(e => e.event === `progress_${pct}`).map(e => e.reader_id)
      ).size

    const m25 = milestone(25)
    const m50 = milestone(50)
    const m75 = milestone(75)

    // Point d'abandon moyen (parmi ceux qui ont abandonné)
    const abandons = evts.filter(e => e.event === 'abandon')
    const totalSegments = starts[0]?.total_segments ?? 0
    const avgAbandonPct = abandons.length > 0 && totalSegments > 0
      ? Math.round(
          (abandons.reduce((acc, e) => acc + (e.segment_index ?? 0), 0) /
            abandons.length /
            totalSegments) *
            100
        )
      : null

    // Retours (readers qui ont plus d'un 'start')
    const readerStarts = {}
    starts.forEach(e => {
      readerStarts[e.reader_id] = (readerStarts[e.reader_id] || 0) + 1
    })
    const returners = Object.values(readerStarts).filter(n => n > 1).length

    // Dernière session
    const lastEvent = evts[evts.length - 1]
    const lastSeen = lastEvent
      ? new Date(lastEvent.created_at).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        })
      : '—'

    return {
      storyId,
      uniqueReaders,
      finishers,
      completionRate,
      m25, m50, m75,
      avgAbandonPct,
      returners,
      totalSegments,
      lastSeen,
    }
  })
}

// ── Barre de progression avec jalons ─────────────────────────────────────────
function FunnelBar({ label, value, max, color, small }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: small ? '6px' : '10px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: '3px',
      }}>
        <span style={{ fontSize: small ? '0.72rem' : '0.78rem', color: '#666' }}>{label}</span>
        <span style={{ fontSize: small ? '0.72rem' : '0.8rem', fontWeight: 600, color: '#333' }}>
          {value} <span style={{ fontWeight: 400, color: '#aaa', fontSize: '0.7rem' }}>({pct}%)</span>
        </span>
      </div>
      <div style={{
        height: small ? '5px' : '7px', background: '#f0f0f0',
        borderRadius: '99px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: '99px',
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

// ── Carte histoire ────────────────────────────────────────────────────────────
function StoryCard({ stat }) {
  const [open, setOpen] = useState(false)

  const completionColor =
    stat.completionRate >= 70 ? '#22c55e' :
    stat.completionRate >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{
      border: '1px solid #e8e8e8',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      marginBottom: '12px',
    }}>
      {/* ── En-tête ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '14px 16px', cursor: 'pointer',
        }}
      >
        {/* Jauge circulaire simple */}
        <div style={{
          position: 'relative', width: '52px', height: '52px', flexShrink: 0,
        }}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="22" fill="none" stroke="#f0f0f0" strokeWidth="5" />
            <circle
              cx="26" cy="26" r="22" fill="none"
              stroke={completionColor} strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (1 - stat.completionRate / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.72rem', fontWeight: 700, color: completionColor,
          }}>
            {stat.completionRate}%
          </div>
        </div>

        {/* Infos principales */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {stat.storyId}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '2px' }}>
            Dernière lecture : {stat.lastSeen}
          </div>
        </div>

        {/* Métriques rapides */}
        <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
          <Metric label="Lecteurs" value={stat.uniqueReaders} />
          <Metric label="Fins" value={stat.finishers} color="#22c55e" />
          <Metric label="Retours" value={stat.returners} color="#6366f1" />
        </div>

        <span style={{
          fontSize: '0.8rem', color: '#bbb',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease', flexShrink: 0,
        }}>▼</span>
      </div>

      {/* ── Détail ── */}
      {open && (
        <div style={{
          borderTop: '1px solid #f0f0f0',
          padding: '16px',
          backgroundColor: '#fafafa',
        }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Entonnoir de lecture
          </p>
          <FunnelBar label="Ont démarré" value={stat.uniqueReaders} max={stat.uniqueReaders} color="#94a3b8" />
          <FunnelBar label="25% atteints" value={stat.m25} max={stat.uniqueReaders} color="#60a5fa" />
          <FunnelBar label="50% atteints" value={stat.m50} max={stat.uniqueReaders} color="#f59e0b" />
          <FunnelBar label="75% atteints" value={stat.m75} max={stat.uniqueReaders} color="#f97316" />
          <FunnelBar label="Ont terminé" value={stat.finishers} max={stat.uniqueReaders} color="#22c55e" />

          {stat.avgAbandonPct !== null && (
            <div style={{
              marginTop: '12px', padding: '10px 12px',
              backgroundColor: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: '8px', fontSize: '0.78rem', color: '#92400e',
            }}>
              📍 Abandon moyen à <strong>{stat.avgAbandonPct}%</strong> de l'histoire
              {stat.totalSegments > 0 && (
                <span style={{ color: '#b45309' }}>
                  {' '}(seg. ~{Math.round(stat.avgAbandonPct / 100 * stat.totalSegments)}/{stat.totalSegments})
                </span>
              )}
            </div>
          )}

          {stat.returners > 0 && (
            <div style={{
              marginTop: '8px', padding: '10px 12px',
              backgroundColor: '#eef2ff', border: '1px solid #c7d2fe',
              borderRadius: '8px', fontSize: '0.78rem', color: '#3730a3',
            }}>
              🔁 <strong>{stat.returners}</strong> lecteur{stat.returners > 1 ? 's' : ''} revenu{stat.returners > 1 ? 's' : ''} relire cette histoire
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: color || '#1a1a1a', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.62rem', color: '#aaa', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────
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

  // Totaux globaux
  const totalReaders = stats.reduce((s, r) => s + r.uniqueReaders, 0)
  const totalFinishers = stats.reduce((s, r) => s + r.finishers, 0)
  const avgCompletion = stats.length > 0
    ? Math.round(stats.reduce((s, r) => s + r.completionRate, 0) / stats.length)
    : 0

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1a1a1a' }}>
            Analytics lecteurs
          </h2>
          {lastRefresh && (
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#bbb' }}>
              Mis à jour à {lastRefresh}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '7px 14px', fontSize: '0.8rem',
            backgroundColor: loading ? '#f0f0f0' : '#1a1a1a',
            color: loading ? '#aaa' : '#fff',
            border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Chargement…' : '↻ Actualiser'}
        </button>
      </div>

      {/* ── Métriques globales ── */}
      {!loading && stats.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
          marginBottom: '24px',
        }}>
          {[
            { label: 'Lecteurs uniques', value: totalReaders, color: '#1a1a1a' },
            { label: 'Histoires terminées', value: totalFinishers, color: '#22c55e' },
            { label: 'Complétion moyenne', value: `${avgCompletion}%`, color: avgCompletion >= 70 ? '#22c55e' : avgCompletion >= 40 ? '#f59e0b' : '#ef4444' },
          ].map(m => (
            <div key={m.label} style={{
              padding: '14px 16px', background: '#fff',
              border: '1px solid #e8e8e8', borderRadius: '10px',
              textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '3px' }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── États ── */}
      {error && (
        <div style={{
          padding: '14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem',
        }}>
          Erreur : {error}
        </div>
      )}

      {!loading && !error && stats.length === 0 && (
        <div style={{
          padding: '40px', textAlign: 'center', color: '#aaa',
          border: '1px dashed #e0e0e0', borderRadius: '12px',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Aucune donnée pour l'instant.<br />Partage ton app à des lecteurs pour voir apparaître les stats ici.</p>
        </div>
      )}

      {/* ── Cartes par histoire ── */}
      {!loading && stats.map(stat => (
        <StoryCard key={stat.storyId} stat={stat} />
      ))}
    </div>
  )
}

export default AnalyticsDashboard
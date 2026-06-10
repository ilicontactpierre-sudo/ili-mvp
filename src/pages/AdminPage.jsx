import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { segmentText } from '../utils/segmentAlgorithm'
import { Howl } from 'howler'
import UnifiedSegmentsTimeline from '../components/admin/UnifiedSegmentsTimeline'
import DraftManager from '../components/admin/DraftManager'
import StoryLoader from '../components/admin/StoryLoader'
import StoryPreviewModal from '../components/admin/StoryPreviewModal'
import PublishPanel from '../components/admin/PublishPanel'
import OrchestrationPanel from '../components/admin/OrchestrationPanel'
import GameModePanel from '../components/admin/GameModePanel'
import NewsletterPage from './NewsletterPage'
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard'

// ── Hook mobile ──────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

// ── Composant carte segment pour mobile ───────────────────────────────────────
function MobileSoundPopup({ track, trackIndex, segments, soundTracks, onClose, onUpdate }) {
  const startIdx = segments.findIndex(s => s.id === track.startSegmentId || s._id === track.startSegmentId)
  const endIdx   = segments.findIndex(s => s.id === track.endSegmentId   || s._id === track.endSegmentId)
  const [local, setLocal] = useState({ ...track })

  const update = (field, value) => {
    const updated = { ...local, [field]: value }
    setLocal(updated)
    onUpdate(updated)
  }

  const Row = ({ label, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <span style={{ color: '#555', fontSize: '0.78rem', minWidth: '64px' }}>{label}</span>
      {children}
    </div>
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#fff', borderRadius: '16px 16px 0 0',
          padding: '20px 16px 32px', width: '100%', maxWidth: '480px',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', backgroundColor: '#ddd', borderRadius: '2px', margin: '0 auto 16px' }} />

        {/* Titre */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#17a2b8' }}>
              🔊 {local.soundId}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '2px' }}>
              Seg. {startIdx + 1} → {endIdx >= 0 ? endIdx + 1 : startIdx + 1}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {/* Volume */}
        <Row label="Volume">
          <input type="range" min="0" max="1" step="0.05"
            value={local.volume ?? 0.5}
            onChange={e => update('volume', parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#17a2b8' }}
          />
          <span style={{ fontSize: '0.78rem', color: '#555', minWidth: '34px', textAlign: 'right' }}>
            {Math.round((local.volume ?? 0.5) * 100)}%
          </span>
        </Row>

        {/* Fade in */}
        <Row label="Fade in">
          <input type="range" min="0" max="3000" step="100"
            value={local.fadeIn ?? 0}
            onChange={e => update('fadeIn', parseInt(e.target.value))}
            style={{ flex: 1, accentColor: '#17a2b8' }}
          />
          <span style={{ fontSize: '0.78rem', color: '#555', minWidth: '34px', textAlign: 'right' }}>
            {((local.fadeIn ?? 0) / 1000).toFixed(1)}s
          </span>
        </Row>

        {/* Fade out */}
        <Row label="Fade out">
          <input type="range" min="0" max="3000" step="100"
            value={local.fadeOut ?? 0}
            onChange={e => update('fadeOut', parseInt(e.target.value))}
            style={{ flex: 1, accentColor: '#17a2b8' }}
          />
          <span style={{ fontSize: '0.78rem', color: '#555', minWidth: '34px', textAlign: 'right' }}>
            {((local.fadeOut ?? 0) / 1000).toFixed(1)}s
          </span>
        </Row>

        {/* Délai */}
        <Row label="Délai">
          <input type="range" min="0" max="5000" step="100"
            value={local.delay ?? 0}
            onChange={e => update('delay', parseInt(e.target.value))}
            style={{ flex: 1, accentColor: '#17a2b8' }}
          />
          <span style={{ fontSize: '0.78rem', color: '#555', minWidth: '34px', textAlign: 'right' }}>
            {((local.delay ?? 0) / 1000).toFixed(1)}s
          </span>
        </Row>

        {/* Étendue */}
        <Row label="Étendue">
          <button
            onClick={() => {
              if (endIdx <= startIdx) return
              const newEnd = segments[endIdx - 1]
              if (newEnd) update('endSegmentId', newEnd.id || newEnd._id)
            }}
            style={{ padding: '4px 12px', fontSize: '0.85rem', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
          >−</button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: '0.82rem', color: '#333' }}>
            Seg. {startIdx + 1} → {endIdx >= 0 ? endIdx + 1 : startIdx + 1}
          </span>
          <button
            onClick={() => {
              if (endIdx + 1 >= segments.length) return
              const newEnd = segments[endIdx + 1]
              if (newEnd) update('endSegmentId', newEnd.id || newEnd._id)
            }}
            style={{ padding: '4px 12px', fontSize: '0.85rem', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
          >＋</button>
        </Row>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px', marginTop: '8px',
            backgroundColor: '#17a2b8', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '0.9rem',
            fontWeight: 600, cursor: 'pointer',
          }}
        >Fermer</button>
      </div>
    </div>
  )
}

function MobileSegmentCard({
  segment, index, segments, setSegments,
  soundTracks, setSoundTracks, vfxTracks, saveToHistory,
  collapsedChapters, onToggleChapter,
  onToggleIsLeader, onToggleIsChapter, onGameMode,
  isHidden,
}) {
  const [mobileEditing, setMobileEditing] = useState(false)
  const [openSoundIdx, setOpenSoundIdx]   = useState(null)
  const text = typeof segment === 'string' ? segment : (segment?.text || '')
  const [mobileText, setMobileText] = useState(text)

  useEffect(() => {
    if (!mobileEditing) setMobileText(typeof segment === 'string' ? segment : (segment?.text || ''))
  }, [segment, mobileEditing])

  const isChapter   = segment?.isChapter === true
  const isLeader    = segment?.isLeader === true
  const isCollapsed = collapsedChapters?.has(index)
  const hasGame     = !!segment?.gameMode

  const myTracks = soundTracks.filter(t => {
    const si = segments.findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
    return si === index
  })

  const borderColor = isChapter ? '#8B5CF6' : isLeader ? '#F97316' : '#e0e0e0'
  const bgColor     = isChapter ? '#f5f3ff' : isLeader ? '#fff7ed' : (index % 2 === 0 ? '#fff' : '#fafafa')

  if (isHidden) return null

  const handleSoundUpdate = (updatedTrack) => {
    const updated = soundTracks.map(t => t.id === updatedTrack.id ? updatedTrack : t)
    setSoundTracks(updated)
    saveToHistory(segments, updated, vfxTracks)
  }

  return (
    <>
      <div style={{
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '8px',
        backgroundColor: bgColor,
        overflow: 'hidden',
        marginBottom: '2px',
      }}>
        {/* ── Barre supérieure ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '5px 8px',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: isChapter ? '#ede9fe' : isLeader ? '#ffedd5' : '#f8f9fa',
          minHeight: '36px', flexWrap: 'wrap',
        }}>

          {/* Numéro — cliquable si chapitre pour collapse */}
          <span
            onClick={isChapter ? () => onToggleChapter(index) : undefined}
            style={{
              fontSize: '0.68rem', fontWeight: 700,
              color: isChapter ? '#8B5CF6' : '#999',
              minWidth: '22px', cursor: isChapter ? 'pointer' : 'default',
              userSelect: 'none', display: 'flex', alignItems: 'center', gap: '2px',
            }}
          >
            {isChapter && (
              <span style={{
                fontSize: '0.5rem', display: 'inline-block',
                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}>▼</span>
            )}
            {index + 1}
          </span>

          {/* ★ toggle chapitre */}
          <button
            onClick={() => onToggleIsChapter(index)}
            title={isChapter ? 'Retirer le statut chapitre' : 'Marquer comme chapitre'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', padding: '2px 3px',
              color: isChapter ? '#8B5CF6' : 'rgba(0,0,0,0.22)',
              lineHeight: 1,
            }}
          >{isChapter ? '★' : '☆'}</button>

          {/* ◆ toggle leader */}
          <button
            onClick={() => onToggleIsLeader(index)}
            title={isLeader ? 'Retirer le statut leader' : 'Marquer comme leader'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', padding: '2px 3px',
              color: isLeader ? '#F97316' : 'rgba(0,0,0,0.22)',
              lineHeight: 1,
            }}
          >{isLeader ? '◆' : '◇'}</button>

          {/* Badges sons / vfx / game — cliquables */}
          {myTracks.map((track, ti) => (
            <button
              key={track.id}
              onClick={() => setOpenSoundIdx(ti)}
              style={{
                fontSize: '0.6rem', backgroundColor: 'rgba(23,162,184,0.12)',
                color: '#17a2b8', borderRadius: '3px', padding: '2px 6px',
                border: '1px solid rgba(23,162,184,0.25)', cursor: 'pointer',
                fontWeight: 600, lineHeight: 1,
              }}
            >🔊 {ti + 1}</button>
          ))}

          {segment?.gameMode && (
            <button
              onClick={() => onGameMode(index)}
              style={{
                fontSize: '0.6rem', backgroundColor: 'rgba(167,139,250,0.12)',
                color: '#7C3AED', borderRadius: '3px', padding: '2px 6px',
                border: '1px solid rgba(167,139,250,0.25)', cursor: 'pointer',
                fontWeight: 600, lineHeight: 1,
              }}
            >🎮</button>
          )}

          <div style={{ flex: 1 }} />

          {/* Bouton gamification (ajout) */}
          {!hasGame && (
            <button
              onClick={() => onGameMode(index)}
              title="Ajouter une gamification"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', padding: '2px 3px',
                color: 'rgba(0,0,0,0.2)', lineHeight: 1,
              }}
            >🎮</button>
          )}

          {/* Éditer */}
          <button
            onClick={() => { setMobileText(text); setMobileEditing(true) }}
            style={{
              padding: '3px 8px', fontSize: '0.7rem',
              backgroundColor: '#007bff', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
            }}
          >✏️</button>

          {/* Ajouter après */}
          <button
            onClick={() => {
              const updated = [...segments]
              updated.splice(index + 1, 0, { text: '', id: `seg_${Date.now()}` })
              setSegments(updated)
              saveToHistory(updated, soundTracks, vfxTracks)
            }}
            style={{
              padding: '3px 7px', fontSize: '0.7rem',
              backgroundColor: '#28a745', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
            }}
          >＋</button>

          {/* Supprimer */}
          <button
            onClick={() => {
              const updated = [...segments]
              updated.splice(index, 1)
              setSegments(updated)
              saveToHistory(updated, soundTracks, vfxTracks)
            }}
            style={{
              padding: '3px 7px', fontSize: '0.7rem',
              backgroundColor: 'rgba(220,53,69,0.1)', color: '#dc3545',
              border: '1px solid rgba(220,53,69,0.2)', borderRadius: '4px', cursor: 'pointer',
            }}
          >✕</button>
        </div>

        {/* ── Corps texte ── */}
        <div style={{ padding: '6px 10px' }}>
          {mobileEditing ? (
            <div>
              <textarea
                autoFocus value={mobileText}
                onChange={e => setMobileText(e.target.value)}
                style={{
                  width: '100%', minHeight: '72px', padding: '6px',
                  fontSize: '0.85rem', border: '1px solid #2196F3',
                  borderRadius: '4px', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.4',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  onClick={() => {
                    const updated = [...segments]
                    updated[index] = typeof segments[index] === 'string'
                      ? mobileText : { ...segments[index], text: mobileText }
                    setSegments(updated)
                    saveToHistory(updated, soundTracks, vfxTracks)
                    setMobileEditing(false)
                  }}
                  style={{
                    flex: 1, padding: '6px', fontSize: '0.8rem',
                    backgroundColor: '#28a745', color: '#fff',
                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                  }}
                >✓ Valider</button>
                <button
                  onClick={() => setMobileEditing(false)}
                  style={{
                    padding: '6px 12px', fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa', color: '#555',
                    border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer',
                  }}
                >Annuler</button>
              </div>
            </div>
          ) : (
            <p style={{
              margin: 0, fontSize: '0.82rem', lineHeight: '1.4',
              color: text ? '#333' : '#bbb', fontStyle: text ? 'normal' : 'italic',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {text || 'Segment vide…'}
            </p>
          )}
        </div>
      </div>

      {/* ── Popup son ── */}
      {openSoundIdx !== null && myTracks[openSoundIdx] && (
        <MobileSoundPopup
          track={myTracks[openSoundIdx]}
          trackIndex={openSoundIdx}
          segments={segments}
          soundTracks={soundTracks}
          onClose={() => setOpenSoundIdx(null)}
          onUpdate={handleSoundUpdate}
        />
      )}
    </>
  )
}

function AdminPage() {
  const isMobile = useIsMobile()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [adminTab, setAdminTab] = useState('stories') // 'stories' | 'newsletter'
  
  // États pour la section "Créer une nouvelle histoire"
  const [storyTitle, setStoryTitle] = useState('')
  const [storyAuthor, setStoryAuthor] = useState('')
  const [storySlug, setStorySlug] = useState('')
  const [storyBookUrl, setStoryBookUrl] = useState('')
  const [storyMood, setStoryMood] = useState('')
  const [storyGenre, setStoryGenre] = useState('')
  const [storyDescription, setStoryDescription] = useState('')
  const [storyText, setStoryText] = useState('')
  const [granularity, setGranularity] = useState(5)
  const [isCutting, setIsCutting] = useState(false)
  const [segments, setSegments] = useState([])
  const [cutError, setCutError] = useState('')
  
  // Historique pour undo/redo
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const MAX_HISTORY = 50

  // SoundTracks - nouveau modèle de données pour la timeline audio
  const [soundTracks, setSoundTracks] = useState([])
  const [vfxTracks, setVfxTracks] = useState([])

  // ── Mode série ────────────────────────────────────────────────────────────
  const [isSerial, setIsSerial] = useState(false)
  const [parts, setParts] = useState([])
  const [activePartIndex, setActivePartIndex] = useState(0)

  // Getters transparents : en mode série, les composants enfants
  // lisent/écrivent dans la partie active ; en mode simple, comportement inchangé.
  const activeSegments    = isSerial ? (parts[activePartIndex]?.segments    ?? []) : segments
  const activeSoundTracks = isSerial ? (parts[activePartIndex]?.soundTracks ?? []) : soundTracks
  const activeVfxTracks   = isSerial ? (parts[activePartIndex]?.vfxTracks   ?? []) : vfxTracks

  const setActiveSegments = (valOrFn) => {
    if (!isSerial) {
      setSegments(valOrFn)
      return
    }
    setParts(prev => {
      const next = [...prev]
      const cur  = next[activePartIndex] ?? {}
      next[activePartIndex] = {
        ...cur,
        segments: typeof valOrFn === 'function' ? valOrFn(cur.segments ?? []) : valOrFn,
      }
      return next
    })
  }

  const setActiveSoundTracks = (valOrFn) => {
    if (!isSerial) {
      setSoundTracks(valOrFn)
      return
    }
    setParts(prev => {
      const next = [...prev]
      const cur  = next[activePartIndex] ?? {}
      next[activePartIndex] = {
        ...cur,
        soundTracks: typeof valOrFn === 'function' ? valOrFn(cur.soundTracks ?? []) : valOrFn,
      }
      return next
    })
  }

  const setActiveVfxTracks = (valOrFn) => {
    if (!isSerial) {
      setVfxTracks(valOrFn)
      return
    }
    setParts(prev => {
      const next = [...prev]
      const cur  = next[activePartIndex] ?? {}
      next[activePartIndex] = {
        ...cur,
        vfxTracks: typeof valOrFn === 'function' ? valOrFn(cur.vfxTracks ?? []) : valOrFn,
      }
      return next
    })
  }

  // Helpers pour créer une nouvelle partie vide
  const makeNewPart = (index) => ({
    id:          `part_${Date.now()}_${index}`,
    title:       `Partie ${index + 1}`,
    subtitle:    '',
    description: '',
    published:   false,
    segments:    [],
    soundTracks: [],
    vfxTracks:   [],
  })

  // Bibliothèque sonore
  const [soundLibrary, setSoundLibrary] = useState([])
  const [soundSearch, setSoundSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    mood: [],
    intensity: []
  })
  const [playingSound, setPlayingSound] = useState(null)
  const [showSoundPicker, setShowSoundPicker] = useState(null) // index du segment ou null

  // Options de filtres
  const FILTER_CATEGORIES = ['Ambiance', 'Musique', 'SFX', 'Dialogue']
  const FILTER_MOOD = ['Calme', 'Tension', 'Mélancolie', 'Joie', 'Mystère', 'Action']
  const FILTER_INTENSITY = ['Douce', 'Moyenne', 'Forte']

  // État pour l'aperçu
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Charger la bibliothèque sonore : JSON local + enrichissement Supabase
  useEffect(() => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

    // 1. Charger le JSON local (toute la bibliothèque)
    const localPromise = fetch('/sounds/sounds-index.json')
      .then(res => res.json())
      .catch(() => [])

    // 2. Charger les sons uploadés sur Supabase (pour récupérer leurs URLs)
    const supabasePromise = fetch(`${SUPABASE_URL}/rest/v1/sounds?select=*&order=label.asc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    })
      .then(res => res.json())
      .catch(() => [])

    // 3. Fusionner : le JSON local est la base, Supabase enrichit avec l'URL
    Promise.all([localPromise, supabasePromise]).then(([localSounds, supabaseRows]) => {
      const urlMap = {}
      const supabaseFullMap = {}
      if (Array.isArray(supabaseRows)) {
        supabaseRows.forEach(r => {
          if (r.id && r.url) urlMap[r.id] = r.url
          if (r.id) supabaseFullMap[r.id] = r
        })
      }
      const localArray = Array.isArray(localSounds) ? localSounds : []
      const localIds = new Set(localArray.map(s => s.id))
      // Sons du JSON local enrichis avec l'URL Supabase
      const merged = localArray.map(sound => ({
        ...sound,
        url: urlMap[sound.id] || null,
      }))
      // Sons uploadés sur Supabase mais absents du JSON local (imports manuels)
      const supabaseOnly = supabaseRows
        .filter(r => r.id && r.url && !localIds.has(r.id))
        .map(r => ({
          id: r.id,
          label: r.label || r.id,
          url: r.url,
          filename: r.filename || null,
          tags: r.tags || [],
          categories: r.categories || [],
          boomCategory: r.boom_category || null,
          boomSubcategory: r.boom_subcategory || null,
          duration: r.duration || 0,
          loop: r.loop || false,
          mood: r.mood || [],
          description: r.description || null,
          searchString: r.search_string || null,
        }))
      const all = [...merged, ...supabaseOnly]
      setSoundLibrary(all)
      // Synchroniser muted/broken sur les soundTracks selon les URLs réelles
      setSoundTracks(prev => prev.map(track => {
        const hasUrl = !!urlMap[track.soundId]
        if (hasUrl && (track.muted || track.broken)) {
          const { broken, ...rest } = track
          return { ...rest, muted: false }
        }
        if (!hasUrl && !track.muted) {
          return { ...track, muted: true, broken: true }
        }
        return track
      }))
    })
  }, [])

  // Sons filtrés (mémoïsé)
  const filteredSounds = useMemo(() => {
    return soundLibrary.filter(sound => {
      // Filtre recherche texte
      if (soundSearch.trim()) {
        const search = soundSearch.toLowerCase().trim()
        const matchLabel = sound.label.toLowerCase().includes(search)
        const matchTags = (sound.tags || []).some(t => t.toLowerCase().includes(search))
        const matchMood = (sound.mood || []).some(m => m.toLowerCase().includes(search))
        if (!matchLabel && !matchTags && !matchMood) return false
      }

      // Filtres catégories (ET logique)
      if (activeFilters.categories.length > 0) {
        const soundCats = sound.categories || []
        if (!activeFilters.categories.some(c => soundCats.includes(c))) return false
      }

      // Filtres mood (ET logique)
      if (activeFilters.mood.length > 0) {
        const soundMoods = sound.mood || []
        if (!activeFilters.mood.some(m => soundMoods.includes(m))) return false
      }

      // Filtres intensité (ET logique)
      if (activeFilters.intensity.length > 0) {
        if (!activeFilters.intensity.includes(sound.intensity)) return false
      }

      return true
    })
  }, [soundLibrary, soundSearch, activeFilters])

  // Toggle un filtre
  const toggleFilter = (type, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }))
  }

  // Écouter un extrait de 3 secondes
  const playSoundPreview = (sound) => {
    // Arrêter le son en cours
    if (playingSound) {
      playingSound.stop()
      playingSound.unload()
    }

    const howl = new Howl({
      src: [`/sounds/${sound.filename}`],
      volume: 0.5,
      onloaderror: () => {
        console.error(`Erreur chargement son: ${sound.filename}`)
        setPlayingSound(null)
      }
    })

    howl.play()
    setPlayingSound(howl)

    // Arrêter après 3 secondes
    setTimeout(() => {
      if (howl.playing()) {
        howl.stop()
        howl.unload()
      }
      setPlayingSound(null)
    }, 3000)
  }

  // Ajouter un son à un segment
  const addSoundToSegment = (segmentIndex, sound) => {
    setSegments(prevSegments => {
      const newSegments = [...prevSegments]
      const segment = newSegments[segmentIndex]
      
      // Initialiser audioEvents si inexistant
      if (!segment.audioEvents) {
        segment.audioEvents = []
      }
      
      // Ajouter le nouveau son
      segment.audioEvents.push({
        soundId: sound.id,
        action: 'play',
        volume: 0.5,
        loop: sound.loop || false,
        delay: 0,
        duration: 0
      })
      
      saveToHistory(newSegments, soundTracks, vfxTracks)
      return newSegments
    })
    
    // Fermer le picker
    setShowSoundPicker(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      // Stocker le mot de passe en sessionStorage pour la publication automatique
      sessionStorage.setItem('ili_admin_password', password)
      setError('')
    } else {
      setError('Mot de passe incorrect')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setPassword('')
    setError('')
  }

  // Raccourcis clavier pour undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key?.toLowerCase() ?? ''  
      // Ctrl+Z ou Cmd+Z pour undo
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl+Y ou Ctrl+Shift+Z ou Cmd+Shift+Z pour redo
      if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyIndex, history])

  const saveToHistory = (newSegments, newSoundTracks, newVfxTracks) => {
    const snapshot = {
      segments: newSegments ?? segments,
      soundTracks: newSoundTracks ?? soundTracks,
      vfxTracks: newVfxTracks ?? vfxTracks,
    }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(snapshot)))
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleSegmentChange = (index, newText) => {
    setSegments(prevSegments => {
      const newSegments = [...prevSegments];
      newSegments[index] = newText;
      saveToHistory(newSegments)
      return newSegments;
    });
  };

  const handleAddSegment = (index) => {
    setSegments(prevSegments => {
      const newSegments = [...prevSegments];
      newSegments.splice(index + 1, 0, '');
      saveToHistory(newSegments)
      return newSegments;
    });
  };

  const handleCutSegment = (index, cursorPosition) => {
    if (cursorPosition === undefined || cursorPosition === null) {
      alert("Veuillez positionner le curseur pour couper le segment.");
      return;
    }

    const segmentToCut = typeof segments[index] === 'string'
      ? segments[index]
      : (segments[index]?.text || '')
    if (cursorPosition === 0 || cursorPosition >= segmentToCut.length) {
      alert("La position de coupe doit être à l'intérieur du texte du segment.");
      return;
    }

    setSegments(prevSegments => {
      const newSegments = [...prevSegments];
      const original = prevSegments[index]
      const part1 = typeof original === 'string'
        ? original.substring(0, cursorPosition)
        : { ...original, text: original.text.substring(0, cursorPosition), id: `seg_${Date.now()}_a`, breakAt: null }
      const part2 = typeof original === 'string'
        ? original.substring(cursorPosition)
        : { ...original, text: original.text.substring(cursorPosition), id: `seg_${Date.now()}_b`, breakAt: null, audioEvents: [] }
      newSegments.splice(index, 1, part1, part2);
      saveToHistory(newSegments)
      return newSegments;
    });
  };

  const handleMergeSegments = (index) => {
    if (index >= segments.length - 1) return; 

    if (window.confirm("Êtes-vous sûr de vouloir fusionner ce segment avec le suivant ?")) {
      setSegments(prevSegments => {
        const newSegments = [...prevSegments];
        const mergedSegment = newSegments[index] + ' ' + newSegments[index + 1];
        newSegments.splice(index, 2, mergedSegment);
        saveToHistory(newSegments)
        return newSegments;
      });
    }
  };

  const handleDeleteSegment = (index) => {
    if (segments[index].trim() !== '' && !window.confirm("Le segment n'est pas vide. Êtes-vous sûr de vouloir le supprimer ?")) {
      return;
    }
    setSegments(prevSegments => {
      const newSegments = [...prevSegments];
      newSegments.splice(index, 1);
      saveToHistory(newSegments)
      return newSegments;
    });
  };

  // Fonctions undo/redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const snapshot = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      setSegments(JSON.parse(JSON.stringify(snapshot.segments)))
      setSoundTracks(JSON.parse(JSON.stringify(snapshot.soundTracks)))
      setVfxTracks(JSON.parse(JSON.stringify(snapshot.vfxTracks)))
    }
  }
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const snapshot = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      setSegments(JSON.parse(JSON.stringify(snapshot.segments)))
      setSoundTracks(JSON.parse(JSON.stringify(snapshot.soundTracks)))
      setVfxTracks(JSON.parse(JSON.stringify(snapshot.vfxTracks)))
    }
  }

  const handleCutText = () => {
    setCutError('');
    setIsCutting(true);
    try {
      const result = segmentText(storyText, granularity);
      if (result.length === 0) {
        setCutError("Aucun segment n'a été généré. Vérifiez votre texte.");
      } else {
        const newSegments = segments.length > 0 ? [...segments, ...result] : result
        setSegments(newSegments);
        setStoryText('');
        saveToHistory(newSegments, soundTracks, vfxTracks)
      }
    } catch (err) {
      console.error("Erreur lors du découpage:", err);
      setCutError(err.message || "Une erreur inattendue est survenue lors du découpage.");
    } finally {
      setIsCutting(false);
    }
  };

  // Restaurer un snapshot (depuis DraftManager ou StoryLoader)
  const handleRestoreSnapshot = (snapshot) => {
    setStoryTitle(snapshot.title || '')
    setStoryAuthor(snapshot.author || '')
    setStorySlug(snapshot.slug || '')
    setStoryBookUrl(snapshot.bookUrl || '')
    setStoryMood(snapshot.mood || '')
    setStoryGenre(snapshot.genre || '')
    setStoryDescription(snapshot.description || '')
    setSegments(snapshot.segments || [])
    setSoundTracks(snapshot.soundTracks || [])
    setVfxTracks(snapshot.vfxTracks || [])
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  // Charger une histoire depuis StoryLoader
  const handleLoadStory = (storyData) => {
    setStoryTitle(storyData.title || '')
    setStoryAuthor(storyData.author || '')
    setStorySlug(storyData.id || storyData.slug || '')
    setStoryBookUrl(storyData.bookUrl || '')
    setStoryMood(storyData.mood || '')
    setStoryGenre(storyData.genre || '')
    setStoryDescription(storyData.description || '')

    // Normaliser les segments
    const loadedSegments = (storyData.segments || []).map((seg, i) => ({
      ...seg,
      id: seg.id ?? `seg_${i}`,
      text: seg.text || '',
      audioEvents: seg.audioEvents || []
    }))
    setSegments(loadedSegments)

    // Reconstruire soundTracks depuis sounds[] + audioEvents[]
    // si soundTracks n'existe pas dans le JSON (cas JSON publié)
    if (storyData.soundTracks && storyData.soundTracks.length > 0) {
      setSoundTracks(storyData.soundTracks)
    } else {
      const reconstructed = []
      const soundsMap = {}
      ;(storyData.sounds || []).forEach(s => { soundsMap[s.id] = s })

      // Parcourir les audioEvents de chaque segment pour reconstruire les blocs
      const openTracks = {} // soundId -> track en cours

      loadedSegments.forEach((seg, segIdx) => {
        ;(seg.audioEvents || []).forEach(ev => {
          if (ev.action === 'play' || ev.action === 'fadeIn') {
            // Début d'un bloc son
            openTracks[ev.soundId] = {
              id: `track_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              soundId: ev.soundId,
              startSegmentId: seg.id,
              endSegmentId: seg.id, // sera mis à jour si on trouve un stop/fadeOut
              volume: ev.volume ?? 0.5,
              loop: ev.loop || soundsMap[ev.soundId]?.loop || false,
              delay: ev.delay || 0,
              fadeIn: ev.action === 'fadeIn' ? (ev.duration || 0) : 0,
              fadeOut: 0,
              muted: false,
              column: 0
            }
                  // APRÈS
          } else if (ev.action === 'fadeOut') {
            // fadeOut est sur le segment de fin lui-même
            if (openTracks[ev.soundId]) {
              openTracks[ev.soundId].endSegmentId = seg.id
              openTracks[ev.soundId].fadeOut = ev.duration || 0
              reconstructed.push(openTracks[ev.soundId])
              delete openTracks[ev.soundId]
            }
          }
          // Plus de cas 'stop' — un stop dans un vieux JSON est ignoré proprement
        })
      })

      // Sons sans événement de fin explicite : fermer au dernier segment
      Object.values(openTracks).forEach(track => {
        const lastSeg = loadedSegments[loadedSegments.length - 1]
        track.endSegmentId = lastSeg?.id ?? track.startSegmentId
        reconstructed.push(track)
      })

      setSoundTracks(reconstructed)
    }

    // Restaurer les vfxTracks
    setVfxTracks(storyData.vfxTracks || [])
    // Afficher une confirmation
    alert('Histoire chargée dans l\'éditeur.\n\nLes modifications non sauvegardées ont été remplacées.')
    
    // Scroll vers l'éditeur de segments
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  // Ouvrir l'aperçu depuis StoryLoader
  const handlePreviewStory = (storyData) => {
  // Construire les sons utilisés
  const usedSoundIds = new Set(
    (storyData.soundTracks || []).map(t => t.soundId)
  )
  const sounds = soundLibrary.filter(s => usedSoundIds.has(s.id))
  
  setIsPreviewOpen(true)
  // Stocker les données d'aperçu dans un ref ou state temporaire
  setPreviewStoryData({
    ...storyData,
    sounds
  })
}

  // Données pour l'aperçu
  const [previewStoryData, setPreviewStoryData] = useState(null)
  const refTop = useRef(null)
  const refTimeline = useRef(null)
  const refOrchestration = useRef(null)
  const [stickyHeight, setStickyHeight] = useState(89)
  useEffect(() => {
    const updateStickyHeight = () => {
      const tabBar = document.querySelector('[data-sticky="tabbar"]')
      const draftBar = document.querySelector('[data-sticky="draftbar"]')
      const h = (tabBar?.offsetHeight || 45) + (draftBar?.offsetHeight || 44)
      setStickyHeight(h)
    }
    updateStickyHeight()
    window.addEventListener('resize', updateStickyHeight)
    const observer = new MutationObserver(updateStickyHeight)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => { window.removeEventListener('resize', updateStickyHeight); observer.disconnect() }
  }, [])
  // États partagés mobile/desktop pour chapitres + gameMode
  const [collapsedChapters, setCollapsedChapters] = useState(new Set())
  const [gameModePanel, setGameModePanel] = useState(null)

  const hiddenSegments = useMemo(() => {
    const hidden = new Set()
    let currentChapterCollapsed = false
    for (let i = 0; i < segments.length; i++) {
      if (segments[i]?.isChapter === true) {
        currentChapterCollapsed = collapsedChapters.has(i)
      } else if (currentChapterCollapsed) {
        hidden.add(i)
      }
    }
    return hidden
  }, [segments, collapsedChapters])

  const handleToggleChapter = useCallback((index) => {
    setCollapsedChapters(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const handleToggleIsChapter = useCallback((index) => {
    const segment = segments[index]
    if (!segment) return
    const wasChapter = segment?.isChapter === true
    const updated = [...segments]
    if (!wasChapter) {
      updated[index] = typeof segment === 'string'
        ? { text: segment, isChapter: true, isLeader: true }
        : { ...segment, isChapter: true, isLeader: true }
      if (index + 1 < segments.length) {
        const next = segments[index + 1]
        updated[index + 1] = typeof next === 'string'
          ? { text: next, isLeader: true }
          : { ...next, isLeader: true }
      }
    } else {
      updated[index] = typeof segment === 'string'
        ? { text: segment, isChapter: false }
        : { ...segment, isChapter: false }
      setCollapsedChapters(prev => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
    setSegments(updated)
    saveToHistory(updated, soundTracks, vfxTracks)
  }, [segments, soundTracks, vfxTracks])
  
  const handleToggleIsLeader = useCallback((index) => {
    const segment = segments[index]
    if (!segment) return
    const updated = [...segments]
    updated[index] = typeof segment === 'string'
      ? { text: segment, isLeader: true }
      : { ...segment, isLeader: !segment.isLeader }
    setSegments(updated)
    saveToHistory(updated, soundTracks, vfxTracks)
  }, [segments, soundTracks, vfxTracks])
  
  // Construire les données pour l'aperçu en temps réel
  const getCurrentStoryData = () => {
    const usedSoundIds = new Set(
      soundTracks.map(t => t.soundId) // inclure aussi les muted/broken
    )
    const sounds = soundLibrary
      .filter(s => usedSoundIds.has(s.id))
      .map(s => ({
        id: s.id,
        url: s.url || (s.filename ? `/sounds/${s.filename}` : `/sounds/${s.id}.mp3`),
        loop: s.loop || false,
      }))
    
    return {
      title: storyTitle || 'Sans titre',
      author: storyAuthor || 'Anonyme',
      mood: storyMood || '',
      genre: storyGenre || '',
      description: storyDescription || '',
      segments: segments.map((seg, i) => ({
        ...seg,
        text: typeof seg === 'string' ? seg : seg.text || '',
        audioEvents: seg.audioEvents || []
      })),
      soundTracks: soundTracks,
      vfxTracks: vfxTracks,
      sounds: sounds
    }
  }

  // Réinitialiser pour une nouvelle histoire
  const handleNewStory = () => {
    setStoryTitle('')
    setStoryAuthor('')
    setStorySlug('')
    setStoryBookUrl('')
    setStoryMood('')
    setStoryGenre('')
    setStoryDescription('')
    setStoryText('')
    setSegments([])
    setSoundTracks([])
    setVfxTracks([])
    setHistory([])
    setHistoryIndex(-1)
    setCutError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Sauvegarder le brouillon (pour PublishPanel)
  const handleSaveDraft = () => {
    // Déclenche une sauvegarde manuelle via le DraftManager
    // On utilise un événement personnalisé pour communiquer avec DraftManager
    window.dispatchEvent(new CustomEvent('ili-save-draft'))
  }

  const SegmentCard = ({ index, segment, segments, setSegments, handleSegmentChange, handleAddSegment, handleCutSegment, handleMergeSegments, handleDeleteSegment, onAddSound }) => {
    const textareaRef = useRef(null);
    const [showCutModal, setShowCutModal] = useState(false);
    const [cutPosition, setCutPosition] = useState(null);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    }, [segment]);

    const handleTextareaChange = (e) => {
      handleSegmentChange(index, e.target.value);
    };

    const handleCutClick = () => {
      setCutPosition(textareaRef.current.selectionStart);
      setShowCutModal(true);
    };

    const confirmCut = () => {
      handleCutSegment(index, cutPosition);
      setShowCutModal(false);
    };

    return (
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h4 style={{ margin: '0', fontSize: '1.2rem', color: '#555' }}>Segment {index + 1}</h4>
          <button
            onClick={() => handleDeleteSegment(index)}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc3545',
              cursor: 'pointer',
              fontSize: '1.5rem'
            }}
            title="Supprimer"
          >
            ✕
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={typeof segment === 'string' ? segment : segment.text || ''}
          onChange={handleTextareaChange}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid #eee',
            borderRadius: '4px',
            minHeight: '60px',
            overflowY: 'hidden',
            resize: 'none',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5'
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            onClick={handleCutClick}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✂ Couper ici
          </button>
          {index < segments.length - 1 && (
            <button
              onClick={() => handleMergeSegments(index)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ffc107',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ⊕ Fusionner ↓
            </button>
          )}
        </div>
        {showCutModal && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', border: '1px dashed #ccc', borderRadius: '4px' }}>
            <p>Couper le segment à la position du curseur ({cutPosition}) ?</p>
            <button onClick={confirmCut} style={{ marginRight: '0.5rem' }}>Confirmer</button>
            <button onClick={() => setShowCutModal(false)}>Annuler</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <div style={{ flex: 1 }}></div>
          <button
            onClick={() => onAddSound(index)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Son
          </button>
          <button
            onClick={() => handleAddSegment(index)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Ajouter un segment
          </button>
        </div>
        
        {/* Afficher les audioEvents du segment */}
        {segment.audioEvents && segment.audioEvents.length > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.875rem' }}>
            <strong>Sons associés :</strong>
            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
              {segment.audioEvents.map((ae, i) => (
                <li key={i}>
                  {ae.soundId} - {ae.action} (vol: {ae.volume}, loop: {ae.loop ? 'oui' : 'non'})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem'
      }}>
        <h1 style={{ marginBottom: '2rem' }}>Administration ILi</h1>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '300px'
        }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          {error && (
            <p style={{
              color: 'red',
              margin: '0',
              fontSize: '0.875rem'
            }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Entrer
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh'
    }}>
      {/* Onglets admin */}
      <div data-sticky="tabbar" style={{ display: 'flex', borderBottom: '1px solid #eee', backgroundColor: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <button
          onClick={() => setAdminTab('stories')}
          style={{
            padding: '0.85rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: adminTab === 'stories' ? 700 : 400,
            color: adminTab === 'stories' ? '#1a1a1a' : '#999',
            borderBottom: adminTab === 'stories' ? '2px solid #1a1a1a' : '2px solid transparent',
          }}
        >Histoires</button>
        <button
          onClick={() => setAdminTab('newsletter')}
          style={{
            padding: '0.85rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: adminTab === 'newsletter' ? 700 : 400,
            color: adminTab === 'newsletter' ? '#1a1a1a' : '#999',
            borderBottom: adminTab === 'newsletter' ? '2px solid #1a1a1a' : '2px solid transparent',
          }}
        >Newsletter</button>
        <button
          onClick={() => setAdminTab('analytics')}
          style={{
            padding: '0.85rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: adminTab === 'analytics' ? 700 : 400,
            color: adminTab === 'analytics' ? '#1a1a1a' : '#999',
            borderBottom: adminTab === 'analytics' ? '2px solid #1a1a1a' : '2px solid transparent',
          }}
        >Analytics</button>
      </div>

      {/* Contenu selon l'onglet actif */}
      {adminTab === 'newsletter' && (
        <NewsletterPage password={password} />
      )}
      {adminTab === 'analytics' && (
        <AnalyticsDashboard />
      )}

      {adminTab === 'stories' && <>
      {/* 1. DraftManager (barre de statut sticky) */}
      <DraftManager
        title={storyTitle}
        author={storyAuthor}
        slug={storySlug}
        bookUrl={storyBookUrl}
        mood={storyMood}
        genre={storyGenre}
        description={storyDescription}
        segments={segments}
        soundTracks={soundTracks}
        vfxTracks={vfxTracks}
        onRestore={handleRestoreSnapshot}
        onOpenPreview={() => setIsPreviewOpen(true)}
      />

      {/* Contenu principal */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isMobile ? '0.75rem' : '2rem',
        paddingBottom: isMobile ? '3rem' : '4rem',
        flex: 1
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '800px'
        }}>
{/* Nouvelle histoire */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={handleNewStory}
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                color: '#333',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ＋ Nouvelle histoire
            </button>
          </div>

          {/* 2. StoryLoader (section collapsible) */}
          <StoryLoader
            onLoadStory={handleLoadStory}
            onPreviewStory={handlePreviewStory}
          />

          {/* 3. Section "Créer / Éditer" */}
          <div
            ref={refTop}
            style={{
              padding: isMobile ? '1rem' : '2rem',
              border: '1px solid #eee',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
            backgroundColor: '#fff',
            marginBottom: '2rem'
          }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.75rem', color: '#333' }}>
              Créer / Éditer une histoire
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Titre de l'histoire"
                value={storyTitle}
                onChange={(e) => {
                  const newTitle = e.target.value
                  setStoryTitle(newTitle)
                  const toSlug = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')
                  setStorySlug([storyAuthor, newTitle].filter(Boolean).map(toSlug).join('-'))
                }}
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <input
                type="text"
                placeholder="Auteur de l'histoire"
                value={storyAuthor}
                onChange={(e) => {
                  const newAuthor = e.target.value
                  setStoryAuthor(newAuthor)
                  const toSlug = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')
                  setStorySlug([newAuthor, storyTitle].filter(Boolean).map(toSlug).join('-'))
                }}
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              {/* Humeur */}
              <input
                type="text"
                placeholder="Humeur (ex : Mélancolie, Tension, Mystère…)"
                value={storyMood}
                onChange={(e) => setStoryMood(e.target.value)}
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              {/* Genre */}
              <input
                type="text"
                placeholder="Genre (ex : Nouvelle, Roman, Poésie…)"
                value={storyGenre}
                onChange={(e) => setStoryGenre(e.target.value)}
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              {/* Description */}
              <textarea
                placeholder="Description (2-3 lignes — accroche pour le lecteur)"
                value={storyDescription}
                onChange={(e) => setStoryDescription(e.target.value)}
                rows={3}
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <input
                type="text"
                placeholder="ID / Slug (ex: la-parure)"
                value={storySlug}
                onChange={(e) => setStorySlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''))}
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type="url"
                  placeholder="URL librairie (ex: https://www.librairiesindependantes.com/product/...)"
                  value={storyBookUrl}
                  onChange={(e) => setStoryBookUrl(e.target.value)}
                  style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}
                />
                {!storyBookUrl && (
                  <a
                    href="https://www.librairiesindependantes.com"
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.78rem', color: '#888', textDecoration: 'underline' }}
                  >
                    Trouver l'URL sur librairiesindependantes.com →
                  </a>
                )}
              </div>
              <textarea
                placeholder="Colle ton texte ici (10 lignes minimum)"
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                rows="10"
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', minHeight: '200px' }}
              ></textarea>

              <div style={{ marginTop: '0.5rem' }}>
                <label htmlFor="granularity-slider" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Granularité : {granularity}/10
                </label>
                {isMobile ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#888' }}>Courts ①</span>
                      <span style={{ fontSize: '0.7rem', color: '#888' }}>Larges ⑩</span>
                    </div>
                    <input
                      type="range"
                      id="granularity-slider"
                      min="1"
                      max="10"
                      value={granularity}
                      onChange={(e) => setGranularity(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#28a745' }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#555', whiteSpace: 'nowrap' }}>1 = segments très courts et percutants</span>
                    <input
                      type="range"
                      id="granularity-slider"
                      min="1"
                      max="10"
                      value={granularity}
                      onChange={(e) => setGranularity(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#555', whiteSpace: 'nowrap' }}>10 = segments larges et respirés</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.5rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                  <button
                    onClick={handleCutText}
                    disabled={isCutting || !storyText.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      backgroundColor: storyText.trim() && !isCutting ? '#28a745' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: storyText.trim() && !isCutting ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isCutting ? "Découpage en cours..." : "Découper le texte"}
                  </button>
                  {segments.length > 0 && (
                    <button
                      onClick={() => {
                        // Injecte un faux keyup pour forcer la désactivation du mode découpe
                        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta', bubbles: true }))
                        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', bubbles: true }))
                      }}
                      title="Forcer la désactivation du mode découpe si bloqué"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.72rem',
                        backgroundColor: 'transparent',
                        color: '#bbb',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                        opacity: 0.7,
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                    >
                      <span style={{ fontSize: '0.85rem' }}>✂</span>
                      <span>réinitialiser mode découpe</span>
                    </button>
                  )}
                </div>
                
                
              </div>
              {cutError && (
                <p style={{ color: 'red', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                  Erreur: {cutError}
                </p>
              )}

              {segments.length > 0 && (
                <>
                  {/* Timeline Audio unifiée avec éditeur de segments */}
                  <div
                    ref={refTimeline}
                    style={{ 
                      marginTop: '2rem', 
                      borderTop: '1px solid #eee', 
                      paddingTop: '1.5rem',
                      scrollMarginTop: `${stickyHeight + 12}px`,
                    }}
                  >
                    {isMobile ? (
                      /* ── Vue mobile : liste simple des segments ── */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {/* Conteneur scrollable */}
                        <div style={{
                          height: '60vh',
                          overflowY: 'auto',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          padding: '6px',
                          backgroundColor: '#f8f9fa',
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>
                            Segments ({segments.length})
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#aaa' }}>
                            Double-tap pour éditer
                          </span>
                        </div>
                        {segments.map((segment, index) => (
                          <MobileSegmentCard
                            key={segment?.id || index}
                            segment={segment}
                            index={index}
                            segments={segments}
                            setSegments={setSegments}
                            soundTracks={soundTracks}
                            setSoundTracks={setSoundTracks}
                            vfxTracks={vfxTracks}
                            saveToHistory={saveToHistory}
                            collapsedChapters={collapsedChapters}
                            onToggleChapter={handleToggleChapter}
                            onToggleIsLeader={handleToggleIsLeader}
                            onToggleIsChapter={handleToggleIsChapter}
                            onGameMode={(idx) => setGameModePanel(idx)}
                            isHidden={hiddenSegments.has(index)}
                          />
                        ))}
                               
                        </div>{/* fin conteneur scrollable */}
                        {/* Note d'information */}
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem',
                          backgroundColor: '#fff8e1',
                          border: '1px solid #ffe082',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          color: '#795548',
                          lineHeight: 1.4
                        }}>
                          💡 La timeline audio et les effets VFX sont disponibles sur ordinateur uniquement.
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: '850px', marginBottom: '2rem' }}>
                        <UnifiedSegmentsTimeline
                          segments={segments}
                          soundTracks={soundTracks}
                          soundLibrary={soundLibrary}
                          vfxTracks={vfxTracks}
                          onSegmentsChange={setSegments}
                          onSoundTracksChange={setSoundTracks}
                          onVfxTracksChange={setVfxTracks}
                          onSaveToHistory={() => saveToHistory(segments, soundTracks, vfxTracks)}
                          adminPassword={password}
                          onSoundsImported={(updatedSounds) => {
                            console.log('[onSoundsImported AdminPage] updatedSounds:', updatedSounds)
                            console.log('[onSoundsImported AdminPage] soundTracks avant patch:', soundTracks)
                            if (Array.isArray(updatedSounds) && updatedSounds.length > 0) {
                              const urlMap = {}
                              updatedSounds.forEach(s => { if (s.id && s.url) urlMap[s.id] = s.url })
                              setSoundLibrary(prev => prev.map(sound =>
                                urlMap[sound.id] ? { ...sound, url: urlMap[sound.id] } : sound
                              ))
                              setSoundTracks(prev => {
                                const patched = prev.map(track => {
                                  if (!urlMap[track.soundId]) return track
                                  const { broken, ...rest } = track
                                  return { ...rest, muted: false }
                                })
                                const seen = new Map()
                                const deduped = []
                                for (const t of patched) {
                                  if (!t.broken) {
                                    seen.set(`${t.soundId}|${t.startSegmentId}`, true)
                                  }
                                }
                                for (const t of patched) {
                                  if (t.broken && seen.has(`${t.soundId}|${t.startSegmentId}`)) {
                                    continue
                                  }
                                  deduped.push(t)
                                }
                                console.log('[onSoundsImported AdminPage] soundTracks après patch:', deduped)
                                return deduped
                              })
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 4. OrchestrationPanel */}
          <div ref={refOrchestration} style={{ scrollMarginTop: `${stickyHeight + 12}px` }} />
          {segments.length > 0 && (
            <OrchestrationPanel
              segments={segments}
              soundLibrary={soundLibrary}
              soundTracks={soundTracks}
              onSoundTracksChange={setSoundTracks}
              onSaveToHistory={() => saveToHistory(segments, soundTracks, vfxTracks)}
            />
          )}

          {/* 5. PublishPanel */}
          <PublishPanel
            title={storyTitle}
            author={storyAuthor}
            slug={storySlug}
            bookUrl={storyBookUrl}
            mood={storyMood}
            genre={storyGenre}
            description={storyDescription}
            segments={segments}
            soundTracks={soundTracks}
            vfxTracks={vfxTracks}
            soundLibrary={soundLibrary}
            onNewStory={handleNewStory}
            onSaveDraft={handleSaveDraft}
          />
        </div>
      </div>

      {/* Modal SoundPicker */}
      {showSoundPicker !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowSoundPicker(null)}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Sélectionner un son</h3>
              <button
                onClick={() => setShowSoundPicker(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            {/* Champ de recherche */}
            <input
              type="text"
              placeholder="Rechercher (label, tags, mood)..."
              value={soundSearch}
              onChange={(e) => setSoundSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginBottom: '1rem'
              }}
            />

            {/* Filtres rapides */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#666' }}>Catégories :</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {FILTER_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleFilter('categories', cat)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                      backgroundColor: activeFilters.categories.includes(cat) ? '#007bff' : '#e9ecef',
                      color: activeFilters.categories.includes(cat) ? '#fff' : '#333',
                      border: 'none',
                      borderRadius: '999px',
                      cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#666' }}>Mood :</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {FILTER_MOOD.map(mood => (
                  <button
                    key={mood}
                    onClick={() => toggleFilter('mood', mood)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                      backgroundColor: activeFilters.mood.includes(mood) ? '#28a745' : '#e9ecef',
                      color: activeFilters.mood.includes(mood) ? '#fff' : '#333',
                      border: 'none',
                      borderRadius: '999px',
                      cursor: 'pointer'
                    }}
                  >
                    {mood}
                  </button>
                ))}
              </div>

              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#666' }}>Intensité :</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {FILTER_INTENSITY.map(int => (
                  <button
                    key={int}
                    onClick={() => toggleFilter('intensity', int)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                      backgroundColor: activeFilters.intensity.includes(int) ? '#dc3545' : '#e9ecef',
                      color: activeFilters.intensity.includes(int) ? '#fff' : '#333',
                      border: 'none',
                      borderRadius: '999px',
                      cursor: 'pointer'
                    }}
                  >
                    {int}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste des sons filtrés */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                {filteredSounds.length} son(s) trouvé(s)
              </p>
              
              {filteredSounds.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Aucun son ne correspond aux filtres</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredSounds.slice(0, 20).map(sound => (
                    <div
                      key={sound.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem',
                        border: '1px solid #eee',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <button
                        onClick={() => playSoundPreview(sound)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#28a745',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ▶ 3s
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{sound.label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                          {sound.id} {sound.loop && '🔁'}
                          {sound.tags && sound.tags.length > 0 && (
                            <span> — {sound.tags.slice(0, 3).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => addSoundToSegment(showSoundPicker, sound)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#17a2b8',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        + Ajouter
                      </button>
                    </div>
                  ))}
                  {filteredSounds.length > 20 && (
                    <p style={{ textAlign: 'center', color: '#999', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      ... et {filteredSounds.length - 20} autres sons
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GameModePanel mobile */}
      {gameModePanel !== null && (
        <GameModePanel
          segment={segments[gameModePanel]}
          segmentIndex={gameModePanel}
          onSave={(idx, gameMode) => {
            const updated = [...segments]
            updated[idx] = { ...updated[idx], gameMode }
            setSegments(updated)
            saveToHistory(updated, soundTracks, vfxTracks)
            setGameModePanel(null)
          }}
          onDelete={(idx) => {
            const updated = [...segments]
            const { gameMode, ...rest } = updated[idx]
            updated[idx] = rest
            setSegments(updated)
            saveToHistory(updated, soundTracks, vfxTracks)
            setGameModePanel(null)
          }}
          onClose={() => setGameModePanel(null)}
        />
      )}

      {/* StoryPreviewModal */}
      <StoryPreviewModal
        isOpen={isPreviewOpen}
        storyData={previewStoryData || getCurrentStoryData()}
        onClose={() => setIsPreviewOpen(false)}
      />

      </> /* fin onglet stories */}
      {/* ── Panneau latéral flottant (ancres + undo/redo) ── */}
      {adminTab === 'stories' && segments.length > 0 && (
        <div style={{
          position: 'fixed',
          right: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          backgroundColor: 'rgba(18,18,18,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          minWidth: '110px',
        }}>
          {/* ── Ancres ── */}
          {[
            { ref: refTop,          label: 'Haut',        icon: '⬆' },
            { ref: refTimeline,     label: 'Timeline',    icon: '▦'  },
            { ref: refOrchestration,label: 'Publication', icon: '🎼' },
          ].map(({ ref, label, icon }, i, arr) => (
            <button
              key={label}
              onClick={() => ref.current?.scrollIntoView({ behavior: 'instant', block: 'start' })}
              title={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 0.85rem',
                backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.78)',
                border: 'none',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                textAlign: 'left',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ fontSize: '0.8rem' }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}

          {/* ── Séparateur ── */}
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.12)', margin: '0' }} />

          {/* ── Undo / Redo ── */}
          {[
            { label: '↩', title: 'Annuler (⌘Z)',        onClick: handleUndo, enabled: historyIndex > 0 },
            { label: '↪', title: 'Rétablir (⌘⇧Z)',      onClick: handleRedo, enabled: historyIndex < history.length - 1 },
          ].map(({ label, title, onClick, enabled }) => (
            <button
              key={title}
              onClick={onClick}
              disabled={!enabled}
              title={title}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                backgroundColor: 'transparent',
                color: enabled ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: enabled ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (enabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Bouton de déconnexion */}
      <button
        onClick={handleLogout}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          margin: '1rem 2rem',
          alignSelf: 'flex-end',
          maxWidth: '800px',
          width: 'fit-content'
        }}
      >
        Se déconnecter
      </button>
    </div>
  )
}

export default AdminPage
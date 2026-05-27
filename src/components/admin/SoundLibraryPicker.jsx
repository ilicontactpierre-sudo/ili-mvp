/**
 * SoundLibraryPicker.jsx — version mise à jour
 * 
 * Changements par rapport à l'original :
 * - Preview utilise sound.url (URL Supabase) au lieu de /sounds/${filename}
 * - Howl instancié proprement (pas d'import dynamique)
 * - Bouton "Importer des sons" pour ouvrir SoundImporter
 * - Affiche la durée réelle (sound.duration > 0)
 * - Filtre "source" retiré (plus pertinent avec Supabase)
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { Howl } from 'howler'
import SoundImporter from './SoundImporter'
import Fuse from 'fuse.js'

const FAMILIES = [
  { id: 'nature',    label: '🌿 Nature',    boom: ['RAIN','WIND','WATER','NATURE','FIRE','WEATHER','THUNDER','SNOW','ICE'] },
  { id: 'urbain',    label: '🏙 Urbain',    boom: ['CITY','TRAFFIC','CROWD','ROOM','INTERIOR','EXTERIOR','AMBIENCE','SHOP','RESTAURANT','BAR'] },
  { id: 'impact',    label: '⚡ Impact',    boom: ['WEAPON','IMPACT','EXPLOSION','METAL','WOOD','STONE','GLASS','CLOTH','PAPER','HIT','CRASH','BREAK'] },
  { id: 'musique',   label: '🎵 Musique',   boom: ['MUSIC','STING','DRONE','TONE','JINGLE'] },
  { id: 'interface', label: '🖥 Interface', boom: ['USER INTERFACE','MACHINE','VEHICLE','ELECTRONIC','COMPUTER','BUTTON','BEEP','CLICK','NOTIFICATION'] },
  { id: 'voix',      label: '🎭 Voix',      boom: ['VOICE','DIALOGUE','FOLEY','HUMAN','BREATH','FOOTSTEP'] },
]

function SoundLibraryPicker({
  soundLibrary,
  segments,
  segmentIndex,
  column,
  onAddSound,
  onClose,
  adminPassword,
  onSoundsImported,
}) {
  const [search, setSearch] = useState('')
  const [selectedFamily, setSelectedFamily] = useState(null)   // id de famille ou null
  const [activeTags, setActiveTags] = useState([])             // tags sélectionnés (niveau 2)
  const [playingId, setPlayingId] = useState(null)
  const [showImporter, setShowImporter] = useState(false)
  const howlRef = useRef(null)
  const timerRef = useRef(null)

  // Nettoyer le son au démontage
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload() }
    }
  }, [])

  const fuse = useMemo(() => new Fuse(soundLibrary, {
    keys: [
      { name: 'label',       weight: 0.35 },
      { name: 'tags',        weight: 0.25 },
      { name: 'description', weight: 0.20 },
      { name: 'searchString', weight: 0.15 },
      { name: 'boomCategory', weight: 0.05 },
    ],
    threshold: 0.4,      // 0 = exact, 1 = tout accepter — 0.4 est un bon équilibre
    ignoreLocation: true, // cherche dans tout le champ, pas seulement au début
    minMatchCharLength: 2,
  }), [soundLibrary])

  const filteredSounds = useMemo(() => {
    // Appliquer d'abord la recherche floue si texte saisi
    let results = soundLibrary
    if (search.trim()) {
      results = fuse.search(search.trim()).map(r => r.item)
    }

    // Puis appliquer les filtres catégorie / mood / intensité
    return results.filter(sound => {
      if (activeFilters.categories.length > 0) {
        if (!activeFilters.categories.some(c => (sound.categories || []).includes(c))) return false
      }
      if (activeFilters.mood.length > 0) {
        if (!activeFilters.mood.some(m => (sound.mood || []).includes(m))) return false
      }
      if (activeFilters.intensity.length > 0) {
        if (!activeFilters.intensity.includes(sound.intensity)) return false
      }
      return true
    })
  }, [soundLibrary, search, activeFilters, fuse])

  const selectFamily = (familyId) => {
    if (selectedFamily === familyId) {
      setSelectedFamily(null)
      setActiveTags([])
    } else {
      setSelectedFamily(familyId)
      setActiveTags([])
    }
  }

  const toggleTag = (tag) => {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const playSoundPreview = (sound, e) => {
    e.stopPropagation()

    // Arrêter le son en cours
    clearTimeout(timerRef.current)
    if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }

    // Si c'est le même son → juste stop
    if (playingId === sound.id) { setPlayingId(null); return }

    if (!sound.url) {
      console.warn('Son sans URL Supabase :', sound.id)
      return
    }

    const howl = new Howl({
      src: [sound.url],
      html5: true, // streaming — pas de décodage complet pour le preview
      volume: 0.6,
      onloaderror: () => { setPlayingId(null); howlRef.current = null },
      onend: () => { setPlayingId(null); howlRef.current = null },
    })
    howl.play()
    howlRef.current = howl
    setPlayingId(sound.id)

    // Limiter le preview à 8 secondes
    timerRef.current = setTimeout(() => {
      if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
      setPlayingId(null)
    }, 8000)
  }

  const handleAddSound = (sound) => {
    const seg = segments[segmentIndex]
    const effectiveSegmentId = (segmentIndex !== undefined && seg)
      ? (seg.id || seg._id || `seg_${segmentIndex}`)
      : null
    if (!effectiveSegmentId) { console.error('Segment cible introuvable'); return }

    onAddSound({
      soundId: sound.id,
      startSegmentId: effectiveSegmentId,
      endSegmentId: effectiveSegmentId,
      column: column !== undefined ? column : 0,
      volume: 0.5,
      fadeIn: 0,
      fadeOut: 0,
      delay: 0,
      loop: sound.loop || false,
      muted: false,
    })
  }

  const formatDuration = (s) => {
    if (!s || s <= 0) return null
    const m = Math.floor(s / 60)
    const sec = Math.round(s % 60)
    return m > 0 ? `${m}m${sec.toString().padStart(2, '0')}` : `${sec}s`
  }

  return (
    <>
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            padding: '1.5rem',
            maxWidth: '820px',
            width: '92%',
            maxHeight: '88vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#111', fontWeight: 600 }}>
              Bibliothèque sonore
              <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', fontWeight: 400, color: '#999' }}>
                {soundLibrary.length} son{soundLibrary.length > 1 ? 's' : ''}
              </span>
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Bouton import */}
              <button
                onClick={() => setShowImporter(true)}
                style={{
                  padding: '0.4rem 0.9rem',
                  fontSize: '0.8rem',
                  background: '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                + Importer
              </button>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Recherche */}
          <input
            type="text"
            placeholder="Rechercher par nom, tag, ambiance..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '0.65rem 0.9rem',
              fontSize: '0.9rem',
              border: '1.5px solid #e5e5e5',
              borderRadius: '8px',
              marginBottom: '0.75rem',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#5a7af0'}
            onBlur={e => e.target.style.borderColor = '#e5e5e5'}
          />

          {/* Filtres */}
          <div style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
            <FilterRow label="Catégorie" filters={FILTER_CATEGORIES} active={activeFilters.categories} color="#5a7af0" onToggle={v => toggleFilter('categories', v)} />
            <FilterRow label="Ambiance" filters={FILTER_MOOD} active={activeFilters.mood} color="#22a06b" onToggle={v => toggleFilter('mood', v)} />
            <FilterRow label="Intensité" filters={FILTER_INTENSITY} active={activeFilters.intensity} color="#e05c2a" onToggle={v => toggleFilter('intensity', v)} />
          </div>

          {/* Résultats */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '0.75rem', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontSize: '0.8rem', color: '#aaa', margin: '0 0 0.6rem' }}>
              {filteredSounds.length} résultat{filteredSounds.length > 1 ? 's' : ''}
            </p>

            {filteredSounds.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#bbb', padding: '3rem 1rem' }}>
                <p style={{ fontSize: '1rem' }}>Aucun son trouvé</p>
                <p style={{ fontSize: '0.82rem' }}>Ajustez les filtres ou importez de nouveaux sons</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredSounds.slice(0, 50).map(sound => {
                  const isPlaying = playingId === sound.id
                  const dur = formatDuration(sound.duration)
                  return (
                    <div
                      key={sound.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.7rem',
                        borderRadius: '8px',
                        background: isPlaying ? '#f0f4ff' : '#fafafa',
                        border: isPlaying ? '1px solid #c7d3ff' : '1px solid transparent',
                        transition: 'all 0.12s',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.background = '#f5f5f5' }}
                      onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.background = '#fafafa' }}
                    >
                      {/* Play button */}
                      <button
                        onClick={e => playSoundPreview(sound, e)}
                        style={{
                          width: '30px', height: '30px',
                          borderRadius: '50%',
                          background: isPlaying ? '#5a7af0' : '#e8e8e8',
                          color: isPlaying ? '#fff' : '#555',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s',
                        }}
                        title={isPlaying ? 'Arrêter' : 'Écouter'}
                      >
                        {isPlaying ? '■' : '▶'}
                      </button>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 500, fontSize: '0.875rem', color: '#111',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {sound.label}
                        </div>
                        <div style={{
                          fontSize: '0.72rem', color: '#999',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          marginTop: '1px',
                        }}>
                          {[
                            sound.categories?.join(', '),
                            dur,
                            sound.loop ? '🔁 loop' : null,
                            sound.tags?.slice(0, 3).join(', '),
                          ].filter(Boolean).join(' · ')}
                        </div>
                      </div>

                      {/* Ajouter */}
                      <button
                        onClick={() => handleAddSound(sound)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          background: '#111',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#333'}
                        onMouseLeave={e => e.currentTarget.style.background = '#111'}
                      >
                        + Ajouter
                      </button>
                    </div>
                  )
                })}
                {filteredSounds.length > 50 && (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#aaa', padding: '0.75rem' }}>
                    {filteredSounds.length - 50} son{filteredSounds.length - 50 > 1 ? 's' : ''} supplémentaire{filteredSounds.length - 50 > 1 ? 's' : ''} — affinez la recherche
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Importer */}
      {showImporter && (
        <SoundImporter
          adminPassword={adminPassword}
          onSoundsImported={(newSounds) => {
            setShowImporter(false)
            if (onSoundsImported) onSoundsImported(newSounds)
          }}
          onClose={() => setShowImporter(false)}
        />
      )}
    </>
  )
}

function FilterRow({ label, filters, active, color, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.72rem', color: '#bbb', minWidth: '60px', flexShrink: 0 }}>{label}</span>
      {filters.map(f => (
        <button
          key={f}
          onClick={() => onToggle(f)}
          style={{
            padding: '0.2rem 0.6rem',
            fontSize: '0.72rem',
            borderRadius: '999px',
            border: `1px solid ${active.includes(f) ? color : '#e0e0e0'}`,
            background: active.includes(f) ? color : 'transparent',
            color: active.includes(f) ? '#fff' : '#666',
            cursor: 'pointer',
            transition: 'all 0.12s',
            fontWeight: active.includes(f) ? 500 : 400,
          }}
        >
          {f}
        </button>
      ))}
    </div>
  )
}

export default SoundLibraryPicker

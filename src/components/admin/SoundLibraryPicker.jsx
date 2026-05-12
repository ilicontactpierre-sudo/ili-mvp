import { useState, useMemo } from 'react'

// Options de filtres
const FILTER_CATEGORIES = ['Ambiance', 'Musique', 'SFX', 'Dialogue', 'Autre']
const FILTER_MOOD = ['Calme', 'Tension', 'Mélancolie', 'Joie', 'Mystère', 'Action']
const FILTER_INTENSITY = ['Douce', 'Moyenne', 'Forte']

function SoundLibraryPicker({ 
  soundLibrary, 
  segments,
  segmentIndex,
  column,
  onAddSound, 
  onClose 
}) {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    mood: [],
    intensity: []
  })
  const [playingSound, setPlayingSound] = useState(null)

  // Sons filtrés (mémoïsé)
  const filteredSounds = useMemo(() => {
    return soundLibrary.filter(sound => {
      // Filtre recherche texte
      if (search.trim()) {
        const s = search.toLowerCase().trim()
        const matchLabel = (sound.label || '').toLowerCase().includes(s)
        const matchTags = (sound.tags || []).some(t => t.toLowerCase().includes(s))
        const matchMood = (sound.mood || []).some(m => m.toLowerCase().includes(s))
        const matchId = (sound.id || '').toLowerCase().includes(s)
        if (!matchLabel && !matchTags && !matchMood && !matchId) return false
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
  }, [soundLibrary, search, activeFilters])

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
  const playSoundPreview = (sound, e) => {
    e.stopPropagation()
    
    // Arrêter le son en cours
    if (playingSound) {
      playingSound.stop()
      playingSound.unload()
    }

    // Import dynamique de Howl pour éviter les erreurs si pas installé
    import('howler').then(({ Howl }) => {
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
    }).catch(() => {
      console.warn('Howler non disponible pour la prévisualisation')
    })
  }

  // Gérer l'ajout d'un son
  const handleAddSound = (sound) => {
    // Utiliser les props segmentIndex et column pour déterminer la position
    const effectiveSegmentId = (segmentIndex !== undefined && segments[segmentIndex]) 
      ? (segments[segmentIndex].id || segments[segmentIndex]._id || `segment_${segmentIndex}`)
      : null

    if (!effectiveSegmentId) {
      console.error('Impossible de déterminer le segment cible')
      return
    }

    onAddSound({
      soundId: sound.id,
      startSegmentId: effectiveSegmentId,
      endSegmentId: effectiveSegmentId, // Par défaut, même segment
      column: column !== undefined ? column : 0,
      volume: 0.5,
      fadeIn: 0,
      fadeOut: 0,
      delay: 0,
      loop: sound.loop || false,
      muted: false
    })
  }

  return (
    <div 
      style={{
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
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1rem' 
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>
            Bibliothèque sonore
          </h3>
          <button
            onClick={onClose}
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

        {/* Recherche */}
        <input
          type="text"
          placeholder="Rechercher (nom, tags, mood, id)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '0.95rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            marginBottom: '1rem',
            outline: 'none'
          }}
        />

        {/* Filtres */}
        <div style={{ marginBottom: '1rem', overflowY: 'auto', flexShrink: 0 }}>
          {/* Catégories */}
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>
              Catégories :
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {FILTER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleFilter('categories', cat)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: activeFilters.categories.includes(cat) ? '#007bff' : '#e9ecef',
                    color: activeFilters.categories.includes(cat) ? '#fff' : '#333',
                    border: 'none',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>
              Ambiance :
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {FILTER_MOOD.map(mood => (
                <button
                  key={mood}
                  onClick={() => toggleFilter('mood', mood)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: activeFilters.mood.includes(mood) ? '#28a745' : '#e9ecef',
                    color: activeFilters.mood.includes(mood) ? '#fff' : '#333',
                    border: 'none',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          {/* Intensité */}
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>
              Intensité :
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {FILTER_INTENSITY.map(int => (
                <button
                  key={int}
                  onClick={() => toggleFilter('intensity', int)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: activeFilters.intensity.includes(int) ? '#dc3545' : '#e9ecef',
                    color: activeFilters.intensity.includes(int) ? '#fff' : '#333',
                    border: 'none',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {int}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Résultats */}
        <div style={{ 
          borderTop: '1px solid #eee', 
          paddingTop: '0.75rem',
          overflowY: 'auto',
          flex: 1
        }}>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
            {filteredSounds.length} son(s) trouvé(s)
          </p>
          
          {filteredSounds.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#999', 
              padding: '3rem 1rem' 
            }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Aucun son ne correspond</p>
              <p style={{ fontSize: '0.85rem' }}>Essayez d'ajuster les filtres ou la recherche</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredSounds.slice(0, 30).map(sound => (
                <div
                  key={sound.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    backgroundColor: '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                >
                  {/* Bouton play */}
                  <button
                    onClick={(e) => playSoundPreview(sound, e)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.8rem',
                      backgroundColor: playingSound ? '#28a745' : '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      minWidth: '50px'
                    }}
                  >
                    {playingSound ? '⏹' : '▶ 3s'}
                  </button>

                  {/* Info son */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {sound.label}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#666',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {sound.categories?.length > 0 && (
                        <span>{sound.categories.join(', ')} • </span>
                      )}
                      {sound.duration > 0 ? `${sound.duration}s` : 'Durée inconnue'}
                      {sound.loop && ' • 🔁'}
                      {sound.tags?.length > 0 && ` • ${sound.tags.slice(0, 3).join(', ')}`}
                    </div>
                  </div>

                  {/* Bouton ajouter */}
                  <button
                    onClick={() => handleAddSound(sound)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      backgroundColor: '#17a2b8',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + Ajouter
                  </button>
                </div>
              ))}
              
              {filteredSounds.length > 30 && (
                <p style={{ 
                  textAlign: 'center', 
                  color: '#999', 
                  fontSize: '0.8rem', 
                  marginTop: '0.5rem',
                  padding: '0.5rem'
                }}>
                  ... et {filteredSounds.length - 30} autres sons
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SoundLibraryPicker

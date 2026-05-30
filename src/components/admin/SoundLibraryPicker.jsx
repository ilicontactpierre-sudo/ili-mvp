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
  { id: 'nature',     label: '🌿 Nature',      boom: ['NATURE','WATER','BIRDS','ANIMALS','CREATURE','CREATURES','VEGETATION','WEATHER','WIND','RAIN','ROCKS','EXTERIOR'] },
  { id: 'humain',     label: '🧍 Humain',      boom: ['HUMAN','VOICES','PEOPLE','CROWDS','MOVEMENT','SPORTS','GORE','CLOTH','LEATHER','FOOTSTEP'] },
  { id: 'objets',     label: '📦 Objets',      boom: ['OBJECTS','DOORS','METAL','WOOD','GLASS','PLASTIC','PAPER','CHAINS','TOOLS','DRAWERS','FOOD','DRINK','TOYS','GAMES','LEATHER'] },
  { id: 'machines',   label: '⚙️ Machines',    boom: ['MACHINES','MECHANICAL','VEHICLES','AIRCRAFT','TRAINS','ENGINEERING','COMPUTERS','COMMUNICATIONS','GUNS','WEAPONS','HISTORICAL'] },
  { id: 'design',     label: '✨ Design',       boom: ['DESIGNED','SWOOSHES','MAGIC','SCIFI','CARTOON','CINEMATIC','EXPLOSION','USER INTERFACE','INTERFACE'] },
  { id: 'musique',    label: '🎵 Musique',      boom: ['MUSICAL','INSTRUMENTS','CINEMATIC TRAILERS'] },
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
  initialSearch,
}) {
  const [search, setSearch] = useState(initialSearch || '')
  const [selectedFamily, setSelectedFamily] = useState(null)   // id de famille ou null
  const [activeTags, setActiveTags] = useState([])             // tags sélectionnés (niveau 2)
  const [playingId, setPlayingId] = useState(null)
  const [showImporter, setShowImporter] = useState(false)
  const [uploadingId, setUploadingId] = useState(null)
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

  // Sons appartenant à la famille sélectionnée
const familySounds = useMemo(() => {
  if (!selectedFamily) return soundLibrary
  const family = FAMILIES.find(f => f.id === selectedFamily)
  if (!family) return soundLibrary
  return soundLibrary.filter(sound => {
    const bc = (sound.boomCategory || '').toUpperCase()
    return family.boom.some(b => bc.includes(b))
  })
}, [soundLibrary, selectedFamily])

// Tags les plus fréquents dans la famille (pour le niveau 2)
const familyTags = useMemo(() => {
  const freq = {}
  familySounds.forEach(sound => {
    ;(sound.tags || []).forEach(tag => {
      if (tag.length > 2) freq[tag] = (freq[tag] || 0) + 1
    })
  })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([tag]) => tag)
}, [familySounds])

const filteredSounds = useMemo(() => {
  // Base : sons de la famille (ou tous si pas de famille)
  let results = familySounds

  // Recherche floue sur cette base
  if (search.trim()) {
    const localFuse = new Fuse(results, {
      keys: [
        { name: 'label',        weight: 0.35 },
        { name: 'tags',         weight: 0.25 },
        { name: 'description',  weight: 0.20 },
        { name: 'searchString', weight: 0.15 },
        { name: 'boomCategory', weight: 0.05 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    })
    results = localFuse.search(search.trim()).map(r => r.item)
  }

  // Filtre par tags sélectionnés
  if (activeTags.length > 0) {
    results = results.filter(sound =>
      activeTags.every(tag => (sound.tags || []).includes(tag))
    )
  }

  return results
}, [familySounds, search, activeTags])

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

const fileInputRef = useRef(null)
  const pendingUploadSound = useRef(null)

  const handleUploadSound = (sound) => {
    if (!adminPassword) {
      alert('Mot de passe admin requis pour uploader')
      return
    }
    pendingUploadSound.current = sound
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sound = pendingUploadSound.current
    if (!sound) return
    e.target.value = '' // reset pour permettre de resélectionner le même fichier

    setUploadingId(sound.id)
    try {
      const formData = new FormData()
      formData.append('file', file, sound.filename || `${sound.id}.mp3`)
      formData.append('password', adminPassword)
      formData.append('filename', sound.filename || `${sound.id}.mp3`)

      const uploadRes = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) {
        const text = await uploadRes.text()
        throw new Error(`Upload échoué (${uploadRes.status}) : ${text.slice(0, 200)}`)
      }
      const { publicUrl } = await uploadRes.json()

      const saveRes = await fetch('/api/upload-sound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          soundEntry: { ...sound, url: publicUrl },
        }),
      })
      if (!saveRes.ok) throw new Error('Mise à jour index échouée')

      if (onSoundsImported) onSoundsImported([{ ...sound, url: publicUrl }])
      alert(`✅ "${sound.label}" uploadé !`)
    } catch (err) {
      alert(`❌ Erreur : ${err.message}`)
    } finally {
      setUploadingId(null)
      pendingUploadSound.current = null
    }
  }

  const playSoundPreview = (sound, e) => {
    e.stopPropagation()

    clearTimeout(timerRef.current)
    if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }

    if (playingId === sound.id) { setPlayingId(null); return }

    let src = null
    let format = undefined
    if (sound.url) {
      src = sound.url
    } else if (sound.localPath) {
      src = `/api/preview-sound?path=${encodeURIComponent(sound.localPath)}`
      // Déduire le format depuis l'extension du fichier original
      const ext = sound.localPath.split('.').pop().toLowerCase()
      format = ext === 'aif' ? ['aiff'] : [ext]
    }

    if (!src) {
      console.warn('Son sans URL ni localPath :', sound.id)
      return
    }

    const howl = new Howl({
      src: [src],
      ...(format && { format }),
      html5: true,
      volume: 0.6,
      onloaderror: () => { setPlayingId(null); howlRef.current = null },
      onend: () => { setPlayingId(null); howlRef.current = null },
    })
    howl.play()
    howlRef.current = howl
    setPlayingId(sound.id)

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

  const hasMissingUrl = !sound.url

  if (hasMissingUrl) {
    const confirmAdd = window.confirm(
      `⚠️ "${sound.label}" n'a pas encore été uploadé sur Supabase.\n\nVoulez-vous quand même créer un bloc son (grisé) pour réserver l'emplacement ?\n\nVous pourrez uploader le fichier plus tard.`
    )
    if (!confirmAdd) return
  }

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
    muted: hasMissingUrl ? true : false,
    broken: hasMissingUrl,
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.aif,.aiff,.flac"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
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

            {/* Niveau 1 — Familles */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
              {FAMILIES.map(family => (
                <button
                  key={family.id}
                  onClick={() => selectFamily(family.id)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.78rem',
                    borderRadius: '999px',
                    border: `1px solid ${selectedFamily === family.id ? '#5a7af0' : '#e0e0e0'}`,
                    background: selectedFamily === family.id ? '#5a7af0' : 'transparent',
                    color: selectedFamily === family.id ? '#fff' : '#555',
                    cursor: 'pointer',
                    fontWeight: selectedFamily === family.id ? 600 : 400,
                    transition: 'all 0.12s',
                  }}
                >
                  {family.label}
                </button>
              ))}
            </div>

            {/* Niveau 2 — Tags contextuels (apparaît seulement si une famille est sélectionnée) */}
            {selectedFamily && familyTags.length > 0 && (
              <div style={{
                padding: '0.5rem 0.65rem',
                background: 'rgba(90,122,240,0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(90,122,240,0.15)',
              }}>
                <div style={{ fontSize: '0.68rem', color: '#aaa', marginBottom: '0.4rem' }}>
                  Tags dans cette catégorie
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {familyTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '0.18rem 0.55rem',
                        fontSize: '0.72rem',
                        borderRadius: '999px',
                        border: `1px solid ${activeTags.includes(tag) ? '#22a06b' : '#ddd'}`,
                        background: activeTags.includes(tag) ? '#22a06b' : 'transparent',
                        color: activeTags.includes(tag) ? '#fff' : '#666',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

                      {/* Ajouter / Upload */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                        {!sound.url && sound.localPath && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUploadSound(sound) }}
                            disabled={uploadingId === sound.id}
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              background: uploadingId === sound.id ? '#888' : '#e05c2a',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: uploadingId === sound.id ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {uploadingId === sound.id ? '⏳' : '↑ Upload'}
                          </button>
                        )}
                        <button
                          onClick={() => handleAddSound(sound)}
                          title={!sound.url ? 'Son non uploadé — le bloc sera grisé' : ''}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                            fontWeight: 500,
                            background: sound.url ? '#111' : '#888',
                            color: '#fff',
                            border: sound.url ? 'none' : '1px dashed #ccc',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background 0.12s',
                            opacity: sound.url ? 1 : 0.7,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = sound.url ? '#333' : '#666' }}
                          onMouseLeave={e => { e.currentTarget.style.background = sound.url ? '#111' : '#888' }}
                        >
                          {sound.url ? '+ Ajouter' : '+ Ajouter (⚠️)'}
                        </button>
                      </div>
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


export default SoundLibraryPicker

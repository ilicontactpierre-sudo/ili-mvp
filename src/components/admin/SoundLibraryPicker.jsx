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
import { createPortal } from 'react-dom'
import { Howl } from 'howler'
import SoundImporter from './SoundImporter'
import Fuse from 'fuse.js'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

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
  const [selectedFamily, setSelectedFamily] = useState(null)
  const [activeTags, setActiveTags] = useState([])
  const [playingId, setPlayingId] = useState(null)
  const [showImporter, setShowImporter] = useState(false)
  const [uploadingId, setUploadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [onlyUploaded, setOnlyUploaded] = useState(false)
  // URLs uploadées pendant cette session (pour mettre à jour l'UI sans attendre le re-render parent)
  const [localSoundOverrides, setLocalSoundOverrides] = useState({})
  const howlRef = useRef(null)
  const timerRef = useRef(null)
  const ffmpegRef = useRef(null)
  const ffmpegLoadedRef = useRef(false)

  // Nettoyer le son au démontage
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload() }
    }
  }, [])

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
  let results = familySounds
  if (search.trim()) {

    // Mots de contexte "ambiance" — modifient le scoring durée
    const AMBIENCE_TRIGGERS = [
      'ambiance', 'ambience', 'ambient', 'atmosphere', 'atmosphère',
      'fond', 'background', 'bruit de fond', 'room', 'room tone'
    ]

    // Découpe sur virgules ET espaces
    const rawTerms = search.trim().toLowerCase().split(/[\s,]+/).filter(Boolean)
    const isAmbienceSearch = rawTerms.some(t => AMBIENCE_TRIGGERS.includes(t))

    const scored = results.map(sound => {
      const label        = (sound.label || '').toLowerCase()
      const labelWords   = label.split(/[\s_\-]+/)
      const tags         = (sound.tags || []).map(t => t.toLowerCase())
      const searchStr    = (sound.searchString || '').toLowerCase()
      const description  = (sound.description || '').toLowerCase()
      const boomCat      = ((sound.boomCategory || '') + ' ' + (sound.boomSubcategory || '')).toLowerCase()

      let score = 0

      rawTerms.forEach(term => {
        // Tags — champ le plus intentionnel
        if (tags.some(tag => tag === term))          score += 6  // exact
        if (tags.some(tag => tag.includes(term)))    score += 5  // partiel

        // Label — descriptif et universel
        if (labelWords.some(w => w === term))        score += 4  // exact sur un mot
        if (label.includes(term))                    score += 3  // partiel

        // SearchString — synonymes FR/EN
        if (searchStr.includes(term))                score += 3

        // Description — phrase naturelle
        if (description.includes(term))              score += 2

        // BoomCategory — catégorie large
        if (boomCat.includes(term))                  score += 1
      })

      // Multiplicateur de couverture : récompense les sons qui matchent
      // beaucoup de termes différents (plutôt qu'un seul terme répété)
      const termsCovered = rawTerms.filter(term =>
        tags.some(t => t.includes(term)) ||
        label.includes(term) ||
        searchStr.includes(term) ||
        description.includes(term) ||
        boomCat.includes(term)
      ).length
      const coverageRatio = rawTerms.length > 0 ? termsCovered / rawTerms.length : 0
      // Multiplicateur entre 0.4 (0 terme couvert) et 1.0 (tous couverts)
      score *= (0.4 + coverageRatio * 0.6)

      // Bonus/pénalité durée si recherche "ambiance" détectée
      if (isAmbienceSearch) {
        const dur = sound.duration || 0
        if (dur > 60)      score += 8
        else if (dur > 30) score += 5
        else if (dur > 10) score += 3
        else if (dur > 5)  score += 1
        else               score -= 3
      }

      return { sound, score }
    })

    results = scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ sound }) => sound)
  }

  if (activeTags.length > 0) {
    results = results.filter(sound =>
      activeTags.every(tag => (sound.tags || []).includes(tag))
    )
  }

  if (onlyUploaded) {
    results = results.filter(sound => !!sound.url)
  }

  return results
}, [familySounds, search, activeTags, onlyUploaded])

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
    // Copier le nom du fichier dans le presse-papier pour faciliter la recherche
    if (sound.localPath) {
      const filename = sound.localPath.split('/').pop().split('\\').pop()
      navigator.clipboard.writeText(filename).catch(() => {})
    }
    fileInputRef.current?.click()
  }

const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sound = pendingUploadSound.current
    if (!sound) return
    e.target.value = ''
    setUploadingId(sound.id)
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

      // 1. Compression MP3 via FFmpeg WASM
      if (!ffmpegRef.current) ffmpegRef.current = new FFmpeg()
      const ffmpeg = ffmpegRef.current

      if (!ffmpegLoadedRef.current) {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })
        ffmpegLoadedRef.current = true
      }

      const inputExt = file.name.split('.').pop().toLowerCase()
      const inputName = `input.${inputExt}`
      const outputName = `${sound.id}.mp3`

      await ffmpeg.writeFile(inputName, await fetchFile(file))
      await ffmpeg.exec([
        '-i', inputName,
        '-codec:a', 'libmp3lame',
        '-qscale:a', '4',   // qualité VBR ~165 kbps, bon compromis taille/qualité
        '-ar', '44100',
        outputName
      ])
      const mp3Data = await ffmpeg.readFile(outputName)
      const mp3Blob = new Blob([mp3Data.buffer], { type: 'audio/mpeg' })

      // 2. Demander une URL signée à Vercel (payload minuscule — juste le nom de fichier)
      const signedRes = await fetch('/api/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, filename: outputName }),
      })
      if (!signedRes.ok) {
        const text = await signedRes.text()
        throw new Error(`URL signée échouée (${signedRes.status}) : ${text.slice(0, 200)}`)
      }
      const { signedUrl, publicUrl } = await signedRes.json()

      // 3. Upload binaire direct vers Supabase — Vercel ne voit plus le fichier
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: mp3Blob,
      })
      if (!uploadRes.ok) {
        const text = await uploadRes.text()
        throw new Error(`Upload Supabase échoué (${uploadRes.status}) : ${text.slice(0, 200)}`)
      }

// 4. URL publique retournée par get-upload-url
      // 5. Enregistrer dans la table Supabase
      const saveRes = await fetch('/api/upload-sound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          soundEntry: { ...sound, url: publicUrl },
        }),
      })
      if (!saveRes.ok) {
        const err = await saveRes.json()
        throw new Error(`Mise à jour index échouée : ${err.error || saveRes.status}`)
      }

      const updatedSound = { ...sound, url: publicUrl }
      // Mettre à jour la soundLibrary locale du picker immédiatement
      // (la prop soundLibrary ne sera pas re-rendue tant que le picker est ouvert)
      setLocalSoundOverrides(prev => ({ ...prev, [sound.id]: publicUrl }))
      // Notifier le parent pour créer/dé-griser le track
      if (onSoundsImported) onSoundsImported([updatedSound])
      alert(`✅ "${sound.label}" uploadé et ajouté au bloc !`)
    } catch (err) {
      alert(`❌ Erreur : ${err.message}`)
    } finally {
      setUploadingId(null)
      pendingUploadSound.current = null
    }
  }

  const handleDeleteSound = async (sound, e) => {
    e.stopPropagation()
    if (!adminPassword) { alert('Mot de passe admin requis'); return }
    if (!window.confirm(`Supprimer "${sound.label}" de Supabase ?\n\nLe fichier audio et son entrée seront définitivement supprimés.`)) return
    setDeletingId(sound.id)
    try {
      const res = await fetch('/api/delete-sound', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          soundId: sound.id,
          filename: `${sound.id}.mp3`,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || res.status)
      }
      // Mettre à jour l'UI : retirer l'URL localement
      setLocalSoundOverrides(prev => {
        const next = { ...prev }
        delete next[sound.id]
        return next
      })
      if (onSoundsImported) onSoundsImported([{ ...sound, url: null }])
      alert(`✅ "${sound.label}" supprimé de Supabase.`)
    } catch (err) {
      alert(`❌ Erreur : ${err.message}`)
    } finally {
      setDeletingId(null)
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
  // sound.url est prioritaire (cas upload immédiat), sinon vérifier dans soundLibrary
  const librarySound = soundLibrary.find(s => s.id === sound.id) || sound
  const freshSound = enrichSound(librarySound)
  const hasMissingUrl = !freshSound.url

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

  // Fusionner la soundLibrary prop avec les URLs uploadées localement
  const getSoundUrl = (soundId) => localSoundOverrides[soundId] || null
  const enrichSound = (sound) => {
    const localUrl = getSoundUrl(sound.id)
    return localUrl ? { ...sound, url: localUrl } : sound
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
          zIndex: 2000,
        }}
        onClick={onClose}
      >
        <div
          data-sound-picker="true"
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
                onClick={(e) => { e.stopPropagation(); console.log('Importer cliqué, showImporter avant:', showImporter); setShowImporter(true); console.log('setShowImporter(true) appelé') }}
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

            {/* Niveau 1 — Familles + filtre Supabase */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem', alignItems: 'center' }}>
              <button
                onClick={() => setOnlyUploaded(prev => !prev)}
                title={onlyUploaded ? 'Afficher tous les sons' : 'Afficher uniquement les sons uploadés sur Supabase'}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '999px',
                  border: `1px solid ${onlyUploaded ? '#22a06b' : '#e0e0e0'}`,
                  background: onlyUploaded ? '#22a06b' : 'transparent',
                  color: onlyUploaded ? '#fff' : '#888',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  flexShrink: 0,
                  transition: 'all 0.12s',
                }}
              >
                ☁️
              </button>
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
                {filteredSounds.slice(0, 50).map(rawSound => {
                  const sound = enrichSound(rawSound)
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
                      {(() => {
                        const canPreview = !!sound.url || import.meta.env.DEV
                        return (
                          <button
                            onClick={e => canPreview ? playSoundPreview(sound, e) : e.stopPropagation()}
                            disabled={!canPreview}
                            style={{
                              width: '30px', height: '30px',
                              borderRadius: '50%',
                              background: !canPreview ? '#f0f0f0' : isPlaying ? '#5a7af0' : '#e8e8e8',
                              color: !canPreview ? '#ccc' : isPlaying ? '#fff' : '#555',
                              border: 'none',
                              cursor: canPreview ? 'pointer' : 'not-allowed',
                              fontSize: '0.7rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s',
                            }}
                            title={!canPreview ? 'Prévisualisation indisponible en ligne — uploadez le son sur Supabase pour l\'écouter' : isPlaying ? 'Arrêter' : 'Écouter'}
                          >
                            {!canPreview ? '—' : isPlaying ? '■' : '▶'}
                          </button>
                        )
                      })()}

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
                        {sound.url && (
                          <button
                            onClick={(e) => handleDeleteSound(sound, e)}
                            disabled={deletingId === sound.id}
                            title="Supprimer de Supabase"
                            style={{
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.78rem',
                              background: 'transparent',
                              color: '#dc3545',
                              border: '1px solid #dc354560',
                              borderRadius: '6px',
                              cursor: deletingId === sound.id ? 'not-allowed' : 'pointer',
                              transition: 'all 0.12s',
                              opacity: deletingId === sound.id ? 0.5 : 1,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dc354515' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          >
                            {deletingId === sound.id ? '⏳' : '🗑'}
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
      {showImporter && createPortal(
        <SoundImporter
          adminPassword={adminPassword}
          onSoundsImported={(newSounds) => {
            setShowImporter(false)
            if (onSoundsImported) onSoundsImported(newSounds)
          }}
          onClose={() => setShowImporter(false)}
        />,
        document.body
      )}
    </>
  )
}


export default SoundLibraryPicker

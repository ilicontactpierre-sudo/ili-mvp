/**
 * SoundImporter.jsx
 * 
 * Permet d'importer des sons depuis le disque dur (Boom Library, etc.)
 * Pipeline : fichier local → décodage Web Audio → compression MP3 → upload Supabase → index GitHub
 * 
 * Dépendances à installer :
 *   npm install @supabase/supabase-js lamejs
 */

import { useState, useRef, useCallback } from 'react'

const BITRATE = 128 // kbps — bon compromis qualité/poids pour ambiances stéréo
const MAX_FILE_SIZE_MB = 150

// Suggestions de tags à partir du nom de fichier
function suggestTagsFromFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, '').toLowerCase()
  const words = base.split(/[\s_\-–]+/).filter(w => w.length > 2)
  const KNOWN_TAGS = {
    rain: ['pluie', 'orage', 'humide'],
    wind: ['vent', 'brise', 'tempête'],
    fire: ['feu', 'flamme', 'chaleur', 'crépitement'],
    forest: ['forêt', 'nature', 'arbres', 'oiseaux'],
    city: ['ville', 'urbain', 'trafic', 'rue'],
    night: ['nuit', 'nocturne', 'silence'],
    clock: ['horloge', 'tic-tac', 'temps', 'minuterie'],
    water: ['eau', 'rivière', 'océan', 'vague'],
    crowd: ['foule', 'murmure', 'ambiance', 'gens'],
    tension: ['tension', 'suspense', 'danger', 'angoisse'],
    ambient: ['ambiance', 'atmosphère', 'fond'],
    sweep: ['transition', 'whoosh', 'mouvement'],
    drone: ['bourdon', 'tension', 'continu'],
    hit: ['impact', 'choc', 'coup'],
  }
  const tags = new Set()
  words.forEach(word => {
    Object.entries(KNOWN_TAGS).forEach(([key, values]) => {
      if (word.includes(key)) values.forEach(v => tags.add(v))
    })
    if (word.length > 3) tags.add(word)
  })
  return [...tags].slice(0, 10)
}

// Génère un slug propre depuis le nom de fichier
function slugify(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .slice(0, 80)
}

// Encode un AudioBuffer stéréo en MP3 via lamejs (chargé dynamiquement)
async function encodeToMp3(audioBuffer, bitrate = BITRATE) {
  const { Mp3Encoder } = await import('lamejs')
  const sampleRate = audioBuffer.sampleRate
  const channels = Math.min(audioBuffer.numberOfChannels, 2)
  const encoder = new Mp3Encoder(channels, sampleRate, bitrate)

  const BLOCK = 1152
  const left = audioBuffer.getChannelData(0)
  const right = channels === 2 ? audioBuffer.getChannelData(1) : left

  // Convertir Float32 → Int16
  const toInt16 = (float32) => {
    const int16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16
  }

  const leftInt16 = toInt16(left)
  const rightInt16 = toInt16(right)

  const mp3Chunks = []
  for (let i = 0; i < leftInt16.length; i += BLOCK) {
    const leftChunk = leftInt16.subarray(i, i + BLOCK)
    const rightChunk = rightInt16.subarray(i, i + BLOCK)
    const encoded = channels === 2
      ? encoder.encodeBuffer(leftChunk, rightChunk)
      : encoder.encodeBuffer(leftChunk)
    if (encoded.length > 0) mp3Chunks.push(new Uint8Array(encoded))
  }

  const flushed = encoder.flush()
  if (flushed.length > 0) mp3Chunks.push(new Uint8Array(flushed))

  const totalLength = mp3Chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const mp3Buffer = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of mp3Chunks) {
    mp3Buffer.set(chunk, offset)
    offset += chunk.length
  }

  return mp3Buffer
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

function SoundImporter({ adminPassword, onSoundsImported, onClose }) {
  console.log('🎵 SoundImporter rendu')
  const [files, setFiles] = useState([])  
  const [isDragging, setIsDragging] = useState(false)
  const [globalStatus, setGlobalStatus] = useState('idle') // idle | processing | done
  const inputRef = useRef(null)
  const abortRef = useRef(false)

  const addFiles = useCallback((newFiles) => {
    const audioFiles = [...newFiles].filter(f =>
      f.type.startsWith('audio/') ||
      /\.(wav|mp3|aif|aiff|flac|ogg|m4a)$/i.test(f.name)
    )
    if (audioFiles.length === 0) return
    setFiles(prev => [
      ...prev,
      ...audioFiles.map(file => ({
        file,
        status: 'pending', // pending | processing | done | error
        progress: 0,
        result: null,
        error: null,
        meta: {
          label: file.name.replace(/\.[^.]+$/, '').replace(/[_\-]/g, ' '),
          tags: suggestTagsFromFilename(file.name),
          categories: [],
          intensity: 'moyenne',
        },
      }))
    ])
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const processFile = async (fileEntry, index, updateEntry) => {
    const { file } = fileEntry

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(`Fichier trop volumineux (max ${MAX_FILE_SIZE_MB}MB)`)
    }

    updateEntry(index, { status: 'processing', progress: 5 })

    // 1. Lire le fichier
    const arrayBuffer = await file.arrayBuffer()
    if (abortRef.current) throw new Error('Annulé')
    updateEntry(index, { progress: 15 })

    // 2. Décoder via Web Audio API
    const audioCtx = new AudioContext()
    let audioBuffer
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    } finally {
      audioCtx.close()
    }
    if (abortRef.current) throw new Error('Annulé')

    const duration = Math.round(audioBuffer.duration * 10) / 10
    const channels = audioBuffer.numberOfChannels
    updateEntry(index, { progress: 25, meta: { ...fileEntry.meta, duration } })

    // 3. Encoder en MP3 (si pas déjà MP3, ou si WAV/AIFF)
    let mp3Buffer
    const isAlreadyMp3 = /\.mp3$/i.test(file.name)
    if (isAlreadyMp3) {
      // Relire le fichier (arrayBuffer est détaché après decodeAudioData)
      const freshBuffer = await file.arrayBuffer()
      mp3Buffer = new Uint8Array(freshBuffer)
    } else {
      updateEntry(index, { progress: 30 })
      mp3Buffer = await encodeToMp3(audioBuffer, BITRATE)
    }
    if (abortRef.current) throw new Error('Annulé')
    updateEntry(index, { progress: 65 })

    // 4. Générer un nom de fichier propre
    const slug = slugify(file.name)
    const filename = `${slug}.mp3`

    // 5. Demander une URL signée à Vercel, puis upload binaire direct vers Supabase
    const blob = new Blob([mp3Buffer], { type: 'audio/mpeg' })

    const signedRes = await fetch('/api/get-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, filename }),
    })
    if (!signedRes.ok) {
      const signedErr = await signedRes.json()
      throw new Error(`URL signée : ${signedErr.error}`)
    }
    const { signedUrl, publicUrl } = await signedRes.json()

    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mpeg' },
      body: blob,
    })
    if (!uploadRes.ok) {
      const text = await uploadRes.text()
      throw new Error(`Upload Supabase : ${uploadRes.status} — ${text.slice(0, 200)}`)
    }
    if (abortRef.current) throw new Error('Annulé')
    updateEntry(index, { progress: 85 })

    // 7. Construire l'entrée sounds-index
    const soundEntry = {
      id: slug,
      filename,
      relativePath: filename,
      url: publicUrl,
      label: fileEntry.meta.label,
      categories: fileEntry.meta.categories || [],
      tags: fileEntry.meta.tags || [],
      mood: [],
      loop: false,
      duration,
      intensity: fileEntry.meta.intensity || 'moyenne',
      tempo: 'moyen',
      channels,
      bitrate: BITRATE,
      importedAt: new Date().toISOString(),
    }

    // 8. Enregistrer dans GitHub via la Vercel Function
    const saveRes = await fetch('/api/upload-sound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, soundEntry }),
    })
    if (!saveRes.ok) {
      const err = await saveRes.json()
      throw new Error(`GitHub index : ${err.error}`)
    }
    updateEntry(index, { progress: 100 })

    return soundEntry
  }

  const startImport = async () => {
    const pending = files.filter(f => f.status === 'pending')
    if (pending.length === 0) return
    abortRef.current = false
    setGlobalStatus('processing')

    const updateEntry = (index, patch) => {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, ...patch } : f))
    }

    const importedSounds = []

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue
      if (abortRef.current) break
      try {
        const result = await processFile(files[i], i, updateEntry)
        updateEntry(i, { status: 'done', result, progress: 100 })
        importedSounds.push(result)
      } catch (err) {
        updateEntry(i, { status: 'error', error: err.message, progress: 0 })
      }
    }

    setGlobalStatus('done')
    if (importedSounds.length > 0 && onSoundsImported) {
      onSoundsImported(importedSounds)
    }
  }

  const updateMeta = (index, field, value) => {
    setFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, meta: { ...f.meta, [field]: value } } : f
    ))
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const doneCount = files.filter(f => f.status === 'done').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem',
    }}
      onClick={globalStatus === 'processing' ? undefined : onClose}
    >
      <div
        style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e0e0e0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #1e1e1e',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
              Importer des sons
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#666' }}>
              WAV, AIFF, MP3, FLAC → compressé en MP3 128kbps stéréo → Supabase
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={globalStatus === 'processing'}
            style={{ background: 'none', border: 'none', color: '#666', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          style={{
            margin: '1rem 1.5rem',
            border: `2px dashed ${isDragging ? '#5a7af0' : '#2a2a2a'}`,
            borderRadius: '10px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? 'rgba(90,122,240,0.08)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#888' }}>
            Glisse tes fichiers ici ou <span style={{ color: '#5a7af0' }}>parcourir</span>
          </p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#555' }}>
            WAV · AIFF · MP3 · FLAC · max {MAX_FILE_SIZE_MB}MB par fichier
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => addFiles(e.target.files)}
          />
        </div>

        {/* Liste des fichiers */}
        {files.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem' }}>
            {files.map((entry, i) => (
              <FileRow
                key={`${entry.file.name}-${i}`}
                entry={entry}
                onRemove={() => removeFile(i)}
                onUpdateLabel={v => updateMeta(i, 'label', v)}
                onUpdateTags={v => updateMeta(i, 'tags', v)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #1e1e1e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {globalStatus === 'done'
              ? `✅ ${doneCount} importé${doneCount > 1 ? 's' : ''}${errorCount > 0 ? ` · ❌ ${errorCount} erreur${errorCount > 1 ? 's' : ''}` : ''}`
              : `${files.length} fichier${files.length > 1 ? 's' : ''} sélectionné${files.length > 1 ? 's' : ''}`}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {globalStatus === 'done' ? (
              <button onClick={onClose} style={btnStyle('#5a7af0')}>
                Fermer
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={globalStatus === 'processing'}
                  style={btnStyle('#333', true)}
                >
                  Annuler
                </button>
                <button
                  onClick={startImport}
                  disabled={pendingCount === 0 || globalStatus === 'processing'}
                  style={btnStyle('#5a7af0', false, pendingCount === 0 || globalStatus === 'processing')}
                >
                  {globalStatus === 'processing'
                    ? 'Import en cours...'
                    : `Importer ${pendingCount > 0 ? pendingCount : ''} son${pendingCount > 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FileRow({ entry, onRemove, onUpdateLabel, onUpdateTags }) {
  const { file, status, progress, result, error, meta } = entry
  const sizeMB = (file.size / 1024 / 1024).toFixed(1)

  const statusColor = {
    pending: '#666',
    processing: '#5a7af0',
    done: '#22c55e',
    error: '#ef4444',
  }[status]

  const statusLabel = {
    pending: 'En attente',
    processing: `${progress}%`,
    done: result ? `✅ ${result.duration}s — ${(file.size / 1024 / 1024).toFixed(1)}MB` : '✅',
    error: `❌ ${error}`,
  }[status]

  return (
    <div style={{
      padding: '0.75rem 0',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* Icône statut */}
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: statusColor,
          marginTop: '6px', flexShrink: 0,
        }} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Nom fichier original */}
          <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '0.3rem', fontFamily: 'monospace' }}>
            {file.name} · {sizeMB}MB
          </div>

          {/* Label éditable */}
          {status === 'pending' && (
            <input
              type="text"
              value={meta.label}
              onChange={e => onUpdateLabel(e.target.value)}
              placeholder="Label du son"
              style={{
                width: '100%',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '5px',
                color: '#e0e0e0',
                fontSize: '0.85rem',
                padding: '0.3rem 0.5rem',
                marginBottom: '0.3rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Tags éditables */}
          {status === 'pending' && (
            <input
              type="text"
              value={meta.tags.join(', ')}
              onChange={e => onUpdateTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              placeholder="tags séparés par des virgules"
              style={{
                width: '100%',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '5px',
                color: '#888',
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Barre de progression */}
          {status === 'processing' && (
            <div style={{
              height: '3px', background: '#1e1e1e', borderRadius: '2px', overflow: 'hidden', marginTop: '0.4rem',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: '#5a7af0',
                transition: 'width 0.3s ease',
                borderRadius: '2px',
              }} />
            </div>
          )}

          {/* Statut */}
          <div style={{ fontSize: '0.72rem', color: statusColor, marginTop: '0.25rem' }}>
            {statusLabel}
          </div>
        </div>

        {/* Bouton supprimer */}
        {status === 'pending' && (
          <button
            onClick={onRemove}
            style={{
              background: 'none', border: 'none',
              color: '#444', cursor: 'pointer',
              fontSize: '1rem', padding: '0.1rem 0.25rem',
              flexShrink: 0,
            }}
            title="Retirer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

function btnStyle(bg, ghost = false, disabled = false) {
  return {
    padding: '0.5rem 1.1rem',
    fontSize: '0.85rem',
    fontWeight: 500,
    borderRadius: '7px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: ghost ? '1px solid #2a2a2a' : 'none',
    background: ghost ? 'transparent' : bg,
    color: ghost ? '#888' : '#fff',
    opacity: disabled ? 0.4 : 1,
    transition: 'opacity 0.15s',
  }
}

export default SoundImporter

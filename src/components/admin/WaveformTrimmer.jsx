/**
 * WaveformTrimmer.jsx
 * Éditeur de points d'entrée/sortie audio avec waveform visuelle.
 * 
 * Props :
 *   sound        — objet son (url, localPath, label, duration)
 *   initialStart — trimStart initial en ms (défaut 0)
 *   initialEnd   — trimEnd initial en ms (défaut = durée totale)
 *   onConfirm    — callback({ trimStart, trimEnd }) en ms
 *   onClose      — fermer sans sauvegarder
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Howl } from 'howler'

const TRACK_HEIGHT = 80      // hauteur de la waveform en px
const HANDLE_WIDTH = 14      // largeur des poignées en px
const COLOR_WAVE_BG  = '#d0d7f0'   // zone hors sélection
const COLOR_WAVE_SEL = '#5a7af0'   // zone sélectionnée
const COLOR_START    = '#22c55e'   // poignée verte
const COLOR_END      = '#ef4444'   // poignée rouge

export default function WaveformTrimmer({ sound, initialStart = 0, initialEnd, onConfirm, onClose }) {
  const canvasRef   = useRef(null)
  const containerRef = useRef(null)
  const howlRef     = useRef(null)
  const animRef     = useRef(null)
  const dragging    = useRef(null)   // 'start' | 'end' | null

const [realDurationMs, setRealDurationMs] = useState((sound.duration || 0) * 1000)
  const durationMs = realDurationMs
  const [trimStart, setTrimStart] = useState(initialStart)
  const [trimEnd,   setTrimEnd]   = useState(initialEnd ?? realDurationMs)
  const [peaks,     setPeaks]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [playhead,  setPlayhead]  = useState(null)   // position ms pendant preview
  const [isPreviewing, setIsPreviewing] = useState(false)

  // ── Charger et décoder l'audio pour extraire les peaks ──────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const src = sound.url
          || (sound.localPath
              ? `/api/preview-sound?path=${encodeURIComponent(sound.localPath)}`
              : null)
        if (!src) throw new Error('Aucune source audio')

        const res = await fetch(src)
        if (!res.ok) throw new Error(`Erreur réseau : ${res.status}`)
        const arrayBuffer = await res.arrayBuffer()

        const audioCtx = new AudioContext()
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        audioCtx.close()

        if (cancelled) return

        // Moyenner les canaux et sous-échantillonner en N points
        const N = 600
        const data = audioBuffer.getChannelData(0)
        const step = Math.floor(data.length / N)
        const peaks = new Float32Array(N)
        let max = 0
        for (let i = 0; i < N; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0)
          peaks[i] = sum / step
          if (peaks[i] > max) max = peaks[i]
        }
        // Normaliser
        if (max > 0) for (let i = 0; i < N; i++) peaks[i] /= max

        setPeaks(peaks)
        setLoading(false)
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [sound])

  // ── Dessiner la waveform ─────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks) return
    const W = canvas.width
    const H = canvas.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const startX = (trimStart / durationMs) * W
    const endX   = (trimEnd   / durationMs) * W
    const playX  = playhead !== null ? (playhead / durationMs) * W : null

    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * W
      const h = peaks[i] * H * 0.9
      const inSel = x >= startX && x <= endX
      ctx.fillStyle = inSel ? COLOR_WAVE_SEL : COLOR_WAVE_BG
      ctx.fillRect(x, (H - h) / 2, Math.max(1.5, W / peaks.length - 0.5), h)
    }

    // Overlay hors sélection (assombrir)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    if (startX > 0)  ctx.fillRect(0, 0, startX, H)
    if (endX < W)    ctx.fillRect(endX, 0, W - endX, H)

    // Lignes de trim
    ctx.strokeStyle = COLOR_START; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, H); ctx.stroke()
    ctx.strokeStyle = COLOR_END
    ctx.beginPath(); ctx.moveTo(endX, 0); ctx.lineTo(endX, H); ctx.stroke()

    // Playhead
    if (playX !== null) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.beginPath(); ctx.moveTo(playX, 0); ctx.lineTo(playX, H); ctx.stroke()
      ctx.setLineDash([])
    }
  }, [peaks, trimStart, trimEnd, durationMs, playhead])

  useEffect(() => { draw() }, [draw])

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width  = container.clientWidth
        canvas.height = TRACK_HEIGHT
        draw()
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [draw])

  // ── Drag des poignées ────────────────────────────────────────────────────────
  const xToMs = useCallback((clientX) => {
    const canvas = canvasRef.current
    if (!canvas) return 0
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * durationMs
  }, [durationMs])

  const handleMouseDown = useCallback((e) => {
    const ms = xToMs(e.clientX)
    const canvas = canvasRef.current
    const W = canvas?.getBoundingClientRect().width || 1
    const startX = (trimStart / durationMs) * W
    const endX   = (trimEnd   / durationMs) * W
    const x = e.clientX - canvas.getBoundingClientRect().left
    // Déterminer quelle poignée est la plus proche
    const distStart = Math.abs(x - startX)
    const distEnd   = Math.abs(x - endX)
    dragging.current = distStart < distEnd ? 'start' : 'end'
    e.preventDefault()
  }, [trimStart, trimEnd, durationMs, xToMs])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const ms = Math.round(xToMs(e.clientX))
      if (dragging.current === 'start') {
        setTrimStart(Math.max(0, Math.min(ms, trimEnd - 100)))
      } else {
        setTrimEnd(Math.min(durationMs, Math.max(ms, trimStart + 100)))
      }
    }
    const onUp = () => { dragging.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    // Touch support
    const onTouch = (e) => onMove(e.touches[0])
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onUp)
    }
  }, [xToMs, trimStart, trimEnd, durationMs])

  // ── Preview de la sélection ──────────────────────────────────────────────────
  const stopPreview = useCallback(() => {
    if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
    setPlayhead(null)
    setIsPreviewing(false)
  }, [])

  const playPreview = useCallback(() => {
    stopPreview()
    const src = sound.url
      || (sound.localPath ? `/api/preview-sound?path=${encodeURIComponent(sound.localPath)}` : null)
    if (!src) return

    const spriteDuration = trimEnd - trimStart
    const howl = new Howl({
      src: [src],
      html5: false,
      sprite: { sel: [trimStart, spriteDuration] },
      volume: 0.8,
      onend: () => { stopPreview() },
      onloaderror: () => { stopPreview() },
    })
    const id = howl.play('sel')
    howlRef.current = howl
    setIsPreviewing(true)

    const startTime = performance.now()
    const tick = () => {
      const elapsed = performance.now() - startTime
      const pos = trimStart + elapsed
      setPlayhead(Math.min(pos, trimEnd))
      if (pos < trimEnd) {
        animRef.current = requestAnimationFrame(tick)
      }
    }
    animRef.current = requestAnimationFrame(tick)
  }, [sound, trimStart, trimEnd, stopPreview])

  useEffect(() => () => stopPreview(), [stopPreview])

  // ── Formatage temps ──────────────────────────────────────────────────────────
  const fmt = (ms) => {
    const s = ms / 1000
    return s < 60
      ? `${s.toFixed(2)}s`
      : `${Math.floor(s / 60)}m${(s % 60).toFixed(1).padStart(4, '0')}s`
  }

  const selDuration = trimEnd - trimStart

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1200,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '680px',
          color: '#e0e0e0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          border: '1px solid #2a2a2a',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>{sound.label}</div>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
              Durée totale : {fmt(durationMs)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Waveform */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: `${TRACK_HEIGHT}px`,
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: 'ew-resize',
            background: '#1e1e1e',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#555' }}>
              Chargement de la waveform…
            </div>
          )}
          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#ef4444' }}>
              {error}
            </div>
          )}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onTouchStart={e => {
              const ms = xToMs(e.touches[0].clientX)
              const canvas = canvasRef.current
              const W = canvas?.getBoundingClientRect().width || 1
              const x = e.touches[0].clientX - canvas.getBoundingClientRect().left
              const startX = (trimStart / durationMs) * W
              const endX   = (trimEnd   / durationMs) * W
              dragging.current = Math.abs(x - startX) < Math.abs(x - endX) ? 'start' : 'end'
            }}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
        </div>

        {/* Temps affichés sous la waveform */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem' }}>
          <div style={{ color: COLOR_START, fontWeight: 600 }}>▶ {fmt(trimStart)}</div>
          <div style={{ color: '#888' }}>sélection : {fmt(selDuration)}</div>
          <div style={{ color: COLOR_END, fontWeight: 600 }}>{fmt(trimEnd)} ■</div>
        </div>

        {/* Sliders de précision */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#888', display: 'block', marginBottom: '0.3rem' }}>
              Point d'entrée
            </label>
            <input
              type="range" min={0} max={durationMs} step={10}
              value={trimStart}
              onChange={e => setTrimStart(Math.min(Number(e.target.value), trimEnd - 100))}
              style={{ width: '100%', accentColor: COLOR_START }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#888', display: 'block', marginBottom: '0.3rem' }}>
              Point de sortie
            </label>
            <input
              type="range" min={0} max={durationMs} step={10}
              value={trimEnd}
              onChange={e => setTrimEnd(Math.max(Number(e.target.value), trimStart + 100))}
              style={{ width: '100%', accentColor: COLOR_END }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Reset */}
          <button
            onClick={() => { setTrimStart(0); setTrimEnd(durationMs) }}
            style={{ background: 'none', border: '1px solid #2a2a2a', color: '#666', borderRadius: '7px', padding: '0.45rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Réinitialiser
          </button>

          {/* Preview */}
          <button
            onClick={isPreviewing ? stopPreview : playPreview}
            disabled={loading || !!error}
            style={{
              background: isPreviewing ? '#333' : '#1e1e1e',
              border: `1px solid ${isPreviewing ? '#5a7af0' : '#3a3a3a'}`,
              color: isPreviewing ? '#5a7af0' : '#bbb',
              borderRadius: '7px',
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            {isPreviewing ? '■ Stop' : '▶ Écouter la sélection'}
          </button>

          {/* Valider */}
          <button
            onClick={() => { stopPreview(); onConfirm({ trimStart, trimEnd }) }}
            style={{
              background: '#5a7af0',
              border: 'none',
              color: '#fff',
              borderRadius: '7px',
              padding: '0.45rem 1.25rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✓ Valider
          </button>
        </div>
      </div>
    </div>
  )
}

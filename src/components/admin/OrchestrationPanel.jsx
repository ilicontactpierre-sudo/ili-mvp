import { useState, useCallback } from 'react'

// Recherche un son dans la bibliothèque par keyword
// Cherche dans : searchString, tags, label (dans cet ordre de priorité)
function findSoundsByKeyword(keyword, soundLibrary) {
  const kw = keyword.toLowerCase().trim()
  if (!kw) return []

  return soundLibrary.filter(sound => {
    const inSearchString = sound.searchString
      ? sound.searchString.toLowerCase().includes(kw)
      : false
    const inTags = (sound.tags || []).some(tag =>
      tag.toLowerCase().includes(kw)
    )
    const inLabel = sound.label
      ? sound.label.toLowerCase().includes(kw)
      : false
    return inSearchString || inTags || inLabel
  })
}

// Choisit un son aléatoire parmi les résultats
function pickRandom(arr) {
  if (!arr || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

// Trouve la première colonne libre pour un bloc son sur un segment donné
function findFreeColumn(segmentIndex, startSegment, endSegment, existingTracks, segments, COLUMN_COUNT = 6) {
  for (let col = 0; col < COLUMN_COUNT; col++) {
    const conflict = existingTracks.some(track => {
      const trackStart = segments.findIndex(s =>
        (s.id || `seg_${segments.indexOf(s)}`) === track.startSegmentId
      )
      const trackEnd = segments.findIndex(s =>
        (s.id || `seg_${segments.indexOf(s)}`) === track.endSegmentId
      )
      const te = trackEnd !== -1 ? trackEnd : trackStart
      return (
        track.column === col &&
        trackStart <= segmentIndex &&
        te >= segmentIndex
      )
    })
    if (!conflict) return col
  }
  return 0 // fallback colonne 0 si tout est occupé
}

function OrchestrationPanel({
  segments,
  soundLibrary,
  soundTracks,
  onSoundTracksChange,
  onSaveToHistory,
}) {
  const [exportText, setExportText] = useState('')
  const [importJson, setImportJson] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [diagnosis, setDiagnosis] = useState(null) // { missing: [], found: [] }
  const [applyStatus, setApplyStatus] = useState('idle') // idle | success | error
  const [copyStatus, setCopyStatus] = useState('idle') // idle | copied
  const [importError, setImportError] = useState('')

  // ── Export du découpage pour Claude ─────────────────────────────────────────

  const handleExport = useCallback(() => {
    if (!segments || segments.length === 0) {
      alert('Aucun segment à exporter. Découpez d\'abord un texte.')
      return
    }

    // Construire les sons uploadés disponibles (url Supabase réelle)
    const uploadedSounds = soundLibrary.filter(
      s => s.url && s.url.startsWith('http')
    )

    const getSegmentText = (seg) => {
      if (typeof seg === 'string') return seg
      if (seg && typeof seg.text === 'string') return seg.text
      return ''
    }

    // En-tête
    const lines = []
    lines.push('================================================================')
    lines.push('FORMAT : Export ILi — Orchestration Sonore')
    lines.push('================================================================')
    lines.push('')
    lines.push(`SEGMENTS TOTAL : ${segments.length}`)
    lines.push('')

    // Segments numérotés
    lines.push('--- TEXTE ---')
    lines.push('')
    segments.forEach((seg, i) => {
      const text = getSegmentText(seg).trim()
      if (text) lines.push(`[${i + 1}] ${text}`)
    })

    // Sons uploadés disponibles (si existants)
    if (uploadedSounds.length > 0) {
      lines.push('')
      lines.push('--- SONS DÉJÀ UPLOADÉS (utilisables en priorité) ---')
      lines.push('')
      uploadedSounds.forEach(s => {
        const loopInfo = s.loop ? ' | loop:oui' : ''
        const dur = s.duration ? ` | durée:${s.duration}s` : ''
        lines.push(`• ${s.id} | "${s.label}"${loopInfo}${dur}`)
      })
    } else {
      lines.push('')
      lines.push('--- SONS UPLOADÉS : aucun pour l\'instant ---')
      lines.push('(Claude peut quand même proposer des keywords — ils seront uploadés ensuite)')
    }

    // Vocabulaire réel de la bibliothèque pour guider Claude
    const vocabSet = new Set()
    soundLibrary.forEach(sound => {
      if (sound.searchString) {
        sound.searchString.split(/\s+/).forEach(word => {
          const w = word.toLowerCase().replace(/[^a-záàâéèêëîïôùûüç]/gi, '').trim()
          if (w.length > 3) vocabSet.add(w)
        })
      }
      ;(sound.tags || []).forEach(tag => {
        if (tag.length > 2) vocabSet.add(tag.toLowerCase())
      })
    })
    const vocab = [...vocabSet].sort()

    lines.push('')
    lines.push('--- VOCABULAIRE DE LA BIBLIOTHÈQUE ---')
    lines.push('⚠️ Chaque keyword que tu choisis DOIT être un mot présent dans cette liste.')
    lines.push('Le système cherche ce mot textuellement dans les données des sons.')
    lines.push('Un mot absent de cette liste retournera 0 résultat et sera ignoré.')
    lines.push('')
    lines.push(vocab.join(', '))

    // Vocabulaire réel de la bibliothèque pour guider Claude
    const vocabSet = new Set()
    soundLibrary.forEach(sound => {
      if (sound.searchString) {
        sound.searchString.split(/\s+/).forEach(word => {
          const w = word.toLowerCase().replace(/[^a-záàâéèêëîïôùûüç]/gi, '').trim()
          if (w.length > 3) vocabSet.add(w)
        })
      }
      ;(sound.tags || []).forEach(tag => {
        if (tag.length > 2) vocabSet.add(tag.toLowerCase())
      })
    })
    const vocab = [...vocabSet].sort()

    lines.push('')
    lines.push('--- VOCABULAIRE DE LA BIBLIOTHÈQUE ---')
    lines.push('⚠️ Tes keywords DOIVENT être des mots présents dans cette liste.')
    lines.push('Un mot absent de cette liste retournera 0 résultat et sera ignoré.')
    lines.push('')
    lines.push(vocab.join(', '))

    const text = lines.join('\n')
    setExportText(text)

    // Copier dans le presse-papiers
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    }).catch(() => {
      // Fallback
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    })
  }, [segments, soundLibrary])

  // ── Parsing et diagnostic du JSON Claude ────────────────────────────────────

  const handleDiagnose = useCallback(() => {
    setImportError('')
    setDiagnosis(null)
    setApplyStatus('idle')

    if (!importJson.trim()) {
      setImportError('Colle le JSON de Claude ici.')
      return
    }

    let parsed
    try {
      // Nettoyer les éventuels backticks markdown
      const clean = importJson
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      parsed = JSON.parse(clean)
    } catch (e) {
      setImportError(`JSON invalide : ${e.message}`)
      return
    }

    if (!Array.isArray(parsed)) {
      setImportError('Le JSON doit être un tableau [ ... ]')
      return
    }

    // Diagnostic : pour chaque bloc, chercher le son correspondant
    const found = []
    const missing = []

    parsed.forEach((block, idx) => {
      if (!block.keyword) {
        missing.push({ index: idx, keyword: '(manquant)', reason: 'Pas de champ keyword' })
        return
      }
      const matches = findSoundsByKeyword(block.keyword, soundLibrary)
      const uploaded = matches.filter(s => s.url && s.url.startsWith('http'))

      if (matches.length === 0) {
        missing.push({
          index: idx,
          keyword: block.keyword,
          reason: 'Aucun son trouvé dans la bibliothèque pour ce keyword',
          type: block.type
        })
      } else if (uploaded.length === 0) {
        missing.push({
          index: idx,
          keyword: block.keyword,
          reason: `${matches.length} son(s) trouvé(s) mais aucun n'est uploadé sur Supabase`,
          candidates: matches.slice(0, 3).map(s => s.label),
          type: block.type
        })
      } else {
        found.push({
          index: idx,
          keyword: block.keyword,
          sound: pickRandom(uploaded),
          block,
          type: block.type
        })
      }
    })

    setDiagnosis({ found, missing, parsed })
  }, [importJson, soundLibrary])

  // ── Application de l'orchestration ──────────────────────────────────────────

  const handleApply = useCallback(() => {
    if (!diagnosis || diagnosis.found.length === 0) return

    const newTracks = []

    diagnosis.found.forEach(({ block, sound }) => {
      // Résoudre les IDs de segments
      const startIdx = block.startSegment - 1 // numéro → index 0-based
      const endIdx = block.endSegment - 1

      if (startIdx < 0 || startIdx >= segments.length) return
      if (endIdx < 0 || endIdx >= segments.length) return

      const startSeg = segments[startIdx]
      const endSeg = segments[endIdx]
      const startSegmentId = startSeg?.id || `seg_${startIdx}`
      const endSegmentId = endSeg?.id || `seg_${endIdx}`

      // Trouver une colonne libre
      const allTracks = [...soundTracks, ...newTracks]
      let col = 0
      for (let c = 0; c < 6; c++) {
        const conflict = allTracks.some(track => {
          const ts = segments.findIndex(s => (s.id || `seg_${segments.indexOf(s)}`) === track.startSegmentId)
          const te = segments.findIndex(s => (s.id || `seg_${segments.indexOf(s)}`) === track.endSegmentId)
          const teResolved = te !== -1 ? te : ts
          return track.column === c && ts <= startIdx && teResolved >= startIdx
        })
        if (!conflict) { col = c; break }
      }

      const newTrack = {
        id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${newTracks.length}`,
        soundId: sound.id,
        startSegmentId,
        endSegmentId,
        column: col,
        volume: block.volume ?? 0.5,
        loop: block.loop ?? false,
        fadeIn: block.fadeIn ?? 0,
        fadeOut: block.fadeOut ?? 0,
        delay: block.delay ?? 0,
        muted: false,
        // Métadonnée pour retrouver l'intention (non utilisée par le Player)
        _orchestrationNote: block.note || '',
        _orchestrationKeyword: block.keyword || '',
      }

      newTracks.push(newTrack)
    })

    if (newTracks.length === 0) {
      setApplyStatus('error')
      return
    }

    // Ajouter aux tracks existants
    onSoundTracksChange([...soundTracks, ...newTracks])
    if (onSaveToHistory) onSaveToHistory()
    setApplyStatus('success')
  }, [diagnosis, segments, soundTracks, onSoundTracksChange, onSaveToHistory])

  // ── Reset ────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setImportJson('')
    setDiagnosis(null)
    setApplyStatus('idle')
    setImportError('')
    setShowImport(false)
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const s = {
    container: {
      marginTop: '2rem',
      paddingTop: '2rem',
      borderTop: '1px solid rgba(255,255,255,0.08)',
    },
    title: {
      fontSize: '1.125rem',
      fontWeight: 500,
      color: 'rgba(255,255,255,0.7)',
      marginBottom: '1.25rem',
    },
    row: {
      display: 'flex',
      gap: '0.75rem',
      flexWrap: 'wrap',
      marginBottom: '1rem',
    },
    btn: (variant = 'secondary') => ({
      padding: '0.625rem 1.25rem',
      fontSize: '0.875rem',
      borderRadius: '7px',
      border: variant === 'primary'
        ? 'none'
        : '1px solid rgba(255,255,255,0.12)',
      backgroundColor: variant === 'primary'
        ? '#4f46e5'
        : variant === 'success'
          ? 'rgba(40,167,69,0.2)'
          : variant === 'danger'
            ? 'rgba(220,53,69,0.15)'
            : 'rgba(255,255,255,0.06)',
      color: variant === 'primary'
        ? 'white'
        : variant === 'success'
          ? 'rgba(74,222,128,0.9)'
          : variant === 'danger'
            ? '#dc3545'
            : 'rgba(255,255,255,0.75)',
      cursor: 'pointer',
      fontWeight: variant === 'primary' ? 500 : 400,
      transition: 'all 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
    }),
    textarea: {
      width: '100%',
      minHeight: '180px',
      padding: '0.875rem',
      fontSize: '0.8125rem',
      fontFamily: 'monospace',
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '7px',
      color: 'rgba(255,255,255,0.85)',
      resize: 'vertical',
      lineHeight: '1.5',
      boxSizing: 'border-box',
    },
    diagBox: (type) => ({
      padding: '1rem',
      borderRadius: '7px',
      marginTop: '0.75rem',
      backgroundColor: type === 'ok'
        ? 'rgba(40,167,69,0.06)'
        : type === 'warn'
          ? 'rgba(255,193,7,0.06)'
          : 'rgba(220,53,69,0.06)',
      border: `1px solid ${type === 'ok'
        ? 'rgba(40,167,69,0.2)'
        : type === 'warn'
          ? 'rgba(255,193,7,0.2)'
          : 'rgba(220,53,69,0.2)'}`,
    }),
    diagTitle: (type) => ({
      fontSize: '0.8125rem',
      fontWeight: 600,
      marginBottom: '0.5rem',
      color: type === 'ok'
        ? 'rgba(74,222,128,0.9)'
        : type === 'warn'
          ? 'rgba(255,193,7,0.9)'
          : 'rgba(220,53,69,0.9)',
    }),
    diagItem: {
      fontSize: '0.75rem',
      color: 'rgba(255,255,255,0.6)',
      lineHeight: '1.6',
      marginBottom: '0.25rem',
    },
    error: {
      fontSize: '0.8125rem',
      color: 'rgba(220,53,69,0.9)',
      marginTop: '0.5rem',
      padding: '0.5rem 0.75rem',
      backgroundColor: 'rgba(220,53,69,0.06)',
      borderRadius: '5px',
      border: '1px solid rgba(220,53,69,0.15)',
    },
  }

  const canExport = segments && segments.length > 0

  return (
    <div style={s.container}>
      <div style={s.title}>🎼 Orchestration automatique (Claude)</div>

      {/* ── Étape 1 : Export ── */}
      <div style={{
        padding: '1.25rem',
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}>
        <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.875rem' }}>
          <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Étape 1</strong> — Exporte le découpage et colle-le dans Claude avec le prompt <code style={{ fontSize: '0.75rem', opacity: 0.7 }}>ORCHESTRATION_PROMPT.md</code>
        </div>
        <div style={s.row}>
          <button
            onClick={handleExport}
            disabled={!canExport}
            style={{
              ...s.btn('primary'),
              opacity: canExport ? 1 : 0.4,
              cursor: canExport ? 'pointer' : 'not-allowed',
            }}
          >
            {copyStatus === 'copied' ? '✓ Copié !' : '↗ Exporter pour Claude'}
          </button>
          {exportText && (
            <button
              onClick={() => setExportText('')}
              style={s.btn()}
            >
              Masquer
            </button>
          )}
        </div>
        {exportText && (
          <textarea
            value={exportText}
            readOnly
            style={{ ...s.textarea, minHeight: '120px', marginTop: '0.5rem' }}
          />
        )}
      </div>

      {/* ── Étape 2 : Import ── */}
      <div style={{
        padding: '1.25rem',
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '8px',
      }}>
        <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.875rem' }}>
          <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Étape 2</strong> — Colle ici le JSON retourné par Claude, vérifie le diagnostic, puis applique.
        </div>

        {!showImport && applyStatus === 'idle' && (
          <button
            onClick={() => setShowImport(true)}
            style={s.btn()}
          >
            ↙ Coller le JSON de Claude
          </button>
        )}

        {(showImport || importJson) && applyStatus !== 'success' && (
          <>
            <textarea
              value={importJson}
              onChange={e => {
                setImportJson(e.target.value)
                setDiagnosis(null)
                setImportError('')
                setApplyStatus('idle')
              }}
              placeholder='Colle ici le JSON retourné par Claude [ { "keyword": "rain", ... }, ... ]'
              style={{ ...s.textarea, marginBottom: '0.75rem' }}
            />
            {importError && (
              <div style={s.error}>{importError}</div>
            )}
            <div style={s.row}>
              <button
                onClick={handleDiagnose}
                disabled={!importJson.trim()}
                style={{
                  ...s.btn('primary'),
                  opacity: importJson.trim() ? 1 : 0.4,
                  cursor: importJson.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                🔍 Analyser
              </button>
              <button onClick={handleReset} style={s.btn()}>
                Annuler
              </button>
            </div>
          </>
        )}

        {/* ── Diagnostic ── */}
        {diagnosis && applyStatus !== 'success' && (
          <div style={{ marginTop: '0.75rem' }}>

            {/* Sons trouvés et uploadés */}
            {diagnosis.found.length > 0 && (
              <div style={s.diagBox('ok')}>
                <div style={s.diagTitle('ok')}>
                  ✓ {diagnosis.found.length} bloc(s) prêts à appliquer
                </div>
                {diagnosis.found.map((item, i) => (
                  <div key={i} style={s.diagItem}>
                    <strong style={{ color: 'rgba(255,255,255,0.75)' }}>
                      [{item.block.startSegment}→{item.block.endSegment}]
                    </strong>{' '}
                    <code style={{ fontSize: '0.7rem', opacity: 0.8 }}>{item.keyword}</code>
                    {' → '}
                    <span style={{ fontStyle: 'italic' }}>{item.sound.label}</span>
                    {item.block.note && (
                      <span style={{ opacity: 0.5 }}> — {item.block.note}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Sons manquants ou non uploadés */}
            {diagnosis.missing.length > 0 && (
              <div style={{ ...s.diagBox('warn'), marginTop: '0.5rem' }}>
                <div style={s.diagTitle('warn')}>
                  ⚠ {diagnosis.missing.length} bloc(s) avec problème
                </div>
                {diagnosis.missing.map((item, i) => (
                  <div key={i} style={{ ...s.diagItem, marginBottom: '0.5rem' }}>
                    <strong style={{ color: 'rgba(255,255,255,0.7)' }}>
                      keyword : <code style={{ fontSize: '0.7rem' }}>{item.keyword}</code>
                    </strong>
                    <br />
                    <span style={{ opacity: 0.7 }}>{item.reason}</span>
                    {item.candidates && item.candidates.length > 0 && (
                      <>
                        <br />
                        <span style={{ opacity: 0.6 }}>
                          Sons à uploader : {item.candidates.join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                ))}
                {diagnosis.missing.some(m => m.candidates) && (
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'rgba(255,193,7,0.7)',
                    fontStyle: 'italic',
                  }}>
                    → Uploade ces sons via le sélecteur de sons dans la timeline, puis relance l'analyse.
                  </div>
                )}
              </div>
            )}

            {/* Bouton appliquer */}
            {diagnosis.found.length > 0 && (
              <div style={{ ...s.row, marginTop: '1rem' }}>
                <button
                  onClick={handleApply}
                  style={s.btn('success')}
                >
                  ✦ Appliquer {diagnosis.found.length} bloc(s) sur la timeline
                  {diagnosis.missing.length > 0 && ` (${diagnosis.missing.length} ignoré(s))`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Succès ── */}
        {applyStatus === 'success' && (
          <div style={{ ...s.diagBox('ok'), marginTop: '0.75rem' }}>
            <div style={s.diagTitle('ok')}>
              ✓ Orchestration appliquée sur la timeline
            </div>
            <div style={s.diagItem}>
              {diagnosis.found.length} bloc(s) ajouté(s). Tu peux maintenant modifier chaque bloc manuellement.
            </div>
            <button
              onClick={handleReset}
              style={{ ...s.btn(), marginTop: '0.75rem' }}
            >
              Nouvelle orchestration
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrchestrationPanel

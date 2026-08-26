import { useState, useEffect, useCallback, useRef } from 'react'
function DraftManager({
  title,
  author,
  slug,
  bookUrl,
  mood,
  genre,
  description,
  segments,
  soundTracks,
  vfxTracks,
  seuil = [],
  isSerial = false,
  parts = [],
  onRestore,
  onOpenPreview,
  isSplitView = false,
  onToggleSplit,
}) {
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState([])
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [draftInfo, setDraftInfo] = useState(null)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const autoSaveTimerRef = useRef(null)
  const versionsRef = useRef(null)
  const snapshotDataRef = useRef({})
  snapshotDataRef.current = {
    title, author, slug, bookUrl, mood, genre, description,
    segments, soundTracks, vfxTracks, seuil, isSerial, parts
  }
  // Clés localStorage — le brouillon de secours (silencieux, écrasé à
  // chaque auto-save) est séparé des versions nommées (créées explicitement
  // par l'utilisateur via "Sauvegarder", jamais écrasées ni limitées en
  // nombre — seul l'utilisateur peut les supprimer).
  const draftKey    = slug ? `ili_draft_${slug}`   : 'ili_draft_unsaved'
  const versionsKey = slug ? `ili_history_${slug}` : 'ili_history_unsaved'
  // Charger les versions et vérifier le brouillon de secours au montage
  useEffect(() => {
    try {
      const savedVersions = localStorage.getItem(versionsKey)
      if (savedVersions) {
        // Migration douce : les anciennes entrées (avant cette mise à jour)
        // n'ont pas d'id/name — on leur en attribue un à la volée, sans
        // rien perdre de ce qui existait déjà.
        const parsed = JSON.parse(savedVersions)
        const migrated = parsed.map((v, i) => ({
          ...v,
          id: v.id || `v_legacy_${i}_${Date.parse(v.savedAt) || Date.now()}`,
          name: v.name || v.label || `Version ${i + 1}`,
        }))
        setVersions(migrated)
      }
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const draft = JSON.parse(raw)
        const hasContent = draft.isSerial
          ? Array.isArray(draft.parts) && draft.parts.some(p => (p.segments?.length ?? 0) > 0)
          : (draft.segments?.length ?? 0) > 0
        if (draft && draft.savedAt && hasContent) {
          setDraftInfo(draft)
          setShowDraftBanner(true)
        }
      }
    } catch (err) {
      console.error('Erreur chargement brouillon/versions:', err)
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [draftKey, versionsKey])
  // Fermer le dropdown versions quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (versionsRef.current && !versionsRef.current.contains(event.target)) {
        setShowVersions(false)
      }
    }
    if (showVersions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showVersions])
  // Créer un snapshot des données courantes
  const createSnapshot = useCallback(() => {
    const d = snapshotDataRef.current
    return {
      savedAt: new Date().toISOString(),
      title:       d.title       || 'Sans titre',
      author:      d.author      || '',
      slug:        d.slug        || '',
      bookUrl:     d.bookUrl     || '',
      mood:        d.mood        || '',
      genre:       d.genre       || '',
      description: d.description || '',
      segments:    d.isSerial ? [] : (d.segments    || []),
      soundTracks: d.isSerial ? [] : (d.soundTracks || []),
      vfxTracks:   d.isSerial ? [] : (d.vfxTracks   || []),
      seuil:       d.isSerial ? [] : (d.seuil        || []),
      isSerial:    d.isSerial,
      parts:       d.isSerial ? d.parts : [],
    }
  }, [])
  // Brouillon de secours — silencieux, écrasé à chaque fois, jamais listé
  // dans les versions. Sert uniquement à la bannière de récupération après
  // une fermeture accidentelle de l'onglet.
  const saveAutoDraft = useCallback(() => {
    const snapshot = createSnapshot()
    const dKey = snapshot.slug ? `ili_draft_${snapshot.slug}` : 'ili_draft_unsaved'
    try {
      localStorage.setItem(dKey, JSON.stringify(snapshot))
      setLastSavedAt(new Date())
    } catch (err) {
      console.error('Erreur auto-save:', err)
    }
  }, [createSnapshot])
  // Créer une nouvelle version NOMMÉE — jamais écrasée, jamais limitée en
  // nombre. Ne touche jamais à ce qui est publié : reste 100% locale tant
  // que le bouton "Publier" n'a pas été utilisé.
  const saveNewVersion = useCallback(() => {
    const snapshot = createSnapshot()
    const vKey = snapshot.slug ? `ili_history_${snapshot.slug}` : 'ili_history_unsaved'
    const dKey = snapshot.slug ? `ili_draft_${snapshot.slug}`   : 'ili_draft_unsaved'
    try {
      const existing = JSON.parse(localStorage.getItem(vKey) || '[]')
      const entry = {
        id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: `Version ${existing.length + 1}`,
        ...snapshot,
      }
      const next = [entry, ...existing]
      localStorage.setItem(vKey, JSON.stringify(next))
      localStorage.setItem(dKey, JSON.stringify(snapshot))
      setVersions(next)
      setLastSavedAt(new Date())
      return entry
    } catch (err) {
      console.error('Erreur sauvegarde version:', err)
      return null
    }
  }, [createSnapshot])
  // Auto-save silencieux 30 secondes après la dernière modification
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => { saveAutoDraft() }, 30000)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [segments, soundTracks, vfxTracks, seuil, parts, isSerial, title, author, slug, saveAutoDraft])
  // Sauvegarde de secours avant fermeture de la page
  useEffect(() => {
    function handleBeforeUnload() { saveAutoDraft() }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveAutoDraft])
  // Formater le temps écoulé depuis la dernière sauvegarde
  const formatTimeAgo = (date) => {
    if (!date) return ''
    const diff = Math.floor((new Date() - date) / 1000)
    if (diff < 60) return `il y a ${diff}s`
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
    return `il y a ${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`
  }
  // Bouton "Sauvegarder" — crée une nouvelle version nommée automatiquement
  // ("Version N"), renommable ensuite depuis la liste.
  const handleManualSave = () => {
    const entry = saveNewVersion()
    if (entry) {
      setSaveFeedback('✓ Version enregistrée')
      setTimeout(() => setSaveFeedback(''), 2000)
    }
  }
  // Charger une version dans l'éditeur
  const handleLoadVersion = (snapshot) => {
    if (!window.confirm(`Charger "${snapshot.name}" dans l'éditeur ?\n\nLes modifications non sauvegardées seront perdues.`)) {
      return
    }
    if (onRestore) onRestore(snapshot)
    setShowVersions(false)
  }
  // Renommer une version
  const startRename = (v) => {
    setRenamingId(v.id)
    setRenameValue(v.name)
  }
  const confirmRename = (id) => {
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenamingId(null); return }
    const next = versions.map(v => v.id === id ? { ...v, name: trimmed } : v)
    setVersions(next)
    try { localStorage.setItem(versionsKey, JSON.stringify(next)) } catch {}
    setRenamingId(null)
  }
  // Supprimer une version — n'affecte que le brouillon local, jamais le
  // contenu publié.
  const handleDeleteVersion = (v) => {
    if (!window.confirm(`Supprimer définitivement la version "${v.name}" ?\n\nCette action est irréversible (mais n'affecte que ton brouillon local — rien de publié n'est touché).`)) {
      return
    }
    const next = versions.filter(x => x.id !== v.id)
    setVersions(next)
    try { localStorage.setItem(versionsKey, JSON.stringify(next)) } catch {}
  }
  // Restaurer le brouillon de secours
  const handleRestoreDraft = () => {
    if (!draftInfo) return
    if (!window.confirm(`Restaurer le brouillon de secours (sauvegardé automatiquement) ?\n\nLes modifications non sauvegardées seront perdues.`)) {
      return
    }
    if (onRestore) onRestore(draftInfo)
    setShowDraftBanner(false)
    setDraftInfo(null)
  }
  const handleIgnoreDraft = () => {
    setShowDraftBanner(false)
    setDraftInfo(null)
  }
  const getSegmentCount = (snapshot) => {
    if (snapshot.isSerial && Array.isArray(snapshot.parts)) {
      return snapshot.parts.reduce((acc, p) => acc + (p.segments?.length ?? 0), 0)
    }
    return snapshot.segments ? snapshot.segments.length : 0
  }
  return (
    <>
      {/* Bannière de brouillon de secours */}
      {showDraftBanner && draftInfo && (
        <div data-sticky="draftbanner" style={{
          position: 'sticky', top: 0, zIndex: 100,
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-bg-accent)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: '1rem',
          fontSize: '0.875rem'
        }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Un brouillon de secours existe (sauvegardé {new Date(draftInfo.savedAt).toLocaleString('fr-FR')})
          </span>
          <button onClick={handleRestoreDraft} style={{
            padding: '0.25rem 0.75rem', backgroundColor: 'var(--color-primary)',
            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem'
          }}>Restaurer</button>
          <button onClick={handleIgnoreDraft} style={{
            padding: '0.25rem 0.75rem', backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)',
            borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem'
          }}>Ignorer</button>
        </div>
      )}
      {/* Barre de statut */}
      <div data-sticky="draftbar" style={{
        position: 'sticky', top: showDraftBanner ? 52 : 0, zIndex: 99,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)', fontSize: '0.875rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-text-focus)' }}>⬡ ILi Admin</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>{title || 'Sans titre'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: lastSavedAt ? '#28a745' : '#dc3545' }} />
            {saveFeedback || (lastSavedAt ? `Sauvegardé ${formatTimeAgo(lastSavedAt)}` : 'Non sauvegardé')}
          </div>
          {onToggleSplit && (
            <button onClick={onToggleSplit} title={isSplitView ? "Fermer l'aperçu latéral" : "Ouvrir l'aperçu latéral"} style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: isSplitView ? '#1a1a2e' : 'var(--color-bg-accent)',
              color: isSplitView ? '#fff' : 'var(--color-text)',
              border: isSplitView ? '1px solid #1a1a2e' : '1px solid var(--color-border)',
              borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.15s ease',
            }}>{isSplitView ? '▣ Split actif' : '▣ Split'}</button>
          )}
          {onOpenPreview && (
            <button onClick={onOpenPreview} title="Aperçu plein écran" style={{
              padding: '0.25rem 0.75rem', backgroundColor: 'var(--color-bg-accent)',
              color: 'var(--color-text)', border: '1px solid var(--color-border)',
              borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.25rem'
            }}>👁 Aperçu</button>
          )}
          {/* Bouton Sauvegarder — crée une nouvelle version nommée */}
          <button onClick={handleManualSave} style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: saveFeedback ? '#28a745' : 'var(--color-primary)',
            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem'
          }}>{saveFeedback || '💾 Sauvegarder une version'}</button>
          {/* Dropdown Versions */}
          <div style={{ position: 'relative' }} ref={versionsRef}>
            <button onClick={() => setShowVersions(!showVersions)} style={{
              padding: '0.25rem 0.75rem', backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)', border: '1px solid var(--color-border)',
              borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem'
            }}>Versions ({versions.length}) {showVersions ? '▲' : '▾'}</button>
            {showVersions && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem',
                backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
                borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '320px', maxHeight: '420px', overflow: 'auto', zIndex: 1000
              }}>
                <div style={{
                  padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-border)',
                  fontWeight: 'bold', fontSize: '0.875rem'
                }}>
                  Versions locales ({versions.length})
                </div>
                {versions.length > 15 && (
                  <div style={{
                    padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#b8860b',
                    backgroundColor: 'rgba(255,193,7,0.08)', borderBottom: '1px solid var(--color-border)'
                  }}>
                    💡 {versions.length} versions stockées — pense à supprimer celles dont tu n'as plus besoin.
                  </div>
                )}
                {versions.length === 0 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    Aucune version enregistrée. Clique sur "💾 Sauvegarder une version".
                  </div>
                )}
                {versions.map((v) => (
                  <div key={v.id} style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8125rem'
                  }}>
                    {renamingId === v.id ? (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') confirmRename(v.id)
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          style={{ flex: 1, padding: '0.25rem 0.4rem', fontSize: '0.8125rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                        />
                        <button onClick={() => confirmRename(v.id)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: 'none', borderRadius: '4px', backgroundColor: '#28a745', color: '#fff', cursor: 'pointer' }}>✓</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{v.name}</div>
                        <button onClick={() => startRename(v)} title="Renommer" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>✏️</button>
                      </div>
                    )}
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                      {new Date(v.savedAt).toLocaleString('fr-FR')} — {getSegmentCount(v)} segments
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button onClick={() => handleLoadVersion(v)} style={{
                        flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem',
                        backgroundColor: 'var(--color-primary)', color: 'white',
                        border: 'none', borderRadius: '4px', cursor: 'pointer'
                      }}>↺ Charger</button>
                      <button onClick={() => handleDeleteVersion(v)} style={{
                        padding: '0.3rem 0.6rem', fontSize: '0.75rem',
                        backgroundColor: 'rgba(220,53,69,0.12)', color: '#dc3545',
                        border: '1px solid rgba(220,53,69,0.25)', borderRadius: '4px', cursor: 'pointer'
                      }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
export default DraftManager

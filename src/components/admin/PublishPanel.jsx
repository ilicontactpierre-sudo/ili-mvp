import { useState, useEffect } from 'react'
import PublishAnimation from './PublishAnimation'

function PublishPanel({
  title,
  author,
  slug,
  segments,
  soundTracks,
  soundLibrary,
  onNewStory,
  onSaveDraft
}) {
  const [generatedJson, setGeneratedJson] = useState('')
  const [copyButtonText, setCopyButtonText] = useState('📋 Copier le JSON')
  const [publishStatus, setPublishStatus] = useState('unknown') // 'new', 'update', 'unknown'
  const [showInstructions, setShowInstructions] = useState(true)
  const [existingStories, setExistingStories] = useState([])
  const [showNewStoryConfirm, setShowNewStoryConfirm] = useState(false)
  
  // États pour la publication automatique
  const [autoPublishStatus, setAutoPublishStatus] = useState('idle') // 'idle', 'publishing', 'success', 'error'
  const [autoPublishError, setAutoPublishError] = useState(null)
  const [isAutoUpdate, setIsAutoUpdate] = useState(false)
  const [isLocalDev, setIsLocalDev] = useState(false)
  const [showLocalMessage, setShowLocalMessage] = useState(false)

  // Détecter si on est en local
  useEffect(() => {
    const hostname = window.location.hostname
    setIsLocalDev(hostname === 'localhost' || hostname === '127.0.0.1')
  }, [])

  // Charger l'index des histoires pour déterminer le statut de publication
  useEffect(() => {
    async function loadIndex() {
      try {
        const response = await fetch('/stories/index.json')
        if (response.ok) {
          const data = await response.json()
          setExistingStories(data.stories || data || [])
        }
      } catch (err) {
        // Silencieux - pas grave si on ne peut pas charger
      }
    }
    loadIndex()
  }, [])

  // Déterminer le statut de publication
  useEffect(() => {
    if (!slug) {
      setPublishStatus('unknown')
      return
    }

    const exists = existingStories.some(s => s.id === slug)
    setPublishStatus(exists ? 'update' : 'new')
  }, [slug, existingStories])

  // Convertir soundTracks en audioEvents pour le format publié
  const convertSoundTracksToAudioEvents = () => {
    const segmentsWithAudio = segments.map((seg, index) => {
      if (typeof seg === 'string') {
        return { id: `seg_${index}`, text: seg, audioEvents: [] }
      }
      if (!seg.id) {
        return { ...seg, id: `seg_${index}`, text: seg.text || '', audioEvents: [] }
      }
      return { id: seg.id, text: seg.text || '', audioEvents: [] }
    })

    soundTracks.forEach(track => {
      if (track.muted) return

      let startIdx = segmentsWithAudio.findIndex(
        s => String(s.id) === String(track.startSegmentId)
      )
      if (startIdx === -1) {
        const m = String(track.startSegmentId).match(/^seg(?:ment)?_(\d+)$/)
        if (m) startIdx = parseInt(m[1], 10)
      }
      if (startIdx === -1 || startIdx >= segmentsWithAudio.length) return

      let endIdx = track.endSegmentId != null
        ? segmentsWithAudio.findIndex(s => String(s.id) === String(track.endSegmentId))
        : startIdx
      if (endIdx === -1 && track.endSegmentId != null) {
        const m = String(track.endSegmentId).match(/^seg(?:ment)?_(\d+)$/)
        if (m) endIdx = parseInt(m[1], 10)
      }
      if (endIdx === -1) endIdx = startIdx

      // Play ou FadeIn sur le segment de début
      if (track.fadeIn > 0) {
        segmentsWithAudio[startIdx].audioEvents.push({
          action: 'fadeIn',
          soundId: track.soundId,
          volume: track.volume ?? 0.5,
          duration: track.fadeIn,
          delay: track.delay || 0,
          loop: track.loop || false
        })
      } else {
        segmentsWithAudio[startIdx].audioEvents.push({
          action: 'play',
          soundId: track.soundId,
          volume: track.volume ?? 0.5,
          delay: track.delay || 0,
          loop: track.loop || false
        })
      }

      // Stop ou FadeOut sur le segment APRÈS la fin du bloc
      // Exemple : bloc sur seg 0→1 → stop sur seg 2
      const stopIdx = endIdx + 1
      if (stopIdx < segmentsWithAudio.length) {
        if (track.fadeOut > 0) {
          segmentsWithAudio[stopIdx].audioEvents.push({
            action: 'fadeOut',
            soundId: track.soundId,
            duration: track.fadeOut
          })
        } else {
          segmentsWithAudio[stopIdx].audioEvents.push({
            action: 'stop',
            soundId: track.soundId
          })
        }
      }
      // Si stopIdx >= longueur : pas de stop, le son joue jusqu'à la fin de l'histoire
    })

    return segmentsWithAudio
  }

  // Filtrer les sons utilisés (non mutés) — format {id, url, loop} uniquement
  const getUsedSounds = () => {
    const usedSoundIds = new Set(
      soundTracks
        .filter(t => !t.muted)
        .map(t => t.soundId)
    )
    return soundLibrary
      .filter(s => usedSoundIds.has(s.id))
      .map(s => ({
        id: s.id,
        // Préférer l'url directe si disponible, sinon construire depuis filename
        url: s.url || (s.filename ? `/sounds/${s.filename}` : `/sounds/${s.id}.mp3`),
        loop: s.loop || false,
      }))
  }

  // Construire les données de l'histoire pour publication
  // NE PAS inclure soundTracks dans le JSON publié
  const buildStoryData = () => {
    const segmentsWithAudio = convertSoundTracksToAudioEvents()
    const usedSounds = getUsedSounds()

    return {
      id: slug,
      title: title || 'Sans titre',
      author: author || 'Anonyme',
      published: true,
      sounds: usedSounds,
      segments: segmentsWithAudio
    }
  }

  // Générer le JSON
  const handleGenerateJson = () => {
    const storyData = buildStoryData()
    const jsonString = JSON.stringify(storyData, null, 2)
    setGeneratedJson(jsonString)

    // Copier dans le presse-papiers
    copyToClipboard(jsonString)
  }

  // Publier automatiquement
  const handleAutoPublish = async () => {
    // Vérifier si on est en local
    if (isLocalDev) {
      setShowLocalMessage(true)
      setTimeout(() => setShowLocalMessage(false), 5000)
      return
    }

    // Vérifier les prérequis
    if (!title || !slug || segments.length === 0) {
      return
    }

    setAutoPublishStatus('publishing')
    setAutoPublishError(null)

    try {
      // Récupérer le mot de passe
      let adminPassword = sessionStorage.getItem('ili_admin_password')
      if (!adminPassword) {
        // Fallback sur la variable d'environnement (moins sécurisé)
        adminPassword = import.meta.env.VITE_ADMIN_PASSWORD
      }

      const storyData = buildStoryData()

      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          slug: slug,
          storyData: storyData
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsAutoUpdate(data.isUpdate)
        setAutoPublishStatus('success')
      } else {
        setAutoPublishError(data.error || 'Erreur inconnue')
        setAutoPublishStatus('error')
      }
    } catch (err) {
      setAutoPublishError(err.message || 'Erreur de connexion')
      setAutoPublishStatus('error')
    }
  }

  // Réinitialiser le statut de publication
  const handleResetPublish = () => {
    setAutoPublishStatus('idle')
    setAutoPublishError(null)
  }

  // Copier dans le presse-papiers
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyButtonText('✓ Copié !')
      setTimeout(() => setCopyButtonText('📋 Copier le JSON'), 2000)
    } catch (err) {
      // Fallback pour les vieux navigateurs
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopyButtonText('✓ Copié !')
        setTimeout(() => setCopyButtonText('📋 Copier le JSON'), 2000)
      } catch (err2) {
        setCopyButtonText('✗ Erreur')
        setTimeout(() => setCopyButtonText('📋 Copier le JSON'), 2000)
      }
    }
  }

  // Copier le JSON (bouton dédié)
  const handleCopyJson = () => {
    if (generatedJson) {
      copyToClipboard(generatedJson)
    }
  }

  // Nouvelle histoire - afficher la confirmation
  const handleNewStoryClick = () => {
    setShowNewStoryConfirm(true)
  }

  // Sauvegarder d'abord puis nouvelle histoire
  const handleSaveAndNewStory = () => {
    if (onSaveDraft) {
      onSaveDraft()
    }
    resetAll()
    setShowNewStoryConfirm(false)
  }

  // Continuer sans sauvegarder
  const handleContinueWithoutSave = () => {
    resetAll()
    setShowNewStoryConfirm(false)
  }

  // Annuler
  const handleCancelNewStory = () => {
    setShowNewStoryConfirm(false)
  }

  // Réinitialiser tous les states
  const resetAll = () => {
    if (onNewStory) {
      onNewStory()
    }
    setGeneratedJson('')
    setCopyButtonText('📋 Copier le JSON')
  }

  // Styles
  const styles = {
    container: {
      marginTop: '3rem',
      paddingTop: '2.5rem',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    },
    title: {
      fontSize: '1.25rem',
      color: 'rgba(255,255,255,0.7)',
      marginBottom: '0.5rem',
      fontWeight: 500
    },
    status: {
      container: {
        padding: '0.625rem 1rem',
        borderRadius: '6px',
        fontSize: '0.8125rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      },
      unknown: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(255,255,255,0.08)'
      },
      new: {
        backgroundColor: 'rgba(40,167,69,0.1)',
        color: 'rgba(40,167,69,0.9)',
        border: '1px solid rgba(40,167,69,0.2)'
      },
      update: {
        backgroundColor: 'rgba(255,193,7,0.1)',
        color: 'rgba(255,193,7,0.9)',
        border: '1px solid rgba(255,193,7,0.2)'
      }
    },
    button: {
      primary: {
        padding: '0.875rem 2rem',
        fontSize: '0.9375rem',
        backgroundColor: segments.length && slug ? '#28a745' : 'rgba(255,255,255,0.1)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: segments.length && slug ? 'pointer' : 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: 500,
        transition: 'background-color 0.2s'
      },
      secondary: {
        padding: '0.75rem 1.25rem',
        fontSize: '0.8125rem',
        backgroundColor: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'background-color 0.2s'
      },
      copy: {
        padding: '0.625rem 1rem',
        fontSize: '0.8125rem',
        backgroundColor: 'rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.8)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        transition: 'background-color 0.2s'
      },
      newStory: {
        padding: '0.625rem 1rem',
        fontSize: '0.8125rem',
        backgroundColor: 'transparent',
        color: 'rgba(255,255,255,0.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        transition: 'background-color 0.2s',
        marginTop: '2.5rem'
      }
    },
    textarea: {
      width: '100%',
      padding: '1rem',
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      backgroundColor: 'rgba(255,255,255,0.03)',
      color: 'rgba(255,255,255,0.85)',
      resize: 'vertical',
      lineHeight: '1.5',
      minHeight: '200px'
    },
    instructions: {
      container: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        overflow: 'hidden'
      },
      header: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.875rem 1rem',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'left'
      },
      content: {
        padding: '1rem 1.25rem',
        fontSize: '0.8125rem',
        lineHeight: '1.7'
      },
      code: {
        display: 'block',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: '0.5rem 0.75rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        color: 'rgba(255,255,255,0.75)',
        marginTop: '0.375rem',
        marginBottom: '0.75rem',
        wordBreak: 'break-all',
        border: '1px solid rgba(255,255,255,0.06)'
      }
    },
    confirmDialog: {
      overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      },
      dialog: {
        backgroundColor: '#1a1a1e',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        padding: '1.5rem',
        maxWidth: '420px',
        width: '90%'
      },
      title: {
        fontSize: '1rem',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: '0.75rem'
      },
      text: {
        fontSize: '0.8125rem',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: '1.25rem',
        lineHeight: '1.5'
      },
      buttons: {
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      },
      buttonPrimary: {
        padding: '0.5rem 1rem',
        fontSize: '0.8125rem',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500
      },
      buttonSecondary: {
        padding: '0.5rem 1rem',
        fontSize: '0.8125rem',
        backgroundColor: 'rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '6px',
        cursor: 'pointer'
      },
      buttonCancel: {
        padding: '0.5rem 1rem',
        fontSize: '0.8125rem',
        backgroundColor: 'transparent',
        color: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '6px',
        cursor: 'pointer'
      }
    }
  }

  // Vérifier si le bouton de publication est désactivé
  const isPublishDisabled = !title || !slug || segments.length === 0

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        Publication / Export
      </h2>

      {/* Statut de publication */}
      <div style={{
        ...styles.status.container,
        ...styles.status[publishStatus]
      }}>
        <span>
          {publishStatus === 'unknown' && '◦ Renseigne le slug pour vérifier le statut'}
          {publishStatus === 'new' && '◦ Nouvelle histoire — sera publiée pour la première fois'}
          {publishStatus === 'update' && '◦ Mise à jour — remplacera la version publiée'}
        </span>
      </div>

      {/* Message pour développement local */}
      {showLocalMessage && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(255,193,7,0.1)',
          border: '1px solid rgba(255,193,7,0.3)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: 'rgba(255,193,7,0.9)',
          marginBottom: '1rem'
        }}>
          La publication automatique nécessite le déploiement Vercel.
          En local, utilise l'export JSON manuel ci-dessous.
        </div>
      )}

      {/* Bouton Publier mon histoire */}
      {autoPublishStatus === 'idle' ? (
        <button
          onClick={handleAutoPublish}
          disabled={isPublishDisabled}
          style={{
            ...styles.button.primary,
            backgroundColor: isPublishDisabled ? 'rgba(255,255,255,0.1)' : '#28a745',
            fontSize: '1rem',
            padding: '1rem 2rem'
          }}
        >
          🚀 Publier mon histoire
        </button>
      ) : (
        <PublishAnimation
          status={autoPublishStatus}
          errorMessage={autoPublishError}
          isUpdate={isAutoUpdate}
          onReset={handleResetPublish}
        />
      )}

      {/* Boutons d'export et publication rapide */}
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleGenerateJson}
          disabled={!segments.length || !slug}
          style={{
            ...styles.button.secondary,
            fontSize: '0.75rem',
            padding: '0.5rem 1rem'
          }}
        >
          📋 Générer le JSON (export manuel)
        </button>
        
        {/* Bouton de publication rapide */}
        {autoPublishStatus === 'idle' && (
          <button
            onClick={handleAutoPublish}
            disabled={isPublishDisabled}
            style={{
              ...styles.button.secondary,
              fontSize: '0.75rem',
              padding: '0.5rem 1rem',
              backgroundColor: isPublishDisabled ? 'rgba(255,255,255,0.06)' : 'rgba(40,167,69,0.2)',
              color: isPublishDisabled ? 'rgba(255,255,255,0.7)' : 'rgba(40,167,69,0.9)',
              border: isPublishDisabled ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(40,167,69,0.3)'
            }}
            title="Publie l'histoire et la rend visible sur la page d'accueil"
          >
            ✨ Publier (visible sur l'accueil)
          </button>
        )}
      </div>

      {/* JSON généré */}
      {generatedJson && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
          <textarea
            value={generatedJson}
            readOnly
            rows={15}
            style={styles.textarea}
          />
          <button
            onClick={handleCopyJson}
            style={styles.button.copy}
          >
            {copyButtonText}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div style={styles.instructions.container}>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          style={styles.instructions.header}
        >
          ℹ Instructions de publication
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            {showInstructions ? '▲' : '▾'}
          </span>
        </button>

        {showInstructions && (
          <div style={styles.instructions.content}>
            <div style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.65)' }}>
              <strong style={{ color: 'rgba(255,255,255,0.85)' }}>1.</strong>{' '}
              Le JSON a été copié dans ton presse-papiers.
            </div>

            <div style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.65)' }}>
              <strong style={{ color: 'rgba(255,255,255,0.85)' }}>2.</strong>{' '}
              Ouvre ou crée le fichier :
              <code style={styles.instructions.code}>
                /public/stories/{slug || '[slug]'}.json
              </code>
              Colle-y le JSON et sauvegarde.
            </div>

            <div style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.65)' }}>
              <strong style={{ color: 'rgba(255,255,255,0.85)' }}>3.</strong>{' '}
              Si c'est une nouvelle histoire, ajoute-la dans :
              <code style={styles.instructions.code}>
                /public/stories/index.json
              </code>
              Format d'une entrée :
              <code style={styles.instructions.code}>
                {`{ "id": "${slug || '[slug]'}", "title": "${title || '[titre]'}", "author": "${author || '[auteur]'}" }`}
              </code>
            </div>

            <div style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.65)' }}>
              <strong style={{ color: 'rgba(255,255,255,0.85)' }}>4.</strong>{' '}
              Dans le terminal, lance :
              <code style={{
                ...styles.instructions.code,
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                git add . && git commit -m "story: {title}" && git push
              </code>
            </div>

            <div style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
              <strong style={{ color: 'rgba(255,255,255,0.7)' }}>5.</strong>{' '}
              Vercel redéploie automatiquement. Ton histoire sera en ligne dans ~30 secondes.
            </div>
          </div>
        )}
      </div>

      {/* Bouton nouvelle histoire */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleNewStoryClick}
          style={styles.button.newStory}
        >
          ↩ Nouvelle histoire
        </button>
      </div>

      {/* Dialog de confirmation pour nouvelle histoire */}
      {showNewStoryConfirm && (
        <div style={styles.confirmDialog.overlay} onClick={handleCancelNewStory}>
          <div style={styles.confirmDialog.dialog} onClick={e => e.stopPropagation()}>
            <div style={styles.confirmDialog.title}>
              Commencer une nouvelle histoire ?
            </div>
            <div style={styles.confirmDialog.text}>
              Les modifications non sauvegardées seront perdues.
            </div>
            <div style={styles.confirmDialog.buttons}>
              <button
                onClick={handleSaveAndNewStory}
                style={styles.confirmDialog.buttonPrimary}
              >
                Sauvegarder d'abord
              </button>
              <button
                onClick={handleContinueWithoutSave}
                style={styles.confirmDialog.buttonSecondary}
              >
                Continuer sans sauvegarder
              </button>
              <button
                onClick={handleCancelNewStory}
                style={styles.confirmDialog.buttonCancel}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PublishPanel
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { segmentText } from '../utils/segmentAlgorithm'
import { Howl } from 'howler'
import UnifiedSegmentsTimeline from '../components/admin/UnifiedSegmentsTimeline'
import DraftManager from '../components/admin/DraftManager'
import StoryLoader from '../components/admin/StoryLoader'
import StoryPreviewModal from '../components/admin/StoryPreviewModal'
import PublishPanel from '../components/admin/PublishPanel'

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  // États pour la section "Créer une nouvelle histoire"
  const [storyTitle, setStoryTitle] = useState('')
  const [storyAuthor, setStoryAuthor] = useState('')
  const [storySlug, setStorySlug] = useState('')
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

  // Charger la bibliothèque sonore au montage
  useEffect(() => {
    fetch('/sounds/sounds-index.json')
      .then(res => res.json())
      .then(data => setSoundLibrary(data))
      .catch(err => console.error('Erreur chargement bibliothèque sonore:', err))
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
      
      saveToHistory(newSegments)
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
      const key = e.key.toLowerCase()

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

  const saveToHistory = (newSegments) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(newSegments)))
    
    // Limiter la taille de l'historique
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

    const segmentToCut = segments[index];
    if (cursorPosition === 0 || cursorPosition >= segmentToCut.length) {
      alert("La position de coupe doit être à l'intérieur du texte du segment.");
      return;
    }

    setSegments(prevSegments => {
      const newSegments = [...prevSegments];
      const part1 = segmentToCut.substring(0, cursorPosition);
      const part2 = segmentToCut.substring(cursorPosition);
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
      setHistoryIndex(historyIndex - 1)
      setSegments(JSON.parse(JSON.stringify(history[historyIndex - 1])))
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setSegments(JSON.parse(JSON.stringify(history[historyIndex + 1])))
    }
  }

  const handleCutText = () => {
    setCutError('');
    setIsCutting(true);
    setSegments([]);

    try {
      console.log("Début découpage - texte:", storyText.substring(0, 100) + "...");
      console.log("Granularité:", granularity);
      
      // Utiliser l'algorithme local au lieu de l'API Gemini
      const result = segmentText(storyText, granularity);
      
      console.log("Découpage terminé - nombre de segments:", result.length);
      console.log("Premiers segments:", result.slice(0, 3));
      
      if (result.length === 0) {
        setCutError("Aucun segment n'a été généré. Vérifiez votre texte.");
      } else {
        setSegments(result);
        saveToHistory(result)
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
    setSegments(snapshot.segments || [])
    setSoundTracks(snapshot.soundTracks || [])
    // Scroll vers l'éditeur
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  // Charger une histoire depuis StoryLoader
  const handleLoadStory = (storyData) => {
    setStoryTitle(storyData.title || '')
    setStoryAuthor(storyData.author || '')
    setStorySlug(storyData.slug || '')
    setSegments(storyData.segments || [])
    setSoundTracks(storyData.soundTracks || [])
    
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

  // Construire les données pour l'aperçu en temps réel
  const getCurrentStoryData = () => {
    const usedSoundIds = new Set(
      soundTracks.filter(t => !t.muted).map(t => t.soundId)
    )
    const sounds = soundLibrary.filter(s => usedSoundIds.has(s.id))
    
    return {
      title: storyTitle || 'Sans titre',
      author: storyAuthor || 'Anonyme',
      segments: segments.map((seg, i) => ({
        ...seg,
        text: typeof seg === 'string' ? seg : seg.text || '',
        audioEvents: seg.audioEvents || []
      })),
      soundTracks: soundTracks,
      sounds: sounds
    }
  }

  // Réinitialiser pour une nouvelle histoire
  const handleNewStory = () => {
    setStoryTitle('')
    setStoryAuthor('')
    setStorySlug('')
    setStoryText('')
    setSegments([])
    setSoundTracks([])
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
      {/* 1. DraftManager (barre de statut sticky) */}
      <DraftManager
        title={storyTitle}
        author={storyAuthor}
        slug={storySlug}
        segments={segments}
        soundTracks={soundTracks}
        onRestore={handleRestoreSnapshot}
        onOpenPreview={() => setIsPreviewOpen(true)}
      />

      {/* Contenu principal */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        paddingBottom: '4rem',
        flex: 1
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '800px'
        }}>
          {/* 2. StoryLoader (section collapsible) */}
          <StoryLoader
            onLoadStory={handleLoadStory}
            onPreviewStory={handlePreviewStory}
          />

          {/* 3. Section "Créer / Éditer" */}
          <div style={{
            padding: '2rem',
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
                onChange={(e) => setStoryTitle(e.target.value)}
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <input
                type="text"
                placeholder="Auteur de l'histoire"
                value={storyAuthor}
                onChange={(e) => setStoryAuthor(e.target.value)}
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <input
                type="text"
                placeholder="ID / Slug (ex: la-parure)"
                value={storySlug}
                onChange={(e) => setStorySlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''))}
                style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
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
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
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
                    flex: 1
                  }}
                >
                  {isCutting ? "Découpage en cours..." : "Découper le texte"}
                </button>
                
                {/* Boutons Undo/Redo */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    style={{
                      padding: '0.75rem 1rem',
                      fontSize: '1rem',
                      backgroundColor: historyIndex > 0 ? '#6c757d' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: historyIndex > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Annuler (Cmd+Z)"
                  >
                    ↩
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    style={{
                      padding: '0.75rem 1rem',
                      fontSize: '1rem',
                      backgroundColor: historyIndex < history.length - 1 ? '#6c757d' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: historyIndex < history.length - 1 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Rétablir (Cmd+Shift+Z)"
                  >
                    ↪
                  </button>
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
                  <div style={{ 
                    marginTop: '2rem', 
                    borderTop: '1px solid #eee', 
                    paddingTop: '1.5rem'
                  }}>
                    <div style={{ height: '600px', marginBottom: '2rem' }}>
                      <UnifiedSegmentsTimeline
                        segments={segments}
                        soundTracks={soundTracks}
                        soundLibrary={soundLibrary}
                        onSegmentsChange={setSegments}
                        onSoundTracksChange={setSoundTracks}
                        onSaveToHistory={() => saveToHistory(segments)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 4. PublishPanel */}
          <PublishPanel
            title={storyTitle}
            author={storyAuthor}
            slug={storySlug}
            segments={segments}
            soundTracks={soundTracks}
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

      {/* StoryPreviewModal */}
      <StoryPreviewModal
        isOpen={isPreviewOpen}
        storyData={previewStoryData || getCurrentStoryData()}
        onClose={() => setIsPreviewOpen(false)}
      />

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
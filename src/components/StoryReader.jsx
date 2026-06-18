import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react'
import './StoryReader.css'
import { renderMarkdown } from '../utils/renderMarkdown'
import { applyEmojiMode } from '../utils/emojiDict.jsx'
import { getVfxClass } from './admin/constants'
import hapticEngine from '../engine/HapticEngine'
import VfxOverlay from './VfxOverlay'
import { NarrativeMemoryContext } from '../utils/inlineFunctions'

// ── Flash plein écran ──
const FLASH_SPEED = { lent: 2000, moyen: 1000, rapide: 400 }

function getFlashColor(color, isDark) {
  // Si la couleur est blanche et qu'on est en mode clair → on remplace par noir
  const isWhite = color && color.toLowerCase().includes('255, 255, 255')
  if (isWhite && !isDark) return 'rgba(0, 0, 0, 0.12)'
  return color
}

// ── Typewriter : délais par mode ──
const TW_DELAY = { lent: 80, normal: 45, rapide: 20 }

// ── Erased : ratio de lettres effacées par mode ──
const ERASED_RATIO = { faible: 0.2, normal: 0.4, intense: 0.65 }

// ── Static : groupes de caractères par largeur visuelle similaire ──
const STATIC_CHAR_GROUPS = {
  narrow:  Array.from('ilI1j!|.:,;'),
  medium:  Array.from('acemnorsuvxz023456789'),
  wide:    Array.from('ABCDEFGHJKLMNOPQRSTUVXYZ&%'),
}
// Choisit un caractère de remplacement de largeur similaire à l'original
function getSimilarChar(original) {
  const narrow = 'ilI1j!|.:,;'
  const wide   = 'ABCDEFGHJKLMNOPQRSTUVXYZ&%'
  if (narrow.includes(original)) {
    const g = STATIC_CHAR_GROUPS.narrow
    return g[Math.floor(Math.random() * g.length)]
  } else if (wide.includes(original)) {
    const g = STATIC_CHAR_GROUPS.wide
    return g[Math.floor(Math.random() * g.length)]
  } else {
    const g = STATIC_CHAR_GROUPS.medium
    return g[Math.floor(Math.random() * g.length)]
  }
}
const STATIC_INTERVALS = { } // stocke les intervals actifs par segment

function renderStatic(text, containerId) {
  // Nettoyer l'interval précédent si existe
  if (STATIC_INTERVALS[containerId]) {
    clearInterval(STATIC_INTERVALS[containerId])
    delete STATIC_INTERVALS[containerId]
  }
  // Rendre chaque lettre dans un span avec data-original
  return Array.from(text).map((char, i) => (
    <span
      key={i}
      className="vfx-static-letter"
      data-original={char}
      data-index={i}
    >
      {char}
    </span>
  ))
}

function renderErased(text, mode) {
  const ratio = ERASED_RATIO[mode] ?? 0.4
  const letters = Array.from(text)
  // Seed pseudo-aléatoire basé sur le texte pour que ce soit stable entre renders
  let seed = text.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 0xffffffff
  }
  return letters.map((char, i) => {
    const isSpace = char === ' '
    const hide = !isSpace && rand() < ratio
    return hide
      ? <span key={i} className="vfx-er-hidden">{char}</span>
      : <span key={i}>{char}</span>
  })
}

function renderTypewriter(text, mode) {
  const delay = TW_DELAY[mode] ?? 45
  const letters = Array.from(text)
  const lastDelay = (letters.length - 1) * delay
  return [
    ...letters.map((char, i) => (
      <span
        key={i}
        className="vfx-tw-letter"
        style={{ animationDelay: `${i * delay}ms` }}
      >
        {char}
      </span>
    )),
    <span
      key="cursor"
      className="vfx-tw-cursor"
      style={{ animationDelay: `${lastDelay}ms` }}
    >
      ▋
    </span>
  ]
}
// ── Bionic Reading : met en gras les N premières lettres de chaque mot ──
function applyBionicReading(text) {
  if (!text) return null
  // Découpe sur les espaces en préservant les séparateurs
  const tokens = text.split(/(\s+)/)
  return tokens.map((token, i) => {
    // Les espaces et tokens vides passent tels quels
    if (/^\s*$/.test(token)) return token
    // Ponctuation seule : pas de mise en gras
    if (/^[^\wÀ-ÿ]+$/.test(token)) return token
    const len = token.length
    let boldCount
    if (len <= 3)       boldCount = 1
    else if (len <= 6)  boldCount = 2
    else if (len <= 9)  boldCount = 3
    else                boldCount = Math.round(len * 0.45)
    const boldPart  = token.slice(0, boldCount)
    const normalPart = token.slice(boldCount)
    return (
      <span key={i}>
        <strong style={{ fontWeight: 800 }}>{boldPart}</strong>
        <span style={{ fontWeight: 400, opacity: 0.82 }}>{normalPart}</span>
      </span>
    )
  })
}

function StoryReader({ storyId, storyData, currentIndex = 0, jumpPhase = 'idle', viewportHeight }) {
  const segments = storyData ? storyData.segments : []
  const [loadedStory, setLoadedStory] = useState(null)

  // ── Mémoire narrative (sessionStorage isolé par histoire) ──────────────────
  // Chaque histoire a son propre namespace : ili_mem_{storyId}_{clé}
  // Réinitialisé à chaque nouvelle lecture (nouveau mount du composant).
  const storyId_ = storyId || storyData?.id || 'default'
  const memoryRef = useRef({})
  const narrativeMemory = useMemo(() => ({
    read: (key, def) => {
      // 1. Chercher dans le state en mémoire (le plus à jour)
      if (memoryRef.current[key] !== undefined) return memoryRef.current[key]
      // 2. Fallback sessionStorage (survit aux re-renders)
      try {
        const val = sessionStorage.getItem(`ili_mem_${storyId_}_${key}`)
        if (val !== null) return val
      } catch {}
      return def
    },
    write: (key, val) => {
      memoryRef.current[key] = val
      try { sessionStorage.setItem(`ili_mem_${storyId_}_${key}`, val) } catch {}
    },
  }), [storyId_])
  // ── Progression verticale ──
  const [showProgress, setShowProgress] = useState(() => {
    try { return localStorage.getItem('ili_show_progress') !== 'false' } catch { return true }
  })
  const [themeKey, setThemeKey] = useState(0)
  // ── Lire les options DYS depuis window (mis à jour par ReaderSettings) ──
  const [dys1, setDys1] = useState(() => {
    try { return localStorage.getItem('ili_dys1') === 'true' } catch { return false }
  })
  const [dys2, setDys2] = useState(() => {
    try { return localStorage.getItem('ili_dys2') === 'true' } catch { return false }
  })
  const [emojiMode, setEmojiMode] = useState(() => {
    try { return localStorage.getItem('ili_emoji') === 'true' } catch { return false }
  })
  // Écouter les changements de DYS + progression en temps réel (via polling léger)
  useEffect(() => {
    const interval = setInterval(() => {
      const d1 = window.__iliDys1 ?? (localStorage.getItem('ili_dys1') === 'true')
      const d2 = window.__iliDys2 ?? (localStorage.getItem('ili_dys2') === 'true')
      const em = window.__iliEmoji ?? (localStorage.getItem('ili_emoji') === 'true')
      const sp = window.__iliShowProgress ?? (localStorage.getItem('ili_show_progress') !== 'false')
      setDys1(prev => prev !== d1 ? d1 : prev)
      setDys2(prev => prev !== d2 ? d2 : prev)
      setEmojiMode(prev => prev !== em ? em : prev)
      setShowProgress(prev => prev !== sp ? sp : prev)
      const theme = localStorage.getItem('ili_theme') || ''
      setThemeKey(prev => {
        const next = theme
        return prev !== next ? next : prev
      })
    }, 150)
    return () => clearInterval(interval)
  }, [])

  useLayoutEffect(() => {
    if (storyData || !storyId) return
    let isCancelled = false
    async function loadStory() {
      try {
        const response = await fetch(`/stories/${storyId}.json`)
        if (!response.ok) { console.error(`Erreur chargement histoire: ${storyId}`); return }
        const data = await response.json()
        if (!isCancelled) setLoadedStory(data)
      } catch (err) { console.error('Erreur chargement histoire:', err) }
    }
    loadStory()
    return () => { isCancelled = true }
  }, [storyId, storyData])

  const rawSegments = storyData ? segments : loadedStory ? loadedStory.segments || [] : segments

  const normalizeSegment = (segment, index) => {
    if (segment && typeof segment.text === 'string') return segment
    if (segment && typeof segment === 'object') {
      const numericKeys = Object.keys(segment).filter((key) => String(Number(key)) === key)
      if (numericKeys.length) {
        const text = numericKeys.sort((a, b) => Number(a) - Number(b)).map((key) => segment[key]).join('')
        return { id: segment.id ?? index, text, audioEvents: segment.audioEvents || [], ...segment }
      }
    }
    return { id: segment?.id ?? index, text: '', audioEvents: segment?.audioEvents || [], ...segment }
  }

  const finalSegments = rawSegments.map(normalizeSegment)

  // ── Quel chapitre est pertinent pour l'affichage ? ──
  // "focused" : le segment actif est lui-même un chapitre
  // "sticky"  : le segment actif est exactement chapterIndex + 1
  // "gone"    : chapterIndex + 2 ou au-delà → on n'affiche plus rien
  let chapterSegment = null
  let chapterMode = 'gone' // 'focused' | 'sticky' | 'gone'

  if (finalSegments[currentIndex]?.isChapter) {
    chapterSegment = finalSegments[currentIndex]
    chapterMode = 'focused'
  } else if (finalSegments[currentIndex - 1]?.isChapter) {
    chapterSegment = finalSegments[currentIndex - 1]
    chapterMode = 'sticky'
  }

  // ── Calcul des segments cachés ──
  const hiddenFromView = new Set()

  // Chapitre actif → tout masquer sauf lui (Leader + Finisher)
  if (chapterMode === 'focused') {
    for (let i = 0; i < finalSegments.length; i++) {
      if (i !== currentIndex) hiddenFromView.add(i)
    }
  } else {
    let currentLeaderIndex = -1
    for (let i = currentIndex; i >= 0; i--) {
      if (finalSegments[i]?.isLeader) { currentLeaderIndex = i; break }
    }
    if (currentLeaderIndex > 0) {
      for (let i = 0; i < currentLeaderIndex; i++) hiddenFromView.add(i)
    }
    // Trouver le finisher de la séquence courante (le segment juste avant le prochain Leader)
    // Il faut masquer tout ce qui est après ce finisher, quel que soit le segment actif
    let sequenceFinisherIndex = -1
    for (let i = currentLeaderIndex !== -1 ? currentLeaderIndex : 0; i < finalSegments.length - 1; i++) {
      if (finalSegments[i + 1]?.isLeader === true) {
        sequenceFinisherIndex = i
        break
      }
    }
    if (sequenceFinisherIndex !== -1) {
      for (let i = sequenceFinisherIndex + 1; i < finalSegments.length; i++) hiddenFromView.add(i)
    }
  }

  // ── Haptique ──
  useEffect(() => {
    if (!storyData?.vfxTracks) { hapticEngine.stop(); return }
    const activeHapticPattern = storyData.vfxTracks
      .filter(t => t.hapticPattern)
      .find(t => {
        const segs = storyData.segments || []
        const si = segs.findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
        const ei = segs.findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
        const end = ei !== -1 ? ei : si
        return si <= currentIndex && currentIndex <= end
      })
    if (activeHapticPattern) hapticEngine.play(activeHapticPattern.hapticPattern)
    else hapticEngine.stop()
    return () => { hapticEngine.stop() }
  }, [currentIndex, storyData])

  const segmentRefs = useRef([])
  const trackRef = useRef(null)
  const chapterFloatRef = useRef(null)
  const introAppliedRef = useRef(false)
  const prevChapterModeRef = useRef(null)
  useEffect(() => {
    const prev = prevChapterModeRef.current
    prevChapterModeRef.current = chapterMode
    if (prev === 'focused' && chapterMode === 'sticky') {
      if (chapterFloatRef.current) {
        chapterFloatRef.current.classList.remove('story-reader__chapter-float--intro')
      }
      // Masquer immédiatement via CSS variable (pas de flash possible)
      if (trackRef.current) {
        trackRef.current.style.setProperty('--track-opacity', '0')
        trackRef.current.style.setProperty('transition', 'none')
        setTimeout(() => {
          if (trackRef.current) {
            trackRef.current.style.removeProperty('transition')
            trackRef.current.style.setProperty('--track-opacity', '1')
          }
        }, 300)
      }
    }
  }, [chapterMode])

  useEffect(() => {
    if (introAppliedRef.current || finalSegments.length === 0) return
    introAppliedRef.current = true
    const isChapterFirst = finalSegments[0]?.isChapter === true
    if (isChapterFirst && chapterFloatRef.current) {
      chapterFloatRef.current.classList.add('story-reader__chapter-float--intro')
    } else if (!isChapterFirst && trackRef.current) {
      trackRef.current.classList.add('story-reader__track--intro')
    }
  }, [finalSegments])
  const [translateY, setTranslateY] = useState(0)

  // ── Static : animation des lettres parasitées ──
  const staticIntervalRef = useRef(null)

  useEffect(() => {
    // Nettoyer l'interval précédent
    if (staticIntervalRef.current) {
      clearInterval(staticIntervalRef.current)
      staticIntervalRef.current = null
    }

    const staticTrack = storyData?.vfxTracks?.find(t => {
      if (t.type !== 'static') return false
      const segs = storyData.segments || []
      const si = segs.findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
      const ei = segs.findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
      const te = ei !== -1 ? ei : si
      return si <= currentIndex && currentIndex <= te
    })

    if (!staticTrack) return

    // Fréquence d'animation selon mode (ms entre chaque perturbation)
    const TICK = 80

    staticIntervalRef.current = setInterval(() => {
      const focusedNode = segmentRefs.current[currentIndex]
      if (!focusedNode) return
      const letters = focusedNode.querySelectorAll('.vfx-static-letter')
      if (!letters.length) return

      const count = letters.length

      // Nombre de lettres à perturber simultanément — très réduit
      const nbGlitch  = 1
      const nbFlicker = 1

      // ── Glitch : remplacer temporairement par un caractère aléatoire ──
      for (let i = 0; i < nbGlitch; i++) {
        const idx = Math.floor(Math.random() * count)
        const span = letters[idx]
        const original = span.dataset.original
        if (!original || original === ' ' || original === '\n') continue

        const replacement = getSimilarChar(original)
        span.textContent = replacement
        span.style.opacity = '0.7'

        // Restaurer après un délai très court
        setTimeout(() => {
          if (span) {
            span.textContent = original
            span.style.opacity = ''
          }
        }, 40 + Math.random() * 80)
      }

      // ── Flicker : faire clignoter brièvement une lettre ──
      for (let i = 0; i < nbFlicker; i++) {
        const idx = Math.floor(Math.random() * count)
        const span = letters[idx]
        const original = span.dataset.original
        if (!original || original === ' ') continue

        span.style.opacity = '0'
        setTimeout(() => {
          if (span) span.style.opacity = ''
        }, 30 + Math.random() * 60)
      }

    }, TICK)

    return () => {
      if (staticIntervalRef.current) {
        clearInterval(staticIntervalRef.current)
        staticIntervalRef.current = null
      }
      // Restaurer toutes les lettres au nettoyage
      const focusedNode = segmentRefs.current[currentIndex]
      if (focusedNode) {
        focusedNode.querySelectorAll('.vfx-static-letter').forEach(span => {
          span.textContent = span.dataset.original || span.textContent
          span.style.opacity = ''
        })
      }
    }
  }, [currentIndex, storyData])

  // ── Track d'ambiance actif (fog, rain, snow, etc.) ──
  const AMBIANCE_TYPES = ['fog', 'fire', 'rain', 'snow', 'underwater', 'sun']
  const activeAmbianceTrack = (() => {
    if (!storyData?.vfxTracks) return null
    return storyData.vfxTracks.find(t => {
      if (!AMBIANCE_TYPES.includes(t.type)) return false
      const segs = storyData.segments || []
      const si = segs.findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
      const ei = segs.findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
      const te = ei !== -1 ? ei : si
      return si <= currentIndex && currentIndex <= te
    }) ?? null
  })()

  // ── Overlay flash plein écran ──
  const flashOverlayRef = useRef(null)

  useEffect(() => {
    const flashTrack = storyData?.vfxTracks?.find(t => {
      if (t.type !== 'flash') return false
      const segs = storyData.segments || []
      const si = segs.findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
      const ei = segs.findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
      const te = ei !== -1 ? ei : si
      return si <= currentIndex && currentIndex <= te
    })

    const overlay = flashOverlayRef.current
    if (!overlay) return

    if (flashTrack) {
      const isDark = (() => {
        try { return JSON.parse(localStorage.getItem('ili_theme') || '{}').isDark !== false } catch { return true }
      })()
      const color = getFlashColor(flashTrack.color, isDark)
      const duration = FLASH_SPEED[flashTrack.mode] ?? 1000
      overlay.style.setProperty('--flash-color', color)
      overlay.style.setProperty('--flash-duration', `${duration}ms`)
      overlay.style.transition = 'opacity 400ms ease-in'
      overlay.style.opacity = '1'
      overlay.style.display = 'block'
    } else {
      overlay.style.transition = 'opacity 900ms ease-out'
      overlay.style.opacity = '0'
      setTimeout(() => {
        if (overlay.style.opacity === '0') overlay.style.display = 'none'
      }, 900)
    }
  }, [currentIndex, storyData])
  
      // Hauteur réservée pour le spacer (sticky ou focused → même hauteur)
  const STICKY_HEIGHT = 56 // px — doit correspondre au padding du sticky dans le CSS

  useLayoutEffect(() => {
    function computeTranslate() {
      if (chapterMode === 'focused') { setTranslateY(0); return }

      const focusedNode = segmentRefs.current[currentIndex]
      if (!focusedNode) return

      const vh = viewportHeight || window.innerHeight
      // On réserve toujours STICKY_HEIGHT quand un chapitre est visible (focused ou sticky)
      // Ça évite le saut quand on passe de sticky à gone
      const reservedH = chapterMode !== 'gone' ? STICKY_HEIGHT : 0
      const availableH = vh - reservedH
      const PADDING = 28

      let leaderIndex = -1
      for (let i = currentIndex; i >= 0; i--) {
        if (finalSegments[i]?.isLeader) { leaderIndex = i; break }
      }
      let finisherIndex = finalSegments.length - 1
      if (leaderIndex !== -1) {
        for (let i = leaderIndex + 1; i < finalSegments.length; i++) {
          if (finalSegments[i]?.isLeader) { finisherIndex = i - 1; break }
        }
      }

      const sequenceLength = finisherIndex - leaderIndex
      let anchorFraction = 0.42
      if (leaderIndex !== -1 && sequenceLength > 0) {
        const t = Math.max(0, Math.min(1, (currentIndex - leaderIndex) / sequenceLength))
        anchorFraction = 0.42 + 0.26 * Math.pow(2 * t - 1, 3)
      }

      const anchorY = availableH * anchorFraction
      const focusedCenterY = focusedNode.offsetTop + focusedNode.offsetHeight / 2
      const desiredTranslateY = anchorY - focusedCenterY

      const minTranslateY = PADDING - focusedNode.offsetTop
      const maxTranslateY = availableH - PADDING - focusedNode.offsetTop - focusedNode.offsetHeight
      let nextTranslateY
      if (minTranslateY > maxTranslateY) {
        nextTranslateY = minTranslateY
      } else {
        nextTranslateY = Math.max(minTranslateY, Math.min(maxTranslateY, desiredTranslateY))
      }
      setTranslateY(nextTranslateY)
    }

    const rafId = requestAnimationFrame(computeTranslate)
    window.addEventListener('resize', computeTranslate)

    const observer = new MutationObserver(() => {
      requestAnimationFrame(computeTranslate)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', computeTranslate)
      observer.disconnect()
    }
    }, [finalSegments, currentIndex, chapterMode])

    return (
    <NarrativeMemoryContext.Provider value={narrativeMemory}>
    <>
    <VfxOverlay
      activeType={activeAmbianceTrack?.type ?? null}
      activeMode={activeAmbianceTrack?.mode ?? null}
      isDark={true}
    />
    {showProgress && finalSegments.length > 0 && (
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '4px',
          height: '100vh',
          zIndex: 200,
          pointerEvents: 'none',
          backgroundColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <div
          style={{
            width: '100%',
            minHeight: '6px',
            height: finalSegments.length > 1
              ? `${Math.max(0.5, (currentIndex / (finalSegments.length - 1)) * 100)}%`
              : '100%',
            backgroundColor: 'rgba(255,255,255,0.22)',
            transition: 'height 400ms cubic-bezier(0.1, 0.0, 0.1, 1.0)',
          }}
        />
      </div>
    )}
    <div
        ref={flashOverlayRef}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          pointerEvents: 'none',
          backgroundColor: 'transparent',
        }}
        className="vfx-flash-overlay"
      />

    <main
      className="story-reader"
      aria-live="polite"
      onWheel={(e) => {
        // Laisser passer le scroll si la cible est le segment focusé
        const focused = e.currentTarget.querySelector('.story-reader__segment--focus')
        if (focused && focused.contains(e.target)) return
        e.stopPropagation()
        e.preventDefault()
      }}
      onTouchMove={(e) => {
        const focused = e.currentTarget.querySelector('.story-reader__segment--focus')
        if (focused && focused.contains(e.target)) return
        e.stopPropagation()
      }}
      style={{
        filter: jumpPhase === 'out' ? 'blur(12px)' : 'blur(0px)',
        opacity: jumpPhase === 'out' ? 0 : 1,
        transition: jumpPhase === 'out'
          ? 'filter 200ms ease-in, opacity 300ms ease-in 200ms'
          : jumpPhase === 'in'
            ? 'opacity 350ms ease-out, filter 700ms ease-out 200ms'
            : 'none',
        fontFamily: dys2 ? "'Lexend', sans-serif" : undefined,
      }}
    >
      {/*
        ── CHAPITRE FLOTTANT ──
        Élément unique, position absolute, deux états CSS :
        - data-mode="focused" → centré, grand
        - data-mode="sticky"  → en haut, petit, avec trait
        La transition CSS anime le déplacement entre les deux états.
        Absent uniquement quand chapterMode === 'gone'.
      */}
      {chapterSegment && (
        <div
          ref={chapterFloatRef}
          className="story-reader__chapter-float"
          data-mode={chapterMode}
          key={chapterSegment.id}
        >
          <span className="story-reader__chapter-float-text">
            {chapterSegment.text}
          </span>
          <div className="story-reader__chapter-float-line" />
        </div>
      )}

      {/*
        ── SPACER ──
        Réserve la hauteur du sticky en permanence tant qu'un chapitre
        est visible (focused ou sticky). Évite le saut d'ancrage au
        passage sticky → gone.
        Quand focused : le spacer est là mais le track est invisible.
        Quand sticky  : le spacer pousse le track sous le chapitre flottant.
        Quand gone    : le spacer disparaît progressivement.
      */}
      <div
        className="story-reader__chapter-spacer"
        data-mode={chapterMode}
      />

      {/* ── TRACK ── */}
      <div
        ref={trackRef}
        className={[
          'story-reader__track',
          chapterMode === 'focused' ? 'story-reader__track--hidden' : '',
        ].join(' ')}
        style={{
          '--track-translate-y': `${translateY}px`,
          transition: jumpPhase !== 'idle' ? 'none' : undefined,
        }}
      >
        {finalSegments.map((segment, index) => {
          const isFocused = index === currentIndex
          const isHidden = hiddenFromView.has(index) || segment.isChapter

          return (
            <p
              key={segment.id}
              ref={(node) => { segmentRefs.current[index] = node }}
              className={[
                'story-reader__segment',
                (segment.isChapter && chapterMode === 'sticky') ? 'story-reader__segment--chapter-in-track' : '',
                isFocused
                  ? 'story-reader__segment--focus'
                  : isHidden
                    ? ''
                    : Math.abs(index - currentIndex) === 1
                      ? 'story-reader__segment--blur-near'
                      : Math.abs(index - currentIndex) === 2
                        ? 'story-reader__segment--blur-mid'
                        : 'story-reader__segment--blur',
                isHidden ? 'story-reader__segment--hidden' : '',
                ...(() => {
                  if (!isFocused || !storyData?.vfxTracks) return []
                  return storyData.vfxTracks
                    .filter(t => {
                      const si = (storyData.segments || []).findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
                      const ei = (storyData.segments || []).findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
                      const te = ei !== -1 ? ei : si
                      return si <= index && index <= te
                    })
                    .map(t => getVfxClass(t))
                    .filter(Boolean)
                })(),
              ].join(' ')}
              style={{
                fontFamily: segment.fontFamily || 'inherit',
                ...(segment.isChapter ? { textAlign: 'center' } : {}),
                ...(isHidden ? { pointerEvents: 'none' } : {}),
                ...(isFocused ? { touchAction: 'pan-y' } : {}),
                ...((() => {
                  if (!isFocused || !storyData?.vfxTracks) return {}
                  const flashTrack = storyData.vfxTracks.find(t => {
                    if (t.type !== 'flash') return false
                    const si = (storyData.segments || []).findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
                    const ei = (storyData.segments || []).findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
                    const te = ei !== -1 ? ei : si
                    return si <= index && index <= te
                  })
                  return flashTrack ? { '--vfx-flash-color': flashTrack.color } : {}
                })()),
              }}
              data-vfx-text={segment.text}
            >
              {(() => {
                // ── Typewriter actif sur ce segment ? ──
                const twTrack = isFocused && storyData?.vfxTracks
                  ? storyData.vfxTracks.find(t => {
                      if (t.type !== 'typewriter') return false
                      const si = (storyData.segments || []).findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
                      const ei = (storyData.segments || []).findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
                      const te = ei !== -1 ? ei : si
                      return si <= index && index <= te
                    })
                  : null

                if (twTrack) {
                  return renderTypewriter(segment.text, twTrack.mode)
                }

                // ── Static actif sur ce segment ? ──
                const staticTrack = isFocused && storyData?.vfxTracks
                  ? storyData.vfxTracks.find(t => {
                      if (t.type !== 'static') return false
                      const si = (storyData.segments || []).findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
                      const ei = (storyData.segments || []).findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
                      const te = ei !== -1 ? ei : si
                      return si <= index && index <= te
                    })
                  : null

                if (staticTrack) {
                  return renderStatic(segment.text, `seg_${index}`)
                }

                // ── Erased actif sur ce segment ? ──
                const erasedTrack = isFocused && storyData?.vfxTracks
                  ? storyData.vfxTracks.find(t => {
                      if (t.type !== 'erased') return false
                      const si = (storyData.segments || []).findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
                      const ei = (storyData.segments || []).findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
                      const te = ei !== -1 ? ei : si
                      return si <= index && index <= te
                    })
                  : null

                if (erasedTrack) {
                  return renderErased(segment.text, erasedTrack.mode)
                }

                // ── Rendu normal ──
                if (segment.breakAt != null && segment.breakAt > 0 && segment.breakAt < segment.text?.length) {
                  return (
                    <>
                      {emojiMode
                        ? applyEmojiMode(segment.text.slice(0, segment.breakAt).trim())
                        : dys1
                          ? applyBionicReading(segment.text.slice(0, segment.breakAt).trim())
                          : renderMarkdown(segment.text.slice(0, segment.breakAt).trim(), segment, false, { isFocused, keyPrefix: `s${index}a_` })}
                      <br /><br />
                      {emojiMode
                        ? applyEmojiMode(segment.text.slice(segment.breakAt).trim())
                        : dys1
                          ? applyBionicReading(segment.text.slice(segment.breakAt).trim())
                          : renderMarkdown(segment.text.slice(segment.breakAt).trim(), segment, false, { isFocused, keyPrefix: `s${index}b_` })}
                    </>
                  )
                }
                const lines = segment.text.split('\n')
                if (lines.length > 1) {
                  return lines.map((line, li) => (
                    <span key={li}>
                      {emojiMode
                        ? applyEmojiMode(line)
                        : dys1
                          ? applyBionicReading(line)
                          : renderMarkdown(line, segment, false, { isFocused, keyPrefix: `s${index}_l${li}_` })}
                      {li < lines.length - 1 && <br />}
                    </span>
                  ))
                }
                return emojiMode
                  ? applyEmojiMode(segment.text)
                  : dys1
                    ? applyBionicReading(segment.text)
                    : renderMarkdown(segment.text, segment, false, { isFocused, keyPrefix: `s${index}_t${themeKey}_` })
              })()}
            </p>
          )
        })}
      </div>
    </main>
   </>
    </NarrativeMemoryContext.Provider>
  )
}
export default StoryReader
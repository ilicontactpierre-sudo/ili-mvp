import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './StoryReader.css'
import { renderMarkdown } from '../utils/renderMarkdown'
import { getVfxClass } from './admin/constants'
import hapticEngine from '../engine/HapticEngine'

function StoryReader({ storyId, storyData, currentIndex = 0 }) {
  // MODE 2 — données directes en props (nouveau)
  // Quand storyData est fourni, ignore storyId et utilise ces données
  const segments = storyData ? storyData.segments : []
  const [loadedStory, setLoadedStory] = useState(null)

  // MODE 1 — chargement depuis fichier (comportement actuel)
  useLayoutEffect(() => {
    if (storyData || !storyId) return

    let isCancelled = false

    async function loadStory() {
      try {
        const response = await fetch(`/stories/${storyId}.json`)
        if (!response.ok) {
          console.error(`Erreur chargement histoire: ${storyId}`)
          return
        }
        const data = await response.json()
        if (!isCancelled) {
          setLoadedStory(data)
        }
      } catch (err) {
        console.error('Erreur chargement histoire:', err)
      }
    }

    loadStory()

    return () => {
      isCancelled = true
    }
  }, [storyId, storyData])

  // Utilise les segments du fichier chargé en mode 1
  const rawSegments = storyData
    ? segments
    : loadedStory
      ? loadedStory.segments || []
      : segments

  const normalizeSegment = (segment, index) => {
    if (segment && typeof segment.text === 'string') {
      return segment
    }

    if (segment && typeof segment === 'object') {
      const numericKeys = Object.keys(segment).filter((key) => String(Number(key)) === key)
      if (numericKeys.length) {
        const text = numericKeys
          .sort((a, b) => Number(a) - Number(b))
          .map((key) => segment[key])
          .join('')

        return {
          id: segment.id ?? index,
          text,
          audioEvents: segment.audioEvents || [],
          ...segment,
        }
      }
    }

    return {
      id: segment?.id ?? index,
      text: '',
      audioEvents: segment?.audioEvents || [],
      ...segment,
    }
  }

  const finalSegments = rawSegments.map(normalizeSegment)

  // Calcul Leader / Finisher pour le comportement visuel du player
  const isCurrentLeader = finalSegments[currentIndex]?.isLeader === true
  const isCurrentFinisher =
    currentIndex < finalSegments.length - 1 &&
    finalSegments[currentIndex + 1]?.isLeader === true

  const hiddenFromView = new Set()
  // Leader → cacher tous les segments au-dessus
  if (isCurrentLeader) {
    for (let i = 0; i < currentIndex; i++) hiddenFromView.add(i)
  }
  // Finisher → cacher le segment juste en dessous (le Leader suivant)
  if (isCurrentFinisher) {
    for (let i = currentIndex + 1; i < finalSegments.length; i++) {
      hiddenFromView.add(i)
    }
  }

  // ── Haptique : démarre/arrête la vibration selon le segment actif ──
  useEffect(() => {
    if (!storyData?.vfxTracks) {
      hapticEngine.stop()
      return
    }

    // Cherche un VFX actif sur le segment courant qui a un hapticPattern
    const activeHapticPattern = storyData.vfxTracks
      .filter(t => t.hapticPattern) // seulement les VFX avec un pattern défini
      .find(t => {
        const segs = storyData.segments || []
        const si = segs.findIndex(s => s.id === t.startSegmentId || s._id === t.startSegmentId)
        const ei = segs.findIndex(s => s.id === t.endSegmentId   || s._id === t.endSegmentId)
        const end = ei !== -1 ? ei : si
        return si <= currentIndex && currentIndex <= end
      })

    if (activeHapticPattern) {
      hapticEngine.play(activeHapticPattern.hapticPattern)
    } else {
      hapticEngine.stop()
    }

    // Nettoyage : si le composant est démonté pendant une vibration
    return () => { hapticEngine.stop() }
  }, [currentIndex, storyData])
  
  const segmentRefs = useRef([])
  const [translateY, setTranslateY] = useState(0)

  useLayoutEffect(() => {
    function computeTranslate() {
      const focusedNode = segmentRefs.current[currentIndex]
      if (!focusedNode) return

      const viewportHeight = window.innerHeight
      const PADDING = 28 // marge de sécurité haut/bas en px

      // ── Trouver la séquence narrative courante (Leader → Finisher) ──
      let leaderIndex = -1
      for (let i = currentIndex; i >= 0; i--) {
        if (finalSegments[i]?.isLeader) { leaderIndex = i; break }
      }

      // Finisher = segment juste avant le prochain Leader, ou dernier segment
      let finisherIndex = finalSegments.length - 1
      if (leaderIndex !== -1) {
        for (let i = leaderIndex + 1; i < finalSegments.length; i++) {
          if (finalSegments[i]?.isLeader) { finisherIndex = i - 1; break }
        }
      }

      // ── Calcul de la progression t ∈ [0, 1] dans la séquence ──
      const sequenceLength = finisherIndex - leaderIndex
      let anchorFraction = 0.50 // défaut : centre

      if (leaderIndex !== -1 && sequenceLength > 0) {
        const t = Math.max(0, Math.min(1,
          (currentIndex - leaderIndex) / sequenceLength
        ))
        // Courbe cubique (2t−1)³ : lente au centre, rapide aux extrémités
        // → le lecteur passe la majorité du temps proche du centre
        anchorFraction = 0.50 + 0.30 * Math.pow(2 * t - 1, 3)
      }

      // ── Calcul du translateY désiré ──
      const anchorY = viewportHeight * anchorFraction
      const focusedCenterY = focusedNode.offsetTop + focusedNode.offsetHeight / 2
      const desiredTranslateY = anchorY - focusedCenterY

      // ── Clamping : segment toujours entièrement visible ──
      const minTranslateY = PADDING - focusedNode.offsetTop
      const maxTranslateY = viewportHeight - PADDING - focusedNode.offsetTop - focusedNode.offsetHeight

      let nextTranslateY
      if (minTranslateY > maxTranslateY) {
        // Segment plus grand que l'écran : priorité au début du segment
        nextTranslateY = minTranslateY
      } else {
        nextTranslateY = Math.max(minTranslateY, Math.min(maxTranslateY, desiredTranslateY))
      }

      setTranslateY(nextTranslateY)
    }

    const rafId = requestAnimationFrame(computeTranslate)
    window.addEventListener('resize', computeTranslate)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', computeTranslate)
    }
  }, [finalSegments, currentIndex])

  return (
    <main className="story-reader" aria-live="polite">
      <div
        className="story-reader__track"
        style={{ '--track-translate-y': `${translateY}px` }}
      >
        {finalSegments.map((segment, index) => {
          const isFocused = index === currentIndex
          const isHidden = hiddenFromView.has(index)
          return (
            <p
            key={segment.id}
            ref={(node) => { segmentRefs.current[index] = node }}
            className={[
              'story-reader__segment',
              isFocused ? 'story-reader__segment--focus' : 'story-reader__segment--blur',
              isHidden ? 'story-reader__segment--hidden' : '',
              ...(() => {
                if (!isFocused || !storyData?.vfxTracks) return []
                const segId = segment.id || segment._id || String(index)
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
            {renderMarkdown(segment.text, segment)}
          </p>
          )
        })}
      </div>
    </main>
  )
}

export default StoryReader

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './StoryReader.css'
import { renderMarkdown } from '../utils/renderMarkdown'
import { getVfxClass } from './admin/constants'
import hapticEngine from '../engine/HapticEngine'

function StoryReader({ storyId, storyData, currentIndex = 0, jumpPhase = 'idle' }) {
  const segments = storyData ? storyData.segments : []
  const [loadedStory, setLoadedStory] = useState(null)

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
    const isCurrentFinisher =
      currentIndex < finalSegments.length - 1 &&
      finalSegments[currentIndex + 1]?.isLeader === true
    if (isCurrentFinisher) {
      for (let i = currentIndex + 1; i < finalSegments.length; i++) hiddenFromView.add(i)
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
  const [translateY, setTranslateY] = useState(0)
    const [introPhase, setIntroPhase] = useState('before')
    const introTriggeredRef = useRef(false)
    const isChapterFirst = finalSegments[0]?.isChapter === true
    const hasSegments = finalSegments.length > 0

    useEffect(() => {
    if (!hasSegments) return
    if (introTriggeredRef.current) return
    introTriggeredRef.current = true
    const t = setTimeout(() => setIntroPhase('animating'), 60)
    const t2 = setTimeout(() => setIntroPhase('done'), 60 + 1400)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [hasSegments])
      // Hauteur réservée pour le spacer (sticky ou focused → même hauteur)
  const STICKY_HEIGHT = 56 // px — doit correspondre au padding du sticky dans le CSS

  useLayoutEffect(() => {
    function computeTranslate() {
      if (chapterMode === 'focused') { setTranslateY(0); return }

      const focusedNode = segmentRefs.current[currentIndex]
      if (!focusedNode) return

      const viewportHeight = window.innerHeight
      // On réserve toujours STICKY_HEIGHT quand un chapitre est visible (focused ou sticky)
      // Ça évite le saut quand on passe de sticky à gone
      const reservedH = chapterMode !== 'gone' ? STICKY_HEIGHT : 0
      const availableH = viewportHeight - reservedH
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
        anchorFraction = 0.42 + 0.30 * Math.pow(2 * t - 1, 3)
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
    <main
      className="story-reader"
      aria-live="polite"
      style={{
        filter: jumpPhase === 'out' ? 'blur(12px)' : 'blur(0px)',
        opacity: jumpPhase === 'out' ? 0 : 1,
        transition: jumpPhase === 'out'
          ? 'filter 200ms ease-in, opacity 300ms ease-in 200ms'
          : jumpPhase === 'in'
            ? 'opacity 350ms ease-out, filter 700ms ease-out 200ms'
            : 'none',
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
          className={[
            'story-reader__chapter-float',
            isChapterFirst && introPhase === 'before' ? 'story-reader__chapter-float--intro-before' : '',
            isChapterFirst && introPhase === 'animating' ? 'story-reader__chapter-float--intro-animating' : '',
          ].join(' ')}
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
        className={[
          'story-reader__track',
          chapterMode === 'focused' ? 'story-reader__track--hidden' : '',
        ].join(' ')}
        style={{
          '--track-translate-y': `${translateY}px`,
          transition: jumpPhase !== 'idle' ? 'none' : undefined,
          ...(!isChapterFirst && introPhase === 'before' && hasSegments ? {
            opacity: 0,
            transform: `translate3d(0, calc(${translateY}px + 60px), 0)`,
          } : {}),
          ...(!isChapterFirst && introPhase === 'animating' ? {
            opacity: 1,
            transform: `translate3d(0, ${translateY}px, 0)`,
            transition: 'opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
          } : {}),
        }}
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
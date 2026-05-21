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

  // ── Quel chapitre est juste derrière nous (chapterIndex + 1 = currentIndex) ? ──
  const prevSegment = finalSegments[currentIndex - 1]
  const prevIsChapter = prevSegment?.isChapter === true
  const stickyChapter = prevIsChapter ? prevSegment : null

  // ── Le segment actif est-il lui-même un chapitre ? ──
  const chapterIsActive = finalSegments[currentIndex]?.isChapter === true

  // ── Calcul Leader / Finisher et segments cachés ──
  // Pour un chapitre actif : Leader + Finisher → tout caché sauf lui
  // Pour un chapitre en sticky (currentIndex = chapterIdx+1) : il n'est plus Finisher
  const hiddenFromView = new Set()

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

  // Chapitre actif → masquer tout sauf lui (Leader + Finisher)
  if (chapterIsActive) {
    for (let i = 0; i < finalSegments.length; i++) {
      if (i !== currentIndex) hiddenFromView.add(i)
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
  const stickyChapterRef = useRef(null)

  useLayoutEffect(() => {
    function computeTranslate() {
      // Chapitre actif : pas de translate, il est centré via CSS
      if (chapterIsActive) { setTranslateY(0); return }

      const focusedNode = segmentRefs.current[currentIndex]
      if (!focusedNode) return

      const viewportHeight = window.innerHeight
      const stickyH = stickyChapterRef.current ? stickyChapterRef.current.offsetHeight : 0
      const availableH = viewportHeight - stickyH
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
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', computeTranslate) }
  }, [finalSegments, currentIndex, chapterIsActive])

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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── STICKY CHAPTER (uniquement quand currentIndex = chapterIndex + 1) ── */}
      {stickyChapter && (
        <div
          className="story-reader__chapter-sticky"
          ref={stickyChapterRef}
          key={stickyChapter.id}
        >
          <span className="story-reader__chapter-sticky-text">
            {stickyChapter.text}
          </span>
          <div className="story-reader__chapter-sticky-line" />
        </div>
      )}

      {/* ── CHAPITRE ACTIF : centré, seul ── */}
      {chapterIsActive && (
        <div className="story-reader__chapter-center">
          <span className="story-reader__chapter-center-text">
            {finalSegments[currentIndex].text}
          </span>
        </div>
      )}

      {/* ── TRACK NORMAL (toujours rendu, même quand chapitre actif) ── */}
      <div
        className={[
          'story-reader__track',
          chapterIsActive ? 'story-reader__track--hidden' : '',
        ].join(' ')}
        style={{
          '--track-translate-y': `${translateY}px`,
          transition: jumpPhase !== 'idle' ? 'none' : undefined,
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
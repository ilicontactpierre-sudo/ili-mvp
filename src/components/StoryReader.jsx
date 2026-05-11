import { useLayoutEffect, useRef, useState } from 'react'
import './StoryReader.css'

function StoryReader({ segments = [], currentIndex = 0 }) {
  const segmentRefs = useRef([])
  const [translateY, setTranslateY] = useState(0)

  useLayoutEffect(() => {
    function computeTranslate() {
      const focusedNode = segmentRefs.current[currentIndex]

      if (!focusedNode) {
        return
      }

      const viewportHeight = window.innerHeight
      const focusedCenterY = focusedNode.offsetTop + focusedNode.offsetHeight / 2
      const nextTranslateY = viewportHeight / 2 - focusedCenterY
      setTranslateY(nextTranslateY)
    }

    const rafId = requestAnimationFrame(computeTranslate)
    window.addEventListener('resize', computeTranslate)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', computeTranslate)
    }
  }, [segments, currentIndex])

  return (
    <main className="story-reader" aria-live="polite">
      <div
        className="story-reader__track"
        style={{ '--track-translate-y': `${translateY}px` }}
      >
        {segments.map((segment, index) => {
          const isFocused = index === currentIndex

          return (
            <p
              key={segment.id}
              ref={(node) => {
                segmentRefs.current[index] = node
              }}
              className={`story-reader__segment ${
                isFocused ? 'story-reader__segment--focus' : 'story-reader__segment--blur'
              }`}
            >
              {segment.text}
            </p>
          )
        })}
      </div>
    </main>
  )
}

export default StoryReader

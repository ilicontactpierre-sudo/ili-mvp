import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { playClicSettings } from '../App.jsx'

// ── Émet un CustomEvent pour propager les settings en temps réel vers StoryReader et VfxOverlay ──
function emitSettingsChange(detail) {
  window.dispatchEvent(new CustomEvent('ili:settings', { detail }))
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const PROGRESS_KEY = (storyId) => `ili_progress_${storyId}`
export function saveProgress(storyId, segmentIndex, finished = false) {
  try {
    localStorage.setItem(PROGRESS_KEY(storyId), JSON.stringify({
      segmentIndex,
      finished,
      timestamp: Date.now()
    }))
  } catch {}
}
export function loadProgress(storyId) {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(storyId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
export function clearProgress(storyId) {
  try { localStorage.removeItem(PROGRESS_KEY(storyId)) } catch {}
}

// ── Lecture localStorage thème + police ──────────────────────────────────────
function loadTheme() {
  try {
    const raw = localStorage.getItem('ili_theme')
    return raw ? JSON.parse(raw) : { isDark: true, isToutdoux: false, isSynthwave: false }
  } catch { return { isDark: true, isToutdoux: false, isSynthwave: false } }
}
function saveTheme(val) {
  try { localStorage.setItem('ili_theme', JSON.stringify(val)) } catch {}
}

// ── Icônes SVG inline ─────────────────────────────────────────────────────────
const IconSun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconMoon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const IconFontSmall = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <text x="2" y="18" fontSize="14" fontFamily="serif" fill="currentColor" stroke="none">A</text>
    <text x="13" y="14" fontSize="9" fontFamily="serif" fill="currentColor" stroke="none">A</text>
  </svg>
)
const IconFontLarge = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <text x="1" y="18" fontSize="18" fontFamily="serif" fill="currentColor" stroke="none">A</text>
    <text x="14" y="13" fontSize="10" fontFamily="serif" fill="currentColor" stroke="none">A</text>
  </svg>
)
const IconList = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)
const IconGear = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)
const IconExit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

// ── Tailles de police disponibles ─────────────────────────────────────────────
const FONT_SIZES = [
  { label: 'XS', focus: 'clamp(1.05rem, 3.0vw, 1.45rem)', blur: 'clamp(0.95rem, 2.8vw, 1.35rem)' },
  { label: 'S',  focus: 'clamp(1.25rem, 3.6vw, 1.7rem)',  blur: 'clamp(1.15rem, 3.3vw, 1.6rem)'  },
  { label: 'M',  focus: 'clamp(1.45rem, 4.2vw, 2rem)',    blur: 'clamp(1.35rem, 3.9vw, 1.85rem)' },
  { label: 'L',  focus: 'clamp(1.65rem, 4.8vw, 2.3rem)',  blur: 'clamp(1.55rem, 4.5vw, 2.15rem)' },
  { label: 'XL', focus: 'clamp(1.9rem, 5.5vw, 2.65rem)',  blur: 'clamp(1.8rem, 5.2vw, 2.5rem)'   },
]

// ── Composant principal ───────────────────────────────────────────────────────
function SynthwaveBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COLORS = [
      'rgba(255,0,127,0.6)',
      'rgba(0,240,255,0.5)',
      'rgba(157,0,255,0.5)',
    ]
    const GRID = 20

    let frame = 0
    let rafId

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Scintillement global : opacité qui saute brutalement
      const flicker = Math.random() < 0.05
        ? Math.random() * 0.4        // flash sombre soudain
        : 0.85 + Math.random() * 0.15 // quasi pleine opacité

      ctx.globalAlpha = flicker

      const cols = Math.ceil(canvas.width / GRID) + 1
      const rows = Math.ceil(canvas.height / GRID) + 1

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const colorIndex = (col + row) % COLORS.length
          ctx.fillStyle = COLORS[colorIndex]
          ctx.beginPath()
          ctx.arc(col * GRID, row * GRID, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
      frame++
      rafId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  )
}

export default function ReaderSettings({
  storyId,
  segments = [],
  currentIndex,
  onJumpTo,
  forceOpen = false,
  onSectionRects,
}) {
  const navigate = useNavigate()

  // ── Whoosh navigation ───────────────────────────────────────────────────────
  const WHOOSH_COUNT = 6
  const lastWhooshRef = useRef(-1)
  function playWhoosh() {
    let next
    do { next = Math.floor(Math.random() * WHOOSH_COUNT) }
    while (next === lastWhooshRef.current)
    lastWhooshRef.current = next
    try {
      const audio = new Audio(`/sounds/Whoosh-${next + 1}.mp3`)
      audio.volume = 0.15
      audio.play().catch(() => {})
    } catch {}
  }


  const [isOpen, setIsOpen]         = useState(false)
  const [isClosing, setIsClosing]   = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [showSynthwaveBg, setShowSynthwaveBg] = useState(() => loadTheme().isSynthwave)

  // ── Plein écran ─────────────────────────────────────────────────────────────
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  // ── Thème — initialisé depuis localStorage ──────────────────────────────────
  const [isDark, setIsDark]           = useState(() => loadTheme().isDark)
  const [isToutdoux, setIsToutdoux]   = useState(() => loadTheme().isToutdoux)
  const [isSynthwave, setIsSynthwave] = useState(() => loadTheme().isSynthwave)

  // ── Police — initialisée depuis localStorage ────────────────────────────────
  const [fontSizeIndex, setFontSizeIndex] = useState(() => {
    try { return parseInt(localStorage.getItem('ili_font_size') || '1') } catch { return 1 }
  })
  const [dys1, setDys1] = useState(() => {
    try { return localStorage.getItem('ili_dys1') === 'true' } catch { return false }
  })
  const [dys2, setDys2] = useState(() => {
    try { return localStorage.getItem('ili_dys2') === 'true' } catch { return false }
  })
  const [emojiMode, setEmojiMode] = useState(() => {
    try { return localStorage.getItem('ili_emoji') === 'true' } catch { return false }
  })
  const [showProgress, setShowProgress] = useState(() => {
    try { return localStorage.getItem('ili_show_progress') !== 'false' } catch { return true }
  })
  const menuRef     = useRef(null)
  const gearRef     = useRef(null)
  const chaptersRef = useRef(null)
  // ── Refs sections (uniquement utilisées par le spotlight du tutoriel) ──────
  const themeSectionRef    = useRef(null)
  const fontSectionRef     = useRef(null)
  const progressSectionRef = useRef(null)
  const fullscreenSectionRef = useRef(null)
  // ── forceOpen : ouverture pilotée depuis l'extérieur (tutoriel) ────────────
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true)
      setIsClosing(false)
    }
  }, [forceOpen])
  // ── Remonte les positions des sections au parent (spotlight tutoriel) ──────
  useEffect(() => {
    if (!forceOpen || !onSectionRects || !isOpen) return
    const measure = () => {
      onSectionRects({
        theme: themeSectionRef.current?.getBoundingClientRect() ?? null,
        font: fontSectionRef.current?.getBoundingClientRect() ?? null,
        progress: progressSectionRef.current?.getBoundingClientRect() ?? null,
        fullscreen: fullscreenSectionRef.current?.getBoundingClientRect() ?? null,
      })
    }
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [forceOpen, onSectionRects, isOpen])

  // ── Appliquer le thème (+ sauvegarde) ──────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement
    document.body.style.backgroundImage = 'none'
    document.body.style.backgroundAttachment = 'auto'
    document.body.style.animation = 'none'
    setShowSynthwaveBg(isSynthwave)
    root.style.setProperty('--font-primary', "'Lora', Georgia, 'Times New Roman', serif")
    root.style.setProperty('--blur-amount', '3px')
    if (isToutdoux) {
      root.style.setProperty('--color-bg', '#e8dcc8')
      root.style.setProperty('--color-text-focus', '#2e2318')
      root.style.setProperty('--color-text-blur', 'rgba(46, 35, 24, 0.22)')
      root.style.setProperty('--font-primary', "'Playfair Display', Georgia, serif")
      root.style.setProperty('--blur-amount', '2px')
      document.body.style.backgroundImage = "url('/textures/paper.png')"
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundAttachment = 'fixed'
      document.body.style.backgroundPosition = 'center'
    } else if (isSynthwave) {
      root.style.setProperty('--color-bg', '#000000')
      root.style.setProperty('--color-text-focus', '#ffffff')
      root.style.setProperty('--color-text-blur', 'rgb(254, 255, 230)')
      root.style.setProperty('--font-primary', "'VT323', 'Courier New', monospace")
      root.style.setProperty('--blur-amount', '2px')
      document.body.style.backgroundImage = `
        radial-gradient(circle, rgba(255,0,127,0.5) 1px, transparent 1px),
        radial-gradient(circle, rgba(0,240,255,0.4) 1px, transparent 1px),
        radial-gradient(circle, rgba(157,0,255,0.35) 1px, transparent 1px)
      `
      document.body.style.backgroundSize = '20px 20px, 20px 20px, 20px 20px'
      document.body.style.backgroundAttachment = 'fixed'
      
    } else if (isDark) {
      root.style.setProperty('--color-bg', '#080809')
      root.style.setProperty('--color-text-focus', '#ffffff')
      root.style.setProperty('--color-text-blur', 'rgba(255, 255, 255, 0.22)')
      root.style.setProperty('--color-bg-secondary',   '#1a1a1e')
      root.style.setProperty('--color-bg-accent',      '#242428')
      root.style.setProperty('--color-border',         'rgba(255, 255, 255, 0.1)')
      root.style.setProperty('--color-text',           'rgba(255, 255, 255, 0.9)')
      root.style.setProperty('--color-text-secondary', 'rgba(255, 255, 255, 0.5)')
      root.style.setProperty('--color-primary',        '#6366f1')
    } else {
      root.style.setProperty('--color-bg', '#f5f0e8')
      root.style.setProperty('--color-text-focus', '#1a1a18')
      root.style.setProperty('--color-text-blur', 'rgba(26, 26, 24, 0.25)')
      root.style.setProperty('--color-bg-secondary',   '#ebe6dd')
      root.style.setProperty('--color-bg-accent',      '#ddd8cf')
      root.style.setProperty('--color-border',         'rgba(26, 26, 24, 0.12)')
      root.style.setProperty('--color-text',           'rgba(26, 26, 24, 0.9)')
      root.style.setProperty('--color-text-secondary', 'rgba(26, 26, 24, 0.5)')
      root.style.setProperty('--color-primary',        '#5254cc')
    }
    saveTheme({ isDark, isToutdoux, isSynthwave })
    // ── meta theme-color : la barre navigateur/statut suit le fond ──
    try {
      let metaTheme = document.querySelector('meta[name="theme-color"]')
      if (!metaTheme) {
        metaTheme = document.createElement('meta')
        metaTheme.name = 'theme-color'
        document.head.appendChild(metaTheme)
      }
      metaTheme.content = isToutdoux ? '#e8dcc8' : isSynthwave ? '#000000' : isDark ? '#080809' : '#f5f0e8'
    } catch {}
    emitSettingsChange({ type: 'theme', isDark, isToutdoux, isSynthwave })
  }, [isDark, isToutdoux, isSynthwave])

  // ── Appliquer la taille de police (+ sauvegarde) ────────────────────────────
  useEffect(() => {
    const size = FONT_SIZES[fontSizeIndex]
    const root = document.documentElement
    root.style.setProperty('--font-size-focus', size.focus)
    root.style.setProperty('--font-size-blur', size.blur)
    try { localStorage.setItem('ili_font_size', String(fontSizeIndex)) } catch {}
    emitSettingsChange({ type: 'fontSize', fontSizeIndex })
  }, [fontSizeIndex])

  useEffect(() => {
    const root = document.documentElement
    if (dys2) {
      root.style.setProperty('--font-dys2', "'Lexend', sans-serif")
    } else {
      root.style.setProperty('--font-dys2', '')
    }
    window.__iliDys1 = dys1
    window.__iliDys2 = dys2
    window.__iliEmoji = emojiMode
    window.__iliShowProgress = showProgress
    try { localStorage.setItem('ili_dys1', String(dys1)) } catch {}
    try { localStorage.setItem('ili_dys2', String(dys2)) } catch {}
    try { localStorage.setItem('ili_emoji', String(emojiMode)) } catch {}
    try { localStorage.setItem('ili_show_progress', String(showProgress)) } catch {}
    emitSettingsChange({ type: 'reading', dys1, dys2, emojiMode, showProgress })
  }, [dys1, dys2, emojiMode, showProgress])
  // ── Fermer si clic en dehors ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || forceOpen) return
    const handleDown = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        gearRef.current && !gearRef.current.contains(e.target)
      ) {
        e.stopPropagation()
        // Bloquer aussi le click/touchend qui suit ce mousedown/touchstart
        const blockNext = (ev) => {
          ev.stopPropagation()
          document.removeEventListener('click', blockNext, true)
          document.removeEventListener('touchend', blockNext, true)
        }
        document.addEventListener('click', blockNext, true)
        document.addEventListener('touchend', blockNext, true)
        setIsClosing(true)
        setShowChapters(false)
        setTimeout(() => {
          setIsOpen(false)
          setIsClosing(false)
        }, 160)
      }
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('touchstart', handleDown)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('touchstart', handleDown)
    }
  }, [isOpen])

  // ── Navigation chapitres ────────────────────────────────────────────────────
  const navItems = segments
    .map((seg, i) => {
      if (seg.isChapter) return { index: i, type: 'chapter', text: seg.text }
      if (seg.isLeader)  return { index: i, type: 'leader',  text: seg.text }
      return null
    })
    .filter(Boolean)

  const handleJump = (index) => {
    playWhoosh()
    onJumpTo(index)
    setIsOpen(false)
    setShowChapters(false)
  }

  const handleQuit = () => {
    playWhoosh()
    setIsOpen(false)
    const el = document.querySelector('.story-reader')
    if (el) {
      el.style.transition = 'opacity 700ms cubic-bezier(0.4, 0, 1, 1), filter 700ms cubic-bezier(0.4, 0, 1, 1)'
      el.style.opacity = '0'
      el.style.filter = 'blur(12px)'
    }
    setTimeout(() => navigate('/'), 700)
  }

  // ── Styles dynamiques selon thème ──────────────────────────────────────────
  const bg      = isDark ? 'rgba(12,12,14,0.96)' : 'rgba(245,240,232,0.97)'
  const fg      = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(26,26,24,0.85)'
  const fgDim   = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,24,0.35)'
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,24,0.1)'
  const hoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,24,0.06)'

  return (
    <>
      <style>{`
<<<<<<< Updated upstream
@keyframes synthwave-flicker {
          0%   { opacity: 1; }
          5%   { opacity: 0.4; }
          6%   { opacity: 1; }
          40%  { opacity: 1; }
          41%  { opacity: 0.2; }
          42%  { opacity: 0.9; }
          43%  { opacity: 0.5; }
          44%  { opacity: 1; }
          80%  { opacity: 1; }
          81%  { opacity: 0.3; }
          82%  { opacity: 1; }
        }
=======
>>>>>>> Stashed changes
        @keyframes settings-out {
          from { opacity: 1; transform: scale(1)    translateY(0); }
          to   { opacity: 0; transform: scale(0.92) translateY(-6px); }
        }
        @keyframes gear-appear {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes chapters-in {
          from { opacity: 0; max-height: 0; }
          to   { opacity: 1; max-height: 360px; }
        }
        .rs-gear-btn {
          position: fixed;
          top: 8px;
          right: 8px;
          z-index: 8000;
          width: 48px;
          height: 48px;
          border-radius: 5;
          border: none;
          background: transparent;
          color: ${isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,24,0.45)'};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease, transform 0.3s ease;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
          opacity: 0;
          animation: gear-appear 700ms cubic-bezier(0.16, 1, 0.3, 1) 1300ms forwards;
        }
        .rs-gear-btn:focus, .rs-gear-btn:focus-visible {
          outline: none;
          box-shadow: none;
        }
        .rs-gear-btn:hover, .rs-gear-btn.open {
          color: ${isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,24,0.7)'};
        }
        .rs-gear-btn.open {
          transform: rotate(45deg);
        }
        .rs-menu {
          position: fixed;
          top: 58px;
          right: 12px;
          z-index: 7999;
          width: 200px;
          background: ${bg};
          border: 1px solid ${border};
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          animation: ${isClosing ? 'settings-out 0.18s cubic-bezier(0.16,1,0.3,1) forwards' : 'settings-in 0.18s cubic-bezier(0.16,1,0.3,1) both'};
          overflow: hidden;
        }
        .rs-section {
          padding: 8px 6px;
          border-bottom: 1px solid ${border};
        }
        .rs-section:last-child { border-bottom: none; }
        .rs-label {
          font-family: var(--font-logo, sans-serif);
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${fgDim};
          padding: 4px 10px 6px;
          display: block;
        }
        .rs-row {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 0 2px;
        }
        .rs-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          border: none;
          background: transparent;
          color: ${fg};
          border-radius: 9px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .rs-btn:hover, .rs-btn.active {
          background: ${hoverBg};
        }
        .rs-btn.active {
          color: ${isDark ? '#fff' : '#1a1a18'};
        }
        .rs-font-label {
          font-family: var(--font-primary, serif);
          font-size: 13px;
          color: ${fg};
          font-weight: 500;
          min-width: 22px;
          text-align: center;
        }
        .rs-chapters-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: ${fg};
          border-radius: 9px;
          cursor: pointer;
          font-family: var(--font-logo, sans-serif);
          font-size: 12px;
          letter-spacing: 0.05em;
          transition: background 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .rs-chapters-btn:hover { background: ${hoverBg}; }
        .rs-chapters-list {
          animation: chapters-in 0.25s cubic-bezier(0.16,1,0.3,1) both;
          overflow: hidden;
          max-height: 360px;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .rs-chapters-list::-webkit-scrollbar { display: none; }
        .rs-chapter-item {
          display: flex;
          align-items: baseline;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          border-radius: 8px;
          transition: background 0.12s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .rs-chapter-item:hover { background: ${hoverBg}; }
        .rs-chapter-item.current { background: ${hoverBg}; }
        .rs-chapter-num {
          font-family: var(--font-logo, sans-serif);
          font-size: 9px;
          color: ${fgDim};
          min-width: 18px;
          flex-shrink: 0;
          letter-spacing: 0.05em;
        }
        .rs-chapter-text {
          font-family: var(--font-primary, serif);
          font-size: 12px;
          color: ${fg};
          line-height: 1.35;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .rs-chapter-text.chapter-type {
          font-weight: 600;
          color: ${isDark ? 'rgba(255,255,255,0.95)' : 'rgba(26,26,24,0.95)'};
        }
        .rs-quit-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: ${isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,24,0.45)'};
          border-radius: 9px;
          cursor: pointer;
          font-family: var(--font-logo, sans-serif);
          font-size: 12px;
          letter-spacing: 0.05em;
          transition: background 0.15s ease, color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .rs-quit-btn:hover {
          background: ${hoverBg};
          color: ${fg};
        }
        .rs-dys-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 4px 4px;
        }
        .rs-dys-btn {
          flex: 1;
          height: 34px;
          border-radius: 8px;
          border: 1px solid ${border};
          background: transparent;
          color: ${fg};
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .rs-dys-btn:hover {
          background: ${hoverBg};
        }
        .rs-dys-btn.active {
          background: ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(26,26,24,0.1)'};
          border-color: ${isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,24,0.35)'};
          color: ${isDark ? '#fff' : '#1a1a18'};
        }
      `}</style>

      {/* ── Overlay fond Synthwave animé ── */}
      {showSynthwaveBg && <SynthwaveBackground />}
      {/* ── Bouton roue crantée ── */}
      <button
      ref={gearRef}
      className={`rs-gear-btn${isOpen ? ' open' : ''}`}
      onClick={() => {
        playClicSettings()
        if (isOpen) {
          setIsClosing(true)
          setShowChapters(false)
          setTimeout(() => {
            setIsOpen(false)
            setIsClosing(false)
          }, 160)
        } else {
          setIsOpen(true)
          setIsClosing(false)
          setShowChapters(false)
        }
      }}        aria-label="Paramètres de lecture"
      >
        <IconGear />
      </button>

      {/* ── Menu ── */}
      {(isOpen || isClosing) && (
        <div ref={menuRef} className="rs-menu">

          {/* Thème */}
          <div className="rs-section" ref={themeSectionRef}>
            <span className="rs-label">Thème</span>
            <div className="rs-row">
              <button
                className={`rs-btn${isDark && !isToutdoux && !isSynthwave ? ' active' : ''}${isSynthwave ? ' active' : ''}`}
                onClick={() => {
                  if (isSynthwave) {
                    // 3e clic lune → retour mode sombre base
                    setIsSynthwave(false); setIsToutdoux(false); setIsDark(true)
                  } else if (isDark && !isToutdoux) {
                    // 2e clic lune → mode 80
                    setIsSynthwave(true); setIsToutdoux(false); setIsDark(true)
                  } else {
                    // 1er clic lune → mode sombre base
                    setIsSynthwave(false); setIsToutdoux(false); setIsDark(true)
                  }
                }}
                title="Mode sombre — recliquer pour mode années 80"
              >
                <IconMoon />
              </button>
              <button
                className={`rs-btn${!isDark && !isToutdoux && !isSynthwave ? ' active' : ''}${isToutdoux ? ' active' : ''}`}
                onClick={() => {
                  if (isToutdoux) {
                    // 3e clic soleil → retour mode clair base
                    setIsToutdoux(false); setIsSynthwave(false); setIsDark(false)
                  } else if (!isDark && !isSynthwave) {
                    // 2e clic soleil → mode Miyazaki
                    setIsToutdoux(true); setIsSynthwave(false); setIsDark(false)
                  } else {
                    // 1er clic soleil → mode clair base
                    setIsToutdoux(false); setIsSynthwave(false); setIsDark(false)
                  }
                }}
                title="Mode clair — recliquer pour mode Miyazaki"
              >
                <IconSun />
              </button>
            </div>
          </div>

          {/* Taille de police + options DYS */}
<<<<<<< Updated upstream
          <div className="rs-section" ref={fontSectionRef}>
=======
          <div className="rs-section">
>>>>>>> Stashed changes
            <span className="rs-label">Police</span>
            <div className="rs-row">
              <button
                className="rs-btn"
                onClick={() => setFontSizeIndex(i => Math.max(0, i - 1))}
                disabled={fontSizeIndex === 0}
                style={{ opacity: fontSizeIndex === 0 ? 0.3 : 1, fontSize: '1.2rem', fontWeight: 300 }}
                title="Réduire"
              >
                −
              </button>
              <span className="rs-font-label">{FONT_SIZES[fontSizeIndex].label}</span>
              <button
                className="rs-btn"
                onClick={() => setFontSizeIndex(i => Math.min(FONT_SIZES.length - 1, i + 1))}
                disabled={fontSizeIndex === FONT_SIZES.length - 1}
                style={{ opacity: fontSizeIndex === FONT_SIZES.length - 1 ? 0.3 : 1, fontSize: '1.2rem', fontWeight: 300 }}
                title="Agrandir"
              >
                +
              </button>
            </div>
            <div className="rs-dys-row">
              <button
                className={`rs-dys-btn${dys1 ? ' active' : ''}`}
                onClick={() => { playClicSettings(); setDys1(v => !v) }}
                title="Lecture assistée : met en gras les premières lettres de chaque mot"
<<<<<<< Updated upstream
title="Lecture assistée : met en gras les premières lettres de chaque mot"
              >
                DYS 1
              </button>
              <button
                className={`rs-dys-btn${dys2 ? ' active' : ''}`}
                onClick={() => { playClicSettings(); setDys2(v => !v) }}
                title="Police Lexend, conçue pour la dyslexie"
              >
                DYS 2
              </button>
              <button
                className={`rs-dys-btn${emojiMode ? ' active' : ''}`}
                onClick={() => { playClicSettings(); setEmojiMode(v => !v) }}
                title="Mode visuel : remplace les mots courants par des emojis"
              >
                😊
              </button>
            </div>
          </div>
          {/* Barre de progression */}
          <div className="rs-section" ref={progressSectionRef}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px' }}>
              <span style={{
                fontFamily: 'var(--font-logo, sans-serif)',
                fontSize: '9px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: fgDim,
              }}>
                Progression
              </span>
              <button
                onClick={() => { playClicSettings(); setShowProgress(v => !v) }}
                style={{
                  width: '36px',
                  height: '20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: showProgress
                    ? (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,24,0.45)')
                    : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(26,26,24,0.12)'),
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s ease',
                  flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                }}
                aria-label={showProgress ? 'Désactiver la barre de progression' : 'Activer la barre de progression'}
              >
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  left: showProgress ? '18px' : '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: isDark ? '#fff' : '#1a1a18',
                  transition: 'left 0.2s ease',
                }} />
=======
              >
                DYS 1
              </button>
              <button
                className={`rs-dys-btn${dys2 ? ' active' : ''}`}
                onClick={() => { playClicSettings(); setDys2(v => !v) }}
                title="Police Lexend, conçue pour la dyslexie"
              >
                DYS 2
>>>>>>> Stashed changes
              </button>
            </div>
          </div>

          {/* Navigation chapitres — uniquement dans une histoire */}
          {storyId && navItems.length > 0 && (
            <div className="rs-section">
              <button
                className="rs-chapters-btn"
                onClick={() => setShowChapters(v => !v)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconList />
                  <span>Navigation</span>
                </span>
                <span style={{ fontSize: 10, opacity: 0.5 }}>{showChapters ? '▲' : '▼'}</span>
              </button>
              {showChapters && (
                <div ref={chaptersRef} className="rs-chapters-list">
                  {navItems.map((item) => (
                    <button
                      key={item.index}
                      className={`rs-chapter-item${item.index === currentIndex ? ' current' : ''}`}
                      onClick={() => handleJump(item.index)}
                    >
                      <span className="rs-chapter-num">{item.index + 1}</span>
                      <span className={`rs-chapter-text${item.type === 'chapter' ? ' chapter-type' : ''}`}>
                        {item.text?.slice(0, 60)}{item.text?.length > 60 ? '…' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          
          {/* Plein écran — Android uniquement (iOS gère ça via PWA standalone) */}
          {!isIOSDevice && document.fullscreenEnabled && (
            <div className="rs-section" ref={fullscreenSectionRef}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px' }}>
                <span style={{
                  fontFamily: 'var(--font-logo, sans-serif)',
                  fontSize: '9px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: fgDim,
                }}>
                  Plein écran
                </span>
                <button
                  onClick={() => { playClicSettings(); toggleFullscreen() }}
                  style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isFullscreen
                      ? (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,24,0.45)')
                      : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(26,26,24,0.12)'),
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  aria-label={isFullscreen ? 'Quitter le plein écran' : 'Activer le plein écran'}
                >
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: isFullscreen ? '18px' : '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: isDark ? '#fff' : '#1a1a18',
                    transition: 'left 0.2s ease',
                  }} />
                </button>
              </div>
            </div>
          )}

          {/* Quitter l'histoire — uniquement dans une histoire */}
          {storyId && (
            <div className="rs-section">
              <button className="rs-quit-btn" onClick={handleQuit}>
                <IconExit />
                <span>Quitter l'histoire</span>
              </button>
            </div>
          )}

        </div>
      )}
    </>
  )
}
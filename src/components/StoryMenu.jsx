import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Ligne d'histoire avec accordéon description ───────────────────────────
function StoryRow({ story, onNavigate }) {
  const [open, setOpen] = useState(false)
  const hasInfo = story.mood || story.genre || story.description
  const descRef = useRef(null)
  return (
    <div data-story-row style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 0' }}>
        {/* Zone titre + méta — cliquable pour naviguer */}
        <div
          onClick={() => onNavigate(story.id)}
          style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="story-title" style={{ fontSize: '1rem', fontWeight: 500 }}>
              {story.title}
            </span>
            <span className="story-author" style={{ fontSize: '0.78rem' }}>
              {story.author}
            </span>
            {(story.mood || story.genre) && (
              <span style={{
                color: 'rgba(255,255,255,0.28)',
                fontSize: '0.62rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 400,
                flexShrink: 0,
              }}>
                {[story.mood, story.genre].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          {/* Tags (chips discrets) */}
          {story.tags && story.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              {story.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.04em',
                    color: 'rgba(255,255,255,0.32)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '999px',
                    padding: '0.1rem 0.5rem',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Bouton ⓘ — ne déclenche PAS la navigation */}
        {hasInfo && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              const willOpen = !open
              setOpen(willOpen)
              if (willOpen) {
                setTimeout(() => {
                  descRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }, 220)
              }
            }}
            aria-label="Description"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: open ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.22)',
              fontSize: '1rem',
              padding: '0 0.25rem',
              lineHeight: 1,
              flexShrink: 0,
              transition: 'color 0.15s',
            }}
          >ⓘ</button>
        )}
      </div>
      {/* Zone dépliable */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '120px' : '0',
        opacity: open ? 1 : 0,
        transition: 'max-height 0.2s ease, opacity 0.18s ease',
      }}>
        {story.description && (
          <p
            ref={descRef}
            style={{
              margin: '0 0 0.75rem 0',
              paddingLeft: '0.75rem',
              borderLeft: '2px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.8rem',
              lineHeight: '1.55',
              fontStyle: 'italic',
            }}
          >
            {story.description}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Rangée de chips de filtres (scroll horizontal, multi-sélection) ──────
function FilterChips({ allTags, activeTags, onToggle }) {
  if (allTags.length === 0) return null
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.45rem',
        overflowX: 'auto',
        paddingBottom: '0.85rem',
        marginBottom: '0.4rem',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
      className="story-menu-filters"
    >
      {allTags.map(tag => {
        const active = activeTags.includes(tag)
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            style={{
              flexShrink: 0,
              padding: '0.38rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-logo, sans-serif)',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: active ? '1px solid rgba(255,255,255,0.55)' : '1px solid rgba(255,255,255,0.15)',
              backgroundColor: active ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
            }}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}

function StoryMenu({ isOpen, stories, isLoading, onClose, onDeleteStory }) {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const [activeTags, setActiveTags] = useState([]);
  const handleTutorial = (e) => {
    e.stopPropagation()
    navigate('/tutoriel')
  }

  // Tags disponibles : déduits des histoires visibles, triés par fréquence puis alpha
  const allTags = useMemo(() => {
    const freq = {}
    stories.forEach(s => (s.tags || []).forEach(t => { freq[t] = (freq[t] || 0) + 1 }))
    return Object.keys(freq).sort((a, b) => freq[b] - freq[a] || a.localeCompare(b, 'fr'))
  }, [stories])

  // Liste triée par pertinence : score = nombre de tags actifs possédés.
  // Aucun filtre actif → ordre d'origine (déjà trié par `order` côté chargement).
  const sortedStories = useMemo(() => {
    if (activeTags.length === 0) return stories
    return [...stories]
      .map(s => ({
        story: s,
        score: activeTags.filter(t => (s.tags || []).includes(t)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.story)
  }, [stories, activeTags]);

  const toggleTag = (tag) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  if (!isOpen) return null;

  const handleStoryClick = (storyId) => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => navigate(`/lire/${storyId}`), 680);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="story-menu-backdrop"
      onClick={handleBackdropClick}
    >
      {/* ── Bouton tutoriel haut gauche, même hauteur que la roue crantée ── */}
      <button
        onClick={handleTutorial}
        title="Comment ça marche ?"
        style={{
          position: 'fixed',
          top: '8px',
          left: '8px',
          zIndex: 8001,
          width: '48px',
          height: '48px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '10px',
          opacity: 0.3,
          transition: 'opacity 250ms ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.65' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.3' }}
      >
        <img
          src="/tutoriel-icon.png"
          alt="Tutoriel"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'invert(1)',
          }}
        />
      </button>
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-8px)' : 'translateY(0)',
        transition: exiting
          ? 'opacity 600ms cubic-bezier(0.4, 0, 1, 1), transform 600ms cubic-bezier(0.4, 0, 1, 1)'
          : 'none',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    
    
      <div className="story-menu-container">
        {!isLoading && allTags.length > 0 && (
          <FilterChips allTags={allTags} activeTags={activeTags} onToggle={toggleTag} />
        )}

        {isLoading ? (
          <div className="story-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="story-card skeleton">
                <div className="skeleton-title" />
                <div className="skeleton-author" />
              </div>
            ))}
          </div>
        ) : sortedStories.length === 0 ? (
          <div className="empty-state">
            Aucune histoire ne correspond à ces filtres.
          </div>
        ) : (
          <div className="story-list">
            {sortedStories.map((story, index) => (
              <div
                key={story.id}
                className="story-card"
                style={{ '--delay': `${index * 60}ms`, padding: '0 0.25rem' }}
              >
                <StoryRow story={story} onNavigate={handleStoryClick} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoryMenu;

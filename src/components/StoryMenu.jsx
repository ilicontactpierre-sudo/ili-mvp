import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Ligne d'histoire avec accordéon description ───────────────────────────
function StoryRow({ story, onNavigate }) {
  const [open, setOpen] = useState(false)
  const hasInfo = story.mood || story.genre || story.description

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
        </div>
        {/* Bouton ⓘ — ne déclenche PAS la navigation */}
        {hasInfo && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
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
          <p style={{
            margin: '0 0 0.75rem 0',
            paddingLeft: '0.75rem',
            borderLeft: '2px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.8rem',
            lineHeight: '1.55',
            fontStyle: 'italic',
          }}>
            {story.description}
          </p>
        )}
      </div>
    </div>
  )
}

function StoryMenu({ isOpen, stories, isLoading, onClose, onDeleteStory }) {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
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
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-8px)' : 'translateY(0)',
        transition: exiting
          ? 'opacity 600ms cubic-bezier(0.4, 0, 1, 1), transform 600ms cubic-bezier(0.4, 0, 1, 1)'
          : 'none',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
      <div className="story-menu-container">
        {isLoading ? (
          // Skeleton loading state
          <div className="story-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="story-card skeleton">
                <div className="skeleton-title" />
                <div className="skeleton-author" />
              </div>
            ))}
          </div>
        ) : stories.length === 0 ? (
          // Empty state
          <div className="empty-state">
            Aucune histoire disponible pour le moment.
          </div>
        ) : (
          // Stories list
          <div className="story-list">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="story-card"
                onClick={() => handleStoryClick(story.id)}
                style={{ '--delay': `${index * 60}ms` }}
              >
                <div className="story-content">
                  <div className="story-title">{story.title}</div>
                  <div className="story-author">{story.author}</div>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoryMenu;
import { useState, useEffect } from 'react';
import StoryMenu from '../components/StoryMenu';
import ReaderSettings from '../components/ReaderSettings.jsx'
import { playClicILi } from '../App.jsx'

// ── Composant ligne d'histoire enrichie ──────────────────────────────────────
function StoryRow({ story, onNavigate }) {
  const [open, setOpen] = useState(false)
  const hasInfo = story.mood || story.genre || story.description

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Ligne principale */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 0' }}>
        {/* Zone cliquable titre + méta */}
        <div
          onClick={() => onNavigate(story)}
          style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 500 }}>{story.title}</span>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>{story.author}</span>
            {(story.mood || story.genre) && (
              <span style={{
                color: 'rgba(255,255,255,0.28)',
                fontSize: '0.62rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 400,
              }}>
                {[story.mood, story.genre].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
        {/* Bouton ⓘ */}
        {hasInfo && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
            aria-label="Description"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: open ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
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
        transition: 'max-height 0.2s ease, opacity 0.2s ease',
      }}>
        {story.description && (
          <p style={{
            margin: '0 0 0.75rem 0',
            paddingLeft: '0.75rem',
            borderLeft: '2px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.55)',
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

function HomePage() {
  const [phase, setPhase] = useState('idle'); // idle | bumping | transitioning | open
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch('/stories/index.json');
        if (!response.ok) throw new Error('Failed to fetch stories');
        const data = await response.json();
        const storiesArray = Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : [])
        setStories(storiesArray.filter(s => !s.hidden));
      } catch (error) {
        console.error('Error loading stories:', error);
        setStories([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStories();
  }, []);

  const handleLogoClick = () => {
    if (phase !== 'idle') return;

    // Phase 0 : bump + son simultanés
    playClicILi()
    setPhase('bumping');

    // Phase 1 : silence, puis glissement
    setTimeout(() => {
      setPhase('transitioning');
    }, 120);

    // Phase 2 : menu émerge pendant que le logo finit de se poser
    setTimeout(() => {
      setPhase('open');
    }, 900);
  };

  const handleClose = () => {
    setPhase('idle');
  };

  const handleDeleteStory = async (storyId, password) => {
    if (isLocalDev) {
      throw new Error('Suppression non disponible en local.');
    }
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: storyId, password }),
      });
      if (!response.ok) {
        const text = await response.text();
        let message = 'Erreur lors de la suppression';
        try { message = JSON.parse(text).error || text; } catch { message = text; }
        throw new Error(message);
      }
      const fetchResponse = await fetch('/stories/index.json');
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setStories(Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : []));
      }
      alert('Histoire supprimée avec succès');
    } catch (error) {
      throw error;
    }
  };

  const isOpen = phase === 'open';
  const isMoving = phase === 'transitioning' || phase === 'open';
  const isBumping = phase === 'bumping';

  return (
    <div className="home-page">
      <div className={`logo-container ${isMoving ? 'logo-open' : ''}`}>
        <h1
          className={`logo ${isBumping ? 'logo-bump' : ''}`}
          onClick={handleLogoClick}
        >
          ILi
        </h1>
        <p className="logo-tagline">lecture immersive</p>
        <p className="logo-invite">Choisis ton histoire</p>
      </div>

      {isOpen && (
        <StoryMenu
          isOpen={true}
          stories={stories}
          isLoading={isLoading}
          onClose={handleClose}
          onDeleteStory={handleDeleteStory}
        />
      )}
      {isOpen && (
        <ReaderSettings />
      )}
    </div>
  );
}

export default HomePage;
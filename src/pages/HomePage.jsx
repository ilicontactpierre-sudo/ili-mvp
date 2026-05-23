import { useState, useEffect } from 'react';
import StoryMenu from '../components/StoryMenu';
import ReaderSettings from '../components/ReaderSettings.jsx'
import { playClicILi } from '../App.jsx'

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
        setStories(storiesArray);
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
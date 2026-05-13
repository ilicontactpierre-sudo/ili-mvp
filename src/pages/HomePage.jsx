import { useState, useEffect } from 'react';
import StoryMenu from '../components/StoryMenu';

function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch('/stories/index.json');
        if (!response.ok) throw new Error('Failed to fetch stories');
        const data = await response.json();
        setStories(data);
      } catch (error) {
        console.error('Error loading stories:', error);
        setStories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="home-page">
      <div className={`logo-container ${isMenuOpen ? 'logo-open' : ''}`}>
        <h1 className="logo" onClick={toggleMenu}>
          ILi
        </h1>
        <p className="logo-tagline">lecture immersive</p>
      </div>

      <StoryMenu
        isOpen={isMenuOpen}
        stories={stories}
        isLoading={isLoading}
        onClose={() => setIsMenuOpen(false)}
      />
    </div>
  );
}

export default HomePage;
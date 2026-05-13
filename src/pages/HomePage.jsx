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
        // Gérer à la fois le format { stories: [...] } et le format tableau direct [...]
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

  const handleDeleteStory = async (storyId, password) => {
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: storyId,
          password: password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      // Refresh the stories list
      const fetchResponse = await fetch('/stories/index.json');
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        const storiesArray = Array.isArray(data) ? data : (Array.isArray(data.stories) ? data.stories : []);
        setStories(storiesArray);
      }

      alert('Histoire supprimée avec succès');
    } catch (error) {
      throw error;
    }
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
        onDeleteStory={handleDeleteStory}
      />
    </div>
  );
}

export default HomePage;
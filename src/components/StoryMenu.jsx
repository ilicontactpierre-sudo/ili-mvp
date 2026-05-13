import { useNavigate } from 'react-router-dom';

function StoryMenu({ isOpen, stories, isLoading, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleStoryClick = (storyId) => {
    navigate(`/lire/${storyId}`);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="story-menu-backdrop" onClick={handleBackdropClick}>
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
                <div className="story-title">{story.title}</div>
                <div className="story-author">{story.author}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoryMenu;
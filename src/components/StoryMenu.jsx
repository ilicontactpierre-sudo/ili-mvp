import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function StoryMenu({ isOpen, stories, isLoading, onClose, onDeleteStory }) {
  const navigate = useNavigate();
  const [deletingStoryId, setDeletingStoryId] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  if (!isOpen) return null;

  const handleStoryClick = (storyId) => {
    navigate(`/lire/${storyId}`);
  };

  const handleDeleteClick = (e, storyId) => {
    e.stopPropagation(); // Prevent triggering story click
    setDeletingStoryId(storyId);
    setDeletePassword('');
  };

  const handleDeleteConfirm = async () => {
    if (!deletePassword.trim()) return;

    try {
      await onDeleteStory(deletingStoryId, deletePassword);
      setDeletingStoryId(null);
      setDeletePassword('');
    } catch (error) {
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingStoryId(null);
    setDeletePassword('');
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
                <div className="story-content">
                  <div className="story-title">{story.title}</div>
                  <div className="story-author">{story.author}</div>
                </div>
                <button
                  className="delete-button"
                  onClick={(e) => handleDeleteClick(e, story.id)}
                  title="Supprimer cette histoire"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deletingStoryId && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <h3>Confirmer la suppression</h3>
            <p>Êtes-vous sûr de vouloir supprimer cette histoire ?</p>
            <p>Cette action est irréversible.</p>

            <div className="password-input">
              <label htmlFor="delete-password">Mot de passe admin:</label>
              <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Entrez le mot de passe"
              />
            </div>

            <div className="delete-confirm-buttons">
              <button
                className="cancel-button"
                onClick={handleDeleteCancel}
              >
                Annuler
              </button>
              <button
                className="confirm-button"
                onClick={handleDeleteConfirm}
                disabled={!deletePassword.trim()}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoryMenu;
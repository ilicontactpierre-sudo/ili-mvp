export default async function handler(req, res) {

  // 1. Méthode HTTP
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Validation du mot de passe côté serveur
  const { password, slug } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  // 3. Validation des données
  if (!slug) {
    return res.status(400).json({
      error: 'Données manquantes : slug requis'
    });
  }

  const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER  = process.env.GITHUB_OWNER;
  const GITHUB_REPO   = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({
      error: 'Variables GitHub manquantes dans la configuration'
    });
  }

  // 4. Fonction utilitaire : lire un fichier GitHub
  const readGitHubFile = async (path) => {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    if (!response.ok) return { content: null, sha: null };
    const data = await response.json();
    const content = JSON.parse(
      Buffer.from(data.content, 'base64').toString('utf-8')
    );
    return { content, sha: data.sha };
  };

  // 5. Fonction utilitaire : supprimer un fichier GitHub
  const deleteGitHubFile = async (path, message, sha) => {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    const body = {
      message,
      sha,
      branch: GITHUB_BRANCH
    };

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API : ${response.status} — ${error.message}`);
    }
    return response.json();
  };

  // 6. Fonction utilitaire : écrire un fichier GitHub
  const writeGitHubFile = async (path, content, message, sha = null) => {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    const body = {
      message,
      content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
      branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API : ${response.status} — ${error.message}`);
    }
    return response.json();
  };

  try {

    // 7. ÉTAPE 1 : Lire l'index actuel
    const indexPath = 'public/stories/index.json';
    const { content: currentIndex, sha: indexSha } =
      await readGitHubFile(indexPath);

    if (!currentIndex) {
      return res.status(404).json({ error: 'Index des histoires introuvable' });
    }

    const index = Array.isArray(currentIndex) ? currentIndex : [];

    // 8. ÉTAPE 2 : Vérifier que l'histoire existe
    const storyIndex = index.findIndex(s => s.id === slug);
    if (storyIndex === -1) {
      return res.status(404).json({ error: 'Histoire non trouvée' });
    }

    const storyToDelete = index[storyIndex];

    // 9. ÉTAPE 3 : Supprimer le fichier de l'histoire
    const storyPath = `public/stories/${slug}.json`;
    const { sha: storySha } = await readGitHubFile(storyPath);

    if (storySha) {
      await deleteGitHubFile(
        storyPath,
        `story: delete "${storyToDelete.title}"`,
        storySha
      );
    }

    // 10. ÉTAPE 4 : Mettre à jour index.json
    index.splice(storyIndex, 1);

    await writeGitHubFile(
      indexPath,
      index,
      `index: remove "${storyToDelete.title}"`,
      indexSha
    );

    // 11. Succès
    return res.status(200).json({
      success: true,
      message: `"${storyToDelete.title}" supprimée avec succès.`
    });

  } catch (error) {
    console.error('Erreur suppression:', error);
    return res.status(500).json({
      error: error.message || 'Erreur interne lors de la suppression'
    });
  }
}
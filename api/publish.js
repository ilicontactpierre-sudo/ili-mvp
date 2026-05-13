export default async function handler(req, res) {

  // 1. Méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Validation du mot de passe côté serveur
  const { password, slug, storyData } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  // 3. Validation des données
  if (!slug || !storyData || !storyData.title) {
    return res.status(400).json({ 
      error: 'Données manquantes : slug et storyData requis' 
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

  // 5. Fonction utilitaire : écrire/mettre à jour un fichier GitHub
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

    // 6. ÉTAPE 1 : Écrire le fichier de l'histoire
    const storyPath = `public/stories/${slug}.json`;
    const { sha: storySha } = await readGitHubFile(storyPath);
    
    await writeGitHubFile(
      storyPath,
      storyData,
      `story: publish "${storyData.title}"`,
      storySha   // null si nouvelle histoire, sha si mise à jour
    );

    // 7. ÉTAPE 2 : Mettre à jour index.json
    const indexPath = 'public/stories/index.json';
    const { content: currentIndex, sha: indexSha } = 
      await readGitHubFile(indexPath);
    
    const index = Array.isArray(currentIndex) ? currentIndex : [];
    const entry = { 
      id: slug, 
      title: storyData.title, 
      author: storyData.author 
    };
    
    const existingPosition = index.findIndex(s => s.id === slug);
    if (existingPosition >= 0) {
      index[existingPosition] = entry;  // mise à jour
    } else {
      index.push(entry);                // nouvelle histoire
    }

    await writeGitHubFile(
      indexPath,
      index,
      `index: ${existingPosition >= 0 ? 'update' : 'add'} "${storyData.title}"`,
      indexSha
    );

    // 8. Succès
    return res.status(200).json({ 
      success: true,
      isUpdate: existingPosition >= 0,
      message: `"${storyData.title}" publiée avec succès.`
    });

  } catch (error) {
    console.error('Erreur publication:', error);
    return res.status(500).json({ 
      error: error.message || 'Erreur interne lors de la publication' 
    });
  }
}
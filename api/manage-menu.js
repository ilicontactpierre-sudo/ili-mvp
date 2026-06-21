export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, stories } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (!Array.isArray(stories)) {
    return res.status(400).json({ error: 'stories doit être un tableau' });
  }

  // Validation minimale : chaque entrée doit garder id/title/author
  for (const s of stories) {
    if (!s.id || !s.title) {
      return res.status(400).json({ error: `Entrée invalide : ${JSON.stringify(s)}` });
    }
  }

  const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER  = process.env.GITHUB_OWNER;
  const GITHUB_REPO   = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Variables GitHub manquantes dans la configuration' });
  }

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
    const indexPath = 'public/stories/index.json';
    const { sha: indexSha } = await readGitHubFile(indexPath);

    await writeGitHubFile(
      indexPath,
      stories,
      'menu: mise à jour ordre/tags/visibilité',
      indexSha
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur manage-menu:', error);
    return res.status(500).json({
      error: error.message || 'Erreur interne lors de la mise à jour du menu'
    });
  }
}

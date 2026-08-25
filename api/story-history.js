export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { password, slug } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  if (!slug) {
    return res.status(400).json({ error: 'Donnée manquante : slug requis' });
  }
  const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER  = process.env.GITHUB_OWNER;
  const GITHUB_REPO   = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Variables GitHub manquantes dans la configuration' });
  }
  try {
    const path = `public/stories/${slug}.json`;
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?path=${encodeURIComponent(path)}&sha=${GITHUB_BRANCH}&per_page=30`;
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`GitHub API : ${response.status} — ${error.message || 'erreur inconnue'}`);
    }
    const commits = await response.json();
    const history = (Array.isArray(commits) ? commits : []).map(c => ({
      sha:     c.sha,
      date:    c.commit?.author?.date || c.commit?.committer?.date || null,
      message: c.commit?.message || '',
    }));
    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('Erreur story-history:', error);
    return res.status(500).json({ error: error.message || 'Erreur interne' });
  }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { password, slug, sha } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  if (!slug || !sha) {
    return res.status(400).json({ error: 'Données manquantes : slug et sha requis' });
  }
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO  = process.env.GITHUB_REPO;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Variables GitHub manquantes dans la configuration' });
  }
  try {
    const path = `public/stories/${slug}.json`;
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${sha}`;
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
    const data = await response.json();
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    return res.status(200).json({ success: true, storyData: content });
  } catch (error) {
    console.error('Erreur story-version:', error);
    return res.status(500).json({ error: error.message || 'Erreur interne' });
  }
}
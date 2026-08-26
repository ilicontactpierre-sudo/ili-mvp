export default async function handler(req, res) {

  // 1. Méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Validation du mot de passe côté serveur
const { password, slug, storyData, action, sha } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  // 3. Validation des données (uniquement pour l'action de publication —
  // les actions "history" et "version" ci-dessous n'ont pas besoin de storyData)
  if (!action && (!slug || !storyData || !storyData.title)) {
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

    // ── Action : lister l'historique des publications d'une histoire ──
  // (fusionné ici avec /api/publish pour rester sous la limite de 12
  // fonctions serverless du plan Vercel Hobby)
  if (action === 'history') {
    if (!slug) return res.status(400).json({ error: 'Donnée manquante : slug requis' });
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
  // ── Action : récupérer le contenu publié à un commit donné ──
  if (action === 'version') {
    if (!slug || !sha) return res.status(400).json({ error: 'Données manquantes : slug et sha requis' });
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
  // ── Action : réinitialiser les statistiques de lecture d'une histoire ──
  // Utilise la clé de service Supabase (jamais exposée côté client) pour
  // contourner les policies RLS et supprimer les lignes reading_events.
  if (action === 'reset-analytics') {
    const { storyId } = req.body;
    if (!storyId) {
      return res.status(400).json({ error: 'Donnée manquante : storyId requis' });
    }
    const SUPABASE_URL_ENV = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL_ENV || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Variables Supabase manquantes (SUPABASE_SERVICE_ROLE_KEY) dans la configuration' });
    }
    try {
      const url = `${SUPABASE_URL_ENV}/rest/v1/reading_events?story_id=eq.${encodeURIComponent(storyId)}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=minimal',
        }
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase : ${response.status} — ${text}`);
      }
      return res.status(200).json({ success: true, message: `Statistiques de "${storyId}" réinitialisées.` });
    } catch (error) {
      console.error('Erreur reset-analytics:', error);
      return res.status(500).json({ error: error.message || 'Erreur interne' });
    }
  }

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
      id:    slug, 
      title: storyData.title, 
      author: storyData.author,
      ...(storyData.mood        ? { mood:        storyData.mood }        : {}),
      ...(storyData.genre       ? { genre:       storyData.genre }       : {}),
      ...(storyData.description ? { description: storyData.description } : {}),
      ...(storyData.type        ? { type:        storyData.type }        : {}),
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
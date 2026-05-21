/**
 * api/upload-sound.js
 * Vercel Serverless Function
 * 
 * Reçoit : { soundEntry } — objet complet à ajouter dans sounds-index.json
 * Vérifie le mot de passe admin
 * Met à jour sounds-index.json sur GitHub
 * 
 * L'upload binaire vers Supabase se fait côté client (plus rapide, pas de
 * limite de 10s Vercel, pas de transit serveur inutile).
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password, soundEntry } = req.body ?? {}

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  if (!soundEntry || !soundEntry.id || !soundEntry.url) {
    return res.status(400).json({ error: 'soundEntry invalide — id et url requis' })
  }

  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH = 'main',
  } = process.env

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Variables GitHub manquantes' })
  }

  const filePath = 'public/sounds/sounds-index.json'
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  try {
    // 1. Récupérer le fichier actuel
    const getRes = await fetch(`${apiBase}/contents/${filePath}?ref=${GITHUB_BRANCH}`, { headers })
    if (!getRes.ok) throw new Error(`GitHub GET échoué : ${getRes.status}`)
    const getJson = await getRes.json()
    const sha = getJson.sha
    const currentIndex = JSON.parse(Buffer.from(getJson.content, 'base64').toString('utf-8'))

    // 2. Vérifier qu'on n'ajoute pas un doublon
    const exists = currentIndex.find(s => s.id === soundEntry.id)
    if (exists) {
      // Mettre à jour l'entrée existante plutôt que de dupliquer
      const updatedIndex = currentIndex.map(s => s.id === soundEntry.id ? soundEntry : s)
      await pushToGitHub(updatedIndex, sha, filePath, apiBase, headers, GITHUB_BRANCH, 'update')
      return res.status(200).json({ success: true, action: 'updated' })
    }

    // 3. Ajouter l'entrée
    const updatedIndex = [...currentIndex, soundEntry]
    await pushToGitHub(updatedIndex, sha, filePath, apiBase, headers, GITHUB_BRANCH, 'add')
    return res.status(200).json({ success: true, action: 'added' })

  } catch (err) {
    console.error('upload-sound error:', err)
    return res.status(500).json({ error: err.message })
  }
}

async function pushToGitHub(index, sha, filePath, apiBase, headers, branch, action) {
  const content = Buffer.from(JSON.stringify(index, null, 2)).toString('base64')
  const putRes = await fetch(`${apiBase}/contents/${filePath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `sounds: ${action} — ${new Date().toISOString().slice(0, 10)}`,
      content,
      sha,
      branch,
    }),
  })
  if (!putRes.ok) {
    const err = await putRes.json()
    throw new Error(`GitHub PUT échoué : ${JSON.stringify(err)}`)
  }
}

/**
 * migrate-sounds-to-supabase.js
 * 
 * Place ce fichier dans scripts/ et lance :
 *   node scripts/migrate-sounds-to-supabase.js
 * 
 * Prérequis dans .env :
 *   SUPABASE_URL=https://bdwliagkmdofyuuysppg.supabase.co
 *   SUPABASE_SERVICE_KEY=ta_service_role_key
 *   GITHUB_TOKEN=...
 *   GITHUB_OWNER=...
 *   GITHUB_REPO=...
 *   GITHUB_BRANCH=main
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_OWNER = process.env.GITHUB_OWNER
const GITHUB_REPO = process.env.GITHUB_REPO
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const SOUNDS_DIR = path.resolve('./public/sounds')
const INDEX_PATH = path.resolve('./public/sounds/sounds-index.json')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_URL et SUPABASE_SERVICE_KEY requis dans .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function uploadFile(filePath, filename) {
  const fileBuffer = fs.readFileSync(filePath)
  const { data, error } = await supabase.storage
    .from('sounds')
    .upload(filename, fileBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    })
  if (error) throw new Error(`Upload échoué pour ${filename}: ${error.message}`)
  const { data: urlData } = supabase.storage.from('sounds').getPublicUrl(filename)
  return urlData.publicUrl
}

async function updateGitHubIndex(updatedIndex) {
  if (!GITHUB_TOKEN) {
    // Fallback : écrire en local seulement
    fs.writeFileSync(INDEX_PATH, JSON.stringify(updatedIndex, null, 2))
    console.log('ℹ️  GITHUB_TOKEN absent — index mis à jour en local uniquement')
    return
  }
  const content = Buffer.from(JSON.stringify(updatedIndex, null, 2)).toString('base64')
  // Récupérer le SHA actuel du fichier
  const getRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/public/sounds/sounds-index.json?ref=${GITHUB_BRANCH}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  const getJson = await getRes.json()
  const sha = getJson.sha
  await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/public/sounds/sounds-index.json`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'migrate: sons migrés vers Supabase Storage',
        content,
        sha,
        branch: GITHUB_BRANCH,
      }),
    }
  )
  // Écrire aussi en local pour le dev
  fs.writeFileSync(INDEX_PATH, JSON.stringify(updatedIndex, null, 2))
}

async function main() {
  console.log('🚀 Début de la migration des sons vers Supabase Storage\n')

  const indexRaw = fs.readFileSync(INDEX_PATH, 'utf-8')
  const soundsIndex = JSON.parse(indexRaw)

  const mp3Files = fs.readdirSync(SOUNDS_DIR).filter(f => f.endsWith('.mp3'))
  console.log(`📁 ${mp3Files.length} fichiers MP3 trouvés dans public/sounds/\n`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const sound of soundsIndex) {
    // Déjà migré (URL Supabase présente)
    if (sound.url && sound.url.includes('supabase')) {
      console.log(`⏭  ${sound.filename} — déjà sur Supabase`)
      skipped++
      continue
    }

    const localPath = path.join(SOUNDS_DIR, sound.filename)
    if (!fs.existsSync(localPath)) {
      console.warn(`⚠️  Fichier introuvable localement : ${sound.filename}`)
      errors++
      continue
    }

    try {
      process.stdout.write(`⬆️  Upload de ${sound.filename}... `)
      const publicUrl = await uploadFile(localPath, sound.filename)
      sound.url = publicUrl
      console.log(`✅ ${publicUrl}`)
      migrated++
    } catch (err) {
      console.error(`❌ Erreur : ${err.message}`)
      errors++
    }
  }

  console.log(`\n📝 Mise à jour de sounds-index.json...`)
  await updateGitHubIndex(soundsIndex)

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Migration terminée
   Migrés   : ${migrated}
   Ignorés  : ${skipped}
   Erreurs  : ${errors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)

  if (migrated > 0) {
    console.log('💡 Prochaine étape : mettre à jour les fichiers story .json')
    console.log('   Les URLs /sounds/*.mp3 dans story.sounds[] doivent pointer vers Supabase.')
    console.log('   Lance : node scripts/update-story-urls.js\n')
  }
}

main().catch(err => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})

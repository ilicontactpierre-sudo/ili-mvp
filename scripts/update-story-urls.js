/**
 * update-story-urls.js
 * 
 * Après la migration des sons vers Supabase,
 * met à jour les URLs dans tous les fichiers story .json.
 * 
 * Lance : node scripts/update-story-urls.js
 */

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

const STORIES_DIR = path.resolve('./public/stories')
const INDEX_PATH = path.resolve('./public/sounds/sounds-index.json')

const soundsIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'))
// Construire un map id → url
const urlMap = new Map(soundsIndex.map(s => [s.id, s.url]).filter(([, url]) => url))

const storyFiles = fs.readdirSync(STORIES_DIR).filter(f => f.endsWith('.json') && f !== 'index.json')
console.log(`📖 ${storyFiles.length} fichier(s) story trouvé(s)\n`)

let totalUpdated = 0

for (const filename of storyFiles) {
  const filePath = path.join(STORIES_DIR, filename)
  const story = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  let updated = 0
  if (Array.isArray(story.sounds)) {
    for (const sound of story.sounds) {
      const supabaseUrl = urlMap.get(sound.id)
      if (supabaseUrl && sound.url !== supabaseUrl) {
        sound.url = supabaseUrl
        updated++
      }
    }
  }

  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(story, null, 2))
    console.log(`✅ ${filename} — ${updated} URL(s) mise(s) à jour`)
    totalUpdated += updated
  } else {
    console.log(`⏭  ${filename} — rien à mettre à jour`)
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`✅ Total URLs mises à jour : ${totalUpdated}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

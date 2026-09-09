#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════
// validate-story.mjs — Validateur de schéma pour les stories JSON (ILi)
// ══════════════════════════════════════════════════════════════════════════════
//
// USAGE :
//   node scripts/validate-story.mjs public/stories/*.json
//   node scripts/validate-story.mjs public/stories/           (dossier entier)
//   node scripts/validate-story.mjs public/stories/*.json --check-urls
//
// Ce validateur a été construit en inspectant DEUX vraies stories réelles du
// projet (une story simple et une story "serial"), pas en devinant un schéma
// théorique. Il couvre les deux formats découverts :
//
//   - Story SIMPLE  : segments[]/sounds[]/soundTracks[]/vfxTracks[] à la racine.
//   - Story SERIAL  : { "type": "serial", "parts": [ { ...même structure... } ] }
//     Chaque partie a son propre scope isolé : les sons d'une partie ne sont
//     PAS partagés avec les autres parties (vérifié empiriquement).
//
// PHILOSOPHIE — erreurs bloquantes vs avertissements :
//   Le vrai risque documenté dans le fichier maître du projet est qu'un JSON
//   syntaxiquement valide mais SÉMANTIQUEMENT incompatible casse le lecteur
//   sans erreur de build. Ce validateur priorise donc les vérifications
//   RÉFÉRENTIELLES (soundId, startSegmentId, endSegmentId qui pointent vers
//   quelque chose qui existe réellement) — ce sont des erreurs BLOQUANTES.
//   Pour tout ce qui n'a pas pu être confirmé de façon exhaustive sur les
//   deux fichiers de référence (types de gameMode, actions d'audioEvent),
//   le validateur émet un AVERTISSEMENT plutôt qu'une erreur : mieux vaut
//   signaler une valeur inhabituelle que bloquer à tort sur un cas légitime
//   non couvert par l'échantillon de départ.
//
// ══════════════════════════════════════════════════════════════════════════════

import { readFileSync, statSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

// ── Valeurs connues (observées sur les fichiers de référence + doc du projet) ──
// Ces listes ne sont volontairement PAS exhaustives à 100% : toute valeur hors
// liste déclenche un AVERTISSEMENT, jamais une erreur bloquante.
const KNOWN_AUDIO_ACTIONS = new Set(['play', 'stop', 'fadeIn', 'fadeOut', 'volume'])
const KNOWN_GAMEMODE_TYPES = new Set(['sound_check', 'image', 'message_smart', 'code'])
// Liste élargie le 09/09/2026 après un run réel sur l'ensemble des stories du
// repo (voir Journal de décisions) : les 2 fichiers de référence initiaux
// (typewriter, fog) sous-représentaient largement les types réellement utilisés.
const KNOWN_VFX_TYPES = new Set([
  'typewriter', 'fog', 'rain', 'snow', 'underwater', 'sun', 'tremble',
  'erased', 'glitch', 'flicker', 'flash', 'static',
])

// ══════════════════════════════════════════════════════════════════════════════
// COLLECTE D'ERREURS / AVERTISSEMENTS
// ══════════════════════════════════════════════════════════════════════════════

function makeReport() {
  return { errors: [], warnings: [] }
}

function err(report, path, message) {
  report.errors.push(`${path} — ${message}`)
}

function warn(report, path, message) {
  report.warnings.push(`${path} — ${message}`)
}

// ── Petits utilitaires de typage ────────────────────────────────────────────
const isString = (v) => typeof v === 'string'
const isNonEmptyString = (v) => isString(v) && v.trim().length > 0
const isBoolean = (v) => typeof v === 'boolean'
const isNumber = (v) => typeof v === 'number' && !Number.isNaN(v)
const isArray = (v) => Array.isArray(v)
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION D'UN "SCOPE" (racine d'une story simple, OU une part de serial)
// ══════════════════════════════════════════════════════════════════════════════
//
// Un scope regroupe segments[], sounds[], soundTracks[], vfxTracks[] qui se
// référencent mutuellement UNIQUEMENT à l'intérieur de ce même scope.

function validateScope(report, label, scope) {
  const sounds = isArray(scope.sounds) ? scope.sounds : []
  const segments = isArray(scope.segments) ? scope.segments : []
  const soundTracks = isArray(scope.soundTracks) ? scope.soundTracks : []
  const vfxTracks = isArray(scope.vfxTracks) ? scope.vfxTracks : []

  if (!isArray(scope.segments)) {
    err(report, label, `"segments" doit être un tableau (trouvé : ${typeof scope.segments})`)
  }
  if (scope.sounds !== undefined && !isArray(scope.sounds)) {
    err(report, label, `"sounds" doit être un tableau (trouvé : ${typeof scope.sounds})`)
  }

  // ── SOUNDS ────────────────────────────────────────────────────────────────
  const soundIds = new Set()
  const seenSoundIds = new Set()
  for (const [i, sound] of sounds.entries()) {
    const p = `${label} > sounds[${i}]`
    if (!isObject(sound)) { err(report, p, 'doit être un objet'); continue }
    if (!isNonEmptyString(sound.id)) {
      err(report, p, '"id" manquant ou vide')
    } else {
      if (seenSoundIds.has(sound.id)) {
        err(report, p, `"id" dupliqué dans ce scope : "${sound.id}"`)
      }
      seenSoundIds.add(sound.id)
      soundIds.add(sound.id)
    }
    if (!isNonEmptyString(sound.url)) {
      err(report, p, '"url" manquant ou vide')
    } else if (!/^https?:\/\//.test(sound.url) && !sound.url.startsWith('/')) {
      // Deux formes légitimes observées : URL absolue (Supabase) ou chemin
      // relatif vers public/ (ex. "/sounds/xxx.mp3", fichier local du repo).
      err(report, p, `"url" doit être une URL absolue http(s):// ou un chemin commençant par "/" (trouvé : "${sound.url}")`)
    }
    if (sound.loop !== undefined && !isBoolean(sound.loop)) {
      warn(report, p, `"loop" devrait être un booléen (trouvé : ${typeof sound.loop})`)
    }
  }

  // ── SEGMENTS ──────────────────────────────────────────────────────────────
  const segmentIds = new Set()
  const seenSegmentIds = new Set()
  for (const [i, seg] of segments.entries()) {
    const p = `${label} > segments[${i}]${seg?.id ? ` (id=${seg.id})` : ''}`
    if (!isObject(seg)) { err(report, p, 'doit être un objet'); continue }

    if (!isNonEmptyString(seg.id)) {
      err(report, p, '"id" manquant ou vide')
    } else {
      if (seenSegmentIds.has(seg.id)) {
        err(report, p, `"id" dupliqué dans ce scope : "${seg.id}"`)
      }
      seenSegmentIds.add(seg.id)
      segmentIds.add(seg.id)
    }

    if (seg.text === undefined) {
      err(report, p, '"text" manquant (peut être une chaîne vide, mais la clé doit exister)')
    } else if (!isString(seg.text)) {
      err(report, p, `"text" doit être une chaîne (trouvé : ${typeof seg.text})`)
    }

    if (seg.lines !== undefined) {
      if (!isArray(seg.lines) || !seg.lines.every(isString)) {
        err(report, p, '"lines" doit être un tableau de chaînes')
      }
    }
    if (seg.breakAt !== undefined && seg.breakAt !== null && !isNumber(seg.breakAt)) {
      err(report, p, `"breakAt" doit être un nombre ou null (trouvé : ${typeof seg.breakAt})`)
    }
    for (const boolField of ['isLeader', 'isChapter', 'italic', 'bold', 'underline', 'strikethrough']) {
      if (seg[boolField] !== undefined && !isBoolean(seg[boolField])) {
        warn(report, p, `"${boolField}" devrait être un booléen (trouvé : ${typeof seg[boolField]})`)
      }
    }
    // fontFamily : chaîne (nom de police) OU null (pas de police personnalisée,
    // usage confirmé sur données réelles le 09/09/2026). typeof null === 'object'
    // en JS, donc on exclut explicitement null avant de flaguer un vrai objet.
    if (seg.fontFamily !== undefined && seg.fontFamily !== null && !isString(seg.fontFamily)) {
      warn(report, p, `"fontFamily" devrait être une chaîne ou null (trouvé : ${typeof seg.fontFamily})`)
    }
    if (seg.pause !== undefined && !isNumber(seg.pause)) {
      err(report, p, `"pause" doit être un nombre (trouvé : ${typeof seg.pause})`)
    }

    // audioEvents
    if (seg.audioEvents !== undefined) {
      if (!isArray(seg.audioEvents)) {
        err(report, p, '"audioEvents" doit être un tableau')
      } else {
        seg.audioEvents.forEach((ev, j) => {
          const ep = `${p} > audioEvents[${j}]`
          if (!isObject(ev)) { err(report, ep, 'doit être un objet'); return }
          if (!isNonEmptyString(ev.action)) {
            err(report, ep, '"action" manquant ou vide')
          } else if (!KNOWN_AUDIO_ACTIONS.has(ev.action)) {
            warn(report, ep, `action inhabituelle non reconnue : "${ev.action}" (connues : ${[...KNOWN_AUDIO_ACTIONS].join(', ')})`)
          }
          if (!isNonEmptyString(ev.soundId)) {
            err(report, ep, '"soundId" manquant ou vide')
          } else if (!soundIds.has(ev.soundId)) {
            err(report, ep, `"soundId" fait référence à un son introuvable dans ce scope : "${ev.soundId}"`)
          }
          for (const numField of ['volume', 'gainDb', 'delay', 'duration']) {
            if (ev[numField] !== undefined && !isNumber(ev[numField])) {
              warn(report, ep, `"${numField}" devrait être un nombre (trouvé : ${typeof ev[numField]})`)
            }
          }
          if (ev.loop !== undefined && !isBoolean(ev.loop)) {
            warn(report, ep, `"loop" devrait être un booléen (trouvé : ${typeof ev.loop})`)
          }
        })
      }
    }

    // gameMode (soft-check : on ne connaît que 4 types avec certitude)
    if (seg.gameMode !== undefined) {
      if (!isObject(seg.gameMode)) {
        err(report, p, '"gameMode" doit être un objet')
      } else {
        const gp = `${p} > gameMode`
        if (!isNonEmptyString(seg.gameMode.type)) {
          err(report, gp, '"type" manquant ou vide')
        } else if (!KNOWN_GAMEMODE_TYPES.has(seg.gameMode.type)) {
          warn(report, gp, `type inhabituel non reconnu : "${seg.gameMode.type}" (connus : ${[...KNOWN_GAMEMODE_TYPES].join(', ')})`)
        }
        // Vérifications légères, par type connu, sans bloquer sur les champs
        // additionnels ou une variante non prévue.
        if (seg.gameMode.type === 'message_smart' && seg.gameMode.choices !== undefined) {
          if (!isArray(seg.gameMode.choices)) {
            err(report, gp, '"choices" doit être un tableau')
          }
        }
      }
    }

    if (seg.transition !== undefined && !isObject(seg.transition)) {
      err(report, p, '"transition" doit être un objet')
    }
  }

  // ── SOUND TRACKS ──────────────────────────────────────────────────────────
  const seenTrackIds = new Set()
  for (const [i, track] of soundTracks.entries()) {
    const p = `${label} > soundTracks[${i}]${track?.id ? ` (id=${track.id})` : ''}`
    if (!isObject(track)) { err(report, p, 'doit être un objet'); continue }

    if (!isNonEmptyString(track.id)) {
      err(report, p, '"id" manquant ou vide')
    } else {
      if (seenTrackIds.has(track.id)) {
        err(report, p, `"id" dupliqué dans ce scope : "${track.id}"`)
      }
      seenTrackIds.add(track.id)
    }
    if (!isNonEmptyString(track.soundId)) {
      err(report, p, '"soundId" manquant ou vide')
    } else if (!soundIds.has(track.soundId)) {
      err(report, p, `"soundId" fait référence à un son introuvable dans ce scope : "${track.soundId}"`)
    }
    if (!isNonEmptyString(track.startSegmentId)) {
      err(report, p, '"startSegmentId" manquant ou vide')
    } else if (!segmentIds.has(track.startSegmentId)) {
      err(report, p, `"startSegmentId" fait référence à un segment introuvable dans ce scope : "${track.startSegmentId}"`)
    }
    if (!isNonEmptyString(track.endSegmentId)) {
      err(report, p, '"endSegmentId" manquant ou vide')
    } else if (!segmentIds.has(track.endSegmentId)) {
      err(report, p, `"endSegmentId" fait référence à un segment introuvable dans ce scope : "${track.endSegmentId}"`)
    }
    if (track.column !== undefined && !isNumber(track.column)) {
      warn(report, p, `"column" devrait être un nombre (trouvé : ${typeof track.column})`)
    }
    for (const boolField of ['loop', 'muted', 'broken']) {
      if (track[boolField] !== undefined && !isBoolean(track[boolField])) {
        warn(report, p, `"${boolField}" devrait être un booléen (trouvé : ${typeof track[boolField]})`)
      }
    }
    if (track.automationPoints !== undefined) {
      if (!isArray(track.automationPoints)) {
        err(report, p, '"automationPoints" doit être un tableau')
      } else {
        track.automationPoints.forEach((pt, j) => {
          const pp = `${p} > automationPoints[${j}]`
          if (!isObject(pt)) { err(report, pp, 'doit être un objet'); return }
          if (!isNonEmptyString(pt.segmentId)) {
            err(report, pp, '"segmentId" manquant ou vide')
          } else if (!segmentIds.has(pt.segmentId)) {
            err(report, pp, `"segmentId" fait référence à un segment introuvable dans ce scope : "${pt.segmentId}"`)
          }
        })
      }
    }
    // Champs internes préfixés "_orchestration..." : métadonnées d'assistance
    // à la composition, jamais validées ni bloquées (usage libre, évolutif).
  }

  // ── VFX TRACKS ────────────────────────────────────────────────────────────
  const seenVfxIds = new Set()
  for (const [i, vfx] of vfxTracks.entries()) {
    const p = `${label} > vfxTracks[${i}]${vfx?.id ? ` (id=${vfx.id})` : ''}`
    if (!isObject(vfx)) { err(report, p, 'doit être un objet'); continue }

    if (!isNonEmptyString(vfx.id)) {
      err(report, p, '"id" manquant ou vide')
    } else {
      if (seenVfxIds.has(vfx.id)) {
        err(report, p, `"id" dupliqué dans ce scope : "${vfx.id}"`)
      }
      seenVfxIds.add(vfx.id)
    }
    if (!isNonEmptyString(vfx.type)) {
      err(report, p, '"type" manquant ou vide')
    } else if (!KNOWN_VFX_TYPES.has(vfx.type)) {
      warn(report, p, `type inhabituel non reconnu : "${vfx.type}" (connus : ${[...KNOWN_VFX_TYPES].join(', ')})`)
    }
    if (!isNonEmptyString(vfx.startSegmentId)) {
      err(report, p, '"startSegmentId" manquant ou vide')
    } else if (!segmentIds.has(vfx.startSegmentId)) {
      err(report, p, `"startSegmentId" fait référence à un segment introuvable dans ce scope : "${vfx.startSegmentId}"`)
    }
    if (!isNonEmptyString(vfx.endSegmentId)) {
      err(report, p, '"endSegmentId" manquant ou vide')
    } else if (!segmentIds.has(vfx.endSegmentId)) {
      err(report, p, `"endSegmentId" fait référence à un segment introuvable dans ce scope : "${vfx.endSegmentId}"`)
    }
  }

  return { soundIds, segmentIds }
}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION D'UNE STORY COMPLÈTE (fichier entier)
// ══════════════════════════════════════════════════════════════════════════════

function validateStory(story, fileLabel) {
  const report = makeReport()

  if (!isObject(story)) {
    err(report, fileLabel, 'le contenu du fichier doit être un objet JSON')
    return report
  }

  if (!isNonEmptyString(story.id)) err(report, fileLabel, '"id" manquant ou vide')
  if (!isNonEmptyString(story.title)) err(report, fileLabel, '"title" manquant ou vide')
  if (!isNonEmptyString(story.author)) err(report, fileLabel, '"author" manquant ou vide')
  if (story.published !== undefined && !isBoolean(story.published)) {
    err(report, fileLabel, `"published" doit être un booléen (trouvé : ${typeof story.published})`)
  }

  const isSerial = story.type === 'serial'

  if (isSerial) {
    if (!isArray(story.parts) || story.parts.length === 0) {
      err(report, fileLabel, 'story de type "serial" mais "parts" est absent, vide ou n\'est pas un tableau')
      return report
    }
    const partIds = new Set()
    const seenPartIds = new Set()
    story.parts.forEach((part) => {
      if (isObject(part) && isNonEmptyString(part.id)) partIds.add(part.id)
    })
    story.parts.forEach((part, i) => {
      const label = `${fileLabel} > parts[${i}]${part?.id ? ` (id=${part.id})` : ''}`
      if (!isObject(part)) { err(report, label, 'doit être un objet'); return }
      if (!isNonEmptyString(part.id)) {
        err(report, label, '"id" manquant ou vide')
      } else {
        if (seenPartIds.has(part.id)) err(report, label, `"id" de partie dupliqué : "${part.id}"`)
        seenPartIds.add(part.id)
      }
      if (!isNonEmptyString(part.title)) err(report, label, '"title" manquant ou vide')
      if (part.published !== undefined && !isBoolean(part.published)) {
        err(report, label, `"published" doit être un booléen (trouvé : ${typeof part.published})`)
      }
      validateScope(report, label, part)

      // Vérification légère des liens de navigation entre parties (message_smart)
      for (const seg of part.segments || []) {
        const choices = seg?.gameMode?.choices
        if (isArray(choices)) {
          choices.forEach((choice, ci) => {
            if (isObject(choice) && isNonEmptyString(choice.targetPartId) && !partIds.has(choice.targetPartId)) {
              warn(report, `${label} > segments (id=${seg.id}) > gameMode.choices[${ci}]`,
                `"targetPartId" fait référence à une partie introuvable : "${choice.targetPartId}"`)
            }
          })
        }
      }
    })
  } else {
    validateScope(report, fileLabel, story)
  }

  return report
}

// ══════════════════════════════════════════════════════════════════════════════
// VÉRIFICATION RÉSEAU OPTIONNELLE (--check-urls)
// ══════════════════════════════════════════════════════════════════════════════

async function checkUrl(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal })
    if (res.status === 405 || res.status === 501) {
      // Certains serveurs n'acceptent pas HEAD : on retente en GET minimal.
      res = await fetch(url, { method: 'GET', signal: controller.signal })
    }
    return { ok: res.ok, status: res.status }
  } catch (e) {
    return { ok: false, status: null, error: e.message }
  } finally {
    clearTimeout(timeout)
  }
}

async function checkUrlsWithConcurrency(urls, concurrency = 5) {
  const uniqueUrls = [...new Set(urls)]
  const results = new Map()
  let index = 0
  async function worker() {
    while (index < uniqueUrls.length) {
      const i = index++
      const url = uniqueUrls[i]
      results.set(url, await checkUrl(url))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, uniqueUrls.length) }, worker))
  return results
}

function collectAllSoundUrls(story) {
  const urls = []
  let skippedRelative = 0
  const collectFromScope = (scope) => {
    for (const s of scope.sounds || []) {
      if (isNonEmptyString(s?.url)) {
        if (/^https?:\/\//.test(s.url)) {
          urls.push(s.url)
        } else {
          skippedRelative++
        }
      }
    }
  }
  if (story.type === 'serial') {
    for (const part of story.parts || []) collectFromScope(part)
  } else {
    collectFromScope(story)
  }
  return { urls, skippedRelative }
}

// ══════════════════════════════════════════════════════════════════════════════
// CLI
// ══════════════════════════════════════════════════════════════════════════════

function expandInputPaths(rawArgs) {
  const files = []
  for (const arg of rawArgs) {
    const resolved = resolve(arg)
    let st
    try {
      st = statSync(resolved)
    } catch {
      console.error(`⚠️  Chemin introuvable, ignoré : ${arg}`)
      continue
    }
    if (st.isDirectory()) {
      for (const entry of readdirSync(resolved)) {
        if (!entry.endsWith('.json')) continue
        if (entry === 'index.json') {
          console.log(`ℹ️  ${join(resolved, entry)} ignoré (fichier manifeste, pas une story)`)
          continue
        }
        files.push(join(resolved, entry))
      }
    } else if (resolved.endsWith('.json')) {
      if (resolved.endsWith('/index.json') || resolved === 'index.json') {
        console.log(`ℹ️  ${resolved} ignoré (fichier manifeste, pas une story)`)
        continue
      }
      files.push(resolved)
    }
  }
  return files
}

async function main() {
  const rawArgs = process.argv.slice(2)
  const checkUrls = rawArgs.includes('--check-urls')
  const pathArgs = rawArgs.filter((a) => a !== '--check-urls')

  if (pathArgs.length === 0) {
    console.error('Usage : node scripts/validate-story.mjs <fichier(s)|dossier> [--check-urls]')
    process.exit(1)
  }

  const files = expandInputPaths(pathArgs)
  if (files.length === 0) {
    console.error('Aucun fichier .json trouvé.')
    process.exit(1)
  }

  let totalErrors = 0
  let totalWarnings = 0
  let totalSkippedRelative = 0
  const allUrlsToCheck = []
  const parsedStories = []

  for (const file of files) {
    const fileLabel = file
    let story
    try {
      const raw = readFileSync(file, 'utf8')
      story = JSON.parse(raw)
    } catch (e) {
      console.log(`\n❌ ${fileLabel}`)
      console.log(`   JSON invalide : ${e.message}`)
      totalErrors++
      continue
    }

    const report = validateStory(story, fileLabel)
    parsedStories.push({ file, story })

    if (report.errors.length === 0 && report.warnings.length === 0) {
      console.log(`\n✅ ${fileLabel} — OK`)
    } else {
      console.log(`\n${report.errors.length > 0 ? '❌' : '⚠️ '} ${fileLabel}`)
      for (const e of report.errors) console.log(`   [ERREUR] ${e}`)
      for (const w of report.warnings) console.log(`   [avertissement] ${w}`)
    }
    totalErrors += report.errors.length
    totalWarnings += report.warnings.length

    if (checkUrls) {
      const { urls, skippedRelative } = collectAllSoundUrls(story)
      allUrlsToCheck.push(...urls)
      totalSkippedRelative += skippedRelative
    }
  }

  if (checkUrls && allUrlsToCheck.length > 0) {
    console.log(`\n🌐 Vérification réseau de ${new Set(allUrlsToCheck).size} URL(s) absolue(s) unique(s)...`)
    if (totalSkippedRelative > 0) {
      console.log(`   (${totalSkippedRelative} chemin(s) relatif(s) "/sounds/..." ignoré(s) — non vérifiables sans URL de base connue)`)
    }
    const results = await checkUrlsWithConcurrency(allUrlsToCheck)
    let brokenCount = 0
    for (const [url, result] of results.entries()) {
      if (!result.ok) {
        brokenCount++
        totalErrors++
        console.log(`   [ERREUR] URL inaccessible : ${url}${result.status ? ` (HTTP ${result.status})` : ''}${result.error ? ` — ${result.error}` : ''}`)
      }
    }
    if (brokenCount === 0) {
      console.log('   ✅ Toutes les URLs répondent correctement.')
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`${files.length} fichier(s) analysé(s) — ${totalErrors} erreur(s), ${totalWarnings} avertissement(s).`)

  process.exit(totalErrors > 0 ? 1 : 0)
}

main()

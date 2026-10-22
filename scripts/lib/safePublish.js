// Publication sûre : rapport des fichiers, vérifications, alertes et confirmation.
// Utilisé par `npm run publish` (scripts/publish.js) et `npm run checkpoint` (scripts/checkpoint.js).
//
// Principes :
//  - RIEN n'est ajouté, enregistré ni envoyé avant la confirmation finale ;
//  - la liste réelle des fichiers qui partiront est montrée (commits en avance + modifications
//    non enregistrées + fichiers nouveaux), pas seulement `git status` ;
//  - tests + build sont lancés à chaque fois ;
//  - jamais de rebase ni de fusion automatique : si GitHub a de l'avance, on s'arrête ;
//  - la confirmation demande un mot (le nom de la branche sur main), pas un simple « o » ;
//  - refus de tourner sans vrai terminal (pas d'envoi par un outil automatique).
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import readline from 'node:readline'

export const BIG_FILE_BYTES = 10 * 1024 * 1024
export const MAX_SCAN_BYTES = 1024 * 1024
export const PRODUCTION_BRANCHES = ['main', 'master']
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'

// ───────── fonctions pures (testées) ─────────

export function isProductionBranch(name) {
  return PRODUCTION_BRANCHES.includes(name)
}

// Modèles de secrets. Les valeurs trouvées ne sont JAMAIS affichées (seulement le type et la ligne).
const SECRET_PATTERNS = [
  { kind: 'jeton JWT', re: /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/ },
  { kind: 'clé « sk- »', re: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { kind: 'jeton GitHub', re: /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/ },
  { kind: 'clé AWS', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: 'clé privée', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { kind: 'valeur secrète écrite en clair', re: /(?:api[_-]?key|secret|passw(?:or)?d|token)\w*\s*[:=]\s*['"][A-Za-z0-9_\-+/=.]{16,}['"]/i },
]

export function scanTextForSecrets(text) {
  const found = []
  const lines = String(text).split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const { kind, re } of SECRET_PATTERNS) {
      if (re.test(lines[i])) { found.push({ line: i + 1, kind }); break }
    }
  }
  return found
}

export function riskyPathReason(filePath) {
  const p = String(filePath).replace(/\\/g, '/')
  const base = p.split('/').pop().toLowerCase()
  if (/^\.env(\..+)?$/.test(base) && !/\.(example|sample|template)$/.test(base)) return 'fichier d\'environnement (.env)'
  if (/\.(pem|key|p12|pfx|keystore|jks)$/.test(base)) return 'clé ou certificat'
  if (/^id_(rsa|dsa|ecdsa|ed25519)$/.test(base)) return 'clé SSH privée'
  if (/^(credentials|secrets?)(\.[a-z0-9]+)?$/.test(base)) return 'fichier d\'identifiants'
  if (/service[-_]?account.*\.json$/.test(base)) return 'compte de service'
  return null
}

function splitNul(text) {
  return String(text).split('\0').filter((s) => s !== '')
}

// `git diff --name-status -z --no-renames` → [{ status, path }]
export function parseNameStatus(text) {
  const t = splitNul(text)
  const out = []
  for (let i = 0; i + 1 < t.length; i += 2) out.push({ status: t[i][0], path: t[i + 1] })
  return out
}

// `git diff --numstat -z --no-renames` → { files: [{ added, removed, path }], added, removed }
export function parseNumstat(text) {
  const files = []
  for (const rec of splitNul(text)) {
    const [a, r, ...rest] = rec.split('\t')
    if (rest.length === 0) continue
    files.push({ added: a === '-' ? 0 : Number(a), removed: r === '-' ? 0 : Number(r), path: rest.join('\t') })
  }
  return {
    files,
    added: files.reduce((n, f) => n + f.added, 0),
    removed: files.reduce((n, f) => n + f.removed, 0),
  }
}

// Mots à taper avant d'envoyer, dans l'ordre. Le dernier est toujours la confirmation finale.
export function requiredAnswers({ branch, hasRisk, checksFailed }) {
  const words = []
  if (checksFailed) words.push({ word: 'forcer', why: 'Les vérifications ont ÉCHOUÉ. Pour envoyer malgré tout, tapez « forcer »' })
  if (hasRisk) words.push({ word: 'risque', why: 'Des fichiers ou lignes à risque ont été détectés. Pour les envoyer quand même, tapez « risque »' })
  if (isProductionBranch(branch)) words.push({ word: branch, why: `⚠ Cela met le site EN LIGNE pour tous les visiteurs. Pour confirmer, tapez « ${branch} »` })
  else words.push({ word: 'o', why: `Pour envoyer la branche « ${branch} », tapez « o »` })
  return words
}

export function isAnswerAccepted(input, word) {
  const a = String(input ?? '').trim()
  if (word === 'o') return a.toLowerCase() === 'o' || a.toLowerCase() === 'oui'
  return a === word
}

export function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/\x1b\[[0-9;]*m/g, '')
}

export function summarizeTests(output) {
  const m = stripAnsi(output).match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed(?: \| \d+ \w+)? \((\d+)\)/)
  if (!m) return null
  return { failed: Number(m[1] || 0), passed: Number(m[2]), total: Number(m[3]) }
}

export function summarizeBuild(output) {
  const m = stripAnsi(output).match(/built in ([\d.]+m?s)/)
  return m ? m[1] : null
}

export function defaultCommitMessage(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `feat: publish changes ${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`
}

// ───────── git ─────────

function git(args, { allowFail = false, input } = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'], input })
  } catch (e) {
    if (allowFail) return ''
    const detail = (e.stderr || e.message || '').toString().trim()
    throw new Error(`git ${args.join(' ')} a échoué : ${detail}`, { cause: e })
  }
}

function refExists(ref) {
  try { execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], { stdio: 'ignore' }); return true } catch { return false }
}

function aheadBehind(remoteRef) {
  const [behind, ahead] = git(['rev-list', '--left-right', '--count', `${remoteRef}...HEAD`]).trim().split(/\s+/).map(Number)
  return { behind, ahead }
}

function fileSize(p) {
  try { return fs.statSync(p).size } catch { return 0 }
}

function looksBinary(buf) {
  return buf.includes(0)
}

export function buildReport() {
  const branch = git(['branch', '--show-current']).trim()
  if (!branch) throw new Error('Impossible de détecter la branche courante (HEAD détaché).')
  try { git(['fetch', 'origin']) } catch (e) { throw new Error(`Impossible de joindre GitHub (git fetch origin) : ${e.message}`, { cause: e }) }

  const remoteRef = `origin/${branch}`
  const remoteHasBranch = refExists(`refs/remotes/${remoteRef}`)
  let base = remoteHasBranch ? remoteRef : (refExists('refs/remotes/origin/main') ? 'origin/main' : null)
  let behind = 0
  let ahead = 0
  if (remoteHasBranch) ({ behind, ahead } = aheadBehind(remoteRef))
  else if (base) ahead = Number(git(['rev-list', '--count', `${base}..HEAD`]).trim())
  const diffBase = base ?? EMPTY_TREE

  const commits = git(['log', '--oneline', '-n', '15', `${base ?? EMPTY_TREE}..HEAD`], { allowFail: true }).trim().split('\n').filter(Boolean)
  const dirty = git(['status', '--porcelain', '-z']) !== ''
  const tracked = parseNameStatus(git(['diff', '--name-status', '-z', '--no-renames', diffBase]))
  const numstat = parseNumstat(git(['diff', '--numstat', '-z', '--no-renames', diffBase]))
  const untracked = splitNul(git(['ls-files', '--others', '--exclude-standard', '-z']))

  const files = [
    ...tracked.map((f) => ({ status: f.status, path: f.path, kind: 'suivi' })),
    ...untracked.map((p) => ({ status: '?', path: p, kind: 'nouveau' })),
  ]
  const stat = new Map(numstat.files.map((f) => [f.path, f]))
  for (const f of files) {
    const s = stat.get(f.path)
    if (s) { f.added = s.added; f.removed = s.removed }
    if (f.status !== 'D') f.size = fileSize(f.path)
  }

  // Alertes
  const alerts = []
  for (const f of files) {
    if (f.status === 'D') continue
    const why = riskyPathReason(f.path)
    if (why) alerts.push({ file: f.path, text: `fichier à risque (${why})` })
    if (f.size > BIG_FILE_BYTES) alerts.push({ file: f.path, text: `très gros fichier (${(f.size / 1048576).toFixed(1)} Mo)` })
  }
  for (const f of files) {
    if (f.status === 'D') continue
    let text
    if (f.kind === 'nouveau') {
      if (f.size > MAX_SCAN_BYTES) continue
      let buf
      try { buf = fs.readFileSync(f.path) } catch { continue }
      if (looksBinary(buf)) continue
      text = buf.toString('utf8')
    } else {
      text = git(['diff', '-U0', '--no-color', '--no-renames', diffBase, '--', f.path], { allowFail: true })
        .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1)).join('\n')
    }
    for (const hit of scanTextForSecrets(text)) alerts.push({ file: f.path, text: `${hit.kind} (ligne ${hit.line})` })
  }

  return {
    branch, base, remoteHasBranch, behind, ahead, commits, dirty, files, alerts,
    totalAdded: numstat.added, totalRemoved: numstat.removed,
  }
}

// ───────── vérifications (tests + build) ─────────

function lastLines(text, n = 25) {
  return stripAnsi(text).trim().split('\n').slice(-n).join('\n')
}

export function runChecks(env = process.env) {
  const defs = [
    { name: 'Tests', cmd: env.ILI_TEST_CMD || 'npx vitest run' },
    { name: 'Build', cmd: env.ILI_BUILD_CMD || 'npm run build' },
  ]
  return defs.map(({ name, cmd }) => {
    const r = spawnSync(cmd, { shell: true, encoding: 'utf8', timeout: 5 * 60 * 1000, env: { ...env, FORCE_COLOR: '0', CI: '1' }, maxBuffer: 64 * 1024 * 1024 })
    const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`
    const ok = r.status === 0
    let summary = ok ? 'réussi' : (r.error ? `impossible à lancer (${r.error.message})` : 'ÉCHEC')
    if (name === 'Tests') {
      const t = summarizeTests(out)
      if (t) summary = ok ? `${t.passed} tests passés` : `${t.failed} test(s) en échec sur ${t.total}`
    } else {
      const b = summarizeBuild(out)
      if (ok && b) summary = `réussi (${b})`
    }
    return { name, cmd, ok, summary, tail: ok ? '' : lastLines(out) }
  })
}

// ───────── affichage et questions ─────────

function makeIO() {
  const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
  const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s)
  return {
    out: (s = '') => process.stdout.write(`${s}\n`),
    ask: (q) => new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      let done = false
      rl.on('SIGINT', () => { if (!done) { done = true; rl.close(); resolve(null) } })
      rl.on('close', () => { if (!done) { done = true; resolve(null) } })
      rl.question(q, (a) => { done = true; rl.close(); resolve(a) })
    }),
    green: paint('32'), red: paint('31'), yellow: paint('33'), bold: paint('1'), dim: paint('2'),
  }
}

function printReport(r, io, { title, extraLines }) {
  const prod = isProductionBranch(r.branch)
  io.out('')
  io.out(io.bold(`── ${title} ──`))
  io.out(`Branche : ${io.bold(r.branch)}${prod ? io.yellow('   ⚠ MISE EN LIGNE (branche principale)') : ''}`)
  io.out(`Comparé à : ${r.base ?? '(rien : première publication)'}${r.remoteHasBranch ? '' : '   (cette branche n\'existe pas encore sur GitHub)'}`)
  for (const l of extraLines) io.out(l)
  io.out(`À envoyer : ${r.ahead} commit(s) en avance${r.dirty ? ' + des modifications non enregistrées (elles seront ajoutées et enregistrées)' : ''}`)
  io.out(`            ${r.files.length} fichier(s) concerné(s)  (+${r.totalAdded} −${r.totalRemoved} lignes, hors fichiers nouveaux)`)
  if (r.commits.length) {
    io.out('Commits :')
    for (const c of r.commits.slice(0, 10)) io.out(`  ${c}`)
    if (r.commits.length > 10) io.out(`  … et ${r.commits.length - 10} autre(s)`)
  }
  if (r.files.length) {
    io.out('Fichiers :')
    for (const f of r.files.slice(0, 40)) {
      const extra = f.kind === 'nouveau' ? `nouveau, non suivi, ${(f.size / 1024).toFixed(1)} Ko` : (f.added != null ? `+${f.added} −${f.removed}` : '')
      io.out(`  ${f.status} ${f.path}${extra ? `  (${extra})` : ''}`)
    }
    if (r.files.length > 40) io.out(`  … et ${r.files.length - 40} autre(s)`)
  }
}

// Prépare une publication : rapport, vérifications, confirmation. N'écrit RIEN dans git.
// status : 'confirmed' | 'cancelled' | 'blocked' | 'nothing' | 'dry-run'
export async function prepare({ title = 'Publication', extraLines = [], allowNothing = false, skipChecks = false, dryRun = false, io = makeIO(), env = process.env } = {}) {
  if (!dryRun && !(process.stdin.isTTY && process.stdout.isTTY)) {
    io.out(io.red('Refus : cette commande doit être lancée dans un vrai terminal (pas par un script ni un outil automatique).'))
    io.out('Pour seulement voir ce qui serait envoyé : ajoutez --dry-run.')
    return { status: 'blocked', reason: 'no-tty' }
  }
  let report
  try { report = buildReport() } catch (e) {
    io.out(io.red(`Arrêt : ${e.message}`))
    return { status: 'blocked', reason: 'git' }
  }
  printReport(report, io, { title, extraLines })

  if (report.behind > 0) {
    const diverged = report.ahead > 0 || report.dirty
    io.out('')
    io.out(io.red(diverged
      ? `Arrêt : GitHub a ${report.behind} commit(s) que ta branche n'a pas, et tu as aussi des changements locaux : les deux ont divergé.`
      : `Arrêt : ta branche est en retard de ${report.behind} commit(s) sur GitHub.`))
    io.out('Aucun rebase ni fusion automatique. Rien n\'a été modifié ni envoyé.')
    io.out(diverged
      ? 'Demande de l\'aide avant de continuer (ne force rien).'
      : 'Si tu es sûr de ne rien perdre : git pull --ff-only')
    return { status: 'blocked', reason: 'behind', report }
  }
  const nothing = !report.dirty && report.ahead === 0
  if (nothing && !allowNothing) {
    io.out('')
    io.out(io.green('Rien à publier : aucun changement et aucun commit en avance.'))
    return { status: 'nothing', report }
  }
  if (nothing) io.out(io.dim('Aucun changement : l\'étiquette sera posée sur le dernier commit.'))

  let checks = []
  if (skipChecks) {
    io.out('')
    io.out(io.yellow('⚠ Vérifications SAUTÉES (option --skip-checks) : ni tests ni build.'))
  } else {
    io.out('')
    io.out(io.dim('Vérifications en cours (tests puis build)…'))
    checks = runChecks(env)
    for (const c of checks) {
      io.out(`  ${c.ok ? io.green('✓') : io.red('✗')} ${c.name} : ${c.summary}`)
      if (!c.ok && c.tail) io.out(io.dim(c.tail.split('\n').map((l) => `      ${l}`).join('\n')))
    }
  }
  const checksFailed = checks.some((c) => !c.ok)
  if (report.alerts.length) {
    io.out('')
    io.out(io.yellow(`⚠ ${report.alerts.length} alerte(s) à vérifier (les valeurs ne sont jamais affichées) :`))
    for (const a of report.alerts.slice(0, 20)) io.out(io.yellow(`  ⚠ ${a.file} : ${a.text}`))
    if (report.alerts.length > 20) io.out(io.yellow(`  … et ${report.alerts.length - 20} autre(s)`))
  }

  if (dryRun) {
    io.out('')
    io.out(io.green('Simulation (--dry-run) : rien n\'a été ajouté, enregistré ni envoyé.'))
    return { status: 'dry-run', report, checks }
  }

  io.out('')
  for (const { word, why } of requiredAnswers({ branch: report.branch, hasRisk: report.alerts.length > 0, checksFailed })) {
    const answer = await io.ask(`${why} (autre chose = annuler) : `)
    if (!isAnswerAccepted(answer, word)) {
      io.out('')
      io.out(io.yellow('Annulé. Rien n\'a été ajouté, enregistré ni envoyé.'))
      return { status: 'cancelled', report, checks }
    }
  }
  return { status: 'confirmed', report, checks }
}

// Enregistre les modifications (s'il y en a) puis envoie la branche. À n'appeler qu'après 'confirmed'.
export function commitAndPush({ message, report, io = makeIO() }) {
  const { branch } = report
  if (report.dirty) {
    io.out(io.dim('Ajout et enregistrement des modifications…'))
    execFileSync('git', ['add', '-A'], { stdio: 'inherit' })
    execFileSync('git', ['commit', '-m', message], { stdio: 'inherit' })
  }
  execFileSync('git', ['fetch', 'origin'], { stdio: 'inherit' })
  if (refExists(`refs/remotes/origin/${branch}`)) {
    const { behind } = aheadBehind(`origin/${branch}`)
    if (behind > 0) {
      throw new Error(`GitHub a reçu ${behind} nouveau(x) commit(s) pendant la vérification : rien n'a été envoyé.${report.dirty ? ' (Tes modifications sont enregistrées en local.)' : ''} Fais d'abord : git pull --ff-only`)
    }
  }
  execFileSync('git', ['push', 'origin', branch], { stdio: 'inherit' })
}

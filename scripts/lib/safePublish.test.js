import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import {
  isProductionBranch, scanTextForSecrets, riskyPathReason, parseNameStatus, parseNumstat,
  requiredAnswers, isAnswerAccepted, summarizeTests, summarizeBuild, defaultCommitMessage, stripAnsi,
} from './safePublish.js'

// Les faux secrets sont assemblés ici, pour que ce fichier ne contienne jamais un secret complet.
const fakeJwt = () => ['eyJ', 'hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', '.', 'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4i', '.', 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV'].join('')
const fakeSk = () => ['s', 'k-', 'abcdefghijklmnopqrstuvwx1234'].join('')
const fakeGh = () => ['gh', 'p_', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('')
const fakeAws = () => ['AK', 'IA', 'ABCDEFGHIJKLMNOP'].join('')
const fakePriv = () => ['-----BEGIN ', 'RSA PRIVATE KEY-----'].join('')
const fakePassAssign = () => ['pass', 'word = "abcdefgh', '12345678"'].join('')

describe('isProductionBranch', () => {
  it('reconnaît main et master seulement', () => {
    expect(isProductionBranch('main')).toBe(true)
    expect(isProductionBranch('master')).toBe(true)
    expect(isProductionBranch('feat/x')).toBe(false)
    expect(isProductionBranch('main2')).toBe(false)
  })
})

describe('scanTextForSecrets', () => {
  it('détecte chaque type de secret et donne le numéro de ligne', () => {
    const text = ['ok', `a = "${fakeJwt()}"`, `k=${fakeSk()}`, `t: ${fakeGh()}`, fakeAws(), fakePriv(), fakePassAssign()].join('\n')
    const hits = scanTextForSecrets(text)
    expect(hits.map((h) => h.line)).toEqual([2, 3, 4, 5, 6, 7])
    expect(hits.map((h) => h.kind)).toEqual(['jeton JWT', 'clé « sk- »', 'jeton GitHub', 'clé AWS', 'clé privée', 'valeur secrète écrite en clair'])
  })
  it('ne renvoie JAMAIS la valeur du secret', () => {
    const hits = scanTextForSecrets(`x = "${fakeJwt()}"`)
    expect(JSON.stringify(hits)).not.toContain('eyJ')
    expect(Object.keys(hits[0]).sort()).toEqual(['kind', 'line'])
  })
  it('ne signale pas du code normal ni les noms de variables d\'environnement', () => {
    const ok = [
      'const key = process.env.SUPABASE_SERVICE_ROLE_KEY',
      'const token = getToken()',
      "const apiKey = import.meta.env.VITE_KEY",
      'password: string',
      "const label = 'Mot de passe oublié ?'",
      'skip-checks est une option',
    ].join('\n')
    expect(scanTextForSecrets(ok)).toEqual([])
  })
  it('ne se signale pas lui-même (le module et ses tests peuvent être publiés)', () => {
    expect(scanTextForSecrets(fs.readFileSync('scripts/lib/safePublish.js', 'utf8'))).toEqual([])
    expect(scanTextForSecrets(fs.readFileSync('scripts/lib/safePublish.test.js', 'utf8'))).toEqual([])
  })
})

describe('riskyPathReason', () => {
  it('signale les fichiers sensibles', () => {
    for (const p of ['.env', '.env.local', '.env.production', 'api/.env', 'keys/server.pem', 'a/b.key', 'x.p12', 'id_rsa', 'home/.ssh/id_ed25519', 'credentials.json', 'secrets.yml', 'service-account-prod.json']) {
      expect(riskyPathReason(p), p).toBeTruthy()
    }
  })
  it('ne signale pas les fichiers normaux ni les modèles', () => {
    for (const p of ['.env.example', '.env.sample', 'src/App.jsx', 'id_rsa.pub', 'public/stories/a.json', 'monkey.js', 'README.md', 'src/keyboard.js']) {
      expect(riskyPathReason(p), p).toBeNull()
    }
  })
})

describe('lecture de la sortie de git', () => {
  it('parseNameStatus gère les espaces et les accents', () => {
    const z = 'M\0src/a b.js\0A\0public/é.json\0D\0old.js\0'
    expect(parseNameStatus(z)).toEqual([
      { status: 'M', path: 'src/a b.js' }, { status: 'A', path: 'public/é.json' }, { status: 'D', path: 'old.js' },
    ])
    expect(parseNameStatus('')).toEqual([])
  })
  it('parseNumstat additionne les lignes et traite les binaires', () => {
    const z = '12\t3\tsrc/a.js\0-\t-\timg.png\0'
    const r = parseNumstat(z)
    expect(r.files).toEqual([{ added: 12, removed: 3, path: 'src/a.js' }, { added: 0, removed: 0, path: 'img.png' }])
    expect(r.added).toBe(12)
    expect(r.removed).toBe(3)
  })
})

describe('requiredAnswers (mots à taper)', () => {
  it('sur main : le nom de la branche', () => {
    expect(requiredAnswers({ branch: 'main', hasRisk: false, checksFailed: false }).map((x) => x.word)).toEqual(['main'])
  })
  it('sur une autre branche : « o »', () => {
    expect(requiredAnswers({ branch: 'feat/x', hasRisk: false, checksFailed: false }).map((x) => x.word)).toEqual(['o'])
  })
  it('alerte : « risque » d\'abord, puis la confirmation finale', () => {
    expect(requiredAnswers({ branch: 'main', hasRisk: true, checksFailed: false }).map((x) => x.word)).toEqual(['risque', 'main'])
  })
  it('vérifications en échec : « forcer » d\'abord ; les deux cumulés se suivent dans l\'ordre', () => {
    expect(requiredAnswers({ branch: 'feat/x', hasRisk: false, checksFailed: true }).map((x) => x.word)).toEqual(['forcer', 'o'])
    expect(requiredAnswers({ branch: 'main', hasRisk: true, checksFailed: true }).map((x) => x.word)).toEqual(['forcer', 'risque', 'main'])
  })
  it('le dernier mot est toujours la confirmation finale', () => {
    for (const branch of ['main', 'feat/x']) {
      const w = requiredAnswers({ branch, hasRisk: true, checksFailed: true })
      expect(w[w.length - 1].word).toBe(branch === 'main' ? 'main' : 'o')
    }
  })
})

describe('isAnswerAccepted', () => {
  it('« o » accepte o, O, oui (espaces ignorés) et rien d\'autre', () => {
    for (const a of ['o', 'O', 'oui', ' o ', 'OUI']) expect(isAnswerAccepted(a, 'o'), a).toBe(true)
    for (const a of ['y', 'yes', 'ok', '', 'n', 'non', 'oo', null, undefined]) expect(isAnswerAccepted(a, 'o'), String(a)).toBe(false)
  })
  it('les autres mots sont exacts (casse comprise), espaces autour ignorés', () => {
    expect(isAnswerAccepted('main', 'main')).toBe(true)
    expect(isAnswerAccepted('  main ', 'main')).toBe(true)
    for (const a of ['MAIN', 'o', 'oui', 'mai', 'main main', '', null]) expect(isAnswerAccepted(a, 'main'), String(a)).toBe(false)
    expect(isAnswerAccepted('forcer', 'forcer')).toBe(true)
    expect(isAnswerAccepted('o', 'forcer')).toBe(false)
    expect(isAnswerAccepted('risque', 'risque')).toBe(true)
  })
})

describe('résumés des vérifications', () => {
  it('summarizeTests lit les succès et les échecs, même avec des couleurs', () => {
    expect(summarizeTests(' Tests  163 passed (163)\n')).toEqual({ failed: 0, passed: 163, total: 163 })
    expect(summarizeTests('\x1b[2m Tests \x1b[22m \x1b[1m\x1b[32m163 passed\x1b[39m (163)')).toEqual({ failed: 0, passed: 163, total: 163 })
    expect(summarizeTests(' Tests  2 failed | 161 passed (163)')).toEqual({ failed: 2, passed: 161, total: 163 })
    expect(summarizeTests('rien')).toBeNull()
  })
  it('summarizeBuild lit la durée', () => {
    expect(summarizeBuild('✓ built in 728ms')).toBe('728ms')
    expect(summarizeBuild('✓ built in 1.10s')).toBe('1.10s')
    expect(summarizeBuild('erreur')).toBeNull()
  })
  it('stripAnsi retire les couleurs', () => {
    expect(stripAnsi('\x1b[31mrouge\x1b[0m')).toBe('rouge')
  })
})

describe('defaultCommitMessage', () => {
  it('garde le format de l\'ancien publish.sh', () => {
    expect(defaultCommitMessage(new Date(2026, 9, 16, 9, 5))).toBe('feat: publish changes 2026-10-16 09:05')
  })
})

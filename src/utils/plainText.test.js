import { describe, it, expect } from 'vitest'
import { toPlainText, truncatePlain } from './plainText.js'

describe('toPlainText', () => {
  it('laisse un texte sans balise intact (espaces normalisés)', () => {
    expect(toPlainText('Il pleut  sur\nla ville.')).toBe('Il pleut sur la ville.')
  })

  it('vide, null ou non-texte → chaîne vide', () => {
    expect(toPlainText('')).toBe('')
    expect(toPlainText(null)).toBe('')
    expect(toPlainText(undefined)).toBe('')
    expect(toPlainText(42)).toBe('')
  })

  it('garde le texte enveloppé par une fonction (couleur, apparition…)', () => {
    expect(toPlainText('</apparition:5300;normal|À suivre…/>')).toBe('À suivre…')
    expect(toPlainText('</couleur:#fff0c7|Bonsoir !/> dit-elle.')).toBe('Bonsoir ! dit-elle.')
    expect(toPlainText('Un </pulse:moyen;normal|battement/> sourd')).toBe('Un battement sourd')
  })

  it('plusieurs balises dans le même segment, avec retour à la ligne', () => {
    const t = '</couleur:#fff|Premier./> </couleur:#ddd|Second./>\nEt la suite.'
    expect(toPlainText(t)).toBe('Premier. Second. Et la suite.')
  })

  it('compteur : affiche la valeur finale, au format du lecteur', () => {
    expect(toPlainText('</chiffres_up:0;78/>€. La note.')).toBe('78€. La note.')
    expect(toPlainText('</chiffres_down:10;3/> jours')).toBe('3 jours')
    expect(toPlainText('</chiffres_up:0;2.50/> €')).toBe('2.50 €')
    expect(toPlainText('</chiffres_up/>')).toBe('100')
    expect(toPlainText('</chiffres_down/>')).toBe('0')
  })

  it('compteur : grand nombre avec séparateur de milliers français', () => {
    const out = toPlainText('</chiffres_up:0;12000/>')
    expect(out.replace(/\s/g, ' ')).toBe('12 000')
  })

  it('compteur cassé (valeur non numérique) → rien', () => {
    expect(toPlainText('Total : </chiffres_up:0;abc/>')).toBe('Total :')
  })

  it('censure : ne révèle jamais le texte caché', () => {
    const out = toPlainText('Le nom est </censure|SECRET/>.')
    expect(out).toBe('Le nom est ….')
    expect(out).not.toContain('SECRET')
  })

  it('lire : texte par défaut, sinon « … »', () => {
    expect(toPlainText('Bonjour </lire:prenom|ami/> !')).toBe('Bonjour ami !')
    expect(toPlainText('Bonjour </lire:prenom/> !')).toBe('Bonjour … !')
  })

  it('journal : remplacé par « … »', () => {
    expect(toPlainText('Tu as écrit {{journal:reve}}.')).toBe('Tu as écrit ….')
  })

  it('fonction inconnue sans contenu : disparaît, avec contenu : garde le texte', () => {
    expect(toPlainText('A </inconnue:1/> B')).toBe('A B')
    expect(toPlainText('A </inconnue:1|mot/> B')).toBe('A mot B')
  })

  it('aucun reste de balise dans le résultat', () => {
    const t = '</fondu_mot:1200;normal|Lentement/> </taille:1.3|GRAND/> </glitch:moyen;loop|bug/> </tremble:fort|peur/> </rupture:500;normal|cassé/>'
    const out = toPlainText(t)
    expect(out).toBe('Lentement GRAND bug peur cassé')
    expect(out).not.toMatch(/<\/|\/>/)
  })
})

describe('truncatePlain', () => {
  it('ne coupe pas un texte court', () => {
    expect(truncatePlain('</couleur:#fff|Court./>', 80)).toBe('Court.')
  })

  it('coupe la fin, sur le texte nettoyé (pas sur les balises)', () => {
    const t = '</couleur:#fff|' + 'a'.repeat(100) + '/>'
    const out = truncatePlain(t, 80)
    expect(out).toBe('a'.repeat(80) + '…')
  })

  it('pile à la limite : pas de « … »', () => {
    expect(truncatePlain('b'.repeat(60), 60)).toBe('b'.repeat(60))
    expect(truncatePlain('b'.repeat(61), 60)).toBe('b'.repeat(60) + '…')
  })

  it('depuis la fin (extrait précédent)', () => {
    const out = truncatePlain('début ' + 'c'.repeat(70), 60, { fromEnd: true })
    expect(out).toBe('… ' + 'c'.repeat(60))
  })
})

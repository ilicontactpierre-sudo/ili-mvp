import { describe, it, expect } from 'vitest'
import { orderSoundsByNeed, getStartSoundIds } from './soundOrder.js'

const segments = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}` }))
const sounds = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, url: `${id}.mp3` }))
const tr = (soundId, s, e, extra = {}) => ({
  soundId, startSegmentId: `s${s}`, ...(e != null ? { endSegmentId: `s${e}` } : {}), ...extra,
})
const ids = (list) => list.map((s) => s.id)

describe('orderSoundsByNeed', () => {
  const story = {
    segments, sounds,
    soundTracks: [tr('a', 0, 4), tr('b', 10, 14), tr('c', 5, 8), tr('d', 20, 29), tr('e', 2, 3, { muted: true })],
  }

  it('depuis le début : actif d\'abord, puis à venir par ordre d\'arrivée ; ignore muets et inutilisés', () => {
    expect(ids(orderSoundsByNeed(story, 0))).toEqual(['a', 'c', 'b', 'd'])
  })

  it('en reprise au milieu : actifs, puis à venir, puis déjà passés (le plus récent d\'abord)', () => {
    // position 12 : b actif ; d à venir ; c (fini en 8) puis a (fini en 4) déjà passés
    expect(ids(orderSoundsByNeed(story, 12))).toEqual(['b', 'd', 'c', 'a'])
  })

  it('un son partagé prend son besoin le plus urgent', () => {
    const s = { segments, sounds, soundTracks: [tr('a', 0, 2), tr('a', 12, 13), tr('b', 6, 7)] }
    expect(ids(orderSoundsByNeed(s, 11))).toEqual(['a', 'b']) // a revient en 12, b est déjà passé
  })

  it('un bloc sans endSegmentId couvre un seul segment', () => {
    const s = { segments, sounds, soundTracks: [tr('a', 5, null), tr('b', 6, null)] }
    expect(ids(orderSoundsByNeed(s, 5))).toEqual(['a', 'b'])
  })

  it('ignore un bloc dont le segment de départ est introuvable', () => {
    const s = { segments, sounds, soundTracks: [{ soundId: 'a', startSegmentId: 'nope' }, tr('b', 1, 2)] }
    expect(ids(orderSoundsByNeed(s, 0))).toEqual(['b'])
  })

  it('sans soundTracks (ancien système), garde l\'ordre d\'origine', () => {
    expect(orderSoundsByNeed({ segments, sounds, soundTracks: [] }, 5)).toEqual(sounds)
  })
})

describe('getStartSoundIds', () => {
  const story = { segments, sounds, soundTracks: [tr('a', 0, 4), tr('b', 3, 6), tr('c', 5, 8), tr('d', 20, 29)] }
  it('retient les sons actifs à la position et ceux qui démarrent dans les segments suivants', () => {
    expect(getStartSoundIds(story, 2, 3).sort()).toEqual(['a', 'b', 'c'])
    expect(getStartSoundIds(story, 2, 0).sort()).toEqual(['a'])
  })
  it('en reprise : les sons actifs à cet endroit, pas ceux du début', () => {
    expect(getStartSoundIds(story, 22, 3)).toEqual(['d'])
  })
  it('sans soundTracks : tous les sons', () => {
    expect(getStartSoundIds({ segments, sounds, soundTracks: [] }, 0)).toEqual(ids(sounds))
  })
})

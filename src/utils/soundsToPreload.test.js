import { describe, it, expect } from 'vitest'
import { getSoundsToPreload } from './soundsToPreload.js'

const sons = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

describe('getSoundsToPreload', () => {
  it('renvoie une liste vide si l\'histoire est absente ou sans sons', () => {
    expect(getSoundsToPreload(null)).toEqual([])
    expect(getSoundsToPreload({})).toEqual([])
  })

  it('garde tous les sons si l\'histoire n\'a pas de soundTracks (ancien système audioEvents)', () => {
    expect(getSoundsToPreload({ sounds: sons, soundTracks: [] })).toEqual(sons)
    expect(getSoundsToPreload({ sounds: sons })).toEqual(sons)
  })

  it('retire les sons qui ne servent qu\'à des blocs muets ou cassés', () => {
    const story = {
      sounds: sons,
      soundTracks: [
        { soundId: 'a' },
        { soundId: 'b', muted: true },
        { soundId: 'c', broken: true },
      ],
    }
    expect(getSoundsToPreload(story).map((s) => s.id)).toEqual(['a'])
  })

  it('retire un son jamais référencé par un bloc', () => {
    const story = { sounds: sons, soundTracks: [{ soundId: 'a' }] }
    expect(getSoundsToPreload(story).map((s) => s.id)).toEqual(['a'])
  })

  it('garde un son partagé si au moins un de ses blocs est jouable', () => {
    const story = {
      sounds: sons,
      soundTracks: [{ soundId: 'b', muted: true }, { soundId: 'b' }],
    }
    expect(getSoundsToPreload(story).map((s) => s.id)).toEqual(['b'])
  })

  it('conserve l\'ordre et les propriétés des sons', () => {
    const story = {
      sounds: [{ id: 'x', url: 'u1', loop: true }, { id: 'y', url: 'u2' }],
      soundTracks: [{ soundId: 'y' }, { soundId: 'x' }],
    }
    expect(getSoundsToPreload(story)).toEqual(story.sounds)
  })
})
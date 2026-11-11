import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import SoundBlockPanel from './SoundBlockPanel.jsx'

// Régression : ouvrir un bloc son affichait un écran noir
// (« Cannot access 'handleClose' before initialization »).
describe('SoundBlockPanel', () => {
  it('s\'affiche sans erreur à l\'ouverture d\'un bloc', () => {
    const noop = () => {}
    const props = {
      soundTrack: { id: 't1', soundId: 's1', startSegmentId: 'a', endSegmentId: 'b', column: 0, volume: 0.5, loop: false, fadeIn: 0, fadeOut: 0, _orchestrationNote: 'note de test' },
      sound: { id: 's1', label: 'Son de test', url: 'https://example.com/a.mp3', duration: 10 },
      segments: [{ id: 'a', text: 'Premier segment' }, { id: 'b', text: 'Deuxième segment' }],
      soundLibrary: [],
      adminPassword: '',
      onSave: noop, onRealTimeUpdate: noop, onClose: noop, onDelete: noop, onSoundReplace: noop, onSoundsImported: noop,
    }
    let html = ''
    expect(() => { html = renderToString(createElement(SoundBlockPanel, props)) }).not.toThrow()
    expect(html.length).toBeGreaterThan(100)
  })
})

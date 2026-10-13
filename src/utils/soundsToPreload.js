// Liste des sons à précharger pour une histoire.
// Si l'histoire utilise des blocs `soundTracks`, on ne garde que les sons référencés par
// au moins un bloc JOUABLE : AudioEngine ne joue jamais les blocs muets ou cassés.
// Sans soundTracks (anciennes histoires en audioEvents), tous les sons sont conservés.
export function getSoundsToPreload(story) {
  const sounds = story?.sounds ?? []
  const tracks = story?.soundTracks ?? []
  if (tracks.length === 0) return sounds
  const needed = new Set(
    tracks.filter((t) => !t.muted && !t.broken).map((t) => t.soundId)
  )
  return sounds.filter((s) => needed.has(s.id))
}
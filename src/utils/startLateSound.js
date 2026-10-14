// Colle entre le chargeur de sons et le moteur audio : quand un son arrive en retard, le moteur
// le démarre s'il est encore dans son bloc (voir AudioEngine.onSoundReady).
// `sync` = { index, soundTracks, segments } : dernier état envoyé au moteur par la page, ou null
// tant que le moteur n'a pas été démarré (ou que l'audio est en attente d'un déblocage).
export function startLateSound(engine, sync, soundId) {
  if (!engine || !sync) return
  engine.onSoundReady(soundId, sync.index, sync.soundTracks, sync.segments)
}

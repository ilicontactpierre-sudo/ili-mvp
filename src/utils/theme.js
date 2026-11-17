// Le thème actuel est-il clair (fond clair, texte foncé) ?
//
// Le thème est enregistré par ReaderSettings dans localStorage ('ili_theme') et
// chaque changement est annoncé par l'événement 'ili:settings' (type 'theme').
// Thèmes clairs : « clair » (isDark false) et « Toutdoux » (fond papier).
import { useEffect, useState } from 'react'

export function isLightTheme(theme) {
  if (!theme || typeof theme !== 'object') return false
  return theme.isDark === false || theme.isToutdoux === true
}

export function readIsLightTheme(storage) {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
    if (!store) return false
    return isLightTheme(JSON.parse(store.getItem('ili_theme') || '{}'))
  } catch {
    return false
  }
}

export function useIsLightTheme() {
  const [isLight, setIsLight] = useState(() => readIsLightTheme())
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.type === 'theme') setIsLight(isLightTheme(e.detail))
    }
    window.addEventListener('ili:settings', handler)
    return () => window.removeEventListener('ili:settings', handler)
  }, [])
  return isLight
}

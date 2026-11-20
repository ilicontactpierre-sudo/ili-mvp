// Interrupteur des réglages de lecture : une seule pièce pour tous les interrupteurs
// du menu (Moins d’effets, Barre de progression, Plein écran, plus tard Musique et
// Bruitages), pour que leurs couleurs restent identiques en thème clair comme en sombre.
// L’état allumé se lit sur aria-checked, transmis tel quel au bouton.
export default function ReaderSwitch({ isDark, onClick, ...aria }) {
  const on = aria['aria-checked'] === true
  return (
    <button
      type="button"
      role="switch"
      {...aria}
      onClick={onClick}
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        border: 'none',
        background: on
          ? (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,24,0.45)')
          : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(26,26,24,0.12)'),
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s ease',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        position: 'absolute',
        top: '2px',
        left: on ? '18px' : '2px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: isDark ? '#fff' : '#1a1a18',
        transition: 'left 0.2s ease',
      }} />
    </button>
  )
}

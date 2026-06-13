function InlineFunctionMenu({ query, matches, selectedIndex, position, onSelect, onHover }) {
  const left = Math.min(position.left, window.innerWidth - 300)
  const top = Math.min(position.top + 4, window.innerHeight - 180)
  return (
    <div
      style={{
        position: 'fixed',
        top, left,
        zIndex: 3000,
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        minWidth: '220px',
        maxWidth: '280px',
        maxHeight: '220px',
        overflowY: 'auto',
        fontSize: '0.78rem',
      }}
    >
      <div style={{
        padding: '6px 10px', fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        Fonctions{query ? ` · "${query}"` : ''}
      </div>
      {matches.length === 0 ? (
        <div style={{ padding: '10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
          Aucune fonction correspondante
        </div>
      ) : (
        matches.map(([key, def], i) => (
          <div
            key={key}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(key)}
            onMouseEnter={() => onHover(i)}
            style={{
              padding: '8px 10px',
              cursor: 'pointer',
              backgroundColor: i === selectedIndex ? 'rgba(99,102,241,0.25)' : 'transparent',
              borderLeft: i === selectedIndex ? '2px solid #6366f1' : '2px solid transparent',
            }}
          >
            <div style={{ color: '#fff', fontWeight: 600 }}>{def.label}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: '2px' }}>
              {def.description}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', marginTop: '2px', fontFamily: 'monospace' }}>
              {`</${key}:${def.params.map(p => p.default).join(';')}/>`}
            </div>
          </div>
        ))
      )}
      <div style={{
        padding: '4px 10px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        ↑↓ naviguer · ↵ insérer · Esc fermer
      </div>
    </div>
  )
}
export default InlineFunctionMenu
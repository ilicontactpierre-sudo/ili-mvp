import { useState, useRef, useEffect } from 'react'

/**
 * Champ de saisie de tags avec autocomplete.
 *
 * - value: string[] — tags actuellement assignés
 * - onChange(string[]) — callback à chaque ajout/suppression
 * - suggestions: string[] — tags déjà connus (pour l'autocomplete), généralement
 *   déduits de toutes les histoires existantes (voir loadAllKnownTags)
 * - placeholder?: string
 */
function TagsInput({ value = [], onChange, suggestions = [], placeholder = 'Ajouter un tag…' }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const wrapperRef = useRef(null)

  const filtered = suggestions
    .filter(s => !value.includes(s))
    .filter(s => s.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 8)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addTag = (tag) => {
    const clean = tag.trim()
    if (!clean) return
    if (value.some(v => v.toLowerCase() === clean.toLowerCase())) {
      setInput('')
      return
    }
    onChange([...value, clean])
    setInput('')
    setShowSuggestions(false)
    setHighlightIndex(0)
  }

  const removeTag = (tag) => {
    onChange(value.filter(v => v !== tag))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showSuggestions && filtered[highlightIndex]) {
        addTag(filtered[highlightIndex])
      } else if (input.trim()) {
        addTag(input)
      }
      return
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.4rem',
        padding: '0.5rem 0.6rem',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff',
        minHeight: '40px',
        alignItems: 'center',
      }}>
        {value.map(tag => (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#4338ca',
              fontSize: '0.78rem',
              fontWeight: 500,
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#4338ca', fontSize: '0.7rem', padding: 0,
                lineHeight: 1, opacity: 0.6,
              }}
            >✕</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); setHighlightIndex(0) }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            minWidth: '90px',
            border: 'none',
            outline: 'none',
            fontSize: '0.85rem',
            padding: '0.15rem',
          }}
        />
      </div>

      {showSuggestions && (input || filtered.length > 0) && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          maxHeight: '220px',
          overflowY: 'auto',
        }}>
          {filtered.map((s, i) => (
            <div
              key={s}
              onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
              onMouseEnter={() => setHighlightIndex(i)}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.82rem',
                cursor: 'pointer',
                backgroundColor: i === highlightIndex ? 'rgba(99,102,241,0.08)' : 'transparent',
                color: '#374151',
              }}
            >
              {s}
            </div>
          ))}
          {input.trim() && !suggestions.some(s => s.toLowerCase() === input.trim().toLowerCase()) && (
            <div
              onMouseDown={(e) => { e.preventDefault(); addTag(input) }}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.82rem',
                cursor: 'pointer',
                color: '#6366f1',
                fontWeight: 600,
                borderTop: filtered.length > 0 ? '1px solid #f0f0f0' : 'none',
              }}
            >
              + Créer « {input.trim()} »
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TagsInput

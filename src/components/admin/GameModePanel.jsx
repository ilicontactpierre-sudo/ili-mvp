import { useState, useEffect } from 'react'

const GAME_TYPES = [
  { value: 'image',     label: '🖼  Image / Cinématique' },
  { value: 'filmstrip', label: '🎞  Pellicule' },
  { value: 'document', label: '📄  Document / Artefact' },
  { value: 'message',  label: '💬  Message animé' },
  { value: 'code',     label: '🔢  Code / Digicode' },
  { value: 'riddle',   label: '🧩  Énigme texte libre' },
  { value: 'timer',    label: '⏱  Minuteur' },
  { value: 'sequence', label: '🔀  Séquence à reconstituer' },
  { value: 'journal',  label: '✍️  Journal / Écriture libre' },
]

const DEFAULTS = {
  image:   { type: 'image',   imageUrl: '', caption: '' },
  message: { type: 'message', text: '', interface: 'sms', speed: 'normal' },
  code:    { type: 'code',    answer: '', prompt: '', hint: '', errorMessage: '' },
  riddle:  { type: 'riddle',  question: '', answer: '', hint: '', placeholder: '', caseSensitive: false, errorMessage: '' },
  timer:    { type: 'timer',    seconds: 30, prompt: '', hint: '', expireMessage: '' },
  document:  { type: 'document',  style: 'letter', title: '', body: '', date: '', stamp: '', from: '', to: '' },
  filmstrip: { type: 'filmstrip', images: [], interval: 2500 },
  sequence:  { type: 'sequence',  items: ['', '', ''], prompt: '', successMessage: '' },
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
      {hint && (
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>{hint}</span>
      )}
    </div>
  )
}

const inputStyle = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.85rem',
  backgroundColor: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '6px',
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
}

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '72px',
  lineHeight: 1.5,
}

// ─── Formulaires par type ────────────────────────────────────────────────────

function FormImage({ data, onChange }) {
  return (
    <>
      <Field label="URL de l'image *" hint="Lien direct vers une image (jpg, png, webp…)">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
  <input style={{ ...inputStyle, flex: 1 }} type="url" value={data.imageUrl || ''} placeholder="https://…"
    onChange={e => onChange({ ...data, imageUrl: e.target.value })} />
  
  <a
    href="https://supabase.com/dashboard/project/bdwliagkmdofyuuysppg/storage/files/buckets/Images"
    target="_blank"
    rel="noreferrer"
    title="Ouvrir Supabase Storage pour uploader une image"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 0.75rem',
      backgroundColor: 'rgba(62,207,142,0.15)',
      color: 'rgba(62,207,142,0.9)',
      border: '1px solid rgba(62,207,142,0.25)',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.04em',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    }}
    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(62,207,142,0.25)'}
    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(62,207,142,0.15)'}
  >
    ↗ Supabase
  </a>
</div>

        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
          Upload sur Supabase &#8594; clic droit sur le fichier &#8594; Copy URL &#8594; colle ici
        </span>
      </Field>
      <Field label="Légende" hint="Texte affiché sous l'image (optionnel)">
        <input style={inputStyle} type="text" value={data.caption || ''} placeholder="Ex : Document retrouvé le 14 mars…"
          onChange={e => onChange({ ...data, caption: e.target.value })} />
      </Field>
      <Field label="Animation d'apparition">
        <select style={inputStyle} value={data.animation || 'fade'}
          onChange={e => onChange({ ...data, animation: e.target.value })}>
          <option value="fade">Fondu simple</option>
          <option value="pixels">Pixels aléatoires</option>
          <option value="develop">Développement photo</option>
          <option value="scan">Scan vertical</option>
          <option value="shards">Éclats de verre</option>
          <option value="fog">Brume qui se lève</option>
        </select>
      </Field>
    </>
  )
}

function FormFilmstrip({ data, onChange }) {
  const images = data.images || ['', '', '']
  const updateImage = (i, val) => {
    const next = [...images]
    next[i] = val
    onChange({ ...data, images: next })
  }
  const addImage = () => onChange({ ...data, images: [...images, ''] })
  const removeImage = (i) => {
    const next = images.filter((_, idx) => idx !== i)
    onChange({ ...data, images: next })
  }
  return (
    <>
      <Field label="Images (3 à 5)" hint="Une URL par image — elles défileront dans l'ordre">
        {images.map((url, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <input style={{ ...inputStyle, flex: 1 }} type="url" value={url} placeholder={`Image ${i + 1}…`}
  onChange={e => updateImage(i, e.target.value)} />

          <a
            href="https://supabase.com/dashboard/project/bdwliagkmdofyuuysppg/storage/files/buckets/Images"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 0.6rem',
              backgroundColor: 'rgba(62,207,142,0.15)',
              color: 'rgba(62,207,142,0.9)',
              border: '1px solid rgba(62,207,142,0.25)',
              borderRadius: '6px',
              fontSize: '0.72rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            SB
          </a>

            {images.length > 2 && (
              <button onClick={() => removeImage(i)} style={{
                background: 'none', border: '1px solid rgba(220,38,38,0.3)',
                color: 'rgba(220,38,38,0.7)', borderRadius: '6px',
                padding: '0 0.6rem', cursor: 'pointer', fontSize: '0.75rem',
              }}>✕</button>
            )}
          </div>
        ))}
        {images.length < 5 && (
          <button onClick={addImage} style={{
            marginTop: '0.3rem', background: 'none',
            border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)',
            borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', width: '100%',
          }}>
            + Ajouter une image
          </button>
        )}
      </Field>
      <Field label="Durée par image (ms)">
        <input style={inputStyle} type="number" min="800" max="8000" step="100" value={data.interval || 2500}
          onChange={e => onChange({ ...data, interval: parseInt(e.target.value) || 2500 })} />
      </Field>
    </>
  )
}

function FormMessage({ data, onChange }) {
  return (
    <>
      <Field label="Texte du message *">
        <textarea style={textareaStyle} value={data.text || ''} placeholder="Le message s'affichera lettre par lettre…"
          onChange={e => onChange({ ...data, text: e.target.value })} />
      </Field>
      <Field label="Interface visuelle">
        <select style={inputStyle} value={data.interface || 'sms'}
          onChange={e => onChange({ ...data, interface: e.target.value })}>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="terminal">Terminal</option>
          <option value="">Aucune</option>
        </select>
      </Field>
      <Field label="Vitesse d'affichage">
        <select style={inputStyle} value={data.speed || 'normal'}
          onChange={e => onChange({ ...data, speed: e.target.value })}>
          <option value="lent">Lent</option>
          <option value="normal">Normal</option>
          <option value="rapide">Rapide</option>
        </select>
      </Field>
    </>
  )
}

function FormCode({ data, onChange }) {
  return (
    <>
      <Field label="Réponse correcte *" hint="Chiffres uniquement → clavier numérique. Lettres → champ texte.">
        <input style={inputStyle} type="text" value={data.answer || ''} placeholder="Ex : 1984"
          onChange={e => onChange({ ...data, answer: e.target.value })} />
      </Field>
      <Field label="Invite (texte au-dessus du code)">
        <input style={inputStyle} type="text" value={data.prompt || ''} placeholder="Ex : Entrez le code d'accès"
          onChange={e => onChange({ ...data, prompt: e.target.value })} />
      </Field>
      <Field label="Indice">
        <input style={inputStyle} type="text" value={data.hint || ''} placeholder="Ex : La date sur la lettre…"
          onChange={e => onChange({ ...data, hint: e.target.value })} />
      </Field>
      <Field label="Message d'erreur">
        <input style={inputStyle} type="text" value={data.errorMessage || ''} placeholder="Ex : Code incorrect"
          onChange={e => onChange({ ...data, errorMessage: e.target.value })} />
      </Field>
      <Field label="Message si déjà résolu" hint="Affiché si le lecteur repasse sur ce segment">
        <input style={inputStyle} type="text" value={data.alreadySolvedMessage || ''} placeholder="vous connaissez déjà la réponse"
          onChange={e => onChange({ ...data, alreadySolvedMessage: e.target.value })} />
      </Field>
    </>
  )
}

function FormRiddle({ data, onChange }) {
  return (
    <>
      <Field label="Question *">
        <textarea style={textareaStyle} value={data.question || ''} placeholder="Ex : Quel est le nom de jeune fille de la mère ?"
          onChange={e => onChange({ ...data, question: e.target.value })} />
      </Field>
      <Field label="Réponse correcte *" hint="Plusieurs réponses acceptées : sépare-les par | (ex : chat|chaton|le chat)">
        <input style={inputStyle} type="text" value={data.answer || ''} placeholder="Ex : miroir|le miroir"
          onChange={e => onChange({ ...data, answer: e.target.value })} />
      </Field>
      <Field label="Placeholder du champ">
        <input style={inputStyle} type="text" value={data.placeholder || ''} placeholder="votre réponse…"
          onChange={e => onChange({ ...data, placeholder: e.target.value })} />
      </Field>
      <Field label="Indice">
        <input style={inputStyle} type="text" value={data.hint || ''} placeholder="Optionnel"
          onChange={e => onChange({ ...data, hint: e.target.value })} />
      </Field>
      <Field label="Message d'erreur">
        <input style={inputStyle} type="text" value={data.errorMessage || ''}  placeholder="Ce n'est pas ça…"
          onChange={e => onChange({ ...data, errorMessage: e.target.value })} />
      </Field>
      <Field label="Message si réponse proche" hint="Affiché si la réponse est à 1-2 caractères de la bonne">
        <input style={inputStyle} type="text" value={data.closeMessage || ''} placeholder="Presque…"
          onChange={e => onChange({ ...data, closeMessage: e.target.value })} />
      </Field>
      <Field label="Faux indices (decoys)" hint="Format JSON : [{&quot;key&quot;:&quot;phoenix&quot;, &quot;message&quot;:&quot;Réponse narrative personnalisée&quot;}]">
        <textarea style={textareaStyle} value={data.decoysRaw || ''} placeholder='[{"key":"...", "message":"..."}]'
          onChange={e => {
            try {
              const parsed = JSON.parse(e.target.value)
              onChange({ ...data, decoys: parsed, decoysRaw: e.target.value })
            } catch {
              onChange({ ...data, decoysRaw: e.target.value })
            }
          }} />
      </Field>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input type="checkbox" id="caseSensitive" checked={!!data.caseSensitive}
          onChange={e => onChange({ ...data, caseSensitive: e.target.checked })}
          style={{ accentColor: '#a78bfa' }} />
        <label htmlFor="caseSensitive" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
          Sensible à la casse
        </label>
      </div>
    </>
  )
}

function FormDocument({ data, onChange }) {
  return (
    <>
      <Field label="Style du document">
        <select style={inputStyle} value={data.style || 'letter'}
          onChange={e => onChange({ ...data, style: e.target.value })}>
          <option value="letter">Lettre officielle</option>
          <option value="telegram">Télégramme</option>
          <option value="note">Note manuscrite</option>
          <option value="card">Carte / Badge</option>
          <option value="newspaper">Coupure de presse</option>
        </select>
      </Field>
      <Field label="Titre / Objet">
        <input style={inputStyle} type="text" value={data.title || ''} placeholder="Ex : CONFIDENTIEL — Ordre de mission"
          onChange={e => onChange({ ...data, title: e.target.value })} />
      </Field>
      <Field label="Corps du document *">
        <textarea style={{ ...textareaStyle, minHeight: '120px' }} value={data.body || ''} placeholder="Texte principal du document…"
          onChange={e => onChange({ ...data, body: e.target.value })} />
      </Field>
      <Field label="De (expéditeur)">
        <input style={inputStyle} type="text" value={data.from || ''} placeholder="Ex : Commissaire Moreau"
          onChange={e => onChange({ ...data, from: e.target.value })} />
      </Field>
      <Field label="À (destinataire)">
        <input style={inputStyle} type="text" value={data.to || ''} placeholder="Ex : Agent Duval"
          onChange={e => onChange({ ...data, to: e.target.value })} />
      </Field>
      <Field label="Date">
        <input style={inputStyle} type="text" value={data.date || ''} placeholder="Ex : Paris, le 14 mars 1943"
          onChange={e => onChange({ ...data, date: e.target.value })} />
      </Field>
      <Field label="Tampon / Mention" hint="Texte du tampon en diagonale (ex : URGENT, CLASSIFIÉ, ANNULÉ)">
        <input style={inputStyle} type="text" value={data.stamp || ''} placeholder="Ex : CLASSIFIÉ"
          onChange={e => onChange({ ...data, stamp: e.target.value })} />
      </Field>
    </>
  )
}

function FormSequence({ data, onChange }) {
  const items = data.items || ['', '', '']
  const update = (i, val) => {
    const next = [...items]
    next[i] = val
    onChange({ ...data, items: next })
  }
  const add = () => items.length < 6 && onChange({ ...data, items: [...items, ''] })
  const remove = (i) => {
    if (items.length <= 2) return
    onChange({ ...data, items: items.filter((_, idx) => idx !== i) })
  }
  return (
    <>
      <Field label="Éléments à remettre dans l'ordre *" hint="L'ordre dans lequel tu les entres est la réponse correcte">
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', minWidth: '1rem', textAlign: 'right' }}>{i + 1}</span>
            <input style={{ ...inputStyle, flex: 1 }} type="text" value={item}
              placeholder={`Élément ${i + 1}…`}
              onChange={e => update(i, e.target.value)} />
            {items.length > 2 && (
              <button onClick={() => remove(i)} style={{
                background: 'none', border: '1px solid rgba(220,38,38,0.3)',
                color: 'rgba(220,38,38,0.7)', borderRadius: '6px',
                padding: '0 0.6rem', cursor: 'pointer', fontSize: '0.75rem', height: '100%',
              }}>✕</button>
            )}
          </div>
        ))}
        {items.length < 6 && (
          <button onClick={add} style={{
            marginTop: '0.3rem', background: 'none',
            border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)',
            borderRadius: '6px', padding: '0.4rem 0.75rem',
            cursor: 'pointer', fontSize: '0.78rem', width: '100%',
          }}>
            + Ajouter un élément
          </button>
        )}
      </Field>
      <Field label="Invite" hint="Texte affiché au-dessus de la séquence">
        <input style={inputStyle} type="text" value={data.prompt || ''}
          placeholder="Ex : Remettez les événements dans l'ordre…"
          onChange={e => onChange({ ...data, prompt: e.target.value })} />
      </Field>
      <Field label="Message de succès">
        <input style={inputStyle} type="text" value={data.successMessage || ''}
          placeholder="Ex : Exact."
          onChange={e => onChange({ ...data, successMessage: e.target.value })} />
      </Field>
    </>
  )
}

function FormTimer({ data, onChange }) {
  return (
    <>
      <Field label="Durée (secondes) *">
        <input style={inputStyle} type="number" min="5" max="300" value={data.seconds || 30}
          onChange={e => onChange({ ...data, seconds: parseInt(e.target.value) || 30 })} />
      </Field>
      <Field label="Forme du minuteur">
        <select style={inputStyle} value={data.timerStyle || 'arc'}
          onChange={e => onChange({ ...data, timerStyle: e.target.value })}>
          <option value="arc">Arc SVG</option>
          <option value="bar">Barre de progression</option>
          <option value="retro">Compte à rebours rétro</option>
          <option value="hidden">Invisible (écran vide)</option>
        </select>
      </Field>
      <Field label="Reset au tap" hint="Si activé, toucher l'écran repart le compteur">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" id="timerReset" checked={!!data.resetOnTap}
            onChange={e => onChange({ ...data, resetOnTap: e.target.checked })}
            style={{ accentColor: '#a78bfa' }} />
          <label htmlFor="timerReset" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            Activer le reset au tap
          </label>
        </div>
      </Field>
      <Field label="Texte affiché pendant le compte à rebours">
        <input style={inputStyle} type="text" value={data.prompt || ''} placeholder="Ex : La bombe est amorcée…"
          onChange={e => onChange({ ...data, prompt: e.target.value })} />
      </Field>
      <Field label="Message quand le temps est écoulé">
        <input style={inputStyle} type="text" value={data.expireMessage || ''} placeholder="Ex : Le temps est écoulé."
          onChange={e => onChange({ ...data, expireMessage: e.target.value })} />
      </Field>
      <Field label="Indice">
        <input style={inputStyle} type="text" value={data.hint || ''} placeholder="Optionnel"
          onChange={e => onChange({ ...data, hint: e.target.value })} />
      </Field>
    </>
  )
}

// ─── Panel principal ─────────────────────────────────────────────────────────

function GameModePanel({ segment, segmentIndex, onSave, onDelete, onClose }) {
  const existing = segment?.gameMode ?? null
  const [type, setType] = useState(existing?.type || 'code')
  const [data, setData] = useState(existing || DEFAULTS['code'])

  // Quand on change de type, réinitialiser avec les défauts du nouveau type
  const handleTypeChange = (newType) => {
    setType(newType)
    setData(DEFAULTS[newType])
  }

  const handleSave = () => {
    if (!data.type) return
    onSave(segmentIndex, data)
    onClose()
  }

  const handleDelete = () => {
    onDelete(segmentIndex)
    onClose()
  }

  return (
    <>
      {/* Overlay sombre */}
      <div
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: '90%',
          maxWidth: '460px',
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: '#1a1a1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          fontFamily: 'system-ui, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Segment {segmentIndex + 1}
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
              🎮 Mode Gamification
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer', padding: '0.25rem' }}>✕</button>
        </div>

        {/* Sélecteur de type */}
        <Field label="Type d'interaction">
          <select
            style={inputStyle}
            value={type}
            onChange={e => handleTypeChange(e.target.value)}
          >
            {GAME_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>

        {/* Formulaire selon le type */}
        {type === 'image'     && <FormImage     data={data} onChange={setData} />}
        {type === 'filmstrip' && <FormFilmstrip data={data} onChange={setData} />}
        {type === 'document'  && <FormDocument  data={data} onChange={setData} />}
        {type === 'message'  && <FormMessage  data={data} onChange={setData} />}
        {type === 'code'    && <FormCode    data={data} onChange={setData} />}
        {type === 'riddle'  && <FormRiddle  data={data} onChange={setData} />}
        {type === 'timer'    && <FormTimer    data={data} onChange={setData} />}
        {type === 'sequence' && <FormSequence data={data} onChange={setData} />}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '0.7rem',
              backgroundColor: '#a78bfa',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Enregistrer
          </button>
          {existing && (
            <button
              onClick={handleDelete}
              style={{
                padding: '0.7rem 1rem',
                backgroundColor: 'rgba(220,38,38,0.15)',
                color: 'rgba(220,38,38,0.9)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Supprimer
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '0.7rem 1rem',
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  )
}

export default GameModePanel

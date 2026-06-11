import { useState, useEffect } from 'react'

const GAME_TYPES = [
  { value: 'image',        label: '🖼  Image / Cinématique' },
  { value: 'filmstrip',    label: '🎞  Pellicule' },
  { value: 'document',     label: '📄  Document / Artefact' },
  { value: 'message',      label: '💬  Message animé' },
  { value: 'code',         label: '🔢  Code / Digicode' },
  { value: 'riddle',       label: '🧩  Énigme texte libre' },
  { value: 'timer',        label: '⏱  Minuteur' },
  { value: 'sequence',     label: '🔀  Séquence à reconstituer' },
  { value: 'journal',      label: '✍️  Journal / Écriture libre' },
  { value: 'crypte',       label: '🔐  Crypte / Déchiffrement' },
  { value: 'choice_quiz',  label: '🎯  QCM — Une bonne réponse' },
  { value: 'choice_branch',label: '🌿  Choix narratif — Bifurcation' },
]

const TINTS = [
  { key: 'noir',     label: 'Noir',     bg: '#080809', text: 'rgba(255,255,255,0.75)' },
  { key: 'ardoise',  label: 'Ardoise',  bg: '#0d0d12', text: 'rgba(255,255,255,0.72)' },
  { key: 'encre',    label: 'Encre',    bg: '#080c10', text: 'rgba(200,220,255,0.75)' },
  { key: 'charbon',  label: 'Charbon',  bg: '#0f0f0f', text: 'rgba(255,255,255,0.70)' },
  { key: 'violet',   label: 'Violet',   bg: '#0c0a14', text: 'rgba(200,190,255,0.78)' },
  { key: 'teal',     label: 'Teal',     bg: '#080e0d', text: 'rgba(160,230,210,0.75)' },
  { key: 'bordeaux', label: 'Bordeaux', bg: '#0e0808', text: 'rgba(255,200,200,0.75)' },
  { key: 'brume',    label: 'Brume',    bg: '#0a0a0c', text: 'rgba(220,220,255,0.72)' },
  { key: 'ambre',    label: 'Ambre',    bg: '#0e0b06', text: 'rgba(255,220,150,0.75)' },
  { key: 'foret',    label: 'Forêt',    bg: '#080d09', text: 'rgba(170,230,180,0.72)' },
  { key: 'cobalt',   label: 'Cobalt',   bg: '#070a10', text: 'rgba(160,200,255,0.75)' },
  { key: 'cendre',   label: 'Cendre',   bg: '#0c0c0b', text: 'rgba(220,215,205,0.72)' },
]

const DEFAULT_LAYOUT = { axis: 'H', linesH: 1, linesV: 0, proportions: [1, 1], tint: 'noir' }

const DEFAULTS = {
  image:   { type: 'image',   imageUrl: '', caption: '' },
  message: { type: 'message', text: '', interface: 'sms', speed: 'normal' },
  code:    { type: 'code',    answer: '', prompt: '', hint: '', errorMessage: '', sounds: false },
  riddle:  { type: 'riddle',  question: '', answer: '', hint: '', placeholder: '', caseSensitive: false, errorMessage: '', sounds: false },
  timer:    { type: 'timer',    seconds: 6, prompt: '', hint: '', expireMessage: '' },
  document:  { type: 'document',  style: 'letter', title: '', body: '', date: '', stamp: '', from: '', to: '' },
  filmstrip: { type: 'filmstrip', images: [], interval: 2500, showCounter: true },
  sequence:  { type: 'sequence',  items: ['', '', ''], prompt: '', successMessage: '', sounds: false },
  journal:   { type: 'journal',   prompt: '', placeholder: '', memoryKey: '', continueLabel: '' },
  echo:         { type: 'echo',         phrase: '', prompt: '', successMessage: '', sounds: false },
  crypte:       { type: 'crypte',       cipher: 'caesar', shift: 3, encoded: '', answer: '', hint: '', errorMessage: '', sounds: false },
  choice_quiz:  { type: 'choice_quiz',  layout: { ...DEFAULT_LAYOUT }, prompt: '', choices: [{ id: 'c1', text: '', correct: true }, { id: 'c2', text: '', correct: false }], errorMessage: '' },
  choice_branch:{ type: 'choice_branch',layout: { ...DEFAULT_LAYOUT }, prompt: '', choices: [{ id: 'c1', text: '', targetPartId: '' }, { id: 'c2', text: '', targetPartId: '' }] },
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input type="checkbox" id="showCounter" checked={data.showCounter !== false}
          onChange={e => onChange({ ...data, showCounter: e.target.checked })}
          style={{ accentColor: '#a78bfa' }} />
        <label htmlFor="showCounter" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
          Afficher le compteur (ex : 2 / 5)
        </label>
      </div>
    </>
  )
}

function FormMessage({ data, onChange }) {
  const iface = data.interface || 'sms'
  return (
    <>
      <Field label="Texte du message *">
        <textarea style={textareaStyle} value={data.text || ''} placeholder="Le message s'affichera lettre par lettre…"
          onChange={e => onChange({ ...data, text: e.target.value })} />
      </Field>
      <Field label="Interface visuelle">
        <select style={inputStyle} value={iface}
          onChange={e => onChange({ ...data, interface: e.target.value })}>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="terminal">Terminal</option>
          <option value="">Aucune</option>
        </select>
      </Field>
      {/* Libellé d'en-tête personnalisable selon l'interface */}
      {iface === 'sms' && (
        <Field label="Libellé d'en-tête" hint='Affiché au-dessus du message. Défaut : "Message reçu"'>
          <input style={inputStyle} type="text" value={data.headerLabel || ''}
            placeholder="Message reçu"
            onChange={e => onChange({ ...data, headerLabel: e.target.value })} />
        </Field>
      )}
      {iface === 'email' && (
        <Field label="Libellé d'en-tête" hint='Affiché au-dessus du message. Défaut : "De : inconnu · À : vous"'>
          <input style={inputStyle} type="text" value={data.headerLabel || ''}
            placeholder="De : inconnu · À : vous"
            onChange={e => onChange({ ...data, headerLabel: e.target.value })} />
        </Field>
      )}
      {iface === 'terminal' && (
        <Field label="Libellé d'en-tête" hint='Affiché au-dessus du message. Défaut : "$ incoming_message"'>
          <input style={inputStyle} type="text" value={data.headerLabel || ''}
            placeholder="$ incoming_message"
            onChange={e => onChange({ ...data, headerLabel: e.target.value })} />
        </Field>
      )}
      {/* Option pour masquer l'en-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input type="checkbox" id="hideHeader" checked={!!data.hideHeader}
          onChange={e => onChange({ ...data, hideHeader: e.target.checked })}
          style={{ accentColor: '#a78bfa' }} />
        <label htmlFor="hideHeader" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
          Masquer l'en-tête
        </label>
      </div>
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

// ─── Utilitaires de chiffrement (admin) ──────────────────────────────────────
function caesarEncode(text, shift) {
  return text.split('').map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(((c.charCodeAt(0) - 97 + shift) % 26) + 97)
    if (/[A-Z]/.test(c)) return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65)
    return c
  }).join('')
}
function mirrorEncode(text) {
  return text.split('').map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(219 - c.charCodeAt(0))
    if (/[A-Z]/.test(c)) return String.fromCharCode(155 - c.charCodeAt(0))
    return c
  }).join('')
}
function reverseEncode(text) { return text.split('').reverse().join('') }

function FormCrypte({ data, onChange }) {
  const autoEncode = (answer, cipher, shift) => {
    if (!answer) return ''
    if (cipher === 'caesar') return caesarEncode(answer, parseInt(shift) || 3)
    if (cipher === 'mirror') return mirrorEncode(answer)
    if (cipher === 'reverse') return reverseEncode(answer)
    return answer
  }

  const handleAnswerChange = (val) => {
    const encoded = autoEncode(val, data.cipher, data.shift)
    onChange({ ...data, answer: val, encoded })
  }
  const handleCipherChange = (val) => {
    const encoded = autoEncode(data.answer, val, data.shift)
    onChange({ ...data, cipher: val, encoded })
  }
  const handleShiftChange = (val) => {
    const encoded = autoEncode(data.answer, data.cipher, val)
    onChange({ ...data, shift: parseInt(val) || 3, encoded })
  }

  return (
    <>
      <Field label="Type de chiffrement">
        <select style={inputStyle} value={data.cipher || 'caesar'}
          onChange={e => handleCipherChange(e.target.value)}>
          <option value="caesar">César (décalage alphabétique)</option>
          <option value="mirror">Miroir (A↔Z, B↔Y…)</option>
          <option value="reverse">Miroir (texte inversé)</option>
        </select>
      </Field>
      {data.cipher === 'caesar' && (
        <Field label="Décalage" hint="Entre 1 et 25 — ex : 3 signifie A→D, B→E…">
          <input style={inputStyle} type="number" min="1" max="25"
            value={data.shift || 3}
            onChange={e => handleShiftChange(e.target.value)} />
        </Field>
      )}
      <Field label="Réponse correcte (en clair) *" hint="Le texte chiffré sera généré automatiquement">
        <input style={inputStyle} type="text" value={data.answer || ''}
          placeholder="Ex : lumière"
          onChange={e => handleAnswerChange(e.target.value)} />
      </Field>
      {data.encoded && (
        <Field label="Texte chiffré (généré automatiquement)">
          <div style={{
            padding: '0.6rem 0.75rem',
            backgroundColor: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '0.95rem',
            color: 'rgba(167,139,250,0.9)',
            letterSpacing: '0.1em',
            userSelect: 'all',
          }}>
            {data.encoded}
          </div>
        </Field>
      )}
      <Field label="Invite" hint="Texte affiché au-dessus du message chiffré">
        <input style={inputStyle} type="text" value={data.prompt || ''}
          placeholder="Ex : Ce message a été intercepté…"
          onChange={e => onChange({ ...data, prompt: e.target.value })} />
      </Field>
      <Field label="Indice">
        <input style={inputStyle} type="text" value={data.hint || ''}
          placeholder="Ex : La clé se trouve au chapitre 2."
          onChange={e => onChange({ ...data, hint: e.target.value })} />
      </Field>
      <Field label="Message d'erreur">
        <input style={inputStyle} type="text" value={data.errorMessage || ''}
          placeholder="Ex : Ce n'est pas le bon déchiffrement."
          onChange={e => onChange({ ...data, errorMessage: e.target.value })} />
      </Field>
    </>
  )
}

// ─── Configurateur visuel Layout Mixte ───────────────────────────────────────
// Mini-aperçu téléphone + contrôles inline + édition zone par zone

const TINT_PALETTE = [
  { key: 'auto',     label: 'Auto',     bg: null,      text: null },
  { key: 'noir',     label: 'Noir',     bg: '#080809', text: 'rgba(255,255,255,0.75)' },
  { key: 'ardoise',  label: 'Ardoise',  bg: '#0d0d12', text: 'rgba(255,255,255,0.72)' },
  { key: 'encre',    label: 'Encre',    bg: '#080c10', text: 'rgba(200,220,255,0.75)' },
  { key: 'charbon',  label: 'Charbon',  bg: '#0f0f0f', text: 'rgba(255,255,255,0.70)' },
  { key: 'violet',   label: 'Violet',   bg: '#0c0a14', text: 'rgba(200,190,255,0.78)' },
  { key: 'teal',     label: 'Teal',     bg: '#080e0d', text: 'rgba(160,230,210,0.75)' },
  { key: 'bordeaux', label: 'Bordeaux', bg: '#0e0808', text: 'rgba(255,200,200,0.75)' },
  { key: 'brume',    label: 'Brume',    bg: '#0a0a0c', text: 'rgba(220,220,255,0.72)' },
  { key: 'ambre',    label: 'Ambre',    bg: '#0e0b06', text: 'rgba(255,220,150,0.75)' },
  { key: 'foret',    label: 'Forêt',    bg: '#080d09', text: 'rgba(170,230,180,0.72)' },
  { key: 'cobalt',   label: 'Cobalt',   bg: '#070a10', text: 'rgba(160,200,255,0.75)' },
  { key: 'cendre',   label: 'Cendre',   bg: '#0c0c0b', text: 'rgba(220,215,205,0.72)' },
]

const PROPORTION_PRESETS = {
  2: [{ label: '50/50', vals: [1,1] }, { label: '60/40', vals: [3,2] }, { label: '40/60', vals: [2,3] }, { label: '70/30', vals: [7,3] }, { label: '30/70', vals: [3,7] }],
  3: [{ label: '⅓×3',   vals: [1,1,1] }, { label: '50·25·25', vals: [2,1,1] }, { label: '25·50·25', vals: [1,2,1] }, { label: '25·25·50', vals: [1,1,2] }, { label: '40·30·30', vals: [4,3,3] }],
  4: [{ label: '¼×4',   vals: [1,1,1,1] }, { label: '40·20·20·20', vals: [2,1,1,1] }, { label: '20·30·30·20', vals: [2,3,3,2] }, { label: '30·40·15·15', vals: [3,4,1.5,1.5] }],
}

function getPresets(n) { return PROPORTION_PRESETS[Math.min(n, 4)] || PROPORTION_PRESETS[2] }

// Normalise un array de poids en fractions
function toFracs(weights) {
  const sum = weights.reduce((a,b) => a+b, 0) || 1
  return weights.map(w => w / sum)
}

// Trouve le preset le plus proche
function findClosestPreset(weights, n) {
  const presets = getPresets(n)
  const fracs = toFracs(weights)
  let bestIdx = 0, bestDist = Infinity
  presets.forEach((p, i) => {
    const pf = toFracs(p.vals)
    const dist = pf.reduce((acc, v, j) => acc + Math.abs(v - (fracs[j] ?? 0)), 0)
    if (dist < bestDist) { bestDist = dist; bestIdx = i }
  })
  return bestIdx
}

function ChoiceConfigurator({ isQuiz, data, onChange, parts }) {
  const layout   = data.layout || { axis: 'H', linesH: 1, linesV: 0, proportions: [1,1], tint: 'noir' }
  const choices  = data.choices || []
  const axis     = layout.axis  || 'H'
  const linesH   = axis === 'V' ? 0 : (layout.linesH ?? 1)
  const linesV   = axis === 'H' ? 0 : (layout.linesV ?? 0)
  const zonesH   = linesH + 1
  const zonesV   = linesV + 1
  const totalZones = axis === 'X' ? zonesH * zonesV : (axis === 'H' ? zonesH : zonesV)

  const [activeZone, setActiveZone] = useState(0)

  // Synchroniser choices quand totalZones change
  useEffect(() => {
    if (choices.length === totalZones) return
    const next = Array(totalZones).fill(null).map((_, i) => {
      if (choices[i]) return choices[i]
      return isQuiz
        ? { id: `c${Date.now()}_${i}`, text: '', correct: i === 0 }
        : { id: `c${Date.now()}_${i}`, text: '', targetPartId: '' }
    })
    // S'assurer qu'il y a toujours une bonne réponse pour quiz
    if (isQuiz && !next.some(c => c.correct)) next[0] = { ...next[0], correct: true }
    onChange({ ...data, choices: next })
  }, [totalZones])

  // Proportions
  const rawWeights = layout.proportions && layout.proportions.length === totalZones
    ? layout.proportions : Array(totalZones).fill(1)
  const fracs = toFracs(rawWeights)

  // Fractions H et V pour la grille
  const fracH = axis === 'V' ? [1] : (
    axis === 'X'
      ? Array(zonesH).fill(0).map((_, i) => {
          const row = Array(zonesV).fill(0).map((_, j) => rawWeights[i * zonesV + j] || 1)
          return row.reduce((a,b) => a+b, 0)
        })
      : rawWeights
  )
  const fracV = axis === 'H' ? [1] : (
    axis === 'X'
      ? Array(zonesV).fill(0).map((_, j) => {
          const col = Array(zonesH).fill(0).map((_, i) => rawWeights[i * zonesV + j] || 1)
          return col.reduce((a,b) => a+b, 0)
        })
      : rawWeights
  )
  const sumH = fracH.reduce((a,b) => a+b, 0) || 1
  const sumV = fracV.reduce((a,b) => a+b, 0) || 1

  const tintObj  = TINT_PALETTE.find(t => t.key === layout.tint) || TINT_PALETTE[0]
  const MARGIN   = 7  // % des bords
  const PH = 380, PW = 190  // px du mini-téléphone

  // Lignes de séparation
  const sepLines = []
  if (axis !== 'V') {
    let cum = 0
    fracH.slice(0,-1).forEach(w => {
      cum += w / sumH
      sepLines.push({ type: 'H', pct: cum })
    })
  }
  if (axis !== 'H') {
    let cum = 0
    fracV.slice(0,-1).forEach(w => {
      cum += w / sumV
      sepLines.push({ type: 'V', pct: cum })
    })
  }

  const updateLayout = (patch) => onChange({ ...data, layout: { ...layout, ...patch } })
  const updateChoice = (i, patch) => {
    const next = choices.map((c, idx) => idx === i ? { ...c, ...patch } : c)
    // quiz: une seule bonne réponse
    if (isQuiz && patch.correct === true) {
      next.forEach((c, idx) => { if (idx !== i) c.correct = false })
    }
    onChange({ ...data, choices: next })
  }

  const setAxis = (a) => {
    const nH = a === 'V' ? 0 : linesH
    const nV = a === 'H' ? 0 : linesV
    const nZones = a === 'X' ? (nH+1)*(nV+1) : (a==='H' ? nH+1 : nV+1)
    updateLayout({ axis: a, linesH: nH || (a==='H'?1:0), linesV: nV || (a==='V'?1:0), proportions: Array(nZones).fill(1) })
  }

  const setLinesH = (n) => {
    const nZones = axis === 'X' ? (n+1)*(linesV+1) : n+1
    updateLayout({ linesH: n, proportions: Array(nZones).fill(1) })
  }
  const setLinesV = (n) => {
    const nZones = axis === 'X' ? (linesH+1)*(n+1) : n+1
    updateLayout({ linesV: n, proportions: Array(nZones).fill(1) })
  }
  const setProportions = (vals) => updateLayout({ proportions: vals })

  const activeChoice = choices[activeZone] || null
  const presets      = getPresets(totalZones)
  const closestPreset = findClosestPreset(rawWeights, totalZones)

  // Couleur de l'indicateur de zone active dans la preview
  const ACTIVE_OUTLINE = 'rgba(167,139,250,0.9)'

  // ── Styles partagés ──────────────────────────────────────────────────────
  const pillBtn = (active, color='rgba(167,139,250,0.9)') => ({
    padding: '0.3rem 0.65rem',
    fontSize: '0.72rem',
    fontWeight: active ? 700 : 400,
    backgroundColor: active ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.04)',
    color: active ? color : 'rgba(255,255,255,0.45)',
    border: `1px solid ${active ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    whiteSpace: 'nowrap',
  })

  const sectionLabel = {
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '0.5rem',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

      {/* ── Prompt ── */}
      <Field label="Question / Invite" hint="Affiché en fondu au-dessus des zones (optionnel)">
        <textarea
          style={{ ...textareaStyle, minHeight: '48px' }}
          value={data.prompt || ''}
          placeholder={isQuiz ? 'Ex : Que faites-vous ?' : 'Ex : Votre destin se divise ici.'}
          onChange={e => onChange({ ...data, prompt: e.target.value })}
        />
      </Field>

      {/* ── Configurateur principal : preview + contrôles ── */}
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>

        {/* ── Mini-téléphone preview ── */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{
            width: `${PW}px`, height: `${PH}px`,
            backgroundColor: tintObj.bg,
            borderRadius: '18px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
          }}>
            {/* Zones cliquables */}
            {(() => {
              const cells = []
              let yAcc = 0
              const rowFracs = toFracs(fracH)
              const colFracs = toFracs(fracV)
              for (let ri = 0; ri < (axis === 'V' ? 1 : zonesH); ri++) {
                let xAcc = 0
                for (let ci = 0; ci < (axis === 'H' ? 1 : zonesV); ci++) {
                  const zi = axis === 'X' ? ri * zonesV + ci : (axis === 'H' ? ri : ci)
                  const rh = rowFracs[ri] ?? (1 / zonesH)
                  const cw = colFracs[ci] ?? (1 / zonesV)
                  const isActive = zi === activeZone
                  const choice = choices[zi]
                  cells.push(
                    <div
                      key={zi}
                      onClick={() => setActiveZone(zi)}
                      style={{
                        position: 'absolute',
                        left: `${xAcc * 100}%`,
                        top: `${yAcc * 100}%`,
                        width: `${cw * 100}%`,
                        height: `${rh * 100}%`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isActive ? `inset 0 0 0 1.5px ${ACTIVE_OUTLINE}` : 'none',
                        transition: 'box-shadow 0.15s ease',
                      }}
                    >
                      {/* Numéro de zone */}
                      <span style={{
                        position: 'absolute',
                        top: '5px', left: '7px',
                        fontSize: '7px',
                        color: isActive ? ACTIVE_OUTLINE : 'rgba(255,255,255,0.2)',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        transition: 'color 0.15s',
                      }}>{zi + 1}</span>
                      {/* Texte du choix */}
                      {choice?.text && (
                        <span style={{
                          fontSize: '8px',
                          color: tintObj.text,
                          textAlign: 'center',
                          lineHeight: 1.4,
                          padding: '0.25rem',
                          fontFamily: 'Georgia, serif',
                          opacity: 0.85,
                          maxWidth: '90%',
                          display: 'block',
                          wordBreak: 'break-word',
                        }}>{choice.text}</span>
                      )}
                      {/* Indicateur bonne réponse quiz */}
                      {isQuiz && choice?.correct && (
                        <span style={{
                          position: 'absolute', bottom: '4px', right: '5px',
                          fontSize: '7px', color: 'rgba(39,174,96,0.8)',
                        }}>✓</span>
                      )}
                    </div>
                  )
                  xAcc += cw
                }
                yAcc += rowFracs[ri] ?? (1/zonesH)
              }
              return cells
            })()}

            {/* Traits de séparation */}
            {sepLines.map((line, li) => (
              <div
                key={li}
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  ...(line.type === 'H' ? {
                    left: `${MARGIN}%`, right: `${MARGIN}%`, height: '1px',
                    top: `calc(${line.pct * 100}% - 0.5px)`,
                  } : {
                    top: `${MARGIN}%`, bottom: `${MARGIN}%`, width: '1px',
                    left: `calc(${line.pct * 100}% - 0.5px)`,
                  }),
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
            {totalZones} zone{totalZones > 1 ? 's' : ''} · cliquer pour éditer
          </span>
        </div>

        {/* ── Contrôles droite ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: 0 }}>

          {/* Axe */}
          <div>
            <div style={sectionLabel}>Axe</div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {[['H','Horizontal'],['V','Vertical'],['X','Grille']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => setAxis(val)} style={pillBtn(axis === val)}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Lignes H */}
          {axis !== 'V' && (
            <div>
              <div style={sectionLabel}>Lignes H  <span style={{ opacity: 0.5, fontWeight: 400 }}>→ {zonesH} rang{zonesH > 1 ? 'ées' : 'ée'}</span></div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[0,1,2,3].map(n => (
                  <button key={n} type="button" onClick={() => setLinesH(n)} style={pillBtn(linesH === n)}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {/* Lignes V */}
          {axis !== 'H' && (
            <div>
              <div style={sectionLabel}>Lignes V  <span style={{ opacity: 0.5, fontWeight: 400 }}>→ {zonesV} col.</span></div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[0,1,2].map(n => (
                  <button key={n} type="button" onClick={() => setLinesV(n)} style={pillBtn(linesV === n)}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {/* Proportions */}
          <div>
            <div style={sectionLabel}>Proportions</div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {presets.map((p, i) => (
                <button key={i} type="button" onClick={() => setProportions(p.vals)} style={pillBtn(closestPreset === i)}>{p.label}</button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Éditeur de la zone active ── */}
      {activeChoice !== null && (
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: 'rgba(167,139,250,0.06)',
          border: '1px solid rgba(167,139,250,0.18)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...sectionLabel, marginBottom: 0, color: 'rgba(167,139,250,0.8)' }}>
              Zone {activeZone + 1} sur {totalZones}
            </span>
            {/* Flèches navigation zones */}
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button type="button" onClick={() => setActiveZone(z => Math.max(0, z-1))} disabled={activeZone === 0}
                style={{ ...pillBtn(false), padding: '0.2rem 0.5rem', opacity: activeZone === 0 ? 0.3 : 1 }}>‹</button>
              <button type="button" onClick={() => setActiveZone(z => Math.min(totalZones-1, z+1))} disabled={activeZone === totalZones-1}
                style={{ ...pillBtn(false), padding: '0.2rem 0.5rem', opacity: activeZone === totalZones-1 ? 0.3 : 1 }}>›</button>
            </div>
          </div>

          {/* Texte de la zone */}
          <Field label="Texte affiché dans la zone">
            <input
              style={inputStyle}
              type="text"
              value={activeChoice.text || ''}
              placeholder={isQuiz ? `Option ${activeZone + 1}…` : `Texte de la zone ${activeZone + 1}…`}
              onChange={e => updateChoice(activeZone, { text: e.target.value })}
              autoFocus
            />
          </Field>

          {/* Bonne réponse (quiz uniquement) */}
          {isQuiz && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => updateChoice(activeZone, { correct: !activeChoice.correct })}
                style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: activeChoice.correct ? 'rgba(39,174,96,0.8)' : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${activeChoice.correct ? 'rgba(39,174,96,0.9)' : 'rgba(255,255,255,0.2)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              />
              <span style={{ fontSize: '0.78rem', color: activeChoice.correct ? 'rgba(39,174,96,0.9)' : 'rgba(255,255,255,0.4)' }}>
                {activeChoice.correct ? 'Bonne réponse ✓' : 'Marquer comme bonne réponse'}
              </span>
            </div>
          )}

          {/* Lien vers une partie (branche narrative uniquement) */}
          {!isQuiz && (
            <Field label="Amène vers" hint="Vide ou « Aucune » → avance au segment suivant">
              {parts && parts.length > 0 ? (
                <select
                  style={inputStyle}
                  value={activeChoice.targetPartId || ''}
                  onChange={e => updateChoice(activeZone, { targetPartId: e.target.value })}
                >
                  <option value="">Aucune (segment suivant)</option>
                  {parts.map((p, pi) => (
                    <option key={p.id} value={p.id}>
                      {p.title || `Partie ${pi + 1}`}{p.visibility === 'choice' ? ' · choix multiple' : p.published === false ? ' · brouillon' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: 'rgba(167,139,250,0.85)' }}
                  type="text"
                  value={activeChoice.targetPartId || ''}
                  placeholder="ID de la partie cible (ex: part_xxx)"
                  onChange={e => updateChoice(activeZone, { targetPartId: e.target.value.trim() })}
                />
              )}
            </Field>
          )}
        </div>
      )}

      {/* ── Message d'erreur (quiz uniquement) ── */}
      {isQuiz && (
        <Field label="Message d'erreur" hint="Affiché brièvement sur mauvaise réponse">
          <input
            style={inputStyle}
            type="text"
            value={data.errorMessage || ''}
            placeholder="Ex : Ce n'est pas le bon chemin."
            onChange={e => onChange({ ...data, errorMessage: e.target.value })}
          />
        </Field>
      )}
    </div>
  )
}





// ─── Formulaire choice_branch ─────────────────────────────────────────────────

function FormJournal({ data, onChange }) {
  return (
    <>
      <Field label="Invitation *" hint="La question ou l'invitation à écrire">
        <textarea style={textareaStyle} value={data.prompt || ''}
          placeholder="Ex : Qu'auriez-vous fait à sa place ?"
          onChange={e => onChange({ ...data, prompt: e.target.value })} />
      </Field>
      <Field label="Texte d'exemple dans le champ" hint="Affiché en grisé quand le champ est vide — disparaît dès que le lecteur commence à écrire">
        <input style={inputStyle} type="text" value={data.placeholder || ''}
          placeholder="Ex : Écrivez ici…"
          onChange={e => onChange({ ...data, placeholder: e.target.value })} />
      </Field>
      <Field label="Clé mémoire" hint="Identifiant unique pour rappeler cette réponse plus tard">
        <input style={inputStyle} type="text" value={data.memoryKey || ''}
          placeholder="Ex : choix_porte"
          onChange={e => onChange({ ...data, memoryKey: e.target.value.replace(/\s/g, '_') })} />
        {data.memoryKey && (
          <span style={{
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            color: 'rgba(167,139,250,0.8)',
            backgroundColor: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.15)',
            borderRadius: '4px',
            padding: '0.3rem 0.6rem',
            marginTop: '0.2rem',
            display: 'inline-block',
            userSelect: 'all',
          }}>
            {`{{journal:${data.memoryKey}}}`}
          </span>
        )}
      </Field>
      <Field label="Texte du bouton continuer">
        <input style={inputStyle} type="text" value={data.continueLabel || ''}
          placeholder="Ex : Je me souviendrai de ça"
          onChange={e => onChange({ ...data, continueLabel: e.target.value })} />
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
        <input style={inputStyle} type="number" min="1" max="300" value={data.seconds || 6}
          onChange={e => onChange({ ...data, seconds: parseInt(e.target.value) || 6 })} />
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

function GameModePanel({ segment, segmentIndex, onSave, onDelete, onClose, parts }) {
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
        {type === 'journal'  && <FormJournal  data={data} onChange={setData} />}
        {type === 'crypte'        && <FormCrypte        data={data} onChange={setData} />}
        {type === 'choice_quiz'   && <ChoiceConfigurator isQuiz={true}  data={data} onChange={setData} parts={parts || []} />}
        {type === 'choice_branch' && <ChoiceConfigurator isQuiz={false} data={data} onChange={setData} parts={parts || []} />}

        {/* Sons de feedback — uniquement pour les types interactifs */}
        {['code', 'riddle', 'echo', 'crypte', 'sequence'].includes(type) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              type="checkbox"
              id="game-sounds"
              checked={!!data.sounds}
              onChange={e => setData(d => ({ ...d, sounds: e.target.checked }))}
              style={{ accentColor: '#a78bfa', width: '15px', height: '15px', cursor: 'pointer' }}
            />
            <label htmlFor="game-sounds" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', lineHeight: 1.4 }}>
              Sons de feedback <span style={{ opacity: 0.4 }}>(réussite / erreur)</span>
            </label>
          </div>
        )}
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

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
  echo:      { type: 'echo',      phrase: '', prompt: '', successMessage: '', sounds: false },
  crypte:    { type: 'crypte',    cipher: 'caesar', shift: 3, encoded: '', answer: '', hint: '', errorMessage: '', sounds: false },
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

function FormEcho({ data, onChange }) {
  return (
    <>
      <Field label="Phrase à recopier *" hint="Le lecteur devra taper cette phrase exactement">
        <textarea style={textareaStyle} value={data.phrase || ''}
          placeholder="Ex : Je ne reverrai jamais ce visage."
          onChange={e => onChange({ ...data, phrase: e.target.value })} />
      </Field>
      <Field label="Invite" hint="Texte affiché au-dessus (optionnel)">
        <input style={inputStyle} type="text" value={data.prompt || ''}
          placeholder="Ex : Recopiez cette phrase avant de continuer."
          onChange={e => onChange({ ...data, prompt: e.target.value })} />
      </Field>
      <Field label="Message de succès">
        <input style={inputStyle} type="text" value={data.successMessage || ''}
          placeholder="Ex : Vous vous en souviendrez."
          onChange={e => onChange({ ...data, successMessage: e.target.value })} />
      </Field>
    </>
  )
}

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
        {type === 'journal'  && <FormJournal  data={data} onChange={setData} />}
        {type === 'echo'     && <FormEcho     data={data} onChange={setData} />}
        {type === 'crypte'   && <FormCrypte   data={data} onChange={setData} />}

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

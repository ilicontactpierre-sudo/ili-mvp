import { useState, useCallback } from 'react'
import { VFX_TYPES } from './constants'
// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR DE PROMPT COMPLET — mise en forme (fonctions inline, formatage,
// pauses, VFX texte proposés). Même principe que buildExportPrompt dans
// OrchestrationPanel.jsx : le prompt est intégré à l'export.
// ─────────────────────────────────────────────────────────────────────────────
function buildFormattingExportPrompt(segments) {
  const getSegmentText = (seg) => {
    if (typeof seg === 'string') return seg
    if (seg && typeof seg.text === 'string') return seg.text
    return ''
  }
  const lines = []
  lines.push('# MISE EN FORME NARRATIVE ILi — Instructions pour Claude')
  lines.push('')
  lines.push('Tu es l\'assistant de mise en forme narrative de ILi, une application de lecture immersive.')
  lines.push('')
  lines.push('CONTEXTE — Comment ILi affiche le texte :')
  lines.push('Le lecteur voit un seul segment net à la fois (le "focus"), les segments')
  lines.push('voisins sont flous en arrière-plan. La mise en forme que tu proposes ne')
  lines.push('s\'active QUE quand un segment est en focus.')
  lines.push('')
  lines.push('Le texte ci-dessous est numéroté par position : [12] désigne le 12e')
  lines.push('segment affiché, pas un identifiant technique. Réfère-toi TOUJOURS à ce')
  lines.push('numéro dans ta réponse, jamais à autre chose.')
  lines.push('')
  lines.push('TA TÂCHE :')
  lines.push('On te donne une liste de segments déjà découpés (texte figé, ne jamais le')
  lines.push('réécrire). Tu dois enrichir CERTAINS d\'entre eux avec :')
  lines.push('1. Des fonctions inline (tags dans le texte)')
  lines.push('2. Du formatage simple (gras/italique/souligné/police)')
  lines.push('3. Des pauses à insérer entre deux segments, avec leur transition visuelle')
  lines.push('Tu proposeras SÉPARÉMENT (sans les appliquer au texte) :')
  lines.push('4. Des VFX "texte" à valider par l\'auteur')
  lines.push('5. RIEN sur les images pour l\'instant — ne fais AUCUNE suggestion d\'image,')
  lines.push('   cette fonctionnalité n\'est pas encore prête.')
  lines.push('')
  lines.push('RÈGLE ABSOLUE — PRÉSERVATION DU TEXTE :')
  lines.push('Le texte narratif original ne doit JAMAIS être reformulé, corrigé,')
  lines.push('raccourci ou paraphrasé. Tu as le droit d\'insérer des tags autour de')
  lines.push('portions de texte, rien d\'autre. En cas de doute sur l\'orthographe ou la')
  lines.push('ponctuation d\'origine, tu la recopies TELLE QUELLE, même si elle te semble')
  lines.push('inhabituelle (vieux français, tournures d\'époque).')
  lines.push('')
  lines.push('RÈGLE ABSOLUE — MODÉRATION :')
  lines.push('La plupart des segments ne doivent recevoir AUCUN effet. Un effet visible')
  lines.push('partout n\'a plus de sens et fatigue le lecteur. Vise un effet toutes les')
  lines.push('8 à 15 segments environ, réservé aux moments qui le méritent vraiment')
  lines.push('(bascule émotionnelle, révélation, accélération, respiration).')
  lines.push('')
  lines.push('═══════════════════════════════════════════')
  lines.push('1. FONCTIONS INLINE — syntaxe et catalogue')
  lines.push('═══════════════════════════════════════════')
  lines.push('')
  lines.push('Syntaxe :')
  lines.push('  Enveloppe : </nom:arg1;arg2|texte enveloppé/>')
  lines.push('  Autonome  : </nom:arg1;arg2/>')
  lines.push('')
  lines.push('RÈGLES TECHNIQUES STRICTES (violation = segment cassé à l\'affichage) :')
  lines.push('- JAMAIS deux tags imbriqués l\'un dans l\'autre')
  lines.push('  (interdit : </pulse:moyen;normal|</couleur:#fff|texte/>/>)')
  lines.push('- Un seul tag actif par portion de texte donnée')
  lines.push('- N\'enveloppe JAMAIS une portion de texte contenant déjà | ; ou >')
  lines.push('- N\'enveloppe jamais un segment en entier avec un effet fort (glitch,')
  lines.push('  pulse) — cible 1 à 6 mots précis, jamais toute la phrase')
  lines.push('')
  lines.push('Catalogue :')
  lines.push('| Tag | Params | Effet | Bon usage |')
  lines.push('|---|---|---|---|')
  lines.push('| pulse | intensité(faible/moyen/fort);vitesse(lent/normal/rapide) | Le texte "respire" | Un mot chargé d\'urgence ou de tension contenue |')
  lines.push('| couleur | hex | Colore le texte, s\'adapte au thème clair/sombre | Souligner un nom, un objet clé, une émotion |')
  lines.push('| apparition | délai_ms;vitesse | Fondu d\'opacité simple | Effet le plus sûr, quasi toujours approprié |')
  lines.push('| fondu_mot | durée_ms;vitesse | Mots apparaissent un par un | Phrase de clôture posée, révélation qui se dépose |')
  lines.push('| taille | ratio(0.5–2.0) | Change la taille avec rebond élastique | Un mot qui porte tout le poids émotionnel |')
  lines.push('| tremble | intensité | Micro-tremblement continu | Rare — malaise, peur contenue, 1-4 mots max |')
  lines.push('| rupture | délai_ms;vitesse | Barre le texte façon "biffé" | Un mot/une idée qu\'on annule, qu\'on nie |')
  lines.push('| glitch | intensité;mode(loop/once) | Glitch façon VHS | Rare — dysfonctionnement, folie, dissonance |')
  lines.push('| censure | (aucun) | Remplace par un bloc noir | Information volontairement cachée au lecteur |')
  lines.push('| chiffres_up / chiffres_down | de;à | Compteur animé | Uniquement si date/quantité/décompte explicite |')
  lines.push('')
  lines.push('NE PAS UTILISER (hors scope) : lire (mémoire narrative, laisse à l\'auteur).')
  lines.push('')
  lines.push('═══════════════════════════════════════════')
  lines.push('2. FORMATAGE SIMPLE')
  lines.push('═══════════════════════════════════════════')
  lines.push('')
  lines.push('- Gras : un mot/groupe qui porte le poids de la phrase (rare, jamais plus d\'1 par segment)')
  lines.push('- Italique : pensée intérieure, citation, mot en langue étrangère, emphase douce')
  lines.push('- Souligné : à éviter sauf demande explicite')
  lines.push('- Barré : rare — un mot que le narrateur semble regretter ou corriger')
  lines.push('- Police : ne change JAMAIS sans raison narrative très forte (lecture d\'un')
  lines.push('  document/lettre/message) — dans ce cas : "Benedict" (manuscrit) ou "Terminal" (écran)')
  lines.push('')
  lines.push('═══════════════════════════════════════════')
  lines.push('3. PAUSES + TRANSITIONS')
  lines.push('═══════════════════════════════════════════')
  lines.push('')
  lines.push('Propose une pause entre deux segments quand : bascule de temps/lieu,')
  lines.push('révélation qui a besoin d\'un silence, fin de chapitre qui doit respirer.')
  lines.push('')
  lines.push('Pour chaque pause : après quel segment (NUMÉRO de position), durée en ms')
  lines.push('(600-1200 = respiration courte, 1500-2500 = marquée, 3000+ = coupure de')
  lines.push('scène), transition (type fade/veil/blur, couleur, durées fadeIn/hold/fadeOut')
  lines.push('en ms, courbe ease-in-out par défaut).')
  lines.push('')
  lines.push('═══════════════════════════════════════════')
  lines.push('4. VFX TEXTE — PROPOSITIONS UNIQUEMENT')
  lines.push('═══════════════════════════════════════════')
  lines.push('')
  lines.push('Ne les insère jamais toi-même — liste-les à part, l\'auteur les valide')
  lines.push('manuellement dans l\'Admin.')
  lines.push('')
  lines.push('Types : typewriter (lent/normal/rapide), erased (faible/normal/intense),')
  lines.push('static (léger/normal/intense), shake (normal/intense), tremble')
  lines.push('(lent/moyen/rapide), glitch (faible/normal/intense), flicker, flash')
  lines.push('(lent/moyen/rapide).')
  lines.push('')
  lines.push('Pour chaque proposition : numéro de segment, type, mode, justification (1 phrase).')
  lines.push('')
  lines.push('═══════════════════════════════════════════')
  lines.push('PASSE DE RELECTURE — avant de produire le JSON')
  lines.push('═══════════════════════════════════════════')
  lines.push('')
  lines.push('Écris d\'abord un bref bloc <script> listant quels segments tu as choisi')
  lines.push('d\'enrichir et pourquoi, en vérifiant la fourchette de fréquence indiquée.')
  lines.push('')
  lines.push('═══════════════════════════════════════════')
  lines.push('FORMAT DE SORTIE — Strict')
  lines.push('═══════════════════════════════════════════')
  lines.push('')
  lines.push('Après <script>, produis ces trois sections dans cet ordre, toujours')
  lines.push('précédées de leur marqueur (même vide → []) :')
  lines.push('')
  lines.push('### SEGMENTS_MODIFIES')
  lines.push('```json')
  lines.push('[')
  lines.push('  { "segment": 12, "text": "texte intégral avec tags", "bold": false, "italic": false, "underline": false, "strikethrough": false, "fontFamily": null }')
  lines.push(']')
  lines.push('```')
  lines.push('')
  lines.push('### PAUSES')
  lines.push('```json')
  lines.push('[')
  lines.push('  { "afterSegment": 24, "durationMs": 1500, "transition": { "type": "fade", "color": "#000000", "easing": "ease-in-out", "fadeInDuration": 400, "holdDuration": 0, "fadeOutDuration": 400 } }')
  lines.push(']')
  lines.push('```')
  lines.push('')
  lines.push('### VFX_TEXTE')
  lines.push('```json')
  lines.push('[')
  lines.push('  { "segment": 8, "type": "glitch", "mode": "moyen", "justification": "..." }')
  lines.push(']')
  lines.push('```')
  lines.push('')
  lines.push('Le champ "text" contient toujours le texte COMPLET du segment (avec tags),')
  lines.push('jamais un extrait. N\'inclus dans SEGMENTS_MODIFIES que les segments réellement modifiés.')
  lines.push('')
  lines.push('---')
  lines.push(`## Texte à mettre en forme (${segments.length} segments)`)
  lines.push('')
  segments.forEach((seg, i) => {
    const isChapter = seg && typeof seg === 'object' && seg.isChapter === true
    const pauseMs = seg && typeof seg === 'object' && seg.pause != null ? seg.pause : null
    if (pauseMs != null) {
      lines.push(`[${i + 1}] ⏸ PAUSE existante — ${pauseMs}ms`)
      return
    }
    const text = getSegmentText(seg).trim()
    if (text) lines.push(`[${i + 1}]${isChapter ? ' (chapitre)' : ''} ${text}`)
  })
  lines.push('')
  lines.push('---')
  lines.push('Commence par <script>, puis ### SEGMENTS_MODIFIES, ### PAUSES, ### VFX_TEXTE. Rien d\'autre.')
  return lines.join('\n')
}
// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION — découpe le texte collé en 3 sections via les marqueurs ###,
// puis extrait le premier tableau JSON de chaque section (comptage de
// crochets, ignore <script> et les balises ```json).
// ─────────────────────────────────────────────────────────────────────────────
function extractFirstJsonArray(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const start = cleaned.indexOf('[')
  if (start === -1) return []
  let depth = 0
  for (let j = start; j < cleaned.length; j++) {
    if (cleaned[j] === '[') depth++
    if (cleaned[j] === ']') depth--
    if (depth === 0) {
      const candidate = cleaned.slice(start, j + 1)
      try { return JSON.parse(candidate) } catch { return [] }
    }
  }
  return []
}
function extractAllJsonArrays(rawText) {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '')
  const arrays = []
  let i = 0
  while (i < cleaned.length) {
    if (cleaned[i] === '[') {
      let depth = 0
      const start = i
      let closed = false
      for (let j = i; j < cleaned.length; j++) {
        if (cleaned[j] === '[') depth++
        if (cleaned[j] === ']') depth--
        if (depth === 0) {
          const candidate = cleaned.slice(start, j + 1)
          try { arrays.push(JSON.parse(candidate)) } catch {}
          i = j + 1
          closed = true
          break
        }
      }
      if (!closed) break
    } else {
      i++
    }
  }
  return arrays
}
function splitFormattingSections(rawText) {
  const withoutScript = rawText.replace(/<script>[\s\S]*?<\/script>/gi, '')
  // Tolérant : accepte "### SEGMENTS_MODIFIES" comme "SEGMENTS_MODIFIES" seul
  // (les ### disparaissent souvent au copier-coller depuis une interface qui
  // affiche le markdown au lieu du texte brut).
  const markerDefs = [
    { name: 'segments', re: /\bSEGMENTS_MODIFIES\b/i },
    { name: 'pauses',   re: /\bPAUSES\b/i },
    { name: 'vfx',      re: /\bVFX_TEXTE\b/i },
  ]
  const markers = markerDefs
    .map(m => ({ name: m.name, idx: withoutScript.search(m.re) }))
    .filter(m => m.idx !== -1)
    .sort((a, b) => a.idx - b.idx)
  if (markers.length > 0) {
    const sections = { segments: '', pauses: '', vfx: '' }
    markers.forEach((m, i) => {
      const end = i + 1 < markers.length ? markers[i + 1].idx : withoutScript.length
      sections[m.name] = withoutScript.slice(m.idx, end)
    })
    return {
      segmentsRaw: extractFirstJsonArray(sections.segments),
      pausesRaw:   extractFirstJsonArray(sections.pauses),
      vfxRaw:      extractFirstJsonArray(sections.vfx),
    }
  }
  // ── Filet de sécurité : aucun marqueur trouvé (cas extrême) — on prend les
  // tableaux JSON dans leur ordre d'apparition (segments, pauses, vfx).
  const allArrays = extractAllJsonArrays(withoutScript)
  return {
    segmentsRaw: allArrays[0] || [],
    pausesRaw:   allArrays[1] || [],
    vfxRaw:      allArrays[2] || [],
  }
}
function getSegmentText(seg) {
  if (typeof seg === 'string') return seg
  if (seg && typeof seg.text === 'string') return seg.text
  return ''
}
// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function FormattingPanel({ segments, onSegmentsChange, onSaveToHistory }) {
  const [exportText, setExportText] = useState('')
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [diagnosis, setDiagnosis] = useState(null)
  const [applyStatus, setApplyStatus] = useState('idle')
  const [copyStatus, setCopyStatus] = useState('idle')
  const [importError, setImportError] = useState('')
  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!segments || segments.length === 0) {
      alert('Aucun segment à exporter.')
      return
    }
    const text = buildFormattingExportPrompt(segments)
    setExportText(text)
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    }).catch(() => {
      const el = document.createElement('textarea')
      el.value = text
      el.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    })
  }, [segments])
  // ── Diagnostic ──────────────────────────────────────────────────────────
  const handleDiagnose = useCallback(() => {
    setImportError('')
    setDiagnosis(null)
    setApplyStatus('idle')
    if (!importText.trim()) {
      setImportError('Colle le retour de Claude ici.')
      return
    }
    const { segmentsRaw, pausesRaw, vfxRaw } = splitFormattingSections(importText)
    if (segmentsRaw.length === 0 && pausesRaw.length === 0 && vfxRaw.length === 0) {
      setImportError('Aucun tableau JSON valide trouvé (vérifie que les 3 marqueurs ### sont bien présents).')
      return
    }
    // ── Segments modifiés ──
    const validSegments = []
    const invalidSegments = []
    segmentsRaw.forEach((item, idx) => {
      const segNum = Number(item.segment)
      const inRange = Number.isInteger(segNum) && segNum >= 1 && segNum <= segments.length
      const hasText = typeof item.text === 'string' && item.text.trim().length > 0
      if (inRange && hasText) {
        const oldText = getSegmentText(segments[segNum - 1])
        validSegments.push({
          segment: segNum,
          oldText,
          newText: item.text,
          bold: item.bold,
          italic: item.italic,
          underline: item.underline,
          strikethrough: item.strikethrough,
          fontFamily: item.fontFamily,
          changed: oldText !== item.text,
        })
      } else {
        invalidSegments.push({ index: idx, reason: !inRange ? 'numéro de segment hors limites' : 'texte manquant', raw: item })
      }
    })
    // ── Pauses ──
    const validPauses = []
    const invalidPauses = []
    pausesRaw.forEach((p, idx) => {
      const afterSegment = Number(p.afterSegment)
      const durationMs = Number(p.durationMs)
      const inRange = Number.isInteger(afterSegment) && afterSegment >= 1 && afterSegment <= segments.length
      const validDuration = Number.isFinite(durationMs) && durationMs > 0
      if (inRange && validDuration) {
        validPauses.push({ afterSegment, durationMs, transition: p.transition || null })
      } else {
        invalidPauses.push({ index: idx, reason: !inRange ? 'afterSegment hors limites' : 'durationMs invalide', raw: p })
      }
    })
    // ── VFX texte (informationnel uniquement) ──
    const validVfx = []
    const invalidVfx = []
    vfxRaw.forEach((v, idx) => {
      const segNum = Number(v.segment)
      const inRange = Number.isInteger(segNum) && segNum >= 1 && segNum <= segments.length
      const knownType = VFX_TYPES[v.type]
      if (inRange && knownType) {
        const modeOk = !knownType.modes?.length || knownType.modes.includes(v.mode)
        validVfx.push({
          segment: segNum,
          type: v.type,
          mode: v.mode,
          modeWarning: !modeOk,
          justification: v.justification || '',
        })
      } else {
        invalidVfx.push({ index: idx, reason: !inRange ? 'numéro de segment hors limites' : `type "${v.type}" inconnu`, raw: v })
      }
    })
    setDiagnosis({ validSegments, invalidSegments, validPauses, invalidPauses, validVfx, invalidVfx })
  }, [importText, segments])
  // ── Application ─────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (!diagnosis) return
    // 1. Pauses d'abord (plus grand numéro → plus petit, comme l'insertion
    //    de pause manuelle), pour ne jamais invalider les positions restantes.
    const pausesToInsert = (diagnosis.validPauses || []).slice().sort((a, b) => b.afterSegment - a.afterSegment)
    const workingSegments = [...segments]
    pausesToInsert.forEach((p, i) => {
      const pauseSeg = {
        id: `seg_pause_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        text: '',
        pause: p.durationMs,
        ...(p.transition ? { transition: p.transition } : {}),
      }
      workingSegments.splice(p.afterSegment, 0, pauseSeg)
    })
    // Remap : un numéro de segment "d'origine" (tel que Claude l'a vu, avant
    // insertion des pauses) → sa position réelle après insertion.
    const remap = (originalNum) => {
      if (pausesToInsert.length === 0) return originalNum
      const shift = pausesToInsert.filter(p => p.afterSegment < originalNum).length
      return originalNum + shift
    }
    // 2. Appliquer les modifications de texte/formatage sur les bons index
    diagnosis.validSegments.forEach(mod => {
      const idx = remap(mod.segment) - 1
      const seg = workingSegments[idx]
      if (!seg) return
      const base = typeof seg === 'string' ? { text: seg } : { ...seg }
      base.text = mod.newText
      if (mod.bold !== undefined) base.bold = mod.bold
      if (mod.italic !== undefined) base.italic = mod.italic
      if (mod.underline !== undefined) base.underline = mod.underline
      if (mod.strikethrough !== undefined) base.strikethrough = mod.strikethrough
      if (mod.fontFamily !== undefined) base.fontFamily = mod.fontFamily
      workingSegments[idx] = base
    })
    onSegmentsChange(workingSegments)
    if (onSaveToHistory) onSaveToHistory()
    setApplyStatus('success')
  }, [diagnosis, segments, onSegmentsChange, onSaveToHistory])
  const handleReset = () => {
    setImportText('')
    setDiagnosis(null)
    setApplyStatus('idle')
    setImportError('')
    setShowImport(false)
  }
  // ── Styles (repris d'OrchestrationPanel pour rester cohérent visuellement) ──
  const s = {
    container: { marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)' },
    title: { fontSize: '1.125rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '1.25rem' },
    box: {
      padding: '1.25rem',
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '8px',
      marginBottom: '1rem',
    },
    label: { fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.875rem' },
    labelStrong: { color: 'rgba(255,255,255,0.75)' },
    row: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' },
    btn: (variant = 'secondary') => ({
      padding: '0.625rem 1.25rem',
      fontSize: '0.875rem',
      borderRadius: '7px',
      border: variant === 'primary' ? 'none' : '1px solid rgba(255,255,255,0.12)',
      backgroundColor: variant === 'primary' ? '#4f46e5' : variant === 'success' ? 'rgba(40,167,69,0.2)' : variant === 'danger' ? 'rgba(220,53,69,0.15)' : 'rgba(255,255,255,0.06)',
      color: variant === 'primary' ? 'white' : variant === 'success' ? 'rgba(74,222,128,0.9)' : variant === 'danger' ? '#dc3545' : 'rgba(255,255,255,0.75)',
      cursor: 'pointer',
      fontWeight: variant === 'primary' ? 500 : 400,
      transition: 'all 0.15s ease',
      display: 'flex', alignItems: 'center', gap: '0.4rem',
    }),
    textarea: {
      width: '100%', minHeight: '180px', padding: '0.875rem',
      fontSize: '0.8125rem', fontFamily: 'monospace',
      backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '7px', color: 'rgba(255,255,255,0.85)', resize: 'vertical',
      lineHeight: '1.5', boxSizing: 'border-box',
    },
    diagBox: (type) => ({
      padding: '1rem', borderRadius: '7px', marginTop: '0.75rem',
      backgroundColor: type === 'ok' ? 'rgba(40,167,69,0.06)' : type === 'warn' ? 'rgba(255,193,7,0.06)' : 'rgba(220,53,69,0.06)',
      border: `1px solid ${type === 'ok' ? 'rgba(40,167,69,0.2)' : type === 'warn' ? 'rgba(255,193,7,0.2)' : 'rgba(220,53,69,0.2)'}`,
    }),
    diagTitle: (type) => ({
      fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem',
      color: type === 'ok' ? 'rgba(74,222,128,0.9)' : type === 'warn' ? 'rgba(255,193,7,0.9)' : 'rgba(220,53,69,0.9)',
    }),
    diagItem: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '0.25rem' },
    error: {
      fontSize: '0.8125rem', color: 'rgba(220,53,69,0.9)', marginTop: '0.5rem',
      padding: '0.5rem 0.75rem', backgroundColor: 'rgba(220,53,69,0.06)',
      borderRadius: '5px', border: '1px solid rgba(220,53,69,0.15)',
    },
    stat: {
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem',
      backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem', marginBottom: '0.5rem',
    },
  }
  const canExport = segments && segments.length > 0
  return (
    <div style={s.container}>
      <div style={s.title}>✎ Mise en forme automatique (Claude)</div>
      <div style={{ marginBottom: '1rem' }}>
        <span style={s.stat}>📝 {segments?.length || 0} segments</span>
      </div>
      {/* ── Étape 1 : Export ── */}
      <div style={s.box}>
        <div style={s.label}>
          <strong style={s.labelStrong}>Étape 1</strong> — Exporte le prompt complet et colle-le dans une nouvelle conversation Claude.
        </div>
        <div style={s.row}>
          <button
            onClick={handleExport}
            disabled={!canExport}
            style={{ ...s.btn('primary'), opacity: canExport ? 1 : 0.4, cursor: canExport ? 'pointer' : 'not-allowed' }}
          >
            {copyStatus === 'copied' ? '✓ Copié dans le presse-papier !' : '↗ Générer & copier le prompt'}
          </button>
          {exportText && (
            <button onClick={() => setExportText('')} style={s.btn()}>Masquer</button>
          )}
        </div>
        {exportText && (
          <>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.4rem' }}>
              {exportText.length.toLocaleString()} caractères
            </div>
            <textarea value={exportText} readOnly style={{ ...s.textarea, minHeight: '120px' }} />
          </>
        )}
      </div>
      {/* ── Étape 2 : Import ── */}
      <div style={s.box}>
        <div style={s.label}>
          <strong style={s.labelStrong}>Étape 2</strong> — Colle ici la réponse de Claude, vérifie le diagnostic, puis applique.
        </div>
        {!showImport && applyStatus === 'idle' && (
          <button onClick={() => setShowImport(true)} style={s.btn()}>
            ↙ Coller la réponse de Claude
          </button>
        )}
        {(showImport || importText) && applyStatus !== 'success' && (
          <>
            <textarea
              value={importText}
              onChange={e => {
                setImportText(e.target.value)
                setDiagnosis(null)
                setImportError('')
                setApplyStatus('idle')
              }}
              placeholder="Colle ici toute la réponse de Claude (avec <script>, ### SEGMENTS_MODIFIES, ### PAUSES, ### VFX_TEXTE)"
              style={{ ...s.textarea, marginBottom: '0.75rem' }}
            />
            {importError && <div style={s.error}>{importError}</div>}
            <div style={s.row}>
              <button onClick={handleDiagnose} disabled={!importText.trim()} style={{ ...s.btn('primary'), opacity: importText.trim() ? 1 : 0.4, cursor: importText.trim() ? 'pointer' : 'not-allowed' }}>
                🔍 Analyser
              </button>
              <button onClick={handleReset} style={s.btn()}>Annuler</button>
            </div>
          </>
        )}
        {/* ── Diagnostic ── */}
        {diagnosis && applyStatus !== 'success' && (
          <div style={{ marginTop: '0.75rem' }}>
            {/* Segments modifiés */}
            {diagnosis.validSegments.length > 0 && (
              <div style={s.diagBox('ok')}>
                <div style={s.diagTitle('ok')}>✓ {diagnosis.validSegments.length} segment(s) à modifier</div>
                {diagnosis.validSegments.map((m, i) => (
                  <div key={i} style={s.diagItem}>
                    <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Segment {m.segment}</strong>
                    {' — '}
                    {m.changed ? <span>texte enrichi</span> : <span style={{ opacity: 0.5 }}>texte identique</span>}
                    {(m.bold || m.italic || m.underline || m.strikethrough || m.fontFamily) && (
                      <span style={{ opacity: 0.6 }}>
                        {' · '}
                        {[m.bold && 'gras', m.italic && 'italique', m.underline && 'souligné', m.strikethrough && 'barré', m.fontFamily && `police:${m.fontFamily}`]
                          .filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {diagnosis.invalidSegments.length > 0 && (
              <div style={{ ...s.diagBox('warn'), marginTop: '0.5rem' }}>
                <div style={s.diagTitle('warn')}>⚠ {diagnosis.invalidSegments.length} segment(s) ignoré(s)</div>
                {diagnosis.invalidSegments.map((item, i) => (
                  <div key={i} style={s.diagItem}>{item.reason}</div>
                ))}
              </div>
            )}
            {/* Pauses */}
            {diagnosis.validPauses.length > 0 && (
              <div style={{ ...s.diagBox('ok'), marginTop: '0.5rem' }}>
                <div style={s.diagTitle('ok')}>⏱ {diagnosis.validPauses.length} pause(s) à insérer</div>
                {diagnosis.validPauses.map((p, i) => (
                  <div key={i} style={s.diagItem}>
                    <strong style={{ color: 'rgba(255,255,255,0.75)' }}>après segment {p.afterSegment}</strong>
                    {' · '}{p.durationMs}ms
                    {p.transition && <span style={{ opacity: 0.6 }}> · transition {p.transition.type}</span>}
                  </div>
                ))}
              </div>
            )}
            {diagnosis.invalidPauses.length > 0 && (
              <div style={{ ...s.diagBox('warn'), marginTop: '0.5rem' }}>
                <div style={s.diagTitle('warn')}>⚠ {diagnosis.invalidPauses.length} pause(s) ignorée(s)</div>
                {diagnosis.invalidPauses.map((p, i) => (
                  <div key={i} style={s.diagItem}>{p.reason}</div>
                ))}
              </div>
            )}
            {/* VFX texte — informationnel */}
            {diagnosis.validVfx.length > 0 && (
              <div style={{ ...s.diagBox('warn'), marginTop: '0.5rem' }}>
                <div style={s.diagTitle('warn')}>💡 {diagnosis.validVfx.length} VFX texte proposé(s) — à activer manuellement dans la timeline</div>
                {diagnosis.validVfx.map((v, i) => (
                  <div key={i} style={s.diagItem}>
                    <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Segment {v.segment}</strong>
                    {' → '}{v.type} ({v.mode}{v.modeWarning ? ' — mode non standard' : ''})
                    {v.justification && <span style={{ opacity: 0.6 }}> — {v.justification}</span>}
                  </div>
                ))}
              </div>
            )}
            {diagnosis.invalidVfx.length > 0 && (
              <div style={{ ...s.diagBox('warn'), marginTop: '0.5rem' }}>
                <div style={s.diagTitle('warn')}>⚠ {diagnosis.invalidVfx.length} VFX ignoré(s)</div>
                {diagnosis.invalidVfx.map((v, i) => (
                  <div key={i} style={s.diagItem}>{v.reason}</div>
                ))}
              </div>
            )}
            {/* Bouton appliquer — segments + pauses uniquement (VFX restent informationnels) */}
            {(diagnosis.validSegments.length > 0 || diagnosis.validPauses.length > 0) && (
              <div style={{ ...s.row, marginTop: '1rem' }}>
                <button onClick={handleApply} style={s.btn('success')}>
                  ✦ Appliquer
                  {diagnosis.validSegments.length > 0 ? ` ${diagnosis.validSegments.length} segment(s)` : ''}
                  {diagnosis.validPauses.length > 0 ? ` + ${diagnosis.validPauses.length} pause(s)` : ''}
                </button>
              </div>
            )}
          </div>
        )}
        {/* ── Succès ── */}
        {applyStatus === 'success' && (
          <div style={{ ...s.diagBox('ok'), marginTop: '0.75rem' }}>
            <div style={s.diagTitle('ok')}>✓ Mise en forme appliquée</div>
            <div style={s.diagItem}>
              Les segments et pauses ont été mis à jour. Les VFX texte proposés restent à activer manuellement dans la timeline.
            </div>
            <button onClick={handleReset} style={{ ...s.btn(), marginTop: '0.75rem' }}>
              Nouvelle mise en forme
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
export default FormattingPanel

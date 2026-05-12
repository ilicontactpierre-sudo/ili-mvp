// ══════════════════════════════════════════════════════════════
// CONFIG — Constantes ajustables de l'algorithme de découpage
// ══════════════════════════════════════════════════════════════

const CONFIG = {

  // Limite maximale de caractères par segment (espaces compris)
  MAX_CHARS: 254,

  // Seuil en caractères pour qu'une phrase soit considérée "très courte"
  SHORT_PHRASE_THRESHOLD: 30,

  // Seuil en caractères pour qu'un segment soit considéré "long"
  LONG_SEGMENT_THRESHOLD: 150,

  // Probabilités de saut de ligne interne (entre 0 et 1)
  LINE_BREAK_PROBS: {
    shortAtStart: 0.40,   // phrase très courte EN DÉBUT de segment
    shortAtEnd: 0.70,     // phrase très courte EN FIN de segment
    shortInMiddle: 0.20,  // phrase très courte EN MILIEU de segment
    dialogue: 0.60,       // réplique de dialogue (signe «»)
    longSegment: 0.30,    // segment long → saut central
  },

  // Distribution de tailles selon le slider (1, 5, 10)
  // Chaque entrée = [trèsCourt, court, moyen, long, trèsLong]
  // trèsCourt = 1 unité, court = 2, moyen = 3-4, long = 5-6, trèsLong = 7+
  DISTRIBUTIONS: {
    1:  [0.40, 0.35, 0.20, 0.04, 0.01],
    5:  [0.10, 0.35, 0.35, 0.15, 0.05],
    10: [0.01, 0.09, 0.30, 0.35, 0.25],
  },

};

// ══════════════════════════════════════════════════════════════
// ÉTAPE 1 — PARSING : découpe en unités atomiques (phrases)
// ══════════════════════════════════════════════════════════════

function parseIntoUnits(text) {
  const units = [];
  
  // Séparer par paragraphes (lignes vides = frontières absolues)
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;
    
    // Découper le paragraphe en lignes (préserver les sauts de ligne)
    const lines = paragraph.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Découper la ligne en phrases
      // Points de coupure : . ! ? … ; :
      // Mais ne pas couper à l'intérieur de « ... »
      const phrases = splitIntoPhrases(line);
      
      for (const phrase of phrases) {
        if (phrase.trim()) {
          units.push(phrase.trim());
        }
      }
    }
    
    // Marquer la fin du paragraphe avec une unité spéciale
    units.push('---PARAGRAPH_BREAK---');
  }
  
  // Retirer le dernier marqueur de paragraphe s'il existe
  if (units.length > 0 && units[units.length - 1] === '---PARAGRAPH_BREAK---') {
    units.pop();
  }
  
  return units;
}

function splitIntoPhrases(line) {
  const phrases = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    // Gérer les guillemets « »
    if (char === '«') {
      inQuotes = true;
      current += char;
      i++;
      continue;
    }
    
    if (char === '»') {
      inQuotes = false;
      current += char;
      i++;
      continue;
    }
    
    // Si on est dans les guillemets, on ne coupe pas
    if (inQuotes) {
      current += char;
      i++;
      continue;
    }
    
    // Points de coupure : . ! ? … ; :
    if (['.', '!', '?', '…', ';', ':'].includes(char)) {
      current += char;
      
      // Si c'est un point de suspension (…), on avance de 3 caractères
      if (char === '…') {
        // Vérifier si c'est un vrai caractère … ou trois points
        // Le caractère … est déjà un seul caractère Unicode
      }
      
      phrases.push(current.trim());
      current = '';
      
      // Sauter les espaces après la ponctuation
      i++;
      while (i < line.length && line[i] === ' ') {
        i++;
      }
      continue;
    }
    
    current += char;
    i++;
  }
  
  // Ajouter le reste
  if (current.trim()) {
    phrases.push(current.trim());
  }
  
  return phrases;
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 2 — DISTRIBUTION PAR GRANULARITÉ (interpolation)
// ══════════════════════════════════════════════════════════════

function getInterpolatedDistribution(granularity) {
  // Valeurs clés connues
  const knownValues = [1, 5, 10];
  const distributions = CONFIG.DISTRIBUTIONS;
  
  // Si valeur exacte, retour direct
  if (distributions[granularity]) {
    return distributions[granularity];
  }
  
  // Trouver les deux valeurs encadrantes
  let lower = null, upper = null;
  
  for (const val of knownValues) {
    if (val <= granularity) {
      lower = val;
    }
    if (val >= granularity && upper === null) {
      upper = val;
    }
  }
  
  // Si en dehors des bornes
  if (lower === null || upper === null) {
    return distributions[5]; // Valeur par défaut
  }
  
  // Interpolation linéaire
  const t = (granularity - lower) / (upper - lower);
  const lowerDist = distributions[lower];
  const upperDist = distributions[upper];
  
  return lowerDist.map((prob, i) => lowerDist[i] + t * (upperDist[i] - lowerDist[i]));
}

function pickSegmentSize(granularity) {
  // Taille: 0=trèsCourt(1), 1=court(2), 2=moyen(3-4), 3=long(5-6), 4=trèsLong(7+)
  const distribution = getInterpolatedDistribution(granularity);
  const rand = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < distribution.length; i++) {
    cumulative += distribution[i];
    if (rand < cumulative) {
      return i;
    }
  }
  
  return 2; // Retour moyen par défaut
}

function getSizeInUnits(sizeIndex) {
  // Retourne le nombre d'unités atomiques pour cette taille
  const ranges = [
    [1, 1],    // trèsCourt = 1 unité
    [2, 2],    // court = 2 unités
    [3, 4],    // moyen = 3-4 unités
    [5, 6],    // long = 5-6 unités
    [7, 10],   // trèsLong = 7-10 unités
  ];
  
  const [min, max] = ranges[sizeIndex];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 3 & 4 — ASSEMBLAGE DES SEGMENTS
// ══════════════════════════════════════════════════════════════

function assembleSegments(units, granularity) {
  const segments = [];
  let i = 0;
  
  while (i < units.length) {
    // Sauter les marqueurs de paragraphe
    if (units[i] === '---PARAGRAPH_BREAK---') {
      i++;
      continue;
    }
    
    // Déterminer la taille cible
    const targetSize = pickSegmentSize(granularity);
    const targetUnits = getSizeInUnits(targetSize);
    
    // Rassembler les unités
    let segmentUnits = [];
    let charCount = 0;
    let j = i;
    
    while (j < units.length && segmentUnits.length < targetUnits) {
      if (units[j] === '---PARAGRAPH_BREAK---') {
        // Frontière de paragraphe = fin immédiate du segment
        break;
      }
      
      const newCharCount = charCount + (charCount > 0 ? 1 : 0) + units[j].length;
      
      // Vérifier MAX_CHARS
      if (newCharCount > CONFIG.MAX_CHARS && segmentUnits.length > 0) {
        // On a déjà au moins une unité, on s'arrête
        break;
      }
      
      segmentUnits.push(units[j]);
      charCount = newCharCount;
      j++;
    }
    
    // Si on n'a rien pris, prendre au moins une unité
    if (segmentUnits.length === 0 && j < units.length && units[j] !== '---PARAGRAPH_BREAK---') {
      segmentUnits.push(units[j]);
      j++;
    }
    
    // Construire le segment
    const segment = segmentUnits.join(' ');
    segments.push(segment);
    
    i = j;
  }
  
  return segments;
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 4 — CHOCS DE RYTHME (slider ≤ 4)
// ══════════════════════════════════════════════════════════════

function applyRhythmShocks(segments, units, granularity) {
  if (granularity > 4) return segments;
  
  // Vérifier chaque séquence de 3 segments consécutifs
  for (let i = 0; i < segments.length - 2; i++) {
    // Compter les unités dans chaque segment (approximatif)
    const seg1Units = segments[i].split(' ').length;
    const seg2Units = segments[i + 1].split(' ').length;
    const seg3Units = segments[i + 2].split(' ').length;
    
    // Si aucun n'est "très court" (1-2 mots environ)
    if (seg1Units > 2 && seg2Units > 2 && seg3Units > 2) {
      // Forcer le 3ème à devenir très court en le recoupant
      const seg3 = segments[i + 2];
      const words = seg3.split(' ');
      
      if (words.length > 2) {
        // Garder les 2 premiers mots, le reste retourne au flux
        const shortPart = words.slice(0, 2).join(' ');
        const remainder = words.slice(2).join(' ');
        
        segments[i + 2] = shortPart;
        
        // Insérer le reste après le segment 3
        if (remainder.trim()) {
          segments.splice(i + 3, 0, remainder);
        }
      }
    }
  }
  
  return segments;
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 5 — SAUTS DE LIGNE INTERNES
// ══════════════════════════════════════════════════════════════

function applyLineBreaks(segments, granularity) {
  let previousHadLineBreak = false;
  
  for (let i = 0; i < segments.length; i++) {
    // Règle anti-récurrence : si le précédent a eu un saut, on saute celui-ci
    if (previousHadLineBreak) {
      previousHadLineBreak = false;
      continue;
    }
    
    const segment = segments[i];
    let modified = false;
    
    // A) DIALOGUES avec signe " - "
    // Conserver TOUS les retours à la ligne entre répliques " - "
    if (segment.includes(' - ') || segment.includes('— ')) {
      // Les dialogues gardent leur structure naturelle
      // On ne fait rien de spécial ici, la structure est déjà préservée
      continue;
    }
    
    // B) Phrase très courte EN DÉBUT de segment
    if (!modified && segment.length < CONFIG.SHORT_PHRASE_THRESHOLD) {
      if (Math.random() < CONFIG.LINE_BREAK_PROBS.shortAtStart) {
        // Insérer \n avant cette phrase (donc au début, pas très utile visuellement)
        // En fait, on ne fait rien car c'est déjà au début
        // Cette règle s'applique plutôt si le segment commence par une très courte phrase
        // suivie d'autre chose
        const parts = segment.split(' ');
        if (parts.length > 2) {
          const firstWord = parts[0];
          if (firstWord.length < CONFIG.SHORT_PHRASE_THRESHOLD) {
            segments[i] = firstWord + '\n' + parts.slice(1).join(' ');
            modified = true;
            previousHadLineBreak = true;
          }
        }
      }
    }
    
    // C) Phrase très courte EN FIN de segment
    if (!modified && segment.length < CONFIG.SHORT_PHRASE_THRESHOLD) {
      if (Math.random() < CONFIG.LINE_BREAK_PROBS.shortAtEnd) {
        const parts = segment.split(' ');
        if (parts.length > 2) {
          const lastPart = parts[parts.length - 1];
          const beforeLast = parts.slice(0, -1).join(' ');
          if (lastPart.length < CONFIG.SHORT_PHRASE_THRESHOLD) {
            segments[i] = beforeLast + '\n' + lastPart;
            modified = true;
            previousHadLineBreak = true;
          }
        }
      }
    }
    
    // D) Phrase très courte EN MILIEU de segment
    if (!modified) {
      const parts = segment.split(' ');
      for (let j = 1; j < parts.length - 1; j++) {
        if (parts[j].length < CONFIG.SHORT_PHRASE_THRESHOLD && 
            Math.random() < CONFIG.LINE_BREAK_PROBS.shortInMiddle) {
          const before = parts.slice(0, j).join(' ');
          const after = parts.slice(j).join(' ');
          segments[i] = before + '\n' + after;
          modified = true;
          previousHadLineBreak = true;
          break;
        }
      }
    }
    
    // E) Réplique entre guillemets « »
    if (!modified && (segment.includes('«') && segment.includes('»'))) {
      if (Math.random() < CONFIG.LINE_BREAK_PROBS.dialogue) {
        // Insérer \n avant le « et après le »
        let modifiedSegment = segment;
        modifiedSegment = modifiedSegment.replace(/«/g, '\n«');
        modifiedSegment = modifiedSegment.replace(/»/g, '»\n');
        // Nettoyer les sauts de ligne multiples
        modifiedSegment = modifiedSegment.replace(/\n+/g, '\n').trim();
        segments[i] = modifiedSegment;
        modified = true;
        previousHadLineBreak = true;
      }
    }
    
    // F) Segment long, aucune règle précédente déclenchée
    if (!modified && segment.length > CONFIG.LONG_SEGMENT_THRESHOLD) {
      if (Math.random() < CONFIG.LINE_BREAK_PROBS.longSegment) {
        // Insérer \n au milieu, à la frontière de phrase la plus proche
        const mid = Math.floor(segment.length / 2);
        
        // Chercher un point de coupure près du centre
        let cutPos = -1;
        const searchRange = 30; // Chercher dans un rayon de 30 caractères
        
        for (let offset = 0; offset < searchRange; offset++) {
          const pos1 = mid + offset;
          const pos2 = mid - offset;
          
          if (pos1 < segment.length && '.!?…;:'.includes(segment[pos1])) {
            cutPos = pos1 + 1;
            break;
          }
          if (pos2 > 0 && '.!?…;:'.includes(segment[pos2])) {
            cutPos = pos2 + 1;
            break;
          }
        }
        
        if (cutPos === -1) {
          // Si pas trouvé, couper à un espace près du centre
          for (let offset = 0; offset < searchRange; offset++) {
            const pos1 = mid + offset;
            const pos2 = mid - offset;
            
            if (pos1 < segment.length && segment[pos1] === ' ') {
              cutPos = pos1;
              break;
            }
            if (pos2 > 0 && segment[pos2] === ' ') {
              cutPos = pos2;
              break;
            }
          }
        }
        
        if (cutPos > 0 && cutPos < segment.length) {
          segments[i] = segment.substring(0, cutPos).trim() + '\n' + segment.substring(cutPos).trim();
          modified = true;
          previousHadLineBreak = true;
        }
      }
    }
  }
  
  return segments;
}

// ══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ══════════════════════════════════════════════════════════════

export function segmentText(text, granularity = 5) {
  // Étape 1 : Parsing
  const units = parseIntoUnits(text);
  
  // Étape 2 & 3 : Assemblage avec distribution et contrainte MAX_CHARS
  let segments = assembleSegments(units, granularity);
  
  // Étape 4 : Chocs de rythme (si slider ≤ 4)
  segments = applyRhythmShocks(segments, units, granularity);
  
  // Étape 5 : Sauts de ligne internes
  segments = applyLineBreaks(segments, granularity);
  
  return segments;
}

export default segmentText;
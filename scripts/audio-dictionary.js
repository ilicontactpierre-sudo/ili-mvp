/**
 * audio-dictionary.js
 * Dictionnaire audio FR/EN + synonymes basé sur UCS 8.2
 * Utilisé par :
 *   - index-boom-library.js (enrichissement à l'import)
 *   - SoundLibraryPicker.jsx (recherche floue)
 * 
 * Structure :
 *   TRANSLATIONS : mot anglais → traductions françaises
 *   SYNONYMS_FR  : mot français → mots connexes français
 *   UCS_CATEGORIES : catégorie UCS → traductions + synonymes
 */

// ─── Traductions EN → FR (termes audio courants) ─────────────────────────────

export const TRANSLATIONS = {
  // Matières / objets
  'wood': ['bois', 'en bois', 'ligneux'],
  'metal': ['métal', 'métallique', 'acier', 'fer'],
  'glass': ['verre', 'vitre', 'cristal'],
  'stone': ['pierre', 'roche', 'minéral', 'rocher'],
  'cloth': ['tissu', 'textile', 'étoffe', 'vêtement'],
  'paper': ['papier', 'carton', 'feuille'],
  'plastic': ['plastique', 'synthétique'],
  'leather': ['cuir', 'peau'],
  'rubber': ['caoutchouc'],
  'ceramic': ['céramique', 'porcelaine', 'poterie'],
  'concrete': ['béton', 'ciment'],
  'sand': ['sable', 'gravier', 'gravillon'],
  'dirt': ['terre', 'sol', 'boue'],
  'ice': ['glace', 'gel', 'verglas'],
  'snow': ['neige', 'poudreuse'],

  // Actions / mouvements
  'rattle': ['hochet', 'cliquetis', 'bruit sec', 'vibration', 'tremblement'],
  'shaking': ['secouement', 'agitation', 'tremblement', 'vibration'],
  'shake': ['secouer', 'agiter', 'trembler'],
  'creak': ['grincement', 'craquement', 'frottement'],
  'creak': ['grincer', 'craquer'],
  'crack': ['craquement', 'cassure', 'fissure', 'claquement'],
  'snap': ['claquement', 'cassure nette', 'bruit sec'],
  'click': ['clic', 'claquement', 'déclic'],
  'clack': ['claquement', 'clic', 'bruit sec'],
  'knock': ['coup', 'frappement', 'frappe', 'heurt'],
  'hit': ['impact', 'coup', 'frappe', 'choc'],
  'impact': ['impact', 'choc', 'collision', 'heurt', 'coup'],
  'strike': ['frappe', 'coup', 'choc', 'percussion'],
  'slam': ['claquement', 'coup violent', 'fermeture brusque'],
  'bang': ['détonation', 'claquement', 'coup fort', 'explosion'],
  'thud': ['bruit sourd', 'coup mat', 'choc lourd'],
  'thump': ['bruit sourd', 'coup lourd', 'choc'],
  'scrape': ['frottement', 'raclage', 'grattage'],
  'scratch': ['égratignure', 'grattement', 'griffure'],
  'rub': ['frottement', 'friction', 'frotter'],
  'slide': ['glissement', 'coulissement', 'glisser'],
  'roll': ['roulement', 'rotation', 'rouler'],
  'drop': ['chute', 'tomber', 'lâcher'],
  'fall': ['chute', 'tomber'],
  'bounce': ['rebond', 'rebondir', 'ricochet'],
  'break': ['cassure', 'rupture', 'fracture', 'brisure'],
  'shatter': ['bris', 'éclats', 'fracas', 'explosion de verre'],
  'crush': ['écrasement', 'broiement', 'compression'],
  'tear': ['déchirure', 'arrachement', 'déchirement'],
  'rip': ['déchirure', 'lacération', 'arrachement'],
  'pour': ['versement', 'écoulement', 'coulée'],
  'drip': ['goutte', 'égouttement', 'gouttelette'],
  'splash': ['éclaboussure', 'giclée', 'plouf'],
  'bubble': ['bulle', 'bouillonnement', 'gargouillage'],
  'boil': ['ébullition', 'bouillonnement'],
  'sizzle': ['grésillement', 'friture', 'crépitement'],
  'hiss': ['sifflement', 'souffle', 'chuintement'],
  'whoosh': ['souffle', 'vent', 'mouvement rapide', 'sifflement'],
  'sweep': ['balayage', 'transition', 'mouvement', 'whoosh'],
  'swipe': ['glissement', 'mouvement rapide'],
  'movement': ['mouvement', 'déplacement', 'geste', 'action'],
  'handling': ['manipulation', 'gestion', 'prise en main'],
  'turn': ['rotation', 'pivot', 'tourner'],
  'open': ['ouverture', 'ouvrir'],
  'close': ['fermeture', 'fermer', 'clore'],
  'latch': ['loquet', 'verrou', 'fermeture'],
  'lock': ['verrou', 'serrure', 'verrouillage'],
  'unlock': ['déverrouillage', 'ouverture'],

  // Objets quotidiens
  'matchbox': ['boîte d\'allumettes', 'allumettes'],
  'matchstick': ['allumette', 'bûchette'],
  'spoon': ['cuillère', 'couverts', 'ustensile'],
  'fork': ['fourchette', 'couverts', 'ustensile'],
  'knife': ['couteau', 'lame', 'couverts'],
  'cup': ['tasse', 'gobelet', 'bol'],
  'glass': ['verre', 'gobelet'],
  'bottle': ['bouteille', 'flacon'],
  'box': ['boîte', 'carton', 'coffret'],
  'bag': ['sac', 'sachet', 'pochette'],
  'key': ['clé', 'clef'],
  'door': ['porte', 'portail'],
  'window': ['fenêtre', 'vitre'],
  'chair': ['chaise', 'siège', 'fauteuil'],
  'table': ['table', 'bureau'],
  'book': ['livre', 'bouquin', 'ouvrage'],
  'page': ['page', 'feuille'],
  'pen': ['stylo', 'crayon'],
  'pencil': ['crayon', 'mine'],
  'clock': ['horloge', 'pendule', 'montre'],
  'tick': ['tic-tac', 'battement', 'tintement'],
  'bell': ['cloche', 'sonnette', 'carillon', 'grelot'],
  'phone': ['téléphone', 'sonnerie', 'appel'],
  'ring': ['sonnerie', 'anneau', 'carillon'],
  'keyboard': ['clavier', 'touches'],
  'screen': ['écran', 'moniteur'],
  'switch': ['interrupteur', 'commutateur', 'bouton'],
  'button': ['bouton', 'touche'],
  'zipper': ['fermeture éclair', 'zip'],
  'velcro': ['velcro', 'attache'],

  // Nature / environnement
  'wind': ['vent', 'brise', 'souffle', 'rafale', 'tempête'],
  'rain': ['pluie', 'averse', 'précipitations', 'gouttes'],
  'thunder': ['tonnerre', 'foudre', 'grondement'],
  'lightning': ['éclair', 'foudre'],
  'water': ['eau', 'liquide', 'flots'],
  'river': ['rivière', 'ruisseau', 'courant', 'fleuve'],
  'ocean': ['océan', 'mer', 'vagues', 'bord de mer'],
  'wave': ['vague', 'onde', 'déferlante'],
  'fire': ['feu', 'flamme', 'incendie', 'combustion'],
  'flame': ['flamme', 'feu', 'flambeau'],
  'crackling': ['crépitement', 'craquement', 'pétillement'],
  'birds': ['oiseaux', 'chant d\'oiseaux', 'pépiement', 'gazouillis'],
  'bird': ['oiseau', 'volatile', 'chant'],
  'insect': ['insecte', 'bourdon', 'stridulation'],
  'cricket': ['grillon', 'criquet', 'stridulation'],
  'frog': ['grenouille', 'coassement'],
  'forest': ['forêt', 'bois', 'sous-bois', 'nature'],
  'jungle': ['jungle', 'forêt tropicale', 'végétation dense'],
  'cave': ['grotte', 'caverne', 'souterrain'],
  'mountain': ['montagne', 'altitude', 'sommet'],
  'desert': ['désert', 'aride', 'sec'],
  'night': ['nuit', 'nocturne', 'soir'],
  'day': ['jour', 'diurne', 'matin'],

  // Ville / urbain
  'city': ['ville', 'urbain', 'cité', 'métropole'],
  'traffic': ['trafic', 'circulation', 'voitures'],
  'crowd': ['foule', 'masse', 'rassemblement', 'badauds'],
  'street': ['rue', 'avenue', 'trottoir', 'chaussée'],
  'market': ['marché', 'bazar', 'place'],
  'restaurant': ['restaurant', 'café', 'brasserie'],
  'office': ['bureau', 'open space', 'travail'],
  'school': ['école', 'collège', 'lycée', 'classe'],
  'hospital': ['hôpital', 'clinique', 'médical'],
  'church': ['église', 'cathédrale', 'lieu de culte'],
  'station': ['gare', 'station', 'terminal'],
  'airport': ['aéroport', 'terminal', 'piste'],
  'subway': ['métro', 'souterrain', 'rame'],
  'construction': ['construction', 'chantier', 'travaux'],
  'factory': ['usine', 'industrie', 'manufacture'],

  // Véhicules
  'car': ['voiture', 'automobile', 'véhicule'],
  'engine': ['moteur', 'mécanique', 'propulsion'],
  'truck': ['camion', 'poids lourd', 'transport'],
  'motorcycle': ['moto', 'deux-roues', 'motocyclette'],
  'bicycle': ['vélo', 'bicyclette', 'deux-roues'],
  'train': ['train', 'locomotive', 'wagon', 'rail'],
  'plane': ['avion', 'aéronef', 'vol'],
  'helicopter': ['hélicoptère', 'rotor'],
  'boat': ['bateau', 'navire', 'embarcation'],
  'ship': ['navire', 'bateau', 'paquebot'],
  'brake': ['frein', 'freinage', 'ralentissement'],
  'horn': ['klaxon', 'avertisseur', 'corne'],
  'tire': ['pneu', 'roue'],
  'exhaust': ['échappement', 'pot d\'échappement', 'fumée'],

  // Corps humain / voix
  'footstep': ['pas', 'marche', 'piétinement', 'démarche'],
  'step': ['pas', 'enjambée', 'marche'],
  'walk': ['marche', 'pas', 'déambulation'],
  'run': ['course', 'sprint', 'galop'],
  'breath': ['souffle', 'respiration', 'haleine'],
  'breathing': ['respiration', 'souffle', 'haleine'],
  'heartbeat': ['battement de cœur', 'pouls', 'palpitation'],
  'pulse': ['pouls', 'battement', 'rythme'],
  'voice': ['voix', 'parole', 'discours'],
  'whisper': ['chuchotement', 'murmure', 'susurrement'],
  'shout': ['cri', 'hurlement', 'appel'],
  'scream': ['cri', 'hurlement', 'vocifération'],
  'laugh': ['rire', 'ricanement', 'fou rire'],
  'cry': ['pleur', 'sanglot', 'larme'],
  'cough': ['toux', 'raclement'],
  'sneeze': ['éternuement'],
  'snore': ['ronflement'],
  'swallow': ['déglutition', 'avaler'],
  'chew': ['mastication', 'mâcher'],
  'eat': ['manger', 'alimentation', 'repas'],
  'drink': ['boire', 'boisson', 'ingestion'],

  // Armes / explosions
  'gun': ['arme', 'pistolet', 'fusil', 'coup de feu'],
  'shot': ['tir', 'coup de feu', 'détonation'],
  'explosion': ['explosion', 'déflagration', 'détonation', 'blast'],
  'bomb': ['bombe', 'explosion', 'détonation'],
  'sword': ['épée', 'lame', 'acier'],
  'bullet': ['balle', 'projectile', 'munition'],
  'reload': ['rechargement', 'recharge'],
  'silenced': ['silencieux', 'étouffé', 'discret'],

  // Musique / instruments
  'drum': ['tambour', 'batterie', 'percussion'],
  'piano': ['piano', 'clavier'],
  'guitar': ['guitare', 'cordes'],
  'violin': ['violon', 'archet', 'cordes'],
  'trumpet': ['trompette', 'cuivre'],
  'flute': ['flûte', 'bois'],
  'bass': ['basse', 'grave'],
  'percussion': ['percussion', 'batterie', 'rythme'],
  'sting': ['stinger', 'jingle', 'signature sonore'],
  'drone': ['bourdon', 'drone', 'note tenue', 'nappe'],
  'ambient': ['ambiant', 'atmosphérique', 'fond sonore'],
  'loop': ['boucle', 'ostinato', 'répétition'],

  // Qualificatifs
  'heavy': ['lourd', 'pesant', 'grave'],
  'light': ['léger', 'doux', 'fin'],
  'soft': ['doux', 'souple', 'délicat'],
  'hard': ['dur', 'fort', 'intense'],
  'fast': ['rapide', 'vif', 'brusque'],
  'slow': ['lent', 'posé', 'progressif'],
  'short': ['court', 'bref', 'ponctuel'],
  'long': ['long', 'étendu', 'prolongé'],
  'single': ['unique', 'seul', 'ponctuel', 'simple'],
  'multiple': ['multiple', 'plusieurs', 'répété'],
  'close': ['proche', 'intime', 'rapproché'],
  'distant': ['lointain', 'distant', 'éloigné'],
  'indoor': ['intérieur', 'dedans', 'in'],
  'outdoor': ['extérieur', 'dehors', 'out'],
  'dry': ['sec', 'without reverb', 'proche'],
  'wet': ['humide', 'réverbéré', 'avec réverbération'],
  'deep': ['profond', 'grave', 'sourd'],
  'high': ['aigu', 'haut', 'perçant'],
  'low': ['grave', 'bas', 'sourd'],
  'sharp': ['tranchant', 'net', 'précis', 'aigu'],
  'dull': ['sourd', 'mat', 'assourdi'],
  'clean': ['propre', 'net', 'clair'],
  'dirty': ['sale', 'rugueux', 'saturé'],
  'smooth': ['lisse', 'doux', 'fluide'],
  'rough': ['rugueux', 'rude', 'granuleux'],
  'bright': ['brillant', 'lumineux', 'clair'],
  'dark': ['sombre', 'grave', 'obscur'],
  'warm': ['chaud', 'chaleureux'],
  'cold': ['froid', 'glacé'],
  'hollow': ['creux', 'vide', 'résonant'],
  'solid': ['solide', 'massif', 'dense'],
  'wooden': ['en bois', 'boisé', 'ligneux'],
  'metallic': ['métallique', 'en métal'],
  'electronic': ['électronique', 'numérique', 'synthétique'],
  'mechanical': ['mécanique', 'industriel'],
  'organic': ['organique', 'naturel', 'acoustique'],
  'synthetic': ['synthétique', 'électronique', 'artificiel'],
  'natural': ['naturel', 'acoustique', 'organique'],
  'artificial': ['artificiel', 'synthétique', 'créé'],
  'designed': ['designé', 'créé', 'sound design'],

  // Ambiances narratives (utiles pour ILi)
  'tension': ['tension', 'suspense', 'angoisse', 'stress'],
  'suspense': ['suspense', 'tension', 'attente', 'mystère'],
  'mystery': ['mystère', 'énigme', 'obscur', 'inconnu'],
  'horror': ['horreur', 'effroi', 'terreur', 'peur'],
  'calm': ['calme', 'sérénité', 'paix', 'tranquillité'],
  'peaceful': ['paisible', 'serein', 'calme', 'tranquille'],
  'dramatic': ['dramatique', 'intense', 'fort'],
  'action': ['action', 'dynamique', 'énergie', 'mouvement'],
  'romantic': ['romantique', 'doux', 'tendre'],
  'melancholy': ['mélancolie', 'tristesse', 'nostalgie'],
  'eerie': ['inquiétant', 'étrange', 'bizarre', 'troublant'],
  'ominous': ['menaçant', 'sinistre', 'sombre', 'inquiétant'],
}

// ─── Synonymes FR → FR (mots connexes en français) ───────────────────────────

export const SYNONYMS_FR = {
  'porte': ['portail', 'entrée', 'issue', 'sortie', 'battant'],
  'eau': ['liquide', 'flots', 'courant', 'ruisseau', 'rivière', 'mer'],
  'pluie': ['averse', 'ondée', 'précipitation', 'déluge', 'crachin'],
  'vent': ['brise', 'souffle', 'rafale', 'bourrasque', 'zéphyr', 'tempête'],
  'feu': ['flamme', 'braise', 'incendie', 'brasier', 'combustion'],
  'voiture': ['automobile', 'véhicule', 'bagnole', 'auto', 'berline'],
  'pas': ['marche', 'foulée', 'enjambée', 'piétinement', 'démarche'],
  'coup': ['frappe', 'choc', 'impact', 'heurt', 'percussion'],
  'bruit': ['son', 'sonorité', 'bruit', 'fracas', 'vacarme'],
  'silence': ['calme', 'quiétude', 'paix', 'tranquillité'],
  'cri': ['hurlement', 'vociférations', 'appel', 'exclamation'],
  'musique': ['mélodie', 'harmonie', 'air', 'chanson', 'composition'],
  'oiseau': ['volatile', 'passereau', 'chant', 'gazouillis', 'pépiement'],
  'forêt': ['bois', 'sous-bois', 'taillis', 'sylve', 'bocage'],
  'nuit': ['soir', 'obscurité', 'ténèbres', 'crépuscule', 'minuit'],
  'maison': ['demeure', 'habitation', 'domicile', 'logis', 'intérieur'],
  'ville': ['cité', 'métropole', 'agglomération', 'bourg', 'urbain'],
  'téléphone': ['portable', 'mobile', 'cellulaire', 'sonnerie', 'appel'],
  'cuillère': ['couverts', 'ustensile', 'petite cuillère', 'cuillère à soupe'],
  'couverts': ['cuillère', 'fourchette', 'couteau', 'ustensile', 'vaisselle'],
  'verre': ['gobelet', 'tasse', 'récipient', 'cristal', 'vitre'],
  'cloche': ['sonnette', 'carillon', 'grelot', 'timbre', 'campanile'],
  'horloge': ['pendule', 'montre', 'tic-tac', 'minuterie', 'chronomètre'],
  'moteur': ['mécanique', 'propulsion', 'machine', 'turbine', 'cylindre'],
  'arme': ['pistolet', 'fusil', 'arme à feu', 'revolver', 'carabine'],
  'explosion': ['déflagration', 'détonation', 'blast', 'bourrasque', 'souffle'],
  'respiration': ['souffle', 'haleine', 'inspiration', 'expiration', 'soupir'],
  'tambour': ['batterie', 'percussion', 'caisse', 'timbale'],
  'grotte': ['caverne', 'souterrain', 'cavité', 'spéléo'],
  'mer': ['océan', 'vagues', 'bord de mer', 'littoral', 'côte'],
  'tonnerre': ['foudre', 'orage', 'grondement', 'tempête'],
  'ambulance': ['sirène', 'urgence', 'secours', 'gyrophare'],
  'alarme': ['sirène', 'avertisseur', 'signal', 'alerte'],
  'cliquetis': ['rattle', 'hochet', 'bruit sec', 'tintement'],
  'grincement': ['craquement', 'frottement', 'son aigu', 'crissement'],
  'frottement': ['friction', 'glissement', 'scrape', 'raclage'],
  'chuchotement': ['murmure', 'susurrement', 'confidence'],
  'ambiance': ['atmosphère', 'fond sonore', 'drone', 'ambiant'],
}

// ─── Catégories UCS → traductions françaises ─────────────────────────────────

export const UCS_CATEGORIES_FR = {
  'AIR': { fr: 'Air', synonyms: ['souffle', 'vent', 'air comprimé', 'pneumatique'] },
  'AIRCRAFT': { fr: 'Aéronef', synonyms: ['avion', 'hélicoptère', 'vol', 'aviation'] },
  'ALARMS': { fr: 'Alarmes', synonyms: ['alarme', 'sirène', 'avertisseur', 'signal', 'alerte'] },
  'AMBIENCE': { fr: 'Ambiance', synonyms: ['atmosphère', 'fond sonore', 'environnement', 'ambiant'] },
  'ANIMALS': { fr: 'Animaux', synonyms: ['animal', 'faune', 'créature', 'bête'] },
  'BEEPS': { fr: 'Bips', synonyms: ['bip', 'signal', 'signal sonore', 'tonalité'] },
  'BELLS': { fr: 'Cloches', synonyms: ['cloche', 'sonnette', 'carillon', 'grelot', 'timbre'] },
  'BIRDS': { fr: 'Oiseaux', synonyms: ['oiseau', 'chant', 'gazouillis', 'pépiement', 'volatile'] },
  'BOATS': { fr: 'Bateaux', synonyms: ['bateau', 'navire', 'embarcation', 'mer'] },
  'BULLETS': { fr: 'Balles', synonyms: ['balle', 'projectile', 'munition', 'tir'] },
  'CARTOON': { fr: 'Cartoon', synonyms: ['dessin animé', 'comique', 'fantaisie', 'animation'] },
  'CERAMICS': { fr: 'Céramique', synonyms: ['céramique', 'porcelaine', 'poterie', 'verre cassé'] },
  'CHAINS': { fr: 'Chaînes', synonyms: ['chaîne', 'métal', 'lourd', 'prison'] },
  'CLOCKS': { fr: 'Horloges', synonyms: ['horloge', 'pendule', 'tic-tac', 'montre', 'minuterie'] },
  'CLOTH': { fr: 'Tissu', synonyms: ['tissu', 'vêtement', 'textile', 'étoffe', 'froissement'] },
  'COMMUNICATIONS': { fr: 'Communications', synonyms: ['téléphone', 'radio', 'transmission', 'signal'] },
  'COMPUTERS': { fr: 'Ordinateurs', synonyms: ['ordinateur', 'clavier', 'informatique', 'numérique'] },
  'CREATURES': { fr: 'Créatures', synonyms: ['créature', 'monstre', 'fantastique', 'imaginaire'] },
  'CROWDS': { fr: 'Foules', synonyms: ['foule', 'gens', 'masse', 'public', 'audience', 'walla'] },
  'DESIGNED': { fr: 'Sound Design', synonyms: ['sound design', 'créé', 'synthétique', 'riser', 'stinger'] },
  'DIRT': { fr: 'Terre', synonyms: ['terre', 'sable', 'sol', 'boue', 'gravier'] },
  'DOORS': { fr: 'Portes', synonyms: ['porte', 'portail', 'ouverture', 'fermeture', 'battant'] },
  'DRAWERS': { fr: 'Tiroirs', synonyms: ['tiroir', 'rangement', 'meuble'] },
  'ELECTRICITY': { fr: 'Électricité', synonyms: ['électricité', 'courant', 'arc', 'foudre', 'buzz'] },
  'EXPLOSIONS': { fr: 'Explosions', synonyms: ['explosion', 'déflagration', 'détonation', 'blast', 'bang'] },
  'FIRE': { fr: 'Feu', synonyms: ['feu', 'flamme', 'incendie', 'braise', 'crépitement'] },
  'FOOTSTEPS': { fr: 'Pas', synonyms: ['pas', 'marche', 'course', 'foulée', 'piétinement'] },
  'FOLEY': { fr: 'Foley', synonyms: ['foley', 'son direct', 'effets', 'mouvement'] },
  'GLASS': { fr: 'Verre', synonyms: ['verre', 'vitre', 'cristal', 'bris de verre'] },
  'GORE': { fr: 'Gore', synonyms: ['violence', 'blessure', 'sang', 'chair'] },
  'GUNS': { fr: 'Armes à feu', synonyms: ['arme', 'pistolet', 'fusil', 'tir', 'coup de feu'] },
  'HUMAN': { fr: 'Corps humain', synonyms: ['corps', 'humain', 'biologique', 'organique', 'physique'] },
  'IMPACTS': { fr: 'Impacts', synonyms: ['impact', 'choc', 'collision', 'heurt', 'coup'] },
  'INDUSTRY': { fr: 'Industrie', synonyms: ['usine', 'machine', 'industriel', 'mécanique', 'manufacture'] },
  'INSECTS': { fr: 'Insectes', synonyms: ['insecte', 'grillon', 'cigale', 'stridulation', 'bourdonnement'] },
  'INTERFACE': { fr: 'Interface', synonyms: ['interface', 'UI', 'clic', 'notification', 'numérique'] },
  'KITCHEN': { fr: 'Cuisine', synonyms: ['cuisine', 'couverts', 'casserole', 'vaisselle', 'cuisson'] },
  'LAND VEHICLES': { fr: 'Véhicules terrestres', synonyms: ['voiture', 'camion', 'moto', 'transport'] },
  'LIQUIDS': { fr: 'Liquides', synonyms: ['eau', 'liquide', 'écoulement', 'splash', 'versement'] },
  'MACHINES': { fr: 'Machines', synonyms: ['machine', 'mécanique', 'moteur', 'appareil', 'engin'] },
  'MAGIC': { fr: 'Magie', synonyms: ['magie', 'fantastique', 'sortilège', 'enchantement', 'mystère'] },
  'MATERIALS': { fr: 'Matériaux', synonyms: ['matériau', 'matière', 'objet', 'surface'] },
  'METAL': { fr: 'Métal', synonyms: ['métal', 'acier', 'fer', 'aluminium', 'métallique'] },
  'MILITARY': { fr: 'Militaire', synonyms: ['militaire', 'armée', 'guerre', 'combat', 'soldat'] },
  'MUSIC': { fr: 'Musique', synonyms: ['musique', 'mélodie', 'harmonie', 'instrumental', 'score'] },
  'NATURE': { fr: 'Nature', synonyms: ['nature', 'paysage', 'environnement', 'sauvage', 'écologie'] },
  'PAPER': { fr: 'Papier', synonyms: ['papier', 'carton', 'feuille', 'froissement', 'papier journal'] },
  'PEOPLE': { fr: 'Personnes', synonyms: ['personne', 'humain', 'gens', 'individu'] },
  'PLASTIC': { fr: 'Plastique', synonyms: ['plastique', 'polymère', 'synthétique'] },
  'RAIN': { fr: 'Pluie', synonyms: ['pluie', 'averse', 'ondée', 'précipitation', 'crachin'] },
  'ROCKS': { fr: 'Roches', synonyms: ['roche', 'pierre', 'minéral', 'caillou', 'gravier'] },
  'SCIENCE': { fr: 'Science', synonyms: ['science', 'laboratoire', 'futuriste', 'high-tech'] },
  'SERVOS': { fr: 'Servos', synonyms: ['servo', 'moteur électrique', 'robotique'] },
  'SILENCE': { fr: 'Silence', synonyms: ['silence', 'calme', 'quiétude', 'tranquillité', 'room tone'] },
  'SPORTS': { fr: 'Sports', synonyms: ['sport', 'athletisme', 'compétition', 'activité physique'] },
  'SCI-FI': { fr: 'Science-fiction', synonyms: ['SF', 'futuriste', 'espace', 'vaisseau', 'laser'] },
  'THUNDER': { fr: 'Tonnerre', synonyms: ['tonnerre', 'foudre', 'orage', 'grondement'] },
  'TOOLS': { fr: 'Outils', synonyms: ['outil', 'marteau', 'scie', 'perceuse', 'bricolage'] },
  'TOYS': { fr: 'Jouets', synonyms: ['jouet', 'enfant', 'jeu', 'ludique'] },
  'TRAPS': { fr: 'Pièges', synonyms: ['piège', 'mécanisme', 'ressort', 'déclic'] },
  'VEHICLES': { fr: 'Véhicules', synonyms: ['véhicule', 'transport', 'moteur', 'déplacement'] },
  'WATER': { fr: 'Eau', synonyms: ['eau', 'liquide', 'ruisseau', 'mer', 'pluie', 'fontaine'] },
  'WEAPONS': { fr: 'Armes', synonyms: ['arme', 'combat', 'guerre', 'tir', 'lame'] },
  'WIND': { fr: 'Vent', synonyms: ['vent', 'brise', 'souffle', 'rafale', 'tempête', 'bourrasque'] },
  'WOOD': { fr: 'Bois', synonyms: ['bois', 'boisé', 'ligneux', 'planche', 'poutre', 'arbre'] },
  'WHOOSH': { fr: 'Whoosh', synonyms: ['whoosh', 'transition', 'mouvement rapide', 'souffle', 'sweep'] },
}

// ─── Fonction utilitaire : enrichir les tags d'un son ────────────────────────

/**
 * Prend les tags anglais d'un son et retourne une string de recherche enrichie
 * avec traductions FR + synonymes FR + synonymes EN
 */
export function buildSearchString(tags = [], category = '', description = '') {
  const terms = new Set()

  // Ajouter les tags originaux
  tags.forEach(t => terms.add(t.toLowerCase()))

  // Traduire chaque tag
  tags.forEach(tag => {
    const key = tag.toLowerCase()
    if (TRANSLATIONS[key]) {
      TRANSLATIONS[key].forEach(t => terms.add(t.toLowerCase()))
    }
  })

  // Ajouter les synonymes de catégorie UCS
  const catKey = category.toUpperCase()
  if (UCS_CATEGORIES_FR[catKey]) {
    const catData = UCS_CATEGORIES_FR[catKey]
    terms.add(catData.fr.toLowerCase())
    catData.synonyms.forEach(s => terms.add(s.toLowerCase()))
  }

  // Extraire les mots de la description (EN)
  if (description) {
    description
      .split(/[\s,.\-–]+/)
      .filter(w => w.length > 3)
      .forEach(w => {
        const key = w.toLowerCase()
        terms.add(key)
        if (TRANSLATIONS[key]) {
          TRANSLATIONS[key].forEach(t => terms.add(t.toLowerCase()))
        }
      })
  }

  // Ajouter les synonymes FR pour les termes déjà en français
  ;[...terms].forEach(term => {
    if (SYNONYMS_FR[term]) {
      SYNONYMS_FR[term].forEach(s => terms.add(s.toLowerCase()))
    }
  })

  return [...terms].join(' ')
}

/**
 * Enrichit une entrée sounds-index avec le champ searchString
 */
export function enrichSoundEntry(entry) {
  return {
    ...entry,
    searchString: buildSearchString(
      entry.tags || [],
      entry.boomCategory || entry.category || '',
      entry.description || ''
    )
  }
}
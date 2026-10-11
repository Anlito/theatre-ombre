// Contenu du carnet de projet : le document élève « étapes du projet » (5 étapes), décrit bloc par bloc.
// Le même contenu sert à l'écran « Carnet » des élèves, à l'impression et à l'outil professeur.
// Pour modifier un texte du carnet, c'est ici (le HTML simple est permis : <b>, <i>).
// {classe}, {dossier} et {prenoms} sont remplacés par la classe et les prénoms de l'équipe
// (« 3B », « LEA - TOM », « LEA_TOM »).
//
// Types de blocs :
//   sous      : en-tête d'une sous-étape (3.1, 3.2…) avec l'outil et l'aide
//   cadre     : encadré (objectif, sécurité, mini-cours…)
//   consignes : liste numérotée
//   tableau   : colonnes fixes (texte) ou à remplir (champ) ; une ligne par élément de « lignes »
//   check     : case à cocher de l'élève
//   valide    : ◆ validation du professeur (affichée, jamais cochée par l'élève)
//   photos    : photos prises avec la webcam ou choisies dans un fichier
//   texte     : zone de texte libre
//   leds, ia  : tableaux remplis en partie par le site (couleurs des LED, photos, reconnaissance)
//   lien      : bouton vers un écran du site (câblage…) ; « ecran » sur une sous-étape : son badge y mène
//   code      : code C++ à compléter (facultatif)
//   chaine    : les 3 cases d'une chaîne (information ou énergie)
//   choix     : tableau à choix (Information / Énergie / Les deux)

export const COMMANDE =
  '« Nous souhaitons créer un mini théâtre d’ombres qui reconnaît nos personnages grâce à une caméra et une IA, ' +
  'et qui réagit avec des lumières pour raconter une courte histoire d’environ 1 minute. »';

export const CLIENT = {
  attend: [
    { id: 'client.ia', t: '2 personnages reconnus par l’IA' },
    { id: 'client.led', t: 'Une LED différente par personnage' },
    { id: 'client.histoire', t: 'Une histoire d’environ 1 minute' },
  ],
  aussi: [
    { id: 'client.auto', t: 'Un système qui marche sans intervention humaine' },
    { id: 'client.3d', t: 'Personnages dessinés, modélisés, imprimés en 3D' },
    { id: 'client.oral', t: 'Un oral de 2 minutes pour présenter le projet' },
  ],
};

export const MODE_EMPLOI =
  'Suivez les <b>5 étapes dans l’ordre</b>. L’outil à utiliser est indiqué à droite de chaque étape. ' +
  'Cochez la case avant de passer à la suite. ◆ = le professeur valide.';

export const OUTILS = [
  ['<b>Tinkercad</b> + « Tuto Tinkercad.html »', 'Dans <b>{classe} › Matières › TECHNOLOGIE › Tableau › THEATRE IA</b>'],
  ['<b>Site</b> Théâtre d’ombre augmenté', '<b>anlito.github.io/theatre-ombre</b> (Chrome ou Edge) : c’est ce site'],
  ['<b>Aide du site</b>', 'Entraîner l’IA, câblage, LED : tout est dans le site, bouton <b>?</b> en haut.'],
  ['<b>Dossier de l’équipe</b>', '<b>{classe} › COMMUN › TECHNOLOGIE › THEATRE IA › {dossier}</b>'],
];

// Validations ◆ du professeur (données dans l'outil professeur).
export const VALIDATIONS = [
  { id: 'v1', etape: 1, t: 'Dessins validés' },
  { id: 'v2', etape: 2, t: 'Modèles validés avant impression 3D' },
  { id: 'v3a', etape: 3, t: 'Montage validé par le professeur' },
  { id: 'v3b', etape: 3, t: 'Démo fonctionnelle devant le professeur' },
  { id: 'v4', etape: 4, t: 'Schéma validé par le professeur' },
  { id: 'v5', etape: 5, t: 'Oral de 2 minutes présenté' },
];

export const ETAPES = [
  {
    n: 1,
    verbe: 'Dessiner',
    titre: 'Dessiner mes 2 personnages',
    sousTitre: 'sur papier, à taille réelle',
    outil: 'Papier',
    route: '◆ Dessins validés',
    blocs: [
      { type: 'cadre', html: '<b>Objectif :</b> une <b>silhouette pleine</b> par feuille A4, à <b>taille réelle</b>. <b>Taille maximale : 10 cm × 10 cm.</b>' },
      {
        type: 'consignes',
        items: [
          '<b>Choisissez 2 personnages très différents</b> (un grand, un petit…).',
          '<b>Astuce du calque :</b> affichez l’image du personnage sur l’écran (luminosité au maximum), posez la feuille A4 dessus et <b>repassez le contour</b>. Appuyez très légèrement sur l’écran.',
          '<b>Repassez au feutre noir</b> et <b>remplissez</b> la silhouette.',
          '<b>Simplifiez :</b> pas de détail fin, <b>toutes les parties reliées</b> entre elles.',
          '<b>Écrivez sur la feuille :</b> hauteur, largeur, nom du personnage et <b>vos prénoms</b>.',
        ],
      },
      {
        type: 'tableau',
        id: 'dessins',
        colonnes: [
          { t: 'Personnage', fixe: true },
          { id: 'nom', t: 'Nom' },
          { id: 'hauteur', t: 'Hauteur (cm)', nombre: true, max: 10 },
          { id: 'largeur', t: 'Largeur (cm)', nombre: true, max: 10 },
          { id: 'par', t: 'Dessiné par' },
        ],
        lignes: ['1', '2'],
      },
      {
        type: 'photos',
        id: 'dessins',
        t: 'Photo de vos 2 dessins',
        aide: 'Posez chaque feuille A4 bien à plat devant la webcam, ou choisissez une photo déjà prise.',
        max: 2,
      },
      { type: 'check', id: 'e1.silhouettes', t: 'Silhouettes pleines, ≤ 10 cm × 10 cm, cotes et prénoms écrits' },
      { type: 'valide', id: 'v1', t: 'Rendre le dessin au professeur' },
    ],
  },
  {
    n: 2,
    verbe: 'Modéliser',
    titre: 'Modéliser mes 2 personnages',
    sousTitre: 'sur Tinkercad',
    outil: 'Tinkercad',
    route: '◆ Modèles validés avant impression 3D',
    blocs: [
      { type: 'cadre', html: '<b>Tutoriel :</b> fichier <b>« Tuto Tinkercad.html »</b>, dans <b>{classe} › Matières › TECHNOLOGIE › Tableau › THEATRE IA</b>' },
      { type: 'cadre', ton: 'attention', html: '<b>À respecter :</b> <b>100 mm × 100 mm maximum</b> (1 cm = 10 mm) et <b>2 mm d’épaisseur</b>.' },
      {
        type: 'consignes',
        items: [
          'Ouvrez <b>Tinkercad</b> et créez un <b>nouveau design</b>, nommé <b>{prenoms}_personnage1</b>.',
          'Construisez la silhouette en suivant le tuto, d’après <b>votre dessin</b>.',
          '<b>Groupez</b> les formes en <b>un seul objet</b> et réglez l’épaisseur à <b>2 mm</b>.',
          '<b>Enregistrez</b>. Recommencez pour le 2<sup>e</sup> personnage.',
          'Exportez chaque personnage en <b>.STL</b> et rangez-le dans le dossier de l’équipe : <b>{prenoms}_Perso1.stl</b>, <b>{prenoms}_Perso2.stl</b>.',
        ],
      },
      {
        type: 'tableau',
        id: 'modeles',
        colonnes: [
          { t: 'Personnage', fixe: true },
          { id: 'hauteur', t: 'Hauteur (mm)', nombre: true, max: 100 },
          { id: 'largeur', t: 'Largeur (mm)', nombre: true, max: 100 },
          { id: 'design', t: 'Nom du design' },
        ],
        lignes: ['1', '2'],
      },
      { type: 'check', id: 'e2.modele', t: 'Un seul objet, ≤ 100 × 100 mm, 2 mm d’épaisseur, comme le dessin' },
      { type: 'valide', id: 'v2', t: 'Modèles validés avant impression 3D' },
    ],
  },
  {
    n: 3,
    verbe: 'Réaliser',
    titre: 'Former l’IA, câbler et programmer',
    sousTitre: 'sur ce site, avec la carte programmable',
    outil: 'Site + carte programmable',
    route: '◆ Câblage validé, puis démo devant le professeur',
    blocs: [
      { type: 'cadre', html: '<b>Objectif :</b> un personnage passe devant la webcam → <b>l’IA le reconnaît</b> → <b>sa LED s’allume</b>, sans toucher à l’ordinateur.' },

      { type: 'sous', n: '3.1', t: 'Choisir 2 LED', outil: 'Carnet', aide: 'Couleurs possibles : <b>rouge</b>, <b>jaune</b>, <b>verte</b>, <b>bleue</b> · broches <b>9, 10, 11 ou 12</b>' },
      {
        type: 'consignes',
        items: [
          'Choisissez vos <b>2 LED</b> : leur <b>couleur</b> et la <b>broche</b> de l’Arduino où vous allez les brancher.',
          'Remplissez le tableau : il règle aussi le site (la lueur des LED à l’écran prend vos couleurs). Choisissez le personnage de chaque LED.',
        ],
      },
      { type: 'leds', n: 2 },

      { type: 'sous', n: '3.2', t: 'Entraîner l’IA', outil: 'Site · 1 Entraîner', ecran: 'entrainer', aide: 'Aide <b>?</b> → « 1. Entraîner l’IA » · <b>« Que faire ? »</b> (étapes 1 à 5)' },
      {
        type: 'consignes',
        items: [
          '<b>« Activer la webcam »</b>, face à l’écran du théâtre.',
          '<b>Fond vide :</b> sans personnage, gardez <b>« Ajouter des photos »</b> appuyé (15 photos minimum).',
          '<b>« Nouveau personnage »</b> : un nom par silhouette, puis <b>15 photos minimum</b> de chacun en la bougeant un peu.',
          '<b>Testez :</b> chaque nom s’affiche en vert, et l’écran vide ne déclenche rien.',
        ],
      },
      { type: 'ia' },
      { type: 'check', id: 'e3.ia', t: 'La pastille <b>IA</b> est verte et chaque personnage est reconnu' },

      { type: 'sous', n: '3.3', t: 'Câbler les LED', outil: 'Câblage', ecran: 'cablage', aide: 'Tutoriel : schéma et photo du montage (bouton ci-dessous)' },
      { type: 'cadre', ton: 'attention', html: '<b>Sécurité :</b> câblez avec le <b>câble USB débranché</b>. Jamais sur les broches <b>0 et 1</b>.' },
      {
        type: 'consignes',
        items: [
          'Les LED sont <b>déjà prêtes</b> (résistance intégrée).',
          'Fil <b>noir ou marron</b> → borne <b>−</b> de chaque LED.',
          'Fil <b>de la couleur de la LED</b> → la <b>broche</b> de l’Arduino choisie en 3.1 (tableau des LED).',
        ],
      },
      { type: 'lien', ecran: 'cablage', t: 'Ouvrir le tutoriel de câblage (schéma et photo)' },
      { type: 'photos', id: 'cablage', t: 'Photo du câblage', aide: 'Montrez la carte programmable et les LED à la webcam, ou choisissez une photo déjà prise.', max: 2 },
      { type: 'check', id: 'e3.cablage', t: 'Noir ou marron sur −, fil de couleur sur la bonne broche' },
      { type: 'valide', id: 'v3a', t: 'Montage validé par le professeur avant de brancher l’USB' },

      { type: 'sous', n: '3.4', t: 'Connecter la carte programmable', outil: 'Site · Carte programmable', ecran: 'carte', aide: 'Bouton <b>« Que faire ? »</b> (étapes 6 et 7)' },
      {
        type: 'consignes',
        items: [
          'Vérifiez le câblage (<b>tutoriel de câblage</b>), puis branchez l’<b>USB</b>.',
          'Cliquez sur <b>« Carte programmable · Connecter »</b> et choisissez la carte programmable dans la liste.',
        ],
      },
      { type: 'lien', ecran: 'cablage', t: 'Revoir le tutoriel de câblage' },
      { type: 'check', id: 'e3.pastilles', t: 'Les pastilles <b>Carte programmable</b>, <b>Webcam</b> et <b>IA</b> sont vertes' },

      { type: 'sous', n: '3.5', t: 'Programmer en blocs', outil: 'Site · 2 Programmer', ecran: 'programmer', aide: 'Aide <b>?</b> → « Niveau 1 · Premiers pas » · <b>« Que faire ? »</b> (étapes 8 et 9)' },
      {
        type: 'consignes',
        items: [
          'Cliquez sur <b>« 2 Programmer »</b>, puis <b>« 1 · Premiers pas »</b>.',
          'Bloc <b>« quand je vois [personnage] »</b> (Événements), puis dessous <b>« allumer la LED broche [n°] »</b> : la liste montre la couleur de chaque broche (ex. « 9 · rouge »).',
          'Ajoutez <b>« quand je ne vois plus… »</b> puis <b>« éteindre la LED… »</b>. Faites de même pour l’autre personnage.',
          '<b>« Démarrer »</b> : passez un personnage devant la webcam, sa LED s’allume.',
        ],
      },
      { type: 'check', id: 'e3.programme', t: 'La bonne LED s’allume pour chaque personnage' },
      { type: 'valide', id: 'v3b', t: 'Démo fonctionnelle devant le professeur' },

      { type: 'sous', n: '3.6', t: 'Pour aller plus loin (facultatif)', outil: 'Site · 2 Programmer', ecran: 'programmer', aide: 'Aide <b>?</b> → « Niveau 2 » et « Niveau 3 »', facultatif: true },
      {
        type: 'consignes',
        items: [
          '<b>Niveau 2</b> (boucles et conditions) : refaites votre programme avec <b>« répéter indéfiniment »</b> et <b>« si… alors… sinon »</b>.',
          '<b>Niveau 3</b> : lisez le <b>même programme en C++</b> et complétez le code avec <b>vos</b> personnages (« Loup » est un exemple) :',
        ],
      },
      { type: 'code', id: 'cpp', facultatif: true },

      { type: 'sous', n: '3.7', t: 'Enregistrer le projet', outil: 'Site', aide: '<b>À refaire à chaque fin de séance</b> · <b>« Que faire ? »</b> (étape 10)' },
      {
        type: 'consignes',
        items: [
          'Menu de l’équipe → <b>« Enregistrer »</b> (ou Ctrl + S), dans <b>{classe} › COMMUN › TECHNOLOGIE › THEATRE IA › {dossier}</b>.',
          'Nom du fichier : <b>{prenoms}_theatre_ombre.json</b>. Le carnet est enregistré dans ce fichier.',
        ],
      },
      { type: 'check', id: 'e3.enregistre', t: 'Fichier enregistré dans mon dossier d’équipe' },
    ],
  },
  {
    n: 4,
    verbe: 'Comprendre',
    titre: 'Comprendre les deux chaînes, puis les remplir',
    sousTitre: 'chaîne d’information et chaîne d’énergie',
    outil: 'Papier + mémo',
    route: '◆ Schéma complété',
    blocs: [
      { type: 'cadre', html: '<b>Tutoriel :</b> votre mémo de cours.' },
      {
        type: 'cadre',
        ton: 'cours',
        html:
          '<b>Mini-cours :</b> un système automatique a <b>deux chaînes</b> qui travaillent ensemble : l’une <b>décide</b>, l’autre <b>agit</b>. ' +
          '<b>L’information commande l’énergie.</b> <i>Exemple pour toute la page : un portail automatique.</i>',
      },
      {
        type: 'chaine',
        lettre: 'A',
        t: 'La chaîne d’information : elle décide',
        nom: 'Info',
        cases: [
          { id: 'chaine.acquerir', t: 'Acquérir', def: 'Un <b>capteur</b> détecte ou mesure quelque chose.', ex: 'Portail : la cellule voit la voiture' },
          { id: 'chaine.traiter', t: 'Traiter', def: 'Un <b>programme</b> analyse l’information et <b>décide</b>.', ex: 'Portail : la carte programmable décide d’ouvrir' },
          { id: 'chaine.communiquer', t: 'Communiquer', def: 'Il <b>envoie l’ordre</b> à la chaîne d’énergie.', ex: 'Portail : le signal part vers le moteur' },
        ],
      },
      {
        type: 'chaine',
        lettre: 'B',
        t: 'La chaîne d’énergie : elle agit',
        nom: 'Énergie',
        cases: [
          { id: 'chaine.alimenter', t: 'Alimenter', def: 'Une <b>source</b> fournit l’énergie (prise, pile, USB).', ex: 'Portail : le courant de la maison' },
          { id: 'chaine.distribuer', t: 'Distribuer', def: 'Un composant <b>envoie l’énergie</b> quand l’ordre arrive.', ex: 'Portail : le relais donne le courant' },
          { id: 'chaine.agir', t: 'Agir', def: 'Un <b>actionneur</b> transforme l’énergie en effet visible.', ex: 'Portail : le moteur ouvre le portail' },
        ],
      },
      {
        type: 'choix',
        id: 'composants',
        t: 'Les composants de mon projet : dans quelle chaîne ? Placez-les ensuite dans les cases « Dans mon projet ».',
        options: [
          { v: 'info', t: 'Information' },
          { v: 'energie', t: 'Énergie' },
          { v: 'deux', t: 'Les deux' },
        ],
        lignes: [
          { id: 'webcam', t: 'Webcam', role: 'Capture l’image des personnages' },
          { id: 'ordinateur', t: 'Ordinateur', role: 'Fait tourner le site et fournit le courant par l’USB' },
          { id: 'ia', t: 'IA du site', role: 'Reconnaît le personnage devant la caméra' },
          { id: 'programme', t: 'Programme en blocs', role: 'Dit quelle LED allumer pour quel personnage' },
          { id: 'usb', t: 'Câble USB', role: 'Relie l’ordinateur à l’Arduino' },
          { id: 'arduino', t: 'Arduino UNO', role: 'Reçoit l’ordre et commande les LED' },
          { id: 'led', t: 'LED 1 et LED 2', role: 'S’allument pour :', champ: 'composants.led.pour' },
        ],
      },
      { type: 'texte', id: 'chaine.arduino', t: 'Pourquoi l’Arduino appartient-il aux deux chaînes ?', lignes: 3 },
      { type: 'check', id: 'e4.chaines', t: 'Les 2 chaînes sont complétées' },
      { type: 'valide', id: 'v4', t: 'Schéma validé par le professeur' },
    ],
  },
  {
    n: 5,
    verbe: 'Présenter',
    titre: 'Préparer et présenter l’oral (2 minutes)',
    sousTitre: 'histoire et oral de 2 minutes',
    outil: 'Papier + spectacle',
    route: '◆ Oral présenté',
    blocs: [
      { type: 'sous', n: '5.1', t: 'Écrire l’histoire (environ 1 minute)', outil: 'Papier' },
      { type: 'texte', id: 'histoire.titre', t: 'Titre', lignes: 1 },
      {
        type: 'tableau',
        id: 'histoire.perso',
        colonnes: [
          { t: 'LED · personnage', fixe: true },
          { id: 'nom', t: 'Nom' },
          { id: 'role', t: 'Rôle dans l’histoire' },
        ],
        lignes: ['LED 1 · Personnage 1', 'LED 2 · Personnage 2'],
      },
      { type: 'texte', id: 'histoire.resume', t: 'Résumé en 3-4 phrases', lignes: 4 },

      { type: 'sous', n: '5.2', t: 'Répéter avec le spectacle', outil: 'Site · 3 Spectacle', ecran: 'spectacle', aide: 'Aide <b>?</b> → « 3. Spectacle » · <b>« Que faire ? »</b> (étape 11)' },
      {
        type: 'consignes',
        items: [
          '<b>« 3 Spectacle »</b>, puis <b>« Lancer le spectacle »</b>.',
          'Racontez l’histoire en présentant les personnages devant la webcam, <b>sans toucher à l’ordinateur</b>.',
        ],
      },
      { type: 'cadre', ton: 'attention', html: '<b>Fin de séance :</b> <b>1.</b> « Tout éteindre » → <b>2.</b> « Déconnecter » la carte programmable → <b>3.</b> débrancher l’USB.' },

      { type: 'sous', n: '5.3', t: 'Préparer l’oral de 2 minutes', outil: 'Oral · 2 minutes' },
      {
        type: 'tableau',
        id: 'oral',
        colonnes: [
          { t: 'Partie', fixe: true },
          { t: 'Durée', fixe: true },
          { t: 'Idées', fixe: true },
          { id: 'mots', t: 'Mes mots-clés' },
        ],
        lignes: [
          ['<b>1. Présentation</b>', '15 s', 'Vos prénoms, ce que fait votre système.'],
          ['<b>2. Notre histoire</b>', '60 s', 'Le titre, les 2 personnages, puis la <b>démo</b>.'],
          ['<b>3. Ce que nous avons apprécié</b>', '15 s', 'Dessiner, modéliser, voir la LED s’allumer…'],
          ['<b>4. Ce que nous avons moins aimé</b>', '15 s', 'Une difficulté, et <b>comment vous l’avez réglée</b>.'],
          ['<b>5. Ce que nous retenons</b>', '15 s', 'L’IA apprend par exemples · l’information commande l’énergie · du dessin à l’objet.'],
        ],
      },
      {
        type: 'cadre',
        html:
          '<b>Conseils :</b> répartissez la parole · regardez le public · utilisez des mots-clés, ne lisez pas · testez le matériel avant. ' +
          'Pour démarrer : « Ce que j’ai le plus aimé, c’est… » · « Ce qui a été difficile, c’est… » · « Je retiens que… »',
      },
      { type: 'check', id: 'e5.systeme', t: 'Les 2 personnages sont imprimés, l’IA les reconnaît, les LED s’allument' },
      { type: 'check', id: 'e5.histoire', t: 'L’histoire dure environ 1 minute, le projet est enregistré' },
      { type: 'valide', id: 'v5', t: 'Oral de 2 minutes présenté' },
    ],
  },
];

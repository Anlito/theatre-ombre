## Dépendances communes en ligne

Blockly et la bibliothèque des réglages du collège viennent directement de Labo Blocs en ligne. Ces fichiers ne sont plus copiés dans le projet. Une connexion Internet est nécessaire pour les écrans de programmation ; les scènes, l’IA, les sons et les sauvegardes du Théâtre conservent leur fonctionnement propre.

# Théâtre d'ombre augmenté

Outil web pour le cycle 4 : les élèves entraînent une IA à reconnaître leurs personnages
avec la webcam, puis programment en blocs ce que fait la carte Arduino (LED, sons).
Tout se passe dans le navigateur : aucun serveur, aucun compte, aucune image envoyée sur Internet.

> État : **jalons 1, 2 et 3 réalisés** (à valider en classe avec la [checklist de recette](RECETTE.md)).
> Le C++ des 10 programmes types compile sur Uno et Nano (arduino-cli, cartes AVR 1.8.8).

## Guide « Que faire ? »

Le bouton **« Que faire ? 4/11 »** (en haut) ouvre une carte en bas à droite qui indique la **prochaine étape**
et un bouton pour y aller. Les 11 étapes se cochent toutes seules : webcam, photos du fond vide, personnages,
photos de chaque personnage, reconnaissance vérifiée, câblage et couleurs des LED (confirmé par l’équipe
avec « C’est fait »), carte connectée, programme écrit, programme testé, projet enregistré, spectacle lancé.
La carte s’ouvre seule au premier projet ; on la ferme avec ✕ et on la rouvre avec le bouton.

## Carnet de projet

Le bouton **Carnet** (à droite des étapes 1 · 2 · 3) ouvre le document « étapes du projet » de l'équipe, à remplir
dans le site : la commande du client, la route, puis les 5 étapes (Dessiner, Modéliser, Réaliser, Comprendre, Présenter)
avec leurs tableaux, cases à cocher, chaînes d'information et d'énergie, histoire et préparation de l'oral.

- **Rempli en partie par le site** : nombre de photos et reconnaissance de chaque personnage ; personnage de chaque LED
  (proposé d'après le programme du niveau 1).
- **LED (3.1)** : l'équipe choisit la **couleur** (rouge, jaune, verte, bleue) et la **broche** (celles du professeur, 9 à 12)
  de ses 2 LED. Ce choix règle le site : lueur des LED à l'écran, et liste des broches des blocs (« 9 · rouge »).
- **Badges « Site · 1 Entraîner »…** : au survol, l'onglet à utiliser clignote ; au clic, on y va (Entraîner, Programmer,
  Spectacle, connexion de la carte). Les étapes de câblage ont un bouton vers le **tutoriel de câblage**.
- **Cotes** : une hauteur ou une largeur au-delà de 10 cm (dessin) ou 100 mm (modèle) passe en orange.
- **Photos** (dessins A4, câblage) : prises avec la webcam ou choisies dans un fichier, réduites (environ 200 à 400 Ko).
- **◆ Validations** : données par le professeur (outil professeur), affichées dans le carnet ; les élèves ne peuvent pas les cocher.
- **Enregistré dans le fichier de l'équipe** (`PRENOM_PRENOM_theatre_ombre.json`), avec l'IA et les blocs.
- Les textes du carnet sont dans `site/js/carnet-contenu.js` (à modifier là si le document papier change).

## Outil professeur (suivi et notation)

**Adresse : <https://anlito.github.io/theatre-ombre/professeur.html>** (Chrome ou Edge ; lien aussi dans le mode professeur du site).

1. **Ouvrir le dossier d'une classe** : choisir `3B › COMMUN › TECHNOLOGIE › THEATRE IA` et autoriser la modification
   (elle sert uniquement à écrire les validations). L'outil lit le dossier de chaque équipe : projet et carnet, fichiers STL,
   images, PDF. La classe est reconnue d'après les carnets. « Rouvrir 3B » rouvre ensuite le dossier d'un clic.
2. **Vue de la classe** : une ligne par équipe : avancement du carnet (5 étapes), validations ◆, personnages de l'IA,
   STL, niveaux D1 à D7, note et mention. « Actualiser » relit les derniers enregistrements des élèves.
3. **Fiche d'une équipe** (onglets) :
   - **On note là où l'on corrige** : chaque onglet a un panneau **« À noter ici »** avec les validations ◆ et les livrables
     qui s'y rapportent, en 4 niveaux (Non atteint · En cours · Atteint · Dépassé), et des **indices** constatés par l'outil :
     - **Carnet** (lecture seule) : un panneau à la fin de chaque étape (1 : D1 · 2 : D2 · 3 : D3 et D4 · 4 : D5 · 5 : D6) ;
       dimensions des dessins (≤ 10 cm) et des modèles (≤ 100 mm), chaînes justes d'après le corrigé… ;
     - **IA et programme** (D4) : personnages, vignettes, programme en blocs niveau 1 et 2 ;
     - **Personnages 3D** (D2) : vue 3D des STL, taille ≤ 100 × 100 mm et épaisseur 2 mm vérifiées ;
     - **Photos et fichiers** (D1, D3).
   - **Bilan** : note de l'équipe, **bonus / malus par élève** avec son motif, commentaire, toutes les validations ◆
     et les 7 livrables (dont D7, investissement). La note reste affichée en haut de la fiche.
   - Les validations ◆ sont écrites aussitôt dans `validations.json` du dossier de l'équipe ; les élèves les voient dans
     leur carnet à la prochaine ouverture ou au prochain enregistrement.
4. **Note de l'équipe** = moyenne des livrables notés × 5 ; mentions : < 10 À approfondir · 10 à 12,9 Satisfaisant ·
   13 à 16,9 Bien · ≥ 17 Très bien. Note de l'élève = note de l'équipe + bonus / malus, entre 0 et 20.
5. **Exporter (Excel)** : un fichier .csv, une ligne par élève, niveaux écrits comme dans Pronote
   (Non atteint, Partiellement atteint, Atteint, Dépassé).
6. **Sauvegarder** : l'évaluation est gardée dans le navigateur de l'ordinateur, mais le fichier de sauvegarde est la vraie copie :
   à ranger dans **votre** dossier personnel (jamais dans celui des élèves). « Importer une sauvegarde » la reprend sur un autre poste.

Les fichiers des élèves ne sont jamais modifiés : seul `validations.json` est écrit dans chaque dossier d'équipe.

## Les niveaux de programmation

Le niveau se choisit **en haut de l'écran Programmer** (« Niveau : 1 · Premiers pas | 2 · Boucles et conditions | 3 · Code Arduino »),
ou par le professeur (mode professeur, `config.js`, adresse `?niveau=2`). Il est enregistré dans le projet de l'équipe.
**Pour une évaluation** : mode professeur → cocher « Verrouiller le niveau » (ou `niveauVerrouille: true` dans `config.js`) ;
les élèves voient alors le niveau imposé (🔒) sans pouvoir le changer, même en ouvrant un autre projet.

| Niveau | Blocs |
|---|---|
| **1 · Premiers pas** | quand je vois / ne vois plus, allumer / éteindre une LED, jouer un son, attendre, tout éteindre |
| **2 · Boucles et conditions** (comme mBlock / Vittascience) | **quand le programme démarre** (remplace « quand je vois / ne vois plus »), répéter indéfiniment / n fois / tant que, quitter la boucle, si… alors… sinon, comparaisons (=, ≠, <, >), et / ou / non, variables, blocs IA (je vois … ?, personnage vu, confiance en %), régler l'intensité d'une LED (broches ~), écrire à l'écran |

| **3 · Code Arduino** | le programme du niveau 2, avec à côté son **code C++ Arduino** en lecture seule |

**Un programme par niveau** : le niveau 1 et le niveau 2 sont deux programmes différents ; en changeant de niveau,
on retrouve le programme laissé à ce niveau. Les deux sont enregistrés dans le fichier de l'équipe.
Le niveau 3 montre le code du programme du niveau 2.

Au niveau 3, le panneau « Code C++ » se met à jour à chaque modification ; un clic sur un bloc éclaire ses lignes,
un clic sur une ligne sélectionne son bloc. Boutons « Copier le code » et « Télécharger le fichier .ino ».
Ce code est une **traduction pédagogique** : en classe, c'est toujours le programme en blocs qui s'exécute
(« en direct »). Pour un essai « autonome », on téléverse le .ino avec l'IDE Arduino et on tape le nom d'un
personnage dans le Moniteur série (la carte n'a pas de webcam) ; au retour dans l'outil, « Carte programmable · Connecter »
propose de réinstaller le programme du Théâtre d'ombre.

Au niveau 2, une zone **Messages** (bloc « écrire ») et une zone **Variables** s'affichent sous les blocs,
et un bloc incomplet est **entouré de rouge** : le programme ne démarre pas tant qu'il n'est pas complété.
Exemple de programme « façon mBlock » :

```
🏁 quand le programme démarre
🔁 répéter indéfiniment
     si 🧠 je vois Loup ? alors   💡 allumer la LED broche 9
     sinon                        ⚫ éteindre la LED broche 9
```

## Charte graphique

Direction « Papier & lanterne » conçue par Claude Design : fond crème, bande du haut sombre, titres en Georgia,
icônes maison (aucun emoji), polices système uniquement, contrastes WCAG AA vérifiés. Les variables de couleur
sont en tête de `site/css/style.css` ; les couleurs des catégories de blocs dans `site/js/blocks/definitions.js`.

## Matériel par poste

- Un ordinateur avec **Chrome ou Edge** et une webcam.
- Une carte **Arduino Uno ou Nano** + câble USB.
- **4 LED au maximum**, chacune avec sa résistance de **220 Ω** (déjà intégrée aux modules LED de la classe).
- Une breadboard et des fils ; des enceintes ou un casque (les sons sont joués par l'ordinateur).

## Câblage des LED

Page imprimable pour les élèves : `cablage.html` (lien en bas de l'outil).

| LED | Broche (par défaut) |
|---|---|
| LED 1 | **9 ~** |
| LED 2 | **10 ~** |
| LED 3 | **11 ~** |
| LED 4 | **12** (pas de ~ : allumer / éteindre seulement) |

```
broche (9, 10, 11 ou 12) ── résistance 220 Ω ── patte longue (+) de la LED
patte courte (−) de chaque LED ── rail − de la breadboard ── un fil noir ── GND
```

- Les broches se changent dans `site/config.js` (pour tous les postes) ou dans le **mode professeur**
  (pour un poste). Les blocs ne proposent alors que ces broches.
- Le **~** signale une broche qui sait faire varier la luminosité (niveau 2) : 9, 10 et 11 oui, 12 non.
- **Jamais les broches 0 et 1** (câble USB) : l'outil et la carte les refusent.

## Le programme de la carte : installé par le site

La carte doit contenir le programme fixe `theatre_ombre.ino` (il traduit les ordres du site : « allume la broche 9 »…).
**Le site l'installe lui-même** : si la carte a servi à un autre projet (mBlock, IDE Arduino…), « Carte programmable · Connecter »
ouvre la fenêtre **« Installer le programme sur la carte »** ; un clic, environ 3 secondes (un peu plus sur une
Nano « Old Bootloader »), puis la carte se connecte. Rien à installer sur l'ordinateur, aucun serveur :
le programme déjà compilé est rangé dans le site (`site/firmware/theatre_ombre.hex`), et le site parle au
bootloader de la carte comme l'IDE Arduino. Cartes acceptées : Uno et Nano (ATmega328P) ; une autre carte est refusée
sans rien écrire. La même installation est proposée dans `diagnostic.html`.

- Si `theatre_ombre.ino` est modifié un jour : `npm run firmware` refait le fichier du site
  (un test vérifie qu'il est à jour).
- Essai sur une vraie carte sans navigateur : `node tools/installer-carte.mjs COM14` (même code que le site).

### Ou avec l'IDE Arduino (solution de secours)

1. Ouvrir `arduino/theatre_ombre/theatre_ombre.ino` avec l'IDE Arduino.
2. Choisir la carte (Arduino Uno ou Nano) et le port, puis **Téléverser**.
   - Nano clone : si le téléversement échoue, choisir *Processeur : ATmega328P (Old Bootloader)*.
3. Vérification (facultative) : Moniteur série à **115200 bauds**, fin de ligne **Nouvelle ligne**.
   `PING` → `PONG v1` ; `D 9 1` → la LED 1 s'allume ; sans rien taper, elle s'éteint après 3 s.
4. **Fermer l'IDE Arduino** avant d'utiliser le site (sinon le port est occupé).

Ensuite, les élèves n'ont rien à téléverser.

**Fin de séance** (à reporter sur la fiche « Règles de sécurité et fin de séance ») :
**Tout éteindre → Déconnecter → débrancher le câble USB.** Il n'est plus nécessaire de téléverser
un programme vierge : la carte garde le programme fixe et éteint toute seule ses LED 3 s après
la fermeture de la page ou le débranchement.

## Réglages du professeur

- **`site/config.js`** : code du mode professeur (`2534`), niveau, broches des LED,
  seuil de confiance (80 %), nombre d'images de stabilité (5).
- **Mode professeur** (lien en bas de l'outil, protégé par le code) : mêmes réglages pour le projet
  ouvert et pour ce poste.
- **Par l'adresse** : `…/?niveau=2&broches=9,10,11` (pratique pour un favori ou un lien dans l'ENT).

Le code professeur évite les changements par erreur ; ce n'est pas une vraie sécurité.

## Projets des élèves

- Au démarrage (page d'accueil) : prénoms **et classe** (obligatoires ; la classe se choisit dans la liste des
  **réglages du collège**, communs à tous les outils et modifiés dans l'accueil de Labo Blocs, « Réglages du collège » :
  seules les classes de 4e et de 3e sont proposées, toutes les classes s'il n'y en a aucune). Le site lit sa copie de secours
  `site/college.js` (rafraîchie à chaque publication), puis la version en ligne si internet répond. Ensuite **Nouveau projet**, **Ouvrir notre projet**
  ou **Reprendre** le dernier travail. Le premier écran est le **Carnet** (feuille de route), puis 1 Entraîner, 2 Programmer, 3 Spectacle.
- **Première chose après « Nouveau projet » : ranger le projet.** La fenêtre « Ranger votre projet » fait choisir le dossier
  `3B › COMMUN › TECHNOLOGIE › THEATRE IA` ; le site y crée le dossier de l'équipe (`LEA - TOM`, sans accents)
  et y enregistre `LEA_TOM_theatre_ombre.json`. Le navigateur demande l'autorisation de modifier les fichiers : répondre oui.
  Le dossier de l'équipe est **toujours créé par le site** : si les élèves choisissent eux-mêmes le dossier `LEA - TOM`,
  le site leur demande le dossier qui le contient ; un autre dossier → « créer `LEA - TOM` dedans » ou en choisir un autre.
  Le début du chemin affiché vient des réglages du collège. Un groupe (3D1) range son dossier dans celui de sa
  classe : `Bureau › Classe › 3D › COMMUN › TECHNOLOGIE › 3D1 › THEATRE IA`.
- **Enregistrement automatique** : une fois le dossier choisi, le projet est réécrit tout seul 4 secondes après chaque
  modification (et quand on quitte l'onglet). La pastille de l'équipe indique « enregistrement… » puis « enregistré ».
  « Enregistrer » (menu équipe, ou Ctrl+S) reste possible.
- **Ouvrir notre projet** : choisir `THEATRE IA` puis cliquer sur son équipe dans la liste (ou choisir directement son dossier).
- Le professeur dépose `validations.json` dans chaque dossier d'équipe (outil professeur) : les ◆ apparaissent dans le carnet.
- Navigateur sans choix de dossier : le fichier est téléchargé, à ranger à la main.
- Le fichier contient les blocs, les personnages, l'IA entraînée (sans reprendre de photos),
  les réglages et les sons ajoutés (jusqu'à 5 Mo ; au-delà, seuls les noms sont gardés).
- Une **copie de secours** est faite chaque minute dans le navigateur du poste.

## Essayer le site sur son ordinateur

Le plus simple : **double-cliquer sur `Lancer le site.cmd`** (dans ce dossier). Le navigateur s'ouvre tout seul ;
laisser la fenêtre noire ouverte pendant l'utilisation, la fermer pour arrêter le site.

Ou, dans un terminal, dans ce dossier (Node.js doit être installé) :

```bash
npm start
```

Puis ouvrir <http://localhost:8080> dans Chrome ou Edge.

- `?carte=simulee` : **mode démo** sans carte (les LED s'affichent à l'écran).
- `diagnostic.html` : **diagnostic d'un poste** (navigateur, Web Serial, webcam, IA, LED).
- `comprendre-ia.html` : **cours « Comprendre l'IA »** (imprimable).
- `cablage.html` : **câblage des LED** (imprimable).

## Site en ligne (GitHub Pages)

**Adresse pour les élèves : <https://anlito.github.io/theatre-ombre/>**

- Diagnostic d'un poste : <https://anlito.github.io/theatre-ombre/diagnostic.html>
- Cours « Comprendre l'IA » : <https://anlito.github.io/theatre-ombre/comprendre-ia.html>
- Câblage imprimable : <https://anlito.github.io/theatre-ombre/cablage.html>
- Dépôt (code source) : <https://github.com/Anlito/theatre-ombre>

Seul le dossier `site/` est publié. À chaque envoi sur la branche `main`, le site se met à jour tout seul
en 1 à 2 minutes (onglet **Actions** du dépôt, workflow « Publier le site », `.github/workflows/pages.yml`).

**Mettre à jour le site** (par exemple après une modification de `site/config.js`) :

- en ligne : sur le dépôt GitHub, ouvrir le fichier, cliquer sur le crayon ✎, modifier, puis **Commit changes** ;
- ou depuis ce dossier : `git add -A`, `git commit -m "…"`, `git push`.

> Le dépôt est **public** : tout le monde peut y lire le code professeur (`2534`) et voir la photo du montage.
> Ce code évite seulement les changements par erreur ; ce n'est pas une vraie sécurité.

> Avant la séance, ouvrez `diagnostic.html` **sur un poste élève** :
> le réseau du collège peut bloquer certains sites. Si c'est le cas, demandez au service informatique
> d'autoriser `anlito.github.io`, ou utilisez la copie locale de secours (`Lancer le site.cmd`).

## Risques à vérifier sur un poste élève (avant la recette)

- **Web Serial ou webcam bloqués** par une règle du navigateur (gérée par le service informatique) :
  la page de diagnostic l'indique.
- **Cartes clones (puce CH340)** : Windows peut demander un pilote, dont l'installation exige les droits
  administrateur. À vérifier avec les vraies cartes.
- **Adresse du site filtrée** par le réseau du collège.
- **Enregistrement dans le dossier réseau** : si le navigateur le refuse, le fichier est téléchargé
  dans « Téléchargements » et l'élève doit le déplacer.

## Vérifier la compilation du C++ (arduino-cli)

Les tests traduisent 10 programmes types en C++ et les compilent pour Uno et Nano avec **arduino-cli**
(outil officiel Arduino, en ligne de commande). Sans arduino-cli, ces 3 tests sont simplement « sautés ».
Installation sur le poste de développement (pas sur les postes élèves) : voir `tools/installer-arduino-cli.md`.
Avec arduino-cli, `npm test` dure environ 4 minutes (les compilations sont longues).

> arduino-cli partage le dossier `Arduino15` avec l'IDE Arduino : installer les cartes AVR avec l'un les met
> à jour pour l'autre (c'est sans conséquence, la version la plus récente est utilisée par les deux).

## Tests automatiques (pour le développement)

```bash
npm test
```

Ils vérifient le protocole série (avec une carte simulée), les blocs et l'interpréteur (dont l'arrêt d'une
boucle infinie), l'IA hors webcam (KNN, seuil, stabilité) et la sauvegarde / rechargement des projets.

## Organisation des fichiers

| Dossier / fichier | Rôle |
|---|---|
| `site/` | Le site à publier, tel quel. |
| `site/config.js` | Réglages du professeur (code, niveau, broches, seuil). |
| `site/vendor/` | Bibliothèques et modèle d'IA embarqués (pas de CDN). Recréé par `npm run vendor`. |
| `site/sons/` | Sons de base (mp3) composés par `npm run sons` : libres de droits. |
| `arduino/theatre_ombre/theatre_ombre.ino` | Programme fixe de la carte. |
| `site/js/simulated-board.js` | Copie en JavaScript du programme de la carte (tests + mode démo). |
| `tests/` | Tests automatiques. |
| `design/` | Brief graphique, retour de Claude Design (`retour-claude-design/` : maquettes, jetons, icônes d'origine) et captures de tous les écrans (`npm run captures`, 1366 × 768, avec Chrome). |
| `site/img/icones/`, `site/js/icons.js` | Icônes de Claude Design, nettoyées et regroupées par `node tools/icones.mjs`. |
| `tools/` | Serveur local, copie des bibliothèques, fabrication des sons. |

## Licences

TensorFlow.js, MobileNet et JS-Interpreter : Apache 2.0 (voir `site/vendor/LICENCES/`).
Sons de base : composés pour ce projet. Images de câblage : reprises du tutoriel mBlock de l'enseignant.

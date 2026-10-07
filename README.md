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
personnage dans le Moniteur série (la carte n'a pas de webcam) ; il faut ensuite **re-téléverser
`theatre_ombre.ino`** pour que l'outil fonctionne de nouveau.

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

## Téléverser le programme de la carte (une seule fois par carte)

1. Ouvrir `arduino/theatre_ombre/theatre_ombre.ino` avec l'IDE Arduino.
2. Choisir la carte (Arduino Uno ou Nano) et le port, puis **Téléverser**.
   - Nano clone : si le téléversement échoue, choisir *Processeur : ATmega328P (Old Bootloader)*.
3. Vérification (facultative) : Moniteur série à **115200 bauds**, fin de ligne **Nouvelle ligne**.
   `PING` → `PONG v1` ; `D 9 1` → la LED 1 s'allume ; sans rien taper, elle s'éteint après 3 s.
4. **Fermer l'IDE Arduino** avant d'utiliser le site (sinon le port est occupé).

Ensuite, les élèves n'ont plus jamais rien à téléverser.

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

- Au démarrage (page d'accueil) : prénoms, puis **Nouveau projet**, **Ouvrir notre projet** ou **Reprendre** le dernier travail.
- **Enregistrer** (menu équipe en haut, ou Ctrl+S) : Chrome/Edge proposent de choisir le dossier de l'équipe ;
  nom proposé `PRENOM_PRENOM_theatre_ombre.json`. Si ce n'est pas possible, le fichier est téléchargé.
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

Blockly, TensorFlow.js, MobileNet et JS-Interpreter : Apache 2.0 (voir `site/vendor/LICENCES/`).
Sons de base : composés pour ce projet. Images de câblage : reprises du tutoriel mBlock de l'enseignant.

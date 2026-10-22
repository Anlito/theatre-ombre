# Parcours commun Labo Blocs — Théâtre d’ombre

## Outil professeur sur le modèle commun — 22 octobre 2026

**Adresse : <https://anlito.github.io/theatre-ombre/prof.html>** (Chrome ou Edge). L’ancienne adresse `professeur.html` y renvoie.
Même organisation que le distributeur, le labyrinthe et le Simon (brief `BRIEF-NOUVEAU-PROJET.md` d’atelier-cereales) :

- **Accueil** : ouvrir le dossier `… › 3X › COMMUN › TECHNOLOGIE › THEATRE IA` (suivi en direct), reprendre le dernier dossier, importer des .json.
- **Classe** : chiffres clés, alertes « équipe bloquée » (son, notification), tableau des 6 exercices (✓ ● ○, tentatives, ★), carnet x/N, note, dernière activité.
- **Équipe** : onglets **Bilan · Programmation · Carnet de projet · Historique · Croquis et dessins**.
- **Bandeau** : En direct, Barème, Excel, CSV, **Pronote**, Carnet de classe, Imprimer, Autre classe, Exercices.

Ce qui reste propre au Théâtre :
- **Note** = note évolutive du modèle commun (exercices 3 à 6 notés automatiquement ; les exercices 1 et 2 « entraîner l’IA »
  ne le sont pas) **+ la grille D1 à D7**, évaluée à la main sur 4 niveaux (Non atteint · Partiellement atteint · Atteint ·
  Dépassé). Un livrable pas encore évalué reste hors du total. Coefficients dans « Barème » (`site/donnees/notation.js`).
- **On note là où l’on corrige** : panneau « À noter ici » à la fin de chaque étape du carnet (D1, D2, D3 et D4, D5, D6),
  dans Programmation (D4, avec les personnages appris par l’IA) et dans Croquis et dessins (D1 · D2 · D3) ; D7 dans le Bilan.
  Chaque panneau montre les **indices** constatés (dimensions, photos, STL conformes, personnages reconnus, chaînes…).
- **Validations ◆** : écrites dans `validations.json` du dossier de l’équipe (droit d’écriture demandé au premier clic) ; les élèves les voient dans leur carnet.
- **Croquis et dessins** : photo prise par le professeur (modèle commun), photos du carnet, **personnages 3D** (STL, contrôle 100 × 100 mm et 2 mm).
- **Bilan** : bonus / malus par élève avec motif, commentaire d’équipe ; **Pronote** exporte une ligne par élève (D1 à D7 au vocabulaire Pronote, notes, mention).
- Les évaluations de l’ancien outil professeur (D1 à D7, bonus, commentaires) sont reprises une fois, automatiquement.

Organisation : `site/prof.html` ; fichiers communs repris du labyrinthe (`js/prof.js`, `js/prof-dessins.js`, `js/notes-prof.js`,
`js/moteur/`, `css/atelier.css`, `css/prof.css`) ; propres au Théâtre : `donnees/` (projet, barème, livrables D1 à D7),
`js/moteur/carnet.js` et `js/moteur/fichier-theatre.js` (le format des fichiers du Théâtre présenté au moteur commun),
`js/prof-theatre.js` (carnet, indices, STL, validations), `css/prof-theatre.css` et `css/carnet-prof.css`
(fabriqué par `npm run carnet-prof`). Correctif propre au Théâtre : l’avancement ne compte que les exercices notés
(le calcul commun comptait aussi les exercices libres 1 et 2).

Vérifications : 118 tests (dont 11 pour l’outil professeur, avec le vrai moteur Labo Blocs et le parcours en ligne) ;
parcours complet dans Chrome avec une classe d’exemple (suivi, alerte, notes, validation écrite, bonus, exports Pronote et CSV),
sans erreur. À vérifier en classe : le dossier réseau du collège (lecture en direct et écriture de validations.json).

## Liste intégrée et exercices d’entraînement — 21 octobre 2026

- L’onglet **IA et programmation** affiche les six exercices directement dans le site, avec progression, états verrouillés et bouton Continuer. Le détail d’un exercice s’ouvre en pleine page ; **Parcours** ramène à cette liste en conservant le travail.
- Les deux premiers exercices se modifient et se publient dans Labo Blocs comme entraînements IA sans programmation : aucun bloc artificiel n’est nécessaire. « Rien » est l’étiquette automatique du fond vide ; il ne faut pas la recréer. Le parcours central 1.2.0 reprend la modification de titre publiée dans la version professeur 1.1.0.
- Le Théâtre continue de charger les exercices et le moteur depuis Labo Blocs en ligne : publier dans l’éditeur central, attendre la fin de publication puis recharger le Théâtre. Aucune copie d’exercice n’est ajoutée dans ce dépôt.
- Vérifications : 112 tests logiciels réussis (3 essais dépendant d’outils externes ignorés), construction de publication, essais Chrome de la liste sur ordinateur et mobile, ouverture en pleine page, capture de dix photos avec extraction de test, validation et conservation des données. Ces essais ne mesurent pas la précision réelle de l’IA et ne remplacent pas le test Arduino en classe.

<!-- suivi-maintenance:debut -->
## État du projet et améliorations documentées — 21 octobre 2026

- L’entrée IA et programmation utilise les écrans, blocs, niveaux, caméra, simulateur et panneau Arduino communs de Labo Blocs.
- Six exercices progressifs : fond vide, deux étiquettes IA, première LED, personnage → LED, deux éclairages, puis programme final. Le dernier exercice reprend le programme du cinquième.
- Les exemples d’IA sont partagés entre exercices et conservés avec la progression dans la rubrique programmation du fichier de l’équipe ; le carnet reste dans ce même fichier.
- Le carnet, le suivi professeur en lecture seule et le lien de modification ont été adaptés au nouveau parcours. Les modules du Théâtre sont versionnés à la publication pour éviter un mélange de versions dans le cache.
- Les anciens blocs restent en archive ; leur conversion n’est pas automatique. Les exemples IA historiques sont repris. Les sons personnels sont conservés dans le fichier ; le parcours commun propose un buzzer facultatif.
- Modifier les exercices dans l’éditeur de Labo Blocs, parcours Théâtre d’ombre augmenté : parcours/theatre-ombre/parcours.js. L’intégration commune est dans interface/theatre-parcours.js du dépôt Labo Blocs.
- Validations antérieures : 112 tests logiciels du Théâtre et parcours navigateur des six exercices. La webcam réelle, la liaison Arduino et la scène d’une minute restent à vérifier en classe.

### Référence locale et maintenance

Dossier de travail de référence : **Documents/TheatreDombre**. Dépôt : [Anlito/theatre-ombre](https://github.com/Anlito/theatre-ombre). La branche principale est **main**. Les copies temporaires d’un chat ou les worktrees servent au travail intermédiaire ; elles ne remplacent pas ce dossier.

À chaque intervention :

1. Vérifier les modifications locales et la version publiée avant de commencer ; sauvegarder le travail non enregistré.
2. Décrire dans ce README les améliorations, les vérifications, les limites et les opérations restantes.
3. Publier les changements autorisés, puis synchroniser le dossier local de référence avec le même commit.
4. Contrôler le commit local, le commit distant et les fichiers restants avant d’annoncer que le projet est à jour. Signaler explicitement tout décalage ou travail conservé hors publication.

Cette règle permet de reprendre le projet dans un autre outil local sans perdre les dernières améliorations. Une publication du site ne met pas automatiquement à jour les dossiers du PC.

<!-- suivi-maintenance:fin -->

L’entrée **IA et programmation** ouvre les mêmes écrans, blocs, niveaux, caméra,
simulateur et panneau Arduino que les autres projets Labo Blocs. L’ancien écran
Entraîner/Programmer ne sert plus au parcours élève.

Le parcours **Théâtre d’ombre augmenté** contient six exercices : fond vide,
étiquettes de deux personnages, première LED, personnage → LED, deux éclairages,
puis programme final. Les deux premiers vérifient les exemples enregistrés ; les
quatre suivants vérifient le comportement des programmes dans le simulateur.
Le montage, la reconnaissance réelle et la scène d’une minute sont à tester en classe.

Pour le modifier : [éditeur de Labo Blocs](https://anlito.github.io/labo-blocs/site/editeur.html),
puis choisir **Théâtre d’ombre augmenté**. Les consignes, blocs, composants, tests,
exigences d’apprentissage et programme à reprendre se règlent dans cet éditeur.
Publier le parcours dans Labo Blocs, puis recharger le Théâtre pour le récupérer.
La source est parcours/theatre-ombre/parcours.js dans le dépôt Labo Blocs.

Le Théâtre charge le module et le parcours en ligne, sans les copier dans son site.
Le fichier de l’équipe garde le carnet et une rubrique programmation avec
les six exercices et la caméra partagée. Les étiquettes et les exemples ne sont
pas recommencés à chaque exercice ; l’exercice final reprend les blocs du 5.
Le suivi professeur lit les six exercices et affiche leurs programmes en lecture seule.

Les anciens fichiers restent lisibles : leurs blocs historiques sont conservés,
et leurs exemples d’IA sont repris dans le nouveau parcours. Les blocs de l’ancien
éditeur ne sont pas convertis automatiquement : l’équipe reconstruit son programme
avec les blocs communs, sans effacer l’archive des anciens blocs.

**Arduino :** utiliser le panneau **En direct** de Labo Blocs et son programme de carte.
La webcam et l’IA restent dans l’ordinateur ; le câble USB est nécessaire pendant
la scène. Une LED sur D9, une autre sur D10, avec résistances ou modules adaptés.
Les sons personnels de l’ancien projet restent dans le fichier mais ne sont pas
exécutés par le parcours commun ; l’option sonore du parcours utilise un buzzer.

## Documents complémentaires

RECETTE.md conserve les vérifications historiques. Pour l’organisation et le parcours actuels, suivre les sections de ce README et le dépôt Labo Blocs. Les valeurs d’accès ne sont pas documentées dans ce fichier.

# Checklist de recette — à dérouler en classe avant chaque livraison

À faire **sur un poste élève**, session élève (sans droits administrateur), dans la salle,
avec la vraie webcam et une vraie carte. Cocher au fur et à mesure.

Poste : ………………  Date : ………………  Navigateur et version : ………………  Adresse du site : ………………

## 0. Préparation (10 min)

- [ ] La carte a reçu `theatre_ombre.ino` (Moniteur série : `PING` → `PONG v1`), IDE Arduino fermé.
- [ ] LED câblées sur les broches prévues (par défaut 9, 10, 11, 12), masse commune sur GND.
- [ ] Écran du théâtre éclairé de façon constante, webcam fixée face à l'écran.

## 1. Poste et réseau (tous jalons)

- [ ] Le site s'ouvre en **https** sur le poste élève (pas de blocage du réseau).
- [ ] `diagnostic.html` : navigateur ✅, https ✅, Web Serial ✅, webcam ✅, IA chargée ✅ (noter le temps : …… s, …… ms/image).
- [ ] `diagnostic.html` : la carte se connecte ; broche 13 (petite LED de la carte) puis broche 9 : la LED s'allume et s'éteint.
- [ ] Aucune installation ni mot de passe administrateur n'a été demandé.

## 2. Confidentialité (jalon 1)

- [ ] Ouvrir les outils du navigateur (F12) → onglet **Réseau**, puis vider la liste.
- [ ] Entraîner un personnage et faire un passage : **aucune nouvelle requête** vers Internet
  (seulement des fichiers du site au chargement).

## 3. Une équipe, sans aide (jalon 1) — chronomètre : …… min (objectif < 15 min)

- [ ] Saisir les prénoms → Nouveau projet.
- [ ] Créer 3 personnages, 30 photos chacun + 30 photos du fond vide.
- [ ] Écrire « quand je vois X → allumer la LED broche … → jouer le son … » et « quand je ne vois plus X → éteindre ».
- [ ] ▶ Démarrer : la LED et le son réagissent au personnage.

## 4. Fiabilité de la reconnaissance (jalon 1)

- [ ] 20 passages de personnages : …… bonnes reconnaissances sur 20 (objectif ≥ 18, soit 90 %).
- [ ] Écran vide pendant 1 minute : **0** déclenchement parasite.
- [ ] Réactivité : moins de 1 seconde entre l'entrée du personnage et la LED.
- [ ] Si besoin, ajuster seuil / stabilité dans le mode professeur et noter les valeurs : …… % / …… images.

## 5. Sécurité de la carte (jalon 1)

- [ ] LED allumée, **débrancher le câble USB** : elle s'éteint (carte hors tension).
- [ ] LED allumée, **fermer l'onglet** : la LED s'éteint en moins de 3 s.
- [ ] LED allumée, **changer d'onglet** pendant 10 s : la LED reste allumée (signe de vie maintenu).
- [ ] Bouton **Tout éteindre** : LED éteintes, son coupé, programme arrêté.
- [ ] Bloc « attendre 10 secondes » en cours → **Stop** : la suite ne s'exécute pas.

## 5 bis. Carte venant d'un autre projet (installation depuis le site)

- [ ] Téléverser un autre programme sur la carte (ex. *Fichier → Exemples → Basics → Blink*, ou un projet mBlock), fermer l'IDE / mBlock.
- [ ] Dans l'outil : **Carte · Connecter** → la fenêtre « Installer le programme sur la carte » s'ouvre.
- [ ] **Installer le programme** : la barre avance, puis « Programme installé : la carte est prête » et la pastille Carte passe au vert (moins de 10 s).
- [ ] Une LED du programme s'allume bien ensuite.
- [ ] Même essai depuis `diagnostic.html`.
- [ ] (Nano clone) Même essai avec une Nano « Old Bootloader » : l'installation réussit aussi (un peu plus longue).

## 6. Spectacle (jalon 1)

- [ ] « Lancer le spectacle » : plein écran, nom du personnage en grand, « Tout éteindre » visible.
- [ ] « Masquer l'image » : la vidéo est cachée mais la reconnaissance continue.

## 7. Sauvegarde et reprise (tous jalons)

- [ ] Menu équipe (en haut) → Enregistrer, dans le **dossier réseau de l'équipe** : nom `PRENOM_PRENOM_theatre_ombre.json` proposé.
  (Si le navigateur refuse : le fichier arrive dans Téléchargements → noter le comportement.)
- [ ] Fermer le navigateur, rouvrir le site → « Ouvrir notre projet » : personnages, photos, blocs et sons
  retrouvés, la reconnaissance marche **sans reprendre de photo**.
- [ ] Fermer l'onglet sans enregistrer, rouvrir → la carte « Reprendre le dernier travail » de l'accueil propose le travail.
- [ ] Deux équipes sur deux postes : chacune n'ouvre que son propre fichier.

## 8. Niveau 2 (jalon 2)

- [ ] Mode professeur → niveau 2 : les catégories Opérateurs, Variables, IA et Affichage apparaissent ;
  dans Événements, seul « quand le programme démarre » est proposé.
- [ ] Une équipe écrit un programme avec **une boucle, une condition et une variable** en une séance de 55 min.
- [ ] « quand le programme démarre » + « répéter indéfiniment » + « si je vois Loup ? alors allumer sinon éteindre » :
  la LED suit le personnage.
- [ ] Boucle infinie sans « attendre » : la page reste utilisable et **Arrêter** répond en moins de 1 seconde.
- [ ] Un « si » sans condition est entouré de rouge et le programme refuse de démarrer, avec un message clair.
- [ ] Une variable « passages » augmente à chaque passage du personnage (zone Variables).
- [ ] « régler la LED broche 9 à 50 » : la LED éclaire faiblement ; sur la broche 12, l'outil explique que ce n'est pas possible.

## 9. Niveau 3 (jalon 3)

- [ ] Niveau 3 : le panneau « Code C++ » s'affiche à droite des blocs, en lecture seule, avec le message « traduction ».
- [ ] Ajouter / modifier un bloc : le code se met à jour.
- [ ] Cliquer sur un bloc : ses lignes s'éclairent ; cliquer sur une ligne : son bloc est sélectionné.
- [ ] « Télécharger le fichier .ino » puis l'ouvrir dans l'IDE Arduino : **Vérifier** réussit (Uno et Nano).
- [ ] Essai autonome (facultatif) : téléverser, taper `Loup` dans le Moniteur série → la LED s'allume.
  Puis **Carte · Connecter → Installer le programme** et vérifier que l'outil reparle à la carte.

## 10. Mode professeur

- [ ] Mode professeur (lien en bas de page) : un mauvais code est refusé, le bon code ouvre les réglages.
- [ ] Changer les broches des LED : les blocs ne proposent plus que ces broches.

## 11. Interface (charte Claude Design)

- [ ] En 1366 × 768 : la barre du haut tient sur une ligne, l’écran Entraîner (4 personnages) ne défile pas.
- [ ] Pastille « Carte · Connecter » : le rappel du câblage s’affiche, puis « Connecter la carte » ouvre la liste des ports.
- [ ] « Câblage des LED » (écran Programmer, menu « ? », accueil, pied de page) : panneau avec les broches réglées.
- [ ] Niveau 3 : la webcam est réduite en bande d’état ; « Agrandir la webcam » la rouvre (choix mémorisé par niveau).
- [ ] Au vidéoprojecteur : textes, pastilles et boutons lisibles depuis le fond de la salle.

## Bilan

- Problèmes constatés : ……………………………………………………………
- Décision : ☐ livrable en classe  ☐ corrections nécessaires

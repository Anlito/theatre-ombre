// Barème de la note (outil professeur). Le professeur peut le modifier ici, ou le régler dans
// le panneau « Barème » de prof.html (ces réglages-là sont gardés sur son ordinateur).
definirBareme({
  // Note sur :
  "sur": 20,
  // Exercices attendus à ce moment du projet (les N premiers notés ; 0 = tout le parcours).
  // Les exercices 1 et 2 (apprendre le fond vide, créer les étiquettes) sont des entraînements de l'IA : ils ne sont
  // pas notés automatiquement (l'IA se juge en classe, livrable D4).
  "objectif": 0,
  // Exercice réussi AU-DELÀ des exercices attendus : part de ses points ajoutée en bonus (0 : rien).
  "avance": 0,
  // Coefficient de chaque exercice de programmation (selon sa difficulté). 0 = l'exercice ne compte pas.
  //   3 première LED · 4 un personnage commande sa LED · 5 deux personnages, deux éclairages · 6 programme final
  "coefficients": { "3": 1, "4": 1.5, "5": 2, "6": 3 },
  // Points de bonus par défi réussi (le parcours n'en a pas pour l'instant).
  "bonusDefi": 1,
  // Exercice commencé (au moins une vérification) mais pas réussi : part des points accordée.
  "participation": 0.2,
  // Retenue par indice ouvert avant la réussite, et retenue maximale.
  "penaliteIndice": 0.1,
  "penaliteIndiceMax": 0.3,
  // Vérifications ratées sans retenue, puis retenue par vérification ratée en plus, et maximum.
  "essaisGratuits": 0,
  "penaliteEchec": 0.05,
  "penaliteEchecMax": 0.25,
  // Livrables de la grille du professeur (D1 à D7, donnees/carnet.js), notés à la main sur 4 niveaux
  // (Non atteint 1/4 · Partiellement atteint 2/4 · Atteint 3/4 · Dépassé 4/4), et leur coefficient (0 = ne compte pas).
  // Un livrable pas encore évalué reste hors du total : la note reste juste en cours de projet.
  "carnet": { "D1": 1, "D2": 1, "D3": 1, "D4": 1, "D5": 1, "D6": 1, "D7": 1 },
  // Arrondi de la note (0.5 = au demi-point, 0.25 = au quart de point, 0 = au centième).
  "arrondi": 0.5
});

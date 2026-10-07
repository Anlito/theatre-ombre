// ============================================================================
//  RÉGLAGES DU PROFESSEUR — fichier à modifier avant de publier le site
// ============================================================================
// Ces valeurs sont utilisées pour chaque NOUVEAU projet. Elles peuvent aussi être
// changées en classe dans le « mode professeur » (bouton ⚙ en bas de la page).

export const CONFIG = {
  // Code demandé pour ouvrir le mode professeur (simple protection, pas un mot de passe).
  codeProfesseur: '2534',

  // Niveau des blocs : 1 (blocs simples), 2 (boucles, conditions, variables), 3 (code C++).
  niveau: 1,

  // true : les élèves ne peuvent pas changer de niveau dans l'écran « Programmer » (évaluation).
  niveauVerrouille: false,

  // Broches où les élèves branchent leurs LED (4 au maximum).
  // 9, 10 et 11 savent aussi faire varier la luminosité (signe ~ sur la carte), pas 12.
  brochesLed: [9, 10, 11, 12],

  // Reconnaissance : confiance minimale (en %) et nombre d'images de suite.
  seuilConfiance: 80,
  imagesStables: 5,
};

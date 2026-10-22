// Carnet de projet vu par l'outil professeur (modèle commun : definirCarnet).
// Le carnet des élèves du Théâtre est décrit dans js/carnet-contenu.js (5 étapes) ; ici, seulement ce que le moteur
// commun note : les livrables de la grille du professeur (« notation_theatre_ombre.xlsx »), évalués à la main sur
// 4 niveaux. « etape » : l'étape du carnet où le livrable se corrige (son panneau y est affiché) ; « ou » : les autres
// onglets où il apparaît aussi ; « competence », « pronote » : onglet « Compétences Pronote » du tableur.
definirCarnet({
  "parties": [
    { "id": "D1", "type": "livrable", "note": true, "etape": 1, "ou": ["dessins"], "titre": "D1 · Dessins des personnages",
      "competence": "Concevoir et réaliser en réponse à un besoin", "pronote": "Concevoir, réaliser, valider un OST" },
    { "id": "D2", "type": "livrable", "note": true, "etape": 2, "ou": ["dessins"], "titre": "D2 · Fichiers STL — modélisation 3D",
      "competence": "Réaliser, fabriquer, mettre en service un OST", "pronote": "Concevoir, réaliser, valider un OST" },
    { "id": "D3", "type": "livrable", "note": true, "etape": 3, "ou": ["dessins"], "titre": "D3 · Câblage Arduino + LED",
      "competence": "Analyser le comportement d’un OST — chaîne d’énergie", "pronote": "Analyser le fonctionnement et le comportement d’un OST" },
    { "id": "D4", "type": "livrable", "note": true, "etape": 3, "ou": ["programmation"], "titre": "D4 · Programme + IA",
      "competence": "Programmer et faire interagir un système automatisé", "pronote": "Analyser le fonctionnement et le comportement d’un OST" },
    { "id": "D5", "type": "livrable", "note": true, "etape": 4, "titre": "D5 · Carnet de projet",
      "competence": "Décrire les interactions entre un OST et son environnement", "pronote": "Décrire les interactions entre un OST, son environnement et ses utilisateurs" },
    { "id": "D6", "type": "livrable", "note": true, "etape": 5, "titre": "D6 · Présentation orale",
      "competence": "Communiquer les résultats d’une démarche de projet", "pronote": "Concevoir, réaliser, valider un OST" },
    { "id": "D7", "type": "livrable", "note": true, "titre": "D7 · Investissement du groupe",
      "competence": "S’impliquer dans une démarche collaborative de projet", "pronote": "Concevoir, réaliser, valider un OST" }
  ]
});

// Dépendances de test du moteur commun de l'outil professeur (modèle du labyrinthe) : moteur Labo Blocs et parcours
// du Théâtre, téléchargés par tools/preparer-tests-labo.mjs (« npm test » le fait avant les tests) dans un cache
// exclu du dépôt et du site.
const path = require('node:path');
const cache = path.join(__dirname, '..', '.cache', 'labo-blocs');
module.exports = {
  cache,
  noyau: path.join(cache, 'labo-blocs-noyau.js'),
  parcours: path.join(cache, 'theatre-ombre.js'),
};

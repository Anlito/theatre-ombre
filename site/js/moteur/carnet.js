// Carnet de projet pour le moteur commun de l'outil professeur (modèle du distributeur et du labyrinthe).
// Le carnet du Théâtre garde son propre format (js/carnet.js : champs, cases, choix, photos, 5 étapes) : ce fichier
// donne au moteur commun les fonctions qu'il attend, calculées avec les règles du Théâtre.
// Les « parties » notées sont les livrables D1 à D7 (donnees/carnet.js), évalués à la main sur 4 niveaux.

(function (global) {
  'use strict';

  const enNode = typeof module === 'object' && module.exports;
  // Règles du carnet du Théâtre (module js/carnet.js) : sous Node, lu directement ; dans la page, posé par
  // js/prof-theatre.js (chargé avant ce fichier).
  const T = () => (enNode ? require('../carnet.js') : global.TheatreProf.carnet);

  const carnetVide = () => T().emptyCarnet();
  const completer = (c) => T().normalizeCarnet(c);

  // « 3B » → « 3 », « 4E » → « 4 ». Les livrables sont les mêmes pour les deux niveaux.
  function niveauDe(classe) {
    const m = String(classe || '').match(/^\s*(\d)/);
    return m ? m[1] : '';
  }
  const pourNiveau = () => true;
  const partie = (C, id) => ((C && C.parties) || []).find((p) => p.id === id) || null;
  const partiesSuivies = (C) => ((C && C.parties) || []).slice();

  // Avancement du carnet : réponses attendues remplies sur l'ensemble des 5 étapes (ex. 13/54).
  function avancementCarnet(carnet) {
    const etapes = T().avancementGlobal(completer(carnet));
    return { fait: etapes.reduce((s, e) => s + e.faits, 0), total: etapes.reduce((s, e) => s + e.total, 0), etapes };
  }

  // Un livrable n'est jamais « vérifié » par les élèves : il est évalué par le professeur.
  const etatPartie = () => 'a_faire';
  const harmoniser = (carnet) => completer(carnet);

  const api = {
    carnetVide,
    completerCarnet: completer,
    harmoniserCarnet: harmoniser,
    niveauDe,
    pourNiveau,
    partieCarnet: partie,
    partiesSuivies,
    avancementCarnet,
    etatPartie,
  };
  if (enNode) module.exports = api;
  else Object.assign((global.Atelier = global.Atelier || {}), api);
})(this);

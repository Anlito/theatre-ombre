// Fichiers des équipes du Théâtre → format lu par le moteur commun de l'outil professeur.
//
// Un fichier du Théâtre (LEA_TOM_theatre_ombre.json) est { format: 'theatre-ombre', equipe: ['Léa', 'Tom'],
// enregistre, carnet, programmation (écrite par Labo Blocs), personnages, couleursLed… }. Le moteur commun attend
// { application, formatVersion, equipe: { eleves, classe }, modifieLe, programmation, carnet }. Ce fichier fait la
// traduction au moment de la lecture (rien n'est écrit) ; le fichier d'origine reste disponible dans « theatre ».
// « validations.json » (◆ du professeur, rangé dans le dossier de l'équipe) n'est pas une sauvegarde d'équipe.

(function (global) {
  'use strict';

  const enNode = typeof module === 'object' && module.exports;
  const P = enNode ? require('./progression.js') : global.Atelier;
  const projet = () => (enNode ? require('./catalogue.js').projet : global.Atelier.projet);

  // Texte d'un fichier → texte au format de l'atelier (inchangé si ce n'est pas un fichier du Théâtre).
  function versAtelier(texte) {
    let d;
    try {
      d = JSON.parse(String(texte).replace(/^﻿/, ''));
    } catch {
      return texte;
    }
    if (!d || d.format !== 'theatre-ombre') return texte;
    const carnet = d.carnet && typeof d.carnet === 'object' ? d.carnet : {};
    const classe = typeof carnet.classe === 'string' ? carnet.classe.trim().toUpperCase() : '';
    const atelier = {
      application: projet().id,
      formatVersion: 2,
      equipe: { eleves: Array.isArray(d.equipe) ? d.equipe.map(String) : [], classe },
      modifieLe: d.enregistre || '',
      carnet,
      theatre: d,
    };
    if (d.programmation) atelier.programmation = d.programmation;
    return JSON.stringify(atelier);
  }

  const estValidations = (nom) => /(^|[\\/›\s])validations\.json$/i.test(String(nom).trim());

  // Le moteur commun lit les fichiers par lireSauvegarde : on traduit d'abord.
  const lire = P.lireSauvegarde;
  P.lireSauvegarde = (texte) => lire(versAtelier(texte));

  // Avancement : exercices notés réussis. Le parcours du Théâtre commence par deux exercices « libres » (entraîner
  // l'IA) que le calcul de Labo Blocs compte aussi, ce qui donnait « 4/4 » pour 2 exercices notés réussis.
  const N = () => (enNode ? require('./notation.js') : global.Atelier);
  P.avancement = (d) => N().exercicesObligatoires().filter((id) => d.exercices[id] && d.exercices[id].statut === 'reussi').length;

  const api = { versAtelier, estValidations };
  if (enNode) module.exports = api;
  else Object.assign((global.Atelier = global.Atelier || {}), api);
})(this);

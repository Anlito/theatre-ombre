// Progression d'une équipe : tout l'état tient dans un seul objet, enregistré dans un fichier .json.
//
// Les exercices de programmation sont ceux de Labo Blocs : leur travail est rangé dans la rubrique « programmation »
// du fichier, sous les identifiants stables du parcours (« lab-01 » …), et c'est le module Labo Blocs qui l'écrit
// (vérifications, indices, temps, programme). Le carnet de projet reste dans la rubrique « carnet ».
//
// Pour le carnet, l'outil du professeur et la notation, la sauvegarde présente aussi (sans l'écrire dans le fichier)
//   exercices      { « 1 » … « 8 » : la progression de l'exercice } — les mêmes objets que dans « programmation »
//   exerciceCourant
//
// Les sauvegardes d'avant Labo Blocs (format 1 : exercices rangés par numéro) se lisent : leur travail est recopié
// dans « programmation » à l'ouverture, rien n'est perdu. Le fichier passe au format 2 au premier enregistrement.

(function (global) {
  'use strict';

  const enNode = typeof module === 'object' && module.exports;
  const C = enNode ? require('./carnet.js') : global.Atelier;
  const LB = enNode ? require(require('../../../tools/dependances-tests.js').noyau) : global.LaboBlocs;
  const catalogue = () => (enNode ? require('./catalogue.js').catalogue : global.Atelier.catalogue);

  const PROJET = () => (enNode ? require('./catalogue.js').projet : global.Atelier.projet);
  const APPLICATION = PROJET().id;
  const FORMAT = 2;
  const ORDRE = enNode ? catalogue().ordre : global.Atelier.catalogue.ordre;

  const paquet = () => catalogue().paquet();
  const idDe = (numero) => {
    const e = paquet().exercices.find((x) => String(x.numero) === String(numero));
    return e ? e.id : null;
  };
  const numeroDe = (id) => {
    const e = paquet().exercices.find((x) => x.id === id);
    return e ? String(e.numero) : id;
  };

  const nomEquipe = LB.nomEquipe;
  const simplifier = LB.simplifierNom;

  // Vue de l'atelier (exercices par numéro), recalculée à chaque lecture, jamais écrite dans le fichier.
  function relier(d) {
    const changes = LB.relierParcours(d, paquet());
    delete d.exercices;
    delete d.exerciceCourant;
    d.formatVersion = FORMAT;
    const prog = () => d.programmation.exercices;
    Object.defineProperty(d, 'exercices', {
      configurable: true,
      enumerable: false,
      get() {
        const vue = {};
        for (const [id, e] of Object.entries(prog())) vue[numeroDe(id)] = e;
        return vue;
      },
    });
    Object.defineProperty(d, 'exerciceCourant', {
      configurable: true,
      enumerable: false,
      get: () => (d.programmation.exerciceCourant ? numeroDe(d.programmation.exerciceCourant) : ORDRE[0]),
    });
    return changes;
  }

  function creer(equipe) {
    const d = LB.creerSauvegarde(equipe, { application: APPLICATION, parcours: paquet(), projet: PROJET().projet });
    delete d.projet;
    d.formatVersion = FORMAT;
    d.carnet = C.carnetVide();
    relier(d);
    return d;
  }

  // Vérifie un fichier ouvert par l'équipe. Rien n'est modifié si le fichier est refusé.
  //   { ok, donnees, changes : exercices passés « modifié, à revérifier » (numéros) } ou { ok: false, raison }
  function lire(texte) {
    let d;
    try {
      d = JSON.parse(String(texte).replace(/^﻿/, ''));
    } catch {
      return { ok: false, raison: 'Ce fichier n’est pas une sauvegarde de l’atelier : il est illisible.' };
    }
    if (!d || d.application !== APPLICATION) {
      return { ok: false, raison: 'Ce fichier vient d’une autre application : ce n’est pas une sauvegarde de l’atelier.' };
    }
    if (typeof d.formatVersion !== 'number' || d.formatVersion > FORMAT || (d.programmation && d.programmation.version > 1)) {
      return { ok: false, raison: 'Cette sauvegarde vient d’une version plus récente de l’atelier : demande à ton professeur.' };
    }
    if (!d.equipe || !Array.isArray(d.equipe.eleves)) return { ok: false, raison: 'Cette sauvegarde est incomplète : il manque l’équipe.' };
    if (d.exercices) for (const e of Object.values(d.exercices)) e.historique = e.historique || [];
    // Sauvegardes d'avant le carnet de projet : on ajoute un carnet vide.
    d.carnet = C.completerCarnet(d.carnet);
    const changes = relier(d).map(numeroDe);
    // Gardé le temps de la séance (pas dans le fichier) : le carnet prévient l'équipe une fois.
    Object.defineProperty(d, 'exercicesModifies', { value: changes, configurable: true, enumerable: false });
    return { ok: true, donnees: d, changes };
  }

  // Données déjà lues puis recopiées (ex. programme ouvert depuis l'outil du professeur) : la vue est reposée.
  function relierDonnees(d) {
    if (!Object.getOwnPropertyDescriptor(d, 'exercices') || Object.getOwnPropertyDescriptor(d, 'exercices').enumerable) relier(d);
    return d;
  }

  // Déblocage du parcours (règle de Labo Blocs : l'exercice suivant s'ouvre quand le précédent est réussi, un défi
  // s'ouvre après l'exercice qui le précède).
  function estDebloque(d, numero, options) {
    const id = idDe(numero);
    return !!id && LB.estDebloque(d, paquet(), id, options);
  }

  // Exercice à ouvrir en reprenant (numéro).
  function aReprendre(d) {
    return numeroDe(LB.exerciceAReprendre(d, paquet()));
  }

  // Avancement affiché : exercices obligatoires réussis (les défis ne comptent pas).
  function avancement(d) {
    return LB.avancement(d, paquet()).reussis;
  }

  // Écritures par numéro, pour les outils et les tests (en classe, c'est l'écran d'exercice de Labo Blocs qui écrit).
  const exerciceDuParcours = (numero) => paquet().exercices.find((x) => String(x.numero) === String(numero));
  const noterOuverture = (d, numero) => LB.noterOuverture(d, idDe(numero));
  const noterVerification = (d, numero, resultat) => LB.noterVerification(d, exerciceDuParcours(numero), resultat);
  const noterIndice = (d, numero, niveau) => LB.noterIndice(d, idDe(numero), niveau);
  const ajouterTemps = (d, numero, secondes) => LB.ajouterTemps(d, idDe(numero), secondes);

  const api = {
    APPLICATION,
    FORMAT,
    ORDRE_PARCOURS: ORDRE,
    nomEquipe,
    simplifierNom: simplifier,
    creerProgression: creer,
    lireSauvegarde: lire,
    relierDonnees,
    idExercice: idDe,
    numeroExercice: numeroDe,
    noterOuverture,
    noterVerification,
    noterIndice,
    ajouterTemps,
    estDebloque,
    exerciceAReprendre: aReprendre,
    avancement,
  };
  if (enNode) module.exports = api;
  else Object.assign((global.Atelier = global.Atelier || {}), api);
})(this);

// Note de l'équipe sur l'ensemble des exercices, d'après son travail (fichier de sauvegarde).
// Le barème est réglable (donnees/notation.js et panneau « Barème » de prof.html).
//
// Pour chaque exercice (coefficient selon sa difficulté) :
//   - réussi : 100 % des points, moins des retenues d'autonomie, calculées AVANT la première réussite :
//       indices ouverts (penaliteIndice chacun, au plus penaliteIndiceMax),
//       vérifications ratées au-delà des essais gratuits (penaliteEchec chacune, au plus penaliteEchecMax) ;
//   - commencé (au moins une vérification) mais pas réussi : « participation » % des points ;
//   - non commencé : 0.
// Note = sur × points obtenus / points possibles, + bonus par défi réussi, sans dépasser « sur ».
// Les exercices attendus (dans l'ordre) et les défis viennent du parcours ; les parties du carnet, de donnees/carnet.js
// (une partie propre à un autre niveau que celui de l'équipe ne compte pas).

(function (global) {
  'use strict';

  const enNode = typeof module === 'object' && module.exports;
  const catalogue = () => (enNode ? require('./catalogue.js').catalogue : global.Atelier.catalogue);
  const carnet = () => (enNode ? require('./catalogue.js').carnet : global.Atelier.carnet) || { parties: [] };
  const K = () => (enNode ? require('./carnet.js') : global.Atelier);
  // Exercices obligatoires (dans l'ordre du parcours) et défis, par numéro.
  const obligatoires = () => catalogue().exercices().filter((e) => !e.defi && !e.libre).map((e) => e.id);
  const defis = () => catalogue().exercices().filter((e) => e.defi).map((e) => e.id);

  const BAREME = {
    sur: 20,
    // Exercices attendus à ce moment du projet (les N premiers) : la note est calculée sur eux ;
    // ceux réussis au-delà rapportent leurs points en bonus. 0 = tout le parcours.
    objectif: 0,
    // Exercice réussi au-delà des exercices attendus : part de ses points ajoutée en bonus.
    // 0 par défaut, pour que l'avance ne masque pas les erreurs faites sur le travail attendu.
    avance: 0,
    // Coefficient de chaque exercice obligatoire (absent : 1).
    coefficients: {},
    // Points de bonus par défi réussi.
    bonusDefi: 1,
    participation: 0.2,
    penaliteIndice: 0.1,
    penaliteIndiceMax: 0.3,
    essaisGratuits: 0,
    penaliteEchec: 0.05,
    penaliteEchecMax: 0.25,
    arrondi: 0.5,
    // Parties du carnet notées (coefficient). Absent : les parties « note »: true de donnees/carnet.js, coefficient 1.
    carnet: null,
  };
  const partieDe = (id) => (carnet().parties || []).find((x) => x.id === id) || null;
  const nomPartie = (id) => 'Carnet · ' + (partieDe(id) ? partieDe(id).titre : id);
  const carnetParDefaut = () => Object.fromEntries((carnet().parties || []).filter((p) => p.note).map((p) => [p.id, 1]));

  function completer(bareme) {
    const b = Object.assign({}, BAREME, bareme || {});
    b.coefficients = Object.assign({}, BAREME.coefficients, (bareme && bareme.coefficients) || {});
    b.carnet = Object.assign({}, (bareme && bareme.carnet) || carnetParDefaut());
    if (!(b.objectif > 0)) b.objectif = obligatoires().length;
    // Coefficient 1 pour un exercice obligatoire absent du barème.
    for (const id of obligatoires()) if (!(id in b.coefficients)) b.coefficients[id] = 1;
    return b;
  }

  const pourcent = (x) => Math.round(x * 100) + ' %';

  // Indices et vérifications ratées avant la première réussite (ce qui s'est passé après ne compte pas).
  function avantReussite(e) {
    const histo = (e && e.historique) || [];
    let indices = 0;
    let echecs = 0;
    for (const h of histo) {
      if (h.type === 'verification' && h.reussi) break;
      if (h.type === 'indice') indices = Math.max(indices, h.niveau || indices + 1);
      if (h.type === 'verification') echecs++;
    }
    return { indices, echecs };
  }

  function noterExercice(e, b) {
    const statut = e ? e.statut : 'non_commence';
    if (statut === 'reussi') {
      const { indices, echecs } = avantReussite(e);
      const rIndices = Math.min(b.penaliteIndiceMax, indices * b.penaliteIndice);
      const rEchecs = Math.min(b.penaliteEchecMax, Math.max(0, echecs - b.essaisGratuits) * b.penaliteEchec);
      const raisons = [];
      if (rIndices > 0) raisons.push(`${indices} indice${indices > 1 ? 's' : ''} (−${pourcent(rIndices)})`);
      if (rEchecs > 0) raisons.push(`${echecs} essai${echecs > 1 ? 's' : ''} raté${echecs > 1 ? 's' : ''} avant la réussite (−${pourcent(rEchecs)})`);
      const parfait = indices === 0 && echecs === 0;
      if (!raisons.length) raisons.push(parfait ? '★ du premier coup, sans indice' : 'réussi en autonomie');
      return { fraction: Math.max(0, 1 - rIndices - rEchecs), raisons, parfait };
    }
    if (e && e.tentatives > 0) return { fraction: b.participation, raisons: [`commencé, pas encore réussi (${pourcent(b.participation)})`] };
    return { fraction: 0, raisons: [statut === 'en_cours' ? 'ouvert, jamais vérifié' : 'non commencé'] };
  }

  // Partie du carnet : d'après les vérifications gardées dans le fichier ({ date, reussi, bien, total }).
  function noterPartieCarnet(donnees, partie, b) {
    const v = ((donnees.carnet && donnees.carnet.verifications) || {})[partie] || [];
    const description = partieDe(partie);
    if (description && !['classement', 'trous'].includes(description.type)) {
      const niveau = donnees.evaluationsProf && donnees.evaluationsProf[partie];
      if (![1, 2, 3, 4].includes(niveau)) return { fraction: 0, raisons: ['à évaluer par le professeur (hors du total en attendant)'], attenteEvaluation: true };
      const mots = ['Non atteint', 'Partiellement atteint', 'Atteint', 'Dépassé'];
      return { fraction: niveau / 4, raisons: [mots[niveau - 1] + ' (' + niveau + '/4)'], manuel: true };
    }
    const premiere = v.findIndex((x) => x.reussi);
    if (premiere >= 0) {
      const echecs = premiere;
      const rEchecs = Math.min(b.penaliteEchecMax, Math.max(0, echecs - b.essaisGratuits) * b.penaliteEchec);
      const raisons = rEchecs > 0
        ? [`${echecs} vérification${echecs > 1 ? 's' : ''} ratée${echecs > 1 ? 's' : ''} avant la réussite (−${pourcent(rEchecs)})`]
        : [echecs === 0 ? '★ réussi du premier coup' : 'réussi'];
      return { fraction: 1 - rEchecs, raisons, parfait: echecs === 0 };
    }
    if (v.length) return { fraction: b.participation, raisons: [`commencé, pas encore réussi (${pourcent(b.participation)})`] };
    return { fraction: 0, raisons: ['non commencé'] };
  }

  function arrondir(x, pas) {
    return pas > 0 ? Math.round(x / pas) * pas : Math.round(x * 100) / 100;
  }

  // donnees : la sauvegarde d'une équipe → { note, sur, detail, bonus }
  function noter(donnees, bareme) {
    const b = completer(bareme);
    const detail = [];
    let obtenu = 0;
    let possible = 0;
    const ordre = obligatoires();
    const attendus = new Set(ordre.slice(0, Math.max(1, Math.min(ordre.length, Math.round(b.objectif) || ordre.length))));
    for (const id of ordre) {
      const coef = b.coefficients[id];
      if (!(coef > 0)) continue;
      const r = noterExercice(donnees.exercices[id], b);
      const attendu = attendus.has(id);
      // Au-delà de l'objectif : un exercice réussi rapporte seulement la part « avance » de ses points (0 par défaut).
      const enAvance = !attendu && donnees.exercices[id] && donnees.exercices[id].statut === 'reussi';
      const fraction = attendu ? r.fraction : enAvance ? r.fraction * b.avance : 0;
      const raisons = attendu
        ? r.raisons
        : enAvance
          ? [b.avance > 0 ? `réussi en avance : bonus (${pourcent(b.avance)})` : 'réussi en avance (ne compte pas dans la note)']
          : ['pas encore attendu'];
      detail.push({ id, coef, attendu, fraction, parfait: !!r.parfait, points: fraction * coef, raisons });
      obtenu += fraction * coef;
      if (attendu) possible += coef;
    }
    // Exercices du carnet : même principe (réussi = tous les points moins les vérifications ratées avant).
    const niveau = K().niveauDe(donnees.equipe && donnees.equipe.classe);
    for (const [partie, coef] of Object.entries(b.carnet)) {
      if (!(coef > 0)) continue;
      const p = partieDe(partie);
      if (!p || !K().pourNiveau(p, niveau)) continue;
      const r = noterPartieCarnet(donnees, partie, b);
      detail.push({ id: 'carnet:' + partie, carnet: true, partie, nom: nomPartie(partie), coef, attendu: !r.attenteEvaluation, ...r, points: r.fraction * coef });
      obtenu += r.fraction * coef;
      if (!r.attenteEvaluation) possible += coef;
    }
    const bonus = defis().filter((id) => (!b.defis || b.defis[id] !== false) && donnees.exercices[id] && donnees.exercices[id].statut === 'reussi').length * (b.bonusDefi || 0);
    const brute = possible ? (b.sur * obtenu) / possible : 0;
    const note = Math.min(b.sur, arrondir(brute + bonus, b.arrondi));
    // Points de chaque exercice ramenés sur la note (ex. 1,4 / 1,5 point).
    for (const d of detail) {
      d.pointsNote = possible ? (b.sur * d.points) / possible : 0;
      d.pointsNoteMax = possible && d.attendu ? (b.sur * d.coef) / possible : 0;
    }
    return { note, sur: b.sur, detail, bonus, brute };
  }

  const nombreFr = (x, decimales) => String(Math.round(x * 10 ** (decimales || 1)) / 10 ** (decimales || 1)).replace('.', ',');

  // Exercices réussis du premier coup et sans indice (pour les valoriser dans l'outil professeur).
  function premierCoup(donnees) {
    return Object.keys(donnees.exercices).filter((id) => {
      const e = donnees.exercices[id];
      if (!e || e.statut !== 'reussi') return false;
      const r = avantReussite(e);
      return r.indices === 0 && r.echecs === 0;
    });
  }

  const api = { BAREME_DEFAUT: BAREME, exercicesObligatoires: obligatoires, exercicesDefis: defis, completerBareme: completer, noterEquipe: noter, nombreFr, premierCoup };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.assign((global.Atelier = global.Atelier || {}), api);
})(this);

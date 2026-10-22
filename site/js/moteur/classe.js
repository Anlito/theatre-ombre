// Outil professeur : fusion des sauvegardes d'une classe, tableau récapitulatif, alertes, export CSV.
// Aucune donnée n'est envoyée ni stockée : tout est calculé dans le navigateur du professeur.

(function (global) {
  'use strict';

  const P = typeof module === 'object' && module.exports ? require('./progression.js') : global.Atelier;
  const N = typeof module === 'object' && module.exports ? require('./notation.js') : global.Atelier;

  const ORDRE = P.ORDRE_PARCOURS;
  // Nombre d'exercices obligatoires du parcours (les défis ne comptent pas dans l'avancement).
  const nObligatoires = () => N.exercicesObligatoires().length;
  const carnetDonnees = () => (typeof module === 'object' && module.exports ? require('./catalogue.js').carnet : global.Atelier.carnet) || { parties: [] };
  const SEUILS = { tentatives: 6, minutes: 10 };

  // fichiers : [{ nom, texte }] → { equipes, invalides }
  // Si une équipe a plusieurs fichiers, on garde le plus récent (modifieLe) et on le signale.
  function fusionner(fichiers) {
    const parCle = new Map();
    const invalides = [];
    for (const f of fichiers) {
      const r = P.lireSauvegarde(f.texte);
      if (!r.ok) {
        invalides.push({ nom: f.nom, raison: r.raison });
        continue;
      }
      const d = r.donnees;
      const cle = (d.equipe.classe || '') + '|' + P.simplifierNom(P.nomEquipe(d.equipe.eleves));
      const deja = parCle.get(cle);
      if (!deja) parCle.set(cle, { cle, donnees: d, fichier: f.nom, autres: [] });
      else if ((d.modifieLe || '') > (deja.donnees.modifieLe || '')) {
        deja.autres.push(deja.fichier);
        deja.donnees = d;
        deja.fichier = f.nom;
      } else deja.autres.push(f.nom);
    }
    return { equipes: [...parCle.values()], invalides };
  }

  function bloque(cellule, seuils) {
    const s = seuils || SEUILS;
    return cellule.statut !== 'reussi' && (cellule.tentatives >= s.tentatives || cellule.temps >= s.minutes * 60);
  }

  // Une ligne du tableau.
  function resumer(d, seuils) {
    const cellules = {};
    let tempsTotal = 0;
    for (const id of ORDRE) {
      const e = d.exercices[id];
      const c = e
        ? {
            statut: e.statut,
            tentatives: e.tentatives || 0,
            indices: e.indicesOuverts || 0,
            temps: e.tempsPasseSecondes || 0,
            premiereReussite: e.premiereReussite || null,
            echecs: (e.historique || []).filter((h) => h.type === 'verification' && !h.reussi).length,
          }
        : { statut: 'non_commence', tentatives: 0, indices: 0, temps: 0, premiereReussite: null, echecs: 0 };
      c.bloque = bloque(c, seuils);
      tempsTotal += c.temps;
      cellules[id] = c;
    }
    return {
      eleves: d.equipe.eleves,
      classe: d.equipe.classe || '',
      cellules,
      avancement: P.avancement(d),
      derniereActivite: d.modifieLe || '',
      tempsTotal,
      bloque: ORDRE.some((id) => cellules[id].bloque),
      premierCoup: N.premierCoup(d).length,
    };
  }

  // Alertes « bloqué » de la classe : une par équipe et par exercice non réussi qui dépasse un seuil.
  // equipes : sortie de fusionnerEquipes → [{ cle, equipe, classe, id, tentatives, temps, raison }]
  function alertes(equipes, seuils) {
    const s = seuils || SEUILS;
    const liste = [];
    for (const eq of equipes) {
      const r = resumer(eq.donnees, s);
      for (const id of ORDRE) {
        const c = r.cellules[id];
        if (!c.bloque) continue;
        const raisons = [];
        if (c.tentatives >= s.tentatives) raisons.push(`${c.tentatives} tentatives`);
        if (c.temps >= s.minutes * 60) raisons.push(`${duree(c.temps)} sur l’exercice`);
        liste.push({ cle: eq.cle + '|' + id, equipe: r.eleves.join(', '), classe: r.classe, id, tentatives: c.tentatives, temps: c.temps, raison: raisons.join(' et ') });
      }
    }
    return liste;
  }

  // Taux de réussite par exercice (part des équipes qui l'ont réussi).
  function tauxReussite(resumes) {
    const taux = {};
    for (const id of ORDRE) {
      const n = resumes.filter((r) => r.cellules[id].statut === 'reussi').length;
      taux[id] = resumes.length ? n / resumes.length : 0;
    }
    return taux;
  }

  function duree(secondes) {
    const m = Math.round(secondes / 60);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0');
  }

  function dateCourte(iso) {
    if (!iso) return '';
    const [jour, heure] = iso.split('T');
    const [a, mo, j] = jour.split('-');
    return `${j}/${mo}/${a} ${heure ? heure.slice(0, 5) : ''}`.trim();
  }

  const SYMBOLES = { reussi: '✓', en_cours: '●', non_commence: '○' };
  const MOTS = { reussi: 'réussi', en_cours: 'en cours', non_commence: 'non commencé' };

  function texteCellule(c) {
    if (c.statut === 'non_commence' && !c.tentatives) return SYMBOLES.non_commence;
    return `${SYMBOLES[c.statut]} ${c.tentatives}${c.bloque ? ' ⚠' : ''}`;
  }

  // Tableau récapitulatif (lignes de cellules texte), utilisé par le CSV et l'Excel.
  // Si les résumés portent une note (r.note, calculée par notation.js), une colonne « Note » est ajoutée.
  function tableau(resumes, seuils) {
    const avecNote = resumes.some((r) => r.note);
    const avecCarnet = resumes.some((r) => r.carnet !== undefined);
    const sur = avecNote ? resumes.find((r) => r.note).note.sur : 20;
    const entete = ['Classe', 'Équipe', ...ORDRE.map((id) => 'Ex. ' + id), 'Avancement', ...(avecCarnet ? ['Carnet'] : []), '★ 1er coup', ...(avecNote ? ['Note /' + sur] : []), 'Dernière activité', 'Temps total', 'Bloqué'];
    const lignes = resumes.map((r) => [
      r.classe,
      r.eleves.join(', '),
      ...ORDRE.map((id) => texteCellule(r.cellules[id])),
      `${r.avancement}/${nObligatoires()}`,
      ...(avecCarnet ? [r.carnet === undefined ? '' : `${r.carnet}/${r.carnetTotal}`] : []),
      r.premierCoup,
      ...(avecNote ? [r.note ? r.note.note : ''] : []),
      dateCourte(r.derniereActivite),
      duree(r.tempsTotal),
      r.bloque ? 'oui' : '',
    ]);
    const taux = tauxReussite(resumes);
    const notes = resumes.filter((r) => r.note).map((r) => r.note.note);
    const moyenne = notes.length ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10 : '';
    lignes.push(['', avecNote ? 'Taux de réussite · moyenne' : 'Taux de réussite', ...ORDRE.map((id) => Math.round(taux[id] * 100) + ' %'), '', ...(avecCarnet ? [''] : []), '', ...(avecNote ? [moyenne] : []), '', '', '']);
    const legende = [
      `✓ réussi, ● en cours, ○ non commencé ; le nombre est celui des tentatives (clics sur « Vérifier »). ` +
        `★ 1er coup : exercices réussis du premier coup et sans indice. ` +
        `⚠ bloqué : au moins ${(seuils || SEUILS).tentatives} tentatives ou plus de ${(seuils || SEUILS).minutes} min sur un exercice non réussi.`,
    ];
    return { entete, lignes, legende };
  }

  // Détail : une ligne par équipe et par exercice commencé (pour la notation).
  // Avec un barème, on ajoute les points obtenus sur la note et le détail des retenues.
  function detail(equipes, seuils, bareme) {
    const entete = [
      'Classe', 'Équipe', 'Exercice', 'Statut', 'Tentatives', 'Échecs avant réussite', 'Indices ouverts',
      'Temps (min)', 'Première réussite', 'Bloqué', 'Dernier écart signalé',
      ...(bareme ? ['Points', 'Points possibles', 'Calcul'] : []),
    ];
    const lignes = [];
    for (const eq of equipes) {
      const d = eq.donnees;
      const r = resumer(d, seuils);
      const note = bareme ? N.noterEquipe(d, bareme) : null;
      for (const id of ORDRE) {
        const e = d.exercices[id];
        if (!e) continue;
        const c = r.cellules[id];
        const histo = e.historique || [];
        const premiere = histo.findIndex((h) => h.type === 'verification' && h.reussi);
        const echecsAvant = histo.slice(0, premiere < 0 ? histo.length : premiere).filter((h) => h.type === 'verification' && !h.reussi).length;
        const dernierEchec = [...histo].reverse().find((h) => h.type === 'verification' && !h.reussi);
        lignes.push([
          r.classe, r.eleves.join(', '), id, MOTS[c.statut], c.tentatives, echecsAvant, c.indices,
          Math.round(c.temps / 60), dateCourte(c.premiereReussite), c.bloque ? 'oui' : '', dernierEchec ? dernierEchec.message : '',
          ...(note ? pointsExercice(note, id) : []),
        ]);
      }
    }
    // Parties du carnet de projet vérifiées (« Vérifier ») : une ligne chacune.
    const NOMS = Object.fromEntries((carnetDonnees().parties || []).filter((p) => ['classement', 'trous'].includes(p.type)).map((p) => [p.id, 'Carnet · ' + p.titre]));
    for (const eq of equipes) {
      const d = eq.donnees;
      const v = (d.carnet && d.carnet.verifications) || {};
      const note = bareme ? N.noterEquipe(d, bareme) : null;
      for (const p of Object.keys(NOMS)) {
        const liste = v[p] || [];
        if (!liste.length) continue;
        const premiere = liste.findIndex((x) => x.reussi);
        const x = note && note.detail.find((y) => y.id === 'carnet:' + p);
        const arr = (n) => Math.round(n * 100) / 100;
        lignes.push([
          d.equipe.classe || '', d.equipe.eleves.join(', '), NOMS[p], premiere >= 0 ? 'réussi' : 'en cours', liste.length,
          premiere >= 0 ? premiere : liste.length, '', '', premiere >= 0 ? dateCourte(liste[premiere].date) : '', '', '',
          ...(note ? (x ? [arr(x.pointsNote), arr(x.pointsNoteMax), x.raisons.join(' ; ')] : ['', '', 'non noté']) : []),
        ]);
      }
    }
    return { entete, lignes };
  }

  function pointsExercice(note, id) {
    const x = note.detail.find((y) => y.id === id);
    if (!x) return ['', '', N.exercicesDefis().includes(id) ? (note.bonus ? `défi : bonus +${note.bonus}` : 'défi : bonus si réussi') : 'ne compte pas'];
    const arr = (v) => Math.round(v * 100) / 100;
    return [arr(x.pointsNote), arr(x.pointsNoteMax), x.raisons.join(' ; ')];
  }

  // CSV pour Excel en français : séparateur point-virgule, UTF-8 avec BOM.
  function csv(entete, lignes) {
    const champ = (v) => {
      const s = String(v === null || v === undefined ? '' : v);
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '﻿' + [entete, ...lignes].map((l) => l.map(champ).join(';')).join('\r\n') + '\r\n';
  }

  const api = { SEUILS, fusionnerEquipes: fusionner, resumerEquipe: resumer, alertesClasse: alertes, tauxReussite, tableauClasse: tableau, detailClasse: detail, enCsv: csv, dureeLisible: duree, dateCourte, SYMBOLES, MOTS_STATUT: MOTS, estBloque: bloque };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.assign((global.Atelier = global.Atelier || {}), api);
})(this);

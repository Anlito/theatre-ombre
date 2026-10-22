// Évaluations réservées au professeur : conservation locale et sauvegarde explicite (modèle commun).
// En plus du modèle : bonus / malus de chaque élève (avec son motif) et commentaire de l'équipe, comme dans
// l'ancien outil professeur du Théâtre, dont les évaluations sont reprises une fois (base « theatre-ombre-prof »).
(function (global) {
  'use strict';
  const A = global.Atelier, cle = A.projet.id + '-evaluations-prof-v1';
  const FORMAT = 'theatre-ombre/evaluations-prof';
  const interdit = (o) => Object.keys(o).some((k) => ['__proto__', 'constructor', 'prototype'].includes(k));
  const objet = (o) => !!o && typeof o === 'object' && !Array.isArray(o) && !interdit(o);
  function valide(lu) {
    if (!lu || lu.format !== FORMAT || lu.version !== 1 || !objet(lu.notes)) return false;
    for (const notes of Object.values(lu.notes)) if (!objet(notes) || Object.values(notes).some((n) => ![1, 2, 3, 4].includes(n))) return false;
    for (const k of ['bonus', 'motifs', 'commentaires']) if (lu[k] !== undefined && !objet(lu[k])) return false;
    for (const b of Object.values(lu.bonus || {})) if (!objet(b) || Object.values(b).some((v) => !Number.isFinite(v) || v < -20 || v > 20)) return false;
    for (const m of Object.values(lu.motifs || {})) if (!objet(m) || Object.values(m).some((v) => typeof v !== 'string')) return false;
    if (Object.values(lu.commentaires || {}).some((v) => typeof v !== 'string')) return false;
    const b = lu.bareme;
    if (b === null) return true;
    if (!b || typeof b !== 'object' || !(b.sur >= 1 && b.sur <= 100) || !Number.isInteger(b.objectif) || b.objectif < 0 || b.objectif > 20 || ![0, 0.25, 0.5, 1].includes(b.arrondi)) return false;
    for (const k of ['participation', 'avance', 'penaliteIndice', 'penaliteIndiceMax', 'penaliteEchec', 'penaliteEchecMax']) if (!Number.isFinite(b[k]) || b[k] < 0 || b[k] > 1) return false;
    if (!Number.isInteger(b.essaisGratuits) || b.essaisGratuits < 0 || b.essaisGratuits > 50 || !Number.isFinite(b.bonusDefi) || b.bonusDefi < 0 || b.bonusDefi > 20) return false;
    for (const k of ['coefficients', 'carnet']) if (!objet(b[k]) || Object.values(b[k]).some((n) => !Number.isFinite(n) || n < 0 || n > 10)) return false;
    if (b.defis && (!objet(b.defis) || Object.values(b.defis).some((v) => typeof v !== 'boolean'))) return false;
    return true;
  }
  const vide = () => ({ format: FORMAT, version: 1, bareme: null, notes: {}, bonus: {}, motifs: {}, commentaires: {} });
  let etat = vide();
  let dejaEnregistre = false;
  try {
    const lu = JSON.parse(localStorage.getItem(cle));
    if (valide(lu)) {
      etat = Object.assign(vide(), lu);
      dejaEnregistre = true;
    }
  } catch { /* première utilisation */ }
  const identite = (d) => JSON.stringify([d.equipe.classe || '', [...d.equipe.eleves].sort()]);
  function sauver() { try { localStorage.setItem(cle, JSON.stringify(etat)); return true; } catch { return false; } }
  const section = (nom, d) => (etat[nom][identite(d)] = etat[nom][identite(d)] || {});

  A.notesProf = {
    bareme: () => etat.bareme,
    regler: (b) => { etat.bareme = JSON.parse(JSON.stringify(b)); return sauver(); },
    pour: (d) => etat.notes[identite(d)] || {},
    noter(d, id, niveau) {
      const n = section('notes', d);
      if (niveau === '') delete n[id];
      else if ([1, 2, 3, 4].includes(Number(niveau))) n[id] = Number(niveau);
      return sauver();
    },
    // Bonus / malus d'un élève (en points, par demi-points), et son motif.
    bonus: (d, eleve) => (etat.bonus[identite(d)] || {})[eleve] || 0,
    motif: (d, eleve) => (etat.motifs[identite(d)] || {})[eleve] || '',
    regleBonus(d, eleve, valeur) {
      const b = section('bonus', d);
      const v = Math.max(-20, Math.min(20, Math.round(Number(valeur) * 2) / 2));
      if (Number.isFinite(v) && v) b[eleve] = v;
      else delete b[eleve];
      return sauver();
    },
    regleMotif(d, eleve, texte) {
      const m = section('motifs', d);
      if (String(texte).trim()) m[eleve] = String(texte).slice(0, 200);
      else delete m[eleve];
      return sauver();
    },
    commentaire: (d) => etat.commentaires[identite(d)] || '',
    regleCommentaire(d, texte) {
      if (String(texte).trim()) etat.commentaires[identite(d)] = String(texte).slice(0, 2000);
      else delete etat.commentaires[identite(d)];
      return sauver();
    },
    texte: () => JSON.stringify(etat, null, 2),
    importer(texte) {
      const lu = JSON.parse(texte);
      if (!valide(lu)) throw new Error('Cette sauvegarde des évaluations est invalide. Rien n’a été modifié.');
      for (const k of ['notes', 'bonus', 'motifs']) {
        const tout = Object.assign(Object.create(null), etat[k]);
        for (const [id, valeurs] of Object.entries(lu[k] || {})) tout[id] = Object.assign(Object.create(null), tout[id], valeurs);
        etat[k] = tout;
      }
      etat.commentaires = Object.assign({}, etat.commentaires, lu.commentaires || {});
      if (lu.bareme) etat.bareme = lu.bareme;
      return sauver();
    },
  };

  // Reprise de l'ancien outil professeur du Théâtre (classeurs D1–D7 par classe, base IndexedDB) : une seule fois,
  // tant que rien n'a été enregistré avec le nouvel outil. Les validations ◆, elles, sont dans validations.json.
  A.notesProf.reprendreAncien = () =>
    new Promise((ok) => {
      if (dejaEnregistre || !global.indexedDB) return ok(0);
      let r;
      try { r = indexedDB.open('theatre-ombre-prof'); } catch { return ok(0); }
      r.onerror = () => ok(0);
      r.onupgradeneeded = () => r.transaction.abort(); // pas d'ancienne base : on ne la crée pas
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('classeurs')) { db.close(); return ok(0); }
        const g = db.transaction('classeurs').objectStore('classeurs').getAll();
        g.onerror = () => { db.close(); ok(0); };
        g.onsuccess = () => {
          db.close();
          let n = 0;
          for (const c of g.result || []) {
            for (const eq of Object.values((c && c.equipes) || {})) {
              if (!eq || !Array.isArray(eq.eleves) || !eq.eleves.length) continue;
              const d = { equipe: { classe: String(c.classe || '').toUpperCase(), eleves: eq.eleves.map(String) } };
              for (const [id, v] of Object.entries(eq.niveaux || {})) if (/^D[1-7]$/.test(id) && [1, 2, 3, 4].includes(v)) section('notes', d)[id] = v;
              for (const [el, v] of Object.entries(eq.bonus || {})) if (Number.isFinite(v) && v) section('bonus', d)[el] = v;
              for (const [el, v] of Object.entries(eq.motifs || {})) if (typeof v === 'string' && v.trim()) section('motifs', d)[el] = v.slice(0, 200);
              if (typeof eq.commentaire === 'string' && eq.commentaire.trim()) etat.commentaires[identite(d)] = eq.commentaire.slice(0, 2000);
              n++;
            }
          }
          if (n) { sauver(); dejaEnregistre = true; }
          ok(n);
        };
      };
    });
})(this);

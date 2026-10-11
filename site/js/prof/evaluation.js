// Évaluation d'une classe (outil professeur) : la grille « notation_theatre_ombre.xlsx ».
//   - 7 livrables (D1 à D7), chacun noté sur 4 niveaux : Non atteint · En cours · Atteint · Dépassé ;
//   - note de l'équipe /20 = moyenne des niveaux × 5 ; mention ;
//   - pour chaque élève : bonus / malus (avec son motif) -> note finale ;
//   - validations ◆ du carnet (données ici, écrites dans le dossier de l'équipe : validations.json).
// Tout reste sur l'ordinateur du professeur. Ce fichier ne touche pas à la page : il sert à l'outil ET aux tests.

export const FORMAT = 'theatre-ombre-prof';
export const VERSION = 1;

export const NIVEAUX = [
  { v: 1, t: 'Non atteint', couleur: 'Rouge', pronote: 'Non atteint' },
  { v: 2, t: 'En cours', couleur: 'Jaune', pronote: 'Partiellement atteint' },
  { v: 3, t: 'Atteint', couleur: 'Vert clair', pronote: 'Atteint' },
  { v: 4, t: 'Dépassé', couleur: 'Vert foncé', pronote: 'Dépassé' },
];
export const niveau = (v) => NIVEAUX.find((n) => n.v === v) ?? null;

// Livrables et compétences (BO n°9 du 29 février 2024), repris de l'onglet « Compétences Pronote ».
export function livrablesParDefaut() {
  return [
    { id: 'D1', t: 'Dessins des personnages', competence: 'Concevoir et réaliser en réponse à un besoin', pronote: 'Concevoir, réaliser, valider un OST', theme: 'Thème 3' },
    { id: 'D2', t: 'Fichiers STL — Modélisation 3D', competence: 'Réaliser, fabriquer, mettre en service un OST', pronote: 'Concevoir, réaliser, valider un OST', theme: 'Thème 3' },
    { id: 'D3', t: 'Câblage Arduino + LED', competence: 'Analyser le comportement d’un OST — chaîne d’énergie', pronote: 'Analyser le fonctionnement et le comportement d’un OST', theme: 'Thème 2' },
    { id: 'D4', t: 'Programme + IA (site)', competence: 'Programmer et faire interagir un système automatisé', pronote: 'Analyser le fonctionnement et le comportement d’un OST', theme: 'Thème 2 · Pensée informatique' },
    { id: 'D5', t: 'Carnet de projet', competence: 'Décrire les interactions entre un OST et son environnement', pronote: 'Décrire les interactions entre un OST, son environnement et ses utilisateurs', theme: 'Thème 1' },
    { id: 'D6', t: 'Présentation orale', competence: 'Communiquer les résultats d’une démarche de projet', pronote: 'Concevoir, réaliser, valider un OST', theme: 'Thèmes 1-2-3 · Démarche de projet' },
    { id: 'D7', t: 'Investissement du groupe', competence: 'S’impliquer dans une démarche collaborative de projet', pronote: 'Concevoir, réaliser, valider un OST', theme: 'Transversale · Démarche de projet' },
  ];
}

export function nouveauClasseur(classe = '') {
  return { format: FORMAT, version: VERSION, classe, livrables: livrablesParDefaut(), equipes: {}, maj: Date.now() };
}

export function nouvelleEquipe(eleves = []) {
  return { eleves: [...eleves], niveaux: {}, commentaire: '', bonus: {}, motifs: {}, validations: {} };
}

// Équipe d'un classeur (créée au besoin) ; les élèves lus dans le projet complètent la liste.
export function equipe(classeur, dossier, eleves = []) {
  const eq = (classeur.equipes[dossier] ??= nouvelleEquipe(eleves));
  for (const e of eleves) if (!eq.eleves.includes(e)) eq.eleves.push(e);
  return eq;
}

export function estClasseur(x) {
  return !!x && x.format === FORMAT && typeof x.equipes === 'object' && Array.isArray(x.livrables);
}

// Nettoie un classeur importé (fichier de sauvegarde).
export function normaliserClasseur(x) {
  if (!estClasseur(x)) return null;
  const c = nouveauClasseur(String(x.classe ?? ''));
  const parId = Object.fromEntries(x.livrables.map((l) => [l.id, l]));
  c.livrables = c.livrables.map((l) => ({ ...l, t: typeof parId[l.id]?.t === 'string' && parId[l.id].t.trim() ? parId[l.id].t.slice(0, 80) : l.t }));
  for (const [dossier, e] of Object.entries(x.equipes)) {
    const eq = nouvelleEquipe(Array.isArray(e?.eleves) ? e.eleves.map(String) : []);
    for (const [id, v] of Object.entries(e?.niveaux ?? {})) if (niveau(Number(v))) eq.niveaux[id] = Number(v);
    eq.commentaire = typeof e?.commentaire === 'string' ? e.commentaire.slice(0, 2000) : '';
    for (const [el, b] of Object.entries(e?.bonus ?? {})) if (Number.isFinite(Number(b)) && Number(b)) eq.bonus[el] = Number(b);
    for (const [el, m] of Object.entries(e?.motifs ?? {})) if (typeof m === 'string' && m.trim()) eq.motifs[el] = m.slice(0, 200);
    for (const [id, v] of Object.entries(e?.validations ?? {})) if (Number.isFinite(Number(v?.date))) eq.validations[id] = { date: Number(v.date) };
    c.equipes[dossier] = eq;
  }
  c.maj = Number(x.maj) || Date.now();
  return c;
}

// --- Notes ------------------------------------------------------------------------------------
const arrondi = (x) => Math.round(x * 10) / 10;

// Note /20 de l'équipe : moyenne des livrables notés × 5 (null si rien n'est noté).
export function noteEquipe(classeur, eq) {
  const vals = classeur.livrables.map((l) => eq.niveaux[l.id]).filter((v) => niveau(v));
  if (!vals.length) return null;
  return arrondi((vals.reduce((a, b) => a + b, 0) / vals.length) * 5);
}

export function mention(note) {
  if (note === null || note === undefined) return '';
  if (note < 10) return 'À approfondir';
  if (note < 13) return 'Satisfaisant';
  if (note < 17) return 'Bien';
  return 'Très bien';
}

// Note d'un élève : note de l'équipe + son bonus / malus, entre 0 et 20.
export function noteEleve(classeur, eq, eleve) {
  const note = noteEquipe(classeur, eq);
  const bonus = eq.bonus[eleve] ?? 0;
  const finale = note === null ? null : arrondi(Math.max(0, Math.min(20, note + bonus)));
  return { note, bonus, motif: eq.motifs[eleve] ?? '', finale, mention: mention(finale) };
}

export function progression(classeur, eq) {
  return { faits: classeur.livrables.filter((l) => niveau(eq.niveaux[l.id])).length, total: classeur.livrables.length };
}

// --- Fichier validations.json déposé dans le dossier de l'équipe ----------------------------------
export function fichierValidations(eq) {
  return { format: 'theatre-ombre-validations', version: 1, maj: Date.now(), validations: { ...eq.validations } };
}

// --- Export pour Excel / Pronote ----------------------------------------------------------------
const fr = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
const cell = (s) => (/[;"\n\r]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s));

// CSV (séparateur « ; », virgule décimale, UTF-8 avec BOM) : une ligne par élève.
// Les niveaux sont écrits comme dans Pronote (Non atteint, Partiellement atteint, Atteint, Dépassé).
export function exportCsv(classeur) {
  const L = classeur.livrables;
  const rows = [
    ['Classe', 'Équipe', 'Élève', ...L.map((l) => `${l.id} ${l.t}`), 'Note équipe /20', 'Bonus / malus', 'Motif', 'Note finale /20', 'Mention', 'Commentaire'],
  ];
  const dossiers = Object.keys(classeur.equipes).sort((a, b) => a.localeCompare(b, 'fr'));
  for (const d of dossiers) {
    const eq = classeur.equipes[d];
    for (const el of eq.eleves) {
      const n = noteEleve(classeur, eq, el);
      rows.push([
        classeur.classe, d, el,
        ...L.map((l) => niveau(eq.niveaux[l.id])?.pronote ?? ''),
        fr(n.note), n.bonus ? (n.bonus > 0 ? '+' : '') + fr(n.bonus) : '', n.motif, fr(n.finale), n.mention, eq.commentaire,
      ]);
    }
  }
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

// Réglages du collège, communs à tous les outils de la classe (Labo Blocs, atelier du distributeur, projets…) :
// la liste des classes et le chemin des dossiers de classe sur le réseau. Un seul fichier, modifié par le professeur
// dans l'accueil de Labo Blocs (« Réglages du collège ») : https://anlito.github.io/labo-blocs/site/college.js
//
//   definirCollege({ format: 'labo-blocs/college', version: 1, classes: ['5A', '4B', …],
//                    cheminClasse: ['Bureau', 'Classe', '{classe}', 'COMMUN', 'TECHNOLOGIE'] })
//
// Chaque outil garde une copie de secours (son propre college.js, lu en premier : hors ligne, c'est elle qui sert),
// puis lit la version en ligne si internet répond (rien n'est envoyé : simple lecture du fichier).
// Un projet dit seulement ses niveaux (niveaux: ['5']) et la fin de son chemin (cheminProjet: ['DISTRIBUTEUR DE CEREALES']).
(function (global) {
  'use strict';

  const A = (global.LaboBlocs = global.LaboBlocs || {});
  const FORMAT = 'labo-blocs/college';
  const ADRESSE = 'https://anlito.github.io/labo-blocs/site/college.js';
  const CHEMIN_CLASSE_DEFAUT = ['{classe}'];
  const EVENEMENT = 'labo-blocs:college';

  // Appelé par college.js (la copie de secours, puis la version en ligne) : la dernière lue compte.
  global.definirCollege = (c) => {
    if (!c || !Array.isArray(c.classes)) return;
    const avant = A.college ? JSON.stringify(A.college) : '';
    A.college = c;
    if (avant !== JSON.stringify(c) && global.document && global.CustomEvent) global.document.dispatchEvent(new global.CustomEvent(EVENEMENT, { detail: c }));
  };

  // Lit la version en ligne (si internet répond), sans jamais bloquer la page ni garder une ancienne copie.
  function chargerCollegeEnLigne(adresse) {
    const doc = global.document;
    if (!doc) return;
    const s = doc.createElement('script');
    s.src = (adresse || ADRESSE) + '?t=' + Date.now();
    s.async = true;
    s.onerror = () => s.remove(); // hors ligne : la copie de secours reste
    (doc.head || doc.documentElement).appendChild(s);
  }

  // « 5A » → '5' ; « 4e B » → '4' ; « SEGPA » → ''
  const niveauDe = (classe) => (String(classe).match(/\d/) || [''])[0];

  // Classes d'un projet : celles du collège de ses niveaux (tous les niveaux si le projet n'en dit rien).
  function classesDuCollege(college, niveaux) {
    const n = (niveaux || []).map((x) => niveauDe(x)).filter(Boolean);
    return (college.classes || []).filter((c) => !n.length || n.includes(niveauDe(c)));
  }

  // Réglages d'un projet complétés par ceux du collège :
  //   projet.cheminProjet (fin du chemin, ex. ['DISTRIBUTEUR DE CEREALES']) → cheminClasse + cheminProjet + {equipe}
  //   projet.niveaux → classes du collège de ces niveaux.
  // Des classes ou un chemin écrits dans le projet lui-même restent prioritaires (anciens réglages).
  function projetAvecCollege(projet, college) {
    const c = college || A.college;
    if (!projet || !c) return projet;
    const r = Object.assign({}, projet);
    if (!projet.classes || !projet.classes.length) r.classes = classesDuCollege(c, projet.niveaux);
    if (!projet.cheminSauvegarde && projet.cheminProjet) r.cheminSauvegarde = (c.cheminClasse || CHEMIN_CLASSE_DEFAUT).concat(projet.cheminProjet, ['{equipe}']);
    return r;
  }

  // Liste tapée par le professeur (« 5A, 5B » ou une par ligne) → classes sans doublon, dans l'ordre.
  function lireListeClasses(texte) {
    const vues = new Set();
    return String(texte || '')
      .split(/[\n,;]+/)
      .map((x) => x.trim().replace(/\s+/g, ' '))
      .filter((x) => x && !vues.has(x.toLowerCase()) && vues.add(x.toLowerCase()));
  }

  // Chemin tapé (« Bureau › Classe › {classe} › COMMUN ») → morceaux ; {classe} doit y être.
  function lireCheminClasse(texte) {
    const morceaux = String(texte || '')
      .split(/[›/\\>]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!morceaux.includes('{classe}')) return { ok: false, message: 'Le chemin doit contenir {classe} (le dossier de la classe).' };
    if (morceaux.includes('{equipe}')) return { ok: false, message: 'Le chemin s’arrête au dossier des projets de la classe : sans {equipe}.' };
    return { ok: true, chemin: morceaux };
  }

  function scriptCollege(c) {
    const donnees = { format: FORMAT, version: 1, classes: c.classes, cheminClasse: c.cheminClasse, modifieLe: c.modifieLe || new Date().toISOString().slice(0, 10) };
    return (
      '// Réglages du collège, communs à tous les outils : liste des classes et chemin des dossiers de classe.\n' +
      '// Modifié dans l’accueil de Labo Blocs (« Réglages du collège »). Chaque outil en garde une copie de secours.\n' +
      `definirCollege(${JSON.stringify(donnees, null, 2)});\n`
    );
  }

  const api = { FORMAT_COLLEGE: FORMAT, ADRESSE_COLLEGE: ADRESSE, EVENEMENT_COLLEGE: EVENEMENT, chargerCollegeEnLigne, classesDuCollege, projetAvecCollege, lireListeClasses, lireCheminClasse, scriptCollege, niveauDe };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.assign(A, api);
})(this);

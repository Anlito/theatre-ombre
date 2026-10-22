// Catalogue des exercices. Les exercices viennent de Labo Blocs : le parcours du projet (fichier
// site/parcours/<id>.js, definirParcours({...}), id dans donnees/projet.js) est la seule source. Il se met à jour depuis l'outil du
// professeur (« Mettre à jour les exercices »). Les autres données du projet (lexique, fiches, carnet, classes,
// barème…) sont des scripts definirXxx({...}) de site/donnees/, lisibles en ouvrant index.html depuis un dossier.
//
// Pour le carnet, l'outil du professeur et le tutoriel, un exercice garde son numéro comme identifiant (« 1 » …
// « 8 ») ; idParcours est l'identifiant stable du parcours (« lab-01 » …), celui des sauvegardes.
// L'identité du projet (donnees/projet.js, definirProjetAtelier) est lue par tous les autres fichiers : Atelier.projet.

(function (global) {
  'use strict';

  const enNode = typeof module === 'object' && module.exports;
  const LB = enNode ? require(require('../../../tools/dependances-tests.js').noyau) : global.LaboBlocs;

  function creerCatalogue() {
    let paquet = null;
    const ordre = []; // numéros dans l'ordre du parcours (« 1 » … « 8 »), tenu à jour sur place
    return {
      // Parcours brut (definirParcours) : préparé (paramètres remplacés, empreintes).
      definirParcours(brut) {
        paquet = LB.preparer(brut);
        paquet.brut = brut;
        ordre.splice(0, ordre.length, ...paquet.exercices.map((e) => String(e.numero)));
      },
      ordre,
      paquet: () => paquet,
      parametres: () => (paquet ? paquet.parametres : {}),
      // Exercices dans l'ordre du parcours, au format de l'atelier (id = numéro).
      exercices() {
        if (!paquet) return [];
        return paquet.exercices.map((e) => Object.assign({}, e, { id: String(e.numero), idParcours: e.id }));
      },
    };
  }

  // Sous Node (tests, outils) : lit l'identité du projet (donnees/projet.js).
  function chargerProjet() {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const path = require('node:path');
    let projet = null;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', '..', 'donnees', 'projet.js'), 'utf8'), {
      definirProjetAtelier: (p) => (projet = JSON.parse(JSON.stringify(p))),
    });
    return projet;
  }

  // Sous Node (tests, outils) : lit un fichier de données du site (donnees/<nom>.js, definirXxx({...})).
  function chargerDonnees(nom, fonction) {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const path = require('node:path');
    let x = null;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', '..', 'donnees', nom + '.js'), 'utf8'), { [fonction]: (v) => (x = JSON.parse(JSON.stringify(v))) });
    return x;
  }

  // Sous Node (tests, outils) : lit le parcours du site sans navigateur.
  function chargerParcours(chemin) {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const path = require('node:path');
    const c = creerCatalogue();
    // Copie JSON : des objets de ce contexte (et non de celui du script).
    vm.runInNewContext(fs.readFileSync(chemin || require('../../../tools/dependances-tests.js').parcours, 'utf8'), {
      definirParcours: (p) => c.definirParcours(JSON.parse(JSON.stringify(p))),
    });
    return c;
  }

  const api = { creerCatalogue };
  if (enNode) {
    api.chargerParcours = chargerParcours;
    api.chargerDonnees = chargerDonnees;
    api.chargerProjet = chargerProjet;
    let donneesCarnet = null;
    Object.defineProperty(api, 'carnet', { get: () => (donneesCarnet = donneesCarnet || chargerDonnees('carnet', 'definirCarnet')) });
    let projet = null;
    Object.defineProperty(api, 'projet', { get: () => (projet = projet || chargerProjet()) });
    let defaut = null;
    // Catalogue du site, chargé à la première demande.
    Object.defineProperty(api, 'catalogue', { get: () => (defaut = defaut || chargerParcours()) });
    module.exports = api;
  } else {
    const Atelier = (global.Atelier = global.Atelier || {});
    Object.assign(Atelier, api);
    Atelier.catalogue = creerCatalogue();
    // Le parcours de Labo Blocs appelle definirParcours (le premier défini est celui du projet).
    const definirLabo = global.definirParcours;
    global.definirParcours = (p) => {
      if (!Atelier.catalogue.paquet()) Atelier.catalogue.definirParcours(p);
      if (definirLabo) definirLabo(p);
    };
    global.definirProjetAtelier = (projet) => (Atelier.projet = projet);
    global.definirLexique = (liste) => (Atelier.lexique = liste);
    global.definirClasses = (liste) => (Atelier.classes = liste);
    global.definirFiches = (fiches) => (Atelier.fiches = fiches);
    global.definirCarnet = (carnet) => (Atelier.carnet = carnet);
    global.definirBareme = (bareme) => (Atelier.bareme = bareme);
    global.definirCheminSauvegarde = (chemin) => (Atelier.cheminSauvegarde = chemin);
    // Réglages du projet complétés par ceux du collège (Labo Blocs, « Réglages du collège ») :
    // niveaux → classes du collège ; cheminProjet → chemin de la classe + cheminProjet + {equipe}.
    // Recalculés quand la version en ligne des réglages du collège arrive.
    global.definirReglagesAtelier = (reglages) => {
      const L = global.LaboBlocs || {};
      const appliquer = () => {
        const r = L.projetAvecCollege ? L.projetAvecCollege(reglages) : reglages;
        if (r.classes && r.classes.length) Atelier.classes = r.classes;
        if (r.cheminSauvegarde) Atelier.cheminSauvegarde = r.cheminSauvegarde;
        if (Atelier.surCollege) Atelier.surCollege();
      };
      appliquer();
      if (global.document) global.document.addEventListener(L.EVENEMENT_COLLEGE || 'labo-blocs:college', appliquer);
    };
    global.definirComposantsTuto = (liste) => (Atelier.composantsTuto = liste);
  }
})(this);

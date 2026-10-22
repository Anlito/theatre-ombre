// Outil professeur (prof.html) : ce qui est propre au Théâtre, pour les scripts classiques du modèle commun.
// Ce module est chargé avant eux et pose window.TheatreProf : règles du carnet, affichage du carnet en lecture,
// lecture des projets, indices pour noter, contrôle et vue 3D des fichiers STL, validations ◆.

import * as carnet from './carnet.js';
import { ETAPES, VALIDATIONS } from './carnet-contenu.js';
import { renderCarnet } from './ui/carnet-vue.js';
import { parse } from './project.js';
import { indices } from './prof/indices.js';
import { analyserStl, controlerStl } from './prof/stl.js';
import { LED_COLORS, normalizeLedColors } from './led-colors.js';
import { normalizeValidations, VALIDATIONS_FILE } from './team-folder.js';

// Projet du Théâtre (personnages, carnet, programmation…) d'après le fichier d'origine d'une équipe.
function projetDe(fichier) {
  const r = parse(fichier || {});
  return r.ok ? r.project : null;
}

// Carnet de l'équipe en lecture seule, avec ce que le site sait du projet (personnages, couleurs des LED).
function afficherCarnet(racine, { projet, validations }) {
  const pins = projet.settings.ledPins;
  const couleurs = normalizeLedColors(projet.ledColors, pins);
  const camera = projet.programmation?.camera;
  // Personnages : ceux de Labo Blocs (étiquettes de la caméra), sinon ceux de l'ancien écran Entraîner.
  const personnages = camera?.etiquettes?.length
    ? camera.etiquettes.map((nom) => ({ id: nom, name: nom, photos: camera.exemples?.[nom]?.length ?? 0 }))
    : projet.categories.filter((c) => !c.background).map((c) => ({ id: c.id, name: c.name, photos: c.examples.length }));
  return renderCarnet(racine, {
    carnet: projet.carnet,
    team: projet.team,
    readOnly: true,
    validations,
    live: { characters: personnages, ledPins: pins, ledColor: (pin) => couleurs[pin] ?? null, reconnus: new Set(projet.carnet.auto.reconnus) },
  });
}

// Fichier validations.json écrit dans le dossier de l'équipe (lu par le carnet des élèves).
const fichierValidations = (validations) => ({ format: 'theatre-ombre-validations', version: 1, maj: Date.now(), validations });

window.TheatreProf = {
  carnet,
  ETAPES,
  VALIDATIONS,
  VALIDATIONS_FILE,
  projetDe,
  afficherCarnet,
  indices,
  analyserStl,
  controlerStl,
  vueStl: async (...args) => (await import('./prof/stl-vue.js')).vueStl(...args),
  LED_COLORS,
  normalizeValidations,
  fichierValidations,
};

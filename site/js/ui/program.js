// Adaptateur : toute la programmation est publiée et maintenue dans Labo Blocs.
import { icon } from '../icons.js';
import { fileName } from '../project.js';

export function setupProgramScreen(options) {
  if (!globalThis.LaboTheatre?.setupProgramScreen) throw new Error('La programmation Labo Blocs est indisponible.');
  return globalThis.LaboTheatre.setupProgramScreen({ ...options, icon, fileName });
}

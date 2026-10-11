// Lecture du dossier de la classe (« 3B › COMMUN › TECHNOLOGIE › THEATRE IA ») : un dossier par équipe,
// avec le projet (…_theatre_ombre.json, carnet compris), les STL des personnages, des photos et des PDF.
// Les fichiers des élèves sont seulement lus ; seul « validations.json » est écrit (par l'outil, à part).
// Ce fichier ne touche pas à la page : il sert à l'outil ET aux tests.

import { parse } from '../project.js';
import { findProjectFile } from '../team-folder.js';

const STL = /\.stl$/i;
const IMAGE = /\.(jpe?g|png|webp)$/i;
const PDF = /\.pdf$/i;

// dir : dossier choisi (THEATRE IA, ou directement le dossier d'une équipe).
// Renvoie { equipes: [{ dossier, dir, projet, fichier, stls, images, pdfs, erreur }] } par ordre alphabétique.
export async function lireClasse(dir) {
  const seule = await lireEquipe(dir);
  if (seule.projet) return { equipes: [seule], uneSeule: true };
  const equipes = [];
  for await (const entry of dir.values()) {
    if (entry.kind !== 'directory' || entry.name.startsWith('.')) continue;
    const eq = await lireEquipe(entry);
    // Un dossier sans projet ni STL n'est pas une équipe (dossier du professeur, photos…).
    if (eq.projet || eq.erreur || eq.stls.length) equipes.push(eq);
  }
  equipes.sort((a, b) => a.dossier.localeCompare(b.dossier, 'fr'));
  return { equipes, uneSeule: false };
}

export async function lireEquipe(dir) {
  const eq = { dossier: dir.name, dir, projet: null, fichier: null, stls: [], images: [], pdfs: [], erreur: null };
  const found = await findProjectFile(dir);
  if (found) {
    eq.fichier = { name: found.file.name, date: found.file.lastModified };
    try {
      const r = parse(await found.file.text()); // sans modèle : les empreintes de l'IA sont gardées telles quelles
      if (r.ok) eq.projet = r.project;
      else eq.erreur = `${found.file.name} : ${r.error}`;
    } catch {
      eq.erreur = `${found.file.name} : fichier illisible.`;
    }
  }
  for await (const entry of dir.values()) {
    if (entry.kind !== 'file') continue;
    if (STL.test(entry.name)) eq.stls.push(await entry.getFile());
    else if (IMAGE.test(entry.name)) eq.images.push(await entry.getFile());
    else if (PDF.test(entry.name)) eq.pdfs.push(await entry.getFile());
  }
  const byName = (a, b) => a.name.localeCompare(b.name, 'fr');
  eq.stls.sort(byName);
  eq.images.sort(byName);
  eq.pdfs.sort(byName);
  return eq;
}

// Classe la plus citée dans les carnets (« 3B »), sinon ''.
export function classeDesEquipes(equipes) {
  const n = {};
  for (const e of equipes) {
    const c = e.projet?.carnet?.classe?.trim().toUpperCase();
    if (c) n[c] = (n[c] ?? 0) + 1;
  }
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

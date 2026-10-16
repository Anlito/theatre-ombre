// Dossier de l'équipe sur le serveur du collège :
//   3B › COMMUN › TECHNOLOGIE › THEATRE IA › LEA - TOM › LEA_TOM_theatre_ombre.json
// Les élèves choisissent le dossier « THEATRE IA » ; le site y crée le dossier à leurs prénoms
// et y enregistre le projet. Le professeur y dépose « validations.json » (◆) depuis son outil.
// Ce fichier ne touche pas à la page (il reçoit des « handles » de dossiers) : il sert au site ET aux tests.

import { fileName } from './project.js';

export const CLASS_FOLDER = 'THEATRE IA';
export const VALIDATIONS_FILE = 'validations.json';
const PROJECT_FILE = /theatre_ombre.*\.json$/i;

const plain = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

// « Léa », « Tom » -> « LEA - TOM » (sans accents, comme le demande la fiche des rendus).
export function teamFolderName(team) {
  const parts = team.map((n) => plain(n).replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')).filter(Boolean);
  return parts.length ? parts.join(' - ') : 'EQUIPE';
}

// « THEATRE IA », « Théâtre IA », « THEATRE_IA »… : c'est bien le dossier de la classe.
export const isClassFolderName = (name) => plain(name).replace(/[^A-Z0-9]+/g, ' ').trim() === CLASS_FOLDER;
export const isTeamFolderName = (name, team) => sameFolder(name, teamFolderName(team));
const sameFolder = (a, b) => plain(a).replace(/[^A-Z0-9]+/g, '') === plain(b).replace(/[^A-Z0-9]+/g, '');

// Chemin à montrer aux élèves : « 3B › COMMUN › TECHNOLOGIE › THEATRE IA ».
// cheminClasse vient des réglages du collège (ex. ['Bureau', 'Classe', '{classe}', 'COMMUN', 'TECHNOLOGIE']).
export const CHEMIN_CLASSE_DEFAUT = ['{classe}', 'COMMUN', 'TECHNOLOGIE'];
export function classPath(classe, cheminClasse = CHEMIN_CLASSE_DEFAUT) {
  const c = classe?.trim() ? plain(classe).trim() : '3X';
  return [...(cheminClasse?.length ? cheminClasse : CHEMIN_CLASSE_DEFAUT), CLASS_FOLDER].map((p) => p.replace('{classe}', c)).join(' › ');
}

// Dossier choisi par les élèves : « projet » (THEATRE IA : le site y crée le dossier de l'équipe),
// « equipe » (le dossier à leurs prénoms : refusé, le site le crée lui-même) ou « autre ».
export function folderKind(name, team) {
  if (isTeamFolderName(name, team)) return 'equipe';
  if (isClassFolderName(name)) return 'projet';
  return 'autre';
}

// Dossier choisi -> dossier de l'équipe (créé s'il n'existe pas).
// Si les élèves ont choisi directement le dossier à leurs prénoms, on le garde tel quel.
export async function teamFolderIn(dir, team) {
  const name = teamFolderName(team);
  if (sameFolder(dir.name, name)) return dir;
  return dir.getDirectoryHandle(name, { create: true });
}

// Fichier de projet d'un dossier d'équipe (le plus récent), ou null.
export async function findProjectFile(dir) {
  let best = null;
  for await (const entry of dir.values()) {
    if (entry.kind !== 'file' || !PROJECT_FILE.test(entry.name)) continue;
    const file = await entry.getFile();
    if (!best || file.lastModified > best.file.lastModified) best = { handle: entry, file };
  }
  return best;
}

// Dossiers d'équipe trouvés dans « THEATRE IA » : [{ name, dir, handle, file }], par ordre alphabétique.
export async function listTeamFolders(dir) {
  const out = [];
  for await (const entry of dir.values()) {
    if (entry.kind !== 'directory') continue;
    const found = await findProjectFile(entry);
    if (found) out.push({ name: entry.name, dir: entry, ...found });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// Enregistre le texte du projet dans le dossier de l'équipe. Renvoie le handle du fichier.
export async function writeProject(teamDir, team, text) {
  const handle = await teamDir.getFileHandle(fileName(team), { create: true });
  const w = await handle.createWritable();
  await w.write(text);
  await w.close();
  return handle;
}

// Validations ◆ déposées par le professeur : { v1: { date }, … } (vide si pas de fichier).
export async function readValidations(teamDir) {
  try {
    const file = await (await teamDir.getFileHandle(VALIDATIONS_FILE)).getFile();
    return normalizeValidations(JSON.parse(await file.text()));
  } catch {
    return {};
  }
}

export function normalizeValidations(data) {
  const out = {};
  const src = data?.format === 'theatre-ombre-validations' ? data.validations : null;
  for (const [id, v] of Object.entries(src ?? {})) {
    if (/^v\d[a-z]?$/.test(id) && v && Number.isFinite(Number(v.date))) out[id] = { date: Number(v.date) };
  }
  return out;
}

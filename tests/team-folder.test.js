// Dossier de l'équipe : THEATRE IA › LEA - TOM › LEA_TOM_theatre_ombre.json (+ validations.json du professeur).
// Un faux disque en mémoire imite les dossiers du navigateur (File System Access).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  teamFolderName, isClassFolderName, isTeamFolderName, classPath, folderKind, teamFolderIn, findProjectFile, listTeamFolders, writeProject, readValidations, normalizeValidations,
} from '../site/js/team-folder.js';
import { MemDir, MemFile } from './mem-fs.js';

test('nom du dossier de l’équipe : prénoms en majuscules, sans accents', () => {
  assert.equal(teamFolderName(['Léa', 'Tom']), 'LEA - TOM');
  assert.equal(teamFolderName(['Anne-Sophie', 'Noé', ' ']), 'ANNE-SOPHIE - NOE');
  assert.equal(teamFolderName([]), 'EQUIPE');
  assert.equal(classPath('3b'), '3B › COMMUN › TECHNOLOGIE › THEATRE IA');
  assert.equal(classPath(''), '3X › COMMUN › TECHNOLOGIE › THEATRE IA');
});

test('le dossier THEATRE IA est reconnu malgré les accents et les séparateurs', () => {
  for (const n of ['THEATRE IA', 'Théâtre IA', 'theatre_ia', 'THEATRE-IA ']) assert.ok(isClassFolderName(n), n);
  for (const n of ['TECHNOLOGIE', 'THEATRE', 'LEA - TOM']) assert.ok(!isClassFolderName(n), n);
  assert.ok(isTeamFolderName('lea-tom', ['Léa', 'Tom']));
});

test('premier enregistrement : le site crée le dossier de l’équipe dans THEATRE IA et y range le projet', async () => {
  const classe = new MemDir('THEATRE IA');
  const team = ['Léa', 'Tom'];
  const dir = await teamFolderIn(classe, team);
  assert.equal(dir.name, 'LEA - TOM');
  const handle = await writeProject(dir, team, '{"format":"theatre-ombre"}');
  assert.equal(handle.name, 'LEA_TOM_theatre_ombre.json');
  assert.equal(classe.children.get('LEA - TOM').children.get('LEA_TOM_theatre_ombre.json').text, '{"format":"theatre-ombre"}');
  // Si l'équipe choisit directement son propre dossier, on n'en crée pas un second dedans.
  assert.equal(await teamFolderIn(dir, team), dir);
});

test('ouvrir : on retrouve le projet le plus récent, et la liste des équipes de la classe', async () => {
  const classe = new MemDir('THEATRE IA');
  const a = await classe.getDirectoryHandle('LEA - TOM', { create: true });
  a.children.set('LEA_TOM_theatre_ombre.json', new MemFile('LEA_TOM_theatre_ombre.json', 'ancien', 1000));
  a.children.set('LEA_TOM_theatre_ombre (1).json', new MemFile('LEA_TOM_theatre_ombre (1).json', 'récent', 2000));
  a.children.set('Lea_Tom_Cablage.jpg', new MemFile('Lea_Tom_Cablage.jpg', '', 3000));
  const b = await classe.getDirectoryHandle('ZOE - MAX', { create: true });
  b.children.set('ZOE_MAX_theatre_ombre.json', new MemFile('ZOE_MAX_theatre_ombre.json', '{}', 1500));
  await classe.getDirectoryHandle('Photos du prof', { create: true }); // sans projet : ignoré
  const found = await findProjectFile(a);
  assert.equal(found.handle.name, 'LEA_TOM_theatre_ombre (1).json');
  assert.equal(await findProjectFile(classe), null, 'pas de projet posé directement dans THEATRE IA');
  assert.deepEqual((await listTeamFolders(classe)).map((t) => t.name), ['LEA - TOM', 'ZOE - MAX']);
});

test('validations ◆ du professeur : lues dans validations.json, absentes ou abîmées = aucune', async () => {
  const dir = new MemDir('LEA - TOM');
  assert.deepEqual(await readValidations(dir), {});
  dir.children.set('validations.json', new MemFile('validations.json', JSON.stringify({ format: 'theatre-ombre-validations', validations: { v1: { date: 1700000000000 }, v3a: { date: '1700000001000' }, x: { date: 1 }, v2: {} } })));
  assert.deepEqual(await readValidations(dir), { v1: { date: 1700000000000 }, v3a: { date: 1700000001000 } });
  dir.children.set('validations.json', new MemFile('validations.json', 'pas du json'));
  assert.deepEqual(await readValidations(dir), {});
  assert.deepEqual(normalizeValidations({ validations: { v1: { date: 1 } } }), {}, 'format attendu');
});

test('chemin des réglages du collège et dossier choisi par les élèves', () => {
  assert.equal(classPath('3b', ['Bureau', 'Classe', '{classe}', 'COMMUN', 'TECHNOLOGIE']), 'Bureau › Classe › 3B › COMMUN › TECHNOLOGIE › THEATRE IA');
  assert.equal(classPath('3B', []), '3B › COMMUN › TECHNOLOGIE › THEATRE IA');
  const team = ['Léa', 'Tom'];
  assert.equal(folderKind('THEATRE IA', team), 'projet');
  assert.equal(folderKind('LEA - TOM', team), 'equipe');
  assert.equal(folderKind('TECHNOLOGIE', team), 'autre');
});

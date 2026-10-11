// Outil professeur : notation D1–D7, export Pronote, lecture du dossier de la classe, STL, indices.
// Une classe d'exemple est fabriquée avec le vrai format des projets élèves (serialize).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../site/js/prof/evaluation.js';
import { lireClasse, classeDesEquipes } from '../site/js/prof/scan.js';
import { analyserStl, controlerStl } from '../site/js/prof/stl.js';
import { indices } from '../site/js/prof/indices.js';
import { serialize } from '../site/js/project.js';
import { normalizeSettings } from '../site/js/settings.js';
import { emptyCarnet } from '../site/js/carnet.js';
import { MemDir, MemFile } from './mem-fs.js';

// --- Une boîte en STL binaire (12 triangles) -----------------------------------------------------
function stlBoite(x, y, z) {
  const P = [[0, 0, 0], [x, 0, 0], [x, y, 0], [0, y, 0], [0, 0, z], [x, 0, z], [x, y, z], [0, y, z]];
  const F = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0]];
  const buf = new ArrayBuffer(84 + F.length * 50);
  const v = new DataView(buf);
  v.setUint32(80, F.length, true);
  F.forEach((f, i) => f.forEach((p, k) => P[p].forEach((c, j) => v.setFloat32(84 + i * 50 + 12 + k * 12 + j * 4, c, true))));
  return new Uint8Array(buf);
}

function projet({ team, classe, persos = [], carnet = {} }) {
  const c = { ...emptyCarnet(), classe, ...carnet };
  const categories = [
    { id: 'fond', name: 'Fond vide', background: true, examples: Array.from({ length: 15 }, (_, i) => ({ id: `f${i}`, features: new Float32Array(4).fill(i), thumb: '' })) },
    ...persos.map(([name, n], k) => ({ id: `p${k}`, name, background: false, examples: Array.from({ length: n }, (_, i) => ({ id: `e${k}-${i}`, features: new Float32Array(4).fill(i), thumb: '' })) })),
  ];
  return JSON.stringify(serialize({ team, settings: normalizeSettings({}), categories, blocks: { parNiveau: { 1: { blocks: { blocks: [{ type: 'quand_je_vois' }] } } } }, modelId: 'm', carnet: c }));
}

async function classeExemple() {
  const root = new MemDir('THEATRE IA');
  const a = await root.getDirectoryHandle('LEA - TOM', { create: true });
  a.children.set('LEA_TOM_theatre_ombre.json', new MemFile('LEA_TOM_theatre_ombre.json', projet({
    team: ['Léa', 'Tom'], classe: '3B', persos: [['Loup', 20], ['Lapin', 16]],
    carnet: { photos: { dessins: [{ id: 'x', data: 'data:image/jpeg;base64,AA==', date: 1 }] }, auto: { reconnus: ['Loup', 'Lapin'], carte: true, programmeTeste: true }, choix: { 'composants.webcam': 'info', 'composants.led': 'energie' } },
  })));
  a.children.set('LEA_TOM_Perso1.stl', new MemFile('LEA_TOM_Perso1.stl', stlBoite(60, 92, 2)));
  a.children.set('LEA_TOM_Perso2.stl', new MemFile('LEA_TOM_Perso2.stl', stlBoite(120, 80, 5)));
  a.children.set('Lea_Tom_Cablage.jpg', new MemFile('Lea_Tom_Cablage.jpg', 'jpg'));
  const b = await root.getDirectoryHandle('ZOE - MAX', { create: true });
  b.children.set('ZOE_MAX_theatre_ombre.json', new MemFile('ZOE_MAX_theatre_ombre.json', projet({ team: ['Zoé', 'Max'], classe: '3b' })));
  const c = await root.getDirectoryHandle('NOE', { create: true });
  c.children.set('NOE_theatre_ombre.json', new MemFile('NOE_theatre_ombre.json', 'abîmé'));
  await root.getDirectoryHandle('Ressources du prof', { create: true });
  return root;
}

test('note de l’équipe = moyenne des niveaux × 5, mentions de la grille', () => {
  const c = E.nouveauClasseur('3B');
  const eq = E.equipe(c, 'LEA - TOM', ['Léa', 'Tom']);
  assert.equal(E.noteEquipe(c, eq), null);
  for (const l of c.livrables) eq.niveaux[l.id] = 2; // tout « En cours » : 10, comme l'exemple du tableur
  assert.equal(E.noteEquipe(c, eq), 10);
  assert.equal(E.mention(10), 'Satisfaisant');
  eq.niveaux = { D1: 4, D2: 3, D3: 3 }; // seuls les livrables notés comptent
  assert.equal(E.noteEquipe(c, eq), 16.7);
  assert.deepEqual([9.9, 12.9, 13, 16.9, 17].map(E.mention), ['À approfondir', 'Satisfaisant', 'Bien', 'Bien', 'Très bien']);
});

test('bonus / malus par élève, note bornée entre 0 et 20', () => {
  const c = E.nouveauClasseur('3B');
  const eq = E.equipe(c, 'LEA - TOM', ['Léa', 'Tom']);
  for (const l of c.livrables) eq.niveaux[l.id] = 4;
  eq.bonus['Léa'] = 1;
  eq.bonus['Tom'] = -2.5;
  eq.motifs['Tom'] = 'Bavardages';
  assert.deepEqual(E.noteEleve(c, eq, 'Léa'), { note: 20, bonus: 1, motif: '', finale: 20, mention: 'Très bien' });
  assert.equal(E.noteEleve(c, eq, 'Tom').finale, 17.5);
});

test('export CSV pour Excel / Pronote : une ligne par élève, niveaux au vocabulaire Pronote', () => {
  const c = E.nouveauClasseur('3B');
  const eq = E.equipe(c, 'LEA - TOM', ['Léa', 'Tom']);
  eq.niveaux = { D1: 2, D2: 3 };
  eq.bonus['Tom'] = 0.5;
  eq.motifs['Tom'] = 'Très investi; aide les autres';
  const lignes = E.exportCsv(c).replace('﻿', '').trim().split('\r\n');
  assert.equal(lignes.length, 3);
  assert.match(lignes[0], /^Classe;Équipe;Élève;D1 Dessins des personnages;/);
  const tom = lignes[2].split(';');
  assert.deepEqual(tom.slice(0, 5), ['3B', 'LEA - TOM', 'Tom', 'Partiellement atteint', 'Atteint']);
  assert.ok(lignes[2].includes('12,5;+0,5;"Très investi; aide les autres";13;Bien'), lignes[2]);
});

test('sauvegarde de l’évaluation : relue et nettoyée', () => {
  const c = E.nouveauClasseur('3B');
  const eq = E.equipe(c, 'LEA - TOM', ['Léa']);
  eq.niveaux = { D1: 3, D9: 2, D2: 7 };
  eq.validations.v1 = { date: 5 };
  c.livrables[3].t = 'Programme et IA';
  const r = E.normaliserClasseur(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(r.equipes['LEA - TOM'].niveaux, { D1: 3, D9: 2 });
  assert.equal(r.livrables[3].t, 'Programme et IA');
  assert.equal(E.normaliserClasseur({ format: 'autre' }), null);
  assert.deepEqual(E.fichierValidations(eq).validations, { v1: { date: 5 } });
});

test('STL : dimensions lues dans le fichier, contrôle 100 × 100 mm et 2 mm', () => {
  const a = analyserStl(stlBoite(60, 92, 2).buffer);
  assert.deepEqual(a, { triangles: 12, dims: [60, 92, 2] });
  assert.deepEqual(controlerStl(a.dims), { largeur: 60, hauteur: 92, epaisseur: 2, tailleOk: true, epaisseurOk: true });
  const k = controlerStl(analyserStl(stlBoite(120, 80, 5).buffer).dims);
  assert.equal(k.tailleOk, false);
  assert.equal(k.epaisseurOk, false);
  const ascii = 'solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 50 0 0\nvertex 0 70 2\nendloop\nendfacet\nendsolid t\n';
  assert.deepEqual(analyserStl(new TextEncoder().encode(ascii).buffer), { triangles: 1, dims: [50, 70, 2] });
  assert.equal(analyserStl(new Uint8Array(10).buffer), null);
});

test('lecture du dossier de la classe : équipes, projets, STL, images ; fichier abîmé signalé', async () => {
  const { equipes, uneSeule } = await lireClasse(await classeExemple());
  assert.equal(uneSeule, false);
  assert.deepEqual(equipes.map((e) => e.dossier), ['LEA - TOM', 'NOE', 'ZOE - MAX'], 'le dossier « Ressources du prof » est ignoré');
  const lt = equipes[0];
  assert.deepEqual(lt.projet.team, ['Léa', 'Tom']);
  assert.equal(lt.projet.carnet.classe, '3B');
  assert.equal(lt.projet.categories.find((c) => c.name === 'Loup').examples.length, 20, 'les empreintes de l’IA sont gardées');
  assert.deepEqual(lt.stls.map((f) => f.name), ['LEA_TOM_Perso1.stl', 'LEA_TOM_Perso2.stl']);
  assert.equal(lt.images.length, 1);
  assert.match(equipes[1].erreur, /NOE_theatre_ombre\.json/);
  assert.equal(classeDesEquipes(equipes), '3B');
  // Le professeur choisit directement le dossier d'une équipe.
  const seule = await lireClasse((await classeExemple()).children.get('ZOE - MAX'));
  assert.equal(seule.uneSeule, true);
});

test('indices pour noter : ce que l’outil constate dans le dossier de l’équipe', async () => {
  const { equipes } = await lireClasse(await classeExemple());
  const lt = equipes[0];
  for (const f of lt.stls) f.analyse = analyserStl(await f.arrayBuffer());
  const ind = indices(lt, { v1: { date: 1 } });
  const ok = (d, debut) => ind[d].find((x) => x.t.startsWith(debut))?.ok;
  assert.equal(ok('D1', 'Dessins'), true);
  assert.equal(ok('D1', '◆ Dessins validés'), true);
  assert.equal(ok('D2', 'Fichiers STL'), true);
  assert.equal(ok('D2', 'STL conformes'), false, 'le 2e STL fait 120 mm et 5 mm');
  assert.equal(ok('D3', 'Câblage'), false, 'pas de photo du câblage dans le carnet');
  assert.equal(ok('D3', 'Carte connectée'), true);
  assert.equal(ok('D4', 'Personnages'), true);
  assert.equal(ok('D4', 'Reconnus'), true);
  assert.match(ind.D5[1].t, /2\/7 composants bien placés/);
  const zm = indices(equipes[2]);
  assert.equal(zm.D4[0].ok, false, 'aucun personnage');
});

test('indices : dimensions des dessins (≤ 10 cm) et des modèles (≤ 100 mm) notées dans le carnet', () => {
  const carnet = { ...emptyCarnet(), champs: { 'dessins.0.nom': 'Loup', 'dessins.0.hauteur': '9,5', 'dessins.0.largeur': '7', 'dessins.1.hauteur': '12', 'dessins.1.largeur': '6', 'modeles.0.hauteur': '95', 'modeles.0.largeur': '70' } };
  const ind = indices({ projet: { carnet, categories: [], blocks: null }, stls: [], images: [] });
  assert.deepEqual(ind.D1.slice(0, 2), [
    { t: 'Loup : 9,5 × 7 cm (10 × 10 cm maximum)', ok: true },
    { t: 'Personnage 2 : 12 × 6 cm (10 × 10 cm maximum)', ok: false },
  ]);
  assert.deepEqual(ind.D2.find((x) => x.t.startsWith('Loup')), { t: 'Loup : 95 × 70 mm (100 × 100 mm maximum)', ok: true });
  assert.equal(ind.D2.find((x) => x.t.startsWith('Personnage 2')).t, 'Personnage 2 : dimensions non notées');
});

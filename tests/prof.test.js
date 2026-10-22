// Outil professeur (prof.html, modèle commun du distributeur et du labyrinthe) appliqué au Théâtre :
// fichiers des équipes lus par le moteur commun, note (exercices + grille D1 à D7), carnet, STL, indices.
// Le moteur Labo Blocs et le parcours du Théâtre viennent du cache préparé par « npm test » (tools/preparer-tests-labo.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { analyserStl, controlerStl } from '../site/js/prof/stl.js';
import { indices } from '../site/js/prof/indices.js';
import { serialize, parse } from '../site/js/project.js';
import { normalizeSettings } from '../site/js/settings.js';
import { emptyCarnet } from '../site/js/carnet.js';
import { fabriquer } from '../tools/carnet-prof-css.mjs';

const require = createRequire(import.meta.url);
const P = require('../site/js/moteur/progression.js');
const F = require('../site/js/moteur/fichier-theatre.js');
const C = require('../site/js/moteur/classe.js');
const N = require('../site/js/moteur/notation.js');
const K = require('../site/js/moteur/carnet.js');
const CAT = require('../site/js/moteur/catalogue.js');
const BAREME = CAT.chargerDonnees('notation', 'definirBareme');
const CARNET = CAT.chargerDonnees('carnet', 'definirCarnet');

// --- Une boîte en STL binaire (12 triangles) -----------------------------------------------------
function stlBoite(x, y, z) {
  const Pt = [[0, 0, 0], [x, 0, 0], [x, y, 0], [0, y, 0], [0, 0, z], [x, 0, z], [x, y, z], [0, y, z]];
  const Fa = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0]];
  const buf = new ArrayBuffer(84 + Fa.length * 50);
  const v = new DataView(buf);
  v.setUint32(80, Fa.length, true);
  Fa.forEach((f, i) => f.forEach((p, k) => Pt[p].forEach((c, j) => v.setFloat32(84 + i * 50 + 12 + k * 12 + j * 4, c, true))));
  return new Uint8Array(buf);
}

// Programmation écrite par Labo Blocs (exercice 3 réussi après un essai raté, 4 commencé).
const PROGRAMMATION = {
  format: 'labo-blocs/sauvegarde', version: 1, parcours: { id: 'theatre-ombre', version: '1.2.0' }, exerciceCourant: 'theatre-04',
  exercices: {
    'theatre-03': { statut: 'reussi', tentatives: 2, indicesOuverts: 0, historique: [{ type: 'verification', reussi: false, date: '2026-10-20T10:00:00' }, { type: 'verification', reussi: true, date: '2026-10-20T10:05:00' }] },
    'theatre-04': { statut: 'en_cours', tentatives: 1, historique: [{ type: 'verification', reussi: false, date: '2026-10-20T10:10:00' }] },
  },
  camera: { etiquettes: ['Loup', 'Roi'], exemples: { Rien: Array(16).fill({ f: 'AA==', v: '' }), Loup: Array(12).fill({ f: 'AA==', v: '' }), Roi: Array(11).fill({ f: 'AA==', v: '' }) } },
};
function fichier({ team = ['Léa', 'Tom'], classe = '3b', programmation = PROGRAMMATION, carnet = {} } = {}) {
  return serialize({ team, settings: normalizeSettings({}), categories: [], blocks: null, modelId: 'm', programmation, carnet: { ...emptyCarnet(), classe, ...carnet } });
}
const lire = (f) => P.lireSauvegarde(JSON.stringify(f));
const avecEvaluations = (d, notes) => Object.defineProperty(d, 'evaluationsProf', { value: notes, enumerable: false });

test('les données de l’outil professeur sont cohérentes (livrables D1 à D7, barème, parcours à 6 exercices)', () => {
  assert.deepEqual(CARNET.parties.map((p) => p.id), ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']);
  assert.deepEqual(Object.keys(BAREME.carnet), ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']);
  assert.ok(CARNET.parties.every((p) => p.note && p.titre && p.competence && p.pronote));
  assert.deepEqual(CAT.catalogue.exercices().map((e) => e.id), ['1', '2', '3', '4', '5', '6']);
  assert.deepEqual(N.exercicesObligatoires(), ['3', '4', '5', '6'], 'les exercices 1 et 2 (entraîner l’IA) ne sont pas notés automatiquement');
  for (const id of N.exercicesObligatoires()) assert.ok(BAREME.coefficients[id] > 0, `coefficient de l’exercice ${id}`);
});

test('un fichier du Théâtre est lu par le moteur commun (équipe, classe, date, programmation, carnet)', () => {
  const f = fichier();
  const r = lire(f);
  assert.equal(r.ok, true, r.raison);
  const d = r.donnees;
  assert.deepEqual(d.equipe, { eleves: ['Léa', 'Tom'], classe: '3B' });
  assert.equal(d.modifieLe, f.enregistre);
  assert.equal(d.exercices['3'].statut, 'reussi');
  assert.equal(d.theatre.format, 'theatre-ombre', 'le fichier d’origine reste disponible (carnet, IA, photos)');
  assert.equal(P.avancement(d), 1, 'exercices notés réussis : le 3 (le 4 est en cours)');
  const tout = lire(fichier({ programmation: { ...PROGRAMMATION, exercices: { 'theatre-01': { statut: 'reussi', tentatives: 1, historique: [] }, 'theatre-02': { statut: 'reussi', tentatives: 1, historique: [] }, 'theatre-03': { statut: 'reussi', tentatives: 1, historique: [] } } } })).donnees;
  assert.equal(P.avancement(tout), 1, 'les exercices libres 1 et 2 ne comptent pas dans l’avancement');
  // Un fichier d'un autre outil n'est pas pris pour une équipe ; validations.json est reconnu (et laissé de côté).
  assert.equal(P.lireSauvegarde('{"format":"autre"}').ok, false);
  assert.equal(F.versAtelier('pas du json'), 'pas du json');
  assert.ok(F.estValidations('THEATRE IA › LEA - TOM › validations.json'));
  assert.ok(!F.estValidations('LEA_TOM_theatre_ombre.json'));
});

test('un ancien fichier du Théâtre (sans exercices Labo Blocs) reste lisible', () => {
  const r = lire(fichier({ team: ['Zoé'], programmation: null }));
  assert.equal(r.ok, true, r.raison);
  assert.equal(P.avancement(r.donnees), 0);
  assert.ok(Object.values(C.resumerEquipe(r.donnees).cellules).every((c) => c.statut === 'non_commence'));
});

test('fusion d’une classe : une équipe par prénoms et classe, le fichier le plus récent gardé', () => {
  const ancien = fichier();
  const recent = { ...fichier(), enregistre: '2099-01-01T00:00:00.000Z' };
  const autre = fichier({ team: ['Noé', 'Lina'], classe: '3B' });
  const fusion = C.fusionnerEquipes([
    { nom: 'THEATRE IA › LEA - TOM › LEA_TOM_theatre_ombre.json', texte: JSON.stringify(ancien) },
    { nom: 'THEATRE IA › LEA - TOM › LEA_TOM_theatre_ombre (1).json', texte: JSON.stringify(recent) },
    { nom: 'THEATRE IA › NOE - LINA › NOE_LINA_theatre_ombre.json', texte: JSON.stringify(autre) },
  ]);
  assert.equal(fusion.equipes.length, 2);
  const lt = fusion.equipes.find((e) => e.donnees.equipe.eleves[0] === 'Léa');
  assert.equal(lt.fichier, 'THEATRE IA › LEA - TOM › LEA_TOM_theatre_ombre (1).json');
  assert.equal(lt.autres.length, 1);
});

test('note : exercices notés automatiquement + livrables D1 à D7 évalués à la main (un livrable à évaluer reste hors du total)', () => {
  const d = lire(fichier()).donnees;
  const b = N.completerBareme(BAREME);
  // Rien d'évalué : seuls les exercices comptent (3 réussi après 1 essai raté = 95 %, 4 commencé = 20 %).
  const sans = N.noterEquipe(avecEvaluations(d, {}), b);
  assert.ok(sans.detail.filter((x) => x.carnet).every((x) => !x.attendu), 'livrables hors du total tant qu’ils ne sont pas évalués');
  const attendu = (20 * (0.95 * 1 + 0.2 * 1.5)) / (1 + 1.5 + 2 + 3);
  assert.equal(sans.note, Math.round(attendu * 2) / 2);
  // D1 « Atteint » (3/4) et D5 « Partiellement atteint » (2/4) entrent dans le total.
  const d2 = lire(fichier()).donnees;
  const avec = N.noterEquipe(avecEvaluations(d2, { D1: 3, D5: 2 }), b);
  const x = (id) => avec.detail.find((y) => y.id === 'carnet:' + id);
  assert.equal(x('D1').fraction, 0.75);
  assert.equal(x('D5').fraction, 0.5);
  assert.equal(x('D2').attendu, false);
  const brute = (20 * (0.95 * 1 + 0.2 * 1.5 + 0.75 + 0.5)) / (1 + 1.5 + 2 + 3 + 1 + 1);
  assert.equal(avec.note, Math.round(brute * 2) / 2);
});

test('carnet : avancement du carnet du Théâtre (réponses remplies sur les 5 étapes)', () => {
  const d = lire(fichier({ carnet: { champs: { 'dessins.0.nom': 'Loup', 'dessins.0.hauteur': '9' }, cases: { 'e1.silhouettes': true } } })).donnees;
  const av = K.avancementCarnet(d.carnet);
  assert.equal(av.fait, 3);
  assert.ok(av.total > 40);
  assert.equal(av.etapes.length, 5);
  assert.equal(K.niveauDe('3B'), '3');
  assert.equal(K.niveauDe(''), '');
});

test('tableau de la classe et CSV : une ligne par équipe, avec le carnet et la note', () => {
  const d = lire(fichier()).donnees;
  avecEvaluations(d, {});
  const r = C.resumerEquipe(d);
  r.note = N.noterEquipe(d, N.completerBareme(BAREME));
  const c = K.avancementCarnet(d.carnet);
  r.carnet = c.fait;
  r.carnetTotal = c.total;
  const t = C.tableauClasse([r]);
  assert.deepEqual(t.entete.slice(0, 8), ['Classe', 'Équipe', 'Ex. 1', 'Ex. 2', 'Ex. 3', 'Ex. 4', 'Ex. 5', 'Ex. 6']);
  assert.equal(t.lignes[0][1], 'Léa, Tom');
  assert.equal(t.lignes[0][4], '✓ 2');
  const csv = C.enCsv(t.entete, t.lignes);
  assert.ok(csv.startsWith('﻿Classe;Équipe;Ex. 1'));
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

test('indices pour noter : personnages de la caméra Labo Blocs, STL, photos, validations ◆', () => {
  const projet = parse(fichier({ carnet: { photos: { dessins: [{ id: 'x', data: 'data:image/jpeg;base64,AA==', date: 1 }] }, auto: { reconnus: ['Loup', 'Roi'], carte: true, programmeTeste: true }, choix: { 'composants.webcam': 'info', 'composants.led': 'energie' } } })).project;
  const stls = [stlBoite(60, 92, 2), stlBoite(120, 80, 5)].map((o, i) => Object.assign(new File([o], `P${i}.stl`), { analyse: analyserStl(o.buffer) }));
  const ind = indices({ projet, stls, images: [] }, { v1: { date: 1 } });
  const ok = (d, debut) => ind[d].find((x) => x.t.startsWith(debut))?.ok;
  assert.equal(ok('D1', 'Dessins'), true);
  assert.equal(ok('D1', '◆ Dessins validés'), true);
  assert.equal(ok('D2', 'Fichiers STL'), true);
  assert.equal(ok('D2', 'STL conformes'), false, 'le 2e STL fait 120 mm et 5 mm');
  assert.equal(ok('D3', 'Câblage'), false, 'pas de photo du câblage dans le carnet');
  assert.equal(ok('D3', 'Carte connectée'), true);
  assert.match(ind.D4[0].t, /Loup 12 photos, Roi 11 photos/, 'personnages lus dans la caméra de Labo Blocs');
  assert.equal(ok('D4', 'Fond vide'), true, '16 photos de « Rien »');
  assert.equal(ok('D4', 'Reconnus'), true);
  assert.match(ind.D5[1].t, /2\/7 composants bien placés/);
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

test('les styles du carnet dans l’outil professeur sont à jour (npm run carnet-prof)', () => {
  const lu = (f) => readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const attendu = fabriquer(lu('../site/css/style.css')) + '\n' + lu('../site/css/prof-theatre.css');
  assert.equal(lu('../site/css/carnet-prof.css'), attendu);
});

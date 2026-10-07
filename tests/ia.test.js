// Tests de la partie IA qui ne dépend pas de la webcam : catégories, KNN, stabilité.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Training, BACKGROUND_ID, MIN_EXAMPLES } from '../site/js/training.js';
import { classify } from '../site/js/knn.js';
import { Recognizer } from '../site/js/recognizer.js';

// Fausse « caractéristique » MobileNet : un vecteur autour d'une direction donnée.
function fake(direction, noise = 0.05, size = 32) {
  const v = new Float32Array(size);
  v[direction] = 1;
  for (let i = 0; i < size; i++) v[i] += (Math.random() - 0.5) * noise;
  return v;
}

function trained(counts = { fond: 20, loup: 20, sorciere: 20 }) {
  const t = new Training();
  const ids = { fond: BACKGROUND_ID };
  let dir = 1;
  for (const [name, n] of Object.entries(counts)) {
    if (name !== 'fond') ids[name] = t.addCategory(name).category.id;
    const d = name === 'fond' ? 0 : dir++;
    for (let i = 0; i < n; i++) t.addExample(ids[name], fake(d));
  }
  return { t, ids };
}

test('« Fond vide » existe d’office et ne peut être ni supprimé ni renommé', () => {
  const t = new Training();
  assert.equal(t.categories.length, 1);
  assert.equal(t.get(BACKGROUND_ID).name, 'Fond vide');
  assert.equal(t.removeCategory(BACKGROUND_ID), false);
  assert.equal(t.renameCategory(BACKGROUND_ID, 'x').ok, false);
});

test('noms de personnages : vide, trop long, doublon (sans accents ni majuscules)', () => {
  const t = new Training();
  assert.match(t.addCategory('  ').error, /nom/);
  assert.match(t.addCategory('x'.repeat(30)).error, /trop long/);
  assert.equal(t.addCategory('Sorcière').ok, true);
  assert.match(t.addCategory('sorciere').error, /déjà/);
  assert.match(t.addCategory('fond VIDE').error, /déjà/);
});

test('une catégorie n’est utilisable qu’à partir de 15 exemples', () => {
  const { t, ids } = trained({ fond: 20, loup: MIN_EXAMPLES - 1 });
  assert.equal(t.ready, false);
  t.addExample(ids.loup, fake(1));
  assert.equal(t.ready, true);
});

test('le KNN reconnaît le bon personnage avec une forte confiance', () => {
  const { t, ids } = trained();
  const r = classify(t.categories, fake(2));
  assert.equal(r.best, ids.sorciere);
  assert.ok(r.confidences[ids.sorciere] >= 0.8);
  assert.equal(classify(t.categories, fake(0)).best, BACKGROUND_ID);
});

test('le KNN donne les 10 photos les plus ressemblantes, de la plus proche à la moins proche', () => {
  const { t, ids } = trained();
  const r = classify(t.categories, fake(1));
  assert.equal(r.neighbours.length, 10);
  assert.ok(r.neighbours.every((n) => n.categoryId === ids.loup));
  for (let i = 1; i < 10; i++) assert.ok(r.neighbours[i - 1].sim >= r.neighbours[i].sim);
  const ex = t.get(ids.loup).examples.map((e) => e.id);
  assert.ok(ex.includes(r.neighbours[0].exampleId));
});

test('le KNN ignore les catégories qui n’ont pas assez d’exemples', () => {
  const { t, ids } = trained({ fond: 20, loup: 20, sorciere: 5 });
  const r = classify(t.categories, fake(2));
  assert.notEqual(r.best, ids.sorciere);
  assert.equal(r.confidences[ids.sorciere], 0);
});

test('sans aucune catégorie utilisable : rien n’est reconnu', () => {
  const t = new Training();
  assert.equal(classify(t.categories, fake(0)).best, null);
});

test('stabilité : « vu » seulement après 5 images de suite au-dessus du seuil', () => {
  const rec = new Recognizer({ threshold: 0.8, stableFrames: 5 });
  const loup = { best: 'loup', confidences: { loup: 0.9 } };
  for (let i = 0; i < 4; i++) assert.deepEqual(rec.feed(loup), []);
  assert.deepEqual(rec.feed(loup), [{ type: 'vu', id: 'loup' }]);
  assert.deepEqual(rec.feed(loup), [], 'pas de répétition');
});

test('stabilité : une image ratée remet le compteur à zéro', () => {
  const rec = new Recognizer({ stableFrames: 3 });
  const loup = { best: 'loup', confidences: { loup: 1 } };
  const doute = { best: 'loup', confidences: { loup: 0.6 } };
  rec.feed(loup);
  rec.feed(loup);
  rec.feed(doute);
  assert.deepEqual(rec.feed(loup), []);
  assert.deepEqual(rec.feed(loup), []);
  assert.deepEqual(rec.feed(loup), [{ type: 'vu', id: 'loup' }]);
});

test('le fond vide compte comme personne : « je ne vois plus » puis rien', () => {
  const rec = new Recognizer({ stableFrames: 2 });
  const loup = { best: 'loup', confidences: { loup: 1 } };
  const fond = { best: BACKGROUND_ID, confidences: { [BACKGROUND_ID]: 1 } };
  rec.feed(loup);
  rec.feed(loup);
  rec.feed(fond);
  assert.deepEqual(rec.feed(fond), [{ type: 'plus-vu', id: 'loup' }]);
  assert.deepEqual(rec.feed(fond), []);
  assert.equal(rec.seen, null);
});

test('passage direct d’un personnage à un autre', () => {
  const rec = new Recognizer({ stableFrames: 1 });
  rec.feed({ best: 'loup', confidences: { loup: 1 } });
  assert.deepEqual(rec.feed({ best: 'roi', confidences: { roi: 0.9 } }), [
    { type: 'plus-vu', id: 'loup' },
    { type: 'vu', id: 'roi' },
  ]);
});

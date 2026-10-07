// Sauvegarde et rechargement d'un projet : on doit retrouver l'IA et les blocs sans reprendre de photos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialize, parse, fileName, MAX_SOUNDS_BYTES } from '../site/js/project.js';
import { Training, BACKGROUND_ID } from '../site/js/training.js';
import { classify } from '../site/js/knn.js';
import { normalizeSettings, initialSettings } from '../site/js/settings.js';

const MODEL = 'mobilenet_v2_050_224';

function fake(direction, size = 1280) {
  const v = new Float32Array(size);
  v[direction] = 1;
  for (let i = 0; i < size; i++) v[i] += Math.random() * 0.05;
  return v;
}

function makeProject() {
  const t = new Training();
  const loup = t.addCategory('Loup').category.id;
  const roi = t.addCategory('Roi').category.id;
  for (let i = 0; i < 20; i++) {
    t.addExample(BACKGROUND_ID, fake(0), 'data:image/jpeg;base64,AAA');
    t.addExample(loup, fake(1), 'data:image/jpeg;base64,BBB');
    t.addExample(roi, fake(2), 'data:image/jpeg;base64,CCC');
  }
  const blocks = { blocks: { languageVersion: 0, blocks: [{ type: 'quand_je_vois', fields: { PERSO: loup } }] } };
  return { t, loup, roi, blocks };
}

test('enregistrer puis recharger : mêmes personnages, mêmes empreintes, mêmes blocs', () => {
  const { t, loup, blocks } = makeProject();
  const settings = normalizeSettings({ level: 1, threshold: 0.85, stableFrames: 4, ledPins: [9, 10, 11] });
  const json = JSON.stringify(serialize({ team: ['Léa', 'Tom'], settings, categories: t.categories, blocks, modelId: MODEL }));
  const r = parse(json, { modelId: MODEL });
  assert.equal(r.ok, true);
  const p = r.project;
  assert.deepEqual(p.team, ['Léa', 'Tom']);
  assert.deepEqual(p.settings, settings);
  assert.deepEqual(p.blocks, blocks);
  assert.deepEqual(p.categories.map((c) => c.name), ['Fond vide', 'Loup', 'Roi']);
  assert.equal(p.categories[1].examples.length, 20);
  // Empreintes identiques au bit près.
  assert.deepEqual(Array.from(p.categories[1].examples[3].features), Array.from(t.categories[1].examples[3].features));
  assert.equal(p.categories[1].examples[3].thumb, 'data:image/jpeg;base64,BBB');
});

test("l'IA rechargée reconnaît comme avant (sans reprendre de photo)", () => {
  const { t, loup } = makeProject();
  const json = JSON.stringify(serialize({ settings: normalizeSettings(), categories: t.categories, blocks: null, modelId: MODEL }));
  const reloaded = new Training();
  reloaded.replaceAll(parse(json, { modelId: MODEL }).project.categories);
  assert.equal(reloaded.ready, true);
  const q = fake(1);
  assert.equal(classify(reloaded.categories, q).best, loup);
  assert.equal(classify(reloaded.categories, q).best, classify(t.categories, q).best);
});

test('les sons des élèves sont rangés dans le projet, sauf s’ils sont trop lourds', () => {
  const { t } = makeProject();
  const small = { id: 's1', name: 'Loup hurle', mime: 'audio/mpeg', bytes: new Uint8Array([1, 2, 3, 250]) };
  let r = parse(JSON.stringify(serialize({ settings: normalizeSettings(), categories: t.categories, sounds: [small], modelId: MODEL })));
  assert.deepEqual(Array.from(r.project.sounds[0].bytes), [1, 2, 3, 250]);
  assert.deepEqual(r.warnings, []);

  const big = { id: 's2', name: 'Musique', mime: 'audio/mpeg', bytes: new Uint8Array(MAX_SOUNDS_BYTES + 1) };
  r = parse(JSON.stringify(serialize({ settings: normalizeSettings(), categories: t.categories, sounds: [small, big], modelId: MODEL })));
  assert.equal(r.project.sounds[1].bytes, null, 'seul le nom est gardé');
  assert.equal(r.project.sounds[1].name, 'Musique');
  assert.match(r.warnings[0], /redéposer.*Musique/);
});

test('refuse proprement les mauvais fichiers, en français', () => {
  assert.match(parse('pas du json').error, /abîmé/);
  assert.match(parse('{"format":"autre"}').error, /n'est pas un projet/);
  assert.match(parse('{"format":"theatre-ombre","version":99}').error, /plus récente/);
});

test('autre modèle d’IA : on garde les blocs mais on demande de reprendre les photos', () => {
  const { t, blocks } = makeProject();
  const json = JSON.stringify(serialize({ settings: normalizeSettings(), categories: t.categories, blocks, modelId: 'ancien' }));
  const r = parse(json, { modelId: MODEL });
  assert.equal(r.ok, true);
  assert.ok(r.project.categories.every((c) => c.examples.length === 0));
  assert.deepEqual(r.project.blocks, blocks);
  assert.match(r.warnings[0], /reprendre les photos/);
});

test('nom de fichier PRENOM_PRENOM_theatre_ombre.json', () => {
  assert.equal(fileName(['Léa', 'Tom', 'Zoé']), 'LEA_TOM_ZOE_theatre_ombre.json');
  assert.equal(fileName(['  anne-sophie ', '', 'Noël']), 'ANNE-SOPHIE_NOEL_theatre_ombre.json');
  assert.equal(fileName(['../../x']), 'X_theatre_ombre.json');
  assert.equal(fileName([]), 'theatre_ombre.json');
});

test('réglages : valeurs ramenées dans des limites sûres, 4 LED au maximum', () => {
  const s = normalizeSettings({ level: 7, threshold: 2, stableFrames: 0, ledPins: [1, 9, 9, 10, 11, 6, 5, 'x'] });
  assert.deepEqual(s, { level: 3, threshold: 0.99, stableFrames: 1, ledPins: [9, 10, 11, 6], levelLocked: false });
});

test('réglages : config.js, puis poste, puis adresse de la page', () => {
  const config = { niveau: 1, brochesLed: [9, 10, 11, 12], seuilConfiance: 80, imagesStables: 5 };
  assert.deepEqual(initialSettings(config, '', null), { level: 1, threshold: 0.8, stableFrames: 5, ledPins: [9, 10, 11, 12], levelLocked: false });
  assert.equal(initialSettings({ ...config, niveauVerrouille: true }, '', null).levelLocked, true);
  const poste = { threshold: 0.9 };
  assert.equal(initialSettings(config, '', poste).threshold, 0.9);
  const s = initialSettings(config, '?niveau=2&broches=3,5', poste);
  assert.equal(s.level, 2);
  assert.deepEqual(s.ledPins, [3, 5]);
  assert.equal(s.threshold, 0.9);
});


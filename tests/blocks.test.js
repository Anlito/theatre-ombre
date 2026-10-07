// Blocs -> code -> exécution dans l'interpréteur isolé (comme dans le navigateur).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';
import Interpreter from 'js-interpreter';
import { defineBlocks } from '../site/js/blocks/definitions.js';
import { defineGenerators, compile } from '../site/js/blocks/generators.js';
import { Runtime } from '../site/js/runtime.js';

const characters = [
  { id: 'loup', name: 'Loup' },
  { id: 'roi', name: 'Roi' },
];
const sounds = [{ id: 'b:fanfare', name: 'Fanfare' }];
const ledPins = [9, 10, 11, 12];
defineBlocks(Blockly, { characters: () => characters, sounds: () => sounds, ledPins: () => ledPins });
defineGenerators(javascriptGenerator, Order);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Attend qu'une condition soit vraie (au plus 2 s) : les tests ne dépendent pas de la vitesse du PC.
async function waitFor(check, timeout = 2000) {
  const end = Date.now() + timeout;
  while (!check() && Date.now() < end) await wait(5);
}

function workspace(blocks) {
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks } }, ws);
  return ws;
}

// Chaîne de blocs : [type, champs, entrées] -> JSON Blockly (chaque bloc accroché au précédent).
function chain(hat, perso, steps) {
  const make = (i) => {
    if (i >= steps.length) return undefined;
    const [type, fields, inputs] = steps[i];
    const next = make(i + 1);
    return { type, fields, inputs, ...(next ? { next: { block: next } } : {}) };
  };
  const first = make(0);
  return { type: hat, fields: { PERSO: perso }, x: 0, y: 0, ...(first ? { next: { block: first } } : {}) };
}
const n = (v) => ({ DUREE: { shadow: { type: 'math_number', fields: { NUM: v } } } });

function setupRuntime() {
  const log = [];
  const highlighted = new Map();
  const errors = [];
  const rt = new Runtime({
    Interpreter,
    actions: {
      allumer: async (p) => log.push(`allumer ${p}`),
      eteindre: async (p) => log.push(`eteindre ${p}`),
      jouerSon: async (s) => log.push(`son ${s}`),
      arreterSons: async () => log.push('stop sons'),
      toutEteindre: async () => log.push('tout eteindre'),
      surligner: (fil, id) => (id ? highlighted.set(fil, id) : highlighted.delete(fil)),
    },
    onError: (m) => errors.push(m),
  });
  return { rt, log, highlighted, errors };
}

test('génère le code attendu pour chaque bloc', () => {
  const ws = workspace([
    chain('quand_je_vois', 'loup', [
      ['allumer_led', { PIN: '3' }],
      ['attendre', {}, n(1.5)],
      ['eteindre_led', { PIN: '3' }],
      ['jouer_son', { SON: 'b:fanfare' }],
      ['arreter_sons', {}],
      ['tout_eteindre', {}],
    ]),
  ]);
  const { handlers, problems } = compile(ws, javascriptGenerator);
  assert.deepEqual(problems, []);
  assert.equal(handlers.length, 1);
  assert.equal(handlers[0].event, 'vu');
  assert.equal(handlers[0].perso, 'loup');
  const code = handlers[0].code.replace(/surligner\('[^']*'\);\n/g, '');
  assert.equal(
    code.trim(),
    ["allumer(3);", 'attendre(1.5);', 'eteindre(3);', "jouerSon('b:fanfare');", 'arreterSons();', 'toutEteindre();'].join('\n'),
  );
});

test('signale les blocs seuls et les « quand » sans personnage', () => {
  const ws = workspace([
    { type: 'allumer_led', fields: { PIN: '5' }, x: 300, y: 0 },
    chain('quand_je_ne_vois_plus', 'roi', []),
  ]);
  const { handlers, problems } = compile(ws, javascriptGenerator);
  assert.equal(handlers.length, 1);
  assert.equal(handlers[0].event, 'plus-vu');
  assert.equal(problems.length, 2);
  assert.match(problems.map((p) => p.message).join(' '), /accroché à aucun/);
  assert.match(problems.map((p) => p.message).join(' '), /Accroche des actions/);
});

test('exécute « quand je vois Loup » seulement pour le loup', async () => {
  const { rt, log } = setupRuntime();
  const ws = workspace([
    chain('quand_je_vois', 'loup', [['allumer_led', { PIN: '3' }], ['jouer_son', { SON: 'b:fanfare' }]]),
    chain('quand_je_ne_vois_plus', 'loup', [['eteindre_led', { PIN: '3' }]]),
  ]);
  rt.load(compile(ws, javascriptGenerator).handlers);
  rt.trigger('vu', 'loup');
  await wait(20);
  assert.deepEqual(log, [], 'rien tant que le programme n’est pas démarré');
  rt.start();
  rt.trigger('vu', 'roi');
  rt.trigger('vu', 'loup');
  await waitFor(() => log.length >= 2);
  assert.deepEqual(log, ['allumer 3', 'son b:fanfare']);
  rt.trigger('plus-vu', 'loup');
  await waitFor(() => log.length >= 3);
  assert.deepEqual(log, ['allumer 3', 'son b:fanfare', 'eteindre 3']);
  rt.stop();
});

test('« attendre » fait vraiment patienter, et Stop interrompt l’attente', async () => {
  const { rt, log, highlighted } = setupRuntime();
  const ws = workspace([
    chain('quand_je_vois', 'loup', [['allumer_led', { PIN: '4' }], ['attendre', {}, n(0.2)], ['eteindre_led', { PIN: '4' }]]),
  ]);
  rt.load(compile(ws, javascriptGenerator).handlers);
  rt.start();
  const t0 = Date.now();
  rt.trigger('vu', 'loup');
  await waitFor(() => log.length >= 1);
  assert.deepEqual(log, ['allumer 4']);
  assert.equal(highlighted.size, 1, 'le bloc en cours est surligné');
  await waitFor(() => log.length >= 2);
  assert.ok(Date.now() - t0 >= 190, 'au moins 0,2 s d’attente');
  assert.deepEqual(log, ['allumer 4', 'eteindre 4']);
  await waitFor(() => highlighted.size === 0);
  assert.equal(highlighted.size, 0, 'plus de surlignage à la fin');

  rt.trigger('vu', 'loup');
  await waitFor(() => log.length >= 3);
  rt.stop();
  await wait(250);
  assert.deepEqual(log, ['allumer 4', 'eteindre 4', 'allumer 4'], 'Stop : le « éteindre » n’arrive jamais');
});

test('le même personnage revu relance son programme depuis le début', async () => {
  const { rt, log } = setupRuntime();
  const ws = workspace([
    chain('quand_je_vois', 'loup', [['allumer_led', { PIN: '6' }], ['attendre', {}, n(0.15)], ['eteindre_led', { PIN: '6' }]]),
  ]);
  rt.load(compile(ws, javascriptGenerator).handlers);
  rt.start();
  rt.trigger('vu', 'loup');
  await waitFor(() => log.length >= 1);
  rt.trigger('vu', 'loup');
  await waitFor(() => log.length >= 3);
  assert.deepEqual(log, ['allumer 6', 'allumer 6', 'eteindre 6']);
  rt.stop();
});

test('une boucle infinie ne bloque pas : le reste continue et Stop répond vite', async () => {
  const { rt, log } = setupRuntime();
  rt.load([
    { hatId: 'boucle', event: 'vu', perso: 'loup', code: 'var i = 0; while (true) { i++; }' },
    { hatId: 'autre', event: 'vu', perso: 'loup', code: 'allumer(9);' },
  ]);
  rt.start();
  rt.trigger('vu', 'loup');
  // Si la boucle bloquait tout, ce minuteur ne se déclencherait jamais.
  const t0 = performance.now();
  await wait(30);
  assert.ok(performance.now() - t0 < 500, 'la page reste réactive');
  assert.deepEqual(log, ['allumer 9'], 'l’autre fil a pu s’exécuter');
  const t1 = performance.now();
  rt.stop();
  assert.equal(rt.busy, false);
  assert.ok(performance.now() - t1 < 1000, 'Stop en moins d’une seconde');
});

test('le code ne peut pas sortir de sa boîte (pas d’accès à la page ni au réseau)', async () => {
  const { rt, errors } = setupRuntime();
  rt.load([{ hatId: 'x', event: 'vu', perso: 'loup', code: 'fetch("https://exemple.fr");' }]);
  rt.start();
  rt.trigger('vu', 'loup');
  await wait(30);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /erreur/);
  rt.stop();
});

test('les blocs LED ne proposent que les broches du professeur (4 au maximum)', () => {
  const ws = workspace([{ type: 'allumer_led', fields: { PIN: '10' }, x: 0, y: 0 }]);
  const field = ws.getAllBlocks()[0].getField('PIN');
  assert.deepEqual(field.getOptions(false).map((o) => o[1]), ['9', '10', '11', '12']);
});

test('un projet qui utilise une broche hors liste la garde (marquée « non prévue »)', () => {
  const ws = workspace([chain('quand_je_vois', 'loup', [['allumer_led', { PIN: '4' }]])]);
  const led = ws.getAllBlocks().find((b) => b.type === 'allumer_led');
  assert.equal(led.getFieldValue('PIN'), '4');
  assert.ok(led.getField('PIN').getOptions(false).some((o) => o[0] === '4 (non prévue)'));
  assert.ok(compile(ws, javascriptGenerator).handlers[0].code.includes('allumer(4);'));
});

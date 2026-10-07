// Niveau 2 : boucles, conditions, variables, blocs IA, intensité, messages.
// Programmes « comme dans mBlock » exécutés dans l'interpréteur isolé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';
import Interpreter from 'js-interpreter';
import { defineBlocks, toolbox, NOBODY } from '../site/js/blocks/definitions.js';
import { defineGenerators, compile } from '../site/js/blocks/generators.js';
import { Runtime } from '../site/js/runtime.js';

const characters = [
  { id: 'loup', name: 'Loup' },
  { id: 'roi', name: 'Roi' },
];
defineBlocks(Blockly, { characters: () => characters, sounds: () => [], ledPins: () => [9, 10, 11, 12] });
defineGenerators(javascriptGenerator, Order, { characterName: (id) => characters.find((c) => c.id === id)?.name ?? id });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(check, timeout = 2000) {
  const end = Date.now() + timeout;
  while (!check() && Date.now() < end) await wait(5);
}

function workspace(state) {
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(state, ws);
  return ws;
}
const num = (n) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const block = (type, extra = {}) => ({ block: { type, ...extra } });

// Fausse IA et fausse carte : on décide de ce que « voit » l'IA.
function setup() {
  const ai = { seen: null, conf: {} };
  const log = [];
  const messages = [];
  let vars = new Map();
  const rt = new Runtime({
    Interpreter,
    actions: {
      allumer: async (p) => log.push(`allumer ${p}`),
      eteindre: async (p) => log.push(`eteindre ${p}`),
      regler: async (p, v) => log.push(`regler ${p} ${v}`),
      jouerSon: async () => {},
      arreterSons: async () => {},
      toutEteindre: async () => log.push('tout eteindre'),
      surligner: () => {},
      ecrire: (t) => messages.push(t),
      jeVois: (id) => ai.seen === id,
      personnageVu: () => characters.find((c) => c.id === ai.seen)?.name ?? 'personne',
      confiance: (id) => ai.conf[id] ?? 0,
    },
    onVariables: (v) => (vars = new Map(v)),
  });
  return { rt, ai, log, messages, vars: () => vars };
}

test('la boîte à outils du niveau 2 ajoute les catégories de mBlock, pas celle du niveau 1', () => {
  const names1 = toolbox(1).contents.map((c) => c.name);
  const names2 = toolbox(2).contents.map((c) => c.name);
  assert.deepEqual(names1, ['Événements', 'LED et sons', 'Contrôle']);
  assert.deepEqual(names2, ['Événements', 'LED et sons', 'Contrôle', 'Opérateurs', 'Variables', 'IA', 'Affichage']);
  const types2 = JSON.stringify(toolbox(2));
  // Niveau 2 : on part de « quand le programme démarre », plus de « quand je vois / ne vois plus ».
  assert.deepEqual(toolbox(2).contents[0].contents.map((b) => b.type), ['au_demarrage']);
  assert.ok(!types2.includes('"quand_je_vois"') && !types2.includes('"quand_je_ne_vois_plus"'));
  assert.ok(JSON.stringify(toolbox(1)).includes('"quand_je_vois"'), 'le niveau 1 les garde');
  for (const t of ['au_demarrage', 'repeter_toujours', 'controls_repeat_ext', 'controls_whileUntil', 'controls_if', 'logic_compare', 'logic_operation', 'logic_negate', 'ia_je_vois', 'ia_confiance', 'regler_led', 'ecrire']) {
    assert.ok(types2.includes(`"${t}"`), t);
  }
});

test('« quand le programme démarre » + répéter indéfiniment + si je vois… alors… sinon', async () => {
  const { rt, ai, log } = setup();
  const ws = workspace({
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'au_demarrage',
          next: block('repeter_toujours', {
            inputs: {
              DO: block('controls_if', {
                extraState: { hasElse: true },
                inputs: {
                  IF0: block('ia_je_vois', { fields: { PERSO: 'loup' } }),
                  DO0: block('allumer_led', { fields: { PIN: '9' } }),
                  ELSE: block('eteindre_led', { fields: { PIN: '9' } }),
                },
              }),
            },
          }),
        },
      ],
    },
  });
  const { handlers, problems } = compile(ws, javascriptGenerator);
  assert.deepEqual(problems, []);
  assert.equal(handlers[0].event, 'start');
  rt.load(handlers);
  rt.start();
  await waitFor(() => log.includes('eteindre 9'));
  ai.seen = 'loup';
  await waitFor(() => log.includes('allumer 9'));
  ai.seen = null;
  const n = log.length;
  await waitFor(() => log.length > n && log.at(-1) === 'eteindre 9');
  assert.equal(log.at(-1), 'eteindre 9');
  const t0 = Date.now();
  rt.stop();
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(rt.busy, false, 'la boucle infinie est bien arrêtée');
});

test('« personnage vu = Loup » et « confiance > 80 » avec « et »', async () => {
  const { rt, ai, log } = setup();
  const cond = block('logic_operation', {
    fields: { OP: 'AND' },
    inputs: {
      A: block('logic_compare', {
        fields: { OP: 'EQ' },
        inputs: { A: block('ia_personnage_vu'), B: block('ia_personnage', { fields: { PERSO: 'loup' } }) },
      }),
      B: block('logic_compare', {
        fields: { OP: 'GT' },
        inputs: { A: block('ia_confiance', { fields: { PERSO: 'loup' } }), B: num(80) },
      }),
    },
  });
  const ws = workspace({
    blocks: {
      languageVersion: 0,
      blocks: [{ type: 'quand_je_vois', fields: { PERSO: 'loup' }, next: block('controls_if', { inputs: { IF0: cond, DO0: block('allumer_led', { fields: { PIN: '10' } }) } }) }],
    },
  });
  rt.load(compile(ws, javascriptGenerator).handlers);
  rt.start();
  ai.seen = 'loup';
  ai.conf.loup = 70;
  rt.trigger('vu', 'loup');
  await wait(60);
  assert.deepEqual(log, [], 'confiance 70 : pas assez');
  ai.conf.loup = 95;
  rt.trigger('vu', 'loup');
  await waitFor(() => log.length > 0);
  assert.deepEqual(log, ['allumer 10']);
  rt.stop();
});

test('« personne » dans la liste des personnages', () => {
  const ws = workspace({ blocks: { languageVersion: 0, blocks: [{ type: 'ia_personnage', fields: { PERSO: NOBODY } }] } });
  const b = ws.getAllBlocks()[0];
  assert.ok(b.getField('PERSO').getOptions(false).some(([label]) => label === 'personne'));
  javascriptGenerator.init(ws);
  assert.equal(javascriptGenerator.blockToCode(b)[0], "'personne'");
});

test('variables partagées : un compteur de passages lu par un autre bloc', async () => {
  const { rt, log, messages, vars } = setup();
  const ws = workspace({
    variables: [{ name: 'passages', id: 'v1' }],
    blocks: {
      languageVersion: 0,
      blocks: [
        { type: 'au_demarrage', next: block('variables_set', { fields: { VAR: { id: 'v1' } }, inputs: { VALUE: num(0) } }) },
        {
          type: 'quand_je_vois',
          fields: { PERSO: 'roi' },
          next: block('math_change', {
            fields: { VAR: { id: 'v1' } },
            inputs: { DELTA: num(1) },
            next: block('ecrire', {
              inputs: { TEXTE: block('variables_get', { fields: { VAR: { id: 'v1' } } }) },
              next: block('controls_if', {
                inputs: {
                  IF0: block('logic_compare', {
                    fields: { OP: 'EQ' },
                    inputs: { A: block('variables_get', { fields: { VAR: { id: 'v1' } } }), B: num(3) },
                  }),
                  DO0: block('tout_eteindre'),
                },
              }),
            }),
          }),
        },
      ],
    },
  });
  rt.load(compile(ws, javascriptGenerator).handlers);
  rt.start();
  for (let i = 1; i <= 3; i++) {
    rt.trigger('vu', 'roi');
    await waitFor(() => messages.length >= i);
  }
  await waitFor(() => log.length > 0);
  assert.deepEqual(messages, ['1', '2', '3']);
  assert.equal(vars().get('v1'), 3);
  assert.deepEqual(log, ['tout eteindre']);
  rt.stop();
});

test('répéter 3 fois + régler l’intensité', async () => {
  const { rt, log } = setup();
  const ws = workspace({
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'au_demarrage',
          next: block('controls_repeat_ext', {
            inputs: { TIMES: num(3), DO: block('regler_led', { fields: { PIN: '11' }, inputs: { VALEUR: num(128) } }) },
          }),
        },
      ],
    },
  });
  rt.load(compile(ws, javascriptGenerator).handlers);
  rt.start();
  await waitFor(() => log.length >= 3);
  await wait(30);
  assert.deepEqual(log, ['regler 11 128', 'regler 11 128', 'regler 11 128']);
  rt.stop();
});

test('bloc incomplet (si sans condition) : signalé et le programme ne démarre pas', () => {
  const ws = workspace({
    blocks: {
      languageVersion: 0,
      blocks: [{ type: 'au_demarrage', next: block('controls_if', { inputs: { DO0: block('allumer_led', { fields: { PIN: '9' } }) } }) }],
    },
  });
  const { handlers, problems } = compile(ws, javascriptGenerator);
  assert.equal(handlers.length, 0);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].level, 'erreur');
  assert.match(problems[0].message, /Il manque une pièce/);
});

test('intensité sur la broche 12 (sans ~) : refusée avec une explication', () => {
  const ws = workspace({
    blocks: {
      languageVersion: 0,
      blocks: [{ type: 'au_demarrage', next: block('regler_led', { fields: { PIN: '12' }, inputs: { VALEUR: num(100) } }) }],
    },
  });
  const { problems } = compile(ws, javascriptGenerator);
  assert.match(problems[0].message, /broche 12 ne sait pas régler/);
});

test('arrêter la boucle (« quitter la boucle ») dans répéter indéfiniment', async () => {
  const { rt, log } = setup();
  const ws = workspace({
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'au_demarrage',
          next: block('repeter_toujours', {
            inputs: { DO: block('allumer_led', { fields: { PIN: '9' }, next: block('controls_flow_statements', { fields: { FLOW: 'BREAK' } }) }) },
            next: undefined,
          }),
        },
      ],
    },
  });
  rt.load(compile(ws, javascriptGenerator).handlers);
  rt.start();
  await waitFor(() => !rt.busy);
  assert.deepEqual(log, ['allumer 9']);
  rt.stop();
});

test('catégorie Variables : « définir … à 0 » et « ajouter 1 à … » avec une valeur modifiable', async () => {
  const { variablesFlyout, CREATE_VARIABLE_BUTTON } = await import('../site/js/blocks/definitions.js');
  assert.deepEqual(variablesFlyout([]), [{ kind: 'button', text: '➕ Créer une variable', callbackKey: CREATE_VARIABLE_BUTTON }]);
  const items = variablesFlyout([{ id: 'v1', name: 'choix' }]);
  const set = items.find((i) => i.type === 'variables_set');
  assert.deepEqual(set.inputs.VALUE, { shadow: { type: 'math_number', fields: { NUM: 0 } } });
  assert.deepEqual(items.find((i) => i.type === 'math_change').inputs.DELTA.shadow.fields, { NUM: 1 });
  // Le bloc tel qu'il sort du volet n'est pas « incomplet » : on peut démarrer directement.
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(
    { variables: [{ name: 'choix', id: 'v1' }], blocks: { languageVersion: 0, blocks: [{ type: 'au_demarrage', next: { block: { type: set.type, fields: set.fields, inputs: set.inputs } } }] } },
    ws,
  );
  const { handlers, problems } = compile(ws, javascriptGenerator);
  assert.deepEqual(problems, []);
  assert.match(handlers[0].code, /fixerVariable\('v1', 0\)/);
});

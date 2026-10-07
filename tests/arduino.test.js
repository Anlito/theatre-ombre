// Niveau 3 : traduction des blocs en C++ Arduino.
//  1) chaque bloc retrouve ses lignes (lien blocs <-> code, 100 % du jeu de tests) ;
//  2) le code des 10 programmes types se compile avec arduino-cli sur Uno et Nano
//     (si arduino-cli est installé : voir README, « Vérifier la compilation »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as Blockly from 'blockly';
import { defineBlocks } from '../site/js/blocks/definitions.js';
import { generateArduino } from '../site/js/blocks/arduino.js';
import { PROGRAMMES, CHARACTERS, SOUNDS } from './programmes-types.js';

defineBlocks(Blockly, { characters: () => CHARACTERS, sounds: () => SOUNDS, ledPins: () => [9, 10, 11, 12] });
const ctx = {
  characterName: (id) => (id === '__personne__' ? 'personne' : CHARACTERS.find((c) => c.id === id)?.name ?? ''),
  soundName: (id) => SOUNDS.find((s) => s.id === id)?.name ?? '',
  team: ['Léa', 'Tom'],
  ledPins: [9, 10, 11, 12],
};

function translate(state) {
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(state, ws);
  return { ws, ...generateArduino(Blockly, ws, ctx) };
}

// Ce que chaque type de bloc doit produire sur ses lignes.
const EXPECTED = {
  allumer_led: (b) => `digitalWrite(${b.getFieldValue('PIN')}, HIGH);`,
  eteindre_led: (b) => `digitalWrite(${b.getFieldValue('PIN')}, LOW);`,
  regler_led: (b) => `analogWrite(${b.getFieldValue('PIN')},`,
  attendre: () => 'delay(',
  jouer_son: () => 'Serial.println("SON:',
  arreter_sons: () => 'Serial.println("SON:STOP");',
  tout_eteindre: () => 'toutEteindre();',
  ecrire: () => 'Serial.println(',
  repeter_toujours: () => 'répéter indéfiniment',
  controls_repeat_ext: () => 'for (int',
  controls_whileUntil: () => 'while (',
  controls_if: () => 'if (',
  controls_flow_statements: () => 'break;',
  variables_set: () => ' = ',
  math_change: () => ' + ',
  quand_je_vois: (b) => `if (personnage == "${ctx.characterName(b.getFieldValue('PERSO'))}")`,
  quand_je_ne_vois_plus: (b) => `if (personnagePrecedent == "${ctx.characterName(b.getFieldValue('PERSO'))}")`,
  au_demarrage: () => 'quand le programme démarre',
};

test('structure Arduino : setup(), loop(), Serial à 115200, pinMode des LED utilisées', () => {
  const { code } = translate(PROGRAMMES[0].state);
  assert.match(code, /void setup\(\) \{/);
  assert.match(code, /void loop\(\) \{/);
  assert.match(code, /Serial\.begin\(115200\);/);
  assert.match(code, /pinMode\(9, OUTPUT\);/);
  assert.match(code, /Serial\.readStringUntil\('\\n'\)/);
  assert.match(code, /TRADUCTION/);
  assert.match(code, /Serial\.println\("SON:Fanfare"\);\s+\/\/ le son est joué par l'ordinateur/);
});

test('« répéter indéfiniment » du démarrage devient loop(), le reste setup()', () => {
  const { code } = translate(PROGRAMMES[6].state);
  const setup = code.slice(code.indexOf('void setup()'), code.indexOf('void loop()'));
  assert.match(setup, /luminosite = 0;/);
  assert.match(setup, /while \(luminosite < 255\)/);
  const { code: c4 } = translate(PROGRAMMES[3].state);
  const loop = c4.slice(c4.indexOf('void loop()'));
  assert.match(loop, /if \(jeVois\("Loup"\)\) \{/);
  assert.doesNotMatch(c4, /while \(true\)/, 'pas de boucle infinie dans setup()');
});

test('variables : int pour les nombres, String pour le texte, noms sans accents', () => {
  assert.match(translate(PROGRAMMES[4].state).code, /^int passages = 0;/m);
  assert.match(translate(PROGRAMMES[8].state).code, /^String choix = "";/m);
  assert.match(translate(PROGRAMMES[9].state).code, /^int nombre_1 = 0;/m);
});

for (const p of PROGRAMMES) {
  test(`lien blocs ↔ lignes : ${p.nom}`, () => {
    const { ws, code, lines } = translate(p.state);
    const all = code.split('\n');
    for (const block of ws.getAllBlocks(false)) {
      if (block.isShadow() || block.outputConnection) continue; // les valeurs suivent le bloc qui les contient
      const ranges = lines[block.id];
      assert.ok(ranges?.length, `${block.type} : aucune ligne`);
      for (const [a, z] of ranges) assert.ok(a >= 1 && z >= a && z <= all.length, `${block.type} : lignes ${a}-${z}`);
      const expected = EXPECTED[block.type]?.(block);
      if (expected) {
        const text = ranges.map(([a, z]) => all.slice(a - 1, z).join('\n')).join('\n');
        assert.ok(text.includes(expected), `${block.type} : « ${expected} » absent de\n${text}`);
      }
    }
  });
}

// --- Compilation réelle avec arduino-cli -----------------------------------------------------------------
function findArduinoCli() {
  const candidates = [process.env.ARDUINO_CLI, join('tools', 'arduino-cli', 'arduino-cli.exe'), join('tools', 'arduino-cli', 'arduino-cli')];
  for (const c of candidates) if (c && existsSync(c)) return c;
  try {
    execFileSync('arduino-cli', ['version'], { stdio: 'ignore' });
    return 'arduino-cli';
  } catch {
    return null;
  }
}
const cli = findArduinoCli();
const compileOpts = { skip: cli ? false : 'arduino-cli absent : voir README, « Vérifier la compilation »' };

for (const fqbn of ['arduino:avr:uno', 'arduino:avr:nano']) {
  test(`arduino-cli compile les 10 programmes types (${fqbn})`, { ...compileOpts, timeout: 600_000 }, () => {
    const root = mkdtempSync(join(tmpdir(), 'theatre-'));
    PROGRAMMES.forEach((p, i) => {
      const dir = join(root, `programme${i + 1}`);
      mkdirSync(dir);
      writeFileSync(join(dir, `programme${i + 1}.ino`), translate(p.state).code);
      try {
        execFileSync(cli, ['compile', '--fqbn', fqbn, dir], { stdio: 'pipe' });
      } catch (e) {
        assert.fail(`${p.nom} ne compile pas :\n${e.stderr?.toString() ?? e.message}`);
      }
    });
  });
}

test('le programme fixe theatre_ombre.ino compile (Uno)', { ...compileOpts, timeout: 300_000 }, () => {
  execFileSync(cli, ['compile', '--fqbn', 'arduino:avr:uno', join('arduino', 'theatre_ombre')], { stdio: 'pipe' });
});

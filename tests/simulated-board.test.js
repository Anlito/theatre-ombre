// Ces tests décrivent le comportement attendu du programme fixe theatre_ombre.ino.
// La carte simulée en est la copie en JavaScript.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SimulatedBoard, WATCHDOG_MS } from '../site/js/simulated-board.js';

function board() {
  let t = 0;
  const b = new SimulatedBoard({ now: () => t });
  b.advance = (ms) => {
    t += ms;
    b.tick();
  };
  return b;
}

test('répond au signe de vie', () => {
  assert.equal(board().receive('PING'), 'PONG v1');
});

test('allume, éteint et règle l’intensité', () => {
  const b = board();
  assert.equal(b.receive('D 13 1'), 'OK');
  assert.equal(b.read(13), 1);
  assert.equal(b.receive('D 13 0'), 'OK');
  assert.equal(b.read(13), 0);
  assert.equal(b.receive('A 9 200'), 'OK');
  assert.equal(b.read(9), 200);
  assert.equal(b.receive('T 8 440 500'), 'OK');
  assert.equal(b.receive('OFF'), 'OK');
  assert.equal(b.read(9), 0);
  assert.equal(b.tone, null);
});

test('accepte minuscules, espaces multiples et retour chariot', () => {
  const b = board();
  assert.equal(b.receive('d  5   1\r'), 'OK');
  assert.equal(b.read(5), 1);
});

test('refuse les broches 0 et 1 (câble USB) et hors 2..13 avec ERR PIN', () => {
  const b = board();
  for (const cmd of ['D 0 1', 'D 1 1', 'D 14 1', 'A 4 100', 'A 13 10', 'T 1 440 100']) {
    assert.equal(b.receive(cmd), 'ERR PIN', cmd);
  }
  assert.equal(b.read(0), 0);
});

test('commande inconnue ou mal formée : ERR CMD sans rien exécuter', () => {
  const b = board();
  const bad = [
    'HELLO', '', 'D', 'D 3', 'D 3 2', 'D 3 1 4', 'D -3 1', 'D 3 x', 'D 3.5 1',
    'A 3 256', 'T 8 10 100', 'T 8 440 0', 'T 8 440 20000', 'PING 2', 'OFF 1',
    'D 3 1'.padEnd(40, ' ') + 'X', 'D 123456 1',
  ];
  for (const cmd of bad) assert.equal(b.receive(cmd), 'ERR CMD', JSON.stringify(cmd));
  assert.equal(b.read(3), 0);
});

test('sécurité : tout s’éteint après 3 s sans message', () => {
  const b = board();
  b.receive('D 4 1');
  b.receive('A 5 255');
  b.advance(WATCHDOG_MS - 100);
  assert.equal(b.read(4), 1, 'encore allumée avant 3 s');
  b.advance(200);
  assert.equal(b.read(4), 0);
  assert.equal(b.read(5), 0);
});

test('sécurité : le signe de vie garde les LED allumées', () => {
  const b = board();
  b.receive('D 4 1');
  for (let i = 0; i < 10; i++) {
    b.advance(1000);
    b.receive('PING');
  }
  assert.equal(b.read(4), 1);
});

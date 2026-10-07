// Liaison série simulée : le site parle à la carte simulée, comme avec le vrai câble.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SerialLink, SimulatedTransport, MSG } from '../site/js/serial.js';
import { SimulatedBoard } from '../site/js/simulated-board.js';

// Réveil manuel : le test décide quand le signe de vie part.
function manualTicker() {
  const t = { cb: null, stopped: false };
  t.ticker = (cb) => {
    t.cb = cb;
    return () => (t.stopped = true);
  };
  return t;
}

function setup({ mute = false } = {}) {
  const tick = manualTicker();
  const link = new SerialLink({ ticker: tick.ticker, sleep: async () => {}, replyTimeoutMs: 30 });
  const board = new SimulatedBoard();
  const transport = new SimulatedTransport(board);
  transport.mute = mute;
  return { link, board, transport, tick };
}

test('se connecte : attente du redémarrage puis PING / PONG', async () => {
  const { link, transport } = setup();
  const sent = [];
  const write = transport.write.bind(transport);
  transport.write = (t) => (sent.push(t), write(t));
  const states = [];
  link.subscribe((s) => states.push(s.state));
  const r = await link.connect(transport);
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(sent, ['PING\n']);
  assert.deepEqual(states, ['connexion', 'connectee']);
  await link.disconnect();
});

test('pilote les LED de la carte', async () => {
  const { link, board, transport } = setup();
  await link.connect(transport);
  assert.deepEqual(await link.digitalWrite(7, true), { ok: true });
  assert.equal(board.read(7), 1);
  assert.deepEqual(await link.analogWrite(10, 99), { ok: true });
  assert.equal(board.read(10), 99);
  await link.allOff();
  assert.equal(board.read(7), 0);
  await link.disconnect();
});

test('une broche interdite est refusée AVANT d’être envoyée', async () => {
  const { link, transport } = setup();
  await link.connect(transport);
  const sent = [];
  const write = transport.write.bind(transport);
  transport.write = (t) => (sent.push(t), write(t));
  const r = await link.digitalWrite(1, true);
  assert.equal(r.ok, false);
  assert.match(r.error, /USB/);
  assert.deepEqual(sent, []);
  await link.disconnect();
});

test('carte sans le bon programme : message clair', async () => {
  const { link, transport } = setup({ mute: true });
  const r = await link.connect(transport);
  assert.equal(r.ok, false);
  assert.equal(r.error, MSG.noPong);
  assert.equal(r.needsFirmware, true, 'le site proposera d’installer le programme');
  assert.equal(link.state, 'deconnectee');
});

test('envoie PING à chaque tic et passe en « muette » si la carte se tait', async () => {
  const { link, transport, tick } = setup();
  let now = 0;
  link.now = () => now;
  await link.connect(transport);
  now = 1000;
  await tick.cb();
  assert.equal(link.state, 'connectee');
  transport.mute = true;
  now = 6000;
  await tick.cb();
  assert.equal(link.state, 'muette');
  transport.mute = false;
  now = 7000;
  await tick.cb(); // la carte répond de nouveau
  assert.equal(link.state, 'connectee');
  await link.disconnect();
});

test('câble arraché : état « déconnectée » avec message', async () => {
  const { link, transport, tick } = setup();
  await link.connect(transport);
  transport.unplug();
  assert.equal(link.state, 'deconnectee');
  assert.equal(link.lastError, MSG.unplugged);
  assert.equal(tick.stopped, true, 'le signe de vie est arrêté');
  const r = await link.digitalWrite(3, true);
  assert.equal(r.ok, false);
});

test('déconnexion volontaire : la carte reçoit OFF', async () => {
  const { link, board, transport } = setup();
  await link.connect(transport);
  await link.digitalWrite(5, true);
  await link.disconnect();
  assert.equal(board.read(5), 0);
});

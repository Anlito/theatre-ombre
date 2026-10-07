import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../site/js/protocol.js';

test('fabrique les commandes du cahier des charges', () => {
  assert.equal(P.ping().line, 'PING');
  assert.equal(P.off().line, 'OFF');
  assert.equal(P.digital(13, true).line, 'D 13 1');
  assert.equal(P.digital(2, false).line, 'D 2 0');
  assert.equal(P.analog(9, 128).line, 'A 9 128');
  assert.equal(P.tone(8, 440, 500).line, 'T 8 440 500');
});

test('refuse les broches 0, 1 et au-delà de 13, avec un message en français', () => {
  for (const pin of [0, 1, 14, -3, 2.5, '3', undefined]) {
    const r = P.digital(pin, true);
    assert.equal(r.ok, false, `broche ${pin}`);
    assert.match(r.error, /broche/);
  }
});

test("l'intensité n'est permise que sur les broches PWM", () => {
  assert.equal(P.analog(4, 100).ok, false);
  assert.match(P.analog(4, 100).error, /3, 5, 6, 9, 10, 11/);
  for (const pin of P.PWM_PINS) assert.equal(P.analog(pin, 10).ok, true);
});

test("l'intensité et la note sont ramenées dans les limites", () => {
  assert.equal(P.analog(3, 300).line, 'A 3 255');
  assert.equal(P.analog(3, -5).line, 'A 3 0');
  assert.equal(P.analog(3, 12.6).line, 'A 3 13');
  assert.equal(P.analog(3, 'abc').ok, false);
  assert.equal(P.tone(8, 5, 99999).line, 'T 8 31 10000');
});

test('lit les réponses de la carte', () => {
  assert.deepEqual(P.parseResponse('PONG v1\r'), { type: 'pong', version: 'v1' });
  assert.deepEqual(P.parseResponse('OK'), { type: 'ok' });
  assert.deepEqual(P.parseResponse('ERR PIN'), { type: 'err', code: 'PIN' });
  assert.deepEqual(P.parseResponse('ERR CMD'), { type: 'err', code: 'CMD' });
  assert.equal(P.parseResponse('PRET v1').type, 'other');
  assert.equal(P.parseResponse('\u0000ÿ').type, 'other');
});

test('découpe le flux en lignes, même en morceaux', () => {
  const s = new P.LineSplitter();
  assert.deepEqual(s.push('PO'), []);
  assert.deepEqual(s.push('NG v1\r\nO'), ['PONG v1']);
  assert.deepEqual(s.push('K\n\nERR CMD\n'), ['OK', 'ERR CMD']);
});

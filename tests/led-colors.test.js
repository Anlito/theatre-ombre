// Couleurs des LED choisies par l'équipe : valeurs par défaut, validation, enregistrement dans le projet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LedColors, normalizeLedColors, LED_COLORS } from '../site/js/led-colors.js';
import { serialize, parse } from '../site/js/project.js';
import { normalizeSettings } from '../site/js/settings.js';
import { Training } from '../site/js/training.js';

test('couleurs par défaut dans l’ordre des LED : rouge, bleu, vert, jaune', () => {
  assert.deepEqual(normalizeLedColors({}, [9, 10, 11, 12]), { 9: 'rouge', 10: 'bleu', 11: 'vert', 12: 'jaune' });
});

test('seules les 4 couleurs et les broches 2 à 13 sont acceptées', () => {
  assert.deepEqual(normalizeLedColors({ 9: 'violet', 1: 'rouge', 10: 'jaune', x: 'vert' }, [9, 10]), { 9: 'rouge', 10: 'jaune' });
  assert.deepEqual(Object.keys(LED_COLORS), ['rouge', 'jaune', 'vert', 'bleu']);
});

test('changer la couleur d’une broche prévient l’écran', () => {
  const c = new LedColors(() => [9, 10, 11, 12]);
  let seen = null;
  c.onChange((colors) => (seen = colors));
  c.set(9, 'vert');
  assert.equal(c.get(9), 'vert');
  assert.equal(c.name(9), 'verte');
  assert.equal(c.hex(9), LED_COLORS.vert.hex);
  assert.equal(seen[9], 'vert');
  c.set(9, 'violet'); // refusée
  assert.equal(c.get(9), 'vert');
});

test('les couleurs sont enregistrées dans le projet et retrouvées', () => {
  const c = new LedColors(() => [9, 10, 11, 12]);
  c.set(10, 'jaune');
  const json = JSON.stringify(
    serialize({ settings: normalizeSettings(), categories: new Training().categories, ledColors: c.toJSON(), modelId: 'm' }),
  );
  const r = parse(json, { modelId: 'm' });
  const back = new LedColors(() => [9, 10, 11, 12]);
  back.replace(r.project.ledColors);
  assert.equal(back.get(10), 'jaune');
  assert.equal(back.get(9), 'rouge');
});

test('ancien projet sans couleurs : couleurs par défaut', () => {
  const r = parse(JSON.stringify({ format: 'theatre-ombre', version: 1, personnages: [] }));
  const back = new LedColors(() => [9, 10]);
  back.replace(r.project.ledColors);
  assert.deepEqual(back.toJSON(), { 9: 'rouge', 10: 'bleu' });
});

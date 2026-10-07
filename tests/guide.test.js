// Guide « Que faire ? » : les étapes se cochent selon l'état du travail, dans l'ordre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideSteps } from '../site/js/guide-steps.js';

const vide = { seen: new Set(), characters: [] };

test('au départ : rien n’est fait, l’étape en cours est la webcam', () => {
  const g = guideSteps(vide);
  assert.equal(g.done, 0);
  assert.equal(g.total, 11);
  assert.equal(g.current.id, 'webcam');
  assert.deepEqual(g.steps.map((s) => s.state).slice(0, 2), ['en-cours', 'a-faire']);
});

test('les étapes se cochent selon l’état', () => {
  const s = {
    cameraOn: true,
    backgroundPhotos: 20,
    characters: [{ id: 'a', name: 'Loup', photos: 20 }, { id: 'b', name: 'Roi', photos: 8 }],
    seen: new Set(['a']),
  };
  const g = guideSteps(s);
  assert.deepEqual(g.steps.slice(0, 4).map((x) => x.done), [true, true, true, false]);
  assert.equal(g.current.id, 'photos');
  assert.match(g.current.detail, /Roi \(8\/15\)/);
  assert.equal(g.current.action.label, 'Photographier Roi');
});

test('reconnaissance : la liste des personnages pas encore vus par l’IA', () => {
  const s = {
    cameraOn: true, backgroundPhotos: 15,
    characters: [{ id: 'a', name: 'Loup', photos: 15 }, { id: 'b', name: 'Roi', photos: 15 }],
    seen: new Set(['a']),
  };
  const g = guideSteps(s);
  assert.equal(g.current.id, 'reconnaissance');
  assert.match(g.current.detail, /Roi/);
  assert.doesNotMatch(g.current.detail, /Loup/);
});

test('le câblage se confirme à la main, puis la carte, le programme, le test…', () => {
  const s = {
    cameraOn: true, backgroundPhotos: 15,
    characters: [{ id: 'a', name: 'Loup', photos: 15 }], seen: new Set(['a']),
  };
  assert.equal(guideSteps(s).current.id, 'leds');
  assert.equal(guideSteps(s).current.manual, true);
  assert.equal(guideSteps({ ...s, ledsConfirmed: true }).current.id, 'carte');
  assert.equal(guideSteps({ ...s, ledsConfirmed: true, boardConnected: true }).current.id, 'programme');
  const all = { ...s, ledsConfirmed: true, boardConnected: true, programReady: true, programTested: true, saved: true, showLaunched: true };
  const g = guideSteps(all);
  assert.equal(g.done, 11);
  assert.equal(g.current, null);
});

test('le conseil « écrire le programme » dépend du niveau', () => {
  const s = { ...vide };
  assert.match(guideSteps(s, 1).steps.find((x) => x.id === 'programme').detail, /quand je vois/);
  assert.match(guideSteps(s, 2).steps.find((x) => x.id === 'programme').detail, /quand le programme démarre/);
});

// Carnet de projet : contenu, données, avancement, enregistrement dans le fichier d'équipe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ETAPES, VALIDATIONS, CLIENT } from '../site/js/carnet-contenu.js';
import {
  emptyCarnet, normalizeCarnet, attendus, avancement, avancementGlobal, corrigerComposants, noterAuto, ledsDuProgramme, MAX_PHOTOS,
} from '../site/js/carnet.js';
import { serialize, parse } from '../site/js/project.js';
import { normalizeSettings } from '../site/js/settings.js';

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';

test('le contenu reprend les 5 étapes du document, avec leurs validations ◆', () => {
  assert.deepEqual(ETAPES.map((e) => e.verbe), ['Dessiner', 'Modéliser', 'Réaliser', 'Comprendre', 'Présenter']);
  const valides = ETAPES.flatMap((e) => e.blocs.filter((b) => b.type === 'valide').map((b) => b.id));
  assert.deepEqual(valides, VALIDATIONS.map((v) => v.id), 'chaque validation ◆ apparaît une fois, dans l’ordre');
  // Pas deux fois le même identifiant de réponse.
  const ids = [...CLIENT.attend, ...CLIENT.aussi].map((c) => c.id);
  for (const n of [1, 2, 3, 4, 5]) ids.push(...attendus(n).map((a) => `${a.type}:${a.id}`));
  assert.equal(new Set(ids).size, ids.length);
});

test('ce qui est attendu à chaque étape (la partie facultative 3.6 ne compte pas)', () => {
  assert.deepEqual(attendus(1).map((a) => a.id), [
    'dessins.0.nom', 'dessins.0.hauteur', 'dessins.0.largeur', 'dessins.0.par',
    'dessins.1.nom', 'dessins.1.hauteur', 'dessins.1.largeur', 'dessins.1.par',
    'dessins', 'e1.silhouettes',
  ]);
  const e3 = attendus(3).map((a) => a.id);
  assert.ok(e3.includes('leds.0.perso') && e3.includes('cablage') && e3.includes('e3.enregistre'));
  assert.ok(!e3.some((id) => id.startsWith('cpp')), 'le code C++ est facultatif');
  assert.equal(attendus(4).filter((a) => a.type === 'choix').length, 7, '7 composants à placer');
});

test('avancement : champs remplis, cases cochées, photo ajoutée', () => {
  const c = emptyCarnet();
  assert.deepEqual(avancement(c, 1), { faits: 0, total: 10 });
  c.champs['dessins.0.nom'] = 'Loup';
  c.champs['dessins.0.hauteur'] = '   '; // vide : ne compte pas
  c.cases['e1.silhouettes'] = true;
  c.photos.dessins = [{ id: 'a', data: PHOTO, date: 1 }];
  assert.deepEqual(avancement(c, 1), { faits: 3, total: 10 });
  assert.equal(avancementGlobal(c).length, 5);
});

test('un carnet lu dans un fichier est nettoyé (ancien fichier, valeurs fausses, photos en trop)', () => {
  assert.deepEqual(normalizeCarnet(undefined), emptyCarnet());
  const c = normalizeCarnet({
    classe: '4B',
    champs: { 'dessins.0.nom': 'Loup', 'mauvaise clé !': 'x', vide: '', nombre: 12, long: 'a'.repeat(5000) },
    cases: { 'e1.silhouettes': true, faux: 'oui' },
    choix: { 'composants.webcam': 'info', 'composants.usb': '<script>' },
    photos: { dessins: Array.from({ length: 6 }, (_, i) => ({ id: i, data: PHOTO })), cablage: [{ data: 'javascript:alert(1)' }] },
    auto: { reconnus: ['Loup', 'Loup', 'Lapin'], carte: true, programmeTeste: 'oui' },
  });
  assert.equal(c.classe, '4B');
  assert.deepEqual(Object.keys(c.champs), ['dessins.0.nom', 'long']);
  assert.equal(c.champs.long.length, 1000);
  assert.deepEqual(c.cases, { 'e1.silhouettes': true });
  assert.deepEqual(c.choix, { 'composants.webcam': 'info' });
  assert.equal(c.photos.dessins.length, MAX_PHOTOS);
  assert.equal(c.photos.cablage, undefined, 'une « photo » qui n’est pas une image est refusée');
  assert.deepEqual(c.auto, { reconnus: ['Loup', 'Lapin'], carte: true, programmeTeste: false });
});

test('étape 4 : réponses comparées au corrigé du professeur', () => {
  const c = emptyCarnet();
  c.choix['composants.webcam'] = 'info';
  c.choix['composants.led'] = 'info';
  c.choix['composants.usb'] = 'info'; // accepté s'il est justifié (corrigé)
  const r = Object.fromEntries(corrigerComposants(c).map((x) => [x.id, x.juste]));
  assert.equal(r.webcam, true);
  assert.equal(r.led, false);
  assert.equal(r.usb, true);
  assert.equal(r.arduino, null, 'pas encore répondu');
});

test('le site note ce qu’il constate, une seule fois', () => {
  const c = emptyCarnet();
  assert.equal(noterAuto(c, { reconnu: 'Loup' }), true);
  assert.equal(noterAuto(c, { reconnu: 'Loup' }), false);
  assert.equal(noterAuto(c, { carte: true, programmeTeste: true }), true);
  assert.deepEqual(c.auto, { reconnus: ['Loup'], carte: true, programmeTeste: true });
});

test('le personnage de chaque LED est proposé d’après le programme du niveau 1', () => {
  const blocs = {
    blocks: {
      blocks: [
        { type: 'quand_je_vois', fields: { PERSO: 'p1' }, next: { block: { type: 'attendre', next: { block: { type: 'allumer_led', fields: { PIN: 9 } } } } } },
        { type: 'quand_je_vois', fields: { PERSO: 'p2' }, next: { block: { type: 'allumer_led', fields: { PIN: 10 } } } },
        { type: 'quand_je_ne_vois_plus', fields: { PERSO: 'p1' }, next: { block: { type: 'allumer_led', fields: { PIN: 11 } } } },
      ],
    },
  };
  const noms = { p1: 'Loup', p2: 'Lapin' };
  assert.deepEqual(ledsDuProgramme(blocs, (id) => noms[id]), { 9: 'Loup', 10: 'Lapin' });
  assert.deepEqual(ledsDuProgramme(null, () => ''), {});
});

test('le carnet est enregistré dans le fichier de projet, et un ancien fichier s’ouvre sans carnet', () => {
  const carnet = emptyCarnet();
  carnet.classe = '4B';
  carnet.champs['histoire.titre'] = 'Le loup et la lune';
  carnet.cases['route.1'] = true;
  carnet.photos.cablage = [{ id: 'x', data: PHOTO, date: 5 }];
  const base = { team: ['Léa'], settings: normalizeSettings({}), categories: [], blocks: null, modelId: 'm' };
  const r = parse(JSON.stringify(serialize({ ...base, carnet })), { modelId: 'm' });
  assert.ok(r.ok);
  assert.equal(r.project.carnet.classe, '4B');
  assert.equal(r.project.carnet.champs['histoire.titre'], 'Le loup et la lune');
  assert.equal(r.project.carnet.photos.cablage[0].data, PHOTO);

  const ancien = serialize(base);
  delete ancien.carnet;
  const r2 = parse(JSON.stringify(ancien), { modelId: 'm' });
  assert.ok(r2.ok);
  assert.deepEqual(r2.project.carnet, emptyCarnet());
});

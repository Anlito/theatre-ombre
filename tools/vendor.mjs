// Copie les bibliothèques dans site/vendor/ pour que le site n'utilise AUCUN CDN.
// À lancer une seule fois après « npm install » (ou après une mise à jour) : npm run vendor
// Le dossier site/vendor/ est ensuite publié tel quel avec le site.

import { cp, mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const NM = 'node_modules';
const OUT = 'site/vendor';
const MODEL_DIR = join(OUT, 'mobilenet_v2_050');
const MODEL_URL = 'https://tfhub.dev/google/imagenet/mobilenet_v2_050_224/classification/2';

const copies = [
  ['blockly/blockly_compressed.js', 'blockly/blockly_compressed.js'],
  ['blockly/blocks_compressed.js', 'blockly/blocks_compressed.js'],
  ['blockly/javascript_compressed.js', 'blockly/javascript_compressed.js'],
  ['blockly/msg/fr.js', 'blockly/fr.js'],
  ['blockly/media', 'blockly/media'],
  ['blockly/LICENSE', 'LICENCES/blockly.txt'],
  ['@tensorflow/tfjs/dist/tf.min.js', 'tf.min.js'],
  ['@tensorflow-models/mobilenet/dist/mobilenet.min.js', 'mobilenet.min.js'],
  ['js-interpreter/lib/js-interpreter.min.js', 'js-interpreter.min.js'],
  ['js-interpreter/LICENSE', 'LICENCES/js-interpreter.txt'],
];

for (const [from, to] of copies) {
  await mkdir(join(OUT, to, '..'), { recursive: true });
  await cp(join(NM, from), join(OUT, to), { recursive: true });
  console.log('copié  ', to);
}

// Modèle MobileNet v2 (0.5) : téléchargé une fois depuis TensorFlow Hub, puis servi par le site.
await mkdir(MODEL_DIR, { recursive: true });
const exists = await access(join(MODEL_DIR, 'model.json')).then(() => true, () => false);
if (exists) {
  console.log('modèle déjà présent', MODEL_DIR);
} else {
  const manifest = await download(`${MODEL_URL}/model.json?tfjs-format=file`);
  await writeFile(join(MODEL_DIR, 'model.json'), manifest);
  const paths = JSON.parse(manifest.toString()).weightsManifest.flatMap((m) => m.paths);
  for (const p of paths) {
    await writeFile(join(MODEL_DIR, p), await download(`${MODEL_URL}/${p}?tfjs-format=file`));
    console.log('modèle ', p);
  }
  await writeFile(
    join(OUT, 'LICENCES', 'mobilenet-modele.txt'),
    'MobileNet v2 (alpha 0.5, 224) — Google, TensorFlow Hub. Licence Apache 2.0.\n' + MODEL_URL + '\n',
  );
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}) : ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// TensorFlow.js ne fournit pas de fichier LICENSE dans son paquet npm : on écrit la mention.
await writeFile(
  join(OUT, 'LICENCES', 'tensorflow-js.txt'),
  'TensorFlow.js (@tensorflow/tfjs) et @tensorflow-models/mobilenet — Google LLC.\n' +
    'Licence Apache 2.0 : https://www.apache.org/licenses/LICENSE-2.0\n',
);

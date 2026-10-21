// Dépendance de test seulement : aucune programmation n'est copiée dans site/.
// LABO_THEATRE_SOURCE permet de tester ensemble deux modifications avant publication.
import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const racine = fileURLToPath(new URL('../',import.meta.url));
const cible = path.join(racine,'.cache/labo-theatre');
await mkdir(cible,{recursive:true});
if (process.env.LABO_THEATRE_SOURCE) {
  await cp(path.resolve(process.env.LABO_THEATRE_SOURCE),cible,{recursive:true});
} else {
  const base='https://anlito.github.io/labo-blocs/module/theatre/';
  async function lire(url) {
    const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});
    if (!r.ok) throw new Error('Module central indisponible : '+r.status);
    return r.text();
  }
  const m=JSON.parse(await lire(base+'manifest.json'));
  if (m.format!==1 || !/^[a-f0-9]{20}$/.test(m.revision) || !Array.isArray(m.fichiers)) throw new Error('Manifeste central incompatible.');
  for (const f of m.fichiers) {
    if (!/^[a-zA-Z0-9_./-]+$/.test(f) || f.split('/').includes('..') || f.startsWith('/')) throw new Error('Chemin central invalide.');
    const dest=path.join(cible,f);
    await mkdir(path.dirname(dest),{recursive:true});
    await writeFile(dest,await lire(base+m.revision+'/'+f));
  }
}
JSON.parse(await readFile(path.join(cible,'package.json'),'utf8'));
console.log('Tests reliés à la programmation de Labo Blocs.');

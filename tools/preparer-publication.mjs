// Les imports ES ont tous la révision de la publication : aucun ancien adaptateur
// ne reste en cache quand le point d'entrée et le moteur central sont mis à jour.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export function versionnerModules(texte,revision){
  return texte.replace(/(\bfrom\s*['"])(\.[^'"\n]+\.js)(?:\?[^'"\n]*)?(['"])/g,(_,a,u,b)=>a+u+'?v='+encodeURIComponent(revision)+b)
    .replace(/(\bimport\s*\(\s*['"])(\.[^'"\n]+\.js)(?:\?[^'"\n]*)?(['"])/g,(_,a,u,b)=>a+u+'?v='+encodeURIComponent(revision)+b);
}
export async function preparerPublication(racine,revision){
  async function parcourir(dossier){for(const entree of await readdir(dossier,{withFileTypes:true})){
    if(entree.name==='vendor'||entree.name==='.cache')continue;
    const fichier=path.join(dossier,entree.name);
    if(entree.isDirectory())await parcourir(fichier);
    else if(entree.name.endsWith('.js'))await writeFile(fichier,versionnerModules(await readFile(fichier,'utf8'),revision));
    else if(entree.name.endsWith('.html'))await writeFile(fichier,(await readFile(fichier,'utf8')).replace(/\b(src|href)="(?![a-z]+:|#|\/\/)([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g,(_,a,u)=>a+'="'+u+'?v='+encodeURIComponent(revision)+'"'));
  }}
  await parcourir(racine);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  await preparerPublication(fileURLToPath(new URL('../site/',import.meta.url)),process.env.GITHUB_SHA||Date.now().toString());
  console.log('Fichiers de publication versionnés.');
}

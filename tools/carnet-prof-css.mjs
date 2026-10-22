// Fabrique site/css/carnet-prof.css : les styles du carnet des élèves (règles « .cn- » de site/css/style.css),
// pour l'afficher dans l'outil professeur (prof.html, charte commune). Les couleurs du Théâtre (variables de :root)
// sont limitées à la zone du carnet (.pe-carnet-theatre), pour ne pas changer celles de la charte commune.
// À relancer après une modification du carnet dans style.css :  npm run carnet-prof
// (un test vérifie que le fichier est à jour).
import { readFileSync, writeFileSync } from 'node:fs';

export function fabriquer(css) {
  // Découpe en blocs de premier niveau (règle ou @media), en ignorant les commentaires.
  const texte = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocs = [];
  let profondeur = 0;
  let debut = 0;
  for (let i = 0; i < texte.length; i++) {
    if (texte[i] === '{') profondeur++;
    else if (texte[i] === '}' && --profondeur === 0) {
      blocs.push(texte.slice(debut, i + 1).trim());
      debut = i + 1;
    }
  }
  const variables = blocs.find((b) => b.startsWith(':root {')) ?? ':root {}';
  const corps = variables.slice(variables.indexOf('{') + 1, variables.lastIndexOf('}')).trim();
  const garder = [];
  for (const b of blocs) {
    if (b.startsWith('@media print')) continue;
    if (b.startsWith('@media') || b.startsWith('@keyframes')) {
      if (!b.includes('.cn-') && !b.startsWith('@keyframes cn-')) continue;
      if (b.startsWith('@keyframes')) {
        garder.push(b);
        continue;
      }
      // Dans un @media : seulement les règles du carnet.
      const entete = b.slice(0, b.indexOf('{')).trim();
      const interieur = b.slice(b.indexOf('{') + 1, b.lastIndexOf('}'));
      const regles = interieur.match(/[^{}]+\{[^{}]*\}/g) ?? [];
      const carnet = regles.map((r) => r.trim()).filter((r) => r.slice(0, r.indexOf('{')).includes('.cn-'));
      if (carnet.length) garder.push(`${entete} {\n  ${carnet.join('\n  ')}\n}`);
    } else if (b.slice(0, b.indexOf('{')).includes('.cn-')) garder.push(b);
  }
  return (
    '/* Fichier fabriqué par tools/carnet-prof-css.mjs à partir de site/css/style.css : ne pas le modifier à la main. */\n' +
    '/* Carnet des élèves affiché dans l’outil professeur, avec les couleurs du Théâtre limitées à sa zone. */\n' +
    `.pe-carnet-theatre {\n  ${corps.replace(/\n\s*/g, '\n  ')}\n  --bande: 0px;\n  color: var(--texte);\n  font-family: var(--police);\n}\n` +
    garder.join('\n') + '\n'
  );
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('carnet-prof-css.mjs')) {
  const source = new URL('../site/css/style.css', import.meta.url);
  const cible = new URL('../site/css/carnet-prof.css', import.meta.url);
  const extra = readFileSync(new URL('../site/css/prof-theatre.css', import.meta.url), 'utf8');
  writeFileSync(cible, fabriquer(readFileSync(source, 'utf8')) + '\n' + extra);
  console.log('site/css/carnet-prof.css mis à jour.');
}

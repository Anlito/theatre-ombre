// Prépare les icônes, le logo et le favicon livrés par Claude Design pour le site :
//  - retire les métadonnées de provenance (≈ 8 Ko par fichier pour un dessin de 200 octets) ;
//  - copie les SVG propres dans site/img/ ;
//  - génère site/js/icons.js (dessins en ligne : les icônes prennent la couleur du texte).
// À relancer si Claude Design livre de nouvelles icônes : node tools/icones.mjs

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const SRC = 'design/retour-claude-design/design_handoff_theatre_ombre';
const clean = (svg) =>
  svg
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
    .replace(/\s+xmlns:c2pa="[^"]*"/g, '')
    .trim();

await mkdir('site/img/icones', { recursive: true });
const icons = {};
for (const file of (await readdir(join(SRC, 'icones'))).filter((f) => f.endsWith('.svg')).sort()) {
  const svg = clean(await readFile(join(SRC, 'icones', file), 'utf8'));
  await writeFile(join('site/img/icones', file), svg + '\n');
  icons[file.replace(/\.svg$/, '')] = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}
for (const f of ['logo.svg', 'favicon.svg']) await writeFile(join('site/img', f), clean(await readFile(join(SRC, f), 'utf8')) + '\n');

const js = `// Icônes de l'outil (dessinées par Claude Design, grille 24, trait 2, licence du projet).
// Fichier GÉNÉRÉ par tools/icones.mjs : ne pas modifier à la main.
//   icon('led')                    -> <svg> à insérer dans du HTML
//   <span data-icon="led"></span>  -> remplacé au démarrage par hydrateIcons()

export const ICONS = ${JSON.stringify(icons, null, 2)};

export function icon(name, { size = 20, stroke = 2, label = '' } = {}) {
  const body = ICONS[name] ?? '';
  const a11y = label ? \`role="img" aria-label="\${label}"\` : 'aria-hidden="true" focusable="false"';
  return \`<svg class="ico ico-\${name}" width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="\${stroke}" stroke-linecap="round" stroke-linejoin="round" \${a11y}>\${body}</svg>\`;
}

export function hydrateIcons(root = document) {
  for (const el of root.querySelectorAll('[data-icon]')) {
    if (el.dataset.iconDone) continue;
    el.innerHTML = icon(el.dataset.icon, { size: Number(el.dataset.size) || 20, stroke: Number(el.dataset.stroke) || 2 });
    el.dataset.iconDone = '1';
  }
}
`;
await writeFile('site/js/icons.js', js);
console.log(Object.keys(icons).length, 'icônes :', Object.keys(icons).join(', '));

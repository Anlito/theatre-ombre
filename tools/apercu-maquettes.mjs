// Photographie chaque écran des maquettes Claude Design (éléments [data-screen-label]).
// node tools/apercu-maquettes.mjs  ->  design/retour-claude-design/apercus/*.png
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const DIR = 'design/retour-claude-design/design_handoff_theatre_ombre/maquettes';
const OUT = 'design/retour-claude-design/apercus';
await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  defaultViewport: { width: 1600, height: 1000 },
});
try {
  for (const file of ['Ecrans 1a.dc.html', 'Identite Theatre Ombre.dc.html']) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.log('erreur :', e.message));
    await page.goto(pathToFileURL(resolve(DIR, file)).href, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));
    const labels = await page.$$eval('[data-screen-label]', (els) => els.map((e) => e.getAttribute('data-screen-label')));
    console.log(file, '->', labels.length, 'écrans :', labels.join(' | '));
    const els = await page.$$('[data-screen-label]');
    for (let i = 0; i < els.length; i++) {
      const name = `${file.startsWith('Ecrans') ? 'ecran' : 'identite'}-${String(i + 1).padStart(2, '0')}-${labels[i].replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}.png`;
      await els[i].screenshot({ path: `${OUT}/${name}` });
    }
    if (!els.length) await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}

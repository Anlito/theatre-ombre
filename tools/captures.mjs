// Captures d'écran de tous les écrans de l'outil, pour le brief graphique (Claude Design).
// npm run captures   ->  design/captures/*.png  (1366 × 768, comme les maquettes ; CAPTURES_W / CAPTURES_H pour changer)
//
// Le script lance le site en local, pilote Chrome, remplace la webcam par une fausse vidéo
// (silhouettes dessinées), entraîne l'IA, écrit des programmes et ouvre chaque écran.

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const PORT = 8091;
const OUT = 'design/captures';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = `http://localhost:${PORT}`;

const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(800);
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--window-size=1366,768', '--lang=fr-FR'],
  defaultViewport: { width: Number(process.env.CAPTURES_W) || 1366, height: Number(process.env.CAPTURES_H) || 768 },
});

let n = 0;
async function shot(page, name, { full = false } = {}) {
  await wait(400);
  const file = `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: file, fullPage: full });
  console.log('capture', file);
}

try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('erreur page :', e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(`${URL}/?carte=simulee`, { waitUntil: 'networkidle0' });
  await wait(1500);

  // Fausse webcam : écran de théâtre éclairé + silhouettes noires.
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    const g = c.getContext('2d');
    let shape = 'fond';
    function draw() {
      const grad = g.createRadialGradient(320, 220, 40, 320, 240, 420);
      grad.addColorStop(0, '#fff7e0');
      grad.addColorStop(1, '#e9d8b0');
      g.fillStyle = grad;
      g.fillRect(0, 0, 640, 480);
      g.fillStyle = '#111';
      const j = (Math.random() - 0.5) * 30;
      g.beginPath();
      if (shape === 'loup') {
        g.moveTo(170 + j, 420); g.lineTo(200 + j, 260); g.lineTo(250 + j, 230); g.lineTo(270 + j, 150); g.lineTo(300 + j, 200);
        g.lineTo(330 + j, 140); g.lineTo(345 + j, 210); g.lineTo(420 + j, 230); g.lineTo(380 + j, 260); g.lineTo(460 + j, 420);
      } else if (shape === 'sorciere') {
        g.moveTo(320 + j, 60); g.lineTo(370 + j, 170); g.lineTo(420 + j, 180); g.lineTo(220 + j, 180); g.lineTo(275 + j, 170);
        g.closePath(); g.fill(); g.beginPath(); g.arc(320 + j, 215, 38, 0, 7); g.fill(); g.beginPath();
        g.moveTo(250 + j, 440); g.lineTo(290 + j, 250); g.lineTo(350 + j, 250); g.lineTo(400 + j, 440);
      } else if (shape === 'roi') {
        g.arc(320 + j, 200, 55, 0, 7); g.fill(); g.beginPath();
        g.moveTo(265 + j, 140); g.lineTo(280 + j, 95); g.lineTo(300 + j, 125); g.lineTo(320 + j, 85); g.lineTo(340 + j, 125);
        g.lineTo(360 + j, 95); g.lineTo(375 + j, 140); g.closePath(); g.fill(); g.beginPath(); g.rect(255 + j, 255, 130, 200);
      }
      g.fill();
    }
    window.__shape = (s) => { shape = s; draw(); };
    draw();
    setInterval(draw, 60);
    const T = window.theatre;
    T.camera.video.srcObject = c.captureStream(25);
    await T.camera.video.play();
    T.camera.setState('on');
  });

  // 1. Fenêtre de démarrage
  await page.type('.team-name:nth-of-type(1)', 'Léa');
  await page.type('.team-name:nth-of-type(2)', 'Tom');
  await page.type('.team-name:nth-of-type(3)', 'Inès');
  await shot(page, 'demarrage-prenoms');

  await page.click('[data-start="new"]');
  await wait(500);
  // Guide « Que faire ? » : ouvert automatiquement au premier projet.
  await page.evaluate(() => (document.getElementById('banner').hidden = true));
  await shot(page, 'guide-que-faire');
  await page.click('#guide-panel [data-close]');
  await page.evaluate(() => (document.getElementById('banner').hidden = true));

  // 2. Entraîner : écran vide
  await page.evaluate(() => (document.getElementById('banner').hidden = true));
  await shot(page, 'entrainer-debut');

  // Entraînement : fond vide + 3 personnages (rafales simulées).
  await page.evaluate(async () => {
    const T = window.theatre;
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    const ids = {
      fond: 'fond',
      loup: T.training.addCategory('Loup').category.id,
      sorciere: T.training.addCategory('Sorcière').category.id,
      roi: T.training.addCategory('Roi').category.id,
    };
    window.__ids = ids;
    for (const [shape, id] of Object.entries(ids)) {
      window.__shape(shape);
      await pause(800);
      T.live.startCapture(id);
      while (T.training.get(id).examples.length < 22) await pause(100);
      T.live.stopCapture();
    }
    window.__shape('loup');
    await pause(2500);
  });
  await page.evaluate(() => (document.getElementById('banner').hidden = true));
  await shot(page, 'entrainer-ia-prete');
  await page.evaluate(() => document.querySelector('.why')?.setAttribute('open', ''));
  await shot(page, 'entrainer-pourquoi', { full: true });

  // Carte simulée connectée.
  // Connexion : clic sur la pastille Carte -> rappel du câblage -> Connecter.
  await page.click('#pill-board');
  await wait(300);
  await shot(page, 'connexion-rappel-cablage');
  await page.click('#btn-connect');
  await wait(800);

  // 3. Programmer, niveau 1
  await page.click('[data-step="programmer"]');
  await wait(500);
  await page.evaluate(async () => {
    const T = window.theatre;
    const id = window.__ids;
    const b = (type, extra = {}) => ({ block: { type, ...extra } });
    T.program.loadBlocks({
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'quand_je_vois', x: 20, y: 20, fields: { PERSO: id.loup }, next: b('allumer_led', { fields: { PIN: '9' }, next: b('jouer_son', { fields: { SON: 'b:tonnerre' } }) }) },
          { type: 'quand_je_ne_vois_plus', x: 20, y: 290, fields: { PERSO: id.loup }, next: b('eteindre_led', { fields: { PIN: '9' } }) },
          { type: 'quand_je_vois', x: 430, y: 20, fields: { PERSO: id.roi }, next: b('allumer_led', { fields: { PIN: '10' }, next: b('attendre', { inputs: { DUREE: { shadow: { type: 'math_number', fields: { NUM: 2 } } } }, next: b('eteindre_led', { fields: { PIN: '10' } }) }) }) },
        ],
      },
    });
    await T.board.digitalWrite(9, true);
    document.getElementById('banner').hidden = true;
  });
  await page.evaluate(() => window.theatre.program.resize());
  await shot(page, 'programmer-niveau1');

  // Niveau 2
  await page.click('#level-switch [data-level="2"]');
  await wait(400);
  await page.evaluate(() => {
    const T = window.theatre;
    const id = window.__ids;
    const b = (type, extra = {}) => ({ block: { type, ...extra } });
    T.program.loadBlocks({
      parNiveau: {
        1: T.program.saveBlocks().parNiveau['1'],
        2: {
          variables: [{ name: 'passages', id: 'v1' }],
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: 'au_demarrage', x: 20, y: 20,
                next: b('variables_set', {
                  fields: { VAR: { id: 'v1' } }, inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } },
                  next: b('repeter_toujours', {
                    inputs: {
                      DO: b('controls_if', {
                        extraState: { hasElse: true },
                        inputs: {
                          IF0: b('ia_je_vois', { fields: { PERSO: id.loup } }),
                          DO0: b('allumer_led', { fields: { PIN: '9' }, next: b('ecrire', { inputs: { TEXTE: b('ia_personnage_vu') } }) }),
                          ELSE: b('eteindre_led', { fields: { PIN: '9' } }),
                        },
                      }),
                    },
                  }),
                }),
              },
            ],
          },
        },
      },
    });
    document.getElementById('banner').hidden = true;
  });
  await page.click('#btn-run');
  await wait(1500);
  await page.evaluate(() => (document.getElementById('banner').hidden = true));
  await shot(page, 'programmer-niveau2');
  await page.click('#btn-run');

  // Niveau 3 : code C++, un bloc sélectionné
  await page.click('#level-switch [data-level="3"]');
  await wait(600);
  await page.evaluate(() => {
    const ws = window.theatre.program.workspace;
    const block = ws.getAllBlocks(false).find((x) => x.type === 'allumer_led');
    window.Blockly.getFocusManager().focusNode(block);
    ws.getParentSvg().parentElement.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    document.getElementById('banner').hidden = true;
  });
  await wait(600);
  await shot(page, 'programmer-niveau3-code');

  // Aide
  await page.click('#help-menu-btn');
  await shot(page, 'menu-aide');
  await page.click('#btn-help');
  await shot(page, 'aide');
  await page.keyboard.press('Escape');

  // Spectacle : rideau fermé, puis ouvert (plein écran simulé)
  await page.click('#level-switch [data-level="1"]');
  await page.click('[data-step="spectacle"]');
  await wait(500);
  await page.evaluate(() => (document.getElementById('banner').hidden = true));
  await shot(page, 'spectacle-rideau-ferme');
  await page.evaluate(async () => {
    const screen = document.getElementById('screen-spectacle');
    screen.classList.add('is-fullscreen');
    document.getElementById('theatre-title').textContent = "Le théâtre d'ombre de Léa, Tom, Inès";
    document.getElementById('theatre').classList.add('is-open');
    window.scrollTo(0, 0);
    Object.assign(screen.style, { position: 'fixed', inset: '0', zIndex: '1000' });
  });
  await wait(2300);
  await shot(page, 'spectacle-rideau-ouvert');
  await page.evaluate(() => {
    const screen = document.getElementById('screen-spectacle');
    screen.classList.remove('is-fullscreen');
    screen.removeAttribute('style');
  });

  // Mode professeur
  await page.click('[data-step="entrainer"]');
  await page.click('#btn-teacher');
  await page.type('#teacher-code', '2534');
  await page.keyboard.press('Enter');
  await wait(400);
  await shot(page, 'mode-professeur');
  await page.click('#teacher-close');

  // Panneaux : câblage, sons, menu équipe
  await page.click('[data-step="programmer"]');
  await wait(400);
  await page.click('#btn-cablage');
  await shot(page, 'panneau-cablage');
  await page.keyboard.press('Escape');
  await page.click('#btn-sounds');
  await shot(page, 'panneau-sons');
  await page.keyboard.press('Escape');
  await page.click('#team-menu-btn');
  await shot(page, 'menu-equipe');
  await page.keyboard.press('Escape');

  // Pages annexes
  for (const [file, name] of [
    ['comprendre-ia.html', 'cours-comprendre-ia'],
    ['cablage.html', 'cablage-des-led'],
    ['diagnostic.html', 'diagnostic-du-poste'],
  ]) {
    const p = await browser.newPage();
    await p.goto(`${URL}/${file}`, { waitUntil: 'networkidle0' });
    await shot(p, name);
    await shot(p, name + '-page-entiere', { full: true });
    await p.close();
  }
} finally {
  await browser.close();
  server.kill();
}

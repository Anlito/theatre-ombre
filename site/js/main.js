// Point d'entrée du site : relie les écrans, la carte et les boutons.

import { SerialLink, WebSerialTransport, SimulatedTransport, serialSupport } from './serial.js';
import { SimulatedBoard } from './simulated-board.js';
import { Board, renderBoardPanel } from './board.js';
import { setupHelp } from './ui/help.js';
import { Camera } from './camera.js';
import { Training } from './training.js';
import { Live } from './live.js';
import { initialSettings } from './settings.js';
import { CONFIG } from '../config.js';
import * as vision from './vision.js';
import { setupTrainScreen } from './ui/train.js';
import { setupCameraPanel } from './ui/camera-panel.js';
import { setupSpectacle } from './ui/spectacle.js';
import { SoundBank } from './sounds.js';
import { setupProgramScreen } from './ui/program.js';
import { setupProjects } from './ui/project-ui.js';
import { setupTeacherMode } from './ui/teacher.js';
import { setupMenus } from './ui/menus.js';
import { setupCablage } from './ui/cablage.js';
import { hydrateIcons, icon } from './icons.js';
import { LedColors } from './led-colors.js';
import { setupGuide } from './ui/guide.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ?carte=simulee : mode démo sans carte branchée (pour préparer le cours chez soi).
const SIMULATED = params.get('carte') === 'simulee';

hydrateIcons();
setupMenus();

const link = new SerialLink();
const board = new Board(link);
// Réglages : config.js, puis ceux du poste (mode professeur), puis l'adresse (?niveau=2&broches=9,10).
const settings = initialSettings(CONFIG, location.search);
// Couleur de la LED branchée sur chaque broche (choisie par l'équipe, enregistrée dans le projet).
const ledColors = new LedColors(() => settings.ledPins);
const camera = new Camera(document.getElementById('video'));
const training = new Training();
const live = new Live({ camera, training, settings });
const sounds = new SoundBank();
let program = null; // écran Programmer (créé plus bas)
let projects = null; // enregistrement des projets (créé plus bas)
let currentStep = 'entrainer';

// Les autres modules (programme, sons…) écoutent « tout-eteindre » pour s'arrêter.
export const bus = new EventTarget();

// --- Bandeau de message -------------------------------------------------------
const BANNER_ICON = { error: 'attention', info: 'info', ok: 'ok' };
function showMessage(text, kind = 'error') {
  $('banner-text').textContent = text;
  $('banner').dataset.kind = kind;
  $('banner').querySelector('.banner-icon').innerHTML = icon(BANNER_ICON[kind] ?? 'info');
  $('banner').hidden = false;
}
function hideMessage() {
  $('banner').hidden = true;
}
$('banner-close').addEventListener('click', hideMessage);

// --- Pastilles d'état : toujours une icône + un mot ; l'icône devient « attention » en cas d'erreur ----
const PILL_ICONS = { 'pill-board': 'carte', 'pill-camera': 'webcam', 'pill-model': 'ia', 'stage-board-pill': 'carte' };
function setPill(id, state, word) {
  const pill = $(id);
  pill.dataset.state = state;
  pill.querySelector('.pill-word').textContent = word;
  pill.querySelector('.pill-icon').innerHTML = icon(state === 'warn' ? 'attention' : PILL_ICONS[id], { size: 18, stroke: 2.2 });
}

const BOARD_PILL = {
  deconnectee: ['off', 'Connecter'],
  connexion: ['busy', 'connexion…'],
  connectee: ['on', 'connectée'],
  muette: ['warn', 'ne répond plus'],
};

link.subscribe(({ state, error }) => {
  let [pillState, word] = BOARD_PILL[state];
  if (SIMULATED && state === 'connectee') [pillState, word] = ['neutral', 'simulée'];
  setPill('pill-board', pillState, word);
  setPill('stage-board-pill', pillState, word === 'Connecter' ? 'à connecter' : word);
  $('pill-board').title = link.connected ? 'Carte connectée : cliquer pour la déconnecter' : 'Connecter la carte Arduino';
  if (error) showMessage(error);
  else if (state === 'connectee') hideMessage();
});

// --- Connexion à la carte : clic sur la pastille -> rappel du câblage -> choix du port --------
const connectDialog = $('connect-dialog');
function openConnect() {
  const connected = link.connected;
  $('connect-title').textContent = connected ? 'Carte connectée' : 'Connecter la carte';
  $('connect-before').hidden = connected;
  $('connect-connected').hidden = !connected;
  $('btn-connect').innerHTML = icon('carte') + (connected ? 'Déconnecter' : 'Connecter la carte');
  $('btn-connect').className = connected ? 'btn btn-secondary' : 'btn btn-primary';
  cablage.render();
  connectDialog.showModal();
}
$('pill-board').addEventListener('click', openConnect);

$('btn-connect').addEventListener('click', async () => {
  connectDialog.close();
  if (link.connected) {
    await link.disconnect();
    return;
  }
  if (SIMULATED) {
    await link.connect(new SimulatedTransport(new SimulatedBoard()), { bootDelayMs: 300 });
    return;
  }
  const support = serialSupport();
  if (!support.ok) {
    showMessage(support.error);
    return;
  }
  const port = await WebSerialTransport.choosePort();
  if (!port) {
    showMessage('Aucune carte choisie. Vérifie le câble USB, puis clique sur la pastille « Carte · Connecter ».', 'info');
    return;
  }
  showMessage('Connexion à la carte… (2 secondes, la carte redémarre)', 'info');
  await link.connect(new WebSerialTransport(port));
});

// --- Tout éteindre ------------------------------------------------------------------
async function allOff() {
  bus.dispatchEvent(new Event('tout-eteindre'));
  program?.stop();
  sounds.stopAll();
  if (link.connected) await board.allOff();
}
$('btn-all-off').addEventListener('click', allOff);

// Page fermée : on prévient la carte (et de toute façon elle s'éteint seule après 3 s).
addEventListener('pagehide', () => {
  link.transport?.write('OFF\n').catch(() => {});
});

// --- Étapes ------------------------------------------------------------------------
const STEPS = ['entrainer', 'programmer', 'spectacle'];
function goTo(step) {
  currentStep = step;
  document.body.dataset.step = step;
  for (const b of document.querySelectorAll('.step')) {
    if (b.dataset.step === step) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
    // Étape « faite » : l'IA est prête pour Entraîner ; les étapes déjà passées pour les autres.
    const done = b.dataset.step === 'entrainer' ? training.ready && step !== 'entrainer' : STEPS.indexOf(b.dataset.step) < STEPS.indexOf(step);
    b.classList.toggle('is-done', done);
  }
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.dataset.screen !== step;
  moveCameraPanel(step);
  camera.video.play().catch(() => {});
  if (step === 'programmer') program?.resize();
}
for (const b of document.querySelectorAll('.step')) b.addEventListener('click', () => goTo(b.dataset.step));

// --- Webcam, IA et écrans -------------------------------------------------------------
const cablage = setupCablage({ settings, ledColors });
const moveCameraPanel = setupCameraPanel({ camera, training, live, settings, board, ledColors });
const train = setupTrainScreen({ training, live, camera, showMessage });
program = setupProgramScreen({
  training, sounds, board, link, live, settings, camera, showMessage, hideMessage,
  getTeam: () => projects?.state.team ?? [],
  onLevelChange: () => projects?.touch(),
});
const spectacle = setupSpectacle({
  training, live, board, settings, ledColors, allOff, showMessage,
  onStart: () => program.runtime.running || program.start(),
  getTeam: () => projects?.state.team ?? [],
});
setupHelp({ settings, getStep: () => currentStep });
goTo('entrainer');

// Réglages modifiés (mode professeur ou projet rechargé) : on met à jour les écrans.
function onSettingsChanged() {
  program.applySettings();
  renderLeds();
  spectacle.renderSpots();
  cablage.render();
}
projects = setupProjects({
  training, sounds, settings, program, ledColors, onSettingsChanged, showMessage, hideMessage,
  onTeamChange: () => spectacle.renderTitle(),
});
setupTeacherMode({ settings, onSettingsChanged, showMessage });
const guide = setupGuide({ camera, training, link, live, board, program, projects, settings, train, cablage, openConnect, goTo });
projects.showStart({ firstTime: true });

let lastCameraError = null;
camera.subscribe(({ state, error }) => {
  const pill = { off: ['off', 'à connecter'], busy: ['busy', 'démarrage…'], on: ['on', 'connectée'], error: ['warn', 'problème'] };
  setPill('pill-camera', ...pill[state]);
  if (error) showMessage(error);
  else if (state === 'on' && lastCameraError && $('banner-text').textContent === lastCameraError) hideMessage();
  lastCameraError = error;
});

let modelLoaded = false;
function updateModelPill() {
  if (!modelLoaded) return;
  if (training.ready) setPill('pill-model', 'on', 'prête');
  else setPill('pill-model', 'busy', 'à entraîner');
}
training.onChange(updateModelPill);

async function startAI() {
  setPill('pill-model', 'busy', 'chargement…');
  try {
    await vision.loadModel();
    modelLoaded = true;
    updateModelPill();
    live.start();
  } catch (e) {
    console.error(e);
    setPill('pill-model', 'warn', 'problème');
    showMessage("L'IA n'a pas pu se charger (fichiers du site inaccessibles ?). Recharge la page ; si ça recommence, préviens le professeur.");
  }
}
camera.start();
startAI();

// --- Panneau des broches : état des LED + couleur choisie par l'équipe -------------------------
function renderLeds() {
  renderBoardPanel($('board-panel'), board.pins, settings.ledPins, { colors: ledColors, editable: true });
}
board.onChange(renderLeds);
renderLeds();
$('board-panel').addEventListener('change', (e) => {
  const select = e.target.closest('.pin-color');
  if (!select) return;
  ledColors.set(Number(select.dataset.pin), select.value);
  select.closest('.pin').style.setProperty('--led', ledColors.hex(Number(select.dataset.pin)));
});
// Couleur changée : puces, bande du niveau 3, projecteurs du théâtre, câblage ; le projet est modifié.
ledColors.onChange(() => {
  spectacle.renderSpots();
  cablage.render();
  projects?.touch();
});

// --- Vérification du navigateur au démarrage ------------------------------------------
if (SIMULATED) {
  showMessage('Mode démo : la carte est simulée. Les LED s’affichent à l’écran (étape 2).', 'info');
} else {
  const support = serialSupport();
  if (!support.ok) showMessage(support.error);
}

// Pour les essais dans la console du navigateur (F12).
window.theatre = { link, board, bus, camera, training, live, settings, sounds, program, projects, ledColors, guide };

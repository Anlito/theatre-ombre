// Page de diagnostic : vérifie qu'un poste peut faire fonctionner l'outil.
import { SerialLink, WebSerialTransport, serialSupport } from './serial.js';
import { PINS } from './protocol.js';
import { icon, hydrateIcons } from './icons.js';
import { setupFirmwareDialog } from './ui/firmware.js';

hydrateIcons();

const $ = (id) => document.getElementById(id);
const results = {};

function addCheck(key, ok, title, detail = '') {
  results[key] = ok === null ? 'à tester' : ok ? 'OK' : 'PROBLÈME';
  let el = document.querySelector(`[data-check="${key}"]`);
  if (!el) {
    el = document.createElement('div');
    el.className = 'check';
    el.dataset.check = key;
    $('checks').append(el);
  }
  const ico = icon(ok === null ? 'info' : ok ? 'ok' : 'attention', { size: 22 });
  const word = ok === null ? 'à tester' : ok ? 'OK' : 'problème';
  el.dataset.ok = String(ok);
  el.innerHTML = `<span class="check-icon">${ico}</span><strong>${title} · ${word}</strong>`;
  if (detail) {
    const d = document.createElement('span');
    d.className = 'check-detail';
    d.textContent = detail;
    el.append(d);
  }
  updateReport();
}

function browserName() {
  const brands = navigator.userAgentData?.brands?.map((b) => `${b.brand} ${b.version}`) ?? [];
  const known = brands.find((b) => /Chrome|Edge/.test(b));
  return known ?? navigator.userAgent;
}

function updateReport() {
  const lines = [
    `Date : ${new Date().toLocaleString('fr-FR')}`,
    `Navigateur : ${browserName()}`,
    `Adresse : ${location.origin}`,
    ...Object.entries(results).map(([k, v]) => `${k} : ${v}`),
  ];
  $('report').value = lines.join('\n');
}

// 1. Vérifications automatiques ------------------------------------------------------
const isChromium = !!navigator.userAgentData?.brands?.some((b) => /Chrom|Edge/.test(b.brand));
addCheck('navigateur', isChromium, 'Navigateur Chrome ou Edge',
  isChromium ? browserName() : 'Ouvrez cette page avec Google Chrome ou Microsoft Edge.');
addCheck('https', window.isSecureContext, 'Site sécurisé (https ou localhost)',
  window.isSecureContext ? location.origin : 'La webcam et la carte refusent de fonctionner en http simple.');
const serial = serialSupport();
addCheck('web-serial', serial.ok, 'Web Serial (parler à la carte)',
  serial.ok ? '' : serial.error + ' Si le navigateur est bien Chrome/Edge, Web Serial est peut-être bloqué par une règle du service informatique.');
addCheck('camera-api', !!navigator.mediaDevices?.getUserMedia, 'Accès webcam possible');
const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
addCheck('webgl', !!gl, 'Accélération graphique (WebGL)',
  gl ? '' : "L'IA marchera, mais plus lentement (sans carte graphique).");
addCheck('webcam', null, 'Image de la webcam', 'Cliquez sur « Tester la webcam ».');
addCheck('ia', null, "Chargement de l'IA", 'Cliquez sur « Charger l’IA ».');
addCheck('carte', null, 'Carte Arduino', 'Cliquez sur « Connecter l’Arduino ».');

// 2. Webcam ----------------------------------------------------------------------------
$('btn-cam').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    $('video').srcObject = stream;
    $('video').hidden = false;
    const label = stream.getVideoTracks()[0]?.label ?? '';
    addCheck('webcam', true, 'Image de la webcam', label);
  } catch (e) {
    const detail = e.name === 'NotAllowedError'
      ? "L'accès à la webcam a été refusé. Cliquez sur l'icône 📷 dans la barre d'adresse pour l'autoriser."
      : e.name === 'NotFoundError'
        ? 'Aucune webcam trouvée. Vérifiez le branchement USB.'
        : 'Webcam indisponible (déjà utilisée par un autre logiciel ?). ' + e.name;
    addCheck('webcam', false, 'Image de la webcam', detail);
  }
});

// 3. IA ----------------------------------------------------------------------------------
$('btn-model').addEventListener('click', async () => {
  addCheck('ia', null, "Chargement de l'IA", 'Chargement…');
  const t0 = performance.now();
  try {
    await loadScript('vendor/tf.min.js');
    await loadScript('vendor/mobilenet.min.js');
    await tf.ready();
    const model = await mobilenet.load({
      version: 2, alpha: 0.5, modelUrl: 'vendor/mobilenet_v2_050/model.json', inputRange: [0, 1],
    });
    const t1 = performance.now();
    // Vitesse : 10 analyses d'une image noire.
    const img = tf.zeros([224, 224, 3]);
    const analyse = async () => {
      const out = model.infer(img, true);
      await out.data(); // attend la fin réelle du calcul
      out.dispose();
    };
    for (let i = 0; i < 3; i++) await analyse(); // échauffement
    const t2 = performance.now();
    for (let i = 0; i < 10; i++) await analyse();
    const perImage = (performance.now() - t2) / 10;
    img.dispose();
    addCheck('ia', true, "Chargement de l'IA",
      `Chargée en ${((t1 - t0) / 1000).toFixed(1)} s, ${perImage.toFixed(0)} ms par image (moteur : ${tf.getBackend()}).`);
  } catch (e) {
    addCheck('ia', false, "Chargement de l'IA", 'Fichiers du modèle inaccessibles (réseau filtré ?) : ' + e.message);
  }
});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(src));
    document.head.append(s);
  });
}

// 4. Carte ------------------------------------------------------------------------------
$('pin').append(...PINS.map((p) => new Option(`${p}`, p)));
$('pin').value = '13'; // LED intégrée à la carte
const link = new SerialLink();
link.subscribe(({ state, error }) => {
  const on = link.connected;
  for (const id of ['btn-on', 'btn-off', 'btn-alloff']) $(id).disabled = !on;
  $('btn-connect').innerHTML = icon('carte') + (on ? 'Déconnecter' : "Connecter l'Arduino");
  if (state === 'connectee') addCheck('carte', true, 'Carte Arduino', 'La carte répond (PONG v1).');
  if (error) addCheck('carte', false, 'Carte Arduino', error);
});

// Carte sans le bon programme : on propose de l'installer depuis cette page.
const firmware = setupFirmwareDialog({ link, showMessage: (t) => ($('board-msg').textContent = t) });

$('btn-connect').addEventListener('click', async () => {
  if (link.connected) return link.disconnect();
  if (!serial.ok) return addCheck('carte', false, 'Carte Arduino', serial.error);
  const port = await WebSerialTransport.choosePort();
  if (!port) {
    return addCheck('carte', false, 'Carte Arduino',
      "Aucune carte choisie. Si la liste était vide : câble USB, ou pilote CH340 manquant sur ce poste (droits administrateur nécessaires pour l'installer).");
  }
  $('board-msg').textContent = 'Connexion… (2 secondes)';
  const r = await link.connect(new WebSerialTransport(port));
  $('board-msg').textContent = '';
  if (r.needsFirmware) firmware.offer(port);
});

async function order(promise) {
  const r = await promise;
  $('board-msg').textContent = r.ok ? 'OK' : r.error;
}
$('btn-on').addEventListener('click', () => order(link.digitalWrite(Number($('pin').value), true)));
$('btn-off').addEventListener('click', () => order(link.digitalWrite(Number($('pin').value), false)));
$('btn-alloff').addEventListener('click', () => order(link.allOff()));

// 5. Copier ------------------------------------------------------------------------------
$('btn-copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('report').value).catch(() => $('report').select());
});

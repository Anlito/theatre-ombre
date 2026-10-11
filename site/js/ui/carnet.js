// Écran « Carnet » : le document de projet de l'équipe, rempli dans le site.
// Le carnet est enregistré dans le fichier de projet ; le site y note aussi ce qu'il constate
// (personnages reconnus, carte connectée, programme testé) et propose les personnages des LED.

import { emptyCarnet, normalizeCarnet, noterAuto, ledsDuProgramme } from '../carnet.js';
import { renderCarnet } from './carnet-vue.js';
import { icon } from '../icons.js';

const PHOTO_MAX_PX = 1600; // côté le plus long : assez pour lire une feuille A4, environ 200 à 400 Ko
const PHOTO_QUALITY = 0.82;

export function setupCarnetScreen({ camera, training, live, link, board, program, settings, ledColors, getTeam, isVisible, onChange, showMessage }) {
  const root = document.getElementById('carnet-root');
  let carnet = emptyCarnet();
  let validations = {}; // ◆ du professeur (validations.json du dossier de l'équipe)
  let view = null;

  const changed = () => onChange();

  // --- Ce que le site sait en direct ---------------------------------------------------------
  function liveData() {
    return {
      characters: training.categories.filter((c) => !c.background).map((c) => ({ id: c.id, name: c.name, photos: c.examples.length })),
      ledPins: settings.ledPins,
      ledColor: (pin) => ({ nom: ledColors.name(pin), hex: ledColors.hex(pin) }),
      reconnus: new Set(carnet.auto.reconnus),
    };
  }

  // Personnage de chaque LED : proposé d'après le programme du niveau 1 (si l'équipe ne l'a pas choisi).
  function proposerLeds() {
    const names = Object.fromEntries(training.categories.map((c) => [c.id, c.name]));
    const parBroche = ledsDuProgramme(program.saveBlocks()?.parNiveau?.[1], (id) => names[id]);
    let changedAny = false;
    settings.ledPins.slice(0, 2).forEach((pin, i) => {
      const id = `leds.${i}.perso`;
      if (!carnet.champs[id] && parBroche[pin]) {
        carnet.champs[id] = parBroche[pin];
        changedAny = true;
      }
    });
    if (changedAny) changed();
  }

  live.on('vu', ({ id }) => {
    const name = training.get(id)?.name;
    if (name && noterAuto(carnet, { reconnu: name })) {
      changed();
      if (isVisible()) view?.refreshLive(liveData());
    }
  });
  link.subscribe(({ state }) => {
    if (state === 'connectee' && noterAuto(carnet, { carte: true })) changed();
  });
  board.onChange((pins) => {
    if (program.runtime.running && Object.values(pins).some((v) => v > 0) && noterAuto(carnet, { programmeTeste: true })) changed();
  });
  training.onChange(() => isVisible() && view?.refreshLive(liveData()));
  ledColors.onChange(() => isVisible() && view?.refreshLive(liveData()));

  function render() {
    proposerLeds();
    view = renderCarnet(root, {
      carnet,
      team: getTeam(),
      validations,
      live: liveData(),
      onChange: changed,
      onAddPhoto: (id) => photos.open(id),
      onRemovePhoto: (id, photoId) => {
        if (!confirm('Supprimer cette photo ?')) return;
        carnet.photos[id] = (carnet.photos[id] ?? []).filter((p) => p.id !== photoId);
        if (!carnet.photos[id].length) delete carnet.photos[id];
        view.refreshPhotos(id);
        view.refreshProgress();
        changed();
      },
    });
  }

  // --- Photos : webcam (feuille A4 posée devant) ou fichier ------------------------------------
  const photos = setupPhotoDialog({
    camera,
    onPhoto: (id, data) => {
      (carnet.photos[id] ??= []).push({ id: Math.random().toString(36).slice(2, 10), data, date: Date.now() });
      view?.refreshPhotos(id);
      view?.refreshProgress();
      changed();
      showMessage('Photo ajoutée au carnet. Pensez à enregistrer le projet.', 'ok');
    },
    showMessage,
  });

  // --- Imprimer (ou « Enregistrer au format PDF ») ---------------------------------------------
  document.getElementById('btn-carnet-print').addEventListener('click', () => {
    document.body.classList.add('is-printing-carnet');
    // Les <details> et zones de texte s'impriment en entier.
    for (const t of root.querySelectorAll('textarea')) t.style.height = `${t.scrollHeight + 4}px`;
    setTimeout(() => {
      window.print();
      document.body.classList.remove('is-printing-carnet');
    }, 50);
  });

  return {
    show: render,
    // Prénoms changés : seulement la ligne des prénoms (redessiner tout ferait perdre la saisie en cours).
    refreshTeam: () => view?.refreshTeam(getTeam()),
    get: () => carnet,
    replace(next) {
      carnet = normalizeCarnet(next);
      validations = {};
      if (isVisible()) render();
    },
    setValidations(next) {
      validations = next ?? {};
      if (isVisible()) render();
    },
    hasWork: () =>
      Object.keys(carnet.champs).length > 0 || Object.keys(carnet.cases).length > 0 || Object.keys(carnet.choix).length > 0 || Object.keys(carnet.photos).length > 0 || !!carnet.classe,
  };
}

// --- Fenêtre « Ajouter une photo » -----------------------------------------------------------------
function setupPhotoDialog({ camera, onPhoto, showMessage }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog cn-photo-dialog';
  dialog.setAttribute('aria-labelledby', 'cn-photo-title');
  dialog.innerHTML = `
    <div class="dialog-head">
      <span class="dialog-icon">${icon('photo', { size: 24 })}</span>
      <h2 id="cn-photo-title">Ajouter une photo</h2>
      <span class="spacer"></span>
      <button class="icon-btn dialog-close" type="button" data-cn-close aria-label="Fermer" title="Fermer">${icon('fermer')}</button>
    </div>
    <div class="dialog-body">
      <p>Posez la feuille <b>bien à plat</b> devant la webcam, assez près pour qu'elle remplisse l'image, puis cliquez sur <b>« Prendre la photo »</b>.</p>
      <div class="cn-cam">
        <video muted playsinline></video>
        <img class="cn-cam-shot" alt="Photo prise" hidden>
        <div class="cn-cam-off" hidden>
          <p>La webcam est éteinte.</p>
          <button class="btn btn-primary" type="button" data-cn-camera>${icon('webcam')}Activer la webcam</button>
        </div>
      </div>
    </div>
    <div class="dialog-foot">
      <button class="btn btn-secondary" type="button" data-cn-file>${icon('ouvrir')}Choisir un fichier…</button>
      <span class="spacer"></span>
      <button class="btn btn-secondary" type="button" data-cn-retake hidden>Reprendre</button>
      <button class="btn btn-primary" type="button" data-cn-take>${icon('photo')}Prendre la photo</button>
      <button class="btn btn-go" type="button" data-cn-keep hidden>${icon('ok')}Garder cette photo</button>
    </div>`;
  document.body.append(dialog);
  const q = (s) => dialog.querySelector(s);
  const video = q('video');
  const shot = q('.cn-cam-shot');
  let target = null;
  let pending = null;

  function setMode(taken) {
    shot.hidden = !taken;
    video.hidden = taken;
    q('[data-cn-take]').hidden = taken;
    q('[data-cn-retake]').hidden = !taken;
    q('[data-cn-keep]').hidden = !taken;
  }
  function syncCamera() {
    const on = camera.state === 'on';
    q('.cn-cam-off').hidden = on;
    q('[data-cn-take]').disabled = !on;
    if (on && video.srcObject !== camera.video.srcObject) video.srcObject = camera.video.srcObject;
    if (on) video.play().catch(() => {});
  }
  camera.subscribe(() => dialog.open && syncCamera());

  q('[data-cn-camera]').addEventListener('click', () => camera.start());
  q('[data-cn-take]').addEventListener('click', () => {
    if (!video.videoWidth) return;
    pending = toJpeg(video, video.videoWidth, video.videoHeight);
    shot.src = pending;
    setMode(true);
  });
  q('[data-cn-retake]').addEventListener('click', () => {
    pending = null;
    setMode(false);
  });
  q('[data-cn-keep]').addEventListener('click', () => {
    if (pending) onPhoto(target, pending);
    dialog.close();
  });
  q('[data-cn-file]').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const bmp = await createImageBitmap(file);
        onPhoto(target, toJpeg(bmp, bmp.width, bmp.height));
        dialog.close();
      } catch {
        showMessage("Cette image n'a pas pu être lue. Choisissez une photo JPG ou PNG.");
      }
    };
    input.click();
  });
  for (const b of dialog.querySelectorAll('[data-cn-close]')) b.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => (video.srcObject = null));

  return {
    open(id) {
      target = id;
      pending = null;
      setMode(false);
      dialog.showModal();
      syncCamera();
    },
  };
}

// Réduit l'image (côté le plus long ≤ 1600 px) et la convertit en JPEG.
export function toJpeg(source, w, h) {
  const scale = Math.min(1, PHOTO_MAX_PX / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
}

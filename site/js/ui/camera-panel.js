// Panneau webcam partagé par les écrans : vidéo, choix de la webcam,
// « Je vois : … » et barres de confiance en direct.
// Il n'y a qu'une seule vidéo : on la déplace dans l'écran affiché.
// Alimente aussi la bande d'état compacte du niveau 3 (vignette, « Je vois », LED).

import { MIN_EXAMPLES } from '../training.js';
import { renderBoardPanel } from '../board.js';
import { icon } from '../icons.js';

export function setupCameraPanel({ camera, training, live, settings, board, ledColors }) {
  const $ = (id) => document.getElementById(id);
  const select = $('camera-select');
  const msg = $('video-msg');

  $('btn-camera').addEventListener('click', () => camera.start());

  // Masquer l'image : la webcam continue de filmer et l'IA de reconnaître, mais on ne voit plus la vidéo.
  const wrap = document.querySelector('.video-wrap');
  const hiddenMsg = document.createElement('div');
  hiddenMsg.className = 'video-hidden-msg';
  hiddenMsg.innerHTML = `<span>${icon('masquer', { size: 28 })}</span><span>Image masquée : l'IA continue de regarder.</span>`;
  hiddenMsg.hidden = true;
  wrap.append(hiddenMsg);
  function setHidden(hide) {
    wrap.classList.toggle('is-hidden', hide);
    hiddenMsg.hidden = !hide;
    const b = $('btn-hide-video');
    b.setAttribute('aria-pressed', String(hide));
    b.title = hide ? "Afficher l'image" : "Masquer l'image";
    b.innerHTML = icon(hide ? 'webcam' : 'masquer') + `<span class="label">${hide ? "Afficher l'image" : "Masquer l'image"}</span>`;
    for (const id of ['btn-show-video', 'btn-show-video-fs']) {
      const other = $(id);
      if (other) other.innerHTML = icon(hide ? 'webcam' : 'masquer') + `<span class="label">${hide ? "Afficher l'image" : "Masquer l'image"}</span>`;
    }
  }
  $('btn-hide-video').addEventListener('click', () => setHidden(!wrap.classList.contains('is-hidden')));
  select.addEventListener('change', () => camera.choose(select.value));

  camera.subscribe(async ({ state, error }) => {
    $('btn-camera').hidden = state === 'on' || state === 'busy';
    $('btn-hide-video').hidden = state !== 'on';
    msg.hidden = state === 'on';
    msg.textContent = state === 'busy' ? 'Démarrage de la webcam…' : error ?? 'Webcam éteinte.';
    // Vignette de la bande d'état : même flux vidéo.
    if ($('strip-video').srcObject !== camera.video.srcObject) $('strip-video').srcObject = camera.video.srcObject;
    if (state === 'on') {
      $('strip-video').play().catch(() => {});
      const cams = await camera.listCameras().catch(() => []);
      select.replaceChildren(...cams.map((c) => new Option(c.label, c.id)));
      select.value = camera.currentDeviceId();
      $('camera-choice').hidden = cams.length < 2;
    }
  });

  live.on('resultat', ({ confidences, seen, neighbours }) => {
    renderSeen(seen, confidences);
    renderBars(confidences, seen);
    renderNeighbours(neighbours);
  });
  training.onChange(() => renderBars(live.last.confidences, live.seen));

  function renderSeen(seen, confidences = {}) {
    const name = seen ? training.get(seen)?.name : null;
    const el = $('seen-label');
    el.dataset.seen = String(!!name);
    el.textContent = !training.ready
      ? "L'IA n'est pas encore prête : il faut 15 photos du fond vide et d'au moins un personnage."
      : name ? `Je vois : ${name}` : 'Je vois : personne';
    const strip = $('strip-seen');
    strip.dataset.seen = String(!!name);
    strip.innerHTML = !training.ready
      ? "IA pas encore prête"
      : name
        ? `Je vois : ${escapeHtml(name)} <small>${Math.round((confidences[seen] ?? 0) * 100)} %</small>`
        : 'Je vois : personne';
  }

  function renderBars(confidences = {}, seen) {
    const bars = $('bars');
    bars.replaceChildren(
      ...training.categories.map((cat) => {
        const usable = cat.examples.length >= MIN_EXAMPLES;
        const pct = Math.round((confidences[cat.id] ?? 0) * 100);
        const row = document.createElement('div');
        row.className = 'bar-row';
        row.dataset.seen = String(cat.id === seen);
        row.innerHTML = usable
          ? `<span class="bar-name"></span>
            <span class="bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
              <span class="bar-fill" style="width:${pct}%"></span>
              <span class="bar-threshold" style="left:${Math.round(settings.threshold * 100)}%" title="Seuil de confiance"></span>
            </span>
            <span class="bar-value">${pct} %</span>`
          : '<span class="bar-name"></span><span class="bar-value is-missing">pas assez de photos</span>';
        row.querySelector('.bar-name').textContent = (cat.id === seen ? '✓ ' : '') + cat.name;
        return row;
      }),
    );
  }

  // Les photos d'entraînement les plus ressemblantes à l'image actuelle : chacune « vote ».
  const slots = [];
  function renderNeighbours(neighbours = []) {
    const box = $('neighbours');
    if (!neighbours.length) {
      box.textContent = 'Il faut au moins 15 photos dans une catégorie pour que l’IA puisse comparer.';
      slots.length = 0;
      return;
    }
    if (slots.length === 0) {
      box.replaceChildren();
      for (let i = 0; i < 10; i++) {
        const fig = document.createElement('figure');
        fig.className = 'neighbour';
        fig.innerHTML = '<img alt=""><figcaption><span class="n-name"></span><span class="n-sim"></span></figcaption>';
        slots.push(fig);
        box.append(fig);
      }
    }
    slots.forEach((fig, i) => {
      const n = neighbours[i];
      fig.hidden = !n;
      if (!n) return;
      const cat = training.get(n.categoryId);
      const ex = cat?.examples.find((e) => e.id === n.exampleId);
      const img = fig.querySelector('img');
      if (ex && img.getAttribute('src') !== ex.thumb) img.src = ex.thumb;
      fig.dataset.seen = String(n.categoryId === live.seen);
      fig.querySelector('.n-name').textContent = cat?.name ?? '';
      fig.querySelector('.n-sim').textContent = `ressemblance ${Math.round(Math.max(0, n.sim) * 100)} %`;
    });
  }

  // LED de la bande d'état (niveau 3).
  const renderStripLeds = () => renderBoardPanel($('strip-leds'), board.pins, settings.ledPins, { compact: true, colors: ledColors });
  board.onChange(renderStripLeds);
  ledColors?.onChange(renderStripLeds);

  renderSeen(null);
  renderBars();
  renderNeighbours();
  renderStripLeds();

  // Place le panneau dans l'écran affiché.
  return function moveTo(screenId) {
    const slot = document.querySelector(`#screen-${screenId} .camera-slot`);
    if (slot && $('camera-panel').parentElement !== slot) slot.append($('camera-panel'));
    renderStripLeds();
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

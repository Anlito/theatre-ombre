// Écran « Entraîner » : un seul personnage ouvert à la fois (le personnage en cours),
// les autres en liste repliée. Rafale de photos, vignettes, renommer / vider / supprimer.

import { MIN_EXAMPLES, ADVISED_EXAMPLES, MAX_CATEGORIES, BACKGROUND_ID } from '../training.js';
import { icon } from '../icons.js';

const VISIBLE_THUMBS = 10;

const WHY_PHOTOS = `
  <details class="why">
    <summary>${icon('aide')}Pourquoi au moins 15 photos, et variées ?<span class="chev">${icon('chevron', { size: 18 })}</span></summary>
    <p>L'IA reconnaît un personnage en le <strong>comparant à vos photos</strong> : les 10 plus ressemblantes votent.
      Pendant le spectacle, le personnage bouge (plus près, plus loin, penché…). Si toutes les photos sont identiques,
      une nouvelle position ne ressemblera à aucune d'elles. Faites varier la distance et l'angle pendant la rafale.
      <a href="comprendre-ia.html" target="_blank" rel="noopener">En savoir plus</a></p>
  </details>`;

const WHY_BACKGROUND = `
  <p class="hint">Photographiez l’écran du théâtre <strong>sans</strong> personnage.</p>
  <details class="why">
    <summary>${icon('aide')}Pourquoi un « fond vide » ?<span class="chev">${icon('chevron', { size: 18 })}</span></summary>
    <p>L'IA choisit <strong>toujours</strong> le personnage le plus ressemblant parmi ceux qu'elle connaît.
    Si on ne lui montre jamais l'écran vide, elle croira voir un personnage même quand il n'y a personne…
    et la LED s'allumera toute seule ! Le « fond vide » lui apprend à quoi ressemble « personne ».</p>
  </details>`;

export function setupTrainScreen({ training, live, camera, showMessage }) {
  const list = document.getElementById('categories');
  const form = document.getElementById('new-category');
  const input = document.getElementById('new-category-name');
  let openId = null; // personnage en cours
  let showAll = false; // toutes les vignettes du personnage en cours

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = training.addCategory(input.value);
    if (!r.ok) return showMessage(r.error, 'info');
    input.value = '';
    openId = r.category.id; // le nouveau personnage devient le personnage en cours
    showAll = false;
    render();
  });

  // --- Rafale : garder le bouton enfoncé (souris, pavé tactile ou clavier) ------------
  let holding = null;
  function begin(button) {
    if (!camera.ready) {
      showMessage("La webcam n'est pas prête. Clique sur « Activer la webcam ».", 'info');
      return;
    }
    holding = button;
    button.classList.add('is-capturing');
    button.querySelector('.capture-word').textContent = 'Photos en cours…';
    live.startCapture(button.dataset.id);
  }
  function end() {
    if (!holding) return;
    holding.classList.remove('is-capturing');
    holding.querySelector('.capture-word').textContent = 'Ajouter des photos';
    holding = null;
    live.stopCapture();
  }
  list.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn-capture');
    if (!b) return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    begin(b);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) list.addEventListener(type, end);
  list.addEventListener('keydown', (e) => {
    const b = e.target.closest('.btn-capture');
    if (b && (e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      begin(b);
    }
  });
  list.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') end();
  });
  addEventListener('blur', end);
  live.on('plein', ({ max }) => {
    end();
    showMessage(`Assez de photos pour ce personnage (${max} au maximum). Supprime les moins bonnes si besoin.`, 'info');
  });

  // --- Clics : ouvrir un personnage, renommer, vider, supprimer, supprimer une photo ------
  list.addEventListener('click', (e) => {
    const row = e.target.closest('.cat-row');
    if (row) {
      openId = row.dataset.id;
      showAll = false;
      render();
      return;
    }
    if (e.target.closest('[data-action="show-all"]')) {
      showAll = !showAll;
      render();
      return;
    }
    const card = e.target.closest('.category');
    if (!card) return;
    const id = card.dataset.id;
    const cat = training.get(id);
    const thumb = e.target.closest('.thumb');
    if (thumb) {
      training.removeExample(id, thumb.dataset.ex);
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'rename') {
      const name = prompt('Nouveau nom du personnage :', cat.name);
      if (name === null) return;
      const r = training.renameCategory(id, name);
      if (!r.ok) showMessage(r.error, 'info');
    } else if (action === 'clear') {
      if (confirm(`Supprimer toutes les photos de « ${cat.name} » ?`)) training.clearExamples(id);
    } else if (action === 'delete') {
      if (confirm(`Supprimer le personnage « ${cat.name} » et ses photos ?`)) training.removeCategory(id);
    }
  });

  // --- Affichage -------------------------------------------------------------------------
  function currentCategory() {
    let cat = openId ? training.get(openId) : null;
    if (!cat) cat = training.characters[0] ?? training.get(BACKGROUND_ID);
    openId = cat.id;
    return cat;
  }

  function render() {
    const open = currentCategory();
    const others = training.categories.filter((c) => c.id !== open.id);
    const parts = [renderOpen(open)];
    if (others.length) {
      const box = document.createElement('div');
      box.className = 'cat-list';
      box.append(...others.map(renderRow));
      parts.push(box);
    }
    if (training.characters.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'hint-empty';
      hint.innerHTML = 'Créez vos personnages avec <b>« Nouveau personnage »</b>, en haut à droite. Pensez aussi à photographier le <b>fond vide</b>.';
      parts.push(hint);
    }
    list.replaceChildren(...parts);
    form.hidden = training.categories.length >= MAX_CATEGORIES;
  }

  function stateText(n) {
    if (n >= ADVISED_EXAMPLES) return { ok: true, text: `${n} photos · prêt` };
    if (n >= MIN_EXAMPLES) return { ok: true, text: `${n} photos · prêt (${ADVISED_EXAMPLES} conseillées)` };
    return { ok: false, text: `${n} photos · pas assez (${MIN_EXAMPLES} minimum)` };
  }

  function thumbOf(cat) {
    const last = cat.examples[cat.examples.length - 1];
    return last ? `<img src="${last.thumb}" alt="">` : '';
  }

  function renderOpen(cat) {
    const el = document.createElement('article');
    el.className = 'category cat-open';
    el.dataset.id = cat.id;
    el.innerHTML = `
      <div class="cat-head">
        <div class="cat-thumb">${thumbOf(cat)}</div>
        <div>
          <div class="cat-title"><span class="category-name"></span><span class="cat-current">personnage en cours</span></div>
          <div class="category-count"></div>
          <div class="progress"><span></span></div>
        </div>
        ${cat.background ? '' : `
        <div class="cat-tools">
          <button class="icon-btn" type="button" data-action="rename" title="Renommer" aria-label="Renommer">${icon('renommer')}</button>
          <button class="icon-btn" type="button" data-action="clear" title="Vider (supprimer toutes les photos)" aria-label="Vider">${icon('vider')}</button>
          <button class="icon-btn danger" type="button" data-action="delete" title="Supprimer le personnage" aria-label="Supprimer">${icon('supprimer')}</button>
        </div>`}
      </div>
      ${cat.background ? WHY_BACKGROUND : ''}
      <button class="btn btn-primary btn-capture" type="button" data-id="${cat.id}">
        ${icon('photo', { size: 24 })}<span class="capture-word">Ajouter des photos</span> <small>(garder appuyé)</small>
      </button>
      <div class="thumbs" aria-label="Photos de ${escapeAttr(cat.name)}"></div>
      ${cat.background ? '' : WHY_PHOTOS}`;
    el.querySelector('.category-name').textContent = cat.name;
    if (cat.background) el.querySelector('.cat-current').textContent = 'écran sans personnage';
    fillOpen(el, cat);
    return el;
  }

  function fillOpen(el, cat) {
    const n = cat.examples.length;
    const s = stateText(n);
    const count = el.querySelector('.category-count');
    count.dataset.ok = String(s.ok);
    count.innerHTML = icon(s.ok ? 'ok' : 'attention', { size: 18 }) + escapeAttr(s.text);
    el.querySelector('.progress > span').style.width = `${Math.min(100, (n / ADVISED_EXAMPLES) * 100)}%`;
    el.querySelector('.cat-thumb').innerHTML = thumbOf(cat);
    const shown = showAll ? cat.examples : cat.examples.slice(-VISIBLE_THUMBS);
    const offset = cat.examples.length - shown.length;
    const thumbs = el.querySelector('.thumbs');
    const items = shown.map((ex, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.dataset.ex = ex.id;
      b.title = 'Cliquer pour supprimer cette photo';
      b.setAttribute('aria-label', `Supprimer la photo ${offset + i + 1}`);
      const img = new Image();
      img.src = ex.thumb;
      img.alt = '';
      b.append(img);
      return b;
    });
    if (cat.examples.length > VISIBLE_THUMBS) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'link-button thumbs-more';
      more.dataset.action = 'show-all';
      more.textContent = showAll ? 'Voir seulement les 10 dernières photos' : `Voir les ${cat.examples.length} photos (pour supprimer les moins bonnes)`;
      items.push(more);
    }
    thumbs.replaceChildren(...items);
  }

  function renderRow(cat) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cat-row';
    b.dataset.id = cat.id;
    const s = stateText(cat.examples.length);
    b.innerHTML = `
      <span class="cat-thumb">${thumbOf(cat)}</span>
      <b></b>
      <span class="row-state" data-ok="${s.ok}">${icon(s.ok ? 'ok' : 'attention', { size: 18 })}${escapeAttr(s.text)}</span>
      <span class="row-note">${cat.background ? 'écran sans personnage' : ''}</span>
      ${icon('chevron', { size: 18 })}`;
    b.querySelector('b').textContent = cat.name;
    b.title = `Ouvrir « ${cat.name} »`;
    return b;
  }

  let knownIds = new Set(training.categories.map((c) => c.id));
  training.onChange((what) => {
    if (what === 'categories') {
      const added = training.categories.find((c) => !knownIds.has(c.id));
      knownIds = new Set(training.categories.map((c) => c.id));
      if (added && training.categories.length > 1) {
        openId = added.id;
        showAll = false;
      }
      return render();
    }
    // Nouvelles photos : on ne redessine que ce qui change (plus fluide pendant une rafale).
    const open = list.querySelector('.cat-open');
    const cat = open && training.get(open.dataset.id);
    if (cat) fillOpen(open, cat);
    for (const row of list.querySelectorAll('.cat-row')) {
      const c = training.get(row.dataset.id);
      if (!c) continue;
      const s = stateText(c.examples.length);
      const st = row.querySelector('.row-state');
      st.dataset.ok = String(s.ok);
      st.innerHTML = icon(s.ok ? 'ok' : 'attention', { size: 18 }) + escapeAttr(s.text);
      row.querySelector('.cat-thumb').innerHTML = thumbOf(c);
    }
  });
  render();
  return {
    // Ouvre un personnage (guide « Que faire ? »).
    open(id) {
      if (!training.get(id)) return;
      openId = id;
      showAll = false;
      render();
    },
  };
}

function escapeAttr(s) {
  return String(s).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]);
}

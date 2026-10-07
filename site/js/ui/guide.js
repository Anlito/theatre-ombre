// Guide « Que faire ? » : bouton dans la bande du haut (progression 4/11) et panneau à droite,
// non bloquant, qui suit le travail de l'équipe et indique la prochaine étape avec un bouton d'action.

import { guideSteps } from '../guide-steps.js';
import { BACKGROUND_ID } from '../training.js';
import { icon } from '../icons.js';

export function setupGuide({ camera, training, link, live, board, program, projects, settings, train, cablage, openConnect, goTo }) {
  const $ = (id) => document.getElementById(id);
  const panel = $('guide-panel');
  const list = $('guide-steps');
  const current = $('guide-current');

  // Ce qui ne se lit pas directement dans l'état : on le retient pendant la séance.
  const seen = new Set(); // personnages reconnus au moins une fois par l'IA
  let ledsConfirmed = false; // câblage confirmé par l'équipe
  let programTested = false; // une LED s'est allumée pendant que le programme tournait
  let showLaunched = false;

  live.on('vu', ({ id }) => {
    seen.add(id);
    update();
  });
  board.onChange((pins) => {
    if (program.runtime.running && Object.values(pins).some((v) => v > 0)) programTested = true;
    update();
  });
  $('btn-show-start').addEventListener('click', () => {
    if (training.ready) showLaunched = true;
    setTimeout(update, 100);
  });

  function snapshot() {
    return {
      cameraOn: camera.state === 'on',
      backgroundPhotos: training.get(BACKGROUND_ID)?.examples.length ?? 0,
      characters: training.characters.map((c) => ({ id: c.id, name: c.name, photos: c.examples.length })),
      seen,
      ledsConfirmed,
      boardConnected: link.connected,
      programReady: program.isReady(),
      programTested,
      saved: !!projects.state.savedOnce,
      showLaunched,
    };
  }

  // --- Actions des boutons ---------------------------------------------------------------------
  const ACTIONS = {
    webcam: () => {
      goTo('entrainer');
      camera.start();
    },
    fond: () => {
      goTo('entrainer');
      train.open(BACKGROUND_ID);
    },
    nouveau: () => {
      goTo('entrainer');
      $('new-category-name').focus();
    },
    photos: () => {
      goTo('entrainer');
      const missing = training.characters.find((c) => c.examples.length < 15);
      if (missing) train.open(missing.id);
    },
    entrainer: () => goTo('entrainer'),
    cablage: () => cablage.open(),
    carte: () => openConnect(),
    programmer: () => goTo('programmer'),
    demarrer: () => {
      goTo('programmer');
      if (!program.runtime.running) program.start();
    },
    enregistrer: () => projects.save(),
    spectacle: () => goTo('spectacle'),
  };

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-guide]');
    if (!b) return;
    if (b.dataset.guide === 'fait') ledsConfirmed = true;
    else ACTIONS[b.dataset.guide]?.();
    setTimeout(update, 50);
  });

  // --- Affichage --------------------------------------------------------------------------------
  let lastKey = '';
  function update() {
    const g = guideSteps(snapshot(), settings.level);
    $('guide-count').textContent = `${g.done}/${g.total}`;
    $('guide-progress').style.width = `${Math.round((g.done / g.total) * 100)}%`;
    $('guide-btn').dataset.complete = String(g.done === g.total);
    // On ne redessine que si quelque chose a changé (pour ne pas déplacer un bouton sous la souris).
    const key = JSON.stringify(g.steps.map((s) => [s.state, s.detail, s.action?.label]));
    if (key === lastKey) return;
    lastKey = key;
    // L'étape en cours, en grand, avec son bouton d'action.
    const i = g.steps.findIndex((s) => s.state === 'en-cours');
    if (i === -1) {
      current.innerHTML = '<p class="guide-bravo">Bravo, tout est prêt ! Bon spectacle.</p>';
    } else {
      const s = g.steps[i];
      current.innerHTML = `
        <p class="guide-next">Étape ${i + 1} sur ${g.total}</p>
        <h3 class="guide-current-title"></h3>
        <p class="guide-detail"></p>
        <div class="guide-actions">
          <button class="btn btn-primary" type="button" data-guide="${s.action.id}">${s.action.label}</button>
          ${s.manual ? `<button class="btn btn-secondary" type="button" data-guide="fait">${icon('ok', { size: 18 })}C'est fait</button>` : ''}
        </div>`;
      current.querySelector('.guide-current-title').textContent = s.title;
      current.querySelector('.guide-detail').textContent = s.detail;
    }
    // Toutes les étapes (repliées) : fait / maintenant / plus tard.
    list.replaceChildren(
      ...g.steps.map((s, n) => {
        const li = document.createElement('li');
        li.className = 'guide-step';
        li.dataset.state = s.state;
        const mark = s.done ? icon('ok', { size: 18, stroke: 3 }) : String(n + 1);
        li.innerHTML = `<span class="guide-mark" aria-hidden="true">${mark}</span><span class="guide-title"></span>
          <span class="visually-hidden">${s.done ? '(fait)' : s.state === 'en-cours' ? '(à faire maintenant)' : '(plus tard)'}</span>`;
        li.querySelector('.guide-title').textContent = s.title;
        return li;
      }),
    );
  }
  setInterval(update, 800);

  function open() {
    update();
    panel.show(); // non bloquant : on peut continuer à travailler
  }
  $('guide-btn').addEventListener('click', () => (panel.open ? panel.close() : open()));
  panel.querySelector('[data-close]').addEventListener('click', () => panel.close());

  // À la première ouverture d'un projet, le guide s'affiche tout seul.
  let shownOnce = false;
  $('start-dialog').addEventListener('close', () => {
    if (!shownOnce) {
      shownOnce = true;
      open();
    }
  });
  update();
  return { open, update };
}

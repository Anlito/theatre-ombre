// Écran « Programmer » : espace de blocs Blockly, démarrer / arrêter, sons.

import {
  defineBlocks,
  toolbox,
  makeTheme,
  variablesFlyout,
  VARIABLES_CATEGORY,
  CREATE_VARIABLE_BUTTON,
} from '../blocks/definitions.js';
import { defineGenerators, compile } from '../blocks/generators.js';
import { Runtime } from '../runtime.js';
import { setupCppPanel } from './cpp-panel.js';
import { icon } from '../icons.js';

// Triangle « lecture » (pas d'icône dédiée dans le jeu de Claude Design).
const PLAY = '<svg class="ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>';
const COLLAPSE_KEY = 'theatre-ombre.webcam-reduite';

export function setupProgramScreen({
  training, sounds, board, link, live, settings, showMessage, hideMessage,
  getTeam = () => [],
  onLevelChange = () => {}, // le niveau a changé (pour marquer le projet « modifié »)
}) {
  const { Blockly } = window;
  const { javascriptGenerator, Order } = window.javascript;
  const $ = (id) => document.getElementById(id);

  defineBlocks(Blockly, {
    characters: () => training.characters.map((c) => ({ id: c.id, name: c.name })),
    sounds: () => sounds.sounds.map((s) => ({ id: s.id, name: s.name })),
    ledPins: () => settings.ledPins,
  });
  defineGenerators(javascriptGenerator, Order, { characterName: (id) => training.get(id)?.name ?? '' });

  const workspace = Blockly.inject($('blockly'), {
    toolbox: toolbox(settings.level, settings.ledPins),
    media: 'vendor/blockly/media/', // embarqué : pas de CDN
    renderer: 'zelos',
    theme: makeTheme(Blockly),
    trashcan: true,
    sounds: false,
    grid: { spacing: 20, length: 2, colour: '#D9CCB6', snap: true },
    zoom: { controls: true, wheel: false, startScale: 1.0 },
    move: { scrollbars: true, drag: true, wheel: true },
  });
  // Catégorie « Variables » : blocs avec valeurs déjà écrites (définir … à 0, ajouter 1 à …).
  workspace.registerToolboxCategoryCallback(VARIABLES_CATEGORY, (ws) =>
    variablesFlyout(
      ws
        .getVariableMap()
        .getVariablesOfType('')
        .sort((a, b) => a.getName().localeCompare(b.getName(), 'fr'))
        .map((v) => ({ id: v.getId(), name: v.getName() })),
    ),
  );
  workspace.registerButtonCallback(CREATE_VARIABLE_BUTTON, (button) =>
    Blockly.Variables.createVariableButtonHandler(button.getTargetWorkspace()),
  );
  // Un programme par niveau : le niveau 1 et le niveau 2 sont deux programmes différents.
  // Le niveau 3 montre le code C++ du programme du niveau 2 : il partage ce programme.
  const programKey = (level) => (level >= 2 ? '2' : '1');
  let programs = { 1: null, 2: null }; // programmes rangés (format Blockly), par niveau
  let currentKey = programKey(settings.level); // programme affiché dans l'espace de travail
  // Un premier bloc pour guider les élèves.
  // Niveau 1 : « quand je vois… » ; niveau 2 : « quand le programme démarre ».
  const starter = (key = currentKey) => ({
    blocks: { languageVersion: 0, blocks: [{ type: key === '2' ? 'au_demarrage' : 'quand_je_vois', x: 30, y: 30 }] },
  });
  Blockly.serialization.workspaces.load(starter(), workspace);

  // Affiche dans l'espace de travail le programme d'un niveau (sans compter comme une modification).
  function showProgram(key) {
    Blockly.Events.disable();
    try {
      workspace.clear();
      Blockly.serialization.workspaces.load(programs[key] ?? starter(key), workspace);
    } finally {
      Blockly.Events.enable();
    }
    currentKey = key;
    workspace.scrollCenter();
  }
  // Le niveau a changé (sélecteur, mode professeur) : on range le programme affiché, on montre l'autre.
  function switchProgramIfNeeded() {
    const key = programKey(settings.level);
    if (key === currentKey) return false;
    runtime.stop();
    programs[currentKey] = Blockly.serialization.workspaces.save(workspace);
    showProgram(key);
    return true;
  }

  let cpp = null; // panneau C++ du niveau 3 (créé plus bas)

  // --- Exécution -------------------------------------------------------------------------
  let warnedOffline = false;
  const highlighted = new Map(); // fil -> id du bloc surligné
  async function led(pin, on) {
    report(await board.digitalWrite(pin, on));
  }
  function report(r) {
    if (r.ok) return;
    if (r.offline) {
      if (!warnedOffline) showMessage("La carte n'est pas connectée : les LED ne s'allumeront pas. Clique sur la pastille « Carte · Connecter », en haut.", 'info');
      warnedOffline = true;
    } else showMessage(r.error);
  }
  const runtime = new Runtime({
    Interpreter: window.JSInterpreter,
    actions: {
      allumer: (pin) => led(pin, true),
      eteindre: (pin) => led(pin, false),
      regler: async (pin, v) => report(await board.analogWrite(Number(pin), Number(v))),
      ecrire: (texte) => addMessage(texte),
      jeVois: (id) => live.seen === id,
      personnageVu: () => (live.seen ? training.get(live.seen)?.name ?? 'personne' : 'personne'),
      confiance: (id) => Math.round((live.last.confidences?.[id] ?? 0) * 100),
      jouerSon: async (id) => {
        const r = await sounds.play(id);
        if (!r.ok) showMessage(r.error);
      },
      arreterSons: () => sounds.stopAll(),
      toutEteindre: async () => {
        sounds.stopAll();
        if (link.connected) await board.allOff();
      },
      surligner: (fil, blockId) => {
        const prev = highlighted.get(fil);
        if (prev && workspace.getBlockById(prev)) workspace.highlightBlock(prev, false);
        if (blockId && workspace.getBlockById(blockId)) {
          workspace.highlightBlock(blockId, true);
          highlighted.set(fil, blockId);
        } else highlighted.delete(fil);
      },
    },
    onError: (m) => showMessage(m),
    onVariables: (vars) => scheduleVariables(vars),
    onChange: (running) => {
      renderRun(running);
      if (!running) {
        for (const id of highlighted.values()) if (workspace.getBlockById(id)) workspace.highlightBlock(id, false);
        highlighted.clear();
      }
    },
  });

  // Les blocs sont vérifiés et retraduits à chaque modification.
  let lastProblems = [];
  let lastHandlerCount = 0;
  function recompile() {
    const { handlers, problems } = compile(workspace, javascriptGenerator);
    for (const b of workspace.getAllBlocks(false)) {
      b.setWarningText(null);
      b.removeClass?.('bloc-incomplet');
    }
    for (const p of problems) {
      const b = workspace.getBlockById(p.blockId);
      if (!b) continue;
      b.setWarningText(p.message);
      // Bloc incomplet : entouré de rouge (en plus de l'icône ⚠️ et du message).
      if (p.level === 'erreur') b.addClass?.('bloc-incomplet');
    }
    lastProblems = problems;
    lastHandlerCount = handlers.length;
    runtime.load(handlers);
    cpp?.refresh(); // niveau 3 : le code C++ suit les blocs
    return handlers;
  }
  let pending = null;
  workspace.addChangeListener((e) => {
    if (e.isUiEvent) return;
    clearTimeout(pending);
    pending = setTimeout(recompile, 150);
  });

  function start() {
    const handlers = recompile();
    const errors = lastProblems.filter((p) => p.level === 'erreur');
    if (errors.length) {
      showMessage(`Le programme ne peut pas démarrer : ${errors.length} bloc(s) entouré(s) de rouge sont incomplets. Clique sur le triangle d’avertissement pour lire le conseil.`);
      return false;
    }
    if (handlers.length === 0) {
      showMessage(
        settings.level >= 2
          ? 'Ajoute un bloc « quand le programme démarre », puis accroche des actions dessous (par exemple « répéter indéfiniment » et « si je vois … ? »).'
          : 'Ajoute un bloc « quand je vois… », choisis un personnage et accroche des actions dessous.',
        'info',
      );
      return false;
    }
    clearMessages();
    if (lastProblems.length) {
      showMessage('Attention : certains blocs portent un triangle d’avertissement. Clique dessus pour lire le conseil.', 'info');
    } else hideMessage();
    warnedOffline = false;
    runtime.start();
    // Si un personnage est déjà devant la webcam, on réagit tout de suite.
    if (live.seen) runtime.trigger('vu', live.seen);
    return true;
  }
  function stop() {
    runtime.stop();
  }
  $('btn-run').addEventListener('click', () => (runtime.running ? stop() : start()));
  // Démarrer (vert) / Arrêter (contour vert) + état en mots.
  function renderRun(running) {
    const b = $('btn-run');
    b.className = running ? 'btn btn-stop' : 'btn btn-go';
    b.innerHTML = running ? icon('stop') + 'Arrêter' : PLAY + 'Démarrer';
    b.title = running ? 'Arrêter le programme' : 'Démarrer le programme';
    $('run-state').textContent = running ? 'en marche' : '';
    $('run-state').dataset.running = String(running);
  }
  renderRun(false);

  live.on('vu', ({ id }) => {
    sounds.stopAll(); // un son en cours est coupé quand un autre personnage est reconnu
    runtime.trigger('vu', id);
  });
  live.on('plus-vu', ({ id }) => runtime.trigger('plus-vu', id));

  // Personnage ou son renommé / supprimé : on rafraîchit le texte des listes dans les blocs.
  function refreshDropdowns(fieldName) {
    for (const b of workspace.getAllBlocks(false)) {
      const f = b.getField(fieldName);
      if (!f) continue;
      try {
        f.doValueUpdate_(f.getValue());
        f.forceRerender();
      } catch {
        /* sans gravité */
      }
    }
    recompile();
  }
  training.onChange((what) => what === 'categories' && refreshDropdowns('PERSO'));
  sounds.onChange(() => refreshDropdowns('SON'));

  // --- Niveau 2 : zone « Messages » (bloc écrire) et valeurs des variables -----------------
  const MAX_MESSAGES = 60;
  function addMessage(texte) {
    const list = $('messages');
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString('fr-FR');
    li.innerHTML = `<span class="msg-time">${time}</span> `;
    li.append(String(texte));
    list.append(li);
    while (list.children.length > MAX_MESSAGES) list.firstChild.remove();
    list.scrollTop = list.scrollHeight;
  }
  function clearMessages() {
    $('messages').replaceChildren();
  }
  $('btn-clear-messages').addEventListener('click', clearMessages);

  // Onglets Messages / Variables.
  function selectTab(name) {
    $('tab-messages').setAttribute('aria-selected', String(name === 'messages'));
    $('tab-variables').setAttribute('aria-selected', String(name === 'variables'));
    $('messages').hidden = name !== 'messages';
    $('variables').hidden = name !== 'variables';
    $('btn-clear-messages').hidden = name !== 'messages';
  }
  $('tab-messages').addEventListener('click', () => selectTab('messages'));
  $('tab-variables').addEventListener('click', () => selectTab('variables'));

  // Les variables peuvent changer des milliers de fois par seconde : on affiche au plus 10 fois par seconde.
  let varsTimer = null;
  let lastVars = new Map();
  function scheduleVariables(vars) {
    lastVars = vars;
    if (varsTimer) return;
    varsTimer = setTimeout(() => {
      varsTimer = null;
      renderVariables();
    }, 100);
  }
  function renderVariables() {
    const all = workspace.getAllVariables?.() ?? workspace.getVariableMap().getAllVariables();
    const box = $('variables');
    $('var-count').textContent = String(all.length);
    if (!all.length) {
      box.innerHTML = '<span class="hint">Aucune variable. Crée-en une dans la catégorie « Variables ».</span>';
      return;
    }
    box.replaceChildren(
      ...all.map((v) => {
        const row = document.createElement('div');
        row.className = 'var-row';
        const value = lastVars.has(v.getId()) ? lastVars.get(v.getId()) : '—';
        row.innerHTML = '<span class="var-name"></span><span class="var-value"></span>';
        row.querySelector('.var-name').textContent = v.name;
        row.querySelector('.var-value').textContent = String(value);
        return row;
      }),
    );
  }
  workspace.addChangeListener((e) => {
    if (e.type === Blockly.Events.VAR_CREATE || e.type === Blockly.Events.VAR_DELETE || e.type === Blockly.Events.VAR_RENAME) renderVariables();
  });
  document.body.dataset.niveau = String(settings.level);
  renderVariables();

  // --- Sélecteur de niveau (écran Programmer) ------------------------------------------------
  // Les blocs déjà posés restent ; seule la boîte à outils change. Verrouillable par le professeur.
  function renderLevelSwitch() {
    for (const b of document.querySelectorAll('#level-switch [data-level]')) {
      const active = Number(b.dataset.level) === settings.level;
      b.setAttribute('aria-checked', String(active));
      if (b.dataset.level !== '3') b.disabled = settings.levelLocked && !active;
    }
    $('level-lock').hidden = !settings.levelLocked;
  }
  $('level-switch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (!b || b.disabled || settings.levelLocked) return;
    const level = Number(b.dataset.level);
    if (level === settings.level) return;
    runtime.stop();
    settings.level = level;
    applySettings();
    onLevelChange();
    showMessage(
      level === 3
        ? 'Niveau 3 · Code Arduino : le code C++ de votre programme du niveau 2 s’affiche à droite. Cliquez sur un bloc pour voir ses lignes.'
        : level === 2
          ? 'Niveau 2 · Boucles et conditions : c’est un autre programme. Partez du bloc « quand le programme démarre ». Votre programme du niveau 1 est gardé.'
          : 'Niveau 1 · Premiers pas : vous retrouvez votre programme du niveau 1. Celui du niveau 2 est gardé.',
      'info',
    );
  });

  // --- Colonne webcam : ouverte ou réduite (bande d'état), mémorisé par niveau sur ce poste ----
  // Par défaut : ouverte aux niveaux 1 et 2, réduite au niveau 3 (plus de place pour le code).
  function loadCollapse() {
    try {
      return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }
  function isCollapsed() {
    const saved = loadCollapse()[settings.level];
    return saved ?? settings.level === 3;
  }
  function setCollapsed(value) {
    const all = loadCollapse();
    all[settings.level] = value;
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(all));
    } catch {
      /* stockage indisponible */
    }
    applyCollapse();
  }
  function applyCollapse() {
    const c = isCollapsed();
    $('program-layout').classList.toggle('is-collapsed', c);
    $('cam-strip').hidden = !c;
    Blockly.svgResize(workspace);
  }
  $('btn-cam-collapse').addEventListener('click', () => setCollapsed(true));
  $('btn-cam-expand').addEventListener('click', () => setCollapsed(false));

  function applySettings() {
    switchProgramIfNeeded();
    workspace.updateToolbox(toolbox(settings.level, settings.ledPins));
    document.body.dataset.niveau = String(settings.level);
    applyCollapse();
    Blockly.svgResize(workspace); // la zone des blocs change de hauteur selon le niveau
    renderLevelSwitch();
    refreshDropdowns('PIN'); // retraduit aussi le code C++
  }

  cpp = setupCppPanel({ Blockly, workspace, settings, training, sounds, getTeam });

  setupSoundsPanel({ sounds, showMessage });
  renderLevelSwitch();
  applyCollapse();
  recompile();

  return {
    workspace,
    runtime,
    start,
    stop,
    resize: () => {
      applyCollapse();
      Blockly.svgResize(workspace);
    },
    // Sauvegarde / rechargement des blocs (fichier de projet) : un programme par niveau.
    saveBlocks: () => ({
      parNiveau: { ...programs, [currentKey]: Blockly.serialization.workspaces.save(workspace) },
    }),
    loadBlocks: (data) => {
      runtime.stop();
      if (data?.parNiveau) programs = { 1: data.parNiveau['1'] ?? null, 2: data.parNiveau['2'] ?? null };
      // Ancien fichier (un seul programme) : il devient le programme du niveau en cours.
      else programs = { 1: null, 2: null, [programKey(settings.level)]: data ?? null };
      showProgram(programKey(settings.level)); // sans événements : un projet rechargé n'est pas « modifié »
      recompile();
    },
    // Réglages du professeur modifiés (niveau, broches).
    applySettings,
    // Guide « Que faire ? » : programme écrit et complet.
    isReady: () => lastHandlerCount > 0 && !lastProblems.some((p) => p.level === 'erreur'),
  };
}

// --- Sons : ligne résumée (écran Programmer) + panneau à droite (écouter, ajouter, retirer) ----
function setupSoundsPanel({ sounds, showMessage }) {
  const $ = (id) => document.getElementById(id);
  const list = $('sound-list');
  const input = $('sound-file');
  const dialog = $('sounds-dialog');

  function addFiles(files) {
    for (const file of files) {
      const r = sounds.addFile(file);
      if (!r.ok) showMessage(r.error, 'info');
    }
  }
  input.addEventListener('change', () => {
    addFiles(input.files);
    input.value = '';
  });
  // Glisser-déposer : sur la ligne « Sons » et dans le panneau.
  for (const zone of [$('sound-drop'), dialog.querySelector('.sound-drop-zone')]) {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('is-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('is-over');
      addFiles(e.dataTransfer.files);
    });
  }
  const open = () => dialog.showModal();
  $('btn-sounds').addEventListener('click', open);
  $('btn-strip-sons').addEventListener('click', open);

  list.addEventListener('click', async (e) => {
    const row = e.target.closest('[data-id]');
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!row || !action) return;
    if (action === 'play') {
      const r = await sounds.play(row.dataset.id);
      if (!r.ok) showMessage(r.error);
    } else if (action === 'stop') sounds.stopAll();
    else if (action === 'delete') sounds.remove(row.dataset.id);
  });

  const PLAY_ICON = '<svg class="ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>';
  function render() {
    const mine = sounds.sounds.filter((x) => !x.builtin);
    $('sound-summary').textContent = mine.length ? mine.map((x) => x.name).join(', ') : `${sounds.sounds.length} sons de base`;
    $('btn-strip-sons').querySelector('.label').textContent = `Sons (${sounds.sounds.length})`;
    list.replaceChildren(
      ...sounds.sounds.map((snd) => {
        const li = document.createElement('li');
        li.dataset.id = snd.id;
        li.innerHTML = `
          <button class="icon-btn" type="button" data-action="play" aria-label="Écouter" title="Écouter">${PLAY_ICON}</button>
          <button class="icon-btn" type="button" data-action="stop" aria-label="Arrêter" title="Arrêter">${icon('stop', { size: 18 })}</button>
          <span class="sound-name"></span>
          ${snd.builtin ? '<span class="sound-tag">son de base</span>' : ''}
          ${snd.missing ? `<span class="sound-tag sound-missing">${icon('attention', { size: 16 })} à redéposer</span>` : ''}
          ${snd.builtin ? '' : `<button class="icon-btn danger" type="button" data-action="delete" aria-label="Retirer" title="Retirer">${icon('supprimer', { size: 18 })}</button>`}`;
        li.querySelector('.sound-name').textContent = snd.name;
        return li;
      }),
    );
  }
  sounds.onChange(render);
  render();
}

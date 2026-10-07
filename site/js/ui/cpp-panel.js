// Niveau 3 : panneau « Code C++ » en lecture seule, à côté des blocs.
//  - mis à jour à chaque modification des blocs ;
//  - clic sur un bloc -> ses lignes sont surlignées ; clic sur une ligne -> son bloc est sélectionné ;
//  - coloration syntaxique ; boutons « Copier » et « Télécharger le fichier .ino ».

import { generateArduino } from '../blocks/arduino.js';
import { NOBODY } from '../blocks/definitions.js';
import { fileName } from '../project.js';

export function setupCppPanel({ Blockly, workspace, settings, training, sounds, getTeam }) {
  const $ = (id) => document.getElementById(id);
  const list = $('cpp-code');
  let current = { code: '', lines: {} };
  let selectedId = null;

  const ctx = () => ({
    characterName: (id) => (id === NOBODY ? 'personne' : training.get(id)?.name ?? ''),
    soundName: (id) => sounds.get(id)?.name ?? '',
    team: getTeam(),
    ledPins: settings.ledPins,
  });

  function refresh() {
    if (settings.level < 3) return;
    try {
      current = generateArduino(Blockly, workspace, ctx());
    } catch (e) {
      console.error(e);
      current = { code: '// Traduction impossible pour le moment : vérifie tes blocs.', lines: {} };
    }
    list.replaceChildren(
      ...current.code.split('\n').map((line, i) => {
        const li = document.createElement('li');
        li.dataset.line = String(i + 1);
        li.innerHTML = highlightCpp(line) || '&nbsp;';
        return li;
      }),
    );
    markBlock(selectedId, false);
  }

  // Lignes d'un bloc : celles du bloc lui-même, ou du bloc « action » qui le contient
  // (un bloc valeur comme « je vois Loup ? » est sur la ligne de son « si »).
  function rangesOf(id) {
    for (let b = id ? workspace.getBlockById(id) : null; b; b = b.getParent()) {
      if (current.lines[b.id]) return current.lines[b.id];
    }
    return [];
  }

  function markBlock(id, scroll = true) {
    for (const li of list.querySelectorAll('.is-linked')) li.classList.remove('is-linked');
    const ranges = rangesOf(id);
    for (const [a, z] of ranges) {
      for (let n = a; n <= z; n++) list.children[n - 1]?.classList.add('is-linked');
    }
    // On fait défiler le panneau de code seulement (pas toute la page).
    const first = ranges.length ? list.children[ranges[0][0] - 1] : null;
    if (scroll && first) list.scrollTo({ top: first.offsetTop - list.clientHeight / 2, behavior: 'smooth' });
  }

  // Bloc sélectionné dans l'espace de travail -> lignes surlignées.
  function onSelection(id) {
    if (id === selectedId) return;
    selectedId = id;
    if (settings.level >= 3) markBlock(selectedId);
  }
  workspace.addChangeListener((e) => {
    if (e.type === Blockly.Events.SELECTED) onSelection(e.newElementId ?? null);
  });
  // Filet de sécurité : après un clic ou une touche dans l'espace des blocs, on relit la sélection.
  const readSelection = () => setTimeout(() => onSelection(Blockly.getSelected()?.id ?? null), 0);
  workspace.getParentSvg().parentElement.addEventListener('pointerup', readSelection);
  workspace.getParentSvg().parentElement.addEventListener('keyup', readSelection);

  // Ligne cliquée -> le plus petit bloc qui la contient est sélectionné.
  list.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-line]');
    if (!li) return;
    const n = Number(li.dataset.line);
    let best = null;
    for (const [id, ranges] of Object.entries(current.lines)) {
      for (const [a, z] of ranges) {
        if (n >= a && n <= z && (!best || z - a < best.size)) best = { id, size: z - a };
      }
    }
    if (!best) return;
    const block = workspace.getBlockById(best.id);
    if (!block) return;
    workspace.centerOnBlock(best.id);
    // Blockly 13 : la sélection passe par le « gestionnaire de focus ».
    if (Blockly.getFocusManager) Blockly.getFocusManager().focusNode(block);
    else block.select();
    selectedId = best.id;
    markBlock(best.id, false);
  });

  $('btn-cpp-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(current.code);
      flash($('btn-cpp-copy'), '✅ Copié !');
    } catch {
      flash($('btn-cpp-copy'), 'Copie impossible');
    }
  });
  $('btn-cpp-download').addEventListener('click', () => {
    const name = fileName(getTeam()).replace(/\.json$/, '.ino');
    const url = URL.createObjectURL(new Blob([current.code], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  });

  return { refresh };
}

function flash(button, text) {
  const old = button.textContent;
  button.textContent = text;
  setTimeout(() => (button.textContent = old), 1500);
}

// --- Coloration syntaxique simple (une ligne à la fois) --------------------------------------------------
const KEYWORDS = new Set(['if', 'else', 'for', 'while', 'return', 'break', 'continue', 'true', 'false']);
const TYPES = new Set(['void', 'int', 'bool', 'String', 'float', 'long']);
const ARDUINO = new Set([
  'setup', 'loop', 'digitalWrite', 'analogWrite', 'pinMode', 'delay', 'random', 'randomSeed', 'analogRead', 'pow',
  'Serial', 'begin', 'println', 'available', 'readStringUntil', 'trim', 'HIGH', 'LOW', 'OUTPUT', 'A0',
]);
const escape = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export function highlightCpp(line) {
  const out = [];
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d"']+)/g;
  let m;
  while ((m = re.exec(line))) {
    const [all, comment, str, num, word] = m;
    if (comment) out.push(`<span class="c-com">${escape(comment)}</span>`);
    else if (str) out.push(`<span class="c-str">${escape(str)}</span>`);
    else if (num) out.push(`<span class="c-num">${num}</span>`);
    else if (word && KEYWORDS.has(word)) out.push(`<span class="c-kw">${word}</span>`);
    else if (word && TYPES.has(word)) out.push(`<span class="c-type">${word}</span>`);
    else if (word && ARDUINO.has(word)) out.push(`<span class="c-fn">${word}</span>`);
    else out.push(escape(all));
  }
  return out.join('');
}

// Projets : fenêtre de démarrage (prénoms), enregistrer, ouvrir,
// copie de secours automatique et « Reprendre mon dernier travail ».

import { serialize, parse, fileName } from '../project.js';
import { saveBackup, loadBackup } from '../autosave.js';
import { MODEL_ID } from '../vision.js';
import { normalizeSettings } from '../settings.js';

const BACKUP_EVERY_MS = 60_000;

import { icon } from '../icons.js';

export function setupProjects({ training, sounds, settings, program, ledColors, onSettingsChanged, showMessage, hideMessage, onTeamChange = () => {} }) {
  const $ = (id) => document.getElementById(id);
  const state = {
    team: [],
    handle: null, // fichier choisi avec le sélecteur du navigateur (Chrome / Edge)
    dirty: false, // modifications non enregistrées dans le fichier
    changedSinceBackup: false,
    loading: false,
  };

  // --- Suivi des modifications ------------------------------------------------------------
  const touch = () => {
    if (state.loading) return;
    state.dirty = true;
    state.changedSinceBackup = true;
    renderTeam();
  };
  training.onChange(touch);
  sounds.onChange(touch);
  program.workspace.addChangeListener((e) => {
    if (!e.isUiEvent) touch();
  });
  // Y a-t-il du vrai travail ? (personnage, photo, son ajouté, ou blocs posés par l'élève)
  // Le bloc de départ posé par l'outil ne compte pas.
  const STARTERS = ['quand_je_vois', 'au_demarrage'];
  function hasWork() {
    if (training.categories.some((c) => !c.background || c.examples.length > 0)) return true;
    if (sounds.sounds.some((snd) => !snd.builtin)) return true;
    const programs = Object.values(program.saveBlocks().parNiveau ?? {});
    return programs.some((json) => {
      const blocks = json?.blocks?.blocks ?? [];
      const variables = json?.variables ?? [];
      return (
        variables.length > 0 ||
        blocks.length > 1 ||
        blocks.some((b) => b.next || b.inputs || !STARTERS.includes(b.type) || b.fields?.PERSO)
      );
    });
  }
  const unsavedWork = () => state.dirty && hasWork();

  addEventListener('beforeunload', (e) => {
    if (unsavedWork()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // --- Construire / appliquer un projet ----------------------------------------------------
  async function collect() {
    return serialize({
      team: state.team,
      settings: { ...settings },
      categories: training.categories,
      blocks: program.saveBlocks(),
      sounds: await sounds.studentSounds(),
      modelId: MODEL_ID,
      ledColors: ledColors.toJSON(),
    });
  }

  function apply(project, { team } = {}) {
    state.loading = true;
    try {
      // Le verrouillage est un réglage du poste (professeur) : un projet ne peut pas le lever.
      // Niveau verrouillé : c'est celui du professeur qui s'applique, pas celui du fichier.
      const locked = settings.levelLocked;
      const previousLevel = settings.level;
      Object.assign(settings, normalizeSettings(project.settings), { levelLocked: locked });
      if (locked) settings.level = previousLevel;
      ledColors.replace(project.ledColors ?? {}); // couleurs des LED de l'équipe (par défaut si absentes)
      onSettingsChanged();
      training.replaceAll(project.categories);
      sounds.replaceStudentSounds(project.sounds);
      program.loadBlocks(project.blocks); // après personnages et sons : les listes des blocs les connaissent
      state.team = team ?? (project.team.length ? project.team : state.team);
    } finally {
      state.loading = false;
    }
    state.dirty = false;
    state.changedSinceBackup = false;
    renderTeam();
  }

  function emptyProject() {
    return { settings: { ...settings }, categories: [], sounds: [], blocks: null, team: [], ledColors: {} };
  }

  // --- Enregistrer ---------------------------------------------------------------------------
  async function save({ saveAs = false } = {}) {
    const text = JSON.stringify(await collect());
    const name = fileName(state.team);
    if ('showSaveFilePicker' in window) {
      try {
        if (!state.handle || saveAs) {
          state.handle = await window.showSaveFilePicker({
            suggestedName: name,
            types: [{ description: "Projet Théâtre d'ombre", accept: { 'application/json': ['.json'] } }],
          });
        }
        const w = await state.handle.createWritable();
        await w.write(text);
        await w.close();
        return saved(state.handle.name);
      } catch (e) {
        if (e.name === 'AbortError') return; // l'élève a annulé
        state.handle = null;
        // Dossier réseau refusé par le navigateur… : on télécharge le fichier à la place.
      }
    }
    download(text, name);
    saved(name, true);
  }

  function saved(name, downloaded = false) {
    state.dirty = false;
    state.savedOnce = true;
    renderTeam();
    showMessage(
      downloaded
        ? `Projet téléchargé : « ${name} ». Range-le dans le dossier de ton équipe (dossier Téléchargements).`
        : `Projet enregistré : « ${name} ».`,
      'ok',
    );
    backupNow();
  }

  function download(text, name) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // --- Ouvrir -----------------------------------------------------------------------------------
  async function pickFile() {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "Projet Théâtre d'ombre", accept: { 'application/json': ['.json'] } }],
        });
        return { file: await handle.getFile(), handle };
      } catch (e) {
        if (e.name === 'AbortError') return null;
      }
    }
    // Repli : sélecteur de fichier classique.
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => resolve(input.files[0] ? { file: input.files[0], handle: null } : null);
      input.click();
    });
  }

  async function openFile() {
    const picked = await pickFile();
    if (!picked) return false;
    const r = parse(await picked.file.text(), { modelId: MODEL_ID });
    if (!r.ok) {
      showMessage(r.error);
      return false;
    }
    apply(r.project, { team: r.project.team.length ? r.project.team : state.team });
    state.handle = picked.handle;
    state.savedOnce = true; // ce projet existe déjà dans un fichier
    renderTeam();
    reportLoaded(r, picked.file.name);
    return true;
  }

  function reportLoaded(r, name) {
    if (r.warnings.length) showMessage(r.warnings.join(' '), 'info');
    else showMessage(`Projet « ${name} » ouvert : l'IA et les blocs sont retrouvés.`, 'ok');
  }

  // --- Copie de secours -----------------------------------------------------------------------
  async function backupNow() {
    if (training.categories.every((c) => c.examples.length === 0) && !state.team.length) return;
    if (await saveBackup(await collect())) state.changedSinceBackup = false;
  }
  setInterval(() => state.changedSinceBackup && backupNow(), BACKUP_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state.changedSinceBackup) backupNow();
  });

  async function resumeBackup() {
    const b = await loadBackup();
    if (!b) return false;
    const r = parse(b.data, { modelId: MODEL_ID });
    if (!r.ok) {
      showMessage(r.error);
      return false;
    }
    apply(r.project);
    state.handle = null;
    state.dirty = true; // la copie de secours n'est pas le fichier : il faut enregistrer
    renderTeam();
    showMessage('Dernier travail repris. Pensez à cliquer sur « 💾 Enregistrer » pour le ranger dans votre dossier.', 'info');
    return true;
  }

  // --- Fenêtre de démarrage ------------------------------------------------------------------------
  const dialog = $('start-dialog');
  const names = [...dialog.querySelectorAll('.team-name')];

  async function showStart({ firstTime = false } = {}) {
    names.forEach((input, i) => (input.value = state.team[i] ?? ''));
    $('start-close').hidden = firstTime;
    const b = await loadBackup();
    const resume = $('start-resume');
    resume.hidden = !b;
    if (b) {
      const when = new Date(b.savedAt).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
      $('start-resume-detail').textContent = `${b.team.length ? b.team.join(', ') : 'sans prénoms'} — ${when}`;
    }
    $('start-error').textContent = '';
    // Page d'accueil : non modale, pour que « Tout éteindre » et les pastilles restent utilisables.
    document.body.classList.add('is-start');
    dialog.show();
    names[0].focus();
  }
  dialog.addEventListener('close', () => document.body.classList.remove('is-start'));

  function readTeam() {
    return names.map((i) => i.value.trim()).filter(Boolean);
  }

  async function confirmLoseWork() {
    return !unsavedWork() || confirm("Le travail actuel n'est pas enregistré. Le remplacer quand même ?");
  }

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('start-close').hidden) dialog.close();
  });
  $('start-close').addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-start]')?.dataset.start;
    if (!action) return;
    const team = readTeam();
    if (action === 'new' && team.length === 0) {
      $('start-error').textContent = 'Écrivez au moins un prénom (il sert à nommer votre fichier).';
      names[0].focus();
      return;
    }
    if (!(await confirmLoseWork())) return;
    let ok = true;
    if (action === 'new') {
      state.team = team;
      apply(emptyProject(), { team });
      state.handle = null;
      hideMessage();
    } else if (action === 'open') {
      if (team.length) state.team = team;
      ok = await openFile();
    } else if (action === 'resume') {
      ok = await resumeBackup();
    }
    if (ok) dialog.close();
  });

  // --- Barre « équipe » et boutons ------------------------------------------------------------------
  function renderTeam() {
    $('team-names').textContent = state.team.length ? state.team.join(', ') : 'Équipe sans nom';
    const unsaved = unsavedWork();
    const saved = !unsaved && hasWork();
    $('save-state').innerHTML = unsaved ? 'non enregistré' : saved ? icon('ok', { size: 18 }) + 'enregistré' : '';
    $('save-state').dataset.dirty = String(unsaved);
    $('save-state').hidden = !unsaved && !saved;
    onTeamChange();
  }

  // --- Changer les prénoms (sans toucher au projet) -------------------------------------------------
  const teamDialog = $('team-dialog');
  const teamInputs = [...teamDialog.querySelectorAll('.team-edit')];
  $('btn-rename-team').addEventListener('click', () => {
    teamInputs.forEach((input, i) => (input.value = state.team[i] ?? ''));
    teamDialog.showModal();
    teamInputs[0].focus();
  });
  $('team-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const team = teamInputs.map((i) => i.value.trim()).filter(Boolean);
    if (!team.length) return teamInputs[0].focus();
    state.team = team;
    state.handle = null; // nouveau nom de fichier proposé au prochain enregistrement
    touch();
    teamDialog.close();
  });
  $('btn-save').addEventListener('click', () => save());
  $('btn-project').addEventListener('click', () => showStart());
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });

  renderTeam();
  return { showStart, save, collect, state, touch };
}

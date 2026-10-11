// Projets : fenêtre de démarrage (prénoms), enregistrer, ouvrir,
// copie de secours automatique et « Reprendre mon dernier travail ».

import { serialize, parse, fileName } from '../project.js';
import { saveBackup, loadBackup, saveFolder, loadFolder } from '../autosave.js';
import { teamFolderName, classPath, isClassFolderName, isTeamFolderName, teamFolderIn, findProjectFile, listTeamFolders, writeProject, readValidations } from '../team-folder.js';
import { MODEL_ID } from '../vision.js';
import { normalizeSettings } from '../settings.js';

const BACKUP_EVERY_MS = 60_000;
const AUTOSAVE_AFTER_MS = 4_000; // enregistrement automatique : 4 s après la dernière modification

import { icon } from '../icons.js';

export function setupProjects({ training, sounds, settings, program, ledColors, carnet, onSettingsChanged, showMessage, hideMessage, onTeamChange = () => {}, onNewProject = () => {} }) {
  const $ = (id) => document.getElementById(id);
  const state = {
    team: [],
    handle: null, // fichier du projet, dans le dossier de l'équipe (Chrome / Edge)
    teamDir: null, // dossier de l'équipe : THEATRE IA › LEA - TOM
    dirty: false, // modifications non enregistrées dans le fichier
    changedSinceBackup: false,
    loading: false,
  };

  // --- Suivi des modifications ------------------------------------------------------------
  const touch = () => {
    if (state.loading) return;
    state.dirty = true;
    state.changedSinceBackup = true;
    state.version = (state.version ?? 0) + 1;
    renderTeam();
    scheduleAutoSave();
  };

  // --- Enregistrement automatique -----------------------------------------------------------
  // Une fois le dossier de l'équipe choisi, le fichier est réécrit tout seul après chaque modification
  // (quelques secondes plus tard, pour ne pas écrire à chaque photo). « Enregistrer » reste possible.
  let autoTimer = null;
  let autoBusy = false;
  function scheduleAutoSave() {
    if (!state.handle) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(autoSave, AUTOSAVE_AFTER_MS);
  }
  async function autoSave() {
    if (!state.handle || !state.dirty) return;
    if (autoBusy) return scheduleAutoSave();
    autoBusy = true;
    const version = state.version;
    try {
      const w = await state.handle.createWritable();
      await w.write(JSON.stringify(await collect()));
      await w.close();
      if (state.version === version) state.dirty = false; // sinon : une modification est arrivée pendant l'écriture
      else scheduleAutoSave();
      state.savedOnce = true;
      renderTeam();
      refreshValidations();
    } catch {
      state.handle = null;
      state.teamDir = null;
      showMessage('L’enregistrement automatique n’a pas pu écrire dans votre dossier. Menu de l’équipe → « Enregistrer » pour choisir de nouveau le dossier THEATRE IA.');
    } finally {
      autoBusy = false;
    }
  }
  // Onglet caché ou fermé : on enregistre tout de suite ce qui ne l'est pas encore.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state.dirty && state.handle) {
      clearTimeout(autoTimer);
      autoSave();
    }
  });
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
    if (carnet.hasWork()) return true;
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
      carnet: carnet.get(),
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
      carnet.replace(project.carnet);
      state.team = team ?? (project.team.length ? project.team : state.team);
    } finally {
      state.loading = false;
    }
    state.dirty = false;
    state.changedSinceBackup = false;
    renderTeam();
  }

  function emptyProject() {
    return { settings: { ...settings }, categories: [], sounds: [], blocks: null, team: [], ledColors: {}, carnet: null };
  }

  // --- Enregistrer ---------------------------------------------------------------------------
  // Le projet est rangé dans « 3B › COMMUN › TECHNOLOGIE › THEATRE IA › LEA - TOM ».
  // Premier enregistrement : fenêtre « Ranger votre projet » (choix du dossier THEATRE IA) ;
  // ensuite, on écrit toujours dans le même fichier, sans rien demander.
  async function save() {
    if (!state.handle) {
      if ('showDirectoryPicker' in window) return openFolderDialog();
      const text = JSON.stringify(await collect());
      const name = fileName(state.team);
      download(text, name);
      return saved(name, true);
    }
    try {
      const w = await state.handle.createWritable();
      await w.write(JSON.stringify(await collect()));
      await w.close();
      saved(`${state.teamDir?.name ? state.teamDir.name + ' › ' : ''}${state.handle.name}`);
      refreshValidations();
    } catch {
      // Autorisation retirée, dossier réseau indisponible… : on redemande le dossier.
      state.handle = null;
      state.teamDir = null;
      openFolderDialog('Le dossier n’est plus accessible : choisissez de nouveau le dossier THEATRE IA.');
    }
  }

  const folderDialog = $('folder-dialog');
  function openFolderDialog(error = '') {
    $('folder-path').textContent = classPath(carnet.get().classe);
    $('folder-team').textContent = teamFolderName(state.team);
    $('folder-file').textContent = fileName(state.team);
    $('folder-error').textContent = error;
    if (!folderDialog.open) folderDialog.showModal();
  }
  folderDialog.querySelector('[data-folder-later]').addEventListener('click', () => {
    folderDialog.close();
    showMessage('Pensez à ranger votre projet : menu de l’équipe → « Enregistrer ».', 'info');
  });
  folderDialog.addEventListener('cancel', (e) => e.preventDefault()); // on choisit « Plus tard » ou le dossier
  $('btn-folder-choose').addEventListener('click', async () => {
    if (await chooseFolderAndSave()) folderDialog.close();
  });

  async function chooseFolderAndSave() {
    let dir;
    try {
      dir = await window.showDirectoryPicker({ id: 'theatre-ia', mode: 'readwrite' });
    } catch (e) {
      if (e.name !== 'AbortError') $('folder-error').textContent = 'Ce dossier ne peut pas être choisi. Choisissez le dossier THEATRE IA de votre classe.';
      return false;
    }
    if (!isClassFolderName(dir.name) && !isTeamFolderName(dir.name, state.team)) {
      const ok = confirm(`Le dossier choisi s’appelle « ${dir.name} ».\nIl faut choisir « THEATRE IA » (${classPath(carnet.get().classe)}).\n\nContinuer quand même ?`);
      if (!ok) return false;
    }
    try {
      const teamDir = await teamFolderIn(dir, state.team);
      const existing = await findProjectFile(teamDir);
      if (existing && !confirm(`Le dossier « ${teamDir.name} » contient déjà un projet (« ${existing.handle.name} »).\nLe remplacer par celui-ci ?`)) return false;
      const handle = await writeProject(teamDir, state.team, JSON.stringify(await collect()));
      state.handle = handle;
      state.teamDir = teamDir;
      saveFolder({ teamDir, handle, team: state.team });
      saved(`${teamDir.name} › ${handle.name}`);
      refreshValidations();
      return true;
    } catch {
      $('folder-error').textContent = 'Impossible d’écrire dans ce dossier. Vérifiez que vous avez choisi le dossier de votre classe, puis réessayez.';
      return false;
    }
  }

  function saved(name, downloaded = false) {
    state.dirty = false;
    state.savedOnce = true;
    renderTeam();
    showMessage(
      downloaded
        ? `Projet téléchargé : « ${name} ». Rangez-le dans ${classPath(carnet.get().classe)} › ${teamFolderName(state.team)}.`
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

  // Validations ◆ du professeur (fichier validations.json du dossier de l'équipe).
  async function refreshValidations() {
    if (state.teamDir) carnet.setValidations(await readValidations(state.teamDir));
  }

  // --- Ouvrir -----------------------------------------------------------------------------------
  // On choisit le dossier THEATRE IA (puis son équipe dans la liste) ou directement le dossier de l'équipe.
  async function openFile() {
    if (!('showDirectoryPicker' in window)) return openFileClassic();
    let dir;
    try {
      dir = await window.showDirectoryPicker({ id: 'theatre-ia', mode: 'readwrite' });
    } catch (e) {
      return e.name === 'AbortError' ? false : openFileClassic();
    }
    const here = await findProjectFile(dir);
    if (here) return openFrom(dir, here);
    const teams = await listTeamFolders(dir);
    if (!teams.length) {
      showMessage(`Aucun projet dans « ${dir.name} ». Choisissez le dossier THEATRE IA de votre classe, ou le dossier à vos prénoms.`);
      return false;
    }
    const pick = teams.length === 1 ? teams[0] : await chooseTeam(teams);
    return pick ? openFrom(pick.dir, pick) : false;
  }

  function chooseTeam(teams) {
    const dialog = $('teams-dialog');
    const list = $('teams-list');
    return new Promise((resolve) => {
      let chosen = null;
      list.replaceChildren(
        ...teams.map((t) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'teams-item';
          b.innerHTML = `${icon('equipe', { size: 20 })}<b></b><small></small>`;
          b.querySelector('b').textContent = t.name;
          b.querySelector('small').textContent = `enregistré le ${new Date(t.file.lastModified).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`;
          b.addEventListener('click', () => {
            chosen = t;
            dialog.close();
          });
          return b;
        }),
      );
      dialog.addEventListener('close', () => resolve(chosen), { once: true });
      dialog.showModal();
    });
  }

  async function openFrom(teamDir, { handle, file }) {
    const r = parse(await file.text(), { modelId: MODEL_ID });
    if (!r.ok) {
      showMessage(r.error);
      return false;
    }
    apply(r.project, { team: r.project.team.length ? r.project.team : state.team });
    state.handle = handle;
    state.teamDir = teamDir;
    state.savedOnce = true; // ce projet existe déjà dans un fichier
    saveFolder({ teamDir, handle, team: state.team });
    renderTeam();
    refreshValidations();
    reportLoaded(r, `${teamDir.name} › ${file.name}`);
    return true;
  }

  // Navigateur sans choix de dossier : sélecteur de fichier classique (on enregistrera par téléchargement).
  function openFileClassic() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return resolve(false);
        const r = parse(await file.text(), { modelId: MODEL_ID });
        if (!r.ok) {
          showMessage(r.error);
          return resolve(false);
        }
        apply(r.project, { team: r.project.team.length ? r.project.team : state.team });
        state.handle = null;
        state.teamDir = null;
        state.savedOnce = true;
        renderTeam();
        reportLoaded(r, file.name);
        resolve(true);
      };
      input.click();
    });
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
    state.teamDir = null;
    const folder = await loadFolder();
    if (folder?.handle && sameTeam(folder.team, state.team)) {
      try {
        if ((await folder.handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
          state.handle = folder.handle;
          state.teamDir = folder.teamDir;
          refreshValidations();
        }
      } catch {
        /* il faudra rechoisir le dossier */
      }
    }
    state.dirty = true; // la copie de secours n'est pas le fichier : il faut enregistrer
    renderTeam();
    showMessage('Dernier travail repris. Pensez à cliquer sur « 💾 Enregistrer » pour le ranger dans votre dossier.', 'info');
    return true;
  }

  const sameTeam = (a = [], b = []) => a.join('|') === b.join('|');

  // --- Fenêtre de démarrage ------------------------------------------------------------------------
  const dialog = $('start-dialog');
  const names = [...dialog.querySelectorAll('.team-name')];

  async function showStart({ firstTime = false } = {}) {
    names.forEach((input, i) => (input.value = state.team[i] ?? ''));
    $('start-class').value = carnet.get().classe ?? '';
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
    const classe = $('start-class').value.trim().toUpperCase();
    if (action === 'new' && team.length === 0) {
      $('start-error').textContent = 'Écrivez au moins un prénom (il sert à nommer votre dossier).';
      names[0].focus();
      return;
    }
    if (action === 'new' && !classe) {
      $('start-error').textContent = 'Écrivez votre classe (ex. 3B) : elle indique où ranger votre projet.';
      $('start-class').focus();
      return;
    }
    if (!(await confirmLoseWork())) return;
    let ok = true;
    if (action === 'new') {
      state.team = team;
      apply({ ...emptyProject(), carnet: { classe } }, { team });
      state.handle = null;
      state.teamDir = null;
      hideMessage();
    } else if (action === 'open') {
      if (team.length) state.team = team;
      ok = await openFile();
    } else if (action === 'resume') {
      ok = await resumeBackup();
    }
    if (ok) dialog.close();
    if (ok && action === 'new') {
      onNewProject();
      openFolderDialog(); // première chose : ranger le projet dans THEATRE IA
    }
  });

  // --- Barre « équipe » et boutons ------------------------------------------------------------------
  function renderTeam() {
    $('team-names').textContent = state.team.length ? state.team.join(', ') : 'Équipe sans nom';
    const unsaved = unsavedWork();
    const saved = !unsaved && hasWork();
    $('save-state').innerHTML = unsaved ? (state.handle ? 'enregistrement…' : 'non enregistré') : saved ? icon('ok', { size: 18 }) + 'enregistré' : '';
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
    state.handle = null; // nouveau dossier et nouveau nom de fichier au prochain enregistrement
    state.teamDir = null;
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

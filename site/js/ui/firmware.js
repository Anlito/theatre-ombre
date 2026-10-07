// Fenêtre « Installer le programme sur la carte » : s'ouvre quand la carte ne répond pas
// (elle a servi à un autre projet). Utilisée par l'outil et par la page de diagnostic.

import { loadFirmware, flashFirmware } from '../flasher.js';
import { WebSerialTransport } from '../serial.js';
import { icon } from '../icons.js';

const PHASES = {
  connexion: 'Préparation de la carte…',
  ecriture: 'Écriture du programme…',
  verification: 'Vérification…',
  fin: 'Programme installé !',
};

// onConnected(result) : appelé après la reconnexion qui suit l'installation.
export function setupFirmwareDialog({ link, showMessage = () => {}, hideMessage = () => {}, onConnected = () => {} }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog dialog-small';
  dialog.setAttribute('aria-labelledby', 'firmware-title');
  dialog.innerHTML = `
    <div class="dialog-head">
      <span class="dialog-icon">${icon('carte', { size: 24 })}</span>
      <h2 id="firmware-title">Installer le programme sur la carte</h2>
      <span class="spacer"></span>
      <button class="icon-btn dialog-close" type="button" data-fw-close aria-label="Fermer" title="Fermer">${icon('fermer')}</button>
    </div>
    <div class="dialog-body">
      <p>Cette carte n'a pas le programme du Théâtre d'ombre : elle a sans doute servi à <b>un autre projet</b>
        (mBlock, IDE Arduino…).</p>
      <p>Le site peut l'installer maintenant : <b>quelques secondes</b>, rien à installer sur l'ordinateur.
        Pendant l'installation, <b>ne débranchez pas le câble USB</b>.</p>
      <div class="progress firmware-progress" hidden><span></span></div>
      <p class="firmware-status" role="status" aria-live="polite"></p>
    </div>
    <div class="dialog-foot">
      <button class="btn btn-secondary" type="button" data-fw-close>Annuler</button>
      <span class="spacer"></span>
      <button class="btn btn-primary" type="button" data-fw-install>${icon('telecharger')}Installer le programme</button>
    </div>`;
  document.body.append(dialog);

  const q = (sel) => dialog.querySelector(sel);
  const bar = q('.firmware-progress');
  const status = q('.firmware-status');
  const install = q('[data-fw-install]');
  let port = null;
  let busy = false;

  const setBusy = (on) => {
    busy = on;
    install.disabled = on;
    for (const b of dialog.querySelectorAll('[data-fw-close]')) b.disabled = on;
  };
  const setStatus = (text, kind = '') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };

  // Pas de fermeture (Échap) pendant l'écriture : la carte resterait sans programme.
  dialog.addEventListener('cancel', (e) => busy && e.preventDefault());
  for (const b of dialog.querySelectorAll('[data-fw-close]')) b.addEventListener('click', () => dialog.close());

  install.addEventListener('click', async () => {
    if (!port || busy) return;
    setBusy(true);
    bar.hidden = false;
    bar.firstElementChild.style.width = '0%';
    setStatus(PHASES.connexion);
    let result;
    try {
      const image = await loadFirmware();
      result = await flashFirmware(port, image, {
        onProgress: ({ phase, fraction }) => {
          // Écriture = 0 à 60 %, vérification = 60 à 100 %.
          const total = phase === 'ecriture' ? fraction * 0.6 : phase === 'verification' ? 0.6 + fraction * 0.4 : phase === 'fin' ? 1 : 0;
          bar.firstElementChild.style.width = `${Math.round(total * 100)}%`;
          setStatus(PHASES[phase]);
        },
      });
    } catch (e) {
      result = { ok: false, error: e.message };
    }
    setBusy(false);
    if (!result.ok) {
      bar.hidden = true;
      setStatus(result.error, 'error');
      install.innerHTML = `${icon('telecharger')}Réessayer`;
      return;
    }
    setStatus('Programme installé ! Connexion à la carte…', 'ok');
    await new Promise((r) => setTimeout(r, 400));
    dialog.close();
    showMessage('Programme installé. Connexion à la carte… (2 secondes)', 'info');
    const r = await link.connect(new WebSerialTransport(port));
    if (r.ok) showMessage('Programme installé : la carte est prête.', 'ok');
    onConnected(r);
  });

  return {
    // Propose l'installation sur ce port (déjà choisi par l'élève, et fermé).
    offer(p) {
      port = p;
      hideMessage();
      bar.hidden = true;
      setStatus('');
      install.innerHTML = `${icon('telecharger')}Installer le programme`;
      setBusy(false);
      dialog.showModal();
      install.focus();
    },
  };
}

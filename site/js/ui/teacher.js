// Mode professeur : protégé par un code simple (config.js). Ce n'est pas une vraie sécurité :
// un élève curieux pourrait le contourner, mais il évite les changements par erreur.

import { CONFIG } from '../../config.js';
import { normalizeSettings, saveStored, initialSettings, MAX_LEDS } from '../settings.js';
import { PINS, PWM_PINS } from '../protocol.js';

export function setupTeacherMode({ settings, onSettingsChanged, showMessage }) {
  const $ = (id) => document.getElementById(id);
  const codeDialog = $('teacher-code-dialog');
  const dialog = $('teacher-dialog');

  // Listes des 4 broches possibles.
  const selects = [];
  for (let i = 0; i < MAX_LEDS; i++) {
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', `Broche de la LED ${i + 1}`);
    sel.append(new Option('— aucune —', ''));
    for (const p of PINS) sel.append(new Option(PWM_PINS.includes(p) ? `${p} ~` : `${p}`, p));
    const label = document.createElement('label');
    label.className = 'pin-choice';
    label.append(`LED ${i + 1} : `, sel);
    $('teacher-pins').append(label);
    selects.push(sel);
  }

  $('btn-teacher').addEventListener('click', () => {
    $('teacher-code').value = '';
    $('teacher-code-error').textContent = '';
    codeDialog.showModal();
  });
  $('teacher-code-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('teacher-code').value.trim() !== CONFIG.codeProfesseur) {
      $('teacher-code-error').textContent = 'Code incorrect.';
      return;
    }
    codeDialog.close();
    fill(settings);
    dialog.showModal();
  });
  $('teacher-code-cancel').addEventListener('click', () => codeDialog.close());

  function fill(s) {
    $('teacher-level').value = String(s.level);
    $('teacher-threshold').value = String(Math.round(s.threshold * 100));
    $('teacher-threshold-value').textContent = `${Math.round(s.threshold * 100)} %`;
    $('teacher-stable').value = String(s.stableFrames);
    $('teacher-lock').checked = !!s.levelLocked;
    selects.forEach((sel, i) => (sel.value = s.ledPins[i] !== undefined ? String(s.ledPins[i]) : ''));
  }
  $('teacher-threshold').addEventListener('input', () => {
    $('teacher-threshold-value').textContent = `${$('teacher-threshold').value} %`;
  });

  function read() {
    return normalizeSettings({
      level: Number($('teacher-level').value),
      threshold: Number($('teacher-threshold').value) / 100,
      stableFrames: Number($('teacher-stable').value),
      ledPins: selects.map((s) => s.value).filter(Boolean),
      levelLocked: $('teacher-lock').checked,
    });
  }

  $('teacher-apply').addEventListener('click', () => {
    const s = read();
    Object.assign(settings, s);
    saveStored(s); // réglages par défaut de ce poste pour les prochains projets
    onSettingsChanged();
    dialog.close();
    showMessage(`Réglages appliqués : niveau ${s.level}, seuil ${Math.round(s.threshold * 100)} %, ${s.stableFrames} images, LED sur ${s.ledPins.join(', ')}.`, 'ok');
  });
  $('teacher-reset').addEventListener('click', () => {
    saveStored(null);
    fill(initialSettings(CONFIG, '', null));
  });
  $('teacher-close').addEventListener('click', () => dialog.close());
}

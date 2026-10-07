// Câblage des LED : panneau à droite (tableau des broches, schéma, sécurité), libellés
// « broches 9, 10, 11, 12 » partout dans l'outil, et rappel avant de connecter la carte.

import { PWM_PINS } from '../protocol.js';

export function setupCablage({ settings, ledColors }) {
  const $ = (id) => document.getElementById(id);
  const dialog = $('cablage-dialog');

  function render() {
    const pins = settings.ledPins;
    for (const el of document.querySelectorAll('.cablage-pins')) el.textContent = `broches ${pins.join(', ')}`;
    const swatch = (p) => `<span class="pin-swatch" style="background:${ledColors.hex(p)}"></span>`;
    $('cablage-pins').innerHTML = pins
      .map((p) => `<tr><td>${swatch(p)}LED ${ledColors.name(p)}</td><td><span class="pin-num">${p}${PWM_PINS.includes(p) ? ' ~' : ''}</span></td></tr>`)
      .join('');
    $('connect-pins').innerHTML = pins.map((p) => `<li>${swatch(p)}<b>LED ${ledColors.name(p)}</b> → broche <b>${p}</b></li>`).join('');
  }

  function open() {
    render();
    for (const d of document.querySelectorAll('dialog[open]')) if (d !== dialog && d.id !== 'start-dialog') d.close();
    dialog.showModal();
  }

  for (const id of ['btn-cablage', 'btn-cablage-menu', 'btn-cablage-footer', 'btn-strip-cablage', 'btn-start-cablage', 'btn-connect-cablage']) {
    $(id)?.addEventListener('click', open);
  }
  render();
  return { open, render };
}

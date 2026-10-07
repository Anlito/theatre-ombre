// La « carte » vue par le reste du site : envoie les ordres par la liaison série
// et garde en mémoire ce qui a été demandé, pour l'afficher à l'écran.

import { PINS } from './protocol.js';
import { LED_COLORS } from './led-colors.js';

export class Board {
  constructor(link) {
    this.link = link;
    this.pins = Object.fromEntries(PINS.map((p) => [p, 0])); // broche -> 0 (éteinte) à 255 (allumée à fond)
    this.listeners = new Set();
    // Si la carte est déconnectée, elle s'est éteinte d'elle-même.
    link.subscribe(({ state }) => {
      if (state === 'deconnectee') this.forget();
    });
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.pins);
  }

  forget() {
    for (const p of PINS) this.pins[p] = 0;
    this.emit();
  }

  // Dans une boucle « répéter indéfiniment », un programme peut demander « allumer » des centaines
  // de fois par seconde : on n'envoie l'ordre à la carte que si l'état de la LED change.
  async digitalWrite(pin, on) {
    const target = on ? 255 : 0;
    if (this.link.connected && this.pins[pin] === target) return { ok: true };
    const r = await this.link.digitalWrite(pin, on);
    if (r.ok) {
      this.pins[pin] = target;
      this.emit();
    }
    return r;
  }

  async analogWrite(pin, value) {
    const target = Math.max(0, Math.min(255, Math.round(value)));
    if (this.link.connected && this.pins[pin] === target) return { ok: true };
    const r = await this.link.analogWrite(pin, value);
    if (r.ok) {
      this.pins[pin] = target;
      this.emit();
    }
    return r;
  }

  async allOff() {
    const r = await this.link.allOff();
    this.forget();
    return r;
  }
}

// Puces des LED : « 9 · allumée » (jamais la couleur seule).
// On affiche les broches prévues par le professeur, plus toute autre broche allumée.
// colors : couleurs choisies par l'équipe (LedColors) -> la LED allumée s'éclaire de sa couleur.
// editable : un menu permet de choisir la couleur de la LED branchée sur chaque broche.
// compact : la bande d'état du niveau 3 n'affiche que le numéro pour les LED éteintes.
export function renderBoardPanel(container, pins, ledPins = PINS, { compact = false, colors = null, editable = false } = {}) {
  // Pendant qu'un élève choisit une couleur, on ne redessine pas sous ses doigts.
  if (container.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') return;
  const shown = [...ledPins, ...PINS.filter((p) => !ledPins.includes(p) && pins[p] > 0)];
  container.replaceChildren(
    ...shown.map((p) => {
      const v = pins[p];
      const el = document.createElement('div');
      el.className = 'pin';
      el.dataset.on = String(v > 0);
      if (colors) el.style.setProperty('--led', colors.hex(p));
      const mot = v === 0 ? 'éteinte' : v === 255 ? 'allumée' : `${Math.round((v / 255) * 100)} %`;
      const couleur = colors ? colors.name(p) : '';
      if (editable && colors) {
        el.classList.add('pin-editable');
        const options = Object.entries(LED_COLORS)
          .map(([key, c]) => `<option value="${key}"${key === colors.get(p) ? ' selected' : ''}>${c.nom}</option>`)
          .join('');
        el.innerHTML = `
          <span class="pin-led" aria-hidden="true"></span>
          <span class="pin-num-label">${p}</span>
          <select class="pin-color" data-pin="${p}" aria-label="Couleur de la LED branchée sur la broche ${p}" title="Couleur de la LED branchée sur la broche ${p}">${options}</select>
          <span class="pin-state">${mot}</span>`;
      } else {
        const texte = compact && v === 0 ? `${p}` : `${p} · ${couleur ? couleur + ' · ' : ''}${mot}`;
        el.innerHTML = `<span class="pin-led" aria-hidden="true"></span><span class="pin-text">${texte}</span>`;
      }
      el.title = `Broche ${p}${couleur ? ` (LED ${couleur})` : ''} : ${mot}`;
      return el;
    }),
  );
}

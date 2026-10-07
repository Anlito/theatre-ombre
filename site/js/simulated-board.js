// Carte Arduino simulée : elle applique EXACTEMENT les mêmes règles que arduino/theatre_ombre/theatre_ombre.ino.
// Elle sert aux tests automatiques et au « mode démo » du site (sans carte branchée).
// Si tu modifies le .ino, modifie aussi ce fichier (et inversement).

import { PINS, PWM_PINS, MIN_FREQ, MAX_FREQ, MAX_TONE_MS } from './protocol.js';

export const WATCHDOG_MS = 3000;
const MAX_LINE = 32;

export class SimulatedBoard {
  // now : fonction qui donne l'heure en ms (remplaçable dans les tests).
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.lastContact = now();
    this.pins = {}; // broche -> { mode: 'D' | 'A', value }
    this.tone = null; // { pin, freq, until }
    this.onOutput = () => {}; // appelée à chaque ligne envoyée par la carte
    this.onChange = () => {}; // appelée quand l'état des sorties change
  }

  // Appelée régulièrement (comme loop() sur la carte).
  tick() {
    if (this.now() - this.lastContact > WATCHDOG_MS && this.hasOutputs()) {
      this.allOff();
    }
    if (this.tone && this.now() >= this.tone.until) {
      this.tone = null;
      this.onChange();
    }
  }

  hasOutputs() {
    return this.tone !== null || Object.values(this.pins).some((p) => p.value > 0);
  }

  allOff() {
    for (const p of Object.keys(this.pins)) this.pins[p].value = 0;
    this.tone = null;
    this.onChange();
  }

  // Reçoit une ligne complète (sans le \n) et renvoie la réponse de la carte.
  receive(line) {
    this.lastContact = this.now();
    const reply = this.execute(line);
    this.onOutput(reply);
    return reply;
  }

  execute(rawLine) {
    const line = String(rawLine).replace(/\r$/, '');
    if (line.length === 0 || line.length > MAX_LINE) return 'ERR CMD';
    const words = line.trim().toUpperCase().split(/ +/);
    const cmd = words[0];
    const args = words.slice(1);

    if (cmd === 'PING' && args.length === 0) return 'PONG v1';
    if (cmd === 'OFF' && args.length === 0) {
      this.allOff();
      return 'OK';
    }

    const nums = args.map(parseStrictInt);
    if (nums.some((n) => n === null)) return 'ERR CMD';

    if (cmd === 'D' && nums.length === 2) {
      const [pin, v] = nums;
      if (!PINS.includes(pin)) return 'ERR PIN';
      if (v !== 0 && v !== 1) return 'ERR CMD';
      this.pins[pin] = { mode: 'D', value: v };
      this.onChange();
      return 'OK';
    }
    if (cmd === 'A' && nums.length === 2) {
      const [pin, v] = nums;
      if (!PWM_PINS.includes(pin)) return 'ERR PIN';
      if (v < 0 || v > 255) return 'ERR CMD';
      this.pins[pin] = { mode: 'A', value: v };
      this.onChange();
      return 'OK';
    }
    if (cmd === 'T' && nums.length === 3) {
      const [pin, f, d] = nums;
      if (!PINS.includes(pin)) return 'ERR PIN';
      if (f < MIN_FREQ || f > MAX_FREQ || d < 1 || d > MAX_TONE_MS) return 'ERR CMD';
      this.tone = { pin, freq: f, until: this.now() + d };
      this.onChange();
      return 'OK';
    }
    return 'ERR CMD';
  }

  // Valeur actuelle d'une broche (0 si jamais utilisée).
  read(pin) {
    return this.pins[pin]?.value ?? 0;
  }
}

// Comme sur la carte : seulement des chiffres, sans signe, au plus 5 chiffres.
function parseStrictInt(s) {
  if (!/^\d{1,5}$/.test(s)) return null;
  return Number(s);
}

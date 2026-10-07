// Protocole texte entre le navigateur et le programme Arduino fixe.
// Ce fichier ne touche ni à la page ni au port série : il sert au site ET aux tests.
//
// Commandes (une par ligne, terminée par \n) :
//   PING                      -> PONG v1
//   D <broche> <0|1>          -> OK      (allumer / éteindre)
//   A <broche> <0..255>       -> OK      (intensité, broches PWM seulement)
//   T <broche> <freq> <ms>    -> OK      (note sur un buzzer)
//   OFF                       -> OK      (tout éteindre)
// Erreurs : ERR PIN (broche interdite), ERR CMD (commande inconnue ou mal formée).

export const BAUD_RATE = 115200;
export const PROTOCOL_VERSION = 'v1';
export const PINS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
// Broches qui savent faire varier la luminosité (PWM) sur Uno et Nano.
export const PWM_PINS = [3, 5, 6, 9, 10, 11];
export const MIN_FREQ = 31;
export const MAX_FREQ = 20000;
export const MAX_TONE_MS = 10000;

const isInt = (n) => Number.isInteger(n);

// Chaque fonction renvoie { ok: true, line } ou { ok: false, error } avec un message en français.
export function ping() {
  return { ok: true, line: 'PING' };
}

export function off() {
  return { ok: true, line: 'OFF' };
}

export function digital(pin, on) {
  const err = checkPin(pin);
  if (err) return err;
  return { ok: true, line: `D ${pin} ${on ? 1 : 0}` };
}

export function analog(pin, value) {
  const err = checkPin(pin);
  if (err) return err;
  if (!PWM_PINS.includes(pin)) {
    return {
      ok: false,
      error: `La broche ${pin} ne sait pas régler l'intensité. Utilise une de ces broches : ${PWM_PINS.join(', ')}.`,
    };
  }
  const v = Math.round(Number(value));
  if (!Number.isFinite(v)) return { ok: false, error: "L'intensité doit être un nombre entre 0 et 255." };
  return { ok: true, line: `A ${pin} ${clamp(v, 0, 255)}` };
}

export function tone(pin, freq, ms) {
  const err = checkPin(pin);
  if (err) return err;
  const f = Math.round(Number(freq));
  const d = Math.round(Number(ms));
  if (!Number.isFinite(f) || !Number.isFinite(d)) {
    return { ok: false, error: 'La fréquence et la durée doivent être des nombres.' };
  }
  return { ok: true, line: `T ${pin} ${clamp(f, MIN_FREQ, MAX_FREQ)} ${clamp(d, 1, MAX_TONE_MS)}` };
}

function checkPin(pin) {
  if (!isInt(pin) || !PINS.includes(pin)) {
    return {
      ok: false,
      error: `La broche ${pin} n'est pas autorisée. Choisis une broche entre 2 et 13 (0 et 1 servent au câble USB).`,
    };
  }
  return null;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Lecture d'une ligne envoyée par la carte.
export function parseResponse(raw) {
  const line = String(raw).trim();
  if (line === 'OK') return { type: 'ok' };
  const pong = /^PONG (v\d+)$/.exec(line);
  if (pong) return { type: 'pong', version: pong[1] };
  const err = /^ERR (PIN|CMD)$/.exec(line);
  if (err) return { type: 'err', code: err[1] };
  // Tout le reste (message de démarrage, parasites au branchement) est ignoré.
  return { type: 'other', line };
}

// Découpe un flux de texte en lignes complètes. Garde le morceau incomplet pour la suite.
export class LineSplitter {
  constructor() {
    this.buffer = '';
  }
  push(chunk) {
    this.buffer += chunk;
    const parts = this.buffer.split('\n');
    this.buffer = parts.pop();
    return parts.map((l) => l.replace(/\r$/, '')).filter((l) => l.length > 0);
  }
}

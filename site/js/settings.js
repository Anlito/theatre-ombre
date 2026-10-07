// Réglages du professeur : niveau, seuil de confiance, stabilité, broches des LED.
// Ordre de priorité pour un nouveau projet :
//   config.js  <  réglages enregistrés sur ce poste (mode professeur)  <  adresse (?niveau=2&broches=9,10)
// Un projet rechargé garde ses propres réglages (ils sont dans le fichier .json).

import { PINS } from './protocol.js';

export const MAX_LEDS = 4;
const STORAGE_KEY = 'theatre-ombre.reglages';

// Ramène des réglages quelconques dans des valeurs sûres.
export function normalizeSettings(s = {}, fallback = {}) {
  const pick = (v, d) => (v === undefined || v === null || Number.isNaN(v) ? d : v);
  const level = Math.round(Number(pick(s.level, fallback.level ?? 1)));
  const threshold = Number(pick(s.threshold, fallback.threshold ?? 0.8));
  const stableFrames = Math.round(Number(pick(s.stableFrames, fallback.stableFrames ?? 5)));
  let ledPins = Array.isArray(s.ledPins) ? s.ledPins : fallback.ledPins ?? [9, 10, 11, 12];
  ledPins = [...new Set(ledPins.map(Number).filter((p) => PINS.includes(p)))].slice(0, MAX_LEDS);
  if (ledPins.length === 0) ledPins = [9];
  return {
    level: Math.min(3, Math.max(1, Number.isFinite(level) ? level : 1)),
    threshold: Math.min(0.99, Math.max(0.5, Number.isFinite(threshold) ? threshold : 0.8)),
    stableFrames: Math.min(20, Math.max(1, Number.isFinite(stableFrames) ? stableFrames : 5)),
    ledPins,
    levelLocked: !!pick(s.levelLocked, fallback.levelLocked ?? false),
  };
}

// config : l'objet CONFIG de config.js ; search : location.search ; stored : réglages du poste.
export function initialSettings(config, search = '', stored = loadStored()) {
  const base = normalizeSettings({
    level: config.niveau,
    threshold: config.seuilConfiance / 100,
    stableFrames: config.imagesStables,
    ledPins: config.brochesLed,
    levelLocked: config.niveauVerrouille,
  });
  const fromPoste = stored ? normalizeSettings(stored, base) : base;
  const params = new URLSearchParams(search);
  const fromUrl = {};
  if (params.has('niveau')) fromUrl.level = Number(params.get('niveau'));
  if (params.has('broches')) fromUrl.ledPins = params.get('broches').split(',');
  return normalizeSettings({ ...fromPoste, ...fromUrl }, fromPoste);
}

export function loadStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveStored(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* stockage indisponible */
  }
}

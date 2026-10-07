// Couleur de la LED branchée sur chaque broche (choisie par l'équipe selon son montage).
// Enregistrée dans le fichier de projet. Sert à éclairer les puces LED et les projecteurs du théâtre
// de la bonne couleur. Ce fichier ne touche pas à la page : il sert au site ET aux tests.

import { PINS } from './protocol.js';

// « nom » : accordé avec « la LED » (LED rouge, jaune, verte, bleue).
export const LED_COLORS = {
  rouge: { nom: 'rouge', hex: '#E53935' },
  jaune: { nom: 'jaune', hex: '#F5B700' },
  vert: { nom: 'verte', hex: '#2E9E44' },
  bleu: { nom: 'bleue', hex: '#1E88E5' },
};
// Couleurs par défaut, dans l'ordre des LED (montage de la classe : rouge, bleue, verte, puis jaune).
export const DEFAULT_ORDER = ['rouge', 'bleu', 'vert', 'jaune'];

// Ne garde que des broches valides et des couleurs connues ; complète les LED prévues par défaut.
export function normalizeLedColors(obj = {}, ledPins = []) {
  const out = {};
  for (const [pin, color] of Object.entries(obj ?? {})) {
    if (PINS.includes(Number(pin)) && LED_COLORS[color]) out[Number(pin)] = color;
  }
  ledPins.forEach((pin, i) => {
    if (!out[pin]) out[pin] = DEFAULT_ORDER[i % DEFAULT_ORDER.length];
  });
  return out;
}

export class LedColors {
  // getPins() -> broches prévues par le professeur (pour les couleurs par défaut).
  constructor(getPins = () => []) {
    this.getPins = getPins;
    this.colors = normalizeLedColors({}, getPins());
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.colors);
  }

  // Couleur (clé) de la LED d'une broche.
  get(pin) {
    if (!this.colors[pin]) this.colors = normalizeLedColors(this.colors, this.getPins());
    return this.colors[pin] ?? 'jaune';
  }

  hex(pin) {
    return LED_COLORS[this.get(pin)].hex;
  }

  name(pin) {
    return LED_COLORS[this.get(pin)].nom;
  }

  set(pin, color) {
    if (!LED_COLORS[color] || !PINS.includes(Number(pin))) return;
    this.colors = { ...this.colors, [Number(pin)]: color };
    this.emit();
  }

  // Projet rechargé (ou nouveau projet : objet vide = couleurs par défaut).
  replace(obj) {
    this.colors = normalizeLedColors(obj, this.getPins());
    this.emit();
  }

  toJSON() {
    return { ...this.colors };
  }
}

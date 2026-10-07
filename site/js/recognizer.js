// Décide quel personnage est « vu », à partir des résultats image par image.
// Règles du cahier des charges :
//  - un personnage n'est retenu que si la confiance atteint le seuil (80 % par défaut) ;
//  - et seulement après N images de suite (5 par défaut), pour éviter que les LED clignotent ;
//  - « Fond vide » compte comme « personne ».

import { BACKGROUND_ID } from './training.js';

export const DEFAULT_THRESHOLD = 0.8;
export const DEFAULT_STABLE_FRAMES = 5;

export class Recognizer {
  constructor({ threshold = DEFAULT_THRESHOLD, stableFrames = DEFAULT_STABLE_FRAMES } = {}) {
    this.threshold = threshold;
    this.stableFrames = stableFrames;
    this.reset();
  }

  reset() {
    this.seen = null; // id du personnage vu actuellement (null = personne)
    this.candidate = null;
    this.count = 0;
  }

  // result : { best, confidences } donné par classify().
  // Renvoie la liste des événements : [{ type: 'vu' | 'plus-vu', id }]
  feed(result) {
    let candidate = null;
    if (result && result.best && result.best !== BACKGROUND_ID && result.confidences[result.best] >= this.threshold) {
      candidate = result.best;
    }
    if (candidate === this.candidate) this.count += 1;
    else {
      this.candidate = candidate;
      this.count = 1;
    }

    const events = [];
    if (this.count >= this.stableFrames && candidate !== this.seen) {
      if (this.seen !== null) events.push({ type: 'plus-vu', id: this.seen });
      if (candidate !== null) events.push({ type: 'vu', id: candidate });
      this.seen = candidate;
    }
    return events;
  }

  // Quand un personnage est supprimé pendant qu'il est « vu ».
  forget(id) {
    const events = [];
    if (this.seen === id) {
      events.push({ type: 'plus-vu', id });
      this.seen = null;
    }
    if (this.candidate === id) this.candidate = null;
    return events;
  }
}

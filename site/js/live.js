// Boucle de reconnaissance en direct :
// image de la webcam -> MobileNet -> KNN -> stabilité -> événements « vu » / « plus vu ».
// Sert aussi à prendre les photos en rafale (environ 5 par seconde).

import { classify } from './knn.js';
import { Recognizer } from './recognizer.js';
import * as vision from './vision.js';

const MIN_FRAME_MS = 100; // au plus 10 analyses par seconde
const BURST_EVERY_MS = 180; // rafale : environ 5 photos par seconde (la boucle tourne par pas de 100 ms)
const MAX_EXAMPLES = 200; // par catégorie, pour garder un fichier de projet léger

export class Live {
  constructor({ camera, training, settings }) {
    this.camera = camera;
    this.training = training;
    this.settings = settings;
    this.recognizer = new Recognizer(settings);
    this.capturing = null; // id de la catégorie en cours de rafale
    this.lastCapture = 0;
    this.last = { best: null, confidences: {} };
    this.running = false;
    this.target = new EventTarget(); // événements : 'resultat', 'vu', 'plus-vu', 'photo', 'plein'

    training.onChange(() => {
      // Un personnage supprimé ne peut plus être « vu ».
      const seen = this.recognizer.seen;
      if (seen && !training.get(seen)) this.dispatchAll(this.recognizer.forget(seen));
    });
  }

  on(type, fn) {
    this.target.addEventListener(type, (e) => fn(e.detail));
  }

  emit(type, detail) {
    this.target.dispatchEvent(new CustomEvent(type, { detail }));
  }

  dispatchAll(events) {
    for (const ev of events) this.emit(ev.type, { id: ev.id, name: this.training.get(ev.id)?.name ?? '' });
  }

  get seen() {
    return this.recognizer.seen;
  }

  startCapture(categoryId) {
    this.capturing = categoryId;
    this.lastCapture = 0;
  }

  stopCapture() {
    this.capturing = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  async loop() {
    while (this.running) {
      const t0 = performance.now();
      if (this.camera.ready) {
        try {
          await this.step();
        } catch (e) {
          console.error(e);
        }
      }
      const wait = Math.max(0, MIN_FRAME_MS - (performance.now() - t0));
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  async step() {
    const video = this.camera.video;
    const f = await vision.features(video);

    if (this.capturing && performance.now() - this.lastCapture >= BURST_EVERY_MS) {
      const cat = this.training.get(this.capturing);
      if (cat && cat.examples.length < MAX_EXAMPLES) {
        this.training.addExample(cat.id, f, vision.thumbnail(video));
        this.lastCapture = performance.now();
        this.emit('photo', { id: cat.id });
      } else if (cat) {
        this.emit('plein', { id: cat.id, max: MAX_EXAMPLES });
        this.stopCapture();
      }
    }

    // Réglages du professeur (seuil, stabilité) pris en compte en direct.
    this.recognizer.threshold = this.settings.threshold;
    this.recognizer.stableFrames = this.settings.stableFrames;

    // Pas de reconnaissance tant que l'IA n'est pas prête (fond vide + 1 personnage),
    // ni pendant une rafale (on photographie, on ne joue pas).
    this.last = classify(this.training.categories, f);
    const active = this.training.ready && !this.capturing;
    this.dispatchAll(this.recognizer.feed(active ? this.last : null));
    this.emit('resultat', { ...this.last, seen: this.recognizer.seen });
  }
}

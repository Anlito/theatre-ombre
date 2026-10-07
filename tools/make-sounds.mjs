// Fabrique les sons de base (mp3) fournis avec l'outil : npm run sons
// Ils sont composés par ce programme (pas d'enregistrement) : aucun problème de droits.
// L'encodeur mp3 (lamejs) ne sert qu'ici ; il n'est pas publié avec le site.

import { Mp3Encoder } from '@breezystack/lamejs';
import { mkdir, writeFile } from 'node:fs/promises';

const RATE = 44100;
const OUT = 'site/sons';

// --- Petits instruments ----------------------------------------------------------
const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A3: 220, E3: 164.81, Eb4: 311.13, Ab3: 207.65, B3: 246.94 };

function buffer(seconds) {
  return new Float32Array(Math.round(seconds * RATE));
}

// Ajoute une note : forme d'onde, fréquence, début, durée, volume, enveloppe.
function note(buf, { freq, start, dur, vol = 0.3, wave = 'sine', attack = 0.01, release = 0.08, vibrato = 0 }) {
  const s0 = Math.round(start * RATE);
  const n = Math.round(dur * RATE);
  let phase = 0;
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / RATE;
    const f = freq * (1 + vibrato * Math.sin(2 * Math.PI * 5.5 * t));
    phase += (2 * Math.PI * f) / RATE;
    let v;
    if (wave === 'square') v = Math.sign(Math.sin(phase)) * 0.6 + Math.sin(phase) * 0.4;
    else if (wave === 'bell') v = Math.sin(phase) + 0.5 * Math.sin(2.76 * phase) * Math.exp(-6 * t) + 0.25 * Math.sin(5.4 * phase) * Math.exp(-9 * t);
    else if (wave === 'saw') v = ((phase / Math.PI) % 2) - 1;
    else v = Math.sin(phase);
    let env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
    if (wave === 'bell') env *= Math.exp(-3 * t);
    buf[s0 + i] += v * vol * Math.max(0, env);
  }
}

function melody(buf, seq, opts) {
  let t = opts.start ?? 0;
  for (const [name, d] of seq) {
    if (name) note(buf, { ...opts, freq: NOTES[name], start: t, dur: d * 0.95 });
    t += d;
  }
}

// Bruit filtré (grondement, souffle).
function noise(buf, { start, dur, vol = 0.4, smooth = 0.02, decay = 1.5 }) {
  const s0 = Math.round(start * RATE);
  let y = 0;
  for (let i = 0; i < dur * RATE && s0 + i < buf.length; i++) {
    const t = i / RATE;
    y += smooth * ((Math.random() * 2 - 1) - y);
    buf[s0 + i] += y * vol * 8 * Math.min(1, t / 0.05) * Math.exp(-decay * t);
  }
}

// --- Les sons ------------------------------------------------------------------------
const SONS = {
  fanfare: () => {
    const b = buffer(2.2);
    melody(b, [['G4', 0.15], ['G4', 0.15], ['G4', 0.15], ['C5', 0.6], [null, 0.1], ['G4', 0.2], ['C5', 0.8]], { wave: 'square', vol: 0.18 });
    return b;
  },
  mystere: () => {
    const b = buffer(3.2);
    melody(b, [['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['Eb4', 0.8], ['B3', 1.0]], { wave: 'sine', vol: 0.35, vibrato: 0.01, attack: 0.08, release: 0.3 });
    return b;
  },
  alerte: () => {
    const b = buffer(2.4);
    for (let i = 0; i < 4; i++) {
      note(b, { freq: 880, start: i * 0.6, dur: 0.28, wave: 'square', vol: 0.15 });
      note(b, { freq: 660, start: i * 0.6 + 0.3, dur: 0.28, wave: 'square', vol: 0.15 });
    }
    return b;
  },
  victoire: () => {
    const b = buffer(2.0);
    melody(b, [['C4', 0.12], ['E4', 0.12], ['G4', 0.12], ['C5', 0.12], ['E5', 0.12], ['G5', 0.9]], { wave: 'square', vol: 0.15 });
    return b;
  },
  clochette: () => {
    const b = buffer(2.5);
    note(b, { freq: NOTES.E5, start: 0, dur: 2.4, wave: 'bell', vol: 0.4, release: 0.3 });
    note(b, { freq: NOTES.A4 * 2, start: 0.35, dur: 2.0, wave: 'bell', vol: 0.3, release: 0.3 });
    return b;
  },
  tonnerre: () => {
    const b = buffer(3.5);
    noise(b, { start: 0, dur: 3.5, vol: 0.5, smooth: 0.015, decay: 1.2 });
    noise(b, { start: 0.6, dur: 2.5, vol: 0.4, smooth: 0.01, decay: 1.8 });
    return b;
  },
  pas: () => {
    const b = buffer(2.4);
    for (let i = 0; i < 5; i++) noise(b, { start: i * 0.45, dur: 0.18, vol: 0.6, smooth: 0.05, decay: 25 });
    return b;
  },
  rire: () => {
    const b = buffer(2.2);
    const seq = [['E4', 0.18], ['D4', 0.18], ['C4', 0.18], ['B3', 0.18], ['A3', 0.18], ['Ab3', 0.5]];
    melody(b, seq, { wave: 'saw', vol: 0.15, vibrato: 0.03, attack: 0.02, release: 0.05 });
    return b;
  },
};

function encode(samples) {
  const enc = new Mp3Encoder(1, RATE, 96);
  const pcm = new Int16Array(samples.length);
  // Normalise le volume et convertit en entiers 16 bits.
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const g = peak > 0 ? 0.85 / peak : 1;
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, samples[i] * g * 32767));
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (out.length) chunks.push(Buffer.from(out));
  }
  chunks.push(Buffer.from(enc.flush()));
  return Buffer.concat(chunks);
}

await mkdir(OUT, { recursive: true });
for (const [name, make] of Object.entries(SONS)) {
  const mp3 = encode(make());
  await writeFile(`${OUT}/${name}.mp3`, mp3);
  console.log(`${name}.mp3  ${(mp3.length / 1024).toFixed(0)} Ko`);
}

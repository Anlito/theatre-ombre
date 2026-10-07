// Sons joués par l'ordinateur : quelques sons de base (site/sons/) + les fichiers des élèves.
// Un seul son à la fois : jouer un son coupe le précédent.

import { newId } from './training.js';

export const BUILTIN_SOUNDS = [
  ['fanfare', 'Fanfare'],
  ['mystere', 'Mystère'],
  ['alerte', 'Alerte'],
  ['victoire', 'Victoire'],
  ['clochette', 'Clochette'],
  ['tonnerre', 'Tonnerre'],
  ['pas', 'Bruits de pas'],
  ['rire', 'Rire'],
].map(([file, name]) => ({ id: `b:${file}`, name, url: `sons/${file}.mp3`, builtin: true }));

const ACCEPTED = /\.(mp3|wav)$/i;
export const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 Mo par fichier

export class SoundBank {
  constructor() {
    this.sounds = [...BUILTIN_SOUNDS]; // { id, name, url, builtin, blob? }
    this.current = null; // élément <audio> en cours
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.sounds);
  }

  get(id) {
    return this.sounds.find((s) => s.id === id) ?? null;
  }

  // Ajoute un fichier déposé ou choisi par l'élève.
  addFile(file) {
    if (!ACCEPTED.test(file.name)) {
      return { ok: false, error: `« ${file.name} » n'est pas un son mp3 ou wav.` };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, error: `« ${file.name} » est trop lourd (3 Mo au maximum). Coupe-le pour garder un extrait court.` };
    }
    const base = file.name.replace(ACCEPTED, '').slice(0, 30);
    // Son d'un projet rechargé qui manquait : on le complète (les blocs qui l'utilisent remarchent).
    const waiting = this.sounds.find((s) => s.missing && s.name === base);
    if (waiting) {
      Object.assign(waiting, { blob: file, url: URL.createObjectURL(file), missing: false });
      this.emit();
      return { ok: true, sound: waiting };
    }
    const name = uniqueName(this.sounds, base);
    const sound = { id: newId('s'), name, url: URL.createObjectURL(file), builtin: false, blob: file };
    this.sounds.push(sound);
    this.emit();
    return { ok: true, sound };
  }

  // Sons des élèves, avec leurs octets, pour les ranger dans le fichier de projet.
  async studentSounds() {
    const out = [];
    for (const s of this.sounds) {
      if (s.builtin) continue;
      const bytes = s.blob ? new Uint8Array(await s.blob.arrayBuffer()) : null;
      out.push({ id: s.id, name: s.name, mime: s.blob?.type || 'audio/mpeg', bytes });
    }
    return out;
  }

  // Remplace les sons des élèves par ceux d'un projet rechargé.
  // Un son sans octets (trop lourd pour le projet) garde son nom mais ne peut pas être joué.
  replaceStudentSounds(list) {
    this.stopAll();
    for (const s of this.sounds) if (!s.builtin && s.url.startsWith('blob:')) URL.revokeObjectURL(s.url);
    this.sounds = [
      ...BUILTIN_SOUNDS,
      ...list.map((s) => {
        const blob = s.bytes ? new Blob([s.bytes], { type: s.mime }) : null;
        return { id: s.id, name: s.name, builtin: false, blob, url: blob ? URL.createObjectURL(blob) : '', missing: !blob };
      }),
    ];
    this.emit();
  }

  remove(id) {
    const s = this.get(id);
    if (!s || s.builtin) return;
    if (s.url.startsWith('blob:')) URL.revokeObjectURL(s.url);
    this.sounds = this.sounds.filter((x) => x.id !== id);
    this.emit();
  }

  async play(id) {
    const s = this.get(id);
    if (!s) return { ok: false, error: "Ce son n'existe plus : choisis-en un autre dans le bloc « jouer le son »." };
    if (s.missing) return { ok: false, error: `Le son « ${s.name} » n'est pas dans le projet (trop lourd) : dépose de nouveau le fichier.` };
    this.stopAll();
    const audio = new Audio(s.url);
    this.current = audio;
    try {
      await audio.play();
      return { ok: true };
    } catch {
      return { ok: false, error: `Impossible de jouer « ${s.name} ». Vérifie les enceintes ou le casque.` };
    }
  }

  stopAll() {
    if (this.current) {
      this.current.pause();
      this.current.src = '';
      this.current = null;
    }
  }
}

function uniqueName(list, base) {
  let name = base || 'Mon son';
  let i = 2;
  while (list.some((s) => s.name === name)) name = `${base} (${i++})`;
  return name;
}

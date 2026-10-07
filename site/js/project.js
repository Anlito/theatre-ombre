// Fichier de projet (.json) : tout le travail d'une équipe dans un seul fichier.
//   - l'équipe (prénoms), les réglages ;
//   - les personnages et leurs exemples : « empreintes » MobileNet + petite vignette
//     (on retrouve l'IA entraînée sans reprendre de photos) ;
//   - les blocs ; les sons ajoutés par les élèves (s'ils ne sont pas trop lourds).
// Ce fichier ne touche pas à la page : il sert au site ET aux tests.

import { normalizeSettings } from './settings.js';
import { BACKGROUND_ID, BACKGROUND_NAME } from './training.js';

export const FORMAT = 'theatre-ombre';
export const VERSION = 1;
export const MAX_SOUNDS_BYTES = 5 * 1024 * 1024; // au-delà, on ne garde que les noms des sons

// --- Écriture -------------------------------------------------------------------------
// sounds : [{ id, name, mime, bytes: Uint8Array }] (sons des élèves seulement)
export function serialize({ team = [], settings, categories, blocks, sounds = [], modelId, ledColors = {} }) {
  const total = sounds.reduce((n, s) => n + (s.bytes?.length ?? 0), 0);
  const keepAudio = total <= MAX_SOUNDS_BYTES;
  return {
    format: FORMAT,
    version: VERSION,
    modele: modelId,
    enregistre: new Date().toISOString(),
    equipe: team,
    reglages: settings,
    couleursLed: ledColors, // couleur de la LED branchée sur chaque broche ({ 9: 'rouge', … })
    personnages: categories.map((c) => ({
      id: c.id,
      nom: c.name,
      fond: c.background || undefined,
      exemples: c.examples.map((e) => ({ id: e.id, f: floatsToBase64(e.features), v: e.thumb })),
    })),
    blocs: blocks,
    sons: sounds.map((s) => ({
      id: s.id,
      nom: s.name,
      type: s.mime,
      data: keepAudio && s.bytes ? bytesToBase64(s.bytes) : null,
    })),
    sonsTropLourds: keepAudio ? undefined : true,
  };
}

// --- Lecture -------------------------------------------------------------------------------
// Renvoie { ok: true, project } ou { ok: false, error } (message en français).
export function parse(text, { modelId } = {}) {
  let data;
  try {
    data = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    return { ok: false, error: "Ce fichier est abîmé ou n'est pas un projet du théâtre d'ombre." };
  }
  if (!data || data.format !== FORMAT) {
    return { ok: false, error: "Ce fichier n'est pas un projet du théâtre d'ombre (.json)." };
  }
  if (data.version > VERSION) {
    return { ok: false, error: 'Ce projet vient d’une version plus récente de l’outil. Recharge la page (Ctrl+F5).' };
  }
  const warnings = [];
  let categories;
  try {
    categories = (data.personnages ?? []).map((p) => ({
      id: String(p.id),
      name: String(p.nom ?? '').slice(0, 40),
      background: !!p.fond,
      examples: (p.exemples ?? []).map((e) => ({ id: String(e.id), features: base64ToFloats(e.f), thumb: String(e.v ?? '') })),
    }));
  } catch {
    return { ok: false, error: 'Les photos d’entraînement de ce projet sont illisibles.' };
  }
  if (!categories.some((c) => c.id === BACKGROUND_ID)) {
    categories.unshift({ id: BACKGROUND_ID, name: BACKGROUND_NAME, background: true, examples: [] });
  }
  // Les empreintes dépendent du modèle d'IA : un autre modèle les rendrait fausses.
  if (modelId && data.modele && data.modele !== modelId) {
    for (const c of categories) c.examples = [];
    warnings.push("L'IA de l'outil a changé depuis ce projet : il faut reprendre les photos (les blocs sont conservés).");
  }
  const sounds = (data.sons ?? []).map((s) => ({
    id: String(s.id),
    name: String(s.nom ?? 'Son'),
    mime: String(s.type ?? 'audio/mpeg'),
    bytes: s.data ? base64ToBytes(s.data) : null,
  }));
  const missing = sounds.filter((s) => !s.bytes).map((s) => s.name);
  if (missing.length) {
    warnings.push(`Sons à redéposer (trop lourds pour être enregistrés dans le projet) : ${missing.join(', ')}.`);
  }
  return {
    ok: true,
    warnings,
    project: {
      team: Array.isArray(data.equipe) ? data.equipe.map(String) : [],
      settings: normalizeSettings(data.reglages ?? {}),
      ledColors: data.couleursLed && typeof data.couleursLed === 'object' ? { ...data.couleursLed } : {},
      categories,
      blocks: data.blocs ?? null,
      sounds,
      savedAt: data.enregistre ?? null,
    },
  };
}

// --- Nom du fichier : PRENOM_PRENOM_PRENOM_theatre_ombre.json -------------------------------
export function fileName(team) {
  const parts = team
    .map((n) =>
      String(n)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    )
    .filter(Boolean);
  return `${parts.length ? parts.join('_') + '_' : ''}theatre_ombre.json`;
}

// --- Conversions (nombres et octets <-> texte base64) --------------------------------------
export function floatsToBase64(floats) {
  const f32 = floats instanceof Float32Array ? floats : Float32Array.from(floats);
  return bytesToBase64(new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength));
}

export function base64ToFloats(b64) {
  const bytes = base64ToBytes(b64);
  if (bytes.length % 4 !== 0) throw new Error('taille');
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4).slice();
}

export function bytesToBase64(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

export function base64ToBytes(b64) {
  const bin = atob(String(b64));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

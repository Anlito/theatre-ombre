// Carnet de projet : ce que l'équipe écrit, coche et photographie, étape par étape.
// Enregistré dans le fichier de projet de l'équipe (clé « carnet »). Ce fichier ne touche pas à la page :
// il sert au site, à l'outil professeur ET aux tests.
//
// Les réponses sont rangées à plat, par identifiant (voir carnet-contenu.js) :
//   champs : textes  ('dessins.0.nom', 'chaine.acquerir', 'leds.1.perso', 'ia.<id personnage>.varie'…)
//   cases  : cases cochées par l'élève ('route.3', 'e1.silhouettes', 'client.ia'…)
//   choix  : réponses à choix ('composants.webcam' -> 'info' | 'energie' | 'deux')
//   photos : { dessins: [{ id, data, date }], cablage: [...] }  (JPEG réduits, en base64)
//   auto   : ce que le site a constaté pendant les séances (reconnaissance, carte, programme testé)

import { ETAPES } from './carnet-contenu.js';

export const MAX_TEXT = 1000;
export const MAX_PHOTOS = 4;
const KEY = /^[\w.-]{1,80}$/;
const PHOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function emptyCarnet() {
  return { classe: '', champs: {}, cases: {}, choix: {}, photos: {}, auto: { reconnus: [], carte: false, programmeTeste: false } };
}

// Nettoie un carnet lu dans un fichier (fichier ancien, abîmé ou modifié à la main).
export function normalizeCarnet(raw) {
  const c = emptyCarnet();
  if (!raw || typeof raw !== 'object') return c;
  c.classe = typeof raw.classe === 'string' ? raw.classe.slice(0, 20) : '';
  for (const [k, v] of entries(raw.champs)) if (typeof v === 'string' && v.trim()) c.champs[k] = v.slice(0, MAX_TEXT);
  for (const [k, v] of entries(raw.cases)) if (v === true) c.cases[k] = true;
  for (const [k, v] of entries(raw.choix)) if (typeof v === 'string' && /^[a-z]{1,20}$/.test(v)) c.choix[k] = v;
  for (const [k, list] of entries(raw.photos)) {
    if (!Array.isArray(list)) continue;
    const ok = list
      .filter((p) => p && typeof p.data === 'string' && PHOTO.test(p.data))
      .slice(0, MAX_PHOTOS)
      .map((p) => ({ id: String(p.id ?? cryptoId()), data: p.data, date: Number(p.date) || 0 }));
    if (ok.length) c.photos[k] = ok;
  }
  const a = raw.auto ?? {};
  c.auto = {
    reconnus: Array.isArray(a.reconnus) ? [...new Set(a.reconnus.map(String))].slice(0, 20) : [],
    carte: a.carte === true,
    programmeTeste: a.programmeTeste === true,
  };
  return c;
}

function entries(obj) {
  return obj && typeof obj === 'object' ? Object.entries(obj).filter(([k]) => KEY.test(k)) : [];
}

function cryptoId() {
  return Math.random().toString(36).slice(2, 10);
}

// --- Ce qui est attendu à chaque étape (pour l'avancement) -----------------------------------
// Les blocs « facultatif » (3.6) ne comptent pas ; une sous-étape facultative entraîne ses blocs suivants
// jusqu'à la sous-étape suivante.
export function attendus(n) {
  const etape = ETAPES.find((e) => e.n === n);
  if (!etape) return [];
  const out = [];
  let facultatif = false;
  for (const b of etape.blocs) {
    if (b.type === 'sous') facultatif = !!b.facultatif;
    if (facultatif || b.facultatif) continue;
    if (b.type === 'tableau') {
      b.lignes.forEach((_l, i) => b.colonnes.filter((c) => c.id).forEach((c) => out.push({ type: 'champ', id: `${b.id}.${i}.${c.id}` })));
    } else if (b.type === 'texte') out.push({ type: 'champ', id: b.id });
    else if (b.type === 'check') out.push({ type: 'case', id: b.id });
    else if (b.type === 'photos') out.push({ type: 'photo', id: b.id });
    else if (b.type === 'leds') for (let i = 0; i < b.n; i++) out.push({ type: 'champ', id: `leds.${i}.perso` });
    else if (b.type === 'chaine') b.cases.forEach((c) => out.push({ type: 'champ', id: c.id }));
    else if (b.type === 'choix') {
      b.lignes.forEach((l) => {
        out.push({ type: 'choix', id: `${b.id}.${l.id}` });
        if (l.champ) out.push({ type: 'champ', id: l.champ });
      });
    }
  }
  return out;
}

export function estFait(carnet, item) {
  if (item.type === 'champ') return !!carnet.champs[item.id]?.trim();
  if (item.type === 'case') return carnet.cases[item.id] === true;
  if (item.type === 'choix') return !!carnet.choix[item.id];
  if (item.type === 'photo') return (carnet.photos[item.id]?.length ?? 0) > 0;
  return false;
}

// { faits, total } pour l'étape n.
export function avancement(carnet, n) {
  const items = attendus(n);
  return { faits: items.filter((it) => estFait(carnet, it)).length, total: items.length };
}

// Avancement de tout le carnet, étape par étape : [{ n, faits, total }].
export function avancementGlobal(carnet) {
  return ETAPES.map((e) => ({ n: e.n, ...avancement(carnet, e.n) }));
}

// --- Réponses de l'étape 4 comparées au corrigé (aide pour le professeur) -------------------
export const CORRIGE_COMPOSANTS = {
  webcam: ['info'],
  ordinateur: ['deux'],
  ia: ['info'],
  programme: ['info'],
  usb: ['deux', 'info'], // le corrigé accepte « information seulement » si l'élève le justifie
  arduino: ['deux'],
  led: ['energie'],
};

export function corrigerComposants(carnet) {
  return Object.entries(CORRIGE_COMPOSANTS).map(([id, bons]) => {
    const reponse = carnet.choix[`composants.${id}`] ?? null;
    return { id, reponse, juste: reponse ? bons.includes(reponse) : null, attendu: bons[0] };
  });
}

// --- Le site complète « auto » pendant les séances (une fois vrai, ça reste vrai) -------------
export function noterAuto(carnet, { reconnu, carte, programmeTeste } = {}) {
  let changed = false;
  if (reconnu && !carnet.auto.reconnus.includes(reconnu)) {
    carnet.auto.reconnus.push(reconnu);
    changed = true;
  }
  if (carte && !carnet.auto.carte) changed = carnet.auto.carte = true;
  if (programmeTeste && !carnet.auto.programmeTeste) changed = carnet.auto.programmeTeste = true;
  return changed;
}

// Associe chaque LED à un personnage d'après le programme du niveau 1 :
// « quand je vois X » suivi de « allumer la LED broche P ». Renvoie { broche: nom du personnage }.
export function ledsDuProgramme(blocsNiveau1, nomPersonnage) {
  const out = {};
  const top = blocsNiveau1?.blocks?.blocks ?? [];
  for (const b of top) {
    if (b.type !== 'quand_je_vois' || !b.fields?.PERSO) continue;
    const nom = nomPersonnage(b.fields.PERSO);
    if (!nom) continue;
    for (let n = b.next?.block ?? b.inputs?.DO?.block; n; n = n.next?.block) {
      if (n.type === 'allumer_led' && n.fields?.PIN != null && !out[n.fields.PIN]) out[n.fields.PIN] = nom;
    }
  }
  return out;
}

// Outil professeur : ouvrir le dossier THEATRE IA d'une classe, voir le travail de chaque équipe
// (carnet, IA, programme, personnages 3D, photos), donner les validations ◆ et noter (grille D1 à D7).
// Les fichiers des élèves sont seulement lus ; seul « validations.json » est écrit dans chaque dossier d'équipe.

import { icon, hydrateIcons } from '../icons.js';
import { renderCarnet } from '../ui/carnet-vue.js';
import { avancementGlobal } from '../carnet.js';
import { VALIDATIONS } from '../carnet-contenu.js';
import { LED_COLORS, normalizeLedColors } from '../led-colors.js';
import { defineBlocks, makeTheme } from '../blocks/definitions.js';
import { BUILTIN_SOUNDS } from '../sounds.js';
import { VALIDATIONS_FILE, readValidations } from '../team-folder.js';
import { lireClasse, classeDesEquipes } from './scan.js';
import { analyserStl, controlerStl } from './stl.js';
import { indices } from './indices.js';
import * as E from './evaluation.js';
import * as S from './storage.js';

const $ = (id) => document.getElementById(id);
const main = $('prof-main');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmtNote = (n) => (n === null || n === undefined ? '—' : String(n).replace('.', ','));
const fmtDate = (d, heure = false) =>
  new Date(d).toLocaleString('fr-FR', heure ? { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'long' });

const state = {
  dir: null, // dossier THEATRE IA de la classe
  classeur: null, // évaluation (evaluation.js)
  equipes: [], // lues dans le dossier (scan.js)
  courante: 0,
  onglet: 'carnet',
  niveauProg: 1,
  nettoyer: [], // vues 3D, espaces de blocs, URL d'images à libérer en changeant d'écran
};

// --- Messages ----------------------------------------------------------------------------------
const BANNER_ICON = { error: 'attention', info: 'info', ok: 'ok' };
function showMessage(text, kind = 'error') {
  $('banner-text').textContent = text;
  $('banner').dataset.kind = kind;
  $('banner').querySelector('.banner-icon').innerHTML = icon(BANNER_ICON[kind] ?? 'info');
  $('banner').hidden = false;
}
const hideMessage = () => ($('banner').hidden = true);
$('banner-close').addEventListener('click', hideMessage);

function nettoyer() {
  for (const fn of state.nettoyer.splice(0)) {
    try {
      fn();
    } catch {
      /* déjà libéré */
    }
  }
}

// --- Enregistrement automatique de l'évaluation (navigateur du professeur) ----------------------
let timer = null;
function garder() {
  state.classeur.maj = Date.now();
  clearTimeout(timer);
  timer = setTimeout(() => S.garderClasseur(state.classeur), 300);
}

// =================================================================================================
// Accueil
// =================================================================================================
async function accueil() {
  nettoyer();
  state.dir = null;
  $('prof-actions').hidden = true;
  $('prof-classe').hidden = true;
  const connus = 'showDirectoryPicker' in window ? await S.dossiersConnus() : [];
  main.innerHTML = `
    <section class="prof-accueil">
      <h2>Le travail de la classe</h2>
      <p class="prof-intro">Ouvrez le dossier <b>3X › COMMUN › TECHNOLOGIE › THEATRE IA</b> d'une classe : l'outil lit le dossier
        de chaque équipe (projet et carnet, fichiers STL, photos) et vous permet de valider les étapes ◆ et de noter.</p>
      ${'showDirectoryPicker' in window ? '' : '<p class="form-error">Ce navigateur ne peut pas ouvrir de dossier : utilisez Chrome ou Edge.</p>'}
      <div class="prof-cartes">
        <button class="prof-carte" type="button" data-action="ouvrir">
          <span class="prof-carte-ic">${icon('ouvrir', { size: 28 })}</span>
          <b>Ouvrir le dossier d'une classe</b>
          <span>Choisir le dossier « THEATRE IA » de la classe</span>
        </button>
        ${connus
          .map(
            (d) => `<button class="prof-carte" type="button" data-action="rouvrir" data-classe="${esc(d.classe)}">
              <span class="prof-carte-ic">${icon('equipe', { size: 28 })}</span>
              <b>Rouvrir ${esc(d.classe)}</b>
              <span>Dernière ouverture : ${fmtDate(d.date, true)}</span>
            </button>`,
          )
          .join('')}
        <button class="prof-carte" type="button" data-action="importer">
          <span class="prof-carte-ic">${icon('telecharger', { size: 28 })}</span>
          <b>Importer une sauvegarde</b>
          <span>Fichier d'évaluation enregistré avec « Sauvegarder »</span>
        </button>
      </div>
      <ul class="prof-notes">
        <li>Les notes restent sur cet ordinateur (navigateur) : pensez à <b>Sauvegarder</b> l'évaluation dans <b>votre</b> dossier personnel.</li>
        <li>Les fichiers des élèves ne sont jamais modifiés. Seul le fichier <b>validations.json</b> est écrit dans le dossier d'une équipe,
          quand vous validez une étape ◆ : les élèves voient alors la validation dans leur carnet.</li>
        <li>Le navigateur demande l'autorisation de <b>modifier</b> le dossier : c'est pour écrire ces validations.</li>
      </ul>
    </section>`;
}

async function ouvrir(handle = null, classe = '') {
  let dir = handle;
  if (dir) {
    try {
      if ((await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
    } catch {
      return showMessage('Ce dossier n’est plus accessible. Ouvrez-le de nouveau avec « Ouvrir le dossier d’une classe ».');
    }
  } else {
    try {
      dir = await window.showDirectoryPicker({ id: 'theatre-ia-prof', mode: 'readwrite' });
    } catch (e) {
      if (e.name !== 'AbortError') showMessage('Ce dossier ne peut pas être ouvert. Choisissez le dossier THEATRE IA de la classe.');
      return;
    }
  }
  await charger(dir, { classe });
}

// Classe d'un dossier, sans la redemander : dossier déjà ouvert, classe écrite dans les carnets,
// ou évaluation (importée ou gardée sur cet ordinateur) qui contient les mêmes équipes.
async function classeDuDossier(dir, equipes) {
  for (const d of await S.dossiersConnus()) {
    try {
      if (await d.handle.isSameEntry(dir)) return d.classe;
    } catch {
      /* dossier connu devenu inaccessible */
    }
  }
  const desCarnets = classeDesEquipes(equipes);
  if (desCarnets) return desCarnets;
  const noms = new Set(equipes.map((e) => e.dossier));
  let meilleure = null;
  let communs = 0;
  for (const c of await S.tousLesClasseurs()) {
    const n = Object.keys(c.equipes ?? {}).filter((d) => noms.has(d)).length;
    if (n > communs || (n === communs && n > 0 && c.maj > meilleure.maj)) [meilleure, communs] = [c, n];
  }
  return meilleure?.classe ?? '';
}

async function charger(dir, { garderVue = false, classe: classeConnue = '' } = {}) {
  main.innerHTML = `<p class="prof-attente">${icon('vider', { size: 22 })} Lecture du dossier « ${esc(dir.name)} »…</p>`;
  let lecture;
  try {
    lecture = await lireClasse(dir);
  } catch {
    showMessage('Impossible de lire ce dossier (dossier réseau indisponible ?).');
    return accueil();
  }
  if (!lecture.equipes.length) {
    showMessage(`Aucun projet d'équipe dans « ${dir.name} ». Choisissez le dossier THEATRE IA de la classe.`, 'info');
    return accueil();
  }
  for (const eq of lecture.equipes) {
    for (const f of eq.stls) {
      try {
        f.analyse = analyserStl(await f.arrayBuffer());
      } catch {
        f.analyse = null;
      }
    }
  }
  let classe = state.classeur && garderVue ? state.classeur.classe : classeConnue || (await classeDuDossier(dir, lecture.equipes));
  if (!classe) classe = (prompt('Quelle est cette classe ? (ex. 3B)', '') ?? '').trim().toUpperCase();
  if (!classe) return accueil();

  state.dir = dir;
  state.equipes = lecture.equipes;
  state.classeur = (await S.lireClasseur(classe)) ?? E.nouveauClasseur(classe);
  for (const eq of state.equipes) {
    const ev = E.equipe(state.classeur, eq.dossier, eq.projet?.team ?? []);
    // Validations déjà déposées (par exemple depuis un autre ordinateur) : on les reprend.
    const deposees = await readValidations(eq.dir);
    for (const [id, v] of Object.entries(deposees)) ev.validations[id] ??= v;
  }
  garder();
  S.garderDossier(classe, dir);
  $('prof-actions').hidden = false;
  $('prof-classe').hidden = false;
  $('prof-classe').textContent = `Classe ${classe} · ${state.equipes.length} équipe${state.equipes.length > 1 ? 's' : ''}`;
  hideMessage();
  if (garderVue && main.dataset.vue === 'equipe') vueEquipe(Math.min(state.courante, state.equipes.length - 1));
  else vueClasse();
}

// =================================================================================================
// Vue de la classe
// =================================================================================================
const pastilleNiveau = (v) => {
  const n = E.niveau(v);
  return `<span class="niv" data-niv="${n?.v ?? 0}" title="${n ? n.t : 'Pas encore noté'}">${n ? n.v : ''}</span>`;
};

function vueClasse() {
  nettoyer();
  main.dataset.vue = 'classe';
  const C = state.classeur;
  const rows = state.equipes.map((eq, i) => {
    const ev = C.equipes[eq.dossier];
    const carnet = eq.projet?.carnet;
    const av = carnet ? avancementGlobal(carnet) : [];
    const persos = (eq.projet?.categories ?? []).filter((c) => !c.background);
    const note = E.noteEquipe(C, ev);
    const nVal = VALIDATIONS.filter((v) => ev.validations[v.id]).length;
    return `<tr data-action="equipe" data-i="${i}" tabindex="0">
      <td><b>${esc(eq.dossier)}</b><small>${esc(ev.eleves.join(', ') || '—')}</small>${eq.erreur ? `<small class="form-error">${esc(eq.erreur)}</small>` : ''}</td>
      <td class="pc-etapes">${av.length ? av.map((a) => `<span class="pc-etape" data-done="${a.faits === a.total}" title="Étape ${a.n} : ${a.faits}/${a.total}"><i style="--p:${a.total ? a.faits / a.total : 0}"></i>${a.n}</span>`).join('') : '<small>pas de carnet</small>'}</td>
      <td class="pc-num" title="Validations ◆ données">${nVal}/${VALIDATIONS.length}</td>
      <td><small>${persos.length ? persos.map((p) => `${esc(p.name)} (${p.examples.length})`).join(', ') : '—'}</small></td>
      <td class="pc-num">${eq.stls.length || '—'}</td>
      <td class="pc-nivs">${C.livrables.map((l) => pastilleNiveau(ev.niveaux[l.id])).join('')}</td>
      <td class="pc-note">${fmtNote(note)}</td>
      <td><small>${E.mention(note)}</small></td>
      <td><small>${eq.fichier ? fmtDate(eq.fichier.date, true) : '—'}</small></td>
    </tr>`;
  });
  const notes = state.equipes.map((eq) => E.noteEquipe(C, C.equipes[eq.dossier])).filter((n) => n !== null);
  const moyenne = notes.length ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10 : null;
  main.innerHTML = `
    <section class="prof-classe-vue">
      <div class="pc-resume">
        <div><b>${state.equipes.length}</b><span>équipes</span></div>
        <div><b>${notes.length}</b><span>équipes notées</span></div>
        <div><b>${fmtNote(moyenne)}</b><span>moyenne de la classe /20</span></div>
        <p class="pc-legende">Niveaux : ${E.NIVEAUX.map((n) => `<span class="niv" data-niv="${n.v}">${n.v}</span> ${n.t}`).join(' · ')}</p>
      </div>
      <div class="cn-table-wrap">
        <table class="cn-table pc-table">
          <thead><tr>
            <th>Équipe</th><th>Carnet (étapes)</th><th>◆</th><th>IA (photos)</th><th>STL</th>
            <th>${C.livrables.map((l) => `<span class="pc-d" title="${esc(l.t)}">${l.id}</span>`).join('')}</th>
            <th>Note /20</th><th>Mention</th><th>Enregistré</th>
          </tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
      <p class="pc-aide">Cliquez sur une équipe pour voir son travail, valider les étapes ◆ et la noter.</p>
    </section>`;
}

// =================================================================================================
// Vue d'une équipe
// =================================================================================================
const ONGLETS = [
  ['carnet', 'Carnet', 'cours'],
  ['ia', 'IA et programme', 'ia'],
  ['stl', 'Personnages 3D', 'personnage'],
  ['fichiers', 'Photos et fichiers', 'photo'],
  ['bilan', 'Bilan', 'prof'],
];

// Notation à l'endroit où l'on regarde le travail : chaque onglet (et chaque étape du carnet)
// montre les validations ◆ et les livrables qui s'y rapportent. L'onglet Bilan reprend tout.
const PANNEAUX = {
  e1: { t: 'Étape 1 · dessins', l: ['D1'], v: ['v1'] },
  e2: { t: 'Étape 2 · modélisation', l: ['D2'], v: ['v2'] },
  e3: { t: 'Étape 3 · câblage, IA et programme', l: ['D3', 'D4'], v: ['v3a', 'v3b'] },
  e4: { t: 'Étape 4 · chaînes et carnet', l: ['D5'], v: ['v4'] },
  e5: { t: 'Étape 5 · histoire et oral', l: ['D6'], v: ['v5'] },
  ia: { t: 'IA et programme', l: ['D4'], v: ['v3b'] },
  stl: { t: 'Personnages 3D', l: ['D2'], v: ['v2'] },
  fichiers: { t: 'Dessins et câblage', l: ['D1', 'D3'], v: ['v1', 'v3a'] },
};

function validationHtml(ev, v) {
  const ok = ev.validations[v.id];
  return `<div class="pv" data-ok="${!!ok}">
    <span class="pv-n">Étape ${v.etape}</span>
    <span class="pv-t"><b>◆ ${esc(v.t)}</b>${ok ? `<small>Validé le ${fmtDate(ok.date, true)}</small>` : ''}</span>
    <button class="btn ${ok ? 'btn-neutral' : 'btn-primary'}" type="button" data-action="valider" data-v="${v.id}">${ok ? 'Annuler' : `${icon('ok', { size: 18 })}Valider`}</button>
  </div>`;
}

// ind : indices (indices.js), ou null pour ne montrer que les niveaux (Bilan).
function livrableHtml(ev, l, ind) {
  const cur = ev.niveaux[l.id];
  const liste = ind?.[l.id] ?? [];
  return `<div class="pg">
    <div class="pg-t"><b>${l.id} · ${esc(l.t)}</b><small>${esc(l.competence)}</small></div>
    <div class="pg-niv" role="radiogroup" aria-label="${esc(l.id)} ${esc(l.t)}">
      ${E.NIVEAUX.map((n) => `<button type="button" role="radio" class="niv-btn" data-niv="${n.v}" aria-checked="${cur === n.v}" data-action="niveau" data-l="${l.id}" data-v="${n.v}">${n.t}</button>`).join('')}
    </div>
    ${liste.length ? `<ul class="pg-ind">${liste.map((x) => `<li data-ok="${x.ok}">${x.ok === true ? icon('ok', { size: 16, stroke: 3 }) : x.ok === false ? icon('fermer', { size: 16, stroke: 3 }) : icon('info', { size: 16 })}${esc(x.t)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

function panneauHtml(eq, ev, cle) {
  const P = PANNEAUX[cle];
  const C = state.classeur;
  const ind = indices(eq, ev.validations);
  return `<aside class="pp" data-pp="${cle}">
    <h3>${icon('prof', { size: 20 })}À noter ici <small>${esc(P.t)}</small></h3>
    ${P.v.map((id) => validationHtml(ev, VALIDATIONS.find((x) => x.id === id))).join('')}
    ${P.l.map((id) => livrableHtml(ev, C.livrables.find((x) => x.id === id), ind)).join('')}
  </aside>`;
}

function noteHtml(ev) {
  const note = E.noteEquipe(state.classeur, ev);
  const p = E.progression(state.classeur, ev);
  return `<button id="pe-note" class="pe-note-badge" type="button" data-onglet="bilan" title="Voir le bilan">
    <span>Note</span><b>${fmtNote(note)}</b><small>/20</small><em>${E.mention(note) || `${p.faits}/${p.total} livrables notés`}</em>
  </button>`;
}

// Après une note ou une validation : on met à jour les panneaux et la note, sans redessiner l'onglet.
function majPanneaux() {
  const eq = state.equipes[state.courante];
  const ev = state.classeur.equipes[eq.dossier];
  for (const el of main.querySelectorAll('[data-pp]')) el.outerHTML = panneauHtml(eq, ev, el.dataset.pp);
  $('pe-note').outerHTML = noteHtml(ev);
}

function vueEquipe(i, onglet = state.onglet) {
  nettoyer();
  state.courante = i;
  state.onglet = onglet;
  main.dataset.vue = 'equipe';
  const eq = state.equipes[i];
  const ev = state.classeur.equipes[eq.dossier];
  const n = state.equipes.length;
  main.innerHTML = `
    <section class="pe">
      <div class="pe-head">
        <button class="btn btn-secondary" type="button" data-action="classe">${icon('chevron', { size: 18 })}<span>Classe</span></button>
        <div class="pe-titre">
          <h2>${esc(eq.dossier)}</h2>
          <p>${esc(ev.eleves.join(', ') || 'élèves inconnus')}${eq.fichier ? ` · projet enregistré le ${fmtDate(eq.fichier.date, true)}` : ' · pas de projet'}</p>
        </div>
        <span class="spacer"></span>
        ${noteHtml(ev)}
        <button class="icon-btn" type="button" data-action="prec" ${i === 0 ? 'disabled' : ''} aria-label="Équipe précédente" title="Équipe précédente">${icon('chevron', { size: 20 })}</button>
        <span class="pe-pos">${i + 1} / ${n}</span>
        <button class="icon-btn pe-suiv" type="button" data-action="suiv" ${i === n - 1 ? 'disabled' : ''} aria-label="Équipe suivante" title="Équipe suivante">${icon('chevron', { size: 20 })}</button>
      </div>
      <nav class="pe-onglets" role="tablist">
        ${ONGLETS.map(([id, t, ic]) => `<button type="button" role="tab" data-onglet="${id}" aria-selected="${id === onglet}">${icon(ic, { size: 18 })}${t}</button>`).join('')}
      </nav>
      <div id="pe-contenu" class="pe-contenu"></div>
    </section>`;
  const box = $('pe-contenu');
  if (eq.erreur) box.insertAdjacentHTML('beforebegin', `<p class="form-error">${esc(eq.erreur)}</p>`);
  ({ bilan: ongletBilan, carnet: ongletCarnet, ia: ongletIa, stl: ongletStl, fichiers: ongletFichiers })[onglet](box, eq, ev);
  // Panneau de notation en bas des onglets IA, 3D et fichiers (le carnet en a un par étape).
  if (PANNEAUX[onglet]) box.insertAdjacentHTML('beforeend', panneauHtml(eq, ev, onglet));
}

// --- Bilan : note, élèves (bonus / malus), commentaire, toutes les validations et tous les livrables ----
function ongletBilan(box, eq, ev) {
  const C = state.classeur;
  const note = E.noteEquipe(C, ev);
  const eleves = ev.eleves.map((el) => {
    const n = E.noteEleve(C, ev, el);
    return `<tr>
      <td><b>${esc(el)}</b></td>
      <td><div class="pb">
        <button class="icon-btn" type="button" data-action="bonus" data-el="${esc(el)}" data-d="-0.5" aria-label="Retirer un demi-point à ${esc(el)}">−</button>
        <input class="cn-field pb-val" type="text" inputmode="decimal" value="${n.bonus ? String(n.bonus).replace('.', ',') : ''}" placeholder="0" data-bonus="${esc(el)}" aria-label="Bonus ou malus de ${esc(el)}">
        <button class="icon-btn" type="button" data-action="bonus" data-el="${esc(el)}" data-d="0.5" aria-label="Ajouter un demi-point à ${esc(el)}">+</button>
      </div></td>
      <td><input class="cn-field" type="text" maxlength="200" value="${esc(n.motif)}" placeholder="Motif (comportement, investissement…)" data-motif="${esc(el)}" aria-label="Motif pour ${esc(el)}"></td>
      <td class="pc-note">${fmtNote(n.finale)}</td>
    </tr>`;
  }).join('');
  box.innerHTML = `
    <div class="pe-eval">
      <div class="pe-col">
        <section class="pe-carte">
          <div class="pe-note">
            <div><span>Note de l'équipe</span><b>${fmtNote(note)}<small>/20</small></b><em>${E.mention(note)}</em></div>
            <p class="pc-aide">Moyenne des livrables notés × 5 (Non atteint = 1 · En cours = 2 · Atteint = 3 · Dépassé = 4).</p>
          </div>
          <table class="cn-table pe-eleves"><thead><tr><th>Élève</th><th>Bonus / malus</th><th>Motif</th><th>Note /20</th></tr></thead><tbody>${eleves || '<tr><td colspan="4">Aucun élève (prénoms absents du projet).</td></tr>'}</tbody></table>
          <p class="pc-aide">Note de l'élève = note de l'équipe + bonus ou malus (par demi-points), entre 0 et 20.</p>
          <label class="cn-texte"><span>Commentaire</span><textarea class="cn-field" rows="3" data-commentaire maxlength="2000">${esc(ev.commentaire)}</textarea></label>
        </section>
        <section class="pe-carte">
          <h3>Validations ◆ du carnet</h3>
          ${VALIDATIONS.map((v) => validationHtml(ev, v)).join('')}
          <p class="pc-aide">Écrites dans le dossier de l'équipe (validations.json) : les élèves les voient dans leur carnet.</p>
        </section>
      </div>
      <section class="pe-carte pe-grille">
        <h3>Livrables D1 à D7</h3>
        <p class="pc-aide">Les indices de chaque livrable sont dans l'onglet où il se corrige (Carnet, IA et programme, Personnages 3D, Photos).</p>
        ${C.livrables.map((l) => livrableHtml(ev, l, l.id === 'D7' ? indices(eq, ev.validations) : null)).join('')}
      </section>
    </div>`;
}

async function ecrireValidations(eq, ev) {
  try {
    const h = await eq.dir.getFileHandle(VALIDATIONS_FILE, { create: true });
    const w = await h.createWritable();
    await w.write(JSON.stringify(E.fichierValidations(ev), null, 2));
    await w.close();
    return true;
  } catch {
    showMessage(`La validation n'a pas pu être écrite dans le dossier « ${eq.dossier} » (autorisation de modifier refusée ?). Elle est gardée dans l'outil.`);
    return false;
  }
}

// --- Carnet (lecture seule) -------------------------------------------------------------------------
function ongletCarnet(box, eq, ev) {
  const p = eq.projet;
  if (!p) return (box.innerHTML = '<p class="cn-vide">Pas de projet dans ce dossier.</p>');
  const pins = p.settings.ledPins;
  const colors = normalizeLedColors(p.ledColors, pins);
  box.innerHTML = '<div class="pe-carnet"></div>';
  renderCarnet(box.firstElementChild, {
    carnet: p.carnet,
    team: p.team,
    readOnly: true,
    validations: ev.validations,
    live: {
      characters: p.categories.filter((c) => !c.background).map((c) => ({ id: c.id, name: c.name, photos: c.examples.length })),
      ledPins: pins,
      ledColor: (pin) => colors[pin] ?? null,
      reconnus: new Set(p.carnet.auto.reconnus),
    },
  });
  for (const n of [1, 2, 3, 4, 5]) box.querySelector(`#cn-etape-${n}`)?.insertAdjacentHTML('beforeend', panneauHtml(eq, ev, `e${n}`));
}

// --- IA (personnages, photos) et programme en blocs (lecture seule) ---------------------------------
let blocsCtx = { characters: [], sounds: [], ledPins: [9, 10, 11, 12] };
let blocsDefinis = false;
let theme = null;

function ongletIa(box, eq) {
  const p = eq.projet;
  if (!p) return (box.innerHTML = '<p class="cn-vide">Pas de projet dans ce dossier.</p>');
  const persos = p.categories;
  const progs = p.blocks?.parNiveau ?? {};
  box.innerHTML = `
    <section class="pe-carte">
      <h3>Personnages appris par l'IA</h3>
      <div class="pi-persos">${persos
        .map(
          (c) => `<div class="pi-perso">
            <b>${esc(c.name)}</b> <small>${c.examples.length} photo${c.examples.length > 1 ? 's' : ''}${c.background ? ' · fond vide' : ''}</small>
            <div class="pi-vignettes">${c.examples.filter((x) => x.thumb).slice(0, 12).map((x) => `<img src="${esc(x.thumb)}" alt="">`).join('') || '<small class="cn-vide">pas de vignette</small>'}</div>
          </div>`,
        )
        .join('')}</div>
    </section>
    <section class="pe-carte">
      <div class="pi-prog-head">
        <h3>Programme en blocs</h3>
        <div class="segments">${[1, 2]
          .map((n) => `<button type="button" role="radio" data-action="niveau-prog" data-n="${n}" aria-checked="${state.niveauProg === n}">Niveau ${n}${progs[n]?.blocks?.blocks?.length ? '' : ' (vide)'}</button>`)
          .join('')}</div>
      </div>
      <div id="pi-blockly" class="pi-blockly"></div>
    </section>`;
  // Blocs : les listes (personnages, sons) sont celles de l'équipe.
  blocsCtx = {
    characters: persos.filter((c) => !c.background).map((c) => ({ id: c.id, name: c.name })),
    sounds: [...BUILTIN_SOUNDS, ...p.sounds].map((s) => ({ id: s.id, name: s.name })),
    ledPins: p.settings.ledPins,
    ledColorName: (pin) => LED_COLORS[normalizeLedColors(p.ledColors, p.settings.ledPins)[pin]]?.nom,
  };
  const { Blockly } = window;
  if (!blocsDefinis) {
    defineBlocks(Blockly, {
      characters: () => blocsCtx.characters,
      sounds: () => blocsCtx.sounds,
      ledPins: () => blocsCtx.ledPins,
      ledColorName: (pin) => blocsCtx.ledColorName?.(pin),
    });
    blocsDefinis = true;
  }
  const ws = Blockly.inject($('pi-blockly'), {
    readOnly: true,
    media: 'https://anlito.github.io/labo-blocs/module/blockly/media/',
    renderer: 'zelos',
    theme: (theme ??= makeTheme(Blockly)),
    sounds: false,
    move: { scrollbars: true, drag: true, wheel: true },
    zoom: { controls: true, wheel: false, startScale: 0.85 },
  });
  state.nettoyer.push(() => ws.dispose());
  const data = progs[state.niveauProg];
  if (data?.blocks?.blocks?.length) {
    try {
      Blockly.serialization.workspaces.load(data, ws);
      ws.scrollCenter();
    } catch {
      $('pi-blockly').insertAdjacentHTML('afterbegin', '<p class="form-error">Ce programme n’a pas pu être affiché.</p>');
    }
  } else {
    $('pi-blockly').insertAdjacentHTML('afterbegin', `<p class="pi-vide">Pas de programme au niveau ${state.niveauProg}.</p>`);
  }
}

// --- Personnages 3D (STL) ------------------------------------------------------------------------
async function ongletStl(box, eq) {
  if (!eq.stls.length) {
    box.innerHTML = `<p class="cn-vide">Aucun fichier .stl dans le dossier « ${esc(eq.dossier)} ». Les élèves exportent chaque personnage depuis Tinkercad (étape 2).</p>`;
    return;
  }
  box.innerHTML = `<div class="ps-grille">${eq.stls
    .map((f, i) => {
      const a = f.analyse;
      const k = a ? controlerStl(a.dims) : null;
      return `<section class="pe-carte ps">
        <h3>${esc(f.name)}</h3>
        <div class="ps-vue" data-stl="${i}">${a ? '' : '<p class="form-error">Fichier STL illisible.</p>'}</div>
        ${k
          ? `<ul class="pg-ind">
              <li data-ok="${k.tailleOk}">${icon(k.tailleOk ? 'ok' : 'fermer', { size: 16, stroke: 3 })}Taille : ${fmtNote(k.hauteur)} × ${fmtNote(k.largeur)} mm (100 × 100 mm maximum)</li>
              <li data-ok="${k.epaisseurOk}">${icon(k.epaisseurOk ? 'ok' : 'fermer', { size: 16, stroke: 3 })}Épaisseur : ${fmtNote(k.epaisseur)} mm (2 mm attendus)</li>
              <li data-ok="null">${icon('info', { size: 16 })}${a.triangles.toLocaleString('fr-FR')} triangles · ${Math.round(f.size / 1024)} Ko</li>
            </ul>`
          : ''}
        <p class="pc-aide">Faites tourner avec la souris, zoomez avec la molette.</p>
      </section>`;
    })
    .join('')}</div>`;
  const { vueStl } = await import('./stl-vue.js');
  if (main.dataset.vue !== 'equipe' || state.onglet !== 'stl') return;
  for (const el of box.querySelectorAll('[data-stl]')) {
    const f = eq.stls[Number(el.dataset.stl)];
    if (!f.analyse) continue;
    try {
      state.nettoyer.push(vueStl(el, await f.arrayBuffer()));
    } catch {
      el.innerHTML = '<p class="form-error">La vue 3D n’a pas pu être affichée (WebGL indisponible ?).</p>';
    }
  }
}

// --- Photos du carnet, images et PDF du dossier --------------------------------------------------------
function ongletFichiers(box, eq) {
  const photos = Object.entries(eq.projet?.carnet?.photos ?? {});
  const url = (f) => {
    const u = URL.createObjectURL(f);
    state.nettoyer.push(() => URL.revokeObjectURL(u));
    return u;
  };
  const NOMS = { dessins: 'Dessins', cablage: 'Câblage' };
  box.innerHTML = `
    <section class="pe-carte">
      <h3>Photos du carnet</h3>
      ${photos.length
        ? photos.map(([id, list]) => `<h4>${esc(NOMS[id] ?? id)}</h4><div class="pf-photos">${list.map((p) => `<a href="${p.data}" target="_blank" rel="noopener"><img src="${p.data}" alt="${esc(NOMS[id] ?? id)}"></a>`).join('')}</div>`).join('')
        : '<p class="cn-vide">Aucune photo dans le carnet.</p>'}
    </section>
    <section class="pe-carte">
      <h3>Images du dossier de l'équipe</h3>
      ${eq.images.length ? `<div class="pf-photos">${eq.images.map((f) => { const u = url(f); return `<a href="${u}" target="_blank" rel="noopener" title="${esc(f.name)}"><img src="${u}" alt="${esc(f.name)}"><small>${esc(f.name)}</small></a>`; }).join('')}</div>` : '<p class="cn-vide">Aucune image (JPG, PNG).</p>'}
    </section>
    <section class="pe-carte">
      <h3>Documents PDF</h3>
      ${eq.pdfs.length ? `<ul class="pf-pdfs">${eq.pdfs.map((f) => `<li><a href="${url(f)}" target="_blank" rel="noopener">${icon('cours', { size: 18 })}${esc(f.name)}</a></li>`).join('')}</ul>` : '<p class="cn-vide">Aucun PDF.</p>'}
    </section>`;
}

// =================================================================================================
// Actions
// =================================================================================================
main.addEventListener('click', async (e) => {
  const tab = e.target.closest('[data-onglet]');
  if (tab) return vueEquipe(state.courante, tab.dataset.onglet);
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const a = b.dataset.action;
  if (a === 'ouvrir') return ouvrir();
  if (a === 'rouvrir') {
    const d = (await S.dossiersConnus()).find((x) => x.classe === b.dataset.classe);
    return d && ouvrir(d.handle, d.classe);
  }
  if (a === 'importer') return importer();
  if (a === 'equipe') return vueEquipe(Number(b.dataset.i), 'carnet');
  if (a === 'classe') return vueClasse();
  if (a === 'prec') return vueEquipe(state.courante - 1);
  if (a === 'suiv') return vueEquipe(state.courante + 1);
  if (a === 'niveau-prog') {
    state.niveauProg = Number(b.dataset.n);
    return vueEquipe(state.courante, 'ia');
  }

  const eq = state.equipes[state.courante];
  const ev = eq && state.classeur.equipes[eq.dossier];
  if (a === 'valider') {
    const id = b.dataset.v;
    if (ev.validations[id]) delete ev.validations[id];
    else ev.validations[id] = { date: Date.now() };
    garder();
    // Écrite aussitôt dans le dossier de l'équipe ; « Validé le … » suffit comme confirmation
    // (un bandeau en haut ferait sauter la page). En cas d'échec, ecrireValidations prévient.
    await ecrireValidations(eq, ev);
    apresNotation({ carnet: true });
  } else if (a === 'niveau') {
    const v = Number(b.dataset.v);
    if (ev.niveaux[b.dataset.l] === v) delete ev.niveaux[b.dataset.l]; // second clic : on retire la note
    else ev.niveaux[b.dataset.l] = v;
    garder();
    apresNotation();
  } else if (a === 'bonus') {
    const el = b.dataset.el;
    const v = Math.round(((ev.bonus[el] ?? 0) + Number(b.dataset.d)) * 2) / 2;
    if (v) ev.bonus[el] = v;
    else delete ev.bonus[el];
    garder();
    vueEquipe(state.courante, 'bilan');
  }
});

function apresNotation({ carnet = false } = {}) {
  if (state.onglet === 'bilan' || (carnet && state.onglet === 'carnet')) {
    const y = window.scrollY;
    vueEquipe(state.courante);
    window.scrollTo(0, y);
  } else majPanneaux();
}

main.addEventListener('keydown', (e) => {
  const row = e.target.closest('tr[data-action="equipe"]');
  if (row && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    vueEquipe(Number(row.dataset.i), 'carnet');
  }
});

main.addEventListener('change', (e) => {
  const t = e.target;
  const eq = state.equipes[state.courante];
  const ev = eq && state.classeur?.equipes[eq.dossier];
  if (!ev) return;
  if (t.dataset.bonus !== undefined) {
    const v = parseFloat(t.value.replace(',', '.'));
    if (Number.isFinite(v) && v) ev.bonus[t.dataset.bonus] = Math.max(-20, Math.min(20, v));
    else delete ev.bonus[t.dataset.bonus];
    garder();
    vueEquipe(state.courante, 'bilan');
  }
});
main.addEventListener('input', (e) => {
  const t = e.target;
  const eq = state.equipes[state.courante];
  const ev = eq && state.classeur?.equipes[eq.dossier];
  if (!ev) return;
  if (t.dataset.motif !== undefined) {
    if (t.value.trim()) ev.motifs[t.dataset.motif] = t.value.slice(0, 200);
    else delete ev.motifs[t.dataset.motif];
    garder();
  } else if (t.dataset.commentaire !== undefined) {
    ev.commentaire = t.value.slice(0, 2000);
    garder();
  }
});

// --- Bande du haut ------------------------------------------------------------------------------------
$('btn-home').addEventListener('click', () => accueil());
$('btn-rescan').addEventListener('click', () => state.dir && charger(state.dir, { garderVue: true }));

function telecharger(nom, texte, type) {
  const u = URL.createObjectURL(new Blob([texte], { type }));
  const a = document.createElement('a');
  a.href = u;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 10_000);
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-');

$('btn-export').addEventListener('click', () => {
  const C = state.classeur;
  telecharger(`notes_theatre_ombre_${slug(C.classe)}.csv`, E.exportCsv(C), 'text/csv;charset=utf-8');
  showMessage('Notes exportées (une ligne par élève) : le fichier .csv s’ouvre avec Excel.', 'ok');
});

$('btn-save-eval').addEventListener('click', async () => {
  const C = state.classeur;
  const nom = `evaluation_theatre_ombre_${slug(C.classe)}.json`;
  const texte = JSON.stringify(C);
  if ('showSaveFilePicker' in window) {
    try {
      const h = await window.showSaveFilePicker({ id: 'prof-evaluation', suggestedName: nom, types: [{ description: 'Évaluation Théâtre d’ombre', accept: { 'application/json': ['.json'] } }] });
      const w = await h.createWritable();
      await w.write(texte);
      await w.close();
      return showMessage(`Évaluation sauvegardée : « ${h.name} ».`, 'ok');
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  telecharger(nom, texte, 'application/json');
  showMessage(`Évaluation téléchargée : « ${nom} ». Rangez-la dans votre dossier personnel.`, 'ok');
});

function importer() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    let c = null;
    try {
      c = E.normaliserClasseur(JSON.parse(await f.text()));
    } catch {
      /* fichier illisible */
    }
    if (!c) return showMessage('Ce fichier n’est pas une sauvegarde d’évaluation du Théâtre d’ombre.');
    const actuel = await S.lireClasseur(c.classe);
    if (actuel && actuel.maj > c.maj && !confirm(`L’évaluation de ${c.classe} gardée sur cet ordinateur est plus récente que ce fichier.\nLa remplacer quand même ?`)) return;
    await S.garderClasseur(c);
    showMessage(`Évaluation de ${c.classe} importée. Ouvrez le dossier de la classe pour la retrouver.`, 'ok');
    accueil();
  };
  input.click();
}

hydrateIcons();
accueil();

// Pour les essais automatiques.
window.theatreProf = { state, E };

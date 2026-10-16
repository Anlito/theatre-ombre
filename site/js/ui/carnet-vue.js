// Affichage du carnet de projet à partir de son contenu (carnet-contenu.js).
// Sert à l'écran « Carnet » des élèves (modifiable) et à l'outil professeur (lecture seule).
//
// renderCarnet(root, options) :
//   carnet     : données (carnet.js)
//   team       : prénoms de l'équipe
//   readOnly   : true dans l'outil professeur
//   validations: { v1: { date }, … } données par le professeur (◆)
//   live       : ce que le site sait en direct (personnages, couleurs des LED, reconnaissance)
//                { characters: [{ id, name, photos }], ledPins, ledColor(pin) -> 'rouge' | 'jaune' | 'vert' | 'bleu', reconnus: Set }
// Renvoie { refreshLive(live), refreshProgress(), refreshPhotos(id), refreshTeam(team) }.
// Les modifications appellent onChange(carnet) ; les boutons photo appellent onAddPhoto(id) / onRemovePhoto(id, photoId).
// Les badges « Site · 1 Entraîner »… et les liens appellent onGoto(ecran) au clic, onHint(ecran, true|false) au survol.
// Le tableau des LED appelle onLed(broche, couleur) quand l'équipe choisit une couleur ou une broche.

import { COMMANDE, CLIENT, MODE_EMPLOI, OUTILS, ETAPES, VALIDATIONS } from '../carnet-contenu.js';
import { avancement, MAX_PHOTOS } from '../carnet.js';
import { icon } from '../icons.js';
import { LED_COLORS } from '../led-colors.js';
import { teamFolderName, classPath } from '../team-folder.js';
import { cheminClasse } from '../college.js';
import { fileName } from '../project.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const teamHtml = (team) => (team.length ? team.map(esc).join(', ') : '<i>(menu de l’équipe)</i>');
// Valeur au-delà de la cote maximale (« 12 », « 10,5 ») ?
const trop = (v, max) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > max;
};
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export function renderCarnet(root, {
  carnet, team = [], readOnly = false, validations = {}, live = null,
  onChange = () => {}, onAddPhoto = () => {}, onRemovePhoto = () => {}, onGoto = () => {}, onHint = () => {}, onLed = () => {},
}) {
  const dis = readOnly ? ' disabled' : '';
  let liveData = live;

  const champ = (id, { lignes = 1, nombre = false, max = 0, label = '', placeholder = '' } = {}) => {
    const v = esc(carnet.champs[id]);
    const aria = label ? ` aria-label="${esc(label)}"` : '';
    if (lignes > 1) return `<textarea class="cn-field" data-champ="${id}" rows="${lignes}"${aria}${dis}>${v}</textarea>`;
    // Cote limitée (10 cm, 100 mm) : la case passe en orange si elle dépasse.
    const lim = max ? ` data-max="${max}" data-trop="${trop(carnet.champs[id], max)}" title="${max} au maximum"` : '';
    return `<input class="cn-field" data-champ="${id}" type="text"${nombre ? ' inputmode="decimal"' : ''} value="${v}" maxlength="${nombre ? 8 : 200}" placeholder="${esc(placeholder)}"${lim}${aria}${dis}>`;
  };
  const caseACocher = (id, html) =>
    `<label class="cn-check"><input type="checkbox" data-case="${id}"${carnet.cases[id] ? ' checked' : ''}${dis}><span>${html}</span></label>`;

  const valide = (id, t) => {
    const v = validations[id];
    return `<div class="cn-valide" data-valide="${v ? 'oui' : 'non'}">
      <span class="cn-losange" aria-hidden="true">◆</span>
      <span><b>${t}</b><small>${v ? `Validé par le professeur le ${fmtDate(v.date)}` : 'À faire valider par le professeur'}</small></span>
      ${v ? icon('ok', { size: 20, stroke: 3 }) : ''}
    </div>`;
  };

  // --- Blocs ---------------------------------------------------------------------------------
  const BLOCS = {
    sous: (b) => `
      <div class="cn-sous${b.facultatif ? ' is-facultatif' : ''}">
        <span class="cn-sous-n">${b.n}</span>
        <h4>${b.t}</h4>
        ${b.ecran && !readOnly
          ? `<button type="button" class="cn-outil cn-go" data-ecran="${b.ecran}" title="Y aller">${esc(b.outil)}${icon('chevron', { size: 14, stroke: 3 })}</button>`
          : `<span class="cn-outil">${esc(b.outil)}</span>`}
        ${b.aide ? `<p class="cn-aide">${b.aide}</p>` : ''}
      </div>`,
    cadre: (b) => `<div class="cn-cadre" data-ton="${b.ton ?? 'info'}">${b.html}</div>`,
    consignes: (b) => `<ol class="cn-consignes">${b.items.map((i) => `<li>${i}</li>`).join('')}</ol>`,
    tableau: (b) => {
      const head = b.colonnes.map((c) => `<th>${c.t}</th>`).join('');
      const rows = b.lignes
        .map((ligne, i) => {
          const fixes = Array.isArray(ligne) ? ligne : [`<b>${esc(ligne)}</b>`];
          let k = 0;
          const cells = b.colonnes.map((c) =>
            c.fixe ? `<td class="cn-fixe">${fixes[k++] ?? ''}</td>` : `<td>${champ(`${b.id}.${i}.${c.id}`, { nombre: c.nombre, max: c.max, label: `${c.t}, ligne ${i + 1}` })}</td>`,
          );
          return `<tr>${cells.join('')}</tr>`;
        })
        .join('');
      return `<div class="cn-table-wrap"><table class="cn-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    },
    lien: (b) =>
      readOnly
        ? `<a class="btn btn-secondary cn-lien" href="cablage.html" target="_blank" rel="noopener">${icon('led')}${b.t}</a>`
        : `<button type="button" class="btn btn-secondary cn-lien" data-ecran="${b.ecran}">${icon('led')}${b.t}</button>`,
    check: (b) => caseACocher(b.id, b.t),
    valide: (b) => valide(b.id, b.t),
    texte: (b) => `<label class="cn-texte"><span>${b.t}</span>${champ(b.id, { lignes: b.lignes, label: b.t })}</label>`,
    photos: (b) => `
      <div class="cn-photos" data-photos="${b.id}">
        <div class="cn-photos-head"><b>${b.t}</b>${b.aide && !readOnly ? `<small>${b.aide}</small>` : ''}</div>
        <div class="cn-photos-list">${photosHtml(b.id, b.max)}</div>
      </div>`,
    leds: (b) => `<div class="cn-table-wrap" data-live="leds" data-n="${b.n}">${ledsHtml(b.n)}</div>`,
    ia: () => `<div class="cn-table-wrap" data-live="ia">${iaHtml()}</div>`,
    code: (b) => {
      const trou = (n) => `<input class="cn-field cn-trou" data-champ="${b.id}.${n}" value="${esc(carnet.champs[`${b.id}.${n}`])}" maxlength="20" aria-label="Case ${n} du code"${dis}>`;
      return `<pre class="cn-code"><code>if (jeVois("Loup")) {
  digitalWrite(${trou('b1')}, HIGH);
} else if (jeVois("${trou('b2')}")) {
  digitalWrite(${trou('b3')}, HIGH);
}</code></pre>`;
    },
    chaine: (b) => `
      <div class="cn-chaine" data-lettre="${b.lettre}">
        <h4><span class="cn-lettre">${b.lettre}</span>${b.t}</h4>
        <div class="cn-chaine-row">
          <span class="cn-chaine-nom">${b.nom}</span>
          ${b.cases
            .map(
              (c, i) => `${i ? '<span class="cn-fleche" aria-hidden="true">→</span>' : ''}
            <div class="cn-maillon">
              <b>${c.t}</b>
              <p>${c.def}</p>
              <p class="cn-ex"><i>${c.ex}</i></p>
              <label><span>Dans mon projet :</span>${champ(c.id, { lignes: 2, label: `${c.t} : dans mon projet` })}</label>
            </div>`,
            )
            .join('')}
        </div>
      </div>`,
    choix: (b) => `
      <p class="cn-choix-titre"><b>${b.t}</b></p>
      <div class="cn-table-wrap"><table class="cn-table cn-choix">
        <thead><tr><th>Composant</th><th>Ce qu’il fait</th><th>Chaîne</th></tr></thead>
        <tbody>${b.lignes
          .map(
            (l) => `<tr>
              <td class="cn-fixe"><b>${l.t}</b></td>
              <td class="cn-fixe">${l.role}${l.champ ? ` ${champ(l.champ, { label: 'Les LED s’allument pour' })}` : ''}</td>
              <td><div class="cn-radios" role="radiogroup" aria-label="${esc(l.t)}">${b.options
                .map(
                  (o) => `<label><input type="radio" name="cn-${b.id}-${l.id}" data-choix="${b.id}.${l.id}" value="${o.v}"${
                    carnet.choix[`${b.id}.${l.id}`] === o.v ? ' checked' : ''
                  }${dis}>${o.t}</label>`,
                )
                .join('')}</div></td>
            </tr>`,
          )
          .join('')}</tbody>
      </table></div>`,
  };

  function photosHtml(id, max = MAX_PHOTOS) {
    const list = carnet.photos[id] ?? [];
    const imgs = list
      .map(
        (p, i) => `<figure class="cn-photo">
          <img src="${p.data}" alt="Photo ${i + 1}">
          ${readOnly ? '' : `<button class="icon-btn cn-photo-del" type="button" data-photo-del="${id}" data-photo-id="${esc(p.id)}" aria-label="Supprimer la photo ${i + 1}" title="Supprimer">${icon('supprimer', { size: 18 })}</button>`}
        </figure>`,
      )
      .join('');
    const add =
      !readOnly && list.length < max
        ? `<button class="cn-photo-add" type="button" data-photo-add="${id}">${icon('photo', { size: 28 })}<span>Ajouter une photo</span></button>`
        : '';
    const empty = readOnly && !list.length ? '<p class="cn-vide">Aucune photo.</p>' : '';
    return imgs + add + empty;
  }

  function ledsHtml(n) {
    const pinsPossibles = liveData?.ledPins ?? [9, 10, 11, 12];
    const names = liveData?.characters?.map((c) => c.name) ?? [];
    const rows = Array.from({ length: n }, (_, i) => {
      const broche = Number(carnet.champs[`leds.${i}.broche`]) || pinsPossibles[i] || 9;
      const couleur = liveData?.ledColor?.(broche) ?? carnet.champs[`leds.${i}.couleur`] ?? '';
      const c = LED_COLORS[couleur];
      const perso = carnet.champs[`leds.${i}.perso`] ?? '';
      const persos = [...new Set([...names, ...(perso ? [perso] : [])])];
      const selBroche = `<select class="cn-field" data-led-broche="${i}" aria-label="Broche de la LED ${i + 1}"${dis}>
          ${[...new Set([...pinsPossibles, broche])].map((p) => `<option value="${p}"${p === broche ? ' selected' : ''}>broche ${p}</option>`).join('')}
        </select>`;
      const selCouleur = `<div class="cn-led-choix"><span class="cn-led" style="--led:${c?.hex ?? 'transparent'}"></span>
          <select class="cn-field" data-led-couleur="${i}" aria-label="Couleur de la LED ${i + 1}"${dis}>
            ${c ? '' : '<option value="">— choisir —</option>'}
            ${Object.entries(LED_COLORS).map(([k, v]) => `<option value="${k}"${k === couleur ? ' selected' : ''}>${v.nom}</option>`).join('')}
          </select></div>`;
      const selPerso = `<select class="cn-field" data-champ="leds.${i}.perso" aria-label="Personnage de la LED ${i + 1}"${dis}>
          <option value="">— choisir —</option>
          ${persos.map((nm) => `<option${nm === perso ? ' selected' : ''}>${esc(nm)}</option>`).join('')}
        </select>`;
      return `<tr><td class="cn-fixe"><b>LED ${i + 1}</b></td><td>${selCouleur}</td><td>${selBroche}</td><td>${selPerso}</td></tr>`;
    }).join('');
    return `<table class="cn-table cn-leds"><thead><tr><th>LED</th><th>Couleur</th><th>Broche de l’Arduino</th><th>Personnage associé</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function iaHtml() {
    const chars = liveData?.characters ?? [];
    if (!chars.length) return '<p class="cn-vide">Créez vos personnages dans « 1 Entraîner » : ils apparaîtront ici.</p>';
    const reconnus = liveData?.reconnus ?? new Set(carnet.auto.reconnus);
    const rows = chars
      .map((c) => {
        const ok = reconnus.has(c.name);
        return `<tr>
          <td class="cn-fixe"><b>${esc(c.name)}</b></td>
          <td class="cn-fixe cn-num" data-assez="${c.photos >= 15}">${c.photos}</td>
          <td>${champ(`ia.${c.id}.varie`, { label: `Ce que nous avons varié pour ${c.name}`, placeholder: 'angle, distance, lumière…' })}</td>
          <td class="cn-fixe cn-reconnu" data-ok="${ok}">${ok ? icon('ok', { size: 18, stroke: 3 }) + 'oui' : 'pas encore'}</td>
        </tr>`;
      })
      .join('');
    return `<table class="cn-table"><thead><tr><th>Personnage</th><th>Nb photos <small>(site)</small></th><th>Ce que j’ai varié (angle, lumière…)</th><th>Reconnu ? <small>(site)</small></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // --- Page ------------------------------------------------------------------------------------
  const route = ETAPES.map((e) => {
    const vals = VALIDATIONS.filter((v) => v.etape === e.n);
    const ok = vals.length && vals.every((v) => validations[v.id]);
    return `<tr>
      <td class="cn-fixe"><b>${e.n}</b></td>
      <td class="cn-fixe"><a href="#cn-etape-${e.n}" data-goto="${e.n}"><b>${e.titre}</b></a><small>${e.route}</small></td>
      <td class="cn-fixe cn-outil-cell">${esc(e.outil)}</td>
      <td class="cn-centre">${`<input type="checkbox" data-case="route.${e.n}" aria-label="Étape ${e.n} faite"${carnet.cases[`route.${e.n}`] ? ' checked' : ''}${dis}>`}</td>
      <td class="cn-centre cn-route-valide" data-ok="${!!ok}" title="${ok ? 'Validé par le professeur' : 'Pas encore validé'}">${ok ? '◆' : '—'}</td>
    </tr>`;
  }).join('');

  const etapes = ETAPES.map(
    (e) => `
    <section class="cn-etape" id="cn-etape-${e.n}" data-etape="${e.n}">
      <header class="cn-etape-head">
        <span class="cn-etape-n">Étape ${e.n}</span>
        <h3><span class="cn-verbe">${e.verbe}</span> ${esc(e.sousTitre)}</h3>
        <span class="cn-outil">${esc(e.outil)}</span>
        <span class="cn-prog" data-prog="${e.n}"></span>
      </header>
      <h4 class="cn-etape-titre">${e.n} · ${e.titre}</h4>
      ${e.blocs.map((b) => BLOCS[b.type](b)).join('')}
    </section>`,
  ).join('');

  // Chemins et noms de fichiers à la classe et aux prénoms de l'équipe.
  const perso = (html) =>
    html
      .replaceAll('{chemin}', esc(classPath(carnet.classe, cheminClasse())))
      .replaceAll('{classe}', esc(carnet.classe.trim().toUpperCase() || '3X'))
      .replaceAll('{dossier}', esc(team.length ? teamFolderName(team) : 'PRENOM - PRENOM'))
      .replaceAll('{prenoms}', esc(team.length ? fileName(team).replace(/_theatre_ombre.json$/, '') : 'PRENOM_PRENOM'));

  root.innerHTML = perso(`
    <div class="cn-layout">
      <nav class="cn-nav" aria-label="Étapes du carnet">
        <a href="#cn-debut" data-goto="0" class="cn-nav-item"><span class="cn-nav-n">${icon('cours', { size: 18 })}</span><span>Le projet</span></a>
        ${ETAPES.map(
          (e) => `<a href="#cn-etape-${e.n}" data-goto="${e.n}" class="cn-nav-item"><span class="cn-nav-n">${e.n}</span><span>${e.verbe}</span><span class="cn-nav-prog" data-prog-nav="${e.n}"></span></a>`,
        ).join('')}
      </nav>
      <div class="cn-doc">
        <section class="cn-etape cn-entete" id="cn-debut">
          <p class="cn-kicker">Document élève · étapes du projet</p>
          <h2>Théâtre d’Ombre Augmenté</h2>
          <div class="cn-ident">
            <div><span>Prénoms</span><b data-team>${teamHtml(team)}</b></div>
            <label><span>Classe</span><input class="cn-field" data-classe type="text" maxlength="20" value="${esc(carnet.classe)}" placeholder="ex. 4B"${dis}></label>
          </div>
          <div class="cn-cadre cn-commande"><b>Le but du projet, commande du Théâtre des Lumières :</b> ${COMMANDE}</div>
          <div class="cn-client">
            <div><h4>Le client attend</h4>${CLIENT.attend.map((c) => caseACocher(c.id, c.t)).join('')}</div>
            <div><h4>Et aussi</h4>${CLIENT.aussi.map((c) => caseACocher(c.id, c.t)).join('')}</div>
          </div>
          <div class="cn-cadre"><b>Mode d’emploi :</b> ${MODE_EMPLOI}</div>
          <h4>Les outils</h4>
          <div class="cn-table-wrap"><table class="cn-table"><thead><tr><th>Outil</th><th>Où le trouver</th></tr></thead>
            <tbody>${OUTILS.map(([a, b]) => `<tr><td class="cn-fixe">${a}</td><td class="cn-fixe">${b}</td></tr>`).join('')}</tbody></table></div>
          <h4>Ma route</h4>
          <div class="cn-table-wrap"><table class="cn-table cn-route"><thead><tr><th>N°</th><th>Étape</th><th>Outil</th><th>Fait</th><th>Validé ◆</th></tr></thead>
            <tbody>${route}</tbody></table></div>
        </section>
        ${etapes}
      </div>
    </div>`);

  // --- Modifications -----------------------------------------------------------------------------
  if (!readOnly) {
    root.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.champ) {
        const v = t.value;
        if (v.trim()) carnet.champs[t.dataset.champ] = v.slice(0, 1000);
        else delete carnet.champs[t.dataset.champ];
        if (t.dataset.max) t.dataset.trop = String(trop(v, Number(t.dataset.max)));
      } else if (t.dataset.classe !== undefined) {
        carnet.classe = t.value.slice(0, 20);
      } else return;
      changed();
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.case) {
        if (t.checked) carnet.cases[t.dataset.case] = true;
        else delete carnet.cases[t.dataset.case];
        // La même case peut être affichée deux fois (route) : on garde les deux à jour.
        for (const other of root.querySelectorAll(`[data-case="${t.dataset.case}"]`)) other.checked = t.checked;
      } else if (t.dataset.choix) {
        carnet.choix[t.dataset.choix] = t.value;
      } else if (t.dataset.ledBroche !== undefined || t.dataset.ledCouleur !== undefined) {
        // LED i : on retient sa broche et sa couleur ; le site prend cette couleur pour cette broche.
        const i = t.dataset.ledBroche ?? t.dataset.ledCouleur;
        const row = t.closest('tr');
        const broche = row.querySelector('[data-led-broche]').value;
        const couleur = row.querySelector('[data-led-couleur]').value;
        carnet.champs[`leds.${i}.broche`] = broche;
        if (couleur) carnet.champs[`leds.${i}.couleur`] = couleur;
        if (t.dataset.ledBroche !== undefined) {
          // Nouvelle broche : la couleur choisie la suit.
          if (couleur) onLed(Number(broche), couleur);
        } else if (couleur) onLed(Number(broche), couleur);
        row.querySelector('.cn-led').style.setProperty('--led', LED_COLORS[couleur]?.hex ?? 'transparent');
      } else if (t.tagName === 'SELECT' && t.dataset.champ) {
        if (t.value) carnet.champs[t.dataset.champ] = t.value;
        else delete carnet.champs[t.dataset.champ];
      } else return;
      changed();
    });
    // Badges « Site · 1 Entraîner »… : au survol, l'onglet à utiliser clignote ; au clic, on y va.
    let hinted = null;
    const hint = (ecran) => {
      if (hinted === ecran) return;
      if (hinted) onHint(hinted, false);
      hinted = ecran;
      if (ecran) onHint(ecran, true);
    };
    root.addEventListener('mouseover', (e) => hint(e.target.closest('[data-ecran]')?.dataset.ecran ?? null));
    root.addEventListener('mouseleave', () => hint(null));
    root.addEventListener('focusin', (e) => hint(e.target.closest('[data-ecran]')?.dataset.ecran ?? null));
    root.addEventListener('click', (e) => {
      const go = e.target.closest('[data-ecran]');
      if (go) {
        hint(null);
        return onGoto(go.dataset.ecran);
      }
      const add = e.target.closest('[data-photo-add]');
      if (add) return onAddPhoto(add.dataset.photoAdd);
      const del = e.target.closest('[data-photo-del]');
      if (del) return onRemovePhoto(del.dataset.photoDel, del.dataset.photoId);
    });
  }
  root.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (!go) return;
    e.preventDefault();
    const target = go.dataset.goto === '0' ? root.querySelector('#cn-debut') : root.querySelector(`#cn-etape-${go.dataset.goto}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function changed() {
    refreshProgress();
    onChange(carnet);
  }

  function refreshProgress() {
    for (const e of ETAPES) {
      const { faits, total } = avancement(carnet, e.n);
      const done = total > 0 && faits === total;
      for (const el of root.querySelectorAll(`[data-prog="${e.n}"], [data-prog-nav="${e.n}"]`)) {
        el.textContent = `${faits}/${total}`;
        el.dataset.done = String(done);
      }
    }
  }

  function refreshLive(next) {
    liveData = next;
    const ia = root.querySelector('[data-live="ia"]');
    const leds = root.querySelector('[data-live="leds"]');
    // On ne redessine pas un tableau pendant que l'élève y écrit.
    if (ia && !ia.contains(document.activeElement)) ia.innerHTML = iaHtml();
    if (leds && !leds.contains(document.activeElement)) leds.innerHTML = ledsHtml(Number(leds.dataset.n));
  }

  function refreshPhotos(id) {
    const box = root.querySelector(`[data-photos="${id}"] .cn-photos-list`);
    const def = ETAPES.flatMap((e) => e.blocs).find((b) => b.type === 'photos' && b.id === id);
    if (box) box.innerHTML = photosHtml(id, def?.max);
  }

  function refreshTeam(next) {
    const el = root.querySelector('[data-team]');
    if (el) el.innerHTML = teamHtml(next);
  }

  refreshProgress();
  return { refreshLive, refreshProgress, refreshPhotos, refreshTeam };
}

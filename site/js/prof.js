// Outil professeur : accueil (choix de la classe), vue Classe (résumé, alertes, tableau), vue Équipe (onglets),
// suivi en direct du dossier de la classe, barème réglable, exports.
(async function (global) {
  'use strict';

  const A = global.Atelier;
  await A.parcoursPret;
  const LB = global.LaboBlocs;
  // Ce qui est propre au Théâtre (js/prof-theatre.js) : carnet, indices, STL, validations ◆.
  const TP = global.TheatreProf;
  const $ = (sel, racine) => (racine || document).querySelector(sel);
  const $$ = (sel, racine) => [...(racine || document).querySelectorAll(sel)];
  const echapper = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ORDRE = A.ORDRE_PARCOURS;
  const exercices = A.catalogue.exercices();
  const titre = (id) => (exercices.find((e) => e.id === id) || {}).titre || '';
  const pluriel = (n, mot, motPluriel) => `${n} ${n > 1 ? motPluriel || mot + 's' : mot}`;

  // Icônes des boutons (attribut data-ic).
  for (const el of $$('[data-ic]')) el.insertAdjacentHTML('afterbegin', A.icone(el.dataset.ic, { epaisseur: 2.4 }));

  let manuels = []; // { nom, texte } : fichiers glissés ou choisis à la main
  let fichiersDossier = []; // fichiers lus dans le dossier de la classe (relus en direct)
  let fichiers = []; // les deux réunis
  // Théâtre : évaluations de l'ancien outil professeur reprises une fois (D1–D7, bonus / malus, commentaires).
  const repris = await A.notesProf.reprendreAncien();
  let bareme = A.completerBareme(A.notesProf.bareme() || A.bareme);
  for (const p of A.partiesSuivies(A.carnet, null)) if (!(p.id in bareme.carnet)) bareme.carnet[p.id] = 0;
  let fusion = { equipes: [], invalides: [] };
  let misesAJour = new Set();

  // Vue affichée : 'accueil' | 'classe' | 'equipe'
  const vue = { nom: 'accueil', equipe: null, onglet: 'bilan' };

  function montrerVue(nom) {
    vue.nom = nom;
    for (const s of $$('.vue')) s.hidden = !s.classList.contains('vue-' + nom);
    $('.pb-actions').hidden = nom === 'accueil';
    $('.pb-atelier').hidden = nom !== 'accueil'; // dans la classe, le lien est dans la barre des filtres
    if (nom !== 'equipe') {
      A.dessins.arreter(); // caméra éteinte hors de la vue Équipe
      libererStl();
    }
    scrollTo(0, 0);
  }

  // ---------- Import ----------

  function ajouter(nouveaux) {
    // Un même fichier importé deux fois n'est compté qu'une fois.
    const cle = (f) => f.nom + '|' + f.texte.length + '|' + f.texte.slice(-60);
    const vus = new Set(manuels.map(cle));
    for (const f of nouveaux) if (!vus.has(cle(f))) manuels.push(f);
    recalculer();
  }

  function recalculer() {
    fichiers = [...manuels, ...fichiersDossier];
    // Signature du travail d'une équipe : change dès qu'elle vérifie, ouvre un indice ou réussit.
    const signature = (d) =>
      d.modifieLe + '|' + Object.values(d.exercices).map((e) => `${e.statut}:${e.tentatives}:${e.indicesOuverts}`).join(',');
    const avant = new Map(fusion.equipes.map((e) => [e.cle, signature(e.donnees)]));
    fusion = A.fusionnerEquipes(fichiers);
    for (const eq of fusion.equipes) Object.defineProperty(eq.donnees, 'evaluationsProf', { value: A.notesProf.pour(eq.donnees), configurable: true, enumerable: false });
    // Équipes qui ont avancé depuis la dernière lecture (signalées dans le tableau).
    misesAJour = new Set(fusion.equipes.filter((e) => avant.has(e.cle) && avant.get(e.cle) !== signature(e.donnees)).map((e) => e.cle));
    if (!fusion.equipes.length && !fichiers.length) {
      if (vue.nom !== 'accueil') montrerVue('accueil');
    } else if (vue.nom === 'accueil') montrerVue('classe');
    majBande();
    messages();
    dessiner();
    verifierAlertes();
    if (vue.nom === 'equipe') {
      const eq = fusion.equipes.find((x) => x.cle === vue.equipe);
      // Théâtre : pas de mise à jour en direct pendant que le professeur écrit (motif, commentaire, bonus).
      const ecrit = document.activeElement && document.activeElement.closest('.pe-contenu') && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
      if (eq && !ecrit) dessinerEquipe(true);
      else if (!eq) montrerVue('classe');
    }
  }

  async function lireFichiers(liste) {
    const sortie = [];
    for (const f of liste) if (/\.json$/i.test(f.name) && !A.estValidations(f.name)) sortie.push({ nom: f.name, texte: await f.text() });
    return sortie;
  }

  // Tous les .json du dossier choisi et de ses sous-dossiers (ex. THEATRE IA › LEA - TOM › LEA_TOM_theatre_ombre.json).
  // Un fichier qui n'a pas changé depuis la dernière lecture n'est pas relu (dossier réseau : on reste léger).
  const cache = new Map(); // chemin → { date, taille, texte }
  const dossiersEquipes = new Map(); // chemin du .json → dossier qui le contient (photos des croquis)
  // Théâtre : validations ◆ données par le professeur (validations.json, rangé dans le dossier de l'équipe).
  const validationsDossiers = new Map(); // chemin du dossier (« … › LEA - TOM › ») → { v1: { date }, … }
  const dossierDe = (nom) => nom.replace(/[^›]*$/, '');
  async function lireDossier(dossier, chemin, profondeur) {
    const sortie = [];
    for await (const entree of dossier.values()) {
      if (entree.kind === 'file' && A.estValidations(entree.name)) {
        try {
          validationsDossiers.set(dossierDe(chemin + entree.name), TP.normalizeValidations(JSON.parse(await (await entree.getFile()).text())));
        } catch {
          /* fichier en cours d'écriture ou abîmé : relu au prochain passage */
        }
      } else if (entree.kind === 'file' && /\.json$/i.test(entree.name)) {
        const nom = chemin + entree.name;
        dossiersEquipes.set(nom, dossier);
        let f;
        try {
          f = await entree.getFile();
        } catch {
          continue; // fichier en cours d'écriture par un élève : on le relira au prochain passage
        }
        const connu = cache.get(nom);
        if (connu && connu.date === f.lastModified && connu.taille === f.size) sortie.push({ nom, texte: connu.texte });
        else {
          const texte = await f.text();
          cache.set(nom, { date: f.lastModified, taille: f.size, texte });
          sortie.push({ nom, texte });
        }
      } else if (entree.kind === 'directory' && profondeur < 3) {
        sortie.push(...(await lireDossier(entree, chemin + entree.name + ' › ', profondeur + 1)));
      }
    }
    return sortie;
  }

  // Fichiers glissés n'importe où dans la page (la zone de l'accueil est surlignée).
  const zone = $('.zone-depot');
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('survol');
  });
  document.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget) zone.classList.remove('survol');
  });
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('survol');
    if (e.dataTransfer && e.dataTransfer.files.length) ajouter(await lireFichiers([...e.dataTransfer.files]));
  });
  $('.entree-fichiers').addEventListener('change', async (e) => {
    ajouter(await lireFichiers([...e.target.files]));
    e.target.value = '';
  });

  // ---------- Suivi en direct du dossier de la classe (Chrome, Edge) ----------

  const suivi = { dossier: null, minuteur: null, periode: 30, enPause: false, derniere: null, erreur: '' };

  async function actualiser() {
    if (!suivi.dossier) return;
    try {
      fichiersDossier = await lireDossier(suivi.dossier, suivi.dossier.name + ' › ', 0);
      stlsEquipes.clear(); // Théâtre : fichiers STL relus à la prochaine ouverture d'une équipe
      suivi.erreur = '';
      suivi.derniere = new Date();
    } catch {
      suivi.erreur = 'Le dossier n’a pas pu être relu (réseau ?). Nouvel essai au prochain passage.';
    }
    recalculer();
  }

  function programmer() {
    clearInterval(suivi.minuteur);
    suivi.minuteur = suivi.dossier && !suivi.enPause ? setInterval(actualiser, suivi.periode * 1000) : null;
    majBande();
  }

  async function suivre(dossier) {
    suivi.dossier = dossier;
    suivi.enPause = false;
    cache.clear();
    memoriserDossier(dossier);
    await actualiser();
    programmer();
  }

  function arreterSuivi() {
    suivi.dossier = null;
    fichiersDossier = [];
    clearInterval(suivi.minuteur);
    memoriserDossier(null);
    recalculer();
  }

  // Bandeau : classe suivie et état du suivi en direct.
  function majBande() {
    const n = fusion.equipes.length;
    const classe = $('.pb-classe');
    classe.hidden = !n && !suivi.dossier;
    classe.textContent = suivi.dossier ? `« ${suivi.dossier.name} » · ${pluriel(n, 'équipe')}` : pluriel(n, 'équipe') + ' (fichiers importés)';
    const direct = $('.pb-direct');
    direct.hidden = !suivi.dossier;
    if (suivi.dossier) {
      const heure = suivi.derniere ? suivi.derniere.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '…';
      direct.className = 'pb-direct' + (suivi.enPause ? ' pause' : '') + (suivi.erreur ? ' erreur' : '');
      direct.innerHTML = `<span class="suivi-point" aria-hidden="true"></span>${suivi.enPause ? 'En pause' : 'En direct'} · lu à ${heure}`;
      direct.title = suivi.erreur || `Le dossier est relu toutes les ${suivi.periode} s (réglable dans « Barème »).`;
    }
    $('.btn-actualiser').hidden = !suivi.dossier;
    $('.reglage-suivi').hidden = !suivi.dossier;
    $('.suivi-erreur').textContent = suivi.erreur;
    $('.btn-suivi-pause').textContent = suivi.enPause ? 'Reprendre le suivi' : 'Mettre en pause';
  }

  if (typeof global.showDirectoryPicker === 'function') {
    const b = $('.btn-dossier-classe');
    b.hidden = false;
    b.addEventListener('click', async () => {
      let dossier;
      try {
        dossier = await global.showDirectoryPicker({ id: A.projet.id + '-prof', mode: 'read' });
      } catch {
        return;
      }
      suivre(dossier);
    });
    $('.btn-actualiser').addEventListener('click', actualiser);
    $('.btn-suivi-pause').addEventListener('click', () => {
      suivi.enPause = !suivi.enPause;
      if (!suivi.enPause) actualiser();
      programmer();
    });
    $('.btn-suivi-arreter').addEventListener('click', () => {
      arreterSuivi();
      $('.dialogue-reglages').close();
    });
    $('.suivi-periode').addEventListener('change', (e) => {
      suivi.periode = Number(e.target.value) || 30;
      programmer();
    });
    // Le dossier suivi est mémorisé : à la réouverture de la page, un clic suffit pour reprendre.
    dossierMemorise().then((d) => {
      if (!d) return;
      const r = $('.btn-reprendre-suivi');
      $('.reprendre-dossier', r).textContent = d.name;
      r.hidden = false;
      r.addEventListener('click', async () => {
        try {
          if ((await d.queryPermission({ mode: 'read' })) !== 'granted' && (await d.requestPermission({ mode: 'read' })) !== 'granted') return;
        } catch {
          return;
        }
        suivre(d);
      });
    });
  } else $('.prof-alerte-navigateur').hidden = false;

  function base() {
    return new Promise((ok, ko) => {
      const r = indexedDB.open(A.projet.id + '-prof', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('dossiers');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  }
  async function memoriserDossier(dossier) {
    try {
      const db = await base();
      const t = db.transaction('dossiers', 'readwrite');
      if (dossier) t.objectStore('dossiers').put(dossier, 'classe');
      else t.objectStore('dossiers').delete('classe');
    } catch {
      /* stockage indisponible : il faudra rechoisir le dossier */
    }
  }
  async function dossierMemorise() {
    try {
      const db = await base();
      return await new Promise((ok) => {
        const r = db.transaction('dossiers').objectStore('dossiers').get('classe');
        r.onsuccess = () => ok(r.result || null);
        r.onerror = () => ok(null);
      });
    } catch {
      return null;
    }
  }

  // « Autre classe » : tout retirer et revenir à l'accueil.
  function toutRetirer() {
    manuels = [];
    alertesConnues = null;
    nouvelles.clear();
    if (suivi.dossier) arreterSuivi();
    else recalculer();
  }
  $('.btn-autre-classe').addEventListener('click', toutRetirer);

  // ---------- Alertes : une équipe devient « bloquée » ----------

  let alertesConnues = null; // clés déjà signalées (null : première lecture, rien n'est « nouveau »)
  const nouvelles = new Map(); // clé → heure d'apparition
  function verifierAlertes() {
    const liste = A.alertesClasse(fusion.equipes, seuils());
    const cles = new Set(liste.map((a) => a.cle));
    const apparues = alertesConnues ? liste.filter((a) => !alertesConnues.has(a.cle)) : [];
    for (const a of apparues) nouvelles.set(a.cle, new Date());
    for (const c of [...nouvelles.keys()]) if (!cles.has(c)) nouvelles.delete(c);
    alertesConnues = cles;
    dessinerAlertes(liste);
    if (apparues.length) prevenir(apparues);
  }

  function dessinerAlertes(liste) {
    const zoneAlertes = $('.prof-alertes');
    zoneAlertes.hidden = !liste.length;
    if (!liste.length) return;
    liste.sort((a, b) => (nouvelles.has(b.cle) ? 1 : 0) - (nouvelles.has(a.cle) ? 1 : 0));
    $('.alertes-liste', zoneAlertes).innerHTML = liste
      .map((a) => {
        const n = nouvelles.get(a.cle);
        return (
          `<li class="${n ? 'nouvelle' : ''}"><button type="button" class="alerte-equipe" data-alerte="${echapper(a.cle.split('|').slice(0, 2).join('|'))}">` +
          `<strong>${echapper(a.equipe)}</strong>${a.classe ? ' · ' + echapper(a.classe) : ''}</button>` +
          `<span>exercice ${a.id} · ${echapper(titre(a.id))} — ${echapper(a.raison)}</span>` +
          (n ? ` <span class="badge-nouveau">nouveau · ${n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>` : '') +
          '</li>'
        );
      })
      .join('');
    $('.alertes-titre', zoneAlertes).innerHTML = A.icone('alerte', { epaisseur: 2.4 }) + `${pluriel(liste.length, 'équipe bloquée', 'équipes bloquées')}`;
  }
  $('.prof-alertes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-alerte]');
    if (b) ouvrirEquipe(b.dataset.alerte);
  });

  // Son court (deux notes) et notification du système si elle a été autorisée.
  function prevenir(apparues) {
    if ($('.alerte-son').checked) {
      try {
        const ctx = new (global.AudioContext || global.webkitAudioContext)();
        [660, 880].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
          g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
          o.connect(g).connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.18);
          o.stop(ctx.currentTime + i * 0.18 + 0.2);
        });
      } catch {
        /* pas de son */
      }
    }
    if (global.Notification && Notification.permission === 'granted') {
      const a = apparues[0];
      const plus = apparues.length > 1 ? ` (+${apparues.length - 1} autre${apparues.length > 2 ? 's' : ''})` : '';
      try {
        new Notification(A.projet.titre + ' : équipe bloquée', { body: `${a.equipe}, exercice ${a.id} : ${a.raison}${plus}`, tag: 'atelier-alerte' });
      } catch {
        /* notifications indisponibles (ex. fichier ouvert hors serveur) */
      }
    }
  }
  const bNotif = $('.btn-notifications');
  if (!global.Notification) bNotif.hidden = true;
  else {
    const majNotif = () => {
      bNotif.disabled = Notification.permission !== 'default';
      bNotif.textContent = Notification.permission === 'granted' ? 'Notifications activées' : Notification.permission === 'denied' ? 'Notifications refusées par le navigateur' : 'Activer les notifications';
    };
    majNotif();
    bNotif.addEventListener('click', async () => {
      await Notification.requestPermission();
      majNotif();
    });
  }

  // Fichiers lus : doublons et fichiers ignorés (sous le tableau).
  function messages() {
    const m = [];
    m.push(`<p>${pluriel(fusion.equipes.length, 'équipe')} à partir de ${pluriel(fichiers.length, 'fichier')}.</p>`);
    const doublons = fusion.equipes.filter((e) => e.autres.length);
    if (doublons.length) {
      m.push(
        '<details><summary>' + `${doublons.length} équipe${doublons.length > 1 ? 's ont' : ' a'} plusieurs fichiers : le plus récent est gardé.` + '</summary><ul>' +
          doublons.map((e) => `<li>${echapper(e.donnees.equipe.eleves.join(', '))} : gardé ${echapper(e.fichier)} ; ignoré ${e.autres.map(echapper).join(', ')}</li>`).join('') +
          '</ul></details>',
      );
    }
    if (fusion.invalides.length) {
      m.push(
        '<details><summary>' + `${fusion.invalides.length} fichier${fusion.invalides.length > 1 ? 's ignorés' : ' ignoré'} (pas une sauvegarde de l’atelier).` + '</summary><ul>' +
          fusion.invalides.map((i) => `<li>${echapper(i.nom)} : ${echapper(i.raison)}</li>`).join('') +
          '</ul></details>',
      );
    }
    $('.prof-messages').innerHTML = m.join('');
  }

  // ---------- Vue Classe ----------

  const seuils = () => ({
    tentatives: Math.max(1, Number($('.seuil-tentatives').value) || A.SEUILS.tentatives),
    minutes: Math.max(1, Number($('.seuil-minutes').value) || A.SEUILS.minutes),
  });

  // Carnet : avancement des réponses du carnet du Théâtre (5 étapes) ; les livrables sont les mêmes en 4e et en 3e.
  const niveauEquipe = (d) => A.niveauDe(d.equipe && d.equipe.classe);
  const avancementCarnet = (d) => A.avancementCarnet(A.completerCarnet(d.carnet), A.carnet, niveauEquipe(d));
  const nObligatoires = () => A.exercicesObligatoires().length;
  const finalDe = () => { const o = A.exercicesObligatoires(); return o[o.length - 1]; };

  function resume(eq) {
    const r = A.resumerEquipe(eq.donnees, seuils());
    r.note = A.noterEquipe(eq.donnees, bareme);
    const c = avancementCarnet(eq.donnees);
    r.carnet = c.fait;
    r.carnetTotal = c.total;
    return r;
  }

  function selection() {
    const classe = $('.filtre-classe').value;
    let liste = fusion.equipes.map((eq) => ({ eq, r: resume(eq) }));
    if (classe) liste = liste.filter((x) => x.r.classe === classe);
    if ($('.filtre-bloquees').checked) liste = liste.filter((x) => x.r.bloque);
    const tri = $('.tri').value;
    const nom = (x) => x.r.classe + ' ' + x.r.eleves.join(' ').toLowerCase();
    liste.sort((a, b) => {
      if (tri === 'avancement') return b.r.avancement - a.r.avancement || nom(a).localeCompare(nom(b));
      if (tri === 'activite') return (b.r.derniereActivite || '').localeCompare(a.r.derniereActivite || '');
      if (tri === 'note') return b.r.note.note - a.r.note.note || nom(a).localeCompare(nom(b));
      return nom(a).localeCompare(nom(b), 'fr');
    });
    return liste;
  }

  function majClasses() {
    const select = $('.filtre-classe');
    const choisie = select.value;
    const classes = [...new Set(fusion.equipes.map((e) => e.donnees.equipe.classe || ''))].sort();
    select.innerHTML = '<option value="">toutes</option>' + classes.map((c) => `<option${c === choisie ? ' selected' : ''}>${echapper(c)}</option>`).join('');
  }

  function cellule(c, id) {
    const statut = c.statut;
    const infos = [A.MOTS_STATUT[statut], pluriel(c.tentatives, 'tentative'), pluriel(c.indices, 'indice'), A.dureeLisible(c.temps)];
    if (c.bloque) infos.push('bloqué');
    const texte = statut === 'non_commence' && !c.tentatives ? A.SYMBOLES.non_commence : `${A.SYMBOLES[statut]} ${c.tentatives}`;
    return (
      `<td class="cellule statut-${statut}${c.bloque ? ' bloque' : ''}" title="Exercice ${id} : ${echapper(infos.join(', '))}">` +
      `${texte}${c.bloque ? ' <span class="alerte" aria-label="bloqué">⚠</span>' : ''}</td>`
    );
  }

  // Chiffres clés de la classe affichée.
  function dessinerResume(liste) {
    const n = liste.length;
    const moyenne = (f) => (n ? liste.reduce((s, x) => s + f(x.r), 0) / n : 0);
    const finies = liste.filter((x) => x.r.avancement >= nObligatoires()).length;
    const bloquees = liste.filter((x) => x.r.bloque).length;
    const chiffre = (valeur, etiquette, classe) => `<div class="pc-chiffre${classe ? ' ' + classe : ''}"><b>${valeur}</b><span>${etiquette}</span></div>`;
    $('.pc-resume').innerHTML =
      chiffre(n, n > 1 ? 'équipes' : 'équipe') +
      chiffre(`${A.nombreFr(moyenne((r) => r.note.note))}<small>/${bareme.sur}</small>`, 'note moyenne') +
      chiffre(`${A.nombreFr(moyenne((r) => r.avancement))}<small>/${nObligatoires()}</small>`, 'exercices réussis (moyenne)') +
      chiffre(`${A.nombreFr(moyenne((r) => (r.carnetTotal ? r.carnet / r.carnetTotal : 0) * 100))}<small> %</small>`, 'du carnet fait (moyenne)') +
      chiffre(finies, `programme final réussi (exercice ${finalDe()})`) +
      chiffre(bloquees, bloquees > 1 ? 'équipes bloquées' : 'équipe bloquée', bloquees ? 'pc-alerte' : '');
  }

  function dessiner() {
    if (!fusion.equipes.length) return;
    majClasses();
    const liste = selection();
    const s = seuils();
    dessinerResume(liste);
    $('.titre-classe').textContent = $('.filtre-classe').value ? 'classe ' + $('.filtre-classe').value : 'toutes les classes';
    let h = '<thead><tr><th scope="col" class="col-equipe">Équipe</th>';
    for (const id of ORDRE) h += `<th scope="col" title="${echapper(titre(id))}">${id}</th>`;
    h += `<th scope="col">Avancement</th><th scope="col" title="Parties du carnet de projet terminées">Carnet</th><th scope="col" title="Exercices réussis du premier coup et sans indice">★ 1er coup</th><th scope="col">Note /${bareme.sur}</th><th scope="col">Dernière<br>activité</th></tr></thead><tbody>`;
    if (!liste.length) h += `<tr><td colspan="${ORDRE.length + 6}" class="prof-vide">Aucune équipe ne correspond aux filtres.</td></tr>`;
    for (const x of liste) {
      const r = x.r;
      h +=
        `<tr class="ligne-equipe${r.bloque ? ' equipe-bloquee' : ''}" data-cle="${echapper(x.eq.cle)}" tabindex="0">` +
        `<th scope="row" class="col-equipe"><span class="nom-equipe">${echapper(r.eleves.join(', '))}</span>` +
        `<span class="classe-equipe">${echapper(r.classe)}${r.bloque ? ' · <strong>⚠ bloquée</strong>' : ''}` +
        `${misesAJour.has(x.eq.cle) ? ' · <span class="badge-maj">● vient d’avancer</span>' : ''}</span></th>` +
        ORDRE.map((id) => cellule(r.cellules[id], id)).join('') +
        `<td class="nombre">${r.avancement}/${nObligatoires()}</td><td class="nombre">${r.carnet}/${r.carnetTotal}</td><td class="nombre">${r.premierCoup ? '★ ' + r.premierCoup : '0'}</td><td class="nombre note">${A.nombreFr(r.note.note, 2)}</td>` +
        `<td title="${echapper(A.dateCourte(r.derniereActivite))}">${echapper(A.dateCourte(r.derniereActivite).replace(/\/\d{4}/, ''))}</td></tr>`;
    }
    const taux = A.tauxReussite(liste.map((x) => x.r));
    h += '</tbody><tfoot><tr><th scope="row" class="col-equipe">Taux de réussite</th>';
    for (const id of ORDRE) h += `<td class="nombre">${liste.length ? Math.round(taux[id] * 100) + ' %' : ''}</td>`;
    const notes = liste.map((x) => x.r.note.note);
    const moyenne = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;
    h += `<td></td><td></td><td></td><td class="nombre note" title="Moyenne des équipes affichées">moy. ${A.nombreFr(moyenne)}</td><td></td></tr></tfoot>`;
    $('.prof-tableau').innerHTML = h;
    $('.prof-legende').innerHTML =
      '<span><strong>✓</strong> réussi</span><span><strong>●</strong> en cours</span><span><strong>○</strong> non commencé</span>' +
      '<span>le nombre = tentatives (clics sur « Vérifier »)</span><span><strong>★</strong> réussi du premier coup sans indice</span>' +
      `<span><strong>⚠</strong> bloqué : au moins ${s.tentatives} tentatives ou plus de ${s.minutes} min sur un exercice non réussi</span>`;
  }

  for (const sel of ['.filtre-classe', '.tri', '.filtre-bloquees']) $(sel).addEventListener('change', dessiner);
  for (const sel of ['.seuil-tentatives', '.seuil-minutes']) {
    $(sel).addEventListener('input', () => {
      alertesConnues = null; // nouveaux seuils : on repart de l'état actuel, sans « nouvelles » alertes
      nouvelles.clear();
      dessiner();
      verifierAlertes();
      if (vue.nom === 'equipe') dessinerEquipe(true);
    });
  }
  $('.prof-tableau').addEventListener('click', (e) => {
    const l = e.target.closest('.ligne-equipe');
    if (l) ouvrirEquipe(l.dataset.cle);
  });
  $('.prof-tableau').addEventListener('keydown', (e) => {
    const l = e.target.closest('.ligne-equipe');
    if (l && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      ouvrirEquipe(l.dataset.cle);
    }
  });

  // ---------- Vue Équipe ----------

  const heure = (iso) => (iso ? A.dateCourte(iso) : '');

  // « 1,2 / 1,6 » et la raison des retenues.
  function pointsHtml(note, id) {
    const x = note.detail.find((y) => y.id === id);
    if (!x) return A.exercicesDefis().includes(id) ? (note.bonus ? `<strong>défi : bonus +${A.nombreFr(note.bonus)}</strong>` : '<span class="points-raison">défi : bonus si réussi</span>') : '';
    return (
      `<strong class="nombre">${A.nombreFr(x.pointsNote, 2)} / ${A.nombreFr(x.pointsNoteMax, 2)}</strong>` +
      `<span class="points-raison">${x.raisons.map(echapper).join(' · ')}</span>`
    );
  }

  // ---------- Théâtre : carnet de l'équipe, validations ◆, livrables D1 à D7, STL ----------
  // Le carnet du Théâtre garde son propre affichage (le même que celui des élèves, en lecture) ; à la fin de chaque
  // étape, un panneau « À noter ici » donne les validations ◆ et le niveau des livrables qui s'y corrigent.

  const MOTS_NIVEAUX = ['Non atteint', 'Partiellement atteint', 'Atteint', 'Dépassé'];
  const livrables = () => A.partiesSuivies(A.carnet, null);
  const livrable = (id) => A.partieCarnet(A.carnet, id);
  const projets = new WeakMap(); // données d'une équipe → projet du Théâtre (lu une fois)
  function projetDe(d) {
    if (!projets.has(d)) projets.set(d, d.theatre ? TP.projetDe(d.theatre) : null);
    return projets.get(d);
  }
  const validationsDe = (eq) => validationsDossiers.get(dossierDe(eq.fichier)) || {};
  const dateHeure = (ms) => new Date(ms).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const imageSure = (src) => (typeof src === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src) ? src : '');

  // Fichiers STL du dossier de l'équipe : lus en tâche de fond, analysés une fois par version du fichier.
  const stlAnalyses = new Map(); // « fichier de l'équipe|nom.stl » → { date, fichier }
  const stlsEquipes = new Map(); // clé d'équipe → [File avec .analyse]
  async function chargerStl(eq) {
    const dossier = dossiersEquipes.get(eq.fichier);
    const liste = [];
    if (!dossier) return liste;
    for await (const e of dossier.values()) {
      if (e.kind !== 'file' || !/\.stl$/i.test(e.name)) continue;
      try {
        const f = await e.getFile();
        const cle = eq.fichier + '|' + e.name;
        const connu = stlAnalyses.get(cle);
        if (connu && connu.date === f.lastModified) liste.push(connu.fichier);
        else {
          f.analyse = TP.analyserStl(await f.arrayBuffer());
          stlAnalyses.set(cle, { date: f.lastModified, fichier: f });
          liste.push(f);
        }
      } catch {
        /* fichier en cours d'écriture : relu au prochain passage */
      }
    }
    return liste.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }
  function stlDe(eq) {
    if (!stlsEquipes.has(eq.cle)) {
      stlsEquipes.set(eq.cle, []);
      chargerStl(eq).then((liste) => {
        stlsEquipes.set(eq.cle, liste);
        if (liste.length && vue.nom === 'equipe' && vue.equipe === eq.cle) dessinerEquipe(true);
      });
    }
    return stlsEquipes.get(eq.cle);
  }
  // Ce que l'outil constate pour chaque livrable (photos, STL conformes, personnages reconnus…).
  const indicesDe = (eq) => TP.indices({ projet: projetDe(eq.donnees), stls: stlDe(eq), images: [] }, validationsDe(eq));

  function validationHtml(eq, v) {
    const ok = validationsDe(eq)[v.id];
    return `<div class="pt-valide" data-ok="${!!ok}"><span class="pt-losange" aria-hidden="true">◆</span>` +
      `<span class="pt-valide-texte"><strong>${echapper(v.t)}</strong><small>${ok ? 'validé le ' + echapper(dateHeure(ok.date)) : 'pas encore validé'}</small></span>` +
      `<button type="button" class="${ok ? 'btn-lien' : 'btn-secondaire'}" data-valider="${v.id}">${ok ? 'Annuler' : 'Valider'}</button></div>`;
  }

  function livrableHtml(d, p, note, ind) {
    const n = A.notesProf.pour(d)[p.id];
    const coef = bareme.carnet[p.id] || 0;
    const x = note.detail.find((y) => y.id === 'carnet:' + p.id);
    return `<div class="pt-livrable"><div class="pt-livrable-titre"><strong>${echapper(p.titre)}</strong><small>${echapper(p.competence || '')}</small></div>` +
      `<label class="note-maitrise">Niveau ${coef ? `(coefficient ${A.nombreFr(coef)})` : '(ne compte pas dans la note)'} <select data-note-manuelle="${echapper(p.id)}"><option value="">À évaluer</option>` +
      MOTS_NIVEAUX.map((mot, i) => `<option value="${i + 1}"${n === i + 1 ? ' selected' : ''}>${mot} · ${i + 1}/4</option>`).join('') + '</select></label>' +
      (x && !x.attenteEvaluation ? `<span class="pe-points">${pointsHtml(note, 'carnet:' + p.id)}</span>` : '') +
      (ind && (ind[p.id] || []).length
        ? '<ul class="pt-indices">' + ind[p.id].map((i) => `<li data-ok="${i.ok}"><span aria-hidden="true">${i.ok === true ? '✓' : i.ok === false ? '✗' : '·'}</span> ${echapper(i.t)}</li>`).join('') + '</ul>'
        : '') +
      '</div>';
  }

  // Panneau « À noter ici » : validations ◆ et livrables d'une partie du travail.
  function panneauHtml(eq, note, titre, idsValidations, idsLivrables) {
    const d = eq.donnees;
    const ind = indicesDe(eq);
    return `<aside class="pt-panneau"><h4>${A.icone('coche', { epaisseur: 2.4 })}À noter ici · ${echapper(titre)}</h4>` +
      idsValidations.map((id) => validationHtml(eq, TP.VALIDATIONS.find((v) => v.id === id))).join('') +
      idsLivrables.map((id) => livrableHtml(d, livrable(id), note, ind)).join('') + '</aside>';
  }

  // Onglet « Carnet de projet » : le carnet de l'équipe (lecture seule) et un panneau à la fin de chaque étape.
  function carnetHtml(d) {
    const av = A.avancementCarnet(d.carnet);
    return `<section class="pe-carte"><h3>Carnet de projet · ${av.fait}/${av.total} réponses</h3>` +
      '<p class="pe-aide">Le carnet tel que l’équipe le voit. À la fin de chaque étape : les validations ◆ (écrites dans le dossier de l’équipe, ' +
      'les élèves les voient dans leur carnet) et le niveau des livrables D1 à D7 qui s’y corrigent.</p>' +
      '<div class="pt-carnet pe-carnet-theatre"></div></section>';
  }
  function monterCarnet(box, eq, note) {
    const racine = box.querySelector('.pt-carnet');
    if (!racine) return;
    const projet = projetDe(eq.donnees);
    if (!projet) {
      racine.innerHTML = '<p class="pe-vide">Ce fichier n’a pas de carnet lisible.</p>';
      return;
    }
    TP.afficherCarnet(racine, { projet, validations: validationsDe(eq) });
    for (const e of TP.ETAPES) {
      const section = racine.querySelector('#cn-etape-' + e.n);
      if (!section) continue;
      const vals = TP.VALIDATIONS.filter((v) => v.etape === e.n).map((v) => v.id);
      const livs = livrables().filter((p) => p.etape === e.n).map((p) => p.id);
      if (vals.length || livs.length) section.insertAdjacentHTML('beforeend', panneauHtml(eq, note, 'étape ' + e.n, vals, livs));
    }
  }

  // Programmation : les personnages appris par l'IA (étiquettes et photos de la caméra de Labo Blocs).
  function iaHtml(eq) {
    const p = projetDe(eq.donnees);
    if (!p) return '';
    const cam = p.programmation && p.programmation.camera;
    const personnages = cam
      ? ['Rien', ...(cam.etiquettes || [])].map((nom) => ({ nom: nom === 'Rien' ? 'Fond vide (« Rien »)' : nom, exemples: ((cam.exemples || {})[nom] || []).map((x) => x && x.v) }))
      : p.categories.map((c) => ({ nom: c.background ? 'Fond vide' : c.name, exemples: c.examples.map((x) => x.thumb) }));
    return '<section class="pe-carte"><h3>Personnages appris par l’IA</h3>' +
      (personnages.length
        ? personnages.map((x) => `<div class="pt-perso"><strong>${echapper(x.nom)}</strong> <small>${pluriel(x.exemples.length, 'photo')}</small>` +
          `<div class="pt-vignettes">${x.exemples.map(imageSure).filter(Boolean).slice(0, 12).map((src) => `<img src="${src}" alt="">`).join('')}</div></div>`).join('')
        : '<p class="pe-vide">Aucun personnage pour l’instant.</p>') +
      '</section>';
  }

  // Croquis et dessins : photos du carnet, personnages 3D (STL), panneau D1 · D2 · D3.
  function dessinsTheatreHtml(eq, note) {
    const p = projetDe(eq.donnees);
    const photos = Object.entries((p && p.carnet.photos) || {});
    const NOMS = { dessins: 'Dessins (carnet)', cablage: 'Câblage (carnet)' };
    const stls = stlDe(eq);
    const stlHtml = stls.length
      ? '<div class="pt-stls">' + stls.map((f, i) => {
          const k = f.analyse ? TP.controlerStl(f.analyse.dims) : null;
          const ligne = (ok, texte) => `<li data-ok="${ok}"><span aria-hidden="true">${ok ? '✓' : '✗'}</span> ${texte}</li>`;
          return `<article class="pt-stl"><h4>${echapper(f.name)}</h4><div class="pt-stl-vue" data-stl="${i}">${f.analyse ? '' : '<p class="pe-vide">Fichier STL illisible.</p>'}</div>` +
            (k ? '<ul class="pt-indices">' + ligne(k.tailleOk, `Taille : ${A.nombreFr(k.hauteur)} × ${A.nombreFr(k.largeur)} mm (100 × 100 mm maximum)`) +
              ligne(k.epaisseurOk, `Épaisseur : ${A.nombreFr(k.epaisseur)} mm (2 mm attendus)`) + '</ul>' : '') + '</article>';
        }).join('') + '</div><p class="pe-aide">Faites tourner avec la souris, zoomez avec la molette.</p>'
      : `<p class="pe-vide">${dossiersEquipes.get(eq.fichier) ? 'Aucun fichier .stl dans le dossier de l’équipe (étape 2 du carnet).' : 'Ouvrez le dossier de la classe depuis l’accueil pour voir les fichiers .stl de l’équipe.'}</p>`;
    return '<section class="pe-carte"><h3>Photos du carnet</h3>' +
      (photos.length
        ? photos.map(([id, liste]) => `<h4>${echapper(NOMS[id] || id)}</h4><div class="pt-photos">${liste.map((x) => imageSure(x.data)).filter(Boolean).map((src) => `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt=""></a>`).join('')}</div>`).join('')
        : '<p class="pe-vide">Aucune photo dans le carnet.</p>') +
      '</section><section class="pe-carte"><h3>Personnages 3D</h3>' + stlHtml + '</section>' +
      panneauHtml(eq, note, 'dessins, modélisation et câblage', ['v1', 'v2', 'v3a'], ['D1', 'D2', 'D3']);
  }
  const vuesStl = []; // fonctions qui libèrent les vues 3D (WebGL) affichées
  function libererStl() {
    for (const f of vuesStl.splice(0)) {
      try { f(); } catch { /* déjà libérée */ }
    }
  }
  async function monterStl(box, eq) {
    const stls = stlDe(eq);
    for (const el of box.querySelectorAll('[data-stl]')) {
      const f = stls[Number(el.dataset.stl)];
      if (!f || !f.analyse) continue;
      try {
        vuesStl.push(await TP.vueStl(el, await f.arrayBuffer()));
      } catch {
        el.innerHTML = '<p class="pe-vide">La vue 3D n’a pas pu être affichée (WebGL indisponible ?).</p>';
      }
    }
  }

  // Validation ◆ : écrite dans validations.json, dans le dossier de l'équipe (droit d'écriture demandé au premier clic).
  async function basculerValidation(eq, id) {
    const dossier = dossiersEquipes.get(eq.fichier);
    if (!dossier || !suivi.dossier) {
      alert('Pour valider, ouvrez le dossier de la classe depuis l’accueil (Chrome ou Edge) : la validation est écrite dans le dossier de l’équipe.');
      return;
    }
    try {
      if ((await suivi.dossier.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await suivi.dossier.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
    } catch {
      return;
    }
    const v = Object.assign({}, validationsDe(eq));
    if (v[id]) delete v[id];
    else v[id] = { date: Date.now() };
    try {
      const h = await dossier.getFileHandle(TP.VALIDATIONS_FILE, { create: true });
      const w = await h.createWritable();
      await w.write(JSON.stringify(TP.fichierValidations(v), null, 2));
      await w.close();
    } catch {
      alert('La validation n’a pas pu être écrite dans le dossier de l’équipe (réseau ?). Réessayez.');
      return;
    }
    validationsDossiers.set(dossierDe(eq.fichier), v);
    dessinerEquipe(true);
  }

  // Note d'un élève : note de l'équipe + son bonus / malus, entre 0 et la note maximale.
  function noteEleve(d, note, eleve) {
    const bonus = A.notesProf.bonus(d, eleve);
    const pas = bareme.arrondi;
    const brute = Math.max(0, Math.min(note.sur, note.note + bonus));
    return { bonus, motif: A.notesProf.motif(d, eleve), finale: pas > 0 ? Math.round(brute / pas) * pas : Math.round(brute * 100) / 100 };
  }
  // Mentions de la grille du professeur (sur 20).
  function mention(n, sur) {
    const x = (n * 20) / sur;
    return x < 10 ? 'À approfondir' : x < 13 ? 'Satisfaisant' : x < 17 ? 'Bien' : 'Très bien';
  }

  // Bilan : validations ◆, grille D1 à D7, élèves (bonus / malus), commentaire.
  function theatreBilanHtml(eq, d, note) {
    const eleves = d.equipe.eleves.map((el) => {
      const n = noteEleve(d, note, el);
      return `<tr><th scope="row">${echapper(el)}</th>` +
        `<td><div class="pt-bonus"><button type="button" class="btn-lien" data-bonus="${echapper(el)}" data-pas="-0.5" aria-label="Retirer un demi-point à ${echapper(el)}">−</button>` +
        `<input type="text" inputmode="decimal" value="${n.bonus ? String(n.bonus).replace('.', ',') : ''}" placeholder="0" data-bonus-valeur="${echapper(el)}" aria-label="Bonus ou malus de ${echapper(el)}">` +
        `<button type="button" class="btn-lien" data-bonus="${echapper(el)}" data-pas="0.5" aria-label="Ajouter un demi-point à ${echapper(el)}">+</button></div></td>` +
        `<td><input type="text" maxlength="200" value="${echapper(n.motif)}" placeholder="Motif (comportement, investissement…)" data-motif="${echapper(el)}" aria-label="Motif pour ${echapper(el)}"></td>` +
        `<td class="nombre note">${A.nombreFr(n.finale, 2)}</td><td>${mention(n.finale, note.sur)}</td></tr>`;
    }).join('');
    return '<section class="pe-carte"><h3>Validations ◆ du carnet</h3>' + TP.VALIDATIONS.map((v) => validationHtml(eq, v)).join('') +
      '<p class="pe-aide">Écrites dans le dossier de l’équipe (validations.json) : les élèves les voient dans leur carnet.</p></section>' +
      '<section class="pe-carte"><h3>Grille D1 à D7</h3>' + livrables().map((p) => livrableHtml(d, p, note, null)).join('') +
      '<p class="pe-aide">Les indices de chaque livrable sont dans l’onglet où il se corrige (Carnet de projet, Programmation, Croquis et dessins).</p></section>' +
      `<section class="pe-carte pt-large"><h3>Élèves · bonus / malus</h3><table class="detail-tableau pt-eleves"><thead><tr><th>Élève</th><th>Bonus / malus</th><th>Motif</th><th>Note /${note.sur}</th><th>Mention</th></tr></thead><tbody>${eleves}</tbody></table>` +
      '<p class="pe-aide">Note de l’élève = note de l’équipe + bonus ou malus (par demi-points), entre 0 et la note maximale.</p>' +
      `<label class="pt-commentaire">Commentaire <textarea rows="3" maxlength="2000" data-commentaire>${echapper(A.notesProf.commentaire(d))}</textarea></label></section>`;
  }

  // Onglet « Programmation » : un exercice par ligne.
  function programmationHtml(d, r, note, eq) {
    let h = '<section class="pe-carte"><h3>Exercices de programmation</h3>' +
      '<table class="detail-tableau"><thead><tr><th>Exercice</th><th>Statut</th><th>Tentatives</th><th>Échecs</th><th>Indices</th>' +
      '<th>Temps</th><th>Première réussite</th><th>Points</th><th></th></tr></thead><tbody>';
    for (const id of ORDRE) {
      const c = r.cellules[id];
      const e = d.exercices[id];
      h +=
        `<tr class="${c.bloque ? 'bloque' : ''}"><th scope="row">${id} · ${echapper(titre(id))}</th>` +
        `<td class="statut-${c.statut}">${A.SYMBOLES[c.statut]} ${A.MOTS_STATUT[c.statut]}${c.bloque ? ' ⚠' : ''}</td>` +
        `<td class="nombre">${c.tentatives}</td><td class="nombre">${c.echecs}</td><td class="nombre">${c.indices}/3</td>` +
        `<td class="nombre">${c.temps ? A.dureeLisible(c.temps) : ''}</td><td>${echapper(heure(c.premiereReussite))}</td>` +
        `<td>${pointsHtml(note, id)}</td>` +
        `<td>${e && e.programme ? `<button type="button" class="btn-lien" data-voir="${id}">Voir les blocs</button>` : ''}</td></tr>`;
    }
    return h + '</tbody></table><p class="pe-aide">« Voir les blocs » montre le dernier programme de l’équipe pour cet exercice.</p></section>' +
      iaHtml(eq) + panneauHtml(eq, note, 'programme et IA', ['v3b'], ['D4']);
  }

  // Onglet « Historique » : chaque vérification (écarts, programme du moment) et chaque indice.
  function historiqueHtml(d) {
    let h = '<section class="pe-carte"><h3>Historique de programmation</h3>';
    let vide = true;
    for (const id of ORDRE) {
      const e = d.exercices[id];
      if (!e || !e.historique || !e.historique.length) continue;
      vide = false;
      h += `<details class="historique" data-ex="${id}"><summary>Exercice ${id} · ${echapper(titre(id))} — ${pluriel(e.historique.length, 'événement')}</summary><ol>`;
      e.historique.forEach((ev, k) => {
        if (ev.type === 'indice') {
          h += `<li class="ev-indice"><span class="ev-heure">${echapper(heure(ev.date))}</span> Indice ${ev.niveau} ouvert</li>`;
          return;
        }
        // Événements de Labo Blocs : reprise d'une sauvegarde de l'ancien atelier, exercice modifié par le professeur.
        if (ev.type === 'migration') {
          h += `<li class="ev-indice"><span class="ev-heure">${echapper(heure(ev.date))}</span> Travail repris de l’ancienne version de l’atelier</li>`;
          return;
        }
        if (ev.type === 'modifie') {
          h += `<li class="ev-indice"><span class="ev-heure">${echapper(heure(ev.date))}</span> Exercice modifié par la mise à jour ${echapper(ev.versionParcours || '')} : à revérifier</li>`;
          return;
        }
        if (ev.type !== 'verification') return;
        h +=
          `<li class="${ev.reussi ? 'ev-reussi' : 'ev-ecart'}"><span class="ev-heure">${echapper(heure(ev.date))}</span> ` +
          (ev.reussi ? '<strong>✓ Vérification réussie</strong>' : '<strong>Vérification : écart</strong>');
        if (!ev.reussi) {
          const ecarts = ev.ecarts && ev.ecarts.length ? ev.ecarts : [ev.message];
          h += '<ul class="ev-ecarts">' + ecarts.map((m) => `<li>${echapper(m)}</li>`).join('') + '</ul>';
          if (ev.notes) h += '<ul class="ev-notes">' + ev.notes.map((n) => `<li>${echapper(n)}</li>`).join('') + '</ul>';
        }
        if (ev.programme) {
          h +=
            `<div class="ev-actions"><button type="button" class="btn-lien" data-blocs="${id}|${k}">Voir les blocs</button></div><div class="ev-blocs" hidden></div>`;
        }
        h += '</li>';
      });
      h += '</ol></details>';
    }
    if (vide) h += '<p class="pe-vide">Aucune vérification ni aucun indice pour l’instant.</p>';
    return h + '</section>';
  }

  // Niveaux par compétence (Labo Blocs), ceux du fichier pour le Carnet de classe.
  function competencesHtml(eq) {
    const lb = equipesLaboBlocs([{ eq }])[0];
    if (!lb) return '';
    const ev = LB.evaluerEquipe(lb.donnees, lb.paquet);
    return (
      '<section class="pe-carte"><h3>Compétences (Labo Blocs)</h3><div class="pe-infos">' +
      ev.competences.map((k) => `<div class="pe-info"><span>${k.code} · ${echapper(k.libelle)}</span><strong>${k.niveau ? `${k.niveau} · ${LB.nomNiveau(k.niveau)}` : '—'}</strong></div>`).join('') +
      `<div class="pe-info"><span>Note par compétences</span><strong>${ev.note === null ? '—' : A.nombreFr(ev.note, 2) + ' / 20'}</strong></div>` +
      '</div><p class="pe-aide">Ce que reçoit le Carnet de classe (bouton « Carnet de classe » en haut).</p></section>'
    );
  }

  // Onglet « Bilan » : la note et ce qui la compose, l'avancement, la maquette.
  function bilanHtml(eq, d, r, note) {
    const parties = note.detail.filter((x) => !x.id.startsWith('carnet:'));
    const carnet = note.detail.filter((x) => x.id.startsWith('carnet:'));
    const somme = (l, cle) => l.reduce((s, x) => s + x[cle], 0);
    const enCours = ORDRE.find((id) => r.cellules[id].statut === 'en_cours');
    const bloques = ORDRE.filter((id) => r.cellules[id].bloque);
    const ligne = (etiquette, valeur) => `<div class="pe-info"><span>${etiquette}</span><strong>${valeur}</strong></div>`;
    return (
      '<div class="pe-bilan">' +
      '<section class="pe-carte pe-note-carte">' +
      `<div class="pe-note-grande"><span>Note de l’équipe</span><b>${A.nombreFr(note.note, 2)}<small>/${note.sur}</small></b></div>` +
      '<div class="pe-infos">' +
      ligne('Programmation', `${A.nombreFr(somme(parties, 'pointsNote'), 2)} / ${A.nombreFr(somme(parties, 'pointsNoteMax'), 2)} pts`) +
      ligne('Grille D1 à D7', `${A.nombreFr(somme(carnet, 'pointsNote'), 2)} / ${A.nombreFr(somme(carnet, 'pointsNoteMax'), 2)} pts`) +
      ligne('Bonus des défis', note.bonus ? '+' + A.nombreFr(note.bonus) : '—') +
      '</div>' +
      `<p class="pe-aide">Calculée sur les ${bareme.objectif} premiers exercices notés et les livrables D1 à D7 déjà évalués (un livrable « À évaluer » reste hors du total). ` +
      'Le détail des points est dans les onglets « Programmation » et « Carnet de projet ».</p></section>' +
      '<section class="pe-carte"><h3>Avancement</h3><div class="pe-infos">' +
      ligne('Exercices réussis', `${r.avancement}/${nObligatoires()}`) +
      ligne('Du premier coup sans indice', `★ ${r.premierCoup}`) +
      ligne('Carnet de projet', `${avancementCarnet(d).fait}/${avancementCarnet(d).total} réponses`) +
      ligne('En cours', enCours ? `exercice ${enCours} · ${echapper(titre(enCours))}` : '—') +
      ligne('Temps de travail', A.dureeLisible(r.tempsTotal)) +
      ligne('Dernière activité', echapper(heure(r.derniereActivite)) || '—') +
      '</div>' +
      (bloques.length ? `<p class="pe-bloque">${A.icone('alerte', { epaisseur: 2.4 })}Bloquée sur l’exercice ${bloques.map((id) => `${id} · ${echapper(titre(id))}`).join(', ')}</p>` : '') +
      '</section>' +
      theatreBilanHtml(eq, d, note) +
      competencesHtml(eq) +
      `<p class="pe-fichier">Fichier : ${echapper(eq.fichier)}</p>` +
      '</div>'
    );
  }

  function listeAffichee() {
    return selection().map((x) => x.eq.cle);
  }

  function ouvrirEquipe(cle) {
    vue.equipe = cle;
    if (vue.nom !== 'equipe') {
      vue.onglet = 'bilan';
      montrerVue('equipe');
    }
    dessinerEquipe(false);
  }

  function dessinerEquipe(miseAJour) {
    const eq = fusion.equipes.find((x) => x.cle === vue.equipe);
    if (!eq) return montrerVue('classe');
    const d = eq.donnees;
    const r = resume(eq);
    const note = r.note;
    // Pendant une mise à jour en direct : garder les historiques ouverts et la position de lecture.
    const ouverts = miseAJour ? new Set($$('.historique[open]').map((x) => x.dataset.ex)) : null;
    const reponses = miseAJour ? new Set($$('.voir-reponses[open]').map((x) => x.closest('.pe-partie').querySelector('h4').textContent)) : null;
    const defilement = miseAJour ? global.scrollY : 0;

    $('.pe-noms').textContent = d.equipe.eleves.join(', ');
    $('.pe-sous-titre').innerHTML = [d.equipe.classe ? 'Classe ' + echapper(d.equipe.classe) : '', `${r.avancement}/${nObligatoires()} exercices`,
      r.bloque ? '<strong class="pe-sous-bloque">⚠ bloquée</strong>' : '', misesAJour.has(eq.cle) ? '<span class="badge-maj">● vient d’avancer</span>' : '']
      .filter(Boolean).join(' · ');
    $('.pe-note-badge').innerHTML = `<b>${A.nombreFr(note.note, 2)}</b><small>/${note.sur}</small>`;
    const liste = listeAffichee();
    const i = liste.indexOf(eq.cle);
    $('.pe-pos').textContent = i >= 0 ? `${i + 1} / ${liste.length}` : '';
    $('.btn-equipe-prec').disabled = i <= 0;
    $('.btn-equipe-suiv').disabled = i < 0 || i >= liste.length - 1;
    for (const b of $$('.pe-onglets [data-onglet]')) b.setAttribute('aria-selected', String(b.dataset.onglet === vue.onglet));

    const box = $('.pe-contenu');
    if (vue.onglet === 'dessins') {
      // Mise à jour en direct : on ne touche pas à la caméra ni à la photo en cours.
      if (!(miseAJour && A.dessins.actif())) {
        libererStl();
        // Théâtre : photos du professeur (modèle commun), puis photos du carnet, personnages 3D et panneau D1 · D2 · D3.
        box.innerHTML = '<div class="pt-photos-prof"></div>' + dessinsTheatreHtml(eq, note);
        A.dessins.monter(box.querySelector('.pt-photos-prof'), contexteDessins(eq));
        monterStl(box, eq);
        if (miseAJour) scrollTo(0, defilement);
      }
      return;
    }
    A.dessins.arreter();
    libererStl();
    if (vue.onglet === 'programmation') box.innerHTML = programmationHtml(d, r, note, eq);
    else if (vue.onglet === 'carnet') {
      box.innerHTML = carnetHtml(d, note);
      monterCarnet(box, eq, note);
    } else if (vue.onglet === 'historique') box.innerHTML = historiqueHtml(d);
    else box.innerHTML = bilanHtml(eq, d, r, note);

    box.onclick = (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.voir) {
        // Dernier programme de l'exercice, sous sa ligne.
        const ligne = b.closest('tr');
        const suivante = ligne.nextElementSibling;
        if (suivante && suivante.classList.contains('pt-blocs-ligne')) {
          suivante.remove();
          b.textContent = 'Voir les blocs';
        } else {
          ligne.insertAdjacentHTML('afterend', `<tr class="pt-blocs-ligne"><td colspan="9"><div class="labo-blocs">${global.LaboBlocs.blocsHtml(d.exercices[b.dataset.voir].programme, { avecVides: true })}</div></td></tr>`);
          b.textContent = 'Masquer les blocs';
        }
        return;
      }
      const [id, k] = (b.dataset.blocs || '').split('|');
      if (!id) return;
      const programme = d.exercices[id].historique[Number(k)].programme;
      const zoneBlocs = b.closest('li').querySelector('.ev-blocs');
      if (zoneBlocs.hidden) zoneBlocs.innerHTML = `<div class="labo-blocs">${global.LaboBlocs.blocsHtml(programme, { avecVides: true })}</div>`;
      zoneBlocs.hidden = !zoneBlocs.hidden;
      b.textContent = zoneBlocs.hidden ? 'Voir les blocs' : 'Masquer les blocs';
    };
    if (ouverts) for (const det of $$('.historique')) if (ouverts.has(det.dataset.ex)) det.open = true;
    if (reponses) for (const det of $$('.voir-reponses')) if (reponses.has(det.closest('.pe-partie').querySelector('h4').textContent)) det.open = true;
    if (miseAJour) scrollTo(0, defilement);
  }

  // Onglet « Croquis et dessins » : le dossier de l'équipe, et le droit d'y écrire (demandé au premier enregistrement).
  function contexteDessins(eq) {
    return {
      // Théâtre : préfixe des fichiers de l'équipe (dossier « LEA - TOM » → « LEA_TOM », comme LEA_TOM_theatre_ombre.json).
      equipe: dossiersEquipes.get(eq.fichier) ? dossiersEquipes.get(eq.fichier).name.replace(/\s*-\s*/g, '_') : A.nomEquipe(eq.donnees.equipe.eleves),
      dossier: (suivi.dossier && dossiersEquipes.get(eq.fichier)) || null,
      async autoriser() {
        const racine = suivi.dossier;
        if (!racine) return false;
        try {
          if ((await racine.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
          return (await racine.requestPermission({ mode: 'readwrite' })) === 'granted';
        } catch {
          return false;
        }
      },
    };
  }

  $('.vue-equipe').addEventListener('change', (e) => {
    const id = e.target.dataset.noteManuelle;
    if (!id) return;
    const eq = fusion.equipes.find(x => x.cle === vue.equipe);
    if (!eq) return;
    const ok = A.notesProf.noter(eq.donnees, id, e.target.value);
    $('.evaluations-stockage').textContent = ok ? 'Évaluations enregistrées sur ce navigateur. Pensez à exporter une sauvegarde.' : 'Stockage indisponible : exportez vos évaluations avant de fermer la page.';
    recalculer();
  });
  // Théâtre : validations ◆, bonus / malus et motif de chaque élève, commentaire de l'équipe.
  const equipeOuverte = () => fusion.equipes.find((x) => x.cle === vue.equipe);
  function apresEvaluation(ok) {
    $('.evaluations-stockage').textContent = ok ? 'Évaluations enregistrées sur ce navigateur. Pensez à exporter une sauvegarde.' : 'Stockage indisponible : exportez vos évaluations avant de fermer la page.';
  }
  $('.vue-equipe').addEventListener('click', (e) => {
    const eq = equipeOuverte();
    const b = e.target.closest('[data-valider], [data-bonus]');
    if (!eq || !b) return;
    if (b.dataset.valider) return basculerValidation(eq, b.dataset.valider);
    apresEvaluation(A.notesProf.regleBonus(eq.donnees, b.dataset.bonus, A.notesProf.bonus(eq.donnees, b.dataset.bonus) + Number(b.dataset.pas)));
    dessinerEquipe(true);
  });
  $('.vue-equipe').addEventListener('change', (e) => {
    const eq = equipeOuverte();
    const t = e.target;
    if (!eq) return;
    if (t.dataset.bonusValeur !== undefined) {
      const v = parseFloat(t.value.replace(',', '.'));
      apresEvaluation(A.notesProf.regleBonus(eq.donnees, t.dataset.bonusValeur, Number.isFinite(v) ? v : 0));
      dessinerEquipe(true);
    } else if (t.dataset.motif !== undefined) apresEvaluation(A.notesProf.regleMotif(eq.donnees, t.dataset.motif, t.value));
    else if (t.dataset.commentaire !== undefined) apresEvaluation(A.notesProf.regleCommentaire(eq.donnees, t.value));
  });
  $('.pe-onglets').addEventListener('click' , (e) => {
    const b = e.target.closest('[data-onglet]');
    if (!b) return;
    vue.onglet = b.dataset.onglet;
    dessinerEquipe(false);
  });
  $('.btn-retour-classe').addEventListener('click', () => {
    montrerVue('classe');
    dessiner();
  });
  function equipeVoisine(pas) {
    const liste = listeAffichee();
    const i = liste.indexOf(vue.equipe);
    if (i >= 0 && liste[i + pas]) {
      vue.equipe = liste[i + pas];
      dessinerEquipe(false);
      scrollTo(0, 0);
    }
  }
  $('.btn-equipe-prec').addEventListener('click', () => equipeVoisine(-1));
  $('.btn-equipe-suiv').addEventListener('click', () => equipeVoisine(1));
  document.addEventListener('keydown', (e) => {
    if (vue.nom !== 'equipe' || $('.dialogue-reglages').open || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'Escape') $('.btn-retour-classe').click();
  });

  // ---------- Exports ----------

  function nomExport(extension) {
    const classe = $('.filtre-classe').value || 'toutes-classes';
    const jour = new Date().toISOString().slice(0, 10);
    return `${A.projet.id}-${classe}-${jour}.${extension}`;
  }
  function telecharger(contenu, type, nom) {
    const url = URL.createObjectURL(new Blob([contenu], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  $('.btn-csv').addEventListener('click', () => {
    const liste = selection();
    const t = A.tableauClasse(liste.map((x) => x.r), seuils());
    telecharger(A.enCsv(t.entete, [...t.lignes, [], t.legende]), 'text/csv;charset=utf-8', nomExport('csv'));
  });
  // Niveaux par compétence (calculés par Labo Blocs) pour le Carnet de classe : fichier « …labo-resultats.json »,
  // importé dans le Carnet (projet › Notes › « Importer des résultats Labo Blocs »).
  function equipesLaboBlocs(liste) {
    const paquet = A.catalogue.paquet();
    return liste.map((x) => LB.chargerEquipes([{ nom: x.eq.fichier || x.eq.cle + '.json', texte: JSON.stringify(x.eq.donnees) }], [paquet]).equipes[0]).filter(Boolean);
  }
  $('.btn-carnet').addEventListener('click', () => {
    const equipes = equipesLaboBlocs(selection());
    if (!equipes.length) return;
    const r = LB.resultatsClasse(equipes, LB.professeurVide(), { projet: { id: A.projet.projet, titre: A.projet.titre }, paquet: A.catalogue.paquet() });
    telecharger(JSON.stringify(r, null, 2) + '\n', 'application/json', nomExport('labo-resultats.json'));
  });
  $('.btn-xlsx').addEventListener('click', () => {
    const liste = selection();
    const t = A.tableauClasse(liste.map((x) => x.r), seuils());
    const det = A.detailClasse(liste.map((x) => x.eq), seuils(), bareme);
    const octets = A.classeurXlsx([
      { nom: 'Classe', entete: t.entete, lignes: [...t.lignes, [], t.legende] },
      { nom: 'Détail par exercice', entete: det.entete, lignes: det.lignes },
    ]);
    telecharger(octets, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nomExport('xlsx'));
  });
  // Théâtre : une ligne par élève pour Pronote (niveaux D1 à D7, note de l'équipe, bonus / malus, note de l'élève).
  $('.btn-pronote').addEventListener('click', () => {
    const L = livrables();
    const entete = ['Classe', 'Équipe', 'Élève', ...L.map((p) => p.titre), `Note équipe /${bareme.sur}`, 'Bonus / malus', 'Motif', `Note élève /${bareme.sur}`, 'Mention', 'Commentaire'];
    const lignes = [];
    for (const x of selection()) {
      const d = x.eq.donnees;
      const niveaux = A.notesProf.pour(d);
      for (const el of d.equipe.eleves) {
        const n = noteEleve(d, x.r.note, el);
        lignes.push([d.equipe.classe || '', d.equipe.eleves.join(', '), el, ...L.map((p) => (niveaux[p.id] ? MOTS_NIVEAUX[niveaux[p.id] - 1] : '')),
          A.nombreFr(x.r.note.note, 2), n.bonus ? (n.bonus > 0 ? '+' : '') + A.nombreFr(n.bonus) : '', n.motif, A.nombreFr(n.finale, 2), mention(n.finale, x.r.note.sur), A.notesProf.commentaire(d)]);
      }
    }
    telecharger(A.enCsv(entete, lignes), 'text/csv;charset=utf-8', nomExport('pronote.csv'));
  });
  $('.btn-imprimer').addEventListener('click', () => global.print());

  // ---------- Barème et réglages ----------

  const dialogueReglages = $('.dialogue-reglages');
  $('.btn-reglages').addEventListener('click', () => dialogueReglages.showModal());
  $('.btn-fermer-reglages').addEventListener('click', () => dialogueReglages.close());

  const zoneBareme = $('.prof-bareme');
  const partieCarnet = (id) => A.partieCarnet(A.carnet, id) || { titre: id };
  function dessinerChoixNotation() {
    const choix = (type, id, titre, coef, mode) => `<div class="choix-notation"><label><input type="checkbox" data-noter="${type}" data-id="${echapper(id)}"${coef > 0 ? ' checked' : ''}> Noter · ${echapper(titre)}</label><span>${mode}</span><label>Coefficient <input type="number" data-${type === 'carnet' ? 'coef-carnet' : 'coef'}="${echapper(id)}" value="${coef}" min="0" max="10" step="0.5"${coef > 0 ? '' : ' disabled'}></label></div>`;
    $('.bareme-coefs').innerHTML = '<h4>Programmation</h4>' + A.exercicesObligatoires().map(id => choix('exercice', id, 'Ex. ' + id + ' · ' + titre(id), bareme.coefficients[id], 'Automatique')).join('') +
      A.exercicesDefis().map(id => `<label class="choix-defi"><input type="checkbox" data-noter-defi="${id}"${!bareme.defis || bareme.defis[id] !== false ? ' checked' : ''}> Noter le défi ${id} en bonus</label>`).join('') +
      '<h4>Grille D1 à D7</h4>' + A.partiesSuivies(A.carnet, null).map(p => choix('carnet', p.id, p.titre + (p.niveaux ? ' (' + p.niveaux.join(', ') + 'e)' : ''), bareme.carnet[p.id] || 0, ['classement', 'trous'].includes(p.type) ? 'Automatique' : 'Maîtrise sur 4')).join('') +
      '<p>Les pages d’information à lire ne sont pas évaluées.</p>';
  }
  dessinerChoixNotation();
  function remplirBareme() {
    for (const el of zoneBareme.querySelectorAll('[data-b]')) {
      const v = bareme[el.dataset.b];
      el.value = el.hasAttribute('data-pourcent') ? Math.round(v * 100) : String(v);
    }
    for (const el of zoneBareme.querySelectorAll('[data-coef]')) el.value = bareme.coefficients[el.dataset.coef];
    for (const el of zoneBareme.querySelectorAll('[data-coef-carnet]')) el.value = bareme.carnet[el.dataset.coefCarnet];
    dessinerChoixNotation();
    resumerBareme();
  }
  // Théâtre : pas de partie du carnet corrigée automatiquement ; les livrables D1 à D7 sont évalués à la main.
  function expliquerCarnet() {
    const programmation = A.exercicesObligatoires().slice(0, bareme.objectif).reduce((t, id) => t + (bareme.coefficients[id] || 0), 0);
    const grille = Object.values(bareme.carnet).reduce((t, c) => t + (c > 0 ? c : 0), 0);
    const total = programmation + grille;
    $('.bareme-exemple-carnet').innerHTML = '<h4>Comment la note est-elle composée ?</h4>' +
      `<p>Programmation : ${A.nombreFr(programmation, 2)} coefficient(s) · grille D1 à D7 : ${A.nombreFr(grille, 2)} coefficient(s). ` +
      (total ? `Quand tout est évalué, un coefficient vaut ${A.nombreFr(bareme.sur / total, 2)} point(s) sur ${bareme.sur}. ` : '') +
      'Un livrable encore « À évaluer » reste hors du total : la note reste juste en cours de projet. ' +
      'Niveaux : Non atteint = 1/4 des points, Partiellement atteint = 2/4, Atteint = 3/4, Dépassé = 4/4.</p>';
  }
  function resumerBareme() {
    expliquerCarnet();
    $('.bareme-resume').textContent =
      `· sur ${bareme.sur}, ${bareme.objectif} exercices attendus, −${Math.round(bareme.penaliteIndice * 100)} % par indice, ` +
      `−${Math.round(bareme.penaliteEchec * 100)} % par essai raté${bareme.essaisGratuits ? ` au-delà de ${bareme.essaisGratuits}` : ''}, ` +
      `avance : ${Math.round(bareme.avance * 100)} %, ` +
      `commencé : ${Math.round(bareme.participation * 100)} %, bonus par défi : +${A.nombreFr(bareme.bonusDefi)}`;
  }
  function apresBareme() {
    const ok = A.notesProf.regler(bareme);
    $('.evaluations-stockage').textContent = ok ? 'Barème conservé sur ce navigateur. Exportez vos évaluations pour les sauvegarder.' : 'Stockage indisponible : exportez vos évaluations.';
    resumerBareme();
    dessiner();
    if (vue.nom === 'equipe') dessinerEquipe(true);
  }
  zoneBareme.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.noter) {
      const coefs = el.dataset.noter === 'carnet' ? bareme.carnet : bareme.coefficients;
      coefs[el.dataset.id] = el.checked ? (coefs[el.dataset.id] || 1) : 0;
      dessinerChoixNotation(); apresBareme(); return;
    }
    if (el.dataset.noterDefi) { bareme.defis = Object.assign({}, bareme.defis, { [el.dataset.noterDefi]: el.checked }); apresBareme(); return; }
    const v = Number(el.value);
    if (el.value === '' || !Number.isFinite(v) || v < 0 || (el.type === 'number' && !el.checkValidity())) return;
    if (el.dataset.coef) bareme.coefficients[el.dataset.coef] = v;
    else if (el.dataset.coefCarnet) bareme.carnet[el.dataset.coefCarnet] = v;
    else if (el.dataset.b) bareme[el.dataset.b] = el.hasAttribute('data-pourcent') ? v / 100 : v;
    if ((el.dataset.coef || el.dataset.coefCarnet) && v === 0) dessinerChoixNotation();
    apresBareme();
  });
  $('.btn-bareme-fichier').addEventListener('click', () => {
    bareme = A.completerBareme(A.bareme);
    for (const p of A.partiesSuivies(A.carnet, null)) if (!(p.id in bareme.carnet)) bareme.carnet[p.id] = 0;
    remplirBareme();
    apresBareme();
  });
  $('.btn-export-evaluations').addEventListener('click', () => {
    A.notesProf.regler(bareme);
    const url = URL.createObjectURL(new Blob([A.notesProf.texte()], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = A.projet.id + '-evaluations-prof.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  $('.import-evaluations').addEventListener('change', async e => {
    const fichier = e.target.files[0]; if (!fichier) return;
    try { const ok = A.notesProf.importer(await fichier.text()); bareme = A.completerBareme(A.notesProf.bareme()); for (const p of A.partiesSuivies(A.carnet, null)) if (!(p.id in bareme.carnet)) bareme.carnet[p.id] = 0; remplirBareme(); recalculer(); $('.evaluations-stockage').textContent = ok ? 'Évaluations et barème importés.' : 'Importés en mémoire seulement : exportez avant de fermer.'; }
    catch (err) { $('.evaluations-stockage').textContent = err.message || 'La sauvegarde ne peut pas être importée.'; }
    e.target.value = '';
  });
  remplirBareme();
  if (repris) $('.evaluations-stockage').textContent = `Évaluations de l’ancien outil professeur reprises (${pluriel(repris, 'équipe')}).`;
  montrerVue('accueil');
})(this);

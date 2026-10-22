// Outil professeur · onglet « Croquis et dessins » d'une équipe : le professeur photographie le travail de l'équipe
// (dessins des personnages, câblage, théâtre monté) avec une webcam ou un visualiseur de documents, et la photo est
// enregistrée en .jpg directement dans le dossier de l'équipe (… › THEATRE IA › LEA - TOM). Le fichier .json de
// l'équipe n'est jamais touché (les élèves peuvent l'écrire au même moment).
(function (global) {
  'use strict';

  const A = global.Atelier;
  const $ = (sel, racine) => (racine || document).querySelector(sel);
  const echapper = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const TYPES = [
    { cle: 'Dessins', nom: 'Dessins des personnages' },
    { cle: 'Cablage', nom: 'Câblage' },
    { cle: 'Theatre', nom: 'Théâtre monté' },
  ];
  const IMAGE = /\.(jpe?g|png|webp)$/i;
  const CLE_CAMERA = global.Atelier.projet.id + '-prof-camera';

  // La caméra reste allumée d'une équipe à l'autre (on photographie les feuilles à la suite) ;
  // elle s'éteint quand on quitte l'onglet.
  const etat = { flux: null, cameraId: null, type: 'Dessins', rotation: 0, capture: null, urls: [], contexte: null, box: null };
  try {
    etat.cameraId = localStorage.getItem(CLE_CAMERA);
  } catch {
    /* stockage indisponible */
  }

  function liberer() {
    for (const u of etat.urls) URL.revokeObjectURL(u);
    etat.urls = [];
  }

  function arreter() {
    if (etat.flux) for (const p of etat.flux.getTracks()) p.stop();
    etat.flux = null;
    etat.capture = null;
    liberer();
    etat.box = null;
  }

  const disponible = () => !!(global.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // contexte : { equipe: 'Léa_Hugo', eleves: 'Léa, Hugo', dossier: handle du dossier de l'équipe ou null,
  //              autoriser: async () => booléen (droit d'écrire dans le dossier de la classe) }
  function monter(box, contexte) {
    etat.box = box;
    etat.contexte = contexte;
    etat.capture = null;
    etat.rotation = 0;
    box.innerHTML =
      '<div class="pd">' +
      '<section class="pe-carte pd-camera"><h3>Photographier le travail de l’équipe</h3>' +
      (contexte.dossier
        ? `<p class="pe-aide">La photo est enregistrée dans le dossier de l’équipe <strong>${echapper(contexte.equipe)}</strong>.</p>`
        : '<p class="pd-alerte">Pour enregistrer dans le dossier de l’équipe, ouvrez le <strong>dossier de la classe</strong> depuis l’accueil ' +
          '(Chrome ou Edge). Ici, la photo sera seulement téléchargée.</p>') +
      '<div class="pd-types" role="radiogroup" aria-label="Type de feuille">' +
      TYPES.map((t) => `<button type="button" role="radio" class="pd-type" data-type="${t.cle}" aria-checked="${t.cle === etat.type}">${t.nom}</button>`).join('') +
      '</div>' +
      '<div class="pd-ecran"><video class="pd-video" autoplay playsinline muted></video><canvas class="pd-apercu" hidden></canvas>' +
      '<p class="pd-ecran-vide">Caméra éteinte</p></div>' +
      '<div class="pd-actions pd-actions-direct">' +
      '<button type="button" class="btn-principal pd-allumer">Allumer la caméra</button>' +
      '<button type="button" class="btn-principal pd-prendre" hidden>Prendre la photo</button>' +
      '<label class="pd-choix-camera" hidden>Caméra <select class="pd-cameras"></select></label>' +
      '<label class="btn-secondaire pd-importer">Importer une photo…<input type="file" accept="image/*" hidden></label>' +
      '</div>' +
      '<div class="pd-actions pd-actions-capture" hidden>' +
      '<button type="button" class="btn-secondaire pd-tourner" title="Tourner d’un quart de tour">↻ Tourner</button>' +
      '<button type="button" class="btn-secondaire pd-reprendre">Reprendre</button>' +
      `<button type="button" class="btn-principal pd-enregistrer">${contexte.dossier ? 'Enregistrer dans le dossier de l’équipe' : 'Télécharger la photo'}</button>` +
      '</div>' +
      '<p class="pd-message" role="status"></p>' +
      '<p class="pe-aide pd-astuce">Astuce : placez la feuille à plat ou cadrez le montage, avec un bon éclairage. Un visualiseur de documents marche comme une webcam.</p>' +
      '</section>' +
      '<section class="pe-carte pd-galerie"><h3>Dans le dossier de l’équipe</h3><div class="pd-liste"></div></section>' +
      '</div>';

    $('.pd-types', box).addEventListener('click', (e) => {
      const b = e.target.closest('[data-type]');
      if (!b) return;
      etat.type = b.dataset.type;
      for (const x of box.querySelectorAll('.pd-type')) x.setAttribute('aria-checked', String(x === b));
    });
    $('.pd-allumer', box).addEventListener('click', () => allumer());
    $('.pd-prendre', box).addEventListener('click', prendre);
    $('.pd-cameras', box).addEventListener('change', (e) => allumer(e.target.value));
    $('.pd-importer input', box).addEventListener('change', importer);
    $('.pd-tourner', box).addEventListener('click', () => {
      etat.rotation = (etat.rotation + 90) % 360;
      dessinerCapture();
    });
    $('.pd-reprendre', box).addEventListener('click', () => {
      etat.capture = null;
      afficherDirect();
    });
    $('.pd-enregistrer', box).addEventListener('click', enregistrer);

    if (!disponible()) {
      $('.pd-allumer', box).hidden = true;
      $('.pd-ecran-vide', box).textContent = 'Ce navigateur ne donne pas accès à la caméra : importez une photo.';
    }
    if (etat.flux) brancher();
    afficherDirect();
    lister();
  }

  function message(texte, sorte) {
    if (!etat.box) return;
    const m = $('.pd-message', etat.box);
    m.textContent = texte;
    m.className = 'pd-message' + (sorte ? ' ' + sorte : '');
  }

  // ---------- Caméra ----------

  async function allumer(cameraId) {
    if (etat.flux) for (const p of etat.flux.getTracks()) p.stop();
    etat.flux = null;
    message('');
    const video = { width: { ideal: 3840 }, height: { ideal: 2160 } };
    const id = cameraId || etat.cameraId;
    try {
      etat.flux = await navigator.mediaDevices.getUserMedia({ audio: false, video: id ? { ...video, deviceId: { exact: id } } : video });
    } catch (e) {
      // Caméra mémorisée débranchée : on reprend celle par défaut.
      if (id && e && e.name === 'OverconstrainedError') return allumer('') ;
      const raison = e && e.name === 'NotAllowedError' ? 'L’accès à la caméra a été refusé (icône de caméra dans la barre d’adresse pour l’autoriser).'
        : e && e.name === 'NotFoundError' ? 'Aucune caméra trouvée : branchez la webcam, puis réessayez.'
        : 'La caméra n’a pas pu démarrer (déjà utilisée par un autre logiciel ?).';
      return message(raison, 'erreur');
    }
    const piste = etat.flux.getVideoTracks()[0];
    etat.cameraId = (piste.getSettings && piste.getSettings().deviceId) || '';
    try {
      localStorage.setItem(CLE_CAMERA, etat.cameraId);
    } catch {
      /* rien */
    }
    brancher();
    afficherDirect();
    // Liste des caméras (les noms ne sont connus qu'une fois l'accès donné).
    const cameras = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    if (!etat.box) return;
    const choix = $('.pd-choix-camera', etat.box);
    choix.hidden = cameras.length < 2;
    $('.pd-cameras', etat.box).innerHTML = cameras
      .map((c, i) => `<option value="${echapper(c.deviceId)}"${c.deviceId === etat.cameraId ? ' selected' : ''}>${echapper(c.label || 'Caméra ' + (i + 1))}</option>`)
      .join('');
  }

  function brancher() {
    if (!etat.box) return;
    const v = $('.pd-video', etat.box);
    if (v.srcObject !== etat.flux) v.srcObject = etat.flux;
  }

  function afficherDirect() {
    if (!etat.box) return;
    const b = etat.box;
    const capture = !!etat.capture;
    $('.pd-video', b).hidden = capture || !etat.flux;
    $('.pd-apercu', b).hidden = !capture;
    $('.pd-ecran-vide', b).hidden = capture || !!etat.flux;
    $('.pd-actions-direct', b).hidden = capture;
    $('.pd-actions-capture', b).hidden = !capture;
    $('.pd-allumer', b).hidden = !!etat.flux || !disponible();
    $('.pd-prendre', b).hidden = !etat.flux;
    if (capture) dessinerCapture();
  }

  function prendre() {
    const v = $('.pd-video', etat.box);
    if (!v.videoWidth) return message('La caméra démarre… réessayez dans une seconde.');
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    etat.capture = c;
    etat.rotation = 0;
    message('');
    afficherDirect();
  }

  function importer(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      etat.capture = c;
      etat.rotation = 0;
      message('');
      afficherDirect();
    };
    img.onerror = () => message('Cette image n’a pas pu être lue.', 'erreur');
    img.src = url;
  }

  // Photo tournée (quart de tour), réduite à 3000 px au plus pour garder des fichiers légers sur le réseau.
  function imageFinale() {
    const src = etat.capture;
    const quart = etat.rotation % 180 !== 0;
    const echelle = Math.min(1, 3000 / Math.max(src.width, src.height));
    const l = Math.round(src.width * echelle);
    const h = Math.round(src.height * echelle);
    const c = document.createElement('canvas');
    c.width = quart ? h : l;
    c.height = quart ? l : h;
    const g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2);
    g.rotate((etat.rotation * Math.PI) / 180);
    g.drawImage(src, -l / 2, -h / 2, l, h);
    return c;
  }

  function dessinerCapture() {
    const finale = imageFinale();
    const apercu = $('.pd-apercu', etat.box);
    apercu.width = finale.width;
    apercu.height = finale.height;
    apercu.getContext('2d').drawImage(finale, 0, 0);
  }

  // ---------- Enregistrement ----------

  const deux = (n) => String(n).padStart(2, '0');
  function nomFichier(existants) {
    const d = new Date();
    const base = `${etat.type}_${etat.contexte.equipe}_${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}_${deux(d.getHours())}h${deux(d.getMinutes())}`;
    let nom = base + '.jpg';
    for (let i = 2; existants.has(nom.toLowerCase()); i++) nom = `${base}_${i}.jpg`;
    return nom;
  }

  async function enregistrer() {
    const bouton = $('.pd-enregistrer', etat.box);
    const blob = await new Promise((ok) => imageFinale().toBlob(ok, 'image/jpeg', 0.9));
    const ctx = etat.contexte;
    if (!ctx.dossier) {
      const nom = nomFichier(new Set());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nom;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return message(`Photo téléchargée : ${nom}. Rangez-la dans le dossier de l’équipe.`, 'juste');
    }
    bouton.disabled = true;
    try {
      if (!(await ctx.autoriser())) {
        message('Le navigateur n’a pas donné le droit d’écrire dans le dossier de la classe : rien n’a été enregistré.', 'erreur');
        return;
      }
      const existants = new Set();
      for await (const e of ctx.dossier.values()) existants.add(e.name.toLowerCase());
      const nom = nomFichier(existants);
      const fichier = await ctx.dossier.getFileHandle(nom, { create: true });
      const flux = await fichier.createWritable();
      await flux.write(blob);
      await flux.close();
      etat.capture = null;
      afficherDirect();
      message(`✓ Enregistré dans le dossier ${ctx.equipe} : ${nom}`, 'juste');
      lister();
    } catch {
      message('La photo n’a pas pu être enregistrée (réseau ou droits du dossier). Réessayez.', 'erreur');
    } finally {
      bouton.disabled = false;
    }
  }

  // ---------- Photos déjà dans le dossier ----------

  async function lister() {
    const box = etat.box;
    const ctx = etat.contexte;
    if (!box) return;
    const zone = $('.pd-liste', box);
    if (!ctx.dossier) {
      zone.innerHTML = '<p class="pe-vide">Dossier de l’équipe non ouvert (fichiers importés).</p>';
      return;
    }
    const images = [];
    try {
      for await (const e of ctx.dossier.values()) {
        if (e.kind !== 'file' || !IMAGE.test(e.name)) continue;
        try {
          images.push({ nom: e.name, fichier: await e.getFile() });
        } catch {
          /* fichier en cours d'écriture */
        }
      }
    } catch {
      zone.innerHTML = '<p class="pe-vide">Le dossier de l’équipe n’a pas pu être lu.</p>';
      return;
    }
    if (etat.box !== box) return;
    liberer();
    images.sort((a, b) => b.fichier.lastModified - a.fichier.lastModified);
    const type = (nom) => (TYPES.find((t) => nom.startsWith(t.cle + '_')) || {}).nom || 'Photo';
    zone.innerHTML = images.length
      ? images.map((im) => {
          const url = URL.createObjectURL(im.fichier);
          etat.urls.push(url);
          return `<a class="pd-vignette" href="${url}" target="_blank" rel="noopener" title="${echapper(im.nom)}">` +
            `<img src="${url}" alt="${echapper(type(im.nom))}"><span><strong>${echapper(type(im.nom))}</strong>` +
            `${new Date(im.fichier.lastModified).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</span></a>`;
        }).join('')
      : '<p class="pe-vide">Aucune photo pour l’instant.</p>';
  }

  A.dessins = { monter, arreter, actif: () => !!etat.box };
})(this);

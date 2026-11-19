// « Filmer le spectacle » : un petit film du programme final, pour l'oral des élèves.
// La scène est dessinée dans un canevas, image par image, puis enregistrée (MediaRecorder) :
//  - fronton avec les prénoms de l'équipe et le titre de l'histoire (carnet, étape 5) ;
//  - au centre, l'image de la webcam (l'écran d'ombres) ;
//  - au-dessus, un projecteur par LED, de sa couleur, allumé quand la LED du programme l'est ;
//  - en bas, la plaque « Sur scène » avec le personnage reconnu par l'IA ;
//  - rideau qui s'ouvre au début du film et se ferme à la fin.
// Le film est rangé dans le dossier de l'équipe (sinon téléchargé). Le son du micro est facultatif.

import { icon } from '../icons.js';
import { fileName } from '../project.js';

const L = 1280;
const H = 720;
const DUREE_MAX = 3 * 60; // secondes
const RIDEAU_MS = 1400;

// Format du film : MP4 si le navigateur sait l'enregistrer (lu partout), sinon WebM (Chrome, Edge, VLC).
function formatFilm() {
  const essais = [
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm', 'webm'],
  ];
  for (const [mime, ext] of essais) if (globalThis.MediaRecorder?.isTypeSupported?.(mime)) return { mime, ext };
  return null;
}

export function setupFilm({ program, ledColors, getTeam, getTitle, getPersos, getTeamDir, showMessage }) {
  const format = formatFilm();
  let dialog = null;
  let rendu = null; // boucle de dessin
  let enreg = null; // { recorder, morceaux, debut, micro }
  let rideau = { ouvert: 1, cible: 1, t: 0 }; // 0 = fermé, 1 = ouvert
  let film = null; // { blob, url, nom }
  let vuEtat = 0; // dernière mise à jour du message d'état

  // --- Bouton dans le bandeau du programme final ---------------------------------------------
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'btn-onglet btn-filmer';
  bouton.hidden = true;
  bouton.innerHTML = `${icon('webcam', { size: 18, stroke: 2.4 })}Filmer le spectacle`;
  bouton.addEventListener('click', ouvrir);
  program.hote.querySelector('.bandeau .btn-plein-ecran')?.before(bouton);
  const majBouton = () => { bouton.hidden = !program.finalOuvert(); };
  program.onExercice(majBouton);

  // --- Fenêtre du studio ---------------------------------------------------------------------
  function creer() {
    dialog = document.createElement('dialog');
    dialog.className = 'dialog film-dialog';
    dialog.setAttribute('aria-labelledby', 'film-titre');
    dialog.innerHTML = `
      <div class="dialog-head">
        <span class="dialog-icon">${icon('spectacle', { size: 26 })}</span>
        <h2 id="film-titre">Filmer le spectacle</h2>
        <button type="button" class="icon-btn dialog-close" data-film="fermer" aria-label="Fermer" title="Fermer">${icon('fermer')}</button>
      </div>
      <div class="dialog-body">
        <div class="film-ecran">
          <canvas width="${L}" height="${H}" aria-label="Aperçu du film"></canvas>
          <video class="film-revoir" controls playsinline hidden></video>
          <span class="film-rec" hidden><span></span><b>0:00</b></span>
        </div>
        <p class="film-etat" role="status"></p>
        <label class="film-micro"><input type="checkbox" data-film="micro"> Enregistrer aussi notre voix (micro)</label>
      </div>
      <div class="dialog-foot">
        <button type="button" class="btn btn-secondary" data-film="lancer">${icon('lecture')}Lancer le programme</button>
        <span class="film-espace"></span>
        <button type="button" class="btn btn-secondary" data-film="recommencer" hidden>${icon('vider')}Refaire un film</button>
        <button type="button" class="btn btn-secondary" data-film="telecharger" hidden>${icon('telecharger')}Télécharger</button>
        <button type="button" class="btn btn-primary" data-film="tourner">${icon('webcam')}Commencer le film</button>
        <button type="button" class="btn btn-danger" data-film="couper" hidden>${icon('stop')}Arrêter le film</button>
      </div>`;
    document.body.append(dialog);
    dialog.addEventListener('click', (e) => {
      const a = e.target.closest('[data-film]')?.dataset.film;
      if (a === 'fermer') dialog.close();
      else if (a === 'lancer') program.start();
      else if (a === 'tourner') tourner();
      else if (a === 'couper') couper();
      else if (a === 'recommencer') recommencer();
      else if (a === 'telecharger' && film) telecharger(film);
    });
    // Fermer pendant le tournage : le film s'arrête et il est gardé.
    dialog.addEventListener('close', () => {
      if (enreg) couper(true);
      cancelAnimationFrame(rendu);
      rendu = null;
    });
  }

  const $ = (sel) => dialog.querySelector(sel);

  function ouvrir() {
    if (!format) {
      showMessage('Ce navigateur ne sait pas enregistrer de film : utilisez Chrome ou Edge.', 'info');
      return;
    }
    if (!dialog) creer();
    // En plein écran, la fenêtre du studio ne serait pas visible.
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    recommencer();
    dialog.showModal();
    if (!rendu) dessiner();
  }

  function recommencer() {
    if (film) URL.revokeObjectURL(film.url);
    film = null;
    rideau = { ouvert: 1, cible: 1, t: 0 };
    $('canvas').hidden = false;
    $('.film-revoir').hidden = true;
    $('.film-revoir').removeAttribute('src');
    for (const [k, v] of Object.entries({ tourner: false, couper: true, recommencer: true, telecharger: true, lancer: false })) $(`[data-film="${k}"]`).hidden = v;
    $('.film-micro').hidden = false;
    etat();
  }

  // Ce qui manque pour un beau film : la caméra allumée, le programme lancé.
  function etat(texte) {
    if (texte) return ($('.film-etat').textContent = texte);
    const s = program.spectacle();
    $('[data-film="lancer"]').hidden = !!enreg || !!film || s.enMarche;
    $('.film-etat').textContent = !s.camera
      ? 'Allumez d’abord la caméra (panneau « Caméra et IA » du programme final), puis revenez ici.'
      : !s.enMarche
        ? 'Lancez le programme : les projecteurs suivront les LED, comme sur votre théâtre.'
        : 'Tout est prêt. Le film dure 3 minutes au plus ; le rideau s’ouvre au début et se ferme à la fin.';
  }

  // --- Dessin de la scène ---------------------------------------------------------------------
  function dessiner() {
    const ctx = $('canvas').getContext('2d');
    const boucle = (t) => {
      rendu = requestAnimationFrame(boucle);
      scene(ctx, t);
      if (enreg) {
        const s = Math.floor((performance.now() - enreg.debut) / 1000);
        $('.film-rec b').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        if (s >= DUREE_MAX) couper();
      } else if (!film && t - vuEtat > 500) {
        vuEtat = t;
        etat();
      }
    };
    rendu = requestAnimationFrame(boucle);
  }

  // Ce que fait le programme final, avec la couleur de chaque LED (une LED par personnage de l'équipe).
  function lire() {
    const s = program.spectacle();
    const leds = s.leds.slice(0, Math.max(getPersos(), s.leds.filter((l) => l.on).length));
    return { ...s, leds: leds.map((l) => ({ ...l, couleur: ledColors.hex(l.broche) })) };
  }

  function scene(ctx, t) {
    const s = lire();
    // Fond de salle
    ctx.fillStyle = '#140d0b';
    ctx.fillRect(0, 0, L, H);

    // Écran d'ombres : la webcam, éclairée par les projecteurs allumés
    const ecran = { x: 250, y: 150, w: 780, h: 440 };
    ctx.save();
    arrondi(ctx, ecran.x, ecran.y, ecran.w, ecran.h, 14);
    ctx.clip();
    ctx.fillStyle = '#f4ead8';
    ctx.fillRect(ecran.x, ecran.y, ecran.w, ecran.h);
    const v = s.video;
    if (v && v.readyState >= 2 && v.videoWidth) {
      // L'image remplit l'écran (recadrée au centre).
      const r = Math.max(ecran.w / v.videoWidth, ecran.h / v.videoHeight);
      const w = v.videoWidth * r;
      const h = v.videoHeight * r;
      ctx.drawImage(v, ecran.x + (ecran.w - w) / 2, ecran.y + (ecran.h - h) / 2, w, h);
    }
    const allumees = s.leds.filter((l) => l.on);
    allumees.forEach((l, i) => {
      const cx = ecran.x + ((i + 1) * ecran.w) / (allumees.length + 1);
      const g = ctx.createRadialGradient(cx, ecran.y, 20, cx, ecran.y + ecran.h * 0.6, ecran.w * 0.7);
      g.addColorStop(0, hexA(l.couleur, 0.5));
      g.addColorStop(1, hexA(l.couleur, 0.08));
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = g;
      ctx.fillRect(ecran.x, ecran.y, ecran.w, ecran.h);
      ctx.globalCompositeOperation = 'source-over';
    });
    ctx.restore();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#3b2418';
    arrondi(ctx, ecran.x, ecran.y, ecran.w, ecran.h, 14);
    ctx.stroke();

    // Projecteurs : un par LED, de sa couleur
    s.leds.forEach((l, i) => {
      const x = L / 2 + (i - (s.leds.length - 1) / 2) * 150;
      const y = 128;
      if (l.on) {
        const halo = ctx.createRadialGradient(x, y, 4, x, y, 70);
        halo.addColorStop(0, hexA(l.couleur, 0.9));
        halo.addColorStop(1, hexA(l.couleur, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, 70, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = l.on ? l.couleur : '#3a302b';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1d1512';
      ctx.stroke();
    });

    // Fronton : prénoms et titre de l'histoire
    const fronton = ctx.createLinearGradient(0, 0, 0, 96);
    fronton.addColorStop(0, '#8d1a1f');
    fronton.addColorStop(1, '#5e0f13');
    ctx.fillStyle = fronton;
    ctx.fillRect(0, 0, L, 92);
    for (let x = 0; x < L; x += 40) {
      ctx.beginPath();
      ctx.arc(x + 20, 92, 20, 0, Math.PI);
      ctx.fill();
    }
    const team = getTeam();
    const titre = (getTitle() || '').trim();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6d98b';
    ctx.font = `700 ${titre ? 30 : 38}px Georgia, 'Times New Roman', serif`;
    ctx.fillText(team.length ? `Le théâtre d’ombre de ${team.length > 1 ? team.slice(0, -1).join(', ') + ' et ' + team.at(-1) : team[0]}` : 'Théâtre d’ombre', L / 2, titre ? 40 : 58, L - 120);
    if (titre) {
      ctx.font = 'italic 600 26px Georgia, serif';
      ctx.fillStyle = '#fff3d6';
      ctx.fillText(`« ${titre} »`, L / 2, 76, L - 120);
    }

    // Plaque : le personnage sur scène
    const nom = s.vu || 'personne';
    ctx.font = '700 30px system-ui, sans-serif';
    const largeur = Math.max(260, ctx.measureText(nom).width + 200);
    ctx.fillStyle = '#c99a3e';
    arrondi(ctx, L / 2 - largeur / 2, 618, largeur, 64, 12);
    ctx.fill();
    ctx.fillStyle = '#2a1a0e';
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText('Sur scène :', L / 2 - largeur / 2 + 76, 658);
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(nom, L / 2 - largeur / 2 + 146, 660, largeur - 160);

    // Rideau (s'ouvre au début du film, se ferme à la fin)
    if (rideau.ouvert !== rideau.cible) {
      const p = Math.min(1, (t - rideau.t) / RIDEAU_MS);
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      rideau.vue = rideau.cible ? e : 1 - e;
      if (p >= 1) rideau.ouvert = rideau.cible;
    } else rideau.vue = rideau.ouvert;
    const ouverture = rideau.vue ?? 1;
    const largeurRideau = (L / 2) * (1 - ouverture) + 70;
    for (const cote of [0, 1]) {
      const x0 = cote ? L - largeurRideau : 0;
      const g = ctx.createLinearGradient(x0, 0, x0 + largeurRideau, 0);
      for (let k = 0; k <= 8; k++) g.addColorStop(k / 8, k % 2 ? '#7a1016' : '#a8161d');
      ctx.fillStyle = g;
      ctx.fillRect(x0, 92, largeurRideau, H - 92);
    }
    ctx.textAlign = 'start';
  }

  // --- Tournage -------------------------------------------------------------------------------
  async function tourner() {
    const flux = $('canvas').captureStream(30);
    let micro = null;
    if ($('[data-film="micro"]').checked) {
      try {
        micro = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        for (const p of micro.getAudioTracks()) flux.addTrack(p);
      } catch {
        etat('Le micro ne répond pas : le film sera enregistré sans le son.');
      }
    }
    const recorder = new MediaRecorder(flux, { mimeType: format.mime, videoBitsPerSecond: 4_000_000 });
    const morceaux = [];
    recorder.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
    recorder.onstop = () => termine(morceaux, recorder.mimeType || format.mime);
    enreg = { recorder, morceaux, debut: performance.now(), micro };
    // Le film commence rideau fermé, puis le rideau s'ouvre.
    rideau = { ouvert: 0, cible: 1, t: performance.now() + 300, vue: 0 };
    recorder.start(1000);
    $('.film-rec').hidden = false;
    for (const [k, v] of Object.entries({ tourner: true, couper: false, lancer: true })) $(`[data-film="${k}"]`).hidden = v;
    $('.film-micro').hidden = true;
    etat('Le film tourne : présentez vos personnages devant la webcam, sans toucher à l’ordinateur.');
  }

  // Fin du film : le rideau se ferme, puis l'enregistrement s'arrête (tout de suite si la fenêtre se ferme).
  function couper(vite = false) {
    if (!enreg || enreg.fin) return;
    enreg.fin = true;
    $('[data-film="couper"]').hidden = true;
    const arreter = () => {
      enreg.recorder.stop();
      enreg.micro?.getTracks().forEach((p) => p.stop());
      enreg = null;
      $('.film-rec').hidden = true;
    };
    if (vite) return arreter();
    rideau = { ouvert: 1, cible: 0, t: performance.now() };
    etat('Le rideau se ferme…');
    setTimeout(arreter, RIDEAU_MS + 400);
  }

  async function termine(morceaux, mime) {
    const blob = new Blob(morceaux, { type: mime.split(';')[0] });
    const team = getTeam();
    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    const base = team.length ? fileName(team).replace(/_theatre_ombre\.json$/, '') : 'theatre_ombre';
    film = { blob, url: URL.createObjectURL(blob), nom: `${base}_spectacle_${heure}.${format.ext}` };
    if (!dialog?.open) return ranger(film);
    $('canvas').hidden = true;
    const revoir = $('.film-revoir');
    revoir.src = film.url;
    revoir.hidden = false;
    for (const [k, v] of Object.entries({ recommencer: false, telecharger: false, tourner: true, lancer: true })) $(`[data-film="${k}"]`).hidden = v;
    etat('Rangement du film…');
    etat(await ranger(film));
  }

  // Dans le dossier de l'équipe s'il est connu, sinon téléchargé.
  async function ranger(f) {
    const dossier = getTeamDir();
    if (dossier) {
      try {
        const w = await (await dossier.getFileHandle(f.nom, { create: true })).createWritable();
        await w.write(f.blob);
        await w.close();
        const texte = `Film rangé dans le dossier de l’équipe : ${dossier.name} › ${f.nom}. Revoyez-le ci-dessus.`;
        if (!dialog?.open) showMessage(texte, 'info');
        return texte;
      } catch {
        // dossier inaccessible : on télécharge
      }
    }
    telecharger(f);
    const texte = `Film téléchargé : « ${f.nom} ». Rangez-le dans le dossier de l’équipe.`;
    if (!dialog?.open) showMessage(texte, 'info');
    return texte;
  }

  function telecharger(f) {
    const a = document.createElement('a');
    a.href = f.url;
    a.download = f.nom;
    document.body.append(a);
    a.click();
    a.remove();
  }

  return { ouvrir };
}

function arrondi(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

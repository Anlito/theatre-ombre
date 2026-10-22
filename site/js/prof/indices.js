// Indices pour noter chaque livrable : ce que l'outil constate dans le dossier de l'équipe.
// Ce ne sont que des aides : c'est le professeur qui choisit le niveau.
// Ce fichier ne touche pas à la page : il sert à l'outil ET aux tests.

import { avancement, avancementGlobal, corrigerComposants } from '../carnet.js';
import { controlerStl } from './stl.js';

// equipe : { projet, stls (avec .analyse), images } ; validations : { v1: { date }… }
// Renvoie { D1: [{ t, ok }], … } (ok : true, false, ou null si neutre).
export function indices(equipe, validations = {}) {
  const p = equipe.projet;
  const c = p?.carnet;
  const v = (id, t) => ({ t: `◆ ${t}`, ok: !!validations[id] });
  const etape = (n) => {
    if (!c) return { t: 'Pas de carnet', ok: false };
    const a = avancement(c, n);
    return { t: `Carnet, étape ${n} : ${a.faits}/${a.total}`, ok: a.faits === a.total ? true : a.faits === 0 ? false : null };
  };
  const photos = (id, t) => {
    const n = c?.photos?.[id]?.length ?? 0;
    return { t: `${t} : ${n ? `${n} photo${n > 1 ? 's' : ''}` : 'aucune photo'}`, ok: n > 0 };
  };
  // « Loup : 9 × 7 cm » : hauteur et largeur notées dans le carnet, comparées à la taille maximale.
  const cotes = (tableau, unite, max) =>
    [0, 1].map((i) => {
      const nom = c?.champs?.[`${tableau}.${i}.nom`] || c?.champs?.[`dessins.${i}.nom`] || `Personnage ${i + 1}`;
      const h = c?.champs?.[`${tableau}.${i}.hauteur`];
      const l = c?.champs?.[`${tableau}.${i}.largeur`];
      if (!h && !l) return { t: `${nom} : dimensions non notées`, ok: false };
      const n = (v) => parseFloat(String(v ?? '').replace(',', '.'));
      const ok = n(h) > 0 && n(l) > 0 && n(h) <= max && n(l) <= max;
      return { t: `${nom} : ${h ?? '?'} × ${l ?? '?'} ${unite} (${max} × ${max} ${unite} maximum)`, ok };
    });
  // Personnages de l'IA : étiquettes de la caméra de Labo Blocs (« Rien » = fond vide), sinon l'ancien écran Entraîner.
  const camera = p?.programmation?.camera;
  const exemples = (nom) => ({ name: nom, examples: camera?.exemples?.[nom] ?? [] });
  const persos = camera?.etiquettes ? camera.etiquettes.map(exemples) : (p?.categories ?? []).filter((x) => !x.background);
  const fond = camera ? exemples('Rien') : (p?.categories ?? []).find((x) => x.background);
  const stlOk = equipe.stls.filter((f) => f.analyse && (({ tailleOk, epaisseurOk }) => tailleOk && epaisseurOk)(controlerStl(f.analyse.dims)));
  const minimumPhotos=p?.programmation?10:15;
  const programmes = (p?.programmation ? Object.values(p.programmation.exercices||{}).map(e=>e.programme) : Object.values(p?.blocks?.parNiveau ?? {})).filter((x) => (x?.blocks?.blocks?.length ?? 0) > 0);
  const corrige = c ? corrigerComposants(c) : [];
  const justes = corrige.filter((x) => x.juste).length;
  const total = c ? avancementGlobal(c).reduce((s, e) => ({ f: s.f + e.faits, t: s.t + e.total }), { f: 0, t: 0 }) : null;

  return {
    D1: [...cotes('dessins', 'cm', 10), photos('dessins', 'Dessins'), etape(1), v('v1', 'Dessins validés')],
    D2: [
      { t: `Fichiers STL : ${equipe.stls.length}`, ok: equipe.stls.length >= 2 ? true : equipe.stls.length ? null : false },
      { t: `STL conformes (≤ 100 mm, 2 mm) : ${stlOk.length}/${equipe.stls.length}`, ok: equipe.stls.length ? stlOk.length === equipe.stls.length : null },
      ...cotes('modeles', 'mm', 100),
      etape(2),
      v('v2', 'Modèles validés'),
    ],
    D3: [photos('cablage', 'Câblage'), { t: c?.auto?.carte ? 'Carte connectée au site' : 'Carte jamais connectée', ok: !!c?.auto?.carte }, v('v3a', 'Montage validé')],
    D4: [
      { t: `Personnages : ${persos.length} (${persos.map((x) => `${x.name} ${x.examples.length} photos`).join(', ') || '—'})`, ok: persos.length >= 2 && persos.every((x) => x.examples.length >= minimumPhotos) },
      { t: `Fond vide : ${fond?.examples.length ?? 0} photos`, ok: (fond?.examples.length ?? 0) >= minimumPhotos },
      { t: `Reconnus par l'IA : ${c?.auto?.reconnus?.join(', ') || 'aucun'}`, ok: (c?.auto?.reconnus?.length ?? 0) >= 2 },
      { t: c?.auto?.programmeTeste ? 'Programme testé (une LED s’est allumée)' : 'Programme jamais testé', ok: !!c?.auto?.programmeTeste },
      { t: `Programmes écrits : ${programmes.length ? programmes.length : 'aucun'}`, ok: programmes.length > 0 },
      v('v3b', 'Démo fonctionnelle'),
    ],
    D5: [
      total ? { t: `Carnet rempli : ${total.f}/${total.t}`, ok: total.f === total.t ? true : total.f < total.t / 3 ? false : null } : { t: 'Pas de carnet', ok: false },
      c ? { t: `Chaînes (étape 4) : ${justes}/${corrige.length} composants bien placés`, ok: justes === corrige.length ? true : justes < 4 ? false : null } : etape(4),
      v('v4', 'Schéma validé'),
    ],
    D6: [etape(5), v('v5', 'Oral présenté')],
    D7: [{ t: 'À apprécier en classe (implication, entraide, autonomie)', ok: null }],
  };
}

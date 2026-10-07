// Aide intégrée : panneau à droite (les blocs restent visibles), une dizaine de lignes par écran,
// un onglet par niveau pour l'écran Programmer, des « mini-blocs » colorés à la place des emojis,
// et un mini-lexique.

import { COLOURS } from '../blocks/definitions.js';

const mini = (text, colour) => `<span class="mini" style="background:${colour}">${text}</span>`;
const M = {
  quandVois: mini('quand je vois…', COLOURS.events),
  quandPlus: mini('quand je ne vois plus…', COLOURS.events),
  demarre: mini('quand le programme démarre', COLOURS.events),
  allumer: mini('allumer la LED broche…', COLOURS.led),
  son: mini('jouer le son…', COLOURS.led),
  attendre: mini('attendre… secondes', COLOURS.control),
  toujours: mini('répéter indéfiniment', COLOURS.control),
  si: mini('si … alors … sinon', COLOURS.control),
  operateurs: mini('Opérateurs', COLOURS.operators),
  variables: mini('Variables', COLOURS.variables),
  ecrire: mini('écrire', COLOURS.display),
  ia: mini('je vois Loup ?', COLOURS.ia),
  rouge: '<span class="mini mini-rouge">bloc entouré de rouge</span>',
};
const item = (left, right) => `<li><span>${left}</span><span>${right}</span></li>`;

const LEXIQUE = `
  <h3>Mini-lexique</h3>
  <dl class="lexique">
    <dt>Catégorie</dt><dd>Un personnage que l'IA doit reconnaître (ex. « Loup »). « Fond vide » = personne.</dd>
    <dt>Exemple</dt><dd>Une photo donnée à l'IA pour qu'elle apprenne une catégorie.</dd>
    <dt>Confiance</dt><dd>À quel point l'IA est sûre d'elle, en %. 100 % = certaine.</dd>
    <dt>Broche</dt><dd>Une des prises numérotées de la carte Arduino (2 à 13) où l'on branche une LED.</dd>
  </dl>`;

const AIDES = {
  entrainer: `
    <h3>1. Entraîner l'IA</h3>
    <ol class="help-steps">
      <li>Branchez la webcam et placez-la face à l'écran du théâtre.</li>
      <li>Créez une catégorie par personnage avec « <b>Nouveau personnage</b> », en haut à droite.</li>
      <li>Mettez la silhouette devant la webcam et <b>gardez le bouton « Ajouter des photos » enfoncé</b>.</li>
      <li>Prenez au moins <b>15 photos</b> par personnage (30, c'est mieux), en bougeant un peu : plus près, plus loin, penché.</li>
      <li>N'oubliez pas « <b>Fond vide</b> » : des photos de l'écran <b>sans</b> personnage.</li>
      <li>Une photo ratée ? Cliquez dessus pour la supprimer.</li>
    </ol>
    <p>Photographiez les silhouettes, pas vos visages. Les photos ne quittent jamais l'ordinateur.</p>
    <p>Perdus ? Le bouton <b>« Que faire ? »</b>, en haut, indique la prochaine étape.</p>`,
  spectacle: `
    <h3>3. Spectacle</h3>
    <ol class="help-steps">
      <li>Vérifiez que les trois pastilles en haut sont vertes (« connectée », « prête »).</li>
      <li>Cliquez sur « <b>Lancer le spectacle</b> » : l'écran passe en plein écran et le rideau s'ouvre.</li>
      <li>Le nom du personnage reconnu s'affiche sur la plaque ; les projecteurs montrent les LED allumées.</li>
      <li>Le bouton rouge « <b>Tout éteindre</b> » arrête tout, à tout moment.</li>
    </ol>
    <p>Fin de séance : <b>Tout éteindre</b>, puis déconnecter la carte, puis débrancher le câble USB.</p>`,
};

const NIVEAUX = {
  1: `
    <h3>Niveau 1 · Premiers pas</h3>
    <ol class="help-steps">
      <li>Cliquez sur la pastille « <b>Carte · Connecter</b> », en haut, vérifiez le câblage, puis choisissez la carte dans la liste.</li>
      <li>Glissez un bloc ${M.quandVois} et accrochez des actions dessous, comme ${M.allumer} ou ${M.son}.</li>
      <li>Dans « allumer la LED », choisissez la <b>broche</b> où votre LED est branchée (bouton « Câblage des LED »).</li>
      <li>Avec ${M.quandPlus}, éteignez la LED quand le personnage quitte l'écran.</li>
      <li>Cliquez sur <b>Démarrer</b> pour essayer, sur <b>Arrêter</b> pour arrêter.</li>
      <li>Passez un personnage devant la webcam : la LED doit s'allumer.</li>
    </ol>`,
  2: `
    <h3>Niveau 2 · Boucles et conditions</h3>
    <p>C'est un <b>autre programme</b> que celui du niveau 1 : en changeant de niveau, chacun retrouve le sien.</p>
    <ul class="help-list">
      ${item(M.demarre, "Tout part de là (il n'y a plus « quand je vois »).")}
      ${item(M.toujours, "pour que le programme surveille l'IA en boucle.")}
      ${item(M.si, 'choisir une action selon une condition, par exemple « si ' + M.ia + ' ».')}
      ${item(M.operateurs, 'comparer (=, ≠, &lt;, &gt;) et combiner (et, ou, non). Exemple : « si personnage vu = Loup <em>et</em> confiance de Loup &gt; 80 ».')}
      ${item(M.variables, 'une boîte qui garde un nombre, par exemple un compteur de passages. Sa valeur s\'affiche sous les blocs.')}
      ${item(M.ecrire, 'affiche un message sous les blocs, pour comprendre ce que fait le programme.')}
      ${item(M.rouge, 'il est incomplet : remplis la case vide avant de démarrer.')}
    </ul>`,
  3: `
    <h3>Niveau 3 · Code Arduino</h3>
    <p>Le panneau de droite montre le <b>code C++</b> de votre programme du niveau 2 : c'est une <b>traduction</b>,
      pour comprendre ce que la carte exécuterait. En classe, c'est <b>le programme en blocs</b> qui s'exécute, dans le navigateur.</p>
    <ul class="help-list">
      ${item(M.allumer, '<code>digitalWrite(9, HIGH);</code>')}
      ${item(M.attendre, '<code>delay(1000);</code> (en millisecondes)')}
      ${item(M.si, '<code>if (…) { … } else { … }</code>')}
      ${item(M.toujours, 'la fonction <code>loop()</code>, que la carte répète sans arrêt')}
      ${item(M.variables, '<code>int passages = 0;</code>')}
    </ul>
    <p><b>Cliquez sur un bloc</b> : ses lignes s'éclairent dans le code. <b>Cliquez sur une ligne</b> : son bloc est sélectionné.</p>
    <p>« Copier » et « .ino » servent à ouvrir le code dans l'IDE Arduino. La webcam est réduite en haut de l'écran ;
      « Agrandir la webcam » la rouvre.</p>`,
};

export function setupHelp({ settings, getStep }) {
  const $ = (id) => document.getElementById(id);
  const dialog = $('help-dialog');
  const tabs = $('help-tabs');
  let shownLevel = 1;

  function renderBody(step) {
    if (step === 'programmer') {
      $('help-body').innerHTML = NIVEAUX[shownLevel] + LEXIQUE;
      for (const b of tabs.children) b.setAttribute('aria-selected', String(Number(b.dataset.level) === shownLevel));
    } else {
      $('help-body').innerHTML = (AIDES[step] ?? AIDES.entrainer) + LEXIQUE;
    }
  }

  tabs.innerHTML = [1, 2, 3].map((n) => `<button type="button" role="tab" data-level="${n}">Niveau ${n}</button>`).join('');
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (!b) return;
    shownLevel = Number(b.dataset.level);
    renderBody('programmer');
  });

  function show(step = getStep()) {
    $('help-title').textContent = 'Aide';
    tabs.hidden = step !== 'programmer';
    shownLevel = settings.level; // le niveau en cours est ouvert
    renderBody(step);
    dialog.showModal();
  }
  $('btn-help').addEventListener('click', () => show());
  return { show };
}

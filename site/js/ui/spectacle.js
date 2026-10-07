// Écran « Spectacle » : une vraie scène de théâtre.
//  - rideaux rouges qui s'ouvrent au lancement et se referment à la fin ;
//  - projecteurs au-dessus de la scène = les LED de la carte (allumés quand la LED l'est) ;
//  - au centre, l'écran d'ombres (la webcam) et une plaque avec le nom du personnage ;
//  - plein écran, avec « Tout éteindre » toujours visible.


export function setupSpectacle({ training, live, board, settings, ledColors, allOff, showMessage, onStart, getTeam }) {
  const $ = (id) => document.getElementById(id);
  const screen = $('screen-spectacle');
  const theatre = $('theatre');
  const name = $('stage-name');

  // Fronton : le nom de l'équipe, affiché dès le rideau fermé.
  function renderTitle() {
    const team = getTeam?.() ?? [];
    $('theatre-title').textContent = team.length ? `Le théâtre d'ombre de ${team.join(', ')}` : "Théâtre d'ombre";
  }
  function openCurtains() {
    renderTitle();
    // Petit délai : le rideau s'ouvre une fois le plein écran affiché.
    setTimeout(() => theatre.classList.add('is-open'), 300);
  }
  function closeCurtains() {
    theatre.classList.remove('is-open');
  }

  $('btn-show-start').addEventListener('click', async () => {
    if (!training.ready) {
      showMessage("L'IA n'est pas prête : retournez à l'étape 1 et prenez au moins 15 photos du fond vide et d'un personnage.", 'info');
      return;
    }
    onStart(); // démarre le programme de blocs s'il ne tourne pas déjà
    await screen.requestFullscreen().catch(() => {});
    openCurtains();
  });
  $('btn-show-exit').addEventListener('click', () => document.exitFullscreen().catch(() => {}));
  $('btn-show-off').addEventListener('click', allOff);
  document.addEventListener('fullscreenchange', () => {
    const full = document.fullscreenElement === screen;
    screen.classList.toggle('is-fullscreen', full);
    if (!full) closeCurtains(); // fin du spectacle : le rideau se ferme
  });

  // « Masquer l'image » : même action que le bouton du panneau webcam (qui met à jour les libellés).
  for (const id of ['btn-show-video', 'btn-show-video-fs']) $(id).addEventListener('click', () => $('btn-hide-video').click());

  // Nom du personnage sur la plaque.
  function show(id) {
    const cat = id ? training.get(id) : null;
    name.textContent = cat ? cat.name : 'personne';
    name.dataset.seen = String(!!cat);
  }
  live.on('vu', ({ id }) => show(id));
  live.on('plus-vu', () => show(live.seen));
  show(null);

  // Projecteurs : un par LED prévue par le professeur.
  function renderSpots(pins = board.pins) {
    $('spots').replaceChildren(
      ...settings.ledPins.map((pin, i) => {
        const on = pins[pin] > 0;
        const el = document.createElement('div');
        el.className = 'spot';
        el.dataset.on = String(on);
        // Projecteur et faisceau de la couleur de la LED choisie par l'équipe.
        el.style.setProperty('--spot-couleur', ledColors.hex(pin));
        const nom = ledColors.name(pin);
        el.innerHTML = `<span class="spot-lamp"></span><span class="spot-label">LED ${nom} · ${on ? 'allumée' : 'éteinte'}</span>`;
        el.title = `LED ${nom} (broche ${pin}) : ${on ? 'allumée' : 'éteinte'}`;
        return el;
      }),
    );
  }
  board.onChange(renderSpots);
  renderSpots();

  renderTitle();
  return { renderSpots, closeCurtains, renderTitle };
}

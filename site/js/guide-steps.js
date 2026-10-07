// Guide « Que faire ? » : les étapes du projet dans l'ordre, cochées automatiquement.
// Ce fichier ne touche pas à la page : il reçoit un « instantané » de l'état et renvoie les étapes
// (il sert au site ET aux tests).

export const MIN_PHOTOS = 15;

// s : {
//   cameraOn, backgroundPhotos, characters: [{ id, name, photos }], seen: Set d'id vus par l'IA,
//   ledsConfirmed, boardConnected, programReady, programTested, saved, showLaunched
// }
// level : niveau de programmation (1, 2 ou 3).
export function guideSteps(s, level = 1) {
  const chars = s.characters ?? [];
  const missing = chars.filter((c) => c.photos < MIN_PHOTOS);
  const notSeen = chars.filter((c) => !s.seen?.has(c.id));
  const steps = [
    {
      id: 'webcam',
      title: 'Activer la webcam',
      done: !!s.cameraOn,
      detail: "Placez la webcam face à l'écran du théâtre. Si le navigateur demande l'autorisation, cliquez sur « Autoriser ».",
      action: { id: 'webcam', label: 'Activer la webcam' },
    },
    {
      id: 'fond',
      title: `Photographier le fond vide (${MIN_PHOTOS} photos)`,
      done: (s.backgroundPhotos ?? 0) >= MIN_PHOTOS,
      detail: `Écran du théâtre sans personnage : gardez « Ajouter des photos » appuyé (${s.backgroundPhotos ?? 0} / ${MIN_PHOTOS}).`,
      action: { id: 'fond', label: 'Ouvrir « Fond vide »' },
    },
    {
      id: 'personnages',
      title: 'Créer vos personnages',
      done: chars.length > 0,
      detail: 'Écrivez le nom d’un personnage dans « Nouveau personnage », en haut à droite, puis « Ajouter ». Un personnage par silhouette.',
      action: { id: 'nouveau', label: 'Créer un personnage' },
    },
    {
      id: 'photos',
      title: `${MIN_PHOTOS} photos de chaque personnage`,
      done: chars.length > 0 && missing.length === 0,
      detail: missing.length
        ? `Encore des photos pour : ${missing.map((c) => `${c.name} (${c.photos}/${MIN_PHOTOS})`).join(', ')}. Bougez un peu la silhouette pendant la rafale.`
        : 'Photographiez chaque silhouette, plus près, plus loin, penchée…',
      action: { id: 'photos', label: missing.length ? `Photographier ${missing[0].name}` : 'Aller à « Entraîner »' },
    },
    {
      id: 'reconnaissance',
      title: "Vérifier que l'IA reconnaît chaque personnage",
      done: chars.length > 0 && notSeen.length === 0,
      detail: notSeen.length
        ? `Passez devant la webcam : ${notSeen.map((c) => c.name).join(', ')}. Le nom doit s'afficher en vert sous la webcam.`
        : 'Passez chaque silhouette devant la webcam.',
      action: { id: 'entrainer', label: 'Aller à « Entraîner »' },
    },
    {
      id: 'leds',
      title: 'Brancher les LED et choisir leurs couleurs',
      done: !!s.ledsConfirmed,
      manual: true,
      detail: 'Câble USB débranché : une LED par broche, pattes courtes sur GND. Puis indiquez la couleur de chaque LED dans « Ce que la carte a reçu ».',
      action: { id: 'cablage', label: 'Voir le câblage' },
    },
    {
      id: 'carte',
      title: 'Connecter la carte',
      done: !!s.boardConnected,
      detail: 'Branchez le câble USB, puis cliquez sur la pastille « Carte · Connecter » et choisissez la carte dans la liste.',
      action: { id: 'carte', label: 'Connecter la carte' },
    },
    {
      id: 'programme',
      title: 'Écrire le programme',
      done: !!s.programReady,
      detail:
        level >= 2
          ? 'Partez de « quand le programme démarre », ajoutez « répéter indéfiniment », puis « si je vois … ? alors allumer la LED ».'
          : 'Glissez « quand je vois … », choisissez un personnage, puis accrochez dessous « allumer la LED broche … ».',
      action: { id: 'programmer', label: 'Aller à « Programmer »' },
    },
    {
      id: 'test',
      title: 'Démarrer et tester',
      done: !!s.programTested,
      detail: 'Cliquez sur « Démarrer », passez un personnage devant la webcam : sa LED doit s’allumer.',
      action: { id: 'demarrer', label: 'Démarrer le programme' },
    },
    {
      id: 'enregistrer',
      title: 'Enregistrer le projet',
      done: !!s.saved,
      detail: 'Menu de l’équipe (en haut) → « Enregistrer », dans le dossier de votre équipe.',
      action: { id: 'enregistrer', label: 'Enregistrer' },
    },
    {
      id: 'spectacle',
      title: 'Lancer le spectacle',
      done: !!s.showLaunched,
      detail: 'Étape 3 · Spectacle, puis « Lancer le spectacle » : le rideau s’ouvre en plein écran.',
      action: { id: 'spectacle', label: 'Aller au spectacle' },
    },
  ];
  // Étape en cours : la première qui n'est pas faite.
  const current = steps.findIndex((st) => !st.done);
  steps.forEach((st, i) => (st.state = st.done ? 'fait' : i === current ? 'en-cours' : 'a-faire'));
  return { steps, done: steps.filter((st) => st.done).length, total: steps.length, current: current === -1 ? null : steps[current] };
}

// Petit « réveil » qui sonne régulièrement, même si l'onglet est en arrière-plan.
// Il sert à envoyer le signe de vie (PING) à la carte chaque seconde.
let id = null;
self.onmessage = (e) => {
  clearInterval(id);
  id = setInterval(() => self.postMessage('tic'), e.data.every);
};

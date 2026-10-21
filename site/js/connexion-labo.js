// Les scripts Labo Blocs et le parcours restent sur leur site central.
// Les scripts du projet démarrent dans l'ordre après les dépendances publiques.
(async function () {
  'use strict';
  const scripts = [...document.querySelectorAll('script[type="application/x-atelier"]')];
  const etat = document.createElement('div');
  etat.setAttribute('role', 'status');
  etat.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#fff;color:#222;display:grid;place-content:center;padding:2rem;font:18px Arial;line-height:1.6;text-align:center';
  etat.textContent = 'Connexion à Labo Blocs…';
  document.body.append(etat);
  const version = Date.now();
  function charger(url, module) {
    return new Promise((ok, ko) => {
      const s = document.createElement('script');
      let fini = false;
      const erreurScript = e => terminer(e.error || new Error(e.message));
      const terminer = erreur => { if (fini) return; fini = true; clearTimeout(timer); window.removeEventListener('error', erreurScript); erreur ? ko(erreur) : ok(); };
      const timer = setTimeout(() => { s.remove(); terminer(new Error('Connexion trop lente.')); }, 15000);
      s.onload = () => terminer();
      s.onerror = () => terminer(new Error('Fichier indisponible.'));
      window.addEventListener('error', erreurScript);
      const u = new URL(url, location.href);
      if (u.origin === 'https://anlito.github.io') u.searchParams.set('v', version);
      s.src = u.href;
      s.async = false;
      if (module) s.type = 'module';
      document.body.append(s);
    });
  }
  try {
    for (const original of scripts) {
      if (original.dataset.src) await charger(original.dataset.src, original.dataset.module);
      else {
        const s = document.createElement('script');
        s.textContent = original.textContent;
        document.body.append(s);
      }
    }
    etat.remove();
  } catch {
    etat.setAttribute('role', 'alert');
    etat.replaceChildren();
    const texte = document.createElement('p');
    texte.textContent = 'La connexion à Labo Blocs est nécessaire pour ouvrir le projet. Vérifie la connexion Internet, puis réessaie. Les fichiers de ton équipe restent dans leur dossier.';
    const bouton = document.createElement('button');
    bouton.type = 'button'; bouton.textContent = 'Réessayer'; bouton.onclick = () => location.reload();
    etat.append(texte, bouton);
  }
})();

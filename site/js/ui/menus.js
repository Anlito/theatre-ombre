// Menus déroulants de la bande du haut (équipe, aide) et fermeture des fenêtres.
// Ouverture au clic, fermeture par Échap ou clic à l'extérieur, navigation aux flèches.

export function setupMenus(root = document) {
  const menus = [...root.querySelectorAll('.menu')];

  function close(menu, focusButton = false) {
    const btn = menu.querySelector('.menu-btn');
    const list = menu.querySelector('.menu-list');
    if (list.hidden) return;
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (focusButton) btn.focus();
  }
  const closeAll = (except) => menus.forEach((m) => m !== except && close(m));

  for (const menu of menus) {
    const btn = menu.querySelector('.menu-btn');
    const list = menu.querySelector('.menu-list');
    const items = () => [...list.querySelectorAll('[role="menuitem"]')];
    btn.addEventListener('click', () => {
      const open = list.hidden;
      closeAll(menu);
      list.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) items()[0]?.focus();
    });
    list.addEventListener('click', (e) => {
      if (e.target.closest('[role="menuitem"]')) close(menu);
    });
    menu.addEventListener('keydown', (e) => {
      if (list.hidden) return;
      const all = items();
      const i = all.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        close(menu, true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        all[(i + 1) % all.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        all[(i - 1 + all.length) % all.length]?.focus();
      }
    });
  }
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.menu')) closeAll();
  });

  // Fenêtres : tout bouton [data-close] ferme la fenêtre qui le contient ;
  // un clic sur le voile (en dehors de la fenêtre) aussi.
  for (const dialog of root.querySelectorAll('dialog.dialog, dialog.side-panel')) {
    dialog.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) dialog.close();
      else if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) dialog.close();
      }
    });
  }
}

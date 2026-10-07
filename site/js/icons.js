// Icônes de l'outil (dessinées par Claude Design, grille 24, trait 2, licence du projet).
// Fichier GÉNÉRÉ par tools/icones.mjs : ne pas modifier à la main.
//   icon('led')                    -> <svg> à insérer dans du HTML
//   <span data-icon="led"></span>  -> remplacé au démarrage par hydrateIcons()

export const ICONS = {
  "aide": "<path d=\"M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01\"></path>",
  "ajouter": "<path d=\"M12 5v14M5 12h14\"></path>",
  "attention": "<path d=\"M12 3l10 18H2zM12 10v5M12 18v.01\"></path>",
  "cadenas": "<path d=\"M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11\"></path>",
  "carte": "<path d=\"M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4\"></path>",
  "chevron": "<path d=\"M6 9l6 6 6-6\"></path>",
  "copier": "<path d=\"M9 9h11v11H9zM5 15H4V4h11v1\"></path>",
  "cours": "<path d=\"M4 5c3-1 6-1 8 1c2-2 5-2 8-1v14c-3-1-6-1-8 1c-2-2-5-2-8-1zM12 6v14\"></path>",
  "diagnostic": "<path d=\"M3 12h4l2-6 4 12 2-6h6\"></path>",
  "enregistrer": "<path d=\"M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7\"></path>",
  "equipe": "<path d=\"M9 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zM2 20c.8-4 3.5-6 7-6s6.2 2 7 6zM16 4.5a3.2 3.2 0 0 1 0 6M18 14c2 .8 3.4 2.8 4 6\"></path>",
  "eteindre": "<path d=\"M12 3v9M7 6.3a7.5 7.5 0 1 0 10 0\"></path>",
  "fermer": "<path d=\"M6 6l12 12M18 6L6 18\"></path>",
  "ia": "<path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z\"></path>",
  "info": "<path d=\"M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 11v6M12 7.5v.01\"></path>",
  "lecture": "<path d=\"M7 4l13 8-13 8z\"></path>",
  "led": "<path d=\"M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z\"></path>",
  "masquer": "<path d=\"M3 12s3.5-6 9-6c1.6 0 3 .5 4.2 1.2M21 12s-3.5 6-9 6c-1.6 0-3-.5-4.2-1.2M4 20L20 4M9.5 14.5a3.5 3.5 0 0 1 5-5\"></path>",
  "ok": "<path d=\"M5 12.5l4.5 4.5L19 7\"></path>",
  "ouvrir": "<path d=\"M3 6h6l2 2h10v11H3z\"></path>",
  "personnage": "<path d=\"M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM4 21c1-4.5 4-7 8-7s7 2.5 8 7z\"></path>",
  "photo": "<path d=\"M3 8h4l2-3h6l2 3h4v11H3zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z\"></path>",
  "pleinecran": "<path d=\"M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5\"></path>",
  "prof": "<path d=\"M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6\"></path>",
  "renommer": "<path d=\"M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4\"></path>",
  "son": "<path d=\"M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12\"></path>",
  "spectacle": "<path d=\"M3 3h18M4 3c0 7 2 13 6 17M20 3c0 7-2 13-6 17M3 21h18\"></path>",
  "stop": "<path d=\"M6 6h12v12H6z\"></path>",
  "supprimer": "<path d=\"M4 7h16M10 3h4M6 7l1 14h10l1-14M10 11v6M14 11v6\"></path>",
  "telecharger": "<path d=\"M12 4v11M7 10l5 5 5-5M4 20h16\"></path>",
  "vider": "<path d=\"M4 15l9-9l6 6l-8 8H8zM9 10l6 6M12 20h8\"></path>",
  "webcam": "<path d=\"M12 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM12 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM8 21h8M12 17v4\"></path>"
};

export function icon(name, { size = 20, stroke = 2, label = '' } = {}) {
  const body = ICONS[name] ?? '';
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="ico ico-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
}

export function hydrateIcons(root = document) {
  for (const el of root.querySelectorAll('[data-icon]')) {
    if (el.dataset.iconDone) continue;
    el.innerHTML = icon(el.dataset.icon, { size: Number(el.dataset.size) || 20, stroke: Number(el.dataset.stroke) || 2 });
    el.dataset.iconDone = '1';
  }
}

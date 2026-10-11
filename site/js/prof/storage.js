// Stockage de l'outil professeur, dans le navigateur de son ordinateur (IndexedDB) :
//   - l'évaluation de chaque classe (« 3B » -> classeur) ;
//   - le dossier THEATRE IA de chaque classe, pour le rouvrir d'un clic (le navigateur redemande l'autorisation).
// Le fichier de sauvegarde (bouton « Sauvegarder ») reste la vraie copie à garder.

const DB = 'theatre-ombre-prof';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('classeurs');
      req.result.createObjectStore('dossiers');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(store, mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const safe = (p, fallback = null) => p.catch(() => fallback);

export const garderClasseur = (c) => safe(run('classeurs', 'readwrite', (s) => s.put(c, c.classe)), false);
export const lireClasseur = (classe) => safe(run('classeurs', 'readonly', (s) => s.get(classe)));
export const tousLesClasseurs = async () => (await safe(run('classeurs', 'readonly', (s) => s.getAll()), [])) ?? [];
export const garderDossier = (classe, handle) => safe(run('dossiers', 'readwrite', (s) => s.put({ classe, handle, date: Date.now() }, classe)), false);

// [{ classe, handle, date }] du plus récent au plus ancien.
export async function dossiersConnus() {
  const all = await safe(run('dossiers', 'readonly', (s) => s.getAll()), []);
  return (all ?? []).sort((a, b) => b.date - a.date);
}

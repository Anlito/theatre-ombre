// Copie de secours dans le navigateur (IndexedDB), une seule : « Reprendre mon dernier travail ».
// Elle reste sur ce poste et ne remplace pas le fichier .json de l'équipe.

const DB = 'theatre-ombre';
const STORE = 'secours';
const KEY = 'dernier';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// data : le projet (objet sérialisé). Renvoie true si la copie a pu être faite.
export async function saveBackup(data) {
  try {
    await run('readwrite', (s) => s.put({ savedAt: new Date().toISOString(), team: data.equipe ?? [], data }, KEY));
    return true;
  } catch {
    return false; // navigation privée, disque plein… : on n'insiste pas
  }
}

// Renvoie { savedAt, team, data } ou null.
export async function loadBackup() {
  try {
    return (await run('readonly', (s) => s.get(KEY))) ?? null;
  } catch {
    return null;
  }
}

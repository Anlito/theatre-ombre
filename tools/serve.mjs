// Petit serveur local pour essayer le site sur son ordinateur : npm start
// puis ouvrir http://localhost:8080 dans Chrome ou Edge.
// (localhost est accepté par le navigateur comme un site sûr : webcam et carte fonctionnent.)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// Le dossier site/ à côté de ce script (fonctionne quel que soit le dossier d'où on lance la commande).
const ROOT = fileURLToPath(new URL('../site', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.cur': 'image/x-icon',
  '.ino': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  path = normalize(join(ROOT, path));
  if (!path.startsWith(normalize(ROOT))) return send(res, 403, 'Interdit');
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    // no-store : le navigateur ne garde pas de copie, on voit toujours la dernière version (pas de cache à vider).
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    send(res, 404, 'Fichier introuvable');
  }
}).listen(PORT, () => console.log(`Site prêt : http://localhost:${PORT}  (Ctrl+C pour arrêter)`));

function send(res, code, text) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

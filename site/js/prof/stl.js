// Fichier STL (Tinkercad, en millimètres) : nombre de triangles et dimensions de la boîte englobante,
// pour vérifier la consigne « 100 mm × 100 mm maximum, 2 mm d'épaisseur ».
// Ce fichier ne touche pas à la page : il sert à l'outil ET aux tests. (La vue 3D est dans stl-vue.js.)

export const MAX_MM = 100;
export const EPAISSEUR_MM = 2;
const TOLERANCE_MM = 0.3; // arrondis de Tinkercad

// buffer : ArrayBuffer du fichier. Renvoie { triangles, dims: [x, y, z] } ou null si illisible.
export function analyserStl(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 84) return analyserAscii(bytes);
  const view = new DataView(buffer);
  const n = view.getUint32(80, true);
  if (84 + n * 50 === bytes.length) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
      const base = 84 + i * 50 + 12; // on saute la normale
      for (let v = 0; v < 3; v++) {
        for (let k = 0; k < 3; k++) {
          const x = view.getFloat32(base + v * 12 + k * 4, true);
          if (x < min[k]) min[k] = x;
          if (x > max[k]) max[k] = x;
        }
      }
    }
    return n ? { triangles: n, dims: max.map((m, k) => round(m - min[k])) } : null;
  }
  return analyserAscii(bytes);
}

function analyserAscii(bytes) {
  const text = new TextDecoder().decode(bytes);
  if (!/^\s*solid/i.test(text)) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let count = 0;
  for (const m of text.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi)) {
    for (let k = 0; k < 3; k++) {
      const x = parseFloat(m[k + 1]);
      if (x < min[k]) min[k] = x;
      if (x > max[k]) max[k] = x;
    }
    count++;
  }
  return count >= 3 ? { triangles: Math.floor(count / 3), dims: max.map((m, k) => round(m - min[k])) } : null;
}

const round = (x) => Math.round(x * 10) / 10;

// Contrôle de la consigne : la plus petite dimension est l'épaisseur, les deux autres ≤ 100 mm.
export function controlerStl(dims) {
  const [ep, a, b] = [...dims].sort((x, y) => x - y);
  return {
    largeur: a,
    hauteur: b,
    epaisseur: ep,
    tailleOk: b <= MAX_MM + TOLERANCE_MM,
    epaisseurOk: Math.abs(ep - EPAISSEUR_MM) <= TOLERANCE_MM,
  };
}

// Classifieur KNN (« k plus proches voisins ») :
// on cherche les k photos d'entraînement les plus ressemblantes à l'image actuelle,
// et chaque photo « vote » pour son personnage. Confiance = part des votes.

import { normalize, MIN_EXAMPLES } from './training.js';

export const DEFAULT_K = 10;

// categories : liste de { id, examples: [{ features (normées) }] }
// Renvoie { best: id | null, confidences: { id: 0..1 }, neighbours: [{ categoryId, exampleId, sim }] }.
// Les « voisins » sont les photos les plus ressemblantes (affichées aux élèves). Les catégories avec
// moins de MIN_EXAMPLES exemples ne votent pas (confiance 0).
export function classify(categories, features, { k = DEFAULT_K, minExamples = MIN_EXAMPLES } = {}) {
  const confidences = Object.fromEntries(categories.map((c) => [c.id, 0]));
  const usable = categories.filter((c) => c.examples.length >= minExamples);
  if (usable.length === 0) return { best: null, confidences, neighbours: [] };

  const q = normalize(features);
  const scored = [];
  for (const cat of usable) {
    for (const ex of cat.examples) scored.push({ id: cat.id, exampleId: ex.id, sim: dot(q, ex.features) });
  }
  scored.sort((a, b) => b.sim - a.sim);
  const neighbours = scored.slice(0, Math.min(k, scored.length));

  const votes = {};
  const simSum = {};
  for (const n of neighbours) {
    votes[n.id] = (votes[n.id] ?? 0) + 1;
    simSum[n.id] = (simSum[n.id] ?? 0) + n.sim;
  }
  let best = null;
  for (const id of Object.keys(votes)) {
    confidences[id] = votes[id] / neighbours.length;
    // En cas d'égalité des votes, la catégorie la plus ressemblante gagne.
    if (best === null || votes[id] > votes[best] || (votes[id] === votes[best] && simSum[id] > simSum[best])) {
      best = id;
    }
  }
  return {
    best,
    confidences,
    neighbours: neighbours.map((n) => ({ categoryId: n.id, exampleId: n.exampleId, sim: n.sim })),
  };
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

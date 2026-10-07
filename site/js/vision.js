// MobileNet : transforme une image de la webcam en une liste de nombres (« caractéristiques »)
// que le KNN peut comparer. Tout est calculé dans le navigateur, rien n'est envoyé.

export const MODEL_ID = 'mobilenet_v2_050_224'; // enregistré dans les projets : les caractéristiques en dépendent
const MODEL_URL = 'vendor/mobilenet_v2_050/model.json';
const THUMB_W = 96;
const THUMB_H = 72;

let model = null;

export async function loadModel() {
  if (model) return model;
  await loadScript('vendor/tf.min.js');
  await loadScript('vendor/mobilenet.min.js');
  await window.tf.ready();
  model = await window.mobilenet.load({ version: 2, alpha: 0.5, modelUrl: MODEL_URL, inputRange: [0, 1] });
  return model;
}

// Caractéristiques de l'image actuelle de la vidéo (Float32Array de 1280 nombres).
export async function features(video) {
  const out = model.infer(video, true);
  const data = await out.data();
  out.dispose();
  return data;
}

// Petite vignette JPEG (quelques Ko) pour afficher et enregistrer l'exemple.
const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
export function thumbnail(video) {
  canvas.width = THUMB_W;
  canvas.height = THUMB_H;
  canvas.getContext('2d').drawImage(video, 0, 0, THUMB_W, THUMB_H);
  return canvas.toDataURL('image/jpeg', 0.7);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Fichier introuvable : ${src}`));
    document.head.append(s);
  });
}

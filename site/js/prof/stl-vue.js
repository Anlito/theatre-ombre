// Vue 3D d'un fichier STL (three.js, embarqué dans site/vendor/three) : on tourne avec la souris,
// la molette zoome. Vue de face au départ (le personnage vu à plat, comme son ombre).

import * as THREE from 'three';
import { STLLoader } from '../../vendor/three/jsm/STLLoader.js';
import { OrbitControls } from '../../vendor/three/jsm/OrbitControls.js';

// Renvoie une fonction qui libère la vue (à appeler en quittant l'onglet).
export function vueStl(container, buffer) {
  const width = container.clientWidth || 320;
  const height = container.clientHeight || 260;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(width, height);
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#F7F1E5');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  scene.add(sun);

  const geometry = new STLLoader().parse(buffer);
  // Normales recalculées : certains exports les laissent à zéro (pièce toute noire).
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#7A6A5C', roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }));
  scene.add(mesh);

  // On regarde le personnage de face : le long de sa plus petite dimension (l'épaisseur).
  const axes = ['x', 'y', 'z'].sort((a, b) => size[a] - size[b]);
  const dir = new THREE.Vector3();
  dir[axes[0]] = 1;
  const up = new THREE.Vector3();
  up[axes[2]] = 1; // la plus grande dimension vers le haut
  const radius = Math.max(size.x, size.y, size.z) || 1;
  const camera = new THREE.PerspectiveCamera(35, width / height, radius / 100, radius * 20);
  camera.up.copy(up);
  // Un peu de biais (environ 25°) pour voir aussi l'épaisseur.
  const side = new THREE.Vector3();
  side[axes[1]] = 1;
  camera.position.copy(dir.clone().multiplyScalar(radius * 2.1)).add(side.multiplyScalar(radius * 0.95)).add(up.clone().multiplyScalar(radius * 0.35));
  camera.lookAt(0, 0, 0);
  sun.position.copy(camera.position).add(new THREE.Vector3(radius, radius, radius));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);
  render();

  return () => {
    controls.dispose();
    geometry.dispose();
    mesh.material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

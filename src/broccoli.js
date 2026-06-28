import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let _template = null;
const _loader  = new GLTFLoader();

export function loadBroccoliModel() {
  return new Promise((resolve) => {
    _loader.load('/Broccoli.glb', (gltf) => {
      const root = gltf.scene;
      root.scale.setScalar(0.45);
      // Bake emissive glow onto every mesh in the model
      root.traverse(child => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.emissive      = new THREE.Color(0x22ff55);
          child.material.emissiveIntensity = 0.7;
        }
      });
      _template = root;
      resolve();
    }, undefined, (err) => {
      console.warn('Broccoli.glb failed to load:', err);
      resolve(); // don't block game start
    });
  });
}

export function spawnBroccoli(scene, z) {
  if (!_template) return null;

  const group = _template.clone(true);
  group.position.set(
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    z,
  );
  group.userData = { type: 'broccoli', collected: false };

  // Attach a point light so it glows in the tunnel
  const glow = new THREE.PointLight(0x44ff88, 2.5, 5);
  group.add(glow);

  scene.add(group);
  return group;
}

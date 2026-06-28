import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let _template = null;
const _loader  = new GLTFLoader();

export function loadFriesModel() {
  return new Promise((resolve) => {
    _loader.load('/Fries.glb', (gltf) => {
      const root = gltf.scene;

      // Normalise to ~0.55 units
      const box    = new THREE.Box3().setFromObject(root);
      const size   = box.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      root.scale.setScalar(longest > 0 ? 0.55 / longest : 1);

      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center.multiplyScalar(root.scale.x));

      root.traverse(child => {
        if (!child.isMesh) return;
        child.material = child.material.clone();
        child.material.emissive          = new THREE.Color(0xff9900);
        child.material.emissiveIntensity = 0.8;
        child.frustumCulled = false;
      });

      _template = root;
      resolve();
    }, undefined, (err) => {
      console.warn('Fries.glb failed to load:', err);
      resolve();
    });
  });
}

export function spawnFries(scene, z) {
  if (!_template) return null;

  const group = _template.clone(true);
  group.position.set(
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    z,
  );
  group.userData = { type: 'fries', collected: false };

  // Warm orange glow
  const glow = new THREE.PointLight(0xff8800, 2.5, 5);
  group.add(glow);

  scene.add(group);
  return group;
}

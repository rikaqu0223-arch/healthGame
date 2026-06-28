import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let _template = null;
const _loader  = new GLTFLoader();

export function loadHamburgerModel() {
  return new Promise((resolve) => {
    _loader.load('/burger.glb', (gltf) => {
      const root = gltf.scene;

      const box    = new THREE.Box3().setFromObject(root);
      const size   = box.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      root.scale.setScalar(longest > 0 ? 0.8 / longest : 1);

      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center.multiplyScalar(root.scale.x));

      root.traverse(child => {
        if (!child.isMesh) return;
        child.frustumCulled = false;
      });

      _template = root;
      resolve();
    }, undefined, (err) => {
      console.warn('burger.glb failed to load:', err);
      resolve();
    });
  });
}

export function spawnHamburger(scene, z) {
  if (!_template) return null;

  const group = _template.clone(true);
  group.position.set(
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    z,
  );
  group.userData = { type: 'hamburger', collected: false };

  const light = new THREE.PointLight(0xfff5e0, 3.5, 6);
  group.add(light);

  scene.add(group);
  return group;
}

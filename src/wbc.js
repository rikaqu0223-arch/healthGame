import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let _template = null;
const _loader  = new GLTFLoader();

// Fallback: yellow blob if GLB not ready
const _fallbackGeo = new THREE.IcosahedronGeometry(0.55, 1);
const _fallbackMat = new THREE.MeshStandardMaterial({
  color: 0xffcc00,
  emissive: 0xff8800,
  emissiveIntensity: 0.7,
  roughness: 0.4,
  metalness: 0.1,
});

export function loadWBCModel() {
  return new Promise((resolve) => {
    _loader.load('/wbc.glb', (gltf) => {
      const root = gltf.scene;

      // Normalise size to ~0.9 units
      const box    = new THREE.Box3().setFromObject(root);
      const size   = box.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      root.scale.setScalar(longest > 0 ? 0.9 / longest : 1);

      // Re-centre
      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center.multiplyScalar(root.scale.x));

      // Force yellow — strip any texture that would fight the colour
      root.traverse(child => {
        if (!child.isMesh) return;
        child.material = new THREE.MeshStandardMaterial({
          color:             new THREE.Color(0xffdd00),
          emissive:          new THREE.Color(0xdd8800),
          emissiveIntensity: 1.0,
          roughness:         0.45,
          metalness:         0.1,
        });
        child.frustumCulled = false;
      });

      _template = root;
      resolve();
    }, undefined, (err) => {
      console.warn('wbc.glb failed to load:', err);
      resolve();
    });
  });
}

export function spawnWBC(scene, z) {
  let group;

  if (_template) {
    group = _template.clone(true);
  } else {
    const mesh = new THREE.Mesh(_fallbackGeo, _fallbackMat.clone());
    group = new THREE.Group();
    group.add(mesh);
  }

  // Free placement — not lane-locked, so they fill the tunnel unpredictably
  group.position.set(
    (Math.random() - 0.5) * 4.5,
    (Math.random() - 0.5) * 4.5,
    z,
  );

  group.userData = {
    type: 'wbc',
    hit:  false,
    rotSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.6),
  };

  scene.add(group);
  return group;
}

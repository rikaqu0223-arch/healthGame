import * as THREE from 'three';

// ── Shared geometries & materials (reused for perf) ──────────────────────────
const crystalGeo  = new THREE.OctahedronGeometry(0.28, 0);
const crystalMat  = new THREE.MeshStandardMaterial({
  color: 0xaaddff,
  emissive: 0x0088ff,
  emissiveIntensity: 1.2,
  roughness: 0.1,
  metalness: 0.3,
});

const blockGeo = new THREE.BoxGeometry(1.2, 1.2, 0.8);
const blockMat = new THREE.MeshStandardMaterial({
  color: 0xddaa44,
  emissive: 0x443300,
  emissiveIntensity: 0.3,
  roughness: 0.9,
  metalness: 0.05,
});

const ringGeo = new THREE.TorusGeometry(2.2, 0.15, 8, 32);
const ringMat = new THREE.MeshStandardMaterial({
  color: 0xff6633,
  emissive: 0xff3300,
  emissiveIntensity: 0.5,
  roughness: 0.5,
});

// ── Spawn helpers ────────────────────────────────────────────────────────────

function randOffset(max = 2.2) {
  return (Math.random() - 0.5) * 2 * max;
}

export function spawnCrystal(scene, z) {
  const mesh = new THREE.Mesh(crystalGeo, crystalMat.clone());
  mesh.position.set(randOffset(2.5), randOffset(2.5), z);
  mesh.userData = { type: 'crystal', collected: false };
  scene.add(mesh);
  return mesh;
}

export function spawnBlock(scene, z) {
  const mesh = new THREE.Mesh(blockGeo, blockMat.clone());
  // Snap to one of three horizontal lanes
  const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
  mesh.position.set(lane * 2.2, randOffset(1.8), z);
  mesh.userData = { type: 'block', hit: false };
  scene.add(mesh);
  return mesh;
}

export function spawnTurbulenceRing(scene, z) {
  const mesh = new THREE.Mesh(ringGeo, ringMat.clone());
  mesh.position.set(0, 0, z);
  mesh.userData = { type: 'ring', hit: false };
  scene.add(mesh);
  return mesh;
}

// ── Level layout: pre-place objects along the tunnel ────────────────────────

export function buildLevel(scene, tunnelLength = 200) {
  const objects = [];
  const step = 6; // spacing between object groups

  for (let z = -10; z > -tunnelLength + 10; z -= step) {
    const roll = Math.random();
    if (roll < 0.40) {
      objects.push(spawnCrystal(scene, z));
    } else if (roll < 0.70) {
      objects.push(spawnBlock(scene, z));
    } else if (roll < 0.82) {
      objects.push(spawnTurbulenceRing(scene, z));
    } else {
      // Crystal cluster
      for (let i = 0; i < 3; i++) objects.push(spawnCrystal(scene, z - i * 1.2));
    }
  }
  return objects;
}

// ── Per-frame update: animate + cull ────────────────────────────────────────

export function updateObjects(objects, time) {
  for (const obj of objects) {
    if (obj.userData.type === 'crystal' && !obj.userData.collected) {
      obj.rotation.y = time * 1.8;
      obj.rotation.x = time * 0.9;
      // Gentle float
      obj.position.y += Math.sin(time * 2 + obj.position.z) * 0.0008;
    }
    if (obj.userData.type === 'ring') {
      obj.rotation.z = time * 0.6;
    }
  }
}

// ── Collision ────────────────────────────────────────────────────────────────

const _v = new THREE.Vector3();

export function checkCollisions(objects, playerPos, onCrystal, onBlock) {
  for (const obj of objects) {
    if (obj.userData.collected || obj.userData.hit) continue;

    _v.subVectors(obj.position, playerPos);
    const dist = _v.length();

    if (obj.userData.type === 'crystal' && dist < 0.85) {
      obj.userData.collected = true;
      obj.visible = false;
      onCrystal(obj);
    } else if ((obj.userData.type === 'block' || obj.userData.type === 'ring') && dist < 1.1) {
      obj.userData.hit = true;
      onBlock(obj);
    }
  }
}

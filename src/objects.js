import * as THREE from 'three';
import { spawnBroccoli } from './broccoli.js';
import { spawnFries } from './fries.js';
import { spawnWBC } from './wbc.js';

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

// ── New interactive object geometries & materials ─────────────────────────────
const drifterGeo = new THREE.IcosahedronGeometry(0.45, 1);
const drifterMat = new THREE.MeshStandardMaterial({
  color: 0xff2200,
  emissive: 0xff0000,
  emissiveIntensity: 1.8,
  roughness: 0.2,
  metalness: 0.6,
});

const pinballGeo = new THREE.BoxGeometry(0.9, 0.9, 0.6);
const pinballMat = new THREE.MeshStandardMaterial({
  color: 0x44ffaa,
  emissive: 0x00cc66,
  emissiveIntensity: 0.8,
  roughness: 0.3,
  metalness: 0.5,
});

const orbitCrystalMat = new THREE.MeshStandardMaterial({
  color: 0xffdd00,
  emissive: 0xff8800,
  emissiveIntensity: 1.4,
  roughness: 0.1,
  metalness: 0.4,
});

const energyOrbGeo = new THREE.SphereGeometry(0.38, 16, 12);
const energyOrbMat = new THREE.MeshStandardMaterial({
  color: 0x00ff88,
  emissive: 0x00ff44,
  emissiveIntensity: 2.0,
  roughness: 0.1,
  metalness: 0.2,
});

// ── Spawn helpers ────────────────────────────────────────────────────────────

function randOffset(max = 2.2) {
  return (Math.random() - 0.5) * 2 * max;
}

export function spawnDrifter(scene, z, speedMult = 1) {
  const mesh = new THREE.Mesh(drifterGeo, drifterMat.clone());
  const baseX = randOffset(1.8);
  const baseY = randOffset(1.8);
  mesh.position.set(baseX, baseY, z);
  mesh.userData = {
    type: 'drifter',
    hit: false,
    baseX, baseY,
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    speedX: (0.7 + Math.random() * 0.8) * speedMult,
    speedY: (0.6 + Math.random() * 0.9) * speedMult,
    ampX: 1.2 + Math.random() * 0.8,
    ampY: 0.9 + Math.random() * 0.7,
  };
  scene.add(mesh);
  return mesh;
}

export function spawnPinball(scene, z) {
  const mesh = new THREE.Mesh(pinballGeo, pinballMat.clone());
  const baseY = randOffset(1.5);
  mesh.position.set(0, baseY, z);
  mesh.userData = {
    type: 'pinball',
    hit: false,
    baseY,
    bounceSpeed: 1.8 + Math.random() * 2.0,
    bouncePhase: Math.random() * Math.PI * 2,
    bounceLimit: 2.5,
  };
  scene.add(mesh);
  return mesh;
}

export function spawnEnergyOrb(scene, z) {
  const mesh = new THREE.Mesh(energyOrbGeo, energyOrbMat.clone());
  mesh.position.set(randOffset(2.2), randOffset(2.2), z);
  mesh.userData = { type: 'energy_orb', collected: false };
  scene.add(mesh);
  return mesh;
}

export function spawnOrbitCluster(scene, z) {
  const centerX = randOffset(1.2);
  const centerY = randOffset(1.2);
  const orbitRadius = 0.9 + Math.random() * 0.5;
  const orbitSpeed = 1.4 + Math.random() * 1.2;
  const count = 3;
  const meshes = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(crystalGeo, orbitCrystalMat.clone());
    mesh.userData = {
      type: 'orbit_crystal',
      collected: false,
      centerX, centerY, centerZ: z,
      orbitRadius,
      orbitSpeed,
      orbitPhase: (i / count) * Math.PI * 2,
    };
    mesh.position.set(centerX + orbitRadius, centerY, z);
    scene.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
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

export function buildLevel(scene, tunnelLength = 200, run = 1) {
  const objects   = [];
  const step      = Math.max(4, 6 - Math.floor((run - 1) * 0.4));
  const speedMult = 1 + (run - 1) * 0.2;

  for (let z = -10; z > -tunnelLength + 10; z -= step) {
    const roll = Math.random();
    if (roll < 0.80) {
      objects.push(spawnWBC(scene, z));               // 80% — WBC (shoot or dodge)
    } else if (roll < 0.89) {
      const b = spawnBroccoli(scene, z);              //  9% — broccoli (clears ahead)
      if (b) objects.push(b);
    } else {
      const f = spawnFries(scene, z);                // 11% — fries (clears radius)
      if (f) objects.push(f);
    }
  }
  return objects;
}

// ── Per-frame update: animate + cull ────────────────────────────────────────

export function updateObjects(objects, time) {
  for (const obj of objects) {
    const t = obj.userData.type;

    if (t === 'crystal' && !obj.userData.collected) {
      obj.rotation.y = time * 1.8;
      obj.rotation.x = time * 0.9;
      obj.position.y += Math.sin(time * 2 + obj.position.z) * 0.0008;
    }

    if (t === 'ring') {
      obj.rotation.z = time * 0.6;
    }

    if (t === 'drifter' && !obj.userData.hit) {
      const { baseX, baseY, phaseX, phaseY, speedX, speedY, ampX, ampY } = obj.userData;
      obj.position.x = baseX + Math.sin(time * speedX + phaseX) * ampX;
      obj.position.y = baseY + Math.sin(time * speedY + phaseY) * ampY;
      obj.rotation.x = time * 1.4;
      obj.rotation.z = time * 0.9;
    }

    if (t === 'pinball' && !obj.userData.hit) {
      const { baseY, bounceSpeed, bouncePhase, bounceLimit } = obj.userData;
      obj.position.x = Math.sin(time * bounceSpeed + bouncePhase) * bounceLimit;
      obj.position.y = baseY;
      obj.rotation.y = time * 3;
    }

    if (t === 'energy_orb' && !obj.userData.collected) {
      obj.rotation.y = time * 2.2;
      obj.rotation.z = time * 1.1;
      obj.position.y += Math.sin(time * 3 + obj.position.z) * 0.001;
    }

    if (t === 'wbc' && !obj.userData.hit) {
      obj.rotation.y = time * obj.userData.rotSpeed;
      obj.rotation.x = Math.sin(time * 0.7 + obj.position.z) * 0.3;
      if (obj.userData.pulseLight)
        obj.userData.pulseLight.intensity = 1.5 + Math.sin(time * 4) * 0.8;
    }

    if (t === 'broccoli' && !obj.userData.collected) {
      obj.rotation.y = time * 1.2;
      obj.position.y += Math.sin(time * 1.5 + obj.position.z) * 0.001;
    }

    if (t === 'fries' && !obj.userData.collected) {
      obj.rotation.y = time * 1.6;
      obj.rotation.z = Math.sin(time * 2 + obj.position.z) * 0.2;
      obj.position.y += Math.sin(time * 2.5 + obj.position.z) * 0.001;
    }

    if (t === 'orbit_crystal' && !obj.userData.collected) {
      const { centerX, centerY, centerZ, orbitRadius, orbitSpeed, orbitPhase } = obj.userData;
      obj.position.x = centerX + Math.cos(time * orbitSpeed + orbitPhase) * orbitRadius;
      obj.position.y = centerY + Math.sin(time * orbitSpeed + orbitPhase) * orbitRadius;
      obj.position.z = centerZ;
      obj.rotation.y = time * 2.5;
    }
  }
}

// ── Collision ────────────────────────────────────────────────────────────────

const _v = new THREE.Vector3();

export function checkCollisions(objects, playerPos, onCrystal, onBlock, onEnergy, onBroccoli, onFries) {
  for (const obj of objects) {
    if (obj.userData.collected || obj.userData.hit) continue;

    _v.subVectors(obj.position, playerPos);
    const dist = _v.length();
    const t = obj.userData.type;

    if ((t === 'crystal' || t === 'orbit_crystal') && dist < 0.85) {
      obj.userData.collected = true;
      obj.visible = false;
      onCrystal(obj);
    } else if (t === 'wbc' && dist < 1.1) {
      obj.userData.hit = true;
      onBlock(obj);
    } else if (t === 'energy_orb' && dist < 0.9) {
      obj.userData.collected = true;
      obj.visible = false;
      onEnergy(obj);
    } else if (t === 'broccoli' && dist < 1.2) {
      obj.userData.collected = true;
      obj.visible = false;
      onBroccoli(obj);
    } else if (t === 'fries' && dist < 1.0) {
      obj.userData.collected = true;
      obj.visible = false;
      onFries(obj);
    }
  }
}

// Broccoli: clear WBC in a forward beam (40 units ahead)
export function clearObstaclesAhead(objects, playerZ, range = 40) {
  let cleared = 0;
  for (const obj of objects) {
    if (obj.userData.collected || obj.userData.hit) continue;
    if (obj.userData.type !== 'wbc') continue;
    if (obj.position.z < playerZ && obj.position.z > playerZ - range) {
      obj.userData.hit = true;
      obj.visible = false;
      cleared++;
    }
  }
  return cleared;
}

// Fries: clear WBC in a sphere around the player (any direction, closer range)
export function clearObstaclesAround(objects, playerPos, radius = 25) {
  let cleared = 0;
  for (const obj of objects) {
    if (obj.userData.collected || obj.userData.hit) continue;
    if (obj.userData.type !== 'wbc') continue;
    _v.subVectors(obj.position, playerPos);
    if (_v.length() < radius) {
      obj.userData.hit = true;
      obj.visible = false;
      cleared++;
    }
  }
  return cleared;
}

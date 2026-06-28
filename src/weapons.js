import * as THREE from 'three';

const torpGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8);
torpGeo.rotateX(Math.PI / 2);

const torpMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0x00ffee,
  emissiveIntensity: 3,
  roughness: 0,
  metalness: 0.4,
});

const TORPEDO_SPEED = 40;
const TORPEDO_RANGE = 100;
const COOLDOWN      = 0.28;

const DESTRUCTIBLE = new Set(['block', 'ring', 'drifter', 'pinball']);

export function createWeaponSystem() {
  return { projectiles: [], lastFired: -999 };
}

export function fireTorpedo(weapons, scene, px, py, pz, now) {
  if (now - weapons.lastFired < COOLDOWN) return;
  weapons.lastFired = now;

  const mesh = new THREE.Mesh(torpGeo, torpMat.clone());
  mesh.position.set(px, py, pz - 1.2);

  const light = new THREE.PointLight(0x00ffee, 4, 5);
  mesh.add(light);

  mesh.userData = { traveled: 0 };
  scene.add(mesh);
  weapons.projectiles.push(mesh);
}

export function updateWeapons(weapons, objects, scene, delta, onDestroy) {
  const dead = [];

  for (const proj of weapons.projectiles) {
    proj.position.z -= TORPEDO_SPEED * delta;
    proj.userData.traveled += TORPEDO_SPEED * delta;

    if (proj.userData.traveled > TORPEDO_RANGE) {
      dead.push(proj);
      continue;
    }

    let hit = false;
    for (const obj of objects) {
      if (obj.userData.hit || obj.userData.collected) continue;
      if (!DESTRUCTIBLE.has(obj.userData.type)) continue;

      const dx = obj.position.x - proj.position.x;
      const dy = obj.position.y - proj.position.y;
      const dz = obj.position.z - proj.position.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.2) {
        obj.userData.hit = true;
        obj.visible = false;
        hit = true;
        if (onDestroy) onDestroy();
        break;
      }
    }

    if (hit) dead.push(proj);
  }

  for (const proj of dead) {
    scene.remove(proj);
    weapons.projectiles.splice(weapons.projectiles.indexOf(proj), 1);
  }
}

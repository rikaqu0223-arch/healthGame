import * as THREE from 'three';

const torpGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8);
torpGeo.rotateX(Math.PI / 2);

const torpMat = new THREE.MeshStandardMaterial({
  emissiveIntensity: 3,
  roughness: 0,
  metalness: 0.4,
});

// Color and length per level — matches submarine cosmetics
const TORPEDO_LEVELS = [
  { color: 0x00ffee, length: 1.0 },  // 1 cyan
  { color: 0x00ddff, length: 1.8 },  // 2 bright cyan
  { color: 0x22ff88, length: 2.8 },  // 3 green
  { color: 0xffcc00, length: 4.0 },  // 4 gold
  { color: 0xff6600, length: 5.5 },  // 5 orange
  { color: 0xdd44ff, length: 7.5 },  // 6 purple
  { color: 0xffffff, length: 10.0 }, // 7+ white laser
];

const TORPEDO_SPEED = 40;
const TORPEDO_RANGE = 100;
const COOLDOWN      = 0.55;

const DESTRUCTIBLE = new Set(['wbc']);

export function createWeaponSystem() {
  return { projectiles: [], lastFired: -999 };
}

export function resetWeapons(weapons, scene) {
  for (const p of weapons.projectiles) scene.remove(p);
  weapons.projectiles = [];
  weapons.lastFired   = -999;
}

export function fireTorpedo(weapons, scene, px, py, pz, now, cfg = {}) {
  if (now - weapons.lastFired < COOLDOWN) return;
  weapons.lastFired = now;

  const speed   = cfg.torpedoSpeed ?? TORPEDO_SPEED;
  const offsets = cfg.spreadShot ? [-0.5, 0, 0.5] : [0];
  const level   = cfg.level ?? 1;
  const lvlCfg  = TORPEDO_LEVELS[Math.min(level - 1, TORPEDO_LEVELS.length - 1)];
  const radScale = 1 + (level - 1) * 0.12; // gently thicker per level

  for (const xOff of offsets) {
    const mat = torpMat.clone();
    mat.color.setHex(lvlCfg.color);
    mat.emissive.setHex(lvlCfg.color);
    const mesh = new THREE.Mesh(torpGeo, mat);
    mesh.position.set(px + xOff, py, pz - 1.2);
    mesh.scale.set(radScale, radScale, lvlCfg.length);
    const light = new THREE.PointLight(lvlCfg.color, 4, 5);
    mesh.add(light);
    mesh.userData = { traveled: 0, speed };
    scene.add(mesh);
    weapons.projectiles.push(mesh);
  }
}

export function updateWeapons(weapons, objects, scene, delta, onDestroy) {
  const dead = [];

  for (const proj of weapons.projectiles) {
    const speed = proj.userData.speed ?? TORPEDO_SPEED;
    const prevZ = proj.position.z;
    proj.position.z -= speed * delta;
    proj.userData.traveled += speed * delta;

    if (proj.userData.traveled > TORPEDO_RANGE) {
      dead.push(proj);
      continue;
    }

    let hit = false;
    for (const obj of objects) {
      if (obj.userData.hit || obj.userData.collected) continue;
      if (!DESTRUCTIBLE.has(obj.userData.type)) continue;

      // XY proximity check
      const dx = obj.position.x - proj.position.x;
      const dy = obj.position.y - proj.position.y;
      if (dx * dx + dy * dy >= 1.4 * 1.4) continue;

      // Swept Z check: did the torpedo pass through this object's Z this frame?
      const oz = obj.position.z;
      if (oz > prevZ || oz < proj.position.z) continue;

      obj.userData.hit = true;
      obj.visible = false;
      hit = true;
      if (onDestroy) onDestroy(obj);
      break;
    }

    if (hit) dead.push(proj);
  }

  for (const proj of dead) {
    scene.remove(proj);
    weapons.projectiles.splice(weapons.projectiles.indexOf(proj), 1);
  }
}

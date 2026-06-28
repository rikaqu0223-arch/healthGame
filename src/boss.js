import * as THREE from 'three';

export function getBossZ(tunnelLength)        { return -(tunnelLength - 12); }
export function getBossActivateZ(tunnelLength) { return -(tunnelLength - 35); }

const FIRE_INTERVAL    = 1.8;
const PROJ_SPEED       = 12;
const PROJ_RANGE       = 70;

// ── Materials ────────────────────────────────────────────────────────────────
const bodyMat = new THREE.MeshStandardMaterial({
  color: 0x660088,
  emissive: 0x440066,
  emissiveIntensity: 1.4,
  roughness: 0.25,
  metalness: 0.7,
});

const spikeMat = new THREE.MeshStandardMaterial({
  color: 0xff0055,
  emissive: 0xcc0033,
  emissiveIntensity: 1.2,
  roughness: 0.3,
  metalness: 0.5,
});

const eyeMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xff4400,
  emissiveIntensity: 3,
});

const projMat = new THREE.MeshStandardMaterial({
  color: 0xff2200,
  emissive: 0xff0000,
  emissiveIntensity: 2.5,
  roughness: 0,
});

const projGeo = new THREE.SphereGeometry(0.25, 8, 8);

// ── Build boss mesh ───────────────────────────────────────────────────────────
export function createBoss(scene, tunnelLength = 200, bossHp = 10, fireInterval = FIRE_INTERVAL) {
  const group = new THREE.Group();

  // Core body
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 2), bodyMat.clone());
  group.add(body);

  // Outer spike ring (orbits around body)
  const spikeRing = new THREE.Group();
  const spikeGeo  = new THREE.ConeGeometry(0.22, 1.8, 6);
  const spikes = [];
  for (let i = 0; i < 8; i++) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat.clone());
    const angle = (i / 8) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 2.6, Math.sin(angle) * 2.6, 0);
    spike.rotation.z = angle - Math.PI / 2;
    spikeRing.add(spike);
    spikes.push(spike);
  }
  group.add(spikeRing);

  // Glowing eye
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), eyeMat.clone());
  eye.position.set(0, 0, 1.7);
  group.add(eye);

  // Point light — pulsing glow
  const light = new THREE.PointLight(0xaa00ff, 6, 25);
  group.add(light);

  // Eye light for forward glow
  const eyeLight = new THREE.PointLight(0xff4400, 4, 12);
  eyeLight.position.set(0, 0, 2);
  group.add(eyeLight);

  group.position.set(0, 0, getBossZ(tunnelLength));
  group.visible = false;
  scene.add(group);

  return {
    group, body, spikeRing, spikes, light, eyeLight,
    hp: bossHp,
    maxHp: bossHp,
    fireInterval,
    active: false,
    defeated: false,
    hitFlash: 0,
    lastFired: 0,
    projectiles: [],
  };
}

// ── Per-frame update ──────────────────────────────────────────────────────────
export function updateBoss(boss, state, delta, time, torpedoes, scene, onPlayerHit, onBossHit, torpedoDamage = 1) {
  if (!boss.active || boss.defeated) return;

  // Movement: figure-8 drift
  boss.group.position.x = Math.sin(time * 0.55) * 2.2;
  boss.group.position.y = Math.sin(time * 0.38) * 1.6;

  // Slow menacing rotation
  boss.group.rotation.y = time * 0.5;
  boss.group.rotation.x = Math.sin(time * 0.3) * 0.2;

  // Spike ring spins independently
  boss.spikeRing.rotation.z = time * 1.4;

  // Pulse light
  boss.light.intensity    = 5 + Math.sin(time * 5) * 2.5;
  boss.eyeLight.intensity = 3 + Math.sin(time * 8) * 1.5;

  // Hit flash: briefly lighten body
  if (boss.hitFlash > 0) {
    boss.hitFlash -= delta;
    boss.body.material.emissiveIntensity = 4;
    boss.body.material.color.set(0xffffff);
  } else {
    boss.body.material.emissiveIntensity = 1.4;
    boss.body.material.color.set(0x660088);
  }

  // Fire projectile at player
  boss.lastFired += delta;
  if (boss.lastFired >= boss.fireInterval) {
    boss.lastFired = 0;
    spawnBossProjectile(boss, scene, state.px, state.py, state.z);
  }

  // Move boss projectiles + check player hit
  const deadProj = [];
  for (const proj of boss.projectiles) {
    proj.position.addScaledVector(proj.userData.dir, PROJ_SPEED * delta);
    proj.userData.traveled += PROJ_SPEED * delta;

    if (proj.userData.traveled > PROJ_RANGE) { deadProj.push(proj); continue; }

    const dx = state.px - proj.position.x;
    const dy = state.py - proj.position.y;
    const dz = state.z  - proj.position.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.1) {
      deadProj.push(proj);
      onPlayerHit();
    }
  }
  for (const p of deadProj) {
    scene.remove(p);
    boss.projectiles.splice(boss.projectiles.indexOf(p), 1);
  }

  // Check torpedo hits on boss (swept Z check to prevent tunneling)
  const deadTorps = [];
  for (const torp of torpedoes) {
    const prevZ = torp.userData.prevZ ?? torp.position.z;
    torp.userData.prevZ = torp.position.z;

    const dx = boss.group.position.x - torp.position.x;
    const dy = boss.group.position.y - torp.position.y;
    const bz = boss.group.position.z;
    const inXY  = dx * dx + dy * dy < 2.4 * 2.4;
    const inZ   = bz <= prevZ && bz >= torp.position.z;
    if (inXY && inZ) {
      deadTorps.push(torp);
      boss.hp  = Math.max(0, boss.hp - torpedoDamage);
      boss.hitFlash = 0.12;
      onBossHit(boss.hp);
      if (boss.hp === 0) {
        boss.defeated = true;
        boss.group.visible = false;
        clearBossProjectiles(boss, scene);
      }
    }
  }
  for (const t of deadTorps) {
    scene.remove(t);
    torpedoes.splice(torpedoes.indexOf(t), 1);
  }
}

// ── Reset (called on restart / new run) ──────────────────────────────────────
export function resetBoss(boss, scene, tunnelLength = 200, bossHp = 10, fireInterval = FIRE_INTERVAL) {
  clearBossProjectiles(boss, scene);
  boss.hp           = bossHp;
  boss.maxHp        = bossHp;
  boss.fireInterval = fireInterval;
  boss.active       = false;
  boss.defeated     = false;
  boss.hitFlash     = 0;
  boss.lastFired    = 0;
  boss.group.visible = false;
  boss.group.position.set(0, 0, getBossZ(tunnelLength));
  boss.body.material.color.set(0x660088);
  boss.body.material.emissiveIntensity = 1.4;
}

function spawnBossProjectile(boss, scene, tx, ty, tz) {
  const mesh = new THREE.Mesh(projGeo, projMat.clone());
  mesh.position.copy(boss.group.position);
  const dir = new THREE.Vector3(tx - boss.group.position.x, ty - boss.group.position.y, tz - boss.group.position.z).normalize();
  const pLight = new THREE.PointLight(0xff2200, 3, 5);
  mesh.add(pLight);
  mesh.userData = { dir, traveled: 0 };
  scene.add(mesh);
  boss.projectiles.push(mesh);
}

function clearBossProjectiles(boss, scene) {
  for (const p of boss.projectiles) scene.remove(p);
  boss.projectiles = [];
}

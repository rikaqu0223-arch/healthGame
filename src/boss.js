import * as THREE from 'three';

export function getBossZ(tunnelLength)         { return -(tunnelLength - 12); }
export function getBossActivateZ(tunnelLength) { return -(tunnelLength - 35); }

const FIRE_INTERVAL = 1.8;
const PROJ_SPEED    = 12;
const PROJ_RANGE    = 80;

// ── Boss variants (one per run, last repeats for runs 6+) ─────────────────────
export const BOSS_VARIANTS = [
  {
    name: 'PATHOGEN ALPHA',
    bodyColor: 0x660088, bodyEmissive: 0x440066,
    spikeColor: 0xff0055, spikeEmissive: 0xcc0033,
    lightColor: 0xaa00ff, projColor: 0xff2200,
    scale: 1.0, attackPattern: 0,
  },
  {
    name: 'PATHOGEN BETA',
    bodyColor: 0x882200, bodyEmissive: 0x551100,
    spikeColor: 0xff6600, spikeEmissive: 0xcc4400,
    lightColor: 0xff6600, projColor: 0xff6600,
    scale: 1.15, attackPattern: 1,
  },
  {
    name: 'PATHOGEN GAMMA',
    bodyColor: 0x005533, bodyEmissive: 0x003322,
    spikeColor: 0x00ff66, spikeEmissive: 0x00cc44,
    lightColor: 0x00ff44, projColor: 0x00ff44,
    scale: 1.3, attackPattern: 2,
  },
  {
    name: 'PATHOGEN DELTA',
    bodyColor: 0x002266, bodyEmissive: 0x001144,
    spikeColor: 0x00aaff, spikeEmissive: 0x0066cc,
    lightColor: 0x0088ff, projColor: 0x00ccff,
    scale: 1.45, attackPattern: 3,
  },
  {
    name: 'PATHOGEN OMEGA',
    bodyColor: 0x333300, bodyEmissive: 0x222200,
    spikeColor: 0xffffff, spikeEmissive: 0xffee00,
    lightColor: 0xffffff, projColor: 0xffffff,
    scale: 1.65, attackPattern: 4,
  },
];

export function getBossVariant(run) {
  return BOSS_VARIANTS[Math.min(run - 1, BOSS_VARIANTS.length - 1)];
}

// ── Shared geometry ───────────────────────────────────────────────────────────
const projGeo = new THREE.SphereGeometry(0.25, 8, 8);

// ── Build boss mesh ───────────────────────────────────────────────────────────
export function createBoss(scene, tunnelLength = 200) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.8, 2),
    new THREE.MeshStandardMaterial({ color: 0x660088, emissive: 0x440066, emissiveIntensity: 1.4, roughness: 0.25, metalness: 0.7 })
  );
  group.add(body);

  const spikeRing = new THREE.Group();
  const spikeGeo  = new THREE.ConeGeometry(0.22, 1.8, 6);
  const spikes = [];
  for (let i = 0; i < 8; i++) {
    const spike = new THREE.Mesh(
      spikeGeo,
      new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xcc0033, emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.5 })
    );
    const angle = (i / 8) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 2.6, Math.sin(angle) * 2.6, 0);
    spike.rotation.z = angle - Math.PI / 2;
    spikeRing.add(spike);
    spikes.push(spike);
  }
  group.add(spikeRing);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff4400, emissiveIntensity: 3 })
  );
  eye.position.set(0, 0, 1.7);
  group.add(eye);

  const light    = new THREE.PointLight(0xaa00ff, 6, 25);
  const eyeLight = new THREE.PointLight(0xff4400, 4, 12);
  eyeLight.position.set(0, 0, 2);
  group.add(light);
  group.add(eyeLight);

  group.position.set(0, 0, getBossZ(tunnelLength));
  group.visible = false;
  scene.add(group);

  return {
    group, body, spikeRing, spikes, light, eyeLight,
    hp: 10, maxHp: 10,
    fireInterval: FIRE_INTERVAL,
    attackPattern: 0,
    patternPhase:  0,
    baseBodyColor: 0x660088,
    projColor:     0xff2200,
    active: false, defeated: false,
    hitFlash: 0, lastFired: 0,
    projectiles: [],
  };
}

// ── Apply variant colors & scale ──────────────────────────────────────────────
function applyVariant(boss, variant) {
  boss.body.material.color.set(variant.bodyColor);
  boss.body.material.emissive.set(variant.bodyEmissive);
  boss.light.color.set(variant.lightColor);
  boss.eyeLight.color.set(variant.lightColor);
  for (const s of boss.spikes) {
    s.material.color.set(variant.spikeColor);
    s.material.emissive.set(variant.spikeEmissive);
  }
  boss.group.scale.setScalar(variant.scale);
  boss.baseBodyColor = variant.bodyColor;
  boss.projColor     = variant.projColor;
  boss.attackPattern = variant.attackPattern;
}

// ── Reset (called each run) ───────────────────────────────────────────────────
export function resetBoss(boss, scene, tunnelLength = 200, bossHp = 10, fireInterval = FIRE_INTERVAL, variant) {
  clearBossProjectiles(boss, scene);
  boss.hp           = bossHp;
  boss.maxHp        = bossHp;
  boss.fireInterval = fireInterval;
  boss.active       = false;
  boss.defeated     = false;
  boss.hitFlash     = 0;
  boss.lastFired    = 0;
  boss.patternPhase = 0;
  boss.group.visible = false;
  boss.group.position.set(0, 0, getBossZ(tunnelLength));
  boss.body.material.emissiveIntensity = 1.4;
  if (variant) applyVariant(boss, variant);
}

// ── Per-frame update ──────────────────────────────────────────────────────────
export function updateBoss(boss, state, delta, time, torpedoes, scene, onPlayerHit, onBossHit, torpedoDamage = 1) {
  if (!boss.active || boss.defeated) return;

  // Movement — speed and amplitude scale with pattern
  const speedScale = 1 + boss.attackPattern * 0.12;
  boss.group.position.x = Math.sin(time * 0.55 * speedScale) * 2.2;
  boss.group.position.y = Math.sin(time * 0.38 * speedScale) * 1.6;

  boss.group.rotation.y = time * (0.5 + boss.attackPattern * 0.1);
  boss.group.rotation.x = Math.sin(time * 0.3) * 0.2;
  boss.spikeRing.rotation.z = time * (1.4 + boss.attackPattern * 0.2);

  boss.light.intensity    = 5 + Math.sin(time * 5) * 2.5;
  boss.eyeLight.intensity = 3 + Math.sin(time * 8) * 1.5;

  // Hit flash
  if (boss.hitFlash > 0) {
    boss.hitFlash -= delta;
    boss.body.material.emissiveIntensity = 5;
    boss.body.material.color.set(0xffffff);
  } else {
    boss.body.material.emissiveIntensity = 1.4;
    boss.body.material.color.set(boss.baseBodyColor);
  }

  // Fire — pattern depends on boss variant
  boss.lastFired += delta;
  if (boss.lastFired >= boss.fireInterval) {
    boss.lastFired = 0;
    firePattern(boss, scene, state.px, state.py, state.z);
  }

  // Move boss projectiles + check player hit
  const deadProj = [];
  for (const proj of boss.projectiles) {
    const spd = proj.userData.speed || PROJ_SPEED;
    proj.position.addScaledVector(proj.userData.dir, spd * delta);
    proj.userData.traveled += spd * delta;

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

  // Check torpedo hits (swept Z)
  const deadTorps = [];
  for (const torp of torpedoes) {
    const prevZ = torp.userData.prevZ ?? torp.position.z;
    torp.userData.prevZ = torp.position.z;

    const dx = boss.group.position.x - torp.position.x;
    const dy = boss.group.position.y - torp.position.y;
    const bz = boss.group.position.z;
    const hitRadius = 2.4 * boss.group.scale.x;
    if (dx * dx + dy * dy < hitRadius * hitRadius && bz <= prevZ && bz >= torp.position.z) {
      deadTorps.push(torp);
      boss.hp = Math.max(0, boss.hp - torpedoDamage);
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

// ── Attack patterns ───────────────────────────────────────────────────────────
function firePattern(boss, scene, px, py, pz) {
  switch (boss.attackPattern) {
    case 0: // Alpha — single aimed shot
      shoot(boss, scene, px, py, pz, PROJ_SPEED);
      break;

    case 1: // Beta — twin burst, slightly spread
      shoot(boss, scene, px + 0.8, py, pz, PROJ_SPEED * 1.1);
      shoot(boss, scene, px - 0.8, py, pz, PROJ_SPEED * 1.1);
      break;

    case 2: // Gamma — vertical fan of 3
      shoot(boss, scene, px, py + 1.1, pz, PROJ_SPEED);
      shoot(boss, scene, px, py,       pz, PROJ_SPEED * 1.1);
      shoot(boss, scene, px, py - 1.1, pz, PROJ_SPEED);
      break;

    case 3: // Delta — fast single + diagonal pair
      shoot(boss, scene, px,       py,       pz, PROJ_SPEED * 1.9);
      shoot(boss, scene, px + 1.0, py + 1.0, pz, PROJ_SPEED * 1.2);
      shoot(boss, scene, px - 1.0, py - 1.0, pz, PROJ_SPEED * 1.2);
      break;

    case 4: // Omega — alternates between dense fan and fast cross
      boss.patternPhase = (boss.patternPhase + 1) % 2;
      if (boss.patternPhase === 0) {
        // Dense fan: 5 shots spread
        for (let i = -2; i <= 2; i++)
          shoot(boss, scene, px + i * 0.9, py, pz, PROJ_SPEED * (1.0 + Math.abs(i) * 0.1));
      } else {
        // Fast cross: 4 diagonal shots + center
        shoot(boss, scene, px,       py,       pz, PROJ_SPEED * 2.0);
        shoot(boss, scene, px + 1.2, py + 1.2, pz, PROJ_SPEED * 1.4);
        shoot(boss, scene, px - 1.2, py + 1.2, pz, PROJ_SPEED * 1.4);
        shoot(boss, scene, px + 1.2, py - 1.2, pz, PROJ_SPEED * 1.4);
        shoot(boss, scene, px - 1.2, py - 1.2, pz, PROJ_SPEED * 1.4);
      }
      break;
  }
}

function shoot(boss, scene, tx, ty, tz, speed) {
  const mat = new THREE.MeshStandardMaterial({
    color: boss.projColor,
    emissive: boss.projColor,
    emissiveIntensity: 2.5,
    roughness: 0,
  });
  const mesh = new THREE.Mesh(projGeo, mat);
  mesh.position.copy(boss.group.position);
  const dir = new THREE.Vector3(
    tx - boss.group.position.x,
    ty - boss.group.position.y,
    tz - boss.group.position.z
  ).normalize();
  const pLight = new THREE.PointLight(boss.projColor, 3, 5);
  mesh.add(pLight);
  mesh.userData = { dir, traveled: 0, speed };
  scene.add(mesh);
  boss.projectiles.push(mesh);
}

function clearBossProjectiles(boss, scene) {
  for (const p of boss.projectiles) scene.remove(p);
  boss.projectiles = [];
}

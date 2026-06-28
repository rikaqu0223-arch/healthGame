import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function getBossZ(tunnelLength)         { return -(tunnelLength - 12); }
export function getBossActivateZ(tunnelLength) { return -(tunnelLength - 35); }

const FIRE_INTERVAL        = 1.8;
const PROJ_SPEED           = 12;
const PROJ_RANGE           = 80;
const BOSS_MODEL_URL       = '/models/Virus.glb';
const TARGET_BOSS_DIAMETER = 4.6;
const FAT_CELL_COLOR       = 0xf2b632;
const FAT_CELL_EMISSIVE    = 0x6a2e00;
const FAT_CELL_SPIKE       = 0xffdf72;
const FAT_CELL_LIGHT       = 0xffbd45;
const EXPL_DURATION        = 2.2;

// ── Shared explosion geometry ─────────────────────────────────────────────────
const explGeo = new THREE.IcosahedronGeometry(0.18, 0);
const debGeo  = new THREE.TetrahedronGeometry(0.12, 0);

function startExplosion(boss, scene) {
  boss.exploding        = true;
  boss.explodeTime      = 0;
  boss.explodeNextPulse = 0.35;
  boss.explodeParticles = [];
  boss.group.visible    = false;
  clearBossProjectiles(boss, scene);

  const origin = boss.group.position.clone();
  const scale  = boss.group.scale.x;
  const cols   = [boss.projColor, 0xffffff, 0xff8800, 0xffee00];

  for (let i = 0; i < 36; i++) {
    const col = cols[i % cols.length];
    const mat = new THREE.MeshStandardMaterial({
      color: col, emissive: col, emissiveIntensity: 3,
      transparent: true, opacity: 1, roughness: 0,
    });
    const mesh = new THREE.Mesh(i % 5 === 0 ? debGeo : explGeo, mat);
    mesh.position.copy(origin);
    mesh.position.x += (Math.random() - 0.5) * scale * 1.5;
    mesh.position.y += (Math.random() - 0.5) * scale * 1.5;
    const speed = (2 + Math.random() * 9) * scale;
    const dir   = new THREE.Vector3(
      Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5,
    ).normalize().multiplyScalar(speed);
    mesh.userData = {
      vel:  dir,
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ),
    };
    scene.add(mesh);
    boss.explodeParticles.push(mesh);
  }

  const fl = new THREE.PointLight(0xffffff, 30, 45);
  fl.position.copy(origin);
  scene.add(fl);
  boss.explodeFlash1 = fl;

  const fl2 = new THREE.PointLight(boss.projColor, 18, 35);
  fl2.position.copy(origin);
  scene.add(fl2);
  boss.explodeFlash2 = fl2;
}

function tickExplosion(boss, scene, delta) {
  boss.explodeTime += delta;
  const t = Math.min(boss.explodeTime / EXPL_DURATION, 1);

  boss.explodeFlash1.intensity = 30 * Math.max(0, 1 - t * 5);
  const pulse = 0.5 + 0.5 * Math.sin(boss.explodeTime * 20);
  boss.explodeFlash2.intensity = 18 * Math.max(0, 1 - t * 2.2) * pulse;

  if (boss.explodeNextPulse > 0 && boss.explodeTime >= boss.explodeNextPulse) {
    boss.explodeNextPulse = boss.explodeNextPulse < 0.5 ? 0.7 : -1;
    for (let i = 0; i < 10; i++) {
      const col = [boss.projColor, 0xff8800, 0xffee00][i % 3];
      const mat = new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: 3,
        transparent: true, opacity: 1, roughness: 0,
      });
      const mesh = new THREE.Mesh(explGeo, mat);
      mesh.position.copy(boss.explodeFlash2.position);
      mesh.position.x += (Math.random() - 0.5) * 2;
      mesh.position.y += (Math.random() - 0.5) * 2;
      const speed = 1.5 + Math.random() * 5;
      const dir = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(speed);
      mesh.userData = { vel: dir, spin: new THREE.Vector3((Math.random()-0.5)*8, (Math.random()-0.5)*8, (Math.random()-0.5)*8), secondary: true };
      scene.add(mesh);
      boss.explodeParticles.push(mesh);
    }
  }

  for (const p of boss.explodeParticles) {
    p.position.addScaledVector(p.userData.vel, delta);
    p.userData.vel.multiplyScalar(p.userData.secondary ? 0.92 : 0.96);
    p.rotation.x += p.userData.spin.x * delta;
    p.rotation.y += p.userData.spin.y * delta;
    p.rotation.z += p.userData.spin.z * delta;
    const fade = Math.max(0, 1 - t * 1.15);
    p.material.opacity = fade;
    p.scale.setScalar(Math.max(0.05, fade));
  }

  if (t >= 1) {
    for (const p of boss.explodeParticles) { p.material.dispose(); scene.remove(p); }
    boss.explodeParticles = [];
    scene.remove(boss.explodeFlash1);
    scene.remove(boss.explodeFlash2);
    boss.explodeFlash1 = null;
    boss.explodeFlash2 = null;
    boss.exploding = false;
    boss.defeated  = true;
  }
}

// ── Boss variants (one per run, last repeats for runs 6+) ─────────────────────
export const BOSS_VARIANTS = [
  {
    name: 'PLAQUE ALPHA',
    bodyColor: 0x660088, bodyEmissive: 0x440066,
    spikeColor: 0xff0055, spikeEmissive: 0xcc0033,
    lightColor: 0xaa00ff, projColor: 0xff2200,
    scale: 1.5, attackPattern: 0,
  },
  {
    name: 'PLAQUE BETA',
    bodyColor: 0x882200, bodyEmissive: 0x551100,
    spikeColor: 0xff6600, spikeEmissive: 0xcc4400,
    lightColor: 0xff6600, projColor: 0xff6600,
    scale: 1.2, attackPattern: 1,
  },
  {
    name: 'PLAQUE GAMMA',
    bodyColor: 0x005533, bodyEmissive: 0x003322,
    spikeColor: 0x00ff66, spikeEmissive: 0x00cc44,
    lightColor: 0x00ff44, projColor: 0x00ff44,
    scale: 0.9, attackPattern: 2,
  },
  {
    name: 'PLAQUE DELTA',
    bodyColor: 0x002266, bodyEmissive: 0x001144,
    spikeColor: 0x00aaff, spikeEmissive: 0x0066cc,
    lightColor: 0x0088ff, projColor: 0x00ccff,
    scale: 0.65, attackPattern: 3,
  },
  {
    name: 'PLAQUE OMEGA',
    bodyColor: 0x333300, bodyEmissive: 0x222200,
    spikeColor: 0xffffff, spikeEmissive: 0xffee00,
    lightColor: 0xffffff, projColor: 0xffffff,
    scale: 0.45, attackPattern: 4,
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
  const fallbackRoot = new THREE.Group();
  const modelRoot = new THREE.Group();
  modelRoot.visible = false;
  group.add(fallbackRoot, modelRoot);

  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.8, 2),
    new THREE.MeshStandardMaterial({ color: 0x660088, emissive: 0x440066, emissiveIntensity: 1.4, roughness: 0.25, metalness: 0.7 })
  );
  fallbackRoot.add(body);

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
  fallbackRoot.add(spikeRing);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff4400, emissiveIntensity: 3 })
  );
  eye.position.set(0, 0, 1.7);
  fallbackRoot.add(eye);

  const light    = new THREE.PointLight(0xaa00ff, 6, 25);
  const eyeLight = new THREE.PointLight(0xff4400, 4, 12);
  eyeLight.position.set(0, 0, 2);
  group.add(light);
  group.add(eyeLight);

  group.position.set(0, 0, getBossZ(tunnelLength));
  group.visible = false;
  scene.add(group);

  const boss = {
    group, fallbackRoot, modelRoot, body, spikeRing, spikes, light, eyeLight,
    hp: 10, maxHp: 10,
    fireInterval: FIRE_INTERVAL,
    attackPattern: 0,
    patternPhase:  0,
    baseBodyColor: 0x660088,
    baseLightColor: 0xaa00ff,
    projColor:     0xff2200,
    currentVariant: BOSS_VARIANTS[0],
    modelLoaded: false,
    modelLoadFailed: false,
    modelMaterials: [],
    mixer: null,
    active: false, defeated: false,
    exploding: false, explodeTime: 0, explodeNextPulse: 0,
    explodeParticles: [], explodeFlash1: null, explodeFlash2: null,
    hitFlash: 0, lastFired: 0,
    projectiles: [],
  };

  loadBossModel(boss);
  return boss;
}

function loadBossModel(boss) {
  const loader = new GLTFLoader();
  loader.load(
    BOSS_MODEL_URL,
    (gltf) => {
      const virusMesh = findVirusMesh(gltf.scene);
      if (!virusMesh) {
        boss.modelLoadFailed = true;
        console.warn(`Could not find a mesh in ${BOSS_MODEL_URL}`);
        return;
      }

      const model = prepareBossModel(virusMesh, boss.modelMaterials);
      boss.modelRoot.add(model);
      boss.model = model;
      boss.modelLoaded = true;
      boss.modelRoot.visible = true;
      boss.fallbackRoot.visible = false;
      applyModelVariant(boss, boss.currentVariant);

      if (gltf.animations.length > 0) {
        boss.mixer = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) boss.mixer.clipAction(clip).play();
      }
    },
    undefined,
    (error) => {
      console.warn(`Could not load ${BOSS_MODEL_URL}`, error);
      boss.modelLoadFailed = true;
    },
  );
}

function findVirusMesh(root) {
  let namedMesh = null;
  let largestMesh = null;
  let largestSize = -Infinity;

  root.traverse((child) => {
    if (!child.isMesh) return;
    if (child.name.toLowerCase().includes('virus')) namedMesh = child;

    const size = new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z);
    if (maxAxis > largestSize) {
      largestSize = maxAxis;
      largestMesh = child;
    }
  });

  return namedMesh || largestMesh;
}

function prepareBossModel(sourceMesh, materials) {
  sourceMesh.removeFromParent();
  const model = new THREE.Group();
  model.add(sourceMesh);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z);
  const scale = maxAxis > 0 ? TARGET_BOSS_DIAMETER / maxAxis : 1;
  model.scale.setScalar(scale);
  model.position.copy(center).multiplyScalar(-scale);

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.frustumCulled = false;
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const clonedMaterials = sourceMaterials.map((source) => {
      const material = source.clone();
      material.flatShading = true;
      material.needsUpdate = true;
      materials.push(material);
      return material;
    });
    child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
  });

  return model;
}

// ── Apply variant colors & scale ──────────────────────────────────────────────
function applyVariant(boss, variant) {
  boss.currentVariant = variant;
  boss.body.material.color.set(FAT_CELL_COLOR);
  boss.body.material.emissive.set(FAT_CELL_EMISSIVE);
  boss.light.color.set(FAT_CELL_LIGHT);
  boss.eyeLight.color.set(FAT_CELL_LIGHT);
  boss.baseLightColor = FAT_CELL_LIGHT;
  for (const s of boss.spikes) {
    s.material.color.set(FAT_CELL_SPIKE);
    s.material.emissive.set(FAT_CELL_EMISSIVE);
  }
  boss.group.scale.setScalar(variant.scale);
  boss.baseBodyColor = FAT_CELL_COLOR;
  boss.projColor     = variant.projColor;
  boss.attackPattern = variant.attackPattern;
  applyModelVariant(boss, variant);
}

function applyModelVariant(boss, _variant) {
  const tint = new THREE.Color(FAT_CELL_COLOR);
  for (const material of boss.modelMaterials) {
    if (material.color) {
      if (!material.userData.virusOriginalColor) {
        material.userData.virusOriginalColor = material.color.clone();
      }
      material.color.copy(material.userData.virusOriginalColor).lerp(tint, 0.78);
      material.userData.virusBaseColor = material.color.clone();
    }
    if (material.emissive) {
      material.emissive.set(FAT_CELL_EMISSIVE);
      material.emissiveIntensity = 0.7;
      material.userData.virusBaseEmissive = material.emissive.clone();
      material.userData.virusBaseEmissiveIntensity = material.emissiveIntensity;
    }
  }
}

function setModelHitFlash(boss, flashing) {
  for (const material of boss.modelMaterials) {
    if (material.color && material.userData.virusBaseColor) {
      material.color.copy(flashing ? new THREE.Color(0xffffff) : material.userData.virusBaseColor);
    }
    if (material.emissive && material.userData.virusBaseEmissive) {
      material.emissive.copy(flashing ? new THREE.Color(0xffffff) : material.userData.virusBaseEmissive);
      material.emissiveIntensity = flashing ? 2.8 : material.userData.virusBaseEmissiveIntensity;
    }
  }
}

// ── Reset (called each run) ───────────────────────────────────────────────────
export function resetBoss(boss, scene, tunnelLength = 200, bossHp = 10, fireInterval = FIRE_INTERVAL, variant) {
  clearBossProjectiles(boss, scene);
  // Clean up any leftover explosion from a previous run
  if (boss.explodeParticles) {
    for (const p of boss.explodeParticles) { p.material.dispose(); scene.remove(p); }
  }
  if (boss.explodeFlash1) scene.remove(boss.explodeFlash1);
  if (boss.explodeFlash2) scene.remove(boss.explodeFlash2);

  boss.hp              = bossHp;
  boss.maxHp           = bossHp;
  boss.fireInterval    = fireInterval;
  boss.active          = false;
  boss.defeated        = false;
  boss.exploding       = false;
  boss.explodeTime     = 0;
  boss.explodeParticles = [];
  boss.explodeFlash1   = null;
  boss.explodeFlash2   = null;
  boss.hitFlash        = 0;
  boss.lastFired       = 0;
  boss.patternPhase    = 0;
  boss.group.visible   = false;
  boss.group.position.set(0, 0, getBossZ(tunnelLength));
  boss.body.material.emissiveIntensity = 1.4;
  if (variant) applyVariant(boss, variant);
  if (boss.projMat) boss.projMat.dispose();
  boss.projMat = new THREE.MeshStandardMaterial({
    color: boss.projColor,
    emissive: boss.projColor,
    emissiveIntensity: 2.5,
    roughness: 0,
  });
}

// ── Per-frame update ──────────────────────────────────────────────────────────
export function updateBoss(boss, state, delta, time, torpedoes, scene, onPlayerHit, onBossHit, torpedoDamage = 1) {
  if (boss.exploding) { tickExplosion(boss, scene, delta); return; }
  if (!boss.active || boss.defeated) return;
  if (boss.mixer) boss.mixer.update(delta);

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
    boss.light.color.set(0xffffff);
    boss.light.intensity = 12;
    setModelHitFlash(boss, true);
  } else {
    boss.body.material.emissiveIntensity = 1.4;
    boss.body.material.color.set(boss.baseBodyColor);
    boss.light.color.set(boss.baseLightColor);
    setModelHitFlash(boss, false);
  }

  // Fire — pattern depends on boss variant (cap live projectiles to keep GPU load bounded)
  boss.lastFired += delta;
  if (boss.lastFired >= boss.fireInterval && boss.projectiles.length < 30) {
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
        startExplosion(boss, scene);
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
  const mesh = new THREE.Mesh(projGeo, boss.projMat);
  mesh.position.copy(boss.group.position);
  const dir = new THREE.Vector3(
    tx - boss.group.position.x,
    ty - boss.group.position.y,
    tz - boss.group.position.z
  ).normalize();
  mesh.userData = { dir, traveled: 0, speed };
  scene.add(mesh);
  boss.projectiles.push(mesh);
}

function clearBossProjectiles(boss, scene) {
  for (const p of boss.projectiles) scene.remove(p);
  boss.projectiles = [];
}

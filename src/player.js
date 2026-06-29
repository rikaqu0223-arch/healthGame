import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getTunnelCenter, TUNNEL_RADIUS } from './scene.js';

const SPEED       = 5.04; // 60% of the previous forward speed
const STRAFE      = 6;    // lateral / vertical speed
const BANK_ANGLE  = 0.35; // roll when strafing
const WALL_HARD   = TUNNEL_RADIUS - 0.15; // push-back boundary
const WALL_DAMAGE = TUNNEL_RADIUS - 0.5;  // damage zone starts here
const SUBMARINE_MODEL_URL = '/models/low_poly_submarine.glb';
const TARGET_MODEL_LENGTH = 1.75;

export function createSubmarine(scene) {
  const group = new THREE.Group();
  const fallback = createFallbackSubmarine();
  const prop = fallback.prop;

  group.add(fallback.group);
  group.add(createSubmarineLight());
  scene.add(group);

  const player = {
    group,
    prop,
    modelLoaded: false,
    modelLoadFailed: false,
  };

  loadSubmarineModel(group, fallback.group, player);
  return player;
}

function createFallbackSubmarine() {
  const group = new THREE.Group();

  // Body: elongated ellipsoid via scaled sphere.
  const bodyGeo = new THREE.SphereGeometry(0.35, 16, 10);
  bodyGeo.scale(2.2, 1, 1);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x00aadd,
    emissive: 0x003355,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.7,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Conning tower
  const towerGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.3, 8);
  const tower = new THREE.Mesh(towerGeo, bodyMat);
  tower.position.set(0, 0.35, 0);
  group.add(tower);

  // Propeller disc (flat cylinder)
  const propGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.04, 12);
  const propMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.9, roughness: 0.2 });
  const prop = new THREE.Mesh(propGeo, propMat);
  prop.rotation.z = Math.PI / 2;
  prop.position.x = -0.8;
  group.add(prop);

  // Front light (emissive sphere)
  const lampGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x88ffff, emissiveIntensity: 3 });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.x = 0.78;
  group.add(lamp);

  return { group, prop };
}

function createSubmarineLight() {
  const light = new THREE.PointLight(0x44aaff, 2, 8);
  light.position.set(0, 0, -0.4);
  return light;
}

function loadSubmarineModel(group, fallback, player) {
  const loader = new GLTFLoader();

  loader.load(
    SUBMARINE_MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      prepareModel(model);
      fallback.visible = false;
      group.add(model);
      player.model = model;
      player.modelLoaded = true;
    },
    undefined,
    (error) => {
      console.warn(`Could not load ${SUBMARINE_MODEL_URL}`, error);
      player.modelLoadFailed = true;
    },
  );
}

function prepareModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const longestAxis = Math.max(size.x, size.y, size.z);
  const scale = longestAxis > 0 ? TARGET_MODEL_LENGTH / longestAxis : 1;

  orientModelByLongestAxis(model, size);
  model.scale.setScalar(scale);
  model.position.copy(center).multiplyScalar(scale).applyEuler(model.rotation).multiplyScalar(-1);

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.frustumCulled = false;
    if (child.material) {
      child.material.flatShading = true;
      child.material.needsUpdate = true;
    }
  });
}

function orientModelByLongestAxis(model, size) {
  if (size.x >= size.y && size.x >= size.z) {
    model.rotation.y = Math.PI / 2;
  } else if (size.y >= size.x && size.y >= size.z) {
    model.rotation.x = Math.PI / 2;
  } else {
    model.rotation.y = Math.PI;
  }
}

// Cosmetic style per level (clamped at last entry for levels beyond)
const SUB_COSMETICS = [
  { hull: 0x00aadd, emissive: 0x003355, intensity: 0.5,  light: 0x44aaff },  // 1 blue
  { hull: 0x00ddff, emissive: 0x004466, intensity: 0.9,  light: 0x00ddff },  // 2 cyan
  { hull: 0x22ff88, emissive: 0x004422, intensity: 1.1,  light: 0x22ff88 },  // 3 green
  { hull: 0xffcc00, emissive: 0x443300, intensity: 1.3,  light: 0xffcc00 },  // 4 gold
  { hull: 0xff6600, emissive: 0x441100, intensity: 1.5,  light: 0xff8800 },  // 5 orange
  { hull: 0xdd44ff, emissive: 0x440066, intensity: 1.7,  light: 0xdd44ff },  // 6 purple
  { hull: 0xffffff, emissive: 0x336688, intensity: 2.2,  light: 0xffffff },  // 7+ white
];

export function applySubmarineLevel(player, level) {
  const style = SUB_COSMETICS[Math.min(level - 1, SUB_COSMETICS.length - 1)];
  player.group.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.color.setHex(style.hull);
      child.material.emissive.setHex(style.emissive);
      child.material.emissiveIntensity = style.intensity;
      child.material.needsUpdate = true;
    }
    if (child.isPointLight) {
      child.color.setHex(style.light);
    }
  });
}

export function createInputState() {
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });
  return keys;
}

export function updatePlayer(player, keys, delta, state) {
  if (!state.running) return false;

  const { group, prop } = player;

  state.z -= SPEED * delta;

  let dx = 0, dy = 0;
  if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  if (keys['KeyW'] || keys['ArrowUp'])    dy += 1;
  if (keys['KeyS'] || keys['ArrowDown'])  dy -= 1;

  state.px += dx * STRAFE * delta;
  state.py += dy * STRAFE * delta;

  // Radial wall constraint — tunnel curves so walls close in on turns
  const center = getTunnelCenter(state.z);
  const offX   = state.px - center.x;
  const offY   = state.py - center.y;
  const offMag = Math.sqrt(offX * offX + offY * offY);

  if (offMag > WALL_HARD) {
    const sc = WALL_HARD / offMag;
    state.px = center.x + offX * sc;
    state.py = center.y + offY * sc;
  }

  group.position.set(state.px, state.py, state.z);
  group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, -dx * BANK_ANGLE, 0.15);
  group.rotation.y = THREE.MathUtils.lerp(group.rotation.y,  dx * 0.1, 0.1);
  if (prop.visible) prop.rotation.x += 8 * delta;

  return offMag > WALL_DAMAGE; // true = player is touching the wall
}

export function updateCamera(camera, state, delta) {
  const center  = getTunnelCenter(state.z);
  const targetX = state.px * 0.4 + center.x * 0.35;
  const targetY = state.py * 0.3 + 0.8 + center.y * 0.25;
  const targetZ = state.z + 5;

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 6 * delta);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 6 * delta);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 8 * delta);

  camera.lookAt(state.px, state.py, state.z - 10);
}

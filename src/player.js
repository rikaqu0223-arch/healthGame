import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const SPEED = 14;         // units / second forward
const STRAFE = 6;         // lateral / vertical speed
const MAX_OFFSET = 2.8;   // max radial distance from center
const BANK_ANGLE = 0.35;  // roll when strafing
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

export function createInputState() {
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });
  return keys;
}

export function updatePlayer(player, keys, delta, state) {
  if (!state.running) return;

  const { group, prop } = player;

  // Forward progress
  state.z -= SPEED * delta;

  // Lateral / vertical
  let dx = 0, dy = 0;
  if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  if (keys['KeyW'] || keys['ArrowUp'])    dy += 1;
  if (keys['KeyS'] || keys['ArrowDown'])  dy -= 1;

  state.px = THREE.MathUtils.clamp(state.px + dx * STRAFE * delta, -MAX_OFFSET, MAX_OFFSET);
  state.py = THREE.MathUtils.clamp(state.py + dy * STRAFE * delta, -MAX_OFFSET, MAX_OFFSET);

  group.position.set(state.px, state.py, state.z);

  // Roll when strafing
  group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, -dx * BANK_ANGLE, 0.15);
  group.rotation.y = THREE.MathUtils.lerp(group.rotation.y,  dx * 0.1, 0.1);

  // Spin the fallback propeller while the GLB is still loading.
  if (prop.visible) prop.rotation.x += 8 * delta;
}

export function updateCamera(camera, state, delta) {
  const targetX = state.px * 0.4;
  const targetY = state.py * 0.3 + 0.8;
  const targetZ = state.z + 5;

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 6 * delta);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 6 * delta);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 8 * delta);

  camera.lookAt(state.px, state.py, state.z - 10);
}

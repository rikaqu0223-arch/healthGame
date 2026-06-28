import * as THREE from 'three';
import { TUNNEL_RADIUS } from './scene.js';

const SPEED = 14;         // units / second forward
const STRAFE = 6;         // lateral / vertical speed
const MAX_OFFSET = 2.8;   // max radial distance from center
const BANK_ANGLE = 0.35;  // roll when strafing

export function createSubmarine(scene) {
  const group = new THREE.Group();

  // Body — elongated ellipsoid via scaled sphere
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

  // Point light attached to sub
  const light = new THREE.PointLight(0x44aaff, 2, 8);
  group.add(light);

  scene.add(group);
  return { group, prop };
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

  // Spin propeller
  prop.rotation.x += 8 * delta;
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

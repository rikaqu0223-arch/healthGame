import './style.css';
import * as THREE from 'three';
import { createRenderer, createScene, createCamera, buildTunnel, buildLighting, onResize, TUNNEL_LENGTH } from './scene.js';
import { createSubmarine, createInputState, updatePlayer, updateCamera } from './player.js';
import { buildLevel, updateObjects, checkCollisions } from './objects.js';
import { createSonar, fireSonar, updateSonar } from './sonar.js';
import { updateHUD, showEnd } from './hud.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('c');
const renderer = createRenderer(canvas);
const scene    = createScene();
const camera   = createCamera();

buildTunnel(scene);
const pulseLights = buildLighting(scene);

const player = createSubmarine(scene);
const keys   = createInputState();
const sonar  = createSonar(scene);

let objects = [];
let state   = makeState();
const clock = new THREE.Clock(false);

// ── Game state factory ────────────────────────────────────────────────────────
function makeState() {
  return {
    running:  false,
    over:     false,
    z:        0,       // player z progress (negative = forward)
    px:       0,       // lateral position
    py:       0,       // vertical position
    score:    0,
    energy:   100,
    timeLeft: 90,
  };
}

// ── Init / reset ──────────────────────────────────────────────────────────────
function init() {
  for (const o of objects) scene.remove(o);
  objects = buildLevel(scene, TUNNEL_LENGTH);

  state = makeState();

  player.group.position.set(0, 0, 0);
  camera.position.set(0, 0.8, 5);

  document.getElementById('end-overlay').classList.remove('active');
  document.getElementById('end-overlay').classList.add('hidden');

  updateHUD(state);
}

// ── Start ─────────────────────────────────────────────────────────────────────
function startGame() {
  document.getElementById('overlay').classList.remove('active');
  document.getElementById('overlay').classList.add('hidden');
  init();
  state.running = true;
  clock.start();
}

// ── UI wiring ────────────────────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', startGame);

document.getElementById('restart-btn').addEventListener('click', () => {
  init();
  state.running = true;
  clock.start();
});

document.getElementById('sonar-btn').addEventListener('click', () => fireSonar(sonar));

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); fireSonar(sonar); }
  if (e.code === 'KeyR' && state.over) {
    init();
    state.running = true;
    clock.start();
  }
});

window.addEventListener('resize', () => onResize(renderer, camera));

// ── Render loop ───────────────────────────────────────────────────────────────
const playerPos = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);
  const time  = clock.elapsedTime;

  if (state.running && !state.over) {
    state.timeLeft -= delta;

    updatePlayer(player, keys, delta, state);
    updateCamera(camera, state, delta);

    playerPos.set(state.px, state.py, state.z);

    updateSonar(sonar, playerPos, delta);

    updateObjects(objects, time);
    checkCollisions(
      objects,
      playerPos,
      (_crystal) => { state.score += 10; },
      (_block)   => { state.energy = Math.max(0, state.energy - 15); },
    );

    for (let i = 0; i < pulseLights.length; i++) {
      pulseLights[i].intensity = 1.2 + Math.sin(time * 3 + i * 1.3) * 0.5;
    }

    updateHUD(state);

    const progress = Math.abs(state.z) / TUNNEL_LENGTH;
    if (progress >= 1 || state.timeLeft <= 0 || state.energy <= 0) {
      state.running = false;
      state.over    = true;
      showEnd(state);
    }
  }

  renderer.render(scene, camera);
});

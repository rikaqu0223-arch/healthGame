import './style.css';
import * as THREE from 'three';
import { createRenderer, createScene, createCamera, buildTunnel, buildLighting, onResize, TUNNEL_LENGTH } from './scene.js';
import { createSubmarine, createInputState, updatePlayer, updateCamera } from './player.js';
import { buildLevel, updateObjects, checkCollisions } from './objects.js';
import { createSonar, fireSonar, updateSonar } from './sonar.js';
import { updateHUD, showEnd, flash, showBossHUD, updateBossBar, hideBossHUD } from './hud.js';
import { createWeaponSystem, fireTorpedo, updateWeapons } from './weapons.js';
import { createBoss, resetBoss, updateBoss, BOSS_ACTIVATE } from './boss.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('c');
const renderer = createRenderer(canvas);
const scene    = createScene();
const camera   = createCamera();

buildTunnel(scene);
const pulseLights = buildLighting(scene);

const player  = createSubmarine(scene);
const keys    = createInputState();
const sonar   = createSonar(scene);
const weapons = createWeaponSystem();
const boss    = createBoss(scene);

let objects = [];
let state   = makeState();
const clock = new THREE.Clock(false);

// ── Game state factory ────────────────────────────────────────────────────────
function makeState() {
  return {
    running:      false,
    over:         false,
    z:            0,
    px:           0,
    py:           0,
    score:        0,
    energy:       100,
    timeLeft:     90,
    bossDefeated: false,
  };
}

// ── Init / reset ──────────────────────────────────────────────────────────────
function init() {
  for (const o of objects) scene.remove(o);
  objects = buildLevel(scene, TUNNEL_LENGTH);

  state = makeState();
  resetBoss(boss, scene);
  hideBossHUD();

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
document.getElementById('fire-btn').addEventListener('click', () => {
  if (state.running && !state.over)
    fireTorpedo(weapons, scene, state.px, state.py, state.z, clock.elapsedTime);
});

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); fireSonar(sonar); }
  if (e.code === 'KeyF' && state.running && !state.over) {
    fireTorpedo(weapons, scene, state.px, state.py, state.z, clock.elapsedTime);
  }
  if (e.code === 'KeyR' && state.over) {
    init();
    state.running = true;
    clock.start();
  }
});

window.addEventListener('click', e => {
  if (!state.running || state.over) return;
  if (e.target.closest('button')) return;
  fireTorpedo(weapons, scene, state.px, state.py, state.z, clock.elapsedTime);
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

    // Halt forward progress while boss is alive
    if (boss.active && !boss.defeated) {
      state.z = Math.max(state.z, BOSS_ACTIVATE + 5);
    }

    updateCamera(camera, state, delta);

    playerPos.set(state.px, state.py, state.z);

    updateSonar(sonar, playerPos, delta);

    updateObjects(objects, time);
    updateWeapons(weapons, objects, scene, delta, () => flash('hit'));
    checkCollisions(
      objects,
      playerPos,
      (_crystal) => { state.score += 10; },
      (_block)   => { state.energy = Math.max(0, state.energy - 15); flash('damage'); },
      (_orb)     => { state.energy = Math.min(100, state.energy + 25); flash('energy'); },
    );

    // Activate boss when player nears the end
    if (!boss.active && state.z <= BOSS_ACTIVATE) {
      boss.active = true;
      boss.group.visible = true;
      showBossHUD(boss.hp, boss.maxHp);
    }

    if (boss.active) {
      updateBoss(
        boss, state, delta, time, weapons.projectiles, scene,
        () => { state.energy = Math.max(0, state.energy - 20); flash('damage'); },
        (hp) => { updateBossBar(hp, boss.maxHp); flash('hit'); },
      );

      if (boss.defeated) {
        state.bossDefeated = true;
        state.running = false;
        state.over    = true;
        hideBossHUD();
        showEnd(state);
      }
    }

    for (let i = 0; i < pulseLights.length; i++) {
      pulseLights[i].intensity = 1.2 + Math.sin(time * 3 + i * 1.3) * 0.5;
    }

    updateHUD(state);

    if (state.timeLeft <= 0 || state.energy <= 0) {
      state.running = false;
      state.over    = true;
      showEnd(state);
    }
  }

  renderer.render(scene, camera);
});

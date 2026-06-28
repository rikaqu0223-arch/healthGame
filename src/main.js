import './style.css';
import * as THREE from 'three';
import { createRenderer, createScene, createCamera, buildTunnel, buildLighting, buildBloodEnvironment, onResize } from './scene.js';
import { createSubmarine, createInputState, updatePlayer, updateCamera } from './player.js';
import { buildLevel, updateObjects, checkCollisions, clearObstaclesAhead, clearObstaclesAround } from './objects.js';
import { loadBroccoliModel } from './broccoli.js';
import { loadFriesModel } from './fries.js';
import { loadWBCModel } from './wbc.js';
import { createSonar, fireSonar, updateSonar } from './sonar.js';
import { updateHUD, showEnd, flash, showBossHUD, updateBossBar, hideBossHUD, updateRunHUD } from './hud.js';
import { createWeaponSystem, resetWeapons, fireTorpedo, updateWeapons } from './weapons.js';
import { createBoss, resetBoss, updateBoss, getBossActivateZ, getBossVariant } from './boss.js';
import { getUpgradeChoices } from './upgrades.js';
import { showCutscene } from './story.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('c');
const renderer = createRenderer(canvas);
const scene    = createScene();
const camera   = createCamera();

const pulseLights = buildLighting(scene);
let tunnelMesh    = null;
let bloodEnv      = null;

const player  = createSubmarine(scene);
const keys    = createInputState();
const sonar   = createSonar(scene);
const weapons = createWeaponSystem();
const boss    = createBoss(scene);

// ── Persistent run config (survives restarts) ─────────────────────────────────
const runConfig = {
  run:          1,
  tunnelLength: 200,
  maxEnergy:    100,
  torpedoSpeed: 40,
  torpedoDamage: 1,
  spreadShot:   false,
  shieldHits:   0,
  energyRegen:  0,
};

// Preload GLBs in background — done well before player clicks Start
loadBroccoliModel();
loadFriesModel();
loadWBCModel();

let objects = [];
let state   = makeState();
const clock = new THREE.Clock(false);

// ── Helpers ───────────────────────────────────────────────────────────────────
function bossDifficulty() {
  return {
    hp:           10 + (runConfig.run - 1) * 3,
    fireInterval: Math.max(0.6, 1.8 - (runConfig.run - 1) * 0.15),
  };
}

function makeState() {
  return {
    running:      false,
    over:         false,
    z:            0,
    px:           0,
    py:           0,
    score:        0,
    energy:       runConfig.maxEnergy,
    timeLeft:     90 + (runConfig.run - 1) * 15,
    shieldHits:   runConfig.shieldHits,
    bossDefeated: false,
  };
}

// ── Init / reset ──────────────────────────────────────────────────────────────
function init() {
  for (const o of objects) scene.remove(o);
  if (tunnelMesh) scene.remove(tunnelMesh);
  if (bloodEnv)   scene.remove(bloodEnv);
  tunnelMesh = buildTunnel(scene, runConfig.tunnelLength);
  bloodEnv   = buildBloodEnvironment(scene, runConfig.tunnelLength);
  objects    = buildLevel(scene, runConfig.tunnelLength, runConfig.run);

  const { hp, fireInterval } = bossDifficulty();
  const variant = getBossVariant(runConfig.run);
  resetWeapons(weapons, scene);
  resetBoss(boss, scene, runConfig.tunnelLength, hp, fireInterval, variant);
  hideBossHUD();

  state = makeState();
  player.group.position.set(0, 0, 0);
  camera.position.set(0, 0.8, 5);

  document.getElementById('end-overlay').classList.remove('active');
  document.getElementById('end-overlay').classList.add('hidden');
  document.getElementById('upgrade-overlay').classList.add('hidden');
  document.getElementById('congrats-overlay').classList.add('hidden');

  updateHUD(state);
  updateRunHUD(runConfig.run, state.shieldHits);
}

// ── Congratulations screen ────────────────────────────────────────────────────
function showCongratulations() {
  document.getElementById('congrats-score').textContent  = state.score;
  document.getElementById('congrats-runs').textContent   = runConfig.run;
  document.getElementById('congrats-energy').textContent = Math.round(state.energy);
  document.getElementById('congrats-overlay').classList.remove('hidden');
}

document.getElementById('congrats-play-again').addEventListener('click', () => {
  document.getElementById('congrats-overlay').classList.add('hidden');
  runConfig.run = 1; runConfig.tunnelLength = 200;
  runConfig.maxEnergy = 100; runConfig.torpedoSpeed = 40;
  runConfig.torpedoDamage = 1; runConfig.spreadShot = false;
  runConfig.shieldHits = 0; runConfig.energyRegen = 0;
  init();
  state.running = true;
  clock.start();
});

// ── Upgrade screen ────────────────────────────────────────────────────────────
function showUpgradeScreen() {
  const choices = getUpgradeChoices(runConfig);
  const container = document.getElementById('upgrade-cards');
  container.innerHTML = '';

  for (const upg of choices) {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `<div class="upg-name">${upg.name}</div><div class="upg-desc">${upg.desc}</div>`;
    card.addEventListener('click', () => selectUpgrade(upg));
    container.appendChild(card);
  }

  document.getElementById('upgrade-run-num').textContent = runConfig.run;
  document.getElementById('upgrade-overlay').classList.remove('hidden');
}

function selectUpgrade(upg) {
  upg.apply(runConfig);
  runConfig.run++;
  runConfig.tunnelLength += 50;
  init();
  state.running = true;
  clock.start();
}

// ── Start ─────────────────────────────────────────────────────────────────────
function startGame() {
  document.getElementById('overlay').classList.remove('active');
  document.getElementById('overlay').classList.add('hidden');
  showCutscene(0, () => {
    init();
    state.running = true;
    clock.start();
  });
}

// ── UI wiring ─────────────────────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', startGame);

document.getElementById('restart-btn').addEventListener('click', () => {
  // Full reset — wipe run progress
  runConfig.run          = 1;
  runConfig.tunnelLength = 200;
  runConfig.maxEnergy    = 100;
  runConfig.torpedoSpeed = 40;
  runConfig.torpedoDamage = 1;
  runConfig.spreadShot   = false;
  runConfig.shieldHits   = 0;
  runConfig.energyRegen  = 0;
  init();
  state.running = true;
  clock.start();
});

document.getElementById('sonar-btn').addEventListener('click', () => fireSonar(sonar));
document.getElementById('fire-btn').addEventListener('click', () => {
  if (state.running && !state.over)
    fireTorpedo(weapons, scene, state.px, state.py, state.z, clock.elapsedTime, runConfig);
});

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); fireSonar(sonar); }
  if (e.code === 'KeyF' && state.running && !state.over)
    fireTorpedo(weapons, scene, state.px, state.py, state.z, clock.elapsedTime, runConfig);
  if (e.code === 'KeyR' && state.over) {
    runConfig.run = 1; runConfig.tunnelLength = 200;
    runConfig.maxEnergy = 100; runConfig.torpedoSpeed = 40;
    runConfig.torpedoDamage = 1; runConfig.spreadShot = false;
    runConfig.shieldHits = 0; runConfig.energyRegen = 0;
    init(); state.running = true; clock.start();
  }
});

window.addEventListener('click', e => {
  if (!state.running || state.over) return;
  if (e.target.closest('button, .upgrade-card')) return;
  fireTorpedo(weapons, scene, state.px, state.py, state.z, clock.elapsedTime, runConfig);
});

window.addEventListener('resize', () => onResize(renderer, camera));

// ── Damage helper (respects shield) ──────────────────────────────────────────
function takeDamage(amount) {
  if (state.shieldHits > 0) {
    state.shieldHits--;
    flash('hit');
    updateRunHUD(runConfig.run, state.shieldHits);
  } else {
    state.energy = Math.max(0, state.energy - amount);
    flash('damage');
  }
}

// ── Render loop ───────────────────────────────────────────────────────────────
const playerPos = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);
  const time  = clock.elapsedTime;

  if (state.running && !state.over) {
    state.timeLeft -= delta;

    // Energy regen
    if (runConfig.energyRegen > 0)
      state.energy = Math.min(runConfig.maxEnergy, state.energy + runConfig.energyRegen * delta);

    updatePlayer(player, keys, delta, state);
    updateCamera(camera, state, delta);
    playerPos.set(state.px, state.py, state.z);

    updateSonar(sonar, playerPos, delta);
    updateObjects(objects, time);
    updateWeapons(weapons, objects, scene, delta, () => flash('hit'));
    checkCollisions(
      objects,
      playerPos,
      (_crystal) => { state.score += 10; },
      (_block)   => { takeDamage(15); },
      (_orb)     => { state.energy = Math.min(runConfig.maxEnergy, state.energy + 25); flash('energy'); },
      (_broc)    => {
        const cleared = clearObstaclesAhead(objects, state.z, 40);
        state.score += 50 + cleared * 5;
        flash('broccoli');
      },
      (_fries)   => {
        const cleared = clearObstaclesAround(objects, playerPos, 25);
        state.score += 30 + cleared * 5;
        flash('fries');
      },
    );

    // Activate boss when player nears the end
    if (!boss.active && state.z <= getBossActivateZ(runConfig.tunnelLength)) {
      boss.active = true;
      boss.group.visible = true;
      showBossHUD(boss.hp, boss.maxHp, getBossVariant(runConfig.run).name);
    }

    if (boss.active) {
      updateBoss(
        boss, state, delta, time, weapons.projectiles, scene,
        () => { takeDamage(20); },
        (hp) => { updateBossBar(hp, boss.maxHp); flash('hit'); },
        runConfig.torpedoDamage,
      );

      if (boss.defeated) {
        state.bossDefeated = true;
        state.running = false;
        state.over    = true;
        hideBossHUD();
        const isFinal = runConfig.run >= 5;
        showCutscene(runConfig.run, () => isFinal ? showCongratulations() : showUpgradeScreen());
      }
    }

    for (let i = 0; i < pulseLights.length; i++)
      pulseLights[i].intensity = 1.2 + Math.sin(time * 3 + i * 1.3) * 0.5;

    updateHUD(state);

    if (state.timeLeft <= 0 || state.energy <= 0) {
      state.running = false;
      state.over    = true;
      showEnd(state);
    }
  }

  renderer.render(scene, camera);
});

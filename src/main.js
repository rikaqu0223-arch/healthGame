import './style.css';
import * as THREE from 'three';
import { createRenderer, createScene, createCamera, buildTunnel, buildLighting, buildBloodEnvironment, onResize } from './scene.js';
import { createSubmarine, createInputState, updatePlayer, updateCamera, applySubmarineLevel } from './player.js';
import { buildLevel, updateObjects, checkCollisions, clearObstaclesAhead, clearObstaclesAround, clearLevelObjects } from './objects.js';
import { loadBroccoliModel } from './broccoli.js';
import { loadFriesModel } from './fries.js';
import { loadFishModel } from './fish.js';
import { loadHamburgerModel } from './hamburger.js';
import { loadWBCModel } from './wbc.js';
import { createSonar, fireSonar, updateSonar } from './sonar.js';
import { updateHUD, showEnd, flash, showBossHUD, updateBossBar, hideBossHUD, updateRunHUD, updateLevelHUD, showLevelUp } from './hud.js';
import { createXPState, resetXP, addXP, XP_VALUES } from './xp.js';
import { createWeaponSystem, resetWeapons, fireTorpedo, updateWeapons } from './weapons.js';
import { createBoss, resetBoss, updateBoss, tickBossExplosion, getBossActivateZ, getBossVariant } from './boss.js';
import { spawnExplosion, updateExplosions, EXPL_COLORS } from './particles.js';
import { getUpgradeChoices } from './upgrades.js';
import { showCutscene } from './story.js';
import { getStoredPlayerName, initializeLeaderboard, storePlayerName } from './leaderboard.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('c');
const renderer = createRenderer(canvas);
const scene    = createScene();
const camera   = createCamera();

const pulseLights = buildLighting(scene);
let tunnelMesh    = null;
let bloodEnv      = null;
const xpState     = createXPState();

const player  = createSubmarine(scene);
const keys    = createInputState();
const sonar   = createSonar(scene);
const weapons = createWeaponSystem();
const boss    = createBoss(scene);

const isLocalDev = import.meta.env.DEV;
const localMealApiKey = import.meta.env.VITE_MEAL_API_KEY || '';
const localMealApiUrl = 'https://api.tu-zi.com/v1/chat/completions';

// ── Persistent run config (survives restarts) ─────────────────────────────────
const runConfig = {
  run:          1,
  tunnelLength: 200,
  startingEnergy: 100,
  maxEnergy:    100,
  torpedoSpeed: 40,
  torpedoDamage: 1,
  spreadShot:   false,
  shieldHits:   0,
  energyRegen:  0,
  totalScore:   0,
  attemptId:    0,
  veggieCount:  0,
  junkFoodCount: 0,
};

let mealScan = {
  mealName:       'Unscanned meal',
  healthScore:    100,
  startingEnergy: 100,
  grade:          'A',
  reason:         'Default launch health.',
  photoFile:      null,
  photoUrl:       '',
  photoSourceUrl: '',
};

// Preload GLBs in background — done well before player clicks Start
loadBroccoliModel();
loadFriesModel();
loadFishModel();
loadHamburgerModel();
loadWBCModel();

let objects = [];
let state   = makeState();
const clock = new THREE.Clock(false);
document.body.classList.add('pregame');
document.body.classList.remove('game-active');

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
    score:        runConfig.totalScore,
    energy:       Math.min(runConfig.startingEnergy, runConfig.maxEnergy),
    maxEnergy:    runConfig.maxEnergy,
    timeLeft:     90 + (runConfig.run - 1) * 15,
    shieldHits:   runConfig.shieldHits,
    bossDefeated:    false,
    wallDmgCooldown: 0,
    camShake:        0,
  };
}

function resetRunProgress(startingEnergy = mealScan.startingEnergy) {
  runConfig.attemptId++;
  runConfig.run            = 1;
  runConfig.tunnelLength   = 200;
  runConfig.startingEnergy = startingEnergy;
  runConfig.maxEnergy      = 100;
  runConfig.torpedoSpeed   = 40;
  runConfig.torpedoDamage  = 1;
  runConfig.spreadShot     = false;
  runConfig.shieldHits     = 0;
  runConfig.energyRegen    = 0;
  runConfig.totalScore     = 0;
  runConfig.veggieCount    = 0;
  runConfig.junkFoodCount  = 0;
}

function addScore(points) {
  state.score += points;
  runConfig.totalScore = state.score;
}

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 60;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gradeFromScore(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractJson(content) {
  const cleaned = String(content || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

async function analyzeMealImage(imageSource) {
  if (isLocalDev && !localMealApiKey) {
    throw new Error('Meal scanner API key is missing. Add VITE_MEAL_API_KEY to .env.local.');
  }

  const modelPayload = {
    model: 'gemini-3-flash-preview',
    messages: [
      {
        role: 'system',
        content: 'You grade meal photos for a game. Return only valid JSON. This is not medical advice.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Look at the image and return ONLY minified JSON, no markdown: {"mealName":"...","healthScore":0-100,"startingEnergy":0-100,"grade":"A/B/C/D/F","reason":"short"}. startingEnergy must equal healthScore. Grade mapping: A=85-100, B=70-84, C=55-69, D=40-54, F=0-39.',
          },
          {
            type: 'image_url',
            image_url: { url: imageSource },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    stream: false,
    temperature: 0.1,
    max_tokens: 2048,
  };

  const response = await fetch(isLocalDev ? localMealApiUrl : '/api/analyze-meal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(isLocalDev ? { Authorization: `Bearer ${localMealApiKey}` } : {}),
    },
    body: JSON.stringify(isLocalDev ? modelPayload : { imageSource }),
  });

  const raw = await response.text();
  if (!raw.trim()) throw new Error(`Meal scanner returned HTTP ${response.status} with an empty body.`);

  let data;
  try {
    data = JSON.parse(raw);
  } catch (_error) {
    throw new Error(`Meal scanner returned non-JSON response: ${raw.slice(0, 180)}`);
  }

  if (!response.ok) {
    const message = data.error?.message || data.message || `Meal scanner failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Meal scanner returned no meal description.');

  const result = extractJson(content);
  const score = clampScore(result.startingEnergy ?? result.healthScore);
  return {
    mealName:       result.mealName || 'Selected meal',
    healthScore:    score,
    startingEnergy: score,
    grade:          /^[ABCDF]$/.test(result.grade) ? result.grade : gradeFromScore(score),
    reason:         result.reason || 'The scanner estimated this from the visible meal balance.',
  };
}

function showMealResult() {
  document.getElementById('meal-result-name').textContent = mealScan.mealName;
  document.getElementById('meal-result-score').textContent = `${mealScan.startingEnergy} HEALTH`;
  document.getElementById('meal-result-grade').textContent = `GRADE ${mealScan.grade}`;
  document.getElementById('meal-result-reason').textContent = mealScan.reason;
  document.getElementById('meal-result-starting-health').innerHTML =
    `You will start the game with <strong>${mealScan.startingEnergy} health</strong>.`;
  document.getElementById('meal-overlay').classList.add('hidden');
  document.getElementById('meal-overlay').classList.remove('active');
  document.getElementById('meal-result-overlay').classList.remove('hidden');
}

function showTitleScreen() {
  document.getElementById('meal-result-overlay').classList.add('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('overlay').classList.add('active');
}

function skipMealScan() {
  mealScan = {
    mealName:       'Unscanned meal',
    healthScore:    100,
    startingEnergy: 100,
    grade:          'A',
    reason:         'Default launch health.',
    photoFile:      null,
    photoUrl:       '',
    photoSourceUrl: '',
  };
  resetRunProgress(mealScan.startingEnergy);
  document.getElementById('meal-overlay').classList.add('hidden');
  document.getElementById('meal-overlay').classList.remove('active');
  showTitleScreen();
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
  resetRunProgress();
  resetXP(xpState);
  applySubmarineLevel(player, 1);
  init();
  document.body.classList.remove('pregame');
  document.body.classList.add('game-active');
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
  const playerNameInput = document.getElementById('player-name-input');
  const playerName = storePlayerName(playerNameInput.value);
  if (!playerName) {
    playerNameInput.focus();
    return;
  }

  document.getElementById('overlay').classList.remove('active');
  document.getElementById('overlay').classList.add('hidden');
  showCutscene(0, () => {
    resetRunProgress(mealScan.startingEnergy);
    init();
    document.body.classList.remove('pregame');
    document.body.classList.add('game-active');
    state.running = true;
    clock.start();
  });
}

// ── UI wiring ─────────────────────────────────────────────────────────────────
const playerNameInput = document.getElementById('player-name-input');
playerNameInput.value = getStoredPlayerName();
document.getElementById('player-name-form').addEventListener('submit', (event) => {
  event.preventDefault();
  startGame();
});

document.getElementById('meal-file').addEventListener('change', async () => {
  const file = document.getElementById('meal-file').files[0];
  if (!file) return;
  const preview = document.getElementById('meal-preview');
  preview.src = await readFileAsDataUrl(file);
  preview.classList.remove('hidden');
});

document.getElementById('meal-url').addEventListener('input', () => {
  const file = document.getElementById('meal-file').files[0];
  const url = document.getElementById('meal-url').value.trim();
  if (file || !url) return;
  const preview = document.getElementById('meal-preview');
  preview.src = url;
  preview.classList.remove('hidden');
});

document.getElementById('meal-next-btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('meal-file');
  const urlInput = document.getElementById('meal-url');
  const status = document.getElementById('meal-status');
  const nextBtn = document.getElementById('meal-next-btn');
  const file = fileInput.files[0];
  const typedUrl = urlInput.value.trim();

  if (!file && !typedUrl) {
    status.textContent = 'Choose a meal image or enter an image URL before continuing.';
    return;
  }

  nextBtn.disabled = true;
  status.textContent = 'Scanning meal...';

  try {
    const imageSource = file ? await readFileAsDataUrl(file) : typedUrl;
    mealScan = {
      ...await analyzeMealImage(imageSource),
      photoFile: file || null,
      photoUrl: '',
      photoSourceUrl: file ? '' : typedUrl,
    };
    resetRunProgress(mealScan.startingEnergy);
    showMealResult();
  } catch (error) {
    status.textContent = error.message || 'Meal scan failed. Try another image.';
  } finally {
    nextBtn.disabled = false;
  }
});

document.getElementById('meal-continue-btn').addEventListener('click', showTitleScreen);
document.getElementById('meal-skip-btn').addEventListener('click', skipMealScan);

document.getElementById('restart-btn').addEventListener('click', () => {
  // Full reset — wipe run progress
  resetRunProgress();
  resetXP(xpState);
  applySubmarineLevel(player, 1);
  init();
  document.body.classList.remove('pregame');
  document.body.classList.add('game-active');
  state.running = true;
  clock.start();
});

document.getElementById('sonar-btn').addEventListener('click', () => fireSonar(sonar));
document.getElementById('fire-btn').addEventListener('click', () => {
  if (state.running && !state.over)
    fireTorpedo(weapons, scene, state.px, state.py, state.z, clock.elapsedTime, { ...runConfig, level: xpState.level });
});

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); fireSonar(sonar); }
  if (e.code === 'KeyF' && state.running && !state.over)
    fireTorpedo(weapons, scene, state.px, state.py, state.z, clock.elapsedTime, { ...runConfig, level: xpState.level });
  if (e.code === 'KeyR' && state.over) {
    resetRunProgress();
    resetXP(xpState);
    applySubmarineLevel(player, 1);
    init(); document.body.classList.remove('pregame'); document.body.classList.add('game-active'); state.running = true; clock.start();
  }
});

window.addEventListener('click', e => {
  if (!state.running || state.over) return;
  if (e.target.closest('button, .upgrade-card')) return;
  fireTorpedo(weapons, scene, state.px, state.py, state.z, clock.elapsedTime, { ...runConfig, level: xpState.level });
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

const leaderboard = initializeLeaderboard();
document.getElementById('leaderboard-btn').addEventListener('click', () => leaderboard.open());
document.getElementById('end-save-score').addEventListener('click', () => {
  leaderboard.open({
    score: state.score,
    runsCompleted: Math.max(0, runConfig.run - 1),
    outcome: 'flow_blocked',
    attemptId: runConfig.attemptId,
    veggieCount: runConfig.veggieCount,
    junkFoodCount: runConfig.junkFoodCount,
    mealPhotoFile: mealScan.photoFile,
    mealPhotoUrl: mealScan.photoUrl,
    mealPhotoSourceUrl: mealScan.photoSourceUrl,
  });
});
document.getElementById('congrats-save-score').addEventListener('click', () => {
  leaderboard.open({
    score: state.score,
    runsCompleted: runConfig.run,
    outcome: 'mission_complete',
    attemptId: runConfig.attemptId,
    veggieCount: runConfig.veggieCount,
    junkFoodCount: runConfig.junkFoodCount,
    mealPhotoFile: mealScan.photoFile,
    mealPhotoUrl: mealScan.photoUrl,
    mealPhotoSourceUrl: mealScan.photoSourceUrl,
  });
});

window.render_game_to_text = () => JSON.stringify({
  coordinateSystem: 'Player x/y are offsets from the vessel center; z decreases moving forward.',
  mode: state.over ? 'result' : state.running ? 'playing' : 'menu',
  player: { x: state.px, y: state.py, z: state.z },
  score: state.score,
  energy: Math.round(state.energy),
  timeLeft: Math.max(0, Math.ceil(state.timeLeft)),
  run: runConfig.run,
  boss: boss.active ? { active: true, hp: boss.hp, maxHp: boss.maxHp } : { active: false },
  leaderboardOpen: !document.getElementById('leaderboard-overlay').classList.contains('hidden'),
});

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);
  const time  = clock.elapsedTime;

  if (state.running && !state.over) {
    state.timeLeft -= delta;

    // Energy regen
    if (runConfig.energyRegen > 0)
      state.energy = Math.min(runConfig.maxEnergy, state.energy + runConfig.energyRegen * delta);

    const wallHit = updatePlayer(player, keys, delta, state);
    if (state.wallDmgCooldown > 0) {
      state.wallDmgCooldown -= delta;
    } else if (wallHit) {
      takeDamage(10);
      state.wallDmgCooldown = 0.55;
    }

    // Halt forward progress while boss is alive
    if (boss.active && !boss.defeated)
      state.z = Math.max(state.z, getBossActivateZ(runConfig.tunnelLength) + 5);

    updateCamera(camera, state, delta);
    if (state.camShake > 0) {
      const s = state.camShake * 0.08;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      state.camShake = Math.max(0, state.camShake - delta * 3);
    }
    playerPos.set(state.px, state.py, state.z);

    // Enter a clean arena before any regular object can animate or collide this frame.
    if (!boss.active && state.z <= getBossActivateZ(runConfig.tunnelLength)) {
      clearLevelObjects(objects, scene);
      boss.active = true;
      boss.group.visible = true;
      showBossHUD(boss.hp, boss.maxHp, getBossVariant(runConfig.run).name);
    }

    updateSonar(sonar, playerPos, delta);
    updateObjects(objects, time);

    // Remove objects more than 25 units behind the player — keeps active set small
    // regardless of tunnel length, preventing lag at runs 5+
    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].position.z > state.z + 25) {
        scene.remove(objects[i]);
        objects.splice(i, 1);
      }
    }

    updateWeapons(weapons, objects, scene, delta, (obj) => {
      flash('hit');
      spawnExplosion(scene, obj.position.clone(), EXPL_COLORS[obj.userData?.type] ?? 0xff4400);
      const xp = XP_VALUES[obj?.userData?.type] ?? 20;
      if (addXP(xpState, xp)) { applySubmarineLevel(player, xpState.level); showLevelUp(xpState.level); }
      updateLevelHUD(xpState);
    });
    checkCollisions(
      objects,
      playerPos,
      (crystal) => {
        addScore(10);
        if (addXP(xpState, XP_VALUES[crystal.userData.type] ?? 5)) { applySubmarineLevel(player, xpState.level); showLevelUp(xpState.level); }
        updateLevelHUD(xpState);
      },
      (block)    => { takeDamage(15); spawnExplosion(scene, block.position.clone(), EXPL_COLORS[block.userData?.type] ?? 0xff4400); },
      (_orb)     => { state.energy = Math.min(runConfig.maxEnergy, state.energy + 25); flash('energy'); },
      (broc)    => {
        const cleared = clearObstaclesAhead(objects, state.z, 40);
        runConfig.veggieCount++;
        addScore(50 + cleared * 5);
        flash('broccoli');
        if (addXP(xpState, XP_VALUES.broccoli)) { applySubmarineLevel(player, xpState.level); showLevelUp(xpState.level); }
        updateLevelHUD(xpState);
      },
      (fries)   => {
        const cleared = clearObstaclesAround(objects, playerPos, 25);
        runConfig.junkFoodCount++;
        addScore(30 + cleared * 5);
        flash('fries');
        if (addXP(xpState, XP_VALUES.fries)) { applySubmarineLevel(player, xpState.level); showLevelUp(xpState.level); }
        updateLevelHUD(xpState);
      },
      (_fish)   => {
        const cleared = clearObstaclesAhead(objects, state.z, 40);
        addScore(50 + cleared * 5);
        flash('fish');
      },
      (_burger) => {
        const cleared = clearObstaclesAround(objects, playerPos, 25);
        runConfig.junkFoodCount++;
        addScore(30 + cleared * 5);
        flash('hamburger');
      },
    );

    if (boss.active) {
      updateBoss(
        boss, state, delta, time, weapons.projectiles, scene,
        () => { takeDamage(20); },
        (hp) => { updateBossBar(hp, boss.maxHp); flash('hit'); if (hp === 0) state.camShake = 1.5; },
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

  // Run these outside the game-state guard so animations finish cleanly
  // even if time/energy ends the run mid-explosion
  tickBossExplosion(boss, scene, delta);
  updateExplosions(delta);

  renderer.render(scene, camera);
});

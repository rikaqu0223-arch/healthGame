import { xpProgress } from './xp.js';

const scoreEl   = document.getElementById('score');
const timerEl   = document.getElementById('timer');
const energyEl  = document.getElementById('energy-bar');
const flashEl   = document.getElementById('flash');
const bossHudEl = document.getElementById('boss-hud');
const bossBarEl = document.getElementById('boss-bar');

export function showBossHUD(hp, maxHp, name = 'PLAQUE BLOCKAGE') {
  document.getElementById('boss-label').textContent = name;
  bossHudEl.classList.remove('hidden');
  bossBarEl.style.width = `${(hp / maxHp) * 100}%`;
}

export function updateBossBar(hp, maxHp) {
  bossBarEl.style.width = `${Math.max(0, hp / maxHp) * 100}%`;
}

export function hideBossHUD() {
  bossHudEl.classList.add('hidden');
}

export function updateRunHUD(run, shieldHits) {
  document.getElementById('run-num').textContent = run;
  const shieldEl = document.getElementById('shield-display');
  if (shieldHits > 0) {
    shieldEl.textContent = `⬡ SHIELD ×${shieldHits}`;
    shieldEl.classList.remove('hidden');
  } else {
    shieldEl.classList.add('hidden');
  }
}

export function flash(type) {
  flashEl.className = '';
  // Force reflow so removing+re-adding the class restarts the animation
  void flashEl.offsetWidth;
  flashEl.className = `flash-${type}`;
}

export function updateHUD(state) {
  const maxEnergy = state.maxEnergy || 100;
  const energyPct = Math.max(0, Math.min(100, (state.energy / maxEnergy) * 100));

  scoreEl.textContent  = state.score;
  timerEl.textContent  = Math.ceil(state.timeLeft);
  energyEl.style.width = `${energyPct}%`;

  // Pulse energy bar red when low
  if (state.energy < 30) {
    energyEl.style.background = `linear-gradient(90deg, #ff1122, #ff4400)`;
  } else {
    energyEl.style.background = `linear-gradient(90deg, #ff4466, #ff8844)`;
  }
}

export function updateLevelHUD(xpState) {
  document.getElementById('level-display').textContent = `LVL ${xpState.level}`;
  document.getElementById('xp-bar').style.width = `${xpProgress(xpState) * 100}%`;
}

export function showLevelUp(level) {
  const banner = document.getElementById('levelup-banner');
  banner.textContent = `LEVEL ${level}`;
  banner.classList.remove('hidden');
  void banner.offsetWidth;
  banner.style.animation = 'none';
  void banner.offsetWidth;
  banner.style.animation = '';
  setTimeout(() => banner.classList.add('hidden'), 2200);
}

export function showEnd(state) {
  const overlay = document.getElementById('end-overlay');
  const title   = document.getElementById('end-title');
  const stats   = document.getElementById('end-stats');

  if (state.bossDefeated) {
    title.textContent = 'BLOCKAGE CLEARED';
    title.style.color = '#ff44ff';
    title.style.textShadow = '0 0 24px #ff44ff, 0 0 48px #aa00ff';
  } else if (state.energy <= 0) {
    title.textContent = 'FLOW BLOCKED';
    title.style.color = '#ff4466';
    title.style.textShadow = '0 0 24px #ff4466';
  } else {
    title.textContent = 'FLOW RESTORED';
    title.style.color = '#44ffaa';
    title.style.textShadow = '0 0 24px #44ffaa';
  }

  stats.innerHTML =
    `Crystals collected: <strong>${state.score}</strong><br>` +
    `Energy remaining: <strong>${Math.round(state.energy)}%</strong>`;

  overlay.classList.remove('hidden');
  overlay.classList.add('active');
}

import { xpProgress } from './xp.js';

const scoreEl   = document.getElementById('score');
const timerEl   = document.getElementById('timer');
const energyEl  = document.getElementById('energy-bar');
const energyValueEl = document.getElementById('energy-value');
const energyWrapEl = document.getElementById('energy-bar-wrap');
const flashEl   = document.getElementById('flash');
const bossHudEl = document.getElementById('boss-hud');
const bossBarEl = document.getElementById('boss-bar');
const pickupToastEl = document.getElementById('pickup-toast');
const pickupIconEl = document.getElementById('pickup-icon');
const pickupTitleEl = document.getElementById('pickup-title');
const pickupDetailEl = document.getElementById('pickup-detail');
const scoreDisplayEl = document.getElementById('score-display');
const timerDisplayEl = document.getElementById('timer-display');

let previousScore = 0;
let pickupTimer = null;

const PICKUP_META = {
  crystal:   { icon: '◆', tone: 'cyan' },
  energy:    { icon: '+', tone: 'green' },
  broccoli:  { icon: '◇', tone: 'green' },
  fries:     { icon: '!', tone: 'amber' },
  fish:      { icon: '≈', tone: 'cyan' },
  hamburger: { icon: '●', tone: 'amber' },
};

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

export function showPickup(type, title, detail) {
  const meta = PICKUP_META[type] || PICKUP_META.crystal;
  if (pickupTimer) clearTimeout(pickupTimer);

  pickupIconEl.textContent = meta.icon;
  pickupTitleEl.textContent = title;
  pickupDetailEl.textContent = detail;
  pickupToastEl.dataset.tone = meta.tone;
  pickupToastEl.classList.remove('hidden', 'pickup-enter');
  void pickupToastEl.offsetWidth;
  pickupToastEl.classList.add('pickup-enter');

  pickupTimer = setTimeout(() => pickupToastEl.classList.add('hidden'), 1700);
}

export function updateHUD(state) {
  const maxEnergy = state.maxEnergy || 100;
  const energyPct = Math.max(0, Math.min(100, (state.energy / maxEnergy) * 100));

  scoreEl.textContent  = state.score;
  timerEl.textContent  = Math.ceil(state.timeLeft);
  energyEl.style.width = `${energyPct}%`;
  energyValueEl.textContent = `${Math.round(energyPct)}%`;

  if (state.score !== previousScore) {
    scoreDisplayEl.classList.remove('hud-bump');
    void scoreDisplayEl.offsetWidth;
    scoreDisplayEl.classList.add('hud-bump');
    previousScore = state.score;
  }

  const lowEnergy = energyPct < 30;
  energyWrapEl.classList.toggle('is-low', lowEnergy);
  timerDisplayEl.classList.toggle('is-urgent', state.timeLeft <= 15);
  document.body.classList.toggle('critical-energy', lowEnergy && state.running && !state.over);
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

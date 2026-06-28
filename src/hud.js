const scoreEl  = document.getElementById('score');
const timerEl  = document.getElementById('timer');
const energyEl = document.getElementById('energy-bar');

export function updateHUD(state) {
  scoreEl.textContent  = state.score;
  timerEl.textContent  = Math.ceil(state.timeLeft);
  energyEl.style.width = `${state.energy}%`;

  // Pulse energy bar red when low
  if (state.energy < 30) {
    energyEl.style.background = `linear-gradient(90deg, #ff1122, #ff4400)`;
  } else {
    energyEl.style.background = `linear-gradient(90deg, #ff4466, #ff8844)`;
  }
}

export function showEnd(state) {
  const overlay = document.getElementById('end-overlay');
  const title   = document.getElementById('end-title');
  const stats   = document.getElementById('end-stats');

  if (state.energy <= 0) {
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

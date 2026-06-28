// XP needed to advance FROM level `n` to `n+1`
function xpNeeded(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function createXPState() {
  return { xp: 0, level: 1, toNext: xpNeeded(1) };
}

export function resetXP(xpState) {
  xpState.xp    = 0;
  xpState.level = 1;
  xpState.toNext = xpNeeded(1);
}

// Returns true if the player leveled up
export function addXP(xpState, amount) {
  xpState.xp += amount;
  if (xpState.xp >= xpState.toNext) {
    xpState.xp   -= xpState.toNext;
    xpState.level++;
    xpState.toNext = xpNeeded(xpState.level);
    return true;
  }
  return false;
}

export function xpProgress(xpState) {
  return Math.min(xpState.xp / xpState.toNext, 1);
}

// XP awarded per destroyed/collected object type
export const XP_VALUES = {
  wbc:          25,
  block:        10,
  ring:         10,
  drifter:      15,
  pinball:      15,
  broccoli:     50,
  fries:        35,
  crystal:       5,
  orbit_crystal: 5,
  energy_orb:   10,
};

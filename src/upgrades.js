export const UPGRADES = [
  {
    id: 'energy_core',
    name: 'ENERGY CORE',
    desc: 'Max & starting energy +30',
    apply: cfg => { cfg.maxEnergy += 30; },
  },
  {
    id: 'torpedo_drive',
    name: 'TORPEDO DRIVE',
    desc: 'Torpedoes 30% faster',
    apply: cfg => { cfg.torpedoSpeed = Math.round(cfg.torpedoSpeed * 1.3); },
  },
  {
    id: 'spread_shot',
    name: 'SPREAD SHOT',
    desc: 'Fire 3 torpedoes per shot',
    apply: cfg => { cfg.spreadShot = true; },
  },
  {
    id: 'bio_shield',
    name: 'BIO SHIELD',
    desc: 'Absorb 1 hit per run (stackable)',
    apply: cfg => { cfg.shieldHits += 1; },
  },
  {
    id: 'regen',
    name: 'REGENERATOR',
    desc: 'Passively recover +3 energy/sec',
    apply: cfg => { cfg.energyRegen += 3; },
  },
  {
    id: 'heavy_torp',
    name: 'HEAVY TORPEDO',
    desc: 'Each shot deals 2× damage to boss',
    apply: cfg => { cfg.torpedoDamage += 1; },
  },
];

export function getUpgradeChoices(runConfig) {
  const pool = UPGRADES.filter(u => !(u.id === 'spread_shot' && runConfig.spreadShot));
  return pool.slice().sort(() => Math.random() - 0.5).slice(0, 3);
}

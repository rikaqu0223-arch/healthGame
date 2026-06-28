import * as THREE from 'three';

const COOLDOWN = 4; // seconds between pulses
const PULSE_DURATION = 1.2;
const PULSE_MAX_RADIUS = 12;

export function createSonar(scene) {
  const ringGeo = new THREE.RingGeometry(0.1, 0.3, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00eeff,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2; // face forward
  scene.add(ring);

  return {
    ring,
    active: false,
    progress: 0,   // 0–1 within pulse duration
    cooldown: 0,
    btn: document.getElementById('sonar-btn'),
  };
}

export function fireSonar(sonar) {
  if (sonar.cooldown > 0 || sonar.active) return;
  sonar.active = true;
  sonar.progress = 0;
  sonar.btn.classList.add('active');
}

export function updateSonar(sonar, playerPos, delta) {
  if (sonar.cooldown > 0) {
    sonar.cooldown -= delta;
    if (sonar.cooldown < 0) sonar.cooldown = 0;
  }

  if (!sonar.active) return;

  sonar.progress += delta / PULSE_DURATION;

  const radius = sonar.progress * PULSE_MAX_RADIUS;
  sonar.ring.scale.setScalar(radius / 0.2); // RingGeometry inner = 0.1, outer = 0.3; scale up
  sonar.ring.position.copy(playerPos);
  sonar.ring.position.z -= 1;

  // Fade out
  sonar.ring.material.opacity = Math.max(0, 0.8 * (1 - sonar.progress));

  if (sonar.progress >= 1) {
    sonar.active = false;
    sonar.cooldown = COOLDOWN;
    sonar.ring.material.opacity = 0;
    sonar.btn.classList.remove('active');
  }
}

export function isSonarActive(sonar) {
  return sonar.active;
}

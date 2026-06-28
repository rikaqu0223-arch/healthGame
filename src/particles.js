import * as THREE from 'three';

const DURATION = 0.5;
const pGeo = new THREE.OctahedronGeometry(0.1, 0);

// Per-type explosion color
export const EXPL_COLORS = {
  wbc:          0xffdd00,
  drifter:      0xff2200,
  pinball:      0x44ffaa,
  block:        0xddaa44,
  ring:         0xff6633,
  broccoli:     0x66ff44,
  fries:        0xff8800,
  crystal:      0x44aaff,
  orbit_crystal:0xffcc00,
  energy_orb:   0x00ff88,
};

const _active = [];

export function spawnExplosion(scene, position, color = 0xff4400, count = 10) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 3,
      transparent: true, opacity: 1, roughness: 0,
    });
    const mesh = new THREE.Mesh(pGeo, mat);
    mesh.position.copy(position);
    const speed = 1.5 + Math.random() * 5;
    const dir = new THREE.Vector3(
      Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5,
    ).normalize().multiplyScalar(speed);
    mesh.userData = {
      vel:  dir,
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ),
    };
    scene.add(mesh);
    particles.push(mesh);
  }
  _active.push({ particles, scene, t: 0 });
}

export function updateExplosions(delta) {
  for (let i = _active.length - 1; i >= 0; i--) {
    const e = _active[i];
    e.t += delta / DURATION;
    const fade = Math.max(0, 1 - e.t);
    for (const p of e.particles) {
      p.position.addScaledVector(p.userData.vel, delta);
      p.userData.vel.multiplyScalar(0.88);
      p.rotation.x += p.userData.spin.x * delta;
      p.rotation.y += p.userData.spin.y * delta;
      p.rotation.z += p.userData.spin.z * delta;
      p.material.opacity = fade;
      p.scale.setScalar(Math.max(0.01, fade));
    }
    if (e.t >= 1) {
      for (const p of e.particles) { p.material.dispose(); e.scene.remove(p); }
      _active.splice(i, 1);
    }
  }
}

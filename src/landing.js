import * as THREE from 'three';
import { buildBloodEnvironment, buildLighting, buildTunnel } from './scene.js';
import { createSubmarine } from './player.js';

const HERO_TUNNEL_LENGTH = 90;

export function createLandingExperience(canvas, scrollRoot) {
  if (!canvas) return { destroy() {} };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x170108);
  scene.fog = new THREE.FogExp2(0x25020c, 0.024);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
  camera.position.set(0.8, 0.45, 5.4);

  buildTunnel(scene, HERO_TUNNEL_LENGTH);
  const bloodEnvironment = buildBloodEnvironment(scene, HERO_TUNNEL_LENGTH);
  const pulseLights = buildLighting(scene);
  const submarine = createSubmarine(scene);
  submarine.group.position.set(1.35, -0.35, -3.5);
  submarine.group.scale.setScalar(1.65);
  submarine.group.rotation.set(0.03, -0.14, -0.08);

  const cyanLight = new THREE.PointLight(0x43e9f2, 14, 20);
  cyanLight.position.set(1.1, -0.2, -1.5);
  scene.add(cyanLight);

  const rimLight = new THREE.DirectionalLight(0xffd1bc, 2.2);
  rimLight.position.set(-3, 4, 4);
  scene.add(rimLight);

  const plaque = createPlaqueField();
  scene.add(plaque);

  const crystals = createCrystalPath();
  scene.add(crystals);

  const sonarRings = createSonarRings();
  scene.add(sonarRings);

  const pointer = new THREE.Vector2();
  const targetPointer = new THREE.Vector2();
  let scrollProgress = 0;
  let frameId = 0;
  let destroyed = false;

  function resize() {
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function onPointerMove(event) {
    targetPointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    targetPointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  function onScroll() {
    const range = Math.max(1, scrollRoot.clientHeight * 0.85);
    scrollProgress = Math.min(1, scrollRoot.scrollTop / range);
  }

  function render(timeMs) {
    if (destroyed) return;
    const time = timeMs * 0.001;
    pointer.lerp(targetPointer, 0.035);

    submarine.group.position.y = -0.35 + Math.sin(time * 1.2) * 0.12;
    submarine.group.position.x = 1.35 + Math.sin(time * 0.55) * 0.08;
    submarine.group.rotation.z = -0.08 + Math.sin(time * 0.9) * 0.025;
    plaque.rotation.z = time * 0.025;
    crystals.children.forEach((crystal, index) => {
      crystal.rotation.x = time * 0.5 + index;
      crystal.rotation.y = time * 0.75 + index * 0.6;
    });

    sonarRings.children.forEach((ring, index) => {
      const cycle = (time * 0.3 + index / sonarRings.children.length) % 1;
      ring.scale.setScalar(0.65 + cycle * 2.6);
      ring.material.opacity = (1 - cycle) * 0.26;
    });

    bloodEnvironment.rotation.z = Math.sin(time * 0.08) * 0.04;
    pulseLights.forEach((light, index) => {
      light.intensity = 3.2 + Math.sin(time * 2.2 + index) * 0.8;
    });

    camera.position.x = 0.8 + pointer.x * 0.28 - scrollProgress * 0.45;
    camera.position.y = 0.45 - pointer.y * 0.18 + scrollProgress * 0.2;
    camera.position.z = 5.4 - scrollProgress * 1.4;
    camera.lookAt(0.15 + pointer.x * 0.12, -0.1 - pointer.y * 0.08, -13);

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  scrollRoot.addEventListener('scroll', onScroll, { passive: true });
  resize();
  frameId = requestAnimationFrame(render);

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      scrollRoot.removeEventListener('scroll', onScroll);
      scene.traverse((child) => {
        child.geometry?.dispose?.();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.filter(Boolean).forEach((material) => {
          material.map?.dispose?.();
          material.bumpMap?.dispose?.();
          material.dispose?.();
        });
      });
      renderer.dispose();
    },
  };
}

function createPlaqueField() {
  const group = new THREE.Group();
  group.position.set(2.65, -0.3, -14);

  const geometry = new THREE.DodecahedronGeometry(0.85, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0xf4bb38,
    emissive: 0x7a2b02,
    emissiveIntensity: 0.75,
    roughness: 0.78,
    flatShading: true,
  });

  for (let i = 0; i < 12; i++) {
    const mass = new THREE.Mesh(geometry, material);
    const angle = (i / 12) * Math.PI * 2;
    const radius = 0.8 + (i % 3) * 0.42;
    mass.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (i % 4) * 0.55 - 0.8);
    mass.scale.setScalar(0.5 + (i % 5) * 0.12);
    mass.rotation.set(i * 0.4, i * 0.7, i * 0.2);
    group.add(mass);
  }

  return group;
}

function createCrystalPath() {
  const group = new THREE.Group();
  const geometry = new THREE.OctahedronGeometry(0.16, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0xa8ffff,
    emissive: 0x22dfe9,
    emissiveIntensity: 2.6,
    roughness: 0.15,
    metalness: 0.25,
    flatShading: true,
  });

  for (let i = 0; i < 7; i++) {
    const crystal = new THREE.Mesh(geometry, material);
    crystal.position.set(-0.8 + Math.sin(i * 1.8) * 0.45, 0.35 + Math.cos(i * 1.2) * 0.55, -7 - i * 2.3);
    crystal.scale.setScalar(0.7 + (i % 3) * 0.2);
    group.add(crystal);
  }

  return group;
}

function createSonarRings() {
  const group = new THREE.Group();
  group.position.set(1.35, -0.35, -4.4);
  const geometry = new THREE.TorusGeometry(0.62, 0.018, 6, 48);

  for (let i = 0; i < 3; i++) {
    const material = new THREE.MeshBasicMaterial({ color: 0x54eff5, transparent: true, opacity: 0.2 });
    const ring = new THREE.Mesh(geometry, material);
    group.add(ring);
  }

  return group;
}

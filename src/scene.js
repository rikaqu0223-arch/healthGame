import * as THREE from 'three';

export const TUNNEL_RADIUS = 4;
export const TUNNEL_LENGTH = 200;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050005);
  scene.fog = new THREE.FogExp2(0x1a0010, 0.018);
  return scene;
}

export function createCamera() {
  const cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
  cam.position.set(0, 0, 5);  // will trail behind player
  return cam;
}

export function buildTunnel(scene) {
  const geometry = new THREE.CylinderGeometry(
    TUNNEL_RADIUS, TUNNEL_RADIUS, TUNNEL_LENGTH,
    24, 1, true   // open-ended so inside is visible
  );
  geometry.rotateX(Math.PI / 2); // align with Z axis

  const material = new THREE.MeshStandardMaterial({
    color: 0x8b0033,
    emissive: 0x3a0010,
    emissiveIntensity: 0.4,
    side: THREE.BackSide,
    roughness: 0.85,
    metalness: 0.1,
  });

  const tunnel = new THREE.Mesh(geometry, material);
  tunnel.position.z = -TUNNEL_LENGTH / 2;
  scene.add(tunnel);
  return tunnel;
}

export function buildLighting(scene) {
  // Ambient
  scene.add(new THREE.AmbientLight(0xff2244, 0.3));

  // Directional fill
  const dir = new THREE.DirectionalLight(0xff8866, 0.6);
  dir.position.set(5, 5, 5);
  scene.add(dir);

  // Pulsing point lights along the tunnel for organic feel
  const pulseGroup = [];
  for (let i = 0; i < 8; i++) {
    const light = new THREE.PointLight(0xff3355, 1.5, 18);
    light.position.set(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      -10 - i * (TUNNEL_LENGTH / 8)
    );
    scene.add(light);
    pulseGroup.push(light);
  }
  return pulseGroup;
}

export function onResize(renderer, camera) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

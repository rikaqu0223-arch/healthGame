import * as THREE from 'three';

export const TUNNEL_RADIUS = 4;
export const TUNNEL_LENGTH = 200;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c0008);   // brighter deep red
  scene.fog = new THREE.FogExp2(0x2a0010, 0.018); // brighter fog, slightly less dense
  return scene;
}

export function createCamera() {
  const cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
  cam.position.set(0, 0, 5);
  return cam;
}

export function buildTunnel(scene, length = TUNNEL_LENGTH) {
  const geometry = new THREE.CylinderGeometry(
    TUNNEL_RADIUS, TUNNEL_RADIUS, length,
    32, 1, true   // fewer height segments — no per-vertex effect needs them
  );
  geometry.rotateX(Math.PI / 2);

  // Subtle radial noise so wall reads as organic tissue, not a clean pipe
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ang = Math.atan2(y, x);
    const noise = 0.12 * Math.sin(ang * 7 + z * 0.25) * Math.cos(z * 0.18 + ang * 4);
    const r = Math.sqrt(x * x + y * y);
    const sc = 1 + noise / r;
    pos.setX(i, x * sc);
    pos.setY(i, y * sc);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color:             0x6e1422,   // brighter crimson
    emissive:          0x2e0810,
    emissiveIntensity: 0.7,
    side:              THREE.BackSide,
    roughness:         0.95,
    metalness:         0.0,
  });

  const tunnel = new THREE.Mesh(geometry, material);
  tunnel.position.z = -length / 2;
  scene.add(tunnel);
  return tunnel;
}

// ── Blood vessel environment — all batched into InstancedMeshes (5 draw calls) ─
export function buildBloodEnvironment(scene, length = TUNNEL_LENGTH) {
  const group = new THREE.Group();
  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _e = new THREE.Euler();

  // ── Red blood cells — biconcave discs, InstancedMesh ──
  const rbcGeo = new THREE.SphereGeometry(1, 7, 4);
  const rbcMat = new THREE.MeshStandardMaterial({
    color:       0xcc1828,
    roughness:   0.85,
    metalness:   0.0,
    transparent: true,
    opacity:     0.75,
    side:        THREE.DoubleSide,
  });
  const RBC_COUNT = 160;
  const rbcMesh = new THREE.InstancedMesh(rbcGeo, rbcMat, RBC_COUNT);
  for (let i = 0; i < RBC_COUNT; i++) {
    const t = i / RBC_COUNT;
    const z = -6 - t * (length - 12) + (Math.random() - 0.5) * (length / RBC_COUNT) * 4;
    const r = 0.5 + Math.random() * 2.8;
    const ang = Math.random() * Math.PI * 2;
    _p.set(Math.cos(ang) * r, Math.sin(ang) * r, z);
    _e.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    _q.setFromEuler(_e);
    const sz = 0.17 + Math.random() * 0.15;
    _s.set(sz, sz * 0.26, sz);
    _m.compose(_p, _q, _s);
    rbcMesh.setMatrixAt(i, _m);
  }
  rbcMesh.instanceMatrix.needsUpdate = true;
  group.add(rbcMesh);

  // ── Vessel wall ribs — InstancedMesh ──
  const ribGeo = new THREE.TorusGeometry(TUNNEL_RADIUS - 0.05, 0.2, 7, 28);
  const ribMat = new THREE.MeshStandardMaterial({
    color:             0x3e0010,
    emissive:          0x1e0008,
    emissiveIntensity: 0.4,
    roughness:         0.97,
  });
  const ribZStep = 13;
  const ribCount = Math.floor((length - 28) / ribZStep);
  const ribMesh = new THREE.InstancedMesh(ribGeo, ribMat, ribCount);
  for (let i = 0; i < ribCount; i++) {
    const z = -14 - i * ribZStep;
    _p.set(0, 0, z);
    _q.identity();
    _s.set(1, 1, 1);
    _m.compose(_p, _q, _s);
    ribMesh.setMatrixAt(i, _m);
  }
  ribMesh.instanceMatrix.needsUpdate = true;
  group.add(ribMesh);

  // ── Leukocytes (white blood cells) — InstancedMesh ──
  const wbcGeo = new THREE.IcosahedronGeometry(0.45, 0);
  const wbcMat = new THREE.MeshStandardMaterial({
    color:             0xf0dfc0,
    emissive:          0x401800,
    emissiveIntensity: 0.2,
    roughness:         0.92,
  });
  const WBC_COUNT = 6;
  const wbcMesh = new THREE.InstancedMesh(wbcGeo, wbcMat, WBC_COUNT);
  for (let i = 0; i < WBC_COUNT; i++) {
    const z = -20 - (i / WBC_COUNT) * (length - 40);
    const r = 0.4 + Math.random() * 2.2;
    const ang = Math.random() * Math.PI * 2;
    _p.set(Math.cos(ang) * r, Math.sin(ang) * r, z);
    _e.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    _q.setFromEuler(_e);
    const sc = 0.6 + Math.random() * 0.5;
    _s.set(sc, sc * (0.7 + Math.random() * 0.5), sc);
    _m.compose(_p, _q, _s);
    wbcMesh.setMatrixAt(i, _m);
  }
  wbcMesh.instanceMatrix.needsUpdate = true;
  group.add(wbcMesh);

  // ── Fibrin strands — InstancedMesh ──
  const strandGeo = new THREE.CylinderGeometry(0.025, 0.018, 1, 4);
  const strandMat = new THREE.MeshStandardMaterial({
    color:    0xcc3311,
    roughness: 0.85,
  });
  const STRAND_COUNT = 18;
  const strandMesh = new THREE.InstancedMesh(strandGeo, strandMat, STRAND_COUNT);
  for (let i = 0; i < STRAND_COUNT; i++) {
    const z = -12 - (i / STRAND_COUNT) * (length - 24);
    const r = 2.0 + Math.random() * 1.6;
    const ang = Math.random() * Math.PI * 2;
    _p.set(Math.cos(ang) * r, Math.sin(ang) * r, z);
    _e.set(
      (Math.random() - 0.5) * Math.PI,
      Math.random() * Math.PI,
      (Math.random() - 0.5) * Math.PI,
    );
    _q.setFromEuler(_e);
    const sLen = 1.8 + Math.random() * 3.5;
    _s.set(1, sLen, 1);
    _m.compose(_p, _q, _s);
    strandMesh.setMatrixAt(i, _m);
  }
  strandMesh.instanceMatrix.needsUpdate = true;
  group.add(strandMesh);

  // ── Platelets — InstancedMesh ──
  const platGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 5);
  const platMat = new THREE.MeshStandardMaterial({
    color:             0xffccbb,
    emissive:          0x661100,
    emissiveIntensity: 0.6,
    roughness:         0.6,
  });
  const PLAT_COUNT = 35;
  const platMesh = new THREE.InstancedMesh(platGeo, platMat, PLAT_COUNT);
  for (let i = 0; i < PLAT_COUNT; i++) {
    const z = -8 - (i / PLAT_COUNT) * (length - 16) + (Math.random() - 0.5) * 3;
    const r = 1.0 + Math.random() * 2.5;
    const ang = Math.random() * Math.PI * 2;
    _p.set(Math.cos(ang) * r, Math.sin(ang) * r, z);
    _e.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    _q.setFromEuler(_e);
    _s.set(1, 1, 1);
    _m.compose(_p, _q, _s);
    platMesh.setMatrixAt(i, _m);
  }
  platMesh.instanceMatrix.needsUpdate = true;
  group.add(platMesh);

  scene.add(group);
  return group;
}

export function buildLighting(scene) {
  scene.add(new THREE.AmbientLight(0xff2233, 0.45));  // brighter ambient

  const dir = new THREE.DirectionalLight(0xff8855, 0.7);
  dir.position.set(5, 5, 5);
  scene.add(dir);

  const pulseGroup = [];
  for (let i = 0; i < 8; i++) {
    const light = new THREE.PointLight(0xff3344, 2.5, 22);
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

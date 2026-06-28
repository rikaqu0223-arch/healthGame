import * as THREE from 'three';

export const TUNNEL_RADIUS = 4;
export const TUNNEL_LENGTH = 200;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060002);
  scene.fog = new THREE.FogExp2(0x140006, 0.022);
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
    36, 1, true
  );
  geometry.rotateX(Math.PI / 2);

  // Subtle radial surface noise so it reads as organic tissue, not a clean pipe
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
    color:             0x4a0812,
    emissive:          0x1a0308,
    emissiveIntensity: 0.55,
    side:              THREE.BackSide,
    roughness:         0.96,
    metalness:         0.0,
  });

  const tunnel = new THREE.Mesh(geometry, material);
  tunnel.position.z = -length / 2;
  scene.add(tunnel);
  return tunnel;
}

// ── Blood vessel environment (RBCs, tissue ribs, WBCs, fibrin) ───────────────
export function buildBloodEnvironment(scene, length = TUNNEL_LENGTH) {
  const group = new THREE.Group();

  // ── Red blood cells — biconcave discs via InstancedMesh (1 draw call) ──
  const rbcGeo = new THREE.SphereGeometry(1, 8, 5);
  const rbcMat = new THREE.MeshStandardMaterial({
    color:       0xaa1020,
    roughness:   0.88,
    metalness:   0.0,
    transparent: true,
    opacity:     0.72,
    side:        THREE.DoubleSide,
  });

  const RBC_COUNT = 200;
  const rbcMesh = new THREE.InstancedMesh(rbcGeo, rbcMat, RBC_COUNT);
  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _e = new THREE.Euler();

  for (let i = 0; i < RBC_COUNT; i++) {
    const t = i / RBC_COUNT;
    const z = -6 - t * (length - 12) + (Math.random() - 0.5) * (length / RBC_COUNT) * 4;
    const r = 0.5 + Math.random() * 2.8;
    const ang = Math.random() * Math.PI * 2;
    _p.set(Math.cos(ang) * r, Math.sin(ang) * r, z);
    _e.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    _q.setFromEuler(_e);
    const sz = 0.16 + Math.random() * 0.16;
    _s.set(sz, sz * 0.25, sz);   // flat disc — classic RBC silhouette
    _m.compose(_p, _q, _s);
    rbcMesh.setMatrixAt(i, _m);
  }
  rbcMesh.instanceMatrix.needsUpdate = true;
  group.add(rbcMesh);

  // ── Vessel wall ribs (annular tissue ridges) ──
  const ribGeo = new THREE.TorusGeometry(TUNNEL_RADIUS - 0.05, 0.22, 8, 32);
  const ribMat = new THREE.MeshStandardMaterial({
    color:             0x2e0008,
    emissive:          0x160004,
    emissiveIntensity: 0.35,
    roughness:         0.97,
    side:              THREE.DoubleSide,
  });
  for (let z = -14; z > -(length - 14); z -= 13) {
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.position.z = z;
    group.add(rib);
  }

  // ── Leukocytes (white blood cells) — large pale irregular blobs ──
  const wbcBaseMat = new THREE.MeshStandardMaterial({
    color:       0xf0e0c8,
    emissive:    0x2e1800,
    emissiveIntensity: 0.12,
    roughness:   0.92,
    transparent: true,
    opacity:     0.50,
  });
  for (let i = 0; i < 7; i++) {
    const wbcGeo = new THREE.IcosahedronGeometry(0.38 + Math.random() * 0.28, 1);
    const wbc = new THREE.Mesh(wbcGeo, wbcBaseMat.clone());
    const z = -20 - (i / 7) * (length - 40);
    const r = 0.3 + Math.random() * 2.4;
    const ang = Math.random() * Math.PI * 2;
    wbc.position.set(Math.cos(ang) * r, Math.sin(ang) * r, z);
    wbc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    group.add(wbc);
  }

  // ── Fibrin strands (thin cross-fibers near tunnel walls) ──
  const strandBaseMat = new THREE.MeshStandardMaterial({
    color:       0xdd3311,
    roughness:   0.85,
    transparent: true,
    opacity:     0.38,
  });
  for (let i = 0; i < 18; i++) {
    const sLen = 1.6 + Math.random() * 3.8;
    const stGeo = new THREE.CylinderGeometry(0.025, 0.018, sLen, 4);
    const strand = new THREE.Mesh(stGeo, strandBaseMat.clone());
    const z = -12 - (i / 18) * (length - 24);
    const r = 2.2 + Math.random() * 1.5;
    const ang = Math.random() * Math.PI * 2;
    strand.position.set(Math.cos(ang) * r, Math.sin(ang) * r, z);
    strand.rotation.set(
      (Math.random() - 0.5) * Math.PI,
      Math.random() * Math.PI,
      (Math.random() - 0.5) * Math.PI,
    );
    group.add(strand);
  }

  // ── Platelets (tiny flat pale discs clustered at wall) ──
  const platGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 6);
  const platMat = new THREE.MeshStandardMaterial({
    color:       0xffddcc,
    emissive:    0x441100,
    emissiveIntensity: 0.5,
    roughness:   0.6,
    transparent: true,
    opacity:     0.65,
  });
  for (let i = 0; i < 40; i++) {
    const plat = new THREE.Mesh(platGeo, platMat.clone());
    const z = -8 - (i / 40) * (length - 16);
    const r = 1.0 + Math.random() * 2.6;
    const ang = Math.random() * Math.PI * 2;
    plat.position.set(Math.cos(ang) * r, Math.sin(ang) * r, z + (Math.random() - 0.5) * 2);
    plat.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    group.add(plat);
  }

  scene.add(group);
  return group;
}

export function buildLighting(scene) {
  scene.add(new THREE.AmbientLight(0xcc1122, 0.25));

  const dir = new THREE.DirectionalLight(0xff7744, 0.5);
  dir.position.set(5, 5, 5);
  scene.add(dir);

  const pulseGroup = [];
  for (let i = 0; i < 8; i++) {
    const light = new THREE.PointLight(0xff2233, 1.8, 20);
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

import * as THREE from 'three';

export const TUNNEL_RADIUS = 4;
export const TUNNEL_LENGTH = 200;

// Returns the XY world-space center of the tunnel at a given world Z (negative = forward).
// Pure sines so the curve starts at (0,0) and the player begins centred.
export function getTunnelCenter(z) {
  const t = -z;
  return {
    x: Math.sin(t * 0.055) * 0.3 + Math.sin(t * 0.13) * 0.1,
    y: Math.sin(t * 0.070) * 0.2 + Math.sin(t * 0.17) * 0.07,
  };
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3a0810);
  scene.fog = new THREE.FogExp2(0x4a0e18, 0.016);
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

  // Radial organic noise + lateral curve offset so the tube visually bends.
  // vertex z is in geometry-local space; world Z = z - length/2.
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ang = Math.atan2(y, x);
    const noise = 0.12 * Math.sin(ang * 7 + z * 0.25) * Math.cos(z * 0.18 + ang * 4);
    const r = Math.sqrt(x * x + y * y);
    const sc = 1 + noise / r;
    const center = getTunnelCenter(z - length / 2);
    pos.setX(i, x * sc + center.x);
    pos.setY(i, y * sc + center.y);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();

  const wallTexture = createTunnelWallTexture(length);
  const bumpTexture = createTunnelBumpTexture(length);

  const material = new THREE.MeshStandardMaterial({
    color:             0xcc3348,
    emissive:          0x991828,
    emissiveIntensity: 1.3,
    map:               wallTexture,
    bumpMap:           bumpTexture,
    bumpScale:         0.05,
    side:              THREE.BackSide,
    roughness:         0.55,
    metalness:         0.08,
  });

  const tunnel = new THREE.Mesh(geometry, material);
  tunnel.position.z = -length / 2;
  scene.add(tunnel);
  return tunnel;
}

function createTunnelWallTexture(length) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Warm, bright tissue base — no dark patches
  const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  base.addColorStop(0,    '#8c1e2e');
  base.addColorStop(0.35, '#aa2840');
  base.addColorStop(0.65, '#962035');
  base.addColorStop(1,    '#7e1828');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle tissue colour variation — screen mode only, never darkens
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 90; i++) {
    const x = randomBetween(-40, canvas.width + 40);
    const y = randomBetween(-40, canvas.height + 40);
    const rx = randomBetween(20, 130);
    const ry = randomBetween(12, 80);
    const r  = Math.max(rx, ry);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(randomBetween(-Math.PI, Math.PI));
    ctx.scale(rx / r, ry / r);
    const alpha = randomBetween(0.03, 0.10);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, `rgba(255, 80, 90, ${alpha})`);
    grad.addColorStop(1, 'rgba(200, 40, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Glistening surface highlights — mimics wet tissue
  for (let i = 0; i < 18; i++) {
    const x = randomBetween(0, canvas.width);
    const y = randomBetween(0, canvas.height);
    const r = randomBetween(40, 180);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `rgba(255, 180, 160, ${randomBetween(0.04, 0.11)})`);
    glow.addColorStop(1, 'rgba(255, 80, 70, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  drawCapillaryLines(ctx, canvas, 38);
  addFineGrain(ctx, canvas, 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, Math.max(2, length / 42));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createTunnelBumpTexture(length) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#777';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 180; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = randomBetween(6, 42);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(225, 225, 225, ${randomBetween(0.10, 0.34)})`);
    grad.addColorStop(0.55, `rgba(95, 95, 95, ${randomBetween(0.08, 0.22)})`);
    grad.addColorStop(1, 'rgba(80, 80, 80, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 42; i++) {
    const x = randomBetween(-30, canvas.width + 30);
    ctx.strokeStyle = `rgba(215, 215, 215, ${randomBetween(0.04, 0.14)})`;
    ctx.lineWidth = randomBetween(0.8, 3.4);
    ctx.beginPath();
    ctx.moveTo(x, randomBetween(-80, 80));
    for (let y = 0; y <= canvas.height + 80; y += randomBetween(22, 42)) {
      ctx.lineTo(
        x + Math.sin(y * randomBetween(0.012, 0.028) + i) * randomBetween(8, 28),
        y,
      );
    }
    ctx.stroke();
  }

  addFineGrain(ctx, canvas, 24, true);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, Math.max(2, length / 42));
  texture.needsUpdate = true;
  return texture;
}


function drawCapillaryLines(ctx, canvas, count) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const startX = randomBetween(-80, canvas.width + 80);
    const startY = randomBetween(-120, canvas.height);
    const segments = Math.floor(randomBetween(3, 7));
    const hueShift = Math.floor(randomBetween(-12, 18));
    ctx.strokeStyle = `rgba(${210 + hueShift}, ${42 + hueShift * 0.25}, ${38}, ${randomBetween(0.08, 0.2)})`;
    ctx.lineWidth = randomBetween(1.2, 5.8);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let x = startX;
    let y = startY;
    for (let s = 0; s < segments; s++) {
      const nextY = y + randomBetween(90, 190);
      const nextX = x + randomBetween(-90, 90);
      ctx.bezierCurveTo(
        x + randomBetween(-70, 70),
        y + randomBetween(20, 95),
        nextX + randomBetween(-70, 70),
        nextY - randomBetween(20, 95),
        nextX,
        nextY,
      );
      x = nextX;
      y = nextY;
    }
    ctx.stroke();
  }
  ctx.restore();
}

function addFineGrain(ctx, canvas, amount, grayscale = false) {
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = Math.floor(randomBetween(-amount, amount));
    if (grayscale) {
      data[i] += grain;
      data[i + 1] += grain;
      data[i + 2] += grain;
    } else {
      data[i] += grain;
      data[i + 1] += Math.floor(grain * 0.45);
      data[i + 2] += Math.floor(grain * 0.35);
    }
  }
  ctx.putImageData(image, 0, 0);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
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
  const rbcGeo = new THREE.SphereGeometry(1, 6, 4);
  const rbcMat = new THREE.MeshStandardMaterial({
    color:             0xcc2030,
    emissive:          0x880010,
    emissiveIntensity: 0.9,
    roughness:         0.7,
    metalness:         0.0,
  });
  const RBC_COUNT = 80;
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
  const STRAND_COUNT = 10;
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
  const PLAT_COUNT = 18;
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

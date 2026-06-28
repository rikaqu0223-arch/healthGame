import * as THREE from 'three';

export const TUNNEL_RADIUS = 4;
export const TUNNEL_LENGTH = 200;

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
  renderer.toneMappingExposure = 1.7;  // brighter — blood is vivid red, not a dark cave
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  // Warm vivid red — the environment is lit by a dense mass of scarlet RBCs
  scene.background = new THREE.Color(0x8a1e28);
  scene.fog = new THREE.FogExp2(0x921e2a, 0.013);
  return scene;
}

export function createCamera() {
  const cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
  cam.position.set(0, 0, 5);
  return cam;
}

export function buildTunnel(scene, length = TUNNEL_LENGTH) {
  // More height segments so the organic longitudinal-fold noise has resolution
  const geometry = new THREE.CylinderGeometry(
    TUNNEL_RADIUS, TUNNEL_RADIUS, length,
    36, 2, true
  );
  geometry.rotateX(Math.PI / 2);

  // Gentle organic noise — avoids rings, produces longitudinal folds like real vessel walls
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ang = Math.atan2(y, x);
    // Low-frequency longitudinal variation, no circumferential ring pattern
    const noise = 0.08 * Math.sin(ang * 4 + z * 0.10) * Math.cos(z * 0.07 + ang * 2);
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

  // Endothelium: pale blush pink, smooth and glistening (wet tissue)
  // Research: tunica intima is "fine, transparent, colorless" — pale pink from the collagen behind it
  const material = new THREE.MeshStandardMaterial({
    color:             0xD890A8,   // pale blush pink — endothelium
    emissive:          0xA03858,   // warm pink-red glow from surrounding blood
    emissiveIntensity: 0.5,
    map:               wallTexture,
    bumpMap:           bumpTexture,
    bumpScale:         0.03,
    side:              THREE.BackSide,
    roughness:         0.32,       // smooth, wet — like oral mucosa
    metalness:         0.18,       // slight specularity for glistening surface
  });

  const tunnel = new THREE.Mesh(geometry, material);
  tunnel.position.z = -length / 2;
  scene.add(tunnel);
  return tunnel;
}

// Pale blush-pink endothelium texture — longitudinal folds, glistening highlights,
// subtle capillary markings. No dark patches.
function createTunnelWallTexture(length) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Pale pink base (endothelium + underlying collagen)
  const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  base.addColorStop(0,    '#c87890');
  base.addColorStop(0.35, '#d88898');
  base.addColorStop(0.65, '#cc7890');
  base.addColorStop(1,    '#ba6880');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Longitudinal folds — run along tube axis, not circumferentially (no rings)
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 14; i++) {
    const x = randomBetween(0, canvas.width);
    const w = randomBetween(12, 55);
    const alpha = randomBetween(0.03, 0.09);
    const grad = ctx.createLinearGradient(x - w, 0, x + w, 0);
    grad.addColorStop(0, 'rgba(255, 200, 220, 0)');
    grad.addColorStop(0.5, `rgba(255, 200, 220, ${alpha})`);
    grad.addColorStop(1, 'rgba(255, 200, 220, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Wet glistening surface highlights — moist epithelium catches light
  for (let i = 0; i < 28; i++) {
    const x = randomBetween(0, canvas.width);
    const y = randomBetween(0, canvas.height);
    const r = randomBetween(18, 110);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `rgba(255, 240, 248, ${randomBetween(0.06, 0.16)})`);
    glow.addColorStop(1, 'rgba(255, 160, 190, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // Faint capillary/venule networks visible through vessel wall
  drawCapillaryLines(ctx, canvas, 28);
  addFineGrain(ctx, canvas, 7);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, Math.max(2, length / 42));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Bump map: endothelial cobblestone cell mosaic + longitudinal ridges
function createTunnelBumpTexture(length) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Endothelial cell mosaic — flat squamous cells in cobblestone pattern
  // Each cell is a slightly raised ellipse (nucleus bump) surrounded by flat area
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const rx = randomBetween(5, 16);
    const ry = randomBetween(4, 12);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(randomBetween(-0.5, 0.5));
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
    // Slight highlight at nucleus center
    grad.addColorStop(0,   `rgba(165, 165, 165, ${randomBetween(0.08, 0.20)})`);
    grad.addColorStop(0.65, 'rgba(128, 128, 128, 0.04)');
    grad.addColorStop(1,   'rgba(118, 118, 118, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Longitudinal folds — vessel walls have folds that run along the flow axis
  for (let i = 0; i < 8; i++) {
    const x = randomBetween(8, canvas.width - 8);
    ctx.strokeStyle = `rgba(175, 175, 175, ${randomBetween(0.06, 0.13)})`;
    ctx.lineWidth = randomBetween(1.5, 4);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= canvas.height; y += 6) {
      ctx.lineTo(x + Math.sin(y * 0.018 + i * 1.3) * randomBetween(4, 12), y);
    }
    ctx.stroke();
  }

  addFineGrain(ctx, canvas, 5, true);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, Math.max(3, length / 28));
  texture.needsUpdate = true;
  return texture;
}

function drawCapillaryLines(ctx, canvas, count) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const startX = randomBetween(-60, canvas.width + 60);
    const startY = randomBetween(-100, canvas.height);
    const segments = Math.floor(randomBetween(3, 7));
    ctx.strokeStyle = `rgba(220, 100, 140, ${randomBetween(0.07, 0.18)})`;
    ctx.lineWidth = randomBetween(0.8, 3.5);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let x = startX;
    let y = startY;
    for (let s = 0; s < segments; s++) {
      const nextY = y + randomBetween(80, 180);
      const nextX = x + randomBetween(-80, 80);
      ctx.bezierCurveTo(
        x + randomBetween(-60, 60), y + randomBetween(18, 80),
        nextX + randomBetween(-60, 60), nextY - randomBetween(18, 80),
        nextX, nextY,
      );
      x = nextX; y = nextY;
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
      data[i] += grain; data[i + 1] += grain; data[i + 2] += grain;
    } else {
      data[i] += grain;
      data[i + 1] += Math.floor(grain * 0.5);
      data[i + 2] += Math.floor(grain * 0.6);  // slight pink tint to grain
    }
  }
  ctx.putImageData(image, 0, 0);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// ── Blood vessel environment ──────────────────────────────────────────────────
export function buildBloodEnvironment(scene, length = TUNNEL_LENGTH) {
  const group = new THREE.Group();
  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _e = new THREE.Euler();

  // ── Red blood cells — bright scarlet biconcave discs ──────────────────────
  // Research: ~45% hematocrit, densely packed, oxygenated = bright scarlet #CC1828
  // Shape: biconcave disc, diameter ~7-8µm, thickness ~2µm (ratio ~3.5:1)
  const rbcGeo = new THREE.SphereGeometry(1, 8, 5);
  const rbcMat = new THREE.MeshStandardMaterial({
    color:             0xCC1828,   // bright scarlet (oxygenated)
    emissive:          0x991018,   // strong red self-illumination
    emissiveIntensity: 1.1,
    roughness:         0.65,
    metalness:         0.0,
  });
  // Dense packing: 280 cells filling the vessel cross-section
  const RBC_COUNT = 280;
  const rbcMesh = new THREE.InstancedMesh(rbcGeo, rbcMat, RBC_COUNT);
  for (let i = 0; i < RBC_COUNT; i++) {
    const t = i / RBC_COUNT;
    const z = -5 - t * (length - 10) + (Math.random() - 0.5) * (length / RBC_COUNT) * 5;
    // Fill entire cross-section — cells appear near walls too
    const r = Math.random() * (TUNNEL_RADIUS - 0.4);
    const ang = Math.random() * Math.PI * 2;
    _p.set(Math.cos(ang) * r, Math.sin(ang) * r, z);
    _e.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    _q.setFromEuler(_e);
    const sz = 0.22 + Math.random() * 0.18;  // diameter 0.22–0.40
    _s.set(sz, sz * 0.28, sz);               // biconcave: thickness ~28% of diameter
    _m.compose(_p, _q, _s);
    rbcMesh.setMatrixAt(i, _m);
  }
  rbcMesh.instanceMatrix.needsUpdate = true;
  group.add(rbcMesh);

  // ── Leukocytes — ivory cream, large, bumpy, rare (~1 per 700 RBCs) ────────
  // Research: 2× RBC diameter, pale ivory #F0E8D8, lobulated surface
  const wbcGeo = new THREE.IcosahedronGeometry(0.5, 1);
  const wbcMat = new THREE.MeshStandardMaterial({
    color:             0xF0E8D8,   // ivory cream
    emissive:          0x503020,
    emissiveIntensity: 0.25,
    roughness:         0.88,       // bumpy/matte surface
    metalness:         0.0,
  });
  const WBC_COUNT = 5;
  const wbcMesh = new THREE.InstancedMesh(wbcGeo, wbcMat, WBC_COUNT);
  for (let i = 0; i < WBC_COUNT; i++) {
    const z = -25 - (i / WBC_COUNT) * (length - 50);
    const r = 0.3 + Math.random() * 2.5;
    const ang = Math.random() * Math.PI * 2;
    _p.set(Math.cos(ang) * r, Math.sin(ang) * r, z);
    _e.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    _q.setFromEuler(_e);
    const sc = 0.7 + Math.random() * 0.5;
    _s.set(sc, sc * (0.8 + Math.random() * 0.4), sc);
    _m.compose(_p, _q, _s);
    wbcMesh.setMatrixAt(i, _m);
  }
  wbcMesh.instanceMatrix.needsUpdate = true;
  group.add(wbcMesh);

  // ── Platelets — tiny pale disc fragments, barely visible ──────────────────
  // Research: 2–4µm (< half RBC size), pale #F5DDD0, disc-shaped
  const platGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.025, 5);
  const platMat = new THREE.MeshStandardMaterial({
    color:             0xF5DDD0,   // pale blush
    emissive:          0x804030,
    emissiveIntensity: 0.4,
    roughness:         0.7,
  });
  const PLAT_COUNT = 30;
  const platMesh = new THREE.InstancedMesh(platGeo, platMat, PLAT_COUNT);
  for (let i = 0; i < PLAT_COUNT; i++) {
    const z = -8 - (i / PLAT_COUNT) * (length - 16) + (Math.random() - 0.5) * 4;
    const r = 0.5 + Math.random() * (TUNNEL_RADIUS - 0.8);
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
  // Strong warm scarlet ambient — blood interior is vivid red, not a dark cave
  scene.add(new THREE.AmbientLight(0xff3344, 1.1));

  // Warm directional fill to bring out the pink wall tones
  const dir = new THREE.DirectionalLight(0xffaacc, 0.6);
  dir.position.set(3, 4, 5);
  scene.add(dir);

  // Pulsing point lights along tunnel — brighter and warmer than before
  const pulseGroup = [];
  for (let i = 0; i < 10; i++) {
    const light = new THREE.PointLight(0xff2244, 3.5, 28);
    light.position.set(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      -8 - i * (TUNNEL_LENGTH / 10),
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

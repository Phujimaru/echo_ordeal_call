// ============================================================
//  ฉากบินลงสนาม Eos (ครึ่งหลังของฉากเข้าสนาม — EosCine.jsx) — three.js renderer ของตัวเอง
//  สร้างจากกระดานจริงของแมตช์ (state.board: terrain / special แบบ "x,y" → ชนิด) — ผังตรงกับที่ผู้เล่นจะลงไปยืนจริง
//   ท้องฟ้าโพล้เพล้ · แดดต่ำจากทิศตะวันตก + เงา · ลำแสงส่องผ่านเมฆ · เงาเมฆเลื่อนบนพื้น · ไฟหน้าต่างเมือง (bloom)
//   คริสตัลเหนือนครหลวง Insomnia (แท่นโดม fd_eos_domecore) ส่องประกาย · ทะลุชั้นเมฆ → บินโค้งลงหาหมากของเรา
//  const fly = createEosFly(canvas, { board, self, lowQ, night })
//   fly.frame(u, t)   u = 0..1 ของช่วงบิน · t = วินาที   ·   fly.resize()   ·   fly.dispose()
//  ปลายทาง: กล้องมองหมากเราจากทิศใต้ (มุมเดียวกับกระดานตอนเริ่ม — หมุน 0) กว้าง ~9 ช่อง (RTS_VIEW_TILES.near) แล้ว EosCine จางเผยกระดานจริง
// ============================================================
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (u, a, b) => clamp01((u - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const canvas2d = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const tex = (cv, srgb = true) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

// ---------- สีพื้น (ค่าสีจริง — แสงในฉากทำให้มืดเอง) ----------
const NATURAL = {
  grass: "#66703c", forest: "#3a4a22", sand: "#c09a62", water: "#16384f", shallow: "#3f7d88", stable: "#8c7745",
};
const BUILT = { road: "#2b2c31", plaza: "#7e786b", bridge: "#6b4f32", base: "#5d5951" };
function tileKind(b, x, y) {
  const k = `${x},${y}`, t = b.terrain && b.terrain[k], s = b.special && b.special[k];
  if (t === "fd_eos_water" || t === "fd_eos_canal") return "water";
  if (s === "fd_eos_shallow") return "shallow";
  if (s === "fd_eos_forest") return "forest";
  if (s === "fd_eos_sand") return "sand";
  if (s === "fd_eos_stable") return "stable";
  if (s === "fd_eos_road") return "road";
  if (s === "fd_eos_plaza") return "plaza";
  if (s === "fd_eos_bridge") return "bridge";
  if (t && /bldg|wall|garage|pump|lamp|domecore|switch|lever|turret/.test(t)) return "base";
  if (t === "fd_eos_tree") return "forest";
  return "grass";
}

function paintGround(b, cols, rows, PX) {
  const W = cols * PX, H = rows * PX;
  const r = rng(7);
  const nat = canvas2d(W, H), g = nat.getContext("2d");
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = tileKind(b, x, y);
    g.fillStyle = NATURAL[k] || (k === "base" || k === "plaza" ? "#4f4b40" : NATURAL.grass);
    g.fillRect(x * PX, y * PX, PX, PX);
  }
  const out = canvas2d(W, H), o = out.getContext("2d");
  o.filter = `blur(${Math.round(PX * 0.28)}px)`;
  o.drawImage(nat, 0, 0);
  o.filter = "none";
  // ร่องรอยพื้น (จุดอ่อน-เข้ม) ให้ไม่แบนเป็นสีเรียบ
  for (let i = 0; i < W * H / 60; i++) {
    o.fillStyle = r() < 0.5 ? `rgba(0,0,0,${0.05 + r() * 0.08})` : `rgba(255,240,200,${0.03 + r() * 0.05})`;
    o.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3);
  }
  // ของที่คนสร้าง — ขอบคม
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = tileKind(b, x, y);
    if (!BUILT[k]) continue;
    const X = x * PX, Y = y * PX;
    o.fillStyle = BUILT[k];
    o.fillRect(X - 0.5, Y - 0.5, PX + 1, PX + 1);
    if (k === "plaza" || k === "base") {
      o.strokeStyle = "rgba(0,0,0,0.18)"; o.lineWidth = 1;
      o.strokeRect(X + 0.5, Y + 0.5, PX / 2, PX / 2); o.strokeRect(X + PX / 2 + 0.5, Y + PX / 2 + 0.5, PX / 2 - 1, PX / 2 - 1);
    } else if (k === "road") {
      for (let i = 0; i < 6; i++) { o.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; o.fillRect(X + r() * PX, Y + r() * PX, 2, 2); }
    } else if (k === "bridge") {
      o.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 1; i < 5; i++) o.fillRect(X, Y + (i * PX) / 5, PX, 1.5);
    }
  }
  // เส้นกลางถนน: ช่องถนนที่ติดถนนสองฝั่งตรงข้าม → ขีดประจางๆ
  const isRoad = (x, y) => b.special && b.special[`${x},${y}`] === "fd_eos_road";
  o.fillStyle = "rgba(235,215,150,0.35)";
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!isRoad(x, y)) continue;
    if (isRoad(x + 1, y) && !isRoad(x, y - 1) && isRoad(x, y + 1)) o.fillRect(x * PX + PX * 0.2, (y + 1) * PX - 1, PX * 0.45, 2);
    if (isRoad(x, y + 1) && !isRoad(x - 1, y) && isRoad(x + 1, y)) o.fillRect((x + 1) * PX - 1, y * PX + PX * 0.2, 2, PX * 0.45);
  }
  return out;
}
// พื้นนอกกระดาน: ต่อชนิดช่องที่ขอบออกไป (ทะเลของ Altissia ไหลออกนอกแผนที่ ทรายไลด์ต่อไป) แล้วจางในหมอก
function paintOuter(b, cols, rows, N, span) {
  const cv = canvas2d(N, N), g = cv.getContext("2d");
  const r = rng(11);
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const wx = (px / N - 0.5) * span + cols / 2, wy = (py / N - 0.5) * span + rows / 2;
    const x = Math.max(0, Math.min(cols - 1, Math.floor(wx))), y = Math.max(0, Math.min(rows - 1, Math.floor(wy)));
    const k = tileKind(b, x, y);
    g.fillStyle = NATURAL[k] || NATURAL.grass;
    g.fillRect(px, py, 1, 1);
  }
  const out = canvas2d(N, N), o = out.getContext("2d");
  o.filter = "blur(3px)"; o.drawImage(cv, 0, 0); o.filter = "none";
  for (let i = 0; i < N * N / 8; i++) { o.fillStyle = `rgba(0,0,0,${r() * 0.12})`; o.fillRect(r() * N, r() * N, 2, 2); }
  return out;
}
function windowsTex(seed, night) {
  const cv = canvas2d(64, 64), g = cv.getContext("2d"), r = rng(seed);
  g.fillStyle = "#1b202b"; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) {
    const lit = r() < (night ? 0.5 : 0.3);
    g.fillStyle = lit ? (r() < 0.7 ? "#ffcf8a" : "#a9dcff") : "#0c0f16";
    g.fillRect(4 + x * 10, 3 + y * 8, 6, 4);
  }
  const t = tex(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function glowTex() {
  const cv = canvas2d(128, 128), g = cv.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return tex(cv);
}
function starTex() {
  const cv = canvas2d(256, 256), g = cv.getContext("2d");
  g.translate(128, 128);
  const ray = (len, wd, a) => {
    g.save(); g.rotate(a);
    const gr = g.createLinearGradient(-len, 0, len, 0);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, len, wd, 0, 0, TAU); g.fill(); g.restore();
  };
  ray(126, 3.2, 0); ray(126, 3.2, Math.PI / 2); ray(70, 1.6, Math.PI / 4); ray(70, 1.6, -Math.PI / 4);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 40);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.fill();
  return tex(cv);
}
function puffTex() {
  const cv = canvas2d(256, 256), g = cv.getContext("2d"), r = rng(3);
  for (let i = 0; i < 26; i++) {
    const x = 128 + (r() - 0.5) * 120, y = 128 + (r() - 0.5) * 70, rr = 30 + r() * 46;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, "rgba(255,255,255,0.32)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  return tex(cv);
}
function rayTex() {
  const cv = canvas2d(64, 512), g = cv.getContext("2d");
  const img = g.createImageData(64, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 64; x++) {
    const ax = Math.exp(-Math.pow((x - 32) / 13, 2));
    const v = y / 511, ay = smooth(span(v, 0, 0.35)) * (1 - smooth(span(v, 0.6, 1)));
    const i = (y * 64 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
    img.data[i + 3] = Math.round(255 * ax * ay);
  }
  g.putImageData(img, 0, 0);
  return tex(cv);
}
// เงาเมฆ: พื้นขาว (คูณแล้วไม่เปลี่ยน) + ก้อนเทาอมม่วงนุ่มๆ
function cloudShadowTex() {
  const N = 512, cv = canvas2d(N, N), g = cv.getContext("2d"), r = rng(19);
  g.fillStyle = "#fff"; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 22; i++) {
    const x = r() * N, y = r() * N, rr = 40 + r() * 90;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr);
      gr.addColorStop(0, "rgba(70,64,96,0.55)"); gr.addColorStop(1, "rgba(70,64,96,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x + ox, y + oy, rr, 0, TAU); g.fill();
    }
  }
  const t = tex(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const SKY_VS = "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }";
const SKY_FS = `
uniform vec3 sunDir; uniform vec3 zen; uniform vec3 hor; uniform vec3 hot; uniform vec3 low;
varying vec3 vP;
void main(){
  vec3 d = normalize(vP);
  float e = d.y, s = max(dot(d, sunDir), 0.0);
  vec3 h = mix(hor, hot, pow(s, 3.0));
  vec3 c = mix(h, zen, smoothstep(-0.02, 0.5, e));
  c = mix(c, low, smoothstep(0.0, -0.15, e));
  c += hot * pow(s, 80.0) * 1.6 + hot * pow(s, 10.0) * 0.25;
  gl_FragColor = vec4(c, 1.0);
}`;

export function createEosFly(canvas, { board, self = null, lowQ = false, night = false } = {}) {
  const b = board || { cols: 32, rows: 32, terrain: {}, special: {} };
  const cols = b.cols || 32, rows = b.rows || 32;
  const HX = cols / 2, HZ = rows / 2;
  const W = (x) => x + 0.5 - HX, Z = (y) => y + 0.5 - HZ;
  const R = rng(45);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowQ, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQ ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = night ? 1.35 : 1.8; // สว่างขึ้น (Claude 2026-11-10: เดิมมืด/หม่น)
  renderer.shadowMap.enabled = !lowQ;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.debug.checkShaderErrors = false;

  const scene = new THREE.Scene();
  const FOG = new THREE.Color(night ? "#252a46" : "#6e6488");
  scene.background = FOG.clone();
  scene.fog = new THREE.FogExp2(FOG, night ? 0.010 : 0.006);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };

  // ---------- แสง ----------
  const sunDir = new THREE.Vector3(-1, night ? 0.45 : 0.3, 0.42).normalize();
  scene.add(new THREE.HemisphereLight(night ? "#5a6aac" : "#a0a4e0", night ? "#1c2030" : "#4a3a2c", night ? 1.45 : 2.1));
  const sun = new THREE.DirectionalLight(night ? "#9fb4ff" : "#ffb888", night ? 1.4 : 3.2);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = !lowQ;
  if (!lowQ) {
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 10; sc.far = 140;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  }
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(night ? "#2c3a70" : "#5a6aa8", 0.45);
  fill.position.set(30, 20, -10);
  scene.add(fill);

  // ---------- ท้องฟ้า ----------
  const skyMat = keep(new THREE.ShaderMaterial({
    vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      sunDir: { value: sunDir },
      zen: { value: new THREE.Color(night ? "#03050f" : "#0c1636") },
      hor: { value: new THREE.Color(night ? "#1b2140" : "#5a4a78") },
      hot: { value: new THREE.Color(night ? "#5a70b0" : "#ff9a5a") },
      low: { value: FOG.clone() },
    },
  }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(500, 32, 16)), skyMat);
  scene.add(sky);

  // ---------- พื้น ----------
  const PX = lowQ ? 24 : 40;
  const gTex = keep(tex(paintGround(b, cols, rows, PX)));
  gTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // น้ำ = ส่วนที่มันวาว (roughnessMap) บนพื้นผืนเดียว — ไม่มีรอยต่อระหว่างช่อง · แดดต่ำสะท้อนเป็นประกาย
  const rough = canvas2d(cols * 8, rows * 8), rg = rough.getContext("2d");
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = tileKind(b, x, y);
    const v = k === "water" ? 40 : k === "shallow" ? 90 : k === "road" ? 200 : 245;
    rg.fillStyle = `rgb(${v},${v},${v})`; rg.fillRect(x * 8, y * 8, 8, 8);
  }
  const rTexMap = keep(tex(rough, false));
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(cols, rows)), keep(new THREE.MeshStandardMaterial({ map: gTex, roughness: 1, roughnessMap: rTexMap, metalness: 0 })));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const OUT = 220;
  const oTex = keep(tex(paintOuter(b, cols, rows, 160, OUT)));
  const outer = new THREE.Mesh(keep(new THREE.PlaneGeometry(OUT, OUT)), keep(new THREE.MeshStandardMaterial({ map: oTex, roughness: 1 })));
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.03;
  outer.receiveShadow = true;
  scene.add(outer);

  // ---------- ของบนพื้น (อินสแตนซ์) ----------
  const MISC_KINDS = new Set(["fd_eos_garage", "fd_eos_pump", "fd_eos_switch", "fd_eos_lever"]);
  const cells = { water: [], shallow: [], bldg: [], wall: [], tree: [], forest: [], rock: [], lamp: [], pillar: [], core: [], misc: [] };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = `${x},${y}`, t = b.terrain && b.terrain[k], s = b.special && b.special[k];
    if (t === "fd_eos_water" || t === "fd_eos_canal") cells.water.push([x, y]);
    else if (s === "fd_eos_shallow") cells.shallow.push([x, y]);
    if (t === "fd_eos_bldg") cells.bldg.push([x, y]);
    else if (t === "fd_eos_wall" || t === "fd_eos_turret") cells.wall.push([x, y, t]);
    else if (t === "fd_eos_tree") cells.tree.push([x, y]);
    else if (t === "fd_eos_rock") cells.rock.push([x, y]);
    else if (t === "fd_eos_lamp") cells.lamp.push([x, y]);
    else if (t === "fd_eos_pillar") cells.pillar.push([x, y]);
    else if (t === "fd_eos_domecore") cells.core.push([x, y]);
    else if (t && MISC_KINDS.has(t)) cells.misc.push([x, y, t]);
    if (s === "fd_eos_forest") cells.forest.push([x, y]);
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), C = new THREE.Color();
  const inst = (geo, mat, list, place, { cast = true, receive = true, colorOf = null } = {}) => {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(keep(geo), mat, list.length);
    list.forEach((it, i) => {
      place(it, V, Q, S, i);
      M.compose(V, Q, S);
      m.setMatrixAt(i, M);
      if (colorOf) m.setColorAt(i, colorOf(it, i, C));
    });
    m.castShadow = cast && !lowQ;
    m.receiveShadow = receive && !lowQ;
    scene.add(m);
    return m;
  };
  // ตึก: ความสูงตามย่าน (นครหลวงสูงสุด) · 4 กลุ่มความสูง เพื่อให้หน้าต่างไม่ยืด
  const town = (x, y) => (y <= 8 && x >= 8 && x <= 23 ? "insomnia" : "other");
  const roofMat = keep(new THREE.MeshStandardMaterial({ color: "#1a1d24", roughness: 0.85 }));
  const BUCKETS = [0.9, 1.6, 2.5, 3.6];
  BUCKETS.forEach((h, bi) => {
    const list = cells.bldg.filter(([x, y]) => {
      const hr = rng(x * 131 + y * 17 + 3)();
      const want = town(x, y) === "insomnia" ? (hr < 0.25 ? 3 : hr < 0.6 ? 2 : 1) : (hr < 0.55 ? 0 : 1);
      return want === bi;
    });
    if (!list.length) return;
    const wt = keep(windowsTex(bi * 7 + 1, night));
    wt.repeat.set(1, h * 1.2);
    const side = keep(new THREE.MeshStandardMaterial({ map: wt, emissiveMap: wt, emissive: "#ffffff", emissiveIntensity: night ? 1.0 : 0.55, roughness: 0.7 }));
    const geo = new THREE.BoxGeometry(0.9, h, 0.9);
    inst(geo, [side, side, roofMat, roofMat, side, side], list, ([x, y], v, q, s) => {
      const jr = rng(x * 7 + y * 13)();
      v.set(W(x), h / 2, Z(y)); q.identity(); s.set(0.92 + jr * 0.08, 1, 0.92 + jr * 0.08);
    });
  });
  inst(new THREE.BoxGeometry(1, 0.8, 1), keep(new THREE.MeshStandardMaterial({ color: "#6a6355", roughness: 0.9 })), cells.wall, ([x, y, t], v, q, s) => {
    v.set(W(x), t === "fd_eos_turret" ? 0.55 : 0.4, Z(y)); q.identity(); s.set(1, t === "fd_eos_turret" ? 1.4 : 1, 1);
  });
  // ต้นไม้ (ช่องต้นไม้ 1 ต้นใหญ่ · ป่าทึบ 2–3 ต้น)
  const trees = [];
  cells.tree.forEach(([x, y]) => trees.push([W(x), Z(y), 1.15]));
  cells.forest.forEach(([x, y]) => {
    const n = 2 + (R() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) trees.push([W(x) + (R() - 0.5) * 0.7, Z(y) + (R() - 0.5) * 0.7, 0.65 + R() * 0.4]);
  });
  const treeMat = keep(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, flatShading: true }));
  inst(new THREE.ConeGeometry(0.32, 1, 7).translate(0, 0.62, 0), treeMat, trees, ([x, z, k], v, q, s) => {
    v.set(x, 0, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * TAU); s.set(k, k * (0.9 + R() * 0.4), k);
  }, { colorOf: (_, i, c) => c.set(i % 3 === 0 ? "#26401f" : i % 3 === 1 ? "#1d3519" : "#2f4a22") });
  inst(new THREE.CylinderGeometry(0.05, 0.07, 0.25, 5).translate(0, 0.12, 0), keep(new THREE.MeshStandardMaterial({ color: "#3a2a1c" })), trees, ([x, z, k], v, q, s) => {
    v.set(x, 0, z); q.identity(); s.set(k, k, k);
  }, { cast: false });
  inst(new THREE.DodecahedronGeometry(0.3, 0), keep(new THREE.MeshStandardMaterial({ color: "#4f5057", roughness: 1, flatShading: true })), cells.rock, ([x, y], v, q, s) => {
    v.set(W(x) + (R() - 0.5) * 0.3, 0.08, Z(y) + (R() - 0.5) * 0.3); q.setFromEuler(new THREE.Euler(R(), R() * TAU, R())); s.set(1.1, 0.55 + R() * 0.3, 0.9);
  });
  const MISC = { fd_eos_garage: ["#5a5248", 0.95], fd_eos_pump: ["#7d2a22", 0.7], fd_eos_switch: ["#38463a", 0.5], fd_eos_lever: ["#7a6a48", 0.45] };
  inst(new THREE.BoxGeometry(0.85, 1, 0.85), keep(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 })), cells.misc, ([x, y, t], v, q, s) => {
    const h = (MISC[t] || ["#555", 0.5])[1];
    v.set(W(x), h / 2, Z(y)); q.identity(); s.set(1, h, 1);
  }, { colorOf: ([, , t], _, c) => c.set((MISC[t] || ["#555555"])[0]) });
  // เสาไฟถนน + แสงอุ่น
  const glow = keep(glowTex());
  const sprites = [];
  const addGlow = (x, y, z, size, color, op) => {
    const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    sp.position.set(x, y, z); sp.scale.set(size, size, 1); sp.userData.op = op;
    scene.add(sp); sprites.push(sp);
    return sp;
  };
  inst(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 5).translate(0, 0.55, 0), keep(new THREE.MeshStandardMaterial({ color: "#2a2d33" })), cells.lamp, ([x, y], v, q, s) => { v.set(W(x), 0, Z(y)); q.identity(); s.set(1, 1, 1); });
  cells.lamp.forEach(([x, y]) => addGlow(W(x), 1.12, Z(y), 0.55, "#ffc98a", night ? 0.7 : 0.4));
  // เสาคริสตัล (ยึดพื้นที่)
  const crystalMat = keep(new THREE.MeshStandardMaterial({ color: "#8fd8ff", emissive: "#3aa8ff", emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.1, flatShading: true }));
  inst(new THREE.OctahedronGeometry(0.32, 0), crystalMat, cells.pillar, ([x, y], v, q, s) => { v.set(W(x), 0.62, Z(y)); q.identity(); s.set(0.8, 1.5, 0.8); });
  cells.pillar.forEach(([x, y]) => addGlow(W(x), 0.7, Z(y), 1.8, "#7fd0ff", 0.55));

  // ---------- คริสตัลเหนือนครหลวง ----------
  const coreCell = cells.core[0] || [12, 2];
  const CORE = new THREE.Vector3(W(coreCell[0]), 0, Z(coreCell[1]));
  const coreGem = new THREE.Mesh(keep(new THREE.OctahedronGeometry(0.5, 0)), crystalMat);
  coreGem.position.set(CORE.x, 2.2, CORE.z); coreGem.scale.set(0.8, 1.7, 0.8);
  scene.add(coreGem);
  const beam = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.1, 0.32, 18, 12, 1, true).translate(0, 9, 0)), keep(new THREE.MeshBasicMaterial({ color: "#7fcfff", transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })));
  beam.position.copy(CORE);
  scene.add(beam);
  const halo = addGlow(CORE.x, 2.2, CORE.z, 5, "#8fd8ff", 0.65);
  const star = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(starTex()), color: "#e6f7ff", transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
  star.position.set(CORE.x, 2.25, CORE.z);
  scene.add(star);

  // ---------- จุดลงจอด (หมากของเรา) ----------
  const T = new THREE.Vector3(self ? W(self.x) : 0, 0, self ? Z(self.y) : 0);
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.34, 0.46, 48)), keep(new THREE.MeshBasicMaterial({ color: "#cfeeff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
  ring.rotation.x = -Math.PI / 2; ring.position.set(T.x, 0.06, T.z);
  scene.add(ring);
  const pillar = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.22, 0.34, 7, 16, 1, true).translate(0, 3.5, 0)), keep(new THREE.MeshBasicMaterial({ color: "#bfe6ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })));
  pillar.position.copy(T);
  scene.add(pillar);

  // ---------- เงาเมฆบนพื้น ----------
  const csTex = keep(cloudShadowTex());
  csTex.repeat.set(2.2, 2.2);
  const cShadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(90, 90)), keep(new THREE.MeshBasicMaterial({ map: csTex, transparent: true, blending: THREE.MultiplyBlending, premultipliedAlpha: true, depthWrite: false, fog: false })));
  cShadow.rotation.x = -Math.PI / 2; cShadow.position.y = 0.045;
  scene.add(cShadow);

  // ---------- ลำแสงผ่านเมฆ ----------
  const rTex = keep(rayTex());
  const rays = Array.from({ length: lowQ ? 4 : 7 }, (_, i) => {
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({ map: rTex, color: night ? "#9fb4ff" : "#ffc896", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })));
    const gx = (R() - 0.5) * 30, gz = (R() - 0.5) * 30;
    m.userData = { G: new THREE.Vector3(gx, 0, gz), w: 2 + R() * 4, len: 70, op: 0.05 + R() * 0.07, ph: R() * TAU, sp: 0.15 + R() * 0.25, i };
    scene.add(m);
    return m;
  });
  const axis = sunDir.clone(); // ลำแสงพุ่งตามทิศแดด
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), basis = new THREE.Matrix4();
  const orientRay = (m) => {
    const d = m.userData;
    m.position.copy(d.G).addScaledVector(axis, d.len * 0.42);
    tmpA.copy(camera.position).sub(m.position);
    tmpA.addScaledVector(axis, -tmpA.dot(axis)).normalize(); // ตั้งฉากกับแกน → หันหน้าเข้ากล้อง
    tmpB.crossVectors(axis, tmpA).normalize();
    basis.makeBasis(tmpB, axis, tmpA);
    m.quaternion.setFromRotationMatrix(basis);
    m.scale.set(d.w, d.len, 1);
  };

  // ---------- ชั้นเมฆ (กล้องพุ่งทะลุลงมา) + เมฆไกลขอบฟ้า ----------
  const pTex = keep(puffTex());
  const clouds = [];
  for (let i = 0; i < (lowQ ? 20 : 36); i++) {
    const lit = R() < 0.55;
    const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: pTex, color: night ? (lit ? "#8a94c0" : "#4a5078") : lit ? "#f0c0b0" : "#8f86b0", transparent: true, opacity: 0, depthWrite: false, fog: false })));
    const a = R() * TAU, d = Math.sqrt(R()) * 34;
    sp.position.set(Math.cos(a) * d - 2, 40 + R() * 14, Math.sin(a) * d * 0.8 + 16);
    const s = 16 + R() * 18;
    sp.scale.set(s, s * 0.55, 1);
    sp.material.rotation = R() * TAU;
    sp.userData.op = 0.45 + R() * 0.35;
    scene.add(sp); clouds.push(sp);
  }
  const farClouds = [];
  for (let i = 0; i < (lowQ ? 10 : 18); i++) {
    const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: pTex, color: night ? "#3a4270" : R() < 0.5 ? "#e8a07a" : "#9a7aa0", transparent: true, opacity: 0.55, depthWrite: false, fog: false })));
    const a = R() * TAU, d = 90 + R() * 60;
    sp.position.set(Math.cos(a) * d, 9 + R() * 14, Math.sin(a) * d);
    const s = 50 + R() * 50;
    sp.scale.set(s, s * 0.35, 1);
    scene.add(sp); farClouds.push(sp);
  }

  // ---------- กล้อง ----------
  const toward = (a, bb, k) => a.clone().lerp(bb, k);
  const INS = new THREE.Vector3(W(15.5), 0, Z(4));
  const vfovEnd = 40;
  const endDist = () => {
    const hf = 2 * Math.atan(Math.tan((vfovEnd * Math.PI) / 360) * camera.aspect);
    return 4.5 / Math.tan(hf / 2);
  };
  const ELEV = (36 * Math.PI) / 180;
  let posCurve = null, lookCurve = null;
  const buildPath = () => {
    const d = endDist();
    const E = T.clone().add(new THREE.Vector3(0, d * Math.sin(ELEV), d * Math.cos(ELEV)));
    const c0 = toward(new THREE.Vector3(), T, 0.25);
    posCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(c0.x - 6, 66, c0.z + 30),
      new THREE.Vector3(c0.x - 10, 34, c0.z + 26),
      toward(c0, T, 0.6).add(new THREE.Vector3(12, 17, 15)),
      T.clone().add(new THREE.Vector3(4, d * Math.sin(ELEV) * 1.9, d * Math.cos(ELEV) * 1.7)),
      E,
    ], false, "centripetal");
    lookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(c0.x, 0, c0.z - 8),
      toward(INS, c0, 0.45),
      toward(INS, T, 0.6),
      T.clone().add(new THREE.Vector3(0.4, 0, -0.6)),
      T.clone(),
    ], false, "centripetal");
  };

  // ---------- post (bloom) ----------
  let composer = null, bloom = null;
  if (!lowQ) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), night ? 0.7 : 0.45, 0.5, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const size = { w: 1, h: 1 };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    size.w = Math.max(1, r.width); size.h = Math.max(1, r.height);
    renderer.setSize(size.w, size.h, false);
    composer?.setSize(size.w, size.h);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    buildPath();
  };
  resize();
  try { renderer.compile(scene, camera); } catch { /* คอมไพล์ตอนวาดจริงแทน */ }

  const P = new THREE.Vector3(), L = new THREE.Vector3();
  return {
    renderer,
    scene,
    resize,
    /** u = 0..1 ของช่วงบิน · t = วินาที */
    frame(u, t) {
      // เดินตามเส้นทาง: เริ่มมีความเร็ว (ต่อจากดิ่งลงโลก) → ชะลอนิ่งตอนถึงหมาก
      const p = span(u, 0, 0.9);
      const k = 0.35 * p + 0.65 * (1 - Math.pow(1 - smooth(p), 1.6));
      posCurve.getPointAt(Math.min(1, k), P);
      lookCurve.getPointAt(Math.min(1, k), L);
      camera.position.copy(P);
      camera.lookAt(L);
      const fov = 50 - 10 * smooth(p);
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

      clouds.forEach((s) => { s.material.opacity = s.userData.op * clamp01((P.y - s.position.y + 2) / 7) * (1 - span(u, 0.12, 0.26)); });
      farClouds.forEach((s, i) => { s.material.rotation = Math.sin(t * 0.05 + i) * 0.05; });
      rays.forEach((m) => {
        const d = m.userData;
        m.material.opacity = d.op * (0.6 + 0.4 * Math.sin(t * d.sp + d.ph)) * smooth(span(u, 0.06, 0.25));
        orientRay(m);
      });
      csTex.offset.set(t * 0.012, t * 0.006);
      // คริสตัลนครหลวง: หมุนช้า · ประกายวาบตอนกล้องโฉบผ่าน
      coreGem.rotation.y = t * 0.6;
      coreGem.position.y = 2.2 + Math.sin(t * 1.3) * 0.08;
      const flare = Math.exp(-Math.pow((u - 0.42) / 0.07, 2));
      const sScale = 2.6 + 0.5 * Math.sin(t * 2.1) + 5 * flare;
      star.scale.set(sScale, sScale, 1);
      star.material.rotation = t * 0.15;
      star.material.opacity = 0.75 + 0.25 * flare;
      halo.material.opacity = halo.userData.op * (0.8 + 0.2 * Math.sin(t * 1.7));
      // จุดลงจอด
      const land = smooth(span(u, 0.62, 0.8)) * (1 - smooth(span(u, 0.9, 1)));
      ring.material.opacity = land * (0.35 + 0.15 * Math.sin(t * 3));
      const rs = 1 + 0.12 * Math.sin(t * 3);
      ring.scale.set(rs, rs, 1);
      pillar.material.opacity = land * 0.07;

      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    dispose() {
      composer?.dispose?.();
      bloom?.dispose?.();
      scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      disposables.forEach((d) => { try { d.dispose(); } catch { /* */ } });
      renderer.dispose();
    },
  };
}

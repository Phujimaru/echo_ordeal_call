// ============================================================
//  ฉากท่าไม้ตาย Mahapralaya ของมหาเทพอรชุน — ตัววาด (ไม่ผูกกับ React) · ใช้โดย ArjunaUlt.jsx
//  พื้นฉาก = วีดีโอต้นฉบับ /characters/arjuna/arjuna_ult.mp4 (ย่อจาก 1080p เป็น 720p · 17.37 วิ · เสียงในไฟล์) วาดลงแคนวาสทุกเฟรม
//  แล้วทับเฉพาะส่วนที่เปลี่ยน — เวลา = video.currentTime (ภาพ/เสียงตรงกันเสมอ) · จุดตัดช็อตวัดจากไฟล์จริง:
//   0–1.6     ซูมกรอบภาพให้แถบชื่อท่าตกขอบล่าง (ไม่มีข้อความในฉาก — CLAUDE.md) · แฟลชขาวเปิดฉาก
//   4.03–5.23 ลบศัตรูต้นฉบับ (แปะลายอวกาศจากข้างๆ) → หมากของคนที่โดนลอยแทน
//   5.23–12.5 ลูกแก้วต้นฉบับ → โลก ORDEAL (globeCore.getEarth) ตามตำแหน่งที่วัดจากวีดีโอทีละเฟรม (SHOTS) · หมากยืนบนผิวโลก
//   9.53      ดาบทองฟัน → โลกแยก 3 กลีบตามรอยผ่าในวีดีโอ (SPLIT) ค้างแยกไว้ = ติดเปราะบาง (หมากร้าว + ป้ายแทนป้ายสถานะต้นฉบับ)
//   11.67     ใบดาบสี 4 เล่ม (SLASHES) ซัดใส่ → กลีบแตกเป็นชิ้น
//   12.5      ระเบิด = ลงดาเมจ: หมากปลิวออกนอกจอแล้วหาย เหลือตัวเลข   12.33–จบ ลบตัวเลข/ป้ายต้นฉบับมุมซ้ายบน
//  พิกัดทั้งหมดในไฟล์นี้ = พิกัดวีดีโอ 1280×720 (แปลงเป็นจอด้วย view ของเฟรมนั้น)
// ============================================================
import { THREE, getEarth } from "../globe/globeCore";
import { hexPath } from "./boardGeo";

export const ARJUNA_ULT_SRC = "/characters/arjuna/arjuna_ult.mp4";
export const ARJUNA_ULT_MS = 17400;
export const ARJUNA_T = { crush: 9.53, boom: 12.5 }; // วินาทีที่ติดเปราะบาง (ดาบผ่าโลก) / ลงดาเมจ (ระเบิด)
const VW = 1280, VH = 720;
const TAU = Math.PI * 2;
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut3 = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (seed) => { let s = (Math.abs(Math.floor(seed)) % 2147483646) || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };

// ลูกแก้วในวีดีโอ แยกตามช็อต [วินาที, cx, cy, รัศมีรวมขอบเรือง] — วัดจากเฟรมจริง (ไม่ไล่ค่าข้ามจุดตัดช็อต)
const SHOTS = [
  // ถอยกล้อง → ยื่นมือ (ช็อตใกล้ 8.267–9.40 ไม่มีลูกแก้ว)
  [[5.233, 660, 600, 615], [6.05, 660, 590, 580], [6.55, 640, 560, 560], [6.64, 640, 558, 555], [6.667, 510, 380, 470],
    [6.7, 410, 240, 370], [6.733, 344, 212, 309], [6.767, 340, 218, 298], [6.8, 305, 190, 262], [6.833, 276, 172, 222], [6.866, 262, 173, 182], [6.96, 253, 165, 165], [7.06, 252, 168, 148], [7.16, 261, 175, 137], [7.26, 267, 179, 131],
    [7.36, 277, 186, 128], [7.46, 280, 188, 127], [8.267, 282, 189, 126]],
  // กลับมาที่มือ · ดาบผ่า (9.53) · ค้างแยก
  [[9.40, 280, 198, 130], [9.5, 300, 188, 127], [9.6, 284, 192, 127], [9.78, 285, 196, 125], [9.98, 277, 192, 122],
    [10.5, 268, 192, 122], [11.2, 271, 192, 122], [11.633, 278, 192, 122]],
  // ซูมตอนใบดาบสีซัดใส่
  [[11.633, 265, 190, 172], [11.82, 275, 188, 175], [12.02, 290, 212, 175], [12.22, 335, 228, 170], [12.5, 350, 235, 168]],
];
// ดาบทองผ่าโลก (ตามรอยผ่าในวีดีโอ): เวลาเส้นขวา/ซ้าย · ความเอียง · ความโค้งของรอย (สัดส่วนรัศมี)
const SPLIT = { t: [9.53, 9.567], tilt: 0.1, bulge: 0.56 };
// ใบดาบสีที่ซัดใส่โลกหลังจากนั้น (ตามสีและแนวใบดาบในวีดีโอ): เวลา · มุมแนวฟัน (เรเดียน) · เยื้องจากกลาง (สัดส่วนรัศมี) · ฝั่งที่ดาบเข้ามา · สี
const SLASHES = [
  [11.667, -0.17, 0, 1, "255,60,70"],
  [11.733, 1.05, 0.05, 1, "255,205,40"],
  [11.8, 0.42, -0.06, 1, "255,60,230"],
  [11.87, -0.92, 0.07, -1, "70,235,255"],
];
// ดาวเคราะห์รอบลูกแก้ว [วินาที, cx, cy, รัศมี] แยกตามช็อต — วัดจากเฟรมจริง · ตัดวงกลมจากวีดีโอมาวางหน้าโลก (ไม่ให้โลกบัง)
const PLANETS = [
  // ถอยกล้อง → ยื่นมือ
  [[5.233, 20, 470, 262], [6.05, 60, 430, 232], [6.64, 45, 395, 215], [6.667, 54, 284, 146], [6.7, 50, 222, 107], [6.733, 58, 192, 82], [6.767, 58, 192, 83],
    [6.8, 64, 173, 67], [6.833, 70, 156, 54], [6.867, 76, 152, 48], [6.933, 86, 149, 42], [7.0, 93, 149, 39], [7.067, 106, 152, 34], [7.2, 133, 161, 32], [7.333, 150, 170, 30], [7.467, 161, 176, 30], [8.267, 165, 174, 30]],
  [[5.233, 565, 640, 78], [6.05, 580, 560, 64], [6.64, 593, 527, 63], [6.667, 494, 440, 52], [6.7, 414, 370, 43], [6.733, 362, 324, 35], [6.767, 362, 324, 36], [6.8, 330, 294, 32],
    [6.833, 292, 260, 27], [6.9, 273, 242, 23], [6.967, 268, 235, 21.5], [7.033, 265, 228, 20], [7.167, 270, 224, 18.5], [7.3, 279, 227, 18], [7.433, 290, 229, 18], [7.5, 294, 229, 18], [8.267, 295, 225, 17]],
  [[5.233, 1268, 610, 92], [6.05, 1215, 592, 82], [6.64, 1204, 610, 80], [6.667, 960, 490, 72], [6.7, 764, 396, 57], [6.733, 646, 344, 46], [6.767, 644, 344, 48], [6.8, 570, 308, 40],
    [6.833, 480, 270, 33], [6.867, 446, 255, 28], [6.933, 420, 244, 25], [7.0, 407, 240, 24], [7.067, 388, 236, 23], [7.2, 386, 239, 20], [7.333, 392, 246, 20], [7.467, 397, 250, 19], [8.267, 396, 258, 18.5]],
  [[5.233, 20, 98, 72], [6.05, 25, 150, 60], [6.64, 20, 175, 55], [6.667, 22, 125, 40], [6.7, 20, 100, 30]],
  [[6.767, 380, -5, 30], [6.8, 350, 4, 30], [6.833, 306, 10, 28], [6.867, 294, 15, 27], [6.933, 280, 29, 24], [7.0, 276, 36, 23], [7.133, 273, 60, 19], [7.2, 282, 73, 19], [7.333, 293, 88, 18.5], [7.467, 302, 96, 18], [8.133, 309, 112, 18], [8.267, 309, 113, 18]],
  [[6.833, 250, 16, 14], [6.867, 243, 27, 14], [6.933, 233, 38, 12], [7.0, 232, 43, 11], [7.133, 234, 58, 10.5], [7.2, 245, 70, 9.5], [7.333, 257, 82, 9], [7.467, 266, 86, 9], [8.267, 273, 81, 9.5]],
  // กลับมาที่มือ → ก่อนดาบฟัน
  [[9.4, 176, 175, 29], [9.6, 173, 176, 30], [9.8, 169, 172, 29], [11.66, 167, 171, 29]],
  [[9.4, 323, 143, 17.5], [9.6, 324, 146, 17], [9.8, 318, 142, 17], [11.66, 318, 141, 17]],
  [[9.4, 392, 270, 19], [9.6, 394, 272, 18.5], [9.8, 389, 270, 19], [11.66, 388, 270, 19]],
  [[9.4, 292, 75, 8], [9.6, 292, 79, 8.5], [9.8, 287, 72, 8.5], [11.66, 285, 72, 8.5]],
  [[9.4, 321, 207, 15], [9.7, 317, 209, 15], [10.1, 316, 208, 16], [10.5, 313, 206, 16.5], [11.66, 314, 205, 16.5]],
];
function keyAt(track, t) {
  if (t < track[0][0] || t > track[track.length - 1][0]) return null;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1], b = track[i];
    if (t <= b[0]) { const k = (t - a[0]) / (b[0] - a[0]); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; }
  }
  return null;
}
function bubbleAt(t) {
  for (let i = SHOTS.length - 1; i >= 0; i--) {
    const q = keyAt(SHOTS[i], t);
    if (q) return { x: q[0], y: q[1], r: q[2] };
  }
  return null;
}

// ---------- รูปหมาก (โหลดครั้งเดียวต่อหน้าเว็บ) ----------
const imgCache = new Map();
function img(src) {
  if (!src) return null;
  let e = imgCache.get(src);
  if (!e) { const im = new Image(); e = { im, ok: false }; im.onload = () => { e.ok = true; }; im.src = src; imgCache.set(src, e); }
  return e.ok ? e.im : null;
}
let videoCache = null;
export function preloadArjunaUlt(targets) {
  getEarth();
  for (const u of targets || []) img(u.img);
  if (!videoCache) { videoCache = document.createElement("video"); videoCache.preload = "auto"; videoCache.src = ARJUNA_ULT_SRC; }
}

// ---------- โลก ORDEAL (three.js นอกจอ → drawImage ลงแคนวาสหลัก) ----------
function makeGlobe(lowQ) {
  const size = lowQ ? 512 : 1024;
  const cv = document.createElement("canvas");
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: !lowQ, preserveDrawingBuffer: true }); }
  catch { return null; }
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  cam.position.set(0, 0, 4.9);
  const earth = getEarth();
  const tex = new THREE.CanvasTexture(earth.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  earth.textures.add(tex);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), mat);
  ball.rotation.x = 0.4;
  scene.add(ball);
  // เปลือกแก้วฟ้า (ขอบสว่าง fresnel) · glow = พลังก่อนบีบ (สว่างขึ้นจนขาว)
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.03, 48, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 1 }, glow: { value: 0 } },
    vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform float k; uniform float glow; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.0); vec3 c = vec3(0.2,0.7,1.0) * (0.12 + f * 1.6) * k + vec3(0.85,0.95,1.0) * glow * (0.5 + f); gl_FragColor = vec4(c, 1.0); }",
  }));
  scene.add(shell);
  // ภาพนิ่งของโลก (หลังถูกผ่าโลกหยุดหมุน — วาดซ้ำจากแคนวาส 2D ถูกกว่าดึงจาก WebGL ทุกชิ้น)
  const still = document.createElement("canvas");
  still.width = still.height = size;
  const sg = still.getContext("2d");
  const tmp = new THREE.Vector3(), nrm = new THREE.Vector3(), toCam = new THREE.Vector3();
  return {
    cv, still,
    freeze() { sg.clearRect(0, 0, size, size); sg.drawImage(cv, 0, 0); },
    // จุดบนผิวโลก (ทิศในพิกัดโลก) → { x, y } ในช่วง −1..1 ของภาพ · nx/ny = ทิศ "ขึ้น" ของผิวบนจอ · facing = หันหากล้องแค่ไหน (≤ 0 = ด้านหลัง)
    project(dir, h = 0) {
      ball.updateMatrixWorld();
      nrm.copy(dir).applyQuaternion(ball.quaternion).normalize();
      tmp.copy(nrm).multiplyScalar(1 + h);
      toCam.copy(cam.position).sub(tmp).normalize();
      const facing = nrm.dot(toCam);
      const p = tmp.clone().project(cam), q = nrm.clone().multiplyScalar(1.25 + h).project(cam);
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      return { x: p.x, y: p.y, nx: (q.x - p.x) / len, ny: (q.y - p.y) / len, facing };
    },
    render(t, { glow = 0, shellK = 1, opacity = 0.9 } = {}) {
      ball.rotation.y = -1.1 + t * 0.12;
      mat.opacity = opacity;
      shell.material.uniforms.k.value = shellK;
      shell.material.uniforms.glow.value = glow;
      renderer.render(scene, cam);
    },
    dispose() { earth.textures.delete(tex); tex.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}
// สัดส่วนรัศมีโลกบนภาพ three.js (กล้อง fov 30 ห่าง 4.9) → ขนาดภาพที่ต้องวาดให้โลกมีรัศมี R = R / GLOBE_R
const GLOBE_R = 1 / (4.9 * Math.tan((15 * Math.PI) / 180)) / 2;

function damageNum(g, n, x, y, size, alpha) {
  if (alpha <= 0.01) return;
  g.save(); g.globalAlpha = alpha;
  g.font = `900 ${size | 0}px Kanit, sans-serif`; g.textAlign = "left"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = size * 0.2; g.strokeStyle = "#3a0606"; g.strokeText(`-${n}`, x, y);
  const gr = g.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  gr.addColorStop(0, "#fff6c8"); gr.addColorStop(0.5, "#ffc93a"); gr.addColorStop(1, "#e2540e");
  g.fillStyle = gr; g.fillText(`-${n}`, x, y);
  g.restore();
}
function glowAt(g, x, y, r, rgb, a) {
  if (a <= 0.003 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
// ---------- หมากแบบเต็ม: ฐานวงแสงบนพื้น + เสาแสง + ประกายลอย + หมากลอยเหนือฐาน (กรอบทอง) ----------
//  (x, y) = จุดฐานบนพื้น · r = รัศมีหมาก · up = ทิศ "ขึ้น" บนจอ [ux, uy] · flat = ฐานแบนแค่ไหน (0..1 — หันหากล้อง = กลม)
function token(g, u, x, y, r, t, { alpha = 1, crack = 0, up = [0, -1], flat = 0.35, seed = 0, lift = 1, bare = false } = {}) {
  if (alpha <= 0.01 || r < 1) return;
  const col = hexRgb(u.color || "#7f8aa6");
  const [ux, uy] = up, ang = Math.atan2(ux, -uy);
  const bob = REDUCED ? 0 : Math.sin(t * 2.3 + seed * 1.9) * r * 0.12;
  const hx = x + ux * r * (1.55 * lift + 0.12) + ux * bob, hy = y + uy * r * (1.55 * lift + 0.12) + uy * bob;
  g.save(); g.globalAlpha *= alpha;
  if (!bare) { // bare = เฉพาะตัวหมาก (ตอนปลิวจากแรงระเบิด ไม่มีพื้นให้ยืน)
  // เงาบนพื้น
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(1, flat);
  const sh = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
  sh.addColorStop(0, "rgba(0,0,20,.55)"); sh.addColorStop(1, "rgba(0,0,20,0)");
  g.fillStyle = sh; g.beginPath(); g.arc(0, 0, r * 1.5, 0, TAU); g.fill();
  g.restore();
  g.globalCompositeOperation = "lighter";
  // วงเวทบนพื้น (สีที่นั่ง) หมุนช้าๆ
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(1, flat);
  const spin = REDUCED ? 0 : t * 0.9 + seed;
  g.strokeStyle = `rgba(${col},.95)`; g.lineWidth = Math.max(0.8, r * 0.09);
  g.beginPath(); g.arc(0, 0, r * 1.2, 0, TAU); g.stroke();
  g.strokeStyle = `rgba(255,240,200,.7)`; g.lineWidth = Math.max(0.6, r * 0.05);
  g.setLineDash([r * 0.35, r * 0.22]); g.lineDashOffset = -spin * r;
  g.beginPath(); g.arc(0, 0, r * 0.92, 0, TAU); g.stroke(); g.setLineDash([]);
  glowAt(g, 0, 0, r * 1.7, col, 0.55);
  g.restore();
  // เสาแสงพุ่งขึ้นจากฐาน
  const L = r * 4.2;
  g.save(); g.translate(x, y); g.rotate(ang);
  const pl = g.createLinearGradient(0, 0, 0, -L);
  pl.addColorStop(0, `rgba(${col},.75)`); pl.addColorStop(0.35, `rgba(${col},.35)`); pl.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = pl;
  const pw = r * (0.8 + (REDUCED ? 0 : 0.12 * Math.sin(t * 6 + seed)));
  g.beginPath(); g.moveTo(-pw, 0); g.lineTo(-pw * 0.45, -L); g.lineTo(pw * 0.45, -L); g.lineTo(pw, 0); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(-pw * 0.12, -L * 0.8, pw * 0.24, L * 0.8);
  // ประกายลอยขึ้น
  const rr = rnd(seed * 31 + 7);
  for (let i = 0; i < 6; i++) {
    const ph = (rr() + (REDUCED ? 0 : t * (0.35 + rr() * 0.3))) % 1, sx = (rr() - 0.5) * r * 1.8;
    g.fillStyle = `rgba(255,250,220,${0.9 * Math.sin(ph * Math.PI)})`;
    const s = Math.max(0.8, r * 0.09);
    g.fillRect(sx - s / 2, -ph * L * 0.9 - s / 2, s, s);
  }
  g.restore();
  g.globalCompositeOperation = "source-over";
  }
  // หมาก: กรอบทองสองชั้น + รูป + เงาแวววาว (ตั้งตรง เอียงตามผิวโลกนิดหน่อย)
  g.save(); g.translate(hx, hy); g.rotate(Math.max(-0.45, Math.min(0.45, ang)));
  g.globalCompositeOperation = "lighter"; glowAt(g, 0, 0, r * 1.9, col, 0.5); g.globalCompositeOperation = "source-over";
  hexPath(g, 0, 0, r * 1.16); g.fillStyle = "#0a0f22"; g.fill();
  const gold = g.createLinearGradient(-r, -r, r, r);
  gold.addColorStop(0, "#fff3b0"); gold.addColorStop(0.45, "#d79a2a"); gold.addColorStop(0.55, "#ffe27a"); gold.addColorStop(1, "#8a5a12");
  hexPath(g, 0, 0, r * 1.1); g.strokeStyle = gold; g.lineWidth = Math.max(1, r * 0.14); g.stroke();
  hexPath(g, 0, 0, r * 0.98); g.strokeStyle = u.color || "#7f8aa6"; g.lineWidth = Math.max(0.8, r * 0.08); g.stroke();
  g.save(); hexPath(g, 0, 0, r * 0.93); g.clip();
  const im = img(u.img);
  if (im) {
    const bw = r * 2, bh = r * 1.74, s = Math.max(bw / im.width, bh / im.height);
    const dw = im.width * s, dh = im.height * s;
    g.drawImage(im, -dw / 2, -r * 0.87 - (dh - bh) * 0.08, dw, dh);
  } else { g.fillStyle = u.color || "#556"; g.fillRect(-r, -r, r * 2, r * 2); }
  // แสงวาบพาดผ่านหน้าหมาก
  const sweep = REDUCED ? -2 : ((t * 0.45 + seed * 0.37) % 1.6) * 2.4 - 1.2;
  const sw = g.createLinearGradient((sweep - 0.3) * r, -r, (sweep + 0.3) * r, r);
  sw.addColorStop(0, "rgba(255,255,255,0)"); sw.addColorStop(0.5, "rgba(255,255,255,.45)"); sw.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sw; g.fillRect(-r, -r, r * 2, r * 2);
  // เปราะบาง: รอยร้าว + ม่วงวาบ
  if (crack > 0) {
    g.globalCompositeOperation = "lighter";
    g.fillStyle = `rgba(190,110,255,${0.5 * Math.max(0, 1 - crack)})`; g.fillRect(-r, -r, r * 2, r * 2);
    g.strokeStyle = `rgba(255,235,255,${0.95 * Math.min(1, crack * 3)})`; g.lineWidth = Math.max(0.8, r * 0.08);
    const cr = rnd(seed * 97 + 13);
    for (let i = 0; i < 6; i++) {
      let a = (i / 6) * TAU + cr() * 0.6, cx = 0, cy = 0;
      const Lc = r * Math.min(1, crack * 4);
      g.beginPath(); g.moveTo(0, 0);
      for (let s = 0; s < 3; s++) { a += (cr() - 0.5) * 0.9; cx += (Math.cos(a) * Lc) / 3; cy += (Math.sin(a) * Lc) / 3; g.lineTo(cx, cy); }
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";
  }
  g.restore();
  g.restore();
  g.restore();
}
function hexRgb(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(c || "");
  if (!m) return "127,138,166";
  const v = parseInt(m[1], 16);
  return `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`;
}

// ตำแหน่งหมากกระจายแบบธรรมชาติ (ไม่เรียงแถว): เกลียวทานตะวัน + สุ่มเยื้อง — [x, y] ในวงกลมรัศมี 1
function scatter(n, seed) {
  const r = rnd(seed), out = [];
  for (let i = 0; i < n; i++) {
    const rad = n === 1 ? 0 : Math.sqrt((i + 0.6) / n) * (0.75 + r() * 0.25);
    const a = i * 2.39996 + r() * 0.5;
    out.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }
  // ผลักกันให้ห่างเท่าๆ กันในวงกลม (ไม่ซ้อน ไม่เป็นแถว)
  const want = n > 1 ? 1.7 / Math.sqrt(n) : 0;
  for (let it = 0; it < 40; it++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j) continue;
    const dx = out[i][0] - out[j][0], dy = out[i][1] - out[j][1], d = Math.hypot(dx, dy) || 0.001;
    if (d < want) { const k = ((want - d) / d) * 0.25; out[i][0] += dx * k; out[i][1] += dy * k; }
    const l = Math.hypot(out[i][0], out[i][1]);
    if (l > 1) { out[i][0] /= l; out[i][1] /= l; }
  }
  return out;
}

// ---------- เตรียมฉาก ----------
//  targets = [{ id, img, color, dmg }] — คนที่โดน สูงสุด 6 (เกมเล่นได้ 7 คน · ว่างได้ = โลกเปล่า)
export function buildArjunaScene(targets, W, H, lowQ) {
  const n = targets.length;
  const pos = scatter(n, n * 17 + 3);
  // ทิศบนผิวโลก (พิกัดโลก) — หมวกกลมรอบจุดหน้าโลกช่วงยื่นมือ (ศัตรูต้นฉบับยืนตรงนั้น) กว้างตามจำนวนคน
  const center = new THREE.Vector3(0, 0.55, 0.83).normalize();
  const east = new THREE.Vector3(1, 0, 0), north = new THREE.Vector3().crossVectors(center, east).normalize();
  const cap = 0.22 + Math.min(0.42, Math.sqrt(n) * 0.11);
  const dirs = pos.map(([px, py]) => center.clone().addScaledVector(east, px * cap).addScaledVector(north, -py * cap).normalize());
  const patch = document.createElement("canvas"); // แคนวาสทำงานสำหรับแปะลบของต้นฉบับ
  patch.width = 560; patch.height = 300;
  const small = document.createElement("canvas"); // ย่อภาพแทนการเบลอ (ฟิลเตอร์ blur เต็มพื้นที่หนักเกิน)
  const globe = makeGlobe(lowQ);
  if (globe) globe.render(0); // อุ่นเชดเดอร์/อัปโหลดลายโลกตอนนี้ ไม่ให้สะดุดตอนโลกโผล่ครั้งแรก
  return { W, H, lowQ, targets, pos, dirs, patch, small, globe };
}
export function disposeArjunaScene(sc) { if (sc && sc.globe) sc.globe.dispose(); }

// กรอบวีดีโอที่ใช้ ณ เวลา t (ซูมช่วงแถบชื่อท่า) → view แปลงพิกัดวีดีโอเป็นจอ (cover)
function viewAt(t, W, H) {
  const z = 1 - smooth(1.42, 1.6, t);
  const src = { x: lerp(0, 230, z), y: 0, w: lerp(VW, 974, z), h: lerp(VH, 548, z) };
  const s = Math.max(W / src.w, H / src.h);
  const dw = src.w * s, dh = src.h * s, ox = (W - dw) / 2, oy = (H - dh) / 2;
  return { src, s, ox: ox - src.x * s, oy: oy - src.y * s, dw, dh, dx: ox, dy: oy };
}

// แปะทับส่วนของต้นฉบับ: ก๊อปภาพจาก (sx, sy) มาวางที่กรอบ (x, y, w, h) · flip = กลับหัว · ขอบนุ่ม feather (px วีดีโอ)
function patchOver(g, sc, video, v, x, y, w, h, sx, sy, { flip = false, blur = 0, feather = 24, edges = "trbl" } = {}) {
  const p = sc.patch, pg = p.getContext("2d");
  const pw = Math.ceil(w), ph = Math.ceil(h);
  if (p.width < pw || p.height < ph) { p.width = Math.max(p.width, pw); p.height = Math.max(p.height, ph); }
  pg.setTransform(1, 0, 0, 1, 0, 0);
  pg.globalCompositeOperation = "copy";
  if (flip) { pg.setTransform(1, 0, 0, -1, 0, ph); }
  if (blur) {
    const q = sc.small, k = Math.max(2, Math.round(blur / 2)), sw = Math.ceil(pw / k), sh = Math.ceil(ph / k);
    if (q.width !== sw || q.height !== sh) { q.width = sw; q.height = sh; }
    const qg = q.getContext("2d");
    qg.imageSmoothingQuality = "low";
    qg.drawImage(video, sx, sy, pw, ph, 0, 0, sw, sh);
    pg.imageSmoothingQuality = "high";
    pg.drawImage(q, 0, 0, sw, sh, 0, 0, pw, ph);
  } else pg.drawImage(video, sx, sy, pw, ph, 0, 0, pw, ph);
  pg.setTransform(1, 0, 0, 1, 0, 0);
  // ขอบนุ่ม: ลบไล่โปร่งเฉพาะด้านที่ระบุ (destination-out มีผลแค่ส่วนที่วาด)
  pg.globalCompositeOperation = "destination-out";
  const f = feather;
  const strip = (x0, y0, x1, y1, rx, ry, rw, rh) => { const gr = pg.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "#000"); gr.addColorStop(1, "rgba(0,0,0,0)"); pg.fillStyle = gr; pg.fillRect(rx, ry, rw, rh); };
  if (edges.includes("t")) strip(0, 0, 0, f, 0, 0, pw, f);
  if (edges.includes("b")) strip(0, ph, 0, ph - f, 0, ph - f, pw, f);
  if (edges.includes("l")) strip(0, 0, f, 0, 0, 0, f, ph);
  if (edges.includes("r")) strip(pw, 0, pw - f, 0, pw - f, 0, f, ph);
  pg.globalCompositeOperation = "source-over";
  g.drawImage(p, 0, 0, pw, ph, v.ox + x * v.s, v.oy + y * v.s, pw * v.s, ph * v.s);
}

// ดาวเคราะห์ของต้นฉบับอยู่หน้าโลก — ตัดวงกลมจากวีดีโอมาวางทับอีกชั้น
//  ช่วงป้ายสถานะต้นฉบับพาดผ่านดาวเคราะห์ ใช้ภาพที่เก็บไว้ก่อนดาบฟันแทน (ไม่ให้ตัวหนังสือติดมา)
const SNAP_W = 480, SNAP_H = 340, SNAP_T = 9.43;
function drawPlanets(g, sc, video, v, t) {
  if (!sc.snap && t >= 9.4 && t < 9.5) {
    sc.snap = document.createElement("canvas"); sc.snap.width = SNAP_W; sc.snap.height = SNAP_H;
    sc.snap.getContext("2d").drawImage(video, 0, 0, SNAP_W, SNAP_H, 0, 0, SNAP_W, SNAP_H);
  }
  const useSnap = t >= 9.6 && t < 10.95;
  if (useSnap && !sc.snap) return;
  for (const track of PLANETS) {
    const q = keyAt(track, t);
    if (!q) continue;
    const px = v.ox + q[0] * v.s, py = v.oy + q[1] * v.s;
    g.save(); g.beginPath(); g.arc(px, py, q[2] * 1.04 * v.s, 0, TAU); g.clip();
    if (useSnap) {
      const q0 = keyAt(track, SNAP_T);
      g.drawImage(sc.snap, v.ox + (q[0] - q0[0]) * v.s, v.oy + (q[1] - q0[1]) * v.s, SNAP_W * v.s, SNAP_H * v.s);
    } else g.drawImage(video, v.src.x, v.src.y, v.src.w, v.src.h, v.dx, v.dy, v.dw, v.dh);
    g.restore();
  }
}

// ---------- โลกถูกผ่า (9.53 → 12.5) ----------
//  9.53  ดาบทองฟันผ่านโลกเป็นแนวโค้ง 2 เส้น (SPLIT) → โลกแยกเป็น 3 กลีบตามรอยผ่าในวีดีโอ แล้วค้างแยกอยู่ = ติดเปราะบาง (หมากร้าว)
//  11.67 ใบดาบสี 4 เล่ม (SLASHES) ซัดเข้าใส่ → กลีบแตกเป็นชิ้น · 12.5 ระเบิดจริง
function drawSlashedGlobe(g, sc, video, v, t, gx, gy, R, D) {
  const tc = t - ARJUNA_T.crush;
  const hits = SLASHES.filter((c) => t >= c[0]);
  const a1 = t - SPLIT.t[0], a2 = t - SPLIT.t[1]; // อายุรอยผ่าเส้นขวา/ซ้าย
  // ดาบลงแต่ละเล่ม โลกสะเทือน · ใกล้ระเบิดสั่นถี่ขึ้น
  if (!REDUCED) {
    for (const t0 of [...SPLIT.t, ...hits.map((c) => c[0])]) {
      if (t < t0) continue;
      const a = R * 0.05 * Math.exp(-(t - t0) * 20);
      gx += Math.sin(t * 91 + t0 * 7) * a; gy += Math.cos(t * 73 + t0 * 11) * a;
    }
    const tr = R * 0.012 * smooth(10.6, 11.6, t) * (1 - smooth(11.66, 11.7, t));
    gx += Math.sin(t * 57) * tr; gy += Math.cos(t * 49) * tr;
  }
  const cuts = hits.map(([t0, ang, off, from, rgb]) => {
    const nx = -Math.sin(ang), ny = Math.cos(ang), age = t - t0;
    return { ang, from, rgb, nx, ny, dx: Math.cos(ang), dy: Math.sin(ang), px: gx + nx * off * R, py: gy + ny * off * R, age, k: easeOut3(age / 0.14) + smooth(0, 0.6, age) * 0.45 };
  });
  // แกนกลีบ (เอียงตามวีดีโอ): พิกัด (x, y) ในกรอบเอียง → จอ · รอยผ่าโค้งจากขั้วบนลงขั้วล่าง
  const tc0 = Math.cos(SPLIT.tilt), ts0 = Math.sin(SPLIT.tilt);
  const pt = (x, y) => [gx + x * tc0 - y * ts0, gy + x * ts0 + y * tc0];
  const bulge = R * SPLIT.bulge;
  const arcX = (y) => { const u = clamp01(Math.abs(y) / R); return (bulge / 2) * (1 - u * u); };
  const lobeOf = (x, y) => {
    const lx = (x - gx) * tc0 + (y - gy) * ts0, ly = -(x - gx) * ts0 + (y - gy) * tc0;
    if (a1 >= 0 && lx > arcX(ly)) return 2;
    if (a2 >= 0 && lx < -arcX(ly)) return 0;
    return 1;
  };
  const keyOf = (x, y) => lobeOf(x, y) * 16 + cuts.reduce((m, c, ci) => m | ((x - c.px) * c.nx + (y - c.py) * c.ny >= 0 ? 1 << ci : 0), 0);
  const big = R * 6;
  const arcPath = (sgn, down) => { // เส้นผ่าฝั่ง sgn (+1 ขวา −1 ซ้าย) · ต่อจากจุดปัจจุบัน
    const c = pt(sgn * bulge, 0), e = pt(0, down ? R : -R);
    g.quadraticCurveTo(c[0], c[1], e[0], e[1]);
  };
  const lobePath = (lobe) => {
    const P0 = pt(0, -R), M = (p) => g.moveTo(p[0], p[1]), L = (p) => g.lineTo(p[0], p[1]);
    g.beginPath();
    if (lobe === 1 && a1 >= 0 && a2 >= 0) { M(P0); arcPath(1, true); arcPath(-1, false); g.closePath(); return; }
    const sgn = lobe === 2 || (lobe === 1 && a2 < 0) ? 1 : -1, side = lobe === 1 ? -sgn : sgn;
    M(pt(0, -big)); L(P0); arcPath(sgn, true); L(pt(0, big)); L(pt(side * big, big)); L(pt(side * big, -big)); g.closePath();
  };
  // แกนแสงหลังโลก (บังข้างในลูกแก้วต้นฉบับ + เห็นผ่านรอยแยก) · ใกล้ใบดาบสีมาถึง แสงในรอยแยกแรงขึ้น
  const charge = smooth(10.9, 11.62, t);
  const core = g.createRadialGradient(gx, gy, 0, gx, gy, R);
  core.addColorStop(0, "#f2fdff"); core.addColorStop(0.14 + charge * 0.3, "#4fd2ff"); core.addColorStop(0.55 + charge * 0.2, "#1f58e6"); core.addColorStop(1, "#0c1466");
  g.fillStyle = core; g.beginPath(); g.arc(gx, gy, R * 0.99, 0, TAU); g.fill();
  // แสงวาบตอนดาบผ่าน
  const flash = a1 >= 0 ? 1 - smooth(0.03, 0.16, a2) : 0;
  const glow = Math.max(flash * 0.9, 0.08 * charge), glowStep = Math.round(glow * 24);
  if (sc.glowStep !== glowStep) {
    sc.glowStep = glowStep;
    sc.globe.render(ARJUNA_T.crush, { glow, shellK: 1.1, opacity: 1 });
    sc.globe.freeze();
  }
  // หมากบนผิว — จำว่าอยู่ชิ้นไหน
  const n = sc.targets.length;
  const r0 = Math.max(8, (R / 1.04) * 0.065);
  const toks = n ? sc.dirs.map((d, i) => ({ i, p: sc.globe.project(d) })).filter((o) => o.p.facing > 0).map((o) => {
    const x = gx + o.p.x * (D / 2), y = gy - o.p.y * (D / 2);
    return { ...o, x, y, key: keyOf(x, y) };
  }) : [];
  // ชิ้นที่มีจริง
  const live = new Set();
  for (let i = 0; i < 60; i++) for (const q of [0.3, 0.65, 0.98]) live.add(keyOf(gx + Math.cos((i / 60) * TAU) * R * q, gy + Math.sin((i / 60) * TAU) * R * q));
  live.add(keyOf(gx, gy));
  const moved = new Map();
  const seam = 0.75 + 0.25 * Math.sin(t * 14) * (REDUCED ? 0 : 1);
  for (const key of live) {
    const lobe = key >> 4, mask = key & 15;
    // กลีบซ้าย/ขวาแยกจากกัน
    const side0 = lobe - 1, age0 = lobe === 2 ? a1 : a2;
    const sep0 = side0 ? side0 * R * (0.17 * easeOut3(age0 / 0.16) + 0.05 * smooth(0, 2, age0)) : 0;
    let ox = sep0 * tc0, oy = sep0 * ts0 + (side0 ? side0 * R * 0.03 * easeOut3(age0 / 0.3) : 0), rot = side0 * 0.05 * easeOut3(age0 / 0.3);
    // แตกเป็นชิ้นตามใบดาบสี
    cuts.forEach((c, ci) => {
      const side = (mask >> ci) & 1 ? 1 : -1, sep = R * 0.1 * c.k * side;
      ox += c.nx * sep + c.dx * R * 0.03 * c.k * side; oy += c.ny * sep + c.dy * R * 0.03 * c.k * side;
      rot += side * 0.05 * c.k * (ci % 2 ? -1 : 1);
    });
    moved.set(key, { ox, oy, rot });
    g.save();
    // ย้ายชิ้นก่อน แล้วตัดตามรอยผ่าในพิกัดของโลก (ขอบตัดเลื่อนไปกับชิ้น → เห็นช่องแยก)
    g.translate(gx + ox, gy + oy); g.rotate(rot); g.translate(-gx, -gy);
    g.beginPath(); g.arc(gx, gy, R * 1.03, 0, TAU); g.clip(); // แสงตามรอยตัดอยู่ในเนื้อโลก ไม่ยื่นเป็นแท่งออกนอกขอบ
    if (a1 >= 0) { lobePath(lobe); g.clip(); }
    cuts.forEach((c, ci) => {
      const side = (mask >> ci) & 1 ? 1 : -1;
      g.beginPath();
      g.moveTo(c.px - c.dx * big, c.py - c.dy * big); g.lineTo(c.px + c.dx * big, c.py + c.dy * big);
      g.lineTo(c.px + c.dx * big + c.nx * big * side, c.py + c.dy * big + c.ny * big * side);
      g.lineTo(c.px - c.dx * big + c.nx * big * side, c.py - c.dy * big + c.ny * big * side);
      g.closePath(); g.clip();
    });
    g.drawImage(sc.globe.still, gx - D / 2, gy - D / 2, D, D);
    // ขอบกลีบ: เส้นรอยผ่าสีฟ้าเรืองทับโลกขาว
    for (const [sgn, age] of [[1, a1], [-1, a2]]) {
      if (age < 0) continue;
      const p0 = pt(0, -R);
      g.lineCap = "round";
      for (const [w, col] of [[0.13, `rgba(40,190,255,${0.55 * seam})`], [0.06, "rgba(120,235,255,.95)"], [0.022, "#fff"]]) {
        g.strokeStyle = col; g.lineWidth = R * w; g.beginPath(); g.moveTo(p0[0], p0[1]); arcPath(sgn, true); g.stroke();
      }
    }
    // ขอบชิ้น: แสงร้อนสีใบดาบเรืองจากรอยตัด
    g.globalCompositeOperation = "lighter";
    for (const c of cuts) {
      const w = R * 0.1;
      const gr = g.createLinearGradient(c.px - c.nx * w, c.py - c.ny * w, c.px + c.nx * w, c.py + c.ny * w);
      gr.addColorStop(0, `rgba(${c.rgb},0)`); gr.addColorStop(0.42, `rgba(${c.rgb},.75)`); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(0.58, `rgba(${c.rgb},.75)`); gr.addColorStop(1, `rgba(${c.rgb},0)`);
      g.fillStyle = gr; g.beginPath();
      const L = R * 1.3; // แค่ยาวพ้นโลก (แถบเรืองแสงยาวเกินกินเวลาวาด)
      g.moveTo(c.px - c.dx * L - c.nx * w, c.py - c.dy * L - c.ny * w); g.lineTo(c.px + c.dx * L - c.nx * w, c.py + c.dy * L - c.ny * w);
      g.lineTo(c.px + c.dx * L + c.nx * w, c.py + c.dy * L + c.ny * w); g.lineTo(c.px - c.dx * L + c.nx * w, c.py - c.dy * L + c.ny * w);
      g.closePath(); g.fill();
    }
    g.globalCompositeOperation = "source-over";
    // รอยร้าวลามจากรอยผ่า
    const cr = rnd(key * 53 + 11), crackA = smooth(0, 0.5, Math.max(a1, 0));
    g.lineWidth = Math.max(1, R * 0.012); g.strokeStyle = `rgba(70,170,240,${0.85 * crackA})`;
    if (a1 >= 0) for (let i = 0; i < 7; i++) {
      const sgn = cr() < 0.5 ? 1 : -1, ly = (cr() - 0.5) * 1.5 * R, s0 = pt(sgn * arcX(ly), ly);
      let x = s0[0], y = s0[1], a = (sgn * (cr() < 0.5 ? 1 : -1) > 0 ? 0 : Math.PI) + SPLIT.tilt + (cr() - 0.5) * 1.2;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 4; s++) { a += (cr() - 0.5) * 0.9; const L = R * 0.13 * crackA; x += Math.cos(a) * L; y += Math.sin(a) * L; g.lineTo(x, y); }
      g.stroke();
    }
    g.restore();
  }
  if (t < 11.67) drawPlanets(g, sc, video, v, t);
  // หมาก (ไม่ตัดตามขอบชิ้น) — ลอยไปกับชิ้น ร้าวเต็มที่
  for (const o of toks) {
    const m = moved.get(o.key);
    if (!m) continue;
    const cx = gx + (o.x - gx) * Math.cos(m.rot) - (o.y - gy) * Math.sin(m.rot) + m.ox;
    const cy = gy + (o.x - gx) * Math.sin(m.rot) + (o.y - gy) * Math.cos(m.rot) + m.oy;
    const jit = REDUCED ? 0 : (Math.random() - 0.5) * r0 * 0.25 * Math.max(1 - smooth(0, 0.3, tc), smooth(10.8, 11.6, t));
    const f = o.p.facing, ux = o.p.nx * (1 - f), uy = -f - o.p.ny * (1 - f), ul = Math.hypot(ux, uy) || 1;
    token(g, sc.targets[o.i], cx + jit, cy + jit, r0 * (0.6 + 0.4 * f) * (1 + 0.35 * smooth(0, 0.5, tc)), t, { crack: clamp01(tc / 0.3), up: [ux / ul, uy / ul], flat: 0.28 + 0.3 * f, seed: o.i });
  }
  // ดาบทองกวาดตามรอยผ่า: แสงวิ่งจากขั้วบนลงขั้วล่างใน 2 เฟรม
  for (const [sgn, age] of [[1, a1], [-1, a2]]) {
    if (age < 0 || age >= 0.14) continue;
    const head = easeOut3(age / 0.05), tail = smooth(0.04, 0.14, age), N = 24;
    g.save(); g.lineCap = "round"; g.lineJoin = "round";
    for (const [w, col] of [[0.3, "rgba(70,210,255,.5)"], [0.15, "rgba(255,226,130,.95)"], [0.06, "#fff"]]) {
      g.strokeStyle = col; g.lineWidth = R * w * (1 - tail * 0.7); g.beginPath();
      for (let i = 0; i <= N; i++) {
        const s = lerp(tail, head, i / N), ly = (s * 2 - 1) * R * 1.2, p = pt(sgn * arcX(ly), ly);
        if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
      }
      g.stroke();
    }
    g.restore();
  }
  // ใบดาบสี: พุ่งจากฝั่งที่เข้ามาทะลุไปอีกฝั่งของโลกใน 2 เฟรม แล้วหางไล่ตามจนเหลือรอยบางๆ
  for (const c of cuts) {
    if (c.age >= 0.3) continue;
    const tip = lerp(1.5, -1.45, easeOut3(c.age / 0.07)), tail = lerp(2.6, -1.45, smooth(0.05, 0.3, c.age));
    const w = R * (0.2 - 0.14 * smooth(0.04, 0.3, c.age)), L = (tail - tip) * R, x0 = tip * R;
    g.save(); g.translate(c.px, c.py); g.rotate(c.ang); g.scale(c.from, 1);
    const blade = (ww, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + L * 0.35, -ww); g.lineTo(x0 + L, -ww * 0.3); g.lineTo(x0 + L, ww * 0.3); g.lineTo(x0 + L * 0.35, ww); g.closePath(); g.fill(); };
    g.globalCompositeOperation = "lighter"; blade(w * 1.7, `rgba(${c.rgb},.45)`);
    g.globalCompositeOperation = "source-over"; blade(w, `rgb(${c.rgb})`); blade(w * 0.45, "#fff");
    g.restore();
  }
  // เศษโลกปลิวจากรอยผ่า
  const sr = rnd(97);
  const spray = (x0, y0, nx, ny, dx, dy, age0, rgbSide) => {
    const side = rgbSide != null ? rgbSide : sr() < 0.5 ? -1 : 1, sp = R * (1 + sr() * 1.6), s = R * (0.02 + sr() * 0.04);
    const a0 = sr() * TAU, vr = (sr() - 0.5) * 9, age = age0 - sr() * 0.06, sl = sr() - 0.5;
    if (age <= 0) return;
    const d = sp * (1 - Math.exp(-age * 3.2));
    const x = x0 + nx * d * side + dx * d * 0.6 * sl, y = y0 + ny * d * side + dy * d * 0.6 * sl;
    const al = 1 - smooth(0.6, 0.9, age);
    if (al <= 0) return;
    g.save(); g.globalAlpha = al; g.translate(x, y); g.rotate(a0 + vr * age);
    g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.8, s * 0.6); g.lineTo(-s * 0.7, s * 0.5); g.closePath();
    g.fillStyle = "#e4f7ff"; g.fill();
    g.restore();
  };
  for (let i = 0; i < (sc.lowQ ? 8 : 16); i++) {
    const sgn = i % 2 ? 1 : -1, ly = (sr() - 0.5) * 1.7 * R, p = pt(sgn * arcX(ly), ly);
    spray(p[0], p[1], tc0, ts0, -ts0, tc0, sgn > 0 ? a1 : a2, sgn);
  }
  for (const c of cuts) for (let i = 0; i < (sc.lowQ ? 4 : 8); i++) {
    const u = (sr() - 0.5) * 1.6 * R;
    spray(c.px + c.dx * u, c.py + c.dy * u, c.nx, c.ny, c.dx, c.dy, c.age);
  }
  // ก่อนระเบิด: แสงขาวกลืนโลก
  const wash = smooth(12.42, 12.5, t);
  if (wash > 0) { g.save(); g.globalCompositeOperation = "lighter"; glowAt(g, gx, gy, R * (1.4 + wash * 2), "255,255,255", wash); g.restore(); }
}
// ป้ายสถานะตรงจุดเดียวกับต้นฉบับ (เฉพาะเมื่อมีคนโดน)
function statusLabel(g, x, y, size, alpha) {
  if (alpha <= 0.01) return;
  g.save(); g.globalAlpha = alpha;
  g.font = `900 ${size | 0}px Kanit, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = size * 0.26; g.strokeStyle = "#04202e"; g.strokeText("เปราะบาง", x, y);
  const gr = g.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  gr.addColorStop(0, "#eafcff"); gr.addColorStop(0.55, "#6fe6ff"); gr.addColorStop(1, "#1aa0d8");
  g.fillStyle = gr; g.fillText("เปราะบาง", x, y);
  g.restore();
}

// ---------- วาด 1 เฟรม (t = video.currentTime) ----------
export function drawArjunaScene(g, sc, video, t, dpr) {
  const { W, H } = sc;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const v = viewAt(t, W, H);
  const ready = video && video.readyState >= 2;
  if (ready) g.drawImage(video, v.src.x, v.src.y, v.src.w, v.src.h, v.dx, v.dy, v.dw, v.dh);
  const P = (x, y) => [v.ox + x * v.s, v.oy + y * v.s];
  const n = sc.targets.length;

  if (ready) {
    // ลบศัตรูต้นฉบับ: ช็อตอวกาศ (ลายอวกาศจากด้านซ้าย 440 px) · ช็อตถอยกล้อง (ลายจากด้านบน — โลกทับอีกชั้น)
    //  (ศัตรูอยู่ x 620–1060 · ต้นทางต้องไม่ทับตัวศัตรู → แบ่งเป็น 2 แผ่น ดึงลายจาก x 120–520)
    if (t >= 3.98 && t < 5.25) {
      patchOver(g, sc, video, v, 560, 240, 360, 380, 120, 240, { feather: 70, edges: "tbl" });
      patchOver(g, sc, video, v, 860, 240, 380, 380, 140, 240, { feather: 70 });
    }
    if (t >= 5.22 && t < 6.7) patchOver(g, sc, video, v, 590, 300, 280, 180, 590, 110, { feather: 50 });
    // ลบป้ายสถานะต้นฉบับที่ลอยเหนือลูกแก้ว (ส่วนที่ล้นนอกโลก)
    if (t >= 9.6 && t < 10.85) patchOver(g, sc, video, v, 70, 80, 120, 120, 70, 330, { feather: 26 });
    // ลบตัวเลข/ป้ายต้นฉบับมุมซ้ายบน — ภาพสะท้อนจากแถบล่างที่ติดกัน + เบลอ
    if (t >= 12.33) patchOver(g, sc, video, v, 0, 0, 740, 345, 0, 345, { flip: true, blur: 16, feather: 110, edges: "r" });
    // เศษไฟของศัตรูต้นฉบับใต้แผ่นบน (ช่วงระเบิดแรก) — ดึงลายจากด้านขวาที่ติดกัน
    if (t >= 12.5 && t < 13.4) patchOver(g, sc, video, v, 0, 300, 520, 160, 560, 300, { blur: 10, feather: 60, edges: "tbr" });
  }

  // ช็อตอวกาศ: หมากลอยแทนศัตรู — กระจายลึกตื้น (ตัวหลังเล็กกว่า) ลอยเข้าหากล้องช้าๆ
  if (t >= 3.98 && t < 5.25 && n) {
    const k = smooth(4.0, 4.15, t), push = 1 + (t - 4.03) * 0.05;
    const r0 = (n <= 2 ? 48 : 38) * push, spread = (n <= 2 ? 120 : 210) * push;
    const cx = 840 - (t - 4.03) * 14, cy = 440;
    const order = sc.pos.map((p, i) => i).sort((a, b) => sc.pos[a][1] - sc.pos[b][1]); // วาดตัวหลังก่อน
    for (const i of order) {
      const [px, py] = sc.pos[i], depth = 0.72 + 0.28 * (py + 1) / 2;
      const [x, y] = P(cx + px * spread * 1.4, cy + py * spread * 0.45);
      token(g, sc.targets[i], x, y, r0 * depth * v.s, t, { alpha: k, flat: 0.3, seed: i });
    }
  }

  // โลก ORDEAL แทนลูกแก้ว
  const b = t < ARJUNA_T.boom ? bubbleAt(t) : null;
  if (b && sc.globe) {
    const [gx, gy] = P(b.x, b.y), R = b.r * v.s * 1.04, D = R / GLOBE_R;
    if (t >= ARJUNA_T.crush) drawSlashedGlobe(g, sc, video, v, t, gx, gy, R, D);
    else {
      const wide = b.r > 300;
      sc.globe.render(t, { opacity: wide ? 0.85 : 1 });
      sc.glowStep = null;
      g.drawImage(sc.globe.cv, gx - D / 2, gy - D / 2, D, D);
      if (ready) drawPlanets(g, sc, video, v, t);
      // หมาก: ยืนบนผิวโลกจริง (หมุนตามโลก เอียงตามความโค้ง ด้านหลังโลกมองไม่เห็น) · ย่อตามลูกแก้ว (ไม่เล็กกว่า 8 px วีดีโอ)
      if (n) {
        const r0 = Math.max(8, b.r * 0.065) * v.s;
        const list = sc.dirs.map((d, i) => ({ i, p: sc.globe.project(d) })).filter((o) => o.p.facing > 0).sort((a, b2) => a.p.facing - b2.p.facing);
        for (const { i, p } of list) {
          const x = gx + p.x * (D / 2), y = gy - p.y * (D / 2);
          // ทิศขึ้น: กลางหน้าโลก (หันหากล้อง) = ตั้งตรงจอ · ขอบโลก = ตามแนวตั้งฉากผิว
          const f = p.facing, ux = p.nx * (1 - f), uy = -f - p.ny * (1 - f), ul = Math.hypot(ux, uy) || 1;
          token(g, sc.targets[i], x, y, r0 * (0.6 + 0.4 * f), t, { alpha: smooth(0, 0.25, f), up: [ux / ul, uy / ul], flat: 0.28 + 0.3 * f, seed: i });
        }
      }
    }
  }

  // ป้ายเปราะบาง: ตรงจังหวะเดียวกับป้ายสถานะต้นฉบับ
  if (n && t >= 9.6 && t < 10.9) {
    const [lx, ly] = P(258, 153);
    statusLabel(g, lx, ly, 30 * v.s, smooth(9.62, 9.7, t) * (1 - smooth(10.72, 10.88, t)));
  }

  // ระเบิด (12.5): ลงดาเมจ — หมากถูกแรงระเบิดพัดปลิวออกนอกจอแล้วหาย · เหลือตัวเลขตรงจุดที่โดน
  if (n && t >= ARJUNA_T.boom && t < 15.9) {
    const tb = t - ARJUNA_T.boom, k = easeOut3(tb / 0.5), fade = 1 - smooth(15.2, 15.7, t);
    const r = 30 * v.s, spread = lerp(90, 190, k) * v.s, far = Math.hypot(W, H) * 1.05;
    const [cx, cy] = P(460, 300);
    sc.pos.forEach(([px, py], i) => {
      const a = px || py ? Math.atan2(py, px) : i * 2.4, ca = Math.cos(a), sa = Math.sin(a);
      const nx = cx + px * spread * 1.5, ny = cy + py * spread * 0.75;
      if (tb < 1) {
        const d = far * (1 - Math.exp(-tb * 1.5)) * (0.85 + (i % 3) * 0.15), x0 = cx + ca * r * 2, y0 = cy + sa * r * 2;
        const x = x0 + ca * d, y = y0 + sa * d, al = 1 - smooth(0.6, 0.95, tb);
        // หางแสงตามทางที่ปลิว
        const L = Math.min(d, r * 9) * Math.exp(-tb * 1.2), rgb = hexRgb(sc.targets[i].color);
        const tr = g.createLinearGradient(x - ca * L, y - sa * L, x, y);
        tr.addColorStop(0, `rgba(${rgb},0)`); tr.addColorStop(1, `rgba(${rgb},${0.85 * al})`);
        g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = tr; g.lineWidth = r * 0.8; g.lineCap = "round";
        g.beginPath(); g.moveTo(x - ca * L, y - sa * L); g.lineTo(x, y); g.stroke(); g.restore();
        g.save(); g.translate(x, y); g.rotate((i % 2 ? 1 : -1) * (5 + (i % 3) * 2) * tb);
        token(g, sc.targets[i], 0, 0, r * (1 + tb * 0.7), t, { alpha: al, crack: 0.35, seed: i, lift: 0, bare: true });
        g.restore();
      }
      const hit = Math.max(0, 1 - tb / 0.2);
      if (hit > 0) { g.save(); g.globalCompositeOperation = "lighter"; glowAt(g, nx, ny, r * 2.4, "255,255,255", hit); g.restore(); }
      const pop = 1 + 0.6 * Math.exp(-tb * 10), size = r * 1.3 * pop;
      if (sc.targets[i].dmg != null) damageNum(g, sc.targets[i].dmg, nx - size * 0.7, ny, size, fade * smooth(0.02, 0.1, tb));
    });
  }
  // แฟลชขาวเปิดฉาก (ไฟล์ HD เริ่มที่แสงดาว) · จางกลับกระดานตอนท้าย (วีดีโอจบที่ขาว)
  const open = 1 - smooth(0, 0.3, t);
  if (open > 0) { g.fillStyle = `rgba(255,255,255,${open})`; g.fillRect(0, 0, W, H); }
  const out = smooth(16.6, 17.33, t);
  if (out > 0) { g.globalCompositeOperation = "destination-out"; g.fillStyle = `rgba(0,0,0,${out})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over"; }
}

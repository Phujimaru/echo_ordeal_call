// ============================================================
//  สนาม Colony (GRID_PLAN §8.3) — กระดานแบน 2.5D ที่วนรอบซ้าย-ขวา (three.js) + กล้อง + ตัวฉายภาพให้ชั้น 2D เดิม
//  (ผู้ใช้สั่ง 2026-11-09: เลิกอุโมงค์ 3D มองจากด้านใน → "คลี่เป็นกระดานแบน" · 24 คอลัมน์)
//  BoardCanvas วาด WebGL ไว้ชั้นล่าง แล้วตั้ง boardGeo.setCustomProjection(view) → ตัวละคร/ไฮไลต์/เอฟเฟกต์ทุกตัวละคร
//   (ที่วาดผ่าน P/quad/gEllipse) ไปอยู่บนกระดานตามกล้อง 3D เองโดยไม่ต้องแก้รายตัว
//  พิกัดกระดาน (bx, by) → โลก: (X, Y, Z) = (bx, ความสูง, −by) · คอลัมน์วนรอบ: ของบนกระดานถูกวาดที่ "สำเนา" ที่ใกล้กล้องที่สุด
//   (bx + k·COLS) — พื้น/ผนังมี 3 สำเนาเรียงกัน เลื่อนตามกล้องทีละ COLS (มองไม่ออกว่าต่อกัน)
//
//  กล้อง: มองเอียงแบบกระดานปกติ · เลื่อน (ลากซ้าย/ลูกศร) · หมุน/ก้มเงย (ลากขวา · Q/E ทีละ 90°) · ซูม (ล้อ/＋－) · Space = กลับที่ตัวเรา
//   ตามตัวที่เดินเฉพาะตอนหลุดจอ · ช็อตอีเวนต์ยึดกล้องชั่วคราว (อุกกาบาต ลำแสง แคปซูล ปิดผนึก ระเบิด กระโดด) แล้วคืนให้ผู้เล่น
// ============================================================
import * as THREE from "three";
import { getEarth } from "../globe/globeCore";
import { playSfx } from "../audio";

const COLS = 24, ROWS = 40, SEC = 10;
const TAU = Math.PI * 2;
const FOV = 40; // แคบแบบเลนส์ยาว = ภาพแบนแบบ 2.5D (มุมกว้างได้จากระยะกล้องแทน)
const TILT = 0.98; // มุมก้มเริ่มต้น (~56°)
const TOP = 1.36;  // มุมบน
const ZOOM_DIST = [20, 16, 12.5, 10, 8]; // ระยะกล้องตามระดับซูม 0..4
const DIST_MIN = 5.5, DIST_MAX = 22;
const mod = (x, n) => ((x % n) + n) % n;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const angD = (a, b) => mod(b - a + Math.PI, TAU) - Math.PI;
const wd = (a, b) => { let d = mod(b - a, COLS); if (d > COLS / 2) d -= COLS; return d; };
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const DISTRICT = ["town", "forest", "city", "garden"];

function canvasTex(w, h, paint, srgb = true) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  paint(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function glowTex(inner, outer) {
  return canvasTex(128, 128, (g) => {
    const m = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    m.addColorStop(0, inner); m.addColorStop(0.4, outer); m.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = m; g.fillRect(0, 0, 128, 128);
  });
}

// ---------------------------------------------------------------- พื้นกระดาน (เท็กซ์เจอร์ระบายจากแผนที่ — ลายแบบกระดาน 2D ของด่าน I/II: สีพาสเทล หมากรุกจาง เส้นตาราง)
//  ย่าน 4 ปล้อง: เมือง (หญ้า + ถนนหิน) · ป่า (หญ้าเข้ม + พุ่ม) · เมืองตึก (ลานหิน) · สวน (ทุ่งดอกไม้ของด่าน II)
const FLOOR = {
  day: {
    town: ["#c3dcab", "#b6d39d"], forest: ["#a6c98e", "#98bf80"], city: ["#eef0ec", "#e2e5e0"], garden: ["#c8e3a8", "#badb98"],
    road: "#ebe7dc", roadRim: "#d8d1bf", clump: "rgba(120,170,95,.35)", tile: "rgba(28,63,110,.05)", tile2: "rgba(28,63,110,.13)", grid: "rgba(28,63,110,.16)",
    water: "rgba(104,205,224,.92)", waterRim: "rgba(255,255,255,.85)", pebble: "rgba(240,225,180,.7)", dots: ["#f58fb8", "#ffe066", "#ffffff", "#c39af0", "#ffb070"],
    glass: ["#bcd8f2", "#e6f0fa"], glassRim: "rgba(255,255,255,.85)", sealed: "#4a3438", hazard: "rgba(255,196,64,.55)", plate: "#a7b0bc", rivet: "rgba(255,240,210,.8)",
  },
  night: {
    town: ["#2f4f5a", "#2a4753"], forest: ["#24413f", "#1f3a39"], city: ["#5d7697", "#526b8c"], garden: ["#2f5052", "#294a4c"],
    road: "#55708f", roadRim: "#465e7e", clump: "rgba(20,40,50,.4)", tile: "rgba(200,225,255,.05)", tile2: "rgba(200,225,255,.13)", grid: "rgba(200,225,255,.13)",
    water: "rgba(52,128,165,.9)", waterRim: "rgba(190,230,255,.6)", pebble: "rgba(170,200,210,.45)", dots: ["#f0c4dc", "#fff1b0", "#e6eeff", "#d4c2f5", "#ffd2a8"],
    glass: ["#081430", "#0d1d40"], glassRim: "rgba(140,170,210,.4)", sealed: "#1e1416", hazard: "rgba(255,170,60,.35)", plate: "#3f4652", rivet: "rgba(255,200,140,.6)",
  },
};
const districtOf = (y) => DISTRICT[Math.min(3, Math.floor(y / SEC))];
const isRoad = (x, y) => (x % 4 === 3 || y % 5 === 0);
function paintFloor(g, W, H, st) {
  const { map, night, sealed, patched, glass, holes } = st;
  const C = FLOOR[night ? "night" : "day"];
  const px = W / COLS, py = H / ROWS;
  const special = map.special || {};
  const X = (x) => x * px, Y = (y) => (ROWS - 1 - y) * py; // v = 0 ที่แถว 0 (ด้านล่างของภาพ)
  // พื้นแต่ละย่าน + หย่อมหญ้าจางๆ แบบพื้นรอบกระดานของด่าน I
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const pal = C[districtOf(y)];
    g.fillStyle = pal[(x + y) & 1 ? 1 : 0]; g.fillRect(X(x), Y(y), px + 0.5, py + 0.5);
  }
  for (let i = 0; i < COLS * ROWS * 0.6; i++) {
    const x = hash(i, 3, 1) * COLS, y = hash(i, 5, 2) * ROWS;
    if (districtOf(y | 0) === "city") continue;
    g.fillStyle = C.clump; g.beginPath(); g.ellipse(x * px, (ROWS - y) * py, px * (0.18 + hash(i, 7, 3) * 0.3), py * (0.08 + hash(i, 9, 4) * 0.12), 0, 0, TAU); g.fill();
  }
  for (let y = sealed * SEC; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const k = `${x},${y}`, d = districtOf(y), x0 = X(x), y0 = Y(y);
    if (glass.includes(x)) {
      // กระจกหน้าต่างยาว (มองเห็นอวกาศ) — กลางวัน = ฟ้าสะท้อน · กลางคืน = ดาว
      const gr = g.createLinearGradient(x0, 0, x0 + px, 0);
      gr.addColorStop(0, C.glass[0]); gr.addColorStop(0.5, C.glass[1]); gr.addColorStop(1, C.glass[0]);
      g.fillStyle = gr; g.fillRect(x0, y0, px + 0.5, py + 0.5);
      if (night) for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + hash(x, y, i) * 0.6})`; g.fillRect(x0 + hash(x, i, y) * px, y0 + hash(i, y, x) * py, 1.6, 1.6); }
      else { g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.moveTo(x0 + px * 0.2, y0 + py); g.lineTo(x0 + px * 0.45, y0 + py); g.lineTo(x0 + px * 0.75, y0); g.lineTo(x0 + px * 0.5, y0); g.closePath(); g.fill(); }
      g.strokeStyle = C.glassRim; g.lineWidth = Math.max(1, px * 0.04); g.strokeRect(x0 + 1, y0 + 1, px - 2, py - 2);
      continue;
    }
    if (special[k] === "shallow") {
      // น้ำตื้น (แบบช่อง shallow ของกระดาน 2D)
      g.fillStyle = C.water; g.fillRect(x0 + px * 0.02, y0 + py * 0.02, px * 0.96, py * 0.96);
      g.strokeStyle = C.waterRim; g.lineWidth = Math.max(1, px * 0.03); g.strokeRect(x0 + px * 0.02, y0 + py * 0.02, px * 0.96, py * 0.96);
      g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x0 + px * 0.14, y0 + py * 0.14, px * 0.72, py * 0.72);
      g.fillStyle = C.pebble;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x0 + px * (0.15 + hash(i, x, y, 1) * 0.7), y0 + py * (0.15 + hash(y, x, i) * 0.7), px * 0.035, py * 0.02, 0, 0, TAU); g.fill(); }
    } else if (special[k] === "lift") {
      g.fillStyle = night ? "#3a4660" : "#dfe6ee"; g.fillRect(x0 + px * 0.06, y0 + py * 0.06, px * 0.88, py * 0.88);
      g.strokeStyle = "#d9a93f"; g.lineWidth = Math.max(2, px * 0.06);
      g.beginPath(); g.arc(x0 + px / 2, y0 + py / 2, px * 0.32, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(x0 + px / 2, y0 + py * 0.68); g.lineTo(x0 + px / 2, y0 + py * 0.32); g.moveTo(x0 + px * 0.36, y0 + py * 0.46); g.lineTo(x0 + px / 2, y0 + py * 0.32); g.lineTo(x0 + px * 0.64, y0 + py * 0.46); g.stroke();
    } else if (d === "town" && isRoad(x, y)) {
      // ถนนหิน (ย่านเมือง)
      g.fillStyle = C.road; g.fillRect(x0 + px * 0.04, y0 + py * 0.04, px * 0.92, py * 0.92);
      g.strokeStyle = C.roadRim; g.lineWidth = Math.max(1, px * 0.03); g.strokeRect(x0 + px * 0.04, y0 + py * 0.04, px * 0.92, py * 0.92);
    } else if (d === "city") {
      // ลานหิน (ย่านตึก)
      g.strokeStyle = C.roadRim; g.lineWidth = Math.max(1, px * 0.025); g.strokeRect(x0 + px * 0.08, y0 + py * 0.08, px * 0.84, py * 0.84);
    } else if (d === "garden" && hash(x, y, 11) > 0.35) {
      for (let i = 0; i < 7; i++) {
        g.fillStyle = C.dots[Math.floor(hash(x, y, 20 + i) * C.dots.length)];
        g.beginPath(); g.arc(x0 + px * (0.12 + hash(i, x, y) * 0.76), y0 + py * (0.12 + hash(y, i, x) * 0.76), px * 0.045, 0, TAU); g.fill();
      }
    } else if (d === "forest" && hash(x, y, 12) > 0.55) {
      g.fillStyle = night ? "rgba(70,120,100,.45)" : "rgba(90,140,70,.45)";
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x0 + px * (0.2 + hash(i, x, y) * 0.6), y0 + py * (0.2 + hash(y, i, x) * 0.6), px * 0.1, 0, TAU); g.fill(); }
    }
    if (patched.has(k)) {
      // แผ่นเหล็กปะรู
      g.fillStyle = C.plate; g.fillRect(x0 + px * 0.08, y0 + py * 0.08, px * 0.84, py * 0.84);
      g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1; g.strokeRect(x0 + px * 0.08, y0 + py * 0.08, px * 0.84, py * 0.84);
      g.fillStyle = C.rivet;
      for (const [a, b] of [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]]) { g.beginPath(); g.arc(x0 + px * a, y0 + py * b, px * 0.04, 0, TAU); g.fill(); }
    }
    // หมากรุกจางของกระดาน
    g.fillStyle = (x + y) & 1 ? C.tile2 : C.tile; g.fillRect(x0, y0, px, py);
  }
  // เส้นตาราง
  const yTop = 0, yBot = H - sealed * SEC * py;
  g.strokeStyle = C.grid; g.lineWidth = Math.max(1, px * 0.02);
  g.beginPath();
  for (let x = 0; x <= COLS; x++) { g.moveTo(x * px, yTop); g.lineTo(x * px, yBot); }
  for (let y = sealed * SEC; y <= ROWS; y++) { g.moveTo(0, (ROWS - y) * py); g.lineTo(W, (ROWS - y) * py); }
  g.stroke();
  // ปล้องที่ปิดผนึก: แผ่นเหล็กมืด + ลายเตือนตรงขอบ
  if (sealed > 0) {
    g.fillStyle = C.sealed; g.fillRect(0, yBot, W, H - yBot);
    g.save(); g.beginPath(); g.rect(0, yBot, W, py * 0.5); g.clip();
    g.fillStyle = C.hazard;
    for (let x = -py; x < W + py; x += px * 0.5) { g.beginPath(); g.moveTo(x, yBot); g.lineTo(x + px * 0.25, yBot); g.lineTo(x + px * 0.25 - py * 0.5, yBot + py * 0.5); g.lineTo(x - py * 0.5, yBot + py * 0.5); g.closePath(); g.fill(); }
    g.restore();
  }
  // รูรั่ว: มองทะลุเห็นอวกาศ
  for (const h of holes) for (const [x, y] of h.cells) {
    const x0 = X(x), y0 = Y(y);
    g.fillStyle = "#02040a"; g.fillRect(x0, y0, px, py);
    for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + hash(x, y, i) * 0.6})`; g.fillRect(x0 + hash(i, x, y) * px, y0 + hash(y, i, x) * py, 1.5, 1.5); }
  }
}
// ชั้นเตือนอันตราย (โปร่ง · ระบายใหม่เมื่อเป้า/รู/ประตูเปลี่ยน) — เป้าอุกกาบาต (รัศมีดูด) · แถวลำแสง · จุดลงแคปซูล · ปล้องที่จะปิด · รัศมีรูรั่ว
function paintOverlay(g, W, H, st) {
  g.clearRect(0, 0, W, H);
  const px = W / COLS, py = H / ROWS;
  const tile = (x, y, col) => { g.fillStyle = col; g.fillRect(mod(x, COLS) * px, (ROWS - 1 - y) * py, px, py); };
  const c = st.colony;
  if (!c) return;
  if (c.sealIn != null && c.sealIn <= 1) for (let y = c.sealed * SEC; y < (c.sealed + 1) * SEC; y++) for (let x = 0; x < COLS; x++) tile(x, y, "rgba(255,50,40,.28)");
  for (const h of c.holes || []) {
    const [hx, hy] = h.cells[0];
    for (let y = hy - h.radius; y <= hy + h.radius; y++) for (let x = hx - h.radius; x <= hx + h.radius; x++) {
      const d = Math.min(...h.cells.map(([a, b]) => Math.abs(wd(a, x)) + Math.abs(b - y)));
      if (d > 0 && d <= h.radius && y >= 0 && y < ROWS) tile(x, y, `rgba(150,70,255,${0.06 + 0.14 * (h.radius - d) / h.radius})`);
    }
  }
  for (const t of c.tele || []) {
    if (t.type === "meteor") {
      for (let y = t.y - t.radius; y <= t.y + t.radius; y++) for (let x = t.x - t.radius; x <= t.x + t.radius; x++) {
        const d = Math.abs(x - t.x) + Math.abs(y - t.y);
        if (d <= t.radius && y >= 0 && y < ROWS) tile(x, y, d === 0 ? "rgba(255,40,30,.75)" : `rgba(255,60,40,${0.12 + 0.12 * (t.radius - d) / t.radius})`);
      }
      const X = t.x * px + px / 2, Y = (ROWS - 1 - t.y) * py + py / 2;
      g.strokeStyle = "rgba(255,230,220,.95)"; g.lineWidth = Math.max(2, px * 0.06);
      g.beginPath(); g.arc(X, Y, px * 0.36, 0, TAU); g.moveTo(X - px * 0.5, Y); g.lineTo(X + px * 0.5, Y); g.moveTo(X, Y - py * 0.5); g.lineTo(X, Y + py * 0.5); g.stroke();
    } else if (t.type === "beam") {
      for (let x = 0; x < COLS; x++) tile(x, t.y, "rgba(255,70,160,.45)");
    } else if (t.type === "capsule") {
      const X = t.x * px + px / 2, Y = (ROWS - 1 - t.y) * py + py / 2;
      g.strokeStyle = "rgba(255,214,110,.95)"; g.lineWidth = Math.max(2, px * 0.07);
      g.beginPath(); g.arc(X, Y, px * 0.38, 0, TAU); g.stroke();
      tile(t.x, t.y, "rgba(255,210,90,.3)");
    }
  }
}

function portraitTex(img, color) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = "#22324f"; g.beginPath(); g.arc(64, 64, 60, 0, TAU); g.fill();
    if (img && img.complete && img.naturalWidth) {
      g.save(); g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.clip();
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) * 0.12, s, s, 6, 6, 116, 116);
      g.restore();
    }
    g.strokeStyle = color || "#7fb8e6"; g.lineWidth = 8; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.stroke();
  });
}
// ผนังกั้นปลายสนาม (ปล้องที่ปิดผนึก / ท่าเทียบยาน): แผ่นเหล็ก + ลายเตือน
function bulkTex() {
  const t = canvasTex(512, 128, (g, W, H) => {
    g.fillStyle = "#7d8798"; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 64) { g.fillStyle = (x / 64) % 2 ? "#8a95a6" : "#768192"; g.fillRect(x, 0, 64, H); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x, 0, 2, H); }
    g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, 10, W, 4);
    g.save(); g.beginPath(); g.rect(0, H - 30, W, 30); g.clip();
    for (let x = -40; x < W + 40; x += 40) { g.fillStyle = "#f2b33c"; g.beginPath(); g.moveTo(x, H); g.lineTo(x + 20, H); g.lineTo(x + 50, H - 30); g.lineTo(x + 30, H - 30); g.closePath(); g.fill(); }
    g.restore();
    g.fillStyle = "#c9e8ff"; g.fillRect(0, H * 0.42, W, 6);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// ================================================================ createColonyView
export function createColonyView(canvas, { lowQ = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowQ, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQ ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const SKY = { day: 0xcfe2f2, night: 0x0b1830 };
  scene.background = new THREE.Color(SKY.day);
  scene.fog = new THREE.Fog(SKY.day, 22, 52);
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 260);

  // ---- แสง
  const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x324058, 1.25);
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  const sun = new THREE.DirectionalLight(0xfff2dc, 0.9);
  sun.position.set(-6, 14, 6);
  scene.add(hemi, amb, sun, sun.target);

  // ---- ราก (ทุกอย่างที่ติดกระดาน) — เลื่อนทีละ COLS ตามกล้อง: พื้น/ผนังมี 3 สำเนา (−COLS, 0, +COLS)
  const root = new THREE.Group(); scene.add(root);
  const COPIES = [-COLS, 0, COLS];

  // ---- พื้น + ชั้นเตือน (สี่เหลี่ยมเดียว ยาว 3 รอบ · เท็กซ์เจอร์วนซ้ำ)
  const RES = lowQ ? 32 : 64;
  const floorCv = document.createElement("canvas"); floorCv.width = COLS * RES; floorCv.height = ROWS * RES;
  const floorTex = new THREE.CanvasTexture(floorCv); floorTex.colorSpace = THREE.SRGBColorSpace; floorTex.anisotropy = lowQ ? 2 : 8;
  floorTex.wrapS = THREE.RepeatWrapping;
  const ovCv = document.createElement("canvas"); ovCv.width = COLS * 16; ovCv.height = ROWS * 16;
  const ovTex = new THREE.CanvasTexture(ovCv); ovTex.colorSpace = THREE.SRGBColorSpace; ovTex.wrapS = THREE.RepeatWrapping;
  function plane(h) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-COLS, h, 0, 2 * COLS, h, 0, 2 * COLS, h, -ROWS, -COLS, h, -ROWS], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([-1, 0, 2, 0, 2, 1, -1, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    return geo;
  }
  // พื้น = ภาพ 2D ล้วน (ไม่รับแสง) — สีตรงตามกระดาน 2D
  const floorMat = new THREE.MeshBasicMaterial({ map: floorTex });
  const floor = new THREE.Mesh(plane(0), floorMat);
  const ovMat = new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const overlay = new THREE.Mesh(plane(0.005), ovMat);
  // ขอบกระดานใต้พื้น (ความหนาแผ่นพื้น — มองจากปลายสนามไม่เห็นพื้นลอย)
  const slab = new THREE.Mesh(new THREE.BoxGeometry(3 * COLS, 0.6, ROWS), new THREE.MeshLambertMaterial({ color: 0x5b6577 }));
  slab.position.set(COLS / 2, -0.31, -ROWS / 2);
  root.add(floor, overlay, slab);

  // ---- ผนังกั้นปล้อง + ประตู (InstancedMesh — วาดครั้งเดียวทั้งแถว · 3 สำเนา)
  const metal = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
  const MAXW = 3 * COLS * 3;
  const wallIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.02, 0.62, 0.14), metal, MAXW);
  const lightIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.08, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAXW);
  const postIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.95, 0.16), metal, MAXW * 2);
  const lintelIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 0.09, 0.16), metal, MAXW);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
  const glowIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.84, 0.86), glowMat, MAXW);
  for (const im of [wallIM, lightIM, postIM, lintelIM, glowIM]) { im.count = 0; im.frustumCulled = false; root.add(im); }
  const lightInfo = [], glowInfo = []; // ข้อมูลรายชิ้นสำหรับกะพริบ { row, i }
  const doorSigns = []; // { row, sprite, n }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _sc = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
  const setI = (im, i, x, y, z, sx = 1, sy = 1, sz = 1) => { _p.set(x, y, z); _sc.set(sx, sy, sz); _m.compose(_p, _q, _sc); im.setMatrixAt(i, _m); };
  let wallsSig = "";
  function buildWalls(map, sealed) {
    const sig = `${sealed}`;
    if (sig === wallsSig) return;
    wallsSig = sig;
    const doors = map.doors || [];
    let nw = 0, nl = 0, np = 0, nt = 0, ng = 0;
    lightInfo.length = 0; glowInfo.length = 0;
    for (const s of doorSigns) root.remove(s.sprite);
    doorSigns.length = 0;
    for (const r of map.walls || []) {
      if (r < sealed * SEC) continue;
      const z = -(r + 1);
      for (const ox of COPIES) for (let x = 0; x < COLS; x++) {
        const cx = x + 0.5 + ox;
        if (doors.includes(x)) {
          setI(postIM, np++, cx - 0.46, 0.475, z); setI(postIM, np++, cx + 0.46, 0.475, z);
          setI(lintelIM, nt++, cx, 0.92, z);
          setI(glowIM, ng, cx, 0.45, z); glowInfo.push({ row: r }); ng++;
          const sign = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
          sign.position.set(cx, 1.45, z); sign.scale.setScalar(0.8); sign.visible = false; root.add(sign);
          doorSigns.push({ row: r, sprite: sign, n: null });
        } else {
          setI(wallIM, nw++, cx, 0.31, z);
          setI(lightIM, nl, cx, 0.56, z); lightInfo.push({ row: r, i: x }); nl++;
        }
      }
    }
    wallIM.count = nw; lightIM.count = nl; postIM.count = np; lintelIM.count = nt; glowIM.count = ng;
    for (const im of [wallIM, lightIM, postIM, lintelIM, glowIM]) im.instanceMatrix.needsUpdate = true;
    if (nl) { lightIM.setColorAt(0, new THREE.Color()); }
    if (ng) { glowIM.setColorAt(0, new THREE.Color()); }
  }
  const signTexCache = new Map();
  function signTex(n, red) {
    const k = `${n}${red ? "r" : ""}`;
    if (!signTexCache.has(k)) signTexCache.set(k, canvasTex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, red ? "rgba(255,60,40,.8)" : "rgba(255,150,60,.7)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      g.font = "700 82px Chakra Petch, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 10; g.strokeStyle = "#160608"; g.strokeText(String(n), 64, 68);
      g.fillStyle = red ? "#ff6a50" : "#ffb070"; g.fillText(String(n), 64, 68);
    }));
    return signTexCache.get(k);
  }

  // ---- ลิฟต์: วงทอง + ลำแสงขึ้นฟ้า + จุดไฟวิ่ง (3 สำเนา)
  const lifts = new THREE.Group(); root.add(lifts);
  const liftDots = [];
  const beamTex = canvasTex(32, 128, (g, W, H) => { const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, "rgba(255,214,90,.75)"); gr.addColorStop(1, "rgba(255,214,90,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  function buildLifts(map) {
    lifts.clear(); liftDots.length = 0;
    const ringGeo = new THREE.TorusGeometry(0.3, 0.025, 6, 24), ringMat = new THREE.MeshBasicMaterial({ color: 0xffd65a });
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.3, 3, 12, 1, true), beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const dotGeo = new THREE.SphereGeometry(0.05, 8, 6);
    for (const [k, kind] of Object.entries(map.special || {})) {
      if (kind !== "lift") continue;
      const [x, y] = k.split(",").map(Number);
      for (const ox of COPIES) {
        const cx = x + 0.5 + ox, cz = -(y + 0.5);
        const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.set(cx, 0.02, cz); ring.rotation.x = Math.PI / 2;
        const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.set(cx, 1.5, cz);
        const dot = new THREE.Mesh(dotGeo, ringMat);
        lifts.add(ring, beam, dot);
        liftDots.push({ dot, x: cx, z: cz });
      }
    }
  }

  // ---- ผนังปลายสนาม (ปล้องที่ปิด / ท่าเทียบยาน แถว minRow) · หน้าต่างโดม (ปลายแถว 40) + โลก + ดาว
  const bulkMat = new THREE.MeshLambertMaterial({ map: bulkTex() });
  bulkMat.map.repeat.set(9, 1);
  const bulk = new THREE.Mesh(new THREE.BoxGeometry(3 * COLS, 1.8, 0.5), bulkMat);
  bulk.position.set(COLS / 2, 0.9, 0.25); root.add(bulk);
  const shutter = new THREE.Mesh(new THREE.BoxGeometry(3 * COLS, 1.8, 0.5), new THREE.MeshLambertMaterial({ color: 0x8a2a24 }));
  shutter.visible = false; root.add(shutter);
  const sky = new THREE.Group(); scene.add(sky); // ติดตามกล้องตามแนว x (โลก/ดาวอยู่ปลายสนามเสมอ)
  const domeMat = new THREE.MeshBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(3 * COLS, 9), domeMat);
    glass.position.set(COLS / 2, 4.5, -ROWS); root.add(glass);
    const pts = [];
    for (let x = -COLS; x <= 2 * COLS; x += 2) pts.push(new THREE.Vector3(x, 0, -ROWS), new THREE.Vector3(x, 9, -ROWS));
    for (const y of [0.02, 3, 6, 9]) pts.push(new THREE.Vector3(-COLS, y, -ROWS), new THREE.Vector3(2 * COLS, y, -ROWS));
    root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xe6f0fa, transparent: true, opacity: 0.55 })));
  }
  const earthTex = new THREE.CanvasTexture(getEarth().canvas); earthTex.colorSpace = THREE.SRGBColorSpace;
  getEarth().textures.add(earthTex);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 32), new THREE.MeshLambertMaterial({ map: earthTex, fog: false }));
  earth.position.set(4, 4, -ROWS - 46); sky.add(earth);
  const earthHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(127,184,230,.0)", "rgba(127,184,230,.55)"), transparent: true, depthWrite: false, fog: false }));
  earthHalo.scale.setScalar(28); earthHalo.position.copy(earth.position); sky.add(earthHalo);
  const earthSun = new THREE.DirectionalLight(0xffffff, 0.9); earthSun.position.set(-40, 30, -ROWS); earthSun.target = earth; sky.add(earthSun);
  const space = new THREE.Mesh(new THREE.PlaneGeometry(260, 120), new THREE.MeshBasicMaterial({ color: 0x02040a, fog: false }));
  space.position.set(0, 20, -ROWS - 70); sky.add(space);
  {
    const S = lowQ ? 250 : 600, sp = new Float32Array(S * 3);
    for (let i = 0; i < S; i++) sp.set([(Math.random() - 0.5) * 220, Math.random() * 70 - 6, -ROWS - 60 - Math.random() * 6], i * 3);
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sky.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true, fog: false })));
  }

  // ---- รูรั่ว (ขอบเรือง + อนุภาคถูกดูด)
  const holeGroup = new THREE.Group(); root.add(holeGroup);
  let holeSig = "";
  function buildHoles(holes) {
    holeGroup.clear();
    const geo = new THREE.TorusGeometry(0.42, 0.04, 6, 24), mat = new THREE.MeshBasicMaterial({ color: 0xff6a3a });
    for (const h of holes) for (const [x, y] of h.cells) for (const ox of COPIES) {
      const rim = new THREE.Mesh(geo, mat); rim.position.set(x + 0.5 + ox, 0.02, -(y + 0.5)); rim.rotation.x = Math.PI / 2;
      holeGroup.add(rim);
    }
  }
  const partGeo = new THREE.BufferGeometry();
  const PART_N = lowQ ? 60 : 200;
  const partPos = new Float32Array(PART_N * 3);
  partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
  const parts = new THREE.Points(partGeo, new THREE.PointsMaterial({ map: glowTex("rgba(255,255,255,1)", "rgba(210,190,255,.6)"), color: 0xe6d8ff, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }));
  parts.frustumCulled = false; scene.add(parts);
  const partState = Array.from({ length: PART_N }, () => ({ t: Math.random(), hole: 0, ang: Math.random() * TAU, r: 1 + Math.random() * 3 }));

  // ---- พิกัด: สำเนาที่ใกล้กล้อง (x ต่อเนื่อง ไม่ mod)
  const camX = () => R.cur.x;
  const nx = (bx, ref = camX()) => bx + COLS * Math.round((ref - bx) / COLS);
  const W = (bx, by, h = 0, out = new THREE.Vector3()) => out.set(nx(bx), h, -by);

  // ---- แคปซูลเสบียง: สไปรต์ 2D (colonyProps.drawCapsule) — ที่นี่คิดแค่ความสูงตอนตกลงมา (capsuleAt)
  let capsuleAtNow = null;

  // ---- เอฟเฟกต์ 3D (อุกกาบาต · ระเบิด · ลำแสงกวาด · เศษซาก · ตัวละครลอย)
  const fxGroup = new THREE.Group(); scene.add(fxGroup);
  const fxList = [];
  const boomTex = glowTex("rgba(255,255,230,1)", "rgba(255,140,50,.7)");
  const meteorTex = glowTex("rgba(255,250,230,1)", "rgba(255,170,80,.6)");
  // ก่อนเฟรมแรกของเอฟเฟกต์ (เวลาเริ่มในอนาคต) ซ่อนไว้ — สไปรต์ค่าเริ่มต้นสเกล 1 ทึบเต็ม = จอขาว
  function addFx(f) { fxList.push(f); if (f.obj) { f.obj.visible = false; fxGroup.add(f.obj); } return f; }
  const UP = new THREE.Vector3(0, 1, 0);
  function boom(pos, size = 2.2, ms = 900) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: boomTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(pos);
    addFx({ obj: s, t0: performance.now(), ms, tick: (k) => { s.scale.setScalar(0.3 + size * ease(Math.min(1, k * 1.4))); s.material.opacity = 1 - k; } });
    const n = lowQ ? 8 : 18, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x4b4540, size: 0.1, transparent: true }));
    const vs = Array.from({ length: n }, () => UP.clone().multiplyScalar(2 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)));
    addFx({ obj: pts, t0: performance.now(), ms: 1300, tick: (k) => {
      const t = k * 1.3;
      vs.forEach((v, i) => { const p = pos.clone().addScaledVector(v, t * 0.5).addScaledVector(UP, -4.5 * t * t * 0.5); arr.set([p.x, Math.max(0.02, p.y), p.z], i * 3); });
      geo.attributes.position.needsUpdate = true; pts.material.opacity = 1 - k;
    } });
  }
  function streak(from, to, ms, color = 0xffa850) {
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: meteorTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color }));
    head.scale.setScalar(1.1);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([from, from]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    const g = new THREE.Group(); g.add(head, line);
    addFx({ obj: g, t0: performance.now(), ms, tick: (k) => {
      const e = k * k, p = from.clone().lerp(to, e), tail = from.clone().lerp(to, Math.max(0, e - 0.35));
      head.position.copy(p); lineGeo.setFromPoints([tail, p]);
    } });
  }
  // ลำแสงกวาดทั้งแถว: เลเซอร์จากฟ้าลากผ่านแถวจากซ้ายไปขวา ทิ้งรอยไหม้เรือง
  function beamSweep(row, ms) {
    const z = -(row + 0.5), x0 = camX() - 16, x1 = camX() + 16;
    const trailGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, 0.06, z), new THREE.Vector3(x0, 0.06, z)]);
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xff7ad8, transparent: true }));
    const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, 14, z - 6), new THREE.Vector3(x0, 0.06, z)]);
    const ray = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0xfff0ff, transparent: true }));
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: meteorTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff7ad8 }));
    head.scale.setScalar(1.4);
    const g = new THREE.Group(); g.add(trail, ray, head);
    addFx({ obj: g, t0: performance.now(), ms, tick: (k) => {
      const e = ease(Math.min(1, k * 1.5)), x = lerp(x0, x1, e);
      trailGeo.setFromPoints([new THREE.Vector3(x0, 0.06, z), new THREE.Vector3(x, 0.06, z)]);
      rayGeo.setFromPoints([new THREE.Vector3(x - 3, 14, z - 6), new THREE.Vector3(x, 0.06, z)]);
      head.position.set(x, 0.1, z);
      trail.material.opacity = 1 - k * 0.8; ray.material.opacity = k < 0.66 ? 1 : 0; head.material.opacity = k < 0.66 ? 1 : 0;
    } });
  }
  // ตัวละครลอย (กระโดด · ลิฟต์ · ถูกดูดออกนอกโคโลนี) — สไปรต์ภาพตัวละคร
  const texCache = new Map();
  const unitInfo = new Map(); // id → { img, color, x, y }
  function unitSprite(id) {
    const u = unitInfo.get(id);
    let t = texCache.get(id);
    if (!t && u) {
      const im = new Image(); im.crossOrigin = "anonymous";
      t = portraitTex(null, u.color); texCache.set(id, t);
      im.onload = () => { const nt = portraitTex(im, u.color); t.image = nt.image; t.needsUpdate = true; };
      im.src = u.img || "";
    }
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: t || null, transparent: true, depthTest: false }));
  }
  const hidden = new Map(); // id → จนถึงเวลา (ms) — ชั้น 2D ไม่วาดตัวนี้ระหว่างฉากลอย
  function flyUnit(id, path, ms, opts = {}) {
    const s = unitSprite(id); s.scale.setScalar(0.9); s.renderOrder = 10;
    hidden.set(id, performance.now() + ms + 60);
    addFx({ obj: s, t0: performance.now(), ms, tick: (k) => {
      const p = path(ease(k)); s.position.copy(p);
      if (opts.shrink) s.scale.setScalar(0.9 * (1 - k)); if (opts.spin) s.material.rotation = k * 12;
    } });
  }

  // ---------------------------------------------------------------- กล้อง
  //  cur.x = จุดมองตามแนวคอลัมน์ (ต่อเนื่อง ไม่ mod) · z = แถว · yaw = หมุนรอบแนวตั้ง (0 = มองไปทางแถวมาก) · pitch = มุมก้ม
  const R = {
    cur: { x: 0.5, z: 1.5, yaw: 0, pitch: TILT, dist: ZOOM_DIST[2], roll: 0, fov: FOV },
    user: { yaw: 0, pitch: TILT, dist: ZOOM_DIST[2], panX: 0, panZ: 0 },
    shot: null, shake: 0, punch: 0, focus: { x: 0, y: 1 }, focusKey: "", rotBase: 0,
  };
  let minRowNow = 0;
  function followTarget() {
    const f = R.focus;
    const x = nx(f.x + 0.5 + R.user.panX, R.cur.x), z = clamp(f.y + 0.5 + R.user.panZ, minRowNow + 0.5, ROWS - 0.5);
    const travel = Math.abs(x - R.cur.x) + Math.abs(z - R.cur.z);
    return {
      x, z, yaw: R.rotBase + R.user.yaw, pitch: R.user.pitch,
      dist: R.user.dist + Math.min(2, travel * 0.08) - R.punch * 1.4, roll: 0, fov: FOV, k: 0.09,
    };
  }
  // จุดบนพื้นอยู่ในกรอบปลอดภัยของจอไหม (เว้นขอบ + แถบ HUD ล่าง) — ตัดสินว่าต้องเลื่อนกล้องตามหรือไม่
  const _s = new THREE.Vector3();
  function onScreen(bx, by) {
    W(bx, by, 0.4, _s).applyMatrix4(camera.matrixWorldInverse);
    if (-_s.z < 0.3) return false;
    _s.applyMatrix4(camera.projectionMatrix);
    return Math.abs(_s.x) < 0.8 && _s.y > -0.5 && _s.y < 0.8;
  }
  function goTo(x, y) { R.focus = { x, y }; R.user.panX = 0; R.user.panZ = 0; }
  const _T = new THREE.Vector3(), _fwd = new THREE.Vector3(), _C = new THREE.Vector3(), _up = new THREE.Vector3();
  function stepCamera(dt) {
    const t = R.shot ? { ...followTarget(), ...R.shot } : followTarget();
    const a = 1 - Math.pow(1 - (t.k || 0.09), dt * 60);
    const c = R.cur;
    c.x += (t.x - c.x) * a;
    c.z += (t.z - c.z) * a;
    c.yaw += angD(c.yaw, t.yaw) * a;
    c.pitch += (t.pitch - c.pitch) * a;
    c.dist += (t.dist - c.dist) * a;
    c.roll += angD(c.roll, t.roll || 0) * a;
    c.fov += ((t.fov || FOV) - c.fov) * a;
    R.shake *= Math.pow(0.86, dt * 60);
    R.punch *= Math.pow(0.88, dt * 60);
    _fwd.set(Math.sin(c.yaw), 0, -Math.cos(c.yaw));
    // จุดมองเลยโฟกัสไปข้างหน้านิดหน่อย — ตัวที่โฟกัสอยู่ค่อนล่างกลางจอ ไม่จมใต้ HUD ล่าง (มุมบน = เลื่อนน้อยลง)
    _T.set(c.x, 0, -c.z).addScaledVector(_fwd, c.dist * 0.1 * Math.cos(c.pitch) + 0.6);
    const p = clamp(c.pitch, 0.3, 1.5);
    _C.copy(_T).addScaledVector(_fwd, -Math.cos(p) * c.dist); _C.y = Math.sin(p) * c.dist;
    if (R.shake > 0.002) _C.add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(R.shake * 0.18));
    camera.position.copy(_C);
    _up.set(0, 1, 0);
    const roll = c.roll + (R.shake > 0.002 ? (Math.random() - 0.5) * R.shake * 0.03 : 0);
    if (roll) { const f = _T.clone().sub(_C).normalize(); _up.applyAxisAngle(f, roll); }
    camera.up.copy(_up);
    camera.lookAt(_T);
    if (Math.abs(camera.fov - c.fov) > 0.01) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    // สำเนาพื้น/ผนัง + ท้องฟ้าเลื่อนตามกล้อง
    root.position.x = COLS * Math.floor(c.x / COLS);
    sky.position.x = c.x;
    sun.position.set(c.x - 6, 14, -c.z + 6); sun.target.position.set(c.x, 0, -c.z);
  }

  // ---------------------------------------------------------------- ช็อตอีเวนต์ (คิว — เล่นต่อกันตามลำดับ)
  const shots = [];
  let shotEnd = 0;
  const now = () => performance.now();
  function runShots(t) {
    if (R.shot && t < shotEnd) return;
    if (R.shot && t >= shotEnd) { R.shot = null; }
    const next = shots[0];
    if (!next || next.at > t) return;
    shots.shift();
    R.shot = { ...next.params };
    if (R.shot.bx != null) { R.shot.x = nx(R.shot.bx, R.cur.x); delete R.shot.bx; }
    shotEnd = t + next.ms;
    if (next.on) next.on();
  }
  function queueShot(params, ms, on, delay = 0) {
    const last = shots.length ? shots[shots.length - 1] : null;
    const at = Math.max(now() + delay, last ? last.at + last.ms : shotEnd);
    shots.push({ params, ms, on, at });
  }
  const tileShot = (x, y, extra = {}) => ({ bx: x + 0.5, z: y + 0.5, pitch: 1.02, dist: 11, k: 0.11, ...extra });
  let flash = 0, alarm = 0, flashRGB = "255,255,255";
  const later = (ms, fn) => setTimeout(fn, ms);

  // อีเวนต์จาก server (BoardStage ส่งต่อ): colonyScene · colonySeal · colonyBoom · colonyJump · colonyLift
  const pendingHoles = new Set();
  const sfx = (name, gain) => { try { playSfx(name, gain != null ? { gain } : undefined); } catch { /* เสียงไม่พร้อม */ } };
  let lastWarn = null; // ไซเรนต้นเทิร์นที่เล่นไปแล้ว (null = ยังไม่เคยซิงก์ — เข้าเกมกลางคันไม่ดัง)
  function onEvent(kind, d) {
    if (!d) return;
    if (kind === "colonyScene") {
      for (const e of d.events || []) {
        if (e.type === "meteor") {
          for (const [x, y] of e.cells || []) pendingHoles.add(`${x},${y}`);
          queueShot(tileShot(e.at.x, e.at.y), 2600, () => {
            const tgt = W(e.at.x + 0.5, e.at.y + 0.5, 0), from = tgt.clone().add(new THREE.Vector3(-5, 16, 6));
            later(450, () => sfx("colony_meteor_fall"));
            later(550, () => streak(from, tgt, 450));
            later(1000, () => {
              sfx("colony_meteor_hit"); sfx("colony_wind", 0.7); if ((e.sucked || []).length) sfx("colony_sucked");
              boom(tgt, 3.2); R.shake = Math.max(R.shake, 1.2); flash = Math.max(flash, 0.35);
              if (R.shot) { R.shot.fov = FOV + 8; R.shot.dist = 12.5; R.shot.k = 0.22; }
              for (const [x, y] of e.cells || []) pendingHoles.delete(`${x},${y}`);
              for (const id of e.sucked || []) suckGhost(id, e.cells && e.cells[0]);
              animMoves(e.moves);
            });
          });
        } else if (e.type === "beam") {
          if (e.hole) pendingHoles.add(`${e.hole[0][0]},${e.hole[0][1]}`);
          queueShot({ z: e.y + 0.5, pitch: 0.92, dist: 15, k: 0.1 }, 3000, () => {
            sfx("colony_beam_charge");
            later(400, () => { beamSweep(e.y, 1300); R.shake = Math.max(R.shake, 0.6); sfx("colony_beam"); });
            later(1000, () => {
              if (e.hole) sfx("colony_wind", 0.7);
              if ((e.sucked || []).length) sfx("colony_sucked");
              R.shake = Math.max(R.shake, 1.4); flash = Math.max(flash, 0.5);
              if (e.hole) pendingHoles.delete(`${e.hole[0][0]},${e.hole[0][1]}`);
              for (const id of e.sucked || []) suckGhost(id, e.hole && e.hole[0]);
              animMoves(e.moves);
            });
          });
        } else if (e.type === "capsule") {
          capsuleDrop = { x: e.at.x, y: e.at.y, t0: 0 };
          queueShot(tileShot(e.at.x, e.at.y, { pitch: 0.85, dist: 10 }), 2400, () => {
            capsuleDrop.t0 = now() + 400;
            later(250, () => sfx("colony_capsule_fall"));
            later(950, () => {
              sfx("colony_capsule_land"); boom(W(e.at.x + 0.5, e.at.y + 0.5, 0), 1.8, 600); R.shake = Math.max(R.shake, 0.7);
              if (e.crushed && e.crushed.to) animMoves([{ id: e.crushed.id, from: { x: e.at.x, y: e.at.y }, path: [e.crushed.to] }]);
            });
          });
        } else if (e.type === "pull") {
          const c0 = e.hole && e.hole[0];
          if (c0) queueShot(tileShot(c0[0], c0[1]), 1400, () => { R.shake = Math.max(R.shake, 0.3); sfx("colony_wind", 0.8); if ((e.sucked || []).length) later(300, () => sfx("colony_sucked")); for (const id of e.sucked || []) suckGhost(id, c0); animMoves(e.moves); });
        } else if (e.type === "drift") {
          // โคโลนีหมุน: พื้นเลื่อนข้าง 1 ช่องพร้อมกัน — กล้องเลื่อนตาม (ไม่หมุนภาพ)
          queueShot({ dist: R.user.dist + 2, k: 0.06 }, 1600, () => { R.shake = Math.max(R.shake, 0.3); sfx("colony_drift"); animMoves((e.moves || []).map((m) => ({ id: m.id, from: m.from, path: [m.to], ms: 700 }))); if (R.shot) R.shot.x = R.cur.x + 1; });
        }
      }
    } else if (kind === "colonySeal") {
      alarm = 1;
      const z = d.section * SEC;
      sealAnim = { z, t0: 0 };
      queueShot({ z: z + 3, pitch: 1.1, dist: 13, k: 0.08 }, 3200, () => {
        sealAnim.t0 = now() + 600;
        sfx("colony_alarm_seal");
        later(600, () => sfx("colony_door_slide"));
        later(2400, () => { sfx("colony_door_close"); R.shake = Math.max(R.shake, 1.5); flash = Math.max(flash, 0.4); if (R.shot) { R.shot.fov = FOV + 8; R.shot.k = 0.25; } });
      });
    } else if (kind === "colonyBoom") {
      alarm = 1;
      boomFinale();
    } else if (kind === "colonyJump") {
      const from = d.from, to = d.to, ms = 1000;
      const ax = nx(from.x + 0.5), bx = ax + wd(from.x, to.x);
      const a = new THREE.Vector3(ax, 0.4, -(from.y + 0.5)), b = new THREE.Vector3(bx, 0.4, -(to.y + 0.5));
      flyUnit(d.id, (k) => a.clone().lerp(b, k).setY(0.4 + Math.sin(k * Math.PI) * 5), ms);
      if (R.focusId === d.id) {
        const t0 = now();
        R.shot = { x: ax, z: from.y + 0.5, dist: Math.max(13, R.user.dist), pitch: 1.05, k: 0.25 };
        shotEnd = t0 + ms + 250;
        jumpCam = { t0, ms, x0: ax, x1: bx, z0: from.y + 0.5, z1: to.y + 0.5 };
      }
      sfx("colony_jump");
      later(ms, () => { sfx("colony_stomp"); R.shake = Math.max(R.shake, 0.35); if (R.focusId === d.id) { goTo(to.x, to.y); R.focusKey = `${to.x},${to.y}`; } });
    } else if (kind === "colonyLift") {
      const from = d.from, to = d.to;
      sfx("colony_lift");
      const ax = nx(from.x + 0.5), bx = ax + wd(from.x, to.x);
      flyUnit(d.id, (k) => new THREE.Vector3(lerp(ax, bx, k), 0.3 + Math.sin(k * Math.PI) * 3.2, -(lerp(from.y, to.y, k) + 0.5)), 900);
    }
  }
  let capsuleDrop = null, sealAnim = null, jumpCam = null;
  // ---- ระเบิดตัวเองตอนจบ (~6 วิ · server พักเกม HOLD_SECONDS.boom):
  //  ไฟลุกเป็นทอดจากปลายโดมไล่มาหากล้อง · ทั่วทั้งสนาม + ควัน + กระจกแตก · กำแพงไฟวิ่งเข้าหากล้อง (สไปรต์ 2D หลังกำแพงไฟถูกเผาหาย — burnFrom)
  let finale = null;
  const rx = (spread) => camX() + (Math.random() - 0.5) * spread;
  function boomFinale() {
    const z0 = clamp(R.cur.z, minRowNow + 1.5, ROWS - 6), t0 = now();
    finale = { t0, z0, front: null };
    sfx("colony_alarm_count"); sfx("colony_boom_chain");
    later(1300, () => { sfx("colony_boom_chain"); sfx("colony_glass"); });
    later(3000, () => sfx("colony_boom_final"));
    R.shot = null; shots.length = 0;
    queueShot({ z: z0 + 3, pitch: 0.7, dist: 16, k: 0.08 }, 1400, null);
    queueShot({ z: z0 + 2, pitch: 0.62, dist: 14, k: 0.05, roll: 0.12, fov: FOV + 8 }, 2200, null);
    queueShot({ z: z0 + 1, pitch: 0.55, dist: 12, k: 0.04, roll: 0.25, fov: FOV + 14 }, 3000, null);
    for (let i = 0; i < 18; i++) later(i * 75, () => {
      const z = ROWS - 0.5 - (ROWS - 0.5 - z0 - 3) * (i / 17);
      for (let j = 0; j < 2; j++) fireball(new THREE.Vector3(rx(28), 0.1, -(z + (Math.random() - 0.5) * 2)), 2.6 + Math.random() * 1.8, 1100);
      R.shake = Math.max(R.shake, 0.3 + i * 0.05);
    });
    for (let i = 0; i < 34; i++) later(1300 + i * 60, () => {
      const near = Math.random() < 0.45, z = near ? z0 + 1 + Math.random() * 6 : z0 + Math.random() * (ROWS - z0);
      fireball(new THREE.Vector3(rx(24), 0.1, -z), (near ? 3.2 : 2.4) + Math.random() * 2.4, 1300);
      R.shake = Math.max(R.shake, 1.1 + Math.random() * 0.6);
      if (i % 6 === 0) shards(new THREE.Vector3(rx(20), 0.2, -z));
    });
    later(1500, () => { finale.front = { t0: now(), ms: 2100, z1: z0 - 2.2 }; frontMesh.visible = true; });
  }
  const smokeTex = glowTex("rgba(40,32,30,.9)", "rgba(60,50,46,.45)");
  const frontTex = canvasTex(64, 256, (g, Wd, H) => { const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, "rgba(255,255,235,1)"); gr.addColorStop(0.35, "rgba(255,160,60,.9)"); gr.addColorStop(1, "rgba(255,80,30,0)"); g.fillStyle = gr; g.fillRect(0, 0, Wd, H); });
  const frontMesh = new THREE.Mesh(new THREE.PlaneGeometry(80, 9), new THREE.MeshBasicMaterial({ map: frontTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  frontMesh.visible = false; scene.add(frontMesh);
  function fireball(pos, size, ms) {
    size = Math.min(size, pos.distanceTo(camera.position) * 0.6); // ใกล้กล้อง = ไม่ใหญ่จนขาวทั้งจอ
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: boomTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(pos);
    addFx({ obj: s, t0: performance.now(), ms, tick: (k) => { s.scale.setScalar(0.4 + size * ease(Math.min(1, k * 2.2))); s.material.opacity = 0.9 * (k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65); s.position.copy(pos).addScaledVector(UP, k * 0.8); } });
    if (!lowQ) {
      const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false }));
      sm.position.copy(pos); sm.material.opacity = 0; sm.scale.setScalar(0.01);
      addFx({ obj: sm, t0: performance.now() + ms * 0.25, ms: ms * 2.2, tick: (k) => { sm.scale.setScalar(size * (0.7 + k * 1.1)); sm.material.opacity = 0.75 * (1 - k); sm.position.copy(pos).addScaledVector(UP, 0.5 + k * 1.8); } });
    }
    if (Math.random() < 0.5) boom(pos, 0.01, 10);
    scorch(pos);
  }
  function shards(pos) {
    const n = lowQ ? 10 : 26, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8f0ff, size: 0.1, transparent: true, depthWrite: false }));
    const vs = Array.from({ length: n }, () => new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4));
    addFx({ obj: pts, t0: performance.now(), ms: 1200, tick: (k) => { vs.forEach((v, i) => { const p = pos.clone().addScaledVector(v, k); arr.set([p.x, p.y, p.z], i * 3); }); geo.attributes.position.needsUpdate = true; pts.material.opacity = 1 - k; } });
  }
  // รอยไหม้บนพื้น (วาดลงชั้นเตือน — ระหว่างระเบิดชั้นนี้ทึบเต็ม)
  function scorch(pos) {
    const g = ovCv.getContext("2d"), Wd = ovCv.width, H = ovCv.height;
    const u = mod(pos.x, COLS) / COLS, v = clamp(-pos.z / ROWS, 0, 1);
    const x = u * Wd, y = (1 - v) * H, r = Wd / COLS * (0.6 + Math.random() * 0.9);
    for (const dx of [0, -Wd, Wd]) {
      const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      gr.addColorStop(0, "rgba(10,6,6,.95)"); gr.addColorStop(0.55, "rgba(30,14,10,.8)"); gr.addColorStop(0.8, "rgba(255,120,40,.55)"); gr.addColorStop(1, "rgba(255,120,40,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y, r, 0, TAU); g.fill();
    }
    ovTex.needsUpdate = true;
  }
  // ฉากดูด/เลื่อน: ชั้น 2D ขยับหมากตามนี้ (pose) — server ส่งตำแหน่งปลายทางมาแล้วใน state
  const poses = new Map(); // id → { pts, t0, ms }
  function animMoves(moves) {
    for (const m of moves || []) {
      if (!m || !m.path || !m.path.length) continue;
      poses.set(m.id, { pts: [m.from, ...m.path], t0: now(), ms: m.ms || 260 * m.path.length });
    }
  }
  function suckGhost(id, cell) {
    if (!cell || !unitInfo.get(id)) return;
    const u = unitInfo.get(id);
    const a = W((u.x ?? cell[0]) + 0.5, (u.y ?? cell[1]) + 0.5, 0.45), b = W(cell[0] + 0.5, cell[1] + 0.5, -0.8);
    flyUnit(id, (k) => a.clone().lerp(b, k), 700, { shrink: true, spin: true });
  }

  // ---------------------------------------------------------------- สถานะจาก props
  let lastColonySig = "", night = null, sealedNow = 0, w = 1, h = 1, liftsBuilt = false;
  const patched = new Set();
  function sync(map, colony, isNight) {
    const c = colony || {};
    sealedNow = c.sealed | 0;
    minRowNow = Math.max(0, (map.minRow | 0));
    if (!liftsBuilt) { liftsBuilt = true; buildLifts(map); }
    buildWalls(map, sealedNow);
    const warnKey = c.countdown != null ? `b${c.countdown}` : c.sealIn === 1 ? `s${c.sealed | 0}` : "";
    if (warnKey !== lastWarn) {
      if (lastWarn !== null && warnKey) sfx(c.countdown != null ? "colony_alarm_count" : "colony_alarm_seal");
      lastWarn = warnKey;
    }
    const holes = (c.holes || []).filter((hh) => hh.cells.some(([x, y]) => !pendingHoles.has(`${x},${y}`)));
    patched.clear(); for (const k of c.patched || []) patched.add(k);
    const nNight = !!isNight;
    const sig = `${nNight}|${sealedNow}|${JSON.stringify(holes)}|${(c.patched || []).join(";")}`;
    if (sig !== lastColonySig) {
      lastColonySig = sig;
      paintFloor(floorCv.getContext("2d"), floorCv.width, floorCv.height, { map, night: nNight, sealed: sealedNow, patched, glass: map.glass || [], holes });
      floorTex.needsUpdate = true;
    }
    const oSig = JSON.stringify([c.tele, c.holes, c.sealIn, c.sealed]);
    if (oSig !== holeSig && !finale) {
      holeSig = oSig;
      paintOverlay(ovCv.getContext("2d"), ovCv.width, ovCv.height, { colony: { ...c, holes } });
      ovTex.needsUpdate = true;
      buildHoles(holes);
    }
    // ประตู: ป้ายนับถอยหลังเหนือประตูของผนังที่จะปิด (เหลือ ≤ 3) · เหลือ 1 = แดง
    const nextRow = (sealedNow + 1) * SEC - 1;
    for (const s of doorSigns) {
      const n = s.row === nextRow && c.sealIn != null && c.sealIn <= 3 ? c.sealIn : null;
      if (n !== s.n) { s.n = n; s.sprite.visible = n != null; if (n != null) { s.sprite.material.map = signTex(n, n <= 1); s.sprite.material.needsUpdate = true; } }
    }
    if (!sealAnim || !sealAnim.t0 || now() > sealAnim.t0 + 1800) bulk.position.z = -(sealedNow * SEC) + 0.25;
    alarm = Math.max(alarm * 0.98, c.countdown != null ? 0.35 : 0);
    capsuleAtNow = c.capsule || null;
    if (nNight !== night) {
      night = nNight;
      hemi.intensity = night ? 0.45 : 1.25; amb.intensity = night ? 0.18 : 0.35; sun.intensity = night ? 0.15 : 0.9;
      domeMat.opacity = night ? 0.1 : 0.16;
      const skyC = night ? SKY.night : SKY.day;
      scene.fog.color.set(skyC); scene.background.set(skyC);
    }
  }

  // ---------------------------------------------------------------- เฟรม
  const _lc = new THREE.Color();
  function update(t, dt, p) {
    const { map, colony, units, focus, rotation = 0, zoom = 2, view = "tilt", size, base, cinema } = p;
    if (!map) return;
    sync(map, colony, p.night);
    for (const u of units || []) {
      if (!u || !Number.isFinite(u.x)) continue;
      unitInfo.set(u.id, { img: u.img, color: u.color, x: u.x, y: u.y });
      if (u.isMe && u.alive !== false) { R.focusId = u.id; R.me = { x: u.x, y: u.y }; }
    }
    // ปุ่มกระดานเดิม → กล้อง: Q/E (rotation) = หมุน 90° · ซูม 5 ระดับ = ระยะ · มุมบน = ก้มสุด
    if (R.rotInit == null) R.rotInit = rotation; // ค่าหมุนที่จำไว้จากกระดานปกติไม่ใช้ — เริ่มมองไปทางปลายสนามเสมอ
    R.rotBase = (rotation - R.rotInit) * Math.PI / 2;
    if (R.zoomRef !== zoom) { R.zoomRef = zoom; R.user.dist = ZOOM_DIST[clamp(zoom | 0, 0, 4)]; }
    if (R.viewRef !== view) { R.viewRef = view; R.user.pitch = view === "top" ? TOP : TILT; }
    // โฟกัสเปลี่ยน (เริ่มตาใคร/เดิน/โดนตี ...) = เลื่อนกล้องไปหาเฉพาะตอนจุดนั้นอยู่นอกจอ (ผู้ใช้บ่น 2026-11-09 กล้องขยับตลอด)
    if (focus && Number.isFinite(focus.x)) {
      const fk = `${focus.x},${focus.y}`;
      if (fk !== R.focusKey) {
        const first = !R.focusKey;
        R.focusKey = fk;
        if (first) { goTo(focus.x, focus.y); R.cur.x = focus.x + 0.5; R.cur.z = focus.y + 0.5; }
        else if (!onScreen(focus.x + 0.5, focus.y + 0.5)) goTo(focus.x, focus.y);
      }
    }
    if (cinema && cinema.a && cinema.b && !R.shot) { R.punch = Math.max(R.punch, 0.6); }
    if (size && (size.w !== w || size.h !== h)) { w = size.w; h = size.h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    R.base = base;
    runShots(t);
    if (jumpCam && R.shot) {
      const k = clamp((t - jumpCam.t0) / jumpCam.ms, 0, 1), e = ease(k);
      R.shot.x = lerp(jumpCam.x0, jumpCam.x1, e); R.shot.z = lerp(jumpCam.z0, jumpCam.z1, e);
      if (k >= 1) jumpCam = null;
    }
    stepCamera(dt / 1000);
    // ---- ภาพเคลื่อนไหว
    const time = t / 1000;
    if (!finale) ovMat.opacity = 0.65 + 0.35 * Math.sin(time * 6);
    const warnRow = colony && colony.sealIn != null && colony.sealIn <= 1 ? (sealedNow + 1) * SEC - 1 : -1;
    if (lightInfo.length) {
      for (let i = 0; i < lightInfo.length; i++) {
        const l = lightInfo[i];
        if (l.row === warnRow) _lc.setHex(0xff7a32).multiplyScalar(0.5 + 0.5 * Math.sin(time * 9));
        else _lc.setHex(l.i % 2 ? 0x50e68c : 0x50c8ff).multiplyScalar(0.55 + 0.45 * Math.sin(time * 3 + l.i * 0.8));
        lightIM.setColorAt(i, _lc);
      }
      lightIM.instanceColor.needsUpdate = true;
    }
    if (glowInfo.length) {
      for (let i = 0; i < glowInfo.length; i++) { _lc.setHex(glowInfo[i].row === warnRow ? 0xff8c3c : 0x5ad8ff); if (glowInfo[i].row === warnRow) _lc.multiplyScalar(0.6 + 0.4 * Math.sin(time * 8)); glowIM.setColorAt(i, _lc); }
      glowIM.instanceColor.needsUpdate = true;
    }
    for (const d of liftDots) { const k = (time / 0.9 + d.x * 0.13) % 1; d.dot.position.set(d.x, k * 3, d.z); }
    earth.rotation.y = time * 0.02;
    if (capsuleDrop && capsuleDrop.t0 && t > capsuleDrop.t0 + 600) capsuleDrop = null;
    // ประตูกั้นปิดผนึก: แผ่นแดงเลื่อนขึ้นจากพื้น แล้วกลายเป็นผนังปลายสนาม
    if (sealAnim && sealAnim.t0) {
      const k = clamp((t - sealAnim.t0 - 500) / 1300, 0, 1);
      shutter.visible = k > 0; shutter.scale.y = Math.max(0.01, ease(k)); shutter.position.set(COLS / 2, 0.9 * shutter.scale.y, -sealAnim.z + 0.25);
      if (k > 0) R.shake = Math.max(R.shake, 0.25 + k * 0.5);
      if (t > sealAnim.t0 + 1800) { sealAnim = null; shutter.visible = false; }
    }
    // อนุภาคดูดเข้ารู
    const holes = (colony && colony.holes) || [];
    if (holes.length) {
      parts.visible = true;
      partState.forEach((ps, i) => {
        ps.t += dt / 1000 * (0.9 + (i % 5) * 0.12);
        if (ps.t >= 1) { ps.t = 0; ps.hole = Math.floor(Math.random() * holes.length); ps.ang = Math.random() * TAU; ps.r = 0.8 + Math.random() * (holes[ps.hole] ? holes[ps.hole].radius : 3); }
        const hh = holes[ps.hole % holes.length]; const [cx, cy] = hh.cells[0];
        const r = ps.r * (1 - ps.t);
        partPos.set([nx(cx + 0.5) + Math.cos(ps.ang) * r, 0.1 + 0.3 * (1 - ps.t), -(cy + 0.5 + Math.sin(ps.ang) * r)], i * 3);
      });
      partGeo.attributes.position.needsUpdate = true;
    } else parts.visible = false;
    // ระเบิดตอนจบ: กำแพงไฟวิ่ง · ไฟกะพริบ · ชั้นรอยไหม้ทึบ · แฟลชส้ม → ขาว
    if (finale) {
      const ft = t - finale.t0;
      ovMat.opacity = 1;
      if (ft > 1200) { hemi.intensity = 0.4 + Math.random() * 1.4; sun.intensity = Math.random() * 1.2; }
      const fr = finale.front;
      if (fr) {
        const k = clamp((t - fr.t0) / fr.ms, 0, 1), e = k * k;
        const z = lerp(ROWS, fr.z1, e);
        frontMesh.position.set(camX(), 4.5, -z); frontMesh.scale.y = 0.9 + Math.sin(t / 40) * 0.08;
        frontMesh.material.opacity = 0.9;
        fr.z = z;
        if (k > 0.55) { flashRGB = "255,170,90"; flash = Math.max(flash, (k - 0.55) / 0.45); }
        if (k >= 1) { flashRGB = "255,248,236"; flash = 1; }
      }
      if (ft > 3700) { flashRGB = "255,255,255"; flash = 1; }
      if (ft > 9000) { finale = null; frontMesh.visible = false; holeSig = ""; flash = 0; flashRGB = "255,255,255"; alarm = 0; night = null; }
    }
    const al = alarm * (0.5 + 0.5 * Math.sin(time * 4));
    hemi.color.setRGB(1, 1 - al * 0.55, 1 - al * 0.55);
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i], k = (t - f.t0) / f.ms;
      if (k >= 1) { if (f.obj) { fxGroup.remove(f.obj); f.obj.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); } fxList.splice(i, 1); continue; }
      if (k >= 0) { f.tick(k); if (f.obj) f.obj.visible = true; }
    }
    for (const [id, until] of hidden) if (t > until) hidden.delete(id);
    for (const [id, ps] of poses) if (t > ps.t0 + ps.ms + 50) poses.delete(id);
    if (!(finale && t - finale.t0 > 3400)) flash *= Math.pow(0.9, dt / 16.7);
    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------- ตัวฉายภาพให้ชั้น 2D (boardGeo.setCustomProjection)
  const _v = new THREE.Vector3();
  // ความสูง (z) ชี้ขึ้นตรงบนจอเสมอ (2.5D) — ระยะเท่ากับภาพจริง แต่ไม่เอียงตามเพอร์สเปกทีฟ
  function project(x, y, z = 0) {
    if (!z) return project0(x, y, 0);
    const a = project0(x, y, 0), b = project0(x, y, z);
    if (!Number.isFinite(a[0]) || !Number.isFinite(b[0])) return b;
    return [a[0], a[1] - Math.sign(z) * Math.hypot(b[0] - a[0], b[1] - a[1]), b[2]];
  }
  function project0(x, y, z) {
    _v.set(nx(x), z, -y).applyMatrix4(camera.matrixWorldInverse);
    const depth = -_v.z;
    if (depth < 0.1) return [NaN, NaN, 0];
    _v.applyMatrix4(camera.projectionMatrix);
    const b = R.base || { k: 1, ox: 0, oy: 0 };
    const cssX = (_v.x + 1) / 2 * w, cssY = (1 - _v.y) / 2 * h;
    const focalL = (h / 2) / Math.tan(camera.fov * Math.PI / 360) / (b.k || 1);
    return [(cssX - b.ox) / b.k, (cssY - b.oy) / b.k, focalL / depth];
  }
  function depth(x, y) {
    _v.set(nx(x), 0, -y).applyMatrix4(camera.matrixWorldInverse);
    return _v.z; // ใกล้กล้อง = ค่ามากกว่า (−ระยะ)
  }
  const ray = new THREE.Raycaster();
  function unproject(lx, ly) {
    const b = R.base || { k: 1, ox: 0, oy: 0 };
    const cssX = b.ox + lx * b.k, cssY = b.oy + ly * b.k;
    ray.setFromCamera(new THREE.Vector2(cssX / w * 2 - 1, -(cssY / h * 2 - 1)), camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (d.y > -1e-6) return null;
    const tt = -o.y / d.y;
    const X = o.x + d.x * tt, Z = o.z + d.z * tt;
    if (-Z < 0 || -Z >= ROWS) return null;
    return { x: mod(X, COLS), y: -Z };
  }

  // ---------------------------------------------------------------- input
  return {
    update, project, depth, unproject, onEvent, upright: true,
    pose(id, t) {
      const ps = poses.get(id);
      if (!ps) return null;
      const k = clamp((t - ps.t0) / ps.ms, 0, 1) * (ps.pts.length - 1), i = Math.min(ps.pts.length - 2, Math.floor(k)), f = k - i;
      const a = ps.pts[i], b = ps.pts[i + 1];
      return { x: mod(a.x + wd(a.x, b.x) * f, COLS), y: lerp(a.y, b.y, f) };
    },
    hidden(id, t) { const u = hidden.get(id); return !!u && t < u; },
    // ปล้องที่ปิดผนึกแล้ว: แถว < ค่านี้อยู่หลังผนังปลายสนาม (ชั้น 2D ไม่วาด) · null = ไม่มี
    occludeBelow() { return sealedNow > 0 ? sealedNow * SEC : null; },
    // แคปซูลเสบียงที่วาดตอนนี้ { x, y, z } (z = ความสูงระหว่างตก) · null = ไม่มี/ยังไม่ถึงจังหวะตกในฉาก
    capsuleAt(t) {
      const c = capsuleAtNow;
      if (!c) return null;
      const d = capsuleDrop && capsuleDrop.x === c.x && capsuleDrop.y === c.y ? capsuleDrop : null;
      if (d && !d.t0) return null;
      if (d && t < d.t0) return null;
      const k = d ? clamp((t - d.t0) / 550, 0, 1) : 1;
      return { x: c.x, y: c.y, z: (1 - ease(k)) * 9 };
    },
    flash() { return flash; },
    flashColor() { return flashRGB; },
    // ระเบิดตอนจบ: แถว > ค่านี้ถูกกำแพงไฟกลืนแล้ว (ชั้น 2D ไม่วาดสไปรต์) · null = ไม่มี
    burnFrom() { return finale && finale.front && finale.front.z != null ? finale.front.z : null; },
    // ลากขวา: หมุนรอบแนวตั้ง + ก้มเงย
    orbit(dx, dy) { R.user.yaw -= dx * 0.004; R.user.pitch = clamp(R.user.pitch + dy * 0.004, 0.45, 1.45); },
    // เลื่อนกล้องแบบลากพื้น (dx, dy = พิกเซลจอที่ลาก): จุดบนพื้นใต้เมาส์ไปตามมือ — คิดจากทิศแกนกระดานบนจอจริง ณ จุดโฟกัส
    pan(dx, dy) {
      const k = (R.base && R.base.k) || 1, bx = R.focus.x + 0.5 + R.user.panX, by = R.focus.y + 0.5 + R.user.panZ;
      const p0 = project(bx, by, 0), px = project(bx + 0.5, by, 0), py = project(bx, by + 0.5, 0);
      let ux, uz;
      const ax = (px[0] - p0[0]) * 2, ay = (px[1] - p0[1]) * 2, bxv = (py[0] - p0[0]) * 2, byv = (py[1] - p0[1]) * 2, det = ax * byv - bxv * ay;
      if ([p0[0], px[0], py[0]].every(Number.isFinite) && Math.abs(det) > 1e-3) {
        const sx = -dx / k, sy = -dy / k;
        ux = (sx * byv - bxv * sy) / det; uz = (ax * sy - sx * ay) / det;
        const m = Math.hypot(ux, uz), cap = 3;
        if (m > cap) { ux *= cap / m; uz *= cap / m; }
      } else { ux = -dx * 0.02; uz = dy * 0.02; }
      R.user.panX = clamp(R.user.panX + ux, -COLS * 2, COLS * 2);
      R.user.panZ = clamp(R.user.panZ + uz, -ROWS, ROWS);
      const z = R.focus.y + 0.5 + R.user.panZ; // ไม่ให้เลื่อนเกินปลายสนาม (กล้องค้าง แต่ค่าเลื่อนสะสมจนต้องลากกลับไกล)
      if (z < minRowNow + 0.5) R.user.panZ += minRowNow + 0.5 - z; else if (z > ROWS - 0.5) R.user.panZ -= z - (ROWS - 0.5);
    },
    zoomBy(dy) { R.user.dist = clamp(R.user.dist * Math.exp(dy * 0.0012), DIST_MIN, DIST_MAX); },
    recenter() { R.user.panX = 0; R.user.panZ = 0; },
    // กลับมาที่ตัวเรา (Space / ปุ่มเป้า) — คืนมุมหมุน/ก้มที่ลากไว้ด้วย · ไม่มีตัวเรา (ตาย/ดูอยู่) = กลับจุดโฟกัสล่าสุด
    home() {
      if (R.me) { goTo(R.me.x, R.me.y); R.focusKey = `${R.me.x},${R.me.y}`; } else this.recenter();
      R.user.yaw = 0; R.user.pitch = R.viewRef === "top" ? TOP : TILT;
    },
    // ระยะกล้อง → จุดโฟกัส (ชั้น 2D ใช้ตัดสินการจางของสิ่งปลูกสร้างไกลๆ ให้สัมพันธ์กับระดับซูม)
    focusDist() { return R.cur.dist; },
    toggleAxis() { /* มุมตามแกนของอุโมงค์เดิม — กระดานแบนไม่มีแล้ว */ },
    skipShot() { if (R.shot) shotEnd = 0; shots.length = 0; jumpCam = null; },
    setFocusId(id) { R.focusId = id; },
    _dbg() { return { cam: camera.position.toArray().map((v) => +v.toFixed(2)), cur: { ...R.cur }, user: { ...R.user }, focus: R.focus, info: renderer.info.render }; },
    dispose() {
      scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { if (x.map && x.map !== earthTex) x.map.dispose?.(); x.dispose?.(); }); });
      for (const t of signTexCache.values()) t.dispose();
      getEarth().textures.delete(earthTex); earthTex.dispose();
      renderer.dispose();
    },
  };
}

// ============================================================
//  สนาม Colony (GRID_PLAN §8.3) — ฉาก 3 มิติของผิวด้านในกระบอก (three.js) + กล้อง + ตัวฉายภาพให้ชั้น 2D เดิม
//  BoardCanvas วาด WebGL ไว้ชั้นล่าง แล้วตั้ง boardGeo.setCustomProjection(view) → ตัวละคร/ไฮไลต์/เอฟเฟกต์ทุกตัวละคร
//   (ที่วาดผ่าน P/quad/gEllipse) ไปอยู่บนผิวกระบอกตามกล้อง 3D เองโดยไม่ต้องแก้รายตัว
//  พิกัดกระดาน (bx, by) → โลก: มุม φ = (bx − 0.5)·Δφ · แกน Z = by · สูงจากพื้น h = z (เข้าหาแกน) · รัศมี Rc ให้ช่องกว้าง 1 หน่วย
//
//  กล้อง (ผู้ใช้เน้น "สำคัญจริงๆ" — ต้นแบบ .claude/plans/colony.html):
//   วงโคจรรอบจุดโฟกัส (ตัวที่กำลังเดิน) · yaw = หมุนรอบแนวตั้งฉากพื้น (Q/E ของกระดาน + ลากซ้าย) · pitch (ลากขึ้นลง · ปุ่มมุมบน = ก้มสุด)
//   dist (ระดับซูม + ล้อเมาส์) · pan (ลากขวา) · axis = มุมมองตามแกน · แขนกล้องกันชนผนัง/ตึก/วงแหวน · ถอยออกตอนเปลี่ยนโฟกัสไกล
//   ช็อตอีเวนต์ยึดกล้องชั่วคราว (อุกกาบาต ลำแสง แคปซูล ปิดผนึก ระเบิด กระโดด หมุน) แล้วคืนให้ผู้เล่น · สั่น · FOV ถ่างตอนระเบิด
// ============================================================
import * as THREE from "three";
import { getEarth } from "../globe/globeCore";
import { towerHeight } from "./colonyProps";
import { createColonyModels } from "./colonyModels";
import { playSfx } from "../audio";

const COLS = 24, ROWS = 40, SEC = 10; // 24 คอลัมน์ (ผู้ใช้สั่ง 2026-11-09 ขยายรอบวง — เดิม 16 · รัศมีอุโมงค์กว้างขึ้น 1.5 เท่า)
const Rc = COLS / (2 * Math.PI), DPHI = (2 * Math.PI) / COLS;
const TAU = Math.PI * 2;
const FOV = 54; // อุโมงค์ 24 คอลัมน์กว้างพอแล้ว — เลนส์ไม่กว้างเกิน ขอบจอไม่บิด
const HEIGHT = { house: 0.5, tower: 1.35, tree: 0.95 };
const mod = (x, n) => ((x % n) + n) % n;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const angD = (a, b) => mod(b - a + Math.PI, TAU) - Math.PI;
const wd = (a, b) => { let d = mod(b - a, COLS); if (d > COLS / 2) d -= COLS; return d; };
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const phiOf = (bx) => (bx - 0.5) * DPHI;
const nrm = (phi) => new THREE.Vector3(-Math.cos(phi), -Math.sin(phi), 0);
const tan = (phi) => new THREE.Vector3(-Math.sin(phi), Math.cos(phi), 0);
const surf = (phi, z, h = 0, out = new THREE.Vector3()) => out.set((Rc - h) * Math.cos(phi), (Rc - h) * Math.sin(phi), z);
const AX = new THREE.Vector3(0, 0, 1);
const TILT = 0.62; // มุมก้มเริ่มต้น (สูงขึ้นจาก 0.45 — เห็นพื้นรอบตัวกว้างกว่า)
const ZOOM_DIST = [12, 10, 8, 6.4, 5]; // ระยะกล้องตามระดับซูม 0..4
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

// ---------------------------------------------------------------- พื้นผิวกระบอก (เท็กซ์เจอร์ระบายจากแผนที่ — ลายแบบกระดาน 2D ของด่าน I/II: สีพาสเทล หมากรุกจาง เส้นตาราง)
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
      // กระจกหน้าต่างยาว (มองเห็นอวกาศ) — กลางวัน = ฟ้าสะท้อน + เงาเมฆ · กลางคืน = ดาว + เนบิวลาจาง · กรอบเหล็กสองข้าง + คานขวางทุกช่อง
      const gr = g.createLinearGradient(x0, 0, x0 + px, 0);
      gr.addColorStop(0, C.glass[0]); gr.addColorStop(0.5, C.glass[1]); gr.addColorStop(1, C.glass[0]);
      g.fillStyle = gr; g.fillRect(x0, y0, px + 0.5, py + 0.5);
      if (night) {
        const nb = g.createRadialGradient(x0 + px * hash(x, y, 31), y0 + py * hash(y, x, 32), 0, x0 + px / 2, y0 + py / 2, px * 0.9);
        nb.addColorStop(0, `rgba(${120 + hash(x, y, 33) * 80 | 0},90,200,.22)`); nb.addColorStop(1, "rgba(60,40,120,0)");
        g.fillStyle = nb; g.fillRect(x0, y0, px, py);
        for (let i = 0; i < 9; i++) { const b = hash(x, y, i + 40); g.fillStyle = `rgba(255,255,255,${0.35 + b * 0.65})`; const r = b > 0.9 ? 1.4 : 0.8; g.beginPath(); g.arc(x0 + hash(x, i, y) * px, y0 + hash(i, y, x) * py, r, 0, TAU); g.fill(); }
      } else {
        g.fillStyle = "rgba(255,255,255,.32)"; g.beginPath(); g.moveTo(x0 + px * 0.2, y0 + py); g.lineTo(x0 + px * 0.45, y0 + py); g.lineTo(x0 + px * 0.75, y0); g.lineTo(x0 + px * 0.5, y0); g.closePath(); g.fill();
        if (hash(x, y, 50) > 0.6) { const cg = g.createRadialGradient(x0 + px * 0.5, y0 + py * 0.5, 0, x0 + px * 0.5, y0 + py * 0.5, px * 0.45); cg.addColorStop(0, "rgba(255,255,255,.35)"); cg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = cg; g.fillRect(x0, y0, px, py); }
      }
      // กรอบเหล็ก: รางข้าง (หมุดย้ำ) + คานขวาง
      g.fillStyle = night ? "#5b6b84" : "#c3cfdc"; g.fillRect(x0, y0, px * 0.07, py + 0.5); g.fillRect(x0 + px * 0.93, y0, px * 0.07, py + 0.5); g.fillRect(x0, y0 + py * 0.47, px, py * 0.06);
      g.fillStyle = night ? "rgba(255,210,150,.55)" : "rgba(90,105,125,.55)";
      for (const yy of [0.2, 0.8]) for (const xx of [0.035, 0.965]) { g.beginPath(); g.arc(x0 + px * xx, y0 + py * yy, px * 0.018, 0, TAU); g.fill(); }
      if (special[k] !== "belt") continue; // สายพานพาดข้ามแถบกระจก = วาดสายพานทับต่อ
    }
    if (special[k] === "shallow") {
      // น้ำตื้น (แบบช่อง shallow ของกระดาน 2D)
      g.fillStyle = C.water; g.fillRect(x0 + px * 0.02, y0 + py * 0.02, px * 0.96, py * 0.96);
      g.strokeStyle = C.waterRim; g.lineWidth = Math.max(1, px * 0.03); g.strokeRect(x0 + px * 0.02, y0 + py * 0.02, px * 0.96, py * 0.96);
      g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x0 + px * 0.14, y0 + py * 0.14, px * 0.72, py * 0.72);
      g.fillStyle = C.pebble;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x0 + px * (0.15 + hash(i, x, y, 1) * 0.7), y0 + py * (0.15 + hash(y, x, i) * 0.7), px * 0.035, py * 0.02, 0, 0, TAU); g.fill(); }
    } else if (special[k] === "belt") {
      // สายพานทางด่วน: ยางดำ + ขอบเหลือง + ลูกศรตามทิศ (map.flow)
      const right = (map.flow && map.flow[k]) !== "left";
      g.fillStyle = night ? "#20262f" : "#3a414c"; g.fillRect(x0, y0 + py * 0.08, px + 0.5, py * 0.84);
      g.fillStyle = night ? "#c99a2e" : "#f2b33c"; g.fillRect(x0, y0 + py * 0.08, px + 0.5, py * 0.07); g.fillRect(x0, y0 + py * 0.85, px + 0.5, py * 0.07);
      g.fillStyle = night ? "rgba(120,220,255,.75)" : "rgba(160,235,255,.9)";
      for (const c of [0.25, 0.65]) {
        const cx = x0 + px * c, cy = y0 + py / 2, w = px * 0.16 * (right ? 1 : -1);
        g.beginPath(); g.moveTo(cx - w, cy - py * 0.22); g.lineTo(cx + w, cy); g.lineTo(cx - w, cy + py * 0.22); g.lineTo(cx - w * 0.3, cy); g.closePath(); g.fill();
      }
    } else if (special[k] === "rail") {
      // รางรถราง: หมอนไม้ + รางเหล็กคู่
      g.fillStyle = night ? "#3b3f47" : "#b7b2a6"; g.fillRect(x0 + px * 0.06, y0, px * 0.88, py + 0.5);
      g.fillStyle = night ? "#4a3a2c" : "#8a6a48";
      for (let i = 0; i < 4; i++) g.fillRect(x0 + px * 0.1, y0 + py * (0.06 + i * 0.25), px * 0.8, py * 0.1);
      g.fillStyle = night ? "#9fb0c8" : "#6d7682";
      g.fillRect(x0 + px * 0.26, y0, px * 0.06, py + 0.5); g.fillRect(x0 + px * 0.68, y0, px * 0.06, py + 0.5);
      g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(x0 + px * 0.27, y0, px * 0.015, py + 0.5); g.fillRect(x0 + px * 0.69, y0, px * 0.015, py + 0.5);
    } else if (special[k] === "warp") {
      // แท่นวาร์ป: วงแหวนซ้อนม่วงเรือง
      const cx = x0 + px / 2, cy = y0 + py / 2;
      g.fillStyle = night ? "#2a2148" : "#d9d2f2"; g.beginPath(); g.arc(cx, cy, px * 0.46, 0, TAU); g.fill();
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, px * 0.44); gr.addColorStop(0, "rgba(200,160,255,.95)"); gr.addColorStop(0.6, "rgba(140,90,255,.5)"); gr.addColorStop(1, "rgba(120,80,255,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, px * 0.44, 0, TAU); g.fill();
      g.strokeStyle = "#b48cff"; g.lineWidth = Math.max(2, px * 0.05);
      for (const r of [0.42, 0.28]) { g.beginPath(); g.arc(cx, cy, px * r, 0, TAU); g.stroke(); }
    } else if (special[k] === "watch") {
      // ฐานหอสังเกตการณ์: แผ่นหกเหลี่ยมเหล็ก + ขอบฟ้า
      const cx = x0 + px / 2, cy = y0 + py / 2;
      g.fillStyle = night ? "#46566e" : "#cfd9e4"; g.strokeStyle = night ? "#8fb4e6" : "#4d7fb8"; g.lineWidth = Math.max(2, px * 0.05);
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; g.lineTo(cx + Math.cos(a) * px * 0.44, cy + Math.sin(a) * py * 0.44); } g.closePath(); g.fill(); g.stroke();
      g.fillStyle = night ? "rgba(140,190,255,.5)" : "rgba(77,127,184,.4)"; g.beginPath(); g.arc(cx, cy, px * 0.12, 0, TAU); g.fill();
    } else if (map.heal && (Array.isArray(map.heal) ? map.heal.includes(k) : map.heal.has && map.heal.has(k))) {
      // น้ำพุ: ลานหินกลม + อ่างน้ำ
      const cx = x0 + px / 2, cy = y0 + py / 2;
      g.fillStyle = night ? "#6d7584" : "#e6e1d6"; g.beginPath(); g.arc(cx, cy, px * 0.48, 0, TAU); g.fill();
      g.fillStyle = night ? "#596173" : "#cfc8b8"; g.beginPath(); g.arc(cx, cy, px * 0.36, 0, TAU); g.fill();
      g.fillStyle = C.water; g.beginPath(); g.arc(cx, cy, px * 0.3, 0, TAU); g.fill();
      g.strokeStyle = C.waterRim; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, px * 0.2, 0, TAU); g.stroke();
    } else if (special[k] === "lift") {
      g.fillStyle = night ? "#3a4660" : "#dfe6ee"; g.fillRect(x0 + px * 0.06, y0 + py * 0.06, px * 0.88, py * 0.88);
      g.strokeStyle = "#d9a93f"; g.lineWidth = Math.max(2, px * 0.06);
      g.beginPath(); g.arc(x0 + px / 2, y0 + py / 2, px * 0.32, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(x0 + px / 2, y0 + py * 0.68); g.lineTo(x0 + px / 2, y0 + py * 0.32); g.moveTo(x0 + px * 0.36, y0 + py * 0.46); g.lineTo(x0 + px / 2, y0 + py * 0.32); g.lineTo(x0 + px * 0.64, y0 + py * 0.46); g.stroke();
    } else if (d === "town" && isRoad(x, y)) {
      // ถนนหิน (ย่านเมือง)
      g.fillStyle = C.road; g.fillRect(x0 + px * 0.04, y0 + py * 0.04, px * 0.92, py * 0.92);
      g.strokeStyle = C.roadRim; g.lineWidth = Math.max(1, px * 0.03); g.strokeRect(x0 + px * 0.04, y0 + py * 0.04, px * 0.92, py * 0.92);
      // อิฐปูถนน (ลายเรียงสลับ)
      g.strokeStyle = night ? "rgba(255,255,255,.06)" : "rgba(120,100,70,.12)"; g.lineWidth = 1;
      for (let r = 1; r < 4; r++) { const yy = y0 + py * (0.04 + 0.92 * r / 4); g.beginPath(); g.moveTo(x0 + px * 0.04, yy); g.lineTo(x0 + px * 0.96, yy); g.stroke(); }
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const xx = x0 + px * (0.04 + 0.92 * (c + (r % 2 ? 0.5 : 1)) / 3); if (xx < x0 + px * 0.95) { g.beginPath(); g.moveTo(xx, y0 + py * (0.04 + 0.92 * r / 4)); g.lineTo(xx, y0 + py * (0.04 + 0.92 * (r + 1) / 4)); g.stroke(); } }
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
    // เม็ดพื้นละเอียด (ไม่ให้พื้นเป็นสีแบนๆ)
    for (let i = 0; i < 10; i++) { g.fillStyle = hash(x, y, 60 + i) > 0.5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.05)"; g.fillRect(x0 + hash(i, x, y + 7) * px, y0 + hash(y, i + 3, x) * py, px * 0.05, py * 0.05); }
    // เงาโคนกำแพงกั้นปล้อง (แถวติดกำแพงทั้งสองฝั่ง)
    const ys = y % SEC;
    if ((ys === SEC - 1 || ys === 0) && y > 0 && y < ROWS - 1) {
      const toWall = ys === SEC - 1; // ฝั่งบนของแถวนี้ติดกำแพง
      const ao = g.createLinearGradient(0, toWall ? y0 : y0 + py, 0, toWall ? y0 + py * 0.6 : y0 + py * 0.4);
      ao.addColorStop(0, night ? "rgba(0,0,10,.35)" : "rgba(20,40,60,.18)"); ao.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = ao; g.fillRect(x0, y0, px, py);
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
  // ไฟดับ (กำลังมีผล) = ทั้งปล้องมืด
  if (c.blackout != null) for (let y = c.blackout * SEC; y < (c.blackout + 1) * SEC; y++) for (let x = 0; x < COLS; x++) tile(x, y, "rgba(8,6,30,.55)");
  // ป้อมปืน: แนวที่จะยิงตอนจบเทิร์น (3 ช่อง)
  for (const tr of c.turrets || []) {
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[tr.face];
    if (!v) continue;
    for (let i = 1; i <= 3; i++) { const yy = tr.y + v[1] * i; if (yy < 0 || yy >= ROWS) break; tile(tr.x + v[0] * i, yy, `rgba(255,60,60,${0.32 - i * 0.07})`); }
  }
  for (const t of c.tele || []) {
    g.globalAlpha = t.foresee ? 0.45 : 1; // หอสังเกตการณ์: เป้าของเทิร์น +2 จางกว่า
    if (t.type === "tram") {
      for (let y = (c.sealed | 0) * SEC; y < ROWS; y++) { tile(t.x, y, "rgba(255,170,40,.45)"); if (y % 2 === 0) tile(t.x, y, "rgba(40,20,0,.18)"); }
      continue;
    }
    if (t.type === "blackout") { for (let y = t.sec * SEC; y < (t.sec + 1) * SEC; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2 === 0) tile(x, y, "rgba(60,40,140,.22)"); continue; }
    if (t.type === "gravity") continue;
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
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- ตัวช่วยวางของบนผิว (แกน Y ของวัตถุ = ชี้เข้าแกนกระบอก)
function placeOn(obj, bx, by, h = 0) {
  const phi = phiOf(bx);
  const m = new THREE.Matrix4().makeBasis(tan(phi), nrm(phi), AX);
  obj.quaternion.setFromRotationMatrix(m);
  surf(phi, by, h, obj.position);
  return obj;
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

// ================================================================ createColonyView
export function createColonyView(canvas, { lowQ = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowQ, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQ ? 1 : 1.5)); // เพดาน 1.5 — จอ 4K ไม่ต้องวาด 4 เท่า
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040a);
  scene.fog = new THREE.Fog(0xdde9f4, 20, 72); // หมอกจาง (กลางวัน = ฟ้าอ่อนแบบฉากหลังด่าน I · กลางคืน = น้ำเงินเข้ม)
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.03, 200);

  // ---- แสง
  const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x324058, 1.25);
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  const sun = new THREE.DirectionalLight(0xfff2dc, 0.9);
  sun.position.set(0, 0, -10); sun.target.position.set(0, 0, 40);
  scene.add(hemi, amb, sun, sun.target);
  // ---- แกนแสงกลาง (ดวงอาทิตย์เทียมของโคโลนี): แกนสว่าง + รัศมีนุ่มแบบเฟรสเนล (หันด้านข้าง = จาง) + โคมทุกปล้อง
  //  กลางวัน = ขาวอุ่นสว่าง · กลางคืน = ฟ้าจางแบบแสงจันทร์ · แกนเดียว ทั้งหมด 3 draw call
  const sunLineMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(0xfff1d0) }, uPow: { value: 1 }, uTime: { value: 0 } },
    // จางเมื่ออยู่ใกล้กล้อง (เงยมองแล้วแกนแสงไม่บังกลางจอ)
    vertexShader: "varying vec3 vN; varying vec3 vV; varying float vZ; varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vZ = position.y; vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform vec3 uColor; uniform float uPow; uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vZ; varying float vD; void main(){ float f = abs(dot(vN, vV)); float a = pow(f, 4.0) * uPow * (0.85 + 0.15 * sin(vZ * 0.9 - uTime * 1.6)) * smoothstep(2.5, 9.0, vD); gl_FragColor = vec4(uColor * a, a); }",
  });
  const sunHalo = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, ROWS + 6, 24, 1, true), sunLineMat);
  sunHalo.rotation.x = Math.PI / 2; sunHalo.position.z = ROWS / 2;
  // แกนสว่าง: จางเมื่ออยู่ใกล้กล้อง (ไม่เป็นเส้นขาวพาดกลางจอตอนกล้องอยู่ใกล้แกน)
  const sunCoreMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(0xfffbea) } },
    vertexShader: "varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform vec3 uColor; varying float vD; void main(){ gl_FragColor = vec4(uColor, smoothstep(3.5, 11.0, vD)); }",
  });
  const sunCore = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, ROWS + 6, 10, 1, true), sunCoreMat);
  sunCore.rotation.x = Math.PI / 2; sunCore.position.z = ROWS / 2;
  const nodeTex = glowTex("rgba(255,250,235,1)", "rgba(255,226,170,.35)");
  const sunNodes = [];
  for (let z = 0; z <= ROWS; z += SEC / 2) { const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: nodeTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); n.position.set(0, 0, z); n.scale.setScalar(z % SEC ? 0.7 : 1.3); sunNodes.push(n); }
  scene.add(sunHalo, sunCore, ...sunNodes);
  // ---- เมฆลอยรอบแกน (สไปรต์นุ่ม · ไหลช้าๆ ตามแกน + วนรอบ) — กลางคืนจางเกือบหาย
  const cloudTex = canvasTex(256, 128, (g, Wd, H) => {
    for (let i = 0; i < 14; i++) {
      const x = Wd * (0.2 + hash(i, 1, 9) * 0.6), y = H * (0.42 + hash(i, 2, 9) * 0.22), r = H * (0.18 + hash(i, 3, 9) * 0.22);
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  });
  const CLOUD_N = lowQ ? 8 : 22;
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.6 });
  const clouds = Array.from({ length: CLOUD_N }, (_, i) => {
    const sp = new THREE.Sprite(cloudMat); const sc = 2.2 + hash(i, 4, 2) * 2.6; sp.scale.set(sc * 2, sc, 1);
    scene.add(sp);
    return { sp, phi: hash(i, 5, 2) * TAU, z: hash(i, 6, 2) * ROWS, r: Rc * (0.42 + hash(i, 7, 2) * 0.2), v: 0.12 + hash(i, 8, 2) * 0.18 };
  });

  // ---- พื้นผิวกระบอก + ชั้นเตือน
  const RES = lowQ ? 32 : 64;
  const floorCv = document.createElement("canvas"); floorCv.width = COLS * RES; floorCv.height = ROWS * RES;
  const floorTex = new THREE.CanvasTexture(floorCv); floorTex.colorSpace = THREE.SRGBColorSpace; floorTex.anisotropy = 8;
  floorTex.wrapS = THREE.RepeatWrapping;
  const ovCv = document.createElement("canvas"); ovCv.width = COLS * 16; ovCv.height = ROWS * 16;
  const ovTex = new THREE.CanvasTexture(ovCv); ovTex.colorSpace = THREE.SRGBColorSpace;
  function tubeGeo(h) {
    const seg = COLS * 4, geo = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
    for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= seg; i++) {
      const phi = phiOf(i / seg * COLS);
      pos.push((Rc - h) * Math.cos(phi), (Rc - h) * Math.sin(phi), j);
      uv.push(i / seg, j / ROWS);
    }
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  }
  // พื้น = ภาพ 2D ล้วน (ไม่รับแสง) — สีตรงตามกระดาน 2D · หมอกจางให้ปลายกระบอกฟุ้งแบบในโคโลนี
  const floorMat = new THREE.MeshBasicMaterial({ map: floorTex, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(tubeGeo(0), floorMat);
  const ovMat = new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  const overlay = new THREE.Mesh(tubeGeo(0.01), ovMat);
  scene.add(floor, overlay);

  // ---- ของบนพื้น: บ้าน/ตึก/ต้นไม้/ป้อม/หอ/น้ำพุ/แคปซูล = โมเดล 3D ยึดพื้น (colonyModels.js — ผู้ใช้สั่ง 2026-11-09 ไม่เอาสไปรต์ 2D หันตามกล้อง)
  //  solidAt = ความสูงให้แขนกล้องหลบ
  const models = createColonyModels({ placeOn, surfAt: (bx, by, hh, out) => surf(phiOf(bx), by, hh, out), lowQ });
  scene.add(models.root);
  const solidAt = new Map(); // "x,y" → ความสูง
  let terrainSig = "", lastNight = null;
  function buildProps(map, isNight) {
    models.build(map, !!isNight);
    solidAt.clear();
    for (const [k, kind] of Object.entries(map.terrain || {})) {
      if (!HEIGHT[kind]) continue;
      const [x, y] = k.split(",").map(Number);
      solidAt.set(k, kind === "tower" ? towerHeight(x, y) : HEIGHT[kind]);
    }
  }

  // ---- วงแหวนกั้นปล้อง + ประตู + ป้ายนับถอยหลังเหนือประตู
  const walls = new THREE.Group(); scene.add(walls);
  const wallLights = [];
  const doorGlows = [];
  const doorSigns = [];
  const metal = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }); // ผนัง/เสา: สีเรียบโทนเดียวกับพื้น 2D
  function signTex(n, red) {
    return canvasTex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, red ? "rgba(255,60,40,.8)" : "rgba(255,150,60,.7)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      g.font = "700 82px Chakra Petch, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 10; g.strokeStyle = "#160608"; g.strokeText(String(n), 64, 68);
      g.fillStyle = red ? "#ff6a50" : "#ffb070"; g.fillText(String(n), 64, 68);
    });
  }
  // เรขาคณิตใช้ร่วมกันทุกช่อง (เดิมสร้างใหม่ทุกชิ้น ~300 ก้อน)
  const GEO = { post: new THREE.BoxGeometry(0.08, 1.0, 0.14), lintel: new THREE.BoxGeometry(1.0, 0.09, 0.14), glow: new THREE.PlaneGeometry(0.84, 0.9),
    shutter: new THREE.BoxGeometry(0.86, 0.92, 0.06), wall: new THREE.BoxGeometry(1.02, 0.8, 0.12), light: new THREE.BoxGeometry(0.6, 0.08, 0.13) };
  const shutterMat = new THREE.MeshLambertMaterial({ color: 0xa8382e });
  function buildWalls(map) {
    walls.clear(); wallLights.length = 0; doorGlows.length = 0; doorSigns.length = 0;
    const doors = map.doors || [];
    for (const r of map.walls || []) {
      const z = r + 1;
      for (let x = 0; x < COLS; x++) {
        const door = doors.includes(x);
        const seg = new THREE.Group();
        if (door) {
          for (const s of [-0.46, 0.46]) { const post = new THREE.Mesh(GEO.post, metal); post.position.set(s, 0.5, 0); seg.add(post); }
          const lintel = new THREE.Mesh(GEO.lintel, metal); lintel.position.y = 0.96; seg.add(lintel);
          const gm = new THREE.MeshBasicMaterial({ color: 0x5ad8ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
          const glow = new THREE.Mesh(GEO.glow, gm); glow.position.y = 0.45; seg.add(glow);
          const shutter = new THREE.Mesh(GEO.shutter, shutterMat);
          shutter.position.y = 0.46; shutter.scale.y = 0.001; shutter.visible = false; seg.add(shutter);
          const sign = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
          sign.position.y = 1.35; sign.scale.setScalar(0.7); sign.visible = false; seg.add(sign);
          doorGlows.push({ row: r, mat: gm, shutter });
          doorSigns.push({ row: r, sprite: sign, n: null });
        } else {
          const wall = new THREE.Mesh(GEO.wall, metal); wall.position.y = 0.4; seg.add(wall);
          const lm = new THREE.MeshBasicMaterial({ color: x % 2 ? 0x50e68c : 0x50c8ff });
          const light = new THREE.Mesh(GEO.light, lm); light.position.y = 0.58; seg.add(light);
          wallLights.push({ row: r, mat: lm, base: x % 2 ? 0x50e68c : 0x50c8ff, i: x });
        }
        placeOn(seg, x + 0.5, z);
        seg.userData.row = r;
        walls.add(seg);
      }
    }
  }

  // ---- ลิฟต์แกนกลาง (ซี่ลวดขึ้นแกน + ไฟวิ่ง)
  const lifts = new THREE.Group(); scene.add(lifts);
  const liftDots = [];
  const spokeMat = new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.45, depthWrite: false });
  const warpBeamTex = canvasTex(32, 128, (g, Wd, H) => { const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, "rgba(190,150,255,.7)"); gr.addColorStop(1, "rgba(190,150,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, Wd, H); });
  const warpBeamMat = new THREE.MeshBasicMaterial({ map: warpBeamTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const warpBeamGeo = new THREE.CylinderGeometry(0.26, 0.32, 1.6, 16, 1, true);
  const warpBeams = [];
  function buildLifts(map) {
    lifts.clear(); liftDots.length = 0; warpBeams.length = 0;
    for (const [k, kind] of Object.entries(map.special || {})) {
      if (kind !== "warp") continue;
      const [x, y] = k.split(",").map(Number);
      const b = new THREE.Mesh(warpBeamGeo, warpBeamMat);
      placeOn(b, x + 0.5, y + 0.5, 0.7);
      lifts.add(b); warpBeams.push(b);
    }
    for (const [k, kind] of Object.entries(map.special || {})) {
      if (kind !== "lift") continue;
      const [x, y] = k.split(",").map(Number);
      const phi = phiOf(x + 0.5), zc = y + 0.5;
      const a = surf(phi, zc, 0), b = new THREE.Vector3(0, 0, zc);
      const len = a.distanceTo(b);
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 6), spokeMat);
      spoke.position.copy(a).lerp(b, 0.5);
      spoke.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), metal); hub.position.copy(b);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffd65a }));
      placeOn(ring, x + 0.5, zc, 0.02); ring.rotateX(Math.PI / 2);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd65a }));
      lifts.add(spoke, hub, ring, dot);
      liftDots.push({ dot, a, b });
    }
  }

  // ---- ฝาท้าย (ท่าเทียบยาน) + โดมกระจก + โลกสีขาวของ ORDEAL CALL
  const capBottom = new THREE.Group(); scene.add(capBottom);
  {
    // ฝาท้าย = ประตูท่าเทียบยาน (Lambert สว่าง — เดิม MeshStandard โลหะไม่มีแสงสะท้อน = ดำทึบเหมือนมองทะลุอวกาศ)
    const capTex = canvasTex(512, 512, (g, Wd, H) => {
      g.fillStyle = "#9aa6b8"; g.fillRect(0, 0, Wd, H);
      g.translate(Wd / 2, H / 2);
      for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.fillStyle = i % 2 ? "#a7b2c3" : "#8e9aad"; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, Wd / 2, 0, TAU / 12); g.closePath(); g.fill(); }
      g.strokeStyle = "rgba(30,40,60,.35)"; g.lineWidth = 3;
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * Wd / 2, Math.sin(a) * Wd / 2); g.stroke(); }
      g.fillStyle = "#f2b33c"; for (const r of [0.92, 0.3]) { g.beginPath(); g.arc(0, 0, Wd / 2 * r, 0, TAU); g.arc(0, 0, Wd / 2 * r - 10, 0, TAU, true); g.fill(); }
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(Rc, 64), new THREE.MeshLambertMaterial({ map: capTex, side: THREE.DoubleSide }));
    capBottom.add(disc);
    for (const r of [0.75, 0.5, 0.25]) { const ring = new THREE.Mesh(new THREE.RingGeometry(Rc * r - 0.02, Rc * r, 64), new THREE.MeshBasicMaterial({ color: 0x9fbfe0, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })); ring.position.z = 0.01; capBottom.add(ring); }
    const port = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(200,240,255,1)", "rgba(95,200,255,.45)"), transparent: true, depthWrite: false })); port.scale.setScalar(1.2); port.position.z = 0.05; capBottom.add(port);
    capBottom.position.z = 0;
  }
  // ท่าเทียบยานต่อจากฝาท้าย (z < 0): กล้องถอยออกหลังฝาได้โดยไม่เห็นนอกโคโลนี — ผนังเหล็กเรียบ + ไฟวงแหวน
  {
    const bayTex = canvasTex(256, 128, (g, W, H) => {
      g.fillStyle = "#8d99aa"; g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 32) { g.fillStyle = (x / 32) % 2 ? "#97a3b4" : "#8592a4"; g.fillRect(x, 0, 32, H); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x, 0, 1.5, H); }
      g.fillStyle = "#c9e8ff"; g.fillRect(0, H * 0.46, W, H * 0.08);
    });
    bayTex.wrapS = THREE.RepeatWrapping; bayTex.wrapT = THREE.RepeatWrapping; bayTex.repeat.set(2, 4);
    // ยาว 12 + ฝาปิดหลัง — หมุนกล้องมองเฉียงไปทางฝาท้ายแล้วไม่ทะลุเห็นอวกาศดำ (บั๊ก 2026-11-09)
    const bay = new THREE.Mesh(new THREE.CylinderGeometry(Rc + 0.002, Rc + 0.002, 12, 64, 1, true), new THREE.MeshBasicMaterial({ map: bayTex, side: THREE.BackSide }));
    bay.rotation.x = Math.PI / 2; bay.position.z = -6;
    const bayEnd = new THREE.Mesh(new THREE.CircleGeometry(Rc + 0.01, 64), new THREE.MeshBasicMaterial({ color: 0x6f7b8e, side: THREE.DoubleSide }));
    bayEnd.position.z = -12;
    scene.add(bay, bayEnd);
  }
  const domeGroup = new THREE.Group(); domeGroup.position.z = ROWS; scene.add(domeGroup);
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false });
  {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(Rc, 48, 24, 0, TAU, 0, Math.PI / 2), domeMat);
    dome.rotation.x = Math.PI / 2; dome.scale.set(1, 0.7, 1);
    domeGroup.add(dome);
    const lines = [];
    for (let m = 0; m < 12; m++) {
      const t = m / 12 * TAU;
      for (let i = 0; i < 10; i++) {
        const a0 = i / 10 * Math.PI / 2, a1 = (i + 1) / 10 * Math.PI / 2;
        lines.push(new THREE.Vector3(Math.cos(a0) * Math.cos(t) * Rc, Math.cos(a0) * Math.sin(t) * Rc, Math.sin(a0) * Rc * 0.7), new THREE.Vector3(Math.cos(a1) * Math.cos(t) * Rc, Math.cos(a1) * Math.sin(t) * Rc, Math.sin(a1) * Rc * 0.7));
      }
    }
    for (const a of [0.35, 0.7, 1.05, 1.35]) for (let i = 0; i < 40; i++) {
      const t0 = i / 40 * TAU, t1 = (i + 1) / 40 * TAU, r = Math.cos(a) * Rc, zz = Math.sin(a) * Rc * 0.7;
      lines.push(new THREE.Vector3(Math.cos(t0) * r, Math.sin(t0) * r, zz), new THREE.Vector3(Math.cos(t1) * r, Math.sin(t1) * r, zz));
    }
    domeGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), new THREE.LineBasicMaterial({ color: 0xe6f0fa, transparent: true, opacity: 0.6 })));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(Rc, 0.06, 8, 64), metal); domeGroup.add(rim);
  }
  // โลก: เท็กซ์เจอร์ลูกโลกร่วมของ ORDEAL CALL (globeCore.getEarth — ทวีปขาว ทะเลฟ้าอ่อน เส้นกริด)
  const earthTex = new THREE.CanvasTexture(getEarth().canvas); earthTex.colorSpace = THREE.SRGBColorSpace;
  getEarth().textures.add(earthTex);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(5, 64, 48), new THREE.MeshLambertMaterial({ map: earthTex }));
  earth.position.set(2.2, -1.6, ROWS + 26);
  scene.add(earth);
  const earthHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(127,184,230,.0)", "rgba(127,184,230,.55)"), transparent: true, depthWrite: false }));
  earthHalo.scale.setScalar(14); earthHalo.position.copy(earth.position); scene.add(earthHalo);
  const earthSun = new THREE.DirectionalLight(0xffffff, 0.9); earthSun.position.set(-20, 10, ROWS + 10); earthSun.target = earth; scene.add(earthSun);
  {
    const N = 900, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * 9); pos.set([v.x + earth.position.x, v.y + earth.position.y, v.z + earth.position.z], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x7fb8e6, size: 0.06, transparent: true, opacity: 0.7 })));
    const S = 600, sp = new Float32Array(S * 3);
    for (let i = 0; i < S; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(80); v.z = Math.abs(v.z) + ROWS; sp.set([v.x, v.y, v.z], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, sizeAttenuation: true })));
  }

  // ---- ม่านเหล็ก (ปล้องที่ปิดผนึก) — ปิดสนิท / กำลังหมุนปิด
  const irisMat = new THREE.MeshLambertMaterial({ color: 0x9a3a30, side: THREE.DoubleSide }); // Lambert (โลหะไม่มีแสงสะท้อน = ดำทึบ)
  let iris = null, irisOpen = 1;
  function setIris(z, open) {
    irisOpen = open;
    if (iris) { scene.remove(iris); iris.geometry.dispose(); iris = null; }
    if (z == null) return;
    iris = new THREE.Mesh(open > 0.02 ? new THREE.RingGeometry(Rc * open, Rc, 64) : new THREE.CircleGeometry(Rc, 64), irisMat);
    iris.position.z = z;
    scene.add(iris);
  }

  // ---- รูรั่ว (ขอบเรือง + อนุภาคถูกดูด)
  const holeGroup = new THREE.Group(); scene.add(holeGroup);
  let holeSig = "";
  // ขอบหลอมเรืองส้ม + วังวนม่วงหมุนรอบรู (ดึงสายตาว่าตรงนี้ดูดคน)
  const vortexTex = canvasTex(256, 256, (g) => {
    g.translate(128, 128);
    for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 90; i++) {
      const t = i / 90, a = arm * TAU / 4 + t * 5.5, r = 18 + t * 104;
      g.fillStyle = `rgba(${170 + t * 60 | 0},${90 + t * 60 | 0},255,${0.55 * (1 - t)})`;
      g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 3 + t * 9, 0, TAU); g.fill();
    }
  });
  const rimGeo = new THREE.TorusGeometry(0.42, 0.045, 6, 28), rimMat = new THREE.MeshBasicMaterial({ color: 0xff7a3a });
  const vortexGeo = new THREE.PlaneGeometry(2.6, 2.6), vortexMat = new THREE.MeshBasicMaterial({ map: vortexTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const vortices = [];
  function buildHoles(holes) {
    holeGroup.clear(); vortices.length = 0;
    for (const h of holes) for (const [x, y] of h.cells) {
      const rim = new THREE.Mesh(rimGeo, rimMat);
      placeOn(rim, x + 0.5, y + 0.5, 0.02); rim.rotateX(Math.PI / 2);
      const vx = new THREE.Mesh(vortexGeo, vortexMat);
      placeOn(vx, x + 0.5, y + 0.5, 0.03); vx.rotateX(Math.PI / 2);
      vx.scale.setScalar(0.6 + (h.radius || 3) * 0.35);
      holeGroup.add(rim, vx); vortices.push(vx);
    }
  }
  const partGeo = new THREE.BufferGeometry();
  const PART_N = lowQ ? 80 : 240;
  const partPos = new Float32Array(PART_N * 3);
  partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
  const parts = new THREE.Points(partGeo, new THREE.PointsMaterial({ map: glowTex("rgba(255,255,255,1)", "rgba(210,190,255,.6)"), color: 0xe6d8ff, size: 0.12, transparent: true, opacity: 0.9, depthWrite: false }));
  scene.add(parts);
  const partState = Array.from({ length: PART_N }, () => ({ t: Math.random(), hole: 0, ang: Math.random() * TAU, r: 1 + Math.random() * 3 }));

  // ---- แคปซูลเสบียง: สไปรต์ 2D (colonyProps.drawCapsule) — ที่นี่คิดแค่ความสูงตอนตกลงมา (capsuleAt)
  let capsulesNow = []; // แคปซูลเสบียง 3 แบบ (ยา/ช่าง/พ่อค้าเร่) ที่ลงอยู่ — state.colony.capsules
  const capsuleDrops = new Map(); // "x,y" → { t0 } จังหวะตกในฉาก (t0 = 0 = ยังไม่ถึงคิว → ยังไม่วาด)

  // ---- เอฟเฟกต์ 3D (อุกกาบาต · ระเบิด · ลำแสงกวาด · เศษซาก · ตัวละครลอย)
  const fxGroup = new THREE.Group(); scene.add(fxGroup);
  const fxList = [];
  const boomTex = glowTex("rgba(255,255,230,1)", "rgba(255,140,50,.7)");
  const meteorTex = glowTex("rgba(255,250,230,1)", "rgba(255,170,80,.6)");
  // ก่อนเฟรมแรกของเอฟเฟกต์ (เวลาเริ่มในอนาคต / เฟรมถูกพัก) ซ่อนไว้ — สไปรต์ค่าเริ่มต้นสเกล 1 ทึบเต็ม = จอขาว
  function addFx(f) { fxList.push(f); if (f.obj) { f.obj.visible = false; fxGroup.add(f.obj); } return f; }
  function boom(pos, size = 2.2, ms = 900) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: boomTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(pos);
    addFx({ obj: s, t0: performance.now(), ms, tick: (k) => { s.scale.setScalar(0.3 + size * ease(Math.min(1, k * 1.4))); s.material.opacity = 1 - k; } });
    // เศษซาก
    const n = lowQ ? 8 : 18, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x4b4540, size: 0.09 }));
    const up = pos.clone().setZ(0).normalize().multiplyScalar(-1);
    const vs = Array.from({ length: n }, () => up.clone().multiplyScalar(2 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3)));
    addFx({ obj: pts, t0: performance.now(), ms: 1300, tick: (k) => {
      const t = k * 1.3;
      vs.forEach((v, i) => { const p = pos.clone().addScaledVector(v, t * 0.5).addScaledVector(up, -4.5 * t * t * 0.5); arr.set([p.x, p.y, p.z], i * 3); });
      geo.attributes.position.needsUpdate = true; pts.material.opacity = 1 - k; pts.material.transparent = true;
    } });
  }
  // คลื่นกระแทกบนพื้น: วงแหวนขยายออก + จาง (bx, by = ช่องบนกระดาน)
  const shockTex = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.7, "rgba(255,255,255,.15)"); gr.addColorStop(0.9, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
  const shockGeo = new THREE.PlaneGeometry(1, 1);
  function shockwave(bx, by, color = 0xffc070, size = 4, ms = 700) {
    const m = new THREE.Mesh(shockGeo, new THREE.MeshBasicMaterial({ map: shockTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    placeOn(m, bx, by, 0.04); m.rotateX(Math.PI / 2);
    addFx({ obj: m, t0: performance.now(), ms, tick: (k) => { m.scale.setScalar(0.3 + size * ease(k)); m.material.opacity = 1 - k; } });
  }
  // ประกายไฟพุ่งกระจาย (ตกตามแรงเหวี่ยงลงพื้น)
  function sparks(pos, color = 0xffd890, n = 22, speed = 3, ms = 800) {
    if (lowQ) n = Math.ceil(n / 3);
    const geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: meteorTex, color, size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const up = pos.clone().setZ(0).normalize().multiplyScalar(-1);
    const vs = Array.from({ length: n }, () => new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random())).addScaledVector(up, speed * 0.5));
    addFx({ obj: pts, t0: performance.now(), ms, tick: (k) => {
      const t = k * ms / 1000;
      vs.forEach((v, i) => { const p = pos.clone().addScaledVector(v, t).addScaledVector(up, -6 * t * t); arr.set([p.x, p.y, p.z], i * 3); });
      geo.attributes.position.needsUpdate = true; pts.material.opacity = 1 - k;
    } });
  }
  // หางอนุภาค (ไฟ/แสง) ตามจุดที่เคลื่อน — getPos(k) คืนตำแหน่ง ณ ความคืบหน้า k
  function trail(getPos, ms, color = 0xffa850, size = 0.28, n = 40) {
    if (lowQ) n = Math.ceil(n / 2);
    const geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: meteorTex, color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    addFx({ obj: pts, t0: performance.now(), ms: ms + 350, tick: (k) => {
      const kk = k * (ms + 350) / ms;
      for (let i = 0; i < n; i++) { const q = clamp(kk - i * 0.012, 0, 1); const p = getPos(q); arr.set([p.x + (Math.random() - 0.5) * 0.05 * i / n, p.y + (Math.random() - 0.5) * 0.05 * i / n, p.z], i * 3); }
      geo.attributes.position.needsUpdate = true; pts.material.opacity = kk > 1 ? Math.max(0, 1 - (kk - 1) * 3) : 1;
    } });
  }
  function streak(from, to, ms, color = 0xffa850) {
    trail((k) => from.clone().lerp(to, ease(k)), ms, color, 0.36, 46);
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: meteorTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color }));
    head.scale.setScalar(1.1);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([from, from]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    const g = new THREE.Group(); g.add(head, line);
    addFx({ obj: g, t0: performance.now(), ms, tick: (k) => {
      const e = ease(k), p = from.clone().lerp(to, e), tail = from.clone().lerp(to, Math.max(0, e - 0.3));
      head.position.copy(p); lineGeo.setFromPoints([tail, p]);
    } });
  }
  function beamSweep(row, ms) {
    const phi0 = Math.random() * TAU, z = row + 0.5;
    const geo = new THREE.BufferGeometry(); const N = 96; const arr = new Float32Array((N + 1) * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const ring = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff7ad8, transparent: true }));
    const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, z), new THREE.Vector3(0, 0, z)]);
    const ray = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0xfff0ff, transparent: true }));
    // ลำแสงหนาเรือง (ทรงกระบอกบวกแสง) จากแกนลงพื้น + จุดกระทบเรือง
    const thick = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, Rc, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8ae0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const hit = new THREE.Sprite(new THREE.SpriteMaterial({ map: meteorTex, color: 0xff9ae6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); hit.scale.setScalar(1.4);
    const g = new THREE.Group(); g.add(ring, ray, thick, hit);
    let lastSpark = 0;
    addFx({ obj: g, t0: performance.now(), ms, tick: (k) => {
      const sweep = ease(Math.min(1, k * 1.6)) * TAU;
      for (let i = 0; i <= N; i++) { const p = surf(phi0 + sweep * i / N, z, 0.06); arr.set([p.x, p.y, p.z], i * 3); }
      geo.attributes.position.needsUpdate = true; geo.setDrawRange(0, N + 1);
      ring.material.opacity = 1 - k * 0.8;
      const tip = surf(phi0 + sweep, z, 0.06), base = new THREE.Vector3(0, 0, z);
      rayGeo.setFromPoints([base, tip]); ray.material.opacity = k < 0.65 ? 1 : 0;
      thick.position.copy(base).lerp(tip, 0.5); thick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(base).normalize());
      thick.material.opacity = k < 0.65 ? 0.55 + 0.25 * Math.sin(k * 60) : Math.max(0, 1 - (k - 0.65) * 4) * 0.5; hit.position.copy(tip); hit.material.opacity = k < 0.65 ? 1 : 0;
      if (k < 0.65 && k - lastSpark > 0.05) { lastSpark = k; sparks(tip.clone(), 0xffa0f0, 8, 2.2, 500); }
    } });
  }
  // ตัวละครลอย (กระโดดผ่านแกน · ลิฟต์ · ถูกดูดออกนอกโคโลนี) — สไปรต์ภาพตัวละคร
  const texCache = new Map();
  const unitInfo = new Map(); // id → { img, color, el }
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
    if (!opts.shrink) trail((k) => path(ease(k)), ms, opts.color || 0xbfe6ff, 0.22, 30);
    const s = unitSprite(id); s.scale.setScalar(0.62); s.renderOrder = 10;
    hidden.set(id, performance.now() + ms + 60);
    addFx({ obj: s, t0: performance.now(), ms, tick: (k) => {
      const p = path(ease(k)); s.position.copy(p);
      if (opts.shrink) s.scale.setScalar(0.62 * (1 - k)); if (opts.spin) s.material.rotation = k * 12;
    } });
  }

  // ---------------------------------------------------------------- กล้อง
  const R = {
    cur: { phi: 0, z: 1.5, yaw: 0, pitch: TILT, dist: ZOOM_DIST[2], axis: 0, roll: 0, fov: FOV },
    user: { yaw: 0, pitch: TILT, dist: ZOOM_DIST[2], panX: 0, panZ: 0, axis: false },
    shot: null, shake: 0, punch: 0, armD: null, focus: { x: 0, y: 1 }, focusKey: "", rotBase: 0,
  };
  // แขนกล้องชนอะไรไหม: ผนังวงแหวน (3D) · ตึกสูง (สไปรต์ 2D — ไม่บังภาพแต่กล้องไม่ควรจมในตึก)
  const armHit = (P, map) => {
    const h = Rc - Math.hypot(P.x, P.y);
    if (h > 1.9) return false;
    const bx = mod(Math.floor(Math.atan2(P.y, P.x) / DPHI + 0.5), COLS), y = Math.floor(P.z);
    const hh = solidAt.get(`${bx},${y}`);
    if (hh && h < hh + 0.15) return true;
    const walls_ = (map && map.walls) || [];
    for (const r of walls_) if (Math.abs(P.z - (r + 1)) < 0.22 && h < 1.05) return true;
    return false;
  };
  function followTarget() {
    const f = R.focus;
    const phi = phiOf(f.x + 0.5 + R.user.panX), z = clamp(f.y + 0.5 + R.user.panZ, minRowNow + 0.5, ROWS - 0.5);
    const travel = Math.abs(angD(R.cur.phi, phi)) * Rc + Math.abs(z - R.cur.z);
    return {
      phi, z, yaw: R.rotBase + R.user.yaw, pitch: R.user.pitch, // ไม่ก้ม/ถอยตามระยะเดินทางแล้ว (เดิมกล้องเด้งเข้าออกทุกครั้งที่ตามตัว)
      dist: R.user.dist + (R.free ? 0 : Math.min(1.2, travel * 0.12)) - R.punch * 1.1, axis: R.user.axis ? 1 : 0, roll: 0, fov: FOV, k: 0.085,
    };
  }
  let minRowNow = 0, mapNow = null;
  // จุดบนพื้นอยู่ในกรอบปลอดภัยของจอไหม (เว้นขอบ + แถบ HUD ล่าง) — ตัดสินว่าต้องเลื่อนกล้องตามหรือไม่
  const _s = new THREE.Vector3();
  function onScreen(bx, by) {
    surf(phiOf(bx), by, 0.35, _s).applyMatrix4(camera.matrixWorldInverse);
    if (-_s.z < 0.3) return false;
    _s.applyMatrix4(camera.projectionMatrix);
    return Math.abs(_s.x) < 0.78 && _s.y > -0.5 && _s.y < 0.78;
  }
  function goTo(x, y) { R.focus = { x, y }; R.user.panX = 0; R.user.panZ = 0; }
  // (R.want = จุดที่ยังรอดูว่าต้องหมุนกล้องไปหาไหม — ดู update)
  const _n = new THREE.Vector3(), _T = new THREE.Vector3(), _F = new THREE.Vector3(), _fwd = new THREE.Vector3(), _back = new THREE.Vector3();
  const _C = new THREE.Vector3(), _L = new THREE.Vector3(), _P = new THREE.Vector3(), _up = new THREE.Vector3();
  function stepCamera(dt) {
    const t = R.shot ? { ...followTarget(), ...R.shot } : followTarget();
    const a = 1 - Math.pow(1 - (t.k || 0.085), dt * 60);
    const c = R.cur;
    c.phi = mod(c.phi + angD(c.phi, t.phi) * a, TAU);
    c.z += (t.z - c.z) * a;
    c.yaw += angD(c.yaw, t.yaw) * a;
    c.pitch += (t.pitch - c.pitch) * a;
    c.dist += (t.dist - c.dist) * a;
    c.axis += (t.axis - c.axis) * a;
    c.roll += angD(c.roll, t.roll || 0) * a;
    c.fov += ((t.fov || FOV) - c.fov) * a;
    R.shake *= Math.pow(0.86, dt * 60);
    R.punch *= Math.pow(0.88, dt * 60);
    _n.set(-Math.cos(c.phi), -Math.sin(c.phi), 0); _T.set(-Math.sin(c.phi), Math.cos(c.phi), 0);
    // จุดโฟกัสยกสูงขึ้นตอนอยู่ใกล้ผนังวงแหวน — กล้องลอยข้ามผนังแทนการทะลุ
    let dWall = 9;
    for (const r of (mapNow && mapNow.walls) || []) dWall = Math.min(dWall, Math.abs(c.z - (r + 1)));
    surf(c.phi, c.z, 0.45 + Math.max(0, 0.9 - dWall) * 1.1, _F);
    _fwd.copy(AX).multiplyScalar(Math.cos(c.yaw)).addScaledVector(_T, Math.sin(c.yaw));
    const zMin = minRowNow - 2.6; // ถอยออกนอกฝาท้าย/ม่านเหล็กได้ (ซ่อนแผ่นนั้นตอนกล้องอยู่หลัง) — ใกล้จุดเกิดยังได้มุมเอียงแบบกระดาน
    // แขนกล้องที่มุมก้ม p: ยาวได้แค่ไหนก่อนชนผิวโค้งฝั่งตรงข้าม (Rc) / ชนผนังวงแหวน-ตึก (blocked)
    const arm = (p) => {
      _back.copy(_fwd).multiplyScalar(-Math.cos(p)).addScaledVector(_n, Math.sin(p));
      for (let s = 1; s <= 24; s++) {
        _P.copy(_F).addScaledVector(_back, c.dist * s / 24);
        if (_P.z < zMin || _P.z > ROWS - 0.2) _P.z = clamp(_P.z, zMin, ROWS - 0.2); // ใกล้ฝาท้าย/โดม = กล้องเลื่อนขึ้นแทนการหดเข้า
        if (Math.hypot(_P.x, _P.y) > Rc * 0.9) return { D: Math.max(0.6, c.dist * (s - 1) / 24), blocked: false };
        if (armHit(_P, mapNow)) return { D: Math.max(0.6, c.dist * (s - 1.4) / 24), blocked: true };
      }
      return { D: c.dist, blocked: false };
    };
    // ชนผนัง/ตึก = ยกกล้องสูงขึ้น (ก้มมากขึ้น) แทนการหดเข้าไปติดหลังหัว · ค่อยๆ ปรับกันภาพกระตุก
    // เงยต่ำกว่า 0.15 = แขนกล้องหยุดที่ 0.15 แล้ว "เงยหน้า" มองขึ้นแทน (ดูเพดาน/ปลายอุโมงค์ได้ — ผู้ใช้สั่ง 2026-11-09)
    const pc = Math.max(0.15, c.pitch), lookUp = Math.max(0, 0.15 - c.pitch);
    let best = null;
    for (let k = 0; k <= 9; k++) {
      const p = Math.min(1.45, pc + k * 0.1), r = arm(p);
      if (!r.blocked) { best = { p, D: r.D }; break; }
      if (!best || r.D > best.D) best = { p, D: r.D };
    }
    R.pitchAdj = (R.pitchAdj || 0) + (best.p - pc - (R.pitchAdj || 0)) * Math.min(1, dt * 6);
    const D = arm(pc + R.pitchAdj).D;
    R.armD = R.armD == null ? D : (D < R.armD ? D : R.armD + (D - R.armD) * 0.08);
    _C.copy(_F).addScaledVector(_back, R.armD);
    _C.z = clamp(_C.z, zMin, ROWS - 0.2);
    _L.copy(_F).addScaledVector(_fwd, 1.1);
    if (lookUp > 0.001) {
      const dir = _L.clone().sub(_C), len = dir.length(); dir.normalize();
      const right = dir.clone().cross(_n).normalize();
      dir.applyAxisAngle(right, lookUp); // หมุนรอบแกนขวา (dir × ขึ้น) ทางบวก = เงยขึ้น
      _L.copy(_C).addScaledVector(dir, len);
    }
    if (c.axis > 0.001) {
      const Ca = new THREE.Vector3(0, 0, Math.max(zMin + 0.1, c.z - 2.2 - c.dist * 0.55)), La = new THREE.Vector3(0, 0, c.z + 9);
      _C.lerp(Ca, c.axis); _L.lerp(La, c.axis);
    }
    if (R.shake > 0.002) _C.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(R.shake * 0.12));
    camera.position.copy(_C);
    _up.copy(_n);
    const roll = c.roll + (R.shake > 0.002 ? (Math.random() - 0.5) * R.shake * 0.05 : 0);
    if (roll) { const f = _L.clone().sub(_C).normalize(); _up.applyAxisAngle(f, roll); }
    camera.up.copy(_up);
    camera.lookAt(_L);
    if (Math.abs(camera.fov - c.fov) > 0.01) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
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
    shotEnd = t + next.ms;
    if (next.on) next.on();
  }
  function queueShot(params, ms, on, delay = 0) {
    const last = shots.length ? shots[shots.length - 1] : null;
    const at = Math.max(now() + delay, last ? last.at + last.ms : shotEnd);
    shots.push({ params, ms, on, at });
  }
  const tileShot = (x, y, extra = {}) => ({ phi: phiOf(x + 0.5), z: y + 0.5, pitch: 0.82, dist: 7.6, axis: 0, k: 0.11, ...extra });
  let flash = 0, alarm = 0, flashRGB = "255,255,255";
  const later = (ms, fn) => setTimeout(fn, ms);

  // อีเวนต์จาก server (BoardStage ส่งต่อ): colonyScene · colonySeal · colonyBoom · colonyJump · colonyLift
  const pendingHoles = new Set();
  // เสียงเอฟเฟกต์ (audio.js colony_*) · gain = ความดังเทียบ · lastWarn = ไซเรนต้นเทิร์นที่เล่นไปแล้ว (null = ยังไม่เคยซิงก์ — เข้าเกมกลางคันไม่ดัง)
  const sfx = (name, gain) => { try { playSfx(name, gain != null ? { gain } : undefined); } catch { /* เสียงไม่พร้อม */ } };
  let lastWarn = null; // รูที่ยังไม่ถึงจังหวะชนในฉาก = ซ่อน
  function onEvent(kind, d) {
    if (!d) return;
    if (kind === "colonyScene") {
      for (const e of d.events || []) {
        if (e.type === "meteor") {
          const tgt = surf(phiOf(e.at.x + 0.5), e.at.y + 0.5, 0), from = surf(phiOf(e.at.x + 0.5 + COLS / 2), e.at.y - 1.5, 0);
          for (const [x, y] of e.cells || []) pendingHoles.add(`${x},${y}`);
          queueShot(tileShot(e.at.x, e.at.y), 2600, () => {
            later(450, () => sfx("colony_meteor_fall"));
            later(550, () => streak(from, tgt, 450));
            later(1000, () => {
              sfx("colony_meteor_hit"); sfx("colony_wind", 0.7); if ((e.sucked || []).length) sfx("colony_sucked");
              boom(tgt, 2.6); R.shake = Math.max(R.shake, 1.2); flash = Math.max(flash, 0.35);
              if (R.shot) { R.shot.fov = FOV + 14; R.shot.dist = 6.6; R.shot.k = 0.22; }
              for (const [x, y] of e.cells || []) pendingHoles.delete(`${x},${y}`);
              for (const id of e.sucked || []) suckGhost(id, e.cells && e.cells[0]);
              animMoves(e.moves);
            });
          });
        } else if (e.type === "beam") {
          if (e.hole) pendingHoles.add(`${e.hole[0][0]},${e.hole[0][1]}`);
          queueShot({ axis: 1, z: e.y - 1.5, dist: 3, k: 0.1 }, 3000, () => {
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
          const dk = `${e.at.x},${e.at.y}`, drop = { t0: 0 };
          capsuleDrops.set(dk, drop);
          const tint = { apoth: 0x8fffc0, forge: 0xffb060, cara: 0xffe070 }[e.kind] || 0xffd890;
          queueShot(tileShot(e.at.x, e.at.y, { pitch: 0.95, dist: 6.8 }), 2400, () => {
            drop.t0 = now() + 400;
            // ไอพ่นลงจากแกน: หางแสงสีตามชนิด
            const top = surf(phiOf(e.at.x + 0.5), e.at.y + 0.5, Rc * 0.95), bot = surf(phiOf(e.at.x + 0.5), e.at.y + 0.5, 0.3);
            later(400, () => trail((k) => top.clone().lerp(bot, ease(k)), 550, tint, 0.3, 30));
            later(250, () => sfx("colony_capsule_fall"));
            later(950, () => {
              sfx("colony_capsule_land"); boom(surf(phiOf(e.at.x + 0.5), e.at.y + 0.5, 0), 1.4, 600); shockwave(e.at.x + 0.5, e.at.y + 0.5, tint, 3.2, 700); sparks(bot, tint, 18, 2.5, 700);
              R.shake = Math.max(R.shake, 0.7); if (e.crushed && e.crushed.to) animMoves([{ id: e.crushed.id, from: { x: e.at.x, y: e.at.y }, path: [e.crushed.to] }]);
            });
          });
        } else if (e.type === "pull") {
          const c0 = e.hole && e.hole[0];
          if (c0) queueShot(tileShot(c0[0], c0[1]), 1400, () => { R.shake = Math.max(R.shake, 0.3); sfx("colony_wind", 0.8); if ((e.sucked || []).length) later(300, () => sfx("colony_sucked")); for (const id of e.sucked || []) suckGhost(id, c0); animMoves(e.moves); });
        } else if (e.type === "drift") {
          queueShot({ axis: 0.55, dist: 8.4, k: 0.06, roll: 0.08 }, 1600, () => { R.shake = Math.max(R.shake, 0.3); sfx("colony_drift"); animMoves((e.moves || []).map((m) => ({ id: m.id, from: m.from, path: [m.to], ms: 700 }))); if (R.shot) R.shot.phi = R.cur.phi + DPHI; });
        } else if (e.type === "tram") {
          // รถรางวิ่งตามรางจากปลายปล้องที่เปิดไปถึงโดม (3 ตู้ · ไฟหน้า · ประกายล้อ) — ชนคนบนราง
          queueShot(tileShot(e.x, clamp(R.cur.z - 0.5, minRowNow + 1, ROWS - 4), { pitch: 0.7, dist: 9, k: 0.1 }), 2600, () => {
            sfx("colony_beam_charge", 0.6);
            later(300, () => { tramRun(e.x, 1700); sfx("colony_drift"); });
            later(900, () => { R.shake = Math.max(R.shake, 0.9); for (const id of e.hit || []) { const u = unitInfo.get(id); if (u) sparks(surf(phiOf(e.x + 0.5), u.y + 0.5, 0.3), 0xffd070, 16, 3, 600); } animMoves(e.moves); });
          });
        } else if (e.type === "gravity") {
          // แรงโน้มถ่วงดับ: ฝุ่น/เศษของลอยขึ้นทั้งโคโลนี + กล้องลอยเอียง
          queueShot({ dist: R.user.dist + 2, k: 0.05, roll: 0.06 }, 2000, () => { sfx("colony_wind", 0.6); gravityT0 = now(); R.shake = Math.max(R.shake, 0.4); });
        } else if (e.type === "blackout") {
          // ไฟดับทั้งปล้อง: ไฟกะพริบแล้วดับ
          queueShot({ z: e.sec * SEC + 5, pitch: 0.95, dist: 10, k: 0.08 }, 2000, () => { sfx("colony_alarm_seal", 0.5); flickerT0 = now(); });
        }
      }
    } else if (kind === "colonySeal") {
      alarm = 1;
      const z = d.section * SEC;
      sealAnim = { z, t0: 0 };
      queueShot({ phi: R.cur.phi, z: z + 1.4, yaw: R.rotBase + R.user.yaw + Math.PI, pitch: 0.58, dist: 8.4, axis: 0, k: 0.08 }, 3200, () => {
        sealAnim.t0 = now() + 600;
        sfx("colony_alarm_seal");
        later(600, () => sfx("colony_door_slide"));
        later(2400, () => { sfx("colony_door_close"); R.shake = Math.max(R.shake, 1.5); flash = Math.max(flash, 0.4); if (R.shot) { R.shot.fov = FOV + 12; R.shot.k = 0.25; } });
      });
    } else if (kind === "colonyBoom") {
      alarm = 1;
      boomFinale();
    } else if (kind === "colonyJump") {
      const from = d.from, to = d.to, ms = 1000;
      const a = surf(phiOf(from.x + 0.5), from.y + 0.5, 0.35), b = surf(phiOf(to.x + 0.5), to.y + 0.5, 0.35);
      flyUnit(d.id, (k) => a.clone().lerp(b, k), ms);
      if (R.focusId === d.id) {
        const phi0 = R.cur.phi, dir = Math.random() < 0.5 ? 1 : -1, t0 = now();
        R.shot = { phi: phi0, z: from.y + 0.5, axis: 0.85, dist: Math.max(4, R.user.dist), k: 0.3 };
        shotEnd = t0 + ms + 250;
        jumpCam = { t0, ms, phi0, dir, z0: from.y + 0.5, z1: to.y + 0.5 };
      }
      // ลงแล้ว: โฟกัสอยู่จุดลงทันที (BoardStage ส่ง focus ใหม่ตามมาอีกที) — กล้องไม่ย้อนกลับไปจุดกระโดด
      sfx("colony_jump");
      later(ms, () => { sfx("colony_stomp"); R.shake = Math.max(R.shake, 0.35); if (R.focusId === d.id) { goTo(to.x, to.y); R.focusKey = `${to.x},${to.y}`; } });
    } else if (kind === "colonyBelt") {
      // สายพาน: เลื่อนตามเส้นทาง + ประกายฟ้าใต้เท้า
      animMoves([{ id: d.id, from: d.from, path: d.path || [], ms: 180 * ((d.path || []).length || 1) }]);
      for (const c of d.path || []) later(180 * (d.path.indexOf(c) + 1), () => sparks(surf(phiOf(c.x + 0.5), c.y + 0.5, 0.05), 0x9fe8ff, 5, 1.2, 400));
    } else if (kind === "colonyWarp") {
      // วาร์ป: แสงม่วงพุ่งขึ้นจากแท่นต้นทาง → โผล่แท่นปลายทาง + คลื่นกระแทกทั้งสองฝั่ง
      const a = surf(phiOf(d.from.x + 0.5), d.from.y + 0.5, 0.35), b = surf(phiOf(d.to.x + 0.5), d.to.y + 0.5, 0.35);
      shockwave(d.from.x + 0.5, d.from.y + 0.5, 0xb48cff, 2.6, 600); sparks(a, 0xc8a8ff, 16, 2, 600);
      flyUnit(d.id, (k) => a.clone().lerp(b, k).addScaledVector(new THREE.Vector3(0, 0, 0), 0), 800, { color: 0xc8a8ff });
      later(800, () => { shockwave(d.to.x + 0.5, d.to.y + 0.5, 0xb48cff, 2.6, 600); sparks(b, 0xc8a8ff, 16, 2, 600); flash = Math.max(flash, 0.15); flashRGB = "200,170,255"; });
      sfx("colony_lift");
    } else if (kind === "colonyTurret") {
      // ป้อมปืนยิงตอนจบเทิร์น: แสงปากกระบอก + กระสุนแสงแดงตามแนว + ประกายที่จุดโดน
      for (const sh of d.shots || []) {
        const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[sh.face] || [0, 1];
        const from = surf(phiOf(sh.x + 0.5 + v[0] * 0.3), sh.y + 0.5 + v[1] * 0.3, 0.55), to = surf(phiOf(sh.x + 0.5 + wd(sh.x, sh.end.x)), sh.end.y + 0.5, 0.45);
        streak(from, to, 220, 0xff4a3a);
        sparks(from, 0xffb070, 6, 1.5, 300);
        if (sh.hit) later(220, () => { sparks(to, 0xff6a50, 14, 2.4, 500); });
      }
      sfx("colony_meteor_hit", 0.35);
    } else if (kind === "colonyTurretHit") {
      const pos = surf(phiOf(d.x + 0.5), d.y + 0.5, 0.5);
      models.hitTurret(d.x, d.y, now());
      sparks(pos, 0xffd890, d.hp > 0 ? 10 : 30, d.hp > 0 ? 2 : 3.5, 600);
      if (d.hp <= 0) { boom(pos, 1.8, 700); shockwave(d.x + 0.5, d.y + 0.5, 0xff9a50, 2.4, 600); R.shake = Math.max(R.shake, 0.6); }
    } else if (kind === "colonyLift") {
      const from = d.from, to = d.to;
      sfx("colony_lift");
      flyUnit(d.id, (k) => surf(phiOf(lerp(from.x, from.x + wd(from.x, to.x), k) + 0.5), lerp(from.y, to.y, k) + 0.5, 0.3 + Math.sin(k * Math.PI) * Rc * 0.7), 900);
    }
  }
  let sealAnim = null, jumpCam = null, gravityT0 = 0, flickerT0 = 0;
  // รถราง 3 ตู้ (กล่อง + หน้าต่างเรือง + ไฟหน้า) วิ่งตามคอลัมน์ x จากปล้องที่เปิดถึงโดม
  const tramTex = canvasTex(128, 64, (g, Wd, H) => {
    g.fillStyle = "#e8eef5"; g.fillRect(0, 0, Wd, H);
    g.fillStyle = "#2f6fb5"; g.fillRect(0, H * 0.62, Wd, H * 0.14);
    for (let i = 0; i < 4; i++) { g.fillStyle = "#8fd0ff"; g.fillRect(8 + i * 30, H * 0.16, 22, H * 0.34); }
  });
  const tramMat = new THREE.MeshLambertMaterial({ map: tramTex }), tramGeo = new THREE.BoxGeometry(0.62, 0.55, 1.7);
  function tramRun(x, ms) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) { const car = new THREE.Mesh(tramGeo, tramMat); car.position.z = -i * 1.85; g.add(car); }
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: meteorTex, color: 0xfff2c0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    head.scale.setScalar(1.6); head.position.z = 0.9; g.add(head);
    const z0 = minRowNow - 6, z1 = ROWS + 6, phi = phiOf(x + 0.5);
    addFx({ obj: g, t0: performance.now(), ms, tick: (k) => {
      const z = lerp(z0, z1, k);
      g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tan(phi), nrm(phi), AX));
      surf(phi, z, 0.3, g.position);
      if (Math.random() < 0.5) sparks(surf(phi, z - 0.6, 0.02), 0xffe0a0, 3, 1.2, 300);
    } });
  }
  // ---- ระเบิดตัวเองตอนจบ (~6 วิ · server พักเกม HOLD_SECONDS.boom):
  //  0–1.4 วิ ไฟลุกเป็นทอดจากปลายโดมไล่มาหากล้อง (มุมตามแกน) · 1.4–3.6 วิ ทั่วทั้งกระบอก + ควัน + กระจกแตก + กล้องหมุนเอียง/FOV ถ่าง
  //  กำแพงไฟวิ่งจากโดมเข้าหากล้อง (สไปรต์ 2D หลังกำแพงไฟถูกเผาหาย — burnFrom) · ชนกล้อง = แฟลชส้ม → ขาวค้าง
  let finale = null;
  function boomFinale() {
    const z0 = clamp(R.cur.z, minRowNow + 1.5, ROWS - 6), t0 = now();
    finale = { t0, z0, front: null, lastScorch: 0 };
    sfx("colony_alarm_count"); sfx("colony_boom_chain");
    later(1300, () => { sfx("colony_boom_chain"); sfx("colony_glass"); });
    later(3000, () => sfx("colony_boom_final"));
    R.shot = null; shots.length = 0;
    queueShot({ axis: 1, z: z0, dist: 3.4, k: 0.08, roll: 0 }, 1400, null);
    queueShot({ axis: 1, z: z0, dist: 3, k: 0.05, roll: 0.55, fov: FOV + 18 }, 2200, null);
    queueShot({ axis: 1, z: z0, dist: 2.6, k: 0.04, roll: 1.1, fov: FOV + 30 }, 3000, null);
    // ระลอกแรก: ไล่จากโดม (z = ROWS) ลงมาหากล้อง
    for (let i = 0; i < 18; i++) later(i * 75, () => {
      const z = ROWS - 0.5 - (ROWS - 0.5 - z0 - 3) * (i / 17);
      for (let j = 0; j < 2; j++) fireball(surf(Math.random() * TAU, z + (Math.random() - 0.5) * 2, 0.1), 2.4 + Math.random() * 1.6, 1100);
      R.shake = Math.max(R.shake, 0.3 + i * 0.05);
    });
    // ระลอกสอง: ทั่วกระบอก + ใกล้กล้อง · กระจกแตก
    for (let i = 0; i < 34; i++) later(1300 + i * 60, () => {
      const near = Math.random() < 0.45, z = near ? z0 + 1 + Math.random() * 6 : z0 + Math.random() * (ROWS - z0);
      fireball(surf(Math.random() * TAU, z, 0.1), (near ? 3 : 2.2) + Math.random() * 2.4, 1300);
      R.shake = Math.max(R.shake, 1.1 + Math.random() * 0.6);
      if (i % 6 === 0) shards(surf(phiOf(((mapNow && mapNow.glass) || [1])[i % 3 | 0] + 0.5), z, 0));
    });
    // กำแพงไฟ: จากโดมพุ่งเข้าหากล้อง
    later(1500, () => { finale.front = { t0: now(), ms: 2100, z1: z0 - 2.2 }; frontMesh.visible = true; });
  }
  const smokeTex = glowTex("rgba(40,32,30,.9)", "rgba(60,50,46,.45)");
  const frontTex = glowTex("rgba(255,255,235,1)", "rgba(255,150,50,.85)");
  const frontMesh = new THREE.Mesh(new THREE.CircleGeometry(Rc * 1.15, 48), new THREE.MeshBasicMaterial({ map: frontTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  frontMesh.visible = false; scene.add(frontMesh);
  function fireball(pos, size, ms) {
    size = Math.min(size, pos.distanceTo(camera.position) * 0.75); // ใกล้กล้อง = ไม่ใหญ่จนขาวทั้งจอ
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: boomTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(pos);
    const up = pos.clone().setZ(0).normalize().multiplyScalar(-1);
    addFx({ obj: s, t0: performance.now(), ms, tick: (k) => { s.scale.setScalar(0.4 + size * ease(Math.min(1, k * 2.2))); s.material.opacity = 0.9 * (k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65); s.position.copy(pos).addScaledVector(up, k * 0.6); } });
    if (!lowQ) {
      const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false }));
      sm.position.copy(pos); sm.material.opacity = 0; sm.scale.setScalar(0.01); // ยังไม่ถึงเวลา (t0 อนาคต) = ซ่อน
      addFx({ obj: sm, t0: performance.now() + ms * 0.25, ms: ms * 2.2, tick: (k) => { sm.scale.setScalar(size * (0.7 + k * 1.1)); sm.material.opacity = 0.75 * (1 - k); sm.position.copy(pos).addScaledVector(up, 0.4 + k * 1.4); } });
    }
    if (Math.random() < 0.5) boom(pos, 0.01, 10); // เศษซาก (ใช้ของเดิม)
    scorch(pos);
  }
  // กระจกแตก: ประกายฟ้าขาวพุ่งออก
  function shards(pos) {
    const n = lowQ ? 10 : 26, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8f0ff, size: 0.08, transparent: true, depthWrite: false }));
    const vs = Array.from({ length: n }, () => new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4));
    addFx({ obj: pts, t0: performance.now(), ms: 1200, tick: (k) => { vs.forEach((v, i) => { const p = pos.clone().addScaledVector(v, k); arr.set([p.x, p.y, p.z], i * 3); }); geo.attributes.position.needsUpdate = true; pts.material.opacity = 1 - k; } });
  }
  // รอยไหม้บนพื้น (วาดลงชั้นเตือน — ระหว่างระเบิดชั้นนี้ทึบเต็ม)
  function scorch(pos) {
    const g = ovCv.getContext("2d"), W = ovCv.width, H = ovCv.height;
    const u = mod(Math.atan2(pos.y, pos.x) / DPHI + 0.5, COLS) / COLS, v = clamp(pos.z / ROWS, 0, 1);
    const x = u * W, y = (1 - v) * H, r = W / COLS * (0.6 + Math.random() * 0.9);
    for (const dx of [0, -W, W]) {
      const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      gr.addColorStop(0, "rgba(10,6,6,.95)"); gr.addColorStop(0.55, "rgba(30,14,10,.8)"); gr.addColorStop(0.8, "rgba(255,120,40,.55)"); gr.addColorStop(1, "rgba(255,120,40,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y, r, 0, TAU); g.fill();
    }
    ovTex.needsUpdate = true;
  }
  // ฉากดูด/เลื่อน: ชั้น 2D ขยับหมากตามนี้ (pose) — server ส่งตำแหน่งปลายทางมาแล้วใน state
  const poses = new Map(); // id → { from, path, t0, ms }
  function animMoves(moves) {
    for (const m of moves || []) {
      if (!m || !m.path || !m.path.length) continue;
      poses.set(m.id, { pts: [m.from, ...m.path], t0: now(), ms: m.ms || 260 * m.path.length });
    }
  }
  function suckGhost(id, cell) {
    if (!cell || !unitInfo.get(id)) return;
    const u = unitInfo.get(id);
    const a = surf(phiOf((u.x ?? cell[0]) + 0.5), (u.y ?? cell[1]) + 0.5, 0.35), b = surf(phiOf(cell[0] + 0.5), cell[1] + 0.5, -0.6);
    flyUnit(id, (k) => a.clone().lerp(b, k), 700, { shrink: true, spin: true });
  }

  // ---------------------------------------------------------------- สถานะจาก props
  let lastColonySig = "", night = false, sealedNow = 0, w = 1, h = 1;
  const patched = new Set();
  function sync(map, colony, isNight) {
    mapNow = map;
    night = !!isNight;
    const tSig = JSON.stringify(map.terrain) + (night ? "n" : "d");
    if (tSig !== terrainSig) { terrainSig = tSig; buildProps(map, night); }
    if (!walls.children.length) { buildWalls(map); buildLifts(map); }
    const c = colony || {};
    const warnKey = c.countdown != null ? `b${c.countdown}` : c.sealIn === 1 ? `s${c.sealed | 0}` : "";
    if (warnKey !== lastWarn) {
      if (lastWarn !== null && warnKey) sfx(c.countdown != null ? "colony_alarm_count" : "colony_alarm_seal");
      lastWarn = warnKey;
    }
    sealedNow = c.sealed | 0;
    minRowNow = Math.max(0, (map.minRow | 0));
    const holes = (c.holes || []).filter((hh) => hh.cells.some(([x, y]) => !pendingHoles.has(`${x},${y}`)));
    patched.clear(); for (const k of c.patched || []) patched.add(k);
    const sig = `${night}|${sealedNow}|${JSON.stringify(holes)}|${(c.patched || []).join(";")}`;
    if (sig !== lastColonySig || night !== lastNight) {
      lastColonySig = sig; lastNight = night;
      paintFloor(floorCv.getContext("2d"), floorCv.width, floorCv.height, { map, night, sealed: sealedNow, patched, glass: map.glass || [], holes });
      floorTex.needsUpdate = true;
    }
    const oSig = JSON.stringify([c.tele, c.holes, c.sealIn, c.sealed, c.turrets, c.blackout]);
    if (oSig !== holeSig && !finale) {
      holeSig = oSig;
      paintOverlay(ovCv.getContext("2d"), ovCv.width, ovCv.height, { colony: { ...c, holes } });
      ovTex.needsUpdate = true;
      buildHoles(holes);
    }
    // ประตู: ป้ายนับถอยหลังเหนือประตูของวงแหวนที่จะปิด (เหลือ ≤ 3) · เหลือ 1 = แดง + ไฟกะพริบ
    const nextRow = (sealedNow + 1) * SEC - 1;
    for (const s of doorSigns) {
      const n = s.row === nextRow && c.sealIn != null && c.sealIn <= 3 ? c.sealIn : null;
      if (n !== s.n) { s.n = n; s.sprite.visible = n != null; if (n != null) { s.sprite.material.map?.dispose?.(); s.sprite.material.map = signTex(n, n <= 1); s.sprite.material.needsUpdate = true; } }
    }
    for (const seg of walls.children) seg.visible = seg.userData.row >= sealedNow * SEC;
    capBottom.visible = sealedNow === 0;
    if (!sealAnim || !sealAnim.t0 || now() > sealAnim.t0 + 1800) setIrisIfNeeded(sealedNow > 0 ? sealedNow * SEC : null);
    alarm = Math.max(alarm * 0.98, c.countdown != null ? 0.35 : 0);
    capsulesNow = Array.isArray(c.capsules) ? c.capsules : c.capsule ? [{ kind: "apoth", ...c.capsule }] : [];
    models.setTurrets(c.turrets);
    // ไฟห้องกลางวัน/กลางคืน
    hemi.intensity = night ? 0.45 : 1.25; amb.intensity = night ? 0.18 : 0.35; sun.intensity = night ? 0.15 : 0.9;
    domeMat.opacity = night ? 0.1 : 0.18;
    scene.fog.color.set(night ? 0x0b1830 : 0xdde9f4);
    // แกนแสง/เมฆตามเวลา: กลางวันขาวอุ่นสว่าง · กลางคืนฟ้าจาง
    sunLineMat.uniforms.uColor.value.set(night ? 0x8fb4ff : 0xfff1d0); sunLineMat.uniforms.uPow.value = night ? 0.3 : 0.6;
    sunCoreMat.uniforms.uColor.value.set(night ? 0x9fc0ff : 0xfffbea);
    for (const n of sunNodes) n.material.opacity = night ? 0.35 : 1;
    cloudMat.opacity = night ? 0.12 : 0.6; cloudMat.color.set(night ? 0x9fb6d8 : 0xffffff);
  }
  let irisZ = undefined;
  function setIrisIfNeeded(z) { if (z !== irisZ) { irisZ = z; setIris(z, 0); } }

  // ---------------------------------------------------------------- เฟรม
  function update(t, dt, p) {
    const { map, colony, units, focus, rotation = 0, zoom = 2, view = "tilt", size, base, cinema } = p;
    if (!map) return;
    sync(map, colony, p.night);
    for (const u of units || []) {
      if (!u || !Number.isFinite(u.x)) continue;
      unitInfo.set(u.id, { img: u.img, color: u.color, x: u.x, y: u.y });
      if (u.isMe && u.alive !== false) {
        // หมากเราขยับ = เลิกโหมดกล้องอิสระ (กลับมาตามตัวเมื่อหลุดจอ)
        if (R.me && (R.me.x !== u.x || R.me.y !== u.y)) R.free = false;
        R.focusId = u.id; R.me = { x: u.x, y: u.y };
      }
    }
    // ปุ่มกระดานเดิม → กล้อง: Q/E (rotation) = หมุน 90° · ซูม 5 ระดับ = ระยะ · มุมบน = ก้มสุด · โฟกัส = ตัวที่กำลังเดิน
    if (R.rotInit == null) R.rotInit = rotation; // ค่าหมุนที่จำไว้จากกระดานปกติไม่ใช้ — เริ่มมองขึ้นตามแกนเสมอ
    R.rotBase = (rotation - R.rotInit) * Math.PI / 2;
    const zoomDist = ZOOM_DIST[clamp(zoom | 0, 0, 4)];
    if (R.zoomRef !== zoom) { R.zoomRef = zoom; R.user.dist = zoomDist; }
    if (R.viewRef !== view) { R.viewRef = view; R.user.pitch = view === "top" ? 1.2 : TILT; }
    // โฟกัสเปลี่ยน (เริ่มตาใคร/เดิน/โดนตี ...) = เลื่อนกล้องไปหาเฉพาะตอนจุดนั้นอยู่นอกจอ — ไม่หมุนทั้งอุโมงค์ทุกครั้งที่เปลี่ยนตา
    //  (ผู้ใช้บ่น 2026-11-09 "มุมกล้องหมุนตลอดจนเวียนหัว") · ครั้งแรก = ไปหาเสมอ
    if (focus && Number.isFinite(focus.x)) {
      const fk = `${focus.x},${focus.y}`;
      if (fk !== R.focusKey) {
        const first = !R.focusKey;
        R.focusKey = fk;
        // กล้องอิสระ (ผู้เล่นลาก/เลื่อน/ซูมเอง) = ไม่ดึงกลับไปหาหมาก จนกด Space/ปุ่มเป้า หรือหมากเราขยับ (ผู้ใช้บ่น 2026-11-09)
        if (first) goTo(focus.x, focus.y);
        else if (R.free) { /* อยู่ที่ผู้เล่นเลือกดู */ }
        else if (!onScreen(focus.x + 0.5, focus.y + 0.5)) {
          // ขั้นแรก: เลื่อนตามแนวแกน (z) อย่างเดียว — ภาพไม่หมุน · ยังไม่เห็นหลังกล้องนิ่ง = ค่อยหมุนรอบกระบอกไปหา
          const cx = mod(R.focus.x + R.user.panX, COLS);
          R.want = { x: focus.x, y: focus.y, t: t + 650 };
          goTo(cx, focus.y);
        } else R.want = null;
      }
    }
    if (R.want && t > R.want.t && !R.shot && !R.free) {
      if (!onScreen(R.want.x + 0.5, R.want.y + 0.5)) goTo(R.want.x, R.want.y);
      R.want = null;
    }
    if (cinema && cinema.a && cinema.b && !R.shot) { R.punch = Math.max(R.punch, 0.6); }
    if (size && (size.w !== w || size.h !== h)) { w = size.w; h = size.h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    R.base = base;
    runShots(t);
    if (jumpCam && R.shot) {
      const k = clamp((t - jumpCam.t0) / jumpCam.ms, 0, 1), e = ease(k);
      R.shot.phi = jumpCam.phi0 + jumpCam.dir * Math.PI * e; R.shot.z = lerp(jumpCam.z0, jumpCam.z1, e);
      if (k >= 1) jumpCam = null;
    }
    stepCamera(dt / 1000);
    camera.updateMatrixWorld();
    models.setCapsules(capsuleList(t));
    models.clip(sealedNow * SEC, finale && finale.front && finale.front.z != null ? finale.front.z : null);
    models.update(t, { camera, units });
    capBottom.visible = sealedNow === 0 && camera.position.z > 0.05;
    if (iris) iris.visible = camera.position.z > iris.position.z + 0.05;
    // ---- ภาพเคลื่อนไหว
    const time = t / 1000;
    if (!finale) ovMat.opacity = 0.65 + 0.35 * Math.sin(time * 6);
    for (const l of wallLights) {
      const warn = l.row === (sealedNow + 1) * SEC - 1 && colony && colony.sealIn != null && colony.sealIn <= 1;
      const on = 0.55 + 0.45 * Math.sin(time * 3 + l.i * 0.8);
      l.mat.color.setHex(warn ? 0xff7a32 : l.base).multiplyScalar(warn ? 0.5 + 0.5 * Math.sin(time * 9) : on);
    }
    for (const dg of doorGlows) {
      const warn = dg.row === (sealedNow + 1) * SEC - 1 && colony && colony.sealIn != null && colony.sealIn <= 1;
      dg.mat.color.setHex(warn ? 0xff8c3c : 0x5ad8ff); dg.mat.opacity = warn ? 0.45 + 0.4 * Math.sin(time * 8) : 0.3;
      const closing = sealAnim && sealAnim.t0 && dg.row === sealAnim.z - 1 ? clamp((t - sealAnim.t0) / 500, 0, 1) : 0;
      dg.shutter.visible = closing > 0; dg.shutter.scale.y = Math.max(0.001, ease(closing));
    }
    for (const d of liftDots) { const k = (time / 0.9 + d.a.z * 0.13) % 1; d.dot.position.copy(d.a).lerp(d.b, k * 0.95); }
    earth.rotation.y = time * 0.02;
    sunLineMat.uniforms.uTime.value = time;
    // แรงโน้มถ่วงดับ (ทั้งเทิร์น): ฝุ่นลอยขึ้นเรื่อยๆ ทั่วโคโลนี
    const grav = !!(colony && colony.gravity) || (gravityT0 && t - gravityT0 < 2000);
    if (grav && !lowQ && Math.random() < 0.35) { const ph = Math.random() * TAU, z = R.cur.z + (Math.random() - 0.2) * 14; sparks(surf(ph, z, 0.05), 0xe8f0ff, 2, 0.8, 1600); }
    // ไฟดับ: ช่วงเริ่ม (ฉาก) แสงกะพริบก่อนมืด
    if (flickerT0 && t - flickerT0 < 1600) hemi.intensity = (night ? 0.45 : 1.25) * (Math.random() < 0.35 ? 0.3 : 1);
    else if (flickerT0) { flickerT0 = 0; hemi.intensity = night ? 0.45 : 1.25; }
    for (const c of clouds) {
      const z = mod(c.z + time * c.v, ROWS + 8) - 4, ph = c.phi + time * 0.01;
      c.sp.position.set(Math.cos(ph) * c.r, Math.sin(ph) * c.r, z);
    }
    for (let i = 0; i < vortices.length; i++) vortices[i].rotateZ(dt / 1000 * (1.6 + (i % 3) * 0.3));
    warpBeamMat.opacity = 0.28 + 0.14 * Math.sin(time * 2.4);
    for (const [dk, d] of capsuleDrops) if (d.t0 && t > d.t0 + 600) capsuleDrops.delete(dk);
    // ม่านเหล็กหมุนปิด
    if (sealAnim && sealAnim.t0) {
      const k = clamp((t - sealAnim.t0 - 500) / 1300, 0, 1);
      if (k > 0) { setIris(sealAnim.z, 1 - ease(k)); irisZ = undefined; R.shake = Math.max(R.shake, 0.25 + k * 0.5); }
      if (t > sealAnim.t0 + 1800) { sealAnim = null; }
    }
    // อนุภาคดูดเข้ารู
    const holes = (colony && colony.holes) || [];
    if (holes.length) {
      parts.visible = true;
      partState.forEach((ps, i) => {
        ps.t += dt / 1000 * (0.9 + (i % 5) * 0.12);
        if (ps.t >= 1) { ps.t = 0; ps.hole = Math.floor(Math.random() * holes.length); ps.ang = Math.random() * TAU; ps.r = 0.8 + Math.random() * (holes[ps.hole] ? holes[ps.hole].radius : 3); }
        const hh = holes[ps.hole % holes.length]; const [cx, cy] = hh.cells[0];
        const r = ps.r * (1 - ps.t), bx = cx + 0.5 + Math.cos(ps.ang) * r, by = cy + 0.5 + Math.sin(ps.ang) * r;
        const pnt = surf(phiOf(bx), by, 0.1 + 0.3 * (1 - ps.t));
        partPos.set([pnt.x, pnt.y, pnt.z], i * 3);
      });
      partGeo.attributes.position.needsUpdate = true;
    } else parts.visible = false;
    // ระเบิดตอนจบ: กำแพงไฟวิ่ง · ไฟห้องกะพริบ · ชั้นรอยไหม้ทึบ · แฟลชส้ม → ขาว
    if (finale) {
      const ft = t - finale.t0;
      ovMat.opacity = 1;
      if (ft > 1200) { hemi.intensity = 0.4 + Math.random() * 1.4; sun.intensity = Math.random() * 1.2; }
      const fr = finale.front;
      if (fr) {
        const k = clamp((t - fr.t0) / fr.ms, 0, 1), e = k * k;
        const z = lerp(ROWS, fr.z1, e);
        frontMesh.position.set(0, 0, z); frontMesh.scale.setScalar(0.9 + Math.sin(t / 40) * 0.05);
        frontMesh.material.opacity = 0.85;
        fr.z = z;
        if (k > 0.55) { flashRGB = "255,170,90"; flash = Math.max(flash, (k - 0.55) / 0.45); }
        if (k >= 1) { flashRGB = "255,248,236"; flash = 1; }
      }
      if (ft > 3700) { flashRGB = "255,255,255"; flash = 1; }
      // เกมจบ = กระดานถูกถอดก่อนถึงตรงนี้ · ถ้ายังอยู่ (เล่นซ้ำใน dev) คืนฉากปกติ
      if (ft > 9000) { finale = null; frontMesh.visible = false; holeSig = ""; flash = 0; flashRGB = "255,255,255"; alarm = 0; }
    }
    // ไฟเตือน: แสงแดงทั้งโคโลนี
    const al = alarm * (0.5 + 0.5 * Math.sin(time * 4));
    hemi.color.setRGB(1, 1 - al * 0.55, 1 - al * 0.55);
    // เอฟเฟกต์
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i], k = (t - f.t0) / f.ms;
      if (k >= 1) { if (f.obj) { fxGroup.remove(f.obj); f.obj.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); } fxList.splice(i, 1); continue; }
      if (k >= 0) { f.tick(k); if (f.obj) f.obj.visible = true; }
    }
    for (const [id, until] of hidden) if (t > until) hidden.delete(id);
    for (const [id, ps] of poses) if (t > ps.t0 + ps.ms + 50) poses.delete(id);
    if (!(finale && t - finale.t0 > 3400)) flash *= Math.pow(0.9, dt / 16.7); // ระเบิดจบแล้วขาวค้างจนขึ้นหน้าสรุป
    renderer.render(scene, camera);
  }

  // แคปซูลเสบียงที่ต้องโชว์ตอนนี้ [{ kind, x, y, z }] (z = ความสูงระหว่างตก) — ยังไม่ถึงจังหวะตกในฉาก = ไม่อยู่ในรายการ
  function capsuleList(t) {
    const out = [];
    for (const c of capsulesNow) {
      const d = capsuleDrops.get(`${c.x},${c.y}`);
      if (d && (!d.t0 || t < d.t0)) continue;
      const k = d ? clamp((t - d.t0) / 550, 0, 1) : 1;
      out.push({ kind: c.kind, x: c.x, y: c.y, z: (1 - ease(k)) * Rc * 0.95 });
    }
    return out;
  }

  // ---------------------------------------------------------------- ตัวฉายภาพให้ชั้น 2D (boardGeo.setCustomProjection)
  const _v = new THREE.Vector3(), _ev = new THREE.Vector3();
  function project(x, y, z = 0) {
    surf(phiOf(x), y, z, _v);
    _v.applyMatrix4(camera.matrixWorldInverse);
    const depth = -_v.z;
    if (depth < 0.05) return [NaN, NaN, 0];
    _v.applyMatrix4(camera.projectionMatrix);
    const b = R.base || { k: 1, ox: 0, oy: 0 };
    const cssX = (_v.x + 1) / 2 * w, cssY = (1 - _v.y) / 2 * h;
    const focalL = (h / 2) / Math.tan(camera.fov * Math.PI / 360) / (b.k || 1);
    return [(cssX - b.ox) / b.k, (cssY - b.oy) / b.k, focalL / depth];
  }
  function depth(x, y) {
    surf(phiOf(x), y, 0, _v).applyMatrix4(camera.matrixWorldInverse);
    return _v.z; // ใกล้กล้อง = ค่ามากกว่า (−ระยะ)
  }
  const ray = new THREE.Raycaster();
  function unproject(lx, ly) {
    const b = R.base || { k: 1, ox: 0, oy: 0 };
    const cssX = b.ox + lx * b.k, cssY = b.oy + ly * b.k;
    ray.setFromCamera(new THREE.Vector2(cssX / w * 2 - 1, -(cssY / h * 2 - 1)), camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const A = d.x * d.x + d.y * d.y, B = 2 * (o.x * d.x + o.y * d.y), C = o.x * o.x + o.y * o.y - Rc * Rc;
    if (A < 1e-8) return null;
    const disc = B * B - 4 * A * C; if (disc < 0) return null;
    const tt = (-B + Math.sqrt(disc)) / (2 * A); if (tt <= 0) return null;
    const P = o.clone().addScaledVector(d, tt);
    if (P.z < 0 || P.z >= ROWS) return null;
    return { x: mod(Math.atan2(P.y, P.x) / DPHI + 0.5, COLS), y: P.z };
  }

  // ---------------------------------------------------------------- input
  return {
    update, project, depth, unproject, onEvent,
    pose(id, t) {
      const ps = poses.get(id);
      if (!ps) return null;
      const k = clamp((t - ps.t0) / ps.ms, 0, 1) * (ps.pts.length - 1), i = Math.min(ps.pts.length - 2, Math.floor(k)), f = k - i;
      const a = ps.pts[i], b = ps.pts[i + 1];
      return { x: mod(a.x + wd(a.x, b.x) * f, COLS), y: lerp(a.y, b.y, f) };
    },
    hidden(id, t) { const u = hidden.get(id); return !!u && t < u; },
    // แคปซูลเสบียงที่วาดตอนนี้ { x, y, z } (z = ความสูงระหว่างตก) · null = ไม่มี/ยังไม่ถึงจังหวะตกในฉาก
    // ม่านเหล็กปิด (เกือบสนิท) อยู่ระหว่างกล้องกับปล้องที่ปิด → แถว < ค่านี้ถูกบัง (ชั้น 2D ไม่วาดสไปรต์/เอฟเฟกต์) · null = ไม่บัง
    occludeBelow() { return iris && iris.visible && irisOpen < 0.3 ? iris.position.z : null; },
    // แคปซูลเสบียงทุกลูกที่วาดตอนนี้ [{ kind, x, y, z }] (z = ความสูงระหว่างตก) — ยังไม่ถึงจังหวะตกในฉาก = ไม่อยู่ในรายการ
    capsuleAt(t) { return capsuleList(t); },
    flash() { return flash; },
    flashColor() { return flashRGB; },
    // ระเบิดตอนจบ: แถว > ค่านี้ถูกกำแพงไฟกลืนแล้ว (ชั้น 2D ไม่วาดสไปรต์) · null = ไม่มี
    burnFrom() { return finale && finale.front && finale.front.z != null ? finale.front.z : null; },
    // หมุนรอบจุดโฟกัสได้รอบตัว (yaw ไม่จำกัด) + ก้มเงยเกือบขนานพื้นถึงมองลงตรง
    orbit(dx, dy) { R.free = true; R.user.yaw -= dx * 0.005; R.user.pitch = clamp(R.user.pitch + dy * 0.004, -0.95, 1.5); },
    // เลื่อนกล้องแบบลากพื้น (dx, dy = พิกเซลจอที่ลาก): จุดบนพื้นใต้เมาส์ไปตามมือ — คิดจากทิศแกนกระดานบนจอจริง ณ จุดโฟกัส
    //  (กล้องหมุน/ก้มเงย/อยู่บนผนังด้านไหนก็ได้ ทิศบนจอตรงเสมอ)
    pan(dx, dy) {
      R.free = true;
      const k = (R.base && R.base.k) || 1, bx = R.focus.x + 0.5 + R.user.panX, by = R.focus.y + 0.5 + R.user.panZ;
      const p0 = project(bx, by, 0), px = project(bx + 0.5, by, 0), py = project(bx, by + 0.5, 0);
      let ux, uz;
      const ax = (px[0] - p0[0]) * 2, ay = (px[1] - p0[1]) * 2, bxv = (py[0] - p0[0]) * 2, byv = (py[1] - p0[1]) * 2, det = ax * byv - bxv * ay;
      if ([p0[0], px[0], py[0]].every(Number.isFinite) && Math.abs(det) > 1e-3) {
        const sx = -dx / k, sy = -dy / k; // ลากขวา = พื้นตามมือไปขวา → จุดโฟกัสถอยไปทางซ้าย
        ux = (sx * byv - bxv * sy) / det; uz = (ax * sy - sx * ay) / det;
        const m = Math.hypot(ux, uz), cap = 1.2; // กันกระโดดไกลเมื่อพื้นเกือบขนานสายตา
        if (m > cap) { ux *= cap / m; uz *= cap / m; }
      } else { ux = -dx * 0.01; uz = dy * 0.01; }
      R.user.panX = mod(R.user.panX + ux + COLS / 2, COLS) - COLS / 2; // เลื่อนรอบวงได้ไม่จำกัด (ต่อวงรอบ)
      R.user.panZ = clamp(R.user.panZ + uz, -40, 40);
    },
    zoomBy(dy) { R.free = true; R.user.dist = clamp(R.user.dist * Math.exp(dy * 0.0012), 2.8, 13); },
    recenter() { R.user.panX = 0; R.user.panZ = 0; },
    // กลับมาที่ตัวเรา (Space / ปุ่มเป้า) — คืนมุมหมุน/ก้มที่ลากไว้ด้วย · ไม่มีตัวเรา (ตาย/ดูอยู่) = กลับจุดโฟกัสล่าสุด
    home() {
      R.want = null; R.free = false;
      if (R.me) { goTo(R.me.x, R.me.y); R.focusKey = `${R.me.x},${R.me.y}`; } else this.recenter();
      R.user.yaw = 0; R.user.pitch = R.viewRef === "top" ? 1.2 : TILT;
    },
    // กล้องออกห่างจากตัวเรา (กล้องอิสระ หรือหมากเราหลุดจอ) — BoardStage โชว์ปุ่มกลับที่หมาก
    away() { return !!R.me && (!!R.free || !onScreen(R.me.x + 0.5, R.me.y + 0.5)); },
    // ลูกศรขอบจอชี้หมากที่อยู่นอกจอ: (bx, by) กลางตัว → { x, y, ang } พิกัด CSS ของแคนวาส · null = อยู่ในจอ
    //  inset = { l, r, t, b } ระยะเว้นจากขอบ (HUD)
    edgeMark(bx, by, inset) {
      surf(phiOf(bx), by, 0.4, _ev).applyMatrix4(camera.matrixWorldInverse);
      const behind = -_ev.z < 0.1;
      let dx, dy;
      if (!behind) {
        _ev.applyMatrix4(camera.projectionMatrix);
        const sx = (_ev.x + 1) / 2 * w, sy = (1 - _ev.y) / 2 * h;
        if (sx > inset.l && sx < w - inset.r && sy > inset.t && sy < h - inset.b) return null;
        dx = sx - w / 2; dy = sy - h / 2;
      } else { dx = _ev.x; dy = -_ev.y; if (Math.abs(dx) + Math.abs(dy) < 1e-6) dy = 1; }
      const hx = w / 2, hy = h / 2, l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const tx = dx > 0 ? (w - inset.r - hx) / dx : dx < 0 ? (inset.l - hx) / dx : Infinity;
      const ty = dy > 0 ? (h - inset.b - hy) / dy : dy < 0 ? (inset.t - hy) / dy : Infinity;
      const t = Math.min(tx, ty);
      return { x: hx + dx * t, y: hy + dy * t, ang: Math.atan2(dy, dx) };
    },
    // ระยะกล้อง → จุดโฟกัส (ชั้น 2D ใช้ตัดสินการจางของสิ่งปลูกสร้างไกลๆ ให้สัมพันธ์กับระดับซูม)
    focusDist() { return R.armD || R.cur.dist; },
    _look(x, y) { goTo(x, y); R.free = true; }, // dev: ส่องกล้องไปช่อง (x, y)
    _dbg() { return { cam: camera.position.toArray().map((v) => +v.toFixed(2)), r: +Math.hypot(camera.position.x, camera.position.y).toFixed(2), Rc: +Rc.toFixed(2), cur: { ...R.cur }, user: { ...R.user }, focus: R.focus, armD: R.armD, cap: capBottom.visible }; },
    toggleAxis() { R.user.axis = !R.user.axis; },
    skipShot() { if (R.shot) shotEnd = 0; shots.length = 0; },
    setFocusId(id) { R.focusId = id; },
    dispose() {
      scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { if (x.map && x.map !== earthTex) x.map.dispose?.(); x.dispose?.(); }); });
      getEarth().textures.delete(earthTex); earthTex.dispose();
      renderer.dispose();
    },
  };
}

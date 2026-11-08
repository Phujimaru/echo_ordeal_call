// ============================================================
//  ของบนพื้นสนาม Colony (GRID_PLAN §8.3) — สไปรต์ 2D แบบเดียวกับ boardProps (สีพาสเทล หน้าสว่าง/ข้างเข้ม)
//  boardDraw วาดในกรอบหมุน (boardGeo.withLocalFrame) → "ขึ้น" ของสไปรต์ชี้เข้าแกนกระบอก ยืนบนผนัง/เพดานได้
//  บ้าน (house) · ตึก (tower) · แคปซูลเสบียง (ร้านค้า) — ต้นไม้ใช้ drawObstacle "tree" เดิม
// ============================================================
import { P, PA, glow } from "./boardGeo";

const TAU = Math.PI * 2;
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ความสูงตึก (หน่วยช่อง) — ใช้ทั้งสไปรต์และแขนกล้อง (colony3d)
export const towerHeight = (x, y) => 1.05 + hash(x, y, 7) * 0.75;

const ROOFS = [["#c4604a", "#9a4434"], ["#5f7fb5", "#45608e"], ["#d29a5c", "#a97743"], ["#7e9a6c", "#5f7a50"]];
function shadow(g, x, y, rx, ry, night) {
  g.fillStyle = night ? "rgba(0,8,24,.45)" : "rgba(28,46,40,.22)";
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
}

export function drawHouse(g, x, y, night) {
  const [bx, by, s] = PA(x, y, 0.05);
  const w = s * 0.74, hw = s * 0.42, top = by - hw, eave = s * 0.07;
  const [r1, r2] = ROOFS[Math.floor(hash(x, y, 4) * ROOFS.length)];
  shadow(g, bx + s * 0.06, by, s * 0.5, s * 0.16, night);
  // ผนัง (หน้าสว่าง · ข้างขวาเข้ม)
  g.fillStyle = night ? "#b5ae9f" : "#f6eedd"; g.fillRect(bx - w / 2, top, w, hw);
  g.fillStyle = night ? "#918a7c" : "#ddd0b4"; g.fillRect(bx + w * 0.18, top, w * 0.32, hw);
  // หลังคาจั่ว
  g.fillStyle = r1; g.beginPath(); g.moveTo(bx - w / 2 - eave, top + s * 0.02); g.lineTo(bx - w * 0.08, top - s * 0.36); g.lineTo(bx + w * 0.18, top - s * 0.36); g.lineTo(bx + w * 0.18, top + s * 0.02); g.closePath(); g.fill();
  g.fillStyle = r2; g.beginPath(); g.moveTo(bx + w * 0.18, top - s * 0.36); g.lineTo(bx + w / 2 + eave, top + s * 0.02); g.lineTo(bx + w * 0.18, top + s * 0.02); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(bx - w / 2 - eave, top, w * 0.68 + eave, s * 0.03);
  // ปล่องไฟ
  g.fillStyle = night ? "#6e665a" : "#a8907a"; g.fillRect(bx - w * 0.3, top - s * 0.3, s * 0.08, s * 0.16);
  // ประตู + หน้าต่าง
  g.fillStyle = night ? "#4a3427" : "#7a5232";
  g.beginPath(); g.moveTo(bx - w * 0.3, by); g.lineTo(bx - w * 0.3, by - s * 0.18); g.arc(bx - w * 0.22, by - s * 0.18, w * 0.08, Math.PI, 0); g.lineTo(bx - w * 0.14, by); g.closePath(); g.fill();
  const lit = night && hash(x, y, 6) > 0.25;
  g.fillStyle = lit ? "#ffd27a" : night ? "#2a3a52" : "#8fc3ea";
  g.fillRect(bx - w * 0.02, top + hw * 0.24, s * 0.14, s * 0.12);
  g.fillStyle = night ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.7)"; g.fillRect(bx - w * 0.02, top + hw * 0.24, s * 0.14, s * 0.025);
  if (lit) glow(g, bx + s * 0.05, top + hw * 0.3, s * 0.36, "255,207,110", 0.35);
}

export function drawTower(g, x, y, night, now) {
  const [bx, by, s] = PA(x, y, 0.05);
  const w = s * 0.66, h = towerHeight(x, y) * s * 0.95, top = by - h;
  shadow(g, bx + s * 0.08, by, s * 0.48, s * 0.15, night);
  g.fillStyle = night ? "#5d6a80" : "#e4ebf2"; g.fillRect(bx - w / 2, top, w, h);
  g.fillStyle = night ? "#4b566a" : "#c6d2de"; g.fillRect(bx + w * 0.2, top, w * 0.3, h);
  // หน้าต่างเป็นตาราง
  const rows = Math.max(3, Math.floor(h / (s * 0.17))), rh = (h - s * 0.14) / rows, cw = w / 3;
  for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) {
    const lit = night && hash(x * 7 + c, y * 13 + r, 5) > 0.42;
    g.fillStyle = lit ? "#ffd27a" : night ? "#2a3a52" : c === 2 ? "#7aa6cf" : "#9fcbef";
    g.fillRect(bx - w / 2 + c * cw + cw * 0.2, top + s * 0.08 + r * rh + rh * 0.2, cw * 0.6, rh * 0.55);
  }
  if (!night) { g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.moveTo(bx - w / 2, top + h * 0.15); g.lineTo(bx - w * 0.05, top); g.lineTo(bx + w * 0.12, top); g.lineTo(bx - w / 2, top + h * 0.42); g.closePath(); g.fill(); }
  // ขอบหลังคา + เสาอากาศ (ไฟแดงกะพริบ)
  g.fillStyle = night ? "#7d8aa0" : "#b8c4d2"; g.fillRect(bx - w / 2 - s * 0.03, top - s * 0.05, w + s * 0.06, s * 0.06);
  g.strokeStyle = night ? "#9aa6ba" : "#8a96a6"; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.moveTo(bx - w * 0.2, top - s * 0.05); g.lineTo(bx - w * 0.2, top - s * 0.32); g.stroke();
  const on = 0.5 + 0.5 * Math.sin(now / 420 + x * 1.7 + y);
  g.fillStyle = `rgba(255,${80 + on * 40 | 0},70,${0.5 + on * 0.5})`; g.beginPath(); g.arc(bx - w * 0.2, top - s * 0.33, s * 0.035, 0, TAU); g.fill();
  if (night) glow(g, bx - w * 0.2, top - s * 0.33, s * 0.2, "255,90,70", on * 0.4);
}

// แคปซูลเสบียง 3 แบบ = ร้าน 3 ร้าน (ผู้ใช้สั่ง 2026-11-09) · z = ความสูงระหว่างตกลงมา (0 = ลงแล้ว)
//  apoth (ร้านยาเจริญชัย) = แคปซูลคลินิกขาว กากบาทเขียว · forge (โรงช่างลุงเริง) = ตู้เหล็กหกเหลี่ยม ลายเตือนส้ม ฟันเฟือง
//  cara (พ่อค้าเร่) = แคปซูลทอง หลังคากันสาดลายแดง-ครีม + โคมไฟ
const CAP_LIGHT = { apoth: "120,255,180", forge: "255,160,70", cara: "255,214,110" };
export function drawCapsule(g, x, y, z, night, now, kind = "apoth") {
  const [fx, fy, fs] = P(x + 0.5, y + 0.5, 0);
  const [bx, by, s] = P(x + 0.5, y + 0.5, z);
  const light = CAP_LIGHT[kind] || CAP_LIGHT.apoth;
  // วงเรืองบนพื้น + เงา (เล็กลงตอนยังสูง)
  const far = Math.min(1, z / 2.4);
  g.strokeStyle = `rgba(${light},.85)`; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(fx, fy, fs * 0.46, fs * 0.17, 0, 0, TAU); g.stroke();
  shadow(g, fx, fy, fs * 0.34 * (1 - far * 0.6), fs * 0.11 * (1 - far * 0.6), night);
  const w = s * (kind === "forge" ? 0.54 : 0.44), h = s * (kind === "forge" ? 0.62 : 0.78), x0 = bx - w / 2, y0 = by - h - s * 0.06, r = w / 2;
  // ไอพ่นตอนตก
  if (z > 0.05) {
    const fl = s * (0.35 + Math.random() * 0.15);
    const gr = g.createLinearGradient(0, by - s * 0.06, 0, by - s * 0.06 + fl);
    gr.addColorStop(0, "rgba(255,250,220,.95)"); gr.addColorStop(0.4, `rgba(${light},.8)`); gr.addColorStop(1, "rgba(255,120,40,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(bx - w * 0.28, by - s * 0.06); g.lineTo(bx + w * 0.28, by - s * 0.06); g.lineTo(bx, by - s * 0.06 + fl); g.closePath(); g.fill();
  }
  // ขาตั้ง
  g.strokeStyle = night ? "#8a8f9a" : "#9aa3ae"; g.lineWidth = Math.max(1.2, s * 0.03);
  g.beginPath(); g.moveTo(bx - w * 0.38, by - s * 0.2); g.lineTo(bx - w * 0.62, by); g.moveTo(bx + w * 0.38, by - s * 0.2); g.lineTo(bx + w * 0.62, by); g.stroke();
  if (kind === "forge") {
    // ตู้เหล็กหกเหลี่ยม: หน้าสว่าง/ข้างเข้ม + ลายเตือน + ฟันเฟืองหมุน + ไอระบาย
    const hx = w / 2;
    g.fillStyle = night ? "#6f7682" : "#aab3bf";
    g.beginPath(); g.moveTo(bx - hx, y0 + h * 0.18); g.lineTo(bx - hx * 0.55, y0); g.lineTo(bx + hx * 0.55, y0); g.lineTo(bx + hx, y0 + h * 0.18); g.lineTo(bx + hx, y0 + h); g.lineTo(bx - hx, y0 + h); g.closePath(); g.fill();
    g.fillStyle = night ? "#575d68" : "#8c96a3"; g.fillRect(bx + hx * 0.3, y0 + h * 0.18, hx * 0.7, h * 0.82);
    g.save(); g.beginPath(); g.rect(bx - hx, y0 + h * 0.74, w, h * 0.16); g.clip();
    for (let i = -6; i < 8; i++) { g.fillStyle = i % 2 ? "#f2b33c" : "#2a2a2e"; g.beginPath(); const xx = bx - hx + i * w * 0.12; g.moveTo(xx, y0 + h * 0.9); g.lineTo(xx + w * 0.12, y0 + h * 0.9); g.lineTo(xx + w * 0.24, y0 + h * 0.74); g.lineTo(xx + w * 0.12, y0 + h * 0.74); g.closePath(); g.fill(); }
    g.restore();
    const gx = bx - hx * 0.25, gy = y0 + h * 0.44, gr2 = w * 0.2, rot = now / 900;
    g.fillStyle = "#f08a2a";
    g.beginPath(); for (let i = 0; i < 16; i++) { const a = rot + i * TAU / 16, rr = i % 2 ? gr2 : gr2 * 1.3; g.lineTo(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr); } g.closePath(); g.fill();
    g.fillStyle = night ? "#6f7682" : "#aab3bf"; g.beginPath(); g.arc(gx, gy, gr2 * 0.45, 0, TAU); g.fill();
    if (z <= 0.05) for (let i = 0; i < 3; i++) { const ph = ((now / 1400) + i / 3) % 1; g.fillStyle = `rgba(230,230,235,${0.45 * (1 - ph)})`; g.beginPath(); g.arc(bx + hx * 0.6 + ph * s * 0.08, y0 - ph * s * 0.4, s * (0.04 + ph * 0.07), 0, TAU); g.fill(); }
  } else {
    // ตัวแคปซูลมน
    const body = kind === "cara" ? (night ? "#c9a24a" : "#f2cf6a") : (night ? "#c9ced8" : "#f6f8fa");
    const side = kind === "cara" ? (night ? "#a6823a" : "#d8ad4a") : (night ? "#a3a9b5" : "#d9dee5");
    g.fillStyle = body;
    g.beginPath(); g.moveTo(x0, y0 + r); g.arc(bx, y0 + r, r, Math.PI, 0); g.lineTo(x0 + w, y0 + h - r * 0.5); g.quadraticCurveTo(x0 + w, y0 + h, bx, y0 + h); g.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r * 0.5); g.closePath(); g.fill();
    g.fillStyle = side; g.fillRect(bx + w * 0.16, y0 + r, w * 0.34, h - r * 1.5);
    if (kind === "cara") {
      // กันสาดลายแดง-ครีม + ชายระบาย + โคมแขวน + ดาวทอง
      const ay = y0 + h * 0.36, aw = w * 0.72;
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#fff4dc" : "#d8463c"; g.beginPath(); g.moveTo(bx - aw + i * aw / 3, ay); g.lineTo(bx - aw + (i + 1) * aw / 3, ay); g.lineTo(bx - aw + (i + 1) * aw / 3 - aw * 0.05, ay + s * 0.14); g.lineTo(bx - aw + i * aw / 3 - aw * 0.05, ay + s * 0.14); g.closePath(); g.fill(); }
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#fff4dc" : "#d8463c"; g.beginPath(); g.arc(bx - aw + (i + 0.5) * aw / 3 - aw * 0.05, ay + s * 0.14, aw / 6, 0, Math.PI); g.fill(); }
      const sw = Math.sin(now / 500) * s * 0.02;
      g.strokeStyle = "#6a4a1a"; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + aw * 0.8, ay + s * 0.1); g.lineTo(bx + aw * 0.8 + sw, ay + s * 0.26); g.stroke();
      glow(g, bx + aw * 0.8 + sw, ay + s * 0.3, s * 0.22, "255,200,90", night ? 0.6 : 0.35);
      g.fillStyle = "#ffcf5a"; g.beginPath(); g.arc(bx + aw * 0.8 + sw, ay + s * 0.3, s * 0.045, 0, TAU); g.fill();
      const sx = bx - w * 0.08, sy = y0 + r * 0.95, sr = r * 0.4;
      g.fillStyle = "#b7791f"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10, rr = i % 2 ? sr * 0.45 : sr; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } g.closePath(); g.fill();
    } else {
      // คลินิก: แถบเขียวมิ้นต์ + กากบาทเขียวในวงขาว
      g.fillStyle = "#3fbf7f"; g.fillRect(x0, y0 + h * 0.58, w, s * 0.06);
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(bx - w * 0.06, y0 + r * 0.95, r * 0.5, 0, TAU); g.fill();
      g.fillStyle = "#2fae6c"; const cs = r * 0.36; g.fillRect(bx - w * 0.06 - cs * 0.3, y0 + r * 0.95 - cs, cs * 0.6, cs * 2); g.fillRect(bx - w * 0.06 - cs, y0 + r * 0.95 - cs * 0.3, cs * 2, cs * 0.6);
    }
  }
  // ไฟบนหัว (กะพริบตามสีร้าน)
  const on = 0.5 + 0.5 * Math.sin(now / 260);
  glow(g, bx, y0 - s * 0.04, s * 0.42, light, 0.25 + on * 0.35);
  g.fillStyle = `rgb(${light})`; g.beginPath(); g.arc(bx, y0 - s * 0.02, s * 0.045, 0, TAU); g.fill();
}

// ป้อมปืนรักษาการณ์: ฐาน + หัวป้อมหันตามทิศ (tr.face) + ไฟตาแดง + ขีดเลือด
export function drawTurret(g, x, y, tr, night, now, hitT) {
  const [bx, by, s] = PA(x, y, 0.02);
  shadow(g, bx + s * 0.05, by, s * 0.42, s * 0.14, night);
  const hit = hitT && tr ? now - (hitT.get(`col:turret:${tr.i}`) || 0) < 260 : false;
  g.fillStyle = night ? "#4c5462" : "#8d97a6";
  g.beginPath(); g.ellipse(bx, by - s * 0.06, s * 0.36, s * 0.14, 0, 0, TAU); g.fill();
  g.fillRect(bx - s * 0.3, by - s * 0.42, s * 0.6, s * 0.36);
  g.fillStyle = night ? "#3b424e" : "#727c8b"; g.fillRect(bx + s * 0.08, by - s * 0.42, s * 0.22, s * 0.36);
  g.fillStyle = "#f2b33c"; g.fillRect(bx - s * 0.3, by - s * 0.16, s * 0.6, s * 0.04);
  const face = tr && tr.face ? { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[tr.face] : [0, 1];
  const p0 = P(x + 0.5, y + 0.5, 0), p1 = P(x + 0.5 + face[0] * 0.5, y + 0.5 + face[1] * 0.5, 0);
  let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const hx = bx, hy = by - s * 0.5;
  g.strokeStyle = night ? "#2a2f38" : "#4a525e"; g.lineWidth = s * 0.1; g.lineCap = "round";
  g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + dx * s * 0.42, hy + dy * s * 0.42); g.stroke(); g.lineCap = "butt";
  g.fillStyle = hit ? "#ffffff" : (night ? "#6a7383" : "#b9c2ce");
  g.beginPath(); g.arc(hx, hy, s * 0.2, 0, TAU); g.fill();
  const on = 0.5 + 0.5 * Math.sin(now / 300 + x);
  glow(g, hx + dx * s * 0.08, hy + dy * s * 0.08 - s * 0.03, s * 0.24, "255,60,50", 0.35 + on * 0.4);
  g.fillStyle = "#ff3b30"; g.beginPath(); g.arc(hx + dx * s * 0.08, hy + dy * s * 0.08 - s * 0.03, s * 0.055, 0, TAU); g.fill();
  if (tr && tr.maxHp) for (let i = 0; i < tr.maxHp; i++) { g.fillStyle = i < tr.hp ? "#ff5a4a" : "rgba(0,0,0,.35)"; g.fillRect(bx - s * 0.2 + i * s * 0.14, hy - s * 0.36, s * 0.11, s * 0.05); }
}

// หอสังเกตการณ์: เสาโครงถักด้านหลังช่อง + ห้องเฝ้ามอง + ไฟส่องหมุน (ผู้เล่นยืนหน้าเสา)
export function drawWatch(g, x, y, night, now) {
  const [bx, by, s] = PA(x, y, -0.32);
  const h = s * 1.5, top = by - h;
  g.strokeStyle = night ? "#8fa3c0" : "#5d6f88"; g.lineWidth = Math.max(1, s * 0.03);
  g.beginPath(); g.moveTo(bx - s * 0.14, by); g.lineTo(bx - s * 0.06, top); g.moveTo(bx + s * 0.14, by); g.lineTo(bx + s * 0.06, top);
  for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6; g.moveTo(bx - s * (0.14 - 0.08 * t0), by - h * t0); g.lineTo(bx + s * (0.14 - 0.08 * t1), by - h * t1); }
  g.stroke();
  g.fillStyle = night ? "#46566e" : "#e4ebf2"; g.fillRect(bx - s * 0.2, top - s * 0.18, s * 0.4, s * 0.2);
  g.fillStyle = night ? "#ffd27a" : "#8fc3ea"; g.fillRect(bx - s * 0.16, top - s * 0.14, s * 0.32, s * 0.09);
  g.fillStyle = night ? "#5d6f88" : "#4d7fb8"; g.beginPath(); g.moveTo(bx - s * 0.24, top - s * 0.18); g.lineTo(bx, top - s * 0.32); g.lineTo(bx + s * 0.24, top - s * 0.18); g.closePath(); g.fill();
  const a = now / 600, lx = bx + Math.cos(a) * s * 0.4;
  g.save(); g.globalAlpha = 0.35 + 0.25 * Math.abs(Math.sin(a)); g.fillStyle = "rgba(160,220,255,1)";
  g.beginPath(); g.moveTo(bx, top - s * 0.3); g.lineTo(lx, top - s * 0.42); g.lineTo(lx, top - s * 0.24); g.closePath(); g.fill(); g.restore();
  glow(g, bx, top - s * 0.3, s * 0.2, "160,220,255", 0.5);
}

// น้ำพุ (จุดฟื้นฟู): ขอบอ่าง + สายน้ำพุ่งโค้ง + ละอองระยิบ
export function drawFountain(g, x, y, night, now) {
  const [bx, by, s] = P(x + 0.5, y + 0.5, 0);
  g.strokeStyle = night ? "#9aa3b2" : "#ffffff"; g.lineWidth = Math.max(1.5, s * 0.05);
  g.beginPath(); g.ellipse(bx, by, s * 0.32, s * 0.12, 0, 0, TAU); g.stroke();
  g.fillStyle = night ? "#8b93a2" : "#e7e1d3"; g.fillRect(bx - s * 0.04, by - s * 0.3, s * 0.08, s * 0.3);
  const t = now / 1000;
  g.strokeStyle = night ? "rgba(150,210,255,.75)" : "rgba(120,205,240,.9)"; g.lineWidth = Math.max(1, s * 0.025);
  for (let i = 0; i < 6; i++) {
    const a = i * TAU / 6 + t * 0.3, ex = bx + Math.cos(a) * s * 0.26, ey = by + Math.sin(a) * s * 0.09;
    g.beginPath(); g.moveTo(bx, by - s * 0.3); g.quadraticCurveTo((bx + ex) / 2, by - s * 0.58, ex, ey); g.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const ph = (t * 0.9 + i / 8) % 1, a = i * 2.3;
    g.fillStyle = `rgba(220,245,255,${0.8 * (1 - ph)})`;
    g.beginPath(); g.arc(bx + Math.cos(a) * s * 0.22 * ph, by - s * (0.32 + 0.25 * Math.sin(ph * Math.PI)), s * 0.022, 0, TAU); g.fill();
  }
  glow(g, bx, by - s * 0.2, s * 0.45, "140,220,255", night ? 0.35 : 0.18);
}

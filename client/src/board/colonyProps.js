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

// แคปซูลเสบียง (ร้านค้าของ Colony) · z = ความสูงระหว่างตกลงมา (0 = ลงแล้ว)
export function drawCapsule(g, x, y, z, night, now) {
  const [fx, fy, fs] = P(x + 0.5, y + 0.5, 0);
  const [bx, by, s] = P(x + 0.5, y + 0.5, z);
  // วงเรืองบนพื้น + เงา (เล็กลงตอนยังสูง)
  const far = Math.min(1, z / 2.4);
  g.strokeStyle = night ? "rgba(255,225,140,.85)" : "rgba(217,169,63,.85)"; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(fx, fy, fs * 0.46, fs * 0.17, 0, 0, TAU); g.stroke();
  shadow(g, fx, fy, fs * 0.34 * (1 - far * 0.6), fs * 0.11 * (1 - far * 0.6), night);
  const w = s * 0.44, h = s * 0.78, x0 = bx - w / 2, y0 = by - h - s * 0.06, r = w / 2;
  // ไอพ่นตอนตก
  if (z > 0.05) {
    const fl = s * (0.35 + Math.random() * 0.15);
    const gr = g.createLinearGradient(0, by - s * 0.06, 0, by - s * 0.06 + fl);
    gr.addColorStop(0, "rgba(255,250,220,.95)"); gr.addColorStop(0.4, "rgba(255,170,70,.8)"); gr.addColorStop(1, "rgba(255,120,40,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(bx - w * 0.28, by - s * 0.06); g.lineTo(bx + w * 0.28, by - s * 0.06); g.lineTo(bx, by - s * 0.06 + fl); g.closePath(); g.fill();
  }
  // ขาตั้ง 3 ขา
  g.strokeStyle = night ? "#8a8f9a" : "#9aa3ae"; g.lineWidth = Math.max(1.2, s * 0.03);
  g.beginPath(); g.moveTo(bx - w * 0.38, by - s * 0.22); g.lineTo(bx - w * 0.62, by); g.moveTo(bx + w * 0.38, by - s * 0.22); g.lineTo(bx + w * 0.62, by); g.stroke();
  // ตัวแคปซูล (ขาว + แถบส้ม/น้ำเงินแบบยานเสบียง)
  g.fillStyle = night ? "#c9ced8" : "#f6f8fa";
  g.beginPath(); g.moveTo(x0, y0 + r); g.arc(bx, y0 + r, r, Math.PI, 0); g.lineTo(x0 + w, y0 + h - r * 0.5); g.quadraticCurveTo(x0 + w, y0 + h, bx, y0 + h); g.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r * 0.5); g.closePath(); g.fill();
  g.fillStyle = night ? "#a3a9b5" : "#d9dee5"; g.fillRect(bx + w * 0.16, y0 + r, w * 0.34, h - r * 1.5);
  g.fillStyle = "#f0a23c"; g.fillRect(x0, y0 + h * 0.48, w, s * 0.07);
  g.fillStyle = "#3d6fb8"; g.fillRect(x0, y0 + h * 0.6, w, s * 0.035);
  // ช่องกระจก + เครื่องหมาย
  g.fillStyle = night ? "#1d2e48" : "#5a8fc8"; g.beginPath(); g.arc(bx - w * 0.08, y0 + r * 0.95, r * 0.42, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.arc(bx - w * 0.15, y0 + r * 0.82, r * 0.13, 0, TAU); g.fill();
  // ไฟบนหัว (กะพริบทอง)
  const on = 0.5 + 0.5 * Math.sin(now / 260);
  glow(g, bx, y0 - s * 0.04, s * 0.4, "255,214,110", 0.25 + on * 0.35);
  g.fillStyle = "#ffd65a"; g.beginPath(); g.arc(bx, y0 - s * 0.02, s * 0.045, 0, TAU); g.fill();
}

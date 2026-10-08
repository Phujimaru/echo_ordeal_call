// ============================================================
//  คณิตกล้อง + เครื่องมือวาดพื้นฐานของกระดาน (ใช้ร่วมกันระหว่าง boardDraw / boardProps / regionThemes)
//  พิกัดตรรกะ 1280 × 720 · กล้องเอียง 38° แบบต้นแบบ .claude/plans/region1-board.html
// ============================================================

export const LW = 1280;
export const LH = 720;

export const F_UI = '"Chakra Petch","Kanit",sans-serif';
export const F_TH = '"Kanit","Chakra Petch",sans-serif';

export const key = (x, y) => x + "," + y;
export const parseKey = (k) => String(k).split(",").map(Number);

// =================================================================== projection
//  กล้องเอียง 38° · ขอบใกล้ของกระดานอยู่ที่ y ตรรกะ 528 เสมอ (เว้นที่ล่างให้ HUD ≈ 27% ของจอ)
//  หมุนมุมมองได้ทีละ 90° (rotation 0..3 = หมุนตามเข็มนาฬิกา) — หมุนแค่ภาพ ข้อมูลเกมยังเป็นพิกัดกระดานเดิม
//   พิกัด 3 แบบ
//    - กระดาน (x, y)     = พิกัดเกม · P(x, y, z)
//    - มุมมอง (X, Y)     = หลังหมุน วัดจากกลางกระดาน · Y มาก = ใกล้กล้อง · PV(X, Y, z)
//    - ฉาก (x, y)        = กรอบสี่เหลี่ยมตามแนวจอขนาดเท่ากระดานหลังหมุน (มุม 0 = เหมือนพิกัดกระดาน) · PS(x, y, z)
//                          ใช้กับของรอบนอก (ลายพื้น ต้นไม้ข้างกระดาน) ที่ไม่หมุนตามกระดาน
const PITCH = 38 * Math.PI / 180, SN = Math.sin(PITCH), CS = Math.cos(PITCH);
const CAM_D = 22, NEAR_Y = 528;
export const OX = 640;
// ขอบไกลของกระดาน 16 × 12 (มุม 0) ตามต้นแบบ — กระดานที่ลึกกว่า (หมุน 90°) ยอมให้ขอบไกลสูงขึ้นช่องละ 7.5 px แล้วย่อกล้องให้พอดี
const FOC0 = 66.25 * (CAM_D - 6 * CS), FAR0 = NEAR_Y - 6 * SN * 66.25 - 6 * SN * FOC0 / (CAM_D + 6 * CS);
let BC = 16, BR = 12, TH = 0, cT = 1, sT = 0, HCe = 8, HRe = 6, FOC = FOC0, OY = NEAR_Y - 6 * SN * 66.25;
function fit() {
  const a = TH * Math.PI / 2;
  cT = Math.cos(a); sT = Math.sin(a);
  if (Math.abs(cT) < 1e-9) cT = 0;
  if (Math.abs(sT) < 1e-9) sT = 0;
  HCe = Math.abs(cT) * BC / 2 + Math.abs(sT) * BR / 2;
  HRe = Math.abs(sT) * BC / 2 + Math.abs(cT) * BR / 2;
  const dn = CAM_D - HRe * CS, df = CAM_D + HRe * CS, farY = FAR0 - (HRe - 6) * 7.5;
  FOC = (NEAR_Y - farY) / (HRe * SN * (1 / dn + 1 / df));
  OY = NEAR_Y - HRe * SN * FOC / dn;
}
// ขนาดกระดาน (ช่อง) — กล้องจูนไว้สำหรับ 16 × 12 (ทุกภูมิภาคใช้ขนาดนี้ — GRID_PLAN §3)
export function setBoardSize(cols, rows) { if (cols !== BC || rows !== BR) { BC = cols; BR = rows; fit(); } }
// มุมมอง: จำนวนรอบ 90° ตามเข็มนาฬิกา (ทศนิยมได้ = ระหว่างหมุน)
export function setViewTurn(t) { if (t !== TH) { TH = t; fit(); } }
export const viewTurn = () => TH;
// ขนาดกรอบฉาก (หน่วยช่อง) = ขนาดกระดานตามแนวจอ
export const sceneSize = () => ({ cols: HCe * 2, rows: HRe * 2 });

// มุมมอง (X, Y, สูง z) → [sx, sy, สเกล] ในพิกัดตรรกะ
export function PV(X, Y, z = 0) {
  const depth = CAM_D - Y * CS - z * SN, s = FOC / depth;
  return [OX + X * s, OY + (Y * SN - z * CS) * s, s];
}
// กระดาน → มุมมอง [X, Y]
export function toView(x, y) {
  const dx = x - BC / 2, dy = y - BR / 2;
  return [dx * cT - dy * sT, dx * sT + dy * cT];
}
// ความลึก (Y ของมุมมอง) ของจุดบนกระดาน — ใช้เรียงของหน้า/หลัง
export const depthOf = (x, y) => (x - BC / 2) * sT + (y - BR / 2) * cT;
// แกนของมุมมองในพิกัดกระดาน: f = ทิศเข้าหากล้อง · r = ทิศขวาของจอ
export const viewAxes = () => ({ fx: sT, fy: cT, rx: cT, ry: -sT });
// กระดาน (x, y, สูง z) → [sx, sy, สเกล]
export function project(x, y, z = 0) {
  const dx = x - BC / 2, dy = y - BR / 2;
  return PV(dx * cT - dy * sT, dx * sT + dy * cT, z);
}
export const P = project;
// จุดยึดของสไปรต์: กลางช่อง (x, y) ขยับเข้าหากล้อง off ช่อง
export function PA(x, y, off = 0, z = 0) { return P(x + 0.5 + sT * off, y + 0.5 + cT * off, z); }
// ฉาก (x, y, z) → [sx, sy, สเกล]
export function PS(x, y, z = 0) { return PV(x - HCe, y - HRe, z); }
// ด้านข้างแนวตั้งของกล่อง (normal n ในพิกัดกระดาน ที่จุด px, py) หันเข้ากล้องไหม
export function faceVisible(nx, ny, px, py) {
  const [X, Y] = toView(px, py), vx = nx * cT - ny * sT, vy = nx * sT + ny * cT;
  return vx * -X + vy * (CAM_D * CS - Y) > 0;
}
// จุดบนจอ (ตรรกะ) → มุมมอง {X, Y} บนพื้น (z = 0) · เหนือเส้นขอบฟ้า = null
function unprojectView(sx, sy) {
  const v = (sy - OY) / FOC, den = SN + v * CS;
  if (den <= 1e-6) return null;
  const Y = v * CAM_D / den, depth = CAM_D - Y * CS;
  if (depth <= 0.5) return null;
  return { X: (sx - OX) / (FOC / depth), Y };
}
// จุดบนจอ → พิกัดกระดาน (ย้อนการหมุน)
export function unproject(sx, sy) {
  const v = unprojectView(sx, sy);
  if (!v) return null;
  return { x: v.X * cT + v.Y * sT + BC / 2, y: -v.X * sT + v.Y * cT + BR / 2 };
}
// จุดบนจอ → พิกัดฉาก
export function unprojectScene(sx, sy) {
  const v = unprojectView(sx, sy);
  return v ? { x: v.X + HCe, y: v.Y + HRe } : null;
}
// ขนาดแคนวาสจริง (CSS px) → ตัวแปลงพิกัด ตรรกะ ↔ CSS · ย่อให้เห็นเฟรม 1280×720 ครบ แล้วต่อฉากรอบนอกให้เต็มจอ
export function computeView(w, h) {
  const k = Math.min(w / LW, h / LH) || 1;
  const ox = (w - LW * k) / 2, oy = (h - LH * k) / 2;
  return { w, h, k, ox, oy, x0: -ox / k, y0: -oy / k, x1: (w - ox) / k, y1: (h - oy) / k };
}
export function toLogical(view, cx, cy) {
  return [(cx - view.ox) / view.k, (cy - view.oy) / view.k];
}

// =================================================================== shapes
// สี่เหลี่ยมของช่อง (x, y) บนพื้น · inset = หดเข้าจากขอบ (หน่วยช่อง)
export function quad(g, x, y, inset = 0, z = 0) {
  const a = P(x + inset, y + inset, z), b = P(x + 1 - inset, y + inset, z), c = P(x + 1 - inset, y + 1 - inset, z), d = P(x + inset, y + 1 - inset, z);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
}
// วงรีบนพื้น (รัศมีเป็นหน่วยช่อง) · ry ไม่ใส่ = วงกลม
export function gEllipse(g, cx, cy, r, z = 0, n = 40, ry = r) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * ry, z);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.closePath();
}
// เส้นหลายจุดบนพื้น/ในอากาศ: pts = [[x, y, z?], …]
export function gPoly(g, pts, close = true) {
  g.beginPath();
  pts.forEach(([x, y, z = 0], i) => { const p = P(x, y, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  if (close) g.closePath();
}
export function hexPath(g, cx, cy, r, ry) {
  ry = ry || r * 0.866; g.beginPath();
  g.moveTo(cx - r, cy); g.lineTo(cx - r / 2, cy - ry); g.lineTo(cx + r / 2, cy - ry); g.lineTo(cx + r, cy); g.lineTo(cx + r / 2, cy + ry); g.lineTo(cx - r / 2, cy + ry); g.closePath();
}
export function rng(seed) { seed = Math.abs(Math.floor(seed)) % 2147483646 || 1; return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
// วงเรืองแสง (radial gradient) ที่จุดบนจอ
export function glow(g, x, y, r, rgb, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

// =================================================================== colors
export function normColor(c) {
  if (typeof c !== "string") return "#3d8bd9";
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return "#" + c.slice(1).split("").map((h) => h + h).join("");
  return "#3d8bd9";
}
export function rgbOf(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
export function shadeHex(h, k) { return `rgb(${rgbOf(h).map((v) => Math.max(0, Math.min(255, v + v * k)) | 0)})`; }
export function hexA(h, a) { return `rgba(${rgbOf(h)},${a})`; }

// เอฟเฟกต์บนกระดานของดิเอโก้ แบรนโด (อสูรกายดึกดำบรรพ์) (characters/diego_dino.js · GRID_PLAN §7.36)
//  อ้างอิงรูป/คลิปของผู้ใช้ (Steel Ball Run / ASB): ไดโนเสาร์ตัวฟ้าอมเขียว ลายดำ หางน้ำเงินลายทอง "DIO" ·
//   ไวรัส = เขียวมะนาวเรือง · การควบคุมร่าง = ตาเหลืองม่านตาตั้ง (ตาสัตว์เลื้อยคลาน) · ฝุ่นดินตอนกระทืบ/พุ่ง
//  เหตุการณ์จาก server (socket "dinoFx" → useCharSocketFx):
//   dinoVirus     สปอร์ไวรัสพุ่งรอบเป้า (n = หน่วยที่ติดอยู่)   dinoScorn     เกราะแตกกระจาย → เกล็ดงอก
//   dinoPossess   เถาไวรัสจากดิเอโก้ไปรัดเป้า → ตาสัตว์เลื้อยคลาน   dinoRelease  ควันเขียวจางหาย (หลุดการควบคุม)
//   dinoSwarm     ฝูงไดโนเสาร์ตัวเล็กวิ่งตามแนว               dinoPin       ฝูงวนรอบเป้า + รอยข่วน
//   dinoCharge    พุ่งชน: เส้นความเร็ว + แรงกระแทกที่คนในแนว      dinoLeap      กระโดดโค้ง → ขย่ำ (ขากรรไกรงับ)
//   dinoDrain     ลูกแสงแต้มสกิลไหลจากเป้ามาหาดิเอโก้          dinoStomp     กระโดดสูงลงจุด
//   dinoStompHit  คลื่นกระแทกข้าวหลามตัดรัศมี 4 + รอยแตก + ฝุ่น  dinoTransform / dinoRevert  เกล็ดระเบิดออก / หดเข้า
//  ค้างบนตัว (boardUnits): u.dino = { form, frenzy } (ร่างไดโนเสาร์ = ไอหายใจ + เงาหางบนพื้น · ความบ้าคลั่ง = จุดแดงในตา) ·
//   u.dvirus = จำนวนไวรัส (สปอร์ลอยเหนือหัว — ใครก็ติดได้) · u.possessed = กำลังถูกควบคุม (ตาสัตว์เลื้อยคลานเหนือหัว + เถารัดตัว)
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const REDUCED = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;
const hash = (a) => { const v = Math.sin(a * 127.1) * 43758.5453; return v - Math.floor(v); };
// สี: ผิวไดโนเสาร์ (ฟ้าอมเขียว) · ลายเข้ม · น้ำเงินหาง · ทอง · ไวรัส (เขียวมะนาว) · เลือด · ฝุ่น
const SKIN = "95,200,185", DARK = "20,40,45", NAVY = "45,60,160", GOLD = "235,205,95", VIRUS = "160,240,70", LIME = "215,255,150", BLOOD = "200,30,40", DUST = "170,150,120";

// จังหวะ (ms) — server characters/diego_dino.js T (วินาที) ต้องตรงกัน
export const DINO_T = { charge: 750, leap: 700, swarm: 900, stomp: 950, possess: 1200 };
export const DINO_FX_DUR = {
  dinoVirus: 800, dinoScorn: 1100, dinoPossess: 1400, dinoRelease: 900, dinoSwarm: 1000, dinoPin: 1000,
  dinoCharge: 900, dinoLeap: 800, dinoDrain: 1000, dinoStomp: 1000, dinoStompHit: 1300, dinoTransform: 1200, dinoRevert: 900,
};
export const isDinoFx = (kind) => typeof kind === "string" && kind in DINO_FX_DUR;

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, hy: by - s * 0.55 * K, K };
}
function glow(g, x, y, r, rgb, a, core = LIME) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(core, a));
  gr.addColorStop(0.4, rgba(rgb, a * 0.7));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function ring(g, x, y, r, w, a, rgb) {
  if (a <= 0 || r <= 0) return;
  g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, w);
  g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, TAU); g.stroke();
}
// สปอร์ไวรัส: จุดเขียวมีขอบเรือง
function spore(g, x, y, r, a) {
  glow(g, x, y, r * 2.4, VIRUS, a * 0.45);
  g.fillStyle = rgba(VIRUS, a); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = rgba(LIME, a * 0.9); g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, TAU); g.fill();
}
// ฝุ่นดินพุ่งออกรอบจุด
function dust(g, x, y, s, q, seed, k, a = 1) {
  for (let i = 0; i < k; i++) {
    const h = hash(seed + i * 2.3), h2 = hash(seed + i * 5.1);
    const ang = h * TAU, d = s * (0.2 + 0.9 * easeOut(q) * (0.4 + h2));
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * 0.45 - s * 0.25 * Math.sin(q * Math.PI) * h2;
    g.fillStyle = rgba(DUST, a * (1 - q) * (0.35 + 0.4 * h));
    g.beginPath(); g.arc(px, py, Math.max(1.2, s * (0.03 + 0.05 * h2) * (1 + q)), 0, TAU); g.fill();
  }
}
// ตาสัตว์เลื้อยคลาน (เหลือง ม่านตาตั้ง) — สัญลักษณ์การควบคุมร่าง
function reptileEye(g, x, y, s, a, blink = 1) {
  if (a <= 0) return;
  const w = s * 0.3, h = s * 0.15 * blink;
  glow(g, x, y, s * 0.45, VIRUS, a * 0.4);
  g.fillStyle = rgba("250,225,80", a);
  g.beginPath(); g.ellipse(x, y, w, Math.max(0.5, h), 0, 0, TAU); g.fill();
  g.strokeStyle = rgba(DARK, a); g.lineWidth = Math.max(1, s * 0.012);
  g.beginPath(); g.ellipse(x, y, w, Math.max(0.5, h), 0, 0, TAU); g.stroke();
  g.fillStyle = rgba(DARK, a);
  g.beginPath(); g.ellipse(x, y, w * 0.13, Math.max(0.5, h * 0.92), 0, 0, TAU); g.fill();
}
// ไดโนเสาร์ตัวเล็ก (เงา): ลำตัวรี หัวสามเหลี่ยม หางยาว ขาวิ่ง — หันตามทิศ (ang) · phase = จังหวะขา
function raptor(g, x, y, s, ang, a, phase) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.rotate(ang);
  const k = s * 0.13;
  g.fillStyle = rgba(SKIN, a); g.strokeStyle = rgba(DARK, a * 0.9); g.lineWidth = Math.max(1, k * 0.12);
  // หาง
  g.beginPath(); g.moveTo(-k * 0.6, 0); g.quadraticCurveTo(-k * 1.6, -k * 0.25 + Math.sin(phase) * k * 0.2, -k * 2.4, -k * 0.1); g.lineTo(-k * 0.6, k * 0.25); g.closePath(); g.fill();
  // ลำตัว
  g.beginPath(); g.ellipse(0, 0, k * 0.8, k * 0.42, 0, 0, TAU); g.fill(); g.stroke();
  // หัว + ขากรรไกร
  g.beginPath(); g.moveTo(k * 0.6, -k * 0.35); g.lineTo(k * 1.55, -k * 0.15); g.lineTo(k * 1.4, k * 0.12); g.lineTo(k * 0.65, k * 0.2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = rgba("250,225,80", a); g.beginPath(); g.arc(k * 1.05, -k * 0.17, Math.max(0.8, k * 0.09), 0, TAU); g.fill();
  // ขา
  g.strokeStyle = rgba(NAVY, a); g.lineWidth = Math.max(1, k * 0.18);
  for (const off of [0, Math.PI]) {
    const sw = Math.sin(phase + off) * k * 0.45;
    g.beginPath(); g.moveTo(-k * 0.05, k * 0.25); g.lineTo(sw, k * 0.85); g.stroke();
  }
  // ลายดำ
  g.strokeStyle = rgba(DARK, a * 0.7); g.lineWidth = Math.max(1, k * 0.08);
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * k * 0.3, -k * 0.38); g.lineTo(i * k * 0.3 + k * 0.1, -k * 0.05); g.stroke(); }
  g.restore();
}
// รอยข่วน 3 เส้นเฉียง
function clawMarks(g, x, y, s, q, a, rgb = BLOOD) {
  const L = s * 0.42 * easeOut(clamp01(q * 2.5));
  g.save(); g.lineCap = "round";
  for (let i = -1; i <= 1; i++) {
    const ox = i * s * 0.09;
    g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1.5, s * 0.03);
    g.beginPath(); g.moveTo(x + ox - L * 0.5, y - L * 0.55); g.lineTo(x + ox + L * 0.5, y + L * 0.55); g.stroke();
    g.strokeStyle = rgba("255,235,235", a * 0.8); g.lineWidth = Math.max(1, s * 0.01);
    g.beginPath(); g.moveTo(x + ox - L * 0.5, y - L * 0.55); g.lineTo(x + ox + L * 0.5, y + L * 0.55); g.stroke();
  }
  g.restore();
}
// ขากรรไกรงับ: ฟันบน/ล่างโค้งปิดเข้าหากัน (close 0→1)
function jaws(g, x, y, s, close, a) {
  const gap = s * 0.32 * (1 - easeIn(close)), w = s * 0.5;
  g.save();
  for (const sgn of [-1, 1]) {
    const yy = y + sgn * gap;
    g.fillStyle = rgba(SKIN, a); g.strokeStyle = rgba(DARK, a); g.lineWidth = Math.max(1, s * 0.015);
    g.beginPath(); g.moveTo(x - w, yy); g.quadraticCurveTo(x, yy + sgn * s * 0.18, x + w, yy); g.lineTo(x + w, yy + sgn * s * 0.06); g.quadraticCurveTo(x, yy + sgn * s * 0.26, x - w, yy + sgn * s * 0.06); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = rgba("250,250,240", a);
    for (let i = 0; i < 7; i++) {
      const tx = x - w * 0.85 + (i / 6) * w * 1.7, ty = yy + sgn * s * 0.02 * Math.cos((i / 6 - 0.5) * Math.PI);
      g.beginPath(); g.moveTo(tx - s * 0.025, ty); g.lineTo(tx + s * 0.025, ty); g.lineTo(tx, ty - sgn * s * 0.07); g.closePath(); g.fill();
    }
  }
  g.restore();
}
// เกล็ด/เศษเกราะกระเด็น (dir 1 = ออก · −1 = หดเข้า)
function scales(g, x, y, s, q, seed, k, a, rgb, dir = 1) {
  for (let i = 0; i < k; i++) {
    const h = hash(seed + i * 3.7), h2 = hash(seed + i * 9.1);
    const ang = h * TAU, qq = dir > 0 ? easeOut(q) : 1 - easeOut(q);
    const d = s * (0.1 + 0.85 * qq * (0.5 + h2));
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * 0.7 + (dir > 0 ? s * 0.35 * q * q : 0);
    g.save(); g.translate(px, py); g.rotate(ang + q * 6 * (h - 0.5));
    g.fillStyle = rgba(rgb, a * (dir > 0 ? 1 - q : q) * (0.6 + 0.4 * h));
    const z = s * (0.035 + 0.04 * h2);
    g.beginPath(); g.moveTo(0, -z); g.lineTo(z * 0.8, z * 0.6); g.lineTo(-z * 0.8, z * 0.6); g.closePath(); g.fill();
    g.restore();
  }
}

// ---------- เหตุการณ์ ----------
function virusFx(g, e, p, seed, lowQ) {
  const B = bodyAt(e.x, e.y);
  g.save(); g.globalCompositeOperation = "lighter";
  ring(g, B.bx, B.by - B.s * 0.03, B.s * (0.15 + 0.5 * easeOut(p)), B.s * 0.04, (1 - p) * 0.8, VIRUS);
  const k = lowQ ? 6 : 12;
  for (let i = 0; i < k; i++) {
    const h = hash(seed + i * 4.3), ang = h * TAU, d = B.s * (0.12 + 0.42 * easeOut(p));
    spore(g, B.bx + Math.cos(ang) * d, B.hy + Math.sin(ang) * d * 0.6 - B.s * 0.2 * p, B.s * 0.05 * (1 + h), (1 - p) * 0.95);
  }
  g.restore();
}
function scornFx(g, e, p, seed, lowQ) {
  const B = bodyAt(e.x, e.y);
  g.save();
  // เกราะแตก (เทาฟ้า) ช่วงแรก → เกล็ดเขียวงอกเรือง
  if (p < 0.55) scales(g, B.bx, B.hy, B.s, p / 0.55, seed, lowQ ? 8 : 16, 0.95, "170,190,210");
  g.globalCompositeOperation = "lighter";
  const q = clamp01((p - 0.3) / 0.7);
  if (q > 0) {
    glow(g, B.bx, B.hy, B.s * (0.3 + 0.35 * easeOut(q)), SKIN, (1 - q) * 0.7, LIME);
    for (let i = 0; i < 3; i++) ring(g, B.bx, B.by - B.s * (0.05 + 0.45 * q) - i * B.s * 0.12, B.s * (0.32 - i * 0.05), B.s * 0.025, (1 - q) * 0.6, SKIN);
  }
  if (p < 0.25) glow(g, B.bx, B.hy, B.s * 0.5, BLOOD, (1 - p / 0.25) * 0.5, "255,200,200");
  g.restore();
}
function possessFx(g, e, now, p, seed, lowQ) {
  if (!e.to) return;
  const A = bodyAt(e.x, e.y), B = bodyAt(e.to.x, e.to.y);
  const up = clamp01(p / 0.55);
  const mx = (A.bx + B.bx) / 2, my = Math.min(A.hy, B.hy) - Math.hypot(B.bx - A.bx, B.hy - A.hy) * 0.35;
  const at = (t) => [(1 - t) * (1 - t) * A.bx + 2 * (1 - t) * t * mx + t * t * B.bx, (1 - t) * (1 - t) * A.hy + 2 * (1 - t) * t * my + t * t * B.hy];
  const fade = p > 0.8 ? (1 - p) / 0.2 : 1;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  // เถาไวรัส 3 เส้นบิดเกลียว
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = rgba(k ? VIRUS : LIME, (k ? 0.7 : 0.95) * fade); g.lineWidth = A.s * (k ? 0.04 : 0.06);
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * up, [x, y] = at(t);
      const w = Math.sin(t * 14 + k * 2.1 + (REDUCED ? 0 : now / 120)) * A.s * 0.05 * (k ? 1 : 0.3);
      if (i) g.lineTo(x, y + w); else g.moveTo(x, y + w);
    }
    g.stroke();
  }
  if (!lowQ) for (let i = 0; i < 6; i++) { const t = ((i / 6) + p * 0.8) % 1; if (t < up) { const [x, y] = at(t); spore(g, x, y, A.s * 0.045, 0.85 * fade); } }
  g.restore();
  // ตาสัตว์เลื้อยคลานลืมบนหัวเป้า
  const q = clamp01((p - 0.5) / 0.3);
  if (q > 0) reptileEye(g, B.bx, B.hy - B.s * 0.55, B.s, fade, easeOut(q));
}
function releaseFx(g, e, p, seed, lowQ) {
  const B = bodyAt(e.x, e.y);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < (lowQ ? 5 : 10); i++) {
    const h = hash(seed + i * 5.5), ang = h * TAU, d = B.s * (0.1 + 0.4 * easeOut(p));
    glow(g, B.bx + Math.cos(ang) * d, B.hy - B.s * 0.4 * p + Math.sin(ang) * d * 0.4, B.s * (0.08 + 0.1 * p), VIRUS, (1 - p) * 0.5);
  }
  g.restore();
  reptileEye(g, B.bx, B.hy - B.s * 0.55, B.s, (1 - p) * 0.9, 1 - easeIn(p));
}
function swarmFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y), Bt = e.to ? bodyAt(e.to.x, e.to.y) : A;
  const n = lowQ ? 4 : 7;
  for (let i = 0; i < n; i++) {
    const lag = (i / n) * 0.35, q = clamp01((p - lag) / 0.65);
    if (q <= 0) continue;
    const h = hash(seed + i * 2.9), off = (h - 0.5) * A.s * 0.4;
    const ang = Math.atan2(Bt.by - A.by, Bt.bx - A.bx), nx = -Math.sin(ang), ny = Math.cos(ang);
    const x = A.bx + (Bt.bx - A.bx) * easeOut(q) + nx * off, y = A.by + (Bt.by - A.by) * easeOut(q) + ny * off * 0.5 - A.s * 0.08;
    dust(g, x, y + A.s * 0.06, A.s * 0.3, q, seed + i, 3, 0.7);
    raptor(g, x, y - Math.abs(Math.sin(q * 18 + i)) * A.s * 0.04, A.s * (0.85 + 0.3 * h), Math.cos(ang) < 0 ? Math.PI : 0, q > 0.92 ? (1 - q) / 0.08 : 1, (REDUCED ? 0 : now / 40) + i);
  }
  if (e.targetId && p > 0.7) clawMarks(g, Bt.bx, Bt.hy, Bt.s, (p - 0.7) / 0.3, 1 - p);
}
function pinFx(g, e, now, p, seed, lowQ) {
  const B = bodyAt(e.x, e.y);
  const n = lowQ ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + (REDUCED ? 0 : p * 3.2);
    const x = B.bx + Math.cos(ang) * B.s * 0.45, y = B.by + Math.sin(ang) * B.s * 0.22 - B.s * 0.08;
    raptor(g, x, y, B.s * 0.75, ang + Math.PI / 2, p > 0.8 ? (1 - p) / 0.2 : 1, (REDUCED ? 0 : now / 45) + i);
  }
  clawMarks(g, B.bx, B.hy, B.s, p, (1 - p) * 0.9);
}
function chargeFx(g, e, now, p, seed, lowQ) {
  const path = Array.isArray(e.path) && e.path.length ? e.path : [{ x: e.x, y: e.y }];
  const pts = path.map((c) => bodyAt(c.x, c.y));
  const A = pts[0], Z = pts[pts.length - 1];
  const hitP = 0.45;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  // เส้นความเร็ว (ฟ้าอมเขียว + น้ำเงิน) ลากตามทาง
  const run = easeOut(clamp01(p / hitP));
  for (let k = 0; k < (lowQ ? 3 : 6); k++) {
    const off = (hash(seed + k) - 0.5) * A.s * 0.4;
    g.strokeStyle = rgba(k % 2 ? NAVY : SKIN, 0.6 * (1 - p));
    g.lineWidth = A.s * (0.02 + 0.02 * hash(seed + k * 3));
    g.beginPath(); g.moveTo(A.bx, A.hy + off * 0.5); g.lineTo(A.bx + (Z.bx - A.bx) * run, A.hy + (Z.hy - A.hy) * run + off * 0.5); g.stroke();
  }
  // หัวพุ่ง: ไดโนเสาร์คำราม (เงาใหญ่) นำหน้า
  if (p < hitP + 0.15) raptor(g, A.bx + (Z.bx - A.bx) * run, A.by + (Z.by - A.by) * run - A.s * 0.1, A.s * 1.6, Z.bx < A.bx ? Math.PI : 0, p < hitP ? 0.75 : (hitP + 0.15 - p) / 0.15 * 0.75, (REDUCED ? 0 : now / 35));
  g.restore();
  // แรงกระแทกที่คนในแนว
  const q = clamp01((p - hitP * 0.6) / (1 - hitP * 0.6));
  for (const h of e.hits || []) {
    if (!h.at || q <= 0) continue;
    const B = bodyAt(h.at.x, h.at.y);
    g.save(); g.globalCompositeOperation = "lighter";
    if (!h.dodge) {
      ring(g, B.bx, B.by - B.s * 0.03, B.s * (0.2 + 0.6 * easeOut(q)), B.s * 0.05, (1 - q) * 0.9, GOLD);
      glow(g, B.bx, B.hy, B.s * 0.45 * (1 - q * 0.5), SKIN, (1 - q) * 0.7, "255,255,230");
    } else ring(g, B.bx, B.by - B.s * 0.03, B.s * (0.2 + 0.3 * q), B.s * 0.02, (1 - q) * 0.5, "220,220,220");
    g.restore();
    if (!h.dodge) dust(g, B.bx, B.by, B.s, q, seed + 7, lowQ ? 5 : 10);
  }
}
function leapFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.from ? e.from.x : e.x, e.from ? e.from.y : e.y), Z = e.to ? bodyAt(e.to.x, e.to.y) : A;
  const landP = 0.55, q = easeOut(clamp01(p / landP));
  const hgt = A.s * (0.6 + 0.12 * Math.hypot(Z.bx - A.bx, Z.by - A.by) / A.s);
  const x = A.bx + (Z.bx - A.bx) * q, y = A.by + (Z.by - A.by) * q - Math.sin(q * Math.PI) * hgt;
  // เงาบนพื้น
  g.fillStyle = rgba(DARK, 0.3 * (1 - p)); g.beginPath(); g.ellipse(A.bx + (Z.bx - A.bx) * q, A.by + (Z.by - A.by) * q, A.s * 0.3, A.s * 0.12, 0, 0, TAU); g.fill();
  if (p < landP + 0.1) raptor(g, x, y - A.s * 0.15, A.s * 1.5, Z.bx < A.bx ? Math.PI - 0.4 + q * 0.8 : -0.4 + q * 0.8, 0.85, (REDUCED ? 0 : now / 30));
  const r = clamp01((p - landP) / (1 - landP));
  if (r > 0) {
    dust(g, Z.bx, Z.by, Z.s, r, seed, lowQ ? 5 : 10);
    if (e.at) {
      const T2 = bodyAt(e.at.x, e.at.y);
      jaws(g, T2.bx, T2.hy, T2.s, clamp01(r * 2.2), (1 - r) * 0.95);
      if (r > 0.4) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, T2.bx, T2.hy, T2.s * 0.5, BLOOD, (1 - r) * 0.7, "255,210,210"); g.restore(); }
    }
  }
}
function drainFx(g, e, now, p, seed, lowQ) {
  if (!e.to) return;
  const A = bodyAt(e.x, e.y), Z = bodyAt(e.to.x, e.to.y);
  const n = Math.max(1, Math.min(4, e.n | 0)) * (lowQ ? 1 : 2);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const q = clamp01((p - i * 0.08) / 0.7);
    if (q <= 0 || q >= 1) continue;
    const t = easeIn(q), mx = (A.bx + Z.bx) / 2 + (hash(seed + i) - 0.5) * A.s, my = Math.min(A.hy, Z.hy) - A.s * 0.6;
    const x = (1 - t) * (1 - t) * A.bx + 2 * (1 - t) * t * mx + t * t * Z.bx, y = (1 - t) * (1 - t) * A.hy + 2 * (1 - t) * t * my + t * t * Z.hy;
    glow(g, x, y, A.s * 0.1, "90,220,255", 0.9, "230,255,255");
  }
  if (p > 0.6) glow(g, Z.bx, Z.hy, Z.s * 0.45, "90,220,255", (1 - p) / 0.4 * 0.6, "230,255,255");
  g.restore();
}
function stompFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.from ? e.from.x : e.x, e.from ? e.from.y : e.y), Z = e.to ? bodyAt(e.to.x, e.to.y) : A;
  const q = clamp01(p / 0.85), xq = easeOut(q);
  const x = A.bx + (Z.bx - A.bx) * xq, y = A.by + (Z.by - A.by) * xq - Math.sin(q * Math.PI) * A.s * 2.2;
  g.fillStyle = rgba(DARK, 0.35 * q); g.beginPath(); g.ellipse(Z.bx, Z.by, A.s * 0.45 * q, A.s * 0.2 * q, 0, 0, TAU); g.fill();
  if (p < 0.9) raptor(g, x, y - A.s * 0.1, A.s * 2.0, q < 0.5 ? (Z.bx < A.bx ? Math.PI - 0.5 : -0.5) : (Z.bx < A.bx ? Math.PI + 0.6 : 0.6), 0.9, (REDUCED ? 0 : now / 50));
}
// ข้าวหลามตัดบนกระดาน (รัศมี r รอบช่อง c) — มุมทั้ง 4 ผ่าน P (มุมมองเอียง)
function diamond(c, r) {
  return [P(c.x + 0.5, c.y + 0.5 - r - 0.5), P(c.x + 0.5 + r + 0.5, c.y + 0.5), P(c.x + 0.5, c.y + 0.5 + r + 0.5), P(c.x + 0.5 - r - 0.5, c.y + 0.5)];
}
function stompHitFx(g, e, now, p, seed, lowQ) {
  const c = { x: e.x, y: e.y }, R = Math.max(1, e.radius || 4);
  const B = bodyAt(c.x, c.y);
  g.save();
  // คลื่นกระแทกข้าวหลามตัด 2 ชั้นขยายถึงรัศมี
  for (let k = 0; k < 2; k++) {
    const q = clamp01((p - k * 0.12) / 0.75);
    if (q <= 0 || q >= 1) continue;
    const pts = diamond(c, R * easeOut(q));
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = rgba(k ? GOLD : SKIN, (1 - q) * 0.85); g.lineWidth = B.s * (k ? 0.04 : 0.08) * (1 - q * 0.5);
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
    if (!k) { g.fillStyle = rgba(DUST, (1 - q) * 0.18); g.fill(); }
  }
  // รอยแตกร้าวจากจุดลง
  g.globalCompositeOperation = "source-over";
  const cr = clamp01(p / 0.3), fade = p > 0.6 ? (1 - p) / 0.4 : 1;
  g.strokeStyle = rgba(DARK, 0.75 * fade); g.lineWidth = Math.max(1.5, B.s * 0.025); g.lineCap = "round";
  for (let i = 0; i < (lowQ ? 6 : 10); i++) {
    const ang = (i / (lowQ ? 6 : 10)) * TAU + hash(seed + i) * 0.5;
    let x = B.bx, y = B.by;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 1; j <= 4; j++) {
      const d = B.s * 0.38 * j * cr * (0.7 + 0.5 * hash(seed + i * 7 + j));
      const a2 = ang + (hash(seed + i * 11 + j) - 0.5) * 0.7;
      g.lineTo(B.bx + Math.cos(a2) * d, B.by + Math.sin(a2) * d * 0.5);
    }
    g.stroke();
  }
  dust(g, B.bx, B.by, B.s * 1.6, p, seed, lowQ ? 8 : 18);
  // คนที่โดน: วาบ
  for (const h of e.hits || []) {
    if (!h.at || h.dodge) continue;
    const T2 = bodyAt(h.at.x, h.at.y);
    g.globalCompositeOperation = "lighter";
    glow(g, T2.bx, T2.hy, T2.s * 0.4, GOLD, (1 - p) * 0.7, "255,255,230");
  }
  g.restore();
}
function transformFx(g, e, p, seed, lowQ, back) {
  const B = bodyAt(e.x, e.y);
  g.save();
  scales(g, B.bx, B.hy, B.s * (back ? 0.9 : 1.3), p, seed, lowQ ? 10 : 22, 0.95, back ? "160,200,190" : SKIN, back ? -1 : 1);
  g.globalCompositeOperation = "lighter";
  if (!back) {
    ring(g, B.bx, B.by - B.s * 0.03, B.s * (0.2 + 1.0 * easeOut(p)), B.s * 0.06, (1 - p) * 0.9, SKIN);
    ring(g, B.bx, B.by - B.s * 0.03, B.s * (0.1 + 0.7 * easeOut(p)), B.s * 0.03, (1 - p) * 0.8, GOLD);
    glow(g, B.bx, B.hy, B.s * 0.7 * (1 - p * 0.4), SKIN, (1 - p) * 0.55);
  } else glow(g, B.bx, B.hy, B.s * 0.5 * (1 - p), "200,230,220", (1 - p) * 0.4);
  g.restore();
}

export function dinoFx(g, e, now, lowQ) {
  const dur = e.dur || DINO_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "dinoVirus") virusFx(g, e, p, seed, lowQ);
  else if (e.kind === "dinoScorn") scornFx(g, e, p, seed, lowQ);
  else if (e.kind === "dinoPossess") possessFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "dinoRelease") releaseFx(g, e, p, seed, lowQ);
  else if (e.kind === "dinoSwarm") swarmFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "dinoPin") pinFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "dinoCharge") chargeFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "dinoLeap") leapFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "dinoDrain") drainFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "dinoStomp") stompFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "dinoStompHit") stompHitFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "dinoTransform") transformFx(g, e, p, seed, lowQ, false);
  else if (e.kind === "dinoRevert") transformFx(g, e, p, seed, lowQ, true);
  g.restore();
}

// ---------- ค้างบนตัว ----------
// หลังตัว: ร่างไดโนเสาร์ = เงาหางกวัดบนพื้น + ไอเขียวจางรอบเท้า (ความบ้าคลั่ง 4+ = ไอแดง)
export function dinoAuraBack(g, x, y, now, lowQ, alpha, d) {
  if (!d || d.form !== "dino") return;
  const [bx, by, s] = P(x, y);
  g.save(); g.globalAlpha *= alpha;
  const sway = REDUCED ? 0 : Math.sin(now / 420) * 0.35;
  g.strokeStyle = "rgba(20,40,45,0.28)"; g.lineWidth = s * 0.07; g.lineCap = "round";
  g.beginPath(); g.moveTo(bx - s * 0.1, by); g.quadraticCurveTo(bx - s * 0.5, by + s * 0.05 + sway * s * 0.1, bx - s * 0.75, by - s * 0.02 + sway * s * 0.18); g.stroke();
  g.globalCompositeOperation = "lighter";
  const hot = (d.frenzy | 0) >= 4;
  glow(g, bx, by - s * 0.05, s * 0.5, hot ? BLOOD : SKIN, 0.16 + 0.06 * Math.sin(now / 300), hot ? "255,170,150" : LIME);
  g.restore();
}
// หน้าตัว: ไอหายใจ (ร่างไดโนเสาร์) · สปอร์ไวรัสเหนือหัว (n) · ตาสัตว์เลื้อยคลาน + เถารัด (กำลังถูกควบคุม)
export function dinoAuraFront(g, x, y, now, lowQ, alpha, u) {
  const [bx, by, s] = P(x, y);
  const hy = by - s * 0.55;
  g.save(); g.globalAlpha *= alpha;
  if (u.dino && u.dino.form === "dino" && !lowQ) {
    const t = REDUCED ? 0.5 : (now % 1800) / 1800;
    if (t < 0.5) {
      g.globalCompositeOperation = "lighter";
      glow(g, bx + s * 0.25 + t * s * 0.3, hy - s * 0.25 - t * s * 0.15, s * (0.06 + 0.12 * t), "210,235,230", 0.3 * (1 - t * 2));
      g.globalCompositeOperation = "source-over";
    }
  }
  const n = Math.min(3, u.dvirus | 0);
  if (n > 0) {
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + (REDUCED ? 0 : now / 900);
      spore(g, bx + Math.cos(ang) * s * 0.3, hy - s * 0.5 + Math.sin(ang) * s * 0.08 + (REDUCED ? 0 : Math.sin(now / 260 + i) * s * 0.03), s * 0.06, 0.95);
    }
    if (n >= 3) glow(g, bx, hy - s * 0.5, s * 0.4, VIRUS, 0.18 + 0.1 * Math.sin(now / 200));
    g.globalCompositeOperation = "source-over";
  }
  if (u.possessed) {
    g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (let k = 0; k < 2; k++) {
      g.strokeStyle = rgba(VIRUS, 0.65); g.lineWidth = s * 0.035;
      g.beginPath();
      for (let i = 0; i <= 20; i++) {
        const t = i / 20, ang = t * TAU * 1.5 + k * Math.PI + (REDUCED ? 0 : now / 500);
        const px = bx + Math.cos(ang) * s * 0.3, py = by - s * 0.05 - t * s * 0.55 + Math.sin(ang) * s * 0.08;
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    const blink = REDUCED ? 1 : ((now % 3200) < 140 ? 0.15 : 1);
    reptileEye(g, bx, hy - s * 0.75, s, 0.95, blink);
  }
  g.restore();
}

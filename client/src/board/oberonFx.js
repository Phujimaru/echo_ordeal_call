// ============================================================
//  เอฟเฟกต์บนกระดานของโอเบรอน (วอร์ติเกิร์น) — characters/oberon_vortigern.js · GRID_PLAN §7.46
//  ธีม: หลุมกลืนกิน (แดงเลือด/ดำ) · ความเน่าเปื่อยของซาก (เขียวหม่น/น้ำตาลหนอง) · ปีกแมลงปอ (ร่างจริง) · หนอนยักษ์แห่งหลุม
//
//  ท่าตีปกติ (ฮุค attackStyle):
//   obvScythe   เคียวยมทูต: เคียวดำยักษ์ฟันโค้ง → เลือดสาด + ฝุ่นเน่าดูดเข้าหาโอเบรอน (ดูดแต้ม)
//   obvCharge   ขี่ Vesper ชน: แมลงพุ่งจากโอเบรอนถึงเป้า (ฝุ่นตามทาง) → ปะทะ = พิษเขียวระเบิด + ซากผุ
//  เหตุการณ์ socket "oberonFx" (kind → fx):
//   molt     → obvMolt     ลอกคราบ: เปลือกแตกเป็นเสี่ยง ปีกแมลงปอกาง เลือดพุ่ง
//   swallow  → obvSwallow  สนธยายามค่ำคืน: หลุมหมุนดูดทั้งกระดาน (เต็มจอ) — ฉากเข้าสนาม
//   release  → obvRelease  สนามสลาย: หลุมคายทุกคนออก
//   scythe   → obvScytheOn เปิดเคียว: วงเงาดำ + เคียวลอยขึ้นหลังตัว
//   scrap    → obvScrap    ก็แค่เศษขยะ: เศษไอเทมถูกบดเป็นฝุ่นแล้วดูดเข้าตัว
//   lie      → obvLie      Lie Like Vortigern: หนอนยักษ์ผุดจากใต้กระดาน ขดกลืน → เป้าแต่ละคนโดนกัด/หลับ
//   rot      → obvRot      เน่าเปื่อย: ควันเน่าเขียวบนหัวศัตรูที่ถูกล็อกสกิล
//   twilight → obvTwilight สนธยาเพิ่ม: หมอกม่วงแดงไหลลงหลุมรอบกระดาน
//   vesper   → obvVesper   ขึ้น/ลง/Vesper ตาย
//  Vesper ใต้หมาก: oberonVesper(g, u, now, wx, wy, liftZ) — u.obv = { mounted, vesperHp } (boardUnits.js)
// ============================================================
import { P, gEllipse } from "./boardGeo";

const TAU = Math.PI * 2;
const BLOOD = "150,8,20", CRIMSON = "220,30,40", ROT = "96,120,44", PUS = "170,150,70", BILE = "128,180,60";
const VOID = "12,4,10", BONE = "226,214,190", DUSK = "150,60,130", GLOW = "255,90,60", WING = "200,230,255";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const okT = (t) => t && Number.isFinite(t.x) && Number.isFinite(t.y);
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

export const OBV_MS = { obvScythe: 980, obvCharge: 900 };
export const OBV_HIT_P = { obvScythe: 0.48, obvCharge: 0.55 };
export const OBV_EVENT_FX = {
  molt: "obvMolt", swallow: "obvSwallow", release: "obvRelease", scythe: "obvScytheOn", scrap: "obvScrap",
  lie: "obvLie", rot: "obvRot", twilight: "obvTwilight", vesper: "obvVesper",
};
export const OBV_FX_DUR = {
  ...OBV_MS, obvMolt: 2200, obvSwallow: 3200, obvRelease: 1800, obvScytheOn: 1300, obvScrap: 1200,
  obvLie: 4200, obvRot: 1500, obvTwilight: 1800, obvVesper: 900,
};
export const isObvFx = (kind) => typeof kind === "string" && kind in OBV_FX_DUR;

// ---------- รูป ----------
const IMG_URL = { vesper: "/characters/oberon_vortigern/vesper.webp" };
const imgs = {};
function img(k) {
  if (!imgs[k] && typeof Image === "function") { const i = new Image(); i.decoding = "async"; i.src = IMG_URL[k]; imgs[k] = i; }
  const i = imgs[k];
  return i && i.complete && i.naturalWidth > 0 ? i : null;
}
export const preloadOberonArt = () => { img("vesper"); };

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, r: s * 0.4 * K, hy: by - s * 0.86 * K };
}
function halo(g, x, y, r, rgb, a) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(rgb, a));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// ควันเน่า: ก้อนหม่นขยายตัวลอยขึ้น
function rotPuff(g, x, y, r, q, n, seed, rgb = ROT) {
  for (let i = 0; i < n; i++) {
    const a = seed + i * 2.399, d = r * (0.2 + q * (0.8 + hash(i, seed) * 0.8));
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.5 - q * r * (0.6 + hash(i, 3) * 0.8);
    const rr = r * (0.25 + q * 0.5) * (0.6 + hash(i, 7) * 0.6);
    const gr = g.createRadialGradient(px, py, 0, px, py, rr);
    gr.addColorStop(0, rgba(i % 3 ? rgb : PUS, 0.55 * (1 - q)));
    gr.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
}
// หยดเลือด/หนองกระเซ็น
function splatter(g, x, y, r, q, n, seed, rgb) {
  const o = easeOut(q);
  for (let i = 0; i < n; i++) {
    const a = seed + i * 2.13, d = r * (0.3 + o * (1.1 + (i % 4) * 0.3));
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.55 + q * q * r * 1.4;
    g.fillStyle = rgba(rgb, 1 - q);
    g.beginPath(); g.ellipse(px, py, Math.max(1, r * 0.09 * (1 - q * 0.5)), Math.max(1, r * 0.06), a, 0, TAU); g.fill();
  }
}
// เศษกระดูก/ซาก
function bones(g, x, y, r, q, n, seed) {
  for (let i = 0; i < n; i++) {
    const a = seed + i * 1.91, d = r * (0.4 + easeOut(q) * (0.9 + hash(i, 11)));
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.5 + q * q * r * 1.2;
    g.save(); g.translate(px, py); g.rotate(a + q * 6);
    g.fillStyle = rgba(BONE, (1 - q) * 0.9);
    g.fillRect(-r * 0.12, -r * 0.025, r * 0.24, r * 0.05);
    g.beginPath(); g.arc(-r * 0.12, 0, r * 0.04, 0, TAU); g.arc(r * 0.12, 0, r * 0.04, 0, TAU); g.fill();
    g.restore();
  }
}
// เคียว (ใบโค้งดำ + ขอบแดง) — ang = มุมด้าม
function scytheShape(g, x, y, L, ang, a) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha *= a;
  g.shadowColor = "rgba(255,30,30,.75)"; g.shadowBlur = Math.max(4, L * 0.08);
  g.strokeStyle = "#1a0c10"; g.lineWidth = Math.max(3, L * 0.05); g.lineCap = "round";
  g.beginPath(); g.moveTo(0, L * 0.5); g.lineTo(0, -L * 0.5); g.stroke();
  g.fillStyle = "#0b0507";
  g.beginPath(); g.moveTo(0, -L * 0.5);
  g.quadraticCurveTo(L * 0.85, -L * 0.72, L * 1.05, -L * 0.1);
  g.quadraticCurveTo(L * 0.6, -L * 0.4, 0, -L * 0.3); g.closePath(); g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = rgba(CRIMSON, 0.9); g.lineWidth = Math.max(1, L * 0.018);
  g.beginPath(); g.moveTo(L * 0.05, -L * 0.31); g.quadraticCurveTo(L * 0.6, -L * 0.4, L * 1.05, -L * 0.1); g.stroke();
  g.restore();
}
// ปีกแมลงปอ 4 ใบ (ยาวบาง กางออกข้าง · เส้นปีกตาข่าย · สีรุ้งจาง) — k = กาง 0→1
function wings(g, x, y, s, k, a, t) {
  if (a <= 0 || k <= 0) return;
  const flap = REDUCED ? 0 : Math.sin(t / 45) * 0.08;
  for (const side of [-1, 1]) for (const lo of [0, 1]) {
    g.save(); g.translate(x, y); g.scale(side, 1);
    g.rotate((lo ? 0.32 : -0.12) + (lo ? -flap : flap) + (1 - k) * 1.2);
    const L = s * (lo ? 1.15 : 1.4) * k, W = s * (lo ? 0.2 : 0.22);
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(L * 0.25, -W, L * 0.8, -W * 0.9, L, -W * 0.15);
    g.bezierCurveTo(L * 0.85, W * 0.6, L * 0.3, W * 0.55, 0, 0);
    const gr = g.createLinearGradient(0, 0, L, 0);
    gr.addColorStop(0, `rgba(170,200,230,${0.4 * a})`); gr.addColorStop(0.5, `rgba(220,190,240,${0.22 * a})`); gr.addColorStop(1, `rgba(255,255,255,${0.08 * a})`);
    g.fillStyle = gr; g.fill();
    g.strokeStyle = `rgba(30,40,60,${0.7 * a})`; g.lineWidth = 1; g.stroke();
    g.save(); g.clip();
    g.strokeStyle = `rgba(20,30,50,${0.35 * a})`; g.lineWidth = 0.6;
    for (let i = 1; i < 14; i++) { const xx = (L * i) / 14; g.beginPath(); g.moveTo(xx, -W); g.lineTo(xx + W * 0.4, W); g.stroke(); }
    g.beginPath(); g.moveTo(0, 0); g.lineTo(L, -W * 0.2); g.stroke();
    g.restore();
    g.restore();
  }
}

// ---------- ท่าตีปกติ ----------
function scytheStrike(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1), hit = OBV_HIT_P.obvScythe;
  const L = A.s * 2.7;
  // เงาดำรวมที่มือ
  halo(g, A.bx, A.hy, A.r * 1.6, VOID, 0.6 * (1 - p));
  // เคียววาดโค้งจากหลังไปหน้า: มุมเริ่มยกสูง → ฟันลงผ่านเป้า
  const k = p < hit ? easeIn(clamp01(p / hit)) : 1;
  const dir = Math.atan2(B.hy - A.hy, B.bx - A.bx);
  const ang = dir - 2.2 + k * 2.6;
  const mx = A.bx + (B.bx - A.bx) * 0.45, my = A.hy + (B.hy - A.hy) * 0.45 - A.s * 0.3;
  scytheShape(g, mx, my, L, ang, p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15);
  // รอยฟันโค้งสีเลือด
  if (p > hit * 0.6) {
    const q = clamp01((p - hit * 0.6) / (1 - hit * 0.6));
    g.strokeStyle = rgba(CRIMSON, (1 - q) * 0.95); g.lineWidth = A.s * 0.14 * (1 - q * 0.6); g.lineCap = "round";
    g.beginPath(); g.arc(mx, my, L * 0.7, dir - 1.1, dir - 1.1 + 2.0 * easeOut(clamp01(q * 2))); g.stroke();
    g.strokeStyle = rgba("255,220,220", (1 - q) * 0.7); g.lineWidth = A.s * 0.03;
    g.beginPath(); g.arc(mx, my, L * 0.7, dir - 1.1, dir - 1.1 + 2.0 * easeOut(clamp01(q * 2))); g.stroke();
  }
  if (p < hit) return;
  const q = clamp01((p - hit) / (1 - hit));
  halo(g, B.bx, B.hy, B.r * (1 + q * 1.6), BLOOD, 0.8 * (1 - q));
  splatter(g, B.bx, B.hy, B.r * 1.4, q, lowQ ? 10 : 22, seed, BLOOD);
  rotPuff(g, B.bx, B.hy, B.r * 1.2, q, lowQ ? 4 : 8, seed, ROT);
  // วิญญาณ (แต้มสกิล) ถูกดูดกลับเข้าหาโอเบรอน
  for (let i = 0; i < (lowQ ? 3 : 6); i++) {
    const qq = clamp01(q * 1.3 - i * 0.07), x = B.bx + (A.bx - B.bx) * easeIn(qq), y = B.hy + (A.hy - B.hy) * easeIn(qq) - Math.sin(qq * Math.PI) * A.s * (0.4 + i * 0.08);
    halo(g, x, y, A.r * 0.28, DUSK, (1 - qq) * 0.9);
  }
}
function chargeStrike(g, e, p, seed, lowQ, now) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1), hit = OBV_HIT_P.obvCharge;
  const im = img("vesper");
  // แมลงพุ่งไป-กลับ
  const go = p < hit ? easeIn(clamp01(p / hit)) : 1 - easeOut(clamp01((p - hit) / (1 - hit)));
  const x = A.bx + (B.bx - A.bx) * go, y = A.by + (B.by - A.by) * go - A.s * 0.35;
  // ฝุ่นตามทาง
  for (let i = 0; i < (lowQ ? 5 : 12); i++) {
    const f = clamp01(go - i * 0.06);
    const px = A.bx + (B.bx - A.bx) * f, py = A.by + (B.by - A.by) * f;
    halo(g, px, py - A.s * 0.1, A.r * (0.5 + i * 0.05), "110,80,60", 0.25 * (1 - p));
  }
  if (im) {
    const H = A.s * 0.9, W = (H * im.naturalWidth) / im.naturalHeight, face = B.bx >= A.bx ? -1 : 1;
    g.save(); g.translate(x, y); g.scale(face, 1); g.rotate(-0.12 * Math.sin(p * Math.PI));
    g.globalAlpha *= 0.95;
    g.drawImage(im, -W * 0.5, -H * 0.6, W, H);
    g.restore();
  }
  if (p < hit) return;
  const q = clamp01((p - hit) / (1 - hit));
  halo(g, B.bx, B.hy, B.r * (1 + q * 1.8), BILE, 0.75 * (1 - q));
  splatter(g, B.bx, B.hy, B.r * 1.3, q, lowQ ? 8 : 18, seed, BILE);
  bones(g, B.bx, B.by - B.s * 0.2, B.r, q, lowQ ? 4 : 8, seed);
  rotPuff(g, B.bx, B.by - B.s * 0.2, B.r * 1.3, q, lowQ ? 4 : 9, seed + 1, ROT);
}

// ---------- เหตุการณ์ ----------
function moltFx(g, e, p, seed, lowQ, now) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  // 0–0.4 เปลือกสั่น/ร้าว · 0.4 แตก · 0.4–1 ปีกกาง เลือดพุ่ง ซากเปลือกร่วง
  const crack = clamp01(p / 0.4), burst = clamp01((p - 0.4) / 0.6);
  halo(g, A.bx, A.hy, A.r * (1.5 + crack), VOID, 0.75 * (1 - burst * 0.7));
  if (p < 0.4) {
    const sh = REDUCED ? 0 : Math.sin(now / 25) * A.r * 0.06 * crack;
    g.fillStyle = rgba("40,30,40", 0.85);
    g.beginPath(); g.ellipse(A.bx + sh, A.hy, A.r * 0.9, A.r * 1.3, 0, 0, TAU); g.fill();
    g.strokeStyle = rgba(CRIMSON, crack); g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = seed + i; g.beginPath(); g.moveTo(A.bx + sh, A.hy); g.lineTo(A.bx + sh + Math.cos(a) * A.r * crack, A.hy + Math.sin(a) * A.r * 1.2 * crack); g.stroke(); }
    return;
  }
  wings(g, A.bx, A.hy, A.s * 0.9, easeOut(burst), 1 - clamp01((burst - 0.7) / 0.3), now);
  splatter(g, A.bx, A.hy, A.r * 1.6, burst, lowQ ? 12 : 28, seed, BLOOD);
  // เปลือกแตกร่วง
  for (let i = 0; i < (lowQ ? 6 : 12); i++) {
    const a = seed + i * 0.52, d = A.r * (0.4 + easeOut(burst) * 1.6);
    const x = A.bx + Math.cos(a) * d, y = A.hy + Math.sin(a) * d * 0.6 + burst * burst * A.s;
    g.save(); g.translate(x, y); g.rotate(a + burst * 5); g.fillStyle = rgba("52,40,46", 1 - burst);
    g.beginPath(); g.moveTo(0, -A.r * 0.18); g.lineTo(A.r * 0.15, A.r * 0.1); g.lineTo(-A.r * 0.12, A.r * 0.14); g.closePath(); g.fill();
    g.restore();
  }
  g.strokeStyle = rgba(GLOW, 1 - burst); g.lineWidth = 3;
  g.beginPath(); g.ellipse(A.bx, A.by, A.r * (1 + burst * 3), A.r * (0.8 + burst * 2.4) * 0.5, 0, 0, TAU); g.stroke();
}
// หลุมหมุนดูด — ศูนย์กลางที่โอเบรอน รัศมีคลุมทั้งกระดาน
function vortex(g, cx, cy, R, spin, a, lowQ, seed, inward) {
  if (a <= 0) return;
  const rings = lowQ ? 7 : 14;
  for (let i = rings; i >= 0; i--) {
    const f = ((i / rings) + (inward ? -spin : spin) * 0.15 % 1 + 1) % 1;
    const r = R * (0.08 + f * 0.95);
    g.strokeStyle = rgba(i % 2 ? BLOOD : "60,10,16", a * (0.25 + 0.6 * f));
    g.lineWidth = Math.max(1.5, R * 0.035 * f);
    g.beginPath(); g.ellipse(cx, cy, r, r * 0.52, spin * (0.6 + f * 0.6) + i, 0.4, TAU - 0.6); g.stroke();
  }
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45);
  gr.addColorStop(0, rgba(VOID, a)); gr.addColorStop(0.6, rgba("40,4,10", a * 0.7)); gr.addColorStop(1, rgba(BLOOD, 0));
  g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, R * 0.45, R * 0.24, 0, 0, TAU); g.fill();
  // ฝุ่น/ซากถูกดูดเป็นเกลียว
  for (let i = 0; i < (lowQ ? 24 : 70); i++) {
    const ph = (hash(i, seed) + spin * (0.3 + hash(i, 2) * 0.4)) % 1, rr = R * (1 - ph) * (0.5 + hash(i, 4) * 0.6);
    const ang = hash(i, 5) * TAU + ph * 6 * (inward ? 1 : -1);
    const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * 0.52;
    g.fillStyle = rgba(i % 5 === 0 ? BONE : i % 3 ? "120,70,60" : ROT, a * Math.sin(ph * Math.PI) * 0.9);
    g.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
}
function swallowFx(g, e, p, seed, lowQ, now) {
  const A = bodyAt(e.x, e.y, 1);
  const R = A.s * 9;
  const open = easeOut(clamp01(p / 0.3)), close = clamp01((p - 0.75) / 0.25);
  vortex(g, A.bx, A.by, R * open, now / 900, (1 - close) * 0.95, lowQ, seed, true);
  // แฟลชแดงตอนกลืน
  if (p > 0.35 && p < 0.6) halo(g, A.bx, A.by, R * 1.2, CRIMSON, 0.35 * Math.sin(((p - 0.35) / 0.25) * Math.PI));
  wings(g, A.bx, A.hy, A.s * 1.4, open, 1 - close, now);
}
function releaseFx(g, e, p, seed, lowQ, now) {
  const A = bodyAt(e.x, e.y, 1);
  const R = A.s * 8 * (1 - easeOut(p) * 0.3);
  vortex(g, A.bx, A.by, R, now / 700, 1 - p, lowQ, seed, false);
  halo(g, A.bx, A.by, A.s * 6 * easeOut(p), "255,200,180", 0.4 * (1 - p));
}
function scytheOnFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  halo(g, A.bx, A.by, A.r * (1.2 + p * 1.4), VOID, 0.8 * (1 - p));
  g.strokeStyle = rgba(CRIMSON, 1 - p); g.lineWidth = 2;
  g.beginPath(); g.ellipse(A.bx, A.by, A.r * (0.8 + easeOut(p) * 2), A.r * (0.4 + easeOut(p)), 0, 0, TAU); g.stroke();
  scytheShape(g, A.bx + A.r * 0.6, A.hy - A.s * 0.3 - easeOut(p) * A.s * 0.5, A.s * 1.5, -0.5, Math.sin(p * Math.PI));
  rotPuff(g, A.bx, A.by, A.r * 1.4, p, lowQ ? 4 : 10, seed, VOID);
}
function scrapFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1), n = Math.min(8, Math.max(1, e.n | 0));
  for (let i = 0; i < n; i++) {
    const a = seed + i * (TAU / n), q = clamp01(p * 1.4 - i * 0.05);
    const d = A.r * 1.6 * (1 - easeIn(q));
    const x = A.bx + Math.cos(a) * d, y = A.hy + Math.sin(a) * d * 0.6;
    g.save(); g.translate(x, y); g.rotate(q * 8);
    g.fillStyle = rgba("140,120,90", 1 - q); g.fillRect(-A.r * 0.15, -A.r * 0.15, A.r * 0.3 * (1 - q), A.r * 0.3 * (1 - q));
    g.restore();
  }
  rotPuff(g, A.bx, A.hy, A.r, p, lowQ ? 4 : 8, seed, "110,95,70");
  if (p > 0.6) halo(g, A.bx, A.hy, A.r * 1.5, BILE, (1 - p) * 1.2);
}
// หนอนยักษ์แห่งหลุม: ปล้องขดเป็นวงรอบกระดาน ผุดขึ้น → ปากอ้ากัดเป้า
function lieFx(g, e, p, seed, lowQ, now) {
  const A = bodyAt(e.x, e.y, 1);
  const R = A.s * 4.6, rise = easeOut(clamp01(p / 0.35)), fall = clamp01((p - 0.82) / 0.18);
  // ท้องฟ้าอัสดง (ม่วงส้ม) ทับกระดานบางๆ
  halo(g, A.bx, A.by - A.s, R * 2.2, DUSK, 0.32 * (1 - fall) * rise);
  const segs = lowQ ? 26 : 56;
  const pos = (f) => {
    const ang = f * TAU * 1.25 + now / 1600, r = R * (0.55 + f * 0.6);
    return { ang, x: A.bx + Math.cos(ang) * r, y: A.by + Math.sin(ang) * r * 0.5 - rise * A.s * (1.2 + Math.sin(f * 9 + now / 300) * 0.25) + fall * A.s * 2 };
  };
  for (let i = segs - 1; i >= 0; i--) {
    const f = i / segs, c = pos(f), n = pos(Math.max(0, f - 0.01));
    const tang = Math.atan2(c.y - n.y, c.x - n.x);
    const sz = A.s * (0.8 - f * 0.4);
    const band = i % 3 === 0;
    g.save(); g.translate(c.x, c.y); g.rotate(tang);
    const gr = g.createLinearGradient(0, -sz, 0, sz);
    gr.addColorStop(0, rgba(band ? "120,80,70" : "160,120,105", 1 - fall)); gr.addColorStop(0.45, rgba("92,52,58", 1 - fall)); gr.addColorStop(1, rgba("18,6,10", 1 - fall));
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, sz * 0.55, sz, 0, 0, TAU); g.fill();
    g.strokeStyle = rgba("20,6,10", 0.7 * (1 - fall)); g.lineWidth = 1.2; g.stroke();
    // ขนหยาบดำยาว (แบบภาพ skill3.2)
    if (i % 2 === 0) {
      g.strokeStyle = rgba("14,6,8", 0.85 * (1 - fall)); g.lineWidth = 1;
      for (let k = 0; k < 5; k++) { const yy = (k - 2) * sz * 0.35; g.beginPath(); g.moveTo(0, yy); g.quadraticCurveTo(sz * 0.4, yy + sz * 0.9, sz * (0.2 + hash(i, k) * 0.5), yy + sz * (1.4 + hash(k, i))); g.stroke(); }
    }
    g.restore();
  }
  // หัวหนอน (ปากกลมฟันวงใน)
  const head = { x: A.bx + Math.cos(now / 1600) * R * 0.55, y: A.by + Math.sin(now / 1600) * R * 0.275 - rise * A.s * 1.6 + fall * A.s * 2 };
  const mouth = A.s * 0.85 * rise * (1 - fall);
  g.fillStyle = rgba("10,0,4", 1 - fall); g.beginPath(); g.ellipse(head.x, head.y, mouth, mouth * 0.75, 0, 0, TAU); g.fill();
  g.fillStyle = rgba(BONE, 0.9 * (1 - fall));
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; g.beginPath(); g.moveTo(head.x + Math.cos(a) * mouth, head.y + Math.sin(a) * mouth * 0.75); g.lineTo(head.x + Math.cos(a + 0.12) * mouth * 0.6, head.y + Math.sin(a + 0.12) * mouth * 0.45); g.lineTo(head.x + Math.cos(a + 0.24) * mouth, head.y + Math.sin(a + 0.24) * mouth * 0.75); g.fill(); }
  // เป้าแต่ละคน: กัด (เลือด+เน่า) · หลับ = ฟองสีม่วง Zzz
  const hits = Array.isArray(e.hits) ? e.hits : [];
  hits.forEach((h, i) => {
    if (!okT(h.at)) return;
    const t0 = 0.4 + (i / Math.max(1, hits.length)) * 0.3, q = clamp01((p - t0) / 0.3);
    if (q <= 0 || q >= 1) return;
    const B = bodyAt(h.at.x, h.at.y, h.size || 1);
    if (h.dodge) { halo(g, B.bx, B.hy, B.r, "200,200,220", 0.5 * (1 - q)); return; }
    halo(g, B.bx, B.hy, B.r * (1 + q * 1.5), BLOOD, 0.85 * (1 - q));
    splatter(g, B.bx, B.hy, B.r * 1.4, q, lowQ ? 8 : 16, seed + i, BLOOD);
    rotPuff(g, B.bx, B.hy, B.r * 1.2, q, lowQ ? 3 : 7, seed + i, ROT);
    if (h.sleep) {
      for (let k = 0; k < 3; k++) { const z = clamp01(q * 1.4 - k * 0.2); g.fillStyle = rgba(DUSK, 1 - z); g.font = `bold ${Math.round(B.r * (0.5 + k * 0.15))}px sans-serif`; g.fillText("z", B.bx + B.r * (0.4 + k * 0.3), B.hy - B.r * (0.6 + z * 1.2 + k * 0.4)); }
    }
  });
}
function rotFx(g, e, p, seed, lowQ) {
  const list = Array.isArray(e.targets) ? e.targets : [];
  list.forEach((t, i) => {
    if (!okT(t.at)) return;
    const B = bodyAt(t.at.x, t.at.y, t.size || 1);
    rotPuff(g, B.bx, B.hy - B.r * 0.4, B.r * 1.1, p, lowQ ? 4 : 9, seed + i, ROT);
    splatter(g, B.bx, B.hy - B.r * 0.3, B.r * 0.9, p, lowQ ? 4 : 8, seed + i, PUS);
    // หนอนตัวเล็กไต่ลง
    for (let k = 0; k < (lowQ ? 2 : 4); k++) {
      const x = B.bx + (k - 1.5) * B.r * 0.35, y = B.hy - B.r * 0.2 + p * B.s * 0.6;
      g.strokeStyle = rgba(BONE, 0.85 * (1 - p)); g.lineWidth = 2; g.lineCap = "round";
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.sin(p * 20 + k) * 3, y + 4, x, y + 8); g.stroke();
    }
  });
}
function twilightFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, 1);
  const R = A.s * 7;
  g.strokeStyle = rgba(DUSK, 0.6 * Math.sin(p * Math.PI)); g.lineWidth = A.s * 0.12;
  g.beginPath(); g.ellipse(A.bx, A.by, R * (1 - p * 0.7), R * (1 - p * 0.7) * 0.52, 0, 0, TAU); g.stroke();
  halo(g, A.bx, A.by, R * (1 - p * 0.6), DUSK, 0.18 * Math.sin(p * Math.PI));
}
function vesperFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, 1);
  if (e.mode === "die") { splatter(g, A.bx, A.by - A.s * 0.3, A.r * 1.4, p, lowQ ? 10 : 20, seed, BILE); bones(g, A.bx, A.by, A.r, p, lowQ ? 4 : 8, seed); return; }
  rotPuff(g, A.bx, A.by, A.r * 1.2, p, lowQ ? 4 : 8, seed, "110,90,70");
}

export function oberonFx(g, e, now, lowQ) {
  const dur = e.dur || OBV_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  switch (e.kind) {
    case "obvScythe": if (e.to) scytheStrike(g, e, p, seed, lowQ); break;
    case "obvCharge": if (e.to) chargeStrike(g, e, p, seed, lowQ, now); break;
    case "obvMolt": moltFx(g, e, p, seed, lowQ, now); break;
    case "obvSwallow": swallowFx(g, e, p, seed, lowQ, now); break;
    case "obvRelease": releaseFx(g, e, p, seed, lowQ, now); break;
    case "obvScytheOn": scytheOnFx(g, e, p, seed, lowQ); break;
    case "obvScrap": scrapFx(g, e, p, seed, lowQ); break;
    case "obvLie": lieFx(g, e, p, seed, lowQ, now); break;
    case "obvRot": rotFx(g, e, p, seed, lowQ); break;
    case "obvTwilight": twilightFx(g, e, p, seed, lowQ); break;
    case "obvVesper": vesperFx(g, e, p, seed, lowQ); break;
    default: break;
  }
  g.restore();
}

// ---------- Vesper ใต้หมาก ----------
//  แมลงลอยใต้หมาก (หันตามทางเดิน · กระพือ · บิน = ลอยขึ้นลง) · เพิ่งลง/ตาย = จาง
export const VESPER_RIDE_Z = 0.55;
const VESPER_H = 0.82;
const track = new Map();
export function oberonVesper(g, u, now, wx, wy, liftZ = 0) {
  const O = u.obv;
  if (!O) return;
  const im = img("vesper");
  if (!im) return;
  let tr = track.get(u.id);
  const [sx] = P(wx, wy);
  if (!tr) { if (track.size > 24) track.clear(); tr = { sx, face: 1, on: !!O.mounted, offT: -1e9, die: false, hp: O.vesperHp, hitT: -1e9 }; track.set(u.id, tr); }
  if (Math.abs(sx - tr.sx) > 0.3) tr.face = sx > tr.sx ? -1 : 1;
  tr.sx = sx;
  if (!!O.mounted !== tr.on) { tr.on = !!O.mounted; if (!tr.on) { tr.offT = now; tr.die = !(O.vesperHp > 0); } }
  if (Number.isFinite(O.vesperHp) && Number.isFinite(tr.hp) && O.vesperHp < tr.hp) tr.hitT = now;
  tr.hp = O.vesperHp;
  const [bx, by, s] = P(wx, wy, Math.max(0, liftZ));
  const H = s * VESPER_H, W = (H * im.naturalWidth) / im.naturalHeight;
  let alpha = 1, dy = 0;
  if (!O.mounted) {
    const t = now - tr.offT;
    if (!(t >= 0 && t < 700)) return;
    alpha = 1 - t / 700; dy = -(t / 700) * s * (tr.die ? 0.1 : 0.5);
  }
  const hover = REDUCED ? 0 : Math.sin(now / 260 + wx) * s * 0.05;
  g.save(); g.globalAlpha *= alpha;
  gEllipse(g, wx + 0.03, wy + 0.05, 0.42, 0, 24, 0.22); g.fillStyle = "rgba(0,0,0,.25)"; g.fill();
  g.translate(bx, by - s * 0.15 - hover + dy); g.scale(tr.face, 1);
  g.drawImage(im, -W * 0.5, -H * 0.85, W, H);
  // ปีกสั่นแวววาว
  if (!REDUCED) { g.globalCompositeOperation = "lighter"; g.globalAlpha *= 0.18 + 0.12 * Math.abs(Math.sin(now / 40)); g.drawImage(im, -W * 0.5, -H * 0.85 - 1, W, H); g.globalCompositeOperation = "source-over"; }
  const hit = now - tr.hitT;
  if (hit >= 0 && hit < 260) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.8 * (1 - hit / 260); g.drawImage(im, -W * 0.5, -H * 0.85, W, H); }
  g.restore();
}

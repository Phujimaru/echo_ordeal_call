// ============================================================
//  เอฟเฟกต์บนกระดานของโอเบรอน (วอร์ติเกิร์น) — characters/oberon_vortigern.js · GRID_PLAN §7.46
//  ธีม: หลุมกลืนกิน (แดงเลือด/ดำ) · ความเน่าเปื่อยของซาก (เขียวหม่น/น้ำตาลหนอง) · ปีกแมลงปอ (ร่างจริง) · หนอนยักษ์แห่งหลุม
//
//  ท่าตีปกติ (ฮุค attackStyle):
//   obvScythe   เคียวยมทูต: ง้างเงาดำ → รอยฟันเสี้ยวจันทร์ดำขอบแดงเร็วคม → เลือดพุ่ง + วิญญาณไหลกลับ (ดูดแต้ม)
//   obvCharge   ขี่ Vesper ชน: แมลงพุ่งจากโอเบรอนถึงเป้า (ฝุ่นตามทาง) → ปะทะ = พิษเขียวระเบิด + ซากผุ
//  เหตุการณ์ socket "oberonFx" (kind → fx):
//   molt     → obvMolt     ลอกคราบ: เปลือกแตกเป็นเสี่ยง ปีกแมลงปอกาง เลือดพุ่ง
//   swallow  → obvSwallow  สนธยายามค่ำคืน: หลุมหมุนดูดทั้งกระดาน (เต็มจอ) — ฉากเข้าสนาม
//   release  → obvRelease  สนามสลาย: หลุมคายทุกคนออก
//   scythe   → obvScytheOn เปิดเคียว: วงเงาดำ + เคียวลอยขึ้นหลังตัว
//   scrap    → obvScrap    ก็แค่เศษขยะ: เศษไอเทมถูกบดเป็นฝุ่นแล้วดูดเข้าตัว
//   lie      → obvLie      Lie Like Vortigern (หลังคลิป): แฟลชชมพูขาว → วังวนแดงม่วง + ฝูงแมลงดำ → กรงเล็บฉีกเป้า/หลับ
//   rot      → obvRot      เน่าเปื่อย: ควันเน่าเขียวบนหัวศัตรูที่ถูกล็อกสกิล
//   twilight → obvTwilight สนธยาเพิ่ม: หมอกม่วงแดงไหลลงหลุมรอบกระดาน
//   vesper   → obvVesper   ขึ้น/ลง/Vesper ตาย
//  Vesper ใต้หมาก: oberonVesper(g, u, now, wx, wy, liftZ) — u.obv = { mounted, vesperHp } (boardUnits.js)
// ============================================================
import { P, gEllipse } from "./boardGeo";

const TAU = Math.PI * 2;
const BLOOD = "150,8,20", CRIMSON = "220,30,40", ROT = "96,120,44", PUS = "170,150,70", BILE = "128,180,60";
const VOID = "12,4,10", BONE = "226,214,190", DUSK = "150,60,130", GLOW = "255,90,60";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const okT = (t) => t && Number.isFinite(t.x) && Number.isFinite(t.y);
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

export const OBV_MS = { obvScythe: 760, obvCharge: 900 };
export const OBV_HIT_P = { obvScythe: 0.3, obvCharge: 0.55 };
export const OBV_EVENT_FX = {
  molt: "obvMolt", swallow: "obvSwallow", release: "obvRelease", scythe: "obvScytheOn", scrap: "obvScrap",
  lie: "obvLie", rot: "obvRot", twilight: "obvTwilight", vesper: "obvVesper",
};
export const OBV_FX_DUR = {
  ...OBV_MS, obvMolt: 2200, obvSwallow: 3200, obvRelease: 1800, obvScytheOn: 1300, obvScrap: 1200,
  obvLie: 3600, obvRot: 1500, obvTwilight: 1800, obvVesper: 900,
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
// เคียวยมทูต (วาดใหม่ 2026-11-27 — ผู้ใช้: ตัวเคียวไม่สวย) · (x, y) = กลางด้าม · L = ความยาวด้าม · ang = มุมด้าม (0 = ตั้งตรง)
//  ด้ามไม้ดำเรียวโค้งเล็กน้อย + ปลอกเหล็ก · ใบยาวโค้งลงปลายแหลม (เหล็กดำไล่เงา) · คมในเรืองแดง + ประกายเงินบางๆ
function scytheShape(g, x, y, L, ang, a, flip = 1) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(flip, 1); g.globalAlpha *= a;
  const w = Math.max(2, L * 0.032);
  // ด้าม
  const sg = g.createLinearGradient(-w, 0, w, 0);
  sg.addColorStop(0, "#3a2a2e"); sg.addColorStop(0.5, "#16090c"); sg.addColorStop(1, "#050102");
  g.strokeStyle = sg; g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(0, L * 0.5); g.quadraticCurveTo(L * 0.05, 0, 0, -L * 0.5); g.stroke();
  // พันด้าม 2 จุด
  g.strokeStyle = "#5a1218"; g.lineWidth = w * 1.25; g.lineCap = "butt";
  for (const t of [0.12, 0.3]) { g.beginPath(); g.moveTo(-w * 0.1, L * t); g.lineTo(w * 0.1 + L * 0.004, L * t + w * 0.9); g.stroke(); }
  // ปลอกเหล็กหัวด้าม
  const hx = 0, hy = -L * 0.47;
  g.fillStyle = "#2b2b33"; g.fillRect(hx - w * 0.9, hy - w * 1.2, w * 1.8, w * 2.4);
  // ใบ: โคนที่หัวด้าม → ยาวออกไปทางขวา โค้งลงปลายแหลม
  const BL = L * 0.82;
  g.shadowColor = "rgba(255,30,40,.55)"; g.shadowBlur = Math.max(4, L * 0.06);
  const bg = g.createLinearGradient(0, hy - L * 0.12, 0, hy + L * 0.16);
  bg.addColorStop(0, "#4a4a56"); bg.addColorStop(0.45, "#16161c"); bg.addColorStop(1, "#050507");
  g.fillStyle = bg;
  g.beginPath();
  g.moveTo(hx, hy - w * 1.1);                                                      // สันบนที่โคน
  g.bezierCurveTo(hx + BL * 0.35, hy - L * 0.16, hx + BL * 0.8, hy - L * 0.12, hx + BL, hy + L * 0.13); // สันใบโค้งลง → ปลาย
  g.bezierCurveTo(hx + BL * 0.72, hy - L * 0.02, hx + BL * 0.32, hy - L * 0.03, hx, hy + w * 1.3);     // คมใน (เว้ากว่า)
  g.closePath(); g.fill();
  g.shadowBlur = 0;
  // คมเรืองแดง + ประกายเงิน
  g.strokeStyle = "rgba(230,30,40,.95)"; g.lineWidth = Math.max(1.2, L * 0.012);
  g.beginPath(); g.moveTo(hx + BL, hy + L * 0.13); g.bezierCurveTo(hx + BL * 0.72, hy - L * 0.02, hx + BL * 0.32, hy - L * 0.03, hx, hy + w * 1.3); g.stroke();
  g.strokeStyle = "rgba(235,225,240,.65)"; g.lineWidth = Math.max(0.8, L * 0.005);
  g.beginPath(); g.moveTo(hx + w, hy - w * 0.6); g.bezierCurveTo(hx + BL * 0.35, hy - L * 0.14, hx + BL * 0.78, hy - L * 0.1, hx + BL * 0.97, hy + L * 0.11); g.stroke();
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
// เคียวยมทูต (ผู้ใช้ 2026-11-27: แบบเดิมใหญ่เกิน ดูตลก) — ฟันเร็วคมแบบยมทูต:
//  ง้างสั้นๆ ที่มือโอเบรอน (เงาดำวูบ) → รอยฟันเสี้ยวจันทร์ดำขอบแดงบางๆ ผ่าตัวเป้าเร็วมาก → เลือดพุ่งเป็นแนว + ควันดำ + วิญญาณเล็กๆ ไหลกลับเข้ามือ
function crescent(g, cx, cy, r, a0, a1, w, fillA, edgeA) {
  // เสี้ยวเรียวหัวท้าย (หนาสุดกลางโค้ง)
  const n = 24;
  g.beginPath();
  for (let i = 0; i <= n; i++) { const t = i / n, an = a0 + (a1 - a0) * t, ww = w * Math.sin(t * Math.PI); const x = cx + Math.cos(an) * (r + ww), y = cy + Math.sin(an) * (r + ww) * 0.55; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  for (let i = n; i >= 0; i--) { const t = i / n, an = a0 + (a1 - a0) * t; g.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.55); }
  g.closePath();
  g.fillStyle = rgba("6,0,2", fillA); g.fill();
  g.strokeStyle = rgba(CRIMSON, edgeA); g.lineWidth = 1.2; g.stroke();
}
function scytheStrike(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1), hit = OBV_HIT_P.obvScythe;
  const dir = Math.atan2(B.hy - A.hy, B.bx - A.bx);
  // ง้าง: เงาดำวูบที่มือ + เส้นแสงแดงจางพาดไปทางเป้า
  // เคียวในมือ: ง้างเอนหลัง → เหวี่ยงผ่านไปทางเป้าตอนปะทะ แล้วจาง
  const face = B.bx >= A.bx ? 1 : -1;
  const sw = p < hit ? -0.9 * easeOut(p / hit) : -0.9 + 2.1 * easeOut(clamp01((p - hit) / 0.16));
  scytheShape(g, A.bx + face * A.r * 0.55, A.hy - A.s * 0.05, A.s * 1.05, face * sw, p < 0.85 ? Math.min(1, p / 0.12) : 1 - (p - 0.85) / 0.15, face);
  if (p < hit) {
    const q = p / hit;
    halo(g, A.bx, A.hy, A.r * (0.7 + q * 0.4), VOID, 0.45 * q);
    return;
  }
  const q = clamp01((p - hit) / (1 - hit));
  // รอยฟัน: กวาดเร็วใน 18% แรกของช่วงปะทะ แล้วค้างจางลง
  const sweep = easeOut(clamp01(q / 0.18));
  const r = B.r * 1.15, base = dir + Math.PI * 0.75;
  const a0 = base, a1 = base + Math.PI * 1.05 * sweep;
  crescent(g, B.bx, B.hy, r, a0, a1, B.r * 0.32, 0.92 * (1 - q), (1 - q) * 0.95);
  // เส้นคมขาวแดงตามขอบ (แวบเดียว)
  if (q < 0.3) {
    g.strokeStyle = rgba("255,210,210", (1 - q / 0.3) * 0.9); g.lineWidth = 1.5;
    g.beginPath(); for (let i = 0; i <= 16; i++) { const an = a0 + (a1 - a0) * (i / 16); const x = B.bx + Math.cos(an) * r, y = B.hy + Math.sin(an) * r * 0.55; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
  }
  // เลือดพุ่งเป็นแนวตามทิศฟัน
  const sp = lowQ ? 6 : 14;
  for (let i = 0; i < sp; i++) {
    const t = hash(i, seed), an = a0 + (a1 - a0) * t + 0.5, d = B.r * (0.4 + easeOut(q) * (0.8 + hash(i, 3)));
    g.fillStyle = rgba(BLOOD, (1 - q) * 0.95);
    g.beginPath(); g.arc(B.bx + Math.cos(an) * d, B.hy + Math.sin(an) * d * 0.55 + q * q * B.r, Math.max(1, B.r * 0.06 * (1 - q)), 0, TAU); g.fill();
  }
  rotPuff(g, B.bx, B.hy, B.r * 0.8, q, lowQ ? 3 : 6, seed, VOID);
  // วิญญาณ (แต้มสกิล) ไหลกลับเข้ามือโอเบรอน
  for (let i = 0; i < (lowQ ? 2 : 4); i++) {
    const qq = clamp01(q * 1.25 - i * 0.08), x = B.bx + (A.bx - B.bx) * easeIn(qq), y = B.hy + (A.hy - B.hy) * easeIn(qq) - Math.sin(qq * Math.PI) * A.s * 0.25;
    halo(g, x, y, A.r * 0.18, DUSK, (1 - qq) * 0.85);
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
  scytheShape(g, A.bx + A.r * 0.5, A.hy - A.s * 0.15 - easeOut(p) * A.s * 0.2, A.s * 0.85, -0.5, Math.sin(p * Math.PI) * 0.9);
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
// Lie Like Vortigern — ต่อจากท้ายคลิป (ผู้ใช้สั่ง 2026-11-27: เอาหนอนออก เอฟเฟกต์ต่อจากวีดีโอ แบบรุนแรง)
//  คลิปจบที่วังวนแดงม่วง → แสงชมพูขาวจ้า · บนกระดาน: แฟลชชมพูขาวจางลง → วังวนแดงม่วงหมุนแรงทั้งกระดาน + ฝูงแมลงดำวนดูด
//  → เป้าแต่ละคนโดนกรงเล็บดำฉีก (เลือด + ซากเน่า + จอสั่น) · คนที่หลับ = หมอกอัสดง + z · หลบ = เงาวูบผ่าน
function lieFx(g, e, p, seed, lowQ, now) {
  const A = bodyAt(e.x, e.y, 1);
  const R = A.s * 7.5, fade = 1 - clamp01((p - 0.85) / 0.15);
  // แฟลชชมพูขาว (ต่อจากเฟรมสุดท้ายของคลิป)
  const fl = 1 - clamp01(p / 0.16);
  if (fl > 0) { g.fillStyle = `rgba(250,225,235,${0.92 * fl})`; g.fillRect(A.bx - A.s * 40, A.by - A.s * 30, A.s * 80, A.s * 60); }
  // วังวนแดงม่วงหมุนแรง (เส้นเลือดเกลียว)
  const op = easeOut(clamp01(p / 0.2)) * fade;
  const spin = now / 260;
  const rings = lowQ ? 9 : 18;
  for (let i = rings; i >= 1; i--) {
    const f = i / rings, r = R * f;
    g.strokeStyle = i % 3 === 0 ? rgba("190,40,140", 0.55 * op) : rgba(i % 2 ? CRIMSON : BLOOD, (0.35 + 0.5 * (1 - f)) * op);
    g.lineWidth = Math.max(2, A.s * 0.16 * f);
    const st = spin * (1.6 - f) + i * 0.9;
    g.beginPath(); g.ellipse(A.bx, A.by, r, r * 0.5, 0, st, st + TAU * (0.55 + 0.3 * hash(i, 3))); g.stroke();
  }
  const core = g.createRadialGradient(A.bx, A.by, 0, A.bx, A.by, R * 0.35);
  core.addColorStop(0, rgba("0,0,0", 0.9 * op)); core.addColorStop(1, rgba("40,0,10", 0));
  g.fillStyle = core; g.beginPath(); g.ellipse(A.bx, A.by, R * 0.35, R * 0.18, 0, 0, TAU); g.fill();
  // ฝูงแมลงดำวนดูดเข้าหลุม
  const n = lowQ ? 40 : 110;
  for (let i = 0; i < n; i++) {
    const ph = (p * (1.4 + hash(i, 5)) + hash(i, 6)) % 1;
    const rr = R * 1.2 * (1 - ph), an = hash(i, 7) * TAU + ph * 9 + spin * 0.4;
    const x = A.bx + Math.cos(an) * rr, y = A.by + Math.sin(an) * rr * 0.5 - Math.sin(ph * Math.PI) * A.s * 0.6;
    const sz = A.s * (0.04 + hash(i, 8) * 0.05);
    g.save(); g.translate(x, y); g.rotate(an + Math.PI / 2);
    g.fillStyle = rgba("8,2,4", 0.85 * fade); g.beginPath(); g.ellipse(0, 0, sz * 0.5, sz, 0, 0, TAU); g.fill();
    g.fillStyle = rgba("200,190,220", 0.35 * fade); const fw = Math.sin(now / 25 + i) * sz * 0.9;
    g.beginPath(); g.ellipse(-sz * 0.7, 0, Math.abs(fw), sz * 0.35, 0, 0, TAU); g.ellipse(sz * 0.7, 0, Math.abs(fw), sz * 0.35, 0, 0, TAU); g.fill();
    g.restore();
  }
  // เป้าแต่ละคน
  const hits = Array.isArray(e.hits) ? e.hits : [];
  hits.forEach((h, i) => {
    if (!okT(h.at)) return;
    const t0 = 0.22 + (i / Math.max(1, hits.length)) * 0.35, q = clamp01((p - t0) / 0.32);
    if (q <= 0 || q >= 1) return;
    const B = bodyAt(h.at.x, h.at.y, h.size || 1);
    if (h.dodge) { halo(g, B.bx, B.hy, B.r * 1.2, "220,210,240", 0.5 * (1 - q)); return; }
    // กรงเล็บดำ 3 รอย (ฉีกลงทแยง)
    const cut = easeOut(clamp01(q / 0.25));
    for (let k = -1; k <= 1; k++) {
      const x0 = B.bx - B.r * 1.4 + k * B.r * 0.45, y0 = B.hy - B.r * 1.4, x1 = B.bx + B.r * 1.2 + k * B.r * 0.45, y1 = B.hy + B.r * 1.3;
      g.strokeStyle = rgba("10,0,4", (1 - q) * 1.1); g.lineWidth = B.r * 0.22 * (1 - q * 0.6); g.lineCap = "round";
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * cut, y0 + (y1 - y0) * cut); g.stroke();
      g.strokeStyle = rgba(CRIMSON, (1 - q) * 0.9); g.lineWidth = B.r * 0.07;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * cut, y0 + (y1 - y0) * cut); g.stroke();
    }
    halo(g, B.bx, B.hy, B.r * (1 + q * 1.8), BLOOD, 0.85 * (1 - q));
    splatter(g, B.bx, B.hy, B.r * 1.6, q, lowQ ? 10 : 24, seed + i, BLOOD);
    rotPuff(g, B.bx, B.hy, B.r * 1.3, q, lowQ ? 4 : 9, seed + i, ROT);
    bones(g, B.bx, B.by - B.s * 0.2, B.r, q, lowQ ? 3 : 6, seed + i);
    if (h.sleep) {
      halo(g, B.bx, B.hy - B.r * 0.4, B.r * 1.6, DUSK, 0.45 * Math.sin(q * Math.PI));
      for (let k = 0; k < 3; k++) { const z = clamp01(q * 1.4 - k * 0.2); g.fillStyle = rgba("230,190,255", 1 - z); g.font = `bold ${Math.round(B.r * (0.5 + k * 0.15))}px sans-serif`; g.fillText("z", B.bx + B.r * (0.4 + k * 0.3), B.hy - B.r * (0.6 + z * 1.2 + k * 0.4)); }
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
  // หันตามทิศเดินบนจอ (ผู้ใช้สั่ง 2026-11-27): ภาพต้นฉบับหัวชี้ซ้าย · face -1 = กลับภาพ หัวชี้ขวา (ค่าเริ่ม)
  //  จุดอ้างอิงขยับเมื่อเคลื่อนเกิน 2 px (ก้าวทีละเฟรมเล็กกว่านั้น — เทียบทุกเฟรมจะไม่เคยเปลี่ยนทิศ)
  if (!tr) { if (track.size > 24) track.clear(); tr = { refX: sx, face: -1, on: !!O.mounted, offT: -1e9, die: false, hp: O.vesperHp, hitT: -1e9 }; track.set(u.id, tr); }
  if (Math.abs(sx - tr.refX) > 2) { tr.face = sx > tr.refX ? -1 : 1; tr.refX = sx; }
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

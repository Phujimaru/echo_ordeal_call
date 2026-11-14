// เอฟเฟกต์บนกระดานของคุซาคาเบะ ชินระ (characters/kusakabe_shinra.js · GRID_PLAN §7.32)
//  อ้างอิงต้นฉบับ (Fire Force): ไฟพุ่งจากฝ่าเท้าต่อเนื่องแบบไอพ่น · รอยเท้าเถ้า "Devil's Footprints" ·
//  Rapid = ไอพ่นบีบเป็นเส้นไฟเส้นเดียว · ไฟโทนอนิเมะ: แกนขาวเหลือง → ส้มจัด → แดง ขอบควันดำ
//  ท่าตีปกติ (ฮุค attackStyle):
//   shinraKick       เตะไอพ่น: ไฟพ่นจากเท้า → เส้นโค้งเตะเป็นไฟ → ลูกไฟปะทุที่เป้า + ประกาย/เถ้า
//   shinraKickBlaze  ระหว่างอุ่นเครื่องพอแล้ว: ไฟแดงดำ ใหญ่กว่า เปลวลามรอบเป้า
//  เหตุการณ์จาก server (socket "shinraFx" → BoardStage):
//   shinraHero       ฉันนี่แหละฮีโร่: ไอพ่นสองเท้าจุดพรึ่บ + วงไฟบนพื้น + ประกายลอย
//   shinraStorm      อุ้งเท้าปีศาจ: พายุไฟหมุนรอบตัว 3×3 → ปะทุทุกช่องรอบวง (จังหวะ T.stormBeat)
//   shinraWarm       อุ่นเครื่องพอแล้ว: ดูดไฟเข้า → เสาเพลิงท่วมตัว + คลื่นกระแทก + มงกุฎไฟ
//   shinraLatom      ลาทัม: ชาร์จไอพ่น → ชินระพุ่งเอง ไฟพ่นจากเท้าไปด้านหลัง (Rapid) + หางไฟสั้น → พื้นไหม้ตามทาง (ไม่ใช่ลำแสง — ผู้ใช้สั่ง)
//   shinraLatomHit   ลาทัมโดนเป้า: ลูกไฟระเบิด
//   shinraDetonate   มอดไหม้จากภายใน: แสงไฟรั่วจากในตัวเป้า → ระเบิดออก
//   shinraSmolder    ได้มอดไหม้จากภายใน: ถ่านไฟวนรอบตัว
//   shinraPrints     รอยเท้าเถ้า (Devil's Footprints) ตามทางที่เดินระหว่างฮีโร่/อุ่นเครื่อง
//  ออร่าค้าง (drawUnit — units[].aura): "shinraHero" ไอพ่นใต้เท้า · "shinraBlaze" เพลิงท่วมตัว
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
// สีไฟ
const WHITE = "255,250,226", CORE = "255,236,140", YEL = "255,204,64", ORG = "255,132,24", RED = "235,58,18", SMOKE = "40,26,22";
const BLAZE_ORG = "255,92,24", BLAZE_RED = "214,24,14";

// จังหวะ (ms) — server characters/kusakabe_shinra.js T ต้องตรงกัน
export const SHINRA_T = { stormBeat: 750, latomCharge: 380, latomStep: 70, latomTail: 200 };
// ลาทัม: พุ่งผ่านแล้วระเบิดปิดท้ายไล่ตามทางที่ผ่าน ตูม-ตาม (ผู้ใช้สั่ง 2026-11-14) — เริ่มหลังถึงปลายทาง delay ms · ช่องละ gap ms · ลูกละ life ms
export const LATOM_BOOM = { delay: 120, gap: 60, life: 820 };
export const SHINRA_MS = { shinraKick: 950, shinraKickBlaze: 1150 };
export const SHINRA_HIT_P = { shinraKick: 0.3, shinraKickBlaze: 0.27 }; // ตรงกับจุดปะทะของเสียง (0.30 วิ)
export const SHINRA_FX_DUR = {
  ...SHINRA_MS, shinraHero: 1100, shinraStorm: 1500, shinraWarm: 1900, shinraLatom: 2600, shinraLatomHit: 900,
  shinraDetonate: 1000, shinraSmolder: 1200, shinraPrints: 3600,
};
export const isShinraFx = (kind) => typeof kind === "string" && kind in SHINRA_FX_DUR;
const latomSteps = (path) => Math.max(0, (path ? path.length : 1) - 1);
export const latomBoomStart = (path) => SHINRA_T.latomCharge + latomSteps(path) * SHINRA_T.latomStep + LATOM_BOOM.delay;
export const latomFxDur = (path) => latomBoomStart(path) + Math.max(0, latomSteps(path) - 1) * LATOM_BOOM.gap + LATOM_BOOM.life + 120;
export const latomDur = (path) => SHINRA_T.latomCharge + Math.max(0, (path ? path.length : 1) - 1) * SHINRA_T.latomStep + SHINRA_T.latomTail;

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, r: s * 0.4 * K, hy: by - s * 0.86 * K, K };
}
// แสงวงกลมไล่สี (แกนขาว → สี → โปร่ง)
function glow(g, x, y, r, rgb, a, core = WHITE) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(core, a));
  gr.addColorStop(0.28, rgba(rgb, a * 0.85));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function puff(g, x, y, r, a, rgb = SMOKE) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r);
  gr.addColorStop(0, rgba(rgb, a)); gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// ลิ้นไฟ 1 เปลว: ฐานที่ (x, y) ปลายชี้ขึ้น (ang = มุมเอียง rad จากแนวตั้ง) สูง h กว้าง w
//  ทรงหยดน้ำกลับหัวที่บิดตามเวลา (wob) · ชั้นนอกสี rgb → ชั้นในแกนเหลืองขาว
function tongue(g, x, y, w, h, ang, wob, a, rgb = ORG, inner = CORE) {
  if (a <= 0 || h <= 0) return;
  g.save(); g.translate(x, y); g.rotate(ang);
  const sway = Math.sin(wob) * w * 0.45, sway2 = Math.sin(wob * 1.7 + 1.3) * w * 0.3;
  const shape = (sc) => {
    const W = w * sc, H = h * sc;
    g.beginPath();
    g.moveTo(-W, 0);
    g.bezierCurveTo(-W * 1.05, -H * 0.35, -W * 0.3 + sway2, -H * 0.55, sway, -H);
    g.bezierCurveTo(W * 0.35 + sway2, -H * 0.6, W * 1.05, -H * 0.35, W, 0);
    g.quadraticCurveTo(0, W * 0.6, -W, 0);
    g.closePath();
  };
  const gr = g.createLinearGradient(0, 0, 0, -h);
  gr.addColorStop(0, rgba(RED, a)); gr.addColorStop(0.35, rgba(rgb, a)); gr.addColorStop(1, rgba(YEL, a * 0.2));
  g.fillStyle = gr; shape(1); g.fill();
  const gi = g.createLinearGradient(0, 0, 0, -h * 0.5);
  gi.addColorStop(0, rgba(inner, a * 0.8)); gi.addColorStop(1, rgba(YEL, 0));
  g.fillStyle = gi; shape(0.5); g.fill();
  g.restore();
}
// ประกายไฟลอยขึ้น (ถ่าน) — วาดเป็นจุดยืด
function embers(g, x, y, s, q, seed, n, spread = 0.5, rise = 0.9, rgb = YEL) {
  if (q < 0 || q > 1) return;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const k = (seed * 13.7 + i * 7.31) % 1, k2 = (seed * 3.3 + i * 4.17) % 1;
    const qq = clamp01(q * (0.7 + k2 * 0.6));
    const dx = (k - 0.5) * s * spread * 2 + Math.sin(qq * 6 + i) * s * 0.05;
    const dy = -s * rise * easeOut(qq) * (0.5 + k2 * 0.7);
    const a = (1 - qq) * (0.6 + 0.4 * Math.sin(i * 3 + q * 30));
    g.fillStyle = rgba(i % 3 ? rgb : CORE, a);
    const r = Math.max(1, s * (0.012 + k * 0.014));
    g.fillRect(x + dx - r / 2, y + dy - r * 1.6, r, r * 2.4);
  }
  g.restore();
}
// ลูกไฟระเบิด (หลายชั้น + ลิ้นไฟพุ่งออก + ควันดำ)
function fireball(g, x, y, s, q, seed, lowQ, size = 1, hot = ORG) {
  if (q < 0 || q > 1) return;
  const S = s * size;
  if (q < 0.12) glow(g, x, y, S * 0.7, YEL, (1 - q / 0.12) * 0.6);
  const f = easeOut(clamp01(q / 0.55));
  g.save(); g.globalCompositeOperation = "lighter";
  const n = lowQ ? 5 : 9;
  for (let i = 0; i < n; i++) {
    const a = seed * 2 + (i / n) * TAU, d = S * 0.32 * f;
    glow(g, x + Math.cos(a) * d, y - S * 0.12 * f + Math.sin(a) * d * 0.5, S * (0.18 + 0.2 * f), i % 2 ? hot : RED, (1 - q) * 0.55, i % 3 ? YEL : CORE);
  }
  // ลิ้นไฟพุ่งรอบทิศ
  if (q < 0.7) {
    const tq = q / 0.7;
    for (let i = 0; i < (lowQ ? 4 : 8); i++) {
      const ang = (i / (lowQ ? 4 : 8)) * TAU + seed;
      tongue(g, x + Math.sin(ang) * S * 0.1, y - S * 0.05, S * 0.09, S * (0.35 + 0.35 * Math.sin(tq * Math.PI)), ang * 0.55 - 0.3, q * 40 + i, (1 - tq) * 0.9, hot);
    }
  }
  g.restore();
  // ควันดำลอยขึ้น
  const sm = clamp01((q - 0.25) / 0.75);
  if (sm > 0) for (let k = 0; k < (lowQ ? 2 : 5); k++) puff(g, x + (k - 2) * S * 0.12 + Math.sin(seed + k) * S * 0.05, y - S * (0.2 + 0.7 * sm) - k * S * 0.06, S * (0.18 + 0.3 * sm), (1 - sm) * 0.5);
  embers(g, x, y, S, q, seed, lowQ ? 8 : 20, 0.7, 1.1);
}
// วงไหม้บนพื้น (ทรงรีตามมุมกล้อง)
function scorch(g, x, y, s, a, r = 0.45) {
  if (a <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, s * r);
  gr.addColorStop(0, rgba("20,10,6", a * 0.75)); gr.addColorStop(0.6, rgba("60,20,8", a * 0.45)); gr.addColorStop(1, rgba("60,20,8", 0));
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, s * r, s * r * 0.5, 0, 0, TAU); g.fill();
}
// ไอพ่นจากเท้า (กรวยไฟชี้ลง-หลัง)
function footJet(g, x, y, s, len, a, t, rgb = ORG) {
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = "lighter";
  for (const side of [-1, 1]) {
    const fx = x + side * s * 0.08, fy = y - s * 0.02;
    const L = len * (0.85 + 0.15 * Math.sin(t * 0.05 + side * 2));
    const gr = g.createLinearGradient(fx, fy, fx, fy + L);
    gr.addColorStop(0, rgba(WHITE, a)); gr.addColorStop(0.25, rgba(YEL, a)); gr.addColorStop(0.6, rgba(rgb, a * 0.8)); gr.addColorStop(1, rgba(RED, 0));
    g.fillStyle = gr;
    g.beginPath();
    const w = s * 0.055;
    g.moveTo(fx - w, fy); g.quadraticCurveTo(fx - w * 0.6, fy + L * 0.6, fx + Math.sin(t * 0.03 + side) * w * 0.6, fy + L);
    g.quadraticCurveTo(fx + w * 0.6, fy + L * 0.6, fx + w, fy); g.closePath(); g.fill();
    glow(g, fx, fy + L * 0.15, s * 0.09, rgb, a * 0.7);
  }
  g.restore();
}

// ไอพ่นสองเท้าชี้ไปทาง ang (มุมบนจอ) — ใช้ตอนพุ่ง (ลาทัม)
function rocketJet(g, x, y, s, ang, len, a, t) {
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = "lighter";
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const side of [-1, 1]) {
    const fx = x + nx * side * s * 0.07, fy = y + ny * side * s * 0.035;
    const L = len * (0.85 + 0.15 * Math.sin(t * 0.07 + side * 1.7));
    g.save(); g.translate(fx, fy); g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, L, 0);
    gr.addColorStop(0, rgba(WHITE, a)); gr.addColorStop(0.18, rgba(YEL, a)); gr.addColorStop(0.5, rgba(ORG, a * 0.85)); gr.addColorStop(1, rgba(RED, 0));
    g.fillStyle = gr;
    const w = s * 0.07, wig = Math.sin(t * 0.05 + side) * w * 0.5;
    g.beginPath();
    g.moveTo(0, -w); g.quadraticCurveTo(L * 0.55, -w * 1.3 + wig, L, wig * 0.6); g.quadraticCurveTo(L * 0.55, w * 1.3 + wig, 0, w); g.closePath(); g.fill();
    g.restore();
  }
  g.restore();
}

// ---------- ตีปกติ: เตะไอพ่น ----------
function kickFx(g, e, p, seed, lowQ, blaze) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const H = blaze ? SHINRA_HIT_P.shinraKickBlaze : SHINRA_HIT_P.shinraKick;
  const hot = blaze ? BLAZE_ORG : ORG;
  const dx = B.bx - A.bx, dy = B.hy - A.hy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  // 1) ไอพ่นเท้าจุด (ก่อนปะทะ)
  if (p < H + 0.08) {
    const a = p < 0.08 ? p / 0.08 : 1 - clamp01((p - H) / 0.08);
    footJet(g, A.bx, A.by - A.s * 0.04, A.s, A.s * (0.3 + 0.15 * Math.sin(p * 40)), a, p * 1000, hot);
  }
  // 2) เส้นโค้งเตะ (ส่วนโค้งไฟจากตัวไปเป้า)
  const sw = (p - H * 0.45) / (H * 0.75);
  if (sw > 0 && sw < 1.25) {
    const head = clamp01(sw), tail = clamp01(sw - 0.45);
    const mx = (A.bx + B.bx) / 2 - uy * A.s * 0.45, my = (A.hy + B.hy) / 2 + ux * A.s * 0.45 - A.s * 0.25;
    const pt = (u) => { const v = 1 - u; return [v * v * A.bx + 2 * v * u * mx + u * u * B.bx, v * v * A.hy + 2 * v * u * my + u * u * B.hy]; };
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    const seg = 14;
    for (let i = 0; i < seg; i++) {
      const u0 = tail + (head - tail) * (i / seg), u1 = tail + (head - tail) * ((i + 1) / seg);
      const [x0, y0] = pt(u0), [x1, y1] = pt(u1);
      const k = (i + 1) / seg;
      g.strokeStyle = rgba(k > 0.75 ? WHITE : k > 0.4 ? YEL : hot, (1 - clamp01(sw - 1) * 4) * (0.35 + 0.65 * k));
      g.lineWidth = A.s * (0.04 + 0.1 * k) * (blaze ? 1.3 : 1);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    g.restore();
  }
  // 3) ปะทะ: ลูกไฟ + คลื่นไฟบนพื้น
  const hq = (p - H) / (1 - H);
  if (hq >= 0) {
    fireball(g, B.bx, B.hy + B.s * 0.15, B.s, hq, seed, lowQ, blaze ? 1.35 : 1, hot);
    if (hq < 0.5) {
      const w = hq / 0.5;
      g.strokeStyle = rgba(YEL, (1 - w) * 0.8); g.lineWidth = Math.max(1.5, B.s * 0.035 * (1 - w));
      g.beginPath(); g.ellipse(B.bx, B.by, B.s * (0.15 + 0.6 * w), B.s * (0.07 + 0.3 * w), 0, 0, TAU); g.stroke();
    }
    if (blaze && !lowQ && hq < 0.8) {
      // เปลวลามรอบตัวเป้า
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + seed;
        tongue(g, B.bx + Math.cos(a) * B.s * 0.28, B.by + Math.sin(a) * B.s * 0.12, B.s * 0.06, B.s * 0.3 * Math.sin(Math.PI * clamp01(hq / 0.8)), 0, p * 30 + i, 0.85, BLAZE_RED);
      }
    }
  }
}

// ---------- ฉันนี่แหละฮีโร่: จุดไอพ่น ----------
function heroFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y);
  const ig = clamp01(p / 0.15);
  // วงไฟบนพื้นขยายออก
  const w = clamp01(p / 0.5);
  if (w < 1) {
    g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = rgba(ORG, (1 - w) * 0.9); g.lineWidth = Math.max(2, A.s * 0.05 * (1 - w));
    g.beginPath(); g.ellipse(A.bx, A.by, A.s * (0.2 + 0.7 * w), A.s * (0.1 + 0.35 * w), 0, 0, TAU); g.stroke();
    g.restore();
  }
  scorch(g, A.bx, A.by, A.s, 1 - p, 0.5);
  // ไอพ่นสองเท้าพุ่งพรึ่บแล้วค่อยหรี่
  const a = p < 0.15 ? ig : 1 - clamp01((p - 0.6) / 0.4);
  footJet(g, A.bx, A.by - A.s * 0.05, A.s, A.s * (0.5 * (p < 0.15 ? easeOut(ig) * 1.4 : 1.4 - 0.6 * clamp01((p - 0.15) / 0.5))), a, p * 1100);
  if (p < 0.2) glow(g, A.bx, A.by - A.s * 0.1, A.s * 0.7, ORG, (1 - p / 0.2) * 0.6);
  if (p < 0.45) for (let i = 0; i < (lowQ ? 3 : 6); i++) {
    const a2 = (i / 6) * TAU + seed, q2 = p / 0.45;
    tongue(g, A.bx + Math.cos(a2) * A.s * 0.22, A.by + Math.sin(a2) * A.s * 0.1, A.s * 0.06, A.s * 0.35 * Math.sin(Math.PI * q2), Math.cos(a2) * 0.4, p * 40 + i, 0.9);
  }
  embers(g, A.bx, A.by, A.s, p, seed, lowQ ? 10 : 26, 0.55, 1.4);
  if (!lowQ) for (let k = 0; k < 3; k++) puff(g, A.bx + (k - 1) * A.s * 0.2, A.by - A.s * 0.1 - A.s * 0.4 * p, A.s * (0.12 + 0.2 * p), (1 - p) * 0.3);
}

// ---------- อุ้งเท้าปีศาจ: พายุไฟหมุน ----------
function stormFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y);
  const beat = SHINRA_T.stormBeat / SHINRA_FX_DUR.shinraStorm; // ปะทุรอบวงตรงจังหวะดาเมจ
  const spin = p * TAU * 3.2 * (1 + p);
  const grow = easeOut(clamp01(p / 0.35)), fade = 1 - clamp01((p - beat - 0.05) / (1 - beat - 0.05));
  // พื้นไหม้ 3×3
  if (Array.isArray(e.tiles)) for (const t of e.tiles) {
    const [tx, ty, ts] = P(t.x + 0.5, t.y + 0.5);
    scorch(g, tx, ty, ts, Math.min(grow, 0.3 + 0.7 * fade) * 0.8, 0.55);
  }
  g.save(); g.globalCompositeOperation = "lighter";
  // ริบบิ้นไฟวน (เกลียวรอบตัว รัศมี ~1.2 ช่อง) — หลายชั้นความสูง
  const arms = lowQ ? 3 : 5, R = A.s * 1.15 * grow;
  g.lineCap = "butt"; g.lineJoin = "round";
  for (let k = 0; k < arms; k++) {
    const base = spin + (k / arms) * TAU;
    const pts = [];
    for (let i = 0; i <= 22; i++) {
      const u = i / 22, ang = base - u * 2.4, rr = R * (0.35 + 0.65 * u);
      pts.push([A.bx + Math.cos(ang) * rr, A.by - A.s * (0.1 + 0.9 * u) * grow + Math.sin(ang) * rr * 0.45]);
    }
    // ริบบิ้นทีละชั้น (เส้นต่อเนื่องเส้นเดียว — ไม่ซ้อนเป็นเม็ด): แดงกว้าง → ส้ม → แกนเหลือง
    for (const [rgb, w, al] of [[RED, 0.15, 0.32], [ORG, 0.09, 0.5], [YEL, 0.035, 0.7]]) {
      g.strokeStyle = rgba(rgb, fade * al);
      g.lineWidth = A.s * w;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    }
  }
  // แกนกลางร้อน
  glow(g, A.bx, A.by - A.s * 0.4, A.s * 0.6 * grow, ORG, fade * 0.4, YEL);
  g.restore();
  // ลิ้นไฟเลียพื้นรอบวง (หมุนตาม)
  if (!lowQ) for (let i = 0; i < 10; i++) {
    const ang = spin * 0.7 + (i / 10) * TAU, rr = A.s * (0.9 + 0.2 * Math.sin(i + p * 9));
    tongue(g, A.bx + Math.cos(ang) * rr, A.by + Math.sin(ang) * rr * 0.45, A.s * 0.07, A.s * (0.28 + 0.15 * Math.sin(p * 20 + i)) * grow, Math.cos(ang) * 0.4, p * 35 + i, fade * 0.8);
  }
  // ปะทุทุกช่องรอบวง (ตรงจังหวะดาเมจ)
  const bq = (p - beat) / (1 - beat);
  if (bq >= 0 && Array.isArray(e.tiles)) {
    for (let i = 0; i < e.tiles.length; i++) {
      const t = e.tiles[i];
      const [tx, ty, ts] = P(t.x + 0.5, t.y + 0.5);
      fireball(g, tx, ty - ts * 0.15, ts, clamp01(bq * 1.05 - (i % 3) * 0.04), seed + i, lowQ, 0.6);
    }
  }
  embers(g, A.bx, A.by, A.s * 1.5, p, seed, lowQ ? 10 : 30, 0.8, 1.2);
}

// ---------- อุ่นเครื่องพอแล้ว: เสาเพลิง ----------
function warmFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y);
  const IN = 0.2; // ดูดไฟเข้า → ระเบิดออก
  if (p < IN) {
    const q = p / IN;
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < (lowQ ? 6 : 14); i++) {
      const a = (i / 14) * TAU + seed, d = A.s * 1.4 * (1 - easeIn(q));
      glow(g, A.bx + Math.cos(a) * d, A.hy + Math.sin(a) * d * 0.5, A.s * 0.1, ORG, q);
    }
    glow(g, A.bx, A.hy, A.s * 0.5 * q, RED, q * 0.8);
    g.restore();
    return;
  }
  const q = (p - IN) / (1 - IN);
  // คลื่นกระแทก 2 วง
  for (const lag of [0, 0.12]) {
    const w = clamp01((q - lag) / 0.45);
    if (w > 0 && w < 1) {
      g.strokeStyle = rgba(lag ? RED : YEL, (1 - w) * 0.9); g.lineWidth = Math.max(2, A.s * 0.07 * (1 - w));
      g.beginPath(); g.ellipse(A.bx, A.by, A.s * (0.3 + 2.2 * w), A.s * (0.15 + 1.1 * w), 0, 0, TAU); g.stroke();
    }
  }
  if (q < 0.1) glow(g, A.bx, A.hy, A.s * 1.2, YEL, (1 - q / 0.1) * 0.7);
  scorch(g, A.bx, A.by, A.s, 1 - q * 0.6, 0.8);
  // เสาเพลิง: ลิ้นไฟใหญ่หลายเปลวซ้อนสูงท่วมตัว
  const H = A.s * (1.6 + 0.6 * Math.sin(Math.PI * clamp01(q / 0.6))) * (1 - clamp01((q - 0.6) / 0.4) * 0.8);
  const a = 1 - clamp01((q - 0.65) / 0.35);
  // ชั้นหลัง: เปลวแดงเข้มกว้าง (ไม่บวกแสง = ไม่ขาวโพลน) → ชั้นหน้า: เปลวส้มแคบสูงสลับกัน → แสงเรืองบางๆ
  g.save();
  const N = lowQ ? 5 : 11;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1) - 0.5, off = u * A.s * 0.62;
    const hh = H * (0.55 + 0.45 * (1 - Math.abs(u) * 1.6)) * (0.8 + 0.2 * Math.sin(q * 18 + i * 2.3));
    tongue(g, A.bx + off, A.by + Math.abs(u) * A.s * 0.04, A.s * 0.11, hh, u * 0.5, q * 30 + i * 1.7, a * 0.9, i % 2 ? BLAZE_RED : RED, ORG);
  }
  for (let i = 0; i < (lowQ ? 3 : 7); i++) {
    const u = i / 6 - 0.5, off = u * A.s * 0.42;
    tongue(g, A.bx + off, A.by - A.s * 0.02, A.s * 0.075, H * (0.5 + 0.35 * Math.sin(q * 22 + i * 1.9 + 1)), u * 0.35, q * 38 + i * 2.9, a * 0.9, ORG, CORE);
  }
  g.globalCompositeOperation = "lighter";
  glow(g, A.bx, A.hy, A.s * 0.8, BLAZE_RED, a * 0.35, YEL);
  g.restore();
  // มงกุฎไฟ/ปีกปีศาจสองข้าง
  if (!lowQ && q < 0.7) for (const side of [-1, 1]) {
    tongue(g, A.bx + side * A.s * 0.28, A.hy + A.s * 0.1, A.s * 0.08, A.s * 0.55 * Math.sin(Math.PI * q / 0.7), side * 0.7, q * 25 + side, 0.9, BLAZE_RED);
  }
  // ควันดำลอยหนา
  if (!lowQ) for (let k = 0; k < 6; k++) puff(g, A.bx + (k - 2.5) * A.s * 0.18, A.hy - A.s * (0.6 + 1.2 * q) - k * A.s * 0.05, A.s * (0.25 + 0.4 * q), (1 - q) * 0.45);
  embers(g, A.bx, A.by, A.s * 1.4, q, seed, lowQ ? 12 : 36, 0.6, 2.2);
}

// ---------- ลาทัม: ชาร์จไอพ่น → ชินระพุ่งเอง (ไฟพ่นจากเท้า) ----------
function latomFx(g, e, now, p, seed, lowQ) {
  const path = Array.isArray(e.path) ? e.path : [];
  if (!path.length) return;
  const t = now - e.t0;
  const ch = SHINRA_T.latomCharge, st = SHINRA_T.latomStep;
  const steps = Math.max(0, path.length - 1);
  const pts = path.map((q) => { const [x, y, s] = P(q.x + 0.5, q.y + 0.5); return { x, y, s }; });
  const A = pts[0];
  // 1) ชาร์จ: ไอพ่นเท้าบีบเข้า + แสงสะสม
  if (t < ch + 80) {
    const q = clamp01(t / ch);
    footJet(g, A.x, A.y - A.s * 0.05, A.s, A.s * (0.2 + 0.5 * q), q, t, ORG);
    glow(g, A.x, A.y - A.s * 0.3, A.s * (0.3 + 0.4 * q), ORG, q * 0.8);
    if (!lowQ) for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + t * 0.01, d = A.s * 0.9 * (1 - q);
      glow(g, A.x + Math.cos(a) * d, A.y - A.s * 0.3 + Math.sin(a) * d * 0.5, A.s * 0.06, YEL, q);
    }
  }
  if (!steps) return;
  // 2) พุ่ง: หัวดาวหางวิ่งตามเส้นทาง · เส้นไฟ (Rapid) ทิ้งไว้แล้วค่อยมอด
  const run = clamp01((t - ch) / (steps * st));
  const headF = run * steps;
  const at = (f) => {
    const i = Math.min(steps - 1, Math.floor(f)), u = f - i;
    return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * u, y: pts[i].y + (pts[i + 1].y - pts[i].y) * u, s: pts[i].s };
  };
  const endT = ch + steps * st;
  const fadeLine = 1 - clamp01((t - endT) / ((e.dur || SHINRA_FX_DUR.shinraLatom) - endT));
  if (t >= ch) {
    // ชินระพุ่งเอง (ตัวหมากเลื่อนตามเส้นทาง — BoardStage dash "shinraLatom") · ไฟพ่นจากฝ่าเท้าไปทางหลัง (ไอพ่น Rapid)
    //  ไม่ใช่ลำแสง: มีแค่ไอพ่นที่เท้า + หางไฟสั้นตามหลังตัว + รอยไหม้/ไฟลุกบนพื้นช่องที่ผ่าน
    const H = (q) => q.y - q.s * 0.1; // ระดับเท้า
    const back = Math.atan2(pts[0].y - pts[steps].y, pts[0].x - pts[steps].x); // มุมชี้ไปทางหลัง (บนจอ)
    // พื้นไหม้ + ไฟลุกเล็กๆ ช่องที่พุ่งผ่าน (มอดตามอายุ)
    for (let i = 1; i <= steps; i++) {
      if (i > headF + 0.5) break;
      const q = pts[i], age = clamp01((t - ch - i * st) / 1100);
      scorch(g, q.x, q.y, q.s, fadeLine * 0.85, 0.4);
      if (!lowQ) tongue(g, q.x, q.y, q.s * 0.06, q.s * 0.3 * Math.sin(Math.PI * clamp01(age + 0.08)) * fadeLine, 0, t * 0.03 + i, fadeLine * 0.8);
    }
    const head = run < 1 ? at(Math.min(steps - 0.0001, headF)) : pts[steps];
    const jetA = run < 1 ? 1 : 1 - clamp01((t - endT) / 320);
    if (jetA > 0) {
      // หางไฟสั้นตามหลังตัว (≤ 1.3 ช่อง) — เปลวเรียวจากเท้าไปหาง
      g.save(); g.globalCompositeOperation = "lighter";
      const tail = Math.min(headF, 1.3);
      for (let k = 0; k <= 8; k++) {
        const u = k / 8, f = Math.max(0, headF - tail * u), q = at(Math.min(steps - 0.0001, f));
        const wob = Math.sin(u * 9 + t * 0.04) * q.s * 0.04;
        glow(g, q.x, H(q) - q.s * 0.08 + wob, q.s * (0.2 - 0.13 * u), u < 0.3 ? ORG : RED, jetA * (0.7 - 0.6 * u), u < 0.25 ? CORE : YEL);
      }
      g.restore();
      // ไอพ่นสองเท้าชี้ไปทางหลัง (ยาว + ไหว)
      rocketJet(g, head.x, H(head), head.s, back, head.s * (1.1 + 0.2 * Math.sin(t * 0.06)), jetA, t);
      glow(g, head.x, H(head), head.s * 0.35, ORG, jetA * 0.6, CORE);
      embers(g, head.x, head.y, head.s, (t % 380) / 380, seed + headF, lowQ ? 6 : 14, 0.35, 0.5);
    }
  }
  // 3) ระเบิดปิดท้าย: ไล่จากช่องแรกที่ผ่านถึงปลายทาง ทีละช่อง — ลูกไฟ + คลื่นกระแทก + เสาไฟพุ่ง + เศษ (ช่องปลายทาง = ตัวชินระ ไม่ระเบิด)
  const bs = ch + steps * st + LATOM_BOOM.delay;
  for (let i = 1; i < steps; i++) {
    const q = (t - bs - (i - 1) * LATOM_BOOM.gap) / LATOM_BOOM.life;
    if (q < 0 || q > 1) continue;
    const c = pts[i];
    if (q < 0.08) glow(g, c.x, c.y - c.s * 0.2, c.s * 0.9, YEL, (1 - q / 0.08) * 0.75);
    // คลื่นกระแทกบนพื้น
    const w = clamp01(q / 0.45);
    if (w < 1) {
      g.strokeStyle = rgba(w < 0.4 ? YEL : ORG, (1 - w) * 0.85); g.lineWidth = Math.max(2, c.s * 0.05 * (1 - w));
      g.beginPath(); g.ellipse(c.x, c.y, c.s * (0.15 + 0.75 * w), c.s * (0.08 + 0.37 * w), 0, 0, TAU); g.stroke();
    }
    // เสาไฟพุ่งขึ้นสั้นๆ
    if (!lowQ && q < 0.5) tongue(g, c.x, c.y, c.s * 0.16, c.s * 1.1 * Math.sin(Math.PI * (q / 0.5)), Math.sin(i * 1.7) * 0.2, t * 0.04 + i, 0.9, BLAZE_ORG);
    fireball(g, c.x, c.y - c.s * 0.25, c.s, q, seed + i * 3.1, lowQ, 1.25, i % 2 ? ORG : BLAZE_ORG);
    // เศษดินกระเด็น
    if (!lowQ && q < 0.6) {
      g.fillStyle = rgba("50,34,26", 1 - q / 0.6);
      for (let k = 0; k < 8; k++) {
        const a = seed + i + k * 0.8, v = c.s * (0.5 + (k % 3) * 0.2), qq = q / 0.6;
        g.fillRect(c.x + Math.cos(a) * v * qq, c.y - Math.abs(Math.sin(a)) * v * qq * 1.3 + c.s * 1.2 * qq * qq, c.s * 0.035, c.s * 0.035);
      }
    }
  }
  embers(g, A.x, A.y, A.s, p, seed, lowQ ? 6 : 16, 0.5, 1.2);
}

// ---------- ลาทัมโดน / มอดไหม้จากภายใน / ได้มอดไหม้ ----------
function latomHitFx(g, e, p, seed, lowQ) {
  const B = bodyAt(e.x, e.y);
  fireball(g, B.bx, B.hy + B.s * 0.2, B.s, p, seed, lowQ, 1.2, ORG);
}
function detonateFx(g, e, p, seed, lowQ) {
  const B = bodyAt(e.x, e.y);
  const IN = 0.3; // ไฟรั่วจากในตัว (รอยแตกเรืองแสง)
  if (p < IN) {
    const q = p / IN;
    g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = rgba(YEL, q); g.lineWidth = Math.max(2, B.s * 0.035);
    for (let i = 0; i < (lowQ ? 4 : 8); i++) {
      const a = (i / 8) * TAU + seed;
      g.beginPath(); g.moveTo(B.bx, B.hy + B.s * 0.15);
      let x = B.bx, y = B.hy + B.s * 0.15;
      for (let k = 1; k <= 3; k++) {
        x += Math.cos(a + Math.sin(k * 3 + i) * 0.5) * B.s * 0.15 * q;
        y += Math.sin(a + Math.cos(k * 2 + i) * 0.5) * B.s * 0.12 * q;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    glow(g, B.bx, B.hy + B.s * 0.15, B.s * 0.35 * q, RED, q * 0.9, CORE);
    g.restore();
    return;
  }
  const q = (p - IN) / (1 - IN);
  fireball(g, B.bx, B.hy + B.s * 0.15, B.s, q, seed, lowQ, 1.45, BLAZE_ORG);
}
function smolderFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < (lowQ ? 6 : 14); i++) {
    const a = p * TAU * 2 + (i / 14) * TAU, r = A.s * (0.45 + 0.1 * Math.sin(i * 2 + p * 9)), up = A.s * 0.9 * p;
    glow(g, A.bx + Math.cos(a) * r, A.by - A.s * 0.2 - up * ((i % 4) / 4) + Math.sin(a) * r * 0.45, A.s * 0.07, i % 2 ? ORG : RED, (1 - p) * 0.9, CORE);
  }
  g.restore();
}
// ---------- รอยเท้าเถ้า (Devil's Footprints) ----------
function printsFx(g, e, now, lowQ) {
  const path = Array.isArray(e.path) ? e.path : [];
  for (let i = 1; i < path.length; i++) {
    const t = now - e.t0 - (i - 1) * (e.step || 120);
    if (t < 0) continue;
    const life = clamp01(t / SHINRA_FX_DUR.shinraPrints);
    const a0 = path[i - 1], a1 = path[i];
    const [x, y, s] = P(a1.x + 0.5, a1.y + 0.5);
    const ang = Math.atan2(a1.y - a0.y, a1.x - a0.x);
    const side = i % 2 ? 1 : -1;
    const ox = -Math.sin(ang) * s * 0.11 * side, oy = Math.cos(ang) * s * 0.055 * side;
    const a = 1 - life;
    g.save(); g.translate(x + ox, y + oy); g.rotate(ang); g.scale(1, 0.55);
    // เถ้าดำ + ขอบถ่านแดงที่มอดไป
    g.fillStyle = rgba("24,16,14", a * 0.75);
    g.beginPath(); g.ellipse(s * 0.05, 0, s * 0.13, s * 0.065, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-s * 0.12, 0, s * 0.065, s * 0.055, 0, 0, TAU); g.fill();
    const ember = clamp01(1 - life * 2.2);
    if (ember > 0) {
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = rgba(ORG, ember * (0.6 + 0.4 * Math.sin(now * 0.02 + i)));
      g.lineWidth = Math.max(1.5, s * 0.02);
      g.beginPath(); g.ellipse(s * 0.05, 0, s * 0.13, s * 0.065, 0, 0, TAU); g.stroke();
      g.beginPath(); g.ellipse(-s * 0.12, 0, s * 0.065, s * 0.055, 0, 0, TAU); g.stroke();
      if (!lowQ && life < 0.3) {
        g.scale(1, 1 / 0.55);
        tongue(g, 0, 0, s * 0.035, s * 0.16 * (1 - life / 0.3), -ang, now * 0.03 + i, (1 - life / 0.3) * 0.8);
      }
    }
    g.restore();
  }
}

export function shinraFx(g, e, now, lowQ) {
  const dur = e.dur || SHINRA_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "shinraKick" || e.kind === "shinraKickBlaze") { if (e.to) kickFx(g, e, p, seed, lowQ, e.kind === "shinraKickBlaze"); }
  else if (e.kind === "shinraHero") heroFx(g, e, p, seed, lowQ);
  else if (e.kind === "shinraStorm") stormFx(g, e, p, seed, lowQ);
  else if (e.kind === "shinraWarm") warmFx(g, e, p, seed, lowQ);
  else if (e.kind === "shinraLatom") latomFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "shinraLatomHit") latomHitFx(g, e, p, seed, lowQ);
  else if (e.kind === "shinraDetonate") detonateFx(g, e, p, seed, lowQ);
  else if (e.kind === "shinraSmolder") smolderFx(g, e, p, seed, lowQ);
  else if (e.kind === "shinraPrints") printsFx(g, e, now, lowQ);
  g.restore();
}

// ---------- ออร่าค้าง (drawUnit) ----------
//  hero  = ไอพ่นเล็กใต้เท้าไหวตลอด + ถ่านลอย (ฉันนี่แหละฮีโร่)
//  blaze = เพลิงท่วมตัว แดงส้ม + ควันดำ + ไอพ่นแรง (อุ่นเครื่องพอแล้ว) — วาดหลังตัว (back) และหน้าตัว (front)
export function shinraAuraBack(g, x, y, now, lowQ, alpha = 1, blaze = false) {
  const [bx, by, s] = P(x, y);
  g.save();
  g.globalAlpha *= alpha;
  if (blaze) {
    scorch(g, bx, by, s, 0.55, 0.55);
    g.globalCompositeOperation = "lighter";
    glow(g, bx, by - s * 0.5, s * 0.75, BLAZE_RED, 0.45 + 0.1 * Math.sin(now / 160), CORE);
    for (let i = 0; i < (lowQ ? 3 : 7); i++) {
      const off = ((i % 7) - 3) * s * 0.07;
      tongue(g, bx + off, by - s * 0.02, s * 0.1, s * (0.75 + 0.25 * Math.sin(now / 210 + i * 1.3)), off / s * 0.8, now / 90 + i * 2.1, 0.7, i % 2 ? BLAZE_ORG : BLAZE_RED);
    }
    if (!lowQ) for (let k = 0; k < 3; k++) {
      const q = ((now / 1600 + k / 3) % 1);
      g.globalCompositeOperation = "source-over";
      puff(g, bx + Math.sin(k * 2 + now / 900) * s * 0.15, by - s * (0.9 + 0.8 * q), s * (0.15 + 0.2 * q), (1 - q) * 0.3);
    }
  } else {
    g.globalCompositeOperation = "lighter";
    glow(g, bx, by - s * 0.02, s * 0.3, ORG, 0.35 + 0.1 * Math.sin(now / 120));
  }
  g.restore();
}
export function shinraAuraFront(g, x, y, now, lowQ, alpha = 1, blaze = false) {
  const [bx, by, s] = P(x, y);
  g.save();
  g.globalAlpha *= alpha;
  footJet(g, bx, by - s * 0.03, s, s * ((blaze ? 0.3 : 0.2) + 0.06 * Math.sin(now / 70)), blaze ? 0.95 : 0.8, now, blaze ? BLAZE_ORG : ORG);
  if (!lowQ) {
    const q = (now % 1400) / 1400;
    embers(g, bx, by, s, q, 3.1, blaze ? 10 : 5, 0.35, blaze ? 1.5 : 0.9, blaze ? "255,120,40" : YEL);
    embers(g, bx, by, s, (q + 0.5) % 1, 7.7, blaze ? 10 : 5, 0.35, blaze ? 1.5 : 0.9, blaze ? "255,120,40" : YEL);
  }
  if (blaze && !lowQ) {
    for (const side of [-1, 1]) tongue(g, bx + side * s * 0.3, by - s * 0.05, s * 0.06, s * (0.35 + 0.1 * Math.sin(now / 150 + side)), side * 0.35, now / 80 + side * 3, 0.65, BLAZE_RED);
  }
  g.restore();
}

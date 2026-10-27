// ============================================================
//  เอฟเฟกต์บนกระดานของยูกิ มาโคโตะ (characters/yuki_makoto.js) — ท่าไม้ตาย "เกิดใหม่เป็นประตู"
//  ระหว่างนับถอยหลัง (players[].yuki = { left, at } → units[].yuki):
//    กระดานมืดลง ~25% ค่อยๆ มืดใน 1.5 วิ (drawYukiDim — ใต้ไฮไลต์/ตัวละคร)
//    ออร่าฟ้า-ขาวแบบ Persona ไหลเข้าหาตัววนไม่หยุด เข้มขึ้นตาม left ที่น้อยลง (yukiAuraBack/Front — วาดคู่กับ drawUnit
//    จึงอยู่ในกรอบหมุนของ Colony เอง) + ตัวเลขนับถอยหลังมุมขวาบนของหมาก
//  จดตำแหน่งบนจอของหมากทุกตัวระหว่างชาร์จ (yukiNoteUnit) → ฉากระเบิด (YukiBoom.jsx) ใช้หาจุดระเบิด + เงาดำของยูนิต
//  lowQ = อนุภาคน้อยลง ไม่มีเสาแสง/คลื่นดูด · ลดการเคลื่อนไหว = ออร่านิ่ง
// ============================================================
import { F_UI, P, gEllipse, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const easeIn2 = (t) => t * t;

const BLUE = "110,180,255", PALE = "205,234,255", CORE = "240,250,255", DEEP = "46,96,230";
// ความเข้มตามเทิร์นที่เหลือ: 3 → 0.5 · 2 → 0.75 · 1 → 1
export const yukiPower = (left) => (left >= 3 ? 0.5 : left === 2 ? 0.75 : 1);

// ---------- กระดานมืด (ทั้งเฟรม) ----------
const DIM_MAX = 0.25, DIM_MS = 1500;
let dimK = 0, dimT = 0, tracking = false, trackT = 0;
//  เรียกทุกเฟรม (ค่อยๆ มืด/สว่างคืนเอง) · ตั้งธงจดตำแหน่งหมาก
export function drawYukiDim(g, units, view, now) {
  const on = units.some((u) => u.yuki && !u.corpse);
  tracking = on;
  const dt = dimT ? Math.min(100, Math.max(0, now - dimT)) : 0;
  dimT = now;
  const step = (dt / DIM_MS) * DIM_MAX;
  dimK = on ? Math.min(DIM_MAX, dimK + step) : Math.max(0, dimK - step);
  if (dimK <= 0.002) return;
  const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
  const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
  g.save();
  g.globalCompositeOperation = "source-over";
  g.fillStyle = `rgba(4,8,22,${dimK})`;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.restore();
}

// ---------- ตำแหน่งบนจอของหมาก (ให้ฉากระเบิด) ----------
const seen = new Map(); // id → { x, y, fx, fy, r, cv, t } (พิกเซลของแคนวาส)
//  เรียกจาก drawAnyUnit (อยู่ในกรอบหมุนของ Colony แล้ว — getTransform รวมการหมุน/ซูมให้)
export function yukiNoteUnit(g, u) {
  if (!tracking || !u || u.corpse || typeof g.getTransform !== "function") return;
  const n = Math.max(1, u.size | 0), K = n > 1 ? 1 + (n - 1) * 0.6 : 1;
  const wx = u.rx + n / 2 + (u.ox || 0), wy = u.ry + n / 2 + (u.oy || 0);
  const [bx, by, s] = P(wx, wy, 0);
  if (!Number.isFinite(bx) || !Number.isFinite(by)) return;
  const hy = by - s * 0.86 * K;
  const m = g.getTransform(), sc = Math.hypot(m.a, m.b) || 1;
  const t = typeof performance !== "undefined" ? performance.now() : Date.now();
  seen.set(u.id, {
    x: m.a * bx + m.c * hy + m.e, y: m.b * bx + m.d * hy + m.f,
    fx: m.a * bx + m.c * by + m.e, fy: m.b * bx + m.d * by + m.f,
    r: s * 0.4 * K * sc, cv: g.canvas, t, color: u.color || "#ffffff",
  });
  trackT = t;
  if (seen.size > 64) for (const [id, v] of seen) if (t - v.t > 5000) seen.delete(id);
}
// หมากทุกตัวจากเฟรมสุดท้ายที่จด → พิกัดหน้าจอ (CSS px ของ viewport) · [{ id, x, y, fx, fy, r, color }]
export function yukiScreenUnits() {
  const out = [];
  const rects = new Map();
  for (const [id, v] of seen) {
    if (trackT - v.t > 600 || !v.cv || !v.cv.isConnected) continue;
    let rc = rects.get(v.cv);
    if (!rc) { const b = v.cv.getBoundingClientRect(); rc = { l: b.left, t: b.top, k: v.cv.width ? b.width / v.cv.width : 1 }; rects.set(v.cv, rc); }
    out.push({ id, x: rc.l + v.x * rc.k, y: rc.t + v.y * rc.k, fx: rc.l + v.fx * rc.k, fy: rc.t + v.fy * rc.k, r: v.r * rc.k, color: v.color });
  }
  return out;
}

// ---------- ออร่า ----------
//  ชั้นหลัง (ก่อนตัวละคร): แสงฟ้าบนพื้น + วงแสงหมุนสวนกัน + คลื่นวงหดเข้าหาตัว
export function yukiAuraBack(g, wx, wy, now, lowQ, left, alpha = 1, K = 1) {
  const k = yukiPower(left) * alpha, t = REDUCED ? 0 : now;
  g.save();
  g.globalCompositeOperation = "lighter";
  const [gx, gy, gs] = P(wx, wy, 0.03);
  glow(g, gx, gy, gs * (0.95 + 0.55 * k) * K, BLUE, 0.4 * k);
  gEllipse(g, wx, wy, 0.6 * K, 0.02, 40); g.strokeStyle = `rgba(${PALE},${0.6 * k})`; g.lineWidth = 1.8; g.stroke();
  // วงขีดหมุน 2 วง (สวนกัน)
  for (const [r, dir, n] of [[0.86, 1, 14], [1.08, -1, 20]]) {
    const rot = (dir * t) / 2600;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * TAU, a1 = a0 + (TAU / n) * 0.45;
      const p0 = P(wx + Math.cos(a0) * r * K, wy + Math.sin(a0) * r * K, 0.02), p1 = P(wx + Math.cos(a1) * r * K, wy + Math.sin(a1) * r * K, 0.02);
      g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    }
    g.strokeStyle = `rgba(${dir > 0 ? PALE : BLUE},${0.5 * k})`; g.lineWidth = 1.4; g.stroke();
  }
  // คลื่นวงหดเข้าหาตัว (ดูดพลังเข้ามา)
  if (!lowQ && !REDUCED) {
    for (let i = 0; i < 3; i++) {
      const ph = (t / 1500 + i / 3) % 1, r = (1.7 - 1.35 * easeIn2(ph)) * K;
      gEllipse(g, wx, wy, r, 0.02, 44);
      g.strokeStyle = `rgba(${PALE},${Math.sin(Math.PI * ph) * 0.45 * k})`; g.lineWidth = 1 + 2 * ph; g.stroke();
    }
  }
  g.restore();
}
//  ชั้นหน้า (หลังตัวละคร): เสาแสง · อนุภาคไหลวนเข้าหาตัว · แสงที่อก · ดาว 4 แฉก (เทิร์นสุดท้าย) · ตัวเลขนับถอยหลัง
//  bx, hy, hexR = ตำแหน่ง/ขนาดหกเหลี่ยมบนจอ (จาก drawUnit) · UK = ตัวคูณขนาดป้าย (Colony)
export function yukiAuraFront(g, u, wx, wy, bx, by, hy, hexR, now, lowQ, UK = 1) {
  const left = u.yuki.left | 0, a0 = u.alpha == null ? 1 : u.alpha, k = yukiPower(left) * a0, t = REDUCED ? 0 : now;
  const K = u.k || 1;
  g.save();
  g.globalCompositeOperation = "lighter";
  // เสาแสงจางจากพื้นขึ้นเหนือหัว
  if (!lowQ) {
    const top = hy - hexR * (2.4 + 1.4 * k), w = hexR * (0.55 + 0.25 * k);
    const gr = g.createLinearGradient(0, by, 0, top);
    gr.addColorStop(0, `rgba(${BLUE},${0.26 * k})`); gr.addColorStop(0.55, `rgba(${PALE},${0.14 * k})`); gr.addColorStop(1, `rgba(${PALE},0)`);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(bx - w, by); g.lineTo(bx - w * 0.35, top); g.lineTo(bx + w * 0.35, top); g.lineTo(bx + w, by); g.closePath(); g.fill();
  }
  // อนุภาคไหลวนเข้าหาตัว (เริ่มรอบตัวบนพื้น/กลางอากาศ → เข้าหกเหลี่ยม)
  const N = Math.round((lowQ ? 12 : 30) * (0.6 + 0.4 * k));
  const [, , s0] = P(wx, wy, 0);
  for (let i = 0; i < N; i++) {
    const h1 = hash01(i + 1), h2 = hash01(i + 41), h3 = hash01(i + 83);
    const dur = 1200 + 900 * h1, age = ((t / dur) + h2) % 1, uu = easeIn2(age);
    const th = h3 * TAU + age * 2.2, r0 = (1.25 + 1.05 * h1) * K;
    const st = P(wx + Math.cos(th) * r0 * (1 - uu * 0.35), wy + Math.sin(th) * r0 * (1 - uu * 0.35), 0.1 + 1.5 * h2);
    const px = st[0] + (bx - st[0]) * uu, py = st[1] + (hy - st[1]) * uu;
    const pa = clamp01(Math.sin(Math.PI * Math.min(1, age * 1.15))) * k;
    if (pa <= 0.02) continue;
    if (!lowQ) {
      // หางอนุภาค (ย้อนเวลาเล็กน้อย)
      const ab = Math.max(0, age - 0.07), ub = easeIn2(ab), thb = h3 * TAU + ab * 2.2;
      const sb = P(wx + Math.cos(thb) * r0 * (1 - ub * 0.35), wy + Math.sin(thb) * r0 * (1 - ub * 0.35), 0.1 + 1.5 * h2);
      g.strokeStyle = `rgba(${PALE},${0.5 * pa})`; g.lineWidth = Math.max(1, s0 * 0.018);
      g.beginPath(); g.moveTo(sb[0] + (bx - sb[0]) * ub, sb[1] + (hy - sb[1]) * ub); g.lineTo(px, py); g.stroke();
      glow(g, px, py, s0 * 0.07, BLUE, 0.4 * pa);
    }
    g.fillStyle = `rgba(${CORE},${pa})`; g.beginPath(); g.arc(px, py, Math.max(1.1, s0 * 0.022), 0, TAU); g.fill();
  }
  // แสงที่อก (เต้นเป็นจังหวะ เร็วขึ้นเมื่อใกล้ครบ)
  const beat = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(t / (left <= 1 ? 170 : left === 2 ? 260 : 380));
  glow(g, bx, hy, hexR * (1.3 + 0.7 * k + 0.25 * beat), BLUE, (0.3 + 0.2 * beat) * k);
  glow(g, bx, hy, hexR * (0.55 + 0.25 * beat), CORE, (0.2 + 0.25 * beat) * k);
  // เทิร์นสุดท้าย: ดาว 4 แฉกขาวที่อก
  if (left <= 1) {
    const L = hexR * (1.1 + 0.35 * beat), w = hexR * 0.09, rot = REDUCED ? 0 : t / 4000;
    g.save(); g.translate(bx, hy); g.rotate(rot);
    g.fillStyle = `rgba(${CORE},${0.75 * a0})`;
    for (let q = 0; q < 4; q++) {
      g.rotate(Math.PI / 2);
      g.beginPath(); g.moveTo(0, -w); g.lineTo(L, 0); g.lineTo(0, w); g.closePath(); g.fill();
    }
    g.restore();
  }
  g.restore();
  // ตัวเลขนับถอยหลัง (มุมขวาบนของหกเหลี่ยม)
  if (left > 0) {
    const r = 11 * UK, cx = bx + hexR * 0.95 * K, cy = hy - hexR * 0.85;
    g.save();
    g.globalAlpha = a0;
    g.beginPath(); g.arc(cx, cy, r + 1.6 * UK, 0, TAU); g.fillStyle = "#eaf4ff"; g.fill();
    g.beginPath(); g.arc(cx, cy, r, 0, TAU);
    const gr = g.createLinearGradient(0, cy - r, 0, cy + r); gr.addColorStop(0, "#3a7cf0"); gr.addColorStop(1, `rgb(${DEEP})`); g.fillStyle = gr; g.fill();
    g.font = `700 ${13 * UK}px ${F_UI}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#ffffff"; g.fillText(String(left), cx, cy + 0.5 * UK); g.textBaseline = "alphabetic";
    g.restore();
  }
}

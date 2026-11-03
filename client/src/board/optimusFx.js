// ============================================================
//  เอฟเฟกต์บนกระดานของรถบรรทุกเก่า / ออพติมัส ไพร์ม (characters/old_truck.js)
//  อ้างอิงภาค 4–5: ร่างพรางรถเก่า (ห้องโดยสารหัวตัด) · รถหัวยาวลายไฟ · ดาบเรืองทอง/ฟ้า + โล่
//
//  ตีปกติ (fx.kind = attackStyle) — fx { x, y (ช่องผู้ตี), size, to: { x, y } }
//    otSlash   ออพติมัสฟันดาบ: ดาบเรืองทองง้างเหนือเป้า → รอยฟันโค้งทองแกนขาว → ประกายเหล็กแตก + รอยฟันบนพื้น
//    otRam     ร่างรถพุ่งชน: แสงไฟหน้ารถ + เส้นความเร็วจากผู้ตีถึงเป้า → ปะทะ ดาวแตกส้ม + ฝุ่น
//    otCounter ฟันสวน (ผู้พิทักษ์): โล่ฟ้าแวบที่ผู้สวน → คลื่นฟันฟ้าวิ่งไปหาผู้ตี (ระยะเท่าไรก็ได้) → รอยฟันกากบาท
//  เหตุการณ์จาก server (socket "optimusFx" { kind, id, at, color, ... } → OT_EVENT_FX)
//    arc        ท่าไม้ตาย: ช่องครึ่งวงสว่างจากในออกนอก + ใบดาบทองกวาด 180° → ปะทะ (OT_ARC_HIT) ทุกช่องแตกประกาย
//    transform  แปลงร่าง: เสาแสง + เศษเกราะหมุนรอบตัว (form prime = ฟ้า · truck = ส้มแดง)
//    stance     ผู้พิทักษ์: โดมโล่หกเหลี่ยมฟ้าแวบรอบตัว
//    heal       ฟื้นพลังชีวิต: ประกายเขียวฟ้าลอยขึ้น
//  ตัวหมาก (u.truck = { form, stance }): ร่างรถ = รูปรถตัดพื้นหลังใต้หมาก หมากนั่งบนรถ (แบบม้าของไจโร)
//    ผู้พิทักษ์ตั้งท่าอยู่ = วงโล่ฟ้าเต้นใต้ตัว
//  lowQ = ตัดประกาย/เรืองซ้อนครึ่งหนึ่ง · ลดการเคลื่อนไหว = ไม่เด้ง ไม่หมุน
// ============================================================
import { P, gEllipse, glow, quad } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const OT_MS = { otSlash: 900, otRam: 820, otCounter: 950 };
export const OT_HIT_P = { otSlash: 0.5, otRam: 0.55, otCounter: 0.55 };
// ท่าไม้ตาย: ต้องตรงกับ ULT_HIT_SECONDS (0.45 วิ) ใน characters/old_truck.js
export const OT_ARC_MS = 1200;
export const OT_ARC_HIT = 450 / OT_ARC_MS;
export const OT_FX_DUR = { ...OT_MS, otArc: OT_ARC_MS, otTransform: 1100, otStance: 1000, otHeal: 1000 };
export const OT_EVENT_FX = { arc: "otArc", transform: "otTransform", stance: "otStance", heal: "otHeal" };
export const isOtFx = (kind) => typeof kind === "string" && (kind in OT_FX_DUR);
export const OT_RIDE_Z = 0.62; // ร่างรถ: หมากนั่งบนหลังคารถ (หน่วยช่อง — BoardCanvas บวกเข้า hz)

const GOLD = "255,196,70", GOLD_HI = "255,240,190", BLUE = "70,170,255", BLUE_HI = "200,235,255", FIRE = "255,120,40", WHITE = "255,255,255";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const center = (e) => [e.x + (e.size || 1) / 2, e.y + (e.size || 1) / 2];

// ---------- ชิ้นส่วนที่ใช้ร่วม ----------
// รอยฟันโค้งในระนาบจอ (กว้าง w สเกลช่อง) จากมุม a0 → a1 รอบจุด (sx, sy) · prog 0..1 = ปลายดาบวิ่งไปถึงไหน
function bladeArc(g, sx, sy, r, a0, a1, prog, width, rgb, hi, k, lowQ) {
  if (prog <= 0 || k <= 0) return;
  const a = a0 + (a1 - a0) * prog, tail = a0 + (a1 - a0) * Math.max(0, prog - 0.55);
  g.save(); g.lineCap = "round";
  if (!lowQ) {
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(${rgb},${0.35 * k})`; g.lineWidth = width * 2.6;
    g.beginPath(); g.arc(sx, sy, r, Math.min(tail, a), Math.max(tail, a)); g.stroke();
  }
  g.globalCompositeOperation = "source-over";
  g.strokeStyle = `rgba(${rgb},${0.95 * k})`; g.lineWidth = width;
  g.beginPath(); g.arc(sx, sy, r, Math.min(tail, a), Math.max(tail, a)); g.stroke();
  g.strokeStyle = `rgba(${hi},${k})`; g.lineWidth = Math.max(1, width * 0.35);
  g.beginPath(); g.arc(sx, sy, r, Math.min(tail, a), Math.max(tail, a)); g.stroke();
  g.restore();
}
// ประกายแตกกระจายจากจุดปะทะ
function sparks(g, sx, sy, sc, q, rgb, n, seed, lowQ) {
  if (q < 0 || q > 1) return;
  const m = lowQ ? Math.ceil(n / 2) : n, k = 1 - q;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < m; i++) {
    const th = hash01(seed + i) * Math.PI * 2, sp = 0.4 + hash01(seed + i + 50) * 0.6;
    const d = sc * (0.15 + easeOut3(q) * 0.9 * sp), l = sc * 0.12 * k;
    const x = sx + Math.cos(th) * d, y = sy + Math.sin(th) * d * 0.75 + q * q * sc * 0.25;
    g.strokeStyle = `rgba(${rgb},${k})`; g.lineWidth = Math.max(1, sc * 0.02);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(th) * l, y - Math.sin(th) * l * 0.75); g.stroke();
  }
  g.restore();
}
function groundCut(g, cx, cy, ang, len, k, rgb) {
  const a = P(cx - Math.cos(ang) * len, cy - Math.sin(ang) * len, 0.01), b = P(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len, 0.01);
  g.strokeStyle = `rgba(${rgb},${0.85 * k})`; g.lineWidth = Math.max(1.5, a[2] * 0.045);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
}

// ---------- ตีปกติ: ออพติมัสฟันดาบ ----------
function otSlash(g, e, now, lowQ) {
  const t = (now - e.t0) / OT_MS.otSlash;
  if (t <= 0 || t >= 1) return;
  const HIT = OT_HIT_P.otSlash, tx = e.to.x + 0.5, ty = e.to.y + 0.5;
  const [sx, sy, sc] = P(tx, ty, 0.55);
  g.save();
  // ง้าง: ดาบเรืองทองตั้งเหนือเป้า
  if (t < HIT) {
    const k = clamp01(t / 0.2);
    glow(g, sx, sy - sc * 0.55, sc * 0.4 * k, GOLD, 0.5 * k);
  }
  // รอยฟันโค้ง: จากบนขวาลงล่างซ้าย ตามจังหวะปะทะ
  const prog = t < HIT ? easeOut3(clamp01((t - 0.18) / (HIT - 0.18))) : 1;
  const k = t < HIT ? 1 : clamp01(1 - (t - HIT) / 0.35);
  bladeArc(g, sx + sc * 0.1, sy - sc * 0.05, sc * 0.55, -1.3, 2.2, prog, Math.max(3, sc * 0.09), GOLD, GOLD_HI, k, lowQ);
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT);
    if (q < 0.25) glow(g, sx, sy, sc * (0.5 + q), WHITE, 0.8 * (1 - q / 0.25));
    sparks(g, sx, sy, sc, q, GOLD_HI, 14, e.to.x * 7 + e.to.y, lowQ);
    groundCut(g, tx, ty, 0.7, 0.42, 1 - q, GOLD);
  }
  g.restore();
}

// ---------- ตีปกติ: ร่างรถพุ่งชน ----------
function otRam(g, e, now, lowQ) {
  const t = (now - e.t0) / OT_MS.otRam;
  if (t <= 0 || t >= 1) return;
  const HIT = OT_HIT_P.otRam, [ox, oy] = center(e), tx = e.to.x + 0.5, ty = e.to.y + 0.5;
  const dx = tx - ox, dy = ty - oy, L = Math.hypot(dx, dy) || 1, fx = dx / L, fy = dy / L;
  g.save(); g.lineCap = "round";
  // ไฟหน้ารถ + เส้นความเร็ว
  if (t < HIT + 0.1) {
    const u = clamp01(t / HIT), k = t < HIT ? 1 : clamp01(1 - (t - HIT) / 0.1);
    const [hx, hy, hs] = P(ox + fx * (0.35 + u * (L - 0.6)), oy + fy * (0.35 + u * (L - 0.6)), 0.3);
    glow(g, hx, hy, hs * 0.5, "255,240,200", 0.7 * k);
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < (lowQ ? 3 : 6); i++) {
      const off = (hash01(i + 3) - 0.5) * 0.6, z = 0.1 + hash01(i + 9) * 0.5;
      const a = P(ox + fx * 0.3 - fy * off, oy + fy * 0.3 + fx * off, z), b = P(ox + fx * (0.3 + u * (L - 0.5)) - fy * off, oy + fy * (0.3 + u * (L - 0.5)) + fx * off, z);
      g.strokeStyle = `rgba(${WHITE},${0.45 * k})`; g.lineWidth = Math.max(1, a[2] * 0.02);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    g.globalCompositeOperation = "source-over";
  }
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT), [sx, sy, sc] = P(tx - fx * 0.3, ty - fy * 0.3, 0.35);
    if (q < 0.3) glow(g, sx, sy, sc * (0.45 + q * 1.2), FIRE, 0.8 * (1 - q / 0.3));
    sparks(g, sx, sy, sc, q, FIRE, 12, e.to.x * 5 + e.to.y * 3, lowQ);
    // ฝุ่นพื้น
    if (!lowQ) for (let i = 0; i < 5; i++) {
      const th = hash01(i + 21) * Math.PI * 2, [px, py, ps] = P(tx + Math.cos(th) * 0.35 * (0.5 + q), ty + Math.sin(th) * 0.35 * (0.5 + q), 0.05 + q * 0.2);
      glow(g, px, py, ps * (0.15 + q * 0.2), "170,150,120", 0.35 * (1 - q));
    }
  }
  g.restore();
}

// ---------- ตีปกติ: ฟันสวน (ผู้พิทักษ์) ----------
function otCounter(g, e, now, lowQ) {
  const t = (now - e.t0) / OT_MS.otCounter;
  if (t <= 0 || t >= 1) return;
  const HIT = OT_HIT_P.otCounter, [ox, oy] = center(e), tx = e.to.x + 0.5, ty = e.to.y + 0.5;
  g.save();
  // โล่ฟ้าแวบที่ผู้สวน
  if (t < 0.35) {
    const k = 1 - t / 0.35, [bx, by, bs] = P(ox, oy, 0.55);
    hexShield(g, bx, by, bs * (0.5 + t * 0.4), k, lowQ);
  }
  // คลื่นฟันฟ้าวิ่งจากผู้สวนไปหาผู้ตี
  if (t > 0.15 && t < HIT + 0.08) {
    const u = easeOut3(clamp01((t - 0.15) / (HIT - 0.15))), k = t < HIT ? 1 : clamp01(1 - (t - HIT) / 0.08);
    const [cx, cy, cs] = P(ox + (tx - ox) * u, oy + (ty - oy) * u, 0.5);
    glow(g, cx, cy, cs * 0.45, BLUE, 0.6 * k);
    bladeArc(g, cx, cy, cs * 0.35, -0.9, 0.9, 1, Math.max(3, cs * 0.08), BLUE, BLUE_HI, k, lowQ);
  }
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT), [sx, sy, sc] = P(tx, ty, 0.5), k = 1 - q;
    g.lineCap = "round";
    for (const [a, b] of [[-0.8, 0.8], [0.8, -0.8]]) {
      g.strokeStyle = `rgba(${BLUE},${k})`; g.lineWidth = Math.max(2, sc * 0.07);
      g.beginPath(); g.moveTo(sx + a * sc * 0.4, sy - sc * 0.4); g.lineTo(sx + b * sc * 0.4, sy + sc * 0.4); g.stroke();
      g.strokeStyle = `rgba(${BLUE_HI},${k})`; g.lineWidth = Math.max(1, sc * 0.025); g.stroke();
    }
    sparks(g, sx, sy, sc, q, BLUE_HI, 10, e.to.x * 11 + e.to.y, lowQ);
    // หยดเลือดไหล
    for (let i = 0; i < (lowQ ? 2 : 4); i++) {
      const [dx, dy, ds] = P(tx + (hash01(i + 70) - 0.5) * 0.4, ty + (hash01(i + 80) - 0.5) * 0.3, 0.45 - q * 0.45);
      g.fillStyle = `rgba(190,20,30,${k})`; g.beginPath(); g.arc(dx, dy, Math.max(1.5, ds * 0.03), 0, 7); g.fill();
    }
  }
  g.restore();
}
function hexShield(g, cx, cy, r, k, lowQ) {
  g.save();
  g.beginPath();
  for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; (i ? g.lineTo : g.moveTo).call(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9); }
  g.fillStyle = `rgba(${BLUE},${0.22 * k})`; g.fill();
  g.strokeStyle = `rgba(${BLUE_HI},${0.95 * k})`; g.lineWidth = 2; g.stroke();
  if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, cx, cy, r * 1.3, BLUE, 0.35 * k); }
  g.restore();
}

// ---------- ท่าไม้ตาย: คลื่นครึ่งวง ----------
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function otArc(g, e, now, lowQ) {
  const t = (now - e.t0) / OT_ARC_MS;
  if (t <= 0 || t >= 1) return;
  const v = DIRS[e.dir] || [0, -1], [ox, oy] = center(e), HIT = OT_ARC_HIT;
  const tiles = Array.isArray(e.tiles) ? e.tiles : [];
  g.save(); g.lineCap = "round";
  // ช่องในวง: สว่างทองจากในออกนอกก่อนปะทะ · หลังปะทะ รอยไหม้จาง
  for (const tl of tiles) {
    const d = Math.abs(tl.x + 0.5 - ox) + Math.abs(tl.y + 0.5 - oy), on = (HIT * 0.6) * (d / 3);
    if (t < on) continue;
    const k = t < HIT ? clamp01((t - on) / 0.12) * 0.55 : clamp01(1 - (t - HIT) / (1 - HIT));
    quad(g, tl.x, tl.y, 0.05); g.fillStyle = `rgba(${GOLD},${0.4 * k})`; g.fill();
    g.strokeStyle = `rgba(${GOLD_HI},${0.8 * k})`; g.lineWidth = 1.5; g.stroke();
    if (t >= HIT) {
      const q = (t - HIT) / (1 - HIT), [sx, sy, sc] = P(tl.x + 0.5, tl.y + 0.5, 0.3);
      if (q < 0.2) glow(g, sx, sy, sc * 0.6, WHITE, 0.7 * (1 - q / 0.2));
      sparks(g, sx, sy, sc * 0.8, q, GOLD_HI, 6, tl.x * 13 + tl.y * 7, lowQ);
    }
  }
  // ใบดาบทองกวาดครึ่งวง: วาดเป็นจุดตามโค้งบนพื้น (มองมุมไหนก็ได้รูปครึ่งวง)
  const base = Math.atan2(v[1], v[0]), sweep = t < HIT ? easeOut3(clamp01((t - 0.1) / (HIT - 0.1))) : 1;
  const k = t < HIT ? 1 : clamp01(1 - (t - HIT) / 0.3);
  if (t > 0.1 && k > 0) {
    const R = 0.6 + 1.9 * sweep, n = 24;
    for (const [rgb, w, al] of lowQ ? [[GOLD, 0.09, 1]] : [[GOLD, 0.2, 0.35], [GOLD, 0.09, 1], [GOLD_HI, 0.035, 1]]) {
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = base - Math.PI / 2 + (Math.PI * i) / n, [px, py] = P(ox + Math.cos(a) * R, oy + Math.sin(a) * R, 0.25);
        (i ? g.lineTo : g.moveTo).call(g, px, py);
      }
      const [, , s0] = P(ox, oy, 0.25);
      g.strokeStyle = `rgba(${rgb},${al * k})`; g.lineWidth = Math.max(1.5, s0 * w); g.stroke();
    }
  }
  // ดาบง้างที่ตัว
  if (t < HIT) { const [bx, by, bs] = P(ox, oy, 0.9); glow(g, bx, by, bs * 0.5, GOLD, 0.6 * clamp01(t / 0.15)); }
  g.restore();
}

// ---------- แปลงร่าง / ผู้พิทักษ์ / ฟื้นพลังชีวิต ----------
function otTransform(g, e, now, lowQ) {
  const t = (now - e.t0) / OT_FX_DUR.otTransform;
  if (t <= 0 || t >= 1) return;
  const [ox, oy] = center(e), rgb = e.form === "prime" ? BLUE : FIRE, k = Math.sin(Math.PI * t);
  const [bx, by, bs] = P(ox, oy, 0), [tx, ty] = P(ox, oy, 2.2);
  g.save(); g.globalCompositeOperation = "lighter";
  const gr = g.createLinearGradient(bx, by, tx, ty);
  gr.addColorStop(0, `rgba(${rgb},${0.6 * k})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(bx - bs * 0.35, ty, bs * 0.7, by - ty);
  glow(g, bx, by - bs * 0.5, bs * 0.8, WHITE, 0.45 * k);
  g.globalCompositeOperation = "source-over";
  // เศษเกราะหมุนรอบตัว
  const n = lowQ ? 6 : 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (REDUCED ? 0 : t * 5), r = 0.45 + 0.15 * Math.sin(i), z = 0.2 + 0.9 * ((i * 0.37 + t) % 1);
    const [px, py, ps] = P(ox + Math.cos(a) * r, oy + Math.sin(a) * r, z), w = ps * 0.07;
    g.fillStyle = i % 3 ? `rgba(170,180,195,${k})` : `rgba(${rgb},${k})`;
    g.save(); g.translate(px, py); g.rotate(a + t * 8); g.fillRect(-w, -w * 0.5, w * 2, w); g.restore();
  }
  gEllipse(g, ox, oy, 0.3 + 0.4 * t, 0.02, 32); g.strokeStyle = `rgba(${rgb},${k})`; g.lineWidth = 2; g.stroke();
  g.restore();
}
function otStance(g, e, now, lowQ) {
  const t = (now - e.t0) / OT_FX_DUR.otStance;
  if (t <= 0 || t >= 1) return;
  const [ox, oy] = center(e), [bx, by, bs] = P(ox, oy, 0.7), k = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
  hexShield(g, bx, by, bs * (0.55 + 0.15 * easeOut3(t)), k, lowQ);
  gEllipse(g, ox, oy, 0.45 + 0.3 * t, 0.02, 32); g.strokeStyle = `rgba(${BLUE_HI},${k})`; g.lineWidth = 2; g.stroke();
}
function otHeal(g, e, now, lowQ) {
  const t = (now - e.t0) / OT_FX_DUR.otHeal;
  if (t <= 0 || t >= 1) return;
  const [ox, oy] = center(e), n = lowQ ? 5 : 10;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const q = clamp01(t * 1.3 - hash01(i + 5) * 0.3), a = hash01(i + 31) * Math.PI * 2, r = 0.25 + 0.15 * hash01(i);
    const [px, py, ps] = P(ox + Math.cos(a) * r, oy + Math.sin(a) * r, 0.1 + q * 1.3), k = Math.sin(Math.PI * q);
    glow(g, px, py, ps * 0.09, "120,255,200", 0.9 * k);
    g.fillStyle = `rgba(230,255,245,${k})`; g.fillRect(px - 1, py - ps * 0.04, 2, ps * 0.08); g.fillRect(px - ps * 0.04, py - 1, ps * 0.08, 2);
  }
  g.restore();
}

export function optimusFx(g, e, now, lowQ) {
  switch (e.kind) {
    case "otSlash": otSlash(g, e, now, lowQ); break;
    case "otRam": otRam(g, e, now, lowQ); break;
    case "otCounter": otCounter(g, e, now, lowQ); break;
    case "otArc": otArc(g, e, now, lowQ); break;
    case "otTransform": otTransform(g, e, now, lowQ); break;
    case "otStance": otStance(g, e, now, lowQ); break;
    case "otHeal": otHeal(g, e, now, lowQ); break;
    default: break;
  }
}

// ---------- ตัวหมาก: รถใต้หมาก + วงโล่ผู้พิทักษ์ ----------
const TRUCK_URL = { old: "/characters/old_truck/old_truck_token.webp", truck: "/characters/old_truck/truck_token.webp" };
const TRUCK_W = { old: 1.45, truck: 1.75 }; // ความกว้างรูปรถ (หน่วยช่อง)
const imgs = {};
function truckImg(form) {
  if (!TRUCK_URL[form]) return null;
  if (!imgs[form] && typeof Image === "function") { const img = new Image(); img.decoding = "async"; img.src = TRUCK_URL[form]; imgs[form] = img; }
  const img = imgs[form];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}
export const preloadOptimusArt = () => { truckImg("old"); truckImg("truck"); };
const track = new Map();
function faceOf(u, wx, wy, now) {
  let tr = track.get(u.id);
  const [sx] = P(wx, wy);
  if (!tr) { if (track.size > 24) track.clear(); tr = { sx, face: -1, moveT: -1e9, frame: now }; track.set(u.id, tr); }
  if (tr.frame !== now) {
    if (Math.abs(sx - tr.sx) > 0.3) { tr.face = sx > tr.sx ? 1 : -1; tr.moveT = now; }
    tr.sx = sx; tr.frame = now;
  }
  return tr;
}
export const otRides = (u) => !!(u && u.truck && TRUCK_URL[u.truck.form]);
// ก่อนฐานหมาก: วงโล่ผู้พิทักษ์ (ตั้งท่าอยู่)
export function otUnitBack(g, u, now, wx, wy) {
  const T = u.truck;
  if (!T || !T.stance) return;
  const pulse = REDUCED ? 0.8 : 0.65 + 0.35 * Math.sin(now / 320);
  g.save();
  gEllipse(g, wx, wy, 0.48, 0.01, 36); g.fillStyle = `rgba(${BLUE},${0.16 * pulse})`; g.fill();
  g.strokeStyle = `rgba(${BLUE_HI},${0.85 * pulse})`; g.lineWidth = 2; g.stroke();
  gEllipse(g, wx, wy, 0.56, 0.01, 36); g.strokeStyle = `rgba(${BLUE},${0.5 * pulse})`; g.lineWidth = 1; g.stroke();
  g.restore();
}
// หลังเสาหมาก ก่อนหกเหลี่ยม: รถตัดพื้นหลัง (หันตามทางเดิน · วิ่ง = สั่นเล็กน้อย)
// วาดรถใต้ตัว → คืนกรอบรูปบนจอ { cx, top, bottom, left, right } (ร่างรถไม่มีหกเหลี่ยม — drawUnit ใช้วางหลอด/กล่องคลิก) · รูปยังไม่โหลด = undefined
export function otTruck(g, u, now, wx, wy, liftZ = 0) {
  const T = u.truck;
  if (!T) return;
  const img = truckImg(T.form);
  if (!img) return;
  const tr = faceOf(u, wx, wy, now), moving = now - tr.moveT < 160;
  const [bx, by, s] = P(wx, wy, Math.max(0, liftZ));
  const W = s * TRUCK_W[T.form], H = (W * img.naturalHeight) / img.naturalWidth, f = tr.face > 0 ? -1 : 1;
  const bob = REDUCED ? 0 : moving ? Math.abs(Math.sin(now / 70)) * s * 0.02 : 0;
  g.save();
  if (liftZ <= 0.05) { gEllipse(g, wx + 0.03, wy + 0.06, 0.55, 0, 28, 0.32); g.fillStyle = "rgba(0,0,0,.28)"; g.fill(); }
  const foot = by + s * 0.22 - bob;
  g.translate(bx, foot); g.scale(f, 1);
  g.drawImage(img, -W * 0.5, -H, W, H);
  g.restore();
  return { cx: bx, top: foot - H, bottom: foot, left: bx - W * 0.5, right: bx + W * 0.5 };
}

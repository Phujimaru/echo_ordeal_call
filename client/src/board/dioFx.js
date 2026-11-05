// ============================================================
//  เอฟเฟกต์บนกระดานของดิโอ บรันโด (Stardust Crusaders · characters/dio_brando.js · GRID_PLAN §7.26) — โทนทองเหลืองของ THE WORLD + แดงเลือด
//  ไม่วาดตัวสแตนด์บนกระดาน (กฎผู้ใช้จากดิเอโก้) — มีแต่หมัด/แสง/เฟือง
//
//  ตีปกติ (attackStyle "dioPunch"): กำปั้นทองพุ่งจากตัว → ปะทะ ดาวแตก + วงคลื่น
//  เหตุการณ์ (socket "dioFx" → dioEventFx · จังหวะตาม FX ใน characters/dio_brando.js):
//   press      dioPress    ออร่าทองปะทุ + เสาแสง + เฟืองโผล่ใต้เท้า
//   timeStop   diegoStop + dioStop  ใช้ซีเปีย/วงสีกลับด้านของระบบกลาง (diegoFx.js) ทับด้วยเฟืองยักษ์ที่หมุนช้าลงจนหยุด
//   timeResume diegoResume ระบบกลาง — มีดที่ค้างกลางอากาศพุ่งพร้อมกัน
//   knife      diegoKnife ×3  มีดพัด 3 เล่ม · frozen = ค้างกลางอากาศรอเวลาเดินต่อ
//   shine      dioShine    กำปั้นเดียวทะลุแนว: มืดลง → พุ่ง → ดาวแตกขาวทอง + ลำทะลุหลังเป้า + เศษเกราะ
//   muda       dioMuda     หมัดรัวเต็มแนว 2.4 วิ + หมัดปิดท้าย + จอสั่นถี่
//   drain      dioDrain    สายเลือดไหลจากเป้าเข้าดิโอ
//   rollerLift dioLift     ดิโอพุ่งขึ้นฟ้าหายจากกระดาน (dioPose)
//   roller     dioRoller   รถตกจากฟ้าพร้อมดิโอบนหลังคา → พื้นแตก → หมัดรัวใส่รถ (รถสั่น ร้าว แสงลอด) → รถแตกกระจาย + ระเบิด + คลื่นกระแทก 3 ชั้น
//   lastWin    dioLastWin  สายเลือดคู่ + เสาไฟแดงทอง
//  ตัวหมาก: u.dio = { stop, blood } — ออร่าทองตอนหยุดเวลา · ออร่าแดงตอน BloodStack 6 ขึ้นไป
//  lowQ = ตัดอนุภาคครึ่งหนึ่ง · ลดการเคลื่อนไหว = ไม่หมุน ไม่เต้น
// ============================================================
import { P, gEllipse, glow, viewAxes } from "./boardGeo";
import { diegoEventFx } from "./diegoFx";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const GOLD = "255,208,60", GOLD_HI = "255,244,190", AMBER = "226,150,24", WHITE = "255,255,255", RED = "200,16,30", RED_HI = "255,90,90";

// ---------- จังหวะ (ms) — สัญญากับ server (FX ใน characters/dio_brando.js) ----------
export const DIO_MS = { dioPunch: 900 };
export const DIO_HIT_P = { dioPunch: 0.42 };
const T = { press: 1100, stop: 2500, shine: 950, muda: 2400, lift: 900, slam: 4500, drain: 900, win: 1600 };
const SHINE_HIT = 430, MUDA_END = 2050, SLAM_HIT = 340, RUSH_T = 520, BOOM_T = 3000, HOP_MS = 320, ROOF_Z = 1.05; // รถตก · เริ่มต่อย · รถระเบิด · ดิโอกระโดดลง · ความสูงหลังคารถ
const LIFT_HOLD = 8000; // ค้างบนฟ้าระหว่างคลิป จน roller มาถึง
export const DIO_FX_DUR = {
  ...DIO_MS, dioPress: T.press, dioStop: T.stop, dioShine: T.shine, dioMuda: T.muda, dioDrain: T.drain,
  dioLift: T.lift + LIFT_HOLD, dioRoller: T.slam, dioLastWin: T.win,
};
export const isDioFx = (kind) => typeof kind === "string" && (kind in DIO_FX_DUR);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (q) => 1 - (1 - q) ** 3;
const easeIn2 = (q) => q * q;
const hash01 = (i) => { const s = Math.sin(i * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); };
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function viewRect(view) {
  const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
  const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
  return [x0, y0, x1 - x0, y1 - y0];
}
function flash(g, view, rgb, a, op = "lighter") {
  if (!(a > 0)) return;
  g.save(); g.globalCompositeOperation = op; g.fillStyle = `rgba(${rgb},${a})`; g.fillRect(...viewRect(view)); g.restore();
}
function ring(g, cx, cy, r, a, rgb, w = 2, z = 0.02) {
  if (!(a > 0) || !(r > 0)) return;
  gEllipse(g, cx, cy, r, z, 56);
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.stroke();
}

// กำปั้น THE WORLD: ถุงมือทองเหลือง ลายหัวใจเขียว · แขนท่อนล่างสีเหลืองคล้ำ
function fist(g, x, y, s, ang, alpha = 1) {
  if (!(alpha > 0) || !(s > 0)) return;
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha *= Math.min(1, alpha);
  g.lineWidth = Math.max(1, s * 0.05); g.strokeStyle = "rgb(92,62,6)";
  const arm = g.createLinearGradient(0, -s * 0.3, 0, s * 0.3);
  arm.addColorStop(0, "rgb(236,196,70)"); arm.addColorStop(1, "rgb(150,104,18)");
  g.fillStyle = arm;
  g.beginPath(); g.moveTo(-s * 1.7, -s * 0.2); g.lineTo(-s * 0.5, -s * 0.3); g.lineTo(-s * 0.5, s * 0.3); g.lineTo(-s * 1.7, s * 0.2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "rgb(120,210,90)"; g.beginPath(); g.ellipse(-s * 0.72, 0, s * 0.1, s * 0.15, 0, 0, TAU); g.fill(); g.stroke();
  const h = g.createLinearGradient(0, -s * 0.42, 0, s * 0.42);
  h.addColorStop(0, "rgb(255,240,150)"); h.addColorStop(0.5, "rgb(246,198,52)"); h.addColorStop(1, "rgb(176,122,20)");
  g.fillStyle = h;
  g.beginPath();
  if (g.roundRect) g.roundRect(-s * 0.54, -s * 0.42, s * 0.84, s * 0.84, s * 0.2); else g.rect(-s * 0.54, -s * 0.42, s * 0.84, s * 0.84);
  g.fill(); g.stroke();
  g.fillStyle = "rgb(255,226,110)";
  for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(s * 0.32, -s * 0.31 + i * s * 0.206, s * 0.14, s * 0.1, 0, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = "rgb(226,170,40)";
  g.beginPath(); g.ellipse(-s * 0.05, s * 0.43, s * 0.27, s * 0.1, 0.15, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = Math.max(1, s * 0.04);
  g.beginPath(); g.moveTo(-s * 0.42, -s * 0.31); g.lineTo(s * 0.1, -s * 0.33); g.stroke();
  g.restore();
}
function speedLines(g, x0, y0, x1, y1, w, a, n, seed) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const off = (hash01(seed + i) - 0.5) * w, s = hash01(seed + i * 2 + 3) * 0.5, e = s + 0.3 + hash01(seed + i * 3 + 5) * 0.4;
    g.strokeStyle = `rgba(${i % 3 ? GOLD : WHITE},${a * (0.4 + 0.5 * hash01(seed + i + 7))})`;
    g.lineWidth = 1 + hash01(seed + i + 9) * 2.4;
    g.beginPath(); g.moveTo(x0 + dx * s + nx * off, y0 + dy * s + ny * off); g.lineTo(x0 + dx * Math.min(1, e) + nx * off, y0 + dy * Math.min(1, e) + ny * off); g.stroke();
  }
  g.restore();
}
function burstStar(g, x, y, r, a, rgb, spikes = 12, seed = 1) {
  if (!(a > 0)) return;
  g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(${rgb},${a})`;
  g.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const an = (i / (spikes * 2)) * TAU + seed, R = i % 2 ? r * 0.26 : r * (0.65 + 0.45 * hash01(seed + i));
    if (i) g.lineTo(x + Math.cos(an) * R, y + Math.sin(an) * R); else g.moveTo(x + Math.cos(an) * R, y + Math.sin(an) * R);
  }
  g.closePath(); g.fill(); g.restore();
}
function shards(g, cx, cy, q, n, seed, rgb = GOLD_HI, spread = 1.5) {
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const an = hash01(seed + i) * TAU, d = spread * (0.3 + 0.7 * hash01(seed + i * 2)) * easeOut3(q), z = 0.3 + 1.5 * hash01(seed + i * 3) * q * (1 - q) * 4;
    const [x, y, s] = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, z);
    g.fillStyle = `rgba(${rgb},${0.9 * (1 - q)})`;
    g.save(); g.translate(x, y); g.rotate(an + q * 8); g.fillRect(-s * 0.04, -s * 0.015, s * 0.08, s * 0.03); g.restore();
  }
  g.restore();
}
// เฟืองบนพื้น: ภาพของ THE WORLD (Timestop.jpg) — ฟันเฟืองรอบวง
function gear(g, cx, cy, R, rot, a, rgb = GOLD, teeth = 14, z = 0.03) {
  if (!(a > 0)) return;
  const ax = viewAxes();
  const at = (r, an) => {
    const ux = -ax.fx * Math.cos(an) + ax.rx * Math.sin(an), uy = -ax.fy * Math.cos(an) + ax.ry * Math.sin(an);
    return P(cx + ux * r, cy + uy * r, z);
  };
  const step = TAU / teeth;
  g.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = rot + i * step;
    for (const [dt, r] of [[0, R * 0.86], [0.2, R * 0.86], [0.3, R], [0.7, R], [0.8, R * 0.86]]) {
      const [x, y] = at(r, a0 + dt * step);
      if (i || dt) g.lineTo(x, y); else g.moveTo(x, y);
    }
  }
  g.closePath();
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = 2.4; g.stroke();
  g.fillStyle = `rgba(${rgb},${a * 0.12})`; g.fill();
  gEllipse(g, cx, cy, R * 0.56, z, 40); g.strokeStyle = `rgba(${rgb},${a * 0.8})`; g.lineWidth = 1.6; g.stroke();
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const an = rot + (i / 6) * TAU, [x0, y0] = at(R * 0.14, an), [x1, y1] = at(R * 0.56, an);
    g.moveTo(x0, y0); g.lineTo(x1, y1);
  }
  g.strokeStyle = `rgba(${rgb},${a * 0.65})`; g.lineWidth = 1.4; g.stroke();
}
function pillar(g, cx, cy, h, w, a, rgb) {
  const b = P(cx, cy, 0), top = P(cx, cy, h), wb = b[2] * w, wt = top[2] * w * 0.3;
  const gr = g.createLinearGradient(b[0], b[1], top[0], top[1]);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = gr;
  g.beginPath(); g.moveTo(b[0] - wb, b[1]); g.lineTo(top[0] - wt, top[1]); g.lineTo(top[0] + wt, top[1]); g.lineTo(b[0] + wb, b[1]); g.closePath(); g.fill();
  g.restore();
}

// ---------- ตีปกติ ----------
function punchFx(g, e, now, lowQ) {
  const t = (now - e.t0) / DIO_MS.dioPunch;
  if (t <= 0 || t >= 1 || !e.to) return;
  const n = Math.max(1, e.size | 0), ox = e.x + n / 2, oy = e.y + n / 2, tx = e.to.x + 0.5, ty = e.to.y + 0.5;
  const [ax, ay] = P(ox, oy, 0.62), [sx, sy, sc] = P(tx, ty, 0.55), ang = Math.atan2(sy - ay, sx - ax);
  const HIT = DIO_HIT_P.dioPunch, W = HIT * 0.42, drive = clamp01((t - W) / (HIT - W));
  const u = t < W ? -0.12 * Math.sin((t / W) * (Math.PI / 2)) : -0.12 + 1.02 * easeOut3(drive);
  const fx = ax + (sx - ax) * u, fy = ay + (sy - ay) * u, fade = t < HIT ? 1 : 1 - clamp01((t - HIT) / 0.32);
  if (t > W && t < HIT + 0.1) speedLines(g, ax, ay, fx, fy, sc * 0.7, t < HIT ? 1 : 1 - (t - HIT) / 0.1, lowQ ? 5 : 11, e.to.x * 3 + e.to.y);
  if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, fx, fy, sc * 0.62, GOLD, 0.55 * fade); g.restore(); }
  fist(g, fx, fy, sc * 0.72, ang, fade);
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT);
    burstStar(g, sx, sy, sc * (0.5 + q * 1.1), 0.9 * (1 - q), GOLD_HI, 10, e.to.x + e.to.y);
    ring(g, tx, ty, 0.3 + 1.1 * easeOut3(q), 0.85 * (1 - q), GOLD_HI, 3 * (1 - q) + 0.5);
    if (!lowQ) shards(g, tx, ty, q, 8, e.to.x * 7 + e.to.y, GOLD_HI, 1.1);
  }
}

// ---------- กดเดอะเวิลด์ ----------
function pressFx(g, e, t, lowQ, view) {
  if (!okT(e.at) || t >= T.press) return;
  const cx = e.at.x + 0.5, cy = e.at.y + 0.5, q = t / T.press, a = t < 800 ? 1 : 1 - (t - 800) / 300, k = clamp01(t / 260);
  gear(g, cx, cy, 1.5 * (0.5 + 0.5 * easeOut3(k)), REDUCED ? 0 : t * 0.004, 0.85 * a);
  if (!lowQ) gear(g, cx, cy, 2.3 * (0.5 + 0.5 * easeOut3(k)), REDUCED ? 0 : -t * 0.0026, 0.45 * a, AMBER, 20);
  pillar(g, cx, cy, 4.4, 0.62, 0.55 * a * k, GOLD);
  const [bx, by, s] = P(cx, cy, 0.9);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, bx, by, s * (0.9 + 0.6 * k), GOLD, 0.6 * a * k);
  if (!lowQ) for (let i = 0; i < 22; i++) {
    const ph = REDUCED ? hash01(i) : (q * (1.4 + hash01(i + 3)) + hash01(i)) % 1, an = hash01(i + 7) * TAU, r = 0.3 + 0.45 * hash01(i + 9);
    const [px, py, ps] = P(cx + Math.cos(an) * r, cy + Math.sin(an) * r, ph * 2.8);
    g.fillStyle = `rgba(${GOLD_HI},${Math.sin(Math.PI * ph) * a})`; g.fillRect(px, py, ps * 0.04, ps * 0.09);
  }
  g.restore();
  if (t < 140) flash(g, view, GOLD_HI, 0.22 * (1 - t / 140));
}
function stopFx(g, e, t, lowQ) {
  if (!okT(e.at) || t >= T.stop) return;
  const cx = e.at.x + 0.5, cy = e.at.y + 0.5, spin = Math.max(0, 1 - t / 1750), rot = REDUCED ? 0 : (Math.min(t, 1750) / 1000) * 2.2 * (0.35 + 0.65 * spin);
  const a = clamp01(t / 300) * (t < 1900 ? 1 : clamp01(1 - (t - 1900) / 600));
  const big = [[0, 0, 3.4, 1, GOLD, 26], [3.6, 1.8, 2.2, -1.5, AMBER, 18], [-3.2, -2.1, 2.5, -1.3, AMBER, 20], [-1.8, 3.4, 1.7, 1.9, GOLD, 15]];
  for (const [dx, dy, R, sp, rgb, teeth] of lowQ ? big.slice(0, 2) : big) gear(g, cx + dx, cy + dy, R * (0.7 + 0.3 * easeOut3(clamp01(t / 500))), rot * sp, 0.7 * a, rgb, teeth);
  if (t >= 1750 && t < 2050) ring(g, cx, cy, 3.5 + 0.6 * ((t - 1750) / 300), 0.8 * (1 - (t - 1750) / 300), GOLD_HI, 3);
}

// ---------- Stand ----------
function lineOf(e) {
  const v = DIRV[e.dir] || [1, 0], ox = e.from.x + 0.5, oy = e.from.y + 0.5;
  return { v, ox, oy, ex: ox + v[0] * 2, ey: oy + v[1] * 2 };
}
function shineFx(g, e, t, lowQ, view) {
  if (!okT(e.from) || t >= T.shine) return;
  const { v, ox, oy, ex, ey } = lineOf(e);
  const [ax, ay] = P(ox, oy, 0.6), [bx, by, s] = P(ex, ey, 0.6), ang = Math.atan2(by - ay, bx - ax);
  if (t < SHINE_HIT) flash(g, view, "0,0,0", 0.32 * clamp01(t / 200), "source-over");
  const u = t < 240 ? -0.18 * clamp01(t / 240) : -0.18 + 1.2 * easeIn2(clamp01((t - 240) / (SHINE_HIT - 240)));
  const fx = ax + (bx - ax) * u, fy = ay + (by - ay) * u, fade = t < SHINE_HIT ? 1 : 1 - clamp01((t - SHINE_HIT) / 340);
  if (t > 240 && t < SHINE_HIT + 90) speedLines(g, ax, ay, fx, fy, s * 1, 1, lowQ ? 8 : 18, e.from.x + e.from.y);
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, fx, fy, s * 0.95, GOLD, 0.7 * fade); g.restore();
  fist(g, fx, fy, s * 0.95, ang, fade);
  if (t >= SHINE_HIT) {
    const q = (t - SHINE_HIT) / (T.shine - SHINE_HIT);
    if (t < SHINE_HIT + 110) flash(g, view, GOLD_HI, 0.5 * (1 - (t - SHINE_HIT) / 110));
    for (const h of e.hitsAt || []) {
      const [hx, hy, hs] = P(h.x + 0.5, h.y + 0.5, 0.6);
      burstStar(g, hx, hy, hs * (0.7 + q * 1.6), 0.95 * (1 - q), h.dodge ? "200,210,230" : GOLD_HI, 14, h.x + h.y);
      // ลำแสงทะลุหลังเป้า: ทะลุเกราะ
      if (!h.dodge) {
        const [rx, ry] = P(h.x + 0.5 + v[0] * 2.4, h.y + 0.5 + v[1] * 2.4, 0.6);
        speedLines(g, hx, hy, rx, ry, hs * 0.5 * (1 - q), 1 - q, lowQ ? 4 : 9, h.x * 5 + h.y);
        if (!lowQ) shards(g, h.x + 0.5, h.y + 0.5, q, 16, h.x * 9 + h.y, "210,226,245", 1.8);
      }
      ring(g, h.x + 0.5, h.y + 0.5, 0.3 + 1.5 * easeOut3(q), 0.9 * (1 - q), GOLD_HI, 3.5 * (1 - q) + 0.5);
    }
  }
}
function mudaFx(g, e, t, lowQ) {
  if (!okT(e.from) || t >= T.muda) return;
  const { v, ox, oy, ex, ey } = lineOf(e);
  const px = -v[1], py = v[0];
  const [ax, ay] = P(ox, oy, 0.6), [bx, by, s] = P(ex, ey, 0.6);
  const a = t < MUDA_END ? 1 : clamp01(1 - (t - MUDA_END) / 350);
  // ม่านความเร็วทองเต็มแนว
  speedLines(g, ax, ay, bx, by, s * 1.5, 0.75 * a, lowQ ? 6 : 16, Math.floor(t / 60));
  if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, (ax + bx) / 2, (ay + by) / 2, s * 1.3, GOLD, 0.32 * a); g.restore(); }
  // หมัดแต่ละลูกมีชีวิต 170ms · ออกทุก 34ms
  const every = lowQ ? 68 : 34, life = 170, last = Math.min(t, MUDA_END);
  for (let i = Math.max(0, Math.floor((last - life) / every)); i * every <= last; i++) {
    const b = i * every, age = (t - b) / life;
    if (age < 0 || age >= 1) continue;
    const side = (hash01(i + 3) - 0.5) * 1.3, reach = 0.55 + 1.25 * hash01(i + 5), z = 0.25 + 0.75 * hash01(i + 7);
    const k = easeOut3(clamp01(age * 1.6));
    const sx0 = ox + px * side * 0.5, sy0 = oy + py * side * 0.5;
    const [x0, y0] = P(sx0, sy0, z), [x1, y1, sc] = P(ox + v[0] * reach * 1.2 + px * side, oy + v[1] * reach * 1.2 + py * side, z);
    const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
    fist(g, x, y, sc * (0.34 + 0.2 * hash01(i + 9)), Math.atan2(y1 - y0, x1 - x0), (1 - age) * 1.2);
    if (age > 0.55 && !lowQ) burstStar(g, x1, y1, sc * 0.3, 0.7 * (1 - age), GOLD_HI, 6, i);
  }
  for (const h of e.hitsAt || []) {
    const [hx, hy, hs] = P(h.x + 0.5, h.y + 0.5, 0.6);
    if (!h.dodge && t < MUDA_END && Math.floor(t / 90) % 2 === 0) burstStar(g, hx + (hash01(Math.floor(t / 90)) - 0.5) * hs * 0.6, hy + (hash01(Math.floor(t / 90) + 3) - 0.5) * hs * 0.6, hs * 0.6, 0.85, WHITE, 8, t);
    if (t >= MUDA_END) {
      const q = (t - MUDA_END) / (T.muda - MUDA_END);
      burstStar(g, hx, hy, hs * (0.9 + 1.6 * q), 1 - q, GOLD_HI, 16, h.x + h.y);
      ring(g, h.x + 0.5, h.y + 0.5, 0.4 + 1.9 * easeOut3(q), 1 - q, GOLD_HI, 4 * (1 - q) + 0.5);
      if (!lowQ) shards(g, h.x + 0.5, h.y + 0.5, q, 18, h.x * 3 + h.y, GOLD_HI, 2);
    }
  }
  // หมัดปิดท้าย
  if (t > MUDA_END - 180) {
    const k = clamp01((t - (MUDA_END - 180)) / 180), [x, y] = [ax + (bx - ax) * easeIn2(k), ay + (by - ay) * easeIn2(k)];
    fist(g, x, y, s * 1.05, Math.atan2(by - ay, bx - ax), a);
  }
}

// ---------- ดูดเลือด ----------
function streamFx(g, from, to, t, dur, drops, seed, lowQ) {
  const n = lowQ ? Math.ceil(drops / 2) : drops;
  const [ax, ay, as] = P(from.x + 0.5, from.y + 0.5, 0.7), [bx, by, bs] = P(to.x + 0.5, to.y + 0.5, 0.9);
  const mx = (ax + bx) / 2 + (ay - by) * 0.18, my = (ay + by) / 2 - Math.abs(ax - bx) * 0.18 - bs * 0.5;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const delay = (i / n) * dur * 0.55, q = clamp01((t - delay) / (dur * 0.45));
    if (q <= 0 || q >= 1) continue;
    const u = q * q * (3 - 2 * q), wob = Math.sin(q * 9 + i) * as * 0.06;
    const x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx + wob, y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by;
    const r = as * (0.05 + 0.05 * hash01(seed + i));
    g.fillStyle = `rgba(${i % 3 ? RED : RED_HI},${0.95 * Math.sin(Math.PI * q)})`;
    g.beginPath(); g.ellipse(x, y, r * 1.5, r, Math.atan2(by - y, bx - x), 0, TAU); g.fill();
  }
  const end = clamp01((t - dur * 0.6) / (dur * 0.4));
  if (end > 0) glow(g, bx, by, bs * 0.8, RED, 0.6 * Math.sin(Math.PI * end));
  g.restore();
}
function drainFx(g, e, t, lowQ) {
  if (!okT(e.from) || !okT(e.to) || t >= T.drain) return;
  streamFx(g, e.from, e.to, t, T.drain, 16, e.from.x * 3 + e.from.y, lowQ);
}

// ---------- Road Roller ----------
function liftFx(g, e, t, lowQ) {
  if (!okT(e.at) || t >= T.lift + 400) return;
  const cx = e.at.x + 0.5, cy = e.at.y + 0.5, q = clamp01(t / T.lift), a = 1 - clamp01((t - T.lift) / 400);
  pillar(g, cx, cy, 9, 0.5, 0.75 * a, GOLD);
  ring(g, cx, cy, 0.4 + 2.2 * easeOut3(q), 0.9 * (1 - q), GOLD_HI, 3 * (1 - q) + 0.5);
  if (!lowQ) shards(g, cx, cy, q, 12, 21, GOLD_HI, 1.5);
}
// รถบดถนน: รูปที่ผู้ใช้ส่งมา ตัดพื้นหลังแล้ว
const ROLLER_URL = "/characters/dio_brando/dio_roller_sprite.webp";
let rollerImg = null;
export function preloadDioArt() {
  if (!rollerImg && typeof Image === "function") { rollerImg = new Image(); rollerImg.src = ROLLER_URL; }
  return rollerImg;
}
const ROLLER_W = 4.2;
function rollerSize(img, s) { const w = s * ROLLER_W; return [w, w * (img.naturalHeight / img.naturalWidth)]; }
const rollerReady = () => { const img = preloadDioArt(); return img && img.complete && img.naturalWidth ? img : null; };
function drawRoller(g, x, y, s, a) {
  const img = rollerReady();
  if (!img) return;
  const [w, h] = rollerSize(img, s);
  g.save(); g.globalAlpha *= a;
  g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = s * 0.25;
  g.drawImage(img, x - w / 2, y - h * 0.8, w, h);
  g.restore();
}
// รถแตก: ตัดรูปเป็นชิ้น 4×3 ปลิวออกจากจุดระเบิด
function rollerPieces(g, x, y, s, q) {
  const img = rollerReady();
  if (!img) return;
  const [w, h] = rollerSize(img, s), cols = 4, rows = 3, nw = img.naturalWidth / cols, nh = img.naturalHeight / rows;
  const x0 = x - w / 2, y0 = y - h * 0.8;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, px = x0 + (c + 0.5) * (w / cols), py = y0 + (r + 0.5) * (h / rows);
    const dx = px - x, dy = py - (y - h * 0.3), L = Math.hypot(dx, dy) || 1, sp = s * (2 + 3.2 * hash01(i + 3));
    const k = easeOut3(q), nx = px + (dx / L) * sp * k, ny = py + (dy / L) * sp * k + s * 2.6 * q * q - s * 0.7 * hash01(i + 5) * k;
    g.save(); g.translate(nx, ny); g.rotate((hash01(i + 7) - 0.5) * 7 * k); g.globalAlpha *= 1 - q * q;
    g.drawImage(img, c * nw, r * nh, nw, nh, -w / cols / 2, -h / rows / 2, w / cols, h / rows);
    g.restore();
  }
}
// รอยร้าวแสงบนตัวรถ: ยิ่งต่อยยิ่งลาม
function rollerCracks(g, x, y, s, k, seed) {
  const n = Math.ceil(10 * k);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    let px = x + (hash01(seed + i) - 0.5) * s * 3, py = y - s * (0.2 + 0.9 * hash01(seed + i * 2)), an = hash01(seed + i * 3) * TAU;
    g.beginPath(); g.moveTo(px, py);
    for (let j = 0; j < 4; j++) { an += (hash01(seed + i + j * 5) - 0.5) * 1.5; px += Math.cos(an) * s * 0.26; py += Math.sin(an) * s * 0.26; g.lineTo(px, py); }
    g.strokeStyle = `rgba(255,214,120,${0.55 + 0.45 * k})`; g.lineWidth = 1.5 + 2 * k; g.stroke();
  }
  g.restore();
}
function groundCracks(g, cx, cy, q, a, lowQ) {
  g.save(); g.lineCap = "round";
  for (let i = 0; i < (lowQ ? 8 : 16); i++) {
    let an = hash01(i + 40) * TAU, x = cx, y = cy;
    const pts = [P(x, y, 0.02)];
    for (let j = 0; j < 4; j++) { an += (hash01(i * 5 + j) - 0.5) * 0.9; const d = (0.45 + 0.5 * hash01(i + j * 3)) * q; x += Math.cos(an) * d; y += Math.sin(an) * d; pts.push(P(x, y, 0.02)); }
    g.strokeStyle = `rgba(16,10,6,${0.85 * a})`; g.lineWidth = 4;
    g.beginPath(); pts.forEach(([u, v], k) => (k ? g.lineTo(u, v) : g.moveTo(u, v))); g.stroke();
    g.strokeStyle = `rgba(255,170,60,${0.75 * a})`; g.lineWidth = 1.5; g.stroke();
  }
  gEllipse(g, cx, cy, 1.15 * q, 0.015, 40); g.fillStyle = `rgba(22,14,8,${0.7 * a})`; g.fill();
  g.restore();
}
function rollerFx(g, e, t, lowQ, view) {
  if (!okT(e.at) || t >= T.slam) return;
  const n = Math.max(1, e.size | 0), cx = e.at.x + n / 2, cy = e.at.y + n / 2, end = 1 - clamp01((t - 3900) / 600);
  // เงาตกพื้นก่อนรถถึง
  if (t < SLAM_HIT) {
    gEllipse(g, cx, cy, 0.6 + 1.6 * (t / SLAM_HIT), 0.01, 40);
    g.fillStyle = `rgba(0,0,0,${0.6 * (t / SLAM_HIT)})`; g.fill();
  }
  if (t >= SLAM_HIT) groundCracks(g, cx, cy, clamp01((t - SLAM_HIT) / 220) * (t < BOOM_T ? 0.75 : 1), end, lowQ);
  const fall = t < SLAM_HIT ? 12 * (1 - easeIn2(t / SLAM_HIT)) : 0;
  const rush = clamp01((t - RUSH_T) / (BOOM_T - RUSH_T));
  // รถสั่นแรงขึ้นเรื่อยๆ ตามหมัด
  const amp = t >= RUSH_T && t < BOOM_T && !REDUCED ? 2 + 7 * rush : 0;
  const jx = amp ? Math.sin(t * 0.09) * amp : 0, jy = amp ? Math.cos(t * 0.13) * amp * 0.6 : 0;
  const [rx, ry, rs] = P(cx, cy, fall + 0.12);
  const [tx, ty, ts] = P(cx, cy, ROOF_Z + 0.6); // จุดที่หมัดลง: หลังคารถ
  if (t < BOOM_T) {
    drawRoller(g, rx + jx, ry + jy, rs * (1 + (t < SLAM_HIT ? 0.35 * (1 - t / SLAM_HIT) : 0)), 1);
    // รถตกถึงพื้น: แรงกระแทกชุดเล็ก
    if (t >= SLAM_HIT && t < SLAM_HIT + 420) {
      const a = t - SLAM_HIT, q = a / 420;
      if (a < 70) flash(g, view, WHITE, 0.55 * (1 - a / 70));
      ring(g, cx, cy, 0.8 + 3 * easeOut3(q), 0.9 * (1 - q), GOLD_HI, 5 * (1 - q) + 0.5);
      if (!lowQ) shards(g, cx, cy, q, 18, 7, "226,196,150", 2.6);
    }
    if (rush > 0) {
      rollerCracks(g, rx + jx, ry + jy, rs, rush, 13);
      g.save(); g.globalCompositeOperation = "lighter";
      glow(g, rx, ry - rs * 0.55, rs * (1.2 + 1.4 * rush), "255,150,40", 0.18 + 0.6 * rush * rush);
      g.restore();
      // หมัดรัวจากตัวหมากลงใส่หลังคา: ออกทุก 34ms ชีวิต 170ms
      const every = lowQ ? 68 : 34, life = 170, rel = t - RUSH_T, last = Math.min(rel, BOOM_T - RUSH_T);
      for (let i = Math.max(0, Math.floor((last - life) / every)); i * every <= last; i++) {
        const age = (rel - i * every) / life;
        if (age < 0 || age >= 1) continue;
        const sx = tx + (hash01(i + 3) - 0.5) * ts * 1.5, sy = ty - ts * (0.05 + 0.45 * hash01(i + 5)), k = easeOut3(clamp01(age * 1.7));
        const ox = tx + (sx - tx) * 0.3, oy = ty - ts * 1.1, x = ox + (sx - ox) * k, y = oy + (sy - oy) * k;
        fist(g, x, y, ts * (0.34 + 0.2 * hash01(i + 9)), Math.atan2(sy - oy, sx - ox), (1 - age) * 1.2);
        if (age > 0.5) burstStar(g, sx, sy, ts * 0.32, 0.8 * (1 - age), GOLD_HI, 6, i);
      }
      if (!lowQ) speedLines(g, tx, ty - ts * 1.2, tx, ty, ts * 1.7, 0.6, 10, Math.floor(t / 60));
    }
    // หมัดปิดท้าย
    if (t > BOOM_T - 170) {
      const k = clamp01((t - (BOOM_T - 170)) / 170);
      fist(g, tx, ty - ts * (1.4 - 1.2 * easeIn2(k)), ts * 1.15, Math.PI / 2, 1);
    }
    return;
  }
  // รถระเบิด
  const a = t - BOOM_T, q = clamp01(a / (T.slam - BOOM_T));
  if (a < 110) flash(g, view, WHITE, 0.95 * (1 - a / 110));
  else if (a < 380) flash(g, view, GOLD, 0.3 * (1 - (a - 110) / 270));
  const [bx, by, s] = P(cx, cy, 0.8);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, bx, by, s * (2 + 4 * easeOut3(q)), "255,130,30", 1 - q);
  glow(g, bx, by, s * (1.1 + 2 * easeOut3(q)), GOLD_HI, 1 - q);
  g.restore();
  rollerPieces(g, rx, ry, rs, clamp01(a / 1100));
  for (let k = 0; k < (lowQ ? 1 : 3); k++) {
    const qq = clamp01(q * 1.3 - k * 0.14);
    if (qq > 0 && qq < 1) ring(g, cx, cy, (1 + 6.5 * easeOut3(qq)) * n, 0.95 * (1 - qq), k === 1 ? "255,150,40" : GOLD_HI, 7 * (1 - qq) + 0.6);
  }
  g.save();
  for (let i = 0; i < (lowQ ? 8 : 22); i++) {
    const an = hash01(i + 90) * TAU, d = (0.5 + 2.4 * hash01(i + 91)) * easeOut3(q), [x, y, ps] = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, 0.2 + 2.4 * q * hash01(i + 92));
    glow(g, x, y, ps * (0.4 + 0.9 * q), "48,40,34", 0.6 * (1 - q));
  }
  g.restore();
  if (!lowQ) shards(g, cx, cy, q, 40, 7, "226,196,150", 4);
}
function lastWinFx(g, e, t, lowQ, view) {
  if (t >= T.win) return;
  if (okT(e.from) && okT(e.at)) {
    streamFx(g, e.from, e.at, t, 1100, 30, 31, lowQ);
    if (t > 120) streamFx(g, { x: e.from.x + 0.25, y: e.from.y - 0.2 }, e.at, t - 120, 1100, 22, 57, lowQ);
  }
  if (okT(e.at)) {
    const cx = e.at.x + 0.5, cy = e.at.y + 0.5, a = t < 1100 ? clamp01(t / 300) : 1 - (t - 1100) / 500;
    pillar(g, cx, cy, 6, 0.7, 0.8 * a, RED_HI);
    pillar(g, cx, cy, 4, 0.36, 0.8 * a, GOLD);
    gear(g, cx, cy, 2 * easeOut3(clamp01(t / 400)), REDUCED ? 0 : t * 0.003, 0.7 * a, RED_HI, 16);
  }
  if (t < 180) flash(g, view, RED, 0.34 * (1 - t / 180));
}

export function dioFx(g, e, now, lowQ, view) {
  const t = e.holdT != null ? e.holdT : now - e.t0; // holdT = หน้าทดสอบ: ค้างเฟรม
  if (t < 0) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  switch (e.kind) {
    case "dioPunch": punchFx(g, e, now, lowQ); break;
    case "dioPress": pressFx(g, e, t, lowQ, view); break;
    case "dioStop": stopFx(g, e, t, lowQ); break;
    case "dioShine": shineFx(g, e, t, lowQ, view); break;
    case "dioMuda": mudaFx(g, e, t, lowQ); break;
    case "dioDrain": drainFx(g, e, t, lowQ); break;
    case "dioLift": liftFx(g, e, t, lowQ); break;
    case "dioRoller": rollerFx(g, e, t, lowQ, view); break;
    case "dioLastWin": lastWinFx(g, e, t, lowQ, view); break;
    default:
  }
  g.restore();
}

// ดิโอพุ่งขึ้นฟ้าหายจากกระดาน → ลงมาบนหลังคารถ ยืนต่อย → รถระเบิดแล้วโดดลงข้างเป้า (BoardCanvas)
export function dioPose(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  let lift = null, slam = null;
  for (const e of list) {
    if (!e || e.id !== u.id) continue;
    if (e.kind === "dioRoller") slam = e;
    if (e.kind === "dioLift" && now - e.t0 < e.dur) lift = e;
  }
  if (slam) {
    const t = slam.holdT != null ? slam.holdT : now - slam.t0, at = slam.at;
    if (!okT(at)) return null;
    const n = Math.max(1, slam.size | 0), x = at.x + (n - 1) / 2, y = at.y + (n - 1) / 2;
    if (t < 0 || t >= BOOM_T + HOP_MS) return null;
    if (t < SLAM_HIT) return { x, y, hz: ROOF_Z + 12 * (1 - easeIn2(t / SLAM_HIT)), sq: 0 };
    if (t < BOOM_T) return { x, y, hz: ROOF_Z, sq: 0 };
    const q = (t - BOOM_T) / HOP_MS, land = okT(slam.land) ? slam.land : { x: u.rx, y: u.ry };
    return { x: x + (land.x - x) * q, y: y + (land.y - y) * q, hz: ROOF_Z * (1 - q) + Math.sin(Math.PI * q) * 1.2, sq: 0 };
  }
  if (!lift) return null;
  return { x: u.rx, y: u.ry, hz: 16 * easeIn2(clamp01((now - lift.t0) / T.lift)), sq: 0 };
}

// ออร่าใต้หมาก (boardDraw drawUnit)
export function dioUnitBack(g, u, now, wx, wy) {
  const d = u.dio;
  if (!d) return;
  const [bx, by, s] = P(wx, wy, 0.9), pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 240);
  g.save(); g.globalCompositeOperation = "lighter";
  if (d.blood >= 6) {
    glow(g, bx, by, s * (0.72 + 0.14 * pulse), RED, d.blood >= 8 ? 0.5 : 0.32);
    if (!REDUCED) for (let i = 0; i < (d.blood >= 8 ? 8 : 5); i++) {
      const ph = ((now / (900 + hash01(i) * 500)) + hash01(i + 2)) % 1, an = hash01(i + 4) * TAU;
      const [x, y, ps] = P(wx + Math.cos(an) * 0.35, wy + Math.sin(an) * 0.35, ph * 1.8);
      g.fillStyle = `rgba(${RED_HI},${Math.sin(Math.PI * ph) * 0.8})`; g.beginPath(); g.ellipse(x, y, ps * 0.025, ps * 0.05, 0, 0, TAU); g.fill();
    }
  }
  if (d.stop) {
    glow(g, bx, by, s * (0.95 + 0.2 * pulse), GOLD, 0.5);
    if (!REDUCED) for (let i = 0; i < 10; i++) {
      const ph = ((now / (700 + hash01(i + 5) * 400)) + hash01(i + 6)) % 1, an = hash01(i + 8) * TAU;
      const [x, y, ps] = P(wx + Math.cos(an) * 0.42, wy + Math.sin(an) * 0.42, ph * 2.3);
      g.fillStyle = `rgba(${GOLD_HI},${Math.sin(Math.PI * ph) * 0.9})`; g.fillRect(x, y, ps * 0.025, ps * 0.08);
    }
  }
  g.restore();
  if (d.stop) gear(g, wx, wy, 0.95, 0, 0.55);
}

// ---------- socket "dioFx" → รายการเอฟเฟกต์ (รูปแบบเดียวกับ diegoEventFx — BoardStage ใช้ตัวรับเดียวกัน) ----------
export function dioEventFx(ev, ctx = {}) {
  preloadDioArt();
  if (!ev || typeof ev !== "object") return { fx: [], look: [], shake: [], busy: [], later: [], defer: [], ghosts: [] };
  const posOf = (id) => (id != null && typeof ctx.posOf === "function" ? ctx.posOf(id) : null);
  const sizeOf = (id) => (id != null && typeof ctx.sizeOf === "function" ? Math.max(1, ctx.sizeOf(id) | 0) : 1);
  const pt = (t) => ({ x: t.x, y: t.y });
  // เวลาหยุด/เดินต่อ + มีดค้างกลางอากาศ ใช้ชุดของระบบกลาง
  if (ev.kind === "timeResume") return diegoEventFx(ev, ctx);
  if (ev.kind === "timeStop") {
    const out = diegoEventFx({ ...ev, plain: true }, ctx);
    if (okT(ev.at)) out.fx.push({ kind: "dioStop", id: ev.id, at: pt(ev.at), dur: T.stop });
    return out;
  }
  if (ev.kind === "knife") {
    const dx = okT(ev.to) && okT(ev.from) ? Math.sign(ev.to.x - ev.from.x) : 0, dy = okT(ev.to) && okT(ev.from) ? Math.sign(ev.to.y - ev.from.y) : 0;
    const dir = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
    const out = diegoEventFx({ kind: "knife", id: ev.id, color: ev.color, from: ev.from, to: ev.to, dir, hitId: ev.dodge ? null : ev.targetId, frozen: !!ev.frozen }, ctx);
    const main = out.fx.find((f) => f.kind === "diegoKnife");
    if (main) {
      const px = dy ? 1 : 0, py = dx ? 1 : 0;
      for (const off of [-0.2, 0.2]) {
        const shift = (t) => (t ? { x: t.x + px * off, y: t.y + py * off } : t);
        out.fx.push({ ...main, from: shift(main.from), to: shift(main.to), hitAt: shift(main.hitAt) });
      }
    }
    return out;
  }
  const out = { fx: [], look: [], shake: [], busy: [], later: [], defer: [], ghosts: [] };
  const base = { id: ev.id, color: ev.color || null };
  const hitsAt = (Array.isArray(ev.hits) ? ev.hits : []).map((h) => { const p = posOf(h.id); return okT(p) ? { ...pt(p), id: h.id, dodge: !!h.dodge } : null; }).filter(Boolean);
  const quake = (ms, amp) => { out.shake.push(ms); out.later.push([ms, [{ kind: "iceShake", x: 0, y: 0, amp, dur: 420 }]]); };
  switch (ev.kind) {
    case "press":
      if (okT(ev.at)) { out.fx.push({ ...base, kind: "dioPress", at: pt(ev.at), dur: T.press }); out.look.push([pt(ev.at), 0]); }
      break;
    case "shine":
      if (okT(ev.from)) {
        out.fx.push({ ...base, kind: "dioShine", from: pt(ev.from), dir: ev.dir, hitsAt, dur: T.shine });
        quake(SHINE_HIT, 11);
        for (const h of hitsAt) if (!ev.frozen) out.defer.push({ id: h.id, ms: SHINE_HIT });
      }
      break;
    case "muda":
      if (okT(ev.from)) {
        out.fx.push({ ...base, kind: "dioMuda", from: pt(ev.from), dir: ev.dir, hitsAt, dur: T.muda });
        for (let ms = 200; ms < MUDA_END; ms += 340) out.shake.push(ms);
        quake(MUDA_END, 13);
        for (const h of hitsAt) if (!ev.frozen) out.defer.push({ id: h.id, ms: MUDA_END });
      }
      break;
    case "drain": {
      const to = posOf(ev.id);
      if (okT(ev.from) && okT(to)) out.fx.push({ ...base, kind: "dioDrain", from: pt(ev.from), to: pt(to), dur: T.drain });
      break;
    }
    case "rollerLift":
      if (okT(ev.at)) { out.fx.push({ ...base, kind: "dioLift", at: pt(ev.at), dur: T.lift + LIFT_HOLD }); out.busy.push({ id: ev.id, ms: T.lift + LIFT_HOLD }); }
      break;
    case "roller":
      if (okT(ev.at)) {
        out.fx.push({ ...base, kind: "dioRoller", at: pt(ev.at), land: okT(ev.land) ? pt(ev.land) : null, size: ev.size || sizeOf(ev.targetId), dur: T.slam });
        out.look.push([pt(ev.at), 0]);
        quake(SLAM_HIT, 16);
        for (let ms = RUSH_T; ms < BOOM_T; ms += 300) out.shake.push(ms);
        quake(BOOM_T, 26);
        out.shake.push(BOOM_T + 160, BOOM_T + 320);
      }
      break;
    case "lastWin":
      out.fx.push({ ...base, kind: "dioLastWin", from: okT(ev.from) ? pt(ev.from) : null, at: okT(ev.at) ? pt(ev.at) : null, dur: T.win });
      quake(120, 12);
      break;
    default:
  }
  return out;
}

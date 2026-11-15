// เอฟเฟกต์บนกระดานของมิโดริยะ อิซึคุ (characters/midoriya_izuku.js · GRID_PLAN §7.33)
//  อ้างอิงต้นฉบับ (My Hero Academia): One for All = สายฟ้าสีเขียวแลบตามตัว · Smash = แรงลมกระแทกพุ่งไปข้างหน้า
//  ท่าตีปกติ (ฮุค attackStyle):
//   midoriyaPunch       ต่อย: แสงเขียวที่หมัด → เส้นหมัดพุ่ง → วงลมแตกที่เป้า
//   midoriyaPunchCowl   ระหว่าง Full Cowl: + สายฟ้าเขียวพาดจากตัวถึงเป้า
//  เหตุการณ์จาก server (socket "midoriyaFx" → BoardStage):
//   midoriyaSmash    Smash ทุกแบบ: ชาร์จ (สายฟ้าเขียวรอบแขน) → ตรงจังหวะ MIDORIYA_T คลื่นลมกวาดทุกช่องของพื้นที่จากใกล้ไปไกล
//                     form "throw" = ของบินตามแนวนำหน้าคลื่น · "million" = ใหญ่สุด + เส้นเลือดแดงตอนชาร์จ
//   midoriyaRecoil   ดาเมจเข้าตัวเอง: รอยร้าวแดงบนตัว + เศษแสงแดง
//   midoriyaCowl     Full Cowl: สายฟ้าเขียวระเบิดรอบตัว + วงแสงบนพื้น
//  ออร่าค้าง (drawUnit — units[].aura "midoriyaCowl"): สายฟ้าเขียวแลบรอบตัวเป็นระยะ
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
// สี: สายฟ้า One for All (เขียวสด แกนขาวเหลือง) · ลม (ขาวฟ้า) · ร่างกายรับแรง (แดง)
const WHITE = "255,255,240", BOLT = "170,255,120", GREEN = "60,235,120", DEEP = "18,150,80", WIND = "225,245,255", SKY = "150,215,255", RED = "235,40,40", DUST = "190,180,160";

// จังหวะ (ms) — server characters/midoriya_izuku.js T ต้องตรงกัน (วินาที)
export const MIDORIYA_T = { smash: 550, million: 900 };
export const MIDORIYA_MS = { midoriyaPunch: 800, midoriyaPunchCowl: 900 };
export const MIDORIYA_HIT_P = { midoriyaPunch: 0.32, midoriyaPunchCowl: 0.3 };
export const MIDORIYA_FX_DUR = { ...MIDORIYA_MS, midoriyaSmash: 1700, midoriyaRecoil: 1000, midoriyaCowl: 1500 };
export const isMidoriyaFx = (kind) => typeof kind === "string" && kind in MIDORIYA_FX_DUR;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const smashDur = (form) => (form === "million" ? MIDORIYA_T.million : MIDORIYA_T.smash) + 1150;

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, hy: by - s * 0.55 * K, K };
}
function glow(g, x, y, r, rgb, a, core = WHITE) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(core, a));
  gr.addColorStop(0.3, rgba(rgb, a * 0.8));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// สุ่มแบบกำหนดได้ (สายฟ้าไม่สั่นมั่วทุกเฟรม — เปลี่ยนรูปตาม step)
const hash = (a) => { const v = Math.sin(a * 127.1) * 43758.5453; return v - Math.floor(v); };
// สายฟ้าซิกแซก x0,y0 → x1,y1 (แกนขาว + ขอบสี)
function bolt(g, x0, y0, x1, y1, seed, jit, w, a, rgb = BOLT) {
  if (a <= 0) return;
  const n = 7, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const u = i / n, off = (hash(seed + i * 3.7) - 0.5) * 2 * jit * Math.sin(u * Math.PI);
    pts.push([x0 + dx * u + nx * off, y0 + dy * u + ny * off]);
  }
  pts.push([x1, y1]);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineJoin = "round"; g.lineCap = "round";
  for (const [col, ww, aa] of [[GREEN, w * 3, 0.35], [rgb, w * 1.6, 0.8], [WHITE, w * 0.6, 1]]) {
    g.strokeStyle = rgba(col, a * aa); g.lineWidth = Math.max(1, ww);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  }
  g.restore();
}
// สายฟ้าแลบรอบตัว (k เส้น) — ใช้ทั้งชาร์จ/ออร่า
function crackle(g, A, t, k, a, spread = 0.55, seed = 0) {
  const step = Math.floor(t / 70);
  for (let i = 0; i < k; i++) {
    const h = hash(seed + i * 9.1 + step * 1.3);
    if (h < 0.35) continue;
    const ang = hash(seed + i * 2.3 + step) * TAU, r0 = A.s * 0.12, r1 = A.s * spread * (0.6 + 0.4 * h);
    const cy = A.by - A.s * 0.42 * A.K;
    bolt(g, A.bx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.9, A.bx + Math.cos(ang + 0.6) * r1, cy + Math.sin(ang + 0.6) * r1 * 0.9, seed + i + step, A.s * 0.05, A.s * 0.012, a);
  }
}
// เส้นลม (streak) ยาวตามทิศ
function streak(g, x, y, ux, uy, len, w, a, rgb = WIND) {
  if (a <= 0) return;
  const gr = g.createLinearGradient(x - ux * len, y - uy * len, x, y);
  gr.addColorStop(0, rgba(rgb, 0)); gr.addColorStop(1, rgba(rgb, a));
  g.strokeStyle = gr; g.lineWidth = Math.max(1, w); g.lineCap = "round";
  g.beginPath(); g.moveTo(x - ux * len, y - uy * len); g.lineTo(x, y); g.stroke();
}
// วงลมบนพื้น (วงรีตามมุมกล้อง)
function ring(g, x, y, r, w, a, rgb = WIND) {
  if (a <= 0 || r <= 0) return;
  g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, w);
  g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, TAU); g.stroke();
}
function dust(g, x, y, s, q, seed, n) {
  for (let i = 0; i < n; i++) {
    const ang = hash(seed + i) * TAU, d = s * (0.15 + 0.45 * easeOut(q)) * (0.6 + hash(seed + i * 2) * 0.6);
    const r = s * (0.08 + 0.12 * q);
    const gr = g.createRadialGradient(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.5, 0, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.5, r);
    gr.addColorStop(0, rgba(DUST, (1 - q) * 0.35)); gr.addColorStop(1, rgba(DUST, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.5, r, 0, TAU); g.fill();
  }
}

// ---------- ตีปกติ ----------
function punchFx(g, e, p, seed, lowQ, cowl) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const H = cowl ? MIDORIYA_HIT_P.midoriyaPunchCowl : MIDORIYA_HIT_P.midoriyaPunch;
  const dx = B.bx - A.bx, dy = B.hy - A.hy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  g.save(); g.globalCompositeOperation = "lighter";
  // ชาร์จที่หมัด
  if (p < H + 0.05) glow(g, A.bx + ux * A.s * 0.25, A.hy + uy * A.s * 0.25, A.s * (0.18 + 0.15 * (p / H)), cowl ? GREEN : SKY, 0.7);
  if (cowl && !lowQ && p < H + 0.15) crackle(g, A, p * 900, 4, 0.9, 0.5, seed);
  // เส้นหมัด
  const sw = clamp01((p - H * 0.5) / (H * 0.5));
  if (sw > 0 && p < H + 0.2) {
    const hx = A.bx + dx * sw, hyy = A.hy + dy * sw, fade = 1 - clamp01((p - H) / 0.2);
    streak(g, hx, hyy, ux, uy, A.s * 0.6, A.s * 0.09, fade * 0.9, cowl ? BOLT : WIND);
    if (cowl) bolt(g, A.bx, A.hy, hx, hyy, seed + Math.floor(p * 20), A.s * 0.08, A.s * 0.015, fade);
  }
  g.restore();
  // ปะทะ: วงลม + เส้นลมกระจาย
  const hq = (p - H) / (1 - H);
  if (hq >= 0 && hq <= 1) {
    g.save(); g.globalCompositeOperation = "lighter";
    if (hq < 0.15) glow(g, B.bx, B.hy, B.s * 0.6, cowl ? GREEN : SKY, (1 - hq / 0.15) * 0.8);
    ring(g, B.bx, B.by - B.s * 0.05, B.s * (0.2 + 0.6 * easeOut(hq)), B.s * 0.05, (1 - hq) * 0.8);
    for (let i = 0; i < (lowQ ? 4 : 8); i++) {
      const ang = Math.atan2(uy, ux) + (hash(seed + i) - 0.5) * 1.6, d = B.s * (0.2 + 0.7 * easeOut(hq));
      streak(g, B.bx + Math.cos(ang) * d, B.hy + Math.sin(ang) * d, Math.cos(ang), Math.sin(ang), B.s * 0.3, B.s * 0.03, (1 - hq) * 0.8);
    }
    if (cowl && !lowQ && hq < 0.5) crackle(g, B, hq * 600, 3, 1 - hq * 2, 0.5, seed + 5);
    g.restore();
  }
}

// ---------- Smash ----------
function smashFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const v = DIRS[e.dir] || [1, 0];
  const big = e.form === "million";
  const dur = e.dur || MIDORIYA_FX_DUR.midoriyaSmash;
  const beat = (big ? MIDORIYA_T.million : MIDORIYA_T.smash);
  const t = p * dur;
  // จุดหมัดบนจอ (ทิศที่ต่อย)
  const [fx0, fy0] = P(e.x + 0.5 + v[0] * 0.45, e.y + 0.5 + v[1] * 0.45);
  const fist = { x: fx0, y: fy0 - A.s * 0.42 };
  g.save(); g.globalCompositeOperation = "lighter";
  // 1) ชาร์จ
  if (t < beat + 80) {
    const q = clamp01(t / beat);
    glow(g, fist.x, fist.y, A.s * (0.2 + 0.45 * q) * (big ? 1.5 : 1), GREEN, 0.4 + 0.5 * q);
    if (!lowQ) crackle(g, A, t, big ? 10 : 6, 0.6 + 0.4 * q, big ? 0.9 : 0.6, seed);
    if (big) for (let i = 0; i < (lowQ ? 2 : 5); i++) {
      const ang = hash(seed + i * 5) * TAU, r = A.s * 0.35;
      bolt(g, fist.x, fist.y, fist.x + Math.cos(ang) * r, fist.y + Math.sin(ang) * r * 0.7, seed + i + Math.floor(t / 90), A.s * 0.04, A.s * 0.01, q * 0.8, RED);
    }
  }
  g.restore();
  // 2) คลื่นลม (หลังจังหวะ) — ช่องไกลขึ้นช้าขึ้น
  const wq = (t - beat) / (dur - beat);
  if (wq >= 0 && Array.isArray(e.tiles)) {
    g.save(); g.globalCompositeOperation = "lighter";
    const maxAlong = Math.max(1, ...e.tiles.map((c) => (c.x - e.x) * v[0] + (c.y - e.y) * v[1]));
    if (wq < 0.12) glow(g, fist.x, fist.y, A.s * (big ? 1.4 : 0.9), big ? WHITE : SKY, (1 - wq / 0.12));
    ring(g, fist.x, fist.y + A.s * 0.35, A.s * (0.3 + (big ? 2.2 : 1.3) * easeOut(clamp01(wq * 1.5))), A.s * 0.06, (1 - wq) * 0.7);
    for (const c of e.tiles) {
      const along = (c.x - e.x) * v[0] + (c.y - e.y) * v[1];
      const lag = (along / maxAlong) * 0.35;
      const q = clamp01((wq - lag) / 0.5);
      if (q <= 0 || q >= 1) continue;
      const [cx, cy, cs] = P(c.x + 0.5, c.y + 0.5);
      const [ex, ey] = P(c.x + 0.5 + v[0], c.y + 0.5 + v[1]);
      const L = Math.hypot(ex - cx, ey - cy) || 1, ux = (ex - cx) / L, uy = (ey - cy) / L;
      const a = Math.sin(q * Math.PI);
      glow(g, cx, cy - cs * 0.25, cs * (big ? 0.75 : 0.55), SKY, a * 0.35, WIND);
      for (let i = 0; i < (lowQ ? 1 : 3); i++) {
        const off = (hash(seed + c.x * 7 + c.y * 13 + i) - 0.5) * cs * 0.7;
        streak(g, cx + ux * cs * 0.5 * q - uy * off, cy - cs * 0.3 + uy * cs * 0.5 * q + ux * off * 0.5, ux, uy, cs * (0.5 + 0.4 * a), cs * 0.035, a * 0.85);
      }
      if (e.cowl && !lowQ && hash(seed + c.x + c.y * 3) > 0.6) {
        bolt(g, cx - ux * cs * 0.4, cy - cs * 0.3, cx + ux * cs * 0.4, cy - cs * 0.3 - uy * cs * 0.2, seed + c.x + Math.floor(t / 80), cs * 0.06, cs * 0.012, a * 0.8);
      }
    }
    // ของที่ปาบินนำหน้า
    if (e.form === "throw") {
      const q = clamp01(wq / 0.4);
      if (q < 1) {
        const [tx, ty, ts] = P(e.x + 0.5 + v[0] * maxAlong * q, e.y + 0.5 + v[1] * maxAlong * q);
        g.globalCompositeOperation = "source-over";
        g.fillStyle = "rgba(120,110,95,0.95)"; g.beginPath(); g.arc(tx, ty - ts * 0.45, ts * 0.12, 0, TAU); g.fill();
        g.globalCompositeOperation = "lighter";
        streak(g, tx, ty - ts * 0.45, v[0] ? Math.sign(v[0]) : 0, v[1] ? Math.sign(v[1]) * 0.5 : 0, ts * 0.8, ts * 0.06, 0.8);
      }
    }
    g.restore();
    if (!lowQ) dust(g, fist.x, fist.y + A.s * 0.4, A.s * (big ? 1.6 : 1), clamp01(wq), seed, big ? 10 : 6);
  }
}

// ---------- ร่างกายรับแรง ----------
function recoilFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const k = Math.min(1.6, 0.6 + (e.n || 1) / 10);
  const a = p < 0.12 ? p / 0.12 : 1 - clamp01((p - 0.5) / 0.5);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, A.bx, A.hy, A.s * 0.55 * k, RED, a * 0.5, "255,200,190");
  for (let i = 0; i < (lowQ ? 3 : 6); i++) {
    const ang = hash(seed + i * 4.1) * TAU, r = A.s * 0.38 * k;
    bolt(g, A.bx, A.hy, A.bx + Math.cos(ang) * r, A.hy + Math.sin(ang) * r * 0.9, seed + i, A.s * 0.05, A.s * 0.012, a, RED);
  }
  g.restore();
}

// ---------- Full Cowl ----------
function cowlFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const a = 1 - clamp01((p - 0.6) / 0.4);
  g.save(); g.globalCompositeOperation = "lighter";
  if (p < 0.2) glow(g, A.bx, A.hy, A.s * (0.4 + 1.2 * (p / 0.2)), GREEN, 1 - p / 0.2);
  ring(g, A.bx, A.by, A.s * (0.3 + 0.9 * easeOut(clamp01(p * 1.5))), A.s * 0.05, a * 0.8, GREEN);
  crackle(g, A, now, lowQ ? 5 : 12, a, 0.95, seed);
  for (let i = 0; i < (lowQ ? 4 : 10); i++) {
    const q = clamp01(p * 1.3 - hash(seed + i) * 0.3);
    const x = A.bx + (hash(seed + i * 3) - 0.5) * A.s * 0.8, y = A.by - A.s * 1.2 * easeOut(q);
    glow(g, x, y, A.s * 0.05, BOLT, (1 - q) * 0.9);
  }
  g.restore();
}

export function midoriyaFx(g, e, now, lowQ) {
  const dur = e.dur || MIDORIYA_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "midoriyaPunch" || e.kind === "midoriyaPunchCowl") { if (e.to) punchFx(g, e, p, seed, lowQ, e.kind === "midoriyaPunchCowl"); }
  else if (e.kind === "midoriyaSmash") smashFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "midoriyaRecoil") recoilFx(g, e, p, seed, lowQ);
  else if (e.kind === "midoriyaCowl") cowlFx(g, e, now, p, seed, lowQ);
  g.restore();
}

// ---------- ออร่าค้าง: Full Cowl ----------
export function midoriyaAuraBack(g, x, y, now, lowQ, alpha = 1) {
  const [bx, by, s] = P(x, y);
  g.save(); g.globalAlpha *= alpha; g.globalCompositeOperation = "lighter";
  glow(g, bx, by - s * 0.4, s * 0.55, DEEP, 0.35 + 0.12 * Math.sin(now / 130), GREEN);
  g.restore();
}
export function midoriyaAuraFront(g, x, y, now, lowQ, alpha = 1) {
  if (lowQ) return;
  const [bx, by, s] = P(x, y);
  g.save(); g.globalAlpha *= alpha;
  crackle(g, { bx, by, s, K: 1 }, now, 4, 0.85, 0.5, 3.3);
  g.restore();
}

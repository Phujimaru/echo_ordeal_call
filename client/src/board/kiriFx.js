// เอฟเฟกต์บนกระดานของเอมิยะ คริซุงุ (characters/emiya_kiritsugu.js · GRID_PLAN §7.31)
//  ท่าตีปกติ (ฮุค attackStyle):
//   kiriSmg    ปืนกล Calico M950 รัว 7 นัด: แสงปากกระบอกรูปดาว · กระสุนเทรเซอร์ · ประกาย/ฝุ่นที่เป้า · ปลอกกระสุนทองเหลืองกระเด็นตกพื้น · ควันปากกระบอก
//  เหตุการณ์จาก server (socket "kiriFx" → BoardStage):
//   kiriThrow  โยนของเป็นวิถีโค้ง (item "mine" = กับดักไฟแดง · "smoke" = กระป๋องควัน → พ่นควันตอนตก)
//   kiriBoom   กับดักระเบิด: แสงวาบ · ลูกไฟ · คลื่นกระแทก · เศษ · ควันดำ
//   kiriShot   Thompson Contender: กระสุนนัดเดียวหนัก — แสงปากกระบอกใหญ่ + เส้นกระสุนส้มแดง
//  ชั้นพื้น (drawKiriGround): กับดักระเบิด = จานดำ + ไฟแดงกะพริบ (ทุกคนเห็น)
//  ภาพค้าง Time Alter: เงาสีส้ม (boardDraw — faizGhosts + KIRI_GHOST)
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const FIRE = "255,196,90", HOT = "255,246,214", ORANGE = "255,128,32", BRASS = "214,170,74";

export const KIRI_GHOST = "255,140,40"; // เงาค้างตอน Time Alter (ผู้ใช้สั่ง: เงาสีส้มตามต้นฉบับ)
export const KIRI_MS = { kiriSmg: 1000 };
// นัดแรกถึงเป้าที่ ~0.2 (เสียง kiri_smg เริ่มนัดแรกที่ 0 ms)
export const KIRI_HIT_P = { kiriSmg: 0.2 };
export const KIRI_FX_DUR = { ...KIRI_MS, kiriThrow: 700, kiriBoom: 1300, kiriShot: 1000 };
export const isKiriFx = (kind) => typeof kind === "string" && kind in KIRI_FX_DUR;

const SHOTS = 7, SHOT_GAP = 0.062, SHOT_T0 = 0.14, FLY = 0.05;

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, r: s * 0.4 * K, hy: by - s * 0.86 * K };
}
function glow(g, x, y, r, rgb, a) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(HOT, a));
  gr.addColorStop(0.3, rgba(rgb, a * 0.85));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// แสงปากกระบอกรูปดาว 4 แฉกหันตามแนวยิง
function muzzleStar(g, x, y, ang, len, a) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.rotate(ang);
  g.globalCompositeOperation = "lighter";
  g.fillStyle = rgba(FIRE, a);
  g.beginPath();
  g.moveTo(len, 0); g.lineTo(len * 0.18, len * 0.16); g.lineTo(0, len * 0.42); g.lineTo(-len * 0.12, len * 0.1);
  g.lineTo(-len * 0.3, 0); g.lineTo(-len * 0.12, -len * 0.1); g.lineTo(0, -len * 0.42); g.lineTo(len * 0.18, -len * 0.16);
  g.closePath(); g.fill();
  g.fillStyle = rgba(HOT, a);
  g.beginPath(); g.ellipse(len * 0.2, 0, len * 0.32, len * 0.12, 0, 0, TAU); g.fill();
  g.restore();
}
function tracer(g, ax, ay, bx, by, q, w, rgb = FIRE) {
  const head = clamp01(q), tail = clamp01(q - 0.35);
  const hx = ax + (bx - ax) * head, hy = ay + (by - ay) * head, tx = ax + (bx - ax) * tail, ty = ay + (by - ay) * tail;
  const gr = g.createLinearGradient(tx, ty, hx, hy);
  gr.addColorStop(0, rgba(rgb, 0)); gr.addColorStop(1, rgba(HOT, 1));
  g.save(); g.globalCompositeOperation = "lighter";
  g.strokeStyle = gr; g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(tx, ty); g.lineTo(hx, hy); g.stroke();
  g.restore();
}
function sparks(g, x, y, q, seed, s, n, rgb = FIRE) {
  if (q < 0 || q > 1) return;
  g.save(); g.globalCompositeOperation = "lighter";
  g.strokeStyle = rgba(rgb, 1 - q); g.lineWidth = Math.max(1, s * 0.012);
  for (let i = 0; i < n; i++) {
    const a = seed * 7.1 + i * 2.39, d = s * (0.05 + 0.22 * easeOut(q)) * (0.6 + ((i * 37) % 10) / 20);
    const x0 = x + Math.cos(a) * d * 0.4, y0 = y + Math.sin(a) * d * 0.25;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 + s * 0.08 * q * q); g.stroke();
  }
  g.restore();
}
function puff(g, x, y, r, a, rgb = "150,150,150") {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r);
  gr.addColorStop(0, rgba(rgb, a)); gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

// ---------- ตีปกติ: ปืนกลรัว ----------
function smgFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const dx = B.bx - A.bx, dy = B.hy - A.hy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const ang = Math.atan2(dy, dx);
  const mx = A.bx + ux * A.r * 0.95, my = A.hy + uy * A.r * 0.95 + A.s * 0.06; // ปากกระบอก (ระดับเอว)
  const side = ux >= 0 ? -1 : 1; // ปลอกกระสุนกระเด็นไปด้านขวาของผู้ยิง
  for (let i = 0; i < SHOTS; i++) {
    const t0 = SHOT_T0 + i * SHOT_GAP;
    const jit = Math.sin(seed * 13 + i * 5.7) * A.s * 0.025; // แรงสะท้อนทำให้แนวยิงส่าย
    const tx = B.bx + jit * 1.6 - uy * jit, ty = B.hy + Math.cos(seed * 3 + i * 2.1) * B.r * 0.25;
    // แสงปากกระบอก (ติด 1 เฟรมสั้นๆ)
    const fl = 1 - Math.abs(p - t0) / 0.028;
    if (fl > 0) {
      muzzleStar(g, mx, my, ang + Math.sin(i * 1.7) * 0.15, A.s * (0.26 + (i % 2) * 0.06), fl);
      glow(g, mx, my, A.s * 0.42, ORANGE, fl * 0.7);
    }
    // กระสุนเทรเซอร์
    if (p >= t0 && p < t0 + FLY) tracer(g, mx, my, tx, ty, (p - t0) / FLY, Math.max(1.5, A.s * 0.022));
    // กระทบเป้า: แสงวาบเล็ก + ประกาย + ฝุ่น
    const hq = (p - t0 - FLY) / 0.16;
    if (hq >= 0 && hq <= 1) {
      glow(g, tx, ty, B.s * 0.2 * (1 - hq * 0.5), FIRE, (1 - hq) * 0.9);
      sparks(g, tx, ty, hq, seed + i, B.s, lowQ ? 3 : 6);
      if (!lowQ) puff(g, tx - ux * B.s * 0.05, ty + B.s * 0.05 * hq, B.s * (0.08 + 0.12 * hq), (1 - hq) * 0.35, "120,110,100");
    }
    // ปลอกกระสุน: ดีดขึ้นออกข้าง โค้งตกพื้นแล้วกลิ้ง หมุนวาววับ
    if (!lowQ && p >= t0) {
      const c = (p - t0) / 0.45, cc = Math.min(1, c);
      const ox = mx - ux * A.s * 0.15 + side * (-uy) * 0, ex = side * A.s * (0.25 + 0.12 * ((i * 3) % 4)) * cc;
      const ground = A.by - A.s * 0.02;
      const yArc = my - A.s * 0.35 * Math.sin(Math.PI * Math.min(1, cc * 1.05)) + (ground - my) * cc * cc;
      const x = ox + ex - ux * A.s * 0.08 * cc, y = Math.min(ground + (i % 3) * 1.5, yArc);
      const a = c < 1 ? 1 : clamp01(1 - (c - 1) * 1.6);
      if (a > 0) {
        g.save(); g.translate(x, y); g.rotate((p - t0) * 60 + i);
        g.fillStyle = rgba(BRASS, a); g.fillRect(-A.s * 0.022, -A.s * 0.008, A.s * 0.044, A.s * 0.016);
        g.fillStyle = rgba("255,236,170", a * (0.5 + 0.5 * Math.sin((p - t0) * 90 + i))); g.fillRect(-A.s * 0.022, -A.s * 0.008, A.s * 0.044, A.s * 0.005);
        g.restore();
      }
    }
  }
  // ควันปากกระบอกลอยขึ้นหลังรัวจบ
  const sq = (p - (SHOT_T0 + SHOTS * SHOT_GAP * 0.5)) / 0.55;
  if (!lowQ && sq > 0 && sq < 1) {
    for (let k = 0; k < 3; k++) puff(g, mx + ux * A.s * 0.05 * k, my - A.s * (0.08 + 0.3 * sq) - k * A.s * 0.06, A.s * (0.08 + 0.14 * sq), (1 - sq) * 0.28, "200,200,200");
  }
}

// ---------- โยนของ ----------
function throwFx(g, e, p, lowQ) {
  if (!e.to) return;
  const A = bodyAt(e.x, e.y), B = bodyAt(e.to.x, e.to.y);
  const q = clamp01(p / 0.55);
  const x = A.bx + (B.bx - A.bx) * q, base = A.hy + (B.by - A.hy) * q;
  const y = base - Math.sin(Math.PI * q) * A.s * 0.7;
  if (q < 1) {
    g.save(); g.translate(x, y); g.rotate(q * 9);
    if (e.item === "mine") {
      g.fillStyle = "#1d2124"; g.beginPath(); g.ellipse(0, 0, A.s * 0.09, A.s * 0.06, 0, 0, TAU); g.fill();
      glow(g, 0, -A.s * 0.03, A.s * 0.06, "255,40,40", 0.9);
    } else {
      g.fillStyle = "#5d6a5a"; g.fillRect(-A.s * 0.04, -A.s * 0.075, A.s * 0.08, A.s * 0.15);
      g.fillStyle = "#c9c9c0"; g.fillRect(-A.s * 0.045, -A.s * 0.085, A.s * 0.09, A.s * 0.022);
    }
    g.restore();
    if (e.item === "smoke" && !lowQ) puff(g, x - (B.bx - A.bx) * 0.04, y, A.s * 0.06, 0.35, "200,200,200");
    return;
  }
  const r = (p - 0.55) / 0.45;
  if (e.item === "smoke") {
    for (let k = 0; k < (lowQ ? 3 : 7); k++) {
      const a = k * 0.9, d = B.s * 0.55 * easeOut(r);
      puff(g, B.bx + Math.cos(a) * d, B.by - B.s * 0.15 + Math.sin(a) * d * 0.45 - B.s * 0.2 * r, B.s * (0.2 + 0.35 * r), (1 - r) * 0.6, "190,192,190");
    }
  } else {
    glow(g, B.bx, B.by - B.s * 0.05, B.s * 0.25 * (1 - r), "255,60,50", (1 - r) * 0.8);
  }
}

// ---------- กับดักระเบิด ----------
function boomFx(g, e, p, seed, lowQ) {
  const B = bodyAt(e.x, e.y);
  const cx = B.bx, cy = B.by - B.s * 0.1;
  // วงระเบิด 3×3: พื้นทุกช่องในวงวาบส้มแล้วไหม้ดำจาง + ลูกไฟย่อยแต่ละช่อง (ตรงกับ server blastTiles)
  if (Array.isArray(e.tiles)) {
    for (const t of e.tiles) {
      const [tx, ty, ts] = P(t.x + 0.5, t.y + 0.5);
      const a = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
      g.fillStyle = rgba(p < 0.35 ? ORANGE : "40,30,26", a * (p < 0.35 ? 0.55 : 0.4));
      g.beginPath(); g.ellipse(tx, ty, ts * 0.5, ts * 0.25, 0, 0, TAU); g.fill();
      if (!lowQ && (t.x !== e.x || t.y !== e.y) && p < 0.5) glow(g, tx, ty - ts * 0.2 * easeOut(p / 0.5), ts * (0.18 + 0.3 * easeOut(p / 0.5)), FIRE, (1 - p / 0.5) * 0.8);
    }
  }
  if (p < 0.12) glow(g, cx, cy, B.s * 1.3, "255,230,180", 1 - p / 0.12);
  const f = clamp01(p / 0.55), fo = easeOut(f);
  // ลูกไฟ
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < (lowQ ? 4 : 9); i++) {
    const a = seed + i * 0.7, d = B.s * 0.35 * fo * (0.5 + (i % 3) * 0.25);
    glow(g, cx + Math.cos(a) * d, cy - B.s * 0.25 * fo + Math.sin(a) * d * 0.45, B.s * (0.25 + 0.2 * fo), i % 2 ? ORANGE : FIRE, (1 - f) * 0.9);
  }
  g.restore();
  // คลื่นกระแทกบนพื้น
  const w = clamp01(p / 0.4);
  if (w < 1) {
    g.strokeStyle = rgba("255,220,170", (1 - w) * 0.9); g.lineWidth = Math.max(1.5, B.s * 0.03 * (1 - w));
    g.beginPath(); g.ellipse(cx, B.by, B.s * (0.2 + 1.2 * w), B.s * (0.1 + 0.6 * w), 0, 0, TAU); g.stroke();
  }
  // เศษกระเด็น
  if (!lowQ) {
    g.fillStyle = rgba("60,50,40", 1 - p);
    for (let i = 0; i < 12; i++) {
      const a = seed * 3 + i * 0.52, v = B.s * (0.6 + (i % 4) * 0.2);
      const x = cx + Math.cos(a) * v * p, y = cy - Math.abs(Math.sin(a)) * v * p * 1.2 + B.s * 1.6 * p * p;
      g.fillRect(x, y, B.s * 0.03, B.s * 0.03);
    }
  }
  // ควันดำลอยขึ้น
  const s = clamp01((p - 0.2) / 0.8);
  if (s > 0) for (let k = 0; k < (lowQ ? 2 : 5); k++) puff(g, cx + (k - 2) * B.s * 0.12, cy - B.s * (0.2 + 0.7 * s) - k * B.s * 0.05, B.s * (0.2 + 0.3 * s), (1 - s) * 0.55, "40,36,34");
}

// ---------- Thompson Contender ----------
function shotFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y);
  const B = e.to ? bodyAt(e.to.x, e.to.y) : null;
  const ang = B ? Math.atan2(B.hy - A.hy, B.bx - A.bx) : 0;
  const tx = B ? B.bx : A.bx + Math.cos(ang) * A.s * 5, ty = B ? B.hy : A.hy;
  const fl = 1 - p / 0.14;
  if (fl > 0) { muzzleStar(g, A.bx + Math.cos(ang) * A.r, A.hy + Math.sin(ang) * A.r, ang, A.s * 0.6, fl); glow(g, A.bx, A.hy, A.s * 0.9, ORANGE, fl * 0.8); }
  if (p < 0.3) tracer(g, A.bx, A.hy, tx, ty, p / 0.12, Math.max(2.5, A.s * 0.05), "255,90,40");
  const h = (p - 0.12) / 0.6;
  if (B && h >= 0 && h <= 1) {
    glow(g, tx, ty, B.s * 0.6 * (1 - h * 0.4), "255,80,40", (1 - h));
    sparks(g, tx, ty, h, seed, B.s * 1.6, lowQ ? 5 : 12, "255,120,60");
  }
}

export function kiriFx(g, e, now, lowQ) {
  const dur = KIRI_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "kiriSmg") { if (e.to) smgFx(g, e, p, seed, lowQ); }
  else if (e.kind === "kiriThrow") throwFx(g, e, p, lowQ);
  else if (e.kind === "kiriBoom") boomFx(g, e, p, seed, lowQ);
  else if (e.kind === "kiriShot") shotFx(g, e, p, seed, lowQ);
  g.restore();
}

// ---------- ชั้นพื้น: กับดักระเบิด ----------
//  ground = { mines: [{ x, y, color }] }
export function drawKiriGround(g, ground, now, lowQ) {
  if (!ground || !Array.isArray(ground.mines)) return;
  for (const m of ground.mines) {
    const [cx, cy, s] = P(m.x + 0.5, m.y + 0.5);
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(cx, cy + s * 0.02, s * 0.15, s * 0.07, 0, 0, TAU); g.fill();
    g.fillStyle = "#24282b"; g.beginPath(); g.ellipse(cx, cy, s * 0.13, s * 0.06, 0, 0, TAU); g.fill();
    g.strokeStyle = m.color || "#888"; g.lineWidth = 1.5; g.stroke();
    const on = lowQ ? 1 : ((now / 450 + m.x * 0.37 + m.y * 0.21) | 0) % 2 === 0 ? 1 : 0.15;
    glow(g, cx, cy - s * 0.035, s * (0.06 + 0.12 * on), "255,30,30", on);
  }
}

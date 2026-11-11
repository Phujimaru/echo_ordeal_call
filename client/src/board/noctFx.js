// ============================================================
//  เอฟเฟกต์บนกระดานของน็อคทิส ลูซิส เคลัม (characters/noctis.js · GRID_PLAN §7.31)
//  ใช้ภาพอาวุธของผู้ใช้ (/characters/noctis/arms/*.webp) · อาวุธราชวงศ์ = วิญญาณผลึกสีฟ้า แตกเป็นเศษผลึก มีภาพติดตาตอนเคลื่อนที่
//  ภาพอาวุธวางเฉียง ปลายชี้ขึ้นขวา ~60° (ธนูยิงไปทางนี้ · Engine Blade ตั้งตรงปลายชี้ลง) → TIP · drawArm(dir) = หมุนให้ปลายชี้มุมจอ dir
//  มุมกล้อง: "ขึ้นฟ้า" คิดจาก P(z) จริง (vert) — มองจากบน (bird's-eye) ไม่มีความสูง → วง Armiger กางเป็นรัศมีปลายชี้ออก ·
//   ของที่ตกจากฟ้าใหญ่ขึ้นเข้าหากล้องแทนการเลื่อนลง · เสาแสงกลายเป็นวงแสงบนพื้น
//
//  เหตุการณ์ (socket "noctFx" → NOCT_EVENT_FX):
//   arm เรียกอาวุธ · heed ขานรับ เหล่าราชา · throw Warp Strike (อาวุธพุ่งปลายนำไปก่อน) · warp/point วาร์ป (ร่างแตกเป็นผลึก → ประกอบร่าง)
//   ruin ทำลายให้สิ้น: ดาบในวง Armiger หมุนเล็งตามทิศที่เลือกแล้วพุ่งตรงเข้าช่องในแนวทีละเล่ม · ruinEos = เล็งลงเป้าแต่ละตัว
//   end  ให้มันจบตรงนี้แหละ: Engine Blade ยักษ์ปักลงเป้า
//  ท่าตีปกติ (attackStyle noct_<อาวุธ>): ดาบฟันโค้ง · ดาบใหญ่/ขวาน/ค้อนเงื้อสูงสับลง · ธนูน้าวยิงลูกศรแสง · ดาวขว้างหมุนแล้วกลับมือ ·
//   หอกแทงทะลุ · โล่กระแทก · คทาวงเวท+เสาแสง · คาตานะชักฟัน 3 เส้น · ดาบคู่ฟันไขว้ · noct_armiger = ดาบในวง 3 เล่มเล็งแล้วพุ่งเข้าเป้า
//  ของค้าง (players[].noct → prop noctis): drawNoctAir = อาวุธที่ถือลอยข้างตัว · ปลดปล่อย = Armiger วนรอบตัว
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const DIR = "/characters/noctis/arms";
export const NOCT_ARMS = {
  wise: "Sword-of-the-Wise", axe: "Axe-of-the-Conqueror", bow: "Bow-of-the-Clever", wanderer: "Swords-of-the-Wanderer",
  mystic: "Blade-of-the-Mystic", star: "Star-of-the-Rogue", tall: "Sword-of-the-Tall", shield: "Shield-of-the-Just",
  mace: "Mace-of-the-Fierce", scepter: "Scepter-of-the-Pious", trident: "Trident-of-the-Oracle", katana: "Katana-of-the-Warrior",
  father: "Sword-of-the-Father", engine: "Engine-Blade",
};
const ROYAL = Object.keys(NOCT_ARMS).filter((k) => k !== "engine");
const TIP = Object.fromEntries(Object.keys(NOCT_ARMS).map((k) => [k, -Math.PI / 3]));
TIP.engine = Math.PI / 2;

// ---------- จังหวะ (ms) · [ยาว, สัดส่วนปะทะ] ----------
const STRIKE = {
  wise: [860, 0.52], engine: [980, 0.5], father: [900, 0.52], mystic: [980, 0.52], katana: [1050, 0.78], wanderer: [980, 0.56],
  tall: [1250, 0.64], axe: [1180, 0.62], mace: [1250, 0.64], shield: [940, 0.56], scepter: [1250, 0.64], bow: [1150, 0.68],
  star: [1250, 0.42], trident: [940, 0.52],
};
const ARMIGER = [1400, 0.74];
export const NOCT_MS = { ...Object.fromEntries(Object.entries(STRIKE).map(([k, v]) => [`noct_${k}`, v[0]])), noct_armiger: ARMIGER[0] };
export const NOCT_HIT_P = { ...Object.fromEntries(Object.entries(STRIKE).map(([k, v]) => [`noct_${k}`, v[1]])), noct_armiger: ARMIGER[1] };
const RUIN_AIM = 420, RUIN_GAP = 75, RUIN_FLY = 240;
export const NOCT_FX_DUR = {
  ...NOCT_MS,
  noctArm: 1000, noctHeed: 1600, noctThrow: 650, noctWarp: 760, noctPoint: 800,
  noctRuin: RUIN_AIM + 13 * RUIN_GAP + RUIN_FLY + 800, noctRuinEos: RUIN_AIM + 13 * RUIN_GAP + RUIN_FLY + 900, noctEnd: 1800,
};
export const isNoctFx = (kind) => typeof kind === "string" && (kind in NOCT_FX_DUR);
export const NOCT_EVENT_FX = {
  arm: "noctArm", heed: "noctHeed", throw: "noctThrow", warp: "noctWarp", point: "noctPoint", ruin: "noctRuin", ruinEos: "noctRuinEos", end: "noctEnd",
};

// ---------- สี ----------
const CYAN = "120,210,255", CYAN_HI = "220,246,255", INDIGO = "90,110,255", VIOLET = "170,120,255", GOLD = "255,214,120", WHITE = "255,255,255", DUST = "190,180,160";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ctr = (x, y, n = 1) => [x + n / 2, y + n / 2];
const angLerp = (a, b, t) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };

// ทิศ "ขึ้นฟ้า" บนจอที่จุดกระดาน (x, y) + ความตั้ง (0 = มองจากบน · ~0.5+ = มุมปกติ)
function vert(x, y, z = 1) {
  const [ax, ay, s] = P(x, y, z), [bx, by] = P(x, y, z + 1);
  const len = Math.hypot(bx - ax, by - ay);
  return { dir: len > 0.5 ? Math.atan2(by - ay, bx - ax) : -Math.PI / 2, k: clamp01((len / Math.max(1, s) - 0.08) / 0.32) };
}

// ---------- ภาพอาวุธ (ต้นฉบับ + ฉบับวิญญาณผลึกสีฟ้า) ----------
const imgs = new Map();
function armImg(key) {
  const k = NOCT_ARMS[key] ? key : "engine";
  let e = imgs.get(k);
  if (!e && typeof Image === "function") {
    const im = new Image();
    im.decoding = "async";
    e = { im, ok: false, ghost: null };
    im.onload = () => { e.ok = true; };
    im.src = `${DIR}/${NOCT_ARMS[k]}.webp`;
    imgs.set(k, e);
  }
  return e && e.ok ? e : null;
}
function ghostOf(e) {
  if (e.ghost || typeof document === "undefined") return e.ghost;
  const c = document.createElement("canvas");
  const s = 256 / Math.max(e.im.naturalWidth, e.im.naturalHeight);
  c.width = Math.max(1, Math.round(e.im.naturalWidth * s));
  c.height = Math.max(1, Math.round(e.im.naturalHeight * s));
  const x = c.getContext("2d");
  x.drawImage(e.im, 0, 0, c.width, c.height);
  x.globalCompositeOperation = "source-atop";
  const gr = x.createLinearGradient(0, 0, c.width, c.height);
  gr.addColorStop(0, `rgba(${CYAN_HI},0.85)`); gr.addColorStop(0.5, `rgba(${CYAN},0.8)`); gr.addColorStop(1, `rgba(${INDIGO},0.85)`);
  x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height);
  e.ghost = c;
  return c;
}
// อาวุธยาว L ปลายชี้มุม dir · ghost = วิญญาณผลึก (เรือง) · flip = กลับซ้ายขวา (ฟันย้อน)
function drawArm(g, key, x, y, L, dir, a, ghost = false, lowQ = false, flip = false) {
  const e = armImg(key);
  if (!e || a <= 0.01) return;
  const src = ghost ? ghostOf(e) || e.im : e.im;
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  const s = L / Math.hypot(w, h) * 1.25;
  g.save();
  g.translate(x, y);
  g.rotate(dir - (TIP[key] || 0));
  if (flip) g.scale(-1, 1);
  g.globalAlpha = Math.min(1, a);
  if (ghost) { g.globalCompositeOperation = "lighter"; if (!lowQ) glow(g, 0, 0, L * 0.5, CYAN, 0.22 * a); }
  g.drawImage(src, -w * s / 2, -h * s / 2, w * s, h * s);
  g.restore();
}
// อาวุธจริง + เคลือบวิญญาณ + ภาพติดตาย้อนตามเส้นทาง (pos(k) → { x, y, dir }) — ใช้กับของที่กำลังพุ่ง
function armMoving(g, key, pos, k, L, lowQ, { solid = true, trail = 4, step = 0.06, a = 1, flip = false } = {}) {
  if (!lowQ) for (let i = trail; i >= 1; i--) {
    const kk = k - i * step;
    if (kk < 0) continue;
    const p = pos(kk);
    drawArm(g, key, p.x, p.y, L, p.dir, a * (0.32 - i * 0.06), true, true, flip);
  }
  const p = pos(k);
  if (solid) drawArm(g, key, p.x, p.y, L, p.dir, a, false, lowQ, flip);
  drawArm(g, key, p.x, p.y, L, p.dir, a * (solid ? 0.38 : 1), true, lowQ, flip);
}
function shards(g, x, y, r, k, seed, n, a, rgb = CYAN_HI) {
  if (a <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const th = hash01(seed * 13 + i) * TAU, d = r * (0.15 + k * (0.7 + hash01(seed + i * 7))), s = r * 0.07 * (1 - k * 0.6) + 0.8;
    const px = x + Math.cos(th) * d, py = y + Math.sin(th) * d * 0.75 - k * r * 0.25;
    const rot = th + k * 3;
    g.fillStyle = `rgba(${i % 3 ? rgb : WHITE},${a * (0.6 + 0.4 * hash01(i))})`;
    g.beginPath();
    g.moveTo(px + Math.cos(rot) * s * 1.8, py + Math.sin(rot) * s * 1.8);
    g.lineTo(px + Math.cos(rot + 1.6) * s, py + Math.sin(rot + 1.6) * s);
    g.lineTo(px - Math.cos(rot) * s * 1.8, py - Math.sin(rot) * s * 1.8);
    g.lineTo(px - Math.cos(rot + 1.6) * s, py - Math.sin(rot + 1.6) * s);
    g.closePath(); g.fill();
  }
  g.restore();
}
function streak(g, x0, y0, x1, y1, w, a, rgb = CYAN) {
  if (a <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.7, `rgba(${rgb},${0.6 * a})`); gr.addColorStop(1, `rgba(${CYAN_HI},${a})`);
  g.strokeStyle = gr; g.lineWidth = w;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.lineWidth = w * 0.3; g.strokeStyle = `rgba(${WHITE},${0.8 * a})`;
  g.beginPath(); g.moveTo(lerp(x0, x1, 0.55), lerp(y0, y1, 0.55)); g.lineTo(x1, y1); g.stroke();
  g.restore();
}
// รอยฟันจันทร์เสี้ยว รอบ x,y รัศมี r (วงรีตามมุมกล้อง sq) จาก a0 ถึง a1 · k = ความคืบหน้า
function slashArc(g, x, y, r, sq, a0, a1, k, fade, w, rgb = CYAN_HI) {
  if (fade <= 0.01 || k <= 0) return;
  const end = lerp(a0, a1, k), start = lerp(a0, a1, Math.max(0, k - 0.8));
  const lo = Math.min(start, end), hi = Math.max(start, end);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const layers = [[w * 4.5, `rgba(${CYAN},${0.18 * fade})`], [w * 2.2, `rgba(${rgb},${0.45 * fade})`], [w, `rgba(${WHITE},${fade})`]];
  for (const [lw, col] of layers) {
    g.strokeStyle = col; g.lineWidth = lw;
    g.beginPath(); g.ellipse(x, y, r, r * sq, 0, lo, hi); g.stroke();
  }
  g.restore();
}
function ring(g, bx, by, r, z, a, rgb, w = 2) {
  if (a <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter";
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w;
  gEllipse(g, bx, by, r, z); g.stroke();
  g.restore();
}
function flash(g, x, y, r, rgb, a) { if (a > 0.01) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, x, y, r, rgb, a); g.restore(); } }
function dust(g, x, y, r, k, seed, a) {
  if (a <= 0.01) return;
  g.save();
  for (let i = 0; i < 12; i++) {
    const th = hash01(seed + i) * TAU, d = r * (0.3 + k * (0.6 + hash01(i * 3 + seed)));
    g.fillStyle = `rgba(${DUST},${0.45 * a * hash01(i + 9)})`;
    g.beginPath(); g.arc(x + Math.cos(th) * d * 1.3, y + Math.sin(th) * d * 0.55, r * 0.13 * (1 - k * 0.5), 0, TAU); g.fill();
  }
  g.restore();
}
function cracks(g, x, y, r, k, seed) {
  g.save(); g.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const q = hash01(i + seed) * TAU, rr = r * (0.5 + hash01(i * 5 + seed) * 0.8) * easeOut3(clamp01(k * 4));
    g.strokeStyle = `rgba(20,30,50,${0.75 * (1 - k)})`; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(x, y);
    const mx = x + Math.cos(q + 0.3) * rr * 0.5, my = y + Math.sin(q + 0.3) * rr * 0.25;
    g.lineTo(mx, my); g.lineTo(x + Math.cos(q) * rr, y + Math.sin(q) * rr * 0.5); g.stroke();
    g.strokeStyle = `rgba(${CYAN},${0.5 * (1 - k)})`; g.lineWidth = 1;
    g.stroke();
  }
  g.restore();
}

// ---------- Armiger: ตำแหน่ง/ทิศดาบในวงรอบตัว (วงที่ลอย + ท่าที่ยิงดาบออกจากวงใช้ร่วมกัน) ----------
function armigerSlot(cx, cy, n, i, m, now) {
  const rot = REDUCED ? 0 : now / 3400;
  const th = rot + (i / m) * TAU;
  const bx = cx + Math.cos(th) * 1.05 * n, by = cy + Math.sin(th) * 1.05 * n;
  const bob = REDUCED ? 0 : Math.sin(now / 520 + i * 1.3) * 0.07;
  const [x, y, s] = P(bx, by, 1.2 + bob);
  const [ox, oy] = P(cx, cy, 1.2);
  const v = vert(bx, by, 1.2);
  // มุมปกติ = ตั้งตรงปลายชี้ฟ้า · มองจากบน = ปลายชี้ออกจากตัว (รัศมี)
  const dir = angLerp(Math.atan2(y - oy, x - ox), v.dir, v.k);
  const [, dy] = P(bx, by, 0); const [, cyy] = P(cx, cy, 0);
  return { x, y, s, dir, front: dy - cyy };
}

// ---------- ของค้างบนตัว ----------
export function drawNoctAir(g, list, units, fx, now, lowQ) {
  for (const c of list || []) {
    const u = units.find((it) => it.id === c.id && !it.corpse);
    if (!u) continue;
    const n = Math.max(1, u.size | 0);
    const [cx, cy] = ctr(u.rx + (u.ox || 0), u.ry + (u.oy || 0), n);
    const [sx, sy, sc] = P(cx, cy, 1.0);
    const firing = fx.some((e) => ((e.kind === "noctRuin" || e.kind === "noctRuinEos") && e.id === c.id) || (e.kind === "noct_armiger" && e.by === c.id));
    if (c.unleash) {
      const br = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 600);
      if (!lowQ) { flash(g, sx, sy, sc * 1.6 * n, VIOLET, 0.13 + 0.07 * br); flash(g, sx, sy, sc * 0.9 * n, CYAN, 0.1); }
      ring(g, cx, cy, 1.05 * n, 0.03, 0.3 + 0.2 * br, CYAN, 1.6);
      ring(g, cx, cy, 0.72 * n, 0.03, 0.18 + 0.12 * br, VIOLET, 1);
      // ละอองผลึกลอยขึ้นรอบตัว
      if (!lowQ) for (let i = 0; i < 10; i++) {
        const ph = ((now / 1600 + hash01(i)) % 1), th = hash01(i * 3) * TAU;
        const [px, py, ps] = P(cx + Math.cos(th) * 0.9 * n, cy + Math.sin(th) * 0.9 * n, 0.2 + ph * 2);
        g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(${CYAN_HI},${0.6 * Math.sin(ph * Math.PI)})`;
        g.beginPath(); g.arc(px, py, ps * 0.03 + 0.6, 0, TAU); g.fill(); g.restore();
      }
      if (firing) continue;
      const m = lowQ ? 7 : ROYAL.length;
      const order = [...Array(m).keys()].map((i) => ({ i, ...armigerSlot(cx, cy, n, i, m, now) })).sort((a, b) => a.front - b.front);
      for (const o of order) {
        const depth = 0.55 + 0.45 * clamp01((o.front / Math.max(1, sc) + 0.5));
        drawArm(g, ROYAL[o.i], o.x, o.y, o.s * 0.95, o.dir, depth, true, lowQ);
      }
      continue;
    }
    // อาวุธที่ถืออยู่ลอยข้างตัว ปลายชี้ฟ้า (มองจากบน = ชี้ออกขวา)
    const bob = REDUCED ? 0 : Math.sin(now / 480) * 0.05;
    const bx = cx + 0.58 * n, by = cy - 0.12;
    const [wx, wy, ws] = P(bx, by, 1.2 + bob), v = vert(bx, by, 1.2);
    const dir = angLerp(Math.atan2(wy - sy, wx - sx), v.dir + 0.18, v.k);
    const w = c.weapon || "engine";
    if (c.heed && !lowQ) flash(g, wx, wy, ws * 0.8, GOLD, 0.35 + (REDUCED ? 0 : 0.15 * Math.sin(now / 260)));
    drawArm(g, w, wx, wy, ws * 0.95, dir, 0.95, false, lowQ);
    drawArm(g, w, wx, wy, ws * 0.95, dir, c.heed ? 0.45 : 0.15, true, lowQ);
    if (c.dodge && !lowQ) shards(g, sx, sy, sc * 0.9, 0.3 + 0.2 * Math.sin(now / 300), Math.floor(now / 400), 7, 0.55, VIOLET);
  }
}

// ---------- เหตุการณ์ครั้งเดียว ----------
const cOf = (e) => { const n = Math.max(1, e.size | 0); return ctr(e.x, e.y, n); };
function armFx(g, e, t, lowQ) {
  const k = clamp01(t / NOCT_FX_DUR.noctArm);
  const [cx, cy] = cOf(e), [hx, hy, hs] = P(cx, cy, 2.0), [wx, wy, ws] = P(cx + 0.58, cy - 0.12, 1.2), v = vert(cx + 0.58, cy - 0.12, 1.2);
  const gather = clamp01(k / 0.45), drop = clamp01((k - 0.45) / 0.4), fade = 1 - clamp01((k - 0.8) / 0.2);
  shards(g, hx, hy, hs * (1.5 - gather), 1 - gather, 7, lowQ ? 8 : 22, 0.95 * (1 - drop));
  const x = lerp(hx, wx, easeOut3(drop)), y = lerp(hy, wy, easeOut3(drop));
  drawArm(g, e.weapon, x, y, lerp(hs * 1.3, ws, drop) * 0.95, v.dir + 0.18 * drop, gather, true, lowQ);
  if (!lowQ) flash(g, x, y, hs * 1.1, CYAN, 0.55 * gather * fade);
  if (drop >= 1) shards(g, wx, wy, ws * 0.6, clamp01((k - 0.85) / 0.15), 19, 8, 1 - clamp01((k - 0.85) / 0.15));
}
function heedFx(g, e, t, lowQ) {
  const k = clamp01(t / NOCT_FX_DUR.noctHeed), a = Math.sin(k * Math.PI);
  const [cx, cy] = cOf(e), [sx, sy, sc] = P(cx, cy, 0.05), [tx, ty] = P(cx, cy, 6), v = vert(cx, cy, 1);
  g.save(); g.globalCompositeOperation = "lighter";
  if (v.k > 0.2) {
    const gr = g.createLinearGradient(tx, ty, sx, sy);
    gr.addColorStop(0, `rgba(${CYAN},0)`); gr.addColorStop(0.6, `rgba(${CYAN},${0.35 * a * v.k})`); gr.addColorStop(1, `rgba(${CYAN_HI},${0.75 * a * v.k})`);
    g.fillStyle = gr; g.fillRect(Math.min(sx, tx) - sc * 0.45, Math.min(ty, sy), sc * 0.9, Math.abs(sy - ty));
  }
  if (!lowQ) { glow(g, sx, sy, sc * 1.8, GOLD, 0.35 * a); glow(g, sx, sy, sc * 0.8, WHITE, 0.3 * a); }
  g.restore();
  ring(g, cx, cy, 0.4 + k * 1.4, 0.02, a, GOLD, 2.5);
  const m = lowQ ? 7 : ROYAL.length;
  for (let i = 0; i < m; i++) {
    const th = (i / m) * TAU + k * 0.8, r = 1.2 * easeOut3(clamp01(k / 0.4));
    const bx = cx + Math.cos(th) * r, by = cy + Math.sin(th) * r;
    const [wx, wy, ws] = P(bx, by, 1.3), vv = vert(bx, by, 1.3);
    drawArm(g, ROYAL[i], wx, wy, ws * 0.9, angLerp(Math.atan2(wy - sy, wx - sx), vv.dir, vv.k), a, true, lowQ);
  }
}
function throwFx(g, e, t, lowQ) {
  const [cx, cy] = cOf(e), to = e.to || { x: e.x, y: e.y };
  const [x0, y0, s0] = P(cx, cy, 1.0), [x1, y1] = P(to.x + 0.5, to.y + 0.5, 0.7);
  const fly = 380, dir = Math.atan2(y1 - y0, x1 - x0);
  const pos = (k) => { const kk = easeIn2(clamp01(k)); return { x: lerp(x0, x1, kk), y: lerp(y0, y1, kk), dir: e.weapon === "star" && !REDUCED ? kk * 30 : dir }; };
  if (t < fly) {
    const k = t / fly, p = pos(k);
    streak(g, lerp(x0, x1, Math.max(0, easeIn2(k) - 0.4)), lerp(y0, y1, Math.max(0, easeIn2(k) - 0.4)), p.x, p.y, s0 * 0.16, 0.95);
    armMoving(g, e.weapon, pos, k, s0 * 1.05, lowQ);
  } else {
    // ปักเป้า: อาวุธค้าง + ผลึกเรืองรอร่างวาร์ปตามมา
    const kk = clamp01((t - fly) / (NOCT_FX_DUR.noctThrow - fly));
    drawArm(g, e.weapon, x1 - Math.cos(dir) * s0 * 0.2, y1 - Math.sin(dir) * s0 * 0.2, s0 * 1.05, dir, 1 - kk * 0.4, true, lowQ);
    shards(g, x1, y1, s0, kk, 31, lowQ ? 8 : 18, 1 - kk);
    if (!lowQ) flash(g, x1, y1, s0 * (0.7 + kk), CYAN_HI, 0.75 * (1 - kk));
  }
}
function warpFx(g, e, t, lowQ, point) {
  const k = clamp01(t / NOCT_FX_DUR[point ? "noctPoint" : "noctWarp"]);
  const from = e.from || { x: e.x, y: e.y }, to = e.to || from;
  const [x0, y0, s0] = P(from.x + 0.5, from.y + 0.5, 0.9), [x1, y1] = P(to.x + 0.5, to.y + 0.5, 0.9);
  const col = point ? VIOLET : CYAN, hi = point ? VIOLET : CYAN_HI;
  // ต้นทาง: ร่างแตกเป็นผลึก
  shards(g, x0, y0, s0 * 1.1, clamp01(k / 0.5), 3, lowQ ? 8 : 24, 1 - clamp01(k / 0.6), hi);
  if (!lowQ) flash(g, x0, y0, s0 * 0.9, col, 0.5 * (1 - clamp01(k / 0.35)));
  // เส้นทางผลึก (หลายเส้นเหลื่อมกัน)
  const go = clamp01((k - 0.08) / 0.35);
  if (go > 0 && k < 0.85) {
    const fade = 1 - clamp01((k - 0.5) / 0.35);
    for (let i = 0; i < (lowQ ? 1 : 3); i++) {
      const off = (i - 1) * s0 * 0.08;
      const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
      streak(g, x0 + nx / nl * off, y0 + ny / nl * off, lerp(x0, x1, easeOut3(go)) + nx / nl * off, lerp(y0, y1, easeOut3(go)) + ny / nl * off, s0 * (point ? 0.1 : 0.16) * (i === 1 ? 1 : 0.5), fade, col);
    }
  }
  // ปลายทาง: ผลึกยุบรวมเป็นร่าง
  const land = clamp01((k - 0.38) / 0.62);
  if (land > 0) {
    shards(g, x1, y1, s0 * (1.3 - land), 1 - land, 9, lowQ ? 8 : 22, 0.95 * (1 - land), hi);
    if (!lowQ) flash(g, x1, y1, s0 * (0.8 + 0.7 * land), col, 0.65 * (1 - land));
    ring(g, to.x + 0.5, to.y + 0.5, 0.3 + land * 0.75, 0.02, 0.85 * (1 - land), hi, 2.5);
  }
}
// ยิงดาบจากวงทีละเล่ม: ช่วงเล็งหมุนจากทิศในวงไปชี้เป้า (ยกขึ้นเล็กน้อย) → พุ่งตรงปลายนำ (ภาพติดตา) → ปักแล้วแตก
//  shots = [{ key, from: { x, y, s, dir }, to: { x, y, s }, at }]
function volley(g, shots, t, aim, lowQ) {
  for (const sh of shots) {
    const dir = Math.atan2(sh.to.y - sh.from.y, sh.to.x - sh.from.x);
    const lift = sh.from.s * 0.3;
    if (t < sh.at) {
      const k = easeInOut(clamp01(t / aim));
      const x = sh.from.x - Math.cos(dir) * lift * 0.4 * k, y = sh.from.y - lift * k;
      drawArm(g, sh.key, x, y, sh.from.s * 0.95, angLerp(sh.from.dir, dir, k), 0.95, true, true);
      if (k >= 1 && !lowQ) flash(g, x + Math.cos(dir) * sh.from.s * 0.45, y + Math.sin(dir) * sh.from.s * 0.45, sh.from.s * 0.16, CYAN_HI, 0.12 + 0.08 * Math.sin(t / 35 + sh.at)); // ประกายที่ปลาย (เบา — 13 เล่มรวมกันไม่ให้จ้ากลบตัว)
      continue;
    }
    const x0 = sh.from.x - Math.cos(dir) * lift * 0.4, y0 = sh.from.y - lift;
    const k = (t - sh.at) / RUIN_FLY;
    const pos = (kk) => { const q = easeIn2(clamp01(kk)); return { x: lerp(x0, sh.to.x, q), y: lerp(y0, sh.to.y, q), dir }; };
    if (k < 1) {
      const p = pos(k);
      streak(g, lerp(x0, sh.to.x, Math.max(0, easeIn2(k) - 0.45)), lerp(y0, sh.to.y, Math.max(0, easeIn2(k) - 0.45)), p.x, p.y, sh.from.s * 0.13, 0.95);
      armMoving(g, sh.key, pos, k, lerp(sh.from.s, sh.to.s, easeIn2(k)) * 0.95, lowQ, { solid: false, step: 0.08 });
    } else {
      const kk = clamp01((k - 1) * RUIN_FLY / 500);
      if (kk >= 1) continue;
      drawArm(g, sh.key, sh.to.x - Math.cos(dir) * sh.to.s * 0.3, sh.to.y - Math.sin(dir) * sh.to.s * 0.3, sh.to.s * 0.95, dir, 1 - kk, true, lowQ);
      shards(g, sh.to.x, sh.to.y, sh.to.s * 0.9, kk, sh.at, lowQ ? 5 : 12, 1 - kk);
      if (!lowQ && kk < 0.3) flash(g, sh.to.x, sh.to.y, sh.to.s * 0.8, CYAN_HI, 0.7 * (1 - kk / 0.3));
    }
  }
}
function ruinShots(e, targets) {
  const [cx, cy] = cOf(e), n = Math.max(1, e.size | 0), m = ROYAL.length;
  return ROYAL.map((key, i) => {
    const slot = armigerSlot(cx, cy, n, i, m, e.t0 || 0);
    const tile = targets[i % targets.length];
    const [tx, ty, ts] = P(tile.x + 0.5, tile.y + 0.5, 0.35);
    return { key, from: { x: slot.x, y: slot.y, s: slot.s, dir: slot.dir }, to: { x: tx, y: ty, s: ts }, at: RUIN_AIM + i * RUIN_GAP };
  });
}
function ruinFx(g, e, t, lowQ) {
  const d = DIRS[e.dir] || [1, 0];
  const tiles = Array.isArray(e.tiles) && e.tiles.length ? e.tiles : [{ x: e.x + d[0] * 3, y: e.y + d[1] * 3 }];
  // 13 เล่มเรียงจากช่องใกล้ไปไกล สลับแถวข้าง (แต่ละเล่มลงคนละช่อง)
  const along = (c) => (c.x - e.x) * d[0] + (c.y - e.y) * d[1], across = (c) => (c.x - e.x) * d[1] - (c.y - e.y) * d[0];
  const sorted = tiles.slice().sort((a, b) => along(a) - along(b) || across(a) - across(b));
  const picks = [];
  for (let i = 0; i < 13; i++) picks.push(sorted[Math.min(sorted.length - 1, Math.floor((i / 13) * sorted.length))]);
  if (!lowQ) {
    const a = 0.28 * clamp01(t / RUIN_AIM) * (1 - clamp01((t - RUIN_AIM - 13 * RUIN_GAP) / 600));
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(${CYAN},${a})`;
    for (const c of tiles) { gEllipse(g, c.x + 0.5, c.y + 0.5, 0.44, 0.02, 16); g.fill(); }
    g.restore();
  }
  volley(g, ruinShots(e, picks), t, RUIN_AIM, lowQ);
  // จบชุด: แนวทั้งแถบระเบิดผลึก
  const end = clamp01((t - (RUIN_AIM + 13 * RUIN_GAP + RUIN_FLY)) / 700);
  if (end > 0 && end < 1) for (const c of picks) {
    const [x, y, s] = P(c.x + 0.5, c.y + 0.5, 0.3);
    shards(g, x, y, s * 1.2, end, c.x * 7 + c.y, lowQ ? 4 : 8, 1 - end);
  }
}
function ruinEosFx(g, e, t, lowQ) {
  const spots = Array.isArray(e.spots) && e.spots.length ? e.spots : [{ x: e.x, y: e.y }];
  volley(g, ruinShots(e, spots), t, RUIN_AIM, lowQ);
  const boom = clamp01((t - (RUIN_AIM + 13 * RUIN_GAP + RUIN_FLY)) / 800);
  if (boom > 0) for (const c of spots) {
    const [tx, ty, ts] = P(c.x + 0.5, c.y + 0.5, 0.4);
    shards(g, tx, ty, ts * 2.2, boom, c.x * 31 + c.y, lowQ ? 8 : 22, 1 - boom);
    ring(g, c.x + 0.5, c.y + 0.5, 0.4 + boom * 1.3, 0.02, 1 - boom, CYAN_HI, 3);
    if (!lowQ) flash(g, tx, ty, ts * (1 + 2.2 * boom), CYAN, 0.75 * (1 - boom));
  }
}
function endFx(g, e, t, lowQ) {
  const dur = NOCT_FX_DUR.noctEnd, to = e.to || { x: e.x, y: e.y };
  const [tx, ty, ts] = P(to.x + 0.5, to.y + 0.5, 0.6), v = vert(to.x + 0.5, to.y + 0.5, 0.6);
  const [ux, uy] = P(to.x + 0.5, to.y + 0.5, 7);
  const fall = clamp01(t / 560), after = clamp01((t - 560) / (dur - 560));
  const down = v.dir + Math.PI;
  const L = ts * 3.4;
  const grow = (1 - v.k) * 1.8; // มองจากบน: ตกเข้าหากล้อง = ใหญ่ → ขนาดจริง
  if (fall < 1) {
    const q = easeIn2(fall);
    const x = lerp(ux, tx, q) - Math.cos(down) * L * 0.35 * v.k, y = lerp(uy, ty, q) - Math.sin(down) * L * 0.35 * v.k;
    if (v.k > 0.2) streak(g, ux, uy, x, y, ts * 0.3, 0.9, VIOLET);
    drawArm(g, "engine", x, y, L * (1 + grow * (1 - q)), down, 0.4 + 0.6 * q, true, lowQ);
    if (!lowQ) flash(g, tx, ty, ts * 2 * q, VIOLET, 0.3 * q);
  } else {
    drawArm(g, "engine", tx - Math.cos(down) * L * 0.35 * v.k, ty - Math.sin(down) * L * 0.35 * v.k, L, down, 1 - after, true, lowQ);
    shards(g, tx, ty, ts * 2.8, after, 77, lowQ ? 10 : 30, 1 - after);
    if (!lowQ) { flash(g, tx, ty, ts * (1.6 + 3.2 * after), VIOLET, 0.8 * (1 - after)); flash(g, tx, ty, ts * 1.2, WHITE, 0.6 * (1 - clamp01(after * 3))); }
    for (let i = 0; i < 3; i++) ring(g, to.x + 0.5, to.y + 0.5, 0.4 + after * (2.4 - i * 0.5), 0.02, (1 - after) * (1 - i * 0.25), i ? CYAN : CYAN_HI, 3 - i);
    cracks(g, ...P(to.x + 0.5, to.y + 0.5, 0.01).slice(0, 2), ts * 2.4, after, 41);
  }
}

// ---------- ท่าตีปกติตามอาวุธ ----------
function strikeCtx(e) {
  const [cx, cy] = cOf(e), to = e.to || { x: e.x, y: e.y }, tn = Math.max(1, e.toSize | 0);
  const tx = to.x + tn / 2, ty = to.y + tn / 2;
  const [x0, y0, s] = P(cx, cy, 0.9), [x1, y1, s1] = P(tx, ty, 0.75), [gx, gy] = P(tx, ty, 0.02);
  const a = Math.atan2(y1 - y0, x1 - x0), side = Math.cos(a) >= 0 ? 1 : -1;
  const v = vert(tx, ty, 0.75);
  const sq = 0.45 + 0.55 * (1 - v.k); // วงรีของรอยฟันตามมุมกล้อง (มองจากบน = กลม)
  return { x0, y0, x1, y1, s, s1, gx, gy, a, side, tx, ty, v, sq, cx, cy };
}
function impact(g, c, k, lowQ, rgb = CYAN_HI, big = 1) {
  if (k >= 1) return;
  shards(g, c.x1, c.y1, c.s1 * 1.1 * big, k, 5, lowQ ? 6 : 16, 1 - k);
  if (!lowQ) { flash(g, c.x1, c.y1, c.s1 * (0.6 + k * 1.2) * big, rgb, 0.65 * (1 - k)); flash(g, c.x1, c.y1, c.s1 * 0.4 * big, WHITE, 0.6 * (1 - clamp01(k * 3))); }
}
// ดาบ: ผลึกรวมเป็นดาบข้างเป้า เงื้อ → ฟันโค้งผ่านเป้า (จันทร์เสี้ยว 3 ชั้น) · double = ฟันกลับ · tone = สีรอย · runes = อักขระเวท
function swordStrike(g, e, t, lowQ, w, { double = false, tone = CYAN_HI, big = 1, runes = false } = {}) {
  const [dur, hp] = STRIKE[w], hit = dur * hp, c = strikeCtx(e);
  const r = c.s1 * 0.95 * big;
  const a0 = c.a - Math.PI / 2 - 1.9 * c.side, a1 = c.a - Math.PI / 2 + 0.55 * c.side;
  const appear = clamp01(t / (hit * 0.4)), swing = clamp01((t - hit * 0.4) / (hit * 0.6)), after = clamp01((t - hit) / (dur - hit));
  const at = (th) => ({ x: c.x1 + Math.cos(th) * r * 0.55, y: c.y1 + Math.sin(th) * r * 0.55 * c.sq, dir: th });
  if (t < hit) {
    const sw = easeIn2(swing), th = lerp(a0, a1, sw);
    if (appear < 1) shards(g, at(a0).x, at(a0).y, c.s1, 1 - appear, 3, lowQ ? 6 : 14, 0.9 * (1 - appear));
    if (swing > 0) armMoving(g, w, (k) => at(lerp(a0, a1, easeIn2(k))), swing, r * 1.25, lowQ, { a: appear, step: 0.07 });
    else drawArm(g, w, at(th).x, at(th).y, r * 1.25, th, appear, false, lowQ);
    slashArc(g, c.x1, c.y1, r, c.sq, a0, a1, sw, 1, Math.max(1.6, c.s1 * 0.055), tone);
  } else {
    slashArc(g, c.x1, c.y1, r, c.sq, a0, a1, 1, 1 - after, Math.max(1.6, c.s1 * 0.055), tone);
    if (double) {
      const k2 = easeIn2(clamp01((t - hit) / ((dur - hit) * 0.45)));
      const b0 = a1 + 0.5 * c.side, b1 = a0 + 0.9 * c.side;
      slashArc(g, c.x1, c.y1, r * 0.88, c.sq, b0, b1, k2, 1 - after * 0.8, Math.max(1.4, c.s1 * 0.05), tone);
      armMoving(g, w, (k) => at(lerp(b0, b1, easeIn2(k))), k2, r * 1.25, lowQ, { a: 1 - after, step: 0.07, flip: true });
    } else drawArm(g, w, at(a1).x, at(a1).y, r * 1.25, a1, 1 - after, true, lowQ);
    if (!e.dodge) impact(g, c, after, lowQ, tone, big);
    if (runes && !lowQ && !e.dodge) {
      g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${VIOLET},${1 - after})`; g.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const q = (i / 8) * TAU + after * 2.5, rr = c.s1 * (0.55 + after * 0.7);
        const px = c.x1 + Math.cos(q) * rr, py = c.y1 + Math.sin(q) * rr * c.sq;
        g.beginPath(); g.moveTo(px - 3, py); g.lineTo(px, py - 4); g.lineTo(px + 3, py); g.lineTo(px, py + 4); g.closePath(); g.stroke();
      }
      g.restore();
      ring(g, c.tx, c.ty, 0.35 + after * 0.6, 0.4, 1 - after, VIOLET, 1.5);
    }
  }
}
// คาตานะ: ชักดาบฟันเร็ว 3 เส้นไขว้ (ใบดาบวิ่งตามเส้น) → ชะงัก → แสงแตกพร้อมกันตอนเก็บดาบ
function katanaStrike(g, e, t, lowQ) {
  const [dur, hp] = STRIKE.katana, hit = dur * hp, c = strikeCtx(e);
  const L = c.s1 * 1.8;
  [-0.7, 0.55, -0.05].forEach((ang, i) => {
    const at = hit * (0.18 + i * 0.2), k = clamp01((t - at) / 95), fade = 1 - clamp01((t - hit) / (dur - hit));
    if (t < at || fade <= 0) return;
    const th = c.a + ang + Math.PI / 2;
    const dx = Math.cos(th) * L / 2, dy = Math.sin(th) * L / 2 * (0.5 + 0.5 * c.sq);
    const x0 = c.x1 - dx, y0 = c.y1 - dy, xe = lerp(x0, c.x1 + dx, k), ye = lerp(y0, c.y1 + dy, k);
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    g.strokeStyle = `rgba(${CYAN},${0.35 * fade})`; g.lineWidth = 8;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(xe, ye); g.stroke();
    g.strokeStyle = `rgba(${WHITE},${fade})`; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(xe, ye); g.stroke();
    g.restore();
    if (k < 1) drawArm(g, "katana", xe, ye, c.s1 * 1.2, Math.atan2(ye - y0, xe - x0), 1, false, lowQ);
    else if (t < hit) drawArm(g, "katana", xe, ye, c.s1 * 1.2, Math.atan2(ye - y0, xe - x0), 0.5 * (1 - clamp01((t - at - 95) / 120)), true, lowQ);
  });
  // ก่อนชัก: ดาบอยู่ข้างตัว · หลังฟันครบ: เก็บดาบ (ประกายที่ด้าม) → เป้าแตก
  const pre = 1 - clamp01((t - hit * 0.12) / 60);
  drawArm(g, "katana", c.x0 + c.s * 0.35, c.y0 - c.s * 0.05, c.s * 1.1, c.a - 2.2 * c.side, pre, false, lowQ);
  if (t >= hit) {
    const k = clamp01((t - hit) / (dur - hit));
    if (!lowQ) flash(g, c.x0 + c.s * 0.35, c.y0, c.s * 0.4, WHITE, 0.8 * (1 - clamp01(k * 4)));
    if (!e.dodge) impact(g, c, k, lowQ, WHITE, 1.2);
  }
}
// ดาบใหญ่/ขวาน/ค้อน: เงื้อสูงเหนือเป้า (ขวานหมุน) → สับลงแรง (ภาพติดตา) · คลื่นกระแทก/พื้นแตก/ฝุ่น
function heavyStrike(g, e, t, lowQ, w) {
  const [dur, hp] = STRIKE[w], hit = dur * hp, c = strikeCtx(e);
  const L = c.s1 * (w === "tall" ? 2.0 : 1.7);
  const v = c.v, down = v.dir + Math.PI;
  // จุดเงื้อ: มุมปกติ = เหนือเป้า · มองจากบน = ถอยหลังเป้าไปทางน็อคทิส (สับไปข้างหน้า)
  const [ux, uy] = P(c.tx, c.ty, 3.4);
  const bx = c.x1 - Math.cos(c.a) * c.s1 * 1.4, by = c.y1 - Math.sin(c.a) * c.s1 * 1.4;
  const hx = lerp(bx, ux, v.k), hy = lerp(by, uy, v.k);
  const chop = angLerp(c.a, down, v.k), raise = angLerp(c.a + Math.PI, v.dir, v.k);
  const rise = easeOut3(clamp01(t / (hit * 0.55))), fall = clamp01((t - hit * 0.72) / (hit * 0.28));
  if (t < hit) {
    if (fall <= 0) {
      const x = lerp(c.x0, hx, rise), y = lerp(c.y0, hy, rise);
      const spin = w === "axe" && !REDUCED ? rise * TAU * 2 : 0;
      drawArm(g, w, x, y, L, raise - 0.4 * c.side + spin, 1, false, lowQ);
      drawArm(g, w, x, y, L, raise - 0.4 * c.side + spin, 0.25 + 0.3 * rise, true, lowQ);
      if (rise >= 1 && !lowQ) flash(g, x, y, L * 0.5, CYAN, 0.25 + 0.15 * Math.sin(t / 30));
    } else {
      const pos = (k) => { const q = easeIn2(clamp01(k)); return { x: lerp(hx, c.x1, q) - Math.cos(chop) * L * 0.35 * q, y: lerp(hy, c.y1, q) - Math.sin(chop) * L * 0.35 * q, dir: angLerp(raise - 0.4 * c.side, chop, q) }; };
      armMoving(g, w, pos, fall, L, lowQ, { step: 0.09 });
      const p = pos(fall);
      streak(g, hx, hy, p.x, p.y, L * 0.14, 0.85);
    }
  } else {
    const k = clamp01((t - hit) / (dur - hit));
    drawArm(g, w, c.x1 - Math.cos(chop) * L * 0.35, c.y1 - Math.sin(chop) * L * 0.35, L, chop, 1 - k, true, lowQ);
    if (!e.dodge) {
      const big = w === "mace" ? 2.2 : w === "tall" ? 1.8 : 1.4;
      for (let i = 0; i < (w === "mace" ? 3 : 2); i++) ring(g, c.tx, c.ty, 0.3 + k * (big - i * 0.4), 0.02, (1 - k) * (1 - i * 0.3), i ? CYAN : CYAN_HI, 3.5 - i);
      cracks(g, c.gx, c.gy, c.s1 * big, k, w.length);
      dust(g, c.gx, c.gy, c.s1 * big, k, 9, 1 - k);
      impact(g, c, k, lowQ, CYAN_HI, 1.4);
    }
  }
}
// ธนู: ธนูลอยหน้าตัวหันหาเป้า · ลูกศรแสงน้าวถอยหลัง (ชาร์จ) → ปล่อยพุ่ง (ภาพติดตา) → ปักแตก
function bowStrike(g, e, t, lowQ) {
  const [dur, hp] = STRIKE.bow, hit = dur * hp, c = strikeCtx(e);
  const nx = Math.cos(c.a), ny = Math.sin(c.a);
  const bx = c.x0 + nx * c.s * 0.5, by = c.y0 + ny * c.s * 0.5 - c.s * 0.12;
  const L = c.s * 1.3;
  const show = clamp01(t / 160) * (1 - clamp01((t - hit) / (dur - hit)));
  const release = hit * 0.6, draw = easeOut3(clamp01((t - 120) / (release - 120)));
  if (show > 0 && t < 160) shards(g, bx, by, L * 0.6, 1 - t / 160, 2, 10, 0.8);
  drawArm(g, "bow", bx, by, L, c.a, show, false, lowQ);
  drawArm(g, "bow", bx, by, L, c.a, 0.35 * show, true, lowQ);
  const arrowLen = L * 0.62;
  if (t < release) {
    const tail = { x: bx - nx * L * 0.18 * draw, y: by - ny * L * 0.18 * draw };
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    g.strokeStyle = `rgba(${CYAN},${0.4 * show})`; g.lineWidth = 7;
    g.beginPath(); g.moveTo(tail.x, tail.y); g.lineTo(tail.x + nx * arrowLen, tail.y + ny * arrowLen); g.stroke();
    g.strokeStyle = `rgba(${WHITE},${show})`; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(tail.x, tail.y); g.lineTo(tail.x + nx * arrowLen, tail.y + ny * arrowLen); g.stroke();
    g.restore();
    if (!lowQ) flash(g, tail.x + nx * arrowLen, tail.y + ny * arrowLen, c.s * 0.3 * draw, CYAN_HI, 0.7 * draw);
    if (!lowQ && draw > 0.5) shards(g, tail.x + nx * arrowLen, tail.y + ny * arrowLen, c.s * 0.5, 1 - draw, 14, 6, 0.6);
  } else if (t < hit) {
    const k = easeIn2((t - release) / (hit - release));
    const x = lerp(bx + nx * arrowLen, c.x1, k), y = lerp(by + ny * arrowLen, c.y1, k);
    streak(g, bx, by, x, y, c.s * 0.12, 1);
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.strokeStyle = `rgba(${WHITE},1)`; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(x - nx * arrowLen * 0.7, y - ny * arrowLen * 0.7); g.lineTo(x, y); g.stroke(); g.restore();
    if (!lowQ && t - release < 90) flash(g, bx, by, L * 0.6, CYAN_HI, 0.6);
  }
  if (t >= hit && !e.dodge) {
    const k = clamp01((t - hit) / (dur - hit));
    impact(g, c, k, lowQ);
    g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${WHITE},${1 - k})`; g.lineWidth = 2.4; g.lineCap = "round";
    g.beginPath(); g.moveTo(c.x1 - nx * arrowLen * 0.6, c.y1 - ny * arrowLen * 0.6); g.lineTo(c.x1, c.y1); g.stroke(); g.restore();
  }
}
// ดาวกระจาย: ขว้างหมุนโค้งเข้าเป้า (ภาพติดตาวงกลม) → ปะทะ → บินโค้งกลับเข้ามือ
function starStrike(g, e, t, lowQ) {
  const [dur, hp] = STRIKE.star, hit = dur * hp, c = strikeCtx(e);
  const L = c.s * 0.85;
  const out = (k) => { const q = easeIn2(clamp01(k)); const bend = Math.sin(q * Math.PI) * c.s * 0.6 * c.side; return { x: lerp(c.x0, c.x1, q) + Math.sin(c.a) * bend, y: lerp(c.y0, c.y1, q) - Math.cos(c.a) * bend, dir: REDUCED ? 0 : q * 22 }; };
  const back = (k) => { const q = easeInOut(clamp01(k)); const bend = Math.sin(q * Math.PI) * c.s * 0.9 * c.side; return { x: lerp(c.x1, c.x0, q) - Math.sin(c.a) * bend, y: lerp(c.y1, c.y0, q) + Math.cos(c.a) * bend, dir: REDUCED ? 0 : 22 + q * 20 }; };
  if (t < hit) {
    const k = t / hit;
    armMoving(g, "star", out, k, L, lowQ, { step: 0.05, trail: 5 });
    if (!lowQ) { const p = out(k); flash(g, p.x, p.y, L * 0.7, CYAN, 0.35); }
  } else {
    const k = clamp01((t - hit) / (dur - hit - 60));
    if (k < 1) armMoving(g, "star", back, k, L, lowQ, { step: 0.05, trail: 5 });
    if (!e.dodge) impact(g, c, clamp01((t - hit) / 320), lowQ);
    if (k >= 0.95 && !lowQ) flash(g, c.x0, c.y0, c.s * 0.6, CYAN_HI, 0.5);
  }
}
// หอก: ถอยง้าง → แทงพุ่งตรงทะลุเป้า (เส้นแสงยาว + ภาพติดตา) → ดึงกลับ
function tridentStrike(g, e, t, lowQ) {
  const [dur, hp] = STRIKE.trident, hit = dur * hp, c = strikeCtx(e);
  const L = c.s * 1.9, nx = Math.cos(c.a), ny = Math.sin(c.a);
  const reach = Math.hypot(c.x1 - c.x0, c.y1 - c.y0) + c.s * 0.45;
  const alongAt = (tt) => (tt < hit * 0.45 ? -c.s * 0.35 * easeOut3(tt / (hit * 0.45)) : tt < hit ? -c.s * 0.35 + (reach + c.s * 0.35) * easeIn2((tt - hit * 0.45) / (hit * 0.55)) : reach * (1 - easeOut3(clamp01((tt - hit) / (dur - hit))) * 0.75));
  const pos = (tt) => { const al = alongAt(tt); return { x: c.x0 + nx * (al - L * 0.42), y: c.y0 + ny * (al - L * 0.42), dir: c.a }; };
  const fade = 1 - clamp01((t - hit) / (dur - hit)) * 0.85;
  if (t > hit * 0.45 && t < hit + 80 && !lowQ) for (let i = 1; i <= 3; i++) { const p = pos(t - i * 28); drawArm(g, "trident", p.x, p.y, L, c.a, 0.25 - i * 0.06, true, true); }
  const p = pos(t);
  drawArm(g, "trident", p.x, p.y, L, c.a, fade, false, lowQ);
  drawArm(g, "trident", p.x, p.y, L, c.a, 0.3 * fade, true, lowQ);
  if (t > hit * 0.45 && t < hit + 150) streak(g, c.x0, c.y0, p.x + nx * L * 0.42, p.y + ny * L * 0.42, c.s * 0.16, 0.85 * (1 - clamp01((t - hit) / 150)));
  if (t >= hit && !e.dodge) {
    const k = clamp01((t - hit) / (dur - hit));
    impact(g, c, k, lowQ);
    g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${CYAN_HI},${1 - k})`; g.lineWidth = 2; g.lineCap = "round";
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(c.x1, c.y1); g.lineTo(c.x1 + nx * c.s * (0.9 + k * 1.2) - ny * i * c.s * 0.3, c.y1 + ny * c.s * (0.9 + k * 1.2) + nx * i * c.s * 0.3); g.stroke(); }
    g.restore();
  }
}
// โล่: ผลึกรวมเป็นโล่หน้าตัว → พุ่งกระแทกเป้า (ภาพติดตา) · คลื่นกระแทกหลายชั้น · เด้งกลับ
function shieldStrike(g, e, t, lowQ) {
  const [dur, hp] = STRIKE.shield, hit = dur * hp, c = strikeCtx(e);
  const L = c.s * 1.35, nx = Math.cos(c.a), ny = Math.sin(c.a);
  const sx0 = c.x0 + nx * c.s * 0.45, sy0 = c.y0 + ny * c.s * 0.45, sx1 = c.x1 - nx * c.s * 0.4, sy1 = c.y1 - ny * c.s * 0.4;
  const up = angLerp(c.a, c.v.dir, c.v.k);
  const pos = (k) => { const q = easeIn2(clamp01(k)); return { x: lerp(sx0, sx1, q), y: lerp(sy0, sy1, q), dir: up }; };
  if (t < hit * 0.35) {
    const k = t / (hit * 0.35);
    shards(g, sx0, sy0, L * 0.6, 1 - k, 4, 12, 0.8 * (1 - k));
    drawArm(g, "shield", sx0, sy0, L, up, k, false, lowQ);
  } else if (t < hit) {
    armMoving(g, "shield", pos, (t - hit * 0.35) / (hit * 0.65), L, lowQ, { step: 0.08 });
  } else {
    const k = clamp01((t - hit) / (dur - hit));
    const bx = lerp(sx1, sx1 - nx * c.s * 0.4, easeOut3(k)), by = lerp(sy1, sy1 - ny * c.s * 0.4, easeOut3(k));
    drawArm(g, "shield", bx, by, L, up, 1 - k, false, lowQ);
    if (!e.dodge) {
      for (let i = 0; i < 3; i++) ring(g, c.tx, c.ty, 0.3 + k * (0.9 + i * 0.4), 0.45, (1 - k) * (1 - i * 0.25), i ? CYAN : CYAN_HI, 3 - i * 0.6);
      impact(g, c, k, lowQ, CYAN_HI, 1.2);
    }
  }
}
// คทา: ยกคทาเรืองทอง · วงเวทหมุนใต้เป้า → เสาแสงศักดิ์สิทธิ์ (มองจากบน = วงแสงแผ่) + ประกายทองลอยขึ้น
function scepterStrike(g, e, t, lowQ) {
  const [dur, hp] = STRIKE.scepter, hit = dur * hp, c = strikeCtx(e);
  const charge = clamp01(t / hit), after = clamp01((t - hit) / (dur - hit));
  const hx = c.x0 + c.s * 0.45, hy = c.y0 - c.s * 0.35;
  const up = angLerp(-Math.PI / 2, c.v.dir, c.v.k);
  drawArm(g, "scepter", hx, hy, c.s * 1.3, up, 1 - after, false, lowQ);
  if (!lowQ) flash(g, hx + Math.cos(up) * c.s * 0.55, hy + Math.sin(up) * c.s * 0.55, c.s * 0.6 * charge, GOLD, 0.7 * charge * (1 - after));
  // วงเวท 2 ชั้นหมุนสวน + เส้นดาว
  const R = 0.62 * easeOut3(charge), la = t < hit ? 0.85 : 1 - after;
  ring(g, c.tx, c.ty, R, 0.02, la, GOLD, 2);
  ring(g, c.tx, c.ty, R * 0.72, 0.02, la * 0.8, WHITE, 1.2);
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${GOLD},${0.7 * la})`; g.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) {
      const q = (i / 6) * TAU + t / 450;
      const [ax, ay] = P(c.tx + Math.cos(q) * R, c.ty + Math.sin(q) * R, 0.02);
      const [bx, by] = P(c.tx + Math.cos(q + 2.1) * R, c.ty + Math.sin(q + 2.1) * R, 0.02);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }
    g.restore();
  }
  if (t >= hit * 0.85) {
    const k = clamp01((t - hit * 0.85) / (dur - hit * 0.85)), a = Math.sin(Math.min(1, k * 1.3) * Math.PI);
    const [px, py] = P(c.tx, c.ty, 6);
    g.save(); g.globalCompositeOperation = "lighter";
    if (c.v.k > 0.2) {
      const gr = g.createLinearGradient(px, py, c.gx, c.gy);
      gr.addColorStop(0, `rgba(${GOLD},0)`); gr.addColorStop(0.5, `rgba(${GOLD},${0.55 * a * c.v.k})`); gr.addColorStop(1, `rgba(${WHITE},${0.95 * a * c.v.k})`);
      g.fillStyle = gr; g.fillRect(c.gx - c.s1 * 0.38, Math.min(py, c.gy), c.s1 * 0.76, Math.abs(c.gy - py));
    }
    glow(g, c.gx, c.gy, c.s1 * (1 + 1.8 * (1 - c.v.k)) * (0.6 + k), GOLD, 0.6 * a);
    glow(g, c.gx, c.gy, c.s1 * 0.6, WHITE, 0.7 * a);
    g.restore();
    if (!lowQ) for (let i = 0; i < 10; i++) {
      const ph = clamp01(k * 1.4 - hash01(i) * 0.3), th = hash01(i * 7) * TAU;
      const [qx, qy] = P(c.tx + Math.cos(th) * 0.4, c.ty + Math.sin(th) * 0.4, 0.2 + ph * 2.5);
      g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(${GOLD},${0.8 * (1 - ph)})`;
      g.beginPath(); g.arc(qx, qy, 1.6, 0, TAU); g.fill(); g.restore();
    }
    if (!e.dodge) impact(g, c, after, lowQ, GOLD);
  }
}
// ปลดปล่อย: ดาบในวง 3 เล่ม (สุ่มตาม t0) หมุนเล็งแล้วพุ่งเข้าเป้าทีละเล่ม · เล่มสุดท้าย = จังหวะปะทะ
function armigerStrike(g, e, t, lowQ) {
  const [dur, hp] = ARMIGER, hit = dur * hp, c = strikeCtx(e);
  const [cx, cy] = cOf(e), n = Math.max(1, e.size | 0);
  const seed = Math.floor(e.t0 || 0);
  const pool = ROYAL.slice();
  const picks = [0, 1, 2].map((i) => pool.splice(Math.floor(hash01(seed + i * 31) * pool.length), 1)[0]);
  const gap = 150, aim = hit - 2 * gap - RUIN_FLY;
  const shots = picks.map((key, i) => {
    const slot = armigerSlot(cx, cy, n, ROYAL.indexOf(key), ROYAL.length, e.t0 || 0);
    const off = (i - 1) * 0.22;
    return { key, from: { x: slot.x, y: slot.y, s: slot.s, dir: slot.dir }, to: { x: c.x1 + Math.cos(c.a + Math.PI / 2) * c.s1 * off, y: c.y1 + Math.sin(c.a + Math.PI / 2) * c.s1 * off, s: c.s1 }, at: aim + i * gap };
  });
  volley(g, shots, t, aim, lowQ);
  if (t > hit && !e.dodge) {
    const k = clamp01((t - hit) / (dur - hit));
    impact(g, c, k, lowQ, VIOLET, 1.4);
    ring(g, c.tx, c.ty, 0.3 + k * 1.4, 0.02, 1 - k, VIOLET, 3);
  }
}
function strikeFx(g, e, t, lowQ) {
  const w = e.kind.slice(5);
  switch (w) {
    case "armiger": armigerStrike(g, e, t, lowQ); break;
    case "katana": katanaStrike(g, e, t, lowQ); break;
    case "tall": case "axe": case "mace": heavyStrike(g, e, t, lowQ, w); break;
    case "bow": bowStrike(g, e, t, lowQ); break;
    case "star": starStrike(g, e, t, lowQ); break;
    case "trident": tridentStrike(g, e, t, lowQ); break;
    case "shield": shieldStrike(g, e, t, lowQ); break;
    case "scepter": scepterStrike(g, e, t, lowQ); break;
    case "wanderer": swordStrike(g, e, t, lowQ, w, { double: true }); break;
    case "engine": swordStrike(g, e, t, lowQ, w, { double: true, big: 1.15 }); break;
    case "father": swordStrike(g, e, t, lowQ, w, { tone: GOLD }); break;
    case "mystic": swordStrike(g, e, t, lowQ, w, { tone: VIOLET, runes: true }); break;
    default: swordStrike(g, e, t, lowQ, STRIKE[w] ? w : "wise"); break;
  }
}
export function noctFx(g, e, now, lowQ) {
  const t = now - e.t0;
  const dur = NOCT_FX_DUR[e.kind] || 1000;
  if (t < 0 || t > dur) return;
  if (e.kind.startsWith("noct_")) { strikeFx(g, e, t, lowQ); return; }
  switch (e.kind) {
    case "noctArm": armFx(g, e, t, lowQ); break;
    case "noctHeed": heedFx(g, e, t, lowQ); break;
    case "noctThrow": throwFx(g, e, t, lowQ); break;
    case "noctWarp": warpFx(g, e, t, lowQ, false); break;
    case "noctPoint": warpFx(g, e, t, lowQ, true); break;
    case "noctRuin": ruinFx(g, e, t, lowQ); break;
    case "noctRuinEos": ruinEosFx(g, e, t, lowQ); break;
    case "noctEnd": endFx(g, e, t, lowQ); break;
    default: break;
  }
}
export const NOCT_KINDS = Object.keys(NOCT_FX_DUR);
export function preloadNoct() { for (const k of Object.keys(NOCT_ARMS)) armImg(k); }

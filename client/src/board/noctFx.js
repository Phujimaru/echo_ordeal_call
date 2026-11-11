// ============================================================
//  เอฟเฟกต์บนกระดานของน็อคทิส ลูซิส เคลัม (characters/noctis.js · GRID_PLAN §7.31)
//  ใช้ภาพอาวุธของผู้ใช้ (/characters/noctis/arms/*.webp) — อาวุธราชวงศ์เป็นวิญญาณผลึกสีฟ้า-คราม แตกเป็นเศษผลึกตอนวาร์ป
//
//  เหตุการณ์ (socket "noctFx" → NOCT_EVENT_FX):
//   arm      เรียกอาวุธ: เศษผลึกรวมตัวเป็นอาวุธเหนือหัวแล้วลงข้างตัว
//   heed     ขานรับ เหล่าราชา: เสาแสงราชันย์ + อาวุธวิญญาณ 13 ชิ้นวาบเป็นวง
//   throw    Warp Strike: อาวุธหมุนพุ่งไปหาเป้าพร้อมหางผลึก
//   warp     วาร์ปตามอาวุธ: ร่างแตกเป็นผลึก → เส้นแสงพุ่ง → ประกอบร่างที่ปลาย
//   point    Warp Point: วาร์ปไปเกาะสิ่งกีดขวาง (ผลึกวาบ)
//   ruin     ทำลายให้สิ้น: อาวุธ 13 ชิ้นพุ่งเป็นพัดไปตามแนว · ruinEos = อาวุธพุ่งลงเป้าแต่ละตัวแล้วระเบิด
//   end      ให้มันจบตรงนี้แหละ: ดาบวิญญาณยักษ์ปักลงเป้า + คลื่นแสง
//  ท่าตีปกติ (attackStyle noct_<อาวุธ>): อาวุธที่ถือพุ่ง/ฟันเข้าเป้า แล้วแตกเป็นผลึก
//  ของค้าง (players[].noct → prop noctis): drawNoctAir = อาวุธที่ถือลอยข้างตัว · ขานรับ = เรืองทอง · ปลดปล่อย = Armiger 13 ชิ้นหมุนรอบตัว · หลบจาก Warp Point = ผลึกระยิบ
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

// ---------- จังหวะ (ms) ----------
const STRIKE_MS = 820, STRIKE_HIT = 0.55;
const ARMIGER_MS = 1250, ARMIGER_HIT = 0.74; // ปลดปล่อย: ดึงอาวุธที่ลอยรอบตัวมาฟันต่อกัน 3 ชิ้น (สุ่ม — ภาพเท่านั้น · ผู้ใช้ 2026-11-11)
export const NOCT_MS = { ...Object.fromEntries(Object.keys(NOCT_ARMS).map((k) => [`noct_${k}`, STRIKE_MS])), noct_armiger: ARMIGER_MS };
export const NOCT_HIT_P = { ...Object.fromEntries(Object.keys(NOCT_ARMS).map((k) => [`noct_${k}`, STRIKE_HIT])), noct_armiger: ARMIGER_HIT };
export const NOCT_FX_DUR = {
  ...NOCT_MS,
  noctArm: 950, noctHeed: 1500, noctThrow: 620, noctWarp: 700, noctPoint: 800, noctRuin: 1500, noctRuinEos: 1700, noctEnd: 1700,
};
export const isNoctFx = (kind) => typeof kind === "string" && (kind in NOCT_FX_DUR);
export const NOCT_EVENT_FX = {
  arm: "noctArm", heed: "noctHeed", throw: "noctThrow", warp: "noctWarp", point: "noctPoint", ruin: "noctRuin", ruinEos: "noctRuinEos", end: "noctEnd",
};

// ---------- สี ----------
const CYAN = "120,210,255", CYAN_HI = "220,246,255", INDIGO = "90,110,255", VIOLET = "170,120,255", GOLD = "255,214,120", WHITE = "255,255,255";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ctr = (x, y, n = 1) => [x + n / 2, y + n / 2];

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
// ฉบับวิญญาณ: เติมสีฟ้าทับเฉพาะเนื้ออาวุธ (source-atop) — แคชไว้ครั้งเดียว
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
// วาดอาวุธตั้งตรงในกรอบสูง L (ภาพต้นฉบับวางเฉียง — หมุนให้ด้ามลง/ปลายขึ้น) · ang = มุมของปลายอาวุธ (0 = ขึ้น)
function drawArm(g, key, x, y, L, ang, a, ghost = false, lowQ = false) {
  const e = armImg(key);
  if (!e || a <= 0.01) return;
  const src = ghost ? ghostOf(e) || e.im : e.im;
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  const s = L / Math.max(w, h);
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.globalAlpha = Math.min(1, a);
  if (ghost && !lowQ) { g.globalCompositeOperation = "lighter"; glow(g, 0, 0, L * 0.55, CYAN, 0.25 * a); }
  g.drawImage(src, -w * s / 2, -h * s / 2, w * s, h * s);
  g.restore();
}
// เศษผลึก (สี่เหลี่ยมขนมเปียกปูนเล็กๆ)
function shards(g, x, y, r, k, seed, n, a, rgb = CYAN_HI) {
  if (a <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter";
  g.fillStyle = `rgba(${rgb},${a})`;
  for (let i = 0; i < n; i++) {
    const th = hash01(seed * 13 + i) * TAU, d = r * (0.2 + k * (0.6 + hash01(seed + i * 7))), s = r * 0.06 * (1 - k * 0.6) + 0.6;
    const px = x + Math.cos(th) * d, py = y + Math.sin(th) * d * 0.7 - k * r * 0.3;
    g.beginPath(); g.moveTo(px, py - s * 1.6); g.lineTo(px + s, py); g.lineTo(px, py + s * 1.6); g.lineTo(px - s, py); g.closePath(); g.fill();
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
  g.lineWidth = w * 0.35; g.strokeStyle = `rgba(${WHITE},${0.7 * a})`;
  g.beginPath(); g.moveTo(lerp(x0, x1, 0.5), lerp(y0, y1, 0.5)); g.lineTo(x1, y1); g.stroke();
  g.restore();
}

// ---------- ของค้างบนตัว ----------
export function drawNoctAir(g, list, units, fx, now, lowQ) {
  for (const c of list || []) {
    const u = units.find((it) => it.id === c.id && !it.corpse);
    if (!u) continue;
    const n = Math.max(1, u.size | 0);
    const [cx, cy] = ctr(u.rx + (u.ox || 0), u.ry + (u.oy || 0), n);
    const [sx, sy, sc] = P(cx, cy, 1.0);
    const bob = REDUCED ? 0 : Math.sin(now / 480) * sc * 0.05;
    // ปลดปล่อยพลังที่แท้จริง: Armiger — อาวุธวิญญาณ 13 ชิ้นหมุนรอบตัว + ออร่าม่วงคราม
    if (c.unleash) {
      g.save(); g.globalCompositeOperation = "lighter";
      const br = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 600);
      if (!lowQ) glow(g, sx, sy, sc * 1.5 * n, VIOLET, 0.16 + 0.08 * br);
      gEllipse(g, cx, cy, 0.85 * n, 0.02, 48); g.strokeStyle = `rgba(${CYAN},${0.4 + 0.25 * br})`; g.lineWidth = 1.8; g.stroke();
      g.restore();
      const rot = REDUCED ? 0 : now / 2600;
      const m = lowQ ? 7 : ROYAL.length;
      for (let i = 0; i < m; i++) {
        const th = rot + (i / m) * TAU;
        const [wx, wy, ws] = P(cx + Math.cos(th) * 0.95 * n, cy + Math.sin(th) * 0.95 * n, 1.1 + 0.15 * Math.sin(th * 2 + now / 700));
        drawArm(g, ROYAL[i], wx, wy, ws * 0.75, 0.15 * Math.sin(th), 0.85, true, lowQ);
      }
      continue;
    }
    // อาวุธที่ถืออยู่ลอยข้างตัว (ขวาบน)
    const [wx, wy, ws] = P(cx + 0.55 * n, cy - 0.1, 1.15);
    if (c.heed && !lowQ) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, wx, wy, ws * 0.8, GOLD, 0.35 + (REDUCED ? 0 : 0.15 * Math.sin(now / 260))); g.restore(); }
    drawArm(g, c.weapon || "engine", wx, wy + bob, ws * (c.weapon === "engine" ? 0.85 : 0.7), 0.35, 0.95, false, lowQ);
    if (c.heed) drawArm(g, c.weapon || "engine", wx, wy + bob, ws * (c.weapon === "engine" ? 0.85 : 0.7), 0.35, 0.35, true, lowQ);
    // หลบได้ (Warp Point): ผลึกระยิบรอบตัว
    if (c.dodge && !lowQ) shards(g, sx, sy, sc * 0.9, 0.3 + 0.2 * Math.sin(now / 300), Math.floor(now / 400), 6, 0.55);
  }
}

// ---------- เหตุการณ์ครั้งเดียว ----------
const cOf = (e) => { const n = Math.max(1, e.size | 0); return ctr(e.x, e.y, n); };
function armFx(g, e, t, lowQ) {
  const dur = NOCT_FX_DUR.noctArm, k = clamp01(t / dur);
  const [cx, cy] = cOf(e), [hx, hy, hs] = P(cx, cy, 1.9), [wx, wy, ws] = P(cx + 0.55, cy - 0.1, 1.15);
  const gather = clamp01(k / 0.45), drop = clamp01((k - 0.45) / 0.4), fade = 1 - clamp01((k - 0.8) / 0.2);
  shards(g, hx, hy, hs * (1.4 - gather), 1 - gather, 7, lowQ ? 8 : 18, 0.9 * (1 - drop));
  const x = lerp(hx, wx, easeOut3(drop)), y = lerp(hy, wy, easeOut3(drop));
  drawArm(g, e.weapon, x, y, lerp(hs, ws, drop) * 0.8, 0.35 * drop, gather, true, lowQ);
  if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, x, y, hs * 0.9, CYAN, 0.5 * gather * fade); g.restore(); }
}
function heedFx(g, e, t, lowQ) {
  const dur = NOCT_FX_DUR.noctHeed, k = clamp01(t / dur);
  const [cx, cy] = cOf(e), [sx, sy, sc] = P(cx, cy, 0.05), [, ty] = P(cx, cy, 6);
  const a = Math.sin(k * Math.PI);
  g.save(); g.globalCompositeOperation = "lighter";
  const gr = g.createLinearGradient(0, ty, 0, sy);
  gr.addColorStop(0, `rgba(${CYAN},0)`); gr.addColorStop(0.6, `rgba(${CYAN},${0.35 * a})`); gr.addColorStop(1, `rgba(${CYAN_HI},${0.7 * a})`);
  g.fillStyle = gr; g.fillRect(sx - sc * 0.45, ty, sc * 0.9, sy - ty);
  if (!lowQ) glow(g, sx, sy, sc * 1.6, GOLD, 0.35 * a);
  g.restore();
  const m = lowQ ? 7 : ROYAL.length;
  for (let i = 0; i < m; i++) {
    const th = (i / m) * TAU + k * 1.2;
    const r = 1.2 * easeOut3(clamp01(k / 0.4));
    const [wx, wy, ws] = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, 1.3);
    drawArm(g, ROYAL[i], wx, wy, ws * 0.7, 0, a, true, lowQ);
  }
}
function throwFx(g, e, t, lowQ) {
  const [cx, cy] = cOf(e), to = e.to || { x: e.x, y: e.y };
  const [x0, y0, s0] = P(cx, cy, 1.0), [x1, y1] = P(to.x + 0.5, to.y + 0.5, 0.7);
  const fly = 380, k = clamp01(t / fly);
  if (t < fly) {
    const x = lerp(x0, x1, easeIn2(k)), y = lerp(y0, y1, easeIn2(k));
    streak(g, lerp(x0, x1, Math.max(0, easeIn2(k) - 0.35)), lerp(y0, y1, Math.max(0, easeIn2(k) - 0.35)), x, y, s0 * 0.14, 0.9);
    drawArm(g, e.weapon, x, y, s0 * 0.8, REDUCED ? 0 : t / 40, 1, false, lowQ);
    drawArm(g, e.weapon, x, y, s0 * 0.8, REDUCED ? 0 : t / 40, 0.4, true, lowQ);
  } else {
    const kk = clamp01((t - fly) / (NOCT_FX_DUR.noctThrow - fly));
    shards(g, x1, y1, s0 * 0.9, kk, 31, lowQ ? 8 : 16, 1 - kk);
    if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, x1, y1, s0 * (0.6 + kk), CYAN_HI, 0.7 * (1 - kk)); g.restore(); }
  }
}
function warpFx(g, e, t, lowQ, point) {
  const dur = NOCT_FX_DUR[point ? "noctPoint" : "noctWarp"], k = clamp01(t / dur);
  const from = e.from || { x: e.x, y: e.y }, to = e.to || from;
  const [x0, y0, s0] = P(from.x + 0.5, from.y + 0.5, 0.9), [x1, y1] = P(to.x + 0.5, to.y + 0.5, 0.9);
  // ต้นทาง: ร่างแตกเป็นผลึก
  shards(g, x0, y0, s0 * 0.9, clamp01(k / 0.5), 3, lowQ ? 8 : 20, 1 - clamp01(k / 0.6), point ? VIOLET : CYAN_HI);
  // เส้นแสงพุ่ง
  const go = clamp01((k - 0.1) / 0.35);
  if (go > 0 && k < 0.8) streak(g, x0, y0, lerp(x0, x1, easeOut3(go)), lerp(y0, y1, easeOut3(go)), s0 * (point ? 0.12 : 0.18), 1 - clamp01((k - 0.5) / 0.3), point ? VIOLET : CYAN);
  // ปลายทาง: ประกอบร่าง
  const land = clamp01((k - 0.4) / 0.6);
  if (land > 0) {
    shards(g, x1, y1, s0 * (1.1 - land * 0.6), 1 - land, 9, lowQ ? 8 : 18, 0.9 * (1 - land), point ? VIOLET : CYAN_HI);
    if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, x1, y1, s0 * (0.8 + 0.6 * land), point ? VIOLET : CYAN, 0.6 * (1 - land)); g.restore(); }
    g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(${point ? VIOLET : CYAN_HI},${0.8 * (1 - land)})`; g.lineWidth = 2;
    gEllipse(g, to.x + 0.5, to.y + 0.5, 0.3 + land * 0.6, 0.02); g.stroke();
    g.restore();
  }
}
function ruinFx(g, e, t, lowQ) {
  const dur = NOCT_FX_DUR.noctRuin, k = clamp01(t / dur);
  const [cx, cy] = cOf(e), d = DIRS[e.dir] || [1, 0];
  const tiles = Array.isArray(e.tiles) ? e.tiles : [];
  const far = tiles.length ? Math.max(...tiles.map((c) => Math.abs(c.x - e.x) + Math.abs(c.y - e.y))) : 6;
  const m = lowQ ? 7 : ROYAL.length;
  for (let i = 0; i < m; i++) {
    const at = (i / m) * 0.35, kk = clamp01((k - at) / 0.45);
    if (kk <= 0 || kk >= 1) continue;
    const side = ((i % 3) - 1) * 1.0 + (hash01(i) - 0.5) * 0.4;
    const dist = 0.6 + easeIn2(kk) * (far + 0.5);
    const px = cx + d[0] * dist + (d[1] !== 0 ? side : 0), py = cy + d[1] * dist + (d[0] !== 0 ? side : 0);
    const [x, y, s] = P(px, py, 0.9 + 0.4 * (1 - kk));
    const [bx, by] = P(px - d[0] * 0.9, py - d[1] * 0.9, 0.9 + 0.4 * (1 - kk));
    streak(g, bx, by, x, y, s * 0.12, 0.85 * (1 - kk));
    drawArm(g, ROYAL[i], x, y, s * 0.8, Math.atan2(y - by, x - bx) + Math.PI / 2, 1 - kk * 0.5, true, lowQ);
  }
  // ผืนแนวสว่างตอนอาวุธผ่าน
  if (tiles.length && !lowQ) {
    const a = Math.sin(clamp01((k - 0.2) / 0.6) * Math.PI) * 0.35;
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(${CYAN},${a})`;
    for (const c of tiles) { gEllipse(g, c.x + 0.5, c.y + 0.5, 0.42, 0.02, 16); g.fill(); }
    g.restore();
  }
}
function ruinEosFx(g, e, t, lowQ) {
  const spots = Array.isArray(e.spots) ? e.spots : [];
  const dur = NOCT_FX_DUR.noctRuinEos;
  spots.forEach((c, j) => {
    const [tx, ty, ts] = P(c.x + 0.5, c.y + 0.5, 0.5);
    const per = lowQ ? 3 : Math.max(2, Math.round(13 / Math.max(1, spots.length)));
    for (let i = 0; i < per; i++) {
      const at = ((j * per + i) / (spots.length * per)) * 600, kk = clamp01((t - at) / 320);
      if (kk <= 0) continue;
      if (kk < 1) {
        const [sx, sy] = P(c.x + 0.5 + (hash01(i + j * 5) - 0.5) * 1.5, c.y + 0.5 - 1.2, 4);
        const x = lerp(sx, tx, easeIn2(kk)), y = lerp(sy, ty, easeIn2(kk));
        streak(g, sx, sy, x, y, ts * 0.1, 0.8);
        drawArm(g, ROYAL[(i + j * 3) % ROYAL.length], x, y, ts * 0.9, Math.atan2(ty - sy, tx - sx) + Math.PI / 2, 1, true, lowQ);
      }
    }
    const boom = clamp01((t - 700) / (dur - 700));
    if (boom > 0) {
      shards(g, tx, ty, ts * 1.6, boom, j + 50, lowQ ? 8 : 18, 1 - boom);
      if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, tx, ty, ts * (1 + 2 * boom), CYAN, 0.7 * (1 - boom)); g.restore(); }
    }
  });
}
function endFx(g, e, t, lowQ) {
  const dur = NOCT_FX_DUR.noctEnd, to = e.to || { x: e.x, y: e.y };
  const [tx, ty, ts] = P(to.x + 0.5, to.y + 0.5, 0.6);
  const fall = clamp01(t / 520), after = clamp01((t - 520) / (dur - 520));
  const [sx, sy] = P(to.x + 0.5, to.y + 0.5, 7);
  if (fall < 1) {
    const y = lerp(sy, ty - ts * 1.1, easeIn2(fall));
    streak(g, tx, sy, tx, y, ts * 0.25, 0.9, VIOLET);
    drawArm(g, "engine", tx, y, ts * 3, Math.PI, 1, true, lowQ);
  } else {
    drawArm(g, "engine", tx, ty - ts * 1.1, ts * 3, Math.PI, 1 - after, true, lowQ);
    shards(g, tx, ty, ts * 2.4, after, 77, lowQ ? 10 : 26, 1 - after);
    g.save(); g.globalCompositeOperation = "lighter";
    if (!lowQ) glow(g, tx, ty, ts * (1.5 + 3 * after), VIOLET, 0.75 * (1 - after));
    g.strokeStyle = `rgba(${CYAN_HI},${1 - after})`; g.lineWidth = 3;
    gEllipse(g, to.x + 0.5, to.y + 0.5, 0.4 + after * 2.2, 0.02); g.stroke();
    g.restore();
  }
}
// ท่าตีปกติ: อาวุธที่ถือพุ่งจากตัวเข้าเป้า (หมุนสำหรับดาวกระจาย/ขวาน) · ปะทะ = ผลึกแตก
function strikeFx(g, e, t, lowQ) {
  const w = e.kind.slice(5);
  const dur = STRIKE_MS, hit = dur * STRIKE_HIT;
  const [cx, cy] = cOf(e), to = e.to || { x: e.x, y: e.y }, tn = Math.max(1, e.toSize | 0);
  const [x0, y0, s0] = P(cx + 0.3, cy - 0.1, 1.1), [x1, y1] = P(to.x + tn / 2, to.y + tn / 2, 0.7);
  const spin = w === "star" || w === "axe" || w === "mace";
  if (t < hit) {
    const k = easeIn2(t / hit);
    const x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * s0 * 0.4;
    const ang = spin && !REDUCED ? t / 35 : Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2 + (1 - k) * -1.2;
    streak(g, lerp(x0, x1, Math.max(0, k - 0.3)), lerp(y0, y1, Math.max(0, k - 0.3)), x, y, s0 * 0.1, 0.7 * k);
    drawArm(g, w, x, y, s0 * 0.85, ang, 1, false, lowQ);
    drawArm(g, w, x, y, s0 * 0.85, ang, 0.35, true, lowQ);
  } else {
    const k = clamp01((t - hit) / (dur - hit));
    if (!e.dodge) {
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      g.strokeStyle = `rgba(${CYAN_HI},${1 - k})`; g.lineWidth = s0 * 0.08 * (1 - k) + 1;
      g.beginPath(); g.arc(x1, y1, s0 * (0.35 + k * 0.5), -2.4, -0.2); g.stroke();
      if (!lowQ) glow(g, x1, y1, s0 * (0.5 + k), CYAN, 0.6 * (1 - k));
      g.restore();
    }
    drawArm(g, w, x1, y1, s0 * 0.85, 0.3, 0.6 * (1 - k), true, lowQ);
    shards(g, x1, y1, s0, k, 11, lowQ ? 6 : 14, 1 - k);
  }
}
// ปลดปล่อย: อาวุธ 3 ชิ้นจากวง Armiger (สุ่มตาม t0) พุ่งออกจากวงรอบตัวเข้าเป้าทีละชิ้น · ชิ้นสุดท้าย = จังหวะปะทะ
function armigerFx(g, e, t, lowQ) {
  const dur = ARMIGER_MS, hit = dur * ARMIGER_HIT, gap = hit / 3.2;
  const [cx, cy] = cOf(e), to = e.to || { x: e.x, y: e.y }, tn = Math.max(1, e.toSize | 0);
  const [x1, y1, s1] = P(to.x + tn / 2, to.y + tn / 2, 0.7);
  const seed = Math.floor(e.t0 || 0);
  const pool = ROYAL.slice();
  const picks = [0, 1, 2].map((i) => pool.splice(Math.floor(hash01(seed + i * 31) * pool.length), 1)[0]);
  picks.forEach((w, i) => {
    const start = i * gap, fly = gap * 1.2, k = (t - start) / fly;
    if (k < 0) return;
    const th = hash01(seed + i * 7) * TAU;
    const [x0, y0, s0] = P(cx + Math.cos(th) * 0.95, cy + Math.sin(th) * 0.95, 1.2);
    if (k < 1) {
      const kk = easeIn2(k);
      const x = lerp(x0, x1, kk), y = lerp(y0, y1, kk) - Math.sin(kk * Math.PI) * s0 * 0.5;
      streak(g, lerp(x0, x1, Math.max(0, kk - 0.35)), lerp(y0, y1, Math.max(0, kk - 0.35)), x, y, s0 * 0.11, 0.85, i === 2 ? VIOLET : CYAN);
      drawArm(g, w, x, y, s0 * 0.85, Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2 + (1 - kk) * 1.5 * (i % 2 ? -1 : 1), 1, true, lowQ);
    } else {
      const a = 1 - clamp01((k - 1) * 2.5);
      if (a <= 0) return;
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      g.strokeStyle = `rgba(${CYAN_HI},${a})`; g.lineWidth = s1 * 0.09 * a + 1;
      const rot = i * 1.1;
      g.beginPath(); g.arc(x1, y1, s1 * (0.5 + (1 - a) * 0.5), -2.6 + rot, -0.4 + rot); g.stroke();
      g.restore();
      shards(g, x1, y1, s1 * 1.2, 1 - a, seed + i, lowQ ? 5 : 10, a);
    }
  });
  if (t > hit && !lowQ && !e.dodge) { const k = clamp01((t - hit) / (dur - hit)); g.save(); g.globalCompositeOperation = "lighter"; glow(g, x1, y1, s1 * (1 + 2 * k), VIOLET, 0.7 * (1 - k)); g.restore(); }
}
export function noctFx(g, e, now, lowQ) {
  const t = now - e.t0;
  const dur = NOCT_FX_DUR[e.kind] || 1000;
  if (t < 0 || t > dur) return;
  if (e.kind === "noct_armiger") { armigerFx(g, e, t, lowQ); return; }
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
// โหลดภาพล่วงหน้า (เรียกตอนมีน็อคทิสในเกม)
export function preloadNoct() { for (const k of Object.keys(NOCT_ARMS)) armImg(k); }

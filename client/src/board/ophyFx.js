// ============================================================
//  เอฟเฟกต์บนกระดานของ Ophy นักเล่นแร่แปรธาตุ (characters/ophy.js · GRID_PLAN §7.43)
//  เหตุการณ์ socket "ophyFx" (server → ophyEventFx → fx):
//   throw  { id, from, to, potion, rgb, tiles, counter? } → ขวดยา (ภาพขวดของเพื่อนผู้ใช้) หมุนลอยโค้งจากปลายปืน ทิ้งหางประกายสีน้ำยา
//                                                          + วงเป้า 3×3 กะพริบรอ · สวนกลับ (Lock in) = ลอยเร็ว/สูงน้อย + แฟลชแม่กุญแจที่ผู้ยิง
//   splash { at, potion, rgb, tiles, hits }               → แก้วแตก (เศษแก้วหมุนกระเด็น) + โดมน้ำยาระเบิด + หยดกระเซ็นตกพื้น + คลื่นวงแหวน
//                                                          + ไฟอาบทั้ง 3×3 + ไอน้ำยาลอยขึ้น + ลายเฉพาะขวด (น้ำแข็ง/สายฟ้า/พิษ/ไฟ/ใจ/ไขว้/โล่/ผี/วังวน/ขนนก)
//   boom   { at, tiles }                                  → หม้อยาระเบิด: แฟลช · ลูกไฟ · ควันหลากสี · ฟองยาพุ่ง · เศษหม้อ · คลื่นกระแทก 3×3
//   drink  { id, at, potion, rgb }                        → ขวดลอยเหนือหัว เอียงดื่ม → วงเวทสีน้ำยาวนรอบตัว + ฟองลอย
//   warp   { id, from, to }                               → วังวนม่วงดูดหายที่ต้นทาง → เสาแสง + วังวนคลายตัวที่ปลายทาง
//   drop   { from, drops:[{ id, x, y, k }] }              → วัตถุดิบเด้งออกจากจุดปฏิกิริยาเป็นเส้นโค้งลงช่องที่ตก
//   pick   { id, drops }                                  → ประกายดูดเข้าหาตัว
//  ของค้างบนกระดาน (ophyGroundItems — ทุกคนเห็น): วัตถุดิบที่ตก (ลอยหมุน + วงแสง + จุดเทิร์นที่เหลือ) · ช่องพลังงานธาตุ (วงเวทหมุน + ผลึกลอย)
//  บนตัว (ophyUnitFront): ยา 4 ขวดถัดไปลอยเหนือหัว (ขวดแรกใหญ่ เรืองแสง) · Lock in (ขวดโคจร + แม่กุญแจ) · calculated (ตัวเลขโคจร)
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const TAU = Math.PI * 2;
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const DIR = "/characters/ophy";
const POT_N = { base: 1, frost: 2, bolt: 3, venom: 4, flame: 5, heal: 6, noheal: 7, ward: 8, invis: 9, warp: 10, morph: 11 };
const POT_RGB = { base: "58,120,230", frost: "60,205,225", bolt: "235,210,60", venom: "200,40,200", flame: "245,135,30", heal: "40,215,90", noheal: "60,55,80", ward: "150,190,120", invis: "220,228,240", warp: "130,100,230", morph: "220,40,40" };
const MAT_ICON = { herb: "🌿", orb: "🔮", crystal: "💎", pulse: "🧬", water: "💧", spirit: "👻" };
const MAT_RGB = { herb: "110,210,90", orb: "190,110,255", crystal: "120,210,255", pulse: "255,120,200", water: "90,170,255", spirit: "220,220,255" };
const WHITE = "255,255,255";

// จังหวะ (ms) — server รอ THROW_BEAT 0.85 วิ ก่อนลงผล
export const OPHY_T = { fly: 760, counterFly: 520 };
export const OPHY_FX_DUR = { ophyThrow: 820, ophySplash: 1700, ophyBoom: 1900, ophyDrink: 1500, ophyWarp: 1300, ophyDrop: 900, ophyPick: 700 };
export const isOphyFx = (k) => typeof k === "string" && k.startsWith("ophy") && k in OPHY_FX_DUR;

const imgs = {};
function img(url) {
  if (!url) return null;
  if (!imgs[url] && typeof Image === "function") { const im = new Image(); im.decoding = "async"; im.src = url; imgs[url] = im; }
  const im = imgs[url];
  return im && im.complete && im.naturalWidth > 0 ? im : null;
}
const potImg = (k) => img(`${DIR}/potions/p${POT_N[k] || 1}.webp`);
export function preloadOphyArt() {
  for (const k of Object.keys(POT_N)) potImg(k);
  for (const f of ["standee", "chicken", "bird", "pocket", "guide1", "guide2", "guide3"]) img(`${DIR}/${f}.webp`);
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const env = (p, a, b, c, d) => (p < a || p > d ? 0 : p < b ? (p - a) / (b - a || 1) : p <= c ? 1 : 1 - (p - c) / (d - c || 1));
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (c, a) => `rgba(${c},${Math.max(0, Math.min(1, a))})`;
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
const additive = (g, fn) => { const o = g.globalCompositeOperation; g.globalCompositeOperation = "lighter"; fn(); g.globalCompositeOperation = o; };
function quad(g, x, y, w, h, z, fill) {
  const c = [P(x, y, z), P(x + w, y, z), P(x + w, y + h, z), P(x, y + h, z)];
  g.fillStyle = fill; g.beginPath(); g.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) g.lineTo(c[i][0], c[i][1]); g.closePath(); g.fill();
}
function quadStroke(g, x, y, w, h, z, stroke, lw) {
  const c = [P(x, y, z), P(x + w, y, z), P(x + w, y + h, z), P(x, y + h, z)];
  g.strokeStyle = stroke; g.lineWidth = lw; g.beginPath(); g.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) g.lineTo(c[i][0], c[i][1]); g.closePath(); g.stroke();
}
function dot(g, x, y, r, rgb, a) { g.fillStyle = rgba(rgb, a); g.beginPath(); g.arc(x, y, Math.max(1.2, r), 0, TAU); g.fill(); }
function star(g, x, y, r, rgb, a, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = rgba(rgb, a); g.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.28 : r, an = (i / 8) * TAU; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  g.closePath(); g.fill(); g.restore();
}
// ขวด (ภาพจริงของเพื่อนผู้ใช้ — pixel art 160 → วาดแบบคม) · ยังโหลดไม่เสร็จ = ขวดกลมสีน้ำยา
function bottle(g, k, x, y, size, rot = 0, a = 1) {
  const im = potImg(k);
  g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot);
  if (im) { const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(im, -size / 2, -size / 2, size, size); g.imageSmoothingEnabled = sm; }
  else { dot(g, 0, size * 0.1, size * 0.3, POT_RGB[k] || WHITE, 1); g.fillStyle = "rgba(200,120,80,1)"; g.fillRect(-size * 0.08, -size * 0.38, size * 0.16, size * 0.18); }
  g.restore();
}
const mid = (t, s = 1) => [t.x + s / 2, t.y + s / 2];
function boxOf(tiles, at) {
  const ts = (tiles || []).filter(okT);
  if (!ts.length) return [at.x - 1, at.y - 1, at.x + 2, at.y + 2];
  return [Math.min(...ts.map((t) => t.x)), Math.min(...ts.map((t) => t.y)), Math.max(...ts.map((t) => t.x)) + 1, Math.max(...ts.map((t) => t.y)) + 1];
}
function emoji(g, ch, x, y, px, a = 1, rot = 0) {
  g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot);
  g.font = `${Math.max(8, px | 0)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, 0, 0); g.restore();
}

// ---------------------------------------------------------------- ยิง: ขวดลอยโค้ง
function throwFx(g, e, now, lowQ) {
  if (!okT(e.from) || !okT(e.to)) return;
  const dur = e.counter ? OPHY_T.counterFly : OPHY_T.fly;
  const q = clamp01((now - e.t0) / dur);
  if (q >= 1) return;
  const C = e.rgb || POT_RGB[e.potion] || WHITE, s0 = Math.max(1, e.size | 0);
  const [fx, fy] = mid(e.from, s0), [tx, ty] = mid(e.to);
  const dist = Math.hypot(tx - fx, ty - fy);
  const H = e.counter ? 1.4 + dist * 0.18 : 1.8 + dist * 0.35;
  const at = (u) => [fx + (tx - fx) * u, fy + (ty - fy) * u, 0.9 + Math.sin(u * Math.PI) * H - u * 0.7];
  const [b0, b1, b2, b3] = boxOf(e.tiles, e.to);
  // วงเป้า 3×3: พื้นสีน้ำยาจางขึ้นเรื่อยๆ + ขอบกะพริบเร็วขึ้นใกล้ตก + มุมเล็ง 4 มุม
  const pulse = 0.5 + 0.5 * Math.sin(now / (110 - q * 70));
  quad(g, b0, b1, b2 - b0, b3 - b1, 0.012, rgba(C, 0.08 + 0.2 * q));
  quadStroke(g, b0, b1, b2 - b0, b3 - b1, 0.02, rgba(C, 0.45 + 0.45 * pulse), 2.2 + q * 1.5);
  for (const [cx, cy, dx, dy] of [[b0, b1, 1, 1], [b2, b1, -1, 1], [b2, b3, -1, -1], [b0, b3, 1, -1]]) {
    const L = 0.32 * (1.3 - q * 0.3), [ax, ay] = P(cx, cy, 0.03), [hx, hy] = P(cx + dx * L, cy, 0.03), [vx, vy] = P(cx, cy + dy * L, 0.03);
    g.strokeStyle = rgba(WHITE, 0.85); g.lineWidth = 3; g.beginPath(); g.moveTo(hx, hy); g.lineTo(ax, ay); g.lineTo(vx, vy); g.stroke();
  }
  // แฟลชปากกระบอก (ต้นทาง) — สวนกลับ = แฟลชม่วงพร้อมแม่กุญแจ
  if (q < 0.25) {
    const [mx, my, ms] = P(fx, fy, 0.9);
    additive(g, () => { glow(g, mx, my, ms * (0.9 - q * 2), C, 0.9 * (1 - q * 4)); glow(g, mx, my, ms * 0.4, WHITE, 0.9 * (1 - q * 4)); });
    if (e.counter) emoji(g, "🔒", mx, my - ms * 0.55, ms * 0.42, 1 - q * 4);
  }
  // เงาบนพื้นตามขวด
  const [sx, sy] = [fx + (tx - fx) * q, fy + (ty - fy) * q];
  gEllipse(g, sx, sy, 0.16 + q * 0.12, 0.01, 22); g.fillStyle = rgba("0,0,0", 0.18 + q * 0.22); g.fill();
  // หางประกาย: จุดสีน้ำยา + ดาวขาวกระพริบ
  const tail = lowQ ? 9 : 18;
  for (let i = 1; i <= tail; i++) {
    const u = q - i * 0.022;
    if (u < 0) break;
    const [wx, wy, wz] = at(u), [px, py, ps] = P(wx, wy, wz), f = 1 - i / tail;
    additive(g, () => dot(g, px, py, ps * 0.09 * f + 1, C, 0.75 * f));
    if (!lowQ && i % 3 === 0) star(g, px + (hash01(i + e.t0) - 0.5) * ps * 0.25, py + (hash01(i * 7 + e.t0) - 0.5) * ps * 0.25, ps * 0.07 * f + 1.5, WHITE, 0.9 * f, now / 120 + i);
  }
  const [wx, wy, wz] = at(q), [px, py, ps] = P(wx, wy, wz);
  additive(g, () => glow(g, px, py, ps * 0.55, C, 0.85));
  bottle(g, e.potion, px, py, ps * 0.62, (now - e.t0) / 70 * (tx >= fx ? 1 : -1));
}

// ---------------------------------------------------------------- ขวดแตก: กระเซ็นอลังการ 3×3
const SPLASH_SIGIL = { frost: "❄️", bolt: "⚡", venom: "☠️", flame: "🔥", heal: "💚", noheal: "🚫", ward: "🛡️", invis: "👻", warp: "🌀", morph: "🪶", base: "💧" };
function splashFx(g, e, now, lowQ) {
  if (!okT(e.at)) return;
  const p = clamp01((now - e.t0) / OPHY_FX_DUR.ophySplash);
  const C = e.rgb || POT_RGB[e.potion] || WHITE, seed = (e.t0 | 0) % 997, many = lowQ ? 0.45 : 1;
  const [tx, ty] = mid(e.at);
  const [b0, b1, b2, b3] = boxOf(e.tiles, e.at);
  const k = env(p, 0, 0.04, 0.55, 1);
  // พื้น 3×3 ย้อมสีน้ำยา + ขอบสว่างแล้วค่อยจาง
  quad(g, b0, b1, b2 - b0, b3 - b1, 0.012, rgba(C, 0.42 * k));
  quadStroke(g, b0, b1, b2 - b0, b3 - b1, 0.02, rgba(WHITE, 0.85 * env(p, 0, 0.02, 0.2, 0.5)), 4);
  quadStroke(g, b0, b1, b2 - b0, b3 - b1, 0.02, rgba(C, 0.9 * k), 2.5);
  // คราบน้ำยาเป็นหย่อมบนพื้น (ไม่สม่ำเสมอ) ค่อยๆ ซึม
  for (let i = 0; i < 7; i++) {
    const h = hash01(seed + i * 13), an = h * TAU, rr = 0.25 + hash01(seed + i) * 1.05;
    gEllipse(g, tx + Math.cos(an) * rr, ty + Math.sin(an) * rr, (0.16 + h * 0.24) * easeOut3(clamp01(p / 0.25)), 0.015, 18);
    g.fillStyle = rgba(C, 0.38 * k); g.fill();
  }
  const [x, y, s] = P(tx, ty, 0.45);
  // แฟลช + โดมน้ำยา
  // โดมน้ำยา (วาดทับปกติ — เห็นชัดบนพื้นสว่าง) + แกนสว่างสั้นๆ
  glow(g, x, y, s * (0.7 + 1.0 * easeOut3(clamp01(p / 0.3))), C, 0.7 * env(p, 0, 0.02, 0.25, 0.7));
  additive(g, () => glow(g, x, y, s * 1.3, WHITE, 0.75 * env(p, 0, 0.015, 0.05, 0.18)));
  // คลื่นวงแหวน 2 ชั้น
  for (const [d, col, th] of [[0, C, 12], [0.08, WHITE, 5]]) {
    const w = easeOut3(clamp01((p - d) / 0.42));
    if (w > 0 && w < 1) { gEllipse(g, tx, ty, 0.2 + w * 1.75, 0.03, 56); g.strokeStyle = rgba(col, 0.95 * (1 - w)); g.lineWidth = th * (1 - w) + 1.5; g.stroke(); }
  }
  // เศษแก้ว: เหลี่ยมใสหมุนกระเด็นแล้วตกพื้น
  const shards = Math.round(16 * many);
  for (let i = 0; i < shards; i++) {
    const h = hash01(seed + i * 3), an = h * TAU, sp = 0.6 + hash01(seed + i * 5) * 1.1;
    const q = clamp01(p / 0.75), rr = easeOut3(q) * sp, z = Math.max(0.02, 0.5 + Math.sin(q * Math.PI) * (0.6 + h * 0.9) - q * 0.5);
    const [px, py, ps] = P(tx + Math.cos(an) * rr, ty + Math.sin(an) * rr, z), sz = ps * (0.04 + h * 0.05), rot = q * 14 * (h - 0.5) + i;
    g.save(); g.translate(px, py); g.rotate(rot);
    g.fillStyle = rgba(i % 3 ? "210,240,255" : C, 0.9 * (1 - clamp01((p - 0.7) / 0.3)));
    g.beginPath(); g.moveTo(-sz, -sz * 0.4); g.lineTo(sz * 0.6, -sz); g.lineTo(sz, sz * 0.5); g.lineTo(-sz * 0.3, sz); g.closePath(); g.fill();
    g.strokeStyle = rgba(WHITE, 0.8 * (1 - p)); g.lineWidth = 1; g.stroke(); g.restore();
  }
  // หยดน้ำยากระเซ็นขึ้นสูงแล้วตกพื้น
  const drops = Math.round(46 * many);
  for (let i = 0; i < drops; i++) {
    const h = hash01(seed + 100 + i), an = h * TAU + i, sp = 0.3 + hash01(seed + 200 + i) * 1.4, up = 0.8 + hash01(seed + 300 + i) * 2.4;
    const q = clamp01((p - 0.01) / 0.8), rr = easeOut3(q) * sp, z = Math.max(0, 0.4 + up * q - 3.6 * q * q);
    if (z <= 0 && q > 0.3) continue;
    const [px, py, ps] = P(tx + Math.cos(an) * rr, ty + Math.sin(an) * rr, z);
    dot(g, px, py, ps * (0.035 + h * 0.04), h > 0.25 ? C : WHITE, 0.95 * (1 - q * 0.6));
  }
  // ไอน้ำยาลอยขึ้นจากทุกช่องในวง
  const tiles = (e.tiles || []).filter(okT);
  if (!lowQ) tiles.forEach((t, i) => {
    for (let j = 0; j < 3; j++) {
      const h = hash01(seed + i * 9 + j), q = clamp01((p - 0.12 - h * 0.2) / 0.7);
      if (q <= 0 || q >= 1) continue;
      const [px, py, ps] = P(t.x + 0.2 + h * 0.6, t.y + 0.25 + hash01(seed + j * 31 + i) * 0.5, 0.05 + q * 1.5);
      additive(g, () => glow(g, px, py, ps * (0.12 + q * 0.2), C, 0.55 * Math.sin(q * Math.PI)));
    }
  });
  // ตราของขวด (ไอคอนลอยขึ้นกลางวงแล้วจาง) + ลายเฉพาะชนิด
  const sig = SPLASH_SIGIL[e.potion];
  const qs = clamp01((p - 0.06) / 0.6);
  if (sig && qs > 0 && qs < 1) {
    const [ix, iy, is] = P(tx, ty, 0.8 + qs * 1.1);
    additive(g, () => glow(g, ix, iy, is * 0.6, C, 0.6 * Math.sin(qs * Math.PI)));
    emoji(g, sig, ix, iy, is * (0.38 + 0.12 * Math.sin(qs * Math.PI)), Math.sin(qs * Math.PI));
  }
  if (e.potion === "bolt" && p < 0.5) {
    for (let i = 0; i < (lowQ ? 2 : 5); i++) {
      const a1 = tiles[(seed + i) % Math.max(1, tiles.length)], a2 = tiles[(seed + i * 4 + 3) % Math.max(1, tiles.length)];
      if (!a1 || !a2) break;
      const [sx, sy] = P(a1.x + 0.5, a1.y + 0.5, 0.05), [ex, ey] = P(a2.x + 0.5, a2.y + 0.5, 0.05);
      additive(g, () => { g.strokeStyle = rgba(C, 0.9); g.lineWidth = 2.5; g.beginPath(); g.moveTo(sx, sy); const mx = (sx + ex) / 2 + (hash01(seed + i + ((now / 40) | 0)) - 0.5) * 30; g.lineTo(mx, (sy + ey) / 2 - 10); g.lineTo(ex, ey); g.stroke(); });
    }
  } else if (e.potion === "flame") {
    tiles.forEach((t, i) => {
      const up = easeOut3(clamp01((p - 0.05 - (i % 3) * 0.04) / 0.25)) * k;
      const [px, py, ps] = P(t.x + 0.5, t.y + 0.55, 0.02);
      additive(g, () => glow(g, px, py - ps * 0.25 * up, ps * 0.35 * up, "255,170,60", 0.75 * up));
    });
  } else if (e.potion === "frost") {
    tiles.forEach((t, i) => {
      const up = easeOut3(clamp01((p - 0.04 - i * 0.02) / 0.2)) * (1 - clamp01((p - 0.75) / 0.25));
      if (up <= 0) return;
      const [bx, by] = P(t.x + 0.5, t.y + 0.5, 0), [hx, hy] = P(t.x + 0.5, t.y + 0.5, 0.7 * up), w = (bx - hx) * 0 + 7;
      g.fillStyle = rgba("225,250,255", 0.85); g.beginPath(); g.moveTo(bx - w, by); g.lineTo(hx, hy); g.lineTo(bx + w, by); g.closePath(); g.fill();
    });
  } else if (e.potion === "venom" || e.potion === "noheal") {
    for (let i = 0; i < (lowQ ? 8 : 18); i++) {
      const h = hash01(seed + 500 + i), q = clamp01((p - h * 0.3) / 0.6);
      if (q <= 0 || q >= 1) continue;
      const [px, py, ps] = P(b0 + 0.2 + h * (b2 - b0 - 0.4), b1 + 0.2 + hash01(seed + 600 + i) * (b3 - b1 - 0.4), q * 1.2);
      g.strokeStyle = rgba(C, 0.8 * (1 - q)); g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, ps * (0.05 + q * 0.06), 0, TAU); g.stroke();
    }
  } else if (e.potion === "heal" || e.potion === "ward") {
    for (let i = 0; i < (lowQ ? 6 : 14); i++) {
      const h = hash01(seed + 700 + i), q = clamp01((p - h * 0.35) / 0.55);
      if (q <= 0 || q >= 1) continue;
      const [px, py, ps] = P(b0 + 0.2 + h * (b2 - b0 - 0.4), b1 + 0.2 + hash01(seed + 800 + i) * (b3 - b1 - 0.4), 0.2 + q * 1.8);
      star(g, px, py, ps * 0.07, e.potion === "heal" ? "170,255,190" : "235,245,210", 0.95 * Math.sin(q * Math.PI), q * 4);
    }
  } else if (e.potion === "invis") {
    const q = clamp01(p / 0.8);
    for (let i = 0; i < 3; i++) { gEllipse(g, tx, ty, 0.4 + i * 0.45 + q * 0.3, 0.05 + q * 1.2, 40); g.strokeStyle = rgba(WHITE, 0.35 * (1 - q)); g.lineWidth = 2; g.stroke(); }
  } else if (e.potion === "warp" || e.potion === "morph") {
    const q = clamp01(p / 0.85), spin = now / 150;
    for (let j = 0; j < 3; j++) {
      g.strokeStyle = rgba(j ? C : WHITE, 0.8 * (1 - q)); g.lineWidth = 2.5; g.beginPath();
      for (let i = 0; i <= 26; i++) { const u = i / 26, an = spin + j * (TAU / 3) + u * 5, r = 0.15 + u * 1.4; const [px, py] = P(tx + Math.cos(an) * r, ty + Math.sin(an) * r, 0.05 + u * 0.2); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
    }
    if (e.potion === "morph" && !lowQ) for (let i = 0; i < 10; i++) {
      const h = hash01(seed + 900 + i), qq = clamp01((p - h * 0.2) / 0.8);
      const [px, py, ps] = P(tx + (h - 0.5) * 2, ty + (hash01(seed + 950 + i) - 0.5) * 2, 0.3 + qq * 1.6);
      emoji(g, "🪶", px + Math.sin(qq * 9 + i) * ps * 0.15, py, ps * 0.22, 1 - qq, Math.sin(qq * 6 + i) * 0.8);
    }
  }
}

// ---------------------------------------------------------------- หม้อยาระเบิด (ปรุงผิดสูตร)
const BOOM_COLS = ["255,120,60", "180,80,255", "80,230,140", "255,220,80", "90,170,255"];
function boomFx(g, e, now, lowQ) {
  if (!okT(e.at)) return;
  const p = clamp01((now - e.t0) / OPHY_FX_DUR.ophyBoom), seed = (e.t0 | 0) % 991, many = lowQ ? 0.5 : 1;
  const [tx, ty] = mid(e.at);
  const [b0, b1, b2, b3] = boxOf(e.tiles, e.at);
  const k = env(p, 0, 0.02, 0.45, 1);
  quad(g, b0, b1, b2 - b0, b3 - b1, 0.012, rgba("255,150,70", 0.35 * k));
  quadStroke(g, b0, b1, b2 - b0, b3 - b1, 0.02, rgba(WHITE, 0.9 * env(p, 0, 0.02, 0.15, 0.4)), 4);
  // หม้อสั่นก่อนระเบิด (ช่วงแรกสั้นๆ)
  if (p < 0.12) {
    const [cx, cy, cs] = P(tx, ty, 0.3), sh = Math.sin(now / 18) * cs * 0.05;
    g.fillStyle = "rgba(30,34,52,1)"; g.beginPath(); g.ellipse(cx + sh, cy, cs * 0.3, cs * 0.24, 0, 0, TAU); g.fill();
    additive(g, () => glow(g, cx + sh, cy - cs * 0.2, cs * 0.35, "120,220,255", 0.8));
  }
  const q = clamp01((p - 0.1) / 0.9);
  if (q <= 0) return;
  const [x, y, s] = P(tx, ty, 0.6 + q * 0.8);
  glow(g, x, y, s * (0.9 + 1.3 * easeOut3(clamp01(q / 0.3))), "255,130,50", 0.8 * env(q, 0, 0.03, 0.2, 0.6));
  glow(g, x, y, s * 0.7, "255,235,170", 0.95 * env(q, 0, 0.02, 0.12, 0.35));
  additive(g, () => glow(g, x, y, s * 1.8, WHITE, 0.8 * env(q, 0, 0.02, 0.06, 0.2)));
  for (const [d, col, th] of [[0, "255,180,90", 16], [0.06, WHITE, 6], [0.14, "200,120,255", 9]]) {
    const w = easeOut3(clamp01((q - d) / 0.45));
    if (w > 0 && w < 1) { gEllipse(g, tx, ty, 0.25 + w * 2.1, 0.03, 60); g.strokeStyle = rgba(col, 0.95 * (1 - w)); g.lineWidth = th * (1 - w) + 2; g.stroke(); }
  }
  // ควันหลากสีม้วนขึ้น
  const puffs = Math.round(16 * many);
  for (let i = 0; i < puffs; i++) {
    const h = hash01(seed + i), an = h * TAU, rr = easeOut3(clamp01(q / 0.6)) * (0.4 + hash01(seed + i * 3) * 1.1), z = 0.2 + q * (1.2 + h * 1.6);
    const [px, py, ps] = P(tx + Math.cos(an) * rr, ty + Math.sin(an) * rr, z);
    const col = BOOM_COLS[i % BOOM_COLS.length], r = ps * (0.18 + q * 0.32 + h * 0.1);
    const gr = g.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, rgba(col, 0.55 * (1 - q))); gr.addColorStop(0.6, rgba("90,85,110", 0.35 * (1 - q))); gr.addColorStop(1, rgba("60,60,80", 0));
    g.fillStyle = gr; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
  }
  // ฟองยา + เศษหม้อ
  for (let i = 0; i < Math.round(30 * many); i++) {
    const h = hash01(seed + 300 + i), an = h * TAU + i, sp = 0.5 + hash01(seed + 400 + i) * 1.7, up = 1 + hash01(seed + 500 + i) * 2.8;
    const qq = clamp01(q / 0.85), rr = easeOut3(qq) * sp, z = Math.max(0, 0.5 + up * qq - 3.8 * qq * qq);
    if (z <= 0 && qq > 0.3) continue;
    const [px, py, ps] = P(tx + Math.cos(an) * rr, ty + Math.sin(an) * rr, z);
    if (i % 4 === 0) { g.save(); g.translate(px, py); g.rotate(qq * 12 + i); g.fillStyle = "rgba(38,42,62,.95)"; g.fillRect(-ps * 0.05, -ps * 0.03, ps * 0.1, ps * 0.06); g.restore(); }
    else { g.strokeStyle = rgba(BOOM_COLS[i % 5], 0.9 * (1 - qq)); g.lineWidth = 1.6; g.beginPath(); g.arc(px, py, ps * (0.03 + h * 0.03), 0, TAU); g.stroke(); }
  }
}

// ---------------------------------------------------------------- ดื่มยา
function drinkFx(g, e, now, lowQ) {
  if (!okT(e.at)) return;
  const p = clamp01((now - e.t0) / OPHY_FX_DUR.ophyDrink), C = e.rgb || POT_RGB[e.potion] || WHITE, seed = (e.t0 | 0) % 977;
  const [tx, ty] = mid(e.at);
  // ขวดลอยขึ้นเหนือหัว เอียงเทแล้วสลายเป็นประกาย
  if (p < 0.55) {
    const q = p / 0.55, [bx, by, bs] = P(tx, ty, 1.9 + Math.sin(q * Math.PI) * 0.25);
    bottle(g, e.potion, bx, by, bs * 0.5, -easeOut3(clamp01((q - 0.25) / 0.5)) * 2.1, 1 - clamp01((q - 0.85) / 0.15));
    if (q > 0.4) for (let i = 0; i < 6; i++) { const qq = clamp01((q - 0.4 - i * 0.05) / 0.3); const [dx, dy, ds] = P(tx, ty, 1.7 - qq * 1.1); dot(g, dx + (hash01(i) - 0.5) * 6, dy, ds * 0.04, C, 0.9 * (1 - qq)); }
  }
  // วงเวทสีน้ำยาวนรอบตัว + ฟองลอย
  const q = clamp01((p - 0.35) / 0.65), k = Math.sin(q * Math.PI);
  if (q > 0) {
    for (let j = 0; j < 2; j++) {
      gEllipse(g, tx, ty, 0.55 + j * 0.18 + q * 0.15, 0.03 + j * 0.02, 48);
      g.strokeStyle = rgba(j ? WHITE : C, 0.85 * k); g.lineWidth = j ? 1.5 : 3.5; g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const an = now / 300 + (i / 6) * TAU, [px, py, ps] = P(tx + Math.cos(an) * 0.62, ty + Math.sin(an) * 0.62, 0.04);
      star(g, px, py, ps * 0.07, C, 0.9 * k, an);
    }
    for (let i = 0; i < (lowQ ? 6 : 14); i++) {
      const h = hash01(seed + i), qq = clamp01((q - h * 0.3) / 0.7);
      if (qq <= 0 || qq >= 1) continue;
      const [px, py, ps] = P(tx + Math.cos(h * TAU) * 0.45, ty + Math.sin(h * TAU) * 0.45, 0.1 + qq * 1.6);
      g.strokeStyle = rgba(C, 0.85 * (1 - qq)); g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, ps * (0.03 + h * 0.03), 0, TAU); g.stroke();
    }
    const [cx, cy, cs] = P(tx, ty, 0.8);
    additive(g, () => glow(g, cx, cy, cs * 0.9, C, 0.5 * k));
  }
}

// ---------------------------------------------------------------- วาร์ป
function vortex(g, tx, ty, q, open, now, lowQ) {
  const C = POT_RGB.warp, k = open ? 1 - q : q, r0 = open ? 0.2 + q * 0.9 : 1.1 - q * 0.9;
  for (let j = 0; j < (lowQ ? 2 : 4); j++) {
    g.strokeStyle = rgba(j % 2 ? WHITE : C, 0.85 * (open ? 1 - q : Math.min(1, q * 3))); g.lineWidth = 2.5; g.beginPath();
    for (let i = 0; i <= 30; i++) { const u = i / 30, an = now / 110 * (open ? -1 : 1) + j * (TAU / 4) + u * 5.5, r = 0.05 + u * r0; const [px, py] = P(tx + Math.cos(an) * r, ty + Math.sin(an) * r, 0.04); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
  }
  const [x, y, s] = P(tx, ty, 0.6);
  additive(g, () => glow(g, x, y, s * (0.6 + k), C, 0.7 * Math.sin(q * Math.PI)));
}
function warpFx(g, e, now, lowQ) {
  const p = clamp01((now - e.t0) / OPHY_FX_DUR.ophyWarp);
  if (okT(e.from) && p < 0.6) { const [fx, fy] = mid(e.from); vortex(g, fx, fy, p / 0.6, false, now, lowQ); }
  if (okT(e.to) && p > 0.3) {
    const q = (p - 0.3) / 0.7, [tx, ty] = mid(e.to);
    vortex(g, tx, ty, q, true, now, lowQ);
    const [bx, by] = P(tx, ty, 0), [hx, hy] = P(tx, ty, 3.2);
    const gr = g.createLinearGradient(bx, by, hx, hy);
    gr.addColorStop(0, rgba(POT_RGB.warp, 0.75 * (1 - q))); gr.addColorStop(1, rgba(WHITE, 0));
    additive(g, () => { g.fillStyle = gr; g.fillRect(bx - 14 * (1 - q * 0.5), hy, 28 * (1 - q * 0.5), by - hy); });
  }
}

// ---------------------------------------------------------------- วัตถุดิบเด้งออก / ถูกเก็บ
function dropFx(g, e, now) {
  if (!okT(e.from)) return;
  const p = clamp01((now - e.t0) / OPHY_FX_DUR.ophyDrop), [fx, fy] = mid(e.from);
  (e.drops || []).forEach((d, i) => {
    if (!okT(d)) return;
    const q = clamp01((p - i * 0.06) / 0.8);
    if (q <= 0) return;
    const [tx, ty] = mid(d), wx = fx + (tx - fx) * q, wy = fy + (ty - fy) * q, z = 0.3 + Math.sin(q * Math.PI) * 1.4;
    const [px, py, ps] = P(wx, wy, z);
    additive(g, () => glow(g, px, py, ps * 0.35, MAT_RGB[d.k] || WHITE, 0.8));
    emoji(g, MAT_ICON[d.k] || "✨", px, py, ps * 0.34, 1, q * 6);
    if (q >= 1) { const [lx, ly, ls] = P(tx, ty, 0.02); gEllipse(g, tx, ty, 0.15 + (p - 0.8) * 2, 0.01, 20); g.strokeStyle = rgba(MAT_RGB[d.k] || WHITE, 0.8 * (1 - p)); g.lineWidth = 2; g.stroke(); dot(g, lx, ly, ls * 0.02, WHITE, 0); }
  });
}
function pickFx(g, e, now, units) {
  const u = (units || []).find((x) => x.id === e.id);
  if (!u) return;
  const p = clamp01((now - e.t0) / OPHY_FX_DUR.ophyPick), tx = u.rx + 0.5 + (u.ox || 0), ty = u.ry + 0.5 + (u.oy || 0);
  for (let i = 0; i < 10; i++) {
    const an = (i / 10) * TAU + p * 4, r = (1 - p) * 0.9, [px, py, ps] = P(tx + Math.cos(an) * r, ty + Math.sin(an) * r, 0.3 + p * 0.9);
    star(g, px, py, ps * 0.07, i % 2 ? "255,240,160" : WHITE, 1 - p, an);
  }
  const [x, y, s] = P(tx, ty, 0.9);
  additive(g, () => glow(g, x, y, s * 0.8, "255,230,140", 0.6 * Math.sin(p * Math.PI)));
}

export function ophyFx(g, e, now, lowQ, units) {
  if (e.kind === "ophyThrow") throwFx(g, e, now, lowQ);
  else if (e.kind === "ophySplash") splashFx(g, e, now, lowQ);
  else if (e.kind === "ophyBoom") boomFx(g, e, now, lowQ);
  else if (e.kind === "ophyDrink") drinkFx(g, e, now, lowQ);
  else if (e.kind === "ophyWarp") warpFx(g, e, now, lowQ);
  else if (e.kind === "ophyDrop") dropFx(g, e, now);
  else if (e.kind === "ophyPick") pickFx(g, e, now, units);
}

// ---------------------------------------------------------------- socket → fx + เสียง
//  คืน { fx, sfx: [[ชื่อ, ms]], shake: [ms] } ให้ useCharSocketFx เล่นตามจังหวะ
export function ophyEventFx(ev) {
  const out = { fx: [], sfx: [], shake: [] };
  if (!ev || !ev.kind) return out;
  if (ev.kind === "throw") {
    out.fx.push({ kind: "ophyThrow", id: ev.id, from: ev.from, to: ev.to, size: ev.size || 1, potion: ev.potion, rgb: ev.rgb, tiles: ev.tiles, counter: !!ev.counter, dur: OPHY_FX_DUR.ophyThrow });
    if (!ev.counter) { out.sfx.push(["ophy_throw", 0]); out.sfx.push([Math.random() < 0.5 ? "ophy_atk1" : "ophy_atk2", 60]); }
    else out.sfx.push(["ophy_throw", 0]);
  } else if (ev.kind === "splash") {
    out.fx.push({ kind: "ophySplash", at: ev.at, potion: ev.potion, rgb: ev.rgb, tiles: ev.tiles, dur: OPHY_FX_DUR.ophySplash, ...(ev.late ? { delay: OPHY_T.counterFly } : {}) });
    const d = ev.late ? OPHY_T.counterFly : 0;
    out.sfx.push(["ophy_shatter", d]);
    if (ev.potion === "invis") out.sfx.push(["ophy_invis", d + 120]);
    if (ev.potion === "warp") out.sfx.push(["ophy_warp", d + 80]);
    if (ev.potion === "morph") { out.sfx.push(["ophy_poof", d + 80]); if ((ev.hits || []).length) out.sfx.push(["ophy_cluck", d + 380]); }
    out.shake.push(d + 20);
  } else if (ev.kind === "boom") {
    out.fx.push({ kind: "ophyBoom", at: ev.at, tiles: ev.tiles, dur: OPHY_FX_DUR.ophyBoom });
    out.shake.push(200, 320, 460);
  } else if (ev.kind === "drink") {
    out.fx.push({ kind: "ophyDrink", id: ev.id, at: ev.at, potion: ev.potion, rgb: ev.rgb, dur: OPHY_FX_DUR.ophyDrink });
    out.sfx.push(["ophy_drink", 0]);
    if (ev.potion === "morph") out.sfx.push(["ophy_poof", 700]);
    if (ev.potion === "invis") out.sfx.push(["ophy_invis", 700]);
  } else if (ev.kind === "warp") {
    out.fx.push({ kind: "ophyWarp", id: ev.id, from: ev.from, to: ev.to, dur: OPHY_FX_DUR.ophyWarp });
    out.sfx.push(["ophy_warp", 0]);
  } else if (ev.kind === "drop") {
    out.fx.push({ kind: "ophyDrop", from: ev.from, drops: ev.drops, dur: OPHY_FX_DUR.ophyDrop });
  } else if (ev.kind === "pick") {
    out.fx.push({ kind: "ophyPick", id: ev.id, dur: OPHY_FX_DUR.ophyPick });
    out.sfx.push(["ophy_pick", 0]);
  }
  return out;
}

// ---------------------------------------------------------------- ของค้างบนกระดาน (ทุกคนเห็น)
//  ground = { drops: [{ x, y, k, left }], nodes: [{ x, y }] } รวมทุก Ophy
export function ophyGroundItems(items, g, ground, now, lowQ, depthOf) {
  if (!ground) return;
  for (const n of ground.nodes || []) {
    if (!okT(n)) continue;
    items.push({ d: depthOf(n.x + 0.5, n.y + 0.5) - 0.002, f: () => drawNode(g, n, now, lowQ) });
  }
  const byTile = new Map();
  for (const d of ground.drops || []) { if (!okT(d)) continue; const kk = `${d.x},${d.y}`; if (!byTile.has(kk)) byTile.set(kk, []); byTile.get(kk).push(d); }
  for (const list of byTile.values()) {
    const t = list[0];
    items.push({ d: depthOf(t.x + 0.5, t.y + 0.5) - 0.001, f: () => drawDrops(g, list, now, lowQ) });
  }
}
// ช่องพลังงานธาตุ: วงเวทหกเหลี่ยมหมุน + ผลึกม่วงลอยหมุนกลางช่อง
function drawNode(g, n, now, lowQ) {
  const tx = n.x + 0.5, ty = n.y + 0.5, t = REDUCED ? 0 : now / 1000, C = MAT_RGB.orb;
  g.save();
  gEllipse(g, tx, ty, 0.4, 0.01, 6); g.strokeStyle = rgba(C, 0.75); g.lineWidth = 2; g.stroke();
  g.beginPath();
  for (let i = 0; i <= 6; i++) { const an = t * 0.8 + (i / 6) * TAU, [px, py] = P(tx + Math.cos(an) * 0.36, ty + Math.sin(an) * 0.36, 0.012); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.strokeStyle = rgba("230,200,255", 0.55); g.lineWidth = 1.5; g.stroke();
  const [cx, cy, cs] = P(tx, ty, 0.45 + Math.sin(t * 2.2) * 0.08);
  additive(g, () => { glow(g, cx, cy, cs * 0.45, C, 0.75); const [fx, fy, fs] = P(tx, ty, 0.01); glow(g, fx, fy, fs * 0.4, C, 0.4); });
  // ผลึก (ข้าวหลามตัดหมุน)
  const w = cs * 0.1 * Math.abs(Math.cos(t * 1.6)) + cs * 0.025, h = cs * 0.17;
  g.fillStyle = rgba("205,150,255", 0.95); g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + w, cy); g.lineTo(cx, cy + h); g.lineTo(cx - w, cy); g.closePath(); g.fill();
  g.strokeStyle = rgba(WHITE, 0.9); g.lineWidth = 1.2; g.stroke();
  if (!lowQ) for (let i = 0; i < 3; i++) { const an = t * 1.8 + (i / 3) * TAU, [px, py, ps] = P(tx + Math.cos(an) * 0.28, ty + Math.sin(an) * 0.28, 0.3 + Math.sin(t * 3 + i) * 0.1); star(g, px, py, ps * 0.04, WHITE, 0.85, an); }
  g.restore();
}
// วัตถุดิบที่ตก: ไอคอนลอยขึ้นลง + วงแสงสีวัตถุดิบ + จุดบอกเทิร์นที่เหลือ
function drawDrops(g, list, now, lowQ) {
  const n = list.length, t = REDUCED ? 0 : now / 1000;
  list.forEach((d, i) => {
    const off = n > 1 ? ((i / n) * TAU) : 0, r = n > 1 ? 0.2 : 0;
    const tx = d.x + 0.5 + Math.cos(off) * r, ty = d.y + 0.5 + Math.sin(off) * r, C = MAT_RGB[d.k] || WHITE;
    gEllipse(g, tx, ty, 0.17, 0.01, 18); g.fillStyle = rgba("0,0,0", 0.25); g.fill();
    const [px, py, ps] = P(tx, ty, 0.32 + Math.sin(t * 2.4 + i) * 0.07);
    additive(g, () => glow(g, px, py, ps * 0.32, C, 0.7));
    emoji(g, MAT_ICON[d.k] || "✨", px, py, ps * 0.3, 1, Math.sin(t * 1.5 + i) * 0.25);
    if (!lowQ && ((t * 2 + i) % 2) < 0.3) star(g, px + ps * 0.12, py - ps * 0.12, ps * 0.05, WHITE, 0.9, t * 4);
    const left = Math.max(1, d.left | 0);
    for (let j = 0; j < left; j++) dot(g, px - (left - 1) * 3 + j * 6, py + ps * 0.24, 2, j < left ? C : WHITE, 0.95);
  });
}

// ---------------------------------------------------------------- บนตัว: ลำดับยา 4 ขวด · Lock in · calculated
//  u.ophy = { queue, lockIn, calc } · bx/hy = กลางหมาก/ป้ายรูป (จอ) · hexR = รัศมีหมาก
export function ophyUnitFront(g, u, now, bx, hy, hexR) {
  const o = u.ophy;
  if (!o) return;
  const t = REDUCED ? 0 : now / 1000, a = u.alpha == null ? 1 : u.alpha;
  g.save(); g.globalAlpha *= a;
  const q = Array.isArray(o.queue) ? o.queue.slice(0, 4) : [];
  if (q.length) {
    const base = Math.max(26, hexR * 1.3), top = hy - base * 0.95;
    const sizes = q.map((_, i) => (i === 0 ? base : base * 0.72));
    const gap = base * 0.12, total = sizes.reduce((s, v) => s + v, 0) + gap * (q.length - 1);
    let x = bx - total / 2;
    // แผ่นหลังโค้งมน
    g.fillStyle = "rgba(20,16,30,.55)"; g.strokeStyle = "rgba(255,220,160,.55)"; g.lineWidth = 1.2;
    const pad = 4, h = base + pad * 2;
    g.beginPath(); g.roundRect ? g.roundRect(x - pad, top - h / 2, total + pad * 2, h, h / 2) : g.rect(x - pad, top - h / 2, total + pad * 2, h); g.fill(); g.stroke();
    q.forEach((k, i) => {
      const s = sizes[i], cx = x + s / 2, bob = i === 0 && !REDUCED ? Math.sin(t * 3) * 1.5 : 0;
      if (i === 0) additive(g, () => glow(g, cx, top + bob, s * 0.75, POT_RGB[k] || WHITE, 0.55 + 0.2 * Math.sin(t * 4)));
      bottle(g, k, cx, top + bob, s, i === 0 ? Math.sin(t * 2) * 0.12 : 0, i === 0 ? 1 : 0.8);
      x += s + gap;
    });
  }
  // Lock in: ขวดโคจรรอบตัว + แม่กุญแจทองกะพริบ
  if (o.lockIn) {
    const R = hexR * 1.35;
    for (let i = 0; i < 4; i++) {
      const an = t * 1.6 + (i / 4) * TAU, px = bx + Math.cos(an) * R, py = hy + Math.sin(an) * R * 0.45;
      bottle(g, q[i % Math.max(1, q.length)] || "base", px, py, hexR * 0.42, an, 0.9);
    }
    emoji(g, "🔒", bx + hexR * 0.85, hy - hexR * 0.85, hexR * 0.55, 0.75 + 0.25 * Math.sin(t * 5));
  }
  // calculated: ตัวเลข/เครื่องหมายคำนวณโคจร
  if (o.calc) {
    const G = ["1", "+", "7", "×", "3", "=", "π", "÷"], R = hexR * 1.55;
    g.font = `bold ${Math.max(10, hexR * 0.38) | 0}px monospace`; g.textAlign = "center"; g.textBaseline = "middle";
    G.forEach((ch, i) => {
      const an = -t * 1.1 + (i / G.length) * TAU, px = bx + Math.cos(an) * R, py = hy + Math.sin(an) * R * 0.5;
      g.fillStyle = `rgba(150,240,255,${0.55 + 0.45 * Math.sin(t * 3 + i)})`; g.fillText(ch, px, py);
    });
  }
  g.restore();
}

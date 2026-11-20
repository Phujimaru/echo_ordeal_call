// ============================================================
//  Nautilus ชั้น 4 "นครจมบาดาล" −3,000 ม. (area 49 · GRID_PLAN §8.9) — ภาพทั้งชั้น (ผู้ใช้สั่ง 2026-11-19: ภูมิประเทศจริง · มีชีวิต · มืดและน่ากลัวขึ้นตามความลึก)
//  ผัง server/fodlan/map10.js · กติกา server/fodlan/ntCity.js · ฉาก/เสียงลูกเล่น ./cityFx.js
//   เหนือ = ท่าจอดเรือปลายถนนเสาเรียง + ท่อส่งน้ำโบราณพาดขวาง (ซุ้มโค้งเดินลอดได้ ช่วงตะวันออกพังถล่ม)
//   กลาง = ลานยกสูง + วิหารขั้นบันได (ศาลบนยอด ดวงตาเทพเรืองฟ้า) · รูปปั้นเทพถือตรีศูล 4 มุม (ดวงตาหันตามทิศที่ยิงล่าสุด)
//   ตะวันตก = ย่านบ้านหินพัง (ผนังหัก กองซาก รูปปั้นล้ม) · ตะวันออก = อัฒจันทร์รอบแอ่งน้ำเกลือ (ผิวสะท้อนเป็นกระจก)
//   ใต้ = ถนนเสาเรียง + วงอักขระศักดิ์สิทธิ์ (หินตั้ง 4 มุม แท่นบูชาทะเลกลางวง) · ย่านพังที่มีรูปปั้นยักษ์ล้ม
//  แสง: มืดสนิทนอกจากเรืองฟ้าของอักขระ/ดวงตารูปปั้น/รูปปั้นเรืองแสง · ตะกอนทะเล (marine snow) ร่วงตลอด · เงาสัตว์ใหญ่ผ่านเหนือหัว
// ============================================================
import { P, PS, depthOf, faceVisible, glow, rng, sceneSize } from "../boardGeo";
import { blobAt, hash, mix, nearDist } from "./reef";
import { drawThalassaAir, drawThalassaGround } from "./thalassaArt";
import { shipFx, shipItems } from "./shipArt";
import { CITY_FX, cityFx, cityItems, cityWeather, cityWeatherGround } from "./cityFx";

const TAU = Math.PI * 2;
const K = (x, y) => `${x},${y}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const kinds = [
  "fd_nt_citywall", "fd_nt_citycol", "fd_nt_ziggurat", "fd_nt_godstatue", "fd_nt_toppled", "fd_nt_aqpier", "fd_nt_citylever", "fd_nt_lightstatue", "fd_nt_pylon", "fd_nt_seaaltar", "fd_nt_gateshut",
  "fd_nt_plaza", "fd_nt_aqspan", "fd_nt_cityrubble", "fd_nt_fallen", "fd_nt_tier", "fd_nt_flood", "fd_nt_floorrune", "fd_nt_plate", "fd_nt_citygate", "fd_nt_runering", "fd_nt_sanctum", "fd_nt_shards",
  "fd_nt_whale", "fd_nt_ship",
];
export const tall = ["fd_nt_citywall", "fd_nt_citycol", "fd_nt_ziggurat", "fd_nt_godstatue", "fd_nt_aqpier", "fd_nt_lightstatue", "fd_nt_pylon", "fd_nt_citylever"];
export const fogRGB = "5,13,21";
export const fx = CITY_FX;

// ---------- สี (น้ำลึก 3,000 ม. — น้ำเงินดำเย็น · หินเทาอมฟ้า · อักขระฟ้าเรือง) ----------
const RUNE = "90,235,255";
const BASE = {
  ground1: "#0a1822", ground2: "#01050a", tile: "rgba(0,0,0,0)", tile2: "rgba(0,0,0,0)",
  grid: "rgba(120,210,235,.06)", border: "rgba(110,220,245,.3)", spawn: "rgba(150,230,250,.3)",
  light: ["rgba(80,180,220,.03)", "rgba(0,4,10,.55)"], nightTint: null, shadow: "rgba(0,4,10,.6)",
  sky: ["#06182a", "#030c16", "#01040a"], fog: "2,8,16",
  silt: "#1d2a33", silt2: "#26343e", slab: "#3a4955", slab2: "#43535f", slabDark: "#2b3843", mortar: "#141d24",
  plaza: "#4b5b67", plaza2: "#55666f", brine: "#0d2633",
};
const PAL = { day: BASE, night: BASE };
const STONE = [74, 90, 104];
const shade = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

// ---------- ข้อมูลผัง ----------
let ZC = null;
function zones(info) {
  if (ZC && ZC.info === info) return ZC;
  const sp = new Map(), tk = info.terrainKind || {};
  for (const s of info.special || []) sp.set(K(s.x, s.y), s.kind);
  const kindAt = (x, y) => tk[K(x, y)] || sp.get(K(x, y)) || null;
  const list = (k) => { const o = []; for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) if (kindAt(x, y) === k) o.push({ x, y }); return o; };
  const Z = { info, kindAt };
  for (const [n, k] of Object.entries({ wall: "fd_nt_citywall", col: "fd_nt_citycol", zig: "fd_nt_ziggurat", god: "fd_nt_godstatue", top: "fd_nt_toppled", pier: "fd_nt_aqpier", lever: "fd_nt_citylever", lstat: "fd_nt_lightstatue", pylon: "fd_nt_pylon", altar: "fd_nt_seaaltar", plaza: "fd_nt_plaza", span: "fd_nt_aqspan", rubble: "fd_nt_cityrubble", tier: "fd_nt_tier", flood: "fd_nt_flood", rune: "fd_nt_floorrune", plate: "fd_nt_plate", gate: "fd_nt_citygate", ring: "fd_nt_runering", sanct: "fd_nt_sanctum" })) Z[n] = list(k);
  const avg = (l) => (l.length ? { x: l.reduce((s, t) => s + t.x + 0.5, 0) / l.length, y: l.reduce((s, t) => s + t.y + 0.5, 0) / l.length } : { x: 0, y: 0 });
  Z.zigC = avg(Z.zig);
  Z.ringC = Z.altar.length ? { x: Z.altar[0].x + 0.5, y: Z.altar[0].y + 0.5 } : avg(Z.ring);
  Z.arenaC = avg(Z.flood);
  Z.zigSet = new Set(Z.zig.map((t) => K(t.x, t.y)));
  ZC = Z;
  return Z;
}
// สถานะล่าสุดจาก server (drawObstacle ไม่ได้รับ fd — items/ground ตั้งให้ทุกเฟรม)
let LAST = null;
export const cityState = () => (LAST && LAST.city) || null;

// =================================================================== รูปทรงพื้นฐาน 3 มิติ
const poly = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
// กล่อง (x0..x1, y0..y1, สูง z0..z1) — วาดเฉพาะด้านที่หันเข้ากล้อง แล้วฝาบน
export function box(g, x0, y0, x1, y1, z0, z1, top, sideX, sideY) {
  const faces = [[0, 1, x0, y1, x1, y1, sideY], [0, -1, x1, y0, x0, y0, sideY], [1, 0, x1, y1, x1, y0, sideX], [-1, 0, x0, y0, x0, y1, sideX]];
  for (const [nx, ny, ax, ay, bx, by, col] of faces) {
    if (!faceVisible(nx, ny, (ax + bx) / 2, (ay + by) / 2)) continue;
    poly(g, [P(ax, ay, z0), P(bx, by, z0), P(bx, by, z1), P(ax, ay, z1)]); g.fillStyle = col; g.fill();
  }
  if (top) { poly(g, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)]); g.fillStyle = top; g.fill(); }
}
const stoneBox = (g, x0, y0, x1, y1, z0, z1, k = 1) => box(g, x0, y0, x1, y1, z0, z1, shade(STONE, 1.05 * k), shade(STONE, 0.62 * k), shade(STONE, 0.78 * k));
// ทรงกระบอกตั้ง (เรียวได้: r0 ล่าง r1 บน) · flute = ร่องเสา
export function cyl(g, cx, cy, r0, r1, z0, z1, col, n = 12, flute = false) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2, nx = Math.cos(am), ny = Math.sin(am);
    if (!faceVisible(nx, ny, cx + nx * r0, cy + ny * r0)) continue;
    const lit = 0.55 + 0.4 * Math.max(0, -nx * 0.6 - ny * 0.5 + 0.4);
    poly(g, [P(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0, z0), P(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0, z0), P(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1, z1), P(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1, z1)]);
    g.fillStyle = shade(col, lit * (flute && i % 2 ? 0.86 : 1)); g.fill();
  }
  const cap = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; cap.push(P(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, z1)); }
  poly(g, cap); g.fillStyle = shade(col, 1.08); g.fill();
}
// ทรงกระบอกนอน (แกน dx,dy) — เติมทรงเปลือกนูนของจุดที่ฉายแล้ว (มุมไหนก็ถูก)
export function logCyl(g, x0, y0, x1, y1, zc, r, col) {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, px = -(y1 - y0) / L, py = (x1 - x0) / L, pts = [];
  for (const [ex, ey] of [[x0, y0], [x1, y1]]) for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; pts.push(P(ex + px * Math.cos(a) * r, ey + py * Math.cos(a) * r, zc + Math.sin(a) * r)); }
  poly(g, hull(pts)); g.fillStyle = shade(col, 0.72); g.fill();
  // แถบสว่างด้านบน
  const t0 = P(x0, y0, zc + r * 0.85), t1 = P(x1, y1, zc + r * 0.85);
  g.strokeStyle = shade(col, 1.05); g.lineWidth = Math.max(1, t0[2] * r * 0.5); g.lineCap = "round"; g.beginPath(); g.moveTo(t0[0], t0[1]); g.lineTo(t1[0], t1[1]); g.stroke(); g.lineCap = "butt";
}
function hull(pts) {
  const p = pts.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const shadowAt = (g, x, y, rx, ry = rx * 0.4, a = 0.5) => { const [sx, sy, s] = P(x, y); g.fillStyle = `rgba(0,3,8,${a})`; g.beginPath(); g.ellipse(sx, sy, s * rx, s * ry, 0, 0, TAU); g.fill(); };
// อักขระ (ลายเส้นในวงกลม) บนพื้น
function glyph(g, cx, cy, r, seed, z = 0.01) {
  const R = rng(seed * 31 + 7);
  const ring = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU; ring.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)); }
  g.beginPath(); ring.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  for (let i = 0; i < 4; i++) {
    const a = R() * TAU, b = a + 1.5 + R() * 2, rr = r * (0.35 + R() * 0.45);
    const p0 = P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z), p1 = P(cx + Math.cos(b) * rr * 0.6, cy + Math.sin(b) * rr * 0.6, z);
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  const c = P(cx, cy, z); g.beginPath(); g.arc(c[0], c[1], c[2] * r * 0.12, 0, TAU); g.stroke();
}

// =================================================================== ธีม (อบ)
export const theme = {
  pal: PAL,
  // มวลน้ำมืด · เงานครไกล (หอคอย วิหาร ซุ้ม) หลายชั้นหมอก · รูปปั้นเทพยักษ์ครึ่งตัวจมอยู่ไกลๆ · ไฟฟ้าซีดตามหน้าต่าง
  back(c) {
    const { g, C, bY, VX0, VW, VY0 } = c;
    const gr = g.createLinearGradient(0, VY0, 0, bY + 40);
    gr.addColorStop(0, "#071d30"); gr.addColorStop(0.35, C.sky[0]); gr.addColorStop(0.8, C.sky[1]); gr.addColorStop(1, C.sky[2]);
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY + 40 - VY0);
    // แสงจางจากเบื้องบนสุด (แทบไม่ถึง)
    g.save(); g.globalCompositeOperation = "lighter";
    const lg = g.createRadialGradient(VX0 + VW * 0.5, VY0 - 120, 10, VX0 + VW * 0.5, VY0 - 120, VW * 0.6); lg.addColorStop(0, "rgba(60,140,190,.12)"); lg.addColorStop(1, "rgba(60,140,190,0)");
    g.fillStyle = lg; g.fillRect(VX0, VY0, VW, bY - VY0);
    g.restore();
    // รูปปั้นเทพยักษ์ (เงาครึ่งตัว) ด้านซ้ายไกล — ตาเรืองจาง
    { const x = VX0 + VW * 0.18, base = bY + 10, h = (bY - VY0) * 0.75, w = h * 0.34;
      g.fillStyle = "rgba(4,16,26,.85)"; g.beginPath(); g.moveTo(x - w, base); g.lineTo(x - w * 0.8, base - h * 0.55); g.quadraticCurveTo(x - w * 0.55, base - h * 0.72, x - w * 0.28, base - h * 0.74);
      g.lineTo(x - w * 0.24, base - h * 0.9); g.quadraticCurveTo(x, base - h * 1.02, x + w * 0.24, base - h * 0.9); g.lineTo(x + w * 0.28, base - h * 0.74); g.quadraticCurveTo(x + w * 0.55, base - h * 0.72, x + w * 0.8, base - h * 0.55); g.lineTo(x + w, base); g.closePath(); g.fill();
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * w * 0.1, base - h * 0.97); g.lineTo(x + i * w * 0.12, base - h * (1.08 + (i % 2 ? 0 : 0.05))); g.lineTo(x + i * w * 0.1 + w * 0.04, base - h * 0.97); g.fill(); }
      for (const ex of [-1, 1]) { const ey = base - h * 0.86; g.save(); g.globalCompositeOperation = "lighter"; const eg = g.createRadialGradient(x + ex * w * 0.09, ey, 0, x + ex * w * 0.09, ey, w * 0.12); eg.addColorStop(0, "rgba(110,230,255,.35)"); eg.addColorStop(1, "rgba(110,230,255,0)"); g.fillStyle = eg; g.fillRect(x + ex * w * 0.09 - w * 0.12, ey - w * 0.12, w * 0.24, w * 0.24); g.restore(); }
    }
    // เงานครไกล 3 ชั้น (ไกลสุดจางสุด): วิหารขั้นบันได · หอคอย · โดม · ซุ้มท่อส่งน้ำ
    const skyline = (y0, scale, col, seed, lights) => {
      const R = rng(seed);
      g.fillStyle = col;
      let x = VX0 - 40;
      while (x < VX0 + VW + 40) {
        const k = R(), w = (30 + R() * 60) * scale, h = (20 + R() * 70) * scale;
        g.beginPath();
        if (k < 0.25) { for (let i = 0; i < 4; i++) g.rect(x + i * w * 0.12, y0 - h * (i + 1) * 0.28, w - i * w * 0.24, h * 0.28); }
        else if (k < 0.5) { g.rect(x + w * 0.3, y0 - h * 1.5, w * 0.4, h * 1.5); g.moveTo(x + w * 0.25, y0 - h * 1.5); g.lineTo(x + w * 0.5, y0 - h * 1.8); g.lineTo(x + w * 0.75, y0 - h * 1.5); }
        else if (k < 0.7) { g.rect(x, y0 - h * 0.6, w, h * 0.6); g.moveTo(x, y0 - h * 0.6); g.arc(x + w / 2, y0 - h * 0.6, w / 2, Math.PI, TAU); }
        else { for (let i = 0; i < 3; i++) { g.rect(x + i * w * 0.4, y0 - h, w * 0.1, h); } g.rect(x, y0 - h, w * 0.95, h * 0.12); }
        g.fill();
        if (lights && R() < 0.35) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(${RUNE},${0.12 + R() * 0.15})`; g.fillRect(x + w * (0.3 + R() * 0.4), y0 - h * (0.3 + R() * 0.5), 2 * scale, 3 * scale); g.restore(); g.fillStyle = col; }
        x += w * (0.9 + R() * 0.6);
      }
      g.fillRect(VX0, y0 - 2, VW, bY + 40 - y0);
    };
    skyline(bY - 46, 0.7, "rgba(6,24,38,.6)", 3, true);
    skyline(bY - 22, 0.95, "rgba(4,16,27,.8)", 7, true);
    skyline(bY + 2, 1.15, "rgba(2,10,17,.95)", 11, false);
    void VY0;
  },
  // พื้นทะเลรอบกระดาน: ถนนหินของนครต่อออกไป แล้วจมหายในตะกอนมืด
  ground(c) {
    const { g, R, bY, wx0, wx1, wy1 } = c, { cols, rows } = sceneSize();
    for (let d = 24; d >= 0; d--) {
      const e = 0.4 + d * 1.2, x0 = -e, y0 = -e, x1 = cols + e, y1 = rows + e * 0.5, pts = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, side = Math.floor(u * 4), f = u * 4 - side, w = (hash(i, d) - 0.5) * 0.9;
        const p = side === 0 ? [x0 + (x1 - x0) * f, y0 + w] : side === 1 ? [x1 + w, y0 + (y1 - y0) * f] : side === 2 ? [x1 - (x1 - x0) * f, y1 + w] : [x0 + w, y1 - (y1 - y0) * f];
        pts.push(PS(p[0], p[1]));
      }
      g.fillStyle = mix("#0e1820", "#01050a", Math.min(1, 0.1 + d / 16)); poly(g, pts); g.fill();
    }
    // แผ่นหินถนนเก่าจางๆ รอบนอก (นครต่อเนื่อง)
    g.strokeStyle = "rgba(90,120,135,.05)"; g.lineWidth = 1;
    for (let y = -6; y < rows + 4; y++) for (let x = -8; x < cols + 8; x++) {
      if (x >= -0.5 && x < cols + 0.5 && y >= -0.5 && y < rows + 0.5) continue;
      if (hash(x + 50, y + 50) < 0.45) continue;
      const a = PS(x, y), b = PS(x + 1, y), cc = PS(x + 1, y + 1), dd = PS(x, y + 1);
      if (a[1] < bY) continue;
      poly(g, [a, b, cc, dd]); g.stroke();
    }
    const n = Math.min(600, Math.round((wx1 - wx0) * (wy1 + 1) * 0.35));
    for (let i = 0; i < n; i++) {
      const x = wx0 + R() * (wx1 - wx0), y = -2 + R() * (wy1 + 2);
      const [sx, sy, s] = PS(x, y); if (sy < bY) continue;
      g.fillStyle = R() < 0.5 ? "rgba(70,95,110,.16)" : "rgba(0,4,8,.35)";
      g.beginPath(); g.ellipse(sx, sy, s * (0.2 + R() * 0.5), s * (0.06 + R() * 0.08), 0, 0, TAU); g.fill();
    }
  },
  // ข้างกระดาน: ซากนคร — ตอเสา ผนังหัก หัวรูปปั้นล้ม ซุ้มโค้ง จางในหมอกตามระยะ
  side(c) {
    const { g, VX0, VX1, VW } = c, { cols, rows } = sceneSize();
    const rs = rng(91), band = 3 + Math.max(0, (VW - 1280) / 60), list = [];
    for (let i = 0; i < 70; i++) { list.push([-1.2 - rs() * band, rs() * (rows + 1) - 0.5, rs()]); list.push([cols + 0.2 + rs() * band, rs() * (rows + 1) - 0.5, rs()]); }
    for (let i = 0; i < 36; i++) list.push([rs() * (cols + 4) - 2, -1.2 - rs() * 3, rs()]);
    list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
      const [sx, sy, s] = PS(x, y); if (sx < VX0 - 120 || sx > VX1 + 120) return;
      const fog = clamp((-y + Math.max(0, -x, x - cols)) / 7, 0, 0.8);
      g.globalAlpha = 1 - fog;
      g.fillStyle = "rgba(0,3,8,.5)"; g.beginPath(); g.ellipse(sx, sy, s * 0.5, s * 0.16, 0, 0, TAU); g.fill();
      const col = mix("#0b141b", "#25313a", r * (1 - fog));
      if (r < 0.35) { // ตอเสาหัก
        const h = s * (0.8 + r * 3), w = s * 0.22;
        g.fillStyle = col; g.fillRect(sx - w, sy - h, w * 2, h);
        g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(sx - w, sy - h, w * 0.6, h);
        g.fillStyle = mix("#141f27", "#2c3843", r); g.beginPath(); g.moveTo(sx - w, sy - h); g.lineTo(sx - w * 0.2, sy - h - s * 0.15); g.lineTo(sx + w * 0.5, sy - h + s * 0.05); g.lineTo(sx + w, sy - h - s * 0.08); g.lineTo(sx + w, sy - h); g.fill();
      } else if (r < 0.6) { // ผนังหัก
        const w = s * (0.7 + r), h = s * (0.5 + r);
        g.fillStyle = col; g.beginPath(); g.moveTo(sx - w / 2, sy); g.lineTo(sx - w / 2, sy - h); g.lineTo(sx - w * 0.1, sy - h * 0.7); g.lineTo(sx + w * 0.15, sy - h * 1.1); g.lineTo(sx + w / 2, sy - h * 0.5); g.lineTo(sx + w / 2, sy); g.fill();
        g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(sx - w / 2, sy - h * k / 4); g.lineTo(sx + w / 2, sy - h * k / 4 * 0.9); g.stroke(); }
      } else if (r < 0.8) { // หัวรูปปั้นล้ม
        const rr = s * (0.35 + r * 0.3);
        g.fillStyle = col; g.beginPath(); g.ellipse(sx, sy - rr * 0.7, rr, rr * 0.8, 0.3, 0, TAU); g.fill();
        g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(sx - rr * 0.3, sy - rr * 0.85, rr * 0.14, rr * 0.08, 0.3, 0, TAU); g.ellipse(sx + rr * 0.15, sy - rr * 0.95, rr * 0.14, rr * 0.08, 0.3, 0, TAU); g.fill();
      } else { // ซุ้มโค้ง
        const w = s * 1.1, h = s * 1.6;
        g.fillStyle = col; g.beginPath(); g.moveTo(sx - w / 2, sy); g.lineTo(sx - w / 2, sy - h); g.lineTo(sx + w / 2, sy - h); g.lineTo(sx + w / 2, sy); g.lineTo(sx + w * 0.3, sy); g.lineTo(sx + w * 0.3, sy - h * 0.55); g.arc(sx, sy - h * 0.55, w * 0.3, 0, Math.PI, true); g.lineTo(sx - w * 0.3, sy); g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
    });
  },
  // พื้นกระดานทั้งผืน (อบครั้งเดียว): ตะกอน → พื้นหินปูถนน → ถนนใหญ่ → ลานวิหารยกสูง → อัฒจันทร์ → แอ่งน้ำเกลือ → วงอักขระ → อักขระ/แผ่นกด → ตะกอนทับ
  base(c) {
    const { g, C, info } = c, Z = zones(info), cols = info.cols, rows = info.rows;
    poly(g, [P(-0.2, -0.2), P(cols + 0.2, -0.2), P(cols + 0.2, rows + 0.2), P(-0.2, rows + 0.2)]); g.fillStyle = C.silt; g.fill();
    const district = (x, y) => (x < 5 && y > 3 && y < 10) || (x > 13 && y > 10) || (x < 5 && y > 11);
    const avenue = (x, y) => (x >= 8 && x <= 11 && y >= 0 && y <= 4) || y === 10;
    // 1) แผ่นหินปูพื้นทั้งนคร (แต่ละช่อง 2–4 แผ่น · ย่านพัง = หายไปบางแผ่น)
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = Z.kindAt(x, y);
      if (k === "fd_nt_flood") continue;
      const broken = district(x, y), R = rng(x * 53 + y * 17 + 3);
      const split = avenue(x, y) ? 1 : 2;
      for (let i = 0; i < split; i++) for (let j = 0; j < split; j++) {
        if (broken && R() < 0.35) continue;
        const a0 = x + i / split + 0.03, b0 = y + j / split + 0.03, a1 = x + (i + 1) / split - 0.03, b1 = y + (j + 1) / split - 0.03;
        const tint = avenue(x, y) ? C.slab2 : R() < 0.5 ? C.slab : C.slabDark;
        poly(g, [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)]); g.fillStyle = mix(tint, C.silt, broken ? 0.35 + R() * 0.3 : R() * 0.2); g.fill();
        if (R() < 0.25) { const p0 = P(a0 + R() * 0.3, b0, 0.002), p1 = P(a0 + 0.2 + R() * 0.3, b1, 0.002); g.strokeStyle = "rgba(10,16,22,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
      }
    }
    // 2) ถนนใหญ่: ขอบหินคู่ + ลายฝังกลางถนน
    g.strokeStyle = "rgba(120,160,175,.14)"; g.lineWidth = 1.4;
    for (const [a, b] of [[[8, 0], [8, 5]], [[12, 0], [12, 5]], [[0, 10], [20, 10]], [[0, 11], [20, 11]]]) { const p0 = P(a[0], a[1], 0.005), p1 = P(b[0], b[1], 0.005); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
    // 3) ลานวิหารยกสูง: ผืนหินอ่อนกว่า + ขอบขั้นบันไดเตี้ย + ลายสี่เหลี่ยมซ้อนรอบวิหาร
    if (Z.plaza.length) {
      const xs = Z.plaza.map((t) => t.x), ys = Z.plaza.map((t) => t.y);
      const x0 = Math.min(...xs, ...Z.god.map((t) => t.x)), x1 = Math.max(...xs, ...Z.god.map((t) => t.x)) + 1, y0 = Math.min(...ys), y1 = Math.max(...ys) + 1;
      box(g, x0 - 0.05, y0 - 0.05, x1 + 0.05, y1 + 0.05, -0.02, 0.06, C.plaza, "#26313a", "#2e3a44");
      for (let i = 0; i < 3; i++) { g.strokeStyle = i === 1 ? `rgba(${RUNE},.12)` : "rgba(20,28,34,.5)"; g.lineWidth = 1.2; poly(g, [P(x0 + 0.25 + i * 0.3, y0 + 0.25 + i * 0.3, 0.065), P(x1 - 0.25 - i * 0.3, y0 + 0.25 + i * 0.3, 0.065), P(x1 - 0.25 - i * 0.3, y1 - 0.25 - i * 0.3, 0.065), P(x0 + 0.25 + i * 0.3, y1 - 0.25 - i * 0.3, 0.065)]); g.stroke(); }
      g.strokeStyle = "rgba(20,28,34,.35)"; g.lineWidth = 1;
      for (let x = x0; x <= x1; x++) { const p0 = P(x, y0, 0.065), p1 = P(x, y1, 0.065); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
      for (let y = y0; y <= y1; y++) { const p0 = P(x0, y, 0.065), p1 = P(x1, y, 0.065); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
    }
    // 4) อัฒจันทร์: ขั้นโค้งรอบแอ่ง (ตัดเฉพาะช่องอัฒจันทร์) — ขอบบนสว่าง ลูกตั้งมืด
    if (Z.tier.length) {
      const ac = Z.arenaC;
      g.save(); g.beginPath();
      for (const t of Z.tier) { const q = [P(t.x, t.y), P(t.x + 1, t.y), P(t.x + 1, t.y + 1), P(t.x, t.y + 1)]; g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]); g.closePath(); }
      g.clip();
      for (let r = 4.6; r >= 1.6; r -= 0.42) {
        const ring = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU; ring.push(P(ac.x + Math.cos(a) * r, ac.y + Math.sin(a) * r * 0.95, 0.01)); }
        g.fillStyle = mix("#3d4c58", "#24303a", clamp((4.6 - r) / 3, 0, 1)); poly(g, ring); g.fill();
        g.strokeStyle = "rgba(150,190,205,.16)"; g.lineWidth = 1.2; poly(g, ring); g.stroke();
        g.strokeStyle = "rgba(4,8,12,.5)"; g.lineWidth = 2; const inner = ring.map((p) => [p[0], p[1] + 2]); poly(g, inner); g.stroke();
      }
      g.restore();
    }
    // 5) แอ่งน้ำเกลือกลางอัฒจันทร์: ผิวมืดสะท้อน + ขอบหินโค้ง
    for (const [r, col] of [[0.95, "#24323c"], [0.78, C.brine]]) for (const t of Z.flood) { blobAt(g, t.x + 0.5, t.y + 0.5, r, 0, 12, t.x * 7 + t.y, 0.12); g.fillStyle = col; g.fill(); }
    if (Z.flood.length) { // ผิวน้ำเกลือสะท้อนแสงอักขระ (ไล่จากขอบ)
      const [ax, ay, as] = P(Z.arenaC.x, Z.arenaC.y), rg = g.createRadialGradient(ax, ay, 0, ax, ay, as * 2.4);
      rg.addColorStop(0, "rgba(90,170,200,.22)"); rg.addColorStop(0.7, "rgba(60,120,150,.08)"); rg.addColorStop(1, "rgba(60,120,150,0)");
      for (const t of Z.flood) { blobAt(g, t.x + 0.5, t.y + 0.5, 0.72, 0.001, 12, t.x * 7 + t.y, 0.12); g.fillStyle = rg; g.fill(); }
    }
    // 6) วงอักขระ: แท่นวงกลม · แถบอักขระ · ลานใน
    if (Z.ring.length) {
      const { x: rx, y: ry } = Z.ringC;
      const circle = (r, z) => { const pts = []; for (let i = 0; i <= 64; i++) { const a = (i / 64) * TAU; pts.push(P(rx + Math.cos(a) * r, ry + Math.sin(a) * r, z)); } return pts; };
      box(g, rx - 2.75, ry - 2.75, rx + 2.75, ry + 2.75, -0.01, 0.0, null, "#1a242c", "#1a242c");
      poly(g, circle(2.9, 0.01)); g.fillStyle = "#33424d"; g.fill();
      poly(g, circle(2.45, 0.015)); g.fillStyle = "#1f2b34"; g.fill();
      poly(g, circle(1.55, 0.02)); g.fillStyle = "#3e4f5b"; g.fill();
      g.strokeStyle = "rgba(10,16,20,.7)"; g.lineWidth = 1.2;
      for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; const p0 = P(rx + Math.cos(a) * 1.6, ry + Math.sin(a) * 1.6, 0.02), p1 = P(rx + Math.cos(a) * 2.4, ry + Math.sin(a) * 2.4, 0.02); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
      g.strokeStyle = "rgba(20,30,36,.8)"; for (let k = 0; k < 3; k++) { poly(g, circle(0.5 + k * 0.35, 0.025)); g.stroke(); }
    }
    // 7) อักขระบนพื้น (ร่องสลัก — แสงเรืองวาดทุกเฟรมใน ground)
    g.strokeStyle = "rgba(8,14,18,.75)"; g.lineWidth = 1.5;
    for (const t of Z.rune) glyph(g, t.x + 0.5, t.y + 0.5, 0.36, t.x * 7 + t.y);
    // 8) แผ่นกด: แผ่นหินสี่เหลี่ยมร่องลึกรอบ
    for (const t of Z.plate) {
      poly(g, [P(t.x + 0.1, t.y + 0.1, 0.004), P(t.x + 0.9, t.y + 0.1, 0.004), P(t.x + 0.9, t.y + 0.9, 0.004), P(t.x + 0.1, t.y + 0.9, 0.004)]); g.fillStyle = "#0b1116"; g.fill();
      poly(g, [P(t.x + 0.16, t.y + 0.16, 0.006), P(t.x + 0.84, t.y + 0.16, 0.006), P(t.x + 0.84, t.y + 0.84, 0.006), P(t.x + 0.16, t.y + 0.84, 0.006)]); g.fillStyle = "#46555f"; g.fill();
      g.strokeStyle = "rgba(10,16,20,.6)"; g.lineWidth = 1; glyph(g, t.x + 0.5, t.y + 0.5, 0.2, t.x + t.y * 3, 0.007);
    }
    // 9) ใต้ซุ้มท่อส่งน้ำ: เงาทอดยาว · ช่องประตูหิน: ธรณีประตู
    for (const t of Z.span) { blobAt(g, t.x + 0.5, t.y + 0.5, 0.55, 0, 10, t.x, 0.1); g.fillStyle = "rgba(0,4,8,.35)"; g.fill(); }
    for (const t of Z.gate) { poly(g, [P(t.x + 0.05, t.y + 0.1, 0.004), P(t.x + 0.95, t.y + 0.1, 0.004), P(t.x + 0.95, t.y + 0.9, 0.004), P(t.x + 0.05, t.y + 0.9, 0.004)]); g.fillStyle = "#2a3640"; g.fill(); }
    // 10) ตะกอนทับเป็นปื้น (หนาขึ้นในย่านพังและขอบกระดาน)
    const R = rng(77);
    for (let i = 0; i < cols * rows * 0.45; i++) {
      const x = R() * cols, y = R() * rows, edge = Math.min(x, y, cols - x, rows - y);
      const xi = Math.floor(x), yi = Math.floor(y);
      if (nearDist(Z.plaza, x, y) < 0.8 || nearDist(Z.ring, x, y) < 0.8 || nearDist(Z.flood, x, y) < 0.9) continue;
      if (!(district(xi, yi) || edge < 1.6 || R() < 0.3)) continue;
      blobAt(g, x, y, 0.2 + R() * 0.45, 0.003, 10, i, 0.3); g.fillStyle = `rgba(30,42,50,${0.35 + R() * 0.35})`; g.fill();
    }
    // 11) เปลือกหอย/กระดูกปลาจางๆ
    for (let i = 0; i < 60; i++) { const x = R() * cols, y = R() * rows; const [sx, sy, s] = P(x, y, 0.01); g.fillStyle = R() < 0.6 ? "rgba(150,170,175,.22)" : "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(sx, sy, s * 0.04, s * 0.015, R() * 3, 0, TAU); g.fill(); }
  },
  // เส้นตารางจางมาก — ไม่ขีดทับสิ่งกีดขวาง/แอ่ง
  grid({ g, C, info }) {
    const Z = zones(info);
    g.strokeStyle = C.grid; g.lineWidth = 1;
    for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
      if ((info.terrainKind || {})[K(x, y)] || Z.kindAt(x, y) === "fd_nt_flood") continue;
      const a = P(x, y), b = P(x + 1, y), c2 = P(x + 1, y + 1);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.stroke();
    }
    return true;
  },
};

// =================================================================== สิ่งกีดขวาง (เรียงความลึกใน boardProps)
export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t, conn = t.conn || {}, cs = cityState();
  if (kind === "fd_nt_whale" || kind === "fd_nt_ship" || kind === "fd_nt_gateshut") return; // ประตูปิด = cityItems (เลื่อนลงตามฉาก)
  if (kind === "fd_nt_ziggurat") return ziggurat(g, x, y, ctx, now);
  if (kind === "fd_nt_citywall") return wall(g, x, y, conn);
  if (kind === "fd_nt_citycol") { if (cs && cs.plates && cs.plates.some((p) => p.sprung && p.col.x === x && p.col.y === y)) return; return column(g, x, y); }
  if (kind === "fd_nt_godstatue") return godStatue(g, x, y, now, cs);
  if (kind === "fd_nt_lightstatue") { if (cs && (cs.broken || []).includes(K(x, y))) return; return lightStatue(g, x, y, now); }
  if (kind === "fd_nt_toppled") return toppled(g, x, y, conn);
  if (kind === "fd_nt_aqpier") return pier(g, x, y, ctx);
  if (kind === "fd_nt_pylon") return pylon(g, x, y, now, cs);
  if (kind === "fd_nt_seaaltar") return seaAltar(g, x, y, now);
  if (kind === "fd_nt_citylever") return lever(g, x, y, now, cs);
}
// วิหารขั้นบันได: ทีละช่อง สูงตามชั้น (ขอบ = ชั้น 1 · ใน = ชั้น 2 + ศาลบนยอด) · แถบอักขระเรืองรอบขอบชั้น · บันไดหน้าทิศใต้
const H1 = 1.05, H2 = 2.05;
function ziggurat(g, x, y, ctx, now) {
  const Z = ZC; if (!Z) return;
  const has = (a, b) => Z.zigSet.has(K(a, b));
  const inner = has(x - 1, y) && has(x + 1, y) && has(x, y - 1) && has(x, y + 1);
  const H = inner ? H2 : H1, pulse = 0.55 + 0.45 * Math.sin(now / 900 + x * 0.7);
  if (!inner) shadowAt(g, x + 0.5, y + 0.5, 0.8, 0.35, 0.4);
  stoneBox(g, x, y, x + 1, y + 1, 0, H, inner ? 1 : 0.95);
  // หินก้อนใหญ่ซ้อน (เส้นรอยต่อบนด้านข้าง)
  g.strokeStyle = "rgba(10,16,22,.5)"; g.lineWidth = 1;
  for (const [nx, ny, ax, ay, bx, by] of [[0, 1, x, y + 1, x + 1, y + 1], [1, 0, x + 1, y + 1, x + 1, y], [0, -1, x + 1, y, x, y], [-1, 0, x, y, x, y + 1]]) {
    if (!faceVisible(nx, ny, (ax + bx) / 2, (ay + by) / 2)) continue;
    if ((nx && has(x + nx, y)) || (ny && has(x, y + ny))) { if (!inner) continue; }
    for (let k = 1; k < 4; k++) { const z = (H / 4) * k, p0 = P(ax, ay, z), p1 = P(bx, by, z); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
    // แถบอักขระเรืองใต้ขอบบน
    const z = H - 0.14, p0 = P(ax, ay, z), p1 = P(bx, by, z);
    g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${RUNE},${0.25 + 0.35 * pulse})`; g.lineWidth = Math.max(1.2, p0[2] * 0.03); g.setLineDash([p0[2] * 0.06, p0[2] * 0.04]); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); g.setLineDash([]); g.restore();
    g.strokeStyle = "rgba(10,16,22,.5)";
  }
  // บันไดทิศใต้ (กลางแถวล่างสุดของวิหาร)
  const maxY = Math.max(...Z.zig.map((t) => t.y));
  if (!inner && y === maxY && has(x - 1, y) && has(x + 1, y) && faceVisible(0, 1, x + 0.5, y + 1)) {
    for (let k = 0; k < 7; k++) {
      const z = (H / 7) * (k + 1), d = (6 - k) * 0.05;
      const q = [P(x + 0.1, y + 1 + d, z - H / 7), P(x + 0.9, y + 1 + d, z - H / 7), P(x + 0.9, y + 1 + d, z), P(x + 0.1, y + 1 + d, z)];
      poly(g, q); g.fillStyle = shade(STONE, 0.7 + k * 0.03); g.fill();
      poly(g, [P(x + 0.1, y + 1 + d, z), P(x + 0.9, y + 1 + d, z), P(x + 0.9, y + 1 + d - 0.05, z), P(x + 0.1, y + 1 + d - 0.05, z)]); g.fillStyle = shade(STONE, 1); g.fill();
    }
  }
  if (!inner) return;
  // ศาลบนยอด: ฐาน · เสา 2 ต้นที่มุมนอก · หลังคาแผ่นหิน · ดวงตาเทพเรืองกลางศาล (วาดครั้งเดียวที่ช่องในขวาสุด)
  stoneBox(g, x + 0.08, y + 0.1, x + 0.92, y + 0.9, H, H + 0.15, 1.08);
  const outerX = has(x - 1, y) && Z.zigSet.has(K(x - 1, y)) && !(has(x - 2, y) && has(x - 1, y - 1) && has(x - 1, y + 1)) ? x + 0.2 : x + 0.8;
  for (const cy of [y + 0.22, y + 0.78]) cyl(g, outerX, cy, 0.08, 0.07, H + 0.15, H + 1.05, STONE, 8, true);
  stoneBox(g, x + 0.02, y + 0.05, x + 0.98, y + 0.95, H + 1.05, H + 1.2, 1.15);
  const innerXs = Z.zig.filter((t) => has(t.x - 1, t.y) && has(t.x + 1, t.y) && has(t.x, t.y - 1) && has(t.x, t.y + 1)).map((t) => t.x);
  if (x === Math.max(...innerXs)) {
    const [ox, oy, s] = P(Z.zigC.x, Z.zigC.y, H + 0.6), k = 0.7 + 0.3 * Math.sin(now / 700);
    glow(g, ox, oy, s * 1.4, RUNE, 0.35 * k);
    glow(g, ox, oy, s * 0.4, "220,250,255", 0.8 * k);
    g.fillStyle = `rgba(230,252,255,${0.9 * k})`; g.beginPath(); g.ellipse(ox, oy, s * 0.11, s * 0.06, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(4,20,30,.9)"; g.beginPath(); g.ellipse(ox, oy, s * 0.025, s * 0.05, 0, 0, TAU); g.fill();
  }
  void ctx;
}
// ผนังบ้านหินพัง: เสากลาง + แขนไปทางช่องผนังข้างเคียง · ยอดหักไม่เท่ากัน
function wall(g, x, y, conn) {
  const cx = x + 0.5, cy = y + 0.5, T = 0.17;
  shadowAt(g, cx, cy, 0.6, 0.25, 0.4);
  const parts = [[cx - T, cy - T, cx + T, cy + T, 1.1 + hash(x, y) * 0.8]];
  const arm = (dx, dy, i) => { const hh = 0.6 + hash(x * 3 + i, y) * 1.1; const a = dx ? [dx > 0 ? cx + T : x, cy - T, dx > 0 ? x + 1 : cx - T, cy + T] : [cx - T, dy > 0 ? cy + T : y, cx + T, dy > 0 ? y + 1 : cy - T]; parts.push([...a, hh]); };
  if (conn.r) arm(1, 0, 1); if (conn.l) arm(-1, 0, 2); if (conn.d) arm(0, 1, 3); if (conn.u) arm(0, -1, 4);
  if (!conn.r && !conn.l && !conn.d && !conn.u) arm(hash(x, y) < 0.5 ? 1 : 0, hash(x, y) < 0.5 ? 0 : 1, 5);
  parts.sort((a, b) => depthOf((a[0] + a[2]) / 2, (a[1] + a[3]) / 2) - depthOf((b[0] + b[2]) / 2, (b[1] + b[3]) / 2));
  for (const [x0, y0, x1, y1, h] of parts) {
    stoneBox(g, x0, y0, x1, y1, 0, h, 0.85);
    // ก้อนหินหักบนยอด
    stoneBox(g, x0 + (x1 - x0) * 0.1, y0 + (y1 - y0) * 0.1, x0 + (x1 - x0) * 0.55, y0 + (y1 - y0) * 0.6, h, h + 0.12, 0.95);
  }
  // คราบสาหร่ายดำ + เพรียง
  const R = rng(x * 19 + y * 7);
  for (let i = 0; i < 5; i++) { const p = P(cx + (R() - 0.5) * 0.5, cy + (R() - 0.5) * 0.5, R() * 1.1); g.fillStyle = R() < 0.5 ? "rgba(20,40,40,.55)" : "rgba(170,180,175,.35)"; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.05, p[2] * 0.03, 0, 0, TAU); g.fill(); }
}
// เสาหินสลักร่อง: ฐานเหลี่ยม · ตัวเสาร่อง · หัวเสา (บางต้นหักยอด) · สาหร่ายห้อย
function column(g, x, y) {
  const cx = x + 0.5, cy = y + 0.5, broke = hash(x, y) < 0.35, H = broke ? 1.4 + hash(y, x) * 0.5 : 2.5;
  shadowAt(g, cx, cy, 0.42, 0.18, 0.5);
  stoneBox(g, cx - 0.32, cy - 0.32, cx + 0.32, cy + 0.32, 0, 0.18, 0.9);
  cyl(g, cx, cy, 0.22, 0.2, 0.18, H, STONE, 14, true);
  if (!broke) { stoneBox(g, cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, H, H + 0.16, 1.05); }
  else { const t = P(cx, cy, H); g.fillStyle = shade(STONE, 0.6); g.beginPath(); g.moveTo(t[0] - t[2] * 0.2, t[1]); g.lineTo(t[0] - t[2] * 0.05, t[1] - t[2] * 0.14); g.lineTo(t[0] + t[2] * 0.08, t[1] - t[2] * 0.03); g.lineTo(t[0] + t[2] * 0.2, t[1] - t[2] * 0.1); g.lineTo(t[0] + t[2] * 0.2, t[1]); g.fill(); }
  const [px, py, s] = P(cx, cy, H * 0.8);
  g.strokeStyle = "rgba(40,70,60,.7)"; g.lineWidth = 1;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(px + (i - 1) * s * 0.12, py); g.lineTo(px + (i - 1) * s * 0.13, py + s * (0.3 + hash(i, x + y) * 0.4)); g.stroke(); }
}
// รูปปั้นเทพถือตรีศูล: ฐาน · ร่างในเสื้อคลุม · ศีรษะสวมมงกุฎ · ดวงตาเรืองหันตามทิศล่าสุด (พร้อมยิง = สว่างเต้น · พัก = ริบหรี่)
function godStatue(g, x, y, now, cs) {
  const cx = x + 0.5, cy = y + 0.5;
  const st = cs && cs.statues ? cs.statues.find((s) => s.x === x && s.y === y) : null;
  const dir = st && st.dir ? st.dir : [x < 10 ? -1 : 1, 0], ready = !st || !(st.cd > 0);
  shadowAt(g, cx, cy, 0.5, 0.22, 0.5);
  stoneBox(g, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0, 0.42, 0.9);
  stoneBox(g, x + 0.16, y + 0.16, x + 0.84, y + 0.84, 0.42, 0.5, 1.05);
  // ตรีศูล (ข้างตัวด้านขวาของทิศที่หัน)
  const px = -dir[1], py = dir[0];
  const tx = cx + px * 0.26, ty = cy + py * 0.26, t0 = P(tx, ty, 0.5), t1 = P(tx, ty, 2.35);
  g.strokeStyle = "#5c6f6a"; g.lineWidth = Math.max(1.5, t0[2] * 0.035); g.beginPath(); g.moveTo(t0[0], t0[1]); g.lineTo(t1[0], t1[1]); g.stroke();
  for (const o of [-0.09, 0, 0.09]) { const a = P(tx + px * o, ty + py * o, 2.15), b = P(tx + px * o, ty + py * o, 2.4 + (o ? 0 : 0.06)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  { const a = P(tx - px * 0.1, ty - py * 0.1, 2.15), b = P(tx + px * 0.1, ty + py * 0.1, 2.15); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  // ร่าง (เสื้อคลุมทรงกรวย) + ไหล่
  cyl(g, cx, cy, 0.27, 0.17, 0.5, 1.55, [80, 96, 108], 12, true);
  cyl(g, cx, cy, 0.2, 0.2, 1.55, 1.62, [86, 102, 114], 10);
  // ศีรษะ + เครา + มงกุฎ
  const [hx, hy, s] = P(cx, cy, 1.82), r = s * 0.15;
  g.fillStyle = shade([86, 102, 114], 0.95); g.beginPath(); g.arc(hx, hy, r, 0, TAU); g.fill();
  g.fillStyle = shade([86, 102, 114], 0.7); g.beginPath(); g.moveTo(hx - r * 0.7, hy + r * 0.3); g.quadraticCurveTo(hx, hy + r * 2.1, hx + r * 0.7, hy + r * 0.3); g.fill();
  g.fillStyle = shade([96, 110, 112], 0.9);
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(hx + i * r * 0.35 - r * 0.15, hy - r * 0.8); g.lineTo(hx + i * r * 0.38, hy - r * (1.5 + (i % 2 ? 0 : 0.3))); g.lineTo(hx + i * r * 0.35 + r * 0.15, hy - r * 0.8); g.fill(); }
  // ดวงตา (ด้านที่หัน — เห็นเมื่อหันเข้ากล้อง ไม่งั้นแสงเล็ดลอดหลังศีรษะ)
  const facing = faceVisible(dir[0], dir[1], cx, cy), k = ready ? 0.65 + 0.35 * Math.sin(now / 260 + x) : 0.25;
  for (const e of [-1, 1]) {
    const [ex, ey] = P(cx + dir[0] * 0.13 + px * e * 0.06, cy + dir[1] * 0.13 + py * e * 0.06, 1.86);
    if (facing) { glow(g, ex, ey, s * 0.16, RUNE, 0.8 * k); g.fillStyle = `rgba(220,252,255,${k})`; g.beginPath(); g.arc(ex, ey, s * 0.022, 0, TAU); g.fill(); }
    else glow(g, ex, ey, s * 0.12, RUNE, 0.25 * k);
  }
}
// รูปปั้นเรืองแสง: หญิงสาวชูลูกแก้วแสง (ตีแตกได้)
function lightStatue(g, x, y, now) {
  const cx = x + 0.5, cy = y + 0.5, k = 0.75 + 0.25 * Math.sin(now / 500 + x * 2);
  shadowAt(g, cx, cy, 0.4, 0.17, 0.45);
  stoneBox(g, x + 0.2, y + 0.2, x + 0.8, y + 0.8, 0, 0.3, 0.95);
  cyl(g, cx, cy, 0.18, 0.1, 0.3, 1.25, [96, 112, 120], 10, true);
  const [hx, hy, s] = P(cx, cy, 1.38); g.fillStyle = shade([100, 116, 124], 1); g.beginPath(); g.arc(hx, hy, s * 0.09, 0, TAU); g.fill();
  for (const sd of [-1, 1]) { const a = P(cx + sd * 0.1, cy, 1.15), b = P(cx + sd * 0.05, cy, 1.75); g.strokeStyle = shade([96, 112, 120], 0.9); g.lineWidth = Math.max(1.4, s * 0.04); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  const [ox, oy] = P(cx, cy, 1.85);
  glow(g, ox, oy, s * 0.9, "170,240,255", 0.3 * k); glow(g, ox, oy, s * 0.25, "235,252,255", 0.9 * k);
  g.fillStyle = `rgba(240,253,255,${k})`; g.beginPath(); g.arc(ox, oy, s * 0.07, 0, TAU); g.fill();
}
// รูปปั้นล้ม: ช่องเดี่ยว = หัวยักษ์นอนตะแคงมีมงกุฎหัก · ช่องคู่ = ลำตัว + หัว
function toppled(g, x, y, conn) {
  const cx = x + 0.5, cy = y + 0.5, col = [70, 84, 94];
  shadowAt(g, cx, cy, 0.55, 0.25, 0.45);
  const pair = conn.u || conn.d || conn.l || conn.r;
  if (pair && (conn.u || conn.l)) { // ลำตัว (ปลายฝั่งที่ต่อ)
    const ax = conn.l ? -1 : 0, ay = conn.u ? -1 : 0;
    logCyl(g, cx + ax * 0.5, cy + ay * 0.5, cx - ax * 0.3, cy - ay * 0.3, 0.32, 0.32, col);
  }
  if (pair && (conn.d || conn.r)) { // ไหล่ต่อเข้าช่องถัดไป
    const ax = conn.r ? 1 : 0, ay = conn.d ? 1 : 0;
    logCyl(g, cx - ax * 0.1, cy - ay * 0.1, cx + ax * 0.5, cy + ay * 0.5, 0.32, 0.34, col);
    return;
  }
  // หัวยักษ์นอน
  const [hx, hy, s] = P(cx, cy, 0.38), r = s * 0.38;
  g.fillStyle = shade(col, 0.85); g.beginPath(); g.ellipse(hx, hy, r, r * 0.82, 0.25, 0, TAU); g.fill();
  g.fillStyle = shade(col, 1.05); g.beginPath(); g.ellipse(hx - r * 0.15, hy - r * 0.25, r * 0.7, r * 0.45, 0.25, 0, TAU); g.fill();
  g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.ellipse(hx - r * 0.35, hy - r * 0.2, r * 0.13, r * 0.07, 0.3, 0, TAU); g.ellipse(hx + r * 0.1, hy - r * 0.32, r * 0.13, r * 0.07, 0.3, 0, TAU); g.fill();
  g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = 1; g.beginPath(); g.moveTo(hx - r * 0.1, hy + r * 0.05); g.lineTo(hx - r * 0.05, hy + r * 0.25); g.stroke();
  g.fillStyle = shade(col, 0.75);
  for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.45; g.beginPath(); g.moveTo(hx + Math.cos(a) * r * 0.85, hy + Math.sin(a) * r * 0.7); g.lineTo(hx + Math.cos(a) * r * (1.2 + (i % 2) * 0.15), hy + Math.sin(a) * r * 1.0); g.lineTo(hx + Math.cos(a + 0.2) * r * 0.85, hy + Math.sin(a + 0.2) * r * 0.7); g.fill(); }
  g.fillStyle = "rgba(30,50,50,.5)"; g.beginPath(); g.ellipse(hx + r * 0.3, hy + r * 0.4, r * 0.3, r * 0.12, 0, 0, TAU); g.fill();
}
// ตอม่อท่อส่งน้ำ: ตอสูง + บัวหัวเสา · ฝั่งที่ช่วงข้างเคียงพัง = ซุ้มหักห้อย
function pier(g, x, y) {
  const Z = ZC, cx = x + 0.5, cy = y + 0.5, H = 2.45;
  shadowAt(g, cx, cy, 0.45, 0.25, 0.5);
  stoneBox(g, x + 0.2, y + 0.18, x + 0.8, y + 0.82, 0, H, 0.88);
  stoneBox(g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, H, H + 0.16, 1.05);
  if (!Z) return;
  for (const dx of [-1, 1]) {
    if (Z.kindAt(x + dx, y) !== "fd_nt_cityrubble") continue;
    const ex = dx > 0 ? x + 0.88 : x + 0.12;
    const pts = [P(ex, y + 0.25, H + 0.16), P(ex + dx * 0.45, y + 0.25, H + 0.16), P(ex + dx * 0.32, y + 0.25, H - 0.3), P(ex + dx * 0.15, y + 0.25, H - 0.55), P(ex, y + 0.25, H - 0.75)];
    poly(g, pts); g.fillStyle = shade(STONE, 0.7); g.fill();
  }
}
// หินตั้งอักขระ: แท่งหินเรียวยอดแหลม · อักขระฟ้าเรือง (วงพัก = ริบหรี่)
function pylon(g, x, y, now, cs) {
  const cx = x + 0.5, cy = y + 0.5, ready = !(cs && cs.ring && cs.ring.cd > 0), k = ready ? 0.6 + 0.4 * Math.sin(now / 600 + x + y) : 0.18;
  shadowAt(g, cx, cy, 0.4, 0.18, 0.5);
  stoneBox(g, cx - 0.22, cy - 0.18, cx + 0.22, cy + 0.18, 0, 1.9, 0.82);
  const top = P(cx, cy, 2.3), c4 = [P(cx - 0.22, cy - 0.18, 1.9), P(cx + 0.22, cy - 0.18, 1.9), P(cx + 0.22, cy + 0.18, 1.9), P(cx - 0.22, cy + 0.18, 1.9)];
  for (let i = 0; i < 4; i++) { poly(g, [c4[i], c4[(i + 1) % 4], top]); g.fillStyle = shade(STONE, 0.7 + (i % 2) * 0.2); g.fill(); }
  g.save(); g.globalCompositeOperation = "lighter";
  for (const [nx, ny, ax, ay, bx, by] of [[0, 1, cx - 0.22, cy + 0.18, cx + 0.22, cy + 0.18], [1, 0, cx + 0.22, cy + 0.18, cx + 0.22, cy - 0.18], [0, -1, cx + 0.22, cy - 0.18, cx - 0.22, cy - 0.18], [-1, 0, cx - 0.22, cy - 0.18, cx - 0.22, cy + 0.18]]) {
    if (!faceVisible(nx, ny, (ax + bx) / 2, (ay + by) / 2)) continue;
    g.strokeStyle = `rgba(${RUNE},${0.75 * k})`; g.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const z = 0.35 + i * 0.38, mx = (ax + bx) / 2, my = (ay + by) / 2, w = 0.08;
      const a = P(mx - (bx - ax) * w * 2, my - (by - ay) * w * 2, z), b = P(mx + (bx - ax) * w * 2, my + (by - ay) * w * 2, z + 0.12), c2 = P(mx, my, z + 0.25);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.stroke();
    }
    const m = P((ax + bx) / 2, (ay + by) / 2, 1.0); glow(g, m[0], m[1], m[2] * 0.45, RUNE, 0.18 * k);
  }
  g.restore();
}
// แท่นบูชาทะเล: อ่างหินกลม · น้ำเรืองในอ่าง · ตรีศูลเล็กกลางอ่าง · เหรียญระยิบ
function seaAltar(g, x, y, now) {
  const cx = x + 0.5, cy = y + 0.5, k = 0.7 + 0.3 * Math.sin(now / 800);
  shadowAt(g, cx, cy, 0.5, 0.22, 0.5);
  cyl(g, cx, cy, 0.36, 0.3, 0, 0.42, [78, 92, 102], 16);
  cyl(g, cx, cy, 0.44, 0.44, 0.42, 0.55, [90, 104, 114], 16);
  const ring = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU; ring.push(P(cx + Math.cos(a) * 0.36, cy + Math.sin(a) * 0.36, 0.54)); }
  poly(g, ring); g.fillStyle = `rgba(30,120,150,${0.8})`; g.fill();
  const [sx, sy, s] = P(cx, cy, 0.55); glow(g, sx, sy, s * 0.7, RUNE, 0.35 * k);
  const a = P(cx, cy, 0.55), b = P(cx, cy, 1.3); g.strokeStyle = "#a88d4a"; g.lineWidth = Math.max(1.4, s * 0.03); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  for (const o of [-0.07, 0, 0.07]) { const p0 = P(cx + o, cy, 1.18), p1 = P(cx + o, cy, 1.36 + (o ? 0 : 0.05)); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
  for (let i = 0; i < 5; i++) { const t = now / 1000 + i * 1.3, p = P(cx + Math.cos(i * 2.4) * 0.22, cy + Math.sin(i * 2.4) * 0.22, 0.555); const tw = Math.max(0, Math.sin(t * 2)); g.fillStyle = `rgba(240,210,120,${0.4 + 0.5 * tw})`; g.beginPath(); g.ellipse(p[0], p[1], s * 0.03, s * 0.015, 0, 0, TAU); g.fill(); }
}
// คันโยกในกำแพง: ตอหิน + คานทองแดงทั้งสองฝั่ง (ประตูเปิด = คานชี้ขึ้น · ปิด = ชี้ลง)
function lever(g, x, y, now, cs) {
  const cx = x + 0.5, cy = y + 0.5;
  const gate = cs && cs.gates ? cs.gates.find((q) => q.lever.x === x && q.lever.y === y) : null;
  const open = !gate || gate.open;
  shadowAt(g, cx, cy, 0.5, 0.25, 0.4);
  stoneBox(g, cx - 0.2, y, cx + 0.2, y + 1, 0, 1.25, 0.82);
  stoneBox(g, cx - 0.24, y + 0.3, cx + 0.24, y + 0.7, 0.55, 0.85, 1);
  for (const sd of [-1, 1]) {
    const base = P(cx + sd * 0.24, cy, 0.7), tip = P(cx + sd * 0.55, cy, open ? 1.15 : 0.3);
    g.strokeStyle = "#8a6a3a"; g.lineWidth = Math.max(2, base[2] * 0.05); g.lineCap = "round"; g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(tip[0], tip[1]); g.stroke(); g.lineCap = "butt";
    g.fillStyle = "#b08a4a"; g.beginPath(); g.arc(tip[0], tip[1], base[2] * 0.05, 0, TAU); g.fill();
  }
  void now;
}

// =================================================================== ของที่เรียงความลึกกับตัวละคร
export function items(list, g, fd, info, units, now, lowQ) {
  LAST = fd; const Z = zones(info);
  // กองซากหิน (ย่านพัง)
  for (const t of Z.rubble) list.push({ d: depthOf(t.x + 0.5, t.y + 0.5), f: () => rubble(g, t.x, t.y) });
  // ซุ้มโค้งท่อส่งน้ำ (ลอยเหนือหัว — วาดทับคนที่เดินลอด)
  for (const t of Z.span) list.push({ d: depthOf(t.x + 0.5, t.y + 0.5) + 0.02, f: () => arch(g, t.x, t.y, now) });
  shipItems(list, g, fd, info, now, lowQ);
  cityItems(list, g, fd, info, now, Z);
  void units;
}
function rubble(g, x, y) {
  const R = rng(x * 71 + y * 13), n = 4 + Math.floor(R() * 3), blocks = [];
  for (let i = 0; i < n; i++) { const w = 0.14 + R() * 0.16, bx = x + 0.15 + R() * (0.7 - w), by = y + 0.15 + R() * (0.7 - w); blocks.push([bx, by, bx + w, by + w * (0.7 + R() * 0.6), 0.06 + R() * 0.22]); }
  blocks.sort((a, b) => depthOf(a[0], a[1]) - depthOf(b[0], b[1]));
  for (const [x0, y0, x1, y1, h] of blocks) stoneBox(g, x0, y0, x1, y1, 0, h, 0.8 + R() * 0.25);
}
// ซุ้มโค้ง: ผนังด้านที่หันเข้ากล้อง (ใต้โค้งเป็นวงรี) + ฝาบนมีรางน้ำ
function arch(g, x, y, now) {
  const y0 = y + 0.22, y1 = y + 0.78, zt = 2.6, zs = 1.6, rise = 0.7, N = 14;
  for (const [ny, yy] of [[1, y1], [-1, y0]]) {
    if (!faceVisible(0, ny, x + 0.5, yy)) continue;
    const pts = [P(x, yy, zt), P(x + 1, yy, zt)];
    for (let i = N; i >= 0; i--) { const u = i / N; pts.push(P(x + u, yy, zs + rise * Math.sin(Math.PI * u))); }
    poly(g, pts); g.fillStyle = shade(STONE, 0.72); g.fill();
    // หินหัวซุ้ม (keystone) + แนวหินโค้ง
    g.strokeStyle = "rgba(10,16,22,.5)"; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N, p = P(x + u, yy, zs + rise * Math.sin(Math.PI * u) + 0.18); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.stroke();
    const kq = [P(x + 0.45, yy, zs + rise), P(x + 0.55, yy, zs + rise), P(x + 0.58, yy, zs + rise + 0.25), P(x + 0.42, yy, zs + rise + 0.25)]; poly(g, kq); g.fillStyle = shade(STONE, 0.9); g.fill();
  }
  // ใต้โค้ง (เห็นจากมุมต่ำ)
  poly(g, [P(x, y0, zt), P(x + 1, y0, zt), P(x + 1, y1, zt), P(x, y1, zt)]); g.fillStyle = shade(STONE, 1.02); g.fill();
  poly(g, [P(x, y + 0.36, zt + 0.005), P(x + 1, y + 0.36, zt + 0.005), P(x + 1, y + 0.64, zt + 0.005), P(x, y + 0.64, zt + 0.005)]); g.fillStyle = "#0d2230"; g.fill();
  const sh = P(x + ((now / 3000 + x * 0.3) % 1), y + 0.5, zt + 0.01); g.fillStyle = "rgba(120,200,230,.18)"; g.beginPath(); g.ellipse(sh[0], sh[1], sh[2] * 0.12, sh[2] * 0.03, 0, 0, TAU); g.fill();
}

// =================================================================== พื้นทุกเฟรม (ใต้ตัวละคร)
export function ground(g, fd, info, now, lowQ) {
  LAST = fd; const Z = zones(info), t = now / 1000, cs = fd && fd.city;
  g.save(); g.globalCompositeOperation = "lighter";
  // อักขระบนพื้น: เรือง (พร้อม) / ดับ (เพิ่งใช้)
  for (const r of Z.rune) {
    const off = cs && cs.runes && cs.runes[K(r.x, r.y)] != null, k = off ? 0.12 : 0.55 + 0.45 * Math.sin(t * 1.6 + r.x * 1.3 + r.y);
    const [sx, sy, s] = P(r.x + 0.5, r.y + 0.5, 0.01);
    glow(g, sx, sy, s * 0.7, RUNE, 0.22 * k);
    g.strokeStyle = `rgba(${RUNE},${0.7 * k})`; g.lineWidth = 1.4; glyph(g, r.x + 0.5, r.y + 0.5, 0.36, r.x * 7 + r.y, 0.012);
  }
  // วงอักขระ: แถบอักขระหมุนช้า + ลานในเรืองจาง (วงพัก = ริบหรี่)
  if (Z.ring.length) {
    const { x: rx, y: ry } = Z.ringC, cdk = cs && cs.ring && cs.ring.cd > 0 ? 0.3 : 1, rot = t * 0.15;
    for (let i = 0; i < 24; i++) {
      const a = rot + (i / 24) * TAU, k = (0.45 + 0.55 * Math.sin(t * 2 + i * 0.8)) * cdk;
      const p0 = P(rx + Math.cos(a) * 1.75, ry + Math.sin(a) * 1.75, 0.03), p1 = P(rx + Math.cos(a + 0.12) * 2.25, ry + Math.sin(a + 0.12) * 2.25, 0.03);
      g.strokeStyle = `rgba(${RUNE},${0.55 * k})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
    const circle = (r) => { g.beginPath(); for (let i = 0; i <= 60; i++) { const a = (i / 60) * TAU, p = P(rx + Math.cos(a) * r, ry + Math.sin(a) * r, 0.03); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } };
    g.strokeStyle = `rgba(${RUNE},${(0.35 + 0.2 * Math.sin(t)) * cdk})`; g.lineWidth = 1.5; circle(1.6); g.stroke(); circle(2.42); g.stroke();
    const [cx, cy, s] = P(rx, ry, 0.03); glow(g, cx, cy, s * 2.2, RUNE, 0.1 * cdk);
  }
  // ดวงตารูปปั้นเทพที่พร้อมยิง: แสงลากบนพื้นตามทิศ (อ่านทิศได้จากทุกมุม)
  for (const st of (cs && cs.statues) || []) {
    if (st.cd > 0) continue;
    const d = st.dir || [1, 0];
    for (let i = 1; i <= 3; i++) {
      const a = (0.5 + 0.5 * Math.sin(t * 3 - i)) * (1 - i / 4), [sx, sy, s] = P(st.x + 0.5 + d[0] * i, st.y + 0.5 + d[1] * i, 0.02);
      glow(g, sx, sy, s * 0.35, RUNE, 0.18 * a);
    }
  }
  // แสงจากรูปปั้นเรืองแสงบนพื้น
  for (const l of Z.lstat) { if (cs && (cs.broken || []).includes(K(l.x, l.y))) continue; const [sx, sy, s] = P(l.x + 0.5, l.y + 0.5); glow(g, sx, sy, s * 1.6, "150,230,255", 0.18 + 0.05 * Math.sin(t * 2 + l.x)); }
  // แสงดวงตาวิหารบนลาน
  if (Z.zig.length) { const [sx, sy, s] = P(Z.zigC.x, Z.zigC.y); glow(g, sx, sy, s * 4, RUNE, 0.06 + 0.02 * Math.sin(t)); }
  g.restore();
  // แอ่งน้ำเกลือ: ผิวสะท้อนเคลื่อน + ระลอก
  if (!lowQ) for (const f of Z.flood) {
    for (let i = 0; i < 2; i++) {
      const u = (t * 0.25 + hash(f.x, f.y + i)) % 1, [sx, sy, s] = P(f.x + 0.2 + u * 0.6, f.y + 0.3 + i * 0.4, 0.01);
      g.fillStyle = `rgba(120,190,220,${0.12 * Math.sin(u * Math.PI)})`; g.beginPath(); g.ellipse(sx, sy, s * 0.3, s * 0.05, 0, 0, TAU); g.fill();
    }
  }
  cityWeatherGround(g, fd, info, now, Z);
  drawThalassaGround(g, fd, info, now);
}

// =================================================================== ทับตัวละคร
const DRIFT = Array.from({ length: 3 }, (_, i) => i);
export function air(g, fd, info, units, now, lowQ, view) {
  LAST = fd; const t = now / 1000, cols = info.cols, rows = info.rows, cs = fd && fd.city;
  const X0 = view ? view.x0 : 0, W = view ? view.x1 - view.x0 : 1280, Y0 = view ? view.y0 : 0, H = view ? view.y1 - view.y0 : 720;
  // คนที่เรืองแสง (ตีรูปปั้นเรืองแสงแตก) — รัศมีแสงรอบตัว
  for (const id of (cs && cs.glow) || []) {
    const u = (units || []).find((q) => q.id === id); if (!u) continue;
    const ux = (u.rx ?? u.x) + 0.5, uy = (u.ry ?? u.y) + 0.5, [sx, sy, s] = P(ux, uy, 0.9), k = 0.8 + 0.2 * Math.sin(t * 4);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, s * 2.4, "160,235,255", 0.22 * k); glow(g, sx, sy, s * 0.6, "230,250,255", 0.3 * k); g.restore();
    for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * 1.05, [px, py] = P(ux + Math.cos(a) * 0.45, uy + Math.sin(a) * 0.45, 0.5 + 0.4 * Math.sin(t * 2 + i)); g.fillStyle = "rgba(220,250,255,.8)"; g.beginPath(); g.arc(px, py, s * 0.025, 0, TAU); g.fill(); }
  }
  // เงาสัตว์ใหญ่ว่ายผ่านเหนือนคร (ฝูงปลาไหลยาว / ปลาหมึกยักษ์) — ทุก ~14 วินาที
  if (!lowQ) for (const i of DRIFT) {
    const per = 14 + i * 5, k = ((t + i * 6.3) % per) / per;
    if (k > 0.55) continue;
    const u = k / 0.55, y = rows * (0.2 + 0.3 * i), x = -3 + (cols + 6) * u, z = 3.2 + i * 0.6;
    g.strokeStyle = "rgba(0,4,10,.5)"; g.lineWidth = P(x, y, z)[2] * 0.12; g.lineCap = "round"; g.beginPath();
    for (let j = 0; j < 14; j++) { const p = P(x - j * 0.35, y + Math.sin(t * 3 - j * 0.6) * 0.25, z); j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.stroke(); g.lineCap = "butt";
    const head = P(x, y, z); g.fillStyle = "rgba(255,200,120,.5)"; g.beginPath(); g.arc(head[0] + head[2] * 0.05, head[1] - head[2] * 0.03, head[2] * 0.025, 0, TAU); g.fill();
  }
  // ตะกอนทะเล (marine snow) ร่วงช้าๆ + จุดเรืองแสงจาง
  if (!lowQ) {
    g.fillStyle = "rgba(190,215,225,.4)";
    for (let i = 0; i < 110; i++) { const x = X0 + ((hash(i, 1) * W + Math.sin(t * 0.25 + i) * 14) % W), y = Y0 + ((hash(i, 2) * H + t * (5 + hash(i, 3) * 8)) % H); const r = 0.8 + hash(i, 4) * 1.4; g.fillRect(x, y, r, r); }
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 14; i++) { const x = X0 + ((hash(i, 7) * W + t * 6) % W), y = Y0 + hash(i, 8) * H + Math.sin(t * 0.7 + i) * 20, a = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 2); glow(g, x, y, 6, RUNE, 0.35 * a); }
    g.restore();
  }
  // ดวงตาในความมืดเหนือขอบใต้ (บางครั้ง)
  { const slot = Math.floor(t / 11), d = t - slot * 11 - hash(slot, 8) * 6;
    if (d > 0 && d < 1.8) { const a = Math.sin((d / 1.8) * Math.PI), [sx, sy, s] = P(cols * (0.15 + hash(slot, 9) * 0.7), rows + 1.6, 1.4); for (const ex of [-1, 1]) { glow(g, sx + ex * s * 0.3, sy, s * 0.25, "120,240,255", 0.7 * a); g.fillStyle = `rgba(220,255,255,${a})`; g.beginPath(); g.ellipse(sx + ex * s * 0.3, sy, s * 0.06, s * 0.025, 0, 0, TAU); g.fill(); } } }
  cityWeather(g, fd, info, now, view);
  // ขอบจอมืด (ลึก 3,000 ม.)
  const vg = g.createRadialGradient(X0 + W / 2, Y0 + H / 2, Math.min(W, H) * 0.3, X0 + W / 2, Y0 + H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,4,10,.72)"); g.fillStyle = vg; g.fillRect(X0, Y0, W, H);
  shipFx(g, fd, info, now);
  cityFx(g, fd, info, now);
}
export function bakeSpecial() {}
export function animSpecial() {}
// ทาลัสซาวาดหลังหมอกความมืด (index.js drawFodlanAir เรียก airTop ต่อจาก drawFog) — ผู้ใช้ 2026-11-19: ตัวปลาโดนหมอกความมืดบัง
export const airTop = drawThalassaAir;

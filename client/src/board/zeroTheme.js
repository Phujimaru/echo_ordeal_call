// ============================================================
//  ห่วงเวลาซีโร่ — ตัววาดฝั่ง client (GRID_PLAN §8.2 · ต้นแบบที่ผู้ใช้อนุมัติ .claude/plans/zero-time.html)
//   ธีมสนาม area 8–11 (= ระดับ 1–4 — ยิ่งใกล้ปลดผนึกยิ่งมืดหม่น):
//    back   ทะเลกระจกสะท้อนฟ้า (เมฆอนิเมะ · ดาว · กาแล็กซี) + ขอบเวทีวงใหญ่ (อบ)
//    base   เวทีหินลอยขลิบทอง + เงาสะท้อนบนผิวกระจก (อบ · หมุนตามกระดาน)
//    deco   วงเวท + อักษรมิโกะ 4 ตัวสลักกลางพื้น + ขอบทอง + เงามันวาว (อบ)
//    animBack  วงแหวนทองครึ่งหลัง · ดาววิบวับ · หมอกแดง (ระดับ 4)
//    overBoard โซ่ทองล้อมขอบเวที (ระหว่างแท่นผนึกที่ยังไม่แตก) · ของฟื้นพลังชีวิต
//    ambient   วงแหวนทองครึ่งหน้า · อนุภาค · ลำแสงจากฟ้า (lowQ ข้าม)
//   ผนึกมิโกะ (สิ่งกีดขวางชนิด "seal"): แท่นทอง + เสาแสงขึ้นฟ้า + วงหนาม + อักษรฟินิเชียน + วงโซ่ทองโคจรรอบนอก (ห้ามบังอักษร — ผู้ใช้สั่ง)
//   เอฟเฟกต์: zeroBolt (ฟ้าผ่าเฟส 4) · sealBreak (ผนึกแตก + ชิ้นโซ่ร่วง)
//   ฉากเปลี่ยนผ่าน (BoardCanvas ใช้): zeroWavePath · zeroBeam · zeroWaveRing · zeroCracks · makeShards/drawShards
// ============================================================
import { faceVisible, gEllipse, glow, P, PS, rng } from "./boardGeo";

const TAU = Math.PI * 2;
export const ZERO_AREA = 8;
export const isZeroArea = (a) => Number(a) >= ZERO_AREA && Number(a) < ZERO_AREA + 4;
export const zeroStageOf = (a) => (isZeroArea(a) ? Number(a) - ZERO_AREA + 1 : 0);
const SEA_Z = -0.95, SLAB = 0.8, PED_H = 0.75;
export const SEAL_Z = 1.75;
const RIM_R = 12.7;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeBack = (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
const hexA = (h, a) => `rgba(${hex(h)},${a})`;

// ผนึก 4 มุม (ตรงกับ server/board.js ZERO_SEALS) · อักษรฟินิเชียนตามเรื่อง: เหนือ Nun · ตะวันออก Heth · ใต้ Waw · ตะวันตก Mem
export const ZERO_GLYPH = ["nun", "heth", "waw", "mem"];
const GLYPHS = {
  nun: [[[-0.55, -0.82], [-0.12, -0.38], [0.32, -0.84], [0.06, 0.86]]],
  heth: [[[-0.42, -0.86], [-0.42, 0.86]], [[0.42, -0.86], [0.42, 0.86]], [[-0.42, -0.42], [0.42, -0.42]], [[-0.42, 0.02], [0.42, 0.02]], [[-0.42, 0.46], [0.42, 0.46]]],
  waw: [[[0.08, 0.86], [0.08, -0.2], [0.5, -0.72]], [[0.08, -0.2], [-0.38, -0.66], [-0.6, -0.42], [-0.4, -0.2]]],
  mem: [[[-0.8, -0.5], [-0.5, -0.84], [-0.2, -0.42], [0.1, -0.84], [0.42, -0.42], [0.14, 0.86]]],
};

// ---------- หน้าตาแต่ละระดับ (ยิ่งใกล้ปลดผนึกยิ่งมืดหม่น — ผู้ใช้สั่ง) ----------
const ST = {
  1: { sky: ["#f8cfe2", "#7fb2ea"], band: "#9a7ac8", cloud: ["#fdf0f6", "#ffffff", "#b79bd6"], gal: null, galA: 0, stars: .35, starCol: "255,255,255",
       stone: ["#eee8f5", "#e6def0"], seam: "rgba(110,80,140,.2)", face: ["#ddd2ea", "#8a78a6"], gold: "#d4a02e", inlay: "255,120,200", rim: "#2c2a48",
       ringCol: "#e8bb4a", ringGlow: "255,225,150", rays: "255,255,255", raysA: .1, acc: "255,105,190", mote: "white", vig: 0 },
  2: { sky: ["#b02ca4", "#1e0640"], band: null, cloud: ["#ddd64c", "#f6f28e", "#9c9a2c"], gal: ["#fffbe0", "#ffd26a", "#ff6ab8", "#8a5aff", "#40e0ff"], galA: 1, stars: 1, starCol: "255,255,255",
       stone: ["#2e1a48", "#28163f"], seam: "rgba(255,220,255,.1)", face: ["#3c2458", "#120818"], gold: "#f0c24a", inlay: "255,110,220", rim: "#120818",
       ringCol: "#f2c64a", ringGlow: "255,200,120", rays: "255,170,255", raysA: .08, acc: "255,95,200", mote: "star", vig: .15 },
  3: { sky: ["#4c1236", "#0a0418"], band: null, cloud: ["#7a5a3c", "#9c7a4c", "#3a2228"], gal: ["#ffd8c0", "#e0704a", "#a02a50", "#4a1a5a", "#2a2a6a"], galA: .5, stars: .55, starCol: "255,200,210",
       stone: ["#24101a", "#1e0d16"], seam: "rgba(255,160,160,.08)", face: ["#2c1218", "#080305"], gold: "#b8883a", inlay: "255,90,100", rim: "#080308",
       ringCol: "#b8883a", ringGlow: "255,130,90", rays: "255,120,90", raysA: .06, acc: "255,80,120", mote: "ember", vig: .45 },
  4: { sky: ["#2a0810", "#020103"], band: null, cloud: ["#2c1a20", "#40242a", "#100a0c"], gal: ["#ff9a8a", "#a02a30", "#4a0a14", "#200610", "#100408"], galA: .28, stars: .2, starCol: "255,150,150",
       stone: ["#120608", "#0e0506"], seam: "rgba(255,60,60,.07)", face: ["#180608", "#020101"], gold: "#8a5a2a", inlay: "255,45,55", rim: "#000000",
       ringCol: "#7a4a24", ringGlow: "255,50,40", rays: "255,40,40", raysA: .05, acc: "255,50,60", mote: "ash", vig: .75 },
};
export const zeroAccent = (stage) => (ST[stage] || ST[1]).acc;

// ---------- ข้อมูลฉากหลัง (สุ่มครั้งเดียว) ----------
const rSK = rng(53), rGA = rng(71), rCL = rng(13), rMO = rng(29), rTI = rng(5);
const GSTARS = Array.from({ length: 700 }, () => { const a = rSK() * TAU, r = 2 + Math.sqrt(rSK()) * 30; return [7 + Math.cos(a) * r, 7 + Math.sin(a) * r * 0.9, rSK(), rSK() * 9]; });
const GALAXY = (() => {
  const out = [], G = [-4.5, -6.5], RG = 7.5;
  for (let k = 0; k < 2600; k++) {
    const r = Math.pow(rGA(), 0.75) * RG, arm = (k % 3) * TAU / 3, n = (rGA() + rGA() + rGA() - 1.5) * 0.45;
    const a = arm + r * 0.85 + n;
    out.push([G[0] + Math.cos(a) * r, G[1] + Math.sin(a) * r * 0.8, r / RG, rGA()]);
  }
  return { pts: out, c: G };
})();
const CLOUDS = [[-4, 2.5, 2.4], [18, -1.5, 2.8], [19.5, 9.5, 2.2], [-5.5, 12.5, 2.6], [2.5, 18, 2.5], [12.5, 19, 2.9], [9.5, -7.5, 2.4], [-1.5, -4, 1.7], [16.5, 16, 1.9]]
  .map(([x, y, r]) => ({ r, puffs: Array.from({ length: 10 }, () => { const a = rCL() * TAU, d = rCL() * r * 0.62; return [x + Math.cos(a) * d * 1.3, y + Math.sin(a) * d * 0.7, r * (0.32 + rCL() * 0.3)]; }) }));
const TILE_N = Array.from({ length: 14 * 14 }, () => rTI());
const MOTES = Array.from({ length: 140 }, () => ({ x: rMO() * 18 - 2, y: rMO() * 18 - 2, z: 0.2 + rMO() * 5, p: rMO() * 9, s: 0.5 + rMO() }));
let HALFTONE = null;
function halftone() {
  if (HALFTONE || typeof document === "undefined") return HALFTONE;
  const c = document.createElement("canvas"); c.width = c.height = 6;
  const g = c.getContext("2d"); g.fillStyle = "rgba(0,0,0,.22)"; g.beginPath(); g.arc(3, 3, 1.15, 0, TAU); g.fill();
  HALFTONE = c;
  return c;
}
function lerpCol(cols, t) {
  const n = cols.length - 1, i = Math.min(n - 1, Math.floor(t * n)), k = t * n - i;
  const a = hex(cols[i]).split(",").map(Number), b = hex(cols[i + 1]).split(",").map(Number);
  return a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(",");
}
const PSZ = (x, y) => PS(x, y, SEA_Z);
function gLine(g, x1, y1, x2, y2, z = 0) { const a = P(x1, y1, z), b = P(x2, y2, z); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
function polyZ(g, pts) { g.beginPath(); pts.forEach(([x, y, z], i) => { const p = P(x, y, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); }
function cloudPath(g, puffs, dx = 0, dy = 0, k = 1) {
  g.beginPath();
  for (const [x, y, r] of puffs) { const [sx, sy, s] = PSZ(x + dx, y + dy); g.moveTo(sx + r * k * s, sy); g.ellipse(sx, sy, r * k * s, r * k * s * 0.62, 0, 0, TAU); }
}

// =================================================================== โซ่ทอง
//  ชิ้นทองรูปดาวแฉกเรียงเป็นแนวโค้ง (ตามภาพในเรื่องที่ผู้ใช้ส่งมา) — สไปรต์เดียววางซ้ำ
let GOLD = null;
function goldSprite() {
  if (GOLD || typeof document === "undefined") return GOLD;
  const c = document.createElement("canvas"); c.width = 120; c.height = 64;
  const g = c.getContext("2d"), cx = 60, cy = 32;
  g.translate(cx, cy); g.scale(0.92, 0.92); g.translate(-cx, -cy);
  const R = [56, 22, 34, 21, 27, 21, 34, 22, 56, 22, 34, 21, 27, 21, 34, 22];
  g.beginPath();
  R.forEach((r, k) => { const a = k / R.length * TAU, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.82; if (k) g.lineTo(x, y); else g.moveTo(x, y); });
  g.closePath();
  const gr = g.createLinearGradient(20, 6, 100, 58);
  gr.addColorStop(0, "#fff7c4"); gr.addColorStop(0.38, "#f4cc52"); gr.addColorStop(0.7, "#c48a1e"); gr.addColorStop(1, "#7a4c08");
  g.fillStyle = gr; g.fill();
  g.strokeStyle = "#4e3004"; g.lineWidth = 3; g.lineJoin = "round"; g.stroke();
  g.strokeStyle = "rgba(255,252,220,.85)"; g.lineWidth = 2.2; g.beginPath(); g.moveTo(14, cy - 1); g.lineTo(106, cy - 1); g.stroke();
  g.strokeStyle = "rgba(255,240,180,.6)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx, cy + 22); g.stroke();
  g.fillStyle = "#fffbe0"; g.beginPath(); g.arc(cx, cy, 4.5, 0, TAU); g.fill();
  GOLD = c;
  return c;
}
// เส้นบนจอ pts [[sx, sy, s]…] → ชิ้นทองตามความยาว
function chainPieces(pts, size) {
  const out = []; let acc = 0, next = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1, s1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
    while (next <= acc + L) {
      const k = (next - acc) / (L || 1), L0 = size * s1;
      out.push({ x: x1 + (x2 - x1) * k, y: y1 + (y2 - y1) * k, a, L: L0 });
      next += L0 * 1.05;
    }
    acc += L;
  }
  return out;
}
function drawPiece(g, p, w = 0) {
  const spr = goldSprite();
  if (!spr) return;
  g.save(); g.translate(p.x, p.y); g.rotate(p.a + w); g.drawImage(spr, -p.L / 2, -p.L * 0.27, p.L, p.L * 0.54); g.restore();
}
function drawGoldChain(g, pieces, prog = 1) {
  const n = Math.round(pieces.length * clamp01(prog));
  if (n <= 0) return;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i += 2) glow(g, pieces[i].x, pieces[i].y, pieces[i].L * 0.9, "255,200,80", 0.16);
  g.restore();
  for (let i = 0; i < n; i++) drawPiece(g, pieces[i], i % 2 ? 0.12 : -0.12);
  if (prog < 1) { const p = pieces[n - 1]; glow(g, p.x, p.y, p.L * 2.2, "255,230,150", 0.9); }
}
const sealPos = (s) => [s.x + 0.5, s.y + 0.5];
// โซ่ขอบเวที: แท่นผนึก a → แท่นผนึก b (นอกกระดานเล็กน้อย โค้งย้อย) — ยึดที่หัวแท่น (ไม่บังอักษรบนผนึก)
function edgePieces(a, b, cols) {
  const out = (p) => [p[0] + (p[0] < cols / 2 ? -0.45 : 0.45), p[1] + (p[1] < cols / 2 ? -0.45 : 0.45)];
  const [ax, ay] = out(sealPos(a)), [bx, by] = out(sealPos(b));
  const pts = [];
  for (let i = 0; i <= 80; i++) { const t = i / 80; pts.push(P(ax + (bx - ax) * t, ay + (by - ay) * t, PED_H - 0.4 * 4 * t * (1 - t))); }
  return chainPieces(pts, 0.8);
}
function haloPieces(i, sx, sy, R, s, now) {
  const pts = [], rr = R * 1.66, rot = now / 3300 + i;
  for (let j = 0; j <= 56; j++) { const a = rot + j / 56 * TAU; pts.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.9, s]); }
  return chainPieces(pts, 0.42);
}

// =================================================================== ธีม (regionThemes ใช้)
function seaBack(c, S, sv) {
  const { g, VX0, VY0, VX1, VY1 } = c, VW = VX1 - VX0;
  const [ccx, ccy] = PS(7, 7);
  const bg = g.createRadialGradient(ccx, ccy - 60, 30, ccx, ccy, 950);
  bg.addColorStop(0, S.sky[0]); bg.addColorStop(1, S.sky[1]);
  g.fillStyle = bg; g.fillRect(VX0, VY0, VW, VY1 - VY0);
  if (S.band) {
    g.save(); g.globalAlpha = 0.55; g.fillStyle = S.band;
    for (let k = 0; k < 40; k++) { const a = k / 40 * TAU, [sx, sy, s] = PSZ(7 + Math.cos(a) * (RIM_R + 1.6), 7 + Math.sin(a) * (RIM_R + 1.6)); g.beginPath(); g.ellipse(sx, sy, 1.6 * s, 0.7 * s, 0, 0, TAU); g.fill(); }
    g.restore();
  }
  for (const [x, y, k] of GSTARS) { const [sx, sy, s] = PSZ(x, y); const r = (k > 0.92 ? 0.05 : 0.025) * s; g.fillStyle = `rgba(${S.starCol},${S.stars * (0.35 + 0.65 * k)})`; g.fillRect(sx - r, sy - r * 0.7, r * 2, r * 1.4); }
  if (S.gal) {
    const [gx, gy, gs] = PSZ(GALAXY.c[0], GALAXY.c[1]);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, gx, gy, 5 * gs, lerpCol(S.gal, 0.2), 0.45 * S.galA);
    for (const [x, y, t, q] of GALAXY.pts) {
      const [sx, sy, s] = PSZ(x, y), r = (0.05 + 0.07 * q) * s;
      g.fillStyle = `rgba(${lerpCol(S.gal, Math.min(1, t * 1.1))},${(0.25 + 0.4 * q) * S.galA})`; g.fillRect(sx - r, sy - r * 0.6, r * 2, r * 1.2);
    }
    glow(g, gx, gy, 1.6 * gs, "255,250,225", 0.9 * S.galA);
    g.restore();
  }
  const [cb, ch, cs] = S.cloud, ht = halftone();
  for (const cl of CLOUDS) {
    cloudPath(g, cl.puffs, 0, 0.22 * cl.r); g.fillStyle = cs; g.fill();
    cloudPath(g, cl.puffs); g.fillStyle = cb; g.fill();
    if (ht) { g.save(); cloudPath(g, cl.puffs); g.clip(); g.fillStyle = g.createPattern(ht, "repeat"); g.fillRect(VX0, VY0, VW, VY1 - VY0); g.restore(); }
    cloudPath(g, cl.puffs, -0.08 * cl.r, -0.14 * cl.r, 0.66); g.fillStyle = ch; g.fill();
  }
  g.save(); g.globalAlpha = sv === 1 ? 0.25 : 0.12; g.lineWidth = 18;
  for (let k = -6; k < 8; k++) {
    const a = PSZ(-6 + k * 4, -8), b = PSZ(4 + k * 4, 24), gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.strokeStyle = gr; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  g.restore();
  // ขอบเวทีวงใหญ่ (แถบมืดแบบในเรื่อง)
  sEll(g, 7, 7, RIM_R); g.strokeStyle = S.rim; g.lineWidth = 12; g.stroke();
  sEll(g, 7, 7, RIM_R - 0.28); g.strokeStyle = `rgba(${S.acc},.5)`; g.lineWidth = 1.5; g.stroke();
  if (S.vig > 0) {
    const vg = g.createRadialGradient(ccx, ccy, 200, ccx, ccy, 900);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,0,${S.vig})`);
    g.fillStyle = vg; g.fillRect(VX0, VY0, VW, VY1 - VY0);
  }
}
function sEll(g, cx, cy, r, n = 160) {
  g.beginPath();
  for (let i = 0; i <= n; i++) { const a = i / n * TAU, p = PSZ(cx + Math.cos(a) * r, cy + Math.sin(a) * r); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
  g.closePath();
}
// เวทีลอย: หน้าเวที (ฝั่งที่มองเห็น) ขลิบทอง + เงาสะท้อนบนผิวกระจก + แสงใต้เวที
function stageBase(c, S) {
  const { g, info } = c, N = info.cols, M = info.rows;
  const edges = [
    { n: [0, -1], a: [0, 0], b: [N, 0] }, { n: [1, 0], a: [N, 0], b: [N, M] },
    { n: [0, 1], a: [N, M], b: [0, M] }, { n: [-1, 0], a: [0, M], b: [0, 0] },
  ].filter((e) => faceVisible(e.n[0], e.n[1], (e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2));
  const [ux, uy, us] = P(N / 2, M / 2 + 2, SEA_Z);
  g.save(); g.globalCompositeOperation = "lighter"; g.translate(ux, uy); g.scale(1, 0.45); glow(g, 0, 0, 10 * us, S.inlay, 0.32); g.restore();
  const mz = (z) => 2 * SEA_Z - z;
  for (const e of edges) {
    polyZ(g, [[e.a[0], e.a[1], mz(-SLAB)], [e.b[0], e.b[1], mz(-SLAB)], [e.b[0], e.b[1], mz(0)], [e.a[0], e.a[1], mz(0)]]);
    g.fillStyle = hexA(S.face[1], 0.4); g.fill();
  }
  for (const e of edges) {
    polyZ(g, [[e.a[0], e.a[1], 0], [e.b[0], e.b[1], 0], [e.b[0], e.b[1], -SLAB], [e.a[0], e.a[1], -SLAB]]);
    const t = P(e.a[0], e.a[1], 0), d = P(e.a[0], e.a[1], -SLAB), fg = g.createLinearGradient(0, t[1], 0, d[1]);
    fg.addColorStop(0, S.face[0]); fg.addColorStop(1, S.face[1]);
    g.fillStyle = fg; g.fill();
    g.strokeStyle = S.gold; g.lineWidth = 3;
    for (const z of [-0.06, -SLAB + 0.08]) { gLine(g, e.a[0], e.a[1], e.b[0], e.b[1], z); g.stroke(); }
    const len = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
    g.fillStyle = S.gold;
    for (let k = 0.5; k < len; k += 1) {
      const t2 = k / len, m = P(e.a[0] + (e.b[0] - e.a[0]) * t2, e.a[1] + (e.b[1] - e.a[1]) * t2, -SLAB / 2), s = m[2] * 0.13;
      g.beginPath(); g.moveTo(m[0], m[1] - s); g.lineTo(m[0] + s * 1.6, m[1]); g.lineTo(m[0], m[1] + s); g.lineTo(m[0] - s * 1.6, m[1]); g.closePath(); g.fill();
    }
  }
}
// ลายบนพื้นเวที: วงเวท + อักษรมิโกะ 4 ตัว + ขอบทอง + เงามันวาว
function stageDeco(c, S, sv) {
  const { g, info } = c, N = info.cols, M = info.rows, cx = N / 2, cy = M / 2;
  for (let y = 0; y < M; y++) for (let x = 0; x < N; x++) {
    const n = TILE_N[(y * N + x) % TILE_N.length];
    polyZ(g, [[x, y, 0], [x + 1, y, 0], [x + 1, y + 1, 0], [x, y + 1, 0]]);
    g.fillStyle = `rgba(255,255,255,${(n - 0.5) * 0.05 + 0.02})`; g.fill();
  }
  const ring = (r, w) => { gEllipse(g, cx, cy, r, 0, 160); g.lineWidth = w; g.stroke(); };
  g.save();
  g.strokeStyle = S.gold; g.shadowColor = `rgba(${S.inlay},.9)`; g.shadowBlur = 10; g.lineJoin = "round";
  ring(6.55, 3); ring(6.2, 1.4); ring(3.45, 2.4); ring(3.15, 1.2); ring(1.1, 1.6);
  for (const off of [0, Math.PI / 4]) {
    g.beginPath();
    for (let k = 0; k <= 4; k++) { const a = off + k * Math.PI / 2, p = P(cx + Math.cos(a) * 6.2, cy + Math.sin(a) * 6.2); if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    g.lineWidth = 1.8; g.stroke();
  }
  g.lineWidth = 1.2;
  for (let k = 0; k < 48; k++) { const a = k / 48 * TAU, r2 = k % 4 ? 3.32 : 3.45; gLine(g, cx + Math.cos(a) * 3.15, cy + Math.sin(a) * 3.15, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke(); }
  g.globalAlpha = 0.55; g.lineWidth = 0.8;
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; gLine(g, cx + Math.cos(a) * 1.1, cy + Math.sin(a) * 1.1, cx + Math.cos(a) * 3.15, cy + Math.sin(a) * 3.15); g.stroke(); }
  g.globalAlpha = 1;
  const marks = [[cx, cy - 4.65, "nun"], [cx + 4.65, cy, "heth"], [cx, cy + 4.65, "waw"], [cx - 4.65, cy, "mem"]];
  for (const [x, y, gname] of marks) {
    g.strokeStyle = S.gold;
    gEllipse(g, x, y, 0.78, 0, 48); g.lineWidth = 2; g.stroke();
    gEllipse(g, x, y, 0.64, 0, 48); g.lineWidth = 1; g.stroke();
    g.beginPath();
    for (const pl of GLYPHS[gname]) pl.forEach(([gx, gy], i) => { const p = P(x + gx * 0.48, y + gy * 0.48); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
    g.strokeStyle = `rgba(${S.inlay},1)`; g.lineWidth = 2.6; g.lineCap = "round"; g.stroke();
  }
  g.strokeStyle = S.gold; g.shadowBlur = 8;
  for (const [ins, w] of [[0, 4], [0.14, 1.5]]) { polyZ(g, [[ins, ins, 0], [N - ins, ins, 0], [N - ins, M - ins, 0], [ins, M - ins, 0]]); g.lineWidth = w; g.stroke(); }
  g.restore();
  g.save(); polyZ(g, [[0, 0, 0], [N, 0, 0], [N, M, 0], [0, M, 0]]); g.clip();
  const a = P(0, 0), b = P(N, M), sh = g.createLinearGradient(a[0], a[1], b[0], b[1]);
  sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(0.42, "rgba(255,255,255,0)"); sh.addColorStop(0.5, `rgba(255,255,255,${sv === 1 ? 0.22 : 0.07})`); sh.addColorStop(0.58, "rgba(255,255,255,0)");
  g.fillStyle = sh; g.fillRect(Math.min(a[0], b[0]) - 600, Math.min(a[1], b[1]) - 300, 2600, 1600); g.restore();
}
// วงแหวนทองยักษ์โคจรรอบเวที (ครึ่งหลัง = animBack · ครึ่งหน้า = ambient จางลง)
const RINGS = [{ R: 11.2, z: 1.3, tx: 0.13, ty: 0.05, sp: 0.07, beads: 20 }, { R: 12.5, z: 2.6, tx: -0.07, ty: 0.11, sp: -0.05, beads: 26 }];
function ringPoint(rg, th, cx, cy) {
  const x = Math.cos(th) * rg.R, y = Math.sin(th) * rg.R;
  const y2 = y * Math.cos(rg.tx), z2 = y * Math.sin(rg.tx);
  const x3 = x * Math.cos(rg.ty) + z2 * Math.sin(rg.ty), z3 = -x * Math.sin(rg.ty) + z2 * Math.cos(rg.ty);
  return [cx + x3, cy + y2, rg.z + z3];
}
function drawRings(g, S, front, now, cx, cy) {
  const spr = goldSprite();
  g.save(); g.lineCap = "round"; if (front) g.globalAlpha = 0.5;
  const t = now / 1000;
  for (const rg of RINGS) {
    const n = 140;
    for (let i = 0; i < n; i++) {
      const a = ringPoint(rg, i / n * TAU, cx, cy), b = ringPoint(rg, (i + 1) / n * TAU, cx, cy);
      if ((a[1] > cy) !== front) continue;
      const pa = P(a[0], a[1], a[2]), pb = P(b[0], b[1], b[2]);
      g.beginPath(); g.moveTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]);
      g.strokeStyle = `rgba(${S.ringGlow},.22)`; g.lineWidth = 0.26 * pa[2]; g.stroke();
      g.strokeStyle = S.ringCol; g.lineWidth = 0.07 * pa[2]; g.stroke();
      g.strokeStyle = "rgba(255,250,220,.7)"; g.lineWidth = 0.02 * pa[2]; g.stroke();
    }
    if (!spr) continue;
    for (let k = 0; k < rg.beads; k++) {
      const th = k / rg.beads * TAU + t * rg.sp, p = ringPoint(rg, th, cx, cy);
      if ((p[1] > cy) !== front) continue;
      const q = ringPoint(rg, th + 0.01, cx, cy), pp = P(p[0], p[1], p[2]), qq = P(q[0], q[1], q[2]), L = 0.75 * pp[2];
      g.save(); g.translate(pp[0], pp[1]); g.rotate(Math.atan2(qq[1] - pp[1], qq[0] - pp[0])); g.drawImage(spr, -L / 2, -L * 0.27, L, L * 0.54); g.restore();
    }
  }
  g.restore();
}
function drawRays(g, S, view, now) {
  const VX0 = view.x0, VY0 = view.y0, VW = view.x1 - view.x0, VH = view.y1 - view.y0, t = now / 1000;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let k = 0; k < 5; k++) {
    const x0 = VX0 + VW * (0.08 + 0.2 * k) + Math.sin(t * 0.25 + k * 1.7) * 50, w = 40 + 30 * (k % 2);
    const gr = g.createLinearGradient(0, VY0, 0, VY0 + VH);
    gr.addColorStop(0, `rgba(${S.rays},${S.raysA * (0.6 + 0.4 * Math.sin(t * 0.7 + k))})`); gr.addColorStop(1, `rgba(${S.rays},0)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w, VY0); g.lineTo(x0 + w, VY0); g.lineTo(x0 + w * 6 + 160, VY0 + VH); g.lineTo(x0 + w * 2 + 160, VY0 + VH); g.closePath(); g.fill();
  }
  g.restore();
}
function drawPickup(g, q, now) {
  const [sx, sy, s] = P(q.x + 0.5, q.y + 0.5, 0.55 + Math.sin(now / 450 + q.x) * 0.12), [gx, gy] = P(q.x + 0.5, q.y + 0.5);
  g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(gx, gy, 0.22 * s, 0.08 * s, 0, 0, TAU); g.fill();
  glow(g, sx, sy, 0.7 * s, "120,255,170", 0.55);
  const a = 0.1 * s, b = 0.3 * s;
  g.fillStyle = "#c8ffd8"; g.fillRect(sx - a, sy - b, a * 2, b * 2); g.fillRect(sx - b, sy - a, b * 2, a * 2);
  g.strokeStyle = "rgba(20,90,50,.6)"; g.lineWidth = 1; g.strokeRect(sx - a, sy - b, a * 2, b * 2); g.strokeRect(sx - b, sy - a, b * 2, a * 2);
}

function makeTheme(sv) {
  const S = ST[sv];
  const C = {
    ground1: S.sky[0], ground2: S.sky[1], tile: S.stone[0], tile2: S.stone[1], grid: S.seam, border: S.gold,
    spawn: "rgba(0,0,0,0)", light: ["rgba(0,0,0,0)", "rgba(0,0,0,0)"], nightTint: null, shadow: "rgba(0,0,0,.3)",
    accent: `rgb(${S.inlay})`, dots: ["#ffffff"], leaf: "#000", foreAcc: "#000",
  };
  return {
    pal: { day: C, night: C },
    zeroStage: sv,
    back: (c) => seaBack(c, S, sv),
    ground() {},
    side() {},
    base: (c) => stageBase(c, S),
    deco: (c) => stageDeco(c, S, sv),
    animBack(g, f, t) {
      const cx = f.info.cols / 2, cy = f.info.rows / 2;
      if (S.stars > 0.3) {
        for (let k = 0; k < 80; k++) {
          const [x, y, , p] = GSTARS[k * 7], tw = Math.max(0, Math.sin(t / 500 + p * 3));
          if (tw <= 0.6) continue;
          const [sx, sy, s] = PSZ(x, y), r = 0.07 * s;
          g.fillStyle = `rgba(${S.starCol},${S.stars * (tw - 0.6) * 2.5})`; g.fillRect(sx - r * 2, sy - 0.5, r * 4, 1); g.fillRect(sx - 0.5, sy - r * 2, 1, r * 4);
        }
      }
      if (sv === 4) { const [mx, my] = P(cx, cy); glow(g, mx, my, 700, "120,10,20", 0.18 + 0.08 * Math.sin(t / 650)); }
      drawRings(g, S, false, t, cx, cy);
    },
    // บนพื้นเวที ใต้ตัวละคร: โซ่ทองขอบเวที (ระหว่างผนึกที่ยังไม่แตก) + ของฟื้นพลังชีวิต
    overBoard(g, f, t) {
      const z = f.zero, anim = f.zeroAnim || {};
      const seals = z && Array.isArray(z.seals) ? z.seals : null;
      if (seals && seals.length === 4) {
        for (let k = 0; k < 4; k++) {
          const a = seals[k], b = seals[(k + 1) % 4];
          if (a.broken || b.broken) continue;
          const prog = anim.edges == null ? 1 : anim.edges[k];
          if (prog > 0) drawGoldChain(g, edgePieces(a, b, f.info.cols), prog);
        }
      }
      if (z && Array.isArray(z.pickups)) for (const q of z.pickups) drawPickup(g, q, t);
    },
    ambient(g, f, t) {
      const cx = f.info.cols / 2, cy = f.info.rows / 2;
      drawRings(g, S, true, t, cx, cy);
      const tt = t / 1000;
      for (const m of MOTES) {
        let { x, y, z } = m, col, size = 1;
        if (S.mote === "white") { z = (m.z + tt * 0.15 * m.s) % 5.2; col = "255,255,255"; }
        else if (S.mote === "star") col = "255,240,255";
        else if (S.mote === "ember") { z = (m.z + tt * 0.4 * m.s) % 5.2; col = "255,120,80"; }
        else { z = 5.2 - ((5.2 - m.z + tt * 0.3 * m.s) % 5.2); x += Math.sin(tt * 0.5 + m.p) * 0.4; col = m.s > 1.2 ? "255,60,60" : "120,110,120"; size = 1.5; }
        const [sx, sy, s] = P(x, y, z), tw = 0.4 + 0.6 * Math.abs(Math.sin(tt * 1.4 + m.p));
        g.fillStyle = `rgba(${col},${0.8 * tw})`; g.fillRect(sx - size, sy - size, size * 2, size * 2);
        if (m.s > 1.3 && S.mote !== "ash") glow(g, sx, sy, 0.12 * s, col, 0.35 * tw);
      }
      drawRays(g, S, f.view, t);
    },
  };
}
export const ZERO_THEMES = { 8: makeTheme(1), 9: makeTheme(2), 10: makeTheme(3), 11: makeTheme(4) };

// =================================================================== ผนึก (สิ่งกีดขวางชนิด "seal")
function drawGlyph(g, name, cx, cy, sc, lw, rgb, a) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); for (const pl of GLYPHS[name]) pl.forEach(([x, y], i) => (i ? g.lineTo(cx + x * sc, cy + y * sc) : g.moveTo(cx + x * sc, cy + y * sc))); };
  g.shadowColor = `rgba(${rgb},${a})`; g.shadowBlur = lw * 2.2;
  path(); g.strokeStyle = `rgba(${rgb},${0.55 * a})`; g.lineWidth = lw; g.stroke();
  g.shadowBlur = 0; path(); g.strokeStyle = `rgba(255,240,250,${a})`; g.lineWidth = lw * 0.34; g.stroke();
  g.restore();
}
function drawPedestal(g, tx, ty, S) {
  const r = 0.3, h = PED_H;
  gEllipse(g, tx, ty, 0.5, 0, 40); g.fillStyle = S.face[1]; g.fill(); g.strokeStyle = S.gold; g.lineWidth = 2; g.stroke();
  const bl = P(tx - r, ty, 0), br = P(tx + r, ty, 0), tl = P(tx - r, ty, h), tr = P(tx + r, ty, h);
  const gr = g.createLinearGradient(bl[0], 0, br[0], 0);
  gr.addColorStop(0, "#5a3c10"); gr.addColorStop(0.35, S.gold); gr.addColorStop(0.55, "#fff2c0"); gr.addColorStop(1, "#6a4810");
  g.beginPath(); g.moveTo(bl[0], bl[1]); g.lineTo(br[0], br[1]); g.lineTo(tr[0], tr[1]); g.lineTo(tl[0], tl[1]); g.closePath(); g.fillStyle = gr; g.fill();
  gEllipse(g, tx, ty, r * 1.25, h, 40); g.fillStyle = "#fff0b8"; g.fill(); g.strokeStyle = "#6a4810"; g.lineWidth = 1.5; g.stroke();
  gEllipse(g, tx, ty, r * 0.8, h + 0.01, 40); g.fillStyle = `rgba(${S.inlay},.85)`; g.fill();
}
// ctx = { area, zero: { seals }, zeroAnim: { seals: [prog], halo: [prog] }, hitT } · t = { x, y }
export function drawZeroSeal(g, t, ctx, now) {
  const sv = zeroStageOf(ctx.area) || 1, S = ST[sv];
  const tx = t.x + 0.5, ty = t.y + 0.5;
  drawPedestal(g, tx, ty, S);
  const seals = ctx.zero && Array.isArray(ctx.zero.seals) ? ctx.zero.seals : [];
  const i = seals.findIndex((s) => s.x === t.x && s.y === t.y);
  const seal = seals[i];
  if (!seal || seal.broken) return;
  const anim = ctx.zeroAnim || {};
  const prog = anim.seals ? clamp01(anim.seals[i]) : 1;
  if (prog <= 0) return;
  const tt = now / 1000, rot = tt * 0.35 + i;
  const hitAge = ctx.hitT && ctx.hitT.get ? now - (ctx.hitT.get(`seal:${i}`) || -1e9) : 1e9;
  const shake = hitAge < 380 ? 6 * (1 - hitAge / 380) : 0;
  const bob = Math.sin(tt * 1.6 + i) * 0.06;
  const [, py] = P(tx, ty, PED_H), [sx0, sy0, s] = P(tx, ty, SEAL_Z + bob);
  const sx = sx0 + (Math.random() - 0.5) * shake, sy = sy0 + (Math.random() - 0.5) * shake;
  const R = 0.8 * s * easeBack(prog);
  // เสาแสงขึ้นฟ้า
  g.save(); g.globalCompositeOperation = "lighter";
  const top = py - 2000, w = 0.46 * s * (0.85 + 0.15 * Math.sin(tt * 3 + i)) * prog;
  let gr = g.createLinearGradient(0, py, 0, top);
  gr.addColorStop(0, `rgba(${S.acc},${0.55 * prog})`); gr.addColorStop(0.35, `rgba(${S.acc},${0.18 * prog})`); gr.addColorStop(1, `rgba(${S.acc},0)`);
  g.fillStyle = gr; g.fillRect(sx - w, top, w * 2, py - top);
  gr = g.createLinearGradient(0, py, 0, top); gr.addColorStop(0, `rgba(255,255,255,${0.6 * prog})`); gr.addColorStop(0.5, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(sx - w * 0.14, top, w * 0.28, py - top);
  g.restore();
  glow(g, sx, sy, R * 2.1, S.acc, 0.35 * prog);
  const N = 54;
  for (let k = 0; k < N; k++) {
    const a = k / N * TAU + rot * 0.4, len = R * (k % 3 === 0 ? 0.42 : k % 3 === 1 ? 0.24 : 0.3), ww = 0.045;
    g.beginPath(); g.moveTo(sx + Math.cos(a - ww) * R * 0.98, sy + Math.sin(a - ww) * R * 0.98);
    g.lineTo(sx + Math.cos(a) * (R + len), sy + Math.sin(a) * (R + len)); g.lineTo(sx + Math.cos(a + ww) * R * 0.98, sy + Math.sin(a + ww) * R * 0.98); g.closePath();
    g.fillStyle = k % 3 === 0 ? `rgba(255,236,248,${0.9 * prog})` : `rgba(210,190,215,${0.75 * prog})`; g.fill();
  }
  const disc = g.createRadialGradient(sx, sy, 0, sx, sy, R);
  disc.addColorStop(0, "rgba(60,30,50,.96)"); disc.addColorStop(1, "rgba(24,14,22,.96)");
  g.fillStyle = disc; g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.fill();
  g.strokeStyle = `rgba(255,230,245,${prog})`; g.lineWidth = 0.06 * s; g.stroke();
  g.strokeStyle = `rgba(${S.acc},${0.7 * prog})`; g.lineWidth = 0.025 * s; g.beginPath(); g.arc(sx, sy, R * 0.84, 0, TAU); g.stroke();
  drawGlyph(g, ZERO_GLYPH[i] || "nun", sx, sy, R * 0.6, 0.2 * s, S.acc, prog * (0.8 + 0.2 * Math.sin(tt * 4 + i)));
  // รอยร้าวตามความเสียหาย (เลือด/เกราะที่หายไป)
  const lost = (seal.maxHp || 3) + (seal.maxArmor || 2) - (seal.hp || 0) - (seal.armor || 0);
  if (lost > 0) {
    const r = rng(i * 999 + 1);
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 0.025 * s;
    for (let k = 0; k < Math.min(7, lost * 2); k++) {
      let a = r() * TAU, qx = sx, qy = sy; const L = R * 0.95;
      g.beginPath(); g.moveTo(qx, qy);
      for (let j = 0; j < 4; j++) { a += (r() - 0.5) * 0.9; qx += Math.cos(a) * L / 4; qy += Math.sin(a) * L / 4; g.lineTo(qx, qy); }
      g.stroke();
    }
  }
  // วงโซ่ทองโคจรรอบนอกหนาม (ไม่ผ่านหน้าอักษร)
  const wrap = anim.halo ? clamp01(anim.halo[i]) : 1;
  if (wrap > 0) drawGoldChain(g, haloPieces(i, sx, sy, R, s, now), easeOut(wrap));
  // เลือด 3 · เกราะ 2 (ไอคอน)
  const hp = seal.hp ?? 3, ar = seal.armor ?? 2, mh = seal.maxHp || 3, ma = seal.maxArmor || 2, qy = sy - R * 1.66 - 0.34 * s;
  for (let k = 0; k < mh + ma; k++) {
    const qx = sx + (k - (mh + ma - 1) / 2) * 0.24 * s, on = k < mh ? k < hp : k - mh < ar, d = 0.08 * s;
    g.beginPath(); g.moveTo(qx, qy - d); g.lineTo(qx + d, qy); g.lineTo(qx, qy + d); g.lineTo(qx - d, qy); g.closePath();
    g.fillStyle = on ? (k < mh ? "#ff5f7a" : "#7fb8ff") : "rgba(255,255,255,.18)"; g.fill();
    g.strokeStyle = "rgba(0,0,0,.55)"; g.lineWidth = 1; g.stroke();
  }
}

// =================================================================== เอฟเฟกต์ครั้งเดียว
export const ZERO_FX_DUR = { zeroBolt: 1300, sealBreak: 1500 };
// ฟ้าผ่า (เฟส 4): e = { tiles: [{x,y}], t0 } — ลงทีละสาย ห่างกัน 170ms
export function zeroBoltFx(g, e, now) {
  const tiles = Array.isArray(e.tiles) ? e.tiles : [];
  tiles.forEach((t, k) => {
    const age = now - e.t0 - k * 170;
    if (age < 0 || age > 900) return;
    const p = age / 900, a = p < 0.12 ? p / 0.12 : 1 - (p - 0.12) / 0.88;
    const [gx, gy, s] = P(t.x + 0.5, t.y + 0.5, 0);
    const r = rng((t.x + 1) * 97 + (t.y + 1) * 31 + k);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, gx, gy, 2.2 * s, "255,90,90", 0.8 * a);
    for (const [w, col] of [[0.5 * s, `rgba(255,60,60,${0.35 * a})`], [0.24 * s, `rgba(255,120,120,${0.6 * a})`], [0.09 * s, `rgba(255,245,245,${a})`]]) {
      g.beginPath(); let x = gx + (r() - 0.5) * 40, y = gy - 900; g.moveTo(x, y);
      const r2 = rng((t.x + 3) * 13 + (t.y + 5) * 7 + k);
      for (let j = 1; j <= 12; j++) { x = gx + (r2() - 0.5) * 34 * (1 - j / 12); y = gy - 900 + 900 * j / 12; g.lineTo(x, y); }
      g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "round"; g.stroke();
    }
    g.restore();
    gEllipse(g, t.x + 0.5, t.y + 0.5, 0.2 + p * 0.9, 0.02, 32);
    g.strokeStyle = `rgba(255,200,200,${a})`; g.lineWidth = 2.5; g.stroke();
  });
}
// ผนึกแตก: e = { x, y, i, stage, t0 } — เศษหนาม/แผ่นผนึกกระจาย + ชิ้นโซ่ทองร่วง + แสงวาบ
export function sealBreakFx(g, e, now) {
  const age = now - e.t0, p = age / ZERO_FX_DUR.sealBreak;
  if (p < 0 || p > 1) return;
  const S = ST[e.stage] || ST[1];
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, SEAL_Z);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, sx, sy, 3.2 * s * (0.4 + p), "255,230,245", Math.max(0, 1 - p * 2.2));
  g.restore();
  const r = rng((e.i + 1) * 4211), grav = 900 / 1e6, t = age;
  for (let k = 0; k < 46; k++) {
    const a = r() * TAU, v = (0.12 + r() * 0.42) * s / 60, size = (4 + r() * 10) * s / 60, rot = r() * 6 + t * (r() - 0.5) * 0.012;
    const x = sx + Math.cos(a) * v * t, y = sy + Math.sin(a) * v * t - 0.12 * t + grav * t * t;
    g.save(); g.globalAlpha = 1 - p; g.translate(x, y); g.rotate(rot);
    g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.5, size * 0.6); g.lineTo(-size * 0.4, size * 0.4); g.closePath();
    g.fillStyle = k % 2 ? "#ffffff" : `rgb(${S.acc})`; g.fill(); g.restore();
  }
  // ชิ้นโซ่ทอง (วงรอบผนึก) ร่วงลง
  const R = 0.8 * s;
  for (let k = 0; k < 18; k++) {
    const a = k / 18 * TAU, x0 = sx + Math.cos(a) * R * 1.66, y0 = sy + Math.sin(a) * R * 1.5;
    const vx = (r() - 0.5) * 0.18, x = x0 + vx * t, y = y0 - 0.1 * t + 0.0011 * t * t;
    g.save(); g.globalAlpha = 1 - p; drawPiece(g, { x, y, a: a + Math.PI / 2 + t * 0.004 * (k % 2 ? 1 : -1), L: 0.42 * s }); g.restore();
  }
}

// =================================================================== ฉากเปลี่ยนผ่าน (BoardCanvas)
//  ฉากทั้งหมดอยู่ในพิกัดตรรกะ (transform ของ view ตั้งไว้แล้ว) — กล้อง/หมุนตามกระดานปัจจุบัน
export const ZERO_SCENE_MS = { enter: 8000, break: 3300, release: 4600 };
export const segT = (t, a, b) => clamp01((t - a) / (b - a));
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function hull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// พื้นที่บนจอที่คลื่นวงกลม (ศูนย์ cx, cy รัศมี r ช่อง) กลืนแล้ว — วงบนพื้น + วงสูง 3 ช่อง
export function zeroWavePath(g, cx, cy, r, rows) {
  const pts = [];
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * TAU, x = cx + Math.cos(a) * r, y = Math.max(-12, Math.min(rows + 12, cy + Math.sin(a) * r));
    pts.push(P(x, y, 0), P(x, y, 3));
  }
  const h = hull(pts);
  g.beginPath(); h.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
}
export function zeroWaveRing(g, cx, cy, r, a, rgb) {
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = "lighter";
  for (const [z, al, lw] of [[0, 1, 7], [0.35, 0.55, 4], [0.9, 0.35, 3], [1.7, 0.2, 2], [2.8, 0.1, 2]]) {
    gEllipse(g, cx, cy, r, z, 96); g.strokeStyle = `rgba(${rgb},${al * a})`; g.lineWidth = lw; g.stroke();
  }
  gEllipse(g, cx, cy, r, 0, 96); g.strokeStyle = `rgba(255,255,255,${0.8 * a})`; g.lineWidth = 2; g.stroke();
  g.restore();
}
// ลำแสงพลังงานพุ่งขึ้นเป็นเส้นตรงกลางสนาม
export function zeroBeam(g, cx, cy, h, w, a) {
  if (a <= 0) return;
  const [bx, by, s] = P(cx, cy, 0), [, ty] = P(cx, cy, 26 * h);
  g.save(); g.globalCompositeOperation = "lighter";
  const W1 = (14 + 40 * w) * s / 60, gr = g.createLinearGradient(bx - W1, 0, bx + W1, 0);
  gr.addColorStop(0, "rgba(255,90,180,0)"); gr.addColorStop(0.5, `rgba(255,120,200,${0.55 * a})`); gr.addColorStop(1, "rgba(255,90,180,0)");
  g.fillStyle = gr; g.fillRect(bx - W1, ty, W1 * 2, by - ty);
  const W2 = (2 + 6 * w) * s / 60;
  g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(bx - W2, ty, W2 * 2, by - ty);
  g.fillStyle = `rgba(255,170,225,${0.7 * a})`; g.beginPath(); g.ellipse(bx, by, (1.2 + 2 * w) * s, (1.2 + 2 * w) * s * 0.53, 0, 0, TAU); g.fill();
  glow(g, bx, by, (2 + 3 * w) * s, "255,150,215", 0.6 * a);
  g.restore();
}
// รอยร้าวทั้งจอจากจุดเดียว (ปลดผนึก)
export function zeroCracks(g, ox, oy, k) {
  if (k <= 0) return;
  const r = rng(9001);
  g.save(); g.strokeStyle = "rgba(255,255,255,.95)"; g.shadowColor = "#ffb3e0"; g.shadowBlur = 12; g.lineWidth = 2.2;
  for (let n = 0; n < 16; n++) {
    let a = n / 16 * TAU + r() * 0.3, px = ox, py = oy; const L = (500 + r() * 900) * k;
    g.beginPath(); g.moveTo(px, py);
    for (let j = 0; j < 7; j++) { a += (r() - 0.5) * 0.5; px += Math.cos(a) * L / 7; py += Math.sin(a) * L / 7; g.lineTo(px, py); }
    g.stroke();
  }
  g.restore();
}
// เศษกระจกของภาพนิ่ง (ปลดผนึก): สามเหลี่ยมปูเต็มส่วนที่มองเห็น พุ่งออกจาก (ox, oy) แล้วร่วง
export function makeShards(view, ox, oy) {
  const vx = view.x0, vy = view.y0, vw = view.x1 - view.x0, vh = view.y1 - view.y0, nx = 9, ny = 6, r = rng(77), pts = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const edge = i === 0 || j === 0 || i === nx || j === ny;
    pts.push([vx + vw * i / nx + (edge ? 0 : (r() - 0.5) * vw / nx * 0.7), vy + vh * j / ny + (edge ? 0 : (r() - 0.5) * vh / ny * 0.7)]);
  }
  const out = [];
  const add = (a, b, d) => {
    const mx = (a[0] + b[0] + d[0]) / 3, my = (a[1] + b[1] + d[1]) / 3, dx = mx - ox, dy = my - oy, L = Math.hypot(dx, dy) || 1;
    out.push({ pts: [a, b, d], mx, my, vx: dx / L * (120 + r() * 260), vy: dy / L * (80 + r() * 200) - 160, vr: (r() - 0.5) * 2.4, delay: L / 2400 });
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = pts[j * (nx + 1) + i], b = pts[j * (nx + 1) + i + 1], d = pts[(j + 1) * (nx + 1) + i + 1], e = pts[(j + 1) * (nx + 1) + i];
    if ((i + j) % 2) { add(a, b, d); add(a, d, e); } else { add(a, b, e); add(b, d, e); }
  }
  return out;
}
// วาดเศษ (k = วินาทีหลังแตก) · img = ภาพนิ่งเต็มส่วนที่มองเห็น
export function drawShards(g, shards, img, view, k) {
  const vx = view.x0, vy = view.y0, vw = view.x1 - view.x0, vh = view.y1 - view.y0;
  for (const sh of shards) {
    const tt = Math.max(0, k - sh.delay), a = 1 - clamp01(tt / 1.3);
    if (a <= 0) continue;
    g.save(); g.globalAlpha = a;
    g.translate(sh.mx + sh.vx * tt, sh.my + sh.vy * tt + 900 * tt * tt); g.rotate(sh.vr * tt); g.translate(-sh.mx, -sh.my);
    g.beginPath(); sh.pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip();
    g.drawImage(img, vx, vy, vw, vh);
    g.strokeStyle = "rgba(255,220,240,.8)"; g.lineWidth = 2; g.stroke();
    g.restore();
  }
}
// ความคืบหน้าของของในฉากเข้า (ผนึกติดไฟ · โซ่ขอบ · วงโซ่) ตามเวลาฉาก t (ms) — นอกฉาก = null (เต็ม)
export function enterAnim(tMs) {
  const t = tMs / 1000;
  return {
    edges: [0, 1, 2, 3].map((i) => easeInOut(segT(t, 3.4 + i * 0.12, 4.5 + i * 0.12))),
    seals: [0, 1, 2, 3].map((i) => segT(t, 4.3 + i * 0.18, 4.8 + i * 0.18)),
    halo: [0, 1, 2, 3].map((i) => segT(t, 5.0 + i * 0.12, 5.6 + i * 0.12)),
  };
}

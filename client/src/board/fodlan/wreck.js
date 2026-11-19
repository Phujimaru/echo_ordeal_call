// ============================================================
//  Nautilus ชั้น 2 "ซากเรือรบ" −200 ม. (area 47 · GRID_PLAN §8.9) — ภาพทั้งชั้น · ผัง server/fodlan/map8.js
//  ภูมิประเทศ: เรือรบยักษ์ลำเดียวหักกลางลำจมบนพื้นตะกอน (ไม่ใช่ของวางกระจาย)
//   หัวเรือ (ตะวันตกเฉียงเหนือ) + ท้ายเรือ/ห้องเครื่อง (ตะวันออกเฉียงใต้) = ผนังเหล็กสนิมหนา หมุดย้ำ โครงซี่โครงเรือโผล่ตรงรอยหัก
//   ทุ่งซากระหว่างสองท่อน (ไม้กระดาน ถังไม้ เชือก กระดูก) · เสากระโดงหลักล้มขวางตะวันตก (รังกาที่ปลาย ใบเรือขาดปลิว)
//   สมอยักษ์ปักพื้น โซ่ลากยาวไปหาท้ายเรือ · แอ่งตะกอนที่กระแสกัดรอบซาก · ห้องในเรือมีตะเกียงเก่ายังเรืองสลัว
//  ความน่ากลัว: แสงจากบนแทบไม่ถึง · ตะกอนลอยหนา · ปลาไหลมอเรย์โผล่จากรูตัวเรือ · โครงกระดูกลูกเรือ · ตัวเรือลั่น (เสียงบรรยากาศ)
// ============================================================
import { P, PS, depthOf, glow, rng, sceneSize } from "../boardGeo";
import { blobAt, hash, mix, nearDist } from "./reef";
import { drawThalassaAir, drawThalassaGround } from "./thalassaArt";
import { shipFx, shipItems } from "./shipArt";

const TAU = Math.PI * 2;
const K = (x, y) => `${x},${y}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const kinds = ["fd_nt_hull", "fd_nt_cannon", "fd_nt_mast", "fd_nt_anchor", "fd_nt_deck", "fd_nt_debris", "fd_nt_chest", "fd_nt_silt", "fd_nt_whale", "fd_nt_ship"];
export const tall = ["fd_nt_hull", "fd_nt_anchor"];
export const fogRGB = "14,40,58";
export const fx = {};

const BASE = {
  ground1: "#0b2836", ground2: "#020a10", tile: "rgba(0,0,0,0)", tile2: "rgba(0,0,0,0)",
  grid: "rgba(140,200,220,.06)", border: "rgba(140,210,230,.3)", spawn: "rgba(170,220,240,.32)",
  light: ["rgba(90,160,200,.04)", "rgba(0,6,14,.5)"], nightTint: null, shadow: "rgba(0,6,12,.55)",
  sky: ["#0d3a50", "#071f2d", "#020b12"], fog: "14,40,58",
  silt: "#4b5e66", silt2: "#5f747a", siltDark: "#33444c", mud: "#26343a",
  rust: [[120, 70, 48], [92, 56, 42], [64, 44, 38]], steel: [58, 66, 72], wood: "#5a4632", wood2: "#3d2f22", iron: "#26292c",
};
const PAL = { day: BASE, night: { ...BASE, sky: ["#082a3a", "#051722", "#01070c"] } };

let ZC = null;
function zones(info) {
  if (ZC && ZC.info === info) return ZC;
  const sp = new Map(), tk = info.terrainKind || {};
  for (const s of info.special || []) sp.set(K(s.x, s.y), s.kind);
  const kindAt = (x, y) => tk[K(x, y)] || sp.get(K(x, y)) || null;
  const list = (k) => { const o = []; for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) if (kindAt(x, y) === k) o.push({ x, y }); return o; };
  ZC = { info, kindAt, hull: list("fd_nt_hull"), deck: list("fd_nt_deck"), debris: list("fd_nt_debris"), chest: list("fd_nt_chest"), silt: list("fd_nt_silt"), mast: list("fd_nt_mast"), anchor: list("fd_nt_anchor"), cannon: list("fd_nt_cannon") };
  return ZC;
}
const poly = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
const rgb = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

// =================================================================== ธีม (อบ)
export const theme = {
  pal: PAL,
  back(c) {
    const { g, C, bY, VX0, VW, VY0 } = c;
    const gr = g.createLinearGradient(0, VY0, 0, bY + 40);
    gr.addColorStop(0, "#164a62"); gr.addColorStop(0.3, C.sky[0]); gr.addColorStop(0.75, C.sky[1]); gr.addColorStop(1, C.sky[2]);
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY + 40 - VY0);
    // ลำแสงสลัว 3 ลำ (แสงแทบไม่ถึง 200 ม.)
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const x = VX0 + VW * (0.2 + i * 0.28), w = 30 + hash(i, 3) * 40, len = (bY - VY0) * 1.1;
      const lg = g.createLinearGradient(0, VY0, 0, VY0 + len); lg.addColorStop(0, "rgba(120,200,220,.08)"); lg.addColorStop(1, "rgba(120,200,220,0)");
      g.fillStyle = lg; g.beginPath(); g.moveTo(x, VY0); g.lineTo(x + w, VY0); g.lineTo(x + w + len * 0.25, VY0 + len); g.lineTo(x + len * 0.25 - w * 0.3, VY0 + len); g.closePath(); g.fill();
    }
    g.restore();
    // ซากเรือลำอื่นไกลๆ ในหมอก: ตัวเรือเอียง + เสากระโดงเฉียง
    const wreck = (cx, by, w, h, tilt, col) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(cx - w / 2, by); g.lineTo(cx - w * 0.42, by - h); g.lineTo(cx + w * 0.38, by - h * (1 + tilt)); g.lineTo(cx + w / 2, by - h * 0.2); g.closePath(); g.fill();
      g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - w * 0.05, by - h); g.lineTo(cx + w * 0.05 + h * tilt * 3, by - h * 3.2); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(cx - w * 0.05 + h * tilt * 1.6, by - h * 2.2); g.lineTo(cx + w * 0.2 + h * tilt * 1.6, by - h * 2.25); g.stroke();
    };
    wreck(VX0 + VW * 0.18, bY - 6, 230, 34, 0.15, "rgba(6,28,40,.75)");
    wreck(VX0 + VW * 0.74, bY + 2, 300, 46, -0.1, "rgba(4,20,30,.9)");
    // พื้นไกล
    g.fillStyle = "rgba(3,18,26,.95)"; g.beginPath(); g.moveTo(VX0, bY + 30);
    for (let x = 0; x <= VW; x += 18) g.lineTo(VX0 + x, bY + 4 - Math.sin(x * 0.01) * 6 - hash(x, 3) * 5);
    g.lineTo(VX0 + VW, bY + 30); g.closePath(); g.fill();
  },
  ground(c) {
    const { g, C, R, bY, wx0, wx1, wy1 } = c, { cols, rows } = sceneSize();
    for (let d = 24; d >= 0; d--) {
      const e = 0.4 + d * 1.2, x0 = -e, y0 = -e, x1 = cols + e, y1 = rows + e * 0.5, pts = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, side = Math.floor(u * 4), f = u * 4 - side, w = (hash(i, d + 9) - 0.5) * 0.9;
        const p = side === 0 ? [x0 + (x1 - x0) * f, y0 + w] : side === 1 ? [x1 + w, y0 + (y1 - y0) * f] : side === 2 ? [x1 - (x1 - x0) * f, y1 + w] : [x0 + w, y1 - (y1 - y0) * f];
        pts.push(PS(p[0], p[1]));
      }
      g.fillStyle = mix(C.siltDark, "#020d14", Math.min(1, 0.12 + d / 20)); poly(g, pts); g.fill();
    }
    for (let i = 0, n = Math.min(500, Math.round((wx1 - wx0) * (wy1 + 1) * 0.3)); i < n; i++) {
      const x = wx0 + R() * (wx1 - wx0), y = -2 + R() * (wy1 + 2), [sx, sy, s] = PS(x, y);
      if (sy < bY) continue;
      g.fillStyle = R() < 0.5 ? "rgba(90,110,115,.16)" : "rgba(10,20,26,.3)";
      g.beginPath(); g.ellipse(sx, sy, s * (0.25 + R() * 0.5), s * (0.07 + R() * 0.08), 0, 0, TAU); g.fill();
    }
  },
  // ข้างกระดาน: ไม้กระดานหัก ถังไม้ หินตะกอน · ไกลออกไปเสากระโดงเอียงโผล่จากหมอก
  side(c) {
    const { g, C, VX0, VX1, VW } = c, { cols, rows } = sceneSize();
    const rs = rng(23), band = 3 + Math.max(0, (VW - 1280) / 60), list = [];
    for (let i = 0; i < 60; i++) { list.push([-1.2 - rs() * band, rs() * (rows + 1) - 0.5, rs()]); list.push([cols + 0.2 + rs() * band, rs() * (rows + 1) - 0.5, rs()]); }
    for (let i = 0; i < 26; i++) list.push([rs() * (cols + 4) - 2, -1.2 - rs() * 3, rs()]);
    list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
      const [sx, sy, s] = PS(x, y); if (sx < VX0 - 100 || sx > VX1 + 100) return;
      if (r < 0.35) { g.fillStyle = C.wood2; g.save(); g.translate(sx, sy); g.rotate((r - 0.17) * 3); g.fillRect(-s * 0.6, -s * 0.06, s * 1.2, s * 0.12); g.restore(); }
      else if (r < 0.55) { g.fillStyle = C.wood; g.beginPath(); g.ellipse(sx, sy - s * 0.2, s * 0.18, s * 0.24, 0, 0, TAU); g.fill(); g.strokeStyle = C.iron; g.lineWidth = 1.5; g.beginPath(); g.ellipse(sx, sy - s * 0.3, s * 0.18, s * 0.05, 0, 0, TAU); g.stroke(); }
      else if (r < 0.65) { g.strokeStyle = "rgba(20,30,34,.9)"; g.lineWidth = Math.max(2, s * 0.08); g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + s * (r - 0.6) * 8, sy - s * 3.2); g.stroke(); }
      else { g.fillStyle = "rgba(40,52,58,.9)"; g.beginPath(); g.ellipse(sx, sy - s * 0.15, s * 0.45, s * 0.25, 0, Math.PI, TAU); g.fill(); }
    });
  },
  base(c) {
    const { g, C, info } = c, Z = zones(info), cols = info.cols, rows = info.rows;
    poly(g, [P(-0.2, -0.2), P(cols + 0.2, -0.2), P(cols + 0.2, rows + 0.2), P(-0.2, rows + 0.2)]); g.fillStyle = C.mud; g.fill();
    // พื้นตะกอน: สีไล่ตาม noise เป็นปื้นใหญ่
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const n = hash(Math.floor(x / 3), Math.floor(y / 3)) * 0.6 + hash(x, y) * 0.4;
      blobAt(g, x + 0.5, y + 0.5, 0.8, 0, 12, x * 13 + y * 31, 0.22); g.fillStyle = mix(C.siltDark, C.silt2, n); g.fill();
    }
    // แอ่งกัดเซาะรอบซาก (มืดลงรอบตัวเรือ)
    for (const t of Z.hull) { blobAt(g, t.x + 0.5, t.y + 0.5, 1.3, 0, 14, t.x * 7 + t.y, 0.3); g.fillStyle = "rgba(10,18,24,.22)"; g.fill(); }
    // เนินตะกอนอ่อน (s) — สว่างนวล ขอบนุ่ม
    for (const t of Z.silt) for (const [r, a] of [[1.2, 0.25], [0.8, 0.45]]) { blobAt(g, t.x + 0.5, t.y + 0.5, r, 0, 12, t.x * 3 + t.y * 9, 0.28); g.fillStyle = `rgba(140,160,160,${a})`; g.fill(); }
    // ดาดฟ้าในเรือ: ไม้กระดานผุเรียงตามลำเรือ มีรูโหว่
    for (const t of Z.deck) {
      for (let i = 0; i < 4; i++) {
        const y0 = t.y + i * 0.25, broken = hash(t.x * 4 + i, t.y) < 0.18;
        if (broken) continue;
        poly(g, [P(t.x, y0 + 0.02), P(t.x + 1, y0 + 0.02), P(t.x + 1, y0 + 0.23), P(t.x, y0 + 0.23)]);
        g.fillStyle = mix(BASE.wood, BASE.wood2, hash(t.x, t.y * 4 + i)); g.fill();
      }
      g.strokeStyle = "rgba(10,8,6,.5)"; g.lineWidth = 1; const a = P(t.x + 0.5, t.y), b = P(t.x + 0.5, t.y + 1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    // ทุ่งซาก: ไม้กระดานหัก ชิ้นเหล็ก เชือกขด (คงที่ตามช่อง)
    for (const t of Z.debris) {
      const R = rng(t.x * 53 + t.y * 7);
      for (let i = 0; i < 4; i++) {
        const x = t.x + 0.15 + R() * 0.7, y = t.y + 0.15 + R() * 0.7, a = R() * Math.PI, l = 0.35 + R() * 0.4;
        poly(g, [P(x - Math.cos(a) * l / 2 - Math.sin(a) * 0.05, y - Math.sin(a) * l / 2 + Math.cos(a) * 0.05), P(x + Math.cos(a) * l / 2 - Math.sin(a) * 0.05, y + Math.sin(a) * l / 2 + Math.cos(a) * 0.05), P(x + Math.cos(a) * l / 2 + Math.sin(a) * 0.05, y + Math.sin(a) * l / 2 - Math.cos(a) * 0.05), P(x - Math.cos(a) * l / 2 + Math.sin(a) * 0.05, y - Math.sin(a) * l / 2 - Math.cos(a) * 0.05)]);
        g.fillStyle = R() < 0.7 ? BASE.wood2 : "#3c3634"; g.fill();
      }
      const [sx, sy, s] = P(t.x + 0.5, t.y + 0.5); g.strokeStyle = "rgba(150,130,90,.6)"; g.lineWidth = 1.2; g.beginPath(); g.ellipse(sx, sy, s * 0.15, s * 0.06, 0, 0, TAU * 0.85); g.stroke();
    }
    // โซ่สมอลากจากสมอ → ท้ายเรือ (เส้นห่วงโซ่บนพื้น)
    if (Z.anchor.length) {
      const a = Z.anchor[Z.anchor.length - 1], sx0 = a.x + 0.5, sy0 = a.y + 0.9, ex = 17.5, ey = 9;
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, x = sx0 + (ex - sx0) * u + Math.sin(u * 7) * 0.5, y = sy0 + (ey - sy0) * u, [px, py, s] = P(x, y, 0.02);
        g.strokeStyle = "#1c1e20"; g.lineWidth = Math.max(1, s * 0.04); g.beginPath(); g.ellipse(px, py, s * 0.06, s * 0.035, i % 2 ? 0.6 : -0.6, 0, TAU); g.stroke();
      }
    }
    // กระดูก/กะโหลกกระจายใกล้ซาก
    const R = rng(91);
    for (let i = 0; i < 26; i++) {
      const x = R() * cols, y = R() * rows; if (nearDist(Z.hull, x, y) > 3) continue;
      const [sx, sy, s] = P(x, y, 0.01), a = R() * Math.PI;
      g.strokeStyle = "rgba(200,195,175,.55)"; g.lineWidth = Math.max(1, s * 0.025); g.beginPath(); g.moveTo(sx - Math.cos(a) * s * 0.1, sy - Math.sin(a) * s * 0.04); g.lineTo(sx + Math.cos(a) * s * 0.1, sy + Math.sin(a) * s * 0.04); g.stroke();
      if (i % 6 === 0) { g.fillStyle = "rgba(205,200,180,.7)"; g.beginPath(); g.arc(sx, sy - s * 0.04, s * 0.05, 0, TAU); g.fill(); g.fillStyle = "#0b0d0e"; g.fillRect(sx - s * 0.03, sy - s * 0.05, s * 0.018, s * 0.018); g.fillRect(sx + s * 0.012, sy - s * 0.05, s * 0.018, s * 0.018); }
    }
  },
  grid({ g, C, info }) {
    const Z = zones(info); g.strokeStyle = C.grid; g.lineWidth = 1;
    for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
      if (Z.kindAt(x, y) === "fd_nt_hull" || Z.kindAt(x, y) === "fd_nt_mast") continue;
      const a = P(x, y), b = P(x + 1, y), c2 = P(x + 1, y + 1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.stroke();
    }
    return true;
  },
};

// =================================================================== สิ่งกีดขวาง
export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t, conn = t.conn || {};
  if (kind === "fd_nt_whale" || kind === "fd_nt_ship") return;
  if (kind === "fd_nt_hull") { hullBlock(g, x, y, conn, now); return; }
  if (kind === "fd_nt_cannon") { cannon(g, x, y); return; }
  if (kind === "fd_nt_mast") { mast(g, x, y, conn, now); return; }
  if (kind === "fd_nt_anchor") { anchor(g, x, y, conn); return; }
}
// กล่องผนังเรือ (ด้านที่หันกล้องก่อน-หลังตามความลึก) — ยอดหยักเหมือนแผ่นเหล็กฉีกขาด
function hullBlock(g, x, y, conn, now) {
  const H = 1.25 + hash(x, y) * 0.55, rust = BASE.rust;
  const faces = [
    { a: [x, y], b: [x + 1, y], n: "u", open: !conn.u }, { a: [x + 1, y], b: [x + 1, y + 1], n: "r", open: !conn.r },
    { a: [x + 1, y + 1], b: [x, y + 1], n: "d", open: !conn.d }, { a: [x, y + 1], b: [x, y], n: "l", open: !conn.l },
  ].map((f) => ({ ...f, dep: depthOf((f.a[0] + f.b[0]) / 2, (f.a[1] + f.b[1]) / 2) })).sort((p, q) => p.dep - q.dep);
  const top = (u, side) => H * (0.88 + 0.12 * Math.sin(u * 9 + x * 3 + y + side));
  for (const f of faces) {
    if (!f.open) continue; // ด้านที่ติดผนังข้างเคียง = ไม่เห็น
    const pts = [];
    for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push(P(f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u, 0)); }
    for (let i = 6; i >= 0; i--) { const u = i / 6; pts.push(P(f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u, top(u, f.n.charCodeAt(0)))); }
    const shadeK = f.n === "d" || f.n === "r" ? 1.15 : 0.8, grad = g.createLinearGradient(pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1] - 30);
    grad.addColorStop(0, rgb(rust[2], shadeK)); grad.addColorStop(0.5, rgb(rust[1], shadeK)); grad.addColorStop(1, rgb(rust[0], shadeK));
    poly(g, pts); g.fillStyle = grad; g.fill();
    // รอยต่อแผ่นเหล็ก + หมุดย้ำ + คราบสนิมไหล
    g.strokeStyle = "rgba(20,12,8,.5)"; g.lineWidth = 1;
    for (const z of [H * 0.35, H * 0.7]) { const a = P(f.a[0], f.a[1], z), b = P(f.b[0], f.b[1], z); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    g.fillStyle = "rgba(30,20,14,.8)";
    for (let i = 1; i < 6; i++) for (const z of [H * 0.3, H * 0.65]) { const p = P(f.a[0] + (f.b[0] - f.a[0]) * i / 6, f.a[1] + (f.b[1] - f.a[1]) * i / 6, z); g.beginPath(); g.arc(p[0], p[1], Math.max(0.8, p[2] * 0.018), 0, TAU); g.fill(); }
    g.strokeStyle = "rgba(140,70,30,.35)"; g.lineWidth = Math.max(1, P(x, y)[2] * 0.03);
    for (let i = 0; i < 2; i++) { const u = 0.25 + hash(x * 3 + i, y + f.n.charCodeAt(0)) * 0.5, a = P(f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u, H * 0.8), b = P(f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u, H * 0.15); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  }
  // ฝาบน (ขอบกราบ) + เพรียง/สาหร่ายเกาะ
  poly(g, [P(x, y, H * 0.9), P(x + 1, y, H * 0.9), P(x + 1, y + 1, H * 0.9), P(x, y + 1, H * 0.9)]); g.fillStyle = rgb(BASE.steel, 0.9); g.fill();
  const R = rng(x * 29 + y * 61);
  for (let i = 0; i < 5; i++) { const p = P(x + 0.15 + R() * 0.7, y + 0.15 + R() * 0.7, H * 0.92), s = p[2]; g.fillStyle = R() < 0.5 ? "rgba(90,130,90,.8)" : "rgba(170,160,140,.8)"; g.beginPath(); g.ellipse(p[0], p[1], s * 0.05, s * 0.03, 0, 0, TAU); g.fill(); }
  // ปลายผนังที่หัก (ข้างเคียงด้านเดียว) = ซี่โครงเหล็กโผล่
  const ends = [conn.u, conn.r, conn.d, conn.l].filter(Boolean).length;
  if (ends === 1) {
    g.strokeStyle = rgb(BASE.rust[1], 0.9); g.lineWidth = Math.max(1.5, P(x, y)[2] * 0.05); g.lineCap = "round";
    for (let i = 0; i < 3; i++) { const bx = x + 0.2 + i * 0.3, a = P(bx, y + 0.5, H * 0.8), b = P(bx + 0.1, y + 0.5, H * (1.4 + i * 0.15)); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0] + 6, (a[1] + b[1]) / 2, b[0], b[1]); g.stroke(); }
    g.lineCap = "butt";
  }
  void now;
}
function cannon(g, x, y) {
  const cx = x + 0.5, cy = y + 0.5, [bx, by, s] = P(cx, cy);
  g.fillStyle = "rgba(0,6,10,.5)"; g.beginPath(); g.ellipse(bx, by, s * 0.45, s * 0.18, 0, 0, TAU); g.fill();
  // ฐานล้อไม้ผุ
  poly(g, [P(cx - 0.3, cy - 0.22, 0), P(cx + 0.3, cy - 0.22, 0), P(cx + 0.3, cy + 0.22, 0.25), P(cx - 0.3, cy + 0.22, 0.25)]); g.fillStyle = BASE.wood2; g.fill();
  for (const dx of [-0.25, 0.25]) { const w = P(cx + dx, cy + 0.2, 0.12); g.fillStyle = "#2a2018"; g.beginPath(); g.ellipse(w[0], w[1], s * 0.1, s * 0.1, 0, 0, TAU); g.fill(); }
  // ลำกล้องเหล็กดำเอียง ชี้ออกนอกกราบ (ตามทิศห่างจากกลางกระดาน)
  const dir = cx < 10 ? -1 : 1, a = P(cx - dir * 0.25, cy, 0.35), b = P(cx + dir * 0.55, cy - 0.05, 0.55);
  const grd = g.createLinearGradient(a[0], a[1] - 6, a[0], a[1] + 6); grd.addColorStop(0, "#4a4e52"); grd.addColorStop(1, "#15171a");
  g.strokeStyle = grd; g.lineWidth = s * 0.2; g.lineCap = "round"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  g.strokeStyle = "#0a0b0c"; g.lineWidth = s * 0.09; g.beginPath(); g.moveTo(b[0] - dir * 1, b[1]); g.lineTo(b[0], b[1]); g.stroke(); g.lineCap = "butt";
  g.fillStyle = "rgba(120,140,110,.6)"; g.beginPath(); g.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - s * 0.08, s * 0.08, s * 0.03, 0, 0, TAU); g.fill();
}
// เสากระโดงล้ม: ท่อนไม้นอนตามแถว (ต่อเนื่องข้ามช่อง) · ปลายตะวันตกมีรังกา · ใบเรือขาดปลิว
function mast(g, x, y, conn, now) {
  const cy = y + 0.5, z = 0.32, x0 = x + (conn.l ? 0 : 0.1), x1 = x + (conn.r ? 1 : 0.9);
  const top = [], bot = [];
  for (let i = 0; i <= 6; i++) { const u = x0 + (x1 - x0) * i / 6; top.push(P(u, cy, z + 0.28)); bot.push(P(u, cy + 0.02, z - 0.28 < 0 ? 0 : z - 0.28)); }
  const ys = P(x0, cy - 0.3, 0), ye = P(x0, cy + 0.3, 0);
  g.fillStyle = "rgba(0,6,10,.45)"; g.beginPath(); g.ellipse((ys[0] + P(x1, cy)[0]) / 2, P(x, cy)[1], Math.abs(P(x1, cy)[0] - ys[0]) / 2, ys[2] * 0.15, 0, 0, TAU); g.fill();
  void ye;
  poly(g, [...top, ...bot.reverse()]); const grd = g.createLinearGradient(0, top[0][1], 0, bot[0][1]); grd.addColorStop(0, "#6b5440"); grd.addColorStop(1, "#2d2219"); g.fillStyle = grd; g.fill();
  g.strokeStyle = "rgba(20,14,10,.6)"; g.lineWidth = 1; for (let i = 1; i < 6; i += 2) { g.beginPath(); g.moveTo(top[i][0], top[i][1] + 3); g.lineTo(top[i + 1][0], top[i + 1][1] + 4); g.stroke(); }
  // ห่วงเหล็กรัดเสา
  const ring = P(x + 0.5, cy, z); g.strokeStyle = "#202224"; g.lineWidth = Math.max(1.5, ring[2] * 0.06); g.beginPath(); g.ellipse(ring[0], ring[1], ring[2] * 0.05, ring[2] * 0.3, 0, 0, TAU); g.stroke();
  if (!conn.l) { // รังกา (ปลายเสา)
    const n = P(x0 + 0.1, cy, 0.5), s = n[2];
    g.fillStyle = "#3a2c20"; g.beginPath(); g.ellipse(n[0], n[1] - s * 0.1, s * 0.3, s * 0.18, 0.3, 0, TAU); g.fill();
    g.strokeStyle = "#1e1610"; g.lineWidth = 1.2; g.stroke();
  }
  if (!conn.r) { // ปลายหัก เสี้ยนไม้
    const p = P(x1, cy, z), s = p[2]; g.strokeStyle = "#6b5440"; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(p[0], p[1] - s * 0.2 + i * s * 0.1); g.lineTo(p[0] + s * (0.1 + hash(i, x) * 0.15), p[1] - s * 0.2 + i * s * 0.1 + (hash(x, i) - 0.5) * s * 0.1); g.stroke(); }
  }
  if (x === 2) { // ใบเรือขาดปลิวตามกระแส (ผ้าโปร่ง)
    const base = P(x + 0.5, cy, 0.6), s = base[2], t = now / 1000;
    g.fillStyle = "rgba(190,180,150,.35)"; g.beginPath(); g.moveTo(base[0], base[1]);
    for (let i = 0; i <= 8; i++) { const u = i / 8; g.lineTo(base[0] + u * s * 1.8 + Math.sin(t * 1.3 + u * 4) * s * 0.15, base[1] - s * (0.9 + Math.sin(u * 3 + t) * 0.15)); }
    g.lineTo(base[0] + s * 1.5, base[1] - s * 0.1); g.closePath(); g.fill();
  }
}
// สมอยักษ์ (2 ช่อง แนวตั้ง y3–4): ก้านตั้ง คานขวาง ปีกสมอจมทราย
function anchor(g, x, y, conn) {
  if (conn.d) return; // วาดครั้งเดียวที่ช่องล่าง
  const cx = x + 0.5, cy = y + 0.2, H = 2.6;
  const b = P(cx, cy, 0), t = P(cx, cy - 0.3, H), s = b[2];
  g.fillStyle = "rgba(0,6,10,.5)"; g.beginPath(); g.ellipse(b[0], b[1], s * 0.6, s * 0.22, 0, 0, TAU); g.fill();
  g.strokeStyle = "#2b2f33"; g.lineCap = "round"; g.lineWidth = s * 0.16; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
  const st0 = P(cx - 0.7, cy - 0.3, H * 0.86), st1 = P(cx + 0.7, cy - 0.3, H * 0.86); g.lineWidth = s * 0.1; g.beginPath(); g.moveTo(st0[0], st0[1]); g.lineTo(st1[0], st1[1]); g.stroke();
  const ring = P(cx, cy - 0.3, H + 0.15); g.lineWidth = s * 0.05; g.beginPath(); g.arc(ring[0], ring[1], s * 0.14, 0, TAU); g.stroke();
  // ปีกสมอ (จมทรายครึ่ง)
  g.lineWidth = s * 0.13; g.beginPath(); const f0 = P(cx - 0.6, cy + 0.2, 0.25), f1 = P(cx + 0.6, cy + 0.2, 0.25); g.moveTo(f0[0], f0[1]); g.quadraticCurveTo(b[0], b[1] + s * 0.25, f1[0], f1[1]); g.stroke(); g.lineCap = "butt";
  g.fillStyle = "rgba(110,80,50,.5)"; for (let i = 0; i < 4; i++) { const p = P(cx + (hash(i, x) - 0.5) * 0.1, cy - 0.3, H * (0.2 + i * 0.18)); g.beginPath(); g.ellipse(p[0], p[1], s * 0.07, s * 0.04, 0, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(80,40,30,.4)"; g.beginPath(); g.ellipse(b[0], b[1] - s * 0.03, s * 0.3, s * 0.08, 0, 0, TAU); g.fill(); // ทรายฟุ้งรอบโคน
}

// =================================================================== ของเรียงความลึก (ขยับ)
export function items(list, g, fd, info, units, now, lowQ) {
  const Z = zones(info), t = now / 1000;
  for (const c of Z.chest) list.push({ d: depthOf(c.x + 0.5, c.y + 0.5), f: () => chest(g, c.x + 0.5, c.y + 0.5, t) });
  // ถังไม้ตั้ง/ล้มในทุ่งซาก (บางช่อง)
  for (const d of Z.debris) if (hash(d.x, d.y) < 0.45) list.push({ d: depthOf(d.x + 0.5, d.y + 0.5), f: () => barrel(g, d.x + 0.3 + hash(d.y, d.x) * 0.4, d.y + 0.5, hash(d.x * 2, d.y) < 0.5) });
  // ตะเกียงเก่าในห้องเรือ (ห้องอากาศ) — แสงสั่นไหว
  for (const h of info.heal || []) list.push({ d: depthOf(h.x + 0.5, h.y + 0.5), f: () => lantern(g, h.x + 0.5, h.y + 0.3, t) });
  shipItems(list, g, fd, info, now, lowQ);
  void units;
}
function chest(g, x, y, t) {
  const [cx, cy, s] = P(x, y);
  g.fillStyle = "rgba(0,6,10,.45)"; g.beginPath(); g.ellipse(cx, cy, s * 0.36, s * 0.13, 0, 0, TAU); g.fill();
  g.fillStyle = "#4a3324"; g.fillRect(cx - s * 0.28, cy - s * 0.3, s * 0.56, s * 0.3);
  g.fillStyle = "#5c412d"; g.beginPath(); g.ellipse(cx, cy - s * 0.3, s * 0.28, s * 0.12, 0, Math.PI, TAU); g.fill();
  g.strokeStyle = "#a88a3a"; g.lineWidth = Math.max(1, s * 0.03); g.strokeRect(cx - s * 0.28, cy - s * 0.3, s * 0.56, s * 0.3);
  g.beginPath(); g.moveTo(cx, cy - s * 0.42); g.lineTo(cx, cy); g.stroke();
  // ทรายท่วมครึ่ง
  g.fillStyle = "rgba(90,110,115,.85)"; g.beginPath(); g.ellipse(cx, cy - s * 0.02, s * 0.36, s * 0.08, 0, 0, TAU); g.fill();
  // ประกายทองวิบวับ
  const sp = Math.max(0, Math.sin(t * 2.3 + x * 3)); if (sp > 0.8) { glow(g, cx + s * 0.1, cy - s * 0.32, s * 0.3, "255,220,130", (sp - 0.8) * 4); }
}
function barrel(g, x, y, fallen) {
  const [cx, cy, s] = P(x, y);
  g.fillStyle = "rgba(0,6,10,.4)"; g.beginPath(); g.ellipse(cx, cy, s * 0.2, s * 0.08, 0, 0, TAU); g.fill();
  g.fillStyle = "#4e3a28";
  if (fallen) { g.beginPath(); g.ellipse(cx, cy - s * 0.1, s * 0.24, s * 0.12, 0, 0, TAU); g.fill(); g.strokeStyle = "#1e1a16"; g.lineWidth = 1.2; g.beginPath(); g.ellipse(cx + s * 0.18, cy - s * 0.1, s * 0.06, s * 0.11, 0, 0, TAU); g.stroke(); }
  else { g.fillRect(cx - s * 0.13, cy - s * 0.38, s * 0.26, s * 0.36); g.strokeStyle = "#1e1a16"; g.lineWidth = 1.2; for (const k of [0.1, 0.3]) { g.beginPath(); g.moveTo(cx - s * 0.13, cy - s * k); g.lineTo(cx + s * 0.13, cy - s * k); g.stroke(); } }
}
function lantern(g, x, y, t) {
  const p = P(x, y, 1.0), s = p[2], flick = 0.7 + 0.3 * Math.sin(t * 9 + x) * Math.sin(t * 3.7 + y);
  glow(g, p[0], p[1], s * 1.6, "255,190,110", 0.35 * flick);
  g.strokeStyle = "#1a1612"; g.lineWidth = 1; g.beginPath(); g.moveTo(p[0], p[1] - s * 0.6); g.lineTo(p[0], p[1] - s * 0.12); g.stroke();
  g.fillStyle = `rgba(255,200,120,${0.8 * flick})`; g.fillRect(p[0] - s * 0.05, p[1] - s * 0.12, s * 0.1, s * 0.14);
}

// =================================================================== พื้นทุกเฟรม
export function ground(g, fd, info, now, lowQ) {
  const t = now / 1000;
  // แสงสลัวลอดลงเป็นหย่อม เคลื่อนช้า
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const x = (hash(i, 4) * info.cols + Math.sin(t * 0.08 + i) * 2) % info.cols, y = (hash(i, 5) * info.rows + Math.cos(t * 0.07 + i) * 1.5) % info.rows;
      const [sx, sy, s] = P(x, y), r = s * 2.2, gr = g.createRadialGradient(sx, sy, 0, sx, sy, r); gr.addColorStop(0, "rgba(120,190,210,.07)"); gr.addColorStop(1, "rgba(120,190,210,0)");
      g.fillStyle = gr; g.beginPath(); g.ellipse(sx, sy, r, r * 0.45, 0, 0, TAU); g.fill();
    }
    g.restore();
  }
  drawThalassaGround(g, fd, info, now);
}

// =================================================================== ทับตัวละคร
export function air(g, fd, info, units, now, lowQ, view) {
  const Z = zones(info), t = now / 1000;
  // ฟองรั่วจากรอยแตกตัวเรือ (บางช่องผนัง) ลอยขึ้นเป็นสาย
  if (!lowQ) for (let i = 0; i < Z.hull.length; i += 4) {
    const h = Z.hull[i];
    for (let j = 0; j < 4; j++) {
      const k = ((t * 0.3 + j / 4 + hash(h.x, h.y)) % 1), p = P(h.x + 0.5 + Math.sin(t * 2 + j) * 0.06, h.y + 0.5, 1.5 + k * 3);
      g.strokeStyle = `rgba(200,240,250,${0.5 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(p[0], p[1], p[2] * 0.025, 0, TAU); g.stroke();
    }
  }
  // ปลาไหลมอเรย์โผล่จากรูตัวเรือเป็นพักๆ (ความน่ากลัว)
  const slot = Math.floor(t / 7), d = t - slot * 7 - hash(slot, 1) * 3;
  if (d > 0 && d < 2.4 && Z.hull.length) {
    const h = Z.hull[Math.floor(hash(slot, 2) * Z.hull.length)], out = Math.sin((d / 2.4) * Math.PI);
    const b = P(h.x + 0.5, h.y + 1.02, 0.6), e = P(h.x + 0.5, h.y + 1.02 + out * 0.6, 0.55 + out * 0.2), s = b[2];
    g.strokeStyle = "#3b4a2c"; g.lineWidth = s * 0.16; g.lineCap = "round"; g.beginPath(); g.moveTo(b[0], b[1]); g.quadraticCurveTo((b[0] + e[0]) / 2 + Math.sin(t * 6) * s * 0.1, (b[1] + e[1]) / 2, e[0], e[1]); g.stroke(); g.lineCap = "butt";
    g.fillStyle = "#4a5a34"; g.beginPath(); g.ellipse(e[0], e[1], s * 0.11, s * 0.08, 0, 0, TAU); g.fill();
    g.fillStyle = "#e8e0a0"; g.beginPath(); g.arc(e[0] + s * 0.04, e[1] - s * 0.03, s * 0.02, 0, TAU); g.fill();
    if (Math.sin(t * 4) > 0) { g.strokeStyle = "#1a1a10"; g.lineWidth = 1; g.beginPath(); g.moveTo(e[0] - s * 0.05, e[1] + s * 0.03); g.lineTo(e[0] + s * 0.08, e[1] + s * 0.05); g.stroke(); }
  }
  // ฝูงปลาเล็กสีเงิน (น้อยกว่าชั้น 1)
  if (!lowQ) {
    const a = t * 0.1, cx = info.cols * (0.5 + 0.35 * Math.cos(a)), cy = info.rows * (0.5 + 0.3 * Math.sin(a * 1.4)), dir = -Math.sin(a) >= 0 ? 1 : -1;
    g.fillStyle = "rgba(190,210,220,.8)";
    for (let i = 0; i < 16; i++) { const [sx, sy, s] = P(cx + (hash(i, 1) - 0.5) * 2, cy + (hash(i, 2) - 0.5) * 1.2, 1.5 + hash(i, 3)), w = s * 0.1; g.beginPath(); g.ellipse(sx, sy, w, w * 0.35, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(sx - dir * w, sy); g.lineTo(sx - dir * w * 1.6, sy - w * 0.35); g.lineTo(sx - dir * w * 1.6, sy + w * 0.35); g.fill(); }
  }
  // ตะกอนลอยหนา + ขอบจอมืด
  const X0 = view ? view.x0 : 0, W = view ? view.x1 - view.x0 : 1280, Y0 = view ? view.y0 : 0, H = view ? view.y1 - view.y0 : 720;
  if (!lowQ) { g.fillStyle = "rgba(170,190,190,.3)"; for (let i = 0; i < 110; i++) { const x = X0 + ((hash(i, 1) * W + Math.sin(t * 0.25 + i) * 14) % W), y = Y0 + ((hash(i, 2) * H + t * (4 + hash(i, 3) * 8)) % H); g.fillRect(x, y, 1.5, 1.5); } }
  const vg = g.createRadialGradient(X0 + W / 2, Y0 + H / 2, Math.min(W, H) * 0.3, X0 + W / 2, Y0 + H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,8,14,.65)"); g.fillStyle = vg; g.fillRect(X0, Y0, W, H);
  shipFx(g, fd, info, now);
  drawThalassaAir(g, fd, info, units, now, lowQ, view);
}
export function bakeSpecial() {}
export function animSpecial() {}
void clamp;

// ============================================================
//  ร้านค้า 3 ร้านบนกระดาน แบบ 2.5D — ขนาดตามช่อง (ผู้ใช้สั่ง 2026-11-09: "2×2 ใหญ่เกิน · ร้านปกติ 1 ช่อง · ร้านพิเศษ 2×1"
//  + "ออกแบบร้านใหม่ให้เหมาะกับขนาดช่อง")
//   apoth = ร้านยาเจริญชัย (1×1) — ซุ้มยาเล็ก: เคาน์เตอร์ขาวแถบมิ้นต์ กากบาทยา · ชั้นโหลยากลาง · เสา 4 มุม · หลังคาปั้นหยาผ้าลายมิ้นต์
//   forge = โรงช่างลุงเริง (1×1) — เพิงช่าง: ผนังแผงเครื่องมือ · หลังคาจั่วสังกะสีขอบส้ม · ปล่องควัน · ทั่งมีประกายไฟหน้าเพิง
//   cara  = พ่อค้าเร่ (2×1 ตามแกน x) — เกวียน: ตัวไม้ขอบทอง · ล้อ 4 ล้อ · ผ้าใบโค้งลายม่วง/ขาว · ตะเกียง · คริสตัลบนพรมสองปลาย
//  เรขาคณิตอยู่ในพิกัดกระดาน (x, y, สูง z) แล้วฉายผ่าน P() → หมุนกล้อง/ซูมตามกระดาน · ด้านที่หันหลังกล้องไม่วาด (faceVisible)
//  แสง: ด้านที่หันไปทางขวาของจอเข้มลง (แบบเดียวกับสไปรต์เดิม) · กลางคืนเข้มลง + ไฟอุ่น
//  (x, y) = มุมบนซ้ายของร้าน · state.shops (กระดานจริง: { x, y, w, h }) + หน้าดูกระดาน (?board=1&shops=1)
// ============================================================
import { P, depthOf, faceVisible, glow, hexPath, shadeHex, viewAxes } from "./boardGeo";

const TAU = Math.PI * 2;
export const SHOP_KINDS = ["apoth", "forge", "cara"];
// ขนาดตามชนิด [w, h] — ตรงกับ server/shop.js SHOP_DIMS
export const SHOP_DIMS = { apoth: [1, 1], forge: [1, 1], cara: [2, 1], capsule: [1, 1] };
// ชื่อร้านตามชนิด (state.shops[i].kind) — capsule = แคปซูลเสบียง (Colony · 1 ช่อง)
export const SHOP_NAMES = { apoth: "ร้านยาเจริญชัย", forge: "โรงช่างลุงเริง", cara: "พ่อค้าเร่", capsule: "แคปซูลเสบียง" };
export const shopName = (kind) => SHOP_NAMES[kind] || SHOP_NAMES.apoth;
// [w, h] ของร้าน (server ส่ง w/h · ข้อมูลเก่าที่มีแค่ size = จัตุรัส)
export function shopDims(sh) {
  if (!sh) return [1, 1];
  if (sh.w) return [Math.max(1, sh.w | 0), Math.max(1, (sh.h | 0) || 1)];
  if (sh.size) return [Math.max(1, sh.size | 0), Math.max(1, sh.size | 0)];
  return SHOP_DIMS[sh.kind] || [1, 1];
}
export const shopSize = (sh) => Math.max(...shopDims(sh));
// ช่อง (x, y) อยู่ในพื้นที่ร้านไหม (w×h จากมุมบนซ้าย)
export function shopCovers(sh, x, y) {
  if (!sh || !Number.isFinite(sh.x) || !Number.isFinite(sh.y)) return false;
  const [w, h] = shopDims(sh);
  return x >= sh.x && x < sh.x + w && y >= sh.y && y < sh.y + h;
}

// ---------- เรขาคณิต ----------
function path3(g, pts) {
  g.beginPath();
  pts.forEach(([x, y, z], i) => { const p = P(x, y, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  g.closePath();
}
function fill3(g, pts, color, stroke, lw = 1) {
  path3(g, pts); g.fillStyle = color; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
// แสงตามทิศของหน้า (normal ในพิกัดกระดาน) — หันขวาจอ = เข้ม · หันซ้ายจอ = สว่าง · ด้านบน = สว่างสุด
function lit(color, nx, ny, nz, night) {
  const { rx, ry } = viewAxes();
  const r = nx * rx + ny * ry;
  const k = nz > 0.5 ? 0.06 : r > 0.25 ? -0.2 : r < -0.25 ? 0.03 : -0.08;
  return shadeHex(color, k + (night ? -0.32 : 0));
}
// กล่อง: คืนรายการด้านที่มองเห็น { n:[nx,ny], a:[x,y] มุมล่างเริ่ม, d:[dx,dy] ทิศตามขอบ, z0, z1 } สำหรับแต่งลายบนผนัง
function box(g, x0, y0, x1, y1, z0, z1, color, night, top = true, edge = null) {
  const sides = [
    { n: [0, -1], a: [x0, y0], d: [x1 - x0, 0] },
    { n: [1, 0], a: [x1, y0], d: [0, y1 - y0] },
    { n: [0, 1], a: [x1, y1], d: [x0 - x1, 0] },
    { n: [-1, 0], a: [x0, y1], d: [0, y0 - y1] },
  ];
  const vis = [];
  for (const s of sides) {
    const cx = s.a[0] + s.d[0] / 2, cy = s.a[1] + s.d[1] / 2;
    if (!faceVisible(s.n[0], s.n[1], cx, cy)) continue;
    fill3(g, [[s.a[0], s.a[1], z0], [s.a[0] + s.d[0], s.a[1] + s.d[1], z0], [s.a[0] + s.d[0], s.a[1] + s.d[1], z1], [s.a[0], s.a[1], z1]], lit(color, s.n[0], s.n[1], 0, night), edge, 1);
    vis.push({ ...s, z0, z1 });
  }
  if (top) fill3(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], lit(color, 0, 0, 1, night), edge, 1);
  return vis;
}
// สี่เหลี่ยมบนผนัง (พิกัดของหน้า: u = 0..1 ตามขอบ · z = ความสูงจริง)
function faceRect(g, f, u0, u1, z0, z1, color) {
  const at = (u, z) => [f.a[0] + f.d[0] * u, f.a[1] + f.d[1] * u, z];
  fill3(g, [at(u0, z0), at(u1, z0), at(u1, z1), at(u0, z1)], color);
}
const faceAt = (f, u, z) => [f.a[0] + f.d[0] * u, f.a[1] + f.d[1] * u, z];
// หลังคาปั้นหยา (ยอดแหลม) ผ้าลาย + ระบายหยักตามชายคาที่มองเห็น
function hipRoof(g, ex0, ey0, ex1, ey1, ze, apex, colA, colB, stripes, valance, night) {
  const [ax, ay, az] = apex;
  const edges = [
    { a: [ex0, ey0], b: [ex1, ey0], n: [0, -1] },
    { a: [ex1, ey0], b: [ex1, ey1], n: [1, 0] },
    { a: [ex1, ey1], b: [ex0, ey1], n: [0, 1] },
    { a: [ex0, ey1], b: [ex0, ey0], n: [-1, 0] },
  ].map((e) => ({ ...e, d: depthOf((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2) }));
  edges.sort((p, q) => p.d - q.d); // ด้านไกลก่อน
  for (const e of edges) {
    for (let i = 0; i < stripes; i++) {
      const t0 = i / stripes, t1 = (i + 1) / stripes;
      const p0 = [e.a[0] + (e.b[0] - e.a[0]) * t0, e.a[1] + (e.b[1] - e.a[1]) * t0, ze];
      const p1 = [e.a[0] + (e.b[0] - e.a[0]) * t1, e.a[1] + (e.b[1] - e.a[1]) * t1, ze];
      fill3(g, [p0, p1, [ax, ay, az]], lit(i % 2 ? colB : colA, e.n[0] * 0.7, e.n[1] * 0.7, 0.4, night));
    }
  }
  // ระบายหยักห้อยใต้ชายคา (เฉพาะด้านที่หันเข้ากล้อง)
  for (const e of edges) {
    if (!faceVisible(e.n[0], e.n[1], (e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2)) continue;
    const n = stripes * 2;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
      const q = (t) => [e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t];
      const [x0, y0] = q(t0), [x1, y1] = q(t1), [xm, ym] = q(tm);
      fill3(g, [[x0, y0, ze], [x1, y1, ze], [xm, ym, ze - valance]], lit(Math.floor(i / 2) % 2 ? colB : colA, e.n[0], e.n[1], 0, night));
    }
  }
}
// เงาบนพื้น: สี่เหลี่ยมของร้านเลื่อนออกเล็กน้อย (หมุนตามกล้อง — ไม่ใช่วงรีตายตัว)
function shadow(g, x, y, w, h, night) {
  fill3(g, [[x + 0.1, y + 0.12, 0], [x + w + 0.02, y + 0.12, 0], [x + w + 0.02, y + h + 0.04, 0], [x + 0.1, y + h + 0.04, 0]], night ? "rgba(0,8,24,.38)" : "rgba(28,46,40,.18)");
}
// ลานของร้าน w×h + เส้นประเรืองแสงเต้นช้าๆ
function pad(g, x, y, w, h, fill, rim, rgb, now, night) {
  fill3(g, [[x + 0.04, y + 0.04, 0], [x + w - 0.04, y + 0.04, 0], [x + w - 0.04, y + h - 0.04, 0], [x + 0.04, y + h - 0.04, 0]], fill, rim, 2);
  const p = 0.5 + 0.5 * Math.sin(now / 900 + x);
  path3(g, [[x + 0.11, y + 0.11, 0], [x + w - 0.11, y + 0.11, 0], [x + w - 0.11, y + h - 0.11, 0], [x + 0.11, y + h - 0.11, 0]]);
  g.setLineDash([5, 4]); g.lineWidth = 1.3; g.strokeStyle = `rgba(${rgb},${(night ? 0.55 : 0.4) + 0.25 * p})`; g.stroke(); g.setLineDash([]);
}
// ป้ายตราร้าน (หกเหลี่ยม ลอยขึ้นลง) ที่จุดบนอากาศ
function crestSign(g, x, y, z, s, c1, c2, drawIcon, night, now) {
  const [cx, cy0] = P(x, y, z);
  const cy = cy0 + Math.sin(now / 760 + x) * s * 0.04, r = s * 0.17;
  glow(g, cx, cy, r * 2, night ? "255,220,150" : "255,255,255", night ? 0.35 : 0.5);
  hexPath(g, cx, cy, r * 1.12, r * 0.98); g.fillStyle = c2; g.fill();
  hexPath(g, cx, cy, r, r * 0.87);
  const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fill();
  drawIcon(g, cx, cy, r);
}
// ขวดโหล (สไปรต์เล็ก) ยืนที่จุด (x, y, z) · s = ขนาดพิกเซลต่อช่องที่จุดนั้น
function jarAt(g, x, y, z, s, liquid, night) {
  const [cx, by] = P(x, y, z), w = s * 0.13, h = s * 0.17;
  g.fillStyle = night ? "rgba(200,220,235,.7)" : "rgba(255,255,255,.9)";
  g.beginPath(); g.ellipse(cx, by - h * 0.5, w * 0.55, h * 0.55, 0, 0, TAU); g.fill();
  g.fillStyle = liquid; g.beginPath(); g.ellipse(cx, by - h * 0.38, w * 0.45, h * 0.38, 0, 0, TAU); g.fill();
  g.fillStyle = night ? "#8d6a3f" : "#c79a5b"; g.fillRect(cx - w * 0.22, by - h * 1.12, w * 0.44, h * 0.16);
  g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(cx - w * 0.3, by - h * 0.82, w * 0.09, h * 0.36);
}
const scaleAt = (x, y) => P(x, y, 0)[2];
// ความสูงยอดป้ายตรา (boardDraw วางป้าย "🏪 N" เหนือจุดนี้)
export const SHOP_TOP_Z = { apoth: 1.62, forge: 1.5, cara: 1.42, capsule: 1.2 };

// ============================================================ 1) ร้านยาเจริญชัย — ซุ้มยา 1 ช่อง
const LIQ = ["#5fd0b3", "#7fbef5", "#f08aa8", "#f3c86a", "#b48af0", "#6fd28a"];
function drawApoth(g, x, y, now, night) {
  const s = scaleAt(x + 0.5, y + 0.5), MINT = "#2fa58c", WHITE = "#f8fbfa", GOLD = "#e0b04a";
  pad(g, x, y, 1, 1, night ? "rgba(120,150,150,.75)" : "rgba(236,248,243,.95)", night ? "#4f8f80" : "#8fd6c0", "95,208,179", now, night);
  shadow(g, x, y, 1, 1, night);
  // ฐานหิน
  box(g, x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0, 0.04, "#e9efe9", night);
  // เสาหลังก่อน (ไกลกล้อง) → ตัวซุ้ม → เสาหน้า
  const posts = [[x + 0.11, y + 0.11], [x + 0.83, y + 0.11], [x + 0.83, y + 0.83], [x + 0.11, y + 0.83]].map(([px, py]) => ({ px, py, d: depthOf(px + 0.03, py + 0.03) }));
  const mid = depthOf(x + 0.5, y + 0.5);
  const post = (p) => box(g, p.px, p.py, p.px + 0.06, p.py + 0.06, 0.04, 0.92, WHITE, night, true);
  posts.filter((p) => p.d < mid).forEach(post);
  // เคาน์เตอร์ 4 ด้าน: ขาว แถบมิ้นต์ เส้นทอง กากบาทยากลางด้าน
  const faces = box(g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, 0.04, 0.36, WHITE, night, false);
  for (const f of faces) {
    faceRect(g, f, 0, 1, 0.15, 0.22, lit(MINT, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0, 1, 0.225, 0.245, lit(GOLD, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0.45, 0.55, 0.05, 0.135, lit(MINT, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0.4, 0.6, 0.075, 0.11, lit(MINT, f.n[0], f.n[1], 0, night));
  }
  box(g, x + 0.19, y + 0.19, x + 0.81, y + 0.81, 0.36, 0.4, "#f3e6cc", night);
  // ชั้นโหลยากลางซุ้ม (2 ชั้น · ด้านละ 2 โหล)
  const tower = box(g, x + 0.38, y + 0.38, x + 0.62, y + 0.62, 0.4, 0.78, "#ffffff", night, true);
  for (const f of tower) {
    faceRect(g, f, 0, 1, 0.4, 0.78, lit("#e6f3ee", f.n[0], f.n[1], 0, night));
    for (let r = 0; r < 2; r++) {
      const zs = 0.44 + r * 0.17;
      faceRect(g, f, 0.04, 0.96, zs, zs + 0.018, lit("#d9c8a6", f.n[0], f.n[1], 0, night));
      for (let i = 0; i < 2; i++) {
        const [jx, jy, jz] = faceAt(f, 0.3 + i * 0.4, zs + 0.018);
        jarAt(g, jx + f.n[0] * 0.015, jy + f.n[1] * 0.015, jz, s * 0.55, LIQ[(i + r * 2 + Math.abs(f.n[0]) * 3) % LIQ.length], night);
      }
    }
  }
  if (night) { const [gx, gy] = P(x + 0.5, y + 0.5, 0.6); glow(g, gx, gy, s * 0.6, "255,214,140", 0.32); }
  // โหลใหญ่ 4 มุมเคาน์เตอร์ (เรียงไกล → ใกล้)
  [[x + 0.27, y + 0.27], [x + 0.73, y + 0.27], [x + 0.73, y + 0.73], [x + 0.27, y + 0.73]]
    .map(([jx, jy], i) => ({ jx, jy, i, d: depthOf(jx, jy) })).sort((a, b) => a.d - b.d)
    .forEach((j) => jarAt(g, j.jx, j.jy, 0.4, s * 0.72, LIQ[j.i], night));
  posts.filter((p) => p.d >= mid).forEach(post);
  // หลังคาปั้นหยาผ้าลายมิ้นต์/ขาว
  hipRoof(g, x + 0.02, y + 0.02, x + 0.98, y + 0.98, 0.92, [x + 0.5, y + 0.5, 1.28], MINT, "#ffffff", 3, 0.08, night);
  { const [tx, ty] = P(x + 0.5, y + 0.5, 1.3); g.fillStyle = shadeHex(GOLD, night ? -0.3 : 0); g.beginPath(); g.arc(tx, ty, s * 0.045, 0, TAU); g.fill(); }
  crestSign(g, x + 0.5, y + 0.5, 1.62, s, "#c8f2e2", shadeHex(MINT, night ? -0.3 : 0), (gg, cx, cy, r) => {
    gg.fillStyle = MINT; const a = r * 0.22, b = r * 0.62;
    gg.fillRect(cx - a, cy - b, a * 2, b * 2); gg.fillRect(cx - b, cy - a, b * 2, a * 2);
  }, night, now);
}

// ============================================================ 2) โรงช่างลุงเริง — เพิงช่าง 1 ช่อง
function gear(g, cx, cy, r, teeth, rot, fill) {
  g.save(); g.translate(cx, cy); g.rotate(rot); g.fillStyle = fill; g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = i / (teeth * 2) * TAU, rr = i % 2 ? r * 0.78 : r;
    const a0 = a - Math.PI / (teeth * 2) * 0.6, a1 = a + Math.PI / (teeth * 2) * 0.6;
    g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill();
  g.restore();
}
function drawForge(g, x, y, now, night) {
  const s = scaleAt(x + 0.5, y + 0.5), STEEL = "#dfe6ef", ORANGE = "#e07a2a", WOOD = "#b98150";
  pad(g, x, y, 1, 1, night ? "rgba(110,120,136,.8)" : "rgba(226,232,240,.95)", night ? "#5f6b7d" : "#aab6c6", "224,122,42", now, night);
  shadow(g, x, y, 1, 1, night);
  box(g, x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0, 0.04, "#c9d2dc", night);
  // ตัวเพิง
  const X0 = x + 0.17, Y0 = y + 0.24, X1 = x + 0.83, Y1 = y + 0.76, H = 0.58;
  const walls = box(g, X0, Y0, X1, Y1, 0.04, H, STEEL, night, false);
  for (const f of walls) {
    const L = Math.hypot(f.d[0], f.d[1]);
    const dotC = night ? "rgba(20,30,45,.4)" : "rgba(60,80,110,.32)";
    const nu = Math.max(3, Math.round(L * 8));
    for (let i = 1; i < nu; i++) for (let r = 0; r < 2; r++) {
      const [px, py] = P(...faceAt(f, i / nu, 0.36 + r * 0.08));
      g.fillStyle = dotC; g.beginPath(); g.arc(px, py, Math.max(0.8, s * 0.01), 0, TAU); g.fill();
    }
    // เครื่องมือแขวน: ประแจ / ค้อน / คีม
    const ink = lit("#4f5a6b", f.n[0], f.n[1], 0, night);
    faceRect(g, f, 0.2, 0.25, 0.3, 0.5, ink); faceRect(g, f, 0.17, 0.28, 0.48, 0.52, ink);
    faceRect(g, f, 0.45, 0.48, 0.3, 0.49, lit("#a0703e", f.n[0], f.n[1], 0, night)); faceRect(g, f, 0.41, 0.52, 0.47, 0.51, ink);
    faceRect(g, f, 0.68, 0.7, 0.31, 0.49, ink); faceRect(g, f, 0.73, 0.75, 0.31, 0.49, ink);
    // โต๊ะช่างครึ่งล่าง (ไม้ แถบส้ม)
    faceRect(g, f, 0.04, 0.96, 0.06, 0.22, lit(WOOD, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0.04, 0.96, 0.12, 0.15, lit(ORANGE, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0.02, 0.98, 0.22, 0.245, lit("#e2b884", f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0, 1, H - 0.05, H, lit(ORANGE, f.n[0], f.n[1], 0, night));
  }
  if (night) { const [gx, gy] = P(x + 0.5, y + 0.5, 0.25); glow(g, gx, gy, s * 0.75, "255,170,90", 0.3); }
  // หลังคาจั่วสังกะสี (สันตามแกน x)
  const eX0 = x + 0.08, eX1 = x + 0.92, eY0 = y + 0.14, eY1 = y + 0.86, zE = H, zR = 0.9, yR = y + 0.5;
  const slopes = [
    { pts: [[eX0, eY0, zE], [eX1, eY0, zE], [eX1, yR, zR], [eX0, yR, zR]], n: [0, -1], d: depthOf(x + 0.5, eY0) },
    { pts: [[eX1, eY1, zE], [eX0, eY1, zE], [eX0, yR, zR], [eX1, yR, zR]], n: [0, 1], d: depthOf(x + 0.5, eY1) },
  ];
  const gables = [
    { pts: [[eX0, eY0, zE], [eX0, eY1, zE], [eX0, yR, zR]], n: [-1, 0], x: eX0 },
    { pts: [[eX1, eY1, zE], [eX1, eY0, zE], [eX1, yR, zR]], n: [1, 0], x: eX1 },
  ];
  for (const gb of gables) if (faceVisible(gb.n[0], gb.n[1], gb.x, yR)) fill3(g, gb.pts, lit("#c4cfdc", gb.n[0], gb.n[1], 0, night));
  slopes.sort((a, b) => a.d - b.d);
  for (const sl of slopes) {
    fill3(g, sl.pts, lit("#b9c4d2", sl.n[0] * 0.6, sl.n[1] * 0.6, 0.5, night));
    g.strokeStyle = night ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.65)"; g.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const t = i / 8, ax = sl.pts[0][0] + (sl.pts[1][0] - sl.pts[0][0]) * t;
      const a = P(ax, sl.pts[0][1], zE), b = P(ax, yR, zR);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    const a = P(sl.pts[0][0], sl.pts[0][1], zE), b = P(sl.pts[1][0], sl.pts[1][1], zE);
    g.strokeStyle = shadeHex(ORANGE, night ? -0.3 : 0); g.lineWidth = Math.max(1.5, s * 0.035); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  // ปล่องควัน + ควัน
  box(g, x + 0.66, y + 0.3, x + 0.78, y + 0.42, 0.66, 1.08, "#7d8899", night);
  box(g, x + 0.64, y + 0.28, x + 0.8, y + 0.44, 1.08, 1.12, "#5f6b7d", night);
  for (let i = 0; i < 3; i++) {
    const t = (now / 2300 + i / 3) % 1, [sx, sy] = P(x + 0.72, y + 0.36, 1.16 + t * 0.6);
    g.fillStyle = `rgba(${night ? "180,190,205" : "236,241,247"},${0.6 * (1 - t)})`;
    g.beginPath(); g.arc(sx + Math.sin(t * 5 + i) * s * 0.06, sy, s * (0.05 + t * 0.09), 0, TAU); g.fill();
  }
  // ทั่ง + ประกายไฟ ที่มุมลานที่ใกล้กล้องที่สุด
  const corners = [[x + 0.2, y + 0.14], [x + 0.8, y + 0.14], [x + 0.8, y + 0.86], [x + 0.2, y + 0.86]];
  const [ax, ay] = corners.reduce((b, c) => (depthOf(c[0], c[1]) > depthOf(b[0], b[1]) ? c : b));
  const [avX, avY] = P(ax, ay, 0.04), k0 = 0.62;
  g.fillStyle = night ? "#3c4555" : "#5f6b7d";
  g.beginPath(); g.moveTo(avX - s * 0.24 * k0, avY - s * 0.2 * k0); g.lineTo(avX + s * 0.26 * k0, avY - s * 0.2 * k0); g.lineTo(avX + s * 0.14 * k0, avY - s * 0.12 * k0); g.lineTo(avX + s * 0.08 * k0, avY - s * 0.12 * k0);
  g.lineTo(avX + s * 0.12 * k0, avY); g.lineTo(avX - s * 0.12 * k0, avY); g.lineTo(avX - s * 0.08 * k0, avY - s * 0.12 * k0); g.lineTo(avX - s * 0.16 * k0, avY - s * 0.12 * k0); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(avX - s * 0.2 * k0, avY - s * 0.2 * k0, s * 0.4 * k0, s * 0.02);
  const ph = (now / 1400) % 1;
  if (ph < 0.35) {
    const k = ph / 0.35;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.34, d = s * (0.04 + k * 0.22);
      g.fillStyle = `rgba(255,${190 - i * 8},90,${1 - k})`;
      g.beginPath(); g.arc(avX + Math.cos(a) * d, avY - s * 0.14 + Math.sin(a) * d + k * k * s * 0.1, Math.max(1, s * 0.018), 0, TAU); g.fill();
    }
    glow(g, avX, avY - s * 0.14, s * 0.22, "255,180,90", 0.5 * (1 - k));
  }
  crestSign(g, x + 0.5, y + 0.5, 1.5, s, "#ffe1b8", shadeHex(ORANGE, night ? -0.3 : 0), (gg, cx, cy, r) => gear(gg, cx, cy, r * 0.62, 8, now / 2400, ORANGE), night, now);
}

// ============================================================ 3) พ่อค้าเร่ — เกวียน 2×1 (ยาวตามแกน x)
function wheel3(g, cx, wy, cz, r, rot, night) {
  // ล้อแนวตั้ง (ระนาบ x–z ที่ y = wy)
  const rim = [], n = 20;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; rim.push([cx + Math.cos(a) * r, wy, cz + Math.sin(a) * r]); }
  const sc = P(cx, wy, cz)[2];
  path3(g, rim); g.lineWidth = Math.max(1.6, sc * r * 0.16); g.strokeStyle = night ? "#4e3219" : "#7a4e2a"; g.stroke();
  g.lineWidth = Math.max(1, sc * r * 0.07);
  for (let i = 0; i < 8; i++) {
    const a = rot + i / 8 * TAU, p0 = P(cx, wy, cz), p1 = P(cx + Math.cos(a) * r, wy, cz + Math.sin(a) * r);
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  const c = P(cx, wy, cz); g.fillStyle = night ? "#a07a2a" : "#e0b04a"; g.beginPath(); g.arc(c[0], c[1], Math.max(1.6, c[2] * r * 0.25), 0, TAU); g.fill();
}
function drawCara(g, x, y, now, night) {
  const s = scaleAt(x + 1, y + 0.5), PURPLE = "#9b4f96", GOLD = "#e0b04a", WOOD = "#c98a52";
  pad(g, x, y, 2, 1, night ? "rgba(120,95,130,.8)" : "rgba(248,238,252,.95)", night ? "#7a4e80" : "#c98ac4", "224,176,74", now, night);
  shadow(g, x, y, 2, 1, night);
  // พรมวางของ 2 ปลาย (ลายม่วง ขอบทอง)
  for (const [r0, r1] of [[x + 0.07, x + 0.27], [x + 1.73, x + 1.93]]) {
    fill3(g, [[r0, y + 0.2, 0.005], [r1, y + 0.2, 0.005], [r1, y + 0.8, 0.005], [r0, y + 0.8, 0.005]], shadeHex(PURPLE, night ? -0.35 : 0), shadeHex(GOLD, night ? -0.3 : 0), 1.5);
  }
  const cy = y + 0.5, BX0 = x + 0.34, BX1 = x + 1.66, BY0 = y + 0.26, BY1 = y + 0.74, Z0 = 0.22, Z1 = 0.52, WR = 0.17;
  const sideNear = faceVisible(0, 1, x + 1, BY1) ? BY1 : BY0, sideFar = sideNear === BY1 ? BY0 : BY1;
  const spin = now / 3200;
  // ล้อฝั่งไกล → ตัวเกวียน → ผ้าใบ → ล้อฝั่งใกล้
  wheel3(g, x + 0.6, sideFar, WR, WR, spin, night); wheel3(g, x + 1.4, sideFar, WR, WR, spin, night);
  const body = box(g, BX0, BY0, BX1, BY1, Z0, Z1, WOOD, night, true);
  for (const f of body) {
    faceRect(g, f, 0, 1, Z1 - 0.04, Z1, lit(GOLD, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0, 1, Z0, Z0 + 0.035, lit(GOLD, f.n[0], f.n[1], 0, night));
    const L = Math.hypot(f.d[0], f.d[1]);
    for (let i = 0, n = Math.max(1, Math.round(L * 2)); i < n; i++) {
      const u = (i + 0.5) / n, h = 0.045 / Math.max(0.4, L);
      fill3(g, [faceAt(f, u, Z0 + 0.17), faceAt(f, u + h, Z0 + 0.12), faceAt(f, u, Z0 + 0.07), faceAt(f, u - h, Z0 + 0.12)], lit(GOLD, f.n[0], f.n[1], 0, night));
    }
  }
  // ผ้าใบโค้ง (ครึ่งทรงกระบอกตามแกน x) — แผ่นตามความยาว (ลายสลับ) × มุมโค้ง · เรียงไกล → ใกล้
  const ry = 0.27, rz = 0.4, zb = Z1, segX = 6, segA = 10, quads = [];
  for (let i = 0; i < segX; i++) {
    const xa = BX0 + (BX1 - BX0) * i / segX, xb = BX0 + (BX1 - BX0) * (i + 1) / segX;
    for (let j = 0; j < segA; j++) {
      const a0 = Math.PI * j / segA, a1 = Math.PI * (j + 1) / segA;
      const p = (xx, a) => [xx, cy - Math.cos(a) * ry, zb + Math.sin(a) * rz];
      const am = (a0 + a1) / 2, ny = -Math.cos(am), nz = Math.sin(am);
      quads.push({ pts: [p(xa, a0), p(xb, a0), p(xb, a1), p(xa, a1)], d: depthOf((xa + xb) / 2, cy + ny * ry) + nz * 0.01, c: i % 2 ? "#fbf3ff" : PURPLE, ny, nz, vis: faceVisible(0, ny, (xa + xb) / 2, cy + ny * ry) || nz > 0.55 });
    }
  }
  quads.sort((a, b) => a.d - b.d);
  for (const q of quads) if (q.vis) fill3(g, q.pts, lit(q.c, 0, q.ny * 0.8, q.nz, night));
  // ปลายผ้าใบ 2 ด้าน: ช่องเปิดมืด + แสงอุ่นข้างใน
  for (const [ex, nx] of [[BX0, -1], [BX1, 1]]) {
    if (!faceVisible(nx, 0, ex, cy)) continue;
    const arc = []; for (let j = 0; j <= segA; j++) { const a = Math.PI * j / segA; arc.push([ex, cy - Math.cos(a) * ry, zb + Math.sin(a) * rz]); }
    fill3(g, arc, lit(PURPLE, nx, 0, 0, night));
    const inner = arc.map(([ax, ay, az]) => [ax, cy + (ay - cy) * 0.72, zb + (az - zb) * 0.78]);
    fill3(g, inner, night ? "#2a0f2e" : "#4b1a52");
    const [gx, gy] = P(ex, cy, zb + 0.14); glow(g, gx, gy, s * 0.32, "255,210,140", night ? 0.6 : 0.35);
  }
  wheel3(g, x + 0.6, sideNear, WR, WR, spin, night); wheel3(g, x + 1.4, sideNear, WR, WR, spin, night);
  // ตะเกียงแขวนที่มุมเกวียนใกล้กล้อง
  const lc = [[BX0, sideNear], [BX1, sideNear]].reduce((b, c) => (depthOf(c[0], c[1]) > depthOf(b[0], b[1]) ? c : b));
  const [lx, ly0] = P(lc[0], lc[1], Z1 + 0.26), ly = ly0 + Math.sin(now / 900) * s * 0.012;
  glow(g, lx, ly, s * (night ? 0.45 : 0.25), "255,200,110", night ? 0.75 : 0.42);
  g.fillStyle = night ? "#ffd27a" : "#ffe08a"; g.beginPath(); g.ellipse(lx, ly, s * 0.04, s * 0.055, 0, 0, TAU); g.fill();
  // คริสตัลบนพรม (ชมพู / ฟ้า) เรืองแสงเต้น
  const pulse = 0.5 + 0.5 * Math.sin(now / 520), k = 0.72;
  const gems = [[x + 0.17, y + 0.36, "#f08aa8", "240,138,168"], [x + 0.17, y + 0.64, "#7fd8ff", "127,216,255"], [x + 1.83, y + 0.36, "#7fd8ff", "127,216,255"], [x + 1.83, y + 0.64, "#f08aa8", "240,138,168"]];
  gems.map((g0) => ({ g0, d: depthOf(g0[0], g0[1]) })).sort((a, b) => a.d - b.d).forEach(({ g0: [gx, gy, c, rgb] }) => {
    const [px, py] = P(gx, gy, 0.01);
    glow(g, px, py - s * 0.1 * k, s * 0.24 * k, rgb, 0.3 + 0.25 * pulse);
    g.fillStyle = c; g.beginPath(); g.moveTo(px, py - s * 0.3 * k); g.lineTo(px + s * 0.08 * k, py - s * 0.12 * k); g.lineTo(px, py); g.lineTo(px - s * 0.08 * k, py - s * 0.12 * k); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.65)"; g.beginPath(); g.moveTo(px, py - s * 0.3 * k); g.lineTo(px - s * 0.08 * k, py - s * 0.12 * k); g.lineTo(px - s * 0.02 * k, py - s * 0.12 * k); g.closePath(); g.fill();
  });
  crestSign(g, x + 1, cy, 1.42, s, "#f1e3ff", shadeHex(PURPLE, night ? -0.3 : 0), (gg, cx2, cy2, r) => {
    gg.fillStyle = PURPLE; const w = r * 0.55, h = r * 0.62;
    gg.beginPath(); gg.moveTo(cx2 - w, cy2 - h); gg.lineTo(cx2 + w, cy2 - h); gg.lineTo(cx2 + w * 0.12, cy2); gg.lineTo(cx2 + w, cy2 + h); gg.lineTo(cx2 - w, cy2 + h); gg.lineTo(cx2 - w * 0.12, cy2); gg.closePath(); gg.fill();
    gg.fillStyle = GOLD; gg.beginPath(); gg.moveTo(cx2 - w * 0.6, cy2 + h * 0.85); gg.lineTo(cx2 + w * 0.6, cy2 + h * 0.85); gg.lineTo(cx2, cy2 + h * 0.3); gg.closePath(); gg.fill();
  }, night, now);
}

// ร้าน 1 ร้าน (มุมบนซ้าย x, y · ขนาดตามชนิด: ร้านยา/โรงช่าง 1×1 · พ่อค้าเร่ 2×1)
export function drawShopStall(g, kind, x, y, now, night) {
  if (kind === "forge") drawForge(g, x, y, now, night);
  else if (kind === "cara") drawCara(g, x, y, now, night);
  else drawApoth(g, x, y, now, night);
}

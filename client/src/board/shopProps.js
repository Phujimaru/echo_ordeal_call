// ============================================================
//  ร้านค้า 3 ร้านบนกระดาน — ขนาด 2×2 ช่อง แบบ 2.5D (ผู้ใช้สั่ง 2026-11-08: "ทำให้ดูเป็น 2.5D ร้านดูบางๆ")
//   apoth = ร้านยาเจริญชัย — ซุ้มยากลางลาน: เคาน์เตอร์ 4 ด้าน · หอชั้นโหลยา · เสา 4 มุม · หลังคาปั้นหยาผ้าลายมิ้นต์ ระบายหยัก
//   forge = โรงช่างลุงเริง — โรงเหล็ก: ผนังแผงเครื่องมือ + โต๊ะช่าง · หลังคาจั่วสังกะสี · ปล่องควัน · ทั่งมีประกายไฟ
//   cara  = พ่อค้าเร่ — เกวียน: ตัวไม้ขอบทอง · ล้อไม้ 4 ล้อ · ผ้าใบโค้งลายม่วง/ขาว · ตะเกียง · คริสตัลบนพรม
//  เรขาคณิตอยู่ในพิกัดกระดาน (x, y, สูง z) แล้วฉายผ่าน P() → หมุนกล้อง/ซูมตามกระดาน · ด้านที่หันหลังกล้องไม่วาด (faceVisible)
//  แสง: ด้านที่หันไปทางขวาของจอเข้มลง (แบบเดียวกับสไปรต์เดิม) · กลางคืนเข้มลง + ไฟอุ่น
//  (x, y) = มุมบนซ้ายของร้าน · ยังใช้เฉพาะหน้าดูกระดาน (?board=1&shops=1)
// ============================================================
import { P, depthOf, faceVisible, glow, hexPath, shadeHex, viewAxes } from "./boardGeo";

const TAU = Math.PI * 2;
export const SHOP_SIZE = 2;
export const SHOP_KINDS = ["apoth", "forge", "cara"];

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
function shadow(g, x, y, s, night) {
  const [bx, by] = P(x + 1, y + 1, 0);
  g.fillStyle = night ? "rgba(0,8,24,.42)" : "rgba(28,46,40,.2)";
  g.beginPath(); g.ellipse(bx + s * 0.08, by, s * 1.25, s * 0.42, 0, 0, TAU); g.fill();
}
// ลานของร้าน 2×2 + เส้นประเรืองแสงเต้นช้าๆ
function pad(g, x, y, fill, rim, rgb, now, night) {
  fill3(g, [[x + 0.04, y + 0.04, 0], [x + 1.96, y + 0.04, 0], [x + 1.96, y + 1.96, 0], [x + 0.04, y + 1.96, 0]], fill, rim, 2);
  const p = 0.5 + 0.5 * Math.sin(now / 900 + x);
  path3(g, [[x + 0.14, y + 0.14, 0], [x + 1.86, y + 0.14, 0], [x + 1.86, y + 1.86, 0], [x + 0.14, y + 1.86, 0]]);
  g.setLineDash([6, 5]); g.lineWidth = 1.5; g.strokeStyle = `rgba(${rgb},${(night ? 0.55 : 0.4) + 0.25 * p})`; g.stroke(); g.setLineDash([]);
}
// ป้ายตราร้าน (หกเหลี่ยม ลอยขึ้นลง) ที่จุดบนอากาศ
function crestSign(g, x, y, z, s, c1, c2, drawIcon, night, now) {
  const [cx, cy0] = P(x, y, z);
  const cy = cy0 + Math.sin(now / 760 + x) * s * 0.05, r = s * 0.24;
  glow(g, cx, cy, r * 2.1, night ? "255,220,150" : "255,255,255", night ? 0.35 : 0.5);
  hexPath(g, cx, cy, r * 1.12, r * 0.98); g.fillStyle = c2; g.fill();
  hexPath(g, cx, cy, r, r * 0.87);
  const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fill();
  drawIcon(g, cx, cy, r);
}
// ขวดโหล (สไปรต์เล็ก) ยืนที่จุด (x, y, z)
function jarAt(g, x, y, z, s, liquid, night) {
  const [cx, by] = P(x, y, z), w = s * 0.13, h = s * 0.17;
  g.fillStyle = night ? "rgba(200,220,235,.7)" : "rgba(255,255,255,.9)";
  g.beginPath(); g.ellipse(cx, by - h * 0.5, w * 0.55, h * 0.55, 0, 0, TAU); g.fill();
  g.fillStyle = liquid; g.beginPath(); g.ellipse(cx, by - h * 0.38, w * 0.45, h * 0.38, 0, 0, TAU); g.fill();
  g.fillStyle = night ? "#8d6a3f" : "#c79a5b"; g.fillRect(cx - w * 0.22, by - h * 1.12, w * 0.44, h * 0.16);
  g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(cx - w * 0.3, by - h * 0.82, w * 0.09, h * 0.36);
}
const scaleAt = (x, y) => P(x, y, 0)[2];

// ============================================================ 1) ร้านยาเจริญชัย — ซุ้มยา
const LIQ = ["#5fd0b3", "#7fbef5", "#f08aa8", "#f3c86a", "#b48af0", "#6fd28a"];
function drawApoth(g, x, y, now, night) {
  const s = scaleAt(x + 1, y + 1), MINT = "#2fa58c", WHITE = "#f8fbfa", GOLD = "#e0b04a";
  pad(g, x, y, night ? "rgba(120,150,150,.75)" : "rgba(236,248,243,.95)", night ? "#4f8f80" : "#8fd6c0", "95,208,179", now, night);
  shadow(g, x, y, s, night);
  // ฐานหิน
  box(g, x + 0.1, y + 0.1, x + 1.9, y + 1.9, 0, 0.05, "#e9efe9", night);
  // เสาหลังก่อน (ไกลกล้อง) → ตัวซุ้ม → เสาหน้า
  const posts = [[x + 0.14, y + 0.14], [x + 1.78, y + 0.14], [x + 1.78, y + 1.78], [x + 0.14, y + 1.78]].map(([px, py]) => ({ px, py, d: depthOf(px + 0.04, py + 0.04) }));
  const mid = depthOf(x + 1, y + 1);
  const post = (p) => box(g, p.px, p.py, p.px + 0.08, p.py + 0.08, 0.05, 1.28, WHITE, night, true);
  posts.filter((p) => p.d < mid).forEach(post);
  // เคาน์เตอร์ 4 ด้าน
  const faces = box(g, x + 0.34, y + 0.34, x + 1.66, y + 1.66, 0.05, 0.5, WHITE, night, false);
  for (const f of faces) {
    faceRect(g, f, 0, 1, 0.2, 0.3, lit(MINT, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0, 1, 0.31, 0.335, lit(GOLD, f.n[0], f.n[1], 0, night));
    // กากบาทยาตรงกลางด้าน
    faceRect(g, f, 0.47, 0.53, 0.06, 0.19, lit(MINT, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0.43, 0.57, 0.105, 0.145, lit(MINT, f.n[0], f.n[1], 0, night));
  }
  // ท็อปเคาน์เตอร์ (ไม้ครีม ยื่นเล็กน้อย)
  box(g, x + 0.3, y + 0.3, x + 1.7, y + 1.7, 0.5, 0.55, "#f3e6cc", night);
  // หอชั้นโหลยากลางซุ้ม
  const tower = box(g, x + 0.72, y + 0.72, x + 1.28, y + 1.28, 0.55, 1.12, "#ffffff", night, true);
  for (const f of tower) {
    faceRect(g, f, 0, 1, 0.55, 1.12, lit("#e6f3ee", f.n[0], f.n[1], 0, night));
    for (let r = 0; r < 2; r++) {
      const zs = 0.6 + r * 0.26;
      faceRect(g, f, 0.04, 0.96, zs, zs + 0.025, lit("#d9c8a6", f.n[0], f.n[1], 0, night));
      for (let i = 0; i < 3; i++) {
        const u = 0.2 + i * 0.3;
        const [jx, jy, jz] = faceAt(f, u, zs + 0.025);
        jarAt(g, jx + f.n[0] * 0.02, jy + f.n[1] * 0.02, jz, s * 0.8, LIQ[(i + r * 2 + Math.abs(f.n[0]) * 3) % LIQ.length], night);
      }
    }
  }
  if (night) { const [gx, gy] = P(x + 1, y + 1, 0.85); glow(g, gx, gy, s * 0.9, "255,214,140", 0.32); }
  // ของบนเคาน์เตอร์: โหลใหญ่ตามมุม (เรียงไกล → ใกล้)
  [[x + 0.48, y + 0.5], [x + 1.52, y + 0.5], [x + 1.52, y + 1.5], [x + 0.48, y + 1.5]]
    .map(([jx, jy], i) => ({ jx, jy, i, d: depthOf(jx, jy) })).sort((a, b) => a.d - b.d)
    .forEach((j) => jarAt(g, j.jx, j.jy, 0.55, s * 1.15, LIQ[j.i], night));
  posts.filter((p) => p.d >= mid).forEach(post);
  // หลังคาปั้นหยาผ้าลายมิ้นต์/ขาว
  hipRoof(g, x + 0.02, y + 0.02, x + 1.98, y + 1.98, 1.28, [x + 1, y + 1, 1.78], MINT, "#ffffff", 4, 0.12, night);
  // ยอดทอง + ป้ายตรา
  { const [tx, ty] = P(x + 1, y + 1, 1.8); g.fillStyle = shadeHex(GOLD, night ? -0.3 : 0); g.beginPath(); g.arc(tx, ty, s * 0.06, 0, TAU); g.fill(); }
  crestSign(g, x + 1, y + 1, 2.25, s, "#c8f2e2", shadeHex(MINT, night ? -0.3 : 0), (gg, cx, cy, r) => {
    gg.fillStyle = MINT; const a = r * 0.22, b = r * 0.62;
    gg.fillRect(cx - a, cy - b, a * 2, b * 2); gg.fillRect(cx - b, cy - a, b * 2, a * 2);
  }, night, now);
}

// ============================================================ 2) โรงช่างลุงเริง — โรงเหล็ก
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
  const s = scaleAt(x + 1, y + 1), STEEL = "#dfe6ef", ORANGE = "#e07a2a", WOOD = "#b98150";
  pad(g, x, y, night ? "rgba(110,120,136,.8)" : "rgba(226,232,240,.95)", night ? "#5f6b7d" : "#aab6c6", "224,122,42", now, night);
  shadow(g, x, y, s, night);
  box(g, x + 0.08, y + 0.08, x + 1.92, y + 1.92, 0, 0.05, "#c9d2dc", night);
  // ตัวโรง
  const X0 = x + 0.22, Y0 = y + 0.3, X1 = x + 1.78, Y1 = y + 1.7, H = 0.8;
  const walls = box(g, X0, Y0, X1, Y1, 0.05, H, STEEL, night, false);
  for (const f of walls) {
    const L = Math.hypot(f.d[0], f.d[1]);
    // แผงรูพรุนครึ่งบน
    const dotC = night ? "rgba(20,30,45,.4)" : "rgba(60,80,110,.32)";
    const nu = Math.round(L * 9);
    for (let i = 1; i < nu; i++) for (let r = 0; r < 3; r++) {
      const [px, py] = P(...faceAt(f, i / nu, 0.46 + r * 0.1));
      g.fillStyle = dotC; g.beginPath(); g.arc(px, py, Math.max(1, s * 0.012), 0, TAU); g.fill();
    }
    // เครื่องมือแขวน: ประแจ / ค้อน / คีม
    const ink = lit("#4f5a6b", f.n[0], f.n[1], 0, night);
    faceRect(g, f, 0.18, 0.21, 0.42, 0.68, ink); faceRect(g, f, 0.155, 0.235, 0.66, 0.7, ink);
    faceRect(g, f, 0.4, 0.42, 0.42, 0.66, lit("#a0703e", f.n[0], f.n[1], 0, night)); faceRect(g, f, 0.37, 0.45, 0.64, 0.69, ink);
    faceRect(g, f, 0.6, 0.615, 0.44, 0.66, ink); faceRect(g, f, 0.635, 0.65, 0.44, 0.66, ink);
    // โต๊ะช่างครึ่งล่าง (ไม้ แถบส้ม)
    faceRect(g, f, 0.04, 0.96, 0.08, 0.32, lit(WOOD, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0.04, 0.96, 0.17, 0.21, lit(ORANGE, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0.02, 0.98, 0.32, 0.35, lit("#e2b884", f.n[0], f.n[1], 0, night));
    // แถบส้มใต้ชายคา
    faceRect(g, f, 0, 1, H - 0.06, H, lit(ORANGE, f.n[0], f.n[1], 0, night));
  }
  if (night) { const [gx, gy] = P(x + 1, y + 1, 0.3); glow(g, gx, gy, s * 1.1, "255,170,90", 0.3); }
  // หลังคาจั่วสังกะสี (สันตามแกน x)
  const eX0 = x + 0.1, eX1 = x + 1.9, eY0 = y + 0.18, eY1 = y + 1.82, zE = H, zR = 1.22, yR = y + 1;
  const slopes = [
    { pts: [[eX0, eY0, zE], [eX1, eY0, zE], [eX1, yR, zR], [eX0, yR, zR]], n: [0, -1], d: depthOf(x + 1, eY0) },
    { pts: [[eX1, eY1, zE], [eX0, eY1, zE], [eX0, yR, zR], [eX1, yR, zR]], n: [0, 1], d: depthOf(x + 1, eY1) },
  ];
  const gables = [
    { pts: [[eX0, eY0, zE], [eX0, eY1, zE], [eX0, yR, zR]], n: [-1, 0], x: eX0 },
    { pts: [[eX1, eY1, zE], [eX1, eY0, zE], [eX1, yR, zR]], n: [1, 0], x: eX1 },
  ];
  for (const gb of gables) if (faceVisible(gb.n[0], gb.n[1], gb.x, yR)) fill3(g, gb.pts, lit("#c4cfdc", gb.n[0], gb.n[1], 0, night));
  slopes.sort((a, b) => a.d - b.d);
  for (const sl of slopes) {
    fill3(g, sl.pts, lit("#b9c4d2", sl.n[0] * 0.6, sl.n[1] * 0.6, 0.5, night));
    // ลอนสังกะสี
    g.strokeStyle = night ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.65)"; g.lineWidth = 1.2;
    for (let i = 1; i < 14; i++) {
      const t = i / 14, ax = sl.pts[0][0] + (sl.pts[1][0] - sl.pts[0][0]) * t;
      const a = P(ax, sl.pts[0][1], zE), b = P(ax, yR, zR);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    // ขอบส้มที่ชายคา
    const a = P(sl.pts[0][0], sl.pts[0][1], zE), b = P(sl.pts[1][0], sl.pts[1][1], zE);
    g.strokeStyle = shadeHex(ORANGE, night ? -0.3 : 0); g.lineWidth = Math.max(2, s * 0.04); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  // ปล่องควัน + ควัน
  box(g, x + 1.4, y + 0.55, x + 1.6, y + 0.75, 0.9, 1.55, "#7d8899", night);
  box(g, x + 1.37, y + 0.52, x + 1.63, y + 0.78, 1.55, 1.6, "#5f6b7d", night);
  for (let i = 0; i < 4; i++) {
    const t = (now / 2300 + i / 4) % 1, [sx, sy] = P(x + 1.5, y + 0.65, 1.65 + t * 0.9);
    g.fillStyle = `rgba(${night ? "180,190,205" : "236,241,247"},${0.6 * (1 - t)})`;
    g.beginPath(); g.arc(sx + Math.sin(t * 5 + i) * s * 0.08, sy, s * (0.07 + t * 0.12), 0, TAU); g.fill();
  }
  // เฟืองหมุนเหนือประตู (ป้ายบนอากาศ)
  { const [gx, gy] = P(x + 0.65, y + 1, 1.32); gear(g, gx, gy, s * 0.17, 9, now / 1600, shadeHex(ORANGE, night ? -0.3 : 0)); }
  // ทั่ง + ประกายไฟ ที่มุมลานที่ใกล้กล้องที่สุด
  const corners = [[x + 0.22, y + 0.18], [x + 1.78, y + 0.18], [x + 1.78, y + 1.82], [x + 0.22, y + 1.82]];
  const [ax, ay] = corners.reduce((b, c) => (depthOf(c[0], c[1]) > depthOf(b[0], b[1]) ? c : b));
  const [avX, avY] = P(ax, ay, 0.05);
  g.fillStyle = night ? "#3c4555" : "#5f6b7d";
  g.beginPath(); g.moveTo(avX - s * 0.24, avY - s * 0.2); g.lineTo(avX + s * 0.26, avY - s * 0.2); g.lineTo(avX + s * 0.14, avY - s * 0.12); g.lineTo(avX + s * 0.08, avY - s * 0.12);
  g.lineTo(avX + s * 0.12, avY); g.lineTo(avX - s * 0.12, avY); g.lineTo(avX - s * 0.08, avY - s * 0.12); g.lineTo(avX - s * 0.16, avY - s * 0.12); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(avX - s * 0.2, avY - s * 0.2, s * 0.4, s * 0.025);
  const ph = (now / 1400) % 1;
  if (ph < 0.35) {
    const k = ph / 0.35;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.32, d = s * (0.06 + k * 0.34);
      g.fillStyle = `rgba(255,${190 - i * 8},90,${1 - k})`;
      g.beginPath(); g.arc(avX + Math.cos(a) * d, avY - s * 0.22 + Math.sin(a) * d + k * k * s * 0.15, Math.max(1, s * 0.022), 0, TAU); g.fill();
    }
    glow(g, avX, avY - s * 0.22, s * 0.32, "255,180,90", 0.5 * (1 - k));
  }
  crestSign(g, x + 1, y + 1, 1.9, s, "#ffe1b8", shadeHex(ORANGE, night ? -0.3 : 0), (gg, cx, cy, r) => gear(gg, cx, cy, r * 0.62, 8, now / 2400, ORANGE), night, now);
}

// ============================================================ 3) พ่อค้าเร่ — เกวียน
function wheel3(g, cx, wy, cz, r, rot, night) {
  // ล้อแนวตั้ง (ระนาบ x–z ที่ y = wy)
  const rim = [], n = 22;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; rim.push([cx + Math.cos(a) * r, wy, cz + Math.sin(a) * r]); }
  const sc = P(cx, wy, cz)[2];
  path3(g, rim); g.lineWidth = Math.max(2, sc * r * 0.16); g.strokeStyle = night ? "#4e3219" : "#7a4e2a"; g.stroke();
  g.lineWidth = Math.max(1.2, sc * r * 0.07);
  for (let i = 0; i < 8; i++) {
    const a = rot + i / 8 * TAU, p0 = P(cx, wy, cz), p1 = P(cx + Math.cos(a) * r, wy, cz + Math.sin(a) * r);
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  const c = P(cx, wy, cz); g.fillStyle = night ? "#a07a2a" : "#e0b04a"; g.beginPath(); g.arc(c[0], c[1], Math.max(2, c[2] * r * 0.25), 0, TAU); g.fill();
}
function drawCara(g, x, y, now, night) {
  const s = scaleAt(x + 1, y + 1), PURPLE = "#9b4f96", GOLD = "#e0b04a", WOOD = "#c98a52";
  pad(g, x, y, night ? "rgba(120,95,130,.8)" : "rgba(248,238,252,.95)", night ? "#7a4e80" : "#c98ac4", "224,176,74", now, night);
  shadow(g, x, y, s, night);
  // พรมวางของ (ลายม่วง ขอบทอง)
  fill3(g, [[x + 0.22, y + 0.16, 0.005], [x + 1.78, y + 0.16, 0.005], [x + 1.78, y + 0.52, 0.005], [x + 0.22, y + 0.52, 0.005]], shadeHex(PURPLE, night ? -0.35 : 0), shadeHex(GOLD, night ? -0.3 : 0), 2);
  fill3(g, [[x + 0.22, y + 1.5, 0.005], [x + 1.78, y + 1.5, 0.005], [x + 1.78, y + 1.86, 0.005], [x + 0.22, y + 1.86, 0.005]], shadeHex(PURPLE, night ? -0.35 : 0), shadeHex(GOLD, night ? -0.3 : 0), 2);
  const BX0 = x + 0.28, BX1 = x + 1.72, BY0 = y + 0.66, BY1 = y + 1.34, Z0 = 0.26, Z1 = 0.62, WR = 0.2;
  const sideNear = faceVisible(0, 1, x + 1, BY1) ? BY1 : BY0, sideFar = sideNear === BY1 ? BY0 : BY1;
  const spin = now / 3200;
  // ล้อฝั่งไกล → ตัวเกวียน → ผ้าใบ → ล้อฝั่งใกล้
  wheel3(g, x + 0.55, sideFar, WR, WR, spin, night); wheel3(g, x + 1.45, sideFar, WR, WR, spin, night);
  const body = box(g, BX0, BY0, BX1, BY1, Z0, Z1, WOOD, night, true);
  for (const f of body) {
    faceRect(g, f, 0, 1, Z1 - 0.045, Z1, lit(GOLD, f.n[0], f.n[1], 0, night));
    faceRect(g, f, 0, 1, Z0, Z0 + 0.04, lit(GOLD, f.n[0], f.n[1], 0, night));
    const L = Math.hypot(f.d[0], f.d[1]);
    for (let i = 0, n = Math.max(1, Math.round(L * 2)); i < n; i++) {
      const u = (i + 0.5) / n, h = 0.05 / Math.max(0.4, L);
      fill3(g, [faceAt(f, u, Z0 + 0.19), faceAt(f, u + h, Z0 + 0.13), faceAt(f, u, Z0 + 0.07), faceAt(f, u - h, Z0 + 0.13)], lit(GOLD, f.n[0], f.n[1], 0, night));
    }
  }
  // ผ้าใบโค้ง (ครึ่งทรงกระบอกตามแกน x) — แบ่งเป็นแผ่นตามความยาว (ลายสลับ) × มุมโค้ง แล้วเรียงไกล → ใกล้
  const cy = y + 1, ry = 0.38, rz = 0.5, zb = Z1, segX = 6, segA = 10, quads = [];
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
    const [gx, gy] = P(ex, cy, zb + 0.18); glow(g, gx, gy, s * 0.42, "255,210,140", night ? 0.6 : 0.35);
  }
  wheel3(g, x + 0.55, sideNear, WR, WR, spin, night); wheel3(g, x + 1.45, sideNear, WR, WR, spin, night);
  // ตะเกียงแขวนที่มุมเกวียนใกล้กล้อง
  const lc = [[BX0, sideNear], [BX1, sideNear]].reduce((b, c) => (depthOf(c[0], c[1]) > depthOf(b[0], b[1]) ? c : b));
  const [lx, ly0] = P(lc[0], lc[1], Z1 + 0.32), ly = ly0 + Math.sin(now / 900) * s * 0.015;
  glow(g, lx, ly, s * (night ? 0.6 : 0.32), "255,200,110", night ? 0.75 : 0.42);
  g.fillStyle = night ? "#ffd27a" : "#ffe08a"; g.beginPath(); g.ellipse(lx, ly, s * 0.05, s * 0.07, 0, 0, TAU); g.fill();
  // คริสตัลบนพรม (ชมพู / ฟ้า) เรืองแสงเต้น
  const pulse = 0.5 + 0.5 * Math.sin(now / 520);
  const gems = [[x + 0.7, y + 0.34, "#f08aa8", "240,138,168"], [x + 1.3, y + 0.34, "#7fd8ff", "127,216,255"], [x + 0.7, y + 1.68, "#7fd8ff", "127,216,255"], [x + 1.3, y + 1.68, "#f08aa8", "240,138,168"]];
  gems.map((g0) => ({ g0, d: depthOf(g0[0], g0[1]) })).sort((a, b) => a.d - b.d).forEach(({ g0: [gx, gy, c, rgb] }) => {
    const [px, py] = P(gx, gy, 0.01);
    glow(g, px, py - s * 0.12, s * 0.28, rgb, 0.3 + 0.25 * pulse);
    g.fillStyle = c; g.beginPath(); g.moveTo(px, py - s * 0.3); g.lineTo(px + s * 0.08, py - s * 0.12); g.lineTo(px, py); g.lineTo(px - s * 0.08, py - s * 0.12); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.65)"; g.beginPath(); g.moveTo(px, py - s * 0.3); g.lineTo(px - s * 0.08, py - s * 0.12); g.lineTo(px - s * 0.02, py - s * 0.12); g.closePath(); g.fill();
  });
  crestSign(g, x + 1, y + 1, Z1 + rz + 0.55, s, "#f1e3ff", shadeHex(PURPLE, night ? -0.3 : 0), (gg, cx2, cy2, r) => {
    gg.fillStyle = PURPLE; const w = r * 0.55, h = r * 0.62;
    gg.beginPath(); gg.moveTo(cx2 - w, cy2 - h); gg.lineTo(cx2 + w, cy2 - h); gg.lineTo(cx2 + w * 0.12, cy2); gg.lineTo(cx2 + w, cy2 + h); gg.lineTo(cx2 - w, cy2 + h); gg.lineTo(cx2 - w * 0.12, cy2); gg.closePath(); gg.fill();
    gg.fillStyle = GOLD; gg.beginPath(); gg.moveTo(cx2 - w * 0.6, cy2 + h * 0.85); gg.lineTo(cx2 + w * 0.6, cy2 + h * 0.85); gg.lineTo(cx2, cy2 + h * 0.3); gg.closePath(); gg.fill();
  }, night, now);
}

// ร้าน 1 ร้าน (มุมบนซ้าย x, y · ขนาด 2×2)
export function drawShopStall(g, kind, x, y, now, night) {
  if (kind === "forge") drawForge(g, x, y, now, night);
  else if (kind === "cara") drawCara(g, x, y, now, night);
  else drawApoth(g, x, y, now, night);
}

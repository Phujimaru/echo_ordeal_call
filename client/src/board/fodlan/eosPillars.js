// ============================================================
//  ภาพของสนาม Eos — เสายึดพื้นที่ 5 แบบตามโซน (drawPillar) + ทรงพื้นฐาน (frustum/crystal …)
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, depthOf, faceVisible, gEllipse } from "../boardGeo";
import { TAU, hash, K, PAL, glowAt, poly, hull, FAST, LAST_FD, PILLAR_ZONE, PILLAR_NEUTRAL, hex6, shadeCol, faceLit, sqPts, regPoly } from "./eosBase";
import { rockShape } from "./eosFlora";
import { shard } from "./eosObstacles";

// แท่งเหลี่ยมเรียว: ฐาน (z0) → ยอด (z1) จุดเท่ากัน เรียงตามแบบ box() (มุมเพิ่ม) · วาดเฉพาะด้านที่หันกล้อง · สีตามทิศแสง
export function frustum(g, base, z0, top, z1, col, topCol = null, edge = null) {
  const n = base.length, faces = [];
  for (let i = 0; i < n; i++) {
    const a = base[i], b = base[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey) || 1, nx = ey / L, ny = -ex / L;
    if (!faceVisible(nx, ny, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
    const lit = faceLit(nx, ny), ta = top[i], tb = top[(i + 1) % n];
    poly(g, [[a[0], a[1], z0], [b[0], b[1], z0], [tb[0], tb[1], z1], [ta[0], ta[1], z1]]);
    g.fillStyle = shadeCol(col, lit > 0 ? lit * 0.22 : lit * 0.38); g.fill();
    if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.stroke(); }
    faces.push({ a, b, ta, tb, nx, ny });
  }
  if (topCol) { poly(g, top.map(([x, y]) => [x, y, z1])); g.fillStyle = topCol; g.fill(); if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.stroke(); } }
  return faces;
}
// ทรงกลม/กรวยตัด (รัศมี r0 ที่ z0 → r1 ที่ z1) — เงาข้าง = เปลือกนูนของวงบน/ล่างที่ฉายจริง (ถูกทุกมุมกล้อง/ความเอียง) · col = { body, dark, hi }
function solidRound(g, cx, cy, r0, z0, r1, z1, col, topCol = null, n = 16) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, p = P(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, z0), q = P(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, z1);
    pts.push([p[0], p[1]], [q[0], q[1]]);
  }
  const h = hull(pts);
  let lo = Infinity, hi = -Infinity;
  for (const [x] of h) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const gr = g.createLinearGradient(lo, 0, hi + 0.01, 0);
  gr.addColorStop(0, col.dark); gr.addColorStop(0.28, col.body); gr.addColorStop(0.42, col.hi); gr.addColorStop(0.7, col.body); gr.addColorStop(1, col.dark);
  g.beginPath(); h.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = gr; g.fill();
  if (topCol) { gEllipse(g, cx, cy, r1, z1, n + 4); g.fillStyle = topCol; g.fill(); }
}
function arcPath(g, cx, cy, r, z, a0, a1, n = 24) {
  g.beginPath();
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
}
// คริสตัลแปดหน้าหมุนรอบแกนตั้ง (วาดเฉพาะหน้าที่หันกล้อง · หน้าบนสว่างกว่า)
function crystal(g, cx, cy, zc, r, up, down, rot, col, night) {
  const eq = [0, 1, 2, 3].map((i) => [cx + Math.cos(rot + i * Math.PI / 2) * r, cy + Math.sin(rot + i * Math.PI / 2) * r]);
  const c = P(cx, cy, zc);
  glowAt(g, c[0], c[1], c[2] * (night ? 1.5 : 1.05), hexRgb(col), night ? 0.7 : 0.45);
  const faces = [];
  for (let i = 0; i < 4; i++) {
    const a = eq[i], b = eq[(i + 1) % 4], mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
    if (!faceVisible(mx, my, cx + mx, cy + my)) continue;
    const lit = faceLit(mx / r, my / r);
    faces.push([[a[0], a[1], zc], [b[0], b[1], zc], [cx, cy, zc + up], shadeCol(col, 0.25 + Math.max(0, lit) * 0.3)]);
    faces.push([[a[0], a[1], zc], [b[0], b[1], zc], [cx, cy, zc - down], shadeCol(col, -0.18 + Math.max(0, lit) * 0.2)]);
  }
  g.globalAlpha *= 0.94;
  for (const [a, b, t, fill] of faces) { poly(g, [a, b, t]); g.fillStyle = fill; g.fill(); g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 1; g.stroke(); }
  g.globalAlpha /= 0.94;
  const tp = P(cx, cy, zc + up * 0.8);
  g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(tp[0] - c[2] * 0.02, tp[1], Math.max(1, c[2] * 0.018), 0, TAU); g.fill();
}
// ฐานร่วม: วงสีเจ้าของ · พิธียึดที่กำลังร่าย (ความคืบหน้าครึ่งวง — ร่ายแล้ว 1 ใน 2 ครั้ง)
function pillarGround(g, pl, cx, cy, night, now) {
  const own = pl && pl.color ? hex6(pl.color, "#ffffff") : null, ch = pl && pl.ch;
  if (own) {
    gEllipse(g, cx, cy, 0.52, 0.012, 32); g.strokeStyle = hexA(own, 0.3); g.lineWidth = 7; g.stroke();
    g.strokeStyle = own; g.lineWidth = 2.2; g.stroke();
  } else { gEllipse(g, cx, cy, 0.52, 0.012, 32); g.strokeStyle = night ? "rgba(160,180,210,.22)" : "rgba(40,40,30,.22)"; g.lineWidth = 1.5; g.stroke(); }
  if (!ch) return;
  const col = hex6(ch.color, "#ffffff"), a0 = -Math.PI / 2, grow = (now / 1500) % 1;
  g.lineCap = "round";
  arcPath(g, cx, cy, 0.64, 0.02, 0, TAU, 40); g.strokeStyle = hexA(col, 0.22); g.lineWidth = 5; g.stroke();
  arcPath(g, cx, cy, 0.64, 0.02, a0, a0 + Math.PI, 24); g.strokeStyle = hexA(col, 0.35); g.lineWidth = 9; g.stroke();
  g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  arcPath(g, cx, cy, 0.64, 0.02, a0 + Math.PI, a0 + Math.PI + Math.PI * 0.35 * grow, 10); g.strokeStyle = hexA(col, 0.7 * (1 - grow)); g.lineWidth = 4; g.stroke();
  g.lineCap = "butt";
  g.strokeStyle = hexA(col, 0.35 + 0.15 * Math.sin(now / 400)); g.lineWidth = 1.6; // วงนอกทึบจาง (เลิกเส้นประ — ผู้ใช้สั่ง 2026-11-10)
  gEllipse(g, cx, cy, 0.86 + 0.04 * Math.sin(now / 400), 0.04, 36); g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
  const c = P(cx, cy, 0.4);
  glowAt(g, c[0], c[1], c[2] * 1.3, hexRgb(col), 0.3 + 0.12 * Math.sin(now / 220));
  if (!FAST) for (let i = 0; i < 7; i++) { // ประกายลอยขึ้นรอบเสา
    const k = ((now / 1800) + i / 7) % 1, a = i * 2.4 + now / 2000, q = P(cx + Math.cos(a) * 0.55, cy + Math.sin(a) * 0.55, k * 1.6);
    g.fillStyle = hexA(col, 0.9 * (1 - k)); g.beginPath(); g.arc(q[0], q[1], Math.max(1, q[2] * 0.025), 0, TAU); g.fill();
  }
}
export const hexA = (h, a) => `rgba(${hexRgb(h)},${a})`;
const tintA = (h, k, a) => { const [r, gg, b] = hexRgb(h).split(",").map(Number), m = (v) => Math.round(v + (255 - v) * k); return `rgba(${m(r)},${m(gg)},${m(b)},${a})`; };
// มงกุฎลอยสีเจ้าของ (มองจากทุกมุม) + ลำแสงขึ้นฟ้ายามค่ำ
function pillarCrown(g, own, cx, cy, z, now, night) {
  if (!own) return;
  const col = hex6(own, "#ffffff"), bob = Math.sin(now / 900 + cx) * 0.03, zc = z + bob, c = P(cx, cy, zc + 0.05);
  if (night && !FAST) {
    const top = P(cx, cy, zc + 3), w0 = c[2] * 0.09, w1 = c[2] * 0.22, gr = g.createLinearGradient(c[0], c[1], top[0], top[1]);
    gr.addColorStop(0, hexA(col, 0.35)); gr.addColorStop(1, hexA(col, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(c[0] - w0, c[1]); g.lineTo(top[0] - w1, top[1]); g.lineTo(top[0] + w1, top[1]); g.lineTo(c[0] + w0, c[1]); g.closePath(); g.fill();
  }
  glowAt(g, c[0], c[1], c[2] * 0.75, hexRgb(col), night ? 0.8 : 0.55);
  const n = 6, r = 0.15, rot = now / 2600, sp = [];
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * TAU;
    sp.push({ d: depthOf(cx + Math.cos(a) * r, cy + Math.sin(a) * r), a });
  }
  sp.sort((p, q) => p.d - q.d);
  gEllipse(g, cx, cy, r, zc, 24); g.strokeStyle = shadeCol(col, -0.3); g.lineWidth = 4; g.stroke();
  for (const { a } of sp) {
    const b0 = P(cx + Math.cos(a - 0.3) * r, cy + Math.sin(a - 0.3) * r, zc), b1 = P(cx + Math.cos(a + 0.3) * r, cy + Math.sin(a + 0.3) * r, zc), t = P(cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 1.08, zc + 0.14);
    g.fillStyle = shadeCol(col, 0.15); g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(t[0], t[1]); g.lineTo(b1[0], b1[1]); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(t[0], t[1], Math.max(1, t[2] * 0.018), 0, TAU); g.fill();
  }
  gEllipse(g, cx, cy, r, zc, 24); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
}
// น้ำไหลเป็นสาย (ชามบนยอด → อ่าง / หัวพ่นน้ำพุ) · a0/a1 = รัศมีต้น/ปลาย
function waterArc(g, cx, cy, a, r0, z0, rc, zc, r1, z1, now, night) {
  const p0 = P(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, z0), pc = P(cx + Math.cos(a) * rc, cy + Math.sin(a) * rc, zc), p1 = P(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, z1), s = p0[2];
  g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(pc[0], pc[1], p1[0], p1[1]);
  g.strokeStyle = night ? "rgba(150,200,240,.45)" : "rgba(200,238,255,.6)"; g.lineWidth = Math.max(1.5, s * 0.03); g.stroke();
  if (!FAST) { g.setLineDash([Math.max(2, s * 0.05), Math.max(2, s * 0.07)]); g.lineDashOffset = -now / 22; g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = Math.max(1, s * 0.012); g.stroke(); g.setLineDash([]); g.lineDashOffset = 0; }
  g.fillStyle = "rgba(235,250,255,.55)"; g.beginPath(); g.ellipse(p1[0], p1[1], s * 0.04, s * 0.015, 0, 0, TAU); g.fill();
}
const frontOf = (cx, cy, a, r) => depthOf(cx + Math.cos(a) * r, cy + Math.sin(a) * r) > depthOf(cx, cy);

// ---------- Insomnia: โอเบลิสก์หินดำ 2 ชั้นขอบเงิน + คริสตัลหลวง ----------
function pillarInsomnia(g, cx, cy, acc, night, now) {
  const blk = night ? "#14171c" : "#1f242b", trim = night ? "#8994a2" : "#d3dae3", trimA = night ? "rgba(150,165,185,.6)" : "rgba(215,225,238,.75)";
  frustum(g, sqPts(cx, cy, 0.44), 0, sqPts(cx, cy, 0.44), 0.1, blk, shadeCol(blk, 0.1), trimA);
  frustum(g, sqPts(cx, cy, 0.33), 0.1, sqPts(cx, cy, 0.31), 0.22, blk, shadeCol(blk, 0.12), trimA);
  const faces = frustum(g, sqPts(cx, cy, 0.16), 0.22, sqPts(cx, cy, 0.1), 1.42, night ? "#191d24" : "#262c35", null, trimA);
  // เส้นฝังเรืองกลางหน้าเสา (สีเจ้าของ / ฟ้าคริสตัล)
  const pulse = 0.65 + 0.35 * Math.sin(now / 700);
  for (const f of faces) {
    const b = P((f.a[0] + f.b[0]) / 2, (f.a[1] + f.b[1]) / 2, 0.3), t = P((f.ta[0] + f.tb[0]) / 2, (f.ta[1] + f.tb[1]) / 2, 1.34), s = b[2];
    g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]);
    g.strokeStyle = hexA(acc, 0.28 * pulse); g.lineWidth = Math.max(3, s * 0.06); g.stroke();
    g.strokeStyle = hexA(acc, 0.95); g.lineWidth = Math.max(1, s * 0.016); g.stroke();
    const m = P((f.a[0] + f.b[0]) / 2 + f.nx * 0.005, (f.a[1] + f.b[1]) / 2 + f.ny * 0.005, 0.75);
    g.strokeStyle = trim; g.lineWidth = 1; g.beginPath(); g.moveTo(m[0] - s * 0.05, m[1]); g.lineTo(m[0] + s * 0.05, m[1]); g.stroke();
  }
  frustum(g, sqPts(cx, cy, 0.1), 1.42, sqPts(cx, cy, 0.004), 1.6, trim);
  const zc = 1.9 + Math.sin(now / 800 + cx) * 0.05;
  crystal(g, cx, cy, zc, 0.11, 0.25, 0.19, now / 1700, acc, night);
  if (!FAST) for (let i = 0; i < 3; i++) { // เศษคริสตัลโคจร
    const a = now / 900 + i * TAU / 3, q = P(cx + Math.cos(a) * 0.24, cy + Math.sin(a) * 0.24, zc + Math.sin(a * 2) * 0.05);
    shard(g, q[0], q[1], q[2] * 0.07, q[2] * 0.02, a, acc, "#ffffff", 0.9);
  }
  return zc + 0.36;
}
// ---------- Hammerhead: เสาเหล็กโครงถัก + ป้ายนีออน + ไฟหมุน ----------
function pillarHammerhead(g, cx, cy, acc, own, night, now) {
  const pad = night ? "#4a4946" : "#8f8b82", steel = night ? "#24272c" : "#3b3f46";
  frustum(g, sqPts(cx, cy, 0.43), 0, sqPts(cx, cy, 0.41), 0.09, pad, shadeCol(pad, 0.08));
  poly(g, sqPts(cx, cy, 0.37).map(([a, b]) => [a, b, 0.092]));
  g.lineWidth = 3; g.setLineDash([5, 5]); g.strokeStyle = night ? "#8a6c14" : "#e9b51c"; g.stroke();
  g.lineDashOffset = 5; g.strokeStyle = "#16161a"; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
  const H = 1.62, leg = (sx, sy, z) => { const w = 0.27 + (0.07 - 0.27) * ((z - 0.09) / (H - 0.09)); return P(cx + sx * w, cy + sy * w, z); };
  const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]], s0 = P(cx, cy)[2];
  // โครงถักซิกแซกทุกด้าน (ด้านหลังจางกว่า)
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = C4[i], [bx, by] = C4[(i + 1) % 4], nx = (ax + bx) / 2, ny = (ay + by) / 2, vis = faceVisible(nx, ny, cx + nx * 0.2, cy + ny * 0.2);
    g.strokeStyle = vis ? steel : shadeCol(steel, 0.2); g.globalAlpha = vis ? 1 : 0.55; g.lineWidth = Math.max(1, s0 * 0.014);
    g.beginPath();
    for (let z = 0.09, k = 0; z < H - 0.2; z += 0.25, k++) { const p = k % 2 ? leg(ax, ay, z) : leg(bx, by, z), q = k % 2 ? leg(bx, by, z + 0.25) : leg(ax, ay, z + 0.25); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); }
    g.stroke(); g.globalAlpha = 1;
  }
  for (const [sx, sy] of C4) {
    const b = leg(sx, sy, 0.09), m = leg(sx, sy, H - 0.32), t = leg(sx, sy, H);
    g.strokeStyle = steel; g.lineWidth = Math.max(1.5, s0 * 0.032); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
    g.strokeStyle = night ? "#8a2216" : "#d0321f"; g.beginPath(); g.moveTo(m[0], m[1]); g.lineTo(t[0], t[1]); g.stroke(); // แถบแดงเตือนอากาศยาน
  }
  // ป้ายนีออน: ติดด้านที่หันกล้องมากที่สุด
  let best = null;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = C4[i], [bx, by] = C4[(i + 1) % 4], nx = (ax + bx) / 2, ny = (ay + by) / 2;
    if (!faceVisible(nx, ny, cx + nx * 0.2, cy + ny * 0.2)) continue;
    const d = depthOf(cx + nx, cy + ny);
    if (!best || d > best.d) best = { d, nx, ny };
  }
  if (best) {
    const { nx, ny } = best, ux = -ny, uy = nx, o = 0.22, W = 0.3;
    const sp = (u, z) => P(cx + nx * o + ux * u, cy + ny * o + uy * u, z);
    const q = [sp(-W, 1.16), sp(W, 1.16), sp(W, 0.7), sp(-W, 0.7)];
    g.fillStyle = "#101216"; g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    g.strokeStyle = "#5a5e66"; g.lineWidth = 1.5; g.stroke();
    const flick = !own && hash(Math.floor(now / 110), 7) < 0.07 ? 0.25 : 1, s = q[0][2];
    const neon = (draw) => { g.beginPath(); draw(); g.strokeStyle = hexA(acc, 0.32 * flick); g.lineWidth = Math.max(3, s * 0.05); g.stroke(); g.strokeStyle = tintA(acc, 0.45, flick); g.lineWidth = Math.max(1, s * 0.014); g.stroke(); };
    neon(() => { for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU, p = sp(-0.15 + Math.cos(a) * 0.09, 0.93 + Math.sin(a) * 0.12); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } });
    neon(() => { const a = sp(0.0, 1.05), b = sp(0.16, 0.93), c = sp(0.0, 0.81); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); const d = sp(0.1, 1.05), e = sp(0.26, 0.93), f = sp(0.1, 0.81); g.moveTo(d[0], d[1]); g.lineTo(e[0], e[1]); g.lineTo(f[0], f[1]); });
    neon(() => { const a = sp(-0.25, 0.76), b = sp(0.25, 0.76); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); });
    const m = sp(0, 0.93);
    glowAt(g, m[0], m[1], s * 0.9, hexRgb(acc), (night ? 0.55 : 0.3) * flick);
  }
  // ไฟหมุนบนยอด + เสาอากาศ
  solidRound(g, cx, cy, 0.1, H, 0.1, H + 0.07, { body: "#34373d", dark: "#121417", hi: "#70757e" }, "#2a2c30");
  solidRound(g, cx, cy, 0.075, H + 0.07, 0.02, H + 0.19, { body: acc, dark: shadeCol(acc, -0.4), hi: shadeCol(acc, 0.6) });
  const lamp = P(cx, cy, H + 0.12);
  glowAt(g, lamp[0], lamp[1], lamp[2] * 0.6, hexRgb(acc), 0.9);
  const ang = now / 650;
  for (const k of [0, Math.PI]) {
    const a = ang + k, e0 = P(cx + Math.cos(a - 0.13) * 2.2, cy + Math.sin(a - 0.13) * 2.2, H + 0.05), e1 = P(cx + Math.cos(a + 0.13) * 2.2, cy + Math.sin(a + 0.13) * 2.2, H + 0.05);
    const gr = g.createLinearGradient(lamp[0], lamp[1], (e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2);
    gr.addColorStop(0, hexA(acc, night ? 0.42 : 0.16)); gr.addColorStop(1, hexA(acc, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(lamp[0], lamp[1]); g.lineTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.closePath(); g.fill();
  }
  const at = P(cx, cy, H + 0.19), tip = P(cx, cy, H + 0.5);
  g.strokeStyle = steel; g.lineWidth = Math.max(1, s0 * 0.012); g.beginPath(); g.moveTo(at[0], at[1]); g.lineTo(tip[0], tip[1]); g.stroke();
  if (Math.sin(now / 380) > 0) { g.fillStyle = "#ff3a28"; g.beginPath(); g.arc(tip[0], tip[1], Math.max(1.2, tip[2] * 0.025), 0, TAU); g.fill(); glowAt(g, tip[0], tip[1], tip[2] * 0.25, "255,60,40", 0.8); }
  return H + 0.62;
}
// ---------- Duscae: หินตั้งโบราณ มอส อักษรรูนเรือง หินลอย ----------
const DUSCAE_BASE = [0, 1, 2, 3, 4].map((i) => { const a = i / 5 * TAU + 0.3, r = 0.27 + (hash(i, 11) - 0.5) * 0.08; return [Math.cos(a) * r, Math.sin(a) * r]; });
const DUSCAE_TOP = DUSCAE_BASE.map(([x, y], i) => [x * (0.55 + hash(i, 12) * 0.15) + 0.03, y * (0.55 + hash(i, 13) * 0.15) - 0.02]);
function pillarDuscae(g, cx, cy, acc, night, now) {
  const st = night ? "#4b4a45" : "#86827a", moss = night ? "#2a3a22" : "#5d7a35";
  const rocks = { ...PAL[night ? "night" : "day"], rock: night ? "#45464a" : "#8c8d88", rock2: night ? "#34353a" : "#6a6b66" };
  for (const [dx, dy, k] of [[-0.36, 0.2, 0.32], [0.34, 0.3, 0.26], [0.3, -0.34, 0.22]]) { const [sx, sy, s] = P(cx + dx, cy + dy); if (depthOf(cx + dx, cy + dy) < depthOf(cx, cy)) rockShape(g, sx, sy, s * k, rocks, 0.4); }
  const H = 1.52, base = DUSCAE_BASE.map(([x, y]) => [cx + x, cy + y]), top = DUSCAE_TOP.map(([x, y]) => [cx + x, cy + y]);
  const faces = frustum(g, base, 0, top, H, st, shadeCol(st, 0.12), "rgba(0,0,0,.22)");
  const at = (f, u, z) => { const k = z / H, ax = f.a[0] + (f.ta[0] - f.a[0]) * k, ay = f.a[1] + (f.ta[1] - f.a[1]) * k, bx = f.b[0] + (f.tb[0] - f.b[0]) * k, by = f.b[1] + (f.tb[1] - f.b[1]) * k; return P(ax + (bx - ax) * u + f.nx * 0.004, ay + (by - ay) * u + f.ny * 0.004, z); };
  faces.forEach((f, fi) => {
    if (!FAST) { // มอสเกาะโคนหิน
      g.fillStyle = moss;
      for (let i = 0; i < 4; i++) { const p = at(f, 0.15 + hash(i, fi + 3) * 0.7, 0.04 + hash(i, fi + 9) * 0.3); g.globalAlpha = 0.75; g.beginPath(); g.ellipse(p[0], p[1], p[2] * (0.05 + hash(i, fi) * 0.05), p[2] * 0.03, 0, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    // อักษรรูนเรือง (คอลัมน์กลางหน้า)
    for (let i = 0; i < 4; i++) {
      const z = 0.32 + i * 0.27, c = at(f, 0.5, z), up = at(f, 0.5, z + 0.07), lf = at(f, 0.38, z), rt = at(f, 0.62, z), dn = at(f, 0.5, z - 0.07), s = c[2];
      const kind = Math.floor(hash(i + fi * 5, 21) * 4), pulse = 0.55 + 0.45 * Math.sin(now / 650 + i * 1.3 + fi);
      g.beginPath();
      if (kind === 0) { g.moveTo(dn[0], dn[1]); g.lineTo(up[0], up[1]); g.moveTo(c[0], c[1]); g.lineTo(lf[0], up[1]); g.moveTo(c[0], c[1]); g.lineTo(rt[0], up[1]); }
      else if (kind === 1) { g.moveTo(up[0], up[1]); g.lineTo(rt[0], rt[1]); g.lineTo(dn[0], dn[1]); g.lineTo(lf[0], lf[1]); g.closePath(); }
      else if (kind === 2) { g.moveTo(dn[0], dn[1]); g.lineTo(up[0], up[1]); g.moveTo(lf[0], c[1]); g.lineTo(up[0], up[1]); g.lineTo(rt[0], c[1]); }
      else { g.moveTo(lf[0], up[1]); g.lineTo(rt[0], dn[1]); g.moveTo(rt[0], up[1]); g.lineTo(lf[0], dn[1]); }
      g.strokeStyle = hexA(acc, 0.3 * pulse); g.lineWidth = Math.max(2.5, s * 0.045); g.stroke();
      g.strokeStyle = tintA(acc, 0.35, 0.5 + 0.5 * pulse); g.lineWidth = Math.max(1, s * 0.014); g.stroke();
    }
  });
  if (!FAST) { const tc = P(cx + 0.03, cy - 0.02, H); g.fillStyle = moss; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(tc[0] - tc[2] * 0.03, tc[1], tc[2] * 0.09, tc[2] * 0.035, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
  const m = P(cx, cy, 0.9);
  glowAt(g, m[0], m[1], m[2] * (night ? 1.2 : 0.8), hexRgb(acc), night ? 0.32 : 0.18);
  // หินลอยวนเหนือยอด
  for (let k = 0; k < 3; k++) {
    const a = now / 2600 + k * 2.1, z = H + 0.15 + k * 0.08 + Math.sin(now / 700 + k) * 0.05, q = P(cx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3, z), s = q[2] * (0.05 + k * 0.012);
    glowAt(g, q[0], q[1] + s, s * 3, hexRgb(acc), 0.4);
    g.fillStyle = shadeCol(st, 0.1); g.beginPath(); g.moveTo(q[0] - s, q[1]); g.lineTo(q[0] - s * 0.3, q[1] - s * 0.9); g.lineTo(q[0] + s, q[1] - s * 0.4); g.lineTo(q[0] + s * 0.4, q[1] + s * 0.7); g.closePath(); g.fill();
    g.fillStyle = hexA(acc, 0.8); g.fillRect(q[0] - 0.5, q[1] - s * 0.3, 1.2, s * 0.5);
  }
  return H + 0.42;
}
// ---------- Cleigne (ทะเลสาบ): ศาลน้ำ อ่างหิน ชามน้ำบนเสา ดอกบัว ----------
const LOTUS = [0.7, 2.5, 4.3, 5.6];
function lotus(g, cx, cy, a, acc, glowOn, now) {
  const r = 0.27, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, bob = Math.sin(now / 900 + a * 3) * 0.006, p = P(x, y, 0.155 + bob), s = p[2];
  g.fillStyle = "#3f7a3a"; g.beginPath(); g.ellipse(p[0] + s * 0.02, p[1] + s * 0.01, s * 0.075, s * 0.03, 0, 0, TAU); g.fill();
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI + Math.PI, px = p[0] + Math.cos(t) * s * 0.045, py = p[1] + Math.sin(t) * s * 0.02;
    g.fillStyle = i % 2 ? "#f6b9d4" : "#ee9cc2"; g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(px - s * 0.015, py - s * 0.05, px, py - s * 0.065); g.quadraticCurveTo(px + s * 0.02, py - s * 0.03, p[0], p[1]); g.fill();
  }
  if (glowOn) glowAt(g, p[0], p[1] - s * 0.03, s * 0.2, hexRgb(acc), 0.7);
  g.fillStyle = glowOn ? shadeCol(acc, 0.5) : "#ffd96a"; g.beginPath(); g.arc(p[0], p[1] - s * 0.03, Math.max(1, s * 0.016), 0, TAU); g.fill();
}
function pillarLake(g, cx, cy, acc, own, night, now) {
  const stone = { body: night ? "#5b6468" : "#a9b3b6", dark: night ? "#283034" : "#5d686c", hi: night ? "#8a969b" : "#eaf1f2" };
  const pale = { body: night ? "#7a807c" : "#dadfd7", dark: night ? "#3a403d" : "#8b938c", hi: night ? "#a9b0ab" : "#ffffff" };
  solidRound(g, cx, cy, 0.46, 0, 0.44, 0.17, stone, stone.hi, 22);
  gEllipse(g, cx, cy, 0.38, 0.152, 28);
  g.fillStyle = night ? "#123a56" : "#3c9bc2"; g.fill();
  if (!FAST) for (let i = 0; i < 2; i++) { const k = ((now / 2200) + i / 2) % 1; gEllipse(g, cx, cy, 0.12 + k * 0.24, 0.153, 26); g.strokeStyle = `rgba(220,245,255,${0.45 * (1 - k)})`; g.lineWidth = 1; g.stroke(); }
  const streams = [0.25, 1.82, 3.4, 4.97].map((a) => a + Math.PI / 4);
  for (const a of LOTUS) if (!frontOf(cx, cy, a, 0.27)) lotus(g, cx, cy, a, acc, !!own, now);
  for (const a of streams) if (!frontOf(cx, cy, a, 0.3)) waterArc(g, cx, cy, a, 0.21, 1.34, 0.36, 1.0, 0.33, 0.16, now, night);
  solidRound(g, cx, cy, 0.105, 0.15, 0.095, 1.22, pale);
  for (const z of [0.42, 0.86]) { gEllipse(g, cx, cy, 0.105, z, 18); g.strokeStyle = hexA(pale.dark, 0.7); g.lineWidth = 1.5; g.stroke(); }
  solidRound(g, cx, cy, 0.09, 1.2, 0.235, 1.36, pale);
  gEllipse(g, cx, cy, 0.205, 1.355, 22); g.fillStyle = night ? "#2d6f9a" : "#7fd0ee"; g.fill();
  const gl = P(cx - 0.05, cy - 0.04, 1.357); g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.ellipse(gl[0], gl[1], gl[2] * 0.06, gl[2] * 0.015, 0, 0, TAU); g.fill();
  for (const a of streams) if (frontOf(cx, cy, a, 0.3)) waterArc(g, cx, cy, a, 0.21, 1.34, 0.36, 1.0, 0.33, 0.16, now, night);
  for (const a of LOTUS) if (frontOf(cx, cy, a, 0.27)) lotus(g, cx, cy, a, acc, !!own, now);
  // ดวงไฟน้ำลอยเหนือชาม
  const zo = 1.55 + Math.sin(now / 750) * 0.04, o = P(cx, cy, zo);
  glowAt(g, o[0], o[1], o[2] * (night ? 1.1 : 0.75), hexRgb(acc), night ? 0.75 : 0.5);
  g.fillStyle = shadeCol(acc, 0.6); g.beginPath(); g.arc(o[0], o[1], Math.max(1.5, o[2] * 0.045), 0, TAU); g.fill();
  if (!FAST) for (let i = 0; i < 4; i++) { const a = now / 600 + i * TAU / 4, q = P(cx + Math.cos(a) * 0.12, cy + Math.sin(a) * 0.12, zo + Math.sin(a * 2) * 0.03); g.fillStyle = "rgba(230,250,255,.85)"; g.beginPath(); g.arc(q[0], q[1], Math.max(0.8, q[2] * 0.014), 0, TAU); g.fill(); }
  return zo + 0.28;
}
// ---------- Altissia: เสาหินอ่อน Accordo หัวเสาทอง กระถางไฟ + อ่างน้ำพุแปดเหลี่ยม ----------
function tintFlame(g, x, y, h, w, rgb, a) {
  if (!(a > 0 && h > 0)) return;
  const gr = g.createLinearGradient(x, y, x, y - h);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.55, `rgba(${rgb},${a * 0.8})`); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.9, y - h * 0.5, x, y - h); g.quadraticCurveTo(x + w * 0.9, y - h * 0.5, x + w, y); g.closePath(); g.fill();
}
function pillarAltissia(g, cx, cy, acc, night, now) {
  const marble = night ? "#8d8982" : "#efe9dd", gold = night ? "#9a782c" : "#d9b24a";
  const mCol = { body: marble, dark: shadeCol(marble, -0.35), hi: "#ffffff" }, gCol = { body: gold, dark: shadeCol(gold, -0.45), hi: shadeCol(gold, 0.55) };
  frustum(g, regPoly(cx, cy, 0.48, 8, Math.PI / 8), 0, regPoly(cx, cy, 0.46, 8, Math.PI / 8), 0.16, marble, shadeCol(marble, 0.04));
  poly(g, regPoly(cx, cy, 0.46, 8, Math.PI / 8).map(([a, b]) => [a, b, 0.161])); g.strokeStyle = gold; g.lineWidth = 2; g.stroke();
  poly(g, regPoly(cx, cy, 0.4, 8, Math.PI / 8).map(([a, b]) => [a, b, 0.14])); g.fillStyle = night ? "#123d55" : "#47a8cc"; g.fill();
  if (!FAST) for (let i = 0; i < 2; i++) { const k = ((now / 1800) + i / 2) % 1; gEllipse(g, cx, cy, 0.2 + k * 0.17, 0.141, 26); g.strokeStyle = `rgba(230,248,255,${0.4 * (1 - k)})`; g.lineWidth = 1; g.stroke(); }
  const jets = [0, 1, 2, 3].map((i) => i * Math.PI / 2 + Math.PI / 4);
  for (const a of jets) if (!frontOf(cx, cy, a, 0.3)) waterArc(g, cx, cy, a, 0.18, 0.3, 0.33, 0.62, 0.37, 0.14, now, night);
  frustum(g, sqPts(cx, cy, 0.17), 0.14, sqPts(cx, cy, 0.16), 0.34, marble, shadeCol(marble, 0.06));
  solidRound(g, cx, cy, 0.135, 0.34, 0.135, 0.39, gCol);
  solidRound(g, cx, cy, 0.12, 0.39, 0.11, 1.36, mCol);
  if (!FAST) { // ร่องเสา (เฉพาะครึ่งที่หันกล้อง)
    g.strokeStyle = night ? "rgba(40,36,30,.35)" : "rgba(140,128,108,.4)"; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; if (!frontOf(cx, cy, a, 0.12)) continue; const b = P(cx + Math.cos(a) * 0.118, cy + Math.sin(a) * 0.118, 0.43), t = P(cx + Math.cos(a) * 0.108, cy + Math.sin(a) * 0.108, 1.32); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); }
    g.stroke();
  }
  solidRound(g, cx, cy, 0.11, 1.36, 0.19, 1.46, gCol);
  frustum(g, sqPts(cx, cy, 0.21), 1.46, sqPts(cx, cy, 0.21), 1.52, gold, shadeCol(gold, 0.25));
  solidRound(g, cx, cy, 0.05, 1.52, 0.11, 1.62, gCol, shadeCol(gold, -0.5));
  // เปลวไฟในกระถาง (สีเจ้าของ / ทองอ่อน)
  const f = P(cx, cy, 1.61), fl = 0.85 + 0.15 * Math.sin(now / 90) + 0.08 * Math.sin(now / 37), rgb = hexRgb(acc);
  glowAt(g, f[0], f[1] - f[2] * 0.15, f[2] * (night ? 1.25 : 0.8), rgb, night ? 0.75 : 0.45);
  tintFlame(g, f[0], f[1], f[2] * 0.36 * fl, f[2] * 0.085, rgb, 0.9);
  tintFlame(g, f[0], f[1], f[2] * 0.2 * fl, f[2] * 0.045, "255,250,235", 0.85);
  for (const a of jets) if (frontOf(cx, cy, a, 0.3)) waterArc(g, cx, cy, a, 0.18, 0.3, 0.33, 0.62, 0.37, 0.14, now, night);
  return 2.0;
}
export function drawPillar(g, t, C, night, now) {
  const pl = LAST_FD && Array.isArray(LAST_FD.pillars) ? LAST_FD.pillars.find((o) => o.x === t.x && o.y === t.y) : null;
  const zone = (pl && pl.zone) || PILLAR_ZONE[K(t.x, t.y)] || "insomnia";
  const own = pl && pl.color ? hex6(pl.color, "#ffffff") : null, acc = own || PILLAR_NEUTRAL[zone] || "#9fd8ff";
  const cx = t.x + 0.5, cy = t.y + 0.5;
  gEllipse(g, cx + 0.04, cy + 0.04, 0.47, 0, 26); g.fillStyle = C.shadow; g.fill();
  pillarGround(g, pl, cx, cy, night, now);
  const top = zone === "hammerhead" ? pillarHammerhead(g, cx, cy, acc, own, night, now)
    : zone === "duscae" ? pillarDuscae(g, cx, cy, acc, night, now)
      : zone === "lake" ? pillarLake(g, cx, cy, acc, own, night, now)
        : zone === "altissia" ? pillarAltissia(g, cx, cy, acc, night, now)
          : pillarInsomnia(g, cx, cy, acc, night, now);
  pillarCrown(g, own, cx, cy, top, now, night);
}
export function hexRgb(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h || ""));
  if (!m) return "180,220,255";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// ============================================================
//  ภาพของสนาม Eos — ขั้น 4: แคมป์/กองไฟ · ตกปลา · สุสานราชวงศ์ · ขบวนรถไฟ · p4Ground/p4Items/p4Fx
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, depthOf, faceVisible, gEllipse, rng } from "../boardGeo";
import { fxT } from "./index";
import { TAU, hash, K, ease, fx, PAL, img, glowAt, poly, box, FAST, LAST_FD, shadeCol, sqPts, regPoly, MAP_W, TRAM_OFF, setTramOff } from "./eosBase";
import { frustum, hexRgb } from "./eosPillars";
import { lastFx } from "./eosTownArt";
import { drum } from "./eosObstacles";
import { sprite } from "./eosUnits";
import { RAIL_Y, STATIONS4, TUNNELS4, DOCKS4, CAMPS4, FISH4, tombAt, TRAM_STOPS, tramPath, drawTramStop, drawTram, SIGNALS, unitOf, occupied,
  activeOf, drawStation, drawSignal, drawTunnel, drawGondola, gondolaPath, alongPath } from "./eosRail";
import { puff, flameTongue } from "./eosFx";

// ---------- แคมป์ (เต็นท์ผ้าใบ · กองไฟ · หินรูนเรืองฟ้า) ----------
function drawTent(g, x, y, night) {
  // เต็นท์ทรงจั่ว สันหลังคาตามแกน y (หน้าจั่วสามเหลี่ยม + ประตูหันทิศใต้) · เชือกขึงมุม
  const cx = x + 0.27, cy = y + 0.28, L = 0.2, Wd = 0.21, H = 0.3, C = PAL[night ? "night" : "day"];
  const A = [cx - Wd, cy - L, 0], B = [cx + Wd, cy - L, 0], Cc = [cx + Wd, cy + L, 0], D = [cx - Wd, cy + L, 0], R0 = [cx, cy - L - 0.02, H], R1 = [cx, cy + L + 0.02, H];
  const faces = [
    { pts: [A, D, R1, R0], col: shadeCol(C.tent, 0.1) },
    { pts: [B, Cc, R1, R0], col: C.canvas2 },
    { pts: [A, B, R0], col: shadeCol(C.tent, -0.12) },
    { pts: [D, Cc, R1], col: shadeCol(C.tent, -0.02), door: [0, 1] },
  ].map((f) => ({ ...f, d: depthOf(f.pts.reduce((s, p) => s + p[0], 0) / f.pts.length, f.pts.reduce((s, p) => s + p[1], 0) / f.pts.length) }));
  gEllipse(g, cx + 0.05, cy + 0.05, 0.28, 0, 18, 0.25); g.fillStyle = "rgba(0,0,0,.28)"; g.fill();
  if (!FAST) { // เชือกขึง
    g.strokeStyle = night ? "rgba(150,140,120,.4)" : "rgba(80,70,50,.5)"; g.lineWidth = 1; g.beginPath();
    for (const [rx, ry] of [[R0[0], R0[1]], [R1[0], R1[1]]]) for (const sx of [-1, 1]) { const a = P(rx, ry, H * 0.96), b = P(rx + sx * 0.3, ry + (ry > cy ? 0.08 : -0.08), 0); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    g.stroke();
  }
  faces.sort((a, b) => a.d - b.d);
  for (const f of faces) {
    poly(g, f.pts); g.fillStyle = f.col; g.fill(); g.strokeStyle = "rgba(40,30,20,.35)"; g.lineWidth = 1; g.stroke();
    if (f.door && faceVisible(0, 1, cx, cy + L)) { // ประตูเต็นท์ (กลางคืนมีไฟตะเกียงข้างใน)
      const p0 = P(cx - 0.08, cy + L + 0.003, 0), p1 = P(cx + 0.08, cy + L + 0.003, 0), p2 = P(cx, cy + L + 0.012, H * 0.72);
      g.fillStyle = night ? "rgba(255,190,100,.8)" : "rgba(40,30,20,.65)"; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.fill();
      if (night) glowAt(g, p2[0], (p0[1] + p2[1]) / 2, p2[2] * 0.35, "255,190,100", 0.55);
    }
  }
  const r0 = P(...R0), r1 = P(...R1); g.strokeStyle = night ? "#3a2c1e" : "#6b4a2c"; g.lineWidth = Math.max(1.2, r0[2] * 0.012); g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke();
}
function drawCampfire(g, x, y, night, now, boost = 0) {
  const cx = x + 0.72, cy = y + 0.7, b = P(cx, cy), s = b[2];
  glowAt(g, b[0], b[1], s * (night ? 1.6 : 0.7) * (1 + boost * 0.4), "255,150,60", (night ? 0.5 : 0.22) + boost * 0.3);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, p = P(cx + Math.cos(a) * 0.1, cy + Math.sin(a) * 0.1); g.fillStyle = night ? "#3a3b3e" : "#7f7d77"; g.beginPath(); g.ellipse(p[0], p[1], s * 0.03, s * 0.02, 0, 0, TAU); g.fill(); }
  g.strokeStyle = night ? "#2a1a10" : "#5a3a22"; g.lineWidth = Math.max(1.5, s * 0.025);
  for (const a of [0.5, 2.1]) { const p0 = P(cx + Math.cos(a) * 0.08, cy + Math.sin(a) * 0.08, 0.02), p1 = P(cx - Math.cos(a) * 0.08, cy - Math.sin(a) * 0.08, 0.02); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
  const k = 1 + boost * 0.6;
  for (let i = 0; i < 3; i++) {
    const fl = 0.75 + 0.25 * Math.sin(now / (70 + i * 23) + i * 2);
    flameTongue(g, b[0] + (i - 1) * s * 0.035, b[1] - s * 0.01, s * (0.16 + (i === 1 ? 0.08 : 0)) * fl * k, s * 0.045, 0.95);
  }
  glowAt(g, b[0], b[1] - s * 0.08, s * 0.35, "255,210,120", 0.6);
  if (!FAST) for (let i = 0; i < 4; i++) { // ประกายไฟลอย
    const t = ((now / 1300) + i / 4) % 1, p = P(cx + Math.sin(now / 400 + i * 2) * 0.04, cy, 0.1 + t * 0.6);
    g.fillStyle = `rgba(255,${180 + i * 15},90,${1 - t})`; g.fillRect(p[0], p[1], 1.6, 1.6);
  }
}
function drawRuneStone(g, x, y, night, now) {
  const cx = x + 0.78, cy = y + 0.22, st = night ? "#4c5058" : "#8a8e94";
  const base = regPoly(cx, cy, 0.075, 5, 0.4), top = regPoly(cx + 0.01, cy, 0.045, 5, 0.6);
  const faces = frustum(g, base, 0, top, 0.42, st, shadeCol(st, 0.15), "rgba(0,0,0,.25)");
  const pulse = 0.6 + 0.4 * Math.sin(now / 800 + x);
  for (const f of faces) {
    const a = P((f.a[0] + f.b[0]) / 2 + f.nx * 0.004, (f.a[1] + f.b[1]) / 2 + f.ny * 0.004, 0.1), c = P((f.ta[0] + f.tb[0]) / 2 + f.nx * 0.004, (f.ta[1] + f.tb[1]) / 2 + f.ny * 0.004, 0.36);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.strokeStyle = `rgba(120,200,255,${0.5 + 0.5 * pulse})`; g.lineWidth = Math.max(1, a[2] * 0.012); g.stroke();
  }
  const m = P(cx, cy, 0.3);
  glowAt(g, m[0], m[1], m[2] * (night ? 0.8 : 0.45), "110,190,255", (night ? 0.6 : 0.3) * pulse);
}
// ---------- จุดตกปลา (คันเบ็ดปักขาตั้ง + ถังปลา + สายไปทุ่น) ----------
function drawFishSpot(g, t, night, now, busy) {
  const [dx, dy] = t.d, n = [-dy, dx], cx = t.x + 0.5, cy = t.y + 0.5;
  drum(g, cx - dx * 0.08 + n[0] * 0.24, cy - dy * 0.08 + n[1] * 0.24, 0.06, 0.1, night ? { body: "#3f4a52", dark: "#1a2026", hi: "#7f8c96" } : { body: "#6f8796", dark: "#33424c", hi: "#c9d8e2" });
  if (busy) return;
  const st0 = P(cx + dx * 0.2 - n[0] * 0.18, cy + dy * 0.2 - n[1] * 0.18, 0), st1 = P(cx + dx * 0.2 - n[0] * 0.18, cy + dy * 0.2 - n[1] * 0.18, 0.22);
  g.strokeStyle = night ? "#2b1e14" : "#5a3d24"; g.lineWidth = Math.max(1.2, st0[2] * 0.018); g.beginPath(); g.moveTo(st0[0], st0[1]); g.lineTo(st1[0], st1[1]); g.stroke();
  const butt = P(cx - dx * 0.05 - n[0] * 0.18, cy - dy * 0.05 - n[1] * 0.18, 0.03), tip = P(cx + dx * 0.75 - n[0] * 0.18, cy + dy * 0.75 - n[1] * 0.18, 0.62);
  g.strokeStyle = night ? "#3a2f22" : "#2e2a26"; g.lineWidth = Math.max(1, st0[2] * 0.014); g.beginPath(); g.moveTo(butt[0], butt[1]); g.quadraticCurveTo(st1[0], st1[1] - st0[2] * 0.1, tip[0], tip[1]); g.stroke();
  const bb = P(t.bob.x, t.bob.y, 0.03 + Math.sin(now / 520 + t.x) * 0.012);
  g.strokeStyle = "rgba(235,240,245,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(tip[0], tip[1]); g.quadraticCurveTo((tip[0] + bb[0]) / 2, Math.max(tip[1], bb[1]) + bb[2] * 0.05, bb[0], bb[1]); g.stroke();
}
function drawBobber(g, bx, by, now, dip = 0) {
  const p = P(bx, by, 0.03 + Math.sin(now / 520 + bx) * 0.012 - dip * 0.05), s = p[2], r = Math.max(1.6, s * 0.03);
  g.fillStyle = "#f4f4f2"; g.beginPath(); g.arc(p[0], p[1], r, 0, Math.PI); g.fill();
  g.fillStyle = "#e0321f"; g.beginPath(); g.arc(p[0], p[1], r, Math.PI, TAU); g.fill();
}
// ---------- สุสานราชวงศ์ (สิ่งกีดขวาง · ปิด = ตราหลวงเรือง + อาวุธหลวงลอยหมุน · เปิดแล้ว = ประตูมืด ตราดับ) ----------
export function drawTomb(g, x, y, C, night, now) {
  const t = tombAt(x, y), info = LAST_FD && Array.isArray(LAST_FD.tombs) ? LAST_FD.tombs.find((o) => o.x === x && o.y === y) : null;
  const open = !!(info && info.open), [fx0, fy0] = t.f, ux = -fy0, uy = fx0, cx = x + 0.5, cy = y + 0.5;
  const ope = LAST_FD ? lastFx("tomb_open") : null, ok = ope && ope.x === x && ope.y === y ? fxT(ope, now, fx.tomb_open) : 1;
  const slide = open ? ease(Math.min(1, ok / 0.35)) : 0;
  const st = night ? "#4a4a4f" : "#8f8b82", st2 = night ? "#38383d" : "#6f6b63", moss = night ? "#26341f" : "#5a7334";
  gEllipse(g, cx + 0.05, cy + 0.05, 0.5, 0, 24); g.fillStyle = C.shadow; g.fill();
  frustum(g, sqPts(cx, cy, 0.45), 0, sqPts(cx, cy, 0.45), 0.08, st2, shadeCol(st2, 0.1));
  const faces = frustum(g, sqPts(cx, cy, 0.36), 0.08, sqPts(cx, cy, 0.35), 0.7, st, null, "rgba(0,0,0,.2)");
  if (!FAST) for (const f of faces) { // มอสโคนผนัง + รอยร้าว
    const R = rng(x * 13 + y * 7 + f.nx * 3 + f.ny * 5);
    g.fillStyle = moss; g.globalAlpha = 0.7;
    for (let i = 0; i < 3; i++) { const u = R(), p = P(f.a[0] + (f.b[0] - f.a[0]) * u + f.nx * 0.004, f.a[1] + (f.b[1] - f.a[1]) * u + f.ny * 0.004, 0.1 + R() * 0.12); g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.06, p[2] * 0.025, 0, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  }
  // ประตูหิน (ด้านหันเข้ากลางแผนที่)
  const dp = (u, z, out = 0.362) => P(cx + fx0 * out + ux * u, cy + fy0 * out + uy * u, z);
  const doorVis = faceVisible(fx0, fy0, cx + fx0 * 0.36, cy + fy0 * 0.36);
  const doorPath = (off = 0) => { g.beginPath(); const a = dp(-0.16 + off, 0.08); g.moveTo(a[0], a[1]); for (let i = 0; i <= 10; i++) { const an = Math.PI - i / 10 * Math.PI, q = dp(Math.cos(an) * 0.16 + off, 0.42 + Math.sin(an) * 0.14); g.lineTo(q[0], q[1]); } const b = dp(0.16 + off, 0.08); g.lineTo(b[0], b[1]); g.closePath(); };
  const sigil = (u0, z0, a, col) => { // ตราหลวง: วงกลม + แฉก 8 + ดาวกลาง
    const c = dp(u0, z0, 0.366), s = c[2];
    if (a > 0.05) glowAt(g, c[0], c[1], s * 0.45, col, a * 0.8);
    g.strokeStyle = `rgba(${col},${Math.max(0.25, a)})`; g.lineWidth = Math.max(1, s * 0.012); g.beginPath();
    for (let i = 0; i <= 16; i++) { const an = i / 16 * TAU, q = dp(u0 + Math.cos(an) * 0.08, z0 + Math.sin(an) * 0.08, 0.366); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, q0 = dp(u0 + Math.cos(an) * 0.04, z0 + Math.sin(an) * 0.04, 0.366), q1 = dp(u0 + Math.cos(an) * 0.11, z0 + Math.sin(an) * 0.11, 0.366); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); }
    g.stroke();
  };
  if (doorVis) {
    doorPath(); g.fillStyle = "#050506"; g.fill();
    if (open) { const c = dp(0, 0.25); glowAt(g, c[0], c[1], c[2] * 0.4, "120,140,200", 0.15 * (1 - slide) + 0.08); }
    // แผ่นประตู: ปิด = ทับช่อง · เปิด = เลื่อนไปข้าง
    g.save(); doorPath(slide * 0.33); g.fillStyle = shadeCol(st, 0.08); g.fill(); g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = 1; g.stroke(); g.restore();
    const pulse = 0.65 + 0.35 * Math.sin(now / 620 + x);
    sigil(slide * 0.33, 0.3, open ? 0.06 : pulse, open ? "150,150,160" : "150,210,255");
  }
  // บัวหลังคา + หลังคาปิรามิด + ยอด
  frustum(g, sqPts(cx, cy, 0.41), 0.7, sqPts(cx, cy, 0.41), 0.78, st2, null);
  frustum(g, sqPts(cx, cy, 0.41), 0.78, sqPts(cx, cy, 0.02), 1.08, st);
  const fin = P(cx, cy, 1.08), fin2 = P(cx, cy, 1.18);
  g.strokeStyle = night ? "#6e6a5c" : "#b9a76a"; g.lineWidth = Math.max(1.5, fin[2] * 0.025); g.beginPath(); g.moveTo(fin[0], fin[1]); g.lineTo(fin2[0], fin2[1]); g.stroke();
  if (open && ok >= 1) return;
  // อาวุธจักรพรรดิลอยเหนือสุสาน (ยังไม่เปิด — ภาพอาวุธจริงของสุสานนี้ · 2026-11-12)
  const al = open ? 1 - Math.min(1, ok / 0.45) : 1;
  if (al <= 0) return;
  if (info && info.img && img(info.img)) {
    const zc = 1.35 + Math.sin(now / 900 + x) * 0.07, c = P(cx, cy, zc + 0.35);
    glowAt(g, c[0], c[1], c[2] * 0.8, "120,190,255", (night ? 0.75 : 0.5) * al);
    sprite(g, info.img, cx, cy, zc, 0.85, false, al);
    if (!FAST) for (let i = 0; i < 4; i++) { const a = now / 700 + i * TAU / 4, q = P(cx + Math.cos(a) * 0.24, cy + Math.sin(a) * 0.24, zc + 0.3 + Math.sin(a * 2) * 0.1); g.fillStyle = `rgba(190,230,255,${0.85 * al})`; g.beginPath(); g.arc(q[0], q[1], Math.max(1, q[2] * 0.016), 0, TAU); g.fill(); }
    return;
  }
  const zc = 1.55 + Math.sin(now / 900 + x) * 0.06, rot = now / 1400, ca = Math.cos(rot), sa = Math.sin(rot);
  const tipP = P(cx, cy, zc - 0.32), hilt = P(cx, cy, zc + 0.12), pom = P(cx, cy, zc + 0.24), g0 = P(cx - ca * 0.11, cy - sa * 0.11, zc + 0.12), g1 = P(cx + ca * 0.11, cy + sa * 0.11, zc + 0.12);
  g.save(); g.globalAlpha *= al;
  glowAt(g, hilt[0], (hilt[1] + tipP[1]) / 2, hilt[2] * 0.9, "120,190,255", night ? 0.75 : 0.5);
  g.lineCap = "round";
  g.strokeStyle = "rgba(150,210,255,.45)"; g.lineWidth = Math.max(4, hilt[2] * 0.07); g.beginPath(); g.moveTo(tipP[0], tipP[1]); g.lineTo(hilt[0], hilt[1]); g.stroke();
  g.strokeStyle = "rgba(235,248,255,.95)"; g.lineWidth = Math.max(1.5, hilt[2] * 0.022); g.beginPath(); g.moveTo(tipP[0], tipP[1]); g.lineTo(hilt[0], hilt[1]); g.lineTo(pom[0], pom[1]); g.stroke();
  g.strokeStyle = "rgba(200,230,255,.95)"; g.beginPath(); g.moveTo(g0[0], g0[1]); g.lineTo(g1[0], g1[1]); g.stroke();
  g.lineCap = "butt";
  if (!FAST) for (let i = 0; i < 4; i++) { const a = now / 700 + i * TAU / 4, q = P(cx + Math.cos(a) * 0.22, cy + Math.sin(a) * 0.22, zc + Math.sin(a * 2) * 0.1); g.fillStyle = "rgba(190,230,255,.85)"; g.beginPath(); g.arc(q[0], q[1], Math.max(1, q[2] * 0.016), 0, TAU); g.fill(); }
  g.restore();
}
// ---------- รถไฟขนเสบียง (PVE รอบหก): จอดข้างชานชาลา หัวรถหันเข้ากลางแผนที่ ----------
export function supplyCars(sp) {
  const dir = sp.x < MAP_W / 2 ? 1 : -1;
  let o = 0;
  const head = sp.x + 0.5 + dir * (TRAIN_LEN - 0.5);
  return TRAIN_CARS.map((L, i) => { const front = head - dir * o, back = front - dir * L; o += L + TRAIN_GAP; return { i, a: Math.min(front, back), b: Math.max(front, back), front, dir }; });
}
// ---------- ขบวนรถไฟ (หัวรถจักร + ตู้โดยสาร 3 ตู้ · สีน้ำเงินเข้มขอบทอง) ----------
const TRAIN_CARS = [2.3, 2.0, 2.0, 2.0], TRAIN_GAP = 0.14;
const TRAIN_LEN = TRAIN_CARS.reduce((a, b) => a + b, 0) + TRAIN_GAP * (TRAIN_CARS.length - 1);
const TRAIN_RUN = MAP_W + 8 + TRAIN_LEN;
const trainHead = (dir, p) => (dir > 0 ? -4 + p * TRAIN_RUN : MAP_W + 4 - p * TRAIN_RUN);
export const trainAtX = (dir, x) => (dir > 0 ? (x + 4) / TRAIN_RUN : (MAP_W + 4 - x) / TRAIN_RUN); // p ที่หัวรถถึง x
function trainCars(dir, p) {
  const head = trainHead(dir, p);
  let o = 0;
  return TRAIN_CARS.map((L, i) => { const front = head - dir * o, back = front - dir * L; o += L + TRAIN_GAP; return { i, a: Math.min(front, back), b: Math.max(front, back), front }; });
}
export function drawTrainCar(g, car, dir, night, now, pass) {
  const y0 = RAIL_Y + 0.5 - 0.33, y1 = RAIL_Y + 0.5 + 0.33, cy = RAIL_Y + 0.5, loco = car.i === 0;
  const body = night ? "#141b27" : "#1d2635", side = night ? "#10151f" : "#1a2230", end = night ? "#0c1018" : "#131a26", roof = night ? "#2a3240" : "#434e60";
  const gold = night ? "#8a6f30" : "#caa24a";
  // แคร่ล้อ
  for (const bx of [car.a + 0.38, car.b - 0.38]) box(g, bx - 0.2, y0 + 0.06, bx + 0.2, y1 - 0.06, 0.15, "#0b0d10", "#08090b", "#101216", 0.03);
  let xa = car.a + 0.02, xb = car.b - 0.02;
  if (loco) { if (dir > 0) xb = car.front - 0.5; else xa = car.front + 0.5; }
  const faces = box(g, xa, y0, xb, y1, 0.74, roof, end, side, 0.14);
  box(g, xa + 0.06, y0 + 0.05, xb - 0.06, y1 - 0.05, 0.81, shadeCol(roof, 0.12), end, shadeCol(roof, -0.2), 0.74);
  // แถบทอง + หน้าต่างบนข้างลำที่มองเห็น
  for (const f of faces) {
    if (!f.ny) continue;
    const yy = f.ny > 0 ? y1 + 0.003 : y0 - 0.003;
    poly(g, [[xa + 0.04, yy, 0.42], [xb - 0.04, yy, 0.42], [xb - 0.04, yy, 0.46], [xa + 0.04, yy, 0.46]]); g.fillStyle = gold; g.fill();
    let wi = 0;
    for (let u = xa + 0.16; u < xb - 0.2; u += 0.3, wi++) {
      const lit = night ? hash(car.i * 31 + wi, 5) < 0.8 : false;
      poly(g, [[u, yy, 0.52], [u + 0.2, yy, 0.52], [u + 0.2, yy, 0.67], [u, yy, 0.67]]);
      g.fillStyle = lit ? "#ffd27a" : night ? "#1d2532" : "#7b97b4"; g.fill();
      const pc = !loco && pass && pass.length ? pass[(wi + car.i) % pass.length] : null;
      if (pc && wi % 2 === 0) { const h = P(u + 0.1, yy, 0.6); g.fillStyle = pc; g.beginPath(); g.arc(h[0], h[1], Math.max(1.5, h[2] * 0.035), 0, TAU); g.fill(); }
      if (lit && !FAST) { const c = P(u + 0.1, yy, 0.6); glowAt(g, c[0], c[1], c[2] * 0.22, "255,210,130", 0.35); }
    }
  }
  if (!loco) return;
  // หัวรถจักร: จมูกลาด + กระจกหน้า + ไฟหน้า + ห้องคนขับยกสูง
  const f0 = car.front, back = f0 - dir * 0.5, base = dir > 0 ? [[back, y0], [f0, y0], [f0, y1], [back, y1]] : [[f0, y0], [back, y0], [back, y1], [f0, y1]];
  const tf = f0 - dir * 0.28, top = dir > 0 ? [[back, y0 + 0.04], [tf, y0 + 0.04], [tf, y1 - 0.04], [back, y1 - 0.04]] : [[tf, y0 + 0.04], [back, y0 + 0.04], [back, y1 - 0.04], [tf, y1 - 0.04]];
  frustum(g, base, 0.14, top, 0.74, body, roof);
  if (faceVisible(dir, 0, f0, cy)) {
    const xz = (z) => f0 - dir * 0.28 * ((z - 0.14) / 0.6);
    poly(g, [[xz(0.5), y0 + 0.08, 0.5], [xz(0.5), y1 - 0.08, 0.5], [xz(0.68), y1 - 0.1, 0.68], [xz(0.68), y0 + 0.1, 0.68]]);
    g.fillStyle = night ? "#2a3a52" : "#8fb2d4"; g.fill();
    poly(g, [[xz(0.24), y0 + 0.04, 0.24], [xz(0.24), y1 - 0.04, 0.24], [xz(0.3), y1 - 0.04, 0.3], [xz(0.3), y0 + 0.04, 0.3]]); g.fillStyle = gold; g.fill();
  }
  const cab0 = dir > 0 ? xb - 0.55 : xa + 0.05, cab1 = dir > 0 ? xb - 0.05 : xa + 0.55;
  box(g, cab0, y0 + 0.06, cab1, y1 - 0.06, 0.9, roof, end, side, 0.81);
  for (const yy of [cy - 0.2, cy + 0.2]) {
    const h = P(f0 + dir * 0.005, yy, 0.32);
    g.fillStyle = "#fff8e0"; g.beginPath(); g.arc(h[0], h[1], Math.max(1.6, h[2] * 0.04), 0, TAU); g.fill();
    glowAt(g, h[0], h[1], h[2] * (night ? 0.9 : 0.5), "255,245,215", night ? 0.95 : 0.6);
  }
}
// ลำแสงไฟหน้าบนพื้น (ใต้ขบวน)
function trainBeam(g, dir, head, night) {
  const cy = RAIL_Y + 0.5, a = P(head, cy - 0.22, 0.01), b = P(head, cy + 0.22, 0.01), c = P(head + dir * 3.4, cy + 0.85, 0), d = P(head + dir * 3.4, cy - 0.85, 0);
  const gr = g.createLinearGradient((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (c[0] + d[0]) / 2, (c[1] + d[1]) / 2);
  gr.addColorStop(0, `rgba(255,245,210,${night ? 0.45 : 0.16})`); gr.addColorStop(1, "rgba(255,245,210,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
}
// ร่างจางของหมาก (สีผู้เล่น) — ตอนขึ้นรถไฟ / ลอดอุโมงค์
function ghostPiece(g, x, y, col, alpha, scale = 1, z = 0) {
  if (!(alpha > 0.01)) return;
  const b = P(x, y, z), s = b[2] * scale;
  g.save(); g.globalAlpha *= alpha;
  g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(b[0], b[1], s * 0.28, s * 0.1, 0, 0, TAU); g.fill();
  g.fillStyle = shadeCol(col, -0.3); g.beginPath(); g.ellipse(b[0], b[1] - s * 0.22, s * 0.13, s * 0.22, 0, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(b[0], b[1] - s * 0.5, s * 0.11, 0, TAU); g.fill();
  glowAt(g, b[0], b[1] - s * 0.35, s * 0.55, hexRgb(col), 0.35);
  g.restore();
}

// ---------- พื้น (ใต้ไฮไลต์): ไฟเตือนบนราง · วงรูนแคมป์ · ทุ่นตกปลา ----------
export function p4Ground(g, fd, now, night) {
  const rail = fd.rail || null, we = activeOf(fd, now, "train_warn")[0] || null;
  if ((rail && rail.warn) || we) {
    const dir = (we && we.dir) || (rail && rail.dir) || 1, y = RAIL_Y, pulse = 0.5 + 0.5 * Math.sin(now / 150);
    g.beginPath();
    for (let x = 0; x < MAP_W; x++) { const a = P(x, y + 0.08), b = P(x + 1, y + 0.08), c = P(x + 1, y + 0.92), d = P(x, y + 0.92); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
    g.fillStyle = `rgba(255,40,30,${0.08 + 0.12 * pulse})`; g.fill();
    const off = ((now / 380) % 1) * dir;
    g.beginPath();
    for (let x = -1; x <= MAP_W; x++) {
      const u = x + 0.5 + off, a = P(u - dir * 0.14, y + 0.3, 0.1), b = P(u + dir * 0.1, y + 0.5, 0.1), c = P(u - dir * 0.14, y + 0.7, 0.1);
      g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]);
    }
    g.strokeStyle = `rgba(255,${90 + 80 * pulse | 0},70,${0.55 + 0.35 * pulse})`; g.lineWidth = 2.2; g.lineJoin = "round"; g.stroke();
  }
  for (const t of CAMPS4) {
    const cx = t.x + 0.5, cy = t.y + 0.5, pulse = 0.5 + 0.5 * Math.sin(now / 900 + t.x), a = (night ? 0.55 : 0.3) + 0.2 * pulse;
    gEllipse(g, cx, cy, 0.38, 0.006, 32); g.strokeStyle = `rgba(120,200,255,${a})`; g.lineWidth = 2; g.stroke();
    const rot = now / 6000;
    g.beginPath();
    for (let i = 0; i < 12; i++) { const an = rot + i / 12 * TAU, p0 = P(cx + Math.cos(an) * 0.3, cy + Math.sin(an) * 0.3, 0.006), p1 = P(cx + Math.cos(an + 0.12) * 0.34, cy + Math.sin(an + 0.12) * 0.34, 0.006); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); }
    g.strokeStyle = `rgba(160,220,255,${a})`; g.lineWidth = 1.4; g.stroke();
    const c = P(cx, cy);
    glowAt(g, c[0], c[1], c[2] * 0.7, "100,180,255", (night ? 0.3 : 0.12) * (0.7 + 0.3 * pulse));
  }
  const busy = new Set(activeOf(fd, now, "fish").map((e) => K(e.x, e.y)));
  for (const t of FISH4) {
    if (busy.has(K(t.x, t.y))) continue;
    const k = ((now / 2600) + t.x * 0.37) % 1;
    gEllipse(g, t.bob.x, t.bob.y, 0.05 + k * 0.25, 0.01, 18); g.strokeStyle = `rgba(230,245,255,${0.45 * (1 - k)})`; g.lineWidth = 1; g.stroke();
    drawBobber(g, t.bob.x, t.bob.y, now);
  }
}
// ---------- items (เรียงความลึกกับตัวละคร) ----------
export function p4Items(list, g, fd, units, now, lowQ, night) {
  const occ = occupied(units), rail = fd.rail || null;
  const warn = !!(rail && rail.warn) || activeOf(fd, now, "train_warn").length > 0;
  const fadeIf = (tile, d) => occ.has(tile) && d > depthOf(Number(tile.split(",")[0]) + 0.5, Number(tile.split(",")[1]) + 0.5);
  const push = (d, fn, tile = null) => {
    const fade = tile && fadeIf(tile, d);
    list.push({ d, f: fade ? () => { g.save(); g.globalAlpha = 0.42; fn(); g.restore(); } : fn });
  };
  for (const t of STATIONS4) push(depthOf(t.x + 0.5, t.y + 0.5 - t.rd * 0.3), () => drawStation(g, t, night, now, warn), K(t.x, t.y));
  for (const s of SIGNALS) push(depthOf(s.x, s.y), () => drawSignal(g, s.x, s.y, night, now, warn));
  setTramOff(!!fd && Array.isArray(fd.trams) && !fd.trams.length);
  if (!TRAM_OFF) for (const t of TRAM_STOPS) push(depthOf(t.x + 0.78, t.y + 0.22), () => drawTramStop(g, t, night, now), K(t.x, t.y));
  for (const e of activeOf(fd, now, "tram")) { // รถรางที่กำลังวิ่ง (ผู้โดยสาร = สีผู้เล่น)
    const pp = tramPath(e.a, e.b);
    if (!pp || pp.pts.length < 2) continue;
    const k = ease(Math.min(1, fxT(e, now, fx.tram) * 1.05)), at = alongPath(pp, k), u = unitOf(units, e.id);
    push(depthOf(at.x, at.y), () => drawTram(g, at.x, at.y, at.ang, night, now, u ? u.color : null));
  }
  for (const t of TUNNELS4) {
    const [fx, fy] = t.f, front = faceVisible(fx, fy, t.x + 0.5 - fx * 0.14, t.y + 0.5 - fy * 0.14);
    push(front ? depthOf(t.x + 0.5, t.y + 0.5) - 0.02 : depthOf(t.x + 0.5 - fx * 0.6, t.y + 0.5 - fy * 0.6), () => drawTunnel(g, t, night), front ? null : K(t.x, t.y));
  }
  // กอนโดลาจอด (ซ่อนลำที่กำลังแล่นอยู่ในฉาก)
  const sailing = activeOf(fd, now, "gondola");
  const away = new Set();
  for (const e of sailing) { const pp = e.from && e.to ? gondolaPath(e.from, e.to) : null; if (pp) { away.add(K(pp.A.x, pp.A.y)); if (fxT(e, now, fx.gondola) < 0.97) away.add(K(pp.B.x, pp.B.y)); } }
  for (const t of DOCKS4) if (!away.has(K(t.x, t.y))) push(depthOf(t.bx, t.by), () => drawGondola(g, t.bx, t.by, t.ang, night, now));
  for (const e of sailing) {
    const pp = e.from && e.to ? gondolaPath(e.from, e.to) : null;
    if (!pp) continue;
    const k = ease(fxT(e, now, fx.gondola)), at = alongPath(pp, k), u = unitOf(units, e.id);
    push(depthOf(at.x, at.y), () => drawGondola(g, at.x, at.y, at.ang, night, now, u ? u.color : "#d8dde6"));
  }
  const meals = activeOf(fd, now, "camp_meal");
  for (const t of CAMPS4) {
    const boost = meals.some((e) => e.x === t.x && e.y === t.y) ? 1 : 0;
    push(depthOf(t.x + 0.27, t.y + 0.28), () => drawTent(g, t.x, t.y, night), K(t.x, t.y));
    push(depthOf(t.x + 0.72, t.y + 0.7), () => drawCampfire(g, t.x, t.y, night, now, boost));
    push(depthOf(t.x + 0.78, t.y + 0.22), () => drawRuneStone(g, t.x, t.y, night, now));
  }
  const fishing = new Set(activeOf(fd, now, "fish").map((e) => K(e.x, e.y)));
  for (const t of FISH4) push(depthOf(t.x + 0.5 + t.d[0] * 0.3, t.y + 0.5 + t.d[1] * 0.3), () => drawFishSpot(g, t, night, now, fishing.has(K(t.x, t.y))));
  // ขบวนรถไฟ
  for (const e of activeOf(fd, now, "train_pass")) {
    const dir = e.dir || 1, p = fxT(e, now, fx.train_pass), cars = trainCars(dir, p);
    const pass = (e.carried || []).map((c) => (unitOf(units, c.id) || { color: "#d8dde6" }).color);
    const head = trainHead(dir, p);
    list.push({ d: -1e6, f: () => trainBeam(g, dir, head, night) });
    for (const car of cars) push(depthOf((car.a + car.b) / 2, RAIL_Y + 0.5), () => drawTrainCar(g, car, dir, night, now, pass));
  }
  void lowQ;
}
// ---------- ฉากเหตุการณ์ (air — ทับตัวละคร) ----------
const CAMP_ICON = { atk: "🍲", mend: "🐟", mov: "🍙", grill: "🍢", feast: "🥘" };
const CAMP_RGB = { atk: "255,120,60", mend: "110,255,150", mov: "110,210,255", grill: "255,190,90", feast: "255,215,110" };
const BOUNTY_ICON = { daemon: "👹", beast: "🦣", magitek: "🤖", player: "🎯" };
export function emoji(g, ch, x, y, size, a = 1) {
  g.save(); g.globalAlpha *= a; g.font = `${Math.max(8, size) | 0}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, x, y); g.restore();
}
function splash(g, x, y, p, seed, n, size, lowQ) {
  const c = P(x, y, 0.02), s = c[2];
  for (let i = 0; i < 2; i++) { const k = Math.min(1, p * 1.3 - i * 0.2); if (k <= 0) continue; gEllipse(g, x, y, 0.08 + k * size, 0.02, 22); g.strokeStyle = `rgba(230,245,255,${0.7 * (1 - k)})`; g.lineWidth = 1.5; g.stroke(); }
  if (lowQ) return;
  for (let i = 0; i < n; i++) {
    const a = hash(i, seed) * TAU, r = s * size * (0.4 + hash(i + 3, seed) * 0.8) * p, h = Math.sin(Math.min(1, p) * Math.PI) * s * size * (0.6 + hash(i + 5, seed));
    g.fillStyle = `rgba(225,242,255,${0.9 * (1 - p)})`; g.beginPath(); g.arc(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.5 - h, Math.max(1, s * 0.016), 0, TAU); g.fill();
  }
}
function fishShape(g, x, y, s, ang, col, hi) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, s * 0.11, s * 0.04, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-s * 0.09, 0); g.lineTo(-s * 0.17, -s * 0.05); g.lineTo(-s * 0.17, s * 0.05); g.closePath(); g.fill();
  g.fillStyle = hi; g.beginPath(); g.ellipse(s * 0.02, -s * 0.015, s * 0.06, s * 0.012, 0, 0, TAU); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(s * 0.07, -s * 0.008, Math.max(0.8, s * 0.008), 0, TAU); g.fill();
  g.restore();
}
export function p4Fx(g, e, p, now, lowQ, units, out, night) {
  switch (e.kind) {
    case "train_warn": {
      const dir = e.dir || 1, y = RAIL_Y + 0.5, u = dir > 0 ? -1 + p * (MAP_W + 2) : MAP_W + 1 - p * (MAP_W + 2), c = P(u, y, 0.12);
      glowAt(g, c[0], c[1], c[2] * 1.3, "255,50,40", 0.75 * (1 - p * 0.5));
      return true;
    }
    case "train_pass": {
      const dir = e.dir || 1, head = trainHead(dir, p), tail = head - dir * TRAIN_LEN, y = RAIL_Y + 0.5;
      if (!lowQ) { // เส้นความเร็ว + ฝุ่นท้ายขบวน + ประกายล้อ
        g.strokeStyle = "rgba(230,235,245,.28)"; g.lineWidth = 1; g.beginPath();
        for (let i = 0; i < 10; i++) { const yy = y + (hash(i, e.seq) - 0.5) * 0.9, z = 0.15 + hash(i + 3, e.seq) * 0.7, x0 = tail - dir * (0.3 + hash(i, 4) * 1.6), a = P(x0, yy, z), b = P(x0 - dir * (1 + hash(i, 6) * 1.5), yy, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
        g.stroke();
        for (let i = 0; i < 8; i++) { const k = ((now / 500) + i / 8) % 1, q = P(tail - dir * (k * 1.6), y + (hash(i, 2) - 0.5) * 0.8, 0.05 + k * 0.4); g.fillStyle = `rgba(170,160,145,${0.35 * (1 - k)})`; g.beginPath(); g.arc(q[0], q[1], q[2] * (0.08 + k * 0.14), 0, TAU); g.fill(); }
        for (let i = 0; i < 5; i++) { if (Math.sin(now / 40 + i * 7) < 0.5) continue; const x = head - dir * (hash(i, Math.floor(now / 60)) * TRAIN_LEN), q = P(x, y + (i % 2 ? 0.14 : -0.14), 0.06); g.fillStyle = "rgba(255,220,140,.9)"; g.fillRect(q[0] - 1, q[1] - 1, 2, 2); }
      }
      // คนบนรางโดนชน
      for (const h of e.hits || []) {
        if (!h.from) continue;
        const ph = trainAtX(dir, h.from.x + 0.5), q = (p - ph) / 0.14;
        if (q < 0 || q > 1) continue;
        const c = P(h.from.x + 0.5, h.from.y + 0.5, 0.5), s = c[2];
        if (q < 0.25) out.flash = Math.max(out.flash, 0.12 * (1 - q / 0.25));
        glowAt(g, c[0], c[1], s * (0.6 + q * 1.2), "255,220,170", 1 - q);
        gEllipse(g, h.from.x + 0.5, h.from.y + 0.5, 0.3 + q * 1.1, 0.05, 28); g.strokeStyle = `rgba(255,235,200,${0.7 * (1 - q)})`; g.lineWidth = 2; g.stroke();
        if (!lowQ) for (let i = 0; i < 10; i++) { const a = hash(i, e.seq + h.from.x) * TAU, r = s * 1.1 * q; g.fillStyle = `rgba(${i % 2 ? "255,200,120" : "90,80,70"},${1 - q})`; g.fillRect(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.6 - s * 0.5 * q, 2.5, 2.5); }
      }
      // ผู้โดยสาร: ร่างจางรอที่ชานชาลาต้นทาง · ไอน้ำบังที่ชานชาลาปลายทางจนกว่าจะถึง
      for (const c of e.carried || []) {
        if (!c.from || !c.to) continue;
        const u = unitOf(units, c.id), col = u ? u.color : "#d8dde6", pFrom = trainAtX(dir, c.from.x + 0.5), pTo = Math.max(trainAtX(dir, c.to.x + 0.5), pFrom);
        if (p < pFrom + 0.04) ghostPiece(g, c.from.x + 0.5, c.from.y + 0.5, col, p > pFrom ? 1 - (p - pFrom) / 0.04 : 0.85);
        const ss = p < pTo ? 1 : Math.max(0, 1 - (p - pTo) / 0.15);
        if (ss > 0) {
          const c0 = P(c.to.x + 0.5, c.to.y + 0.5, 0.4);
          glowAt(g, c0[0], c0[1], c0[2] * 1.0, "235,238,242", 0.9 * ss);
          if (!lowQ) puff(g, c.to.x + 0.5, c.to.y + 0.5, 0.15, 0.4 + 0.3 * Math.sin(now / 300), e.seq + c.to.x, 7, "235,238,242", 0.18 * ss + 0.02);
        }
      }
      return true;
    }
    case "gondola": {
      const pp = e.from && e.to ? gondolaPath(e.from, e.to) : null;
      if (!pp) return true;
      const k = ease(p);
      if (!lowQ && k < 0.98) for (let i = 1; i <= 4; i++) { // คลื่นท้ายเรือ
        const b = alongPath(pp, Math.max(0, k - i * 0.035));
        gEllipse(g, b.x, b.y + 0.05, 0.08 + i * 0.07, 0.005, 16, 0.04 + i * 0.03); g.strokeStyle = `rgba(230,245,255,${0.4 * (1 - i / 5)})`; g.lineWidth = 1; g.stroke();
      }
      // หมอกน้ำบางที่ท่าปลายทางจนเรือถึง
      const mist = Math.max(0, 1 - k * 1.05);
      if (mist > 0 && e.to) { const c = P(e.to.x + 0.5, e.to.y + 0.5, 0.4); glowAt(g, c[0], c[1], c[2] * 0.9, "220,232,240", 0.85 * mist); }
      return true;
    }
    case "tunnel": {
      const from = e.from, to = e.to, u = unitOf(units, e.id), col = u ? u.color : "#d8dde6";
      if (from) {
        const t = TUNNELS4.find((o) => o.x === from.x && o.y === from.y), f = t ? t.f : [0, 1], k = Math.min(1, p / 0.5);
        ghostPiece(g, from.x + 0.5 - f[0] * 0.35 * ease(k), from.y + 0.5 - f[1] * 0.35 * ease(k), col, 0.9 * (1 - k), 1 - 0.35 * k);
        const m = P(from.x + 0.5 - f[0] * 0.14, from.y + 0.5 - f[1] * 0.14, 0.25);
        if (p < 0.5) glowAt(g, m[0], m[1], m[2] * 0.6, "0,0,0", 0.5 * (1 - k));
      }
      if (to) { // ออกจากความมืดที่ปากอีกฝั่ง
        const q = Math.max(0, (p - 0.3) / 0.7), c = P(to.x + 0.5, to.y + 0.5, 0.45);
        glowAt(g, c[0], c[1], c[2] * 1.1, "0,0,0", 0.95 * (1 - ease(q)));
        if (!lowQ && q > 0 && q < 1) puff(g, to.x + 0.5, to.y + 0.55, 0.05, q, e.seq, 6, "150,140,125", 0.1);
      }
      return true;
    }
    case "camp_meal": {
      const meal = e.meal || "atk", cx = e.x + 0.5, cy = e.y + 0.5, rgb = CAMP_RGB[meal] || "255,200,120";
      if (!lowQ) puff(g, e.x + 0.72, e.y + 0.7, 0.25 + p * 0.5, p, e.seq, 9, "235,232,225", 0.12); // ไอ/ควันจากหม้อ
      const u = unitOf(units, e.id) || { x: cx, y: cy }, b = P(u.x, u.y, 0.05), s = b[2];
      if (p > 0.35) { const q = (p - 0.35) / 0.65; gEllipse(g, u.x, u.y, 0.25 + q * 0.5, 0.03, 26); g.strokeStyle = `rgba(${rgb},${0.8 * (1 - q)})`; g.lineWidth = 2.5; g.stroke(); glowAt(g, b[0], b[1] - s * 0.4, s * 0.9, rgb, 0.6 * (1 - q)); }
      const pop = p < 0.25 ? ease(p / 0.25) : 1, al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25, ic = P(u.x, u.y, 1.25 + p * 0.45);
      glowAt(g, ic[0], ic[1], s * 0.5 * pop, rgb, 0.6 * al);
      emoji(g, CAMP_ICON[meal] || "🍲", ic[0], ic[1], s * 0.42 * (0.6 + 0.5 * pop - 0.1 * (pop >= 1 ? Math.max(0, Math.sin(p * 9)) * (1 - p) : 0)), al);
      return true;
    }
    case "fish": {
      const t = FISH4.find((o) => o.x === e.x && o.y === e.y) || { x: e.x, y: e.y, d: [-1, 0], bob: { x: e.x - 0.6, y: e.y + 0.5 } };
      const u = unitOf(units, e.id) || { x: e.x + 0.5, y: e.y + 0.5 }, [dx, dy] = t.d, n = [-dy, dx];
      const tipW = [u.x + dx * 0.5 - n[0] * 0.12, u.y + dy * 0.5 - n[1] * 0.12, 0.95], tip = P(...tipW), hand = P(u.x - n[0] * 0.12, u.y - n[1] * 0.12, 0.45);
      g.strokeStyle = night ? "#3a2f22" : "#2e2a26"; g.lineWidth = Math.max(1.2, tip[2] * 0.016); g.beginPath(); g.moveTo(hand[0], hand[1]); g.lineTo(tip[0], tip[1]); g.stroke();
      const bob = t.bob, giant = e.result === "giant";
      if (p < 0.22) { // เหวี่ยงสาย: ทุ่นลอยโค้งลงน้ำ
        const k = ease(p / 0.22), bx = tipW[0] + (bob.x - tipW[0]) * k, by = tipW[1] + (bob.y - tipW[1]) * k, bz = 0.95 * (1 - k) + Math.sin(k * Math.PI) * 0.6, q = P(bx, by, bz);
        g.strokeStyle = "rgba(235,240,245,.6)"; g.lineWidth = 1; g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(q[0], q[1]); g.stroke();
        g.fillStyle = "#e0321f"; g.beginPath(); g.arc(q[0], q[1], Math.max(1.6, q[2] * 0.03), 0, TAU); g.fill();
        return true;
      }
      const bite = p > 0.4 && p < 0.52, dip = bite ? Math.abs(Math.sin((p - 0.4) * 60)) : p >= 0.52 ? 1 : 0;
      const bp = P(bob.x, bob.y, 0.03 - dip * 0.05);
      const taut = p >= 0.52;
      g.strokeStyle = taut ? "rgba(245,248,250,.85)" : "rgba(235,240,245,.6)"; g.lineWidth = taut ? 1.4 : 1; g.beginPath(); g.moveTo(tip[0], tip[1]);
      if (taut) g.lineTo(bp[0], bp[1]); else g.quadraticCurveTo((tip[0] + bp[0]) / 2, Math.max(tip[1], bp[1]) + bp[2] * 0.06, bp[0], bp[1]);
      g.stroke();
      if (p < 0.52) { drawBobber(g, bob.x, bob.y, now, dip); if (bite) splash(g, bob.x, bob.y, (p - 0.4) / 0.12, e.seq, 6, 0.18, lowQ); return true; }
      const q = (p - 0.52) / 0.48;
      if (giant) { // ปลายักษ์โผล่หางแล้วฟาดลากลงน้ำ
        const rise = Math.sin(Math.min(1, q * 1.4) * Math.PI), b = P(bob.x, bob.y, 0), s = b[2];
        splash(g, bob.x, bob.y, Math.min(1, q * 1.2), e.seq + 3, 14, 0.55, lowQ);
        if (rise > 0.02) {
          const hgt = s * 0.7 * rise, wv = Math.sin(now / 80) * s * 0.05;
          g.fillStyle = "#1f2a33"; g.beginPath(); g.moveTo(b[0] - s * 0.08, b[1]); g.quadraticCurveTo(b[0] - s * 0.05 + wv, b[1] - hgt * 0.6, b[0] + wv, b[1] - hgt * 0.75);
          g.lineTo(b[0] - s * 0.32 + wv, b[1] - hgt * 1.05); g.quadraticCurveTo(b[0] + wv, b[1] - hgt * 0.85, b[0] + s * 0.32 + wv, b[1] - hgt * 1.05); g.lineTo(b[0] + wv, b[1] - hgt * 0.75);
          g.quadraticCurveTo(b[0] + s * 0.05 + wv, b[1] - hgt * 0.6, b[0] + s * 0.08, b[1]); g.closePath(); g.fill();
          g.strokeStyle = "rgba(120,160,190,.5)"; g.lineWidth = 1; g.stroke();
        }
        const pc = P(u.x, u.y, 0.5);
        if (q > 0.3) { glowAt(g, pc[0], pc[1], pc[2] * 0.9, "255,50,40", 0.6 * (1 - q)); out.flash = Math.max(out.flash, q < 0.4 ? 0.06 : 0); }
        if (!lowQ) for (let i = 0; i < 4; i++) { const k = ((now / 300) + i / 4) % 1, a = P(u.x + (bob.x - u.x) * k, u.y + (bob.y - u.y) * k, 0.05); g.fillStyle = `rgba(220,240,255,${0.5 * (1 - q)})`; g.beginPath(); g.arc(a[0], a[1], Math.max(1, a[2] * 0.02), 0, TAU); g.fill(); }
        return true;
      }
      splash(g, bob.x, bob.y, Math.min(1, q * 1.6), e.seq + 1, 10, 0.3, lowQ);
      if (e.result === "coins") { // เหรียญกระเด็นจากน้ำมาหาคนตก
        for (let i = 0; i < 6; i++) {
          const k = Math.max(0, Math.min(1, q * 1.5 - i * 0.08));
          if (k <= 0 || k >= 1) continue;
          const c = P(bob.x + (u.x - bob.x) * k, bob.y + (u.y - bob.y) * k, Math.sin(k * Math.PI) * 0.9 + k * 0.6), s = c[2], w = Math.abs(Math.cos(now / 70 + i)) * s * 0.05;
          glowAt(g, c[0], c[1], s * 0.2, "255,215,90", 0.6);
          g.fillStyle = "#f2c430"; g.beginPath(); g.ellipse(c[0], c[1], Math.max(0.8, w), s * 0.05, 0, 0, TAU); g.fill();
          g.strokeStyle = "#a8780c"; g.lineWidth = 1; g.stroke();
        }
      } else { // ปลาเงิน / ปลาทองกระโดดขึ้นมาหาคนตก
        const gold = e.result === "gold", k = ease(Math.min(1, q * 1.4)), c = P(bob.x + (u.x - bob.x) * k, bob.y + (u.y - bob.y) * k, Math.sin(k * Math.PI) * 1.0 + k * 0.7), s = c[2];
        const ang = Math.atan2((u.y - bob.y), (u.x - bob.x)) * 0.3 + Math.cos(k * Math.PI) * -0.9 + Math.sin(now / 50) * 0.25 * (1 - k);
        if (gold) glowAt(g, c[0], c[1], s * 0.6, "255,215,90", 0.85);
        fishShape(g, c[0], c[1], s * (gold ? 1.25 : 1.1), ang, gold ? "#ffcf3a" : "#c6dbe6", gold ? "#fff3b0" : "#ffffff");
        if (q > 0.7) { const pc = P(u.x, u.y, 0.6); glowAt(g, pc[0], pc[1], pc[2] * 0.8, gold ? "255,215,90" : "110,255,150", (1 - q) / 0.3 * 0.6); }
      }
      return true;
    }
    case "tomb_open": {
      const t = tombAt(e.x, e.y), [fx, fy] = t.f, cx = e.x + 0.5, cy = e.y + 0.5, dp = P(cx + fx * 0.4, cy + fy * 0.4, 0.3), s = dp[2];
      glowAt(g, dp[0], dp[1], s * (0.6 + p), "140,200,255", 0.9 * (1 - p));
      if (p > 0.15 && p < 0.75) { // เสาแสงพุ่งขึ้นฟ้า
        const k = (p - 0.15) / 0.6, a = Math.sin(k * Math.PI), b0 = P(cx, cy, 0.9), b1 = P(cx, cy, 6);
        const gr = g.createLinearGradient(b0[0], b0[1], b1[0], b1[1]); gr.addColorStop(0, `rgba(190,230,255,${0.6 * a})`); gr.addColorStop(1, "rgba(190,230,255,0)");
        g.fillStyle = gr; g.fillRect(b0[0] - s * 0.18 * a, b1[1], s * 0.36 * a, b0[1] - b1[1]);
      }
      const u = unitOf(units, e.id);
      if (u && p > 0.4 && p < 0.85) { // อาวุธจักรพรรดิพุ่งเข้าหาผู้เปิด
        const k = ease((p - 0.4) / 0.45), x = cx + (u.x - cx) * k, y = cy + (u.y - cy) * k, z = 1.55 + Math.sin(k * Math.PI) * 0.7 - k * 0.9, c = P(x, y, z), a2 = P(x + (u.x - cx) * 0.05, y + (u.y - cy) * 0.05, z - 0.3);
        glowAt(g, c[0], c[1], c[2] * 0.6, "150,210,255", 0.9);
        const wi = e.w ? `/eos/img/arms/${e.w}.webp` : null;
        if (wi && img(wi)) { sprite(g, wi, x, y, z - 0.35, 0.8, false, 1); }
        else {
        g.strokeStyle = "rgba(235,248,255,.95)"; g.lineWidth = Math.max(1.5, c[2] * 0.022); g.lineCap = "round"; g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(a2[0], a2[1]); g.stroke(); g.lineCap = "butt";
        }
        if (!lowQ) for (let i = 1; i < 6; i++) { const kk = Math.max(0, k - i * 0.04), q2 = P(cx + (u.x - cx) * kk, cy + (u.y - cy) * kk, 1.55 + Math.sin(kk * Math.PI) * 0.7 - kk * 0.9); glowAt(g, q2[0], q2[1], q2[2] * 0.18, "150,210,255", 0.4 / i); }
      }
      if (u && p >= 0.82) { const q = (p - 0.82) / 0.18, c = P(u.x, u.y, 0.5); gEllipse(g, u.x, u.y, 0.3 + q * 0.6, 0.03, 26); g.strokeStyle = `rgba(160,215,255,${0.9 * (1 - q)})`; g.lineWidth = 2.5; g.stroke(); glowAt(g, c[0], c[1], c[2] * 1.0, "150,210,255", 0.8 * (1 - q)); }
      if (!lowQ && p < 0.6) puff(g, cx + fx * 0.45, cy + fy * 0.45, 0.05, p / 0.6, e.seq, 7, "160,150,135", 0.1);
      return true;
    }
    case "royal_drain": {
      const u = unitOf(units, e.id) || { x: e.x + 0.5, y: e.y + 0.5 }, c = P(u.x, u.y, 0.5), s = c[2];
      glowAt(g, c[0], c[1], s * (0.6 + p * 0.5), "120,60,200", 0.6 * (1 - p));
      if (!lowQ) for (let i = 0; i < 6; i++) { // ควันพลังถูกดูดขึ้นไปหาอาวุธ
        const a = hash(i, e.seq) * TAU, k = Math.min(1, p * 1.2 + hash(i, 4) * 0.1), q = P(u.x + Math.cos(a) * 0.25 * (1 - k), u.y + Math.sin(a) * 0.25 * (1 - k), 0.2 + k * 1.2);
        g.fillStyle = `rgba(140,90,220,${0.7 * (1 - k)})`; g.beginPath(); g.arc(q[0], q[1], Math.max(1, s * 0.05 * (1 - k * 0.5)), 0, TAU); g.fill();
      }
      const d = P(u.x + 0.12, u.y, 0.7 - p * 0.6);
      g.fillStyle = `rgba(220,40,50,${1 - p})`; g.beginPath(); g.moveTo(d[0], d[1] - s * 0.06); g.quadraticCurveTo(d[0] + s * 0.035, d[1], d[0], d[1] + s * 0.02); g.quadraticCurveTo(d[0] - s * 0.035, d[1], d[0], d[1] - s * 0.06); g.fill();
      return true;
    }
    case "hunt_board": {
      const u = unitOf(units, e.id);
      if (u) { // ใบประกาศค่าหัวเด้งขึ้นเหนือหัว
        const pop = p < 0.2 ? ease(p / 0.2) : 1, al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25, c = P(u.x, u.y, 1.45 + p * 0.25), s = c[2] * 0.42 * (0.5 + 0.5 * pop);
        g.save(); g.globalAlpha *= al; g.translate(c[0], c[1]); g.rotate(Math.sin(p * 12) * 0.08 * (1 - p));
        g.fillStyle = "#e9d8a6"; g.beginPath(); g.moveTo(-s * 0.5, -s * 0.62); g.lineTo(s * 0.5, -s * 0.6); g.lineTo(s * 0.47, s * 0.6); g.lineTo(-s * 0.52, s * 0.62); g.closePath(); g.fill();
        g.strokeStyle = "#8a6a32"; g.lineWidth = Math.max(1, s * 0.04); g.stroke();
        g.fillStyle = "#c8321f"; g.beginPath(); g.arc(0, -s * 0.55, Math.max(1.5, s * 0.07), 0, TAU); g.fill();
        g.restore();
        emoji(g, BOUNTY_ICON[e.bounty] || "📜", c[0], c[1] + s * 0.05, s * 0.62, al);
      }
      const tu = e.target ? unitOf(units, e.target) : null;
      if (tu && p > 0.25) { // เป้าค่าหัว: กรอบเล็งแดงหมุนรอบตัวเป้า
        const q = (p - 0.25) / 0.75, c = P(tu.x, tu.y, 0.45), s = c[2], r = s * (0.6 - 0.15 * ease(Math.min(1, q * 2))), rot = q * 2;
        g.save(); g.translate(c[0], c[1]); g.rotate(rot); g.strokeStyle = `rgba(255,60,50,${q < 0.8 ? 0.95 : (1 - q) / 0.2})`; g.lineWidth = Math.max(2, s * 0.035);
        for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(r, -r * 0.45); g.lineTo(r, -r); g.lineTo(r * 0.55, -r); g.stroke(); }
        g.restore();
      }
      return true;
    }
    case "hunt_done": {
      const u = unitOf(units, e.id);
      if (!u) return true;
      const c = P(u.x, u.y, 0.6), s = c[2];
      glowAt(g, c[0], c[1], s * (0.6 + p), "255,210,80", 0.8 * (1 - p));
      for (let i = 0; i < (lowQ ? 6 : 12); i++) { // เหรียญพุ่งกระจาย
        const a = hash(i, e.seq) * TAU, k = Math.min(1, p * 1.4), r = 0.6 * k * (0.5 + hash(i + 2, e.seq) * 0.6), z = 0.6 + Math.sin(k * Math.PI) * (0.6 + hash(i + 4, e.seq) * 0.5) - k * 0.4;
        const q = P(u.x + Math.cos(a) * r, u.y + Math.sin(a) * r, Math.max(0.05, z)), w = Math.abs(Math.cos(now / 60 + i)) * q[2] * 0.045;
        g.fillStyle = `rgba(242,196,48,${1 - Math.max(0, (p - 0.7) / 0.3)})`; g.beginPath(); g.ellipse(q[0], q[1], Math.max(0.8, w), q[2] * 0.045, 0, 0, TAU); g.fill();
      }
      if (p < 0.5) { const k = p / 0.5, b = P(u.x, u.y, 1.5 + k * 0.3); g.fillStyle = `rgba(255,120,40,${0.8 * (1 - k)})`; g.beginPath(); g.arc(b[0], b[1], s * 0.2 * (1 - k * 0.5), 0, TAU); g.fill(); emoji(g, "📜", b[0], b[1], s * 0.3 * (1 - k * 0.6), 1 - k); }
      return true;
    }
    default: return false;
  }
}
// ไฟหน้ารถไฟที่กำลังมาที่ขอบแผนที่ (ระหว่างเตือน)
export function p4AirAlways(g, fd, now) {
  const rail = fd.rail;
  if (!rail || !rail.warn) return;
  const dir = rail.dir || 1, c = P(dir > 0 ? -0.6 : MAP_W + 0.6, RAIL_Y + 0.5, 0.35), pulse = 0.6 + 0.4 * Math.sin(now / 200);
  glowAt(g, c[0], c[1], c[2] * 1.4, "255,245,215", 0.55 * pulse);
  glowAt(g, c[0], c[1], c[2] * 0.4, "255,255,240", 0.9);
}

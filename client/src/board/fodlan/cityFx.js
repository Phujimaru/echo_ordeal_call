// ============================================================
//  Nautilus ชั้น 4 — ของบนกระดาน + ฉาก + เสียงของลูกเล่น/สภาพอากาศ (server/fodlan/ntCity.js · fd.city)
//   ของ: แผ่นกด (วางชนวน = รอยแตกแดงเรือง) · เสาล้มนอนขวางแนว · ประตูหิน (กรอบ + แผ่นประตูเลื่อนลง) · เศษรูปปั้นเรืองแสง
//   ฉาก: nt_god_beam (ตาเทพยิงลำแสง) · nt_plate_arm · nt_pillar_fall (เสาล้ม ฝุ่น) · nt_gate (ประตูเลื่อน) · nt_ring (วงอักขระปลุก โซ่อักขระ)
//        nt_rune (กับดัก/พร) · nt_statue_shatter (แตกเป็นแสง) · nt_altar (เหรียญลงอ่าง) · nt_shove · nt_dodge
//        nt_maelstrom / nt_maelstrom_pull (น้ำวนยักษ์) · nt_cold / nt_cold_sweep (กระแสน้ำเย็นจัด)
// ============================================================
import { P, depthOf, faceVisible, glow } from "../boardGeo";
import { fxT, fxOnce } from "./index";
import { playSfx, registerSounds } from "../../audio";

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const K = (x, y) => `${x},${y}`;
const RUNE = "90,235,255";
const STONE = [74, 90, 104];
const shade = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
const poly = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };

export const CITY_FX = {
  nt_god_beam: 1500, nt_plate_arm: 800, nt_pillar_fall: 1700, nt_gate: 1300, nt_ring: 2000, nt_rune: 1200, nt_statue_shatter: 1500, nt_altar: 1700,
  nt_shove: 500, nt_dodge: 700, nt_maelstrom: 2200, nt_maelstrom_pull: 1200, nt_cold: 1600, nt_cold_sweep: 1500,
};

let SND = false;
const KEYS = ["l10_beam", "l10_choir", "l10_slide", "l10_collapse", "l10_debris", "l10_lock", "l10_coins", "l10_riser", "l10_cold", "l10_slam", "swirl", "zap", "bubbles", "rush", "impact"];
function snd(k, gain = 1, delay = 0) {
  if (!SND) { SND = true; registerSounds(Object.fromEntries(KEYS.map((n) => [`ntc_${n}`, `/nautilus/sfx/${n}.mp3`]))); }
  const go = () => playSfx(`ntc_${k}`, { gain }); if (delay > 0) setTimeout(go, delay); else go();
}

// ทรงกล่องอย่างง่าย (ซ้ำกับ city.js — ไม่ import กลับเพื่อกันวน)
function box(g, x0, y0, x1, y1, z0, z1, k = 1) {
  const faces = [[0, 1, x0, y1, x1, y1, 0.78], [0, -1, x1, y0, x0, y0, 0.78], [1, 0, x1, y1, x1, y0, 0.62], [-1, 0, x0, y0, x0, y1, 0.62]];
  for (const [nx, ny, ax, ay, bx, by, sh] of faces) { if (!faceVisible(nx, ny, (ax + bx) / 2, (ay + by) / 2)) continue; poly(g, [P(ax, ay, z0), P(bx, by, z0), P(bx, by, z1), P(ax, ay, z1)]); g.fillStyle = shade(STONE, sh * k); g.fill(); }
  poly(g, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)]); g.fillStyle = shade(STONE, 1.05 * k); g.fill();
}
// เสานอน (ทรงเปลือกนูนของวงปลายสองข้าง) พร้อมร่องเสา
function lyingColumn(g, x0, y0, x1, y1, r, zc) {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, px = -(y1 - y0) / L, py = (x1 - x0) / L, pts = [];
  for (const [ex, ey] of [[x0, y0], [x1, y1]]) for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; pts.push(P(ex + px * Math.cos(a) * r, ey + py * Math.cos(a) * r, zc + Math.sin(a) * r)); }
  const p = pts.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  poly(g, lo.slice(0, -1).concat(up.slice(0, -1))); g.fillStyle = shade(STONE, 0.72); g.fill();
  g.strokeStyle = shade(STONE, 0.5); g.lineWidth = 1;
  for (const o of [-0.5, 0, 0.5]) { const a = P(x0 + px * r * o, y0 + py * r * o, zc + r * 0.86), b = P(x1 + px * r * o, y1 + py * r * o, zc + r * 0.86); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  const t0 = P(x0, y0, zc + r * 0.95), t1 = P(x1, y1, zc + r * 0.95); g.strokeStyle = shade(STONE, 1.05); g.lineWidth = Math.max(1, t0[2] * r * 0.35); g.beginPath(); g.moveTo(t0[0], t0[1]); g.lineTo(t1[0], t1[1]); g.stroke();
}
// แนวที่เสาล้มทับ (ฝั่ง client — ตามผัง: หยุดที่สิ่งกีดขวาง)
function fallLine(info, pl) {
  const out = [], tk = info.terrainKind || {};
  for (let i = 1; i <= 4; i++) { const x = pl.col.x + pl.dir[0] * i, y = pl.col.y + pl.dir[1] * i; if (x < 0 || y < 0 || x >= info.cols || y >= info.rows || tk[K(x, y)]) break; out.push({ x, y }); }
  return out;
}
// ทิศกำแพงที่ประตูอยู่ (แนวตั้ง = ผนังเหนือ/ใต้ประตู)
const gateVertical = (info, gt) => { const tk = info.terrainKind || {}; return !!(tk[K(gt.x, gt.y - 1)] || tk[K(gt.x, gt.y + 1)]); };
// ความคืบหน้าของฉาก kind ล่าสุดที่ตรงเงื่อนไข (ไม่มี = null)
function fxProgress(fd, kind, now, test) {
  let best = null;
  for (const e of fd.fx || []) { if (e.kind !== kind || (test && !test(e))) continue; const k = fxT(e, now, CITY_FX[kind]); if (k < 1) best = { e, k }; }
  return best;
}

// =================================================================== ของบนกระดาน
export function cityItems(list, g, fd, info, now, Z) {
  const c = fd && fd.city; if (!c) return;
  const t = now / 1000;
  // แผ่นกด: วางชนวน = รอยแตกเรืองแดงอมส้มเต้น · ทำงานแล้ว = ยุบแตก
  for (const pl of c.plates || []) {
    if (pl.armed) list.push({ d: depthOf(pl.x + 0.5, pl.y + 0.5) - 0.3, f: () => armedPlate(g, pl, t) });
    if (pl.sprung) {
      const falling = fxProgress(fd, "nt_pillar_fall", now, (e) => e.x === pl.x && e.y === pl.y);
      if (falling) continue; // ฉากเสาล้มวาดเองอยู่
      const line = fallLine(info, pl);
      const segs = [[pl.col.x + 0.5, pl.col.y + 0.5], ...line.map((q) => [q.x + 0.5, q.y + 0.5])];
      for (let i = 0; i < segs.length - 1; i++) {
        const [ax, ay] = segs[i], [bx, by] = segs[i + 1];
        list.push({ d: depthOf((ax + bx) / 2, (ay + by) / 2), f: () => lyingColumn(g, ax + (bx - ax) * 0.06, ay + (by - ay) * 0.06, bx - (bx - ax) * 0.06, by - (by - ay) * 0.06, 0.21, 0.21) });
      }
    }
  }
  // ประตูหิน: กรอบ (เสาข้าง 2 + ทับหลังสลักวงอาทิตย์) · แผ่นประตู (ปิด = ลงถึงพื้น · ฉากเลื่อน)
  for (const gt of c.gates || []) {
    const v = gateVertical(info, gt), anim = fxProgress(fd, "nt_gate", now, (e) => e.x === gt.x && e.y === gt.y);
    let down = gt.open ? 0 : 1;
    if (anim) down = anim.e.open ? 1 - easeOut(Math.min(1, anim.k / 0.7)) : easeIn(Math.min(1, anim.k / 0.45));
    list.push({ d: depthOf(gt.x + 0.5, gt.y + 0.5) + 0.01, f: () => gateArt(g, gt, v, down, t) });
  }
  // เศษรูปปั้นเรืองแสง
  for (const k of c.broken || []) { const [x, y] = k.split(",").map(Number); list.push({ d: depthOf(x + 0.5, y + 0.5), f: () => shards(g, x, y, t) }); }
  void Z;
}
function armedPlate(g, pl, t) {
  const k = 0.55 + 0.45 * Math.sin(t * 5 + pl.x);
  g.save(); g.globalCompositeOperation = "lighter";
  const [sx, sy, s] = P(pl.x + 0.5, pl.y + 0.5, 0.01);
  glow(g, sx, sy, s * 0.7, "255,110,60", 0.25 * k);
  g.strokeStyle = `rgba(255,140,80,${0.75 * k})`; g.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3, p0 = P(pl.x + 0.5, pl.y + 0.5, 0.01), p1 = P(pl.x + 0.5 + Math.cos(a) * 0.3, pl.y + 0.5 + Math.sin(a) * 0.3, 0.01), p2 = P(pl.x + 0.5 + Math.cos(a + 0.4) * 0.36, pl.y + 0.5 + Math.sin(a + 0.4) * 0.36, 0.01); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke(); }
  g.restore();
}
function gateArt(g, gt, v, down, t) {
  const x = gt.x, y = gt.y, H = 1.95;
  // แนวประตู: v = ผนังแนวตั้ง → ประตูกั้นตามแกน y (เสาข้างที่ y และ y+1)
  const jambs = v ? [[x + 0.22, y, x + 0.78, y + 0.12], [x + 0.22, y + 0.88, x + 0.78, y + 1]] : [[x, y + 0.22, x + 0.12, y + 0.78], [x + 0.88, y + 0.22, x + 1, y + 0.78]];
  const slab = v ? [x + 0.34, y + 0.1, x + 0.66, y + 0.9] : [x + 0.1, y + 0.34, x + 0.9, y + 0.66];
  const parts = [...jambs.map((j) => ({ j }))];
  parts.sort((a, b) => depthOf((a.j[0] + a.j[2]) / 2, (a.j[1] + a.j[3]) / 2) - depthOf((b.j[0] + b.j[2]) / 2, (b.j[1] + b.j[3]) / 2));
  box(g, ...parts[0].j, 0, H, 0.85);
  if (down > 0.01) {
    const z1 = H - 0.05, z0 = z1 - (H - 0.05) * down;
    box(g, ...slab, z0, z1, 0.95);
    // วงอาทิตย์สลักบนแผ่นประตู (ด้านที่หันกล้อง)
    const [cx, cy] = [(slab[0] + slab[2]) / 2, (slab[1] + slab[3]) / 2], n = v ? [faceVisible(1, 0, slab[2], cy) ? slab[2] : slab[0], cy] : [cx, faceVisible(0, 1, cx, slab[3]) ? slab[3] : slab[1]];
    const zc = z0 + (z1 - z0) * 0.55; if (z1 - z0 > 0.6) { const [sx, sy, s] = P(n[0], n[1], zc); g.strokeStyle = `rgba(${RUNE},${0.35 + 0.15 * Math.sin(t * 2)})`; g.lineWidth = 1.4; g.beginPath(); g.arc(sx, sy, s * 0.16, 0, TAU); g.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.beginPath(); g.moveTo(sx + Math.cos(a) * s * 0.18, sy + Math.sin(a) * s * 0.18); g.lineTo(sx + Math.cos(a) * s * 0.26, sy + Math.sin(a) * s * 0.26); g.stroke(); } }
  }
  box(g, ...parts[1].j, 0, H, 0.85);
  box(g, v ? x + 0.18 : x - 0.02, v ? y - 0.02 : y + 0.18, v ? x + 0.82 : x + 1.02, v ? y + 1.02 : y + 0.82, H, H + 0.28, 1);
}
function shards(g, x, y, t) {
  for (let i = 0; i < 7; i++) {
    const h = (a, b) => { const q = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return q - Math.floor(q); };
    const [sx, sy, s] = P(x + 0.2 + h(x + i, y) * 0.6, y + 0.2 + h(x, y + i) * 0.6, 0);
    const k = 0.5 + 0.5 * Math.sin(t * 2 + i);
    g.fillStyle = `rgba(170,235,250,${0.35 + 0.3 * k})`; g.beginPath(); g.moveTo(sx, sy - s * (0.08 + h(i, x) * 0.12)); g.lineTo(sx + s * 0.04, sy); g.lineTo(sx - s * 0.04, sy); g.fill();
  }
  const [sx, sy, s] = P(x + 0.5, y + 0.5, 0.1); glow(g, sx, sy, s * 0.6, "160,235,255", 0.15);
}

// =================================================================== ฉาก (ทับตัวละคร)
export function cityFx(g, fd, info, now) {
  for (const e of fd.fx || []) {
    const dur = CITY_FX[e.kind]; if (!dur) continue;
    if (fxOnce(e)) sounds(e);
    const k = fxT(e, now, dur); if (k >= 1) continue;
    if (e.kind === "nt_god_beam") drawBeam(g, e, k, now);
    else if (e.kind === "nt_plate_arm") drawArm(g, e, k);
    else if (e.kind === "nt_pillar_fall") drawPillarFall(g, e, k);
    else if (e.kind === "nt_gate") drawGateDust(g, e, k);
    else if (e.kind === "nt_ring") drawRing(g, e, k, now);
    else if (e.kind === "nt_rune") drawRune(g, e, k);
    else if (e.kind === "nt_statue_shatter") drawShatter(g, e, k);
    else if (e.kind === "nt_altar") drawAltar(g, e, k);
    else if (e.kind === "nt_dodge") drawDodge(g, e, k);
    else if (e.kind === "nt_maelstrom_pull") for (const m of e.moves || []) streak(g, m, k, "180,230,255");
    else if (e.kind === "nt_cold_sweep") drawColdSweep(g, e, k, info);
  }
}
function sounds(e) {
  switch (e.kind) {
    case "nt_god_beam": snd("l10_slide", 0.7); snd("l10_beam", 1, 450); if ((e.hits || []).length) snd("impact", 0.6, 650); break;
    case "nt_plate_arm": snd("l10_lock", 1.4); break;
    case "nt_pillar_fall": snd("l10_collapse", 1); snd("l10_debris", 1.3, 550); break;
    case "nt_gate": snd("l10_slide", 1); if (!e.open) snd("l10_slam", e.hit ? 1 : 0.6, 520); break;
    case "nt_ring": snd("l10_choir", 1); snd("zap", 0.5, 700); break;
    case "nt_rune": if (e.trap) { snd("zap", 0.8); snd("l10_debris", 0.9, 100); } else snd("l10_choir", 0.55); break;
    case "nt_statue_shatter": snd("l10_debris", 1.4); snd("l10_beam", 0.7, 120); break;
    case "nt_altar": snd("l10_coins", 1); snd("l10_choir", 0.8, 500); break;
    case "nt_maelstrom": snd("l10_riser", 0.9); snd("swirl", 0.9, 800); break;
    case "nt_maelstrom_pull": snd("swirl", 0.8); break;
    case "nt_cold": snd("l10_cold", 1); break;
    case "nt_cold_sweep": snd("l10_cold", 0.85); snd("bubbles", 0.4, 300); break;
    default: break;
  }
}
// ตาเทพ: ประกายที่ตา → ลำแสงพุ่งตามแนว (หัวลำแสงวิ่ง) → ค้างแล้วจาง · โดน = แสงแตกที่ตัว
function drawBeam(g, e, k, now) {
  const a = e.from, b = e.to; if (!a || !b) return;
  const z = 1.86, [ex, ey, s] = P(a.x + 0.5 + (e.dir ? e.dir.x * 0.13 : 0), a.y + 0.5 + (e.dir ? e.dir.y * 0.13 : 0), z);
  const charge = Math.min(1, k / 0.3);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, ex, ey, s * (0.3 + charge * 0.6), RUNE, 0.9 * (k < 0.85 ? 1 : (1 - k) / 0.15));
  if (k > 0.25) {
    const u = Math.min(1, (k - 0.25) / 0.15), fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
    const tx = lerp(a.x + 0.5, b.x + 0.5, u), ty = lerp(a.y + 0.5, b.y + 0.5, u), [bx, by] = P(tx, ty, 0.9);
    for (const [w, col, al] of [[s * 0.22, RUNE, 0.35], [s * 0.09, "220,252,255", 0.9]]) { g.strokeStyle = `rgba(${col},${al * fade})`; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(ex, ey); g.lineTo(bx, by); g.stroke(); }
    g.lineCap = "butt";
    glow(g, bx, by, s * 0.5, "220,252,255", 0.7 * fade);
    for (let i = 0; i < 8; i++) { const q = (now / 400 + i / 8) % 1, [px, py] = P(lerp(a.x + 0.5, tx, q), lerp(a.y + 0.5, ty, q), 0.9 + Math.sin(i * 3) * 0.1); g.fillStyle = `rgba(230,255,255,${0.7 * fade})`; g.fillRect(px - 1, py - 1, 2, 2); }
  }
  g.restore();
}
function drawArm(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.02);
  g.strokeStyle = `rgba(255,150,90,${1 - k})`; g.lineWidth = 2; g.beginPath(); g.ellipse(sx, sy, s * (0.2 + k * 0.5), s * (0.08 + k * 0.2), 0, 0, TAU); g.stroke();
}
// เสาล้ม: หมุนจากตั้งลงนอนตามทิศ (เร่งขึ้น) → กระแทก ฝุ่นตะกอนพุ่งตามแนว
function drawPillarFall(g, e, k) {
  const c = e.col, d = e.dir || { x: 1, y: 0 }; if (!c) return;
  const L = Math.max(1, (e.line || []).length) + 0.3, bx = c.x + 0.5, by = c.y + 0.5;
  const fall = Math.min(1, k / 0.45), ang = easeIn(fall) * Math.PI / 2;
  const tipX = bx + d.x * Math.sin(ang) * L, tipY = by + d.y * Math.sin(ang) * L, tipZ = Math.cos(ang) * L + 0.21;
  if (fall < 1) {
    const N = 8;
    for (let i = 0; i < N; i++) { const u0 = i / N, u1 = (i + 1) / N; const a = P(lerp(bx, tipX, u0), lerp(by, tipY, u0), lerp(0.21, tipZ, u0)), b = P(lerp(bx, tipX, u1), lerp(by, tipY, u1), lerp(0.21, tipZ, u1)); g.strokeStyle = shade(STONE, 0.75 + 0.1 * (i % 2)); g.lineWidth = a[2] * 0.42; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  } else {
    lyingColumn(g, bx, by, bx + d.x * (L - 0.3), by + d.y * (L - 0.3), 0.21, 0.21);
    const q = (k - 0.45) / 0.55;
    for (const t of e.line || []) {
      const [sx, sy, s] = P(t.x + 0.5, t.y + 0.5, 0.2 + q * 0.6);
      g.fillStyle = `rgba(110,130,140,${0.45 * (1 - q)})`; g.beginPath(); g.ellipse(sx, sy, s * (0.4 + q * 0.6), s * (0.25 + q * 0.4), 0, 0, TAU); g.fill();
      for (let i = 0; i < 4; i++) { const an = i * 1.7 + t.x, r = easeOut(q) * s * 0.7; g.fillStyle = `rgba(90,105,115,${1 - q})`; g.fillRect(sx + Math.cos(an) * r, sy - Math.abs(Math.sin(an)) * r * 0.8, s * 0.06, s * 0.05); }
    }
  }
}
function drawGateDust(g, e, k) {
  if (k < 0.35) return;
  const q = (k - 0.35) / 0.65, [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.1 + q * 0.3);
  g.fillStyle = `rgba(100,120,130,${0.45 * (1 - q)})`; g.beginPath(); g.ellipse(sx, sy, s * (0.5 + q * 0.7), s * (0.2 + q * 0.3), 0, 0, TAU); g.fill();
}
// วงอักขระตื่น: เสาแสงจากหินตั้งทั้ง 4 · วงอักขระลอยหมุนขึ้น · คนที่ติดผนึก = วงโซ่อักขระรัดรอบตัว
function drawRing(g, e, k, now) {
  const rx = e.x + 0.5, ry = e.y + 0.5, r = (e.r || 2) + 0.5, rise = easeOut(Math.min(1, k / 0.5)), fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
  g.save(); g.globalCompositeOperation = "lighter";
  for (const [ox, oy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const [bx, by, s] = P(rx + ox * r * 0.9, ry + oy * r * 0.9, 0), [tx, ty] = P(rx + ox * r * 0.9, ry + oy * r * 0.9, 4 * rise);
    const lg = g.createLinearGradient(bx, by, tx, ty); lg.addColorStop(0, `rgba(${RUNE},${0.7 * fade})`); lg.addColorStop(1, `rgba(${RUNE},0)`);
    g.strokeStyle = lg; g.lineWidth = s * 0.18; g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke();
  }
  for (let j = 0; j < 2; j++) {
    const z = 0.1 + rise * (0.6 + j * 0.7), rot = now / 600 * (j ? -1 : 1);
    g.strokeStyle = `rgba(${RUNE},${0.8 * fade})`; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * TAU, p = P(rx + Math.cos(a) * r * (1 - j * 0.25), ry + Math.sin(a) * r * (1 - j * 0.25), z); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.stroke();
    for (let i = 0; i < 12; i++) { const a = rot + (i / 12) * TAU, p = P(rx + Math.cos(a) * r * (1 - j * 0.25), ry + Math.sin(a) * r * (1 - j * 0.25), z + 0.08); g.fillStyle = `rgba(220,252,255,${fade})`; g.fillRect(p[0] - 2, p[1] - 3, 4, 6); }
  }
  g.restore();
}
function drawRune(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.05);
  if (e.trap) {
    const q = easeOut(k); g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, s * (0.4 + q), "200,60,255", 0.7 * (1 - k)); g.restore();
    g.strokeStyle = `rgba(230,120,255,${1 - k})`; g.lineWidth = 2; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r0 = s * 0.15, r1 = s * (0.3 + q * 0.6); g.beginPath(); g.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0 * 0.5); g.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1 * 0.5 - q * s * 0.3); g.stroke(); }
  } else {
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, s * 0.8, RUNE, 0.5 * (1 - k));
    for (let i = 0; i < 10; i++) { const u = (k + i / 10) % 1, [px, py] = P(e.x + 0.5 + Math.cos(i * 2.3) * 0.3, e.y + 0.5 + Math.sin(i * 2.3) * 0.3, u * 1.8); g.fillStyle = `rgba(200,250,255,${(1 - u) * (1 - k)})`; g.fillRect(px - 1.5, py - 1.5, 3, 3); }
    g.restore();
  }
}
function drawShatter(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 1.4);
  g.save(); g.globalCompositeOperation = "lighter";
  if (k < 0.35) glow(g, sx, sy, s * (0.5 + k * 6), "230,250,255", 0.9 * (1 - k / 0.35));
  for (let i = 0; i < 16; i++) { const a = i * 0.79, d = easeOut(k) * s * (0.8 + (i % 4) * 0.3), up = Math.sin(Math.min(1, k * 1.5) * Math.PI) * s * 0.6; g.fillStyle = `rgba(180,240,255,${1 - k})`; g.beginPath(); g.moveTo(sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.5 - up); g.lineTo(sx + Math.cos(a) * d + s * 0.04, sy + Math.sin(a) * d * 0.5 - up + s * 0.08); g.lineTo(sx + Math.cos(a) * d - s * 0.04, sy + Math.sin(a) * d * 0.5 - up + s * 0.08); g.fill(); }
  g.restore();
}
function drawAltar(g, e, k) {
  const f = e.from || { x: e.x, y: e.y };
  for (let i = 0; i < 3; i++) {
    const u = Math.min(1, Math.max(0, (k - i * 0.1) / 0.45)); if (u <= 0 || u >= 1) continue;
    const [px, py, s] = P(lerp(f.x + 0.5, e.x + 0.5, u), lerp(f.y + 0.5, e.y + 0.5, u), 0.9 + Math.sin(u * Math.PI) * 0.8);
    g.fillStyle = "#e6c25a"; g.beginPath(); g.ellipse(px, py, s * 0.06, s * 0.03 + Math.abs(Math.sin(u * 12)) * s * 0.02, 0, 0, TAU); g.fill();
  }
  if (k > 0.45) { const q = (k - 0.45) / 0.55, [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.6 + q * 1.5); g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, s * 0.9, RUNE, 0.6 * (1 - q)); g.restore(); const [ux, uy, us] = P(f.x + 0.5, f.y + 0.5, 0.6); g.save(); g.globalCompositeOperation = "lighter"; glow(g, ux, uy, us * (0.6 + q * 0.6), "255,220,140", 0.5 * (1 - q)); g.restore(); }
}
function drawDodge(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
  g.strokeStyle = `rgba(220,250,255,${0.8 * (1 - k)})`; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { const x = sx - s * 0.3 - k * s * 0.4 - i * s * 0.12; g.beginPath(); g.moveTo(x, sy - s * 0.2 + i * s * 0.15); g.lineTo(x + s * 0.25, sy - s * 0.2 + i * s * 0.15); g.stroke(); }
}
function streak(g, m, k, rgb) {
  if (!m.from || !m.to) return;
  const a = P(m.from.x + 0.5, m.from.y + 0.5, 0.4), b = P(lerp(m.from.x, m.to.x, easeOut(k)) + 0.5, lerp(m.from.y, m.to.y, easeOut(k)) + 0.5, 0.4);
  g.strokeStyle = `rgba(${rgb},${0.6 * (1 - k)})`; g.lineWidth = a[2] * 0.08; g.lineCap = "round"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.lineCap = "butt";
}
function drawColdSweep(g, e, k, info) {
  const u = easeOut(k), x = -1 + (info.cols + 2) * u;
  for (const y of e.rows || []) {
    for (let i = 0; i < 6; i++) { const xx = x - i * 0.7, [sx, sy, s] = P(xx, y + 0.5 + Math.sin(i * 2 + y) * 0.3, 0.4 + (i % 3) * 0.3); g.strokeStyle = `rgba(200,240,255,${0.55 * (1 - i / 6) * (1 - k * 0.5)})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - s * 0.6, sy); g.stroke(); }
  }
}

// =================================================================== สภาพอากาศ
let WX_SND = 0;
// บนพื้น: ตาน้ำวนหมุนรอบวิหาร · แถบกระแสเย็น = เกล็ดน้ำแข็งเกาะพื้น + ลูกศรทิศ
export function cityWeatherGround(g, fd, info, now, Z) {
  const w = fd && fd.weather, c = fd && fd.city; if (!w || !c) return;
  const t = now / 1000;
  if (w.kind === "nt_maelstrom" && c.center) {
    const cx = c.center.x, cy = c.center.y;
    for (let j = 0; j < 5; j++) {
      g.strokeStyle = `rgba(150,215,240,${0.18 + j * 0.03})`; g.lineWidth = 1.6; g.beginPath();
      for (let i = 0; i <= 80; i++) { const u = i / 80, r = 5.5 - u * 3.2, a = u * 7 - t * (0.8 + j * 0.1) + j * 1.25, p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 0.04); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.stroke();
    }
  }
  if (w.kind === "nt_cold" && c.cold) {
    for (const y of c.cold) for (let x = 0; x < info.cols; x++) {
      if ((info.terrainKind || {})[K(x, y)]) continue;
      for (let i = 0; i < 3; i++) { const [sx, sy, s] = P(x + 0.2 + ((i * 0.37 + x * 0.13) % 0.6), y + 0.25 + i * 0.25, 0.01); g.strokeStyle = "rgba(210,245,255,.45)"; g.lineWidth = 1; for (let a = 0; a < 3; a++) { const an = a * Math.PI / 3; g.beginPath(); g.moveTo(sx - Math.cos(an) * s * 0.06, sy - Math.sin(an) * s * 0.03); g.lineTo(sx + Math.cos(an) * s * 0.06, sy + Math.sin(an) * s * 0.03); g.stroke(); } }
      const u = (t * 0.6 + x * 0.1) % 1, a = P(x + u, y + 0.5, 0.02), b = P(x + Math.min(1, u + 0.35), y + 0.5, 0.02);
      g.strokeStyle = `rgba(200,240,255,${0.4 * Math.sin(u * Math.PI)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
  }
  void Z;
}
// ในอากาศ: น้ำวนยักษ์ (เกลียวตะกอนหมุนขึ้นเหนือวิหาร เศษหินลอยวน) · น้ำเย็น (โทนฟ้าซีด เกล็ดน้ำแข็งลอยตามกระแส)
export function cityWeather(g, fd, info, now, view) {
  const w = fd && fd.weather, c = fd && fd.city; if (!w) return;
  const t = now / 1000, X0 = view ? view.x0 : 0, W = view ? view.x1 - view.x0 : 1280, Y0 = view ? view.y0 : 0, H = view ? view.y1 - view.y0 : 720;
  if (w.kind === "nt_maelstrom" && c && c.center) {
    if (now - WX_SND > 7000) { WX_SND = now; snd("swirl", 0.5); }
    const cx = c.center.x, cy = c.center.y;
    g.fillStyle = "rgba(4,14,24,.25)"; g.fillRect(X0, Y0, W, H);
    for (let i = 0; i < 90; i++) {
      const u = (i / 90 + t * 0.05) % 1, r = 0.6 + u * 5.5, a = i * 2.39 - t * (2.2 - u * 1.4), z = 0.3 + (1 - u) * 4;
      const [sx, sy, s] = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, z), [qx, qy] = P(cx + Math.cos(a - 0.25) * r, cy + Math.sin(a - 0.25) * r * 0.9, z);
      g.strokeStyle = `rgba(170,215,235,${0.35 * (1 - u * 0.5)})`; g.lineWidth = Math.max(1, s * 0.03); g.beginPath(); g.moveTo(qx, qy); g.lineTo(sx, sy); g.stroke();
      if (i % 9 === 0) { g.fillStyle = shade(STONE, 0.8); g.fillRect(sx - s * 0.04, sy - s * 0.03, s * 0.08, s * 0.06); }
    }
  }
  if (w.kind === "nt_cold") {
    if (now - WX_SND > 8000) { WX_SND = now; snd("l10_cold", 0.4); }
    g.fillStyle = "rgba(120,180,220,.08)"; g.fillRect(X0, Y0, W, H);
    g.fillStyle = "rgba(220,245,255,.55)";
    for (let i = 0; i < 80; i++) { const x = X0 + ((Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * W + t * 40 * (0.6 + (i % 5) * 0.15)) % W, y = Y0 + ((i * 0.6180339) % 1) * H + Math.sin(t + i) * 8; g.fillRect(x, y, 2, 2); }
  }
}

// ============================================================
//  Nautilus ชั้น 6 "ทะเลข้อมูลจินตภาพ" (area 51 · GRID_PLAN §8.9 ชั้น 6) — ภาพทั้งชั้น
//  ผัง server/fodlan/map12.js · กติกา server/fodlan/ntImaginary.js
//  โทนตามภาพอ้างอิงที่ผู้ใช้ส่ง (2026-11-19): ท้องทะเลฟ้าเรืองสว่าง · เส้นตารางลู่ไปขอบฟ้า · ริ้วแสงขาวพาดเฉียง · ของแข็งสีกรมท่าลายรอยร้าวฟ้าเรือง
//   พื้นกระดาน = กระดานโกะของข้อมูล (เส้นผ่ากลางช่อง + จุดดาว) · แท่งข้อมูล = ลูกบาศก์กรมท่าซ้อนลายร้าวเรือง · ช่องว่างจินตภาพ = รูโหว่ที่ข้อมูลร่วงหาย
//   ระลอกข้อมูล = วงคลื่นซ้อน (คู่เดียวกันสีเดียวกัน) · โหนดข้อมูล = เพชรเรือง
//   ไกลๆ: เงาเรือรบข้อมูลสีกรมท่าลายร้าวฟ้าลอยนิ่ง (ออกแบบเอง) · อากาศ: เกล็ดข้อมูลลอยขึ้น · ไม่มีสีแดง
//  รอบ 2 (ผู้ใช้ "เอาทั้งหมด" 2026-11-19): หมากข้อมูล + ฉากล้อมกิน · เขียนทับคุณสมบัติ · รอยพิกเซล/ขอบกระตุก/วงคลื่นใต้เท้าตัวละคร ·
//   ระลอกส่งตัวแบบสลายเป็นพิกเซลแล้วประกอบร่าง · โทนสนามตามคุณสมบัติ · ฝนข้อมูล · รอยตารางบิดตามทางว่ายปลาวาฬ · สนามสว่างกลาง ขอบเรือง คลื่นแสงกวาดพื้น
// ============================================================
import { P, PS, depthOf, glow, rng, sceneSize } from "../boardGeo";
import { hash, mix } from "./reef";
import { fxT, fxOnce } from "./index";
import { drawThalassaAir, drawThalassaGround, whaleView } from "./thalassaArt";
import { SHIP_FX, shipFx, shipItems } from "./shipArt";
import { playSfx, registerSounds } from "../../audio";

const TAU = Math.PI * 2;
const K = (x, y) => `${x},${y}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const kinds = ["fd_nt_datablock", "fd_nt_void", "fd_nt_ripple", "fd_nt_node", "fd_nt_stone", "fd_nt_whale", "fd_nt_ship"];
export const tall = ["fd_nt_datablock"];
export const fogRGB = "4,40,60";
export const fx = { ...SHIP_FX, nt_ripple: 1500, nt_attr: 2200, nt_stone: 700, nt_capture: 1500, nt_rewrite: 1600 };

const CY = "120,240,255"; // ฟ้าเรือง
const RIPPLE_RGB = ["120,240,255", "190,200,255", "150,255,220"]; // สีคู่ระลอก 1–3 (ไม่มีแดง)
// โทนสนามตามคุณสมบัติจินตภาพ (ไม่มีแดง)
const ATTR_TINT = { alpha: "235,250,255", beta: "120,255,200", gamma: "110,170,255", delta: "170,120,240", epsilon: "255,240,170", zeta: "40,130,255" };
let LASTFD = null;
const HULL = [20, 34, 66]; // กรมท่า
const BASE = {
  ground1: "#13708c", ground2: "#0b4f6a", tile: "rgba(0,0,0,0)", tile2: "rgba(0,0,0,0)",
  grid: "rgba(150,245,255,.05)", border: "rgba(160,250,255,.6)", spawn: "rgba(200,250,255,.35)",
  light: ["rgba(140,240,255,.06)", "rgba(0,20,40,.25)"], nightTint: null, shadow: "rgba(0,20,40,.45)",
  sky: ["#22c4d6", "#0d8aa6", "#06395a"], fog: "4,40,60",
};
const PAL = { day: BASE, night: BASE };
const shade = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }

let SND = false;
function snd(k, gain = 1, delay = 0) {
  if (!SND) { SND = true; registerSounds(Object.fromEntries(["ping", "whoosh", "zap", "swirl", "cine_riser", "impact", "crackle", "blast"].map((n) => [`nti_${n}`, `/nautilus/sfx/${n}.mp3`]))); }
  const go = () => playSfx(`nti_${k}`, { gain: gain * 1.6 });
  if (delay > 0) setTimeout(go, delay); else go();
}

// ---------- ข้อมูลผัง ----------
let ZC = null;
function zones(info) {
  if (ZC && ZC.info === info) return ZC;
  const sp = new Map(), tk = info.terrainKind || {};
  for (const s of info.special || []) sp.set(K(s.x, s.y), s.kind);
  const kindAt = (x, y) => tk[K(x, y)] || sp.get(K(x, y)) || null;
  const list = (k) => { const o = []; for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) if (kindAt(x, y) === k) o.push({ x, y }); return o; };
  const heal = (info.heal || []).map((h) => (Array.isArray(h) ? { x: h[0], y: h[1] } : h));
  ZC = { info, kindAt, voids: list("fd_nt_void"), ripples: list("fd_nt_ripple"), nodes: heal };
  return ZC;
}
// สีของระลอก (ตามคู่ที่ server ส่งมา — คู่เดียวกันสีเดียวกัน)
function rippleCol(fd, x, y) {
  const pairs = (fd && fd.imaginary && fd.imaginary.ripples) || [];
  const i = pairs.findIndex((pr) => pr.some((c) => c.x === x && c.y === y));
  return RIPPLE_RGB[(i < 0 ? 0 : i) % RIPPLE_RGB.length];
}

// =================================================================== ธีม (อบ)
export const theme = {
  pal: PAL,
  // ท้องฟ้าข้อมูล: ฟ้าเรืองสว่าง แสงขาวกลาง · ตารางลู่ไปขอบฟ้า · ริ้วแสงโค้ง · เงาเรือรบข้อมูลไกลๆ
  back(c) {
    const { g, C, bY, VX0, VW, VY0 } = c;
    const gr = g.createLinearGradient(0, VY0, 0, bY + 40);
    gr.addColorStop(0, "#0b5a78"); gr.addColorStop(0.45, C.sky[0]); gr.addColorStop(0.8, C.sky[1]); gr.addColorStop(1, C.sky[2]);
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY + 40 - VY0);
    const mid = VX0 + VW / 2;
    g.save(); g.globalCompositeOperation = "lighter";
    // แสงขาวกลาง (แกนของทะเลข้อมูล)
    const cg = g.createRadialGradient(mid, bY - (bY - VY0) * 0.25, 4, mid, bY - (bY - VY0) * 0.25, VW * 0.45);
    cg.addColorStop(0, "rgba(255,255,255,.55)"); cg.addColorStop(0.2, "rgba(190,250,255,.25)"); cg.addColorStop(1, "rgba(120,240,255,0)");
    g.fillStyle = cg; g.fillRect(VX0, VY0, VW, bY - VY0 + 40);
    // ตารางลู่ไปขอบฟ้า (เส้นแนวตั้งรวมจุด + เส้นนอนถี่ขึ้นใกล้ขอบฟ้า)
    const top = VY0 + (bY - VY0) * 0.35;
    g.strokeStyle = "rgba(200,250,255,.16)"; g.lineWidth = 1;
    for (let i = -24; i <= 24; i++) { g.beginPath(); g.moveTo(mid + i * 6, top); g.lineTo(mid + i * VW * 0.09, bY + 40); g.stroke(); }
    for (let j = 1; j < 14; j++) { const y = top + (bY + 40 - top) * Math.pow(j / 14, 2.2); g.beginPath(); g.moveTo(VX0, y); g.lineTo(VX0 + VW, y); g.stroke(); }
    // ริ้วแสงโค้ง (ริบบิ้นข้อมูล)
    const R = rng(612);
    for (let r = 0; r < 5; r++) {
      const y0 = VY0 + (bY - VY0) * (0.1 + R() * 0.6), amp = 20 + R() * 60, ph = R() * TAU, w = 2 + R() * 5;
      g.strokeStyle = `rgba(220,255,255,${0.1 + R() * 0.12})`; g.lineWidth = w; g.beginPath();
      for (let i = 0; i <= 40; i++) { const u = i / 40, x = VX0 + VW * u, y = y0 + Math.sin(u * 5 + ph) * amp * (1 - u * 0.5); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    // ประกายข้อมูลนิ่ง
    for (let i = 0; i < 90; i++) { const x = VX0 + R() * VW, y = VY0 + R() * (bY - VY0), a = 0.15 + R() * 0.4; g.fillStyle = `rgba(230,255,255,${a})`; g.fillRect(x, y, 1.6, 1.6); }
    g.restore();
    // เงาเรือรบข้อมูลไกลๆ (กรมท่า ลายร้าวฟ้า) — ซ้าย 2 ขวา 1
    for (const [ux, uy, sc, fl] of [[0.14, 0.58, 1, 1], [0.3, 0.7, 0.6, 1], [0.84, 0.62, 0.85, -1]]) farShip(g, VX0 + VW * ux, VY0 + (bY - VY0) * uy, (bY - VY0) * 0.16 * sc, fl, ux * 99);
  },
  // พื้นทะเลข้อมูลรอบกระดาน: ตารางเรืองต่อออกไป จางลงตามระยะ
  ground(c) {
    const { g, bY } = c, { cols, rows } = sceneSize();
    for (let d = 20; d >= 0; d--) {
      const e = 0.4 + d * 1.2, pts = [PS(-e, -e), PS(cols + e, -e), PS(cols + e, rows + e * 0.5), PS(-e, rows + e * 0.5)];
      g.fillStyle = mix("#0b4a62", "#04202f", Math.min(1, 0.1 + d / 16)); poly(g, pts); g.fill();
    }
    g.strokeStyle = "rgba(150,245,255,.09)"; g.lineWidth = 1;
    for (let x = -10; x <= cols + 10; x++) { const a = PS(x + 0.5, -10), b = PS(x + 0.5, rows + 6); if (Math.max(a[1], b[1]) < bY) continue; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (let y = -10; y <= rows + 6; y++) { const a = PS(-10, y + 0.5), b = PS(cols + 10, y + 0.5); if (Math.max(a[1], b[1]) < bY) continue; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  },
  // ข้างกระดาน: ลูกบาศก์ข้อมูลลอยค้างเป็นกลุ่ม
  side(c) {
    const { g, VX0, VX1 } = c, { cols, rows } = sceneSize();
    const R = rng(77), list = [];
    for (let i = 0; i < 40; i++) { list.push([-1.5 - R() * 4, R() * rows, R()]); list.push([cols + 0.5 + R() * 4, R() * rows, R()]); }
    for (let i = 0; i < 20; i++) list.push([R() * cols, -1.5 - R() * 3, R()]);
    list.sort((a, b) => depthOf(a[0], a[1]) - depthOf(b[0], b[1])).forEach(([x, y, r]) => {
      const [sx] = PS(x, y); if (sx < VX0 - 100 || sx > VX1 + 100) return;
      const s = 0.25 + r * 0.45, z = 0.3 + r * 1.6;
      cube(g, x, y, s, z, z + s, 0.7 + r * 0.3, false, x * 3 + y);
    });
  },
};
function farShip(g, x, y, s, flip, seed) {
  g.save(); g.translate(x, y); g.scale(flip, 1);
  g.fillStyle = "rgba(14,26,52,.88)";
  g.beginPath(); g.moveTo(-s * 1.6, 0); g.quadraticCurveTo(-s * 1.2, -s * 0.5, 0, -s * 0.55); g.lineTo(s * 0.6, -s * 0.9); g.lineTo(s * 0.9, -s * 0.5); g.quadraticCurveTo(s * 1.7, -s * 0.3, s * 1.9, 0); g.quadraticCurveTo(s, s * 0.35, -s * 1.6, 0); g.fill();
  g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(150,245,255,.5)"; g.lineWidth = Math.max(1, s * 0.03);
  const R = rng(seed);
  for (let i = 0; i < 7; i++) { let px = -s * 1.3 + R() * s * 2.8, py = -s * 0.1 - R() * s * 0.3; g.beginPath(); g.moveTo(px, py); for (let j = 0; j < 4; j++) { px += (R() - 0.3) * s * 0.35; py += (R() - 0.5) * s * 0.16; g.lineTo(px, py); } g.stroke(); }
  g.restore();
}
// ลูกบาศก์กรมท่าลายร้าวเรือง (ใช้กับแท่งข้อมูล/ของข้างกระดาน)
function cube(g, x, y, s, z0, z1, k, cracks, seed) {
  const x0 = x + 0.5 - s / 2, x1 = x + 0.5 + s / 2, y0 = y + 0.5 - s / 2, y1 = y + 0.5 + s / 2;
  const faces = [
    [[x0, y1], [x1, y1]], [[x1, y1], [x1, y0]], [[x0, y0], [x0, y1]], [[x1, y0], [x0, y0]],
  ].map(([a, b]) => ({ a, b, d: depthOf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) })).sort((p, q) => p.d - q.d);
  for (const f of faces) {
    const pts = [P(f.a[0], f.a[1], z0), P(f.b[0], f.b[1], z0), P(f.b[0], f.b[1], z1), P(f.a[0], f.a[1], z1)];
    poly(g, pts); g.fillStyle = shade(HULL, k * (f.a[1] === f.b[1] ? 1.05 : 0.8)); g.fill();
  }
  const top = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
  poly(g, top); g.fillStyle = shade(HULL, k * 1.35); g.fill();
  g.strokeStyle = `rgba(${CY},.55)`; g.lineWidth = 1; g.stroke();
  if (!cracks) return;
  const R = rng(seed);
  g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${CY},.75)`; g.lineWidth = 1.3;
  for (let i = 0; i < 3; i++) {
    let u = R(), v = R(), z = z0 + (z1 - z0) * R(); const side = R() < 0.5;
    g.beginPath(); let p = side ? P(x0 + u * s, y1, z) : P(x0 + u * s, y0 + v * s, z1); g.moveTo(p[0], p[1]);
    for (let j = 0; j < 4; j++) { u = clamp(u + (R() - 0.5) * 0.4, 0, 1); v = clamp(v + (R() - 0.5) * 0.4, 0, 1); z = clamp(z + (R() - 0.5) * 0.3, z0, z1); p = side ? P(x0 + u * s, y1, z) : P(x0 + u * s, y0 + v * s, z1); g.lineTo(p[0], p[1]); }
    g.stroke();
  }
  g.restore();
}

// =================================================================== สิ่งกีดขวาง
export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t;
  if (kind === "fd_nt_whale" || kind === "fd_nt_ship") return;
  if (kind === "fd_nt_datablock") {
    const h = 0.9 + hash(x, y) * 0.8, bob = Math.sin(now / 900 + x + y) * 0.04;
    cube(g, x, y, 0.84, 0, h + bob, 1, true, x * 31 + y * 7);
    // ลูกบาศก์เล็กลอยเหนือ
    if (hash(y, x) < 0.55) cube(g, x, y, 0.36, h + 0.25 + bob * 2, h + 0.61 + bob * 2, 1.1, false, 0);
  } else if (kind === "fd_nt_void") voidTile(g, x, y, now);
  else if (kind === "fd_nt_stone") stone(g, x, y, now);
}
// หมากข้อมูล: หมากโกะกรมท่าเงาวาว ขอบฟ้าเรือง · หมากที่จะหมดเทิร์นนี้กะพริบ
function stone(g, x, y, now) {
  const t = now / 1000, cx = x + 0.5, cy = y + 0.5, info = LASTFD && LASTFD.imaginary, rec = info && (info.stones || []).find((q) => q.x === x && q.y === y);
  const dropE = (LASTFD && LASTFD.fx || []).find((e) => e.kind === "nt_stone" && e.x === x && e.y === y);
  const dk = dropE ? fxT(dropE, now, fx.nt_stone) : 1, z = (1 - Math.min(1, dk / 0.6)) * 2.2;
  const blink = rec && info && Number(rec.until) <= Number(info.round || 0) ? 0.55 + 0.45 * Math.sin(t * 8) : 1;
  const [sx, sy, s] = P(cx, cy, 0.02);
  g.fillStyle = "rgba(0,20,35,.45)"; g.beginPath(); g.ellipse(sx, sy, s * 0.38, s * 0.16, 0, 0, TAU); g.fill();
  const [bx, by, bs] = P(cx, cy, 0.14 + z), rx = bs * 0.36, ry = bs * 0.2;
  g.globalAlpha = blink;
  const gr = g.createRadialGradient(bx - rx * 0.3, by - ry * 0.6, 0, bx, by, rx * 1.1); gr.addColorStop(0, "#5f86b8"); gr.addColorStop(0.35, "#1c2c52"); gr.addColorStop(1, "#070e22");
  g.fillStyle = gr; g.beginPath(); g.ellipse(bx, by, rx, ry * 1.35, 0, 0, TAU); g.fill();
  g.save(); g.globalCompositeOperation = "lighter";
  g.strokeStyle = `rgba(${CY},${0.85 * blink})`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(bx, by, rx, ry * 1.35, 0, 0, TAU); g.stroke();
  glow(g, bx, by, bs * 0.55, CY, 0.25 * blink);
  g.fillStyle = "rgba(230,255,255,.7)"; g.beginPath(); g.ellipse(bx - rx * 0.35, by - ry * 0.55, rx * 0.22, ry * 0.25, -0.4, 0, TAU); g.fill();
  g.restore();
  g.globalAlpha = 1;
  if (dropE && dk < 1 && dk > 0.5) { const u = (dk - 0.5) / 0.5; g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${CY},${1 - u})`; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 32; i++) { const a = (i / 32) * TAU, p = P(cx + Math.cos(a) * (0.3 + u * 0.8), cy + Math.sin(a) * (0.3 + u * 0.8), 0.02); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke(); g.restore(); }
}
function voidTile(g, x, y, now) {
  const t = now / 1000, a = P(x, y, 0), b = P(x + 1, y, 0), c = P(x + 1, y + 1, 0), d = P(x, y + 1, 0);
  poly(g, [a, b, c, d]); g.fillStyle = "#010a14"; g.fill();
  g.save(); g.clip();
  // ข้อมูลร่วงลงในรู
  for (let i = 0; i < 6; i++) {
    const u = hash(x * 7 + i, y), k = ((t * 0.5 + hash(i, x + y)) % 1), p = P(x + 0.15 + u * 0.7, y + 0.2 + k * 0.6, -k * 0.8);
    g.fillStyle = `rgba(${CY},${0.6 * (1 - k)})`; g.fillRect(p[0], p[1], p[2] * 0.05, p[2] * 0.05);
  }
  g.restore();
  g.save(); g.globalCompositeOperation = "lighter"; poly(g, [a, b, c, d]); g.strokeStyle = `rgba(${CY},${0.45 + 0.2 * Math.sin(t * 2 + x)})`; g.lineWidth = 1.5; g.stroke(); g.restore();
}

// =================================================================== ของที่เรียงความลึกกับตัวละคร
export function items(list, g, fd, info, units, now, lowQ) {
  LASTFD = fd;
  shipItems(list, g, fd, info, now, lowQ);
  void units;
}

// =================================================================== พื้นทุกเฟรม (ใต้ตัวละคร)
export function ground(g, fd, info, now, lowQ) {
  LASTFD = fd;
  const Z = zones(info), t = now / 1000, cols = info.cols, rows = info.rows;
  const attr = fd && fd.imaginary && fd.imaginary.attr, tint = ATTR_TINT[attr] || CY;
  g.save(); g.globalCompositeOperation = "lighter";
  // แสงกลางสนาม + โทนตามคุณสมบัติ (เปลี่ยนนุ่มๆ)
  { const [cx, cy, s] = P(cols / 2, rows / 2, 0); glow(g, cx, cy, s * Math.max(cols, rows) * 0.55, tint, 0.16 + 0.03 * Math.sin(t * 0.8)); }
  // ขอบสนามเรือง (เส้นคู่ + จุดวิ่งรอบ)
  { const pts = [[0, 0], [cols, 0], [cols, rows], [0, rows]].map(([x, y]) => P(x, y, 0.01));
    g.strokeStyle = `rgba(${tint},.55)`; g.lineWidth = 2.2; poly(g, pts); g.stroke();
    const inner = [[-0.25, -0.25], [cols + 0.25, -0.25], [cols + 0.25, rows + 0.25], [-0.25, rows + 0.25]].map(([x, y]) => P(x, y, 0.01));
    g.strokeStyle = `rgba(${tint},.18)`; g.lineWidth = 1; poly(g, inner); g.stroke();
    const per = 2 * (cols + rows);
    for (let i = 0; i < 4; i++) { let d = ((t * 3 + i * per / 4) % per); let x, y; if (d < cols) { x = d; y = 0; } else if ((d -= cols) < rows) { x = cols; y = d; } else if ((d -= rows) < cols) { x = cols - d; y = rows; } else { d -= cols; x = 0; y = rows - d; } const [px, py, ps] = P(x, y, 0.02); glow(g, px, py, ps * 0.5, "230,255,255", 0.7); } }
  // คลื่นแสงกวาดพื้นเฉียงช้าๆ
  if (!lowQ) for (let i = 0; i < 2; i++) {
    const k = ((t * 0.07 + i * 0.5) % 1) * (cols + rows) - rows;
    const a = P(k, 0, 0.004), b = P(k + 1.2, 0, 0.004), c = P(k + 1.2 + rows, rows, 0.004), d = P(k + rows, rows, 0.004);
    g.save(); g.beginPath(); g.moveTo(...P(0, 0, 0).slice(0, 2)); g.lineTo(...P(cols, 0, 0).slice(0, 2)); g.lineTo(...P(cols, rows, 0).slice(0, 2)); g.lineTo(...P(0, rows, 0).slice(0, 2)); g.closePath(); g.clip();
    g.fillStyle = `rgba(${tint},.06)`; poly(g, [a, b, c, d]); g.fill(); g.restore();
  }
  // วงคลื่นตารางใต้เท้า (บันทึกจาก air ตอนตัวละครขยับ)
  for (let i = STEPS.length - 1; i >= 0; i--) {
    const st = STEPS[i], k = (now - st.t) / 900; if (k >= 1 || k < 0) { if (k >= 1) STEPS.splice(i, 1); continue; }
    g.strokeStyle = `rgba(${tint},${0.7 * (1 - k)})`; g.lineWidth = 1.4;
    const r = 0.15 + k * 0.6, q = [[-r, -r], [r, -r], [r, r], [-r, r]].map(([dx, dy]) => P(st.x + dx, st.y + dy, 0.01)); poly(g, q); g.stroke();
  }
  // รอยตารางบิดตามทางว่ายของปลาวาฬ (จุดหลังลำตัว)
  { const wv = whaleView(); if (fd && fd.whale && fd.whale.on && wv && wv.alpha > 0.2) {
    WAKE.push({ x: wv.x, y: wv.y, t: now }); while (WAKE.length > 40) WAKE.shift();
    for (const w of WAKE) { const k = (now - w.t) / 2600; if (k >= 1) continue; const r = 0.6 + k * 1.6; g.strokeStyle = `rgba(${CY},${0.22 * (1 - k)})`; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU, rr = r * (1 + 0.15 * Math.sin(a * 4 + t * 3)), p = P(w.x + Math.cos(a) * rr, w.y + Math.sin(a) * rr, 0.01); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke(); }
  } }
  // กระดานโกะ: เส้นผ่ากลางช่อง + ชีพจรข้อมูลวิ่งตามเส้น
  g.strokeStyle = `rgba(${CY},.22)`; g.lineWidth = 1;
  for (let x = 0; x < cols; x++) { const a = P(x + 0.5, 0.5, 0.005), b = P(x + 0.5, rows - 0.5, 0.005); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  for (let y = 0; y < rows; y++) { const a = P(0.5, y + 0.5, 0.005), b = P(cols - 0.5, y + 0.5, 0.005); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  // จุดดาว
  for (const [hx, hy] of [[3, 3], [cols - 4, 3], [3, rows - 4], [cols - 4, rows - 4], [Math.floor(cols / 2), Math.floor(rows / 2)], [Math.floor(cols / 2), 3], [Math.floor(cols / 2), rows - 4]]) {
    const [sx, sy, s] = P(hx + 0.5, hy + 0.5, 0.01); g.fillStyle = `rgba(${CY},.7)`; g.beginPath(); g.arc(sx, sy, s * 0.07, 0, TAU); g.fill();
  }
  if (!lowQ) for (let i = 0; i < 10; i++) {
    const horiz = i % 2 === 0, lane = Math.floor(hash(i, 3) * (horiz ? rows : cols)), k = (t * (0.12 + hash(i, 5) * 0.1) + hash(i, 9)) % 1;
    const p = horiz ? P(0.5 + k * (cols - 1), lane + 0.5, 0.01) : P(lane + 0.5, 0.5 + k * (rows - 1), 0.01);
    glow(g, p[0], p[1], p[2] * 0.4, "200,255,255", 0.35);
  }
  // ระลอกข้อมูล: วงซ้อนขยายออก
  for (const r of Z.ripples) {
    const col = rippleCol(fd, r.x, r.y), [sx, sy, s] = P(r.x + 0.5, r.y + 0.5, 0.02);
    glow(g, sx, sy, s * 0.8, col, 0.3);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.6 + i / 3) % 1;
      g.strokeStyle = `rgba(${col},${0.8 * (1 - k)})`; g.lineWidth = 1.6; g.beginPath();
      for (let j = 0; j <= 32; j++) { const a = (j / 32) * TAU, p = P(r.x + 0.5 + Math.cos(a) * (0.1 + k * 0.45), r.y + 0.5 + Math.sin(a) * (0.1 + k * 0.45), 0.02); j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.stroke();
    }
  }
  // โหนดข้อมูล: เพชรเรือง
  for (const n of Z.nodes) {
    const [sx, sy, s] = P(n.x + 0.5, n.y + 0.5, 0.25 + 0.06 * Math.sin(t * 2 + n.x)), r = s * 0.16;
    glow(g, sx, sy, s * 0.7, "180,255,240", 0.35);
    g.fillStyle = "rgba(200,255,245,.85)"; g.beginPath(); g.moveTo(sx, sy - r * 1.4); g.lineTo(sx + r, sy); g.lineTo(sx, sy + r * 1.4); g.lineTo(sx - r, sy); g.closePath(); g.fill();
  }
  g.restore();
  drawThalassaGround(g, fd, info, now);
}

// =================================================================== ทับตัวละคร
const STEPS = [], WAKE = [], UNIT_LAST = new Map(), TRAIL = [];
const ATTR_SYM = { alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ" };
export function air(g, fd, info, units, now, lowQ, view) {
  const t = now / 1000;
  const X0 = view ? view.x0 : 0, W = view ? view.x1 - view.x0 : 1280, Y0 = view ? view.y0 : 0, H = view ? view.y1 - view.y0 : 720;
  // เกล็ดข้อมูลลอยขึ้น + ริ้วแสงเฉียง
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 70; i++) {
      const x = X0 + ((hash(i, 1) * W + Math.sin(t * 0.4 + i) * 10) % W), y = Y0 + H - ((hash(i, 2) * H + t * (12 + hash(i, 3) * 18)) % H), r = 1.2 + hash(i, 4) * 2.4;
      g.fillStyle = `rgba(210,255,255,${0.25 + 0.3 * hash(i, 6)})`; g.fillRect(x, y, r, r);
    }
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.05 + i / 3) % 1), x = X0 + W * (k * 1.4 - 0.2);
      const gr = g.createLinearGradient(x - 60, Y0, x + 60, Y0); gr.addColorStop(0, "rgba(220,255,255,0)"); gr.addColorStop(0.5, "rgba(220,255,255,.07)"); gr.addColorStop(1, "rgba(220,255,255,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - 60, Y0); g.lineTo(x + 60, Y0); g.lineTo(x + 60 - H * 0.4, Y0 + H); g.lineTo(x - 60 - H * 0.4, Y0 + H); g.closePath(); g.fill();
    }
    g.restore();
  }
  const attr = fd && fd.imaginary && fd.imaginary.attr, tint = ATTR_TINT[attr] || CY;
  // ฝนข้อมูล: สายอักขระสั้นๆ ร่วงลงเป็นเส้น
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const x = X0 + hash(i, 21) * W, sp = 90 + hash(i, 22) * 160, len = 40 + hash(i, 23) * 90, y = Y0 + ((t * sp + hash(i, 24) * (H + len)) % (H + len)) - len;
      for (let j = 0; j < 6; j++) { const yy = y + j * (len / 6); g.fillStyle = `rgba(${tint},${(0.05 + j * 0.05) * (0.6 + 0.4 * hash(i, j))})`; g.fillRect(x, yy, 2, len / 9); }
    }
    g.restore();
  }
  // ตัวละคร: วงคลื่นใต้เท้าเมื่อก้าว · รอยพิกเซลตามหลัง · ขอบตัวกระตุกเป็นข้อมูลเป็นจังหวะ
  for (const u of units || []) {
    if (!u || u.alive === false) continue;
    const ux = (u.rx ?? u.x) + 0.5, uy = (u.ry ?? u.y) + 0.5, last = UNIT_LAST.get(u.id);
    if (last) {
      const d = Math.hypot(ux - last.x, uy - last.y);
      if (d > 0.02 && !lowQ) TRAIL.push({ x: ux, y: uy, t: now, r: Math.random() });
      if (Math.hypot(ux - last.sx, uy - last.sy) > 0.55) { STEPS.push({ x: ux, y: uy, t: now }); last.sx = ux; last.sy = uy; }
      last.x = ux; last.y = uy;
    } else UNIT_LAST.set(u.id, { x: ux, y: uy, sx: ux, sy: uy });
    const slot = Math.floor(t * 0.7 + hash(String(u.id).length, 3) * 5), ph = (t * 0.7 + hash(String(u.id).length, 3) * 5) - slot;
    if (!lowQ && hash(slot, String(u.id).charCodeAt(0) || 1) < 0.35 && ph < 0.12) {
      const [bx, by, bs] = P(ux, uy, 0), [, ty] = P(ux, uy, 1.5);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) { const yy = ty + (by - ty) * hash(slot, i + 9), off = (hash(slot, i + 19) - 0.5) * bs * 0.5; g.fillStyle = `rgba(${tint},.5)`; g.fillRect(bx - bs * 0.35 + off, yy, bs * 0.7, 2 + hash(i, slot) * 3); }
      g.restore();
    }
  }
  if (TRAIL.length > 260) TRAIL.splice(0, TRAIL.length - 260);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = TRAIL.length - 1; i >= 0; i--) {
    const p = TRAIL[i], k = (now - p.t) / 700; if (k >= 1) { TRAIL.splice(i, 1); continue; }
    const [sx, sy, s] = P(p.x + (p.r - 0.5) * 0.4, p.y, 0.3 + p.r * 0.9 + k * 0.4), sz = s * (0.05 + p.r * 0.04);
    g.fillStyle = `rgba(${p.r < 0.5 ? tint : "230,255,255"},${0.6 * (1 - k)})`; g.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
  }
  g.restore();
  // เหตุการณ์ของชั้น
  for (const e of (fd && fd.fx) || []) {
    if (!["nt_ripple", "nt_attr", "nt_stone", "nt_capture", "nt_rewrite"].includes(e.kind)) continue;
    const k = fxT(e, now, fx[e.kind]);
    if (fxOnce(e)) {
      if (e.kind === "nt_ripple") { snd("swirl", 0.7); snd("ping", 0.6, 500); }
      else if (e.kind === "nt_attr") { snd("cine_riser", 0.5); snd("zap", 0.5, 500); }
      else if (e.kind === "nt_stone") snd("impact", 0.6, 380);
      else if (e.kind === "nt_capture") { snd("crackle", 0.8); snd("blast", 0.7, 600); }
      else if (e.kind === "nt_rewrite") { snd("ping", 0.7); snd("zap", 0.5, 300); }
    }
    if (k >= 1) continue;
    if (e.kind === "nt_ripple") warp(g, e, k, fd, units);
    else if (e.kind === "nt_attr") attrFlash(g, e, k, X0, Y0, W, H);
    else if (e.kind === "nt_capture") capture(g, e, k);
    else if (e.kind === "nt_rewrite") rewriteFx(g, fd, e, k);
  }
  // ขอบจอติดสีตามคุณสมบัติ
  { const vg = g.createRadialGradient(X0 + W / 2, Y0 + H / 2, Math.min(W, H) * 0.35, X0 + W / 2, Y0 + H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, `rgba(${tint},0)`); vg.addColorStop(1, `rgba(${tint},.10)`);
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = vg; g.fillRect(X0, Y0, W, H); g.restore(); }
  shipFx(g, fd, info, now);
}
// ส่งข้ามสนาม: ร่างสลายเป็นพิกเซลที่วงต้นทาง → ธารพิกเซลโค้งข้ามสนาม → ประกอบร่างที่ปลายทาง (+ เสาแสง)
function warp(g, e, k, fd) {
  if (e.from && e.to) {
    const col0 = rippleCol(fd, e.from.x, e.from.y);
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 40; i++) {
      const r1 = hash(i, 31), r2 = hash(i, 32), delay = r1 * 0.25, u = clamp((k - 0.1 - delay) / 0.55, 0, 1);
      if (u <= 0 || u >= 1) continue;
      const fx0 = e.from.x + 0.5 + (r1 - 0.5) * 0.5, fy0 = e.from.y + 0.5 + (r2 - 0.5) * 0.5, z0 = 0.2 + r2 * 1.3;
      const x = fx0 + (e.to.x + 0.5 - fx0) * u, y = fy0 + (e.to.y + 0.5 - fy0) * u, z = z0 + Math.sin(u * Math.PI) * (2.5 + r1 * 1.5);
      const [sx, sy, s] = P(x, y, z), sz = s * (0.05 + r2 * 0.05);
      g.fillStyle = `rgba(${i % 3 ? col0 : "240,255,255"},${0.9 * Math.sin(u * Math.PI)})`; g.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
    }
    g.restore();
  }
  if (!e.from || !e.to) return;
  const col = rippleCol(fd, e.from.x, e.from.y);
  g.save(); g.globalCompositeOperation = "lighter";
  for (const [c, kk] of [[e.from, clamp(1 - k * 2, 0, 1)], [e.to, clamp(k * 2 - 0.6, 0, 1)]]) {
    if (kk <= 0) continue;
    const a = P(c.x + 0.5, c.y + 0.5, 0), b = P(c.x + 0.5, c.y + 0.5, 3);
    const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]); gr.addColorStop(0, `rgba(${col},${0.8 * kk})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(a[0] - a[2] * 0.3, b[1], a[2] * 0.6, a[1] - b[1]);
    glow(g, a[0], a[1], a[2] * 1.2, col, 0.6 * kk);
  }
  if (k > 0.2 && k < 0.8) {
    const u = (k - 0.2) / 0.6;
    g.strokeStyle = `rgba(${col},.85)`; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 24; i++) { const v = Math.min(u, i / 24), p = P(e.from.x + 0.5 + (e.to.x - e.from.x) * v, e.from.y + 0.5 + (e.to.y - e.from.y) * v, 0.5 + Math.sin(v * Math.PI) * 3); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.stroke();
  }
  g.restore();
}
// คุณสมบัติจินตภาพเปลี่ยน: อักษรกรีกใหญ่วาบกลางจอแล้วจาง (สัญลักษณ์ ไม่ใช่ข้อความอธิบาย)
function attrFlash(g, e, k, X0, Y0, W, H) {
  const sym = e.sym || ATTR_SYM[e.attr] || "?", a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.5) / 0.5);
  const cx = X0 + W / 2, cy = Y0 + H * 0.42, s = Math.min(W, H) * (0.22 + k * 0.06);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, cx, cy, s * 1.1, CY, 0.35 * a);
  g.font = `700 ${Math.round(s)}px "Times New Roman", serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = `rgba(230,255,255,${0.85 * a})`; g.fillText(sym, cx, cy);
  g.strokeStyle = `rgba(${CY},${0.6 * a})`; g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const r = s * (0.6 + k * 0.9 + i * 0.12); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); }
  g.restore();
}
// ล้อมกิน: เส้นแสง 4 ทิศพุ่งเข้าหาเป้า → กรงสี่เหลี่ยมบีบ → แตกเป็นพิกเซล
function capture(g, e, k) {
  const cx = e.x + 0.5, cy = e.y + 0.5;
  g.save(); g.globalCompositeOperation = "lighter";
  const u = clamp(k / 0.35, 0, 1);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = P(cx + dx * 1.5, cy + dy * 1.5, 0.4), b = P(cx + dx * 1.5 * (1 - u), cy + dy * 1.5 * (1 - u), 0.4);
    g.strokeStyle = `rgba(${CY},${0.9 * (1 - clamp((k - 0.5) / 0.3, 0, 1))})`; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  if (k > 0.3 && k < 0.65) {
    const v = (k - 0.3) / 0.35, r = 0.75 - v * 0.35;
    for (const z of [0.05, 1.4]) { g.strokeStyle = `rgba(230,255,255,${0.9})`; g.lineWidth = 2; poly(g, [[-r, -r], [r, -r], [r, r], [-r, r]].map(([dx, dy]) => P(cx + dx, cy + dy, z))); g.stroke(); }
    for (const [dx, dy] of [[-r, -r], [r, -r], [r, r], [-r, r]]) { const a = P(cx + dx, cy + dy, 0.05), b = P(cx + dx, cy + dy, 1.4); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  }
  if (k > 0.6) {
    const v = (k - 0.6) / 0.4;
    for (let i = 0; i < 30; i++) { const a = hash(i, 41) * TAU, d = v * (0.5 + hash(i, 42) * 1.4), [sx, sy, s] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.7 + hash(i, 43) * 0.8 - v * 0.6), sz = s * 0.07; g.fillStyle = `rgba(${i % 2 ? CY : "240,255,255"},${1 - v})`; g.fillRect(sx - sz / 2, sy - sz / 2, sz, sz); }
    if (v < 0.25) { const [sx, sy, s] = P(cx, cy, 0.7); glow(g, sx, sy, s * 1.6, "240,255,255", 0.8 * (1 - v * 4)); }
  }
  g.restore();
}
// เขียนทับคุณสมบัติ: อักษรกรีกลอยขึ้นจากเรือเป็นเสาข้อมูล
function rewriteFx(g, fd, e, k) {
  const sh = fd && fd.ship; if (!sh) return;
  const cx = sh.x + sh.w / 2, cy = sh.y + sh.h / 2, [bx, by, s] = P(cx, cy, 1.2 + k * 3), a = Math.sin(Math.min(1, k * 1.2) * Math.PI);
  g.save(); g.globalCompositeOperation = "lighter";
  const [gx, gy] = P(cx, cy, 0.6); const gr = g.createLinearGradient(gx, gy, bx, by - s); gr.addColorStop(0, `rgba(${CY},${0.5 * a})`); gr.addColorStop(1, `rgba(${CY},0)`);
  g.fillStyle = gr; g.fillRect(gx - s * 0.3, by - s, s * 0.6, gy - by + s);
  glow(g, bx, by, s * 1.2, CY, 0.5 * a);
  g.font = `700 ${Math.round(s * 1.1)}px "Times New Roman", serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = `rgba(240,255,255,${a})`; g.fillText(e.sym || ATTR_SYM[e.attr] || "", bx, by);
  g.restore();
}
export function bakeSpecial() {}
export function animSpecial() {}
export const airTop = drawThalassaAir;

// ============================================================
//  Nautilus ชั้น 3 "ปล่องภูเขาไฟใต้ทะเล" −1,000 ม. (area 48 · GRID_PLAN §8.9) — ภาพทั้งชั้น (ภูมิประเทศจริง ไม่ใช่ของซ้ำวางกระจาย · ชั้นแรกที่มืด)
//  ผัง server/fodlan/map9.js — โซนภูมิศาสตร์:
//   ตะวันตกเฉียงเหนือ = ที่ราบบะซอลต์เย็น (พื้นเทาอมฟ้า ลายรอยต่อหกเหลี่ยม · เสาบะซอลต์หกเหลี่ยมสูง)
//   ตะวันออกเฉียงเหนือ = ทุ่งปล่องควันดำ (ปล่องแร่สูงพ่นควันดำไม่หยุด · แผ่นแบคทีเรียขาวเหลือง · หนอนท่อพู่แดง · ปูขาว)
//   กลาง = แอ่งปากปล่อง: ทะเลสาบลาวา (แผ่นเปลือกดำลอยบนลาวาเรือง ปุดเป็นฟอง) + รอยแยกลาวาแผ่เป็นแฉกเรืองเป็นจังหวะ
//   ตะวันตก = สันลาวาหมอน (ก้อนกลมมันวาวซ้อนกัน) · ตะวันตกเฉียงใต้ = ลาดเถ้า (เถ้าเทานุ่ม ลายลม เถ้าฟุ้ง)
//   ใต้ = รอยแยกใหญ่ลากออกขอบกระดาน · ตะวันออกเฉียงใต้ = หลุมยุบ (ขั้นบันไดหินดิ่งสู่ความมืด มีแสงแดงลึกๆ)
//  ยิ่งลึกยิ่งมืด: แสงหลักมาจากลาวา/ปล่อง (ส้มแดง) · น้ำรอบๆ ดำเกือบสนิท · หิมะทะเลลอยตกช้าๆ
//  ของที่ขยับ: ควันปล่อง ลาวา รอยแยก หนอนท่อ ปูขาว ปล่องแรงดัน หินลาวา (items/ground/air) · ลูกเล่น + ฉาก ./ventsFx.js
// ============================================================
import { P, PS, depthOf, glow, rng, sceneSize } from "../boardGeo";
import { blobAt, hash, mix, nearDist } from "./reef";
import { drawThalassaAir, drawThalassaGround } from "./thalassaArt";
import { shipFx, shipItems } from "./shipArt";
import { VENTS_FX, ventsFx, ventsItems, ventH } from "./ventsFx";

const TAU = Math.PI * 2;
const K = (x, y) => `${x},${y}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const kinds = ["fd_nt_vent", "fd_nt_column", "fd_nt_pillow", "fd_nt_lava", "fd_nt_pit", "fd_nt_crack", "fd_nt_lavarock", "fd_nt_fissure", "fd_nt_tubeworm", "fd_nt_ash", "fd_nt_pvent", "fd_nt_whale", "fd_nt_ship"];
export const tall = ["fd_nt_vent", "fd_nt_column"];
export const fogRGB = "7,5,6";
export const fx = VENTS_FX;

// ---------- สี (−1,000 ม.: ไม่มีแสงแดด · ทุกอย่างดำอมน้ำตาล · แสงส้มจากลาวา) ----------
const BASE = {
  ground1: "#1a1412", ground2: "#050304", tile: "rgba(0,0,0,0)", tile2: "rgba(0,0,0,0)",
  grid: "rgba(255,170,120,.06)", border: "rgba(255,140,80,.3)", spawn: "rgba(255,210,170,.3)",
  light: ["rgba(255,120,60,.04)", "rgba(0,0,0,.5)"], nightTint: null, shadow: "rgba(0,0,0,.55)",
  sky: ["#0c171c", "#06090c", "#020203"], fog: "7,5,6",
  basalt: "#1a1514", basalt2: "#221c1a", cold: "#1f2427", cold2: "#283034", ash: "#33302d", ash2: "#3d3935",
  crust: "#140b09", caldera: "#2a1612", mat: "#bdb592", sulfur: "#c9b24a", rust: "#7a4526", pillow: ["#2a2220", "#1a1514", "#3b302b"],
  rock: ["#4a4442", "#2f2a29", "#191515"], colTop: "#55606a", colSide: ["#2c3439", "#1d2327", "#3a444b"],
};
const PAL = { day: BASE, night: { ...BASE, sky: ["#080f13", "#040608", "#010102"] } };

// ---------- ข้อมูลผัง ----------
let ZCACHE = null;
function zones(info) {
  if (ZCACHE && ZCACHE.info === info) return ZCACHE;
  const sp = new Map(), tk = info.terrainKind || {};
  for (const s of info.special || []) sp.set(K(s.x, s.y), s.kind);
  const kindAt = (x, y) => tk[K(x, y)] || sp.get(K(x, y)) || null;
  const list = (k) => { const out = []; for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) if (kindAt(x, y) === k) out.push({ x, y }); return out; };
  const z = { info, kindAt, vent: list("fd_nt_vent"), column: list("fd_nt_column"), pillow: list("fd_nt_pillow"), lava: list("fd_nt_lava"), pit: list("fd_nt_pit"), fissure: list("fd_nt_fissure"), worm: list("fd_nt_tubeworm"), ash: list("fd_nt_ash"), pvent: list("fd_nt_pvent") };
  // รอยแยก: เส้นเชื่อมระหว่างช่องรอยแยก/ลาวาที่ติดกัน (8 ทิศ) — วาดเป็นแฉกต่อเนื่อง ไม่ใช่ลายในช่องเดียว
  const hot = new Set([...z.fissure, ...z.lava].map((t) => K(t.x, t.y)));
  z.links = [];
  for (const f of z.fissure) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const k = K(f.x + dx, f.y + dy), lv = z.lava.some((l) => l.x === f.x + dx && l.y === f.y + dy); if (hot.has(k)) z.links.push([f.x + 0.5, f.y + 0.5, f.x + dx * (lv ? 0.5 : 1) + 0.5, f.y + dy * (lv ? 0.5 : 1) + 0.5, f.x * 13 + f.y * 7 + dx * 3 + dy]); }
  for (const f of z.fissure) for (const [dx, dy] of [[-1, 0], [0, -1], [-1, -1], [-1, 1]]) { const k = K(f.x + dx, f.y + dy); if (hot.has(k) && z.lava.some((l) => l.x === f.x + dx && l.y === f.y + dy)) z.links.push([f.x + 0.5, f.y + 0.5, f.x + dx * 0.5 + 0.5, f.y + dy * 0.5 + 0.5, f.x * 5 + f.y * 11 + dx]); }
  // ปลายรอยแยกที่ขอบกระดาน → ต่อออกนอกกระดาน (รอยแยกใหญ่ไม่จบกลางพื้น)
  for (const f of z.fissure) if (f.y === info.rows - 1) z.links.push([f.x + 0.5, f.y + 0.5, f.x + 0.3, f.y + 2.5, 99]);
  const lc = z.lava.reduce((a, t) => [a[0] + t.x + 0.5, a[1] + t.y + 0.5], [0, 0]);
  z.lavaC = z.lava.length ? { x: lc[0] / z.lava.length, y: lc[1] / z.lava.length } : { x: info.cols / 2, y: info.rows / 2 };
  const pc = z.pit.reduce((a, t) => [a[0] + t.x + 0.5, a[1] + t.y + 0.5], [0, 0]);
  z.pitC = z.pit.length ? { x: pc[0] / z.pit.length, y: pc[1] / z.pit.length, r: Math.sqrt(z.pit.length / Math.PI) + 0.25 } : null;
  ZCACHE = z;
  return z;
}
// เส้นหยัก (รอยแยก) จาก a → b บนพื้น
function jag(g, x0, y0, x1, y1, seed, z = 0.01, amp = 0.16, n = 6) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = i / n, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1, w = i === 0 || i === n ? 0 : (hash(seed, i) - 0.5) * 2 * amp;
    const p = P(x0 + (x1 - x0) * u + (nx / L) * w, y0 + (y1 - y0) * u + (ny / L) * w, z);
    i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
  }
}
const polyFill = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); };

// =================================================================== ธีม (อบ)
export const theme = {
  pal: PAL,
  // น้ำลึกดำ → ขอบฟ้าแดงหม่น (แสงภูเขาไฟไกลๆ) · กรวยภูเขาไฟใต้ทะเลไกล 3 ชั้นมียอดเรืองส้ม + ควันดำพวยพุ่ง
  back(c) {
    const { g, C, bY, VX0, VW, VY0 } = c;
    const gr = g.createLinearGradient(0, VY0, 0, bY + 40);
    gr.addColorStop(0, C.sky[2]); gr.addColorStop(0.5, C.sky[1]); gr.addColorStop(0.85, "#1a0c08"); gr.addColorStop(1, "#2a1008");
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY + 40 - VY0);
    const cone = (y0, amp, col, seed, glowA) => {
      const peaks = [];
      g.fillStyle = col; g.beginPath(); g.moveTo(VX0, bY + 30);
      for (let x = 0; x <= VW; x += 12) {
        const u = x / VW, h = Math.sin(u * 5 + seed) * 0.45 + Math.sin(u * 13 + seed * 2) * 0.25 + Math.sin(u * 37 + seed) * 0.08;
        const pk = Math.max(0, 1 - Math.abs(((u * 3 + seed * 0.37) % 1) - 0.5) * 4); // กรวยภูเขาไฟเป็นยอดๆ
        const yy = y0 - amp * (0.45 + h * 0.4 + pk * 0.9);
        if (pk > 0.97) peaks.push([VX0 + x, yy]);
        g.lineTo(VX0 + x, yy);
      }
      g.lineTo(VX0 + VW, bY + 30); g.closePath(); g.fill();
      for (const [px, py] of peaks) { // ยอดเรือง + ควันดำ
        g.save(); g.globalCompositeOperation = "lighter"; glow(g, px, py, amp * 0.9, "255,90,30", glowA); g.restore();
        for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(10,8,8,${0.35 - i * 0.03})`; g.beginPath(); g.ellipse(px + Math.sin(i * 0.9 + seed) * 8 + i * 4, py - i * amp * 0.28, 10 + i * 6, 6 + i * 3, 0, 0, TAU); g.fill(); }
      }
    };
    cone(bY - 46, 80, "rgba(16,12,12,.55)", 1, 0.18);
    cone(bY - 20, 60, "rgba(12,9,9,.8)", 4, 0.28);
    cone(bY + 6, 36, "rgba(8,6,6,.97)", 7, 0.35);
    // หิมะทะเล (อบ — ส่วนที่ขยับอยู่ใน air)
    const R = rng(91);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(200,200,190,${0.05 + R() * 0.12})`; g.fillRect(VX0 + R() * VW, VY0 + R() * (bY - VY0), 1.4, 1.4); }
  },
  // พื้นทะเลนอกกระดาน: บะซอลต์ดำต่อเนื่อง มืดลงตามระยะ + รอยแยกเรืองจางๆ บางเส้น
  ground(c) {
    const { g, C, R, bY, wx0, wx1, wy1 } = c, { cols, rows } = sceneSize();
    for (let d = 24; d >= 0; d--) {
      const e = 0.4 + d * 1.2, x0 = -e, y0 = -e, x1 = cols + e, y1 = rows + e * 0.5, pts = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, side = Math.floor(u * 4), f = u * 4 - side, w = (hash(i, d) - 0.5) * 0.9;
        const p = side === 0 ? [x0 + (x1 - x0) * f, y0 + w] : side === 1 ? [x1 + w, y0 + (y1 - y0) * f] : side === 2 ? [x1 - (x1 - x0) * f, y1 + w] : [x0 + w, y1 - (y1 - y0) * f];
        pts.push(PS(p[0], p[1]));
      }
      polyFill(g, pts, mix(C.basalt2, "#030203", Math.min(1, 0.15 + d / 18)));
    }
    const n = Math.min(600, Math.round((wx1 - wx0) * (wy1 + 1) * 0.35));
    for (let i = 0; i < n; i++) {
      const x = wx0 + R() * (wx1 - wx0), y = -2 + R() * (wy1 + 2), [sx, sy, s] = PS(x, y); if (sy < bY) continue;
      g.fillStyle = R() < 0.5 ? "rgba(70,60,55,.2)" : "rgba(0,0,0,.35)";
      g.beginPath(); g.ellipse(sx, sy, s * (0.2 + R() * 0.5), s * (0.06 + R() * 0.08), 0, 0, TAU); g.fill();
    }
    // รอยแยกเรืองนอกกระดาน (ภูเขาไฟทั้งแอ่ง ไม่ได้มีแค่ในกระดาน)
    const RS = rng(17);
    g.save(); g.globalCompositeOperation = "lighter";
    for (let k = 0; k < 7; k++) {
      let x = RS() < 0.5 ? -1 - RS() * 5 : cols + 1 + RS() * 5, y = RS() * rows, a = RS() * TAU;
      g.strokeStyle = `rgba(255,${80 + RS() * 50 | 0},30,${0.12 + RS() * 0.1})`; g.lineWidth = 1.5; g.beginPath();
      for (let i = 0; i < 8; i++) { const p = PS(x, y); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); a += (RS() - 0.5) * 1.2; x += Math.cos(a) * 0.6; y += Math.sin(a) * 0.6; }
      g.stroke();
    }
    g.restore();
  },
  // ข้างกระดาน: กองบะซอลต์ ปล่องควันดำไกล (เงาสูงผอม) ลาวาหมอน · ไกลขึ้น = จมในความมืด
  side(c) {
    const { g, C, VX0, VX1, VW } = c, { cols, rows } = sceneSize();
    const rs = rng(66), band = 3 + Math.max(0, (VW - 1280) / 60), list = [];
    for (let i = 0; i < 80; i++) { list.push([-1.2 - rs() * band, rs() * (rows + 1) - 0.5, rs()]); list.push([cols + 0.2 + rs() * band, rs() * (rows + 1) - 0.5, rs()]); }
    for (let i = 0; i < 36; i++) list.push([rs() * (cols + 4) - 2, -1.2 - rs() * 3, rs()]);
    list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
      const [sx, sy, s] = PS(x, y); if (sx < VX0 - 100 || sx > VX1 + 100) return;
      const fog = clamp((-y + Math.max(0, -x, x - cols)) / 7, 0, 0.8);
      if (r < 0.4) pillowPile(g, sx, sy, s * (0.8 + r), C, r * 99);
      else if (r < 0.62) { // ปล่องไกล
        const h = s * (1.4 + r * 1.6);
        g.fillStyle = C.rock[2]; g.beginPath(); g.moveTo(sx - s * 0.22, sy); g.lineTo(sx - s * 0.1, sy - h); g.lineTo(sx + s * 0.08, sy - h); g.lineTo(sx + s * 0.2, sy); g.closePath(); g.fill();
        g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy - h, s * 0.4, "255,110,40", 0.15 * (1 - fog)); g.restore();
        for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(8,7,7,${0.4 - i * 0.05})`; g.beginPath(); g.ellipse(sx + i * s * 0.08, sy - h - i * s * 0.3, s * (0.15 + i * 0.08), s * (0.1 + i * 0.05), 0, 0, TAU); g.fill(); }
      } else { g.fillStyle = C.rock[1]; g.beginPath(); g.ellipse(sx, sy - s * 0.15, s * (0.4 + r * 0.3), s * 0.25, 0, Math.PI, TAU); g.fill(); }
      if (fog > 0) { g.fillStyle = `rgba(4,3,3,${fog})`; g.beginPath(); g.ellipse(sx, sy - s * 0.5, s * 1.1, s * 0.9, 0, 0, TAU); g.fill(); }
    });
  },
  // พื้นกระดาน: โซนกลืนกันด้วยก้อนวงกลมซ้อน (ไม่ลงสีทีละช่อง)
  base(c) {
    const { g, C, info } = c, Z = zones(info), cols = info.cols, rows = info.rows;
    { const q = [P(-0.2, -0.2), P(cols + 0.2, -0.2), P(cols + 0.2, rows + 0.2), P(-0.2, rows + 0.2)]; polyFill(g, q, C.basalt); }
    // 1) บะซอลต์ทั่วไป: ไล่สีตามระยะจากแอ่งลาวา (ใกล้ = แดงอมดำร้อน · ไกล = ดำเย็น) + ที่ราบเย็น (ใกล้เสาบะซอลต์ = เทาอมฟ้า)
    for (let y = -1; y <= rows; y++) for (let x = -1; x <= cols; x++) {
      const dl = Math.hypot(x + 0.5 - Z.lavaC.x, (y + 0.5 - Z.lavaC.y) * 1.1), dc = nearDist(Z.column, x + 0.5, y + 0.5);
      let col = mix(C.caldera, C.basalt2, clamp((dl - 1.5) / 4, 0, 1));
      if (dc < 3.2) col = mix(C.cold2, col, clamp((dc - 0.8) / 2.4, 0, 1));
      blobAt(g, x + 0.5, y + 0.5, 0.78, 0, 12, x * 31 + y * 7, 0.22); g.fillStyle = col; g.fill();
    }
    // 2) ที่ราบบะซอลต์: ลายรอยต่อหกเหลี่ยม (หินเย็นตัวแตกเป็นเสา) บนพื้นใกล้เสา
    g.strokeStyle = "rgba(140,160,170,.13)"; g.lineWidth = 1;
    for (let hy = -0.5; hy < rows; hy += 0.6) for (let hx = -0.5; hx < cols; hx += 0.69) {
      const ox = hx + (Math.round(hy / 0.6) % 2 ? 0.345 : 0);
      if (nearDist(Z.column, ox, hy) > 3) continue;
      g.beginPath();
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * TAU + Math.PI / 6, p = P(ox + Math.cos(a) * 0.38, hy + Math.sin(a) * 0.33, 0.004); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.stroke();
    }
    // 3) ลาดเถ้า: เถ้าเทานุ่มเป็นผืน + ลายลม
    for (const [r, col, a] of [[1.3, C.ash, 0.55], [0.9, C.ash2, 0.8]]) for (const t of Z.ash) { blobAt(g, t.x + 0.5, t.y + 0.5, r, 0, 12, t.x * 13 + t.y, 0.28); g.globalAlpha = a; g.fillStyle = col; g.fill(); }
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(150,140,130,.12)"; g.lineWidth = 1;
    for (let y = 0.3; y < rows; y += 0.45) {
      g.beginPath(); let on = false;
      for (let x = 0; x <= cols; x += 0.25) {
        const yy = y + Math.sin(x * 1.7 + y * 3) * 0.09, ok = nearDist(Z.ash, x, yy) < 0.75, p = P(x, yy, 0.005);
        if (ok) { on ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); on = true; } else on = false;
      }
      g.stroke();
    }
    // 4) แผ่นแบคทีเรียรอบปล่อง/ดงหนอนท่อ (ขาวอมเหลือง) + คราบกำมะถัน
    for (const t of [...Z.worm, ...Z.vent]) { blobAt(g, t.x + 0.5, t.y + 0.5, 0.95, 0, 14, t.x * 17 + t.y * 3, 0.32); g.fillStyle = "rgba(190,180,140,.08)"; g.fill(); }
    for (const v of Z.vent) for (let i = 0; i < 5; i++) { blobAt(g, v.x + 0.5 + (hash(v.x, i) - 0.5) * 1.6, v.y + 0.5 + (hash(i, v.y) - 0.5) * 1.6, 0.18 + hash(i, v.x + v.y) * 0.2, 0, 10, i * 9 + v.x, 0.3); g.fillStyle = i % 2 ? "rgba(201,178,74,.35)" : "rgba(122,69,38,.4)"; g.fill(); }
    // 5) แอ่งปากปล่อง: วงหินไหม้รอบทะเลสาบลาวา + ขอบเปลือกดำ (ตัวลาวาวาดทุกเฟรมใน ground)
    for (const t of Z.lava) { blobAt(g, t.x + 0.5, t.y + 0.5, 1.15, 0, 14, t.x * 7 + t.y * 5, 0.2); g.fillStyle = "rgba(10,5,4,.55)"; g.fill(); }
    for (const t of Z.lava) { blobAt(g, t.x + 0.5, t.y + 0.5, 0.82, -0.04, 14, t.x * 3 + t.y * 9, 0.15); g.fillStyle = C.crust; g.fill(); }
    // 6) รอยแยก: ร่องดำไหม้ (แสงเรืองวาดทุกเฟรม)
    g.strokeStyle = "rgba(5,2,2,.85)"; g.lineCap = "round";
    for (const [x0, y0, x1, y1, sd] of Z.links) { g.lineWidth = Math.max(3, P(x0, y0)[2] * 0.12); jag(g, x0, y0, x1, y1, sd, 0.01, 0.1); g.stroke(); }
    g.lineCap = "butt";
    // 7) ลาวาหมอน: พื้นเป็นก้อนกลมเตี้ยๆ รอบสัน (ไม่ใช่แค่ตัวสิ่งกีดขวาง)
    const RP = rng(31);
    for (const t of Z.pillow) for (let i = 0; i < 4; i++) {
      const x = t.x + 0.5 + (RP() - 0.5) * 2, y = t.y + 0.5 + (RP() - 0.5) * 2;
      if (Z.kindAt(Math.floor(x), Math.floor(y)) === "fd_nt_lava") continue;
      const [sx, sy, s] = P(x, y, 0.02); g.fillStyle = C.pillow[i % 3]; g.beginPath(); g.ellipse(sx, sy, s * (0.16 + RP() * 0.12), s * (0.08 + RP() * 0.05), 0, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,.05)"; g.beginPath(); g.ellipse(sx - s * 0.04, sy - s * 0.03, s * 0.06, s * 0.025, -0.3, 0, TAU); g.fill();
    }
    // 8) หลุมยุบ: ขั้นหินดิ่งลง → ดำสนิท
    if (Z.pitC) {
      const { x: hx, y: hy, r: hr } = Z.pitC;
      blobAt(g, hx, hy, hr + 0.55, 0, 26, 3, 0.16); g.fillStyle = "#14100f"; g.fill();
      for (let i = 0; i < 7; i++) { blobAt(g, hx, hy, hr * (1 - i / 7.5), -i * 0.32, 26, 5 + i, 0.12); g.fillStyle = mix("#2b211e", "#000000", i / 5); g.fill(); }
    }
    // 9) ก้อนกรวด/เศษหิน/ผลึกกำมะถันกระจาย (เลี่ยงลาวา/หลุม)
    const R = rng(55);
    for (let i = 0; i < cols * rows * 0.8; i++) {
      const x = R() * cols, y = R() * rows;
      if (nearDist(Z.lava, x, y) < 1.1 || (Z.pitC && Math.hypot(x - Z.pitC.x, y - Z.pitC.y) < Z.pitC.r + 0.6)) continue;
      const [sx, sy, s] = P(x, y, 0.01), k = R();
      if (k < 0.75) { g.fillStyle = R() < 0.5 ? "rgba(0,0,0,.45)" : "rgba(110,100,95,.3)"; g.beginPath(); g.ellipse(sx, sy, s * 0.04, s * 0.02, 0, 0, TAU); g.fill(); }
      else if (nearDist(Z.vent, x, y) < 2.5) { g.fillStyle = "rgba(220,200,80,.45)"; g.beginPath(); g.moveTo(sx, sy - s * 0.05); g.lineTo(sx + s * 0.02, sy); g.lineTo(sx - s * 0.02, sy); g.fill(); }
    }
  },
  grid({ g, C, info }) {
    const Z = zones(info);
    g.strokeStyle = C.grid; g.lineWidth = 1;
    for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
      const k = Z.kindAt(x, y);
      if (k === "fd_nt_lava" || k === "fd_nt_pit" || k === "fd_nt_column" || k === "fd_nt_vent" || k === "fd_nt_pillow") continue;
      const a = P(x, y), b = P(x + 1, y), c2 = P(x + 1, y + 1);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.stroke();
    }
    return true;
  },
};
// กองลาวาหมอน (จุดบนจอ — ข้างกระดาน)
function pillowPile(g, x, y, s, C, seed) {
  g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(x, y, s * 0.6, s * 0.18, 0, 0, TAU); g.fill();
  for (let i = 0; i < 5; i++) {
    const ox = (hash(seed, i) - 0.5) * s * 0.8, oy = -hash(i, seed) * s * 0.45 - (i > 2 ? s * 0.2 : 0), r = s * (0.18 + hash(seed + i, 3) * 0.1);
    g.fillStyle = C.pillow[i % 3]; g.beginPath(); g.ellipse(x + ox, y + oy, r * 1.2, r * 0.8, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,.06)"; g.beginPath(); g.ellipse(x + ox - r * 0.3, y + oy - r * 0.3, r * 0.4, r * 0.18, -0.4, 0, TAU); g.fill();
  }
}

// =================================================================== สิ่งกีดขวาง
let LAST_FD = null; // สถานะปล่อง (ร้อน/ถูกอุด) จากเฟรมล่าสุด — drawObstacle ไม่ได้รับ fd
export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t, C = PAL[ctx && ctx.night ? "night" : "day"];
  if (kind === "fd_nt_whale" || kind === "fd_nt_ship" || kind === "fd_nt_lava" || kind === "fd_nt_pit" || kind === "fd_nt_crack" || kind === "fd_nt_lavarock") return; // ลาวา/หลุม/รอยแยกยุบ = พื้น (ground) · หินลาวา = items · เรือ = shipArt · ลำตัวปลาวาฬ = thalassaArt
  if (kind === "fd_nt_vent") { smoker(g, x, y, C, now); return; }
  if (kind === "fd_nt_column") { columns(g, x, y, C); return; }
  if (kind === "fd_nt_pillow") { pillow(g, x, y, C, now); return; }
}
// ปล่องควันดำ: ปล่องแร่ซ้อนเป็นปล้องขรุขระ กว้างล่างแคบบน มีชั้นยื่น · ฐานรอยแตกเรืองส้ม · ปากปล่องเรือง (ร้อน = เรืองแรงกะพริบ · ถูกอุด = ฝาหินมีรอยร้าวแดง)
function smoker(g, x, y, C, now) {
  const cx = x + 0.5, cy = y + 0.5, H = ventH(x, y), t = now / 1000;
  const st = ventState(x, y);
  const [bx, by, s] = P(cx, cy);
  g.fillStyle = "rgba(0,0,0,.5)"; g.beginPath(); g.ellipse(bx, by, s * 0.62, s * 0.24, 0, 0, TAU); g.fill();
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, bx, by - s * 0.05, s * 0.75, "255,100,30", 0.22 + 0.08 * Math.sin(t * 2 + x)); g.restore();
  const segs = 6;
  for (let k = 0; k < segs; k++) {
    const z0 = (H * k) / segs, z1 = (H * (k + 1)) / segs, r0 = 0.42 - k * 0.045 + (k === 2 || k === 4 ? 0.06 : 0), r1 = 0.4 - (k + 1) * 0.045;
    const ring = (z, r, sd) => { const pts = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU, rr = r * (0.8 + hash(i % 12, x * 7 + y * 3 + sd) * 0.4); pts.push(P(cx + Math.cos(a) * rr + Math.sin(k * 1.3 + x) * 0.03, cy + Math.sin(a) * rr, z)); } return pts; };
    const b = ring(z0, r0, k), tp = ring(z1, r1, k + 1);
    const order = [...Array(12).keys()].sort((i, j) => depthOf(cx + Math.cos(((i + 0.5) / 12) * TAU), cy + Math.sin(((i + 0.5) / 12) * TAU)) - depthOf(cx + Math.cos(((j + 0.5) / 12) * TAU), cy + Math.sin(((j + 0.5) / 12) * TAU)));
    for (const i of order) {
      const streak = hash(i * 7 + k * 3, x * 11 + y) > 0.88;
      g.fillStyle = streak ? (hash(k, i + y) > 0.5 ? mix(C.rust, C.rock[2], 0.4) : mix("#6b5a2a", C.rock[2], 0.45)) : i % 3 ? C.rock[2] : mix(C.rock[2], C.rock[1], 0.5);
      g.beginPath(); g.moveTo(b[i][0], b[i][1]); g.lineTo(b[i + 1][0], b[i + 1][1]); g.lineTo(tp[i + 1][0], tp[i + 1][1]); g.lineTo(tp[i][0], tp[i][1]); g.closePath(); g.fill();
    }
    if (k === segs - 1) polyFill(g, tp, C.rock[1]);
  }
  // ปากปล่อง
  const [mx, my, ms] = P(cx + Math.sin(5 * 1.3 + x) * 0.03, cy, H);
  if (st.plug) {
    g.fillStyle = "#3a3330"; g.beginPath(); g.ellipse(mx, my - ms * 0.04, ms * 0.24, ms * 0.12, 0, 0, TAU); g.fill();
    const p = 0.5 + 0.5 * Math.sin(t * 9);
    g.strokeStyle = `rgba(255,${90 + 80 * p | 0},40,${0.6 + 0.4 * p})`; g.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(mx, my - ms * 0.04); g.lineTo(mx + Math.cos(i * 1.7) * ms * 0.2, my - ms * 0.04 + Math.sin(i * 1.7) * ms * 0.09); g.stroke(); }
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, mx, my, ms * (0.5 + 0.3 * p), "255,80,20", 0.5 * p); g.restore();
  } else {
    g.fillStyle = "#050303"; g.beginPath(); g.ellipse(mx, my, ms * 0.16, ms * 0.08, 0, 0, TAU); g.fill();
    const hot = st.hot ? 0.55 + 0.45 * Math.sin(t * 7) : 0.25 + 0.1 * Math.sin(t * 1.5 + y);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, mx, my, ms * (st.hot ? 0.7 : 0.35), "255,120,40", hot); g.restore();
  }
}
function ventState(x, y) {
  const list = LAST_FD && LAST_FD.vents && LAST_FD.vents.vents;
  const v = list ? list.find((q) => q.x === x && q.y === y) : null;
  return v || { hot: false, plug: false };
}
// เสาบะซอลต์หกเหลี่ยม: กลุ่มเสาสูงไม่เท่ากัน (เย็น เทาอมฟ้า) — ยอดเป็นหน้าตัดหกเหลี่ยมสว่าง
function columns(g, x, y, C) {
  const R = rng(x * 53 + y * 19), n = 3 + Math.floor(R() * 2), list = [];
  for (let i = 0; i < n; i++) list.push({ ox: x + 0.22 + R() * 0.56, oy: y + 0.22 + R() * 0.56, h: 1.1 + R() * 1.6, r: 0.17 + R() * 0.06 });
  list.sort((a, b) => depthOf(a.ox, a.oy) - depthOf(b.ox, b.oy));
  { const [bx, by, s] = P(x + 0.5, y + 0.5); g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(bx, by, s * 0.6, s * 0.24, 0, 0, TAU); g.fill(); }
  for (const c of list) {
    const hex = (z) => { const pts = []; for (let i = 0; i <= 6; i++) { const a = (i / 6) * TAU; pts.push(P(c.ox + Math.cos(a) * c.r, c.oy + Math.sin(a) * c.r, z)); } return pts; };
    const b = hex(0), tp = hex(c.h);
    const order = [...Array(6).keys()].sort((i, j) => depthOf(c.ox + Math.cos(((i + 0.5) / 6) * TAU), c.oy + Math.sin(((i + 0.5) / 6) * TAU)) - depthOf(c.ox + Math.cos(((j + 0.5) / 6) * TAU), c.oy + Math.sin(((j + 0.5) / 6) * TAU)));
    for (const i of order) { g.fillStyle = C.colSide[i % 3]; g.beginPath(); g.moveTo(b[i][0], b[i][1]); g.lineTo(b[i + 1][0], b[i + 1][1]); g.lineTo(tp[i + 1][0], tp[i + 1][1]); g.lineTo(tp[i][0], tp[i][1]); g.closePath(); g.fill(); }
    polyFill(g, tp, C.colTop);
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 0.8; g.beginPath(); tp.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    // รอยแตกตามขวาง (เสาบะซอลต์เย็นตัวเป็นปล้อง)
    const m = P(c.ox, c.oy + c.r, c.h * 0.55), s = m[2];
    g.strokeStyle = "rgba(0,0,0,.4)"; g.beginPath(); g.moveTo(m[0] - s * c.r * 0.8, m[1]); g.lineTo(m[0] + s * c.r * 0.8, m[1] + s * 0.02); g.stroke();
  }
}
// ลาวาหมอน: ก้อนกลมมันวาวซ้อนเป็นกอง (บางก้อนยังมีรอยร้าวเรืองแดงจางๆ)
function pillow(g, x, y, C, now) {
  const R = rng(x * 37 + y * 11), n = 5 + Math.floor(R() * 3), list = [];
  for (let i = 0; i < n; i++) { const up = i >= n - 2; list.push({ ox: x + 0.2 + R() * 0.6, oy: y + 0.2 + R() * 0.6, z: up ? 0.35 + R() * 0.25 : 0.12, r: up ? 0.2 + R() * 0.08 : 0.25 + R() * 0.1, hot: R() < 0.2 }); }
  list.sort((a, b) => a.z - b.z || depthOf(a.ox, a.oy) - depthOf(b.ox, b.oy));
  { const [bx, by, s] = P(x + 0.5, y + 0.5); g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(bx, by, s * 0.6, s * 0.22, 0, 0, TAU); g.fill(); }
  for (const [i, p] of list.entries()) {
    const [sx, sy, s] = P(p.ox, p.oy, p.z), rr = s * p.r;
    g.fillStyle = C.pillow[i % 3]; g.beginPath(); g.ellipse(sx, sy, rr * 1.25, rr * 0.85, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(sx, sy + rr * 0.35, rr * 1.15, rr * 0.45, 0, 0, Math.PI); g.fill();
    g.fillStyle = "rgba(255,240,230,.08)"; g.beginPath(); g.ellipse(sx - rr * 0.35, sy - rr * 0.35, rr * 0.45, rr * 0.2, -0.4, 0, TAU); g.fill();
    if (p.hot) { const a = 0.35 + 0.25 * Math.sin(now / 700 + i + x); g.strokeStyle = `rgba(255,90,30,${a})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(sx - rr * 0.6, sy); g.lineTo(sx - rr * 0.1, sy - rr * 0.15); g.lineTo(sx + rr * 0.5, sy + rr * 0.05); g.stroke(); }
  }
}

// =================================================================== ของที่เรียงความลึกกับตัวละคร
export function items(list, g, fd, info, units, now, lowQ) {
  LAST_FD = fd;
  const Z = zones(info), t = now / 1000;
  const occ = new Set((units || []).filter((u) => u && Number.isFinite(u.x)).map((u) => K(Math.round(u.x), Math.round(u.y))));
  // ดงหนอนท่อ: ท่อขาวสูงต่างกัน พู่แดงโบกตามน้ำร้อน · มีคนยืน = หดพู่เข้าท่อ (ซ่อนตัว)
  for (const w of Z.worm) {
    const R = rng(w.x * 71 + w.y * 29), n = lowQ ? 5 : 8 + Math.floor(R() * 4), hid = occ.has(K(w.x, w.y));
    for (let i = 0; i < n; i++) {
      const x = w.x + 0.12 + R() * 0.76, y = w.y + 0.12 + R() * 0.76, h = 0.18 + R() * 0.3, seed = R() * 100;
      list.push({ d: depthOf(x, y), f: () => tubeWorm(g, x, y, h, seed, t, hid) });
    }
  }
  // ปูขาวรอบปล่อง (ไต่ไปมาช้าๆ) — มีชีวิต
  if (!lowQ) for (const v of Z.vent) for (let i = 0; i < 3; i++) {
    const sp = (0.15 + hash(v.x, i) * 0.2) * (i % 2 ? 1 : -1), a = t * sp + i * 2.1, r = 0.62 + hash(i, v.y) * 0.25;
    const at = (q) => [v.x + 0.5 + Math.cos(q) * r, v.y + 0.5 + Math.sin(q) * r * 0.9], [x, y] = at(a), [x2, y2] = at(a + sp * 0.2);
    if (Z.kindAt(Math.floor(x), Math.floor(y)) && Z.kindAt(Math.floor(x), Math.floor(y)) !== "fd_nt_tubeworm") continue;
    // หันตามทิศเดินจริงบนจอ (ฉายสองจุดแล้ว atan2 — หมุนกล้องแล้วไม่เดินถอยหลัง)
    const p0 = P(x, y), p1 = P(x2, y2), ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    list.push({ d: depthOf(x, y), f: () => crab(g, x, y, ang, t + i) });
  }
  shipItems(list, g, fd, info, now, lowQ);
  ventsItems(list, g, fd, info, now, Z);
}
function tubeWorm(g, x, y, h, seed, t, hid) {
  const sw = Math.sin(t * 1.3 + seed) * 0.05, hh = hid ? h * 0.75 : h;
  const a = P(x, y, 0), b = P(x + sw, y, hh), s = a[2];
  g.strokeStyle = "#d9d3c4"; g.lineWidth = Math.max(1.6, s * 0.045); g.lineCap = "round";
  g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(a[0], (a[1] + b[1]) / 2, b[0], b[1]); g.stroke();
  g.strokeStyle = "rgba(120,110,95,.6)"; g.lineWidth = Math.max(0.8, s * 0.015); g.beginPath(); g.moveTo(a[0] + s * 0.012, a[1]); g.quadraticCurveTo(a[0] + s * 0.012, (a[1] + b[1]) / 2, b[0] + s * 0.012, b[1]); g.stroke();
  g.lineCap = "butt";
  if (hid) { g.fillStyle = "#8a2a24"; g.beginPath(); g.ellipse(b[0], b[1], s * 0.022, s * 0.012, 0, 0, TAU); g.fill(); return; }
  const pl = 1 + 0.12 * Math.sin(t * 2.4 + seed);
  g.fillStyle = "#c8302a"; g.beginPath(); g.ellipse(b[0], b[1] - s * 0.035 * pl, s * 0.045 * pl, s * 0.05 * pl, 0, 0, TAU); g.fill();
  g.fillStyle = "#ff5a48"; g.beginPath(); g.ellipse(b[0] - s * 0.012, b[1] - s * 0.05 * pl, s * 0.022, s * 0.022, 0, 0, TAU); g.fill();
}
function crab(g, x, y, ang, t) {
  const [sx, sy, s] = P(x, y, 0.03), r = s * 0.035, dir = Math.cos(ang) >= 0 ? 1 : -1;
  g.strokeStyle = "rgba(230,225,210,.85)"; g.lineWidth = 1;
  for (let i = -1; i <= 1; i++) for (const sd of [-1, 1]) { const k = Math.sin(t * 12 + i) * r * 0.3; g.beginPath(); g.moveTo(sx + sd * r * 0.6, sy + i * r * 0.3); g.lineTo(sx + sd * r * 1.6, sy + i * r * 0.5 + k); g.stroke(); }
  g.fillStyle = "#e8e2d2"; g.beginPath(); g.ellipse(sx, sy, r, r * 0.65, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(sx + Math.cos(ang) * r * 1.2, sy + Math.sin(ang) * r * 0.6 - r * 0.3, r * 0.35, r * 0.25, 0, 0, TAU); g.fill();
  void dir;
}

// =================================================================== พื้นทุกเฟรม (ใต้ตัวละคร)
export function ground(g, fd, info, now, lowQ) {
  LAST_FD = fd;
  const Z = zones(info), t = now / 1000;
  // ทะเลสาบลาวา: ลาวาเรืองไล่สี → แผ่นเปลือกดำลอยเลื่อนช้าๆ → ฟองปุด
  for (const l of Z.lava) {
    blobAt(g, l.x + 0.5, l.y + 0.5, 0.86, -0.06, 14, l.x * 3 + l.y * 9, 0.12);
    const [cx, cy, s] = P(l.x + 0.5, l.y + 0.5, -0.06), pulse = 0.85 + 0.15 * Math.sin(t * 1.2 + l.x * 0.7 + l.y);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.9);
    gr.addColorStop(0, `rgb(255,${190 * pulse | 0},70)`); gr.addColorStop(0.5, `rgb(240,${95 * pulse | 0},20)`); gr.addColorStop(1, "rgb(120,25,8)");
    g.fillStyle = gr; g.fill();
  }
  for (const l of Z.lava) for (let i = 0; i < (lowQ ? 1 : 3); i++) { // แผ่นเปลือก
    const ox = ((hash(l.x * 3 + i, l.y) + t * 0.025 * (i % 2 ? 1 : -1)) % 1 + 1) % 1, oy = hash(l.x, l.y * 3 + i);
    const x = l.x + 0.12 + ox * 0.76, y = l.y + 0.12 + oy * 0.76, r = 0.06 + hash(i, l.x + l.y) * 0.09;
    if (Z.kindAt(Math.floor(x), Math.floor(y)) !== "fd_nt_lava") continue;
    blobAt(g, x, y, r, -0.05, 7, i * 13 + l.x, 0.35); g.fillStyle = "rgba(70,24,10,.75)"; g.fill();
    g.strokeStyle = "rgba(255,170,60,.5)"; g.lineWidth = 1; g.stroke();
  }
  if (!lowQ) for (const l of Z.lava) { // ฟองปุด
    const k = ((t * 0.5 + hash(l.x, l.y)) % 1), [bx, by, s] = P(l.x + 0.3 + hash(l.y, l.x) * 0.4, l.y + 0.3 + hash(l.x, l.y + 1) * 0.4, -0.05);
    if (k < 0.3) { const r = s * (0.03 + k * 0.2); g.strokeStyle = `rgba(255,230,140,${1 - k / 0.3})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(bx, by, r, r * 0.5, 0, 0, TAU); g.stroke(); }
  }
  // แสงลาวาสาดบนพื้นรอบแอ่ง
  { const [cx, cy, s] = P(Z.lavaC.x, Z.lavaC.y, 0); g.save(); g.globalCompositeOperation = "lighter"; glow(g, cx, cy, s * 3.6, "255,90,30", 0.16 + 0.04 * Math.sin(t * 0.9)); g.restore(); }
  // รอยแยกลาวา: เส้นเรืองส้ม-เหลือง ชีพจรวิ่งตามรอยแยก
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (const [x0, y0, x1, y1, sd] of Z.links) {
    const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 - (x0 + y0) * 0.8), s = P(x0, y0)[2];
    g.strokeStyle = `rgba(255,${50 + 40 * pulse | 0},10,${0.3 * pulse})`; g.lineWidth = Math.max(5, s * 0.2); jag(g, x0, y0, x1, y1, sd, 0.012, 0.1); g.stroke();
    g.strokeStyle = `rgba(255,${120 + 50 * pulse | 0},40,${0.75 * pulse})`; g.lineWidth = Math.max(1.6, s * 0.05); jag(g, x0, y0, x1, y1, sd, 0.014, 0.1); g.stroke();
  }
  g.restore(); g.lineCap = "butt";
  // ปล่องแรงดัน: วงร้อนบนพื้น
  for (const p of Z.pvent) { const [cx, cy, s] = P(p.x + 0.5, p.y + 0.5, 0.01); g.save(); g.globalCompositeOperation = "lighter"; glow(g, cx, cy, s * 0.55, "255,150,80", 0.12 + 0.06 * Math.sin(t * 3 + p.x)); g.restore(); }
  // รอยแยกยุบจากแผ่นดินไหว (fd.vents.cracks)
  for (const k of (fd && fd.vents && fd.vents.cracks) || []) {
    const [x, y] = k.split(",").map(Number);
    blobAt(g, x + 0.5, y + 0.5, 0.55, 0, 12, x * 9 + y, 0.35); g.fillStyle = "#070404"; g.fill();
    for (let i = 0; i < 3; i++) { blobAt(g, x + 0.5, y + 0.5, 0.42 - i * 0.1, -0.2 - i * 0.2, 12, x + y + i, 0.3); g.fillStyle = mix("#1a0d0a", "#000000", i / 2); g.fill(); }
    const [cx, cy, s] = P(x + 0.5, y + 0.5, -0.6); g.save(); g.globalCompositeOperation = "lighter"; glow(g, cx, cy, s * 0.35, "255,60,20", 0.25 + 0.1 * Math.sin(t * 2 + x)); g.restore();
    g.strokeStyle = "rgba(0,0,0,.8)"; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const a = hash(x, i) * TAU; jag(g, x + 0.5, y + 0.5, x + 0.5 + Math.cos(a) * 0.75, y + 0.5 + Math.sin(a) * 0.75, x * 7 + i, 0.01, 0.08, 4); g.stroke(); }
  }
  drawThalassaGround(g, fd, info, now);
}

// =================================================================== ทับตัวละคร
export function air(g, fd, info, units, now, lowQ, view) {
  const Z = zones(info), t = now / 1000;
  const X0 = view ? view.x0 : 0, W = view ? view.x1 - view.x0 : 1280, Y0 = view ? view.y0 : 0, H = view ? view.y1 - view.y0 : 720;
  // ควันดำจากปล่อง: ก้อนควันพวยพุ่ง ขยายตัว ลอยเฉ (ใต้ก้อนสว่างส้มจากปากปล่อง) — ปล่องร้อน/ปะทุ = ควันหนาและเร็วขึ้น
  const vs = (fd && fd.vents && fd.vents.vents) || [];
  for (const v of Z.vent) {
    const st = vs.find((q) => q.x === v.x && q.y === v.y) || {}, H0 = ventH(v.x, v.y), n = lowQ ? 6 : st.hot ? 18 : 12, spd = st.hot ? 0.5 : 0.3;
    if (st.plug) continue;
    for (let i = 0; i < n; i++) {
      const k = ((t * spd + i / n + hash(v.x, v.y)) % 1), drift = k * k * 1.2;
      const [sx, sy, s] = P(v.x + 0.5 + drift * 0.6 + Math.sin(t + i) * 0.05, v.y + 0.5 - drift * 0.2, H0 + k * 3.2);
      const r = s * (0.1 + k * 0.45);
      g.fillStyle = `rgba(${14 + (1 - k) * 30 | 0},${10 + (1 - k) * 12 | 0},${10},${0.55 * (1 - k)})`;
      g.beginPath(); g.ellipse(sx + Math.sin(i * 2.3 + t) * r * 0.3, sy, r, r * 0.8, 0, 0, TAU); g.fill();
    }
  }
  // ประกายไฟลอยจากทะเลสาบลาวา/รอยแยก
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    const src = [...Z.lava, ...Z.fissure];
    for (let i = 0; i < 26 && src.length; i++) {
      const o = src[Math.floor(hash(i, 3) * src.length)], k = ((t * (0.18 + hash(i, 4) * 0.2) + hash(i, 5)) % 1);
      const [sx, sy, s] = P(o.x + 0.5 + Math.sin(t * 0.7 + i) * 0.3, o.y + 0.5, k * 2.6);
      g.fillStyle = `rgba(255,${150 + hash(i, 6) * 80 | 0},60,${0.8 * (1 - k)})`; g.fillRect(sx, sy, Math.max(1.4, s * 0.02), Math.max(1.4, s * 0.02));
    }
    // ไอร้อนสั่นเหนือลาวา
    const [cx, cy, s] = P(Z.lavaC.x, Z.lavaC.y, 0.6);
    for (let i = 0; i < 4; i++) { g.strokeStyle = `rgba(255,140,80,${0.05 + 0.03 * Math.sin(t * 3 + i)})`; g.lineWidth = 2; g.beginPath(); for (let j = 0; j <= 10; j++) { const xx = cx - s * 1.5 + (j / 10) * s * 3, yy = cy - i * s * 0.25 + Math.sin(t * 4 + j + i) * s * 0.04; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
    g.restore();
  }
  // เถ้าฟุ้งเหนือลาดเถ้า
  if (!lowQ) for (let i = 0; i < 16; i++) {
    const a = Z.ash[Math.floor(hash(i, 8) * Z.ash.length)]; if (!a) break;
    const k = ((t * 0.08 + hash(i, 9)) % 1), [sx, sy, s] = P(a.x + 0.5 + k * 1.5, a.y + 0.5, 0.2 + Math.sin(k * Math.PI) * 0.6);
    g.fillStyle = `rgba(150,140,130,${0.18 * Math.sin(k * Math.PI)})`; g.beginPath(); g.ellipse(sx, sy, s * 0.25, s * 0.08, 0, 0, TAU); g.fill();
  }
  // ฟองอากาศจากช่องฟื้นฟู
  for (const h of info.heal || []) for (let i = 0; i < 6; i++) {
    const k = ((t * 0.35 + i / 6 + hash(h.x, h.y)) % 1), [sx, sy, s] = P(h.x + 0.5 + Math.sin(t * 2 + i) * 0.08, h.y + 0.5, k * 3.2);
    g.strokeStyle = `rgba(200,235,255,${0.75 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, s * (0.03 + i * 0.008), 0, TAU); g.stroke();
  }
  // หลุมยุบ: ดวงตาเรืองแดงกะพริบในความมืดเป็นพักๆ
  if (Z.pitC) {
    const slot = Math.floor(t / 11), d = t - slot * 11 - hash(slot, 7) * 6;
    if (d > 0 && d < 1.4) { const a = Math.sin((d / 1.4) * Math.PI), [sx, sy, s] = P(Z.pitC.x + (hash(slot, 4) - 0.5) * 0.8, Z.pitC.y + (hash(slot, 5) - 0.5) * 0.5, -1.2); for (const ex of [-1, 1]) { glow(g, sx + ex * s * 0.12, sy, s * 0.1, "255,60,40", 0.8 * a); g.fillStyle = `rgba(255,120,90,${a})`; g.beginPath(); g.ellipse(sx + ex * s * 0.12, sy, s * 0.03, s * 0.012, 0, 0, TAU); g.fill(); } }
  }
  // หิมะทะเลตกช้าๆ (จอ)
  if (!lowQ) { g.fillStyle = "rgba(210,205,195,.28)"; for (let i = 0; i < 60; i++) { const x = X0 + ((hash(i, 1) * W + Math.sin(t * 0.2 + i) * 10) % W), y = Y0 + ((hash(i, 2) * H + t * (4 + hash(i, 3) * 6)) % H); g.fillRect(x, y, 1.5, 1.5); } }
  // สภาพอากาศ: ภูเขาไฟปะทุ = ขอบจอบนแดงกะพริบ + เถ้าร้อนตก · แผ่นดินไหว = ฝุ่นร่วงจากบนจอ
  const wv = fd && fd.vents;
  if (wv && wv.eruption) {
    const p = 0.5 + 0.5 * Math.sin(t * 1.7);
    const lg = g.createLinearGradient(0, Y0, 0, Y0 + H * 0.5); lg.addColorStop(0, `rgba(255,60,20,${0.14 + 0.08 * p})`); lg.addColorStop(1, "rgba(255,60,20,0)");
    g.fillStyle = lg; g.fillRect(X0, Y0, W, H * 0.5);
    if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 40; i++) { const x = X0 + ((hash(i, 11) * W + t * 20) % W), y = Y0 + ((hash(i, 12) * H + t * (40 + hash(i, 13) * 50)) % H); g.fillStyle = `rgba(255,${120 + hash(i, 14) * 100 | 0},50,.7)`; g.fillRect(x, y, 2, 2); } g.restore(); }
  }
  if (wv && wv.quake && !lowQ) { g.fillStyle = "rgba(120,110,100,.35)"; for (let i = 0; i < 50; i++) { const x = X0 + hash(i, 21) * W + Math.sin(t * 30 + i) * 2, y = Y0 + ((hash(i, 22) * H + t * (60 + hash(i, 23) * 60)) % H); g.fillRect(x, y, 1.5, 3); } }
  // ความมืดกดดัน: ขอบจอดำหนัก (−1,000 ม.) — แสงลาวาทำให้กลางกระดานยังอ่านออก
  const vg = g.createRadialGradient(X0 + W / 2, Y0 + H / 2, Math.min(W, H) * 0.3, X0 + W / 2, Y0 + H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(2,1,1,.7)"); g.fillStyle = vg; g.fillRect(X0, Y0, W, H);
  shipFx(g, fd, info, now);
  ventsFx(g, fd, info, now);
}
export function bakeSpecial() {}
export function animSpecial() {}
// ทาลัสซาวาดหลังหมอกความมืด (index.js drawFodlanAir เรียก airTop ต่อจาก drawFog) — ผู้ใช้ 2026-11-19: ตัวปลาโดนหมอกความมืดบัง
export const airTop = drawThalassaAir;

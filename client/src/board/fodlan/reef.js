// ============================================================
//  Nautilus ชั้น 1 "แนวปะการัง" −30 ม. (area 46 · GRID_PLAN §8.9) — ภาพทั้งชั้น (ผู้ใช้สั่ง 2026-11-19: ต้องเป็นภูมิประเทศจริง ไม่ใช่ของเดิมวางกระจาย)
//  ผัง server/fodlan/map7.js — แบ่งเป็นโซนภูมิศาสตร์ ไม่ใช่ลายซ้ำทั้งกระดาน:
//   เหนือ = สันแนวปะการัง (กำแพงหินปะการังมีช่องผ่าน) + อ่าวทรายท่าจอดเรือ Nautilus กลาง
//   ตะวันตก = ป่าสาหร่ายเคลป์ (พื้นโคลนมืด ต้นเคลป์สูงโยกตามกระแส ก้อนหิน)
//   กลาง = ลากูนทราย (ลอนทราย แสงระยิบ) + ร่องกระแสน้ำไหลไปตะวันออก + ทุ่งหญ้าทะเล + หอยมุกยักษ์
//   ตะวันออก = สวนปะการัง (ปะการังกิ่ง พัดทะเล ดอกไม้ทะเล ปะการังสมอง หลากสี — สว่างสุดของชั้น)
//   ตะวันออกเฉียงใต้ = ซุ้มหินโค้ง + ถ้ำเล็ก (ฟองอากาศข้างใน)
//   ใต้ = ขอบผาดิ่งสู่ห้วงลึก (พื้นมืดลงเรื่อยๆ) + หลุมน้ำเงิน (blue hole) ดำสนิทมุมตะวันตกเฉียงใต้
//  ของที่ขยับ: เคลป์ ปะการัง หญ้าทะเล ดอกไม้ทะเล (items · เรียงความลึกกับตัวละคร) · ฝูงปลา แมงกะพรุน ลำแสง ฟอง (air) · แสงระยิบ + กระแสน้ำ (ground)
// ============================================================
import { P, PS, depthOf, faceVisible, glow, rng, sceneSize } from "../boardGeo";
import { drawThalassaAir, drawThalassaGround } from "./thalassaArt";
import { shipFx, shipItems } from "./shipArt";
import { reefFx, reefItems, reefStorm, reefStormFx } from "./reefFx";

const TAU = Math.PI * 2;
export const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const K = (x, y) => `${x},${y}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const kinds = ["fd_nt_reefwall", "fd_nt_boulder", "fd_nt_arch", "fd_nt_bluehole", "fd_nt_kelp", "fd_nt_coral", "fd_nt_seagrass", "fd_nt_current", "fd_nt_ledge", "fd_nt_clam", "fd_nt_whale", "fd_nt_ship", "fd_nt_rubble"];
export const tall = ["fd_nt_reefwall", "fd_nt_arch"];
export const fogRGB = "20,70,85";
export const fx = {};

// ---------- สี (ใต้น้ำ = ทุกอย่างอมฟ้าเขียว · กลางคืน = เข้มลง) ----------
const BASE = {
  ground1: "#0f3640", ground2: "#03131a", tile: "rgba(0,0,0,0)", tile2: "rgba(0,0,0,0)",
  grid: "rgba(150,230,230,.075)", border: "rgba(150,240,240,.35)", spawn: "rgba(190,250,250,.35)",
  light: ["rgba(120,220,230,.06)", "rgba(0,10,18,.42)"], nightTint: null, shadow: "rgba(0,10,14,.5)",
  sky: ["#0b4a5c", "#062c38", "#031820"], fog: "20,70,85",
  // โซนพื้น
  rockBed: "#1f3436", sand: "#7d9c92", sand2: "#94b2a4", sandDark: "#5c7c76", mud: "#26403c", mud2: "#1a302d",
  algae: "#56607a", algae2: "#6b5a78", ledge: "#123344", abyss: "#020a12",
  rock: ["#8fa39b", "#647a74", "#3f504c"], coralCols: ["#e0687a", "#ef9a52", "#c46ab8", "#e8c25a", "#5fd0c8", "#f07aa0"],
  kelp: ["#5d7a3a", "#4a6a30", "#7a8f3e"], grass: "#4f7a52",
};
const PAL = { day: BASE, night: { ...BASE, ground1: "#0a252d", ground2: "#020a0e", sky: ["#062c38", "#041c24", "#020e14"], sand: "#5f7c74", sand2: "#6f8e82" } };

// ---------- ข้อมูลผัง (จาก info ที่ boardBake ส่งมา) ----------
let ZCACHE = null;
function zones(info) {
  if (ZCACHE && ZCACHE.info === info) return ZCACHE;
  const sp = new Map(), tk = info.terrainKind || {};
  for (const s of info.special || []) sp.set(K(s.x, s.y), s.kind);
  const kindAt = (x, y) => tk[K(x, y)] || sp.get(K(x, y)) || null;
  const list = (k) => { const out = []; for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) if (kindAt(x, y) === k) out.push({ x, y }); return out; };
  ZCACHE = { info, kindAt, kelp: list("fd_nt_kelp"), coral: list("fd_nt_coral"), grass: list("fd_nt_seagrass"), current: list("fd_nt_current"), ledge: list("fd_nt_ledge"), hole: list("fd_nt_bluehole"), clam: list("fd_nt_clam"), boulder: list("fd_nt_boulder"), wall: list("fd_nt_reefwall"), arch: list("fd_nt_arch") };
  return ZCACHE;
}
// ระยะถึงชนิดที่ใกล้สุด (ช่อง) — ใช้ผสมสีพื้นให้กลืนกันเป็นโซน
export function nearDist(list, x, y) { let d = 99; for (const t of list) { const v = Math.hypot(t.x + 0.5 - x, t.y + 0.5 - y); if (v < d) d = v; } return d; }

// ---------- รูปทรงพื้นฐาน ----------
export function blobAt(g, x, y, r, z = 0, n = 18, seed = 1, wob = 0.18) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, rr = r * (1 + (hash(seed, i % n) - 0.5) * 2 * wob);
    const p = P(x + Math.cos(a) * rr, y + Math.sin(a) * rr, z);
    i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
  }
  g.closePath();
}
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t), gg = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t), bb = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `rgb(${r},${gg},${bb})`;
}

// =================================================================== ธีม (อบ)
export const theme = {
  pal: PAL,
  // มวลน้ำ: ผิวน้ำสว่างด้านบน → ลึกลงด้านล่าง · ลำแสงแดด · เงาภูเขาใต้ทะเลไกลๆ หลายชั้นหมอก
  back(c) {
    const { g, C, bY, VX0, VW, VY0, VY1 } = c;
    const gr = g.createLinearGradient(0, VY0, 0, bY + 40);
    gr.addColorStop(0, "#2a8a9a"); gr.addColorStop(0.25, C.sky[0]); gr.addColorStop(0.7, C.sky[1]); gr.addColorStop(1, C.sky[2]);
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY + 40 - VY0);
    // แสงผิวน้ำ (คลื่นด้านบนจอ)
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 40; i++) { const x = VX0 + hash(i, 1) * VW, y = VY0 + hash(i, 2) * 50, w = 40 + hash(i, 3) * 120; g.fillStyle = `rgba(190,250,250,${0.05 + hash(i, 4) * 0.08})`; g.beginPath(); g.ellipse(x, y, w, 4 + hash(i, 5) * 6, 0, 0, TAU); g.fill(); }
    // ลำแสงแดดเฉียง
    for (let i = 0; i < 9; i++) {
      const x = VX0 + VW * (0.05 + i * 0.11 + hash(i, 7) * 0.04), w = 20 + hash(i, 8) * 70, len = (bY - VY0) * (0.9 + hash(i, 9) * 0.5);
      const lg = g.createLinearGradient(0, VY0, 0, VY0 + len); lg.addColorStop(0, `rgba(170,240,240,${0.1 + hash(i, 6) * 0.08})`); lg.addColorStop(1, "rgba(170,240,240,0)");
      g.fillStyle = lg; g.beginPath(); g.moveTo(x, VY0); g.lineTo(x + w, VY0); g.lineTo(x + w + len * 0.3, VY0 + len); g.lineTo(x + len * 0.3 - w * 0.4, VY0 + len); g.closePath(); g.fill();
    }
    g.restore();
    // ภูเขาใต้ทะเลไกล 3 ชั้น (ไกลสุดจางสุด) + ยอดหินปะการังแหลม
    const ridge = (y0, amp, col, seed, spikes) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(VX0, bY + 30);
      for (let x = 0; x <= VW; x += 14) {
        const u = x / VW, h = Math.sin(u * 7 + seed) * 0.5 + Math.sin(u * 17 + seed * 2) * 0.3 + Math.sin(u * 41 + seed) * 0.12;
        let yy = y0 - amp * (0.6 + h * 0.5);
        if (spikes && hash(Math.floor(x / 14), seed) > 0.93) yy -= amp * 0.9;
        g.lineTo(VX0 + x, yy);
      }
      g.lineTo(VX0 + VW, bY + 30); g.closePath(); g.fill();
    };
    ridge(bY - 40, 70, "rgba(12,70,84,.55)", 1, false);
    ridge(bY - 18, 55, "rgba(8,52,64,.75)", 3, true);
    ridge(bY + 4, 34, "rgba(5,36,46,.95)", 5, true);
    // ฝูงปลาไกล (เงา)
    g.fillStyle = "rgba(4,30,40,.6)";
    for (let s = 0; s < 3; s++) {
      const cx = VX0 + VW * (0.2 + s * 0.3), cy = VY0 + (bY - VY0) * (0.35 + hash(s, 3) * 0.3);
      for (let i = 0; i < 26; i++) { const x = cx + (hash(s * 50 + i, 1) - 0.5) * 140, y = cy + (hash(s * 50 + i, 2) - 0.5) * 40; g.beginPath(); g.ellipse(x, y, 4, 1.5, 0, 0, TAU); g.fill(); }
    }
    void VY1;
  },
  // พื้นทะเลนอกกระดาน: ทราย/หินจางลงในหมอกตามระยะ
  ground(c) {
    const { g, C, R, bY, wx0, wx1, wy1 } = c, { cols, rows } = sceneSize();
    // พื้นทะเลต่อเนื่องรอบกระดาน (กระดานไม่ใช่แผ่นลอย — ผู้ใช้ทัก 2026-11-19) · วงนอกมืดลงตามระยะ · ด้านใต้ = ห้วงลึก
    for (let d = 24; d >= 0; d--) {
      const e = 0.4 + d * 1.2, x0 = -e, y0 = -e, x1 = cols + e, y1 = rows + e * 0.5;
      const pts = [];
      for (let i = 0; i <= 40; i++) { // ขอบเป็นคลื่นนุ่ม (ไม่เป็นสี่เหลี่ยมเห็นชัด)
        const u = i / 40, side = Math.floor(u * 4), f = u * 4 - side, w = (hash(i, d) - 0.5) * 0.9;
        const p = side === 0 ? [x0 + (x1 - x0) * f, y0 + w] : side === 1 ? [x1 + w, y0 + (y1 - y0) * f] : side === 2 ? [x1 - (x1 - x0) * f, y1 + w] : [x0 + w, y1 - (y1 - y0) * f];
        pts.push(PS(p[0], p[1]));
      }
      g.fillStyle = mix(C.sandDark, "#04161e", Math.min(1, 0.1 + d / 22)); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    }
    const n = Math.min(700, Math.round((wx1 - wx0) * (wy1 + 1) * 0.4));
    for (let i = 0; i < n; i++) {
      const x = wx0 + R() * (wx1 - wx0), y = -2 + R() * (wy1 + 2);
      const [sx, sy, s] = PS(x, y); if (sy < bY) continue;
      g.fillStyle = R() < 0.6 ? "rgba(90,130,125,.18)" : "rgba(20,45,50,.35)";
      g.beginPath(); g.ellipse(sx, sy, s * (0.3 + R() * 0.6), s * (0.08 + R() * 0.1), 0, 0, TAU); g.fill();
    }
  },
  // ข้างกระดาน: กองหินปะการังและเคลป์ไกล (ซ้าย/ขวา) · ด้านไกลเป็นสันปะการัง
  side(c) {
    const { g, C, VX0, VX1, VW } = c, { cols, rows } = sceneSize();
    const rs = rng(77), band = 3 + Math.max(0, (VW - 1280) / 60), list = [];
    for (let i = 0; i < 90; i++) { list.push([-1.2 - rs() * band, rs() * (rows + 1) - 0.5, rs()]); list.push([cols + 0.2 + rs() * band, rs() * (rows + 1) - 0.5, rs()]); }
    for (let i = 0; i < 40; i++) list.push([rs() * (cols + 4) - 2, -1.2 - rs() * 3, rs()]);
    list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
      const [sx, sy, s] = PS(x, y); if (sx < VX0 - 100 || sx > VX1 + 100) return;
      const fog = clamp((-y + Math.max(0, -x, x - cols)) / 8, 0, 0.7);
      if (r < 0.45) { rockMound(g, sx, sy, s * (0.9 + r), C, r * 99); coralTop(g, sx, sy - s * 0.5, s * 0.8, r * 99, 1 - fog); }
      else if (r < 0.75) kelpStatic(g, sx, sy, s * (1.6 + r * 1.5), C, r * 99);
      else coralTop(g, sx, sy, s * 0.9, r * 99, 1 - fog);
      if (fog > 0) { g.fillStyle = `rgba(10,50,62,${fog})`; g.beginPath(); g.ellipse(sx, sy - s * 0.6, s * 1.1, s * 0.9, 0, 0, TAU); g.fill(); }
    });
  },
  // พื้นกระดานทั้งผืน: โซนกลืนกันด้วยก้อนวงกลมซ้อน (แบบสนาม Eos) — ไม่ลงสีทีละช่อง
  base(c) {
    const { g, C, info } = c;
    const Z = zones(info);
    const cols = info.cols, rows = info.rows;
    // 1) พื้นหินฐาน: เฉพาะใต้กระดาน (กลืนกับพื้นทะเลรอบนอกที่ theme.ground วาดไว้)
    { const q = [P(-0.2, -0.2), P(cols + 0.2, -0.2), P(cols + 0.2, rows + 0.2), P(-0.2, rows + 0.2)]; g.fillStyle = C.rockBed; g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); }
    // 2) ทรายทั่วไป: ช่องที่ไม่ใช่เคลป์/ผา → ทราย (สีไล่ตามระยะจากกลางลากูน)
    const cx = cols * 0.5, cy = rows * 0.5;
    for (let y = -1; y <= rows; y++) for (let x = -1; x <= cols; x++) {
      const dk = nearDist(Z.kelp, x + 0.5, y + 0.5), dl = nearDist(Z.ledge, x + 0.5, y + 0.5);
      if (dk < 1.2 || dl < 0.8) continue;
      const t = clamp(Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.2) / (cols * 0.55), 0, 1);
      blobAt(g, x + 0.5, y + 0.5, 0.78, 0, 12, x * 31 + y * 7, 0.22);
      g.fillStyle = mix(C.sand2, C.sandDark, t); g.fill();
    }
    // 3) ป่าเคลป์: โคลนมืดเป็นผืน (ขอบนุ่ม 2 ชั้น)
    for (const [r, col, a] of [[1.25, C.mud2, 0.6], [0.85, C.mud, 1]]) for (const t of Z.kelp) { blobAt(g, t.x + 0.5, t.y + 0.5, r, 0, 12, t.x * 13 + t.y, 0.25); g.globalAlpha = a; g.fillStyle = col; g.fill(); }
    g.globalAlpha = 1;
    // 4) สวนปะการัง: พื้นสาหร่ายสีม่วงอมชมพูเป็นปื้น
    for (const t of [...Z.coral, ...Z.boulder.filter((b) => b.x > cols / 2)]) {
      blobAt(g, t.x + 0.5, t.y + 0.5, 0.95, 0, 12, t.x * 17 + t.y * 3, 0.3);
      g.fillStyle = (t.x + t.y) % 2 ? C.algae : C.algae2; g.globalAlpha = 0.75; g.fill(); g.globalAlpha = 1;
    }
    // 5) ร่องกระแสน้ำ: ทรายขาวนวลเป็นแถบยาว + ลอนตามทิศไหล
    for (const t of Z.current) { blobAt(g, t.x + 0.5, t.y + 0.5, 0.7, 0, 10, t.x * 5 + t.y, 0.12); g.fillStyle = "#a9c6b6"; g.globalAlpha = 0.55; g.fill(); }
    g.globalAlpha = 1;
    // 6) ลอนทราย (ลากูน) — เส้นโค้งขนานทั้งลากูน
    g.strokeStyle = "rgba(220,245,235,.16)"; g.lineWidth = 1.2;
    for (let y = 0.3; y < rows; y += 0.55) {
      g.beginPath(); let on = false;
      for (let x = 0; x <= cols; x += 0.25) {
        const yy = y + Math.sin(x * 1.3 + y * 2) * 0.12;
        const ok = nearDist(Z.kelp, x, yy) > 1.3 && nearDist(Z.coral, x, yy) > 1.1 && nearDist(Z.ledge, x, yy) > 1 && nearDist(Z.wall, x, yy) > 0.9;
        const p = P(x, yy, 0.005);
        if (ok) { on ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); on = true; } else on = false;
      }
      g.stroke();
    }
    // 7) ขอบผาด้านใต้: พื้นมืดลงสู่ห้วงลึก + ขอบผา
    for (const t of Z.ledge) {
      const depth = clamp((t.y - (rows - 4)) / 3, 0, 1);
      blobAt(g, t.x + 0.5, t.y + 0.5, 0.8, 0, 12, t.x * 3 + t.y * 11, 0.18);
      g.fillStyle = mix(C.ledge, C.abyss, depth * 0.7); g.fill();
    }
    // ขอบผา: แถบมืดลงตามแนวขอบใต้บนพื้น (ไม่ยื่นเป็นแผ่นนอกกระดาน — หมุนกล้อง/มุมนก แล้วไม่เพี้ยน)
    for (let k = 0; k < 8; k++) { // แถบไล่มืดนุ่มๆ จาก 1.6 ช่องก่อนขอบใต้ ถึงขอบ
      const y0 = rows - 1.6 + k * 0.2, q = [P(-0.2, y0), P(cols + 0.2, y0), P(cols + 0.2, rows + 0.2), P(-0.2, rows + 0.2)];
      g.fillStyle = "rgba(1,6,12,.11)"; g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    }
    // 8) หลุมน้ำเงิน: วงหินรอบ → ดำสนิทตรงกลาง
    if (Z.hole.length) {
      const hx = Z.hole.reduce((s, t) => s + t.x + 0.5, 0) / Z.hole.length, hy = Z.hole.reduce((s, t) => s + t.y + 0.5, 0) / Z.hole.length, hr = Math.sqrt(Z.hole.length / Math.PI) + 0.35;
      blobAt(g, hx, hy, hr + 0.45, 0, 26, 9, 0.12); g.fillStyle = "#2b3f40"; g.fill();
      for (let i = 0; i < 6; i++) {
        const r = hr * (1 - i / 6);
        blobAt(g, hx, hy, r, -i * 0.35, 26, 9 + i, 0.08);
        g.fillStyle = mix("#0c3a52", "#000308", i / 5); g.fill();
      }
    }
    // 9) ถ้ำใต้ซุ้มหิน: เงาดำใต้ซุ้ม
    if (Z.arch.length) {
      const ax = Z.arch.reduce((s, t) => s + t.x + 0.5, 0) / Z.arch.length, ay = Z.arch.reduce((s, t) => s + t.y + 0.5, 0) / Z.arch.length;
      blobAt(g, ax, ay, 1.7, 0, 20, 4, 0.2); g.fillStyle = "rgba(0,8,12,.45)"; g.fill();
    }
    // 10) ก้อนกรวด เปลือกหอย ดาวทะเล บนทราย (เฉพาะลากูน)
    const R = rng(55);
    for (let i = 0; i < cols * rows * 0.9; i++) {
      const x = R() * cols, y = R() * rows;
      if (nearDist(Z.kelp, x, y) < 1.3 || nearDist(Z.ledge, x, y) < 1 || nearDist(Z.hole, x, y) < 1.5) continue;
      const [sx, sy, s] = P(x, y, 0.01), k = R();
      if (k < 0.7) { g.fillStyle = R() < 0.5 ? "rgba(40,60,58,.5)" : "rgba(200,220,210,.35)"; g.beginPath(); g.ellipse(sx, sy, s * 0.04, s * 0.02, 0, 0, TAU); g.fill(); }
      else if (k < 0.9) { g.fillStyle = "rgba(230,215,200,.55)"; g.beginPath(); g.arc(sx, sy, s * 0.035, Math.PI, TAU); g.fill(); }
      else { star(g, sx, sy, s * 0.07, R() < 0.5 ? "#d0703a" : "#c2486a"); }
    }
  },
  // เส้นตารางจางมาก (ภูมิประเทศเด่นกว่าตาราง) — ไม่ขีดทับหลุม/ผา
  grid({ g, C, info }) {
    const Z = zones(info);
    g.strokeStyle = C.grid; g.lineWidth = 1;
    for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
      const k = Z.kindAt(x, y);
      if (k === "fd_nt_bluehole" || k === "fd_nt_reefwall" || k === "fd_nt_arch") continue;
      const a = P(x, y), b = P(x + 1, y), c2 = P(x + 1, y + 1);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.stroke();
    }
    return true;
  },
};
function star(g, x, y, r, col) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.4 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.5; i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.fill();
}
// ก้อนหินปะการัง (จุดบนจอ)
function rockMound(g, x, y, s, C, seed) {
  g.fillStyle = "rgba(0,10,14,.45)"; g.beginPath(); g.ellipse(x, y, s * 0.55, s * 0.18, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(x - s * 0.5, y);
  for (let i = 0; i <= 8; i++) { const u = i / 8, h = Math.sin(u * Math.PI) * s * (0.55 + hash(seed, i) * 0.35); g.lineTo(x - s * 0.5 + u * s, y - h); }
  g.closePath(); g.fillStyle = C.rock[1]; g.fill();
  g.beginPath(); g.ellipse(x - s * 0.12, y - s * 0.42, s * 0.22, s * 0.12, -0.3, 0, TAU); g.fillStyle = C.rock[0]; g.fill();
}
function coralTop(g, x, y, s, seed, a = 1) {
  const R = rng(seed * 13 + 7);
  g.globalAlpha = a;
  for (let i = 0; i < 3; i++) {
    const col = BASE.coralCols[Math.floor(R() * BASE.coralCols.length)], ox = (R() - 0.5) * s * 0.7, k = R();
    if (k < 0.4) branch(g, x + ox, y, s * (0.5 + R() * 0.4), col, R, 0);
    else if (k < 0.7) fan(g, x + ox, y, s * (0.5 + R() * 0.3), col, 0);
    else { g.fillStyle = col; g.beginPath(); g.ellipse(x + ox, y - s * 0.12, s * 0.2, s * 0.14, 0, 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
}
export function branch(g, x, y, h, col, R, sway) {
  g.strokeStyle = col; g.lineCap = "round";
  const tw = (x0, y0, len, ang, w, d) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (d > 0) { tw(x1, y1, len * 0.72, ang - 0.5 + sway, w * 0.7, d - 1); tw(x1, y1, len * 0.72, ang + 0.5 + sway, w * 0.7, d - 1); }
  };
  tw(x, y, h * 0.42, -Math.PI / 2 + (R() - 0.5) * 0.3 + sway, Math.max(1.2, h * 0.09), 2);
  g.lineCap = "butt";
}
export function fan(g, x, y, h, col, sway) {
  g.fillStyle = col; g.globalAlpha *= 0.85;
  g.beginPath(); g.moveTo(x, y);
  for (let i = 0; i <= 10; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 10) + sway; g.lineTo(x + Math.cos(a) * h * 0.55, y + Math.sin(a) * h); }
  g.closePath(); g.fill(); g.globalAlpha /= 0.85;
  g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.8;
  for (let i = 0; i <= 6; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 6) + sway; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * h * 0.5, y + Math.sin(a) * h * 0.9); g.stroke(); }
}
function kelpStatic(g, x, y, h, C, seed) {
  g.strokeStyle = C.kelp[seed % 3 | 0]; g.lineWidth = Math.max(2, h * 0.05); g.lineCap = "round";
  g.beginPath(); g.moveTo(x, y);
  for (let i = 1; i <= 8; i++) g.lineTo(x + Math.sin(i * 0.8 + seed) * h * 0.06, y - h * i / 8);
  g.stroke(); g.lineCap = "butt";
}

// =================================================================== สิ่งกีดขวาง (วาดตามลำดับความลึกของ boardProps)
export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t, C = PAL[ctx && ctx.night ? "night" : "day"], conn = t.conn || {};
  if (kind === "fd_nt_bluehole" || kind === "fd_nt_whale" || kind === "fd_nt_ship") return; // เรือ = shipArt (ชิ้นเดียวทั้งลำ) // หลุม = อบลงพื้นแล้ว · ลำตัวปลาวาฬ = thalassaArt
  if (kind === "fd_nt_reefwall") { reefWall(g, x, y, conn, C, now); return; }
  if (kind === "fd_nt_boulder") { brainCoral(g, x, y, C); return; }
  if (kind === "fd_nt_arch") { archPillar(g, x, y, conn, C); return; }
}
// สันแนวปะการัง: หินก้อนโตต่อกันเป็นกำแพง (ช่องข้างเคียงชนิดเดียวกัน = เชื่อมกัน) + ปะการังขึ้นข้างบน
function reefWall(g, x, y, conn, C, now) {
  const cx = x + 0.5, cy = y + 0.5, H = 1.5 + hash(x, y) * 0.8;
  // เงาฐาน
  const [bx, by, s] = P(cx, cy);
  g.fillStyle = "rgba(0,8,12,.45)"; g.beginPath(); g.ellipse(bx, by, s * 0.75, s * 0.3, 0, 0, TAU); g.fill();
  // ตัวหิน: ทรงก้อนโค้งเหลื่อมไปทางช่องที่เชื่อม (ดูเป็นสันต่อเนื่อง)
  const ext = (d) => (d ? 0.62 : 0.42);
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * TAU, ca = Math.cos(a), sa = Math.sin(a);
    const r = ca > 0 ? ext(conn.r) * Math.abs(ca) : ext(conn.l) * Math.abs(ca);
    const rr = sa > 0 ? ext(conn.d) * Math.abs(sa) : ext(conn.u) * Math.abs(sa);
    pts.push([cx + ca * Math.max(r, 0.25) * (0.9 + hash(x * 7 + i, y) * 0.2), cy + sa * Math.max(rr, 0.25) * (0.9 + hash(x, y * 7 + i) * 0.2)]);
  }
  // ด้านข้าง: เติมทีละแถบ (ฐาน i → i+1 → ยอด) — วงฐาน+วงยอดในเส้นทางเดียวหักล้างกันเอง (ไม่ติดสี)
  const zt = (i) => H * (0.85 + hash(i % 16, x + y) * 0.15);
  const order = [...Array(pts.length - 1).keys()].sort((i, j) => depthOf((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2) - depthOf((pts[j][0] + pts[j + 1][0]) / 2, (pts[j][1] + pts[j + 1][1]) / 2)); // ด้านหลังก่อน
  for (const i of order) {
    const a = P(pts[i][0], pts[i][1], 0), b = P(pts[i + 1][0], pts[i + 1][1], 0), c2 = P(pts[i + 1][0], pts[i + 1][1], zt(i + 1)), d = P(pts[i][0], pts[i][1], zt(i));
    g.fillStyle = (i % 3) ? C.rock[2] : mix(C.rock[2], C.rock[1], 0.35);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
  }
  // ฝาบน
  g.fillStyle = C.rock[1]; g.beginPath();
  pts.forEach(([px, py], i) => { const p = P(px, py, zt(i)); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); });
  g.closePath(); g.fill();
  const top = P(cx - 0.12, cy - 0.12, H + 0.02); g.fillStyle = C.rock[0]; g.beginPath(); g.ellipse(top[0], top[1], s * 0.22, s * 0.1, -0.3, 0, TAU); g.fill();
  // ปะการังบนสัน (โยกช้าๆ)
  const R = rng(x * 97 + y * 13), sway = Math.sin(now / 1400 + x + y) * 0.08;
  for (let i = 0; i < 3; i++) {
    const p = P(cx + (R() - 0.5) * 0.6, cy + (R() - 0.5) * 0.5, H * 0.95), col = BASE.coralCols[Math.floor(R() * BASE.coralCols.length)], k = R();
    if (k < 0.45) branch(g, p[0], p[1], s * (0.35 + R() * 0.3), col, R, sway);
    else if (k < 0.8) fan(g, p[0], p[1], s * (0.35 + R() * 0.25), col, sway);
    else { g.fillStyle = col; g.beginPath(); g.ellipse(p[0], p[1] - s * 0.05, s * 0.13, s * 0.08, 0, 0, TAU); g.fill(); }
  }
}
// ปะการังสมอง: โดมมีร่องคดเคี้ยว
function brainCoral(g, x, y, C) {
  const [cx, cy, s] = P(x + 0.5, y + 0.5);
  g.fillStyle = "rgba(0,8,12,.4)"; g.beginPath(); g.ellipse(cx, cy, s * 0.48, s * 0.2, 0, 0, TAU); g.fill();
  const col = hash(x, y) < 0.5 ? "#c9a25a" : "#a6b86a";
  g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy - s * 0.18, s * 0.42, s * 0.3, 0, Math.PI, TAU); g.lineTo(cx + s * 0.42, cy); g.ellipse(cx, cy, s * 0.42, s * 0.12, 0, 0, Math.PI); g.fill();
  g.strokeStyle = "rgba(60,40,20,.45)"; g.lineWidth = 1;
  for (let i = 0; i < 5; i++) { g.beginPath(); for (let j = 0; j <= 10; j++) { const u = j / 10, xx = cx - s * 0.36 + u * s * 0.72, yy = cy - s * (0.08 + i * 0.07) + Math.sin(u * 14 + i) * s * 0.02; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
  g.fillStyle = "rgba(255,255,230,.18)"; g.beginPath(); g.ellipse(cx - s * 0.12, cy - s * 0.32, s * 0.14, s * 0.06, -0.3, 0, TAU); g.fill();
  void C;
}
// ซุ้มหิน: เสาหินสูงเอียง + คานเชื่อมไปทางเสาข้างเคียง
function archPillar(g, x, y, conn, C) {
  const cx = x + 0.5, cy = y + 0.5, H = 2.1 + hash(x, y) * 0.6;
  // หินขรุขระ: รัศมีสั่นตามมุม (ไม่ใช่ทรงกระบอกเรียบ) · ยอดเอียงไปทางเสาข้างเคียง
  const lean = conn.r ? 0.12 : conn.l ? -0.12 : 0;
  const ring = (z, r) => { const pts = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU, rr = r * (0.75 + hash(i % 12, x * 7 + y * 3 + (z > 0 ? 5 : 0)) * 0.55); pts.push(P(cx + Math.cos(a) * rr + (z > 0 ? lean : 0), cy + Math.sin(a) * rr, z)); } return pts; };
  const b = ring(0, 0.42), t = ring(H, 0.3);
  g.fillStyle = "rgba(0,8,12,.45)"; g.beginPath(); g.ellipse(b[0][0] - (b[0][0] - b[6][0]) / 2, (b[3][1] + b[9][1]) / 2, Math.abs(b[0][0] - b[6][0]) * 0.7, Math.abs(b[3][1] - b[9][1]) * 0.7, 0, 0, TAU); g.fill();
  const ang = (i) => ((i + 0.5) / 12) * TAU;
  const order = [...Array(b.length - 1).keys()].sort((i, j) => depthOf(cx + Math.cos(ang(i)), cy + Math.sin(ang(i))) - depthOf(cx + Math.cos(ang(j)), cy + Math.sin(ang(j))));
  for (const i of order) { // ทีละแถบ ด้านหลังก่อน (กันวงหักล้าง)
    g.fillStyle = i % 3 ? C.rock[2] : mix(C.rock[2], C.rock[1], 0.4);
    g.beginPath(); g.moveTo(b[i][0], b[i][1]); g.lineTo(b[i + 1][0], b[i + 1][1]); g.lineTo(t[i + 1][0], t[i + 1][1]); g.lineTo(t[i][0], t[i][1]); g.closePath(); g.fill();
  }
  g.fillStyle = C.rock[1]; g.beginPath(); t.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
  // คานหินไปทางขวา/ลง (ไม่ซ้ำสองฝั่ง)
  for (const [ok, dx, dy] of [[conn.r, 1, 0], [conn.d, 0, 1]]) {
    if (!ok) continue;
    const a0 = P(cx, cy, H - 0.2), a1 = P(cx + dx * 0.5, cy + dy * 0.5, H + 0.25), a2 = P(cx + dx, cy + dy, H - 0.2);
    g.strokeStyle = C.rock[1]; g.lineWidth = P(cx, cy)[2] * 0.35; g.lineCap = "round";
    g.beginPath(); g.moveTo(a0[0], a0[1]); g.quadraticCurveTo(a1[0], a1[1], a2[0], a2[1]); g.stroke(); g.lineCap = "butt";
  }
  // ฟองน้ำ/สาหร่ายสีเกาะตามผิวหิน (ด้านหน้ากล้อง)
  const R2 = rng(x * 41 + y * 17);
  for (let i = 0; i < 7; i++) {
    const zz = H * (0.1 + R2() * 0.8), a = R2() * TAU, q = P(cx + Math.cos(a) * 0.28, cy + Math.sin(a) * 0.28 + 0.15, zz), ss = q[2];
    g.fillStyle = ["rgba(200,90,140,.75)", "rgba(230,150,70,.7)", "rgba(110,180,120,.7)", "rgba(150,110,200,.7)"][i % 4];
    g.beginPath(); g.ellipse(q[0], q[1], ss * (0.05 + R2() * 0.06), ss * (0.03 + R2() * 0.03), 0, 0, TAU); g.fill();
  }
  // สาหร่ายห้อยและปะการังเกาะ
  const [px, py, s] = P(cx, cy, H * 0.7);
  g.strokeStyle = "rgba(90,140,80,.8)"; g.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(px + (i - 1.5) * s * 0.1, py); g.lineTo(px + (i - 1.5) * s * 0.12, py + s * (0.3 + hash(i, x) * 0.3)); g.stroke(); }
}

// =================================================================== ของที่เรียงความลึกกับตัวละคร (ขยับได้)
export function items(list, g, fd, info, units, now, lowQ) {
  const Z = zones(info), t = now / 1000;
  // ป่าเคลป์: ต้นสูงหลายต้นต่อช่อง โยกเป็นคลื่นตามกระแส (ไม่ใช่ไอคอนเดียวกันวางซ้ำ — ความสูง/จำนวน/สีต่างกันตามตำแหน่ง)
  for (const k of Z.kelp) {
    const n = 2 + Math.floor(hash(k.x, k.y) * 3);
    for (let i = 0; i < n; i++) {
      const ox = 0.2 + hash(k.x * 3 + i, k.y) * 0.6, oy = 0.2 + hash(k.x, k.y * 3 + i) * 0.6, x = k.x + ox, y = k.y + oy;
      const h = 2.2 + hash(i, k.x + k.y) * 1.8;
      list.push({ d: depthOf(x, y), f: () => kelpStalk(g, x, y, h, t, i + k.x, lowQ) });
    }
  }
  // สวนปะการัง: กอผสม (กิ่ง พัด ดอกไม้ทะเลโบกหนวด) ต่างกันทุกช่อง
  for (const c of Z.coral) {
    const R = rng(c.x * 131 + c.y * 17), n = 3 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const x = c.x + 0.15 + R() * 0.7, y = c.y + 0.15 + R() * 0.7, kind = R(), col = BASE.coralCols[Math.floor(R() * BASE.coralCols.length)], h = 0.5 + R() * 0.5, seed = R() * 1000;
      list.push({ d: depthOf(x, y), f: () => coralPiece(g, x, y, h, col, kind, seed, t) });
    }
  }
  // ทุ่งหญ้าทะเล
  if (!lowQ) for (const s of Z.grass) list.push({ d: depthOf(s.x + 0.5, s.y + 0.5) - 0.3, f: () => seagrass(g, s.x, s.y, t) });
  // หอยมุกยักษ์ (ลูกเล่นขั้น 3 — ตอนนี้เป็นของประดับ)
  for (const c of Z.clam) list.push({ d: depthOf(c.x + 0.5, c.y + 0.5), f: () => giantClam(g, c.x + 0.5, c.y + 0.5, t) });
  shipItems(list, g, fd, info, now, lowQ);
  reefItems(list, g, fd, info, now);
  void units;
}
function kelpStalk(g, x, y, h, t, seed, lowQ) {
  const segs = lowQ ? 6 : 12, pts = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, sway = Math.sin(t * 0.9 + seed + u * 2.2) * 0.25 * u * u + Math.sin(t * 1.7 + seed * 2) * 0.05 * u;
    pts.push(P(x + sway, y + sway * 0.3, h * u));
  }
  const s = pts[0][2];
  g.strokeStyle = BASE.kelp[seed % 3 | 0]; g.lineWidth = Math.max(1.5, s * 0.06); g.lineCap = "round";
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  // ใบ (แผ่นยาวสลับข้าง)
  g.fillStyle = "rgba(110,140,60,.85)";
  for (let i = 2; i < pts.length; i += 2) {
    const p = pts[i], side = i % 4 ? 1 : -1, lw = s * 0.28;
    g.beginPath(); g.ellipse(p[0] + side * lw * 0.5, p[1], lw * 0.55, s * 0.05, side * 0.5 + Math.sin(t + i) * 0.2, 0, TAU); g.fill();
  }
  // ลูกลอย (กระเปาะอากาศ) ที่ยอด
  const tp = pts[pts.length - 1]; g.fillStyle = "#93a64a"; g.beginPath(); g.arc(tp[0], tp[1], s * 0.05, 0, TAU); g.fill();
  g.lineCap = "butt";
}
function coralPiece(g, x, y, h, col, kind, seed, t) {
  const [bx, by, s] = P(x, y), sway = Math.sin(t * 1.1 + seed) * 0.08;
  if (kind < 0.35) branch(g, bx, by, s * h, col, rng(seed | 0), sway);
  else if (kind < 0.6) fan(g, bx, by, s * h * 0.9, col, sway);
  else if (kind < 0.85) { // ดอกไม้ทะเล: ฐาน + หนวดโบก
    g.fillStyle = col; g.beginPath(); g.ellipse(bx, by - s * 0.05, s * 0.09, s * 0.06, 0, 0, TAU); g.fill();
    g.strokeStyle = col; g.lineWidth = Math.max(1, s * 0.02); g.lineCap = "round";
    for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 8), w = Math.sin(t * 2 + i + seed) * 0.25; g.beginPath(); g.moveTo(bx, by - s * 0.08); g.quadraticCurveTo(bx + Math.cos(a + w) * s * 0.12, by - s * 0.2, bx + Math.cos(a + w * 1.5) * s * 0.2, by - s * 0.08 + Math.sin(a) * s * 0.22); g.stroke(); }
    g.lineCap = "butt";
  } else { // ปะการังท่อ
    g.fillStyle = col;
    for (let i = 0; i < 4; i++) { const ox = (i - 1.5) * s * 0.06, hh = s * h * (0.25 + hash(seed, i) * 0.25); g.fillRect(bx + ox - s * 0.02, by - hh, s * 0.04, hh); g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.ellipse(bx + ox, by - hh, s * 0.022, s * 0.01, 0, 0, TAU); g.fill(); g.fillStyle = col; }
  }
}
function seagrass(g, x, y, t) {
  g.strokeStyle = BASE.grass; g.lineWidth = 1.1;
  for (let i = 0; i < 9; i++) {
    const px = x + 0.1 + hash(x * 9 + i, y) * 0.8, py = y + 0.1 + hash(x, y * 9 + i) * 0.8, h = 0.25 + hash(i, x + y) * 0.25, sw = Math.sin(t * 1.4 + i + x) * 0.08;
    const a = P(px, py, 0), b = P(px + sw, py, h);
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(a[0], (a[1] + b[1]) / 2, b[0], b[1]); g.stroke();
  }
}
function giantClam(g, x, y, t) {
  const [cx, cy, s] = P(x, y), open = 0.15 + 0.1 * Math.sin(t * 0.8 + x);
  g.fillStyle = "rgba(0,8,12,.45)"; g.beginPath(); g.ellipse(cx, cy, s * 0.42, s * 0.16, 0, 0, TAU); g.fill();
  g.fillStyle = "#6f7f86"; g.beginPath(); g.ellipse(cx, cy - s * 0.05, s * 0.38, s * 0.14, 0, 0, TAU); g.fill();
  g.fillStyle = "#3fb6c8"; g.beginPath(); g.ellipse(cx, cy - s * 0.08, s * 0.3, s * open * 0.6, 0, 0, TAU); g.fill(); // เนื้อสีฟ้าเรือง
  glow(g, cx, cy - s * 0.1, s * 0.4, "120,240,255", 0.25 + open);
  g.fillStyle = "#8a9aa0"; g.beginPath(); g.ellipse(cx, cy - s * 0.1 - s * open, s * 0.38, s * 0.12, 0, Math.PI, TAU); g.fill();
  g.strokeStyle = "rgba(40,50,55,.6)"; g.lineWidth = 1;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * s * 0.1, cy - s * 0.1 - s * open); g.lineTo(cx + i * s * 0.11, cy - s * 0.2 - s * open); g.stroke(); }
}

// =================================================================== พื้นทุกเฟรม (ใต้ตัวละคร)
export function ground(g, fd, info, now, lowQ) {
  const Z = zones(info), t = now / 1000;
  // แสงระยิบบนทราย (คลื่นผิวน้ำ 30 ม.) — ก้อนแสงเลื่อนช้าๆ
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const x = (hash(i, 1) * info.cols + Math.sin(t * 0.21 + i) * 1.2 + t * 0.15) % info.cols, y = (hash(i, 2) * info.rows + Math.cos(t * 0.17 + i * 2) * 0.9) % info.rows;
      if (nearDist(Z.kelp, x, y) < 1 || nearDist(Z.ledge, x, y) < 1) continue;
      const [sx, sy, s] = P(x, y), r = s * (0.9 + 0.3 * Math.sin(t * 1.3 + i));
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, r); gr.addColorStop(0, "rgba(190,255,240,.09)"); gr.addColorStop(1, "rgba(190,255,240,0)");
      g.fillStyle = gr; g.beginPath(); g.ellipse(sx, sy, r, r * 0.45, 0, 0, TAU); g.fill();
    }
    g.restore();
  }
  // ร่องกระแสน้ำ: ขีดเลื่อนไปทางตะวันออก
  g.strokeStyle = "rgba(220,250,245,.35)"; g.lineWidth = 1.4;
  for (const c of Z.current) for (let i = 0; i < 2; i++) {
    const u = ((t * 0.6 + hash(c.x, c.y + i)) % 1), yy = c.y + 0.3 + i * 0.4;
    const a = P(c.x + u, yy, 0.02), b = P(c.x + Math.min(1, u + 0.3), yy, 0.02);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  drawThalassaGround(g, fd, info, now);
}

// ปลาตัวเดียว หันหัวไปตามทิศว่ายบนจอ (ang) — หางอยู่ท้ายเสมอ
export function fish(g, x, y, w, ang, col) {
  g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col;
  g.beginPath(); g.ellipse(0, 0, w, w * 0.38, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-w * 0.9, 0); g.lineTo(-w * 1.6, -w * 0.42); g.lineTo(-w * 1.6, w * 0.42); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,.6)"; g.beginPath(); g.arc(w * 0.55, -w * 0.08, w * 0.09, 0, TAU); g.fill();
  g.restore();
}

// =================================================================== ทับตัวละคร
const FISH = Array.from({ length: 4 }, (_, s) => ({ s, n: 12 + s * 3, col: ["#f2c14e", "#7fd6ff", "#ff8a5c", "#c7f0ff"][s] }));
const JELLY = Array.from({ length: 4 }, (_, i) => i);
export function air(g, fd, info, units, now, lowQ, view) {
  const t = now / 1000, cols = info.cols, rows = info.rows;
  // ฝูงปลา: ศูนย์กลางฝูงว่ายวนรอบโซน ตัวในฝูงกระจายตาม hash (เลี้ยวพร้อมกัน)
  if (!lowQ) for (const f of FISH) {
    const sp = 0.12 + f.s * 0.03, a = t * sp + f.s * 1.7, at = (q) => [cols * (0.5 + 0.38 * Math.cos(q)), rows * (0.45 + 0.32 * Math.sin(q * 1.3))];
    const [cx, cy] = at(a), [nx, ny] = at(a + 0.02), p0 = P(cx, cy, 2), p1 = P(nx, ny, 2), ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]); // ทิศว่ายจริงบนจอ (หมุนกล้องก็ถูก — ผู้ใช้ทักปลาว่ายกลับด้าน)
    for (let i = 0; i < f.n; i++) {
      const ox = (hash(f.s * 40 + i, 1) - 0.5) * 2.2 + Math.sin(t * 2 + i) * 0.15, oy = (hash(f.s * 40 + i, 2) - 0.5) * 1.4, z = 1.6 + hash(i, f.s) * 1.4;
      const [sx, sy, s] = P(cx + ox, cy + oy, z);
      fish(g, sx, sy, s * 0.13, ang + Math.sin(t * 3 + i) * 0.08, f.col);
    }
  }
  // แมงกะพรุนเรืองแสง ลอยขึ้นช้าๆ ข้ามกระดาน
  for (const i of JELLY) {
    const k = ((t * 0.03 + hash(i, 5)) % 1), x = cols * (0.1 + hash(i, 6) * 0.8) + Math.sin(t * 0.4 + i) * 0.8, y = rows * (0.15 + hash(i, 7) * 0.7), z = 0.5 + k * 4;
    const [sx, sy, s] = P(x, y, z), r = s * 0.22, pulse = 1 + 0.12 * Math.sin(t * 3 + i * 2), a = Math.sin(k * Math.PI);
    glow(g, sx, sy, r * 3, "200,150,255", 0.25 * a);
    g.fillStyle = `rgba(220,190,255,${0.55 * a})`; g.beginPath(); g.ellipse(sx, sy, r * pulse, r * 0.7 / pulse, 0, Math.PI, TAU); g.fill();
    g.strokeStyle = `rgba(220,190,255,${0.45 * a})`; g.lineWidth = 1;
    for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(sx + (j - 2) * r * 0.35, sy); for (let q = 1; q <= 5; q++) g.lineTo(sx + (j - 2) * r * 0.35 + Math.sin(t * 2 + q + j) * r * 0.15, sy + q * r * 0.35); g.stroke(); }
  }
  // ฟองจากช่องฟื้นฟู (ฟองอากาศ) + จากหลุมน้ำเงิน
  const Z = zones(info);
  for (const h of info.heal || []) for (let i = 0; i < 5; i++) {
    const k = ((t * 0.35 + i / 5 + hash(h.x, h.y)) % 1), [sx, sy, s] = P(h.x + 0.5 + Math.sin(t * 2 + i) * 0.08, h.y + 0.5, k * 3.2);
    g.strokeStyle = `rgba(210,250,255,${0.7 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, s * (0.03 + i * 0.008), 0, TAU); g.stroke();
  }
  // หลุมน้ำเงิน: มีอะไรบางอย่างขยับข้างใต้ (ดวงตาเรืองแสงกะพริบเป็นพักๆ — ความน่ากลัว)
  if (Z.hole.length) {
    const hx = Z.hole.reduce((s, q) => s + q.x + 0.5, 0) / Z.hole.length, hy = Z.hole.reduce((s, q) => s + q.y + 0.5, 0) / Z.hole.length;
    const slot = Math.floor(t / 9), d = t - slot * 9 - hash(slot, 3) * 5;
    if (d > 0 && d < 1.6) {
      const a = Math.sin((d / 1.6) * Math.PI), [sx, sy, s] = P(hx + (hash(slot, 4) - 0.5), hy + (hash(slot, 5) - 0.5) * 0.6, -0.4);
      for (const ex of [-1, 1]) { glow(g, sx + ex * s * 0.18, sy, s * 0.15, "255,210,120", 0.8 * a); g.fillStyle = `rgba(255,230,160,${a})`; g.beginPath(); g.ellipse(sx + ex * s * 0.18, sy, s * 0.04, s * 0.02, 0, 0, TAU); g.fill(); }
    }
  }
  // ลำแสงเคลื่อนไหวจากผิวน้ำ (ทับทั้งจอ จาง)
  const X0 = view ? view.x0 : 0, W = view ? view.x1 - view.x0 : 1280, Y0 = view ? view.y0 : 0, H = view ? view.y1 - view.y0 : 720;
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const x = X0 + W * (0.1 + i * 0.2) + Math.sin(t * 0.2 + i * 1.7) * W * 0.05, w = W * (0.025 + 0.015 * Math.sin(t * 0.3 + i));
      const lg = g.createLinearGradient(0, Y0, 0, Y0 + H); lg.addColorStop(0, `rgba(160,240,240,${0.06 + 0.03 * Math.sin(t * 0.6 + i)})`); lg.addColorStop(1, "rgba(160,240,240,0)");
      g.fillStyle = lg; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x + w, Y0); g.lineTo(x + w + W * 0.15, Y0 + H); g.lineTo(x + W * 0.12, Y0 + H); g.closePath(); g.fill();
    }
    g.restore();
    // ตะกอนลอย
    g.fillStyle = "rgba(210,240,235,.35)";
    for (let i = 0; i < 70; i++) { const x = X0 + ((hash(i, 1) * W + Math.sin(t * 0.3 + i) * 12) % W), y = Y0 + ((hash(i, 2) * H + t * (6 + hash(i, 3) * 10)) % H); g.fillRect(x, y, 1.6, 1.6); }
  }
  // ขอบจอมืด (กดดัน)
  const vg = g.createRadialGradient(X0 + W / 2, Y0 + H / 2, Math.min(W, H) * 0.35, X0 + W / 2, Y0 + H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,12,20,.55)"); g.fillStyle = vg; g.fillRect(X0, Y0, W, H);
  shipFx(g, fd, info, now);
  reefFx(g, fd, info, now);
  reefStormFx(g, fd, now);
  reefStorm(g, fd, info, now, view);
}
export function bakeSpecial() {}
export function animSpecial() {}
void faceVisible; void clamp;
// ทาลัสซาวาดหลังหมอกความมืด (index.js drawFodlanAir เรียก airTop ต่อจาก drawFog) — ผู้ใช้ 2026-11-19: ตัวปลาโดนหมอกความมืดบัง
export const airTop = drawThalassaAir;

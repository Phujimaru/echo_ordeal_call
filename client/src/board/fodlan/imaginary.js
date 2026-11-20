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
// พื้นกระจกโปร่งใส (ผู้ใช้ 2026-11-19: "พื้นโปร่งใส เห็นฉากหลัง") — ช่องกระดานเป็นแผ่นกระจกใสลายหมากรุกจางมาก มองทะลุลงห้วงข้อมูลลึก (theme.ground อบ + ground วาดสด)
const BASE = {
  ground1: "#04263a", ground2: "#01101d", tile: "rgba(170,240,255,.045)", tile2: "rgba(170,240,255,.085)",
  grid: "rgba(180,248,255,.14)", border: "rgba(200,252,255,.7)", spawn: "rgba(200,250,255,.35)",
  light: ["rgba(140,240,255,.06)", "rgba(0,20,40,.25)"], nightTint: null, shadow: "rgba(0,20,40,.45)",
  sky: ["#22c4d6", "#0d8aa6", "#06395a"], fog: "4,40,60",
};
const PAL = { day: BASE, night: BASE };
const SKY_LIFT = 70; // ยกฉากหลัง (ท้องฟ้าข้อมูล ตาราง ริ้วแสง เรือไกล) ขึ้นเหนือขอบไกลของกระดาน
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
  // พันธุ์ปะการังต่อกลุ่ม (แท่งข้อมูลที่ติดกัน = พันธุ์เดียวกัน · ผู้ใช้ 2026-11-20 "ปะการังหลายพันธุ์")
  const sp2 = new Map(), blocks = list("fd_nt_datablock"), bset = new Set(blocks.map((t) => K(t.x, t.y)));
  let gi = 0;
  for (const b of blocks) {
    if (sp2.has(K(b.x, b.y))) continue;
    const kind = CORAL_KINDS[(gi++ + Math.floor(hash(b.x, b.y) * 4)) % CORAL_KINDS.length], q = [b];
    sp2.set(K(b.x, b.y), kind);
    while (q.length) { const c = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = K(c.x + dx, c.y + dy); if (bset.has(k) && !sp2.has(k)) { sp2.set(k, kind); q.push({ x: c.x + dx, y: c.y + dy }); } } }
  }
  ZC.species = sp2;
  // ของตกแต่งบนพื้นว่าง (ไม่กีดขวาง): ดอกไม้ทะเล · หญ้าทะเลแสง — ช่องว่างที่ไม่ใช่ท่าเรือ/จุดเกิด/ระลอก/โหนด
  const spawnSet = new Set((info.spawns || []).map((t) => (Array.isArray(t) ? K(t[0], t[1]) : K(t.x, t.y)))), healSet = new Set(heal.map((t) => K(t.x, t.y)));
  const free = [];
  for (let y = 2; y < info.rows; y++) for (let x = 0; x < info.cols; x++) { const k = K(x, y); if (!kindAt(x, y) && !spawnSet.has(k) && !healSet.has(k)) free.push({ x, y }); }
  ZC.anemones = free.filter((t) => hash(t.x * 3 + 1, t.y * 5 + 2) < 0.085);
  ZC.grass = free.filter((t) => { const h = hash(t.x * 7 + 3, t.y * 11 + 1); return h >= 0.085 && h < 0.2; });
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
    // ผู้ใช้ 2026-11-20 "ขยับขึ้น ไม่ใช่ลบออก": ฉากหลังทั้งชุดยกขึ้นเหนือขอบไกลของกระดาน (LIFT px) ให้กระดานไม่ชนท้องฟ้า
    const { g, C, VX0, VW, VY0 } = c, bY = c.bY - SKY_LIFT;
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
  // ห้วงน้ำลึกสงบใต้พื้นกระจก (อบ · ผู้ใช้ 2026-11-20 เลือก "ห้วงน้ำลึกสงบ" แทนตารางซ้อน/แสงฟุ้ง): เฉดน้ำเงินไล่ลึก ไม่มีเส้น
  //  แสงรำไร/ฝูงปลาข้อมูล/เงาเรือรบไกลๆ วาดสดใน ground()
  ground(c) {
    const { g, VX0, VY0, VW, VY1 } = c, { cols, rows } = sceneSize();
    // พื้นน้ำลึกแผ่ออกไปรอบกระดานจนถึงขอบฟ้า (ผู้ใช้ 2026-11-20: "กระดานยาวไปโดนฉากหลัง" — เดิมไม่มีพื้นรอบนอก ขอบไกลของกระดานชนท้องฟ้า)
    //  วงซ้อนไล่จากไกล (สีเดียวกับขอบฟ้า) → ใกล้ (น้ำลึกเข้ม) · กระดานโปร่งใสจึงเห็นน้ำนี้ข้างใต้
    //  ผู้ใช้ 2026-11-20 "ฉากหลังหายไปไหน": น้ำต้องไม่ทับท้องฟ้า → ตัดแค่เหนือขอบไกลของกระดานนิดเดียว (bY − 34) แล้วไล่หมอกกลืนเข้าท้องฟ้า
    const bY = c.bY - SKY_LIFT, top = bY + 30; // ขอบฟ้า (ยกขึ้นแล้ว) → น้ำเริ่มใต้ท้องฟ้าพอดี
    g.save(); g.beginPath(); g.rect(VX0, top, VW, VY1 - top); g.clip();
    for (let d = 26; d >= 0; d--) {
      const e = 0.6 + d * 1.6, pts = [PS(-e, -e), PS(cols + e, -e), PS(cols + e, rows + e * 0.5), PS(-e, rows + e * 0.5)];
      g.fillStyle = mix("#04304a", "#0a5470", Math.min(1, Math.pow(d / 26, 1.6))); poly(g, pts); g.fill();
    }
    const hz = g.createLinearGradient(0, top, 0, top + 60); hz.addColorStop(0, "rgba(13,138,166,1)"); hz.addColorStop(0.45, "rgba(13,120,150,.55)"); hz.addColorStop(1, "rgba(10,84,112,0)");
    g.fillStyle = hz; g.fillRect(VX0, top, VW, 60);
    g.restore();
    const gr = g.createLinearGradient(0, VY0, 0, VY1); gr.addColorStop(0, "rgba(4,40,62,0)"); gr.addColorStop(0.5, "rgba(3,30,50,.35)"); gr.addColorStop(1, "rgba(1,12,24,.75)");
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, VY1 - VY0);
    // แสงจางจากเบื้องบนส่องลงน้ำ (ใต้กระดานสว่างกว่าขอบเล็กน้อย)
    const m = PS(cols / 2, rows / 2, -6), lg = g.createRadialGradient(m[0], m[1], 0, m[0], m[1], VW * 0.55);
    lg.addColorStop(0, "rgba(40,150,190,.22)"); lg.addColorStop(1, "rgba(40,150,190,0)");
    g.fillStyle = lg; g.fillRect(VX0, VY0, VW, VY1 - VY0);
  },
  // ข้างกระดาน: โล่ง (ลดความรก — ผู้ใช้ไม่ชอบของลอยรก)
  side() {},
  // แผ่นกระจกลอย: ความหนาขอบกระดาน + ขอบล่างเรือง (แทนเงาทึบใต้กระดาน)
  base(c) {
    const { g } = c, { cols, rows } = c.info, th = -0.22;
    const edges = [[[0, rows], [cols, rows]], [[cols, 0], [cols, rows]], [[0, 0], [0, rows]], [[0, 0], [cols, 0]]];
    for (const [a, b] of edges) {
      poly(g, [P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], th), P(a[0], a[1], th)]);
      g.fillStyle = "rgba(150,235,255,.10)"; g.fill();
      const p0 = P(a[0], a[1], th), p1 = P(b[0], b[1], th); g.strokeStyle = "rgba(170,245,255,.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
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
// ปะการังข้อมูล (ผู้ใช้ 2026-11-20 เลือกแทนผลึกแก้ว): กิ่งก้านแสงแตกแขนงขึ้นจากฐานหินกรมท่า ปลายกิ่งเป็นจุดข้อมูลเรือง ไหวตามกระแสน้ำ
//  โครงกิ่งสร้างครั้งเดียวต่อช่อง (แคช) · สีต่อช่อง: ฟ้า / ฟ้าอมเขียว / น้ำเงินอมม่วง (ไม่มีแดง)
const CORAL_RGB = ["120,240,255", "130,255,215", "160,180,255"];
const CORAL_KINDS = ["branch", "fan", "tube", "brain"];
const CORAL = new Map();
function coralOf(x, y) {
  const k = K(x, y);
  if (CORAL.has(k)) return CORAL.get(k);
  const R = rng(x * 131 + y * 71 + 9), segs = [], tips = [];
  const grow = (px, py, pz, ang, tilt, len, w, depth) => {
    const dx = Math.cos(ang) * Math.sin(tilt) * len, dy = Math.sin(ang) * Math.sin(tilt) * len, dz = Math.cos(tilt) * len;
    const nx = px + dx, ny = py + dy, nz = pz + dz;
    segs.push({ a: [px, py, pz], b: [nx, ny, nz], w, d: depth });
    if (depth >= 4 || len < 0.12) { tips.push([nx, ny, nz, R()]); return; }
    const n = depth === 0 ? 3 : R() < 0.55 ? 2 : 3;
    for (let i = 0; i < n; i++) grow(nx, ny, nz, ang + (i - (n - 1) / 2) * (0.9 + R() * 0.8) + (R() - 0.5) * 0.6, clamp(tilt + 0.25 + R() * 0.35, 0.15, 1.15), len * (0.62 + R() * 0.18), w * 0.66, depth + 1);
  };
  const trunks = 1 + Math.floor(R() * 2);
  for (let i = 0; i < trunks; i++) grow(0.5 + (R() - 0.5) * 0.3, 0.5 + (R() - 0.5) * 0.3, 0.12, R() * TAU, 0.1 + R() * 0.25, 0.42 + R() * 0.18, 1, 0);
  const o = { segs, tips, col: CORAL_RGB[Math.floor(R() * CORAL_RGB.length) % CORAL_RGB.length], ph: R() * TAU };
  CORAL.set(k, o);
  return o;
}
function coral(g, x, y, now) {
  const C = coralOf(x, y), t = now / 1000;
  // ไหว: ยิ่งสูงยิ่งเอนมาก
  const sway = (q) => { const k = q[2] * q[2] * 0.035; return P(x + q[0] + Math.sin(t * 0.9 + C.ph + q[2]) * k, y + q[1] + Math.cos(t * 0.7 + C.ph) * k * 0.6, q[2]); };
  // ฐานหินกรมท่า (เนินมน) + เงาบนกระจก
  const [sx, sy, s] = P(x + 0.5, y + 0.5, 0.01);
  g.fillStyle = "rgba(0,14,26,.35)"; g.beginPath(); g.ellipse(sx, sy, s * 0.42, s * 0.2, 0, 0, TAU); g.fill();
  const [bx, by, bs] = P(x + 0.5, y + 0.5, 0.06);
  const bg = g.createRadialGradient(bx - bs * 0.1, by - bs * 0.12, 0, bx, by, bs * 0.34); bg.addColorStop(0, "#2a3f6e"); bg.addColorStop(1, "#0b1530");
  g.fillStyle = bg; g.beginPath(); g.ellipse(bx, by, bs * 0.34, bs * 0.17, 0, 0, TAU); g.fill();
  // กิ่ง: เส้นเข้ม (ตัวกิ่ง) แล้วทับเส้นแสงบางตรงกลาง
  g.lineCap = "round";
  for (const sg of C.segs) { const a = sway(sg.a), b = sway(sg.b); g.strokeStyle = "rgba(12,30,60,.9)"; g.lineWidth = Math.max(1.2, a[2] * 0.075 * sg.w); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.save(); g.globalCompositeOperation = "lighter";
  for (const sg of C.segs) {
    const a = sway(sg.a), b = sway(sg.b), pulse = 0.55 + 0.45 * Math.sin(t * 2.2 - sg.d * 0.9 + C.ph);
    g.strokeStyle = `rgba(${C.col},${0.45 + 0.35 * pulse})`; g.lineWidth = Math.max(0.8, a[2] * 0.03 * sg.w); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  for (const tp of C.tips) {
    const q = sway(tp), k = 0.6 + 0.4 * Math.sin(t * 2.6 + tp[3] * 9);
    glow(g, q[0], q[1], q[2] * 0.09, C.col, 0.55 * k);
    g.fillStyle = `rgba(235,255,255,${0.85 * k})`; g.fillRect(q[0] - 1.2, q[1] - 1.2, 2.4, 2.4);
  }
  g.restore(); g.lineCap = "butt";
}
// =================================================================== สิ่งกีดขวาง
// ปะการังพัด: แผ่นตาข่ายแสงบางรูปพัด ตั้งฉากกับกระแส โบกช้าๆ
function coralFan(g, x, y, now) {
  const t = now / 1000, R = rng(x * 37 + y * 19), col = CORAL_RGB[Math.floor(R() * 3) % 3], ang = R() * Math.PI, h = 1.1 + R() * 0.5, wv = 0.6 + R() * 0.12, ph = R() * TAU;
  const ca = Math.cos(ang), sa = Math.sin(ang), cx = x + 0.5, cy = y + 0.5, N = 9;
  base(g, cx, cy);
  const pt = (u, v) => { const sw = Math.sin(t * 0.8 + ph) * 0.06 * v; return P(cx + ca * u * wv + sw, cy + sa * u * wv + sw * 0.5, 0.1 + v * h); };
  // แผ่นจางเต็มพัด
  g.beginPath(); const s0 = pt(0, 0); g.moveTo(s0[0], s0[1]);
  for (let i = 0; i <= 16; i++) { const a = -1 + (i / 16) * 2, q = pt(a * Math.sqrt(1 - 0.15 * a * a), 0.95 - 0.25 * a * a); g.lineTo(q[0], q[1]); }
  g.closePath(); g.fillStyle = `rgba(${col},.2)`; g.fill(); g.strokeStyle = `rgba(${col},.6)`; g.lineWidth = 1.4; g.stroke();
  g.save(); g.globalCompositeOperation = "lighter";
  // ก้านรัศมี + เส้นตาข่ายโค้ง
  g.strokeStyle = `rgba(${col},.55)`; g.lineWidth = 1;
  for (let i = 0; i < N; i++) { const a = -1 + (i / (N - 1)) * 2; g.beginPath(); for (let j = 0; j <= 8; j++) { const v = j / 8 * (0.95 - 0.25 * a * a), q = pt(a * v * 0.98, v); j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); }
  for (let r = 1; r <= 4; r++) { const v = r / 4.6; g.strokeStyle = `rgba(${col},${0.25 + 0.2 * Math.sin(t * 1.5 - r + ph)})`; g.beginPath(); for (let i = 0; i <= 16; i++) { const a = -1 + (i / 16) * 2, q = pt(a * v, v * (0.95 - 0.25 * a * a)); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); }
  const tipq = pt(0, 0.95); glow(g, tipq[0], tipq[1], tipq[2] * 0.12, col, 0.4);
  g.restore();
}
// ปะการังท่อ: ท่อสูงต่ำ 3–5 ท่อ ปากท่อเรืองเป็นวงแหวน มีละอองข้อมูลลอยออกจากปากท่อ
function coralTube(g, x, y, now) {
  const t = now / 1000, R = rng(x * 53 + y * 29), col = CORAL_RGB[Math.floor(R() * 3) % 3], n = 3 + Math.floor(R() * 3), tubes = [];
  base(g, x + 0.5, y + 0.5);
  for (let i = 0; i < n; i++) tubes.push({ x: x + 0.5 + (R() - 0.5) * 0.5, y: y + 0.5 + (R() - 0.5) * 0.5, h: 0.45 + R() * 0.9, r: 0.08 + R() * 0.05, ph: R() * TAU });
  tubes.sort((a, b) => depthOf(a.x, a.y) - depthOf(b.x, b.y));
  for (const tb of tubes) {
    const a = P(tb.x, tb.y, 0.08), b = P(tb.x, tb.y, tb.h), w = a[2] * tb.r;
    const gr = g.createLinearGradient(a[0] - w, 0, a[0] + w, 0); gr.addColorStop(0, "rgba(14,34,70,.9)"); gr.addColorStop(0.5, `rgba(${col},.45)`); gr.addColorStop(1, "rgba(12,30,62,.9)");
    g.fillStyle = gr; g.fillRect(b[0] - w, b[1], w * 2, a[1] - b[1]);
    g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(${col},.35)`; g.lineWidth = 1; for (let k = 1; k < 4; k++) { const yy = b[1] + (a[1] - b[1]) * k / 4; g.beginPath(); g.moveTo(b[0] - w, yy); g.lineTo(b[0] + w, yy); g.stroke(); }
    const pulse = 0.6 + 0.4 * Math.sin(t * 2 + tb.ph);
    g.strokeStyle = `rgba(${col},${0.9 * pulse})`; g.lineWidth = 2; g.beginPath(); g.ellipse(b[0], b[1], w, w * 0.4, 0, 0, TAU); g.stroke();
    glow(g, b[0], b[1], w * 2.2, col, 0.35 * pulse);
    for (let k = 0; k < 3; k++) { const u = (t * 0.4 + k / 3 + tb.ph) % 1, q = P(tb.x + Math.sin(u * 6 + k) * 0.05, tb.y, tb.h + u * 0.8); g.fillStyle = `rgba(220,255,255,${0.7 * (1 - u)})`; g.fillRect(q[0] - 1, q[1] - 1, 2, 2); }
    g.restore();
  }
}
// ปะการังสมอง: โดมมนกรมท่า ลายร่องคดเคี้ยวเรืองแสงไล่เป็นจังหวะ
function coralBrain(g, x, y, now) {
  const t = now / 1000, R = rng(x * 71 + y * 43), col = CORAL_RGB[Math.floor(R() * 3) % 3], cx = x + 0.5, cy = y + 0.5, r = 0.42 + R() * 0.05, hgt = 0.55 + R() * 0.2;
  const [sx, sy, s] = P(cx, cy, 0.01); g.fillStyle = "rgba(0,14,26,.35)"; g.beginPath(); g.ellipse(sx, sy, s * 0.44, s * 0.2, 0, 0, TAU); g.fill();
  const c = P(cx, cy, hgt * 0.45), rw = c[2] * r, rh = c[2] * hgt * 0.75;
  const gr = g.createRadialGradient(c[0] - rw * 0.3, c[1] - rh * 0.5, 0, c[0], c[1], rw * 1.1); gr.addColorStop(0, "#35548c"); gr.addColorStop(1, "#0a1430");
  g.fillStyle = gr; g.beginPath(); g.ellipse(c[0], c[1], rw, rh, 0, Math.PI, TAU); g.ellipse(c[0], c[1], rw, rh * 0.35, 0, 0, Math.PI); g.fill();
  g.save(); g.beginPath(); g.ellipse(c[0], c[1], rw, rh, 0, Math.PI, TAU); g.ellipse(c[0], c[1], rw, rh * 0.35, 0, 0, Math.PI); g.clip();
  g.globalCompositeOperation = "lighter"; g.lineWidth = 1.3;
  for (let i = 0; i < 7; i++) {
    const yy = c[1] - rh + (i + 0.5) * (rh * 1.35 / 7), k = 0.5 + 0.5 * Math.sin(t * 1.6 - i * 0.7 + x);
    g.strokeStyle = `rgba(${col},${0.25 + 0.45 * k})`; g.beginPath();
    for (let j = 0; j <= 24; j++) { const u = j / 24, xx = c[0] - rw + u * rw * 2, wob = Math.sin(u * 14 + i * 2.3 + R() * 0.2) * rh * 0.06; j ? g.lineTo(xx, yy + wob) : g.moveTo(xx, yy + wob); }
    g.stroke();
  }
  g.restore();
}
function base(g, cx, cy) {
  const [sx, sy, s] = P(cx, cy, 0.01); g.fillStyle = "rgba(0,14,26,.35)"; g.beginPath(); g.ellipse(sx, sy, s * 0.4, s * 0.18, 0, 0, TAU); g.fill();
  const [bx, by, bs] = P(cx, cy, 0.05); g.fillStyle = "#0e1a38"; g.beginPath(); g.ellipse(bx, by, bs * 0.3, bs * 0.14, 0, 0, TAU); g.fill();
}
export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t;
  if (kind === "fd_nt_whale" || kind === "fd_nt_ship") return;
  if (kind === "fd_nt_datablock") {
    const sp = ZC && ZC.species && ZC.species.get(K(x, y));
    if (sp === "fan") coralFan(g, x, y, now); else if (sp === "tube") coralTube(g, x, y, now); else if (sp === "brain") coralBrain(g, x, y, now); else coral(g, x, y, now);
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
  // ช่องที่กระจกหายไป: มืดลงเล็กน้อย (มองตรงลงเหว) · ขอบกระจกแตกเป็นฟันเลื่อย · เศษข้อมูลร่วงลงลึก
  poly(g, [a, b, c, d]); g.fillStyle = "rgba(0,8,18,.5)"; g.fill();
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const u = hash(x * 7 + i, y), k = ((t * 0.35 + hash(i, x + y)) % 1), p = P(x + 0.15 + u * 0.7, y + 0.2 + hash(i, y) * 0.6, -k * 4);
    g.fillStyle = `rgba(${CY},${0.55 * (1 - k)})`; g.fillRect(p[0], p[1], p[2] * 0.05, p[2] * 0.05);
  }
  const edge = [[x, y, x + 1, y], [x + 1, y, x + 1, y + 1], [x + 1, y + 1, x, y + 1], [x, y + 1, x, y]];
  g.strokeStyle = `rgba(210,252,255,${0.55 + 0.15 * Math.sin(t * 2 + x)})`; g.lineWidth = 1.3; g.beginPath();
  for (const [x0, y0, x1, y1] of edge) for (let i = 0; i <= 5; i++) {
    const u = i / 5, nx = -(y1 - y0), ny = x1 - x0, j = (i % 2 ? 0.08 : 0.02) * (0.5 + hash(x + i, y + x0));
    const p = P(x0 + (x1 - x0) * u + nx * j, y0 + (y1 - y0) * u + ny * j, 0.01); i || x0 !== x || y0 !== y ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
  }
  g.closePath(); g.stroke(); g.restore();
}

// =================================================================== ของที่เรียงความลึกกับตัวละคร
export function items(list, g, fd, info, units, now, lowQ) {
  LASTFD = fd;
  const Z = zones(info);
  shipItems(list, g, fd, info, now, lowQ);
  // ดอกไม้ทะเลเรืองแสง (ตกแต่ง ไม่กีดขวาง) — หดตัวเมื่อมีคนอยู่ใกล้
  for (const a of Z.anemones) {
    const near = (units || []).some((u) => u && u.alive !== false && Math.abs((u.rx ?? u.x) - a.x) <= 1.2 && Math.abs((u.ry ?? u.y) - a.y) <= 1.2);
    const st = ANEM.get(K(a.x, a.y)) || { k: 1 }; st.k += ((near ? 0.25 : 1) - st.k) * 0.08; ANEM.set(K(a.x, a.y), st);
    list.push({ d: depthOf(a.x + 0.5, a.y + 0.5), f: () => anemone(g, a.x, a.y, now, st.k) });
  }
  // แมงกะพรุนข้อมูล ลอยช้าเหนือกระดาน
  if (!lowQ) for (let i = 0; i < 5; i++) {
    const t = now / 1000, jx = (hash(i, 81) * info.cols + t * (0.08 + hash(i, 82) * 0.08) * (i % 2 ? 1 : -1)) % info.cols, x = jx < 0 ? jx + info.cols : jx, y = 2 + hash(i, 83) * (info.rows - 3) + Math.sin(t * 0.2 + i) * 0.8;
    list.push({ d: depthOf(x, y) + 0.3, f: () => jelly(g, x, y, 1.8 + hash(i, 84) * 1.4 + Math.sin(t * 0.9 + i * 2) * 0.25, now, i) });
  }
  void units;
}

const ANEM = new Map();
// ดอกไม้ทะเล: หนวดเรืองแผ่จากจานกลาง ไหวตามน้ำ · k = กาง (1) / หด (0.25)
function anemone(g, x, y, now, k) {
  const t = now / 1000, R = rng(x * 17 + y * 91), col = CORAL_RGB[Math.floor(R() * 3) % 3], cx = x + 0.3 + R() * 0.4, cy = y + 0.3 + R() * 0.4, n = 10, ph = R() * TAU;
  const c = P(cx, cy, 0.06);
  g.fillStyle = "rgba(14,28,60,.9)"; g.beginPath(); g.ellipse(c[0], c[1], c[2] * 0.1, c[2] * 0.05, 0, 0, TAU); g.fill();
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + ph, len = (0.16 + 0.06 * Math.sin(i * 1.7)) * k;
    g.strokeStyle = `rgba(${col},${0.35 + 0.4 * k})`; g.lineWidth = Math.max(1, c[2] * 0.02); g.beginPath();
    for (let j = 0; j <= 5; j++) { const u = j / 5, sw = Math.sin(t * 1.4 + ph + u * 2) * 0.03 * u; const q = P(cx + Math.cos(a) * len * u + sw, cy + Math.sin(a) * len * u, 0.06 + u * len * 0.9); j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
    g.stroke();
    const tip = P(cx + Math.cos(a) * len, cy + Math.sin(a) * len, 0.06 + len * 0.9); g.fillStyle = `rgba(230,255,255,${0.5 + 0.4 * k})`; g.fillRect(tip[0] - 1, tip[1] - 1, 2, 2);
  }
  glow(g, c[0], c[1], c[2] * 0.22, col, 0.25 * k);
  g.restore(); g.lineCap = "butt";
}
// แมงกะพรุนข้อมูล: ร่มโปร่งเรือง หดขยายเป็นจังหวะ หนวดสายแสงห้อยไหว
function jelly(g, x, y, z, now, i) {
  const t = now / 1000, col = CORAL_RGB[i % 3], pul = 0.85 + 0.15 * Math.sin(t * 2.2 + i), c = P(x, y, z), r = c[2] * 0.2 * pul, h = c[2] * 0.15 / pul;
  const sh = P(x, y, 0.01); g.fillStyle = "rgba(0,20,35,.18)"; g.beginPath(); g.ellipse(sh[0], sh[1], c[2] * 0.15, c[2] * 0.06, 0, 0, TAU); g.fill();
  g.save(); g.globalCompositeOperation = "lighter";
  const gr = g.createRadialGradient(c[0], c[1] - h * 0.4, 0, c[0], c[1], r * 1.2); gr.addColorStop(0, `rgba(230,255,255,.45)`); gr.addColorStop(1, `rgba(${col},.08)`);
  g.fillStyle = gr; g.beginPath(); g.ellipse(c[0], c[1], r, h, 0, Math.PI, TAU); g.closePath(); g.fill();
  g.strokeStyle = `rgba(${col},.7)`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(c[0], c[1], r, h, 0, Math.PI, TAU); g.stroke();
  g.strokeStyle = `rgba(${col},.4)`; g.lineWidth = 1;
  for (let k = 0; k < 6; k++) { const ox = c[0] - r * 0.8 + (k / 5) * r * 1.6; g.beginPath(); g.moveTo(ox, c[1]); for (let j = 1; j <= 6; j++) g.lineTo(ox + Math.sin(t * 1.8 + k + j * 0.7) * r * 0.12, c[1] + j * c[2] * 0.06); g.stroke(); }
  g.restore();
}

// =================================================================== พื้นทุกเฟรม (ใต้ตัวละคร)
export function ground(g, fd, info, now, lowQ) {
  LASTFD = fd;
  const Z = zones(info), t = now / 1000, cols = info.cols, rows = info.rows;
  const attr = fd && fd.imaginary && fd.imaginary.attr, tint = ATTR_TINT[attr] || CY;
  g.save(); g.globalCompositeOperation = "lighter";
  // ห้วงน้ำลึกใต้กระจก (สด · สงบ): แสงรำไร (caustics) เต้นบนชั้นลึก · ละอองน้อยๆ ลอยช้า · ฝูงปลาข้อมูล · เงาเรือรบข้อมูลไกลๆ ผ่านนานๆ ครั้ง
  if (!lowQ) {
    // เงาเรือรบข้อมูล (ทุก ~50 วิ ล่องผ่านลึกใต้กระดาน)
    { const per = 50, k = (t % per) / per;
      if (k < 0.7) { const u = k / 0.7, dir = Math.floor(t / per) % 2 ? 1 : -1, x = dir > 0 ? -10 + (cols + 20) * u : cols + 10 - (cols + 20) * u, y = rows * 0.55, z = -7;
        const a = P(x - dir * 3.2, y, z), b = P(x + dir * 3.2, y, z), c2 = P(x, y - 0.6, z), d2 = P(x, y + 0.8, z), fa = Math.min(1, u * 5, (1 - u) * 5) * 0.35;
        g.fillStyle = `rgba(6,16,34,${fa})`; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c2[0], c2[1] - a[2] * 0.4, b[0], b[1]); g.quadraticCurveTo(d2[0], d2[1], a[0], a[1]); g.fill();
        g.strokeStyle = `rgba(120,230,255,${fa * 0.6})`; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c2[0], c2[1] - a[2] * 0.4, b[0], b[1]); g.stroke(); } }
    // แสงรำไร: เส้นคลื่นสองชุดสานกันบนชั้นลึก เคลื่อนช้า
    for (let set = 0; set < 2; set++) for (let i = 0; i < 9; i++) {
      const z = -3.2, horiz = set === 0, base = -2 + i * ((horiz ? rows : cols) + 4) / 9;
      g.strokeStyle = `rgba(${tint},${0.07 + 0.03 * Math.sin(t * 0.6 + i)})`; g.lineWidth = Math.max(1, P(cols / 2, rows / 2, z)[2] * 0.035); g.beginPath();
      for (let j = 0; j <= 30; j++) {
        const u = j / 30, along = -2 + u * ((horiz ? cols : rows) + 4), off = Math.sin(along * 0.8 + t * 0.5 + i * 1.7) * 0.45 + Math.sin(along * 1.9 - t * 0.35 + i) * 0.2;
        const p = horiz ? P(along, base + off, z) : P(base + off, along, z); j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
      }
      g.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const k = (t * (0.025 + hash(i, 61) * 0.03) + hash(i, 62)) % 1, x = hash(i, 63) * cols, y = hash(i, 64) * rows, p = P(x, y, -5 + k * 4.8), sz = p[2] * 0.035;
      g.fillStyle = `rgba(210,250,255,${0.35 * Math.sin(k * Math.PI)})`; g.beginPath(); g.arc(p[0], p[1], sz, 0, TAU); g.fill();
    }
    // ฝูงปลาข้อมูล (ทุก ~24 วิ)
    const per = 24, k = (t % per) / per;
    if (k < 0.6) {
      const u = k / 0.6, dir = Math.floor(t / per) % 2 ? 1 : -1, bx = dir > 0 ? -6 + (cols + 12) * u : cols + 6 - (cols + 12) * u, by = rows * (0.3 + 0.4 * hash(Math.floor(t / per), 7));
      for (let j = 0; j < 14; j++) {
        const fx2 = bx - dir * (hash(j, 71) * 3), fy = by + (hash(j, 72) - 0.5) * 3 + Math.sin(t * 2 + j) * 0.2, p = P(fx2, fy, -2.6 - hash(j, 73) * 1.2), sz = p[2] * 0.14;
        g.fillStyle = `rgba(${tint},.28)`; g.beginPath(); g.moveTo(p[0] + dir * sz, p[1]); g.lineTo(p[0], p[1] - sz * 0.35); g.lineTo(p[0] - dir * sz * 0.8, p[1]); g.lineTo(p[0], p[1] + sz * 0.35); g.closePath(); g.fill();
      }
    }
  }
  // หญ้าทะเลแสง (ตกแต่ง ไม่กีดขวาง) — กอเล็กไหวตามน้ำ
  g.lineCap = "round";
  for (const s2 of Z.grass) {
    const R = rng(s2.x * 13 + s2.y * 7), cx = s2.x + 0.25 + R() * 0.5, cy = s2.y + 0.25 + R() * 0.5, n = 4 + Math.floor(R() * 4), col = CORAL_RGB[Math.floor(R() * 3) % 3];
    for (let i = 0; i < n; i++) {
      const ox = (R() - 0.5) * 0.25, oy = (R() - 0.5) * 0.25, h = 0.18 + R() * 0.22, ph = R() * TAU;
      g.strokeStyle = `rgba(${col},.45)`; g.lineWidth = 1; g.beginPath();
      for (let j = 0; j <= 4; j++) { const u = j / 4, q = P(cx + ox + Math.sin(t * 1.3 + ph + u) * 0.05 * u, cy + oy, u * h); j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
      g.stroke();
    }
  }
  g.lineCap = "butt";
  // แสงกลางสนาม + โทนตามคุณสมบัติ (เปลี่ยนนุ่มๆ)
  { const [cx, cy, s] = P(cols / 2, rows / 2, -1.5); glow(g, cx, cy, s * Math.max(cols, rows) * 0.6, tint, 0.05 + 0.015 * Math.sin(t * 0.8)); }
  // เงาสะท้อนบนกระจก (แถบแสงเฉียงช้าๆ จางมาก)
  if (!lowQ) for (let i = 0; i < 2; i++) {
    const k = ((t * 0.07 + i * 0.5) % 1) * (cols + rows) - rows;
    const a = P(k, 0, 0.004), b = P(k + 1.2, 0, 0.004), c = P(k + 1.2 + rows, rows, 0.004), d = P(k + rows, rows, 0.004);
    g.save(); g.beginPath(); g.moveTo(...P(0, 0, 0).slice(0, 2)); g.lineTo(...P(cols, 0, 0).slice(0, 2)); g.lineTo(...P(cols, rows, 0).slice(0, 2)); g.lineTo(...P(0, rows, 0).slice(0, 2)); g.closePath(); g.clip();
    g.fillStyle = `rgba(${tint},.035)`; poly(g, [a, b, c, d]); g.fill(); g.restore();
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

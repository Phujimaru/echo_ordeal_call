// ============================================================
//  ด่าน V หลุมศพศักดิ์สิทธิ์ (area 44 · GRID_PLAN §8.5) — ภาพบนกระดาน (สัญญาดูหัวไฟล์ ./index.js · กติกา server/fodlan/stage5.js)
//   อารมณ์ตามฉาก 3D client/src/fodlan/dioramas/tomb.js: ห้องโถงหินมืดใต้อาราม · ร่องเรืองแสงเขียว · บัลลังก์หินสองแถว
//   สุดทาง (ขอบไกล y = 0) = แท่นขั้นบันได + บัลลังก์ผู้ให้กำเนิด ลำแสงเขียวส่องลงมา · แท่นศิลาตรา 4 แท่นบนวงตรากลางทางเดิน · ฝุ่นเขียวลอย
//   ธีม: back = เพดานโค้งมืด + ผนังซุ้มโค้งสูงไกล + มุขหลังบัลลังก์ · ground = พื้นหินนอกกระดาน + ร่องเขียวต่อจากทางเดิน
//        side = ผนังข้าง + เสาสูงหายเข้าความมืด + บัลลังก์ 2 แถวต่อออกไปทั้งสองข้าง + ความมืดกลืนขอบจอ/เพดาน
//        base = แผ่นหินของกระดาน (ทางเดินกลางขัดเงา) + ร่องเรืองแสง/วงตรา · deco = แท่นขั้นบันได 3 ชั้นรอบบัลลังก์ผู้ให้กำเนิด
//        animBack = วงตรายักษ์หมุนช้าหลังบัลลังก์ (สไปรต์ 2 ชั้นหมุนสวนกัน) + ลำแสงจากเพดานไหวเบาๆ + ฝุ่นในลำแสง · ambient = ฝุ่นเขียว
//   ทุกเฟรม: ground = พลังงานไหลตามร่องเข้าหาบัลลังก์ · แท่นเรืองก่อนแสงเขียวเรือง · คลื่นแสงเขียวเรือง (fx glow) · ออร่า = ทั้งห้องสว่างขึ้น
//            ศิลาบนบัลลังก์/เสา/แท่นวาบเป็นระลอกไล่จากทางเข้าไปบัลลังก์ทุก ~6.5 วิ (gemWave)
//            items = บัลลังก์ผู้ให้กำเนิด + ลำแสง · ศิลาตราลอยบนพื้น · ศิลาเหนือหัวคนถือ · ไอร่างอสูร · วงชีพจรเทพที่เท้า
//            air = ฉากนั่งบัลลังก์ · ชีพจรเทพฟื้น · คลั่งเป็นอสูร · หยิบ/ร่วงศิลา (+ เสียงครั้งเดียว)
//  แสงเรืองใช้สไปรต์แคช (ไม่สร้าง gradient ใหม่ทุกเฟรม) · lowQ = ตัดอนุภาค/แสงวิ่ง
// ============================================================
import { OX, P, PS, depthOf, faceVisible, gPoly, glow, quad, sceneSize, viewAxes } from "../boardGeo";
import { fxOnce, fxT } from "./index";
import { fodlanAudio } from "../../fodlan/fodlanAudio";

const TAU = Math.PI * 2;
const GREEN = "77,255,170";
const PALE = "170,255,215";
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

export const kinds = ["fd_throne", "fd_tombpillar", "fd_holythrone", "fd_crestpad"];
export const tall = ["fd_throne", "fd_tombpillar"];
export const fx = { glow: 1900, throne: 1700, revive: 1900, beast: 1700, crest_pick: 900, crest_drop: 800 };
const SFX = { glow: "glow_pulse", throne: "throne", revive: "throne", beast: "beast_roar", crest_pick: "crest_pickup", crest_drop: "crest_pickup" };

// ออร่า (แสงเขียวเรือง) ของเฟรมนี้ — ground ตั้งก่อน items/obstacles (ไฟศิลาบนบัลลังก์หินสว่างขึ้น)
let AURA = 0;
// ระลอกศิลาวาบ: ทุก WAVE_MS ไล่จากทางเข้า (แถวท้าย) ไปบัลลังก์ (แถว 0) ในช่วง WAVE_ON แรกของรอบ · ROWS_NOW ตั้งจาก ground
let ROWS_NOW = 14;
const WALL = 6.4; // ผนังข้างห่างขอบกระดาน (หน่วยช่องของฉาก)
const WAVE_MS = 6500, WAVE_ON = 0.38;
function gemWave(y, now) {
  const p = (now % WAVE_MS) / WAVE_MS;
  if (!(now > 0) || p > WAVE_ON) return 0;
  const d = y + 0.5 - (ROWS_NOW + 1 - (p / WAVE_ON) * (ROWS_NOW + 3));
  return Math.exp(-d * d * 0.7);
}

// =================================================================== palettes (ใต้ดิน — กลางวัน/กลางคืนเกือบเท่ากัน)
const PAL = {
  day: {
    ground1: "#1d2622", ground2: "#060a08", tile: "rgba(150,255,205,.03)", tile2: "rgba(0,0,0,.10)",
    grid: "rgba(110,255,180,.12)", border: "rgba(120,255,190,.5)", spawn: "rgba(150,255,205,.42)",
    light: ["rgba(120,255,190,.05)", "rgba(0,8,5,.34)"], nightTint: null, shadow: "rgba(0,0,0,.5)",
    vault: ["#020605", "#0b1a14"], wall: "#141a17", wall2: "#0a0f0d", wallHi: "#232b27",
    slabA: ["#2f3833", "#2b332f", "#343d38"], slabB: ["#1f2622", "#232a26", "#1c2320"], joint: "rgba(0,0,0,.35)",
    stone: { front: "#3e4642", side: "#2f3633", top: "#4b5450", edge: "rgba(0,0,0,.3)" },
    stoneUp: [{ front: "#2c3330", side: "#212725", top: "#353d39" }, { front: "#181d1b", side: "#121614", top: "#1d2320" }],
    holy: { front: "#78847d", side: "#5f6a64", top: "#909c95", edge: "rgba(120,255,190,.35)" },
    dais: [{ front: "#3c4540", side: "#323a36", top: "#46504a" }, { front: "#46504a", side: "#3a433e", top: "#505b55" }, { front: "#505b55", side: "#434c47", top: "#5b665f" }],
  },
  night: {
    ground1: "#18211d", ground2: "#040706", tile: "rgba(150,255,205,.03)", tile2: "rgba(0,0,0,.12)",
    grid: "rgba(110,255,180,.12)", border: "rgba(120,255,190,.5)", spawn: "rgba(150,255,205,.42)",
    light: ["rgba(110,255,190,.04)", "rgba(0,6,8,.4)"], nightTint: "rgba(0,6,10,.12)", shadow: "rgba(0,0,0,.55)",
    vault: ["#010403", "#081410"], wall: "#111714", wall2: "#080c0b", wallHi: "#1e2622",
    slabA: ["#2a322e", "#272e2a", "#2f3833"], slabB: ["#1b211e", "#1e2521", "#181e1b"], joint: "rgba(0,0,0,.38)",
    stone: { front: "#38403c", side: "#2a312e", top: "#454e4a", edge: "rgba(0,0,0,.32)" },
    stoneUp: [{ front: "#272e2b", side: "#1d2321", top: "#303834" }, { front: "#151a18", side: "#0f1312", top: "#1a1f1d" }],
    holy: { front: "#6e7a73", side: "#58635d", top: "#86928b", edge: "rgba(120,255,190,.38)" },
    dais: [{ front: "#373f3b", side: "#2e3632", top: "#414a45" }, { front: "#414a45", side: "#363e3a", top: "#4b5550" }, { front: "#4b5550", side: "#3e4742", top: "#56605a" }],
  },
};

// =================================================================== สไปรต์แคช
const SPRITES = new Map();
function sprite(key, w, h, paint) {
  if (typeof document === "undefined") return null;
  let c = SPRITES.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = w; c.height = h;
    paint(c.getContext("2d"), w, h);
    SPRITES.set(key, c);
  }
  return c;
}
// วงเรืองแสงจากสไปรต์ (ไม่สร้าง gradient ทุกเฟรม)
function softGlow(g, x, y, r, rgb, a) {
  if (!(a > 0.01) || !(r > 0.5)) return;
  const img = sprite(`g${rgb}`, 64, 64, (c, w) => {
    const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = gr; c.fillRect(0, 0, w, w);
  });
  if (!img) { glow(g, x, y, r, rgb, a); return; }
  const prev = g.globalAlpha;
  g.globalAlpha = prev * Math.min(1, a);
  g.drawImage(img, x - r, y - r, r * 2, r * 2);
  g.globalAlpha = prev;
}
// ลำแสงแนวตั้ง (ขอบนุ่ม · จางขึ้นด้านบน) — สไปรต์เดียววาดยืด
function beam(g, x, yTop, yBot, w, a) {
  if (!(a > 0.01)) return;
  const img = sprite("beam", 32, 128, (c, W, H) => {
    for (let i = 0; i < W; i++) {
      const k = 1 - Math.abs((i + 0.5) / W - 0.5) * 2;
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, `rgba(${PALE},0)`); gr.addColorStop(0.55, `rgba(${PALE},${0.5 * k * k})`); gr.addColorStop(1, `rgba(${PALE},${k * k})`);
      c.fillStyle = gr; c.fillRect(i, 0, 1, H);
    }
  });
  if (!img) return;
  const prev = g.globalAlpha;
  g.globalAlpha = prev * Math.min(1, a);
  g.drawImage(img, x - w / 2, yTop, w, yBot - yTop);
  g.globalAlpha = prev;
}

// วงตรายักษ์หลังบัลลังก์ (สไปรต์ 320 px อบครั้งเดียว · "o" = ชั้นนอก · "i" = ชั้นใน หมุนสวนกัน)
function sigilSprite(kind) {
  return sprite(`sig${kind}`, 320, 320, (c) => {
    c.translate(160, 160); c.strokeStyle = `rgba(${PALE},.85)`; c.fillStyle = `rgba(${PALE},.85)`;
    const circle = (r, w) => { c.lineWidth = w; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); };
    const poly = (n, r, rot) => { c.beginPath(); for (let k = 0; k <= n; k++) { const a = rot + k * TAU / n; if (k) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); };
    if (kind === "o") {
      circle(150, 3); circle(136, 1.5); circle(118, 1);
      c.lineWidth = 1.5;
      for (let k = 0; k < 36; k++) { const a = k * TAU / 36, r0 = k % 3 ? 140 : 132; c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * 146, Math.sin(a) * 146); c.stroke(); }
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * TAU / 6, x = Math.cos(a) * 127, y = Math.sin(a) * 127; c.beginPath(); c.arc(x, y, 7, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); }
    } else {
      c.lineWidth = 1.5; poly(3, 108, -Math.PI / 2); poly(3, 108, Math.PI / 2); poly(6, 70, 0);
      circle(54, 2); circle(30, 1);
      c.setLineDash([10, 7]); circle(90, 1.5); c.setLineDash([]);
    }
  });
}

// =================================================================== รูปทรง (พิกัดกระดาน)
// กล่องตั้งบนพื้น — ด้านที่หันเข้ากล้อง แล้วค่อยฝา (กล่องนูนเดียว ด้านที่เห็นไม่ซ้อนกัน)
function box(g, x0, y0, x1, y1, z0, z1, col) {
  const fd = viewAxes();
  const sides = [
    [-1, 0, x0, (y0 + y1) / 2, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]],
    [1, 0, x1, (y0 + y1) / 2, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]],
    [0, -1, (x0 + x1) / 2, y0, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
    [0, 1, (x0 + x1) / 2, y1, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]],
  ];
  for (const [nx, ny, px, py, pts] of sides) {
    if (!faceVisible(nx, ny, px, py)) continue;
    gPoly(g, pts); g.fillStyle = Math.abs(nx * fd.fx + ny * fd.fy) > 0.7 ? col.front : col.side; g.fill();
    if (col.edge) { g.strokeStyle = col.edge; g.lineWidth = 1; g.stroke(); }
  }
  gPoly(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]); g.fillStyle = col.top; g.fill();
  if (col.edge) { g.strokeStyle = col.edge; g.lineWidth = 1; g.stroke(); }
}
// อัญมณีศิลาตรา (เพชรแปดหน้า หมุน) — จุดบนจอ x, y · r = ครึ่งสูง (px)
function gem(g, x, y, r, a, bright = 0) {
  const w = r * 0.62, k = Math.sin(a) * w * 0.55;
  const L = `rgb(${120 + bright * 80 | 0},255,${200 + bright * 40 | 0})`, M = "#3fd994", D = "#1d6f4a";
  g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + k, y); g.lineTo(x - w, y); g.closePath(); g.fillStyle = L; g.fill();
  g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + w, y); g.lineTo(x + k, y); g.closePath(); g.fillStyle = M; g.fill();
  g.beginPath(); g.moveTo(x, y + r); g.lineTo(x - w, y); g.lineTo(x + k, y); g.closePath(); g.fillStyle = M; g.fill();
  g.beginPath(); g.moveTo(x, y + r); g.lineTo(x + k, y); g.lineTo(x + w, y); g.closePath(); g.fillStyle = D; g.fill();
}
// เส้นเรืองแสงบนพื้น (กว้างจาง + เส้นใน)
function emissive(g, pts, z, wide, a = 1) {
  g.lineCap = "round";
  gPoly(g, pts.map(([x, y]) => [x, y, z]), false);
  g.strokeStyle = `rgba(${GREEN},${0.16 * a})`; g.lineWidth = wide; g.stroke();
  g.strokeStyle = `rgba(${PALE},${0.75 * a})`; g.lineWidth = Math.max(1, wide * 0.22); g.stroke();
}
// วงบนพื้น
function ring(g, cx, cy, r, z = 0, n = 48) {
  g.beginPath();
  for (let i = 0; i <= n; i++) { const a = i / n * TAU, p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
}

// ช่องของชนิดหนึ่งในแผนที่ (info.special)
function specialOf(info, kind) { return (info && info.special ? info.special : []).filter((s) => s.kind === kind); }
// กรอบบัลลังก์ผู้ให้กำเนิด { x0, x1, y, cx } จากช่อง fd_holythrone
function throneBox(info) {
  const list = specialOf(info, "fd_holythrone");
  if (!list.length) return null;
  const x0 = Math.min(...list.map((s) => s.x)), x1 = Math.max(...list.map((s) => s.x)) + 1, y = Math.min(...list.map((s) => s.y));
  return { x0, x1, y, cx: (x0 + x1) / 2 };
}
// ชั้นแท่นขั้นบันได (สูงสุด 0.12) รอบบัลลังก์ — ขอบหลังชิดขอบไกล
function daisTiers(tb, info) {
  const back = 0, out = [];
  const spans = [[2, 2, 0.04], [1.4, 1.5, 0.08], [0.8, 1.05, 0.12]];
  for (const [side, front, z] of spans) {
    out.push({ x0: Math.max(0, tb.x0 - side), x1: Math.min(info.cols, tb.x1 + side), y0: back, y1: tb.y + 1 + front, z });
  }
  return out;
}

// ตำแหน่งตัวละครบนจอ (ตัวใหญ่ = กลางตัว) · null = ไม่เห็นตัว
function unitAt(units, id) {
  const u = (units || []).find((it) => it.id === id && !it.corpse);
  if (!u) return null;
  const n = Math.max(1, u.size | 0), K = 1 + (n - 1) * 0.6;
  const cx = u.rx + (u.ox || 0) + n / 2, cy = u.ry + (u.oy || 0) + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { u, n, K, cx, cy, bx, by, s, head: by - s * 0.86 * K - (u.hz || 0) * s * 0.85, alpha: u.alpha != null ? u.alpha : 1, d: depthOf(cx, cy) };
}

// =================================================================== ธีม (อบ)
function sideBox(g, x0, y0, x1, y1, z0, z1, col, right) {
  const pts = (pp) => { g.beginPath(); pp.forEach(([x, y, z], i) => { const p = PS(x, y, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); };
  // ด้านที่หันเข้ากลางห้อง + ด้านหน้า + ฝา (ฉากไม่หมุน — +y หันเข้ากล้องเสมอ)
  const sx = right ? x0 : x1;
  pts([[sx, y0, z0], [sx, y1, z0], [sx, y1, z1], [sx, y0, z1]]); g.fillStyle = col.side; g.fill();
  pts([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]); g.fillStyle = col.front; g.fill();
  pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]); g.fillStyle = col.top; g.fill();
}

export const theme = {
  back(c) {
    const { g, C, bY, VX0, VX1, VW, VY0 } = c;
    let gr = g.createLinearGradient(0, VY0, 0, bY);
    gr.addColorStop(0, C.vault[0]); gr.addColorStop(1, C.vault[1]);
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - VY0 + 2);
    // ผนังไกลสูงจรดเพดาน + ซุ้มโค้งสูง (เว้นกลาง = มุขหลังบัลลังก์) — ส่วนบนจมความมืด (side วาดเงาเพดานทับ)
    const archH = Math.max(40, Math.min(300, bY - VY0 - 30));
    g.fillStyle = C.wall; g.fillRect(VX0, VY0, VW, bY - VY0);
    const step = 130;
    for (let x = OX - step * 1.5 - Math.ceil((OX - VX0) / step) * step; x < VX1 + step; x += step) {
      const mid = x + step / 2;
      if (Math.abs(mid - OX) < step) continue;
      const w = step * 0.62, l = mid - w / 2, r = mid + w / 2, base = bY - 6;
      g.fillStyle = C.wall2; g.beginPath(); g.moveTo(l, base); g.lineTo(l, base - archH * 0.6);
      g.quadraticCurveTo(l, base - archH, mid, base - archH * 1.05); g.quadraticCurveTo(r, base - archH, r, base - archH * 0.6); g.lineTo(r, base); g.closePath(); g.fill();
      // บัลลังก์เงาในซุ้ม (แถวที่ลึกเข้าไปในความมืด)
      g.fillStyle = "#0e1311"; g.fillRect(mid - 9, base - 34, 18, 34); g.fillRect(mid - 13, base - 14, 26, 14);
      g.fillStyle = "#7dffc0"; g.beginPath(); g.arc(mid, base - 28, 1.6, 0, TAU); g.fill();
      glow(g, mid, base - 10, w * 0.7, GREEN, 0.14);
      // เสาระหว่างซุ้ม (สูงจรดเพดาน)
      g.fillStyle = C.wallHi; g.fillRect(x - 15, VY0, 30, bY - VY0);
      g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(x + 5, VY0, 10, bY - VY0);
      g.fillStyle = `rgba(${GREEN},.22)`; g.fillRect(x - 15, bY - archH * 0.62, 30, 2);
    }
    // มุขกลาง: ซุ้มสูงมืดลึก + แสงเรืองรอบตำแหน่งวงตรา (ตัววงตราหมุนอยู่ใน animBack)
    const cy = bY - Math.min(180, (bY - VY0) * 0.5), top = Math.max(VY0, cy - 240);
    g.fillStyle = C.wall2; g.beginPath(); g.moveTo(OX - 160, bY); g.lineTo(OX - 160, cy); g.quadraticCurveTo(OX - 160, top, OX, top - 20); g.quadraticCurveTo(OX + 160, top, OX + 160, cy); g.lineTo(OX + 160, bY); g.closePath(); g.fill();
    glow(g, OX, cy, 300, GREEN, 0.3);
    gr = g.createLinearGradient(0, VY0, 0, bY);
    gr.addColorStop(0, `rgba(${PALE},0)`); gr.addColorStop(1, `rgba(${PALE},.14)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(OX - 40, VY0); g.lineTo(OX + 40, VY0); g.lineTo(OX + 150, bY); g.lineTo(OX - 150, bY); g.closePath(); g.fill();
    // ร่องเรืองแสงตีนผนัง
    g.fillStyle = `rgba(${GREEN},.35)`; g.fillRect(VX0, bY - 5, VW, 2);
    c.marks.tomb = { sx: OX, sy: cy, r: 125, bY, shafts: [OX - 360, OX - 190, OX + 190, OX + 360] };
  },
  ground(c) {
    const { g, C, R, info, VX0, VX1, bY, wx0, wx1, wy1 } = c;
    const { cols: COLS } = sceneSize(), bx0 = (COLS - info.cols) / 2, bx1 = bx0 + info.cols;
    const wl = bx0 - WALL, wr = bx1 + WALL;
    for (let y = -2; y < wy1 + 1; y++) for (let x = Math.floor(Math.max(wx0, wl)); x < Math.min(wx1, wr); x++) {
      const a = PS(x, y), b = PS(x + 1, y), d = PS(x + 1, y + 1), e = PS(x, y + 1);
      if (e[1] < bY || a[0] > VX1 + 40 || b[0] < VX0 - 40) continue;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(d[0], d[1]); g.lineTo(e[0], e[1]); g.closePath();
      g.fillStyle = C.slabB[Math.floor(R() * C.slabB.length)]; g.fill();
      g.strokeStyle = C.joint; g.lineWidth = 1; g.stroke();
    }
    // ร่องเขียวต่อจากทางเดินกลางออกไปทางเข้า (ใกล้กล้อง)
    const mx = (bx0 + bx1) / 2, y0 = (sceneSize().rows + info.rows) / 2;
    const p0 = PS(mx, y0), p1 = PS(mx, wy1 + 2);
    g.lineCap = "round";
    g.strokeStyle = `rgba(${GREEN},.18)`; g.lineWidth = 7; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    g.strokeStyle = `rgba(${PALE},.6)`; g.lineWidth = 1.6; g.stroke();
  },
  side(c) {
    const { g, C, info, wy1, VX0, VX1, VY0, VW, bY } = c;
    const { cols: COLS, rows: ROWS } = sceneSize(), bx0 = (COLS - info.cols) / 2, bx1 = bx0 + info.cols, by0 = (ROWS - info.rows) / 2;
    // สีที่จางขึ้นไปหาความมืดของเพดาน (อบ — สร้าง gradient ได้)
    const fadeTo = (col, y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, col); gr.addColorStop(0.45, col); gr.addColorStop(1, C.vault[0]); return gr; };
    const fadeCol = (col, x, y, h) => { const y0 = PS(x, y, 0)[1], y1 = PS(x, y, h)[1]; return { front: fadeTo(col.front, y0, y1), side: fadeTo(col.side, y0, y1), top: C.vault[0] }; };
    // ผนังข้าง (สูงจรดความมืด) + ร่องเรืองแสงตีนผนัง
    for (const [sx, right] of [[bx0 - WALL, false], [bx1 + WALL, true]]) {
      const q = [PS(sx, by0 - 2, 0), PS(sx, wy1 + 2, 0), PS(sx, wy1 + 2, 14), PS(sx, by0 - 2, 14)];
      g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
      g.fillStyle = fadeTo(C.wall, q[1][1], q[2][1]); g.fill();
      const l0 = PS(sx + (right ? -0.02 : 0.02), by0 - 2, 0.3), l1 = PS(sx + (right ? -0.02 : 0.02), wy1 + 2, 0.3);
      g.strokeStyle = `rgba(${GREEN},.4)`; g.lineWidth = 2; g.beginPath(); g.moveTo(l0[0], l0[1]); g.lineTo(l1[0], l1[1]); g.stroke();
    }
    // เสาสูงตระหง่าน 2 แนว + บัลลังก์ 2 แถวเรียงลึกเข้าไปทั้งสองข้าง (ไกล → ใกล้ · แถวนอกก่อน)
    const list = [], mid = (bx0 + bx1) / 2;
    for (let y = by0 - 1.5; y < wy1 + 1; y += 2.8) {
      list.push(["pillar", bx0 - 2.2, y, false], ["pillar", bx1 + 1.4, y, true], ["pillar", bx0 - 5.4, y + 1.4, false], ["pillar", bx1 + 4.6, y + 1.4, true]);
      list.push(["throne", bx0 - 3.2, y + 1.3, false], ["throne", bx1 + 2.4, y + 1.3, true], ["throne", bx0 - 4.5, y, false], ["throne", bx1 + 3.7, y, true]);
    }
    list.sort((a, b) => a[2] - b[2] || Math.abs(b[1] - mid) - Math.abs(a[1] - mid));
    for (const [kind, x, y, right] of list) {
      if (kind === "pillar") {
        sideBox(g, x - 0.05, y - 0.05, x + 0.85, y + 0.85, 0, 0.3, C.stone, right);
        sideBox(g, x + 0.1, y + 0.1, x + 0.7, y + 0.7, 0.3, 11, fadeCol(C.stone, x + 0.4, y + 0.7, 9), right);
        const band = PS(x + 0.4, y + 0.7, 1.4), gp = PS(x + 0.4, y + 0.7, 2.6);
        g.fillStyle = `rgba(${GREEN},.35)`; g.fillRect(band[0] - band[2] * 0.3, band[1] - 1, band[2] * 0.6, 2);
        glow(g, gp[0], gp[1], gp[2] * 0.5, GREEN, 0.45);
      } else {
        // บัลลังก์หันเข้ากลางห้อง: พนักพิงด้านนอก (ชิดผนัง) แล้วที่นั่ง
        const b0 = right ? x + 0.8 : x, b1 = b0 + 0.2;
        sideBox(g, b0, y, b1, y + 1, 0, 1.6, C.stone, right);
        sideBox(g, right ? x : x + 0.2, y + 0.15, right ? x + 0.8 : x + 1, y + 0.85, 0, 0.45, C.stone, right);
        const p = PS((b0 + b1) / 2, y + 0.5, 1.75);
        glow(g, p[0], p[1], p[2] * 0.4, GREEN, 0.6);
        g.fillStyle = "#7dffc0"; g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.06), 0, TAU); g.fill();
      }
    }
    // ความมืดกลืน: ขอบซ้าย/ขวาของจอ + เพดาน (กระดานวาดทับทีหลัง — ช่องเล่นไม่มืดลง)
    const nearY = by0 + info.rows / 2, xl = PS(bx0 - 1.5, nearY)[0], xr = PS(bx1 + 1.5, nearY)[0];
    let gr = g.createLinearGradient(VX0, 0, xl, 0);
    gr.addColorStop(0, "rgba(1,4,3,.88)"); gr.addColorStop(1, "rgba(1,4,3,0)");
    g.fillStyle = gr; g.fillRect(VX0, VY0, Math.max(0, xl - VX0), c.VY1 - VY0);
    gr = g.createLinearGradient(xr, 0, VX1, 0);
    gr.addColorStop(0, "rgba(1,4,3,0)"); gr.addColorStop(1, "rgba(1,4,3,.88)");
    g.fillStyle = gr; g.fillRect(xr, VY0, Math.max(0, VX1 - xr), c.VY1 - VY0);
    gr = g.createLinearGradient(0, VY0, 0, bY - 40);
    gr.addColorStop(0, "rgba(1,4,3,.97)"); gr.addColorStop(0.55, "rgba(1,4,3,.55)"); gr.addColorStop(1, "rgba(1,4,3,0)");
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - 40 - VY0);
  },
  // วงตรายักษ์หมุนช้า + ลำแสงไหว + ฝุ่นลอยในลำแสง (ทุกเฟรม · ใต้กระดาน) — lowQ: t = 0 (นิ่ง) และไม่มีฝุ่น
  animBack(g, f, t) {
    const m = f.marks && f.marks.tomb;
    if (!m) return;
    const { sx, sy, r, bY } = m, top = f.view.y0;
    const wave = gemWave(-1, t), pul = t ? 0.5 + 0.5 * Math.sin(t / 1300) : 0.5;
    g.save();
    g.globalCompositeOperation = "lighter";
    softGlow(g, sx, sy, r * (2 + 0.3 * AURA), GREEN, 0.22 + 0.1 * pul + 0.3 * wave + 0.2 * AURA);
    const outer = sigilSprite("o"), inner = sigilSprite("i");
    if (outer && inner) {
      const S = r / 150;
      for (const [img, rot, a] of [[outer, t / 26000, 0.75], [inner, -t / 15000, 0.65]]) {
        g.save(); g.translate(sx, sy); g.rotate(rot); g.globalAlpha = Math.min(1, a + 0.25 * wave + 0.2 * AURA);
        g.drawImage(img, -160 * S, -160 * S, 320 * S, 320 * S); g.restore();
      }
    }
    // ลำแสงจากเพดาน (ไหวช้า) + ฝุ่นลอยในลำแสง
    m.shafts.forEach((x, i) => {
      const a = 0.1 + 0.06 * (t ? Math.sin(t / (2300 + i * 410) + i * 2) : 0) + 0.08 * AURA;
      beam(g, x, top, bY + 30, 70 + (i % 2) * 24, a);
      if (!t || f.lowQ) return;
      g.fillStyle = "#c8ffe4";
      for (let k = 0; k < 7; k++) {
        const ph = (t / (9000 + k * 700) + hash(i * 7 + k, 8)) % 1;
        const px = x + (hash(i * 7 + k, 9) - 0.5) * 50 + Math.sin(t / 1700 + k) * 6, py = bY + 20 - ph * (bY + 20 - top);
        g.globalAlpha = Math.sin(ph * Math.PI) * 0.7;
        g.fillRect(px - 1, py - 1, 2, 2);
      }
    });
    g.restore();
  },
  // แผ่นหินของกระดาน (หมุนตามกระดาน) — ทางเดินกลางขัดเงาสว่างกว่า · ร่องเรืองแสง + วงตราที่ผ่านแท่นศิลาตรา
  base(c) {
    const { g, C, info, R } = c;
    const { cols, rows } = info, a0 = Math.round(cols * 0.29), a1 = cols - a0; // ทางเดินกลาง 4..9 (14 ช่อง)
    g.fillStyle = "rgba(0,0,0,.45)";
    gPoly(g, [[-0.2, -0.2], [cols + 0.2, -0.2], [cols + 0.2, rows + 0.25], [-0.2, rows + 0.25]]); g.fill();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const aisle = x >= a0 && x < a1, pal = aisle ? C.slabA : C.slabB;
      quad(g, x, y); g.fillStyle = pal[Math.floor(R() * pal.length)]; g.fill();
      quad(g, x, y, 0.035); g.strokeStyle = C.joint; g.lineWidth = 1; g.stroke();
      if (R() < 0.18) { // รอยร้าว
        const p0 = P(x + 0.2 + R() * 0.6, y + 0.2 + R() * 0.6), p1 = P(x + 0.2 + R() * 0.6, y + 0.2 + R() * 0.6);
        g.strokeStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      }
    }
    const tb = throneBox(info), start = tb ? tb.y + 2.05 : 0;
    const [, , s] = P(cols / 2, rows / 2), wide = Math.max(4, s * 0.16);
    emissive(g, [[cols / 2, start], [cols / 2, rows]], 0, wide);
    emissive(g, [[a0, start + 1], [a0, rows]], 0, wide * 0.6, 0.55);
    emissive(g, [[a1, start + 1], [a1, rows]], 0, wide * 0.6, 0.55);
    // วงตราผ่านแท่นศิลาตรา
    const pads = specialOf(info, "fd_crestpad");
    if (pads.length) {
      const cx = pads.reduce((t, p) => t + p.x + 0.5, 0) / pads.length, cy = pads.reduce((t, p) => t + p.y + 0.5, 0) / pads.length;
      const r = Math.max(...pads.map((p) => Math.hypot(p.x + 0.5 - cx, p.y + 0.5 - cy)));
      g.lineWidth = wide * 0.5; g.strokeStyle = `rgba(${GREEN},.14)`; ring(g, cx, cy, r); g.stroke();
      g.lineWidth = 1.4; g.strokeStyle = `rgba(${PALE},.55)`; ring(g, cx, cy, r); g.stroke();
      ring(g, cx, cy, r * 0.74); g.stroke();
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU + TAU / 16, p0 = P(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74), p1 = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      }
    }
  },
  // แท่นขั้นบันได 3 ชั้นรอบบัลลังก์ผู้ให้กำเนิด (ทับเส้นตาราง → ขีดเส้นช่องใหม่บนฝา) + ลายช่องบัลลังก์
  deco(c) {
    const { g, C, info } = c;
    const tb = throneBox(info);
    if (!tb) return;
    const tiers = daisTiers(tb, info);
    tiers.forEach((t, i) => box(g, t.x0, t.y0, t.x1, t.y1, i ? tiers[i - 1].z : 0, t.z, C.dais[i]));
    const top = tiers[tiers.length - 1], z = top.z;
    g.strokeStyle = C.grid; g.lineWidth = 1;
    for (const t of tiers) {
      for (let x = Math.ceil(t.x0); x <= Math.floor(t.x1); x++) { const a = P(x, t.y0, t.z), b = P(x, t.y1, t.z); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      for (let y = Math.ceil(t.y0); y <= Math.floor(t.y1); y++) { const a = P(t.x0, y, t.z), b = P(t.x1, y, t.z); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    // ร่องเรืองแสงขอบขั้น
    for (const t of tiers) emissive(g, [[t.x0, t.y1], [t.x1, t.y1]], t.z, 3, 0.5);
    // ช่องบัลลังก์: กรอบเรือง + วงตราเล็ก
    for (const sp of specialOf(info, "fd_holythrone")) {
      quad(g, sp.x, sp.y, 0.06, z); g.fillStyle = "rgba(120,255,190,.08)"; g.fill();
      g.strokeStyle = `rgba(${PALE},.6)`; g.lineWidth = 1.5; g.stroke();
    }
    g.strokeStyle = `rgba(${PALE},.45)`; g.lineWidth = 1.2; ring(g, tb.cx, tb.y + 0.5, 0.95, z); g.stroke();
  },
  // ฝุ่นเขียวลอยทั้งจอ (lowQ ข้าม — boardDraw ไม่เรียก)
  ambient(g, f, t) {
    const { view } = f, W = view.x1 - view.x0, H = view.y1 - view.y0;
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 46; i++) {
      const ph = (t / (11000 + (i % 7) * 1300) + hash(i, 1)) % 1;
      const x = view.x0 + ((hash(i, 2) + Math.sin(t / 2600 + i) * 0.015) % 1) * W;
      const y = view.y1 + 10 - ph * (H + 20);
      const tw = 0.5 + 0.5 * Math.sin(t / (400 + i * 23) + i);
      g.globalAlpha = Math.sin(ph * Math.PI) * (0.35 + 0.45 * tw) * (1 + AURA * 0.6);
      g.fillStyle = i % 4 ? "#8affc4" : "#e0fff0";
      const r = 1 + hash(i, 3) * 1.6;
      g.fillRect(x - r / 2, y - r / 2, r, r);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  },
};
theme.pal = PAL;

// =================================================================== สิ่งกีดขวาง
// บัลลังก์หิน (หันเข้าทางเดินกลาง) · ศิลาตราเรืองบนพนักพิง
function drawThrone(g, x, y, ctx, now) {
  const { C, cols } = ctx, col = C.stone, left = x < (cols || 14) / 2;
  const bx0 = left ? x + 0.12 : x + 0.72, bx1 = bx0 + 0.16;
  const sx0 = left ? x + 0.28 : x + 0.15, sx1 = left ? x + 0.85 : x + 0.72;
  const [cx, cy, s] = P(x + 0.5, y + 0.5);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(cx, cy, s * 0.5, s * 0.16, 0, 0, TAU); g.fill();
  const parts = [
    { d: depthOf((bx0 + bx1) / 2, y + 0.5), f: () => box(g, bx0, y + 0.14, bx1, y + 0.86, 0, 1.4, col) },
    { d: depthOf((sx0 + sx1) / 2, y + 0.5), f: () => box(g, sx0, y + 0.2, sx1, y + 0.8, 0, 0.36, col) },
    { d: depthOf((sx0 + sx1) / 2, y + 0.2), f: () => box(g, sx0, y + 0.16, sx1, y + 0.26, 0.36, 0.58, col) },
    { d: depthOf((sx0 + sx1) / 2, y + 0.8), f: () => box(g, sx0, y + 0.74, sx1, y + 0.84, 0.36, 0.58, col) },
  ].sort((a, b) => a.d - b.d);
  for (const p of parts) p.f();
  const gp = P((bx0 + bx1) / 2 + (left ? 0.1 : -0.1), y + 0.5, 1.18), pul = 0.5 + 0.5 * Math.sin(now / 700 + x * 1.7 + y), wv = gemWave(y, now);
  g.save(); g.globalCompositeOperation = "lighter";
  softGlow(g, gp[0], gp[1], s * (0.32 + 0.12 * AURA + 0.35 * wv), wv > 0.2 ? PALE : GREEN, 0.45 + 0.25 * pul + 0.3 * AURA + 0.5 * wv);
  g.restore();
  gem(g, gp[0], gp[1], s * 0.09, now / 900 + x, Math.min(1, AURA + wv));
}
// เสาหิน (ฐาน · ลำเสา · หัวเสา) + แถบเรืองแสง
function drawPillar(g, x, y, ctx, now) {
  const { C } = ctx, col = C.stone;
  const [cx, cy, s] = P(x + 0.5, y + 0.5);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(cx, cy, s * 0.48, s * 0.16, 0, 0, TAU); g.fill();
  box(g, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0, 0.22, col);
  // ลำเสาสูงจางขึ้นไปหาความมืด (3 ท่อน สีเข้มขึ้นทีละท่อน · ไม่มีหัวเสา = หายเข้าเพดาน)
  box(g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, 0.22, 1.8, col);
  box(g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, 1.8, 2.7, C.stoneUp[0]);
  box(g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, 2.7, 3.4, C.stoneUp[1]);
  const wv = gemWave(y, now);
  const band = { front: `rgba(120,255,190,${0.55 + 0.4 * wv})`, side: `rgba(90,220,160,${0.4 + 0.4 * wv})`, top: "rgba(120,255,190,.2)" };
  box(g, x + 0.215, y + 0.215, x + 0.785, y + 0.785, 1.24, 1.3, band);
  const p = P(x + 0.5, y + 0.5, 1.27), pul = 0.5 + 0.5 * Math.sin(now / 900 + x + y * 0.7);
  g.save(); g.globalCompositeOperation = "lighter";
  softGlow(g, p[0], p[1], s * (0.5 + 0.3 * wv), GREEN, 0.18 + 0.12 * pul + 0.25 * AURA + 0.45 * wv);
  g.restore();
}
export function drawObstacle(g, t, ctx, now) {
  if (t.kind === "fd_throne") drawThrone(g, t.x, t.y, ctx, now);
  else if (t.kind === "fd_tombpillar") drawPillar(g, t.x, t.y, ctx, now);
}

// =================================================================== ช่องพิเศษ
// แท่นศิลาตรา: แท่นกลมเตี้ย + วงตรา (อบ) · แสงในวงเต้นทุกเฟรม (anim)
export function bakeSpecial(g, sp, ctx) {
  if (sp.kind !== "fd_crestpad") return; // บัลลังก์ผู้ให้กำเนิดวาดใน deco (บนแท่นขั้นบันได)
  const { x, y } = sp, cx = x + 0.5, cy = y + 0.5;
  const [, , s] = P(cx, cy);
  g.fillStyle = "rgba(0,0,0,.4)"; ring(g, cx, cy + 0.04, 0.42); g.fill();
  g.fillStyle = ctx.night ? "#3e4843" : "#46504a"; ring(g, cx, cy, 0.4, 0.06); g.fill();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1; g.stroke();
  g.strokeStyle = `rgba(${PALE},.7)`; g.lineWidth = Math.max(1, s * 0.03); ring(g, cx, cy, 0.31, 0.06); g.stroke();
  g.lineWidth = 1; ring(g, cx, cy, 0.2, 0.06, 6); g.stroke();
}
export function animSpecial(g, sp, ctx, t) {
  if (sp.kind !== "fd_crestpad") return;
  const cx = sp.x + 0.5, cy = sp.y + 0.5, [px, py, s] = P(cx, cy, 0.07);
  const pul = ctx.lowQ ? 0.5 : 0.5 + 0.5 * Math.sin(t / 650 + sp.x + sp.y), wv = ctx.lowQ ? 0 : gemWave(sp.y, t);
  g.save(); g.globalCompositeOperation = "lighter";
  softGlow(g, px, py, s * (0.42 + 0.3 * wv), GREEN, 0.22 + 0.18 * pul + 0.5 * wv);
  g.restore();
}

// =================================================================== ทุกเฟรม: พื้น (ใต้ไฮไลต์)
function boardPoly(g, info, y0 = 0, y1 = info.rows) { gPoly(g, [[0, y0], [info.cols, y0], [info.cols, y1], [0, y1]]); }
export function ground(g, fd, info, now, lowQ) {
  const aura = !!(fd.weather && fd.weather.kind === "aura");
  AURA = aura ? 1 : 0;
  ROWS_NOW = info.rows;
  const list = Array.isArray(fd.fx) ? fd.fx : [];
  g.save();
  g.globalCompositeOperation = "lighter";
  // ออร่า: ทั้งห้องเรืองเขียว
  if (aura) {
    boardPoly(g, info);
    g.fillStyle = `rgba(60,255,160,${0.06 + (lowQ ? 0 : 0.03 * Math.sin(now / 900))})`; g.fill();
  }
  const tb = throneBox(info), start = tb ? tb.y + 2.05 : 0, mx = info.cols / 2;
  // พลังงานไหลตามร่อง (ทางเข้า → บัลลังก์): เส้นประเลื่อนบน 3 ร่อง + หัวแสงวิ่งบนร่องกลาง (lowQ = ไม่มี)
  if (!lowQ) {
    const [, , s] = P(mx, info.rows / 2), a0 = Math.round(info.cols * 0.29), a1 = info.cols - a0;
    const speed = aura ? 18 : 34, dash = s * 0.22, gap = s * 0.7;
    g.lineCap = "round";
    g.setLineDash([dash, gap]);
    for (const [x, y0, w, a] of [[mx, start, 0.06, 0.55], [a0, start + 1, 0.04, 0.32], [a1, start + 1, 0.04, 0.32]]) {
      g.lineDashOffset = -(now / speed) - x * 13;
      gPoly(g, [[x, info.rows], [x, y0]], false);
      g.strokeStyle = `rgba(${PALE},${a + 0.25 * AURA})`; g.lineWidth = Math.max(1.2, s * w); g.stroke();
    }
    g.setLineDash([]);
    const ph = (now / (aura ? 2400 : 4200)) % 1, yh = info.rows - ph * (info.rows - start);
    const [hx, hy, hs] = P(mx, yh);
    softGlow(g, hx, hy, hs * 0.55, GREEN, 0.5 + 0.3 * AURA);
    // วงตราของแท่นหมุนช้า (เส้นประบนวง)
    const pads = specialOf(info, "fd_crestpad");
    if (pads.length) {
      const cx = pads.reduce((t, p) => t + p.x + 0.5, 0) / pads.length, cy = pads.reduce((t, p) => t + p.y + 0.5, 0) / pads.length;
      const r = Math.max(...pads.map((p) => Math.hypot(p.x + 0.5 - cx, p.y + 0.5 - cy)));
      g.setLineDash([s * 0.3, s * 0.9]); g.lineDashOffset = -now / 60;
      ring(g, cx, cy, r, 0, 40); g.strokeStyle = `rgba(${PALE},${0.35 + 0.25 * AURA})`; g.lineWidth = Math.max(1.2, s * 0.04); g.stroke();
      g.setLineDash([]);
    }
  }
  // แท่นศิลาตรา: เรืองแรงขึ้นเมื่อแสงเขียวเรืองจะมาเทิร์นหน้า (glowIn 0) / ระหว่างออร่า
  const hot = aura || fd.glowIn === 0;
  if (hot) for (const sp of specialOf(info, "fd_crestpad")) {
    const [px, py, s] = P(sp.x + 0.5, sp.y + 0.5, 0.07), pul = lowQ ? 0.5 : 0.5 + 0.5 * Math.sin(now / 260 + sp.x);
    softGlow(g, px, py, s * 0.7, GREEN, 0.25 + 0.25 * pul);
  }
  // คลื่นแสงเขียวเรือง: วิ่งจากทางเข้าไปหาบัลลังก์ แท่นที่คลื่นผ่านลุกวาบ
  for (const e of list) {
    if (e.kind !== "glow") continue;
    const k = fxT(e, now, fx.glow);
    if (k >= 1) continue;
    const yb = info.rows + 1 - k * (info.rows + 2), amp = (e.aura ? 1.3 : 1) * Math.min(1, (1 - k) * 4);
    for (let y = Math.max(0, Math.floor(yb - 2.5)); y < Math.min(info.rows, Math.ceil(yb + 2.5)); y++) {
      const d = Math.abs(y + 0.5 - yb), a = Math.exp(-d * d * 0.8) * 0.32 * amp;
      if (a < 0.01) continue;
      boardPoly(g, info, y, y + 1); g.fillStyle = `rgba(80,255,170,${a})`; g.fill();
    }
    for (const sp of specialOf(info, "fd_crestpad")) {
      const d = sp.y + 0.5 - yb, a = Math.exp(-d * d * 0.6) * amp;
      const [px, py, s] = P(sp.x + 0.5, sp.y + 0.5, 0.07);
      softGlow(g, px, py, s * 1.1, PALE, a);
    }
    if (tb && k > 0.78) { const [px, py, s] = P(tb.cx, tb.y + 0.5, 0.12); softGlow(g, px, py, s * 2.2, GREEN, (k - 0.78) * 4 * (1 - k) * 4); }
  }
  g.restore();
}

// =================================================================== ทุกเฟรม: ของเรียงความลึกกับตัวละคร
function holyThrone(items, g, tb, units, now, lowQ, C) {
  const z = 0.12, { cx, y } = tb, half = (tb.x1 - tb.x0) / 2 * 0.86;
  const col = C.holy;
  const pul = lowQ ? 0.5 : 0.5 + 0.5 * Math.sin(now / 800);
  // พนักพิงอยู่หน้ากล้องกว่าคนที่นั่ง (หมุนกระดาน) = จางลงแบบสิ่งกีดขวางสูง
  const dBack = depthOf(cx, y - 0.05);
  const fade = (units || []).some((u) => !u.corpse && u.ry + 0.5 > y - 0.5 && u.ry + 0.5 < y + 1.5 && u.rx + 0.5 > tb.x0 - 0.5 && u.rx + 0.5 < tb.x1 + 0.5 && depthOf(u.rx + 0.5, u.ry + 0.5) < dBack);
  // พนักพิง + ยอด + ศิลาใหญ่ + วงตรา + ลำแสง (หลังคนที่นั่ง)
  items.push({ d: dBack, f: () => {
    g.save();
    if (fade) g.globalAlpha *= 0.4;
    const [bx, by, s] = P(cx, y + 0.5, z);
    beam(g, bx, by - s * 9, by + s * 0.2, s * (2.2 + 0.4 * AURA), 0.35 + 0.15 * pul + 0.35 * AURA);
    const sc = P(cx, y - 0.25, z + 2.35);
    g.save(); g.globalCompositeOperation = "lighter";
    softGlow(g, sc[0], sc[1], sc[2] * (1.7 + 0.6 * AURA), GREEN, 0.35 + 0.2 * pul + 0.3 * AURA);
    g.strokeStyle = `rgba(${PALE},${0.4 + 0.2 * pul})`; g.lineWidth = Math.max(1, sc[2] * 0.04);
    const rot = lowQ ? 0 : now / 6000, R = sc[2] * 1.15;
    g.beginPath(); g.ellipse(sc[0], sc[1], R, R, 0, 0, TAU); g.stroke();
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const a = rot + k * TAU / 6, px = sc[0] + Math.cos(a) * R * 0.8, py = sc[1] + Math.sin(a) * R * 0.8; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
    g.restore();
    box(g, cx - half, y - 0.22, cx + half, y + 0.02, z, z + 2.45, col);
    gPoly(g, [[cx - half * 0.7, y - 0.1, z + 2.45], [cx + half * 0.7, y - 0.1, z + 2.45], [cx, y - 0.1, z + 3.2]]);
    g.fillStyle = col.front; g.fill(); g.strokeStyle = col.edge; g.lineWidth = 1; g.stroke();
    const gp = P(cx, y + 0.03, z + 1.85);
    g.save(); g.globalCompositeOperation = "lighter";
    const wv = gemWave(y, now);
    softGlow(g, gp[0], gp[1], gp[2] * (0.75 + 0.3 * AURA + 0.8 * wv), wv > 0.2 ? PALE : GREEN, 0.6 + 0.3 * pul + 0.4 * wv);
    g.restore();
    gem(g, gp[0], gp[1], gp[2] * 0.2, lowQ ? 0.6 : now / 700, 0.5 + AURA * 0.5);
    g.restore();
  } });
  // ที่นั่ง + ที่วางแขน (คนที่นั่งวาดทับ)
  items.push({ d: depthOf(cx, y + 0.35), f: () => {
    box(g, cx - half * 0.88, y + 0.02, cx + half * 0.88, y + 0.62, z, z + 0.42, col);
    box(g, cx - half, y + 0.02, cx - half * 0.86, y + 0.72, z, z + 0.72, col);
    box(g, cx + half * 0.86, y + 0.02, cx + half, y + 0.72, z, z + 0.72, col);
  } });
}
export function items(list, g, fd, info, units, now, lowQ) {
  const tb = throneBox(info);
  if (tb) holyThrone(list, g, tb, units, now, lowQ, PAL.day);
  const fxs = Array.isArray(fd.fx) ? fd.fx : [];
  const picking = new Set();
  for (const e of fxs) if (e.kind === "crest_pick" && fxT(e, now, fx.crest_pick) < 1) picking.add(e.id);
  // ศิลาตราลอยบนพื้น (หลังคนที่ยืนช่องเดียวกัน)
  for (const st of Array.isArray(fd.stones) ? fd.stones : []) {
    const drop = fxs.find((e) => e.kind === "crest_drop" && e.x === st.x && e.y === st.y);
    const kd = drop ? fxT(drop, now, fx.crest_drop) : 1;
    list.push({ d: depthOf(st.x + 0.5, st.y + 0.5) - 0.004, f: () => {
      const bob = lowQ ? 0 : Math.sin(now / 600 + st.x * 1.3 + st.y) * 0.05;
      const z = 0.5 + bob + (1 - kd) * (1 - kd) * 1.4;
      const [sx, sy, s] = P(st.x + 0.5, st.y + 0.5, 0.06), [gx, gy] = P(st.x + 0.5, st.y + 0.5, z);
      g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(sx, sy, s * 0.16, s * 0.05, 0, 0, TAU); g.fill();
      g.save(); g.globalCompositeOperation = "lighter";
      softGlow(g, gx, gy, s * 0.5, GREEN, 0.65);
      g.restore();
      gem(g, gx, gy, s * 0.17, lowQ ? 0.4 : now / 650 + st.x, 0.4);
    } });
  }
  // ศิลาเหนือหัวคนถือ · ไอร่างอสูร
  for (const c of Array.isArray(fd.carry) ? fd.carry : []) {
    const A = unitAt(units, c.id);
    if (!A || A.alpha < 0.05 || picking.has(c.id)) continue;
    if (c.beast) list.push({ d: A.d - 0.002, f: () => {
      g.save(); g.globalAlpha *= A.alpha; g.globalCompositeOperation = "lighter";
      const fl = lowQ ? 0.5 : 0.5 + 0.5 * Math.sin(now / 160 + A.cx * 3);
      softGlow(g, A.bx, (A.by + A.head) / 2, A.s * 0.95 * A.K, "40,200,110", 0.35 + 0.2 * fl);
      g.strokeStyle = `rgba(${GREEN},${0.5 + 0.3 * fl})`; g.lineWidth = Math.max(1.5, A.s * 0.04);
      ring(g, A.cx, A.cy, 0.5 * A.n + 0.05 * fl); g.stroke();
      g.restore();
    } });
    list.push({ d: A.d + 0.002, f: () => {
      const bob = lowQ ? 0 : Math.sin(now / 500 + A.cx) * A.s * 0.03;
      const gx = A.bx, gy = A.head - A.s * 0.32 + bob;
      g.save(); g.globalAlpha *= A.alpha; g.globalCompositeOperation = "lighter";
      softGlow(g, gx, gy, A.s * (c.beast ? 0.5 : 0.36), c.beast ? "60,230,140" : GREEN, 0.7);
      g.restore();
      g.save(); g.globalAlpha *= A.alpha;
      gem(g, gx, gy, A.s * (c.beast ? 0.13 : 0.1), lowQ ? 0.5 : now / 500, c.beast ? 1 : 0.4);
      // นับเทิร์นที่ถือ: จุด 3 จุดใต้ศิลา (ติดแล้ว = สว่าง)
      if (!c.beast) for (let i = 0; i < 3; i++) {
        g.fillStyle = i < (c.n | 0) ? "#9dffd0" : "rgba(20,60,40,.7)";
        g.beginPath(); g.arc(gx + (i - 1) * A.s * 0.075, gy + A.s * 0.16, Math.max(1.2, A.s * 0.022), 0, TAU); g.fill();
      }
      g.restore();
    } });
  }
  // ชีพจรเทพพร้อม: วงแสงหมุนที่เท้า
  for (const id of Array.isArray(fd.pulse) ? fd.pulse : []) {
    const A = unitAt(units, id);
    if (!A || A.alpha < 0.05) continue;
    list.push({ d: A.d - 0.003, f: () => {
      g.save(); g.globalAlpha *= A.alpha;
      const rot = lowQ ? 0 : now / 1400, r = 0.42 * A.n;
      g.strokeStyle = `rgba(${PALE},.7)`; g.lineWidth = Math.max(1, A.s * 0.025);
      g.setLineDash([A.s * 0.12, A.s * 0.08]); g.lineDashOffset = -rot * A.s;
      ring(g, A.cx, A.cy, r); g.stroke();
      g.setLineDash([]);
      g.restore();
    } });
  }
  // หยิบศิลา: ศิลาลอยจากแท่นขึ้นไปเหนือหัว
  for (const e of fxs) {
    if (e.kind !== "crest_pick") continue;
    const k = fxT(e, now, fx.crest_pick);
    if (k >= 1) continue;
    const A = unitAt(units, e.id);
    const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.5);
    const tx = A ? A.bx : sx, ty = A ? A.head - A.s * 0.32 : sy - s;
    const q = k * k * (3 - 2 * k), gx = sx + (tx - sx) * q, gy = sy + (ty - sy) * q - Math.sin(q * Math.PI) * s * 0.6;
    list.push({ d: (A ? A.d : depthOf(e.x + 0.5, e.y + 0.5)) + 0.003, f: () => {
      g.save(); g.globalCompositeOperation = "lighter";
      softGlow(g, gx, gy, s * (0.6 + 0.4 * Math.sin(k * Math.PI)), PALE, 0.8);
      g.restore();
      gem(g, gx, gy, s * 0.15, now / 200, 1);
    } });
  }
}

// =================================================================== ทุกเฟรม: ทับตัวละคร (ฉากเหตุการณ์ + เสียง)
export function air(g, fd, info, units, now, lowQ) {
  const list = Array.isArray(fd.fx) ? fd.fx : [];
  for (const e of list) {
    const ms = fx[e.kind];
    if (!ms) continue;
    const k = fxT(e, now, ms);
    if (k >= 1) continue;
    if (SFX[e.kind] && fxOnce(e)) { try { fodlanAudio().sfx(SFX[e.kind], { gain: e.kind === "crest_drop" ? 0.5 : 1 }); } catch { /* เสียงพังห้ามทำให้ฉากพัง */ } }
    const A = e.id ? unitAt(units, e.id) : null;
    const n = A ? A.n : Math.max(1, e.size | 0);
    const cx = A ? A.cx : e.x + n / 2, cy = A ? A.cy : e.y + n / 2;
    const [bx, by, s] = P(cx, cy);
    const head = A ? A.head : by - s * 0.86;
    g.save();
    g.globalCompositeOperation = "lighter";
    if (e.kind === "throne") {
      // ลำแสงลงจากเพดาน + ประกายลอยขึ้น
      const a = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.9;
      beam(g, bx, by - s * 10, by + s * 0.1, s * 1.3 * n, a);
      softGlow(g, bx, (by + head) / 2, s * 1.1 * n, GREEN, a * 0.8);
      if (!lowQ) for (let i = 0; i < 14; i++) {
        const ph = (k * 1.6 + hash(i, 4)) % 1, [px, py] = P(cx + (hash(i, 5) - 0.5) * 0.9 * n, cy + (hash(i, 6) - 0.5) * 0.5, ph * 2.2);
        g.globalAlpha = Math.sin(ph * Math.PI) * (1 - k); g.fillStyle = i % 3 ? "#9dffd0" : "#ffffff"; g.fillRect(px - 1.2, py - 1.2, 2.4, 2.4);
      }
    } else if (e.kind === "revive") {
      // ชีพจรเทพ: แสงวาบ 2 จังหวะ (ตุบ-ตุบ) + วงขยายจากเท้า + ลำแสงสั้น
      const beat = Math.max(Math.exp(-Math.pow((k - 0.12) * 14, 2)), 0.8 * Math.exp(-Math.pow((k - 0.32) * 14, 2)));
      softGlow(g, bx, (by + head) / 2, s * (1.2 + beat) * n, PALE, 0.4 + beat * 0.6);
      beam(g, bx, head - s * 4, by + s * 0.1, s * 0.9 * n, (1 - k) * 0.8);
      for (const off of [0, 0.18]) {
        const kk = Math.max(0, Math.min(1, (k - off) / 0.7));
        if (kk <= 0 || kk >= 1) continue;
        g.strokeStyle = `rgba(${PALE},${(1 - kk) * 0.9})`; g.lineWidth = Math.max(1.5, s * 0.05 * (1 - kk));
        ring(g, cx, cy, 0.3 * n + kk * 1.8); g.stroke();
      }
    } else if (e.kind === "beast") {
      // คลั่งเป็นอสูร: ห้องมืดวาบ + คลื่นกระแทกเขียวเข้ม
      if (k < 0.5) {
        g.globalCompositeOperation = "source-over";
        boardTint(g, info, `rgba(0,20,10,${(0.5 - k) * 0.6})`);
        g.globalCompositeOperation = "lighter";
      }
      softGlow(g, bx, (by + head) / 2, s * (1.4 - k * 0.6) * n, "40,200,110", (1 - k) * 0.9);
      const kk = Math.min(1, k / 0.8);
      g.strokeStyle = `rgba(60,230,140,${(1 - kk) * 0.9})`; g.lineWidth = Math.max(2, s * 0.09 * (1 - kk));
      ring(g, cx, cy, 0.4 * n + kk * 3.2); g.stroke();
    } else if (e.kind === "crest_pick") {
      const [px, py, ps] = P(e.x + 0.5, e.y + 0.5, 0.07);
      g.strokeStyle = `rgba(${PALE},${(1 - k) * 0.8})`; g.lineWidth = 1.5;
      ring(g, e.x + 0.5, e.y + 0.5, 0.2 + k * 0.6, 0.07); g.stroke();
      softGlow(g, px, py, ps * 0.8, GREEN, (1 - k) * 0.6);
    } else if (e.kind === "crest_drop") {
      if (k > 0.55) {
        const kk = (k - 0.55) / 0.45;
        g.strokeStyle = `rgba(${PALE},${(1 - kk) * 0.8})`; g.lineWidth = 1.5;
        ring(g, e.x + 0.5, e.y + 0.5, 0.15 + kk * 0.5, 0.07); g.stroke();
      }
    }
    g.restore();
  }
}
// ทับทั้งกระดาน (ทับตัวละครด้วย — ฉากอสูรคลั่ง)
function boardTint(g, info, fill) {
  gPoly(g, [[-1, -1], [info.cols + 1, -1], [info.cols + 1, info.rows + 1], [-1, info.rows + 1]]);
  g.fillStyle = fill; g.fill();
}

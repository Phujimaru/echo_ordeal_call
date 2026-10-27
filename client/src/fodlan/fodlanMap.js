// ============================================================
//  แผนที่ทวีป Fodlan แบบนูนต่ำบนกระดาษหนังเก่า (วาดเองทั้งหมด — อ้างอิงบรรยากาศจากภาพที่ผู้ใช้ส่ง ไม่ลอกภาพ)
//  ใช้ในฉากเปิดแมตช์ (fodlanFlight.js) และฉากเปลี่ยนแผนที่ (FodlanTravel.jsx)
//
//  buildFodlanMap(THREE, { lowQ }) → Promise<map>  (แบ่งงานเป็นช่วงๆ ไม่ให้จอค้างระหว่างการ์ดผู้เล่นโคจร)
//   map.group          — กระดาษ (ระนาบ XZ กว้าง MAP_W × MAP_D หน่วย กลาง = จุดกำเนิด) + โต๊ะไม้ + แสง + ฝุ่นแสง
//   map.at(u, v)       — จุดบนผิวแผนที่ (พิกัด local ของ group) ที่ uv
//   map.markers[i]     — หมุดด่าน i (0..4): set(show 0..1, active 0..1)
//   map.route(a, b)    — เส้นทางประจากด่าน a ไป b: { setProgress(0..1), tokenPos(k) , dispose() }
//   map.setReveal(r, cx, cz) — แผนที่ "ลุกเป็นสีทอง" จากจุด (cx, cz) รัศมี r (หน่วยฉาก) · r < 0 = เผยหมด
//   map.update(t, H)   — ทุกเฟรม
// ============================================================
import { FODLAN_STAGES } from "./stages";
import { rng, fbm2, clamp01, smooth, textSprite, softTex, particles, lightShaft, budget } from "./kit";

export const MAP_W = 16;
export const MAP_D = 12;
const HEIGHT = 0.55; // ความสูงภูเขาสูงสุด (หน่วยฉาก)

// ---------- ภูมิศาสตร์ (uv 0..1 · v = 0 เหนือ) ----------
const COAST = [
  [0.52, 0.07], [0.58, 0.05], [0.63, 0.08], [0.62, 0.13], [0.66, 0.16], [0.7, 0.19], [0.73, 0.17], [0.78, 0.2],
  [0.82, 0.22], [0.86, 0.27], [0.89, 0.33], [0.905, 0.42], [0.885, 0.5], [0.9, 0.58], [0.875, 0.66],
  [0.84, 0.72], [0.78, 0.76], [0.72, 0.775], [0.67, 0.8], [0.62, 0.84], [0.6, 0.9], [0.56, 0.95], [0.52, 0.9],
  [0.5, 0.94], [0.46, 0.88], [0.44, 0.84], [0.4, 0.86], [0.35, 0.85], [0.31, 0.82], [0.34, 0.78], [0.38, 0.76],
  [0.33, 0.72], [0.26, 0.72], [0.19, 0.745], [0.14, 0.72], [0.18, 0.68], [0.25, 0.665], [0.3, 0.64],
  [0.26, 0.6], [0.2, 0.585], [0.13, 0.555], [0.115, 0.5], [0.16, 0.46], [0.22, 0.44], [0.26, 0.4],
  [0.24, 0.34], [0.27, 0.28], [0.31, 0.27], [0.3, 0.21], [0.35, 0.18], [0.37, 0.12], [0.42, 0.11], [0.45, 0.08],
];
// แผ่นดินอื่นที่ขอบแผนที่ (ไม่นูน · สีจางกว่า) + เกาะเล็ก
const OUTER = [
  { name: "SRENG", pts: [[0.6, -0.05], [0.74, -0.04], [0.8, 0.04], [0.76, 0.1], [0.69, 0.08], [0.64, 0.03]], label: [0.71, 0.03] },
  { name: "ALMYRA", pts: [[1.05, 0.12], [0.97, 0.16], [0.95, 0.3], [0.97, 0.46], [0.94, 0.56], [0.99, 0.7], [1.05, 0.72]], label: [0.985, 0.42] },
  { name: "BRIGID", pts: [[-0.05, 0.78], [0.06, 0.8], [0.12, 0.86], [0.1, 0.95], [0.02, 1.05], [-0.05, 1.05]], label: [0.05, 0.9] },
  { name: "MORFIS", pts: [[0.8, 1.05], [0.82, 0.92], [0.9, 0.86], [1.05, 0.84], [1.05, 1.05]], label: [0.92, 0.95] },
  { name: "", pts: [[-0.05, 0.12], [0.08, 0.1], [0.12, 0.2], [0.09, 0.3], [0.02, 0.33], [-0.05, 0.3]], label: null },
];
const ISLES = [[0.29, 0.08, 0.012], [0.25, 0.12, 0.008], [0.92, 0.78, 0.01], [0.66, 0.9, 0.009], [0.7, 0.87, 0.006], [0.2, 0.82, 0.011], [0.42, 0.03, 0.008], [0.08, 0.62, 0.012]];
const RIDGES = [
  { pts: [[0.43, 0.5], [0.47, 0.42], [0.53, 0.4], [0.57, 0.45], [0.58, 0.52]], h: 1, w: 0.03 },          // เทือกเขาออกมาร์ (การ์เร็ก มัค)
  { pts: [[0.85, 0.28], [0.875, 0.38], [0.87, 0.5], [0.875, 0.6], [0.85, 0.69]], h: 1.15, w: 0.022 },     // กำแพงตะวันออก
  { pts: [[0.5, 0.6], [0.52, 0.7], [0.54, 0.8], [0.55, 0.88]], h: 0.75, w: 0.025 },                       // อาเดรสเทียใต้
  { pts: [[0.44, 0.13], [0.5, 0.18], [0.56, 0.15], [0.6, 0.1]], h: 0.95, w: 0.028 },                       // ฟาร์กัสเหนือ
  { pts: [[0.17, 0.705], [0.23, 0.695], [0.29, 0.685]], h: 0.6, w: 0.02 },
  { pts: [[0.19, 0.51], [0.24, 0.48], [0.29, 0.46]], h: 0.5, w: 0.022 },
  { pts: [[0.32, 0.3], [0.36, 0.33]], h: 0.45, w: 0.02 },
];
const RIVERS = [
  [[0.555, 0.5], [0.6, 0.535], [0.655, 0.565], [0.7, 0.575], [0.75, 0.61], [0.79, 0.665], [0.83, 0.725]], // แม่น้ำแอร์มิด
  [[0.47, 0.3], [0.42, 0.27], [0.37, 0.25], [0.31, 0.24]],
  [[0.45, 0.58], [0.4, 0.64], [0.38, 0.72], [0.37, 0.76]],
  [[0.66, 0.36], [0.72, 0.33], [0.78, 0.3], [0.83, 0.24]],
];
const BORDERS = [
  [[0.26, 0.405], [0.33, 0.41], [0.4, 0.425], [0.46, 0.44], [0.5, 0.45]],
  [[0.5, 0.45], [0.55, 0.39], [0.6, 0.33], [0.65, 0.26], [0.69, 0.195]],
  [[0.5, 0.45], [0.55, 0.53], [0.6, 0.6], [0.64, 0.7], [0.67, 0.8]],
];
const FORESTS = [[0.37, 0.52, 0.05], [0.66, 0.6, 0.035], [0.3, 0.33, 0.04], [0.72, 0.45, 0.04], [0.42, 0.7, 0.035], [0.22, 0.56, 0.03], [0.56, 0.26, 0.03]];
const NATIONS = [
  { t: "FAERGHUS", sub: "HOLY KINGDOM OF", uv: [0.43, 0.27], size: 74, rot: -0.12 },
  { t: "LEICESTER", sub: "ALLIANCE", subAfter: true, uv: [0.735, 0.44], size: 70, rot: -0.08 },
  { t: "ADRESTIA", sub: "EMPIRE", subAfter: true, uv: [0.33, 0.6], size: 80, rot: -0.3 },
];

// ทุกลูปหนักเรียก await tick() — พักให้เฟรมถัดไปวาดเมื่อทำงานติดกันเกิน ~6ms (การ์ดผู้เล่นยังโคจรอยู่ระหว่างสร้าง)
let tick = budget();
const idle = () => tick();

function polyPath(g, pts, W, H, noisy = 0, seed = 1) {
  g.beginPath();
  const r = rng(seed);
  const all = [];
  for (let i = 0; i < pts.length; i++) {
    const [u0, v0] = pts[i], [u1, v1] = pts[(i + 1) % pts.length];
    const seg = noisy ? 7 : 1;
    for (let k = 0; k < seg; k++) {
      const t = k / seg;
      let u = u0 + (u1 - u0) * t, v = v0 + (v1 - v0) * t;
      if (noisy && k) {
        // ขอบชายฝั่งหยักแบบลายมือ (ตั้งฉากกับแนวชายฝั่ง)
        const nx = -(v1 - v0), ny = u1 - u0, l = Math.hypot(nx, ny) || 1;
        const j = (fbm2(u * 40, v * 40, 3, seed) - 0.5) * noisy + (r() - 0.5) * noisy * 0.25;
        u += (nx / l) * j; v += (ny / l) * j;
      }
      all.push([u * W, v * H]);
    }
  }
  all.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  return all;
}
function smoothLine(g, pts, W, H) {
  g.beginPath();
  g.moveTo(pts[0][0] * W, pts[0][1] * H);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    g.quadraticCurveTo(pts[i][0] * W, pts[i][1] * H, mx * W, my * H);
  }
  const l = pts[pts.length - 1];
  g.lineTo(l[0] * W, l[1] * H);
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function ridgeDist(u, v, pts) {
  let d = 9;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distSeg(u, v, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return d;
}

/** ความสูง (0..1) บนกริด HW×HH + หน้ากากแผ่นดิน */
async function buildHeight(HW, HH) {
  const c = document.createElement("canvas");
  c.width = HW; c.height = HH;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff";
  polyPath(g, COAST, HW, HH, 0.012, 4); g.fill();
  const mask = g.getImageData(0, 0, HW, HH).data;
  // ความลึกเข้าแผ่นดิน ≈ หน้ากากที่เบลอ
  g.clearRect(0, 0, HW, HH);
  g.filter = `blur(${Math.round(HW / 40)}px)`;
  g.fillStyle = "#fff";
  polyPath(g, COAST, HW, HH, 0.012, 4); g.fill();
  g.filter = "none";
  const inl = g.getImageData(0, 0, HW, HH).data;
  await idle();
  const h = new Float32Array(HW * HH);
  const land = new Uint8Array(HW * HH);
  for (let y = 0; y < HH; y++) {
    await tick();
    for (let x = 0; x < HW; x++) {
      const i = y * HW + x, m = mask[i * 4 + 3] / 255;
      if (m < 0.5) continue;
      land[i] = 1;
      const u = (x + 0.5) / HW, v = (y + 0.5) / HH;
      const inland = inl[i * 4 + 3] / 255;
      let e = Math.pow(inland, 1.4) * 0.14 + (fbm2(u * 14, v * 14, 4, 9) - 0.5) * 0.05 * inland;
      for (const r of RIDGES) {
        const d = ridgeDist(u, v, r.pts);
        if (d > r.w * 3) continue;
        const ridged = 1 - Math.abs(fbm2(u * 46, v * 46, 4, 21) * 2 - 1);
        e += r.h * Math.exp(-(d * d) / (r.w * r.w)) * (0.45 + 0.75 * ridged);
      }
      h[i] = Math.max(0, e * Math.min(1, inland * 3));
    }
  }
  return { h, land, HW, HH };
}

function sampleH(H, u, v) {
  const x = u * H.HW - 0.5, y = v * H.HH - 0.5;
  const x0 = Math.max(0, Math.min(H.HW - 1, Math.floor(x))), y0 = Math.max(0, Math.min(H.HH - 1, Math.floor(y)));
  const x1 = Math.min(H.HW - 1, x0 + 1), y1 = Math.min(H.HH - 1, y0 + 1);
  const fx = clamp01(x - x0), fy = clamp01(y - y0);
  const a = H.h[y0 * H.HW + x0], b = H.h[y0 * H.HW + x1], c = H.h[y1 * H.HW + x0], d = H.h[y1 * H.HW + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** วาดกระดาษแผนที่ (สีทั้งหมด) */
async function paintMap(TW, TH, H) {
  const c = document.createElement("canvas");
  c.width = TW; c.height = TH;
  const g = c.getContext("2d");
  const W = TW, Hh = TH;
  const r = rng(77);
  try { await document.fonts?.load?.("700 64px Cinzel"); } catch { /* ใช้ฟอนต์ serif สำรอง */ }

  // ---- ทะเล: ม่วงอมน้ำตาล ไล่สว่างกลางแผนที่
  const sea = g.createRadialGradient(W * 0.55, Hh * 0.45, Hh * 0.1, W * 0.5, Hh * 0.5, W * 0.62);
  sea.addColorStop(0, "#a07a7c"); sea.addColorStop(0.55, "#7d5868"); sea.addColorStop(1, "#4b3040");
  g.fillStyle = sea; g.fillRect(0, 0, W, Hh);
  // เส้นทิศเดินเรือ (rhumb lines) จากเข็มทิศ
  const rose = [0.17, 0.86];
  g.strokeStyle = "rgba(60,30,30,.22)"; g.lineWidth = 1.6;
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    g.beginPath(); g.moveTo(rose[0] * W, rose[1] * Hh); g.lineTo(rose[0] * W + Math.cos(a) * W * 1.5, rose[1] * Hh + Math.sin(a) * W * 1.5); g.stroke();
  }
  await idle();

  // ---- แผ่นดินรอบนอก (จาง ไม่นูน)
  for (const o of OUTER) {
    g.save();
    polyPath(g, o.pts, W, Hh, 0.02, 31);
    g.fillStyle = "rgba(186,128,72,.82)"; g.fill();
    g.lineWidth = 3; g.strokeStyle = "rgba(60,32,14,.75)"; g.stroke();
    g.restore();
    if (o.name) {
      g.font = "700 46px Cinzel, serif"; g.textAlign = "center"; g.fillStyle = "rgba(48,24,10,.8)";
      g.fillText(o.name, o.label[0] * W, o.label[1] * Hh);
    }
  }
  for (const [u, v, s] of ISLES) {
    g.beginPath(); g.ellipse(u * W, v * Hh, s * W, s * W * 0.6, r() * 3, 0, Math.PI * 2);
    g.fillStyle = "rgba(196,140,80,.9)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(60,32,14,.7)"; g.stroke();
  }

  // ---- เส้นคลื่นรอบชายฝั่ง (ขีดซ้อน 3 ชั้นจางลง)
  g.save();
  for (let k = 3; k >= 1; k--) {
    polyPath(g, COAST, W, Hh, 0.012, 4);
    g.lineWidth = k * 14; g.strokeStyle = `rgba(255,236,200,${0.05 + (3 - k) * 0.02})`; g.stroke();
  }
  g.restore();

  // ---- แผ่นดินหลัก: กระดาษทองไล่แสงกลาง
  g.save();
  polyPath(g, COAST, W, Hh, 0.012, 4);
  g.clip();
  const land = g.createRadialGradient(W * 0.53, Hh * 0.45, Hh * 0.05, W * 0.52, Hh * 0.5, W * 0.48);
  land.addColorStop(0, "#fff0b8"); land.addColorStop(0.35, "#f2d68c"); land.addColorStop(0.75, "#dcb062"); land.addColorStop(1, "#b98742");
  g.fillStyle = land; g.fillRect(0, 0, W, Hh);
  // เงานูนจากความสูง (hillshade) — วาดลง canvas เล็กแล้วขยาย
  {
    const sc = document.createElement("canvas");
    sc.width = H.HW; sc.height = H.HH;
    const sg = sc.getContext("2d");
    const im = sg.createImageData(H.HW, H.HH);
    for (let y = 1; y < H.HH - 1; y++) for (let x = 1; x < H.HW - 1; x++) {
      if (x === 1) await tick();
      const i = y * H.HW + x;
      const dx = H.h[i + 1] - H.h[i - 1], dy = H.h[i + H.HW] - H.h[i - H.HW];
      const sh = clamp01(0.5 + (-dx * 0.8 - dy * 0.6) * 14);
      const v = Math.round(255 * (0.55 + 0.45 * sh));
      im.data[i * 4] = v; im.data[i * 4 + 1] = Math.round(v * 0.93); im.data[i * 4 + 2] = Math.round(v * 0.82); im.data[i * 4 + 3] = 255;
    }
    sg.putImageData(im, 0, 0);
    g.globalCompositeOperation = "multiply";
    g.imageSmoothingQuality = "high";
    g.drawImage(sc, 0, 0, W, Hh);
    g.globalCompositeOperation = "source-over";
  }
  // คราบกระดาษ
  for (let i = 0; i < 70; i++) {
    if (i % 10 === 0) await tick();
    const x = r() * W, y = r() * Hh, rr = 40 + r() * 160;
    const m = g.createRadialGradient(x, y, 0, x, y, rr);
    m.addColorStop(0, `rgba(150,96,40,${0.04 + r() * 0.06})`); m.addColorStop(1, "rgba(150,96,40,0)");
    g.fillStyle = m; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  g.restore();
  await idle();

  // ---- ป่า (วงกลมเล็กๆ แบบลายเส้น)
  for (const [u, v, s] of FORESTS) {
    await tick();
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * s;
      const x = (u + Math.cos(a) * d) * W, y = (v + Math.sin(a) * d * 0.75) * Hh, rr = 5 + r() * 5;
      g.beginPath(); g.arc(x, y, rr, Math.PI, 0); g.lineTo(x, y + rr * 0.9);
      g.fillStyle = "rgba(110,88,40,.55)"; g.fill();
      g.lineWidth = 1.4; g.strokeStyle = "rgba(60,36,14,.7)"; g.stroke();
    }
  }
  // ---- ภูเขา (ยอดแหลมวาดมือ เงาด้านขวา) ตามสันเขา
  for (const rd of RIDGES) {
    const n = Math.round(rd.h * 60);
    for (let i = 0; i < n; i++) {
      if (i % 20 === 0) await tick();
      const k = r() * (rd.pts.length - 1), j = Math.floor(k), t = k - j;
      const a = rd.pts[j], b = rd.pts[Math.min(j + 1, rd.pts.length - 1)];
      const u = a[0] + (b[0] - a[0]) * t + (r() - 0.5) * rd.w * 1.6, v = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * rd.w * 1.6;
      const x = u * W, y = v * Hh, s = (10 + r() * 16) * (0.7 + rd.h * 0.5);
      g.beginPath(); g.moveTo(x - s, y + s * 0.2); g.lineTo(x - s * 0.08, y - s * 1.1); g.lineTo(x + s, y + s * 0.2); g.closePath();
      g.fillStyle = "rgba(250,232,190,.95)"; g.fill();
      g.beginPath(); g.moveTo(x - s * 0.08, y - s * 1.1); g.lineTo(x + s, y + s * 0.2); g.lineTo(x + s * 0.15, y + s * 0.2); g.closePath();
      g.fillStyle = "rgba(120,78,34,.75)"; g.fill();
      g.beginPath(); g.moveTo(x - s, y + s * 0.2); g.lineTo(x - s * 0.08, y - s * 1.1); g.lineTo(x + s, y + s * 0.2);
      g.lineWidth = 1.8; g.strokeStyle = "rgba(56,32,12,.9)"; g.stroke();
    }
  }
  await idle();

  // ---- แม่น้ำ
  for (const rv of RIVERS) {
    smoothLine(g, rv, W, Hh);
    g.lineWidth = 7; g.strokeStyle = "rgba(255,240,210,.5)"; g.lineCap = "round"; g.stroke();
    g.lineWidth = 3.2; g.strokeStyle = "rgba(78,58,78,.85)"; g.stroke();
  }
  // ---- เส้นแบ่งประเทศ (ประ)
  g.setLineDash([16, 10]);
  for (const b of BORDERS) {
    smoothLine(g, b, W, Hh);
    g.lineWidth = 3; g.strokeStyle = "rgba(90,40,20,.6)"; g.stroke();
  }
  g.setLineDash([]);
  // ---- ขอบชายฝั่งหมึก
  polyPath(g, COAST, W, Hh, 0.012, 4);
  g.lineWidth = 4.5; g.strokeStyle = "#4a2a12"; g.lineJoin = "round"; g.stroke();
  g.lineWidth = 1.5; g.strokeStyle = "rgba(255,236,190,.5)"; g.stroke();

  // ---- ชื่อประเทศ (ละติน — ชื่อเฉพาะ)
  for (const n of NATIONS) {
    g.save();
    g.translate(n.uv[0] * W, n.uv[1] * Hh); g.rotate(n.rot);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `900 ${n.size}px Cinzel, serif`;
    g.lineWidth = 6; g.strokeStyle = "rgba(255,238,200,.55)"; g.strokeText(n.t, 0, 0);
    g.fillStyle = "rgba(40,18,6,.9)"; g.fillText(n.t, 0, 0);
    g.font = `700 ${Math.round(n.size * 0.42)}px Cinzel, serif`;
    g.fillStyle = "rgba(48,22,8,.85)";
    g.fillText(n.sub, 0, (n.subAfter ? 1 : -1) * n.size * 0.78);
    g.restore();
  }
  g.font = "700 30px Cinzel, serif"; g.textAlign = "center"; g.fillStyle = "rgba(40,18,6,.85)";
  g.fillText("GARREG MACH", 0.5 * W, 0.475 * Hh);
  await idle();

  // ---- เข็มทิศ (ออกแบบเอง: ดาว 16 แฉกในวงแหวนลายจุด)
  {
    const cx = rose[0] * W, cy = rose[1] * Hh, R = Hh * 0.085;
    g.save(); g.translate(cx, cy);
    g.fillStyle = "rgba(214,170,96,.95)"; g.beginPath(); g.arc(0, 0, R * 1.18, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3; g.strokeStyle = "#4a2a12"; g.stroke();
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 64; k++) { const a = (k / 64) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * R * 1.09, Math.sin(a) * R * 1.09, 2, 0, Math.PI * 2); g.fillStyle = "#5a3416"; g.fill(); }
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 - Math.PI / 2, L = k % 4 === 0 ? R * 0.95 : k % 2 ? R * 0.45 : R * 0.68, w = k % 4 === 0 ? R * 0.13 : R * 0.08;
      for (const side of [1, -1]) {
        g.beginPath(); g.moveTo(0, 0);
        g.lineTo(Math.cos(a + side * 0.5) * w, Math.sin(a + side * 0.5) * w);
        g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.closePath();
        g.fillStyle = side > 0 ? "#3b200c" : "#f6e2b0"; g.fill();
        g.lineWidth = 1.2; g.strokeStyle = "#3b200c"; g.stroke();
      }
    }
    g.beginPath(); g.arc(0, 0, R * 0.08, 0, Math.PI * 2); g.fillStyle = "#c79a4c"; g.fill(); g.stroke();
    // ริบบิ้นชื่อทวีป
    g.translate(0, R * 1.55);
    g.beginPath(); g.moveTo(-R * 1.25, -R * 0.2); g.quadraticCurveTo(0, R * 0.12, R * 1.25, -R * 0.2); g.lineTo(R * 1.25, R * 0.22); g.quadraticCurveTo(0, R * 0.54, -R * 1.25, R * 0.22); g.closePath();
    g.fillStyle = "#d8b06a"; g.fill(); g.lineWidth = 2.5; g.stroke();
    g.font = `900 ${Math.round(R * 0.32)}px Cinzel, serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#3b200c";
    g.fillText("FÓDLAN", 0, R * 0.12);
    g.restore();
  }

  // ---- รอยพับกระดาษ + ขอบมืด + กรอบลวดลาย
  g.strokeStyle = "rgba(255,240,210,.12)"; g.lineWidth = 3;
  for (const k of [1 / 3, 2 / 3]) { g.beginPath(); g.moveTo(k * W, 0); g.lineTo(k * W, Hh); g.stroke(); }
  g.beginPath(); g.moveTo(0, Hh / 2); g.lineTo(W, Hh / 2); g.stroke();
  const vig = g.createRadialGradient(W / 2, Hh / 2, Hh * 0.4, W / 2, Hh / 2, W * 0.66);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(30,10,4,.55)");
  g.fillStyle = vig; g.fillRect(0, 0, W, Hh);
  const m = Math.round(Hh * 0.022);
  g.lineWidth = m; g.strokeStyle = "#5c3416"; g.strokeRect(m / 2, m / 2, W - m, Hh - m);
  g.lineWidth = m * 0.5; g.strokeStyle = "#c99a52"; g.strokeRect(m * 1.6, m * 1.6, W - m * 3.2, Hh - m * 3.2);
  g.fillStyle = "#5c3416";
  const step = m * 1.4;
  for (let x = m * 2; x < W - m * 2; x += step) for (const y of [m * 1.6, Hh - m * 1.6]) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-m * 0.22, -m * 0.22, m * 0.44, m * 0.44); g.restore(); }
  for (let y = m * 2; y < Hh - m * 2; y += step) for (const x of [m * 1.6, W - m * 1.6]) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-m * 0.22, -m * 0.22, m * 0.44, m * 0.44); g.restore(); }
  return c;
}

function woodTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#3a2214"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) {
    const n = fbm2(0.5, y / 18, 3, 5);
    g.fillStyle = `rgba(${90 + n * 50},${52 + n * 28},${30 + n * 14},${0.35 + n * 0.3})`;
    g.fillRect(0, y, 512, 1);
  }
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(10,4,2,.35)"; g.fillRect(0, i * 86, 512, 3); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

export async function buildFodlanMap(THREE, { lowQ = false } = {}) {
  tick = budget();
  const H = await buildHeight(lowQ ? 256 : 384, lowQ ? 192 : 288);
  performance.mark?.("fd:height");
  const canvas = await paintMap(lowQ ? 1536 : 2048, lowQ ? 1152 : 1536, H);
  performance.mark?.("fd:paint");
  await idle();
  const group = new THREE.Group();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const SX = lowQ ? 192 : 288, SZ = lowQ ? 144 : 216;
  const geo = new THREE.PlaneGeometry(MAP_W, MAP_D, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    if (i % 512 === 0) await tick();
    const u = uv.getX(i), v = 1 - uv.getY(i);
    // ขอบกระดาษงอนขึ้นเล็กน้อย
    const e = Math.min(u, 1 - u, v, 1 - v);
    const curl = e < 0.04 ? Math.pow((0.04 - e) / 0.04, 2) * 0.08 : 0;
    pos.setY(i, sampleH(H, u, v) * HEIGHT + curl);
  }
  geo.computeVertexNormals();
  const reveal = { r: { value: -1 }, c: { value: new THREE.Vector2(0, 0) }, t: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uR = reveal.r; sh.uniforms.uC = reveal.c; sh.uniforms.uT = reveal.t;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWp;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWp; uniform float uR; uniform vec2 uC; uniform float uT;")
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>
        if (uR >= 0.) {
          float d = length(vWp.xz - uC);
          float k = smoothstep(uR + 0.2, uR - 1.6, d);
          gl_FragColor.rgb *= mix(0.06, 1., k);
          float edge = exp(-pow((d - uR) * 1.6, 2.)) * (0.85 + 0.15 * sin(uT * 7. + d * 3.));
          gl_FragColor.rgb += vec3(1., .72, .32) * edge * 0.9;
        }`);
  };
  const paper = new THREE.Mesh(geo, mat);
  group.add(paper);

  // โต๊ะไม้ใต้แผนที่
  const table = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), new THREE.MeshStandardMaterial({ map: woodTexture(THREE), roughness: 0.75, metalness: 0.05 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -0.03;
  group.add(table);

  // แสง: แอมเบียนต์อุ่นต่ำ + สปอตไลต์จากบน (แสงรวมกลางแผนที่แบบภาพอ้างอิง) + แสงรองเย็นจากด้านข้าง
  const amb = new THREE.HemisphereLight("#ffe7b8", "#2a1408", 0.55);
  const spot = new THREE.SpotLight("#ffd28a", 190, 60, 0.62, 0.85, 1.4);
  spot.position.set(-1.5, 16, 2.5);
  spot.target.position.set(0.6, 0, -0.4);
  const rim = new THREE.DirectionalLight("#b48cff", 0.35);
  rim.position.set(10, 4, -8);
  group.add(amb, spot, spot.target, rim);

  // ฝุ่นแสงลอยในลำแสง
  const motes = particles(THREE, { kind: "mote", count: lowQ ? 140 : 320, box: [14, 7, 10], vel: [0.12, 0.08, 0.05], size: 0.05, color: "#ffd99a", opacity: 0.85, seed: 41, additive: true });
  motes.object.position.y = 0.2;
  group.add(motes.object);

  const at = (u, v, lift = 0, out = new THREE.Vector3()) => out.set((u - 0.5) * MAP_W, sampleH(H, u, v) * HEIGHT + lift, (v - 0.5) * MAP_D);

  // ---------- หมุดด่าน ----------
  const markers = FODLAN_STAGES.map((s, i) => {
    const g = new THREE.Group();
    at(s.uv[0], s.uv[1], 0, g.position);
    const col = new THREE.Color(s.color);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
    const pulse = ring.clone(); pulse.material = ring.material.clone();
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: "#f4d48a", emissive: col, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.25, transparent: true, opacity: 0 }));
    gem.scale.y = 1.7;
    const label = textSprite(THREE, s.numeral, { font: "900 92px Cinzel, serif" });
    label.material.opacity = 0;
    label.scale.multiplyScalar(0.34);
    const beam = lightShaft(THREE, { radiusTop: 0.05, radiusBottom: 0.24, height: 3.2, color: s.glow, opacity: 0 });
    beam.mesh.position.y = 3.3;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(0.9);
    g.add(ring, pulse, gem, label, beam.mesh, halo);
    group.add(g);
    let show = 0, active = 0;
    return {
      group: g, stage: s, index: i,
      set(sh, ac) { show = sh; active = ac; },
      update(t) {
        const k = smooth(clamp01(show));
        const bob = 0.42 + 0.04 * Math.sin(t * 2 + i);
        gem.position.y = bob * (0.4 + 0.6 * k);
        gem.rotation.y = t * 1.2 + i;
        gem.material.opacity = k;
        gem.scale.set(1 + active * 0.4, (1.7) * (1 + active * 0.4), 1 + active * 0.4);
        label.position.y = gem.position.y + 0.32 + active * 0.08;
        label.material.opacity = k;
        ring.material.opacity = k * (0.55 + 0.35 * active);
        ring.scale.setScalar(1 + active * 0.6);
        const pz = (t * 0.7 + i * 0.2) % 1;
        pulse.scale.setScalar((1 + active * 0.6) * (1 + pz * 2.5));
        pulse.material.opacity = k * (1 - pz) * (0.3 + 0.5 * active);
        beam.uniforms.op.value = k * (0.1 + 0.32 * active);
        beam.uniforms.t.value = t;
        halo.position.y = gem.position.y;
        halo.material.opacity = k * (0.25 + 0.5 * active);
        halo.scale.setScalar(0.9 + active * 0.8);
      },
    };
  });

  // ---------- เส้นทางประระหว่างด่าน ----------
  const route = (a, b) => {
    const A = FODLAN_STAGES[a - 1].uv, B = FODLAN_STAGES[b - 1].uv;
    const pts = [];
    const N = 80;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      // โค้งออกข้างเล็กน้อยแบบเส้นทางเดินทัพ
      const nx = -(B[1] - A[1]), ny = B[0] - A[0];
      const bend = Math.sin(t * Math.PI) * 0.12;
      const u = A[0] + (B[0] - A[0]) * t + nx * bend, v = A[1] + (B[1] - A[1]) * t + ny * bend;
      pts.push(at(u, v, 0.06 + Math.sin(t * Math.PI) * 0.5));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 200, 0.03, 6, false);
    const uniforms = { p: { value: 0 }, col: { value: new THREE.Color("#ffdf9a") }, t: { value: 0 } };
    const m = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
      fragmentShader: [
        "uniform float p,t; uniform vec3 col; varying vec2 vU;",
        "void main(){ if (vU.x > p) discard; float dash = step(.45, fract(vU.x*26. - t*1.5)); float head = smoothstep(p-.06, p, vU.x);",
        " gl_FragColor=vec4(col*(1.+head*2.), (.35+.65*dash)*(.85+head)); ",
        "#include <colorspace_fragment>",
        "}",
      ].join("\n"),
    });
    const mesh = new THREE.Mesh(tube, m);
    const token = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#fff1c4", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    token.scale.setScalar(0.7);
    group.add(mesh, token);
    const tp = new THREE.Vector3();
    return {
      curve,
      setProgress(k, t) { uniforms.p.value = k; uniforms.t.value = t || 0; curve.getPointAt(clamp01(k), tp); token.position.copy(tp); token.visible = k > 0.001 && k < 0.999; },
      tokenPos(k, out = new THREE.Vector3()) { group.updateMatrixWorld(); return group.localToWorld(curve.getPointAt(clamp01(k), out)); },
      dispose() { group.remove(mesh, token); tube.dispose(); m.dispose(); token.material.dispose(); },
    };
  };

  return {
    group, markers, route, at,
    paper, table, spot, tex,
    fog: new THREE.FogExp2("#1a0d08", 0.018),
    setReveal(rr, cx = 0, cz = 0) { reveal.r.value = rr; reveal.c.value.set(cx, cz); },
    update(t, Hpx) {
      reveal.t.value = t;
      motes.update(t, Hpx);
      markers.forEach((mk) => mk.update(t));
    },
  };
}

// ============================================================
//  เอฟเฟกต์บนกระดานของกิระ (characters/kira.js)
//  ตีปกติร่างราชาแมลงอวกาศ (fx.kind = attackStyle "kiraSlash") — fx { x, y (ช่องผู้ตี), size, to: { x, y }, lane: [{ x, y }] }
//    คลื่นฟันดำขอบแดง (ผู้ใช้สั่ง 2026-10-15): ง้างที่ตัว → คลื่นจันทร์เสี้ยวสีดำขอบแดงซัดไปตามแนว 4×1
//    ทิ้งรอยฟันแดงบนพื้นทุกช่องที่ผ่าน + ควันดำ · คลื่นถึงช่องสุดท้าย = จังหวะปะทะ (เลข/เสียง/สั่นทุกคนในแนว)
//  ออร่าร่างราชา (u.aura "kira" — วาดคู่กับ drawUnit): ควันดำหนาม้วนลอยขึ้นรอบตัว แสงแดงคุจากพื้น + ประกายไฟแดง
//    วาด 2 ชั้น — kiraAuraBack ก่อนตัวละคร (พื้น + ควันด้านหลัง) · kiraAuraFront หลังตัวละคร (ควันที่อยู่หน้าตัว)
//  lowQ = ตัดควัน/ประกายครึ่งหนึ่ง ไม่มีเรืองซ้อน · ลดการเคลื่อนไหว = ควันนิ่ง คลื่นยังวิ่ง (บอกทิศตี)
// ============================================================
import { P, gEllipse, glow, quad } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const KIRA_MS = { kiraSlash: 1150 };
export const KIRA_HIT_P = { kiraSlash: 0.5 };
export const KIRA_FX_DUR = { ...KIRA_MS };
export const isKiraFx = (kind) => typeof kind === "string" && (kind in KIRA_FX_DUR);

const RED = "220,24,36", RED_HI = "255,96,80", BLACK = "8,2,4";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- คลื่นฟันดำขอบแดง ----------
const WIND = 0.12; // สัดส่วนเวลาง้าง
function laneOf(e) { return Array.isArray(e.lane) && e.lane.length ? e.lane : [{ x: e.to.x, y: e.to.y }]; }
// ตัวคลื่น: จันทร์เสี้ยววาดในระนาบจอ (หันตั้งฉากกับทิศที่คลื่นวิ่งบนจอเสมอ — มองมุมกล้องไหนก็เห็นรูปคลื่นฟัน)
//  ลอยเหนือพื้น WAVE_Z · ใส้ดำทึบ · ขอบนอกแดงเรือง + แกนสว่าง · ขอบในแดงจาง
const WAVE_Z = 0.45;
function pathOf(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); }
function waveBody(g, cx, cy, f, s, k, lowQ) {
  const C = P(cx, cy, WAVE_Z), A = P(cx + f[0], cy + f[1], WAVE_Z), sc = C[2];
  let dx = A[0] - C[0], dy = A[1] - C[1];
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const px = -dy, py = dx, W = sc * 0.62, B = sc * 0.42;
  const outer = [], inner = [];
  for (let i = 0; i <= 18; i++) {
    const a = -1 + (i / 18) * 2, bulge = 1 - a * a;
    outer.push([C[0] + px * a * W + dx * B * bulge, C[1] + py * a * W + dy * B * bulge]);
    inner.push([C[0] + px * a * W * 0.92 + dx * (B * 0.4 * bulge - sc * 0.04), C[1] + py * a * W * 0.92 + dy * (B * 0.4 * bulge - sc * 0.04)]);
  }
  g.globalCompositeOperation = "source-over";
  if (!lowQ) { pathOf(g, outer); g.strokeStyle = `rgba(${RED},${0.3 * k})`; g.lineWidth = Math.max(6, sc * 0.26); g.stroke(); }
  pathOf(g, [...outer, ...inner.slice().reverse()]); g.closePath();
  g.fillStyle = `rgba(${BLACK},${0.95 * k})`; g.fill();
  pathOf(g, outer);
  g.strokeStyle = `rgba(${RED},${k})`; g.lineWidth = Math.max(2, sc * 0.07); g.stroke();
  if (!lowQ) { g.strokeStyle = `rgba(${RED_HI},${0.9 * k})`; g.lineWidth = Math.max(1, sc * 0.022); g.stroke(); }
  pathOf(g, inner); g.strokeStyle = `rgba(${RED},${0.5 * k})`; g.lineWidth = Math.max(1, sc * 0.03); g.stroke();
}
function kiraSlash(g, e, now, lowQ) {
  const t = (now - e.t0) / KIRA_MS.kiraSlash;
  if (t <= 0 || t >= 1) return;
  const tiles = laneOf(e), n = tiles.length, HIT = KIRA_HIT_P.kiraSlash;
  const ox = e.x + (e.size || 1) / 2, oy = e.y + (e.size || 1) / 2;
  const fx = Math.sign(tiles[0].x + 0.5 - ox), fy = fx ? 0 : Math.sign(tiles[0].y + 0.5 - oy) || 1;
  const f = [fx, fy], s = [-fy, fx];
  const reach = Math.abs((tiles[n - 1].x + 0.5 - ox) * fx + (tiles[n - 1].y + 0.5 - oy) * fy); // ระยะถึงกลางช่องสุดท้าย
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // ง้าง: ควันดำรวมตัวหน้าตัว + เส้นแดงเฉือน
  if (t < WIND + 0.08) {
    const k = clamp01(t / WIND), [sx, sy, sc] = P(ox + fx * 0.3, oy + fy * 0.3, 0.5);
    g.globalCompositeOperation = "source-over";
    glow(g, sx, sy, sc * (0.25 + 0.3 * k), BLACK, 0.75 * k);
    if (!lowQ) glow(g, sx, sy, sc * 0.35 * k, RED, 0.45 * k);
  }
  // รอยฟันบนพื้น + ควันดำ ทุกช่องที่คลื่นผ่าน
  tiles.forEach((tl, i) => {
    const hitAt = WIND + (HIT - WIND) * ((i + 1) / n), age = t - hitAt;
    if (age < 0) return;
    const q = clamp01(age / (1 - hitAt)), k = 1 - q, cx = tl.x + 0.5, cy = tl.y + 0.5;
    g.globalCompositeOperation = "source-over";
    quad(g, tl.x, tl.y, 0.05); g.fillStyle = `rgba(${BLACK},${0.5 * k})`; g.fill();
    // รอยแดงขวางแนว
    const a = P(cx - s[0] * 0.42, cy - s[1] * 0.42, 0.01), b = P(cx + s[0] * 0.42, cy + s[1] * 0.42, 0.01);
    g.strokeStyle = `rgba(${RED},${0.9 * k})`; g.lineWidth = Math.max(1.5, a[2] * 0.05 * (1 - q * 0.6));
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    if (age < 0.12) { const [hx, hy, hs] = P(cx, cy, 0.4); glow(g, hx, hy, hs * 0.6, RED, 0.7 * (1 - age / 0.12)); }
    if (!lowQ) {
      g.globalCompositeOperation = "source-over";
      for (let d = 0; d < 3; d++) {
        const r = hash01(i * 9 + d), [px, py, ps] = P(cx + s[0] * (r - 0.5) * 0.8, cy + s[1] * (r - 0.5) * 0.8, 0.1 + q * (0.5 + r * 0.4));
        glow(g, px, py, ps * (0.35 + q * 0.35), BLACK, 0.3 * k);
      }
    }
  });
  // ตัวคลื่น: วิ่งจากหน้าตัวถึงกลางช่องสุดท้ายตอนปะทะ แล้วเลยไปอีกครึ่งช่องพร้อมจางหาย
  if (t >= WIND) {
    const u = t < HIT ? (t - WIND) / (HIT - WIND) : 1 + (t - HIT) / (1 - HIT) * 0.5;
    const d = 0.35 + (reach - 0.35) * (t < HIT ? easeOut3(u) : u);
    const k = t < HIT ? Math.min(1, (t - WIND) / 0.05) : clamp01(1 - (t - HIT) / 0.22);
    if (k > 0) {
      const cx = ox + fx * d, cy = oy + fy * d;
      // หางควันดำด้านหลังคลื่น
      if (!lowQ) for (let j = 1; j <= 4; j++) {
        const [px, py, ps] = P(cx - fx * j * 0.22, cy - fy * j * 0.22, 0.35);
        glow(g, px, py, ps * (0.55 - j * 0.07), BLACK, 0.3 * k * (1 - j / 5));
      }
      waveBody(g, cx, cy, f, s, k, lowQ);
    }
  }
  g.restore();
}

// ---------- ออร่าควันดำแดงรอบตัว ----------
//  ก้อนควันแต่ละก้อนเกิดที่พื้นรอบตัว → ม้วนวนขึ้นพร้อมขยาย → จางที่ความสูง ~1.5 ช่อง (วนตามเวลา ไม่สุ่มต่อเฟรม)
//  ช่วงล่างสีแดงคุ (ไฟจากใต้ดิน) → ขึ้นไปเป็นดำ
const PUFFS = 22, PUFF_MS = 2800, EMBERS = 10;
function puffsOf(wx, wy, now, lowQ, front) {
  const t = REDUCED ? 0 : now, [, by] = P(wx, wy), out = [];
  const n = lowQ ? PUFFS / 2 : PUFFS;
  for (let i = 0; i < n; i++) {
    const age = ((t / PUFF_MS) + i / n + hash01(i) * 0.3) % 1;
    const th = hash01(i + 40) * Math.PI * 2 + age * 1.6;
    const r = 0.3 + 0.2 * age + 0.07 * Math.sin(i + t / 900);
    const x = wx + Math.cos(th) * r, y = wy + Math.sin(th) * r, z = 0.05 + age * 1.7;
    const p = P(x, y, z), isFront = P(x, y)[1] > by;
    if (isFront === front) out.push({ p, age, i });
  }
  return out;
}
function drawPuffs(g, list, alpha) {
  for (const { p, age } of list) {
    // เกิดเร็ว (ทึบทันที) แล้วค่อยๆ จางตอนลอยสูง · ก้อนใหญ่ขึ้นตามความสูง
    const [sx, sy, sc] = p, fade = Math.min(1, age * 6) * Math.pow(1 - age, 0.8), rad = sc * (0.22 + 0.42 * age);
    // ดำทึบ → ขอบนุ่ม · ช่วงล่างผสมแดงเลือด
    const red = clamp01(1 - age * 2.4);
    const gr = g.createRadialGradient(sx, sy, 0, sx, sy, rad);
    gr.addColorStop(0, `rgba(${Math.round(14 + 140 * red)},${Math.round(3 + 8 * red)},${Math.round(5 + 12 * red)},${0.95 * fade * alpha})`);
    gr.addColorStop(0.55, `rgba(12,3,6,${0.75 * fade * alpha})`);
    gr.addColorStop(1, "rgba(12,3,6,0)");
    g.fillStyle = gr; g.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
  }
}
// สายควันม้วนเป็นเกลียวขึ้นรอบตัว (3 สาย) — ให้ควันมีรูปทรง ไม่ใช่หมอกฟุ้ง · front = วาดเฉพาะช่วงที่อยู่หน้าตัว
const TENDRILS = 3, TEND_STEPS = 18;
function drawTendrils(g, wx, wy, now, alpha, front) {
  const t = REDUCED ? 0 : now, [, by] = P(wx, wy);
  for (let k = 0; k < TENDRILS; k++) {
    const base = (k / TENDRILS) * Math.PI * 2 + t / 1600;
    // จุดตามสาย [sx, sy, สเกล, u, อยู่หน้าตัว?]
    const pts = [];
    for (let i = 0; i <= TEND_STEPS; i++) {
      const u = i / TEND_STEPS, th = base + u * 2.4 + 0.3 * Math.sin(t / 700 + k * 2 + u * 5);
      const r = 0.42 + 0.18 * Math.sin(u * Math.PI) + 0.06 * Math.sin(t / 500 + k + u * 7);
      const x = wx + Math.cos(th) * r, y = wy + Math.sin(th) * r, p = P(x, y, 0.05 + u * 1.6);
      pts.push([p[0], p[1], p[2], u, P(x, y)[1] > by]);
    }
    // แบ่งเป็นช่วงต่อเนื่องที่อยู่ฝั่งเดียวกัน แล้ววาดเป็นริบบอนเรียว (ไม่ใช่เส้นต่อท่อน — กันรอยจุดไข่ปลา)
    let run = [];
    const flush = () => { if (run.length > 1) ribbon(g, run, alpha * (front ? 0.55 : 0.8)); run = []; };
    for (let i = 0; i < pts.length; i++) {
      if (pts[i][4] !== front) { if (run.length) run.push(pts[i]); flush(); continue; }
      if (!run.length && i > 0) run.push(pts[i - 1]);
      run.push(pts[i]);
    }
    flush();
  }
}
// ริบบอนเรียวตามจุด (กว้างตามสเกลจุด · หัวหนา ปลายเรียว) ไล่สีแดงเลือด → ดำ → จาง ตาม u
function ribbon(g, pts, alpha) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const u = pts[i][3], w = pts[i][2] * (0.11 - 0.07 * u) * Math.sin(Math.PI * Math.min(1, 0.15 + u));
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  g.beginPath(); L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath();
  const s0 = pts[0], e0 = pts[pts.length - 1], gr = g.createLinearGradient(s0[0], s0[1], e0[0], e0[1]);
  const col = (u) => { const red = clamp01(1 - u * 2.5), a = Math.sin(Math.PI * clamp01(u * 1.1)) * alpha + (u < 0.1 ? 0.3 * alpha : 0);
    return `rgba(${Math.round(14 + 150 * red)},${Math.round(3 + 8 * red)},${Math.round(5 + 12 * red)},${clamp01(a)})`; };
  gr.addColorStop(0, col(s0[3])); gr.addColorStop(0.5, col((s0[3] + e0[3]) / 2)); gr.addColorStop(1, col(e0[3]));
  g.fillStyle = gr; g.fill();
}
export function kiraAuraBack(g, wx, wy, now, lowQ, alpha = 1) {
  const t = REDUCED ? 0 : now, pulse = 0.8 + 0.2 * Math.sin(t / 430);
  g.save();
  // พื้น: วงไหม้ดำ + แสงแดงคุ (ช่องประชิด 4 ช่องอยู่ในวง = ระยะของออร่า)
  g.globalCompositeOperation = "source-over";
  gEllipse(g, wx, wy, 1.2, 0, 40); g.fillStyle = `rgba(${BLACK},${0.38 * alpha})`; g.fill();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    quad(g, Math.floor(wx) + dx, Math.floor(wy) + dy, 0.06); g.fillStyle = `rgba(110,8,16,${0.2 * pulse * alpha})`; g.fill();
  }
  gEllipse(g, wx, wy, 1.2, 0, 40); g.strokeStyle = `rgba(${RED},${0.55 * pulse * alpha})`; g.lineWidth = 1.6; g.stroke();
  // แสงแดงคุจากพื้นใต้ควัน (วาดทับปกติ — แบบ lighter ซีดหายบนพื้นสีอ่อน)
  const [gx, gy, gs] = P(wx, wy, 0.05);
  glow(g, gx, gy, gs * 0.9, "170,12,22", 0.45 * pulse * alpha);
  g.globalCompositeOperation = "source-over";
  drawPuffs(g, puffsOf(wx, wy, now, lowQ, false), alpha);
  if (!lowQ) drawTendrils(g, wx, wy, now, alpha, false);
  g.restore();
}
export function kiraAuraFront(g, wx, wy, now, lowQ, alpha = 1) {
  const t = REDUCED ? 0 : now;
  g.save();
  g.globalCompositeOperation = "source-over";
  // ควันหน้าตัวโปร่งกว่าเล็กน้อย ไม่บังรูปตัวละครทั้งหมด
  drawPuffs(g, puffsOf(wx, wy, now, lowQ, true), alpha * 0.6);
  if (!lowQ) drawTendrils(g, wx, wy, now, alpha, true);
  // ประกายไฟแดงลอยขึ้น (แดงทึบ — แบบ lighter กลายเป็นชมพูบนพื้นสีอ่อน)
  if (!lowQ) {
    for (let i = 0; i < EMBERS; i++) {
      const age = ((t / 1700) + i / EMBERS + hash01(i + 7) * 0.5) % 1;
      const th = hash01(i + 90) * Math.PI * 2 + age * 0.8, r = 0.25 + 0.4 * hash01(i + 3);
      const [ex, ey, es] = P(wx + Math.cos(th) * r, wy + Math.sin(th) * r, 0.1 + age * 1.7);
      const a = Math.sin(Math.PI * age) * alpha;
      glow(g, ex, ey, es * 0.08, "200,20,20", 0.55 * a);
      g.fillStyle = `rgba(255,70,40,${a})`; g.beginPath(); g.arc(ex, ey, Math.max(1.2, es * 0.025), 0, 7); g.fill();
    }
  }
  g.restore();
}

export function kiraFx(g, e, now, lowQ) {
  if (e.kind === "kiraSlash") kiraSlash(g, e, now, lowQ);
}

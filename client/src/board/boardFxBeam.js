// ============================================================
//  เอฟเฟกต์ลำแสง Beam Magnum + แผ่นดินไหว (แยกจาก boardDraw.js) — prepareBeam/beamFx · prepareQuake/quakeFx
// ============================================================
import { P, gEllipse, glow, quad } from "./boardGeo";
import { REDUCED } from "./boardCamera";

// =================================================================== Beam Magnum (นักบินปริศนา)
//  fx { kind: "beam", x, y (ช่องคนยิง), dir: up|down|left|right, len, beam: prepareBeam(...), tone? ("blue" = ปืนโซระ — ดู BEAM_TONES) }
//  ลำแสงเกลียว ขาวผสมแดง (ผู้ใช้สั่ง — ไม่ใช้สีผู้เล่น): แกนขาวร้อน + เกลียวแดง 2 เส้นพันรอบแกน หมุนไหลไปข้างหน้า + เรืองแดงรอบนอก
//  ชาร์จที่ปากกระบอก → ลำแสงพุ่งไปสุดแนว (ease-out) → ค้าง → จาง (เกลียวคลายออก) · ช่องที่ลำแสงผ่าน = แฟลชบนพื้น
//  ทุกจุดคิดในพิกัดโลก (แกนลอยสูง BEAM_Z · เกลียวหมุนในระนาบตั้งฉากกับแนวยิง) แล้วฉายด้วยกล้อง — ถูกทุกมุมหมุน/ซูม/มุมบน
//   เกลียวช่วงที่อยู่หลังแกน (ไกลกล้องกว่า) วาดก่อนแกน · ช่วงหน้าแกนวาดทับ — เห็นเป็นเกลียวพันรอบจริง
//  lowQ = เกลียวเส้นเดียว ไม่มีชั้นเรือง · ลดการเคลื่อนไหว = เกลียวนิ่ง ลำแสงขึ้นเต็มทันที
export const BEAM_T = { charge: 160, extend: 150, hold: 400, fade: 300 };
const BEAM_Z = 0.62, MUZZLE = 0.3, IMPACT_MS = 280;
export const BEAM_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const HELIX = { r: 0.17, twist: 3.3, step: 0.06, spin: 0.02 }; // รัศมี (ช่อง) · rad ต่อช่อง · ระยะจุดตัวอย่าง · rad ต่อ ms
const RED = "235,28,48", RED_HI = "255,120,120", WHITE_RED = "255,215,215";
// โทนลำแสง (fx.tone): ไม่ใส่ = ขาวผสมแดง (นักบินปริศนา) · "blue" = ปืนโซระ (แกนขาว · เกลียวฟ้า · เรืองน้ำเงินเข้ม)
//  c = เกลียว/พื้น · glow = เรืองรอบนอก · hi = ไฮไลต์เกลียว/ประกาย · hot = รัศมีแกนร้อน
const BEAM_TONES = {
  red: { c: RED, glow: RED, hi: RED_HI, hot: WHITE_RED },
  blue: { c: "70,175,255", glow: "28,72,235", hi: "175,232,255", hot: "220,244,255" },
};
// ช่องที่ลำแสงผ่าน (เริ่มช่องติดคนยิง · ตัดที่ขอบกระดาน) + เวลาที่ปลายลำแสงถึงกลางแต่ละช่อง (ms นับจากเริ่ม fx)
//  f.to = ช่องเป้า (ตีปกติของนักบินปริศนา) → ยิงเฉียงตรงไปหาเป้าได้ ยาว len ช่อง แทนการเลือก 4 ทิศ
export function prepareBeam(f, cols, rows) {
  if (f && f.to) return prepareAimedBeam(f, cols, rows);
  const v = BEAM_DIRS[f && f.dir];
  if (!v || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return null;
  const len = Math.max(1, Math.min(64, Math.floor(+f.len) || 6));
  const tiles = [];
  for (let i = 1; i <= len; i++) {
    const x = f.x + v[0] * i, y = f.y + v[1] * i;
    if (x < 0 || y < 0 || x >= cols || y >= rows) break;
    tiles.push({ x, y });
  }
  const reach = tiles.length + 0.5 - MUZZLE; // ปากกระบอก → ขอบไกลของช่องสุดท้าย (หน่วยช่อง)
  const { charge: C, extend: E } = BEAM_T;
  const hits = tiles.map((_, i) => {
    const q = Math.min(1, (i + 1 - MUZZLE) / reach); // ระยะถึงกลางช่อง (สัดส่วน) → เวลาจาก ease-out ย้อนกลับ
    return C + (REDUCED ? 0 : E * (1 - Math.cbrt(1 - q)));
  });
  return { v, tiles, hits, reach };
}
// ลำแสงเล็งเป้า: แนวจากกลางช่องคนยิง → กลางช่องเป้า ยาว len ช่อง (ถึงขอบไกล len + 0.5) · ตัดที่ขอบกระดาน
//  ช่องที่ผ่าน = ไล่จุดตามแนวทีละ 0.05 ช่อง · เวลาถึงแต่ละช่อง = ระยะฉายกลางช่องบนแนว
function prepareAimedBeam(f, cols, rows) {
  const { x, y, to } = f;
  if (![x, y, to.x, to.y].every(Number.isFinite)) return null;
  const dx = to.x - x, dy = to.y - y, L = Math.hypot(dx, dy);
  if (L < 0.5) return null;
  const v = [dx / L, dy / L];
  const len = Math.max(1, Math.min(64, Math.floor(+f.len) || 4));
  const cx = x + 0.5, cy = y + 0.5, seen = new Set(), tiles = [];
  let end = len + 0.5;
  for (let d = 0.05; d <= len + 0.5; d += 0.05) {
    const px = cx + v[0] * d, py = cy + v[1] * d;
    if (px < 0 || py < 0 || px >= cols || py >= rows) { end = d; break; }
    const tx = Math.floor(px), ty = Math.floor(py), k = tx + "," + ty;
    if ((tx === x && ty === y) || seen.has(k)) continue;
    seen.add(k); tiles.push({ x: tx, y: ty });
  }
  const reach = Math.max(0.2, end - MUZZLE);
  const { charge: C, extend: E } = BEAM_T;
  const hits = tiles.map((t) => {
    const d = (t.x + 0.5 - cx) * v[0] + (t.y + 0.5 - cy) * v[1];
    const q = Math.max(0, Math.min(1, (d - MUZZLE) / reach));
    return C + (REDUCED ? 0 : E * (1 - Math.cbrt(1 - q)));
  });
  return { v, tiles, hits, reach };
}
// สีลำแสง: ขาวผสมแดงเสมอ (ไม่ตามสีผู้เล่น) — คงรูปคืนค่าไว้ให้ BoardCanvas
export function beamColors() {
  return { rgb: RED, hot: WHITE_RED };
}
// แท่งเรียวปลายมน ระหว่างจุดจอ A, B ([sx, sy, สเกล]) · w = ความกว้างหน่วยช่อง
export function taper(g, A, B, w, fill) {
  const vx = B[0] - A[0], vy = B[1] - A[1], L = Math.hypot(vx, vy), ha = A[2] * w / 2, hb = B[2] * w / 2;
  g.beginPath();
  if (L < 0.5) g.arc(A[0], A[1], Math.max(ha, hb), 0, Math.PI * 2);
  else {
    const nx = -vy / L, ny = vx / L, th = Math.atan2(vy, vx);
    g.moveTo(A[0] + nx * ha, A[1] + ny * ha);
    g.lineTo(B[0] + nx * hb, B[1] + ny * hb);
    g.arc(B[0], B[1], hb, th + Math.PI / 2, th - Math.PI / 2, true);
    g.lineTo(A[0] - nx * ha, A[1] - ny * ha);
    g.arc(A[0], A[1], ha, th - Math.PI / 2, th + Math.PI / 2, true);
  }
  g.closePath(); g.fillStyle = fill; g.fill();
}
// จุดบนจอของเกลียวเส้น k (0/1 = ห่างกันครึ่งรอบ) จากปากกระบอก (ax, ay) ไปถึงระยะ dist ช่อง
//  คืน [[sx, sy, สเกล, อยู่หน้าแกน?], …] — เกลียวค่อยๆ กางออกจากปากกระบอกในช่วง 0.45 ช่องแรก
function helixPts(ax, ay, dx, dy, dist, phase, k, rK) {
  const out = [], n = Math.max(2, Math.ceil(dist / HELIX.step));
  for (let i = 0; i <= n; i++) {
    const d = dist * i / n, r = HELIX.r * rK * Math.min(1, d / 0.45);
    const th = d * HELIX.twist - phase + k * Math.PI, c = Math.cos(th) * r;
    const cx = ax + dx * d, cy = ay + dy * d;
    const pt = P(cx - dy * c, cy + dx * c, BEAM_Z + Math.sin(th) * r);
    pt.push(pt[2] >= P(cx, cy, BEAM_Z)[2]);
    out.push(pt);
  }
  return out;
}
// วาดช่วงของเกลียวที่อยู่ด้านเดียวกับ front (หน้า/หลังแกน) · w = ความกว้างหน่วยช่อง
function strokeHelix(g, pts, front, w, color) {
  g.strokeStyle = color;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if ((a[3] && b[3]) !== front) continue; // ช่วงที่ข้ามแกนนับเป็นด้านหลัง
    g.lineWidth = Math.max(1, (a[2] + b[2]) / 2 * w);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
}
export function beamFx(g, e, now, lowQ) {
  const B = e.beam;
  if (!B) return;
  const K = BEAM_TONES[e.tone] || BEAM_TONES.red;
  const { charge: C, extend: E, hold: H, fade: F } = BEAM_T, t = now - e.t0;
  if (t < 0 || t > C + E + H + F) return;
  const [dx, dy] = B.v;
  const ax = e.x + 0.5 + dx * MUZZLE, ay = e.y + 0.5 + dy * MUZZLE;
  const A = P(ax, ay, BEAM_Z);
  const still = lowQ || REDUCED;
  const fadeK = t > C + E + H ? Math.max(0, 1 - (t - C - E - H) / F) : 1;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // ช่องที่ลำแสงผ่าน: พื้นแดงจาง + แฟลชขาวตอนปลายลำแสงถึง
  B.tiles.forEach((tl, i) => {
    const age = t - B.hits[i];
    if (age < 0) return;
    g.globalCompositeOperation = "source-over";
    quad(g, tl.x, tl.y, 0.1); g.fillStyle = `rgba(${K.c},${0.22 * fadeK})`; g.fill();
    if (age < IMPACT_MS) {
      const q = age / IMPACT_MS, a = 1 - q;
      g.globalCompositeOperation = "lighter";
      gEllipse(g, tl.x + 0.5, tl.y + 0.5, 0.16 + q * 0.32, 0, 24); g.fillStyle = `rgba(255,255,255,${0.7 * a})`; g.fill();
      const [sx, sy, sc] = P(tl.x + 0.5, tl.y + 0.5, BEAM_Z);
      glow(g, sx, sy, sc * (0.35 + q * 0.4), K.hot, 0.85 * a);
      if (!still) {
        g.globalCompositeOperation = "source-over";
        g.strokeStyle = `rgba(${K.hi},${a})`; g.lineWidth = 2;
        for (let k = 0; k < 5; k++) {
          const th = (k / 5) * Math.PI * 2 + i * 1.7, r0 = sc * 0.12, r1 = sc * (0.2 + q * 0.45);
          g.beginPath(); g.moveTo(sx + Math.cos(th) * r0, sy + Math.sin(th) * r0 * 0.7); g.lineTo(sx + Math.cos(th) * r1, sy + Math.sin(th) * r1 * 0.7); g.stroke();
        }
      }
    }
  });
  // ชาร์จที่ปากกระบอก: วงแดงรวมตัว + จุดขาว → แฟลชตอนยิง
  if (t < C) {
    const p = t / C;
    g.globalCompositeOperation = "source-over";
    glow(g, A[0], A[1], A[2] * (0.25 + 0.55 * p), K.glow, 0.3 + 0.45 * p);
    g.globalCompositeOperation = "lighter";
    glow(g, A[0], A[1], A[2] * (0.08 + 0.22 * p), "255,255,255", 0.5 + 0.5 * p);
    if (!still) {
      g.globalCompositeOperation = "source-over";
      g.fillStyle = `rgba(${K.hi},${0.4 + 0.6 * p})`;
      for (let k = 0; k < 8; k++) {
        const th = (k / 8) * Math.PI * 2 + now / 260, r = A[2] * 0.75 * (1 - p);
        g.beginPath(); g.arc(A[0] + Math.cos(th) * r, A[1] + Math.sin(th) * r * 0.75, 1.6 + p * 1.6, 0, Math.PI * 2); g.fill();
      }
    }
  } else if (t < C + 240) {
    const q = (t - C) / 240, a = 1 - q;
    g.globalCompositeOperation = "lighter";
    glow(g, A[0], A[1], A[2] * (0.6 + q * 0.6), "255,255,255", a);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = `rgba(${K.c},${a})`; g.lineWidth = 3 * a + 1;
    g.beginPath(); g.ellipse(A[0], A[1], A[2] * (0.25 + q * 0.7), A[2] * (0.18 + q * 0.5), 0, 0, Math.PI * 2); g.stroke();
  }
  // ตัวลำแสง: เรืองแดงรอบนอก → เกลียวด้านหลัง → แกนขาว → เกลียวด้านหน้า
  if (t >= C && fadeK > 0) {
    const front = REDUCED ? 1 : 1 - Math.pow(1 - Math.min(1, (t - C) / E), 3);
    const dist = B.reach * front;
    const Bp = P(ax + dx * dist, ay + dy * dist, BEAM_Z);
    const wK = 0.3 + 0.7 * fadeK, rK = 1 + (1 - fadeK) * 0.7;
    const phase = REDUCED ? 0 : now * HELIX.spin;
    const strands = (lowQ ? [0] : [0, 1]).map((k) => helixPts(ax, ay, dx, dy, dist, phase, k, rK));
    const side = (isFront) => {
      for (const pts of strands) {
        if (!lowQ) strokeHelix(g, pts, isFront, 0.11, `rgba(${K.glow},${0.3 * fadeK})`);
        strokeHelix(g, pts, isFront, 0.045, `rgba(${K.c},${0.95 * fadeK})`);
        if (!lowQ) strokeHelix(g, pts, isFront, 0.016, `rgba(${K.hi},${0.9 * fadeK})`);
      }
    };
    g.globalCompositeOperation = "source-over";
    if (!lowQ) taper(g, A, Bp, 0.6 * wK * rK, `rgba(${K.glow},${0.16 * fadeK})`);
    side(false);
    g.globalCompositeOperation = "lighter";
    taper(g, A, Bp, 0.17 * wK, `rgba(${K.hot},${0.55 * fadeK})`);
    taper(g, A, Bp, 0.075 * wK, `rgba(255,255,255,${fadeK})`);
    g.globalCompositeOperation = "source-over";
    side(true);
    g.globalCompositeOperation = "lighter";
    glow(g, Bp[0], Bp[1], Bp[2] * 0.42 * wK, K.hot, 0.8 * fadeK);
    glow(g, A[0], A[1], A[2] * 0.4 * wK, "255,255,255", 0.7 * fadeK);
  }
  g.restore();
}
// =================================================================== คลื่นดาบถล่ม (มุยมิ)
//  fx { kind: "quake", x, y (ช่องมุยมิ), dir, len, width, quake: prepareQuake(...) }
//  ทุกช่องในแนว len×width: ดาบแสงร่วงจากฟ้าปักพื้น → พื้นระเบิด (แฟลช + คลื่นกระแทก + รอยแยกลาวา + เศษหินกระเด็น + ฝุ่นไฟ)
//  ไล่จากแถวใกล้ตัว → ไกล (ทีละแถว QUAKE_T.stagger) · ใบดาบค้างปักพื้นแล้วจางไป
//  lowQ = ไม่มีเศษหิน/รอยแยก/ฝุ่น · ลดการเคลื่อนไหว = ไม่มีดาบร่วง ระเบิดทันที
export const QUAKE_T = { fall: 230, stagger: 80, after: 820 };
const GOLD = "255,214,120", GOLD_HI = "255,246,215";
// เลขสุ่มคงที่ต่อช่อง (เอฟเฟกต์ไม่กระตุกเปลี่ยนทุกเฟรม)
function hash01(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
export function prepareQuake(f, cols, rows) {
  const v = BEAM_DIRS[f && f.dir];
  if (!v || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return null;
  const len = Math.max(1, Math.min(16, Math.floor(+f.len) || 4)), half = Math.floor((Math.floor(+f.width) || 3) / 2);
  const [fx, fy] = v, sx = -fy, sy = fx, fall = REDUCED ? 0 : QUAKE_T.fall;
  const tiles = [];
  for (let i = 1; i <= len; i++) {
    for (let j = -half; j <= half; j++) {
      const x = f.x + fx * i + sx * j, y = f.y + fy * i + sy * j;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const seed = i * 7.3 + j * 3.1;
      tiles.push({ x, y, seed, at: (i - 1) * QUAKE_T.stagger + Math.abs(j) * 25 + hash01(seed) * 30, lean: (hash01(seed + 9) - 0.5) * 0.5 });
    }
  }
  if (!tiles.length) return null;
  const hits = tiles.map((t) => t.at + fall);
  return { tiles, hits, fall, dur: Math.max(...hits) + QUAKE_T.after + 40 };
}
// ลูกไฟ (วาดทับแบบปกติ — เห็นชัดบนพื้นสว่าง ไม่ขาวโพลนแบบ lighter)
function fireball(g, x, y, r, a) {
  if (r <= 0 || a <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,250,225,${a})`);
  gr.addColorStop(0.25, `rgba(255,196,70,${a})`);
  gr.addColorStop(0.55, `rgba(240,92,24,${0.85 * a})`);
  gr.addColorStop(1, "rgba(150,30,10,0)");
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
export function quakeFx(g, e, now, lowQ) {
  const Q = e.quake;
  if (!Q) return;
  const t = now - e.t0;
  if (t < 0 || t > Q.dur) return;
  const still = lowQ || REDUCED, A = QUAKE_T.after;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // ชั้นพื้น (หลุมไหม้ + รอยแยก + คลื่นกระแทก) วาดก่อนทุกช่อง แล้วค่อยวาดของที่ลอย (ดาบ/ไฟ/เศษหิน)
  Q.tiles.forEach((tl, i) => {
    const age = t - Q.hits[i];
    if (age < 0 || age > A) return;
    const q = age / A, k = 1 - q, cx = tl.x + 0.5, cy = tl.y + 0.5;
    g.globalCompositeOperation = "source-over";
    quad(g, tl.x, tl.y, 0.03); g.fillStyle = `rgba(48,18,6,${0.55 * k})`; g.fill();
    gEllipse(g, cx, cy, 0.34, 0, 24); g.fillStyle = `rgba(20,6,2,${0.5 * k})`; g.fill();
    if (!still) {
      const s0 = P(cx, cy);
      g.lineWidth = Math.max(1.5, s0[2] * 0.045);
      g.strokeStyle = `rgba(255,${120 + 80 * k},40,${k})`;
      for (let c = 0; c < 6; c++) {
        const th = (c / 6) * Math.PI * 2 + hash01(tl.seed + c) * 0.8, r = Math.min(1, age / 140) * (0.36 + hash01(tl.seed + c + 20) * 0.14);
        const m = P(cx + Math.cos(th + 0.3) * r * 0.5, cy + Math.sin(th + 0.3) * r * 0.5), o = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r);
        g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(m[0], m[1]); g.lineTo(o[0], o[1]); g.stroke();
      }
    }
    const ring = Math.min(1, age / 380);
    if (ring < 1) {
      const sc = P(cx, cy)[2];
      g.strokeStyle = `rgba(255,170,60,${0.95 * (1 - ring)})`; g.lineWidth = Math.max(1.5, sc * 0.08 * (1 - ring));
      gEllipse(g, cx, cy, 0.2 + ring * 0.85, 0, 28); g.stroke();
    }
  });
  Q.tiles.forEach((tl, i) => {
    const age = t - Q.hits[i]; // < 0 = ดาบกำลังร่วง · ≥ 0 = หลังปักพื้น
    const cx = tl.x + 0.5, cy = tl.y + 0.5;
    if (age < 0) {
      const f = 1 + age / Math.max(1, Q.fall); // 0 → 1 ตอนร่วง
      if (f < 0) return;
      const z = 7 * (1 - f * f);
      g.globalCompositeOperation = "source-over";
      gEllipse(g, cx, cy, 0.16 + 0.24 * f, 0, 20); g.fillStyle = `rgba(30,8,0,${0.2 + 0.4 * f})`; g.fill();
      // ดาบแสง (ปลายลง) + หางไฟยาวด้านบน
      const off = tl.lean * (1 - f);
      const tip = P(cx + off, cy, z), hilt = P(cx + off * 1.4, cy, z + 1.5), trail = P(cx + off * 2.6, cy, z + 4.2);
      if (!lowQ) taper(g, hilt, trail, 0.3, "rgba(240,110,30,0.35)");
      taper(g, tip, hilt, 0.22, "rgba(235,120,30,0.95)");
      taper(g, tip, hilt, 0.12, `rgba(${GOLD},1)`);
      taper(g, tip, hilt, 0.045, `rgba(${GOLD_HI},1)`);
      return;
    }
    if (age > A) return;
    const q = age / A, k = 1 - q;
    // ใบดาบปักพื้น จางลง
    if (!REDUCED && q < 0.7) {
      const a = 1 - q / 0.7, base = P(cx, cy, -0.1), top = P(cx + tl.lean * 0.2, cy, 1.05);
      g.globalCompositeOperation = "source-over";
      taper(g, base, top, 0.18, `rgba(220,110,30,${0.85 * a})`);
      taper(g, base, top, 0.08, `rgba(${GOLD_HI},${a})`);
    }
    // ระเบิด: ลูกไฟพองแล้วยุบ + เสาไฟพุ่ง + แฟลชขาวสั้นๆ
    const [sx0, sy0, sc] = P(cx, cy, 0.35);
    if (age < 420) {
      const p = age / 420, puff = Math.sin(Math.min(1, p * 1.6) * Math.PI / 2);
      g.globalCompositeOperation = "source-over";
      fireball(g, sx0, sy0, sc * (0.35 + 0.55 * puff), 1 - p * p);
      if (!lowQ && p < 0.6) taper(g, P(cx, cy, 0), P(cx, cy, 1.4 + p * 2.2), 0.5 * (1 - p / 0.6), `rgba(255,150,50,${0.75 * (1 - p / 0.6)})`);
      if (age < 120) { g.globalCompositeOperation = "lighter"; glow(g, sx0, sy0, sc * 0.6, GOLD_HI, 1 - age / 120); }
    }
    if (still) return;
    // เศษหิน + ประกายไฟกระเด็น (โค้งพาราโบลา)
    const s = age / 1000;
    for (let d = 0; d < 8; d++) {
      const r1 = hash01(tl.seed * 3 + d), r2 = hash01(tl.seed * 5 + d + 1);
      const th = r1 * Math.PI * 2, sp = 0.9 + r2 * 1.4, vz = 3 + r2 * 3.5;
      const z = vz * s - 9 * s * s;
      if (z < -0.05) continue;
      const [px, py, ps] = P(cx + Math.cos(th) * sp * s, cy + Math.sin(th) * sp * s, z);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = d % 3 === 0 ? `rgba(255,190,80,${k})` : `rgba(62,40,26,${k})`;
      g.beginPath(); g.arc(px, py, Math.max(1.5, ps * (d % 3 === 0 ? 0.035 : 0.06)), 0, Math.PI * 2); g.fill();
    }
    // ควันฝุ่นลอยขึ้น
    if (age > 120) {
      const [dx0, dy0, ds] = P(cx, cy, 0.5 + q * 1.2);
      g.globalCompositeOperation = "source-over";
      glow(g, dx0, dy0, ds * (0.35 + q * 0.55), "92,74,62", 0.45 * k);
    }
  });
  g.restore();
}

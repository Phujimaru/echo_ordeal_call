// ============================================================
//  เอฟเฟกต์บนกระดานของไรโด ฮิคารุ (characters/raido_hikaru.js) — ผู้ใช้สั่ง: ทุกการโจมตีมีเอฟเฟกต์เฉพาะตัว ยกเว้นร่างคน
//  ตีปกติ (fx.kind = attackStyle จาก server) — fx { x, y (มุมบนซ้ายผู้ตี), size, to: { x, y }, toSize, lane?: [{ x, y }] }
//    hkBlack    แบล็คคิง: คลื่นพลังดำ-แดงวิ่งไปตามแนว + สายฟ้าแดง + พื้นแยก
//    hkThunder  ทันเดอร์ดารัมเบีย: ชาร์จประกายไฟที่ตัว → สายฟ้าเหลืองฟาดจากฟ้าลงเป้า + วงไฟฟ้า
//    hkKemur    มนุษย์ดาวเคมู: ลูกหมอกพิษม่วงลอยโค้ง → แตกเป็นควันพิษเขียว-ม่วง + ฟองอากาศ
//    hkPandon   คิงแพนด้อน: ลูกไฟคู่ (สองหัว) โค้งเข้าหาเป้า → ระเบิดไฟ + ประกายไฟ
//    hkDoragory ดอรากอรี่: รอยกรงเล็บแดง 3 เส้นกวาดผ่านเป้า + หยดเลือด
//    hkTiga     Ultraman Tiga: จานแสงหมุนแดง-ม่วง-เงินพุ่งเข้าเป้า → แสงแตกหลายสี
//    hkGinga    กิงกะ: คริสตัลบนตัวเรือง → คลื่นพลังฟ้ากว้างเท่าด้านตัวพุ่งใส่ช่องที่ติด → เสาแสง + คริสตัลแตกทุกช่อง
//    hkStrium   กิงกะสโตเรี่ยม: แบบเดียวกันแต่เป็นเปลวไฟแดง + ประกายรุ้ง
//  จังหวะปะทะ (เป้าทุกคนในแนวสั่น · BoardStage ขึ้นเลข/เสียงตรงนั้น): hkHit { x, y, size, tone, hitIds }
//  ท่าไม้ตาย (socket "hikaruBeam"): hkCross ลำแสงหนาฟ้า-ขาว 5×1 + วงคริสตัลเต้นตามแนว · hkStriumRay ลำแสงรุ้งกว้าง 5×3 + เส้นความเร็ว
//    fx { x, y, size, dir, len, width, tiles: [{ x, y }] } — ดาเมจลงหลังลำแสงวิ่งถึง (server BEAM_SECONDS = HK_BEAM.reach)
//  วาดด้วย canvas ล้วน · lowQ = ตัดอนุภาค/เรืองซ้อน · ลดการเคลื่อนไหว = ไม่สั่น/ไม่มีอนุภาคลอย
// ============================================================
import { P, gEllipse, glow, quad } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const SQY = 0.6;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ระยะเวลาแต่ละท่า (ms) · จังหวะปะทะเป็นสัดส่วนของเวลา (รวมเข้า STYLE_MS / STYLE_HIT_P ใน boardDraw.js)
export const HK_MS = { hkBlack: 1250, hkThunder: 1150, hkKemur: 1250, hkPandon: 1250, hkDoragory: 1000, hkTiga: 1150, hkGinga: 1250, hkStrium: 1250 };
export const HK_HIT_P = { hkBlack: 0.46, hkThunder: 0.5, hkKemur: 0.55, hkPandon: 0.55, hkDoragory: 0.42, hkTiga: 0.5, hkGinga: 0.46, hkStrium: 0.46 };
// ท่าไม้ตาย: ชาร์จ → ลำแสงวิ่งถึงปลาย (reach — server ลงดาเมจที่ BEAM_SECONDS 1.9 วิ) → ค้าง → จาง
export const HK_BEAM = { charge: 900, reach: 1500, hold: 900, fade: 400 };
export const HK_PUSH_MS = 650;
// เสียงตีปกติเริ่มก่อนจังหวะปะทะกี่ ms (ช่วงดังสุดของไฟล์ใน sfx/ ตรงกับจังหวะปะทะ — เสียงยาวที่มีช่วงสะสมพลังเริ่มก่อน)
export const HK_SFX_LEAD = { hkBlack: 800, hkThunder: 800, hkKemur: 0, hkPandon: 600, hkDoragory: 100, hkTiga: 400, hkGinga: 900, hkStrium: 200 };
export const HK_FX_DUR = {
  ...HK_MS,
  hkHit: 600,
  hkCross: HK_BEAM.reach + HK_BEAM.hold + HK_BEAM.fade,
  hkStriumRay: HK_BEAM.reach + HK_BEAM.hold + HK_BEAM.fade,
};
// สีจังหวะปะทะตามท่า (hkHit.tone)
export const HK_TONE = {
  hkBlack: "200,20,40", hkThunder: "255,226,80", hkKemur: "170,90,220", hkPandon: "255,120,30",
  hkDoragory: "220,30,40", hkTiga: "230,70,200", hkGinga: "90,190,255", hkStrium: "255,110,60",
};
export const isHikaruFx = (kind) => typeof kind === "string" && (kind in HK_FX_DUR);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const lerp = (a, b, t) => a + (b - a) * t;
function rngOf(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
// จุดกลางตัว (หน่วยช่อง) + จุดบนจอที่ความสูง z
const mid = (x, y, n) => [x + (n || 1) / 2, y + (n || 1) / 2];
function at(x, y, n, z) { const [cx, cy] = mid(x, y, n); return P(cx, cy, z); }
const RAINBOW = ["255,80,80", "255,170,60", "255,240,90", "90,230,120", "80,190,255", "170,110,255"];

// สายฟ้าหยักระหว่างจุดจอ a → b (seed คงที่ต่อเฟรมช่วง — กระพริบเปลี่ยนรูปทุก 70ms)
function bolt(g, a, b, seed, jag, w, rgb, alpha, branches = 0) {
  const R = rngOf(seed), n = 9, pts = [];
  const vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy) || 1, nx = -vy / L, ny = vx / L;
  for (let i = 0; i <= n; i++) {
    const u = i / n, off = i === 0 || i === n ? 0 : (R() - 0.5) * jag;
    pts.push([a[0] + vx * u + nx * off, a[1] + vy * u + ny * off]);
  }
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  for (const [lw, col] of [[w * 3.2, `rgba(${rgb},${0.28 * alpha})`], [w, `rgba(${rgb},${alpha})`], [Math.max(1, w * 0.35), `rgba(255,255,255,${alpha})`]]) {
    g.strokeStyle = col; g.lineWidth = lw;
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  }
  for (let k = 0; k < branches; k++) {
    const i = 2 + Math.floor(R() * (n - 4)), [bx, by] = pts[i], ang = Math.atan2(vy, vx) + (R() - 0.5) * 2.2, l = L * (0.12 + R() * 0.18);
    g.strokeStyle = `rgba(${rgb},${0.8 * alpha})`; g.lineWidth = Math.max(1, w * 0.45);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(ang) * l * 0.5 + (R() - 0.5) * jag * 0.4, by + Math.sin(ang) * l * 0.5); g.lineTo(bx + Math.cos(ang) * l, by + Math.sin(ang) * l); g.stroke();
  }
  g.restore();
}
// ประกายกระจายจากจุดจอ (x, y) — k = ความคืบหน้า 0..1
function sparks(g, x, y, s, k, count, cols, seed, spread = 1) {
  const R = rngOf(seed);
  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2, d = s * (0.25 + R() * 0.75) * spread * easeOut3(k);
    const c = cols[i % cols.length];
    g.fillStyle = `rgba(${c},${1 - k})`;
    g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * SQY - k * s * 0.4 * R(), 1.6 + R() * 2.4, 0, 7); g.fill();
  }
}
// แฟลช + วงกระแทกบนพื้นที่ช่อง (tx, ty) หน่วยช่อง
function ring(g, cx, cy, k, rgb, r0 = 0.2, r1 = 0.75, w = 4) {
  g.save();
  g.strokeStyle = `rgba(${rgb},${0.9 * (1 - k)})`; g.lineWidth = w * (1 - k) + 1;
  gEllipse(g, cx, cy, r0 + (r1 - r0) * easeOut3(k), 0.02, 32); g.stroke();
  g.restore();
}
// ช่องตามแนว (server ส่ง lane มา) — ไม่มี = ช่องเป้าช่องเดียว
const laneOf = (e) => (Array.isArray(e.lane) && e.lane.length ? e.lane : [{ x: e.to.x, y: e.to.y }]);
// เวลาที่หัวคลื่นถึงช่องที่ i (สัดส่วนของท่า) — ปะทะ (HIT) ที่ช่องสุดท้ายของแนว
const laneT = (i, n, start, hit) => start + (hit - start) * ((i + 1) / Math.max(1, n));

// ---------------------------------------------------------------- แบล็คคิง
function blackFx(g, e, t, now, lowQ) {
  const HIT = HK_HIT_P.hkBlack, tiles = laneOf(e), n = tiles.length;
  const A = at(e.x, e.y, e.size, 0.5);
  g.save();
  // ออร่าดำแดงรวมที่ตัว
  if (t < 0.2) glow(g, A[0], A[1], A[2] * (0.4 + t * 3), "120,0,20", 0.6);
  let prev = A;
  tiles.forEach((tl, i) => {
    const t0 = laneT(i, n, 0.12, HIT);
    if (t < t0 - 0.12) return;
    const k = clamp01((t - (t0 - 0.12)) / 0.12), fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    const c = [tl.x + 0.5, tl.y + 0.5];
    // พื้นแยกสีแดงเข้ม
    quad(g, tl.x, tl.y, 0.08); g.fillStyle = `rgba(30,0,8,${0.45 * fade * k})`; g.fill();
    if (!lowQ) {
      const R = rngOf(31 + i * 7);
      g.strokeStyle = `rgba(255,40,60,${0.85 * fade})`; g.lineWidth = 2;
      for (let j = 0; j < 4; j++) {
        const a = R() * Math.PI * 2, L = 0.45 * k;
        const p0 = P(c[0], c[1]), p1 = P(c[0] + Math.cos(a) * L * 0.5, c[1] + Math.sin(a) * L * 0.5), p2 = P(c[0] + Math.cos(a + 0.4) * L, c[1] + Math.sin(a + 0.4) * L);
        g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke();
      }
    }
    // หัวคลื่นพลังดำ
    const head = P(c[0], c[1], 0.45 + 0.15 * Math.sin(k * Math.PI));
    if (k < 1 || t < t0 + 0.1) {
      g.globalCompositeOperation = "source-over";
      glow(g, head[0], head[1], head[2] * 0.75, "40,0,10", 0.85 * fade);
      g.globalCompositeOperation = "lighter";
      glow(g, head[0], head[1], head[2] * 0.4, "230,30,50", 0.7 * fade);
      g.globalCompositeOperation = "source-over";
    }
    // สายฟ้าแดงต่อจากช่องก่อนหน้า
    if (fade > 0) bolt(g, prev, head, 101 + i * 13 + Math.floor(now / 70), head[2] * 0.35, Math.max(1.5, head[2] * 0.05), "255,40,60", 0.9 * fade, lowQ ? 0 : 2);
    prev = head;
  });
  g.restore();
}
// ---------------------------------------------------------------- ทันเดอร์ดารัมเบีย
function thunderFx(g, e, t, now, lowQ) {
  const HIT = HK_HIT_P.hkThunder;
  const A = at(e.x, e.y, e.size, 0.5), [tx, ty] = mid(e.to.x, e.to.y, e.toSize);
  const B = P(tx, ty, 0.1), S = P(tx, ty, 4.2);
  g.save();
  if (t < HIT) {
    // ชาร์จ: ประกายไฟวนรอบตัว
    const k = t / HIT;
    g.globalCompositeOperation = "lighter";
    glow(g, A[0], A[1], A[2] * (0.3 + 0.5 * k), "255,220,60", 0.35 + 0.4 * k);
    g.globalCompositeOperation = "source-over";
    const sp = lowQ ? 4 : 9;
    for (let i = 0; i < sp; i++) {
      const a = (i / sp) * Math.PI * 2 + now / 120, r = A[2] * (0.7 - 0.4 * k);
      bolt(g, [A[0] + Math.cos(a) * r, A[1] + Math.sin(a) * r * 0.7], [A[0] + Math.cos(a + 0.6) * r * 0.6, A[1] + Math.sin(a + 0.6) * r * 0.45], i * 17 + Math.floor(now / 60), 6, 1.4, "255,236,120", 0.8, 0);
    }
    // เมฆฟ้าคำรามเหนือเป้า
    if (k > 0.5) glow(g, S[0], S[1], S[2] * 1.2, "255,240,150", (k - 0.5) * 0.6);
  } else {
    const k = (t - HIT) / (1 - HIT), a = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
    bolt(g, S, B, 7 + Math.floor(now / 70), B[2] * 0.6, Math.max(2, B[2] * 0.09), "255,226,80", a, lowQ ? 1 : 4);
    if (k < 0.25) { g.globalCompositeOperation = "lighter"; glow(g, B[0], B[1], B[2] * 1.3, "255,250,200", 1 - k / 0.25); g.globalCompositeOperation = "source-over"; }
    ring(g, tx, ty, clamp01(k * 1.4), "255,226,80", 0.25, 1.1, 5);
    if (!lowQ) ring(g, tx, ty, clamp01(k * 1.4 - 0.2), "255,255,255", 0.2, 0.8, 3);
    if (!lowQ) sparks(g, B[0], B[1], B[2], k, 14, ["255,236,120", "255,255,255"], 5);
  }
  g.restore();
}
// ---------------------------------------------------------------- มนุษย์ดาวเคมู
function kemurFx(g, e, t, now, lowQ) {
  const HIT = HK_HIT_P.hkKemur;
  const [ax, ay] = mid(e.x, e.y, e.size), [tx, ty] = mid(e.to.x, e.to.y, e.toSize);
  g.save();
  if (t < HIT) {
    const k = easeOut3(clamp01((t - 0.08) / (HIT - 0.08)));
    const x = lerp(ax, tx, k), y = lerp(ay, ty, k), z = 0.6 + Math.sin(k * Math.PI) * 1.5;
    const O = P(x, y, z), sh = P(x, y, 0);
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(sh[0], sh[1], O[2] * 0.28, O[2] * 0.28 * SQY, 0, 0, 7); g.fill();
    // หางหมอก
    if (!lowQ) {
      for (let i = 1; i <= 5; i++) {
        const k2 = Math.max(0, k - i * 0.05), Q = P(lerp(ax, tx, k2), lerp(ay, ty, k2), 0.6 + Math.sin(k2 * Math.PI) * 1.5);
        glow(g, Q[0], Q[1], Q[2] * (0.32 - i * 0.03), "150,70,200", 0.35 - i * 0.05);
      }
    }
    glow(g, O[0], O[1], O[2] * 0.5, "120,40,180", 0.8);
    glow(g, O[0], O[1], O[2] * 0.25, "200,140,255", 0.9);
  } else {
    const k = (t - HIT) / (1 - HIT), B = P(tx, ty, 0.3);
    const R = rngOf(77), puffs = lowQ ? 5 : 10;
    for (let i = 0; i < puffs; i++) {
      const a = R() * Math.PI * 2, d = (0.2 + R() * 0.5) * easeOut3(k), rise = k * (0.3 + R() * 0.6);
      const C = P(tx + Math.cos(a) * d, ty + Math.sin(a) * d * 0.8, 0.25 + rise);
      glow(g, C[0], C[1], C[2] * (0.3 + 0.35 * k), i % 2 ? "110,200,90" : "150,70,200", 0.55 * (1 - k));
    }
    if (k < 0.2) glow(g, B[0], B[1], B[2] * 0.9, "210,170,255", 1 - k / 0.2);
    if (!lowQ && !REDUCED) {
      // ฟองอากาศพิษลอยขึ้น
      const RB = rngOf(91);
      for (let i = 0; i < 8; i++) {
        const ox = (RB() - 0.5) * 0.9, oy = (RB() - 0.5) * 0.7, rise = (k + RB() * 0.4) % 1;
        const C = P(tx + ox, ty + oy, 0.2 + rise * 1.4);
        g.strokeStyle = `rgba(190,240,170,${0.8 * (1 - rise)})`; g.lineWidth = 1.5;
        g.beginPath(); g.arc(C[0], C[1], 2 + RB() * 3, 0, 7); g.stroke();
      }
    }
  }
  g.restore();
}
// ---------------------------------------------------------------- คิงแพนด้อน
function fireball(g, x, y, r, a) {
  glow(g, x, y, r * 1.8, "255,90,20", 0.55 * a);
  glow(g, x, y, r, "255,180,60", 0.9 * a);
  glow(g, x, y, r * 0.45, "255,250,210", a);
}
function pandonFx(g, e, t, now, lowQ) {
  const HIT = HK_HIT_P.hkPandon;
  const [ax, ay] = mid(e.x, e.y, e.size), [tx, ty] = mid(e.to.x, e.to.y, e.toSize);
  const dx = tx - ax, dy = ty - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  g.save(); g.globalCompositeOperation = "lighter";
  if (t < HIT) {
    // สองหัว: ลูกไฟสองลูกโค้งคนละฝั่ง (ห่างกันเล็กน้อย) มาบรรจบที่เป้า
    for (const side of [-1, 1]) {
      const k = easeIn2(clamp01((t - 0.06 - (side > 0 ? 0.05 : 0)) / (HIT - 0.11)));
      if (k <= 0) continue;
      const bend = Math.sin(k * Math.PI) * 0.8 * side;
      const x = lerp(ax, tx, k) + nx * bend, y = lerp(ay, ty, k) + ny * bend, z = 0.7 + Math.sin(k * Math.PI) * 0.9;
      const F = P(x, y, z);
      if (!lowQ) {
        for (let i = 1; i <= 4; i++) {
          const k2 = Math.max(0, k - i * 0.06), b2 = Math.sin(k2 * Math.PI) * 0.8 * side;
          const Q = P(lerp(ax, tx, k2) + nx * b2, lerp(ay, ty, k2) + ny * b2, 0.7 + Math.sin(k2 * Math.PI) * 0.9);
          glow(g, Q[0], Q[1], Q[2] * (0.24 - i * 0.04), "255,110,30", 0.5 - i * 0.1);
        }
      }
      fireball(g, F[0], F[1], F[2] * 0.3, 1);
    }
  } else {
    const k = (t - HIT) / (1 - HIT), B = P(tx, ty, 0.35);
    fireball(g, B[0], B[1], B[2] * (0.35 + k * 0.7), 1 - k);
    g.globalCompositeOperation = "source-over";
    ring(g, tx, ty, k, "255,140,40", 0.3, 1.1, 5);
    if (!lowQ) sparks(g, B[0], B[1], B[2] * 1.4, k, 18, ["255,200,80", "255,110,30", "255,255,220"], 13);
  }
  g.restore();
}
// ---------------------------------------------------------------- ดอรากอรี่
function doragoryFx(g, e, t, now, lowQ) {
  const HIT = HK_HIT_P.hkDoragory;
  const [tx, ty] = mid(e.to.x, e.to.y, e.toSize), n = e.toSize || 1;
  g.save(); g.lineCap = "round";
  const sweep = clamp01((t - (HIT - 0.18)) / 0.2), fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  for (let c = 0; c < 3; c++) {
    const off = (c - 1) * 0.22 * n;
    const a = P(tx - 0.45 * n + off, ty - 0.45 * n, 0.9 * n), b = P(tx + 0.45 * n + off, ty + 0.45 * n, 0.1);
    const k = clamp01(sweep * 1.2 - c * 0.08);
    if (k <= 0) continue;
    const ex = lerp(a[0], b[0], k), ey = lerp(a[1], b[1], k);
    for (const [w, col] of [[a[2] * 0.14, `rgba(140,0,10,${0.5 * fade})`], [a[2] * 0.07, `rgba(230,30,40,${fade})`], [a[2] * 0.025, `rgba(255,220,220,${fade})`]]) {
      g.strokeStyle = col; g.lineWidth = Math.max(1, w);
      g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + ex) / 2 + a[2] * 0.12, (a[1] + ey) / 2 - a[2] * 0.08, ex, ey); g.stroke();
    }
  }
  if (t >= HIT && !lowQ) {
    // หยดเลือดร่วง
    const k = (t - HIT) / (1 - HIT), R = rngOf(57);
    for (let i = 0; i < 12; i++) {
      const ox = (R() - 0.5) * 0.9 * n, oy = (R() - 0.5) * 0.6 * n, z = (0.5 + R() * 0.6) * n - k * k * 1.6;
      if (z < 0) continue;
      const D = P(tx + ox + k * (R() - 0.5) * 0.4, ty + oy, z);
      g.fillStyle = `rgba(200,10,25,${1 - k * 0.6})`;
      g.beginPath(); g.ellipse(D[0], D[1], 2 + R() * 1.5, 3 + R() * 2, 0, 0, 7); g.fill();
    }
  }
  g.restore();
}
// ---------------------------------------------------------------- Ultraman Tiga
function tigaFx(g, e, t, now, lowQ) {
  const HIT = HK_HIT_P.hkTiga;
  const [ax, ay] = mid(e.x, e.y, e.size), [tx, ty] = mid(e.to.x, e.to.y, e.toSize);
  g.save();
  if (t < HIT) {
    const k = easeOut3(clamp01((t - 0.1) / (HIT - 0.1)));
    const D = P(lerp(ax, tx, k), lerp(ay, ty, k), 0.6);
    const r = D[2] * 0.42, spin = REDUCED ? 0 : now / 40;
    if (!lowQ) for (let i = 1; i <= 3; i++) {
      const k2 = Math.max(0, k - i * 0.07), Q = P(lerp(ax, tx, k2), lerp(ay, ty, k2), 0.6);
      glow(g, Q[0], Q[1], r * (1.2 - i * 0.25), "200,80,220", 0.35 - i * 0.08);
    }
    // จานแสงหมุน: วงนอกแดง วงกลางม่วง แกนเงิน (แบนตามมุมกล้อง)
    g.translate(D[0], D[1]); g.scale(1, 0.45);
    for (const [rr, col] of [[1, "230,40,60"], [0.72, "150,70,230"], [0.42, "225,232,245"]]) {
      g.fillStyle = `rgba(${col},.95)`; g.beginPath(); g.arc(0, 0, r * rr, 0, 7); g.fill();
    }
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = spin + i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
  } else {
    const k = (t - HIT) / (1 - HIT), B = P(tx, ty, 0.5);
    g.globalCompositeOperation = "lighter";
    if (k < 0.25) glow(g, B[0], B[1], B[2] * 1.1, "255,255,255", 1 - k / 0.25);
    const shards = lowQ ? 6 : 14, R = rngOf(23);
    for (let i = 0; i < shards; i++) {
      const a = (i / shards) * Math.PI * 2 + R() * 0.3, d = B[2] * (0.2 + 1.1 * easeOut3(k)), col = RAINBOW[i % RAINBOW.length];
      const x0 = B[0] + Math.cos(a) * d * 0.4, y0 = B[1] + Math.sin(a) * d * 0.4 * 0.7, x1 = B[0] + Math.cos(a) * d, y1 = B[1] + Math.sin(a) * d * 0.7;
      g.strokeStyle = `rgba(${col},${1 - k})`; g.lineWidth = 3 * (1 - k) + 1;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    ring(g, tx, ty, k, "230,70,200", 0.25, 1, 4);
  }
  g.restore();
}
// ---------------------------------------------------------------- กิงกะ / สโตเรี่ยม (ตามแนว)
function laneBeam(g, e, t, now, lowQ, strium) {
  const HIT = strium ? HK_HIT_P.hkStrium : HK_HIT_P.hkGinga, tiles = laneOf(e);
  const n = Math.max(1, e.size | 0), [ax, ay] = mid(e.x, e.y, n);
  const core = strium ? "255,120,60" : "90,190,255", hot = strium ? "255,230,150" : "215,245,255";
  const cols = strium ? RAINBOW : ["160,225,255", "255,255,255", "120,200,255"];
  // ทิศของด้านที่ตี (จากกลางตัวไปกลางกลุ่มช่องที่โดน) · ขอบตัวด้านนั้น · ความกว้างของด้าน
  const fx = tiles.reduce((s, c) => s + c.x + 0.5, 0) / tiles.length, fy = tiles.reduce((s, c) => s + c.y + 0.5, 0) / tiles.length;
  const ddx = fx - ax, ddy = fy - ay;
  const v = Math.abs(ddx) >= Math.abs(ddy) ? [Math.sign(ddx) || 1, 0] : [0, Math.sign(ddy) || 1];
  const sx = -v[1], sy = v[0], half = n / 2, ex = ax + v[0] * half, ey = ay + v[1] * half;
  const W = Math.max(1, tiles.length) + 0.4, BODY = P(ax, ay, 0.9 * n * 0.55);
  const quadAt = (d0, d1, w, z, col, a) => {
    const hw = w / 2, p = (d, o) => P(ex + v[0] * d + sx * o, ey + v[1] * d + sy * o, z);
    const A = p(d0, -hw), B = p(d1, -hw), C = p(d1, hw), D = p(d0, hw);
    g.fillStyle = `rgba(${col},${a})`; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(C[0], C[1]); g.lineTo(D[0], D[1]); g.closePath(); g.fill();
  };
  g.save();
  if (t < HIT) {
    // 1) ปลุกพลัง: คริสตัลบนตัวเรืองจ้าขึ้นเรื่อยๆ + ประกายวิ่งเข้าหาตัว
    const k = clamp01(t / HIT);
    g.globalCompositeOperation = "lighter";
    glow(g, BODY[0], BODY[1], BODY[2] * (0.5 + 0.9 * k), core, 0.35 + 0.5 * k);
    glow(g, BODY[0], BODY[1], BODY[2] * (0.18 + 0.3 * k), "255,255,255", 0.4 + 0.6 * k);
    if (!lowQ && !REDUCED) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + now / 260, r = BODY[2] * 1.8 * (1 - k) + BODY[2] * 0.3;
        g.fillStyle = `rgba(${cols[i % cols.length]},${0.4 + 0.6 * k})`;
        g.beginPath(); g.arc(BODY[0] + Math.cos(a) * r, BODY[1] + Math.sin(a) * r * 0.6, 2 + 2.5 * k, 0, 7); g.fill();
      }
    }
    // 2) คลื่นพลังกว้างเท่าด้านตัว พุ่งออกจากขอบตัวไปถึงช่องที่ติด
    const go = clamp01((t - HIT * 0.55) / (HIT * 0.45));
    if (go > 0) {
      const reach = 1.05 * easeOut3(go);
      quadAt(0, reach, W + 0.3, 0.05, core, 0.28);
      quadAt(0, reach, W, 0.45, core, 0.55);
      quadAt(Math.max(0, reach - 0.35), reach, W, 0.5, hot, 0.9);
    }
    g.globalCompositeOperation = "source-over";
  } else {
    // 3) ปะทะ: แผ่นแสงระเบิดทั้งด้าน + เสาแสงพุ่งขึ้นทุกช่อง + คริสตัลแตกกระจาย
    const k = (t - HIT) / (1 - HIT), fade = 1 - k;
    g.globalCompositeOperation = "lighter";
    quadAt(0, 1.1 + k * 0.5, W + k * 0.6, 0.05, core, 0.35 * fade);
    for (const tl of tiles) {
      const [cx, cy] = mid(tl.x, tl.y, 1), G = P(cx, cy, 0.1), T = P(cx, cy, 1.6 + k * 1.2);
      const w = G[2] * 0.42 * fade;
      const gr = g.createLinearGradient(G[0], G[1], T[0], T[1]);
      gr.addColorStop(0, `rgba(${hot},${0.9 * fade})`); gr.addColorStop(1, `rgba(${core},0)`);
      g.fillStyle = gr; g.fillRect(G[0] - w / 2, T[1], w, G[1] - T[1]);
      glow(g, G[0], G[1], G[2] * (0.5 + k * 0.6), hot, 0.9 * fade);
    }
    if (k < 0.25) glow(g, BODY[0], BODY[1], BODY[2] * 2.2, "255,255,255", 0.6 * (1 - k / 0.25));
    g.globalCompositeOperation = "source-over";
    for (const tl of tiles) {
      const [cx, cy] = mid(tl.x, tl.y, 1), C = P(cx, cy, 0.4);
      ring(g, cx, cy, clamp01(k * 1.3), core, 0.2, 0.9, 5);
      if (!lowQ) {
        ring(g, cx, cy, clamp01(k * 1.3 - 0.15), "255,255,255", 0.15, 0.7, 3);
        sparks(g, C[0], C[1], C[2] * 1.3, k, 14, cols, (tl.x * 13 + tl.y * 7) | 0);
        // เศษคริสตัล (ข้าวหลามตัด) ปลิว
        const R = rngOf(tl.x * 31 + tl.y * 17 + (strium ? 5 : 0));
        for (let i = 0; i < 6; i++) {
          const a = R() * Math.PI * 2, d = C[2] * (0.3 + R() * 0.9) * easeOut3(k), h = C[2] * (0.08 + R() * 0.06);
          const x = C[0] + Math.cos(a) * d, y = C[1] + Math.sin(a) * d * 0.6 - k * C[2] * 0.5;
          g.fillStyle = `rgba(${cols[i % cols.length]},${fade})`;
          g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.5, y); g.lineTo(x, y + h); g.lineTo(x - h * 0.5, y); g.closePath(); g.fill();
        }
      }
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- ปะทะ (ทุกคนที่โดนในแนว)
function hitFx(g, e, now, lowQ) {
  const k = clamp01((now - e.t0) / HK_FX_DUR.hkHit);
  const [cx, cy] = mid(e.x, e.y, e.size), C = P(cx, cy, 0.45), rgb = e.tone || "255,255,255";
  g.save();
  if (k < 0.3) { g.globalCompositeOperation = "lighter"; glow(g, C[0], C[1], C[2] * (0.5 + k), "255,255,255", 1 - k / 0.3); g.globalCompositeOperation = "source-over"; }
  ring(g, cx, cy, k, rgb, 0.2, 0.8, 4);
  if (!lowQ) sparks(g, C[0], C[1], C[2], k, 10, [rgb, "255,255,255"], (e.x * 31 + e.y * 7) | 0);
  g.restore();
}

// ---------------------------------------------------------------- ท่าไม้ตาย
//  ลำแสงออกจากกลางด้านหน้าตัว (ตัวใหญ่ 3×3) · ช่องที่โดน = tiles จาก server
function ultBeam(g, e, now, lowQ, ray) {
  const t = now - e.t0, { charge: CH, reach: RE, hold: HO, fade: FA } = HK_BEAM;
  if (t < 0 || t > RE + HO + FA) return;
  const v = DIRS[e.dir];
  if (!v) return;
  const n = Math.max(1, e.size | 0), [cx, cy] = mid(e.x, e.y, n);
  const half = n / 2, ox = cx + v[0] * half, oy = cy + v[1] * half; // ขอบหน้าตัว
  const width = Math.max(1, e.width | 0);
  // ความยาวจริง = ถึงช่องไกลสุดที่อยู่ในกระดาน (server ตัดขอบให้แล้ว) — ไม่วาดเลยขอบกระดาน
  const tl0 = Array.isArray(e.tiles) ? e.tiles : [];
  const far = tl0.reduce((m, c) => Math.max(m, (c.x + 0.5 - ox) * v[0] + (c.y + 0.5 - oy) * v[1] + 0.5), 0);
  const len = tl0.length ? Math.min(Math.max(1, e.len | 0), far) : 0.35;
  const ex = ox + v[0] * len, ey = oy + v[1] * len;
  const Z = 0.75, A = P(ox, oy, Z), BODY = P(cx, cy, 0.9 * n * 0.55);
  const fadeK = t > RE + HO ? 1 - (t - RE - HO) / FA : 1;
  const core = ray ? "255,140,90" : "120,200,255", hot = ray ? "255,240,200" : "235,250,255";
  const cols = ray ? RAINBOW : ["160,225,255", "255,255,255", "110,190,255"];
  const sx = -v[1], sy = v[0];
  const still = lowQ || REDUCED;
  g.save();
  // ---- ชาร์จ: คริสตัลบนตัวเรือง → เศษคริสตัลหมุนรวมที่หน้าตัว + วงเวทบนพื้น ----
  if (t < CH + 200) {
    const k = clamp01(t / CH), out = t > CH ? 1 - (t - CH) / 200 : 1;
    g.globalCompositeOperation = "lighter";
    glow(g, BODY[0], BODY[1], BODY[2] * (0.6 + 1.2 * k), core, (0.3 + 0.5 * k) * out);
    for (let r = 0; r < 2; r++) {
      const R0 = (0.6 + r * 0.45) * (0.4 + 0.6 * easeOut3(k)) * Math.max(1, width * 0.7), spin = still ? 0 : now / (r ? -500 : 380);
      const c0 = ox + v[0] * 0.5, c1 = oy + v[1] * 0.5;
      g.strokeStyle = `rgba(${r ? hot : core},${(0.8 - r * 0.25) * out})`; g.lineWidth = 2.5 - r;
      g.beginPath();
      for (let j = 0; j <= 48; j++) {
        const a = (j / 48) * Math.PI * 2 + spin, p = P(c0 + Math.cos(a) * R0, c1 + Math.sin(a) * R0, 0.03);
        if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
      }
      g.stroke();
      if (!lowQ) for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2 + spin, p = P(c0 + Math.cos(a) * R0, c1 + Math.sin(a) * R0, 0.03);
        g.fillStyle = `rgba(${hot},${out})`; g.beginPath(); g.arc(p[0], p[1], 2.5, 0, 7); g.fill();
      }
    }
    const shards = lowQ ? 6 : 14;
    for (let i = 0; i < shards; i++) {
      const a = (i / shards) * Math.PI * 2 + (still ? 0 : now / 220), r = A[2] * (2.2 * (1 - easeOut3(k)) + 0.25);
      const x = A[0] + Math.cos(a) * r, y = A[1] + Math.sin(a) * r * 0.55, h = A[2] * (0.1 + 0.05 * k);
      g.fillStyle = `rgba(${cols[i % cols.length]},${(0.5 + 0.5 * k) * out})`;
      g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.45, y); g.lineTo(x, y + h); g.lineTo(x - h * 0.45, y); g.closePath(); g.fill();
    }
    glow(g, A[0], A[1], A[2] * (0.3 + 1.1 * k), core, (0.4 + 0.5 * k) * out);
    glow(g, A[0], A[1], A[2] * (0.12 + 0.45 * k), "255,255,255", (0.6 + 0.4 * k) * out);
    g.globalCompositeOperation = "source-over";
  }
  // ---- ลำแสง ----
  if (t >= CH && fadeK > 0) {
    const front = REDUCED ? 1 : easeOut3(clamp01((t - CH) / (RE - CH)));
    const bx = lerp(ox, ex, front), by = lerp(oy, ey, front);
    const pulse = still ? 1 : 0.85 + 0.15 * Math.sin(now / 38);
    const wob = still ? 0 : Math.sin(now / 45) * 0.05;
    // ช่องที่ลำแสงผ่าน: พื้นไหม้เรือง
    for (const tl of e.tiles || []) {
      const d = (tl.x + 0.5 - ox) * v[0] + (tl.y + 0.5 - oy) * v[1];
      if (d > len * front + 0.1) continue;
      quad(g, tl.x, tl.y, 0.04); g.fillStyle = `rgba(${core},${0.32 * fadeK})`; g.fill();
    }
    g.globalCompositeOperation = "lighter";
    const slab = (w, z, col, a) => {
      const hw = w / 2;
      const p1 = P(ox + sx * hw, oy + sy * hw, z), p2 = P(bx + sx * hw, by + sy * hw, z), p3 = P(bx - sx * hw, by - sy * hw, z), p4 = P(ox - sx * hw, oy - sy * hw, z);
      g.fillStyle = `rgba(${col},${a})`; g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.lineTo(p4[0], p4[1]); g.closePath(); g.fill();
    };
    if (ray) {
      // รุ้ง: แถบสีเรียงขวางลำแสง + แกนขาวร้อน
      const bands = lowQ ? 3 : RAINBOW.length;
      if (!lowQ) slab(width + 1.2, Z, "255,160,120", 0.18 * fadeK);
      for (let i = 0; i < bands; i++) {
        const off = ((i + 0.5) / bands - 0.5) * width, hw = width / bands / 2 + 0.03;
        const col = RAINBOW[Math.floor(i * RAINBOW.length / bands)];
        const p1 = P(ox + sx * (off - hw), oy + sy * (off - hw), Z), p2 = P(bx + sx * (off - hw), by + sy * (off - hw), Z);
        const p3 = P(bx + sx * (off + hw), by + sy * (off + hw), Z), p4 = P(ox + sx * (off + hw), oy + sy * (off + hw), Z);
        g.fillStyle = `rgba(${col},${0.5 * fadeK * pulse})`; g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.lineTo(p4[0], p4[1]); g.closePath(); g.fill();
      }
      slab(width * 0.5 + wob, Z, hot, 0.6 * fadeK * pulse);
      slab(width * 0.18, Z, "255,255,255", 0.95 * fadeK);
    } else {
      if (!lowQ) slab(2.0 + wob, Z, core, 0.14 * fadeK);
      slab(1.25 + wob, Z, core, 0.32 * fadeK * pulse);
      slab(0.7 + wob, Z, core, 0.7 * fadeK * pulse);
      slab(0.32, Z, hot, 0.95 * fadeK);
      slab(0.12, Z, "255,255,255", fadeK);
    }
    const Bp = P(bx, by, Z);
    // หัวลำแสง/ปากลำแสง: แสงจ้า + แฉกเลนส์
    glow(g, Bp[0], Bp[1], Bp[2] * (ray ? 1.5 : 1.1) * pulse, hot, 0.9 * fadeK);
    glow(g, A[0], A[1], A[2] * 1.0 * pulse, "255,255,255", 0.85 * fadeK);
    if (!lowQ) {
      g.strokeStyle = `rgba(255,255,255,${0.75 * fadeK})`; g.lineWidth = 2;
      for (const [hx, hy, L] of [[Bp[0], Bp[1], Bp[2] * 1.6], [A[0], A[1], A[2] * 1.2]]) {
        g.beginPath(); g.moveTo(hx - L, hy); g.lineTo(hx + L, hy); g.moveTo(hx, hy - L * 0.6); g.lineTo(hx, hy + L * 0.6); g.stroke();
      }
    }
    // ปลายลำแสง (ถึงแล้ว): ระเบิดแสง + วงกระแทกบนพื้นซ้อนกัน
    if (front >= 0.999) {
      const k = clamp01((t - RE) / (HO + FA));
      glow(g, Bp[0], Bp[1], Bp[2] * (1.4 + k * 1.2), core, 0.6 * (1 - k));
      g.globalCompositeOperation = "source-over";
      for (let i = 0; i < (lowQ ? 1 : 3); i++) ring(g, ex - v[0] * 0.5, ey - v[1] * 0.5, clamp01(k * 1.6 - i * 0.18), i === 1 ? "255,255,255" : core, 0.3, 1.2 + width * 0.4, 6);
    }
    g.globalCompositeOperation = "source-over";
    if (!still) {
      // พลังงานไหลตามลำแสง + วงคริสตัลเต้น (Cross Shoot) + ประกายปลิวออกด้านข้าง
      g.lineCap = "round";
      const R = rngOf(13);
      const streaks = ray ? 18 : 12;
      for (let i = 0; i < streaks; i++) {
        const off = (R() - 0.5) * width * (ray ? 1.1 : 0.8), sp = ((now / 2.5 + R() * 1000) % 1000) / 1000;
        const u0 = sp * len * front, u1 = Math.min(len * front, u0 + 0.8);
        const q0 = P(ox + v[0] * u0 + sx * off, oy + v[1] * u0 + sy * off, Z + (R() - 0.5) * 0.4), q1 = P(ox + v[0] * u1 + sx * off, oy + v[1] * u1 + sy * off, Z);
        g.strokeStyle = `rgba(255,255,255,${0.75 * fadeK})`; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke();
      }
      if (!ray) {
        for (let i = 1; i <= len; i++) {
          const u = i - 0.5;
          if (u > len * front) break;
          const ph = (now / 240 + i * 0.35) % 1, C = [ox + v[0] * u, oy + v[1] * u];
          g.strokeStyle = `rgba(200,240,255,${0.85 * fadeK * (1 - ph)})`; g.lineWidth = 3;
          const r = 0.3 + ph * 0.45;
          g.beginPath();
          for (let j = 0; j <= 6; j++) {
            const a = (j / 6) * Math.PI * 2, p = P(C[0] + sx * Math.cos(a) * r, C[1] + sy * Math.cos(a) * r, Z + Math.sin(a) * r);
            if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
          }
          g.stroke();
        }
      }
      const RS = rngOf(Math.floor(now / 50));
      for (let i = 0; i < 14; i++) {
        const u = RS() * len * front, side = RS() < 0.5 ? -1 : 1, off = side * (width / 2 + RS() * 0.6);
        const C = P(ox + v[0] * u + sx * off, oy + v[1] * u + sy * off, Z + (RS() - 0.3) * 0.8);
        g.fillStyle = `rgba(${cols[i % cols.length]},${0.9 * fadeK})`;
        g.beginPath(); g.arc(C[0], C[1], 1.5 + RS() * 2.5, 0, 7); g.fill();
      }
    }
  }
  g.restore();
}

// วาดเอฟเฟกต์ของฮิคารุ 1 ชิ้น (drawFrame เรียกเมื่อ isHikaruFx(e.kind))
export function hikaruFx(g, e, now, lowQ) {
  if (e.kind === "hkHit") { hitFx(g, e, now, lowQ); return; }
  if (e.kind === "hkCross") { ultBeam(g, e, now, lowQ, false); return; }
  if (e.kind === "hkStriumRay") { ultBeam(g, e, now, lowQ, true); return; }
  const ms = HK_MS[e.kind];
  if (!ms || !e.to) return;
  const t = (now - e.t0) / ms;
  if (t <= 0 || t >= 1) return;
  if (e.kind === "hkBlack") blackFx(g, e, t, now, lowQ);
  else if (e.kind === "hkThunder") thunderFx(g, e, t, now, lowQ);
  else if (e.kind === "hkKemur") kemurFx(g, e, t, now, lowQ);
  else if (e.kind === "hkPandon") pandonFx(g, e, t, now, lowQ);
  else if (e.kind === "hkDoragory") doragoryFx(g, e, t, now, lowQ);
  else if (e.kind === "hkTiga") tigaFx(g, e, t, now, lowQ);
  else if (e.kind === "hkGinga") laneBeam(g, e, t, now, lowQ, false);
  else if (e.kind === "hkStrium") laneBeam(g, e, t, now, lowQ, true);
}
// เวลาที่ลำแสงท่าไม้ตายวิ่งถึงช่อง (ms นับจากเริ่ม fx) — เป้าในช่องนั้นสั่น
export function hkBeamHitMs(e, tile) {
  const v = DIRS[e.dir];
  if (!v) return HK_BEAM.reach;
  const n = Math.max(1, e.size | 0), [cx, cy] = mid(e.x, e.y, n), half = n / 2;
  const d = (tile.x + 0.5 - (cx + v[0] * half)) * v[0] + (tile.y + 0.5 - (cy + v[1] * half)) * v[1];
  const tl0 = Array.isArray(e.tiles) ? e.tiles : [], ox = cx + v[0] * half, oy = cy + v[1] * half;
  const far = tl0.reduce((m, c) => Math.max(m, (c.x + 0.5 - ox) * v[0] + (c.y + 0.5 - oy) * v[1] + 0.5), 0);
  const q = clamp01(d / Math.max(0.35, Math.min(Math.max(1, e.len | 0), far))); // ความยาวเดียวกับที่ ultBeam วาด
  // ผกผันของ easeOut3: เวลาที่ front = q
  return HK_BEAM.charge + (REDUCED ? 0 : (HK_BEAM.reach - HK_BEAM.charge) * (1 - Math.cbrt(1 - q)));
}

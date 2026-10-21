// ============================================================
//  เอฟเฟกต์บนกระดานของซึนาชิ ทาคุโตะ (characters/takuto.js · GRID_PLAN §7.16 · สัญญา .claude/plans/takuto-contract.md)
//  ธีม: ทาวเบิร์น = หุ่นยนต์ขาว/ดำ/แดง ตาเหลือง · ดาบเอเมอรูด = เขียวมรกตเรือง · ดาบแซฟไฟร์ = ฟ้าคราม
//       ดาบแห่งการพิพากษา = ขาวทองฝังเขียวฟ้า · ลำแสง/ระเบิด = แดงชมพู + ขาว
//  ดาบวาดเป็นผลึก (หน้าสว่าง/หน้ามืด + สันกลาง + กระบังดำฝังอัญมณี) ในพิกัดจอ — ข้างตัวทาวเบิร์นเสมอไม่ว่าหมุนกระดานแบบไหน
//
//  ตีปกติ (attackStyle — STYLE_MS / STYLE_HIT_P ใน boardDraw) · fx { x, y (มุมบนซ้ายผู้ตี), size, to, toSize, lane?, by }
//   takutoPunch     หมัดหุ่นยนต์: ง้างหมัด (ไฟแดงที่ข้อนิ้ว) → พุ่งพร้อมแขนกล + เส้นความเร็ว → กระแทก (ดาวแตก + คลื่นแดง + ประกาย) → หดกลับ
//   takutoEmerald   ฟันเฉียงเขียว: ดาบเอเมอรูดง้าง → เสี้ยวพระจันทร์เขียวกวาดผ่านเป้า → ผลึกมรกตแตก + รอยฟันค้าง
//   takutoSapphire  กวาดฟันฟ้าทั้งด้าน 3 ช่อง (fx.lane): พัดแสงฟ้าหน้าตัว ดาบเป็นรัศมีกวาดผ่านทีละช่อง → ผลึกน้ำแข็งกระเซ็นทุกช่อง
//   takutoDual      ฟันคู่ไขว้ทั้งด้าน: เขียวกวาดซ้าย→ขวา ฟ้ากวาดขวา→ซ้ายสวนกัน → กากบาทเขียวฟ้าทุกช่อง + คลื่นกระแทกฟ้าอมเขียว
//   takutoJudgment  ดาบแห่งการพิพากษา: ยกดาบใหญ่จากหลัง → หมุนเป็นจานแสงทองโค้งไปเป้า (≤ 4 ช่อง) → เสาแสงทอง + วงเวททอง → ดาบบินกลับ
//  เหตุการณ์ (socket "takutoFx" → takutoEventFx → { fx, look, shake, busy, later }):
//   tauburn (แปลงร่างเสร็จ: วงหกเหลี่ยมแดงใต้ตัว + เสาแสงแดงขาวปะทุ + เส้นพลังเกลียวรอบตัว 3×3 + คลื่นกระแทก)
//   summon (ดาบโผล่จากวงแสงข้างตัว แล้วลอยไปที่ประจำ) · merge (2 เล่มหมุนเข้าหากัน วาบ → ดาบแห่งการพิพากษา)
//   vanish (ดาบแตกเป็นละอองสีของดาบ) · heal (ละอองเขียวไหลเข้าตัว · big = เสาแสงเขียวใหญ่)
//   dash (พุ่งต้นตาเดิน: เงาซ้อน 3 ชั้น takutoGhosts + เส้นความเร็ว · takutoPose เลื่อนตัว)
//   flash (ดาบประกายแสง: ดาบคู่ไขว้ชาร์จ → ลำแสงตามแนว → ฟันกากบาทที่เป้า → สลับตำแหน่ง (วาบหาย/โผล่) → ปะทะ ≤ 1.6 วิ)
//   missile (ทาวววว มิสไซล์: ชาร์จที่อกแดง → ลำแสงแดงขาวหนา 8 ช่อง ถึงปลาย ≤ 1.8 วิ)
//   steal (ลูกแสงฟ้าลอยจากเป้าเข้าตัว) · blast (ฉันยังมองเห็นอยู่: แสงขาวรวมที่ตัว → ระเบิดวงกว้างแดงขาวถึงขอบรัศมี ≤ 2 วิ)
//  ค้างบนตัว (prop takutos ของ BoardCanvas · [{ id, x, y, size, emerald, sapphire, judgment, collapse }] จาก p.takuto):
//   takutoItems = ดาบลอยข้างตัว (เอเมอรูดซ้าย · แซฟไฟร์ขวา · ขยับขึ้นลงช้าๆ) หน้าตัว · ดาบแห่งการพิพากษาพาดหลังตัว · collapse = ออร่าแดงจางๆ
//   ดาบที่ฉากกำลังเล่น (summon/merge/ขว้างดาบ) ไม่วาดซ้ำ
//  lowQ = ตัดอนุภาค/ชั้นเรืองครึ่งหนึ่ง · ลดการเคลื่อนไหว = ของที่วนตลอดหยุดนิ่ง เอฟเฟกต์ครั้งเดียวยังเล่น
// ============================================================
import { P, depthOf, gEllipse, glow, quad, viewAxes } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ ----------
export const TAKUTO_MS = { takutoPunch: 950, takutoEmerald: 1000, takutoSapphire: 1100, takutoDual: 1250, takutoJudgment: 1600 };
export const TAKUTO_HIT_P = { takutoPunch: 0.42, takutoEmerald: 0.42, takutoSapphire: 0.46, takutoDual: 0.5, takutoJudgment: 0.56 };
//  ms นับจากเริ่มเหตุการณ์ — server พัก (skillBeat) flash 1.6 วิ · missile 1.8 วิ · blast 2.0 วิ ก่อนดาเมจลง: จังหวะปะทะในภาพต้องไม่ช้ากว่านั้น
export const TAKUTO_T = {
  dashMove: 260,
  flashCharge: 420, flashStreak: 760, flashCross: 1180, flashSwap: 1260, flashHit: 1520,
  missileFire: 1150, missileReach: 1700,
  blastBoom: 1300, blastHit: 1950,
};
const HEAL_BIG_MS = 2300;
export const TAKUTO_FX_DUR = {
  ...TAKUTO_MS,
  takutoTauburn: 2400, takutoSummon: 1600, takutoMerge: 1800, takutoVanish: 1000, takutoHeal: 1500,
  takutoDash: 700, takutoFlash: 2050, takutoMissile: 2900, takutoSteal: 1400, takutoBlast: 2750,
};
export const isTakutoFx = (kind) => typeof kind === "string" && (kind in TAKUTO_FX_DUR);
export const TAKUTO_EVENT_FX = {
  tauburn: "takutoTauburn", summon: "takutoSummon", merge: "takutoMerge", vanish: "takutoVanish", heal: "takutoHeal",
  dash: "takutoDash", flash: "takutoFlash", missile: "takutoMissile", steal: "takutoSteal", blast: "takutoBlast",
};
// เสียงของแต่ละเหตุการณ์ — เกมจริง server ส่งเอง (contract §5 engine.sfx) · ตารางนี้ใช้แค่หน้า dev (TakutoFxDev)
export const TAKUTO_EVENT_SFX = {
  tauburn: "takuto_transform", merge: "takuto_merge", vanish: "takuto_vanish", heal: "takuto_heal", dash: "takuto_dash",
  flash: "takuto_flash", missile: "takuto_missile", steal: "takuto_steal", blast: "takuto_blast",
};

// ---------- สี (r,g,b) ----------
const WHITE = "255,255,255", RED = "236,38,66", RED_D = "96,6,22", PINK = "255,92,148", HOT = "255,178,198", YEL = "255,230,96";
const EM = "60,232,140", EM_L = "196,255,222";
const SA = "70,158,255", SA_L = "206,236,255";
const GOLD = "255,212,104", GOLD_L = "255,247,214", GOLD_D = "176,118,30";
const TEAL = "120,246,226";
const PAL = {
  emerald: { hi: "226,255,238", lt: "128,244,178", md: "38,190,118", dk: "8,104,64", ed: "4,46,28", gl: EM, sp: EM_L },
  sapphire: { hi: "228,244,255", lt: "136,202,255", md: "52,132,240", dk: "16,58,170", ed: "6,22,78", gl: SA, sp: SA_L },
  judgment: { hi: "255,253,240", lt: "255,242,196", md: "246,206,112", dk: "186,134,44", ed: "84,52,8", gl: GOLD, sp: GOLD_L },
};

// ---------- คณิต ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeOut4 = (t) => 1 - Math.pow(1 - t, 4);
const easeIn2 = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1, u = t - 1; return 1 + c3 * u * u * u + c1 * u * u; };
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const env = (t, a, b, c, d) => (t <= a || t >= d ? 0 : t < b ? (t - a) / (b - a) : t <= c ? 1 : (d - t) / (d - c));
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const ptOf = (p) => ({ x: p.x, y: p.y });
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// จุดบนจอของหมาก (ตรงกับ boardDraw drawUnit: ตัวใหญ่ไม่มีรูป 4 ทิศ = หกเหลี่ยมขยาย K = 1 + (n − 1) × 0.6)
//  cx, cy = กลางตัว (ช่อง) · bx, by = พื้นกลางตัวบนจอ · hy = กลางหกเหลี่ยม · r = รัศมีหกเหลี่ยม (px)
function bodyAt(x, y, n = 1, hz = 0) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { cx, cy, bx, by, s, n, K, r: s * 0.4 * K, hy: by - s * 0.86 * K - hz * s * 0.85 };
}
// ความสูงอก (ช่อง) ของตัวขนาด n — ลำแสง/พัดดาบวิ่งที่ระดับนี้
const chestZ = (n) => 0.55 * (1 + (Math.max(1, n | 0) - 1) * 0.6);

// ลำแสงเรียว (จอ): a → b · ra/rb = ครึ่งความกว้าง px · layers = [[ตัวคูณ, rgb, alpha, lighter?]]
function taper(g, a, b, ra, rb, layers, k) {
  const vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy) || 1, nx = -vy / L, ny = vx / L;
  for (const [m, rgb, al, light] of layers) {
    g.globalCompositeOperation = light ? "lighter" : "source-over";
    g.fillStyle = rgba(rgb, al * k);
    g.beginPath();
    g.moveTo(a[0] + nx * ra * m, a[1] + ny * ra * m); g.lineTo(b[0] + nx * rb * m, b[1] + ny * rb * m);
    g.lineTo(b[0] - nx * rb * m, b[1] - ny * rb * m); g.lineTo(a[0] - nx * ra * m, a[1] - ny * ra * m); g.closePath(); g.fill();
    g.beginPath(); g.arc(b[0], b[1], rb * m, 0, TAU); g.fill();
    g.beginPath(); g.arc(a[0], a[1], ra * m, 0, TAU); g.fill();
  }
  g.globalCompositeOperation = "source-over";
}
// เสาแสงแนวตั้ง (พิกัดโลก cx, cy → สูง zTop) · w = ครึ่งความกว้างที่ฐาน (px) · ขอบนุ่ม (ไล่สีแนวนอน) · จางขึ้นไปด้านบน
function pillar(g, cx, cy, zTop, w, rgbO, rgbC, k, lowQ) {
  if (k <= 0.01 || w < 1) return;
  const a = P(cx, cy, 0), b = P(cx, cy, zTop), N = lowQ ? 6 : 14;
  g.save(); g.globalCompositeOperation = "lighter";
  const gr = g.createLinearGradient(a[0] - w, 0, a[0] + w, 0);
  gr.addColorStop(0, rgba(rgbO, 0)); gr.addColorStop(0.28, rgba(rgbO, 0.32 * k)); gr.addColorStop(0.44, rgba(rgbO, 0.6 * k));
  gr.addColorStop(0.5, rgba(rgbC, 0.95 * k)); gr.addColorStop(0.56, rgba(rgbO, 0.6 * k)); gr.addColorStop(0.72, rgba(rgbO, 0.32 * k)); gr.addColorStop(1, rgba(rgbO, 0));
  g.fillStyle = gr;
  for (let i = 0; i < N; i++) {
    const y0 = lerp(a[1], b[1], i / N), y1 = lerp(a[1], b[1], (i + 1) / N);
    g.globalAlpha = Math.pow(1 - i / N, 1.3);
    g.fillRect(a[0] - w, y1, w * 2, y0 - y1 + 0.5);
  }
  g.globalAlpha = 1;
  // ฐานเรืองบนพื้น
  g.save(); g.translate(a[0], a[1]); g.scale(1, 0.42); glow(g, 0, 0, w * 1.9, rgbO, 0.55 * k); glow(g, 0, 0, w * 0.8, rgbC, 0.6 * k); g.restore();
  g.restore();
}
// วงในอากาศ: จุด = c + A·cos·r + B·sin·r (พิกัดโลก)
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const P3 = (v) => P(v[0], v[1], v[2]);
function ring3(g, c, r, A, B, n = 36) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, p = P3(add3(add3(c, A, Math.cos(a) * r), B, Math.sin(a) * r));
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
}
// ประกายสี่แฉก (จอ)
function twinkle(g, x, y, r, a, rgb = WHITE) {
  if (a <= 0.01 || r <= 0.5) return;
  g.fillStyle = rgba(rgb, a);
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r * 0.22, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r * 0.22, y); g.quadraticCurveTo(x, y, x, y - r);
  g.moveTo(x - r * 0.7, y); g.quadraticCurveTo(x, y, x, y + r * 0.16); g.quadraticCurveTo(x, y, x + r * 0.7, y);
  g.quadraticCurveTo(x, y, x, y - r * 0.16); g.quadraticCurveTo(x, y, x - r * 0.7, y);
  g.fill();
}
// เส้นประกายกระจาย (จอ) · age 0..1
function sparks(g, x, y, R, age, seed, n, cols, lowQ, lw = 1.6) {
  if (age < 0 || age > 1) return;
  const N = lowQ ? Math.ceil(n / 2) : n, k = 1 - age;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < N; i++) {
    const a = hash01(seed + i) * TAU, sp = 0.45 + hash01(seed + i * 3.7) * 0.75, d0 = R * easeOut3(age) * sp, d1 = d0 * 0.55;
    g.strokeStyle = rgba(cols[i % cols.length], k); g.lineWidth = Math.max(1, lw * k);
    g.beginPath(); g.moveTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1 * 0.8); g.lineTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0 * 0.8 + age * age * R * 0.25); g.stroke();
  }
  g.restore();
}
// เศษผลึกเพชร (จอ) พุ่งออกแล้วตกตามแรงโน้มถ่วง · pal = PAL[...]
function shards(g, x, y, R, age, seed, n, pal, lowQ, size = 1) {
  if (age < 0 || age > 1) return;
  const N = lowQ ? Math.ceil(n / 2) : n, a0 = 1 - easeIn2(age);
  for (let i = 0; i < N; i++) {
    const a = hash01(seed + i * 1.3) * TAU, sp = 0.5 + hash01(seed + i * 5.1) * 0.8, d = R * easeOut3(age) * sp;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8 - R * 0.25 * sp * Math.sin(Math.PI * Math.min(1, age * 1.4)) + age * age * R * 0.55;
    const sz = R * (0.07 + 0.06 * hash01(seed + i * 7.7)) * (1 - age * 0.45) * size, rot = a + age * (hash01(seed + i) - 0.5) * 9;
    const c = Math.cos(rot), s = Math.sin(rot);
    g.beginPath();
    g.moveTo(px + c * sz * 1.4, py + s * sz * 1.4); g.lineTo(px - s * sz * 0.55, py + c * sz * 0.55);
    g.lineTo(px - c * sz * 0.9, py - s * sz * 0.9); g.lineTo(px + s * sz * 0.55, py - c * sz * 0.55); g.closePath();
    g.fillStyle = rgba(i % 3 ? pal.lt : pal.hi, a0); g.fill();
    g.strokeStyle = rgba(pal.dk, a0 * 0.8); g.lineWidth = 1; g.stroke();
  }
}
// วงกระแทกบนพื้น (โลก)
function groundRing(g, cx, cy, r, rgb, a, lw, z = 0.03) {
  if (a <= 0.01 || r <= 0.01) return;
  gEllipse(g, cx, cy, r, z, 44); g.strokeStyle = rgba(rgb, a); g.lineWidth = lw; g.stroke();
}
// ดาวแตก (หนามรอบจุด) — ปะทะหนัก
function impactStar(g, x, y, R, k, n, rgbA, rgbB, rot = 0) {
  if (k <= 0.01) return;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU, L = R * (i % 2 ? 0.62 : 1), w = R * 0.09;
    const c = Math.cos(a), s = Math.sin(a);
    g.beginPath(); g.moveTo(x - s * w, y + c * w); g.lineTo(x + c * L, y + s * L); g.lineTo(x + s * w, y - c * w); g.closePath();
    g.fillStyle = rgba(i % 2 ? rgbB : rgbA, k); g.fill();
  }
}

// =================================================================== ดาบ
//  x, y = กลางกระบัง (จอ) · ang = ทิศจากด้ามไปปลาย · L = ความยาวใบ (px) · o = { glow, big (ดาบใหญ่), white (เคลือบขาว 0..1) }
function drawSword(g, x, y, ang, L, pal, a, o = {}) {
  if (a <= 0.01 || L < 3) return;
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const pt = (u, v) => [x + dx * u * L + nx * v * L, y + dy * u * L + ny * v * L];
  const big = !!o.big;
  g.save(); g.globalAlpha *= clamp01(a); g.lineJoin = "round"; g.lineCap = "round";
  if (o.glow) {
    g.globalCompositeOperation = "lighter";
    const c = pt(0.5, 0);
    glow(g, c[0], c[1], L * 0.62, pal.gl, 0.32 * o.glow);
    const t = pt(0.97, 0);
    glow(g, t[0], t[1], L * 0.18, pal.sp, 0.45 * o.glow);
    g.globalCompositeOperation = "source-over";
  }
  const W0 = big ? 0.095 : 0.07, W1 = big ? 0.13 : 0.094, MID = big ? 0.55 : 0.62, B0 = 0.045;
  const poly = (pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
  // ใบดาบ: หน้าซ้ายสว่าง · หน้าขวามืด (ผลึก)
  const bl0 = pt(B0, -W0), bl1 = pt(MID, -W1), tip = pt(1, 0), br0 = pt(B0, W0), br1 = pt(MID, W1), rb = pt(B0, 0);
  poly([bl0, bl1, tip, rb]);
  let gr = g.createLinearGradient(rb[0], rb[1], tip[0], tip[1]);
  gr.addColorStop(0, rgba(pal.md, 1)); gr.addColorStop(0.55, rgba(pal.lt, 1)); gr.addColorStop(1, rgba(pal.hi, 1));
  g.fillStyle = gr; g.fill();
  poly([br0, br1, tip, rb]);
  gr = g.createLinearGradient(rb[0], rb[1], tip[0], tip[1]);
  gr.addColorStop(0, rgba(pal.dk, 1)); gr.addColorStop(0.6, rgba(pal.md, 1)); gr.addColorStop(1, rgba(pal.lt, 1));
  g.fillStyle = gr; g.fill();
  // เหลี่ยมผลึก + สัน
  g.strokeStyle = rgba(pal.hi, 0.55); g.lineWidth = Math.max(0.8, L * 0.008);
  g.beginPath(); g.moveTo(bl1[0], bl1[1]); g.lineTo(pt(MID + 0.12, 0)[0], pt(MID + 0.12, 0)[1]); g.lineTo(br1[0], br1[1]); g.stroke();
  poly([bl0, bl1, tip, br1, br0]); g.strokeStyle = rgba(pal.ed, 0.95); g.lineWidth = Math.max(1, L * (big ? 0.016 : 0.014)); g.stroke();
  g.strokeStyle = rgba(WHITE, 0.85); g.lineWidth = Math.max(0.8, L * 0.009);
  g.beginPath(); g.moveTo(...pt(B0 + 0.02, 0)); g.lineTo(...pt(0.96, 0)); g.stroke();
  // ดาบใหญ่: ฝังมรกต/ไพลินบนโคนใบ + ลายทอง
  if (big) {
    for (const [v, c] of [[-0.045, EM], [0.045, SA]]) {
      const m = pt(0.2, v), r = L * 0.03;
      g.beginPath(); g.moveTo(m[0] + dx * r * 1.6, m[1] + dy * r * 1.6); g.lineTo(m[0] + nx * r, m[1] + ny * r); g.lineTo(m[0] - dx * r * 1.6, m[1] - dy * r * 1.6); g.lineTo(m[0] - nx * r, m[1] - ny * r); g.closePath();
      g.fillStyle = rgba(c, 1); g.fill(); g.strokeStyle = rgba(WHITE, 0.8); g.lineWidth = 1; g.stroke();
    }
    g.strokeStyle = rgba(GOLD_D, 0.8); g.lineWidth = Math.max(1, L * 0.007);
    g.beginPath(); g.moveTo(...pt(0.3, -0.07)); g.lineTo(...pt(0.42, 0)); g.lineTo(...pt(0.3, 0.07)); g.stroke();
  }
  // กระบัง (ดำ ขอบสีดาบ ปลายงอนเข้าหาปลายดาบ) + อัญมณีกลาง
  const GW = big ? 0.3 : 0.22;
  poly([pt(-0.02, -GW * 0.68), pt(0.07, -GW), pt(0.055, -GW * 0.42), pt(0.055, GW * 0.42), pt(0.07, GW), pt(-0.02, GW * 0.68), pt(-0.04, 0)]);
  g.fillStyle = big ? rgba("70,52,20", 1) : "rgb(30,32,44)"; g.fill();
  g.strokeStyle = rgba(big ? GOLD : pal.md, 1); g.lineWidth = Math.max(1, L * 0.012); g.stroke();
  const gm = pt(0.012, 0), gr2 = L * (big ? 0.042 : 0.034);
  g.beginPath(); g.arc(gm[0], gm[1], gr2, 0, TAU); g.fillStyle = rgba(big ? YEL : pal.gl, 1); g.fill();
  g.beginPath(); g.arc(gm[0] - gr2 * 0.3, gm[1] - gr2 * 0.3, gr2 * 0.35, 0, TAU); g.fillStyle = rgba(WHITE, 0.9); g.fill();
  // ด้าม + หัวด้าม
  const gp0 = pt(-0.04, 0), gp1 = pt(-0.2, 0);
  g.strokeStyle = "rgb(24,24,32)"; g.lineWidth = Math.max(2, L * 0.05);
  g.beginPath(); g.moveTo(gp0[0], gp0[1]); g.lineTo(gp1[0], gp1[1]); g.stroke();
  g.strokeStyle = rgba(big ? GOLD : pal.md, 0.9); g.lineWidth = Math.max(1, L * 0.012);
  for (const u of [-0.08, -0.13, -0.18]) { g.beginPath(); g.moveTo(...pt(u, -0.022)); g.lineTo(...pt(u + 0.025, 0.022)); g.stroke(); }
  const pm = pt(-0.23, 0);
  g.beginPath(); g.arc(pm[0], pm[1], L * (big ? 0.04 : 0.032), 0, TAU); g.fillStyle = rgba(big ? GOLD : pal.md, 1); g.fill();
  g.strokeStyle = rgba(pal.ed, 1); g.lineWidth = 1; g.stroke();
  // เคลือบขาว (วาบตอนเรียก/แตก)
  if (o.white > 0) {
    g.globalCompositeOperation = "lighter";
    poly([bl0, bl1, tip, br1, br0]); g.fillStyle = rgba(WHITE, 0.85 * o.white); g.fill();
  }
  g.restore();
}

// ตำแหน่งดาบลอย (จอ) ของตัว A: เอเมอรูดซ้าย · แซฟไฟร์ขวา (ปลายชี้ขึ้น เอียงออกนิด) · ดาบแห่งการพิพากษาพาดหลัง
function swordSpot(A, kind, now) {
  const ph = kind === "sapphire" ? 1.7 : kind === "judgment" ? 3.1 : 0;
  const bob = REDUCED ? 0 : Math.sin(now / 640 + ph) * A.r * 0.07;
  if (kind === "judgment") return { x: A.bx - A.r * 0.42, y: A.hy + A.r * 0.62 + bob * 0.5, ang: -Math.PI / 2 + 0.42, L: A.r * 2.7 };
  const side = kind === "emerald" ? -1 : 1;
  return { x: A.bx + side * A.r * 1.34, y: A.hy + A.r * 0.6 + bob, ang: -Math.PI / 2 + side * 0.16, L: A.r * 1.6 };
}

// =================================================================== ตีปกติ
// ---------- หมัดหุ่นยนต์ ----------
function drawFist(g, x, y, ang, F, a, heat) {
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha *= clamp01(a); g.lineJoin = "round";
  if (heat > 0.01) { g.globalCompositeOperation = "lighter"; glow(g, F * 0.5, 0, F * 1.05, RED, 0.55 * heat); glow(g, F * 0.5, 0, F * 0.45, HOT, 0.6 * heat); g.globalCompositeOperation = "source-over"; }
  const rr = (x0, y0, w, h, r) => { g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + h, r); g.arcTo(x0 + w, y0 + h, x0, y0 + h, r); g.arcTo(x0, y0 + h, x0, y0, r); g.arcTo(x0, y0, x0 + w, y0, r); g.closePath(); };
  // ข้อมือแดง
  rr(-F * 0.7, -F * 0.3, F * 0.24, F * 0.6, F * 0.06); g.fillStyle = "rgb(198,24,48)"; g.fill(); g.strokeStyle = "rgb(16,16,22)"; g.lineWidth = Math.max(1, F * 0.06); g.stroke();
  // กำปั้น
  rr(-F * 0.5, -F * 0.42, F * 0.98, F * 0.84, F * 0.2);
  const gr = g.createLinearGradient(0, -F * 0.42, 0, F * 0.42);
  gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.6, "#dfe3ec"); gr.addColorStop(1, "#9ea6b8");
  g.fillStyle = gr; g.fill(); g.strokeStyle = "rgb(16,16,22)"; g.lineWidth = Math.max(1.2, F * 0.07); g.stroke();
  // นิ้ว (ร่องดำ) + ข้อนิ้วแดงร้อน
  g.lineWidth = Math.max(1, F * 0.045);
  for (const v of [-0.21, 0, 0.21]) { g.beginPath(); g.moveTo(F * 0.08, v * F); g.lineTo(F * 0.48, v * F); g.stroke(); }
  g.fillStyle = heat > 0.2 ? rgba(HOT, 0.4 + 0.6 * heat) : "rgb(40,40,52)";
  for (const v of [-0.315, -0.105, 0.105, 0.315]) { g.beginPath(); g.ellipse(F * 0.45, v * F, F * 0.05, F * 0.075, 0, 0, TAU); g.fill(); }
  // นิ้วโป้ง (เกราะแดง)
  rr(-F * 0.22, -F * 0.56, F * 0.42, F * 0.2, F * 0.08); g.fillStyle = "rgb(214,34,58)"; g.fill(); g.strokeStyle = "rgb(16,16,22)"; g.lineWidth = Math.max(1, F * 0.05); g.stroke();
  // เงาสะท้อน
  g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = Math.max(1, F * 0.04);
  g.beginPath(); g.moveTo(-F * 0.36, -F * 0.3); g.lineTo(F * 0.02, -F * 0.3); g.stroke();
  g.restore();
}
function punchFx(g, e, now, lowQ) {
  const D = TAKUTO_MS.takutoPunch, HIT = TAKUTO_HIT_P.takutoPunch, t = (now - e.t0) / D;
  if (t <= 0 || t >= 1) return;
  const to = okT(e.to) ? e.to : { x: e.x, y: e.y - 1 };
  const A = bodyAt(e.x, e.y, e.size), B = bodyAt(to.x, to.y, e.toSize);
  const ax = A.bx, ay = A.hy + A.r * 0.3, tx = B.bx, ty = B.hy + B.r * 0.1;
  let ux = tx - ax, uy = ty - ay; const dist = Math.hypot(ux, uy) || 1; ux /= dist; uy /= dist;
  const ang = Math.atan2(uy, ux), F = Math.max(A.s * 0.34, A.r * 0.48);
  const S = [ax + ux * A.r * 0.6, ay + uy * A.r * 0.6];
  const reach = Math.max(A.r * 0.7, dist - Math.min(B.r * 0.55, dist * 0.35) - A.r * 0.6);
  const Tp = [S[0] + ux * reach, S[1] + uy * reach];
  const W = 0.2, BACK = 0.62, RET = 0.92;
  let d, heat;
  if (t < W) { const k = easeOut3(t / W); d = -F * 0.55 * k; heat = k; }
  else if (t < HIT) { const k = easeIn2((t - W) / (HIT - W)); d = lerp(-F * 0.55, reach, k); heat = 1; }
  else if (t < BACK) { d = reach - F * 0.18 * Math.sin(Math.PI * (t - HIT) / (BACK - HIT)); heat = 1 - (t - HIT) / (BACK - HIT) * 0.7; }
  else { const k = easeInOut(clamp01((t - BACK) / (RET - BACK))); d = lerp(reach, 0, k); heat = 0.3 * (1 - k); }
  const fx = S[0] + ux * d, fy = S[1] + uy * d;
  const a = t < 0.06 ? t / 0.06 : t > RET ? clamp01((1 - t) / (1 - RET)) : 1;
  g.save(); g.lineCap = "round";
  // ไฟพลังรวมตอนง้าง
  if (t < W + 0.05) { g.globalCompositeOperation = "lighter"; glow(g, fx, fy, F * (0.8 + t * 3), RED, 0.45 * env(t, 0, 0.1, W, W + 0.05)); g.globalCompositeOperation = "source-over"; }
  // เส้นความเร็ว + เงาหมัดตอนพุ่ง
  if (t > W && t < HIT + 0.08 && !lowQ) {
    const k = env(t, W, W + 0.05, HIT, HIT + 0.08);
    g.globalCompositeOperation = "lighter";
    const nx = -uy, ny = ux;
    for (let i = 0; i < 9; i++) {
      const off = (hash01(i + 3) - 0.5) * F * 1.6, L = F * (1.2 + hash01(i + 9) * 1.8), back = F * (0.4 + hash01(i + 17) * 1.4);
      const x0 = fx - ux * back + nx * off, y0 = fy - uy * back + ny * off;
      g.strokeStyle = rgba(i % 3 ? WHITE : HOT, 0.75 * k); g.lineWidth = 1.4 + (i % 2);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - ux * L, y0 - uy * L); g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    for (let j = 1; j <= 2; j++) drawFist(g, fx - ux * F * 0.6 * j, fy - uy * F * 0.6 * j, ang, F, a * (0.32 / j), 0);
  }
  // แขนกล (ด้านหลังหมัด)
  const ex = fx - ux * F * 0.62, ey = fy - uy * F * 0.62;
  if (Math.hypot(ex - S[0], ey - S[1]) > 2) {
    g.globalAlpha = a;
    g.strokeStyle = "rgb(20,20,28)"; g.lineWidth = F * 0.52; g.beginPath(); g.moveTo(S[0], S[1]); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = "rgb(110,116,134)"; g.lineWidth = F * 0.32; g.stroke();
    g.strokeStyle = "rgb(214,34,58)"; g.lineWidth = F * 0.09; g.stroke();
    g.globalAlpha = 1;
  }
  drawFist(g, fx, fy, ang, F, a, heat);
  // ปะทะ
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT), cx = Tp[0] + ux * F * 0.5, cy = Tp[1] + uy * F * 0.5;
    g.globalCompositeOperation = "lighter";
    if (q < 0.3) glow(g, cx, cy, F * 2.6 * (0.6 + q), WHITE, 0.95 * (1 - q / 0.3));
    impactStar(g, cx, cy, F * (1.1 + 1.6 * easeOut3(q)), 1 - q, 12, WHITE, RED, ang + 0.2);
    g.save(); g.translate(cx, cy); g.scale(1, 0.62);
    for (let j = 0; j < (lowQ ? 1 : 2); j++) {
      const qq = clamp01(q * 1.25 - j * 0.22);
      if (qq <= 0 || qq >= 1) continue;
      g.beginPath(); g.arc(0, 0, F * (0.6 + 2.6 * easeOut3(qq)), 0, TAU); g.strokeStyle = rgba(j ? PINK : WHITE, 0.9 * (1 - qq)); g.lineWidth = 5 * (1 - qq) + 1; g.stroke();
    }
    g.restore();
    groundRing(g, B.cx, B.cy, 0.25 + 0.95 * B.n * easeOut3(q), RED, 0.8 * (1 - q), 3 * (1 - q) + 1);
    g.globalCompositeOperation = "source-over";
    sparks(g, cx, cy, F * 2.6, q, 71, 16, [WHITE, HOT, YEL], lowQ, 2.2);
  }
  g.restore();
}

// ---------- เสี้ยวฟัน (จอ): แถบโค้งรอบจุดหมุน pv รัศมี R จากมุม at → ah · ความหนาเพิ่มเข้าหาหัว ----------
function arcSlash(g, pv, R, at, ah, w, pal, k) {
  if (k <= 0.01 || Math.abs(ah - at) < 0.01) return;
  const N = 26, outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, a = at + (ah - at) * u, th = w * Math.pow(u, 1.1) * Math.min(1, (1 - u) * 9 + 0.25);
    outer.push([pv[0] + Math.cos(a) * R, pv[1] + Math.sin(a) * R]);
    inner.push([pv[0] + Math.cos(a) * (R - th), pv[1] + Math.sin(a) * (R - th)]);
  }
  const band = (grow) => {
    g.beginPath();
    outer.forEach((p, i) => { const q = [pv[0] + (p[0] - pv[0]) * (1 + grow), pv[1] + (p[1] - pv[1]) * (1 + grow)]; if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    for (let i = inner.length - 1; i >= 0; i--) { const p = inner[i]; g.lineTo(pv[0] + (p[0] - pv[0]) * (1 - grow), pv[1] + (p[1] - pv[1]) * (1 - grow)); }
    g.closePath();
  };
  g.save(); g.globalCompositeOperation = "lighter";
  band(0.07); g.fillStyle = rgba(pal.gl, 0.28 * k); g.fill();
  band(0); g.fillStyle = rgba(pal.lt, 0.72 * k); g.fill();
  // แกนขาวตามขอบนอก
  g.beginPath(); outer.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.strokeStyle = rgba(WHITE, 0.95 * k); g.lineWidth = Math.max(1.5, w * 0.16); g.stroke();
  g.restore();
}
// ---------- ฟันเฉียงเขียว (เอเมอรูด) ----------
function emeraldFx(g, e, now, lowQ) {
  const D = TAKUTO_MS.takutoEmerald, HIT = TAKUTO_HIT_P.takutoEmerald, t = (now - e.t0) / D;
  if (t <= 0 || t >= 1) return;
  const to = okT(e.to) ? e.to : { x: e.x, y: e.y - 1 };
  const A = bodyAt(e.x, e.y, e.size), B = bodyAt(to.x, to.y, e.toSize);
  const c = [B.bx, B.hy + B.r * 0.15], sgn = B.bx >= A.bx ? 1 : -1;
  const R = Math.max(B.r * 2.5, A.r * 1.5);
  const pv = [c[0] - sgn * R * 0.72, c[1] - R * 0.78], Rs = Math.hypot(c[0] - pv[0], c[1] - pv[1]);
  const base = Math.atan2(c[1] - pv[1], c[0] - pv[0]), a0 = base - sgn * 1.25, a1 = base + sgn * 1.15;
  const W = 0.22, END = HIT + 0.05;
  const qh = t < W ? 0 : t < END ? easeInOut((t - W) / (END - W)) : 1;
  const qt = t < END ? Math.max(0, qh - 0.55) : clamp01(0.45 + (t - END) / 0.22);
  const ah = a0 + (a1 - a0) * qh, at = a0 + (a1 - a0) * qt;
  const pal = PAL.emerald;
  g.save();
  // ดาบ: ง้าง (หมุนถอย) → กวาดตามหัวเสี้ยว → จางหลังปะทะ
  const swA = t < 0.05 ? t / 0.05 : t < END + 0.12 ? 1 : clamp01(1 - (t - END - 0.12) / 0.14);
  const sa = t < W ? a0 - sgn * 0.3 * easeOut3(t / W) : ah;
  const hilt = [pv[0] + Math.cos(sa) * Rs * 0.38, pv[1] + Math.sin(sa) * Rs * 0.38];
  if (t < W) {
    // ประกายที่ปลายดาบตอนง้าง
    const tp = [pv[0] + Math.cos(sa) * Rs * 1.05, pv[1] + Math.sin(sa) * Rs * 1.05];
    g.globalCompositeOperation = "lighter";
    glow(g, tp[0], tp[1], Rs * 0.25, EM, 0.6 * (t / W));
    twinkle(g, tp[0], tp[1], Rs * 0.22 * (t / W), 0.95);
    g.globalCompositeOperation = "source-over";
  }
  if (t >= W) arcSlash(g, pv, Rs * 1.04, at, ah, Rs * 0.36, pal, t < END ? 1 : clamp01(1 - (t - END) / 0.3));
  drawSword(g, hilt[0], hilt[1], sa, Rs * 0.7, pal, swA, { glow: 1 });
  // ปะทะ: วาบเขียว · กากบาทประกาย · ผลึกมรกตแตก · รอยฟันค้าง
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT);
    g.globalCompositeOperation = "lighter";
    if (q < 0.3) glow(g, c[0], c[1], R * 0.9, EM, 0.85 * (1 - q / 0.3));
    if (q < 0.45) { twinkle(g, c[0], c[1], R * (0.5 + q), 1 - q / 0.45); twinkle(g, c[0], c[1], R * 0.4 * (1 + q), 0.8 * (1 - q / 0.45), EM_L); }
    // รอยฟันค้าง (เส้นเฉียงผ่านเป้า)
    if (q < 0.75) {
      const k = 1 - q / 0.75, dx = Math.cos(base + sgn * Math.PI / 2), dy = Math.sin(base + sgn * Math.PI / 2);
      g.strokeStyle = rgba(EM_L, 0.9 * k); g.lineWidth = 3 * k + 1;
      g.beginPath(); g.moveTo(c[0] - dx * R * 0.9, c[1] - dy * R * 0.9); g.lineTo(c[0] + dx * R * 0.9, c[1] + dy * R * 0.9); g.stroke();
    }
    groundRing(g, B.cx, B.cy, 0.2 + 0.8 * B.n * easeOut3(q), EM, 0.85 * (1 - q), 2.5);
    g.globalCompositeOperation = "source-over";
    shards(g, c[0], c[1], R * 1.1, q, 23, 14, pal, lowQ);
    sparks(g, c[0], c[1], R * 1.2, q, 41, 10, [EM_L, WHITE], lowQ);
  }
  g.restore();
}

// ---------- พัดดาบหน้าตัว (แซฟไฟร์ / คู่) — พิกัดโลกระดับอก ----------
//  แกนหลัก f = ทิศจากกลางตัวไปกลางแนว · ช่องในแนวมีมุม th (atan ของระยะตั้งฉาก/ระยะหน้า)
function laneFrame(e) {
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2;
  const lane = Array.isArray(e.lane) ? e.lane.filter(okT).map(ptOf) : [];
  const to = okT(e.to) ? e.to : { x: e.x, y: e.y - 1 }, tn = Math.max(1, e.toSize | 0);
  const tiles = lane.length ? lane : [{ x: to.x + Math.floor((tn - 1) / 2), y: to.y + Math.floor((tn - 1) / 2) }];
  let mx = 0, my = 0;
  for (const t of tiles) { mx += t.x + 0.5; my += t.y + 0.5; }
  mx /= tiles.length; my /= tiles.length;
  let fx = mx - cx, fy = my - cy;
  if (Math.abs(fx) >= Math.abs(fy)) { fx = Math.sign(fx) || 1; fy = 0; } else { fy = Math.sign(fy) || 1; fx = 0; }
  const sx = -fy, sy = fx;
  const R = Math.max(n / 2 + 0.3, (mx - cx) * fx + (my - cy) * fy);
  const list = tiles.map((t) => {
    const ox = t.x + 0.5 - cx, oy = t.y + 0.5 - cy;
    return { x: t.x, y: t.y, th: Math.atan2(ox * sx + oy * sy, Math.max(0.3, ox * fx + oy * fy)) };
  }).sort((a, b) => a.th - b.th);
  const thMax = Math.max(0.2, ...list.map((t) => Math.abs(t.th)));
  return { n, cx, cy, f: [fx, fy], s: [sx, sy], R, tiles: list, thMax, z: chestZ(n) * 1.3, tilt: 0 };
}
//  F.tilt = เอียงระนาบพัด (ด้านหนึ่งต่ำ อีกด้านสูง) — ดาบคู่: เขียว +1 ฟ้า −1 = กากบาท
const fanPt = (F, th, r, z = F.z) => P(F.cx + (F.f[0] * Math.cos(th) + F.s[0] * Math.sin(th)) * r, F.cy + (F.f[1] * Math.cos(th) + F.s[1] * Math.sin(th)) * r, z + (F.tilt || 0) * Math.sin(th) * r * 0.42);
// แถบพัดจากมุม a → b (หัว = b) รัศมี r0..r1 ที่ความสูง z · ความสว่างเพิ่มเข้าหาหัว
function fanBand(g, F, a, b, r0, r1, z, pal, k, lowQ) {
  if (k <= 0.01 || Math.abs(b - a) < 0.005) return;
  const N = lowQ ? 8 : 16;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, th0 = a + (b - a) * u0, th1 = a + (b - a) * u1, al = Math.pow(u1, 1.4);
    const p0 = fanPt(F, th0, r1, z + 0.12 * u0), p1 = fanPt(F, th1, r1, z + 0.12 * u1), q1 = fanPt(F, th1, r0, z), q0 = fanPt(F, th0, r0, z);
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(q1[0], q1[1]); g.lineTo(q0[0], q0[1]); g.closePath();
    g.fillStyle = rgba(pal.gl, 0.5 * al * k); g.fill();
  }
  // เส้นแสงตามขอบ (ทางปลายดาบ) 3 เส้น
  for (const [rr, rgb, lw, al] of [[r1, WHITE, 2.6, 1], [r1 - 0.18, pal.sp, 1.6, 0.8], [r1 - 0.45, pal.lt, 1.2, 0.55]]) {
    if (lowQ && rr !== r1) continue;
    g.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N, p = fanPt(F, a + (b - a) * u, rr, z + 0.12 * u); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    g.strokeStyle = rgba(rgb, al * k); g.lineWidth = lw; g.stroke();
  }
  g.restore();
}
// ดาบเป็นรัศมีของพัด (ด้ามที่ขอบตัว · ปลายเลยขอบนอก)
function fanSword(g, F, th, r1, z, pal, a) {
  const h = fanPt(F, th, F.n / 2 - 0.05, z), tp = fanPt(F, th, r1 + 0.22, z + 0.06);
  const L = Math.hypot(tp[0] - h[0], tp[1] - h[1]);
  if (L < 4) return;
  drawSword(g, h[0], h[1], Math.atan2(tp[1] - h[1], tp[0] - h[0]), L, pal, a, { glow: 0.9 });
}
// ปะทะต่อช่องของพัด
function fanHit(g, x, y, age, pal, seed, lowQ, cross = false) {
  if (age < 0 || age > 1) return;
  const [px, py, ps] = P(x + 0.5, y + 0.5, 0.55), k = 1 - age;
  g.save(); g.globalCompositeOperation = "lighter";
  if (age < 0.3) glow(g, px, py, ps * 1.0, pal.gl, 0.9 * (1 - age / 0.3));
  if (!cross && age < 0.5) {
    const kk = 1 - age / 0.5, L = ps * 0.7;
    g.strokeStyle = rgba(pal.sp, 0.95 * kk); g.lineWidth = 5 * kk + 1;
    g.beginPath(); g.moveTo(px - L, py + L * 0.25); g.lineTo(px + L, py - L * 0.25); g.stroke();
    g.strokeStyle = rgba(WHITE, kk); g.lineWidth = 1.6; g.stroke();
  }
  if (cross && age < 0.6) {
    const kk = 1 - age / 0.6, L = ps * 0.62 * (0.7 + 0.5 * easeOut3(Math.min(1, age * 3)));
    for (const [a, rgb] of [[Math.PI / 4, EM_L], [-Math.PI / 4, SA_L]]) {
      g.strokeStyle = rgba(rgb, 0.95 * kk); g.lineWidth = 4 * kk + 1;
      g.beginPath(); g.moveTo(px - Math.cos(a) * L, py - Math.sin(a) * L); g.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); g.stroke();
      g.strokeStyle = rgba(WHITE, kk); g.lineWidth = 1.5; g.stroke();
    }
  }
  groundRing(g, x + 0.5, y + 0.5, 0.15 + 0.4 * easeOut3(age), pal.gl, 0.85 * k, 2);
  g.restore();
  shards(g, px, py, ps * 1.0, age, seed, 9, pal, lowQ, 0.9);
}
function sapphireFx(g, e, now, lowQ, dual) {
  const kind = dual ? "takutoDual" : "takutoSapphire";
  const D = TAKUTO_MS[kind], HIT = TAKUTO_HIT_P[kind], t = (now - e.t0) / D;
  if (t <= 0 || t >= 1) return;
  const F = laneFrame(e), W = 0.2;
  const r0 = F.n / 2 + 0.05, r1 = Math.max(F.R + 0.75, r0 + 0.9);
  const As = -(F.thMax + 0.14) - 0.22, Ae = F.thMax + 0.14;
  const u = t < W ? 0 : t < HIT ? (t - W) / (HIT - W) : 1;
  const ease = (v) => v * v * (3 - 2 * v);
  const head = As + (Ae - As) * ease(u);
  const tail = t < HIT ? Math.max(As, head - 1.3) : lerp(Math.max(As, Ae - 1.3), Ae, clamp01((t - HIT) / 0.22));
  const fade = t < HIT + 0.1 ? 1 : clamp01(1 - (t - HIT - 0.1) / 0.32);
  const swA = t < 0.06 ? t / 0.06 : t < HIT + 0.12 ? 1 : clamp01(1 - (t - HIT - 0.12) / 0.16);
  const mirror = (th) => -th;
  g.save();
  // ง้าง: ประกายข้างตัว
  if (t < W) {
    const k = t / W;
    for (const [pal, th, tl] of dual ? [[PAL.emerald, As - 0.2, 1], [PAL.sapphire, mirror(As - 0.2), -1]] : [[PAL.sapphire, As - 0.2, -0.8]]) {
      F.tilt = tl;
      const tp = fanPt(F, th, r1 + 0.2, F.z);
      g.globalCompositeOperation = "lighter"; glow(g, tp[0], tp[1], tp[2] * 0.45, pal.gl, 0.7 * k); twinkle(g, tp[0], tp[1], tp[2] * 0.4 * k, 0.9);
      g.globalCompositeOperation = "source-over";
      fanSword(g, F, th - 0.15 * (1 - k), r1, F.z, pal, k);
    }
  } else if (!dual) {
    F.tilt = -0.8;
    fanBand(g, F, tail, head, r0, r1, F.z, PAL.sapphire, fade, lowQ);
    fanSword(g, F, head, r1, F.z, PAL.sapphire, swA);
  } else {
    // คู่: เขียวกวาด − → + (ต่ำขึ้นสูง) · ฟ้ากวาด + → − (ต่ำขึ้นสูงอีกด้าน) — สองระนาบไขว้เป็นกากบาท
    F.tilt = 1;
    fanBand(g, F, tail, head, r0, r1, F.z, PAL.emerald, fade, lowQ);
    fanSword(g, F, head, r1, F.z, PAL.emerald, swA);
    F.tilt = -1;
    fanBand(g, F, mirror(tail), mirror(head), r0, r1 - 0.08, F.z, PAL.sapphire, fade, lowQ);
    fanSword(g, F, mirror(head), r1 - 0.08, F.z, PAL.sapphire, swA);
    F.tilt = 0;
  }
  // ปะทะทีละช่องเมื่อหัวพัดผ่าน (คู่ = ตอนเส้นทั้งสองไขว้ครบ = HIT)
  F.tiles.forEach((tl, i) => {
    const uh = clamp01((tl.th - As) / (Ae - As));
    // ease⁻¹ แบบประมาณ (หาเวลาที่หัวถึงมุมนี้)
    let lo = 0, hi = 1;
    for (let j = 0; j < 14; j++) { const m = (lo + hi) / 2; if (ease(m) < uh) lo = m; else hi = m; }
    const tHit = dual ? HIT : W + (HIT - W) * lo;
    fanHit(g, tl.x, tl.y, (t - tHit) / 0.42, dual ? PAL.emerald : PAL.sapphire, 31 + i * 9, lowQ, dual);
  });
  // คู่: คลื่นกระแทกฟ้าอมเขียวกลางแนว
  if (dual && t >= HIT) {
    const q = clamp01((t - HIT) / 0.4), mid = F.tiles[Math.floor(F.tiles.length / 2)];
    if (q < 1 && mid) {
      g.save(); g.globalCompositeOperation = "lighter";
      groundRing(g, mid.x + 0.5, mid.y + 0.5, 0.3 + 1.6 * easeOut3(q), TEAL, 0.9 * (1 - q), 3.5 * (1 - q) + 1);
      const [px, py, ps] = P(mid.x + 0.5, mid.y + 0.5, 0.6);
      if (q < 0.35) glow(g, px, py, ps * 1.4, TEAL, 0.7 * (1 - q / 0.35));
      g.restore();
    }
  }
  g.restore();
}

// ---------- ดาบแห่งการพิพากษา (ขว้างหมุน) ----------
const J_RISE = 0.16, J_STUCK = 0.74, J_BACK = 0.97;
function bez(p0, pc, p1, u) { const v = 1 - u; return [v * v * p0[0] + 2 * v * u * pc[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * pc[1] + u * u * p1[1]]; }
function judgmentFx(g, e, now, lowQ) {
  const D = TAKUTO_MS.takutoJudgment, HIT = TAKUTO_HIT_P.takutoJudgment, t = (now - e.t0) / D;
  if (t <= 0 || t >= 1) return;
  const to = okT(e.to) ? e.to : { x: e.x, y: e.y - 1 };
  const A = bodyAt(e.x, e.y, e.size), B = bodyAt(to.x, to.y, e.toSize);
  const rest = swordSpot(A, "judgment", now), L = rest.L * 0.82, pal = PAL.judgment;
  const top = [A.bx, A.hy - A.r * 1.7], aim = [B.bx, B.hy - B.r * 0.1];
  const dist = Math.hypot(aim[0] - top[0], aim[1] - top[1]);
  const ctrl = [(top[0] + aim[0]) / 2, Math.min(top[1], aim[1]) - dist * 0.32 - A.r * 0.4];
  const restMid = [rest.x + Math.cos(rest.ang) * rest.L * 0.45, rest.y + Math.sin(rest.ang) * rest.L * 0.45];
  // จุดกลางดาบ + มุมหมุน
  let C, rot, Ls = L, spin = 0;
  if (t < J_RISE) {
    const k = easeInOut(t / J_RISE);
    C = [lerp(restMid[0], top[0], k), lerp(restMid[1], top[1], k)]; rot = lerp(rest.ang, rest.ang + TAU * 0.6, easeIn2(t / J_RISE)); Ls = lerp(rest.L, L, k); spin = k;
  } else if (t < HIT) {
    const u = Math.pow((t - J_RISE) / (HIT - J_RISE), 1.35);
    C = bez(top, ctrl, aim, u); rot = rest.ang + TAU * 0.6 + (t - J_RISE) * D / 1000 * 26; spin = 1;
  } else if (t < J_STUCK) {
    C = [aim[0], aim[1] - L * 0.12 * (1 - easeOut4(clamp01((t - HIT) / 0.05)))]; rot = Math.PI / 2; spin = 0;
  } else {
    const u = easeInOut(clamp01((t - J_STUCK) / (J_BACK - J_STUCK)));
    const back = [(aim[0] + restMid[0]) / 2, Math.min(aim[1], restMid[1]) - dist * 0.22 - A.r * 0.3];
    C = bez(aim, back, restMid, u); rot = lerp(Math.PI / 2, rest.ang + TAU * 2, u); Ls = lerp(L, rest.L, u); spin = Math.sin(Math.PI * u);
  }
  const hiltOf = (c, a, l) => [c[0] - Math.cos(a) * l * 0.42, c[1] - Math.sin(a) * l * 0.42];
  g.save();
  // ทางบิน: ประกายทองโปรยตาม
  if (t > J_RISE && t < HIT + 0.05 && !lowQ) {
    g.globalCompositeOperation = "lighter";
    for (let j = 1; j <= 12; j++) {
      const tt = t - j * 0.012;
      if (tt < J_RISE) break;
      const p = bez(top, ctrl, aim, Math.pow(Math.min(1, (tt - J_RISE) / (HIT - J_RISE)), 1.35)), k = (1 - j / 13) * (t < HIT ? 1 : 1 - (t - HIT) / 0.05);
      twinkle(g, p[0] + (hash01(j) - 0.5) * L * 0.3, p[1] + (hash01(j + 4) - 0.5) * L * 0.3, L * 0.07 * k, 0.9 * k, j % 3 ? GOLD_L : (j % 2 ? EM_L : SA_L));
    }
    g.globalCompositeOperation = "source-over";
  }
  // จานแสงหมุน (ภาพเบลอ)
  if (spin > 0.05) {
    g.globalCompositeOperation = "lighter";
    glow(g, C[0], C[1], Ls * 0.62, GOLD, 0.35 * spin);
    g.beginPath(); g.ellipse(C[0], C[1], Ls * 0.55, Ls * 0.55, 0, 0, TAU); g.strokeStyle = rgba(GOLD_L, 0.45 * spin); g.lineWidth = 2; g.stroke();
    if (!lowQ) for (let j = 1; j <= 3; j++) { const h = hiltOf(C, rot - j * 0.32, Ls); drawSword(g, h[0], h[1], rot - j * 0.32, Ls, pal, 0.22 * spin / j, { big: true }); }
    g.globalCompositeOperation = "source-over";
  }
  const h = hiltOf(C, rot, Ls);
  drawSword(g, h[0], h[1], rot, Ls, pal, t > J_BACK ? clamp01(1 - (t - J_BACK) / (1 - J_BACK)) * 0.6 + 0.4 : 1, { big: true, glow: 1 });
  // ปะทะ: เสาแสงทอง + วงเวททอง + คลื่นกระแทก + รัศมี + ประกายเขียวฟ้า
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT), T = D * (1 - HIT);
    const pk = env(q, 0, 0.03, 0.3, 0.62);
    if (pk > 0) pillar(g, B.cx, B.cy, 8, B.s * 0.55 * Math.sqrt(B.n) * (0.9 + 0.1 * Math.sin(now / 40)), GOLD, GOLD_L, pk, lowQ);
    g.save(); g.globalCompositeOperation = "lighter";
    const sk = env(q, 0, 0.05, 0.55, 0.9), rr = 0.62 * B.n + 0.25;
    if (sk > 0) {
      const rt = (REDUCED ? 0 : now / 900);
      groundRing(g, B.cx, B.cy, rr, GOLD, 0.9 * sk, 2.4);
      groundRing(g, B.cx, B.cy, rr * 0.78, GOLD_L, 0.7 * sk, 1.3);
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = rt + (i / 16) * TAU, p0 = P(B.cx + Math.cos(a) * rr * 0.8, B.cy + Math.sin(a) * rr * 0.8, 0.03), p1 = P(B.cx + Math.cos(a) * rr * (i % 2 ? 0.92 : 1), B.cy + Math.sin(a) * rr * (i % 2 ? 0.92 : 1), 0.03);
        g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
      }
      g.strokeStyle = rgba(GOLD_L, 0.85 * sk); g.lineWidth = 1.4; g.stroke();
    }
    for (let j = 0; j < (lowQ ? 1 : 2); j++) {
      const qq = clamp01((q * T / 520) - j * 0.2);
      if (qq > 0 && qq < 1) groundRing(g, B.cx, B.cy, 0.3 + 2.4 * B.n * easeOut3(qq) * 0.6, j ? GOLD : WHITE, 0.9 * (1 - qq), 4 * (1 - qq) + 1);
    }
    const qf = clamp01(q * T / 300);
    if (qf < 1) {
      glow(g, aim[0], aim[1], B.r * 3.2, GOLD_L, 0.9 * (1 - qf));
      impactStar(g, aim[0], aim[1], B.r * (1.6 + 2.2 * easeOut3(qf)), 0.8 * (1 - qf), 16, GOLD_L, GOLD, now / 600);
    }
    g.restore();
    sparks(g, aim[0], aim[1], B.r * 3, clamp01(q * T / 700), 91, 18, [EM_L, SA_L, GOLD_L, WHITE], lowQ, 2);
  }
  g.restore();
}

// =================================================================== เหตุการณ์
// ---------- แปลงร่างเสร็จ ----------
function tauburnFx(g, e, t, now, lowQ) {
  const D = TAKUTO_FX_DUR.takutoTauburn, q = t / D, n = Math.max(1, e.size | 0);
  const A = bodyAt(e.x, e.y, n), cx = A.cx, cy = A.cy;
  g.save(); g.lineCap = "round";
  // วงหกเหลี่ยมแดงใต้ตัว (หมุน)
  const sk = env(q, 0, 0.08, 0.6, 0.92), rot = (REDUCED ? 0 : now / 1400);
  if (sk > 0) {
    g.globalCompositeOperation = "lighter";
    const R = n * 0.92 * (0.6 + 0.4 * easeOut3(Math.min(1, q * 6)));
    for (const [rr, rgb, lw] of [[R, RED, 3], [R * 0.86, PINK, 1.4], [R * 1.12, RED, 1.2]]) groundRing(g, cx, cy, rr, rgb, 0.9 * sk, lw);
    for (const off of [0, Math.PI / 6]) {
      g.beginPath();
      for (let i = 0; i <= 6; i++) { const a = rot * (off ? -1 : 1) + off + (i / 6) * TAU, p = P(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, 0.03); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
      g.strokeStyle = rgba(off ? HOT : RED, 0.85 * sk); g.lineWidth = 1.8; g.stroke();
    }
    // ลายวงจร (เส้นตรงจากวงออกไป)
    if (!lowQ) {
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + 0.13, p0 = P(cx + Math.cos(a) * R * 1.14, cy + Math.sin(a) * R * 1.14, 0.03), p1 = P(cx + Math.cos(a) * R * (1.24 + 0.06 * (i % 3)), cy + Math.sin(a) * R * (1.24 + 0.06 * (i % 3)), 0.03);
        g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
      }
      g.strokeStyle = rgba(PINK, 0.7 * sk); g.lineWidth = 1.2; g.stroke();
    }
  }
  // เสาแสงปะทุ
  const pk = env(q, 0, 0.04, 0.22, 0.55);
  if (pk > 0) pillar(g, cx, cy, 11, A.s * n * 0.36 * (1 + 0.08 * Math.sin(now / 35)), RED, HOT, pk, lowQ);
  g.globalCompositeOperation = "lighter";
  if (q < 0.16) { glow(g, A.bx, A.hy, A.r * 2.6, WHITE, 0.75 * (1 - q / 0.16)); glow(g, A.bx, A.hy, A.r * 1.4, HOT, 0.5 * (1 - q / 0.16)); }
  // เส้นพลังเกลียวขึ้นรอบตัว
  const NH = lowQ ? 3 : 6, H = 4.6;
  for (let k = 0; k < NH; k++) {
    const head = ((q - k * 0.025) / 0.55) * (H + 1.2);
    if (head <= 0 || head > H + 1.2) continue;
    const a0 = (k / NH) * TAU, fade = q < 0.55 ? 1 : 1 - (q - 0.55) / 0.3;
    g.beginPath();
    let first = true;
    for (let z = Math.max(0, head - 1.4); z <= Math.min(H, head); z += 0.1) {
      const a = a0 + z * 1.35, rr = n * 0.66 * (1 - 0.3 * z / H), p = P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z);
      if (first) { g.moveTo(p[0], p[1]); first = false; } else g.lineTo(p[0], p[1]);
    }
    g.strokeStyle = rgba(k % 2 ? RED : PINK, 0.9 * fade); g.lineWidth = 3.2; g.stroke();
    g.strokeStyle = rgba(WHITE, fade); g.lineWidth = 1.2; g.stroke();
  }
  // คลื่นกระแทก 2 วง
  for (let j = 0; j < (lowQ ? 1 : 2); j++) {
    const qq = clamp01((q - 0.02 - j * 0.1) / 0.4);
    if (qq > 0 && qq < 1) groundRing(g, cx, cy, n * 0.5 + n * 1.15 * easeOut3(qq), j ? RED : WHITE, 0.9 * (1 - qq), 5 * (1 - qq) + 1);
  }
  g.globalCompositeOperation = "source-over";
  sparks(g, A.bx, A.hy, A.r * 2.4, clamp01(q / 0.45), 113, 18, [WHITE, HOT, RED, YEL], lowQ, 2.2);
  // ประกายเพชรรอบตัว + ถ่านแดงลอยขึ้น
  if (!lowQ && q > 0.15) {
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 18; i++) {
      const u = clamp01((q - 0.15 - hash01(i + 7) * 0.3) / 0.5);
      if (u <= 0 || u >= 1) continue;
      const a = hash01(i + 2) * TAU, rr = n * (0.4 + hash01(i + 5) * 0.7), p = P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.3 + u * 3.2);
      if (i % 3 === 0) twinkle(g, p[0], p[1], p[2] * 0.14 * Math.sin(Math.PI * u), 0.95);
      else { g.fillStyle = rgba(i % 2 ? RED : HOT, Math.sin(Math.PI * u)); g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.03), 0, TAU); g.fill(); }
    }
    g.globalCompositeOperation = "source-over";
  }
  g.restore();
}

// ---------- เรียกดาบ ----------
function summonFx(g, e, t, now, lowQ) {
  const D = TAKUTO_FX_DUR.takutoSummon, q = t / D, n = Math.max(1, e.size | 0), kind = e.sword === "sapphire" ? "sapphire" : "emerald";
  const A = bodyAt(e.x, e.y, n), pal = PAL[kind], side = kind === "emerald" ? -1 : 1;
  const ax = viewAxes(), off = n / 2 + 0.55;
  const gx = A.cx + ax.rx * side * off, gy = A.cy + ax.ry * side * off;
  const [px, py] = P(gx, gy, 0.03), spot = swordSpot(A, kind, now), L = spot.L;
  const rot = REDUCED ? 0 : now / 500;
  g.save(); g.lineCap = "round";
  // วงแสงบนพื้น
  const pk = env(q, 0, 0.1, 0.55, 0.82);
  if (pk > 0) {
    g.globalCompositeOperation = "lighter";
    const R = 0.38 * Math.sqrt(n) * (0.5 + 0.5 * easeOut3(Math.min(1, q * 5)));
    groundRing(g, gx, gy, R, pal.gl, 0.95 * pk, 2.6);
    groundRing(g, gx, gy, R * 0.72, pal.sp, 0.7 * pk, 1.2);
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = rot + (i / 12) * TAU, p0 = P(gx + Math.cos(a) * R, gy + Math.sin(a) * R, 0.03), p1 = P(gx + Math.cos(a) * R * 1.22, gy + Math.sin(a) * R * 1.22, 0.03);
      g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    }
    g.strokeStyle = rgba(pal.sp, 0.8 * pk); g.lineWidth = 1.3; g.stroke();
    // เสาแสงจาง
    pillar(g, gx, gy, 3, P(gx, gy, 0)[2] * R * 0.9, pal.gl, pal.sp, 0.6 * pk * (q < 0.5 ? 1 : 0.6), lowQ);
    g.globalCompositeOperation = "source-over";
  }
  // ละอองลอยขึ้นจากวง
  if (!lowQ && q < 0.75) {
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 12; i++) {
      const u = ((q * 1.6 + hash01(i + 3)) % 1), a = hash01(i + 9) * TAU, rr = 0.3 * (1 - u * 0.5);
      const p = P(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr, u * 2.2);
      g.fillStyle = rgba(i % 2 ? pal.sp : WHITE, Math.sin(Math.PI * u) * (1 - q)); g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.025), 0, TAU); g.fill();
    }
    g.globalCompositeOperation = "source-over";
  }
  // ดาบ: โผล่จากวง (ปลายนำ) → ลอยไปที่ประจำ → ประกาย
  const R1 = 0.12, R2 = 0.5, FLY = 0.84;
  if (q > R1) {
    let hx, hy, ang, white = 0;
    if (q < R2) {
      const k = easeOut3((q - R1) / (R2 - R1));
      hx = px; hy = py + L * 0.25 - L * 1.05 * k; ang = -Math.PI / 2; white = 1 - k;
      g.save(); g.beginPath(); g.rect(px - L * 3, py - L * 4, L * 6, L * 4 + 1); g.clip();
      drawSword(g, hx, hy, ang, L, pal, 1, { glow: 1, white });
      g.restore();
    } else {
      const k = easeInOut(clamp01((q - R2) / (FLY - R2))), sx = px, sy = py + L * 0.25 - L * 1.05;
      hx = lerp(sx, spot.x, k); hy = lerp(sy, spot.y, k) - Math.sin(Math.PI * k) * L * 0.25; ang = lerp(-Math.PI / 2, spot.ang, k);
      if (!lowQ && k > 0 && k < 1) {
        g.globalCompositeOperation = "lighter";
        for (let j = 1; j <= 6; j++) {
          const kk = easeInOut(clamp01((q - R2 - j * 0.012) / (FLY - R2)));
          const tx = lerp(sx, spot.x, kk) + Math.cos(ang) * L * 0.5, ty = lerp(sy, spot.y, kk) - Math.sin(Math.PI * kk) * L * 0.25 + Math.sin(ang) * L * 0.5;
          twinkle(g, tx, ty, L * 0.08 * (1 - j / 7), 0.8 * (1 - j / 7), pal.sp);
        }
        g.globalCompositeOperation = "source-over";
      }
      drawSword(g, hx, hy, ang, L, pal, 1, { glow: 1 });
      if (q > FLY) {
        const u = (q - FLY) / (1 - FLY), tp = [spot.x + Math.cos(spot.ang) * L, spot.y + Math.sin(spot.ang) * L];
        g.globalCompositeOperation = "lighter";
        twinkle(g, tp[0], tp[1], L * 0.32 * Math.sin(Math.PI * Math.min(1, u * 1.6)), 1);
        glow(g, spot.x + Math.cos(spot.ang) * L * 0.5, spot.y + Math.sin(spot.ang) * L * 0.5, L * 0.7, pal.gl, 0.5 * (1 - u));
        g.globalCompositeOperation = "source-over";
      }
    }
  }
  g.restore();
}

// ---------- ดาบรวมร่าง ----------
//  ช่วงสุดท้าย (MERGE_SHOW →) ดาบในฉากถึงที่พาดหลังแล้วค่อยจาง · ดาบค้าง (takutoItems) โผล่หลังตัวตั้งแต่ตอนนั้น
const MERGE_SHOW = 0.84;
function mergeFx(g, e, t, now, lowQ) {
  const D = TAKUTO_FX_DUR.takutoMerge, q = t / D, n = Math.max(1, e.size | 0);
  const A = bodyAt(e.x, e.y, n), M = [A.bx, A.hy - A.r * 1.5];
  const rest = swordSpot(A, "judgment", now);
  const ORB = 0.46, FLASH = 0.46, GROW = 0.66, LAND = MERGE_SHOW;
  g.save(); g.lineCap = "round";
  if (q < ORB + 0.02) {
    const u = clamp01(q / ORB), k = easeIn2(u);
    for (const kind of ["emerald", "sapphire"]) {
      const sp = swordSpot(A, kind, e.t0), side = kind === "emerald" ? -1 : 1;
      const mid0 = [sp.x + Math.cos(sp.ang) * sp.L * 0.5, sp.y + Math.sin(sp.ang) * sp.L * 0.5];
      const r0 = Math.hypot(mid0[0] - M[0], mid0[1] - M[1]), a0 = Math.atan2(mid0[1] - M[1], mid0[0] - M[0]);
      const pos = (kk) => { const a = a0 + side * kk * TAU * 1.25, r = r0 * (1 - kk * 0.92); return [M[0] + Math.cos(a) * r, M[1] + Math.sin(a) * r * 0.8, a]; };
      const [mx, my, a] = pos(k), ang = lerp(sp.ang, a + side * Math.PI / 2, Math.min(1, u * 2)), L = sp.L * (1 - 0.35 * k);
      if (!lowQ) {
        g.globalCompositeOperation = "lighter";
        g.beginPath();
        for (let j = 0; j <= 12; j++) { const [x, y] = pos(Math.max(0, k - j * 0.03)); if (j) g.lineTo(x, y); else g.moveTo(x, y); }
        g.strokeStyle = rgba(PAL[kind].gl, 0.6); g.lineWidth = 3; g.stroke();
        g.globalCompositeOperation = "source-over";
      }
      drawSword(g, mx - Math.cos(ang) * L * 0.5, my - Math.sin(ang) * L * 0.5, ang, L, PAL[kind], q < ORB ? 1 : 1 - (q - ORB) / 0.02, { glow: 1, white: Math.max(0, (u - 0.75) / 0.25) });
    }
    if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, M[0], M[1], A.r * (0.5 + u), TEAL, 0.35 * u); g.globalCompositeOperation = "source-over"; }
  }
  // วาบรวมร่าง
  const fq = (q - FLASH) / 0.2;
  if (fq > -0.05 && fq < 1) {
    const k = clamp01(1 - fq);
    g.globalCompositeOperation = "lighter";
    glow(g, M[0], M[1], A.r * 3.4 * (0.6 + 0.6 * clamp01(fq)), GOLD_L, 0.95 * k);
    impactStar(g, M[0], M[1], A.r * (1.2 + 2.6 * easeOut3(clamp01(fq))), 0.75 * k, 18, WHITE, GOLD, now / 500);
    g.save(); g.translate(M[0], M[1]); g.scale(1, 0.85);
    for (const [j, rgb] of [[0, WHITE], [1, EM], [2, SA]]) {
      const qq = clamp01(fq * 1.2 - j * 0.12);
      if (qq <= 0 || qq >= 1 || (lowQ && j)) continue;
      g.beginPath(); g.arc(0, 0, A.r * (0.4 + 2.2 * easeOut3(qq)), 0, TAU); g.strokeStyle = rgba(rgb, 0.9 * (1 - qq)); g.lineWidth = 3 * (1 - qq) + 1; g.stroke();
    }
    g.restore();
    g.globalCompositeOperation = "source-over";
    if (fq > 0) sparks(g, M[0], M[1], A.r * 2.8, clamp01(fq), 211, 20, [EM_L, SA_L, GOLD_L, WHITE], lowQ, 2);
  }
  // ดาบแห่งการพิพากษาก่อตัว → ลงไปพาดหลัง
  if (q > FLASH) {
    const g1 = clamp01((q - FLASH) / (GROW - FLASH)), sc = 0.25 + 0.75 * easeOutBack(g1);
    const m2 = clamp01((q - GROW) / (LAND - GROW)), k = easeInOut(m2), fadeOut = 1 - clamp01((q - LAND) / 0.1);
    if (fadeOut <= 0) { g.restore(); return; }
    const L0 = rest.L * sc, angA = -Math.PI / 2 + (1 - g1) * 2.2;
    const hA = [M[0] - Math.cos(angA) * L0 * 0.45, M[1] - Math.sin(angA) * L0 * 0.45];
    const hx = lerp(hA[0], rest.x, k), hy = lerp(hA[1], rest.y, k), ang = lerp(angA, rest.ang, k), L = lerp(L0, rest.L, k);
    if (g1 < 1) { g.globalCompositeOperation = "lighter"; glow(g, M[0], M[1], A.r * 1.6, GOLD, 0.5 * (1 - g1 * 0.5)); g.globalCompositeOperation = "source-over"; }
    drawSword(g, hx, hy, ang, L, PAL.judgment, fadeOut, { big: true, glow: 1 - m2 * 0.6, white: Math.max(0, 1 - g1 * 2.5) });
    if (!lowQ && g1 > 0.3 && m2 < 1) {
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + now / 700, rr = L * 0.42;
        twinkle(g, hx + Math.cos(ang) * L * 0.5 + Math.cos(a) * rr, hy + Math.sin(ang) * L * 0.5 + Math.sin(a) * rr * 0.6, L * 0.06, 0.8 * (1 - m2), i % 2 ? EM_L : SA_L);
      }
      g.globalCompositeOperation = "source-over";
    }
  }
  g.restore();
}

// ---------- ดาบแตก (หมดเวลา/ถูกใช้) ----------
function vanishFx(g, e, t, now, lowQ) {
  const D = TAKUTO_FX_DUR.takutoVanish, q = t / D, n = Math.max(1, e.size | 0);
  const kind = e.sword === "sapphire" || e.sword === "judgment" ? e.sword : "emerald", pal = PAL[kind];
  const A = bodyAt(e.x, e.y, n), sp = swordSpot(A, kind, e.t0), big = kind === "judgment";
  const mid = [sp.x + Math.cos(sp.ang) * sp.L * 0.5, sp.y + Math.sin(sp.ang) * sp.L * 0.5];
  g.save();
  // ดาบวาบขาว + รอยร้าว แล้วหายไป
  if (q < 0.22) {
    const k = q / 0.22;
    drawSword(g, sp.x, sp.y, sp.ang, sp.L, pal, 1 - easeIn2(k), { big, glow: 1, white: k });
    g.strokeStyle = rgba(WHITE, 0.9 * (1 - k)); g.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const u = 0.25 + i * 0.18, p = [sp.x + Math.cos(sp.ang) * sp.L * u, sp.y + Math.sin(sp.ang) * sp.L * u];
      const a = sp.ang + Math.PI / 2 + (hash01(i + 3) - 0.5);
      g.beginPath(); g.moveTo(p[0] - Math.cos(a) * sp.L * 0.08, p[1] - Math.sin(a) * sp.L * 0.08); g.lineTo(p[0] + Math.cos(a) * sp.L * 0.08, p[1] + Math.sin(a) * sp.L * 0.08); g.stroke();
    }
  }
  const age = clamp01((q - 0.15) / 0.85);
  if (q > 0.15) {
    g.globalCompositeOperation = "lighter";
    if (age < 0.3) glow(g, mid[0], mid[1], sp.L * 0.7, pal.gl, 0.8 * (1 - age / 0.3));
    g.globalCompositeOperation = "source-over";
    // เศษผลึกตามแนวใบดาบ
    const N = lowQ ? 6 : 12;
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, ox = sp.x + Math.cos(sp.ang) * sp.L * u, oy = sp.y + Math.sin(sp.ang) * sp.L * u;
      shards(g, ox, oy, sp.L * 0.35, age, 300 + i * 11, 2, pal, false, big ? 1.4 : 1);
    }
    // ละอองลอยขึ้น
    if (!lowQ) {
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 16; i++) {
        const u = hash01(i + 41), x = sp.x + Math.cos(sp.ang) * sp.L * u + (hash01(i + 5) - 0.5) * sp.L * 0.3, y = sp.y + Math.sin(sp.ang) * sp.L * u - age * sp.L * (0.3 + hash01(i) * 0.5);
        g.fillStyle = rgba(i % 2 ? pal.sp : WHITE, (1 - age) * 0.9); g.beginPath(); g.arc(x, y, Math.max(1, sp.L * 0.02), 0, TAU); g.fill();
      }
      g.globalCompositeOperation = "source-over";
    }
  }
  g.restore();
}

// ---------- ดูดพลัง (เอเมอรูด) ----------
function healFx(g, e, t, now, lowQ) {
  const D = e.dur || (e.big ? HEAL_BIG_MS : TAKUTO_FX_DUR.takutoHeal), q = t / D, n = Math.max(1, e.size | 0);
  const A = bodyAt(e.x, e.y, n), big = !!e.big;
  g.save(); g.lineCap = "round";
  // เสาแสงเขียวใหญ่ (ฟื้นเฟส 4)
  if (big) {
    const pk = env(q, 0.05, 0.18, 0.6, 0.92);
    if (pk > 0) {
      pillar(g, A.cx, A.cy, 10, A.s * n * 0.4 * (1 + 0.06 * Math.sin(now / 60)), EM, EM_L, pk, lowQ);
      g.globalCompositeOperation = "lighter";
      // เกลียวแสงพันเสา
      for (let k = 0; k < (lowQ ? 2 : 4); k++) {
        g.beginPath();
        for (let z = 0; z <= 6; z += 0.15) {
          const a2 = (k / 4) * TAU + z * 1.6 - (REDUCED ? 0 : now / 260), rr = n * 0.55, p = P(A.cx + Math.cos(a2) * rr, A.cy + Math.sin(a2) * rr, z);
          if (z) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
        }
        g.strokeStyle = rgba(k % 2 ? EM_L : WHITE, 0.4 * pk); g.lineWidth = 1.3; g.stroke();
      }
      groundRing(g, A.cx, A.cy, n * 0.75 + n * 0.5 * easeOut3(clamp01(q * 2)), EM, 0.9 * pk, 3);
      g.globalCompositeOperation = "source-over";
    }
  }
  g.globalCompositeOperation = "lighter";
  // สายละอองเขียว: จากเป้า (e.from) หรือจากวงรอบตัว → ไหลเข้ากลางหกเหลี่ยม
  const src = okT(e.from) ? bodyAt(e.from.x, e.from.y, e.fromSize || 1) : null;
  const NP = lowQ ? 10 : big ? 30 : 22;
  for (let i = 0; i < NP; i++) {
    const st = hash01(i + 13) * 0.4, u = clamp01((q - st) / 0.42);
    if (u <= 0 || u >= 1) continue;
    let x0, y0;
    if (src) { x0 = src.bx + (hash01(i + 2) - 0.5) * src.r; y0 = src.hy + (hash01(i + 6) - 0.5) * src.r; }
    else { const a = hash01(i + 3) * TAU, [px, py] = P(A.cx + Math.cos(a) * n * 1.3, A.cy + Math.sin(a) * n * 1.3, 0.2); x0 = px; y0 = py; }
    const k = easeIn2(u), cxp = (x0 + A.bx) / 2 + (hash01(i + 8) - 0.5) * A.r * 1.6, cyp = Math.min(y0, A.hy) - A.r * (0.4 + hash01(i + 1));
    const p = bez([x0, y0], [cxp, cyp], [A.bx, A.hy], k), al = Math.sin(Math.PI * u);
    if (!lowQ) glow(g, p[0], p[1], A.s * 0.12, EM, 0.4 * al);
    if (i % 4 === 0) twinkle(g, p[0], p[1], A.s * 0.1, al, EM_L);
    else { g.fillStyle = rgba(i % 2 ? EM_L : WHITE, al); g.beginPath(); g.arc(p[0], p[1], Math.max(1.3, A.s * 0.03), 0, TAU); g.fill(); }
  }
  // ตัวเรืองเขียว + วงบนพื้น + เครื่องหมายบวกลอยขึ้น
  const bk = env(q, 0.25, 0.45, 0.7, 1);
  if (bk > 0) {
    glow(g, A.bx, A.hy, A.r * 1.6, EM, 0.45 * bk);
    groundRing(g, A.cx, A.cy, n * 0.55 + 0.25 * easeOut3(clamp01((q - 0.25) * 2)), EM_L, 0.8 * bk, 2);
    for (let i = 0; i < (lowQ ? 3 : 6); i++) {
      const u = clamp01((q - 0.35 - i * 0.05) / 0.5);
      if (u <= 0 || u >= 1) continue;
      const x = A.bx + (hash01(i + 21) - 0.5) * A.r * 2, y = A.hy + A.r * 0.4 - u * A.r * 1.6, s = A.s * 0.09, al = Math.sin(Math.PI * u);
      g.fillStyle = rgba(EM_L, al); g.fillRect(x - s * 0.3, y - s, s * 0.6, s * 2); g.fillRect(x - s, y - s * 0.3, s * 2, s * 0.6);
    }
  }
  g.globalCompositeOperation = "source-over";
  g.restore();
}

// ---------- พุ่งต้นตาเดิน ----------
function dashFx(g, e, t, now, lowQ) {
  if (!okT(e.from) || !okT(e.to)) return;
  const D = TAKUTO_FX_DUR.takutoDash, q = t / D, n = Math.max(1, e.size | 0);
  const fx = e.from.x + n / 2, fy = e.from.y + n / 2, tx = e.to.x + n / 2, ty = e.to.y + n / 2;
  let dx = tx - fx, dy = ty - fy; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const sx = -dy, sy = dx, k = easeOut4(clamp01(t / TAKUTO_T.dashMove)), hx = lerp(fx, tx, k), hy = lerp(fy, ty, k);
  g.save(); g.lineCap = "round"; g.globalCompositeOperation = "lighter";
  // ทางแสงบนพื้น (แดงขาว)
  const sk = q < 0.4 ? 1 : 1 - (q - 0.4) / 0.6;
  if (sk > 0) {
    const back = Math.min(Math.hypot(hx - fx, hy - fy), n * 0.45), a = P(fx, fy, 0.06), b = P(hx - dx * back, hy - dy * back, 0.06);
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 4) taper(g, a, b, a[2] * 0.03, b[2] * 0.16 * Math.sqrt(n), [[2.2, RED, 0.22, 1], [1, HOT, 0.4, 1], [0.35, WHITE, 0.7, 1]], sk);
    g.globalCompositeOperation = "lighter";
  }
  // เส้นความเร็วรอบตัว (ขนานทิศพุ่ง)
  if (!lowQ) {
    for (let i = 0; i < 14; i++) {
      const off = (hash01(i + 1) - 0.5) * n * 1.4, z = 0.15 + hash01(i + 5) * n * 0.9, len = 0.8 + hash01(i + 9) * 1.6;
      const back = (q * 3 + hash01(i + 13)) % 1, al = Math.sin(Math.PI * back) * (1 - q);
      const x0 = hx - dx * (n / 2 + back * 2.2) + sx * off, y0 = hy - dy * (n / 2 + back * 2.2) + sy * off;
      const p0 = P(x0, y0, z), p1 = P(x0 - dx * len, y0 - dy * len, z);
      g.strokeStyle = rgba(i % 3 ? WHITE : HOT, 0.8 * al); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
  }
  // ฝุ่นที่จุดออก + คลื่นลมที่จุดถึง
  g.globalCompositeOperation = "source-over";
  for (let i = 0; i < (lowQ ? 4 : 8); i++) {
    const u = clamp01(q * 1.4 - hash01(i) * 0.2);
    if (u <= 0 || u >= 1) continue;
    const a = hash01(i + 31) * TAU, p = P(fx + Math.cos(a) * n * 0.4 * (1 + u) - dx * u * 0.6, fy + Math.sin(a) * n * 0.4 * (1 + u) - dy * u * 0.6, 0.1 + u * 0.4);
    glow(g, p[0], p[1], p[2] * (0.14 + 0.16 * u), "200,190,196", 0.28 * (1 - u));
  }
  const wq = clamp01((t - TAKUTO_T.dashMove * 0.7) / 380);
  if (wq > 0 && wq < 1) {
    g.globalCompositeOperation = "lighter";
    groundRing(g, tx + dx * 0.2, ty + dy * 0.2, n * 0.5 + n * 0.6 * easeOut3(wq), WHITE, 0.75 * (1 - wq), 2.5);
  }
  g.restore();
}

// ---------- ดาบประกายแสง ----------
//  e: { from, to (ทาคุโตะ), dir, tiles, targetId, targetFrom, targetTo, size, tSize }
function slashLine(g, c, ang, R, u0, u1, w, pal, k) {
  // เสี้ยวตรงโค้งเล็กน้อยผ่าน c ตามมุม ang (ยาว 2R) · u0..u1 = ช่วงที่วาด (หัว = u1)
  if (k <= 0.01 || u1 - u0 < 0.01) return;
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, N = 20, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const u = u0 + (u1 - u0) * (i / N), v = (u - 0.5) * 2, bow = (1 - v * v) * R * 0.18;
    const th = w * Math.pow(i / N, 0.9) * Math.min(1, (1 - i / N) * 8 + 0.2);
    const x = c[0] + dx * v * R + nx * bow, y = c[1] + dy * v * R + ny * bow;
    top.push([x + nx * th * 0.5, y + ny * th * 0.5]); bot.push([x - nx * th * 0.5, y - ny * th * 0.5]);
  }
  g.save(); g.globalCompositeOperation = "lighter";
  g.beginPath(); top.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = bot.length - 1; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]); g.closePath();
  g.fillStyle = rgba(pal.lt, 0.8 * k); g.fill();
  g.strokeStyle = rgba(pal.gl, 0.5 * k); g.lineWidth = w * 0.6; g.stroke();
  g.beginPath(); top.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.strokeStyle = rgba(WHITE, k); g.lineWidth = Math.max(1.4, w * 0.18); g.stroke();
  g.restore();
}
function blinkCol(g, B, k, rgb) {
  // เสาแสงแนวตั้งบนตัว (วาบหาย/โผล่)
  if (k <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter";
  const top = B.hy - B.r * 2.4, bot = B.by + B.s * 0.15, w = B.r * 0.6 * k;
  const gr = g.createLinearGradient(B.bx - w, 0, B.bx + w, 0);
  gr.addColorStop(0, rgba(rgb, 0)); gr.addColorStop(0.5, rgba(WHITE, 0.95 * k)); gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr; g.fillRect(B.bx - w, top, w * 2, bot - top);
  glow(g, B.bx, B.hy, B.r * 1.8, rgb, 0.6 * k);
  g.restore();
}
function flashFx(g, e, t, now, lowQ) {
  if (!okT(e.from)) return;
  const n = Math.max(1, e.size | 0), tn = Math.max(1, e.tSize | 0), T = TAKUTO_T;
  const to = okT(e.to) ? e.to : e.from, tf = okT(e.targetFrom) ? e.targetFrom : null, tt = okT(e.targetTo) ? e.targetTo : null;
  const A0 = bodyAt(e.from.x, e.from.y, n), A1 = bodyAt(to.x, to.y, n);
  const v = DIRV[e.dir] || null;
  const T0 = tf ? bodyAt(tf.x, tf.y, tn) : null, T1 = tt ? bodyAt(tt.x, tt.y, tn) : null;
  // ทิศบนจอ (จากกลางตัวไปทางที่ใช้)
  let sdx = 1, sdy = 0;
  if (v) { const a = P(A0.cx, A0.cy), b = P(A0.cx + v[0], A0.cy + v[1]); const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; sdx = (b[0] - a[0]) / l; sdy = (b[1] - a[1]) / l; }
  else if (T0) { const l = Math.hypot(T0.bx - A0.bx, T0.hy - A0.hy) || 1; sdx = (T0.bx - A0.bx) / l; sdy = (T0.hy - A0.hy) / l; }
  g.save(); g.lineCap = "round";
  // 1) ดาบคู่ไขว้หน้าตัว + ชาร์จ
  if (t < T.flashStreak) {
    const k = env(t, 0, 140, T.flashCharge, T.flashStreak), X = [A0.bx + sdx * A0.r * 1.15, A0.hy + sdy * A0.r * 0.6];
    const L = A0.r * 1.5, c = clamp01(t / T.flashCharge);
    g.globalCompositeOperation = "lighter";
    glow(g, X[0], X[1], L * (0.4 + 0.5 * c), TEAL, 0.55 * k);
    if (!lowQ) {
      for (let i = 0; i < 12; i++) {
        const u = clamp01(c * 1.4 - hash01(i + 5) * 0.4), a = hash01(i + 1) * TAU, r = L * 0.9 * (1 - easeIn2(u));
        g.fillStyle = rgba(i % 2 ? EM_L : SA_L, Math.sin(Math.PI * u) * k); g.beginPath(); g.arc(X[0] + Math.cos(a) * r, X[1] + Math.sin(a) * r, 1.8, 0, TAU); g.fill();
      }
    }
    g.globalCompositeOperation = "source-over";
    for (const [pal, a] of [[PAL.emerald, -Math.PI / 2 - 0.7], [PAL.sapphire, -Math.PI / 2 + 0.7]]) {
      drawSword(g, X[0] - Math.cos(a) * L * 0.45, X[1] - Math.sin(a) * L * 0.45, a, L, pal, k, { glow: 0.6 + 0.4 * c, white: t > T.flashCharge ? (t - T.flashCharge) / (T.flashStreak - T.flashCharge) : 0 });
    }
    if (t > T.flashCharge - 60) { g.globalCompositeOperation = "lighter"; twinkle(g, X[0], X[1], L * 0.7 * env(t, T.flashCharge - 60, T.flashCharge + 40, T.flashCharge + 60, T.flashStreak), 1); g.globalCompositeOperation = "source-over"; }
  }
  // 2) ลำแสงเขียวฟ้าพุ่งตามแนวจากตัวไปเป้า + ช่องในแนววาบ
  if (T0 && t > T.flashCharge && t < T.flashCross + 200) {
    const u = clamp01((t - T.flashCharge) / (T.flashStreak - T.flashCharge)), fade = t < T.flashStreak + 120 ? 1 : clamp01(1 - (t - T.flashStreak - 120) / 400);
    const z = chestZ(n), a = P(A0.cx, A0.cy, z), b = P(lerp(A0.cx, T0.cx, easeIn2(u)), lerp(A0.cy, T0.cy, easeIn2(u)), lerp(z, chestZ(tn) + 0.3, u));
    taper(g, a, b, a[2] * 0.06, b[2] * 0.2, lowQ ? [[1.8, TEAL, 0.35, 1], [0.6, WHITE, 0.9, 1]] : [[2.6, EM, 0.22, 1], [1.7, SA, 0.32, 1], [1, TEAL, 0.55, 1], [0.45, WHITE, 0.95, 1]], fade);
    if (u < 1) { g.globalCompositeOperation = "lighter"; glow(g, b[0], b[1], b[2] * 0.6, TEAL, 0.8); g.globalCompositeOperation = "source-over"; }
  }
  if (Array.isArray(e.tiles) && t > T.flashCharge && t < T.flashCross + 300 && T0) {
    g.save(); g.globalCompositeOperation = "lighter";
    const L = Math.hypot(T0.cx - A0.cx, T0.cy - A0.cy) || 1;
    for (const tl of e.tiles) {
      if (!okT(tl)) continue;
      const d = ((tl.x + 0.5 - A0.cx) * (T0.cx - A0.cx) + (tl.y + 0.5 - A0.cy) * (T0.cy - A0.cy)) / L;
      const at = T.flashCharge + (T.flashStreak - T.flashCharge) * Math.sqrt(clamp01(d / L));
      const k = env(t, at - 40, at + 60, at + 160, at + 520);
      if (k <= 0) continue;
      quad(g, tl.x, tl.y, 0.06, 0.02); g.fillStyle = rgba(TEAL, 0.32 * k); g.fill();
    }
    g.restore();
  }
  // 3) ฟันกากบาทที่เป้า (ตำแหน่งเดิม)
  if (T0 && t > T.flashStreak - 40 && t < T.flashSwap + 200) {
    const c = [T0.bx, T0.hy], R = Math.max(T0.r * 1.6, A0.s * 0.85), w = R * 0.32;
    const s1 = clamp01((t - T.flashStreak) / 230), s2 = clamp01((t - T.flashStreak - 150) / 230);
    const fade = t < T.flashCross ? 1 : clamp01(1 - (t - T.flashCross) / 260);
    const swords = [[s1, -Math.PI / 4 + 0.15, PAL.emerald], [s2, Math.PI / 4 - 0.15 + Math.PI, PAL.sapphire]];
    for (const [s, ang, pal] of swords) {
      if (s <= 0) continue;
      const head = easeOut3(s), tail = Math.max(0, head - 0.75);
      slashLine(g, c, ang, R, tail, head, w, pal, fade);
      if (s < 1) {
        const v2 = (head - 0.5) * 2, hx = c[0] + Math.cos(ang) * v2 * R, hy = c[1] + Math.sin(ang) * v2 * R;
        drawSword(g, hx - Math.cos(ang) * R * 0.75, hy - Math.sin(ang) * R * 0.75, ang, R * 0.8, pal, 1 - s * 0.4, { glow: 0.8 });
      }
    }
    if (s2 >= 1 && !lowQ) shards(g, c[0], c[1], R * 1.1, clamp01((t - T.flashStreak - 380) / 500), 517, 12, PAL.emerald, lowQ);
  }
  // 4) สลับตำแหน่ง: วาบหายที่เดิม → เส้นแสง → โผล่ที่ใหม่ (ตัวหมากจางตาม takutoPose)
  const sw = T.flashSwap;
  const outK = env(t, sw - 140, sw - 30, sw - 10, sw + 90), inK = env(t, sw - 20, sw + 60, sw + 120, sw + 320);
  if (outK > 0) { blinkCol(g, A0, outK, TEAL); if (T0) blinkCol(g, T0, outK, TEAL); }
  if (inK > 0) {
    blinkCol(g, A1, inK, TEAL); if (T1) blinkCol(g, T1, inK, TEAL);
    g.save(); g.globalCompositeOperation = "lighter";
    for (const [a, b] of [[A0, A1], ...(T0 && T1 ? [[T0, T1]] : [])]) {
      g.strokeStyle = rgba(TEAL, 0.8 * inK); g.lineWidth = 3; g.beginPath(); g.moveTo(a.bx, a.hy); g.lineTo(b.bx, b.hy); g.stroke();
      g.strokeStyle = rgba(WHITE, inK); g.lineWidth = 1.2; g.stroke();
    }
    g.restore();
  }
  // 5) ปะทะที่ตำแหน่งใหม่ของเป้า (จังหวะดาเมจลง)
  const P1 = T1 || T0;
  if (P1 && t > T.flashHit - 60) {
    const q = clamp01((t - T.flashHit + 60) / 520), c = [P1.bx, P1.hy], R = Math.max(P1.r * 1.5, A0.s * 0.8);
    g.save(); g.globalCompositeOperation = "lighter";
    if (q < 0.35) glow(g, c[0], c[1], R * 1.4, TEAL, 0.9 * (1 - q / 0.35));
    const kk = 1 - q, L = R * (0.6 + 0.6 * easeOut3(Math.min(1, q * 3)));
    for (const [a, rgb] of [[Math.PI / 4, EM_L], [-Math.PI / 4, SA_L]]) {
      g.strokeStyle = rgba(rgb, 0.95 * kk); g.lineWidth = 6 * kk + 1;
      g.beginPath(); g.moveTo(c[0] - Math.cos(a) * L, c[1] - Math.sin(a) * L); g.lineTo(c[0] + Math.cos(a) * L, c[1] + Math.sin(a) * L); g.stroke();
      g.strokeStyle = rgba(WHITE, kk); g.lineWidth = 2; g.stroke();
    }
    impactStar(g, c[0], c[1], R * (0.8 + 1.2 * easeOut3(q)), 0.7 * kk, 12, WHITE, TEAL, 0.3);
    groundRing(g, P1.cx, P1.cy, 0.25 + 1.0 * P1.n * easeOut3(q), TEAL, 0.9 * kk, 3 * kk + 1);
    g.restore();
    sparks(g, c[0], c[1], R * 1.8, q, 733, 16, [EM_L, SA_L, WHITE], lowQ, 2);
  }
  g.restore();
}

// ---------- ทาวววว มิสไซล์ ----------
const MISSILE_LAYERS = [[3.1, RED_D, 0.24, 0], [2.2, RED, 0.42, 1], [1.5, PINK, 0.6, 1], [0.95, HOT, 0.85, 1], [0.48, WHITE, 1, 1]];
const MISSILE_LAYERS_LOW = [[2.2, RED, 0.45, 1], [1, HOT, 0.85, 1], [0.45, WHITE, 1, 1]];
function missileFx(g, e, t, now, lowQ) {
  const v = DIRV[e.dir];
  if (!v) return;
  const D = TAKUTO_FX_DUR.takutoMissile, T = TAKUTO_T, n = Math.max(1, e.size | 0);
  const cx = e.x + n / 2, cy = e.y + n / 2, f = [v[0], v[1], 0], s = [-v[1], v[0], 0], up = [0, 0, 1];
  const Z = chestZ(n) * 1.15, start = n / 2 * 0.8;
  const tiles = Array.isArray(e.tiles) ? e.tiles.filter(okT) : [];
  const proj = (tl) => (tl.x + 0.5 - cx) * v[0] + (tl.y + 0.5 - cy) * v[1];
  const reach = tiles.length ? Math.max(...tiles.map(proj)) + 0.5 : n / 2 + 8;
  const O = [cx + v[0] * start, cy + v[1] * start, Z];
  g.save(); g.lineCap = "round";
  // ชาร์จที่อก: ประกายแดงไหลเข้า · ลูกแสงโต · วงพลังหน้าตัวเต้น
  if (t < T.missileFire + 160) {
    const c = clamp01(t / T.missileFire), k = t < T.missileFire ? 1 : 1 - (t - T.missileFire) / 160;
    const [ox, oy, os] = P3(O);
    g.globalCompositeOperation = "lighter";
    glow(g, ox, oy, os * (0.3 + 0.9 * c) * n * 0.45, RED, 0.85 * k);
    glow(g, ox, oy, os * (0.12 + 0.4 * c) * n * 0.45, WHITE, 0.95 * k);
    for (let j = 0; j < (lowQ ? 2 : 3); j++) {
      const ph = ((t / 380) + j / 3) % 1, rr = (0.9 - 0.75 * ph) * n * 0.45;
      ring3(g, add3(O, f, 0.05 + 0.2 * (1 - ph)), rr, s, up, 32); g.strokeStyle = rgba(j % 2 ? PINK : RED, 0.8 * Math.sin(Math.PI * ph) * k * c); g.lineWidth = 2; g.stroke();
    }
    if (!lowQ) {
      for (let i = 0; i < 18; i++) {
        const u = clamp01(c * 1.35 - hash01(i + 41) * 0.35), a = hash01(i + 3) * TAU, r = n * 0.9 * (1 - easeIn2(u));
        const p = P3(add3(add3(O, s, Math.cos(a) * r), up, Math.sin(a) * r * 0.8));
        g.fillStyle = rgba(i % 3 ? HOT : WHITE, Math.sin(Math.PI * u) * k); g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.03), 0, TAU); g.fill();
      }
    }
    g.globalCompositeOperation = "source-over";
  }
  // ลำแสง
  if (t >= T.missileFire) {
    const u = clamp01((t - T.missileFire) / (T.missileReach - T.missileFire)), d = start + (reach - start) * (u * 0.4 + easeIn2(u) * 0.6);
    const H = [cx + v[0] * d, cy + v[1] * d, Z];
    const HOLD = 2300, wK = t < T.missileReach ? 0.7 + 0.3 * u : t < HOLD ? 1 : clamp01(1 - (t - HOLD) / (D - 120 - HOLD));
    const flick = REDUCED ? 1 : 0.9 + 0.1 * Math.sin(now / 21);
    const surge = t >= T.missileReach && t < T.missileReach + 140 ? 1 + 0.3 * (1 - (t - T.missileReach) / 140) : 1;
    // รอยไหม้บนพื้นใต้ลำแสง
    if (wK > 0.01) {
      const a0 = P(cx + v[0] * start, cy + v[1] * start, 0.02), b0 = P(H[0], H[1], 0.02);
      taper(g, a0, b0, a0[2] * 0.22, b0[2] * 0.3, [[1.6, RED_D, 0.25 * wK, 0], [0.8, RED, 0.25 * wK, 1]], 1);
    }
    if (wK > 0.01) {
      const a = P3(O), b = P3(H), base = 0.2 * n / 3 * 1.2 * wK * flick * surge;
      taper(g, a, b, a[2] * base * 0.8, b[2] * base, lowQ ? MISSILE_LAYERS_LOW : MISSILE_LAYERS, 1);
      g.globalCompositeOperation = "lighter";
      // วงพลังวิ่งตามลำแสง
      if (!lowQ) {
        for (let j = 0; j < 9; j++) {
          const dd = start + ((j / 9 + (REDUCED ? 0 : now / 900)) % 1) * (d - start);
          ring3(g, [cx + v[0] * dd, cy + v[1] * dd, Z], 0.42 * wK * n / 3 * 1.2, s, up, 28);
          g.strokeStyle = rgba(j % 2 ? HOT : WHITE, 0.55 * wK); g.lineWidth = 1.6; g.stroke();
        }
      }
      if (t < T.missileReach + 120) glow(g, b[0], b[1], b[2] * 0.9 * n / 3, WHITE, 0.95 * (t < T.missileReach ? 1 : 1 - (t - T.missileReach) / 120));
      if (t < T.missileFire + 180) glow(g, a[0], a[1], a[2] * 1.3 * n / 3, WHITE, 0.95 * (1 - (t - T.missileFire) / 180));
      g.globalCompositeOperation = "source-over";
    }
  }
  // ช่องในแนว: วาบ + วงกระแทก + ประกายตอนหัวลำแสงผ่าน
  tiles.forEach((tl, i) => {
    const dd = proj(tl), uu = clamp01((dd - start) / Math.max(0.1, reach - start));
    // หาเวลาที่หัวถึงช่อง (ย้อนสูตร u*0.4 + u²*0.6)
    const uh = (-0.4 + Math.sqrt(0.16 + 2.4 * uu)) / 1.2;
    const at = T.missileFire + (T.missileReach - T.missileFire) * uh, age = (t - at) / 600;
    if (age < 0 || age > 1) return;
    g.save(); g.globalCompositeOperation = "lighter";
    quad(g, tl.x, tl.y, 0.04, 0.02); g.fillStyle = rgba(RED, 0.4 * (1 - age)); g.fill();
    groundRing(g, tl.x + 0.5, tl.y + 0.5, 0.2 + 0.55 * easeOut3(age), HOT, 0.85 * (1 - age), 2.4);
    g.restore();
    const [px, py, ps] = P(tl.x + 0.5, tl.y + 0.5, Z * 0.7);
    sparks(g, px, py, ps * 0.9, age, 900 + i * 7, 8, [WHITE, HOT, RED], lowQ, 2);
  });
  // ปลายแนว: ระเบิดกระแทก
  if (t >= T.missileReach) {
    const q = clamp01((t - T.missileReach) / 650), ex = cx + v[0] * (reach - 0.3), ey = cy + v[1] * (reach - 0.3);
    if (q < 1) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (let j = 0; j < (lowQ ? 1 : 2); j++) { const qq = clamp01(q * 1.2 - j * 0.2); if (qq > 0 && qq < 1) groundRing(g, ex, ey, 0.4 + 1.6 * easeOut3(qq), j ? RED : WHITE, 0.9 * (1 - qq), 4 * (1 - qq) + 1); }
      const [px, py, ps] = P(ex, ey, Z);
      if (q < 0.4) glow(g, px, py, ps * 1.6, HOT, 0.8 * (1 - q / 0.4));
      g.restore();
    }
  }
  g.restore();
}

// ---------- ลูกแสงฟ้าจากเป้าเข้าตัว ----------
function stealFx(g, e, t, now, lowQ) {
  if (!okT(e.from)) return;
  const D = TAKUTO_FX_DUR.takutoSteal, q = t / D, n = Math.max(1, e.size | 0);
  const A = bodyAt(e.x, e.y, n), S = bodyAt(e.from.x, e.from.y, e.fromSize || 1);
  const N = Math.max(1, Math.min(5, e.amt | 0 || 1)), FLY = 760;
  g.save(); g.lineCap = "round"; g.globalCompositeOperation = "lighter";
  // วงดึงใต้เป้า
  const pk = env(q, 0, 0.1, 0.45, 0.65);
  if (pk > 0) { groundRing(g, S.cx, S.cy, 0.35 * S.n + 0.2 * Math.sin(now / 90), SA, 0.85 * pk, 2.2); glow(g, S.bx, S.hy, S.r * 1.5, SA, 0.35 * pk); }
  let absorb = 0;
  for (let i = 0; i < N; i++) {
    const st = 80 + i * 110, u = clamp01((t - st) / FLY);
    if (u <= 0) continue;
    if (u >= 1) { absorb = Math.max(absorb, 1 - clamp01((t - st - FLY) / 380)); continue; }
    const side = i % 2 ? 1 : -1, x0 = S.bx + side * S.r * 0.3, y0 = S.hy;
    const ctrl = [(x0 + A.bx) / 2 + side * A.r * 0.6, Math.min(y0, A.hy) - A.r * (1.4 + 0.3 * i)];
    const k = easeInOut(u), p = bez([x0, y0], ctrl, [A.bx, A.hy], k), rs = A.s * (0.16 + 0.06 * Math.sin(Math.PI * u));
    if (!lowQ) for (let j = 1; j <= 5; j++) { const pj = bez([x0, y0], ctrl, [A.bx, A.hy], easeInOut(Math.max(0, u - j * 0.035))); g.fillStyle = rgba(SA_L, 0.5 * (1 - j / 6)); g.beginPath(); g.arc(pj[0], pj[1], rs * (1 - j / 7) * 0.6, 0, TAU); g.fill(); }
    glow(g, p[0], p[1], rs * 2.6, SA, 0.65);
    g.fillStyle = rgba(SA_L, 1); g.beginPath(); g.arc(p[0], p[1], rs, 0, TAU); g.fill();
    g.fillStyle = rgba(WHITE, 1); g.beginPath(); g.arc(p[0] - rs * 0.3, p[1] - rs * 0.3, rs * 0.45, 0, TAU); g.fill();
  }
  if (absorb > 0) {
    glow(g, A.bx, A.hy, A.r * 1.8, SA, 0.6 * absorb);
    g.save(); g.translate(A.bx, A.hy); g.scale(1, 0.9);
    g.beginPath(); g.arc(0, 0, A.r * (1.1 + 0.6 * (1 - absorb)), 0, TAU); g.strokeStyle = rgba(SA_L, 0.9 * absorb); g.lineWidth = 2.5; g.stroke();
    g.restore();
  }
  g.restore();
}

// ---------- ฉันยังมองเห็นอยู่ (ระเบิดวงกว้าง) ----------
function blastFx(g, e, t, now, lowQ) {
  const D = TAKUTO_FX_DUR.takutoBlast, T = TAKUTO_T, n = Math.max(1, e.size | 0);
  const A = bodyAt(e.x, e.y, n), cx = A.cx, cy = A.cy;
  const tiles = Array.isArray(e.tiles) ? e.tiles.filter(okT) : [];
  const rMax = Math.max(n / 2 + 1, e.rMax || (tiles.length ? Math.max(...tiles.map((tl) => Math.hypot(tl.x + 0.5 - cx, tl.y + 0.5 - cy))) + 0.6 : n / 2 + (e.range | 0 || 8)));
  const rot = REDUCED ? 0 : now / 1100;
  g.save(); g.lineCap = "round";
  // 1) รวมแสงขาว: วงเตือนแดงที่ขอบรัศมี · ละอองขาวไหลเข้าตัว · แกนขาวโต
  if (t < T.blastBoom + 120) {
    const c = clamp01(t / T.blastBoom), k = t < T.blastBoom ? 1 : 1 - (t - T.blastBoom) / 120;
    g.globalCompositeOperation = "lighter";
    const pulse = 0.6 + 0.4 * Math.sin(now / 110);
    groundRing(g, cx, cy, rMax, RED, (0.25 + 0.45 * c) * pulse * k, 2.4);
    groundRing(g, cx, cy, rMax - 0.15, PINK, 0.3 * c * k, 1);
    // วงเวทหมุนใต้ตัว
    const R = n * 0.8 * (0.5 + 0.5 * easeOut3(Math.min(1, c * 3)));
    groundRing(g, cx, cy, R, WHITE, 0.8 * k, 2);
    g.beginPath();
    for (let i = 0; i < 3; i++) for (let j = 0; j <= 3; j++) {
      const a = rot + i * TAU / 9 + (j % 3) * TAU / 3, p = P(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0.03);
      if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
    }
    g.strokeStyle = rgba(HOT, 0.7 * k); g.lineWidth = 1.4; g.stroke();
    const NP = lowQ ? 14 : 34;
    for (let i = 0; i < NP; i++) {
      const u = ((c * 1.6 + hash01(i + 5)) % 1), a = hash01(i + 17) * TAU, r = rMax * (1 - easeIn2(u)) * (0.4 + 0.6 * hash01(i + 2));
      const p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.2 + (1 - r / rMax) * chestZ(n) * 1.6);
      g.fillStyle = rgba(i % 4 ? WHITE : HOT, Math.sin(Math.PI * u) * c * k); g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.03), 0, TAU); g.fill();
    }
    glow(g, A.bx, A.hy, A.r * (0.4 + 1.6 * easeIn2(c)), WHITE, 0.9 * k);
    glow(g, A.bx, A.hy, A.r * (0.8 + 2.4 * easeIn2(c)), HOT, 0.4 * k);
    g.globalCompositeOperation = "source-over";
  }
  // 2) ระเบิด: ลูกไฟ/คลื่นแดงขาวไล่ออกถึงขอบรัศมีที่ blastHit
  if (t >= T.blastBoom) {
    const u = clamp01((t - T.blastBoom) / (T.blastHit - T.blastBoom)), rr = n / 2 + (rMax - n / 2) * easeOut3(u);
    const fade = t < T.blastHit ? 1 : clamp01(1 - (t - T.blastHit) / (D - T.blastHit));
    g.globalCompositeOperation = "lighter";
    // แสงวาบตอนระเบิด (ที่ตัว — ไม่กลบทั้งจอ)
    const fq = clamp01((t - T.blastBoom) / 380);
    if (fq < 1) { glow(g, A.bx, A.hy, A.r * 3.2, WHITE, 0.8 * (1 - fq)); glow(g, A.bx, A.hy, A.r * 6, HOT, 0.35 * (1 - fq)); }
    // พื้นในวงระเบิด: รอยไหม้แดงคล้ำ (ทับปกติ) + แถบไฟสว่างเฉพาะใกล้หน้าระเบิด
    const [gx, gy] = P(cx, cy, 0.02);
    g.save();
    gEllipse(g, cx, cy, rr, 0.02, 64); g.clip();
    g.globalCompositeOperation = "source-over";
    const edge = P(cx + rr, cy, 0.02), RS = Math.max(8, Math.hypot(edge[0] - gx, edge[1] - gy) * 1.3);
    g.fillStyle = rgba("70,8,22", 0.3 * fade); g.fillRect(gx - RS, gy - RS, RS * 2, RS * 2);
    g.globalCompositeOperation = "lighter";
    const gr = g.createRadialGradient(gx, gy, RS * 0.45, gx, gy, RS * 0.78);
    gr.addColorStop(0, rgba(RED, 0)); gr.addColorStop(0.7, rgba(RED, 0.3 * fade)); gr.addColorStop(1, rgba(HOT, 0.5 * fade));
    g.fillStyle = gr; g.fillRect(gx - RS, gy - RS, RS * 2, RS * 2);
    g.restore();
    g.globalCompositeOperation = "lighter";
    // ลูกไฟที่ตัว (ยุบลงตามเวลา)
    const [dx, dy] = P(cx, cy, chestZ(n));
    glow(g, dx, dy, A.r * (2.2 - u), HOT, 0.5 * fade * (1 - u * 0.6));
    glow(g, dx, dy, A.r * (1.2 - 0.5 * u), WHITE, 0.6 * fade * (1 - u * 0.7));
    // คลื่นกระแทกที่หน้าระเบิด
    if (t < T.blastHit + 250) {
      const k = t < T.blastHit ? 1 : 1 - (t - T.blastHit) / 250;
      for (const [z, rgb, lw, al] of [[0.03, WHITE, 6, 1], [0.03, RED, 12, 0.45], [0.5, HOT, 3, 0.6], [1.2, PINK, 2, 0.35]]) {
        if (lowQ && z > 0.1) continue;
        groundRing(g, cx, cy, rr, rgb, al * k, lw, z);
      }
    }
    // ขอบรัศมีปะทุตอนดาเมจลง
    if (t >= T.blastHit - 40) {
      const q = clamp01((t - T.blastHit + 40) / 600);
      if (q < 1) {
        groundRing(g, cx, cy, rMax + 0.5 * easeOut3(q), WHITE, 0.9 * (1 - q), 3);
        groundRing(g, cx, cy, rMax + 1.2 * easeOut3(q), RED, 0.7 * (1 - q), 2);
      }
    }
    g.globalCompositeOperation = "source-over";
    // ช่องในรัศมี: วาบแดงตอนหน้าระเบิดผ่าน + เปลวขึ้น
    g.save(); g.globalCompositeOperation = "lighter";
    for (const tl of tiles) {
      const d = Math.hypot(tl.x + 0.5 - cx, tl.y + 0.5 - cy);
      const ud = clamp01((d - n / 2) / Math.max(0.1, rMax - n / 2)), uh = 1 - Math.cbrt(1 - ud);
      const at = T.blastBoom + (T.blastHit - T.blastBoom) * uh, age = (t - at) / 520;
      if (age < 0 || age > 1) continue;
      quad(g, tl.x, tl.y, 0.05, 0.02); g.fillStyle = rgba(age < 0.15 ? HOT : RED, 0.28 * (1 - age)); g.fill();
    }
    g.restore();
    // เศษ/ประกายพุ่งออก
    sparks(g, A.bx, A.hy, A.s * rMax * 0.9, clamp01((t - T.blastBoom) / 900), 1301, 30, [WHITE, HOT, RED, YEL], lowQ, 2.6);
    // ควันแดงเทาหลังระเบิด
    if (!lowQ && t > T.blastHit) {
      const q = clamp01((t - T.blastHit) / (D - T.blastHit));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + hash01(i) * 0.5, r = rMax * (0.55 + 0.35 * hash01(i + 3)), p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.3 + q * 1.4);
        glow(g, p[0], p[1], p[2] * (0.6 + q * 0.8), "70,40,48", 0.35 * (1 - q));
      }
    }
  }
  g.restore();
}

// ---------- ทางเข้าเดียว ----------
export function takutoFx(g, e, now, lowQ) {
  if (e.kind === "takutoPunch") { punchFx(g, e, now, lowQ); return; }
  if (e.kind === "takutoEmerald") { emeraldFx(g, e, now, lowQ); return; }
  if (e.kind === "takutoSapphire") { sapphireFx(g, e, now, lowQ, false); return; }
  if (e.kind === "takutoDual") { sapphireFx(g, e, now, lowQ, true); return; }
  if (e.kind === "takutoJudgment") { judgmentFx(g, e, now, lowQ); return; }
  const t = now - e.t0, dur = e.dur || TAKUTO_FX_DUR[e.kind] || 0;
  if (t < 0 || t > dur) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (e.kind === "takutoTauburn") tauburnFx(g, e, t, now, lowQ);
  else if (e.kind === "takutoSummon") summonFx(g, e, t, now, lowQ);
  else if (e.kind === "takutoMerge") mergeFx(g, e, t, now, lowQ);
  else if (e.kind === "takutoVanish") vanishFx(g, e, t, now, lowQ);
  else if (e.kind === "takutoHeal") healFx(g, e, t, now, lowQ);
  else if (e.kind === "takutoDash") dashFx(g, e, t, now, lowQ);
  else if (e.kind === "takutoFlash") flashFx(g, e, t, now, lowQ);
  else if (e.kind === "takutoMissile") missileFx(g, e, t, now, lowQ);
  else if (e.kind === "takutoSteal") stealFx(g, e, t, now, lowQ);
  else if (e.kind === "takutoBlast") blastFx(g, e, t, now, lowQ);
  g.restore();
}

// =================================================================== ย้ายหมากตามฉาก (BoardCanvas)
//  dash = ทาคุโตะพุ่ง from → to (ease-out) · flash = ทาคุโตะและเป้าวาบหาย (alpha → 0 ที่ flashSwap) แล้วโผล่ที่ใหม่
const blinkAlpha = (t, sw) => (t < sw - 130 ? 1 : t < sw ? 1 - (t - (sw - 130)) / 130 : t < sw + 150 ? (t - sw) / 150 : 1);
export function takutoPose(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  for (const e of list) {
    if (!e) continue;
    if (e.kind === "takutoDash" && e.id === u.id && okT(e.from) && okT(e.to)) {
      const k = easeOut4(clamp01((now - e.t0) / TAKUTO_T.dashMove));
      return { x: lerp(e.from.x, e.to.x, k), y: lerp(e.from.y, e.to.y, k), hz: 0.1 * Math.sin(Math.PI * k) };
    }
    if (e.kind === "takutoFlash") {
      const t = now - e.t0, sw = TAKUTO_T.flashSwap;
      const pick = e.id === u.id && okT(e.from) ? [e.from, okT(e.to) ? e.to : e.from]
        : e.targetId != null && e.targetId === u.id && okT(e.targetFrom) ? [e.targetFrom, okT(e.targetTo) ? e.targetTo : e.targetFrom] : null;
      if (!pick) continue;
      const p = t < sw ? pick[0] : pick[1];
      return { x: p.x, y: p.y, hz: 0, alpha: blinkAlpha(t, sw) };
    }
  }
  return null;
}
// เงาซ้อน 3 ชั้นของพุ่งต้นตาเดิน — หมากเดิม (ไม่มีแถบเลือด/ชื่อ) จางตามลำดับ (drawFrame วาดเรียงความลึก)
export function takutoGhosts(fx, units, now) {
  const out = [];
  for (const e of fx) {
    if (!e || e.kind !== "takutoDash" || !okT(e.from) || !okT(e.to)) continue;
    const t = now - e.t0;
    if (t < 0 || t > TAKUTO_FX_DUR.takutoDash) continue;
    const u = units.find((it) => it.id === e.id && !it.corpse);
    if (!u) continue;
    const fade = 1 - clamp01((t - TAKUTO_T.dashMove) / (TAKUTO_FX_DUR.takutoDash - TAKUTO_T.dashMove));
    [0.5, 0.32, 0.18].forEach((al, j) => {
      const k = easeOut4(clamp01((t - (j + 1) * 50) / TAKUTO_T.dashMove)), a = al * fade * (u.alpha == null ? 1 : u.alpha);
      if (a < 0.02 || t < (j + 1) * 50) return;
      out.push({ ...u, rx: lerp(e.from.x, e.to.x, k), ry: lerp(e.from.y, e.to.y, k), ox: 0, oy: 0, hz: 0, sq: 0, alpha: a, noBar: true, isMe: false, isActor: false, tag: null, reticle: null, hovered: false, hitT: 0, ghostOf: u.id });
    });
  }
  return out;
}

// =================================================================== ค้างบนตัว: ดาบลอย / ดาบแห่งการพิพากษา / ออร่าช่วงพังทลาย
//  takutos = [{ id, x, y, size, emerald, sapphire, judgment, collapse }] · ตามหมากที่กำลังเดิน (units rx/ry/hz)
//  ใส่ลง items ของ drawFrame (เรียงความลึก): ดาบแห่งการพิพากษา/ออร่า = หลังหมาก · ดาบข้างตัว = หน้าหมาก
const fxOn = (fx, now, pred) => fx.some((e) => e && pred(e) && now - e.t0 >= 0 && now - e.t0 < (e.dur || TAKUTO_FX_DUR[e.kind] || 0));
export function takutoItems(items, g, takutos, units, fx, now, lowQ) {
  if (!Array.isArray(takutos) || !takutos.length) return;
  for (const c of takutos) {
    const n = Math.max(1, c.size | 0), u = units.find((it) => it.id === c.id && !it.corpse);
    const rx = u ? u.rx + (u.ox || 0) : c.x, ry = u ? u.ry + (u.oy || 0) : c.y;
    const al = u && u.alpha != null ? u.alpha : 1;
    if (al < 0.05) continue;
    const A = bodyAt(rx, ry, n, u ? u.hz || 0 : 0), d = depthOf(rx + n / 2, ry + n / 2);
    const busy = (pred) => fxOn(fx, now, (e) => (e.id === c.id || e.by === c.id) && pred(e));
    const merging = busy((e) => e.kind === "takutoMerge" && now - e.t0 < MERGE_SHOW * TAKUTO_FX_DUR.takutoMerge);
    const showJ = c.judgment && !merging && !busy((e) => e.kind === "takutoJudgment");
    // ดาบที่ออกไปฟันในฉากตี/ฉากเรียก = ไม่วาดซ้ำที่ข้างตัว
    const showE = c.emerald && !c.judgment && !merging && !busy((e) => (e.kind === "takutoSummon" && e.sword !== "sapphire") || e.kind === "takutoEmerald" || e.kind === "takutoDual" || e.kind === "takutoFlash");
    const showS = c.sapphire && !c.judgment && !merging && !busy((e) => (e.kind === "takutoSummon" && e.sword === "sapphire") || e.kind === "takutoSapphire" || e.kind === "takutoDual" || e.kind === "takutoFlash");
    const pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 520);
    if (c.collapse || showJ) {
      items.push({ d: d - 0.0015, f: () => {
        g.save(); g.globalAlpha *= al;
        if (c.collapse) {
          g.globalCompositeOperation = "lighter";
          glow(g, A.bx, A.hy, A.r * 2.1, RED, 0.2 + 0.1 * pulse);
          groundRing(g, A.cx, A.cy, n * 0.62 + 0.04 * pulse, RED, 0.45 + 0.2 * pulse, 2);
          g.globalCompositeOperation = "source-over";
        }
        if (showJ) { const sp = swordSpot(A, "judgment", now); drawSword(g, sp.x, sp.y, sp.ang, sp.L, PAL.judgment, 1, { big: true, glow: 0.55 + 0.25 * pulse }); }
        g.restore();
      } });
    }
    if (showE || showS || (c.collapse && !lowQ)) {
      items.push({ d: d + 0.0015, f: () => {
        g.save(); g.globalAlpha *= al;
        for (const [on, kind] of [[showE, "emerald"], [showS, "sapphire"]]) {
          if (!on) continue;
          const sp = swordSpot(A, kind, now), pal = PAL[kind];
          drawSword(g, sp.x, sp.y, sp.ang, sp.L, pal, 1, { glow: 0.55 + 0.3 * pulse });
          if (!lowQ) {
            // ละอองโคจรรอบใบดาบ
            g.globalCompositeOperation = "lighter";
            for (let i = 0; i < 3; i++) {
              const a = (REDUCED ? 0 : now / 700) + (i / 3) * TAU + (kind === "sapphire" ? 1 : 0), m = 0.25 + 0.3 * i;
              const bx = sp.x + Math.cos(sp.ang) * sp.L * m, by = sp.y + Math.sin(sp.ang) * sp.L * m;
              twinkle(g, bx + Math.cos(a) * sp.L * 0.16, by + Math.sin(a) * sp.L * 0.06, sp.L * 0.045 * (0.6 + 0.4 * Math.sin(now / 200 + i)), 0.85, pal.sp);
            }
            g.globalCompositeOperation = "source-over";
          }
        }
        // ช่วงพังทลาย: ถ่านแดงลอยขึ้นรอบตัว
        if (c.collapse && !lowQ && !REDUCED) {
          g.globalCompositeOperation = "lighter";
          for (let i = 0; i < 8; i++) {
            const u2 = ((now / 2400) + hash01(i + 3)) % 1, a = hash01(i + 9) * TAU, rr = n * (0.4 + 0.25 * hash01(i));
            const p = P(A.cx + Math.cos(a) * rr, A.cy + Math.sin(a) * rr, 0.2 + u2 * n * 1.1);
            g.fillStyle = rgba(i % 2 ? RED : HOT, 0.8 * Math.sin(Math.PI * u2)); g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.025), 0, TAU); g.fill();
          }
          g.globalCompositeOperation = "source-over";
        }
        g.restore();
      } });
    }
  }
}

// =================================================================== socket "takutoFx" → ของที่ BoardStage เล่น
//  ctx = { posOf(id), sizeOf(id), idsOn(tiles, ownerId) } · คืน { fx, look: [[pos, ms]], shake: [ms], busy: [{ id, ms }], later: [[ms, fx[]]] }
export function takutoEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], busy: [], later: [] };
  if (!ev || typeof ev !== "object") return out;
  const kind = TAKUTO_EVENT_FX[ev.kind];
  if (!kind) return out;
  const posOf = (id) => { const p = id != null && typeof ctx.posOf === "function" ? ctx.posOf(id) : null; return okT(p) ? ptOf(p) : null; };
  const sizeOf = (id) => (id != null && typeof ctx.sizeOf === "function" ? Math.max(1, ctx.sizeOf(id) | 0) : 1);
  const idsOn = (tiles) => (typeof ctx.idsOn === "function" ? ctx.idsOn(tiles, ev.id) : []);
  const tilesOf = (list) => (Array.isArray(list) ? list.filter(okT).map(ptOf) : []);
  const at = okT(ev.at) ? ptOf(ev.at) : posOf(ev.id);
  const size = Number(ev.size) > 0 ? ev.size | 0 : sizeOf(ev.id);
  const base = { id: ev.id, color: ev.color || null, size };
  const mid = (p, n) => ({ x: p.x + Math.floor((n - 1) / 2), y: p.y + Math.floor((n - 1) / 2) });
  switch (ev.kind) {
    case "tauburn":
    case "summon":
    case "merge":
    case "vanish":
    case "heal": {
      if (!at) break;
      const f = { ...base, kind, x: at.x, y: at.y, sword: ev.sword || null };
      if (ev.kind === "heal") {
        f.big = !!ev.big; f.amt = ev.amt | 0;
        if (f.big) f.dur = HEAL_BIG_MS;
        const src = okT(ev.from) ? ptOf(ev.from) : posOf(ev.targetId);
        if (src && !f.big) { f.from = src; f.fromSize = sizeOf(ev.targetId); }
      }
      out.fx.push(f);
      out.look.push([mid(at, size), 0]);
      if (ev.kind === "tauburn") out.shake.push(60);
      break;
    }
    case "dash": {
      const from = okT(ev.from) ? ptOf(ev.from) : null, to = okT(ev.to) ? ptOf(ev.to) : at;
      if (!from || !to) break;
      out.fx.push({ ...base, kind, x: to.x, y: to.y, from, to, dir: ev.dir || null });
      out.busy.push({ id: ev.id, ms: TAKUTO_FX_DUR.takutoDash + 150 });
      out.look.push([mid(to, size), 0]);
      break;
    }
    case "flash": {
      const from = okT(ev.from) ? ptOf(ev.from) : at;
      if (!from) break;
      const to = okT(ev.to) ? ptOf(ev.to) : from;
      const tFrom = okT(ev.targetFrom) ? ptOf(ev.targetFrom) : posOf(ev.targetId), tTo = okT(ev.targetTo) ? ptOf(ev.targetTo) : null, tSize = sizeOf(ev.targetId);
      out.fx.push({
        ...base, kind, x: from.x, y: from.y, from, to, dir: ev.dir || null, tiles: tilesOf(ev.tiles),
        targetId: ev.targetId ?? null, targetFrom: tFrom, targetTo: tTo, tSize,
        hitIds: [...new Set([...idsOn(tilesOf(ev.tiles)), ...(ev.targetId != null ? [ev.targetId] : [])])], hitDelay: TAKUTO_T.flashHit,
      });
      out.busy.push({ id: ev.id, ms: TAKUTO_FX_DUR.takutoFlash + 150 });
      if (ev.targetId != null) out.busy.push({ id: ev.targetId, ms: TAKUTO_FX_DUR.takutoFlash + 150 });
      out.look.push([tFrom ? mid(tFrom, tSize) : mid(from, size), 0]);
      if (tTo) out.look.push([mid(tTo, tSize), TAKUTO_T.flashSwap]);
      out.shake.push(TAKUTO_T.flashHit);
      break;
    }
    case "missile": {
      if (!at || !DIRV[ev.dir]) break;
      const tiles = tilesOf(ev.tiles);
      out.fx.push({ ...base, kind, x: at.x, y: at.y, dir: ev.dir, tiles, hitIds: idsOn(tiles), hitDelay: TAKUTO_T.missileReach - 120 });
      const v = DIRV[ev.dir], c = mid(at, size);
      out.look.push([c, 0]);
      out.look.push([{ x: c.x + v[0] * 5, y: c.y + v[1] * 5 }, TAKUTO_T.missileFire]);
      out.shake.push(TAKUTO_T.missileFire, TAKUTO_T.missileReach);
      break;
    }
    case "steal": {
      if (!at) break;
      const from = okT(ev.from) ? ptOf(ev.from) : posOf(ev.targetId);
      if (!from) break;
      out.fx.push({ ...base, kind, x: at.x, y: at.y, from, fromSize: sizeOf(ev.targetId), amt: ev.amt | 0, extra: ev.extra | 0 });
      out.look.push([mid(at, size), 0]);
      break;
    }
    case "blast": {
      if (!at) break;
      const tiles = tilesOf(ev.tiles);
      const c = { x: at.x + size / 2, y: at.y + size / 2 };
      const rMax = tiles.length ? Math.max(...tiles.map((tl) => Math.hypot(tl.x + 0.5 - c.x, tl.y + 0.5 - c.y))) + 0.6 : size / 2 + (ev.range | 0 || 8);
      out.fx.push({ ...base, kind, x: at.x, y: at.y, range: ev.range | 0, tiles, rMax, hitIds: idsOn(tiles), hitDelay: TAKUTO_T.blastHit - 60 });
      out.look.push([mid(at, size), 0]);
      out.shake.push(TAKUTO_T.blastBoom, TAKUTO_T.blastHit);
      break;
    }
    default: break;
  }
  return out;
}

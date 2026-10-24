// ============================================================
//  เอฟเฟกต์บนกระดานของเฟิร์น (characters/fern.js · GRID_PLAN §7.14) — เวทแบบ Frieren: ขาวอมฟ้า ขอบม่วงเข้ม
//
//  ตีปกติ Zoltraak (attackStyle — STYLE_MS ใน boardDraw) · fx { x, y (ช่องผู้ตี), size, to, lane: [{ x, y }] }
//   "fernZoltraak"    = วงเวทเล็กกางหน้ามือ → ลำแสงขาวเรียวพุ่งตามแนว (3 ช่อง · เพิ่มระยะ = 6 ช่อง · ทะลุทุกอย่าง) → ประกายปะทะทุกช่อง
//   "fernZoltraakMax" = ครั้งเสริมพลัง (ทะลุเกราะ): วงเวท 3 ชั้นซ้อนตามแนวยิง · ลำแสงหนา แกนขาวอมม่วง · เกลียวพลัง · คลื่นกระแทกทุกช่อง
//   ลำแสงถึงช่องไกลสุดของแนว = จังหวะปะทะ (FERN_HIT_P) · ไม่มี lane = ยิงตรงไปที่ to
//  เหตุการณ์ (socket "fernFx" { kind, at, id } → FERN_EVENT_FX):
//   cast (ร่ายต่อเนื่อง: วงเวทคู่กระเพื่อม) · boost (เพิ่มระยะ: วงเวทใต้ตัว + เส้นอักษรวิ่งยืดออก 6 ช่องทั้ง 4 ทิศ)
//   conceal (ซ่อนเร้นมานา: ออร่าหดเข้าตัว — เจ้าของเห็นคนเดียว) · unveil (ออกจากซ่อนเร้น: ออร่าปะทุกลับ)
//   shield (ผู้เชี่ยวชาญเวทมนต์พื้นฐาน กันได้: โดมหกเหลี่ยมโปร่งแสง)
//   empower (ตีครบ 4 ครั้ง: ละอองม่วงขาวไหลเข้าปลายคทา + วงเรืองรอบตัว) · reset (ครั้งเสริมพลัง จบ: หน้าปัดอักษร เข็มหมุนย้อน → วงหดแล้วปะทุ)
//  ค้างบนตัว (prop ferns ของ BoardCanvas · [{ id, x, y, size, empowered, boost }] จาก p.fern):
//   drawFernAir (หลังตัวละคร) = แสงที่ปลายคทา — empowered = ม่วงขาว + ละอองโคจร · boost = ฟ้าซีด + วงขีดอักษรเล็กหมุน
//  lowQ = ตัดอนุภาค/ชั้นเรืองครึ่งหนึ่งขึ้นไป · ลดการเคลื่อนไหว = ของที่วนตลอดหยุดนิ่ง เอฟเฟกต์ครั้งเดียวยังเล่น
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ ----------
// ร่าย/ชาร์จ 1.5 วิก่อนปะทะ ให้ตรงไฟล์เสียง "ZOLTRAAK FIre" (ระเบิดที่ 1.50 วิของไฟล์) — BoardStage เล่นเสียงก่อนปะทะ FERN_SFX_LEAD
//  server ยืดฉากตีให้ 1 วิ (characters/fern.js attackFxExtra)
export const FERN_SFX_LEAD = 1500;
export const FERN_MS = { fernZoltraak: 2400, fernZoltraakMax: 2700 };
export const FERN_HIT_P = { fernZoltraak: 0.625, fernZoltraakMax: 0.556 }; // 1500 ms = ลำแสงถึงช่องไกลสุดของแนว
export const FERN_FX_DUR = {
  ...FERN_MS, fernCast: 850, fernBoost: 1000, fernConceal: 950, fernUnveil: 850, fernShield: 900, fernEmpower: 1300, fernReset: 1100,
};
export const isFernFx = (kind) => typeof kind === "string" && (kind in FERN_FX_DUR);
export const FERN_EVENT_FX = {
  cast: "fernCast", boost: "fernBoost", conceal: "fernConceal", unveil: "fernUnveil", shield: "fernShield", empower: "fernEmpower", reset: "fernReset",
};
// เสียงของแต่ละเหตุการณ์ — เกมจริง server ส่งเอง (characters/fern.js engine.sfx) · ตารางนี้ใช้แค่หน้า dev (FernFxDev)
export const FERN_EVENT_SFX = {
  cast: "fern_cast", boost: "fern_boost", conceal: "fern_conceal", unveil: "fern_unveil", shield: "fern_shield",
};

// ---------- สี (r,g,b) ----------
const WHITE = "255,255,255", PALE = "196,230,255", BLUE = "120,176,255", VIOLET = "150,112,236";
const DVIOLET = "58,30,118", LILAC = "198,168,255", VWHITE = "242,232,255";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const P3 = (v) => P(v[0], v[1], v[2]);
const FLAT = [[1, 0, 0], [0, 1, 0]];
// วงกลมในอากาศ/บนพื้น: จุด = c + A·cos·r + B·sin·r
function ring3(g, c, r, A, B, n = 40, a0 = 0, a1 = TAU) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (a1 - a0), p = P3(add3(add3(c, A, Math.cos(a) * r), B, Math.sin(a) * r));
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
}
const onRing = (c, r, A, B, a) => P3(add3(add3(c, A, Math.cos(a) * r), B, Math.sin(a) * r));

// ---------- วงเวท ----------
//  c = กลางวง (x, y, z) · A, B = แกนระนาบวง · r = รัศมี (ช่อง) · rot = มุมหมุน · k = ความสว่าง 0..1
//  ชั้นล่างม่วงเข้ม (source-over — ให้เห็นบนพื้นสว่าง) → เส้นขาวฟ้าแบบ lighter
//  rings: 1 = วงเดียว + ดาว 6 แฉก · 2 = + วงอักษรรอบนอก · 3 = + วงนอกสุดหมุนสวน
function sigil(g, c, A, B, r, rot, k, lowQ, rings = 2, crack = 0) {
  if (k <= 0.01 || r <= 0.01) return;
  const sc = P3(c)[2], lw = Math.max(1, sc * 0.018);
  const gap = (a) => crack > 0 && Math.sin(a * 7 + 1.3) > 1 - crack * 1.6; // ร้าว: ตัดช่วงของวงออก
  const arcs = (rr, n) => {
    if (!crack) { ring3(g, c, rr, A, B, n); return; }
    g.beginPath();
    let on = false;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU, p = onRing(c, rr, A, B, a);
      if (gap(a)) { on = false; continue; }
      if (on) g.lineTo(p[0], p[1]); else { g.moveTo(p[0], p[1]); on = true; }
    }
  };
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // ชั้นเงาม่วงเข้ม (ขอบ)
  if (!lowQ) {
    g.globalCompositeOperation = "source-over";
    arcs(r, 56); g.strokeStyle = `rgba(${DVIOLET},${0.35 * k})`; g.lineWidth = lw * 4.5; g.stroke();
  }
  g.globalCompositeOperation = "lighter";
  // วงหลัก + วงใน
  arcs(r, 56); g.strokeStyle = `rgba(${PALE},${0.9 * k})`; g.lineWidth = lw * 1.6; g.stroke();
  g.strokeStyle = `rgba(${WHITE},${0.8 * k})`; g.lineWidth = lw * 0.7; g.stroke();
  arcs(r * 0.8, 48); g.strokeStyle = `rgba(${BLUE},${0.85 * k})`; g.lineWidth = lw; g.stroke();
  // ดาว 6 แฉก (สามเหลี่ยมซ้อน 2 รูป) หมุนตาม rot
  g.beginPath();
  for (let t = 0; t < 2; t++) for (let i = 0; i <= 3; i++) {
    const p = onRing(c, r * 0.8, A, B, rot + t * Math.PI / 3 + (i % 3) * TAU / 3);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.strokeStyle = `rgba(${PALE},${0.75 * k})`; g.lineWidth = lw * 0.9; g.stroke();
  // วงกลางเล็ก
  ring3(g, c, r * 0.28, A, B, 24); g.strokeStyle = `rgba(${WHITE},${0.7 * k})`; g.lineWidth = lw * 0.8; g.stroke();
  if (rings >= 2) {
    // วงอักษร: ขีดสั้นสลับยาวระหว่าง r กับ 1.14r หมุนสวนทาง
    const r2 = r * 1.16;
    arcs(r2, 60); g.strokeStyle = `rgba(${PALE},${0.7 * k})`; g.lineWidth = lw * 0.9; g.stroke();
    g.beginPath();
    const N = lowQ ? 16 : 28;
    for (let i = 0; i < N; i++) {
      const a = -rot * 0.6 + (i / N) * TAU;
      if (gap(a)) continue;
      const p0 = onRing(c, r * 1.02, A, B, a), p1 = onRing(c, i % 3 === 0 ? r2 * 0.99 : r * 1.09, A, B, a);
      g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    }
    g.strokeStyle = `rgba(${WHITE},${0.65 * k})`; g.lineWidth = lw * 0.8; g.stroke();
  }
  if (rings >= 3) {
    const r3 = r * 1.36;
    arcs(r3, 64); g.strokeStyle = `rgba(${VIOLET},${0.75 * k})`; g.lineWidth = lw * 1.1; g.stroke();
    // จุดแสง 6 จุดบนวงนอกสุด
    for (let i = 0; i < 6; i++) {
      const p = onRing(c, r3, A, B, rot * 0.8 + (i / 6) * TAU);
      g.fillStyle = `rgba(${WHITE},${0.9 * k})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1.4, sc * 0.03), 0, TAU); g.fill();
    }
  }
  g.restore();
}

// ลำแสงเรียว (จอ): a → b · ra/rb = ครึ่งความกว้าง px ที่ปลายแต่ละข้าง · layers = [[ตัวคูณ, rgb, alpha, lighter?]]
function taper(g, a, b, ra, rb, layers, k) {
  const vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy) || 1, nx = -vy / L, ny = vx / L;
  for (const [m, rgb, al, light] of layers) {
    g.globalCompositeOperation = light ? "lighter" : "source-over";
    g.fillStyle = `rgba(${rgb},${al * k})`;
    g.beginPath();
    g.moveTo(a[0] + nx * ra * m, a[1] + ny * ra * m); g.lineTo(b[0] + nx * rb * m, b[1] + ny * rb * m);
    g.lineTo(b[0] - nx * rb * m, b[1] - ny * rb * m); g.lineTo(a[0] - nx * ra * m, a[1] - ny * ra * m); g.closePath(); g.fill();
    // หัวมน
    g.beginPath(); g.arc(b[0], b[1], rb * m, 0, TAU); g.fill();
  }
}
const BEAM_LAYERS = [[3.4, DVIOLET, 0.16, 0], [2.3, VIOLET, 0.22, 0], [1.55, BLUE, 0.5, 1], [1, PALE, 0.75, 1], [0.5, WHITE, 1, 1]];
const BEAM_LAYERS_LOW = [[2.3, VIOLET, 0.28, 0], [1.2, PALE, 0.8, 1], [0.5, WHITE, 1, 1]];
// ครั้งเสริมพลัง: หนากว่า ขอบม่วงกว้าง แกนขาวอมม่วง
const MAX_LAYERS = [[4.4, DVIOLET, 0.2, 0], [3.1, VIOLET, 0.3, 0], [2.1, LILAC, 0.5, 1], [1.35, PALE, 0.75, 1], [0.75, VWHITE, 1, 1], [0.36, WHITE, 1, 1]];
const MAX_LAYERS_LOW = [[3, VIOLET, 0.32, 0], [1.4, LILAC, 0.75, 1], [0.6, WHITE, 1, 1]];

// ประกายแตกกระจาย (จอ) รอบจุด c · age 0..1
function sparks(g, c, age, seed, n, size, lowQ) {
  if (age < 0 || age > 1) return;
  const [cx, cy, sc] = P3(c), k = 1 - age, N = lowQ ? Math.ceil(n / 2) : n;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  if (age < 0.35) glow(g, cx, cy, sc * size * (0.5 + age), PALE, 0.8 * (1 - age / 0.35));
  for (let i = 0; i < N; i++) {
    const a = hash01(seed + i) * TAU, sp = 0.5 + hash01(seed + i * 3.7) * 0.8, d0 = sc * size * easeOut3(age) * sp, d1 = d0 * 0.55;
    g.strokeStyle = `rgba(${i % 3 ? PALE : WHITE},${k})`; g.lineWidth = Math.max(1, sc * 0.022 * k);
    g.beginPath(); g.moveTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1 * 0.8); g.lineTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0 * 0.8); g.stroke();
  }
  g.restore();
}

// ---------- Zoltraak ----------
//  ค่าต่อท่า: wind = ช่วงกางวงเวท · hold/fade = ลำแสงเต็มถึง hold แล้วเรียวหายถึง fade (สัดส่วนของ FERN_MS) · w = ความกว้างลำ
const Z_HAND = 0.85;
const Z_KIND = {
  fernZoltraak: { wind: 0.575, hold: 0.76, fade: 0.95, w: 0.075, sig: 0.3, max: false },
  fernZoltraakMax: { wind: 0.51, hold: 0.7, fade: 0.94, w: 0.13, sig: 0.42, max: true },
};
function zoltraak(g, e, now, lowQ) {
  const Z = Z_KIND[e.kind], D = FERN_MS[e.kind], HIT = FERN_HIT_P[e.kind], WIND = Z.wind;
  const t = (now - e.t0) / D;
  if (t <= 0 || t >= 1) return;
  const n0 = Math.max(1, e.size | 0);
  const ox = e.x + n0 / 2, oy = e.y + n0 / 2;
  const laneIn = Array.isArray(e.lane) ? e.lane.filter((l) => l && Number.isFinite(l.x) && Number.isFinite(l.y)) : [];
  const lane = laneIn.length ? laneIn : null;
  const tn = lane ? 1 : Math.max(1, e.toSize | 0);
  const aim = lane ? lane[lane.length - 1] : e.to || { x: e.x, y: e.y - 1 };
  let fx = aim.x + tn / 2 - ox, fy = aim.y + tn / 2 - oy;
  // ทิศแนวตรง (lane) = แกนหลัก · ไม่มี lane = เวกเตอร์จริง
  if (lane) { if (Math.abs(fx) >= Math.abs(fy)) { fx = Math.sign(fx) || 1; fy = 0; } else { fy = Math.sign(fy) || 1; fx = 0; } }
  const dl = Math.hypot(fx, fy) || 1, f = [fx / dl, fy / dl, 0];
  const proj = (tl) => Math.abs((tl.x + 0.5 - ox) * f[0] + (tl.y + 0.5 - oy) * f[1]);
  // ปลายลำ = ช่องไกลสุดของแนว (3 หรือ 6 ช่อง — ไม่พึ่งลำดับใน lane)
  const reach = lane ? lane.reduce((m, tl) => Math.max(m, proj(tl)), 0) + 0.45 : dl;
  const s = [-f[1], f[0], 0], up = [0, 0, 1];
  const start = n0 / 2 * 0.85 + 0.05;
  const O = [ox + f[0] * start, oy + f[1] * start, Z_HAND];
  const rot = (REDUCED ? 0 : now / (Z.max ? 110 : 140)) + e.t0 * 0.001;
  const wq = Math.min(1, t / WIND);
  // วงเวทหน้ามือ (ระนาบตั้งฉากกับทิศยิง) · Max = วงที่ 2/3 ซ้อนตามแนวยิง + วงใต้เท้า
  const sk = t < WIND ? easeOut3(t / WIND) : t < Z.hold + 0.1 ? 1 : clamp01(1 - (t - Z.hold - 0.1) / (1 - Z.hold - 0.1));
  sigil(g, O, s, up, Z.sig * (0.4 + 0.6 * wq), rot, sk, lowQ, Z.max ? 3 : 2);
  if (Z.max) {
    const a2 = clamp01((t - WIND * 0.35) / (WIND * 0.65)), a3 = clamp01((t - WIND * 0.6) / (WIND * 0.4));
    if (a2 > 0) sigil(g, add3(O, f, 0.32), s, up, Z.sig * 0.78 * easeOut3(a2), -rot * 1.4, sk * a2, lowQ, 2);
    if (a3 > 0 && !lowQ) sigil(g, add3(O, f, 0.6), s, up, Z.sig * 0.56 * easeOut3(a3), rot * 1.9, sk * a3, lowQ, 1);
    sigil(g, [ox, oy, 0.03], FLAT[0], FLAT[1], 0.62 * n0 * (0.5 + 0.5 * wq), -rot * 0.6, sk * 0.85, lowQ, 2);
    // ละอองม่วงขาวไหลเข้าวงหน้ามือระหว่างชาร์จ
    if (t < WIND && !lowQ) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 14; i++) {
        const q = clamp01(wq * 1.3 - hash01(i + 41) * 0.3), a = hash01(i + 5) * TAU, r = 0.9 * (1 - easeIn2(q));
        const p = P3(add3(add3(O, s, Math.cos(a) * r), up, Math.sin(a) * r));
        g.fillStyle = `rgba(${i % 2 ? LILAC : WHITE},${Math.sin(Math.PI * q)})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1.1, p[2] * 0.025), 0, TAU); g.fill();
      }
      g.restore();
    }
  }
  // ตีปกติ: ละอองฟ้าขาวไหลเข้าวงหน้ามือระหว่างร่าย (Max มีชุดของตัวเองด้านบน)
  if (!Z.max && t < WIND && !lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) {
      const q = clamp01(wq * 1.3 - hash01(i + 61) * 0.3), a = hash01(i + 17) * TAU, r = 0.7 * (1 - easeIn2(q));
      const p = P3(add3(add3(O, s, Math.cos(a) * r), up, Math.sin(a) * r));
      g.fillStyle = `rgba(${i % 2 ? PALE : WHITE},${Math.sin(Math.PI * q)})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.02), 0, TAU); g.fill();
    }
    g.restore();
  }
  if (t < WIND) {
    const [px, py, ps] = P3(O);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, px, py, ps * (Z.max ? 0.55 : 0.35) * (t / WIND), Z.max ? LILAC : PALE, 0.6); g.restore();
    return;
  }
  // หัวลำแสง: วิ่งถึงปลายแนวตอน HIT
  const u = clamp01((t - WIND) / (HIT - WIND)), d = start + (reach - start) * (t < HIT ? easeIn2(u) * 0.35 + u * 0.65 : 1);
  const H = [ox + f[0] * d, oy + f[1] * d, Z_HAND];
  // ความกว้าง: เต็มช่วง HIT–hold แล้วเรียวลงจนหายที่ fade
  const wK = t < HIT ? 0.75 + 0.25 * u : t < Z.hold ? 1 : clamp01(1 - (t - Z.hold) / (Z.fade - Z.hold));
  const flick = REDUCED ? 1 : 0.9 + 0.1 * Math.sin(now / 23);
  const surge = Z.max && t >= HIT && t < HIT + 0.08 ? 1 + 0.35 * (1 - (t - HIT) / 0.08) : 1; // ปะทะ = ลำพองวาบ
  if (wK > 0.01) {
    const a = P3(O), b = P3(H), base = Z.w * wK * flick * surge;
    g.save();
    taper(g, a, b, a[2] * base, b[2] * base, Z.max ? (lowQ ? MAX_LAYERS_LOW : MAX_LAYERS) : (lowQ ? BEAM_LAYERS_LOW : BEAM_LAYERS), 1);
    if (!lowQ) {
      g.globalCompositeOperation = "lighter";
      // ละอองไหลตามลำ
      const NP = Z.max ? 16 : 10;
      for (let i = 0; i < NP; i++) {
        const q = ((now / 260) + hash01(i + 3)) % 1, dd = start + (d - start) * q, off = (hash01(i + 9) - 0.5) * (Z.max ? 0.3 : 0.16);
        const p = P(ox + f[0] * dd + s[0] * off, oy + f[1] * dd + s[1] * off, Z_HAND + (hash01(i + 20) - 0.5) * (Z.max ? 0.26 : 0.14));
        g.fillStyle = `rgba(${WHITE},${0.8 * wK})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.02), 0, TAU); g.fill();
      }
      // Max: เกลียวพลัง 2 เส้นพันรอบลำ
      if (Z.max) {
        for (let c = 0; c < 2; c++) {
          g.beginPath();
          const N = Math.max(12, Math.round((d - start) * 14));
          for (let i = 0; i <= N; i++) {
            const q = i / N, dd = start + (d - start) * q, th = dd * 5.5 + c * Math.PI - (REDUCED ? 0 : now / 55), rr = 0.17 * wK;
            const p = P3(add3(add3([ox + f[0] * dd, oy + f[1] * dd, Z_HAND], s, Math.cos(th) * rr), up, Math.sin(th) * rr));
            if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
          }
          g.strokeStyle = `rgba(${c ? LILAC : WHITE},${0.7 * wK})`; g.lineWidth = 1.6; g.stroke();
        }
      }
    }
    // หัวลำแสงเรือง (ขณะวิ่ง)
    if (t < HIT + 0.08) { g.globalCompositeOperation = "lighter"; glow(g, b[0], b[1], b[2] * (Z.max ? 0.65 : 0.42), Z.max ? VWHITE : PALE, 0.9 * (t < HIT ? 1 : 1 - (t - HIT) / 0.08)); }
    // แสงวาบที่ปากวงเวทตอนปล่อย
    if (t < WIND + 0.12) { g.globalCompositeOperation = "lighter"; glow(g, a[0], a[1], a[2] * (Z.max ? 0.85 : 0.55), WHITE, 0.8 * (1 - (t - WIND) / 0.12)); }
    g.restore();
  }
  // ประกายปะทะ + รอยไหม้ฟ้าบนพื้น ทุกช่องที่ลำแสงผ่าน (ไม่มี lane = ช่องเป้า) · Max = คลื่นกระแทก 2 วง + ประกายใหญ่
  const tiles = lane || [{ x: aim.x, y: aim.y }];
  tiles.forEach((tl, i) => {
    const td = proj(tl);
    const hitAt = WIND + (HIT - WIND) * clamp01(lane ? (td - start) / (reach - start) : 1);
    const age = (t - hitAt) / (Z.max ? 0.4 : 0.45);
    if (age < 0) return;
    const cx = tl.x + (lane ? 0.5 : tn / 2), cy = tl.y + (lane ? 0.5 : tn / 2);
    sparks(g, [cx, cy, Z_HAND], age, i * 13 + 7, Z.max ? 14 : 9, Z.max ? 0.8 : 0.55, lowQ);
    if (age < 1) {
      g.save(); g.globalCompositeOperation = "lighter";
      gEllipse(g, cx, cy, 0.18 + (Z.max ? 0.55 : 0.32) * easeOut3(age), 0.02, 28); g.strokeStyle = `rgba(${PALE},${0.7 * (1 - age)})`; g.lineWidth = Z.max ? 2.4 : 1.6; g.stroke();
      if (Z.max) {
        const a2 = clamp01(age * 1.25 - 0.15);
        if (a2 > 0 && a2 < 1) { gEllipse(g, cx, cy, 0.25 + 0.85 * easeOut3(a2), 0.03, 32); g.strokeStyle = `rgba(${LILAC},${0.75 * (1 - a2)})`; g.lineWidth = 1.8; g.stroke(); }
        if (age < 0.3) { const [px, py, ps] = P(cx, cy, 0.5); glow(g, px, py, ps * 0.7, VWHITE, 0.7 * (1 - age / 0.3)); }
      }
      g.restore();
    }
  });
  // Max: คลื่นกระแทกใหญ่ที่ปลายแนว
  if (Z.max && t >= HIT) {
    const q = clamp01((t - HIT) / 0.4);
    if (q < 1) {
      const ex = ox + f[0] * (reach - 0.45), ey = oy + f[1] * (reach - 0.45);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let j = 0; j < (lowQ ? 1 : 2); j++) {
        const qq = clamp01(q * 1.2 - j * 0.2);
        if (qq <= 0 || qq >= 1) continue;
        gEllipse(g, ex, ey, 0.4 + 1.5 * easeOut3(qq), 0.03, 48);
        g.strokeStyle = `rgba(${j ? VIOLET : VWHITE},${0.85 * (1 - qq)})`; g.lineWidth = 3.2 * (1 - qq) + 1; g.stroke();
      }
      g.restore();
    }
  }
}

// ---------- เหตุการณ์ครั้งเดียว ----------
const pos = (e) => [e.x + 0.5, e.y + 0.5];
// ร่ายต่อเนื่อง: วงเวทบนพื้นกระเพื่อม 2 ครั้ง (0 / 0.2 วิ) + วงลอยขึ้น
function castFx(g, e, t, lowQ) {
  const [cx, cy] = pos(e), rot = t / 300;
  for (let j = 0; j < 2; j++) {
    const q = (t - j * 200) / 600;
    if (q < 0 || q > 1) continue;
    const k = q < 0.2 ? q / 0.2 : 1 - (q - 0.2) / 0.8;
    sigil(g, [cx, cy, 0.03], FLAT[0], FLAT[1], 0.45 + 0.35 * easeOut3(q), rot * (j ? -1 : 1), k, lowQ, j ? 1 : 2);
    if (!lowQ) {
      g.save(); g.globalCompositeOperation = "lighter";
      gEllipse(g, cx, cy, 0.5 + 0.3 * easeOut3(q), 0.25 + 1.0 * q, 36); g.strokeStyle = `rgba(${PALE},${0.6 * (1 - q)})`; g.lineWidth = 1.5; g.stroke();
      g.restore();
    }
  }
  const [px, py, ps] = P(cx, cy, 0.9), k = 1 - t / FERN_FX_DUR.fernCast;
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, px, py, ps * 0.5, PALE, 0.35 * k); g.restore();
}
// ออร่ามานา (ทรงกระบอกเรือง + ละอองรอบตัว) · r = รัศมี · k = ความสว่าง · inward = ละอองวิ่งเข้า (true) / ออก
function manaAura(g, cx, cy, r, k, q, inward, lowQ, seed) {
  if (k <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter";
  const [gx, gy, gs] = P(cx, cy, 0.7);
  glow(g, gx, gy, gs * r * 1.3, BLUE, 0.4 * k);
  glow(g, gx, gy, gs * r * 0.7, PALE, 0.35 * k);
  for (let z = 0; z <= 1; z++) {
    gEllipse(g, cx, cy, r, 0.05 + z * 1.2, 36); g.strokeStyle = `rgba(${z ? VIOLET : PALE},${(z ? 0.45 : 0.75) * k})`; g.lineWidth = 1.6; g.stroke();
  }
  const N = lowQ ? 10 : 22;
  for (let i = 0; i < N; i++) {
    const a = hash01(seed + i) * TAU + q * 1.5, rr = inward ? r * (1.6 - 1.5 * q) * (0.6 + 0.4 * hash01(i + 5)) : r * (0.2 + 1.6 * q) * (0.6 + 0.4 * hash01(i + 5));
    const p = P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.1 + hash01(i + 11) * 1.4);
    g.fillStyle = `rgba(${i % 2 ? WHITE : PALE},${k})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1.1, p[2] * 0.024), 0, TAU); g.fill();
  }
  g.restore();
}
function concealFx(g, e, t, lowQ) {
  const [cx, cy] = pos(e), q = clamp01(t / FERN_FX_DUR.fernConceal);
  manaAura(g, cx, cy, 0.85 * (1 - easeOut3(q)) + 0.06, q < 0.15 ? q / 0.15 : 1 - easeIn2((q - 0.15) / 0.85), q, true, lowQ, 31);
  // จุดแสงสุดท้ายยุบเข้าตัว
  if (q > 0.6) { const [px, py, ps] = P(cx, cy, 0.8); g.save(); g.globalCompositeOperation = "lighter"; glow(g, px, py, ps * 0.25 * (1 - q) * 2.5, WHITE, 0.8 * (1 - q) * 2.5); g.restore(); }
}
function unveilFx(g, e, t, lowQ) {
  const [cx, cy] = pos(e), q = clamp01(t / FERN_FX_DUR.fernUnveil);
  if (q < 0.18) { const [px, py, ps] = P(cx, cy, 0.8); g.save(); g.globalCompositeOperation = "lighter"; glow(g, px, py, ps * 0.9, WHITE, 0.9 * (1 - q / 0.18)); g.restore(); }
  manaAura(g, cx, cy, 0.25 + 0.9 * easeOut3(q), 1 - easeIn2(q), q, false, lowQ, 47);
  g.save(); g.globalCompositeOperation = "lighter";
  gEllipse(g, cx, cy, 0.3 + 1.4 * easeOut3(q), 0.03, 40); g.strokeStyle = `rgba(${PALE},${0.8 * (1 - q)})`; g.lineWidth = 2.2; g.stroke();
  g.restore();
}
// ผู้เชี่ยวชาญเวทมนต์พื้นฐาน (กันการโจมตี): โดมหกเหลี่ยมโปร่งแสง (ครึ่งทรงกลมรัศมี R) วาบขึ้นแล้วจาง + ระลอกจุดกระทบ
const DOME_R = 0.78;
const DOME_CELLS = (() => {
  const out = [];
  [[0.12, 12], [0.42, 11], [0.72, 8], [1.02, 5], [1.3, 1]].forEach(([el, n], j) => {
    for (let i = 0; i < n; i++) out.push([el, (i + (j % 2) * 0.5) / n * TAU]);
  });
  return out;
})();
function shieldFx(g, e, t, lowQ) {
  const [cx, cy] = pos(e), q = clamp01(t / FERN_FX_DUR.fernShield), R = DOME_R * (0.92 + 0.08 * easeOut3(Math.min(1, q * 4)));
  const k = q < 0.08 ? q / 0.08 : 1 - easeIn2((q - 0.08) / 0.92);
  const [ccx, ccy, cs] = P(cx, cy, R * 0.5), [, fy] = P(cx, cy, 0);
  g.save();
  // ตัวโดม: เรืองฟ้าโปร่ง (วงรีจอ) + ขอบ
  g.globalCompositeOperation = "lighter";
  const gr = g.createRadialGradient(ccx, ccy, cs * R * 0.2, ccx, ccy, cs * R * 1.15);
  gr.addColorStop(0, `rgba(${BLUE},${0.05 * k})`); gr.addColorStop(0.75, `rgba(${PALE},${0.22 * k})`); gr.addColorStop(1, `rgba(${PALE},0)`);
  g.fillStyle = gr; g.beginPath(); g.ellipse(ccx, ccy - cs * R * 0.1, cs * R * 1.15, cs * R * 1.05, 0, 0, TAU); g.fill();
  // เส้นขอบโดม (ขอบเงา = วงใหญ่สุดบนจอ) + ฐานบนพื้น
  gEllipse(g, cx, cy, R, 0.02, 40); g.strokeStyle = `rgba(${PALE},${0.8 * k})`; g.lineWidth = 2; g.stroke();
  const top = P(cx, cy, R)[1];
  g.beginPath(); g.ellipse(ccx, (top + fy) / 2, cs * R, (fy - top) / 2 + cs * R * 0.12, 0, Math.PI, TAU); g.strokeStyle = `rgba(${WHITE},${0.7 * k})`; g.lineWidth = 1.6; g.stroke();
  // ตาข่ายหกเหลี่ยมบนผิวโดม (ด้านหน้าสว่างกว่า)
  const cells = lowQ ? DOME_CELLS.filter((_, i) => i % 2 === 0) : DOME_CELLS;
  for (const [el, az] of cells) {
    const x = cx + Math.cos(az) * Math.cos(el) * R, y = cy + Math.sin(az) * Math.cos(el) * R, z = Math.sin(el) * R;
    const p = P(x, y, z), front = P(x, y)[1] >= fy - 0.5;
    const wave = clamp01(1 - Math.abs(q * 2.2 - (1.3 - el) / 1.3) * 2.5); // ระลอกวิ่งจากฐานขึ้นยอด
    const a = k * (front ? 0.75 : 0.3) + wave * 0.5 * k;
    const r = p[2] * 0.14 * (0.55 + 0.45 * Math.cos(el));
    g.beginPath();
    for (let i = 0; i <= 6; i++) { const th = i / 6 * TAU + az; const hx = p[0] + Math.cos(th) * r, hy = p[1] + Math.sin(th) * r * (0.55 + 0.45 * Math.sin(el + 0.4)); if (i) g.lineTo(hx, hy); else g.moveTo(hx, hy); }
    g.strokeStyle = `rgba(${front ? WHITE : PALE},${clamp01(a)})`; g.lineWidth = Math.max(1, p[2] * 0.016); g.stroke();
    if (wave > 0.3 && !lowQ) { g.fillStyle = `rgba(${PALE},${0.18 * wave * k})`; g.fill(); }
  }
  // แสงวาบตอนกัน
  if (q < 0.25) glow(g, ccx, ccy, cs * R * 1.4, WHITE, 0.55 * (1 - q / 0.25));
  g.restore();
}
// เพิ่มระยะ: วงเวทใต้ตัวกาง + เส้นอักษรวิ่งยืดออก 6 ช่องทั้ง 4 ทิศ (ขีดอักษรทุกครึ่งช่อง) แล้วจาง
const BOOST_LEN = 6;
function boostFx(g, e, t, lowQ) {
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2, q = clamp01(t / FERN_FX_DUR.fernBoost);
  const k = q < 0.12 ? q / 0.12 : q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
  sigil(g, [cx, cy, 0.03], FLAT[0], FLAT[1], (0.5 + 0.2 * easeOut3(Math.min(1, q * 3))) * n, t / 260, k, lowQ, 2);
  const r0 = n / 2 + 0.1, L = r0 + (n / 2 + BOOST_LEN - r0) * easeOut3(clamp01((q - 0.05) / 0.5));
  if (L <= r0 + 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const sx = -dy, sy = dx;
    const a = P(cx + dx * r0, cy + dy * r0, 0.04), b = P(cx + dx * L, cy + dy * L, 0.04);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
    g.strokeStyle = `rgba(${BLUE},${0.45 * k})`; g.lineWidth = Math.max(2, a[2] * 0.05); g.stroke();
    g.strokeStyle = `rgba(${WHITE},${0.85 * k})`; g.lineWidth = Math.max(1, a[2] * 0.014); g.stroke();
    // ขีดอักษร: ทุกครึ่งช่อง ยาวสลับสั้น (lowQ = ทุกช่อง)
    g.beginPath();
    for (let d = r0 + 0.5; d < L; d += lowQ ? 1 : 0.5) {
      const h = Math.round(d * 2) % 2 ? 0.07 : 0.14;
      const p0 = P(cx + dx * d + sx * h, cy + dy * d + sy * h, 0.04), p1 = P(cx + dx * d - sx * h, cy + dy * d - sy * h, 0.04);
      g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    }
    g.strokeStyle = `rgba(${PALE},${0.8 * k})`; g.lineWidth = 1.3; g.stroke();
    // หัวเส้น = จุดแสง
    glow(g, b[0], b[1], b[2] * 0.22, PALE, 0.9 * k);
  }
  g.restore();
}

// ปลายคทา (โลก) ของเฟิร์นที่ยืนกลางกล่อง (wx, wy) ขนาด n — ข้างขวาของตัว สูงกว่าหัวเล็กน้อย
const staffPt = (wx, wy, n) => [wx + 0.3 * n, wy + 0.05 * n, 1.55 * n];
// Zoltraak ครั้งเสริมพลัง พร้อม: ละอองม่วงขาวไหลจากรอบตัวเข้าปลายคทา + วงเรืองรอบตัวกางแล้วค้าง → วาบตอนรวมครบ
function empowerFx(g, e, t, lowQ) {
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2, q = clamp01(t / FERN_FX_DUR.fernEmpower);
  const S = staffPt(cx, cy, n);
  g.save(); g.globalCompositeOperation = "lighter";
  const N = lowQ ? 12 : 30;
  for (let i = 0; i < N; i++) {
    const ph = hash01(i + 71) * 0.45, u = clamp01((q - ph) / 0.5);
    if (u <= 0 || u >= 1) continue;
    const a = hash01(i + 13) * TAU + u * 2.4, r = (1.1 + 0.8 * hash01(i + 29)) * n * (1 - easeIn2(u));
    const p = P(S[0] + Math.cos(a) * r, S[1] + Math.sin(a) * r, 0.1 + (S[2] - 0.1) * Math.pow(u, 0.6));
    const al = Math.sin(Math.PI * u);
    if (!lowQ) glow(g, p[0], p[1], p[2] * 0.06, LILAC, 0.45 * al);
    g.fillStyle = `rgba(${i % 3 ? VWHITE : LILAC},${al})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1.1, p[2] * 0.024), 0, TAU); g.fill();
  }
  // วงเรืองรอบตัว (พื้น)
  const rk = q < 0.2 ? q / 0.2 : q < 0.8 ? 1 : 1 - (q - 0.8) / 0.2, grow = easeOut3(Math.min(1, q * 2));
  gEllipse(g, cx, cy, (0.55 + 0.15 * grow) * n, 0.03, 44); g.strokeStyle = `rgba(${LILAC},${0.85 * rk})`; g.lineWidth = 2.2; g.stroke();
  gEllipse(g, cx, cy, (0.68 + 0.15 * grow) * n, 0.03, 44); g.strokeStyle = `rgba(${VIOLET},${0.55 * rk})`; g.lineWidth = 1.3; g.stroke();
  const [px, py, ps] = P3(S);
  glow(g, px, py, ps * (0.12 + 0.25 * q), VWHITE, (0.5 + 0.4 * q) * (q < 0.9 ? 1 : 1 - (q - 0.9) / 0.1));
  if (q > 0.65 && q < 0.9) { const fq = (q - 0.65) / 0.25; glow(g, px, py, ps * (0.4 + 0.5 * fq), WHITE, 0.85 * (1 - fq)); }
  g.restore();
}
// ครั้งเสริมพลัง จบ — รีเซ็ทคูลดาวน์: หน้าปัดอักษร 12 ขีดบนพื้น · เข็มหมุนย้อนเร็ว → วงหดเข้า (SNAP) → ปะทุเป็นวงกระจาย + ประกาย
function resetFx(g, e, t, lowQ) {
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2, q = clamp01(t / FERN_FX_DUR.fernReset);
  const SNAP = 0.55, R0 = 0.85 * n;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  if (q < SNAP + 0.08) {
    const a0 = clamp01(q / 0.15), shr = q < SNAP - 0.12 ? 1 : 1 - easeIn2(clamp01((q - (SNAP - 0.12)) / 0.2)) * 0.75;
    const k = a0 * (q < SNAP ? 1 : 1 - (q - SNAP) / 0.08), R = R0 * shr;
    gEllipse(g, cx, cy, R, 0.04, 48); g.strokeStyle = `rgba(${PALE},${0.9 * k})`; g.lineWidth = 2; g.stroke();
    gEllipse(g, cx, cy, R * 0.82, 0.04, 40); g.strokeStyle = `rgba(${VIOLET},${0.6 * k})`; g.lineWidth = 1.2; g.stroke();
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, l = i % 3 ? 0.1 : 0.2;
      const p0 = P(cx + Math.cos(a) * R * (1 - l), cy + Math.sin(a) * R * (1 - l), 0.04), p1 = P(cx + Math.cos(a) * R * 0.98, cy + Math.sin(a) * R * 0.98, 0.04);
      g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    }
    g.strokeStyle = `rgba(${WHITE},${0.85 * k})`; g.lineWidth = 1.5; g.stroke();
    // เข็ม: หมุนย้อน 1.5 รอบ (เร่งขึ้น) แล้วหยุดที่ 12 นาฬิกาตอน SNAP
    const sw = easeIn2(clamp01(q / SNAP)), ang = -Math.PI / 2 + (1 - sw) * TAU * 1.5;
    const c0 = P(cx, cy, 0.04), tip = P(cx + Math.cos(ang) * R * 0.78, cy + Math.sin(ang) * R * 0.78, 0.04);
    g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(tip[0], tip[1]);
    g.strokeStyle = `rgba(${VWHITE},${k})`; g.lineWidth = Math.max(1.5, c0[2] * 0.03); g.stroke();
    if (!lowQ) {
      for (let j = 1; j <= 4; j++) { // รอยหางเข็ม (ฝั่งที่เพิ่งผ่าน)
        const aj = ang + j * 0.16, tj = P(cx + Math.cos(aj) * R * 0.78, cy + Math.sin(aj) * R * 0.78, 0.04);
        g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(tj[0], tj[1]);
        g.strokeStyle = `rgba(${PALE},${0.35 * k * (1 - j / 5)})`; g.lineWidth = 1.2; g.stroke();
      }
    }
    glow(g, c0[0], c0[1], c0[2] * 0.2, PALE, 0.6 * k);
  }
  if (q >= SNAP) {
    const u = clamp01((q - SNAP) / (1 - SNAP));
    for (let j = 0; j < (lowQ ? 1 : 2); j++) {
      const uu = clamp01(u * 1.15 - j * 0.15);
      if (uu <= 0 || uu >= 1) continue;
      gEllipse(g, cx, cy, 0.25 * n + 1.6 * n * easeOut3(uu), 0.04, 52);
      g.strokeStyle = `rgba(${j ? VIOLET : PALE},${0.9 * (1 - uu)})`; g.lineWidth = 3 * (1 - uu) + 1; g.stroke();
    }
    const [px, py, ps] = P(cx, cy, 0.7);
    if (u < 0.3) glow(g, px, py, ps * 0.9 * n, WHITE, 0.8 * (1 - u / 0.3));
    g.restore();
    sparks(g, [cx, cy, 0.7], u, 157, 14, 1.1 * n, lowQ);
    return;
  }
  g.restore();
}

// ---------- ค้างบนตัว: แสงที่ปลายคทา ----------
//  ferns = [{ id, x, y, size, empowered, boost }] (BoardStage จาก p.fern) · ตามหมากที่กำลังเดิน (units rx/ry)
export function drawFernAir(g, ferns, units, now, lowQ) {
  if (!Array.isArray(ferns) || !ferns.length) return;
  for (const c of ferns) {
    const n = Math.max(1, c.size | 0), u = units.find((it) => it.id === c.id && !it.corpse);
    const wx = u ? u.rx + n / 2 + (u.ox || 0) : c.x + n / 2, wy = u ? u.ry + n / 2 + (u.oy || 0) : c.y + n / 2;
    const S = staffPt(wx, wy, n), [hx, hy, hs] = P3(S);
    const pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 380);
    g.save(); g.globalCompositeOperation = "lighter";
    if (c.boost) {
      glow(g, hx, hy, hs * (0.16 + 0.04 * pulse), PALE, 0.45 + 0.15 * pulse);
      if (!lowQ) {
        const rot = REDUCED ? 0 : now / 900, r = 0.15 * n;
        g.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = rot + (i / 8) * TAU, p0 = P(S[0] + Math.cos(a) * r, S[1] + Math.sin(a) * r, S[2]), p1 = P(S[0] + Math.cos(a + 0.35) * r, S[1] + Math.sin(a + 0.35) * r, S[2]);
          g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
        }
        g.strokeStyle = `rgba(${PALE},0.75)`; g.lineWidth = 1.2; g.stroke();
      }
    }
    if (c.empowered) {
      glow(g, hx, hy, hs * (0.2 + 0.07 * pulse), LILAC, 0.5 + 0.2 * pulse);
      glow(g, hx, hy, hs * 0.07, VWHITE, 0.9);
      const M = lowQ ? 2 : 4;
      for (let i = 0; i < M; i++) {
        const a = (REDUCED ? 0 : now / 600) + (i / M) * TAU, p = P(S[0] + Math.cos(a) * 0.22 * n, S[1] + Math.sin(a) * 0.22 * n, S[2] + 0.06 * Math.sin(a * 2));
        g.fillStyle = `rgba(${VWHITE},0.95)`; g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.022), 0, TAU); g.fill();
      }
    }
    g.restore();
  }
}

export function fernFx(g, e, now, lowQ) {
  if (Z_KIND[e.kind]) { zoltraak(g, e, now, lowQ); return; }
  const t = now - e.t0;
  if (t < 0 || t > (FERN_FX_DUR[e.kind] || 0)) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (e.kind === "fernCast") castFx(g, e, t, lowQ);
  else if (e.kind === "fernBoost") boostFx(g, e, t, lowQ);
  else if (e.kind === "fernConceal") concealFx(g, e, t, lowQ);
  else if (e.kind === "fernUnveil") unveilFx(g, e, t, lowQ);
  else if (e.kind === "fernShield") shieldFx(g, e, t, lowQ);
  else if (e.kind === "fernEmpower") empowerFx(g, e, t, lowQ);
  else if (e.kind === "fernReset") resetFx(g, e, t, lowQ);
  g.restore();
}

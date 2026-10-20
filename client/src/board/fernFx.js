// ============================================================
//  เอฟเฟกต์บนกระดานของเฟิร์น (characters/fern.js · GRID_PLAN §7.14) — เวทแบบ Frieren: ขาวอมฟ้า ขอบม่วงเข้ม
//
//  ตีปกติ Zoltraak (attackStyle "fernZoltraak" — STYLE_MS ใน boardDraw) · fx { x, y (ช่องผู้ตี), size, to, lane: [{ x, y }] }
//   วงเวทเล็กกางหน้ามือ → ลำแสงขาวเรียวพุ่งตามแนว 3 ช่อง (ทะลุทุกอย่าง) แกนขาว/ฟ้าซีด/ขอบม่วงเข้ม → ประกายปะทะทุกช่องที่ผ่าน
//   ลำแสงถึงปลายแนว = จังหวะปะทะ (FERN_HIT_P) · ไม่มี lane = ยิงตรงไปที่ to
//  เหตุการณ์ (socket "fernFx" → FERN_EVENT_FX · at/from/to = { x, y }):
//   cast (ร่ายต่อเนื่อง: วงเวทคู่กระเพื่อม) · conceal (ออร่ามานาหดเข้าตัว — เจ้าของเห็นคนเดียว) · unveil (ออร่าปะทุกลับ)
//   shield (Defensive Magic: โดมหกเหลี่ยมโปร่งแสงกันการโจมตี) · warpOut / warpIn (วาร์ป: ประกายหาย / ประกายปรากฏ)
//   reveal (ต้นเทิร์นที่ชาร์จ: วงสัญญาณที่ช่องของเฟิร์น) · fizzle (ชาร์จถูกยกเลิก: วงเวทร้าวแตกสลาย)
//   cannon { from, to } = Orbital Cannon Zoltraak (FERN_CANNON — ต้องตรงกับ server FERN_CANNON_HIT 1.4 วิ + หาง 0.8 วิ):
//    0–1.4 วิ = เฟิร์นยิงแสงขึ้นฟ้า · วงเวทยักษ์กางกลางอากาศเหนือเป้า หมุนเร็วขึ้น ละอองไหลเข้ากลางวง · สนามมืดลง · วงล็อกเป้าบนพื้น
//    1.4 วิ = ลำแสงขาวจันทร์ทิ้งดิ่งลงเป้า + แฟลชทั้งจอ + คลื่นกระแทกบนพื้น (BoardStage: จอสั่น + เลขดาเมจ)
//    1.4–2.2 วิ = ลำแสงค้าง เกลียวพลังหมุนรอบ → หดเรียวจางหาย
//  ระหว่างชาร์จ (p.fern.charge 0..3 → prop ferns ของ BoardCanvas):
//   drawFernGround (ก่อนตัวละคร) = วงเวทใต้ตัว ใหญ่/สว่าง/มีวงเพิ่มตามจำนวนเทิร์นที่ชาร์จ (+ สนามมืดระหว่าง cannon)
//   drawFernAir (หลังตัวละคร) = ละอองมานาวนเข้าหาจุดเหนือหัว + ลูกแสงโคจรตามจำนวนชาร์จ
//  lowQ = ตัดอนุภาค/ชั้นเรืองครึ่งหนึ่งขึ้นไป · ลดการเคลื่อนไหว = ของที่วนตลอดหยุดนิ่ง เอฟเฟกต์ครั้งเดียวยังเล่น
// ============================================================
import { P, gEllipse, glow, quad } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ ----------
export const FERN_MS = { fernZoltraak: 900 };
export const FERN_HIT_P = { fernZoltraak: 0.3 }; // 270 ms = ลำแสงถึงปลายแนว
// Orbital Cannon Zoltraak — ต้องตรงกับ server (FERN_CANNON_HIT 1.4 วิ แล้วรออีก 0.8 วิ)
export const FERN_CANNON = { hit: 1400, drop: 90, fade0: 1900, total: 2200 };
export const FERN_FX_DUR = {
  ...FERN_MS, fernCast: 850, fernConceal: 950, fernUnveil: 850, fernShield: 900, fernWarpOut: 850, fernWarpIn: 850,
  fernReveal: 1300, fernFizzle: 1100, fernCannon: FERN_CANNON.total,
};
export const isFernFx = (kind) => typeof kind === "string" && (kind in FERN_FX_DUR);
export const FERN_EVENT_FX = {
  cast: "fernCast", conceal: "fernConceal", unveil: "fernUnveil", shield: "fernShield", warpOut: "fernWarpOut", warpIn: "fernWarpIn",
  reveal: "fernReveal", fizzle: "fernFizzle", cannon: "fernCannon",
};
// เสียงของแต่ละเหตุการณ์ — เกมจริง server ส่งเอง (characters/fern.js engine.sfx) · ตารางนี้ใช้แค่หน้า dev (FernFxDev) · cannon ไฟล์ระเบิดตรง 1.4 วิ
export const FERN_EVENT_SFX = {
  cast: "fern_cast", conceal: "fern_conceal", unveil: "fern_unveil", shield: "fern_shield", warpOut: "fern_teleport", warpIn: "fern_teleport",
  reveal: "fern_charge", fizzle: "fern_conceal", cannon: "fern_cannon",
};

// ---------- สี (r,g,b) ----------
const WHITE = "255,255,255", PALE = "196,230,255", BLUE = "120,176,255", VIOLET = "150,112,236";
const DVIOLET = "58,30,118", MOON = "250,252,255";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const P3 = (v) => P(v[0], v[1], v[2]);
const FLAT = [[1, 0, 0], [0, 1, 0]];
function seg(g, a, b) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
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
const Z_HAND = 0.85, WIND = 0.13;
function zoltraak(g, e, now, lowQ) {
  const t = (now - e.t0) / FERN_MS.fernZoltraak;
  if (t <= 0 || t >= 1) return;
  const HIT = FERN_HIT_P.fernZoltraak, n0 = Math.max(1, e.size | 0);
  const ox = e.x + n0 / 2, oy = e.y + n0 / 2;
  const lane = Array.isArray(e.lane) && e.lane.length ? e.lane : null;
  const tgt = lane ? lane[lane.length - 1] : e.to || { x: e.x, y: e.y - 1 };
  const tn = lane ? 1 : Math.max(1, e.toSize | 0);
  let fx = tgt.x + tn / 2 - ox, fy = tgt.y + tn / 2 - oy;
  // ทิศแนวตรง (lane) = แกนหลัก · ไม่มี lane = เวกเตอร์จริง
  if (lane) { if (Math.abs(fx) >= Math.abs(fy)) { fx = Math.sign(fx) || 1; fy = 0; } else { fy = Math.sign(fy) || 1; fx = 0; } }
  const dl = Math.hypot(fx, fy) || 1, f = [fx / dl, fy / dl, 0];
  const reach = lane ? Math.abs((tgt.x + 0.5 - ox) * f[0] + (tgt.y + 0.5 - oy) * f[1]) + 0.45 : dl;
  const s = [-f[1], f[0], 0], up = [0, 0, 1];
  const start = n0 / 2 * 0.85 + 0.05;
  const O = [ox + f[0] * start, oy + f[1] * start, Z_HAND];
  const rot = (REDUCED ? 0 : now / 140) + e.t0 * 0.001;
  // วงเวทหน้ามือ (ระนาบตั้งฉากกับทิศยิง)
  const sk = t < WIND ? easeOut3(t / WIND) : t < 0.6 ? 1 : clamp01(1 - (t - 0.6) / 0.4);
  sigil(g, O, s, up, 0.3 * (0.4 + 0.6 * Math.min(1, t / WIND)), rot, sk, lowQ, 2);
  if (t < WIND) {
    const [px, py, ps] = P3(O);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, px, py, ps * 0.35 * (t / WIND), PALE, 0.6); g.restore();
    return;
  }
  // หัวลำแสง: วิ่งถึงปลายแนวตอน HIT
  const u = clamp01((t - WIND) / (HIT - WIND)), d = start + (reach - start) * (t < HIT ? easeIn2(u) * 0.35 + u * 0.65 : 1);
  const H = [ox + f[0] * d, oy + f[1] * d, Z_HAND];
  // ความกว้าง: เต็มช่วง HIT–0.5 แล้วเรียวลงจนหายที่ 0.88
  const wK = t < HIT ? 0.75 + 0.25 * u : t < 0.5 ? 1 : clamp01(1 - (t - 0.5) / 0.38);
  const flick = REDUCED ? 1 : 0.9 + 0.1 * Math.sin(now / 23);
  if (wK > 0.01) {
    const a = P3(O), b = P3(H), base = 0.075 * wK * flick;
    g.save();
    taper(g, a, b, a[2] * base, b[2] * base, lowQ ? BEAM_LAYERS_LOW : BEAM_LAYERS, 1);
    // ละอองไหลตามลำ
    if (!lowQ) {
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 10; i++) {
        const q = ((now / 260) + hash01(i + 3)) % 1, dd = start + (d - start) * q, off = (hash01(i + 9) - 0.5) * 0.16;
        const p = P(ox + f[0] * dd + s[0] * off, oy + f[1] * dd + s[1] * off, Z_HAND + (hash01(i + 20) - 0.5) * 0.14);
        g.fillStyle = `rgba(${WHITE},${0.8 * wK})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.02), 0, TAU); g.fill();
      }
    }
    // หัวลำแสงเรือง (ขณะวิ่ง)
    if (t < HIT + 0.08) { g.globalCompositeOperation = "lighter"; glow(g, b[0], b[1], b[2] * 0.42, PALE, 0.9 * (t < HIT ? 1 : 1 - (t - HIT) / 0.08)); }
    // แสงวาบที่ปากวงเวทตอนปล่อย
    if (t < WIND + 0.12) { g.globalCompositeOperation = "lighter"; glow(g, a[0], a[1], a[2] * 0.55, WHITE, 0.8 * (1 - (t - WIND) / 0.12)); }
    g.restore();
  }
  // ประกายปะทะ + รอยไหม้ฟ้าบนพื้น ทุกช่องที่ลำแสงผ่าน (ไม่มี lane = ช่องเป้า)
  const tiles = lane || [{ x: tgt.x, y: tgt.y }];
  tiles.forEach((tl, i) => {
    const td = Math.abs((tl.x + 0.5 - ox) * f[0] + (tl.y + 0.5 - oy) * f[1]);
    const hitAt = WIND + (HIT - WIND) * clamp01(lane ? (td - start) / (reach - start) : 1);
    const age = (t - hitAt) / 0.45;
    if (age < 0) return;
    const cx = tl.x + (lane ? 0.5 : tn / 2), cy = tl.y + (lane ? 0.5 : tn / 2);
    sparks(g, [cx, cy, Z_HAND], age, i * 13 + 7, 9, 0.55, lowQ);
    if (age < 1) {
      g.save(); g.globalCompositeOperation = "lighter";
      gEllipse(g, cx, cy, 0.18 + 0.32 * easeOut3(age), 0.02, 28); g.strokeStyle = `rgba(${PALE},${0.7 * (1 - age)})`; g.lineWidth = 1.6; g.stroke();
      g.restore();
    }
  });
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
// Defensive Magic: โดมหกเหลี่ยมโปร่งแสง (ครึ่งทรงกลมรัศมี R) วาบขึ้นแล้วจาง + ระลอกจุดกระทบ
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
// วาร์ป: out = ประกายหมุนวนขึ้นแล้วหาย (ตัวสลายเป็นแสง) · in = ประกายตกลงรวมตัว + วงพื้นกาง
function warpFx(g, e, t, out, lowQ) {
  const [cx, cy] = pos(e), q = clamp01(t / FERN_FX_DUR.fernWarpOut), k = out ? 1 - easeIn2(q) : (q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3);
  g.save(); g.globalCompositeOperation = "lighter";
  // เสาแสง
  const colA = out ? (q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7) : (q < 0.55 ? q / 0.55 : 1 - (q - 0.55) / 0.45);
  if (colA > 0) {
    const b = P(cx, cy, 0), tp = P(cx, cy, 2.6), w = b[2] * 0.34 * (out ? 1 - q * 0.7 : 0.4 + q * 0.6);
    const gr = g.createLinearGradient(tp[0], tp[1], b[0], b[1]);
    gr.addColorStop(0, `rgba(${PALE},0)`); gr.addColorStop(0.6, `rgba(${PALE},${0.45 * colA})`); gr.addColorStop(1, `rgba(${WHITE},${0.7 * colA})`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(tp[0] - w * 0.4, tp[1]); g.lineTo(b[0] - w, b[1]); g.lineTo(b[0] + w, b[1]); g.lineTo(tp[0] + w * 0.4, tp[1]); g.closePath(); g.fill();
  }
  // วงพื้น
  const rr = out ? 0.7 * (1 - easeOut3(q)) + 0.1 : 0.2 + 0.7 * easeOut3(q);
  gEllipse(g, cx, cy, rr, 0.02, 36); g.strokeStyle = `rgba(${PALE},${0.85 * k})`; g.lineWidth = 2; g.stroke();
  if (!out) { gEllipse(g, cx, cy, rr * 1.25, 0.02, 36); g.strokeStyle = `rgba(${VIOLET},${0.6 * k})`; g.lineWidth = 1.3; g.stroke(); }
  // ประกายดาว 4 แฉก
  const N = lowQ ? 9 : 20;
  for (let i = 0; i < N; i++) {
    const ph = hash01(i + (out ? 3 : 8)), a = ph * TAU + (out ? q * 4 : -q * 3), r0 = 0.15 + 0.5 * hash01(i + 17);
    const z = out ? 0.2 + (0.4 + 2.2 * ph) * easeOut3(q) : 2.8 * (1 - easeOut3(clamp01(q * 1.3 - ph * 0.2))) + 0.15;
    const rr2 = out ? r0 * (1 - q * 0.6) : r0 * (0.4 + 0.6 * (1 - q));
    const p = P(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2, z), tw = 0.5 + 0.5 * Math.sin(t / 50 + i * 2);
    const sz = p[2] * (0.05 + 0.04 * tw), al = k * (0.5 + 0.5 * tw);
    g.strokeStyle = `rgba(${WHITE},${al})`; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(p[0] - sz, p[1]); g.lineTo(p[0] + sz, p[1]); g.moveTo(p[0], p[1] - sz); g.lineTo(p[0], p[1] + sz); g.stroke();
    glow(g, p[0], p[1], sz * 1.4, PALE, 0.5 * al);
  }
  // แสงวาบ (out = ตอนต้น · in = ตอนรวมตัวเสร็จ)
  const fq = out ? q / 0.2 : (q - 0.5) / 0.2;
  if (fq > 0 && fq < 1) { const [px, py, ps] = P(cx, cy, 0.8); glow(g, px, py, ps * 0.9, WHITE, 0.85 * (1 - fq)); }
  g.restore();
}
// ต้นเทิร์นที่ชาร์จ: เผยตำแหน่ง — วงสัญญาณ 3 วงขยายบนพื้น + เสาแสงสั้น
function revealFx(g, e, t, lowQ) {
  const [cx, cy] = pos(e), D = FERN_FX_DUR.fernReveal;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let j = 0; j < 3; j++) {
    const q = (t - j * 220) / (D - 440);
    if (q < 0 || q > 1) continue;
    gEllipse(g, cx, cy, 0.3 + 1.7 * easeOut3(q), 0.02, 48);
    g.strokeStyle = `rgba(${j === 1 ? VIOLET : PALE},${0.85 * (1 - q)})`; g.lineWidth = 2.4 * (1 - q) + 0.8; g.stroke();
  }
  const q = clamp01(t / D), k = q < 0.15 ? q / 0.15 : 1 - (q - 0.15) / 0.85;
  const b = P(cx, cy, 0), tp = P(cx, cy, 3.2);
  g.strokeStyle = `rgba(${PALE},${0.6 * k})`; g.lineWidth = Math.max(2, b[2] * 0.06); seg(g, b, tp); g.stroke();
  g.strokeStyle = `rgba(${WHITE},${0.9 * k})`; g.lineWidth = Math.max(1, b[2] * 0.02); g.stroke();
  if (!lowQ) glow(g, b[0], b[1], b[2] * 0.7, BLUE, 0.4 * k);
  g.restore();
}
// ชาร์จถูกยกเลิก: วงเวทใต้ตัวร้าว → เศษวงกระเด็นออก ตกลงพื้น → ควันม่วงจาง
function fizzleFx(g, e, t, lowQ) {
  const [cx, cy] = pos(e), q = clamp01(t / FERN_FX_DUR.fernFizzle);
  const crack = clamp01(q / 0.35), k = q < 0.35 ? 1 : 1 - (q - 0.35) / 0.4;
  if (k > 0) sigil(g, [cx, cy, 0.03], FLAT[0], FLAT[1], 0.95, 0.4, k * (REDUCED ? 1 : 0.8 + 0.2 * Math.sin(t / 30)), lowQ, 2, crack);
  // เศษ: ขีดโค้งจากวงกระเด็นออก
  if (q > 0.3) {
    const u = (q - 0.3) / 0.7, N = lowQ ? 8 : 16;
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (let i = 0; i < N; i++) {
      const a = hash01(i + 61) * TAU, r = 0.95 + 0.9 * easeOut3(u) * (0.5 + hash01(i + 2)), z = 0.03 + Math.sin(Math.PI * Math.min(1, u * 1.2)) * 0.5 * hash01(i + 9);
      const p0 = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z), p1 = P(cx + Math.cos(a + 0.18) * r, cy + Math.sin(a + 0.18) * r, z);
      g.strokeStyle = `rgba(${i % 2 ? PALE : VIOLET},${1 - u})`; g.lineWidth = Math.max(1, p0[2] * 0.03 * (1 - u)); seg(g, p0, p1); g.stroke();
    }
    g.restore();
    if (!lowQ) {
      g.save(); g.globalCompositeOperation = "source-over";
      for (let i = 0; i < 6; i++) {
        const a = hash01(i + 90) * TAU, [px, py, ps] = P(cx + Math.cos(a) * 0.5, cy + Math.sin(a) * 0.5, 0.2 + u * 0.9);
        glow(g, px, py, ps * (0.3 + 0.3 * u), DVIOLET, 0.35 * (1 - u));
      }
      g.restore();
    }
  }
}

// ---------- Orbital Cannon Zoltraak ----------
const SKY_Z = 5.2, SKY_R = 1.35;
function cannonGeo(e) {
  if (e._geo) return e._geo;
  const from = e.from || e.to || { x: e.x, y: e.y }, to = e.to || from;
  e._geo = { fx: from.x + 0.5, fy: from.y + 0.5, tx: to.x + 0.5, ty: to.y + 0.5 };
  return e._geo;
}
function cannonFx(g, e, now, lowQ, view) {
  const t = now - e.t0, { hit, drop, fade0, total } = FERN_CANNON;
  if (t < 0 || t > total) return;
  const G = cannonGeo(e), sky = [G.tx, G.ty, SKY_Z], ground = [G.tx, G.ty, 0.02];
  const spin = REDUCED ? 0 : (t / 1000) * (1.2 + 3.5 * clamp01(t / hit));
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // 1) เฟิร์นยิงแสงขึ้นฟ้า (0–0.6 วิ)
  if (t < 650) {
    const q = t / 650, k = q < 0.2 ? q / 0.2 : 1 - (q - 0.2) / 0.8;
    sigil(g, [G.fx, G.fy, 0.03], FLAT[0], FLAT[1], 0.7, spin, k, lowQ, 2);
    const b = P(G.fx, G.fy, 0.9), tp = P(G.fx, G.fy, 0.9 + 9 * easeOut3(Math.min(1, q * 2.2)));
    taper(g, b, tp, b[2] * 0.06, tp[2] * 0.03, lowQ ? BEAM_LAYERS_LOW : BEAM_LAYERS, k);
  }
  // 2) วงเวทยักษ์กลางฟ้าเหนือเป้า + วงล็อกเป้าบนพื้น (0.25 วิ → จางตอนท้าย)
  const sq = clamp01((t - 250) / 700), sK = t < fade0 ? easeOut3(sq) : clamp01(1 - (t - fade0) / (total - fade0));
  if (sK > 0) {
    const R = SKY_R * (0.35 + 0.65 * easeOut3(sq));
    sigil(g, sky, FLAT[0], FLAT[1], R, spin, sK, lowQ, 3);
    sigil(g, sky, FLAT[0], FLAT[1], R * 0.55, -spin * 1.6, sK * 0.8, lowQ, 1);
    // วงล็อกเป้าบนพื้น + ช่องเป้า
    const lockK = sK * (t < hit ? 0.6 + 0.4 * Math.sin(t / 70) : 0.6);
    sigil(g, ground, FLAT[0], FLAT[1], 0.75, -spin, lockK, lowQ, 1);
    g.save(); g.globalCompositeOperation = "lighter";
    quad(g, G.tx - 0.5, G.ty - 0.5, 0.04); g.fillStyle = `rgba(${PALE},${0.22 * lockK})`; g.fill();
    g.restore();
  }
  // 3) ชาร์จ: ละอองจากขอบวงไหลเข้ากลาง + แกนกลางสว่างขึ้น + เส้นนำลงเป้า (1.1–1.4 วิ)
  if (t < hit) {
    const ch = clamp01((t - 300) / (hit - 300));
    const [sx, sy, ss] = P3(sky);
    g.save(); g.globalCompositeOperation = "lighter";
    if (!lowQ) {
      for (let i = 0; i < 26; i++) {
        const per = 520 + hash01(i) * 380, age = ((t / per) + hash01(i + 4)) % 1, a = hash01(i + 7) * TAU + age * 1.2;
        const r = SKY_R * 1.5 * (1 - easeIn2(age));
        const p = P(G.tx + Math.cos(a) * r, G.ty + Math.sin(a) * r, SKY_Z + 0.25 * Math.sin(Math.PI * age));
        g.fillStyle = `rgba(${WHITE},${ch * Math.sin(Math.PI * age)})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.03), 0, TAU); g.fill();
      }
    }
    glow(g, sx, sy, ss * (0.3 + 0.9 * ch), PALE, 0.35 + 0.5 * ch);
    glow(g, sx, sy, ss * (0.12 + 0.3 * ch), WHITE, 0.6 + 0.4 * ch);
    if (t > 1050) {
      const gk = (t - 1050) / (hit - 1050), fl = REDUCED ? 1 : 0.5 + 0.5 * Math.sin(t / 18);
      const a = P3(sky), b = P3(ground);
      g.strokeStyle = `rgba(${PALE},${0.55 * gk * fl})`; g.lineWidth = Math.max(1, a[2] * 0.02 + gk * 2); seg(g, a, b); g.stroke();
    }
    g.restore();
  }
  // 4) ลำแสงทิ้งดิ่ง (hit − drop → hit) แล้วค้างถึง fade0 → เรียวหาย
  if (t >= hit - drop) {
    const dq = clamp01((t - (hit - drop)) / drop), endZ = SKY_Z - (SKY_Z - 0.02) * easeIn2(dq);
    const wK = t < fade0 ? 1 : clamp01(1 - (t - fade0) / (total - fade0 - 60));
    const pulse = REDUCED ? 1 : 0.9 + 0.1 * Math.sin(t / 25) + (t < hit + 160 ? 0.35 * (1 - (t - hit) / 160) * (t >= hit ? 1 : 0) : 0);
    const a = P3(sky), b = P(G.tx, G.ty, endZ);
    if (wK > 0.01) {
      const ra = a[2] * 0.42 * wK * pulse, rb = b[2] * 0.55 * wK * pulse;
      taper(g, a, b, ra, rb, lowQ ? BEAM_LAYERS_LOW : [[2.6, DVIOLET, 0.2, 0], [1.9, VIOLET, 0.3, 0], [1.4, BLUE, 0.55, 1], [1, PALE, 0.8, 1], [0.55, MOON, 1, 1], [0.25, WHITE, 1, 1]], 1);
      // เกลียวพลังหมุนรอบลำ
      if (!lowQ && t >= hit) {
        g.globalCompositeOperation = "lighter";
        for (let c = 0; c < 2; c++) {
          g.beginPath();
          for (let i = 0; i <= 30; i++) {
            const s = i / 30, z = SKY_Z * (1 - s) + 0.05, th = s * 10 + c * Math.PI - t / 60, rr = 0.45 + 0.2 * s;
            const p = P(G.tx + Math.cos(th) * rr * wK, G.ty + Math.sin(th) * rr * wK, z);
            if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
          }
          g.strokeStyle = `rgba(${c ? VIOLET : PALE},${0.6 * wK})`; g.lineWidth = 1.8; g.stroke();
        }
      }
    }
  }
  // 5) ปะทะ: คลื่นกระแทก + ประกาย + แสงพื้น + รอยไหม้
  if (t >= hit) {
    const u = (t - hit) / (total - hit);
    g.save(); g.globalCompositeOperation = "lighter";
    const [gx, gy, gs] = P(G.tx, G.ty, 0.05);
    glow(g, gx, gy, gs * (1.6 + 1.2 * u), BLUE, 0.55 * (1 - u));
    glow(g, gx, gy, gs * 0.9, WHITE, 0.8 * (1 - u));
    for (let j = 0; j < 2; j++) {
      const q = clamp01((t - hit - j * 140) / 600);
      if (q <= 0 || q >= 1) continue;
      gEllipse(g, G.tx, G.ty, 0.4 + 2.6 * easeOut3(q), 0.03, 56);
      g.strokeStyle = `rgba(${j ? VIOLET : PALE},${0.9 * (1 - q)})`; g.lineWidth = 4 * (1 - q) + 1; g.stroke();
    }
    g.restore();
    sparks(g, [G.tx, G.ty, 0.4], clamp01((t - hit) / 650), 211, 18, 1.6, lowQ);
  }
  // 6) แฟลชทั้งจอตอนปะทะ
  if (t >= hit && t < hit + 380) {
    const fq = (t - hit) / 380;
    const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
    const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
    g.globalCompositeOperation = "lighter";
    g.fillStyle = `rgba(215,232,255,${(lowQ ? 0.4 : 0.62) * (1 - fq) * (1 - fq)})`;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  g.restore();
}

// ---------- ระหว่างชาร์จ ----------
//  ferns = [{ id, x, y, size, charge (0..3) }] (BoardStage จาก p.fern.charge)
const chargeK = (c) => clamp01((Number(c.charge) || 0) / 3);
// ความมืดของสนามระหว่าง cannon (ms นับจากเริ่ม)
function cannonDark(t) {
  const { hit, fade0, total } = FERN_CANNON;
  if (t < 0 || t > total) return 0;
  if (t < hit) return 0.12 + 0.3 * easeIn2(t / hit);
  if (t < fade0) return 0.42;
  return 0.42 * (1 - (t - fade0) / (total - fade0));
}
export function drawFernGround(g, ferns, fx, view, now, lowQ) {
  let dark = 0;
  for (const e of fx) if (e.kind === "fernCannon") dark = Math.max(dark, cannonDark(now - e.t0));
  if (dark > 0) {
    g.save(); g.globalCompositeOperation = "source-over";
    g.fillStyle = `rgba(8,10,32,${dark})`;
    const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
    const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.restore();
  }
  if (!Array.isArray(ferns)) return;
  for (const c of ferns) {
    const n = Math.max(1, c.size | 0), cx = c.x + n / 2, cy = c.y + n / 2, ck = chargeK(c), lv = Math.round(ck * 3);
    const rot = REDUCED ? 0 : now / (2600 - 500 * lv), pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / (420 - 60 * lv));
    const k = 0.5 + 0.35 * ck + 0.15 * pulse;
    // แสงพื้นใต้วง (lighter บนพื้นสว่างจาง — ใส่ชั้นม่วงเข้มบางๆ ให้วงเด่น)
    g.save();
    if (!lowQ) { g.globalCompositeOperation = "source-over"; gEllipse(g, cx, cy, (0.8 + 0.25 * lv) * n, 0.01, 40); g.fillStyle = `rgba(${DVIOLET},${0.16 + 0.06 * lv})`; g.fill(); }
    g.globalCompositeOperation = "lighter";
    const [sx, sy, ss] = P(cx, cy, 0.04);
    glow(g, sx, sy, ss * (0.9 + 0.35 * lv) * n, BLUE, 0.18 + 0.12 * ck);
    g.restore();
    sigil(g, [cx, cy, 0.03], FLAT[0], FLAT[1], (0.62 + 0.14 * lv) * n, rot, k, lowQ, 1 + Math.min(2, lv));
    if (lv >= 2) sigil(g, [cx, cy, 0.03], FLAT[0], FLAT[1], 0.34 * n, -rot * 1.7, k * 0.8, lowQ, 1);
  }
}
const HEAD_Z = 1.95;
export function drawFernAir(g, ferns, units, now, lowQ) {
  if (!Array.isArray(ferns) || !ferns.length) return;
  for (const c of ferns) {
    const n = Math.max(1, c.size | 0), u = units.find((it) => it.id === c.id && !it.corpse);
    const wx = u ? u.rx + n / 2 + (u.ox || 0) : c.x + n / 2, wy = u ? u.ry + n / 2 + (u.oy || 0) : c.y + n / 2;
    const ck = chargeK(c), lv = Math.round(ck * 3), T = [wx, wy, HEAD_Z * n];
    g.save(); g.globalCompositeOperation = "lighter";
    // ละอองมานาจากพื้นรอบตัววนเข้าหาจุดเหนือหัว
    const N = (lowQ ? 6 : 14) + lv * (lowQ ? 3 : 8), str = 0.45 + 0.55 * ck;
    for (let i = 0; i < N; i++) {
      const per = 1500 + hash01(i + 1) * 1100 - lv * 200, age = REDUCED ? hash01(i + 2) : ((now / per) + hash01(i * 3.1)) % 1;
      const ang = hash01(i + 5) * TAU + age * 2.2, r = (1.1 + hash01(i + 9) * 1.6) * (1 - easeIn2(age));
      const p = P(T[0] + Math.cos(ang) * r, T[1] + Math.sin(ang) * r, 0.05 + (T[2] - 0.05) * Math.pow(age, 0.7));
      const a = Math.sin(Math.PI * age) * str;
      if (!lowQ) glow(g, p[0], p[1], p[2] * 0.07, PALE, 0.4 * a);
      g.fillStyle = `rgba(${i % 3 ? PALE : WHITE},${a})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.022), 0, TAU); g.fill();
    }
    // จุดรวมมานาเหนือหัว + ลูกแสงโคจรตามจำนวนเทิร์นที่ชาร์จ
    const [hx, hy, hs] = P3(T), bob = REDUCED ? 0 : Math.sin(now / 300) * 0.06;
    glow(g, hx, hy, hs * (0.18 + 0.12 * lv), PALE, 0.4 + 0.15 * lv);
    glow(g, hx, hy, hs * 0.07 * (1 + lv * 0.4), WHITE, 0.8);
    for (let i = 0; i < lv; i++) {
      const a = (REDUCED ? 0 : now / 520) + (i / Math.max(1, lv)) * TAU;
      const p = P(T[0] + Math.cos(a) * 0.42, T[1] + Math.sin(a) * 0.42, T[2] + bob + 0.05 * Math.sin(a * 2));
      glow(g, p[0], p[1], p[2] * 0.14, BLUE, 0.6);
      g.fillStyle = `rgba(${WHITE},1)`; g.beginPath(); g.arc(p[0], p[1], Math.max(1.6, p[2] * 0.035), 0, TAU); g.fill();
    }
    g.restore();
  }
}

export function fernFx(g, e, now, lowQ, view) {
  if (e.kind === "fernZoltraak") { zoltraak(g, e, now, lowQ); return; }
  if (e.kind === "fernCannon") { cannonFx(g, e, now, lowQ, view); return; }
  const t = now - e.t0;
  if (t < 0 || t > (FERN_FX_DUR[e.kind] || 0)) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (e.kind === "fernCast") castFx(g, e, t, lowQ);
  else if (e.kind === "fernConceal") concealFx(g, e, t, lowQ);
  else if (e.kind === "fernUnveil") unveilFx(g, e, t, lowQ);
  else if (e.kind === "fernShield") shieldFx(g, e, t, lowQ);
  else if (e.kind === "fernWarpOut") warpFx(g, e, t, true, lowQ);
  else if (e.kind === "fernWarpIn") warpFx(g, e, t, false, lowQ);
  else if (e.kind === "fernReveal") revealFx(g, e, t, lowQ);
  else if (e.kind === "fernFizzle") fizzleFx(g, e, t, lowQ);
  g.restore();
}

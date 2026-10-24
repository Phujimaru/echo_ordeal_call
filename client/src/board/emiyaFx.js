// ============================================================
//  เอฟเฟกต์บนกระดานของเอมิยะ ชิโร่ (characters/emiya_shirou.js · GRID_PLAN §7.18 · สัญญา .claude/plans/emiya-contract.md)
//  ธีม Fate/stay night [UBW]: วงจรเวทฟ้าเรือง (Trace On) · ดาบคู่ขาวดำ · ธนูดำลูกศรสว่านแดง · มีดสายรุ้งซิกแซก · ดาบหินยักษ์ ·
//  ดาบทอง · โล่ดอกไม้ 7 กลีบสีชมพู · โลกแห่งดาบ (ฟ้าส้มซีเปีย เฟืองยักษ์ ดาบปักพื้น ประกายไฟ)
//
//  ตีปกติ (attackStyle — STYLE_MS / STYLE_HIT_P ใน boardDraw) · fx { x, y (มุมบนซ้ายผู้ตี), size, to, toSize, lane?, by }
//   emiyaKB    ดาบคู่ขาวดำหมุนโค้งไปหาเป้า → ฟันไขว้ 2 จังหวะ (ฮิตที่ 2 = card.repeat)
//   emiyaBow   ง้างธนูดำ (แสงแดงรวมที่ปลายลูกศร) → ลูกศรพุ่งเป็นเส้นแดง → ปะทะ
//   emiyaRule  มีดสายรุ้งซิกแซกแทง → วงเวทบนตัวเป้าแตกเป็นเสี่ยง
//   emiyaNine  ดาบหินยักษ์ฟาดลงกรอบ 2×3 (fx.lane) → แสงกระพริบ 9 จุดรัว
//   emiyaExcal ฟันแสงทองตามแนว 3×1 (fx.lane)
//  เหตุการณ์ (socket "emiyaFx" → emiyaEventFx → { fx, look, shake, later }):
//   trace (วงจรเวทฟ้าวิ่งขึ้นรอบตัว → โครงลวดอาวุธก่อตัวเหนือหัว) · weaponBreak (อาวุธแตกเป็นละอองฟ้า) · capacity (ประกายฟ้าวนขึ้น)
//   avalon (ฝักดาบทองเรือง + วงแสงเขียวทอง) · throw / throwHit (ดาบคู่หมุนไปหาเป้า) · ruleHit (วงเวทแตก) · stun (ดาวหมุนเหนือหัว)
//   caladbolg (ลูกศรสว่านพุ่งตามแนว) · caladbolgBlast (ระเบิด Broken Phantasm รัศมี 2) · caladbolgSplash (เลขดาเมจรอบวง)
//   smash (ดาบหินฟาดพื้น คลื่นฝุ่น/รอยแตกตามแนว 4×3) · rho (โล่ดอกไม้ 7 กลีบ) · excalibur / excaliburHit (ลำแสงทองแนว 5×3)
//   ubw (วงไฟแผ่จากตัวชิโร่ทั่วกระดาน → โลกแห่งดาบ) · ubwEnd (โลกแห่งดาบจางหาย)
//  ชั้นค้าง (prop emiya ของ BoardCanvas = { ubw, units: [{ id, weapon }] }):
//   drawEmiyaWorld = พื้นโทนส้มซีเปีย (ใต้ไฮไลต์) · emiyaItems = ดาบปักพื้น + อาวุธที่ถือลอยข้างตัว (เรียงความลึก) · drawEmiyaSky = เฟืองยักษ์ + ประกายไฟ (ทับตัวละคร)
//  lowQ = ตัดอนุภาค/ชั้นเรืองครึ่งหนึ่ง · ลดการเคลื่อนไหว = ของที่หมุน/ลอยตลอดหยุดนิ่ง (เอฟเฟกต์ครั้งเดียวยังเล่น)
// ============================================================
import { P, depthOf, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ ----------
export const EMIYA_MS = { emiyaKB: 1000, emiyaBow: 900, emiyaRule: 820, emiyaNine: 1000, emiyaExcal: 900 };
export const EMIYA_HIT_P = { emiyaKB: 0.42, emiyaBow: 0.56, emiyaRule: 0.46, emiyaNine: 0.42, emiyaExcal: 0.4 };
export const EMIYA_REPEAT_MS = 300; // ฮิตเพิ่มของการตีครั้งเดียว (card.repeat — K&B) ห่างจากฮิตแรก
//  ms นับจากเริ่มเหตุการณ์ — server พัก (skillBeat) throw 0.6 · caladbolg 0.7 · blast 0.9 · smash 0.75 · excalibur 1.4 วิ
export const EMIYA_FX = { throwHit: 560, calHit: 640, blastBoom: 120, smashHit: 520, excalFire: 520, excalHit: 900, ubwRing: 1600 };
export const EMIYA_FX_DUR = {
  ...EMIYA_MS,
  emiyaTrace: 1500, emiyaBreak: 1000, emiyaCapacity: 1200, emiyaAvalon: 1600, emiyaThrow: 900, emiyaRuleHit: 1000, emiyaStun: 1100,
  emiyaCaladbolg: 900, emiyaBlast: 1500, emiyaSmash: 1300, emiyaRho: 1800, emiyaExcalibur: 2000, emiyaUbw: 2200, emiyaUbwEnd: 1400,
};
export const isEmiyaFx = (kind) => typeof kind === "string" && (kind in EMIYA_FX_DUR);
const EVENT_FX = {
  trace: "emiyaTrace", weaponBreak: "emiyaBreak", capacity: "emiyaCapacity", avalon: "emiyaAvalon", throw: "emiyaThrow",
  ruleHit: "emiyaRuleHit", stun: "emiyaStun", caladbolg: "emiyaCaladbolg", caladbolgBlast: "emiyaBlast", smash: "emiyaSmash",
  rho: "emiyaRho", excalibur: "emiyaExcalibur", ubw: "emiyaUbw", ubwEnd: "emiyaUbwEnd",
};

// ---------- สี (r,g,b) ----------
const WHITE = "255,255,255", CYAN = "95,227,255", CYAN_D = "40,140,220", GOLD = "255,212,94", GOLD_L = "255,243,176";
const RED = "220,40,52", RED_L = "255,120,110", PINK = "255,127,182", PINK_L = "255,200,226", FIRE = "255,106,43", EMBER = "255,170,70";
const SEPIA = "232,130,58", STONE = "110,106,94", GREEN = "170,240,170";
const RAINBOW = ["199,125,255", "123,224,255", "140,255,170", "255,209,102", "255,120,170"];
// ใบดาบ: [สีกลาง, สีขอบ, สีด้าม]
const BLADES = {
  kanshou: ["32,32,40", "120,120,140", "120,60,40"],
  bakuya: ["236,236,244", "170,180,200", "120,60,40"],
  steel: ["196,204,214", "120,128,140", "90,70,60"],
  rule: ["190,140,255", "255,220,140", "60,40,40"],
  nine: ["110,106,94", "60,58,52", "60,50,40"],
  excal: ["255,236,170", "255,200,80", "40,70,160"],
  arrow: ["60,60,70", "255,90,80", "40,40,48"],
};
const WEAPON_BLADE = { kb: "kanshou", hrunting: "arrow", rule: "rule", nine: "nine", excalibur: "excal" };

// ---------- คณิต ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const env = (t, a, b, c, d) => (t <= a || t >= d ? 0 : t < b ? (t - a) / (b - a) : t <= c ? 1 : (d - t) / (d - c));
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function rngOf(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
const strHash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000; };

// จุดบนจอของหมาก (ตรงกับ boardDraw drawUnit) · bx, by = พื้นกลางตัวบนจอ · hy = กลางหกเหลี่ยม · r = รัศมีหกเหลี่ยม
function bodyAt(x, y, n = 1, hz = 0) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { cx, cy, bx, by, s, n, K, r: s * 0.4 * K, hy: by - s * 0.86 * K - hz * s * 0.85 };
}
const centerOf = (p, n = 1) => ({ x: p.x + Math.max(1, n | 0) / 2, y: p.y + Math.max(1, n | 0) / 2 });
function groundRing(g, cx, cy, r, rgb, a, lw, z = 0.03) {
  if (a <= 0.01 || r <= 0.01) return;
  g.beginPath();
  for (let i = 0; i <= 48; i++) { const an = (i / 48) * TAU, p = P(cx + Math.cos(an) * r, cy + Math.sin(an) * r, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
  g.strokeStyle = rgba(rgb, a); g.lineWidth = lw; g.stroke();
}
function tileQuad(g, x, y, inset = 0, z = 0.02) {
  const a = P(x + inset, y + inset, z), b = P(x + 1 - inset, y + inset, z), c = P(x + 1 - inset, y + 1 - inset, z), d = P(x + inset, y + 1 - inset, z);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
}
function twinkle(g, x, y, r, a, rgb = WHITE) {
  if (a <= 0.01 || r <= 0.5) return;
  g.fillStyle = rgba(rgb, a);
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r * 0.2, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r * 0.2, y); g.quadraticCurveTo(x, y, x, y - r);
  g.moveTo(x - r * 0.7, y); g.quadraticCurveTo(x, y, x, y + r * 0.15); g.quadraticCurveTo(x, y, x + r * 0.7, y);
  g.quadraticCurveTo(x, y, x, y - r * 0.15); g.quadraticCurveTo(x, y, x - r * 0.7, y);
  g.fill();
}

// ---------- ใบดาบ (จอ) ----------
//  (x, y) = โคนใบ · ang = ทิศปลายใบ · L = ยาวใบ (px) · kind = BLADES · k = ความทึบ · wire = โครงลวดฟ้า (Trace On กำลังก่อตัว 0..1)
function drawBlade(g, x, y, ang, L, kind, k = 1, { wire = 0, glowA = 0 } = {}) {
  if (k <= 0.01 || L <= 1) return;
  const [mid, edge, hilt] = BLADES[kind] || BLADES.steel;
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
  const big = kind === "nine" ? 1.9 : kind === "excal" ? 1.05 : 0.8;
  const W = L * 0.09 * big;
  const pt = (u, v) => [x + c * L * u + nx * W * v, y + s * L * u + ny * W * v];
  g.save();
  if (glowA > 0) { g.globalCompositeOperation = "lighter"; glow(g, x + c * L * 0.5, y + s * L * 0.5, L * 0.55, kind === "excal" ? GOLD : kind === "rule" ? RAINBOW[0] : CYAN, glowA * k); g.globalCompositeOperation = "source-over"; }
  // ใบ
  g.beginPath();
  if (kind === "kanshou" || kind === "bakuya") {
    // ดาบโค้งแบบฟัลชัน
    const a0 = pt(0, -1), a1 = pt(0.55, -1.6), tip = pt(1, 0.4), b1 = pt(0.6, 1.1), b0 = pt(0, 1);
    g.moveTo(...a0); g.quadraticCurveTo(...a1, ...tip); g.quadraticCurveTo(...b1, ...b0);
  } else if (kind === "rule") {
    // ซิกแซกสายฟ้า
    const pts = [[0, -0.9], [0.3, -0.9], [0.18, 0.6], [0.62, 0.3], [0.5, 1.6], [1, 0], [0.62, -0.3], [0.74, -1.4], [0.3, 0.9], [0, 0.9]];
    pts.forEach(([u, v], i) => (i ? g.lineTo(...pt(u, v)) : g.moveTo(...pt(u, v))));
  } else if (kind === "arrow") {
    // ลูกศรสว่าน: แกนเรียวบิดเป็นเกลียว
    g.moveTo(...pt(0, -0.5));
    for (let i = 1; i <= 8; i++) { const u = i / 8; g.lineTo(...pt(u, (i % 2 ? -1 : 1) * (1 - u) * 1.2)); }
    g.lineTo(...pt(1.08, 0));
    for (let i = 8; i >= 0; i--) { const u = i / 8; g.lineTo(...pt(u, (i % 2 ? 1 : -1) * (1 - u) * 0.5)); }
  } else {
    g.moveTo(...pt(0, -1)); g.lineTo(...pt(0.86, -0.9)); g.lineTo(...pt(1, 0)); g.lineTo(...pt(0.86, 0.9)); g.lineTo(...pt(0, 1));
  }
  g.closePath();
  const solid = 1 - wire;
  if (solid > 0.01) {
    const gr = g.createLinearGradient(...pt(0, -1), ...pt(0, 1));
    gr.addColorStop(0, rgba(edge, k * solid)); gr.addColorStop(0.5, rgba(mid, k * solid)); gr.addColorStop(1, rgba(edge, k * solid));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = rgba(kind === "kanshou" ? "200,200,220" : "40,40,50", 0.55 * k * solid); g.lineWidth = 1; g.stroke();
  }
  if (wire > 0.01) {
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = rgba(CYAN, k * wire); g.lineWidth = 1.6; g.stroke();
    g.strokeStyle = rgba(WHITE, 0.6 * k * wire); g.lineWidth = 0.7; g.stroke();
    g.globalCompositeOperation = "source-over";
  }
  // ด้าม + กระบัง
  if (kind !== "arrow") {
    const h0 = pt(0, 0), h1 = pt(-0.22, 0), gA = pt(0, -1.7 * (kind === "excal" ? 1.6 : 1)), gB = pt(0, 1.7 * (kind === "excal" ? 1.6 : 1));
    g.lineCap = "round";
    g.strokeStyle = rgba(kind === "excal" ? GOLD : edge, k); g.lineWidth = Math.max(2, W * 0.55);
    g.beginPath(); g.moveTo(...gA); g.lineTo(...gB); g.stroke();
    g.strokeStyle = rgba(hilt, k); g.lineWidth = Math.max(2, W * 0.75);
    g.beginPath(); g.moveTo(...h0); g.lineTo(...h1); g.stroke();
  }
  g.restore();
}

// ---------- ส่วนประกอบเอฟเฟกต์ ----------
// เส้นวงจรเวทวิ่งขึ้นรอบตัว (Trace On) — k = ความสว่าง · u = ความคืบหน้าของเส้น
function circuits(g, A, k, u, seed, lowQ) {
  if (k <= 0.01) return;
  const N = lowQ ? 5 : 9, R = rngOf(seed);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < N; i++) {
    const ox = (R() - 0.5) * A.r * 2.2, h = A.r * (1.6 + R() * 1.4), top = A.by - h * clamp01(u * (0.8 + R() * 0.5));
    let x = A.bx + ox, y = A.by;
    g.beginPath(); g.moveTo(x, y);
    while (y > top) { y -= A.r * 0.25; x += (R() < 0.5 ? -1 : 1) * A.r * 0.12 * (R() < 0.5 ? 0 : 1); g.lineTo(x, Math.max(y, top)); }
    g.strokeStyle = rgba(CYAN, 0.5 * k); g.lineWidth = 3; g.stroke();
    g.strokeStyle = rgba(WHITE, 0.9 * k); g.lineWidth = 1; g.stroke();
    twinkle(g, x, Math.max(y, top), A.r * 0.18, k, CYAN);
  }
  g.restore();
}
// ละอองแตกกระจาย (จอ)
function shards(g, x, y, R, p, rgb, seed, n = 14) {
  const r = rngOf(seed);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = R * (0.3 + r() * 0.9) * easeOut3(p), sz = R * (0.05 + r() * 0.07) * (1 - p);
    g.fillStyle = rgba(rgb, (1 - p) * (0.6 + r() * 0.4));
    g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 - p * R * 0.4, Math.max(0.6, sz), 0, TAU); g.fill();
  }
  g.restore();
}
// เส้นฟันโค้ง (จอ) รอบจุด (x, y) · ang = ทิศเส้น · u = ส่วนที่วาด · k = ความสว่าง
function slashArc(g, x, y, R, ang, u, k, rgb = WHITE, glowRgb = CYAN) {
  if (k <= 0.01 || u <= 0.01) return;
  const a0 = ang - 1.1, a1 = a0 + 2.2 * u;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (const [w, c, al] of [[9, glowRgb, 0.3], [4, glowRgb, 0.6], [1.8, rgb, 1]]) {
    g.strokeStyle = rgba(c, al * k); g.lineWidth = w;
    g.beginPath(); g.ellipse(x, y, R, R * 0.55, 0, a0, a1); g.stroke();
  }
  g.restore();
}
// ไฟลุกบนช่อง (จอ) — เปลวเล็กที่ฐานกระดาน
function flame(g, x, y, h, k, seed, now) {
  if (k <= 0.01) return;
  const fl = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 90 + seed);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, x, y - h * 0.4, h * (0.7 + 0.2 * fl), FIRE, 0.5 * k);
  glow(g, x, y - h * 0.55, h * 0.4, GOLD_L, 0.6 * k);
  g.restore();
}

// ---------- ท่าตีปกติ ----------
function styleFx(g, e, now, lowQ) {
  const T = EMIYA_MS[e.kind] || 900, p = (now - e.t0) / T;
  if (p < 0 || p > 1 || !okT(e) || !okT(e.to)) return;
  const n = Math.max(1, e.size | 0), A = bodyAt(e.x, e.y, n), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const hitP = EMIYA_HIT_P[e.kind], seed = strHash(`${e.by}|${e.t0 | 0}`);
  const ang = Math.atan2(B.hy - A.hy, B.bx - A.bx);
  if (e.kind === "emiyaKB") {
    // ดาบคู่ขว้างโค้ง (ขาว/ดำ) ถึงเป้าที่ hitP แล้วฟันไขว้ · ฮิตที่ 2 = EMIYA_REPEAT_MS หลังฮิตแรก
    const hit2 = hitP + EMIYA_REPEAT_MS / T;
    for (const [i, kind] of [[0, "kanshou"], [1, "bakuya"]]) {
      const arrive = i ? hit2 : hitP, u = clamp01((p - 0.05) / (arrive - 0.05));
      if (p < arrive) {
        const side = i ? 1 : -1, bend = A.s * 0.9 * side;
        const mx = (A.bx + B.bx) / 2 - Math.sin(ang) * bend, my = (A.hy + B.hy) / 2 + Math.cos(ang) * bend;
        const t = easeIn2(u) * 0.6 + u * 0.4;
        const x = (1 - t) * (1 - t) * A.bx + 2 * (1 - t) * t * mx + t * t * B.bx, y = (1 - t) * (1 - t) * A.hy + 2 * (1 - t) * t * my + t * t * B.hy;
        drawBlade(g, x, y, (REDUCED ? 0 : now / 55) + i * Math.PI, A.s * 0.5, kind, 1, { glowA: lowQ ? 0 : 0.25 });
      }
      const k = env(p, arrive - 0.02, arrive + 0.02, arrive + 0.08, arrive + 0.24);
      slashArc(g, B.bx, B.hy, B.r * 1.4, ang + (i ? 0.9 : -0.9), clamp01((p - arrive) / 0.1), k, i ? WHITE : "200,200,220", i ? "220,230,255" : "90,90,120");
    }
    return;
  }
  if (e.kind === "emiyaBow") {
    // ง้างธนู: ส่วนโค้งดำหน้าตัว + แสงแดงรวมที่ปลายลูกศร → ลูกศรพุ่ง (เส้นแดงยาว) → ปะทะ
    const draw = env(p, 0, 0.15, hitP - 0.12, hitP);
    if (draw > 0.01) {
      const bx = A.bx + Math.cos(ang) * A.r * 0.9, by = A.hy + Math.sin(ang) * A.r * 0.9;
      g.save(); g.strokeStyle = rgba("24,24,30", draw); g.lineWidth = 3; g.lineCap = "round";
      g.beginPath(); g.arc(bx - Math.cos(ang) * A.r * 0.6, by - Math.sin(ang) * A.r * 0.6, A.r * 1.1, ang - 0.9, ang + 0.9); g.stroke();
      g.globalCompositeOperation = "lighter";
      glow(g, bx, by, A.r * (0.4 + 0.5 * clamp01(p / hitP)), RED, 0.8 * draw);
      g.restore();
      drawBlade(g, bx - Math.cos(ang) * A.r * 0.9, by - Math.sin(ang) * A.r * 0.9, ang, A.r * 1.4, "arrow", draw);
    }
    const fly = clamp01((p - (hitP - 0.12)) / 0.12);
    if (p >= hitP - 0.12 && p < hitP + 0.25) {
      const tx = lerp(A.bx, B.bx, fly), ty = lerp(A.hy, B.hy, fly), k = p < hitP ? 1 : 1 - (p - hitP) / 0.25;
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (const [w, c, al] of [[8, RED, 0.35], [3, RED_L, 0.8], [1.2, WHITE, 1]]) {
        g.strokeStyle = rgba(c, al * k); g.lineWidth = w;
        g.beginPath(); g.moveTo(lerp(A.bx, tx, Math.max(0, fly - 0.5)), lerp(A.hy, ty, Math.max(0, fly - 0.5))); g.lineTo(tx, ty); g.stroke();
      }
      g.restore();
    }
    const hk = env(p, hitP - 0.01, hitP + 0.02, hitP + 0.06, hitP + 0.3);
    if (hk > 0) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, B.bx, B.hy, B.r * 1.6, RED, 0.7 * hk); g.restore(); shards(g, B.bx, B.hy, B.r * 1.6, clamp01((p - hitP) / 0.3), RED_L, seed, lowQ ? 6 : 12); }
    return;
  }
  if (e.kind === "emiyaRule") {
    // มีดสายรุ้งพุ่งแทง → วงเวทหกเหลี่ยมบนเป้าแตก
    const u = clamp01(p / hitP), k = env(p, 0, 0.08, hitP + 0.05, hitP + 0.2);
    const dx = lerp(A.bx, B.bx - Math.cos(ang) * B.r * 0.4, easeIn2(u)), dy = lerp(A.hy, B.hy - Math.sin(ang) * B.r * 0.4, easeIn2(u));
    drawBlade(g, dx - Math.cos(ang) * A.r * 0.9, dy - Math.sin(ang) * A.r * 0.9, ang, A.r * 1.1, "rule", k, { glowA: lowQ ? 0 : 0.4 });
    const sp = clamp01((p - hitP) / (1 - hitP));
    if (p >= hitP - 0.1) {
      const sk = p < hitP ? clamp01((p - hitP + 0.1) / 0.1) : 1 - sp;
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + (REDUCED ? 0 : now / 900), push = p > hitP ? easeOut3(sp) * B.r * 0.9 : 0;
        const a2 = a + TAU / 6, R = B.r * 1.25;
        const ox = Math.cos(a + Math.PI / 6) * push, oy = Math.sin(a + Math.PI / 6) * push * 0.6;
        g.strokeStyle = rgba(RAINBOW[i % RAINBOW.length], 0.9 * sk); g.lineWidth = 2;
        g.beginPath(); g.moveTo(B.bx + Math.cos(a) * R + ox, B.hy + Math.sin(a) * R * 0.6 + oy); g.lineTo(B.bx + Math.cos(a2) * R + ox, B.hy + Math.sin(a2) * R * 0.6 + oy); g.stroke();
      }
      g.restore();
    }
    return;
  }
  if (e.kind === "emiyaNine") {
    // ดาบหินยักษ์ฟาดจากเหนือหัวลงกรอบ 2×3 → แสง 9 จุดรัวในกรอบ
    const lane = Array.isArray(e.lane) && e.lane.length ? e.lane : [e.to];
    const c = lane.reduce((s, t) => ({ x: s.x + t.x + 0.5, y: s.y + t.y + 0.5 }), { x: 0, y: 0 });
    const [cx, cy, cs] = P(c.x / lane.length, c.y / lane.length);
    const sw = clamp01(p / hitP), k = env(p, 0, 0.08, hitP + 0.04, hitP + 0.2);
    const a0 = ang - 1.9, a1 = ang + 0.15, a = lerp(a0, a1, easeIn2(sw));
    drawBlade(g, A.bx, A.hy - A.r * 0.4, a, A.s * 1.6, "nine", k);
    const fk = env(p, hitP - 0.01, hitP + 0.02, hitP + 0.25, hitP + 0.5);
    if (fk > 0) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (const t of lane) { tileQuad(g, t.x, t.y, 0.06); g.fillStyle = rgba(GOLD, 0.16 * fk); g.fill(); }
      const R = rngOf(seed);
      for (let i = 0; i < 9; i++) {
        const t = lane[Math.floor(R() * lane.length)], st = hitP + i * 0.03;
        const hk = env(p, st, st + 0.01, st + 0.03, st + 0.1);
        if (hk <= 0) continue;
        const [hx, hy, hs] = P(t.x + 0.2 + R() * 0.6, t.y + 0.2 + R() * 0.6, 0.4);
        slashArc(g, hx, hy, hs * 0.45, R() * TAU, 1, hk, WHITE, STONE);
      }
      glow(g, cx, cy, cs * 1.2, GOLD, 0.2 * fk);
      g.restore();
    }
    return;
  }
  if (e.kind === "emiyaExcal") {
    // ยกดาบทอง → ฟันลงตามแนว: แถบแสงทองวิ่งจากตัวถึงปลายแนว
    const lane = Array.isArray(e.lane) && e.lane.length ? e.lane : [e.to];
    const k = env(p, 0, 0.08, hitP + 0.05, hitP + 0.2);
    drawBlade(g, A.bx, A.hy - A.r * 0.3, lerp(ang - 1.6, ang, easeIn2(clamp01(p / hitP))), A.s * 1.0, "excal", k, { glowA: 0.5 });
    const run = clamp01((p - hitP + 0.08) / 0.16), fk = env(p, hitP - 0.08, hitP, hitP + 0.2, hitP + 0.5);
    if (fk > 0) {
      g.save(); g.globalCompositeOperation = "lighter";
      lane.forEach((t, i) => {
        if ((i + 1) / lane.length > run + 0.01) return;
        tileQuad(g, t.x, t.y, 0.08); g.fillStyle = rgba(GOLD, 0.22 * fk); g.fill();
        const [tx, ty, ts] = P(t.x + 0.5, t.y + 0.5, 0.5);
        glow(g, tx, ty, ts * 0.6, GOLD, 0.25 * fk);
      });
      g.restore();
    }
  }
}

// ---------- เหตุการณ์ ----------
function eventFx(g, e, now, lowQ) {
  const T = EMIYA_FX_DUR[e.kind] || 1000, p = (now - e.t0) / T;
  if (p < 0 || p > 1) return;
  const at = okT(e.at) ? e.at : null, n = Math.max(1, e.size | 0);
  const A = at ? bodyAt(at.x, at.y, n) : null;
  const seed = strHash(`${e.id}|${e.kind}|${e.t0 | 0}`);
  switch (e.kind) {
    case "emiyaTrace": {
      if (!A) return;
      const k = env(p, 0, 0.1, 0.7, 1);
      circuits(g, A, k, clamp01(p / 0.45), seed, lowQ);
      // โครงลวด → อาวุธจริง เหนือหัว
      const wire = 1 - clamp01((p - 0.35) / 0.35), sk = env(p, 0.15, 0.3, 0.8, 1);
      const blade = WEAPON_BLADE[e.weapon] || "steel";
      const L = A.s * (e.weapon === "nine" ? 1.0 : 0.8);
      drawBlade(g, A.bx - L * 0.1, A.hy - A.r * 1.3, -Math.PI / 2 - 0.25, L, blade, sk, { wire, glowA: 0.35 });
      if (e.weapon === "kb") drawBlade(g, A.bx + L * 0.1, A.hy - A.r * 1.3, -Math.PI / 2 + 0.25, L, "bakuya", sk, { wire, glowA: 0.35 });
      g.save(); g.globalCompositeOperation = "lighter";
      groundRing(g, A.cx, A.cy, 0.5 + 0.25 * p, CYAN, 0.7 * k, 2);
      if (e.weapon === "excalibur") glow(g, A.bx, A.hy - A.r, A.r * 3 * clamp01(p * 2), GOLD, 0.35 * k);
      g.restore();
      return;
    }
    case "emiyaBreak": {
      if (!A) return;
      shards(g, A.bx, A.hy - A.r * 1.2, A.r * 1.8, p, CYAN, seed, lowQ ? 8 : 18);
      shards(g, A.bx, A.hy - A.r * 1.2, A.r * 1.2, p, WHITE, seed + 7, lowQ ? 4 : 8);
      return;
    }
    case "emiyaCapacity": {
      if (!A) return;
      const k = env(p, 0, 0.1, 0.6, 1);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < (lowQ ? 6 : 12); i++) {
        const a = (i / 12) * TAU + p * 4, h = p * A.r * 2.6, rr = A.r * (1 - p * 0.4);
        twinkle(g, A.bx + Math.cos(a) * rr, A.hy + A.r * 0.6 - h + Math.sin(a) * rr * 0.4, A.r * 0.22, k, i % 2 ? CYAN : WHITE);
      }
      glow(g, A.bx, A.hy, A.r * 1.4, CYAN, 0.3 * k);
      g.restore();
      return;
    }
    case "emiyaAvalon": {
      if (!A) return;
      const k = env(p, 0, 0.15, 0.6, 1);
      g.save(); g.globalCompositeOperation = "lighter";
      glow(g, A.bx, A.hy, A.r * 2.2, GOLD, 0.35 * k);
      groundRing(g, A.cx, A.cy, 0.35 + 0.4 * easeOut3(p), GOLD_L, 0.8 * k, 2.5);
      groundRing(g, A.cx, A.cy, 0.2 + 0.55 * easeOut3(p), GREEN, 0.5 * k, 1.5);
      // ฝักดาบ (Avalon): รูปทรงทองน้ำเงินลอยขึ้นจางๆ
      const y = A.hy - A.r * (0.4 + p * 1.2);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = rgba("60,90,190", 0.7 * k); g.strokeStyle = rgba(GOLD, 0.9 * k); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(A.bx, y - A.r * 0.9); g.lineTo(A.bx + A.r * 0.22, y - A.r * 0.5); g.lineTo(A.bx + A.r * 0.12, y + A.r * 0.8); g.lineTo(A.bx, y + A.r); g.lineTo(A.bx - A.r * 0.12, y + A.r * 0.8); g.lineTo(A.bx - A.r * 0.22, y - A.r * 0.5); g.closePath(); g.fill(); g.stroke();
      g.restore();
      return;
    }
    case "emiyaThrow": {
      if (!A || !okT(e.to)) return;
      const B = bodyAt(e.to.x, e.to.y, e.tsize || 1), ang = Math.atan2(B.hy - A.hy, B.bx - A.bx);
      const hitT = EMIYA_FX.throwHit / T;
      for (const [i, kind] of [[0, "kanshou"], [1, "bakuya"]]) {
        const u = clamp01(p / hitT);
        if (u >= 1) continue;
        const side = i ? 1 : -1, bend = A.s * 1.4 * side;
        const mx = (A.bx + B.bx) / 2 - Math.sin(ang) * bend, my = (A.hy + B.hy) / 2 + Math.cos(ang) * bend - A.s * 0.6;
        const x = (1 - u) * (1 - u) * A.bx + 2 * (1 - u) * u * mx + u * u * B.bx, y = (1 - u) * (1 - u) * A.hy + 2 * (1 - u) * u * my + u * u * B.hy;
        drawBlade(g, x, y, (REDUCED ? 0 : now / 45) + i * Math.PI, A.s * 0.55, kind, 1, { glowA: lowQ ? 0 : 0.3 });
      }
      const k = env(p, hitT - 0.02, hitT + 0.02, hitT + 0.1, hitT + 0.3);
      slashArc(g, B.bx, B.hy, B.r * 1.4, ang - 0.8, clamp01((p - hitT) / 0.1), k, WHITE, "160,40,50");
      slashArc(g, B.bx, B.hy, B.r * 1.4, ang + 0.8, clamp01((p - hitT) / 0.1), k, WHITE, "90,90,120");
      return;
    }
    case "emiyaRuleHit": {
      if (!okT(e.to)) return;
      const B = bodyAt(e.to.x, e.to.y, 1);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        const k = env(p, i * 0.08, i * 0.08 + 0.1, 0.5, 1);
        g.strokeStyle = rgba(RAINBOW[i], 0.8 * k); g.lineWidth = 1.5;
        g.beginPath(); g.ellipse(B.bx, B.hy, B.r * (0.9 + i * 0.25 + p * 0.4), B.r * (0.55 + i * 0.15 + p * 0.25), 0, 0, TAU); g.stroke();
      }
      g.restore();
      shards(g, B.bx, B.hy, B.r * 1.6, p, RAINBOW[1], seed, lowQ ? 6 : 12);
      return;
    }
    case "emiyaStun": {
      const ids = Array.isArray(e.spots) ? e.spots : [];
      for (const s of ids) {
        if (!okT(s)) continue;
        const B = bodyAt(s.x, s.y, s.size || 1), k = env(p, 0, 0.1, 0.75, 1);
        g.save(); g.globalCompositeOperation = "lighter";
        for (let i = 0; i < 3; i++) {
          const a = (REDUCED ? 0 : now / 220) + (i / 3) * TAU;
          twinkle(g, B.bx + Math.cos(a) * B.r * 0.8, B.hy - B.r * 1.25 + Math.sin(a) * B.r * 0.25, B.r * 0.28, k, GOLD_L);
        }
        g.restore();
      }
      return;
    }
    case "emiyaCaladbolg": {
      if (!A || !okT(e.to)) return;
      const B = bodyAt(e.to.x, e.to.y, e.tsize || 1), ang = Math.atan2(B.hy - A.hy, B.bx - A.bx);
      const hitT = EMIYA_FX.calHit / T, u = clamp01(p / hitT);
      // แสงแดงกลืนตัวชิโร่ตอนปล่อย → ลูกศรสว่านพุ่ง หางเป็นเกลียวแดงน้ำเงิน
      g.save(); g.globalCompositeOperation = "lighter";
      glow(g, A.bx, A.hy, A.r * 2.2, RED, 0.6 * env(p, 0, 0.05, 0.15, 0.4));
      if (p < hitT + 0.05) {
        const x = lerp(A.bx, B.bx, easeIn2(u)), y = lerp(A.hy, B.hy, easeIn2(u));
        const tail = Math.max(0, easeIn2(u) - 0.35);
        const x0 = lerp(A.bx, B.bx, tail), y0 = lerp(A.hy, B.hy, tail);
        g.lineCap = "round";
        for (const [w, c, al] of [[14, CYAN_D, 0.25], [7, RED, 0.6], [2.5, RED_L, 0.9], [1, WHITE, 1]]) {
          g.strokeStyle = rgba(c, al); g.lineWidth = w;
          g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
        }
        if (!lowQ) {
          for (let i = 0; i < 10; i++) {
            const t = tail + (easeIn2(u) - tail) * (i / 10), sx = lerp(A.bx, B.bx, t), sy = lerp(A.hy, B.hy, t);
            const off = Math.sin(i * 1.3 + now / 40) * A.r * 0.35;
            g.fillStyle = rgba(i % 2 ? RED_L : CYAN, 0.7); g.beginPath(); g.arc(sx - Math.sin(ang) * off, sy + Math.cos(ang) * off, 1.8, 0, TAU); g.fill();
          }
        }
        g.globalCompositeOperation = "source-over";
        drawBlade(g, x - Math.cos(ang) * A.s * 0.5, y - Math.sin(ang) * A.s * 0.5, ang, A.s * 0.6, "arrow", 1);
      }
      g.restore();
      return;
    }
    case "emiyaBlast": {
      if (!okT(e.at)) return;
      const c = centerOf(e.at, e.tsize || 1), [bx, by, s] = P(c.x, c.y, 0.3), R = (e.radius || 2) + 0.5;
      const q = easeOut3(clamp01(p / 0.55)), k = 1 - clamp01((p - 0.35) / 0.65);
      g.save(); g.globalCompositeOperation = "lighter";
      // ลูกไฟ (แดงส้มแกนขาว) + วงคลื่นกระแทกบนพื้น + เศษดิน
      glow(g, bx, by - s * 0.5 * q, s * R * 1.1 * q, FIRE, 0.45 * k);
      glow(g, bx, by - s * 0.4 * q, s * R * 0.45 * q, GOLD_L, 0.5 * k);
      glow(g, bx, by, s * 0.8, WHITE, env(p, 0, 0.03, 0.08, 0.25));
      groundRing(g, c.x, c.y, R * q, EMBER, 0.85 * k, 4);
      groundRing(g, c.x, c.y, R * 0.7 * q, CYAN, 0.5 * k, 2);
      g.restore();
      if (Array.isArray(e.tiles)) {
        g.save(); g.globalCompositeOperation = "lighter";
        for (const t of e.tiles) {
          const d = Math.hypot(t.x + 0.5 - c.x, t.y + 0.5 - c.y), tk = env(p, d * 0.08, d * 0.08 + 0.05, 0.45, 0.8);
          if (tk <= 0) continue;
          tileQuad(g, t.x, t.y, 0.08); g.fillStyle = rgba(FIRE, 0.18 * tk); g.fill();
        }
        g.restore();
      }
      shards(g, bx, by - s * 0.3, s * R, p, EMBER, seed, lowQ ? 10 : 26);
      return;
    }
    case "emiyaSmash": {
      if (!A) return;
      const dir = DIRV[e.dir] || [1, 0], tiles = Array.isArray(e.tiles) ? e.tiles : [];
      const hitT = EMIYA_FX.smashHit / T;
      // ยกดาบหินขึ้นเหนือหัว → ทุบลงพื้น (hitT) → รอยแตก + ฝุ่นวิ่งตามแนว
      const ang = Math.atan2(dir[1], dir[0]) - 0.35;
      const sw = clamp01(p / hitT), k = env(p, 0, 0.08, hitT + 0.05, hitT + 0.25);
      drawBlade(g, A.bx, A.hy - A.r * 0.5, lerp(-Math.PI / 2 - 0.2, ang, easeIn2(sw)), A.s * 1.8, "nine", k);
      if (p >= hitT) {
        const q = (p - hitT) / (1 - hitT);
        g.save();
        for (const t of tiles) {
          const d = Math.abs(t.x + 0.5 - A.cx) + Math.abs(t.y + 0.5 - A.cy), tk = env(q, d * 0.06, d * 0.06 + 0.06, 0.55, 1);
          if (tk <= 0) continue;
          tileQuad(g, t.x, t.y, 0.06);
          g.fillStyle = rgba("60,48,36", 0.35 * tk); g.fill();
          g.strokeStyle = rgba(EMBER, 0.6 * tk); g.lineWidth = 1.2;
          const R = rngOf(strHash(`${t.x},${t.y}`) + seed);
          g.beginPath();
          for (let j = 0; j < 3; j++) {
            const a = P(t.x + R(), t.y + R(), 0.03), b = P(t.x + R(), t.y + R(), 0.03);
            g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
          }
          g.stroke();
          if (!lowQ) {
            const [tx, ty, ts] = P(t.x + 0.5, t.y + 0.5, 0.2 + q * 0.9);
            g.fillStyle = rgba("170,150,120", 0.35 * tk * (1 - q)); g.beginPath(); g.arc(tx, ty, ts * 0.35 * (0.5 + q), 0, TAU); g.fill();
          }
        }
        g.restore();
      }
      return;
    }
    case "emiyaRho": {
      if (!A) return;
      // โล่ดอกไม้ 7 กลีบสีชมพูกางหน้าตัว (กลีบทยอยบาน) แล้วหดจางเป็นออร่า
      const k = env(p, 0, 0.1, 0.7, 1);
      g.save(); g.globalCompositeOperation = "lighter";
      const cx = A.bx, cy = A.hy, R = A.r * 1.7;
      for (let i = 0; i < 7; i++) {
        const open = clamp01((p - i * 0.04) / 0.25), a = (i / 7) * TAU - Math.PI / 2 + (REDUCED ? 0 : p * 0.6);
        if (open <= 0) continue;
        const px = cx + Math.cos(a) * R * 0.5 * open, py = cy + Math.sin(a) * R * 0.5 * open * 0.9;
        g.fillStyle = rgba(PINK, 0.28 * k); g.strokeStyle = rgba(PINK_L, 0.85 * k); g.lineWidth = 1.4;
        g.beginPath(); g.ellipse(px, py, R * 0.42 * open, R * 0.24 * open, a, 0, TAU); g.fill(); g.stroke();
      }
      glow(g, cx, cy, R * 1.1, PINK, 0.3 * k);
      g.restore();
      return;
    }
    case "emiyaExcalibur": {
      if (!A) return;
      const tiles = Array.isArray(e.tiles) ? e.tiles : [], dir = DIRV[e.dir] || [1, 0];
      const fire = EMIYA_FX.excalFire / T, hitT = EMIYA_FX.excalHit / T;
      // ชาร์จ: แสงทองรวมเป็นเสา → ฟาด: ลำแสงทองกว้างวิ่งตามแนว → ค้าง → จาง
      const ck = env(p, 0, 0.1, fire, fire + 0.1);
      g.save(); g.globalCompositeOperation = "lighter";
      glow(g, A.bx, A.hy - A.r * 1.2, A.r * (1 + 2 * clamp01(p / fire)), GOLD, 0.6 * ck);
      g.restore();
      drawBlade(g, A.bx, A.hy - A.r * 0.2, lerp(-Math.PI / 2, Math.atan2(dir[1], dir[0]) * 0.6 - 0.3, easeIn2(clamp01(p / fire))), A.s * 1.1, "excal", env(p, 0, 0.05, hitT, hitT + 0.15), { glowA: 0.6 });
      if (p >= fire - 0.02) {
        const run = clamp01((p - fire) / (hitT - fire)), bk = env(p, fire, fire + 0.05, 0.75, 1);
        g.save(); g.globalCompositeOperation = "lighter";
        for (const t of tiles) {
          const d = Math.abs(t.x + 0.5 - A.cx) * Math.abs(dir[0]) + Math.abs(t.y + 0.5 - A.cy) * Math.abs(dir[1]);
          if (d > run * 5.6) continue;
          tileQuad(g, t.x, t.y, 0.04);
          g.globalCompositeOperation = "source-over"; g.fillStyle = rgba(GOLD, 0.32 * bk); g.fill();
          g.globalCompositeOperation = "lighter";
          const [tx, ty, ts] = P(t.x + 0.5, t.y + 0.5, 0.6);
          glow(g, tx, ty, ts * 0.55, GOLD, 0.18 * bk);
        }
        // แกนลำแสงสีขาว
        const end = tiles.length ? tiles.reduce((m, t) => {
          const d = (t.x + 0.5 - A.cx) * dir[0] + (t.y + 0.5 - A.cy) * dir[1];
          return d > m.d ? { d, t } : m;
        }, { d: -1, t: null }) : null;
        if (end && end.t) {
          const L = Math.min(end.d, run * 5.6);
          const a = P(A.cx, A.cy, 0.6), b = P(A.cx + dir[0] * L, A.cy + dir[1] * L, 0.6);
          g.lineCap = "round";
          for (const [w, c, al] of [[A.s * 0.9, GOLD, 0.16], [A.s * 0.38, GOLD_L, 0.3], [A.s * 0.1, WHITE, 0.7]]) {
            g.strokeStyle = rgba(c, al * bk); g.lineWidth = w;
            g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
          }
        }
        g.restore();
      }
      return;
    }
    default:
  }
}
// วงไฟแผ่จากตัวชิโร่ทั่วกระดาน (ฉากเปิดโลกแห่งดาบ)
function ubwRingFx(g, e, now, info, lowQ) {
  const p = (now - e.t0) / EMIYA_FX_DUR.emiyaUbw;
  if (p < 0 || p > 1 || !okT(e.at)) return;
  const c = centerOf(e.at, e.size || 1), maxR = Math.hypot(info.cols, info.rows);
  const q = easeOut3(clamp01(p / (EMIYA_FX.ubwRing / EMIYA_FX_DUR.emiyaUbw))), R = 0.4 + q * maxR, k = 1 - clamp01((p - 0.7) / 0.3);
  g.save(); g.globalCompositeOperation = "lighter";
  for (const [dr, rgb, a, lw] of [[0, FIRE, 0.9, 6], [-0.35, EMBER, 0.6, 3], [-0.8, GOLD_L, 0.35, 2]]) groundRing(g, c.x, c.y, Math.max(0.1, R + dr), rgb, a * k, lw, 0.05);
  if (!lowQ) {
    const N = 40;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU, x = c.x + Math.cos(a) * R, y = c.y + Math.sin(a) * R;
      if (x < -1 || y < -1 || x > info.cols + 1 || y > info.rows + 1) continue;
      const [sx, sy, s] = P(x, y, 0);
      flame(g, sx, sy, s * 0.6, k, i, now);
    }
  }
  g.restore();
}

// ---------- ชั้นค้าง: โลกแห่งดาบ ----------
// ความเข้มของโลก (เข้า = ตามวงไฟ · ออก = จางตาม emiyaUbwEnd)
function worldLevel(em, fx, now) {
  let k = em && em.ubw ? 1 : 0;
  for (const e of fx || []) {
    if (e.kind === "emiyaUbw") { const q = (now - e.t0) / EMIYA_FX.ubwRing; if (q >= 0 && q < 1) k = Math.min(k, easeOut3(q)); }
    if (e.kind === "emiyaUbwEnd") { const q = (now - e.t0) / EMIYA_FX_DUR.emiyaUbwEnd; if (q >= 0 && q < 1) k = Math.max(k, 1 - q); }
  }
  return k;
}
export const emiyaWorldOn = (em, fx, now) => worldLevel(em, fx, now) > 0.01;
// พื้นโทนส้มซีเปียทั้งกระดาน + รอยไหม้จางๆ (ใต้ไฮไลต์)
export function drawEmiyaWorld(g, em, info, fx, now, lowQ) {
  const k = worldLevel(em, fx, now);
  if (k <= 0.01) return;
  g.save();
  const a = P(0, 0, 0), b = P(info.cols, 0, 0), c = P(info.cols, info.rows, 0), d = P(0, info.rows, 0);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
  g.globalCompositeOperation = "multiply";
  g.fillStyle = rgba("240,170,110", 0.55 * k); g.fill();
  g.globalCompositeOperation = "lighter";
  g.fillStyle = rgba(SEPIA, 0.1 * k); g.fill();
  if (!lowQ) {
    const pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 1400);
    for (let i = 0; i < 6; i++) {
      const x = hash01(i * 3.1) * info.cols, y = hash01(i * 7.7) * info.rows, [sx, sy, s] = P(x, y, 0);
      glow(g, sx, sy, s * (2 + pulse), EMBER, 0.08 * k);
    }
  }
  g.restore();
}
// ช่องที่ปักดาบ (สุ่มคงที่ต่อช่อง ~1 ใน 5 · ไม่ปักบนสิ่งกีดขวาง)
function swordTiles(info) {
  if (info.__emiyaSwords && info.__emiyaSwords.cols === info.cols && info.__emiyaSwords.rows === info.rows) return info.__emiyaSwords.list;
  const blocked = new Set((info.terrain || []).map((t) => `${t.x},${t.y}`));
  const list = [];
  for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
    if (blocked.has(`${x},${y}`) || hash01(x * 13.7 + y * 91.3) > 0.2) continue;
    const r = rngOf(x * 977 + y * 131 + 7);
    list.push({ x: x + 0.2 + r() * 0.6, y: y + 0.2 + r() * 0.6, lean: (r() - 0.5) * 0.7, len: 0.55 + r() * 0.35, kind: ["steel", "steel", "steel", "kanshou", "bakuya", "excal", "rule"][Math.floor(r() * 7)], seed: x * 31 + y });
  }
  info.__emiyaSwords = { cols: info.cols, rows: info.rows, list };
  return list;
}
// ดาบปักพื้นที่ขึ้นเต็มแล้ว = วาดลงแผ่นรวม (atlas) ครั้งเดียว แล้วแปะทีละช่องทุกเฟรม — ไล่สีใบดาบ ~40 เล่มสดทุกเฟรมกิน ~1.7ms
//  และ canvas แยกใบละเล่มต้องส่งขึ้น GPU ทีละใบทุกเฟรม (~0.85ms) — แผ่นเดียว = texture เดียว
//  ความละเอียด = สเกลจริงของ g (dpr × ซูม) จึงไม่เบลอ · กล้องซูม/หมุน (ขนาดบนจอเปลี่ยน) = สร้างใหม่ · เงาใต้ดาบอบรวมไว้ด้วย
let ATLAS = null; // { key, cv, at: Map(seed → { sx, sy, sw, sh, ox, oy, w, h }) }
function swordAtlas(g, list) {
  const tr = typeof g.getTransform === "function" ? g.getTransform() : null;
  const sc = tr ? Math.max(0.5, Math.hypot(tr.a, tr.b)) : 1;
  let key = `${Math.round(sc * 20)}`;
  for (const e of list) key += `|${e.s.seed}:${Math.round(e.L * 4)}`;
  if (ATLAS && ATLAS.key === key) return ATLAS;
  if (typeof document === "undefined") return null;
  // จัดเรียงเป็นแถว กว้างไม่เกิน 1024 (พิกัดตรรกะ)
  const boxes = list.map((e) => { const w = Math.ceil(e.L * 1.1) + 8, h = Math.ceil(e.L * 1.3) + 8; return { e, w, h }; });
  let x = 0, y = 0, rowH = 0, W = 0;
  for (const b of boxes) {
    if (x + b.w > 1024) { x = 0; y += rowH + 2; rowH = 0; }
    b.x = x; b.y = y; x += b.w + 2; rowH = Math.max(rowH, b.h); W = Math.max(W, x);
  }
  const H = y + rowH;
  if (!W || !H) return null;
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(W * sc); cv.height = Math.ceil(H * sc);
  const cg = cv.getContext("2d");
  if (!cg) return null;
  cg.scale(sc, sc);
  const at = new Map();
  for (const b of boxes) {
    const { s, L } = b.e, ox = b.x + b.w / 2, oy = b.y + b.h - 6, gs = L / s.len;
    cg.fillStyle = rgba("40,24,14", 0.35); cg.beginPath(); cg.ellipse(ox, oy, gs * 0.12, gs * 0.05, 0, 0, TAU); cg.fill();
    drawBlade(cg, ox + Math.sin(s.lean) * L * 0.95, oy - Math.cos(s.lean) * L * 0.95, Math.PI / 2 + s.lean, L * 0.95, s.kind, 0.95);
    at.set(s.seed, { sx: b.x * sc, sy: b.y * sc, sw: b.w * sc, sh: b.h * sc, ox: b.w / 2, oy: b.h - 6, w: b.w, h: b.h });
  }
  ATLAS = { key, cv, at };
  return ATLAS;
}
// ดาบปักพื้น + อาวุธที่ถือลอยข้างตัว — เรียงความลึกกับตัวละคร
export function emiyaItems(items, g, em, units, fx, now, lowQ, info) {
  const k = worldLevel(em, fx, now);
  if (k > 0.01) {
    const occupied = new Set(units.filter((u) => !u.corpse).flatMap((u) => {
      const n = Math.max(1, u.size | 0), out = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) out.push(`${Math.round(u.rx) + i},${Math.round(u.ry) + j}`);
      return out;
    }));
    const vis = [];
    for (const s of swordTiles(info)) {
      if (occupied.has(`${Math.floor(s.x)},${Math.floor(s.y)}`)) continue;
      // ดาบโผล่ขึ้นจากพื้นตามวงไฟ (เรียงตามระยะ — ใช้ลำดับสุ่มแทนระยะจริงให้ดูกระจาย)
      const rise = k >= 1 ? 1 : clamp01(k * 1.3 - hash01(s.seed) * 0.3);
      if (rise <= 0.01) continue;
      const [bx, by, sc] = P(s.x, s.y, 0);
      vis.push({ s, rise, bx, by, sc, L: sc * s.len * rise });
    }
    const atl = k >= 1 && vis.length ? swordAtlas(g, vis) : null;
    const alpha = Math.min(1, k * 1.2) * (lowQ ? 0.9 : 1);
    for (const v of vis) {
      const { s, bx, by, sc, L } = v, r = atl && atl.at.get(s.seed);
      items.push({ d: depthOf(s.x, s.y), f: r ? () => {
        if (alpha < 1) { g.save(); g.globalAlpha *= alpha; }
        g.drawImage(atl.cv, r.sx, r.sy, r.sw, r.sh, bx - r.ox, by - r.oy, r.w, r.h);
        if (alpha < 1) g.restore();
      } : () => {
        g.save(); g.globalAlpha *= alpha;
        g.fillStyle = rgba("40,24,14", 0.35); g.beginPath(); g.ellipse(bx, by, sc * 0.12, sc * 0.05, 0, 0, TAU); g.fill();
        drawBlade(g, bx + Math.sin(s.lean) * L * 0.95, by - Math.cos(s.lean) * L * 0.95, Math.PI / 2 + s.lean, L * 0.95, s.kind, 0.95);
        g.restore();
      } });
    }
  }
  // อาวุธที่ถือ: ลอยเฉียงหลังไหล่ (ไม่วาดระหว่างท่าตีของตัวเอง — ท่าตีวาดอาวุธเอง)
  const us = em && Array.isArray(em.units) ? em.units : [];
  for (const c of us) {
    if (!c.weapon) continue;
    const u = units.find((it) => it.id === c.id && !it.corpse);
    if (!u || (u.alpha != null && u.alpha < 0.05)) continue;
    const busy = (fx || []).some((e) => e && (e.by === c.id || e.id === c.id) && (e.kind in EMIYA_MS || e.kind === "emiyaTrace") && now - e.t0 < (EMIYA_FX_DUR[e.kind] || 0));
    if (busy) continue;
    const n = Math.max(1, u.size | 0), rx = u.rx + (u.ox || 0), ry = u.ry + (u.oy || 0), A = bodyAt(rx, ry, n, u.hz || 0);
    const bob = REDUCED ? 0 : Math.sin(now / 650 + strHash(c.id)) * A.r * 0.08;
    items.push({ d: depthOf(rx + n / 2, ry + n / 2) + 0.0012, f: () => {
      g.save(); if (u.alpha != null) g.globalAlpha *= u.alpha;
      const blade = WEAPON_BLADE[c.weapon] || "steel", L = A.r * (c.weapon === "nine" ? 1.9 : 1.5);
      const x = A.bx + A.r * 0.95, y = A.hy + A.r * 0.55 + bob;
      drawBlade(g, x, y, -Math.PI / 2 + 0.35, L, blade, 0.95, { glowA: lowQ ? 0 : 0.18 });
      if (c.weapon === "kb") drawBlade(g, x - A.r * 0.3, y + A.r * 0.05, -Math.PI / 2 + 0.7, L * 0.95, "bakuya", 0.95);
      if (c.weapon === "hrunting") {
        g.strokeStyle = rgba("24,24,30", 0.95); g.lineWidth = 2.4; g.lineCap = "round";
        g.beginPath(); g.arc(x - A.r * 0.5, y - L * 0.45, L * 0.5, -1.0, 1.0); g.stroke();
      }
      g.restore();
    } });
  }
}
const VIGNETTE = { g: null, key: "", ctx: null }; // ไล่สีขอบจอ (สร้างใหม่เมื่อมุมมอง/ความเข้มเปลี่ยน)
// ฟ้าโลกแห่งดาบ: เฟืองยักษ์หมุนช้าที่ขอบบน + ประกายไฟลอยขึ้น + ขอบจออุ่น (ทับตัวละคร)
export function drawEmiyaSky(g, em, info, fx, now, lowQ, view) {
  const k = worldLevel(em, fx, now);
  if (k <= 0.01) return;
  const x0 = view && Number.isFinite(view.x0) ? view.x0 : 0, y0 = view && Number.isFinite(view.y0) ? view.y0 : 0;
  const x1 = view && Number.isFinite(view.x1) ? view.x1 : 1280, y1 = view && Number.isFinite(view.y1) ? view.y1 : 720;
  const W = x1 - x0, H = y1 - y0;
  g.save();
  // ขอบจอส้มอุ่น
  const vk = `${x0 | 0}|${y0 | 0}|${W | 0}|${H | 0}|${Math.round(k * 20)}`;
  if (!VIGNETTE.g || VIGNETTE.key !== vk || VIGNETTE.ctx !== g) {
    const vg = g.createRadialGradient(x0 + W / 2, y0 + H * 0.55, Math.min(W, H) * 0.35, x0 + W / 2, y0 + H * 0.55, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(255,150,70,0)"); vg.addColorStop(1, rgba("150,60,20", 0.32 * Math.round(k * 20) / 20));
    Object.assign(VIGNETTE, { g: vg, key: vk, ctx: g });
  }
  g.fillStyle = VIGNETTE.g; g.fillRect(x0, y0, W, H);
  // เฟือง
  const spin = REDUCED ? 0 : now / 9000;
  for (const [fx0, fy0, r, dirS, teeth] of [[0.12, 0.08, 0.13, 1, 14], [0.86, 0.05, 0.17, -1, 18], [0.55, -0.02, 0.09, 1, 10]]) {
    const cx = x0 + W * fx0, cy = y0 + H * fy0, R = Math.min(W, H) * r;
    gear(g, cx, cy, R, teeth, spin * dirS, 0.22 * k);
  }
  // ประกายไฟลอยขึ้น
  if (!lowQ) {
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 46; i++) {
      const sp = 6000 + hash01(i) * 5000, ph = REDUCED ? hash01(i * 2.3) : ((now / sp) + hash01(i * 2.3)) % 1;
      const x = x0 + W * hash01(i * 5.1) + Math.sin(ph * 6 + i) * 18, y = y1 - ph * H * 1.1;
      g.fillStyle = rgba(i % 3 ? EMBER : GOLD_L, 0.75 * Math.sin(ph * Math.PI) * k);
      g.beginPath(); g.arc(x, y, 1.2 + hash01(i * 9.7) * 1.6, 0, TAU); g.fill();
    }
  }
  g.restore();
}
function gear(g, cx, cy, R, teeth, ang, a) {
  g.save(); g.translate(cx, cy); g.rotate(ang);
  g.fillStyle = rgba("70,36,18", a); g.strokeStyle = rgba("255,190,120", a * 0.6); g.lineWidth = 1.5;
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * TAU, a1 = ((i + 1) / (teeth * 2)) * TAU, rr = i % 2 ? R : R * 1.12;
    g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  g.closePath(); g.moveTo(R * 0.35, 0); g.arc(0, 0, R * 0.35, 0, TAU, true);
  g.fill("evenodd"); g.stroke();
  g.restore();
}

// ---------- จุดเข้า ----------
export function emiyaFx(g, e, now, lowQ, ctx) {
  if (e.kind in EMIYA_MS) { styleFx(g, e, now, lowQ); return; }
  if (e.kind === "emiyaUbw") { ubwRingFx(g, e, now, (ctx && ctx.info) || { cols: 12, rows: 12 }, lowQ); return; }
  if (e.kind === "emiyaUbwEnd") return; // วาดผ่าน worldLevel (โลกจางหาย)
  eventFx(g, e, now, lowQ);
}

// socket "emiyaFx" { kind, id, color, at, size, ... } → { fx, look, shake, later } (BoardStage)
//  ctx = { posOf(id), sizeOf(id) } · เลขดาเมจของสกิล (throwHit / caladbolgBlast / caladbolgSplash / excaliburHit) ขึ้นตรงจังหวะปะทะ
export function emiyaEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], later: [] };
  if (!ev || typeof ev.kind !== "string") return out;
  const posOf = ctx.posOf || (() => null), sizeOf = ctx.sizeOf || (() => 1);
  const float = (id, dmg, dodge, extra = {}) => {
    const p = posOf(id) || extra.at;
    if (!okT(p)) return null;
    return { kind: "float", x: p.x, y: p.y, text: dodge ? "หลบ" : `-${dmg | 0}`, size: 28, ...extra.style, hitIds: dodge ? undefined : [id] };
  };
  const base = { id: ev.id, at: ev.at, size: ev.size || 1, color: ev.color };
  switch (ev.kind) {
    case "throwHit": {
      const f = float(ev.targetId, ev.dmg, ev.dodge, { at: ev.to });
      if (f) out.fx.push(f);
      return out;
    }
    case "caladbolgSplash":
    case "excaliburHit": {
      for (const h of Array.isArray(ev.hits) ? ev.hits : []) { const f = float(h.id, h.dmg, h.dodge); if (f) out.fx.push(f); }
      if (ev.kind === "excaliburHit" && out.fx.length) out.shake.push(0);
      return out;
    }
    case "caladbolgBlast": {
      out.fx.push({ kind: "emiyaBlast", ...base, at: ev.at, tsize: ev.tsize || 1, radius: ev.radius || 2, tiles: ev.tiles || [] });
      out.shake.push(EMIYA_FX.blastBoom);
      if (okT(ev.at)) out.look.push([ev.at, 0]);
      const list = [];
      for (const h of Array.isArray(ev.hits) ? ev.hits : []) { const f = float(h.id, h.dmg, h.dodge, { at: ev.at, style: { size: 32 } }); if (f) list.push(f); }
      if (list.length) out.later.push([EMIYA_FX.blastBoom, list]);
      return out;
    }
    case "stun": {
      const spots = (Array.isArray(ev.ids) ? ev.ids : []).map((id) => { const p = posOf(id); return p ? { x: p.x, y: p.y, size: sizeOf(id) } : null; }).filter(Boolean);
      if (spots.length) out.later.push([450, [{ kind: "emiyaStun", ...base, spots }]]);
      return out;
    }
    default:
  }
  const kind = EVENT_FX[ev.kind];
  if (!kind) return out;
  const f = { kind, ...base };
  for (const k of ["weapon", "prev", "dir", "tiles", "to", "targetId", "tsize", "why", "cap"]) if (ev[k] !== undefined) f[k] = ev[k];
  out.fx.push(f);
  if (ev.kind === "caladbolg" && okT(ev.to)) out.look.push([ev.to, 250]);
  if (ev.kind === "smash") out.shake.push(EMIYA_FX.smashHit);
  if (ev.kind === "excalibur") out.shake.push(EMIYA_FX.excalFire);
  if (ev.kind === "ubw") { out.shake.push(0); out.shake.push(600); }
  if (ev.kind === "throw" && okT(ev.to)) out.look.push([ev.to, 200]);
  return out;
}

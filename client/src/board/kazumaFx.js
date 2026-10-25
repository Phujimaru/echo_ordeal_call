// ============================================================
//  เอฟเฟกต์บนกระดานของเคนซากิ คาซุมะ (characters/kensaki_kazuma.js · GRID_PLAN §7.19)
//  ธีม Kamen Rider Blade: เกราะเงิน/กรมท่า/แดงเลือดหมู · ตราโพทอง (♠) · ดาบเบลย์ เราเซอร์ · สายฟ้าฟ้าขาว (THUNDER Deer) ·
//  แผ่นแสงฟ้า Orichalcum Element (แปลงร่าง) · การ์ดตระกูลโพ (Rouze)
//
//  ตีปกติ (attackStyle — STYLE_MS / STYLE_HIT_P ใน boardDraw) · fx { x, y (มุมบนซ้ายผู้ตี), size, to, toSize, lane?, by, dodge? }
//   kazumaBlade  ร่างเบลด: ชักดาบเบลย์ เราเซอร์ ง้างไปหลัง → ฟันโค้งเป็นจันทร์เสี้ยวเงินขอบแดง (พุ่งเข้าพร้อม anim "lunge") → รอยฟัน + ประกายทอง + ตราโพวาบ
//                ระยะ 3+ = คลื่นดาบจันทร์เสี้ยวพุ่งไปหาเป้า · BEAT (fx.lane = กรอบ) = กวาดโค้งบนพื้นทั่วกรอบ + ทุกช่องมีรอยฟัน
//   kazumaPunch  ร่างคน: ย่อตัว → พุ่งเข้า (เงาติดตาเงิน/แดง + เส้นความเร็ว) → หมัดกระแทก (หนามแสงแบบการ์ตูน + คลื่นวงบนพื้น)
//   kazumaBlast  Lightning Blast: การ์ด KICK + THUNDER พุ่งเข้าตัว + ตราโพทองบนพื้น → กระโดดโค้งแล้วดิ่งเป็นดาวหางสายฟ้า (ไรเดอร์คิก) →
//                สายฟ้าฟาดจากฟ้าลงเป้า + ตราโพทองแผ่บนพื้น (fx.lane = ช่องอื่นในกรอบโดนสายฟ้าไล่กัน)
//   kazumaSlash  Lightning Slash: การ์ด SLASH + THUNDER เข้าดาบ → ดาบเรืองสายฟ้า → ฟันปล่อยคลื่นดาบสายฟ้าตามแนว (fx.lane) → รอยฟันเรืองบนพื้นทุกช่อง
//   จังหวะ kazumaBlade/kazumaPunch ปะทะที่ ~385 ms = ตรงกับ anim "lunge" ของ BoardCanvas (LUNGE_MS 620 · ชนที่ 62%) — BoardStage เล่น lunge ให้เมื่อห่าง ≤ 2
//  เหตุการณ์ (socket "kazumaFx" → kazumaEventFx → { fx, look, shake, later }):
//   henshin (แผ่นแสง Orichalcum ลายโพกางออกแล้ววิ่งผ่านตัว + เงาเกราะวาบ) · unhenshin (เกราะแตกเป็นเศษเงิน/กรมท่า) ·
//   card (การ์ดลอยลงรูดผ่านเครื่องอ่าน · ครบสูตร = วงทอง) · rouze (รูดการ์ด → ตราโพเหนือหัว · ท่า Lightning = การ์ดวน + สายฟ้า) ·
//   metal (ร่างเหล็ก: แสงเงาวิ่งผ่านตัว + โล่หกเหลี่ยม) · heal (ประกายเขียวขาวลอยขึ้น) · sonicDash (ตราโพ + สายฟ้าแตกที่จุดออกตัว) ·
//   sonicHit (สายฟ้าฟาดลงเป้า + ตราโพแผ่ + เลขดาเมจ · side = คนในแถว BEAT)
//  ฉากพุ่ง Lightning Sonic (state.dash { style: "kazumaSonic" } → BoardStage ส่ง fx "kazumaSonic" { path, step, size } ตรงกับ anim "move"):
//   ริบบอนแสงกรมท่า/ฟ้า/ขาว + สายฟ้าพันตามทาง + เงาติดตาหกเหลี่ยมเงินขอบแดง + เส้นความเร็วบนพื้น + ตราโพวาบตอนถึงปลายทาง
//  lowQ = ตัดกิ่งสายฟ้า/อนุภาค/ชั้นเรืองครึ่งหนึ่ง · ลดการเคลื่อนไหว = สายฟ้าไม่สั่น/ไม่มีเงาติดตา (รูปเดิมทั้งฉาก)
// ============================================================
import { P, glow, hexPath } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ ----------
export const KAZUMA_MS = { kazumaBlade: 800, kazumaPunch: 700, kazumaBlast: 1100, kazumaSlash: 1000 };
export const KAZUMA_HIT_P = { kazumaBlade: 0.48, kazumaPunch: 0.55, kazumaBlast: 0.55, kazumaSlash: 0.45 };
//  server พัก (skillBeat): พุ่ง 0.09 วิ/ช่อง + 0.35 · ชน 0.7 วิ — ภาพต้องไม่ช้ากว่านั้น
export const KAZUMA_FX = { dashStep: 90, sonicBoom: 120, dashFade: 460, henshinPass: 620 };
export const kazumaSonicDur = (path) => Math.max(1, (Array.isArray(path) ? path.length : 1) - 1) * KAZUMA_FX.dashStep + KAZUMA_FX.dashFade + 40;
export const KAZUMA_FX_DUR = {
  ...KAZUMA_MS,
  kazumaHenshin: 1300, kazumaUnhenshin: 850, kazumaCard: 900, kazumaRouze: 1100, kazumaMetal: 900, kazumaHeal: 1100,
  kazumaDashStart: 750, kazumaSonic: 1400, kazumaSonicHit: 950,
};
export const isKazumaFx = (kind) => typeof kind === "string" && (kind in KAZUMA_FX_DUR);
const EVENT_FX = {
  henshin: "kazumaHenshin", unhenshin: "kazumaUnhenshin", card: "kazumaCard", rouze: "kazumaRouze", metal: "kazumaMetal",
  heal: "kazumaHeal", sonicDash: "kazumaDashStart", sonicHit: "kazumaSonicHit",
};
// ตรงกับ BoardCanvas animPose "lunge" (ง้าง 40% → พุ่ง → ชนที่ 62% → กลับ)
const LUNGE_MS = 620, LUNGE_HIT = 0.62;

// ---------- สี (r,g,b) ----------
const WHITE = "255,255,255", BOLT = "150,220,255", BOLT_D = "60,140,255", GOLD = "255,206,90", GOLD_L = "255,240,180";
const CRIMSON = "196,28,58", CRIMSON_L = "255,90,110", SILVER = "214,222,236", STEEL = "150,162,184", NAVY = "28,48,120";
const NAVY_L = "70,110,210", ORI = "90,170,255", GREEN = "150,240,170";
// แถบสีบนการ์ดตามชนิด (การ์ดตระกูลโพ)
const CARD_TINT = {
  slash: CRIMSON, beat: "255,120,60", tackle: "170,120,70", kick: "255,170,40", thunder: BOLT, metal: SILVER,
  magnet: "190,110,255", mach: "80,230,210", time: "140,230,120",
};

// ---------- คณิต ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const env = (t, a, b, c, d) => (t <= a || t >= d ? 0 : t < b ? (t - a) / (b - a) : t <= c ? 1 : (d - t) / (d - c));
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const strHash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000; };
function rngOf(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

// จุดบนจอของหมาก (ตรงกับ boardDraw drawUnit) · bx, by = พื้นกลางตัวบนจอ · hy = กลางหกเหลี่ยม · r = รัศมีหกเหลี่ยม
function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { cx, cy, bx, by, s, n, K, r: s * 0.4 * K, hy: by - s * 0.86 * K };
}
const mdist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
// ระยะพุ่งของ anim "lunge" (หน่วยช่อง ตามแนว from → to) ที่เวลา t ms
function lungeD(from, to, t) {
  const p = clamp01(t / LUNGE_MS), reach = Math.max(0, Math.hypot(to.x - from.x, to.y - from.y) - 0.55);
  if (p < 0.4) return -0.22 * Math.sin((p / 0.4) * Math.PI / 2);
  if (p < LUNGE_HIT) { const q = (p - 0.4) / (LUNGE_HIT - 0.4); return -0.22 + (reach + 0.22) * q * q; }
  const q = (p - LUNGE_HIT) / (1 - LUNGE_HIT);
  return reach * Math.pow(1 - q, 3);
}
// BoardStage ใส่ anim "lunge" ให้ท่าดาบ/หมัดเมื่อห่าง ≤ 2 และไม่ใช่ lowQ — ภาพต้องตามตัวที่พุ่ง
const lunges = (e, lowQ) => !lowQ && (e.kind === "kazumaBlade" || e.kind === "kazumaPunch") && mdist(e, e.to) <= 2;
function attackerAt(e, t, lowQ) {
  if (!lunges(e, lowQ)) return bodyAt(e.x, e.y, e.size || 1);
  const L = Math.hypot(e.to.x - e.x, e.to.y - e.y) || 1, d = lungeD(e, e.to, t);
  return bodyAt(e.x + ((e.to.x - e.x) / L) * d, e.y + ((e.to.y - e.y) / L) * d, e.size || 1);
}

// ---------- ชิ้นส่วนภาพ ----------
// สายฟ้าหยัก: จุดหักทุก ~14 px · jitter ตามความยาว · กิ่งย่อย (branch) แตกออกจากกลางเส้น
function bolt(g, x1, y1, x2, y2, seed, a, w, { jitter = 0.22, branch = 2, lowQ = false, core = WHITE, mid = BOLT, outer = BOLT_D } = {}) {
  if (a <= 0.01) return;
  const rnd = rngOf(seed);
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return;
  const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  const steps = Math.max(3, Math.round(len / 14));
  const pts = [[x1, y1]];
  for (let i = 1; i < steps; i++) {
    const t = i / steps, off = (rnd() - 0.5) * len * jitter * Math.sin(t * Math.PI);
    pts.push([lerp(x1, x2, t) + nx * off, lerp(y1, y2, t) + ny * off]);
  }
  pts.push([x2, y2]);
  const stroke = (rgb, lw, alpha) => {
    g.strokeStyle = rgba(rgb, alpha); g.lineWidth = lw;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  };
  g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.globalCompositeOperation = "lighter";
  if (!lowQ) stroke(outer, w * 3.4, a * 0.32);
  stroke(mid, w * 1.6, a * 0.85);
  stroke(core, w * 0.7, a);
  g.restore();
  const nb = lowQ ? Math.min(1, branch) : branch;
  for (let b = 0; b < nb; b++) {
    const i = 1 + Math.floor(rnd() * (pts.length - 2));
    const [bx, by] = pts[i], ang = Math.atan2(y2 - y1, x2 - x1) + (rnd() - 0.5) * 1.6, bl = len * (0.18 + rnd() * 0.22);
    bolt(g, bx, by, bx + Math.cos(ang) * bl, by + Math.sin(ang) * bl, seed + 31 * (b + 1), a * 0.7, w * 0.55, { jitter: 0.3, branch: 0, lowQ, core, mid, outer });
  }
}
// สายฟ้าแตกกิ่งรอบจุด (ปะทะ)
function burst(g, x, y, r, seed, a, lowQ) {
  if (a <= 0.01) return;
  const n = lowQ ? 5 : 9, rnd = rngOf(seed);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + rnd() * 0.5, l = r * (0.6 + rnd() * 0.6);
    bolt(g, x, y, x + Math.cos(ang) * l, y + Math.sin(ang) * l * 0.75, seed + i * 7, a, 2.2, { jitter: 0.35, branch: lowQ ? 0 : 1, lowQ });
  }
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, x, y, r * 1.1, BOLT, 0.55 * a);
  glow(g, x, y, r * 0.45, WHITE, 0.8 * a);
  g.restore();
}
// สายฟ้าฟาดจากฟ้าลงจุด (x, y)
function skyBolt(g, x, y, h, seed, a, w, lowQ) {
  if (a <= 0.01) return;
  const rnd = rngOf(seed);
  bolt(g, x + (rnd() - 0.5) * h * 0.35, y - h, x, y, seed, a, w, { jitter: 0.18, branch: lowQ ? 1 : 3, lowQ });
}

// ตราโพ (♠) — รูปหลายเหลี่ยมปกติ (หน่วย: ยอด y = -1 · ก้าน y ≈ 0.92) คำนวณครั้งเดียว ใช้ทั้งบนจอและบนพื้น
const SPADE = (() => {
  const out = [];
  const cub = (p0, p1, p2, p3, n) => {
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
  };
  out.push([0, -1]);
  cub([0, -1], [0.55, -0.45], [1.05, -0.05], [0.62, 0.42], 10);
  cub([0.62, 0.42], [0.38, 0.66], [0.1, 0.55], [0.06, 0.32], 6);
  out.push([0.24, 0.92], [-0.24, 0.92], [-0.06, 0.32]);
  cub([-0.06, 0.32], [-0.1, 0.55], [-0.38, 0.66], [-0.62, 0.42], 6);
  cub([-0.62, 0.42], [-1.05, -0.05], [-0.55, -0.45], [0, -1], 10);
  return out;
})();
// ตราโพบนจอ (ตั้งตรง) ขนาด r · rot = เอียง
function spade(g, x, y, r, fillRgb, a, strokeRgb = null, rot = 0) {
  if (a <= 0.01 || r < 0.5) return;
  g.save(); g.translate(x, y); if (rot) g.rotate(rot);
  g.beginPath();
  SPADE.forEach(([u, v], i) => (i ? g.lineTo(u * r, v * r) : g.moveTo(u * r, v * r)));
  g.closePath();
  g.fillStyle = rgba(fillRgb, a); g.fill();
  if (strokeRgb) { g.strokeStyle = rgba(strokeRgb, a); g.lineWidth = Math.max(1, r * 0.09); g.lineJoin = "round"; g.stroke(); }
  g.restore();
}
// ตราโพนอนบนพื้น (หน่วยช่อง) ที่จุดกลาง (cx, cy) รัศมี R · ยอดชี้ไปทางหลังกระดาน (−y)
function groundSpade(g, cx, cy, R, rgb, a, { stroke = null, lw = 2, fill = true, z = 0.02 } = {}) {
  if (a <= 0.01 || R <= 0.01) return;
  g.beginPath();
  SPADE.forEach(([u, v], i) => { const p = P(cx + u * R, cy + v * R, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  g.closePath();
  if (fill) { g.fillStyle = rgba(rgb, a); g.fill(); }
  if (stroke) { g.strokeStyle = rgba(stroke, a); g.lineWidth = lw; g.lineJoin = "round"; g.stroke(); }
}
function groundRing(g, cx, cy, r, rgb, a, lw, z = 0.03) {
  if (a <= 0.01 || r <= 0.01) return;
  g.beginPath();
  for (let i = 0; i <= 48; i++) { const an = (i / 48) * TAU, p = P(cx + Math.cos(an) * r, cy + Math.sin(an) * r, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
  g.strokeStyle = rgba(rgb, a); g.lineWidth = lw; g.stroke();
}
// ประกายสี่แฉก
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
// เส้นคมเรียวสองปลาย (จอ) a → b · w = ความหนากลางเส้น · ชั้น: นอก (outer) → กลาง → แกนขาว · edge = ขอบบางด้านนอก
function bladeLine(g, a, b, w, k, { outer = NAVY_L, mid = BOLT, edge = CRIMSON, bow = 1 } = {}) {
  if (k <= 0.01 || w <= 0.2) return;
  const vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy) || 1, nx = -vy / L, ny = vx / L;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const shape = (m, back) => {
    g.beginPath(); g.moveTo(a[0], a[1]);
    g.quadraticCurveTo(mx + nx * w * m * bow, my + ny * w * m * bow, b[0], b[1]);
    g.quadraticCurveTo(mx - nx * w * m * back, my - ny * w * m * back, a[0], a[1]);
  };
  g.save(); g.globalCompositeOperation = "lighter";
  shape(3.4, 0.6); g.fillStyle = rgba(outer, 0.3 * k); g.fill();
  shape(1.8, 0.4); g.fillStyle = rgba(mid, 0.6 * k); g.fill();
  shape(1, 0.25); g.fillStyle = rgba(WHITE, k); g.fill();
  if (edge) { shape(1.8, -1.6); g.strokeStyle = rgba(edge, 0.55 * k); g.lineWidth = 1.3; g.stroke(); }
  g.restore();
}
// จันทร์เสี้ยวรอยดาบ: ส่วนโค้งของวงรี (หมุน rot · แบน sq) จากมุม a0 ถึง a1 · ความหนาสูงสุด w ที่หัว (a1) เรียวไปทางหาง
function crescent(g, cx, cy, R, rot, sq, a0, a1, w, k, { outer = NAVY_L, mid = BOLT, edge = CRIMSON, core = WHITE } = {}) {
  if (k <= 0.01 || Math.abs(a1 - a0) < 0.02) return;
  const N = 22, c = Math.cos(rot), s = Math.sin(rot);
  const at = (an, rr) => { const x = Math.cos(an) * rr, y = Math.sin(an) * rr * sq; return [cx + x * c - y * s, cy + x * s + y * c]; };
  const band = (wk, rgb, al) => {
    g.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N, an = lerp(a0, a1, u); const p = at(an, R + w * wk * u * 0.35); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    for (let i = N; i >= 0; i--) { const u = i / N, an = lerp(a0, a1, u); const p = at(an, R - w * wk * Math.pow(u, 0.8)); g.lineTo(p[0], p[1]); }
    g.closePath(); g.fillStyle = rgba(rgb, al * k); g.fill();
  };
  g.save(); g.globalCompositeOperation = "lighter";
  band(1.7, outer, 0.32);
  band(1, mid, 0.62);
  band(0.42, core, 0.95);
  if (edge) {
    g.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N, p = at(lerp(a0, a1, u), R + w * 0.75 * u * 0.35 + 1.5); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    g.strokeStyle = rgba(edge, 0.75 * k); g.lineWidth = 1.6; g.lineCap = "round"; g.stroke();
  }
  g.restore();
}
// ดาบเบลย์ เราเซอร์ (จอ): (x, y) = มือ · ang = ทิศปลายใบ · L = ยาวทั้งเล่ม (px) · charge = สายฟ้าพันใบ (0..1)
function rouzer(g, x, y, ang, L, k, { charge = 0, glint = -1, seed = 1, lowQ = false, flick = 0 } = {}) {
  if (k <= 0.01 || L < 3) return;
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
  const W = L * 0.075;
  const pt = (u, v) => [x + c * L * u + nx * W * v, y + s * L * u + ny * W * v];
  g.save();
  if (charge > 0.01) { g.globalCompositeOperation = "lighter"; glow(g, ...pt(0.6, 0), L * 0.62, BOLT, 0.5 * charge * k); g.globalCompositeOperation = "source-over"; }
  // ด้ามกรมท่า + ปุ่มท้ายแดง
  g.lineCap = "round";
  g.strokeStyle = rgba(NAVY, k); g.lineWidth = Math.max(2, W * 1.2);
  g.beginPath(); g.moveTo(...pt(-0.2, 0)); g.lineTo(...pt(0.02, 0)); g.stroke();
  g.fillStyle = rgba(CRIMSON, k); g.beginPath(); g.arc(...pt(-0.22, 0), Math.max(1.5, W * 0.75), 0, TAU); g.fill();
  // การ์ดแทรย์ (ตลับการ์ดเหนือด้าม) — แผ่นเงินหนา
  g.fillStyle = rgba(STEEL, k);
  g.beginPath(); g.moveTo(...pt(0.02, -2.1)); g.lineTo(...pt(0.2, -1.7)); g.lineTo(...pt(0.2, 1.7)); g.lineTo(...pt(0.02, 2.1)); g.closePath(); g.fill();
  g.strokeStyle = rgba(GOLD, k); g.lineWidth = 1; g.stroke();
  // ใบดาบเงิน: กว้างโคน เรียวปลายแหลม · ร่องกลางกรมท่า · คมขาว
  g.beginPath();
  g.moveTo(...pt(0.2, -1.25)); g.lineTo(...pt(0.86, -0.95)); g.lineTo(...pt(1, 0)); g.lineTo(...pt(0.86, 0.95)); g.lineTo(...pt(0.2, 1.25)); g.closePath();
  const gr = g.createLinearGradient(...pt(0.5, -1.2), ...pt(0.5, 1.2));
  gr.addColorStop(0, rgba(WHITE, k)); gr.addColorStop(0.45, rgba(SILVER, k)); gr.addColorStop(1, rgba(STEEL, k));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = rgba("40,50,80", 0.6 * k); g.lineWidth = 1; g.stroke();
  g.strokeStyle = rgba(NAVY_L, 0.85 * k); g.lineWidth = Math.max(1, W * 0.35);
  g.beginPath(); g.moveTo(...pt(0.24, 0)); g.lineTo(...pt(0.8, 0)); g.stroke();
  // ตราโพทองที่โคนใบ
  const [sx, sy] = pt(0.12, 0);
  spade(g, sx, sy, Math.max(2, W * 1.15), GOLD, k, null, ang + Math.PI / 2);
  // ประกายวิ่งตามคม (glint = ตำแหน่ง 0..1)
  if (glint >= 0 && glint <= 1) {
    const [gx, gy] = pt(lerp(0.25, 1, glint), -0.5);
    g.globalCompositeOperation = "lighter";
    glow(g, gx, gy, W * 3.2, WHITE, 0.75 * k);
    twinkle(g, gx, gy, W * 2.6, 0.9 * k);
  }
  g.restore();
  // สายฟ้าพันใบ
  if (charge > 0.05) {
    for (let i = 0; i < (lowQ ? 1 : 3); i++) {
      const [ax, ay] = pt(0.22 + i * 0.05, (i % 2 ? 1 : -1) * 1.4), [bx, by] = pt(1.02, 0);
      bolt(g, ax, ay, bx, by, seed + i * 13 + flick, charge * k * (0.9 - i * 0.2), 1.4, { jitter: 0.3, branch: lowQ ? 0 : 1, lowQ });
    }
  }
}
// การ์ด Rouze (จอ) หมุน rot · face = หน้าการ์ด (สีงา ขอบแดง แถบสีตามชนิด) · ไม่ใช่ = หลังการ์ดกรมท่า ตราโพทอง
function cardShape(g, x, y, w, h, rot, a, { glowRgb = null, face = true, tint = CRIMSON, flipX = 1 } = {}) {
  if (a <= 0.01 || w < 1) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(Math.max(0.05, Math.abs(flipX)), 1);
  if (glowRgb) { g.globalCompositeOperation = "lighter"; glow(g, 0, 0, h * 0.95, glowRgb, 0.5 * a); g.globalCompositeOperation = "source-over"; }
  const rr = (x0, y0, ww, hh, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x0, y0, ww, hh, r); else g.rect(x0, y0, ww, hh); };
  if (face) {
    rr(-w / 2, -h / 2, w, h, w * 0.12); g.fillStyle = rgba("244,236,218", a); g.fill();
    g.strokeStyle = rgba(CRIMSON, a); g.lineWidth = Math.max(1, w * 0.06); g.stroke();
    g.fillStyle = rgba(tint, 0.9 * a); g.fillRect(-w * 0.38, h * 0.2, w * 0.76, h * 0.16);
    spade(g, 0, -h * 0.08, w * 0.27, CRIMSON, a);
  } else {
    rr(-w / 2, -h / 2, w, h, w * 0.12); g.fillStyle = rgba(NAVY, a); g.fill();
    g.strokeStyle = rgba(GOLD, a); g.lineWidth = Math.max(1, w * 0.06); g.stroke();
    spade(g, 0, 0, w * 0.26, GOLD, a);
  }
  g.restore();
}
// ประกายไฟกระเด็น (เส้นสั้นมีแรงโน้มถ่วง) ออกจาก (x, y) ไปทาง ang ± spread · q = เวลา 0..1
function sparks(g, x, y, ang, spread, R, q, k, seed, n, rgb = GOLD) {
  if (k <= 0.01 || q <= 0 || q >= 1) return;
  const rnd = rngOf(seed);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const an = ang + (rnd() - 0.5) * spread, sp = R * (0.5 + rnd() * 0.8), life = 0.55 + rnd() * 0.45;
    const u = q / life;
    if (u >= 1) continue;
    const d = sp * easeOut3(u), dropY = R * 0.5 * u * u;
    const px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * 0.8 + dropY;
    const tx = px - Math.cos(an) * R * 0.12 * (1 - u), ty = py - (Math.sin(an) * 0.8 * R * 0.12 - R * 0.06 * u) * (1 - u);
    g.strokeStyle = rgba(i % 3 ? rgb : WHITE, k * (1 - u)); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(px, py); g.stroke();
  }
  g.restore();
}
// หนามแสงรอบจุดแบบการ์ตูน (หมัดกระแทก)
function impactStar(g, x, y, R, k, seed, n = 12, rgb = WHITE) {
  if (k <= 0.01 || R < 1) return;
  const rnd = rngOf(seed);
  g.save(); g.globalCompositeOperation = "lighter";
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const an = (i / (n * 2)) * TAU + 0.2, rr = i % 2 ? R * 0.38 : R * (0.75 + rnd() * 0.45);
    const px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr * 0.8;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath(); g.fillStyle = rgba(rgb, 0.85 * k); g.fill();
  g.strokeStyle = rgba(CRIMSON_L, 0.6 * k); g.lineWidth = 1.5; g.stroke();
  g.restore();
}
// เงาติดตาหกเหลี่ยม (ตัวที่พุ่ง) — ขอบเงิน + แดงด้านใน
function ghostHex(g, x, y, r, a) {
  if (a <= 0.01 || r < 1) return;
  g.save();
  hexPath(g, x, y, r); g.fillStyle = rgba(NAVY_L, a * 0.4); g.fill();
  g.strokeStyle = rgba(SILVER, a); g.lineWidth = 1.6; g.stroke();
  hexPath(g, x, y, r * 0.8); g.strokeStyle = rgba(CRIMSON_L, a * 0.7); g.lineWidth = 1.2; g.stroke();
  g.restore();
}
// แผ่นแสง Orichalcum Element (จอ) กลาง (x, y) กว้าง w สูง h · open = กางจากเส้นตั้ง (0..1)
function oriPanel(g, x, y, w, h, k, open, now) {
  if (k <= 0.01 || open <= 0.01) return;
  const W = w * open;
  g.save(); g.globalCompositeOperation = "lighter";
  const gr = g.createLinearGradient(x, y - h / 2, x, y + h / 2);
  glow(g, x, y, h * 0.7, ORI, 0.35 * k * open);
  gr.addColorStop(0, rgba(ORI, 0.3 * k)); gr.addColorStop(0.5, rgba(ORI, 0.62 * k)); gr.addColorStop(1, rgba(ORI, 0.3 * k));
  g.fillStyle = gr; g.fillRect(x - W / 2, y - h / 2, W, h);
  // เส้นสแกนแนวนอนไหลขึ้น
  const off = REDUCED ? 0 : (now / 16) % 6;
  g.fillStyle = rgba(WHITE, 0.12 * k);
  for (let yy = y - h / 2 + off; yy < y + h / 2; yy += 6) g.fillRect(x - W / 2, yy, W, 1);
  g.strokeStyle = rgba(BOLT, 0.95 * k); g.lineWidth = 2.2; g.strokeRect(x - W / 2, y - h / 2, W, h);
  g.strokeStyle = rgba(WHITE, 0.5 * k); g.lineWidth = 1; g.strokeRect(x - W / 2 + 4, y - h / 2 + 4, Math.max(0, W - 8), h - 8);
  g.restore();
  if (open > 0.6) {
    const f = (open - 0.6) / 0.4;
    // ตราด้วงคางคก (Change Beetle) ย่อเป็นตราโพทอง + เขาสองข้าง
    spade(g, x, y - h * 0.04, w * 0.27 * f, GOLD, 0.9 * k, GOLD_L);
    g.save(); g.strokeStyle = rgba(GOLD, 0.85 * k * f); g.lineWidth = 2; g.lineCap = "round";
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x + sd * w * 0.1, y - h * 0.2); g.quadraticCurveTo(x + sd * w * 0.32, y - h * 0.3, x + sd * w * 0.28, y - h * 0.4); g.stroke(); }
    g.restore();
  }
}

// ---------- ตีปกติ ----------
function bladeStyle(g, e, now, lowQ, slash) {
  const T = KAZUMA_MS[e.kind], t = now - e.t0, p = t / T, HIT = KAZUMA_HIT_P[e.kind];
  const B = bodyAt(e.to.x, e.to.y, e.toSize || 1), A = attackerAt(e, t, lowQ);
  const seed = strHash(`${e.by}|${e.t0 | 0}`), flick = REDUCED ? 0 : Math.floor(now / 50);
  const face = Math.atan2(B.hy - A.hy, B.bx - A.bx), side = Math.cos(face) >= 0 ? 1 : -1;
  const lane = Array.isArray(e.lane) && e.lane.length ? e.lane.filter(okT) : null;
  const L = A.r * (slash ? 2.1 : 1.8);
  const hx = A.bx + side * A.r * 0.35, hy = A.hy + A.r * 0.3;
  // มุมดาบ: ง้างเหนือไหล่ (หลัง) → ฟันผ่านเป้า → ค้างท้ายท่า (มุมในกรอบ "หันหาเป้า" แล้วแปลงเป็นมุมจอ)
  const A0 = -2.35, A1 = 0.95, SW0 = HIT - (slash ? 0.13 : 0.12);
  const wind = easeOut3(clamp01(p / (SW0 * 0.8)));
  const sw = clamp01((p - SW0) / (HIT + 0.03 - SW0));
  const rel = p < SW0 ? lerp(-1.6, A0, wind) : lerp(A0, A1, easeIn2(sw) * 0.55 + sw * 0.45);
  // ระนาบฟัน: วงรีแบน SQ เอียง TILT — ง้างเหนือหัวไปหลัง → ฟันเฉียงลงผ่านเป้า (หันซ้าย = กลับด้านมุม ×side ให้ยังง้างขึ้นบน)
  const SQ = 0.55, TILT = side * 0.9;
  const toScr = (an) => { const x = Math.cos(an * side), y = Math.sin(an * side) * SQ, c = Math.cos(face + TILT), s = Math.sin(face + TILT); return Math.atan2(x * s + y * c, x * c - y * s); };
  const kSword = env(p, 0, 0.08, 0.8, 1);
  const charge = slash ? clamp01((p - 0.06) / 0.25) * (p < HIT + 0.1 ? 1 : 1 - clamp01((p - HIT - 0.1) / 0.3)) : 0;
  // Lightning Slash: การ์ด SLASH + THUNDER พุ่งเข้าดาบ
  if (slash && p < 0.3) {
    for (let i = 0; i < 2; i++) {
      const u = easeInOut(clamp01((p - 0.02 - i * 0.05) / 0.2)), k = env(p, 0.02 + i * 0.05, 0.06 + i * 0.05, 0.2 + i * 0.05, 0.28 + i * 0.05);
      const sx = A.bx + (i ? -1 : 1) * A.r * 2.2, sy = A.hy - A.r * 2.4;
      cardShape(g, lerp(sx, hx, u), lerp(sy, hy - A.r * 0.4, u), A.r * 0.55, A.r * 0.8, (1 - u) * (i ? -2 : 2), k, { glowRgb: BOLT, tint: i ? BOLT : CRIMSON });
    }
  }
  // รอยโค้งจันทร์เสี้ยว (ตามดาบตอนฟัน)
  if (p >= SW0) {
    const k = p < HIT + 0.05 ? 1 : 1 - clamp01((p - HIT - 0.05) / 0.3);
    const head = rel, tail = Math.max(A0, head - (p < HIT ? 2.4 : 2.4 * (1 - clamp01((p - HIT) / 0.35))));
    const pal = slash ? { outer: BOLT_D, mid: BOLT, edge: GOLD } : { outer: NAVY_L, mid: SILVER, edge: CRIMSON };
    crescent(g, hx, hy, L * 0.92, face + TILT, SQ, tail * side, head * side, A.r * (slash ? 0.95 : 0.8), k, pal);
    if (slash && !lowQ && k > 0.1) {
      for (let i = 0; i < 2; i++) {
        const a0 = toScr(lerp(tail, head, 0.2 + i * 0.3)), a1 = toScr(lerp(tail, head, 0.55 + i * 0.35));
        bolt(g, hx + Math.cos(a0) * L * 0.9, hy + Math.sin(a0) * L * 0.9, hx + Math.cos(a1) * L * 0.95, hy + Math.sin(a1) * L * 0.95, seed + i * 5 + flick, k * 0.8, 1.3, { branch: 0, jitter: 0.4, lowQ });
      }
    }
  }
  // ดาบ
  const glint = p > 0.08 && p < 0.3 ? (p - 0.08) / 0.22 : -1;
  rouzer(g, hx, hy, toScr(rel), L * Math.hypot(Math.cos(rel), Math.sin(rel) * SQ), kSword, { charge, glint, seed, lowQ, flick });
  // ระยะไกล (ไม่พุ่งเข้า): คลื่นดาบจันทร์เสี้ยวพุ่งไปหาเป้า (Lightning Slash ใช้คลื่นตามแนวแทน)
  const far = !slash && !lane && !lunges(e, lowQ);
  if (far && p > SW0 + 0.04 && p < HIT + 0.06) {
    const u = easeIn2(clamp01((p - SW0 - 0.04) / (HIT - SW0 - 0.04)));
    const cx = lerp(hx, B.bx, u), cy = lerp(hy, B.hy, u), nx = -Math.sin(face), ny = Math.cos(face), w = A.r * 1.5;
    const kw = env(p, SW0 + 0.04, SW0 + 0.07, HIT, HIT + 0.06);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, cx, cy, A.r * 1.3, NAVY_L, 0.35 * kw); g.restore();
    bladeLine(g, [cx + nx * w, cy + ny * w], [cx - nx * w, cy - ny * w], A.r * 0.5, kw, { outer: NAVY_L, mid: SILVER, edge: CRIMSON, bow: -1 });
  }
  // Lightning Slash: คลื่นดาบสายฟ้าตามแนว → รอยฟันเรืองบนพื้นทุกช่อง
  if (slash) {
    const tiles = lane || [e.to];
    const last = tiles.reduce((m, q) => (mdist(q, e) > mdist(m, e) ? q : m), tiles[0]);
    const Lb = bodyAt(last.x, last.y, 1);
    const rel0 = HIT - 0.08;
    if (p > rel0 && p < HIT + 0.05) {
      const u = easeIn2(clamp01((p - rel0) / 0.08)), k = env(p, rel0, rel0 + 0.02, HIT, HIT + 0.05);
      const cx = lerp(hx, Lb.bx, u), cy = lerp(hy, Lb.hy, u), ang = Math.atan2(Lb.hy - hy, Lb.bx - hx), nx = -Math.sin(ang), ny = Math.cos(ang), w = A.r * 1.5;
      bladeLine(g, [cx + nx * w, cy + ny * w], [cx - nx * w, cy - ny * w], A.r * 0.45, k, { outer: BOLT_D, mid: BOLT, edge: GOLD, bow: -1 });
      bolt(g, hx, hy, cx, cy, seed + 7 + flick, k * 0.9, 2.6, { jitter: 0.12, branch: lowQ ? 0 : 2, lowQ });
    }
    const kHit = env(p, HIT - 0.01, HIT + 0.01, HIT + 0.12, 0.95);
    if (kHit > 0) {
      bolt(g, A.bx, A.hy - A.r * 0.2, Lb.bx, Lb.hy, seed + 3 + flick, kHit * 0.85, 2.8, { jitter: 0.1, branch: lowQ ? 1 : 3, lowQ });
      // รอยฟันเรืองบนพื้นยาวตลอดแนว (หัวท้ายเรียว) + แสงทุกช่อง
      const ang = Math.atan2(last.y - e.y, last.x - e.x), ux = Math.cos(ang), uy = Math.sin(ang);
      const ox = e.x + (e.size || 1) / 2, oy = e.y + (e.size || 1) / 2, lx = last.x + 0.5 + ux * 0.45, ly = last.y + 0.5 + uy * 0.45;
      g.save(); g.lineCap = "round"; g.globalCompositeOperation = "lighter";
      const N = 14;
      for (const [wk, rgb, al] of [[0.16, BOLT_D, 0.5], [0.07, BOLT, 0.85], [0.025, WHITE, 1]]) {
        for (let i = 1; i <= N; i++) {
          const u0 = (i - 1) / N, u1 = i / N, a = P(lerp(ox, lx, u0), lerp(oy, ly, u0), 0.03), b = P(lerp(ox, lx, u1), lerp(oy, ly, u1), 0.03);
          g.strokeStyle = rgba(rgb, al * kHit); g.lineWidth = Math.max(1, b[2] * wk * Math.sin(Math.PI * (u0 + u1) / 2) * 1.4);
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        }
      }
      for (const q of tiles) {
        const T2 = bodyAt(q.x, q.y, 1);
        glow(g, T2.bx, T2.by - T2.s * 0.25, T2.s * 0.6, BOLT, 0.35 * kHit);
      }
      g.restore();
    }
  }
  // BEAT (กรอบ): กวาดโค้งบนพื้นทั่วกรอบ
  if (!slash && lane && lane.length > 1) {
    let sx = 0, sy = 0;
    for (const q of lane) { sx += q.x + 0.5; sy += q.y + 0.5; }
    const gx = sx / lane.length, gy = sy / lane.length;
    const ax = e.x + (e.size || 1) / 2, ay = e.y + (e.size || 1) / 2;
    // รัศมี = ระยะเฉลี่ยถึงช่องในกรอบ · มุมกวาด = ครอบช่องในกรอบ (+ขอบ) ไล่จากฝั่งเดียวกับที่ดาบง้าง
    const base = Math.atan2(gy - ay, gx - ax), wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v));
    let R = 0, lo = 0, hi = 0;
    for (const q of lane) { const dx = q.x + 0.5 - ax, dy = q.y + 0.5 - ay, d = wrap(Math.atan2(dy, dx) - base); R += Math.hypot(dx, dy); lo = Math.min(lo, d); hi = Math.max(hi, d); }
    R = Math.max(0.9, R / lane.length);
    const u = clamp01((p - SW0) / (HIT + 0.02 - SW0)), k = p < HIT + 0.04 ? env(p, SW0, SW0 + 0.03, 1, 2) : 1 - clamp01((p - HIT - 0.04) / 0.3);
    if (p >= SW0 && k > 0) {
      const a0 = base + (side > 0 ? lo - 0.15 : hi + 0.15), a1 = base + (side > 0 ? hi + 0.15 : lo - 0.15), head = lerp(a0, a1, easeIn2(u)), tail = lerp(a0, head, p < HIT ? 0.35 : clamp01((p - HIT) / 0.3));
      const N = 26;
      g.save(); g.globalCompositeOperation = "lighter";
      for (const [w0, rgb, al] of [[0.34, NAVY_L, 0.35], [0.2, SILVER, 0.6], [0.08, WHITE, 0.95]]) {
        g.beginPath();
        for (let i = 0; i <= N; i++) { const an = lerp(tail, head, i / N), rr = R + w0 * (i / N) * 0.4, q = P(ax + Math.cos(an) * rr, ay + Math.sin(an) * rr, 0.06); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
        for (let i = N; i >= 0; i--) { const an = lerp(tail, head, i / N), rr = R - w0 * (i / N), q = P(ax + Math.cos(an) * rr, ay + Math.sin(an) * rr, 0.06); g.lineTo(q[0], q[1]); }
        g.closePath(); g.fillStyle = rgba(rgb, al * k); g.fill();
      }
      g.restore();
    }
  }
  // ปะทะ: รอยฟันเฉียง + ประกายทอง + ตราโพวาบ (ทุกช่องในกรอบ BEAT) · หลบ = เส้นขาวผ่านเฉยๆ
  if (!slash && p >= HIT) {
    const q = (p - HIT) / (1 - HIT), k = 1 - clamp01((q - 0.15) / 0.75);
    const tn = Math.max(1, e.toSize | 0), inT = (tq) => tq.x >= e.to.x && tq.y >= e.to.y && tq.x < e.to.x + tn && tq.y < e.to.y + tn;
    const hits = [{ b: B, main: true }, ...(lane && lane.length > 1 ? lane.filter((tq) => !inT(tq)).map((tq) => ({ b: bodyAt(tq.x, tq.y, 1), main: false })) : [])];
    hits.forEach(({ b, main }, i) => {
      const kk = k * (main ? 1 : 0.75), w = b.r * (main ? 1.5 : 1.1);
      const cut = -0.7 * side, c = Math.cos(cut), s = Math.sin(cut), grow = easeOut3(clamp01(q / 0.18));
      bladeLine(g, [b.bx - c * w * grow, b.hy - s * w * grow], [b.bx + c * w * grow, b.hy + s * w * grow], b.r * 0.22, kk, { outer: NAVY_L, mid: SILVER, edge: CRIMSON });
      if (e.dodge && main) return;
      if (main) {
        sparks(g, b.bx, b.hy, face, 1.6, b.r * 2.6, q * 1.6, kk, seed + i, lowQ ? 7 : 14);
        const sq = easeOut3(clamp01(q / 0.4));
        spade(g, b.bx, b.hy - b.r * (1.2 + 0.6 * sq), b.r * (0.35 + 0.25 * sq), GOLD, kk * 0.85 * (1 - clamp01((q - 0.3) / 0.5)), GOLD_L);
        groundRing(g, b.cx, b.cy, 0.25 + 0.55 * easeOut3(clamp01(q / 0.5)), SILVER, 0.6 * kk, 2);
      }
      if (main) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, b.bx, b.hy, b.r * 1.3, WHITE, 0.5 * kk * (1 - clamp01(q / 0.25))); g.restore(); }
    });
  }
  // Lightning Slash ปะทะเป้าหลัก
  if (slash && p >= HIT && !e.dodge) {
    const q = (p - HIT) / (1 - HIT), k = 1 - clamp01((q - 0.1) / 0.7);
    burst(g, B.bx, B.hy, B.r * 2.2 * (0.7 + 0.3 * easeOut3(clamp01(q / 0.2))), seed + 3 + flick, k * 0.9, lowQ);
    sparks(g, B.bx, B.hy, face, 2, B.r * 2.4, q * 1.5, k, seed + 9, lowQ ? 6 : 12, BOLT);
  }
}

function punchStyle(g, e, now, lowQ) {
  const T = KAZUMA_MS.kazumaPunch, t = now - e.t0, p = t / T, HIT = KAZUMA_HIT_P.kazumaPunch;
  const B = bodyAt(e.to.x, e.to.y, e.toSize || 1), A = attackerAt(e, t, lowQ), A0 = bodyAt(e.x, e.y, e.size || 1);
  const seed = strHash(`${e.by}|${e.t0 | 0}`);
  const face = Math.atan2(B.hy - A0.hy, B.bx - A0.bx);
  const dash0 = (LUNGE_MS * 0.4) / T;
  // ย่อตัว: พลังรวมที่กำปั้น + ฝุ่นวงที่เท้า
  const kc = env(p, 0, 0.1, dash0, HIT);
  if (kc > 0) {
    const fx = A.bx + Math.cos(face) * A.r * 0.7, fy = A.hy + Math.sin(face) * A.r * 0.5 + A.r * 0.2;
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, fx, fy, A.r * (0.7 + 0.4 * clamp01(p / dash0)), CRIMSON_L, 0.45 * kc);
    glow(g, fx, fy, A.r * 0.3, WHITE, 0.7 * kc);
    g.restore();
    groundRing(g, A0.cx, A0.cy, 0.3 + 0.2 * clamp01(p / dash0), SILVER, 0.35 * kc, 1.5);
  }
  // พุ่ง: เงาติดตา + เส้นความเร็ว
  if (lunges(e, lowQ) && p > dash0 && p < HIT + 0.08) {
    const k = env(p, dash0, dash0 + 0.04, HIT, HIT + 0.08);
    if (!REDUCED) {
      [35, 70, 105].forEach((lag, i) => {
        const G = attackerAt(e, Math.max(0, t - lag), lowQ);
        ghostHex(g, G.bx, G.hy, G.r * 0.95, k * (0.5 - i * 0.13));
      });
    }
    const rnd = rngOf(seed + 4), c = Math.cos(face), s = Math.sin(face);
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (let i = 0; i < (lowQ ? 4 : 8); i++) {
      const off = (rnd() - 0.5) * A.r * 2.2, len = A.r * (1.2 + rnd() * 1.5), back = A.r * (0.6 + rnd() * 0.8);
      const x0 = A.bx - c * back - s * off, y0 = A.hy - s * back + c * off;
      g.strokeStyle = rgba(i % 3 ? SILVER : CRIMSON_L, 0.55 * k); g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - c * len, y0 - s * len); g.stroke();
    }
    g.restore();
  }
  // ไม่มี lunge (lowQ): เส้นพุ่งตรงเข้าเป้า
  if (!lunges(e, lowQ) && p > dash0 && p < HIT + 0.05) {
    const u = easeIn2(clamp01((p - dash0) / (HIT - dash0)));
    bladeLine(g, [A0.bx, A0.hy], [lerp(A0.bx, B.bx, u), lerp(A0.hy, B.hy, u)], A0.r * 0.25, env(p, dash0, dash0 + 0.03, HIT, HIT + 0.05), { outer: NAVY_L, mid: SILVER, edge: CRIMSON });
  }
  // ปะทะ
  if (p >= HIT) {
    const q = (p - HIT) / (1 - HIT), k = 1 - clamp01((q - 0.1) / 0.75);
    const ix = lerp(B.bx, A.bx, 0.25), iy = lerp(B.hy, A.hy, 0.25);
    if (e.dodge) {
      g.save(); g.globalCompositeOperation = "lighter"; glow(g, ix, iy, B.r, SILVER, 0.35 * k); g.restore();
      return;
    }
    // BEAT (กรอบ): แรงกระแทกแผ่ไปทุกช่องในกรอบ
    const lane = Array.isArray(e.lane) && e.lane.length > 1 ? e.lane.filter(okT) : [];
    const tn = Math.max(1, e.toSize | 0);
    lane.filter((tq) => !(tq.x >= e.to.x && tq.y >= e.to.y && tq.x < e.to.x + tn && tq.y < e.to.y + tn)).forEach((tq, i) => {
      const b = bodyAt(tq.x, tq.y, 1), qq = clamp01(q - 0.04 - (i % 3) * 0.03);
      if (qq <= 0) return;
      impactStar(g, b.bx, b.hy, b.r * (0.6 + 0.6 * easeOut3(clamp01(qq / 0.2))), k * 0.7 * (1 - clamp01(qq / 0.4)), seed + 11 + i, 8);
      groundRing(g, b.cx, b.cy, 0.15 + 0.4 * easeOut3(clamp01(qq / 0.5)), SILVER, 0.45 * k, 1.5);
    });
    impactStar(g, ix, iy, B.r * (0.9 + 0.9 * easeOut3(clamp01(q / 0.2))), k * (1 - clamp01(q / 0.45)), seed + 1, lowQ ? 8 : 12);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, ix, iy, B.r * 1.6, CRIMSON_L, 0.45 * k * (1 - clamp01(q / 0.4)));
    glow(g, ix, iy, B.r * 0.7, WHITE, 0.9 * k * (1 - clamp01(q / 0.3)));
    g.strokeStyle = rgba(WHITE, 0.8 * k); g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(ix, iy, B.r * (0.5 + 1.6 * easeOut3(q)), B.r * (0.35 + 1.1 * easeOut3(q)), face, 0, TAU); g.stroke();
    g.restore();
    groundRing(g, B.cx, B.cy, 0.2 + 0.7 * easeOut3(clamp01(q / 0.6)), SILVER, 0.55 * k, 2);
    if (!lowQ) groundRing(g, B.cx, B.cy, 0.1 + 0.45 * easeOut3(clamp01(q / 0.5)), CRIMSON_L, 0.4 * k, 1.5);
    sparks(g, ix, iy, face, 2.2, B.r * 1.8, q * 1.6, k, seed + 2, lowQ ? 5 : 10, SILVER);
  }
}

function blastStyle(g, e, now, lowQ) {
  const T = KAZUMA_MS.kazumaBlast, t = now - e.t0, p = t / T, HIT = KAZUMA_HIT_P.kazumaBlast;
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const seed = strHash(`${e.by}|${e.t0 | 0}`), flick = REDUCED ? 0 : Math.floor(now / 50);
  const side = B.bx >= A.bx ? 1 : -1;
  const lane = Array.isArray(e.lane) && e.lane.length ? e.lane.filter(okT) : null;
  const JUMP = 0.27;
  // ตราโพทองบนพื้นใต้ตัว (ชาร์จ)
  const kg = env(p, 0.03, 0.14, JUMP + 0.05, JUMP + 0.25);
  if (kg > 0) {
    g.save(); g.globalCompositeOperation = "lighter";
    groundSpade(g, A.cx, A.cy, 0.42 * A.K * (0.7 + 0.3 * easeOut3(clamp01(p / 0.14))), GOLD, 0.35 * kg, { stroke: GOLD_L, lw: 2 });
    groundRing(g, A.cx, A.cy, 0.62 * A.K, GOLD, 0.6 * kg, 2);
    g.restore();
  }
  // การ์ด KICK + THUNDER พุ่งเข้าตัว
  for (let i = 0; i < 2; i++) {
    const s0 = 0.01 + i * 0.05, u = easeInOut(clamp01((p - s0) / 0.16)), k = env(p, s0, s0 + 0.04, s0 + 0.13, s0 + 0.18);
    if (k <= 0) continue;
    const sx = A.bx + (i ? -1 : 1) * A.r * 2.4, sy = A.hy - A.r * 2.2;
    cardShape(g, lerp(sx, A.bx, u), lerp(sy, A.hy, u), A.r * 0.55, A.r * 0.8, (1 - u) * (i ? -2.4 : 2.4), k, { glowRgb: i ? BOLT : GOLD, tint: i ? BOLT : CARD_TINT.kick });
  }
  // สายฟ้าวิ่งรอบเท้า
  const charge = env(p, 0.08, 0.16, JUMP, JUMP + 0.04);
  for (let i = 0; i < (lowQ ? 2 : 4); i++) {
    const an = (i / 4) * TAU + flick * 0.7;
    bolt(g, A.bx, A.by - A.s * 0.1, A.bx + Math.cos(an) * A.s * 0.6, A.by + Math.sin(an) * A.s * 0.3, seed + flick + i, charge, 1.6, { branch: 0, lowQ });
  }
  if (p > JUMP - 0.03 && p < JUMP + 0.05) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.bx, A.hy, A.r * 2, WHITE, 0.6 * env(p, JUMP - 0.03, JUMP, JUMP, JUMP + 0.05)); g.restore(); }
  // ไรเดอร์คิก: โค้งขึ้นสูงแล้วดิ่งเฉียงลงเป้า (เบซิเยร์ 2 จุดคุม — ยอดอยู่ค่อนไปทางคนเตะ)
  const H = Math.max(A.s * 1.2, Math.hypot(B.bx - A.bx, B.hy - A.hy) * 0.4);
  const P0 = [A.bx, A.hy], P1 = [lerp(A.bx, B.bx, 0.15) - side * A.r * 0.4, Math.min(A.hy, B.hy) - H * 1.15], P2 = [lerp(A.bx, B.bx, 0.6), Math.min(A.hy, B.hy) - H * 0.85], P3 = [B.bx, B.hy];
  const bez = (u) => { const v = 1 - u; return [v * v * v * P0[0] + 3 * v * v * u * P1[0] + 3 * v * u * u * P2[0] + u * u * u * P3[0], v * v * v * P0[1] + 3 * v * v * u * P1[1] + 3 * v * u * u * P2[1] + u * u * u * P3[1]]; };
  if (p >= JUMP && p < HIT + 0.02) {
    const v = clamp01((p - JUMP) / (HIT - JUMP)), u = v < 0.5 ? 0.62 * easeOut3(v / 0.5) : 0.62 + 0.38 * easeIn2((v - 0.5) / 0.5);
    const tail = Math.max(0, u - 0.32), N = 16, rib = [];
    for (let i = 0; i <= N; i++) rib.push(bez(lerp(tail, u, i / N)));
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (const [wk, rgb, al] of lowQ ? [[0.5, BOLT, 0.8], [0.18, WHITE, 0.95]] : [[1.2, NAVY_L, 0.35], [0.55, BOLT, 0.8], [0.2, WHITE, 0.95]]) {
      for (let i = 1; i <= N; i++) {
        const q = i / N;
        g.strokeStyle = rgba(rgb, al * q); g.lineWidth = Math.max(1, A.r * wk * q);
        g.beginPath(); g.moveTo(rib[i - 1][0], rib[i - 1][1]); g.lineTo(rib[i][0], rib[i][1]); g.stroke();
      }
    }
    g.restore();
    // สายฟ้าพันตามทาง
    for (let i = 0; i < (lowQ ? 1 : 2); i++) {
      const a = rib[Math.floor(N * (0.2 + i * 0.25))], b = rib[N];
      bolt(g, a[0], a[1], b[0], b[1], seed + i * 11 + flick, 0.85, 1.6, { jitter: 0.5, branch: lowQ ? 0 : 1, lowQ });
    }
    // หัวดาวหาง = เท้าที่เตะ (เพชรยาวชี้ตามทิศ)
    const [hx, hy] = rib[N], [px, py] = rib[N - 2], ang = Math.atan2(hy - py, hx - px), c = Math.cos(ang), s = Math.sin(ang), w = A.r * 0.45, Lf = A.r * 1.3;
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, hx, hy, A.r * 1.9, BOLT, 0.7);
    g.beginPath(); g.moveTo(hx + c * Lf * 0.45, hy + s * Lf * 0.45); g.lineTo(hx - s * w, hy + c * w); g.lineTo(hx - c * Lf, hy - s * Lf); g.lineTo(hx + s * w, hy - c * w); g.closePath();
    g.fillStyle = rgba(WHITE, 0.95); g.fill(); g.strokeStyle = rgba(CRIMSON_L, 0.7); g.lineWidth = 1.5; g.stroke();
    glow(g, hx, hy, A.r * 0.7, WHITE, 0.9);
    g.restore();
  }
  // ปะทะ: สายฟ้าฟาดจากฟ้า + ระเบิดสายฟ้า + ตราโพทองแผ่บนพื้น + ประกาย
  if (p >= HIT - 0.01) {
    const q = clamp01((p - HIT) / (1 - HIT)), k = env(p, HIT - 0.01, HIT + 0.01, HIT + 0.14, 1);
    const tn = Math.max(1, e.toSize | 0);
    const extra = lane ? lane.filter((tq) => !(tq.x >= e.to.x && tq.y >= e.to.y && tq.x < e.to.x + tn && tq.y < e.to.y + tn)) : [];
    extra.forEach((tq, i) => {
      const d0 = 0.03 + (i % 4) * 0.025, kk = env(p, HIT + d0, HIT + d0 + 0.015, HIT + d0 + 0.08, HIT + d0 + 0.25);
      if (kk <= 0) return;
      const b = bodyAt(tq.x, tq.y, 1);
      skyBolt(g, b.bx, b.by - b.s * 0.15, b.s * 2.6, seed + 40 + i + flick, kk, 1.8, lowQ);
      g.save(); g.globalCompositeOperation = "lighter"; glow(g, b.bx, b.by - b.s * 0.2, b.s * 0.65, BOLT, 0.45 * kk); g.restore();
    });
    if (e.dodge) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, B.bx, B.by, B.r * 1.6, BOLT, 0.4 * k); g.restore(); return; }
    const kb = env(p, HIT - 0.01, HIT, HIT + 0.06, HIT + 0.2);
    for (let i = 0; i < (lowQ ? 1 : 3); i++) skyBolt(g, B.bx + (i - 1) * B.r * 0.4, B.hy, B.s * 3.2, seed + 20 + i * 3 + flick, kb * (1 - i * 0.2), 2.6 - i * 0.5, lowQ);
    burst(g, B.bx, B.hy, B.r * 2.8 * (0.7 + 0.3 * easeOut3(clamp01(q / 0.15))), seed + flick, k, lowQ);
    g.save(); g.globalCompositeOperation = "lighter";
    const sg = easeOut3(clamp01(q / 0.45));
    groundSpade(g, B.cx, B.cy, (0.35 + 0.75 * sg) * B.K, GOLD, 0.3 * k * (1 - sg * 0.6), { stroke: GOLD_L, lw: 2.5 });
    groundRing(g, B.cx, B.cy, (0.3 + 1.3 * easeOut3(clamp01(q / 0.6))) * B.K, BOLT, 0.7 * k, 3);
    if (!lowQ) groundRing(g, B.cx, B.cy, (0.2 + 0.8 * easeOut3(clamp01(q / 0.4))) * B.K, WHITE, 0.6 * k, 2);
    g.restore();
    sparks(g, B.bx, B.hy, -Math.PI / 2, 3.4, B.r * 3, q * 1.4, k, seed + 5, lowQ ? 8 : 16);
    spade(g, B.bx, B.hy - B.r * 1.6 - B.r * q, B.r * (0.6 + 0.4 * sg), GOLD, k * 0.8 * (1 - clamp01((q - 0.3) / 0.5)), GOLD_L);
    // สายฟ้าค้างรอบเป้า
    if (q > 0.25 && !lowQ) {
      const kr = env(q, 0.25, 0.35, 0.7, 1);
      for (let i = 0; i < 3; i++) {
        const an = (i / 3) * TAU + flick * 0.9;
        bolt(g, B.bx + Math.cos(an) * B.r * 0.3, B.hy + Math.sin(an) * B.r * 0.3, B.bx + Math.cos(an) * B.r * 1.2, B.hy + Math.sin(an) * B.r * 0.9, seed + 60 + i + flick, kr * 0.7, 1.1, { branch: 0, jitter: 0.5 });
      }
    }
  }
}

function styleFx(g, e, now, lowQ) {
  const T = KAZUMA_MS[e.kind] || 900, p = (now - e.t0) / T;
  if (p < 0 || p > 1 || !okT(e) || !okT(e.to)) return;
  if (e.kind === "kazumaBlade") bladeStyle(g, e, now, lowQ, false);
  else if (e.kind === "kazumaSlash") bladeStyle(g, e, now, lowQ, true);
  else if (e.kind === "kazumaPunch") punchStyle(g, e, now, lowQ);
  else if (e.kind === "kazumaBlast") blastStyle(g, e, now, lowQ);
}

// ---------- ฉากพุ่ง Lightning Sonic (state.dash style "kazumaSonic") ----------
//  fx { kind: "kazumaSonic", path: [{x,y}…], step (ms ต่อช่อง), size } — หัว = ตำแหน่งตัวตาม anim "move" (stepMs เท่ากัน)
function sonicFx(g, e, now, lowQ) {
  const pts = Array.isArray(e.path) ? e.path.filter(okT) : [];
  if (pts.length < 1) return;
  const step = e.step || KAZUMA_FX.dashStep, FADE = KAZUMA_FX.dashFade, n = pts.length - 1, sz = Math.max(1, e.size | 0);
  const t = now - e.t0, run = n * step;
  if (t < 0 || t > run + FADE) return;
  const seed = strHash(`${e.by}|${e.t0 | 0}`), flick = REDUCED ? 0 : Math.floor(now / 45);
  const at = (f) => { if (n < 1) return [pts[0].x + sz / 2, pts[0].y + sz / 2]; const i = Math.min(n - 1, Math.floor(f)), q = f - i, A = pts[i], B = pts[i + 1]; return [A.x + (B.x - A.x) * q + sz / 2, A.y + (B.y - A.y) * q + sz / 2]; };
  const K = 1 + (sz - 1) * 0.6;
  const hp = (f) => { const [wx, wy] = at(f), [bx, by, s] = P(wx, wy); return [bx, by - s * 0.86 * K, s]; };
  const S0 = bodyAt(pts[0].x, pts[0].y, sz), S1 = bodyAt(pts[n].x, pts[n].y, sz);
  // ตราโพที่จุดออกตัว
  const k0 = env(t, 0, 40, 160, 420);
  if (k0 > 0) {
    g.save(); g.globalCompositeOperation = "lighter";
    groundSpade(g, S0.cx, S0.cy, 0.4 * K, GOLD, 0.3 * k0, { stroke: GOLD_L, lw: 2 });
    glow(g, S0.bx, S0.hy, S0.r * 2, BOLT, 0.5 * k0);
    g.restore();
  }
  if (n >= 1) {
    const head = Math.min(n, t / step), fade = t > run ? 1 - (t - run) / FADE : 1;
    const tail = Math.max(0, head - 3 * (t > run ? fade : Math.min(1, t / (step * 2))));
    // ริบบอนจบหลังหัว ~0.3 ช่องระหว่างพุ่ง (ไม่ทับรูปตัวที่กำลังพุ่ง)
    const front = t < run ? Math.max(tail, head - 0.3) : head;
    if (front - tail > 0.02) {
      const M = 18, rib = [];
      for (let i = 0; i <= M; i++) rib.push(hp(tail + (front - tail) * i / M));
      // เส้นความเร็วบนพื้น
      if (!lowQ) {
        const [hx, hy] = at(head), [tx, ty] = at(tail), L = Math.hypot(hx - tx, hy - ty) || 1, nx = -(hy - ty) / L, ny = (hx - tx) / L;
        g.save(); g.lineCap = "round";
        for (const [f, rgb] of [[-0.34, SILVER], [0.34, SILVER], [-0.18, CRIMSON_L], [0.18, CRIMSON_L]]) {
          const a = P(tx + nx * f * sz, ty + ny * f * sz, 0.02), b = P(hx + nx * f * sz, hy + ny * f * sz, 0.02);
          g.strokeStyle = rgba(rgb, 0.5 * fade); g.lineWidth = Math.max(1, b[2] * 0.022);
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        }
        g.restore();
      }
      // ริบบอนแสง
      g.save(); g.lineCap = "round";
      const layer = (wk, rgb, aK, comp) => {
        g.globalCompositeOperation = comp;
        for (let i = 1; i <= M; i++) {
          const u = i / M, a = rib[i - 1], b = rib[i];
          g.strokeStyle = rgba(rgb, aK * fade * u); g.lineWidth = Math.max(1, b[2] * wk * u * sz);
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        }
      };
      if (!lowQ) layer(0.85, NAVY_L, 0.5, "lighter");
      layer(0.45, NAVY, 0.45, "source-over");
      layer(0.3, BOLT, 0.8, "lighter");
      layer(0.1, WHITE, 0.95, "lighter");
      g.restore();
      // สายฟ้าพันตามทาง
      for (let i = 0; i < (lowQ ? 1 : 3); i++) {
        const a = rib[Math.floor(M * (0.05 + i * 0.12))], b = rib[M];
        bolt(g, a[0], a[1], b[0], b[1], seed + i * 17 + flick, 0.9 * fade, 1.6, { jitter: 0.55, branch: lowQ ? 0 : 1, lowQ });
      }
      // เงาติดตาหกเหลี่ยม
      if (!REDUCED) {
        [0.6, 1.2, 1.8].forEach((lag, i) => {
          const f = head - lag;
          if (f < tail) return;
          const [x, y, s] = hp(f);
          ghostHex(g, x, y, s * 0.4 * K, (0.5 - i * 0.13) * fade);
        });
      }
      if (t < run) {
        const [x, y, s] = hp(head);
        g.save(); g.globalCompositeOperation = "lighter";
        glow(g, x, y, s * 0.75 * K, BOLT, 0.4);
        g.restore();
        sparks(g, x, y, Math.atan2(rib[M][1] - rib[M - 1][1], rib[M][0] - rib[M - 1][0]) + Math.PI, 1.2, s * 0.8, (t % 160) / 160, 0.8, seed + Math.floor(t / 160), lowQ ? 3 : 6, BOLT);
      }
    }
  }
  // ถึงปลายทาง: ตราโพวาบ + สายฟ้าแตก
  const k1 = env(t, run - 20, run + 30, run + 120, run + FADE);
  if (k1 > 0) {
    spade(g, S1.bx, S1.hy - S1.r * 1.5, S1.r * 0.7, GOLD, 0.85 * k1, GOLD_L);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, S1.bx, S1.hy, S1.r * 1.8, BOLT, 0.45 * k1); g.restore();
    if (!lowQ) burst(g, S1.bx, S1.hy, S1.r * 1.5, seed + 5 + flick, k1 * 0.5, true);
  }
}

// ---------- เหตุการณ์ ----------
function eventFx(g, e, now, lowQ) {
  const T = KAZUMA_FX_DUR[e.kind] || 1000, t = now - e.t0, p = t / T;
  if (p < 0 || p > 1) return;
  const at = okT(e.at) ? e.at : null, n = Math.max(1, e.size | 0);
  const A = at ? bodyAt(at.x, at.y, n) : null;
  const seed = strHash(`${e.id}|${e.kind}|${e.t0 | 0}`);
  const flick = REDUCED ? 0 : Math.floor(now / 60);
  switch (e.kind) {
    case "kazumaHenshin": {
      if (!A) return;
      // "Turn Up": แผ่นแสงกางออกหน้าตัว → ค้าง → วิ่งย้อนผ่านตัว (ตรงเสียงชิ้งที่ henshinPass) → เงาเกราะเงินวาบ
      const PASS = KAZUMA_FX.henshinPass / T;
      const open = easeOut3(clamp01(p / 0.24));
      const back = easeIn2(clamp01((p - 0.36) / (PASS - 0.36)));
      const dx = A.s * 0.95 * (1 - back * 1.45);
      const kp = p < PASS ? env(p, 0, 0.05, 1, 2) : 1 - clamp01((p - PASS) / 0.12);
      oriPanel(g, A.bx + dx, A.hy - A.r * 0.15, A.r * 2.3, A.r * 3.3, kp, open, now);
      // ประกายสายฟ้าที่ขอบแผ่นตอนกาง
      if (p < PASS && !lowQ) {
        const ex = A.bx + dx, h = A.r * 1.65;
        bolt(g, ex - A.r * 1.15 * open, A.hy - h, ex - A.r * 1.15 * open, A.hy + h * 0.7, seed + flick, 0.5 * kp, 1.2, { branch: 0, jitter: 0.12 });
        bolt(g, ex + A.r * 1.15 * open, A.hy - h, ex + A.r * 1.15 * open, A.hy + h * 0.7, seed + 9 + flick, 0.5 * kp, 1.2, { branch: 0, jitter: 0.12 });
      }
      // ผ่านตัว: แฟลช + สายฟ้าแตก + วงบนพื้น + ตราโพบนพื้น
      const f = env(p, PASS - 0.02, PASS, PASS + 0.04, PASS + 0.3);
      if (f > 0) {
        g.save(); g.globalCompositeOperation = "lighter";
        glow(g, A.bx, A.hy, A.r * 2.6, ORI, 0.75 * f); glow(g, A.bx, A.hy, A.r * 1.1, WHITE, 0.9 * f);
        groundSpade(g, A.cx, A.cy, 0.45 * A.K, GOLD, 0.35 * f, { stroke: GOLD_L, lw: 2 });
        g.restore();
        burst(g, A.bx, A.hy, A.r * 2.2, seed + flick, f * 0.7, lowQ);
      }
      const q = clamp01((p - PASS) / (1 - PASS));
      if (q > 0) {
        groundRing(g, A.cx, A.cy, (0.3 + 1.1 * easeOut3(q)) * A.K, BOLT, 0.7 * (1 - q), 2.5);
        // เงาเกราะ: แถบแสงเงินเฉียงวิ่งผ่านหกเหลี่ยมตัว + ดวงตาแดงวาบ
        const sweep = clamp01((q - 0.05) / 0.45);
        if (sweep > 0 && sweep < 1) {
          g.save(); hexPath(g, A.bx, A.hy, A.r * 1.05); g.clip();
          const x0 = A.bx - A.r * 1.6 + A.r * 3.2 * easeInOut(sweep);
          const gr = g.createLinearGradient(x0 - A.r * 0.5, A.hy - A.r, x0 + A.r * 0.5, A.hy + A.r);
          gr.addColorStop(0, rgba(SILVER, 0)); gr.addColorStop(0.5, rgba(WHITE, 0.75)); gr.addColorStop(1, rgba(SILVER, 0));
          g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.fillRect(A.bx - A.r * 1.2, A.hy - A.r * 1.2, A.r * 2.4, A.r * 2.4);
          g.restore();
        }
        const ke = env(q, 0.3, 0.4, 0.5, 0.75);
        if (ke > 0) {
          g.save(); g.globalCompositeOperation = "lighter";
          for (const sd of [-1, 1]) { glow(g, A.bx + sd * A.r * 0.28, A.hy - A.r * 0.35, A.r * 0.35, CRIMSON_L, 0.8 * ke); twinkle(g, A.bx + sd * A.r * 0.28, A.hy - A.r * 0.35, A.r * 0.32, ke); }
          g.restore();
        }
      }
      return;
    }
    case "kazumaUnhenshin": {
      if (!A) return;
      // เกราะแตก: เศษเงิน/กรมท่าหมุนกระเด็นแล้วร่วง + ตราโพแตกสองซีก + แสงฟ้าจาง
      const rnd = rngOf(seed), k = 1 - clamp01((p - 0.35) / 0.65);
      const fl = env(p, 0, 0.04, 0.1, 0.3);
      if (fl > 0) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.bx, A.hy, A.r * 2, ORI, 0.6 * fl); glow(g, A.bx, A.hy, A.r * 0.8, WHITE, 0.8 * fl); g.restore(); }
      const sp = clamp01(p / 0.5), sh = A.r * 0.55 * (1 + easeOut3(sp) * 0.6);
      for (const sd of [-1, 1]) spade(g, A.bx + sd * A.r * 0.5 * easeOut3(sp), A.hy - A.r * 1.6 + A.r * p * 0.8, sh, SILVER, 0.85 * k * (1 - sp * 0.5), null, sd * 0.5 * sp);
      for (let i = 0; i < (lowQ ? 8 : 18); i++) {
        const an = rnd() * TAU, v = A.r * (1 + rnd() * 1.6), rot0 = rnd() * TAU, spin = (rnd() - 0.5) * 12, sz = A.r * (0.12 + rnd() * 0.16);
        const d = v * easeOut3(clamp01(p * 1.4)), x = A.bx + Math.cos(an) * d, y = A.hy + Math.sin(an) * d * 0.7 + A.r * 1.4 * p * p;
        g.save(); g.translate(x, y); g.rotate(rot0 + (REDUCED ? 0 : spin * p));
        g.fillStyle = rgba(i % 3 === 0 ? NAVY_L : i % 3 === 1 ? SILVER : CRIMSON, 0.9 * k);
        g.beginPath(); g.moveTo(-sz, -sz * 0.5); g.lineTo(sz, -sz * 0.3); g.lineTo(sz * 0.4, sz * 0.6); g.lineTo(-sz * 0.6, sz * 0.4); g.closePath(); g.fill();
        g.restore();
      }
      return;
    }
    case "kazumaCard": {
      if (!A) return;
      // การ์ดลอยลงจากเหนือหัว (หลังการ์ด → พลิกเป็นหน้า) → รูดผ่านเส้นเครื่องอ่านข้างตัว → สลายเป็นแสงเข้าตัว · ครบสูตร = วงทอง + ตราโพทอง
      const tint = CARD_TINT[e.card] || CRIMSON;
      const u = easeOut3(clamp01(p / 0.4));
      const flip = Math.cos(clamp01(p / 0.4) * Math.PI);
      const rx = A.bx + A.r * 1.25, ry = A.hy - A.r * 0.15;
      const swipe = easeInOut(clamp01((p - 0.42) / 0.16));
      const cx = lerp(A.bx + A.r * 2.2, rx, u) - swipe * A.r * 1.2, cy = lerp(A.hy - A.r * 3, ry, u);
      const k = env(p, 0, 0.06, 0.58, 0.68);
      cardShape(g, cx, cy, A.r * 0.8, A.r * 1.15, (1 - u) * 0.9, k, { glowRgb: tint, face: flip < 0, tint, flipX: flip });
      // เส้นเครื่องอ่าน
      const kr = env(p, 0.36, 0.42, 0.58, 0.7);
      if (kr > 0) {
        g.save(); g.globalCompositeOperation = "lighter";
        g.strokeStyle = rgba(BOLT, 0.9 * kr); g.lineWidth = 2;
        g.beginPath(); g.moveTo(rx - A.r * 1.7, ry); g.lineTo(rx + A.r * 0.5, ry); g.stroke();
        glow(g, cx, ry, A.r * 0.9, tint, 0.5 * kr);
        g.restore();
      }
      // สลายเป็นแสงเข้าตัว
      if (p > 0.56) {
        const q = clamp01((p - 0.56) / 0.4), rnd = rngOf(seed);
        g.save(); g.globalCompositeOperation = "lighter";
        for (let i = 0; i < (lowQ ? 5 : 10); i++) {
          const ox = (rnd() - 0.5) * A.r, oy = (rnd() - 0.5) * A.r * 1.2, w = clamp01(q * 1.3 - rnd() * 0.3);
          glow(g, lerp(rx - A.r * 1.2 + ox, A.bx, easeIn2(w)), lerp(ry + oy, A.hy, easeIn2(w)), A.r * 0.22, tint, 0.8 * (1 - w));
        }
        glow(g, A.bx, A.hy, A.r * 1.5, tint, 0.35 * env(q, 0.4, 0.6, 0.7, 1));
        g.restore();
      }
      if (e.combo) {
        const c = clamp01((p - 0.6) / 0.4);
        g.save(); g.globalCompositeOperation = "lighter";
        groundRing(g, A.cx, A.cy, (0.4 + 0.8 * easeOut3(c)) * A.K, GOLD, 0.9 * (1 - c), 3);
        g.restore();
        spade(g, A.bx, A.hy - A.r * 2, A.r * (0.4 + 0.4 * easeOut3(c)), GOLD, 0.9 * env(c, 0, 0.15, 0.6, 1), GOLD_L);
      }
      return;
    }
    case "kazumaRouze": {
      if (!A) return;
      const k = env(p, 0, 0.1, 0.65, 1), grow = easeOut3(clamp01(p / 0.35));
      const list = e.cards && typeof e.cards === "object" ? Object.keys(e.cards) : [];
      if (e.combo) {
        // ท่า Lightning: การ์ดวนรอบตัว → หลอมเป็นตราโพทอง + สายฟ้าวน
        const m = Math.max(3, list.length), merge = easeIn2(clamp01((p - 0.25) / 0.3));
        for (let i = 0; i < m; i++) {
          const an = (i / m) * TAU + (REDUCED ? 0 : p * 7), rr = A.r * 1.6 * (1 - merge);
          const kc = env(p, 0, 0.08, 0.5, 0.6);
          cardShape(g, A.bx + Math.cos(an) * rr, A.hy - A.r * 0.4 + Math.sin(an) * rr * 0.45, A.r * 0.5, A.r * 0.72, Math.cos(an) * 0.3, kc, { glowRgb: GOLD, tint: CARD_TINT[list[i]] || BOLT });
        }
        spade(g, A.bx, A.hy - A.r * 1.9, A.r * (0.5 + 0.55 * grow), GOLD, 0.95 * k * clamp01((p - 0.4) / 0.15), GOLD_L);
        for (let i = 0; i < (lowQ ? 3 : 6); i++) {
          const an = (i / 6) * TAU + (REDUCED ? 0 : now / 300);
          bolt(g, A.bx, A.hy, A.bx + Math.cos(an) * A.r * 2.2, A.hy + Math.sin(an) * A.r * 1.6, seed + i + flick, k * 0.85 * clamp01((p - 0.45) / 0.1), 1.8, { branch: 0, lowQ });
        }
        g.save(); g.globalCompositeOperation = "lighter";
        groundRing(g, A.cx, A.cy, (0.5 + 0.6 * easeOut3(clamp01((p - 0.5) / 0.5))) * A.K, GOLD, 0.8 * k * clamp01((p - 0.5) / 0.05), 2.5);
        g.restore();
      } else {
        // Rouze ธรรมดา: การ์ดสะบัดผ่านเส้นเครื่องอ่าน → ตราโพเงินเหนือหัว
        const sw = easeInOut(clamp01(p / 0.2)), rx = A.bx + A.r * 1.2, ry = A.hy - A.r * 0.1;
        const kc = env(p, 0, 0.03, 0.18, 0.28);
        cardShape(g, rx + A.r * 0.6 - sw * A.r * 1.9, ry, A.r * 0.6, A.r * 0.86, -0.15, kc, { glowRgb: BOLT, tint: CARD_TINT[list[0]] || CRIMSON });
        const kl = env(p, 0.02, 0.06, 0.2, 0.32);
        if (kl > 0) {
          g.save(); g.globalCompositeOperation = "lighter";
          g.strokeStyle = rgba(BOLT, 0.9 * kl); g.lineWidth = 2; g.beginPath(); g.moveTo(rx - A.r * 1.6, ry); g.lineTo(rx + A.r * 0.6, ry); g.stroke();
          g.restore();
        }
        spade(g, A.bx, A.hy - A.r * 1.9, A.r * (0.45 + 0.45 * easeOut3(clamp01((p - 0.15) / 0.3))), SILVER, 0.9 * k * clamp01((p - 0.15) / 0.08), WHITE);
        g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.bx, A.hy - A.r * 1.9, A.r * 1.3, BOLT, 0.45 * k * clamp01((p - 0.15) / 0.08)); g.restore();
        twinkle(g, A.bx + A.r * 0.5, A.hy - A.r * 2.4, A.r * 0.35, env(p, 0.25, 0.3, 0.35, 0.5));
      }
      return;
    }
    case "kazumaMetal": {
      if (!A) return;
      // ร่างเหล็ก: แสงเงาเงินวิ่งผ่านตัว + โล่หกเหลี่ยมเงินกระเพื่อม + ประกายติ้ง
      const k = env(p, 0, 0.08, 0.5, 1), r = A.r * (1.45 + 0.3 * easeOut3(p));
      g.save(); g.globalCompositeOperation = "lighter";
      hexPath(g, A.bx, A.hy, r); g.fillStyle = rgba(SILVER, 0.18 * k); g.fill();
      g.strokeStyle = rgba(WHITE, 0.9 * k); g.lineWidth = 3; g.stroke();
      if (!lowQ) { hexPath(g, A.bx, A.hy, r * 1.15); g.strokeStyle = rgba(STEEL, 0.5 * k * (1 - p)); g.lineWidth = 1.5; g.stroke(); }
      g.restore();
      const sweep = clamp01(p / 0.45);
      if (sweep < 1) {
        g.save(); hexPath(g, A.bx, A.hy, A.r * 1.02); g.clip();
        const x0 = A.bx - A.r * 1.5 + A.r * 3 * easeInOut(sweep);
        const gr = g.createLinearGradient(x0 - A.r * 0.4, A.hy - A.r, x0 + A.r * 0.4, A.hy + A.r);
        gr.addColorStop(0, rgba(SILVER, 0)); gr.addColorStop(0.5, rgba(WHITE, 0.8)); gr.addColorStop(1, rgba(SILVER, 0));
        g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.fillRect(A.bx - A.r * 1.2, A.hy - A.r * 1.2, A.r * 2.4, A.r * 2.4);
        g.restore();
      }
      twinkle(g, A.bx + A.r * 0.9, A.hy - A.r * 0.9, A.r * 0.5, env(p, 0.05, 0.12, 0.2, 0.45));
      sparks(g, A.bx, A.hy - A.r * 0.2, -Math.PI / 2, 4, A.r * 1.6, p * 1.8, k, seed, lowQ ? 5 : 10, SILVER);
      return;
    }
    case "kazumaHeal": {
      if (!A) return;
      const rnd = rngOf(seed);
      g.save(); g.globalCompositeOperation = "lighter";
      groundRing(g, A.cx, A.cy, (0.3 + 0.35 * easeOut3(clamp01(p / 0.5))) * A.K, GREEN, 0.55 * env(p, 0, 0.1, 0.4, 0.8), 2);
      for (let i = 0; i < (lowQ ? 6 : 14); i++) {
        const ph = clamp01(p * 1.3 - rnd() * 0.3), x = A.bx + (rnd() - 0.5) * A.r * 2, y = A.by - ph * A.s * 1.5;
        glow(g, x, y, 5 + rnd() * 3, i % 4 ? GREEN : WHITE, 0.9 * (1 - ph) * clamp01(ph * 6));
      }
      glow(g, A.bx, A.hy, A.r * 1.3, GREEN, 0.3 * env(p, 0.1, 0.3, 0.5, 0.9));
      g.restore();
      twinkle(g, A.bx - A.r * 0.6, A.hy - A.r * 1.2, A.r * 0.3, env(p, 0.3, 0.38, 0.45, 0.6), GREEN);
      twinkle(g, A.bx + A.r * 0.7, A.hy - A.r * 0.8, A.r * 0.26, env(p, 0.42, 0.5, 0.56, 0.72), WHITE);
      return;
    }
    case "kazumaDashStart": {
      // Lightning Sonic ออกตัว: ตราโพทองแผ่บนพื้น + สายฟ้าแตกวง (ตัวพุ่งออกไปแล้ว — ฉากพุ่ง kazumaSonic วาดต่อ)
      const from = okT(e.from) ? e.from : at;
      if (!from) return;
      const S = bodyAt(from.x, from.y, n), k = env(p, 0, 0.06, 0.3, 1), q = easeOut3(clamp01(p / 0.6));
      g.save(); g.globalCompositeOperation = "lighter";
      groundSpade(g, S.cx, S.cy, (0.35 + 0.35 * q) * S.K, GOLD, 0.3 * k, { stroke: GOLD_L, lw: 2 });
      groundRing(g, S.cx, S.cy, (0.3 + 1 * q) * S.K, BOLT, 0.7 * k, 2.5);
      g.restore();
      burst(g, S.bx, S.by - S.s * 0.2, S.r * 1.8 * (0.7 + 0.3 * q), seed + flick, k * 0.75, lowQ);
      return;
    }
    case "kazumaSonicHit": {
      const to = okT(e.to) ? e.to : at;
      if (!to) return;
      const B = bodyAt(to.x, to.y, e.tsize || 1);
      const k = env(p, 0, 0.05, 0.4, 1), q = clamp01(p);
      if (e.dodge) {
        g.save(); g.globalCompositeOperation = "lighter"; glow(g, B.bx, B.hy, B.r * 1.4, BOLT, 0.4 * k); g.restore();
        ghostHex(g, B.bx + B.r * 0.8 * easeOut3(q), B.hy, B.r, 0.5 * k);
        return;
      }
      // คนในแถว BEAT (side) — สายฟ้าลงทีละคน
      const sides = Array.isArray(e.sideAt) ? e.sideAt : [];
      sides.forEach((s, i) => {
        const b = bodyAt(s.x, s.y, s.size || 1), d0 = 0.05 + i * 0.04, kk = env(p, d0, d0 + 0.03, d0 + 0.15, d0 + 0.45);
        skyBolt(g, b.bx, b.hy, b.s * 2.8, seed + 30 + i + flick, kk, 2, lowQ);
        burst(g, b.bx, b.hy, b.r * 1.8, seed + 50 + i + flick, kk * 0.8, true);
      });
      const kb = env(p, 0, 0.02, 0.08, 0.22);
      for (let i = 0; i < (lowQ ? 1 : 3); i++) skyBolt(g, B.bx + (i - 1) * B.r * 0.45, B.hy, B.s * 3.4, seed + 10 + i * 3 + flick, kb * (1 - i * 0.2), 2.8 - i * 0.5, lowQ);
      burst(g, B.bx, B.hy, B.r * 3.2 * (0.6 + 0.4 * easeOut3(clamp01(p / 0.3))), seed + flick, k, lowQ);
      g.save(); g.globalCompositeOperation = "lighter";
      const sg = easeOut3(clamp01(q / 0.5));
      groundSpade(g, B.cx, B.cy, (0.4 + 0.9 * sg) * B.K, GOLD, 0.3 * k * (1 - sg * 0.5), { stroke: GOLD_L, lw: 2.5 });
      groundRing(g, B.cx, B.cy, (0.3 + 1.6 * easeOut3(clamp01(q / 0.7))) * B.K, BOLT, 0.75 * k, 3);
      if (!lowQ) groundRing(g, B.cx, B.cy, (0.2 + 1 * easeOut3(clamp01(q / 0.45))) * B.K, WHITE, 0.6 * k, 2);
      g.restore();
      sparks(g, B.bx, B.hy, -Math.PI / 2, 3.6, B.r * 3.2, q * 1.3, k, seed + 3, lowQ ? 8 : 18);
      spade(g, B.bx, B.hy - B.r * 1.6 - B.r * q, B.r * (0.9 + 0.6 * sg), GOLD, 0.8 * k * (1 - clamp01((q - 0.3) / 0.5)), GOLD_L);
      return;
    }
    default:
  }
}

// ---------- จุดเข้า ----------
export function kazumaFx(g, e, now, lowQ) {
  if (e.kind in KAZUMA_MS) { styleFx(g, e, now, lowQ); return; }
  if (e.kind === "kazumaSonic") { sonicFx(g, e, now, lowQ); return; }
  eventFx(g, e, now, lowQ);
}

// socket "kazumaFx" { kind, id, color, at, size, ... } → { fx, look, shake, later } (BoardStage)
//  ctx = { posOf(id), sizeOf(id) } · เลขดาเมจ Lightning Sonic มากับ sonicHit (ตรงจังหวะที่ server ลงผล)
export function kazumaEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], later: [] };
  if (!ev || typeof ev.kind !== "string") return out;
  const kind = EVENT_FX[ev.kind];
  if (!kind) return out;
  const sizeOf = ctx.sizeOf || (() => 1), posOf = ctx.posOf || (() => null);
  const f = { kind, id: ev.id, at: ev.at, size: ev.size || 1, color: ev.color };
  for (const k of ["card", "combo", "cards", "path", "dir", "from", "to", "targetId", "dodge", "amount"]) if (ev[k] !== undefined) f[k] = ev[k];
  if (ev.kind === "sonicHit") {
    f.tsize = sizeOf(ev.targetId) || 1;
    if (Array.isArray(ev.side)) f.sideAt = ev.side.map((id) => { const p = posOf(id); return p ? { x: p.x, y: p.y, size: sizeOf(id) || 1 } : null; }).filter(Boolean);
    const to = okT(ev.to) ? ev.to : null;
    if (to) {
      out.look.push([to, 0]);
      out.later.push([KAZUMA_FX.sonicBoom, [{ kind: "float", x: to.x, y: to.y, text: ev.dodge ? "หลบ" : `-${ev.dmg | 0}`, size: 32, hitIds: ev.dodge ? undefined : [ev.targetId] }]]);
    }
    if (!ev.dodge) out.shake.push(KAZUMA_FX.sonicBoom);
  }
  if (ev.kind === "henshin") out.shake.push(KAZUMA_FX.henshinPass);
  out.fx.push(f);
  return out;
}

// ============================================================
//  เอฟเฟกต์บนกระดานของโรลันด์ (characters/roland.js · GRID_PLAN §7.25)
//  ธีม Black Silence: ขาวดำล้วนตามภาพการ์ด · หมึกดำ + แสงขาวเฉียง · สีอื่นใช้เฉพาะเลือด/น้ำแข็ง
//
//  เหตุการณ์ (socket "rolandFx" → rolandEventFx → { fx, look, shake, later }):
//   swing (ง้างอาวุธตามการ์ด — ปะทะตรงกับ BEAT.swing ของ server) · impact (รอยอาวุธบนเป้า + เลขดาเมจ)
//   emotion (วงซ้อนสีขาว) · ready (Furioso พร้อม: รอยดำแตกรอบตัว) · ego (หน้า EGO วาบ) ·
//   shard (เกล็ดน้ำแข็ง) · shatter (น้ำแข็งแตก) · fervent (หัวใจหยุดเต้น) · draw = เสียงเฉพาะเจ้าของ (ไม่มีภาพ)
//  ท่าทางตามอาวุธ: thrust (หอก/ปืน) · sweep (ฟันโค้ง) · smash (ทุบ) · cross (ไขว้) — รูปอาวุธอ่านจากภาพการ์ด
//  lowQ = ตัดอนุภาคครึ่งหนึ่ง
// ============================================================
import { P, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ปะทะตรงกับ server BEAT.swing (0.45 วิ) · dashStep = BEAT.dashStep
export const ROLAND_FX = { swing: 450, dashStep: 90 };
export const ROLAND_FX_DUR = {
  rolandSwing: 620, rolandImpact: 620, rolandEmotion: 900, rolandReady: 1200, rolandEgo: 1000, rolandShard: 520, rolandShatter: 820, rolandFervent: 1300,
};
export const isRolandFx = (kind) => typeof kind === "string" && (kind in ROLAND_FX_DUR);
const EVENT_FX = {
  swing: "rolandSwing", impact: "rolandImpact", emotion: "rolandEmotion", ready: "rolandReady", ego: "rolandEgo",
  shard: "rolandShard", shatter: "rolandShatter", fervent: "rolandFervent",
};
const MOTION = {
  allas: "thrust", logic: "thrust", zelkova: "sweep", durandal: "sweep", mook: "sweep", ranga: "cross", crystal: "cross",
  oldboys: "smash", wheels: "smash", furioso: "cross",
};
const WHITE = "255,255,255", INK = "12,12,16", ICE = "170,225,255", BLOOD = "190,20,40";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const rgba = (c, a) => `rgba(${c},${a})`;
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
const env = (p, a, b, c, d) => (p < a || p > d ? 0 : p < b ? (p - a) / (b - a || 1) : p <= c ? 1 : 1 - (p - c) / (d - c || 1));
function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) || 1; }
const rngOf = (seed) => { let n = seed % 2147483646 || 1; return () => (n = (n * 16807) % 2147483647) / 2147483647; };
// จุดกลางตัวบนจอ · r = ขนาดอ้างอิงเท่าช่อง
function bodyAt(t, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6;
  const [x, y, s] = P(t.x + n / 2, t.y + n / 2);
  return { x, y: y - s * 0.55 * K, gx: x, gy: y, r: s * 0.4 * K };
}
function ring(g, x, y, r, c, a, w) {
  g.strokeStyle = rgba(c, a); g.lineWidth = w;
  g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, TAU); g.stroke();
}
// แถบแสงเรียวปลายแหลม (รอยอาวุธ)
function blade(g, x0, y0, x1, y1, w, c, a) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  g.fillStyle = rgba(c, a);
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx + nx * w, my + ny * w, x1, y1); g.quadraticCurveTo(mx - nx * w, my - ny * w, x0, y0); g.fill();
}
function shards(g, x, y, p, r, n, c, seed) {
  const rnd = rngOf(seed), k = 1 - p;
  g.fillStyle = rgba(c, 0.9 * k);
  for (let i = 0; i < n; i++) {
    const an = rnd() * TAU, d = r * (0.3 + rnd()) * easeOut3(p), s = r * (0.05 + rnd() * 0.09);
    const px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * 0.7;
    g.beginPath(); g.moveTo(px, py - s); g.lineTo(px + s * 0.6, py); g.lineTo(px, py + s); g.lineTo(px - s * 0.6, py); g.fill();
  }
}

function swingFx(g, e, p, n) {
  if (!okT(e.at)) return;
  const A = bodyAt(e.at, n), to = okT(e.to) ? bodyAt(e.to, e.tsize || 1) : null;
  const an = to ? Math.atan2(to.y - A.y, to.x - A.x) : e.dirAngle || 0;
  const q = clamp01(p / 0.72), k = env(p, 0, 0.1, 0.7, 1);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, A.x, A.y, A.r * (1.1 + q * 0.5), WHITE, 0.3 * k);
  g.restore();
  // เงาดำง้างอาวุธรอบตัว
  const m = MOTION[e.weapon] || "sweep", L = A.r * 1.7, back = an + Math.PI;
  const tip = q < 0.8 ? back - (q / 0.8) * 0.5 : an;
  blade(g, A.x, A.y, A.x + Math.cos(tip) * L, A.y + Math.sin(tip) * L, A.r * (m === "smash" ? 0.5 : 0.2), INK, 0.9 * k);
  blade(g, A.x, A.y, A.x + Math.cos(tip) * L, A.y + Math.sin(tip) * L, A.r * 0.07, WHITE, 0.95 * k);
}
function impactFx(g, e, p, lowQ) {
  if (!okT(e.to)) return;
  const A = bodyAt(e.to, e.tsize || 1), seed = hash(`${e.targetId}|${e.t0 | 0}`), k = env(p, 0, 0.08, 0.45, 1);
  const dodge = !!e.dodge, a = (dodge ? 0.4 : 1) * k, m = MOTION[e.weapon] || "sweep", R = A.r * (e.weapon === "furioso" || e.weapon === "wheels" ? 2.4 : 1.7);
  const grow = easeOut3(clamp01(p / 0.35));
  g.save();
  if (m === "thrust") {
    for (const d of [0.2, 0, -0.2]) blade(g, A.x - R * grow, A.y + d * R, A.x + R * grow, A.y - d * R * 0.4, A.r * 0.16, INK, 0.85 * a);
    g.globalCompositeOperation = "lighter";
    blade(g, A.x - R * grow, A.y, A.x + R * grow, A.y, A.r * 0.09, WHITE, a);
  } else if (m === "cross") {
    for (const s of [1, -1]) {
      blade(g, A.x - s * R * grow, A.y - R * 0.8 * grow, A.x + s * R * grow, A.y + R * 0.8 * grow, A.r * 0.22, INK, 0.85 * a);
      g.globalCompositeOperation = "lighter";
      blade(g, A.x - s * R * grow, A.y - R * 0.8 * grow, A.x + s * R * grow, A.y + R * 0.8 * grow, A.r * 0.08, WHITE, a);
      g.globalCompositeOperation = "source-over";
    }
  } else if (m === "smash") {
    g.globalCompositeOperation = "lighter";
    ring(g, A.gx, A.gy, R * (0.3 + grow), WHITE, 0.8 * a, 4);
    blade(g, A.x, A.y - R * 1.4 * (1 - grow * 0.2), A.x, A.gy, A.r * 0.34, WHITE, 0.8 * a);
  } else {
    g.strokeStyle = rgba(INK, 0.85 * a); g.lineWidth = A.r * 0.3; g.lineCap = "round";
    g.beginPath(); g.arc(A.x, A.y, R * 0.8, -2.5, -2.5 + 2.6 * grow); g.stroke();
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = rgba(WHITE, a); g.lineWidth = A.r * 0.1;
    g.beginPath(); g.arc(A.x, A.y, R * 0.8, -2.5, -2.5 + 2.6 * grow); g.stroke();
  }
  g.restore();
  if (dodge) return;
  shards(g, A.x, A.y, p, A.r * 1.8, lowQ ? 6 : 14, e.weapon === "furioso" ? BLOOD : WHITE, seed);
}
function eventFx(g, e, now, lowQ) {
  const T = ROLAND_FX_DUR[e.kind] || 1000, p = (now - e.t0) / T;
  if (p < 0 || p > 1) return;
  const n = Math.max(1, e.size | 0), A = okT(e.at) ? bodyAt(e.at, n) : null, seed = hash(`${e.id}|${e.kind}|${e.t0 | 0}`);
  switch (e.kind) {
    case "rolandSwing": swingFx(g, e, p, n); return;
    case "rolandImpact": impactFx(g, e, p, lowQ); return;
    case "rolandEmotion": {
      if (!A) return;
      const k = 1 - p;
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) ring(g, A.gx, A.gy, A.r * (0.5 + easeOut3(clamp01(p - i * 0.12)) * 1.3), WHITE, 0.7 * k, 2.5);
      g.restore();
      return;
    }
    case "rolandReady": {
      if (!A) return;
      const rnd = rngOf(seed), k = env(p, 0, 0.1, 0.6, 1);
      for (let i = 0; i < (lowQ ? 6 : 12); i++) {
        const an = rnd() * TAU, len = A.r * (1.4 + rnd() * 1.3) * easeOut3(clamp01(p / 0.4));
        blade(g, A.x, A.y, A.x + Math.cos(an) * len, A.y + Math.sin(an) * len * 0.7, A.r * 0.16, INK, 0.9 * k);
      }
      g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.x, A.y, A.r * 2, WHITE, 0.5 * k); g.restore();
      return;
    }
    case "rolandEgo": {
      if (!A) return;
      const k = env(p, 0, 0.12, 0.5, 1), red = e.ego === "fervent" || e.ego === "urging", c = e.ego === "kiss" ? ICE : red ? BLOOD : WHITE;
      g.save(); g.globalCompositeOperation = "lighter";
      glow(g, A.x, A.y, A.r * (1.5 + p), c, 0.55 * k);
      ring(g, A.gx, A.gy, A.r * (0.6 + easeOut3(p)), c, 0.75 * k, 3);
      g.restore();
      return;
    }
    case "rolandShard": {
      if (!okT(e.to)) return;
      const B = bodyAt(e.to);
      shards(g, B.x, B.y, p, B.r * 1.2, lowQ ? 4 : 8, ICE, seed);
      return;
    }
    case "rolandShatter": {
      if (!okT(e.to)) return;
      const B = bodyAt(e.to);
      g.save(); g.globalCompositeOperation = "lighter"; glow(g, B.x, B.y, B.r * 2, ICE, 0.7 * (1 - p)); g.restore();
      shards(g, B.x, B.y, p, B.r * 2.6, lowQ ? 10 : 24, ICE, seed);
      return;
    }
    case "rolandFervent": {
      if (!A) return;
      const beat = REDUCED ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(p * 9));
      g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.x, A.y, A.r * 1.7 * beat, BLOOD, 0.8 * (1 - p)); g.restore();
      return;
    }
    default:
  }
}

export function rolandFx(g, e, now, lowQ) { eventFx(g, e, now, lowQ); }

export function rolandEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], later: [], sound: null };
  if (!ev || typeof ev.kind !== "string") return out;
  if (ev.kind === "draw") { out.sound = "roland_draw"; return out; }
  const kind = EVENT_FX[ev.kind];
  if (!kind) return out;
  const sizeOf = ctx.sizeOf || (() => 1);
  const f = { kind, id: ev.id, at: ev.at, size: ev.size || 1, color: ev.color };
  for (const k of ["weapon", "to", "targetId", "dodge", "ego", "n"]) if (ev[k] !== undefined) f[k] = ev[k];
  if (ev.targetId != null) f.tsize = sizeOf(ev.targetId) || 1;
  if (ev.kind === "swing" && okT(ev.to)) out.look.push([ev.to, 0]);
  if (ev.kind === "impact" && okT(ev.to)) {
    out.look.push([ev.to, 0]);
    out.fx.push({ kind: "float", x: ev.to.x, y: ev.to.y, text: ev.dodge ? "หลบ" : `-${ev.dmg | 0}`, size: 32, hitIds: ev.dodge ? undefined : [ev.targetId] });
    if (!ev.dodge) out.shake.push(0);
  }
  out.fx.push(f);
  return out;
}

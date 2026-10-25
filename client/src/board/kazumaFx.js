// ============================================================
//  เอฟเฟกต์บนกระดานของเคนซากิ คาซุมะ (characters/kensaki_kazuma.js · GRID_PLAN §7.19)
//  ธีม Kamen Rider Blade: แผ่นแสงฟ้า Orichalcum Element (แปลงร่าง) · การ์ด Rouze · โพแดงทอง · สายฟ้าฟ้าขาว (THUNDER Deer)
//
//  ตีปกติ (attackStyle — STYLE_MS / STYLE_HIT_P ใน boardDraw) · fx { x, y (มุมบนซ้ายผู้ตี), size, to, toSize, lane?, by }
//   kazumaBlast  สายฟ้ารวมที่เท้า → กระโดดโค้งเป็นแสงฟ้า (ไรเดอร์คิก) → สายฟ้าแตกกิ่งรอบเป้า + ตราโพทองวาบ
//   kazumaSlash  ดาบเรืองฟ้า → สายฟ้าฟาดตามแนว 3 ช่อง (fx.lane) → ช่องในแนวกระพริบ
//  เหตุการณ์ (socket "kazumaFx" → kazumaEventFx → { fx, look, shake, later }):
//   henshin (แผ่นแสงฟ้าลายโพวิ่งผ่านตัว) · unhenshin (เศษแสงฟ้าแตกออก) · card (การ์ดลอยลงเข้าตัว · ครบสูตร = วงทอง)
//   rouze (ตราโพเหนือหัว · ท่า Lightning = สายฟ้าวนรอบตัว) · metal (โล่หกเหลี่ยมเงิน) · heal (ประกายเขียวลอยขึ้น)
//   sonicDash (ทางพุ่งเป็นสายฟ้า) · sonicHit (สายฟ้าระเบิดที่เป้า + เลขดาเมจ)
//  lowQ = ตัดกิ่งสายฟ้า/อนุภาคครึ่งหนึ่ง · ลดการเคลื่อนไหว = สายฟ้าไม่สั่น (รูปเดิมทั้งฉาก)
// ============================================================
import { P, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ ----------
export const KAZUMA_MS = { kazumaBlast: 1000, kazumaSlash: 900 };
export const KAZUMA_HIT_P = { kazumaBlast: 0.55, kazumaSlash: 0.45 };
//  server พัก (skillBeat): พุ่ง 0.09 วิ/ช่อง + 0.35 · ชน 0.7 วิ — ภาพต้องไม่ช้ากว่านั้น
export const KAZUMA_FX = { dashStep: 90, sonicBoom: 120 };
export const KAZUMA_FX_DUR = {
  ...KAZUMA_MS,
  kazumaHenshin: 1300, kazumaUnhenshin: 800, kazumaCard: 900, kazumaRouze: 1100, kazumaMetal: 900, kazumaHeal: 1100,
  kazumaDash: 1000, kazumaSonicHit: 900,
};
export const isKazumaFx = (kind) => typeof kind === "string" && (kind in KAZUMA_FX_DUR);
const EVENT_FX = {
  henshin: "kazumaHenshin", unhenshin: "kazumaUnhenshin", card: "kazumaCard", rouze: "kazumaRouze", metal: "kazumaMetal",
  heal: "kazumaHeal", sonicDash: "kazumaDash", sonicHit: "kazumaSonicHit",
};

// ---------- สี (r,g,b) ----------
const WHITE = "255,255,255", BOLT = "150,220,255", BOLT_D = "60,140,255", GOLD = "255,210,100", GOLD_L = "255,240,180";
const CRIMSON = "190,30,60", SILVER = "214,222,236", ORI = "90,170,255", GREEN = "150,240,170";

// ---------- คณิต ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
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

// สายฟ้าหยัก: จุดหักทุก ~seg px · jitter ตามความยาว · กิ่งย่อย (branch) แตกออกจากกลางเส้น
function bolt(g, x1, y1, x2, y2, seed, a, w, { jitter = 0.22, branch = 2, lowQ = false } = {}) {
  if (a <= 0.01) return;
  const rnd = rngOf(seed + (REDUCED ? 0 : 0));
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
  if (!lowQ) stroke(BOLT_D, w * 3.2, a * 0.35);
  stroke(BOLT, w * 1.6, a * 0.85);
  stroke(WHITE, w * 0.7, a);
  g.restore();
  const nb = lowQ ? Math.min(1, branch) : branch;
  for (let b = 0; b < nb; b++) {
    const i = 1 + Math.floor(rnd() * (pts.length - 2));
    const [bx, by] = pts[i], ang = Math.atan2(y2 - y1, x2 - x1) + (rnd() - 0.5) * 1.6, bl = len * (0.18 + rnd() * 0.22);
    bolt(g, bx, by, bx + Math.cos(ang) * bl, by + Math.sin(ang) * bl, seed + 31 * (b + 1), a * 0.7, w * 0.55, { jitter: 0.3, branch: 0, lowQ });
  }
}
// สายฟ้าแตกกิ่งรอบจุด (ปะทะ)
function burst(g, x, y, r, seed, a, lowQ) {
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
// ตราโพ (♠) ตั้งตรง ขนาด r
function spade(g, x, y, r, fillRgb, a, strokeRgb = null) {
  if (a <= 0.01) return;
  g.save(); g.translate(x, y);
  g.beginPath();
  g.moveTo(0, -r);
  g.bezierCurveTo(r * 0.55, -r * 0.45, r * 1.05, -r * 0.05, r * 0.62, r * 0.42);
  g.bezierCurveTo(r * 0.38, r * 0.66, r * 0.1, r * 0.55, r * 0.06, r * 0.32);
  g.lineTo(r * 0.24, r * 0.92); g.lineTo(-r * 0.24, r * 0.92); g.lineTo(-r * 0.06, r * 0.32);
  g.bezierCurveTo(-r * 0.1, r * 0.55, -r * 0.38, r * 0.66, -r * 0.62, r * 0.42);
  g.bezierCurveTo(-r * 1.05, -r * 0.05, -r * 0.55, -r * 0.45, 0, -r);
  g.closePath();
  g.fillStyle = rgba(fillRgb, a); g.fill();
  if (strokeRgb) { g.strokeStyle = rgba(strokeRgb, a); g.lineWidth = Math.max(1, r * 0.09); g.stroke(); }
  g.restore();
}
// การ์ดเล็ก (สี่เหลี่ยมมุมมน) หมุน rot
function cardShape(g, x, y, w, h, rot, a, glowRgb) {
  if (a <= 0.01) return;
  g.save(); g.translate(x, y); g.rotate(rot);
  if (glowRgb) { g.globalCompositeOperation = "lighter"; glow(g, 0, 0, h * 0.9, glowRgb, 0.5 * a); g.globalCompositeOperation = "source-over"; }
  g.fillStyle = rgba("240,232,214", a); g.strokeStyle = rgba(CRIMSON, a); g.lineWidth = 1.5;
  g.beginPath(); g.roundRect ? g.roundRect(-w / 2, -h / 2, w, h, w * 0.12) : g.rect(-w / 2, -h / 2, w, h); g.fill(); g.stroke();
  spade(g, 0, -h * 0.05, w * 0.28, CRIMSON, a);
  g.restore();
}

// ---------- ตีปกติ ----------
function styleFx(g, e, now, lowQ) {
  const T = KAZUMA_MS[e.kind] || 900, p = (now - e.t0) / T;
  if (p < 0 || p > 1 || !okT(e) || !okT(e.to)) return;
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const hitP = KAZUMA_HIT_P[e.kind], seed = strHash(`${e.by}|${e.t0 | 0}`);
  const flick = REDUCED ? 0 : Math.floor(now / 50);
  if (e.kind === "kazumaBlast") {
    // ชาร์จ: สายฟ้าเล็กวิ่งรอบเท้า
    const charge = env(p, 0, 0.12, hitP - 0.2, hitP - 0.08);
    for (let i = 0; i < (lowQ ? 2 : 4); i++) {
      const an = (i / 4) * TAU + flick * 0.7;
      bolt(g, A.bx, A.by - A.s * 0.1, A.bx + Math.cos(an) * A.s * 0.55, A.by + Math.sin(an) * A.s * 0.28, seed + flick + i, charge, 1.6, { branch: 0, lowQ });
    }
    // กระโดดโค้ง: หัวแสงฟ้า + หางแสง
    const u = clamp01((p - 0.18) / (hitP - 0.18));
    if (p >= 0.18 && p < hitP + 0.02) {
      const h = Math.max(A.s * 1.6, Math.hypot(B.bx - A.bx, B.hy - A.hy) * 0.45);
      const at = (t) => [lerp(A.bx, B.bx, t), lerp(A.hy, B.hy, t) - Math.sin(t * Math.PI) * h];
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (let k = 0; k < 8; k++) {
        const t0 = Math.max(0, u - 0.04 * (k + 1)), t1 = Math.max(0, u - 0.04 * k);
        const [x0, y0] = at(t0), [x1, y1] = at(t1);
        g.strokeStyle = rgba(BOLT, 0.8 * (1 - k / 8)); g.lineWidth = A.r * 0.6 * (1 - k / 9);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
      const [hx, hy] = at(u);
      glow(g, hx, hy, A.r * 1.6, BOLT, 0.7);
      glow(g, hx, hy, A.r * 0.7, WHITE, 0.9);
      g.restore();
    }
    // ปะทะ: สายฟ้าแตก + ตราโพทอง
    const k = env(p, hitP - 0.02, hitP + 0.02, hitP + 0.12, 1);
    if (k > 0) {
      burst(g, B.bx, B.hy, B.r * 2.6 * (0.7 + 0.3 * easeOut3(clamp01((p - hitP) / 0.15))), seed + flick, k, lowQ);
      spade(g, B.bx, B.hy - B.r * 0.2, B.r * (1 + clamp01((p - hitP) / 0.3) * 0.8), GOLD, k * 0.75, GOLD_L);
    }
    return;
  }
  if (e.kind === "kazumaSlash") {
    // ดาบเรืองฟ้า (ง้าง) → สายฟ้าฟาดตามแนว → ช่องในแนวกระพริบ
    const lane = Array.isArray(e.lane) && e.lane.length ? e.lane : [e.to];
    const last = lane.reduce((m, t) => (Math.abs(t.x - e.x) + Math.abs(t.y - e.y) > Math.abs(m.x - e.x) + Math.abs(m.y - e.y) ? t : m), lane[0]);
    const L = bodyAt(last.x, last.y, 1);
    const wind = env(p, 0, 0.1, hitP - 0.1, hitP);
    if (wind > 0) {
      g.save(); g.globalCompositeOperation = "lighter";
      glow(g, A.bx + A.r * 0.8, A.hy - A.r * 0.8, A.r * 1.4, BOLT, 0.6 * wind);
      g.restore();
      bolt(g, A.bx + A.r * 0.3, A.hy, A.bx + A.r * 1.2, A.hy - A.r * 1.4, seed + flick, wind, 2, { branch: 0, lowQ });
    }
    const k = env(p, hitP - 0.03, hitP, hitP + 0.15, 1);
    if (k > 0) {
      bolt(g, A.bx, A.hy - A.r * 0.4, L.bx, L.hy, seed + flick, k, 3.2, { jitter: 0.12, branch: lowQ ? 1 : 3, lowQ });
      for (const t of lane) {
        const T2 = bodyAt(t.x, t.y, 1);
        g.save(); g.globalCompositeOperation = "lighter";
        glow(g, T2.bx, T2.by - T2.s * 0.3, T2.s * 0.7, BOLT, 0.45 * k);
        g.restore();
      }
      burst(g, B.bx, B.hy, B.r * 1.8, seed + 3 + flick, k * 0.9, true);
    }
  }
}

// ---------- เหตุการณ์ ----------
function eventFx(g, e, now, lowQ) {
  const T = KAZUMA_FX_DUR[e.kind] || 1000, p = (now - e.t0) / T;
  if (p < 0 || p > 1) return;
  const at = okT(e.at) ? e.at : null, n = Math.max(1, e.size | 0);
  const A = at ? bodyAt(at.x, at.y, n) : null;
  const seed = strHash(`${e.id}|${e.kind}|${e.t0 | 0}`);
  const flick = REDUCED ? 0 : Math.floor(now / 60);
  switch (e.kind) {
    case "kazumaHenshin": {
      if (!A) return;
      // แผ่นแสงฟ้า (Orichalcum Element) ลายโพ ลอยออกจากตัวแล้ววิ่งกลับผ่านตัว
      const out = easeOut3(clamp01(p / 0.35)), back = clamp01((p - 0.45) / 0.3);
      const dx = A.s * (0.9 * out - 0.9 * back * 1.6);
      const k = env(p, 0, 0.1, 0.8, 1);
      const w = A.r * 2.2, h = A.r * 3.1, x = A.bx + dx, y = A.hy - A.r * 0.2;
      g.save(); g.globalCompositeOperation = "lighter";
      g.fillStyle = rgba(ORI, 0.28 * k); g.strokeStyle = rgba(BOLT, 0.85 * k); g.lineWidth = 2;
      g.beginPath(); g.rect(x - w / 2, y - h / 2, w, h); g.fill(); g.stroke();
      g.restore();
      spade(g, x, y - h * 0.05, w * 0.3, GOLD, 0.8 * k, GOLD_L);
      if (p > 0.6) {
        const f = env(p, 0.6, 0.68, 0.72, 0.95);
        g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.bx, A.hy, A.r * 2.4, ORI, 0.7 * f); glow(g, A.bx, A.hy, A.r, WHITE, 0.8 * f); g.restore();
      }
      return;
    }
    case "kazumaUnhenshin": {
      if (!A) return;
      const rnd = rngOf(seed), k = 1 - p;
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < (lowQ ? 6 : 14); i++) {
        const an = rnd() * TAU, d = A.r * (0.4 + 2 * easeOut3(p) * rnd());
        g.fillStyle = rgba(ORI, 0.8 * k);
        g.fillRect(A.bx + Math.cos(an) * d, A.hy + Math.sin(an) * d * 0.8, 3, 6);
      }
      glow(g, A.bx, A.hy, A.r * 1.5, ORI, 0.4 * k);
      g.restore();
      return;
    }
    case "kazumaCard": {
      if (!A) return;
      // การ์ดลอยลงจากเหนือหัวเข้าตัว (ไถลผ่านเครื่องอ่าน) · ครบสูตร = วงทองขยาย
      const u = easeOut3(clamp01(p / 0.55)), k = env(p, 0, 0.08, 0.5, 0.7);
      cardShape(g, A.bx + A.r * 0.9 * (1 - u), A.hy - A.r * (2.6 - 2 * u), A.r * 0.9, A.r * 1.3, (1 - u) * 0.6, k, BOLT);
      const f = env(p, 0.5, 0.6, 0.65, 0.9);
      if (f > 0) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.bx, A.hy, A.r * 1.6, BOLT, 0.55 * f); g.restore(); }
      if (e.combo) {
        const c = clamp01((p - 0.55) / 0.45);
        g.save(); g.globalCompositeOperation = "lighter";
        g.strokeStyle = rgba(GOLD, 0.9 * (1 - c)); g.lineWidth = 3;
        g.beginPath(); g.ellipse(A.bx, A.by, A.s * (0.4 + 0.8 * c), A.s * (0.2 + 0.4 * c), 0, 0, TAU); g.stroke();
        g.restore();
      }
      return;
    }
    case "kazumaRouze": {
      if (!A) return;
      const k = env(p, 0, 0.12, 0.65, 1), grow = easeOut3(clamp01(p / 0.4));
      spade(g, A.bx, A.hy - A.r * 1.9, A.r * (0.5 + 0.5 * grow), e.combo ? GOLD : SILVER, 0.9 * k, e.combo ? GOLD_L : WHITE);
      if (e.combo) {
        for (let i = 0; i < (lowQ ? 3 : 6); i++) {
          const an = (i / 6) * TAU + (REDUCED ? 0 : now / 300);
          bolt(g, A.bx, A.hy, A.bx + Math.cos(an) * A.r * 2.2, A.hy + Math.sin(an) * A.r * 1.6, seed + i + flick, k * 0.85, 1.8, { branch: 0, lowQ });
        }
      } else {
        g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.bx, A.hy - A.r * 1.9, A.r * 1.4, BOLT, 0.45 * k); g.restore();
      }
      return;
    }
    case "kazumaMetal": {
      if (!A) return;
      // โล่หกเหลี่ยมเงินวาบหน้าตัว
      const k = env(p, 0, 0.1, 0.5, 1), r = A.r * (1.5 + 0.3 * easeOut3(p));
      g.save(); g.globalCompositeOperation = "lighter";
      g.beginPath();
      for (let i = 0; i <= 6; i++) { const an = (i / 6) * TAU + Math.PI / 6; const x = A.bx + Math.cos(an) * r, y = A.hy + Math.sin(an) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.fillStyle = rgba(SILVER, 0.25 * k); g.fill();
      g.strokeStyle = rgba(WHITE, 0.9 * k); g.lineWidth = 3; g.stroke();
      g.restore();
      return;
    }
    case "kazumaHeal": {
      if (!A) return;
      const rnd = rngOf(seed);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < (lowQ ? 6 : 12); i++) {
        const ph = clamp01(p * 1.3 - rnd() * 0.3), x = A.bx + (rnd() - 0.5) * A.r * 2, y = A.by - ph * A.s * 1.4;
        glow(g, x, y, 5, GREEN, 0.9 * (1 - ph));
      }
      g.restore();
      return;
    }
    case "kazumaDash": {
      // ทางพุ่ง: สายฟ้าลากตามช่องที่ผ่าน (ไล่ตามจังหวะ dashStep ของ server)
      const path = Array.isArray(e.path) ? e.path.filter(okT) : [];
      if (path.length < 2) return;
      const ms = now - e.t0, reach = Math.min(path.length - 1, ms / KAZUMA_FX.dashStep), fade = 1 - clamp01((ms - (path.length - 1) * KAZUMA_FX.dashStep) / 500);
      for (let i = 0; i < Math.floor(reach); i++) {
        const a = bodyAt(path[i].x, path[i].y, n), b = bodyAt(path[i + 1].x, path[i + 1].y, n);
        bolt(g, a.bx, a.by - a.s * 0.3, b.bx, b.by - b.s * 0.3, seed + i + flick, fade, 2.4, { branch: 1, lowQ });
      }
      return;
    }
    case "kazumaSonicHit": {
      const to = okT(e.to) ? e.to : at;
      if (!to) return;
      const B = bodyAt(to.x, to.y, e.tsize || 1);
      const k = env(p, 0, 0.06, 0.4, 1);
      if (e.dodge) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, B.bx, B.hy, B.r * 1.4, BOLT, 0.4 * k); g.restore(); return; }
      burst(g, B.bx, B.hy, B.r * 3.2 * (0.6 + 0.4 * easeOut3(clamp01(p / 0.3))), seed + flick, k, lowQ);
      spade(g, B.bx, B.hy - B.r * 0.2, B.r * (1.2 + p), GOLD, 0.7 * k, GOLD_L);
      return;
    }
    default:
  }
}

// ---------- จุดเข้า ----------
export function kazumaFx(g, e, now, lowQ) {
  if (e.kind in KAZUMA_MS) { styleFx(g, e, now, lowQ); return; }
  eventFx(g, e, now, lowQ);
}

// socket "kazumaFx" { kind, id, color, at, size, ... } → { fx, look, shake, later } (BoardStage)
//  ctx = { posOf(id), sizeOf(id) } · เลขดาเมจ Lightning Sonic มากับ sonicHit (ตรงจังหวะที่ server ลงผล)
export function kazumaEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], later: [] };
  if (!ev || typeof ev.kind !== "string") return out;
  const kind = EVENT_FX[ev.kind];
  if (!kind) return out;
  const sizeOf = ctx.sizeOf || (() => 1);
  const f = { kind, id: ev.id, at: ev.at, size: ev.size || 1, color: ev.color };
  for (const k of ["card", "combo", "cards", "path", "dir", "to", "targetId", "dodge", "amount"]) if (ev[k] !== undefined) f[k] = ev[k];
  if (ev.kind === "sonicHit") {
    f.tsize = sizeOf(ev.targetId) || 1;
    const to = okT(ev.to) ? ev.to : null;
    if (to) {
      out.look.push([to, 0]);
      out.later.push([KAZUMA_FX.sonicBoom, [{ kind: "float", x: to.x, y: to.y, text: ev.dodge ? "หลบ" : `-${ev.dmg | 0}`, size: 32, hitIds: ev.dodge ? undefined : [ev.targetId] }]]);
    }
    if (!ev.dodge) out.shake.push(KAZUMA_FX.sonicBoom);
  }
  if (ev.kind === "henshin") out.shake.push(800);
  out.fx.push(f);
  return out;
}

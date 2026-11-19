// ============================================================
//  Nautilus ชั้น 6 "ทะเลข้อมูลจินตภาพ" (ด่าน 12 · area 51 · GRID_PLAN §8.9 ชั้น 6) — ลูกเล่นของชั้น · ผัง map12.js · ภาพ client/src/board/fodlan/imaginary.js
//  ผู้ใช้เลือก 2026-11-19: คุณสมบัติจินตภาพ α–ζ + ระลอกข้อมูล · ปลาวาฬอยู่ถาวรและโหดสุด (thalassa.js) · ไม่ใช้ออกซิเจน (nautilusO2.js) · อยู่จนมีผู้ชนะ
//
//   คุณสมบัติจินตภาพ: ต้นทุกเทิร์นสนามสุ่ม 1 ข้อ (ไม่ซ้ำเทิร์นก่อน) มีผลกับทุกคนทั้งเทิร์น
//     α ตีปกติ +1 · β เดิน +2 · γ ความเสียหายที่ได้รับ −1 (ไม่ต่ำกว่า 1) · δ ความเสียหายที่ได้รับ +1 · ε คริติคอล +30% · ζ ทาลัสซา +1 ท่า และดาเมจท่า +1
//   ระลอกข้อมูล: วงจับคู่ 3 คู่ (map12.RIPPLES) — จบตาบนวง (ตัวเอง) หรือจบเทิร์นบนวง (ถูกผลักลงไป) = ถูกส่งไปวงคู่ (ช่องว่างใกล้สุดถ้ามีคนยืน) · ส่งแล้วไม่ส่งซ้ำในเทิร์นเดียวกัน
//  [Claude] ตัวเลขทั้งหมดยังไม่ได้ถามผู้ใช้
// ============================================================
const MAP = require("./map12");
const K = (x, y) => `${x},${y}`;

const ATTRS = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];
const ATTR_INFO = {
  alpha: { sym: "α", name: "คุณสมบัติจินตภาพ α", desc: "ตีปกติ +1" },
  beta: { sym: "β", name: "คุณสมบัติจินตภาพ β", desc: "ระยะเดิน +2" },
  gamma: { sym: "γ", name: "คุณสมบัติจินตภาพ γ", desc: "ความเสียหายที่ได้รับ −1 (ไม่ต่ำกว่า 1)" },
  delta: { sym: "δ", name: "คุณสมบัติจินตภาพ δ", desc: "ความเสียหายที่ได้รับ +1" },
  epsilon: { sym: "ε", name: "คุณสมบัติจินตภาพ ε", desc: "โอกาสคริติคอล +30%" },
  zeta: { sym: "ζ", name: "คุณสมบัติจินตภาพ ζ", desc: "ทาลัสซาใช้ท่าเพิ่ม 1 · ท่าของทาลัสซาแรงขึ้น 1" },
};
const ALPHA_ATK = 1, BETA_MOV = 2, GAMMA_CUT = 1, DELTA_ADD = 1, EPS_CRIT = 30;

const S = (st) => (st ? (st.nt12 ||= { attr: null, prev: null, warped: {} }) : { attr: null, prev: null, warped: {} });
const attrOf = (st) => S(st).attr;

function enter(ctx, st) {
  const s = S(st);
  s.attr = null; s.prev = null; s.warped = {};
}
// ต้นเทิร์น: สุ่มคุณสมบัติจินตภาพของเทิร์นนี้
function preRound(ctx, st) {
  const s = S(st);
  const pool = ATTRS.filter((a) => a !== s.attr);
  s.prev = s.attr;
  s.attr = pool[Math.floor(ctx.rng() * pool.length) % pool.length];
  s.warped = {};
  const info = ATTR_INFO[s.attr];
  ctx.fx("nt_attr", { attr: s.attr, sym: info.sym });
  ctx.log(`🔷 ${info.name} — ${info.desc}`);
  return 2.2;
}
function atkBonus(ctx, st) { return attrOf(st) === "alpha" ? ALPHA_ATK : 0; }
function movMod(ctx, st) { return attrOf(st) === "beta" ? BETA_MOV : 0; }
function critPct(ctx, st) { return attrOf(st) === "epsilon" ? EPS_CRIT : 0; }
function incoming(ctx, st, p, n) {
  const a = attrOf(st);
  if (a === "gamma") return Math.max(1, n - GAMMA_CUT);
  if (a === "delta") return n + DELTA_ADD;
  return n;
}

// ---------- ระลอกข้อมูล ----------
function pairOf(x, y) {
  for (const [a, b] of MAP.RIPPLES) {
    if (a[0] === x && a[1] === y) return { x: b[0], y: b[1] };
    if (b[0] === x && b[1] === y) return { x: a[0], y: a[1] };
  }
  return null;
}
function landing(ctx, p, to) {
  if (ctx.free(to.x, to.y, p.id)) return to;
  const map = ctx.map();
  let best = null, bd = 1e9;
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (!ctx.free(x, y, p.id) || pairOf(x, y)) continue;
    const d = Math.abs(x - to.x) + Math.abs(y - to.y);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
function warp(ctx, st, p) {
  const s = S(st);
  if (!p || !p.alive || !p.pos || s.warped[p.id] || (ctx.action.sizeOf && ctx.action.sizeOf(p) > 1)) return false;
  const to0 = pairOf(p.pos.x, p.pos.y);
  if (!to0) return false;
  const to = landing(ctx, p, to0);
  if (!to) return false;
  const from = { ...p.pos };
  p.pos = { ...to };
  s.warped[p.id] = true;
  ctx.fx("nt_ripple", { id: p.id, from, to: { ...to } });
  ctx.log(`🌀 ${p.name} ถูกระลอกข้อมูลส่งข้ามสนาม`);
  return true;
}
function onUnitEnd(ctx, st, p) { warp(ctx, st, p); }
function onEndTurn(ctx, st) { for (const p of ctx.alive()) warp(ctx, st, p); }

function publicInfo(ctx, st) {
  const a = attrOf(st);
  return {
    imaginary: {
      attr: a, sym: a ? ATTR_INFO[a].sym : null,
      ripples: MAP.RIPPLES.map(([p, q]) => [{ x: p[0], y: p[1] }, { x: q[0], y: q[1] }]),
    },
  };
}

module.exports = {
  ATTRS, ATTR_INFO, ALPHA_ATK, BETA_MOV, GAMMA_CUT, DELTA_ADD, EPS_CRIT,
  enter, preRound, atkBonus, movMod, critPct, incoming, pairOf, warp, onUnitEnd, onEndTurn, publicInfo, attrOf: (st) => attrOf(st), K,
};

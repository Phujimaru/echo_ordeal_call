// ============================================================
//  Nautilus ชั้น 6 "ทะเลข้อมูลจินตภาพ" (ด่าน 12 · area 51 · GRID_PLAN §8.9 ชั้น 6) — ลูกเล่นของชั้น · ผัง map12.js · ภาพ client/src/board/fodlan/imaginary.js
//  ผู้ใช้เลือก 2026-11-19: คุณสมบัติจินตภาพ α–ζ + ระลอกข้อมูล · ปลาวาฬอยู่ถาวรและโหดสุด (thalassa.js) · ไม่ใช้ออกซิเจน (nautilusO2.js) · อยู่จนมีผู้ชนะ
//
//   คุณสมบัติจินตภาพ: ต้นทุกเทิร์นสนามสุ่ม 1 ข้อ (ไม่ซ้ำเทิร์นก่อน) มีผลกับทุกคนทั้งเทิร์น
//     α ตีปกติ +1 · β เดิน +2 · γ ความเสียหายที่ได้รับ −1 (ไม่ต่ำกว่า 1) · δ ความเสียหายที่ได้รับ +1 · ε คริติคอล +30% · ζ ทาลัสซา +1 ท่า และดาเมจท่า +1
//   ระลอกข้อมูล: วงจับคู่ 3 คู่ (map12.RIPPLES) — จบตาบนวง (ตัวเอง) หรือจบเทิร์นบนวง (ถูกผลักลงไป) = ถูกส่งไปวงคู่ (ช่องว่างใกล้สุดถ้ามีคนยืน) · ส่งแล้วไม่ส่งซ้ำในเทิร์นเดียวกัน
//   (ผู้ใช้ "เอาทั้งหมด" 2026-11-19 รอบ 2)
//   เขียนทับคุณสมบัติ: ยืนติดเรือ/ขับเรือ → "เขียนทับ" เลือก α–ζ ของเทิร์นหน้า (เหรียญ 3 · ใช้แทนการตี · พักทั้งกระดาน 3 เทิร์น) — กดแล้วปุ่มเปลี่ยนเป็น α…ζ + ยกเลิก
//   หมากข้อมูล (กฎโกะ): "วางหมาก" ช่องว่างระยะ 2 (ใช้แทนการตี) · หมาก = สิ่งกีดขวาง 2 เทิร์น · คนละ 2 เม็ดพร้อมกัน
//     ล้อมกิน: ศัตรูที่ทั้ง 4 ทิศถูกปิด (หมาก/แท่งข้อมูล/ช่องว่าง/คน/เรือ/ปลาวาฬ/ขอบ) หลังเราวางหมากหรือจบตาติดตัวเขา = ดาเมจ 3 + สตั้น 1 (หลบได้ · เทิร์นละครั้งต่อคน)
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
const RW_COST = 3, RW_CD = 3, RW_SECS = 1.6;
const STONE_RANGE = 2, STONE_MAX = 2, STONE_TURNS = 2, STONE_SECS = 1.1, CAPTURE_DMG = 3, CAPTURE_SECS = 1.4;
const kit = () => require("./ntKit");

const fresh = () => ({ attr: null, prev: null, warped: {}, next: null, nextBy: null, rwCd: 0, pick: {}, stones: [], captured: {} });
const S = (st) => (st ? (st.nt12 ||= fresh()) : fresh());
const attrOf = (st) => S(st).attr;

function enter(ctx, st) {
  if (st) st.nt12 = fresh();
}
// ต้นเทิร์น: สุ่มคุณสมบัติจินตภาพของเทิร์นนี้
function preRound(ctx, st) {
  const s = S(st);
  const pool = ATTRS.filter((a) => a !== s.attr);
  s.prev = s.attr;
  const forced = s.next && ATTRS.includes(s.next) ? s.next : null;
  s.attr = forced || pool[Math.floor(ctx.rng() * pool.length) % pool.length];
  const by = forced ? s.nextBy : null;
  s.next = null; s.nextBy = null;
  s.warped = {};
  // หมากหมดอายุ (วางเทิร์น T อยู่ถึงจบเทิร์น T + 1)
  const turn = ctx.match.roundNumber + 1, before = s.stones.length;
  s.stones = s.stones.filter((t) => t.until >= turn);
  if (s.stones.length !== before) ctx.bump();
  const info = ATTR_INFO[s.attr];
  ctx.fx("nt_attr", { attr: s.attr, sym: info.sym, ...(by ? { by } : {}) });
  ctx.log(`🔷 ${info.name} — ${info.desc}${by ? " (ถูกเขียนทับ)" : ""}`);
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
// ---------- หมากข้อมูล + ล้อมกิน ----------
const stoneKeys = (st) => new Set(S(st).stones.map((t) => K(t.x, t.y)));
function layer(ctx, st, map) {
  const s = S(st);
  if (!s.stones.length) return map;
  const terrain = { ...(map.terrain || {}) };
  for (const t of s.stones) if (!terrain[K(t.x, t.y)]) terrain[K(t.x, t.y)] = "fd_nt_stone";
  return { ...map, terrain };
}
function layerVer(ctx, st) { return `st${S(st).stones.map((t) => K(t.x, t.y)).join("|")}`; }
const canStrike = (ctx, p) => kit().canStrike(ctx, p);
function stoneTiles(ctx, st, p) {
  if (!p || !p.pos) return [];
  const map = ctx.map(), out = [];
  for (let dy = -STONE_RANGE; dy <= STONE_RANGE; dy++) for (let dx = -STONE_RANGE; dx <= STONE_RANGE; dx++) {
    if (!dx && !dy) continue;
    if (Math.abs(dx) + Math.abs(dy) > STONE_RANGE) continue;
    const x = p.pos.x + dx, y = p.pos.y + dy;
    if (!ctx.Board.inBounds(map, x, y) || !ctx.free(x, y) || pairOf(x, y) || ctx.Board.isHeal(map, x, y)) continue;
    out.push({ x, y });
  }
  return out;
}
// ช่องทั้ง 4 ทิศของ u ถูกปิดหมด = ถูกล้อม
function surrounded(ctx, u) {
  if (!u || !u.alive || !u.pos || (ctx.action.sizeOf && ctx.action.sizeOf(u) > 1)) return false;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => !ctx.free(u.pos.x + dx, u.pos.y + dy, u.id));
}
// ตรวจล้อมกินศัตรูของ by ที่อยู่ติดช่องใดช่องหนึ่งใน cells
function captureNear(ctx, st, by, cells) {
  const s = S(st), turn = ctx.match.roundNumber;
  let n = 0;
  for (const u of ctx.alive()) {
    if (!u.pos || u.id === by.id || (ctx.combat.sameTeam && ctx.combat.sameTeam(by, u))) continue;
    if (s.captured[u.id] === turn) continue;
    if (!cells.some((c) => Math.abs(c.x - u.pos.x) + Math.abs(c.y - u.pos.y) === 1)) continue;
    if (!surrounded(ctx, u)) continue;
    s.captured[u.id] = turn;
    u.wasAttacked = true;
    const at = { x: u.pos.x, y: u.pos.y };
    const hit = kit().hurt(ctx, u, CAPTURE_DMG, { by, name: "⚫ ล้อมกิน" });
    if (hit) kit().status.stun(ctx, u, 1);
    ctx.fx("nt_capture", { id: u.id, by: by.id, x: at.x, y: at.y, hit });
    n++;
  }
  return n;
}
function placeStone(ctx, st, p, tile) {
  const s = S(st);
  if (!tile || !canStrike(ctx, p) || s.stones.filter((t) => t.by === p.id).length >= STONE_MAX) return false;
  if (!stoneTiles(ctx, st, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  s.stones.push({ x: tile.x, y: tile.y, by: p.id, until: ctx.match.roundNumber + STONE_TURNS - 1 });
  ctx.bump();
  ctx.fx("nt_stone", { by: p.id, from: { ...p.pos }, x: tile.x, y: tile.y });
  ctx.log(`⚫ ${p.name} วางหมากข้อมูล`);
  const caps = captureNear(ctx, st, p, [tile]);
  ctx.useStrike(p, STONE_SECS + (caps ? CAPTURE_SECS : 0));
  return true;
}

// ---------- เขียนทับคุณสมบัติ (ที่เรือ Nautilus) ----------
const nearShip = (ctx, p) => { try { return require("./nautilusShip").near(ctx, p); } catch { return false; } };
const rwCdLeft = (ctx, st) => Math.max(0, S(st).rwCd - ctx.match.roundNumber);
function rewrite(ctx, st, p, attr) {
  const s = S(st);
  if (!ATTRS.includes(attr) || attr === s.attr || !nearShip(ctx, p) || !canStrike(ctx, p) || rwCdLeft(ctx, st) || (p.gold || 0) < RW_COST) return false;
  p.gold -= RW_COST;
  s.next = attr; s.nextBy = p.id; s.rwCd = ctx.match.roundNumber + RW_CD;
  delete s.pick[p.id];
  ctx.fx("nt_rewrite", { by: p.id, attr, sym: ATTR_INFO[attr].sym });
  ctx.log(`🔷 ${p.name} เขียนทับคุณสมบัติจินตภาพของเทิร์นหน้า`);
  ctx.useStrike(p, RW_SECS);
  return true;
}

// ---------- ปุ่ม HUD ----------
function hudActions(ctx, st, p) {
  const s = S(st), out = [];
  if (!p || !p.pos) return out;
  const can = canStrike(ctx, p);
  if (s.pick[p.id] && nearShip(ctx, p) && can) {
    // 5 ตัวเลือก (ไม่รวมคุณสมบัติเทิร์นนี้) + ยกเลิก = 6 ปุ่มพอดีตาราง HUD (EXTRA_MAX) · ปุ่มเรือซ่อนระหว่างเลือก (nautilus.hudActions)
    for (const a of ATTRS.filter((x) => x !== s.attr)) out.push({ key: `fd:im:rw:${a}`, icon: ATTR_INFO[a].sym, name: ATTR_INFO[a].sym, desc: ATTR_INFO[a].desc });
    out.push({ key: "fd:im:rwx", icon: "✕", name: "ยกเลิก" });
    return out;
  }
  if (s.pick[p.id]) delete s.pick[p.id];
  const mine = s.stones.filter((t) => t.by === p.id).length, tiles = can && mine < STONE_MAX ? stoneTiles(ctx, st, p) : [];
  out.push({ key: "fd:im:stone", icon: "⚫", name: "วางหมาก", disabled: !tiles.length, tiles, ...(mine ? { count: STONE_MAX - mine } : {}) });
  if (nearShip(ctx, p)) {
    const cd = rwCdLeft(ctx, st);
    out.push({ key: "fd:im:rw", icon: "🔷", name: "เขียนทับ", disabled: !can || !!cd || (p.gold || 0) < RW_COST, ...(cd ? { cd } : {}) });
  }
  return out;
}
function charAction(ctx, st, p, key, tile) {
  const s = S(st);
  if (key === "fd:im:stone") return placeStone(ctx, st, p, tile);
  if (key === "fd:im:rw") {
    if (!nearShip(ctx, p) || !canStrike(ctx, p) || rwCdLeft(ctx, st) || (p.gold || 0) < RW_COST) return false;
    s.pick[p.id] = true; return true;
  }
  if (key === "fd:im:rwx") { delete s.pick[p.id]; return true; }
  if (key.startsWith("fd:im:rw:")) return rewrite(ctx, st, p, key.slice(9));
  return false;
}

function onUnitEnd(ctx, st, p) {
  warp(ctx, st, p);
  if (p && p.alive && p.pos) captureNear(ctx, st, p, [p.pos]);
}
function onEndTurn(ctx, st) { for (const p of ctx.alive()) warp(ctx, st, p); }

function publicInfo(ctx, st) {
  const a = attrOf(st);
  return {
    imaginary: {
      attr: a, sym: a ? ATTR_INFO[a].sym : null,
      ripples: MAP.RIPPLES.map(([p, q]) => [{ x: p[0], y: p[1] }, { x: q[0], y: q[1] }]),
      stones: S(st).stones.map((t) => ({ x: t.x, y: t.y, by: t.by, until: t.until })),
      next: S(st).next ? ATTR_INFO[S(st).next].sym : null,
    },
  };
}

module.exports = {
  ATTRS, ATTR_INFO, ALPHA_ATK, BETA_MOV, GAMMA_CUT, DELTA_ADD, EPS_CRIT, RW_COST, RW_CD, STONE_MAX, STONE_TURNS, CAPTURE_DMG,
  enter, preRound, layer, layerVer, hudActions, charAction, stoneTiles, surrounded, captureNear, atkBonus, movMod, critPct, incoming, pairOf, warp, onUnitEnd, onEndTurn, publicInfo, attrOf: (st) => attrOf(st), K,
};

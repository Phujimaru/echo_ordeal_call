// ============================================================
//  ด่าน V หลุมศพศักดิ์สิทธิ์ (area 44 · GRID_PLAN §8.5) — ห้องโถงหินใต้อารามเรืองแสงเขียว · ผัง server/fodlan/map5.js
//
//  ชีพจรเทพ (นั่งบัลลังก์ผู้ให้กำเนิด): จบตาบนบัลลังก์ = ได้ "ชีพจรเทพ" ครั้งเดียวต่อคนต่อแมตช์
//   → ครั้งถัดไปที่จะตาย ฟื้นด้วยพลังชีวิต 1 แทน (ใช้แล้วหมด) · ค้างข้ามด่าน (เก็บที่ match.fodlan.tomb ไม่ใช่ st)
//  ศิลาตรา: เข้าด่าน = ศิลา 2 ก้อนวางบนแท่นศิลาตรา 2 ใน 4 แท่น (สุ่ม) · ปุ่ม HUD "หยิบศิลาตรา" เมื่อยืนบน/ติดก้อนศิลา
//   (ไม่ใช้การตี · ถือได้คนละก้อน) · ถืออยู่ = พลังโจมตี +1 · ถือครบ 3 จบเทิร์น = คลั่งเป็นอสูร: พลังชีวิต +5 (เลือดสูงสุด +5)
//   + ใช้สกิลไม่ได้จนตาย (สถานะ Universal noskill เติมทุกจบเทิร์น) · คนถือตาย = ศิลาร่วงที่ช่องที่ตาย (ช่องนั้นมีศิลาแล้ว = ช่องว่างใกล้สุด)
//  แสงเขียวเรือง: ทุก 3 เทิร์นของการมาเยือน (เทิร์น 3, 6) ต้นเทิร์น ใครยืนบนแท่นศิลาตรา แต้มสกิล +1
//  สภาพอากาศ "ออร่า" (แสงเขียวเรือง 3 เทิร์นตั้งแต่เข้าด่าน): แสงเขียวเรืองทุกเทิร์นแทนทุก 3 เทิร์น + ห้องบัลลังก์สว่างขึ้น (client)
//
//  ผลต่อคน (ชีพจรเทพ · ศิลาที่ถือ · ร่างอสูร) ค้างข้ามด่าน → อยู่ใน `persist` (server/fodlan.js ถามทุกด่าน ไม่ใช่แค่ด่านปัจจุบัน)
//   ออกจากหลุมศพไปด่านอื่น: คนถือศิลายังถือต่อ (นับเทิร์นต่อ) · ตายนอกหลุมศพ = ศิลาหาย · ศิลาที่วางบนพื้นหลุมศพหายไปกับด่าน
//   กลับมาหลุมศพอีกรอบ = ศิลาใหม่ 2 ก้อน
//  Claude ตัดสินเอง (ผู้ใช้ไม่ได้ระบุ): ถือได้คนละ 1 ก้อน · หยิบไม่ใช้การตีและยังเดินต่อได้ · อสูรยังถือศิลา (+1 ต่อ) ·
//   ชีพจรเทพนับต่อคน (ตัวที่ถูกเรียกไม่ได้) · ออร่ากับแสงเขียวเรืองเทิร์นเดียวกัน = ได้ +1 ครั้งเดียว
// ============================================================
const Board = require("../board");

const THRONE = "fd_holythrone";
const PAD = "fd_crestpad";
const STONES = 2;        // ศิลาตราที่วางตอนเข้าด่าน
const STONE_ATK = 1;     // ถือศิลา พลังโจมตี +1
const BEAST_TURNS = 3;   // ถือครบกี่จบเทิร์นถึงคลั่ง
const BEAST_HP = 5;      // อสูร: พลังชีวิต +5 (เลือดสูงสุด +5)
const GLOW_EVERY = 3;    // แสงเขียวเรืองทุกกี่เทิร์นของการมาเยือน
const GLOW_SKILL = 1;    // แต้มสกิลที่ได้บนแท่น
const GLOW_SECS = 1.6;   // พักเกมให้ฉากแสงวิ่งตามพื้น
Object.assign(module.exports, { THRONE, PAD, STONES, STONE_ATK, BEAST_TURNS, BEAST_HP, GLOW_EVERY, GLOW_SKILL });

// ---------- สถานะ ----------
// ทั้งแมตช์ (ข้ามด่าน): pulse[id] = "ready" | "used" · carry[id] = { turns, beast, last: {x,y} }
function tomb(ctx) {
  const f = ctx.match.fodlan;
  if (!f.tomb) f.tomb = { pulse: {}, carry: {} };
  return f.tomb;
}
const isUnit = (p) => !!(p && !p.summon);
function tilesOf(ctx, p) { return p && p.pos ? Board.footprint(p.pos.x, p.pos.y, ctx.action.sizeOf(p)) : []; }
function standsOn(ctx, p, kind) {
  const map = ctx.map();
  return tilesOf(ctx, p).some((t) => Board.specialAt(map, t.x, t.y) === kind);
}
function tilesOfKind(ctx, kind) {
  const map = ctx.map(), out = [];
  for (const [k, v] of Object.entries(map.special || {})) if (v === kind) { const [x, y] = k.split(",").map(Number); out.push({ x, y }); }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}
// ก้อนศิลาที่ p หยิบได้ (ยืนบน/ติดกัน)
function reachStones(ctx, st, p) {
  if (!st || !p || !p.pos || !Array.isArray(st.stones)) return [];
  const box = ctx.action.boxOf(p);
  return st.stones.filter((s) => Board.dist(box, { x: s.x, y: s.y }) <= 1);
}

// ---------- ศิลาร่วง ----------
// วางศิลาที่ (x, y) — ช่องนั้นมีศิลาแล้ว/เป็นสิ่งกีดขวาง = ช่องว่างที่ใกล้สุด
function placeStone(ctx, st, at) {
  const map = ctx.map();
  const taken = new Set(st.stones.map((s) => ctx.key(s.x, s.y)));
  let best = null, bd = Infinity;
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (Board.isObstacle(map, x, y) || taken.has(ctx.key(x, y))) continue;
    const d = Math.abs(x - at.x) + Math.abs(y - at.y);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  if (!best) return null;
  st.stoneSeq = (st.stoneSeq || 0) + 1;
  const s = { id: `c${st.stoneSeq}`, x: best.x, y: best.y };
  st.stones.push(s);
  return s;
}
// คนถือตาย/หายไป → ศิลาร่วงที่ช่องที่ตาย (อยู่หลุมศพ) · อยู่ด่านอื่น = ศิลาหาย · อสูรตาย = ร่างอสูรจบ
function dropStone(ctx, st, id, at) {
  const T = tomb(ctx), c = T.carry[id];
  if (!c) return;
  delete T.carry[id];
  const p = ctx.match.players[id];
  if (c.beast && p && p.statuses) delete p.statuses.noskill;
  const where = at || c.last;
  if (!st || !Array.isArray(st.stones) || !where) return;
  const s = placeStone(ctx, st, where);
  if (!s) return;
  ctx.log(`💎 ศิลาตราของ ${p ? p.name : "ผู้ถือ"} ร่วงลงพื้น`);
  ctx.fx("crest_drop", { x: s.x, y: s.y });
}
// กวาดคนถือที่ตาย/ออกจากแมตช์โดยไม่ผ่าน preventDeath (สังหารแบบ force ฯลฯ)
function sweep(ctx, st) {
  const T = tomb(ctx);
  for (const id of Object.keys(T.carry)) {
    const p = ctx.match.players[id];
    if (!p || !p.alive) dropStone(ctx, st, id, null);
    else if (p.pos) T.carry[id].last = { x: p.pos.x, y: p.pos.y };
  }
}

function refreshNoSkill(ctx, p) { ctx.Status.applyBuff(p, "noskill", null, 1); }
function becomeBeast(ctx, p, c) {
  c.beast = true;
  p.hp += BEAST_HP; // เลือดสูงสุด +5 แล้ว (maxHpBonus) — พอดีเพดานใหม่
  refreshNoSkill(ctx, p);
  ctx.log(`👹 ${p.name} ถือศิลาตรานานเกินไป — คลั่งเป็นอสูร! พลังชีวิต +${BEAST_HP} · ใช้สกิลไม่ได้จนกว่าจะตาย`);
  if (p.pos) ctx.fx("beast", { id: p.id, x: p.pos.x, y: p.pos.y, size: ctx.action.sizeOf(p) });
}

// ---------- ผลค้างทั้งแมตช์ (server/fodlan.js ถามทุกด่าน) — st = สถานะหลุมศพ (null = ตอนนี้อยู่ด่านอื่น) ----------
const persist = {
  preventDeath(ctx, st, p) {
    if (!isUnit(p)) return false;
    const T = tomb(ctx);
    if (T.pulse[p.id] === "ready") {
      T.pulse[p.id] = "used";
      p.hp = 1;
      ctx.log(`✨ ชีพจรเทพ — ${p.name} ฟื้นคืนด้วยพลังชีวิต 1!`);
      if (st && p.pos) ctx.fx("revive", { id: p.id, x: p.pos.x, y: p.pos.y, size: ctx.action.sizeOf(p) });
      return true;
    }
    if (T.carry[p.id]) dropStone(ctx, st, p.id, p.pos ? { x: p.pos.x, y: p.pos.y } : null);
    return false;
  },
  atkBonus(ctx, st, p) { return p && tomb(ctx).carry[p.id] ? STONE_ATK : 0; },
  maxHpBonus(ctx, st, p) { const c = p && tomb(ctx).carry[p.id]; return c && c.beast ? BEAST_HP : 0; },
  // จบเทิร์น: นับเทิร์นที่ถือ → ครบ 3 = คลั่ง · อสูรเติม noskill (หลังลูปลดเทิร์นสถานะ → มีผลทั้งเทิร์นหน้า)
  onEndTurn(ctx, st) {
    sweep(ctx, st);
    const T = tomb(ctx);
    for (const [id, c] of Object.entries(T.carry)) {
      const p = ctx.match.players[id];
      if (!p || !p.alive) continue;
      if (c.beast) { refreshNoSkill(ctx, p); continue; }
      c.turns = Math.min(BEAST_TURNS, c.turns + 1);
      if (c.turns >= BEAST_TURNS) becomeBeast(ctx, p, c);
    }
  },
  playerInfo(ctx, st, p) {
    if (!p) return undefined;
    const T = tomb(ctx), c = T.carry[p.id], badges = [];
    if (T.pulse[p.id] === "ready") badges.push({ key: "pulse", icon: "✨", label: "ชีพจรเทพ", cls: "bg-emerald-200 text-gray-900" });
    if (c && c.beast) badges.push({ key: "beast", icon: "👹", label: "อสูร", cls: "bg-emerald-700 text-white" });
    else if (c) badges.push({ key: "crest", icon: "💎", label: `${c.turns}/${BEAST_TURNS}`, cls: "bg-emerald-300 text-gray-900" });
    return badges.length ? { badges } : undefined;
  },
};

// ---------- ฮุคของด่าน ----------
function enter(ctx, st) {
  st.enter = ctx.match.roundNumber; // เทิร์นแรกของการมาเยือน = roundNumber + 1
  st.stones = [];
  st.stoneSeq = 0;
  for (const t of ctx.pick(tilesOfKind(ctx, PAD), STONES)) placeStone(ctx, st, t);
}

// จบตาบนบัลลังก์ผู้ให้กำเนิด = ชีพจรเทพ (ครั้งเดียวต่อคนต่อแมตช์)
function onUnitEnd(ctx, st, p) {
  if (!isUnit(p) || !p.alive || !p.pos) return;
  const T = tomb(ctx);
  if (T.carry[p.id]) T.carry[p.id].last = { x: p.pos.x, y: p.pos.y };
  if (T.pulse[p.id] || !standsOn(ctx, p, THRONE)) return;
  T.pulse[p.id] = "ready";
  ctx.log(`✨ ${p.name} นั่งบัลลังก์ผู้ให้กำเนิด — ได้รับชีพจรเทพ!`);
  ctx.fx("throne", { id: p.id, x: p.pos.x, y: p.pos.y, size: ctx.action.sizeOf(p) });
}

// ต้นเทิร์น: แสงเขียวเรือง (ทุก 3 เทิร์นของการมาเยือน · ออร่า = ทุกเทิร์น)
function glowDue(ctx, st) {
  const idx = ctx.match.roundNumber + 1 - (st.enter || 0);
  const aura = !!(ctx.weather && ctx.weather.kind === "aura");
  return aura || (idx > 0 && idx % GLOW_EVERY === 0);
}
function preRound(ctx, st) {
  sweep(ctx, st);
  if (!glowDue(ctx, st)) return 0;
  const ids = [];
  for (const p of ctx.alive()) {
    if (!isUnit(p) || !standsOn(ctx, p, PAD)) continue;
    ctx.combat.addSkill(p, GLOW_SKILL, "fodlan");
    ids.push(p.id);
  }
  const names = ids.map((id) => ctx.match.players[id].name);
  ctx.log(names.length ? `💚 แสงเขียวเรือง — ${names.join(", ")} บนแท่นศิลาตรา แต้มสกิล +${GLOW_SKILL}` : "💚 แสงเขียวเรืองไล่ไปตามพื้นห้องโถง");
  ctx.fx("glow", { ids, aura: !!(ctx.weather && ctx.weather.kind === "aura") });
  return GLOW_SECS;
}

// ปุ่ม HUD: หยิบศิลาตรา (ยืนบน/ติดก้อนศิลา · ยังไม่ได้ถือ)
function hudActions(ctx, st, p) {
  if (!isUnit(p) || tomb(ctx).carry[p.id]) return [];
  const list = reachStones(ctx, st, p);
  if (!list.length) return [];
  const ok = ctx.action.canAct(p, { move: true });
  return [{ key: "fd:crest", icon: "💎", name: "หยิบศิลาตรา", disabled: !ok, tiles: list.length > 1 ? list.map((s) => ({ x: s.x, y: s.y })) : undefined }];
}
function charAction(ctx, st, p, key, tile) {
  if (key !== "fd:crest" || !isUnit(p) || !ctx.action.canAct(p, { move: true })) return false;
  const T = tomb(ctx);
  if (T.carry[p.id]) return false;
  const list = reachStones(ctx, st, p);
  const s = tile ? list.find((it) => it.x === tile.x && it.y === tile.y) : list[0];
  if (!s) return false;
  st.stones = st.stones.filter((it) => it !== s);
  T.carry[p.id] = { turns: 0, beast: false, last: { x: p.pos.x, y: p.pos.y } };
  ctx.log(`💎 ${p.name} หยิบศิลาตรา — พลังโจมตี +${STONE_ATK}`);
  ctx.fx("crest_pick", { id: p.id, x: s.x, y: s.y });
  return true;
}

function publicInfo(ctx, st) {
  const T = tomb(ctx);
  const idx = ctx.match.roundNumber + 1 - (st.enter || 0);
  return {
    stones: (st.stones || []).map((s) => ({ id: s.id, x: s.x, y: s.y })),
    // ศิลาที่ถือ/อสูร (วาดเหนือหัว) · ชีพจรเทพที่พร้อม (วงแสงจางที่เท้า)
    carry: Object.entries(T.carry).map(([id, c]) => ({ id, n: c.turns, beast: !!c.beast })),
    pulse: Object.keys(T.pulse).filter((id) => T.pulse[id] === "ready"),
    glowIn: (GLOW_EVERY - (((idx % GLOW_EVERY) + GLOW_EVERY) % GLOW_EVERY)) % GLOW_EVERY, // 0 = เทิร์นนี้แสงเรือง
  };
}

Object.assign(module.exports, { persist, enter, onUnitEnd, preRound, hudActions, charAction, publicInfo });

// ============================================================
//  น้ำแข็ง / หนามน้ำแข็ง / ไถล / ผลัก — ระบบกลางบนกระดาน (GRID_PLAN §7.9 · ผู้ใช้ตัดสิน 2026-10-12)
//  ใช้กับน้ำแข็งทุกแบบ (ภูมิภาค VI + ธารน้ำแข็งของ Ice Spike) — กติกาเส้นทางไถลล้วนอยู่ที่ Board.slideLine
//
//  ชั้นที่สร้างระหว่างเกม (หายเมื่อเปลี่ยนภูมิภาค — placeOnBoard ตั้ง match.board ใหม่):
//   match.board.ice    = { "x,y": { left, owner } }              ธารน้ำแข็ง (special "ice" ทับช่องพิเศษเดิม)
//   match.board.spikes = { "x,y": { lv, armor, left, owner } }   หนามน้ำแข็ง (สิ่งกีดขวาง terrain "icespike<lv>")
//   match.board.prisons = [{ x, y, owner, round }]               คุกน้ำแข็งที่รอช่วงที่ 2 (ช่องกลาง)
//   match.board.iceVer = เลขรุ่น (action.boardMap แคชตามนี้)
//  left = เทิร์นที่เหลือ (ลดตอนจบเทิร์น — onEndTurn · 0 = หาย)
//
//  การไถล (resolveEntry): ตัวที่เพิ่งเข้าช่องน้ำแข็ง (เดิน/ถูกผลัก) ไถลจนสุดแนว แล้วชนของที่ช่องถัดไป
//   - ชนคน: ผู้ไถลมีฮุค slideStrike (Ice Spike) + เป้าเป็นศัตรู = ฮุคลงดาเมจ · แล้วเป้ากระเด็นไปตามทิศ 1 ช่อง
//           ผู้ไถลอื่น = เป้า (ศัตรู) กระเด็น 1 ช่องไม่เสียเลือด · เพื่อนร่วมทีม = หยุดเฉยๆ · ตัวใหญ่ไม่กระเด็น
//   - ชนหนาม: เสียเท่า Lv (เกราะก่อน · ฆ่าได้) + เชื่องช้า · หนามลด 1 Lv — เจ้าของหนามชนเอง = ฮุค ownSpike (Ice Spike: แต้มสกิล +2)
//   - กระเด็น/ถูกผลักลงน้ำแข็ง = ไถลต่อในทิศที่ถูกผลัก (เป็นทอด ไม่เกิน MAX_CHAIN)
//  ทุกเหตุการณ์บันทึกลง ctx.events แล้วส่ง socket "iceFx" { seq, events } ให้ client เล่นตามลำดับ
//  (server ลงผลทั้งหมดทันที — client ค้างตำแหน่งไว้เล่นแอนิเมชัน · รูปข้อมูล: .claude/plans/ice-spike-contract.md)
// ============================================================
Object.assign(module.exports, {
  overlayOf, hasOverlay, publicInfo, iceAt, spikeAt, spikeKeyOf,
  layIce, undoLay, placeSpike, raiseSpike, lowerSpike, damageSpike, removeSpike, restoreSpike,
  begin, flush, fxSeconds, resolveEntry, pushUnit, applySlow, slowed,
  canHitSpike, attackSpike, hitSpikesInArea, onEndTurn, bump,
  noteHurt, flushBursts, burstNow, canLay, canSpike, addPrison, takePrisons,
});

const CHAR_HOOKS = require("../characters/index");
const { statusAmtOf, poisonAtkPenalty, invertActive } = require("../characters/_universal_status");
const { ATTACKFX_TIME } = require("./constants");
const Board = require("./board");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const lobby = require("./lobby");
const timers = require("./timers");
const view = require("./view");
const action = require("./phases/action");
const attack = require("./phases/attack");

const ICE_TURNS = 6;               // ธารน้ำแข็งอยู่ 6 เทิร์น
const SPIKE_TURNS = 3;             // หนามน้ำแข็งอยู่ 3 เทิร์น (Lv ขึ้น = นับใหม่)
const SPIKE_ARMOR = [0, 1, 2, 2];  // เกราะตาม Lv (ผู้ใช้ยืนยัน Lv3 = 2)
const SLOW_TURNS = 3;              // เชื่องช้า 3 เทิร์น
const MAX_CHAIN = 12;              // กันไถล/กระเด็นเป็นทอดไม่รู้จบ
Object.assign(module.exports, { ICE_TURNS, SPIKE_TURNS, SPIKE_ARMOR, SLOW_TURNS });

const K = Board.key;
const parseKey = (k) => { const [x, y] = k.split(",").map(Number); return { x, y }; };
const bumpVer = () => { match.board.iceVer = (match.board.iceVer || 0) + 1; };
const hookOf = (p) => (p && CHAR_HOOKS[p.characterId]) || null;

// ---------- ชั้นบนแผนที่ ----------
function hasOverlay(b) {
  return !!b && ((b.ice && Object.keys(b.ice).length > 0) || (b.spikes && Object.keys(b.spikes).length > 0));
}
// รวมชั้นเข้าแผนที่ (เรียกจาก action.boardMap — terrain ส่งมาเป็นสำเนาแล้ว)
function overlayOf(b, terrain, special) {
  const sp = { ...special };
  for (const k of Object.keys(b.ice || {})) if (!terrain[k]) sp[k] = "ice";
  for (const [k, s] of Object.entries(b.spikes || {})) terrain[k] = `icespike${s.lv}`;
  return { terrain, special: sp };
}
// ข้อมูลส่ง client (view.boardPublic)
function publicInfo() {
  const b = match.board || {};
  return {
    ice: Object.entries(b.ice || {}).map(([k, r]) => ({ ...parseKey(k), left: r.left, owner: r.owner })),
    spikes: Object.entries(b.spikes || {}).map(([k, s]) => ({ ...parseKey(k), lv: s.lv, armor: s.armor, maxArmor: SPIKE_ARMOR[s.lv], left: s.left, owner: s.owner })),
    prisons: (b.prisons || []).map((r) => ({ x: r.x, y: r.y, size: 5, owner: r.owner })),
  };
}
function iceAt(x, y) { return (match.board && match.board.ice && match.board.ice[K(x, y)]) || null; }
function spikeAt(x, y) { return (match.board && match.board.spikes && match.board.spikes[K(x, y)]) || null; }
// เป้าตีปกติ "spike:x,y" → key · ไม่มีหนามนั้น = null
function spikeKeyOf(targetId) {
  if (typeof targetId !== "string" || !targetId.startsWith("spike:")) return null;
  const k = targetId.slice(6);
  return match.board && match.board.spikes && match.board.spikes[k] ? k : null;
}

// วาง/ต่อเวลาธารน้ำแข็ง → บันทึกไว้ย้อน { k, prev } · วางไม่ได้ (สิ่งกีดขวาง/ร้านค้า/น้ำแข็งของแผนที่) = null
function layIce(x, y, owner) {
  if (!match.board) return null;
  const map = action.boardMap();
  if (!Board.inBounds(map, x, y) || map.terrain[K(x, y)]) return null;
  if (match.shopPos && match.shopPos.x === x && match.shopPos.y === y) return null;
  const base = Board.mapOf(match.board.area);
  if (Board.specialAt(base, x, y) === "ice") return null; // น้ำแข็งถาวรของภูมิภาค VI อยู่แล้ว
  const k = K(x, y);
  const b = match.board;
  b.ice ||= {};
  const prev = b.ice[k] ? { ...b.ice[k] } : null;
  b.ice[k] = { left: ICE_TURNS, owner: owner || null };
  bumpVer();
  return { k, prev };
}
// วางธารน้ำแข็งที่ช่องนี้ได้ไหม (สกิล): ในกระดาน · ไม่ใช่สิ่งกีดขวาง/หนาม/ร้านค้า · ไม่ใช่น้ำแข็งถาวรของแผนที่
function canLay(x, y) {
  if (!match.board) return false;
  const map = action.boardMap();
  if (!Board.inBounds(map, x, y) || map.terrain[K(x, y)]) return false;
  if (match.shopPos && match.shopPos.x === x && match.shopPos.y === y) return false;
  return Board.specialAt(Board.mapOf(match.board.area), x, y) !== "ice";
}
// วางหนามที่ช่องนี้ได้ไหม: ไม่ใช่สิ่งกีดขวาง/หนาม/ร้านค้า · มีคนยืน = ตัว 1×1 + ทิศผลัก dir ที่ช่องปลายว่าง
//  คืน { unit: ผู้เล่นที่ยืน | null } · ไม่ได้ = null
function canSpike(x, y, dir) {
  if (!match.board) return null;
  const map = action.boardMap();
  if (!Board.inBounds(map, x, y) || map.terrain[K(x, y)]) return null;
  if (match.shopPos && match.shopPos.x === x && match.shopPos.y === y) return null;
  const u = Board.unitAt(action.boardUnits(), x, y);
  if (!u) return { unit: null };
  const v = Board.LINE_DIRS[dir];
  if (!v || Board.sizeOf(u) > 1) return null;
  if (!action.tileFree(x + v[0], y + v[1], u.id)) return null;
  return { unit: match.players[u.id] };
}
// คุกน้ำแข็งที่รอช่วงที่ 2
function addPrison(rec) { (match.board.prisons ||= []).push(rec); }
// ดึงคุกที่ถึงเวลาของเจ้าของคนนี้ออกจากรายการ (สร้างก่อนเทิร์นนี้)
function takePrisons(ownerId, round) {
  const b = match.board;
  if (!b || !b.prisons || !b.prisons.length) return [];
  const due = b.prisons.filter((r) => r.owner === ownerId && r.round < round);
  b.prisons = b.prisons.filter((r) => !due.includes(r));
  return due;
}
// ย้อนการวาง (กดย้อนการเดิน) — ลำดับย้อนหลัง
function undoLay(records) {
  if (!match.board || !Array.isArray(records) || !records.length) return;
  for (const r of [...records].reverse()) {
    if (!r) continue;
    if (r.prev) match.board.ice[r.k] = r.prev;
    else if (match.board.ice) delete match.board.ice[r.k];
  }
  bumpVer();
}

// วางหนาม Lv (ช่องว่างจากสิ่งกีดขวาง) · วางบนน้ำแข็ง = Lv +1 (ธารน้ำแข็งใต้หนามหายไป) → { x, y, lv, from: 0 }
function placeSpike(x, y, owner, lv = 1) {
  const b = match.board;
  const k = K(x, y);
  const map = action.boardMap();
  let level = lv;
  if (Board.specialAt(map, x, y) === "ice" && Board.isIce(map, x, y)) level += 1; // น้ำแข็งเท่านั้น (พื้นเปียกไม่นับ)
  if (b.ice && b.ice[k]) delete b.ice[k];
  b.spikes ||= {};
  level = Math.min(3, level);
  b.spikes[k] = { lv: level, armor: SPIKE_ARMOR[level], left: SPIKE_TURNS, owner: owner || null };
  bumpVer();
  return { x, y, lv: level, from: 0 };
}
function raiseSpike(k, by = 1) {
  const s = match.board.spikes && match.board.spikes[k];
  if (!s) return null;
  const from = s.lv;
  s.lv = Math.min(3, s.lv + by);
  s.armor = SPIKE_ARMOR[s.lv];
  s.left = SPIKE_TURNS;
  bumpVer();
  return { ...parseKey(k), lv: s.lv, from };
}
// ลด 1 Lv (Lv1 = หาย) → { x, y, lv (0 = หาย), from }
function lowerSpike(k) {
  const s = match.board.spikes && match.board.spikes[k];
  if (!s) return null;
  const from = s.lv;
  s.lv -= 1;
  if (s.lv <= 0) delete match.board.spikes[k];
  else s.armor = SPIKE_ARMOR[s.lv];
  bumpVer();
  return { ...parseKey(k), lv: Math.max(0, s.lv), from };
}
function removeSpike(k) {
  if (!match.board || !match.board.spikes || !match.board.spikes[k]) return null;
  const s = match.board.spikes[k];
  delete match.board.spikes[k];
  bumpVer();
  return s;
}
function restoreSpike(k, rec) {
  if (!match.board || !rec) return;
  (match.board.spikes ||= {})[k] = rec;
  bumpVer();
}
// ดาเมจใส่หนาม: เกราะแตก = ลด 1 Lv (เกราะเต็มของ Lv ใหม่) · ดาเมจที่เหลือลงต่อ → [{ x, y, lv, from }] ทุกครั้งที่ลด
function damageSpike(k, n) {
  const out = [];
  let left = Math.max(0, n | 0);
  while (left > 0) {
    const s = match.board.spikes && match.board.spikes[k];
    if (!s) break;
    s.armor -= 1; left -= 1;
    if (s.armor <= 0) out.push(lowerSpike(k));
  }
  if (left !== n) bumpVer();
  return out;
}

// ---------- เชื่องช้า ----------
//  ระยะเดิน −1 (ไม่ซ้อน · ได้ใหม่ = นับ 3 เทิร์นใหม่) · คนที่เดินไปแล้วในเทิร์นนี้ (รวมคนที่กำลังเดิน) ได้ +1 = ครบ 3 ตาเดินถัดไป
function applySlow(t) {
  if (!t || !t.alive) return false;
  const acted = action.hasActed(t.id) || match.actorId === t.id;
  return combat.applyDebuff(t, "slow", 1, SLOW_TURNS + (acted ? 1 : 0));
}
function slowed(p) { return ((p && p.statuses && p.statuses.slow) || 0) > 0; }

// ---------- เหตุการณ์ให้ client ----------
let fxSeq = 0;
function begin(extra = {}) { return { events: [], depth: 0, strikes: [], ...extra }; }
function flush(ctx) {
  if (!ctx || !ctx.events.length) return;
  engine.boardFx("iceFx", { seq: ++fxSeq, events: ctx.events });
}
// เวลาโดยประมาณที่ client เล่นเหตุการณ์ชุดนี้ (วินาที) — ใช้พักเกมตอนไถลชนจบตา
function fxSeconds(ctx) {
  let ms = 0;
  for (const e of (ctx && ctx.events) || []) {
    if (e.kind === "walk") ms += Math.max(0, e.path.length - 1) * 120;
    else if (e.kind === "slide") ms += Math.max(0, e.path.length - 1) * 70 + 120;
    else if (e.kind === "knock") ms += 260;
    else if (e.kind === "hit") ms += e.max ? 700 : 450;
    else if (e.kind === "spike" || e.kind === "bump") ms += 350;
    else if (e.kind === "prison") ms += 2200;
    else if (e.kind === "burst") ms += 600;
  }
  return Math.max(1.2, Math.min(8, ms / 1000 + 0.8));
}

// ---------- ไถล / ผลัก ----------
function units() { return action.boardUnits(); }
// ตัวที่ยืนอยู่บนช่องน้ำแข็ง (x, y) แล้ว ไถลต่อไปทาง dir (เพิ่งเดิน/ถูกผลักเข้ามา) → ลงผลทั้งหมด + เหตุการณ์ใน ctx
function resolveEntry(p, dir, ctx) {
  if (!p || !p.alive || !p.pos || action.sizeOf(p) > 1 || ctx.depth > MAX_CHAIN) return;
  const map = action.boardMap();
  if (!Board.isIce(map, p.pos.x, p.pos.y)) return;
  ctx.depth++;
  const s = Board.slideLine(map, p.pos.x, p.pos.y, dir.x, dir.y, units(), p.id, action.boardBlocked());
  p.pos = { x: s.x, y: s.y };
  const n = s.tiles.length;
  ctx.events.push({ kind: "slide", id: p.id, path: s.tiles.map((t) => ({ x: t.x, y: t.y })), n });
  const hook = hookOf(p);
  if (hook && hook.onSlide) combat.withEffectSource(p, () => hook.onSlide(engine, p, n, ctx));
  impact(p, s.hit, dir, n, ctx);
}
function impact(p, hit, dir, n, ctx) {
  if (!hit || !p.alive) return;
  if (hit.kind === "unit") {
    const u = match.players[hit.id];
    if (!u || !u.alive || !u.pos) return;
    const hook = hookOf(p);
    const enemy = !combat.sameTeam(p, u);
    if (!enemy) { ctx.events.push({ kind: "bump", id: u.id, by: p.id, x: hit.x, y: hit.y, ally: true }); return; }
    if (hook && hook.slideStrike) {
      const before = (u.hp || 0) + (u.armor || 0);
      combat.withEffectSource(p, () => hook.slideStrike(engine, p, u, n, ctx));
      const dmg = Math.max(0, before - ((u.hp || 0) + (u.armor || 0)));
      if (u.alive && u.hp <= 0) combat.instantDeath(u);
      const kill = !u.alive;
      ctx.events.push({ kind: "hit", id: u.id, by: p.id, x: hit.x, y: hit.y, dmg, kill, max: n >= 4 });
      ctx.strikes.push({ by: p.id, target: u.id, dmg });
      if (kill) { u.pos = null; match.lastLog.push(`💀 ${u.name} เลือดจริงหมด ตกรอบ!`); return; }
    } else {
      ctx.events.push({ kind: "bump", id: u.id, by: p.id, x: hit.x, y: hit.y });
    }
    pushUnit(u, dir, ctx);
    return;
  }
  if (hit.kind === "obstacle" && /^icespike/.test(hit.terrain)) spikeImpact(p, K(hit.x, hit.y), ctx);
}
// ผู้ไถลชนหนาม: เสียเท่า Lv + เชื่องช้า · เจ้าของชนเอง = ฮุค ownSpike แทน · หนามลด 1 Lv
function spikeImpact(p, k, ctx) {
  const s = match.board.spikes && match.board.spikes[k];
  if (!s) return;
  const { x, y } = parseKey(k);
  const lv = s.lv;
  const owner = match.players[s.owner];
  const hook = hookOf(p);
  const own = s.owner === p.id && !!(hook && hook.ownSpike);
  const ev = { kind: "spike", x, y, by: p.id, lvFrom: lv, lvTo: Math.max(0, lv - 1), dmg: 0, kill: false, own };
  if (own) {
    ev.energy = combat.withEffectSource(p, () => hook.ownSpike(engine, p, ctx)) || 0;
    match.lastLog.push(`🧊 ${p.name} ไถลชนหนามน้ำแข็งของตัวเอง — แต้มสกิล +${ev.energy}`);
  } else {
    const before = (p.hp || 0) + (p.armor || 0);
    const deal = () => combat.dealMixed(p, lv, false);
    if (owner) combat.withEffectSource(owner, deal); else deal();
    p.wasAttacked = true;
    ev.dmg = Math.max(0, before - ((p.hp || 0) + (p.armor || 0)));
    if (p.alive && p.hp <= 0) combat.instantDeath(p);
    ev.kill = !p.alive;
    match.lastLog.push(`🧊 ${p.name} ไถลชนหนามน้ำแข็ง Lv.${lv} -${ev.dmg} (ลดเกราะก่อน)`);
  }
  lowerSpike(k);
  ctx.events.push(ev);
  if (ev.kill) { p.pos = null; match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`); return; }
  if (!own && applySlow(p)) ctx.events.push({ kind: "slow", id: p.id });
}
// ผลัก 1 ช่องตามทิศ dir ({x, y} — ทแยงได้) → ลงน้ำแข็ง = ไถลต่อ · ช่องปลายไม่ว่าง/ตัวใหญ่ = ไม่ขยับ (เด้ง)
//  คืน true = ขยับได้
function pushUnit(u, dir, ctx) {
  if (!u || !u.alive || !u.pos) return false;
  const from = { ...u.pos };
  if (action.sizeOf(u) > 1) { ctx.events.push({ kind: "knock", id: u.id, from, to: from, collide: true }); return false; }
  const to = { x: from.x + dir.x, y: from.y + dir.y };
  if (!action.tileFree(to.x, to.y, u.id)) {
    ctx.events.push({ kind: "knock", id: u.id, from, to: { x: from.x + dir.x, y: from.y + dir.y }, collide: true });
    return false;
  }
  u.pos = to;
  ctx.events.push({ kind: "knock", id: u.id, from, to: { ...to } });
  resolveEntry(u, dir, ctx);
  return true;
}
// คนอื่นถูกชนเฉยๆ (ไม่ผ่านการไถล) — เผื่อใช้ภายนอก
function bump(u, dir, ctx) { return pushUnit(u, dir, ctx); }

// ---------- ตีหนาม (ทุกคนตีได้ — เหมือนผนึกห่วงเวลาซีโร่) ----------
function spikeUnit(k) {
  const s = match.board.spikes[k];
  const pos = parseKey(k);
  return {
    id: `spike:${k}`, name: `หนามน้ำแข็ง Lv.${s.lv}`, pos, boardSize: 1, alive: true,
    hp: 0, armor: s.armor, statuses: {}, statusAmt: {}, characterId: null, teamId: null, img: null, customColor: "#9fe3ff",
  };
}
function canHitSpike(p, k) {
  if (!k || !p || !p.pos || !match.board.spikes || !match.board.spikes[k]) return false;
  const t = parseKey(k);
  if (action.lanes(p)) return !!Board.laneOf(action.boardMap(), p.pos.x, p.pos.y, action.sizeOf(p), action.rangeOf(p), { x: t.x, y: t.y, size: 1 });
  return Board.inRange(action.rangeOf(p), Board.dist(action.boxOf(p), { x: t.x, y: t.y }));
}
// พลังโจมตีที่ลงหนาม: ท่อเดียวกับตีปกติ (เหมือนผนึก)
function spikeDamage(attacker, k, { normal = true } = {}) {
  const c = attack.computeAttackBase(engine, attacker, spikeUnit(k));
  let base = c.base - (!normal && c.empowerAtk ? 1 : 0);
  if (invertActive(attacker)) base = Math.max(0, 1 - (base - 1));
  let dmg = base + statusAmtOf(attacker, "might");
  dmg = Math.max(0, dmg - (statusAmtOf(attacker, "weak") + poisonAtkPenalty(attacker)));
  return { dmg, empower: normal && c.empowerAtk };
}
// ตีปกติใส่หนาม (action.attackTarget) → ฉากตี → done (จบตา)
function attackSpike(p, k, done) {
  const unit = spikeUnit(k);
  const at = parseKey(k);
  p.didAttackRound = true;
  const { dmg, empower } = spikeDamage(p, k);
  if (empower) {
    delete p.statuses.empower;
    match.lastLog.push(`💪 ${p.name} เสริมพลัง — การโจมตีนี้ +1 (บัฟหมดลง)`);
  }
  const downs = damageSpike(k, dmg);
  const broke = !spikeAt(at.x, at.y);
  match.lastLog.push(`${p.name} โจมตี${unit.name} -${dmg}${broke ? " — แตก!" : downs.length ? ` — ลดเหลือ Lv.${downs[downs.length - 1].lv}` : ""}`);
  const card = {
    id: ++match.attackSeq, ...attack.strikeCard(p, unit, { dmg, dodge: false, kill: broke, skills: [] }),
    targetImg: null, targetColor: "#9fe3ff", spike: { ...at }, spikeDowns: downs, counter: null, push: null,
  };
  card.fxMs = ATTACKFX_TIME * 1000;
  match.lastAttack = card;
  match.gameState = "ATTACKING";
  timers.startPhaseTimer(ATTACKFX_TIME, done);
  view.broadcastState();
}
// สกิลโจมตีพื้นที่ (area.hostile) ที่คลุมหนาม — ดาเมจ = พลังโจมตีของผู้ใช้ (ไม่รวมเสริมพลัง) ต่อหนาม
function hitSpikesInArea(p, tiles) {
  if (!match.board || !match.board.spikes || !Array.isArray(tiles) || !tiles.length) return;
  const ctx = begin();
  for (const t of tiles) {
    const k = K(t.x, t.y);
    if (!match.board.spikes[k]) continue;
    const { dmg } = spikeDamage(p, k, { normal: false });
    for (const d of damageSpike(k, dmg)) ctx.events.push({ kind: "spikeDown", ...d });
    match.lastLog.push(`${p.name} โจมตีหนามน้ำแข็งด้วยสกิล -${dmg}`);
  }
  flush(ctx);
}

// ---------- จบเทิร์น: นับเวลาน้ำแข็ง/หนาม ----------
function onEndTurn() {
  const b = match.board;
  if (!b) return;
  let changed = false;
  for (const [k, r] of Object.entries(b.ice || {})) { r.left -= 1; if (r.left <= 0) delete b.ice[k]; changed = true; }
  for (const [k, s] of Object.entries(b.spikes || {})) { s.left -= 1; if (s.left <= 0) delete b.spikes[k]; changed = true; }
  // คุกที่เจ้าของตกรอบแล้ว = ยกเลิก
  if (b.prisons) b.prisons = b.prisons.filter((r) => match.players[r.owner] && match.players[r.owner].alive);
  if (changed) bumpVer();
}

// ---------- ระเบิดรอบตัว (ติดตัว 3 ของ Ice Spike) ----------
//  ดาเมจที่ได้รับสะสมครบ 3 (ทุกแบบ รวมเกราะ · เกินทบรอบหน้า) → ศัตรู 8 ช่องรอบตัวถูกผลักออก 1 ช่อง + เชื่องช้า
//  ไม่ระเบิดกลางท่อดาเมจ (ตำแหน่งคนกำลังถูกใช้อยู่ในฉากตี) — จดไว้แล้วระเบิดเมื่อจบท่อนั้น:
//   ระหว่างฉากตี (ATTACKING) = ตอนจบตา (action.finishActor) · อื่นๆ = หลังงานปัจจุบันจบ (setImmediate)
const BURST_AT = 3;
let flushQueued = false;
// ฮุคตัวละครเรียกเมื่อเสียพลังชีวิต/เกราะ 1 หน่วย (combat.loseHp/loseArmor → onDamageTaken)
function noteHurt(p, n = 1) {
  p.iceHurt = (p.iceHurt || 0) + n;
  if (p.iceHurt < BURST_AT || flushQueued) return;
  flushQueued = true;
  setImmediate(() => {
    flushQueued = false;
    if (match.gameState === "ATTACKING") return; // จบฉากแล้ว finishActor เรียก flushBursts เอง
    if (flushBursts()) view.broadcastState();
  });
}
// ระเบิดของทุก Ice Spike ที่สะสมครบ → true = มีอะไรเกิด
function flushBursts() {
  let any = false;
  for (const p of Object.values(match.players)) {
    if ((p.iceHurt || 0) < BURST_AT) continue;
    if (!p.alive || !p.pos) { p.iceHurt = 0; continue; }
    p.iceHurt -= BURST_AT;
    burstNow(p);
    any = true;
  }
  return any;
}
function burstNow(p) {
  const ctx = begin();
  ctx.events.push({ kind: "burst", id: p.id, x: p.pos.x, y: p.pos.y });
  const near = Object.values(match.players).filter((o) => o.alive && o.pos && o.id !== p.id && !combat.sameTeam(p, o)
    && Board.dist(action.boxOf(o), { x: p.pos.x - 1, y: p.pos.y - 1, size: 3 }) === 0);
  combat.withEffectSource(p, () => {
    for (const o of near) {
      const c = { x: o.pos.x + (action.sizeOf(o) - 1) / 2, y: o.pos.y + (action.sizeOf(o) - 1) / 2 };
      pushUnit(o, { x: Math.sign(c.x - p.pos.x), y: Math.sign(c.y - p.pos.y) }, ctx);
      if (o.alive && applySlow(o)) ctx.events.push({ kind: "slow", id: o.id });
    }
  });
  match.lastLog.push(`❄️ ${p.name} สะสมความเสียหายครบ ${BURST_AT} — ระเบิดน้ำแข็งผลักศัตรูรอบตัว ${near.length} คน`);
  flush(ctx);
}

// อ้างไว้กันลืม (ใช้ตอนรวมป้ายผู้ตี)
void lobby;

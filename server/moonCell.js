// ============================================================
//  โหมด Moon Cell — Raid Boss (GRID_PLAN §8.4) — กติกาฝั่ง server ทั้งหมดของสนามดวงจันทร์
//  สนาม = ลานโรงเรียน 20×20 (server/board.js MAPS[MOON_AREA]) · ผู้เล่นทุกคนทีม A ร่วมมือกันสู้บอส
//
//  ยูนิต (ยูนิตที่ถูกเรียก server/summon.js · เจ้าของสมมติ OWNER ไม่อยู่ใน match.players · ฝ่าย summon.side = SIDE):
//   ฮาคุโนะชาย/หญิง (characterId "kishinami_hakuno" — ฮุคตีปกติใน characters/_hakuno.js) HP 15 · เกราะ 5 · เดิน 5 · ระยะตี 1
//   Moon Cell ตัวใหญ่ 2×2 HP 25 · เกราะ 5 · ไม่เดิน ไม่ตี ไม่ติดสถานะ (summon.noStatus — combat.applyBuff/applyDebuff)
//  ลำดับเดิน: ฮาคุโนะเดินก่อนผู้เล่นเสมอ ไม่จั่วไพ่ (phases/action.js beginOrder — bossOrder) · ตาเดินคุมโดย AI (startAi)
//  ตาย: ฮาคุโนะ = ฟื้นต้นเทิร์นที่ 3 หลังตาย (ระเบียนใหม่ HP/เกราะเต็ม ข้างจุดเกิด) · Moon Cell = จบเกม
//  ชนะ (outcome): Moon Cell ถูกทำลาย หรือฮาคุโนะตายพร้อมกันทั้ง 2 (โค่นคนที่ 2 ก่อนคนแรกฟื้น) · แพ้: ผู้เล่นตายหมด
//  ท่าไม้ตาย "คำสาปแห่งดวงจันทร์": ต้นเทิร์น 3 · 6 · 9 … (ฮาคุโนะอยู่ครบ) เล็งจุดกลางพื้นที่ 9×9 ที่คลุมผู้เล่นได้มากสุด → เตือนทั้งเทิร์น →
//   ต้นเทิร์นถัดไปลงผล (ฮาคุโนะไม่ครบ = ยกเลิก): คลิปท่าไม้ตาย → ศัตรูในพื้นที่ถูกลบบัฟทั้งหมด + เสียหาย 3 (เกราะก่อน · ฆ่าได้) →
//   ฮาคุโนะทั้ง 2 ได้แม่นยำ 3 เทิร์น + ล้างดีบัฟ + ฟื้นพลังชีวิต 1
//  ต้นเทิร์น (preRound — ก่อนแจกไพ่ แบบ server/colony.js): ฟื้นคืนชีพ → คำสาปลงผล → ตั้งเป้าคำสาปใหม่ → มีฉาก = พักเกม CUTSCENE แล้วกลับมาแจกไพ่
// ============================================================
Object.assign(module.exports, {
  inWorld, active, reset, start, preRound, takeLog, bossOrder, isBoss, isCell, startAi, planTurn, setAiDelay,
  onUnitDeath, outcome, publicInfo, curseTiles, pickCurseCenter,
});

const Board = require("./board");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const action = require("./phases/action");
const endTurnPhase = require("./phases/endTurn");
const cutscene = require("./cutscene");
const view = require("./view");
const timers = require("./timers");
const Summon = require("./summon");
const Visibility = require("./visibility");
const Dim = require("./dimension");
const Status = require("../characters/_universal_status");

const SIDE = "moon";
const OWNER = { id: "moon", name: "Moon Cell", position: 0, customColor: null };
const KEYS = ["m", "f"];
const BOSS = {
  m: { name: "คิชินามิ ฮาคุโนะ (ชาย)", img: "/mooncell/hakuno_m.png", color: "#E8742A" },
  f: { name: "คิชินามิ ฮาคุโนะ (หญิง)", img: "/mooncell/hakuno_f.webp", color: "#C2410C" },
};
const BOSS_HP = 15, BOSS_ARMOR = 5, BOSS_MOV = 5;
const CELL_HP = 25, CELL_ARMOR = 5;
const REVIVE_TURNS = 3;     // ตายเทิร์น T → ฟื้นต้นเทิร์น T + 3
const CURSE_EVERY = 3;      // เล็งคำสาปต้นเทิร์น 3 · 6 · 9 …
const CURSE_SIZE = 9;       // พื้นที่ 9×9
const CURSE_DMG = 3;
const ACCURATE_TURNS = 3;
const LEASH = 8;            // AI ไม่ออกห่าง Moon Cell เกินนี้ (นับจากขอบ Moon Cell)
const CURSE_VIDEO = { video: "/mooncell/hakuno_duo_ultimate.mp4", voice: "/mooncell/hakuno_duo_ultimate_sound.m4a", seconds: 11 };
const SCENE_SECONDS = { revive: 2, warn: 1.6, curse: 2.6, cancel: 1 };
let aiDelayMs = 700;        // จังหวะคิดของ AI (เทสต์ตั้ง 0 = ทำทันที)

Object.assign(module.exports, { SIDE, BOSS_HP, BOSS_ARMOR, BOSS_MOV, CELL_HP, CELL_ARMOR, REVIVE_TURNS, CURSE_EVERY, CURSE_SIZE, CURSE_DMG, ACCURATE_TURNS, LEASH });

function inWorld() { return match.world === "moon"; }
function active() { return inWorld() && !!match.board && Board.isMoonArea(match.board.area); }
function reset() {
  match.moon = {
    bosses: { m: { id: null, deadRound: null }, f: { id: null, deadRound: null } },
    cellId: null, cellDead: false, curse: null, result: null,
    eventsRound: 0, scene: null, sceneSeq: 0, log: [], aiSeq: 0,
  };
}
const st = () => match.moon || (reset(), match.moon);
const P = () => match.players;
const unitOf = (id) => (id && P()[id]) || null;
function isBoss(p) { return !!(p && p.summon && (p.summon.moon === "m" || p.summon.moon === "f")); }
function isCell(p) { return !!(p && p.summon && p.summon.moon === "cell"); }
const bossUnit = (k) => { const u = unitOf(st().bosses[k].id); return u && u.alive && u.pos ? u : null; };
const livingBosses = () => KEYS.map(bossUnit).filter(Boolean);
const cellUnit = () => unitOf(st().cellId);
const log = (msg) => { match.lastLog.push(msg); st().log.push(msg); };
// บันทึกของต้นเทิร์น (dealRound ล้าง lastLog หลัง preRound) — draw.dealRound ต่อกลับให้
function takeLog() { const s = match.moon; if (!s) return []; const out = s.log; s.log = []; return out; }

// ---------- เริ่มแมตช์ (lobby.startMatch) ----------
function start() {
  reset();
  Board.setWrap(0);
  action.placeOnBoard(Board.MOON_AREA);
  const c = Board.MOON.cell;
  const cell = Summon.spawn(OWNER, {
    kind: "moonCell", characterId: "moon_cell", name: "Moon Cell", img: "/mooncell/moon_cell.webp", color: "#3D8BD9",
    hp: CELL_HP, armor: CELL_ARMOR, mov: 0, range: [1, 1], pos: c, data: { moon: "cell", noStatus: true },
  });
  cell.summon.side = SIDE;
  cell.boardSize = 2;
  st().cellId = cell.id;
  KEYS.forEach((k, i) => spawnBoss(k, Board.MOON.bosses[i]));
}
function spawnBoss(k, near) {
  const pos = action.tileFree(near.x, near.y) ? { ...near } : action.nearFreeTile(near);
  if (!pos) return null;
  const b = BOSS[k];
  const u = Summon.spawn(OWNER, {
    kind: "hakuno", characterId: "kishinami_hakuno", name: b.name, img: b.img, color: b.color,
    hp: BOSS_HP, armor: BOSS_ARMOR, mov: BOSS_MOV, range: [1, 1], pos, data: { moon: k },
  });
  u.summon.side = SIDE;
  Object.assign(st().bosses[k], { id: u.id, deadRound: null });
  return u;
}

// ---------- ลำดับเดิน (phases/action.js beginOrder) ----------
//  ฮาคุโนะที่ยังอยู่บนกระดาน (ชายก่อน) — เดินก่อนผู้เล่นทุกคน
function bossOrder() {
  if (!active()) return [];
  return livingBosses().map((u) => u.id);
}

// ---------- ตาย (Summon.onDeath) ----------
function onUnitDeath(p) {
  if (!match.moon) return;
  const s = st();
  if (isCell(p)) { s.cellDead = true; match.lastLog.push("💥 Moon Cell ถูกทำลาย!"); return; }
  if (!isBoss(p) || s.bosses[p.summon.moon].id !== p.id) return;
  s.bosses[p.summon.moon].deadRound = match.roundNumber;
  match.lastLog.push(`🌙 ${p.name} ล้มลง — ฟื้นคืนชีพในอีก ${REVIVE_TURNS} เทิร์น`);
}

// ---------- จบเกม (phases/endTurn.js gameOver) → "win" | "lose" | null ----------
function outcome() {
  if (!active()) return null;
  const s = st();
  if (s.cellDead || !cellUnit() || !cellUnit().alive) return "win";
  if (KEYS.every((k) => s.bosses[k].deadRound != null)) return "win";
  if (!combat.alivePlayers().some((p) => !p.summon)) return "lose";
  return null;
}

// ---------- คำสาปแห่งดวงจันทร์ ----------
const half = Math.floor(CURSE_SIZE / 2);
function curseTiles(at) {
  const map = action.boardMap();
  const out = [];
  for (let y = at.y - half; y <= at.y + half; y++) for (let x = at.x - half; x <= at.x + half; x++) {
    if (x >= 0 && y >= 0 && x < map.cols && y < map.rows) out.push({ x, y });
  }
  return out;
}
// ศัตรูของฮาคุโนะบนกระดาน (ผู้เล่น + ยูนิตของผู้เล่น)
function foes() {
  return combat.alivePlayers().filter((p) => p.pos && Duo_side(p) !== SIDE);
}
function Duo_side(p) { return p.summon ? p.summon.side : null; }
const inside = (p, at) => {
  const b = Board.boxOf(p);
  return b.x <= at.x + half && b.x + b.size - 1 >= at.x - half && b.y <= at.y + half && b.y + b.size - 1 >= at.y - half;
};
// จุดกลางที่คลุมผู้เล่นได้มากสุด · เท่ากัน = พลังชีวิต+เกราะรวมน้อยสุด · ใกล้จุดศูนย์กลางของผู้เล่น · แถว/คอลัมน์น้อยก่อน
function pickCurseCenter() {
  const map = action.boardMap();
  const list = foes().filter((p) => !p.summon || p.summon.controlled);
  if (!list.length) return { x: Math.floor(map.cols / 2), y: Math.floor(map.rows / 2) };
  const cx = list.reduce((a, p) => a + p.pos.x, 0) / list.length, cy = list.reduce((a, p) => a + p.pos.y, 0) / list.length;
  let best = null;
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    const hit = list.filter((p) => inside(p, { x, y }));
    const row = { x, y, n: hit.length, hp: hit.reduce((a, p) => a + p.hp + p.armor, 0), d: Math.abs(x - cx) + Math.abs(y - cy) };
    if (!best || row.n > best.n || (row.n === best.n && (row.hp < best.hp || (row.hp === best.hp && row.d < best.d)))) best = row;
  }
  return { x: best.x, y: best.y };
}
function stripAllBuffs(p) {
  const out = [];
  for (let r = Status.stripLatestBuff(p); r; r = Status.stripLatestBuff(p)) out.push(r.label);
  return out;
}
// ลงผลคำสาป (หลังคลิป) → รายการเป้าที่โดน
function landCurse(at) {
  const src = livingBosses()[0];
  const hit = [];
  for (const p of foes()) {
    if (!inside(p, at)) continue;
    const stripped = stripAllBuffs(p);
    combat.withEffectSource(src, () => {
      combat.dealMixed(p, CURSE_DMG);
      if (p.alive && p.hp <= 0) combat.instantDeath(p);
    });
    hit.push({ id: p.id, stripped: stripped.length, dead: !p.alive });
    log(`🌑 คำสาปแห่งดวงจันทร์ — ${p.name} เสียหาย ${CURSE_DMG}${stripped.length ? ` · บัฟถูกลบ ${stripped.length}` : ""}${p.alive ? "" : " · ตกรอบ!"}`);
  }
  for (const b of livingBosses()) {
    combat.applyBuff(b, "accurate", null, ACCURATE_TURNS);
    Status.cleanseDebuffs(b);
    combat.healHp(b, 1);
  }
  log(`🌙 ฮาคุโนะทั้งสอง — แม่นยำ ${ACCURATE_TURNS} เทิร์น · ล้างดีบัฟ · ฟื้นพลังชีวิต +1`);
  for (const p of Object.values(P())) if (!p.alive) p.pos = null;
  return hit;
}

// ---------- ต้นเทิร์น (draw.dealRound — ก่อนเลขเทิร์นขยับ) → true = พักเกมเล่นฉากแล้วเรียก resume ภายหลัง ----------
function preRound(resume) {
  if (!active()) return false;
  const s = st();
  const turn = match.roundNumber + 1;
  if (s.eventsRound === turn) return false;
  s.eventsRound = turn;
  s.log = [];
  const events = [];
  // ฟื้นคืนชีพ
  for (const k of KEYS) {
    const b = s.bosses[k];
    if (b.deadRound == null || turn < b.deadRound + REVIVE_TURNS) continue;
    const u = spawnBoss(k, Board.MOON.bosses[KEYS.indexOf(k)]);
    if (!u) continue;
    log(`🌙 ${u.name} ฟื้นคืนชีพ!`);
    events.push({ type: "revive", key: k, id: u.id, at: { ...u.pos } });
  }
  // คำสาปที่เตือนไว้ลงผล
  let landing = null;
  if (s.curse && s.curse.land <= turn) {
    const c = s.curse;
    s.curse = null;
    if (livingBosses().length === KEYS.length) landing = c;
    else { log("🌙 ฮาคุโนะอยู่ไม่ครบ — คำสาปแห่งดวงจันทร์สลายไป"); events.push({ type: "cancel", at: c.at }); }
  }
  // เล็งคำสาปครั้งใหม่
  const schedule = () => {
    if (turn % CURSE_EVERY !== 0 || s.curse || livingBosses().length !== KEYS.length) return;
    const at = pickCurseCenter();
    s.curse = { at, size: CURSE_SIZE, round: turn, land: turn + 1 };
    log("🌑 คำสาปแห่งดวงจันทร์ — จะลงต้นเทิร์นหน้า");
    events.push({ type: "warn", at, size: CURSE_SIZE });
  };
  if (!landing) {
    schedule();
    return holdScene(events, turn, resume);
  }
  // คลิปท่าไม้ตาย → ลงผล → ฉากบนกระดาน → (จบเกม | กลับไปแจกไพ่)
  const caster = livingBosses()[0];
  match.cutsceneQueue.push({
    seconds: CURSE_VIDEO.seconds,
    info: {
      playerId: caster.id, name: "คิชินามิ ฮาคุโนะ", img: BOSS.m.img, color: BOSS.m.color,
      video: CURSE_VIDEO.video, voice: CURSE_VIDEO.voice, title: "คำสาปแห่งดวงจันทร์", label: "ท่าไม้ตาย", noIntro: false, onlyFor: null,
    },
  });
  cutscene.runCutsceneQueue(() => {
    const hit = landCurse(landing.at);
    events.push({ type: "curse", at: landing.at, size: CURSE_SIZE, hit });
    if (endTurnPhase.gameOver()) return;
    schedule();
    if (!holdScene(events, turn, resume)) resume();
  });
  return true;
}
// มีฉาก = พักเกม CUTSCENE (ไม่มีคลิป) ให้ client เล่น · คืน false = ไม่มีอะไรให้เล่น
function holdScene(events, turn, resume) {
  const s = st();
  const seconds = Math.min(8, events.reduce((a, e) => a + (SCENE_SECONDS[e.type] || 0), 0));
  if (!(seconds > 0)) return false;
  s.scene = { seq: ++s.sceneSeq, active: true, turn, events };
  engine.boardFx("moonScene", s.scene);
  match.cutsceneInfo = null;
  match.gameState = "CUTSCENE";
  timers.startPhaseTimer(seconds, () => { if (s.scene) s.scene.active = false; resume(); });
  view.broadcastState();
  return true;
}

// ---------- AI ตาเดินของฮาคุโนะ (phases/action.js nextActor หลังเริ่มตา) ----------
//  เป้า = ศัตรูที่ตีถึงได้ในตานี้ HP+เกราะต่ำสุด (เท่ากัน = แต้มสกิลมากสุด → เดินน้อยสุด) · มีศัตรูติด Moon Cell = เล่นงานตัวนั้นก่อน
//  ตีไม่ถึงใคร = เดินเข้าหาศัตรู (ติด Moon Cell ก่อน · ไม่งั้นใกล้สุด) · ช่องที่หยุดต้องห่าง Moon Cell ไม่เกิน LEASH
function setAiDelay(ms) { aiDelayMs = Math.max(0, Number(ms) || 0); }
function nearCell(box, n) {
  const cell = cellUnit();
  return !!(cell && cell.alive && cell.pos && Board.dist(box, Board.boxOf(cell)) <= n);
}
function planTurn(u) {
  const map = action.startMap();
  const seen = action.walkUnits(u.id).filter((o) => !Visibility.hiddenFrom(u, P()[o.id]));
  const reach = Board.reachable(map, { id: u.id, x: u.pos.x, y: u.pos.y, size: 1 }, action.movOf(u), seen, {
    isAlly: (a, b) => combat.sameTeam(P()[a.id], P()[b.id]), blocked: action.boardBlocked(u.id), hop: action.hopTiles(),
  });
  const occupied = (t) => seen.some((o) => o.id !== u.id && Board.covers(o, t.x, t.y));
  const tiles = [...reach.values()].filter((t) => !occupied(t) && nearCell({ x: t.x, y: t.y, size: 1 }, LEASH));
  if (!tiles.some((t) => t.x === u.pos.x && t.y === u.pos.y)) tiles.push({ x: u.pos.x, y: u.pos.y, d: 0 });
  const range = action.rangeOf(u);
  const enemies = combat.alivePlayers().filter((o) => o.pos && o.id !== u.id && !combat.sameTeam(u, o) && Dim.same(u, o)
    && !Visibility.hiddenFromUnit(u, o) && action.tauntAllows(u, o));
  const threats = enemies.filter((o) => nearCell(Board.boxOf(o), 1));
  const cands = [];
  for (const t of tiles) for (const e of enemies) {
    if (Board.inRange(range, Board.dist({ x: t.x, y: t.y, size: 1 }, Board.boxOf(e)))) cands.push({ t, e });
  }
  const pool = threats.length && cands.some((c) => threats.includes(c.e)) ? cands.filter((c) => threats.includes(c.e)) : cands;
  if (pool.length) {
    pool.sort((a, b) => (a.e.hp + a.e.armor) - (b.e.hp + b.e.armor) || (b.e.skillPoints || 0) - (a.e.skillPoints || 0) || a.t.d - b.t.d
      || a.t.y - b.t.y || a.t.x - b.t.x);
    const { t, e } = pool[0];
    return { to: { x: t.x, y: t.y }, targetId: e.id };
  }
  const goals = threats.length ? threats : enemies;
  if (!goals.length) return { to: null, targetId: null };
  const gap = (t) => Math.min(...goals.map((e) => Board.dist({ x: t.x, y: t.y, size: 1 }, Board.boxOf(e))));
  tiles.sort((a, b) => gap(a) - gap(b) || a.d - b.d || a.y - b.y || a.x - b.x);
  const t = tiles[0];
  return { to: t.x === u.pos.x && t.y === u.pos.y ? null : { x: t.x, y: t.y }, targetId: null };
}
function startAi(u) {
  if (!active() || !isBoss(u)) return;
  const s = st();
  const token = ++s.aiSeq;
  const live = () => s.aiSeq === token && match.actorId === u.id && match.gameState === "ACTION" && u.alive && !!u.pos;
  const later = (ms, fn) => {
    if (!aiDelayMs) { fn(); return; }
    setTimeout(() => { if (live()) fn(); }, ms);
  };
  const strike = () => {
    if (!live()) return;
    const plan = planTurn(u); // คิดใหม่จากช่องที่ยืนจริง (เดินไม่สำเร็จ/ถูกขวาง)
    const t = plan.targetId && unitOf(plan.targetId);
    const here = plan.to == null || (plan.to.x === u.pos.x && plan.to.y === u.pos.y);
    if (t && here && action.attackTarget(u.id, t.id)) return;
    action.waitAction(u.id);
  };
  later(aiDelayMs, () => {
    const plan = planTurn(u);
    if (plan.to && action.moveTo(u.id, plan.to.x, plan.to.y)) {
      const steps = (match.action && match.action.path ? match.action.path.length : 2) - 1;
      later(aiDelayMs + steps * 220, strike);
      return;
    }
    strike();
  });
}

// ---------- สถานะที่ client เห็น (view.buildStateFor) ----------
function publicInfo() {
  if (!active() && !(match.moon && match.moon.result)) return null;
  const s = st();
  const turn = match.roundNumber;
  const next = s.curse ? null : Math.ceil((turn + 1) / CURSE_EVERY) * CURSE_EVERY;
  return {
    cellId: s.cellId,
    bosses: KEYS.map((k) => {
      const b = s.bosses[k];
      return { key: k, id: b.id, alive: !!bossUnit(k), reviveAt: b.deadRound == null ? null : b.deadRound + REVIVE_TURNS };
    }),
    curse: s.curse ? { at: { ...s.curse.at }, size: s.curse.size, land: s.curse.land } : null,
    nextCurse: next,
    result: s.result,
    scene: s.scene,
  };
}

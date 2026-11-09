// ============================================================
//  โหมด Fodlan (GRID_PLAN §8.5) — ตัวคุมกลางฝั่ง server ของสนามทวีป Fodlan
//  ด่าน I–V = area 40–44 (server/board.js FODLAN_AREA) · ใช้ร่วมกับโหมด ffa / duo / trio ชุดเดิม
//
//  วงจร (match.fodlan):
//   เริ่มแมตช์ = ด่าน I เสมอ (ผู้ใช้ล็อก) · ด่านละ 6 เทิร์นเท่าการเดินทางของ Origin (Journey.legEnds) → ต้นเทิร์น 7, 13, … สุ่มด่านถัดไป 2–5 ไม่ซ้ำด่านเดิม
//   สภาพอากาศ: ไม่เกิดตอนเข้าด่าน · จบเทิร์น 2 ของการมาเยือนเป็นต้นไปสุ่ม 50% ทุกจบเทิร์น → เกิดเร็วสุดเทิร์น 3 (ผู้ใช้สั่ง 2026-11-02 — เกิดทันทีรับมือไม่ทัน)
//     อยู่ 3 เทิร์น · เกิดได้ครั้งเดียวต่อการมาเยือน (วนกลับมาด่านเดิมสุ่มใหม่)
//     ชนิดตามด่าน: I ฝนฟ้าผ่า · II ไอพิษ · III ซึนามิ · IV พายุหิมะ · V ออร่า (แสงเขียวเรือง — ใต้ดินไม่มีอากาศ)
//   กลางวัน/กลางคืน: ยังสลับทุก 3 เทิร์นแต่ไม่มีผล (Journey.nightTaxOn / skillBonus คืน 0 ในโลกนี้)
//  ฉากเปลี่ยนด่านใช้ match.journeyScene ชุดเดียวกับการเดินทาง (mode "start" / "advance") แต่ส่งผ่าน publicInfo ของโหมดนี้
//
//  กติกาของแต่ละด่าน (กิมมิก + ผลของสภาพอากาศ) อยู่ที่ server/fodlan/stageN.js · ผังกระดาน server/fodlan/mapN.js
//   ฮุคทั้งหมดและที่มาของแต่ละจุด: server/fodlan/README.md · ไฟล์นี้แค่ส่งต่อเข้าโมดูลของด่านปัจจุบัน
//   สถานะของการมาเยือนแต่ละครั้ง = match.fodlan.s (ล้างทุกครั้งที่เข้าด่าน) · st.weather = สภาพอากาศของครั้งนี้ (อ่านอย่างเดียว)
// ============================================================
Object.assign(module.exports, {
  inWorld, isEos, active, start, reset, stageNow, areaOf, weatherNow, startWeather, maybeAdvance, onEndTurn, publicInfo,
  mapLayer, layerVer, preRound, onUnitEnd, hudActions, charAction, objects, strikeObject, canHitObject,
  movMod, flatWalk, carWalk, carSeats, carDriver, eosWinner, shields, atkBonus, preventDeath, hides, vision, playerInfo, makeCtx, stageState, maxHpBonus,
});

const Board = require("./board");
const Journey = require("../characters/_journey");
const Status = require("../characters/_universal_status");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const action = require("./phases/action");
const timers = require("./timers");
const view = require("./view");
const Zero = require("./zeroTime");

const STAGES = 5;
const WEATHER_TURNS = 3;
const WEATHER_PCT = 50;
const WEATHER_FROM = 3; // เทิร์นแรกของการมาเยือนที่สภาพอากาศเกิดได้
const WEATHER_KINDS = { 1: "storm", 2: "miasma", 3: "tsunami", 4: "blizzard", 5: "aura" };
const STAGE_NAMES = { 1: "แม่น้ำแอร์มิด", 2: "เรเมียร์", 3: "ชายฝั่งเดอร์ดริว", 4: "เทือกเขาฟาร์กัส", 5: "หลุมศพศักดิ์สิทธิ์", 6: "Eos" };
const WEATHER_NAMES = { storm: "ฝนฟ้าผ่า", miasma: "ไอพิษ", tsunami: "คลื่นซึนามิ", blizzard: "พายุหิมะ", aura: "แสงเขียวเรือง", eos_storm: "ฝนฟ้าคะนอง", eos_fog: "หมอก" };
// สนาม Eos (GRID_PLAN §8.6) = "ด่าน 6" ของตัวคุมนี้ในโลก "eos": แผนที่เดียวทั้งแมตช์ (ไม่หมุนด่าน)
//  สภาพอากาศเกิดซ้ำได้ — สงบแล้วพัก EOS_WX_GAP เทิร์นก่อนสุ่มใหม่ · ชนิดสุ่มเท่ากัน
const EOS_STAGE = 6;
const EOS_WEATHER = ["eos_storm", "eos_fog"];
const EOS_WX_GAP = 2;
const FX_KEEP = 24; // เหตุการณ์ล่าสุดที่ส่งให้ client เล่นฉาก (seq เพิ่มเรื่อยๆ — client เล่นเฉพาะ seq ที่ยังไม่เคยเห็น)
// seq ของเหตุการณ์: เพิ่มอย่างเดียวตลอดอายุ server (ห้ามนับใหม่ต่อด่าน/แมตช์ — client จำ seq ที่เห็นแล้วข้ามแมตช์ → เอฟเฟคด่านถัดไปไม่ขึ้น)
//  เริ่มจากเวลาตอนเปิด server = รีสตาร์ท server แล้วยังมากกว่าเลขเดิมที่ client จำไว้
let FX_SEQ = Date.now();
Object.assign(module.exports, { STAGES, EOS_STAGE, EOS_WEATHER, EOS_WX_GAP, WEATHER_KINDS, WEATHER_TURNS, WEATHER_PCT, WEATHER_FROM, STAGE_NAMES, WEATHER_NAMES });

// โมดูลกติกาของแต่ละด่าน (โหลดตอนใช้ — ไฟล์ด่าน require ของใน server/ ได้โดยไม่วนตอนโหลด)
const MODS = {};
function modOf(stage) {
  if (!MODS[stage]) {
    try { MODS[stage] = require(`./fodlan/stage${stage}`); } catch (err) { console.error(`[fodlan] โหลด stage${stage} ไม่ได้:`, err); MODS[stage] = {}; }
  }
  return MODS[stage];
}

function inWorld() { return match.world === "fodlan" || match.world === "eos"; }
function isEos() { return match.world === "eos"; }
function active() { return inWorld() && !!match.fodlan && !!match.board && (Board.isFodlanArea(match.board.area) || Board.isEosArea(match.board.area)); }
function areaOf(stage) { return Board.FODLAN_AREA + stage - 1; }
function stageNow() { return match.fodlan ? match.fodlan.stage : 1; }
function weatherNow() { const w = match.fodlan && match.fodlan.weather; return w && w.left > 0 ? w : null; }
function stageState() { return match.fodlan ? match.fodlan.s : null; }

// สุ่มสภาพอากาศ (random ส่งเข้ามาได้ — เทสต์): ทุกจบเทิร์นตั้งแต่เทิร์น WEATHER_FROM − 1 ที่ยังไม่เคยเกิดในการมาเยือนนี้
function rollWeather(stage, random = Math.random) {
  return random() * 100 < WEATHER_PCT ? { kind: WEATHER_KINDS[stage], left: WEATHER_TURNS } : null;
}
function reset() {
  const first = isEos() ? EOS_STAGE : 1;
  match.fodlan = { stage: first, route: [first], weather: null, s: null };
}

// ---------- เครื่องมือกลางที่ส่งให้โมดูลด่าน ----------
//  ทุกฮุคได้ ctx ตัวเดียวกัน (สร้างใหม่ทุกครั้ง — ถูก) · ดู server/fodlan/README.md
function makeCtx() {
  const st = stageState();
  const ctx = {
    match, engine, Board, action, combat, Status, view, timers, Visibility: require("./visibility"),
    stage: stageNow(),
    weather: weatherNow(),
    rng: Math.random,
    log(msg) { match.lastLog.push(msg); },
    map() { return action.boardMap(); },
    units() { return action.boardUnits(); },
    alive() { return combat.alivePlayers().filter((p) => p.pos); },
    unitAt(x, y) { return Board.unitAt(action.boardUnits(), x, y); },
    free(x, y, selfId = null) {
      const map = action.boardMap();
      return Board.inBounds(map, x, y) && !Board.isObstacle(map, x, y, action.boardBlocked(selfId)) && !Board.unitAt(action.boardUnits().filter((u) => u.id !== selfId), x, y);
    },
    key: Board.key,
    // ชั้นแผนที่เปลี่ยน (เรือขยับ ไฟลาม …) → แผนที่ที่แคชไว้ใช้ไม่ได้แล้ว
    bump() { if (st) st.ver = (st.ver || 0) + 1; },
    // ความเสียหายจากสนาม (ลดเกราะก่อน · pierce = ทะลุเกราะ) แล้วตัดสินตาย — คืนความเสียหายที่ลงจริง
    damage(p, n, { pierce = false } = {}) {
      if (!p || !p.alive || !(n > 0)) return 0;
      const before = p.hp + (p.armor || 0);
      if (pierce) combat.dealDirect(p, n);
      else combat.dealMixed(p, n);
      const dealt = Math.max(0, before - (p.hp + (p.armor || 0)));
      ctx.settle(p);
      return dealt;
    },
    settle(p) {
      if (p && p.alive && p.hp <= 0) {
        combat.instantDeath(p);
        if (!p.alive) match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`);
      }
      if (p && !p.alive) p.pos = null;
    },
    burn(p, n = 1) { return p && p.alive ? Status.applyBurn(p, n) : false; },
    // ระยะตีปกติของ p ถึงช่อง (x, y) ไหม (ของบนกระดาน — แบบหนามน้ำแข็ง)
    inStrikeRange(p, x, y) {
      if (!p || !p.pos) return false;
      if (action.lanes(p)) return !!Board.laneOf(action.boardMap(), p.pos.x, p.pos.y, action.sizeOf(p), action.rangeOf(p), { x, y, size: 1 });
      return Board.inRange(action.rangeOf(p), Board.dist(action.boxOf(p), { x, y }));
    },
    adjacent(p, x, y) { return !!(p && p.pos) && Board.dist(action.boxOf(p), { x, y }) === 1; },
    // ใช้การตีของตานี้ทำอย่างอื่น (ตกปลา · ยิงเครื่องยิงหิน …) → พักให้ฉากเล่น secs วินาที แล้วจบตา (after = ทำก่อนจบตา)
    useStrike(p, secs = 1, after = null) {
      timers.clearPhaseTimer();
      match.action.locked = true;
      p.didAttackRound = true;
      match.gameState = "ATTACKING";
      timers.startPhaseTimer(Number(secs) > 0 ? secs : 1, () => {
        if (after) after();
        if (require("./phases/endTurn").gameOver()) return;
        action.finishActor();
      });
      view.broadcastState();
      return true;
    },
    // เหตุการณ์ให้ client เล่นฉาก (state.fodlan.board.fx) — { kind, …ข้อมูล } · คืน seq
    fx(kind, data = {}) {
      if (!st) return 0;
      st.fxSeq = ++FX_SEQ;
      (st.fx ||= []).push({ seq: st.fxSeq, kind, round: match.roundNumber, ...data });
      if (st.fx.length > FX_KEEP) st.fx.splice(0, st.fx.length - FX_KEEP);
      return st.fxSeq;
    },
    // ช่องว่างทั้งหมดบนกระดาน (เดินได้ ไม่มีคน) — ใช้สุ่มเป้าฟ้าผ่า/ธนู
    floorTiles({ includeUnits = true } = {}) {
      const map = action.boardMap();
      const out = [];
      for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
        if (Board.isObstacle(map, x, y)) continue;
        if (!includeUnits && Board.unitAt(action.boardUnits(), x, y)) continue;
        out.push({ x, y });
      }
      return out;
    },
    pick(list, n) {
      const a = list.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a.slice(0, Math.max(0, n));
    },
  };
  return ctx;
}
// เรียกฮุค name ของด่านปัจจุบัน (ไม่มี/ไม่ได้อยู่ในด่าน = fallback) — error ในฮุคห้ามทำเกมพัง
function call(name, fallback, ...args) {
  if (!active()) return fallback;
  const mod = modOf(stageNow());
  const fn = mod && mod[name];
  if (typeof fn !== "function") return fallback;
  try { return fn(makeCtx(), stageState(), ...args); }
  catch (err) { console.error(`[fodlan] stage${stageNow()}.${name} โยน error — ข้าม:`, err); return fallback; }
}
// ผลค้างทั้งแมตช์ (ข้ามด่าน — ชีพจรเทพ / ศิลาตราที่ถือ / ร่างอสูร ของด่าน V): โมดูลด่าน export `persist: { ฮุค(ctx, st, …) }`
//  ถามทุกด่านที่มีฮุคนั้น ไม่ว่าตอนนี้อยู่ด่านไหน · st = สถานะของด่านนั้นถ้ากำลังอยู่ด่านนั้น ไม่งั้น null · เก็บสถานะเองที่ match.fodlan
//  คืนผลของทุกด่านเป็น array
function persistAll(name, ...args) {
  if (!active()) return [];
  const out = [];
  for (const s of isEos() ? [EOS_STAGE] : [1, 2, 3, 4, 5]) {
    const mod = modOf(s), fn = mod.persist && mod.persist[name];
    if (typeof fn !== "function") continue;
    try { out.push(fn(makeCtx(), s === stageNow() ? stageState() : null, ...args)); }
    catch (err) { console.error(`[fodlan] stage${s}.persist.${name} โยน error — ข้าม:`, err); }
  }
  return out;
}
const sumOf = (list) => list.reduce((a, v) => a + (Number(v) || 0), 0);

// เข้าด่าน (เริ่มแมตช์ / เปลี่ยนด่าน): สถานะใหม่ของการมาเยือน → ฮุค enter
function enterStage() {
  match.fodlan.s = { ver: 0, fx: [], fxSeq: 0, weather: match.fodlan.weather, wxDone: !!match.fodlan.weather };
  call("enter", undefined);
}

// เริ่มแมตช์ในสนาม Fodlan (lobby.startMatch)
function start() {
  reset();
  action.placeOnBoard(areaOf(stageNow()));
  enterStage();
  // dev: ECHO_DEV_EOS_WEATHER=eos_storm|eos_fog = สนาม Eos เริ่มพร้อมสภาพอากาศนั้น (ดูภาพ/เสียง)
  const devWx = process.env.ECHO_DEV_EOS_WEATHER;
  if (isEos() && EOS_WEATHER.includes(devWx)) startWeather(devWx);
}
// ด่านถัดไป: 2–5 ไม่ซ้ำด่านที่อยู่ตอนนี้ (ด่าน I เป็นจุดเริ่มต้นเท่านั้น — แบบการเดินทางของ Origin)
function pickNext(from, random = Math.random) {
  const pool = [];
  for (let s = 2; s <= STAGES; s++) if (s !== from) pool.push(s);
  return pool[Math.floor(random() * pool.length)];
}

// จบเทิร์น: ฮุคของด่าน → สภาพอากาศนับเวลาลง → ยังไม่เคยเกิดในการมาเยือนนี้ = สุ่มใหม่สำหรับเทิร์นหน้า
//  (เรียกก่อน maybeAdvance — เทิร์นสุดท้ายของด่านไม่สุ่ม เพราะด่านใหม่สุ่มเอง) · เกิดแล้ว 1 ครั้ง = รอด่านถัดไป
function onEndTurn(random = Math.random) {
  if (!active()) return;
  call("onEndTurn", undefined);
  persistAll("onEndTurn");
  const w = match.fodlan.weather;
  if (w && w.left > 0) {
    w.left -= 1;
    if (w.left <= 0) {
      match.lastLog.push(`🌤️ ${WEATHER_NAMES[w.kind]} สงบลงแล้ว`);
      if (match.fodlan.s) match.fodlan.s.wxEnded = Zero.worldRound();
      call("weatherEnd", undefined);
      return; // เทิร์นที่เพิ่งสงบไม่สุ่มใหม่
    }
  }
  const st = stageState();
  const round = Zero.worldRound();
  if (isEos()) {
    // Eos: ไม่มีอากาศอยู่ + ผ่านเทิร์นแรก + พักครบหลังครั้งก่อนสงบ → สุ่ม
    if (!st || weatherNow() || round < WEATHER_FROM - 1 || (st.wxEnded && round - st.wxEnded < EOS_WX_GAP)) return;
    if (random() * 100 < WEATHER_PCT) startWeather(EOS_WEATHER[Math.floor(random() * EOS_WEATHER.length) % EOS_WEATHER.length]);
    return;
  }
  if (!st || st.wxDone || Journey.legEnds(round, match.legStart) || Journey.turnInArea(round, match.legStart) < WEATHER_FROM - 1) return;
  if (rollWeather(match.fodlan.stage, random)) startWeather();
}
// สภาพอากาศของด่านปัจจุบันเริ่มตอนนี้ (อยู่ WEATHER_TURNS เทิร์น) → ฮุค weatherStart ของด่าน (กองไฟดับ …) · เทสต์เรียกตรงได้
function startWeather(kind = null) {
  const st = stageState();
  if (!active() || !st) return;
  const nw = { kind: kind || (isEos() ? EOS_WEATHER[0] : WEATHER_KINDS[match.fodlan.stage]), left: WEATHER_TURNS };
  match.fodlan.weather = nw;
  st.weather = nw;
  st.wxDone = true;
  match.lastLog.push(`⛈️ เกิด${WEATHER_NAMES[nw.kind]}! (${WEATHER_TURNS} เทิร์น)`);
  call("weatherStart", undefined);
}

// จบด่าน (ครบ 6 เทิร์น) → สุ่มด่านถัดไป → พักเกม CUTSCENE ให้ client เล่นฉากเปลี่ยนแผนที่ (fodlan/FodlanTravel.jsx)
//  คืน true = จัดการแล้ว (ผู้เรียกหยุด) · startTimer = พักเฟสแล้วแจกไพ่ (phases/endTurn.js)
function maybeAdvance(startTimer, random = Math.random) {
  if (isEos() || Zero.active() || !active() || !Journey.legEnds(Zero.worldRound(), match.legStart)) return false;
  const st = match.fodlan;
  const from = st.stage;
  call("leave", undefined); // ฮุคของด่านที่กำลังออก (หลุมศพ: ศิลาตราหาย)
  const to = pickNext(from, random);
  const route = [...st.route];
  st.stage = to;
  st.route.push(to);
  st.weather = null; // สภาพอากาศของด่านใหม่สุ่มตอนจบเทิร์น (onEndTurn)
  match.journeyScene = { seq: ++match.journeySceneSeq, active: true, mode: "advance", area: to, fromArea: from, route };
  match.lastLog.push(`🗺️ ออกเดินทางต่อ — มุ่งหน้าสู่ด่าน ${to} ${STAGE_NAMES[to]}`);
  action.placeOnBoard(areaOf(to)); // แผนที่ใหม่ → ทุกคนกลับไปยืนจุดเกิด
  enterStage();
  startTimer();
  return true;
}

// ---------- จุดเสียบเข้า engine (ดูตารางใน server/fodlan/README.md) ----------
// ชั้นแผนที่ของด่าน (action.boardMap → layeredMap) — คืน map ใหม่ (ไม่มีฮุค = เดิม)
function mapLayer(map) { return call("layer", map, map) || map; }
function layerVer() {
  if (!active()) return "";
  const st = stageState();
  const extra = call("layerVer", "");
  return `f${stageNow()}.${st ? st.ver || 0 : 0}${extra ? `.${extra}` : ""}`;
}
// ต้นเทิร์น (phases/draw.js dealRound — ก่อนแจกไพ่): เหตุการณ์ของด่าน · คืน true = พักเกมให้เล่นฉากแล้ว (resume ต่อเมื่อครบเวลา)
function preRound(resume) {
  if (!active()) return false;
  const st = stageState();
  const turn = match.roundNumber + 1;
  if (!st || st.preRoundDone === turn) return false;
  st.preRoundDone = turn;
  const secs = Number(call("preRound", 0)) || 0;
  if (!(secs > 0)) return false;
  match.cutsceneInfo = null;
  match.gameState = "CUTSCENE";
  timers.startPhaseTimer(Math.min(10, secs), resume);
  view.broadcastState();
  return true;
}
function onUnitEnd(p) { call("onUnitEnd", undefined, p); }
// ปุ่ม HUD ของเจ้าตัว (view.js) — key ขึ้นต้น "fd:" เสมอ
function hudActions(p) {
  if (!active() || !p || !p.alive || !p.pos) return [];
  const list = call("hudActions", [], p) || [];
  return list.filter((a) => a && typeof a.key === "string" && a.key.startsWith("fd:"));
}
// socket charAction (key "fd:…") → ฮุคของด่าน · ฮุคบรอดแคสต์เองหรือคืน true แล้วที่นี่บรอดแคสต์ให้
function charAction(id, key, tile) {
  const p = match.players[id];
  if (!active() || !p || !p.alive) return false;
  const ok = combat.withEffectSource(p, () => call("charAction", false, p, key, tile));
  if (ok && match.gameState === "ACTION") view.broadcastState();
  return !!ok;
}
// ของบนกระดานของด่าน (ตีได้ = strike: true) — id "fd:…"
function objects() { return call("objects", []) || []; }
function objectOf(id) { return objects().find((o) => o && o.id === id) || null; }
function canHitObject(p, id) {
  const o = objectOf(id);
  return !!(o && o.strike && action.canAct(p) && makeCtx().inStrikeRange(p, o.x, o.y));
}
// ตีปกติใส่ของของด่าน → วินาทีของฉาก (false = ตีไม่ได้) · action.strikeTarget จัดการล็อกตา/จบตา
function strikeObject(p, id) {
  if (!canHitObject(p, id)) return false;
  const secs = call("strikeObject", false, p, id);
  return secs === false ? false : Math.max(0.6, Number(secs) || 1);
}
function movMod(p) { return Number(call("movMod", 0, p)) || 0; }
// เดินผ่านช่องที่กินหลายก้าวได้ 1 ก้าว (Board.reachable opts.flatWalk — Eos: ขี่โชโกโบะ)
function flatWalk(p) { return !!call("flatWalk", false, p); }
// ขับรถอยู่ (สนาม Eos): ไปได้แค่ถนน/พื้นเรียบ — Board.reachable opts.carWalk (ป่าทึบ น้ำตื้น น้ำแข็ง ช่องโชโกโบะ = เข้าไม่ได้)
function carWalk(p) { return active() && !!call("carWalk", false, p); }
// ระบบขี่ (server/ride.js): t ขับรถอยู่ = จำนวนที่นั่งผู้โดยสาร · carDriver = ตัวที่ถูกขี่เป็นรถ (ถูกตีแล้วผู้โดยสารไม่ร่วง)
function carSeats(p, t) { return active() ? Number(call("carSeats", 0, p, t)) || 0 : 0; }
function carDriver(p) { return active() && !!call("carDriver", false, p); }
// สนาม Eos: ฝ่ายที่ครบแต้มยึดเสา → id ผู้เล่นของฝ่ายนั้น (phases/endTurn.js gameOver) · null = ยังไม่มี
// เป้านี้ถูกป้องกันจากผู้ตีคนนี้ไหม (Eos: โดมกำแพงเวท — ตีจากนอกโดมเข้าไปไม่ได้) → action.canStrike / targetOk
function shields(attacker, target) { return !!call("shields", false, attacker, target); }
function eosWinner() { return isEos() ? call("winner", null) || null : null; }
function atkBonus(p) { return (Number(call("atkBonus", 0, p)) || 0) + sumOf(persistAll("atkBonus", p)); }
function preventDeath(p) { return !!call("preventDeath", false, p) || persistAll("preventDeath", p).some(Boolean); }
// เลือดสูงสุดเพิ่ม (combat.maxHpOf) — ร่างอสูรศิลาตรา +5
function maxHpBonus(p) { return p && !p.summon ? sumOf(persistAll("maxHpBonus", p)) : 0; }
function hides(viewer, target) { return !!call("hides", false, viewer, target); }
function vision(viewer) { const v = call("vision", null, viewer); return Array.isArray(v) ? v : null; }
function playerInfo(p) {
  if (!active()) return undefined;
  const own = call("playerInfo", undefined, p) || undefined;
  const extra = persistAll("playerInfo", p).filter(Boolean); // ผลค้างข้ามด่าน → ต่อ badges
  if (!extra.length) return own;
  const out = { ...(own || {}) };
  for (const e of extra) for (const [k, v] of Object.entries(e)) {
    if (k === "badges") out.badges = [...(out.badges || []), ...(Array.isArray(v) ? v : [])];
    else if (!(k in out)) out[k] = v;
  }
  return out;
}

// ข้อมูลที่ส่งให้ client (state.fodlan) — null = ไม่ได้อยู่ในสนาม Fodlan
function publicInfo() {
  if (!inWorld() || !match.fodlan) return null;
  const st = match.fodlan;
  const scene = match.journeyScene;
  const w = weatherNow();
  const round = Zero.worldRound();
  const s = st.s;
  return {
    stage: st.stage,
    name: STAGE_NAMES[st.stage],
    weather: w ? { kind: w.kind, left: w.left } : null,
    turnsLeft: Journey.AREA_TURNS - Journey.turnInArea(round, match.legStart) + 1,
    route: [...st.route],
    scene: scene ? { seq: scene.seq, active: !!scene.active, mode: scene.mode, stage: scene.area, fromStage: scene.fromArea } : null,
    // ของด่านปัจจุบัน: ข้อมูลวาด (ฮุค publicInfo) + ของที่ตีได้ + เหตุการณ์ล่าสุด
    board: active() && s ? {
      ...(call("publicInfo", {}) || {}),
      objects: objects().map((o) => ({ ...o })),
      fx: (s.fx || []).slice(),
    } : null,
  };
}

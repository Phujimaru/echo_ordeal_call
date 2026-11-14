// ============================================================
//  โหมด Road Trip (GRID_PLAN §8.8 · สัญญากลาง .claude/plans/roadtrip-contract.md) — ตัวคุมกลาง
//  match.world = match.gameMode = "roadtrip" · ความยาก match.rtDiff · สถานะทั้งหมดอยู่ที่ match.roadtrip (รีเซ็ตทุกแมตช์)
//
//  วงจร (rt.phase): intro → drive ⇄ (fork → gas/motel = stop · fight/elite = combat · event) · boss ทุก 50 กม. → … → over
//   - ช่วงเดินทาง (intro/drive/fork/event/stop) gameState = "ROADTRIP": ไม่มีการ์ด ไม่มีตาเดิน ไม่มีเทิร์น
//     → เวลาของระบบต่อสู้หยุดนิ่งทั้งหมด (กฎผู้ใช้ 2026-11-14): สถานะ/คูลดาวน์/บัฟ/ยูนิตที่ถูกเรียก/ฮุคต้นเทิร์น-จบเทิร์น/กลางวัน-กลางคืนเดิม
//       นับเฉพาะใน dealRound/endTurn ซึ่งไม่ถูกเรียกเลยนอกการต่อสู้ — เข้าสู้ครั้งถัดไปก็นับต่อจากเดิม (match.roundNumber ไม่ขยับระหว่างทาง)
//     → ห้ามใช้สกิล/ท่าไม้ตาย/ตี/ปุ่มตัวละคร (socket.js ด่าน RT.blocksCombatCmd) — ร้าน/ไอเทมที่จุดพักยังได้
//   - combat = วงจรเดิม (PLAYING → ORDER → ACTION …) บนกระดานถนน/บนรถตู้ · จบสู้ = ตัดฉากที่ค้างทั้งหมด + fx { k: "combatEnd" }
//  ไฟล์ย่อย: diff (ความยาก) · van (รถตู้/อัปเกรด/ตัวกรอง) · route (ภูมิภาค/ทางแยก) · drive (ขับเรียลไทม์) · events (เหตุการณ์ถนน)
//   · stop (ปั๊ม/โมเต็ล เดินอิสระ กิจกรรม) · fight (เริ่ม/จบการต่อสู้ ถนนเลื่อน ป้อมปืน) · mobs (มอน + AI) · maps (แผนที่ — ผู้ช่วยอีกคน)
// ============================================================
Object.assign(module.exports, {
  inWorld, active, phase, inCombat, traveling, start, reset, stopAll, publicInfo, command, blocksCombatCmd, blocksDeal,
  preRound, onEndTurn, outcome, onMobDeath, rangeMod, areaRangeMod, freeShop, isNight, settle, touchesVan, hurtVan, fx, setPhase, toDrive,
  lose, mapDef, realPlayers, livePlayers, awake, payTeam, teamGold, giveGoldAll, raise, broadcast, bagBonus, cancelCombatFlow,
  leaderboard, applyDev, presenceChanged, crew, offVan, onUnitEnd, placeSpot,
});

const match = require("../match");
const Board = require("../board");
const Maps = require("./maps");
const { DIFF, DIFFS, diffOf } = require("./diff");
const Van = require("./van");
const Route = require("./route");

const H = {
  timers: () => require("../timers"), view: () => require("../view"), combat: () => require("../combat"), action: () => require("../phases/action"),
  draw: () => require("../phases/draw"), shop: () => require("../shop"), summon: () => require("../summon"),
  drive: () => require("./drive"), events: () => require("./events"), stop: () => require("./stop"), fight: () => require("./fight"), mobs: () => require("./mobs"),
};

const SECS = { intro: 8, fork: 15, event: 20, gas: 150, motel: 60, eventResult: 3, combatIntro: 2.8, bossIntro: 4.5 }; // intro/combatIntro/bossIntro = เวลาให้ฉากเปลี่ยนฝั่ง client เล่นจบ (RtTransitions)
const FX_KEEP = 20;
const START_GOLD = 5;
let FX_SEQ = Date.now(); // เพิ่มอย่างเดียวตลอดอายุ server (client จำ key ที่เล่นแล้ว)
Object.assign(module.exports, { SECS });

function inWorld() { return match.world === "roadtrip"; }
function active() { return inWorld() && !!match.roadtrip; }
function phase() { return active() ? match.roadtrip.phase : null; }
function inCombat() { return phase() === "combat"; }
function traveling() { const ph = phase(); return !!ph && ph !== "combat" && ph !== "over"; }
function mapDef(area = match.board && match.board.area) { return Maps.defs[area] || null; }
function isNight() { return active() && !!match.roadtrip.night; }
function realPlayers() { return Object.values(match.players).filter((p) => !p.summon && !p.duoOf); }
function livePlayers() { return realPlayers().filter((p) => p.alive); }
// คนที่ยังต่ออยู่ (โหวต/พร้อม) — หลุดแล้วไม่ต้องรอ
// ทุกตัวของผู้เล่น (รวมตัวที่สองของระบบคู่ — เคท & เอมิลิโกะ) ไม่รวมยูนิตที่ถูกเรียก — ใช้ฟื้น/ฮีลทั้งทีม
function crew() { return Object.values(match.players).filter((p) => !p.summon); }
function awake() { return realPlayers().filter((p) => p.connected !== false); }

function fresh(diff) {
  const van = Van.newVan();
  return {
    phase: "intro", endsAt: null, diff, km: 0, legKm: 0, legs: 0, nextBossKm: Route.BOSS_KM,
    region: Route.regionAt(0), night: false,
    van, hazards: [], hzSeq: 0, hzNextAt: 0, nitroUntil: 0, steerAt: 0,
    fork: null, event: null, stop: null, combat: null, after: null,
    radio: { src: "synth", station: 0, yt: null, by: null }, // ออกเดินทางมาพร้อมเพลง (สถานีป๊อป)
    fx: [], summary: null, kills: 0, gold: 0, stops: 0, fights: 0,
    buffs: {}, dog: { fed: 0, lastStop: -1, on: false }, reveal: null, deaths: 0,
  };
}
function reset() { stopAll(); match.roadtrip = null; }
// หยุดทุกตัวจับเวลาของโหมด (ขับเรียลไทม์) — เรียกตอนจบเกม/กลับห้องรอ/เริ่มแมตช์ใหม่
function stopAll() { H.drive().stopTick(); }

// ---------- เริ่มแมตช์ (lobby.startMatch) ----------
//  introHold = เวลาฉากเปิดตัวผู้เล่น (ม่าน MatchIntro) · 0 = ไม่มีฉาก (เทสต์ — JOURNEY_START_SECONDS=0)
function start(introHold = 0) {
  stopAll();
  const envDiff = process.env.ECHO_DEV_RT_DIFF;
  const diff = DIFFS.includes(envDiff) ? envDiff : DIFFS.includes(match.rtDiff) ? match.rtDiff : "normal";
  match.rtDiff = diff;
  match.roadtrip = fresh(diff);
  const rt = match.roadtrip;
  match.board = null;
  H.action().placeOnBoard(Maps.RT_ROAD); // ตำแหน่งจริงตอนขับไม่มีผล — กระดานพร้อมให้ view
  H.shop().clearShops();
  for (const p of realPlayers()) H.shop().addGold(p, START_GOLD); // ทุนตั้งต้น (เติมน้ำมัน/ซ่อมรถครั้งแรก)
  match.lastLog.push(`🚐 ออกเดินทาง! (${({ easy: "ง่าย", normal: "ปกติ", hard: "ยาก" })[diff]})`);
  fx("tripStart", { diff });
  const km = Math.max(0, Math.floor(Number(process.env.ECHO_DEV_RT_KM) || 0));
  if (km) { rt.km = km; rt.legKm = km; rt.nextBossKm = (Math.floor(km / Route.BOSS_KM) + 1) * Route.BOSS_KM; syncRoute(rt); }
  const secs = introHold > 0 ? introHold + SECS.intro : 0;
  if (secs > 0) setPhase("intro", secs, () => applyDev() || toDrive());
  else if (!applyDev()) toDrive();
}
// dev: ECHO_DEV_RT_PHASE = drive|fork|event|stop|motel|ambush|onvan|boss — ข้ามไปช่วงนั้นทันทีหลังฉากเปิด
function applyDev(ph = process.env.ECHO_DEV_RT_PHASE) {
  if (!ph || !active()) return false;
  const rt = match.roadtrip;
  if (rt.devDone) return false;
  rt.devDone = true;
  if (ph === "drive") return false;
  if (ph === "fork") { H.drive().openFork(); return true; }
  if (ph === "event") { H.events().open(); return true; }
  if (ph === "stop" || ph === "gas") { H.stop().enter("gas"); return true; }
  if (ph === "motel") { H.stop().enter("motel"); return true; }
  if (ph === "ambush" || ph === "onvan" || ph === "boss" || ph === "elite") { H.fight().begin(ph); return true; }
  return false;
}
function syncRoute(rt) {
  const reg = Route.regionAt(rt.km);
  if (reg.id !== rt.region.id || reg.loop !== rt.region.loop) {
    rt.region = reg;
    fx("region", { id: reg.id, loop: reg.loop });
    match.lastLog.push(`🗺️ เข้าสู่${Route.REGION_NAMES[reg.id]}${reg.loop ? ` (รอบ ${reg.loop + 1})` : ""}`);
  }
  const night = Route.nightAt(rt.km);
  if (night !== rt.night) { rt.night = night; fx(night ? "night" : "day", {}); }
}
Object.assign(module.exports, { syncRoute });

// ---------- ช่วง (phase) ----------
//  secs > 0 = ตั้งตัวจับเวลา (timers.startPhaseTimer — ตัวเดียวของเกม · client นับถอยหลังจาก timeLeft) · endsAt สำหรับ client
function setPhase(name, secs, onExpire) {
  const rt = match.roadtrip;
  if (!rt) return;
  if (name !== "drive") { H.drive().stopTick(); rt.hazards = []; rt.nitroUntil = 0; } // สิ่งกีดขวาง/ไนตรัสค้างไม่ข้ามช่วง (กลับมาขับแล้วไม่โดนชนรวดเดียว)
  rt.phase = name;
  const timers = H.timers();
  timers.clearPhaseTimer();
  if (name !== "combat") { match.gameState = name === "over" ? "GAMEOVER" : "ROADTRIP"; match.actorId = null; match.action = null; }
  if (secs > 0 && onExpire) {
    rt.endsAt = Date.now() + Math.round(secs * 1000);
    timers.startPhaseTimer(secs, () => { if (active() && rt === match.roadtrip && rt.phase === name) onExpire(); });
  } else { rt.endsAt = null; match.timeLeft = 0; }
}
function toDrive() {
  const rt = match.roadtrip;
  if (!rt || rt.phase === "over") return;
  rt.fork = null; rt.event = null; rt.stop = null; rt.combat = null;
  rt.legKm = rt.km;
  rt.hzNextAt = Date.now() + 4000; // กลับมาขับ: สิ่งกีดขวางชิ้นแรกไม่ก่อน 4 วิ (ฉากชนะ/ออกจากปั๊มยังเล่นอยู่)
  setPhase("drive", 0);
  H.drive().startTick();
  broadcast();
}

// ---------- fx (เหตุการณ์ชั่วคราวให้ client เล่น — key เพิ่มอย่างเดียว) ----------
function fx(k, data = {}) {
  const rt = match.roadtrip;
  if (!rt) return 0;
  const key = ++FX_SEQ;
  rt.fx.push({ k, key, ...data });
  if (rt.fx.length > FX_KEEP) rt.fx.splice(0, rt.fx.length - FX_KEEP);
  return key;
}
function broadcast() { H.view().broadcastState(); }

// ---------- รถตู้ ----------
function hurtVan(n, why = "hit", by = null) {
  const rt = match.roadtrip;
  if (!rt || !(n > 0) || rt.phase === "over") return 0;
  const dealt = Math.min(rt.van.hp, Math.round(n));
  rt.van.hp = Math.max(0, rt.van.hp - dealt);
  fx("vanHit", { dmg: dealt, why, by });
  if (rt.van.hp <= 0) rt.vanDead = true;
  return dealt;
}
// ช่องนี้ติดรถตู้ไหม (กระดานถนน: vanBlock · บนรถ: ขอบนอกของช่องในรถ)
function touchesVan(pos) {
  const d = mapDef();
  if (!d || !pos) return false;
  if (d.vanBlock) { const b = d.vanBlock; const dx = Math.max(b.x0 - pos.x, 0, pos.x - b.x1), dy = Math.max(b.y0 - pos.y, 0, pos.y - b.y1); return dx + dy === 1; }
  if (d.vanTiles) { const set = new Set(d.vanTiles.map(([x, y]) => Board.key(x, y))); return !set.has(Board.key(pos.x, pos.y)) && Board.DIRS.some(([dx, dy]) => set.has(Board.key(pos.x + dx, pos.y + dy))); }
  return false;
}

// ---------- เงินทีม ----------
function teamGold() { return realPlayers().reduce((s, p) => s + (p.gold || 0), 0); }
// จ่ายจากทั้งทีม (คนที่มีเยอะสุดก่อน) → สำเร็จไหม
function payTeam(n) {
  if (!(n > 0)) return true;
  const list = realPlayers().sort((a, b) => (b.gold || 0) - (a.gold || 0));
  if (list.reduce((s, p) => s + (p.gold || 0), 0) < n) return false;
  let left = n;
  for (const p of list) { const take = Math.min(left, p.gold || 0); p.gold -= take; left -= take; if (!left) break; }
  return true;
}
function giveGoldAll(n) {
  if (!(n > 0)) return 0;
  let got = 0;
  for (const p of realPlayers()) got += H.shop().addGold(p, n);
  match.roadtrip.gold += got;
  return got;
}

// ---------- ตาย/ฟื้น ----------
function settle(p) {
  const combat = H.combat();
  if (p && p.alive && p.hp <= 0) {
    combat.instantDeath(p);
    if (!p.alive) match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`);
  }
  if (p && !p.alive) { p.pos = null; if (!p.summon && match.roadtrip) match.roadtrip.deaths++; }
}
// ฟื้นผู้เล่นที่ล้ม (hpFrac = สัดส่วนเลือด) — ล้างสถานะเฉพาะตัวแบบเกิดใหม่ (combat.respawnReset · แบบ Eos raise) · ไม่วางบนกระดาน (pos = spot)
function raise(p, hpFrac = 0.5, spot = null) {
  if (!p || p.alive || p.summon) return false;
  const combat = H.combat();
  p.alive = true; p.result = null; p.locked = false;
  p.statuses = {}; p.statusAmt = {};
  p.shield = 0; p.tempHp = 0; p.tempHpTurns = 0; p.mountId = null; p.wasAttacked = false; p.corpse = null; p.boardSize = 1;
  if (combat.respawnReset) combat.respawnReset(p);
  p.hp = Math.max(1, Math.min(combat.maxHpOf(p), Math.ceil(combat.maxHpOf(p) * hpFrac)));
  p.armor = combat.maxArmorOf(p);
  p.pos = spot ? { ...spot } : null;
  fx("revive", { id: p.id });
  match.lastLog.push(`✨ ${p.name} ฟื้นคืนชีพ!`);
  return true;
}

// ---------- จบเกม ----------
function lose(reason = "van") {
  const rt = match.roadtrip;
  if (!rt || rt.phase === "over") return true;
  if (rt.phase === "combat") fx("combatEnd", { kind: rt.combat ? rt.combat.kind : null, win: false }); // client หยุดเสียง/วีดีโอท่าไม้ตายที่ค้าง
  cancelCombatFlow();
  H.summon().removeAll();
  const best = recordBest(rt);
  rt.summary = { km: Math.floor(rt.km * 10) / 10, kills: rt.kills, gold: rt.gold, region: rt.region.id, loop: rt.region.loop, diff: rt.diff, reason, stops: rt.stops, fights: rt.fights, best: best.best, newBest: best.newBest };
  fx("over", { reason });
  match.lastLog.push(reason === "van" ? `💥 รถตู้พัง — การเดินทางจบที่ ${rt.summary.km} กม.` : `🪦 ทุกคนล้ม — การเดินทางจบที่ ${rt.summary.km} กม.`);
  match.winningTeamId = null;
  setPhase("over", 0);
  match.gameState = "GAMEOVER";
  match.timeLeft = 0;
  broadcast();
  return true;
}
// ตัดทุกลำดับการต่อสู้ที่ค้าง (ฉากท่าไม้ตาย/คิวคัตซีน/พักจบเทิร์น/QTE/หยุดเวลา/Clock Up/ดวล/มินิเกม) — จบสู้/จบเกม
function cancelCombatFlow() {
  H.timers().clearPhaseTimer();
  Object.assign(match, {
    cutsceneQueue: [], cutsceneInfo: null, endTurnHold: 0, endTurnHoldStart: null, afterCutscene: null,
    clockUp: null, extraTurns: [], timeFreeze: null, tsSnap: null, tsTurn: null, flowWanted: false, flowHandoff: null,
    dash: null, skillBeats: [], lastAttack: null, duo: null, rideAsk: null, hitFxHold: null, voiceHold: null,
    actorId: null, action: null, turnOrder: [], actorIndex: -1, yukiBoom: null, arjunaUlt: null, forcedWinnerId: null,
  });
  for (const p of Object.values(match.players)) {
    p.qte = null;
    if (p.freddy) p.freddy.door = null;
    if (p.dio) Object.assign(p.dio, { duel: null, duelPending: false, duelFoe: null, stopping: false, pending: 0 });
    p.locked = true;
  }
}

// ---------- กระดานผู้นำ (กม. สูงสุดต่อความยาก) ----------
//  เก็บไฟล์ JSON แบบ server/charStats.js: ECHO_RT_FILE · ไม่ตั้ง = data/roadtrip-best.json · ระหว่างเทสต์ = หน่วยความจำอย่างเดียว
const fs = require("fs");
const path = require("path");
const BEST_FILE = path.join(__dirname, "..", "..", "data", "roadtrip-best.json");
const bestFile = () => process.env.ECHO_RT_FILE || (process.env.NODE_TEST_CONTEXT ? null : BEST_FILE);
let BEST = null;
function leaderboard() {
  if (BEST) return BEST;
  BEST = { easy: [], normal: [], hard: [] };
  const f = bestFile();
  if (f) { try { const raw = JSON.parse(fs.readFileSync(f, "utf8")); for (const d of DIFFS) if (Array.isArray(raw[d])) BEST[d] = raw[d].slice(0, 10); } catch { /* ยังไม่มีไฟล์ */ } }
  return BEST;
}
function recordBest(rt) {
  const lb = leaderboard();
  const list = lb[rt.diff] || (lb[rt.diff] = []);
  const km = Math.floor(rt.km * 10) / 10;
  const prev = list.length ? list[0].km : 0;
  list.push({ km, names: realPlayers().map((p) => p.name).slice(0, 6), at: Date.now() });
  list.sort((a, b) => b.km - a.km);
  list.splice(10);
  const f = bestFile();
  if (f) { try { fs.mkdirSync(path.dirname(f), { recursive: true }); const tmp = `${f}.tmp`; fs.writeFileSync(tmp, JSON.stringify(lb, null, 2)); fs.renameSync(tmp, f); } catch (err) { console.error("[roadtrip] บันทึกกระดานผู้นำไม่ได้:", err.message); } }
  return { best: Math.max(prev, km), newBest: km > prev };
}

// ---------- ฮุคเข้า engine ----------
// มีคนหลุด/ออก (socket.js): โหวต/พร้อมที่เหลือแต่คนที่หลุด = ตัดสินเลย ไม่ต้องรอหมดเวลา · ไม่เหลือใครต่ออยู่ = หยุดทุกตัวจับเวลา
function presenceChanged() {
  if (!active()) return;
  const rt = match.roadtrip, list = awake();
  if (!Object.keys(match.players).length) { reset(); return; }
  if (!list.length) return; // ตอนนี้ไม่มีใครต่ออยู่ — ช่วงขับหยุดรอ (drive.step) · ช่วงอื่นรอตัวจับเวลา
  if (rt.phase === "fork" && rt.fork && list.every((o) => rt.fork.votes[o.id] != null)) H.drive().resolveFork();
  else if (rt.phase === "event" && rt.event && !rt.event.result && list.every((o) => rt.event.votes[o.id] != null)) H.events().resolve();
  else if (rt.phase === "stop" && rt.stop && list.every((o) => rt.stop.ready[o.id])) H.stop().leave();
}
function blocksCombatCmd() { return active() && phase() !== "combat"; } // socket.js: สกิล/ท่าไม้ตาย/ตี/ปุ่มตัวละคร นอกการต่อสู้
function blocksDeal() { return active() && phase() !== "combat"; }      // draw.dealRound: ไม่แจกไพ่นอกการต่อสู้ (ตัวจับเวลาเก่าค้าง)
function preRound(resume) { return active() && inCombat() ? H.fight().preRound(resume) : false; }
function onEndTurn() { if (active() && inCombat()) H.fight().onEndTurn(); }
// phases/endTurn.js gameOver → true = จัดการแล้ว (จบสู้ → ขับต่อ หรือ แพ้)
function outcome() { return active() ? H.fight().outcome() : false; }
function onMobDeath(m, killerId) { if (active()) H.fight().onMobDeath(m, killerId); }
// ระยะตีปกติ: ประตูท้ายเปิด + ยืนแถวท้ายรถ = +1
function rangeMod(p, r) {
  if (!active() || !inCombat() || !p || !p.pos || p.summon || !Array.isArray(r)) return r;
  const rt = match.roadtrip, d = mapDef();
  if (!rt.van.rearOpen || !d || !d.rearTiles || !d.rearTiles.some(([x, y]) => x === p.pos.x && y === p.pos.y)) return r;
  return [r[0], r[1] + 1];
}
// ระยะสกิล (area.range ตัวเลข ≥ 1): ประตูท้ายเปิด + ยืนแถวท้ายรถ = +1 (ผู้ใช้ 2026-11-14 "ท่าระยะถึง สกิลถึง")
function areaRangeMod(p, n) { return n >= 1 ? rangeMod(p, [0, n])[1] : n; }
// ร้านที่จุดพัก: ซื้อได้นอกตาเดิน (ยืนติดร้าน · ยังมีชีวิต)
// สู้บนรถตู้: ช่องนอกรถห้ามฝั่งผู้เล่น (action.boardBlocked) · จบตาของแต่ละตัว = เช็คร่วง (action.endUnitTile)
function offVan(selfId) { return active() && inCombat() ? H.fight().offVan(selfId) : null; }
function onUnitEnd(p) { if (active() && inCombat() && p && p.alive && p.pos) H.fight().enforceVan(); }
function placeSpot(near, selfId = null) { return active() && inCombat() ? H.fight().placeSpot(near, selfId) : null; }
function freeShop(p) { return active() && phase() === "stop" && !!p && p.alive && !!p.pos && !p.summon; }
function bagBonus() { return active() ? Van.bagBonus(match.roadtrip.van) : 0; }

// ---------- คำสั่งผู้เล่น (socket rt:*) ----------
function command(id, name, payload) {
  if (!active()) return false;
  const p = match.players[id];
  if (!p || p.summon) return false;
  const o = payload && typeof payload === "object" ? payload : {};
  const rt = match.roadtrip;
  if (rt.phase === "over") return false;
  let ok = false;
  switch (name) {
    case "seat": case "steer": case "nitro": case "horn": ok = H.drive().command(p, name, o); break;
    case "vote": ok = H.drive().vote(p, o.i); break;
    case "event": ok = H.events().vote(p, o.key); break;
    case "walk": case "act": case "ready": case "use": ok = H.stop().command(p, name, o); break;
    case "upg": ok = H.stop().upgrade(p, o.key); break;
    case "decor": case "style": case "paint": case "plate": ok = cosmetic(p, name, o); break;
    case "radio": ok = radio(p, o); break;
    case "rear": ok = H.fight().toggleRear(p); break;
    default: return false;
  }
  if (ok) broadcast();
  return ok;
}
function cosmetic(p, name, o) {
  const van = match.roadtrip.van;
  if (name === "decor") {
    if (!Van.DECOR.includes(o.name)) return false;
    const has = van.decor.includes(o.name), on = o.on === undefined ? !has : !!o.on;
    if (on === has) return false;
    van.decor = on ? [...van.decor, o.name] : van.decor.filter((n) => n !== o.name);
    return true;
  }
  if (name === "style") { if (!Van.STYLES.includes(o.style) || van.style === o.style) return false; van.style = o.style; return true; }
  if (name === "paint") { const hex = Van.cleanHex(o.hex); if (!hex || hex === van.paint) return false; van.paint = hex; return true; }
  if (name === "plate") { const t = Van.cleanPlate(o.text); if (t == null || !t.length || t === van.plate) return false; van.plate = t; return true; }
  return false;
}
const YT_ID = /^[\w-]{11}$/, YT_LIST = /^[\w-]{10,64}$/;
const STATIONS = 5;
const YT_QUEUE = 20;
function radio(p, o) {
  const r = match.roadtrip.radio;
  if (o.src === "off") { Object.assign(r, { src: "off", yt: null, by: p.id }); return true; }
  if (o.src === "synth") {
    const n = Number(o.station);
    const st = Number.isInteger(n) && n >= 0 && n < STATIONS ? n : 0;
    Object.assign(r, { src: "synth", station: st, yt: null, by: p.id });
    return true;
  }
  if (o.src === "yt") {
    const y = o.yt && typeof o.yt === "object" ? o.yt : {};
    const id = typeof y.id === "string" && YT_ID.test(y.id) ? y.id : null;
    const list = typeof y.list === "string" && YT_LIST.test(y.list) ? y.list : null;
    if (!id && !list) return false;
    const startSec = Number.isFinite(y.start) ? Math.max(0, Math.min(86400, Math.floor(y.start))) : 0;
    const queue = Array.isArray(y.queue) ? y.queue.filter((q) => typeof q === "string" && YT_ID.test(q)).slice(0, YT_QUEUE) : [];
    Object.assign(r, { src: "yt", yt: { id, list, start: startSec, queue, at: Date.now() }, by: p.id });
    return true;
  }
  return false;
}

// ---------- state.roadtrip (view.js) — contract §4 ----------
function publicInfo(viewerId = null) {
  if (!active() || ["LOBBY", "TEAM_MODE", "TEAM_SETUP"].includes(match.gameState)) return null; // ห้องรอ (ทุกคนออกกลางทาง) = ไม่มีข้อมูลค้าง
  const rt = match.roadtrip, v = rt.van;
  return {
    phase: rt.phase, endsAt: rt.endsAt, diff: rt.diff, km: Math.floor(rt.km * 100) / 100,
    region: { id: rt.region.id, loop: rt.region.loop }, night: rt.night,
    van: {
      hp: v.hp, hpMax: v.hpMax, fuel: Math.round(v.fuel * 10) / 10, fuelMax: v.fuelMax, kmh: H.drive().speedOf(rt), lane: v.lane, driverId: v.driverId,
      nitro: v.nitro, nitroOn: rt.nitroUntil > Date.now(), style: v.style, paint: v.paint, plate: v.plate, decor: [...v.decor], upg: { ...v.upg }, rearOpen: v.rearOpen,
      prices: Object.fromEntries(Van.UPG_KEYS.map((k) => [k, Van.upgCost(rt, k)])), // ราคาขั้นถัดไป (null = เต็ม)
    },
    hazards: rt.hazards.map((h) => ({ id: h.id, lane: h.lane, at: h.at, kind: h.kind })),
    fork: rt.fork ? { options: rt.fork.options.map((o) => ({ ...o })), votes: { ...rt.fork.votes } } : null,
    event: rt.event ? { id: rt.event.id, kind: rt.event.kind, title: rt.event.title, icon: rt.event.icon, choices: rt.event.choices.map((c) => ({ key: c.key, label: c.label, cost: c.cost || 0, ...(c.desc ? { desc: c.desc } : {}), ...(c.disabled ? { disabled: true } : {}) })), votes: { ...rt.event.votes }, result: rt.event.result || null } : null,
    stop: rt.stop ? { kind: rt.stop.kind, shopId: rt.stop.shopId || null, ready: { ...rt.stop.ready }, acts: H.stop().publicActs(rt, viewerId), dog: rt.dog.fed } : null,
    combat: rt.combat ? { kind: rt.combat.kind, boss: rt.combat.boss || null, round: rt.combat.round, rounds: rt.combat.rounds, scroll: rt.combat.scroll, warn: rt.combat.warn ? { by: rt.combat.warn.by, move: rt.combat.warn.move || null, tiles: rt.combat.warn.tiles, at: rt.combat.warn.at || null } : null } : null,
    radio: { src: rt.radio.src, station: rt.radio.station, yt: rt.radio.yt ? { ...rt.radio.yt, queue: [...(rt.radio.yt.queue || [])] } : null, by: rt.radio.by },
    now: Date.now(), // นาฬิกา server ตอนส่ง (client เทียบนับถอยหลัง endsAt/hazards.at)
    fx: rt.fx.slice(-FX_KEEP),
    summary: rt.summary,
    best: (leaderboard()[rt.diff] || [])[0] ? leaderboard()[rt.diff][0].km : 0,
  };
}

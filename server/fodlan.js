// ============================================================
//  โหมด Fodlan (GRID_PLAN §8.5) — กติกาฝั่ง server ของสนามทวีป Fodlan
//  ด่าน I–V = area 40–44 (server/board.js FODLAN_AREA) · ใช้ร่วมกับโหมด ffa / duo / trio ชุดเดิม
//
//  วงจร (match.fodlan):
//   เริ่มแมตช์ = ด่าน I เสมอ (ผู้ใช้ล็อก) · ด่านละ 6 เทิร์นเท่าการเดินทางของ Origin (Journey.legEnds) → ต้นเทิร์น 7, 13, … สุ่มด่านถัดไป 2–5 ไม่ซ้ำด่านเดิม
//   สภาพอากาศ: เข้าด่านเมื่อไหร่สุ่ม 50% · เกิด = เริ่มทันทีตอนเข้าด่าน อยู่ 3 เทิร์น · เกิดได้ครั้งเดียวต่อการมาเยือน (วนกลับมาด่านเดิมสุ่มใหม่)
//     ชนิดตามด่าน: I ฝนฟ้าผ่า · II ไอพิษ · III ซึนามิ · IV พายุหิมะ · V ออร่า (แสงเขียวเรือง — ใต้ดินไม่มีอากาศ)
//   กลางวัน/กลางคืน: ยังสลับทุก 3 เทิร์นแต่ไม่มีผล (Journey.nightTaxOn / skillBonus คืน 0 ในโลกนี้)
//  ฉากเปลี่ยนด่านใช้ match.journeyScene ชุดเดียวกับการเดินทาง (mode "start" / "advance") แต่ส่งผ่าน publicInfo ของโหมดนี้
//  ผลของสภาพอากาศ/กิมมิกแต่ละด่าน = ขั้นถัดไป (ยังไม่ลงโค้ด)
// ============================================================
Object.assign(module.exports, {
  inWorld, active, start, reset, stageNow, areaOf, weatherNow, maybeAdvance, onEndTurn, publicInfo,
});

const Board = require("./board");
const Journey = require("../characters/_journey");
const match = require("./match");
const action = require("./phases/action");
const Zero = require("./zeroTime");

const STAGES = 5;
const WEATHER_TURNS = 3;
const WEATHER_PCT = 50;
const WEATHER_KINDS = { 1: "storm", 2: "miasma", 3: "tsunami", 4: "blizzard", 5: "aura" };
const STAGE_NAMES = { 1: "แม่น้ำแอร์มิด", 2: "เรเมียร์", 3: "ชายฝั่งเดอร์ดริว", 4: "เทือกเขาฟาร์กัส", 5: "หลุมศพศักดิ์สิทธิ์" };
const WEATHER_NAMES = { storm: "ฝนฟ้าผ่า", miasma: "ไอพิษ", tsunami: "คลื่นซึนามิ", blizzard: "พายุหิมะ", aura: "แสงเขียวเรือง" };
Object.assign(module.exports, { STAGES, WEATHER_KINDS, WEATHER_TURNS, WEATHER_PCT });

function inWorld() { return match.world === "fodlan"; }
function active() { return inWorld() && !!match.fodlan && !!match.board && Board.isFodlanArea(match.board.area); }
function areaOf(stage) { return Board.FODLAN_AREA + stage - 1; }
function stageNow() { return match.fodlan ? match.fodlan.stage : 1; }
function weatherNow() { const w = match.fodlan && match.fodlan.weather; return w && w.left > 0 ? w : null; }

// เข้าด่าน: สุ่มสภาพอากาศของการมาเยือนครั้งนี้ (random ส่งเข้ามาได้ — เทสต์)
function rollWeather(stage, random = Math.random) {
  return random() * 100 < WEATHER_PCT ? { kind: WEATHER_KINDS[stage], left: WEATHER_TURNS } : null;
}
function reset() {
  match.fodlan = { stage: 1, route: [1], weather: null };
}
// เริ่มแมตช์ในสนาม Fodlan (lobby.startMatch)
function start(random = Math.random) {
  reset();
  match.fodlan.weather = rollWeather(1, random);
  action.placeOnBoard(areaOf(1));
}
// ด่านถัดไป: 2–5 ไม่ซ้ำด่านที่อยู่ตอนนี้ (ด่าน I เป็นจุดเริ่มต้นเท่านั้น — แบบการเดินทางของ Origin)
function pickNext(from, random = Math.random) {
  const pool = [];
  for (let s = 2; s <= STAGES; s++) if (s !== from) pool.push(s);
  return pool[Math.floor(random() * pool.length)];
}

// จบเทิร์น: สภาพอากาศนับเวลาลง (เรียกก่อน maybeAdvance — ด่านใหม่สุ่มสภาพอากาศเริ่มนับใหม่)
function onEndTurn() {
  if (!active()) return;
  const w = match.fodlan.weather;
  if (w && w.left > 0) {
    w.left -= 1;
    if (w.left <= 0) match.lastLog.push(`🌤️ ${WEATHER_NAMES[w.kind]} สงบลงแล้ว`);
  }
}

// จบด่าน (ครบ 6 เทิร์น) → สุ่มด่านถัดไป → พักเกม CUTSCENE ให้ client เล่นฉากเปลี่ยนแผนที่ (fodlan/FodlanTravel.jsx)
//  คืน true = จัดการแล้ว (ผู้เรียกหยุด) · seconds = ความยาวฉาก · next = ทำต่อเมื่อครบเวลา (แจกไพ่)
function maybeAdvance(startTimer, random = Math.random) {
  if (Zero.active() || !active() || !Journey.legEnds(Zero.worldRound(), match.legStart)) return false;
  const st = match.fodlan;
  const from = st.stage;
  const to = pickNext(from, random);
  const route = [...st.route];
  st.stage = to;
  st.route.push(to);
  st.weather = rollWeather(to, random);
  match.journeyScene = { seq: ++match.journeySceneSeq, active: true, mode: "advance", area: to, fromArea: from, route };
  match.lastLog.push(`🗺️ ออกเดินทางต่อ — มุ่งหน้าสู่ด่าน ${to} ${STAGE_NAMES[to]}`);
  if (st.weather) match.lastLog.push(`⛈️ เกิด${WEATHER_NAMES[st.weather.kind]}! (${WEATHER_TURNS} เทิร์น)`);
  action.placeOnBoard(areaOf(to)); // แผนที่ใหม่ → ทุกคนกลับไปยืนจุดเกิด
  startTimer();
  return true;
}

// ข้อมูลที่ส่งให้ client (state.fodlan) — null = ไม่ได้อยู่ในสนาม Fodlan
function publicInfo() {
  if (!inWorld() || !match.fodlan) return null;
  const st = match.fodlan;
  const scene = match.journeyScene;
  const w = weatherNow();
  const round = Zero.worldRound();
  return {
    stage: st.stage,
    name: STAGE_NAMES[st.stage],
    weather: w ? { kind: w.kind, left: w.left } : null,
    turnsLeft: Journey.AREA_TURNS - Journey.turnInArea(round, match.legStart) + 1,
    route: [...st.route],
    scene: scene ? { seq: scene.seq, active: !!scene.active, mode: scene.mode, stage: scene.area, fromStage: scene.fromArea } : null,
  };
}

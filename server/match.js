// สถานะของแมตช์ที่กำลังเล่น (เดิมเป็นตัวแปร let ระดับไฟล์ใน server.js)
//  ทุกไฟล์ใน server/ อ่าน/เขียนผ่าน match.<ชื่อ> — ห้าม destructure ออกมาเก็บไว้ (ค่าจะไม่อัปเดตตาม)

const match = {
  cycleShift: 0, // เลื่อนวงจรกลางวัน/กลางคืนทั้งเกม (เทสต์ตั้งผ่าน engine.setCycleShift · ก่อกำเนิดใหม่ของ Echo ตั้ง = เทิร์นที่ใช้ − 1)
  legStart: 1,   // เวลาโลกที่ภูมิภาคปัจจุบันเริ่มนับ (Journey.legEnds/turnInArea) — ก่อกำเนิดใหม่ของ Echo ตั้ง = เทิร์นที่ใช้

  // ---------- สถานะเกมส่วนกลาง ----------
  players: {},
  gameState: "LOBBY", // LOBBY | TEAM_MODE | TEAM_SETUP | PLAYING | CUTSCENE | ORDER | ACTION | ATTACKING | TRANSITION | GAMEOVER
  gameMode: "ffa", // ffa | duo | trio | pending
  teamSize: 1,
  teamCount: 0,
  winningTeamId: null,
  modeVotes: {},
  journeyScene: null, // { seq, active, mode: "start" | "advance" | "rebirth", area, fromArea, route?, casterId? (rebirth) }
  journeySceneSeq: 0,
  journeyArea: 1,     // ภูมิภาคปัจจุบัน (การเดินทาง) — เริ่ม 1 เสมอ แล้วสุ่มทุก AREA_TURNS เทิร์น
  journeyRoute: [1],  // ภูมิภาคที่ผ่านมาตามลำดับ (รวมที่อยู่ตอนนี้) — ฉากเปลี่ยนภูมิภาควาดเส้นทางเก่าจากตรงนี้
  effectSourceId: null,
  timeLeft: 0,
  phaseTimerId: null,
  // ---------- กระดาน (GRID_PLAN.md) — ตำแหน่งผู้เล่นอยู่ที่ p.pos ----------
  board: null,         // { area } — แผนที่จริงอ่านผ่าน board.mapOf(area)
  turnOrder: [],       // ลำดับเดินของเทิร์นนี้ (playerId) — เรียงตอนเปิดไพ่
  actorIndex: -1,
  actorId: null,       // คนที่กำลังเดิน (ACTION / ATTACKING)
  action: null,        // { from, moved, locked, path } ของตาเดินปัจจุบัน
  actionLeft: 0,       // เวลาที่เหลือของตาเดินตอนถูกพัก (ตี/ฉากสกิล) — ระบบคู่/เดินต่อหลังจบตาเล่นต่อด้วยค่านี้
  duo: null,           // ตาของฝ่ายคู่ที่กำลังเล่น { ownerId, acts: { id: action }, done: { id: true } } — server/duo.js
  afterCutscene: [],   // ผลของสกิลที่รอลงหลังคลิปจบ (engine.deferAfterCutscene — ใช้ใน useSkill)
  skillBeats: [],      // จังหวะพักตาเดินให้กระดานเล่นเอฟเฟกต์สกิลก่อนผลถัดไป (engine.skillBeat — cutscene.runSkillFlow)
  dash: null,          // การพุ่งล่าสุดบนกระดาน { seq, id, path, wheel, swap } — client เล่นแอนิเมชันตาม seq ใหม่
  dashSeq: 0,
  rideAsk: null,
  // ---------- หยุดเวลา (server/timeStop.js — ดิเอโก้) ----------
  extraTurns: [],      // ตาเดินพิเศษที่รอคิว [{ id, kind }] — nextActor เล่นก่อนเลื่อนลำดับ
  timeFreeze: null,    // ระหว่างหยุดเวลา { by, held: { [id]: ค่าตอนเริ่มหยุด }, doomed: [id] }
  tsSnap: null,        // จุดย้อนของตาเดินนี้ (มีคนตั้งรับด้วยการหยุดเวลา) { side, data }       // คำขอขี่ที่รอตอบ { from, to, seq } — server/ride.js (ยูนะ)
  shopPos: null,       // ช่องที่ร้านค้ามายาตั้งอยู่ { x, y } (กินช่อง — เดิน/ยืน/ถอยเข้าไม่ได้) · null = ยังไม่ตั้ง (dealRound ตั้งให้)
  shopOpenedRound: 0,  // เทิร์นที่ร้านมาตั้งจุดนี้ — ครบ SHOP_INTERVAL_TURNS แล้วย้าย
  roundNumber: 0,
  centralDeck: [], // กองกลาง 43 ใบ (สับใหม่ทุกรอบใน dealRound())
  lastLog: [],
  reservations: {},
  cutsceneQueue: [],
  cutsceneInfo: null,
  cutsceneSeq: 0,      // id ต่อ cutscene (ให้ client remount วีดีโอ กันจอดำ)
  attackSeq: 0,        // id ต่อ lastAttack (ให้ client remount ฉากโจมตี กันแอนิเมชันไม่เล่นซ้ำเวลาตี/เป้าหมาย/ดาเมจซ้ำกัน)
  transformCounter: 0, // ลำดับการเปิดร่าง (ใช้เลือกเพลงตอนสวนท่ากัน)
  lastAttack: null,    // ข้อมูลการโจมตีล่าสุด (อนิเมชันใครตีใคร)
  roundSkills: [],     // สกิลที่ใช้ในรอบ (เก็บประวัติ — instant เด้งตอนใช้ / หลังเปิดไพ่โชว์ตอนโจมตี)
  shopItems: [],       // ร้านค้ามายา: สินค้าส่วนกลางของจุดปัจจุบัน (15 ชิ้น สุ่มใหม่ทุกครั้งที่ร้านย้าย)
  shopRoundSeq: 0,     // ลำดับรอบร้านค้า (ใช้สร้าง id สินค้าไม่ให้ซ้ำกันข้ามรอบ)
  // ---------- ห่วงเวลาซีโร่ (server/zeroTime.js · GRID_PLAN §8.2) ----------
  zero: null,          // ระหว่างอยู่ในห่วงเวลา: { saved, seals, pickups, pending, enteredRound } · null = ไม่ได้อยู่
  zeroUsed: false,     // เกิดไปแล้วในเกมนี้ (ครั้งเดียวต่อเกม)
  zeroFrozen: 0,       // จำนวนเทิร์นที่อยู่ในห่วงเวลา — เวลาโลก = roundNumber − zeroFrozen (กลางวัน/กลางคืน · ภูมิภาค · ร้าน)
  zeroScene: null,     // ฉากที่ client เล่นระหว่างพักเกม { seq, active, mode: "enter" | "break" | "release", stage, seal, breakerId }
};

module.exports = match;

// สถานะของแมตช์ที่กำลังเล่น (เดิมเป็นตัวแปร let ระดับไฟล์ใน server.js)
//  ทุกไฟล์ใน server/ อ่าน/เขียนผ่าน match.<ชื่อ> — ห้าม destructure ออกมาเก็บไว้ (ค่าจะไม่อัปเดตตาม)

const match = {
  cycleShift: 0, // เลื่อนวงจรกลางวัน/กลางคืนทั้งเกม (เทสต์ตั้งผ่าน engine.setCycleShift)

  // ---------- สถานะเกมส่วนกลาง ----------
  players: {},
  gameState: "LOBBY", // LOBBY | TEAM_MODE | TEAM_SETUP | PLAYING | CUTSCENE | ORDER | ACTION | ATTACKING | TRANSITION | GAMEOVER
  gameMode: "ffa", // ffa | duo | trio | pending
  teamSize: 1,
  teamCount: 0,
  winningTeamId: null,
  modeVotes: {},
  journeyScene: null, // { seq, active, mode: "start" | "advance", area, fromArea }
  journeySceneSeq: 0,
  effectSourceId: null,
  timeLeft: 0,
  phaseTimerId: null,
  // ---------- กระดาน (GRID_PLAN.md) — ตำแหน่งผู้เล่นอยู่ที่ p.pos ----------
  board: null,         // { area } — แผนที่จริงอ่านผ่าน board.mapOf(area)
  turnOrder: [],       // ลำดับเดินของเทิร์นนี้ (playerId) — เรียงตอนเปิดไพ่
  actorIndex: -1,
  actorId: null,       // คนที่กำลังเดิน (ACTION / ATTACKING)
  action: null,        // { from, moved, locked, path } ของตาเดินปัจจุบัน
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
  shopItems: [],       // ร้านค้ามายา (patch 2.3): สินค้าส่วนกลางของรอบปัจจุบัน (15 ชิ้น เปิดทุก 5 เทิร์น — ร้านเดียวรวมของลุงเท่งเดิม)
  shopRoundSeq: 0,     // ลำดับรอบร้านค้า (ใช้สร้าง id สินค้าไม่ให้ซ้ำกันข้ามรอบ)
};

module.exports = match;

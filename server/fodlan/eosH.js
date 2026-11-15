// ============================================================
//  สนาม Eos — helper H() ที่ส่งให้ eosEvents/eosExtra/eosPerks/… (กัน require วน — แคชครั้งเดียว)
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const MAP = require("./map6");
const XT = require("./eosExtra");
const { CAR_HP, ROAD, inRect, bodies, isMob, mobsOf, heroes, footOf, tileFree, freeNear, manhattan, townOf, canMove, canStrike } = require("./eosCore");
const DM = require("./eosDome");
const JR = require("./eosJourney");
const MAI = require("./eosMobAI");
const MT = require("./eosMobTurn");
const PR = require("./eosProps");
const RD = require("./eosRide");
const SC = require("./eosScore");
const SPN = require("./eosSpawn");
const WL = require("./eosWalls");

// ============================================================ helper ให้ eosEvents.js (กัน require วน)
let H_CACHE = null;
function H() {
  if (H_CACHE) return H_CACHE;
  H_CACHE = { rideNow: RD.rideNow, carOf: RD.carOf, CAR_HP, stepToward: MAI.stepToward, faceTo: RD.faceTo, mobType: SPN.mobType, lightSafe: (x, y) => XT.lightSafe(H(), x, y), unitsOn: PR.unitsOn, dimLights: MAI.dimLights, turretZone: WL.turretZone, mobRoom: SPN.mobRoom, bigFree: SPN.bigFree, bigStart: SPN.bigStart, turretUp: PR.turretUp, p4State: JR.p4State, spawnMob: SPN.spawnMob, traitStats: SPN.traitStats, mobsOf, heroes, bodies, isMob, tileFree, freeNear, hurt: SPN.hurt, loot: MT.loot, flasksOf: PR.flasksOf, blockedTown: DM.blockedTown, townOf, inRect, manhattan, area3: PR.area3, addScore: SC.addScore, sideColor: SC.sideColor, ZONE_NAMES: SC.ZONE_NAMES, MAP, ROAD, canStrike, canMove, daemonStats: SPN.daemonStats, footOf, carGround: RD.carGround, onRail: JR.onRail, TURRETS: PR.TURRETS };
  return H_CACHE;
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  H,
});

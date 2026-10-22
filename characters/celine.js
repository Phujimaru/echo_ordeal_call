// ============================================================
//  องค์หญิงดอกไม้ เซลิน (Céline — Fire Emblem Engage) — ระดับพิเศษ · id "celine" · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.15
//
//  ค่าพื้นฐาน: พลังชีวิต 7 · เกราะ 3 · พลังโจมตี 1 · เดิน 4 · แต้มสกิลสูงสุด 8 (ค่ากลาง)
//  จุดด้อย: ซ่อนตัวในพุ่มไม่ได้เลย (ฮุค bushExposed — server/visibility.js) · คนอื่นในพุ่มใช้กติกาพุ่มกลางตามเดิม
//  พุ่มดอกไม้ของเซลิน = ชั้นพื้น server/flora.js (special "bloom": หลบหลีก +20% · ซ่อนตัว · เดิน 1 ก้าว) — วางทับช่องเดิม ผลช่องเดิมหาย
//
//  ความอ่อนโยน (พื้นฐาน · ปุ่มหลายตัวเลือก): รวมกันกดได้ 3 ครั้งต่อเทิร์น · ไม่กินโควตาสกิล · ใช้แล้วยังเดินได้
//    คฑาแห่งการเยียวยา (2 · 1 คนในระยะเดิน รวมตัวเอง · ศัตรูได้): เป้า +1 + ล้างดีบัฟ 1 · เซลิน +1 + ล้างดีบัฟ 1 (เลือกตัวเอง = ชุดเดียว)
//      ใช้ครบ 4 ครั้ง (นับสะสมข้ามเทิร์น) → คูลดาวน์ 5 เทิร์น แล้วนับใหม่
//    คฑาแห่งการกีดกัน (3 · ช่องกลางในระยะเดิน): กำแพงน้ำแข็ง 3×1 / 1×3 (orient) — อยู่จนต้นตาเดินถัดไปของเซลิน · โดนโจมตีครั้งเดียวแตก
//      (ชั้นหนามของ server/ice.js — wall: true · ทางตีหนามเดิม) · วางทับคน = ผลัก 1 ช่องตามทิศที่เลือก (ตั้งฉากกับกำแพง) · ใช้ครบ 2 ครั้ง → คูลดาวน์ 3
//    คฑาแห่งการเคลื่อนย้าย (3 · ระยะ 5 · คูลดาวน์ 3): สลับเซลินกับเป้า 1 คน หรือจับคู่ 2 คนสลับกัน · ตัว 2×2 ขึ้นไป/ขี่-ถูกขี่ไม่ได้
//    คฑาแห่งการรังสรรค์ (1 · ทั้งแผนที่): พุ่มดอกไม้ 1 ช่อง อยู่ 5 เทิร์น
//  ความแข็งกร้าว (รอง · 0 แต้ม · ไม่จำกัด · ไม่กินโควตา · ไม่ล็อกการเดิน): เลือกอาวุธที่ถือ (เริ่มเกม ดาบเล็ก)
//    ดาบ (ประชิด): ดาบเล็ก หลบหลีกเฉพาะตัว 5% + ตี/รอแล้วเดินต่อได้อีกรอบ (canto — ทำได้แค่เดิน/รอ) · ดาบมังกรแดง คริ 50% ·
//      ดาบใหญ่ พลังโจมตี +1 + ผลัก 1 ช่อง
//    สื่อเวทย์ (ระยะ 1–3): ไฟ ลุกไหม้ 1 · ลม ผลัก 2 ช่อง ชนสิ่งกีดขวาง/ขอบ/คน = เสียหายเพิ่ม 1 · ไฟฟ้า ช็อต 2 เทิร์น
//  สวนดอกไม้ของฉัน (ท่าไม้ตาย · 6 · กินโควตา · ใช้แล้วยังเดินได้): บัฟราชาดอกไม้ 5 เทิร์น (statuses.celineKing · บัฟ 2026-10-21 — เดิม 3)
//    — เดินตามช่องดอกไม้ไม่เสียก้าว (Board opts.flowerWalk) · อัตราคริ +50% · คริของตีปกติ/ฟื้นฟู ×3 · ต้นเทิร์นแต้มสกิล +1
//    · กดเทิร์น N → กดได้อีก N+8 (คูลดาวน์ 3 นับหลังบัฟหมด)
//  เวลาน้ำชา (ติดตัว · เนิฟ 2026-10-22): ต้นเทิร์นยืนในพุ่ม (ของใครก็ได้) ติดกัน 2 เทิร์น = ฟื้น 1 แล้วนับใหม่ · ออกจากพุ่ม = นับใหม่
//    · การรักษานี้ติดคริไม่ได้ · ในพุ่มคริ +20%
//    ติดคริได้ทุกอย่างของความอ่อนโยน/ความแข็งกร้าว ยกเว้นกำแพง พุ่ม และการเคลื่อนย้าย (ผู้ใช้ตัดสิน) — ฟื้นฟูคริ = ×2 (×3 ราชาดอกไม้)
//  สวนดอกไม้ (ติดตัว 2): ทุกช่องที่เดินผ่าน (รวมช่องออกตัว/ปลาย) เกิดพุ่มใต้เท้า 5 เทิร์น (afterWalk — ย้อนการเดินได้ · บัฟ 2026-10-22 เดิม 3)
//    · ถูกผลัก/กระเด็น/ดึงก็เกิดตามทางที่ถูกพาผ่าน (onForcedMove — ผู้ใช้สั่ง 2026-10-22) · สลับตำแหน่ง (วาร์ป) ไม่เกิด
//    · เหยียบพุ่มเดิมไม่นับเวลาใหม่
//  เสียงพากย์ตอนตี: เล่นเองตอนเริ่มฉากตี (preAttackClip) — ติดคริ = ไม่เล่น (คลิปคริมีเสียงของตัวเอง — ผู้ใช้สั่ง 2026-10-22)
//  ตีปกติติดคริ = คลิปคริตามสายอาวุธก่อนฉากตีทุกครั้ง (ฮุค preAttackClip — server/phases/attack.js)
//  เอฟเฟกต์: engine.boardFx("celineFx", …) ตามสัญญา .claude/plans/celine-contract.md §5
// ============================================================
const Board = require("../server/board");
const Flora = require("../server/flora");

const ID = "celine";
const DIR = "/characters/celine";
const IMG = {
  base: `${DIR}/celine.webp`,
  skill1: `${DIR}/celine_skill1.webp`,
  skill2: `${DIR}/celine_skill2.webp`,
  skill3: `${DIR}/celine_skill3.webp`,
};
const ICON = (k) => `${DIR}/icons/${k}.svg`;
const VIDEO = { critSword: `${DIR}/celine_crit_sword.mp4`, critMage: `${DIR}/celine_crit_mage.mp4` };
const CUT = { critSword: "celineCritSword", critMage: "celineCritMage", ult: "celineUlt" };
const FX = "celineFx"; // socket event (client/src/board/celineFx.js)
// เสียงพากย์ตามเหตุการณ์ (server/voice.js — client/public/characters/celine/voice/)
const VOICE = {
  turn: ["celine_v_turn1", "celine_v_turn2", "celine_v_turn3", "celine_v_turn4", "celine_v_turn5"],
  strike: [], // เล่นเองใน preAttackClip (ติดคริ = เงียบ ไม่ทับคลิป)
  struck: ["celine_v_struck1", "celine_v_struck2", "celine_v_struck3"],
  basic: ["celine_v_tender1", "celine_v_tender2", "celine_v_tender3"],
  secondary: ["celine_v_weapon1", "celine_v_weapon2"],
  ultimate: ["celine_v_ult1", "celine_v_ult2"],
};
const STRIKE_VOICE = ["celine_v_strike1", "celine_v_strike2", "celine_v_strike3", "celine_v_strike4", "celine_v_strike5"];

const HP = 7;
const ARMOR = 3;
const TENDER_PER_TURN = 3;
const HEAL_AMT = 1;
const HEAL_LIMIT = 4;
const HEAL_CD = 5;
const WALL_LIMIT = 2;
const WALL_CD = 3;
const WALL_LEN = 3;
const SWAP_RANGE = 5;
const SWAP_CD = 3;
const BLOOM_TURNS = 5;  // คฑาแห่งการรังสรรค์
const TRAIL_TURNS = 5;  // รอยเท้า (สวนดอกไม้ · บัฟ 2026-10-22 เดิม 3)
const ULT_TURNS = 5;     // บัฟ 2026-10-21 (เดิม 3)
const ULT_CD = ULT_TURNS + 3; // กดเทิร์น N → กดได้อีก N+8 (คูลดาวน์ 3 นับหลังบัฟหมด — ผู้ใช้ตัดสิน 2026-10-21)
const KING_CRIT = 50;   // ราชาดอกไม้: อัตราคริ +50%
const KING_SP = 1;      // ราชาดอกไม้: ต้นเทิร์นแต้มสกิล +1
const BUSH_CRIT = 20;
const TEA_HEAL = 1;
const TEA_TURNS = 2;    // ต้นเทิร์นยืนในพุ่มติดกันกี่เทิร์นถึงฟื้น (เนิฟ 2026-10-22)
const KING = "celineKing";

const WEAPONS = {
  dagger: { name: "ดาบเล็ก", cls: "sword", evade: 5, canto: true,
    desc: "ประชิด · หลบหลีก 5% · ตีหรือรอแล้วเดินต่อได้อีกรอบ (ทำได้แค่เดินกับรอ)" },
  dragon: { name: "ดาบมังกรแดง", cls: "sword", crit: 50, desc: "ประชิด · อัตราคริ 50%" },
  great: { name: "ดาบใหญ่", cls: "sword", atk: 1, push: 1, desc: "ประชิด · พลังโจมตี +1 · ผลักเป้า 1 ช่อง" },
  fire: { name: "เวทย์ไฟ", cls: "magic", burn: 1, desc: "ระยะ 3 · ลุกไหม้ 1" },
  wind: { name: "เวทย์ลม", cls: "magic", push: 2, collide: 1, desc: "ระยะ 3 · ผลักเป้า 2 ช่อง · ชนสิ่งกีดขวางเสียหายเพิ่ม 1" },
  thunder: { name: "เวทย์ไฟฟ้า", cls: "magic", shock: 2, desc: "ระยะ 3 · ช็อต 2 เทิร์น" },
};
const WEAPON_KEYS = Object.keys(WEAPONS);
const RANGE = { sword: [1, 1], magic: [1, 3] };
const STYLE = { dagger: "celineDagger", dragon: "celineDragon", great: "celineGreat", fire: "celineFire", wind: "celineWind", thunder: "celineThunder" };

const MOV_AREA = "mov";
const TENDER = {
  heal: { name: "คฑาแห่งการเยียวยา", short: "เยียวยา", cost: 2, area: { kind: "target", range: MOV_AREA, self: true },
    desc: `1 คนในระยะเดิน (รวมตัวเอง · ศัตรูได้): ฟื้นพลังชีวิต ${HEAL_AMT} + ล้างดีบัฟ 1 อย่าง · เซลินได้ด้วย (เลือกตัวเอง = ครั้งเดียว) · ติดคริได้ (ใช้ครบ ${HEAL_LIMIT} ครั้ง คูลดาวน์ ${HEAL_CD} เทิร์น)` },
  wall: { name: "คฑาแห่งการกีดกัน", short: "กีดกัน", cost: 3, area: { kind: "tile", range: MOV_AREA, place: "wall", rect: [WALL_LEN, 1] },
    desc: `กำแพงน้ำแข็ง 3×1 หมุนได้ ช่องกลางในระยะเดิน: กันทางเดินจนตาเดินถัดไปของเซลิน · โดนโจมตีครั้งเดียวแตก · วางทับคน = ผลัก 1 ช่อง (ใช้ครบ ${WALL_LIMIT} ครั้ง คูลดาวน์ ${WALL_CD} เทิร์น)` },
  swap: { name: "คฑาแห่งการเคลื่อนย้าย", short: "เคลื่อนย้าย", cost: 3, area: { kind: "target", range: SWAP_RANGE },
    desc: `สลับตำแหน่งกับ 1 คนในระยะ ${SWAP_RANGE} (ตัว 2×2 ขึ้นไปไม่ได้) (คูลดาวน์ ${SWAP_CD} เทิร์น)` },
  pair: { name: "คฑาแห่งการเคลื่อนย้าย — จับคู่", short: "จับคู่", cost: 3, area: { kind: "target", range: SWAP_RANGE, count: 2 },
    desc: `เลือก 2 คนในระยะ ${SWAP_RANGE} สลับตำแหน่งกัน (ตัว 2×2 ขึ้นไปไม่ได้) (คูลดาวน์ ${SWAP_CD} เทิร์น ร่วมกับสลับตัวเอง)` },
  bloom: { name: "คฑาแห่งการรังสรรค์", short: "รังสรรค์", cost: 1, area: { kind: "tile", range: 26, place: "bloom" },
    desc: `พุ่มดอกไม้ 1 ช่องที่ไหนก็ได้บนแผนที่ อยู่ ${BLOOM_TURNS} เทิร์น` },
};
const TENDER_KEYS = Object.keys(TENDER);
const ICON_OF = { heal: "heal", wall: "wall", swap: "swap", pair: "pair", bloom: "bloom" };
const ORIENTS = { h: [WALL_LEN, 1], v: [1, WALL_LEN] };
const PUSH_DIRS = { h: ["up", "down"], v: ["left", "right"] };

const isCeline = (p) => !!p && p.characterId === ID && !p.summon;
// ฮุคที่ไม่ได้รับ engine อ่านเลขเทิร์นจาก engine กลาง (require ตอนเรียก — กันวน)
function eng() { return require("../server/engine").engine; }
function fresh() {
  return {
    weapon: "dagger",
    tenderRound: 0, tenderUsed: 0, // ความอ่อนโยนที่กดในเทิร์น tenderRound
    healCount: 0, healReady: 0,
    wallCount: 0, wallReady: 0,
    swapReady: 0,
    ultReady: 0,
    teaStreak: 0,                  // เวลาน้ำชา: ต้นเทิร์นที่ยืนในพุ่มติดกัน (ครบ TEA_TURNS = ฟื้น)
  };
}
function st(p) { return p.celine || (p.celine = fresh()); }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const weaponOf = (p) => WEAPONS[st(p).weapon] || WEAPONS.dagger;
const kingOn = (p) => isCeline(p) && ((p.statuses && p.statuses[KING]) || 0) > 0;
function tenderLeft(engine, p) {
  const s = st(p);
  return TENDER_PER_TURN - (s.tenderRound === engine.roundNumber ? s.tenderUsed : 0);
}
function fx(engine, p, kind, extra) {
  engine.boardFx(FX, { kind, id: p.id, color: engine.colorOf(p), ...(p.pos ? { at: { ...p.pos } } : {}), ...extra });
}
// ยืนในพุ่ม (แผนที่รวมชั้น — พุ่มดอกไม้ของเซลิน/ภูมิภาค II/ป่าทึบ) · ตัวใหญ่ไม่นับ
function inBloom(engine, p) {
  if (!p || !p.alive || !p.pos || engine.sizeOf(p) > 1) return false;
  return Board.bushPatchOf(engine.boardMap(), p.pos.x, p.pos.y) !== null;
}
// อัตราคริของเซลิน (%) ไม่รวมคริสนาม: ดาบมังกรแดง 50 · ในพุ่ม +20 · ราชาดอกไม้ +50
function ownCrit(engine, p) {
  return (weaponOf(p).crit || 0) + (inBloom(engine, p) ? BUSH_CRIT : 0) + (kingOn(p) ? KING_CRIT : 0);
}
// ทอยคริของการรักษา (อัตราเดียวกับตีปกติ: สนาม + เฉพาะตัว) → ตัวคูณ (1 = ไม่ติด)
function healCrit(engine, p) {
  const pct = (engine.critBonusFor(p) || 0) + ownCrit(engine, p);
  if (!(pct > 0) || Math.random() * 100 >= pct) return 1;
  return kingOn(p) ? 3 : 2;
}
const LINE = Board.LINE_DIRS;
const dirVec = (d) => (LINE[d] ? { x: LINE[d][0], y: LINE[d][1] } : null);
// ทิศผลักออกจากเซลิน (แกนที่ห่างมากกว่า · เท่ากัน = แกนตั้ง) — ตัวใหญ่วัดจากกลางตัว
function awayDir(engine, from, t) {
  const s = engine.sizeOf(t);
  const cx = t.pos.x + (s - 1) / 2 - from.x, cy = t.pos.y + (s - 1) / 2 - from.y;
  if (Math.abs(cy) >= Math.abs(cx) && cy !== 0) return { x: 0, y: Math.sign(cy) };
  if (cx !== 0) return { x: Math.sign(cx), y: 0 };
  return { x: 0, y: 1 };
}
const mounted = (engine, u) => !!(u && (u.mountId || engine.ride.riderOf(u)));
// ย้ายได้ด้วยคฑาแห่งการเคลื่อนย้าย: ยังอยู่บนกระดาน · ตัว 1×1 · ไม่ได้ขี่/ถูกขี่
const movable = (engine, u) => !!u && u.alive && !!u.pos && engine.sizeOf(u) <= 1 && !mounted(engine, u);

// ---------- คฑาแห่งการเยียวยา ----------
function heal(engine, p, t) {
  const s = st(p), r = engine.roundNumber;
  const mult = healCrit(engine, p);
  const amt = HEAL_AMT * mult;
  const self = t.id === p.id;
  const got = engine.withEffectSource(p, () => engine.healHp(t, amt)) || 0;
  const cleansed = engine.cleanseLatestDebuff(t);
  let selfGot = 0, selfCleansed = null;
  if (!self) {
    selfGot = engine.healHp(p, amt) || 0;
    selfCleansed = engine.cleanseLatestDebuff(p);
  }
  s.healCount += 1;
  if (s.healCount >= HEAL_LIMIT) { s.healCount = 0; s.healReady = r + HEAL_CD; }
  const critTxt = mult > 1 ? ` (คริติคอล ×${mult})` : "";
  engine.log(`🌸 ${p.name} คฑาแห่งการเยียวยา → ${t.name} พลังชีวิต +${got}${self ? "" : ` · ${p.name} +${selfGot}`}${critTxt}`);
  fx(engine, p, "heal", { targetId: t.id, from: p.pos ? { ...p.pos } : null, to: t.pos ? { ...t.pos } : null, amt: got, selfAmt: selfGot, crit: mult > 1, mult, self, cleansed: !!cleansed, selfCleansed: !!selfCleansed });
  engine.sfx(mult > 1 ? "celine_heal_crit" : "celine_heal");
}

// ---------- คฑาแห่งการกีดกัน ----------
// แผนวางกำแพง: ช่องที่วางได้ + คนที่ต้องผลัก (ทิศ dir) → { tiles, pushes: [unit] } | null (วางไม่ได้)
function wallPlan(engine, p, tile, orient, dir) {
  const rect = ORIENTS[orient];
  if (!rect || !tile) return null;
  const tiles = engine.tileArea({ kind: "tile", rect }, tile);
  const map = engine.boardMap();
  const open = tiles.filter((t) => !map.terrain[Board.key(t.x, t.y)] && !(engine.shopPos && engine.shopPos.x === t.x && engine.shopPos.y === t.y));
  if (!open.length) return null;
  const onWall = new Set(open.map((t) => Board.key(t.x, t.y)));
  const units = engine.boardUnits().filter((u) => Board.footprint(u.x, u.y, u.size || 1).some((c) => onWall.has(Board.key(c.x, c.y))));
  if (!units.length) return { tiles: open, pushes: [] };
  if (!PUSH_DIRS[orient].includes(dir)) return null;
  const v = dirVec(dir);
  const pushes = [];
  const seenBy = (u) => !engine.hiddenFromUnit(p, engine.players[u.id]);
  for (const u of units) {
    const o = engine.players[u.id];
    if (!o) return null;
    const big = (u.size || 1) > 1;
    const dest = { x: u.x + v.x, y: u.y + v.y };
    const ok = !big && !onWall.has(Board.key(dest.x, dest.y)) && engine.tileFree(dest.x, dest.y, u.id) && !mounted(engine, o);
    if (ok) { pushes.push(o); continue; }
    if (seenBy(u)) return null; // คนที่มองเห็นผลักไม่ได้ = เลือกทิศนี้ไม่ได้
    onWall.delete(Board.key(u.x, u.y)); // คนที่มองไม่เห็นผลักไม่ได้ = ช่องนั้นไม่มีกำแพง (ไม่บอกใบ้)
  }
  const left = open.filter((t) => onWall.has(Board.key(t.x, t.y)));
  return left.length ? { tiles: left, pushes } : null;
}
function wall(engine, p, tile, orient, dir) {
  const s = st(p), r = engine.roundNumber;
  const plan = wallPlan(engine, p, tile, orient, dir);
  if (!plan) return;
  const ctx = engine.ice.begin();
  const v = dirVec(dir);
  engine.withEffectSource(p, () => { for (const u of plan.pushes) engine.ice.pushUnit(u, v, ctx, 1); });
  const placed = plan.tiles.filter((t) => engine.tileFree(t.x, t.y) && engine.ice.placeWall(t.x, t.y, p.id));
  s.wallCount += 1;
  if (s.wallCount >= WALL_LIMIT) { s.wallCount = 0; s.wallReady = r + WALL_CD; }
  fx(engine, p, "wall", { tiles: placed, orient });
  engine.sfx("celine_wall");
  engine.ice.flush(ctx);
  engine.log(`🧊 ${p.name} คฑาแห่งการกีดกัน — กำแพงน้ำแข็ง ${placed.length} ช่อง${plan.pushes.length ? ` · ผลัก ${plan.pushes.map((u) => u.name).join(", ")}` : ""}`);
}
// ต้นตาเดินถัดไปของเจ้าของ / ตกรอบ = กำแพงหาย
function clearWalls(engine, p, why) {
  const keys = engine.ice.wallsOf(p.id);
  const tiles = [];
  for (const k of keys) if (engine.ice.removeWall(k)) { const [x, y] = k.split(",").map(Number); tiles.push({ x, y }); }
  if (tiles.length) {
    fx(engine, p, "wallBreak", { tiles, why });
    engine.sfx("celine_wall_break");
  }
}

// ---------- คฑาแห่งการเคลื่อนย้าย ----------
function swapUnits(engine, p, a, b, mode) {
  const s = st(p);
  const pa = { ...a.pos }, pb = { ...b.pos };
  a.pos = { ...pb };
  b.pos = { ...pa };
  s.swapReady = engine.roundNumber + SWAP_CD;
  // เซลินย้ายตัวเอง: เดินยังไม่ได้ = เริ่มเดินจากช่องใหม่ · เดินไปแล้ว = การเดินของตานี้จบ (รอยเท้าคงไว้)
  const act = engine.action;
  if (act && engine.actorId === p.id && (a.id === p.id || b.id === p.id)) {
    if (act.moved) Object.assign(act, { locked: true, iceUndo: null });
    else Object.assign(act, { from: { ...p.pos }, path: null, trail: null });
  }
  fx(engine, p, "swap", { mode, a: { id: a.id, from: pa, to: { ...a.pos } }, b: { id: b.id, from: pb, to: { ...b.pos } } });
  engine.sfx("celine_swap");
  // ถูกย้าย = กับดักบนพื้นทำงาน (ตาข่ายของดิเอโก้) · ไม่ไถลบนน้ำแข็ง (วาร์ป — ไม่ส่งทิศ)
  engine.ice.forcedSlides([{ id: a.id, to: { ...a.pos }, warp: true }, { id: b.id, to: { ...b.pos }, warp: true }], p);
  engine.log(`🦋 ${p.name} คฑาแห่งการเคลื่อนย้าย — ${a.name} ⇄ ${b.name}`);
}

// ---------- คฑาแห่งการรังสรรค์ / สวนดอกไม้ ----------
function bloomAt(engine, p, tile) {
  const recs = Flora.lay(engine.boardMap(), [tile], p.id, BLOOM_TURNS, { made: true });
  if (!recs.length) return;
  fx(engine, p, "bloom", { tiles: recs.map((r) => ({ x: r.x, y: r.y })), made: true });
  engine.sfx("celine_bloom");
  engine.log(`🌷 ${p.name} คฑาแห่งการรังสรรค์ — พุ่มดอกไม้ (${BLOOM_TURNS} เทิร์น)`);
}

// ---------- ตีปกติ: ผลักหลังฉากตี (ดาบใหญ่ / เวทย์ลม) ----------
function pushAfter(engine, p, t, w) {
  if (!t || !t.alive || !t.pos || !p.pos) return 0;
  const ctx = engine.ice.begin();
  const dir = awayDir(engine, p.pos, t);
  const big = engine.sizeOf(t) > 1;
  if (w.collide) fx(engine, p, "gust", { targetId: t.id, at: { ...t.pos }, sound: "celine_wind_hit" });
  engine.ice.pushUnit(t, dir, ctx, w.push);
  const hit = !big && ctx.events.some((e) => e.kind === "knock" && e.id === t.id && e.collide);
  if (hit && w.collide && t.alive) {
    const before = (t.hp || 0) + (t.armor || 0);
    engine.dealMixed(t, w.collide);
    if (t.alive && t.hp <= 0) engine.instantDeath(t);
    const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
    engine.log(`💨 ${t.name} ถูกลมพัดชน — เสียหาย ${dealt} (ลดเกราะก่อน)`);
    fx(engine, p, "collide", { targetId: t.id, at: t.pos ? { ...t.pos } : null });
    engine.sfx("celine_collide");
    if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  }
  engine.ice.flush(ctx);
  return engine.ice.fxSeconds(ctx);
}

module.exports = {
  id: ID,
  IMG, ICON, VIDEO, CUT, FX, VOICE, HP, ARMOR, TENDER, TENDER_KEYS, TENDER_PER_TURN, WEAPONS, WEAPON_KEYS, STYLE,
  HEAL_AMT, HEAL_LIMIT, HEAL_CD, WALL_LIMIT, WALL_CD, SWAP_RANGE, SWAP_CD, BLOOM_TURNS, TRAIL_TURNS, ULT_TURNS, ULT_CD, BUSH_CRIT, KING, KING_CRIT, KING_SP,
  isCeline, kingOn, inBloom, wallPlan,

  resetCombat(p) { p.celine = isCeline(p) ? fresh() : null; },
  maxHp() { return HP; },
  maxArmor() { return ARMOR; },
  voiceLines(p) { return isCeline(p) ? VOICE : null; },

  // ---------- การมองเห็น / การเดิน ----------
  bushExposed(p) { return isCeline(p); },
  flowerWalk(p) { return kingOn(p); },
  // ทุกช่องที่เดิน/ไถลผ่านเกิดพุ่ม (เหยียบพุ่มเดิมไม่นับเวลาใหม่) — บันทึก { k, undo } ไว้ย้อนการเดิน
  afterWalk(engine, p, tiles) {
    if (!isCeline(p) || !p.alive) return [];
    const recs = Flora.lay(engine.boardMap(), tiles, p.id, TRAIL_TURNS, { keep: true });
    if (!recs.length) return [];
    fx(engine, p, "trail", { tiles: recs.map((r) => ({ x: r.x, y: r.y })) });
    engine.sfx("celine_trail");
    return recs.map((r) => ({ k: r.k, undo: () => Flora.undo([r]) }));
  },
  // ดาบเล็ก: ตี/รอแล้วเดินต่อได้อีกรอบเต็มระยะ (ทำได้แค่เดิน/รอ — ไม่มี cantoSkill)
  cantoMov(engine, p) {
    if (!isCeline(p) || !weaponOf(p).canto) return 0;
    return engine.movOf(p);
  },

  // ---------- ตีปกติ ----------
  range(p) { return isCeline(p) ? RANGE[weaponOf(p).cls] : null; },
  critPct(p) { return isCeline(p) ? ownCrit(eng(), p) : 0; },
  critMult(p) { return kingOn(p) ? 3 : 2; },
  ownEvade(p) { return isCeline(p) ? weaponOf(p).evade || 0 : 0; },
  damageBonus(engine, attacker) { return isCeline(attacker) ? weaponOf(attacker).atk || 0 : 0; },
  attackStyle(p) { return isCeline(p) ? STYLE[st(p).weapon] : null; },
  attackSound(p) { return isCeline(p) ? `celine_atk_${st(p).weapon}` : undefined; },
  attackFxNames(attacker) {
    if (!isCeline(attacker)) return [];
    const w = weaponOf(attacker);
    return w.atk ? [`${w.name} +${w.atk}`] : [];
  },
  // ผลติดลงตอน resolve (ก่อนฉากตีเล่น) — เสียงส่งใน payload ให้ client เล่นตอนภาพถึงจังหวะปะทะ
  onStrikeLanded(engine, attacker, target) {
    if (!isCeline(attacker) || !target || !target.alive) return [];
    const w = weaponOf(attacker), out = [];
    if (w.burn && engine.applyBurn(target, w.burn) > 0) {
      out.push(`ลุกไหม้ ${w.burn}`);
      fx(engine, attacker, "burn", { targetId: target.id, at: target.pos ? { ...target.pos } : null, sound: "celine_fire_hit" });
    }
    if (w.shock && engine.applyShock(target, w.shock)) {
      out.push(`ช็อต ${w.shock}`);
      fx(engine, attacker, "shock", { targetId: target.id, at: target.pos ? { ...target.pos } : null, sound: "celine_thunder_hit" });
    }
    return out;
  },
  // ดาบใหญ่ / เวทย์ลม: ผลักหลังฉากตี (โดนเท่านั้น · ตาย/หลบ = ไม่ผลัก)
  afterBoardAttack(engine, attacker, target, res) {
    if (!isCeline(attacker)) return null;
    const w = weaponOf(attacker);
    if (!w.push || !res || res.dodge || !target || !target.alive) return null;
    return () => pushAfter(engine, attacker, target, w);
  },
  // ตีปกติติดคริ = คลิปคริก่อนฉากตี (สายดาบ / สายเวท) · ไม่ติด = เสียงพากย์ตอนตี (ติดคริไม่เล่น — ไม่ทับเสียงคลิป)
  preAttackClip(engine, attacker, card) {
    if (!isCeline(attacker) || !card) return null;
    const crit = !!card.crit || (card.extra || []).some((e) => e.crit);
    if (!crit) {
      engine.sfx(STRIKE_VOICE[Math.floor(Math.random() * STRIKE_VOICE.length)], null, { voice: attacker.id });
      return null;
    }
    return weaponOf(attacker).cls === "magic" ? CUT.critMage : CUT.critSword;
  },

  // ---------- สกิล ----------
  skillCost(p, tier, base, opts = {}) {
    if (!isCeline(p)) return base;
    if (tier === "basic") { const t = TENDER[opts.form]; return t ? t.cost : base; }
    if (tier === "secondary") return 0;
    return base;
  },
  skillArea(p, tier, area, opts = {}) {
    if (!isCeline(p)) return area;
    if (tier === "basic") {
      const t = TENDER[opts.form];
      if (!t) return area;
      if (opts.form === "wall") return { ...t.area, rect: ORIENTS[opts.orient] || ORIENTS.h };
      return t.area;
    }
    return area;
  },
  skillPub(p, tier) {
    if (!isCeline(p)) return null;
    const engine = eng(), s = st(p), r = engine.roundNumber, left = tenderLeft(engine, p);
    if (tier === "basic") {
      const cd = { heal: cdLeft(s.healReady, r), wall: cdLeft(s.wallReady, r), swap: cdLeft(s.swapReady, r), pair: cdLeft(s.swapReady, r), bloom: 0 };
      const count = { heal: HEAL_LIMIT - s.healCount, wall: WALL_LIMIT - s.wallCount };
      return {
        choices: TENDER_KEYS.map((k) => ({
          key: k, name: TENDER[k].short, img: ICON(ICON_OF[k]), desc: `${TENDER[k].name}: ${TENDER[k].desc}`, area: TENDER[k].area, cost: TENDER[k].cost,
          cd: cd[k], ...(count[k] != null ? { left: count[k] } : {}), locked: left <= 0 || cd[k] > 0,
          free: true, // ไม่กินโควตาสกิล — client ไม่ล็อกตัวเลือกหลังใช้ท่าไม้ตาย
        })),
      };
    }
    if (tier === "secondary") {
      return {
        choices: WEAPON_KEYS.map((k) => ({
          key: k, name: WEAPONS[k].name, img: ICON(k), desc: WEAPONS[k].desc, area: { kind: "self" }, cost: 0,
          on: s.weapon === k, locked: s.weapon === k, free: true,
        })),
      };
    }
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isCeline(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (!p.pos) return false;
    if (tier === "basic") {
      if (!TENDER[opts.form] || tenderLeft(engine, p) <= 0) return false;
      if (opts.form === "heal") {
        const t = engine.players[(targets || [])[0]];
        return cdLeft(s.healReady, r) === 0 && !!t && t.alive;
      }
      if (opts.form === "wall") return cdLeft(s.wallReady, r) === 0 && !!wallPlan(engine, p, opts.tile, opts.orient || "h", opts.dir);
      if (opts.form === "swap") {
        const t = engine.players[(targets || [])[0]];
        return cdLeft(s.swapReady, r) === 0 && !!t && t.id !== p.id && movable(engine, t) && movable(engine, p);
      }
      if (opts.form === "pair") {
        const [a, b] = (targets || []).map((id) => engine.players[id]);
        return cdLeft(s.swapReady, r) === 0 && !!a && !!b && a.id !== p.id && b.id !== p.id && movable(engine, a) && movable(engine, b);
      }
      if (opts.form === "bloom") return !!opts.tile && Flora.canBloom(engine.boardMap(), opts.tile.x, opts.tile.y);
      return false;
    }
    if (tier === "secondary") return !!WEAPONS[opts.form] && opts.form !== s.weapon;
    if (tier === "ultimate") return !kingOn(p) && cdLeft(s.ultReady, r) === 0;
    return false;
  },
  // ความอ่อนโยน/ความแข็งกร้าว: ไม่กินโควตาสกิล · ทุกช่องใช้แล้วยังเดินได้ (ท่าไม้ตายกินโควตา)
  skipsTurnQuota(p, tier) { return isCeline(p) && (tier === "basic" || tier === "secondary"); },
  ignoresTurnQuota(p, tier) { return isCeline(p) && (tier === "basic" || tier === "secondary"); },
  keepsMove(engine, p) { return isCeline(p); },
  // สลับอาวุธ: ไม่ขึ้นป้ายกลาง (เอฟเฟกต์บนตัวบอกแทน)
  silentFlash(p, tier) { return isCeline(p) && tier === "secondary"; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isCeline(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      if (s.tenderRound !== r) { s.tenderRound = r; s.tenderUsed = 0; }
      s.tenderUsed += 1;
      const form = opts.form;
      if (form === "heal") heal(engine, p, engine.players[targets[0]]);
      else if (form === "wall") wall(engine, p, opts.tile, opts.orient || "h", opts.dir);
      else if (form === "swap") swapUnits(engine, p, p, engine.players[targets[0]], "swap");
      else if (form === "pair") swapUnits(engine, p, engine.players[targets[0]], engine.players[targets[1]], "pair");
      else if (form === "bloom") bloomAt(engine, p, opts.tile);
      return ` — ${TENDER[form].name}`;
    }
    if (tier === "secondary") {
      s.weapon = opts.form;
      const w = weaponOf(p);
      fx(engine, p, "weapon", { weapon: s.weapon, cls: w.cls });
      engine.sfx(w.cls === "magic" ? "celine_weapon_magic" : "celine_weapon_sword");
      engine.log(`⚔️ ${p.name} ถือ${w.name}`);
      return "";
    }
    if (tier === "ultimate") {
      p.statuses[KING] = ULT_TURNS;
      p.statusAt = p.statusAt || {};
      s.ultReady = r + ULT_CD;
      fx(engine, p, "ult", {});
      engine.sfx("celine_ult");
      engine.notifyTransform(p, CUT.ult);
      engine.log(`👑 ${p.name} สวนดอกไม้ของฉัน — ราชาดอกไม้ ${ULT_TURNS} เทิร์น`);
      return "";
    }
    return "";
  },

  // ---------- จังหวะเทิร์น/ตาเดิน ----------
  // เวลาน้ำชา: ต้นเทิร์นยังยืนในพุ่ม = ฟื้น 1
  //  ราชาดอกไม้: ต้นเทิร์นแต้มสกิล +1 (ระหว่างบัฟ)
  onRoundStartTick(engine, p) {
    if (!isCeline(p) || !p.alive) return;
    if (kingOn(p)) {
      const before = p.skillPoints || 0;
      engine.addSkill(p, KING_SP, "passive");
      const got = (p.skillPoints || 0) - before;
      if (got > 0) engine.log(`👑 ${p.name} ราชาดอกไม้ — แต้มสกิล +${got}`);
    }
    // เวลาน้ำชา: ต้นเทิร์นยืนในพุ่มติดกัน 2 เทิร์น = ฟื้น 1 (ไม่ติดคริ) แล้วนับใหม่
    const s = st(p);
    if (!inBloom(engine, p)) { s.teaStreak = 0; return; }
    s.teaStreak += 1;
    if (s.teaStreak >= TEA_TURNS) { s.teaStreak = 0; teaTime(engine, p); }
  },
  onActorStart(engine, p) {
    if (!isCeline(p)) return;
    clearWalls(engine, p, "expire");
  },
  // จบตาโดยไม่ได้ยืนในพุ่ม = เวลาน้ำชานับใหม่
  onActorEnd(engine, p) {
    if (!isCeline(p) || !p.alive) return;
    if (!inBloom(engine, p)) st(p).teaStreak = 0;
  },
  // ถูกผลัก/กระเด็น/ดึง: ทางที่ถูกพาผ่านเกิดพุ่ม (ย้อนไม่ได้ · วาร์ปไม่เกิด) — ระบบกลาง Ice.forcedMoved
  onForcedMove(engine, u, tiles) {
    if (!isCeline(u) || !u.alive || !Array.isArray(tiles) || !tiles.length) return;
    const recs = Flora.lay(engine.boardMap(), tiles, u.id, TRAIL_TURNS, { keep: true });
    if (!recs.length) return;
    fx(engine, u, "trail", { tiles: recs.map((r) => ({ x: r.x, y: r.y })) });
    engine.sfx("celine_trail");
  },
  onDeath(engine, p) {
    if (!isCeline(p)) return;
    clearWalls(engine, p, "expire");
  },

  // ---------- ข้อมูลให้ client (สัญญา §2–§3) ----------
  celineState(engine, p) {
    if (!isCeline(p)) return undefined;
    const s = st(p), r = engine.roundNumber, w = weaponOf(p);
    return {
      weapon: s.weapon, weaponClass: w.cls, tenderLeft: tenderLeft(engine, p),
      healCount: s.healCount, healCd: cdLeft(s.healReady, r),
      wallCount: s.wallCount, wallCd: cdLeft(s.wallReady, r),
      swapCd: cdLeft(s.swapReady, r), ultCd: kingOn(p) ? 0 : cdLeft(s.ultReady, r),
      king: kingOn(p) ? p.statuses[KING] : 0, inBloom: inBloom(engine, p), tea: s.teaStreak, teaNeed: TEA_TURNS,
    };
  },
  skillLocks(engine, p) {
    if (!isCeline(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      basic: { cd: 0, locked: tenderLeft(engine, p) <= 0, free: true },
      secondary: { cd: 0, locked: false, free: true },
      ultimate: { cd: kingOn(p) ? 0 : cdLeft(s.ultReady, r), locked: kingOn(p) },
    };
  },
  boardPublic(engine) {
    const flora = Flora.publicInfo();
    const walls = engine.ice.wallsOf().map((k) => { const [x, y] = k.split(",").map(Number); const w = engine.board.spikes[k]; return { x, y, owner: w.owner }; });
    return flora.length || walls.length ? { celine: { flora, walls } } : {};
  },
};

// เวลาน้ำชา: ฟื้น 1 (ติดคริไม่ได้ — เนิฟ 2026-10-22)
function teaTime(engine, p) {
  const got = engine.healHp(p, TEA_HEAL) || 0;
  if (got <= 0) return;
  engine.log(`🫖 ${p.name} เวลาน้ำชา — พลังชีวิต +${got}`);
  if (p.pos) fx(engine, p, "tea", { amt: got, crit: false });
  engine.sfx("celine_tea");
}

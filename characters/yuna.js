// ============================================================
//  เด็กสาวเสื้อคลุมขาว (ยูนะ) — พิเศษ · id "yuna" (ผู้ใช้ส่งสเปก 2026-10-18)
//
//  ค่าพื้นฐาน: เลือด/เกราะมาตรฐาน · ระยะเดิน 4 · ตีประชิด [1, 1] (ร่างไอดอล: ระยะตีเท่าระยะเดิน)
//  วงเพลง = รัศมีระยะเดินปกติสูงสุด (แมนฮัตตัน) รอบตัว — เดินแล้ววงตามไป · ขี่อยู่ = รอบคนที่ถูกขี่ (Ride.centerOf)
//   duo/trio: บัฟได้พวกเรา (ตัวเอง + เพื่อนร่วมทีม) · ดีบัฟลงศัตรู (ผู้ใช้ตัดสิน 2026-10-18)
//   ffa: ผลดีได้ทุกคนในวง · ผลเสียลงทุกคนในวงยกเว้นยูนะ (ผู้ใช้สั่ง 2026-10-19 — เดิมบัฟได้แค่ยูนะ) · ออกนอกวง = ไม่ได้อะไร
//
//  สกิลพื้นฐาน คำอวยพรสุดท้าย (0 แต้ม · 1 ครั้งต่อเกม): เลือกศพในระยะเดิน (area tile place "corpse") ฟื้นด้วยพลังชีวิต 3 เกราะ 0
//    + พลังโจมตี +1 (สถานะ yunaBless) และต้านสถานะ 3 เทิร์น · ฟื้นแล้วได้เดินเทิร์นนี้ (action.joinOrder — ผู้ใช้ตัดสิน)
//    · ffa ฟื้นใครก็ได้ (ผู้ใช้ตัดสิน) — โหมดทีมก็ฟื้นใครก็ได้เช่นกัน (Claude ตัดสิน · ยังไม่ได้ถาม)
//    · เพลง Longing เล่นจากตอนฟื้นจนคนนั้นตายอีกครั้งหรือบัฟหมด
//    ใช้แล้ว (หรือทำงานเองตอนตาย) ปุ่มกลายเป็น "เป็นส่วนหนึ่งของเงา" (3 แต้ม · ร่างปกติเท่านั้น — ผู้ใช้สั่ง 2026-10-18):
//    เทิร์นถัดไปทั้งเทิร์น = "เงาของเสียง" หายตัว — ศัตรูมองไม่เห็น/เล็งไม่ได้ · ไม่มีดาเมจ/ดีบัฟจากคนอื่นแตะได้ (ฮุค untouchable)
//    · ยังเดิน/ใช้สกิล/ตีได้ (ไม่ปรากฏตัว) · วงเพลงไม่ทำงานและไม่เสียค่าเพลง (ผู้ใช้ตัดสิน)
//  สกิลรอง บทเพลงแห่งชีวิต (0 แต้ม · ปุ่มหลายตัวเลือก): Delete / Smile for You / พักผ่อน (ค่าเริ่มต้น)
//    ไม่นับเป็นการใช้สกิล · ยังเดินได้ (Claude ตัดสิน — แบบสลับอาวุธของเอมิลิโกะ) · ใช้ระหว่างร้อนแรงดังไฟไม่ได้
//    เปิดเพลง = จบเทิร์นเสียแต้มสกิล 2 (ผู้ใช้สั่ง 2026-10-19 — เดิม 1) · ไม่พอ = เพลงหยุด กลับพักผ่อน ไม่ได้ผลเทิร์นนั้น
//    Delete: ศัตรูในวงได้รับความเสียหาย +1 ทุกแบบ (ฮุค auraIncoming) · พวกเราในวงฟื้นแต้มสกิล +1 ตอนจบเทิร์น
//    Smile for You: พวกเราในวงได้รับความเสียหาย −1 ทุกแบบ (ลดถึง 0 ได้ — ผู้ใช้ตัดสิน) · ฟื้นพลังชีวิต 1 ตอนจบเทิร์น
//  ท่าไม้ตาย ร้อนแรงดังไฟ (8 แต้ม): คลิป yuna_skill3.mp4 → เพลง Break Beat Bark! (intro → loop) · ร่าง "ยูนะ ไอดอล" 5 เทิร์น (รวมเทิร์นที่กด)
//    ชื่อบนจอเป็น "ยูนะ" + ปกเป็นรูปไอดอล (ฮุค characterPub) · ปิดบทเพลงแห่งชีวิต · ระยะตี [1, ระยะเดิน]
//    พวกเราในวงพลังโจมตี +1 (ยูนะ +2 — ฮุค auraAtk) · แม่นยำ (ฮุค auraAccurate) · ฟื้นแต้มสกิล +1 ตอนจบเทิร์น
//    หมดแล้วกลับร่าง · คูลดาวน์ 3 เทิร์นเต็ม (ผู้ใช้ตัดสิน) · ใช้ระหว่างเงาของเสียง (รอ/ทำงาน) ไม่ได้ (Claude ตัดสิน)
//  สกิลติดตัว เสียงอันไพเราะ:
//    - ระหว่างที่ยูนะยังอยู่ ทุกคนที่ตายทิ้งศพไว้ (ฮุค keepsCorpses — server/duo.js) ขวางทาง เดินข้ามได้ (ผู้ใช้ตัดสิน) · ยูนะตาย = ศพหาย
//    - ขี่ผู้เล่นที่อยู่ติดกันเมื่ออีกฝ่ายยินยอม (server/ride.js — ฮุค canRide) · ถูกโจมตีไม่ได้ · สกิลพื้นที่โดนแค่คนที่ถูกขี่
//      เดินออก = ลง · คนที่ถูกขี่ถูกโจมตี = ร่วงลงข้างๆ และขี่ไม่ได้ 3 เทิร์น (สถานะ yunaNoRide)
//      คนที่ถูกขี่สั่งให้ลงได้ในตาของตัวเอง (socket rideDrop · ไม่ติดห้ามขี่ — ผู้ใช้ตัดสิน 2026-10-19)
//    - ตายโดยยังไม่ใช้คำอวยพรสุดท้าย = ทำงานกับตัวเอง (ฮุค preventDeath) ได้ผลเหมือนฟื้นคนอื่นทุกอย่าง (ผู้ใช้ตัดสิน)
// ============================================================

const ID = "yuna";
const DIR = "/characters/yuna";
// ไฟล์จากผู้ใช้ (Downloads/yuna_new — 2026-10-18) · yuna.webp = yuna_normal.png · yuna_idol.webp = yuna.png (ลดขนาด)
const IMG = {
  base: `${DIR}/yuna.webp`,
  idol: `${DIR}/yuna_idol.webp`,
  bless: `${DIR}/yuna_skill1.webp`,
  shadow: `${DIR}/yuna_skill1_2.webp`,
  song: `${DIR}/yuna_skill2.webp`,
  ult: `${DIR}/yuna_skill3.webp`,
};
const VIDEO = { ult: `${DIR}/yuna_skill3.mp4` };
const CUT = { ult: "yunaIdol" };
// เพลง (คีย์ใน client/src/audio.js) — ผู้ใช้ส่งมาทั้งหมด
const MUSIC = { delete: "yuna_delete", smile: "yuna_smile", idol: "yuna_idol", longing: "yuna_longing" };
// เสียง (client/src/audio.js — ไฟล์อยู่ client/public/characters/yuna/sfx/ · สังเคราะห์ด้วย ffmpeg)
const SFX = {
  hit: "yuna_hit",             // ตีปกติ (โน้ตเพลง)
  idolHit: "yuna_idol_hit",    // ตีปกติร่างไอดอล (สปอตไลต์)
  bless: "yuna_bless",         // คำอวยพรสุดท้าย (ฟื้นคืนชีพ)
  shadow: "yuna_shadow",       // เป็นส่วนหนึ่งของเงา (กด)
  vanish: "yuna_vanish",       // เงาของเสียงเริ่ม (หายตัว)
  appear: "yuna_appear",       // เงาของเสียงจบ (ปรากฏตัว)
  songDelete: "yuna_song_delete",
  songSmile: "yuna_song_smile",
  songRest: "yuna_song_rest",
  tick: "yuna_song_tick",      // จบเทิร์น: วงเพลงทำงาน (ฟื้นแต้ม/พลังชีวิต)
  stop: "yuna_song_stop",      // แต้มไม่พอ เพลงหยุด
  idol: "yuna_idol_cast",      // ร้อนแรงดังไฟ (กด)
  idolEnd: "yuna_idol_end",    // กลับร่าง
  rideAsk: "yuna_ride_ask",
  rideNo: "yuna_ride_no",
  mount: "yuna_mount",
  fall: "yuna_fall",
};

const BLESS_HP = 3;
const BLESS_TURNS = 3;
const BLESS_ATK = 1;
const SHADOW_COST = 3;
const SONG_COST = 2; // ค่าเพลงต่อเทิร์น (ผู้ใช้สั่ง 2026-10-19 — เดิม 1)
const SONG_KEYS = ["delete", "smile", "rest"];
const SONG_NAME = { delete: "Delete", smile: "Smile for You", rest: "พักผ่อน" };
const SONG_IMG = { delete: IMG.bless, smile: IMG.shadow, rest: IMG.base };
// คำอธิบายตอนชี้เมาส์บนตัวเลือก (ผู้ใช้สั่ง 2026-10-19 — ทุกสกิลแบบเลือกต้องมี)
const SONG_DESC = {
  delete: `วงรอบตัว (ระยะเดิน): ศัตรูในวงได้รับความเสียหาย +1 ทุกแบบ · พวกเราในวงฟื้นแต้มสกิล +1 ตอนจบเทิร์น (ffa: ทุกคนในวงได้ทั้งสองอย่าง ยกเว้นยูนะไม่โดนความเสียหาย +1) · จบเทิร์นเสียแต้มสกิล ${SONG_COST} (ไม่พอ = เพลงหยุด)`,
  smile: `วงรอบตัว (ระยะเดิน): พวกเราในวงได้รับความเสียหาย −1 ทุกแบบ · ฟื้นพลังชีวิต 1 ตอนจบเทิร์น (ffa: ทุกคนในวง) · จบเทิร์นเสียแต้มสกิล ${SONG_COST} (ไม่พอ = เพลงหยุด)`,
  rest: "หยุดร้องเพลง · ไม่เสียแต้มสกิล",
};
const ULT_TURNS = 5;
const ULT_CD = 3;
const ULT_ATK = 1;     // พวกเราในวง
const ULT_ATK_SELF = 2;
const NO_RIDE_TURNS = 3;

// ฝั่ง server — require ตอนเรียก (characters/index ← โมดูลนี้ ← server วนกัน)
function E() { return require("../server/engine").engine; }

const isYuna = (p) => !!p && p.characterId === ID;
function fresh() {
  return {
    song: "rest",
    songAt: 0,       // ลำดับการเปิดเพลงล่าสุด (เพลงเริ่มใหม่จากต้น)
    blessUsed: false,
    ultUntil: 0,     // ร้อนแรงดังไฟมีผลถึงเทิร์นนี้ (รวม) — 0 = ไม่มีผล
    ultReady: 0,     // กดท่าไม้ตายได้อีกตั้งแต่เทิร์นนี้
    ultAt: 0,
    vanishRound: 0,  // เงาของเสียงทำงานเทิร์นนี้
  };
}
function st(p) { return p.yuna || (p.yuna = fresh()); }
const ultOn = (engine, p) => isYuna(p) && p.alive && st(p).ultUntil > 0 && engine.roundNumber <= st(p).ultUntil;
const ultLeft = (engine, p) => (ultOn(engine, p) ? st(p).ultUntil - engine.roundNumber + 1 : 0);
const ultCdLeft = (engine, p) => (isYuna(p) && !ultOn(engine, p) ? Math.max(0, st(p).ultReady - engine.roundNumber) : 0);
const vanishOn = (engine, p) => isYuna(p) && p.alive && st(p).vanishRound === engine.roundNumber;
const vanishPending = (engine, p) => isYuna(p) && st(p).vanishRound > engine.roundNumber;
// เพลงที่ทำงานจริงตอนนี้ (ไม่ใช่ไอดอล · ไม่หายตัว) — "delete" | "smile" | null
function songOn(engine, p) {
  if (!isYuna(p) || !p.alive || ultOn(engine, p) || vanishOn(engine, p)) return null;
  const s = st(p).song;
  return s === "delete" || s === "smile" ? s : null;
}
// วงที่ทำงาน: "delete" | "smile" | "idol" | null
function auraKind(engine, p) {
  if (!isYuna(p) || !p.alive || vanishOn(engine, p)) return null;
  return ultOn(engine, p) ? "idol" : songOn(engine, p);
}
const centerOf = (engine, p) => engine.ride.centerOf(p);
const radiusOf = (engine, p) => engine.baseMovOf(p);
// u อยู่ในวงของยูนะ p ไหม (ตัวใหญ่นับขอบตัว)
function inCircle(engine, p, u) {
  const c = centerOf(engine, p), at = centerOf(engine, u);
  if (!c || !at || !u.alive) return false;
  if (u.id === p.id) return true;
  const n = engine.sizeOf(u) || 1;
  const dx = Math.max(0, at.x - c.x, c.x - (at.x + n - 1));
  const dy = Math.max(0, at.y - c.y, c.y - (at.y + n - 1));
  return dx + dy <= radiusOf(engine, p);
}
const allyOf = (engine, p, u) => u.id === p.id || engine.sameTeam(p, u);
// ใครได้ผลดี / ผลเสียของวงยูนะ p — duo/trio: พวกเรา / ศัตรู · ffa: ผลดีทุกคน · ผลเสียทุกคนยกเว้นยูนะเอง
const getsGood = (engine, p, u) => (engine.teamModeActive() ? allyOf(engine, p, u) : true);
const getsBad = (engine, p, u) => (engine.teamModeActive() ? !allyOf(engine, p, u) : u.id !== p.id);
const yunas = (engine) => Object.values(engine.players).filter((p) => isYuna(p) && p.alive);
// คนในวงของ p ที่ได้ผลดี (good = true) / ผลเสีย — คนที่หายตัวด้วยเงาของเสียงไม่โดนผลเสีย
function circleUnits(engine, p, good) {
  return Object.values(engine.players).filter((u) => u.alive && inCircle(engine, p, u)
    && (good ? getsGood(engine, p, u) : getsBad(engine, p, u) && !vanishOn(engine, u)));
}

// ---------- ศพ ----------
function corpseAt(engine, tile) {
  if (!tile) return null;
  return Object.values(engine.players).find((d) => !d.alive && d.corpse && d.corpse.x === tile.x && d.corpse.y === tile.y && engine.corpseKept(d)) || null;
}
function corpsesInRange(engine, p) {
  const c = p.pos;
  if (!c) return [];
  const r = radiusOf(engine, p);
  return Object.values(engine.players).filter((d) => !d.alive && d.corpse && engine.corpseKept(d) && Math.abs(d.corpse.x - c.x) + Math.abs(d.corpse.y - c.y) <= r);
}
// บัฟของคำอวยพรสุดท้าย (ทั้งฟื้นคนอื่นและฟื้นตัวเอง)
function bless(engine, t) {
  t.statuses = {};
  t.statusAmt = {};
  t.statuses.yunaBless = BLESS_TURNS;
  engine.applyBuff(t, "resist", null, BLESS_TURNS);
  t.yunaBlessAt = engine.nextTransformCounter(); // เพลง Longing (เริ่มใหม่จากต้นทุกครั้ง)
}
function revive(engine, p, d) {
  const spot = { ...d.corpse };
  d.corpse = null; // ไม่นับร่างตัวเองตอนหาที่
  const to = engine.tileFree(spot.x, spot.y, d.id) ? spot : engine.nearFreeTile(spot, d.id);
  if (!to) { d.corpse = spot; return false; }
  d.alive = true;
  d.result = null;
  d.hp = Math.min(BLESS_HP, engine.maxHpOf(d));
  d.armor = 0;
  d.shield = 0;
  d.tempHp = 0; d.tempHpTurns = 0;
  d.mountId = null;
  d.wasAttacked = false;
  d.pos = { x: to.x, y: to.y };
  bless(engine, d);
  engine.joinOrder(d.id); // ได้เดินเทิร์นนี้ (ผู้ใช้ตัดสิน)
  engine.log(`🕊️ ${p.name} คำอวยพรสุดท้าย — ${d.name} ฟื้นคืนชีพ (พลังชีวิต ${d.hp} · พลังโจมตี +${BLESS_ATK} · ต้านสถานะ ${BLESS_TURNS} เทิร์น)`);
  engine.boardFx("yunaFx", { kind: "revive", by: p.id, id: d.id, at: { ...to }, from: p.pos ? { ...p.pos } : null, color: engine.colorOf(p) });
  return true;
}

// ---------- ข้อมูลออร่าให้ client (วาดวง) ----------
function auraPub(engine, p) {
  const kind = auraKind(engine, p), c = centerOf(engine, p);
  return kind && c ? { kind, x: c.x, y: c.y, r: radiusOf(engine, p) } : null;
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, MUSIC, SFX, BLESS_HP, BLESS_TURNS, BLESS_ATK, SHADOW_COST, SONG_COST, ULT_TURNS, ULT_CD, ULT_ATK, ULT_ATK_SELF, NO_RIDE_TURNS,
  isYuna, ultOn, vanishOn, songOn, auraKind, inCircle,

  resetCombat(p) {
    p.yuna = isYuna(p) ? fresh() : null;
    p.yunaBlessAt = 0;
    p.mountId = null;
    p.lastRidePos = null;
  },
  displayImg(p) { return ultOn(E(), p) ? IMG.idol : null; },
  // ชื่อ/ปกบนจอระหว่างร้อนแรงดังไฟ (view.buildStateFor → character.name / character.img)
  characterPub(engine, p) { return ultOn(engine, p) ? { name: "ยูนะ", img: IMG.idol } : null; },

  // ---------- ตีปกติ ----------
  range(p) { const e = E(); return ultOn(e, p) ? [1, e.baseMovOf(p)] : null; },
  attackStyle(p) { if (!isYuna(p)) return null; return ultOn(E(), p) ? "yunaIdol" : "yunaNote"; },
  attackSound(p) { if (!isYuna(p)) return undefined; return ultOn(E(), p) ? SFX.idolHit : SFX.hit; },

  // ---------- ออร่า (ฮุคกลาง — ถูกถามกับทุกคน) ----------
  // พลังโจมตี: ร้อนแรงดังไฟ (คนที่ได้ผลดีในวง +1 · ยูนะ +2) + คำอวยพรสุดท้าย (+1 ระหว่างบัฟ)
  auraAtk(engine, attacker) {
    let amount = 0;
    const names = [];
    for (const p of yunas(engine)) {
      if (!ultOn(engine, p) || vanishOn(engine, p) || !getsGood(engine, p, attacker) || !inCircle(engine, p, attacker)) continue;
      const n = attacker.id === p.id ? ULT_ATK_SELF : ULT_ATK;
      if (n > amount) amount = n;
    }
    if (amount) names.push(`ร้อนแรงดังไฟ +${amount}`);
    const blessed = ((attacker.statuses && attacker.statuses.yunaBless) || 0) > 0;
    if (blessed) { amount += BLESS_ATK; names.push(`คำอวยพรสุดท้าย +${BLESS_ATK}`); }
    return amount ? { amount, name: names.join(" · "), img: IMG.ult } : null;
  },
  auraAccurate(u) {
    const engine = E();
    return yunas(engine).some((p) => ultOn(engine, p) && !vanishOn(engine, p) && getsGood(engine, p, u) && inCircle(engine, p, u));
  },
  // ความเสียหายที่ได้รับ: Delete (คนที่โดนผลเสียในวง +1) · Smile for You (คนที่ได้ผลดีในวง −1) — ไม่ซ้อนกันเองข้ามหลายยูนะ
  auraIncoming(engine, t) {
    let up = 0, down = 0;
    for (const p of yunas(engine)) {
      const s = songOn(engine, p);
      if (!s || !inCircle(engine, p, t)) continue;
      if (s === "delete" && getsBad(engine, p, t) && !vanishOn(engine, t)) up = 1;
      if (s === "smile" && getsGood(engine, p, t)) down = 1;
    }
    return up - down;
  },

  // ---------- เงาของเสียง ----------
  stealthed(p) { return vanishOn(E(), p); },
  onReveal() {}, // หายตัวทั้งเทิร์น — ไม่ปรากฏตัวจากการลงมือ/โดนพื้นที่/ถูกชน
  untouchable(engine, p) { return vanishOn(engine, p); },

  // ---------- ศพค้าง / ขี่ (server/duo.js · server/ride.js) ----------
  keepsCorpses(p) { return isYuna(p); },
  canRide(engine, p) {
    if (!isYuna(p)) return false;
    return !(((p.statuses && p.statuses.yunaNoRide) || 0) > 0) && !vanishOn(engine, p) && !vanishPending(engine, p);
  },
  rideSound(p, kind) { return kind === "ask" ? SFX.rideAsk : SFX.rideNo; },
  onMount(engine, p, m, from) {
    engine.boardFx("yunaFx", { kind: "mount", id: p.id, on: m.id, from, to: { ...m.pos }, color: engine.colorOf(p) });
    engine.sfx(SFX.mount);
  },
  // ร่วง: ถูกโจมตี/คนที่ถูกขี่ตาย = ขี่ไม่ได้ 3 เทิร์น · ถูกสั่งให้ลง ("drop") = ขี่ใหม่ได้ทันที (ผู้ใช้ตัดสิน 2026-10-19)
  onFall(engine, p, reason, base) {
    if (!isYuna(p)) return;
    if (reason !== "drop") {
      p.statuses.yunaNoRide = NO_RIDE_TURNS;
      engine.log(`💫 ${p.name} ขี่ใครไม่ได้ ${NO_RIDE_TURNS} เทิร์น`);
    }
    if (p.pos) engine.boardFx("yunaFx", { kind: "fall", id: p.id, from: base ? { ...base } : null, to: { ...p.pos }, color: engine.colorOf(p) });
    engine.sfx(SFX.fall);
  },

  // ---------- ตายแล้วฟื้นเอง (คำอวยพรสุดท้ายที่ยังไม่ได้ใช้) ----------
  preventDeath(engine, p) {
    if (!isYuna(p)) return false;
    const s = st(p);
    if (s.blessUsed) return false;
    s.blessUsed = true;
    p.hp = Math.min(BLESS_HP, engine.maxHpOf(p));
    bless(engine, p);
    engine.log(`🕊️ ${p.name} คำอวยพรสุดท้าย — ฟื้นคืนชีพตัวเอง (พลังชีวิต ${p.hp} · พลังโจมตี +${BLESS_ATK} · ต้านสถานะ ${BLESS_TURNS} เทิร์น)`);
    engine.skillFlash({ name: "คำอวยพรสุดท้าย", img: IMG.bless, by: p.name, color: engine.colorOf(p), sound: SFX.bless });
    const at = engine.ride.centerOf(p);
    if (at) engine.boardFx("yunaFx", { kind: "revive", by: p.id, id: p.id, at: { ...at }, from: null, color: engine.colorOf(p) });
    return true;
  },
  // ยูนะตาย: ร่างของทุกคนหาย (ไม่มีคนเก็บร่างแล้ว — server/duo.js onDeath จัดการ) · เพลงหยุดเอง (activeSkillMusic อ่านคนที่ยังอยู่)
  onDeath() {},

  // ---------- สกิล ----------
  skillCost(p, tier, base) {
    if (!isYuna(p)) return base;
    if (tier === "basic") return st(p).blessUsed ? SHADOW_COST : base;
    return base;
  },
  skillArea(p, tier, area) {
    if (!isYuna(p)) return area;
    if (tier === "basic" && st(p).blessUsed) return { kind: "self" };
    return area;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isYuna(p)) return true;
    const s = st(p);
    if (tier === "basic") {
      if (!s.blessUsed) return !!corpseAt(engine, opts.tile);
      return !ultOn(engine, p) && !vanishOn(engine, p) && !vanishPending(engine, p) && !engine.ride.riding(p);
    }
    if (tier === "secondary") return SONG_KEYS.includes(opts.form) && opts.form !== s.song && !ultOn(engine, p);
    if (tier === "ultimate") return !ultOn(engine, p) && engine.roundNumber >= s.ultReady && !vanishOn(engine, p) && !vanishPending(engine, p);
    return false;
  },
  // บทเพลงแห่งชีวิต = สลับเพลง: ไม่นับเป็นการใช้สกิล และยังเดินได้
  skipsTurnQuota(p, tier) { return isYuna(p) && tier === "secondary"; },
  ignoresTurnQuota(p, tier) { return isYuna(p) && tier === "secondary"; },
  keepsMove(engine, p, tier) { return isYuna(p) && tier === "secondary"; },
  skillSound(p, tier, opts = {}) {
    if (!isYuna(p)) return null;
    if (tier === "basic") return st(p).lastBasic === "shadow" ? SFX.shadow : SFX.bless; // เรียกหลังลงผล — อ่านท่าที่เพิ่งใช้
    if (tier === "secondary") return opts.form === "delete" ? SFX.songDelete : opts.form === "smile" ? SFX.songSmile : SFX.songRest;
    if (tier === "ultimate") return SFX.idol;
    return null;
  },
  skillPub(p, tier) {
    if (!isYuna(p)) return null;
    const s = st(p);
    if (tier === "basic" && s.blessUsed) {
      return {
        name: "เป็นส่วนหนึ่งของเงา", img: IMG.shadow, cost: SHADOW_COST, area: { kind: "self" }, flash: true,
        desc: "ร่างปกติเท่านั้น: เทิร์นถัดไปได้ “เงาของเสียง” 1 เทิร์น — หายตัว ศัตรูมองไม่เห็นและเล็งไม่ได้ ไม่ได้รับความเสียหายและดีบัฟจากคนอื่น ยังเดิน ใช้สกิล และตีได้ · วงเพลงไม่ทำงาน",
      };
    }
    if (tier === "secondary") {
      return { choices: SONG_KEYS.map((k) => ({ key: k, name: SONG_NAME[k], img: SONG_IMG[k], desc: SONG_DESC[k], cost: 0, area: { kind: "self" }, active: s.song === k })) };
    }
    return null;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isYuna(p)) return "";
    const s = st(p);
    if (tier === "basic") {
      if (!s.blessUsed) {
        const d = corpseAt(engine, opts.tile);
        if (!d || !revive(engine, p, d)) return "";
        s.blessUsed = true;
        s.lastBasic = "bless";
        return ` — ${d.name}`;
      }
      s.vanishRound = engine.roundNumber + 1;
      s.lastBasic = "shadow";
      engine.log(`🌫️ ${p.name} เป็นส่วนหนึ่งของเงา — เทิร์นหน้าหายตัว`);
      engine.boardFx("yunaFx", { kind: "shadowCast", id: p.id, at: p.pos ? { ...p.pos } : null, color: engine.colorOf(p) });
      return "";
    }
    if (tier === "secondary") {
      s.song = opts.form;
      s.songAt = engine.nextTransformCounter();
      engine.log(s.song === "rest" ? `🎵 ${p.name} หยุดร้องเพลง` : `🎵 ${p.name} บทเพลงแห่งชีวิต — ${SONG_NAME[s.song]}`);
      const at = centerOf(engine, p);
      if (at) engine.boardFx("yunaFx", { kind: "song", id: p.id, song: s.song, at: { ...at }, r: radiusOf(engine, p), color: engine.colorOf(p) });
      return ` — ${SONG_NAME[s.song]}`;
    }
    if (tier === "ultimate") {
      s.ultUntil = engine.roundNumber + ULT_TURNS - 1;
      s.ultReady = s.ultUntil + 1 + ULT_CD;
      s.ultAt = engine.nextTransformCounter();
      s.song = "rest";
      engine.queueCutscene(p, CUT.ult);
      engine.log(`🔥 ${p.name} ร้อนแรงดังไฟ — ยูนะ ไอดอล ${ULT_TURNS} เทิร์น`);
      const at = centerOf(engine, p);
      if (at) engine.boardFx("yunaFx", { kind: "idol", id: p.id, at: { ...at }, r: radiusOf(engine, p), color: engine.colorOf(p) });
      return "";
    }
    return "";
  },

  // ---------- ต้นเทิร์น: เงาของเสียงเริ่ม ----------
  onRoundStartTick(engine, p) {
    if (!vanishOn(engine, p)) return;
    engine.log(`🌫️ ${p.name} เงาของเสียง — หายตัว`);
    if (p.pos) engine.boardFx("yunaFx", { kind: "vanish", id: p.id, at: { ...p.pos }, color: engine.colorOf(p) });
    engine.sfx(SFX.vanish);
  },
  // ---------- จบเทิร์น: ค่าเพลง + ผลของวง · ไอดอลหมด · เงาของเสียงจบ ----------
  onEndTurn(engine) {
    for (const p of yunas(engine)) {
      const s = st(p);
      if (s.vanishRound === engine.roundNumber) {
        engine.log(`🎶 ${p.name} ปรากฏตัวจากเงา`);
        const at = centerOf(engine, p);
        if (at) engine.boardFx("yunaFx", { kind: "appear", id: p.id, at: { ...at }, color: engine.colorOf(p) });
        engine.sfx(SFX.appear);
        continue; // หายตัว = วงไม่ทำงาน ไม่เสียค่าเพลง
      }
      if (ultOn(engine, p)) {
        const got = [];
        for (const u of circleUnits(engine, p, true)) {
          const before = u.skillPoints;
          engine.addSkill(u, 1);
          if (u.skillPoints > before) got.push(u.name);
        }
        if (got.length) { engine.log(`🔥 ร้อนแรงดังไฟ — แต้มสกิล +1 (${got.join(", ")})`); engine.sfx(SFX.tick); }
        if (s.ultUntil === engine.roundNumber) {
          engine.log(`🔥 ${p.name} ร้อนแรงดังไฟหมดเวลา — กลับร่าง (คูลดาวน์ ${ULT_CD} เทิร์น)`);
          const at = centerOf(engine, p);
          if (at) engine.boardFx("yunaFx", { kind: "idolEnd", id: p.id, at: { ...at }, color: engine.colorOf(p) });
          engine.sfx(SFX.idolEnd);
        }
        continue;
      }
      if (s.song !== "delete" && s.song !== "smile") continue;
      if ((p.skillPoints || 0) < SONG_COST) {
        s.song = "rest";
        engine.log(`🎵 ${p.name} แต้มสกิลไม่พอ — เพลงหยุด`);
        engine.sfx(SFX.stop);
        continue;
      }
      p.skillPoints -= SONG_COST;
      const done = [];
      for (const u of circleUnits(engine, p, true)) {
        if (s.song === "delete") {
          const before = u.skillPoints;
          engine.addSkill(u, 1);
          if (u.skillPoints > before) done.push(u.name);
        } else if (engine.healHp(u, 1) > 0) done.push(u.name);
      }
      engine.log(`🎵 ${SONG_NAME[s.song]} — ${p.name} แต้มสกิล −${SONG_COST}${done.length ? ` · ${s.song === "delete" ? "แต้มสกิล" : "พลังชีวิต"} +1 (${done.join(", ")})` : ""}`);
      const at = centerOf(engine, p);
      if (at) engine.boardFx("yunaFx", { kind: "tick", id: p.id, song: s.song, at: { ...at }, r: radiusOf(engine, p), ids: circleUnits(engine, p, true).map((u) => u.id) });
      engine.sfx(SFX.tick);
    }
  },

  // ---------- เพลง (view.activeSkillMusic — ฮุค skillMusic ถูกถามกับทุกคนที่ยังอยู่) → { music, at } | null ----------
  //  ไอดอล (Break Beat Bark! intro → loop) > เพลงที่เปิด (Delete / Smile for You) · Longing = คนที่ได้คำอวยพรสุดท้ายยังมีบัฟอยู่
  //  หลายเพลงพร้อมกัน = เพลงที่เริ่มล่าสุด (at มากสุด — view เลือกเอง)
  skillMusic(engine, p) {
    if (!p.alive) return null;
    if (isYuna(p)) {
      if (ultOn(engine, p)) return { music: MUSIC.idol, at: st(p).ultAt || 0 };
      const s = songOn(engine, p);
      if (s) return { music: MUSIC[s], at: st(p).songAt || 0 };
    }
    if (((p.statuses && p.statuses.yunaBless) || 0) > 0 && p.yunaBlessAt) return { music: MUSIC.longing, at: p.yunaBlessAt };
    return null;
  },

  // ---------- ข้อมูลให้ client ----------
  yunaState(engine, p) {
    if (!isYuna(p)) return undefined;
    const s = st(p);
    return {
      song: s.song, aura: auraPub(engine, p), idol: ultLeft(engine, p), ultCd: ultCdLeft(engine, p),
      vanish: vanishOn(engine, p), vanishNext: vanishPending(engine, p), blessUsed: s.blessUsed,
      noRide: (p.statuses && p.statuses.yunaNoRide) || 0, canRide: module.exports.canRide(engine, p) && !engine.ride.riding(p),
    };
  },
  skillLocks(engine, p) {
    if (!isYuna(p)) return undefined;
    const s = st(p);
    const basic = s.blessUsed
      ? ultOn(engine, p) || vanishOn(engine, p) || vanishPending(engine, p) || engine.ride.riding(p)
      : !corpsesInRange(engine, p).length;
    const ultCd = ultCdLeft(engine, p);
    return {
      basic: { locked: basic },
      secondary: { locked: ultOn(engine, p), free: true },
      ultimate: { locked: ultOn(engine, p) || ultCd > 0 || vanishOn(engine, p) || vanishPending(engine, p), ...(ultCd > 0 ? { cooldown: ultCd } : {}) },
    };
  },
};

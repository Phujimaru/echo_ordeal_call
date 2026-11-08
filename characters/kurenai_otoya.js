// ============================================================
//  คุเรไน โอโตยะ (Kamen Rider Kiva — Dark Kiva) — ระดับยาก · id "kurenai_otoya"
//  สเปกผู้ใช้ 2026-11-08 · GRID_PLAN §7.29
//
//  ค่าพื้นฐาน (ผู้ใช้: ค่าเริ่มต้น): พลังชีวิต 7 / เกราะ 3 / พลังโจมตี 1 · ระยะเดิน 4 · ตีประชิด [1, 1]
//  ชุดสกิลแยกตามร่าง (ผู้ใช้ยืนยัน): ร่างปกติ = ปากหวาน + ดนตรีในหัวใจ · ร่าง Dark Kiva = หลุมพราง + จงตื่นขึ้น
//
//  ร่างปกติ
//   สกิลพื้นฐาน ปากหวาน (2 · คูลดาวน์ 2): ฟื้นพลังชีวิตตัวเอง = 1 + จำนวนตัวละครหญิงที่ยังอยู่ในเกม (ทุกฝ่าย)
//     ไม่มีเลย 1 · 1 คน 2 · 2 คนขึ้นไป 3 (ผู้ใช้: สูงสุดไม่เกิน 3 — 2026-11-08)
//     นับยูนิตที่ถูกเรียกเฉพาะฮาคุโนะ (ร่างแยก/ตัวเหมือนของวาเลนไทน์ไม่นับ — Claude ตัดสิน)
//   สกิลรอง ดนตรีในหัวใจ (4): สีไวโอลินมอบบัฟให้ 1 คนในระยะ 8 (แมนฮัตตัน ทะลุทุกอย่าง — แค่เลือกเป้า)
//     ffa ใครก็ได้ · duo/trio/Moon Cell เพื่อนร่วมทีมเท่านั้น · ไม่รวมตัวเอง
//     บัฟ: พลังโจมตี +1 · เยียวยา 1/เทิร์น · คริติคอล +25% · แต้มสกิล +1/เทิร์น — อยู่ตราบที่ยังไม่ยกเลิก
//     ระหว่างสี: เดิน/ตีปกติ/ใช้สกิลอื่นไม่ได้ (ใช้ไอเทมกับกดยกเลิกได้) · ยกเลิกฟรี ไม่กินโควตา แล้วทำอย่างอื่นต่อได้
//     จบเอง: เป้าออกนอกระยะ · เป้าตาย · โอโตยะตาย · โอโตยะติดสตั้น/หลับใหล (เป้าติดสตั้น = บัฟยังอยู่)
//     จบแล้ว (ทุกทาง) คูลดาวน์ 3 เทิร์น · เพลง 渡 (ไฟล์ผู้ใช้) เล่นค้างตลอดที่สี
//
//  ท่าไม้ตาย ขอแรงหน่อยสิเจ้าค้างคาว (0 · 3 ครั้งต่อเกม): แปลงร่าง Dark Kiva 2 เทิร์น (รวมเทิร์นที่กด)
//     พลังโจมตี +2 · ระยะเดิน +1 · เปิดสกิลติดตัว 2 · กดซ้ำ/คืนร่างเองไม่ได้ระหว่างที่ยังมีผล
//     ไม่กินโควตาสกิล + ยังเดินต่อได้ (ผู้ใช้ 2026-11-08 หลังออก 5.8.0) — แปลงแล้วใช้หลุมพราง/Wake Up ได้ในเทิร์นเดียวกัน
//     คืนร่างครั้งที่ 3 แล้วเกมยังไม่จบ = ตาย (ชุบได้ตามปกติ — ผู้ใช้)
//     คลิปแปลงร่างครั้งที่ 1/2/3 คนละคลิป
//  ร่าง Dark Kiva
//   สกิลพื้นฐาน หลุมพราง (เสียพลังชีวิต 1 ไม่สนเกราะ · คูลดาวน์ 1): ตั้งท่าจนถึงตาเดินถัดไปของตัวเอง (ผู้ใช้: 1 เทิร์น ซ้อนไม่ได้ · 1 ครั้ง)
//     ศัตรูโจมตีโดน 1 ครั้ง (ตีปกติ/สกิล/ปืน/ดาเมจที่มีผู้ลงมือ) = การโจมตีนั้นเป็น 0 ทั้งก้อน → ถอยห่างจากผู้โจมตี 2 ช่อง (ชน = เท่าที่ไปได้)
//     + ผู้โจมตีถูกตรึง 1 เทิร์น · ตรา Kiva สีเขียว · คลิปหลุมพรางครั้งแรกต่อเกม
//     ตีปกติ = ถอยหลังฉากตีจบ (ตอนจบตาเดินของผู้ตี — ฮุค afterActorEnd) · ทางอื่นถอยทันที
//   สกิลรอง จงตื่นขึ้น ครั้งสุดท้าย (2 แบบ · คูลดาวน์แยกกันแบบละ 1 — ผู้ใช้)
//     Wake Up 1 (เสียพลังชีวิต 1): ทั้งแผนที่เป็นกลางคืนจันทร์แดง 2 เทิร์น (เทิร์นที่กด + เทิร์นถัดไป) · กลางคืนอยู่แล้วกดไม่ได้
//       ผลกลางคืนทุกระบบทำงานกับทุกคน (match.forcedNight → dayNight.isNightRound) · เปลี่ยนภูมิภาค = จบ
//       คลิป wakeup1 ทุกครั้ง + ฉากฟ้าแดง (wakeup1_fill) ครั้งแรกต่อเกม
//     Wake Up 2 (เสียพลังชีวิต 1 · เฉพาะกลางคืน): ตีปกติครั้งถัดไปที่โดน ติดผุพัง 2 เทิร์น · หลบพ้นยังเก็บไว้ · คืนร่างแล้วหาย
//       คลิป wakeup2 ทุกครั้งที่กด + finalhit ทุกครั้งที่ตีลง (ผู้ใช้: 3 คลิปนี้เล่นซ้ำ · ที่เหลือครั้งเดียว)
//
//  สกิลติดตัว หนุ่มเจ้าเสน่ห์ (ตลอด): ตีผู้หญิง −1 · ตีผู้ชาย/ไร้เพศ +1 (characters/_gender.js)
//     คืนร่างจากท่าไม้ตาย: เยียวยาตัวเองเท่ากับพลังชีวิตที่เสียไปจากการใช้สกิลระหว่างร่างนั้น (1/เทิร์น)
//  สกิลติดตัว ราชาผีดูดเลือด (ระหว่างร่าง Dark Kiva):
//     ตีปกติโดน = เป้าเลือดไหล 1 · กลางคืนได้รับความเสียหายเบาลง 1 (ทุกครั้ง) · ร่างครั้งที่ 3 ตีปกติโดน ฟื้นพลังชีวิต 2
//     เสียพลังชีวิตจากสกิลไม่ตาย (ค้างที่ 1) · เลือดไหลบนตัวเอง = ฟื้นแทนเสียหาย (ผู้ใช้: หลังคืนร่างก็ยังฟื้น → ทำทั้งเกม)
//
//  เสียง: action ที่ขึ้นวีดีโอไม่มีเสียงเอฟเฟกต์ก่อน/ซ้อน (กฎผู้ใช้ 2026-11-03) · เสียงสังเคราะห์ 2 ตัว (ปากหวาน/ตั้งหลุมพราง)
//  เอฟเฟกต์: engine.boardFx("otoyaFx", { kind, id, at, … }) → client/src/board/otoyaFx.js
// ============================================================
const Board = require("../server/board");
const { genderOf } = require("./_gender");

const ID = "kurenai_otoya";
const DIR = "/characters/kurenai_otoya";
// ไฟล์จากผู้ใช้ (Downloads/otoya — 2026-11-08) · คลิปบีบ crf 23 · รูป skill*.webp ตามชื่อไฟล์ผู้ใช้
const IMG = {
  base: `${DIR}/otoya.webp`,
  kiva: `${DIR}/dark_kiva.webp`,
  sweet: `${DIR}/skill1.webp`,
  trap: `${DIR}/skill1_2.webp`,
  heart: `${DIR}/skill2.webp`,
  wake: `${DIR}/skill2_2.webp`,
  ult: `${DIR}/skill3.webp`,
};
const VIDEO = {
  henshin: [`${DIR}/henshin_1.mp4`, `${DIR}/henshin_2.mp4`, `${DIR}/henshin_3.mp4`],
  trap: `${DIR}/dark_kiva_trap.mp4`,
  wake1: `${DIR}/dark_kiva_wakeup1.mp4`,
  wake1Fill: `${DIR}/dark_kiva_wakeup1_fill.mp4`,
  wake2: `${DIR}/dark_kiva_wakeup2.mp4`,
  wake2Hit: `${DIR}/dark_kiva_wakeup2_finalhit.mp4`,
  dead: `${DIR}/otoya_dead.mp4`,
};
const CUT = {
  henshin: ["otoyaHenshin1", "otoyaHenshin2", "otoyaHenshin3"],
  trap: "otoyaTrap", wake1: "otoyaWake1", wake1Fill: "otoyaWake1Fill", wake2: "otoyaWake2", wake2Hit: "otoyaWake2Hit", dead: "otoyaDead",
};
const MUSIC = "otoya_heart"; // 渡 (ไฟล์ผู้ใช้) — เล่นค้างระหว่างดนตรีในหัวใจ (client/src/audio.js)
const SFX = { sweet: "otoya_sweet", trap: "otoya_trap" }; // สังเคราะห์ (client/public/characters/kurenai_otoya/sfx/)

const SWEET_CD = 2;
const SWEET_MAX = 3;
const HEART_RANGE = 8;
const HEART_CD = 3;
const HEART_ATK = 1;
const HEART_MEND = 1;
const HEART_CRIT = 25;
const HEART_SP = 1;
const ULT_TURNS = 2;
const ULT_USES = 3;
const ULT_ATK = 2;
const ULT_MOV = 1;
const TRAP_CD = 1;
const TRAP_BACK = 2;
const TRAP_ROOT = 1;
const WAKE_CD = 1;
const NIGHT_TURNS = 2;
const DECAY_TURNS = 2;
const BLEED = 1;
const LAST_HEAL = 2;
const NIGHT_GUARD = 1;
const CHARM_FEMALE = -1;
const CHARM_OTHER = 1;
const HP_COST = 1;

const NAMES = {
  sweet: "ปากหวาน", heart: "ดนตรีในหัวใจ", trap: "หลุมพราง", wake: "จงตื่นขึ้น ครั้งสุดท้าย",
  wake1: "Wake Up 1", wake2: "Wake Up 2", ult: "ขอแรงหน่อยสิเจ้าค้างคาว", charm: "หนุ่มเจ้าเสน่ห์", king: "ราชาผีดูดเลือด",
};

// skillPub/skillArea ไม่ได้รับ engine — require ตอนเรียก (กัน require วน)
const engineNow = () => require("../server/engine").engine;
const isOtoya = (p) => !!p && p.characterId === ID && !p.summon;
function fresh() {
  return {
    sweetReady: 0,
    heart: null,       // { targetId, at (severStamp), musicAt }
    heartReady: 0,
    ultUses: 0,
    ultUntil: 0,       // ร่าง Dark Kiva มีผลถึงจบเทิร์นนี้ (รวม) — 0 = ร่างปกติ
    ultSevAt: 0,
    ultHpLost: 0,      // พลังชีวิตที่เสียจากสกิลในร่างนี้ (หนุ่มเจ้าเสน่ห์: เยียวยาตอนคืนร่าง)
    trap: null,        // { round, acted, at } — หน้าต่างถึงตาเดินถัดไป
    trapKey: null,     // การโจมตีที่หลุมพรางกันอยู่ (ผู้โจมตี + คำสั่ง)
    trapReady: 0,
    retreat: null,     // { fromId } ถอยหลังฉากตีปกติ (afterActorEnd)
    wake1Ready: 0,
    wake2Ready: 0,
    wake2: false,      // Wake Up 2 เก็บไว้ (ตีปกติครั้งถัดไปที่โดน)
    wake2Hit: false,   // ตีครั้งนี้ลง Wake Up 2 (คลิปก่อนฉากตี)
    clipNow: false,    // ปุ่มที่เพิ่งกดคิวคลิป (skillSound เงียบ)
  };
}
function st(p) { return p.otoya || (p.otoya = fresh()); }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const ultOn = (engine, p) => isOtoya(p) && st(p).ultUntil > 0 && engine.roundNumber <= st(p).ultUntil;
const ultLeft = (engine, p) => (ultOn(engine, p) ? st(p).ultUntil - engine.roundNumber + 1 : 0);
const lastForm = (engine, p) => ultOn(engine, p) && st(p).ultUses >= ULT_USES;
const nightNow = (engine) => !!engine.isNightRound(engine.worldRound);
const stunned = (p) => ((p.statuses && (p.statuses.stun || 0)) || 0) > 0 || ((p.statuses && (p.statuses.sleep || 0)) || 0) > 0;
const otoyas = (engine) => Object.values(engine.players).filter((o) => isOtoya(o));

function clipOnce(engine, p, key) {
  p.cutsceneShown ||= {};
  if (p.cutsceneShown[key]) return false;
  p.cutsceneShown[key] = true;
  engine.queueCutscene(p, key);
  return true;
}
function fx(engine, p, kind, extra = {}) {
  if (!p || !p.pos) return;
  engine.boardFx("otoyaFx", { kind, id: p.id, at: { ...p.pos }, size: engine.sizeOf(p), color: engine.colorOf(p), ...extra });
}

// ---------- เพศ (ปากหวาน) ----------
//  ทุกคนที่ยังอยู่ในเกม ทุกฝ่าย · ยูนิตที่ถูกเรียกนับเฉพาะฮาคุโนะ (Moon Cell)
function femaleCount(engine, p) {
  return Object.values(engine.players).filter((u) => u.alive && u.id !== p.id
    && (!u.summon || u.summon.moon === "f") && genderOf(u) === "f").length;
}
const sweetHeal = (engine, p) => Math.min(SWEET_MAX, 1 + femaleCount(engine, p));

// ---------- ดนตรีในหัวใจ ----------
function heartTarget(engine, p) {
  const h = isOtoya(p) && st(p).heart;
  return h ? engine.players[h.targetId] || null : null;
}
function inHeartRange(p, t) {
  return !!(p && t && p.pos && t.pos && Board.dist(Board.boxOf(p), Board.boxOf(t)) <= HEART_RANGE);
}
// บัฟยังใช้ได้ไหม (อ่านอย่างเดียว — จบจริงที่ syncHeart)
function heartValid(engine, p) {
  const t = heartTarget(engine, p);
  return !!t && p.alive && t.alive && !stunned(p) && inHeartRange(p, t);
}
const heartOn = (p) => isOtoya(p) && !!st(p).heart;
function heartGiverOf(engine, t) {
  return otoyas(engine).find((o) => heartOn(o) && st(o).heart.targetId === t.id && heartValid(engine, o)) || null;
}
function heartRecipientOk(engine, p, t) {
  if (!t || !t.alive || t.id === p.id || !t.pos) return false;
  if (t.summon && t.summon.moon) return false; // Moon Cell / ฮาคุโนะ (AI)
  if (engine.teamModeActive() && !engine.isAlly(p, t)) return false;
  return true;
}
function markHeart(t) { t.statuses.otoyaHeart = 1; } // ป้ายบนตัวเป้า (ต่ออายุทุกครั้งที่ sync — ลูปลดเทิร์นกลางลดไปก่อน)
function endHeart(engine, p, why) {
  const s = st(p);
  if (!s.heart) return;
  const t = engine.players[s.heart.targetId];
  s.heart = null;
  s.heartReady = engine.roundNumber + HEART_CD;
  if (t && t.statuses) delete t.statuses.otoyaHeart;
  fx(engine, p, "heartEnd", t && t.pos ? { to: { ...t.pos }, targetId: t.id } : {});
  const reason = { cancel: "ยกเลิก", range: `${t ? t.name : "เป้า"} ออกนอกระยะ`, dead: `${t ? t.name : "เป้า"} ตกรอบ`, self: "โอโตยะตกรอบ", stun: "ถูกหยุดการเคลื่อนไหว", sever: "ถูกตัดผล" }[why] || "";
  engine.log(`🎻 ${p.name} ${NAMES.heart} — หยุดบรรเลง${reason ? ` (${reason})` : ""} · คูลดาวน์ ${HEART_CD} เทิร์น`);
}
function syncHeart(engine, p) {
  if (!heartOn(p)) return;
  const t = heartTarget(engine, p);
  if (!p.alive) return endHeart(engine, p, "self");
  if (!t || !t.alive) return endHeart(engine, p, "dead");
  if (stunned(p)) return endHeart(engine, p, "stun");
  if (!inHeartRange(p, t)) return endHeart(engine, p, "range");
  markHeart(t);
}
const syncAll = (engine) => { for (const o of otoyas(engine)) syncHeart(engine, o); };

// ---------- ค่าใช้จ่ายพลังชีวิต (ไม่สนเกราะ · ไม่ทำให้ตาย — ราชาผีดูดเลือด) ----------
function payHp(engine, p, name) {
  const s = st(p);
  if (p.hp <= HP_COST) { engine.log(`🦇 ${p.name} ${name} — ราชาผีดูดเลือด ไม่เสียพลังชีวิต (เหลือ ${p.hp})`); return; }
  engine.loseHp(p);
  s.ultHpLost += HP_COST;
  engine.log(`🦇 ${p.name} ${name} — เสียพลังชีวิต ${HP_COST} (ไม่สนเกราะ)`);
}

// ---------- หลุมพราง ----------
//  หน้าต่าง "จนถึงตาเดินถัดไปของตัวเอง" (แบบต้นตอแห่งชีวิตของโจรุโน่) — กดในตาตัวเอง = acted
function trapOpen(engine, p) {
  const w = isOtoya(p) && st(p).trap;
  if (!w || !p.alive || !ultOn(engine, p)) return false;
  const r = engine.roundNumber;
  const waiting = engine.actorId !== p.id && !engine.hasActed(p.id);
  if (w.acted) return r === w.round || (r === w.round + 1 && waiting);
  return r === w.round && waiting;
}
const attackKey = (engine, src) => `${src.id}|${engine.roundNumber}|${engine.actorId || ""}|${engine.commandSeq}`;
// ทิศถอยห่างจากผู้โจมตี: แกนที่ห่างมากกว่าก่อน · เท่ากัน/ชน = แกนรอง · อยู่แนวเดียวกัน = ข้างใดก็ได้ที่ไปได้ไกลกว่า
function retreatDirs(engine, p, a) {
  const n = engine.sizeOf(a), pc = { x: p.pos.x, y: p.pos.y }, ac = { x: a.pos.x + (n - 1) / 2, y: a.pos.y + (n - 1) / 2 };
  const dx = Board.wdx(ac.x, pc.x), dy = pc.y - ac.y;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const xs = sx ? [{ x: sx, y: 0 }] : [{ x: 1, y: 0 }, { x: -1, y: 0 }];
  const ys = sy ? [{ x: 0, y: sy }] : [{ x: 0, y: 1 }, { x: 0, y: -1 }];
  return Math.abs(dx) >= Math.abs(dy) ? [...xs, ...ys] : [...ys, ...xs];
}
function freeSteps(engine, p, d, n) {
  let k = 0, x = p.pos.x, y = p.pos.y;
  while (k < n) { x = Board.wx(x + d.x); y += d.y; if (!engine.tileFree(x, y, p.id)) break; k++; }
  return k;
}
// ถอย 2 ช่อง (ชน = เท่าที่ไปได้) → วินาทีของฉาก
function retreat(engine, p, a) {
  if (!p.alive || !p.pos || !a || !a.pos || engine.sizeOf(p) > 1) return 0;
  const dirs = retreatDirs(engine, p, a);
  let best = null, bestN = 0;
  for (const d of dirs) { const n = freeSteps(engine, p, d, TRAP_BACK); if (n > bestN) { best = d; bestN = n; } if (n >= TRAP_BACK) break; }
  if (!best) { engine.log(`🦇 ${p.name} ${NAMES.trap} — ถอยไม่ได้ (ไม่มีช่องว่าง)`); return 0; }
  const ctx = engine.ice.begin();
  engine.ice.pushUnit(p, best, ctx, TRAP_BACK);
  engine.ice.flush(ctx);
  engine.log(`🦇 ${p.name} ${NAMES.trap} — ถอยห่างจาก ${a.name}`);
  return engine.ice.fxSeconds(ctx);
}
function rootAttacker(engine, p, a) {
  const acted = engine.hasActed(a.id) || engine.actorId === a.id;
  engine.withEffectSource(p, () => {
    if (engine.applyDebuff(a, "rooted", 1, TRAP_ROOT + (acted ? 1 : 0))) engine.log(`⛓️ ${a.name} ถูกตรึงด้วยตรา Kiva — เดินไม่ได้ ${TRAP_ROOT} เทิร์น`);
    else engine.log(`⛓️ ${a.name} ต้านการตรึงไว้ได้`);
  });
  if (a.pos) fx(engine, p, "seal", { to: { ...a.pos }, targetId: a.id, tsize: engine.sizeOf(a) });
}

// ---------- ร่าง Dark Kiva ----------
function revert(engine, p) {
  const s = st(p);
  if (!s.ultUntil) return;
  const last = s.ultUses >= ULT_USES;
  s.ultUntil = 0;
  s.trap = null; s.trapKey = null; s.retreat = null;
  s.wake2 = false; s.wake2Hit = false;
  const lost = s.ultHpLost;
  s.ultHpLost = 0;
  fx(engine, p, "revert");
  engine.log(`🦇 ${p.name} คืนร่างจาก Dark Kiva`);
  if (lost > 0 && p.alive) {
    engine.applyMend(p, 1, lost);
    engine.log(`💚 ${p.name} ${NAMES.charm} — เยียวยา ${lost} เทิร์น (พลังชีวิตที่เสียจากสกิล)`);
  }
  if (last && p.alive && engine.gameState !== "GAMEOVER") {
    engine.log(`💀 ${p.name} คืนร่างครั้งที่ ${ULT_USES} — พลังของค้างคาวกลืนกินชีวิต`);
    clipOnce(engine, p, CUT.dead);
    engine.instantDeath(p);
    if (!p.alive) { p.pos = null; engine.log(`💀 ${p.name} ตกรอบ!`); }
  }
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, MUSIC, SFX, NAMES,
  SWEET_CD, SWEET_MAX, HEART_RANGE, HEART_CD, HEART_ATK, HEART_MEND, HEART_CRIT, HEART_SP,
  ULT_TURNS, ULT_USES, ULT_ATK, ULT_MOV, TRAP_CD, TRAP_BACK, TRAP_ROOT, WAKE_CD, NIGHT_TURNS, DECAY_TURNS, BLEED, LAST_HEAL, NIGHT_GUARD,
  CHARM_FEMALE, CHARM_OTHER,
  isOtoya, femaleCount, sweetHeal, heartGiverOf,

  resetCombat(p) { p.otoya = isOtoya(p) ? fresh() : null; if (p.statuses) delete p.statuses.otoyaHeart; },

  // ---------- หน้าตา ----------
  displayImg(p) { return ultOn(engineNow(), p) ? IMG.kiva : null; },
  characterPub(engine, p) {
    if (!ultOn(engine, p)) return null;
    return { name: "Dark Kiva", img: IMG.kiva };
  },

  // ---------- ระยะเดิน / ตีปกติ / ปืน ----------
  mov(p) {
    if (!isOtoya(p)) return null;
    const eng = engineNow();
    return ultOn(eng, p) ? require("../server/constants").DEFAULT_MOV + ULT_MOV : null;
  },
  movBlocked(engine, p) { return heartOn(p); },
  range(p) { return heartOn(p) ? [1, 0] : null; },

  // หนุ่มเจ้าเสน่ห์ (ตลอด) + Dark Kiva +2 — ตีปกติ (ท่อ strike)
  damageBonus(engine, attacker, target, ctx) {
    if (!isOtoya(attacker)) return 0;
    const g = genderOf(target);
    const charm = g === "f" ? CHARM_FEMALE : CHARM_OTHER;
    ctx.otoyaCharm = charm;
    const ult = ultOn(engine, attacker) ? ULT_ATK : 0;
    ctx.otoyaUlt = ult;
    return charm + ult;
  },
  attackFxNames(attacker, atkCtx) {
    if (!isOtoya(attacker) || !atkCtx) return [];
    const out = [];
    if (atkCtx.otoyaCharm) out.push(`${NAMES.charm} ${atkCtx.otoyaCharm > 0 ? "+" : ""}${atkCtx.otoyaCharm}`);
    if (atkCtx.otoyaUlt) out.push(`Dark Kiva +${atkCtx.otoyaUlt}`);
    return out;
  },
  // ราชาผีดูดเลือด: ตีโดน = เลือดไหล 1 · ร่างครั้งที่ 3 ฟื้น 2 · Wake Up 2 = ผุพัง 2 เทิร์น
  onStrikeLanded(engine, attacker, target) {
    if (!isOtoya(attacker) || !ultOn(engine, attacker) || !target) return [];
    const s = st(attacker);
    const tags = [];
    if (target.alive) {
      engine.withEffectSource(attacker, () => {
        if (engine.applyBleed(target, BLEED)) tags.push(`เลือดไหล ${BLEED}`);
        if (s.wake2) {
          s.wake2 = false;
          s.wake2Hit = true;
          if (engine.applyDebuff(target, "decay", null, DECAY_TURNS)) tags.push(`ผุพัง ${DECAY_TURNS} เทิร์น`);
          engine.log(`🌕 ${attacker.name} Darkness Moon Break → ${target.name}`);
        }
      });
    }
    if (lastForm(engine, attacker)) {
      const got = engine.healHp(attacker, LAST_HEAL);
      if (got > 0) tags.push(`ฟื้นพลังชีวิต ${got}`);
    }
    return tags; // ป้ายใต้ฉากตี (ฝั่งโจมตี)
  },
  // คลิป finalhit ทุกครั้งที่ตีลงด้วย Wake Up 2 (เล่นก่อนฉากตี)
  preAttackClip(engine, attacker) {
    if (!isOtoya(attacker) || !st(attacker).wake2Hit) return null;
    st(attacker).wake2Hit = false;
    return CUT.wake2Hit;
  },

  // ราชาผีดูดเลือด: กลางคืนได้รับความเสียหายเบาลง 1
  adjustIncomingDamage(engine, p, n) {
    if (!isOtoya(p) || !(n > 0) || !ultOn(engine, p) || !nightNow(engine)) return n;
    return Math.max(0, n - NIGHT_GUARD);
  },
  // เลือดไหลบนตัวเอง = ฟื้นพลังชีวิตแทน · ไม่ลดการฟื้น
  hbleedHeals(p) { return isOtoya(p); },
  hbleedHarmless(p) { return isOtoya(p); },
  hbleedLabel(p) { return isOtoya(p) ? NAMES.king : null; },

  // ---------- ดนตรีในหัวใจ: ผลบนตัวเป้า (ฮุค broadcast) ----------
  auraAtk(engine, attacker) {
    const o = heartGiverOf(engine, attacker);
    return o ? { amount: HEART_ATK, name: NAMES.heart, img: IMG.heart } : null;
  },
  auraCrit(engine, attacker) { return heartGiverOf(engine, attacker) ? HEART_CRIT : 0; },
  onRoundStartTick(engine, p) {
    syncAll(engine);
    const o = heartGiverOf(engine, p);
    if (!o || !p.alive) return;
    const hp = engine.healHp(p, HEART_MEND);
    const before = p.skillPoints;
    engine.addSkill(p, HEART_SP, "passive");
    const sp = p.skillPoints - before;
    engine.log(`🎻 ${p.name} ${NAMES.heart} — ฟื้นพลังชีวิต +${hp} · แต้มสกิล +${sp}`);
  },
  onUnitWalked(engine) { syncAll(engine); },
  onForcedMove(engine) { syncAll(engine); },
  onDeath(engine) { syncAll(engine); },
  skillMusic(engine, p) {
    return heartOn(p) && p.alive ? { music: MUSIC, at: st(p).heart.musicAt || 0 } : null;
  },

  // ---------- หลุมพราง ----------
  onAttacked(engine, p, attacker, kind) {
    if (!isOtoya(p) || !p.alive || !attacker) return;
    const s = st(p), key = attackKey(engine, attacker);
    if (s.trapKey === key) return;
    if (!trapOpen(engine, p)) return;
    s.trap = null;
    s.trapKey = key;
    engine.log(`🦇 ${p.name} ${NAMES.trap} — กันการโจมตีของ ${attacker.name}`);
    fx(engine, p, "trap", attacker.pos ? { to: { ...attacker.pos }, targetId: attacker.id } : {});
    rootAttacker(engine, p, attacker);
    clipOnce(engine, p, CUT.trap);
    // ตีปกติ: ถอยหลังฉากตีจบ (ไม่ให้ฉากตีวิ่งตามตำแหน่งใหม่) · ทางอื่นถอยทันที
    if (kind === "strike" && engine.inStrike()) s.retreat = { fromId: attacker.id };
    else retreat(engine, p, attacker);
  },
  blocksAttack(engine, p, attacker) {
    if (!isOtoya(p) || st(p).trapKey !== attackKey(engine, attacker)) return null;
    return { name: NAMES.trap, img: IMG.trap };
  },
  afterActorEnd(engine) {
    let secs = 0;
    for (const o of otoyas(engine)) {
      syncHeart(engine, o);
      const s = st(o);
      if (!s.retreat) continue;
      const a = engine.players[s.retreat.fromId];
      s.retreat = null;
      if (o.alive && a && a.alive) secs = Math.max(secs, retreat(engine, o, a));
    }
    return secs;
  },

  // ---------- สกิล ----------
  skillPub(p, tier) {
    if (!isOtoya(p)) return null;
    const eng = engineNow(), s = st(p), r = eng.roundNumber;
    const ult = ultOn(eng, p);
    if (tier === "basic") {
      if (!ult) return { desc: `ฟื้นพลังชีวิต 1 + จำนวนตัวละครหญิงในเกม สูงสุด ${SWEET_MAX} (ตอนนี้ ${sweetHeal(eng, p)}) (คูลดาวน์ ${SWEET_CD} เทิร์น)` };
      return {
        name: NAMES.trap, img: IMG.trap, active: trapOpen(eng, p),
        desc: `เสียพลังชีวิต ${HP_COST} (ไม่สนเกราะ) · ถึงตาเดินถัดไป: ศัตรูโจมตีโดน 1 ครั้ง = ไม่เสียหาย ถอยห่าง ${TRAP_BACK} ช่อง และผู้โจมตีถูกตรึง ${TRAP_ROOT} เทิร์น (คูลดาวน์ ${TRAP_CD} เทิร์น)`,
      };
    }
    if (tier === "secondary") {
      if (!ult) return heartOn(p) ? { active: true } : null;
      const night = nightNow(eng);
      const c1 = cdLeft(s.wake1Ready, r), c2 = cdLeft(s.wake2Ready, r);
      return {
        name: NAMES.wake, img: IMG.wake,
        desc: `เลือก 1 แบบ (เสียพลังชีวิต ${HP_COST} ไม่สนเกราะ · คูลดาวน์แยกกัน ${WAKE_CD} เทิร์น)`,
        choices: [
          { key: "wake1", name: NAMES.wake1, img: IMG.wake, cost: 0, area: { kind: "self" }, cd: c1, locked: c1 > 0 || night,
            desc: `เปลี่ยนเป็นกลางคืน ${NIGHT_TURNS} เทิร์น (เทิร์นนี้ + เทิร์นถัดไป) · เสียพลังชีวิต ${HP_COST} · กลางคืนอยู่แล้วกดไม่ได้` },
          { key: "wake2", name: NAMES.wake2, img: IMG.wake, cost: 0, area: { kind: "self" }, cd: c2, locked: c2 > 0 || !night || s.wake2, active: s.wake2,
            desc: `เฉพาะกลางคืน: ตีปกติครั้งถัดไปที่โดน เป้าติดผุพัง ${DECAY_TURNS} เทิร์น · เสียพลังชีวิต ${HP_COST}` },
        ],
      };
    }
    if (tier === "ultimate") return ult ? { active: true } : null;
    return null;
  },
  skillCost(p, tier, base) {
    if (!isOtoya(p)) return base;
    const eng = engineNow();
    if (ultOn(eng, p) && (tier === "basic" || tier === "secondary")) return 0; // จ่ายด้วยพลังชีวิต
    if (tier === "secondary" && heartOn(p)) return 0; // ยกเลิก
    return base;
  },
  skillArea(p, tier, area) {
    if (!isOtoya(p)) return area;
    const eng = engineNow();
    if (tier === "secondary" && (ultOn(eng, p) || heartOn(p))) return { kind: "self" };
    if (tier === "basic" && ultOn(eng, p)) return { kind: "self" };
    return area;
  },
  skillFree(p, tier) { return isOtoya(p) && tier === "secondary" && heartOn(p); },
  // ยกเลิกดนตรีในหัวใจ / แปลงร่าง Dark Kiva (ผู้ใช้ 2026-11-08): ไม่กินโควตาสกิล กดได้แม้ใช้โควตาแล้ว และยังเดินต่อได้ (ระยะเดินร่างใหม่)
  skipsTurnQuota(p, tier) { return isOtoya(p) && ((tier === "secondary" && heartOn(p)) || tier === "ultimate"); },
  ignoresTurnQuota(p, tier) { return isOtoya(p) && ((tier === "secondary" && heartOn(p)) || tier === "ultimate"); },
  keepsMove(engine, p, tier) { return isOtoya(p) && ((tier === "secondary" && heartOn(p)) || tier === "ultimate"); },
  silentFlash(p, tier) { return isOtoya(p) && tier === "secondary" && heartOn(p); },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isOtoya(p)) return true;
    const s = st(p), r = engine.roundNumber, ult = ultOn(engine, p);
    if (heartOn(p)) return tier === "secondary"; // ระหว่างสี: กดได้แค่ยกเลิก
    if (tier === "basic") {
      if (ult) return cdLeft(s.trapReady, r) === 0 && !trapOpen(engine, p);
      return cdLeft(s.sweetReady, r) === 0 && p.hp < engine.maxHpOf(p);
    }
    if (tier === "secondary") {
      if (ult) {
        if (opts.form === "wake1") return cdLeft(s.wake1Ready, r) === 0 && !nightNow(engine);
        if (opts.form === "wake2") return cdLeft(s.wake2Ready, r) === 0 && nightNow(engine) && !s.wake2;
        return false;
      }
      if (cdLeft(s.heartReady, r) > 0) return false;
      return heartRecipientOk(engine, p, engine.players[(targets || [])[0]]);
    }
    if (tier === "ultimate") return !ult && s.ultUses < ULT_USES;
    return false;
  },
  skillSound(p, tier) {
    if (!isOtoya(p)) return null;
    const s = st(p);
    if (s.clipNow) { s.clipNow = false; return null; }
    if (tier === "basic") return ultOn(engineNow(), p) ? SFX.trap : SFX.sweet;
    return null;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isOtoya(p)) return "";
    const s = st(p), r = engine.roundNumber;
    const ult = ultOn(engine, p);
    if (tier === "basic" && !ult) {
      const n = sweetHeal(engine, p);
      const got = engine.healHp(p, n);
      s.sweetReady = r + SWEET_CD;
      fx(engine, p, "sweet", { n: got });
      engine.log(`🌹 ${p.name} ${NAMES.sweet} — ฟื้นพลังชีวิต +${got} (ตัวละครหญิง ${femaleCount(engine, p)} คน)`);
      return ` — ฟื้นพลังชีวิต ${got}`;
    }
    if (tier === "basic") {
      payHp(engine, p, NAMES.trap);
      s.trap = { round: r, acted: true, at: engine.severStamp() };
      s.trapKey = null;
      s.trapReady = r + TRAP_CD;
      fx(engine, p, "trapSet");
      engine.log(`🦇 ${p.name} ${NAMES.trap} — วางตรา Kiva รอศัตรู`);
      return "";
    }
    if (tier === "secondary" && !ult) {
      if (heartOn(p)) { endHeart(engine, p, "cancel"); return " — ยกเลิก"; }
      const t = engine.players[targets[0]];
      s.heart = { targetId: t.id, at: engine.severStamp(), musicAt: engine.nextTransformCounter() };
      markHeart(t);
      fx(engine, p, "heart", { to: { ...t.pos }, targetId: t.id, tsize: engine.sizeOf(t) });
      engine.log(`🎻 ${p.name} ${NAMES.heart} → ${t.name} — พลังโจมตี +${HEART_ATK} · เยียวยา · คริติคอล +${HEART_CRIT}% · แต้มสกิล +${HEART_SP}/เทิร์น`);
      return ` → ${t.name}`;
    }
    if (tier === "secondary") {
      if (opts.form === "wake1") {
        payHp(engine, p, NAMES.wake1);
        s.wake1Ready = r + WAKE_CD;
        const w = engine.worldRound;
        engine.setForcedNight({ from: w, until: w + NIGHT_TURNS - 1, by: p.id });
        s.clipNow = true;
        engine.queueCutscene(p, CUT.wake1);
        clipOnce(engine, p, CUT.wake1Fill);
        engine.boardFx("otoyaFx", { kind: "bloodMoon", id: p.id, at: p.pos ? { ...p.pos } : null, color: engine.colorOf(p) });
        engine.log(`🌕 ${p.name} ${NAMES.wake1} — ฟ้ากลายเป็นกลางคืนจันทร์แดง ${NIGHT_TURNS} เทิร์น`);
        return ` — กลางคืน ${NIGHT_TURNS} เทิร์น`;
      }
      payHp(engine, p, NAMES.wake2);
      s.wake2Ready = r + WAKE_CD;
      s.wake2 = true;
      s.clipNow = true;
      engine.queueCutscene(p, CUT.wake2);
      fx(engine, p, "wake2");
      engine.log(`🌕 ${p.name} ${NAMES.wake2} — Hell's Gate เปิด · ตีปกติครั้งถัดไปติดผุพัง ${DECAY_TURNS} เทิร์น`);
      return "";
    }
    if (tier === "ultimate") {
      s.ultUses++;
      s.ultUntil = r + ULT_TURNS - 1;
      s.ultSevAt = engine.severStamp();
      s.ultHpLost = 0;
      s.clipNow = true;
      engine.queueCutscene(p, CUT.henshin[Math.min(ULT_USES, s.ultUses) - 1]);
      fx(engine, p, "henshin", { n: s.ultUses });
      engine.log(`🦇 ${p.name} ${NAMES.ult} — แปลงร่าง Dark Kiva ${ULT_TURNS} เทิร์น (ครั้งที่ ${s.ultUses}/${ULT_USES})`);
      return ` — ครั้งที่ ${s.ultUses}`;
    }
    return "";
  },

  // ---------- จบเทิร์น: ป้ายบัฟ / คืนร่าง (หลังลูปลดเทิร์นสถานะ) ----------
  onEndTurn(engine) {
    for (const p of otoyas(engine)) {
      syncHeart(engine, p);
      const s = st(p);
      if (s.ultUntil && engine.roundNumber >= s.ultUntil) revert(engine, p);
    }
  },

  // ---------- ตัดผลสกิล (server/sever.js) ----------
  //  ดนตรีในหัวใจ → หยุดบรรเลง (คูลดาวน์ตามปกติ) · Dark Kiva → คืนร่างแบบหมดเวลา (ครั้งที่ 3 = ตาย) · หลุมพราง/Wake Up 2 → หาย
  severables(engine, p) {
    if (!isOtoya(p)) return [];
    const s = st(p), out = [];
    if (s.heart) out.push({ key: "otoyaHeart", label: NAMES.heart, at: s.heart.at || 0, cancel() { endHeart(engine, p, "sever"); } });
    if (trapOpen(engine, p)) out.push({ key: "otoyaTrap", label: NAMES.trap, at: s.trap.at || 0, cancel() { s.trap = null; } });
    if (ultOn(engine, p)) out.push({ key: "otoyaUlt", label: "Dark Kiva", at: s.ultSevAt || 0, cancel() { revert(engine, p); } });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  //  ทุกยูนิต: heartBy = โอโตยะที่สีให้ (ใครก็เห็นสายดนตรี) · ตัวโอโตยะ: ร่าง/หลุมพราง/Wake Up 2/เป้า
  unitMark(engine, u) {
    const giver = u && heartGiverOf(engine, u);
    if (!isOtoya(u)) return giver ? { heartBy: giver.id } : undefined;
    const s = st(u);
    return {
      heartBy: giver ? giver.id : null,
      heartTo: s.heart ? s.heart.targetId : null,
      kiva: ultOn(engine, u), kivaLeft: ultLeft(engine, u), uses: ULT_USES - s.ultUses, last: lastForm(engine, u),
      trap: trapOpen(engine, u), wake2: !!s.wake2,
    };
  },
  skillLocks(engine, p) {
    if (!isOtoya(p)) return undefined;
    const s = st(p), r = engine.roundNumber, ult = ultOn(engine, p), heart = heartOn(p);
    const basicCd = ult ? cdLeft(s.trapReady, r) : cdLeft(s.sweetReady, r);
    return {
      basic: { locked: heart || basicCd > 0 || (ult ? trapOpen(engine, p) : p.hp >= engine.maxHpOf(p)), cd: basicCd },
      secondary: ult ? { locked: false } : { locked: !heart && cdLeft(s.heartReady, r) > 0, cd: heart ? 0 : cdLeft(s.heartReady, r), free: heart },
      ultimate: { locked: heart || ult || s.ultUses >= ULT_USES, free: true }, // free = ไม่กินโควตาสกิลของเทิร์น
    };
  },
};

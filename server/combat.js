// ต่อสู้: เลือด/เกราะ/ดาเมจ/ฮีล/บัฟ-ดีบัฟ/ตายทันที/รีเซ็ตผู้เล่น
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  maxHpOf, healHp, healArmor, maxSkillOf, sameTeam,
  friendlyEffectBlocked, withEffectSource, applyBuff, applyDebuff,
  applySpellburden, alivePlayers,
  maxArmorOf, instantDeath,
  resolveDamageAftermath, healOverflow, loseHp, loseArmor,
  damageSoft, dealDirect, dealArmorOnly, dealMixed,
  addSkill, applyEffect, firePassive, skillByStatus, voidUltimateOnBust,
  resetRoundDisplay, resetCombat,
  runHook, broadcastHook, damageCapOf,
});

const { CHAR_BY_ID } = require("../characters");
const CHAR_HOOKS = require("../characters/index");
const {
  applyBuff: rawApplyBuff, applyDebuff: rawApplyDebuff, applySpellburden: rawApplySpellburden,
  noHealActive, invertActive, bleedHealPenalty,
} = require("../characters/_universal_status");
const Mark42 = require("../characters/_mark42");
const { MAX_ARMOR, MAX_HP, MAX_SKILL, TEMP_HP_TURNS, TRANSFORMS } = require("./constants");
const match = require("./match");
const { engine } = require("./engine");
const cardDeck = require("./deck");
const lobby = require("./lobby");
const qteSystem = require("./qte");
const Duo = require("./duo");
const Ride = require("./ride");
const TimeStop = require("./timeStop");
const Dim = require("./dimension");
const Summon = require("./summon");

// เลือดจริงสูงสุดของผู้เล่น — ตัวละครกำหนดเองได้ผ่าน hook maxHp (นักบินปริศนา 5)
function maxHpOf(p) {
  if (p && p.summon && Number.isFinite(p.summon.maxHp)) return p.summon.maxHp; // ยูนิตที่ถูกเรียก (server/summon.js)
  const hook = p && CHAR_HOOKS[p.characterId];
  return hook && hook.maxHp ? hook.maxHp(p) : MAX_HP;
}
// ฟื้นเลือดจริงแบบเคารพสถานะ "ไม่ใช้งานต่อ" / "ไร้ทางเยียวยา" — คืนจำนวนที่ฟื้นได้จริง
// ผกผัน (patch 2.2.1): การฟื้นเลือดกลับกลายเป็นเสียเลือดแทน (ไม่สนเกราะ)
function healHp(p, amount) {
  if (invertActive(p)) {
    dealDirect(p, amount);
    match.lastLog.push(`🔄 ${p.name} ผกผัน — พลังชีวิตที่ควรฟื้น +${amount} กลับกลายเป็นเสียพลังชีวิต -${amount} แทน (ไม่สนเกราะ)`);
    if (p.alive && p.hp <= 0) { instantDeath(p); if (!p.alive) match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`); }
    return 0;
  }
  if (noHealActive(p)) return 0;
  // เลือดไหล (hbleed, สถานะ Universal patch 2.5): การฟื้นพลังชีวิตเหลือครึ่งเดียว
  //  (ฟื้นทีละ 1 หน่วยไม่ถูกลด — ตรรกะเต็มอยู่ characters/_universal_status.js)
  amount = bleedHealPenalty(engine, p, amount);
  const heal = Math.min(maxHpOf(p) - p.hp, amount);
  if (heal > 0) p.hp += heal;
  return heal;
}
// ฟื้นเกราะแบบเคารพเพดาน — คืนจำนวนที่ฟื้นได้จริง
// ผกผัน (patch 2.2.1): การฟื้นเกราะกลับกลายเป็นเสียเกราะแทน
function healArmor(p, amount) {
  if (invertActive(p)) {
    if (friendlyEffectBlocked(p)) return 0;
    const lost = Math.max(0, Math.min(p.armor, amount));
    if (lost > 0) {
      p.armor -= lost;
      match.lastLog.push(`🔄 ${p.name} ผกผัน — เกราะที่ควรฟื้น +${amount} กลับกลายเป็นเสียเกราะ -${lost} แทน`);
    }
    return 0;
  }
  const heal = Math.max(0, Math.min(maxArmorOf(p) - p.armor, amount));
  if (heal > 0) p.armor += heal;
  return heal;
}
// พลังงานสูงสุดของผู้เล่น — ตัวละครกำหนดเองได้ผ่าน hook maxSkill (เคท & เอมิลิโกะ: 16 ใช้ร่วมกัน)
function maxSkillOf(p) {
  const hook = p && CHAR_HOOKS[p.characterId];
  const own = hook && hook.maxSkill ? hook.maxSkill(p) : null;
  return Number.isFinite(own) ? own : MAX_SKILL;
}

// ระบบคู่ (server/duo.js): สองตัวของผู้เล่นคนเดียวกันเป็นฝ่ายเดียวกันเสมอ (ทุกโหมด)
function sameTeam(a, b) {
  if (a && b && a.id !== b.id && Duo.sideKey(a) === Duo.sideKey(b)) return true;
  return !!(lobby.teamModeActive() && a && b && a.id !== b.id && a.teamId && b.teamId && a.teamId === b.teamId);
}
function friendlyEffectBlocked(target) {
  const source = match.effectSourceId && match.players[match.effectSourceId];
  return !!(source && target && sameTeam(source, target));
}
function withEffectSource(source, fn) {
  const prev = match.effectSourceId;
  match.effectSourceId = typeof source === "string" ? source : (source && source.id) || null;
  try { return fn(); }
  finally { match.effectSourceId = prev; }
}
function applyBuff(p, key, amount, turns) {
  rawApplyBuff(p, key, amount, turns);
}
function applyDebuff(p, key, amount, turns) {
  if (friendlyEffectBlocked(p)) return false;
  if (Dim.blocks(p)) return false; // ชั้นมิติ (server/dimension.js): ต้นตออยู่คนละชั้น = ไม่ติด
  if (untouchable(p)) return false; // ฮุค untouchable (ยูนะ: เงาของเสียง) — ไม่มีอะไรติดจากคนอื่น
  return rawApplyDebuff(p, key, amount, turns);
}
// ภาระเวท (spellburden) — จุดเดียวที่ทุกตัวละคร/ทุกเอฟเฟกต์ต้องใช้ใส่สถานะนี้
//  กฎกลางอยู่ที่ _universal_status.js: สะสม +1 ถึง SPELLBURDEN_MAX · ใช้ซ้ำใส่คนเดิมไม่ต่ออายุ
//  ต่างจาก applyDebuff() ตรงที่กันเฉพาะ "เพื่อนร่วมทีมคนอื่น" ไม่กันการใส่ตัวเอง (สกิลที่จงใจแลกภาระเวทของตัวเองต้องทำงานได้ในโหมดทีม)
function applySpellburden(p, turns) {
  const source = match.effectSourceId && match.players[match.effectSourceId];
  if (source && p && source.id !== p.id && sameTeam(source, p)) return false;
  return rawApplySpellburden(p, turns);
}

// ============================================================
//  ฮุคตัวละคร: เรียกตัวเดียว (runHook) / กระจายทุกตัว (broadcastHook)
// ============================================================
// ฮุคที่โยน error ต้องไม่ลากทั้งแมตช์ค้าง (จุดเรียกส่วนใหญ่อยู่ใน callback ของตัวจับเวลาเฟส ซึ่งถูกล้างไปก่อนแล้ว)
//  → log ชื่อตัวละคร + ชื่อฮุค แล้วทำงานต่อ · ไม่มีฮุคนั้น = ข้าม (คืน undefined)
function runHook(mod, name, ...args) {
  const fn = mod && mod[name];
  if (typeof fn !== "function") return undefined;
  try { return fn.apply(mod, args); }
  catch (err) {
    if (TimeStop.isInterrupt(err)) throw err; // หยุดเวลาตัดการโจมตี (server/timeStop.js) — ต้องทะลุขึ้นไปถึงจุดรับคำสั่ง
    console.error(`[hook] ${mod.id}.${name} โยน error — ข้ามแล้วทำงานต่อ:`, err);
    return undefined;
  }
}
// เรียกฮุค name ของทุกตัวละครตามลำดับ CHAR_HOOKS.MODULES (characters/index.js) — ฮุคเช็คเองว่าเกี่ยวกับตัวเองไหม
//  ฟังก์ชันเดียวกันเรียกครั้งเดียว (เคท & เอมิลิโกะใช้ฮุคร่วมกัน)
function broadcastHook(name, ...args) {
  const called = new Set();
  for (const mod of CHAR_HOOKS.MODULES) {
    const fn = mod[name];
    if (typeof fn !== "function" || called.has(fn)) continue;
    called.add(fn);
    runHook(mod, name, ...args);
  }
}

// ============================================================
//  ต่อสู้ + เอฟเฟกต์สกิล
// ============================================================
// ผู้เล่นที่ยังรอด
function alivePlayers() { return Object.values(match.players).filter((p) => p.alive); }

// เกราะสูงสุดของผู้เล่น — ตัวละครกำหนดเองได้ผ่าน hook maxArmor (นักบินปริศนา 2)
function maxArmorOf(p) {
  if (p && p.summon && Number.isFinite(p.summon.maxArmor)) return p.summon.maxArmor; // ยูนิตที่ถูกเรียก (server/summon.js)
  const hook = p && CHAR_HOOKS[p.characterId];
  return hook && hook.maxArmor ? hook.maxArmor(p, MAX_ARMOR) : MAX_ARMOR;
}
// ตายกลางเทิร์น (เลือดหมดจากสกิล/ผลสถานะ): ตกรอบทันที
// force = true: ข้ามระบบกันตายทั้งหมด (เช่นเกราะ Mark 42) — ยังผ่านการเก็บกวาดท้ายฟังก์ชันตามปกติทุกอย่าง
function instantDeath(p, force) {
  if (!p.alive) return; // ตายไปแล้ว — ไม่เก็บกวาด/ยิงฮุคการตายซ้ำ
  if (friendlyEffectBlocked(p)) return;
  if (TimeStop.holdsDeath(p)) return; // หยุดเวลา (server/timeStop.js): คนอื่นยังไม่ตาย — ตกรอบพร้อมกันตอนเวลาเดินต่อ
  // ยูนิตที่ถูกเรียก (server/summon.js): ตายแล้วแค่หายไป — ไม่มีศพ/ขี่/QTE · ไม่ยิงฮุค onDeath/onKill ของตัวละคร (ไม่ใช่ผู้เล่น)
  //  → ฮุค onSummonDeath ของโมดูลเจ้าของ
  if (p.summon) { Summon.onDeath(p); return; }
  // เกราะ Mark 42: "ตาย" ระหว่างใส่ชุด (สังหารทันที ฯลฯ) = แค่ชุดพัง กลับร่างเดิม
  if (!force && Mark42.suited(p)) { Mark42.breakSuit(engine, p, "combat"); return; }
  // ฮุค preventDeath(engine, p) → true = ไม่ตาย (ฮุคตั้งเลือดใหม่เอง — กิระ: อัฐิราชาฟื้นด้วยพลังชีวิต 1)
  const deathHook = CHAR_HOOKS[p.characterId];
  if (!force && deathHook && deathHook.preventDeath && deathHook.preventDeath(engine, p)) return;
  p.hp = 0; p.alive = false; p.result = "dead"; p.locked = true;
  Ride.onDeath(p); // ขี่ผู้เล่นอื่น (server/ride.js): ตัวที่ขี่ตาย = ทิ้งศพที่ช่องของตัวที่ถูกขี่ · ตัวที่ถูกขี่ตาย = คนขี่ร่วง
  Duo.onDeath(p); // ระบบคู่ / ศพค้าง (ยูนะ): ล้มแล้วทิ้งร่างไว้ (ไม่มีใครเก็บร่าง = ร่างหาย) · ยังจั่วไพ่ได้ถ้าอีกตัวรอด
  if (Duo.isOwner(p) && Duo.sideAlive(p)) { p.result = null; p.locked = match.gameState !== "PLAYING"; }
  qteSystem.clearQte(p); // ตกรอบแล้ว QTE ที่ค้างอยู่ต้องหายไปด้วย (ไม่งั้นค้างข้ามการชุบชีวิต/ย้อนเวลา)
  // นักบินปริศนา: คนในสนามเหลือน้อยกว่าเงื่อนไข = ปรากฏตัว · ยูนะ: ตายเองแล้วศพทุกศพหาย · p = คนที่ตาย
  broadcastHook("onDeath", engine, p);
  // ต้นเหตุของการตาย = ผู้ที่ตั้ง effectSource ไว้ (ตีปกติ/สกิล/ผลักตอนขยายร่าง) → ฮุค onKill ของตัวละครผู้สังหารเท่านั้น
  //  (Echo — การกลืนกินระดับ EX)
  const killer = match.effectSourceId && match.players[match.effectSourceId];
  if (killer) runHook(CHAR_HOOKS[killer.characterId], "onKill", engine, killer, p);
}

// สรุปผลหลังดาเมจจากสกิลของโมดูลตัวละคร/ไอเทม: ตกรอบทันทีเมื่อ HP หมด
function resolveDamageAftermath(p) {
  if (p && p.alive && p.hp <= 0) instantDeath(p);
}

// ฮีลพร้อมล้น: เลือดจริง -> เกราะ -> เลือดชั่วคราว (หายเองใน 2 เทิร์น / หมดเมื่อรับดาเมจ)
//  คืนรายละเอียดว่าฮีลครั้งนี้ลงช่องไหนเท่าไหร่ (ใช้แจ้งผลใน log ให้ชัด)
function healOverflow(p, amount) {
  let left = amount;
  const toHp = healHp(p, left); // "ไม่ใช้งานต่อ" = ฟื้นเลือดจริงไม่ได้ (ล้นไปเกราะ/เลือดชั่วคราวได้ตามปกติ)
  left -= toHp;
  let toArmor = 0;
  if (left > 0) {
    toArmor = Math.min(left, Math.max(0, maxArmorOf(p) - p.armor));
    p.armor += toArmor; left -= toArmor;
  }
  if (left > 0) {
    p.tempHp = (p.tempHp || 0) + left;
    p.tempHpTurns = TEMP_HP_TURNS;
  }
  return { toHp, toArmor, toTemp: left };
}

// เลือดจริงลด 1 หน่วย — เลือดชั่วคราวรับแทนก่อนเสมอ (หมดไปเพราะได้รับความเสียหาย)
function loseHp(p) {
  if (friendlyEffectBlocked(p)) return;
  // เกราะ Mark 42: เส้นทางที่เรียก loseHp ตรงๆ (ไม่ผ่านท่อดาเมจ) ก็ลงชุดแทน
  if (Mark42.absorb(engine, p, 1)) return;
  if ((p.tempHp || 0) > 0) { p.tempHp--; tookDamage(p); return; }
  p.hp--; p.dmgHp++;
  tookDamage(p);
}
// เสียพลังชีวิต/เกราะ 1 หน่วย (ทุกช่องทาง) → ฮุค onDamageTaken ของตัวละคร (Ice Spike: สะสมไว้ระเบิด)
function tookDamage(p) {
  const hook = CHAR_HOOKS[p.characterId];
  if (hook && hook.onDamageTaken) hook.onDamageTaken(engine, p, 1);
  // ถูกผู้เล่นอื่นทำให้เสียหาย = ถูกโจมตี — คนที่ขี่อยู่ร่วง (server/ride.js)
  const src = match.effectSourceId && match.players[match.effectSourceId];
  if (src && src.id !== p.id) {
    Ride.onAttacked(p, src);
    // ฮุค broadcast onDamageDealt(engine, ต้นตอ, เป้า): ต้นตอทำให้เป้าเสียพลังชีวิต/เกราะ/เลือดชั่วคราวจริง 1 หน่วย
    //  (วาเลนไทน์: สกิลติดตัว แต้มสกิล +1 ต่อการโจมตี 1 ครั้ง — แยกครั้งด้วย match.cmdSeq)
    broadcastHook("onDamageDealt", engine, src, p);
  }
}
// ไม่มีอะไรจากคนอื่นแตะได้ (ดาเมจ/ดีบัฟ) — ฮุค untouchable(engine, p) ของตัวละคร (ยูนะ: เงาของเสียง)
function untouchable(p) {
  const hook = p && CHAR_HOOKS[p.characterId];
  if (!hook || !hook.untouchable || !hook.untouchable(engine, p)) return false;
  return !match.effectSourceId || match.effectSourceId !== p.id;
}

function loseArmor(p) {
  if (friendlyEffectBlocked(p)) return;
  // เกราะ Mark 42: ล้าง/สลายเกราะ ลงเกราะชุดแทนเกราะจริงที่ซ่อนอยู่ข้างใต้
  if (Mark42.absorb(engine, p, 1)) return;
  p.armor--; p.dmgArmor++;
  // ไรโด ฮิคารุ (ร่าง UltraLive): เกราะที่เสียไปกลายเป็นฟื้นพลังชีวิต
  const hook = CHAR_HOOKS[p.characterId];
  if (hook && hook.onArmorLost) hook.onArmorLost(engine, p);
  tookDamage(p);
}
// ชั้นรับดาเมจก่อนเกราะของตัวละคร (ฮุค absorbDamage(engine, p) → true = รับไว้ 1 หน่วย — ไจโร: ม้าวาลคิรี)
//  อยู่หลังโล่ ก่อนเกราะ · ดาเมจทะลุเกราะ (dealDirect) ข้ามชั้นนี้
function layerAbsorb(p) {
  const hook = CHAR_HOOKS[p.characterId];
  return !!(hook && hook.absorbDamage && runHook(hook, "absorbDamage", engine, p));
}
// ดาเมจแพ้จั่ว/ไพ่แตก 1 หน่วย: โล่ -> เกราะ -> เลือด
function damageSoft(p) {
  if (!p.alive || friendlyEffectBlocked(p)) return;
  // เกราะ Mark 42: ดาเมจแพ้จั่วลงชุดแทนตัวจริง
  if (Mark42.absorb(engine, p, 1)) return;
  if (p.shield > 0) { p.shield--; return; }
  if (layerAbsorb(p)) return;
  if (p.armor > 0) loseArmor(p);
  else loseHp(p);
}
// kind = ช่องทางที่เรียกมา ("direct"/"armor"/"mixed") — ส่งต่อให้ hook ของตัวละครที่อยากรู้ช่องทาง
function adjustIncomingDamage(p, n, isNormalAttack, kind) {
  // ชั้นมิติ (server/dimension.js): ต้นตออยู่คนละชั้นกับเป้า = ไม่มีผล (ผลสนามที่ไม่มีต้นตอยังโดน)
  if (n > 0 && Dim.blocks(p)) return 0;
  // ตั้งรับด้วยการหยุดเวลา (ฮุค counterArmed — ดิเอโก้: เดอะเวิลด์) = ตัดการกระทำของผู้โจมตีทั้งก้อน (server/timeStop.js)
  if (n > 0) TimeStop.check(p, n);
  // เกราะ Mark 42: ชุดรับความเสียหายทุกชนิดแทนตัวจริงทั้งก้อน (ส่วนเกินหายไปพร้อมชุด = แค่กลับร่างเดิม)
  if (n > 0 && Mark42.absorb(engine, p, n)) return 0;
  if (n > 0 && untouchable(p)) return 0;
  const hook = CHAR_HOOKS[p && p.characterId];
  n = hook && hook.adjustIncomingDamage ? hook.adjustIncomingDamage(engine, p, n, isNormalAttack, kind) : n;
  // ออร่าของคนอื่นที่เพิ่ม/ลดความเสียหายที่ได้รับ (ฮุค auraIncoming(engine, p, n) → ส่วนต่าง · ยูนะ: Delete +1 / Smile for You −1)
  //  ทุกความเสียหาย (ตีปกติ · สกิล · ผลต่อเทิร์น) ที่ยังเหลือ > 0 หลังฮุคของเป้าเอง · ลดถึง 0 ได้
  if (n > 0) {
    let d = 0;
    for (const mod of CHAR_HOOKS.MODULES) if (typeof mod.auraIncoming === "function") d += runHook(mod, "auraIncoming", engine, p, n) || 0;
    n = Math.max(0, n + d);
  }
  return Math.min(n, damageCapOf(match.effectSourceId && match.players[match.effectSourceId]));
}
// เพดานความเสียหายต่อครั้งของผู้ลงมือ (ฮุค damageCap(engine, source) → ตัวเลข | null — ยูนะ: ขี่อยู่ไม่เกิน 2) · ไม่มี = ไม่จำกัด
//  ใช้ทั้งท่อดาเมจ (หลังฮุคเป้า + ออร่า) และตัวเลขในฉากตีปกติ (attack.strike)
function damageCapOf(source) {
  const cap = source ? runHook(CHAR_HOOKS[source.characterId], "damageCap", engine, source) : null;
  return Number.isFinite(cap) ? Math.max(0, cap) : Infinity;
}
// ดาเมจทะลุเกราะ: ข้ามเกราะหลัก
function dealDirect(p, n, isNormalAttack) {
  if (friendlyEffectBlocked(p)) return;
  n = adjustIncomingDamage(p, n, isNormalAttack, "direct");
  if (n <= 0) return;
  for (let i = 0; i < n; i++) {
    if (!p.alive) return;
    if (p.shield > 0) { p.shield--; continue; }
    loseHp(p);
  }
}
function dealArmorOnly(p, n, isNormalAttack) {
  if (friendlyEffectBlocked(p)) return;
  n = adjustIncomingDamage(p, n, isNormalAttack, "armor");
  if (n <= 0) return;
  for (let i = 0; i < n; i++) {
    if (p.shield > 0) { p.shield--; continue; }
    if (layerAbsorb(p)) continue;
    if (p.armor > 0) loseArmor(p);
  }
}
function dealMixed(p, n, isNormalAttack) { // เกราะก่อนแล้วเลือด
  if (friendlyEffectBlocked(p)) return;
  n = adjustIncomingDamage(p, n, isNormalAttack, "mixed");
  if (n <= 0) return;
  for (let i = 0; i < n; i++) {
    if (!p.alive) return;
    if (p.shield > 0) { p.shield--; continue; }
    if (layerAbsorb(p)) continue;
    if (p.armor > 0) loseArmor(p);
    else loseHp(p);
  }
}
// src = แหล่งที่มาของการฟื้นพลังงาน ("item" / "passive" / "card") — ใส่เฉพาะช่องทาง "ฟื้นฟู" จริงๆ
function addSkill(p, n, src) {
  // ชะงัก (Universal): ฟื้นฟูแต้มสกิลไม่ได้ทุกช่องทาง ระหว่างติดสถานะนี้
  if (((p.statuses && p.statuses.stagger) || 0) > 0) return;
  if (((p.statuses && p.statuses.manaSeal) || 0) > 0) return; // ผนึกพลังงาน (Universal): ฟื้นฟูแต้มสกิลไม่ได้ทุกช่องทาง
  const before = p.skillPoints;
  p.skillPoints = Math.min(maxSkillOf(p), p.skillPoints + n);
  p.gainedSkill += p.skillPoints - before;
}

function applyEffect(p, effect) {
  if (!effect) return;
  if (Array.isArray(effect)) return effect.forEach((e) => applyOne(p, e));
  applyOne(p, effect);
}
function applyOne(p, e) {
  switch (e.type) {
    case "heal": healHp(p, e.amount); break;
    case "armor": healArmor(p, e.amount); break;
    case "points": addSkill(p, e.amount, "passive"); break;
    case "shield": p.shield += e.amount || 1; break;
    case "draw": for (let i = 0; i < (e.amount || 1); i++) { const c = cardDeck.drawCardFor(p); if (c) { p.cards.push(c); cardDeck.onCardDrawn(p, c); } } break;
    case "redraw": {
      p.cards = [];
      for (let i = 0; i < 2; i++) { const c = cardDeck.drawCardFor(p); if (c) { p.cards.push(c); cardDeck.onCardDrawn(p, c); } }
      break;
    }
    case "status": p.statuses[e.status] = e.turns || 1; break;
  }
}
function firePassive(p, trigger) {
  const ch = CHAR_BY_ID[p.characterId];
  if (ch && ch.passive && ch.passive.trigger === trigger) applyEffect(p, ch.passive.effect);
}
// หาข้อมูลสกิล (ชื่อ+รูป) จาก status ที่กำลังมีผล — ใช้โชว์ตอนอนิเมชันโจมตี ว่าดาเมจ/การป้องกันมาจากสกิลไหนของใคร
function skillByStatus(p, status) {
  const ch = CHAR_BY_ID[p.characterId];
  if (!ch) return null;
  for (const tier of ["basic", "secondary", "ultimate"]) {
    const s = ch[tier];
    if (s && s.effect && !Array.isArray(s.effect) && s.effect.type === "status" && s.effect.status === status) {
      return { name: s.name, img: s.img || null, by: p.name, color: lobby.colorOf(p) };
    }
  }
  return null;
}

// ไพ่แตกก่อนเปิดไพ่ = ท่าไม้ตายที่เพิ่งกดในเทิร์นนี้ใช้งานไม่ได้ (แต้มสกิลที่จ่ายไปเสียฟรี)
function voidUltimateOnBust(p) {
  for (const key of Object.keys(TRANSFORMS)) {
    if (!TRANSFORMS[key].afterReveal) continue; // เฉพาะท่าไม้ตายที่ทำงานหลังเปิดไพ่
    if ((p.statuses[key] || 0) > 0 && !p.seen[key]) {
      delete p.statuses[key];
      match.lastLog.push(`💥 ${p.name} ไพ่แตก! ท่าไม้ตาย ${TRANSFORMS[key].title} ใช้งานไม่ได้ — แต้มสกิลเสียฟรี`);
    }
  }
}

function resetRoundDisplay(p) {
  p.dmgHp = 0; p.dmgArmor = 0; p.gainedSkill = 0;
  p.wasAttacked = false; p.didAttackRound = false;
}
function resetCombat(p) {
  p.ready = false; // ห้องรอ: ต้องกดพร้อมใหม่ทุกครั้งที่กลับมาห้องรอ/เริ่มแมตช์ใหม่
  p.skillPoints = 0; p.alive = true; p.shield = 0;
  p.statuses = {}; p.seen = {}; p.transformAt = 0;
  p.statusAmt = {};      // จำนวน (amount) ของบัฟ/ดีบัฟพื้นฐาน (patch 2.0.8) — คู่กับ p.statuses
  p.skillUsedRound = false; // ใช้สกิลได้ 1 อันต่อเทิร์น
  // ---------- ร้านค้ามายา + เศรษฐกิจเหรียญ (patch 2.2 full) ----------
  p.gold = 0;        // เหรียญสะสม (เพดาน 30)
  p.inventory = [];  // ของที่ซื้อจากร้านค้า รอใช้ (รวมปืนหน่วย GUTS Select — หายทุกแมตช์ใหม่)
  p.gutsShotTurn = 0;              // ปืนหน่วย GUTS Select: เทิร์นล่าสุดที่ยิงไป (1 นัด/เทิร์น)
  p.gutsGargorgonPending = false;  // Gargorgon Ray: รอแปลงเป็นสตั้นตอนต้นเทิร์นถัดไป
  p.tempHp = 0;           // เลือดชั่วคราวจากฮีลล้น (healOverflow)
  p.tempHpTurns = 0;      // เลือดชั่วคราวหายเองเมื่อครบ 2 เทิร์น
  p.sleepFresh = false; // หลับไหล: เทิร์นที่เพิ่งโดนกล่อมยังไม่เริ่มนับ/ยังโจมตีได้
  p.curseHitRound = 0;  // "คำสาป": เทิร์นล่าสุดที่คำสาปกินเลือดไป (1 ครั้ง/เทิร์น)
  Mark42.resetCombat(p); // เกราะ Mark 42: ชุดที่ใส่อยู่ / ชุดที่ส่งออกไป / คูลดาวน์ซื้อ
  p.boardSize = 1; // ขนาดตัวบนกระดาน (Echo ขยายร่าง — server/phases/action.js resizeUnit)
  // ฟิลด์เฉพาะตัวของทุกตัวละคร (ฮุค resetCombat) — หลังล้างกระเป๋า (เอมิลิโกะได้ขนมปัง) · ก่อนคิดเลือด/เกราะเริ่มเกม (Echo/ฮิคารุ)
  //  โอเบรอน: คูลดาวน์ + สตั้นที่จองไว้ (ติดที่เป้าหมาย) · มุยมิ: โควตาเสบียง · นักบินปริศนา: แขน/ล่องหน · โซระ: ร่าง/อาวุธ
  //  Echo: ขยายร่าง/จำนวนที่สังหาร · ฮิคารุ: UltraLive/กิงกะ · Ice Spike: ดาเมจสะสม/โควตา · เคท & เอมิลิโกะ: อาวุธ/ดาบเขม่า/ร่าง
  broadcastHook("resetCombat", p);
  p.exposedRound = 0; // พุ่มหญ้า: โผล่เพราะโจมตีจากในพุ่ม (เลขรอบ — server/visibility.js)
  p.nightTaxTier = null;        // กลางคืน (patch 2.1.7): สกิลที่สุ่มโดนคืนนี้ใช้แต้มมากขึ้น +1 ("basic" | "secondary" | null)
  p.cutsceneShown = {}; // เล่นวีดีโอครั้งเดียวต่อเกม (per match)
  // เลือด/เกราะเริ่มเกม: คำนวณหลังรีเซ็ต statuses แล้วเท่านั้น
  p.hp = maxHpOf(p);
  p.armor = maxArmorOf(p);
}

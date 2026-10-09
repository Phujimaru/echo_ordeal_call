// เฟสไพ่: แจกรอบใหม่, จั่ว, เปิดไพ่
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  dealRound, hit, lock, checkAllLocked,
});

const { CHAR_BY_ID } = require("../../characters");
const CHAR_HOOKS = require("../../characters/index");
const {
  tickPoison, tickShock, tickMend, tickBurn, tickBleed,
} = require("../../characters/_universal_status");
const Journey = require("../../characters/_journey");
const match = require("../match");
const { engine } = require("../engine");
const combat = require("../combat");
const cutscene = require("../cutscene");
const dayNight = require("../dayNight");
const cardDeck = require("../deck");
const qteSystem = require("../qte");
const shop = require("../shop");
const summary = require("./summary");
const timers = require("../timers");
const view = require("../view");

function dealRound() {
  timers.clearPhaseTimer();
  match.roundNumber++;
  match.centralDeck = cardDeck.buildCentralDeck(); // กองกลาง 43 ใบ สับใหม่ทุกรอบ
  match.lastLog = [];
  match.turnOrder = [];
  match.actorIndex = -1;
  match.actorId = null;
  match.action = null;
  match.cutsceneQueue = []; // ล้างคิวเก่าก่อนเสมอ — ต้องอยู่ก่อน CHAR_HOOKS ด้านล่างทั้งหมด ไม่งั้นคัตซีนที่เพิ่งคิวไว้จะโดนล้างทิ้งไปด้วย
  match.cutsceneInfo = null;
  match.lastAttack = null;
  match.roundSkills = [];
  CHAR_HOOKS.sliver_bullet.refresh(engine); // นักบินปริศนา: หมดเวลาปรากฏตัว (2 เทิร์น) = ล่องหนอีกครั้ง
  // ร้านค้าบนแผนที่: ตั้ง/ย้ายจุดทุก 5 เทิร์น (สุ่มของใหม่) · ไม่ย้าย = คิดผลของภูมิภาคต่อร้านตามช่วงเวลาของเทิร์นนี้
  shop.maybeMoveShop();
  const prevNight = dayNight.isNightRound(match.roundNumber - 1);

  for (const p of Object.values(match.players)) {
    combat.resetRoundDisplay(p);
    p.shield = 0;
    p.skillUsedRound = false; // เทิร์นใหม่ ใช้สกิลได้อีก 1 อัน
    if (!p.alive) { p.cards = []; p.locked = true; p.busted = false; continue; }

    // กลางคืน (patch 2.1.7): สุ่มใหม่ทุกเทิร์นว่าสกิลพื้นฐานหรือสกิลรอง (อย่างใดอย่างหนึ่ง) จะใช้แต้มมากขึ้น — ไม่มีผลกับท่าไม้ตาย
    //  การเดินทาง: ภาษีนี้เหลือเฉพาะ "อาณาจักรแห่งจุดเริ่มต้น" กลางคืน (ภูมิภาคอื่นใช้ผลของภูมิภาคแทน)
    if (Journey.nightTaxOn(engine, dayNight.isNightRound(match.roundNumber))) {
      const ch0 = CHAR_BY_ID[p.characterId];
      const taxCandidates = [];
      if (ch0 && ch0.basic) taxCandidates.push("basic");
      if (ch0 && ch0.secondary) taxCandidates.push("secondary");
      p.nightTaxTier = taxCandidates.length ? taxCandidates[Math.floor(Math.random() * taxCandidates.length)] : null;
    } else {
      p.nightTaxTier = null;
    }

    CHAR_HOOKS.oberon_summer.onRoundStartTick(engine, p);  // นกจาบยามเช้า: เป้าหมายเสียพลังชีวิต 2 ทะลุเกราะ

    // ---------- สิ่งแปลกปลอม (oblada, สถานะ Universal): ดาเมจ 1 ทุก 2 เทิร์น — ทำงานตอนเวลาคงเหลือเป็นเลขคี่ ----------
    {
      const dotDmg = ((p.statuses.oblada || 0) > 0 && p.statuses.oblada % 2 === 1) ? 1 : 0;
      if (dotDmg > 0) {
        combat.dealMixed(p, dotDmg);
        p.wasAttacked = true;
        match.lastLog.push(`🌩️ ${p.name} ถูกสิ่งแปลกปลอมกัดกิน — รับความเสียหาย -${dotDmg}`);
        if (p.alive && p.hp <= 0) {
          combat.instantDeath(p);
          if (!p.alive) match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`);
          p.cards = [];
          p.locked = true;
          p.busted = false;
          continue;
        }
      }
    }

    // เครื่องดื่มชูกำลัง (energy, สถานะ Universal): เพิ่มแต้มสกิล 1 แต่เสียพลัง 1 หน่วยต่อเทิร์น
    //  ความเสียหายธรรมดา (โดนโล่/เกราะก่อน ไม่เจาะเกราะ) และไม่ถึงตาย — เลือดค้างที่ 1
    if ((p.statuses.energy || 0) > 0) {
      combat.addSkill(p, 1, "item");
      if (p.shield > 0 || p.armor > 0 || (p.tempHp || 0) > 0 || p.hp > 1) {
        combat.damageSoft(p);
        match.lastLog.push(`🥤 ${p.name} เครื่องดื่มชูกำลังออกฤทธิ์ — แต้มสกิล +1 เสียพลัง 1 หน่วย (เกราะก่อน)`);
      } else {
        match.lastLog.push(`🥤 ${p.name} เครื่องดื่มชูกำลังออกฤทธิ์ — แต้มสกิล +1 (พลังชีวิตเหลือ 1 จึงไม่ลด)`);
      }
    }

    // เกราะฟื้น 1 หน่วยทุก 2 เทิร์น (รอบเลขคู่) — เหมือนกันทั้งกลางวัน/กลางคืน (ยกเลิกโบนัสฟื้นทุกเทิร์นตอนกลางคืน patch 2.1.7)
    //  ผุพัง (สถานะ Universal): เกราะไม่ฟื้นระหว่างมีผล · การเดินทาง: ภูมิภาค 5-7 เกราะฟื้นทุกเทิร์น (Journey.armorRegenDue)
    if (!((p.statuses.decay || 0) > 0) && Journey.armorRegenDue(engine, match.roundNumber)) combat.healArmor(p, 1);
    // ตื่นขึ้น (awaken, สถานะ Universal): ฟื้นพลังชีวิตเทิร์นละ 1 หน่วย
    if ((p.statuses.awaken || 0) > 0 && combat.healHp(p, 1) > 0) {
      match.lastLog.push(`⏰ ${p.name} การตื่นขึ้น — ฟื้นพลังชีวิต +1`);
    }
    combat.firePassive(p, "roundStart");

    // ---------- ลุกไหม้ (hburn, สถานะ Universal): ดาเมจ 1/เทิร์น สะสมสูงสุด 6 — ย้าย body ไป characters/_universal_status.js แล้ว ----------
    tickBurn(engine, p);
    // ---------- เลือดไหล (hbleed, สถานะ Universal patch 2.5): ดาเมจ 1/เทิร์น สะสมสูงสุด 6 ----------
    tickBleed(engine, p);
    tickPoison(engine, p); // พิษร้าย (สถานะ Universal): ดาเมจต้นเทิร์น — ส่วนพลังโจมตีหักที่ computeAttackBase
    // ช็อต (สถานะ Universal): โรล 15% ติดสตั้น — ต้องอยู่ก่อนบล็อกเช็คสตั้นด้านล่าง ไม่งั้นสตั้นจะเลื่อนไปมีผลเทิร์นถัดไป
    tickShock(engine, p);
    p.cards = [];
    p.colorTrigger = { red: 0, blue: 0, green: 0, yellow: 0 }; // นับจำนวนครั้งที่ทริกเกอร์สีนั้นทำงานไปแล้วในรอบนี้
    p.statusAmt.cardAtkBonus = 0; // พลังโจมตีจากการ์ดแดง — รีเซ็ตทุกรอบ
    { const c = cardDeck.drawInitialCard(p); if (c) { p.cards.push(c); cardDeck.onCardDrawn(p, c); } }
    p.locked = false;
    p.busted = false;
    p.result = null;

    // หลับไหล (สถานะพื้นฐาน): ออกการกระทำใดๆ ไม่ได้ทั้งเทิร์น
    // และเสียพลังชีวิตแบบไม่สนเกราะเทิร์นละ 1 หน่วย — หักได้เรื่อยๆ แต่ห้ามตาย (ค้างที่ 1 หน่วย)
    if ((p.statuses.sleep || 0) > 0) {
      p.locked = true;
      if (p.hp > 1) { p.hp--; p.dmgHp++; }
      match.lastLog.push(`💤 ${p.name} หลับไหล — ขยับไม่ได้ (เหลืออีก ${p.statuses.sleep} เทิร์น)`);
    }

    // ---------- "เยียวยา" (สถานะ Universal patch 3.4): ฟื้นพลังชีวิตต่อเทิร์นตามจำนวนหน่วย ----------
    //  วางไว้ที่นี่ (ต้นเทิร์น) เหมือนลุกไหม้/เลือดไหล การลดเทิร์นทำที่ลูปกลางของ endTurn ตามปกติ
    tickMend(engine, p);
    // Gargorgon Ray (ปืนหน่วย GUTS Select): ผลหน่วง 1 เทิร์น — เช็คต้านสถานะตอนนี้ (เป้าหมายซื้อยาต้านมากันไว้ทัน)
    //  ต้องอยู่ "ก่อน" บล็อกเช็คสตั้นด้านล่าง ไม่งั้นสตั้นจะข้ามไปมีผลอีกเทิร์นหนึ่ง
    if (p.gutsGargorgonPending) {
      p.gutsGargorgonPending = false;
      if (combat.applyDebuff(p, "stun", null, 1)) match.lastLog.push(`🌑 ${p.name} โดน Gargorgon Ray เมื่อเทิร์นก่อน — ติดสถานะสตั้น 1 เทิร์น!`);
      else match.lastLog.push(`🛡️ ${p.name} ต้านผลของ Gargorgon Ray ไว้ได้ — ไม่ติดสตั้น`);
    }
    // สตั้น (สถานะพื้นฐาน patch 2.0.8): ทำอะไรไม่ได้จนจบเทิร์นหรือจนกว่าดีบัฟจะหมดเวลา
    if ((p.statuses.stun || 0) > 0) {
      p.locked = true;
      match.lastLog.push(`😵 ${p.name} ติดสถานะสตั้น — ขยับไม่ได้ทั้งเทิร์น! (เหลืออีก ${p.statuses.stun} เทิร์น)`);
    }
  }

  // สลับช่วงเวลากลางวัน/กลางคืน — แบนเนอร์บอกทั้งสนามเมื่อช่วงเวลาเปลี่ยน
  const night = dayNight.isNightRound(match.roundNumber);
  if (match.roundNumber > 1 && night !== prevNight) {
    match.lastLog.push(night ? "🌙 ราตรีมาเยือน — สุ่มสกิลพื้นฐาน/สกิลรองแพงขึ้น +1 ทุกเทิร์น" : "☀️ ฟ้าสางแล้ว — จบเทิร์นได้แต้มสกิลเพิ่ม +1");
  }

  match.gameState = "PLAYING";
  timers.startPhaseTimer(timers.cardPhaseSeconds(), summary.resolveRound);
  // คัตซีนที่ถูกคิวไว้ระหว่างเอฟเฟกต์ต้นเทิร์น เล่นก่อนแล้วค่อยเริ่มช่วงจั่วไพ่
  if (match.cutsceneQueue.length) { cutscene.pausePlayingForCutscene(); return; }
  view.broadcastState();
  checkAllLocked();
}

function hit(id) {
  const p = match.players[id];
  if (match.gameState !== "PLAYING" || !p || !p.alive || p.locked) return;
  if (match.centralDeck.length === 0) return; // กองร่วมหมดแล้ว ทุกคนจั่วเพิ่มไม่ได้
  if ((p.statuses.nodraw || 0) > 0) return; // ห้ามจั่ว: เทิร์นนี้จั่วเพิ่มไม่ได้
  if (cardDeck.scoreOf(p) >= cardDeck.scoreCap(p)) return; // แต้มเต็มเพดาน (เช่น 21 พอดี) = จั่วไม่ได้ รอผู้ใช้ใช้สกิล/เปิดไพ่เอง
  // โชคลาภ (patch 2.2 new): จั่วปุ๊ป ถ้ามีบัฟสะสมอยู่ ใช้ 1 หน่วยทันทีแล้วหน่วยนั้นหายไป
  //  ปรับไพ่ที่จั่วให้แต้มรวมตกอยู่ 19-21 (สุ่มถ่วงน้ำหนัก มีเคสพิเศษถ้าแต้มปัจจุบันเป็น 19/20 อยู่แล้ว)
  //  ถ้าเป้าที่สุ่มได้ไม่มีไพ่ให้จั่วพอดี จะลองเป้าที่เหลือก่อน — ไม่มีไพ่ให้ตรงเป้าไหนเลยจริงๆ ค่อยจั่วแบบสุ่มตามปกติ (แตกได้ตามปกติ)
  let drawn = null;
  if ((p.statuses.fortune || 0) > 0) {
    p.statuses.fortune--;
    if (p.statuses.fortune <= 0) delete p.statuses.fortune;
    const cur = cardDeck.calculateScore(p.cards);
    let picked = null;
    for (const target of cardDeck.fortuneTargetList(cur)) {
      const need = target - cur;
      if (need < 1 || need > 10) continue;
      const c = cardDeck.drawFromCentralDeck((card) => !card.special && card.value === need);
      if (c) { picked = { target, card: c }; break; }
    }
    if (picked) {
      drawn = picked.card;
      p.cards.push(drawn);
      match.lastLog.push(`🍀 ${p.name} โชคลาภทำงาน — ได้ไพ่ที่ทำให้แต้มรวมเป็น ${picked.target}!`);
    } else {
      drawn = cardDeck.drawCardFor(p);
      if (drawn) p.cards.push(drawn);
      match.lastLog.push(`🍀 ${p.name} โชคลาภทำงาน แต่ไม่มีไพ่ที่ทำให้ถึงเป้าไหนได้เลย — จั่วแบบสุ่มตามปกติ`);
    }
  } else {
    drawn = cardDeck.drawCardFor(p);
    if (drawn) p.cards.push(drawn);
  }
  if (drawn) cardDeck.onCardDrawn(p, drawn);
  // สภาพชา (ดีบัฟ Universal — Thunder Bullet): กดจั่ว 1 ครั้ง ได้ไพ่ 2 ใบ
  //  ใบที่ 2 จั่วแบบสุ่มปกติเสมอ (โชคลาภช่วยแค่ใบแรก) และไม่เช็คเพดานแต้มซ้ำ — แตกได้ตามสภาพ
  if ((p.statuses.chaa || 0) > 0) {
    const extra = cardDeck.drawCardFor(p);
    if (extra) {
      p.cards.push(extra);
      cardDeck.onCardDrawn(p, extra);
      match.lastLog.push(`🌀 ${p.name} อยู่ในสภาพชา — จั่วติดมาอีกใบ (${shop.cardLabel(extra)})`);
    }
  }
  p.busted = cardDeck.bustedOf(p);
  if (p.busted) combat.voidUltimateOnBust(p);
  // ไพ่แตก: ไม่ล็อกอัตโนมัติ — ยังกดสกิล/ใช้ไอเทมได้ต่อไป จนกว่าจะกดเปิดไพ่เอง หรือทุกคนเปิดไพ่ครบ
  view.broadcastState();
  checkAllLocked();
}
function lock(id) {
  const p = match.players[id];
  if (match.gameState !== "PLAYING" || !p || !p.alive || p.locked) return;
  cardDeck.applyLockColorTriggers(p);
  p.locked = true;
  view.broadcastState();
  checkAllLocked();
}
function checkAllLocked() {
  if (match.gameState !== "PLAYING") return;
  // QTE ที่ยังเล่นไม่จบ — คนอื่นจั่ว/เปิดไพ่ได้ตามปกติ แค่ยังไม่สรุปรอบให้
  // ถ้าไม่เหลือใครรอดเลยก็ต้องสรุปผลด้วยเช่นกัน ไม่งั้นเกมค้าง
  if (combat.alivePlayers().every((p) => p.locked) && !qteSystem.qtePending()) summary.resolveRound();
}

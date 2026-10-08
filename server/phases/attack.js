// เฟสโจมตี: เลือกเป้า, คำนวณดาเมจ, doAttack
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  attackableTargets, afterSummary, attackSoundOf, computeAttackBase,
  estimateAttackOn, doAttack,
});

const CHAR_HOOKS = require("../../characters/index");
const {
  statusAmtOf, poisonAtkPenalty, invertActive, consumeEvadeStack, accurateActive,
} = require("../../characters/_universal_status");
const { NETRAMANA_KILL_CHANCE, netramanaActive } = require("../../characters/_universal_status");
const Mark42 = require("../../characters/_mark42");
const Journey = require("../../characters/_journey");
const { ATTACKFX_TIME, ATTACK_TIME } = require("../constants");
const match = require("../match");
const { engine } = require("../engine");
const combat = require("../combat");
const cutscene = require("../cutscene");
const endTurnPhase = require("./endTurn");
const lobby = require("../lobby");
const timers = require("../timers");
const view = require("../view");

function attackableTargets(atkId) {
  const attacker = match.players[atkId];
  return combat.alivePlayers().filter((p) => p.id !== atkId && !combat.sameTeam(attacker, p));
}

function afterSummary() {
  const winner = match.players[match.roundWinnerId];
  // หลับไหล: ผู้ชนะที่ยังหลับอยู่ ออกการกระทำไม่ได้ -> ไม่มีเทิร์นโจมตี
  //  (เทิร์นที่เพิ่งโดนกล่อม sleepFresh ยังโจมตีได้ — การหลับเริ่มเทิร์นถัดไป)
  if (winner && winner.alive && (winner.statuses.sleep || 0) > 0 && !winner.sleepFresh) {
    match.lastLog.push(`💤 ${winner.name} ยังหลับไหลอยู่ — ไม่มีเทิร์นโจมตี`);
    endTurnPhase.endTurn();
    return;
  }
  // สตั้น (สถานะพื้นฐาน patch 2.0.8): ไม่มีเทิร์นโจมตี
  if (winner && winner.alive && (winner.statuses.stun || 0) > 0) {
    match.lastLog.push(`💤 ${winner.name} ไม่อยู่ในสภาพจะโจมตีใคร — ไม่มีเทิร์นโจมตี`);
    endTurnPhase.endTurn();
    return;
  }

  if (winner && winner.alive && !match.roundTiedWin) {
    const targets = attackableTargets(winner.id);
    if (targets.length > 0) {
      match.attackerId = winner.id;
      match.gameState = "ATTACK";
      timers.startPhaseTimer(ATTACK_TIME, () => {
        const t = attackableTargets(match.attackerId);
        if (t.length) doAttack(match.attackerId, t[Math.floor(Math.random() * t.length)].id);
        // doAttack ปฏิเสธเป้าได้ — อย่าให้เฟส ATTACK ค้าง
        if (match.gameState === "ATTACK") endTurnPhase.endTurn();
      });
      view.broadcastState();
      return;
    }
  }
  endTurnPhase.endTurn();
}

// เสียงโจมตีปกติเฉพาะตัวละคร (คีย์ใน client/src/audio.js) — undefined = ใช้เสียง "attack" กลาง
function attackSoundOf(attacker) {
  if (!attacker) return undefined;
  if (attacker.characterId === "muimi") return CHAR_HOOKS.muimi.towerActive(attacker) ? "muimi_ub_hit" : "muimi_normal_hit";
  return undefined;
}

// สูตรคำนวณพลังโจมตีพื้นฐาน — ดึงออกมาจาก doAttack() ให้ทดสอบแยกได้ (ดู tests/computeAttackBase.test.js)
//  ตัวละครเติมพลังโจมตีของตัวเองผ่าน characters/<id>.js's damageBonus()/attackBaseOverride()
//  (ใส่ข้อมูลไว้แสดงผลใน ctx ได้ เช่น ctx.muimiTowerAtk)
function computeAttackBase(engine, attacker, target) {
  const hookCtx = {};
  const hook = engine.CHAR_HOOKS && engine.CHAR_HOOKS[attacker.characterId];
  const baseHook = (hook && hook.attackBaseOverride) ? hook.attackBaseOverride(engine, attacker, target, hookCtx) : 1;
  const hookBonus = (hook && hook.damageBonus) ? (hook.damageBonus(engine, attacker, target, hookCtx) || 0) : 0;

  const empowerAtk = (attacker.statuses.empower || 0) > 0;
  const cardAtkBonus = attacker.statusAmt.cardAtkBonus || 0; // การ์ดแดงครบ 3 ใบตอนเปิดไพ่

  const mark42Atk = Mark42.attackBonus(attacker); // เกราะ Mark 42: พลังโจมตี +1 ระหว่างใส่ (ungated ใครใส่ก็ได้)
  // การเดินทาง: ป่าไม้ต้องสาป กลางวัน (ตีโดนแรงขึ้น +1) / จุดสิ้นสุดของโลก กลางคืน (ทุกคน +1) — ผลสนาม ungated
  const journeyAtkFx = Journey.attackBonus(engine);
  const journeyAtk = journeyAtkFx ? journeyAtkFx.amount : 0;
  // โอเบรอน (ฤดูร้อน): บัฟพลังโจมตีที่แจกให้คนอื่น — ungated ใครติดสถานะก็ได้
  const giftAtk = CHAR_HOOKS.oberon_summer.atkBonus(attacker);
  const base = baseHook + hookBonus + mark42Atk + journeyAtk + giftAtk + (empowerAtk ? 1 : 0) + cardAtkBonus;
  return {
    base,
    empowerAtk, cardAtkBonus, mark42Atk, journeyAtkFx,
    ...hookCtx,
  };
}

// ประเมินพลังโจมตีปกติที่ attacker จะฟาดใส่ target ได้ (engine.attackPowerAgainst)
//  อ่านจากท่อเดียวกับการโจมตีจริง (computeAttackBase) แต่เป็นแค่ "ค่าประเมิน" — โบนัสที่ตัดสินตอนตีจริง
//  (สังหารทันที/หลบหลีก/ลดดาเมจฝั่งรับ) ไม่ถูกนับ · ห่อ try/catch กันโค้ดตัวละครพัง
function estimateAttackOn(attacker, target) {
  try {
    const c = computeAttackBase(engine, attacker, target);
    return Math.max(0, c.base || 0);
  } catch { return null; }
}

function doAttack(byId, targetId) {
  if (match.gameState !== "ATTACK" || byId !== match.attackerId) return;
  const attacker = match.players[byId];
  if (!match.effectSourceId && attacker) return combat.withEffectSource(attacker, () => doAttack(byId, targetId));
  const target = match.players[targetId];
  if (!attacker || !target || !target.alive || target.id === attacker.id || combat.sameTeam(attacker, target)) return;
  timers.clearPhaseTimer();
  attacker.didAttackRound = true;
  // "แม่นยำ" (บัฟ Universal): เจาะการหลบหลีกทุกแบบของเป้าหมาย (โล่กันครั้งยังกันได้ตามปกติ)
  const accurate = accurateActive(attacker);

  // หลบหลีก (สถานะพื้นฐาน patch 2.0.8): หลบการโดนโจมตีตาม % ที่ระบุ
  //  (ไม่ระบุ = 100%) — ซ้อนทับได้ หมดไปทีละ 1 ครั้งเมื่อถูกเลือกโจมตี ไม่ว่าหลบพ้นหรือไม่
  if (!accurate && (target.statuses.evade || 0) > 0) {
    const evadePct = statusAmtOf(target, "evade") || 100;
    consumeEvadeStack(target);
    if (Math.random() * 100 < evadePct) {
      // patch 2.1.3.5: ถูกโจมตีไม่ได้แต้มสกิลอีกต่อไป (แม้หลบพ้น)
      target.wasAttacked = true;
      match.lastLog.push(`💨 หลบหลีก! ${target.name} หลบการโจมตีของ ${attacker.name} ได้ (${evadePct}%) — เหลือหลบหลีกอีก ${target.statuses.evade || 0} ครั้ง`);
      match.lastAttack = {
        id: ++match.attackSeq, byId: attacker.id, targetId: target.id,
        byName: attacker.name, byImg: view.displayImg(attacker), byColor: lobby.colorOf(attacker),
        byAttackSound: attackSoundOf(attacker), // เสียงโจมตีปกติเฉพาะตัว
        targetName: target.name, targetImg: view.displayImg(target), targetColor: lobby.colorOf(target),
        dmg: 0, dodge: true, fxMs: ATTACKFX_TIME * 1000,
        skills: [{ name: `หลบหลีก (${evadePct}%)`, img: null, by: target.name, color: lobby.colorOf(target), side: "def" }],
      };
      match.gameState = "ATTACKING";
      timers.startPhaseTimer(ATTACKFX_TIME, () => cutscene.runCutsceneQueue(endTurnPhase.endTurn));
      view.broadcastState();
      return;
    }
    match.lastLog.push(`💨 ${target.name} พยายามหลบ (${evadePct}%) แต่ไม่พ้น — การโจมตีดำเนินต่อ (เหลือหลบหลีกอีก ${target.statuses.evade || 0} ครั้ง)`);
  }

  // ---------- "เนตรมณะ" (สถานะ Universal patch 2.2.7) ----------
  //  ใครก็ตามที่ติดบัฟนี้ โจมตีปกติแล้วมีโอกาสสังหารเป้าหมายทันที NETRAMANA_KILL_CHANCE
  if (netramanaActive(attacker) && Math.random() < NETRAMANA_KILL_CHANCE) {
    combat.instantDeath(target);
    target.wasAttacked = true;
    if (!target.alive) match.lastLog.push(`👁️✨💀 เนตรมณะ — ${attacker.name} มองทะลุความตายของ ${target.name} (โอกาส ${Math.round(NETRAMANA_KILL_CHANCE * 100)}%) — สังหารทันที!`);
    else match.lastLog.push(`👁️✨💀 เนตรมณะ — ${attacker.name} มองทะลุความตายของ ${target.name} — แต่ ${target.name} รอดไปได้!`);
    match.lastAttack = {
      id: ++match.attackSeq, byId: attacker.id, targetId: target.id,
      byName: attacker.name, byImg: view.displayImg(attacker), byColor: lobby.colorOf(attacker),
      targetName: target.name, targetImg: view.displayImg(target), targetColor: lobby.colorOf(target),
      dmg: 0, kill: !target.alive,
      skills: [{ name: "เนตรมณะ — สังหารทันที", img: null, by: attacker.name, color: lobby.colorOf(attacker), side: "atk" }],
    };
    cutscene.runCutsceneQueue(() => {
      match.gameState = "ATTACKING";
      timers.startPhaseTimer(ATTACKFX_TIME + 2, endTurnPhase.endTurn);
      view.broadcastState();
    });
    return;
  }

  // การเดินทาง (ป่าไม้ต้องสาป กลางวัน): โจมตีพลาด 40% — ฝั่งผู้ตีพลาดเอง แต่ "แม่นยำ" ก็เจาะได้เหมือนด่านหลบ
  if (!accurate && Journey.tryAttackMiss(engine, attacker, target)) return;

  const atkCtx = computeAttackBase(engine, attacker, target);
  let { base } = atkCtx;
  const { empowerAtk, cardAtkBonus, mark42Atk, journeyAtkFx, muimiTowerAtk } = atkCtx;
  // ผกผัน (สถานะ Universal patch 2.2.1): โบนัสพลังโจมตีที่ควรได้ กลับกลายเป็นลดพลังโจมตีแทน (คำนวณรอบเพดานฐาน 1 หน่วย)
  if (invertActive(attacker)) base = Math.max(0, 1 - (base - 1));
  let dmg = base;
  // เสริมพลัง / อ่อนแอ (สถานะพื้นฐาน patch 2.0.8): เพิ่ม/ลดดาเมจที่ทำได้ตามจำนวนที่ระบุ
  const mightAtk = statusAmtOf(attacker, "might");
  if (mightAtk > 0) dmg += mightAtk;
  //  "พิษร้าย" หักพลังโจมตีเหมือน "อ่อนแอ" — ซ้อนกันได้ จึงรวมกันก่อนหักทีเดียว
  const weakAtk = statusAmtOf(attacker, "weak") + poisonAtkPenalty(attacker);
  if (weakAtk > 0) dmg = Math.max(0, dmg - weakAtk);
  // คุ้มครอง (สถานะพื้นฐาน): ความเสียหายที่ได้รับลดลงตามจำนวนที่ระบุ (ไม่ระบุ = 1)
  const guardAmt = (target.statuses.guard || 0) > 0 ? (statusAmtOf(target, "guard") || 1) : 0;
  if (guardAmt > 0) dmg = Math.max(0, dmg - guardAmt);
  // ขัดแย้ง (discord, สถานะพื้นฐาน): ความเสียหายที่ได้รับ +1
  const discord = (target.statuses.discord || 0) > 0;
  if (discord) dmg += 1;
  // เปราะบาง (สถานะพื้นฐาน patch 2.0.8): ความเสียหายที่ได้รับเพิ่มตามจำนวนที่ระบุ
  const fragileAmt = statusAmtOf(target, "fragile");
  if (fragileAmt > 0) dmg += fragileAmt;
  // การเดินทาง (อาณาจักรน้ำแข็ง กลางวัน): คริติคอล 20% ×2
  const journeyCritFx = {};
  dmg = Journey.applyCrit(engine, attacker, dmg, journeyCritFx, 0);

  const shieldBefore = target.shield;
  combat.dealMixed(target, dmg, true); // กฎปกติ: ลดเกราะก่อน ถ้าไม่มีเกราะจึงเข้าเลือดจริง
  // มุยมิ: ดาบเก่าๆ/ดาบสะบั้นฟื้นฟูเมื่อโจมตีปกติ และใจที่ไม่ยอมแพ้ยืดเวลาท่าไม้ตาย
  const muimiAttackFx = CHAR_HOOKS.muimi.onAttackLanded(engine, attacker);
  // เสริมพลัง (empower): ใช้แล้วหมดไปทันทีเมื่อได้โจมตี
  if (empowerAtk) {
    delete attacker.statuses.empower;
    match.lastLog.push(`💪 ${attacker.name} เสริมพลัง — การโจมตีนี้ +1 (บัฟหมดลง)`);
  }
  target.wasAttacked = true;
  match.lastLog.push(`${attacker.name} โจมตี ${target.name} -${dmg} (ลดเกราะก่อน)`);

  // สกิลที่มีผลกับการโจมตีครั้งนี้ (โชว์ใต้อนิเมชัน แยกฝั่งชัดเจน: atk = ฝั่งโจมตี | def = ฝั่งป้องกัน)
  const fxSkills = [];
  const addFx = (x, side) => { if (x) fxSkills.push({ ...x, side }); };
  const atkFx = (name, img = view.displayImg(attacker)) => addFx({ name, img, by: attacker.name, color: lobby.colorOf(attacker) }, "atk");
  const defFx = (name, img = view.displayImg(target)) => addFx({ name, img, by: target.name, color: lobby.colorOf(target) }, "def");
  if (mark42Atk > 0) atkFx(`เกราะ Mark 42 +${mark42Atk}`, Mark42.IMG.suit);
  if (journeyAtkFx) atkFx(journeyAtkFx.name, null);
  for (const name of CHAR_HOOKS.oberon_summer.atkFx(attacker)) atkFx(name, CHAR_HOOKS.oberon_summer.IMG.base);
  if (journeyCritFx.crit) atkFx(`คริติคอล ×2 (${journeyCritFx.pct}%)`, null);
  if (accurate) atkFx("แม่นยำ — เจาะการหลบหลีก");
  if (empowerAtk) atkFx("เสริมพลัง +1");
  if (cardAtkBonus > 0) atkFx(`การ์ดแดงครบ 3 ใบ +${cardAtkBonus}`); // ระบบกองการ์ดกลาง
  if (mightAtk > 0) atkFx(`เสริมพลัง +${mightAtk}`);
  if (weakAtk > 0) atkFx(`อ่อนแอ -${weakAtk}`);
  if (muimiTowerAtk > 0) atkFx(`ดาบสะบั้น — พลังโจมตี +${muimiTowerAtk}`, CHAR_HOOKS.muimi.IMG.skill3);
  if (muimiAttackFx) atkFx(
    muimiAttackFx.mode === "tower"
      ? `ดาบสะบั้น — ฟื้นพลังชีวิต +${muimiAttackFx.hp}${muimiAttackFx.extended ? " · ยืดเวลา +1 เทิร์น" : ""}`
      : `ดาบเก่าๆ — ฟื้นพลังชีวิต +${muimiAttackFx.hp} · แต้มสกิล +${muimiAttackFx.sp}`,
    muimiAttackFx.mode === "tower" ? CHAR_HOOKS.muimi.IMG.skill3 : CHAR_HOOKS.muimi.IMG.skill2,
  );
  if (shieldBefore > target.shield) defFx("โล่ป้องกัน (กันความเสียหาย)", null);
  if (guardAmt > 0) defFx(`คุ้มครอง (ความเสียหายลด ${guardAmt})`);
  if (discord) defFx("ขัดแย้ง (+1 ดาเมจ)");
  if (fragileAmt > 0) defFx(`เปราะบาง (+${fragileAmt} ดาเมจ)`);

  // อนิเมชันบอกว่าใครตีใคร — มีข้อมูลสกิลให้อ่าน -> ยืดเวลาอนิเมชันให้อ่านทัน
  //  คัตซีนที่ค้างคิวระหว่างการโจมตีเล่นต่อหลังการ์ดสรุปความเสียหาย
  const fxSeconds = fxSkills.length ? ATTACKFX_TIME + 2 : ATTACKFX_TIME;
  match.lastAttack = {
    id: ++match.attackSeq, byId: attacker.id, targetId: target.id,
    byName: attacker.name, byImg: view.displayImg(attacker), byColor: lobby.colorOf(attacker),
    byAttackSound: attackSoundOf(attacker), // เสียงโจมตีปกติเฉพาะตัว
    targetName: target.name, targetImg: view.displayImg(target), targetColor: lobby.colorOf(target),
    dmg, skills: fxSkills,
    fxMs: fxSeconds * 1000,
  };
  match.gameState = "ATTACKING";
  timers.startPhaseTimer(fxSeconds, () => cutscene.runCutsceneQueue(endTurnPhase.endTurn));
  view.broadcastState();
}

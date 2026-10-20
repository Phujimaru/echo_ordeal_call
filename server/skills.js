// ใช้สกิล (useSkill)
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  useSkill, skillCostOf, hitArea,
});

const { CHAR_BY_ID } = require("../characters");
const CHAR_HOOKS = require("../characters/index");
const {
  SPELLBURDEN_MAX, statusAmtOf, tickCurseOnSkill, numbFizzles,
} = require("../characters/_universal_status");
const Journey = require("../characters/_journey");
const { SKILL_COST_MAX } = require("./constants");
const match = require("./match");
const endTurnPhase = require("./phases/endTurn");
const { engine } = require("./engine");
const combat = require("./combat");
const cutscene = require("./cutscene");
const action = require("./phases/action");
const lobby = require("./lobby");
const view = require("./view");
const Visibility = require("./visibility");
const timers = require("./timers");
const Zero = require("./zeroTime");
const Ice = require("./ice");
const Voice = require("./voice");
const TimeStop = require("./timeStop");

// ราคาสกิล 1 ช่องก่อนการ์ดราชินี — ใช้ทั้งตอนหักแต้มจริง (useSkill) และป้ายราคาบนปุ่ม (view.buildStateFor) · base = ราคาตั้งต้นของช่อง
//  ฮุค skillCost: ราคาที่เปลี่ยนตามสถานะของตัวละคร (นักบินปริศนา: เปลี่ยนชิ้นส่วน 2/3 ตามแขน)
//  กลางคืน (patch 2.1.7): สกิลที่สุ่มโดนคืนนี้ (พื้นฐาน/รอง อย่างใดอย่างหนึ่ง) ใช้แต้มมากขึ้น +1 — ไม่มีผลกับท่าไม้ตาย
//  การเดินทาง (ป่าไม้ต้องสาป): ทุกสกิลแพงขึ้น +1 — สกิลราคา 0 ยังฟรี
//  กระแสเวท / ภาระเวท (สถานะพื้นฐาน patch 2.0.8): ใช้พลังงานลดลง/เพิ่มขึ้นตามจำนวนที่ระบุ
//  ตัวปรับราคาขาขึ้นทั้งหมด (กลางคืน + การเดินทาง + ภาระเวท) รวมกันแล้วดันราคาได้ไม่เกิน SKILL_COST_MAX
//   → สกิลที่ค่าใช้พลังงานถึงเพดานอยู่แล้ว (เช่นท่าไม้ตาย 8) จะไม่แพงขึ้นไปอีก
function skillCostOf(p, tier, base, opts) {
  const hook = CHAR_HOOKS[p.characterId];
  const cost = hook && hook.skillCost ? hook.skillCost(p, tier, base, opts) : base;
  const nightTax = p.nightTaxTier === tier ? 1 : 0;
  const journeyTax = Journey.skillTax(engine, cost);
  const spellburden = Math.min(SPELLBURDEN_MAX, statusAmtOf(p, "spellburden"));
  return Math.min(SKILL_COST_MAX, Math.max(0, cost - statusAmtOf(p, "spellflow")) + nightTax + journeyTax + spellburden);
}

// หยุดเวลา (server/timeStop.js): คำสั่งของผู้เล่นในตาเดิน — จดจุดย้อนไว้ ถูกตัด = ย้อนทั้งก้อน
function useSkill(id, tier, targets, opts = {}) {
  return TimeStop.guard(() => runSkill(id, tier, targets, opts));
}
function runSkill(id, tier, targets, opts = {}) {
  const p = match.players[id];
  if (!match.effectSourceId && p) return combat.withEffectSource(p, () => runSkill(id, tier, targets, opts));
  if (!p || !p.alive) return;
  if (p.summon) return; // ยูนิตที่ถูกเรียก (ร่างแยก — server/summon.js) ใช้สกิลไม่ได้
  if (!["basic", "secondary", "ultimate"].includes(tier)) return;
  const ch = CHAR_BY_ID[p.characterId];
  const skill = ch && ch[tier];
  if (!skill) return;
  const hook = CHAR_HOOKS[p.characterId];
  // ใช้สกิลได้เฉพาะตาเดินของตัวเอง (GRID_PLAN §7) — ใช้แล้วเดินไม่ได้อีก แต่ยังโจมตีได้
  //  ระหว่างเดินต่อหลังจบตา (canto) กดได้เฉพาะสกิลที่ฮุค cantoSkill อนุญาต (กระจกเงา)
  if (!action.canAct(p, { move: !!(hook && hook.cantoSkill && hook.cantoSkill(p, tier)) })) return;
  if ((p.statuses.noskill || 0) > 0) return; // ห้ามใช้สกิล: เทิร์นนี้ใช้สกิลไม่ได้
  if (tier === "ultimate" && Zero.ultLocked()) return; // ห่วงเวลาซีโร่: ท่าไม้ตายทุกตัวล็อก

  // ราคาจริง (สูตรเดียวกับป้ายราคาบนปุ่ม — skillCostOf) · opts.form = ตัวเลือกที่กดจากปุ่มแบบหลายตัวเลือก (เคท: แส้/ดาบ/ปีก)
  let cost = skillCostOf(p, tier, skill.cost, opts);
  // การ์ดราชินี: ใช้สกิลไม่เสียแต้ม 1 ครั้ง — ใช้กับสกิลที่มีค่าใช้จ่ายเท่านั้น
  const blessFree = cost > 0 && (p.statuses.freecast || 0) > 0;
  if (blessFree) cost = 0;
  if (p.skillPoints < cost) return;

  const st = skill.effect && !Array.isArray(skill.effect) && skill.effect.type === "status" ? skill.effect.status : null;

  // ระยะบนกระดาน (GRID_PLAN §7): เป้านอกระยะ/ไม่ได้เลือกทิศ = กดไม่ได้ · ได้รายชื่อผู้โดนจริงส่งต่อให้ hook
  //  skillArea = พื้นที่เปลี่ยนตามสถานะ (มุยมิ: ดาบสนิมระหว่างดาบสะบั้น = คลื่นดาบแนว) — ต้องตรงกับ buildStateFor
  const area = hook && hook.skillArea ? hook.skillArea(p, tier, skill.area, opts) : skill.area;
  targets = action.resolveArea(p, area, targets, opts.dir, opts.tile);
  if (!targets) return;
  // ฮุค ownsAreaHit = ช่องที่โดนจริงรู้ทีหลัง ตัวละครเรียก hitArea เอง (โซระ: Mouse Separade เฉพาะช่องที่พุ่งผ่านจนถึงจุดชน)
  const ownsAreaHit = !!(hook && hook.ownsAreaHit && hook.ownsAreaHit(p, tier, opts));
  // ห่วงเวลาซีโร่: สกิลโจมตีพื้นที่ที่คลุมผนึกมิโกะ = ลงผนึกด้วย (หลังผลของสกิล)
  const sealTiles = !ownsAreaHit && area && area.hostile && Zero.active() ? action.areaTiles(p, area, opts.dir, opts.tile) : [];
  // หนามน้ำแข็ง (Ice Spike): สกิลโจมตีพื้นที่ที่คลุมหนาม = ลงหนามด้วย (ยกเว้นสกิลชนิด tile ซึ่งจัดการหนามเอง)
  const spikeTiles = !ownsAreaHit && area && area.hostile && area.kind !== "tile" ? action.areaTiles(p, area, opts.dir, opts.tile) : [];

  // ด่านก่อนหักแต้มของตัวละคร (คูลดาวน์/โควตาเฉพาะตัว) — ไม่มีฮุค = ผ่าน
  //  opts = ตัวเลือกจาก client (ไรโด ฮิคารุ: opts.form = ร่างที่เลือกใน UltraLive)
  if (hook && hook.canUseSkill && !hook.canUseSkill(engine, p, tier, targets, opts)) return;
  // โควตาสกิลหลัก 1 อันต่อเทิร์น — ignoresTurnQuota = กดได้แม้ใช้โควตาไปแล้ว (มุยมิ: เสบียงฉุกเฉิน)
  //  skipsTurnQuota = กดแล้วไม่กินโควตา (มุยมิ: เสบียงฉุกเฉิน · โอเบรอน: นกจาบยามเช้า)
  const ignoresQuota = !!(hook && hook.ignoresTurnQuota && hook.ignoresTurnQuota(p, tier, opts));
  const skipsQuota = !!(hook && hook.skipsTurnQuota && hook.skipsTurnQuota(p, tier, opts));
  if (p.skillUsedRound && !ignoresQuota) return; // ใช้สกิลได้เพียง 1 อันต่อเทิร์น (ซ้ำ/ซ้อนไม่ได้)
  // ท่าไม้ตาย: กดซ้ำไม่ได้จนกว่าผลจะหมดเวลา
  if (tier === "ultimate" && st && (p.statuses[st] || 0) > 0) return;
  // ฮุค endsTurn = ใช้แล้วจบตาเดินทันที (หลังผลลงครบ) — ตีปกติ/ใช้ไอเทม/ใช้สกิลต่อไม่ได้ (มุยมิ: ท่าไม้ตาย)
  const endsTurn = !!(hook && hook.endsTurn && hook.endsTurn(engine, p, tier, opts));

  p.skillPoints -= cost;
  // ใช้สกิลแล้วเดินไม่ได้อีก — ฮุค keepsMove = สกิลที่ใช้ก่อนเดินแล้วยังเดินได้ (Ice Spike: ธารน้ำแข็ง/หนามน้ำแข็ง ก่อนขยับ)
  if (!(hook && hook.keepsMove && hook.keepsMove(engine, p, tier, opts))) action.lockMove(p);
  if (blessFree) {
    p.statuses.freecast--;
    if (p.statuses.freecast <= 0) delete p.statuses.freecast;
    match.lastLog.push(`👸 ${p.name} การ์ดราชินี — ใช้สกิลนี้โดยไม่เสียแต้มสกิล`);
  }
  if (!skipsQuota) p.skillUsedRound = true;
  // "คำสาป" (สถานะ Universal): กดสกิลสำเร็จแล้ว = เสียพลังชีวิต 1 หน่วย (1 ครั้ง/เทิร์น)
  //  วางหลังหักแต้ม — กดไม่ผ่านเงื่อนไขด้านบนจะ return ไปก่อนถึงตรงนี้ คำสาปจึงไม่กินฟรี
  tickCurseOnSkill(engine, p);
  // คำสาปกินจนตกรอบ = สกิลไม่ทำงาน (ฮุคของตัวละครไม่ต้องรับมือผู้ใช้ที่ตายไปแล้ว)
  if (!p.alive) {
    if (endTurnPhase.gameOver()) return;
    view.broadcastState();
    return;
  }
  // "เหน็บชา" (สถานะ Universal): 30% สกิลไม่ทำงาน แต่แต้มสกิล/โควตาของเทิร์นถูกใช้ไปแล้วตามเดิม
  if (numbFizzles(p)) {
    match.lastLog.push(`🫨 ${p.name} เหน็บชา — ${skill.name} ไม่ทำงาน! (แต้มสกิลถูกหักไปแล้ว)`);
    view.emitVisible("skillFlash", { name: `${skill.name} — เหน็บชา สกิลไม่ทำงาน`, img: skill.img || null, by: p.name, color: lobby.colorOf(p) }, p);
    view.broadcastState();
    return;
  }
  // การเดินทาง (ป่าไม้ต้องสาป กลางวัน): สกิลที่เลือกศัตรูเป็นเป้าหมายพลาด 25% — คืนแต้ม (และการ์ดราชินี)
  //  แต่สิทธิ์ใช้สกิลของเทิร์นถูกใช้ไปแล้ว · แพทเทิร์นเดียวกับเหน็บชาด้านบน (ยังไม่มีผลใดลงไป)
  if (Journey.skillMisses(engine, p, targets)) {
    p.skillPoints += cost;
    if (blessFree) p.statuses.freecast = (p.statuses.freecast || 0) + 1;
    match.lastLog.push(`🌲 ป่าไม้ต้องสาป — ${skill.name} ของ ${p.name} พลาดเป้า! (ได้แต้มสกิลคืน ${cost})`);
    view.emitVisible("skillFlash", { name: `${skill.name} — พลาดเป้า (ป่าไม้ต้องสาป)`, img: skill.img || null, by: p.name, color: lobby.colorOf(p) }, p);
    view.broadcastState();
    return;
  }
  // การเดินทาง (ทะเลทราย กลางคืน): ใช้สกิลได้แต้มคืน 2 — ไม่เกินที่จ่ายจริง (การ์ดราชินี/ราคา 0 จึงไม่ได้คืน)
  {
    const refund = Journey.skillRefund(engine, cost);
    if (refund > 0) {
      p.skillPoints = Math.min(combat.maxSkillOf(p), p.skillPoints + refund);
      match.lastLog.push(`🌙 ทะเลทรายยามค่ำคืน — ${p.name} ได้แต้มสกิลคืน +${refund}`);
    }
  }

  // ผลของสกิลที่ตัวละครเขียนเองในโมดูล (effect: null ใน characters.js) — คืนข้อความต่อท้ายป้ายเด้ง
  let flashSuffix = "";
  // ชื่อ/รูปบนป้ายสกิล = หน้าตาปุ่มตอนกด เมื่อฮุค skillPub ตั้ง flash: true (ยูนะ: ปุ่มกลายเป็น "เป็นส่วนหนึ่งของเงา")
  //  อ่านก่อนลงผล (ผลเปลี่ยนหน้าตาปุ่มได้) · ไม่ตั้ง = ชื่อ/รูปใน characters.js ตามเดิม
  const pubNow = hook && hook.skillPub ? hook.skillPub(p, tier) || {} : {};
  const flashName = pubNow.flash && pubNow.name ? pubNow.name : skill.name;
  const flashImg = pubNow.flash && pubNow.img ? pubNow.img : skill.img || null;
  match.afterCutscene = []; // ผลที่ hook ขอให้เกิด "หลังคลิปจบ" (engine.deferAfterCutscene) — เช่นคลื่นดาบมุยมิ
  if (hook && hook.applyInstantSkill) flashSuffix = hook.applyInstantSkill(engine, p, tier, targets, opts) || "";
  Voice.play(p, tier); // เสียงพากย์ตามช่องสกิล (server/voice.js — ไจโร: skill1/2 · ท่าไม้ตายสุ่ม 2 ไฟล์)
  const deferred = match.afterCutscene.splice(0);
  // การมองเห็น (server/visibility.js): ใช้สกิลใส่คนอื่นจากในพุ่มหญ้า = โผล่จนจบเทิร์น
  //  สกิลโจมตีแบบพื้นที่ (area.hostile) โดนคนล่องหน = ปรากฏตัว — หลังผลลง (หลังคลิปจบ)
  if (!ownsAreaHit && (targets || []).some((tid) => tid !== p.id)) Visibility.exposeBush(p);
  if (!ownsAreaHit && area && area.hostile) deferred.push(() => Visibility.onAreaHit(p, targets));
  if (sealTiles.length) deferred.push(() => Zero.hitSealsInArea(p, sealTiles));
  if (spikeTiles.length) deferred.push(() => Ice.hitSpikesInArea(p, spikeTiles));
  const runDeferred = () => { for (const fn of deferred) combat.withEffectSource(p, fn); };

  combat.applyEffect(p, skill.effect);

  // สกิลช่วงจั่วการ์ด (instant): เด้งโชว์ทันทีบนกระดานของทุกคน ไม่ต้องรอเปิดไพ่/ไม่ตัดจอดำ
  // silentFlash: สกิลที่มีคลิป/การ์ดแจ้งเตือนของตัวเอง (ต้องเงียบระหว่างล่องหน) — ไม่ขึ้นป้ายกลาง ไม่บันทึก roundSkills
  const silent = !!(hook && hook.silentFlash && hook.silentFlash(p, tier, opts));
  if (skill.instant && !silent) {
    const flashSound = hook && hook.skillSound ? hook.skillSound(p, tier, opts) : null; // เสียงประจำแต่ละช่อง (ถ้ามี)
    view.emitVisible("skillFlash", { name: flashName + flashSuffix, img: flashImg, by: p.name, color: lobby.colorOf(p), sound: flashSound }, p);
  }
  if (!silent) match.roundSkills.push({ playerId: id, tier, name: flashName, img: flashImg, status: st });

  // คัตซีนที่สกิลคิวไว้ (เช่นท่าไม้ตายของมุยมิ) — เล่นทันที แล้วกลับมาตาเดินต่อด้วยเวลาที่เหลือ (ผลที่รอลงหลังคลิป)
  if (match.cutsceneQueue.length) { cutscene.pausePlayingForCutscene(deferred.length ? runDeferred : undefined, { endTurn: endsTurn }); return; }
  runDeferred();
  // ผลขอฉากต่อ (engine.skillBeat / คลิปที่คิวระหว่างผล) = พักตาเดินเล่นให้จบ แล้วกลับมาด้วยเวลาที่เหลือ
  if (match.skillBeats.length || match.cutsceneQueue.length) { cutscene.pausePlayingForCutscene(undefined, { endTurn: endsTurn }); return; }
  // สกิลพักเกมเล่นฉากเองแล้ว (Echo ก่อกำเนิดใหม่ — engine.journeyRebirth ตั้ง CUTSCENE + ตัวจับเวลาไว้) = แค่บรอดแคสต์
  if (match.gameState === "CUTSCENE") { view.broadcastState(); return; }
  if (endTurnPhase.gameOver()) return; // สกิลฆ่าศัตรูคนสุดท้าย = จบเกมทันที
  // ห่วงเวลาซีโร่: สกิลทุบผนึกแตก = ฉากผนึกแตก/ปลดผนึก แล้วกลับมาตาเดินต่อด้วยเวลาที่เหลือ
  if (Zero.hasPendingBreak()) {
    const remain = Math.max(3, match.timeLeft);
    Zero.runPendingBreak(() => {
      if (endTurnPhase.gameOver()) return;
      const actor = match.players[match.actorId];
      if (!actor || !actor.alive || endsTurn) { action.finishActor(); return; }
      match.gameState = "ACTION";
      timers.startPhaseTimer(remain, action.actionTimeUp);
      view.broadcastState();
    });
    return;
  }
  if (endsTurn) { action.finishActor(); return; }
  view.broadcastState();
}

// ผลของสกิลโจมตีพื้นที่ (area.hostile) บนช่อง/คนที่โดนจริง — สำหรับตัวละครที่มีฮุค ownsAreaHit (useSkill ข้ามผลชุดเดียวกันให้)
//  ids = คนบนช่องที่โดน (รวมคนที่มองไม่เห็น) · ใส่คนอื่นจากในพุ่ม = โผล่ · คนล่องหนปรากฏ · ลงผนึกมิโกะ · ลงหนามน้ำแข็ง
function hitArea(p, tiles, ids) {
  if ((ids || []).some((tid) => tid !== p.id)) Visibility.exposeBush(p);
  Visibility.onAreaHit(p, ids);
  if (Zero.active()) Zero.hitSealsInArea(p, tiles);
  Ice.hitSpikesInArea(p, tiles);
}

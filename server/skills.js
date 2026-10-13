// ใช้สกิล (useSkill)
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  useSkill,
});

const { CHAR_BY_ID } = require("../characters");
const CHAR_HOOKS = require("../characters/index");
const {
  SPELLBURDEN_MAX, statusAmtOf, tickCurseOnSkill, numbFizzles,
} = require("../characters/_universal_status");
const Journey = require("../characters/_journey");
const { io } = require("./app");
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

function useSkill(id, tier, targets, opts = {}) {
  const p = match.players[id];
  if (!match.effectSourceId && p) return combat.withEffectSource(p, () => useSkill(id, tier, targets, opts));
  if (!p || !p.alive) return;
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

  // ราคาที่เปลี่ยนตามสถานะของตัวละคร (นักบินปริศนา: เปลี่ยนชิ้นส่วน 2/3 ตามแขน) — ต้องตรงกับ showCost() ใน buildStateFor
  //  opts.form = ตัวเลือกที่กดจากปุ่มแบบหลายตัวเลือก (เคท: แส้/ดาบ/ปีก — ราคา/พื้นที่ต่างกันต่อตัวเลือก)
  let cost = hook && hook.skillCost ? hook.skillCost(p, tier, skill.cost, opts) : skill.cost;
  // กลางคืน (patch 2.1.7): สกิลที่สุ่มโดนคืนนี้ (พื้นฐาน/รอง อย่างใดอย่างหนึ่ง) ใช้แต้มมากขึ้น +1 — ไม่มีผลกับท่าไม้ตาย
  //  (เพดาน SKILL_COST_MAX คิดรวมทีเดียวกับภาระเวทด้านล่าง)
  const nightTax = p.nightTaxTier === tier ? 1 : 0;
  // การเดินทาง (ป่าไม้ต้องสาป): ทุกสกิลแพงขึ้น +1 — สกิลราคา 0 ยังฟรี · ต้องตรงกับ showCost() ใน buildStateFor
  const journeyTax = Journey.skillTax(engine, cost);
  // กระแสเวท / ภาระเวท (สถานะพื้นฐาน patch 2.0.8): ใช้พลังงานลดลง/เพิ่มขึ้นตามจำนวนที่ระบุ
  cost = Math.max(0, cost - statusAmtOf(p, "spellflow"));
  //  ตัวปรับราคาขาขึ้นทั้งหมด (กลางคืน + ภาระเวท) รวมกันแล้วดันราคาได้ไม่เกิน SKILL_COST_MAX
  //  → สกิลที่ค่าใช้พลังงานถึงเพดานอยู่แล้ว (เช่นท่าไม้ตาย 8) จะไม่แพงขึ้นไปอีก
  cost = Math.min(SKILL_COST_MAX, cost + nightTax + journeyTax + Math.min(SPELLBURDEN_MAX, statusAmtOf(p, "spellburden")));
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
  // ห่วงเวลาซีโร่: สกิลโจมตีพื้นที่ที่คลุมผนึกมิโกะ = ลงผนึกด้วย (หลังผลของสกิล)
  const sealTiles = area && area.hostile && Zero.active() ? action.areaTiles(p, area, opts.dir, opts.tile) : [];
  // หนามน้ำแข็ง (Ice Spike): สกิลโจมตีพื้นที่ที่คลุมหนาม = ลงหนามด้วย (ยกเว้นสกิลชนิด tile ซึ่งจัดการหนามเอง)
  const spikeTiles = area && area.hostile && area.kind !== "tile" ? action.areaTiles(p, area, opts.dir, opts.tile) : [];

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
  // "เหน็บชา" (สถานะ Universal): 30% สกิลไม่ทำงาน แต่แต้มสกิล/โควตาของเทิร์นถูกใช้ไปแล้วตามเดิม
  if (numbFizzles(p)) {
    match.lastLog.push(`🫨 ${p.name} เหน็บชา — ${skill.name} ไม่ทำงาน! (แต้มสกิลถูกหักไปแล้ว)`);
    io.emit("skillFlash", { name: `${skill.name} — เหน็บชา สกิลไม่ทำงาน`, img: skill.img || null, by: p.name, color: lobby.colorOf(p) });
    view.broadcastState();
    return;
  }
  // การเดินทาง (ป่าไม้ต้องสาป กลางวัน): สกิลที่เลือกศัตรูเป็นเป้าหมายพลาด 25% — คืนแต้ม (และการ์ดราชินี)
  //  แต่สิทธิ์ใช้สกิลของเทิร์นถูกใช้ไปแล้ว · แพทเทิร์นเดียวกับเหน็บชาด้านบน (ยังไม่มีผลใดลงไป)
  if (Journey.skillMisses(engine, p, targets)) {
    p.skillPoints += cost;
    if (blessFree) p.statuses.freecast = (p.statuses.freecast || 0) + 1;
    match.lastLog.push(`🌲 ป่าไม้ต้องสาป — ${skill.name} ของ ${p.name} พลาดเป้า! (ได้แต้มสกิลคืน ${cost})`);
    io.emit("skillFlash", { name: `${skill.name} — พลาดเป้า (ป่าไม้ต้องสาป)`, img: skill.img || null, by: p.name, color: lobby.colorOf(p) });
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
  match.afterCutscene = []; // ผลที่ hook ขอให้เกิด "หลังคลิปจบ" (engine.deferAfterCutscene) — เช่นคลื่นดาบมุยมิ
  if (hook && hook.applyInstantSkill) flashSuffix = hook.applyInstantSkill(engine, p, tier, targets, opts) || "";
  const deferred = match.afterCutscene.splice(0);
  // การมองเห็น (server/visibility.js): ใช้สกิลใส่คนอื่นจากในพุ่มหญ้า = โผล่จนจบเทิร์น
  //  สกิลโจมตีแบบพื้นที่ (area.hostile) โดนคนล่องหน = ปรากฏตัว — หลังผลลง (หลังคลิปจบ)
  if ((targets || []).some((tid) => tid !== p.id)) Visibility.exposeBush(p);
  if (area && area.hostile) deferred.push(() => Visibility.onAreaHit(p, targets));
  if (sealTiles.length) deferred.push(() => Zero.hitSealsInArea(p, sealTiles));
  if (spikeTiles.length) deferred.push(() => Ice.hitSpikesInArea(p, spikeTiles));
  const runDeferred = () => { for (const fn of deferred) combat.withEffectSource(p, fn); };

  combat.applyEffect(p, skill.effect);

  // สกิลช่วงจั่วการ์ด (instant): เด้งโชว์ทันทีบนกระดานของทุกคน ไม่ต้องรอเปิดไพ่/ไม่ตัดจอดำ
  // silentFlash: สกิลที่มีคลิป/การ์ดแจ้งเตือนของตัวเอง (ต้องเงียบระหว่างล่องหน) — ไม่ขึ้นป้ายกลาง ไม่บันทึก roundSkills
  const silent = !!(hook && hook.silentFlash && hook.silentFlash(p, tier, opts));
  if (skill.instant && !silent) {
    const flashSound = hook && hook.skillSound ? hook.skillSound(p, tier) : null; // เสียงประจำแต่ละช่อง (ถ้ามี)
    io.emit("skillFlash", { name: skill.name + flashSuffix, img: skill.img || null, by: p.name, color: lobby.colorOf(p), sound: flashSound });
  }
  if (!silent) match.roundSkills.push({ playerId: id, tier, name: skill.name, img: skill.img || null, status: st });

  // คัตซีนที่สกิลคิวไว้ (เช่นท่าไม้ตายของมุยมิ) — เล่นทันที แล้วกลับมาตาเดินต่อด้วยเวลาที่เหลือ (ผลที่รอลงหลังคลิป)
  if (match.cutsceneQueue.length) { cutscene.pausePlayingForCutscene(deferred.length ? runDeferred : undefined); return; }
  runDeferred();
  // ผลขอฉากต่อ (engine.skillBeat / คลิปที่คิวระหว่างผล) = พักตาเดินเล่นให้จบ แล้วกลับมาด้วยเวลาที่เหลือ
  if (match.skillBeats.length || match.cutsceneQueue.length) { cutscene.pausePlayingForCutscene(); return; }
  // สกิลพักเกมเล่นฉากเองแล้ว (Echo ก่อกำเนิดใหม่ — engine.journeyRebirth ตั้ง CUTSCENE + ตัวจับเวลาไว้) = แค่บรอดแคสต์
  if (match.gameState === "CUTSCENE") { view.broadcastState(); return; }
  if (endTurnPhase.gameOver()) return; // สกิลฆ่าศัตรูคนสุดท้าย = จบเกมทันที
  // ห่วงเวลาซีโร่: สกิลทุบผนึกแตก = ฉากผนึกแตก/ปลดผนึก แล้วกลับมาตาเดินต่อด้วยเวลาที่เหลือ
  if (Zero.hasPendingBreak()) {
    const remain = Math.max(3, match.timeLeft);
    Zero.runPendingBreak(() => {
      if (endTurnPhase.gameOver()) return;
      const actor = match.players[match.actorId];
      if (!actor || !actor.alive) { action.finishActor(); return; }
      match.gameState = "ACTION";
      timers.startPhaseTimer(remain, action.actionTimeUp);
      view.broadcastState();
    });
    return;
  }
  view.broadcastState();
}

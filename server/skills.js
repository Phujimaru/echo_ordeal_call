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
const { engine } = require("./engine");
const combat = require("./combat");
const cutscene = require("./cutscene");
const action = require("./phases/action");
const lobby = require("./lobby");
const view = require("./view");

function useSkill(id, tier, targets, opts = {}) {
  const p = match.players[id];
  if (!match.effectSourceId && p) return combat.withEffectSource(p, () => useSkill(id, tier, targets, opts));
  if (!p || !p.alive) return;
  // ใช้สกิลได้เฉพาะตาเดินของตัวเอง (GRID_PLAN §7) — ใช้แล้วเดินไม่ได้อีก แต่ยังโจมตีได้
  if (!action.canAct(p)) return;
  if (!["basic", "secondary", "ultimate"].includes(tier)) return;
  const ch = CHAR_BY_ID[p.characterId];
  const skill = ch && ch[tier];
  if (!skill) return;
  if ((p.statuses.noskill || 0) > 0) return; // ห้ามใช้สกิล: เทิร์นนี้ใช้สกิลไม่ได้

  let cost = skill.cost;
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
  targets = action.resolveArea(p, skill.area, targets, opts.dir);
  if (!targets) return;

  // ด่านก่อนหักแต้มของตัวละคร (คูลดาวน์/โควตาเฉพาะตัว) — ไม่มีฮุค = ผ่าน
  const hook = CHAR_HOOKS[p.characterId];
  if (hook && hook.canUseSkill && !hook.canUseSkill(engine, p, tier, targets)) return;
  // โควตาสกิลหลัก 1 อันต่อเทิร์น — ignoresTurnQuota = กดได้แม้ใช้โควตาไปแล้ว (มุยมิ: เสบียงฉุกเฉิน)
  //  skipsTurnQuota = กดแล้วไม่กินโควตา (มุยมิ: เสบียงฉุกเฉิน · โอเบรอน: นกจาบยามเช้า)
  const ignoresQuota = !!(hook && hook.ignoresTurnQuota && hook.ignoresTurnQuota(p, tier));
  const skipsQuota = !!(hook && hook.skipsTurnQuota && hook.skipsTurnQuota(p, tier));
  if (p.skillUsedRound && !ignoresQuota) return; // ใช้สกิลได้เพียง 1 อันต่อเทิร์น (ซ้ำ/ซ้อนไม่ได้)
  // ท่าไม้ตาย: กดซ้ำไม่ได้จนกว่าผลจะหมดเวลา
  if (tier === "ultimate" && st && (p.statuses[st] || 0) > 0) return;

  p.skillPoints -= cost;
  action.lockMove(p);
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
  if (hook && hook.applyInstantSkill) flashSuffix = hook.applyInstantSkill(engine, p, tier, targets) || "";

  combat.applyEffect(p, skill.effect);

  // สกิลช่วงจั่วการ์ด (instant): เด้งโชว์ทันทีบนกระดานของทุกคน ไม่ต้องรอเปิดไพ่/ไม่ตัดจอดำ
  if (skill.instant) {
    const flashSound = hook && hook.skillSound ? hook.skillSound(p, tier) : null; // เสียงประจำแต่ละช่อง (ถ้ามี)
    io.emit("skillFlash", { name: skill.name + flashSuffix, img: skill.img || null, by: p.name, color: lobby.colorOf(p), sound: flashSound });
  }
  match.roundSkills.push({ playerId: id, tier, name: skill.name, img: skill.img || null, status: st });

  // คัตซีนที่สกิลคิวไว้ (เช่นท่าไม้ตายของมุยมิ) — เล่นทันที แล้วกลับมาตาเดินต่อด้วยเวลาที่เหลือ
  if (match.cutsceneQueue.length) { cutscene.pausePlayingForCutscene(); return; }
  view.broadcastState();
}
